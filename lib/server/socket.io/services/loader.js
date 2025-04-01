import LLMMessageEvent from '../utils/LLMMessageEvent.js'

class ClientLoader {
  constructor() {
    this.OnebotMessageHandler = null
    this.LLMMessageHandler = null
  }

  initClientMessageHandler(type, handler) {
    if(type === 'onebot') {
      this.OnebotMessageHandler = handler
    } else if(type === 'llm') {
      this.LLMMessageHandler = handler
    }
  }

  initClient(client, offlineCallback) {
    client.on('llm_message',(req)=>{
      const event = new LLMMessageEvent(req, client)
      this.LLMMessageHandler(event)
    }) 
    client.on('onebot_message',(req)=>{
      this.OnebotMessageHandler(req) 
    })

    client.on('close',()=>{
      logger.info(`用户 ${client.id} 下机了`)
      offlineCallback(client)
    })
  }
}

export default new ClientLoader()