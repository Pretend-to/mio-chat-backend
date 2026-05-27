import OpenAIBot from './openai.js'

/**
 * @class ZeroOne (零一万物) 适配器
 * 完全继承自 OpenAIBot，仅修改元数据与特有标识
 */
export default class ZeroOneAdapter extends OpenAIBot {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      type: 'zeroone',
      avatarId: 'zeroone',
      avatarAliases: {
        zeroone: 'zeroone',
        '01.ai': 'zeroone',
        yi: 'zeroone',
        '零一万物': 'zeroone',
        '零一': 'zeroone'
      },
      name: '01.AI (零一万物)',
      description:
        '零一万物（01.AI）开放平台服务适配器。支持 Yi 系列模型，提供领先的中文和双语语言理解能力，完全兼容 OpenAI 协议。\n\n**获取方式**：请前往 [零一万物开放平台](https://platform.lingyiwanwu.com) 注册并获取 API Key。',
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
          placeholder: '例如：零一万物-主要',
        },
        api_key: {
          type: 'password',
          default: '',
          description: '零一万物 API 密钥',
          required: true,
          label: 'API Key',
          placeholder: 'API Key',
        },
        base_url: {
          type: 'url',
          default: 'https://api.lingyiwanwu.com/v1',
          description: '零一万物 API 基础 URL',
          required: true,
          label: 'Base URL',
          placeholder: 'https://api.lingyiwanwu.com/v1',
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
  constructor(zerooneConfig) {
    super(zerooneConfig)
    this.provider = 'zeroone'
  }
}
