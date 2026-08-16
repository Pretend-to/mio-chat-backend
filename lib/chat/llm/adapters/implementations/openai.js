import BaseLLMAdapter from '../base.js'
import OpenAI from 'openai'
import { base64ToImageUrl, imgUrlToBase64 } from '../../../../../utils/imgTools.js'


/**
 * @class OpenAI Bot 实现
 */
export default class OpenAIBot extends BaseLLMAdapter {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      avatarAliases: {
        claude: 'anthropic',
        'doubao': 'doubao',
        kimi: 'moonshot',
        onebot: 'openai',
        'qwen': 'qwen',
        sparkdesk: 'spark',
        'zhipu': 'zhipu',
        '智谱清言': 'zhipu',
        '月之暗面': 'moonshot',
        '月之暗面 (kimi)': 'moonshot',
        '混元': 'hunyuan',
        '科大讯飞': 'spark',
        '腾讯混元': 'hunyuan',
        '讯飞': 'spark',
        '豆包': 'doubao',
        '通义': 'qwen',
        '通义千问': 'qwen'
      },
      avatarId: 'openai',
      description:
        'OpenAI 标准 Chat Completions 适配器。支持 GPT-4o, GPT-3.5 Turbo 等全系列模型。该接口具备高度通用性，可兼容任何支持 OpenAI 格式的第三方大模型网关或私有化部署服务（如 OneAPI, NewAPI 等）。\n\n**获取方式**：在 [OpenAI Platform](https://platform.openai.com/api_keys) 创建 API 密钥。',
      initialConfigSchema: {
        api_key: {
          default: '',
          description: 'OpenAI API 密钥，支持多个密钥用逗号分隔',
          label: 'API Key',
          placeholder: 'API Key',
          required: true,
          type: 'password',
        },
        base_url: {
          default: 'https://api.openai.com/v1',
          description: 'OpenAI API 的基础 URL，可用于代理或第三方兼容服务',
          label: 'Base URL',
          placeholder: 'https://api.openai.com/v1',
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
        models: {
          default: [],
          description: '可用的模型列表，通常由系统自动获取',
          label: '模型列表',
          readonly: true,
          required: false,
          type: 'array',
        },
        name: {
          default: '',
          description: '适配器实例的自定义名称，用于区分多个实例',
          label: '实例名称',
          placeholder: '例如：OpenAI-主要',
          required: false,
          type: 'string',
        },
      },
      name: 'OpenAI',
      supportedFeatures: ['chat', 'streaming', 'function_calling', 'vision'],
      type: 'openai',
    }
  }

  /**
   * 构造函数
   * @param {string} baseUrl - OpenAI API 的基础 URL
   * @param {string} apiKey - OpenAI API 的密钥
   * @throws {Error} 如果 baseUrl 或 apiKey 缺失,则抛出错误
   */
  constructor(openaiConfig) {
    super(openaiConfig)
    this.provider = 'openai'
    this.shouldPreserveReasoningContent = false
    // 不设置 supportsVision：默认走基类 _shouldFilterVision 的模型注册表细粒度判断。
    // 若需强制覆盖，子类可设置 boolean（全量开关）或 Set（指定放行模型白名单）。
  }

  get openai() {
    const base_url = this.config.base_url || 'https://api.openai.com/v1'
    const { api_key } = this.config

    // 检查 api_key 是否存在
    if (!api_key) {
      throw new Error('OpenAI API Key 未配置')
    }

    // 以,为分隔符切割key列表
    const apiKeys = api_key.split(',')
    // 随机选择一个key
    const selectedKey = apiKeys[Math.floor(Math.random() * apiKeys.length)]
    // 日志用的哪个
    logger.info(
      `使用OpenAI API：${base_url} , key：${selectedKey.substring(0, 6)}...}`,
    )

    return new OpenAI({ apiKey: selectedKey, baseURL: base_url })
  }

  // ---------------------- 私有辅助方法 ----------------------



  async _prepareChatBody(body) {
    const { messages, settings } = body
    const { base, chatParams, toolCallSettings } = settings
    const model = base.model || ''
    // 通过模型名是否含 'gemini' 来判断是否为 Gemini 路由。
    // 局限性：如果用户将 Gemini 模型配置为自定义别名（如 'my-flash'），此判断会静默失效，
    // 导致 thought_signature 被截断后请求 Gemini 出错。当前假设模型名总含 'gemini' 字样。
    const isGeminiModel = model.toLowerCase().includes('gemini')

    // 如果目标模型是 Gemini，跳过 ID 截短以保留 thought_signature，否则正常进行截短
    const normalizedMessages = isGeminiModel ? messages : this._normalizeToolCallIds(messages)
    const processedMessages = await this._processMessages(normalizedMessages, model)

    const { tools, mode } = toolCallSettings
    let parsedTools = undefined
    let {tool_choice} = chatParams
    if (mode !== 'NONE' && tools?.length > 0) {
      parsedTools = this._getFormattedTools(tools, toolCallSettings.passthrough)
      if (tool_choice === undefined) {
        tool_choice = mode === 'ANY' ? 'required' : undefined
      }
    }

    // 检查推理模型配置：o 系列 + GPT 5.x 系列均支持 reasoning_effort
    const isReasoningModel =
      model.startsWith('o1') || model.startsWith('o3') || model.startsWith('o4') ||
      model.startsWith('gpt-5.')
    if (isReasoningModel) {
      const openaiReasoningEffortTable = {
        '-1': undefined,
        0: 'none',
        1: 'none',
        2: 'low',
        3: 'medium',
        4: 'high',
        5: 'xhigh',    // Chat Completions 不支持 max，max 是 Responses API 独占
      }
      chatParams.reasoning_effort = openaiReasoningEffortTable[chatParams.reasoning_effort]
    } else {
      delete chatParams.reasoning_effort
    }

    const preparedBody = {
      ...chatParams,
      messages: processedMessages,
      model: base.model,
      stream: base.stream,
      tool_choice,
      tools: parsedTools,
    }

    return JSON.parse(JSON.stringify(preparedBody))
  }

  /**
   * 从 OpenAI API 获取模型列表
   * @returns {Promise<Array<object>>} 格式化后的模型列表
   * @throws {Error} 如果获取模型列表失败，则抛出错误
   */
  async _getModels() {
    try {
      logger.info('Fetching models from OpenAI API...')
      const list = await this.openai.models.list()
      logger.info(`Retrieved ${list.data.length} models from OpenAI API`)
      const modelList = this._groupModelsByOwner(list.data)
      return this._sortModelList(modelList)
    } catch (error) {
      logger.error('Failed to get models:', error)
      throw error
    }
  }

  /**
   * 预处理消息（例如，将图片 URL 转换为 Base64）
   * @private
   * @param {Array<object>} messages - 消息数组
   * @returns {Promise<Array<object>>} 处理后的消息数组
   */
  async _processMessages(messages, modelName) {
    const processed = []
    const toolCallIdMap = new Map()
    for (const message of messages) {
      if (message.role === 'user' && Array.isArray(message.content)) {
        const processedContent = []
        for (const element of message.content) {
          if (element.type === 'image_url') {
            // 按模型细粒度判断：无视觉能力的模型跳过图片消息
            if (this._shouldFilterVision(modelName)) {continue}
            const url = element.image_url?.url || element.image_url
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
              image_url: { url: finalUrl },
              type: 'image_url',
            })
          } else {
            processedContent.push(element)
          }
        }
        processed.push({ ...message, content: processedContent })
      } else if (message.role === 'assistant') {
        const processedMsg = { ...message }
        if (message.tool_calls) {
          const processedToolCalls = []
          for (const toolCall of message.tool_calls) {
            if (toolCall.function.arguments) {
              const type = typeof toolCall.function.arguments
              // 如果是对象，序列化
              if (type === 'object') {
                toolCall.function.arguments = JSON.stringify(
                  toolCall.function.arguments,
                )
              } else if (type === 'string') {
                // 尝试反序列化
                try {
                  const obj = JSON.parse(toolCall.function.arguments)
                  toolCall.function.arguments = JSON.stringify(obj)
                } catch {
                  // Pass
                }
              }
            }
            processedToolCalls.push(toolCall)
          }
          processedMsg.tool_calls = processedToolCalls
        }
        if (this.shouldPreserveReasoningContent) {
          processedMsg.reasoning_content = message.reasoning_content || ''
        } else {
          delete processedMsg.reasoning_content
        }
        processed.push(processedMsg)
      } else if (message.role === 'tool') {
        processed.push({
          ...message,
          tool_call_id:
            toolCallIdMap.get(message.tool_call_id) ?? message.tool_call_id,
        })
      } else {
        processed.push(message)
      }
    }
    return processed
  }

  /**
   * 执行聊天请求
   * @param {object} body
   * @param {object} e
   * @returns {object}
   */
  async _executeChatRequest(body, e) {
    const stepId = Math.random().toString(36).substring(2, 9)
    const enableStream = body.stream ?? true
    let callMessage = {}
    const cachedMessage = {
      role: 'assistant',
      content: '',
      reasoning_content: '',
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

      // 定义标签和带可选换行符的正则表达式
      const reasoningStartSymbol = '<think>' // 用于部分标签匹配
      const reasoningEndSymbol = '</think>' // 用于部分标签匹配
      const reasoningStartRegex = /<think>\n?/ // 匹配 <think> 或 <think>\n
      const reasoningEndRegex = /<\/think>\n?/ // 匹配 </think> 或 </think>\n

      let isReasoning = false // 跟踪是否处于思考内容模式
      let processingBuffer = '' // 用于处理跨chunk的内容
      let lastUsage = null

      for await (const chunk of stream) {
        if (e.aborted) {break}

        const firstDelta = chunk.choices && chunk.choices[0]?.delta
        if (firstDelta && (firstDelta.content || firstDelta.reasoning_content || firstDelta.tool_calls) && !timeMetrics.firstTokenTime) {
          timeMetrics.firstTokenTime = Date.now()
        }

        if (chunk.usage) {
          lastUsage = chunk.usage
          e.lastUsage = chunk.usage
        }

        if (
          !chunk.choices ||
          !Array.isArray(chunk.choices) ||
          !chunk.choices.length > 0
        ) {
          continue
        }
        const delta = chunk.choices[0]?.delta

        // 优先处理模型标准返回的 reasoning_content
        if (delta?.reasoning_content) {
          cachedMessage.reasoning_content += delta.reasoning_content
          e.update({
            content: delta.reasoning_content,
            type: 'reasoningContent',
          })
        } else if (delta?.content) {
          processingBuffer += delta.content // 将当前chunk的内容追加到缓冲区

          // 循环处理缓冲区，直到没有可处理的完整标签或直到缓冲区末尾是部分标签
          while (true) {
            if (isReasoning) {
              // 当前在 <think> 标签内，寻找结束标签 </think>
              const endMatch = processingBuffer.match(reasoningEndRegex)
              if (endMatch) {
                // 找到了完整的结束标签（可能包含\n）
                const endTagIndex = endMatch.index
                const reasoningPart = processingBuffer.substring(0, endTagIndex)
                if (reasoningPart) {
                  e.update({ content: reasoningPart, type: 'reasoningContent' })
                  cachedMessage.reasoning_content += reasoningPart
                }
                // 从缓冲区移除已处理的思考内容和结束标签（包括可能的\n）
                processingBuffer = processingBuffer.substring(
                  endTagIndex + endMatch[0].length,
                )
                isReasoning = false // 退出思考状态
                continue // 继续处理缓冲区中剩余的内容
              } else {
                // 未找到完整的结束标签，检查缓冲区末尾是否有部分标签
                let sendableReasoning = processingBuffer
                let keepInBuffer = ''
                const lastBracketIndex = processingBuffer.lastIndexOf('<')
                if (lastBracketIndex !== -1) {
                  const potentialTagStart =
                    processingBuffer.substring(lastBracketIndex)
                  // 如果缓冲区末尾是 </think> 的前缀
                  if (reasoningEndSymbol.startsWith(potentialTagStart)) {
                    sendableReasoning = processingBuffer.substring(
                      0,
                      lastBracketIndex,
                    )
                    keepInBuffer = potentialTagStart
                  }
                }
                // 发送可以安全发送的思考内容（不包含部分标签）
                if (sendableReasoning) {
                  e.update({
                    content: sendableReasoning,
                    type: 'reasoningContent',
                  })
                  cachedMessage.reasoning_content += sendableReasoning
                }
                processingBuffer = keepInBuffer // 保留部分标签在缓冲区，等待下一个chunk
                break // 等待下一个 chunk
              }
            } else {
              // 当前在 <think> 标签外，寻找开始标签 <think>
              const startMatch = processingBuffer.match(reasoningStartRegex)
              if (startMatch) {
                // 找到了完整的开始标签（可能包含\n）
                const startTagIndex = startMatch.index
                const contentPart = processingBuffer.substring(0, startTagIndex)
                if (contentPart) {
                  e.update({ content: contentPart, type: 'content' })
                  cachedMessage.content += contentPart // 累加普通内容
                }
                // 从缓冲区移除已处理的普通内容和开始标签（包括可能的\n）
                processingBuffer = processingBuffer.substring(
                  startTagIndex + startMatch[0].length,
                )
                isReasoning = true // 进入思考状态
                continue // 继续处理缓冲区中剩余的内容
              } else {
                // 未找到完整的开始标签，检查缓冲区末尾是否有部分标签
                let sendableContent = processingBuffer
                let keepInBuffer = ''
                const lastBracketIndex = processingBuffer.lastIndexOf('<')
                if (lastBracketIndex !== -1) {
                  const potentialTagStart =
                    processingBuffer.substring(lastBracketIndex)
                  // 如果缓冲区末尾是 <think> 的前缀
                  if (reasoningStartSymbol.startsWith(potentialTagStart)) {
                    sendableContent = processingBuffer.substring(
                      0,
                      lastBracketIndex,
                    )
                    keepInBuffer = potentialTagStart
                  }
                }
                // 发送可以安全发送的普通内容（不包含部分标签）
                if (sendableContent) {
                  e.update({ content: sendableContent, type: 'content' })
                  cachedMessage.content += sendableContent // 累加普通内容
                }
                processingBuffer = keepInBuffer // 保留部分标签在缓冲区，等待下一个chunk
                break // 等待下一个 chunk
              }
            }
          }
        } else if (delta?.tool_calls) {
          // Tool calls 逻辑
          if (Object.keys(callMessage).length === 0) {
            callMessage = { ...delta }
            if (!callMessage.tool_calls) {callMessage.tool_calls = []}
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
              call = { ...functionCall, function: { ...functionCall.function, arguments: '' } }
              callMessage.tool_calls.push(call)

              const toolCallData = {
                action: 'started',
                id: call.id,
                name: call.function.name,
                parameters: '',
                result: '',
              }
              e.update({
                content: toolCallData,
                type: 'toolCall',
              })
            }
            if (functionCall?.function?.arguments) {
              // 确保arguments是字符串
              if (typeof call.function.arguments !== 'string') {
                call.function.arguments = ''
              }
              call.function.arguments += functionCall.function.arguments
              const toolCallData = {
                action: 'pending',
                id: call.id,
                name: call.function.name,
                parameters: functionCall.function.arguments || '',
                result: '',
              }
              e.update({
                content: toolCallData,
                type: 'toolCall',
              })
            }
          }
        } else if (delta?.images) {
          const urls = delta.images.map((image) => image.image_url.url)
          urls.forEach(async (url) => {
            const imageUrl = await base64ToImageUrl('', url)
            const mdWarpper = (url) => `![图片](${url})`
            e.update({
              content: mdWarpper(imageUrl),
              type: 'content',
            })
          })
        }
      }

      // 在流式循环结束后，如果缓冲区中还有内容，且未处于思考模式，则将其作为普通内容发出
      // 这主要是为了处理流结束时，如果缓冲区里还有普通文本的情况。
      if (!isReasoning && processingBuffer) {
        e.update({ content: processingBuffer, type: 'content' })
        cachedMessage.content += processingBuffer
        processingBuffer = ''
      }
      // 如果流结束时处于思考模式，且缓冲区还有内容，将其作为思考内容发出
      else if (isReasoning && processingBuffer) {
        e.update({ content: processingBuffer, type: 'reasoningContent' })
        cachedMessage.reasoning_content += processingBuffer
        processingBuffer = ''
      }

      const finalUsage = lastUsage || { completion_tokens: 0, prompt_tokens: 0, total_tokens: 0 }
      const providerName = this.constructor.getAdapterMetadata()?.name || this.provider
      if (callMessage && callMessage.tool_calls && callMessage.tool_calls.length > 0) {
        timeMetrics.toolsCalled = callMessage.tool_calls.map(tc => tc.function?.name).filter(Boolean)
      }
      this.logUsage(providerName, finalUsage, timeMetrics)

      // 在流式循环结束后，检查是否有工具需要调用
      if (
        callMessage &&
        callMessage.tool_calls &&
        callMessage.tool_calls.length > 0
      ) {
        if (cachedMessage.content) {
          e.body.extraCachedContent = cachedMessage.content
        }
        if (this.shouldPreserveReasoningContent && cachedMessage.reasoning_content) {
          e.body.extraCachedReasoningContent = cachedMessage.reasoning_content
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

      const completion = await this.openai.chat.completions.create(body, {
        signal: controller.signal,
      })

      if (completion.usage) {
        const providerName = this.constructor.getAdapterMetadata()?.name || this.provider
        const toolCalls = completion.choices?.[0]?.message?.tool_calls
        if (toolCalls && toolCalls.length > 0) {
          timeMetrics.toolsCalled = toolCalls.map(tc => tc.function?.name).filter(Boolean)
        }
        this.logUsage(providerName, completion.usage, timeMetrics)
        // 挂载本轮 usage 到事件对象，供结晶水位线检查使用
        e.lastUsage = completion.usage
      }
      const {message} = completion.choices[0]
      if (message?.tool_calls?.length > 0) {
        if (this.shouldPreserveReasoningContent) {
          if (message.content) {
            e.body.extraCachedContent = message.content
            e.update({
              content: message.content,
              type: 'content',
            })
          }
          if (message.reasoning_content) {
            e.body.extraCachedReasoningContent = message.reasoning_content
            e.update({
              content: message.reasoning_content,
              type: 'reasoningContent',
            })
          }
        }
        return { stepId, toolCalls: message.tool_calls }
      } else {
        if (message?.content) {
          const {content} = message
          // 非流式处理，使用全局匹配来找到所有 <think>...</think> 对
          const thinkRegex = /<think>(.*?)<\/think>\n?/gs // G:全局匹配, s: .匹配换行符

          let lastIndex = 0
          let match
          let hasThinkContent = false

          // 循环查找所有思考内容块
          while ((match = thinkRegex.exec(content)) !== null) {
            hasThinkContent = true
            // 匹配到的思考内容之前的普通内容
            const precedingContent = content.substring(lastIndex, match.index)
            if (precedingContent.trim()) {
              e.update({
                content: precedingContent.trim(),
                type: 'content',
              })
            }

            // 思考内容
            const reasoningContent = match[1]
            if (reasoningContent.trim()) {
              e.update({
                content: reasoningContent.trim(),
                type: 'reasoningContent',
              })
              if (this.shouldPreserveReasoningContent) {
                message.reasoning_content = (message.reasoning_content || '') + reasoningContent.trim()
              }
            }
            lastIndex = thinkRegex.lastIndex // 更新lastIndex到当前匹配结束的位置
          }

          // 如果没有找到 <think> 标签，或者标签结束后还有普通内容
          if (!hasThinkContent || lastIndex < content.length) {
            const remainingContent = content.substring(lastIndex)
            if (remainingContent.trim()) {
              e.update({
                content: remainingContent.trim(),
                type: 'content',
              })
            }
          }
        }

        // 处理模型标准返回的 reasoning_content（如果存在）
        if (message?.reasoning_content) {
          e.update({
            content: message.reasoning_content,
            type: 'reasoningContent',
          })
        }
        return {} // 返回一个空对象，避免后续处理出错
      }
    }
    return {}
  }

  /**
   * 扩展 assistant 消息的钩子方法。
   * 子类可覆盖此方法以在 callMessage 推入历史前注入额外字段。
   * @param {object} callMessage
   * @param {object} e
   */
  _extendAssistantMessage(callMessage, e) {
    if (this.shouldPreserveReasoningContent && e.body.extraCachedReasoningContent) {
      callMessage.reasoning_content = e.body.extraCachedReasoningContent
      delete e.body.extraCachedReasoningContent
    }
  }

  /**
   * 辅助方法：处理第三方 OpenAI 兼容接口的 thinking/extra_body 逻辑
   * @param {object} preparedBody - 已初步构建的请求体
   * @param {number|string} reasoningEffort - 原始的 reasoning_effort 参数
   * @param {object} [reasoningEffortTable] - 可选的 reasoning_effort 转换表。如果不传，则不向顶级 preparedBody 注入 reasoning_effort 字段
   */
  _applyExtraThinkingBody(preparedBody, reasoningEffort, reasoningEffortTable = null) {
    // 1. 剥离可能存在的旧 thinking 属性，防止干扰
    if (preparedBody.thinking) {
      delete preparedBody.thinking
    }

    if (reasoningEffort !== undefined && reasoningEffort !== null) {
      if (reasoningEffort === 0 || reasoningEffort === '0') {
        preparedBody.extra_body = {
          thinking: {
            type: 'disabled',
          },
        }
        if ('reasoning_effort' in preparedBody) {
          delete preparedBody.reasoning_effort
        }
      } else {
        preparedBody.extra_body = {
          thinking: {
            type: 'enabled',
          },
        }
        if (reasoningEffortTable) {
          preparedBody.reasoning_effort = reasoningEffortTable[reasoningEffort] || reasoningEffortTable['-1'] || 'high'
        } else {
          if ('reasoning_effort' in preparedBody) {
            delete preparedBody.reasoning_effort
          }
        }
      }
    } else {
      if ('reasoning_effort' in preparedBody) {
        delete preparedBody.reasoning_effort
      }
    }
  }
}
