import config from '../../../config.js'
import prismaManager from '../../../database/prisma.js'
import CrystallizationService from '../services/CrystallizationService.js'
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
        return
      }
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
   * @param {object} body - 请求体
   * @returns {object|null} 格式化后的工具配置，如果没有工具则返回 null
   */
  _getFormattedTools(tools) {
    // 假设middleware.getOpenaiTools存在，且根据tools获取openai可以使用的工具
    if (tools?.length > 0) {
      return middleware.llm.getLLMTools(tools, this.provider)
    }
    return {}
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
   * 统一用量审计日志打印工具 (面向所有 LLM 适配器)
   */
  logUsage(providerName, usage, timeMetrics) {
    if (!usage) return

    if (timeMetrics) {
      if (timeMetrics.logged) return
      timeMetrics.logged = true
      if (timeMetrics.e) {
        timeMetrics.e.lastUsage = usage
      }
    }

    const prompt = usage.promptTokenCount || usage.prompt_tokens || usage.input_tokens || 0
    const thoughts = usage.thoughtsTokenCount || 
                     usage.thinking_tokens || 
                     usage.completion_tokens_details?.reasoning_tokens || 
                     usage.output_tokens_details?.reasoning_tokens || 
                     usage.output_token_details?.reasoning_tokens || 
                     0
    const candidates = usage.candidatesTokenCount || usage.completion_tokens || usage.output_tokens || 0
    const total = usage.totalTokenCount || usage.total_tokens || (prompt + candidates)
    const type = usage.trafficType || ''

    let ttftStr = ''
    let tpsStr = ''

    if (timeMetrics) {
      const { startTime, firstTokenTime } = timeMetrics
      const now = Date.now()
      
      if (firstTokenTime) {
        // 流式模式
        const ttftMs = firstTokenTime - startTime
        ttftStr = `${ttftMs} ms`
        
        const generationMs = now - firstTokenTime
        const generationSec = generationMs / 1000
        if (generationSec > 0) {
          tpsStr = `${(candidates / generationSec).toFixed(2)} tokens/s`
        }
      } else {
        // 非流式模式
        const durationMs = now - startTime
        const durationSec = durationMs / 1000
        ttftStr = `${durationMs} ms (Non-Stream)`
        if (durationSec > 0) {
          tpsStr = `${(candidates / durationSec).toFixed(2)} tokens/s`
        }
      }
    }

    const getAlignedRow = (label, val) => {
      let displayLength = 0
      for (let i = 0; i < label.length; i++) {
        const code = label.charCodeAt(i)
        if (code >= 0x4e00 && code <= 0x9fff) {
          displayLength += 2
        } else {
          displayLength += 1
        }
      }
      const padTotal = Math.max(0, 30 - displayLength)
      return `│ ${label}${' '.repeat(padTotal)} │ ${val.toString().padEnd(22)} │`
    }

    const lines = []
    lines.push(`┌────────────────────────────────────────────────────────┐`)

    // 动态居中标题，支持中文等宽字符对齐
    const rawTitle = `[${providerName} API 用量审计 / Usage Audit]`
    let displayLength = 0
    for (let i = 0; i < rawTitle.length; i++) {
      const code = rawTitle.charCodeAt(i)
      if (code >= 0x4e00 && code <= 0x9fff) {
        displayLength += 2
      } else {
        displayLength += 1
      }
    }
    const totalInsideWidth = 54
    const padTotal = Math.max(0, totalInsideWidth - displayLength)
    const leftPad = Math.floor(padTotal / 2)
    const rightPad = padTotal - leftPad
    lines.push(`│${' '.repeat(leftPad + 1)}${rawTitle}${' '.repeat(rightPad + 1)}│`)

    lines.push(`├───────────────────────────────┬────────────────────────┤`)
    
    const model = timeMetrics?.model || ''
    if (model) {
      lines.push(getAlignedRow('审计模型 (Model)', model))
      lines.push(`├───────────────────────────────┼────────────────────────┤`)
    }

    lines.push(getAlignedRow('输入 Tokens (Prompt)', prompt))

    if (thoughts > 0) {
      lines.push(getAlignedRow('思考 Tokens (Thoughts)', thoughts))
    }

    // 缓存用量审计 (支持命中与未命中双维度统计)
    const hasCacheSupport = (usage.prompt_tokens_details !== undefined) || 
                            (usage.input_tokens_details !== undefined) ||
                            (usage.input_token_details !== undefined) ||
                            (usage.prompt_cache_hit_tokens !== undefined) ||
                            (usage.prompt_cache_miss_tokens !== undefined)
    
    if (hasCacheSupport) {
      const cacheHit = usage.prompt_tokens_details?.cached_tokens || 
                       usage.input_tokens_details?.cached_tokens || 
                       usage.input_token_details?.cached_tokens || 
                       usage.prompt_cache_hit_tokens || 
                       0
      const cacheMiss = usage.prompt_cache_miss_tokens !== undefined 
                        ? usage.prompt_cache_miss_tokens 
                        : Math.max(0, prompt - cacheHit)

      lines.push(getAlignedRow('缓存命中 (Cache Hit)', cacheHit))
      lines.push(getAlignedRow('缓存未命中 (Cache Miss)', cacheMiss))

      const hitRate = prompt > 0 ? ((cacheHit / prompt) * 100).toFixed(2) : '0.00'
      lines.push(getAlignedRow('缓存利用率 (Cache Hit Rate)', `${hitRate}%`))
    }

    lines.push(getAlignedRow('输出 Tokens (Candidates)', candidates))
    lines.push(`├───────────────────────────────┼────────────────────────┤`)
    lines.push(getAlignedRow('总计 Tokens (Total)', total))

    // 选填字段（如为 N/A 或空，直接不显示）
    if (type && type !== 'N/A') {
      lines.push(getAlignedRow('计费类型 (Traffic Type)', type))
    }
    if (ttftStr && ttftStr !== 'N/A') {
      lines.push(getAlignedRow('首字延迟 (TTFT)', ttftStr))
    }
    if (tpsStr && tpsStr !== 'N/A') {
      lines.push(getAlignedRow('响应速度 (Generation Speed)', tpsStr))
    }

    lines.push(`└────────────────────────────────────────────────────────┘`)

    logger.mark(`\n` + lines.join('\n'))

    // 异步后台落库，保证不阻塞流式会话输出的主线程
    const savePromise = this._saveCallLogToDb(providerName, usage, timeMetrics).catch(err => {
      logger.error(`[BaseLLMAdapter] 保存调用审计日志失败:`, err)
    })

    if (timeMetrics && timeMetrics.e && timeMetrics.stepId) {
      if (!timeMetrics.e._pendingToolLogs) {
        timeMetrics.e._pendingToolLogs = new Map()
      }
      timeMetrics.e._pendingToolLogs.set(timeMetrics.stepId, savePromise)
    }
  }

  /**
   * 异步将大模型调用审计日志存入数据库
   * @private
   */
  async _saveCallLogToDb(providerName, usage, timeMetrics) {
    if (!timeMetrics || !timeMetrics.requestId) return

    try {
      const prompt = usage.promptTokenCount || usage.prompt_tokens || usage.input_tokens || 0
      const thoughts = usage.thoughtsTokenCount || 
                       usage.thinking_tokens || 
                       usage.completion_tokens_details?.reasoning_tokens || 
                       usage.output_tokens_details?.reasoning_tokens || 
                       usage.output_token_details?.reasoning_tokens || 
                       0
      const cached = usage.prompt_tokens_details?.cached_tokens || 
                     usage.input_tokens_details?.cached_tokens || 
                     usage.input_token_details?.cached_tokens || 
                     usage.prompt_cache_hit_tokens || 
                     0
      const cacheMiss = usage.prompt_cache_miss_tokens !== undefined 
                        ? usage.prompt_cache_miss_tokens 
                        : (usage.prompt_tokens_details || usage.input_tokens_details || usage.input_token_details || usage.prompt_cache_hit_tokens || usage.prompt_cache_miss_tokens ? Math.max(0, prompt - cached) : 0)

      const candidates = usage.candidatesTokenCount || usage.completion_tokens || usage.output_tokens || 0
      const total = usage.totalTokenCount || usage.total_tokens || (prompt + candidates)

      // 计算耗时与速度指标
      const startTime = timeMetrics.startTime
      const firstTokenTime = timeMetrics.firstTokenTime
      const now = Date.now()
      const latency = now - startTime

      let ttft = null
      let tps = null

      if (firstTokenTime) {
        ttft = firstTokenTime - startTime
        const generationMs = now - firstTokenTime
        const generationSec = generationMs / 1000
        if (generationSec > 0) {
          tps = candidates / generationSec
        }
      } else {
        const durationSec = latency / 1000
        if (durationSec > 0) {
          tps = candidates / durationSec
        }
      }

      // 初始化并获取数据库客户端
      await prismaManager.initialize()
      const prisma = prismaManager.getClient()

      let sessionTitle = timeMetrics.e?.metaData?.contactorName || null

      if (!sessionTitle) {
        const messages = timeMetrics.e?.body?.messages || []
        const firstUser = messages.find(m => m.role === 'user')
        if (firstUser) {
          const content = typeof firstUser.content === 'string'
            ? firstUser.content
            : (Array.isArray(firstUser.content)
               ? firstUser.content.find(c => c.type === 'text')?.text || ''
               : '')
          if (content) {
            sessionTitle = content.trim().substring(0, 50)
          }
        }
      }

      const preset = timeMetrics.presetName || ''
      if (preset.toLowerCase().startsWith('system_title') || preset.toLowerCase().includes('title') || timeMetrics.requestId?.startsWith('system_title_')) {
        sessionTitle = '🏷️ 自动生成会话标题'
      }

      const logRecord = await prisma.lLMCallLog.create({
        data: {
          requestId: timeMetrics.requestId,
          userId: timeMetrics.userId || null,
          userIp: timeMetrics.userIp || null,
          contactorId: timeMetrics.contactorId || null,
          presetName: timeMetrics.presetName || null,
          sessionTitle: sessionTitle || null,
          provider: providerName.toLowerCase(),
          model: timeMetrics.model || 'unknown',
          isStream: timeMetrics.isStream !== undefined ? timeMetrics.isStream : true,
          trafficType: usage.trafficType || null,
          promptTokens: prompt,
          candidatesTokens: candidates,
          thinkingTokens: thoughts,
          toolsCalled: timeMetrics.toolsCalled ? JSON.stringify(timeMetrics.toolsCalled) : '[]',
          cacheHitTokens: cached,
          cacheMissTokens: cacheMiss,
          totalTokens: total,
          latency,
          ttft,
          tps,
          status: 'SUCCESS'
        }
      })
      return logRecord.id
    } catch (err) {
      logger.error('[BaseLLMAdapter] 保存大模型调用审计日志失败:', err)
    }
  }

  /**
   * 统一将工具调用的参数与结果更新到数据库中
   * @protected
   */
  async _updateToolCallLogsInDb(e, stepId, executedTools) {
    if (!stepId || !e._pendingToolLogs || !e._pendingToolLogs.has(stepId)) return

    try {
      const logIdPromise = e._pendingToolLogs.get(stepId)
      const logId = await logIdPromise
      if (logId) {
        await prismaManager.initialize()
        const prisma = prismaManager.getClient()
        await prisma.lLMCallLog.update({
          where: { id: logId },
          data: {
            toolDetails: JSON.stringify(executedTools)
          }
        })
        logger.debug(`[BaseLLMAdapter] 成功为步骤 ${stepId} (DB ID: ${logId}) 更新工具调用详情`)
      }
    } catch (dbErr) {
      logger.error(`[BaseLLMAdapter] 更新工具调用详情失败:`, dbErr)
    }
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

    // 标记已执行压缩
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
      // 动态导入 llmService，避免循环依赖
      const llmService = (await import('../index.js')).default

      const result = await CrystallizationService.compress(e, llmService)

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
        logger.debug('[Crystallization] 压缩服务返回 null，跳过')
      }
    } catch (err) {
      logger.error('[Crystallization] 压缩过程发生异常，跳过:', err.message)
      // 压缩失败不中断主流程，继续正常递归
    }
  }
}
