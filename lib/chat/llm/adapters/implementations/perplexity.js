import OpenAIBot from './openai.js'

/**
 * @class Perplexity AI 适配器
 * 完全继承自 OpenAIBot，仅修改元数据与特有标识
 */
export default class PerplexityAdapter extends OpenAIBot {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      avatarAliases: {
        perplexity: 'perplexity'
      },
      avatarId: 'perplexity',
      description:
        'Perplexity AI 搜素增强大模型适配器。提供基于实时联网搜索的智能回答大模型（Sonar 系列），完全兼容 OpenAI 协议。\n\n**获取方式**：请前往 [Perplexity 官网](https://www.perplexity.ai) 注册并在 API Settings 购买资源并生成 API Key。',
      initialConfigSchema: {
        api_key: {
          default: '',
          description: 'Perplexity API 密钥',
          label: 'API Key',
          placeholder: 'API Key',
          required: true,
          type: 'password',
        },
        base_url: {
          default: 'https://api.perplexity.ai',
          description: 'Perplexity API 基础 URL',
          label: 'Base URL',
          placeholder: 'https://api.perplexity.ai',
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
          placeholder: '例如：Perplexity-主要',
          required: false,
          type: 'string',
        },
      },
      name: 'Perplexity',
      supportedFeatures: ['chat', 'streaming', 'vision'],
      type: 'perplexity',
    }
  }

  /**
   * 构造函数
   */
  constructor(perplexityConfig) {
    super(perplexityConfig)
    this.provider = 'perplexity'
  }
}
