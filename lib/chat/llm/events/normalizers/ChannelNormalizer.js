/**
 * lib/chat/llm/events/normalizers/ChannelNormalizer.js
 * 边界标准化层：将外部渠道 (微信、飞书、钉钉等) 消息上下文标准化为规范事件入参
 */

import { CONVERSATION_KIND, EVENT_SOURCE, TRIGGER_KIND } from '../constants.js'
import { resolveOrigin } from '../../../../../utils/origin.js'

export const ChannelNormalizer = {
  /**
   * 将渠道上下文与组装好的消息/设置转换为创建 ChannelChatEvent 的规范入参
   * @param {object} param0
   * @param {object} param0.ctx 渠道原始上下文 (BaseChannel 传入)
   * @param {Array<object>} param0.messages 渠道拼接完成的 messages 列表
   * @param {object} param0.settings 渠道组装完成的 settings 配置
   * @returns {object} 规范化参数对象
   */
  normalize({ ctx, messages, settings }) {
    if (!ctx || typeof ctx !== 'object') {
      throw new TypeError('[ChannelNormalizer] ctx 必须为非空对象')
    }

    const channelType = ctx.channel?.channelType || 'channel'
    const isGroup = Boolean(ctx.isGroup || ctx.groupId)
    const conversationKind = isGroup
      ? CONVERSATION_KIND.GROUP
      : CONVERSATION_KIND.DIRECT

    const isTask = Boolean(ctx.isTask)
    const triggerKind = isTask ? TRIGGER_KIND.TASK : TRIGGER_KIND.INTERACTIVE

    const rawUser = String(
      ctx.from || ctx.userId || ctx.senderId || 'channel_user',
    )
    const actorId = `${channelType}:${rawUser}`

    const channelId =
      ctx.channelId ||
      ctx.channel?.id ||
      ctx.channel?.channelId ||
      ctx.agentId ||
      null
    // The UI conversation identity is always the Agent. A physical Channel is
    // only transport metadata and must never become a contact/conversation.
    const contactorId = ctx.agentId ? String(ctx.agentId) : channelId
    const resolvedPrincipalId =
      ctx.principal?.id || `channel:${channelId || channelType}:${rawUser}`
    const sessionId = ctx.sessionId ? String(ctx.sessionId) : null
    const messageId = String(ctx.messageId || `${channelType}-${Date.now()}`)
    const requestId = `${channelType}_${sessionId || Date.now()}_${Date.now()}`

    const cacheOwnerIds = ['admin']
    if (ctx.webClient?.id && ctx.webClient.id !== 'admin') {
      cacheOwnerIds.push(ctx.webClient.id)
    }

    return {
      agentId: ctx.agentId ? String(ctx.agentId) : null,
      actorId,
      auditContext: {
        actorId,
        channelId,
        contactorId,
        principalId: resolvedPrincipalId,
        sessionId,
        sourceType: EVENT_SOURCE.CHANNEL,
      },
      cacheOwnerIds,
      channel: ctx.channel || null,
      channelContext: ctx,
      channelId,
      client: null, // 将使用 Null Object Client
      contactorId,
      conversationKind,
      member: isGroup
        ? {
            avatar: null,
            id: rawUser,
            name: ctx.senderName || 'ChannelMember',
          }
        : null,
      memory: ctx.memory || null,
      messageId,
      messages: Array.isArray(messages) ? messages : [],
      principalId: resolvedPrincipalId,
      requestId,
      requestStartTime: ctx.messageTime || Date.now(),
      sessionId,
      sessionScope: ctx.sessionScope || null,
      settings: settings || {},
      source: EVENT_SOURCE.CHANNEL,
      triggerKind,
      user: {
        id: resolvedPrincipalId,
        ip: '127.0.0.1',
        isAdmin: ctx.principal?.isAdmin === true,
        origin: resolveOrigin(ctx.origin || ctx.webClient?.origin),
        role: ctx.principal?.role || 'user',
      },
    }
  }
}
