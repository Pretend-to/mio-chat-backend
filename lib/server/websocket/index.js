import { WebSocketServer } from 'ws'
import * as baseController from './controllers/base.js'
import * as messageController from './controllers/message.js'

class WebsocketServer {
  constructor() {
    this.server = new WebSocketServer({
      noServer: true, 
    })
    this.OpenAIMessageHandler = null
    this.OnebotMessageHandler = null
  }

  handleUpgrade(req, socket, head) {
    this.server.handleUpgrade(req, socket, head, baseController.handleConnection)
  }

  handleOnebotMessage(e) {
    messageController.handleMessage('onebot', e)
  }

  setClientMessageHandler(type, handler) {
    if(type === 'onebot') {
      this.OnebotMessageHandler = handler 
    } else if(type === 'openai') {
      this.OpenAIMessageHandler = handler 
    }
  }
}

export default new WebsocketServer()