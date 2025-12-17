import { Server } from 'socket.io'
import * as baseController from './controllers/base.js'
import * as messageController from './controllers/message.js'
import { authSocketConnection } from './middlewares/authentication.js'

class SocketIOServer {
  constructor() {
    this.io = null
    this.OpenAIMessageHandler = null
    this.OnebotMessageHandler = null
  }

  initialize(httpServer) {
    this.io = new Server(httpServer, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      serveClient: false,
    })

    this.io.use(authSocketConnection)

    this.io.on('connection', (socket) => {
      baseController.handleConnection(socket)
    })
  }

  /**
   * 关闭 Socket.IO 服务器
   */
  async close() {
    if (this.io) {
      return new Promise((resolve) => {
        // 断开所有客户端连接
        this.io.disconnectSockets(true)
        
        // 关闭 Socket.IO 服务器（不关闭底层 HTTP 服务器）
        this.io.close((err) => {
          if (err) {
            console.warn('Socket.IO 关闭时出现警告:', err.message)
          }
          this.io = null
          resolve()
        })
      })
    }
  }

  publicOnebotMessage(e) {
    messageController.handlePubOnebotMessage(e)
  }

  setClientMessageHandler(type, handler) {
    if (type === 'onebot') {
      messageController.setClientMessageHandler('onebot', handler)
    } else if (type === 'llm') {
      messageController.setClientMessageHandler('llm', handler)
    }
  }
}

export default new SocketIOServer()
