import crypto from 'node:crypto'
import { coalesceCrystallizeEvents } from '../crystallizationContent.js'
import { ensureMessageTime, normalizeMessageTime } from '../messageTimestamp.js'

function json(value) {
  return JSON.stringify(value === undefined ? null : value)
}

function parseJson(value, fallback = null) {
  if (value == null) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function toDate(value) {
  if (value == null || value === '') return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function messageText(message) {
  if (typeof message?.text === 'string') return message.text
  if (!Array.isArray(message?.content)) return null
  const text = message.content
    .filter(block => block?.type === 'text' && typeof block?.data?.text === 'string')
    .map(block => block.data.text)
    .join('')
  return text || null
}

function canonicalContent(message) {
  if (Array.isArray(message?.content)) return message.content
  const text = typeof message?.content === 'string'
    ? message.content
    : (typeof message?.text === 'string' ? message.text : '')
  return text ? [{ data: { text }, type: 'text' }] : []
}

function rowToMessage(row) {
  const parsedContent = parseJson(row.content, [])
  const content = coalesceCrystallizeEvents(
    Array.isArray(parsedContent) ? parsedContent : [],
  )
  const message = {
    content,
    id: row.id,
    role: row.role,
  }
  if (row.fromUserId != null) message.from_user_id = row.fromUserId
  if (row.metadata != null) message.metadata = parseJson(row.metadata, null)
  if (row.text != null) message.text = row.text

  // 运行时只读取数据库规范列；legacyJson 仅供一次性迁移复验与审计，
  // 不再作为消息对象的兼容来源。
  const stableTime = normalizeMessageTime(row.businessTime?.getTime?.())
    || normalizeMessageTime(row.createdAt?.getTime?.())
  if (stableTime) message.time = stableTime
  if (row.status !== 'final') {
    message.persistence_status = row.status
    const semanticText = (row.chunks || [])
      .filter(chunk => chunk.kind === 'semantic_block')
      .map(chunk => parseJson(chunk.payload, {}))
      .map(payload => payload?.text || '')
      .filter(Boolean)
      .join('\n\n')
    if (semanticText && (!Array.isArray(message.content) || message.content.length === 0)) {
      message.content = [{ data: { text: semanticText }, type: 'text' }]
      message.text = semanticText
    }
  }
  return message
}

function projectToolCalls(messageId, content) {
  if (!Array.isArray(content)) return []
  return content
    .filter(block => block?.type === 'tool_call' && block.data && typeof block.data === 'object')
    .map((block, seq) => {
      const data = block.data
      return {
        argsJson: json(data.arguments ?? data.parameters ?? {}),
        durationMs: Number.isFinite(data.duration) ? Math.round(data.duration) : null,
        id: `tc_${crypto.randomUUID()}`,
        messageId,
        resultJson: data.result === undefined ? null : json(data.result),
        seq,
        status: typeof data.status === 'string' ? data.status : 'ok',
        toolName: String(data.name || 'unknown'),
      }
    })
}

/** Canonical database-backed session store used by all running channels. */
export class DatabaseMemoryStore {
  constructor({ agentId, prisma }) {
    if (!agentId) throw new Error('DatabaseMemoryStore requires agentId')
    if (!prisma) throw new Error('DatabaseMemoryStore requires prisma')
    this.agentId = agentId
    this.prisma = prisma
  }

  async ensure() {
    await this.prisma.agent.upsert({
      create: { id: this.agentId },
      update: {},
      where: { id: this.agentId },
    })
    return `db://agents/${this.agentId}`
  }

  async readSoul() {
    return (await this.prisma.agent.findUnique({ where: { id: this.agentId } }))?.soul || ''
  }

  async writeSoul(content) {
    await this.prisma.agent.upsert({
      create: { id: this.agentId, soul: String(content ?? '') },
      update: { soul: String(content ?? '') },
      where: { id: this.agentId },
    })
    return true
  }

  async readGlobal(category = 'general') {
    const row = await this.prisma.globalMemory.findUnique({
      where: { agentId_category: { agentId: this.agentId, category: String(category) } },
    })
    return row?.content || ''
  }

  async listGlobalCategories() {
    const rows = await this.prisma.globalMemory.findMany({
      orderBy: { category: 'asc' },
      select: { category: true },
      where: { agentId: this.agentId },
    })
    return rows.map(row => row.category)
  }

  async readAllGlobal() {
    const rows = await this.prisma.globalMemory.findMany({
      orderBy: { category: 'asc' },
      where: { agentId: this.agentId },
    })
    return rows
      .map(row => ({ body: row.content.trim(), category: row.category }))
      .filter(row => row.body)
      .map(row => `## ${row.category}\n${row.body}`)
      .join('\n\n')
  }

  async writeGlobal(category, content) {
    await this.ensure()
    const key = String(category || 'general')
    await this.prisma.globalMemory.upsert({
      create: {
        agentId: this.agentId,
        category: key,
        content: String(content ?? ''),
        id: `gm_${crypto.randomUUID()}`,
      },
      update: { content: String(content ?? ''), sourceHash: null },
      where: { agentId_category: { agentId: this.agentId, category: key } },
    })
    return true
  }

  async addGlobal(category, content) {
    const body = await this.readGlobal(category)
    const line = String(content).trim()
    if (!line) throw new Error('addGlobal requires content')
    return await this.writeGlobal(category, body ? `${body.replace(/\n+$/, '')}\n${line}\n` : `${line}\n`)
  }

  async updateGlobal(category, target = '', content) {
    const lines = (await this.readGlobal(category)).split('\n')
    const match = target.trim()
    if (!match) return await this.writeGlobal(category, `${String(content).trim()}\n`)
    const next = lines.map(line => line.includes(match) ? String(content).trim() : line)
    return await this.writeGlobal(category, `${next.join('\n').replace(/\n+$/, '')}\n`)
  }

  async deleteGlobal(category, target) {
    const match = String(target || '').trim()
    if (!match) throw new Error('deleteGlobal requires target')
    const next = (await this.readGlobal(category)).split('\n').filter(line => !line.includes(match))
    return await this.writeGlobal(category, next.join('\n').replace(/\n+$/, '') + (next.length ? '\n' : ''))
  }

  async listSessions() {
    const rows = await this.prisma.session.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        _count: { select: { messages: { where: { archivedAt: null } } } },
        createdAt: true,
        id: true,
        title: true,
      },
      where: { agentId: this.agentId },
    })
    return rows.map(row => ({
      createdAt: row.createdAt.getTime(),
      id: row.id,
      msgCount: row._count.messages,
      title: row.title || row.id,
    }))
  }

  async getSession(id) {
    const row = await this.prisma.session.findFirst({
      include: {
        crystals: { orderBy: { createdAt: 'desc' }, take: 1 },
        messages: {
          orderBy: { seq: 'asc' },
          select: {
            businessTime: true,
            chunks: {
              orderBy: { seq: 'asc' },
              select: { kind: true, payload: true },
            },
            content: true,
            createdAt: true,
            metadata: true,
            fromUserId: true,
            id: true,
            role: true,
            status: true,
            text: true,
          },
          where: { archivedAt: null },
        },
        pendingMemories: { orderBy: { seq: 'asc' } },
      },
      where: { agentId: this.agentId, id: String(id) },
    })
    if (!row) return null
    const session = {
      chat: row.messages.map(rowToMessage),
      created_at: row.createdAt.getTime(),
      crystal: row.crystals[0]?.content || '',
      id: row.id,
      kind: row.kind,
      parentSessionId: row.parentSessionId,
      title: row.title || '',
    }
    if (row.pendingMemories.length > 0) {
      session.pending_memories = row.pendingMemories.map(item => parseJson(item.payload, null))
    }
    return session
  }

  async getSessionParentId(id) {
    const row = await this.prisma.session.findFirst({
      select: { parentSessionId: true },
      where: { agentId: this.agentId, id: String(id) },
    })
    return row?.parentSessionId || null
  }

  async createSession({
    createdAt = Date.now(),
    id = `s_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    title = '',
  } = {}) {
    await this.ensure()
    const sessionId = String(id).replace(/[^a-zA-Z0-9_.-]/g, '_')
    if (!sessionId) throw new Error('invalid id')
    const existing = await this.prisma.session.findUnique({ where: { id: sessionId } })
    if (existing) {
      if (existing.agentId !== this.agentId) {
        throw new Error(`session id ${sessionId} already belongs to agent ${existing.agentId}`)
      }
      const current = await this.getSession(sessionId)
      if (current) return current
    }
    const row = await this.prisma.session.create({
      data: { agentId: this.agentId, createdAt: new Date(createdAt), id: sessionId, title: String(title || '') },
    })
    return { chat: [], created_at: row.createdAt.getTime(), crystal: '', id: row.id, title: row.title || '' }
  }

  async deleteSession(id) {
    await this.prisma.session.deleteMany({ where: { agentId: this.agentId, id: String(id) } })
    const agent = await this.prisma.agent.findUnique({ where: { id: this.agentId } })
    if (agent?.defaultSessionId === id) await this.setActiveSession(null)
    return true
  }

  async #appendMessage(id, msg, status = 'final') {
    const existing = await this.prisma.session.findUnique({
      select: { agentId: true },
      where: { id: String(id) },
    })
    if (!existing) await this.createSession({ id })
    else if (existing.agentId !== this.agentId) throw new Error(`session ${id} belongs to another agent`)
    msg.time = ensureMessageTime(msg.time)
    const messageId = msg.id ? String(msg.id) : `msg_${crypto.randomUUID()}`
    const externalKey = msg.channel_id != null && msg.external_message_id != null
      ? {
          channelId: String(msg.channel_id),
          externalMessageId: String(msg.external_message_id),
        }
      : null

    const findExternalMessage = async (db) => externalKey
      ? await db.message.findUnique({
          select: { id: true },
          where: { channelId_externalMessageId: externalKey },
        })
      : null

    const executeAppend = async ({ existingOnly = false } = {}) => {
      return await this.prisma.$transaction(async tx => {
        // An upstream redelivery may use a new local message ID or even land in
        // a new Session. The channel's external ID is the stable identity.
        const existingExternal = await findExternalMessage(tx)
        if (existingExternal) return { id: existingExternal.id, inserted: false }

        const existingMessage = await tx.message.findUnique({
          select: { id: true, sessionId: true },
          where: { id: messageId },
        })

        const content = canonicalContent(msg)
        const data = {
          businessTime: toDate(msg.time),
          channelId: msg.channel_id == null ? null : String(msg.channel_id),
          content: json(content),
          externalConversationId: msg.external_conversation_id == null
            ? null
            : String(msg.external_conversation_id),
          externalMessageId: msg.external_message_id == null
            ? null
            : String(msg.external_message_id),
          fromUserId: msg.from_user_id == null ? null : String(msg.from_user_id),
          metadata: msg.metadata == null ? null : json(msg.metadata),
          role: String(msg.role || 'assistant'),
          sourceType: msg.source_type == null ? null : String(msg.source_type),
          status,
          text: messageText({ ...msg, content }),
        }

        if (existingMessage) {
          if (existingMessage.sessionId !== String(id)) {
            throw new Error(`message ${messageId} already belongs to another session ${existingMessage.sessionId}`)
          }
          await tx.message.update({
            data,
            where: { id: messageId },
          })
          await tx.toolCall.deleteMany({ where: { messageId } })
        } else {
          if (existingOnly) throw new Error(`message ${messageId} disappeared during retry`)
          const session = await tx.session.update({
            data: { nextSeq: { increment: 1 } },
            select: { agentId: true, nextSeq: true },
            where: { id: String(id) },
          })
          if (session.agentId !== this.agentId) throw new Error(`session ${id} belongs to another agent`)
          await tx.message.create({
            data: {
              ...data,
              id: messageId,
              seq: session.nextSeq - 1,
              sessionId: String(id),
            },
          })
        }

        const toolCalls = projectToolCalls(messageId, content)
        if (toolCalls.length > 0) await tx.toolCall.createMany({ data: toolCalls })
        return { id: messageId, inserted: !existingMessage }
      })
    }

    try {
      return await executeAppend()
    } catch (error) {
      const uniqueConflict = error?.code === 'P2002' || error?.message?.includes('UNIQUE constraint failed')
      if (!uniqueConflict) throw error

      // A concurrent insert can pass the initial read in both transactions.
      // Resolve the winning external row without repeating the failed insert.
      const existingExternal = await findExternalMessage(this.prisma)
      if (existingExternal) return { id: existingExternal.id, inserted: false }

      // Existing local IDs are updates (including concurrent retry of one ID),
      // not a reason to allocate another sequence number.
      const existingById = await this.prisma.message.findUnique({
        select: { id: true },
        where: { id: messageId },
      })
      if (existingById) return await executeAppend({ existingOnly: true })

      const target = String(error?.meta?.target || error?.message || '')
      if (/session_?id/.test(target) && target.includes('seq')) {
        return await executeAppend()
      }
      throw error
    }
  }

  async appendToChat(id, msg) {
    await this.#appendMessage(id, msg)
    return await this.getSession(id)
  }

  async appendUserMessage(id, msg) {
    return (await this.#appendMessage(id, msg)).id
  }

  async appendUserMessageOnce(id, msg) {
    return await this.#appendMessage(id, msg)
  }

  async getChat(id) {
    return (await this.getSession(id))?.chat || []
  }

  async setCrystal(id, crystalXml = '') {
    const existing = await this.prisma.session.findUnique({ select: { id: true }, where: { id: String(id) } })
    if (!existing) await this.createSession({ id })
    const nextCrystal = crystalXml ?? ''
    const latest = await this.prisma.crystal.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { content: true },
      where: { sessionId: String(id) },
    })
    if ((latest?.content || '') === nextCrystal) return false
    await this.prisma.crystal.create({
      data: {
        content: nextCrystal,
        id: `cr_${crypto.randomUUID()}`,
        sessionId: String(id),
        source: 'runtime',
      },
    })
    return true
  }

  async getCrystal(id) {
    const row = await this.prisma.crystal.findFirst({
      orderBy: { createdAt: 'desc' },
      where: { session: { agentId: this.agentId }, sessionId: String(id) },
    })
    return row?.content || ''
  }

  async appendPendingMemory(id, event) {
    const existing = await this.prisma.session.findUnique({ select: { id: true }, where: { id: String(id) } })
    if (!existing) await this.createSession({ id })
    const payload = { ...event, timestamp: Date.now() }
    await this.prisma.$transaction(async tx => {
      const aggregate = await tx.pendingMemory.aggregate({
        _max: { seq: true },
        where: { sessionId: String(id) },
      })
      const seq = (aggregate._max.seq ?? -1) + 1
      await tx.pendingMemory.create({
        data: { id: `pm_${crypto.randomUUID()}`, payload: json(payload), seq, sessionId: String(id) },
      })
    })
    return await this.getPendingMemories(id)
  }

  async getPendingMemories(id) {
    const rows = await this.prisma.pendingMemory.findMany({
      orderBy: { seq: 'asc' },
      where: { session: { agentId: this.agentId }, sessionId: String(id) },
    })
    return rows.map(row => parseJson(row.payload, null))
  }

  async clearPendingMemories(id) {
    await this.prisma.pendingMemory.deleteMany({
      where: { session: { agentId: this.agentId }, sessionId: String(id) },
    })
    return true
  }

  async clearChat(id) {
    if (!(await this.getSession(id))) await this.createSession({ id })
    await this.prisma.message.deleteMany({
      where: { archiveId: null, session: { agentId: this.agentId }, sessionId: String(id) },
    })
    return true
  }

  async rotateChat(id, keepTurns = 1) {
    const session = await this.getSession(id)
    if (!session || session.chat.length === 0) return { rotated: false, reason: 'empty' }
    let keepFrom = keepTurns <= 0 ? session.chat.length : 0
    let turns = 0
    if (keepTurns > 0) {
      for (let index = session.chat.length - 1; index >= 0; index--) {
        if (session.chat[index]?.role === 'user') {
          turns++
          if (turns >= keepTurns) {
            keepFrom = index
            break
          }
        }
      }
    }
    if (keepFrom <= 0) return { rotated: false, reason: 'too-short' }
    const rows = await this.prisma.message.findMany({
      orderBy: { seq: 'asc' },
      select: { id: true },
      where: { archiveId: null, sessionId: String(id) },
    })
    const removed = rows.slice(0, keepFrom)
    const archivedAt = new Date()
    const archiveId = `ar_${crypto.randomUUID()}`
    const sourcePath = `database/${this.agentId}/${id}/${archivedAt.getTime()}_${archiveId}.json`
    await this.prisma.$transaction(async tx => {
      await tx.sessionArchive.create({
        data: {
          archivedAt,
          id: archiveId,
          sessionId: String(id),
          sourceHash: crypto.createHash('sha256').update(json(session.chat.slice(0, keepFrom))).digest('hex'),
          sourcePath,
        },
      })
      await tx.message.updateMany({
        data: { archiveId, archivedAt },
        where: { id: { in: removed.map(row => row.id) } },
      })
    })
    return {
      archivePath: `db://${sourcePath}`,
      keptCount: rows.length - removed.length,
      removedCount: removed.length,
      rotated: true,
    }
  }

  async getAgentMeta(key, fallback = null) {
    const row = await this.prisma.agentMeta.findUnique({
      where: { agentId_key: { agentId: this.agentId, key: String(key) } },
    })
    return row ? parseJson(row.value, fallback) : fallback
  }

  async setAgentMeta(key, value) {
    await this.ensure()
    await this.prisma.agentMeta.upsert({
      create: { agentId: this.agentId, key: String(key), value: json(value) },
      update: { value: json(value) },
      where: { agentId_key: { agentId: this.agentId, key: String(key) } },
    })
    if (key === 'provider' || key === 'model') {
      await this.prisma.agent.update({
        data: { [key]: value == null ? null : String(value) },
        where: { id: this.agentId },
      })
    }
    return true
  }

  async getActiveSession() {
    return (await this.prisma.agent.findUnique({ where: { id: this.agentId } }))?.defaultSessionId || null
  }

  async setActiveSession(id) {
    await this.ensure()
    if (id != null) {
      const session = await this.prisma.session.findFirst({
        select: { id: true },
        where: { agentId: this.agentId, id: String(id) },
      })
      if (!session) throw new Error(`session ${id} not found for agent ${this.agentId}`)
    }
    await this.prisma.agent.update({
      data: { defaultSessionId: id == null ? null : String(id) },
      where: { id: this.agentId },
    })
    return id == null ? null : String(id)
  }

  async beginAssistantMessage(sessionId, message = {}) {
    const draft = { ...message, content: message.content || [], role: 'assistant' }
    return (await this.#appendMessage(sessionId, draft, 'streaming')).id
  }

  async appendAssistantChunk(messageId, kind, payload) {
    return await this.prisma.$transaction(async tx => {
      const aggregate = await tx.messageChunk.aggregate({
        _max: { seq: true },
        where: { messageId },
      })
      return await tx.messageChunk.create({
        data: {
          id: `mc_${crypto.randomUUID()}`,
          kind: String(kind),
          messageId,
          payload: json(payload),
          seq: (aggregate._max.seq ?? -1) + 1,
        },
      })
    })
  }

  async finalizeAssistantMessage(messageId, message, status = 'final') {
    const content = canonicalContent(message)
    await this.prisma.$transaction(async tx => {
      await tx.toolCall.deleteMany({ where: { messageId } })
      const toolCalls = projectToolCalls(messageId, content)
      if (toolCalls.length > 0) await tx.toolCall.createMany({ data: toolCalls })
      await tx.message.update({
        data: {
          businessTime: toDate(message?.time || Date.now()),
          content: json(content),
          revision: { increment: 1 },
          status,
          text: messageText({ ...message, content }),
        },
        where: { id: messageId },
      })
    })
    return true
  }

  async recoverInterruptedMessages() {
    const result = await this.prisma.message.updateMany({
      data: { revision: { increment: 1 }, status: 'aborted_by_restart' },
      where: { session: { agentId: this.agentId }, status: 'streaming' },
    })
    return result.count
  }
}

export default DatabaseMemoryStore
