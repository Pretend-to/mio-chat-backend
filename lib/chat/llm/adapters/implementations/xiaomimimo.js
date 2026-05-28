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
      supportedFeatures: ['chat', 'streaming', 'function_calling', 'reasoning', 'vision'],
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
    
    // 3. 根据前端设置的 reasoning_effort 状态，注入 MiMo 思考模式参数
    if (originalEffort === 0 || originalEffort === '0') {
      preparedBody.extra_body = {
        thinking: {
          type: 'disabled',
        }
      }
    } else {
      preparedBody.extra_body = {
        thinking: {
          type: 'enabled',
        }
      }
    }
    
    // 4. 删除非标的顶级参数，防止小米的 OpenAI 兼容网关报错
    delete preparedBody.reasoning_effort
    
    return preparedBody
  }
}
