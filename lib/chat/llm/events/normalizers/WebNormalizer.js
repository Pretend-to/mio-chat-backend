/**
 * lib/chat/llm/events/normalizers/WebNormalizer.js
 * 边界标准化层：将 Web Socket.IO 原始输入标准化为规范事件入参
 */

import {
  CONVERSATION_KIND,
  EVENT_SOURCE,
  TRIGGER_KIND,
} from '../constants.js'
import { resolveOrigin } from '../../../../../utils/origin.js'

export const WebNormalizer = {
  /**
   * 将 Web Socket 请求包标准化为创建 WebChatEvent 所需的规范参数
   * @param {object} param0
   * @param {object} param0.req 前端发来的完整 socket 请求包 { request_id, type, data, metaData }
   * @param {object} param0.client 后端 Socket.io 客户端包装实例
   * @returns {object} 规范化参数对象
   */
  normalize({ req, client }) {
    if (!req || typeof req !== 'object') {
      throw new TypeError('[WebNormalizer] req 必须为非空对象')
    }
    if (!client || typeof client !== 'object') {
      throw new TypeError('[WebNormalizer] client 必须为非空对象')
    }

    const data = req.data || {}
    const rawMeta = req.metaData ? { ...req.metaData } : { ...data.metaData }

    const isGroup = Boolean(rawMeta.memberId)
    const conversationKind = isGroup
      ? CONVERSATION_KIND.GROUP
      : CONVERSATION_KIND.DIRECT

    const isTask = Boolean(rawMeta.isTask || rawMeta.triggerType === 'task')
    const triggerKind = isTask ? TRIGGER_KIND.TASK : TRIGGER_KIND.INTERACTIVE

    const clientId = String(client.id || 'anonymous_web_client')
    const messageId = String(rawMeta.messageId || req.request_id || Date.now())
    const contactorId = rawMeta.contactorId ? String(rawMeta.contactorId) : null

    const member = isGroup
      ? {
          avatar: rawMeta.memberAvatar || null,
          id: String(rawMeta.memberId),
          name: rawMeta.memberName || 'Agent',
        }
      : null

    return {
      actorId: `web:${clientId}`,
      cacheOwnerIds: [clientId],
      channel: null,
      channelId: null,
      client,
      contactorId,
      conversationKind,
      extraMetadata: rawMeta,
      // 纯前端 Web：历史由前端持有，服务端不落 Agent Session，因此不参与 Session 租约，
      // 它的被吸收工作也在启动/失败时由 dispatcher 自行收口（见 dispatcher.submit）。
      historyOwnership: 'client',
      member,
      messageId,
      messages: Array.isArray(data.messages) ? data.messages : [],
      principalId: clientId,
      requestId: String(req.request_id || messageId),
      requestStartTime: Date.now(),
      sessionId: req.sessionId || data.sessionId || null,
      settings: data.settings || {},
      source: EVENT_SOURCE.WEB,
      triggerKind,
      user: {
        id: clientId,
        ip: client.ip || '127.0.0.1',
        isAdmin: Boolean(client.isAdmin),
        origin: resolveOrigin(client.origin),
        role: client.isAdmin ? 'admin' : 'user',
      },
    }
  }
}
