import logger from '../../../../utils/logger.js'

/**
 * 结构化流式消息缓存服务 (基于数组确保顺序)
 */
class StreamCacheService {
  constructor() {
    // Key: userId:contactorId
    // Value: { messageId, chunks: [], metaData, status, lastUpdate, syncedMark }
    this.cache = new Map()

    setInterval(() => this.gc(), 1000 * 60 * 10)
  }

  /**
   * 推送 chunk 并保持顺序
   */
  push(userId, contactorId, messageId, chunk, metaData) {
    const key = `${userId}:${contactorId}`
    if (!this.cache.has(key)) {
      this.cache.set(key, {
        messageId,
        chunks: [],
        metaData,
        status: 'streaming',
        lastUpdate: Date.now(),
        syncedMark: 0
      })
    }

    const item = this.cache.get(key)
    item.lastUpdate = Date.now()
    item.messageId = messageId

    // 智能合并：如果最后一条 chunk 类型相同且是文本，则合并
    const lastChunk = item.chunks[item.chunks.length - 1]
    if (lastChunk && lastChunk.type === chunk.type && typeof chunk.content === 'string') {
      lastChunk.content += chunk.content
    } else {
      // 否则作为新块存入，保持顺序
      item.chunks.push({
        type: chunk.type,
        content: chunk.content
      })
    }
  }

  /**
   * 标记同步点 (基于 chunk 数量和内容总长度)
   */
  markSynced(userId, contactorId) {
    const key = `${userId}:${contactorId}`
    if (this.cache.has(key)) {
      const item = this.cache.get(key)
      // 计算当前所有文本内容的累计长度作为水位线
      item.syncedMark = item.chunks.reduce((acc, c) => {
        return acc + (typeof c.content === 'string' ? c.content.length : 1)
      }, 0)
    }
  }

  isAlreadySynced(userId, contactorId) {
    const key = `${userId}:${contactorId}`
    const item = this.cache.get(key)
    if (!item || item.syncedMark === undefined) return false
    
    const currentMark = item.chunks.reduce((acc, c) => {
      return acc + (typeof c.content === 'string' ? c.content.length : 1)
    }, 0)
    
    return currentMark <= item.syncedMark
  }

  pop(userId, contactorId) {
    const key = `${userId}:${contactorId}`
    const data = this.cache.get(key)
    if (data && data.status !== 'streaming') {
      this.cache.delete(key)
    }
    return data
  }

  complete(userId, contactorId) {
    const key = `${userId}:${contactorId}`
    if (this.cache.has(key)) {
      this.cache.get(key).status = 'completed'
    }
  }

  fail(userId, contactorId, error) {
    const key = `${userId}:${contactorId}`
    if (this.cache.has(key)) {
      const item = this.cache.get(key)
      item.status = 'failed'
      item.error = error
    }
  }

  gc() {
    const now = Date.now()
    const TIMEOUT = 1000 * 60 * 5
    for (const [key, value] of this.cache.entries()) {
      if (now - value.lastUpdate > TIMEOUT) {
        this.cache.delete(key)
      }
    }
  }
}

export default new StreamCacheService()
