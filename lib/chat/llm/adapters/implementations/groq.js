import OpenAIBot from './openai.js'

/**
 * @class Groq 适配器
 * 完全继承自 OpenAIBot，仅修改元数据与特有标识
 */
export default class GroqAdapter extends OpenAIBot {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      avatarAliases: {
        groq: 'groq'
      },
      avatarId: 'groq',
      description:
        'Groq 极速大模型服务适配器。支持 Llama-3, Mixtral, Gemma 等模型，采用专属 LPU 技术实现极致的生成速度，兼容 OpenAI 协议。\n\n**获取方式**：请前往 [Groq Console](https://console.groq.com) 注册并创建 API Key。',
      initialConfigSchema: {
        api_key: {
          default: '',
          description: 'Groq API 密钥',
          label: 'API Key',
          placeholder: 'API Key',
          required: true,
          type: 'password',
        },
        base_url: {
          default: 'https://api.groq.com/openai/v1',
          description: 'Groq API 基础 URL',
          label: 'Base URL',
          placeholder: 'https://api.groq.com/openai/v1',
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
          placeholder: '例如：Groq-主要',
          required: false,
          type: 'string',
        },
      },
      name: 'Groq',
      supportedFeatures: ['chat', 'streaming', 'vision'],
      type: 'groq',
    }
  }

  /**
   * 构造函数
   */
  constructor(groqConfig) {
    super(groqConfig)
    this.provider = 'groq'
  }
}
