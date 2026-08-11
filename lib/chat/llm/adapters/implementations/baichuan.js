import OpenAIBot from './openai.js'

/**
 * @class Baichuan (百川智能) 适配器
 * 完全继承自 OpenAIBot，仅修改元数据与特有标识
 */
export default class BaichuanAdapter extends OpenAIBot {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      avatarAliases: {
        baichuan: 'baichuan',
        '百川': 'baichuan',
        '百川智能': 'baichuan'
      },
      avatarId: 'baichuan',
      description:
        '百川智能（Baichuan）大模型开放平台服务适配器。支持 Baichuan3, Baichuan4 等系列模型，在医疗、搜索增强等领域具备业界领先表现，兼容 OpenAI 协议。\n\n**获取方式**：请前往 [百川智能开放平台](https://platform.baichuan-ai.com) 注册并获取 API Key。',
      initialConfigSchema: {
        api_key: {
          default: '',
          description: '百川智能 API 密钥',
          label: 'API Key',
          placeholder: 'API Key',
          required: true,
          type: 'password',
        },
        base_url: {
          default: 'https://api.baichuan-ai.com/v1',
          description: '百川智能 API 基础 URL',
          label: 'Base URL',
          placeholder: 'https://api.baichuan-ai.com/v1',
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
          placeholder: '例如：百川-主要',
          required: false,
          type: 'string',
        },
      },
      name: 'Baichuan (百川智能)',
      supportedFeatures: ['chat', 'streaming', 'vision'],
      type: 'baichuan',
    }
  }

  /**
   * 构造函数
   */
  constructor(baichuanConfig) {
    super(baichuanConfig)
    this.provider = 'baichuan'
  }
}
