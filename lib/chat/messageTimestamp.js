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
  return time ? new Date(time).toISOString() : null
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
