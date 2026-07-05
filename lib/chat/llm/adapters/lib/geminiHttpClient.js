/**
 * Gemini HTTP Client — 通用的 Gemini API HTTP 通信客户端
 *
 * 负责 Gemini 原生 API 的请求构建、SSE 流式读取和消息格式转换。
 * 被 GeminiAdapter / AgentPlatformAdapter / GeminiOauthAdapter 三个适配器共用。
 */

const log = logger

/** 应从模型列表中排除的名称关键词（即使支持 generateContent 但属于专用模型） */
const EXCLUDED_MODEL_KEYWORDS = ['tts', 'robotics', 'computer', 'lyria', 'antigravity']

/**
 * 过滤 Gemini 模型列表：通过 supportedGenerationMethods + 名称排除双层过滤
 * @param {Array<{id: string, supportedGenerationMethods?: string[]}>} models - 原始模型列表
 * @returns {Array<{id: string}>} 过滤后的模型列表
 */
export function filterGeminiModels(models) {
  return models
    .filter((model) => {
      // 必须支持 generateContent（文本生成/聊天）
      if (!model.supportedGenerationMethods?.includes('generateContent')) {
        return false
      }
      // 排除专用模型（TTS/机器人/电脑操控/音频/实验Agent）
      const id = model.id.toLowerCase()
      return !EXCLUDED_MODEL_KEYWORDS.some((kw) => id.includes(kw))
    })
    .map((model) => ({ id: model.id }))
}

export class Gemini {
  /**
   * @param {object} options
   * @param {string} options.base_url
   * @param {string} options.api_key
   * @param {function} [options.onUsage] - 用量上报回调，签名 (providerName, usage, timeMetrics) => void
   */
  constructor({ base_url, api_key, onUsage }) {
    this.base_url = base_url
    this.api_key = api_key
    this.onUsage = onUsage || null
    this.provider = 'Gemini'
  }

  /**
   * 获取额外的 HTTP 请求头（用于子类覆盖，如 Bearer token 认证）
   * @returns {object} 需要合并到 fetch headers 中的键值对
   */
  _getAuthHeaders() {
    return {}
  }

  _getRequestUrl(model, stream) {
    const modelPath = (model.startsWith('models/') || model.startsWith('tunedModels/'))
      ? model
      : `models/${model}`
    return `${this.base_url}/v1beta/${modelPath}:${
      stream ? 'streamGenerateContent?alt=sse&' : 'generateContent?'
    }key=${this.api_key}`
  }

  async *chat(params, e = null) {
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
    log.json(body)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await this._getAuthHeaders()) },
        body: JSON.stringify(body),
        signal,
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
    // cache 作为闭包局部对象，避免并发流之间的状态串扰
    // 使用对象包装使 _parseMultiJson 内对 cache 的修改能反映回此层
    const cacheHolder = { value: '' }
    if (!response.body) {
      throw new Error('Response body is null')
    }
    const reader = response.body.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          if (value) {
            buffer += decoder.decode(value, { stream: true })
            for (const jsonData of this._parseMultiJson(buffer, cacheHolder)) {
              yield jsonData
            }
          }
          break
        }
        buffer += decoder.decode(value, { stream: true })
        try {
          for (const jsonData of this._parseMultiJson(buffer, cacheHolder)) {
            yield jsonData
          }
          // 所有行已处理（无异常），清空 buffer 等待后续 chunk
          // 注意：cache 可能仍有未完成拼接的半截 JSON，不清空，留给下个 chunk
          buffer = ''
        } catch {
          log.error('解析JSON失败，保留 buffer 和 cache 等待后续 chunk')
        }
      }
    } catch (error) {
      console.error('Stream processing error:', error)
      throw error
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * 从 SSE 文本 buffer 中逐行提取 JSON 对象
   * 未完成拼接的行保留在 cacheHolder.value 中，供下次调用继续累积
   * @param {string} buffer - 当前接收到的原始文本
   * @param {{ value: string }} cacheHolder - 对象包装的缓存，使修改可回传
   * @returns {Generator<object>} 解析出的 JSON 对象
   */
  *_parseMultiJson(buffer, cacheHolder) {
    const lines = buffer.split(/\r\n|\n/).filter((line) => line.trim())

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.substring(6).trim()
        try {
          const jsonData = JSON.parse(jsonStr)
          yield jsonData
        } catch {
          cacheHolder.value += jsonStr
        }
      } else if (line.trim()) {
        cacheHolder.value += line
      }
      try {
        const cacheData = cacheHolder.value.startsWith('data: ')
          ? JSON.parse(cacheHolder.value.substring(6).trim())
          : JSON.parse(cacheHolder.value)
        yield cacheData
        cacheHolder.value = ''
      } catch {
        // still not valid JSON, wait for more data
      }
    }
  }

  async models() {
    const url = `${this.base_url}/v1beta/models?key=${this.api_key}`

    const response = await fetch(url, { method: 'GET' })

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
    }

    const res = await response.json()
    const { models } = res

    const mapped = models.map((model) => ({
      id: model.name.replace(/^models\//, ''),
      supportedGenerationMethods: model.supportedGenerationMethods,
    }))
    return filterGeminiModels(mapped)
  }

  /**
   * 将 OpenAI 格式的 messages 转换为 Gemini 原生格式 { systemInstruction, contents }
   */
  async _preProcessMessage(messages) {
    let systemInstruction = undefined
    let contents = []
    let toolCallResultsCache = []

    for (const [index, message] of messages.entries()) {
      if (message.role === 'system' || message.role === 'developer') {
        if (typeof message.content === 'string') {
          if (!systemInstruction) {
            systemInstruction = { parts: [{ text: message.content }] }
          } else {
            systemInstruction.parts.push({ text: message.content })
          }
        } else {
          log.error('system message content is not string')
        }
      } else if (message.role === 'user' || message.role === 'assistant') {
        const role = message.role === 'user' ? 'user' : 'model'
        const contentElement = { role, parts: [] }

        if (Array.isArray(message.content)) {
          for (const element of message.content) {
            if (element.type === 'text') {
              contentElement.parts.push({ text: element.text })
            } else if (element.type === 'image_url') {
              const url = element.image_url?.url || element.image_url
              if (typeof url === 'string' && url.startsWith('http')) {
                log.error('暂不支持http图片')
              } else if (typeof url === 'string') {
                const mime_type = url.split(';')[0].split(':')[1]
                const data = url.split(',')[1]
                contentElement.parts.push({ inline_data: { mime_type, data } })
              }
            }
          }
        }
        if (message.content && typeof message.content === 'string') {
          contentElement.parts.push({ text: message.content })
        }
        if (message.tool_calls) {
          for (const toolCall of message.tool_calls) {
            const name = toolCall.function.name
            let args = toolCall.function.arguments
            const toolCallId = toolCall.id
            if (typeof args === 'string') {
              try {
                args = JSON.parse(args)
              } catch {
                args = {}
              }
            }
            if (typeof args !== 'object' || args === null) {
              args = {}
            }
            const callElm = { functionCall: { name, args } }

            let parsedThoughtSignature = null
            let parsedFunctionCallId = null

            if (toolCallId && typeof toolCallId === 'string') {
              if (toolCallId.startsWith('gsig_')) {
                const parts = Buffer.from(toolCallId.substring(5), 'hex').toString().split('|')
                parsedThoughtSignature = parts[0] || null
                parsedFunctionCallId = parts[1] || null
              } else if (!toolCallId.startsWith('local_') && toolCallId.length > 50) {
                try {
                  const decoded = Buffer.from(toolCallId, 'base64').toString('base64')
                  if (decoded === toolCallId) {
                    parsedThoughtSignature = toolCallId
                  }
                } catch {
                  // ignore
                }
              } else {
                // 普通短 ID，直接透传（如 "DOuTz2vZ"）
                parsedFunctionCallId = toolCallId
              }
            }

            const isOauth = this.provider === 'Gemini OAuth' || (this.base_url && this.base_url.includes('mock'))

            if (parsedThoughtSignature) {
              callElm.thoughtSignature = parsedThoughtSignature
            }
            if (parsedFunctionCallId && isOauth) {
              callElm.functionCall.id = parsedFunctionCallId
            }

            contentElement.parts.push(callElm)
          }
        }
        // 跳过 parts 为空的 contentElement（如仅含 reasoning_content 的消息）
        if (contentElement.parts.length > 0) {
          contents.push(contentElement)
        }
      } else if (message.role === 'tool') {
        toolCallResultsCache.push(message)
        if (index + 1 < messages.length && messages[index + 1].role === 'tool') {
          continue
        } else {
          const contentElement = { role: 'user', parts: [] }
          for (const toolCallResult of toolCallResultsCache) {
            const responsePart = {
              functionResponse: {
                name: toolCallResult.name,
                response: {
                  name: toolCallResult.name,
                  content: toolCallResult.content,
                },
              },
            }
            const toolCallId = toolCallResult.tool_call_id
            let parsedThoughtSignature = null
            let parsedFunctionCallId = null

            if (toolCallId && typeof toolCallId === 'string') {
              if (toolCallId.startsWith('gsig_')) {
                const parts = Buffer.from(toolCallId.substring(5), 'hex').toString().split('|')
                parsedThoughtSignature = parts[0] || null
                parsedFunctionCallId = parts[1] || null
              } else if (!toolCallId.startsWith('local_') && toolCallId.length > 50) {
                try {
                  const decoded = Buffer.from(toolCallId, 'base64').toString('base64')
                  if (decoded === toolCallId) {
                    parsedThoughtSignature = toolCallId
                  }
                } catch {
                  // ignore
                }
              } else {
                // 普通短 ID，直接透传（如 "DOuTz2vZ"）
                parsedFunctionCallId = toolCallId
              }
            }

            const isOauth = this.provider === 'Gemini OAuth' || (this.base_url && this.base_url.includes('mock'))

            if (parsedFunctionCallId && isOauth) {
              responsePart.functionResponse.id = parsedFunctionCallId
            }
            contentElement.parts.push(responsePart)
          }
          contents.push(contentElement)
          toolCallResultsCache = []
        }
      } else {
        log.error(`Unknown role: ${message.role}`)
      }
    }

    return { systemInstruction, contents }
  }
}
