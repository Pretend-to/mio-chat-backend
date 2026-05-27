import OpenAIBot from './openai.js'

/**
 * @class Xiaomi MiMo 适配器
 * 完全继承自 OpenAIBot，仅修改元数据与特有标识
 */
export default class XiaomiMiMoAdapter extends OpenAIBot {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      type: 'xiaomimimo',
      avatarId: 'xiaomimimo',
      avatarAliases: {
        xiaomi: 'xiaomimimo',
        mimo: 'xiaomimimo',
        '小米': 'xiaomimimo'
      },
      name: 'Xiaomi MiMo',
      description:
        '小米大模型开放平台（MiMo）服务适配器。支持 MiMo 系列模型，完全兼容 OpenAI 协议。可以使用 `mimo-v2.5-pro`、`mimo-v2-flash` 等模型。\n\n**获取方式**：请前往 [小米大模型开放平台](https://platform.xiaomimimo.com/) 注册并申请 API Key。',
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
          placeholder: '例如：小米-主要',
        },
        api_key: {
          type: 'password',
          default: '',
          description: '小米 API 密钥',
          required: true,
          label: 'API Key',
          placeholder: 'API Key',
        },
        base_url: {
          type: 'url',
          default: 'https://api.xiaomimimo.com/v1',
          description: '小米 API 基础 URL',
          required: true,
          label: 'Base URL',
          placeholder: 'https://api.xiaomimimo.com/v1',
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
  constructor(mimoConfig) {
    super(mimoConfig)
    this.provider = 'xiaomimimo'
  }
}
