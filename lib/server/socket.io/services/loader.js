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
import sessions from './sessions.js'
import { getChatEventDispatcher } from '../../../chat/llm/events/ChatEventDispatcher.js'

function sendAdjustmentStatus(principalId, payload) {
  const clients = sessions.getClientsByUserId(principalId, true) || []
  for (const client of clients) {
    client.sendOpenaiMessage('adjust_status', {
      ...payload,
      metaData: {
        contactorId: payload.contactorId,
        messageId: payload.targetRequestId,
      },
    }, payload.eventId)
  }
}

function deferAbsorbedWebAdjustments(event) {
  for (const change of event._absorbedWebAdjustments?.values() || []) {
    sendAdjustmentStatus(event.principalId, { ...change, status: 'deferred' })
  }
  event._absorbedWebAdjustments?.clear()
}

function runWebEvent(event, handler, client) {
  return new Promise((resolve, reject) => {
    let settled = false
    const complete = event.complete.bind(event)
    const fail = event.error.bind(event)
    event.complete = (...args) => {
      if (event.aborted) deferAbsorbedWebAdjustments(event)
      const result = complete(...args)
      if (!settled) {
        settled = true
        Promise.resolve(result).then(resolve, reject)
      }
      return result
    }
    event.error = (error) => {
      deferAbsorbedWebAdjustments(event)
      const result = fail(error)
      if (!settled) {
        settled = true
        Promise.resolve(result).then(() => reject(error), reject)
      }
      return result
    }
    client.pushEvent(event.requestId, event)
    Promise.resolve()
      .then(() => handler(event))
      .catch((error) => event.error(error))
  })
}

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

      if (req.type === 'adjust') {
        const data = req.data || {}
        const eventId = String(data.eventId || req.request_id || '')
        const targetRequestId = String(data.targetRequestId || '')
        const contactorId = String(data.contactorId || '')
        const text = typeof data.text === 'string' ? data.text.trim() : ''
        const reply = (status, reason = null) => {
          const rejected = ['rejected', 'incompatible', 'duplicate'].includes(status)
          sendAdjustmentStatus(client.id, {
            contactorId, eventId, reason,
            origin: 'web_adjust',
            status: rejected ? 'rejected' : status,
            targetRequestId, text,
          })
          client.finishSocketRequest(req.request_id, rejected ? 'failed' : 'completed', 'adjust')
        }
        if (!eventId || !targetRequestId || !contactorId || !text || text.length > 12000) {
          reply('rejected', '插话参数无效或文本过长')
          return
        }
        const target = client.activeEvents?.get?.(targetRequestId)
        if (!target || target.completed) {
          reply('deferred')
          return
        }
        if (
          String(target.principalId) !== String(client.id) ||
          String(target.contactorId) !== contactorId ||
          typeof target.adjust !== 'function'
        ) {
          reply('rejected', '当前会话不属于此用户或不支持插话')
          return
        }
        const incomingEvent = ChatEventFactory.createForWeb({
          client,
          req: {
            request_id: eventId,
            data: { messages: [{ role: 'user', content: text }] },
            metaData: { contactorId, messageId: eventId },
          },
        })
        incomingEvent.eventId = eventId
        incomingEvent.idempotencyKey = eventId
        incomingEvent.instruction = text
        incomingEvent.originRef = `web_adjust:${eventId}`
        incomingEvent.adjustmentText = text
        if (!target._webAdjustmentStatusListener) {
          target._webAdjustmentStatusListener = true
          target.onAdjustmentStatus?.(({ status, incomingEvent: adjusted, anchor }) => {
            if (!adjusted?.eventId) return
            sendAdjustmentStatus(target.principalId, {
              contactorId: target.contactorId,
              eventId: adjusted.eventId,
              status,
              anchor,
              origin: 'web_adjust',
              targetRequestId: target.requestId,
              text: adjusted.adjustmentText || '',
            })
          })
        }
        getChatEventDispatcher()
          .submit(incomingEvent)
          .then((result) => reply(result?.adjustStatus || result?.status || 'rejected'))
          .catch((error) => reply('rejected', error?.message || String(error)))
        return
      }

      const event = ChatEventFactory.createForWeb({ client, req })
      event.adjustmentOrigin = 'normal_completions'
      event.instruction = event.messages
        .toReversed()
        .find((message) => message.role === 'user' && typeof message.content === 'string')
        ?.content || ''
      event.onAdjustmentStatus?.(({ status, incomingEvent: incoming, anchor }) => {
        if (!incoming?.eventId) return
        const change = {
          anchor,
          contactorId: event.contactorId,
          continuationMessageId: incoming.messageId || incoming.eventId,
          eventId: incoming.eventId,
          previousMessageId: event.messageId,
          status,
          origin: incoming.adjustmentOrigin || 'web_adjust',
          targetRequestId: event.requestId,
          text: incoming.adjustmentText || incoming.instruction || '',
        }
        if (status === 'absorbed') {
          event._absorbedWebAdjustments ||= new Map()
          event._absorbedWebAdjustments.set(incoming.eventId, change)
          // Keep the injection itself in the stream snapshot so a reconnect
          // can rebuild client-owned history before ACK clears the cache.
          event.update({ type: 'adjustment', content: change })
          event.splitOutputForAdjustment(change.continuationMessageId)
        } else if (status === 'defer_to_next_turn') {
          // The adapter emits this after complete(). Add a replay record
          // without reopening the finished assistant stream in the UI.
          streamCache.push(
            event.principalId,
            event.contactorId,
            event.messageId,
            { type: 'adjustment', content: change },
            { contactorId: event.contactorId, messageId: event.messageId },
          )
          streamCache.complete(event.principalId, event.contactorId, event.messageId)
        }
        sendAdjustmentStatus(event.principalId, change)
      })
      event._webAdjustmentStatusListener = true
      getChatEventDispatcher()
        .submit(event, {
          start: (activeEvent) => runWebEvent(activeEvent, this.LLMMessageHandler, client),
        })
        .then((result) => {
          if (result.adjustStatus) {
            if (result.adjustStatus === 'duplicate') return
            if (!['accepted_for_checkpoint', 'absorbed', 'defer_to_next_turn', 'incompatible', 'closed'].includes(result.adjustStatus)) {
              event.error(new Error(`当前会话无法接收新消息: ${result.adjustStatus}`))
              return
            }
            sendAdjustmentStatus(client.id, {
              contactorId: event.contactorId,
              eventId: event.eventId,
              status: ['incompatible', 'closed'].includes(result.adjustStatus)
                ? 'deferred'
                : result.adjustStatus,
              origin: 'normal_completions',
              targetRequestId: getChatEventDispatcher().getActiveEvent(event)?.requestId || null,
              text: event.instruction,
            })
          }
        })
        .catch((error) => event.error(error))
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
