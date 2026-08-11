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
      avatarAliases: {
        'glm': 'zhipu',
        zhipu: 'zhipu',
        '智谱': 'zhipu',
        '智谱AI': 'zhipu'
      },
      avatarId: 'zhipu',
      description:
        '智谱 AI（bigmodel.cn）开放平台服务适配器。支持 GLM-4, GLM-5.1 等系列模型，在数学、逻辑推理和多模态理解方面表现优秀，完全兼容 OpenAI 协议。\n\n**获取方式**：请前往 [智谱 AI 开放平台](https://bigmodel.cn) 注册并创建 API Key。',
      extraSettingsSchema: {
        zhipu: {
          web_search: {
            fields: {
              enable: { default: false, label: '启用联网搜索', type: 'boolean' },
              search_result: { default: true, label: '返回搜索结果明细', type: 'boolean' }
            },
            label: '联网搜索',
            type: 'group'
          }
        }
      },
      initialConfigSchema: {
        api_key: {
          default: '',
          description: '智谱 AI API 密钥',
          label: 'API Key',
          placeholder: 'API Key',
          required: true,
          type: 'password',
        },
        base_url: {
          default: 'https://open.bigmodel.cn/api/paas/v4/',
          description: '智谱 AI API 基础 URL',
          label: 'Base URL',
          placeholder: 'https://open.bigmodel.cn/api/paas/v4/',
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
          placeholder: '例如：智谱-主要',
          required: false,
          type: 'string',
        },
      },
      name: 'Zhipu (智谱AI)',
      supportedFeatures: ['chat', 'streaming', 'function_calling', 'vision', 'reasoning'],
      type: 'zhipu'
    }
  }

  /**
   * 构造函数
   */
  constructor(zhipuConfig) {
    super(zhipuConfig)
    this.provider = 'zhipu'
  }

  /**
   * 预处理聊天请求体，为智谱 AI 推理模型添加思考模式支持，并剥离顶层不支持的参数
   */
  async _prepareChatBody(body) {
    // 1. 优先提取原始的 reasoning_effort 参数，避免父类过滤剥离
    const reasoningEffort = body.settings?.chatParams?.reasoning_effort

    // 2. 调用父类的常规转换（如 tools、多模态消息处理）
    const preparedBody = await super._prepareChatBody(body)

    // 3. 调用父类通用方法应用 thinking/extra_body 逻辑
    this._applyExtraThinkingBody(preparedBody, reasoningEffort)

    // 4. 检查与注入智谱原生 web_search 工具
    const { extraSettings = {} } = body.settings || {}
    const zhipuSettings = extraSettings?.zhipu || extraSettings || {}

    const isEnabled = (v) => {
      if (v === true || v === 'true' || v === 1) {return true}
      if (typeof v === 'object' && v !== null && (v.enable === true || v.enabled === true)) {return true}
      return false
    }

    if (isEnabled(zhipuSettings.web_search)) {
      if (!preparedBody.tools) {preparedBody.tools = []}
      const ws = typeof zhipuSettings.web_search === 'object' ? zhipuSettings.web_search : {}
      const existingIdx = preparedBody.tools.findIndex((t) => t.type === 'web_search')
      const toolObj = {
        type: 'web_search',
        web_search: {
          enable: true,
          search_result: ws.search_result ?? true
        }
      }
      if (existingIdx !== -1) {
        preparedBody.tools[existingIdx] = toolObj
      } else {
        preparedBody.tools.push(toolObj)
      }
    }

    return preparedBody
  }
}

