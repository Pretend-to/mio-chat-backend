import LLMMessageEvent from '../utils/LLMMessageEvent.js'
import { handleLogMessage } from '../controllers/message.js'
import streamCache from '../services/streamCache.js'
import TaskExecutionService from '../../../database/services/TaskExecutionService.js'

class ClientLoader {
  constructor() {
    this.OnebotMessageHandler = null
    this.LLMMessageHandler = null
  }

  /**
   * 从 DB 查询未同步的任务执行记录并推送给前端（覆盖 streamCache GC 后的数据丢失）
   */
  async _syncUnsyncedTaskExecutions(client, contactorId) {
    const unsyncedExecutions = await TaskExecutionService.findUnsyncedByContactorId(contactorId)
    if (!unsyncedExecutions || unsyncedExecutions.length === 0) return

    logger.info(`[Sync] 为用户 ${client.id} 同步联系人 ${contactorId} 的未同步任务执行记录 (共 ${unsyncedExecutions.length} 条)`)
    const idsToMark = []
    for (const execution of unsyncedExecutions) {
      idsToMark.push(execution.id)
      const messageId = `task-exec-${execution.id}`
      let chunks = []
      try {
        chunks = JSON.parse(execution.outputChunks || '[]')
      } catch (e) {
        chunks = []
      }
      client.sendOpenaiMessage('sync', {
        chunks,
        status: execution.status === 'completed' ? 'completed' : 'failed',
        messageId,
        metaData: {
          contactorId,
          isTask: true,
          triggerType: 'task',
          timestamp: execution.startedAt ? new Date(execution.startedAt).getTime() : Date.now(),
        },
        error: execution.errorMessage || undefined,
      }, messageId)
    }
    // 批量标记为已同步
    await TaskExecutionService.markAllSynced(idsToMark)
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
      if (req.type === 'ack_message') {
        const { contactorId, messageId } = req.data
        logger.info(`[Sync] 收到客户端对于消息 ${messageId} 的持久化 ACK，清理服务器缓存`)
        streamCache.deleteMessage(client.id, contactorId, messageId)
        return
      }

      if (req.type === 'enter_chat') {
        const contactorId = req.data.contactorId
        client.activeContactorId = contactorId // 记录用户当前活跃窗口

        // 1. 从 streamCache 内存读取同步
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

            // 如果该缓存消息是后台任务，同步标记对应的 DB 执行记录
            if (cached.metaData?.isTask && cached.metaData?.executionId) {
              TaskExecutionService.markSynced(cached.metaData.executionId).catch(err => {
                logger.error(`[Sync] 标记执行记录 #${cached.metaData.executionId} 为已同步失败:`, err.message)
              })
            }

            const metaData = {
              ...(cached.metaData || {}),
              triggerType: cached.metaData?.isTask ? 'task' : 'chat'
            }

            client.sendOpenaiMessage('sync', {
              chunks: finalChunks,
              status: cached.status,
              messageId: cached.messageId,
              metaData: metaData,
              error: cached.error
            }, cached.messageId)
          })

          // 发送完快照后立即标记，防止正在运行的任务重复发送旧 chunk
          streamCache.markSynced(client.id, contactorId)
        }

        // 2. 从 DB 查询未同步的任务执行记录（覆盖 streamCache GC 后的数据丢失场景）
        this._syncUnsyncedTaskExecutions(client, contactorId).catch(err => {
          logger.error('[Sync] 查询未同步任务执行记录失败:', err.message)
        })

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
