import BaseLLMAdapter from './base.js'
import OpenAI from 'openai'
import { imgUrlToBase64, base64ToImageUrl } from '../../../../utils/imgTools.js'
import logger from '../../../../utils/logger.js'

/**
 * @class OpenAI Bot 实现
 */
export default class OpenAIBot extends BaseLLMAdapter {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      type: 'openai',
      name: 'OpenAI',
      description: 'OpenAI GPT 系列模型适配器，支持 GPT-3.5、GPT-4 等模型',
      supportedFeatures: ['chat', 'streaming', 'function_calling', 'vision'],
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
          placeholder: '例如：OpenAI-主要',
        },
        api_key: {
          type: 'password',
          default: '',
          description: 'OpenAI API 密钥，支持多个密钥用逗号分隔',
          required: true,
          label: 'API Key',
          placeholder: 'API Key',
        },
        base_url: {
          type: 'url',
          default: 'https://api.openai.com/v1',
          description: 'OpenAI API 的基础 URL，可用于代理或第三方兼容服务',
          required: true,
          label: 'Base URL',
          placeholder: 'https://api.openai.com/v1',
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
   * @param {string} baseUrl - OpenAI API 的基础 URL
   * @param {string} apiKey - OpenAI API 的密钥
   * @throws {Error} 如果 baseUrl 或 apiKey 缺失,则抛出错误
   */
  constructor(openaiConfig) {
    super(openaiConfig)
    this.provider = 'openai'
  }

  get openai() {
    const { base_url, api_key } = this.config

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

    return new OpenAI({ baseURL: base_url, apiKey: selectedKey })
  }

  // ---------------------- 私有辅助方法 ----------------------

  async _prepareChatBody(body) {
    const { messages, settings } = body
    const processedMessages = await this._processMessages(messages)
    const { base, chatParams, toolCallSettings } = settings

    const { tools, mode } = toolCallSettings
    let parsedTools = undefined
    let tool_choice = undefined
    if (mode !== 'NONE' && tools?.length > 0) {
      parsedTools = this._getFormattedTools(tools)
      tool_choice = mode === 'ANY' ? 'required' : undefined
    }

    const openaiReasoningEffortTable = {
      '-1': undefined,
      0: undefined,
      1: 'low',
      2: 'medium',
      3: 'high',
    }

    const avaliableReasoningModels = {
      openai: ['o1', 'o3', 'o4'],
      xai: ['grok-3-mini'],
    }

    const model = base.model
    // 先检查是否是可推理模型
    for (const [provider, models] of Object.entries(avaliableReasoningModels)) {
      if (models.includes(model)) {
        if (provider === 'openai') {
          chatParams.reasoning_effort =
            openaiReasoningEffortTable[chatParams.reasoning_effort]
        } else if (provider === 'xai') {
          chatParams.reasoning_effort =
            chatParams.reasoning_effort === 3 ? 'high' : 'low'
        }
      } else {
        delete chatParams.reasoning_effort
      }
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
      let modelList = this._groupModelsByOwner(list.data)
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
  async _processMessages(messages) {
    const processed = []
    const toolCallIdMap = new Map()
    for (const message of messages) {
      if (message.role === 'user' && Array.isArray(message.content)) {
        const processedContent = []
        for (const element of message.content) {
          if (element.type === 'image_url') {
            const base64 = element.image_url.url.startsWith('http')
              ? await imgUrlToBase64(element.image_url.url)
              : element.image_url.url
            processedContent.push({
              type: 'image_url',
              image_url: { url: base64.data },
            })
          } else {
            processedContent.push(element)
          }
        }
        processed.push({ ...message, content: processedContent })
      } else if (message.role === 'assistant' && message.tool_calls) {
        const processedToolCalls = []
        for (const toolCall of message.tool_calls) {
          // 处理 Gemini 的思考签名
          if (String(toolCall.id).length > 100) {
            const shortId = this._getRandomCallId()
            toolCallIdMap.set(toolCall.id, shortId)
            toolCall.id = shortId
          }
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
                // pass
              }
            }
          }
          processedToolCalls.push(toolCall)
        }
        processed.push({ ...message, tool_calls: processedToolCalls })
      } else if (message.role === 'tool') {
        processed.push({
          ...message,
          tool_call_id: toolCallIdMap.get(message.tool_call_id) ?? message.tool_call_id
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
    const enableStream = body.stream ?? true
    let callMessage = {}
    let cachedMessage = {
      role: 'assistant',
      content: '',
    }

    if (enableStream) {
      const stream = await this.openai.chat.completions.create(body)
      e.client.pushConnection(e.request_id, stream)
      e.pending()

      // 定义标签和带可选换行符的正则表达式
      const reasoningStartSymbol = '<think>' // 用于部分标签匹配
      const reasoningEndSymbol = '</think>' // 用于部分标签匹配
      const reasoningStartRegex = /<think>\n?/ // 匹配 <think> 或 <think>\n
      const reasoningEndRegex = /<\/think>\n?/ // 匹配 </think> 或 </think>\n

      let isReasoning = false // 跟踪是否处于思考内容模式
      let processingBuffer = '' // 用于处理跨chunk的内容

      for await (const chunk of stream) {
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
          e.update({
            type: 'reasoningContent',
            content: delta.reasoning_content,
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
                  e.update({ type: 'reasoningContent', content: reasoningPart })
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
                    type: 'reasoningContent',
                    content: sendableReasoning,
                  })
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
                  e.update({ type: 'content', content: contentPart })
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
                  e.update({ type: 'content', content: sendableContent })
                  cachedMessage.content += sendableContent // 累加普通内容
                }
                processingBuffer = keepInBuffer // 保留部分标签在缓冲区，等待下一个chunk
                break // 等待下一个 chunk
              }
            }
          }
        } else if (delta?.tool_calls) {
          // Tool calls 逻辑保持不变
          if (Object.keys(callMessage).length === 0) {
            callMessage = { ...delta }
            callMessage.tool_calls.forEach((item) => {
              const toolCallData = {
                name: item.function.name,
                id: item.id,
                action: 'started',
                parameters: '',
                result: '',
              }
              e.update({
                type: 'toolCall',
                content: toolCallData,
              })
            })
          }
          for (const functionCall of delta.tool_calls) {
            const call = callMessage.tool_calls.find(
              (c) => c.index === functionCall.index,
            )
            if (call && functionCall?.function?.arguments) {
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
        } else if (delta?.images) {
          const urls = delta.images.map((image) => image.image_url.url)
          urls.forEach(async (url) => {
            const imageUrl = await base64ToImageUrl('', url)
            const mdWarpper = (url) => `![图片](${url})`
            e.update({
              type: 'content',
              content: mdWarpper(imageUrl),
            })
          })
        }
      }

      // 在流式循环结束后，如果缓冲区中还有内容，且未处于思考模式，则将其作为普通内容发出
      // 这主要是为了处理流结束时，如果缓冲区里还有普通文本的情况。
      if (!isReasoning && processingBuffer) {
        e.update({ type: 'content', content: processingBuffer })
        cachedMessage.content += processingBuffer
        processingBuffer = ''
      }
      // 如果流结束时处于思考模式，且缓冲区还有内容，将其作为思考内容发出
      else if (isReasoning && processingBuffer) {
        e.update({ type: 'reasoningContent', content: processingBuffer })
        processingBuffer = ''
      }

      // 在流式循环结束后，检查是否有工具需要调用
      if (
        callMessage &&
        callMessage.tool_calls &&
        callMessage.tool_calls.length > 0
      ) {
        if (cachedMessage.content) {
          e.body.messages.push(cachedMessage)
        }
        return { toolCalls: callMessage.tool_calls }
      }
    } else {
      // 非流式处理
      const completion = await this.openai.chat.completions.create(body)
      const message = completion.choices[0].message
      if (message?.tool_calls?.length > 0) {
        return { toolCalls: message.tool_calls }
      } else {
        if (message?.content) {
          const content = message.content
          // 非流式处理，使用全局匹配来找到所有 <think>...</think> 对
          const thinkRegex = /<think>(.*?)<\/think>\n?/gs // g:全局匹配, s: .匹配换行符

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
                type: 'content',
                content: precedingContent.trim(),
              })
            }

            // 思考内容
            const reasoningContent = match[1]
            if (reasoningContent.trim()) {
              e.update({
                type: 'reasoningContent',
                content: reasoningContent.trim(),
              })
            }
            lastIndex = thinkRegex.lastIndex // 更新lastIndex到当前匹配结束的位置
          }

          // 如果没有找到 <think> 标签，或者标签结束后还有普通内容
          if (!hasThinkContent || lastIndex < content.length) {
            const remainingContent = content.substring(lastIndex)
            if (remainingContent.trim()) {
              e.update({
                type: 'content',
                content: remainingContent.trim(),
              })
            }
          }
        }

        // 处理模型标准返回的 reasoning_content（如果存在）
        if (message?.reasoning_content) {
          e.update({
            type: 'reasoningContent',
            content: message.reasoning_content,
          })
        }
        return {} // 返回一个空对象，避免后续处理出错
      }
    }
    return {}
  }

  /**
   * 处理工具调用
   * @param {object} toolCalls
   * @param {object} e
   */
  async _handleToolCalls(toolCalls, e) {
    if (!e.body.messages) {
      e.body.messages = [] // 确保 e.body.messages 存在
    }

    let callMessage = { role: 'assistant', tool_calls: toolCalls }

    callMessage.tool_calls.forEach((item) => {
      // 使用 forEach 避免不必要的返回值
      item.id = item.id || this._getRandomCallId()
    })
    e.body.messages.push(callMessage)

    for (const call of toolCalls) {
      const toolCall = call.function
      const toolCallData = {
        name: toolCall.name,
        id: call.id,
        action: 'running',
        parameters: toolCall.arguments,
        result: '',
      }
      e.update({
        type: 'toolCall',
        content: toolCallData,
      })
      logger.info(`执行工具：${toolCall.name}，参数：${toolCall.arguments}`)
      logger.debug(JSON.stringify(toolCall, null, 2))

      const toolResult = await middleware.llm.runTool(toolCallData, e.user)
      const { result } = toolResult
      logger.info(`运行结果：${JSON.stringify(result)}`)

      e.body.messages.push({
        tool_call_id: call.id,
        role: 'tool',
        name: toolCall.name,
        content: JSON.stringify(result),
      })
      toolCallData.result = result
      toolCallData.action = 'finished'
      e.update({
        type: 'toolCall',
        content: toolCallData,
      })
    }
    // 递归调用 handleChatRequest 方法来处理工具调用的结果
    await this.handleChatRequest(e, false)
  }
}
