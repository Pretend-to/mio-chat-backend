import crypto from 'node:crypto'
import fs from 'node:fs'
import { isDeepStrictEqual } from 'node:util'
import path from 'node:path'

import { buildLegacyInventory } from './LegacyInventory.js'
import { decryptToken, encryptToken, parseEncryptionKey } from './TokenCipher.js'

const PARSER_VERSION = 'legacy-v1'

function stableId(prefix, input) {
  const digest = crypto.createHash('sha256').update(String(input)).digest('hex').slice(0, 32)
  return `${prefix}_${digest}`
}

function json(value) {
  return JSON.stringify(value)
}

function toDate(value) {
  if (value === null || value === undefined || value === '') return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function readText(file) {
  return fs.readFileSync(file.fullPath, 'utf8')
}

function fileByKind(files, kind) {
  return files.filter(file => file.kind === kind)
}

function omit(object, keys) {
  const skipped = new Set(keys)
  return Object.fromEntries(Object.entries(object || {}).filter(([key]) => !skipped.has(key)))
}

function extractText(message) {
  if (typeof message?.text === 'string') return message.text
  if (!Array.isArray(message?.content)) return null
  const text = message.content
    .filter(block => block?.type === 'text' && typeof block?.data?.text === 'string')
    .map(block => block.data.text)
    .join('')
  return text || null
}

function normalizeJsonValue(value) {
  if (value === undefined) return null
  return typeof value === 'string' ? value : json(value)
}

function projectToolCalls(messageId, content) {
  if (!Array.isArray(content)) return []
  const rows = []
  for (const block of content) {
    if (block?.type !== 'tool_call' || !block.data || typeof block.data !== 'object') continue
    const data = block.data
    const seq = rows.length
    rows.push({
      argsJson: normalizeJsonValue(data.arguments ?? data.parameters ?? {}),
      durationMs: Number.isFinite(data.duration) ? Math.round(data.duration) : null,
      id: stableId('tc', `${messageId}:${seq}`),
      messageId,
      resultJson: data.result === undefined ? null : normalizeJsonValue(data.result),
      seq,
      status: typeof data.status === 'string' ? data.status : 'ok',
      toolName: String(data.name || 'unknown'),
    })
  }
  return rows
}

function validateArrayFile(file) {
  if (!Array.isArray(file.parsed)) {
    throw new Error(`${file.relativePath} must contain a JSON array`)
  }
  return file.parsed
}

function verificationFor(file, recordCount, extra = {}) {
  return json({
    parserVersion: PARSER_VERSION,
    recordCount,
    sourceHash: file.sha256,
    ...extra,
  })
}

export class LegacyMigrationBlockedError extends Error {
  constructor(inventory) {
    super(`Legacy migration blocked by ${inventory.blocked.length} source file(s)`)
    this.name = 'LegacyMigrationBlockedError'
    this.inventory = inventory
  }
}

export class LegacyMigrationService {
  constructor({ prisma, rootDir = process.cwd(), encryptionKey = null, logger = console } = {}) {
    if (!prisma) throw new Error('LegacyMigrationService requires a Prisma client')
    this.prisma = prisma
    this.rootDir = rootDir
    this.encryptionKey = encryptionKey
    this.logger = logger
  }

  async inventory() {
    return await buildLegacyInventory({ rootDir: this.rootDir })
  }

  async migrate({ dryRun = false } = {}) {
    const inventory = await this.inventory()
    if (inventory.blocked.length > 0) throw new LegacyMigrationBlockedError(inventory)
    if (dryRun) return { dryRun: true, inventory }

    const channelsFile = fileByKind(inventory.files, 'channels')[0]
    const channels = channelsFile ? validateArrayFile(channelsFile) : []
    const hasCredentials = channels.some(channel => typeof channel?.token === 'string' && channel.token.length > 0)
    const encryptionKey = hasCredentials
      ? (Buffer.isBuffer(this.encryptionKey) ? this.encryptionKey : parseEncryptionKey(this.encryptionKey))
      : null

    await this.#markRunning(inventory.files)
    try {
      await this.prisma.$transaction(async tx => {
        await this.#migrateAgents(tx, inventory)
        await this.#migrateChannels(tx, channelsFile, channels, encryptionKey)
        const triggerIds = await this.#migrateTriggers(tx, inventory)
        await this.#migrateTriggerExecutions(tx, inventory, triggerIds)
        await this.#markCompleted(tx, inventory.files)
      }, { timeout: 120_000 })

      const verification = await this.verify({ encryptionKey, inventory })
      return { dryRun: false, inventory, verification }
    } catch (error) {
      await this.#markFailed(inventory.files, error)
      throw error
    }
  }

  async verify({ encryptionKey = this.encryptionKey, inventory = null } = {}) {
    const current = inventory || await this.inventory()
    if (current.blocked.length > 0) throw new LegacyMigrationBlockedError(current)

    const problems = []
    for (const file of current.files) {
      const ledger = await this.prisma.legacyMigration.findUnique({
        where: { sourcePath: file.relativePath },
      })
      if (!ledger || ledger.status !== 'completed' || ledger.sourceHash !== file.sha256) {
        problems.push(`${file.relativePath}: ledger missing, incomplete, or hash changed`)
      }
    }

    for (const agentId of current.agentDirs) {
      const agent = await this.prisma.agent.findUnique({ where: { id: agentId } })
      if (!agent) problems.push(`memory/agents/${agentId}: Agent row missing`)
    }

    for (const file of fileByKind(current.files, 'agent_soul')) {
      const agent = await this.prisma.agent.findUnique({ where: { id: file.agentId } })
      if (!agent || agent.soul !== readText(file)) problems.push(`${file.relativePath}: soul mismatch`)
    }

    for (const file of fileByKind(current.files, 'agent_meta')) {
      const rows = await this.prisma.agentMeta.findMany({ where: { agentId: file.agentId } })
      const actual = Object.fromEntries(rows.map(row => [row.key, JSON.parse(row.value)]))
      if (!isDeepStrictEqual(actual, file.parsed)) problems.push(`${file.relativePath}: meta mismatch`)
    }

    for (const file of fileByKind(current.files, 'agent_active')) {
      const agent = await this.prisma.agent.findUnique({ where: { id: file.agentId } })
      const expected = readText(file).trim() || null
      if (!agent || agent.activeSessionId !== expected) problems.push(`${file.relativePath}: active session mismatch`)
    }

    for (const file of fileByKind(current.files, 'global_memory')) {
      const category = path.basename(file.relativePath, '.md')
      const row = await this.prisma.globalMemory.findUnique({
        where: { agentId_category: { agentId: file.agentId, category } },
      })
      if (!row || row.content !== readText(file) || row.sourceHash !== file.sha256) {
        problems.push(`${file.relativePath}: global memory mismatch`)
      }
    }

    for (const file of [
      ...fileByKind(current.files, 'session'),
      ...fileByKind(current.files, 'session_archive'),
    ]) {
      const expected = Array.isArray(file.parsed?.chat) ? file.parsed.chat : []
      const prefix = `${file.relativePath}#`
      const rows = await this.prisma.message.findMany({
        orderBy: { seq: 'asc' },
        select: { legacyJson: true, legacySource: true },
        where: { legacySource: { startsWith: prefix } },
      })
      const actual = rows.map(row => JSON.parse(row.legacyJson))
      if (!isDeepStrictEqual(actual, expected)) problems.push(`${file.relativePath}: message round-trip mismatch`)
    }

    for (const file of fileByKind(current.files, 'session')) {
      const source = file.parsed || {}
      const session = await this.prisma.session.findUnique({ where: { id: file.sessionId } })
      if (!session || session.title !== (typeof source.title === 'string' ? source.title : null)) {
        problems.push(`${file.relativePath}: session metadata mismatch`)
      }

      const crystal = await this.prisma.crystal.findFirst({
        where: { sessionId: file.sessionId, source: 'legacy_current' },
      })
      const expectedCrystal = typeof source.crystal === 'string' && source.crystal.length > 0
        ? source.crystal
        : null
      if ((crystal?.content || null) !== expectedCrystal) problems.push(`${file.relativePath}: crystal mismatch`)

      const pendingRows = await this.prisma.pendingMemory.findMany({
        orderBy: { seq: 'asc' },
        where: { sessionId: file.sessionId },
      })
      const pending = pendingRows.map(row => JSON.parse(row.payload))
      if (!isDeepStrictEqual(pending, Array.isArray(source.pending_memories) ? source.pending_memories : [])) {
        problems.push(`${file.relativePath}: pending memories mismatch`)
      }
    }

    for (const file of fileByKind(current.files, 'session_archive')) {
      const archive = await this.prisma.sessionArchive.findUnique({ where: { sourcePath: file.relativePath } })
      if (!archive || archive.sourceHash !== file.sha256 || archive.archivedAt.getTime() !== toDate(file.parsed?.archivedAt)?.getTime()) {
        problems.push(`${file.relativePath}: archive metadata mismatch`)
      }
    }

    const channelsFile = fileByKind(current.files, 'channels')[0]
    if (channelsFile) {
      const key = validateArrayFile(channelsFile).some(channel => channel?.token)
        ? (Buffer.isBuffer(encryptionKey) ? encryptionKey : parseEncryptionKey(encryptionKey))
        : null
      for (const source of channelsFile.parsed) {
        const row = await this.prisma.channel.findUnique({ where: { id: source.id } })
        if (!row || row.legacyJson !== json(omit(source, ['token']))) {
          problems.push(`${channelsFile.relativePath}: Channel ${source.id} mismatch`)
        } else if (source.token && decryptToken(row.tokenEnc, key) !== source.token) {
          problems.push(`${channelsFile.relativePath}: Channel ${source.id} token mismatch`)
        }
      }
    }

    const triggersFile = fileByKind(current.files, 'triggers')[0]
    if (triggersFile) {
      for (const source of validateArrayFile(triggersFile)) {
        const row = await this.prisma.trigger.findUnique({ where: { id: source.id } })
        if (!row || row.legacyJson !== json(source)) {
          problems.push(`${triggersFile.relativePath}: Trigger ${source.id} mismatch`)
        }
      }
    }

    const executionsFile = fileByKind(current.files, 'trigger_executions')[0]
    if (executionsFile) {
      for (const source of validateArrayFile(executionsFile)) {
        const row = await this.prisma.triggerExecution.findUnique({ where: { id: source.id } })
        if (!row || row.legacyJson !== json(source) || row.triggerKey !== String(source.triggerId || 'unknown')) {
          problems.push(`${executionsFile.relativePath}: TriggerExecution ${source.id} mismatch`)
        }
      }
    }

    const completed = current.files.length - problems.length
    if (problems.length > 0) {
      throw new Error(`Legacy migration verification failed:\n${problems.join('\n')}`)
    }
    return { completed, manifestHash: current.manifestHash, problems: [] }
  }

  async #markRunning(files) {
    for (const file of files) {
      await this.prisma.legacyMigration.upsert({
        create: {
          agentId: file.agentId,
          id: stableId('mig', file.relativePath),
          sessionId: file.sessionId,
          sizeBytes: file.sizeBytes,
          sourceHash: file.sha256,
          sourceKind: file.kind,
          sourcePath: file.relativePath,
          startedAt: new Date(),
          status: 'running',
        },
        update: {
          agentId: file.agentId,
          completedAt: null,
          error: null,
          sessionId: file.sessionId,
          sizeBytes: file.sizeBytes,
          sourceHash: file.sha256,
          sourceKind: file.kind,
          startedAt: new Date(),
          status: 'running',
          verificationJson: null,
        },
        where: { sourcePath: file.relativePath },
      })
    }
  }

  async #markCompleted(tx, files) {
    for (const file of files) {
      await tx.legacyMigration.update({
        data: {
          completedAt: new Date(),
          recordCount: this.#sourceRecordCount(file),
          status: 'completed',
          verificationJson: verificationFor(file, this.#sourceRecordCount(file)),
        },
        where: { sourcePath: file.relativePath },
      })
    }
  }

  async #markFailed(files, error) {
    for (const file of files) {
      await this.prisma.legacyMigration.updateMany({
        data: { error: error.message, status: 'failed' },
        where: { sourcePath: file.relativePath, status: 'running' },
      })
    }
  }

  #sourceRecordCount(file) {
    if (['channels', 'triggers', 'trigger_executions'].includes(file.kind)) {
      return Array.isArray(file.parsed) ? file.parsed.length : 0
    }
    if (['session', 'session_archive'].includes(file.kind)) {
      return Array.isArray(file.parsed?.chat) ? file.parsed.chat.length : 0
    }
    if (file.kind === 'agent_meta') return Object.keys(file.parsed || {}).length
    return 1
  }

  async #migrateAgents(tx, inventory) {
    const channels = fileByKind(inventory.files, 'channels')[0]?.parsed || []
    const triggers = fileByKind(inventory.files, 'triggers')[0]?.parsed || []
    const agentIds = new Set([
      ...inventory.agentDirs,
      ...channels.map(channel => channel?.agentId).filter(Boolean),
      ...triggers.map(trigger => trigger?.agentId).filter(Boolean),
    ])

    for (const agentId of agentIds) {
      const soulFile = fileByKind(inventory.files, 'agent_soul').find(file => file.agentId === agentId)
      await tx.agent.upsert({
        create: { id: agentId, soul: soulFile ? readText(soulFile) : null },
        update: { soul: soulFile ? readText(soulFile) : undefined },
        where: { id: agentId },
      })

      const metaFile = fileByKind(inventory.files, 'agent_meta').find(file => file.agentId === agentId)
      if (metaFile) {
        await tx.agentMeta.deleteMany({ where: { agentId } })
        for (const [key, value] of Object.entries(metaFile.parsed)) {
          await tx.agentMeta.create({ data: { agentId, key, value: json(value) } })
        }
      }

      for (const file of fileByKind(inventory.files, 'global_memory').filter(item => item.agentId === agentId)) {
        const category = path.basename(file.relativePath, '.md')
        await tx.globalMemory.upsert({
          create: {
            agentId,
            category,
            content: readText(file),
            id: stableId('gm', `${agentId}:${category}`),
            sourceHash: file.sha256,
          },
          update: { content: readText(file), sourceHash: file.sha256 },
          where: { agentId_category: { agentId, category } },
        })
      }

      await this.#migrateAgentSessions(tx, inventory, agentId)

      const activeFile = fileByKind(inventory.files, 'agent_active').find(file => file.agentId === agentId)
      if (activeFile) {
        const activeSessionId = readText(activeFile).trim() || null
        if (activeSessionId) {
          const target = await tx.session.findFirst({ where: { agentId, id: activeSessionId } })
          if (!target) throw new Error(`${activeFile.relativePath} points to a missing or foreign session`)
        }
        await tx.agent.update({ data: { activeSessionId }, where: { id: agentId } })
      }
    }
  }

  async #migrateAgentSessions(tx, inventory, agentId) {
    const sessionFiles = fileByKind(inventory.files, 'session').filter(file => file.agentId === agentId)
    const archiveFiles = fileByKind(inventory.files, 'session_archive').filter(file => file.agentId === agentId)
    const sessionIds = new Set([
      ...sessionFiles.map(file => file.sessionId),
      ...archiveFiles.map(file => file.sessionId),
    ].filter(Boolean))

    for (const sessionId of sessionIds) {
      const currentFile = sessionFiles.find(file => file.sessionId === sessionId)
      const current = currentFile?.parsed || {}
      await tx.session.upsert({
        create: {
          agentId,
          createdAt: toDate(current.created_at) || undefined,
          id: sessionId,
          legacyMetadata: json(omit(current, ['chat', 'crystal', 'pending_memories'])),
          title: typeof current.title === 'string' ? current.title : null,
        },
        update: {
          legacyMetadata: json(omit(current, ['chat', 'crystal', 'pending_memories'])),
          title: typeof current.title === 'string' ? current.title : undefined,
        },
        where: { id: sessionId },
      })

      await tx.message.deleteMany({ where: { legacySource: { not: null }, sessionId } })
      await tx.sessionArchive.deleteMany({ where: { sessionId } })
      await tx.pendingMemory.deleteMany({ where: { sessionId } })
      await tx.crystal.deleteMany({ where: { sessionId, source: 'legacy_current' } })

      let seq = 0
      const archives = archiveFiles
        .filter(file => file.sessionId === sessionId)
        .toSorted((a, b) => {
          const timeDiff = Number(a.parsed?.archivedAt || 0) - Number(b.parsed?.archivedAt || 0)
          return timeDiff || a.relativePath.localeCompare(b.relativePath)
        })

      for (const file of archives) {
        const archivedAt = toDate(file.parsed?.archivedAt)
        if (!archivedAt) throw new Error(`${file.relativePath} has no valid archivedAt`)
        const archiveId = stableId('arc', file.relativePath)
        await tx.sessionArchive.create({
          data: {
            archivedAt,
            id: archiveId,
            legacyMetadata: json(omit(file.parsed, ['chat'])),
            sessionId,
            sourceHash: file.sha256,
            sourcePath: file.relativePath,
          },
        })
        seq = await this.#insertLegacyMessages(tx, {
          archiveId,
          archivedAt,
          file,
          sessionId,
          startSeq: seq,
        })
      }

      if (currentFile) {
        seq = await this.#insertLegacyMessages(tx, {
          archiveId: null,
          archivedAt: null,
          file: currentFile,
          sessionId,
          startSeq: seq,
        })
      }

      if (typeof current.crystal === 'string' && current.crystal.length > 0) {
        await tx.crystal.create({
          data: {
            content: current.crystal,
            coversThroughSeq: Math.max(0, seq - (current.chat?.length || 0) - 1),
            id: stableId('cry', `${currentFile.relativePath}:crystal`),
            sessionId,
            source: 'legacy_current',
          },
        })
      }

      const pending = Array.isArray(current.pending_memories) ? current.pending_memories : []
      for (let index = 0; index < pending.length; index++) {
        await tx.pendingMemory.create({
          data: {
            createdAt: toDate(pending[index]?.timestamp) || undefined,
            id: stableId('pm', `${currentFile.relativePath}:pending:${index}`),
            payload: json(pending[index]),
            seq: index,
            sessionId,
          },
        })
      }

      await tx.session.update({ data: { nextSeq: seq }, where: { id: sessionId } })
    }
  }

  async #insertLegacyMessages(tx, { archiveId, archivedAt, file, sessionId, startSeq }) {
    const chat = Array.isArray(file.parsed?.chat) ? file.parsed.chat : []
    let seq = startSeq
    for (let index = 0; index < chat.length; index++) {
      const source = `${file.relativePath}#${index}`
      const message = chat[index] || {}
      const messageId = stableId('msg', source)
      const content = Object.hasOwn(message, 'content') ? message.content : null
      await tx.message.create({
        data: {
          archiveId,
          archivedAt,
          businessTime: toDate(message.time),
          content: json(content),
          fromUserId: message.from_user_id === undefined ? null : String(message.from_user_id),
          id: messageId,
          legacyJson: json(message),
          legacySource: source,
          role: typeof message.role === 'string' ? message.role : 'system',
          seq,
          sessionId,
          status: 'final',
          text: extractText(message),
        },
      })
      const toolCalls = projectToolCalls(messageId, content)
      if (toolCalls.length > 0) await tx.toolCall.createMany({ data: toolCalls })
      seq++
    }
    return seq
  }

  async #migrateChannels(tx, file, channels, encryptionKey) {
    if (!file) return
    const sourceIds = new Set(channels.map(channel => channel.id))
    await tx.channel.deleteMany({ where: { legacyJson: { not: null }, id: { notIn: [...sourceIds] } } })
    for (const source of channels) {
      if (!source?.id) throw new Error(`${file.relativePath} contains a Channel without id`)
      const agentId = source.agentId || 'wechat-master'
      await tx.agent.upsert({ create: { id: agentId }, update: {}, where: { id: agentId } })
      const tokenEnc = source.token ? encryptToken(source.token, encryptionKey) : null
      const data = {
        agentId,
        avatar: source.avatar || null,
        botId: source.botId || null,
        lastActive: toDate(source.lastActive),
        legacyJson: json(omit(source, ['token'])),
        model: source.model || null,
        name: source.name || null,
        provider: source.provider || null,
        status: source.status || 'unbound',
        tokenEnc,
        type: source.type || 'wechat',
        updatedAt: toDate(source.updatedAt) || undefined,
        userId: source.userId || null,
      }
      await tx.channel.upsert({
        create: { ...data, createdAt: toDate(source.createdAt) || undefined, id: source.id },
        update: data,
        where: { id: source.id },
      })
    }
  }

  async #migrateTriggers(tx, inventory) {
    const file = fileByKind(inventory.files, 'triggers')[0]
    if (!file) return new Set()
    const triggers = validateArrayFile(file)
    const ids = new Set(triggers.map(trigger => trigger.id).filter(Boolean))
    await tx.trigger.deleteMany({ where: { legacyJson: { not: null }, id: { notIn: [...ids] } } })

    for (const source of triggers) {
      if (!source?.id) throw new Error(`${file.relativePath} contains a Trigger without id`)
      const agentId = source.agentId || 'wechat-master'
      await tx.agent.upsert({ create: { id: agentId }, update: {}, where: { id: agentId } })
      const channel = source.channelId
        ? await tx.channel.findUnique({ where: { id: source.channelId } })
        : null
      const session = source.sessionId
        ? await tx.session.findFirst({ where: { agentId, id: source.sessionId } })
        : null
      const data = {
        agentId,
        channelId: channel?.id || null,
        cooldownSec: Number.isFinite(source.cooldownSec) ? source.cooldownSec : 1800,
        cronExpr: source.cronExpr || null,
        enabled: source.enabled !== false && Boolean(channel),
        fireCount: Number.isFinite(source.fireCount) ? source.fireCount : 0,
        lastFiredAt: toDate(source.lastFiredAt),
        legacyJson: json(source),
        maxFiresPerDay: Number.isFinite(source.maxFiresPerDay) ? source.maxFiresPerDay : 5,
        mode: source.mode === 'once' ? 'once' : 'persistent',
        params: normalizeJsonValue(source.params || {}),
        promptTemplate: source.promptTemplate || '{{payload.reason}}',
        scriptPath: source.scriptPath || null,
        sessionId: session?.id || null,
        type: source.type || (source.cronExpr ? 'cron' : 'script'),
        updatedAt: toDate(source.updatedAt) || undefined,
        wakeCount: Number.isFinite(source.wakeCount) ? source.wakeCount : 0,
        webhookSecretHash: source.webhookSecret
          ? crypto.createHash('sha256').update(String(source.webhookSecret)).digest('hex')
          : null,
      }
      await tx.trigger.upsert({
        create: { ...data, createdAt: toDate(source.createdAt) || undefined, id: source.id },
        update: data,
        where: { id: source.id },
      })
    }
    return ids
  }

  async #migrateTriggerExecutions(tx, inventory, triggerIds) {
    const file = fileByKind(inventory.files, 'trigger_executions')[0]
    if (!file) return
    const executions = validateArrayFile(file)
    const sourceIds = new Set(executions.map(execution => execution.id).filter(Boolean))
    await tx.triggerExecution.deleteMany({
      where: { legacyJson: { not: null }, id: { notIn: [...sourceIds] } },
    })
    for (let index = 0; index < executions.length; index++) {
      const source = executions[index] || {}
      const id = source.id || stableId('exec', `${file.relativePath}#${index}`)
      const triggerKey = String(source.triggerId || 'unknown')
      const data = {
        dataJson: source.data === undefined ? null : json(source.data),
        durationMs: Number.isFinite(source.durationMs) ? Math.round(source.durationMs) : null,
        error: source.error === null || source.error === undefined ? null : String(source.error),
        firedAt: toDate(source.firedAt),
        legacyJson: json(source),
        reason: source.reason === undefined ? null : String(source.reason),
        sessionId: source.sessionId || null,
        status: source.status || 'ok',
        triggerId: triggerIds.has(source.triggerId) ? source.triggerId : null,
        triggerKey,
        wake: Boolean(source.wake),
      }
      await tx.triggerExecution.upsert({ create: { ...data, id }, update: data, where: { id } })
    }
  }
}

export default LegacyMigrationService

export const legacyMigrationInternals = {
  extractText,
  projectToolCalls,
  stableId,
  toDate,
}
