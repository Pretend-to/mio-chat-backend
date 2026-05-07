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
      type: 'xai',
      name: 'xAI Grok',
      description: 'xAI Grok 系列模型，支持 web_search 和 x_search 内置搜索功能',
      supportedFeatures: ['chat', 'streaming', 'vision', 'reasoning', 'web_search'],
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
        },
        api_key: {
          type: 'password',
          default: '',
          description: 'xAI API 密钥',
          required: true,
          label: 'API Key',
        },
        base_url: {
          type: 'url',
          default: 'https://api.x.ai/v1',
          description: 'xAI API 的基础 URL',
          required: true,
          label: 'Base URL',
        },
      },
      extraSettingsSchema: {
        xai: {
          web_search: {
            type: 'group',
            label: '联网搜索',
            fields: {
              enable: { type: 'boolean', default: false, label: '启用网络搜索 (web_search)' },
              allowed_domains: { type: 'array', default: [], label: '包含域名', placeholder: '如: x.ai' },
              excluded_domains: { type: 'array', default: [], label: '排除域名' },
              enable_image_understanding: { type: 'boolean', default: false, label: '搜索结果图片理解' }
            }
          },
          x_search: {
            type: 'group',
            label: 'X 平台搜索',
            fields: {
              enable: { type: 'boolean', default: false, label: '启用 X 平台搜索 (x_search)' },
              allowed_x_handles: { type: 'array', default: [], label: '限定账号', placeholder: '如: elonmusk' },
              excluded_x_handles: { type: 'array', default: [], label: '排除账号' },
              enable_image_understanding: { type: 'boolean', default: false, label: '帖子图片理解' },
              enable_video_understanding: { type: 'boolean', default: false, label: '帖子视频理解' }
            }
          }
        }
      }
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
    const { extraSettings } = body.settings
    const xaiSettings = extraSettings?.xai || {}

    // 注入 xAI 特有的内置工具
    if (!preparedBody.tools) preparedBody.tools = []

    if (xaiSettings.web_search?.enable) {
      const ws = xaiSettings.web_search
      preparedBody.tools.push({
        type: 'web_search',
        web_search: {
          allowed_domains: ws.allowed_domains?.length > 0 ? ws.allowed_domains : undefined,
          excluded_domains: ws.excluded_domains?.length > 0 ? ws.excluded_domains : undefined,
          enable_image_understanding: ws.enable_image_understanding || undefined,
        }
      })
    }

    if (xaiSettings.x_search?.enable) {
      const xs = xaiSettings.x_search
      preparedBody.tools.push({
        type: 'x_search',
        x_search: {
          allowed_x_handles: xs.allowed_x_handles?.length > 0 ? xs.allowed_x_handles : undefined,
          excluded_x_handles: xs.excluded_x_handles?.length > 0 ? xs.excluded_x_handles : undefined,
          enable_image_understanding: xs.enable_image_understanding || undefined,
          enable_video_understanding: xs.enable_video_understanding || undefined,
        }
      })
    }

    // 如果没有工具，删掉空数组
    if (preparedBody.tools.length === 0) delete preparedBody.tools

    return preparedBody
  }
}
