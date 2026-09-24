import { ChatEventFactory } from '../../../chat/llm/events/ChatEventFactory.js'
import { handleLogMessage } from '../controllers/message.js'
import { handleChannelMessage } from '../controllers/channel.js'
import { handleAgentMessage } from '../controllers/agent.js'
import streamCache from '../services/streamCache.js'
import {
  buildReplayMetadata,
  filterReplayChunks,
} from './streamReplay.js'
import TaskExecutionService from '../../../database/services/TaskExecutionService.js'
import approvalNotificationBroker from '../../../approvals/ApprovalNotificationBroker.js'

class ClientLoader {
  OnebotMessageHandler = null;
constructor() {
    
    this.LLMMessageHandler = null
  }

  /**
   * 从 DB 查询未同步的任务执行记录并推送给前端（覆盖 streamCache GC 后的数据丢失）
   */
  async _syncUnsyncedTaskExecutions(client, contactorId) {
    const unsyncedExecutions = await TaskExecutionService.findUnsynced({ agentId: contactorId })
    if (!unsyncedExecutions || unsyncedExecutions.length === 0) {return}

    logger.info(`[Sync] 为用户 ${client.id} 同步联系人 ${contactorId} 的未同步任务执行记录 (共 ${unsyncedExecutions.length} 条)`)
    const idsToMark = []
    for (const execution of unsyncedExecutions) {
      idsToMark.push(execution.id)
      const messageId = `task-exec-${execution.id}`
      let chunks = []
      try {
        chunks = JSON.parse(execution.outputChunks || '[]')
      } catch {
        chunks = []
      }
      client.sendOpenaiMessage('sync', {
        chunks,
        error: execution.errorMessage || undefined,
        messageId,
        metaData: {
          contactorId,
          isTask: true,
          timestamp: execution.startedAt ? new Date(execution.startedAt).getTime() : Date.now(),
          triggerType: 'task',
        },
        status: execution.status === 'completed' ? 'completed' : 'failed',
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
        if (client.isAdmin) {
          streamCache.deleteMessage('admin', contactorId, messageId)
        }
        client.finishSocketRequest(req.request_id, 'completed', 'ack_message')
        return
      }

      if (req.type === 'enter_chat') {
        const {contactorId} = req.data
        client.activeContactorId = contactorId // 记录用户当前活跃窗口

        // 1. 从 streamCache 内存读取同步（若当前客户端无缓存且为管理员，回退查询系统通道的 'admin' 缓存）
        let cachedList = streamCache.snapshot(client.id, contactorId)
        let isFromAdminKey = false
        if ((!cachedList || cachedList.length === 0) && client.isAdmin) {
          const adminList = streamCache.snapshot('admin', contactorId)
          if (adminList && adminList.length > 0) {
            cachedList = adminList
            isFromAdminKey = true
          }
        }

        if (cachedList && Array.isArray(cachedList) && cachedList.length > 0) {
          logger.info(`[Sync] 为用户 ${client.id} 同步联系人 ${contactorId} 的流缓存 (共 ${cachedList.length} 条消息${isFromAdminKey ? ' [来自 admin 渠道镜像]' : ''})`)
          let syncFailed = false
          for (const cached of cachedList) {
            try {
              const event = client.activeEvents?.get?.(
                String(cached?.messageId),
              )
              // 只恢复仍有活跃回调的 action。ChatEvent 与 Channel
              // headless event 分别使用 _interactions / interactions。
              const finalChunks = filterReplayChunks(cached?.chunks, event)

              // 如果该缓存消息是后台任务，同步标记对应的 DB 执行记录
              if (cached.metaData?.isTask && cached.metaData?.executionId) {
                TaskExecutionService.markSynced(
                  cached.metaData.executionId,
                ).catch((error) => {
                  logger.error(
                    `[Sync] 标记执行记录 #${cached.metaData.executionId} 为已同步失败:`,
                    error.message,
                  )
                })
              }

              const metaData = buildReplayMetadata(cached.metaData)

              client.sendOpenaiMessage(
                'sync',
                {
                  chunks: finalChunks,
                  error: cached.error,
                  messageId: cached.messageId,
                  metaData,
                  status: cached.status,
                },
                cached.messageId,
              )
            } catch (error) {
              syncFailed = true
              logger.error(
                `[Sync] 回放联系人 ${contactorId} 的缓存消息 ${cached?.messageId || 'unknown'} 失败:`,
                error?.stack || error,
              )
            }
          }

          // 发送完快照后立即标记，防止正在运行的任务重复发送旧 chunk
          if (!syncFailed) {
            streamCache.markSynced(client.id, contactorId)
            if (isFromAdminKey) {
              streamCache.markSynced('admin', contactorId)
            }
          }
        }

        // 2. 从 DB 查询未同步的任务执行记录（覆盖 streamCache GC 后的数据丢失场景）
        const taskSync = this._syncUnsyncedTaskExecutions(client, contactorId)
          .then(() => true)
          .catch(error => {
            logger.error('[Sync] 查询未同步任务执行记录失败:', error.message)
            return false
          })
        // Approval is an application-level queue, not chat-local UI. Replay all
        // pending approvals on any chat entry; the client deduplicates them.
        approvalNotificationBroker.notifyClient(client)

        taskSync.then((success) => {
          client.finishSocketRequest(
            req.request_id,
            success ? 'completed' : 'failed',
            'sync',
          )
        })

        return
      }

      const event = ChatEventFactory.createForWeb({ client, req })
      client.pushEvent(event.requestId, event) // 关键修复：注册事件到 client，以便中断
      this.LLMMessageHandler(event)

      // 当消息完成或失败时，从活跃池中移除
      event.onAbort(() => client.popEvent(event.requestId))
      // 注意：complete 和 error 方法内部已经处理了清理逻辑或不需要额外清理
    })
    client.on('onebot_message', (req) => {
      this.OnebotMessageHandler(req)
    })
    client.on('channel_message', (req) => {
      handleChannelMessage(client, req).catch(err => {
        console.error('[Loader] 处理 channel_message 失败:', err)
      })
    })
    client.on('agent_message', (req) => {
      handleAgentMessage(client, req).catch(err => {
        console.error('[Loader] 处理 agent_message 失败:', err)
      })
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
