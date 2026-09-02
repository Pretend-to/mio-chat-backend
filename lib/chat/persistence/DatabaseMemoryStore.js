import crypto from 'node:crypto'
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
  const content = parseJson(row.content, [])
  const message = {
    content: Array.isArray(content) ? content : [],
    role: row.role,
  }
  if (row.fromUserId != null) message.from_user_id = row.fromUserId
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
      orderBy: { createdAt: 'asc' },
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
      title: row.title || '',
    }
    if (row.pendingMemories.length > 0) {
      session.pending_memories = row.pendingMemories.map(item => parseJson(item.payload, null))
    }
    return session
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
    if (agent?.activeSessionId === id) await this.setActiveSession(null)
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
    await this.prisma.$transaction(async tx => {
      const session = await tx.session.update({
        data: { nextSeq: { increment: 1 } },
        select: { agentId: true, nextSeq: true },
        where: { id: String(id) },
      })
      if (session.agentId !== this.agentId) throw new Error(`session ${id} belongs to another agent`)
      const content = canonicalContent(msg)
      await tx.message.create({
        data: {
          businessTime: toDate(msg.time),
          content: json(content),
          fromUserId: msg.from_user_id == null ? null : String(msg.from_user_id),
          id: messageId,
          role: String(msg.role || 'assistant'),
          seq: session.nextSeq - 1,
          sessionId: String(id),
          status,
          text: messageText({ ...msg, content }),
        },
      })
      const toolCalls = projectToolCalls(messageId, content)
      if (toolCalls.length > 0) await tx.toolCall.createMany({ data: toolCalls })
    })
    return messageId
  }

  async appendToChat(id, msg) {
    await this.#appendMessage(id, msg)
    return await this.getSession(id)
  }

  async appendUserMessage(id, msg) {
    return await this.#appendMessage(id, msg)
  }

  async getChat(id) {
    return (await this.getSession(id))?.chat || []
  }

  async setCrystal(id, crystalXml = '') {
    const existing = await this.prisma.session.findUnique({ select: { id: true }, where: { id: String(id) } })
    if (!existing) await this.createSession({ id })
    await this.prisma.crystal.create({
      data: {
        content: crystalXml ?? '',
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
    let keepFrom = 0
    let turns = 0
    for (let index = session.chat.length - 1; index >= 0; index--) {
      if (session.chat[index]?.role === 'user') {
        turns++
        if (turns >= keepTurns) {
          keepFrom = index
          break
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
    return (await this.prisma.agent.findUnique({ where: { id: this.agentId } }))?.activeSessionId || null
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
      data: { activeSessionId: id == null ? null : String(id) },
      where: { id: this.agentId },
    })
    return id == null ? null : String(id)
  }

  async beginAssistantMessage(sessionId, message = {}) {
    const draft = { ...message, content: message.content || [], role: 'assistant' }
    return await this.#appendMessage(sessionId, draft, 'streaming')
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
