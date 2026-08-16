import BaseLLMAdapter from '../base.js'
import OpenAI from 'openai'
import { imgUrlToBase64 } from '../../../../../utils/imgTools.js'

/**
 * @class OpenAI Responses API 实现 (OpenAI 2026+ Unified API)
 */
export default class OpenAIResponsesBot extends BaseLLMAdapter {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      description:
        'OpenAI Responses (Realtime/Agentic) 协议适配器。支持 OpenAI 最新的状态化会话与原生工具调用能力（如内置 SearchGPT），专为高性能 Agent 场景设计。该接口亦兼容其他实现了 OpenAI Responses 规范的第三方增强网关。\n\n**获取方式**：在 [OpenAI Platform](https://platform.openai.com/api_keys) 创建具有相应权限的 API 密钥。',
      extraSettingsSchema: {
        openai: {
          web_search: {
            fields: {
              allowed_domains: {
                default: [],
                label: '白名单域名',
                placeholder: 'openai.com',
                type: 'array',
              },
              blocked_domains: {
                default: [],
                label: '黑名单域名',
                type: 'array',
              },
              enable: {
                default: false,
                label: '启用',
                type: 'boolean',
              },
              search_context_size: {
                default: 'medium',
                label: '搜索深度',
                options: [
                  { label: '低', value: 'low' },
                  { label: '中', value: 'medium' },
                  { label: '高', value: 'high' },
                ],
                type: 'select',
              },
            },
            label: '联网搜索 (SearchGPT)',
            type: 'group',
          },
        },
      },
      initialConfigSchema: {
        api_key: {
          default: '',
          description: 'OpenAI API 密钥',
          label: 'API Key',
          required: true,
          type: 'password',
        },
        base_url: {
          default: 'https://api.openai.com/v1',
          description: 'OpenAI API 的基础 URL',
          label: 'Base URL',
          required: false,
          type: 'url',
        },
        enable: {
          default: true,
          description: '是否启用此适配器实例',
          label: '启用',
          required: true,
          type: 'boolean',
        },
        name: {
          default: '',
          description: '适配器实例的自定义名称',
          label: '实例名称',
          required: false,
          type: 'string',
        },
      },
      name: 'OpenAI Responses',
      supportedFeatures: [
        'chat',
        'streaming',
        'function_calling',
        'vision',
        'reasoning',
      ],
      type: 'openai-responses',
    }
  }

  /** OpenAI Responses API 适配器 → json 格式类型为 'openai-responses'（扁平结构） */
  get toolJsonType() {
    return 'openai-responses'
  }

  constructor(openaiConfig) {
    super(openaiConfig)
    this.provider = 'openai-responses'
  }

  get openai() {
    const { base_url, api_key } = this.config
    if (!api_key) {throw new Error('OpenAI API Key 未配置')}
    const apiKeys = api_key.split(',')
    const selectedKey = apiKeys[Math.floor(Math.random() * apiKeys.length)]
    return new OpenAI({ apiKey: selectedKey, baseURL: base_url })
  }

  // ---------------------- 私有辅助方法 ----------------------

  async _prepareChatBody(body) {
    logger.info(
      `[${this.provider.toUpperCase()}-Responses] Entering _prepareChatBody`,
    )
    const { messages, settings } = body
    const normalizedMessages = this._normalizeToolCallIds(messages)
    const { base, chatParams, toolCallSettings } = settings
    const model = base.model || ''

    // 1. 提取系统消息作为 instructions
    let instructions = ''
    const filteredMessages = []

    for (const msg of normalizedMessages) {
      if (msg.role === 'system') {
        instructions += (instructions ? '\n' : '') + msg.content
      } else {
        filteredMessages.push(msg)
      }
    }

    // 2. 处理消息中的图片等
    const processedInput = await this._processMessages(filteredMessages, model)

    // 3. 处理工具
    const { tools, mode } = toolCallSettings
    const { extraSettings } = settings
    let parsedTools = []
    // A. 函数调用工具
    if (mode !== 'NONE' && tools?.length > 0) {
      parsedTools = this._getFormattedTools(tools, toolCallSettings.passthrough)
    }

    const preparedBody = {
      input: processedInput,
      instructions: instructions || undefined,
      model: base.model,
      store: false, // 强制关闭服务端状态，由本地管理上下文
      stream: base.stream,
    }

    const reasoningEffortMap = {
      '-1': undefined,   // 不传，用 API 默认 (medium)
      0: 'none',
      1: 'none',
      2: 'low',
      3: 'medium',
      4: 'high',
      5: 'max',          // GPT 5.6 最强档
    }

    // 辅助函数：校验 Boolean / String / Number / Object({ enable: true })
    const isEnabled = (v) => {
      if (v === true || v === 'true' || v === 1) {return true}
      if (typeof v === 'object' && v !== null && (v.enable === true || v.enabled === true)) {return true}
      return false
    }

    // B. OpenAI 内置工具 (Responses API)
    const providerSettings =
      extraSettings?.[this.provider] || extraSettings?.openai || extraSettings || {}
    const ws = providerSettings.web_search || {}

    // A. 联网搜索 (OpenAI 原生 SearchGPT)
    if (isEnabled(ws)) {
      const wsConfig = typeof ws === 'object' ? ws : {}
      parsedTools.push({
        allowed_domains:
          wsConfig.allowed_domains?.length > 0 ? wsConfig.allowed_domains : undefined,
        blocked_domains:
          wsConfig.blocked_domains?.length > 0 ? wsConfig.blocked_domains : undefined,
        search_context_size: wsConfig.search_context_size || undefined,
        type: 'web_search',
      })
    }

    preparedBody.tools = parsedTools.length > 0 ? parsedTools : undefined
    preparedBody.tool_choice =
      mode === 'ANY' && parsedTools.length > 0 ? 'required' : undefined

    // 选择性地添加参数，只有当它们不是默认值时才发送，以避免 API 报错
    if (chatParams.temperature !== undefined && chatParams.temperature !== 1) {
      preparedBody.temperature = chatParams.temperature
    }
    if (chatParams.top_p !== undefined && chatParams.top_p !== 1) {
      preparedBody.top_p = chatParams.top_p
    }
    if (
      chatParams.frequency_penalty !== undefined &&
      chatParams.frequency_penalty !== 0
    ) {
      preparedBody.frequency_penalty = chatParams.frequency_penalty
    }
    if (
      chatParams.presence_penalty !== undefined &&
      chatParams.presence_penalty !== 0
    ) {
      preparedBody.presence_penalty = chatParams.presence_penalty
    }
    if (chatParams.max_tokens !== undefined) {
      preparedBody.max_output_tokens = chatParams.max_tokens // Responses API 使用 max_output_tokens
    }

    // 映射推理强度
    const effortValue = chatParams.reasoning_effort
    preparedBody.reasoning =
      effortValue === -1 || effortValue === undefined
        ? undefined
        : {
            effort: reasoningEffortMap[effortValue] || 'medium',
          }

    // 清理 undefined 字段
    return JSON.parse(JSON.stringify(preparedBody))
  }

  async _getModels() {
    try {
      const list = await this.openai.models.list()
      const modelList = this._groupModelsByOwner(list.data)
      return this._sortModelList(modelList)
    } catch (error) {
      logger.error('Failed to get models:', error)
      throw error
    }
  }

  async _processMessages(messages, modelName) {
    const processed = []
    const ensureFc = (id) => (id && !id.startsWith('fc_') ? `fc_${id}` : id)

    for (const message of messages) {
      const { role, content, tool_calls, tool_call_id } = message

      // 1. 处理工具结果 (Item: function_call_output)
      if (role === 'tool') {
        processed.push({
          call_id: ensureFc(tool_call_id),
          output:
            typeof content === 'string' ? content : JSON.stringify(content),
          type: 'function_call_output',
        })
        continue
      }

      // 2. 处理助手的工具调用 (Item: function_call)
      if (role === 'assistant' && tool_calls && Array.isArray(tool_calls)) {
        // 先输出助手文本，再输出 function_call items，
        // 符合 Responses 规范的顺序约定：text → calls → outputs
        // （部分严格实现如 DeepSeek V4 会按数组顺序配对，乱序会报 No tool output found）
        if (content) {
          processed.push({ content, role: 'assistant' })
        }
        for (const call of tool_calls) {
          const safeId = ensureFc(call.id)
          processed.push({
            arguments: (() => {
              const argVal = call.function?.arguments || call.arguments
              if (!argVal) return ''
              return typeof argVal === 'string' ? argVal : JSON.stringify(argVal)
            })(),
            call_id: safeId,
            id: safeId,
            name: call.function?.name || call.name,
            type: 'function_call',
          })
        }
        continue
      }

      // 3. 处理普通消息 (User/Assistant Text + Vision)
      if (Array.isArray(content)) {
        const processedContent = []
        for (const part of content) {
          if (part.type === 'image_url' || part.type === 'input_image') {
            // 按模型细粒度判断：无视觉能力的模型跳过图片消息
            if (this._shouldFilterVision(modelName)) {continue}
            const url = part.image_url?.url || part.image_url || part.image
            let base64Val = null
            if (typeof url === 'string') {
              if (url.startsWith('http')) {
                const res = await imgUrlToBase64(url)
                base64Val = res.data
              } else if (!url.startsWith('data:')) {
                base64Val = `data:image/jpeg;base64,${url}`
              }
            }
            const finalUrl = base64Val || url

            processedContent.push({
              image_url: finalUrl,
              type: 'input_image',
            })
          } else if (part.type === 'text' || part.type === 'input_text') {
            processedContent.push({
              text: part.text,
              type: 'input_text',
            })
          } else {
            processedContent.push(part)
          }
        }
        processed.push({ content: processedContent, role })
      } else {
        processed.push({ content, role })
      }
    }
    return processed
  }

  /**
   * 执行 Responses API 请求
   */
  async _executeChatRequest(body, e) {
    const stepId = Math.random().toString(36).substring(2, 9)
    const enableStream = body.stream ?? true
    const callMessage = { tool_calls: [] }
    let cachedContent = ''

    logger.info(
      `[${this.provider.toUpperCase()}-Responses] Request Body: ${JSON.stringify(body, null, 2)}`,
    )

    try {
      if (enableStream) {
        const controller = new AbortController()
        e.onAbort(() => controller.abort())

        // 使用新的 responses.create
        const stream = await this.openai.responses.create(body, {
          signal: controller.signal,
        })

        logger.info(
          `[${this.provider.toUpperCase()}-Responses] Stream object type: ${typeof stream}, ${Boolean(stream[Symbol.asyncIterator])}`,
        )

        e.client.pushConnection(e.requestId, stream)
        e.pending()

        const timeMetrics = {
          contactorId: e?.body?.contactorId,
          e: e,
          firstTokenTime: null,
          isStream: true,
          model: body.model,
          presetName: e?.body?.settings?.presetSettings?.name,
          requestId: e?.requestId,
          startTime: Date.now(),
          stepId,
          userId: e?.user?.id,
          userIp: e?.user?.ip
        }

        let lastUsage = null

        for await (const chunk of stream) {
          if (e.aborted) {break}


          const { type } = chunk

          // 记录首字延迟 (TTFT)
          if ((type === 'response.output_text.delta' || type === 'response.output_reasoning.delta' || type === 'response.reasoning_summary_text.delta' || type === 'response.output_item.added') && !timeMetrics.firstTokenTime) {
            timeMetrics.firstTokenTime = Date.now()
          }

          // 记录用量统计 (OpenAI Responses: chunk.response.usage)
          const usage = chunk.usage || chunk.usage_metadata || chunk.usageMetadata || chunk.response?.usage
          if (usage) {
            lastUsage = usage
            e.lastUsage = usage
          }

          // 1. 处理文本增量
          if (type === 'response.output_text.delta') {
            e.update({ content: chunk.delta, type: 'content' })
            cachedContent += chunk.delta
          }
          // 2. 处理推理增量 (OpenAI: response.output_reasoning.delta, xAI: response.reasoning_summary_text.delta)
          else if (
            type === 'response.output_reasoning.delta' ||
            type === 'response.reasoning_summary_text.delta'
          ) {
            e.update({ content: chunk.delta, type: 'reasoningContent' })
          }
          // 3. 处理工具调用开始 (output_item.added)
          else if (
            type === 'response.output_item.added' &&
            chunk.item?.type === 'function_call'
          ) {
            const {item} = chunk
            const existingCall = {
              function: { arguments: '', name: item.name },
              id: item.id,
              type: 'function',
            }
            callMessage.tool_calls.push(existingCall)

            e.update({
              content: {
                action: 'started',
                id: existingCall.id,
                name: existingCall.function.name,
                parameters: '',
                result: '',
              },
              type: 'toolCall',
            })
          }
          // 4. 处理工具调用参数增量 (response.function_call_arguments.delta)
          else if (type === 'response.function_call_arguments.delta') {
            const existingCall = callMessage.tool_calls.find(
              (c) => c.id === chunk.item_id,
            )
            if (existingCall) {
              existingCall.function.arguments += chunk.delta
              e.update({
                content: {
                  action: 'pending',
                  id: existingCall.id,
                  name: existingCall.function.name,
                  parameters: chunk.delta,
                  result: '',
                },
                type: 'toolCall',
              })
            }
          }
          // 5. 处理工具调用完成 (response.function_call_arguments.done)
          else if (type === 'response.function_call_arguments.done') {
            const existingCall = callMessage.tool_calls.find(
              (c) => c.id === chunk.item_id,
            )
            if (existingCall) {
              existingCall.function.arguments = chunk.arguments
            }
          }
        }

        const finalUsage = lastUsage || { completion_tokens: 0, prompt_tokens: 0, total_tokens: 0 }
        const providerName = this.constructor.getAdapterMetadata()?.name || this.provider
        if (callMessage && callMessage.tool_calls && callMessage.tool_calls.length > 0) {
          timeMetrics.toolsCalled = callMessage.tool_calls.map(tc => tc.function?.name).filter(Boolean)
        }
        this.logUsage(providerName, finalUsage, timeMetrics)

        if (callMessage.tool_calls.length > 0) {
          if (cachedContent) {
            e.body.extraCachedContent = cachedContent
          }
          return { stepId, toolCalls: callMessage.tool_calls }
        }
      } else {
        // 非流式处理
        const timeMetrics = {
          contactorId: e?.body?.contactorId,
          e: e,
          firstTokenTime: null,
          isStream: false,
          model: body.model,
          presetName: e?.body?.settings?.presetSettings?.name,
          requestId: e?.requestId,
          startTime: Date.now(),
          stepId,
          userId: e?.user?.id,
          userIp: e?.user?.ip
        }
        const controller = new AbortController()
        e.onAbort(() => controller.abort())

        const response = await this.openai.responses.create(body, {
          signal: controller.signal,
        })


        const usage = response.usage || response.usageMetadata || response.usage_metadata || response.response?.usage
        if (usage) {
          const providerName = this.constructor.getAdapterMetadata()?.name || this.provider
          this.logUsage(providerName, usage, timeMetrics)
        }

        const toolCalls = []
        let nonStreamContent = ''
        if (Array.isArray(response.output)) {
          for (const out of response.output) {
            if (out.type === 'message' && Array.isArray(out.content)) {
              for (const part of out.content) {
                if (part.type === 'output_text') {
                  e.update({ content: part.text, type: 'content' })
                  nonStreamContent += part.text
                } else if (part.type === 'reasoning_text') {
                  e.update({ content: part.text, type: 'reasoningContent' })
                }
              }
            } else if (out.type === 'function_call') {
              toolCalls.push({
                ...out,
                function: { arguments: out.arguments, name: out.name },
              })
            }
          }
        }

        if (toolCalls.length > 0) {
          if (nonStreamContent) {
            e.body.extraCachedContent = nonStreamContent
          }
          return { stepId, toolCalls }
        }
      }
      return {}
    } catch (error) {
      logger.error('[OpenAI-Responses] API Error:', error)
      throw error
    }
  }
}
