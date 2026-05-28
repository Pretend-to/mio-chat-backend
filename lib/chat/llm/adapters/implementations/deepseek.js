import OpenAIBot from './openai.js'

/**
 * @class DeepSeek 适配器
 * 继承自 OpenAI，主要区别在于需要缓存 reasoning_content 并在 tool call 后发回
 */
export default class DeepSeekAdapter extends OpenAIBot {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      type: 'deepseek',
      avatarId: 'deepseek',
      name: 'DeepSeek',
      description:
        'DeepSeek 官方 API 适配器。提供对 DeepSeek-V3, DeepSeek-R1 等高性能模型的访问，以极低成本提供媲美主流大模型的推理能力。原生兼容 OpenAI 接口规范，特别优化了思维链（Reasoning）渲染逻辑。\n\n**获取方式**：在 [DeepSeek 开放平台](https://platform.deepseek.com/api_keys) 创建 API 密钥。',
      supportedFeatures: ['chat', 'streaming', 'function_calling', 'reasoning'],
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
          description: '适配器实例的自定义名称，用于区分多个实例',
          required: false,
          label: '实例名称',
          placeholder: '例如：DeepSeek-主要',
        },
        api_key: {
          type: 'password',
          default: '',
          description: 'DeepSeek API 密钥',
          required: true,
          label: 'API Key',
          placeholder: 'API Key',
        },
        base_url: {
          type: 'url',
          default: 'https://api.deepseek.com/v1',
          description: 'DeepSeek API 的基础 URL',
          required: true,
          label: 'Base URL',
          placeholder: 'https://api.deepseek.com/v1',
        },
        models: {
          type: 'array',
          default: [],
          description: '可用的模型列表，通常由系统自动获取',
          required: false,
          label: '模型列表',
          readonly: true,
        },
      },
    }
  }

  /**
   * 构造函数
   */
  constructor(deepseekConfig) {
    super(deepseekConfig)
    this.provider = 'deepseek'
  }

  /**
   * 执行聊天请求
   * DeepSeek 特殊处理：缓存 reasoning_content 并在 tool call 完成后一起发回
   * @param {object} body
   * @param {object} e
   * @returns {object}
   */
  async _executeChatRequest(body, e) {
    const stepId = Math.random().toString(36).substring(2, 9)
    const enableStream = body.stream ?? true

    let callMessage = {}
    let cachedMessage = {
      role: 'assistant',
      content: '',
      reasoning_content: '', // DeepSeek: 在 cachedMessage 中添加 reasoning_content 字段
    }

    if (enableStream) {
      if (!body.stream_options) {
        body.stream_options = { include_usage: true }
      }
      const controller = new AbortController()
      e.onAbort(() => controller.abort())

      const stream = await this.openai.chat.completions.create(body, {
        signal: controller.signal,
      })
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

      for await (const chunk of stream) {
        if (e.aborted) {
          logger.info(
            `[DeepSeek] 任务 ${e.requestId} 已由用户中止，停止处理流。`,
          )
          break
        }

        const firstDelta = chunk.choices && chunk.choices[0]?.delta
        if (firstDelta && (firstDelta.content || firstDelta.reasoning_content || firstDelta.tool_calls) && !timeMetrics.firstTokenTime) {
          timeMetrics.firstTokenTime = Date.now()
        }

        if (chunk.usage) {
          const providerName = this.provider === 'openai' ? 'OpenAI' : (this.provider === 'deepseek' ? 'DeepSeek' : this.provider)
          if (callMessage && callMessage.tool_calls && callMessage.tool_calls.length > 0) {
            timeMetrics.toolsCalled = callMessage.tool_calls.map(tc => tc.function?.name).filter(Boolean)
          }
          this.logUsage(providerName, chunk.usage, timeMetrics)
        }

        if (
          !chunk.choices ||
          !Array.isArray(chunk.choices) ||
          !chunk.choices.length > 0
        ) {
          continue
        }
        const delta = chunk.choices[0]?.delta

        // DeepSeek 标准的 reasoning_content
        if (delta?.reasoning_content) {
          cachedMessage.reasoning_content += delta.reasoning_content // DeepSeek: 缓存到 cachedMessage
          e.update({
            type: 'reasoningContent',
            content: delta.reasoning_content,
          })
        } else if (delta?.content) {
          cachedMessage.content += delta.content // 缓存普通内容
          e.update({
            type: 'content',
            content: delta.content,
          })
        } else if (delta?.tool_calls) {
          // Tool calls 逻辑
          if (Object.keys(callMessage).length === 0) {
            callMessage = { ...delta }
            if (!callMessage.tool_calls) callMessage.tool_calls = []
            else {
              // Clear it to rebuild accurately
              callMessage.tool_calls = []
            }
          }
          for (const functionCall of delta.tool_calls) {
            let call = callMessage.tool_calls.find(
              (c) => c.index === functionCall.index,
            )
            if (!call) {
              call = { ...functionCall, function: { ...functionCall.function } }
              if (!call.function.arguments) call.function.arguments = ''
              callMessage.tool_calls.push(call)

              const toolCallData = {
                name: call.function.name,
                id: call.id,
                action: 'started',
                parameters: '',
                result: '',
              }
              e.update({
                type: 'toolCall',
                content: toolCallData,
              })
            }
            if (functionCall?.function?.arguments) {
              // 确保arguments是字符串
              if (typeof call.function.arguments !== 'string') {
                call.function.arguments = ''
              }
              call.function.arguments += functionCall.function.arguments
              const toolCallData = {
                name: call.function.name,
                id: call.id,
                action: 'pending',
                parameters: functionCall.function.arguments || '',
                result: '',
              }
              e.update({
                type: 'toolCall',
                content: toolCallData,
              })
            }
          }
        }
      }

      // 在流式循环结束后，检查是否有工具需要调用
      if (callMessage.tool_calls && callMessage.tool_calls.length > 0) {
        // DeepSeek: 临时缓存普通内容与推理内容，在 _handleToolCalls 中合并为一个消息
        if (cachedMessage.content) {
          e.body.extraCachedContent = cachedMessage.content
        }
        if (cachedMessage.reasoning_content) {
          e.body.extraCachedReasoningContent = cachedMessage.reasoning_content
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

      const completion = await this.openai.chat.completions.create(body, {
        signal: controller.signal,
      })

      if (completion.usage) {
        const providerName = this.provider === 'openai' ? 'OpenAI' : (this.provider === 'deepseek' ? 'DeepSeek' : this.provider)
        const toolCalls = completion.choices?.[0]?.message?.tool_calls
        if (toolCalls && toolCalls.length > 0) {
          timeMetrics.toolsCalled = toolCalls.map(tc => tc.function?.name).filter(Boolean)
        }
        this.logUsage(providerName, completion.usage, timeMetrics)
      }
      const message = completion.choices[0].message

      if (message?.tool_calls?.length > 0) {
        // DeepSeek: 非流式时也临时缓存，由 _handleToolCalls 统一合并为一个 assistant 消息入库
        if (message.content) {
          e.body.extraCachedContent = message.content
          e.update({
            type: 'content',
            content: message.content,
          })
        }
        if (message.reasoning_content) {
          e.body.extraCachedReasoningContent = message.reasoning_content
          e.update({
            type: 'reasoningContent',
            content: message.reasoning_content,
          })
        }
        return { toolCalls: message.tool_calls, stepId }
      } else {
        // 没有工具调用，正常输出
        if (message?.content) {
          e.update({
            type: 'content',
            content: message.content,
          })
        }
        if (message?.reasoning_content) {
          e.update({
            type: 'reasoningContent',
            content: message.reasoning_content,
          })
        }
        return {}
      }
    }
    return {}
  }

  async _prepareChatBody(body) {
    const { messages, settings } = body
    const normalizedMessages = this._normalizeToolCallIds(messages)
    const processedMessages = await this._processMessages(normalizedMessages)
    const { base, chatParams, toolCallSettings } = settings

    const { tools, mode } = toolCallSettings
    let parsedTools = undefined
    let tool_choice = undefined
    if (mode !== 'NONE' && tools?.length > 0) {
      parsedTools = this._getFormattedTools(tools)
      tool_choice = mode === 'ANY' ? 'required' : undefined
    }

    // 清理可能存在的旧顶级 thinking 属性，防止干扰
    delete chatParams.thinking

    const openaiReasoningEffortTable = {
      '-1': 'high',
      0: undefined,
      1: 'high',
      2: 'max',
      3: 'max',
    }

    // 确定思考强度，默认设为 'high' 以规整多轮前缀缓存 key，防顶级参数不一致导致缓存失效
    const reasoning_effort = chatParams.reasoning_effort !== undefined
      ? openaiReasoningEffortTable[chatParams.reasoning_effort]
      : 'high'

    // 如果 effort 为 0，显式关闭思考逻辑
    if (
      chatParams.reasoning_effort === 0 ||
      chatParams.reasoning_effort === '0'
    ) {
      chatParams.extra_body = {
        thinking: {
          type: 'disabled',
        }
      }
      delete chatParams.reasoning_effort
    } else {
      chatParams.extra_body = {
        thinking: {
          type: 'enabled',
        }
      }
      chatParams.reasoning_effort = reasoning_effort
    }

    const preparedBody = {
      ...chatParams,
      model: base.model,
      stream: base.stream,
      messages: processedMessages,
      tools: parsedTools,
      tool_choice,
    }

    return JSON.parse(JSON.stringify(preparedBody))
  }

  /** DeepSeek: 在 assistant 消息中注入缓存的 reasoning_content */
  _extendAssistantMessage(callMessage, e) {
    if (e.body.extraCachedReasoningContent) {
      callMessage.reasoning_content = e.body.extraCachedReasoningContent
      delete e.body.extraCachedReasoningContent
    }
  }

  /**
   * 预处理消息（例如，将图片 URL 转换为 Base64）
   * @private
   * @param {Array<object>} messages - 消息数组
   * @returns {Promise<Array<object>>} 处理后的消息数组
   */
  async _processMessages(messages) {
    const processed = []
    for (const message of messages) {
      if (message.role === 'user' && Array.isArray(message.content)) {
        const processedContent = []
        for (const element of message.content) {
          if (element.type === 'image_url') {
            continue
          } else {
            processedContent.push(element)
          }
        }
        processed.push({ ...message, content: processedContent })
      } else if (message.role === 'assistant') {
        if (message.tool_calls) {
          const processedToolCalls = []
          for (const toolCall of message.tool_calls) {
            let args = toolCall.function?.arguments
            if (args) {
              const type = typeof args
              if (type === 'object') {
                args = JSON.stringify(args)
              } else if (type === 'string') {
                try {
                  const obj = JSON.parse(args)
                  args = JSON.stringify(obj)
                } catch {
                  // Keep original string
                }
              }
            }
            processedToolCalls.push({
              id: toolCall.id,
              type: 'function',
              function: {
                name: toolCall.function?.name,
                arguments: args,
              },
            })
          }
          message.tool_calls = processedToolCalls
        }
        message.reasoning_content = message.reasoning_content || ''
        processed.push(message)
      } else {
        processed.push(message)
      }
    }
    return processed
  }
}
