import sessions from '../../../server/socket.io/services/sessions.js'

/**
 * 虚拟 LLM 客户端 —— 面向后台定时任务
 *
 * 架构说明：
 * - LLMMessageEvent.update() 已经负责写 streamCache（离线同步）
 * - VirtualLLMClient 只负责将消息实时推送给目标用户的在线 Socket 客户端
 * - 任务完成 / 失败通过 `done` Promise 通知 TaskRunnerService
 *
 * @param {string} taskId       - 任务 ID，用于日志和 requestId
 * @param {object} target
 * @param {string} target.userId     - 目标用户 ID（用于 sessions 查找）
 * @param {string} target.contactorId - 目标 Agent ID（前端对话窗口标识）
 */
export default class VirtualLLMClient {
  constructor(taskId, target = {}) {
    this.id = target.userId || 'system'
    this.ip = '127.0.0.1'
    this.isAdmin = true
    this.origin = 'system'

    this._taskId = taskId
    this._contactorId = target.contactorId || `task-${taskId}`
    this._requestId = `task-${taskId}`

    this.pendingStreams = new Map()
    this.activeEvents = new Map()

    // Promise 控制：TaskRunnerService await client.done 来等待任务结束
    this._resolve = null
    this._reject = null
    this.done = new Promise((resolve, reject) => {
      this._resolve = resolve
      this._reject = reject
    })

    // 将自己注册到全局会话池，以便在线客户端能通过 sessions 查找到并发送中断信号
    sessions.addSession(this)
  }

  /**
   * 模拟 WebUser 的 send 接口，用于接收来自 sessions 的指令（如同步、中断等）
   */
  send(message) {
    if (message.protocol === 'llm' && message.type === 'abort') {
      this.abortConnection(message.request_id)
    }
  }

  /**
   * 实现 WebUser 的 sendOpenaiMessage 接口
   * 由 LLMMessageEvent.res() 调用
   *
   * 注意：streamCache 的写入已经由 LLMMessageEvent.update() 完成，
   * 这里只做"在线实时推送"和"任务生命周期信号"。
   */
  sendOpenaiMessage(type, data, requestId) {
    // 构造标准协议消息
    const message = {
      request_id: requestId,
      protocol: 'llm',
      message: type,
      data,
    }

    switch (type) {
      case 'pending':
      case 'update':
        // 推送给该用户所有真实的在线客户端
        this._pushToOnlineClients(message)
        break

      case 'complete':
        this._pushToOnlineClients(message)
        logger.info(`[VirtualClient] Task "${this._taskId}" completed`)
        this._cleanup()
        this._resolve({ taskId: this._taskId, contactorId: this._contactorId })
        break

      case 'failed':
        this._pushToOnlineClients(message)
        logger.error(`[VirtualClient] Task "${this._taskId}" failed:`, data?.message || data)
        this._cleanup()
        this._reject(new Error(data?.message || 'Task failed'))
        break
    }
  }

  /**
   * 找到目标用户的在线 Socket 客户端并推送消息
   * 排除掉自己（虚拟客户端），只发给真实的 WebSocket 连接
   */
  _pushToOnlineClients(message) {
    try {
      const allClients = sessions.getClientsByUserId(this.id, true)
      if (allClients) {
        allClients.forEach(c => {
          // 只有真正的 WebUser 才有 socket 属性
          if (c !== this && c.socket) {
            c.send(message)
          }
        })
      }
    } catch (e) {
      logger.error('[VirtualClient] 推送消息失败:', e.message)
    }
  }

  /**
   * 注册网络流
   */
  pushConnection(id, stream) {
    this.pendingStreams.set(id, stream)
  }

  /**
   * 移除网络流
   */
  popConnection(id) {
    this.pendingStreams.delete(id)
  }

  /**
   * 注册事件
   */
  pushEvent(id, event) {
    this.activeEvents.set(id, event)
  }

  /**
   * 移除事件
   */
  popEvent(id) {
    this.activeEvents.delete(id)
  }

  abortConnection(id) {
    const stringId = String(id)
    let event = this.activeEvents.get(stringId)
    let stream = this.pendingStreams.get(stringId)

    if (!event) {
      for (const [key, value] of this.activeEvents.entries()) {
        if (key.endsWith(stringId) || stringId.endsWith(key)) {
          event = value
          break
        }
      }
    }

    if (!stream) {
      for (const [key, value] of this.pendingStreams.entries()) {
        if (key.endsWith(stringId) || stringId.endsWith(key)) {
          stream = value
          break
        }
      }
    }

    if (event) {
      logger.info(`[VirtualClient] 收到中断信号，正在终止事件: ${event.requestId}`)
      event.abort()
    }

    if (stream) {
      logger.info(`[VirtualClient] 正在关闭网络流`)
      if (stream.controller && typeof stream.controller.abort === 'function') {
        stream.controller.abort()
      } else if (typeof stream.abort === 'function') {
        stream.abort()
      }
    }

    if (this._resolve) {
      logger.info(`[VirtualClient] 任务 "${this._taskId}" 被中止，正在唤醒 TaskRunnerService 并清理会话`)
      this._cleanup()
      this._resolve({ taskId: this._taskId, contactorId: this._contactorId, aborted: true })
      this._resolve = null
      this._reject = null
    }
  }

  _cleanup() {
    sessions.removeSession(this)
    this.pendingStreams.clear()
    this.activeEvents.clear()
  }

  // --- 兼容性空实现 ---
  initCacheMesageMethod() {}
}
