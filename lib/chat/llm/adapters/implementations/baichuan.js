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
      type: 'baichuan',
      avatarId: 'baichuan',
      avatarAliases: {
        baichuan: 'baichuan',
        '百川智能': 'baichuan',
        '百川': 'baichuan'
      },
      name: 'Baichuan (百川智能)',
      description:
        '百川智能（Baichuan）大模型开放平台服务适配器。支持 Baichuan3, Baichuan4 等系列模型，在医疗、搜索增强等领域具备业界领先表现，兼容 OpenAI 协议。\n\n**获取方式**：请前往 [百川智能开放平台](https://platform.baichuan-ai.com) 注册并获取 API Key。',
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
          placeholder: '例如：百川-主要',
        },
        api_key: {
          type: 'password',
          default: '',
          description: '百川智能 API 密钥',
          required: true,
          label: 'API Key',
          placeholder: 'API Key',
        },
        base_url: {
          type: 'url',
          default: 'https://api.baichuan-ai.com/v1',
          description: '百川智能 API 基础 URL',
          required: true,
          label: 'Base URL',
          placeholder: 'https://api.baichuan-ai.com/v1',
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
  constructor(baichuanConfig) {
    super(baichuanConfig)
    this.provider = 'baichuan'
  }
}
