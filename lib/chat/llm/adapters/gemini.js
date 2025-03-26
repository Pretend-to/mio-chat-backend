/* eslint-disable camelcase */
/* eslint-disable no-unsafe-optional-chaining */
import BaseLLMAdapter from './base.js'
import { imgUrlToBase64, base64ToImageUrl } from '../../../../utils/imgTools.js'

/**
 * @class OpenAI Bot 实现
 */
export default class OpenAIBot extends BaseLLMAdapter {
  /**
   * 构造函数
   * @param {string} baseUrl - OpenAI API 的基础 URL
   * @param {string} apiKey - OpenAI API 的密钥
   * @throws {Error} 如果 baseUrl 或 apiKey 缺失，则抛出错误
   */
  constructor(geminiConfig) {
    super(geminiConfig)
    this.provider = 'gemini'
  }

  get gemini() {
    const { base_url, api_key } = this.config
    // 以,为分隔符切割key列表
    const apiKeys = api_key.split(',')
    // 随机选择一个key
    const selectedKey = apiKeys[Math.floor(Math.random() * apiKeys.length)]
    // 日志用的哪个
    logger.info(
      `使用Gemini API：${base_url} , 第${apiKeys.indexOf(selectedKey) + 1}个key`
    )

    return new Gemini({ base_url, api_key: selectedKey })
  }

  /**
   * 处理聊天请求
   * @param {object} e - 事件对象，包含聊天请求的详细信息
   * @param {boolean} [firstCall=true] - 是否是第一次调用（用于递归调用）
   */
  async handleChatRequest(e, firstCall = true) {
    try {
      const processedBody = await this._prepareChatBody(e.body)
      // logger.json(processedBody)
      const response = await this._executeChatRequest(processedBody, e)

      if (response.toolCall) {
        // 重置工具模式，防止无限调用
        e.body.settings.toolCallSettings.mode = 'AUTO'

        await this._handleToolCalls(response.toolCall, e)
      }

      if (firstCall) e.complete()
    } catch (error) {
      e.error(error) //直接抛出，让调用方处理
    } finally {
      e.server.popConnection(e.request_id)
    }
  }

  // ---------------------- 私有辅助方法 ----------------------

  /**
   * 从 OpenAI API 获取模型列表
   * @returns {Promise<Array<object>>} 格式化后的模型列表
   * @throws {Error} 如果获取模型列表失败，则抛出错误
   */
  async _getModels() {
    try {
      const list = await this.gemini.models()
      let modelList = this._groupModelsByOwner(list.data, this.owners)
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
    let callMessage = null
    let cachedMessage = {
      role: 'assistant',
      content: '',
    }

    const stream = this.gemini.chat(body)
    e.server.pushConnection(e.request_id, stream)

    for await (const chunk of stream) {
      const delta = chunk.candidates[0].content
      if (delta) {
        for (const elem of delta.parts) {
          if (elem.text) {
            e.update({
              type: 'content',
              content: elem.text,
            })
            cachedMessage.content += delta.content
          } else if (elem.functionCall) {
            // 暂时不考虑多函数同时调用
            callMessage = elem
            callMessage.id = this._getRandomCallId()
            const toolCallData = {
              name: callMessage.functionCall.name,
              action: 'started',
              id: callMessage.id,
              params: callMessage.functionCall.args || '',
              result: '',
            }
            e.update({
              type: 'toolCall',
              content: toolCallData,
            })
          } else if (elem.inlineData) {
            // 生成了媒体 Blob
            const { data } = elem.inlineData

            const imageUrl = await base64ToImageUrl('', data)
  
            e.update({
              type: 'content',
              content: `\n![图片](${imageUrl})\n`,
            })
          }
        }
      } else {
        if (chunk.candidates[0].finishReason) {
          const stopTip = `\n\n本次对话已被强制结束，结束原因：${chunk.candidates[0].finishReason}`
          const safetyRatingBlock = '\n```json\n' + JSON.stringify(chunk.candidates[0].safetyRatings, null, 2) + '\n```\n'
          const safetyRatingTip = `\n\n本次对话的安全评级为：${safetyRatingBlock}`
          e.update({
            type: 'content',
            content: stopTip + safetyRatingTip, 
          })
        }
      }
    }

    // 在流式循环结束后，检查是否有工具需要调用
    if (callMessage) {
      if (cachedMessage.content) {
        e.body.messages.push(cachedMessage)
      }
      return { toolCall: callMessage }
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
    const { base, chatParams, toolCallSettings, safetySettings } = settings

    const { tools, mode } = toolCallSettings
    let parsedTools = {}
    if (mode !== 'NONE' && tools?.length > 0) {
      parsedTools = this._getFormattedTools(tools)
      parsedTools = {
        function_declarations: parsedTools,
      }
    } else if (mode !== 'NONE' && tools?.length === 0) {
      // 开启内置搜索
      if (base.model == 'models/gemini-2.0-flash') {
        parsedTools.google_search = {}
      }
    }

    const parsedSafeSettings = []

    Object.keys(safetySettings).forEach((key) => {
      parsedSafeSettings.push({
        category: key,
        threshold: safetySettings[key],
      })
    })

    const tool_config = {
      function_calling_config: {
        mode,
        allowed_function_names: mode === 'ANY' ? tools : undefined,
      },
    }

    // 开启图像生成
    let imgGenAvaliable = false
    const avaliableModels = ['gemini-2.0-flash-exp']
    for (const model of avaliableModels) {
      if (base.model.includes(model)) {
        imgGenAvaliable = true
        break
      } 
    }
    if (imgGenAvaliable) {
      chatParams.response_modalities=['Text', 'Image']
    }

    const preparedBody = {
      ...chatParams,
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
  async _handleToolCalls(toolCall, e) {
    if (!e.body.messages) {
      e.body.messages = [] // 确保 e.body.messages 存在
    }

    Gemini.pushToolCallMessage(e.body.messages, toolCall)

    const call = {
      ...toolCall.functionCall,
      arguments: JSON.stringify(toolCall.functionCall.args),
    }

    const toolCallData = {
      name: call.name,
      action: 'running',
      id: toolCall.id,
      params: call.args,
      result: '',
    }
    e.update({
      type: 'toolCall',
      content: toolCallData,
    })
    logger.info(`执行工具：${call.name}，参数：${call.arguments}`)
    logger.debug(JSON.stringify(toolCall, null, 2))

    // 假设middleware.runTool存在，tool_call包含name和arguments, user是用户信息
    const toolResult = await middleware.llm.runTool(call, e.user)
    logger.info(`运行结果：${JSON.stringify(toolResult)}`)

    e.body.messages.push({
      tool_call_id: toolCall.id,
      role: 'tool',
      name: toolCall.functionCall.name,
      content: JSON.stringify(toolResult),
    })
    toolCallData.result = toolResult
    toolCallData.action = 'finished'
    e.update({
      type: 'toolCall',
      content: toolCallData,
    })

    // 递归调用 handleChatRequest 方法来处理工具调用的结果
    await this.handleChatRequest(e, false)
  }
}

class Gemini {
  constructor({ base_url, api_key }) {
    if (!base_url || !api_key) {
      throw new Error('base_url and api_key are required')
    }
    this.base_url = base_url
    this.api_key = api_key
  }

  async *chat({
    model,
    messages,
    temperature,
    response_modalities,
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
    const generationConfig = { temperature, response_modalities }
    const { systemInstruction, contents } = await this._preProcessMessage(
      messages
    )
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
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorBody}`
        )
      }
      if (stream) {
        yield* this._processStreamResponse(response)
      } else {
        const data = await response.json()
        logger.json(data)
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
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        // 尝试解析 buffer 中的完整 JSON 对象
        try {
          for (const jsonData of this._parseMutiJson(buffer)) {
            yield jsonData
          }
          buffer = '' // 清空 buffer
        } catch (error) {
          // JSON 不完整，继续累积 buffer
          continue
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
    // 分割每个 SSE 事件，处理 \r\n\r\n 或 \n\n 两种可能的分隔符
    const events = buffer.split(/\r\n\r\n|\n\n/)
    
    for (const event of events) {
      if (event.trim() === '') continue
      
      // 处理可能包含多个 'data: ' 前缀的情况
      const dataLines = event.split(/\r\n|\n/)
      
      for (const line of dataLines) {
        if (!line.startsWith('data: ')) continue
        
        // 删除前缀 'data: '
        const data = line.replace(/^data: /, '').trim()
        
        try {
          // 尝试解析 JSON
          console.log(data)
          const jsonData = JSON.parse(data)
          yield jsonData
        } catch (error) {
          // 解析失败，可能是不完整的 JSON，继续处理下一行
          continue
        }
      }
    }
  }

  async models() {
    const url = 'https://gemini.ikechan8370.com/v1beta/openai/models'

    // const url = `${this.base_url}/v1beta/openai/models`
    const headers = {
      Authorization: `Bearer ${this.api_key}`,
    }
    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    })

    if (!response.ok) {
      const errorBody = await response.text() // Or response.json() if API returns JSON error
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${errorBody}`
      )
    } else {
      const data = await response.json()
      // 过滤不可用模型
      const avaliableModelNames = ['gemini-2.', 'gemini-1.5']
      data.data = data.data.filter((model) => {
        for (const name of avaliableModelNames) {
          if (model.id.includes(name)) {
            return true
          }
        }
      })
      return data
    }

  }

  async _preProcessMessage(messages) {
    let systemInstruction = undefined
    let contents = []
    for (const message of messages) {
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
            const callElm = {
              functionCall: {
                name: toolCall.function.name,
                args: toolCall.function.arguments,
              },
            }
            contentElement.parts.push(callElm)
          }
        }
        contents.push(contentElement)
      } else if (message.role === 'tool') {
        // 处理工具消息
        const contentElement = {
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: message.name,
                response: {
                  name: message.name,
                  content: message.content,
                },
              },
            },
          ],
        }
        contents.push(contentElement)
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
  static pushToolCallMessage(messages, res) {
    const tool_calls = [
      {
        id: res.id,
        type: 'function',
        function: {
          name: res.functionCall.name,
          arguments: res.functionCall.args,
        },
      },
    ]
    messages.push({
      role: 'assistant',
      content: null,
      tool_calls,
    })
  }
}
