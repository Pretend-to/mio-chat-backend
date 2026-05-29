import LLMMessageEvent from '../../../server/socket.io/utils/LLMMessageEvent.js'
import VirtualLLMClient from '../utils/VirtualLLMClient.js'
import TaskService from '../../../database/services/TaskService.js'
import streamCache from '../../../server/socket.io/services/streamCache.js'

// 前端历史消息格式转换到大模型后台 messages 数组的精密算法
function convertFrontendHistoryToLLMMessages(history) {
  const msgs = []
  for (const msg of history) {
    let textContent = ''
    let toolCalls = []
    
    if (Array.isArray(msg.content)) {
      textContent = msg.content
        .filter(c => c.type === 'text')
        .map(c => c.data?.text || '')
        .join('')
        
      const toolCallElms = msg.content.filter(c => c.type === 'tool_call')
      if (toolCallElms.length > 0) {
        toolCalls = toolCallElms.map(tc => {
          return {
            id: tc.data.id,
            type: 'function',
            function: {
              name: tc.data.name,
              arguments: typeof tc.data.arguments === 'string' ? tc.data.arguments : JSON.stringify(tc.data.arguments)
            }
          }
        })
      }
    } else {
      textContent = String(msg.content || '')
    }
    
    const item = { role: msg.role, content: textContent }
    if (toolCalls.length > 0) {
      item.tool_calls = toolCalls
    }
    msgs.push(item)
    
    // 如果该 assistant 消息中含有已经成功执行的 tool_call，为了保持 backend messages 完整轮次链条，
    // 我们紧随其后插入对应的 tool 角色消息
    if (Array.isArray(msg.content)) {
      const doneToolCalls = msg.content.filter(c => c.type === 'tool_call' && c.data?.status === 'done')
      for (const tc of doneToolCalls) {
        let resContent = tc.data.result
        if (resContent && typeof resContent !== 'string') {
          resContent = JSON.stringify(resContent)
        }
        msgs.push({
          role: 'tool',
          tool_call_id: tc.data.id,
          name: tc.data.name,
          content: resContent || 'Success'
        })
      }
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
   * @param {string} taskPrompt - 任务指令
   * @param {object} options - 任务选项（包含快照环境）
   */
  async runTask(presetName, taskPrompt, options = {}) {
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

    // 2. 注入自治指令，并追加本轮的 user 消息到 history
    const autonomousGuard = `\n\n[AUTONOMOUS TASK MODE]\nYou are currently running as a background scheduled task. The user is NOT available for real-time interaction or confirmation. \nSTRICT RULE: Do NOT ask for permission or wait for user input. Your goal is to use your available tools to complete the requested task fully and independently in this single session. Once finished, output your final result or report immediately.`

    if (history.length === 0) {
      // 第一轮运行，注入初始 system 消息及 user 消息
      const sysContent = (options.systemPrompt || 'You are a professional AI assistant.') + autonomousGuard
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
      content: [{ type: 'text', data: { text: taskPrompt } }]
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

    // 5. 确定模型与工具集
    const finalTools = options.tools || []
    const provider = options.provider || this._getDefaultProvider()
    const model = options.model || undefined

    const messageId = this._genMessageId(16)

    // 6. 构造标准请求体
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

    // 7. 实例化事件并执行
    const event = new LLMMessageEvent(req, client)
    logger.info(
      `[TaskRunner] 启动后台任务 "${taskId}" (MessageId: ${messageId}, Identity: ${contactorId})`,
    )

    try {
      this.llmService.handleMessage(event)

      // 8. 等待执行结果（超时 10 分钟）
      const timeoutMs = options.timeout || 600000
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`[TaskRunner] 任务 "${taskId}" 执行超时`)),
          timeoutMs,
        ),
      )

      await Promise.race([client.done, timeoutPromise])
      logger.info(`[TaskRunner] 任务 "${taskId}" 成功完成，正在同步 history`)

      // 9. 从 streamCache 组装本轮最新的 assistant 回复消息
      //    仅保留普通文本输出（content），排除 reason/toolCall/crystallize 等中间过程
      const newAssistantMsg = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        time: Date.now(),
        status: 'completed',
        content: []
      }

      const cacheKey = `${userId}:${contactorId}`
      const messagesInCache = streamCache.cache.get(cacheKey)
      const cachedItem = messagesInCache?.find(m => m.messageId === messageId)

      if (cachedItem && Array.isArray(cachedItem.chunks)) {
        cachedItem.chunks.forEach(chunk => {
          if (chunk.type === 'content') {
            newAssistantMsg.content.push({
              type: 'text',
              data: { text: chunk.content }
            })
          }
        })
      } else {
        const text = streamCache.getMessageText(userId, contactorId, messageId)
        newAssistantMsg.content.push({
          type: 'text',
          data: { text: text || 'Success' }
        })
      }

      // 10. 判断并处理记忆结晶结果
      const hasCrystallized = event.body.messages?.[0]?.role === 'system' && String(event.body.messages[0].content).includes('<memory_crystal>')

      let finalHistory = []
      if (hasCrystallized) {
        logger.info(`[TaskRunner] 任务 "${taskId}" 检测到已触发记忆结晶，重新建构并覆盖 history`)
        finalHistory = convertLLMMessagesToFrontendHistory(event.body.messages)
        finalHistory.push(newAssistantMsg)
      } else {
        finalHistory = [...history, newAssistantMsg]
      }

      // 11. 更新回数据库
      if (task) {
        await TaskService.upsert({
          ...task,
          history: finalHistory
        })
      }

      // 12. 不主动删除 streamCache — 交由 LLMMessageEvent.complete() 处理：
      //      用户在线 → 实时推送后自动清理缓存
      //      用户离线 → 保留缓存给前端上线后通过 pop() 同步拉取

    } catch (error) {
      logger.error(`[TaskRunner] 任务 "${taskId}" 执行异常:`, error.message)
      throw error
    }
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
