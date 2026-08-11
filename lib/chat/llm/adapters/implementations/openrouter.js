import OpenAIBot from './openai.js'

/**
 * @class OpenRouter 适配器
 * 完全继承自 OpenAIBot，仅修改元数据与特有标识
 */
export default class OpenRouterAdapter extends OpenAIBot {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      avatarAliases: {
        openrouter: 'openrouter',
        or: 'openrouter'
      },
      avatarId: 'openrouter',
      description:
        'OpenRouter 统一大模型 API 服务适配器。支持访问数百种开源和闭源大语言模型，完全兼容 OpenAI 接口协议。\n\n**获取方式**：请前往 [OpenRouter 官网](https://openrouter.ai) 注册并创建 API Key。',
      initialConfigSchema: {
        api_key: {
          default: '',
          description: 'OpenRouter API 密钥',
          label: 'API Key',
          placeholder: 'API Key',
          required: true,
          type: 'password',
        },
        base_url: {
          default: 'https://openrouter.ai/api/v1',
          description: 'OpenRouter API 基础 URL',
          label: 'Base URL',
          placeholder: 'https://openrouter.ai/api/v1',
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
          placeholder: '例如：OpenRouter-主要',
          required: false,
          type: 'string',
        },
      },
      name: 'OpenRouter',
      supportedFeatures: ['chat', 'streaming', 'vision'],
      type: 'openrouter',
    }
  }

  /**
   * 构造函数
   */
  constructor(openrouterConfig) {
    super(openrouterConfig)
    this.provider = 'openrouter'
  }
}
