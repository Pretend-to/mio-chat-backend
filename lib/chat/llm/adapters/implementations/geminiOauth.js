
import GeminiAdapter from './gemini.js'
import { GeminiOauth } from '../lib/geminiOauthClient.js'
import { GEMINI_SAFETY_SETTINGS_SCHEMA } from '../lib/geminiSafetySettings.js'
import {
  ClientID,
  RedirectURI,
  Scopes,
  generateState,
  generateCodeVerifier,
  generateCodeChallenge
} from '../lib/geminiOauthHelper.js'

import logger from '../../../../../utils/logger.js'

const log = logger

export default class GeminiOauthAdapter extends GeminiAdapter {
  static getAdapterMetadata() {
    const state = generateState()
    const verifier = generateCodeVerifier()
    const challenge = generateCodeChallenge(verifier)

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${ClientID}&redirect_uri=${encodeURIComponent(RedirectURI)}&response_type=code&scope=${encodeURIComponent(Scopes)}&state=${state}&code_challenge=${challenge}&code_challenge_method=S256&access_type=offline&prompt=consent`

    return {
      type: 'geminiOauth',
      avatarId: 'gemini',
      avatarAliases: {
        geminioauth: 'gemini'
      },
      name: 'Antigravity OAuth',
      description: `Antigravity 专属的 Google 凭证云授权模式。\n\n**使用流程**：\n1. 点击下方"云授权链接"并在浏览器中登录 Google 账号；\n2. 授权完成后，浏览器会被重定向到以 \`http://localhost:8085/callback...\` 开头的地址（页面显示错误是正常现象）；\n3. 请复制浏览器地址栏的**完整 URL**，将其粘贴到下方的 API Key 栏中并保存即可。\n\n[🔑 点击前往 Google 云授权链接](${authUrl})`,
      supportedFeatures: ['chat', 'streaming', 'vision', 'multimodal'],
      requiresSpecialAuth: true,
      isShielded: false,
      initialConfigSchema: {
        enable: {
          type: 'boolean',
          default: true,
          required: true,
          label: '启用',
        },
        name: {
          type: 'string',
          default: '',
          required: false,
          label: '实例名称',
          placeholder: '例如：Google-云授权',
        },
        api_key: {
          type: 'password',
          default: '',
          required: true,
          label: 'Authorization Code / Redirect URL',
          placeholder: 'http://localhost:8085/callback?code=...',
        },
        base_url: {
          type: 'url',
          default: 'https://cloudcode-pa.googleapis.com',
          required: true,
          label: 'Base URL',
          placeholder: 'https://cloudcode-pa.googleapis.com',
        }
      },
      extraSettingsSchema: {
        gemini: {
          imageGeneration: {
            type: 'boolean',
            default: false,
            label: '图像生成 (DALL-E style)',
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
      }
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
        success: true,
        ownerCount: this.models.length,
        modelsCount: models.length,
        guestOwnerCount: this.guestModels.length,
        guestModelsCount: this._calculateTotalModels(this.guestModels),
        models: this.models,
        isShielded: false
      }
    } catch (err) {
      log.error(`[Gemini OAuth] 获取模型失败: ${err.message}`)
      this.models = []
      this.guestModels = []
      return {
        success: false,
        error: err.message,
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
