import GeminiAdapter from './gemini.js'
import { Gemini, logGeminiUsage } from './gemini.js'
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
      'https://www.googleapis.com/auth/drive.readonly',
    ].join(' ')
    const cliRedirect = 'https://codeassist.google.com/authcode'
    const cliUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${cliClientId}&redirect_uri=${encodeURIComponent(cliRedirect)}&response_type=code&scope=${encodeURIComponent(cliScopes)}&access_type=offline&code_challenge=${challenge}&code_challenge_method=S256&state=${state}`

    return {
      type: 'geminiOauth',
      name: 'Gemini OAuth',
      requiresSpecialAuth: true,
      description: `> [!CAUTION]
> **本适配器已停用**：Gemini OAuth 适配器目前已暂时屏蔽。请参考下文说明进行迁移。

Google Gemini 官方客户端 OAuth 适配器（伪装 Gemini CLI）。利用官方 Cloud Code 凭据进行授权，共享官方客户端的流量配额与优先接入权，支持企业级 Vertex AI 架构。

**迁移建议**：由于 Google 已全面转向 Antigravity 架构，原有的 OAuth 伪装方式已不再推荐。建议存量用户迁移至 **Antigravity CLI** 或官方 **Vertex AI / AI Studio** 适配器以获得持续稳定的服务。`,
      isShielded: true,
      supportedFeatures: ['chat', 'streaming', 'vision', 'multimodal'],
      initialConfigSchema: {
        enable: {
          type: 'boolean',
          default: true,
          label: '启用',
        },
        base_url: {
          type: 'string',
          default: 'https://cloudcode-pa.googleapis.com/v1internal',
          required: false,
          label: 'Base URL',
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
    this.shieldConfig = {
      enabled: true,
      message:
        'Gemini OAuth 适配器（原 geminicli 伪装）由于平台协议变更及相关合规性要求，现已暂时停用。存量实例已无法发起请求，建议您尽快迁移至官方 **Antigravity CLI** 或 **Vertex AI / AI Studio** 适配器以获得更稳定的服务支持。',
    }

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
    this.tier_id = config.tier_id || 'UNKNOWN'
    this.drive_storage_limit = config.drive_storage_limit || 0
    this.drive_storage_usage = config.drive_storage_usage || 0
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

      if (this.api_key) {
        try {
          await this._fetchGoogleOneTier()
        } catch (e) {
          logger.warn(`[Gemini OAuth] 获取 Google One Tier 失败:`, e.message)
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
    logger.info(`[Gemini OAuth] >>>>> 开始交换 Authorization Code...`)
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
      logger.info(`[Gemini OAuth] 成功交换长期 Token！已经保存 Access Token 和 Refresh Token。`)
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
      logger.error(`[Gemini OAuth] 交换 Authorization Code 失败`, data)
      throw new Error(data.error_description || data.error || '交换失败')
    }
  }

  async _fetchProjectID() {
    const url = `${this.base_url}:loadCodeAssist`
    logger.info(`[Gemini OAuth] >>>>> 正在调用 loadCodeAssist 获取项目 ID - URL: ${url}`)
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
        logger.warn(`[Gemini OAuth] loadCodeAssist 返回 403，触发 onboarding 流程...`)
        return await this._onboardUser('free-tier')
      }
      logger.error(`[Gemini OAuth] loadCodeAssist 接口调用失败: ${response.status}`)
      throw new Error(`loadCodeAssist 失败: ${response.status}`)
    }

    const data = await response.json()
    if (data.cloudaicompanionProject) {
      this.project_id = data.cloudaicompanionProject
      logger.info(`[Gemini OAuth] 成功获取并分配 Cloud AI Companion Project ID: ${this.project_id}`)
      if (this.onConfigUpdate) {
        this.onConfigUpdate({ project_id: this.project_id })
      }
      return
    }
    const tier = data.paidTier?.id || data.currentTier?.id || 'free-tier'
    logger.info(`[Gemini OAuth] 未配置 Project ID，正在调用 onboardUser 激活 Tier: ${tier}`)
    await this._onboardUser(tier)
  }

  async _fetchGoogleOneTier() {
    logger.info(`[Gemini OAuth] >>>>> 正在调用 Drive API 获取网盘容量推断会员等级...`)
    const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
      headers: {
        Authorization: `Bearer ${this.api_key}`,
        'User-Agent': this.userAgent,
      },
    })

    if (!response.ok) {
      if (response.status === 403) {
        logger.warn(`[Gemini OAuth] Drive API 无权限 (403)，可能未重新授权赋予 drive.readonly Scope。`)
        return
      }
      throw new Error(`Drive API 失败: ${response.status}`)
    }

    const data = await response.json()
    if (data.storageQuota) {
      const limit = parseInt(data.storageQuota.limit || '0', 10)
      const usage = parseInt(data.storageQuota.usage || '0', 10)

      this.drive_storage_limit = limit
      this.drive_storage_usage = usage

      const GB = 1024 * 1024 * 1024
      const TB = 1024 * GB

      if (limit > 100 * TB) this.tier_id = 'google_ai_ultra'
      else if (limit >= 2 * TB) this.tier_id = 'google_ai_pro'
      else if (limit >= 15 * GB) this.tier_id = 'google_one_free'
      else this.tier_id = 'google_one_unknown'

      logger.info(`[Gemini OAuth] 成功获取 Drive 容量 - Limit: ${limit} bytes, Usage: ${usage} bytes, 推断会员等级: ${this.tier_id}`)

      if (this.onConfigUpdate) {
        this.onConfigUpdate({ 
          tier_id: this.tier_id,
          drive_storage_limit: limit,
          drive_storage_usage: usage
        })
      }
    }
  }

  async _onboardUser(tierId) {
    const url = `${this.base_url}:onboardUser`
    logger.info(`[Gemini OAuth] >>>>> 用户未激活或未绑定项目，正在调用 onboardUser (Tier: ${tierId}) - URL: ${url}`)
    const payload = {
      tierId: tierId,
      metadata: {
        ideType: 'VSCODE',
        platform: 'PLATFORM_UNSPECIFIED',
        pluginType: 'GEMINI',
      },
    }

    for (let i = 0; i < 5; i++) {
      logger.info(`[Gemini OAuth] 发送 onboardUser 激活请求 (尝试第 ${i + 1}/5 次)...`)
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
        logger.error(`[Gemini OAuth] onboardUser 激活失败 (HTTP ${response.status})`)
        throw new Error(`onboardUser 失败: ${response.status}`)
      }

      const data = await response.json()
      if (data.done && data.response?.cloudaicompanionProject) {
        const project = data.response.cloudaicompanionProject
        this.project_id =
          typeof project === 'string' ? project : project.name || project.id
        logger.info(`[Gemini OAuth] 用户 Onboarding 激活成功！绑定 Project ID: ${this.project_id}`)
        if (this.onConfigUpdate) {
          this.onConfigUpdate({ project_id: this.project_id })
        }
        return
      }
      if (data.done) break
      await new Promise((r) => setTimeout(r, 2000))
    }
    logger.error(`[Gemini OAuth] Onboarding 激活超时 (尝试 5 次后仍未完成)`)
    throw new Error('Onboarding 超时')
  }

  async refreshAccessToken() {
    if (!this.refresh_token) throw new Error('缺失 Refresh Token')
    
    let lastError = null
    // 引入最多 3 次的指数退避重试机制
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        const backoff = Math.min(Math.pow(2, attempt - 1) * 1000, 30000)
        logger.warn(`[Gemini OAuth] 刷新 Token 失败，等待 ${backoff}ms 后进行第 ${attempt + 1} 次重试...`)
        await new Promise((r) => setTimeout(r, backoff))
      }
      
      logger.info(`[Gemini OAuth] >>>>> 正在使用 Refresh Token 刷新 Access Token (尝试 ${attempt + 1}/3)...`)
      try {
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
          logger.info(`[Gemini OAuth] 刷新 Token 成功！已获得全新 Access Token。`)
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
        
        const errorMsg = data.error_description || data.error || '刷新失败'
        // 判断是否是不可重试的致命错误
        if (['invalid_grant', 'invalid_client', 'unauthorized_client', 'access_denied'].includes(data.error)) {
          logger.error(`[Gemini OAuth] 遭遇不可重试的致命错误 (${data.error}):`, data)
          throw new Error(errorMsg)
        }
        
        lastError = new Error(errorMsg)
      } catch (e) {
        // 如果是直接抛出的 Error (如网络异常 或 不可重试的 fatal error)
        if (e.message && ['invalid_grant', 'invalid_client', 'unauthorized_client', 'access_denied'].some(errType => e.message.includes(errType))) {
          throw e
        }
        lastError = e
      }
    }
    
    logger.error(`[Gemini OAuth] 刷新 Token 彻底失败，重试用尽`, lastError)
    throw lastError
  }

  async *chat(params, e = null) {
    const modelName = params.model.replace(/^models\//, '')
    const timeMetrics = {
      startTime: Date.now(),
      firstTokenTime: null,
      model: modelName,
      requestId: e?.requestId,
      userId: e?.user?.id,
      userIp: e?.user?.ip,
      contactorId: e?.body?.contactorId,
      presetName: e?.body?.settings?.presetSettings?.name,
      isStream: !!params.stream
    }
    await this._ensureInitialized()
    const context = this
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

    // 仅在全局 debug 或开发模式下打印完整的请求 Payload，避免日志过于臃肿
    if (global.debug || process.env.NODE_ENV === 'development') {
      logger.info(`[Gemini OAuth] >>>>> 发起 LLM 请求 - 模型: ${modelName}, 动作: ${action}, 是否流式: ${!!params.stream}`)
      logger.info(`[Gemini OAuth] >>>>> 请求 Payload 内容:`)
      logger.json(wrappedPayload)
    } else {
      logger.info(`[Gemini OAuth] 发起 LLM 请求 - 模型: ${modelName}, 动作: ${action}`)
    }

    const baseUrls = [
      context.base_url.replace(/\/v1internal\/?$/, '').replace(/\/+$/, ''),
      'https://daily-cloudcode-pa.sandbox.googleapis.com',
    ]

    const executeRequest = async (isTokenRetry = false) => {
      let lastError
      let finalResponse

      const maxRetries = 3

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        for (const currentBaseUrl of baseUrls) {
          const controller = new AbortController()
          if (e) e.onAbort(() => controller.abort())

          const url = `${currentBaseUrl}/v1internal:${action}${params.stream ? '?alt=sse' : ''}`

          // 仅在 debug 模式下打印具体的请求路径和头部
          if (global.debug || process.env.NODE_ENV === 'development') {
            logger.info(`[Gemini OAuth] 发送 HTTP POST 请求 - 地址: ${url}`)
            const maskedToken = context.api_key
              ? `${context.api_key.substring(0, 8)}...${context.api_key.substring(context.api_key.length - 8)}`
              : 'none'
            logger.info(`[Gemini OAuth] 请求 Headers: ${JSON.stringify({
              'Content-Type': 'application/json',
              'User-Agent': context.userAgent,
              'Authorization': `Bearer ${maskedToken}`
            }, null, 2)}`)
          }

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
              logger.warn(`[Gemini OAuth] 收到 403 错误，尝试移除 project 字段进行重试...`)
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

            if (finalResponse.ok) {
              return finalResponse
            }

            if (
              finalResponse.status === 401 &&
              !isTokenRetry &&
              context.refresh_token
            ) {
              logger.warn(`[Gemini OAuth] Token 已失效 (401)，正在刷新 Access Token 并重新请求...`)
              await context.refreshAccessToken()
              return await executeRequest(true)
            }

            const errorBody = await finalResponse.text()
            lastError = new Error(`HTTP ${finalResponse.status}: ${errorBody}`)
            logger.warn(`[Gemini OAuth] 请求返回非 200 状态码 (地址: ${url}) - 状态码: ${finalResponse.status}, 响应: ${errorBody}`)
            
            // 指数退避重试判断：仅针对网关/限流等临时错误进行重试
            if (![429, 500, 502, 503, 504].includes(finalResponse.status)) {
              throw lastError // 抛出给外层拦截，如果是致命错误将直接中断当前请求
            }
          } catch (err) {
            if (err.name === 'AbortError') {
              logger.warn(`[Gemini OAuth] 请求已被用户手动中止 (AbortError)`)
              throw err
            }
            if (err === lastError && finalResponse && ![429, 500, 502, 503, 504].includes(finalResponse.status)) {
              // 致命错误，无法重试，直接抛出，终止所有重试
              throw err
            }
            lastError = err
            logger.warn(`[Gemini OAuth] 请求端点 ${url} 异常: ${err.message}`)
            // 继续尝试下一个 baseUrl
          }
        }

        // 如果执行到这里说明所有的 baseUrls 都失败了，准备外层重试
        if (attempt < maxRetries) {
          const backoffDelay = Math.pow(2, attempt) * 1000 + Math.random() * 500
          logger.info(`[Gemini OAuth] 全部端点请求失败，等待 ${Math.round(backoffDelay)}ms 后进行指数退避重试 (${attempt}/${maxRetries})...`)
          await new Promise(resolve => setTimeout(resolve, backoffDelay))
        }
      }

      throw lastError || new Error('Request failed after retries')
    }

    const response = await executeRequest()

    if (params.stream) yield* context._processStreamResponse(response, timeMetrics)
    else {
      const data = await response.json()
      const usage = data.usageMetadata || data.response?.usageMetadata
      if (usage && usage.promptTokenCount !== undefined) {
        logGeminiUsage(usage, timeMetrics)
      }
      yield data.response || data
    }
  }

  async *_processStreamResponse(response, timeMetrics) {
    for await (const chunk of super._processStreamResponse(response, timeMetrics)) {
      if (chunk.response) {
        yield chunk.response
      } else {
        yield chunk
      }
    }
  }
}
