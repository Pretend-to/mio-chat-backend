import GeminiAdapter from './gemini.js'
import { Gemini } from './gemini.js'
import crypto from 'crypto'

/**
 * @class Gemini OAuth 适配器实现
 * 继承自 GeminiAdapter，完全对齐 Cloud Code 官方 OAuth 流程
 */
export default class GeminiOauthAdapter extends GeminiAdapter {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    const state = crypto.randomBytes(32).toString('hex')
    const challenge = 'k-yBWG7zxSChlNSFUB_4rVbnVjEYOS1r4S4Blsks8_4'

    // 默认使用 Gemini CLI (官方客户端)
    const cliClientId =
      '681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com'
    const cliScopes = [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' ')
    const cliRedirect = 'https://codeassist.google.com/authcode'
    const cliUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${cliClientId}&redirect_uri=${encodeURIComponent(cliRedirect)}&response_type=code&scope=${encodeURIComponent(cliScopes)}&access_type=offline&code_challenge=${challenge}&code_challenge_method=S256&state=${state}`

    return {
      type: 'geminiOauth',
      name: 'Gemini OAuth',
      requiresSpecialAuth: true,
      description: `Google Gemini 官方客户端 OAuth 适配器（伪装 Gemini CLI）。利用官方 Cloud Code 凭据进行授权，共享官方客户端的流量配额与优先接入权，支持企业级 Vertex AI 架构。特别适合需要高稳定性、长会话保持及 Google 生态深度集成的场景。
      
#### 授权流程：
1. **[点击此处进行官方授权](${cliUrl})**
2. 登录 Google 账号并同意授权后，复制页面生成的 **Authorization Code**。
3. 将授权码粘贴到下方的 **授权码 (Code)** 输入框中并保存，系统将自动交换长期有效的 Token。`,
      supportedFeatures: ['chat', 'streaming', 'vision', 'multimodal'],
      initialConfigSchema: {
        enable: {
          type: 'boolean',
          default: true,
          label: '启用',
        },
        api_key: {
          type: 'password',
          default: '',
          required: true,
          label: '授权码 (Code)',
          placeholder: '粘贴授权码或 ya29. 开头的 Token',
        },
        manual_models: {
          type: 'textarea',
          default: '',
          description: '手动配置模型 ID（每行一个）',
          required: false,
          label: '手动模型',
          rows: 5,
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
          safetySettings: {
            type: 'group',
            label: '安全过滤设置',
            fields: {
              HARM_CATEGORY_HARASSMENT: {
                type: 'select',
                label: '骚扰内容',
                default: 'BLOCK_NONE',
                options: [
                  { label: '不阻止', value: 'BLOCK_NONE' },
                  { label: '仅阻止高可能性', value: 'BLOCK_ONLY_HIGH' },
                  { label: '阻止中等及以上', value: 'BLOCK_MEDIUM_AND_ABOVE' },
                  { label: '最严格', value: 'BLOCK_LOW_AND_ABOVE' },
                ],
              },
              HARM_CATEGORY_HATE_SPEECH: {
                type: 'select',
                label: '仇恨言论',
                default: 'BLOCK_NONE',
                options: [
                  { label: '不阻止', value: 'BLOCK_NONE' },
                  { label: '仅阻止高可能性', value: 'BLOCK_ONLY_HIGH' },
                  { label: '阻止中等及以上', value: 'BLOCK_MEDIUM_AND_ABOVE' },
                  { label: '最严格', value: 'BLOCK_LOW_AND_ABOVE' },
                ],
              },
              HARM_CATEGORY_SEXUALLY_EXPLICIT: {
                type: 'select',
                label: '色情内容',
                default: 'BLOCK_NONE',
                options: [
                  { label: '不阻止', value: 'BLOCK_NONE' },
                  { label: '仅阻止高可能性', value: 'BLOCK_ONLY_HIGH' },
                  { label: '阻止中等及以上', value: 'BLOCK_MEDIUM_AND_ABOVE' },
                  { label: '最严格', value: 'BLOCK_LOW_AND_ABOVE' },
                ],
              },
              HARM_CATEGORY_DANGEROUS_CONTENT: {
                type: 'select',
                label: '危险内容',
                default: 'BLOCK_NONE',
                options: [
                  { label: '不阻止', value: 'BLOCK_NONE' },
                  { label: '仅阻止高可能性', value: 'BLOCK_ONLY_HIGH' },
                  { label: '阻止中等及以上', value: 'BLOCK_MEDIUM_AND_ABOVE' },
                  { label: '最严格', value: 'BLOCK_LOW_AND_ABOVE' },
                ],
              },
            },
          },
        },
      },
    }
  }

  constructor(config) {
    super(config)
    this.provider = 'geminiOauth'

    // 初始化核心逻辑，并注入自动存档回调
    this.oauthCore = new GeminiOauth({
      ...config,
      onConfigUpdate: async (updates) => {
        try {
          const { default: SystemSettingsService } =
            await import('../../../database/services/SystemSettingsService.js')
          if (!SystemSettingsService.prisma)
            await SystemSettingsService.initialize()

          const llmAdapters = await SystemSettingsService.get('llm_adapters')
          if (llmAdapters && llmAdapters.value) {
            const adapters = llmAdapters.value
            const instances = adapters.geminiOauth || []

            // 找到当前的实例 (根据 api_key 匹配)
            const target = instances.find(
              (inst) => inst.api_key === config.api_key,
            )
            if (target) {
              Object.assign(target, updates)
              await SystemSettingsService.set(
                'llm_adapters',
                adapters,
                'llm_adapters',
                '自动更新 Gemini OAuth 状态',
              )
              console.log('Gemini OAuth 凭证已全自动存档到数据库')
            }
          }
        } catch (e) {
          console.warn('Gemini OAuth 状态全自动存档失败:', e.message)
        }
      },
    })
    this.manualModels = (config.manual_models || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  get core() {
    return this.oauthCore
  }

  async _getModels() {
    const fallbackModels = [
      { id: 'auto', name: 'Auto (Best for task)', owner: 'Gemini' },
      {
        id: 'gemini-3.1-pro-preview',
        name: 'Gemini 3.1 Pro (Preview)',
        owner: 'Gemini',
      },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', owner: 'Gemini' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', owner: 'Gemini' },
    ]

    let models = []

    try {
      const rawUrl =
        'https://raw.githubusercontent.com/google-gemini/gemini-cli/main/packages/core/src/config/defaultModelConfigs.ts'
      const response = await fetch(rawUrl, { timeout: 5000 })
      if (response.ok) {
        const content = await response.text()
        const modelDefBlock =
          content.match(/modelDefinitions: \{([\s\S]+?)\n  \}/)?.[1] || ''
        const modelIds = [
          ...modelDefBlock.matchAll(/\n    ['"]?([\w.-]+)['"]?\s*:/g),
        ].map((m) => m[1])

        if (modelIds.length > 0) {
          models = modelIds.map((id) => ({
            id,
            name: id
              .split('-')
              .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
              .join(' '),
            owner: id.includes('gemma') ? 'Gemma' : 'Gemini',
          }))
          console.log(`成功从 GitHub 动态同步了 ${models.length} 个模型定义`)
        }
      }
    } catch (e) {
      console.warn('同步 GitHub 模型列表失败:', e.message)
    }

    if (models.length === 0) models = [...fallbackModels]

    if (this.manualModels.length > 0) {
      const manual = this.manualModels.map((m) => ({
        id: m.startsWith('models/') ? m : `models/${m}`,
        name: m,
        owner: 'Custom',
      }))
      models = [...models, ...manual]
    }

    return this._sortModelList(this._groupModelsByOwner(models))
  }
}

/**
 * 扩展 Gemini 类以支持 OAuth 认证和官方伪装
 */
const globalCodeLock = new Map()

class GeminiOauth extends Gemini {
  constructor(config) {
    super(config)
    this.refresh_token = config.refresh_token
    this.project_id = config.project_id
    const defaultBaseUrl = 'https://cloudcode-pa.googleapis.com/v1internal'
    this.base_url = config.base_url || defaultBaseUrl

    if (!this.base_url.includes('v1internal')) {
      this.base_url = defaultBaseUrl
    }

    this.client_id =
      config.client_id ||
      '681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com'
    this.client_secret =
      config.client_secret || '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'
    this.redirect_uri = 'https://codeassist.google.com/authcode'

    this.userAgent = 'GeminiCLI/0.42.0 (Windows; AMD64; unknown)'
    this.initializationPromise = null
    this.onConfigUpdate = config.onConfigUpdate || null
    this._initialized = false
    this._initializing = false
  }

  async _ensureInitialized() {
    if (this._initialized) return
    if (this._initializing) {
      while (this._initializing) await new Promise((r) => setTimeout(r, 100))
      return
    }

    this._initializing = true
    try {
      if (this.refresh_token) {
        try {
          await this.refreshAccessToken()
          this._initialized = true
          return
        } catch (e) {
          console.warn('刷新 Token 失败，尝试重新交换:', e.message)
        }
      }

      const input = this.api_key
      if (input && (input.startsWith('http') || !input.startsWith('ya29.'))) {
        const code = this._extractCode(input)
        if (code) {
          if (globalCodeLock.has(code)) {
            await globalCodeLock.get(code)
            this._initialized = true
            return
          }

          const exchangePromise = (async () => {
            try {
              await this._exchangeCode(code)
            } finally {
              globalCodeLock.delete(code)
            }
          })()
          globalCodeLock.set(code, exchangePromise)
          await exchangePromise
        }
      }

      if (!this.project_id && this.api_key) {
        try {
          await this._fetchProjectID()
        } catch (e) {
          console.warn('获取 Project ID 失败:', e.message)
        }
      }

      this._initialized = true
    } finally {
      this._initializing = false
    }
  }

  _extractCode(input) {
    if (!input) return null
    try {
      const url = new URL(input)
      return url.searchParams.get('code') || input
    } catch {
      return input
    }
  }

  async _exchangeCode(code) {
    const exchange = async () => {
      const params = {
        client_id: this.client_id,
        client_secret: this.client_secret,
        code: code,
        redirect_uri: this.redirect_uri,
        grant_type: 'authorization_code',
        code_verifier: '_BEkoKifv2WwPEXGZAOsvORm8yPlmvZoKOKnE74toAE',
      }

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': this.userAgent,
        },
        body: new URLSearchParams(params),
      })

      const data = await response.json()
      if (data.access_token) return data
      throw { status: response.status, data }
    }

    try {
      const data = await exchange()
      this.api_key = data.access_token
      this.refresh_token = data.refresh_token || this.refresh_token
      if (this.onConfigUpdate) {
        this.onConfigUpdate({
          api_key: this.api_key,
          refresh_token: this.refresh_token,
        })
      }
    } catch (error) {
      const data = error.data || {}
      throw new Error(data.error_description || data.error || '交换失败')
    }
  }

  async _fetchProjectID() {
    const url = `${this.base_url}:loadCodeAssist`
    const payload = {
      metadata: {
        ideType: 'VSCODE',
        ideVersion: '1.21.9',
        ideName: 'CloudCode',
      },
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.api_key}`,
        'User-Agent': this.userAgent,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      if (response.status === 403) {
        return await this._onboardUser('free-tier')
      }
      throw new Error(`loadCodeAssist 失败: ${response.status}`)
    }

    const data = await response.json()
    if (data.cloudaicompanionProject) {
      this.project_id = data.cloudaicompanionProject
      if (this.onConfigUpdate) {
        this.onConfigUpdate({ project_id: this.project_id })
      }
      return
    }
    const tier = data.paidTier?.id || data.currentTier?.id || 'free-tier'
    await this._onboardUser(tier)
  }

  async _onboardUser(tierId) {
    const url = `${this.base_url}:onboardUser`
    const payload = {
      tierId: tierId,
      metadata: {
        ideType: 'VSCODE',
        platform: 'PLATFORM_UNSPECIFIED',
        pluginType: 'GEMINI',
      },
    }

    for (let i = 0; i < 5; i++) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.api_key}`,
          'User-Agent': this.userAgent,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error(`onboardUser 失败: ${response.status}`)

      const data = await response.json()
      if (data.done && data.response?.cloudaicompanionProject) {
        const project = data.response.cloudaicompanionProject
        this.project_id =
          typeof project === 'string' ? project : project.name || project.id
        if (this.onConfigUpdate) {
          this.onConfigUpdate({ project_id: this.project_id })
        }
        return
      }
      if (data.done) break
      await new Promise((r) => setTimeout(r, 2000))
    }
    throw new Error('Onboarding 超时')
  }

  async refreshAccessToken() {
    if (!this.refresh_token) throw new Error('缺失 Refresh Token')
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.userAgent,
      },
      body: new URLSearchParams({
        client_id: this.client_id,
        client_secret: this.client_secret,
        refresh_token: this.refresh_token,
        grant_type: 'refresh_token',
      }),
    })
    const data = await response.json()
    if (data.access_token) {
      this.api_key = data.access_token
      this.refresh_token = data.refresh_token || this.refresh_token
      if (this.onConfigUpdate) {
        this.onConfigUpdate({
          api_key: this.api_key,
          refresh_token: this.refresh_token,
        })
      }
      return data.access_token
    }
    throw new Error(data.error_description || data.error || '刷新失败')
  }

  async *chat(params, e = null) {
    await this._ensureInitialized()
    const context = this

    const modelName = params.model.replace(/^models\//, '')
    const action = params.stream ? 'streamGenerateContent' : 'generateContent'
    const { systemInstruction, contents } = await context._preProcessMessage(
      params.messages,
    )

    const {
      model: _,
      stream: __,
      messages: ___,
      safetySettings,
      tools,
      toolConfig,
      ...generationConfig
    } = params

    const wrappedPayload = {
      // model: modelName.startsWith('models/') ? modelName : `models/${modelName}`,
      model: modelName,
      project: context.project_id || undefined,
      user_prompt_id: `agent-${crypto.randomUUID()}`,
      request: {
        contents,
        systemInstruction,
        generationConfig,
        safetySettings,
        tools,
        toolConfig,
        session_id: `session-${crypto.randomUUID()}`,
      },
    }

    const baseUrls = [
      context.base_url.replace(/\/+$/, ''),
      'https://daily-cloudcode-pa.sandbox.googleapis.com',
    ]

    const executeRequest = async (isRetry = false) => {
      let lastError
      let finalResponse

      for (let attempt = 0; attempt < 3; attempt++) {
        for (const currentBaseUrl of baseUrls) {
          const controller = new AbortController()
          if (e) e.onAbort(() => controller.abort())

          const url = `${currentBaseUrl}/v1internal:${action}${params.stream ? '?alt=sse' : ''}`

          try {
            const fetchResponse = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${context.api_key}`,
                'User-Agent': context.userAgent,
              },
              body: JSON.stringify(wrappedPayload),
              signal: controller.signal,
            })

            if (fetchResponse.status === 403 && wrappedPayload.project) {
              const retryPayload = { ...wrappedPayload }
              delete retryPayload.project
              const retryResponse = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${context.api_key}`,
                  'User-Agent': context.userAgent,
                },
                body: JSON.stringify(retryPayload),
                signal: controller.signal,
              })
              finalResponse =
                retryResponse.ok || retryResponse.status !== 403
                  ? retryResponse
                  : fetchResponse
            } else {
              finalResponse = fetchResponse
            }

            if (finalResponse.status === 429) {
              lastError = new Error(await finalResponse.text())
              continue
            }

            if (finalResponse.ok) return finalResponse

            if (
              finalResponse.status === 401 &&
              !isRetry &&
              context.refresh_token
            ) {
              await context.refreshAccessToken()
              return await executeRequest(true)
            }

            throw new Error(await finalResponse.text())
          } catch (err) {
            if (err.name === 'AbortError') return
            lastError = err
          }
        }

        const waitTime = Math.pow(2, attempt) * 1000
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
      throw lastError || new Error('Request failed after multiple attempts')
    }

    const response = await executeRequest()

    if (params.stream) yield* context._processStreamResponse(response)
    else {
      const data = await response.json()
      yield data.response || data
    }
  }

  async *_processStreamResponse(response) {
    for await (const chunk of super._processStreamResponse(response)) {
      if (chunk.response) {
        yield chunk.response
      } else {
        yield chunk
      }
    }
  }
}
