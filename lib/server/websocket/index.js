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

  publicOnebotMessage(e) {
    messageController.handlePubOnebotMessage( e)
  }

  setClientMessageHandler(type, handler) {
    if(type === 'onebot') {
      this.OnebotMessageHandler = handler 
    } else if(type === 'llm') {
      this.LLMMessageHandler = handler 
    }
  }

  subscribeClientMessage() {
    this.messageController.setClientMessageHandler('llm',this.LLMMessageHandler)
    this.messageController.setClientMessageHandler('onebot',this.OnebotMessageHandler)
  }

  
}

export default new WebsocketServer()