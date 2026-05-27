import OpenAIBot from './openai.js'

/**
 * @class Kuaishou (快手可灵) 适配器
 * 完全继承自 OpenAIBot，仅修改元数据与特有标识
 */
export default class KuaishouAdapter extends OpenAIBot {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      type: 'kuaishou',
      avatarId: 'kling',
      avatarAliases: {
        kling: 'kling',
        kwaiyii: 'kling',
        '快手': 'kling',
        '可灵': 'kling',
        '快意': 'kling'
      },
      name: 'Kuaishou (快手可灵)',
      description:
        '快手大模型与可灵 AI（Kling AI）开放平台服务适配器。支持快手快意大语言模型及可灵 AI 系列模型，完全兼容 OpenAI 接口协议。\n\n**获取方式**：请前往 [可灵 AI 官网](https://klingai.kuaishou.com) 注册，进入 API 开放平台购买资源并获取 API Key。',
      supportedFeatures: ['chat', 'streaming', 'vision'],
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
          placeholder: '例如：可灵-主要',
        },
        api_key: {
          type: 'password',
          default: '',
          description: '可灵 AI API 密钥',
          required: true,
          label: 'API Key',
          placeholder: 'API Key',
        },
        base_url: {
          type: 'url',
          default: 'https://api.klingai.com/v1',
          description: '可灵 AI API 基础 URL',
          required: true,
          label: 'Base URL',
          placeholder: 'https://api.klingai.com/v1',
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
    }
  }

  /**
   * 构造函数
   */
  constructor(kuaishouConfig) {
    super(kuaishouConfig)
    this.provider = 'kuaishou'
  }
}
