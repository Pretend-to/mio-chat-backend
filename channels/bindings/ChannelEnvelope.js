import { DomainError } from '../../lib/agents/AgentService.js'
import { ensureMessageTime } from '../../lib/chat/messageTimestamp.js'

const requiredText = (value, field) => {
  const text = value == null ? '' : String(value).trim()
  if (!text) {
    throw new DomainError(
      'invalid_channel_envelope',
      `Channel inbound envelope requires ${field}`,
      422,
    )
  }
  return text
}

/** Normalize every adapter payload before routing, persistence, or prompting. */
export function normalizeChannelEnvelope(input = {}) {
  const source = input.source || {}
  const conversation = input.conversation || {}
  const actor = input.actor || {}
  const message = input.message || {}
  const content = input.content || {}
  const conversationType = requiredText(
    conversation.type,
    'conversation.type',
  )
  if (!['private', 'group'].includes(conversationType)) {
    throw new DomainError(
      'invalid_channel_envelope',
      'conversation.type must be private or group',
      422,
    )
  }
  const sentAt = ensureMessageTime(message.sentAt, message.receivedAt)
  const receivedAt = ensureMessageTime(message.receivedAt)
  return {
    actor: {
      displayName: actor.displayName == null ? null : String(actor.displayName),
      externalUserId: requiredText(actor.externalUserId, 'actor.externalUserId'),
      role: actor.role == null ? null : String(actor.role),
    },
    content: {
      files: Array.isArray(content.files) ? content.files : [],
      images: Array.isArray(content.images) ? content.images : [],
      mentions: Array.isArray(content.mentions) ? content.mentions : [],
      text: content.text == null ? '' : String(content.text),
    },
    conversation: {
      externalConversationId: requiredText(
        conversation.externalConversationId,
        'conversation.externalConversationId',
      ),
      externalThreadId: conversation.externalThreadId == null
        ? null
        : String(conversation.externalThreadId),
      type: conversationType,
    },
    message: {
      externalMessageId: requiredText(
        message.externalMessageId,
        'message.externalMessageId',
      ),
      receivedAt,
      replyToMessageId: message.replyToMessageId == null
        ? null
        : String(message.replyToMessageId),
      sentAt,
    },
    raw: input.raw,
    source: {
      accountId: source.accountId == null ? null : String(source.accountId),
      adapterId: requiredText(source.adapterId, 'source.adapterId'),
      channelId: requiredText(source.channelId, 'source.channelId'),
      channelName: source.channelName == null ? null : String(source.channelName),
    },
    version: 2,
  }
}

export function channelEnvelopeMetadata(envelope) {
  const normalized = normalizeChannelEnvelope(envelope)
  const { raw: _raw, ...safe } = normalized
  return safe
}
