import OpenAIBot from './openai.js'

/**
 * @class Xiaomi MiMo 适配器
 * 继承自 OpenAIBot，并开启 shouldPreserveReasoningContent 以支持推理思考内容的缓存与多轮会话回传
 */
export default class XiaomiMiMoAdapter extends OpenAIBot {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      avatarAliases: {
        mimo: 'xiaomimimo',
        xiaomi: 'xiaomimimo',
        '小米': 'xiaomimimo'
      },
      avatarId: 'xiaomimimo',
      description:
        '小米大模型开放平台（MiMo）服务适配器。支持 MiMo 系列模型，完全兼容 OpenAI 协议。可以使用 `mimo-v2.5-pro`、`mimo-v2-flash` 等模型。\n\n**获取方式**：请前往 [小米大模型开放平台](https://platform.xiaomimimo.com/) 注册并申请 API Key。',
      initialConfigSchema: {
        api_key: {
          default: '',
          description: '小米 API 密钥',
          label: 'API Key',
          placeholder: 'API Key',
          required: true,
          type: 'password',
        },
        base_url: {
          default: 'https://api.xiaomimimo.com/v1',
          description: '小米 API 基础 URL',
          label: 'Base URL',
          placeholder: 'https://api.xiaomimimo.com/v1',
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
          placeholder: '例如：小米-主要',
          required: false,
          type: 'string',
        },
      },
      name: 'Xiaomi MiMo',
      supportedFeatures: ['chat', 'streaming', 'function_calling', 'reasoning', 'vision'],
      type: 'xiaomimimo',
    }
  }

  /**
   * 构造函数
   */
  constructor(mimoConfig) {
    super(mimoConfig)
    this.provider = 'xiaomimimo'
    this.shouldPreserveReasoningContent = true
  }

  /**
   * 拼装聊天请求体，支持 MiMo 专用的 thinking 思考模式参数
   */
  async _prepareChatBody(body) {
    // 1. 在调用 super 之前，先获取原始的 reasoning_effort，避免被 super 删掉
    const originalEffort = body.settings?.chatParams?.reasoning_effort

    // 2. 调用 OpenAIBot 的原版拼装逻辑，生成标准 OpenAI 格式的请求体
    const preparedBody = await super._prepareChatBody(body)
    
    // 3. 调用父类通用方法应用 thinking/extra_body 逻辑
    this._applyExtraThinkingBody(preparedBody, originalEffort)
    
    return preparedBody
  }
}
