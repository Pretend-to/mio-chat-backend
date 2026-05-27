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
      type: 'minimax',
      avatarId: 'minimax',
      avatarAliases: {
        minimax: 'minimax'
      },
      name: 'Minimax (海螺 AI)',
      description:
        'Minimax 官方 API 适配器。支持 Abab-6.5 系列大语言模型，具备出色的中文理解、逻辑推理及拟人化角色扮演能力，兼容 OpenAI 协议。\n\n**获取方式**：请前往 [Minimax 开放平台](https://platform.minimaxi.com) 注册并创建 API Key。',
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
          placeholder: '例如：Minimax-主要',
        },
        api_key: {
          type: 'password',
          default: '',
          description: 'Minimax API 密钥',
          required: true,
          label: 'API Key',
          placeholder: 'API Key',
        },
        base_url: {
          type: 'url',
          default: 'https://api.minimax.chat/v1',
          description: 'Minimax API 基础 URL',
          required: true,
          label: 'Base URL',
          placeholder: 'https://api.minimax.chat/v1',
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
  constructor(minimaxConfig) {
    super(minimaxConfig)
    this.provider = 'minimax'
  }
}
