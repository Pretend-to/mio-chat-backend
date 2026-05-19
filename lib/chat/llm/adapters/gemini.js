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
      name: 'Gemini',
      description:
        'Google AI Studio 专用适配器。提供对 Gemini 系列模型的快速访问，适合开发者原型设计与测试。支持多模态输入（图片、视频、长文本）及 Google Search 插件。\n\n**获取方式**：访问 [Google AI Studio](https://aistudio.google.com/app/apikey) 免费创建 API 密钥。',
      supportedFeatures: ['chat', 'streaming', 'vision', 'multimodal'],
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
          placeholder: '例如：Gemini-主要',
        },
        api_key: {
          type: 'password',
          default: '',
          description: 'Google AI Studio API 密钥',
          required: true,
          label: 'API Key',
          placeholder: 'AIza...',
        },
        base_url: {
          type: 'url',
          default: 'https://generativelanguage.googleapis.com',
          description: 'Gemini API 的基础 URL',
          required: true,
          label: 'Base URL',
          placeholder: 'https://generativelanguage.googleapis.com',
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
      extraSettingsSchema: {
        gemini: {
          imageGeneration: {
            type: 'boolean',
            default: false,
            label: '图像生成 (DALL-E style)',
          },
          internalTools: {
            type: 'group',
            label: '内置工具',
            fields: {
              google_search: {
                type: 'boolean',
                default: false,
                label: 'Google Search',
              },
              code_execution: {
                type: 'boolean',
                default: false,
                label: '代码执行 (Code Execution)',
              },
              url_context: {
                type: 'boolean',
                default: false,
                label: '网页解析 (URL Context)',
              },
            },
          },
          safetySettings: {
            type: 'group',
            label: '安全过滤设置',
            fields: {
              HARM_CATEGORY_HARASSMENT: {
                type: 'select',
                label: '骚扰内容',
                default: 'BLOCK_NONE',
                options: [
                  { label: '不阻止', value: 'BLOCK_NONE' },
                  { label: '仅阻止高可能性', value: 'BLOCK_ONLY_HIGH' },
                  { label: '阻止中等及以上', value: 'BLOCK_MEDIUM_AND_ABOVE' },
                  { label: '最严格', value: 'BLOCK_LOW_AND_ABOVE' },
                ],
              },
              HARM_CATEGORY_HATE_SPEECH: {
                type: 'select',
                label: '仇恨言论',
                default: 'BLOCK_NONE',
                options: [
                  { label: '不阻止', value: 'BLOCK_NONE' },
                  { label: '仅阻止高可能性', value: 'BLOCK_ONLY_HIGH' },
                  { label: '阻止中等及以上', value: 'BLOCK_MEDIUM_AND_ABOVE' },
                  { label: '最严格', value: 'BLOCK_LOW_AND_ABOVE' },
                ],
              },
              HARM_CATEGORY_SEXUALLY_EXPLICIT: {
                type: 'select',
                label: '色情内容',
                default: 'BLOCK_NONE',
                options: [
                  { label: '不阻止', value: 'BLOCK_NONE' },
                  { label: '仅阻止高可能性', value: 'BLOCK_ONLY_HIGH' },
                  { label: '阻止中等及以上', value: 'BLOCK_MEDIUM_AND_ABOVE' },
                  { label: '最严格', value: 'BLOCK_LOW_AND_ABOVE' },
                ],
              },
              HARM_CATEGORY_DANGEROUS_CONTENT: {
                type: 'select',
                label: '危险内容',
                default: 'BLOCK_NONE',
                options: [
                  { label: '不阻止', value: 'BLOCK_NONE' },
                  { label: '仅阻止高可能性', value: 'BLOCK_ONLY_HIGH' },
                  { label: '阻止中等及以上', value: 'BLOCK_MEDIUM_AND_ABOVE' },
                  { label: '最严格', value: 'BLOCK_LOW_AND_ABOVE' },
                ],
              },
            },
          },
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
    const models = await this.core.models()
    let modelList = this._groupModelsByOwner(models)
    return this._sortModelList(modelList)
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
            const url = element.image_url?.url || element.image_url
            const base64 = typeof url === 'string' && url.startsWith('http')
              ? await imgUrlToBase64(url)
              : { data: url }
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

    const stream = this.core.chat(body, e.aborted ? null : e)
    e.client.pushConnection(e.requestId, stream)

    for await (const chunk of stream) {
      if (e.aborted) break
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
            thoughtSignature,
          } = part

          if (text) {
            e.update({
              type: thought ? 'reasoningContent' : 'content',
              content: text,
            })
            cachedMessage.content += text
          }

          if (functionCall) {
            const toolCallElem = {
              functionCall,
              id: null,
            }

            callMessage.push(toolCallElem)
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

          if (thoughtSignature) {
            if (callMessage.length === 0) {
              continue
            } else {
              callMessage.map((msg) => {
                msg.id = thoughtSignature
              })
            }
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
      {
        callMessage.map((msg) => {
          const { functionCall, id } = msg

          const toolCallData = {
            name: functionCall.name,
            action: 'started',
            id: id || this._getRandomCallId,
            parameters: functionCall.args || '',
            result: '',
          }
          e.update({
            type: 'toolCall',
            content: toolCallData,
          })
        })
      }
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
    const gemini = extraSettings.gemini || extraSettings.agentPlatform || {}
    const { imageGeneration, internalTools = {}, safetySettings = {} } = gemini
    const isImageModel = base.model.includes('image')
    let parsedTools = []
    // 图片模型限制 toolCall
    if (mode !== 'NONE' && !isImageModel) {
      const validTools = this._getFormattedTools(tools)
      if (validTools.length > 0) {
        parsedTools.push({
          functionDeclarations: validTools,
        })
      }
    }

    const internalToolsMap = {
      google_search: 'googleSearch',
      url_context: 'urlContext',
      code_execution: 'codeExecution',
    }

    Object.keys(internalTools).forEach((key) => {
      if (internalTools[key] && internalToolsMap[key]) {
        parsedTools.push({
          [internalToolsMap[key]]: {},
        })
      }
    })
    const parsedSafeSettings = []

    if (safetySettings) {
      Object.keys(safetySettings).forEach((key) => {
        parsedSafeSettings.push({
          category: key,
          threshold: safetySettings[key],
        })
      })
    }

    const allowedFunctionNames = mode === 'ANY' ? tools : undefined

    const toolConfig = allowedFunctionNames
      ? {
          functionCallingConfig: {
            mode,
            allowedFunctionNames,
          },
        }
      : undefined

    const { temperature, reasoning_effort } = chatParams

    const processedChatParams = {
      temperature,
    }

    const avaliableReasoningModels = [
      {
        name: '3-pro',
        rangeType: 'level',
      },
      {
        name: '3-flash',
        rangeType: 'level',
      },
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
      level: new Map([
        [-1, undefined],
        [0, 'LOW'],
        [1, 'LOW'],
        [2, 'HIGH'], // 中等档，香草觉得稍微高一点比较好喵！🌟
        [3, 'HIGH'], // 最高档，满足你啦！💢
      ]),
    }

    const isReasoningAvaliable = avaliableReasoningModels.some(
      (model) => base.model.includes(model.name) && !isImageModel,
    )

    if (isReasoningAvaliable) {
      const rangeType = avaliableReasoningModels.find((model) =>
        base.model.includes(model.name),
      ).rangeType
      const budgetTable = reasoningEffortTables[rangeType]

      const ThinkingConfig =
        reasoning_effort === 0
          ? undefined
          : rangeType !== 'level'
            ? {
                includeThoughts: true,
                thinkingBudget: budgetTable.get(reasoning_effort),
              }
            : {
                includeThoughts: true,
                thinkingLevel: budgetTable.get(reasoning_effort),
              }

      processedChatParams.thinkingConfig = ThinkingConfig
    }

    const isImageGenerationEnabled = imageGeneration === true || (imageGeneration && imageGeneration.enabled === true)
    if (isImageGenerationEnabled) {
      processedChatParams.responseModalities = ['Text', 'Image']
    }

    const preparedBody = {
      ...processedChatParams,
      stream: base.stream,
      model: base.model,
      messages: processedMessages,
      safetySettings: parsedSafeSettings,
      tools: parsedTools.length > 0 ? parsedTools : undefined,
      toolConfig,
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
    const allPostMessages = [] // 用于收集所有工具产生的后置消息

    for (const toolCall of toolCalls) {
      if (e.aborted) break
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
        try {
          const toolResult = await middleware.llm.runTool(
            toolCallData,
            e.user,
            e,
          )

          let { call, result } = toolResult

          if (result && typeof result === 'object' && result._postMessages) {
            allPostMessages.push(...result._postMessages)
            result = result.result
          }

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
            content:
              typeof result === 'string' ? result : JSON.stringify(result),
          })

          return toolResult
        } catch (err) {
          if (err.message === 'USER_ABORT') {
            logger.info(
              `Tool execution ${call.name} aborted for request ${e.requestId}`,
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

    // 递归调用 handleChatRequest 方法来处理工具调用的结果
    await this.handleChatRequest(e, false)
  }
}

export class Gemini {
  constructor({ base_url, api_key }) {
    this.base_url = base_url
    this.api_key = api_key

    this.cache = ''
    this.provider = 'Gemini'
  }

  _getRequestUrl(model, stream) {
    return `${this.base_url}/v1beta/${model}:${
      stream ? 'streamGenerateContent?alt=sse&' : 'generateContent?'
    }key=${this.api_key}`
  }

  async *chat(params, e = null) {
    const timeMetrics = {
      startTime: Date.now(),
      firstTokenTime: null,
      model: params.model,
      requestId: e?.requestId,
      userId: e?.user?.id,
      userIp: e?.user?.ip,
      contactorId: e?.body?.contactorId,
      presetName: e?.body?.settings?.presetSettings?.name,
      isStream: !!params.stream
    }
    const {
      model,
      messages,
      safetySettings,
      stream,
      tools,
      toolConfig,
      ...generationConfig
    } = params
    const controller = new AbortController()
    const signal = controller.signal

    if (e) {
      e.onAbort(() => controller.abort())
    }

    const url = this._getRequestUrl(model, stream)
    const headers = {
      'Content-Type': 'application/json',
    }
    const { systemInstruction, contents } =
      await this._preProcessMessage(messages)
    const body = {
      system_instruction: systemInstruction,
      generationConfig,
      safetySettings,
      contents,
      tools,
      toolConfig,
    }
    logger.json(body)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        signal,
      })
      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(errorBody)
      }
      if (stream) {
        yield* this._processStreamResponse(response, timeMetrics)
      } else {
        const data = await response.json()
        const usage = data.usageMetadata || data.response?.usageMetadata
        if (usage && usage.promptTokenCount !== undefined) {
          BaseLLMAdapter.prototype.logUsage(this.provider || 'Gemini', usage, timeMetrics)
        }
        yield data
      }
    } catch (error) {
      console.error('Error during chat:', error)
      throw error
    }
  }
  async *_processStreamResponse(response, timeMetrics) {
    const decoder = new TextDecoder()
    let buffer = ''
    if (!response.body) {
      throw new Error('Response body is null')
    }
    const reader = response.body.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (value && !timeMetrics.firstTokenTime) {
          timeMetrics.firstTokenTime = Date.now()
        }
        if (done) {
          // 看看还有没有value
          if (value) {
            // 解析和buffer
            buffer += decoder.decode(value, { stream: true })
            // 交给_parseMutiJson处理
            for (const jsonData of this._parseMutiJson(buffer, timeMetrics)) {
              yield jsonData
            }
          }
          break
        }
        buffer += decoder.decode(value, { stream: true })
        // 尝试解析 buffer 中的完整 JSON 对象
        try {
          for (const jsonData of this._parseMutiJson(buffer, timeMetrics)) {
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

  *_parseMutiJson(buffer, timeMetrics) {
    // 分割SSE事件并处理
    const lines = buffer.split(/\r\n|\n/).filter((line) => line.trim())

    for (const line of lines) {
      // 检查是否是data前缀
      if (line.startsWith('data: ')) {
        const jsonStr = line.substring(6).trim() // 去掉'data: '前缀

        try {
          const jsonData = JSON.parse(jsonStr)
          const usage = jsonData.usageMetadata || jsonData.response?.usageMetadata
          if (usage && usage.promptTokenCount !== undefined) {
            BaseLLMAdapter.prototype.logUsage(this.provider || 'Gemini', usage, timeMetrics)
          }
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
        const usage = cacheData.usageMetadata || cacheData.response?.usageMetadata
        if (usage && usage.promptTokenCount !== undefined) {
          BaseLLMAdapter.prototype.logUsage(this.provider || 'Gemini', usage, timeMetrics)
        }
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
      const errorBody = await response.text()
      let message = errorBody
      try {
        const json = JSON.parse(errorBody)
        message = json.error?.message || errorBody
      } catch {
        // ignore
      }
      throw new Error(message)
    } else {
      const avaliableModelNames = ['gemini', 'gemma']
      const disabledModelNames = ['computer', 'embedding', 'audio']
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
        .filter((model) => {
          for (const name of disabledModelNames) {
            if (model.id.includes(name)) {
              return false
            }
          }
          return true
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
              const url = element.image_url?.url || element.image_url
              if (typeof url === 'string' && url.startsWith('http')) {
                logger.error('暂不支持http图片')
              } else if (typeof url === 'string') {
                // 从base64中解析出type和data
                const base64 = url
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
            const thoughtSignature = toolCall.id
            try {
              args = JSON.parse(args)
            } catch {
              // 无事发生
            }
            // 如果id不能被base64解码，不添加thought_signature字段
            const callElm = {
              functionCall: {
                name,
                args,
              },
            }
            try {
              atob(thoughtSignature)
              callElm.thought_signature = thoughtSignature
            } catch {
              // 无事发生
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

export function logGeminiUsage(usage, timeMetrics) {
  BaseLLMAdapter.prototype.logUsage('Gemini', usage, timeMetrics)
}
