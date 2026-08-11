import OpenAIResponsesBot from './openai-responses.js'

/**
 * @class xAI Grok 适配器 (继承自 OpenAI Responses API)
 */
export default class XAIAdapter extends OpenAIResponsesBot {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      avatarAliases: {
        grok: 'xai'
      },
      avatarId: 'xai',
      description:
        'xAI Grok 官方 API 适配器。提供对 Grok 系列模型的访问，具备强大的实时信息处理能力，支持独特的 X 平台（原 Twitter）实时信息搜索。接口设计完全兼容 OpenAI 标准。\n\n**获取方式**：在 [xAI Console](https://console.x.ai/) 创建 API 密钥。',
      extraSettingsSchema: {
        xai: {
          web_search: {
            fields: {
              allowed_domains: { default: [], label: '包含域名', placeholder: '如: x.ai', type: 'array' },
              enable: { default: false, label: '启用网络搜索 (web_search)', type: 'boolean' },
              enable_image_understanding: { default: false, label: '搜索结果图片理解', type: 'boolean' },
              excluded_domains: { default: [], label: '排除域名', type: 'array' }
            },
            label: '联网搜索',
            type: 'group'
          },
          x_search: {
            fields: {
              allowed_x_handles: { default: [], label: '限定账号', placeholder: '如: elonmusk', type: 'array' },
              enable: { default: false, label: '启用 X 平台搜索 (x_search)', type: 'boolean' },
              enable_image_understanding: { default: false, label: '帖子图片理解', type: 'boolean' },
              enable_video_understanding: { default: false, label: '帖子视频理解', type: 'boolean' },
              excluded_x_handles: { default: [], label: '排除账号', type: 'array' }
            },
            label: 'X 平台搜索',
            type: 'group'
          }
        }
      },
      initialConfigSchema: {
        api_key: {
          default: '',
          description: 'xAI API 密钥',
          label: 'API Key',
          required: true,
          type: 'password',
        },
        base_url: {
          default: 'https://api.x.ai/v1',
          description: 'xAI API 的基础 URL',
          label: 'Base URL',
          required: false,
          type: 'url',
        },
        enable: {
          default: true,
          description: '是否启用此适配器实例',
          label: '启用',
          required: true,
          type: 'boolean',
        },
        name: {
          default: '',
          description: '适配器实例的自定义名称',
          label: '实例名称',
          required: false,
          type: 'string',
        },
      },
      name: 'xAI Grok',
      supportedFeatures: ['chat', 'streaming', 'vision', 'reasoning', 'web_search'],
      type: 'xai'
    }
  }

  constructor(config) {
    super(config)
    this.provider = 'xai'
  }

  // 重写 _prepareChatBody 以注入 xAI 特有的工具
  async _prepareChatBody(body) {
    // 调用父类的通用 Responses API 组装逻辑
    const preparedBody = await super._prepareChatBody(body)

    // XAI 的 grok-4.20 / grok-4-1-fast 不支持 reasoning.effort 参数，传了会报错
    // (只有 grok-4.20-multi-agent 用 reasoning.effort 控制 agent 数量，非思考深度)
    if (preparedBody.reasoning) {
      delete preparedBody.reasoning
    }

    const { extraSettings = {} } = body.settings || {}
    const xaiSettings = extraSettings?.xai || extraSettings || {}

    const isEnabled = (v) => {
      if (v === true || v === 'true' || v === 1) {return true}
      if (typeof v === 'object' && v !== null && (v.enable === true || v.enabled === true)) {return true}
      return false
    }

    // 注入或配置 xAI 特有的内置工具
    if (!preparedBody.tools) {preparedBody.tools = []}

    if (isEnabled(xaiSettings.web_search)) {
      const ws = typeof xaiSettings.web_search === 'object' ? xaiSettings.web_search : {}
      const existingIdx = preparedBody.tools.findIndex((t) => t.type === 'web_search')
      const toolObj = {
        type: 'web_search',
        web_search: {
          allowed_domains: ws.allowed_domains?.length > 0 ? ws.allowed_domains : undefined,
          enable_image_understanding: ws.enable_image_understanding || undefined,
          excluded_domains: ws.excluded_domains?.length > 0 ? ws.excluded_domains : undefined,
        }
      }
      if (existingIdx !== -1) {
        preparedBody.tools[existingIdx] = toolObj
      } else {
        preparedBody.tools.push(toolObj)
      }
    }

    if (isEnabled(xaiSettings.x_search)) {
      const xs = typeof xaiSettings.x_search === 'object' ? xaiSettings.x_search : {}
      const existingIdx = preparedBody.tools.findIndex((t) => t.type === 'x_search')
      const toolObj = {
        type: 'x_search',
        x_search: {
          allowed_x_handles: xs.allowed_x_handles?.length > 0 ? xs.allowed_x_handles : undefined,
          enable_image_understanding: xs.enable_image_understanding || undefined,
          enable_video_understanding: xs.enable_video_understanding || undefined,
          excluded_x_handles: xs.excluded_x_handles?.length > 0 ? xs.excluded_x_handles : undefined,
        }
      }
      if (existingIdx !== -1) {
        preparedBody.tools[existingIdx] = toolObj
      } else {
        preparedBody.tools.push(toolObj)
      }
    }

    // 如果没有工具，删掉空数组
    if (preparedBody.tools.length === 0) {delete preparedBody.tools}

    return preparedBody
  }
}
