import EventEmitter from 'events'
import { randomBytes } from 'node:crypto'
import llm from '../../../chat/llm/index.js'
import config from '../../../config.js'
import streamCache from './streamCache.js'
import sessions from './sessions.js'
// Import openai from '../../../chat/llm/adapters/openai.js'

// 进程启动标识：后端每次重启都会变化，用于前端检测"服务器已重启"并清扫卡死的工具调用
export const BOOT_ID = `${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`

export default class WebUser extends EventEmitter {
  constructor(info, socket) {
    super()
    this.id = info.id
    this.ip = info.ip
    this.socket = socket
    this.isAdmin = info.isAdmin
    this.origin = info.origin
    this.firstLogin = info.firstLogin
    this.LostHeartBeat = 0
    this.heartbeatInterval = null
    this.pendingStreams = new Map()
    // 跨连接持久化活跃事件集，防止页面刷新/重连导致活跃交互挂起回调丢失
    let cachedClient = sessions.cache.get(String(this.id))
    this.isNewSession = !cachedClient
    if (!cachedClient) {
      cachedClient = {
        activeEvents: new Map(),
        addCachedMessage(message) { this.cachedMessages.push(message) },
        cachedMessages: [],
        clearMessages() { this.cachedMessages = [] },
        expires: Date.now() + 1000 * 60 * 60 * 24,
        getCachedMessages() { return this.cachedMessages },
        id: this.id,
        isAdmin: this.isAdmin
      }
      sessions.cache.set(String(this.id), cachedClient)
    }
    this.activeEvents = cachedClient.activeEvents
    this.activeContactorId = null
    this.cacheMesageMethod = null

    this.socket.on('disconnect', () => {
      clearInterval(this.heartbeatInterval)
      this.socket = null
      this.emit('close', this)
    })
    this.socket.on('message', (message) => {
      let e
      try {
        e = JSON.parse(message)
        // 校验消息合法性
        // Logger.debug(e)
        if (!e.request_id || !e.protocol || !e.data) {
          throw new Error('消息格式错误')
        }
      } catch (error) {
        logger.error(`客户端 ${  this.id  } 传入非法消息${  message}`)
        logger.error(error)
        return
      }

      if (e.protocol === 'onebot') {
        logger.debug(e.data)
        e.sender = {
          id: this.id,
          isAdmin: this.isAdmin,
        }

        e.message_id = this.sendResponse(e.request_id)

        // Logger.debug(e)
        this.emit('onebot_message', e)

        e.data.forEach((item) => {
          if (item.type === 'text') {
            logger.info(`收到来自 ${this.id} 的消息：${item.data.text}`)
          } else {
            logger.info(
              `收到来自 ${this.id} 的消息：${
                item.type === 'image'
                  ? '图片'
                  : (item.type === 'record'
                    ? '语音'
                    : '未知类型:' + item.type)
              }`,
            )
          }
        })
      } else if (e.protocol === 'system') {
        if (e.type === 'heartbeat') {
          this.heartbeat(e)
        } else if (e.type === 'get_presets') {
          this.sendPresets(e.request_id)
        }
      } else if (e.protocol === 'llm') {
        if (e.type === 'abort') {
          this.abortConnection(e.request_id)
        } else {
          this.emit('llm_message', e)
        }
      } else if (e.protocol === 'channel') {
        this.emit('channel_message', e)
      } else if (e.protocol === 'logs') {
        this.emit('logs_message', e)
      } else {
        logger.error(`客户端 ${  this.id  } 传入非法协议${  e.protocol}`)
      }
    })

    this.socket.on('interruptGeneration', (data) => {
      const { messageId, contactorId } = data
      logger.info(`[Socket] 收到来自用户 ${this.id} 的中断信号: 消息 ${messageId}, 联系人 ${contactorId}`)
      
      this.abortConnection(messageId)
    })

    // 监听前端双向长连接回传的交互决策指令
    this.socket.on('tool:interact', (data, ack) => {
      const { interactionId, requestId, payload } = data
      logger.info(`[Socket] 收到来自用户 ${this.id} 的交互反馈: ID ${interactionId}, 请求 ${requestId}`)
      const reply = (result) => {
        if (typeof ack === 'function') {
          try { ack(result) } catch {}
        }
      }
      
      // 1. 从当前 client 活跃的消息事件集中寻找目标 Event 
      const event = this.activeEvents.get(String(requestId))
      if (!event) {
        logger.warn(`[Socket] 交互反馈失效：未找到 requestId 为 ${requestId} 的活跃会话`)
        this.sendSystemMessage('tool:interact:error', { error: '请求会话已过期或失效', interactionId })
        reply({ ok: false, interactionId, requestId, error: '请求会话已过期或失效' })
        return
      }

      // 2. 将数据注入挂起的 Promise，恢复大模型工具执行
      const success = event.emitInteraction(interactionId, payload)
      if (success) {
        logger.info(`[Socket] 成功派发反馈指令给 ${interactionId}，工具恢复运行`)
        reply({ ok: true, interactionId, requestId })
      } else {
        this.sendSystemMessage('tool:interact:error', { error: '交互失败：已超时或已被处理', interactionId })
        reply({ ok: false, interactionId, requestId, error: '交互失败：已超时或已被处理' })
      }
    })

    // 备用监听方式：处理作为普通消息传来的中断信号
    this.on('interruptGeneration', (data) => {
      console.log(`[EventEmitter] 收到内部中断信号: ${data.messageId}`)
      this.abortConnection(data.messageId)
    })

    this.login()
  }

  send(message) {
    try {
      this.socket.emit('message', JSON.stringify(message))
    } catch {
      // 只有非 llm 协议或者 socket 还没断开时的意外失败才打印警告
      if (message.protocol !== 'llm') {
        logger.warn(`客户端${  this.id  }发送消息失败`)
      }

      // 调用缓存方法
      if (this.cacheMesageMethod) {
        // Llm 协议不再打印冗长的“缓存消息”日志，因为它现在是静默后台生成
        if (message.protocol !== 'llm') {
          logger.info(`缓存消息：${  JSON.stringify(message)}`)
        }
        this.cacheMesageMethod(message)
      }
    }
  }

  pushConnection(id, stream) {
    this.pendingStreams.set(String(id), stream)
  }

  pushEvent(id, event) {
    this.activeEvents.set(String(id), event)
  }

  popEvent(id) {
    this.activeEvents.delete(String(id))
  }

  abortConnection(id, broadcast = true) {
    const stringId = String(id)
    
    // 1. 中断当前在线客户端下的指定请求
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
      event.abort()
    }

    if (stream) {
      if (stream.controller && typeof stream.controller.abort === 'function') {
        stream.controller.abort()
      } else if (typeof stream.abort === 'function') {
        stream.abort()
      } else if (stream.controller && typeof stream.controller.abortCallback === 'function') {
        stream.controller.abortCallback()
      }
    }

    // 2. 跨客户端广播中断信号 (仅当 broadcast 为 true 时执行一次)
    if (broadcast) {
      const allClients = sessions.getClientsByUserId(this.id, true)
      if (allClients) {
        allClients.forEach((client) => {
          if (client !== this && typeof client.abortConnection === 'function') {
            // 设置 broadcast 为 false，防止无限递归
            client.abortConnection(id, false)
          }
        })
      }
    }
  }

  initCacheMesageMethod(method) {
    this.cacheMesageMethod = method
  }

  popConnection(id) {
    this.pendingStreams.delete(String(id))
  }

  async sendMessage(protocol, data) {
    const message = {
      data: {
        content: data.content,
        id: data.user_id,
        message_id: data.message_id,
        type: data.type,
      },
      protocol: protocol,
      request_id: this.genMessageID(),
    }
    // Logger.json(message)
    if (message.data.type === 'forward_msg') {console.log(message.data.content)}
    this.send(message)
  }

  /**
   * 处理收到的 OneBot 服务端事件
   * @param {string} type 事件类型
   * @param {object} data 事件数据
   */
  handleOnebotEvent(data) {
    const type = data.action
    const {params} = data
    if (['send_group_msg', 'send_private_msg', 'send_msg'].includes(type)) {
      this.sendMessage('onebot', {
        content: {
          message: params.message,
          message_id: params.message_id,
        },
        type: 'message',
        user_id: params.user_id || params.group_id,
      })
    } else if (type == 'delete_msg') {
      this.sendMessage('onebot', {
        content: {
          message_id: params.message_id,
        },
        type: 'del_msg',
      })
    } else if (
      ['send_group_forward_msg', 'send_private_forward_msg'].includes(type)
    ) {
      const { messages } = params
      this.sendMessage('onebot', {
        content: {
          message: [{ type: 'nodes', data: { messages } }],
          message_id: params.message_id,
        },
        type: 'message',
        user_id: data.user_id,
      })
    } else {
      logger.error(`未知 OneBot 事件类型：${type}`)
    }
  }

  sendResponse(id) {
    const message = {
      code: 0,
      data: {
        message_id: this.genMessageID(),
      },
      message: 'ok',
      request_id: id,
    }

    this.send(message)
    return message.data.message_id
  }

  genMessageID() {
    const time = new Date().getTime()
    const subTime = time % 10000000000
    return subTime
  }

  async login() {
    const models = llm.getModelList(this.isAdmin)
    const modelsMeta = llm.getModelMetaMap(this.isAdmin)
    const onebot_enabled = config.isOnebotEnabled()

    // 过滤掉空的模型提供商
    const filteredModels = {}
    for (const [providerName, providerModels] of Object.entries(models)) {
      // 检查是否有模型
      const hasModels = Array.isArray(providerModels)
        ? providerModels.length > 0  // 简单数组
        : (providerModels && Array.isArray(providerModels.models) && providerModels.models.length > 0)  // 按所有者分组

      if (hasModels) {
        filteredModels[providerName] = providerModels
      }
    }

    // 仅在前端初次加载且为全新物理会话时才下发推荐预设
    if (this.firstLogin && this.isNewSession) {
      this.sendPresets()
    }

    // 获取该用户在离线期间产生的待处理后台任务（即 streamCache 中的内容）
    const pendingTasks = streamCache.getPendingContactors(this.id)
    if (pendingTasks.length > 0) {
      logger.info(`[Login] 用户 ${this.id} 登录，检测到待处理任务: ${JSON.stringify(pendingTasks)}`)
    }
    
    this.sendSystemMessage('login', {
      bootId: BOOT_ID, // 进程启动标识，前端据此判断后端是否重启过
      is_admin: this.isAdmin,
      models: filteredModels,
      models_meta: modelsMeta, // 模型规格元数据（按权限筛选），供前端展示 ctx/watermark/vision
      onebot_enabled,
      pendingTasks, // 告知前端哪些 Agent 有新消息
    })
  }

  /**
   * 下发推荐预设数据
   */
  async sendPresets(requestId) {
    try {
      const PresetService = (await import('../../../database/services/PresetService.js')).default
      const presets = await PresetService.findAll()
      const recommendedPresets = presets.filter(p => p.recommended).map(p => ({
        avatar: p.avatar,
        history: p.history,
        model: p.model,
        name: p.name,
        opening: p.opening,
        recommended: p.recommended,
        tools: p.tools
      }))
      this.sendSystemMessage('recommended_presets', { presets: recommendedPresets }, requestId)
      logger.info(`[Socket] 已为用户 ${this.id} 下发 ${recommendedPresets.length} 个推荐预设`)
    } catch (error) {
      logger.error(`[Socket] 下发推荐预设失败:`, error)
    }
  }

  logout() {
    logger.debug(`客户端 ${this.id} 已强制下线`)
  }

  heartbeat(event) {
    const Servertime = new Date().getTime()
    const clientTime = event.data.timestamp
    const data = {
      delay: Servertime - clientTime,
      revTime: Servertime,
    }
    this.sendSystemMessage('heartbeat', data, event.request_id)
    // Logger.debug(`客户端 ${this.id} 延时：${message.data.delay}ms`)
    this.LostHeartBeat -= 1
  }

  sendSystemMessage(type, data = {}, requestId = this.genMessageID()) {
    const message = {
      data: data,
      protocol: 'system',
      request_id: requestId,
      type: type,
    }
    this.send(message)
  }

  sendOpenaiMessage(type, data = {}, requestId) {
    const message = {
      data: data,
      message: type,
      protocol: 'llm',
      request_id: requestId,
    }
    this.send(message)
  }

  sendChannelMessage(type, data = {}, requestId) {
    const message = {
      data: data,
      message: type,
      protocol: 'channel',
      request_id: requestId,
    }
    this.send(message)
  }
}
