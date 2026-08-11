import OpenAIBot from './openai.js'

/**
 * @class Minimax (海螺 AI) 适配器
 * 完全继承自 OpenAIBot，仅修改元数据与特有标识
 */
export default class MinimaxAdapter extends OpenAIBot {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      avatarAliases: {
        minimax: 'minimax'
      },
      avatarId: 'minimax',
      description:
        'Minimax 官方 API 适配器。支持 Abab-6.5 系列大语言模型，具备出色的中文理解、逻辑推理及拟人化角色扮演能力，兼容 OpenAI 协议。\n\n**获取方式**：请前往 [Minimax 开放平台](https://platform.minimaxi.com) 注册并创建 API Key。',
      initialConfigSchema: {
        api_key: {
          default: '',
          description: 'Minimax API 密钥',
          label: 'API Key',
          placeholder: 'API Key',
          required: true,
          type: 'password',
        },
        base_url: {
          default: 'https://api.minimax.chat/v1',
          description: 'Minimax API 基础 URL',
          label: 'Base URL',
          placeholder: 'https://api.minimax.chat/v1',
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
          placeholder: '例如：Minimax-主要',
          required: false,
          type: 'string',
        },
      },
      name: 'Minimax (海螺 AI)',
      supportedFeatures: ['chat', 'streaming', 'vision'],
      type: 'minimax',
    }
  }

  /**
   * 构造函数
   */
  constructor(minimaxConfig) {
    super(minimaxConfig)
    this.provider = 'minimax'
  }
}
