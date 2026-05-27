import OpenAIBot from './openai.js'

/**
 * @class Stepfun (阶跃星辰) 适配器
 * 完全继承自 OpenAIBot，仅修改元数据与特有标识
 */
export default class StepfunAdapter extends OpenAIBot {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      type: 'stepfun',
      avatarId: 'stepfun',
      avatarAliases: {
        stepfun: 'stepfun',
        '阶跃星辰': 'stepfun',
        '阶跃': 'stepfun',
        '跃问': 'stepfun'
      },
      name: 'Stepfun (阶跃星辰)',
      description:
        '阶跃星辰（Stepfun）开放平台服务适配器。支持 Step-1 系列千亿/万亿参数大模型及多模态模型，完全兼容 OpenAI 协议。\n\n**获取方式**：请前往 [阶跃星辰开放平台](https://platform.stepfun.com) 注册并获取 API Key。',
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
          placeholder: '例如：阶跃星辰-主要',
        },
        api_key: {
          type: 'password',
          default: '',
          description: '阶跃星辰 API 密钥',
          required: true,
          label: 'API Key',
          placeholder: 'API Key',
        },
        base_url: {
          type: 'url',
          default: 'https://api.stepfun.com/v1',
          description: '阶跃星辰 API 基础 URL',
          required: true,
          label: 'Base URL',
          placeholder: 'https://api.stepfun.com/v1',
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
  constructor(stepfunConfig) {
    super(stepfunConfig)
    this.provider = 'stepfun'
  }
}
