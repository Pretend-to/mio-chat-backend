import OpenAIBot from './openai.js'

/**
 * @class Meituan (美团龙猫) 适配器
 * 完全继承自 OpenAIBot，仅修改元数据与特有标识
 */
export default class MeituanAdapter extends OpenAIBot {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      avatarAliases: {
        longcat: 'longcat',
        '美团': 'longcat',
        '龙猫': 'longcat'
      },
      avatarId: 'longcat',
      description:
        '美团龙猫大模型（LongCat）开放平台服务适配器。支持 LongCat 系列模型，完全兼容 OpenAI 协议。\n\n**获取方式**：请前往 [美团龙猫大模型平台](https://longcat.chat/platform/) 注册并申请您的 API 密钥。',
      initialConfigSchema: {
        api_key: {
          default: '',
          description: '龙猫 API 密钥',
          label: 'API Key',
          placeholder: 'API Key',
          required: true,
          type: 'password',
        },
        base_url: {
          default: 'https://api.longcat.chat/openai',
          description: '龙猫 API 基础 URL',
          label: 'Base URL',
          placeholder: 'https://api.longcat.chat/openai',
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
          placeholder: '例如：龙猫-主要',
          required: false,
          type: 'string',
        },
      },
      name: 'Meituan (美团龙猫)',
      supportedFeatures: ['chat', 'streaming', 'vision'],
      type: 'meituan',
    }
  }

  /**
   * 构造函数
   */
  constructor(meituanConfig) {
    super(meituanConfig)
    this.provider = 'meituan'
  }
}
