// Keep message text and schemas intact while removing transport credentials and
// embedded binary data. Snapshots must not share references with recursive turns.
const CREDENTIAL_KEY =
  /^(authorization|proxy-authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)$/i

export function snapshotRequestBody(body) {
  const ancestors = new WeakSet()
  function visit(value, key = '', inlineBinary = false) {
    if (typeof value === 'string') {
      if (CREDENTIAL_KEY.test(key)) return '[REDACTED]'
      if (/^data:[^,]*;base64,/i.test(value)) return '[inline binary omitted]'
      if (inlineBinary) {
        return '[inline binary omitted]'
      }
      return value.replace(
        /([?&](?:key|api_key|access_token|token)=)[^&#\s]+/gi,
        '$1[REDACTED]',
      )
    }
    if (value === null || typeof value !== 'object') {
      return typeof value === 'bigint' ? String(value) : value
    }
    if (ancestors.has(value)) return '[Circular]'
    ancestors.add(value)
    const result = Array.isArray(value)
      ? value.map((item) => visit(item))
      : Object.fromEntries(
          Object.entries(value).map(([name, item]) => [
            name,
            visit(
              item,
              name,
              name === 'data' && ('mimeType' in value || 'mime_type' in value),
            ),
          ]),
        )
    ancestors.delete(value)
    return result
  }
  try {
    return JSON.parse(JSON.stringify(visit(body)))
  } catch (error) {
    return { captureError: error.message }
  }
}

export function captureUpstreamRequest(event, body) {
  if (!event) return
  event._requestDiagnostics ||= { round: event._recursionRound || 1 }
  event._requestDiagnostics.upstreamBody = snapshotRequestBody(body)
  if (process.env.LLM_DEBUG_REQUEST_BODY === '1') {
    logger.info(
      `[LLMRequestBody] requestId=${event.requestId} round=${event._recursionRound || 1} stage=upstream ${JSON.stringify(event._requestDiagnostics.upstreamBody)}`,
    )
  }
}
