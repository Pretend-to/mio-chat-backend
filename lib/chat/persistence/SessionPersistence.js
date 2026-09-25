import crypto from 'node:crypto'

import { DatabaseMemoryStore } from './DatabaseMemoryStore.js'

/**
 * 记忆存储门面，唯一实现是 DatabaseMemoryStore（Prisma）。
 *
 * 历史上这里有四种模式（legacy / shadow / database-shadow / database）用于文件存储
 * 向数据库迁移；文件存储删除后只剩 database。别的值一律显式报错 —— 不再有双写、
 * 镜像与回滚路径，因为双写正是「两个地方对同一件事给出不同答案」的许可证。
 */
export class SessionPersistence {
  constructor({
    agentId,
    databaseStore = null,
    logger = console,
    mode = 'database',
    prisma = null,
  } = {}) {
    if (!agentId) throw new Error('SessionPersistence requires agentId')
    if (mode !== 'database') {
      throw new Error(
        `不支持的持久化模式 ${mode}：文件存储已删除，只剩 database（legacy / shadow / database-shadow 已移除）`,
      )
    }
    if (!databaseStore && !prisma) {
      throw new Error('SessionPersistence requires prisma')
    }
    this.agentId = agentId
    this.logger = logger
    this.database = databaseStore || new DatabaseMemoryStore({ agentId, prisma })
    // 已 begin、尚未 finalize 的 assistant 消息：chunk 只允许写给这些消息。
    this.drafts = new Set()
  }

  get prisma() {
    return this.database.prisma
  }

  async ensure() { return await this.database.ensure() }

  async readSoul() { return await this.database.readSoul() }
  async writeSoul(content) { return await this.database.writeSoul(content) }

  async readGlobal(category = 'general') { return await this.database.readGlobal(category) }
  async listGlobalCategories() { return await this.database.listGlobalCategories() }
  async readAllGlobal() { return await this.database.readAllGlobal() }
  async writeGlobal(category, content) { return await this.database.writeGlobal(category, content) }
  async addGlobal(category, content) { return await this.database.addGlobal(category, content) }
  async updateGlobal(category, target, content) {
    return await this.database.updateGlobal(category, target, content)
  }
  async deleteGlobal(category, target) { return await this.database.deleteGlobal(category, target) }

  async listSessions() { return await this.database.listSessions() }
  async getSession(id) { return await this.database.getSession(id) }
  async getSessionParentId(id) { return await this.database.getSessionParentId(id) }
  async getChat(id) { return await this.database.getChat(id) }
  async createSession(options = {}) { return await this.database.createSession(options) }
  async deleteSession(id) { return await this.database.deleteSession(id) }

  async appendToChat(id, message) {
    return await this.database.appendToChat(id, withMessageId(message))
  }

  async appendUserMessage(id, message) {
    return await this.database.appendUserMessage(id, withMessageId(message))
  }

  async setCrystal(id, crystal = '') { return await this.database.setCrystal(id, crystal) }
  async getCrystal(id) { return await this.database.getCrystal(id) }

  async appendPendingMemory(id, event) { return await this.database.appendPendingMemory(id, event) }
  async getPendingMemories(id) { return await this.database.getPendingMemories(id) }
  async clearPendingMemories(id) { return await this.database.clearPendingMemories(id) }

  async clearChat(id) { return await this.database.clearChat(id) }
  async rotateChat(id, keepTurns = 1) { return await this.database.rotateChat(id, keepTurns) }

  async getAgentMeta(key, fallback = null) { return await this.database.getAgentMeta(key, fallback) }
  async setAgentMeta(key, value) { return await this.database.setAgentMeta(key, value) }

  async getActiveSession() { return await this.database.getActiveSession() }
  async setActiveSession(id) { return await this.database.setActiveSession(id) }

  async beginAssistantMessage(sessionId, message = {}) {
    const messageId = await this.database.beginAssistantMessage(sessionId, withMessageId(message))
    this.drafts.add(messageId)
    return messageId
  }

  async appendAssistantChunk(messageId, kind, payload) {
    if (!this.drafts.has(messageId)) return null
    return await this.database.appendAssistantChunk(messageId, kind, payload)
  }

  async finalizeAssistantMessage(messageId, message, status = 'final') {
    try {
      await this.database.finalizeAssistantMessage(messageId, message, status)
    } finally {
      this.drafts.delete(messageId)
    }
  }

  async recoverInterruptedMessages() { return await this.database.recoverInterruptedMessages() }
}

function withMessageId(message) {
  return {
    ...message,
    id: message?.id || `msg_${crypto.randomUUID()}`,
  }
}

export default SessionPersistence
