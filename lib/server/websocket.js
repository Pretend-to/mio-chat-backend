/* eslint-disable camelcase */
import { WebSocketServer } from 'ws'
import WebUser from './websocket/services/webuser.js'
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
    })
  }

  /**
 * 将事件推送到Web客户端
 * @param {object} e 事件数据
 * @param {string} type 事件类型，包含 "message" "forward_msg" "del_msg"
 */
  async sendOnebot(e) {
    const message = e.params
    const isGroup = message !== undefined
    const user_id = isGroup ? String(message.group_id).substring(3) : String(message.user_id) // Ensure user_id is a string
    const action = e.action
    if (isGroup) {
      message.user_id = parseInt(user_id)
    }

    if (action !== 'delete_msg') {
      logger.debug(`向客户端${user_id}推送消息：${action} ${message}`)

      // Filter clients based on user_id or isAdmin status
      let clients = this.clients.filter((client) => user_id.includes(client.id) || client.isAdmin)

      if (clients.length > 0) {
      // Iterate through matching clients and send the event
        for (const client of clients) {
          try {
            client.handleOnebotEvent(action, message) // Ensure handleOnebotEvent is awaited
          } catch (error) {
            logger.error(`处理Onebot事件失败：${error}`) // Proper error handling in case of failures
          }
        }
      } else {
        logger.warn(`向客户端${user_id}推送消息失败，客户端未登录`)
      }
    } else {
    // Handle delete_msg action for all connected clients
      for (const client of this.clients) {
        try {
          client.handleOnebotEvent(action, message)
        } catch (error) {
          logger.error(`处理Onebot事件失败：${error}`)
        }
      }
    }
  }

}
