import crypto from 'crypto'
import config from '../../../config.js'
import hookManager from '../../../hooks/index.js'
import { HOOK_POINTS } from '../../../hooks/types.js'


import prismaManager from '../../../database/prisma.js'
import CrystallizationService from '../services/CrystallizationService.js'
import { MioFunction } from '../../../function.js'

class CustomMioFunction extends MioFunction {
  constructor({ name, description, parameters }) {
    super({ name, description, parameters })
    this.name = name
  }
}
/**
 * @class OpenAI Bot 实现
 */
export default class BaseLLMAdapter {
  /**
   * 获取适配器元数据(子类应该覆盖此方法)
   * @returns {object} { type: string, requiresSpecialAuth: boolean }
   */
  static getAdapterMetadata() {
    throw new Error('子类必须实现 getAdapterMetadata 静态方法')
  }

  /**
   * 构造函数
   * @param {string} baseUrl - OpenAI API 的基础 URL
   * @param {string} apiKey - OpenAI API 的密钥
   * @throws {Error} 如果 baseUrl 或 apiKey 缺失,则抛出错误
   */
  constructor(adapterConfig) {
    this.config = adapterConfig
    this.models = [] // 可用模型列表
    this.guestModels = [] // 访客可用的模型列表
    this.shieldConfig = {
      enabled: false,
      message: '',
    }

    // 实例化时检测子类是否实现了必要的方法
    if (typeof this.loadModels !== 'function') {
      throw new Error('子类必须实现 initModels 方法')
    }

    if (typeof this.handleChatRequest !== 'function') {
      throw new Error('子类必须实现 handleChatRequest 方法')
    }
  }

  /**
   * 初始化模型列表
   * @returns {Promise<object>} 包含模型和所有者数量的对象
   */
  async loadModels() {
    try {
      if (this.shieldConfig?.enabled) {
        this.models = []
        this.guestModels = []
        return {
          success: true,
          ownerCount: 0,
          modelsCount: 0,
          guestOwnerCount: 0,
          guestModelsCount: 0,
          isShielded: true,
          shieldMessage: this.shieldConfig.message,
        }
      }
      this.models = await this._getModels()
      this.guestModels = this._filterGuestModels()

      return {
        success: true,
        ownerCount: this.models.length,
        modelsCount: this._calculateTotalModels(this.models),
        guestOwnerCount: this.guestModels.length,
        guestModelsCount: this._calculateTotalModels(this.guestModels),
      }
    } catch (error) {
      logger.error(`[BaseLLMAdapter] 模型列表加载失败: ${error.message || error}`)
      // 不再抛出错误，而是返回空模型列表
      this.models = []
      this.guestModels = []

      return {
        success: false,
        error: error.message,
        ownerCount: 0,
        modelsCount: 0,
        guestOwnerCount: 0,
        guestModelsCount: 0,
      }
    }
  }

  /**
   * 手动刷新模型列表（用于用户点击刷新按钮）
   * @returns {Promise<object>} 包含模型和所有者数量的对象
   * @throws {Error} 如果获取模型列表失败，则抛出错误（让用户知道失败）
   */
  async refreshModels() {
    try {
      if (this.shieldConfig?.enabled) {
        throw new Error(this.shieldConfig.message || '该适配器已暂时屏蔽')
      }
      this.models = await this._getModels()
      this.guestModels = this._filterGuestModels()

      return {
        success: true,
        ownerCount: this.models.length,
        modelsCount: this._calculateTotalModels(this.models),
        guestOwnerCount: this.guestModels.length,
        guestModelsCount: this._calculateTotalModels(this.guestModels),
      }
    } catch (error) {
      logger.error('[BaseLLMAdapter] 模型列表刷新失败:', error)
      throw error // 刷新时抛出错误，让前端知道失败
    }
  }

  /**
   * 处理聊天请求
   * @param {object} e - 事件对象，包含聊天请求的详细信息
   * @param {boolean} [firstCall=true] - 是否是第一次调用（用于递归调用）
   */
  async handleChatRequest(e, firstCall = true) {
    try {
      if (firstCall) e.client.pushEvent(e.requestId, e)

      if (e.aborted) return

      // 提前初始化 e._startTime 和 e._timeMetrics，以应对任何地方触发的异常
      e._startTime = Date.now()
      if (!e._timeMetrics) {
        e._timeMetrics = {
          startTime: e._startTime,
          firstTokenTime: null,
          model: e.body?.settings?.base?.model || this.config?.model || 'unknown',
          requestId: e.requestId,
          userId: e.user?.id,
          userIp: e.user?.ip,
          contactorId: e.body?.contactorId,
          presetName: e.body?.settings?.presetSettings?.name,
          isStream: e.body?.settings?.base?.stream ?? true,
          e: e
        }
      }

      // 检查屏蔽状态
      if (this.shieldConfig?.enabled) {
        const tip = this.shieldConfig.message || '该适配器暂时不可用。'
        e.update({
          type: 'content',
          content: `\n\n> [!IMPORTANT]\n> **服务提示**\n> ${tip}\n\n`,
        })
        if (firstCall) e.complete()
        return
      }

      const processedBody = await this._prepareChatBody(e.body)
      // logger.json(processedBody)
      const response = await this._executeChatRequest(processedBody, e)

      if (e.aborted) return

      if (response.toolCalls) {
        // 重置工具模式，防止无限调用
        e.body.settings.toolCallSettings.mode = 'AUTO'

        await this._handleToolCalls(response.toolCalls, e, response.stepId)
      }

      if (firstCall) e.complete()
    } catch (error) {
      if (e.aborted) {
        logger.info(
          `Request ${e.requestId} caught error after abort, ignoring.`,
        )
        const metrics = e._timeMetrics || {
          startTime: e._startTime || Date.now(),
          requestId: e.requestId,
          userId: e.user?.id,
          userIp: e.user?.ip,
          contactorId: e.body?.contactorId,
          presetName: e.body?.settings?.presetSettings?.name,
          model: e.body?.settings?.base?.model || this.config?.model || 'unknown',
          e
        }
        metrics.status = 'ABORTED'
        metrics.errorMessage = error.message || error.toString()
        this.logUsage(this.provider, null, metrics)
        return
      }

      const metrics = e._timeMetrics || {
        startTime: e._startTime || Date.now(),
        requestId: e.requestId,
        userId: e.user?.id,
        userIp: e.user?.ip,
        contactorId: e.body?.contactorId,
        presetName: e.body?.settings?.presetSettings?.name,
        model: e.body?.settings?.base?.model || this.config?.model || 'unknown',
        e
      }
      metrics.status = 'FAILED'
      metrics.errorMessage = error.message || (error.stack ? error.stack.split('\n')[0] : error.toString())
      metrics.errorStack = error.stack
      this.logUsage(this.provider, null, metrics)

      e.error(error) //直接抛出，让调用方处理
    } finally {
      if (firstCall) {
        e.client.popEvent(e.requestId)
        e.client.popConnection(e.requestId)
      }
    }
  }

  /**
   * 获取格式化后的工具配置
   * @private
   * @param {string[]} tools - 可用工具名称列表
   * @returns {object[]|{}} 格式化后的工具配置数组，如果没有工具则返回空对象
   */
  /**
   * 获取用于 tool.json() 的 format type。
   * 子类应覆盖此 getter 以返回正确的类型。
   * 默认返回 'openai'，因为大多数 adapter 兼容 OpenAI 协议。
   */
  get toolJsonType() {
    return 'openai'
  }

  _getFormattedTools(tools, passthrough = false) {
    if (tools?.length > 0) {
      if (passthrough) {
        return tools.map(t => {
          const funcObj = t.function || t
          const dummy = new CustomMioFunction({
            name: funcObj.name,
            description: funcObj.description,
            parameters: funcObj.parameters
          })
          return dummy.json(this.toolJsonType)
        })
      }
      return middleware.llm.getLLMTools(tools, this.toolJsonType)
    }
    return []
  }

  /**
   * 生成随机的调用 ID
   * @private
   * @returns {string} 随机的调用 ID
   */
  _getRandomCallId() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    )
  }

  /**
   * 根据配置过滤访客可用的模型
   * @private
   * @returns {Array<object>} 过滤后的访客模型列表
   */
  _filterGuestModels() {
    const guestConfig = this.config.guest_models || {}
    return this.models.reduce((acc, item) => {
      const allowedModels = this._filterAllowedModels(item.models, guestConfig)
      if (allowedModels.length > 0) {
        acc.push({ owner: item.owner, models: allowedModels })
      }
      return acc
    }, [])
  }

  /**
   * 过滤允许的模型列表
   * @private
   * @param {Array<string>} models - 要过滤的模型名称列表
   * @param {object} guestConfig - 访客模型的配置
   * @returns {Array<string>} 允许的模型名称列表
   */
  _filterAllowedModels(models, guestConfig) {
    return models.filter((modelName) =>
      this._isModelAllowed(modelName, guestConfig),
    )
  }

  /**
   * 检查模型是否被允许
   * @private
   * @param {string} modelName - 要检查的模型名称
   * @param {object} guestConfig - 访客模型的配置
   * @returns {boolean} 如果模型被允许，则返回 true，否则返回 false
   */
  _isModelAllowed(modelName, guestConfig) {
    const { keywords = [], full_name = [] } = guestConfig
    return (
      keywords.some((keyword) => modelName.includes(keyword)) ||
      full_name.some((name) => modelName === name)
    )
  }

  /**
   * 计算模型列表中的模型总数
   * @private
   * @param {Array<object>} modelList - 模型列表
   * @returns {number} 模型总数
   */
  _calculateTotalModels(modelList) {
    return modelList.reduce((acc, cur) => acc + cur.models.length, 0)
  }

  /**
   * 根据所有者对模型进行分组
   * @private
   * @param {Array<object>} models - 从 API 获取的模型数据
   * @param {Array<object>} ownerList - 所有者列表
   * @returns {Array<object>} 按所有者分组的模型列表
   */
  _groupModelsByOwner(models, ownerList = null) {
    // 如果没有传入 ownerList，动态获取
    if (!ownerList) {
      ownerList = config.getModelsOwners() || []
    }

    return models.reduce((acc, model) => {
      const owner = this._determineModelOwner(model.id, ownerList)
      const existingOwner = acc.find((item) => item.owner === owner)

      if (existingOwner) {
        existingOwner.models.push(model.id)
      } else {
        acc.push({ owner, models: [model.id] })
      }
      return acc
    }, [])
  }

  /**
   * 确定模型的所有者
   * @private
   * @param {string} modelId - 模型 ID
   * @param {Array<object>} ownerList - 所有者列表
   * @returns {string} 模型的所有者
   */
  _determineModelOwner(modelId, ownerList) {
    const modelIdLower = modelId.toLowerCase()
    const matchedOwner = ownerList.find(({ keywords }) =>
      keywords.some((keyword) => modelIdLower.includes(keyword)),
    )
    return matchedOwner?.owner || 'Custom'
  }

  /**
   * 对模型列表进行排序（字母表降序，"Custom" 最后）
   * @private
   * @param {Array<object>} modelList - 模型列表
   * @returns {Array<object>} 排序后的模型列表
   */
  _sortModelList(modelList) {
    return modelList.sort((a, b) => {
      if (a.owner === 'Custom') return 1
      if (b.owner === 'Custom') return -1
      return b.owner.localeCompare(a.owner)
    })
  }

  /**
   * 统一用量审计入口 (面向所有 LLM 适配器)
   * 仅负责触发 Hook，具体的统计和持久化由系统钩子接管
   */
  logUsage(providerName, usage, timeMetrics) {
    if (!usage && !timeMetrics) return

    // 状态维护 (保持向下兼容，某些流式逻辑仍需要 e.lastUsage)
    if (timeMetrics && timeMetrics.e) {
      timeMetrics.logged = true
      if (usage) {
        timeMetrics.e.lastUsage = usage
      }
      // 关键关联：让 e 永远能拿到最新的 metrics 细节，以便在抛错捕获处取到最真实的 latency/model/stepId 等
      timeMetrics.e._timeMetrics = timeMetrics
    }

    const finalTimeMetrics = timeMetrics || usage?.e?._timeMetrics || usage?.timeMetrics

    // 触发系统钩子：让 AuditHook (打印/内存统计) 和 DatabaseAuditHook (存库) 自行处理
    hookManager.execute(HOOK_POINTS.LLM_AFTER_CHAT, {
      providerName,
      usage,
      model: finalTimeMetrics?.model || this.config?.model,
      user: finalTimeMetrics?.e?.user,
      timeMetrics: finalTimeMetrics,
      adapter: this
    }).catch(err => logger.error('[审计系统] LLM_AFTER_CHAT 钩子执行失败:', err))
  }


  /**
   * 检查 token 水位线，若超限则触发无状态记忆结晶压缩
   * @private
   */
  async _checkAndCrystallize(e) {
    const watermark = e.body?.settings?.crystallization_token_watermark
    if (!watermark || watermark <= 0) return // 未开启结晶功能

    // 限制单次请求只能触发一次压缩，避免极端情况下无限循环压缩
    if (e._crystallized) {
      logger.debug('[Crystallization] 该请求已执行过记忆结晶压缩，跳过本次判定以避免循环压缩')
      return
    }

    const promptTokens = e.lastUsage?.prompt_tokens ||
                         e.lastUsage?.input_tokens ||
                         e.lastUsage?.promptTokenCount || 0

    if (promptTokens < watermark) return // 未超过水位线

    const messages = e.body.messages || []
    const keepTurns = e.body.settings?.crystallization_keep_turns ?? 1

    // 1. 预先校验：确定要保留的最近 N 个前端轮次的起始位置
    const boundaryIndex = CrystallizationService.scanFrontendTurns(messages, keepTurns)

    // 如果边界是 0，说明没有可压缩的内容，直接返回（不发送 running 状态条，也不做任何压缩）
    if (boundaryIndex <= 0) {
      logger.debug('[Crystallization] 消息链过短，不满足保留轮次要求，跳过结晶判定')
      return
    }

    // 标记已执行压缩，防止递归循环
    e._crystallized = true

    logger.info(
      `[Crystallization] prompt_tokens=${promptTokens} 超过水位线 ${watermark}，触发记忆结晶压缩`
    )

    // 推送"结晶开始"事件到前端（用于 UI 显示事件条）
    e.update({
      type: 'crystallize',
      content: { status: 'running', prompt_tokens: promptTokens },
    })

    try {
      const result = await CrystallizationService.compress(e, this, boundaryIndex)

      if (result) {
        // 覆盖当前 event 的消息链
        e.body.messages = result.messages

        logger.info(
          `[Crystallization] 压缩完成，新消息链长度: ${result.messages.length}，结晶 ${result.summary.length} 字符`
        )

        // 推送"结晶完成"事件到前端（包含新的 XML summary）
        e.update({
          type: 'crystallize',
          content: { status: 'finished', summary: result.summary },
        })
      } else {
        logger.debug('[Crystallization] 压缩服务返回 null，通知前端关闭状态条')
        e.update({
          type: 'crystallize',
          content: { status: 'finished', summary: e.body.settings?.previous_summary || '' },
        })
      }
    } catch (err) {
      logger.error('[Crystallization] 压缩过程发生异常，通知前端关闭状态条:', err.message)
      e.update({
        type: 'crystallize',
        content: { status: 'finished', summary: e.body.settings?.previous_summary || '' },
      })
    }
  }

  /**
   * 规整化历史消息中的 tool call ID。
   * Gemini 的 tool call ID 可能包含很长的 base64 thought_signature (长度超过 64 字节)，
   * 当切换到 OpenAI/DeepSeek 等对 ID 长度有严格上限（最大 64 字节）的适配器时，会导致 400 报错。
   * 本方法会深拷贝消息列表，将长度 > 64 字节的 ID 映射并截短为符合标准的随机安全 ID，
   * 同时对对应的 tool 角色消息的 tool_call_id 进行同步映射更新，确保匹配完整。
   */
  _normalizeToolCallIds(messages) {
    if (!Array.isArray(messages)) return messages

    const toolCallIdMap = new Map()
    // 使用浅拷贝 + 按需深拷贝代替 JSON.parse(JSON.stringify(...))，
    // 避免对含大字符串的消息历史做全量深拷贝导致瞬时内存翻倍。
    const result = Array.from({ length: messages.length })

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]
      if (message.role === 'assistant' && Array.isArray(message.tool_calls)) {
        let modified = false
        const newToolCalls = message.tool_calls.map(toolCall => {
          const idStr = String(toolCall.id || '')
          if (idStr.length > 64) {
            const md5 = crypto.createHash('md5').update(idStr).digest('hex')
            const shortId = 'mc_' + md5
            toolCallIdMap.set(idStr, shortId)
            modified = true
            return { ...toolCall, id: shortId }
          }
          return toolCall
        })
        result[i] = modified ? { ...message, tool_calls: newToolCalls } : message
      } else if (message.role === 'tool' && message.tool_call_id) {
        const idStr = String(message.tool_call_id)
        if (toolCallIdMap.has(idStr)) {
          result[i] = { ...message, tool_call_id: toolCallIdMap.get(idStr) }
        } else if (idStr.length > 64) {
          const md5 = crypto.createHash('md5').update(idStr).digest('hex')
          const shortId = 'mc_' + md5
          toolCallIdMap.set(idStr, shortId)
          result[i] = { ...message, tool_call_id: shortId }
        } else {
          result[i] = message
        }
      } else {
        result[i] = message
      }
    }

    return result
  }

  /**
   * 处理工具调用 (基类统一实现)
   * @param {object[]} toolCalls - 工具调用数组
   * @param {object} e - 事件对象
   * @param {string} stepId - 步骤 ID
   */
  async _handleToolCalls(toolCalls, e, stepId) {
    if (!e.body.messages) {
      e.body.messages = [] // 确保 e.body.messages 存在
    }

    let callMessage = { role: 'assistant', tool_calls: toolCalls }

    callMessage.tool_calls.forEach((item) => {
      item.id = item.id || this._getRandomCallId()
    })

    if (e.body.extraCachedContent) {
      callMessage.content = e.body.extraCachedContent
      delete e.body.extraCachedContent
    }

    // 子类可选扩展点：例如 OpenAIBot 可以用来注入 reasoning_content 等
    if (typeof this._extendAssistantMessage === 'function') {
      this._extendAssistantMessage(callMessage, e)
    }

    e.body.messages.push(callMessage)

    const tasks = []
    const allPostMessages = [] // 用于收集所有工具产生的后置消息
    const executedTools = []

    for (const call of toolCalls) {
      if (e.aborted) break
      const toolCall = call.function
      const toolCallId = call.id || call.call_id || this._getRandomCallId()
      const toolCallData = {
        name: toolCall.name,
        id: toolCallId,
        action: 'running',
        parameters: toolCall.arguments,
        result: '',
      }
      e.update({
        type: 'toolCall',
        content: toolCallData,
      })
      logger.info(`执行工具：${toolCall.name}，参数：${toolCall.arguments}`)

      const runTask = async () => {
        try {
          const toolResult = await middleware.llm.runTool(
            toolCallData,
            e.user,
            e,
          )
          let { result } = toolResult

          // 提前提取 _postMessages（如图片载体），在 result 被展平为字符串之前
          const postMessages = result && typeof result === 'object' ? result._postMessages : null

          // Extract extraRender to keep it separate from LLM messages
          let extraRender = toolCallData.extraRender || []

          if (result && typeof result === 'object') {
            if (result.extraRender) {
              const incomingExtra = Array.isArray(result.extraRender) ? result.extraRender : [result.extraRender]
              extraRender = [...extraRender, ...incomingExtra.map(item => ({ placement: 'inner', ...item }))]
            }
            if ('result' in result) {
              result = result.result
            } else if (result.extraRender) {
              const resultCopy = { ...result }
              delete resultCopy.extraRender
              result = resultCopy
            }
          }

          // 处理特殊的返回格式，该格式包含工具执行后的后置消息（例如视觉多模态注入）
          if (postMessages) {
            allPostMessages.push(...postMessages)
          }

          logger.info(`运行结果：${JSON.stringify(result)}`)

          executedTools.push({
            name: toolCall.name,
            arguments: typeof toolCall.arguments === 'string' ? toolCall.arguments : JSON.stringify(toolCall.arguments),
            output: typeof result === 'string' ? result : JSON.stringify(result)
          })

          e.body.messages.push({
            role: 'tool',
            content: typeof result === 'string' ? result : JSON.stringify(result),
            tool_call_id: toolCallId,
            name: toolCall.name,
          })

          toolCallData.result = result
          toolCallData.action = 'finished'
          toolCallData.extraRender = extraRender
          e.update({
            type: 'toolCall',
            content: toolCallData,
          })
        } catch (err) {
          if (err.message === 'USER_ABORT') {
            logger.info(
              `Tool execution ${toolCall.name} aborted for request ${e.requestId}`,
            )
            return
          }
          throw err
        }
      }

      tasks.push(runTask())
    }

    await Promise.allSettled(tasks)

    if (e.aborted) return

    // 触发工具执行详情审计钩子
    hookManager.execute(HOOK_POINTS.LLM_TOOL_RESULTS, {
      requestId: e.requestId,
      executedTools
    }).catch(err => logger.error('[审计系统] LLM_TOOL_RESULTS 钩子执行失败:', err))

    // 所有 tool 结果注入完成后，合并并统一注入后置消息（如图片），避免角色交替错误
    if (allPostMessages.length > 0) {
      logger.info(`合并并注入后置消息：${allPostMessages.length} 个片段`)
      const mergedContent = []
      allPostMessages.forEach((msg) => {
        if (Array.isArray(msg.content)) {
          mergedContent.push(...msg.content)
        } else if (msg.content) {
          mergedContent.push({
            type: 'text',
            text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          })
        }
      })
      e.body.messages.push({ role: 'user', content: mergedContent })
    }

    // 在递归之前，检查是否需要触发记忆结晶压缩
    await this._checkAndCrystallize(e)

    // 递归调用 handleChatRequest 方法来处理工具调用的结果
    await this.handleChatRequest(e, false)
  }
}
