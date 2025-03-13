/* eslint-disable camelcase */
/* eslint-disable no-unsafe-optional-chaining */
import OpenAI from 'openai'
import config from '../config.js'
import { imgUrlToBase64 } from '../../utils/imgTools.js'

/**
 * @class OpenAI Bot 实现
 */
class OpenAIBot {
  /**
   * 构造函数
   * @param {string} baseUrl - OpenAI API 的基础 URL
   * @param {string} apiKey - OpenAI API 的密钥
   * @throws {Error} 如果 baseUrl 或 apiKey 缺失，则抛出错误
   */
  constructor(baseUrl, apiKey) {
    if (!baseUrl || !apiKey) {
      throw new Error('Missing required parameters: baseUrl or apiKey')
    }

    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.openai = new OpenAI({ baseURL: baseUrl, apiKey })
    this.models = [] // 可用模型列表
    this.guestModels = [] // 访客可用的模型列表
  }

  /**
   * 初始化模型列表
   * @returns {Promise<object>} 包含模型和所有者数量的对象
   * @throws {Error} 如果获取模型列表失败，则抛出错误
   */
  async initModels() {
    try {
      this.models = await this.getModels()
      this.guestModels = this._filterGuestModels()

      return {
        ownerCount: this.models.length,
        modelsCount: this._calculateTotalModels(this.models),
        guestOwnerCount: this.guestModels.length,
        guestModelsCount: this._calculateTotalModels(this.guestModels),
      }
    } catch (error) {
      logger.error('Failed to initialize models:', error)
      throw error // 重新抛出错误，以便上层处理
    }
  }

  /**
   * 从 OpenAI API 获取模型列表
   * @returns {Promise<Array<object>>} 格式化后的模型列表
   * @throws {Error} 如果获取模型列表失败，则抛出错误
   */
  async getModels() {
    try {
      const list = await this.openai.models.list()
      const ownerList = config.openai.owners // 假设 owners 是一个配置数组
      let modelList = this._groupModelsByOwner(list.data, ownerList)
      return this._sortModelList(modelList)
    } catch (error) {
      logger.error('Failed to get models:', error)
      throw error
    }
  }

  /**
   * 处理聊天请求
   * @param {object} e - 事件对象，包含聊天请求的详细信息
   * @param {boolean} [firstCall=true] - 是否是第一次调用（用于递归调用）
   */
  async chat(e, firstCall = true) {
    try {
      const processedBody = await this._prepareChatBody(e.body)
      const response = await this._executeChatRequest(processedBody, e)

      if (response.toolCalls) {
        await this._handleToolCalls(response.toolCalls, e)
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
   * 根据配置过滤访客可用的模型
   * @private
   * @returns {Array<object>} 过滤后的访客模型列表
   */
  _filterGuestModels() {
    const guestConfig = config.openai.guest_models || {}
    return this.models.reduce((acc, item) => {
      const allowedModels = this._filterAllowedModels(item.models, guestConfig)
      if (allowedModels.length > 0) {
        acc.push({ owner: item.owner, models: allowedModels })
      }
      return acc
    }, [])
  }

  /**
   * 过滤允许的模型列表
   * @private
   * @param {Array<string>} models - 要过滤的模型名称列表
   * @param {object} guestConfig - 访客模型的配置
   * @returns {Array<string>} 允许的模型名称列表
   */
  _filterAllowedModels(models, guestConfig) {
    return models.filter((modelName) =>
      this._isModelAllowed(modelName, guestConfig)
    )
  }

  /**
   * 检查模型是否被允许
   * @private
   * @param {string} modelName - 要检查的模型名称
   * @param {object} guestConfig - 访客模型的配置
   * @returns {boolean} 如果模型被允许，则返回 true，否则返回 false
   */
  _isModelAllowed(modelName, guestConfig) {
    const { keywords = [], full_name = [] } = guestConfig
    return (
      keywords.some((keyword) => modelName.includes(keyword)) ||
      full_name.some((name) => modelName === name)
    )
  }

  /**
   * 计算模型列表中的模型总数
   * @private
   * @param {Array<object>} modelList - 模型列表
   * @returns {number} 模型总数
   */
  _calculateTotalModels(modelList) {
    return modelList.reduce((acc, cur) => acc + cur.models.length, 0)
  }

  /**
   * 根据所有者对模型进行分组
   * @private
   * @param {Array<object>} models - 从 API 获取的模型数据
   * @param {Array<object>} ownerList - 所有者列表
   * @returns {Array<object>} 按所有者分组的模型列表
   */
  _groupModelsByOwner(models, ownerList) {
    return models.reduce((acc, model) => {
      const owner = this._determineModelOwner(model.id, ownerList)
      const existingOwner = acc.find((item) => item.owner === owner)

      if (existingOwner) {
        existingOwner.models.push(model.id)
      } else {
        acc.push({ owner, models: [model.id] })
      }
      return acc
    }, [])
  }

  /**
   * 确定模型的所有者
   * @private
   * @param {string} modelId - 模型 ID
   * @param {Array<object>} ownerList - 所有者列表
   * @returns {string} 模型的所有者
   */
  _determineModelOwner(modelId, ownerList) {
    const modelIdLower = modelId.toLowerCase()
    const matchedOwner = ownerList.find(({ keywords }) =>
      keywords.some((keyword) => modelIdLower.includes(keyword))
    )
    return matchedOwner?.owner || 'Custom'
  }

  /**
   * 对模型列表进行排序（字母表降序，"Custom" 最后）
   * @private
   * @param {Array<object>} modelList - 模型列表
   * @returns {Array<object>} 排序后的模型列表
   */
  _sortModelList(modelList) {
    return modelList.sort((a, b) => {
      if (a.owner === 'Custom') return 1
      if (b.owner === 'Custom') return -1
      return b.owner.localeCompare(a.owner)
    })
  }

  /**
   * 准备聊天请求的主体
   * @param {object} body
   * @returns {object}
   */
  async _prepareChatBody(body) {
    const processedMessages = await this._processMessages(body.messages)
    const tools = this._getFormattedTools(body)
    return {
      ...body,
      messages: processedMessages,
      tools: tools,
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
              image_url: { url: base64 },
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
   * 获取格式化后的工具配置
   * @private
   * @param {object} body - 请求体
   * @returns {object|null} 格式化后的工具配置，如果没有工具则返回 null
   */
  _getFormattedTools(body) {
    // 假设middleware.getOpenaiTools存在，且根据tools获取openai可以使用的工具
    if (body.tools?.length > 0) {
      return middleware.getOpenaiTools(body.tools)
    }
    return null
  }

  /**
   * 生成随机的调用 ID
   * @private
   * @returns {string} 随机的调用 ID
   */
  _getRandomCallId() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    )
  }

  /**
   * 执行聊天请求
   * @param {object} body
   * @param {object} e
   * @returns {object}
   */
  async _executeChatRequest(body, e) {
    const enableStream = body.stream || false
    let callMessage = {}
    let cachedMessage = {
      role: 'assistant',
      content: '',
    }

    if (enableStream) {
      const stream = await this.openai.chat.completions.create(body)
      e.server.pushConnection(e.request_id, stream)
      e.pending()

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta

        if (delta?.reasoning_content) {
          e.update('', null, delta.reasoning_content)
        } else if (delta?.content) {
          e.update(delta.content, null)
          cachedMessage.content += delta.content
        } else if (delta?.tool_calls) {
          if (Object.keys(callMessage).length === 0) {
            callMessage = { ...delta }
            callMessage.tool_calls.forEach((item) => {
              // 使用 forEach 替代 map
              e.update('', {
                name: item.function.name,
                id: item.id,
                action: 'started',
                params: '',
                result: '',
              })
            })
          }

          for (const functionCall of delta.tool_calls) {
            const call = callMessage.tool_calls.find(
              (c) => c.index === functionCall.index
            )
            if (call && functionCall?.function?.arguments) {
              call.function.arguments +=
                functionCall.function.arguments === call.function.arguments
                  ? ''
                  : functionCall.function.arguments
              e.update('', {
                name: call.function.name,
                id: call.id,
                action: 'pending',
                params: functionCall.function.arguments || '',
                result: '',
              })
            }
          }
        }
      }

      console.log(callMessage)

      // 在流式循环结束后，检查是否有工具需要调用
      if (
        callMessage &&
        callMessage.tool_calls &&
        callMessage.tool_calls.length > 0
      ) {
        if(cachedMessage.content) {
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
        e.update(message?.content, null, message?.reasoning_content)
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
      e.update('', {
        name: toolCall.name,
        id: call.id,
        action: 'running',
        params: toolCall.arguments,
        result: '',
      })
      logger.info(`执行工具：${toolCall.name}，参数：${toolCall.arguments}`)
      logger.debug(JSON.stringify(toolCall, null, 2))

      // 假设middleware.runTool存在，tool_call包含name和arguments, user是用户信息
      const toolResult = await middleware.runTool(toolCall, e.user)
      logger.info(`运行结果：${JSON.stringify(toolResult)}`)

      e.body.messages.push({
        tool_call_id: call.id,
        role: 'tool',
        name: toolCall.name,
        content: JSON.stringify(toolResult),
      })
      e.update('', {
        name: toolCall.name,
        id: call.id,
        action: 'finished',
        params: toolCall.arguments,
        result: toolResult,
      })
    }
    // 递归调用 chat 方法来处理工具调用的结果
    await this.chat(e, false)
  }
}

// 创建 OpenAIBot 实例
const { base_url, api_key } = config.openai
const openai = new OpenAIBot(base_url, api_key)

export default openai
