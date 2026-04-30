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
    // 2. 合并工具调用 (支持并发：只要 id 或 index 匹配上就认为是同一个工具)
    else if (chunk.type === 'toolCall') {
      const toolId = chunk.content.id;
      const toolIndex = chunk.content.index;
      
      const existingToolCall = item.chunks.find(c => {
        if (c.type !== 'toolCall') return false;
        // 如果 id 匹配
        if (toolId && c.content.id === toolId) return true;
        // 如果 index 匹配 (且两者都有有效 index)
        if (toolIndex !== undefined && c.content.index === toolIndex) return true;
        return false;
      });

      if (existingToolCall) {
        if (chunk.content.name) existingToolCall.content.name = chunk.content.name;
        if (chunk.content.id) existingToolCall.content.id = chunk.content.id;
        
        // 更新执行动作和结果
        if (chunk.content.action) existingToolCall.content.action = chunk.content.action;
        if (chunk.content.result !== undefined && chunk.content.result !== '') {
          existingToolCall.content.result = chunk.content.result;
        }
        
        // 兼容 arguments 和 parameters
        let newArgs = chunk.content.arguments;
        if (newArgs === undefined) {
          newArgs = chunk.content.parameters;
        }

        if (newArgs) {
          // 如果是 pending，说明是流式增量碎片（Delta），需要追加
          if (chunk.content.action === 'pending') {
            if (existingToolCall.content.arguments !== undefined) {
              existingToolCall.content.arguments += newArgs;
            } else {
              existingToolCall.content.parameters = (existingToolCall.content.parameters || '') + newArgs;
            }
          } else {
            // 如果是 started/running/finished，说明是全量参数（Full），直接覆盖
            // 把对象转换为字符串，统一数据结构，防止[object Object]错误
            const argsStr = typeof newArgs === 'string' ? newArgs : JSON.stringify(newArgs);
            if (existingToolCall.content.arguments !== undefined) {
              existingToolCall.content.arguments = argsStr;
            } else {
              existingToolCall.content.parameters = argsStr;
            }
          }
        }
      } else {
        item.chunks.push({
          type: chunk.type,
          content: JSON.parse(JSON.stringify(chunk.content))
        })
      }
    }
    // 2.5 合并工具结果 (用 id 查找)
    else if (chunk.type === 'tool_result') {
      const toolId = chunk.content.id;
      const existingToolCall = toolId 
        ? item.chunks.find(c => c.type === 'toolCall' && c.content.id === toolId)
        : item.chunks.find(c => c.type === 'toolCall' && c.content.index === chunk.content.index);

      if (existingToolCall) {
        existingToolCall.content.result = chunk.content.result
        existingToolCall.content.status = 'done' // 标记已完成
      }
    }
    // 3. 否则作为新块存入
    else {
      item.chunks.push({
        type: chunk.type,
        content: typeof chunk.content === 'object' ? JSON.parse(JSON.stringify(chunk.content)) : chunk.content
      })
    }
  }

  /**
   * 标记同步点 (基于内容状态计算哈希水位线)
   */
  markSynced(userId, contactorId) {
    const key = `${userId}:${contactorId}`
    if (this.cache.has(key)) {
      const item = this.cache.get(key)
      item.syncedMark = this._calculateMark(item.chunks)
    }
  }

  isAlreadySynced(userId, contactorId) {
    const key = `${userId}:${contactorId}`
    const item = this.cache.get(key)
    if (!item || item.syncedMark === undefined) return false

    const currentMark = this._calculateMark(item.chunks)
    return currentMark <= item.syncedMark
  }

  /**
   * 计算内容的“权值”或“版本水位线”
   * 确保文本增长或工具状态改变都能引起权值变化
   */
  _calculateMark(chunks) {
    return chunks.reduce((acc, c) => {
      if (typeof c.content === 'string') {
        return acc + c.content.length
      } else if (c.type === 'toolCall') {
        // 工具调用的权值 = action 长度 + 结果长度 + 1
        const actionLen = (c.content.action || '').length
        const resultLen = (typeof c.content.result === 'string' ? c.content.result.length : (c.content.result ? 10 : 0))
        return acc + actionLen + resultLen + 1
      }
      return acc + 1
    }, 0)
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
