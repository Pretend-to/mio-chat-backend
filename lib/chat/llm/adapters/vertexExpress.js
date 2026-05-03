import GeminiAdapter from './gemini.js'
import { Gemini } from './gemini.js'
import logger from '../../../../utils/logger.js'

export default class VertexExpressAdapter extends GeminiAdapter {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      type: 'vertexExpress',
      name: 'Vertex Express',
      description:
        'Vertex AI Express Mode 适配器，仅需 API Key 即可调用 Vertex 模型',
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
          description: '适配器实例的自定义名称',
          required: false,
          label: '实例名称',
          placeholder: '例如：Vertex-Express',
        },
        api_key: {
          type: 'password',
          default: '',
          description: 'Vertex Express API 密钥',
          required: true,
          label: 'API Key',
        },
        base_url: {
          type: 'url',
          default: 'https://aiplatform.googleapis.com',
          description: 'Vertex AI 基础 URL',
          required: true,
          label: 'Base URL',
          placeholder: 'https://aiplatform.googleapis.com',
        },
        manual_models: {
          type: 'textarea',
          default:
            'gemini-2.5-flash-lite\ngemini-2.5-flash\ngemini-2.5-pro\ngemini-1.5-pro\ngemini-1.5-flash',
          description: '手动配置的模型列表',
          required: false,
          label: '手动配置模型',
          rows: 4,
        },
      },
    }
  }

  constructor(config) {
    super(config)
    this.provider = 'vertexExpress'
    this.expressCore = new VertexExpress(config)

    this.defaultModels = config.models || []

    // 处理手动配置的模型
    this.manualModels = []
    if (config.manual_models && typeof config.manual_models === 'string') {
      this.manualModels = config.manual_models
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    }
  }

  get core() {
    return this.expressCore
  }

  async _getModels() {
    let models = []

    try {
      models = await this.core.models()
    } catch (error) {
      logger.warn(
        '无法从 API 获取模型列表，将使用手动配置的模型:',
        error.message,
      )
    }

    if (this.manualModels && this.manualModels.length > 0) {
      const manualModelObjects = this.manualModels.map((model) => {
        return { id: model }
      })
      models = [...models, ...manualModelObjects]
      logger.info(`添加了 ${this.manualModels.length} 个手动配置的模型`)
    }

    if (models.length === 0 && this.manualModels.length > 0) {
      models = this.manualModels.map((model) => {
        return { id: model }
      })
    }

    let modelList = this._groupModelsByOwner(models)
    return this._sortModelList(modelList)
  }
}

class VertexExpress extends Gemini {
  constructor({ base_url, api_key }) {
    if (!api_key) {
      throw new Error('Vertex Express API Key 未配置')
    }
    const apiKeys = api_key.split(',')
    const selectedKey = apiKeys[Math.floor(Math.random() * apiKeys.length)]
    super({ base_url, api_key: selectedKey })
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
  }, e = null) {
    const controller = new AbortController()
    const signal = controller.signal

    if (e) {
      e.onAbort(() => controller.abort())
    }
    // 目标URL格式: https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-lite:streamGenerateContent?key=...
    const url = `${this.base_url}/v1/publishers/google/models/${model}:${
      stream ? 'streamGenerateContent?alt=sse&' : 'generateContent?'
    }key=${this.api_key}`

    const headers = {
      'Content-Type': 'application/json',
    }
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

  async models() {
    // 平替方案：偷吃 Gemini 的接口！
    // Google Cloud 生成的 API Key 本质上是项目级别的。
    // 只要你的 GCP 项目里不仅启用了 "Vertex AI API"，还顺手开启了 "Generative Language API"，
    // 我们就可以用同一个 API Key 跨端请求 Gemini 的 API 去拉取模型列表！
    const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.api_key}`
    try {
      const response = await fetch(fallbackUrl, { method: 'GET' })
      if (!response.ok) {
        throw new Error('尝试跨端拉取模型失败')
      }
      const res = await response.json()
      if (!res.models) return []

      const avaliableModelNames = ['gemini', 'gemma']
      const disabledModelNames = ['computer', 'embedding', 'audio']

      return res.models
        .map((model) => ({
          // Generative Language API 返回格式是 "models/gemini-2.5-flash"
          id: model.name.replace('models/', ''),
        }))
        .filter((model) =>
          avaliableModelNames.some((name) => model.id.includes(name)),
        )
        .filter(
          (model) =>
            !disabledModelNames.some((name) => model.id.includes(name)),
        )
    } catch (error) {
      logger.error(error)
      throw new Error('跨端拉取失败，降级使用手动模型配置')
    }
  }
}
