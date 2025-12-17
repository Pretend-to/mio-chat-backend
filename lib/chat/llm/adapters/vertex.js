import GeminiAdapter from './gemini.js'
import { Gemini } from './gemini.js'
import { GoogleAuth } from 'google-auth-library'
import { SseJsonProcessor } from '../../../../utils/SseJsonProcessor.js'

export default class VertexAdapter extends GeminiAdapter {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      type: 'vertex',
      name: 'Google Vertex AI',
      description: 'Google Vertex AI 平台适配器，支持 Gemini Pro 等企业级模型',
      supportedFeatures: ['chat', 'streaming', 'vision', 'multimodal', 'enterprise'],
      initialConfigSchema: {
        enable: {
          type: 'boolean',
          default: true,
          description: '是否启用此适配器实例',
          required: true,
          label: '启用'
        },
        name: {
          type: 'string',
          default: '',
          description: '适配器实例的自定义名称，用于区分多个实例',
          required: false,
          label: '实例名称',
          placeholder: '例如：Vertex-生产环境'
        },
        region: {
          type: 'select',
          default: 'us-central1',
          description: 'Google Cloud 项目所在的地区',
          required: true,
          label: '地区',
          options: [
            { value: 'us-central1', label: 'US Central 1 (Iowa)' },
            { value: 'us-east1', label: 'US East 1 (South Carolina)' },
            { value: 'us-west1', label: 'US West 1 (Oregon)' },
            { value: 'europe-west1', label: 'Europe West 1 (Belgium)' },
            { value: 'asia-northeast1', label: 'Asia Northeast 1 (Tokyo)' },
            { value: 'asia-southeast1', label: 'Asia Southeast 1 (Singapore)' }
          ]
        },
        service_account_json: {
          type: 'textarea',
          default: '',
          description: 'Google Cloud Service Account 的 JSON 密钥内容',
          required: false,
          label: 'Service Account JSON',
          placeholder: '{\n  "type": "service_account",\n  "project_id": "your-project",\n  ...\n}',
          rows: 8,
          validation: {
            isJson: true,
            message: '必须是有效的 JSON 格式'
          }
        },

        manual_models: {
          type: 'textarea',
          default: '',
          description: '手动配置的模型列表，每行一个模型名称。这些模型将与自动获取的模型合并',
          required: false,
          label: '手动配置模型',
          placeholder: 'gemini-1.5-pro\ngemini-1.5-flash\ngemini-1.0-pro',
          rows: 4
        },

      }
    }
  }

  constructor(config) {
    // 使用 Vertex 配置中的 geminiConfig,如果没有则使用空配置
    super(config.geminiConfig || {})
    this.provider = 'vertex' // 设置 provider 为 'vertex'
    this.vertex = new Vertex(config) // 创建 Vertex 实例
    this.defaultModels = config.models || [] // 设置默认模型列表
    

    
    // 处理手动配置的模型
    this.manualModels = []
    if (config.manual_models && typeof config.manual_models === 'string') {
      // 将多行文本分割为模型数组，过滤空行和空白
      this.manualModels = config.manual_models
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
    }
  }

  get core() {
    return this.vertex
  }

  async _getModels() {
    let models = []
    
    try {
      // 尝试从 API 获取模型
      models = await this.core.models()
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
    } catch (error) {
      logger.warn('无法从 API 获取模型列表，将使用默认模型和手动配置的模型:', error.message)
      // API 调用失败时，使用默认模型
      models = this.defaultModels.map((model) => {
        return { id: model }
      })
    }
    
    // 无论 API 调用是否成功，都要添加手动配置的模型
    if (this.manualModels && this.manualModels.length > 0) {
      const manualModelObjects = this.manualModels.map((model) => {
        return { id: model }
      })
      models = [...models, ...manualModelObjects]
      logger.info(`添加了 ${this.manualModels.length} 个手动配置的模型: ${this.manualModels.join(', ')}`)
    }
    
    // 如果没有任何模型，至少返回手动模型
    if (models.length === 0 && this.manualModels.length > 0) {
      models = this.manualModels.map((model) => {
        return { id: model }
      })
      logger.info('使用纯手动配置的模型列表')
    }
    
    let modelList = this._groupModelsByOwner(models)
    return this._sortModelList(modelList)
  }
}

class Vertex extends Gemini {
  constructor({ authConfig, region, geminiConfig }) {
    // 如果有 geminiConfig 且配置了 API key，则使用 Gemini 作为备用
    const hasGeminiConfig = geminiConfig && geminiConfig.api_key && geminiConfig.base_url
    if (hasGeminiConfig) {
      const apiKey = geminiConfig.api_key.split(',').map((key) => key.trim())[0]
      const config = {
        api_key: apiKey,
        base_url: geminiConfig.base_url,
      }
      super(config)
      this.geminiAvaliable = true
    } else {
      super({})
      this.geminiAvaliable = false
    }

    this.authConfig = authConfig
    this.region = region || 'us-central1' // 默认区域
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
      'https://aiplatform.googleapis.com/v1/projects/{projectId}/locations/global'
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
    thinkingConfig,
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
          throw new Error(
            `${errorBody}`,
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
        provider,
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
            `HTTP error! status: ${response.status}, body: ${errorBody}`,
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
      let system = undefined
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
