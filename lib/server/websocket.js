/* eslint-disable camelcase */
import { WebSocketServer } from 'ws'
import WebUser from './webuser.js'
import logger from '../logger.js'
import EventEmitter from 'events'
import config from '../config.js'

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
    this.wss.on('connection', async (ws, request) => {
      try {
        // 监听客户端登陆事件
        ws.once('message', (data) => {
          logger.debug(`收到websocket消息：${data}`)
          const message = JSON.parse(data)
          if (message.type === 'login') {
            this.emit('login', message)
          }
        })

        logger.info('收到websocket连接请求', request)

        // logger.debug(request.headers);

        const userInfo = await this.checkLogin(request, ws)

        logger.debug(userInfo)

        if (!userInfo) {
          logger.error('客户端未提供正确的登录信息')
          ws.close()
          return
        }

        const clientId = userInfo.id

        // 检测客户端是否已经登录
        // const client = this.clients.find((client) => client.id == clientId)
        // if (client) {
        //   // logger.error(`客户端${clientId}已经登录, 正在顶号`)
        //   // client.logout()
        //   logger.error(`客户端${clientId}已经登录, 拒绝连接`)
        //   ws.close()
        // }

        const webUser = new WebUser(userInfo, ws)
        this.clients.push(webUser)

        // 向客户端发送登录成功消息
        webUser.login(userInfo)

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
      console.log(this.clients)
      let clients = this.clients.filter((client) => user_id.includes(client.id) || client.isAdmin) 
      if (clients.length > 0) clients.forEach(async (client) => await client.handleOnebotEvent(action, message))
      else logger.warn(`向客户端${user_id}推送消息失败，客户端未登录`)
    } else {
      this.clients.forEach((client) => {
        client.handleOnebotEvent(action, message)
      })
    }
  }

  async checkLogin(request) {
    let headers = request.headers
    // logger.debug(headers);
    // 检查是否是浏览器登陆
    if (headers['user-agent'] && headers['user-agent'].includes('Mozilla')) {
      logger.info('浏览器登陆', request)
      logger.debug(request.headers)
      const messagePromise = new Promise((resolve) => {
        this.on('login', (e) => {
          const data = {
            request_id: e.request_id,
            ...e.data,
          }
          if (!data['mio-chat-id']) {
            resolve(null)
          } else {
            resolve(data)
          }
          // logger.debug(e)
        })
      })

      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          resolve('Timeout')
        }, 2000)
      })

      const result = await Promise.race([messagePromise, timeoutPromise])

      if (result === 'Timeout') {
        // 处理超时情况
        logger.warn('浏览器登陆超时', request)
      } else {
        // logger.debug(result)
        // 处理收到消息的情况
        headers['mio-chat-id'] = result['mio-chat-id']
        headers['mio-chat-token'] = result['mio-chat-token']
        headers.request_id = result.request_id ?? ''
      }
    }

    // 获取可用OpenAI 模型列表

    const authConfig = config.web
    const userCode = authConfig.user_code
    const adminCode = authConfig.admin_code
    if (userCode == '' && adminCode == '' && headers['mio-chat-id']) {
      // 允许无authorization的访问
      return {
        requestID: headers.request_id,
        ip: logger.getIP(request),
        id: headers['mio-chat-id'],
        isAdmin: false,
      }
    } else if (headers['mio-chat-id']) {
      const code = headers['mio-chat-token']
      if (!code && userCode != '') {
        logger.warn('配置了访问密码，但客户端尝试游客登陆', request)
        return null
      } else {
        return {
          requestID: headers.request_id,
          ip: logger.getIP(request),
          id: headers['mio-chat-id'],
          isAdmin: adminCode ? code === adminCode : code === userCode,
        }
      }
    } else {
      logger.warn('客户端未提供mio-chat-id头部', request)
      return null
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
