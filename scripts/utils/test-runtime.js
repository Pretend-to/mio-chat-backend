import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export function normalizeBaseUrl(value) {
  if (!value || typeof value !== 'string') return null
  const candidate = value.trim()
  if (!candidate) return null
  try {
    const url = new URL(candidate.includes('://') ? candidate : `http://${candidate}`)
    url.pathname = ''
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

export function candidateUrls({ configured = null, env = process.env, listeningPorts = [] } = {}) {
  const candidates = []
  const add = value => {
    const normalized = normalizeBaseUrl(value)
    if (normalized && !candidates.includes(normalized)) candidates.push(normalized)
  }

  add(env.BASE_URL)
  if (env.PORT) add(`http://127.0.0.1:${env.PORT}`)

  if (configured?.port) {
    const configuredHost = configured.host && !['0.0.0.0', '::'].includes(configured.host)
      ? configured.host
      : '127.0.0.1'
    add(`http://${configuredHost}:${configured.port}`)
  }

  for (const port of listeningPorts) add(`http://127.0.0.1:${port}`)
  return candidates
}

export async function listListeningPorts() {
  const commands = process.platform === 'win32'
    ? [['netstat', ['-ano', '-p', 'tcp']]]
    : [
        ['lsof', ['-nP', '-iTCP', '-sTCP:LISTEN']],
        ['ss', ['-ltn']],
      ]

  for (const [command, args] of commands) {
    try {
      const { stdout } = await execFileAsync(command, args, { maxBuffer: 1024 * 1024 })
      const ports = [...stdout.matchAll(/(?:\]|\d|\*):([1-9]\d{0,4})(?=\s|$)/g)]
        .map(match => Number(match[1]))
        .filter(port => port <= 65535)
      if (ports.length) return [...new Set(ports)]
    } catch {
      // Try the next platform-compatible listener inventory command.
    }
  }
  return []
}

export async function probeMioChat(baseUrl, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(`${baseUrl}/api/gateway`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(1200),
    })
    if (!response.ok) return false
    const payload = await response.json()
    return payload?.data?.name === 'mio-chat-backend'
  } catch {
    return false
  }
}

export async function readLocalRuntimeSettings() {
  const [{ default: prismaManager }, { default: SystemSettingsService }] = await Promise.all([
    import('../../lib/database/prisma.js'),
    import('../../lib/database/services/SystemSettingsService.js'),
  ])

  try {
    await prismaManager.initialize()
    await SystemSettingsService.initialize()
    const [server, serverPort, adminCode] = await Promise.all([
      SystemSettingsService.get('server'),
      SystemSettingsService.get('server_port'),
      SystemSettingsService.get('admin_code'),
    ])
    return {
      adminCode: adminCode?.value || null,
      server: {
        ...server?.value,
        port: serverPort?.value || server?.value?.port,
      },
    }
  } finally {
    await prismaManager.disconnect()
  }
}

export async function discoverTestRuntime({
  env = process.env,
  listPorts = listListeningPorts,
  probe = probeMioChat,
  readSettings = readLocalRuntimeSettings,
} = {}) {
  let localSettings = { adminCode: null, server: null }
  try {
    localSettings = await readSettings()
  } catch {
    // Explicit environment variables and socket discovery still work without DB access.
  }

  const urls = candidateUrls({
    configured: localSettings.server,
    env,
    listeningPorts: await listPorts(),
  })
  const baseUrl = (await Promise.all(urls.map(async url => [url, await probe(url)])))
    .find(([, available]) => available)?.[0] || null

  return {
    adminCode: env.ADMIN_CODE || localSettings.adminCode || null,
    baseUrl,
    candidates: urls,
  }
}
