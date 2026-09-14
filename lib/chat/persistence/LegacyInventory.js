import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const UTF8 = 'utf8'

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/')
}

function classify(relativePath) {
  if (/^memory\/agents\/[^/]+\/soul\.md$/.test(relativePath)) return 'agent_soul'
  if (/^memory\/agents\/[^/]+\/active$/.test(relativePath)) return 'agent_active'
  if (/^memory\/agents\/[^/]+\/meta\.json$/.test(relativePath)) return 'agent_meta'
  if (/^memory\/agents\/[^/]+\/global\/[^/]+\.md$/.test(relativePath)) return 'global_memory'
  if (/^memory\/agents\/[^/]+\/sessions\/[^/]+\.json$/.test(relativePath)) return 'session'
  if (/^memory\/agents\/[^/]+\/archives\/[^/]+\/[^/]+\.json$/.test(relativePath)) return 'session_archive'
  if (relativePath === 'channels-data/channels.json') return 'channels'
  if (relativePath === 'channels-data/triggers/triggers.json') return 'triggers'
  if (relativePath === 'channels-data/triggers/executions.json') return 'trigger_executions'
  if (/^channels-data\/triggers\/scripts\/[^/]+$/.test(relativePath)) return 'trigger_script'
  return 'unknown'
}

function isJsonKind(kind) {
  return [
    'agent_meta',
    'channels',
    'session',
    'session_archive',
    'trigger_executions',
    'triggers',
  ].includes(kind)
}

function extractIds(relativePath, parsed) {
  const parts = relativePath.split('/')
  const agentId = parts[0] === 'memory' && parts[1] === 'agents' ? parts[2] : null
  let sessionId = null
  if (parts[3] === 'sessions') sessionId = parsed?.id || parts[4]?.replace(/\.json$/, '')
  if (parts[3] === 'archives') sessionId = parsed?.sessionId || parts[4]
  return { agentId, sessionId }
}

function pathSessionId(relativePath) {
  const parts = relativePath.split('/')
  if (parts[3] === 'sessions') return parts[4]?.replace(/\.json$/, '') || null
  if (parts[3] === 'archives') return parts[4] || null
  return null
}

async function walkFiles(root) {
  const found = []
  async function walk(current) {
    let entries = []
    try {
      entries = await fs.promises.readdir(current, { withFileTypes: true })
    } catch (error) {
      if (error.code === 'ENOENT') return
      throw error
    }

    entries.sort((a, b) => a.name.localeCompare(b.name))
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)
      if (entry.isSymbolicLink()) {
        found.push({ fullPath, isSymlink: true })
      } else if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.isFile()) {
        found.push({ fullPath, isSymlink: false })
      }
    }
  }
  await walk(root)
  return found
}

/**
 * Build a deterministic, content-addressed inventory without exposing file
 * contents in logs. Unknown files and parse errors are blockers by design.
 */
export async function buildLegacyInventory({ rootDir = process.cwd() } = {}) {
  const roots = [path.join(rootDir, 'memory'), path.join(rootDir, 'channels-data')]
  const discovered = []
  for (const root of roots) discovered.push(...await walkFiles(root))

  const files = []
  for (const item of discovered) {
    const relativePath = toPosix(path.relative(rootDir, item.fullPath))
    const kind = classify(relativePath)
    const record = {
      agentId: null,
      error: null,
      fullPath: item.fullPath,
      kind,
      mode: null,
      parsed: null,
      relativePath,
      sessionId: null,
      sha256: null,
      sizeBytes: 0,
      status: 'ready',
    }

    if (item.isSymlink) {
      record.error = 'Symbolic links are not allowed in legacy storage roots'
      record.status = 'blocked'
      files.push(record)
      continue
    }

    const stat = await fs.promises.stat(item.fullPath)
    const bytes = await fs.promises.readFile(item.fullPath)
    record.mode = stat.mode & 0o777
    record.sha256 = sha256(bytes)
    record.sizeBytes = bytes.length

    if (kind === 'unknown') {
      record.error = 'Unrecognized file in legacy storage root'
      record.status = 'blocked'
    } else if (isJsonKind(kind)) {
      try {
        record.parsed = JSON.parse(bytes.toString(UTF8))
      } catch (error) {
        record.error = `Invalid JSON: ${error.message}`
        record.status = 'blocked'
      }
    }

    const ids = extractIds(relativePath, record.parsed)
    record.agentId = ids.agentId
    record.sessionId = ids.sessionId
    const sessionIdFromPath = pathSessionId(relativePath)
    if (sessionIdFromPath && ids.sessionId !== sessionIdFromPath) {
      record.error = `Session id ${ids.sessionId} does not match path id ${sessionIdFromPath}`
      record.status = 'blocked'
    }
    files.push(record)
  }

  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
  const sessionOwners = new Map()
  for (const sessionFile of files.filter(item => item.sessionId && item.agentId)) {
    if (!sessionOwners.has(sessionFile.sessionId)) sessionOwners.set(sessionFile.sessionId, new Set())
    sessionOwners.get(sessionFile.sessionId).add(sessionFile.agentId)
  }
  for (const [sessionId, owners] of sessionOwners) {
    if (owners.size < 2) continue
    const ownerList = [...owners].toSorted().join(', ')
    for (const sessionFile of files.filter(item => item.sessionId === sessionId)) {
      sessionFile.error = `Session id ${sessionId} is shared by multiple agents: ${ownerList}`
      sessionFile.status = 'blocked'
    }
  }
  const agentDirs = []
  const agentsRoot = path.join(rootDir, 'memory', 'agents')
  try {
    const entries = await fs.promises.readdir(agentsRoot, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.isSymbolicLink()) agentDirs.push(entry.name)
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const sortedAgentDirs = agentDirs.toSorted()

  const blocked = files.filter(file => file.status === 'blocked')
  return {
    agentDirs: sortedAgentDirs,
    blocked,
    files,
    manifestHash: sha256(Buffer.from([
      ...sortedAgentDirs.map(agentId => `agent\0${agentId}`),
      ...files.map(file => [
        file.relativePath,
        file.kind,
        file.sizeBytes,
        file.sha256,
        file.status,
      ].join('\0')),
    ].join('\n'))),
    summary: {
      agents: sortedAgentDirs.length,
      blocked: blocked.length,
      bytes: files.reduce((sum, file) => sum + file.sizeBytes, 0),
      files: files.length,
      kinds: Object.fromEntries(
        [...new Set(files.map(file => file.kind))]
          .toSorted()
          .map(kind => [kind, files.filter(file => file.kind === kind).length]),
      ),
    },
  }
}

export { classify as classifyLegacyPath }
