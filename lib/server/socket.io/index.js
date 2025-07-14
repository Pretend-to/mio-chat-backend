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
