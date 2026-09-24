/**
 * lib/chat/llm/events/ChatEvent.js
 * 统一领域模型：ChatEvent 核心基类
 */

import { assertValidSceneDimensions } from './constants.js'
import { resolveOrigin } from '../../../../utils/origin.js'

const MAX_PENDING_ADJUSTMENTS = 16
const MAX_PENDING_ADJUSTMENT_CHARS = 16000
const MAX_SEEN_ADJUSTMENTS = 256

/**
 * 默认安全的 Null Object Client 实现，防止任何适配器因缺少客户端句柄抛出未定义异常
 */
function createNullClient() {
  return {
    emit: () => {},
    on: () => {},
    popConnection: () => {},
    popEvent: () => {},
    pushConnection: () => {},
    pushEvent: () => {},
    removeListener: () => {},
    sendOpenaiMessage: () => {},
  }
}

export class ChatEvent {
  /**
   * @param {object} params
   * @param {string} params.requestId
   * @param {string} params.source
   * @param {string} params.conversationKind
   * @param {string} params.triggerKind
   * @param {string} params.actorId
   * @param {string|null} [params.agentId]
   * @param {string} params.principalId
   * @param {string[]} [params.cacheOwnerIds]
   * @param {object} [params.user]
   * @param {string|null} [params.sessionId]
   * @param {string|null} [params.contactorId]
   * @param {string|null} [params.channelId]
   * @param {string|null} [params.bindingId]
   * @param {string|null} [params.channelConversationId]
   * @param {string|null} [params.externalConversationId]
   * @param {string} params.messageId
   * @param {object|null} [params.member]
   * @param {Array<object>} [params.messages]
   * @param {object} [params.settings]
   * @param {object|null} [params.channel]
   * @param {object|null} [params.memory]
   * @param {object|null} [params.client]
   * @param {object|null} [params.auditContext]
   * @param {number} [params.requestStartTime]
   */
  constructor(params) {
    if (!params || typeof params !== 'object') {
      throw new TypeError('[ChatEvent] 实例化入参 params 必须为对象')
    }

    const {
      agentId = null,
      actorId,
      auditContext = null,
      cacheOwnerIds = [],
      channel = null,
      channelId = null,
      bindingId = null,
      channelConversationId = null,
      externalConversationId = null,
      externalThreadId = null,
      envelope = null,
      client = null,
      contactorId = null,
      conversationKey = null,
      conversationKind,
      deliveryBindingId = null,
      deliveryMode = null,
      eventId = null,
      idempotencyKey = null,
      instruction = null,
      kind = null,
      member = null,
      memory = null,
      messageId,
      messages = [],
      originRef = null,
      principalId,
      requestId,
      requestStartTime = Date.now(),
      sessionScope = null,
      settings = {},
      sessionId = null,
      source,
      triggerKind,
      wakeKind = null,
      user = null,
    } = params

    // 1. 断言不变量与正交枚举
    assertValidSceneDimensions({ conversationKind, source, triggerKind })

    if (!requestId || typeof requestId !== 'string') {
      throw new TypeError('[ChatEvent] requestId 必须为非空字符串')
    }
    if (!actorId || typeof actorId !== 'string') {
      throw new TypeError('[ChatEvent] actorId 必须为非空字符串')
    }
    if (!principalId || typeof principalId !== 'string') {
      throw new TypeError('[ChatEvent] principalId 必须为非空字符串')
    }
    if (!messageId || typeof messageId !== 'string') {
      throw new TypeError('[ChatEvent] messageId 必须为非空字符串')
    }

    // 2. 核心路由与场景标识
    this.requestId = requestId
    this.requestStartTime = requestStartTime
    this.source = source
    this.conversationKind = conversationKind
    this.triggerKind = triggerKind
    this.conversationKey = conversationKey
    this.eventId = eventId || requestId
    this.idempotencyKey = idempotencyKey
    this.instruction = instruction
    this.kind = kind || wakeKind || null
    this.wakeKind = wakeKind || kind || null
    this.originRef = originRef
    this.deliveryMode = deliveryMode
    this.deliveryBindingId = deliveryBindingId
    this.deliveryStatus = 'created'
    this.absorbedByEventId = null
    // 历史归属：'client' = 纯前端 Web（历史在前端 messageChain，服务端不落 Session）；
    // 'server' = 其余全部（Agent Session 后端持久化）。
    // 这个字段取代了原来“拿 event.agentId 是不是空去猜”的承重 null
    // （收敛计划 P1-2）——协议层本来就分得清（llm_message vs agent_message），
    // 不该让事件层靠一个 null 猜。
    this.historyOwnership =
      params.historyOwnership === 'client' ? 'client' : 'server'

    // 3. 身份与多主体解耦
    this.agentId = agentId
    this.actorId = actorId
    this.principalId = principalId
    this.cacheOwnerIds = Array.isArray(cacheOwnerIds) ? cacheOwnerIds : []

    // 维持 user.id === principalId 强不变量
    this.user = {
      id: principalId,
      ip: user?.ip || '127.0.0.1',
      isAdmin: Boolean(user?.isAdmin),
      origin: resolveOrigin(user?.origin),
      role: user?.role || 'user',
    }

    // 4. 会话与实体上下文
    this.sessionId = sessionId
    this.sessionScope = sessionScope
    this.contactorId = contactorId
    this.channelId = channelId
    this.bindingId = bindingId
    this.channelConversationId = channelConversationId
    this.externalConversationId = externalConversationId
    this.externalThreadId = externalThreadId
    this.envelope = envelope
    this.messageId = messageId
    this.member = member
      ? {
          avatar: member.avatar || null,
          id: String(member.id),
          name: member.name || 'Member',
        }
      : null

    // 5. 数据载荷
    this.messages = Array.isArray(messages) ? messages : []
    this.settings = settings && typeof settings === 'object' ? settings : {}
    this.extraMetadata = params.extraMetadata || {}

    // 6. 资源与句柄注入
    this.channel = channel
    this.memory = memory
    this.client = client || createNullClient()
    this.auditContext = auditContext || {
      actorId: this.actorId,
      channelId: this.channelId,
      bindingId: this.bindingId,
      channelConversationId: this.channelConversationId,
      externalConversationId: this.externalConversationId,
      externalThreadId: this.externalThreadId,
      contactorId: this.contactorId,
      principalId: this.principalId,
      sessionId: this.sessionId,
      sourceType: this.source,
    }

    // 7. 生命周期与底层 Adapter 状态追踪
    this.aborted = false
    this.completed = false
    this._abortCallbacks = []
    this._interactions = new Map()
    this._pendingAdjustments = []
    this._adjustmentIdempotencyKeys = new Set()
    this._adjustmentEventIds = new Set()
    this._adjustmentDedupeOrder = []
    this._pendingAdjustmentChars = 0
    this._adjustmentStatusListeners = new Set()
    this._adjustmentCheckpointHook = null
    this._adjustmentCheckpointPromise = null

    // 运行时状态 (Adapter 递归期间赋值)
    this._startTime = null
    this._totalStartTime = requestStartTime
    this._recursionRound = 0
    this._cumulativeUsage = {
      completion_tokens: 0,
      reasoning_tokens: 0,
      total_tokens: 0,
    }
    this._timeMetrics = null
    this.lastChunkType = null
    this.lastUsage = null
  }

  /**
   * 领域对象到数据载荷的透明访问器 (保持存量插件与 Hook 平滑访问 messages/settings)
   * 单例持久引用，确保动态挂载属性（如 extraCachedReasoningContent 等）在生命周期内不丢失
   */
  get body() {
    if (!this._body) {
      const self = this
      this._body = {
        get bindingId() {
          return self.bindingId
        },
        get channel() {
          return self.channelId
        },
        get channelConversationId() {
          return self.channelConversationId
        },
        get channelId() {
          return self.channelId
        },
        get contactorId() {
          return self.contactorId
        },
        get externalConversationId() {
          return self.externalConversationId
        },
        get externalThreadId() {
          return self.externalThreadId
        },
        get messages() {
          return self.messages
        },
        set messages(val) {
          self.messages = val
        },
        get sessionId() {
          return self.sessionId
        },
        get settings() {
          return self.settings
        },
        set settings(val) {
          self.settings = val
        },
      }
    }
    return this._body
  }

  set body(val) {
    if (val && typeof val === 'object') {
      if (val.messages !== undefined) this.messages = val.messages
      if (val.settings !== undefined) this.settings = val.settings
      Object.assign(this.body, val)
    }
  }

  /**
   * 领域对象到元数据的透明访问器 (保持存量工具对 contactorId, memberId 等的平滑读取)
   */
  get metaData() {
    return {
      agentId: this.agentId,
      bindingId: this.bindingId,
      channelConversationId: this.channelConversationId,
      externalConversationId: this.externalConversationId,
      externalThreadId: this.externalThreadId,
      channelId: this.channelId,
      contactorId: this.contactorId,
      isTask: this.triggerKind === 'task',
      memberAvatar: this.member?.avatar || null,
      memberId: this.member?.id || null,
      memberName: this.member?.name || null,
      messageId: this.messageId,
      triggerType:
        this.extraMetadata.triggerType ||
        (this.triggerKind === 'task' ? 'task' : 'chat'),
      ...this.extraMetadata,
    }
  }

  // ---------------------- 核心控制方法 ----------------------

  /**
   * 主动触发中断信号
   */
  abort() {
    if (this.aborted) return
    this.aborted = true
    this._abortCallbacks.forEach((cb) => {
      try {
        cb()
      } catch (err) {
        console.error(
          `[ChatEvent] abort 回调执行异常 (${this.requestId}):`,
          err,
        )
      }
    })
    this.complete()
  }

  /**
   * 注册中断监听函数
   * @param {Function} callback
   */
  onAbort(callback) {
    if (typeof callback !== 'function') return
    if (this.aborted) {
      try {
        callback()
      } catch (err) {
        console.error(
          `[ChatEvent] 注册已中断的 onAbort 回调执行异常 (${this.requestId}):`,
          err,
        )
      }
    } else {
      this._abortCallbacks.push(callback)
    }
  }

  // ---------------------- 交互管理 (二次审批等) ----------------------

  /**
   * 注册人机交互回调
   * @param {string} interactionId
   * @param {Function} callback
   */
  registerInteraction(interactionId, callback) {
    if (!interactionId || typeof callback !== 'function') return
    this._interactions.set(interactionId, callback)
  }

  /**
   * 注销指定交互
   * @param {string} interactionId
   * @returns {boolean}
   */
  unregisterInteraction(interactionId) {
    return this._interactions.delete(interactionId)
  }

  /**
   * 消费并触发交互反馈
   * @param {string} interactionId
   * @param {object} data
   * @returns {boolean}
   */
  emitInteraction(interactionId, data) {
    const callback = this._interactions.get(interactionId)
    if (callback) {
      this._interactions.delete(interactionId)
      try {
        callback(data)
        return true
      } catch (err) {
        console.error(`[ChatEvent] 交互回调执行失败 (${interactionId}):`, err)
        return false
      }
    }
    return false
  }

  // ---------------------- 抽象推流接口 (子类覆写) ----------------------

  update(_chunk) {
    // 基础抽象方法，由各特化子类具体实现推流
  }

  complete() {
    this.completed = true
    this.deliveryStatus = 'finished'
  }

  error(_err) {
    this.completed = true
    this.deliveryStatus = 'finished'
  }

  /**
   * Mark that this event now owns the active model execution.
   * Candidate events absorbed by another event never call this method.
   *
   * @returns {boolean}
   */
  markRunning() {
    if (this.completed || this.aborted) return false
    this.deliveryStatus = 'running'
    return true
  }

  /**
   * Queue an incoming ChatEvent for the next tool-result checkpoint.
   * This only accepts its bounded instruction and identity metadata; it never
   * adopts the incoming event's permissions, output port, or execution state.
   *
   * @param {object} incomingEvent
   * @returns {{status: string}}
   */
  adjust(incomingEvent) {
    if (this.completed || this.aborted) {
      return this._emitAdjustmentStatus('closed', incomingEvent)
    }
    if (this.deliveryStatus !== 'running') {
      setCandidateDeliveryState(incomingEvent, 'deferred')
      return this._emitAdjustmentStatus('defer_to_next_turn', incomingEvent)
    }

    const normalized = this._normalizeAdjustment(incomingEvent)
    if (!normalized || !this._isCompatibleAdjustment(normalized)) {
      return this._emitAdjustmentStatus('incompatible', incomingEvent)
    }

    if (
      normalized.eventId === this.eventId ||
      this._adjustmentIdempotencyKeys.has(normalized.idempotencyKey) ||
      this._adjustmentEventIds.has(normalized.eventId)
    ) {
      return this._emitAdjustmentStatus('duplicate', incomingEvent, normalized)
    }

    if (
      this._pendingAdjustments.length >= MAX_PENDING_ADJUSTMENTS ||
      this._pendingAdjustmentChars + normalized.instruction.length >
        MAX_PENDING_ADJUSTMENT_CHARS
    ) {
      setCandidateDeliveryState(incomingEvent, 'deferred')
      return this._emitAdjustmentStatus(
        'defer_to_next_turn',
        incomingEvent,
        normalized,
      )
    }

    this._adjustmentIdempotencyKeys.add(normalized.idempotencyKey)
    this._adjustmentEventIds.add(normalized.eventId)
    this._adjustmentDedupeOrder.push(normalized)
    if (this._adjustmentDedupeOrder.length > MAX_SEEN_ADJUSTMENTS) {
      const expired = this._adjustmentDedupeOrder.shift()
      this._adjustmentIdempotencyKeys.delete(expired.idempotencyKey)
      this._adjustmentEventIds.delete(expired.eventId)
    }
    this._pendingAdjustments.push(normalized)
    this._pendingAdjustmentChars += normalized.instruction.length
    setCandidateDeliveryState(incomingEvent, 'queued')
    this._emitAdjustmentStatus(
      'accepted_for_checkpoint',
      incomingEvent,
      normalized,
    )
    return { status: 'accepted_for_checkpoint' }
  }

  /**
   * Install an async handler that persists an adjustment batch before it is
   * removed from the in-memory queue. Throwing leaves the batch queued.
   *
   * @param {Function|null} handler
   */
  setAdjustmentCheckpointHook(handler) {
    this._adjustmentCheckpointHook =
      typeof handler === 'function' ? handler : null
  }

  /**
   * Subscribe to adjustment lifecycle updates (for status frames, for example).
   * The returned function unsubscribes the listener.
   *
   * @param {Function} listener
   * @returns {Function}
   */
  onAdjustmentStatus(listener) {
    if (typeof listener !== 'function') return () => {}
    this._adjustmentStatusListeners.add(listener)
    return () => this._adjustmentStatusListeners.delete(listener)
  }

  /**
   * Drain one snapshot of queued work after all tool results have been added.
   * The optional dispatcher hook runs before the queue is consumed.
   *
   * @returns {Promise<object[]>}
   */
  async consumeAdjustmentsAtCheckpoint() {
    if (this._adjustmentCheckpointPromise) {
      return this._adjustmentCheckpointPromise
    }
    if (this.completed || this.aborted || this.deliveryStatus !== 'running') {
      return []
    }

    const batch = this._pendingAdjustments.slice()
    if (batch.length === 0) return []

    this._adjustmentCheckpointPromise = (async () => {
      if (this._adjustmentCheckpointHook) {
        await this._adjustmentCheckpointHook(batch, this)
      }

      if (this.completed || this.aborted || this.deliveryStatus !== 'running') {
        return []
      }

      const stillPending = batch.filter((entry) =>
        this._pendingAdjustments.includes(entry),
      )
      if (stillPending.length === 0) return []

      const consumed = new Set(stillPending)
      this._pendingAdjustments = this._pendingAdjustments.filter(
        (entry) => !consumed.has(entry),
      )
      this._pendingAdjustmentChars -= stillPending.reduce(
        (total, entry) => total + entry.instruction.length,
        0,
      )
      for (const entry of stillPending) {
        setCandidateDeliveryState(entry.event, 'absorbed', this.eventId)
      }
      return stillPending
    })()

    try {
      return await this._adjustmentCheckpointPromise
    } finally {
      this._adjustmentCheckpointPromise = null
    }
  }

  /**
   * Notify the dispatcher after continuation messages have been appended.
   * `anchor` identifies their location in the active event's message history.
   *
   * @param {object[]} batch
   * @param {object} anchor
   */
  notifyAdjustmentsInjected(batch, anchor = {}) {
    for (const entry of batch || []) {
      this._emitAdjustmentStatus('absorbed', entry.event, entry, {
        anchor,
      })
    }
  }

  /**
   * Return queued work for a separate turn when the active event has no more
   * tool checkpoints. Candidates remain their own events and are never run
   * through this event's output lifecycle.
   *
   * @returns {object[]}
   */
  takePendingAdjustments() {
    const pending = this._pendingAdjustments.splice(0)
    this._pendingAdjustmentChars = 0
    for (const entry of pending) {
      setCandidateDeliveryState(entry.event, 'deferred')
      this._emitAdjustmentStatus('defer_to_next_turn', entry.event, entry)
    }
    return pending
  }

  _normalizeAdjustment(incomingEvent) {
    if (!incomingEvent || typeof incomingEvent !== 'object') return null
    const eventId = incomingEvent.eventId
    const instruction = incomingEvent.instruction
    if (
      typeof eventId !== 'string' ||
      !eventId.trim() ||
      typeof instruction !== 'string' ||
      !instruction.trim()
    ) {
      return null
    }

    const idempotencyKey =
      typeof incomingEvent.idempotencyKey === 'string' &&
      incomingEvent.idempotencyKey.trim()
        ? incomingEvent.idempotencyKey
        : eventId

    return {
      event: incomingEvent,
      eventId,
      idempotencyKey,
      instruction,
      kind:
        incomingEvent.kind ||
        incomingEvent.wakeKind ||
        incomingEvent.triggerKind ||
        null,
      wakeKind:
        incomingEvent.wakeKind ||
        incomingEvent.kind ||
        incomingEvent.triggerKind ||
        null,
      originRef: incomingEvent.originRef ?? null,
    }
  }

  _isCompatibleAdjustment(adjustment) {
    const incoming = adjustment.event
    if (
      this.conversationKey &&
      incoming.conversationKey &&
      this.conversationKey !== incoming.conversationKey
    ) {
      return false
    }

    if (
      (this.sessionId || incoming.sessionId) &&
      this.sessionId !== incoming.sessionId
    ) {
      return false
    }
    if (this.agentId && incoming.agentId && this.agentId !== incoming.agentId) {
      return false
    }

    if (
      this.source === 'web' &&
      incoming.source === 'web' &&
      (this.principalId !== incoming.principalId ||
        this.contactorId !== incoming.contactorId)
    ) {
      return false
    }
    return true
  }

  _emitAdjustmentStatus(status, incomingEvent, normalized = null, extra = {}) {
    const eventId = normalized?.eventId || incomingEvent?.eventId || null
    const payload = {
      activeEvent: this,
      eventId,
      incomingEvent,
      status,
      workEventId: eventId,
      ...extra,
    }
    for (const listener of this._adjustmentStatusListeners) {
      try {
        const result = listener(payload)
        if (result && typeof result.catch === 'function') {
          result.catch((error) =>
            console.error(
              `[ChatEvent] adjustment status listener failed (${eventId}):`,
              error,
            ),
          )
        }
      } catch (error) {
        console.error(
          `[ChatEvent] adjustment status listener failed (${eventId}):`,
          error,
        )
      }
    }
    return { status }
  }

  pending() {
    // 抽象排队状态通知
  }

  reply(_chunk) {
    // 抽象单次回复
  }
}

function setCandidateDeliveryState(
  event,
  deliveryStatus,
  absorbedByEventId = null,
) {
  if (!event || typeof event !== 'object') return
  try {
    event.deliveryStatus = deliveryStatus
    if (absorbedByEventId) event.absorbedByEventId = absorbedByEventId
  } catch {
    // Frozen candidate objects can still be processed through the queue record.
  }
}
