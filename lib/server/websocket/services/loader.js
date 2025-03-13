import LLMMessageEvent from '../utils/LLMMessageEvent'

class ClientLoader {
  constructor() {
    this.OnebotMessageHandler = null
    this.OpenAIMessageHandler = null
    this.clientOfflineCallback = null
  }

  initClientMessageHandler(type, handler) {
    if(type === 'onebot') {
      this.OnebotMessageHandler = handler
    } else if(type === 'llm') {
      this.OpenAIMessageHandler = handler
    }
  }

  setClientOfflineCallback(callback) {
    this.clientOfflineCallback = callback 
  }

  initClient(client) {
    client.on('llm_message',(req)=>{
      const event = new LLMMessageEvent(req, client)
      this.OpenAIMessageHandler(event)
    }) 
    client.on('onebot_message',(req)=>{
      this.OnebotMessageHandler(req) 
    })

    client.on('close',()=>{
      logger.info(`用户 ${client.id} 已离线`)
      this.clientOfflineCallback(client)
    })
  }
}

export default new ClientLoader()