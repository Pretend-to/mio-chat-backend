/**
 * lib/chat/llm/events/ChatEvent.js
 * 统一领域模型：ChatEvent 核心基类
 */

import { assertValidSceneDimensions } from './constants.js'
import { resolveOrigin } from '../../../../utils/origin.js'

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
      client = null,
      contactorId = null,
      conversationKind,
      member = null,
      memory = null,
      messageId,
      messages = [],
      principalId,
      requestId,
      requestStartTime = Date.now(),
      sessionScope = null,
      settings = {},
      sessionId = null,
      source,
      triggerKind,
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
   */
  get body() {
    return {
      channel: this.channelId,
      channelId: this.channelId,
      contactorId: this.contactorId,
      messages: this.messages,
      sessionId: this.sessionId,
      settings: this.settings,
    }
  }

  /**
   * 领域对象到元数据的透明访问器 (保持存量工具对 contactorId, memberId 等的平滑读取)
   */
  get metaData() {
    return {
      agentId: this.agentId,
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
  }

  error(_err) {
    this.completed = true
  }

  pending() {
    // 抽象排队状态通知
  }

  reply(_chunk) {
    // 抽象单次回复
  }
}
