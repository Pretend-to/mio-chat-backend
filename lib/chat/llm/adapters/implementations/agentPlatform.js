import { GoogleAuth } from 'google-auth-library'
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
          description: 'Vertex AI API Key 或 Access Token',
          required: true,
          label: 'API Key / Token',
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
        block_express: {
          type: 'boolean',
          default: false,
          description: '是否阻断/禁用 Express 模式（即 API Key 模式）。开启后：\n  • 使用 Application Default Credentials (ADC) 自动获取 Bearer Token\n  • 优先通过 Vertex AI v1beta1 Publisher Models API 获取模型列表\n  • api_key 字段不再需要（请配置 GOOGLE_APPLICATION_CREDENTIALS 环境变量或运行 gcloud auth application-default login）',
          required: false,
          label: '禁用 Express 模式（使用 ADC）',
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
  constructor({ base_url, api_key, project_id, block_express }) {
    if (!project_id) {
      throw new Error('Agent Platform PROJECT_ID 未配置')
    }
    // Express 模式需要 API Key；非 Express 模式走 ADC，不需要 api_key
    if (!block_express && !api_key) {
      throw new Error('Agent Platform API Key 未配置（Express 模式下必填）')
    }
    super({ base_url, api_key: api_key || '' })
    this.project_id = project_id
    this.provider = 'VertexAI'
    this.block_express = !!block_express

    if (this.block_express) {
      this._googleAuth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      })
    }
  }

  async _getAuthHeaders() {
    if (this.block_express) {
      try {
        const client = await this._googleAuth.getClient()
        const token = await client.getAccessToken()
        return {
          'Authorization': `Bearer ${token.token}`,
        }
      } catch (err) {
        throw new Error(
          `Vertex AI ADC 认证失败: ${err.message}\n\n` +
          '请配置 Application Default Credentials (ADC)：\n' +
          '  方式一：export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json\n' +
          '  方式二：gcloud auth application-default login\n' +
          '  方式三：在 GCE / Cloud Run / GKE 上运行（自动使用 metadata server）'
        )
      }
    }
    return {}
  }

  _getRequestUrl(model, stream) {
    if (this.block_express) {
      return `${this.base_url}/v1/projects/${this.project_id}/locations/global/publishers/google/models/${model}:${
        stream ? 'streamGenerateContent?alt=sse' : 'generateContent'
      }`
    }
    return `${this.base_url}/v1/projects/${this.project_id}/locations/global/publishers/google/models/${model}:${
      stream ? 'streamGenerateContent?alt=sse&' : 'generateContent?'
    }key=${this.api_key}`
  }

  async models() {
    const regionMatch = this.base_url.match(/https:\/\/([a-z0-9-]+)-aiplatform\.googleapis\.com/i)
    const region = regionMatch ? regionMatch[1] : 'us-central1'

    // 1. 尝试使用 Vertex AI v1beta1 Publisher Models API 直接列出谷歌官方发布的 Gemini 模型
    try {
      let url = `https://${region}-aiplatform.googleapis.com/v1beta1/projects/${this.project_id}/locations/${region}/publishers/google/models`

      const headers = { 'Content-Type': 'application/json' }
      if (this.block_express) {
        Object.assign(headers, await this._getAuthHeaders())
      } else {
        // Express 模式：api_key 拼在 URL 上
        url += `?key=${this.api_key}`
      }

      logger.info(`[AgentPlatform] 尝试调用 Vertex AI v1beta1 获取发布商模型列表, URL: ${url}`)
      const response = await fetch(url, { method: 'GET', headers })

      if (response.ok) {
        const res = await response.json()
        if (res.publisherModels && Array.isArray(res.publisherModels)) {
          const mapped = res.publisherModels
            .map((model) => {
              const id = model.name.split('/').pop()
              return {
                id: id,
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

    // 2. 兜底策略（仅 Express 模式可用）：降级到 Generative Language API
    if (!this.block_express) {
      logger.info('[AgentPlatform] 正在降级到 Generative Language API 获取模型列表')
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.api_key}`
      try {
        const response = await fetch(fallbackUrl, { method: 'GET' })
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
        logger.error('[AgentPlatform] 跨端拉取模型失败:', error)
        throw new Error('跨端拉取模型失败')
      }
    }

    logger.warn('[AgentPlatform] 未获取到任何模型（ADC 模式下 Vertex v1beta1 API 无返回）')
    return []
  }
}
