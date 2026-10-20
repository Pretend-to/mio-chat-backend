/**
 * WakeInjector.js — 事件唤醒注入器
 *
 * 核心职责（docs/architecture/trigger-system.md §3）：
 * 1. 冷却与日限额校验（cooldownSec / maxFiresPerDay）
 * 2. 模板插值并构造标准化 User 唤醒消息（「system：trigger 系统监测到事件...」）
 * 3. 将精确的 Agent + Session 唤醒事件提交给 ChatEventDispatcher
 * 4. 记录审计日志并处理 once / persistent 生命周期
 */

import logger from '../../utils/logger.js'
import crypto from 'node:crypto'
import { getChatEventDispatcher } from '../chat/llm/events/ChatEventDispatcher.js'
import { BoundedRecentMap, BoundedRecentSet } from './BoundedRecentState.js'

export class WakeInjector {
  constructor({ registry, dispatcher = null, onWakeStatus = null } = {}) {
    this.registry = registry
    this.dispatcher = dispatcher
    this.onWakeStatus = onWakeStatus
    this._wakeLocks = new Map()
    this._pendingWakes = new Map()
    this._removeStatusListener = null
    this._workItemStatusByExecutionId = new BoundedRecentMap()
    this._startedExecutionIds = new BoundedRecentSet()
    this._openWorkItemsReconciliation = null
    this._openWorkItemsReconciled = false
  }

  _getDispatcher() {
    return this.dispatcher || getChatEventDispatcher()
  }

  startListening() {
    const dispatcher = this._getDispatcher()
    this._subscribeToWorkItemStatus(dispatcher)
    return dispatcher
  }

  async reconcileOpenWorkItems(dispatcher = this.startListening()) {
    if (this._openWorkItemsReconciled) return 0
    if (this._openWorkItemsReconciliation) {
      return await this._openWorkItemsReconciliation
    }
    if (!dispatcher?.listOpenWorkItems) {
      this._openWorkItemsReconciled = true
      return 0
    }

    const reconciliation = (async () => {
      const openItems = await dispatcher.listOpenWorkItems()
      let reconciled = 0
      for (const workItem of openItems) {
        const match = /^trigger_execution:([^:]+):trigger:(.+)$/.exec(
          workItem?.originRef || '',
        )
        if (!match) continue
        const [, executionId, triggerId] = match
        const key = `${workItem.agentId || ''}:${triggerId}`
        const latestStatus = workItem.status || 'queued'
        if (!['absorbed', 'running'].includes(latestStatus)) {
          this._pendingWakes.set(key, {
            eventId: workItem.eventId,
            executionId,
            workItemId: workItem.id || workItem.workItemId,
          })
        }
        await this._handleWorkItemStatus({
          previousStatus: 'queued',
          status: latestStatus,
          workItem,
        })
        reconciled += 1
      }
      this._openWorkItemsReconciled = true
      return reconciled
    })()
    this._openWorkItemsReconciliation = reconciliation
    try {
      return await reconciliation
    } finally {
      if (this._openWorkItemsReconciliation === reconciliation) {
        this._openWorkItemsReconciliation = null
      }
    }
  }

  _subscribeToWorkItemStatus(dispatcher) {
    if (this._removeStatusListener || !dispatcher?.onWorkItemStatus) return
    this._removeStatusListener = dispatcher.onWorkItemStatus((event) => {
      void this._handleWorkItemStatus(event).catch((error) => {
        logger.error('[WakeInjector] 更新唤醒状态失败:', error)
      })
    })
  }

  async _handleWorkItemStatus({ status, workItem, previousStatus } = {}) {
    const originRef = workItem?.originRef || ''
    const match = /^trigger_execution:([^:]+)(?::|$)/.exec(originRef)
    if (!match || !this.registry?.updateExecution) return
    const executionId = match[1]
    this._workItemStatusByExecutionId.set(executionId, status)
    const record = await this.registry.getExecution?.(executionId)
    if (!record) return

    const wasStarted =
      this._startedExecutionIds.has(executionId) ||
      ['absorbed', 'running', 'completed'].includes(record.status)
    const startedNow = ['absorbed', 'running'].includes(status) && !wasStarted
    if (startedNow) {
      this._startedExecutionIds.add(executionId)
    }
    const statusMap = {
      accepted: 'queued',
      queued: 'queued',
      absorbed: 'absorbed',
      running: 'running',
      completed: 'completed',
      failed: 'failed',
      deferred: 'deferred',
      needs_attention: 'needs_attention',
    }
    const auditStatus = statusMap[status]
    if (!auditStatus) return

    const updatedRecord = await this.registry.updateExecution(executionId, {
      error:
        status === 'failed'
          ? workItem?.lastError || record.error || 'Wake work failed'
          : status === 'completed' || startedNow
            ? null
            : record.error,
      ...(startedNow ? { firedAt: Date.now() } : {}),
      sessionId: workItem?.sessionId || record.sessionId,
      status: auditStatus,
      wake: record.wake || startedNow || wasStarted,
    })

    let trigger = null
    if (startedNow && updatedRecord?.triggerId) {
      trigger = await this.registry.get(updatedRecord.triggerId, {
        agentId: workItem?.agentId,
      })
      if (trigger?.mode === 'once') {
        await this.registry.remove(trigger.id, { agentId: trigger.agentId })
      } else if (trigger) {
        const now = Date.now()
        trigger = await this.registry.update(
          trigger.id,
          {
            fireCount: (trigger.fireCount || 0) + 1,
            lastFiredAt: now,
            wakeCount: (trigger.wakeCount || 0) + 1,
          },
          { agentId: trigger.agentId },
        )
      }
    }

    const pendingKey = `${workItem?.agentId || ''}:${updatedRecord?.triggerId || ''}`
    if (
      startedNow ||
      ['failed', 'completed', 'needs_attention'].includes(status)
    ) {
      const pending = this._pendingWakes.get(pendingKey)
      if (!pending || pending.executionId === executionId) {
        this._pendingWakes.delete(pendingKey)
      }
    }

    try {
      await this.onWakeStatus?.({
        executionId,
        previousStatus: previousStatus || record.status,
        record: updatedRecord,
        started: startedNow,
        status,
        trigger,
        workItem,
      })
    } catch (error) {
      logger.error('[WakeInjector] Wake status callback failed:', error)
    }
    if (['completed', 'failed', 'needs_attention'].includes(status)) {
      this._startedExecutionIds.delete(executionId)
    }
  }

  /**
   * 渲染 prompt 模板插值（支持 {{payload.xxx}} 与 {{params.xxx}}）
   */
  static interpolateTemplate(template, payload = {}, params = {}) {
    if (!template || typeof template !== 'string') return ''

    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, pathStr) => {
      const parts = pathStr.split('.')
      let curr = null
      if (parts[0] === 'payload') {
        curr = payload
        parts.shift()
      } else if (parts[0] === 'params') {
        curr = params
        parts.shift()
      } else {
        curr = payload
      }

      for (const p of parts) {
        if (curr && typeof curr === 'object' && p in curr) {
          curr = curr[p]
        } else {
          return match
        }
      }

      if (curr !== null && typeof curr === 'object') {
        return JSON.stringify(curr)
      }
      return curr !== undefined && curr !== null ? String(curr) : ''
    })
  }

  /**
   * 执行唤醒注入流程
   * @param {object} trigger - 触发器对象
   * @param {{ reason?: string, data?: any }} payload - 触发事件 payload
   * @param {object} [opts] - 执行参数（例如 durationMs 等）
   * @returns {Promise<{ injected: boolean, reason?: string, wakeMessage?: string, error?: string }>}
   */
  async processWake(trigger, payload = {}, opts = {}) {
    const lockKey = `${trigger.agentId || ''}:${trigger.id}`
    const previous = this._wakeLocks.get(lockKey) || Promise.resolve()
    const current = previous
      .catch(() => {})
      .then(() => {
        return this._processWake(trigger, payload, opts)
      })
    this._wakeLocks.set(lockKey, current)
    try {
      return await current
    } finally {
      if (this._wakeLocks.get(lockKey) === current) {
        this._wakeLocks.delete(lockKey)
      }
    }
  }

  async _processWake(trigger, payload = {}, opts = {}) {
    if (this.registry?.get) {
      const current = await this.registry.get(trigger.id, {
        agentId: trigger.agentId,
      })
      if (!current) {
        return {
          injected: false,
          reason: `Trigger "${trigger.id}" not found or not owned by this agent`,
          status: 'trigger_not_found',
        }
      }
      trigger = current
    }

    const triggerKey = `${trigger.agentId || ''}:${trigger.id}`
    const pending = this._pendingWakes.get(triggerKey)
    if (pending) {
      const latestStatus =
        this._workItemStatusByExecutionId.get(pending.executionId) || 'queued'
      return {
        accepted: true,
        eventId: pending.eventId,
        executionId: pending.executionId,
        injected: false,
        reason: payload.reason || '',
        started: ['absorbed', 'running'].includes(latestStatus),
        status: latestStatus,
        workItemId: pending.workItemId,
      }
    }

    const dispatcher = this.startListening()
    await this.reconcileOpenWorkItems(dispatcher)
    if (dispatcher?.listOpenWorkItems) {
      const openItems = await dispatcher.listOpenWorkItems({
        agentId: trigger.agentId,
        sessionId: trigger.sessionId,
      })
      const pendingRef = `:trigger:${trigger.id}`
      const openItem = openItems.find(
        (item) =>
          (item.agentId || item.target?.agentId) === trigger.agentId &&
          item.originRef?.startsWith('trigger_execution:') &&
          item.originRef?.endsWith(pendingRef),
      )
      if (openItem) {
        const executionMatch = /^trigger_execution:([^:]+)/.exec(
          openItem.originRef,
        )
        const executionId = executionMatch?.[1] || null
        const pendingWake = {
          eventId: openItem.eventId,
          executionId,
          workItemId: openItem.id || openItem.workItemId,
        }
        const hasStarted = ['absorbed', 'running'].includes(openItem.status)
        if (!hasStarted) this._pendingWakes.set(triggerKey, pendingWake)
        if (['absorbed', 'running'].includes(openItem.status)) {
          await this._handleWorkItemStatus({
            previousStatus: 'queued',
            status: openItem.status,
            workItem: openItem,
          })
        }
        return {
          accepted: true,
          eventId: openItem.eventId,
          executionId,
          injected: false,
          reason: payload.reason || '',
          started: hasStarted,
          status: openItem.status || 'queued',
          workItemId: openItem.id || openItem.workItemId,
        }
      }
    }

    const now = Date.now()
    const cooldownMs = (trigger.cooldownSec || 1800) * 1000

    // 1. 冷却检查
    if (trigger.lastFiredAt && now - trigger.lastFiredAt < cooldownMs) {
      const remainingSec = Math.ceil(
        (cooldownMs - (now - trigger.lastFiredAt)) / 1000,
      )
      const skipReason = `Trigger 在冷却中（剩余 ${remainingSec}s），跳过本次唤醒`
      logger.warn(
        `[WakeInjector] ⏳ 哨兵 "${trigger.id}" 处于冷却中（剩余 ${remainingSec}s），跳过本次唤醒`,
      )
      await this.registry?.recordExecution?.({
        data: payload.data,
        durationMs: opts.durationMs || 0,
        reason: skipReason,
        status: 'cooldown_skipped',
        triggerId: trigger.id,
        wake: false,
      })
      return { injected: false, reason: skipReason, status: 'cooldown_skipped' }
    }

    // 2. 日限额检查
    const maxFires = trigger.maxFiresPerDay || 5
    if (this.registry) {
      const todayStart = new Date().setHours(0, 0, 0, 0)
      const todayWakeCount = this.registry.countWakeExecutionsSince
        ? await this.registry.countWakeExecutionsSince(trigger.id, todayStart)
        : (
            await this.registry.listExecutions(trigger.id, { limit: 1000 })
          ).filter((l) => l.wake && l.firedAt >= todayStart).length
      if (todayWakeCount >= maxFires) {
        const skipReason = `已达每日最大唤醒限额 (${todayWakeCount}/${maxFires})，跳过本次唤醒`
        logger.warn(
          `[WakeInjector] 🚫 哨兵 "${trigger.id}" 已达每日最大唤醒限额 (${todayWakeCount}/${maxFires})，跳过本次唤醒`,
        )
        await this.registry.recordExecution({
          data: payload.data,
          durationMs: opts.durationMs || 0,
          reason: skipReason,
          status: 'quota_exceeded',
          triggerId: trigger.id,
          wake: false,
        })
        return { injected: false, reason: skipReason, status: 'quota_exceeded' }
      }
    }

    // 3. 构造标准注入消息
    let promptBody = ''
    if (trigger.promptTemplate && trigger.promptTemplate.trim()) {
      promptBody = WakeInjector.interpolateTemplate(
        trigger.promptTemplate,
        payload,
        trigger.params,
      )
    }
    if (!promptBody.trim()) {
      promptBody = payload.reason || '检测到预设条件触发'
    }

    const payloadBlock = payload.data
      ? `\n【事件证据与明细】：\n\`\`\`json\n${JSON.stringify(payload.data, null, 2)}\n\`\`\``
      : ''

    const wakeMessage = [
      `system：trigger 系统监测到事件，符合唤起条件，请处理。`,
      `【事件原因】：${payload.reason || promptBody}`,
      promptBody !== payload.reason ? `【关注提示】：${promptBody}` : null,
      payloadBlock,
    ]
      .filter(Boolean)
      .join('\n')

    let auditRecord = null
    try {
      auditRecord = await this.registry?.recordExecution?.({
        data: payload.data,
        durationMs: opts.durationMs || 0,
        reason: payload.reason || promptBody,
        status: 'queued',
        triggerId: trigger.id,
        wake: false,
      })
      const executionId = auditRecord?.id || `exec_${crypto.randomUUID()}`
      const originRef = `trigger_execution:${executionId}:trigger:${trigger.id}`
      const idempotencyKey =
        opts.idempotencyKey || `trigger:${trigger.id}:${executionId}`
      const principal = {
        externalUserId: 'trigger-runtime',
        id: `system:trigger:${trigger.id}`,
        isAdmin: true,
        role: 'system_admin',
      }
      this._pendingWakes.set(triggerKey, {
        eventId: null,
        executionId,
        workItemId: null,
      })
      const receipt = await dispatcher.submitWake({
        agentId: trigger.agentId,
        sessionId: trigger.sessionId,
        kind: 'scheduler',
        wakeKind: 'trigger_wake',
        originRef,
        idempotencyKey,
        instruction: wakeMessage,
        deliveryMode:
          trigger.deliveryMode ||
          (trigger.deliveryBindingId ? 'channel' : 'default'),
        deliveryBindingId: trigger.deliveryBindingId,
        principal,
      })
      const pendingWake = {
        eventId: receipt.eventId,
        executionId,
        workItemId: receipt.workItemId,
      }
      const currentWorkItem = await dispatcher.getWorkItem?.(receipt.workItemId)
      const workItemStatus = currentWorkItem?.status || null
      const observedStatus = this._workItemStatusByExecutionId.get(executionId)
      const isStarted =
        ['absorbed', 'running'].includes(workItemStatus) ||
        ['absorbed', 'running'].includes(observedStatus)
      const hasSettled = ['completed', 'failed', 'needs_attention'].includes(
        observedStatus || workItemStatus,
      )
      if (!isStarted && !hasSettled) {
        this._pendingWakes.set(triggerKey, pendingWake)
      }
      if (isStarted) {
        if (currentWorkItem) {
          await this._handleWorkItemStatus({
            previousStatus: 'queued',
            status: workItemStatus,
            workItem: currentWorkItem,
          })
        }
      }
      logger.info(
        `[WakeInjector] 已将 Trigger "${trigger.id}" 唤醒排入 Agent Session`,
      )
      return {
        accepted: true,
        eventId: receipt.eventId,
        executionId,
        injected: false,
        reason: payload.reason || promptBody,
        started: isStarted,
        status: workItemStatus || observedStatus || 'queued',
        wakeMessage,
        workItemId: receipt.workItemId,
      }
    } catch (e) {
      const error = `唤醒任务提交失败: ${e.message}`
      logger.error('[WakeInjector] 唤醒任务提交失败:', e)
      if (auditRecord?.id) {
        await this.registry?.updateExecution?.(auditRecord.id, {
          error,
          status: 'failed',
          wake: false,
        })
      } else {
        await this.registry?.recordExecution?.({
          data: payload.data,
          durationMs: opts.durationMs || 0,
          error,
          reason: payload.reason || promptBody,
          status: 'failed',
          triggerId: trigger.id,
          wake: false,
        })
      }
      this._pendingWakes.delete(triggerKey)
      return {
        accepted: false,
        error,
        injected: false,
        reason: payload.reason || promptBody,
        status: 'inject_failed',
        wakeMessage,
      }
    }
  }
}
