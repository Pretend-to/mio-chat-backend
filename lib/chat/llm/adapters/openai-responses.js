import BaseLLMAdapter from './base.js'
import OpenAI from 'openai'
import { imgUrlToBase64 } from '../../../../utils/imgTools.js'
import logger from '../../../../utils/logger.js'

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
      description: 'OpenAI 统一 Responses API (v1/responses)，支持高级代理功能与长文本状态保持',
      supportedFeatures: ['chat', 'streaming', 'function_calling', 'vision', 'reasoning'],
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
          label: 'Base URL',
        },
      },
      extraSettingsSchema: {
        openai: {
          web_search: {
            type: 'group',
            label: '联网搜索 (SearchGPT)',
            fields: {
              enable: { type: 'boolean', default: false, label: '启用' },
              search_context_size: {
                type: 'select',
                label: '搜索深度',
                default: 'medium',
                options: [
                  { label: '低', value: 'low' },
                  { label: '中', value: 'medium' },
                  { label: '高', value: 'high' }
                ]
              },
              allowed_domains: { type: 'array', default: [], label: '白名单域名', placeholder: 'openai.com' },
              blocked_domains: { type: 'array', default: [], label: '黑名单域名' }
            }
          },
          user_location: {
            type: 'group',
            label: '地理位置上下文',
            fields: {
              country: { type: 'string', label: '国家代码 (ISO)', placeholder: 'US' },
              region: { type: 'string', label: '地区/州', placeholder: 'California' },
              city: { type: 'string', label: '城市', placeholder: 'San Francisco' }
            }
          }
        }
      }
    }
  }

  constructor(openaiConfig) {
    super(openaiConfig)
    this.provider = 'openai'
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
    logger.info(`[${this.provider.toUpperCase()}-Responses] Entering _prepareChatBody`)
    const { messages, settings } = body
    const { base, chatParams, toolCallSettings } = settings

    // 1. 提取系统消息作为 instructions
    let instructions = ''
    const filteredMessages = []
    
    for (const msg of messages) {
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
    } else {
      parsedTools = []
    }

    // b. OpenAI 内置工具 (Responses API)
    const openaiExtra = extraSettings?.openai || {}
    if (openaiExtra.web_search?.enable) {
      const ws = openaiExtra.web_search
      parsedTools.push({
        type: 'web_search',
        web_search: {
          search_context_size: ws.search_context_size || 'medium',
          allowed_domains: ws.allowed_domains?.length > 0 ? ws.allowed_domains : undefined,
          blocked_domains: ws.blocked_domains?.length > 0 ? ws.blocked_domains : undefined,
        }
      })
    }

    // 4. 处理推理参数 (Reasoning Effort)
    const reasoningEffortMap = {
      '-1': undefined,
      0: undefined,
      1: 'low',
      2: 'medium',
      3: 'high',
    }

    // 组装最终请求体
    const preparedBody = {
      model: base.model,
      instructions: instructions || undefined,
      input: processedInput,
      stream: base.stream,
      tools: parsedTools.length > 0 ? parsedTools : undefined,
      tool_choice: (mode === 'ANY' && parsedTools.length > 0) ? 'required' : undefined,
    }

    // 处理地理位置
    if (openaiExtra.user_location) {
      const loc = openaiExtra.user_location
      if (loc.country || loc.city) {
        preparedBody.user_location = {
          country: loc.country || undefined,
          region: loc.region || undefined,
          city: loc.city || undefined,
        }
      }
    }

    // 选择性地添加参数，只有当它们不是默认值时才发送，以避免 API 报错
    if (chatParams.temperature !== undefined && chatParams.temperature !== 1) {
      preparedBody.temperature = chatParams.temperature
    }
    if (chatParams.top_p !== undefined && chatParams.top_p !== 1) {
      preparedBody.top_p = chatParams.top_p
    }
    if (chatParams.frequency_penalty !== undefined && chatParams.frequency_penalty !== 0) {
      preparedBody.frequency_penalty = chatParams.frequency_penalty
    }
    if (chatParams.presence_penalty !== undefined && chatParams.presence_penalty !== 0) {
      preparedBody.presence_penalty = chatParams.presence_penalty
    }
    if (chatParams.max_tokens !== undefined) {
      preparedBody.max_output_tokens = chatParams.max_tokens // Responses API 使用 max_output_tokens
    }

    // 映射旧参数到新 API (如果需要)
    if (chatParams.reasoning_effort !== undefined && chatParams.reasoning_effort !== -1) {
      preparedBody.reasoning = {
        effort: reasoningEffortMap[chatParams.reasoning_effort] || 'none'
      }
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
   * 执行 Responses API 请求
   */
  async _executeChatRequest(body, e) {
    const enableStream = body.stream ?? true
    let callMessage = { tool_calls: [] }
    let cachedContent = ''

    logger.info(`[${this.provider.toUpperCase()}-Responses] Request Body: ${JSON.stringify(body, null, 2)}`)

    try {
      if (enableStream) {
        const controller = new AbortController()
        e.onAbort(() => controller.abort())

        // 使用新的 responses.create
        const stream = await this.openai.responses.create(body, {
          signal: controller.signal,
        })
        
        logger.info(`[${this.provider.toUpperCase()}-Responses] Stream object type: ${typeof stream}, ${!!stream[Symbol.asyncIterator]}`)
        
        e.client.pushConnection(e.requestId, stream)
        e.pending()

        for await (const chunk of stream) {
          if (e.aborted) break
          
          logger.info(`[${this.provider.toUpperCase()}-Responses] Chunk: ${JSON.stringify(chunk)}`)

          const { type } = chunk

          // 1. 处理文本增量
          if (type === 'response.output_text.delta') {
            e.update({ type: 'content', content: chunk.delta })
            cachedContent += chunk.delta
          }
          // 2. 处理推理增量
          else if (type === 'response.output_reasoning.delta') {
            e.update({ type: 'reasoningContent', content: chunk.delta })
          }
          // 3. 处理工具调用开始 (output_item.added)
          else if (type === 'response.output_item.added' && chunk.item?.type === 'function_call') {
            const item = chunk.item
            const existingCall = {
              index: chunk.output_index,
              id: item.id,
              function: { name: item.name, arguments: '' }
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
          // 4. 处理工具调用参数增量 (output_item.delta)
          else if (type === 'response.output_item.delta' && chunk.delta) {
            const existingCall = callMessage.tool_calls.find(c => c.index === chunk.output_index)
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
        }

      if (callMessage.tool_calls.length > 0) {
        if (cachedContent) {
          e.body.messages.push({ role: 'assistant', content: cachedContent })
        }
        return { toolCalls: callMessage.tool_calls }
      }
    } else {
      // 非流式处理
      const controller = new AbortController()
      e.onAbort(() => controller.abort())

      const response = await this.openai.responses.create(body, {
        signal: controller.signal,
      })

      const toolCalls = []
      for (const out of response.output) {
        if (out.type === 'text') {
          e.update({ type: 'content', content: out.text })
        } else if (out.type === 'reasoning') {
          e.update({ type: 'reasoningContent', content: out.reasoning })
        } else if (out.type === 'tool_call') {
          toolCalls.push(out.tool_call)
        }
      }

      if (toolCalls.length > 0) {
        return { toolCalls }
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
   */
  async _handleToolCalls(toolCalls, e) {
    if (!e.body.messages) e.body.messages = []

    let callMessage = { role: 'assistant', tool_calls: toolCalls }
    callMessage.tool_calls.forEach((item) => {
      item.id = item.id || this._getRandomCallId()
    })
    e.body.messages.push(callMessage)

    const tasks = []
    for (const call of toolCalls) {
      if (e.aborted) break
      const toolCall = call.function
      const toolCallData = {
        name: toolCall.name,
        id: call.id,
        action: 'running',
        parameters: toolCall.arguments,
        result: '',
      }
      e.update({ type: 'toolCall', content: toolCallData })
      
      const runTask = async () => {
        try {
          const toolResult = await middleware.llm.runTool(toolCallData, e.user, e)
          const { result } = toolResult
          
          e.body.messages.push({
            tool_call_id: call.id,
            role: 'tool',
            name: toolCall.name,
            content: JSON.stringify(result),
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
    await this.handleChatRequest(e, false)
  }
}
