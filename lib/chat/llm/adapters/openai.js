/* eslint-disable camelcase */
/* eslint-disable no-unsafe-optional-chaining */
import BaseLLMAdapter from './base.js'
import OpenAI from 'openai'
import { imgUrlToBase64 } from '../../../../utils/imgTools.js'

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
  constructor(openaiConfig) {
    super(openaiConfig)
    this.provider = 'openai'
  }

  get openai() {
    const { base_url, api_key } = this.config
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
      const list = await this.openai.models.list()
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
      } else if (message.role === 'assistant' && message.tool_calls) {
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
              } catch (err) {
                // pass
              }
            }
          }
          processedToolCalls.push(toolCall)
        }
        processed.push({ ...message, tool_calls: processedToolCalls })
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

      for await (const chunk of stream) {
        if (
          !chunk.choices ||
          !Array.isArray(chunk.choices) ||
          !chunk.choices.length > 0
        ) {
          continue
        }
        const delta = chunk.choices[0]?.delta

        if (delta?.reasoning_content) {
          e.update({
            type: 'reasoningContent',
            content: delta.reasoning_content,
          })
        } else if (delta?.content) {
          e.update({
            type: 'content',
            content: delta.content,
          })
          cachedMessage.content += delta.content
        } else if (delta?.tool_calls) {
          if (Object.keys(callMessage).length === 0) {
            callMessage = { ...delta }
            callMessage.tool_calls.forEach((item) => {
              // 使用 forEach 替代 map

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
              call.function.arguments +=
                functionCall.function.arguments === call.function.arguments
                  ? ''
                  : functionCall.function.arguments
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
