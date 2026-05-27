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
      type: 'volcengine',
      avatarId: 'volcengine',
      avatarAliases: {
        volc: 'volcengine',
        '火山': 'volcengine',
        '火山引擎': 'volcengine'
      },
      name: 'Volcengine (火山引擎)',
      description:
        '火山引擎大模型服务平台（火山方舟）适配器。支持豆包等系列大模型，完全兼容 OpenAI 协议。请注意，在火山方舟中调用模型时，需使用控制台创建的 Endpoint ID 作为模型名称。\n\n**获取方式**：请前往 [火山方舟控制台](https://console.volcengine.com/ark) 注册并开通模型接入点，并在 [API Key 管理](https://console.volcengine.com/ark/apiKey) 页面创建 API 密钥。',
      supportedFeatures: [
        'chat',
        'streaming',
        'function_calling',
        'vision',
        'reasoning',
      ],
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
          placeholder: '例如：火山方舟-主要',
        },
        api_key: {
          type: 'password',
          default: '',
          description: '火山引擎 API 密钥',
          required: true,
          label: 'API Key',
          placeholder: 'API Key',
        },
        base_url: {
          type: 'url',
          default: 'https://ark.cn-beijing.volces.com/api/v3',
          description: '火山引擎 API 基础 URL',
          required: true,
          label: 'Base URL',
          placeholder: 'https://ark.cn-beijing.volces.com/api/v3',
        },
        models: {
          type: 'array',
          default: [],
          description: '可用的模型列表，通常由系统自动获取',
          required: false,
          label: '模型列表',
          readonly: true,
        },
      },
      extraSettingsSchema: {
        volcengine: {
          web_search: {
            type: 'group',
            label: '联网搜索 (SearchGPT)',
            fields: {
              enable: {
                type: 'boolean',
                default: false,
                label: '启用',
              },
              search_context_size: {
                type: 'select',
                label: '搜索深度',
                default: 'medium',
                options: [
                  { label: '低', value: 'low' },
                  { label: '中', value: 'medium' },
                  { label: '高', value: 'high' },
                ],
              },
              allowed_domains: {
                type: 'array',
                default: [],
                label: '白名单域名',
                placeholder: 'openai.com',
              },
              blocked_domains: {
                type: 'array',
                default: [],
                label: '黑名单域名',
              },
            },
          },
        },
      },
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
