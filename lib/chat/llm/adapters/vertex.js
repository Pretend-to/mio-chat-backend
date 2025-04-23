import GeminiAdapter from './gemini.js'
import { Gemini } from './gemini.js'
import { GoogleAuth } from 'google-auth-library'
import { SseJsonProcessor } from '../../../../utils/SseJsonProcessor.js'

export default class VertexAdapter extends GeminiAdapter {
  constructor(config) {
    super(config.geminiConfig)
    this.provider = 'vertex' // 设置 provider 为 'vertex'
    this.vertex = new Vertex(config) // 创建 Vertex 实例
    this.core = this.vertex // 设置 core 为 Vertex 实例
    this.defaultModels = config.models || [] // 设置默认模型列表
  }

  async _getModels() {
    try {
      let models = await this.core.models()
      if (models.length === 0) {
        models = this.defaultModels.map((model) => {
          return { id: model }
        })
      } else {
        const claudeModels = this.defaultModels
          .filter((model) => {
            return model.includes('claude')
          })
          .map((model) => {
            return { id: model }
          })
        models = [...models, ...claudeModels]
      }
      let modelList = this._groupModelsByOwner(models, this.owners)
      return this._sortModelList(modelList)
    } catch (error) {
      logger.error('Failed to get models:', error)
      throw error
    }
  }
}

class Vertex extends Gemini {
  constructor({ authConfig, region, geminiConfig }) {
    const { api_key, base_url } = geminiConfig
    let gemini
    if (!api_key || !base_url) {
      logger.warn('未配置Gemini API密钥或Base URL，将使用默认配置。')
      super({})
      this.geminiAvaliable = false
    } else {
      const config = {
        api_key: api_key.split(',').map((key) => key.trim())[0],
        base_url,
      }
      super(config)
      this.geminiAvaliable = true
    }

    this.authConfig = authConfig
    this.region = region
    this.scope = 'https://www.googleapis.com/auth/cloud-platform'
    this.cachedToken = null
    this.tokenExpiry = null
    this.jsonProcessor = new SseJsonProcessor()
  }

  async getAuthentication() {
    let error = null
    let token = null
    const now = Date.now()
    const timeout = 3000 // 设置超时时间为 10 秒 (可以根据需要调整)

    // 检查缓存的令牌是否有效
    if (this.cachedToken && this.tokenExpiry && this.tokenExpiry > now) {
      console.log('使用缓存的令牌')
      return { error: null, token: this.cachedToken }
    }

    const auth = new GoogleAuth({
      credentials: this.authConfig,
      scopes: [this.scope], // 替换为你的所需的作用域
    })

    try {
      const clientPromise = auth
        .getClient()
        .then((client) => client.getAccessToken())

      // 创建一个超时 Promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('获取令牌超时'))
        }, timeout)
      })

      // 使用 Promise.race 来竞争访问令牌和超时
      const accessTokenResponse = await Promise.race([
        clientPromise,
        timeoutPromise,
      ])

      token = accessTokenResponse.token

      // 缓存令牌和过期时间 (1 小时)
      this.cachedToken = token
      this.tokenExpiry = now + 3600 * 1000 // 1 小时后过期
      console.log('获取新令牌并缓存')
    } catch (err) {
      error = err
      console.error('获取令牌失败:', err)
    }

    return { error, token }
  }

  getModelProvider(model) {
    const table = [
      {
        keyWords: ['claude'], // 匹配的关键字
        provider: 'anthropic', // 对应的 provider 值
      },
      {
        keyWords: ['gemma', 'gemini'], // 匹配的关键字
        provider: 'google', // 对应的 provider 值
      },
    ]
    const provider = table.find((item) => {
      if (Array.isArray(item.keyWords)) {
        return item.keyWords.some((keyWord) => model.includes(keyWord))
      }
    })
    return provider ? provider.provider : null
  }

  getEndPoint(region, projectId) {
    // const region =
    // const { project_id: projectId } = this.authConfig; // 从 authConfig 中获取 project_id

    const base =
      'https://{region}-aiplatform.googleapis.com/v1/projects/{projectId}/locations/{region}'
    const url = base
      .replace(/{region}/g, region)
      .replace(/{projectId}/g, projectId)
    return url
  }

  async models() {
    // 检查令牌是否可用
    const { error } = await this.getAuthentication()
    if (error) {
      throw error
    }
    if (!this.geminiAvaliable) {
      // 如果 Gemini 不可用，返回预置的模型列表
      return []
    } else {
      const geminiModels = await super.models()
      return geminiModels.map((model) => ({
        id: model.id.replace('models/', ''),
      }))
    }
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
    const provider = this.getModelProvider(model)

    const region = provider === 'anthropic' ? 'us-east5' : 'us-central1'
    let projectId = this.authConfig.project_id

    const endpoint = this.getEndPoint(region, projectId)

    const basePath = `/publishers/${provider}/models/${model}`
    let method
    if (stream) {
      method =
        provider === 'google' ? ':streamGenerateContent' : ':streamRawPredict'
    } else {
      method = provider === 'google' ? ':generateContent' : ':rawPredict'
    }

    const url = endpoint + basePath + method

    const { error, token } = await this.getAuthentication()
    if (error) {
      throw error
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }

    if (provider === 'google') {
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
          yield data
        }
      } catch (error) {
        console.error('Error during chat:', error)
        throw error
      } finally {
        this.jsonProcessor.flush()
      }
    } else if (provider === 'anthropic') {
      const { system, claudeMessages } = await this._preProcessMessage(
        messages,
        provider
      )
      const body = {
        anthropic_version: 'vertex-2023-10-16',
        system,
        messages: claudeMessages,
        stream,
        model,
        temperature,
        max_tokens: model.includes('3-7') ? 64000 : 8192,
      }
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
          yield data
        }
      } catch (error) {
        console.error('Error during chat:', error)
        throw error
      }
    }
  }

  *_parseMutiJson(buffer) {
    // 使用 SseJsonProcessor 处理数据块
    for (const jsonObject of this.jsonProcessor.processChunk(buffer)) {
      yield jsonObject // yield 解析后的 JSON 对象
    }
  }

  async _preProcessMessage(messages, provider = 'google') {
    if (provider === 'google') {
      return super._preProcessMessage(messages)
    } else if (provider === 'anthropic') {
      const system = undefined
      const claudeMessages = JSON.parse(JSON.stringify(messages))
      // 实现 Anthropic 特定的消息处理逻辑
      for (const message of claudeMessages) {
        if (message.role === 'system') {
          system = message.content
        } else if (['user', 'assistant'].includes(message.role)) {
          if (Array.isArray(message.content)) {
            message.content = message.content.map((element) => {
              if (element.type === 'image_url') {
                if (element.image_url.url.startsWith('http')) {
                  logger.error('暂不支持http图片')
                } else {
                  // 从base64中解析出type和data
                  const base64 = element.image_url.url
                  const mime_type = base64.split(';')[0].split(':')[1]
                  const data = base64.split(',')[1]

                  element.source = {
                    type: 'base64',
                    media_type: mime_type,
                    data: data,
                  }

                  delete element.image_url

                  return element
                }
              }
            })
          }
        }
      }

      return { system, claudeMessages }
    }
  }
}
