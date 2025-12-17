import BaseLLMAdapter from './base.js'
import { imgUrlToBase64, base64ToImageUrl } from '../../../../utils/imgTools.js'

/**
 * @class OpenAI Bot 实现
 */
export default class GeminiAdapter extends BaseLLMAdapter {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      type: 'gemini',
      requiresSpecialAuth: false  // 标准 API Key 认证
    }
  }

  /**
   * 构造函数
   * @param {string} baseUrl - OpenAI API 的基础 URL
   * @param {string} apiKey - OpenAI API 的密钥
   * @throws {Error} 如果 baseUrl 或 apiKey 缺失,则抛出错误
   */
  constructor(geminiConfig) {
    super(geminiConfig)
    this.provider = 'gemini'
  }

  get core() {
    const { base_url, api_key } = this.config
    
    // 检查 api_key 是否存在
    if (!api_key) {
      throw new Error('Gemini API Key 未配置')
    }
    
    // 以,为分隔符切割key列表
    const apiKeys = api_key.split(',')
    // 随机选择一个key
    const selectedKey = apiKeys[Math.floor(Math.random() * apiKeys.length)]
    // 日志用的哪个
    logger.info(
      `使用Gemini API：${base_url} , 第${apiKeys.indexOf(selectedKey) + 1}个key`,
    )

    return new Gemini({ base_url, api_key: selectedKey })
  }

  // ---------------------- 私有辅助方法 ----------------------

  /**
   * 从 OpenAI API 获取模型列表
   * @returns {Promise<Array<object>>} 格式化后的模型列表
   * @throws {Error} 如果获取模型列表失败，则抛出错误
   */
  async _getModels() {
    try {
      const models = await this.core.models()
      let modelList = this._groupModelsByOwner(models, this.owners)
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
    let callMessage = []
    let cachedMessage = {
      role: 'assistant',
      content: '',
    }

    const stream = this.core.chat(body)
    // e.client.pushConnection(e.request_id, stream)

    for await (const chunk of stream) {
      if (!chunk.candidates || chunk.candidates.length === 0) {
        const { promptFeedback } = chunk
        if (promptFeedback) {
          const Tip = `\n\n本次对话已被强制结束，结束原因：${promptFeedback.blockReason}`
          e.update({
            type: 'content',
            content: Tip,
          })
        }

        continue
      }

      const { content, finishReason, groundingMetadata } = chunk.candidates[0]

      if (content?.parts) {
        for (const part of content.parts) {
          const {
            text,
            functionCall,
            inlineData,
            executableCode,
            codeExecutionResult,
            fileData,
            thought,
          } = part

          if (text) {
            e.update({
              type: thought ? 'reasoningContent' : 'content',
              content: text,
            })
            cachedMessage.content += text
          }

          if (functionCall) {
            const randomId = this._getRandomCallId()

            const toolCallElem = {
              functionCall,
              id: randomId,
            }

            callMessage.push(toolCallElem)

            const toolCallData = {
              name: functionCall.name,
              action: 'started',
              id: randomId,
              parameters: functionCall.args || '',
              result: '',
            }
            e.update({
              type: 'toolCall',
              content: toolCallData,
            })
          }

          if (inlineData) {
            const { data, mimeType } = inlineData
            const avaliableTypes = ['image/png', 'image/jpeg', 'image/gif']
            if (avaliableTypes.includes(mimeType)) {
              const imageUrl = await base64ToImageUrl('', data)
              e.update({
                type: 'content',
                content: `\n![图片](${imageUrl})\n`,
              })
            } else {
              logger.warn(`未知的 inlineData 类型：${mimeType}`)
              e.update({
                type: 'content',
                content: `\n\n未知的 inlineData 类型：${mimeType}\n\n`,
              })
            }
          }
          if (executableCode) {
            const { code, language } = executableCode
            const mdCodeTip = `\n\n\`\`\`${language}\n${code}\n\`\`\`\n\n`
            e.update({
              type: 'content',
              content: mdCodeTip,
            })
          }
          if (codeExecutionResult) {
            const { outcome, output } = codeExecutionResult
            if (outcome === 'OUTCOME_OK') {
              const mdCodeTip = `\n\n\`\`\`\n${output}\n\`\`\`\n\n`
              e.update({
                type: 'content',
                content: mdCodeTip,
              })
            } else {
              const errorTip = `\n\n本次代码执行失败，错误信息：${output}\n\n`
              e.update({
                type: 'content',
                content: errorTip,
              })
            }
          }
          if (fileData) {
            const { _mimeType, fileUri } = fileData
            const fileTipTemplate = `\n\n文件下载链接：${fileUri}\n\n`
            e.update({
              type: 'content',
              content: fileTipTemplate,
            })
          }
        }
      }

      if (finishReason && finishReason !== 'STOP') {
        const stopTip = `\n\n本次对话已被强制结束，结束原因：${chunk.candidates[0].finishReason}`
        e.update({
          type: 'content',
          content: stopTip,
        })
      }

      if (groundingMetadata) {
        logger.json(groundingMetadata)
      }
    }

    // 在流式循环结束后，检查是否有工具需要调用
    if (callMessage.length > 0) {
      if (cachedMessage.content) {
        e.body.messages.push(cachedMessage)
      }
      return { toolCalls: callMessage }
    }

    return {}
  }

  /**
   * 准备聊天请求的主体
   * @param {object} body
   * @returns {object}
   */
  async _prepareChatBody(body) {
    const { messages, settings } = body
    const processedMessages = await this._processMessages(messages)
    const { base, chatParams, toolCallSettings, extraSettings } = settings

    const { tools, mode } = toolCallSettings
    const { gemini } = extraSettings
    const { imageGeneration, internalTools, safetySettings } = gemini
    let parsedTools = undefined
    if (mode !== 'NONE') {
      const validTools = this._getFormattedTools(tools)
      if (validTools.length > 0) {
        parsedTools = {
          function_declarations: validTools,
        }
      }
    }
    const hasInternalTools = Object.values(internalTools).some((value) => value)
    if (hasInternalTools) {
      if (!parsedTools) {
        parsedTools = {}
      }
      Object.keys(internalTools).forEach((key) => {
        if (internalTools[key]) {
          parsedTools[key] = {}
        }
      })
    }
    const parsedSafeSettings = undefined

    const _ = safetySettings ??
      Object.keys(safetySettings).forEach((key) => {
        parsedSafeSettings.push({
          category: key,
          threshold: safetySettings[key],
        })
      })

    const allowed_function_names = mode === 'ANY' ? tools : undefined

    const tool_config = allowed_function_names ? {
      function_calling_config: {
        mode,
        allowed_function_names,
      }
    } : undefined

    const { temperature, reasoning_effort } = chatParams

    const processedChatParams = {
      temperature,
    }

    const avaliableReasoningModels = [
      {
        name: '2.5-pro',
        rangeType: 'pro',
      },
      {
        name: '2.5-flash',
        rangeType: 'flash',
      },
      {
        name: '2.5-flash-light',
        rangeType: 'flash',
      },
    ]

    const reasoningEffortTables = {
      flash: new Map([
        [-1, undefined],
        [0, 0],
        [1, 1024],
        [2, 12800], // 中等档，香草觉得稍微高一点比较好喵！🌟
        [3, 24576], // 最高档，满足你啦！💢
      ]),
      pro: new Map([
        [-1, undefined],
        [0, undefined], // pro 不支持关闭思考，按默认设置
        [1, 8192],
        [2, 16384], // 中等档，香草觉得稍微高一点比较好喵！🌟
        [3, 32768], // 最高档，满足你啦！💢
      ]),
    }

    const isReasoningAvaliable = avaliableReasoningModels.some((model) =>
      base.model.includes(model.name),
    )

    if (isReasoningAvaliable) {
      const rangeType = avaliableReasoningModels.find((model) =>
        base.model.includes(model.name),
      ).rangeType
      const budgetTable = reasoningEffortTables[rangeType]

      const ThinkingConfig = reasoning_effort === 0 ? undefined : {
        includeThoughts: true,
        thinkingBudget: budgetTable.get(reasoning_effort),
      }

      
      processedChatParams.thinkingConfig = ThinkingConfig
      
    }

    if (imageGeneration) {
      processedChatParams.response_modalities = ['Text', 'Image']
    }

    const preparedBody = {
      ...processedChatParams,
      ...base,
      messages: processedMessages,
      safetySettings: parsedSafeSettings,
      tools: parsedTools,
      tool_config,
    }

    return JSON.parse(JSON.stringify(preparedBody))
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

    Gemini.pushToolCallMessages(e.body.messages, toolCalls)

    const tasks = []

    for (const toolCall of toolCalls) {
      const call = {
        ...toolCall.functionCall,
        arguments: JSON.stringify(toolCall.functionCall.args),
      }

      const toolCallData = {
        name: call.name,
        action: 'running',
        id: toolCall.id,
        parameters: call.args,
        result: '',
      }
      e.update({
        type: 'toolCall',
        content: toolCallData,
      })
      logger.info(`执行工具：${call.name}，参数：${call.arguments}`)
      logger.debug(JSON.stringify(toolCall, null, 2))

      const runTask = async () => {
        const toolResult = await middleware.llm.runTool(toolCallData, e.user)

        const { call, result } = toolResult

        const pushMessage = {
          name: call.name,
          action: 'finished',
          id: call.id,
          parameters: call.params,
          result: result,
        }

        e.update({
          type: 'toolCall',
          content: pushMessage,
        })

        e.body.messages.push({
          tool_call_id: call.id,
          role: 'tool',
          name: call.name,
          content: result,
        })

        return toolResult
      }

      tasks.push(runTask())
    }

    await Promise.allSettled(tasks)

    // 递归调用 handleChatRequest 方法来处理工具调用的结果
    await this.handleChatRequest(e, false)
  }
}

export class Gemini {
  constructor({ base_url, api_key }) {
    // if (!base_url || !api_key) {
    //   throw new Error('base_url and api_key are required')
    // }
    this.base_url = base_url
    this.api_key = api_key

    this.cache = ''
  }

  async *chat({
    model,
    messages,
    temperature,
    response_modalities,
    thinkingConfig,
    safetySettings,
    stream,
    tools,
    tool_config,
  }) {
    const url = `${this.base_url}/v1beta/${model}:${
      stream ? 'streamGenerateContent?alt=sse&' : 'generateContent?'
    }key=${this.api_key}`
    const headers = {
      'Content-Type': 'application/json',
    }
    const generationConfig = {
      temperature,
      response_modalities,
      thinkingConfig,
    }
    const { systemInstruction, contents } =
      await this._preProcessMessage(messages)
    const body = {
      system_instruction: systemInstruction,
      generationConfig,
      safetySettings,
      contents,
      tools,
      tool_config,
    }
    logger.json(body)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(errorBody)
      }
      if (stream) {
        yield* this._processStreamResponse(response)
      } else {
        const data = await response.json()
        yield data
      }
    } catch (error) {
      console.error('Error during chat:', error)
      throw error
    }
  }
  async *_processStreamResponse(response) {
    const decoder = new TextDecoder()
    let buffer = ''
    if (!response.body) {
      throw new Error('Response body is null')
    }
    const reader = response.body.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          // 看看还有没有value
          if (value) {
            // 解析和buffer
            buffer += decoder.decode(value, { stream: true })
            // 交给_parseMutiJson处理
            for (const jsonData of this._parseMutiJson(buffer)) {
              yield jsonData
            }
          }
          break
        }
        buffer += decoder.decode(value, { stream: true })
        // 尝试解析 buffer 中的完整 JSON 对象
        try {
          for (const jsonData of this._parseMutiJson(buffer)) {
            yield jsonData
          }
          buffer = '' // 清空 buffer
        } catch {
          logger.error('解析JSON失败')
        }
      }
    } catch (error) {
      console.error('Stream processing error:', error)
      throw error
    } finally {
      reader.releaseLock()
    }
  }

  *_parseMutiJson(buffer) {
    console.log(buffer)
    // 分割SSE事件并处理
    const lines = buffer.split(/\r\n|\n/).filter((line) => line.trim())

    for (const line of lines) {
      // 检查是否是data前缀
      if (line.startsWith('data: ')) {
        const jsonStr = line.substring(6).trim() // 去掉'data: '前缀

        try {
          const jsonData = JSON.parse(jsonStr)
          yield jsonData // 直接输出完整的JSON对象
        } catch {
          // JSON不完整或格式错误，添加到缓存
          this.cache += jsonStr
        }
      } else if (line.trim()) {
        // 非data行但有内容，可能是其他类型的SSE事件，根据需要处理
        this.cache += line
      }
      // 尝试解析缓存中的内容
      try {
        const cacheData = this.cache.startsWith('data: ')
          ? JSON.parse(this.cache.substring(6).trim())
          : JSON.parse(this.cache)
        yield cacheData
        this.cache = '' // 清空缓存
      } catch {
        // 缓存中的内容仍然不是有效JSON，继续等待更多数据
        // console.log(this.cache)
      }
    }
  }

  async models() {
    const url = `${this.base_url}/v1beta/models?key=${this.api_key}`

    const response = await fetch(url, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorBody = await response.text() // Or response.json() if API returns JSON error
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${errorBody}`,
      )
    } else {
      const avaliableModelNames = ['gemma', 'gemini-2.', 'gemini-1.5']
      const res = await response.json()
      const { models } = res

      return models
        .map((model) => {
          return {
            id: model.name,
          }
        })
        .filter((model) => {
          for (const name of avaliableModelNames) {
            if (model.id.includes(name)) {
              return true
            }
          }
        })
    }
  }

  async _preProcessMessage(messages) {
    let systemInstruction = undefined
    let contents = []
    let toolCallResultsCache = []
    for (const [index, message] of messages.entries()) {
      if (message.role === 'system' || message.role === 'developer') {
        // 看看content是不是字符串
        if (typeof message.content === 'string') {
          if (!systemInstruction) {
            systemInstruction = {
              parts: [
                {
                  text: message.content,
                },
              ],
            }
          } else {
            systemInstruction.parts.push({
              text: message.content,
            })
          }
        } else {
          logger.error('system message content is not string')
        }
      } else if (message.role === 'user' || message.role === 'assistant') {
        const role = message.role === 'user' ? 'user' : 'model'
        const contentElement = {
          role: role,
          parts: [],
        }
        if (Array.isArray(message.content)) {
          for (const element of message.content) {
            if (element.type === 'text') {
              contentElement.parts.push({
                text: element.text,
              })
            } else if (element.type === 'image_url') {
              if (element.image_url.url.startsWith('http')) {
                logger.error('暂不支持http图片')
              } else {
                // 从base64中解析出type和data
                const base64 = element.image_url.url
                const mime_type = base64.split(';')[0].split(':')[1]
                const data = base64.split(',')[1]

                contentElement.parts.push({
                  inline_data: {
                    mime_type,
                    data,
                  },
                })
              }
            }
          }
        } else if (typeof message.content === 'string') {
          contentElement.parts.push({
            text: message.content,
          })
        } else if (message.tool_calls) {
          for (const toolCall of message.tool_calls) {
            const name = toolCall.function.name
            let args = toolCall.function.arguments
            try {
              args = JSON.parse(args)
            } catch {
              // 无事发生
            }
            const callElm = {
              functionCall: {
                name,
                args,
              },
            }
            contentElement.parts.push(callElm)
          }
        }
        contents.push(contentElement)
      } else if (message.role === 'tool') {
        toolCallResultsCache.push(message)
        // 检查下一条消息是否是 tool
        if (
          index + 1 < messages.length &&
          messages[index + 1].role === 'tool'
        ) {
          continue
        } else {
          const contentElement = {
            role: 'user',
            parts: [],
          }
          for (const toolCallResult of toolCallResultsCache) {
            const elem = {
              functionResponse: {
                name: toolCallResult.name,
                response: {
                  name: toolCallResult.name,
                  content: toolCallResult.content,
                },
              },
            }
            contentElement.parts.push(elem)
          }
          contents.push(contentElement)
          // 清空缓存
          toolCallResultsCache = []
        }
      } else {
        logger.error(`Unknown role: ${message.role}`)
      }
    }
    return {
      systemInstruction,
      contents,
    }
  }

  // 把 Gemini message push 到 openai messages
  static pushToolCallMessages(messages, res) {
    const tool_calls = res.map((res) => {
      return {
        id: res.id,
        type: 'function',
        function: {
          name: res.functionCall.name,
          arguments: res.functionCall.args,
        },
      }
    })
    messages.push({
      role: 'assistant',
      content: null,
      tool_calls,
    })
  }
}
