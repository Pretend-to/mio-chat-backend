/* eslint-disable camelcase */
import OpenAIBot from './openai.js'
import logger from '../../../../utils/logger.js'

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
      requiresSpecialAuth: false, // 标准 API Key 认证
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
    const enableStream = body.stream ?? true
    let callMessage = {}
    let cachedMessage = {
      role: 'assistant',
      content: '',
      reasoning_content: '', // DeepSeek: 在 cachedMessage 中添加 reasoning_content 字段
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
        }
        // DeepSeek 不支持 images，注释掉
        // else if (delta?.images) {
        //   ...
        // }
      }

      // 在流式循环结束后，检查是否有工具需要调用
      if (
        callMessage &&
        callMessage.tool_calls &&
        callMessage.tool_calls.length > 0
      ) {
        // DeepSeek: 将 cachedMessage (包含 content 和 reasoning_content) push 到消息列表
        if (cachedMessage.reasoning_content) {
          e.body.extraCachedReasoningContent = cachedMessage.reasoning_content
        }
        return { toolCalls: callMessage.tool_calls }
      }
    } else {
      // 非流式处理
      const completion = await this.openai.chat.completions.create(body)
      const message = completion.choices[0].message

      if (message?.tool_calls?.length > 0) {
        // DeepSeek: 非流式时也需要缓存并添加到消息
        const messageToAdd = { role: 'assistant' }
        if (message.content) {
          messageToAdd.content = message.content
          e.update({
            type: 'content',
            content: message.content,
          })
        }
        if (message.reasoning_content) {
          messageToAdd.reasoning_content = message.reasoning_content
          e.update({
            type: 'reasoningContent',
            content: message.reasoning_content,
          })
        }
        if (messageToAdd.content || messageToAdd.reasoning_content) {
          e.body.messages.push(messageToAdd)
        }
        return { toolCalls: message.tool_calls }
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

  async _handleToolCalls(toolCalls, e) {
    if (!e.body.messages) {
      e.body.messages = [] // 确保 e.body.messages 存在
    }

    let callMessage = { role: 'assistant', tool_calls: toolCalls }

    callMessage.tool_calls.forEach((item) => {
      // 使用 forEach 避免不必要的返回值
      item.id = item.id || this._getRandomCallId()
    })

    if (e.body.extraCachedReasoningContent) {
      callMessage.reasoning_content = e.body.extraCachedReasoningContent
      delete e.body.extraCachedReasoningContent
    }

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
