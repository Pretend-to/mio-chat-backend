/**
 * Gemini OAuth HTTP Client — Antigravity OAuth2 认证 HTTP 客户端
 * 通过 OAuth2 流程获取 Google Cloud 凭证，访问受限的 Gemini 模型
 */
import { Gemini } from './geminiHttpClient.js'
import {
  ClientID,
  ClientSecret,
  RedirectURI,
  DEFAULT_GEMINI_OAUTH_MODELS,
  sessionStore,
  tokenCache,
  generateStableSessionID
} from './geminiOauthHelper.js'

import logger from '../../../../../utils/logger.js'

const log = logger

/**
 * 递归将 snake_case key 转为 camelCase
 * 用于将 Gemini v1 API 的 snake_case 响应字段转为 v1internal 的 camelCase 格式
 * 支持的映射：inline_data → inlineData, mime_type → mimeType, thought_signature → thoughtSignature
 */
function mapPartsToCamelCase(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  if (Array.isArray(obj)) {
    return obj.map(mapPartsToCamelCase)
  }
  const result = {}
  for (const key of Object.keys(obj)) {
    let newKey = key
    if (key === 'inline_data') newKey = 'inlineData'
    else if (key === 'mime_type') newKey = 'mimeType'
    else if (key === 'thought_signature') newKey = 'thoughtSignature'
    result[newKey] = mapPartsToCamelCase(obj[key])
  }
  return result
}

export class GeminiOauth extends Gemini {
  constructor(config) {
    super({
      base_url: config.base_url || 'https://cloudcode-pa.googleapis.com',
      api_key: config.api_key,
      onUsage: config.onUsage || null
    })
    this.refresh_token = config.refresh_token
    this.expires_at = config.expires_at
    this.project_id = config.project_id
    this.tier_id = config.tier_id
    this.privacy_mode = config.privacy_mode
    this.onConfigUpdate = config.onConfigUpdate
    this.userAgent = 'antigravity'
    this.provider = 'Gemini OAuth'

    // 初始化失败缓存，用来阻断过期 token 无休止重试导致的爆错
    this._authFailed = false
    this._authError = null
    this._lastApiKeyChecked = null
  }

  _extractCodeAndState(apiKey) {
    if (!apiKey) return { code: null, state: null }
    if (apiKey.includes('code=')) {
      try {
        const url = new URL(apiKey)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        return { code, state }
      } catch (err) {
        const codeMatch = apiKey.match(/[?&]code=([^&]+)/)
        const stateMatch = apiKey.match(/[?&]state=([^&]+)/)
        return {
          code: codeMatch ? decodeURIComponent(codeMatch[1]) : null,
          state: stateMatch ? decodeURIComponent(stateMatch[1]) : null
        }
      }
    }
    return { code: apiKey, state: null }
  }

  async _ensureInitialized() {
    if (this._authFailed && this.api_key === this._lastApiKeyChecked) {
      log.warn(`[Gemini OAuth] 检测到此前已标记认证失败，短路跳过重新认证以防爆错重试`)
      throw this._authError || new Error('Antigravity OAuth authentication failed previously (unauthorized_client)')
    }

    if (this.api_key !== this._lastApiKeyChecked) {
      this._authFailed = false
      this._authError = null
      this._initialized = false
    }
    this._lastApiKeyChecked = this.api_key

    if (this._initialized) {
      return
    }

    await sessionStore.loadFromDb()
    await tokenCache.loadFromDb()

    const { code, state } = this._extractCodeAndState(this.api_key)

    const isNewUrlOrCode = code && (this.api_key.includes('code=') || (!code.startsWith('ya29.') && !this.refresh_token))

    if (isNewUrlOrCode) {
      const cached = tokenCache.get(code)
      if (cached) {
        log.info(`[Gemini OAuth] 从本地缓存中命中 Token，复用已交换的凭证 (Code: ${code.substring(0, 10)}...)`)
        this.api_key = cached.api_key
        this.refresh_token = cached.refresh_token
        this.expires_at = cached.expires_at
        this.project_id = cached.project_id
        this.tier_id = cached.tier_id
        this.privacy_mode = cached.privacy_mode

        if (this.onConfigUpdate) {
          await this.onConfigUpdate({
            api_key: this.api_key,
            refresh_token: this.refresh_token,
            expires_at: this.expires_at,
            project_id: this.project_id,
            tier_id: this.tier_id,
            privacy_mode: this.privacy_mode
          })
        }
        this._initialized = true
        return
      }

      let verifier = 'a'.repeat(43)
      if (state) {
        const session = sessionStore.get(state)
        if (session) {
          verifier = session.verifier
          sessionStore.delete(state)
        } else {
          log.warn(`[Gemini OAuth] 未在 sessionStore 中找到 state ${state} 对应的 verifier，使用默认 verifier`)
        }
      }

      await this._exchangeCode(code, verifier)
    } else if (this.refresh_token && (!this.api_key || this.api_key.startsWith('ya29.') && (!this.expires_at || Date.now() > this.expires_at))) {
      await this.refreshAccessToken()
    }

    if (!this.project_id && this.api_key) {
      await this._initProjectAndPrivacy()
    }

    if (isNewUrlOrCode && code) {
      tokenCache.set(code, {
        api_key: this.api_key,
        refresh_token: this.refresh_token,
        expires_at: this.expires_at,
        project_id: this.project_id,
        tier_id: this.tier_id,
        privacy_mode: this.privacy_mode
      })
    }

    this._initialized = true
  }

  async _exchangeCode(code, verifier) {
    const params = new URLSearchParams()
    params.append('client_id', ClientID)
    params.append('client_secret', ClientSecret)
    params.append('code', code)
    params.append('code_verifier', verifier)
    params.append('redirect_uri', RedirectURI)
    params.append('grant_type', 'authorization_code')

    log.info(`[Gemini OAuth] 开始交换 Authorization Code...`)
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })

    if (!res.ok) {
      const errText = await res.text()
      log.error(`[Gemini OAuth] Code 交换失败: ${res.status} - ${errText}`)

      let parsedErr = {}
      try { parsedErr = JSON.parse(errText) } catch (e) {}

      const errType = parsedErr.error || 'unknown_error'
      const customErr = new Error(`OAuth Code Exchange failed: HTTP ${res.status} - [${errType}] ${parsedErr.error_description || errText}`)
      customErr.oauthError = errType

      if (errType === 'unauthorized_client' || errType === 'invalid_grant' || errType === 'invalid_client' || res.status === 400) {
        this._authFailed = true
        this._authError = customErr
        this._initialized = false
      }

      throw customErr
    }

    const data = await res.json()
    this.api_key = data.access_token
    this.refresh_token = data.refresh_token
    this.expires_at = Date.now() + data.expires_in * 1000 - 5 * 60 * 1000

    if (this.onConfigUpdate) {
      await this.onConfigUpdate({
        api_key: this.api_key,
        refresh_token: this.refresh_token,
        expires_at: this.expires_at
      })
    }
  }

  async refreshAccessToken() {
    const params = new URLSearchParams()
    params.append('client_id', ClientID)
    params.append('client_secret', ClientSecret)
    params.append('refresh_token', this.refresh_token)
    params.append('grant_type', 'refresh_token')

    log.info(`[Gemini OAuth] 正在通过 Refresh Token 刷新 Access Token...`)
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })

    if (!res.ok) {
      const errText = await res.text()
      log.error(`[Gemini OAuth] Token 刷新失败: ${res.status} - ${errText}`)

      let parsedErr = {}
      try { parsedErr = JSON.parse(errText) } catch (e) {}

      const errType = parsedErr.error || 'unknown_error'
      const customErr = new Error(`OAuth Token Refresh failed: [${errType}] ${parsedErr.error_description || errText}`)
      customErr.oauthError = errType

      if (errType === 'unauthorized_client' || errType === 'invalid_grant' || errType === 'invalid_client' || res.status === 400) {
        this._authFailed = true
        this._authError = customErr
        this._initialized = false
      }

      throw customErr
    }

    const data = await res.json()
    this.api_key = data.access_token
    this.expires_at = Date.now() + data.expires_in * 1000 - 5 * 60 * 1000

    if (this.onConfigUpdate) {
      await this.onConfigUpdate({
        api_key: this.api_key,
        expires_at: this.expires_at
      })
    }
  }

  async _initProjectAndPrivacy() {
    log.info(`[Gemini OAuth] 开始初始化 Project 和隐私设置...`)
    let loadData = await this.loadCodeAssist(this.api_key)
    let projectId = loadData?.cloudaicompanionProject
    let tierId = 'Free'

    if (!projectId) {
      log.warn(`[Gemini OAuth] 未绑定 Project，开始触发 Onboarding...`)
      const allowedTiers = loadData?.allowedTiers || []
      const defaultTier = allowedTiers.find(t => t.isDefault) || allowedTiers[0]
      const rawTierId = defaultTier?.id || 'free-tier'

      projectId = await this.onboardUser(this.api_key, rawTierId)

      loadData = await this.loadCodeAssist(this.api_key)
      projectId = loadData?.cloudaicompanionProject || projectId
    }

    const rawTier = loadData?.currentTier || loadData?.paidTier
    if (rawTier === 'free-tier') tierId = 'Free'
    else if (rawTier === 'g1-pro-tier') tierId = 'Pro'
    else if (rawTier === 'g1-ultra-tier') tierId = 'Ultra'
    else if (rawTier) tierId = 'Abnormal'

    this.project_id = projectId
    this.tier_id = tierId

    let privacyMode = 'privacy_set_failed'
    try {
      const setSuccess = await this.setAntigravityPrivacy(this.api_key, projectId)
      if (setSuccess) {
        privacyMode = 'privacy_set'
      }
    } catch (err) {
      log.error(`[Gemini OAuth] 隐私设置失败: ${err.message}`)
    }

    this.privacy_mode = privacyMode

    if (this.onConfigUpdate) {
      await this.onConfigUpdate({
        project_id: this.project_id,
        tier_id: this.tier_id,
        privacy_mode: this.privacy_mode
      })
    }
  }

  async loadCodeAssist(token) {
    const baseUrls = [
      this.base_url.replace(/\/v1internal\/?$/, '').replace(/\/+$/, ''),
      'https://daily-cloudcode-pa.sandbox.googleapis.com'
    ]

    let lastErr
    for (const baseUrl of baseUrls) {
      try {
        const res = await fetch(`${baseUrl}/v1internal:loadCodeAssist`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'User-Agent': this.userAgent
          },
          body: JSON.stringify({})
        })
        if (res.ok) {
          return await res.json()
        }
        lastErr = new Error(`HTTP ${res.status}: ${await res.text()}`)
      } catch (err) {
        lastErr = err
      }
    }
    throw lastErr || new Error('loadCodeAssist failed')
  }

  async onboardUser(token, tierId) {
    const baseUrls = [
      this.base_url.replace(/\/v1internal\/?$/, '').replace(/\/+$/, ''),
      'https://daily-cloudcode-pa.sandbox.googleapis.com'
    ]

    let lastErr
    for (const baseUrl of baseUrls) {
      try {
        const res = await fetch(`${baseUrl}/v1internal:onboardUser`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'User-Agent': this.userAgent
          },
          body: JSON.stringify({ tierId })
        })
        if (res.ok) {
          const data = await res.json()
          if (data.done) {
            const projectObj = data.response?.cloudaicompanionProject
            if (typeof projectObj === 'string') return projectObj.trim()
            if (projectObj && projectObj.id) return projectObj.id.trim()
          }
        }
        lastErr = new Error(`HTTP ${res.status}: ${await res.text()}`)
      } catch (err) {
        lastErr = err
      }
    }
    throw lastErr || new Error('onboardUser failed')
  }

  async setAntigravityPrivacy(token, projectId) {
    const dailyBase = 'https://daily-cloudcode-pa.sandbox.googleapis.com'

    const setRes = await fetch(`${dailyBase}/v1internal:setUserSettings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': this.userAgent,
        'X-Goog-Api-Client': 'gl-node/22.21.1',
        'Host': 'daily-cloudcode-pa.googleapis.com'
      },
      body: JSON.stringify({ user_settings: {} })
    })

    if (!setRes.ok) {
      log.warn(`[Gemini OAuth] setUserSettings 失败: ${setRes.status}`)
      return false
    }

    const setData = await setRes.json()
    const settings = setData.userSettings || {}
    if (settings.telemetryEnabled !== undefined) {
      log.warn(`[Gemini OAuth] setUserSettings 未清除 telemetryEnabled`)
      return false
    }

    const getRes = await fetch(`${dailyBase}/v1internal:fetchUserInfo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': this.userAgent,
        'X-Goog-Api-Client': 'gl-node/22.21.1',
        'Host': 'daily-cloudcode-pa.googleapis.com'
      },
      body: JSON.stringify({ project: projectId })
    })

    if (!getRes.ok) {
      log.warn(`[Gemini OAuth] fetchUserInfo 失败: ${getRes.status}`)
      return false
    }

    const getData = await getRes.json()
    const getSettings = getData.userSettings || {}
    return getSettings.telemetryEnabled === undefined
  }

  async fetchAvailableModels(token, projectId) {
    const dailyBase = 'https://daily-cloudcode-pa.sandbox.googleapis.com'
    const res = await fetch(`${dailyBase}/v1internal:fetchAvailableModels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': this.userAgent
      },
      body: JSON.stringify({ project: projectId })
    })

    if (res.ok) {
      const data = await res.json()
      return data.models || {}
    }
    return {}
  }

  async models() {
    await this._ensureInitialized()

    let remoteModels = {}
    if (this.api_key && this.project_id) {
      try {
        remoteModels = await this.fetchAvailableModels(this.api_key, this.project_id)
      } catch (err) {
        log.warn(`[Gemini OAuth] 获取远程模型失败: ${err.message}`)
      }
    }

    const modelMap = new Map()

    for (const defaultModel of DEFAULT_GEMINI_OAUTH_MODELS) {
      modelMap.set(defaultModel.id, { ...defaultModel })
    }

    for (const [id, meta] of Object.entries(remoteModels)) {
      const cleanId = id.replace(/^models\//, '')
      modelMap.set(cleanId, {
        id: cleanId,
        displayName: meta.displayName || cleanId,
        owner: 'google'
      })
    }

    return Array.from(modelMap.values())
  }

  async *chat(params, e) {
    const timeMetrics = {
      startTime: Date.now(),
      firstTokenTime: null,
      model: params.model,
      requestId: e?.requestId,
      userId: e?.user?.id,
      userIp: e?.user?.ip,
      contactorId: e?.body?.contactorId,
      presetName: e?.body?.settings?.presetSettings?.name,
      isStream: !!params.stream
    }
    const modelName = params.model

    await this._ensureInitialized()

    const context = this
    const action = params.stream ? 'streamGenerateContent' : 'generateContent'
    const { systemInstruction, contents } = await context._preProcessMessage(
      params.messages,
    )

    const mappedSystemInstruction = mapPartsToCamelCase(systemInstruction)
    const mappedContents = mapPartsToCamelCase(contents)

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
      model: modelName.startsWith('models/') ? modelName.substring(7) : modelName,
      project: context.project_id || undefined,
      userAgent: context.userAgent,
      requestType: 'agent',
      requestId: `agent-${crypto.randomUUID()}`,
      request: {
        contents: mappedContents,
        systemInstruction: mappedSystemInstruction,
        generationConfig,
        safetySettings,
        tools,
        toolConfig,
        sessionId: generateStableSessionID(contents),
      },
    }

    if (global.debug || process.env.NODE_ENV === 'development') {
      log.info(`[Gemini OAuth] >>>>> 发起 LLM 请求 - 模型: ${modelName}, 动作: ${action}, 是否流式: ${!!params.stream}`)
      log.info(`[Gemini OAuth] >>>>> 请求 Payload 内容:`)
      log.json(wrappedPayload)
    } else {
      log.info(`[Gemini OAuth] 发起 LLM 请求 - 模型: ${modelName}, 动作: ${action}`)
    }

    const baseUrls = [
      context.base_url.replace(/\/v1internal\/?$/, '').replace(/\/+$/, ''),
      'https://daily-cloudcode-pa.sandbox.googleapis.com',
    ]

    const executeRequest = async (isTokenRetry = false) => {
      let lastError
      let finalResponse

      for (const currentBaseUrl of baseUrls) {
        const controller = new AbortController()
        if (e) e.onAbort(() => controller.abort())

        const url = `${currentBaseUrl}/v1internal:${action}${params.stream ? '?alt=sse' : ''}`

        if (global.debug || process.env.NODE_ENV === 'development') {
          log.info(`[Gemini OAuth] 发送 HTTP POST 请求 - 地址: ${url}`)
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
            log.warn(`[Gemini OAuth] 收到 403 错误，尝试移除 project 字段进行重试...`)
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
            log.warn(`[Gemini OAuth] Token 已失效 (401)，正在刷新 Access Token 并重新请求...`)
            await context.refreshAccessToken()
            return await executeRequest(true)
          }

          const errorBody = await finalResponse.text()
          lastError = new Error(`HTTP ${finalResponse.status}: ${errorBody}`)
          log.warn(`[Gemini OAuth] 请求返回非 200 状态码 (地址: ${url}) - 状态码: ${finalResponse.status}, 响应: ${errorBody}`)

          if (![429, 500, 502, 503, 504].includes(finalResponse.status)) {
            throw lastError
          }
        } catch (err) {
          if (err.name === 'AbortError') {
            log.warn(`[Gemini OAuth] 请求已被用户手动中止 (AbortError)`)
            throw err
          }
          if (err === lastError && finalResponse && ![429, 500, 502, 503, 504].includes(finalResponse.status)) {
            throw err
          }
          lastError = err
          log.warn(`[Gemini OAuth] 请求端点 ${url} 异常: ${err.message}`)
        }
      }

      throw lastError || new Error('Request failed')
    }

    const response = await executeRequest()

    if (params.stream) yield* context._processStreamResponse(response, timeMetrics)
    else {
      const data = await response.json()
      const usage = data.usageMetadata || data.response?.usageMetadata
      if (usage && usage.promptTokenCount !== undefined) {
        // 通过回调注入的 onUsage 上报用量，避免 lib 层直接依赖 BaseLLMAdapter
        if (this.onUsage) {
          this.onUsage(context.provider || 'Gemini OAuth', usage, timeMetrics)
        }
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
