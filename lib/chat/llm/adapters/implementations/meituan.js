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
      type: 'meituan',
      avatarId: 'longcat',
      avatarAliases: {
        longcat: 'longcat',
        '美团': 'longcat',
        '龙猫': 'longcat'
      },
      name: 'Meituan (美团龙猫)',
      description:
        '美团龙猫大模型（LongCat）开放平台服务适配器。支持 LongCat 系列模型，完全兼容 OpenAI 协议。\n\n**获取方式**：请前往 [美团龙猫大模型平台](https://longcat.chat/platform/) 注册并申请您的 API 密钥。',
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
          placeholder: '例如：龙猫-主要',
        },
        api_key: {
          type: 'password',
          default: '',
          description: '龙猫 API 密钥',
          required: true,
          label: 'API Key',
          placeholder: 'API Key',
        },
        base_url: {
          type: 'url',
          default: 'https://api.longcat.chat/openai',
          description: '龙猫 API 基础 URL',
          required: true,
          label: 'Base URL',
          placeholder: 'https://api.longcat.chat/openai',
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
  constructor(meituanConfig) {
    super(meituanConfig)
    this.provider = 'meituan'
  }
}
