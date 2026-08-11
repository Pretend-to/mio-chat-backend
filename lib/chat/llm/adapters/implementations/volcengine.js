import OpenAIResponsesBot from './openai-responses.js'

/**
 * @class Volcengine (火山引擎) 适配器
 * 完全继承自 OpenAIResponsesBot，仅修改元数据与特有标识
 */
export default class VolcengineAdapter extends OpenAIResponsesBot {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      avatarAliases: {
        volc: 'volcengine',
        '火山': 'volcengine',
        '火山引擎': 'volcengine'
      },
      avatarId: 'volcengine',
      description:
        '火山引擎大模型服务平台（火山方舟）适配器。支持豆包等系列大模型，完全兼容 OpenAI 协议。请注意，在火山方舟中调用模型时，需使用控制台创建的 Endpoint ID 作为模型名称。\n\n**获取方式**：请前往 [火山方舟控制台](https://console.volcengine.com/ark) 注册并开通模型接入点，并在 [API Key 管理](https://console.volcengine.com/ark/apiKey) 页面创建 API 密钥。',
      extraSettingsSchema: {
        volcengine: {
          web_search: {
            fields: {
              allowed_domains: {
                default: [],
                label: '白名单域名',
                placeholder: 'openai.com',
                type: 'array',
              },
              blocked_domains: {
                default: [],
                label: '黑名单域名',
                type: 'array',
              },
              enable: {
                default: false,
                label: '启用',
                type: 'boolean',
              },
              search_context_size: {
                default: 'medium',
                label: '搜索深度',
                options: [
                  { label: '低', value: 'low' },
                  { label: '中', value: 'medium' },
                  { label: '高', value: 'high' },
                ],
                type: 'select',
              },
            },
            label: '联网搜索 (SearchGPT)',
            type: 'group',
          },
        },
      },
      initialConfigSchema: {
        api_key: {
          default: '',
          description: '火山引擎 API 密钥',
          label: 'API Key',
          placeholder: 'API Key',
          required: true,
          type: 'password',
        },
        base_url: {
          default: 'https://ark.cn-beijing.volces.com/api/v3',
          description: '火山引擎 API 基础 URL',
          label: 'Base URL',
          placeholder: 'https://ark.cn-beijing.volces.com/api/v3',
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
        models: {
          default: [],
          description: '可用的模型列表，通常由系统自动获取',
          label: '模型列表',
          readonly: true,
          required: false,
          type: 'array',
        },
        name: {
          default: '',
          description: '适配器实例的自定义名称',
          label: '实例名称',
          placeholder: '例如：火山方舟-主要',
          required: false,
          type: 'string',
        },
      },
      name: 'Volcengine (火山引擎)',
      supportedFeatures: [
        'chat',
        'streaming',
        'function_calling',
        'vision',
        'reasoning',
      ],
      type: 'volcengine',
    }
  }

  /**
   * 构造函数
   */
  constructor(volcConfig) {
    super(volcConfig)
    this.provider = 'volcengine'
  }
}
