/**
 * lib/chat/llm/events/normalizers/InternalNormalizer.js
 * 边界标准化层：将内部单次任务 (如标题生成、摘要) 标准化为规范事件入参
 */

import {
  CONVERSATION_KIND,
  EVENT_SOURCE,
  TRIGGER_KIND,
} from '../constants.js'

export const InternalNormalizer = {
  /**
   * @param {object} param0
   * @param {string} [param0.requestId]
   * @param {string} [param0.model]
   * @param {Array<object>} [param0.messages]
   * @param {object} [param0.settings]
   * @param {object} [param0.chatParams]
   * @param {object} [param0.extraSettings]
   * @param {boolean} [param0.stream]
   * @param {Function} [param0.onContent]
   * @param {Function} [param0.onComplete]
   * @returns {object}
   */
  normalize({
    chatParams,
    extraSettings,
    messages = [],
    model = 'default',
    onComplete,
    onContent,
    requestId,
    settings,
    stream = false,
  }) {
    const id = requestId || `internal-${Date.now()}`
    const finalSettings = settings || {
      base: {
        model,
        stream,
      },
      chatParams: chatParams || {
        reasoning_effort: 0,
      },
      extraSettings: extraSettings || {},
      toolCallSettings: {
        mode: 'NONE',
      },
    }

    return {
      actorId: 'system:internal_task',
      auditContext: {
        actorId: 'system:internal_task',
        channelId: null,
        contactorId: null,
        principalId: 'system',
        sessionId: null,
        sourceType: EVENT_SOURCE.INTERNAL,
      },
      cacheOwnerIds: [],
      channel: null,
      channelId: null,
      client: null,
      contactorId: null,
      conversationKind: CONVERSATION_KIND.NONE,
      member: null,
      memory: null,
      messageId: id,
      messages,
      onComplete,
      onContent,
      principalId: 'system',
      requestId: id,
      requestStartTime: Date.now(),
      sessionId: null,
      settings: finalSettings,
      source: EVENT_SOURCE.INTERNAL,
      triggerKind: TRIGGER_KIND.SYSTEM,
      user: {
        id: 'system',
        ip: '127.0.0.1',
        isAdmin: true,
        origin: 'system',
        role: 'admin',
      },
    }
  },
}
