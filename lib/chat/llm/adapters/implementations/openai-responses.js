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
      type: 'openai-responses',
      name: 'OpenAI Responses',
      description:
        'OpenAI Responses (Realtime/Agentic) 协议适配器。支持 OpenAI 最新的状态化会话与原生工具调用能力（如内置 SearchGPT），专为高性能 Agent 场景设计。该接口亦兼容其他实现了 OpenAI Responses 规范的第三方增强网关。\n\n**获取方式**：在 [OpenAI Platform](https://platform.openai.com/api_keys) 创建具有相应权限的 API 密钥。',
      supportedFeatures: [
        'chat',
        'streaming',
        'function_calling',
        'vision',
        'reasoning',
      ],
      initialConfigSchema: {
        enable: {
          type: 'boolean',
          default: true,
          description: '是否启用此适配器实例',
          required: true,
          label: '启用',
        },
        name: {
          type: 'string',
          default: '',
          description: '适配器实例的自定义名称',
          required: false,
          label: '实例名称',
        },
        api_key: {
          type: 'password',
          default: '',
          description: 'OpenAI API 密钥',
          required: true,
          label: 'API Key',
        },
        base_url: {
          type: 'url',
          default: 'https://api.openai.com/v1',
          description: 'OpenAI API 的基础 URL',
          required: true,
          label: 'API Key',
        },
      },
      extraSettingsSchema: {
        openai: {
          web_search: {
            type: 'group',
            label: '联网搜索 (SearchGPT)',
            fields: {
              enable: {
                type: 'boolean',
                default: false,
                label: '启用',
              },
              search_context_size: {
                type: 'select',
                label: '搜索深度',
                default: 'medium',
                options: [
                  { label: '低', value: 'low' },
                  { label: '中', value: 'medium' },
                  { label: '高', value: 'high' },
                ],
              },
              allowed_domains: {
                type: 'array',
                default: [],
                label: '白名单域名',
                placeholder: 'openai.com',
              },
              blocked_domains: {
                type: 'array',
                default: [],
                label: '黑名单域名',
              },
            },
          },
        },
      },
    }
  }

  constructor(openaiConfig) {
    super(openaiConfig)
    this.provider = 'openai-responses'
  }

  get openai() {
    const { base_url, api_key } = this.config
    if (!api_key) throw new Error('OpenAI API Key 未配置')
    const apiKeys = api_key.split(',')
    const selectedKey = apiKeys[Math.floor(Math.random() * apiKeys.length)]
    return new OpenAI({ baseURL: base_url, apiKey: selectedKey })
  }

  // ---------------------- 私有辅助方法 ----------------------

  async _prepareChatBody(body) {
    logger.info(
      `[${this.provider.toUpperCase()}-Responses] Entering _prepareChatBody`,
    )
    const { messages, settings } = body
    const normalizedMessages = this._normalizeToolCallIds(messages)
    const { base, chatParams, toolCallSettings } = settings

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
    const processedInput = await this._processMessages(filteredMessages)

    // 3. 处理工具
    const { tools, mode } = toolCallSettings
    const { extraSettings } = settings
    let parsedTools = []
    // a. 函数调用工具
    if (mode !== 'NONE' && tools?.length > 0) {
      parsedTools = this._getFormattedTools(tools)
    }

    const preparedBody = {
      model: base.model,
      instructions: instructions || undefined,
      input: processedInput,
      stream: base.stream,
      store: false, // 强制关闭服务端状态，由本地管理上下文
    }

    const reasoningEffortMap = {
      '-1': 'none',
      0: 'none',
      1: 'low',
      2: 'medium',
      3: 'high',
    }

    // b. OpenAI 内置工具 (Responses API)
    const providerSettings =
      extraSettings?.[this.provider] || extraSettings?.openai || {}
    const ws = providerSettings.web_search || {}

    // a. 联网搜索 (OpenAI 原生 SearchGPT)
    if (ws.enable) {
      parsedTools.push({
        type: 'web_search',
        search_context_size: ws.search_context_size || undefined,
        allowed_domains:
          ws.allowed_domains?.length > 0 ? ws.allowed_domains : undefined,
        blocked_domains:
          ws.blocked_domains?.length > 0 ? ws.blocked_domains : undefined,
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

    // 映射推理强度 (优先使用适配器专属设置)
    const effortValue = chatParams.reasoning_effort
    preparedBody.reasoning =
      effortValue === -1
        ? undefined
        : {
            effort: reasoningEffortMap[effortValue] || 'none',
          }

    // 清理 undefined 字段
    return JSON.parse(JSON.stringify(preparedBody))
  }

  async _getModels() {
    try {
      const list = await this.openai.models.list()
      let modelList = this._groupModelsByOwner(list.data)
      return this._sortModelList(modelList)
    } catch (error) {
      logger.error('Failed to get models:', error)
      throw error
    }
  }

  async _processMessages(messages) {
    const processed = []
    const ensureFc = (id) => (id && !id.startsWith('fc_') ? `fc_${id}` : id)

    for (const message of messages) {
      const { role, content, tool_calls, tool_call_id } = message

      // 1. 处理工具结果 (Item: function_call_output)
      if (role === 'tool') {
        processed.push({
          type: 'function_call_output',
          call_id: ensureFc(tool_call_id),
          output:
            typeof content === 'string' ? content : JSON.stringify(content),
        })
        continue
      }

      // 2. 处理助手的工具调用 (Item: function_call)
      if (role === 'assistant' && tool_calls && Array.isArray(tool_calls)) {
        for (const call of tool_calls) {
          const safeId = ensureFc(call.id)
          processed.push({
            type: 'function_call',
            id: safeId,
            call_id: safeId,
            name: call.function?.name || call.name,
            arguments: (() => {
              const argVal = call.function?.arguments || call.arguments
              if (!argVal) return ''
              return typeof argVal === 'string' ? argVal : JSON.stringify(argVal)
            })(),
          })
        }
        // 如果助手同时输出了文字，作为一个单独的 message Item 处理
        if (content) {
          processed.push({ role: 'assistant', content })
        }
        continue
      }

      // 3. 处理普通消息 (User/Assistant Text + Vision)
      if (Array.isArray(content)) {
        const processedContent = []
        for (const part of content) {
          if (part.type === 'image_url' || part.type === 'input_image') {
            let url = part.image_url?.url || part.image_url || part.image
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
              type: 'input_image',
              image_url: finalUrl,
            })
          } else if (part.type === 'text' || part.type === 'input_text') {
            processedContent.push({
              type: 'input_text',
              text: part.text,
            })
          } else {
            processedContent.push(part)
          }
        }
        processed.push({ role, content: processedContent })
      } else {
        processed.push({ role, content })
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
    let callMessage = { tool_calls: [] }
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
          `[${this.provider.toUpperCase()}-Responses] Stream object type: ${typeof stream}, ${!!stream[Symbol.asyncIterator]}`,
        )

        e.client.pushConnection(e.requestId, stream)
        e.pending()

        const timeMetrics = {
          startTime: Date.now(),
          firstTokenTime: null,
          model: body.model,
          requestId: e?.requestId,
          userId: e?.user?.id,
          userIp: e?.user?.ip,
          contactorId: e?.body?.contactorId,
          presetName: e?.body?.settings?.presetSettings?.name,
          isStream: true,
          e: e,
          stepId
        }

        let lastUsage = null

        for await (const chunk of stream) {
          if (e.aborted) break


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
            e.update({ type: 'content', content: chunk.delta })
            cachedContent += chunk.delta
          }
          // 2. 处理推理增量 (OpenAI: response.output_reasoning.delta, xAI: response.reasoning_summary_text.delta)
          else if (
            type === 'response.output_reasoning.delta' ||
            type === 'response.reasoning_summary_text.delta'
          ) {
            e.update({ type: 'reasoningContent', content: chunk.delta })
          }
          // 3. 处理工具调用开始 (output_item.added)
          else if (
            type === 'response.output_item.added' &&
            chunk.item?.type === 'function_call'
          ) {
            const item = chunk.item
            const existingCall = {
              id: item.id,
              type: 'function',
              function: { name: item.name, arguments: '' },
            }
            callMessage.tool_calls.push(existingCall)

            e.update({
              type: 'toolCall',
              content: {
                name: existingCall.function.name,
                id: existingCall.id,
                action: 'started',
                parameters: '',
                result: '',
              },
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
                type: 'toolCall',
                content: {
                  name: existingCall.function.name,
                  id: existingCall.id,
                  action: 'pending',
                  parameters: chunk.delta,
                  result: '',
                },
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

        const finalUsage = lastUsage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
        const providerName = this.provider === 'xai' ? 'Grok' : (this.provider === 'openai-responses' ? 'OpenAI Responses' : this.provider)
        if (callMessage && callMessage.tool_calls && callMessage.tool_calls.length > 0) {
          timeMetrics.toolsCalled = callMessage.tool_calls.map(tc => tc.function?.name).filter(Boolean)
        }
        this.logUsage(providerName, finalUsage, timeMetrics)

        if (callMessage.tool_calls.length > 0) {
          if (cachedContent) {
            e.body.extraCachedContent = cachedContent
          }
          return { toolCalls: callMessage.tool_calls, stepId }
        }
      } else {
        // 非流式处理
        const timeMetrics = {
          startTime: Date.now(),
          firstTokenTime: null,
          model: body.model,
          requestId: e?.requestId,
          userId: e?.user?.id,
          userIp: e?.user?.ip,
          contactorId: e?.body?.contactorId,
          presetName: e?.body?.settings?.presetSettings?.name,
          isStream: false,
          e: e,
          stepId
        }
        const controller = new AbortController()
        e.onAbort(() => controller.abort())

        const response = await this.openai.responses.create(body, {
          signal: controller.signal,
        })


        const usage = response.usage || response.usageMetadata || response.usage_metadata || response.response?.usage
        if (usage) {
          const providerName = this.provider === 'xai' ? 'Grok' : (this.provider === 'openai-responses' ? 'OpenAI Responses' : this.provider)
          this.logUsage(providerName, usage, timeMetrics)
        }

        const toolCalls = []
        let nonStreamContent = ''
        if (Array.isArray(response.output)) {
          for (const out of response.output) {
            if (out.type === 'message' && Array.isArray(out.content)) {
              for (const part of out.content) {
                if (part.type === 'output_text') {
                  e.update({ type: 'content', content: part.text })
                  nonStreamContent += part.text
                } else if (part.type === 'reasoning_text') {
                  e.update({ type: 'reasoningContent', content: part.text })
                }
              }
            } else if (out.type === 'function_call') {
              toolCalls.push({
                ...out,
                function: { name: out.name, arguments: out.arguments },
              })
            }
          }
        }

        if (toolCalls.length > 0) {
          if (nonStreamContent) {
            e.body.extraCachedContent = nonStreamContent
          }
          return { toolCalls, stepId }
        }
      }
      return {}
    } catch (error) {
      logger.error('[OpenAI-Responses] API Error:', error)
      throw error
    }
  }

  /**
   * 处理工具调用
   * @param {object} toolCalls
   * @param {object} e
   * @param {string} stepId
   */
  async _handleToolCalls(toolCalls, e, stepId) {
    if (!e.body.messages) e.body.messages = []

    let callMessage = { role: 'assistant', tool_calls: toolCalls }

    if (e.body.extraCachedContent) {
      callMessage.content = e.body.extraCachedContent
      delete e.body.extraCachedContent
    }

    e.body.messages.push(callMessage)

    const tasks = []
    const allPostMessages = [] // 用于收集所有工具产生的后置消息
    const executedTools = []

    for (const call of toolCalls) {
      if (e.aborted) break
      const toolCall = call.function
      const toolCallData = {
        name: toolCall.name,
        id: call.call_id || call.id, // 优先使用 call_id 进行关联
        action: 'running',
        parameters: toolCall.arguments,
        result: '',
      }
      e.update({ type: 'toolCall', content: toolCallData })

      const runTask = async () => {
        try {
          const toolResult = await middleware.llm.runTool(
            toolCallData,
            e.user,
            e,
          )
          let { result } = toolResult

          if (result && typeof result === 'object' && result._postMessages) {
            allPostMessages.push(...result._postMessages)
            result = result.result
          }

          executedTools.push({
            name: toolCall.name,
            arguments: toolCall.arguments,
            output: typeof result === 'string' ? result : JSON.stringify(result)
          })

          e.body.messages.push({
            tool_call_id: toolCallData.id,
            role: 'tool',
            name: toolCall.name,
            content:
              typeof result === 'string' ? result : JSON.stringify(result),
          })

          toolCallData.result = result
          toolCallData.action = 'finished'
          e.update({ type: 'toolCall', content: toolCallData })
        } catch (err) {
          if (err.message === 'USER_ABORT') return
          throw err
        }
      }
      tasks.push(runTask())
    }

    await Promise.allSettled(tasks)
    if (e.aborted) return

    // 统一更新工具调用详情入库
    await this._updateToolCallLogsInDb(e, stepId, executedTools)

    // 核心修复：合并并统一注入后置消息
    if (allPostMessages.length > 0) {
      const mergedContent = []
      allPostMessages.forEach((msg) => {
        if (Array.isArray(msg.content)) {
          mergedContent.push(...msg.content)
        } else if (msg.content) {
          mergedContent.push({
            type: 'text',
            text:
              typeof msg.content === 'string'
                ? msg.content
                : JSON.stringify(msg.content),
          })
        }
      })
      e.body.messages.push({ role: 'user', content: mergedContent })
    }
    // 在递归之前，检查是否需要触发记忆结晶压缩
    await this._checkAndCrystallize(e)

    await this.handleChatRequest(e, false)
  }
}
