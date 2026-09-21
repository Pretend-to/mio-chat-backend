import BaseLLMAdapter from '../base.js'
import OpenAI from 'openai'
import { resolveImageAsBase64 } from '../../../../../utils/imgTools.js'

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
    if (!api_key) {
      throw new Error('OpenAI API Key 未配置')
    }
    const apiKeys = api_key.split(',')
    const selectedKey = apiKeys[Math.floor(Math.random() * apiKeys.length)]
    return new OpenAI({ apiKey: selectedKey, baseURL: base_url })
  }

  // ---------------------- 私有辅助方法与模板方法 ----------------------

  async _buildChatRequestBody(body, context = null) {
    logger.info(
      `[${this.provider.toUpperCase()}-Responses] Entering _buildChatRequestBody`,
    )
    const { messages = [], settings = {} } = body || {}
    const normalizedMessages = this._normalizeToolCallIds(messages)
    const { base = {}, chatParams = {}, toolCallSettings = {} } = settings || {}
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

    const visionOverride = base.vision ?? settings.general?.vision
    // 2. 处理消息中的图片等
    const processedInput = await this._processMessages(
      filteredMessages,
      model,
      visionOverride,
    )

    // 3. 处理工具
    const { tools, mode } = toolCallSettings
    let parsedTools = []
    // A. 函数调用工具
    if (mode !== 'NONE' && tools?.length > 0) {
      parsedTools = this._getFormattedTools(
        tools,
        toolCallSettings.passthrough,
        context || body,
      )
    }

    const preparedBody = {
      input: processedInput,
      instructions: instructions || undefined,
      model: base.model,
      store: false, // 强制关闭服务端状态，由本地管理上下文
      stream: base.stream,
    }

    const reasoningEffortMap = {
      '-1': undefined, // 不传，用 API 默认 (medium)
      0: 'none',
      1: 'none',
      2: 'low',
      3: 'medium',
      4: 'high',
      5: 'max', // GPT 5.6 最强档
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
      // Responses API (如 OpenAI / 火山方舟) 规范下限为 16，避免小数值导致 400 校验失败
      preparedBody.max_output_tokens = Math.max(
        16,
        Number(chatParams.max_tokens) || 16,
      )
    }

    // 映射推理强度
    const effortValue = chatParams.reasoning_effort
    preparedBody.reasoning =
      effortValue === -1 || effortValue === undefined
        ? undefined
        : {
            effort: reasoningEffortMap[effortValue] || 'medium',
          }

    return preparedBody
  }

  /**
   * 模板方法：准备 Responses API 聊天请求体（Final，子类/厂商严格禁止重写以保证 context 透传）
   */
  async _prepareChatBody(body, context = null) {
    const preparedBody = await this._buildChatRequestBody(body, context)

    // 原生工具装配：优先使用实例或声明列表，默认装配 SearchGPT 兼容工具
    const nativeTools = this.nativeTools ||
      this.profile?.nativeTools || [
        {
          buildPayload: (wsConfig) => ({
            allowed_domains:
              wsConfig.allowed_domains?.length > 0
                ? wsConfig.allowed_domains
                : undefined,
            blocked_domains:
              wsConfig.blocked_domains?.length > 0
                ? wsConfig.blocked_domains
                : undefined,
            search_context_size: wsConfig.search_context_size || undefined,
          }),
          flatten: true,
          type: 'web_search',
        },
      ]

    for (const descriptor of nativeTools) {
      this._upsertNativeTool(preparedBody, descriptor, body)
    }

    if (preparedBody.tools && preparedBody.tools.length === 0) {
      delete preparedBody.tools
    }

    const finalized = await this.postProcessChatBody(
      preparedBody,
      body,
      context,
    )
    return this.cleanUndefined(finalized)
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

  async _processMessages(messages, modelName, visionOverride = undefined) {
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

      // 提取助手思考内容（兼容顶层 reasoning_content 及 content 数组中的原因块）
      let reasoningText =
        role === 'assistant'
          ? message.reasoning_content || message.reasoning_text || ''
          : ''
      let mainContent = content

      if (role === 'assistant' && !reasoningText && Array.isArray(content)) {
        const reasonPart = content.find(
          (p) =>
            p &&
            (p.type === 'reasoning_text' ||
              p.type === 'reason' ||
              p.type === 'thinking'),
        )
        if (reasonPart) {
          reasoningText =
            reasonPart.text ||
            reasonPart.data?.text ||
            reasonPart.reasoning_content ||
            ''
        }
        const textParts = content.filter(
          (p) =>
            !p ||
            (p.type !== 'reasoning_text' &&
              p.type !== 'reason' &&
              p.type !== 'thinking'),
        )
        if (
          textParts.length === 1 &&
          (textParts[0].text || typeof textParts[0] === 'string')
        ) {
          mainContent = textParts[0].text || textParts[0]
        } else if (textParts.length > 0) {
          mainContent = textParts
        } else {
          mainContent = ''
        }
      }

      // 2. 处理助手的工具调用 (Item: function_call)
      if (role === 'assistant' && tool_calls && Array.isArray(tool_calls)) {
        // 先输出独立 reasoning 项，再输出助手文本项，再输出 function_call items，
        // 符合 Responses 规范的严格顺序约定：reasoning → message (text) → calls → outputs
        // （部分严格实现如 DeepSeek V4 / 火山方舟在 thinking mode 下要求顶层具备 reasoning 项）
        if (reasoningText) {
          processed.push({
            content: [
              {
                text: reasoningText,
                type: 'reasoning_text',
              },
            ],
            id: `rs_${Math.random().toString(36).substring(2, 10)}`,
            summary: [],
            type: 'reasoning',
          })
        }
        if (mainContent) {
          processed.push({ content: mainContent, role: 'assistant' })
        }
        for (const call of tool_calls) {
          const safeId = ensureFc(call.id)
          processed.push({
            arguments: (() => {
              const argVal = call.function?.arguments || call.arguments
              if (!argVal) return ''
              return typeof argVal === 'string'
                ? argVal
                : JSON.stringify(argVal)
            })(),
            call_id: safeId,
            id: safeId,
            name: call.function?.name || call.name,
            type: 'function_call',
          })
        }
        continue
      }

      // 3. 处理普通助手消息携带 reasoning 的情况
      if (role === 'assistant' && reasoningText) {
        processed.push({
          content: [
            {
              text: reasoningText,
              type: 'reasoning_text',
            },
          ],
          id: `rs_${Math.random().toString(36).substring(2, 10)}`,
          summary: [],
          type: 'reasoning',
        })
        processed.push({ content: mainContent || '', role: 'assistant' })
        continue
      }

      // 4. 处理普通消息 (User/Assistant Text + Vision)
      if (Array.isArray(mainContent)) {
        const processedContent = []
        for (const part of mainContent) {
          if (part.type === 'image_url' || part.type === 'input_image') {
            // 按模型细粒度判断：无视觉能力的模型跳过图片消息（支持联系人/请求级显式覆写）
            if (this._shouldFilterVision(modelName, visionOverride)) {
              continue
            }
            const url = part.image_url?.url || part.image_url || part.image
            const finalUrl = await resolveImageAsBase64(url)

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
    let cachedReasoning = ''

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
          userIp: e?.user?.ip,
        }

        let lastUsage = null

        for await (const chunk of stream) {
          if (e.aborted) {
            break
          }

          const { type } = chunk

          // 记录首字延迟 (TTFT)
          if (
            (type === 'response.output_text.delta' ||
              type === 'response.reasoning_text.delta' ||
              type === 'response.reasoning_summary_text.delta' ||
              type === 'response.output_reasoning.delta' ||
              (type &&
                typeof type === 'string' &&
                type.includes('reasoning') &&
                type.endsWith('.delta')) ||
              type === 'response.output_item.added') &&
            !timeMetrics.firstTokenTime
          ) {
            timeMetrics.firstTokenTime = Date.now()
          }

          // 记录用量统计 (OpenAI Responses: chunk.response.usage)
          const usage =
            chunk.usage ||
            chunk.usage_metadata ||
            chunk.usageMetadata ||
            chunk.response?.usage
          if (usage) {
            lastUsage = usage
            e.lastUsage = usage
          }

          // 1. 处理文本增量
          if (type === 'response.output_text.delta') {
            e.update({ content: chunk.delta, type: 'content' })
            cachedContent += chunk.delta
          }
          // 2. 处理推理增量 (OpenAI/DeepSeek/火山方舟: response.reasoning_text.delta, xAI: response.reasoning_summary_text.delta, 及其他兼容别名)
          else if (
            type === 'response.reasoning_text.delta' ||
            type === 'response.reasoning_summary_text.delta' ||
            type === 'response.output_reasoning.delta' ||
            type === 'response.reasoning.delta' ||
            (type &&
              typeof type === 'string' &&
              type.includes('reasoning') &&
              type.endsWith('.delta'))
          ) {
            const delta =
              typeof chunk.delta === 'string'
                ? chunk.delta
                : chunk.delta?.text || chunk.text || chunk.content || ''
            if (delta) {
              e.update({ content: delta, type: 'reasoningContent' })
              cachedReasoning += delta
            }
          }
          // 2.1 兜底：处理推理完成事件 (如 response.reasoning_text.done)
          else if (
            type === 'response.reasoning_text.done' ||
            type === 'response.reasoning_summary_text.done'
          ) {
            if (!cachedReasoning && chunk.text) {
              e.update({ content: chunk.text, type: 'reasoningContent' })
              cachedReasoning = chunk.text
            }
          }
          // 2.2 兜底：处理推理 item 完成事件 (response.output_item.done: item.type === 'reasoning')
          else if (
            type === 'response.output_item.done' &&
            chunk.item?.type === 'reasoning'
          ) {
            if (!cachedReasoning) {
              const fullText = Array.isArray(chunk.item.content)
                ? chunk.item.content.map((c) => c.text || '').join('')
                : Array.isArray(chunk.item.summary)
                  ? chunk.item.summary.map((s) => s.text || '').join('')
                  : typeof chunk.item.text === 'string'
                    ? chunk.item.text
                    : ''
              if (fullText) {
                e.update({ content: fullText, type: 'reasoningContent' })
                cachedReasoning = fullText
              }
            }
          }
          // 3. 处理工具调用开始 (output_item.added)
          else if (
            type === 'response.output_item.added' &&
            chunk.item?.type === 'function_call'
          ) {
            const { item } = chunk
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
                step: (e._recursionStep || 0) + 1,
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
                  step: (e._recursionStep || 0) + 1,
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
          // 6. 兜底：处理整体完成事件 (response.completed / response.done) 中可能携带的 reasoning
          else if (
            (type === 'response.completed' || type === 'response.done') &&
            !cachedReasoning &&
            Array.isArray(chunk.response?.output)
          ) {
            for (const out of chunk.response.output) {
              if (out.type === 'reasoning') {
                const fullText = Array.isArray(out.content)
                  ? out.content.map((c) => c.text || '').join('')
                  : Array.isArray(out.summary)
                    ? out.summary.map((s) => s.text || '').join('')
                    : typeof out.text === 'string'
                      ? out.text
                      : ''
                if (fullText) {
                  cachedReasoning = fullText
                }
              }
            }
          }
        }

        const finalUsage = lastUsage || {
          completion_tokens: 0,
          prompt_tokens: 0,
          total_tokens: 0,
        }
        const providerName =
          this.constructor.getAdapterMetadata()?.name || this.provider
        if (
          callMessage &&
          callMessage.tool_calls &&
          callMessage.tool_calls.length > 0
        ) {
          timeMetrics.toolsCalled = callMessage.tool_calls
            .map((tc) => tc.function?.name)
            .filter(Boolean)
        }
        this.logUsage(providerName, finalUsage, timeMetrics)

        if (callMessage.tool_calls.length > 0) {
          if (cachedContent) {
            e.body.extraCachedContent = cachedContent
            e.extraCachedContent = cachedContent
          }
          if (cachedReasoning) {
            e.body.extraCachedReasoningContent = cachedReasoning
            e.extraCachedReasoningContent = cachedReasoning
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
          userIp: e?.user?.ip,
        }
        const controller = new AbortController()
        e.onAbort(() => controller.abort())

        const response = await this.openai.responses.create(body, {
          signal: controller.signal,
        })

        const usage =
          response.usage ||
          response.usageMetadata ||
          response.usage_metadata ||
          response.response?.usage
        if (usage) {
          const providerName =
            this.constructor.getAdapterMetadata()?.name || this.provider
          this.logUsage(providerName, usage, timeMetrics)
        }

        const toolCalls = []
        let nonStreamContent = ''
        let nonStreamReasoning = ''
        if (Array.isArray(response.output)) {
          for (const out of response.output) {
            if (out.type === 'message' && Array.isArray(out.content)) {
              for (const part of out.content) {
                if (part.type === 'output_text') {
                  e.update({ content: part.text, type: 'content' })
                  nonStreamContent += part.text
                } else if (
                  part.type === 'reasoning_text' ||
                  part.type === 'reasoning'
                ) {
                  const text = part.text || part.reasoning || ''
                  if (text) {
                    e.update({ content: text, type: 'reasoningContent' })
                    nonStreamReasoning += text
                  }
                }
              }
            } else if (out.type === 'reasoning') {
              if (Array.isArray(out.content)) {
                for (const part of out.content) {
                  const text = part.text || part.reasoning_text || ''
                  if (text) {
                    e.update({ content: text, type: 'reasoningContent' })
                    nonStreamReasoning += text
                  }
                }
              } else if (Array.isArray(out.summary)) {
                for (const part of out.summary) {
                  const text = part.text || ''
                  if (text) {
                    e.update({ content: text, type: 'reasoningContent' })
                    nonStreamReasoning += text
                  }
                }
              } else if (typeof out.text === 'string' && out.text) {
                e.update({ content: out.text, type: 'reasoningContent' })
                nonStreamReasoning += out.text
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
            e.extraCachedContent = nonStreamContent
          }
          if (nonStreamReasoning) {
            e.body.extraCachedReasoningContent = nonStreamReasoning
            e.extraCachedReasoningContent = nonStreamReasoning
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

  _extendAssistantMessage(callMessage, e) {
    const extraReasoning =
      e.body?.extraCachedReasoningContent ||
      e.extraCachedReasoningContent ||
      e._extraCachedReasoningContent
    if (extraReasoning) {
      callMessage.reasoning_content = extraReasoning
      delete e.body?.extraCachedReasoningContent
      delete e.extraCachedReasoningContent
      delete e._extraCachedReasoningContent
    }

    const extraContent =
      e.body?.extraCachedContent ||
      e.extraCachedContent ||
      e._extraCachedContent
    if (extraContent) {
      callMessage.content = extraContent
      delete e.body?.extraCachedContent
      delete e.extraCachedContent
      delete e._extraCachedContent
    }
  }
}
