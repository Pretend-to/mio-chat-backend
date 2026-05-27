import OpenAIBot from './openai.js'

/**
 * @class Zhipu (智谱AI) 适配器
 * 完全继承自 OpenAIBot，仅修改元数据与特有标识，并处理独特的思考（thinking）模式
 */
export default class ZhipuAdapter extends OpenAIBot {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      type: 'zhipu',
      avatarId: 'zhipu',
      avatarAliases: {
        zhipu: 'zhipu',
        '智谱': 'zhipu',
        '智谱AI': 'zhipu',
        'glm': 'zhipu'
      },
      name: 'Zhipu (智谱AI)',
      description:
        '智谱 AI（bigmodel.cn）开放平台服务适配器。支持 GLM-4, GLM-5.1 等系列模型，在数学、逻辑推理和多模态理解方面表现优秀，完全兼容 OpenAI 协议。\n\n**获取方式**：请前往 [智谱 AI 开放平台](https://bigmodel.cn) 注册并创建 API Key。',
      supportedFeatures: ['chat', 'streaming', 'function_calling', 'vision', 'reasoning'],
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
          placeholder: '例如：智谱-主要',
        },
        api_key: {
          type: 'password',
          default: '',
          description: '智谱 AI API 密钥',
          required: true,
          label: 'API Key',
          placeholder: 'API Key',
        },
        base_url: {
          type: 'url',
          default: 'https://open.bigmodel.cn/api/paas/v4/',
          description: '智谱 AI API 基础 URL',
          required: true,
          label: 'Base URL',
          placeholder: 'https://open.bigmodel.cn/api/paas/v4/',
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
  constructor(zhipuConfig) {
    super(zhipuConfig)
    this.provider = 'zhipu'
  }
}
