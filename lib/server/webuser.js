/* eslint-disable camelcase */
import EventEmitter from 'events'
import logger from '../logger.js'
import config from '../config.js'

export default class WebUser extends EventEmitter {
  constructor(info, socket) {
    super()
    this.id = info.id
    this.socket = socket
    this.isAdmin = info.isAdmin
    this.LostHeartBeat = 0
    this.heartbeatInterval = null

    this.checkHeartBeat()

    this.socket.on('close', () => {
      clearInterval(this.heartbeatInterval)
      this.emit('close', this.id)
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

        logger.debug(e)
        this.emit('message', e)

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
        }else if (e.type === 'login') {
          this.emit('login', message)
        }
      } else if (e.protocol === 'openai') {
        this.emit('openai', e)
      } else {
        logger.error('客户端 ' + this.id + ' 传入非法协议' + e.protocol)
      }
    })
  }

  checkHeartBeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.LostHeartBeat > 3) {
        logger.error(`客户端 ${this.id} 心跳超时，已断开连接`)
        this.emit('close', this.id)
        clearInterval(this.heartbeatInterval)
      } else {
        this.LostHeartBeat += 1
      }
    }, 3000)
  }

  async send(message) {
    this.socket.send(JSON.stringify(message))
  }

  async sendMessage(protocol, data) {
    const message = {
      request_id: data.request_id,
      protocol: protocol,
      data: {
        id: data.user_id,
        type: data.type,
        content: data.message,
      },
    }
    this.send(message)
  }

  /**
   * 处理收到的 OneBot 服务端事件
   * @param {string} type 事件类型
   * @param {object} data 事件数据
   */
  handleOnebotEvent(type, data) {
    if (type == 'send_private_msg') {
      this.sendMessage('onebot', {
        user_id: data.user_id,
        type: 'message',
        message: data.message,
        message_id: data.message_id,
      })
    } else if (type == 'delete_msg') {
      this.sendMessage('onebot', {
        user_id: data.user_id,
        type: 'del_msg',
        message_id: data.message_id,
      })
    } else if (type == 'send_private_forward_msg') {
      const nodes = data.params.messages
      const messages = []
      for (let node of nodes) {
        messages.push(node.data.content)
      }
      this.sendMessage('onebot', {
        user_id: data.user_id,
        type: 'forward_msg',
        messages: messages,
        message_id: data.message_id,
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

  login(info) {
    const message = {
      // eslint-disable-next-line camelcase
      request_id: info.requestID,
      code: 0,
      message: '登录成功',
      data: {
        is_admin: this.isAdmin,
        admin_qq: config.onebot.admin_qq,
        bot_qq: config.onebot.bot_qq,
      },
    }
    this.send(message)
    logger.debug(message)
  }

  heartbeat(event) {
    const Servertime = new Date().getTime()
    const clientTime = event.data.timestamp
    const message = {
      request_id: event.request_id,
      code: 0,
      message: 'ok',
      data: {
        delay: Servertime - clientTime,
      },
    }
    this.send(message)
    // logger.debug(`客户端 ${this.id} 延时：${message.data.delay}ms`)
    this.LostHeartBeat -= 1
  }
}
