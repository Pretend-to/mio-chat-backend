import crypto from 'node:crypto'

import prismaManager from '../database/prisma.js'
import {
  DELIVERY_MODES,
  normalizeDeliveryMode,
} from '../chat/delivery/DeliveryBindingService.js'
import { DomainError } from '../agents/AgentService.js'
import {
  assertRunTransition,
  GROUP_STATUS,
  RUN_STATUS,
  TERMINAL_RUN_STATUSES,
} from './StateMachine.js'

const newId = (prefix) => `${prefix}_${crypto.randomUUID()}`
const json = (value) => JSON.stringify(value ?? {})
const text = (value, field) => {
  const result = String(value || '').trim()
  if (!result)
    throw new DomainError(
      'invalid_subagent_request',
      `${field} is required`,
      422,
    )
  return result
}

function transitionPatch(value = {}) {
  const allowed = [
    'cancelReason',
    'cancelRequestedAt',
    'errorJson',
    'heartbeatAt',
    'leaseExpiresAt',
    'leaseOwner',
    'resultJson',
    'resultText',
  ]
  return Object.fromEntries(
    allowed
      .filter((key) => Object.hasOwn(value, key))
      .map((key) => [key, value[key]]),
  )
}

function assertAcyclicJobs(jobs) {
  const dependencies = new Map(
    jobs.map((job) => [job.key, (job.dependsOn || []).map(String)]),
  )
  const visiting = new Set()
  const visited = new Set()
  const visit = (key) => {
    if (visiting.has(key)) {
      throw new DomainError(
        'subagent_dependency_cycle',
        'SubAgent dependencies must form a DAG',
        422,
      )
    }
    if (visited.has(key)) return
    visiting.add(key)
    for (const dependency of dependencies.get(key) || []) {
      if (!dependencies.has(dependency)) {
        throw new DomainError(
          'subagent_dependency_not_found',
          `Unknown dependency ${dependency} for job ${key}`,
          422,
        )
      }
      visit(dependency)
    }
    visiting.delete(key)
    visited.add(key)
  }
  for (const key of dependencies.keys()) visit(key)
}

export class SubAgentRunService {
  constructor({ prisma = null } = {}) {
    this.prisma = prisma
  }

  async _database() {
    if (!this.prisma) this.prisma = await prismaManager.initialize()
    return this.prisma
  }

  async createGroup({
    agentId,
    allowedToolNames = [],
    defaultToolNames = allowedToolNames,
    budget = {},
    completionPolicy = 'all',
    contextVersion = null,
    deadlineAt = null,
    deliveryBindingId = null,
    deliveryMode = DELIVERY_MODES.DEFAULT,
    idempotencyKey = null,
    jobs,
    originTaskId = null,
    originTriggerId = null,
    originType = 'interactive',
    parentMessageId = null,
    parentSessionId,
    quorum = null,
  }) {
    agentId = text(agentId, 'agentId')
    parentSessionId = text(parentSessionId, 'parentSessionId')
    deliveryMode = normalizeDeliveryMode(deliveryMode)
    if (deliveryMode === DELIVERY_MODES.SESSION_ONLY) deliveryBindingId = null
    if (deliveryMode === DELIVERY_MODES.CHANNEL && !deliveryBindingId) {
      throw new DomainError(
        'invalid_subagent_delivery_binding',
        'deliveryBindingId is required when deliveryMode=channel',
        422,
      )
    }
    if (!Array.isArray(jobs) || jobs.length === 0) {
      throw new DomainError(
        'invalid_subagent_request',
        'jobs must not be empty',
        422,
      )
    }
    if (!['all', 'any', 'quorum'].includes(completionPolicy)) {
      throw new DomainError(
        'invalid_completion_policy',
        'Unsupported completion policy',
        422,
      )
    }
    if (
      completionPolicy === 'quorum' &&
      (!Number.isInteger(quorum) || quorum < 1 || quorum > jobs.length)
    ) {
      throw new DomainError(
        'invalid_completion_policy',
        'quorum must be between 1 and jobs.length',
        422,
      )
    }

    const keys = jobs.map((job) => text(job.key, 'jobs[].key'))
    if (new Set(keys).size !== keys.length) {
      throw new DomainError(
        'duplicate_subagent_job_key',
        'Job keys must be unique',
        422,
      )
    }
    const normalizedJobs = jobs.map((job, index) => {
      const tools = [...defaultToolNames]
      return {
        ...job,
        key: keys[index],
        objective: text(job.objective, `jobs[${index}].objective`),
        taskType: String(job.taskType || 'research'),
        tools,
      }
    })
    assertAcyclicJobs(normalizedJobs)
    const prisma = await this._database()

    return await prisma.$transaction(async (tx) => {
      if (idempotencyKey) {
        const existing = await tx.subAgentRunGroup.findUnique({
          where: { agentId_idempotencyKey: { agentId, idempotencyKey } },
        })
        if (existing) return await this.getGroup(existing.id, { prisma: tx })
      }

      const parent = await tx.session.findFirst({
        where: { agentId, id: parentSessionId },
      })
      if (!parent || parent.kind === 'subagent') {
        throw new DomainError(
          'invalid_subagent_parent',
          'SubAgent parent must be an ordinary Session owned by the same Agent',
          403,
        )
      }

      if (deliveryBindingId) {
        const binding = await tx.agentChannelBinding.findFirst({
          where: {
            agentId,
            enabled: true,
            id: String(deliveryBindingId),
          },
        })
        if (!binding) {
          throw new DomainError(
            'invalid_subagent_delivery_binding',
            'SubAgent delivery binding must be enabled and belong to the parent Agent',
            403,
          )
        }
      }

      const group = await tx.subAgentRunGroup.create({
        data: {
          agentId,
          budgetJson: json(budget),
          completionPolicy,
          contextVersion,
          deadlineAt: deadlineAt ? new Date(deadlineAt) : null,
          deliveryBindingId: deliveryBindingId
            ? String(deliveryBindingId)
            : null,
          deliveryMode,
          id: newId('run_group'),
          idempotencyKey,
          originTaskId,
          originTriggerId,
          originType,
          parentMessageId,
          parentSessionId,
          quorum,
          // Completion wakes the parent Session with a read instruction. The
          // wake never injects result text; the parent reads persisted results
          // explicitly through the subagent tool.
          resumeParent: true,
          status: GROUP_STATUS.PLANNING,
        },
      })

      const runByKey = new Map()
      for (const job of normalizedJobs) {
        const policy = job.sessionPolicy || 'fresh'
        if (!['fresh', 'persistent'].includes(policy)) {
          throw new DomainError(
            'invalid_subagent_session_policy',
            `Unsupported SubAgent session policy: ${policy}`,
            422,
          )
        }
        let child = null
        if (policy !== 'fresh') {
          const subagentKey = text(job.subagentKey || job.key, 'subagentKey')
          child = await tx.session.findUnique({
            where: {
              agentId_parentSessionId_subagentKey: {
                agentId,
                parentSessionId,
                subagentKey,
              },
            },
          })
        }
        if (child && child.kind !== 'subagent') {
          throw new DomainError(
            'invalid_subagent_session',
            'Persistent SubAgent key points to a non-SubAgent Session',
            409,
          )
        }
        if (!child) {
          child = await tx.session.create({
            data: {
              agentId,
              id: newId('session'),
              kind: 'subagent',
              parentSessionId,
              retentionPolicy: job.retentionPolicy || 'raw',
              subagentKey:
                policy === 'fresh' ? null : job.subagentKey || job.key,
              subagentRole: job.role || null,
              title: job.role || job.objective.slice(0, 80),
              visible: false,
            },
          })
        }
        const run = await tx.subAgentRun.create({
          data: {
            agentId,
            budgetJson: json(job.budget || budget),
            groupId: group.id,
            id: newId('run'),
            inputJson: json({
              contextDigest: job.contextDigest || '',
              input: job.input || {},
            }),
            jobKey: job.key,
            model: job.model || null,
            objective: job.objective,
            outputContractJson: json(job.outputContract || {}),
            parentSessionId,
            provider: job.provider || null,
            reasoningEffort: job.reasoningEffort ?? null,
            reviewStatus: 'not_required',
            sessionId: child.id,
            taskType: job.taskType,
            toolDefinitionsHash: job.toolDefinitionsHash || null,
            toolNamesJson: JSON.stringify(job.tools),
          },
        })
        await tx.session.update({
          data: { lastRunAt: new Date() },
          where: { id: child.id },
        })
        await tx.subAgentEvent.create({
          data: {
            id: newId('run_event'),
            payloadJson: json({ status: RUN_STATUS.QUEUED }),
            runId: run.id,
            type: 'run_queued',
          },
        })
        runByKey.set(job.key, run)
      }

      for (const job of normalizedJobs) {
        for (const dependency of job.dependsOn || []) {
          const upstream = runByKey.get(String(dependency))
          if (!upstream) {
            throw new DomainError(
              'subagent_dependency_not_found',
              `Unknown dependency ${dependency} for job ${job.key}`,
              422,
            )
          }
          await tx.subAgentRunDependency.create({
            data: {
              dependsOnRunId: upstream.id,
              runId: runByKey.get(job.key).id,
            },
          })
        }
      }

      await tx.subAgentRunGroup.update({
        data: { revision: { increment: 1 }, status: GROUP_STATUS.DISPATCHED },
        where: { id: group.id },
      })
      return await this.getGroup(group.id, { prisma: tx })
    })
  }

  async getGroup(groupId, { agentId = null, prisma = null } = {}) {
    prisma ||= await this._database()
    const group = await prisma.subAgentRunGroup.findFirst({
      include: {
        runs: {
          include: {
            artifacts: true,
            dependencies: true,
            session: {
              select: {
                subagentKey: true,
                subagentRole: true,
                title: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      where: {
        id: String(groupId),
        ...(agentId ? { agentId: String(agentId) } : {}),
      },
    })
    if (!group)
      throw new DomainError(
        'subagent_group_not_found',
        'SubAgent RunGroup not found',
        404,
      )
    return {
      ...group,
      runs: (group.runs || []).map((run) => ({
        ...run,
        role: run.session?.subagentRole || run.session?.title || run.jobKey,
      })),
    }
  }

  async listGroups({ agentId, parentSessionId, limit = 50 }) {
    const prisma = await this._database()
    const groups = await prisma.subAgentRunGroup.findMany({
      include: {
        runs: {
          select: {
            attempt: true,
            createdAt: true,
            finishedAt: true,
            id: true,
            jobKey: true,
            objective: true,
            sessionId: true,
            startedAt: true,
            status: true,
            session: {
              select: {
                subagentKey: true,
                subagentRole: true,
                title: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(Number(limit) || 50, 1), 200),
      where: {
        agentId: String(agentId),
        parentSessionId: String(parentSessionId),
      },
    })
    return groups.map((group) => {
      const runsBySession = new Map()
      for (const run of group.runs || []) {
        const key = run.sessionId || run.id
        const existing = runsBySession.get(key)
        if (!existing || (run.attempt ?? 0) >= (existing.attempt ?? 0)) {
          runsBySession.set(key, run)
        }
      }
      return {
        ...group,
        runs: Array.from(runsBySession.values()).map((run) => ({
          ...run,
          role: run.session?.subagentRole || run.session?.title || run.jobKey,
        })),
      }
    })
  }

  async getRun(runId, { agentId = null } = {}) {
    const prisma = await this._database()
    const run = await prisma.subAgentRun.findFirst({
      include: {
        artifacts: true,
        dependencies: true,
        events: { orderBy: { createdAt: 'asc' } },
        session: {
          select: {
            subagentKey: true,
            subagentRole: true,
            title: true,
          },
        },
      },
      where: {
        id: String(runId),
        ...(agentId ? { agentId: String(agentId) } : {}),
      },
    })
    if (!run)
      throw new DomainError(
        'subagent_run_not_found',
        'SubAgent Run not found',
        404,
      )
    return {
      ...run,
      role: run.session?.subagentRole || run.session?.title || run.jobKey,
    }
  }

  async transitionRun(runId, nextStatus, patch = {}) {
    const prisma = await this._database()
    return await prisma.$transaction(async (tx) => {
      const current = await tx.subAgentRun.findUnique({
        where: { id: String(runId) },
      })
      if (!current)
        throw new DomainError(
          'subagent_run_not_found',
          'SubAgent Run not found',
          404,
        )
      assertRunTransition(current.status, nextStatus)
      const terminal = TERMINAL_RUN_STATUSES.has(nextStatus)
      const updated = await tx.subAgentRun.update({
        data: {
          ...transitionPatch(patch),
          ...(nextStatus === RUN_STATUS.RUNNING && !current.startedAt
            ? { startedAt: new Date() }
            : {}),
          ...(terminal
            ? { finishedAt: new Date(), leaseExpiresAt: null, leaseOwner: null }
            : {}),
          status: nextStatus,
        },
        where: { id: current.id },
      })
      await tx.subAgentEvent.create({
        data: {
          id: newId('run_event'),
          payloadJson: json({ from: current.status, to: nextStatus }),
          runId: current.id,
          type: 'status_changed',
        },
      })
      await this._recalculateGroup(tx, current.groupId)
      return updated
    })
  }

  async continueRun(runId, { instruction = '' } = {}) {
    instruction = text(instruction, 'instruction')
    const prisma = await this._database()
    return await prisma.$transaction(async (tx) => {
      const run = await tx.subAgentRun.findUnique({
        include: { dependencies: true },
        where: { id: String(runId) },
      })
      if (!run)
        throw new DomainError(
          'subagent_run_not_found',
          'SubAgent Run not found',
          404,
        )
      if (run.status === RUN_STATUS.QUEUED) {
        await tx.subAgentRun.update({
          data: {
            cancelReason: 'superseded_by_continuation',
            cancelRequestedAt: new Date(),
            finishedAt: new Date(),
            leaseExpiresAt: null,
            leaseOwner: null,
            status: RUN_STATUS.CANCELLED,
          },
          where: { id: run.id },
        })
        await tx.subAgentEvent.create({
          data: {
            id: newId('run_event'),
            payloadJson: json({ from: run.status, to: RUN_STATUS.CANCELLED }),
            runId: run.id,
            type: 'status_changed',
          },
        })
      } else if (
        ![
          RUN_STATUS.RESULT_READY,
          RUN_STATUS.CANCELLED,
          RUN_STATUS.FAILED,
        ].includes(run.status)
      ) {
        throw new DomainError(
          'subagent_result_not_ready',
          'Run must be finished or stopped before it can continue',
          409,
        )
      }
      const latest = await tx.subAgentRun.findFirst({
        orderBy: { attempt: 'desc' },
        where: { groupId: run.groupId, jobKey: run.jobKey },
      })
      if (latest?.id !== run.id) {
        throw new DomainError(
          'stale_subagent_run',
          'Only the latest SubAgent result can be continued',
          409,
        )
      }
      const priorInput = (() => {
        try {
          return JSON.parse(run.inputJson || '{}')
        } catch {
          return {}
        }
      })()
      const revision = await tx.subAgentRun.create({
        data: {
          agentId: run.agentId,
          attempt: run.attempt + 1,
          budgetJson: run.budgetJson,
          groupId: run.groupId,
          id: newId('run'),
          inputJson: json({
            ...priorInput,
            continuationInstruction: instruction,
          }),
          jobKey: run.jobKey,
          model: run.model,
          objective: run.objective,
          outputContractJson: run.outputContractJson,
          parentSessionId: run.parentSessionId,
          provider: run.provider,
          reasoningEffort: run.reasoningEffort,
          reviewStatus: 'not_required',
          revisionOfRunId: run.id,
          sessionId: run.sessionId,
          taskType: run.taskType,
          toolDefinitionsHash: run.toolDefinitionsHash,
          toolNamesJson: run.toolNamesJson,
        },
      })
      for (const dependency of run.dependencies) {
        await tx.subAgentRunDependency.create({
          data: {
            condition: dependency.condition,
            dependsOnRunId: dependency.dependsOnRunId,
            runId: revision.id,
          },
        })
      }
      await tx.subAgentEvent.create({
        data: {
          id: newId('run_event'),
          payloadJson: json({
            continuationOfRunId: run.id,
            instruction,
            status: RUN_STATUS.QUEUED,
          }),
          runId: revision.id,
          type: 'run_queued',
        },
      })
      await tx.subAgentRunGroup.update({
        data: {
          finishedAt: null,
          revision: { increment: 1 },
          status: GROUP_STATUS.DISPATCHED,
        },
        where: { id: run.groupId },
      })
      return revision
    })
  }

  async requestCancel(runId, reason = '') {
    const prisma = await this._database()
    const run = await prisma.subAgentRun.findUnique({
      where: { id: String(runId) },
    })
    if (!run)
      throw new DomainError(
        'subagent_run_not_found',
        'SubAgent Run not found',
        404,
      )
    if (TERMINAL_RUN_STATUSES.has(run.status)) return run
    if (run.status === RUN_STATUS.QUEUED) {
      return await this.transitionRun(run.id, RUN_STATUS.CANCELLED, {
        cancelReason: reason || null,
        cancelRequestedAt: new Date(),
      })
    }
    return await prisma.subAgentRun.update({
      data: { cancelReason: reason || null, cancelRequestedAt: new Date() },
      where: { id: run.id },
    })
  }

  async _recalculateGroup(tx, groupId) {
    const group = await tx.subAgentRunGroup.findUnique({
      include: { runs: true },
      where: { id: groupId },
    })
    if (!group) return null
    const latestByJob = new Map()
    for (const run of group.runs) {
      const current = latestByJob.get(run.jobKey)
      if (!current || run.attempt > current.attempt) {
        latestByJob.set(run.jobKey, run)
      }
    }
    const runs = [...latestByJob.values()]
    let status = GROUP_STATUS.WAITING_CHILDREN
    const ready = runs.filter(
      (run) => run.status === RUN_STATUS.RESULT_READY,
    ).length
    const terminal = runs.filter((run) =>
      TERMINAL_RUN_STATUSES.has(run.status),
    ).length
    const threshold =
      group.completionPolicy === 'any'
        ? 1
        : group.completionPolicy === 'quorum'
          ? group.quorum || runs.length
          : runs.length
    if (ready >= threshold) status = GROUP_STATUS.COMPLETED
    else if (runs.every((run) => run.status === RUN_STATUS.CANCELLED)) {
      status = GROUP_STATUS.CANCELLED
    } else if (terminal === runs.length) status = GROUP_STATUS.FAILED
    if (status === group.status) return group
    return await tx.subAgentRunGroup.update({
      data: {
        revision: { increment: 1 },
        status,
        ...(status === GROUP_STATUS.FAILED || status === GROUP_STATUS.COMPLETED
          ? { finishedAt: new Date() }
          : {}),
      },
      where: { id: group.id },
    })
  }
}

export default SubAgentRunService
