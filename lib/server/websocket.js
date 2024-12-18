/* eslint-disable camelcase */
import { WebSocketServer } from 'ws'
import WebUser from './webuser.js'
import EventEmitter from 'events'

export default class WsServer extends EventEmitter {
  constructor() {
    super()
    this.clients = []
    this.initServer()
  }

  initServer() {
    // 创建WebSocket服务器实例
    this.wss = new WebSocketServer({
      noServer: true,
    })

    logger.info('WebSocket服务器已启动')

    // 监听客户端连接事件
    this.wss.on('connection', (ws, userInfo) => {
      try {
        const clientId = userInfo.id
        const webUser = new WebUser(userInfo, ws)
        this.clients.push(webUser)

        logger.info(
          `客户端${clientId}已以${userInfo.isAdmin ? '管理员' : '用户'}身份连接`
        )
        logger.info(`当前在线客户端数：${this.clients.length}`)

        // 监听客户端消息事件
        webUser.on('onebot_message', (data) => {
          this.emit('onebot_message', { id: clientId, data: data })
        })

        // 监听客户端消息事件
        webUser.on('openai_message', (data) => {
          this.emit('openai_message', { server:webUser, data: data })
        })

        // 监听客户端离线事件
        webUser.on('close', () => {
          logger.info(`客户端${webUser.id}已断开连接`)
          this.clients = this.clients.filter((client) => client !== webUser)
          logger.info(`当前在线客户端数：${this.clients.length}`)
        })
      } catch (e) {
        logger.error(e)
      }
    })
  }

  /**
   * 将事件推送到Web客户端
   * @param {object} e 事件数据
   * @param {string} type 事件类型，包含 "message" "forward_msg" "del_msg"
   */
  async sendOnebot(e) {
    const message = e.params
    const user_id = `${message.user_id}`
    const action = e.action
    if (action !== 'delete_msg'){
      logger.debug(`向客户端${user_id}推送消息：${action} ${message}`)
      let clients = this.clients.filter((client) => user_id.includes(client.id) || client.isAdmin) 
      if (clients.length > 0) clients.forEach(async (client) => await client.handleOnebotEvent(action, message))
      else logger.warn(`向客户端${user_id}推送消息失败，客户端未登录`)
    } else {
      this.clients.forEach((client) => {
        client.handleOnebotEvent(action, message)
      })
    }
  }


  broadCast(data) {
    logger.debug(`向所有客户端发送消息：${data}`)
    this.clients.forEach((client) => {
      client.send(data)
    })
  }

  generateId() {
    return Math.random().toString(36).slice(2, 11) // 生成一个长度为 9 的随机字符串作为ID
  }
}
