import { ensureMessageTime } from './messageTimestamp.js'

const attr = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\n', '&#10;')
    .replaceAll('\r', '&#13;')
const tag = (name, fields) => {
  const values = Object.entries(fields).filter(([, v]) => v != null && v !== '')
  return values.length
    ? `  <${name} ${values.map(([k, v]) => `${k}="${attr(v)}"`).join(' ')} />`
    : ''
}

/** One immutable origin snapshot for Web, adapters, tasks and checkpoints. */
export function buildMessageContext(ctx = {}, kind = null) {
  const envelope = ctx.envelope || {}
  const time = ensureMessageTime(ctx.messageTime || envelope.message?.sentAt)
  return {
    ...envelope,
    version: 3,
    kind: kind || (ctx.isTask || ctx.isWake ? 'task' : 'message'),
    source: envelope.source || {
      channelId: ctx.isWeb ? 'web-default' : ctx.source || 'system',
      adapterId: ctx.isWeb ? 'web' : ctx.source || 'system',
    },
    conversation: envelope.conversation || {
      externalConversationId: ctx.sessionId || ctx.sid || 'runtime',
      type: 'private',
    },
    actor: envelope.actor || {
      externalUserId: ctx.principal?.externalUserId || ctx.from || 'system',
      displayName: ctx.senderName,
    },
    message: {
      ...envelope.message,
      externalMessageId:
        envelope.message?.externalMessageId ||
        ctx.userMessageId ||
        ctx.eventId ||
        ctx.messageId ||
        `input_${time}`,
      sentAt: time,
      receivedAt: envelope.message?.receivedAt || time,
    },
  }
}

/** Render only allowlisted metadata; user text cannot forge the outer tags. */
export function renderMessageContext(text, time, envelope) {
  if (typeof text !== 'string') return text
  const e = buildMessageContext({ envelope, messageTime: time }, envelope?.kind)
  const source = e.source || {},
    conversation = e.conversation || {}
  const actor = e.actor || {},
    message = e.message || {},
    client = e.client || {}
  return [
    `<message version="3" kind="${attr(e.kind)}">`,
    tag('source', {
      channel_id: source.channelId,
      channel_type: source.adapterId,
      channel_name: source.channelName,
    }),
    tag('conversation', {
      id: conversation.externalConversationId,
      type: conversation.type,
      thread_id: conversation.externalThreadId,
    }),
    tag('actor', { id: actor.externalUserId, name: actor.displayName }),
    tag('time', {
      sent_at: new Date(message.sentAt).toISOString(),
      received_at: new Date(
        ensureMessageTime(message.receivedAt, message.sentAt),
      ).toISOString(),
    }),
    tag('identity', {
      message_id: message.externalMessageId,
      reply_to_message_id: message.replyToMessageId,
    }),
    tag('client', {
      id: client.id,
      browser: client.browser,
      os: client.os,
      device_type: client.deviceType,
      timezone: client.timezone,
      locale: client.locale,
      origin: client.origin,
    }),
    tag('network', { ip: e.network?.ip }),
    `  <body>\n${text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}\n  </body>`,
    '</message>',
  ]
    .filter(Boolean)
    .join('\n')
}
