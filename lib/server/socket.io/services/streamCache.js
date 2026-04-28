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
        syncedMark: 0,
      })
    }

    const item = this.cache.get(key)
    item.lastUpdate = Date.now()
    
    // --- 核心修复：识别新任务 ---
    // 如果 messageId 变了，说明是新的一轮生成（比如用户点了重试，或者发了新消息）
    // 必须清空旧的堆积内容，防止新老消息混淆
    if (item.messageId !== messageId) {
      item.messageId = messageId
      item.chunks = []
      item.syncedMark = 0
      item.status = 'streaming'
    }

    // 智能合并：保持流的紧凑性
    const lastChunk = item.chunks[item.chunks.length - 1]
    
    // 1. 合并文本 (reasoning 或 content)
    if (lastChunk && lastChunk.type === chunk.type && typeof chunk.content === 'string') {
      lastChunk.content += chunk.content
    } 
    // 2. 合并工具调用 (基于 index 进行增量更新)
    else if (lastChunk && lastChunk.type === 'toolCall' && chunk.type === 'toolCall' && lastChunk.content.index === chunk.content.index) {
      // 合并参数和名称
      if (chunk.content.name) lastChunk.content.name = chunk.content.name
      if (chunk.content.arguments) lastChunk.content.arguments = (lastChunk.content.arguments || '') + chunk.content.arguments
      if (chunk.content.id) lastChunk.content.id = chunk.content.id
    }
    // 3. 否则作为新块存入
    else {
      // 深度克隆一下，防止后续修改影响原始引用 (特别是对象类型)
      item.chunks.push({
        type: chunk.type,
        content: typeof chunk.content === 'object' ? JSON.parse(JSON.stringify(chunk.content)) : chunk.content
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
