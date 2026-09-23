/**
 * Source-independent message timestamp helpers.
 *
 * Message timestamps are generated once by the common channel pipeline and
 * persisted as epoch milliseconds. The LLM layer may then derive a stable
 * ISO envelope from that value without mutating the persisted message body.
 */

export function normalizeMessageTime(value) {
  if (value instanceof Date) {
    const time = value.getTime()
    return Number.isFinite(time) && time > 0 ? Math.trunc(time) : null
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.trunc(value) : null
  }

  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value)
    if (Number.isFinite(numeric) && numeric > 0) return Math.trunc(numeric)

    const parsed = Date.parse(value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }

  return null
}
/** Generate or preserve a canonical server-side message timestamp. */
export function ensureMessageTime(value, fallback = Date.now()) {
  return normalizeMessageTime(value) || normalizeMessageTime(fallback) || Date.now()
}

export function formatMessageTime(value) {
  const time = normalizeMessageTime(value)
  if (!time) return null

  const d = new Date(time)
  const pad = (n) => String(n).padStart(2, '0')
  const pad3 = (n) => String(n).padStart(3, '0')

  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())
  const seconds = pad(d.getSeconds())
  const ms = pad3(d.getMilliseconds())

  const offsetMinutes = -d.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absOffset = Math.abs(offsetMinutes)
  const offsetHours = pad(Math.floor(absOffset / 60))
  const offsetMins = pad(absOffset % 60)
  const timezone = `${sign}${offsetHours}:${offsetMins}`

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}${timezone}`
}

/**
 * Wrap user text for an LLM request only. The source message is never mutated.
 */
export function wrapUserMessageWithTimestamp(text, time) {
  if (typeof text !== 'string' || !text.trim()) return text

  const iso = formatMessageTime(time)
  if (!iso) return text

  // Avoid double wrapping when an internal caller already supplied the
  // canonical envelope.
  if (/^\s*<message\s+time="[^"\n]+">/.test(text)) return text

  return `<message time="${iso}">\n${text}\n</message>`
}

const escapeAttribute = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('\n', '&#10;')
  .replaceAll('\r', '&#13;')

/** Project a safe allowlist from the canonical envelope into model-visible text. */
export function wrapUserMessageWithMetadata(text, time, envelope = null) {
  if (!envelope) return wrapUserMessageWithTimestamp(text, time)
  if (typeof text !== 'string' || !text.trim()) return text
  if (/^\s*<message\s+version="2"/.test(text)) return text
  const iso = formatMessageTime(time || envelope.message?.sentAt)
  if (!iso) return text
  const attributes = {
    version: 2,
    channel: envelope.source?.channelName || envelope.source?.adapterId,
    conversation_id: envelope.conversation?.externalConversationId,
    conversation_type: envelope.conversation?.type,
    message_id: envelope.message?.externalMessageId,
    source: envelope.source?.adapterId,
    time: iso,
    user_id: envelope.actor?.externalUserId,
    user_name: envelope.actor?.displayName,
  }
  const serialized = Object.entries(attributes)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}="${escapeAttribute(value)}"`)
    .join(' ')
  return `<message ${serialized}>\n${text}\n</message>`
}
