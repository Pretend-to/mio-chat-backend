import GeminiAdapter from './gemini.js'
import { Gemini, filterGeminiModels } from '../lib/geminiHttpClient.js'
import { GEMINI_SAFETY_SETTINGS_SCHEMA } from '../lib/geminiSafetySettings.js'

export default class AgentPlatformAdapter extends GeminiAdapter {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      type: 'agentPlatform',
      aliases: ['vertexExpress'],
      avatarId: 'google',
      avatarAliases: {
        vertex: 'google',
        vertexexpress: 'google',
        agentplatform: 'google'
      },
      name: 'Agent Platform (Google Vertex AI)',
      description:
        '企业级 Google Vertex AI 平台适配器。提供对 Google Cloud 项目中部署的 Gemini 系列模型的原生访问。支持高并发、安全性配置及 Google Search、代码执行等企业级增强功能。\\n\\n**获取方式**：在 [Google Cloud Console](https://console.cloud.google.com/) 的 API 和服务中创建 API 密钥，并确保已启用 Vertex AI API。',
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
          description: 'Vertex AI API Key',
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
        models_base_url: {
          type: 'url',
          default: '',
          description: '用于拉取模型列表的专用 API 地址。留空则自动尝试复用已配置的 Gemini 原生适配器（懒加载，不受初始化顺序影响）。',
          required: false,
          label: '模型列表拉取地址',
          placeholder: 'https://generativelanguage.googleapis.com',
        },
        project_id: {
          type: 'string',
          default: '',
          description: 'Google Cloud 项目 ID',
          required: true,
          label: '项目 ID',
          placeholder: 'my-project-123456',
        },
      },
      extraSettingsSchema: {
        agentPlatform: {
          imageGeneration: {
            type: 'boolean',
            default: false,
            label: '图像生成 (NanoBanana)',
          },
          internalTools: {
            type: 'group',
            label: '内置工具',
            fields: {
              google_search: {
                type: 'boolean',
                default: false,
                label: 'Google Search',
              },
              code_execution: {
                type: 'boolean',
                default: false,
                label: '代码执行 (Code Execution)',
              },
              url_context: {
                type: 'boolean',
                default: false,
                label: '网页解析 (URL Context)',
              },
            },
          },
          ...GEMINI_SAFETY_SETTINGS_SCHEMA,
        },
      },
    }
  }

  /** Agent Platform 适配器 → json 格式类型为 'agentPlatform'（处理 oneOf 兼容） */
  get toolJsonType() {
    return 'agentPlatform'
  }

  constructor(config) {
    super(config)
    this.provider = 'agentPlatform'
    this.expressCore = new AgentPlatform(config)

    this.defaultModels = config.models || []
  }

  get core() {
    return this.expressCore
  }

  async _getModels() {
    let models = []

    // ---- Strategy 1: 用户配置了 models_base_url，用 temp Gemini client 直拉 ----
    if (this.config.models_base_url) {
      try {
        const tempClient = new Gemini({
          base_url: this.config.models_base_url,
          api_key: this.config.api_key,
        })
        models = await tempClient.models()
        if (models.length > 0) {
          logger.info(`[AgentPlatform] 从 models_base_url 获取到 ${models.length} 个模型`)
        }
      } catch (error) {
        logger.warn('[AgentPlatform] models_base_url 获取模型失败:', error.message)
      }
    }

    // ---- Strategy 2: 复用在线的 gemini 适配器 core（懒加载，不受初始化顺序影响） ----
    if (models.length === 0) {
      try {
        const { default: llmService } = await import('../../index.js')
        for (const [instanceId, metadata] of Object.entries(llmService.instanceMetadata || {})) {
          if (metadata.adapterType === 'gemini') {
            const geminiCore = llmService.llms?.[instanceId]?.core
            if (geminiCore) {
              models = await geminiCore.models()
              if (models.length > 0) {
                logger.info(`[AgentPlatform] 复用 Gemini 适配器 "${metadata.displayName}" 获取到 ${models.length} 个模型`)
              }
              break
            }
          }
        }
      } catch (error) {
        logger.warn('[AgentPlatform] 复用 Gemini 适配器失败:', error.message)
      }
    }

    // ---- Strategy 3: 兜底 — 走 AgentPlatform 自己的 models()（直连 Generative Language API） ----
    if (models.length === 0) {
      try {
        models = await this.core.models()
      } catch (error) {
        logger.warn('无法从 API 获取模型列表:', error.message)
      }
    }

    let modelList = this._groupModelsByOwner(models)
    return this._sortModelList(modelList)
  }
}

class AgentPlatform extends Gemini {
  constructor({ base_url, api_key, project_id }) {
    if (!project_id) {
      throw new Error('Agent Platform PROJECT_ID 未配置')
    }
    if (!api_key) {
      throw new Error('Agent Platform API Key 未配置')
    }
    super({ base_url, api_key })
    this.project_id = project_id
    this.provider = 'VertexAI'
  }

  _getRequestUrl(model, stream) {
    return `${this.base_url}/v1/projects/${this.project_id}/locations/global/publishers/google/models/${model}:${
      stream ? 'streamGenerateContent?alt=sse&' : 'generateContent?'
    }key=${this.api_key}`
  }

  async models() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.api_key}`
    try {
      const response = await fetch(url, { method: 'GET' })
      if (!response.ok) {
        throw new Error('尝试跨端拉取模型失败')
      }
      const res = await response.json()
      if (!res.models) return []

      const mapped = res.models.map((model) => ({
        id: model.name.replace('models/', ''),
        supportedGenerationMethods: model.supportedGenerationMethods,
      }))
      return filterGeminiModels(mapped)
    } catch (error) {
      logger.error(error)
      throw new Error('跨端拉取模型失败')
    }
  }
}
