/**
 * lib/chat/llm/events/normalizers/TaskNormalizer.js
 * 边界标准化层：将后台异步任务入参标准化为规范事件入参
 */

import {
  CONVERSATION_KIND,
  EVENT_SOURCE,
  TRIGGER_KIND,
} from '../constants.js'

export const TaskNormalizer = {
  /**
   * @param {object} param0
   * @param {string} param0.taskId
   * @param {number} [param0.executionId]
   * @param {string} param0.contactorId
   * @param {string} [param0.userId]
   * @param {string} [param0.messageId]
   * @param {Array<object>} param0.messages
   * @param {object} param0.settings
   * @param {object} [param0.client]
   * @returns {object}
   */
  normalize({
    client = null,
    contactorId,
    executionId = null,
    messageId,
    messages = [],
    settings = {},
    taskId,
    userId = 'system_task',
  }) {
    if (!taskId) {
      throw new TypeError('[TaskNormalizer] taskId 必须非空')
    }
    const safeMessageId = String(messageId || Date.now())
    const requestId = `${taskId}-${safeMessageId}`

    return {
      actorId: `task:${taskId}`,
      auditContext: {
        actorId: `task:${taskId}`,
        channelId: null,
        contactorId: contactorId || null,
        principalId: String(userId),
        sessionId: null,
        sourceType: EVENT_SOURCE.WEB, // 内部任务审计归属
      },
      cacheOwnerIds: client?.id ? [client.id] : [],
      channel: null,
      channelId: null,
      client,
      contactorId: contactorId || null,
      conversationKind: CONVERSATION_KIND.DIRECT,
      executionId,
      member: null,
      memory: null,
      messageId: safeMessageId,
      messages,
      principalId: String(userId),
      requestId,
      requestStartTime: Date.now(),
      sessionId: null,
      settings,
      source: EVENT_SOURCE.WEB,
      taskId,
      triggerKind: TRIGGER_KIND.TASK,
      user: {
        id: String(userId),
        ip: '127.0.0.1',
        isAdmin: true,
        origin: 'task',
        role: 'admin',
      },
    }
  },
}
