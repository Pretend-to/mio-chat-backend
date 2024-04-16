/* eslint-disable camelcase */
/* eslint-disable no-undef */
import logger from './logger.js'
import wsServer from './server/websocket.js'
import Onebot from './chat/onebot.js'

export default class Middleware {
  constructor() {
    this.onebot = null
    this.wsServer = new wsServer()

    // TODO: support openai api
    // this.onenai = null;

    this.initWsServer()
  }

  initOnebot() {
    // 收到OneBot服务端上线消息
    this.onebot.on('online', () => {
      logger.info('OneBot 协议连接成功！')
    })

    // 收到OneBot服务端事件
    this.onebot.on('event', async (e) => {
      // 把事件转发到WebSocket服务端
      this.wsServer.sendOnebot(e)
    })
  }

  initWsServer() {
    // 收到客户端消息
    this.wsServer.on('message', (e) => {
      this.toOnebotServer(e)
    })
  }

  startOnebot(config) {
    this.onebot = new Onebot(config)

    this.initOnebot()
  }

  // 向OneBot服务端发送消息
  toOnebotServer(e) {
    try {
      logger.debug('收到客户端' + e.id + '的消息,尝试发送到OneBot服务端')
      logger.debug(e)
      const data = e.data
      logger.debug(data)
      const sender = data.sender
      sender.id = data.id
      switch (data.type) {
        case 'message': {
          logger.debug('收到私聊消息')
          const warpedMessage = this.onebot.messageWarrper(
            data.data,
            sender,
            data.message_id
          )
          logger.debug(warpedMessage)
          this.onebot.sendObject(warpedMessage)

          break
        }
        default:
          logger.warn('收到未知消息类型')
      }
    } catch (e) {
      console.error('处理客户端消息失败', e)
    }
  }

}
