import OpenAIBot from './openai.js'

/**
 * @class GitHub Models 适配器
 * 完全继承自 OpenAIBot，仅修改元数据与特有标识
 */
export default class GitHubAdapter extends OpenAIBot {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      type: 'github',
      avatarId: 'github',
      avatarAliases: {
        github: 'github',
        gh: 'github',
        githubcopilot: 'github',
        copilot: 'github'
      },
      name: 'GitHub Models',
      description:
        'GitHub Models AI 推理大模型适配器。支持访问 GPT-4o, Claude 3.5 Sonnet, Llama 等主流大语言模型，完全兼容 OpenAI 协议。\n\n**获取方式**：请使用您的 GitHub 账号在 GitHub Developer Settings 创建一个 Personal Access Token (PAT) 作为您的 API Key。',
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
          placeholder: '例如：GitHubModels-主要',
        },
        api_key: {
          type: 'password',
          default: '',
          description: 'GitHub Personal Access Token (PAT)',
          required: true,
          label: 'PAT Key',
          placeholder: 'ghp_xxxx 或 github_pat_xxxx',
        },
        base_url: {
          type: 'url',
          default: 'https://models.inference.ai.azure.com',
          description: 'GitHub Models API 基础 URL',
          required: true,
          label: 'Base URL',
          placeholder: 'https://models.inference.ai.azure.com',
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
  constructor(githubConfig) {
    super(githubConfig)
    this.provider = 'github'
  }
}
