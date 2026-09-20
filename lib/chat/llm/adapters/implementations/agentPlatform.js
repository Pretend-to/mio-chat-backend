import GeminiAdapter from './gemini.js'
import { Gemini, filterGeminiModels } from '../lib/geminiHttpClient.js'
import { GEMINI_SAFETY_SETTINGS_SCHEMA } from '../lib/geminiSafetySettings.js'
import { VertexAuthStrategy } from '../strategies/auth/VertexAuthStrategy.js'
import { VertexTransportStrategy } from '../strategies/transport/VertexTransportStrategy.js'

export default class AgentPlatformAdapter extends GeminiAdapter {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      aliases: ['vertexExpress'],
      avatarAliases: {
        agentplatform: 'google',
        vertex: 'google',
        vertexexpress: 'google'
      },
      avatarId: 'google',
      description:
        '企业级 Google Vertex AI 平台适配器。提供对 Google Cloud 项目中部署的 Gemini 系列模型的原生访问。支持高并发、安全性配置及 Google Search、代码执行等企业级增强功能。\\n\\n**获取方式**：在 [Google Cloud Console](https://console.cloud.google.com/) 的 API 和服务中创建 API 密钥，并确保已启用 Vertex AI API。',
      extraSettingsSchema: {
        agentPlatform: {
          internalTools: {
            fields: {
              code_execution: {
                default: false,
                label: '代码执行 (Code Execution)',
                type: 'boolean',
              },
              google_search: {
                default: false,
                label: 'Google Search',
                type: 'boolean',
              },
              url_context: {
                default: false,
                label: '网页解析 (URL Context)',
                type: 'boolean',
              },
            },
            label: '内置工具',
            type: 'group',
          },
          ...GEMINI_SAFETY_SETTINGS_SCHEMA,
        },
      },
      initialConfigSchema: {
        api_key: {
          default: '',
          description: 'Vertex AI API Key 或 Access Token',
          label: 'API Key / Token',
          required: true,
          type: 'password',
        },
        base_url: {
          default: 'https://aiplatform.googleapis.com',
          description: 'Vertex AI 基础 URL',
          label: 'Base URL',
          placeholder: 'https://aiplatform.googleapis.com',
          required: false,
          type: 'url',
        },
        block_express: {
          default: false,
          description: '是否阻断/禁用 Express 模式（即 API Key 模式）。开启后：\n  • 使用 Application Default Credentials (ADC) 自动获取 Bearer Token\n  • 优先通过 Vertex AI v1beta1 Publisher Models API 获取模型列表\n  • api_key 字段不再需要（请配置 GOOGLE_APPLICATION_CREDENTIALS 环境变量或运行 gcloud auth application-default login）',
          label: '禁用 Express 模式（使用 ADC）',
          required: false,
          type: 'boolean',
        },
        enable: {
          default: true,
          description: '是否启用此适配器实例',
          label: '启用',
          required: true,
          type: 'boolean',
        },
        models_api_key: {
          default: '',
          description: '用于拉取模型列表的 API Key（如 Google AI Studio API Key）。由于 Google Cloud API Key 权限隔离，建议填入 AI Studio Key 用于获取完整模型列表。',
          label: '模型获取 API Key',
          placeholder: 'AIzaSy...',
          required: false,
          type: 'password',
        },
        models_base_url: {
          default: '',
          description: '用于拉取模型列表的专用 API 地址。默认为 Google AI Studio 端点（https://generativelanguage.googleapis.com）。',
          label: '模型列表拉取地址',
          placeholder: 'https://generativelanguage.googleapis.com',
          required: false,
          type: 'url',
        },
        name: {
          default: '',
          description: '适配器实例的自定义名称',
          label: '实例名称',
          placeholder: '例如：Vertex-Express',
          required: false,
          type: 'string',
        },
        project_id: {
          default: '',
          description: 'Google Cloud 项目 ID',
          label: '项目 ID',
          placeholder: 'my-project-123456',
          required: true,
          type: 'string',
        },
      },
      name: 'Agent Platform',
      supportedFeatures: ['chat', 'streaming', 'vision', 'multimodal'],
      type: 'agentPlatform',
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

    // ---- Strategy 1: 用户配置了 models_api_key 或 models_base_url，用 temp Gemini client 直拉 ----
    if (this.config.models_api_key || this.config.models_base_url) {
      try {
        const targetApiKey = this.config.models_api_key || this.config.api_key
        const targetBaseUrl = this.config.models_base_url || 'https://generativelanguage.googleapis.com'
        const tempClient = new Gemini({
          api_key: targetApiKey,
          base_url: targetBaseUrl,
        })
        models = await tempClient.models()
        if (models.length > 0) {
          logger.info(`[AgentPlatform] 从 models_base_url/models_api_key 获取到 ${models.length} 个模型`)
        }
      } catch (error) {
        logger.warn('[AgentPlatform] models_base_url/models_api_key 获取模型失败:', error.message)
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

    // ---- Strategy 3: 走 AgentPlatform 自己的 models()（ADC 模式列出 Vertex 发布商模型，或 Express 模式兜底） ----
    if (models.length === 0) {
      try {
        models = await this.core.models()
      } catch (error) {
        logger.warn('无法从 API 获取模型列表:', error.message)
      }
    }

    // ---- Strategy 4: 兜底精选推荐模型（避免因 API 鉴权受阻导致列表为空） ----
    if (!models || models.length === 0) {
      logger.info('[AgentPlatform] 未拉取到动态模型，使用官方推荐模型列表兜底')
      models = [
        { id: 'gemini-2.5-flash' },
        { id: 'gemini-2.5-pro' },
        { id: 'gemini-2.0-flash' },
        { id: 'gemini-2.0-flash-lite' },
        { id: 'gemini-1.5-flash' },
        { id: 'gemini-1.5-pro' },
      ]
    }

    const modelList = this._groupModelsByOwner(models)
    return this._sortModelList(modelList)
  }
}

class AgentPlatform extends Gemini {
  constructor({ base_url, api_key, project_id, block_express, models_api_key, models_base_url }) {
    if (!project_id) {
      throw new Error('Agent Platform PROJECT_ID 未配置')
    }
    // Express 模式需要 API Key；非 Express 模式走 ADC，不需要 api_key
    if (!block_express && !api_key) {
      throw new Error('Agent Platform API Key 未配置（Express 模式下必填）')
    }
    super({ api_key: api_key || '', base_url })
    this.project_id = project_id
    this.provider = 'VertexAI'
    this.block_express = Boolean(block_express)
    this.models_api_key = models_api_key || ''
    this.models_base_url = models_base_url || 'https://generativelanguage.googleapis.com'

    this.authStrategy = new VertexAuthStrategy({
      blockExpress: this.block_express,
    })
    this.transportStrategy = new VertexTransportStrategy({
      apiKey: api_key || '',
      baseUrl: base_url,
      blockExpress: this.block_express,
      projectId: this.project_id,
    })
  }

  get _googleAuth() {
    return this.authStrategy._googleAuth
  }

  set _googleAuth(val) {
    if (this.authStrategy) {
      this.authStrategy._googleAuth = val
    }
  }

  async _getAuthHeaders() {
    return this.authStrategy.getAuthHeaders()
  }

  _getRequestUrl(model, stream) {
    return this.transportStrategy.getRequestUrl(model, stream)
  }

  async models() {
    const regionMatch = this.base_url.match(/https:\/\/([a-z0-9-]+)-aiplatform\.googleapis\.com/i)
    const region = regionMatch ? regionMatch[1] : 'us-central1'

    // 1. 尝试使用 Vertex AI v1beta1 Publisher Models API 直接列出谷歌官方发布的 Gemini 模型
    try {
      const url = this.transportStrategy.getPublisherModelsUrl(region)
      const headers = { 'Content-Type': 'application/json' }
      if (this.block_express) {
        Object.assign(headers, await this._getAuthHeaders())
      }

      logger.info(`[AgentPlatform] 尝试调用 Vertex AI v1beta1 获取发布商模型列表, URL: ${url}`)
      const response = await fetch(url, { headers, method: 'GET' })

      if (response.ok) {
        const res = await response.json()
        if (res.publisherModels && Array.isArray(res.publisherModels)) {
          const mapped = res.publisherModels
            .map((model) => {
              const id = model.name.split('/').pop()
              return {
                id,
                supportedGenerationMethods: ['generateContent'],
              }
            })
            .filter((model) => model.id.toLowerCase().includes('gemini'))

          logger.info(`[AgentPlatform] Vertex v1beta1 成功获取到 ${mapped.length} 个 Gemini 模型`)
          return filterGeminiModels(mapped)
        } else {
          logger.warn(`[AgentPlatform] Vertex v1beta1 响应格式不匹配: ${JSON.stringify(res)}`)
        }
      } else {
        const errText = await response.text()
        logger.warn(`[AgentPlatform] Vertex v1beta1 获取模型响应失败: ${response.status} - ${errText}`)
      }
    } catch (error) {
      logger.warn(`[AgentPlatform] Vertex v1beta1 获取模型列表发生异常: ${error.message}`)
    }

    // 2. 兜底策略（仅 Express 模式可用）：通过 AI Studio 端点获取模型列表
    if (!this.block_express) {
      const studioKey = this.models_api_key || this.api_key
      const studioBaseUrl = this.models_base_url || 'https://generativelanguage.googleapis.com'
      logger.info(`[AgentPlatform] 正在通过 AI Studio 端点 (${studioBaseUrl}) 获取模型列表`)
      const fallbackUrl = `${studioBaseUrl}/v1beta/models?key=${studioKey}`
      try {
        const response = await fetch(fallbackUrl, { method: 'GET' })
        if (response.ok) {
          const res = await response.json()
          if (res.models && Array.isArray(res.models)) {
            const mapped = res.models.map((model) => ({
              id: model.name.replace('models/', ''),
              supportedGenerationMethods: model.supportedGenerationMethods,
            }))
            return filterGeminiModels(mapped)
          }
        } else {
          const errText = await response.text()
          logger.warn(`[AgentPlatform] AI Studio 获取模型响应状态: ${response.status} - ${errText}`)
        }
      } catch (error) {
        logger.warn('[AgentPlatform] AI Studio 获取模型失败:', error.message)
      }
    }

    logger.warn('[AgentPlatform] 未从远端 API 获取到任何模型')
    return []
  }
}
