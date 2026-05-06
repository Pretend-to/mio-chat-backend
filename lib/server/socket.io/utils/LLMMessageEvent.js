import streamCache from '../services/streamCache.js'
import sessions from '../services/sessions.js'
import logger from '../../../../utils/logger.js'

export default class LLMMessageEvent {
  constructor(req, client) {
    this.body = req.data

    this.metaData = req.metaData || {}

    this.requestId = req.request_id

    this._everUpdate = false

    const { id, ip, isAdmin, origin } = client

    this.user = { id, ip, isAdmin, origin }

    this.client = client
    this.aborted = false
    this._abortCallbacks = []
    this.requestStartTime = Date.now() // 后端发起请求的绝对时间戳
    this.currentReasoningStartTime = null // 当前推理段的开始时间
    this.lastChunkType = null // 上一个 chunk 的类型
  }

  abort() {
    this.aborted = true
    this._abortCallbacks.forEach(cb => cb())
    logger.info(`Request ${this.requestId} aborted by user`)
  }

  onAbort(callback) {
    if (this.aborted) {
      callback()
    } else {
      this._abortCallbacks.push(callback)
    }
  }

  pending() {
    logger.debug('LLM Message pending')
    this.res('pending', {})
  }

  update(chunk) {
    if (!this._everUpdate) {
      this._everUpdate = true
    }

    let finalChunk = chunk
    const currentType = chunk.type

    // 自动转换为 reason 类型并注入 startTime
    if (currentType === 'reasoningContent') {
      // 如果上一条不是 reasoning，或者是第一条 reasoning，则记录当前段的开始时间
      if (this.lastChunkType !== 'reasoningContent') {
        this.currentReasoningStartTime = Date.now()
      }

      finalChunk = {
        type: 'reason',
        data: {
          text: chunk.content,
          startTime: this.currentReasoningStartTime,
          duration: 0
        }
      }
    }
    
    this.lastChunkType = currentType
    
    // 缓存到服务端，用于重连同步
    if (this.metaData.contactorId) {
      streamCache.push(
        this.user.id,
        this.metaData.contactorId,
        this.requestId,
        finalChunk,
        this.metaData
      )

      // --- 核心修复：检查水位线 ---
      // 如果该 chunk 已经被包含在刚刚发送给客户端的 sync 快照中了，则不再重复发送 update
      if (streamCache.isAlreadySynced(this.user.id, this.metaData.contactorId)) {
        // logger.debug(`[Sync] 拦截重复 chunk 发送: ${this.requestId}`)
        return
      }
    }

    this.res('update', finalChunk)
  }
  complete() {
    if (this.metaData.contactorId) {
      streamCache.complete(this.user.id, this.metaData.contactorId, this.requestId)

      // --- 核心优化：在线即签收 ---
      // 只要用户有任何一个真实的在线客户端，前端 Contactor 就会在后台自动处理并持久化消息。
      // 因此，只要用户在线，任务完成后即可清理服务器缓存。
      const allClients = sessions.getClientsByUserId(this.user.id, true)
      const isOnline = allClients?.some(c => c.socket) // 检查是否有真实的 WebSocket 连接

      if (isOnline) {
        logger.info(`[Sync] 用户 ${this.user.id} 当前在线，任务消息已实时送达，立即清理服务器缓存`)
        streamCache.delete(this.user.id, this.metaData.contactorId)
      }
    }

    if (!this._everUpdate) {
      const Tip = '模型无响应，请检查输入是否合法！'
      this.update({
        type: 'content',
        content: Tip,
      })
    }
    logger.debug('LLM Message complete')
    this.res('complete', {})
    
    // 自动总结逻辑 (异步执行，不阻塞主流程)
    this._checkAndSummarize().catch(err => {
      logger.error('[LLMMessageEvent] Auto-summarization error:', err)
    })

    this.client.popEvent(this.requestId) // 任务完成，清理注册
  }

  /**
   * 检查并执行自动总结
   * @private
   */
  async _checkAndSummarize() {
    // 仅针对对话请求 (包含 contactorId) 且不是内部标题生成任务本身
    if (!this.metaData.contactorId || this.requestId.startsWith('system_title_')) {
      return
    }

    const messages = this.body.messages || []
    // 关键修复：排除系统消息，只计算真实对话消息
    const currentCount = messages.filter(m => m.role !== 'system').length

    // 性能优化：检查联系人的名称策略。如果不是自动总结模式 (2)，则不进行任何操作。
    const namePolicy = this.metaData.namePolicy
    
    if (Number(namePolicy) !== 2) {
      logger.debug(`[AutoTitle] Skipping for ${this.metaData.contactorId} due to namePolicy: ${namePolicy} (type: ${typeof namePolicy})`)
      return
    }

    // 触发阈值：第 1 次 AI 回复后 (messages.length 为 1, 即只有 1 条 User 消息)，
    // 以及之后的每 6 条 (7, 13, ...)
    if (currentCount === 1 || (currentCount > 1 && (currentCount - 1) % 6 === 0)) {
      const llmService = (await import('../../../chat/llm/index.js')).default
      
      // 获取当前刚刚完成的 AI 回复内容 (getMessageText 已自动过滤掉 reasoningContent)
      const aiResponse = streamCache.getMessageText(this.user.id, this.metaData.contactorId, this.requestId)
      
      // 构造用于标题生成的完整上下文 (历史 + 当前回复)
      const titleContext = [...messages]
      if (aiResponse) {
        titleContext.push({ role: 'assistant', content: aiResponse })
      }

      const newTitle = await llmService.generateChatTitle(titleContext)
      
      if (newTitle) {
        // 推送更新信号给所有端
        const allClients = sessions.getClientsByUserId(this.user.id, true)
        if (allClients) {
          allClients.forEach(c => {
            c.sendSystemMessage('chat_title_updated', {
              contactorId: this.metaData.contactorId,
              title: newTitle
            })
          })
        }
      }
    }
  }
  reply(chunk) {
    this.res('reply', chunk)
  }
  error(error) {
    logger.error(error)
    // 删掉错误信息中的堆栈信息
    if (error && error.stack) {
      delete error.stack
    }
    // 看看message是否是对象，如果是对象，序列化一下
    try {
      const errorObject = JSON.parse(error.message)
      error.message = errorObject
    } catch {
      // 如果不是 JSON 字符串则跳过，保持原样
    }
    // 把Error对象转换成普通对象
    const errorObject = {
      message: error.message || '未知错误',
      ...error, // 复制其他属性
    }

    if (this.metaData.contactorId) {
      streamCache.fail(this.user.id, this.metaData.contactorId, this.requestId, errorObject)
    }

    this.res('failed', errorObject)
    this.client.popEvent(this.requestId) // 任务失败，清理注册
  }

  res(type, data) {
    let fullData = {
      metaData: this.metaData,
    }

    if (typeof data === 'string') {
      fullData.message = data
    } else if (typeof data === 'object' && data !== null) {
      fullData = { ...data, metaData: this.metaData }
    } else {
      console.warn('Unexpected data type:', typeof data, data) // 记录警告
    }

    this.client.sendOpenaiMessage(type, fullData, this.requestId)
  }
}
