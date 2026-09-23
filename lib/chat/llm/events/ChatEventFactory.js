/**
 * lib/chat/llm/events/ChatEventFactory.js
 * 核心工厂类：强不变量断言与标准领域事件实例化
 */

import { EVENT_SOURCE } from './constants.js'
import { WebChatEvent } from './subtypes/WebChatEvent.js'
import { ChannelChatEvent } from './subtypes/ChannelChatEvent.js'
import { TaskChatEvent } from './subtypes/TaskChatEvent.js'
import { ProxyChatEvent } from './subtypes/ProxyChatEvent.js'
import { InternalChatEvent } from './subtypes/InternalChatEvent.js'
import { ChatEvent } from './ChatEvent.js'

import { WebNormalizer } from './normalizers/WebNormalizer.js'
import { ChannelNormalizer } from './normalizers/ChannelNormalizer.js'
import { TaskNormalizer } from './normalizers/TaskNormalizer.js'
import { ProxyNormalizer } from './normalizers/ProxyNormalizer.js'
import { InternalNormalizer } from './normalizers/InternalNormalizer.js'

export const ChatEventFactory = {
  /**
   * 核心工厂基础方法：只接收已规范化的参数对象，断言不变量并实例化
   * @param {object} canonicalParams 经过 Normalizer 处理的规范参数
   * @returns {ChatEvent}
   */
  create(canonicalParams) {
    if (!canonicalParams || typeof canonicalParams !== 'object') {
      throw new TypeError('[ChatEventFactory] canonicalParams 必须为非空对象')
    }

    const { source } = canonicalParams

    switch (source) {
      case EVENT_SOURCE.WEB:
        if (canonicalParams.triggerKind === 'task') {
          return new TaskChatEvent(canonicalParams)
        }
        return new WebChatEvent(canonicalParams)

      case EVENT_SOURCE.CHANNEL:
        return new ChannelChatEvent(canonicalParams)

      case EVENT_SOURCE.PROXY:
        return new ProxyChatEvent(canonicalParams)

      case EVENT_SOURCE.INTERNAL:
        return new InternalChatEvent(canonicalParams)

      default:
        throw new TypeError(
          `[ChatEventFactory] 不支持的 source 类型: "${source}"`,
        )
    }
  },

  // ---------------- 便捷工厂方法 (自带对应 Normalizer) ----------------

  /**
   * 构造 Web 侧 Socket.IO 对话事件
   */
  createForWeb({ req, client }) {
    const canonical = WebNormalizer.normalize({ client, req })
    return new WebChatEvent(canonical)
  },

  /**
   * 构造外部渠道 (微信、飞书等) 对话事件
   */
  createForChannel({ ctx, messages, settings }) {
    const canonical = ChannelNormalizer.normalize({ ctx, messages, settings })
    return new ChannelChatEvent(canonical)
  },

  /**
   * 构造后台自动化任务事件
   */
  createForTask(taskOptions) {
    const canonical = TaskNormalizer.normalize(taskOptions)
    return new TaskChatEvent(canonical)
  },

  /**
   * 构造 HTTP API 代理事件
   */
  createForProxy(proxyOptions) {
    const canonical = ProxyNormalizer.normalize(proxyOptions)
    return new ProxyChatEvent(canonical)
  },

  /**
   * 构造系统内部轻量级任务事件
   */
  createInternal(internalOptions) {
    const canonical = InternalNormalizer.normalize(internalOptions)
    return new InternalChatEvent(canonical)
  },

  createForInternal(internalOptions) {
    return ChatEventFactory.createInternal(internalOptions)
  },

  /**
   * 构造专门用于单元测试的 Mock 事件
   */
  createMock(overrides = {}) {
    const defaultParams = {
      agentId: null,
      actorId: 'test:mock_actor',
      cacheOwnerIds: [],
      channel: null,
      channelId: null,
      client: null,
      contactorId: 'mock_contactor',
      conversationKind: 'direct',
      member: null,
      memory: null,
      messageId: `mock_msg_${Date.now()}`,
      messages: [{ content: 'hello', role: 'user' }],
      principalId: 'test_principal',
      requestId: `mock_req_${Date.now()}`,
      requestStartTime: Date.now(),
      sessionId: 'mock_session',
      settings: { base: { model: 'mock-model', stream: false } },
      source: 'web',
      triggerKind: 'interactive',
      user: {
        id: 'test_principal',
        ip: '127.0.0.1',
        isAdmin: true,
        origin: 'web',
        role: 'admin',
      },
      ...overrides,
    }
    return new ChatEvent(defaultParams)
  }
}
