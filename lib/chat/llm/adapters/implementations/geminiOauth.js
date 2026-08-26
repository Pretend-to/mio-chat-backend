import GeminiAdapter from './gemini.js'
import { GeminiOauth } from '../lib/geminiOauthClient.js'
import { GEMINI_SAFETY_SETTINGS_SCHEMA } from '../lib/geminiSafetySettings.js'
import {
  ClientID,
  RedirectURI,
  Scopes,
  encryptState,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
  sessionStore
} from '../lib/geminiOauthHelper.js'

const log = logger

let activeOAuthSession = null

export default class GeminiOauthAdapter extends GeminiAdapter {
  static getAdapterMetadata() {
    let state
    let verifier
    let challenge

    const now = Date.now()
    const reuseWindow = 10 * 60 * 1000 // 10 minutes

    if (activeOAuthSession && (now - activeOAuthSession.createdAt < reuseWindow)) {
      state = activeOAuthSession.state
      verifier = activeOAuthSession.verifier
      challenge = generateCodeChallenge(verifier)
      sessionStore.set(state, { createdAt: activeOAuthSession.createdAt, verifier })
      log.debug(`[Gemini OAuth] 复用 10 分钟内的内存 OAuth 会话 state=${state.substring(0, 10)}...`)
    } else {
      verifier = generateCodeVerifier()
      state = encryptState(verifier, now) || generateState()
      challenge = generateCodeChallenge(verifier)
      activeOAuthSession = {
        challenge,
        createdAt: now,
        state,
        verifier
      }
      sessionStore.set(state, { createdAt: now, verifier })
      log.info(`[Gemini OAuth] 生成新内存 OAuth 会话 state=${state.substring(0, 10)}...`)
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${ClientID}&redirect_uri=${encodeURIComponent(RedirectURI)}&response_type=code&scope=${encodeURIComponent(Scopes)}&state=${state}&code_challenge=${challenge}&code_challenge_method=S256&access_type=offline&prompt=consent&include_granted_scopes=true`

    return {
      avatarAliases: {
        geminioauth: 'gemini'
      },
      avatarId: 'gemini',
      description: `Antigravity 专属的 Google 凭证云授权模式。\n\n**使用流程**：\n1. 点击下方"云授权链接"并在浏览器中登录 Google 账号；\n2. 授权完成后，浏览器会被重定向到以 \`http://localhost:8085/callback...\` 开头的地址（页面显示错误是正常现象）；\n3. 请复制浏览器地址栏的**完整 URL**，或者直接复制页面上展示的 **Authorization Code**，将其粘贴到下方的 **Authorization Code / Redirect URL** 输入框中并保存即可。\n\n[🔑 点击前往 Google 云授权链接](${authUrl})`,
      extraSettingsSchema: {
        gemini: {
          imageGeneration: {
            default: false,
            label: '图像生成 (DALL-E style)',
            type: 'boolean',
          },
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
          label: 'Authorization Code / Redirect URL',
          placeholder: '请输入以 4/0Ad 开始的 Authorization Code 或完整 Redirect URL',
          required: true,
          type: 'password',
        },
        base_url: {
          default: 'https://cloudcode-pa.googleapis.com',
          label: 'Base URL',
          placeholder: 'https://cloudcode-pa.googleapis.com',
          required: false,
          type: 'url',
        },
        enable: {
          default: true,
          label: '启用',
          required: true,
          type: 'boolean',
        },
        name: {
          default: '',
          label: '实例名称',
          placeholder: '例如：Google-云授权',
          required: false,
          type: 'string',
        }
      },
      isShielded: false,
      name: 'Antigravity OAuth',
      requiresSpecialAuth: true,
      type: 'geminiOauth'
    }
  }

  constructor(config) {
    super(config)
    // 注入 onUsage 回调，让 lib 层的 GeminiOauth 能调用 adapter 的 logUsage
    this._core = new GeminiOauth({
      ...config,
      onUsage: this.logUsage.bind(this)
    })
  }

  get core() {
    return this._core
  }

  async loadModels() {
    try {
      const models = await this.core.models()
      const groupedModels = this._groupModelsByOwner(models)
      this.models = this._sortModelList(groupedModels)
      this.guestModels = this._filterGuestModels()

      return {
        guestModelsCount: this._calculateTotalModels(this.guestModels),
        guestOwnerCount: this.guestModels.length,
        isShielded: false,
        models: this.models,
        modelsCount: models.length,
        ownerCount: this.models.length,
        success: true
      }
    } catch (error) {
      log.error(`[Gemini OAuth] 获取模型失败: ${error.message}`)
      this.models = []
      this.guestModels = []
      return {
        success: false,
        error: error.message,
        ownerCount: 0,
        modelsCount: 0,
        guestOwnerCount: 0,
        guestModelsCount: 0,
        models: [],
        isShielded: false
      }
    }
  }
}
