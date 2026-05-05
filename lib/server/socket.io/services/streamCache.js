/**
 * 结构化流式消息缓存服务 (支持单 Agent 多消息并发缓存)
 */
class StreamCacheService {
  constructor() {
    // Key: userId:contactorId
    // Value: Array<{ messageId, chunks: [], metaData, status, lastUpdate, syncedMark }>
    this.cache = new Map()
  }

  /**
   * 推送 chunk 并保持顺序
   */
  push(userId, contactorId, messageId, chunk, metaData) {
    const key = `${userId}:${contactorId}`
    if (!this.cache.has(key)) {
      this.cache.set(key, [])
    }

    const messages = this.cache.get(key)
    let item = messages.find((m) => m.messageId === messageId)

    // 如果该消息 ID 是第一次见，创建一个新消息桶
    if (!item) {
      item = {
        messageId,
        chunks: [],
        metaData,
        status: 'streaming',
        lastUpdate: Date.now(),
        syncedMark: 0,
      }
      messages.push(item)
    }

    item.lastUpdate = Date.now()
    item.status = 'streaming' // 只要有 push 进来，状态恢复为 streaming

    // 智能合并逻辑保持不变...
    this._mergeChunk(item, chunk)
  }

  /**
   * 内部合并逻辑 (从原 push 抽取)
   */
  _mergeChunk(item, chunk) {
    const lastChunk = item.chunks[item.chunks.length - 1]

    // 处理 reason 类型 (推理链)
    if (chunk.type === 'reason') {
      if (lastChunk && lastChunk.type === 'reason') {
        lastChunk.data.text += chunk.data.text
        // duration 仍然为 0，表示还在进行中
      } else {
        // 新的推理块
        item.chunks.push({
          type: 'reason',
          data: {
            text: chunk.data.text,
            startTime: chunk.data.startTime,
            duration: 0,
          },
        })
      }
      return
    }

    // 如果当前收到的不是 reason 类型，但上一个块是 reason 且 duration 为 0，说明推理结束
    if (lastChunk && lastChunk.type === 'reason' && lastChunk.data.duration === 0) {
      lastChunk.data.duration = Date.now() - lastChunk.data.startTime
    }

    if (lastChunk && lastChunk.type === chunk.type && typeof chunk.content === 'string') {
      lastChunk.content += chunk.content
    } else if (chunk.type === 'toolCall') {
      const toolId = chunk.content.id
      const toolIndex = chunk.content.index

      const existingToolCall = item.chunks.find((c) => {
        if (c.type !== 'toolCall') return false
        if (toolId && c.content.id === toolId) return true
        if (toolIndex !== undefined && c.content.index === toolIndex) return true
        return false
      })

      if (existingToolCall) {
        if (chunk.content.name) existingToolCall.content.name = chunk.content.name
        if (chunk.content.id) existingToolCall.content.id = chunk.content.id
        if (chunk.content.action) existingToolCall.content.action = chunk.content.action
        if (chunk.content.result !== undefined && chunk.content.result !== '') {
          existingToolCall.content.result = chunk.content.result
        }
        let newArgs = chunk.content.arguments ?? chunk.content.parameters
        if (newArgs) {
          if (chunk.content.action === 'pending') {
            if (existingToolCall.content.arguments !== undefined) {
              existingToolCall.content.arguments += newArgs
            } else {
              existingToolCall.content.parameters = (existingToolCall.content.parameters || '') + newArgs
            }
          } else {
            const argsStr = typeof newArgs === 'string' ? newArgs : JSON.stringify(newArgs)
            if (existingToolCall.content.arguments !== undefined) {
              existingToolCall.content.arguments = argsStr
            } else {
              existingToolCall.content.parameters = argsStr
            }
          }
        }
      } else {
        item.chunks.push({
          type: chunk.type,
          content: JSON.parse(JSON.stringify(chunk.content)),
        })
      }
    } else if (chunk.type === 'tool_result') {
      const toolId = chunk.content.id
      const existingToolCall = toolId
        ? item.chunks.find((c) => c.type === 'toolCall' && c.content.id === toolId)
        : item.chunks.find((c) => c.type === 'toolCall' && c.content.index === chunk.content.index)

      if (existingToolCall) {
        existingToolCall.content.result = chunk.content.result
        existingToolCall.content.status = 'done'
      }
    } else {
      item.chunks.push({
        type: chunk.type,
        content: typeof chunk.content === 'object' ? JSON.parse(JSON.stringify(chunk.content)) : chunk.content,
      })
    }
  }

  /**
   * 标记同步点 (针对该 Agent 下的所有消息)
   */
  markSynced(userId, contactorId) {
    const key = `${userId}:${contactorId}`
    const messages = this.cache.get(key)
    if (messages) {
      messages.forEach((item) => {
        item.syncedMark = this._calculateMark(item.chunks)
      })
    }
  }

  /**
   * 检查是否已经同步过 (只要数组中任何一个消息有新内容就返回 false)
   */
  isAlreadySynced(userId, contactorId) {
    const key = `${userId}:${contactorId}`
    const messages = this.cache.get(key)
    if (!messages || messages.length === 0) return true

    // 只要有一个消息还没同步完，就认为整体没同步完
    return messages.every((item) => {
      const currentMark = this._calculateMark(item.chunks)
      return currentMark <= (item.syncedMark || 0)
    })
  }

  _calculateMark(chunks) {
    return chunks.reduce((acc, c) => {
      if (typeof c.content === 'string') {
        return acc + c.content.length
      } else if (c.type === 'reason') {
        return acc + (c.data.text || '').length + 1
      } else if (c.type === 'toolCall') {
        const actionLen = (c.content.action || '').length
        const resultLen = typeof c.content.result === 'string' ? c.content.result.length : c.content.result ? 10 : 0
        return acc + actionLen + resultLen + 1
      }
      return acc + 1
    }, 0)
  }

  /**
   * 取出并清理
   * 返回 Array<Message>
   */
  pop(userId, contactorId) {
    const key = `${userId}:${contactorId}`
    const messages = this.cache.get(key)
    if (!messages) return null

    // 复制一份用于返回
    const result = [...messages]

    // 清理逻辑：只保留正在 streaming 的消息，删除已完成/失败的消息
    const remaining = messages.filter((m) => m.status === 'streaming')
    if (remaining.length > 0) {
      this.cache.set(key, remaining)
    } else {
      this.cache.delete(key)
    }

    return result
  }

  /**
   * 显式删除该 Agent 下的所有缓存
   */
  delete(userId, contactorId) {
    const key = `${userId}:${contactorId}`
    this.cache.delete(key)
  }

  complete(userId, contactorId, messageId) {
    const key = `${userId}:${contactorId}`
    const messages = this.cache.get(key)
    if (messages) {
      const item = messages.find((m) => m.messageId === messageId)
      if (item) {
        item.status = 'completed'
        // 检查最后一个块是否是正在进行的推理块
        const lastChunk = item.chunks[item.chunks.length - 1]
        if (lastChunk && lastChunk.type === 'reason' && lastChunk.data.duration === 0) {
          lastChunk.data.duration = Date.now() - lastChunk.data.startTime
        }
      }
    }
  }

  fail(userId, contactorId, messageId, error) {
    const key = `${userId}:${contactorId}`
    const messages = this.cache.get(key)
    if (messages) {
      const item = messages.find((m) => m.messageId === messageId)
      if (item) {
        item.status = 'failed'
        item.error = error
        // 同样检查最后一个块
        const lastChunk = item.chunks[item.chunks.length - 1]
        if (lastChunk && lastChunk.type === 'reason' && lastChunk.data.duration === 0) {
          lastChunk.data.duration = Date.now() - lastChunk.data.startTime
        }
      }
    }
  }

  getPendingContactors(userId) {
    const contactors = []
    const prefix = `${userId}:`
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        contactors.push(key.substring(prefix.length))
      }
    }
    return contactors
  }

  gc() {
    const now = Date.now()
    const TIMEOUT = 1000 * 60 * 60 * 24
    for (const [key, messages] of this.cache.entries()) {
      const filtered = messages.filter((m) => now - m.lastUpdate < TIMEOUT)
      if (filtered.length === 0) {
        this.cache.delete(key)
      } else {
        this.cache.set(key, filtered)
      }
    }
  }
}

export default new StreamCacheService()
