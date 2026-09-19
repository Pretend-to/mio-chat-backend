import { DomainError } from '../agents/AgentService.js'
import SessionTurnService from '../chat/sessions/SessionTurnService.js'
import SubAgentExecutor from './SubAgentExecutor.js'
import SubAgentRunService from './SubAgentRunService.js'
import { GROUP_STATUS, RUN_STATUS } from './StateMachine.js'

const TERMINAL_GROUP_STATUSES = new Set([
  GROUP_STATUS.CANCELLED,
  GROUP_STATUS.COMPLETED,
  GROUP_STATUS.FAILED,
])

const DEFAULT_PARENT_WAKE_RETRY_DELAYS = [100, 500, 2000]
const DEFAULT_COMPLETED_WAKE_CACHE_SIZE = 1024

function errorEnvelope(error) {
  return JSON.stringify({
    code: error?.code || 'subagent_execution_failed',
    message: error?.message || String(error),
  })
}

export class SubAgentDispatcher {
  constructor({
    executor = new SubAgentExecutor(),
    runService = new SubAgentRunService(),
    sessionTurnService = new SessionTurnService(),
    parentWakeRetryDelays = DEFAULT_PARENT_WAKE_RETRY_DELAYS,
    completedWakeCacheSize = DEFAULT_COMPLETED_WAKE_CACHE_SIZE,
  } = {}) {
    this.executor = executor
    this.runService = runService
    this.sessionTurnService = sessionTurnService
    this.activeGroups = new Map()
    this.activeRuns = new Map()
    // A group revision identifies one completion edge. Reusing the same
    // promise prevents duplicate parent turns when a completed group is
    // redispatched concurrently; a continuation increments the revision and
    // therefore gets its own wake.
    this.parentWakePromises = new Map()
    // Keep successful completion edges for a bounded amount of time. This is
    // deliberately separate from parentWakePromises: in-flight work is
    // removed after it settles, while this cache prevents a later
    // redispatch of the same revision from waking the parent again.
    this.completedParentWakes = new Map()
    this.parentWakeRetryDelays = Array.isArray(parentWakeRetryDelays)
      ? parentWakeRetryDelays
          .map((delay) => Number(delay))
          .filter((delay) => Number.isFinite(delay) && delay >= 0)
          .map((delay) => Math.min(delay, 30_000))
      : DEFAULT_PARENT_WAKE_RETRY_DELAYS
    this.completedWakeCacheSize = Math.max(
      1,
      Number.isInteger(completedWakeCacheSize)
        ? completedWakeCacheSize
        : DEFAULT_COMPLETED_WAKE_CACHE_SIZE,
    )
  }

  startGroup(groupId) {
    const id = String(groupId)
    if (this.activeGroups.has(id)) return false
    const task = Promise.resolve()
      .then(() => this._drain(id))
      .catch((error) => {
        console.error(`[SubAgentDispatcher] RunGroup ${id} failed:`, error)
      })
      .finally(() => this.activeGroups.delete(id))
    this.activeGroups.set(id, task)
    return true
  }

  async waitForGroup(groupId) {
    await this.activeGroups.get(String(groupId))
  }

  async abortRun(runId, reason = '') {
    const run = await this.runService.getRun(runId)
    await this.runService.requestCancel(run.id, reason)
    if (this.activeRuns.has(run.id)) {
      await this.executor.abort(run)
      let count = 0
      while (this.activeRuns.has(run.id) && count < 50) {
        await new Promise((resolve) => setTimeout(resolve, 20))
        count += 1
      }
    }
    return await this.runService.getRun(run.id)
  }

  async _drain(groupId) {
    while (true) {
      const group = await this.runService.getGroup(groupId)
      const byId = new Map(group.runs.map((run) => [run.id, run]))
      const queued = group.runs.filter(
        (run) => run.status === RUN_STATUS.QUEUED,
      )
      if (!queued.length) break

      const runnable = queued.filter((run) =>
        run.dependencies.every(
          (dependency) =>
            byId.get(dependency.dependsOnRunId)?.status ===
            RUN_STATUS.RESULT_READY,
        ),
      )
      if (runnable.length) {
        await Promise.all(runnable.map((run) => this._executeRun(run)))
        continue
      }

      const blocked = queued.filter((run) =>
        run.dependencies.some((dependency) => {
          const status = byId.get(dependency.dependsOnRunId)?.status
          return [
            RUN_STATUS.BLOCKED,
            RUN_STATUS.CANCELLED,
            RUN_STATUS.EXPIRED,
            RUN_STATUS.FAILED,
          ].includes(status)
        }),
      )
      if (!blocked.length) break
      await Promise.all(
        blocked.map((run) =>
          this.runService.transitionRun(run.id, RUN_STATUS.CANCELLED, {
            cancelReason: 'dependency_not_successful',
          }),
        ),
      )
    }
    const completedGroup = await this.runService.getGroup(groupId)
    if (TERMINAL_GROUP_STATUSES.has(completedGroup.status)) {
      await this._wakeParent(completedGroup)
    }
  }

  async _wakeParent(group) {
    const wakeKey = `${group.id}:${group.revision}`
    if (this.completedParentWakes.has(wakeKey)) return true
    const existing = this.parentWakePromises.get(wakeKey)
    if (existing) return existing

    const runIds = group.runs.map((run) => run.id)
    const wakeMessage = [
      'system：SubAgent RunGroup 已完成，请主 Agent 主动读取结果。',
      `groupId: ${group.id}`,
      `status: ${group.status}`,
      `runIds: ${runIds.join(', ')}`,
      '请使用 subagent action=status 或 read_result 获取结果；不要猜测、复述或请求子 Agent 直接回传正文。',
    ].join('\n')

    const wakePromise = this._deliverParentWake({
      group,
      wakeKey,
      wakeMessage,
    }).finally(() => {
      this.parentWakePromises.delete(wakeKey)
    })
    this.parentWakePromises.set(wakeKey, wakePromise)
    return wakePromise
  }

  async _deliverParentWake({ group, wakeKey, wakeMessage }) {
    const attempts = this.parentWakeRetryDelays.length + 1
    let lastError
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (attempt > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.parentWakeRetryDelays[attempt - 1]),
        )
      }
      try {
        const messageId = [
          `msg_subagent_wake_${group.id}_${group.revision}`,
          attempt > 0 ? `retry_${attempt}` : '',
        ]
          .filter(Boolean)
          .join('_')
        const userMessageId = [
          `msg_u_subagent_wake_${group.id}_${group.revision}`,
          attempt > 0 ? `retry_${attempt}` : '',
        ]
          .filter(Boolean)
          .join('_')
        await this.sessionTurnService.runTurn({
          agentId: group.agentId,
          deliveryBindingId: group.deliveryBindingId || null,
          deliveryMode:
            group.deliveryMode ||
            (group.deliveryBindingId ? 'channel' : 'default'),
          isTask: true,
          isWake: true,
          isWeb: false,
          // Keep the first attempt deterministic for concurrent dispatch
          // idempotency. A failed attempt may already have persisted an
          // assistant row, so retries must not reuse its primary key.
          messageId,
          userMessageId,
          principal: {
            externalUserId: 'subagent-dispatcher',
            id: 'system:subagent:wake',
            isAdmin: true,
            role: 'system_admin',
          },
          sessionId: group.parentSessionId,
          source: 'subagent',
          text: wakeMessage,
        })
        this._rememberCompletedWake(wakeKey)
        return true
      } catch (error) {
        lastError = error
        if (attempt + 1 < attempts) {
          console.warn(
            `[SubAgentDispatcher] Parent wake ${wakeKey} failed; retrying (${attempt + 1}/${attempts - 1}):`,
            error,
          )
        }
      }
    }
    throw lastError
  }

  _rememberCompletedWake(wakeKey) {
    this.completedParentWakes.delete(wakeKey)
    this.completedParentWakes.set(wakeKey, Date.now())
    while (this.completedParentWakes.size > this.completedWakeCacheSize) {
      const oldest = this.completedParentWakes.keys().next().value
      this.completedParentWakes.delete(oldest)
    }
  }

  async _executeRun(run) {
    let current
    try {
      current = await this.runService.transitionRun(run.id, RUN_STATUS.RUNNING)
    } catch (error) {
      if (error?.code === 'invalid_subagent_run_transition') return
      throw error
    }
    this.activeRuns.set(current.id, current)
    try {
      const result = await this.executor.execute(current)
      const refreshed = await this.runService.getRun(current.id)
      if (refreshed.cancelRequestedAt) {
        await this.runService.transitionRun(current.id, RUN_STATUS.CANCELLED, {
          cancelReason: refreshed.cancelReason || 'cancel_requested',
        })
        return
      }
      await this.runService.transitionRun(current.id, RUN_STATUS.RESULT_READY, {
        resultJson: JSON.stringify(result.resultJson || {}),
        resultText: result.resultText || '',
      })
    } catch (error) {
      const refreshed = await this.runService.getRun(current.id)
      const cancelled = Boolean(refreshed.cancelRequestedAt)
      await this.runService.transitionRun(
        current.id,
        cancelled ? RUN_STATUS.CANCELLED : RUN_STATUS.FAILED,
        cancelled
          ? { cancelReason: refreshed.cancelReason || error?.message || null }
          : { errorJson: errorEnvelope(error) },
      )
    } finally {
      this.activeRuns.delete(current.id)
    }
  }

  async assertOwnership(id, agentId, type = 'group') {
    const value =
      type === 'run'
        ? await this.runService.getRun(id, { agentId })
        : await this.runService.getGroup(id, { agentId })
    if (!value) {
      throw new DomainError(
        'subagent_not_found',
        'SubAgent work not found',
        404,
      )
    }
    return value
  }
}

export default SubAgentDispatcher
