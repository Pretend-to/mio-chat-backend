import OpenAIBot from './openai.js'

/**
 * @class DeepSeek 适配器
 * 继承自 OpenAI，主要区别在于需要缓存 reasoning_content 并在 tool call 后发回
 */
export default class DeepSeekAdapter extends OpenAIBot {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      type: 'deepseek',
      avatarId: 'deepseek',
      name: 'DeepSeek',
      description:
        'DeepSeek 官方 API 适配器。提供对 DeepSeek-V3, DeepSeek-R1 等高性能模型的访问，以极低成本提供媲美主流大模型的推理能力。原生兼容 OpenAI 接口规范，特别优化了思维链（Reasoning）渲染逻辑。\n\n**获取方式**：在 [DeepSeek 开放平台](https://platform.deepseek.com/api_keys) 创建 API 密钥。',
      supportedFeatures: ['chat', 'streaming', 'function_calling', 'reasoning'],
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
          description: '适配器实例的自定义名称，用于区分多个实例',
          required: false,
          label: '实例名称',
          placeholder: '例如：DeepSeek-主要',
        },
        api_key: {
          type: 'password',
          default: '',
          description: 'DeepSeek API 密钥',
          required: true,
          label: 'API Key',
          placeholder: 'API Key',
        },
        base_url: {
          type: 'url',
          default: 'https://api.deepseek.com/v1',
          description: 'DeepSeek API 的基础 URL',
          required: true,
          label: 'Base URL',
          placeholder: 'https://api.deepseek.com/v1',
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
  constructor(deepseekConfig) {
    super(deepseekConfig)
    this.provider = 'deepseek'
    this.shouldPreserveReasoningContent = true
    this.supportsVision = false
  }

  async _prepareChatBody(body) {
    // 1. 优先提取原始的 reasoning_effort 参数，避免父类过滤剥离
    const originalEffort = body.settings?.chatParams?.reasoning_effort

    // 2. 调用父类的常规转换（如 tools、多模态消息处理）
    const preparedBody = await super._prepareChatBody(body)

    const deepseekReasoningEffortTable = {
      '-1': 'high',
      0: undefined,
      1: 'high',
      2: 'max',
      3: 'max',
    }

    // 确定思考强度，默认设为 'high' 以规整多轮前缀缓存 key，防顶级参数不一致导致缓存失效
    const reasoningEffort = originalEffort !== undefined ? originalEffort : -1

    // 3. 调用父类通用方法应用 thinking/extra_body 逻辑
    this._applyExtraThinkingBody(preparedBody, reasoningEffort, deepseekReasoningEffortTable)

    return preparedBody
  }
}
