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
      avatarAliases: {
        '01.ai': 'zeroone',
        yi: 'zeroone',
        zeroone: 'zeroone',
        '零一': 'zeroone',
        '零一万物': 'zeroone'
      },
      avatarId: 'zeroone',
      description:
        '零一万物（01.AI）开放平台服务适配器。支持 Yi 系列模型，提供领先的中文和双语语言理解能力，完全兼容 OpenAI 协议。\n\n**获取方式**：请前往 [零一万物开放平台](https://platform.lingyiwanwu.com) 注册并获取 API Key。',
      initialConfigSchema: {
        api_key: {
          default: '',
          description: '零一万物 API 密钥',
          label: 'API Key',
          placeholder: 'API Key',
          required: true,
          type: 'password',
        },
        base_url: {
          default: 'https://api.lingyiwanwu.com/v1',
          description: '零一万物 API 基础 URL',
          label: 'Base URL',
          placeholder: 'https://api.lingyiwanwu.com/v1',
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
          placeholder: '例如：零一万物-主要',
          required: false,
          type: 'string',
        },
      },
      name: '01.AI (零一万物)',
      supportedFeatures: ['chat', 'streaming', 'vision'],
      type: 'zeroone',
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
