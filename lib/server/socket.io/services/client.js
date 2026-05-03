import EventEmitter from 'events'
import llm from '../../../chat/llm/index.js'
import config from '../../../config.js'
import streamCache from './streamCache.js'
import sessions from './sessions.js'
// import openai from '../../../chat/llm/adapters/openai.js'

export default class WebUser extends EventEmitter {
  constructor(info, socket) {
    super()
    this.id = info.id
    this.ip = info.ip
    this.socket = socket
    this.isAdmin = info.isAdmin
    this.origin = info.origin
    this.LostHeartBeat = 0
    this.heartbeatInterval = null
    this.pendingStreams = new Map()
    this.activeEvents = new Map() // requestId -> LLMMessageEvent
    this.activeContactorId = null // 当前用户正在查看的联系人 ID
    this.cacheMesageMethod = null


    this.socket.on('disconnect', () => {
      clearInterval(this.heartbeatInterval)
      this.socket = null
      // 贴心模式：断线不掐断流，让 LLM 在后台吐完并存入缓存
      // this.pendingStreams.forEach((stream, id) => {
      //   logger.debug('abort stream:' + id)
      //   const _ = stream.controller && stream.controller.abort()
      // })
      this.emit('close', this)
    })

    this.socket.on('message', (message) => {
      let e
      try {
        e = JSON.parse(message)
        // 校验消息合法性
        // logger.debug(e)
        if (!e.request_id || !e.protocol || !e.data) {
          throw new Error('消息格式错误')
        }
      } catch (error) {
        logger.error('客户端 ' + this.id + ' 传入非法消息' + message)
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

        // logger.debug(e)
        this.emit('onebot_message', e)

        e.data.forEach((item) => {
          if (item.type === 'text') {
            logger.info(`收到来自 ${this.id} 的消息：${item.data.text}`)
          } else {
            logger.info(
              `收到来自 ${this.id} 的消息：${
                item.type === 'image'
                  ? '图片'
                  : item.type === 'record'
                    ? '语音'
                    : '未知类型:' + item.type
              }`,
            )
          }
        })
      } else if (e.protocol === 'system') {
        if (e.type === 'heartbeat') {
          this.heartbeat(e)
        }
      } else if (e.protocol === 'llm') {
        if (e.type === 'abort') {
          this.abortConnection(e.request_id)
        } else {
          this.emit('llm_message', e)
        }
      } else if (e.protocol === 'logs') {
        this.emit('logs_message', e)
      } else {
        logger.error('客户端 ' + this.id + ' 传入非法协议' + e.protocol)
      }
    })

    this.socket.on('interruptGeneration', (data) => {
      const { messageId, contactorId } = data
      logger.info(`[Socket] 收到来自用户 ${this.id} 的中断信号: 消息 ${messageId}, 联系人 ${contactorId}`)
      
      this.abortConnection(messageId)
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
        logger.warn('客户端' + this.id + '发送消息失败')
      }

      // 调用缓存方法
      if (this.cacheMesageMethod) {
        // llm 协议不再打印冗长的“缓存消息”日志，因为它现在是静默后台生成
        if (message.protocol !== 'llm') {
          logger.info('缓存消息：' + JSON.stringify(message))
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

  abortConnection(id) {
    const stringId = String(id)
    
    // 1. 中断当前在线客户端下的指定请求
    const event = this.activeEvents.get(stringId)
    const stream = this.pendingStreams.get(stringId)

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

    // 2. 跨客户端广播中断信号
    const allClients = sessions.getClientsByUserId(this.id, true)
    if (allClients) {
      allClients.forEach((client) => {
        if (client !== this && typeof client.abortConnection === 'function') {
          client.abortConnection(id)
        }
      })
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
      request_id: this.genMessageID(),
      protocol: protocol,
      data: {
        id: data.user_id,
        type: data.type,
        content: data.content,
        message_id: data.message_id,
      },
    }
    // logger.json(message)
    if (message.data.type === 'forward_msg') console.log(message.data.content)
    this.send(message)
  }

  /**
   * 处理收到的 OneBot 服务端事件
   * @param {string} type 事件类型
   * @param {object} data 事件数据
   */
  handleOnebotEvent(data) {
    const type = data.action
    const params = data.params
    if (['send_group_msg', 'send_private_msg', 'send_msg'].includes(type)) {
      this.sendMessage('onebot', {
        user_id: params.user_id || params.group_id,
        type: 'message',
        content: {
          message: params.message,
          message_id: params.message_id,
        },
      })
    } else if (type == 'delete_msg') {
      this.sendMessage('onebot', {
        type: 'del_msg',
        content: {
          message_id: params.message_id,
        },
      })
    } else if (
      ['send_group_forward_msg', 'send_private_forward_msg'].includes(type)
    ) {
      const { messages } = params
      this.sendMessage('onebot', {
        user_id: data.user_id,
        type: 'message',
        content: {
          message: [{ type: 'nodes', data: { messages } }],
          message_id: params.message_id,
        },
      })
    } else {
      logger.error(`未知 OneBot 事件类型：${type}`)
    }
  }

  sendResponse(id) {
    const message = {
      request_id: id,
      code: 0,
      message: 'ok',
      data: {
        message_id: this.genMessageID(),
      },
    }

    this.send(message)
    return message.data.message_id
  }

  genMessageID() {
    const time = new Date().getTime()
    let subTime = time % 10000000000
    return subTime
  }

  async login() {
    const models = llm.getModelList(this.isAdmin)
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

    // 获取推荐预设，用于前端初次加载
    const presets = await (await import('../../../database/services/PresetService.js')).default.findAll()
    const recommendedPresets = presets.filter(p => p.recommended).map(p => ({
      name: p.name,
      avatar: p.avatar,
      opening: p.opening,
      history: p.history,
      tools: p.tools,
      model: p.model,
      recommended: p.recommended
    }))

    // 获取该用户在离线期间产生的待处理后台任务（即 streamCache 中的内容）
    const pendingTasks = streamCache.getPendingContactors(this.id)
    if (pendingTasks.length > 0) {
      logger.info(`[Login] 用户 ${this.id} 登录，检测到待处理任务: ${JSON.stringify(pendingTasks)}`)
    }
    
    this.sendSystemMessage('login', {
      is_admin: this.isAdmin,
      models: filteredModels,
      onebot_enabled,
      recommendedPresets,
      pendingTasks, // 告知前端哪些 Agent 有新消息
    })
  }

  logout() {
    this.sendSystemMessage('logout', {})
    logger.debug(`客户端 ${this.id} 已强制下线`)
  }

  heartbeat(event) {
    const Servertime = new Date().getTime()
    const clientTime = event.data.timestamp
    const data = {
      revTime: Servertime,
      delay: Servertime - clientTime,
    }
    this.sendSystemMessage('heartbeat', data, event.request_id)
    // logger.debug(`客户端 ${this.id} 延时：${message.data.delay}ms`)
    this.LostHeartBeat -= 1
  }

  sendSystemMessage(type, data = {}, requestId = this.genMessageID()) {
    const message = {
      request_id: requestId,
      protocol: 'system',
      type: type,
      data: data,
    }
    this.send(message)
  }

  sendOpenaiMessage(type, data = {}, requestId) {
    const message = {
      request_id: requestId,
      protocol: 'llm',
      message: type,
      data: data,
    }
    this.send(message)
  }
}
