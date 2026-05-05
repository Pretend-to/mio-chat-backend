import LLMMessageEvent from '../../../server/socket.io/utils/LLMMessageEvent.js'
import VirtualLLMClient from '../utils/VirtualLLMClient.js'
import logger from '../../../../utils/logger.js'

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

    // 1. 创建虚拟客户端 (用于推送和状态追踪)
    const client = new VirtualLLMClient(taskId, { userId, contactorId })

    // 2. 构建消息上下文 (优先使用快照中的 SystemPrompt)
    let messages = []
    
    // 注入自治任务指令：提醒 Agent 当前处于后台模式，不要等待用户，独立完成所有步骤
    const autonomousGuard = `\n\n[AUTONOMOUS TASK MODE]\nYou are currently running as a background scheduled task. The user is NOT available for real-time interaction or confirmation. \nSTRICT RULE: Do NOT ask for permission or wait for user input. Your goal is to use your available tools to complete the requested task fully and independently in this single session. Once finished, output your final result or report immediately.`

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt + autonomousGuard })
    } else {
      // 如果没有快照，给一个默认的系统提示并带上守卫
      messages.push({ role: 'system', content: "You are a professional AI assistant." + autonomousGuard })
    }

    // 添加任务主指令
    messages.push({ role: 'user', content: taskPrompt })

    // 3. 确定模型与工具集
    // 注意：tools 此时已经是解析后的数组对象或名称数组
    const finalTools = options.tools || []

    // 允许通过 options 覆盖 Provider/Model，否则使用系统默认
    const provider = options.provider || this._getDefaultProvider()
    const model = options.model || undefined

    const messageId = this._genMessageId(16)

    // 4. 构造标准请求体
    const { InternalEventFactory } = await import('../utils/InternalEventFactory.js')
    const baseReq = {
      protocol: 'llm',
      type: 'chat',
      request_id: taskId,
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
          toolCallSettings: {
            tools: finalTools,
            mode: 'AUTO',
          },
          base: {
            model,
            stream: true,
          },
          chatParams: options.chatParams || {},
          extraSettings: options.extraSettings || {}
        },
      },
    }
    const req = InternalEventFactory.createFullReq(baseReq)

    // 5. 实例化事件并执行
    const event = new LLMMessageEvent(req, client)
    logger.info(
      `[TaskRunner] 启动后台任务 "${taskId}" (MessageId: ${messageId}, Identity: ${contactorId})`,
    )

    try {
      this.llmService.handleMessage(event)

      // 6. 等待执行结果（超时 10 分钟）
      const timeoutMs = options.timeout || 600000
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`[TaskRunner] 任务 "${taskId}" 执行超时`)),
          timeoutMs,
        ),
      )

      await Promise.race([client.done, timeoutPromise])
      logger.info(`[TaskRunner] 任务 "${taskId}" 成功完成`)
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
