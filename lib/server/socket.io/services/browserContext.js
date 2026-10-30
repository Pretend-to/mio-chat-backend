/** Browser claims describe environment, never establish authorization. */
export function describeBrowser(client) {
  const handshake = client?.socket?.handshake || {}
  const claims = handshake.auth?.browserContext || {}
  const ua = String(handshake.headers?.['user-agent'] || '')
  const match =
    ua.match(/(Edg)\/([\d.]+)/) ||
    ua.match(/(Firefox|Chrome|Version)\/([\d.]+)/)
  const names = { Edg: 'Edge', Version: 'Safari' }
  return {
    id: String(claims.id || client?.socket?.id || '').slice(0, 160),
    userAgent: ua.slice(0, 2048),
    browser: match ? `${names[match[1]] || match[1]} ${match[2]}` : 'unknown',
    os: /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad/.test(ua)
        ? 'iOS'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Macintosh/.test(ua)
            ? 'macOS'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'unknown',
    deviceType: /iPad|Tablet/.test(ua)
      ? 'tablet'
      : /Mobile|iPhone|Android/.test(ua)
        ? 'mobile'
        : 'desktop',
    timezone:
      typeof claims.timezone === 'string'
        ? claims.timezone.slice(0, 100)
        : null,
    locale:
      typeof claims.locale === 'string' ? claims.locale.slice(0, 100) : null,
    origin: client?.origin || handshake.headers?.origin || null,
  }
}

export function buildWebMessageEnvelope(
  client,
  { sessionId, messageId, kind = 'message' },
) {
  const now = Date.now()
  return {
    version: 3,
    kind,
    source: { channelId: 'web-default', adapterId: 'web', channelName: 'Web' },
    conversation: { externalConversationId: sessionId, type: 'private' },
    actor: { externalUserId: String(client.id) },
    message: { externalMessageId: messageId, sentAt: now, receivedAt: now },
    client: describeBrowser(client),
    network: { ip: client.ip || null },
  }
}
