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
        chunks: [],
        lastUpdate: Date.now(),
        messageId,
        metaData,
        status: 'streaming',
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
        // Duration 仍然为 0，表示还在进行中
      } else {
        // 新的推理块
        item.chunks.push({
          data: {
            duration: 0,
            startTime: chunk.data.startTime,
            text: chunk.data.text,
          },
          type: 'reason',
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
        if (c.type !== 'toolCall') {return false}
        if (toolId && c.content.id === toolId) {return true}
        if (toolIndex !== undefined && c.content.index === toolIndex) {return true}
        return false
      })

      if (existingToolCall) {
        if (chunk.content.name) {existingToolCall.content.name = chunk.content.name}
        if (chunk.content.id) {existingToolCall.content.id = chunk.content.id}
        if (chunk.content.action) {existingToolCall.content.action = chunk.content.action}
        if (chunk.content.result !== undefined && chunk.content.result !== '') {
          existingToolCall.content.result = chunk.content.result
        }
        if (chunk.content.displayName) {existingToolCall.content.displayName = chunk.content.displayName}
        if (chunk.content.extraRender) {existingToolCall.content.extraRender = chunk.content.extraRender}

        const newArgs = chunk.content.arguments ?? chunk.content.parameters
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
          content: JSON.parse(JSON.stringify(chunk.content)),
          type: chunk.type,
        })
      }
    } else if (chunk.type === 'tool_result') {
      const existingToolCall = toolId
        ? item.chunks.find((c) => c.type === 'toolCall' && c.content.id === toolId)
        : item.chunks.find((c) => c.type === 'toolCall' && c.content.index === chunk.content.index)

      if (existingToolCall) {
        existingToolCall.content.result = chunk.content.result
        existingToolCall.content.status = 'done'
      }
    } else if (chunk.type === 'crystallize') {
      const existingCrystallize = item.chunks.find((c) => c.type === 'crystallize')
      if (existingCrystallize) {
        existingCrystallize.content.status = chunk.content.status
        if (chunk.content.summary !== undefined) {
          existingCrystallize.content.summary = chunk.content.summary
        }
      } else {
        item.chunks.push({
          content: JSON.parse(JSON.stringify(chunk.content)),
          type: 'crystallize',
        })
      }
    } else {
      item.chunks.push({
        content: typeof chunk.content === 'object' ? JSON.parse(JSON.stringify(chunk.content)) : chunk.content,
        type: chunk.type,
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
    if (!messages || messages.length === 0) {return true}

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
        const resultLen = typeof c.content.result === 'string' ? c.content.result.length : (c.content.result ? 10 : 0)
        const paramsLen = typeof c.content.parameters === 'string' ? c.content.parameters.length : 0
        const extraLen = Array.isArray(c.content.extraRender) ? c.content.extraRender.length : 0
        return acc + actionLen + resultLen + paramsLen + extraLen + 1
      } else if (c.type === 'crystallize') {
        const statusLen = (c.content?.status || '').length
        const summaryLen = (c.content?.summary || '').length
        return acc + statusLen + summaryLen + 1
      }
      return acc + 1
    }, 0)
  }

  /**
   * 读取快照，不做任何清理
   * 缓存的唯一清除入口是客户端持久化后回传的 ack_message（见 deleteMessage）。
   * 此处若提前删除终态消息，sync 帧在网络上丢失时消息会两边都没有。
   * 返回 Array<Message>
   */
  snapshot(userId, contactorId) {
    const key = `${userId}:${contactorId}`
    const messages = this.cache.get(key)
    if (!messages) {return null}
    return [...messages]
  }

  /**
   * 显式删除该 Agent 下的所有缓存
   */
  delete(userId, contactorId) {
    const key = `${userId}:${contactorId}`
    this.cache.delete(key)
  }

  /**
   * 定点删除该 Agent 下指定 messageId 的缓存，防止误清并发流
   */
  deleteMessage(userId, contactorId, messageId) {
    const key = `${userId}:${contactorId}`
    const messages = this.cache.get(key)
    if (messages) {
      const remaining = messages.filter((m) => m.messageId !== messageId)
      if (remaining.length > 0) {
        this.cache.set(key, remaining)
      } else {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 获取指定消息的纯文本内容
   */
  getMessageText(userId, contactorId, messageId) {
    const key = `${userId}:${contactorId}`
    const messages = this.cache.get(key)
    if (!messages) {return ''}
    const item = messages.find((m) => m.messageId === messageId)
    if (!item) {return ''}

    return item.chunks
      .filter((c) => c.type === 'content')
      .map((c) => c.content)
      .join('')
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
