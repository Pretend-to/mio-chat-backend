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
      type: 'groq',
      avatarId: 'groq',
      avatarAliases: {
        groq: 'groq'
      },
      name: 'Groq',
      description:
        'Groq 极速大模型服务适配器。支持 Llama-3, Mixtral, Gemma 等模型，采用专属 LPU 技术实现极致的生成速度，兼容 OpenAI 协议。\n\n**获取方式**：请前往 [Groq Console](https://console.groq.com) 注册并创建 API Key。',
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
          placeholder: '例如：Groq-主要',
        },
        api_key: {
          type: 'password',
          default: '',
          description: 'Groq API 密钥',
          required: true,
          label: 'API Key',
          placeholder: 'API Key',
        },
        base_url: {
          type: 'url',
          default: 'https://api.groq.com/openai/v1',
          description: 'Groq API 基础 URL',
          required: true,
          label: 'Base URL',
          placeholder: 'https://api.groq.com/openai/v1',
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
  constructor(groqConfig) {
    super(groqConfig)
    this.provider = 'groq'
  }
}
