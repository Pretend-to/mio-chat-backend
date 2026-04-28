import LLMMessageEvent from '../utils/LLMMessageEvent.js'
import { handleLogMessage } from '../controllers/message.js'
import streamCache from '../services/streamCache.js'

class ClientLoader {
  constructor() {
    this.OnebotMessageHandler = null
    this.LLMMessageHandler = null
  }

  initClientMessageHandler(type, handler) {
    if (type === 'onebot') {
      this.OnebotMessageHandler = handler
    } else if (type === 'llm') {
      this.LLMMessageHandler = handler
    }
  }

  initClient(client, offlineCallback) {
    client.on('llm_message', (req) => {
      // 处理特殊的同步请求
      if (req.type === 'enter_chat') {
        const contactorId = req.data.contactorId
        const cached = streamCache.pop(client.id, contactorId)
        if (cached) {
          logger.info(`[Sync] 为用户 ${client.id} 同步联系人 ${contactorId} 的流缓存`)
          client.sendOpenaiMessage('sync', {
            chunks: cached.chunks,
            metaData: cached.metaData,
            status: cached.status
          }, cached.messageId)
          
          // 发送完快照后立即标记，防止正在运行的任务重复发送旧 chunk
          streamCache.markSynced(client.id, contactorId)
        }
        return
      }

      const event = new LLMMessageEvent(req, client)
      this.LLMMessageHandler(event)
    })
    client.on('onebot_message', (req) => {
      this.OnebotMessageHandler(req)
    })
    client.on('logs_message', (req) => {
      handleLogMessage(client.socket, req)
    })

    client.on('close', () => {
      logger.info(`用户 ${client.id} 下机了`)
      offlineCallback(client)
    })
  }
}

export default new ClientLoader()
