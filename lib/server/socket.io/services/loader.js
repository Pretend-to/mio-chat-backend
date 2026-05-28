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
        client.activeContactorId = contactorId // 记录用户当前活跃窗口
        const cachedList = streamCache.pop(client.id, contactorId)
        if (cachedList && Array.isArray(cachedList)) {
          logger.info(`[Sync] 为用户 ${client.id} 同步联系人 ${contactorId} 的流缓存 (共 ${cachedList.length} 条消息)`)
          cachedList.forEach(cached => {
            // 过滤和加工 chunks，确保只同步尚在挂起等待状态的 action 交互
            let finalChunks = cached.chunks
            const event = client.activeEvents.get(String(cached.messageId))
            if (event) {
              finalChunks = cached.chunks.filter(chunk => {
                if (chunk.type === 'action') {
                  const interactionId = chunk.content?.interactionId
                  return event._interactions.has(interactionId)
                }
                return true
              })
            } else {
              // 若事件已结束，所有 action 交互都必然已过期
              finalChunks = cached.chunks.filter(chunk => chunk.type !== 'action')
            }

            client.sendOpenaiMessage('sync', {
              chunks: finalChunks,
              status: cached.status,
              messageId: cached.messageId,
              metaData: cached.metaData,
              error: cached.error
            }, cached.messageId)
          })
          
          // 发送完快照后立即标记，防止正在运行的任务重复发送旧 chunk
          streamCache.markSynced(client.id, contactorId)
        }
        return
      }

      const event = new LLMMessageEvent(req, client)
      client.pushEvent(event.requestId, event) // 关键修复：注册事件到 client，以便中断
      this.LLMMessageHandler(event)
      
      // 当消息完成或失败时，从活跃池中移除
      event.onAbort(() => client.popEvent(event.requestId))
      // 注意：complete 和 error 方法内部已经处理了清理逻辑或不需要额外清理
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
