/* eslint-disable camelcase */
import EventEmitter from 'events'
import llm from '../../../chat/llm/index.js'
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

    this.socket.on('disconnect', () => {
      clearInterval(this.heartbeatInterval)
      this.socket = null
      this.pendingStreams.forEach((stream,id) => {
        logger.debug('abort stream:' + id)
        stream.controller && stream.controller.abort()
      })
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
          id: e.id,
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
              }`
            )
          }
        })
      } else if (e.protocol === 'system') {
        if (e.type === 'heartbeat') {
          this.heartbeat(e)
        } 
      } else if (e.protocol === 'llm') {
        this.emit('llm_message', e)
      } else {
        logger.error('客户端 ' + this.id + ' 传入非法协议' + e.protocol)
      }
    })

    this.login()
  }

  send(message) {
    try {
      this.socket.emit('message',JSON.stringify(message))
    } catch (error) {
      if(error.message === 'Cannot read properties of null (reading \'send\')') {
        logger.info('客户端'+ this.id +'已离线')
      }else {
        logger.error(error)
      }
    }
  }

  pushConnection(id, stream) {
    this.pendingStreams.set(id, stream)
  }

  abortConnection(id) {
    const stream = this.pendingStreams.get(id)
    if (stream) {
      stream.controller.abortCallback()
    }
  }

  popConnection(id) {
    this.pendingStreams.delete(id) 
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
    if(message.data.type === 'forward_msg') console.log(message.data.content)
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
    if (['send_group_msg','send_private_msg'].includes(type)) {
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
    } else if (['send_group_forward_msg','send_private_forward_msg'].includes(type)) {
      const nodes = params.messages
      const messages = []
      for (let node of nodes) {
        messages.push(node.data.content)
      }
      this.sendMessage('onebot', {
        user_id: data.user_id,
        type: 'message',
        content: {
          message: [{type: 'nodes', data: {messages}}],
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

  login() {
    const models = llm.getModelList(this.isAdmin)

    this.sendSystemMessage('login', {
      is_admin: this.isAdmin,
      models: models,
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
    this.sendSystemMessage('heartbeat', data,event.request_id)
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

  sendOpenaiMessage(type, data = {}, requestId){
    const message = {
      request_id: requestId,
      protocol: 'llm',
      message: type,
      data: data,
    }
    logger.debug(message)
    this.send(message)
  }
}
