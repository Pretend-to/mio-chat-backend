import crypto from 'node:crypto'
import { ChatEventFactory } from './ChatEventFactory.js'
import { getSessionWorkCoordinator } from '../../sessions/SessionWorkCoordinator.js'

const resolveEventId = (event) =>
  event?.eventId ||
  event?.adjustmentId ||
  event?.requestId ||
  `event_${crypto.randomUUID()}`

export function getChatEventConversationKey(event = {}) {
  if (typeof event.conversationKey === 'string' && event.conversationKey) {
    return event.conversationKey
  }
  if (event.agentId && event.sessionId) {
    return `agent:${event.agentId}:session:${event.sessionId}`
  }
  if (event.principalId && event.contactorId) {
    return `web:${event.principalId}:contactor:${event.contactorId}`
  }
  return null
}

const readAdjustStatus = (result) => {
  if (typeof result === 'string') return result
  if (result && typeof result.status === 'string') return result.status
  if (result && typeof result.adjustStatus === 'string') {
    return result.adjustStatus
  }
  return 'incompatible'
}

/**
 * Routes candidate ChatEvents to an active execution and stores durable Agent
 * Session wakes. Execution and output remain owned by the caller's handler.
 */
export class ChatEventDispatcher {
  constructor({ coordinator = getSessionWorkCoordinator() } = {}) {
    this.coordinator = coordinator
    this.activeEvents = new Map()
    this.adjustmentSubscriptions = new WeakMap()
    this.activeWorkItems = new Map()
    this.activeWorkItemsByEventId = new Map()
    this.workItemStatusChains = new Map()
    this.wakeRunner = null
    this.drainTimers = new Map()
    this.drainingSessions = new Set()
  }

  async submitWake(input = {}) {
    const workItem = await this.coordinator.acceptWake(input)
    let activeEvent = this.activeEvents.get(workItem.conversationKey)
    if (activeEvent && (activeEvent.completed || activeEvent.aborted)) {
      this.unregisterActive(activeEvent)
      activeEvent = null
    }
    if (
      activeEvent &&
      typeof activeEvent.adjust === 'function' &&
      ['accepted', 'queued', 'deferred'].includes(workItem.status)
    ) {
      const candidate = ChatEventFactory.createForWake(workItem)
      this._trackActiveWorkItem(activeEvent, workItem.id)
      if (await this._isDeliveryCompatible(workItem, activeEvent)) {
        activeEvent.adjust(candidate)
      } else {
        await this._queueWorkItemStatus(workItem.id, 'deferred')
      }
    } else if (
      !activeEvent &&
      ['accepted', 'queued', 'deferred'].includes(workItem.status)
    ) {
      this._scheduleDrain(workItem.conversationKey)
    }
    return {
      eventId: workItem.eventId,
      status: 'accepted',
      workItemId: workItem.id,
    }
  }

  /**
   * Submit a runtime ChatEvent. For an idle conversation pass `start`, which
   * owns the existing execution/output path. While busy, `adjust` decides
   * whether the candidate can be consumed at a later tool checkpoint.
   */
  async submit(event, { start } = {}) {
    if (!event || typeof event !== 'object') {
      throw new TypeError('ChatEventDispatcher.submit requires an event')
    }
    const eventId = resolveEventId(event)
    const conversationKey = getChatEventConversationKey(event)
    if (!conversationKey) {
      throw new TypeError(
        'ChatEventDispatcher requires a conversationKey or a scoped target',
      )
    }

    let activeEvent = this.activeEvents.get(conversationKey)
    if (activeEvent && (activeEvent.completed || activeEvent.aborted)) {
      this.unregisterActive(activeEvent)
      activeEvent = null
    }
    if (activeEvent) {
      if (activeEvent === event || resolveEventId(activeEvent) === eventId) {
        return { eventId, status: 'running', workItemId: null }
      }
      if (typeof activeEvent.adjust !== 'function') {
        return {
          adjustStatus: 'incompatible',
          eventId,
          status: 'deferred',
          workItemId: null,
        }
      }
      const adjustStatus = readAdjustStatus(await activeEvent.adjust(event))
      return {
        adjustStatus,
        eventId,
        status:
          adjustStatus === 'accepted_for_checkpoint' ||
          adjustStatus === 'absorbed'
            ? 'accepted'
            : adjustStatus === 'defer_to_next_turn'
              ? 'deferred'
              : adjustStatus,
        workItemId: null,
      }
    }

    if (typeof start !== 'function') {
      const error = new Error(
        'An idle ChatEvent requires a start handler from its execution owner',
      )
      error.code = 'chat_event_start_handler_required'
      throw error
    }

    if (!this.registerActive(event, { conversationKey })) {
      return {
        adjustStatus: 'defer_to_next_turn',
        eventId,
        status: 'deferred',
        workItemId: null,
      }
    }
    try {
      const result = await start(event)
      event._dispatcherTerminalStatus = 'completed'
      if (!event.agentId || !event.sessionId) {
        await this.finishAbsorbedForEvent(event, { status: 'completed' })
      }
      return { eventId, result, status: 'completed', workItemId: null }
    } catch (error) {
      event._dispatcherTerminalStatus = 'failed'
      if (!event.agentId || !event.sessionId) {
        await this.finishAbsorbedForEvent(event, {
          error: error?.message || String(error),
          status: 'failed',
        })
      }
      throw error
    } finally {
      this.unregisterActive(event)
    }
  }

  registerActive(event, { conversationKey = null } = {}) {
    if (!event || typeof event !== 'object') {
      throw new TypeError('registerActive requires an event')
    }
    const key = conversationKey || getChatEventConversationKey(event)
    if (!key) {
      throw new TypeError(
        'registerActive requires a conversationKey or a scoped target',
      )
    }
    const activeEvent = this.activeEvents.get(key)
    if (activeEvent && activeEvent !== event) return false
    this.activeEvents.set(key, event)
    if (
      typeof event.onAdjustmentStatus === 'function' &&
      !this.adjustmentSubscriptions.has(event)
    ) {
      const unsubscribe = event.onAdjustmentStatus((change) =>
        this._handleAdjustmentStatus(change),
      )
      this.adjustmentSubscriptions.set(event, unsubscribe)
    }
    return true
  }

  unregisterActive(eventOrKey) {
    const key =
      typeof eventOrKey === 'string'
        ? eventOrKey
        : getChatEventConversationKey(eventOrKey)
    if (!key) return false
    const activeEvent = this.activeEvents.get(key)
    if (!activeEvent) return false
    if (typeof eventOrKey !== 'string' && activeEvent !== eventOrKey) {
      return false
    }
    this.activeEvents.delete(key)
    const unsubscribe = this.adjustmentSubscriptions.get(activeEvent)
    if (unsubscribe) {
      unsubscribe()
      this.adjustmentSubscriptions.delete(activeEvent)
    }
    return true
  }

  getActiveEvent(eventOrKey) {
    const key =
      typeof eventOrKey === 'string'
        ? eventOrKey
        : getChatEventConversationKey(eventOrKey)
    return key ? this.activeEvents.get(key) || null : null
  }

  onWorkItemStatus(listener) {
    return this.coordinator.onWorkItemStatus(listener)
  }

  async markWorkItemStatus(workItemId, status, details = {}) {
    return await this.coordinator.markWorkItemStatus(
      workItemId,
      status,
      details,
    )
  }

  async getWorkItem(workItemId) {
    return await this.coordinator.getWorkItem(workItemId)
  }

  async findOpenWorkItemByOriginRef(originRef, filter) {
    return await this.coordinator.findOpenWorkItemByOriginRef(originRef, filter)
  }

  async listOpenWorkItems(filter) {
    return await this.coordinator.listOpenWorkItems(filter)
  }

  registerWakeRunner(handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('wake runner must be a function')
    }
    this.wakeRunner = handler
    return () => {
      if (this.wakeRunner === handler) {
        this.wakeRunner = null
        for (const timer of this.drainTimers.values()) clearTimeout(timer)
        this.drainTimers.clear()
      }
    }
  }

  async resumePending() {
    const open = await this.coordinator.listOpenWorkItems()
    for (const workItem of open) {
      if (workItem.status === 'absorbed' || workItem.status === 'running') {
        const evidence =
          await this.coordinator.inspectWorkItemPersistence(workItem)
        if (evidence.state === 'completed') {
          await this.markWorkItemStatus(workItem.id, 'completed', {
            completion: {
              assistantMessageId: evidence.assistantMessageId,
              assistantText: String(evidence.assistantText || '').slice(
                0,
                28000,
              ),
              executionKind: evidence.assistantMessageId?.startsWith(
                `msg_a_work_${workItem.eventId}`,
              )
                ? 'standalone'
                : 'absorbed',
              recovered: true,
            },
          })
          continue
        }
        if (evidence.state === 'partial' || workItem.status === 'absorbed') {
          await this.markWorkItemStatus(workItem.id, 'needs_attention', {
            error:
              'The interrupted work has partial or ambiguous Session history; automatic replay could repeat side effects.',
          })
          continue
        }
        await this.markWorkItemStatus(workItem.id, 'deferred', {
          error: 'The owning execution ended before its first Session write.',
          availableAt: new Date(),
        })
      }
    }
    const pending = await this.coordinator.listOpenWorkItems()
    for (const workItem of pending) {
      if (['accepted', 'queued', 'deferred'].includes(workItem.status)) {
        this._scheduleDrain(workItem.conversationKey)
      }
    }
    return pending.length
  }

  async finishAbsorbedForEvent(
    eventOrEventId,
    { status = 'completed', assistantMessageId = null, error = null } = {},
  ) {
    const event = typeof eventOrEventId === 'object' ? eventOrEventId : null
    const eventId =
      event?.eventId ||
      event?.requestId ||
      (eventOrEventId == null ? null : String(eventOrEventId))
    const ids =
      (event && this.activeWorkItems.get(event)) ||
      (eventId && this.activeWorkItemsByEventId.get(eventId))
    if (!eventId || !ids?.size) return 0
    const targetStatus =
      status === 'failed'
        ? 'failed'
        : status === 'needs_attention'
          ? 'needs_attention'
          : status === 'deferred'
            ? 'deferred'
            : 'completed'
    const changes = []
    for (const workItemId of ids) {
      changes.push(
        (async () => {
          await this.workItemStatusChains
            .get(String(workItemId))
            ?.catch(() => {})
          const current = await this.coordinator.getWorkItem(workItemId)
          if (
            !current ||
            !['accepted', 'queued', 'absorbed', 'running', 'deferred'].includes(
              current.status,
            )
          ) {
            return current
          }
          if (current.status !== 'absorbed') {
            if (
              ['deferred', 'needs_attention'].includes(targetStatus) &&
              current.status !== 'deferred'
            ) {
              return await this._queueWorkItemStatus(workItemId, 'deferred', {
                availableAt: new Date(),
                ...(error ? { error } : {}),
              })
            }
            return current
          }
          const details =
            targetStatus === 'failed' || targetStatus === 'needs_attention'
              ? {
                  error:
                    error ||
                    (targetStatus === 'failed'
                      ? 'Owning active Event failed'
                      : 'Owning active Event was aborted after this work was absorbed'),
                }
              : targetStatus === 'deferred'
                ? { availableAt: new Date(), ...(error ? { error } : {}) }
                : {
                    absorbedAssistantMessageId:
                      assistantMessageId || current.absorbedAssistantMessageId,
                  }
          return await this._queueWorkItemStatus(
            workItemId,
            targetStatus,
            details,
          )
        })(),
      )
    }
    await Promise.all(changes)
    if (event) this.activeWorkItems.delete(event)
    this.activeWorkItemsByEventId.delete(eventId)
    const key = event ? getChatEventConversationKey(event) : null
    if (key) this._scheduleDrain(key)
    return ids.size
  }

  async finishActive(event, options = {}) {
    return await this.finishAbsorbedForEvent(event, options)
  }

  _terminalStatus(event) {
    if (!event) return null
    if (event._dispatcherTerminalStatus) return event._dispatcherTerminalStatus
    if (event._dispatcherFailed || event.failed || event.aborted)
      return 'failed'
    if (event.completed) return 'completed'
    return null
  }

  _queueWorkItemStatus(workItemId, status, details = {}) {
    const id = String(workItemId)
    const previous = this.workItemStatusChains.get(id) || Promise.resolve()
    const next = previous
      .catch(() => {})
      .then(() => this.markWorkItemStatus(id, status, details))
    this.workItemStatusChains.set(id, next)
    return next.finally(() => {
      if (this.workItemStatusChains.get(id) === next) {
        this.workItemStatusChains.delete(id)
      }
    })
  }

  _trackActiveWorkItem(event, workItemId) {
    if (!event || !workItemId) return
    let ids = this.activeWorkItems.get(event)
    if (!ids) {
      ids = new Set()
      this.activeWorkItems.set(event, ids)
    }
    ids.add(String(workItemId))
    const eventId = event.eventId || event.requestId
    if (eventId) this.activeWorkItemsByEventId.set(String(eventId), ids)
  }

  _scheduleDrain(conversationKey, delayMs = 0) {
    if (
      !this.wakeRunner ||
      !conversationKey ||
      this.drainTimers.has(conversationKey)
    ) {
      return false
    }
    const timer = setTimeout(
      () => {
        this.drainTimers.delete(conversationKey)
        this._drainSession(conversationKey).catch((error) =>
          console.error('[ChatEventDispatcher] wake drain failed:', error),
        )
      },
      Math.max(0, delayMs),
    )
    timer.unref?.()
    this.drainTimers.set(conversationKey, timer)
    return true
  }

  requestDrain({ agentId, sessionId }) {
    const conversationKey = `agent:${agentId}:session:${sessionId}`
    return this._scheduleDrain(conversationKey)
  }

  async _drainSession(conversationKey) {
    if (!this.wakeRunner || this.drainingSessions.has(conversationKey)) return
    const activeEvent = this.activeEvents.get(conversationKey)
    if (activeEvent && !activeEvent.completed && !activeEvent.aborted) return
    if (activeEvent) this.unregisterActive(activeEvent)

    this.drainingSessions.add(conversationKey)
    try {
      while (this.wakeRunner) {
        const pending = await this.coordinator.listOpenWorkItems({
          ...this._targetFromConversationKey(conversationKey),
        })
        const item = pending.find(
          (candidate) =>
            ['accepted', 'queued', 'deferred'].includes(candidate.status) &&
            candidate.availableAt <= new Date(),
        )
        if (!item) {
          const nextAvailable = pending
            .filter((candidate) =>
              ['accepted', 'queued', 'deferred'].includes(candidate.status),
            )
            .map((candidate) => candidate.availableAt)
            .toSorted((a, b) => a - b)[0]
          if (nextAvailable) {
            this._scheduleDrain(
              conversationKey,
              Math.max(10, nextAvailable.getTime() - Date.now()),
            )
          }
          break
        }

        try {
          await this.wakeRunner(item)
          const current = await this.coordinator.getWorkItem(item.id)
          if (
            current &&
            ['accepted', 'queued', 'deferred'].includes(current.status)
          ) {
            await this.markWorkItemStatus(item.id, 'deferred', {
              availableAt: new Date(Date.now() + 1000),
              error: 'Wake runner returned before completing the work item.',
            })
            this._scheduleDrain(conversationKey, 1000)
            break
          }
        } catch (error) {
          const current = await this.coordinator.getWorkItem(item.id)
          if (
            current &&
            ['accepted', 'queued', 'deferred'].includes(current.status)
          ) {
            await this.markWorkItemStatus(item.id, 'deferred', {
              availableAt: new Date(Date.now() + 1000),
              error: error?.message || String(error),
            })
            this._scheduleDrain(conversationKey, 1000)
          } else {
            console.error('[ChatEventDispatcher] wake runner failed:', error)
          }
          break
        }
      }
    } finally {
      this.drainingSessions.delete(conversationKey)
    }
  }

  _targetFromConversationKey(conversationKey) {
    const match = /^agent:(.*):session:(.*)$/.exec(conversationKey)
    return match ? { agentId: match[1], sessionId: match[2] } : {}
  }

  async _isDeliveryCompatible(workItem, activeEvent) {
    let wakePrincipal = null
    try {
      wakePrincipal = workItem.principalJson
        ? JSON.parse(workItem.principalJson)
        : null
    } catch {
      wakePrincipal = null
    }
    const requiresAdminContext =
      wakePrincipal?.isAdmin === true || wakePrincipal?.role === 'system_admin'
    const activePrincipal = activeEvent.user || activeEvent.principal || {}
    const hasAdminContext =
      activePrincipal.isAdmin === true ||
      ['admin', 'system_admin'].includes(activePrincipal.role)
    if (requiresAdminContext && !hasAdminContext) return false

    const requestedMode = workItem.deliveryMode || 'default'
    const activeMode = activeEvent.deliveryMode || 'default'
    let requestedBindingId = workItem.deliveryBindingId || null
    const activeBindingId =
      activeEvent.deliveryBindingId ||
      (activeMode === 'channel' ? activeEvent.bindingId : null) ||
      null
    if (requestedMode !== activeMode) return false
    if (
      requestedMode === 'default' &&
      !requestedBindingId &&
      typeof this.coordinator.getDefaultDeliveryBindingId === 'function'
    ) {
      requestedBindingId =
        (await this.coordinator.getDefaultDeliveryBindingId(
          workItem.agentId,
        )) || null
    }
    return requestedBindingId === activeBindingId
  }

  _handleAdjustmentStatus({
    activeEvent,
    anchor = {},
    incomingEvent,
    status,
  } = {}) {
    const workItemId = incomingEvent?.workItemId
    if (!workItemId) return
    if (status === 'absorbed') {
      this._trackActiveWorkItem(activeEvent, workItemId)
      return this._queueWorkItemStatus(workItemId, 'absorbed', {
        absorbedAssistantMessageId:
          anchor.assistantMessageId || activeEvent?.messageId || null,
        absorbedByEventId: activeEvent?.eventId || activeEvent?.requestId,
      })
    }
    if (status === 'accepted_for_checkpoint') {
      this._trackActiveWorkItem(activeEvent, workItemId)
    }
    if (
      status === 'defer_to_next_turn' ||
      status === 'incompatible' ||
      status === 'closed'
    ) {
      return this._queueWorkItemStatus(workItemId, 'deferred')
    }
  }
}

let dispatcher

export function getChatEventDispatcher() {
  if (!dispatcher) dispatcher = new ChatEventDispatcher()
  return dispatcher
}

export default ChatEventDispatcher
