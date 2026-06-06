import LLMMessageEvent from '../../../server/socket.io/utils/LLMMessageEvent.js'
import VirtualLLMClient from '../utils/VirtualLLMClient.js'
import TaskService from '../../../database/services/TaskService.js'
import TaskExecutionService from '../../../database/services/TaskExecutionService.js'
import streamCache from '../../../server/socket.io/services/streamCache.js'

// 前端历史消息格式转换到大模型后台 messages 数组的精密算法
function convertFrontendHistoryToLLMMessages(history) {
  const msgs = []
  for (const msg of history) {
    if (msg.role === 'system') {
      const textContent = Array.isArray(msg.content)
        ? msg.content.filter(c => c.type === 'text').map(c => c.data?.text || '').join('')
        : String(msg.content || '')
      msgs.push({ role: 'system', content: textContent })
    } else if (msg.role === 'user') {
      const textContent = Array.isArray(msg.content)
        ? msg.content.filter(c => c.type === 'text').map(c => c.data?.text || '').join('')
        : String(msg.content || '')
      msgs.push({ role: 'user', content: textContent })
    } else if (msg.role === 'assistant' || msg.role === 'other') {
      if (!Array.isArray(msg.content)) {
        msgs.push({ role: msg.role, content: String(msg.content || '') })
        continue
      }

      let currentAssistant = null
      let pendingReasoning = ''
      let pendingToolMessages = []

      const flushAssistant = () => {
        if (currentAssistant) {
          if (pendingReasoning) {
            currentAssistant.reasoning_content = pendingReasoning
            pendingReasoning = ''
          }
          if (!currentAssistant.content && (!currentAssistant.tool_calls || currentAssistant.tool_calls.length === 0)) {
            currentAssistant.content = ''
          }
          msgs.push(currentAssistant)
          currentAssistant = null
        }
        if (pendingToolMessages.length > 0) {
          msgs.push(...pendingToolMessages)
          pendingToolMessages = []
        }
      }

      msg.content.forEach((elm) => {
        if (elm.type === 'reason') {
          if (currentAssistant && currentAssistant.tool_calls && currentAssistant.tool_calls.length > 0) {
            flushAssistant()
          }
          pendingReasoning += elm.data?.text || ''
        } else if (elm.type === 'text') {
          if (currentAssistant && currentAssistant.tool_calls && currentAssistant.tool_calls.length > 0) {
            flushAssistant()
          }
          if (!currentAssistant) {
            currentAssistant = { role: msg.role, content: '' }
          }
          currentAssistant.content = (currentAssistant.content || '') + (elm.data?.text || '')
        } else if (elm.type === 'tool_call') {
          if (!currentAssistant) {
            currentAssistant = { role: msg.role }
          }
          if (!currentAssistant.tool_calls) {
            currentAssistant.tool_calls = []
          }
          const args = elm.data.arguments || ''
          currentAssistant.tool_calls.push({
            id: elm.data.id,
            type: 'function',
            function: {
              name: elm.data.name,
              arguments: typeof args === 'string' ? args : JSON.stringify(args || {}),
            },
          })

          pendingToolMessages.push({
            role: 'tool',
            content: typeof elm.data.result === 'string' ? elm.data.result : JSON.stringify(elm.data.result || 'Success'),
            tool_call_id: elm.data.id,
            name: elm.data.name,
          })
        }
      })

      flushAssistant()

      if (pendingReasoning) {
        msgs.push({
          role: msg.role,
          content: '',
          reasoning_content: pendingReasoning,
        })
      }
    } else if (msg.role === 'tool') {
      msgs.push(msg)
    }
  }
  return msgs
}

// 大模型后台 messages 规整化回前端前端格式消息链条以维持绝对同步
function convertLLMMessagesToFrontendHistory(messages) {
  const history = []
  let i = 0
  while (i < messages.length) {
    const msg = messages[i]
    if (msg.role === 'system') {
      history.push({
        id: `sys-${Date.now()}-${i}`,
        role: 'system',
        time: Date.now(),
        status: 'completed',
        content: [{ type: 'text', data: { text: msg.content } }]
      })
      i++
    } else if (msg.role === 'user') {
      history.push({
        id: `user-${Date.now()}-${i}`,
        role: 'user',
        time: Date.now(),
        status: 'completed',
        content: [{ type: 'text', data: { text: msg.content } }]
      })
      i++
    } else if (msg.role === 'assistant') {
      const assistantMsg = {
        id: `ast-${Date.now()}-${i}`,
        role: 'assistant',
        time: Date.now(),
        status: 'completed',
        content: []
      }
      if (msg.reasoning_content) {
        assistantMsg.content.push({
          type: 'reason',
          data: {
            text: msg.reasoning_content,
            startTime: Date.now(),
            duration: 0
          }
        })
      }
      if (msg.content) {
        assistantMsg.content.push({ type: 'text', data: { text: msg.content } })
      }
      if (Array.isArray(msg.tool_calls)) {
        msg.tool_calls.forEach(tc => {
          assistantMsg.content.push({
            type: 'tool_call',
            data: {
              id: tc.id,
              name: tc.function.name,
              arguments: tc.function.arguments,
              status: 'done',
              result: ''
            }
          })
        })
      }
      history.push(assistantMsg)
      i++
      
      // 消费对应的 tool 结果并填入 result
      while (i < messages.length && messages[i].role === 'tool') {
        const toolMsg = messages[i]
        const tcElm = assistantMsg.content.find(c => c.type === 'tool_call' && c.data.id === toolMsg.tool_call_id)
        if (tcElm) {
          tcElm.data.result = toolMsg.content
        }
        i++
      }
    } else {
      i++ // 过滤未知消息
    }
  }
  return history
}

/**
 * 任务运行器服务 (TaskRunnerService)
 *
 * 负责以后台方式执行 LLM 任务。
 * 核心逻辑：使用 Task 持久化存储中的快照环境（SystemPrompt, Tools）来执行任务。
 */
class TaskRunnerService {
  constructor() {
    this.llmService = null
  }

  /**
   * 初始化 LLM 服务引用
   */
  setLLMService(service) {
    this.llmService = service
  }

  /**
   * 执行后台任务
   *
   * @param {string} presetName - 预设名称 (或 ContactorId)
   * @param {string} triggerPrompt - 任务触发指令
   * @param {object} options - 任务选项（包含快照环境）
   */
  async runTask(presetName, triggerPrompt, options = {}) {
    if (!this.llmService) {
      throw new Error('[TaskRunner] LLM 服务未初始化')
    }

    const taskId = options.taskId || `task-${Date.now()}`
    const userId = options.userId || 'system'
    const contactorId = String(options.contactorId || presetName)

    // 1. 获取任务并加载历史记录
    let task = null
    try {
      task = await TaskService.findById(taskId)
    } catch (err) {
      logger.error(`[TaskRunner] 未能在数据库中检索到任务: ${taskId}`, err.message)
    }

    let history = []
    if (task && task.history) {
      try {
        history = JSON.parse(task.history)
      } catch (err) {
        logger.error(`[TaskRunner] 解析任务 "${taskId}" 的 history 失败:`, err.message)
        history = []
      }
    }

    // 2. 自治指令已迁移到 triggerword 中每轮注入，此处只处理首轮 system prompt
    if (history.length === 0) {
      // 第一轮运行，注入初始 system 消息
      const sysContent = options.systemPrompt || 'You are a professional AI assistant.'
      history.push({
        id: `sys-${Date.now()}`,
        role: 'system',
        time: Date.now(),
        status: 'completed',
        content: [{ type: 'text', data: { text: sysContent } }]
      })
    }

    // 追加当前运行的任务 Prompt 作为 user 消息
    history.push({
      id: `user-${Date.now()}`,
      role: 'user',
      time: Date.now(),
      status: 'completed',
      content: [{ type: 'text', data: { text: triggerPrompt || '已到定时执行时间，开始运行。' } }]
    })

    // 3. 倒序自动检索提取出最新的 `<memory_crystal>` 系统记忆作为 previous_summary
    let previousSummary = null
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i]
      if (Array.isArray(msg.content)) {
        const crystalElm = msg.content.find(c => c.type === 'crystallize_event' && c.data?.status === 'finished')
        if (crystalElm && crystalElm.data?.summary) {
          previousSummary = crystalElm.data.summary
          break
        }
      }
      if (msg.role === 'system' && msg.content) {
        const contentStr = String(msg.content)
        if (contentStr.includes('<memory_crystal>')) {
          const match = contentStr.match(/<memory_crystal>\n([\s\S]*?)\n<\/memory_crystal>/)
          if (match) {
            previousSummary = match[1]
            break
          }
        }
      }
    }

    // 转换为大模型标准 messages
    const messages = convertFrontendHistoryToLLMMessages(history)

    // 4. 创建虚拟客户端 (用于推送和状态追踪)
    const client = new VirtualLLMClient(taskId, { userId, contactorId })

    // 5. 确定模型与工具集 (强制过滤定时任务自身的管理工具以防止循环调用)
    const finalTools = (options.tools || []).filter(t => {
      const name = String(t || '').trim()
      return name !== 'cron' && !name.startsWith('cron_mid_')
    })
    const provider = options.provider || this._getDefaultProvider()
    const model = options.model || undefined

    const messageId = this._genMessageId(16)

    // 6. 创建执行记录（在构造请求体之前，以便 metaData 引用 execution.id）
    const round = await TaskExecutionService.getNextRound(taskId)
    const execution = await TaskExecutionService.create({
      taskId,
      round,
      userId,
      contactorId,
      provider,
      model,
      triggerPrompt,
      inputMessages: messages,
    })
    logger.info(`[TaskRunner] 执行记录已创建 #${execution.id} (round ${round})`)

    // 7. 构造标准请求体
    const { InternalEventFactory } =
      await import('../utils/InternalEventFactory.js')
    const baseReq = {
      protocol: 'llm',
      type: 'chat',
      request_id: `${taskId}-${messageId}`,
      metaData: {
        contactorId,
        messageId, // 每一轮运行都分配一个独立的 16 位数字 ID
        isTask: true,
        executionId: execution.id, // 关联执行记录 ID，用于 enter_chat 同步时反查标记
        timestamp: execution.startedAt ? new Date(execution.startedAt).getTime() : Date.now(),
      },
      data: {
        contactorId,
        messages: messages,
        settings: {
          provider,
          previous_summary: previousSummary, // 支持结晶的记忆快照
          crystallization_token_watermark: 64000, // 默认 64k 自动结晶
          shWhitelist: options.shWhitelist || task?.shWhitelist || '', // 注入 Shell 白名单（优先取显式传递的 options）
          toolCallSettings: {
            tools: finalTools,
            mode: 'AUTO',
          },
          base: {
            model,
            stream: true,
          },
          chatParams: options.chatParams || {},
          extraSettings: options.extraSettings || {},
        },
      },
    }
    const req = InternalEventFactory.createFullReq(baseReq)

    // 8. 实例化事件并执行
    const event = new LLMMessageEvent(req, client)
    logger.info(
      `[TaskRunner] 启动后台任务 "${taskId}" (MessageId: ${messageId}, Identity: ${contactorId})`,
    )

    try {
      this.llmService.handleMessage(event)

      // 9. 等待执行结果（超时 10 分钟）
      const timeoutMs = options.timeout || 600000
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`[TaskRunner] 任务 "${taskId}" 执行超时`)),
          timeoutMs,
        ),
      )

      await Promise.race([client.done, timeoutPromise])

      logger.info(`[TaskRunner] 任务 "${taskId}" 成功完成，正在组装结果`)

      // 10. 从 streamCache 读取原始 chunks
      const cacheKey = `${userId}:${contactorId}`
      const messagesInCache = streamCache.cache.get(cacheKey)
      const cachedItem = messagesInCache?.find(m => m.messageId === messageId)
      const chunks = (cachedItem && Array.isArray(cachedItem.chunks) && cachedItem.chunks.length > 0)
        ? cachedItem.chunks
        : []

      // 11. 组装 newAssistantMsg（与前端 syncMessage 对 chunks 的转换保持一致）
      const newAssistantMsg = this._assembleAssistantMessage(chunks, messageId)

      // 12. 重新建构前端 history 链（无论是否结晶，规整的 event.body.messages 都包含了本轮迭代后最完整的交替消息序列）
      const hasCrystallized = event.body.messages?.[0]?.role === 'system' && String(event.body.messages[0].content).includes('<memory_crystal>')
      logger.info(`[TaskRunner] 任务 "${taskId}" 执行完毕，从 LLM 消息链重新构建前端 History（结晶状态: ${hasCrystallized}）`)
      const finalHistory = convertLLMMessagesToFrontendHistory(event.body.messages)

      // 13. 更新 history 到 Task 表（保持对话连续性）
      if (task) {
        await TaskService.upsert({
          ...task,
          history: finalHistory,
        })
      }

      // 14. 回写执行记录（原始 chunks + 组装后的 assistant 消息）
      await TaskExecutionService.complete(execution.id, {
        outputChunks: chunks,
        finalAssistantMsg: newAssistantMsg,
      })
      logger.info(`[TaskRunner] 执行记录 #${execution.id} 已归档`)

      // 15. 标记执行记录为已同步 + 清理 streamCache
      const { default: sessions } = await import('../../../server/socket.io/services/sessions.js')
      const allClients = sessions.getClientsByUserId(userId, true)
      const isOnline = allClients?.some(c => c.socket)
      if (isOnline) {
        logger.info(`[TaskRunner] 用户 ${userId} 当前在线，标记执行记录为已同步并清理 streamCache`)
        await TaskExecutionService.markSynced(execution.id)
        streamCache.delete(userId, contactorId)
      }

    } catch (error) {
      // 标记执行失败
      try {
        await TaskExecutionService.fail(execution.id, { errorMessage: error.message })
      } catch (dbErr) {
        logger.error(`[TaskRunner] 写入失败记录时出错:`, dbErr.message)
      }
      logger.error(`[TaskRunner] 任务 "${taskId}" 执行异常:`, error.message)
      throw error
    }
  }

  /**
   * 将 streamCache 中的原始 chunks 组装为前端格式的 assistant 消息
   * 与前端 contactorsStore.syncMessage() 对 chunks 的转换逻辑一致
   */
  _assembleAssistantMessage(chunks, _messageId) {
    const msg = {
      id: `ast-${Date.now()}`,
      role: 'assistant',
      time: Date.now(),
      status: 'completed',
      content: [],
    }

    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      msg.content.push({ type: 'text', data: { text: 'Success' } })
      return msg
    }

    const now = Date.now()

    for (const chunk of chunks) {
      if (chunk.type === 'reason') {
        msg.content.push({
          type: 'reason',
          data: {
            text: chunk.data?.text ?? '',
            startTime: chunk.data?.startTime || now,
            duration: chunk.data?.duration ?? 0,
          },
        })
      } else if (chunk.type === 'content') {
        msg.content.push({
          type: 'text',
          data: { text: chunk.content },
        })
      } else if (chunk.type === 'toolCall') {
        let callStatus = 'waiting'
        if (chunk.content.result) {
          callStatus = 'done'
        } else if (chunk.content.action === 'running' || chunk.content.action === 'pending') {
          callStatus = 'running'
        }

        const toolCallData = {
          ...chunk.content,
          arguments: chunk.content.arguments || chunk.content.parameters || '',
          status: callStatus,
        }

        msg.content.push({
          type: 'tool_call',
          data: toolCallData,
        })
      } else if (chunk.type === 'crystallize') {
        msg.content.push({
          type: 'crystallize_event',
          data: {
            status: chunk.content?.status || 'finished',
            summary: chunk.content?.summary || '',
          },
        })
      }
      // 其他未知 chunk 类型静默忽略
    }

    // 兜底：如果最终 content 为空
    if (msg.content.length === 0) {
      msg.content.push({ type: 'text', data: { text: 'Success' } })
    }

    return msg
  }

  _genMessageId(length) {
    let result = ''
    const characters = '0123456789'
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
  }

  /**
   * 兜底获取默认 Provider
   */
  _getDefaultProvider() {
    if (!this.llmService) return 'gemini'
    const metadata = this.llmService.instanceMetadata
    const firstId = Object.keys(metadata)[0]
    return firstId ? metadata[firstId].displayName : 'gemini'
  }
}

export default new TaskRunnerService()
