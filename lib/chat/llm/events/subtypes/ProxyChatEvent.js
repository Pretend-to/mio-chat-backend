/**
 * lib/chat/llm/events/subtypes/ProxyChatEvent.js
 * HTTP API 代理专用领域事件：承接 /oai-proxy 的 SSE 流与 JSON 响应
 */

import { ChatEvent } from '../ChatEvent.js'
import logger from '../../../../../utils/logger.js'
import { parseErrorDetails } from '../../../../../utils/errorFormatter.js'

export class ProxyChatEvent extends ChatEvent {
  /**
   * @param {object} params
   * @param {import('express').Response} params.res Express Response 对象
   * @param {boolean} params.isStream 是否流式输出
   * @param {string} params.modelName 模型名称
   * @param {Function} params.chunkFormatter OpenAI Chunk 格式化函数
   * @param {Function} params.responseFormatter OpenAI 非流式响应格式化函数
   * @param {Function} params.usageBuilder Usage 转换函数
   */
  constructor(params) {
    super(params)

    this.res = params.res
    this.isStream = Boolean(params.isStream)
    this.modelName = params.modelName || 'unknown'
    this.chunkFormatter = params.chunkFormatter
    this.responseFormatter = params.responseFormatter
    this.usageBuilder = params.usageBuilder

    this.accumulatedContent = ''
    this.accumulatedReasoning = ''
    this.capturedToolCalls = null
    this.sentToolCallArgs = new Map()
    this.toolCallIndices = new Map()
    this.firstChunkSent = false
  }

  update(data) {
    if (!data) return

    if (data.type === 'usage') {
      this.lastUsage = data.content
    }

    if (this.isStream) {
      if (!this.firstChunkSent) {
        this.firstChunkSent = true
        this.res.setHeader('Content-Type', 'text/event-stream')
        this.res.setHeader('Cache-Control', 'no-cache')
        this.res.setHeader('Connection', 'keep-alive')
        if (typeof this.res.flushHeaders === 'function') {
          this.res.flushHeaders()
        }

        const initialChunk = this.chunkFormatter(this.requestId, this.modelName, null, null)
        if (initialChunk.choices?.[0]?.delta) {
          initialChunk.choices[0].delta.role = 'assistant'
        }
        this.res.write(`data: ${JSON.stringify(initialChunk)}\n\n`)
      }

      if (data.type === 'content' && typeof data.content === 'string') {
        const chunk = this.chunkFormatter(this.requestId, this.modelName, data.content, null)
        this.res.write(`data: ${JSON.stringify(chunk)}\n\n`)
      } else if (data.type === 'reasoningContent' && typeof data.content === 'string') {
        const chunk = this.chunkFormatter(this.requestId, this.modelName, null, data.content)
        this.res.write(`data: ${JSON.stringify(chunk)}\n\n`)
      } else if (data.type === 'toolCall' && data.content) {
        // 工具调用流式增量协议
        const tc = data.content
        const callId = tc.id || 'call_default'

        if (!this.toolCallIndices.has(callId)) {
          this.toolCallIndices.set(callId, this.toolCallIndices.size)
        }
        const index = this.toolCallIndices.get(callId)
        const fullArgs = typeof tc.parameters === 'string' ? tc.parameters : JSON.stringify(tc.parameters || {})
        const prevArgs = this.sentToolCallArgs.get(callId) || ''
        let deltaArgs = fullArgs
        if (prevArgs && fullArgs.startsWith(prevArgs)) {
          deltaArgs = fullArgs.slice(prevArgs.length)
        }
        this.sentToolCallArgs.set(callId, fullArgs)

        // 如果没有新的 delta 且我们已经发送过内容，则跳过此包
        if (deltaArgs === '' && prevArgs !== '') {
          return
        }

        const isFirstForThisCall = !prevArgs
        const deltaToolCall = {
          function: {
            arguments: deltaArgs,
            ...(isFirstForThisCall && tc.name ? { name: tc.name } : {}),
          },
          index,
          type: 'function',
          ...(isFirstForThisCall ? { id: callId } : {}),
        }

        const chunk = this.chunkFormatter(this.requestId, this.modelName, null, null, null, [deltaToolCall])
        this.res.write(`data: ${JSON.stringify(chunk)}\n\n`)
      }
    } else {
      // 非流式累积
      if (data.type === 'content' && typeof data.content === 'string') {
        this.accumulatedContent += data.content
      } else if (data.type === 'reasoningContent' && typeof data.content === 'string') {
        this.accumulatedReasoning += data.content
      } else if (data.type === 'toolCall' && data.content) {
        if (!this.capturedToolCalls) this.capturedToolCalls = []
        this.capturedToolCalls.push(data.content)
      }
    }
  }

  complete() {
    if (this.completed) return
    super.complete()

    if (this.isStream) {
      const hasTools =
        (this.capturedToolCalls && this.capturedToolCalls.length > 0) ||
        (this.toolCallIndices && this.toolCallIndices.size > 0)
      const finishReason = hasTools ? 'tool_calls' : 'stop'
      const finalChunk = this.chunkFormatter(this.requestId, this.modelName, null, null, finishReason)
      this.res.write(`data: ${JSON.stringify(finalChunk)}\n\n`)

      if (this.lastUsage && this.usageBuilder) {
        const usageChunk = this.chunkFormatter(this.requestId, this.modelName, null, null, null)
        usageChunk.choices = []
        usageChunk.usage = this.usageBuilder(this.lastUsage)
        this.res.write(`data: ${JSON.stringify(usageChunk)}\n\n`)
      }

      this.res.write('data: [DONE]\n\n')
      this.res.end()
    } else {
      const response = this.responseFormatter(
        this.requestId,
        this.modelName,
        this.accumulatedContent,
        this.accumulatedReasoning,
        this.capturedToolCalls,
      )

      if (this.lastUsage && this.usageBuilder) {
        response.usage = this.usageBuilder(this.lastUsage)
      }

      this.res.status(200).json(response)
    }
  }

  error(err) {
    if (this.completed) return
    super.error(err)
    logger.error(`[ProxyChatEvent] API 代理请求发生错误:`, err)

    const parsed = parseErrorDetails(err)
    const rawStatus = Number(
      parsed.status || (typeof parsed.code === 'number' ? parsed.code : null),
    )
    const httpStatus = rawStatus >= 400 && rawStatus < 600 ? rawStatus : 500

    const errorPayload = {
      error: {
        code: typeof parsed.code === 'string' ? parsed.code : 'adapter_error',
        message: parsed.message || err.message || '大模型服务商接口响应出错',
        param: null,
        type: httpStatus >= 500 ? 'api_error' : 'invalid_request_error',
      },
    }

    if (!this.res.headersSent) {
      this.res.status(httpStatus).json(errorPayload)
    } else {
      this.res.write(`data: ${JSON.stringify(errorPayload)}\n\n`)
      this.res.write('data: [DONE]\n\n')
      this.res.end()
    }
  }
}
