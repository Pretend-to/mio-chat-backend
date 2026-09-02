import crypto from 'node:crypto'

import { MemoryStore } from '../../../channels/memory/MemoryStore.js'
import { DatabaseMemoryStore } from './DatabaseMemoryStore.js'

export const PERSISTENCE_MODES = Object.freeze([
  'legacy',
  'shadow',
  'database-shadow',
  'database',
])

const WRITE_METHODS = new Set([
  'addGlobal',
  'appendPendingMemory',
  'appendToChat',
  'clearChat',
  'clearPendingMemories',
  'deleteGlobal',
  'deleteSession',
  'ensure',
  'rotateChat',
  'setActiveSession',
  'setAgentMeta',
  'setCrystal',
  'updateGlobal',
  'writeGlobal',
  'writeSoul',
])

export class PersistenceMirrorError extends Error {
  constructor(method, cause) {
    super(`Persistence mirror failed after database ${method}: ${cause.message}`, { cause })
    this.name = 'PersistenceMirrorError'
    this.method = method
  }
}

/** Four-mode facade used while filesystem storage moves to Prisma. */
export class SessionPersistence {
  constructor({
    agentId,
    baseDir = 'memory',
    databaseStore = null,
    legacyStore = null,
    logger = console,
    mode = 'legacy',
    prisma = null,
  } = {}) {
    if (!agentId) throw new Error('SessionPersistence requires agentId')
    if (!PERSISTENCE_MODES.includes(mode)) {
      throw new Error(`invalid persistence mode ${mode}; expected ${PERSISTENCE_MODES.join(', ')}`)
    }
    if (mode !== 'legacy' && !databaseStore && !prisma) {
      throw new Error(`SessionPersistence mode ${mode} requires prisma`)
    }
    this.agentId = agentId
    this.mode = mode
    this.logger = logger
    // DB 单线运行时不实例化文件存储；MemoryStore 仅在显式 legacy/shadow
    // 诊断模式或一次性回滚场景中启用。
    this.legacy = legacyStore || (mode === 'legacy' || mode === 'shadow' || mode === 'database-shadow'
      ? new MemoryStore({ agentId, baseDir })
      : null)
    this.database = databaseStore || (prisma ? new DatabaseMemoryStore({ agentId, prisma }) : null)
    this.primary = mode === 'database' || mode === 'database-shadow' ? this.database : this.legacy
    this.mirror = mode === 'shadow' ? this.database : mode === 'database-shadow' ? this.legacy : null
    this.drafts = new Map()
  }

  async #invoke(method, args) {
    const result = await this.primary[method](...args)
    if (!this.mirror || !WRITE_METHODS.has(method)) return result
    try {
      await this.mirror[method](...args)
    } catch (error) {
      this.logger?.error?.(`[SessionPersistence] ${this.mode} mirror ${method} failed: ${error.message}`)
      if (this.mode === 'database-shadow') throw new PersistenceMirrorError(method, error)
    }
    return result
  }

  async #read(method, args) {
    return await this.primary[method](...args)
  }

  async ensure() { return await this.#invoke('ensure', []) }
  async readSoul() { return await this.#read('readSoul', []) }
  async writeSoul(content) { return await this.#invoke('writeSoul', [content]) }
  async readGlobal(category = 'general') { return await this.#read('readGlobal', [category]) }
  async listGlobalCategories() { return await this.#read('listGlobalCategories', []) }
  async readAllGlobal() { return await this.#read('readAllGlobal', []) }
  async writeGlobal(category, content) { return await this.#invoke('writeGlobal', [category, content]) }
  async addGlobal(category, content) { return await this.#invoke('addGlobal', [category, content]) }
  async updateGlobal(category, target, content) { return await this.#invoke('updateGlobal', [category, target, content]) }
  async deleteGlobal(category, target) { return await this.#invoke('deleteGlobal', [category, target]) }
  async listSessions() { return await this.#read('listSessions', []) }
  async getSession(id) { return await this.#read('getSession', [id]) }
  async getChat(id) { return await this.#read('getChat', [id]) }

  async createSession(options = {}) {
    const result = await this.primary.createSession(options)
    if (!this.mirror) return result
    try {
      await this.mirror.createSession({ createdAt: result.created_at, id: result.id, title: result.title })
    } catch (error) {
      this.logger?.error?.(`[SessionPersistence] ${this.mode} mirror createSession failed: ${error.message}`)
      if (this.mode === 'database-shadow') throw new PersistenceMirrorError('createSession', error)
    }
    return result
  }

  async deleteSession(id) { return await this.#invoke('deleteSession', [id]) }
  async appendToChat(id, message) { return await this.#invoke('appendToChat', [id, message]) }
  async appendUserMessage(id, message) {
    if (this.mode === 'database') return await this.database.appendUserMessage(id, message)
    if (this.mode === 'database-shadow') {
      const result = await this.database.appendUserMessage(id, message)
      try {
        await this.legacy.appendToChat(id, message)
      } catch (error) {
        this.logger?.error?.(`[SessionPersistence] database-shadow user mirror failed: ${error.message}`)
        throw new PersistenceMirrorError('appendUserMessage', error)
      }
      return result
    }

    const result = await this.legacy.appendToChat(id, message)
    if (this.mode === 'shadow') {
      try {
        await this.database.appendUserMessage(id, message)
      } catch (error) {
        this.logger?.error?.(`[SessionPersistence] shadow user mirror failed: ${error.message}`)
      }
    }
    return result
  }
  async setCrystal(id, crystal = '') { return await this.#invoke('setCrystal', [id, crystal]) }
  async getCrystal(id) { return await this.#read('getCrystal', [id]) }
  async appendPendingMemory(id, event) { return await this.#invoke('appendPendingMemory', [id, event]) }
  async getPendingMemories(id) { return await this.#read('getPendingMemories', [id]) }
  async clearPendingMemories(id) { return await this.#invoke('clearPendingMemories', [id]) }
  async clearChat(id) { return await this.#invoke('clearChat', [id]) }
  async rotateChat(id, keepTurns = 1) { return await this.#invoke('rotateChat', [id, keepTurns]) }
  async getAgentMeta(key, fallback = null) { return await this.#read('getAgentMeta', [key, fallback]) }
  async setAgentMeta(key, value) { return await this.#invoke('setAgentMeta', [key, value]) }
  async getActiveSession() { return await this.#read('getActiveSession', []) }
  async setActiveSession(id) { return await this.#invoke('setActiveSession', [id]) }

  async beginAssistantMessage(sessionId, message = {}) {
    let databasePersisted = false
    let messageId = message.id || `msg_${crypto.randomUUID()}`
    if (this.database) {
      try {
        messageId = await this.database.beginAssistantMessage(sessionId, { ...message, id: messageId })
        databasePersisted = true
      } catch (error) {
        this.logger?.error?.(`[SessionPersistence] ${this.mode} beginAssistantMessage failed: ${error.message}`)
        if (this.mode !== 'shadow') throw error
      }
    }
    this.drafts.set(messageId, { databasePersisted, message, sessionId })
    return messageId
  }

  async appendAssistantChunk(messageId, kind, payload) {
    if (!this.database || !this.drafts.get(messageId)?.databasePersisted) return null
    return await this.database.appendAssistantChunk(messageId, kind, payload)
  }

  async finalizeAssistantMessage(messageId, message, status = 'final') {
    const draft = this.drafts.get(messageId)
    if (this.database && draft?.databasePersisted) {
      try {
        await this.database.finalizeAssistantMessage(messageId, message, status)
      } catch (error) {
        this.logger?.error?.(`[SessionPersistence] ${this.mode} finalizeAssistantMessage failed: ${error.message}`)
        if (this.mode !== 'shadow') throw error
      }
    }

    const writeLegacy = this.mode === 'legacy' || this.mode === 'shadow' || this.mode === 'database-shadow'
    if (writeLegacy) {
      if (!draft?.sessionId) throw new Error(`assistant draft ${messageId} not found`)
      try {
        await this.legacy.appendToChat(draft.sessionId, { ...message, role: 'assistant' })
      } catch (error) {
        this.logger?.error?.(`[SessionPersistence] ${this.mode} assistant mirror failed: ${error.message}`)
        if (this.mode === 'database-shadow') throw new PersistenceMirrorError('finalizeAssistantMessage', error)
        if (this.mode === 'legacy') throw error
      }
    }
    this.drafts.delete(messageId)
    return true
  }

  async recoverInterruptedMessages() {
    if (!this.database) return 0
    try {
      return await this.database.recoverInterruptedMessages()
    } catch (error) {
      this.logger?.error?.(`[SessionPersistence] ${this.mode} recovery failed: ${error.message}`)
      if (this.mode !== 'shadow') throw error
      return 0
    }
  }
}

export default SessionPersistence
