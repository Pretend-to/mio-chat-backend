/**
 * 声明型适配器配置文件字典
 * 承载 13 个行为完全由协议基类覆盖、仅元数据和参数策略不同的厂商
 */

// 缓存 OpenAIBot 与 OpenAIResponsesBot 基类，延迟动态导入以避免顶层 ESM 循环引用
let cachedOpenAIBot = null
let cachedOpenAIResponsesBot = null

function createConfigSchema({
  apiKeyDesc,
  apiKeyLabel = 'API Key',
  apiKeyPlaceholder = 'API Key',
  baseUrl,
  baseUrlDesc,
  namePlaceholder,
  nameDesc = '适配器实例的自定义名称',
}) {
  return {
    api_key: {
      default: '',
      description: apiKeyDesc,
      label: apiKeyLabel,
      placeholder: apiKeyPlaceholder,
      required: true,
      type: 'password',
    },
    base_url: {
      default: baseUrl,
      description: baseUrlDesc,
      label: 'Base URL',
      placeholder: baseUrl,
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
      description: nameDesc,
      label: '实例名称',
      placeholder: namePlaceholder,
      required: false,
      type: 'string',
    },
  }
}

export const declarativeProfiles = [
  {
    avatarAliases: { baichuan: 'baichuan', 百川: 'baichuan', 百川智能: 'baichuan' },
    avatarId: 'baichuan',
    description: '百川智能（Baichuan）大模型开放平台服务适配器。支持 Baichuan3, Baichuan4 等系列模型，在医疗、搜索增强等领域具备业界领先表现，兼容 OpenAI 协议。\n\n**获取方式**：请前往 [百川智能开放平台](https://platform.baichuan-ai.com) 注册并获取 API Key。',
    initialConfigSchema: createConfigSchema({
      apiKeyDesc: '百川智能 API 密钥',
      baseUrl: 'https://api.baichuan-ai.com/v1',
      baseUrlDesc: '百川智能 API 基础 URL',
      namePlaceholder: '例如：百川-主要',
    }),
    name: 'Baichuan (百川智能)',
    supportedFeatures: ['chat', 'streaming', 'vision'],
    type: 'baichuan',
  },
  {
    avatarAliases: { copilot: 'github', gh: 'github', github: 'github', githubcopilot: 'github' },
    avatarId: 'github',
    description: 'GitHub Models AI 推理大模型适配器。支持访问 GPT-4o, Claude 3.5 Sonnet, Llama 等主流大语言模型，完全兼容 OpenAI 协议。\n\n**获取方式**：请使用您的 GitHub 账号在 GitHub Developer Settings 创建一个 Personal Access Token (PAT) 作为您的 API Key。',
    initialConfigSchema: createConfigSchema({
      apiKeyDesc: 'GitHub Personal Access Token (PAT)',
      apiKeyLabel: 'PAT Key',
      apiKeyPlaceholder: 'ghp_xxxx 或 github_pat_xxxx',
      baseUrl: 'https://models.inference.ai.azure.com',
      baseUrlDesc: 'GitHub Models API 基础 URL',
      namePlaceholder: '例如：GitHubModels-主要',
    }),
    name: 'GitHub Models',
    supportedFeatures: ['chat', 'streaming', 'vision'],
    type: 'github',
  },
  {
    avatarAliases: { groq: 'groq' },
    avatarId: 'groq',
    description: 'Groq 极速大模型服务适配器。支持 Llama-3, Mixtral, Gemma 等模型，采用专属 LPU 技术实现极致的生成速度，兼容 OpenAI 协议。\n\n**获取方式**：请前往 [Groq Console](https://console.groq.com) 注册并创建 API Key。',
    initialConfigSchema: createConfigSchema({
      apiKeyDesc: 'Groq API 密钥',
      baseUrl: 'https://api.groq.com/openai/v1',
      baseUrlDesc: 'Groq API 基础 URL',
      namePlaceholder: '例如：Groq-主要',
    }),
    name: 'Groq',
    supportedFeatures: ['chat', 'streaming', 'vision'],
    type: 'groq',
  },
  {
    avatarAliases: { kling: 'kling', kwaiyii: 'kling', 可灵: 'kling', 快意: 'kling', 快手: 'kling' },
    avatarId: 'kling',
    description: '快手大模型与可灵 AI（Kling AI）开放平台服务适配器。支持快手快意大语言模型及可灵 AI 系列模型，完全兼容 OpenAI 接口协议。\n\n**获取方式**：请前往 [可灵 AI 官网](https://klingai.kuaishou.com) 注册，进入 API 开放平台购买资源并获取 API Key。',
    initialConfigSchema: createConfigSchema({
      apiKeyDesc: '可灵 AI API 密钥',
      baseUrl: 'https://api.klingai.com/v1',
      baseUrlDesc: '可灵 AI API 基础 URL',
      namePlaceholder: '例如：可灵-主要',
    }),
    name: 'Kuaishou (快手可灵)',
    supportedFeatures: ['chat', 'streaming', 'vision'],
    type: 'kuaishou',
  },
  {
    avatarAliases: { longcat: 'longcat', 美团: 'longcat', 龙猫: 'longcat' },
    avatarId: 'longcat',
    description: '美团龙猫大模型（LongCat）开放平台服务适配器。支持 LongCat 系列模型，完全兼容 OpenAI 协议。\n\n**获取方式**：请前往 [美团龙猫大模型平台](https://longcat.chat/platform/) 注册并申请您的 API 密钥。',
    initialConfigSchema: createConfigSchema({
      apiKeyDesc: '龙猫 API 密钥',
      baseUrl: 'https://api.longcat.chat/openai',
      baseUrlDesc: '龙猫 API 基础 URL',
      namePlaceholder: '例如：龙猫-主要',
    }),
    name: 'Meituan (美团龙猫)',
    supportedFeatures: ['chat', 'streaming', 'vision'],
    type: 'meituan',
  },
  {
    avatarAliases: { minimax: 'minimax' },
    avatarId: 'minimax',
    description: 'Minimax 官方 API 适配器。支持 Abab-6.5 系列大语言模型，具备出色的中文理解、逻辑推理及拟人化角色扮演能力，兼容 OpenAI 协议。\n\n**获取方式**：请前往 [Minimax 开放平台](https://platform.minimaxi.com) 注册并创建 API Key。',
    initialConfigSchema: createConfigSchema({
      apiKeyDesc: 'Minimax API 密钥',
      baseUrl: 'https://api.minimax.chat/v1',
      baseUrlDesc: 'Minimax API 基础 URL',
      namePlaceholder: '例如：Minimax-主要',
    }),
    name: 'Minimax (海螺 AI)',
    supportedFeatures: ['chat', 'streaming', 'vision'],
    type: 'minimax',
  },
  {
    avatarAliases: { openrouter: 'openrouter', or: 'openrouter' },
    avatarId: 'openrouter',
    description: 'OpenRouter 统一大模型 API 服务适配器。支持访问数百种开源和闭源大语言模型，完全兼容 OpenAI 接口协议。\n\n**获取方式**：请前往 [OpenRouter 官网](https://openrouter.ai) 注册并创建 API Key。',
    initialConfigSchema: createConfigSchema({
      apiKeyDesc: 'OpenRouter API 密钥',
      baseUrl: 'https://openrouter.ai/api/v1',
      baseUrlDesc: 'OpenRouter API 基础 URL',
      namePlaceholder: '例如：OpenRouter-主要',
    }),
    name: 'OpenRouter',
    supportedFeatures: ['chat', 'streaming', 'vision'],
    type: 'openrouter',
  },
  {
    avatarAliases: { perplexity: 'perplexity' },
    avatarId: 'perplexity',
    description: 'Perplexity AI 搜素增强大模型适配器。提供基于实时联网搜索的智能回答大模型（Sonar 系列），完全兼容 OpenAI 协议。\n\n**获取方式**：请前往 [Perplexity 官网](https://www.perplexity.ai) 注册并在 API Settings 购买资源并生成 API Key。',
    initialConfigSchema: createConfigSchema({
      apiKeyDesc: 'Perplexity API 密钥',
      baseUrl: 'https://api.perplexity.ai',
      baseUrlDesc: 'Perplexity API 基础 URL',
      namePlaceholder: '例如：Perplexity-主要',
    }),
    name: 'Perplexity',
    supportedFeatures: ['chat', 'streaming', 'vision'],
    type: 'perplexity',
  },
  {
    avatarAliases: { stepfun: 'stepfun', 跃问: 'stepfun', 阶跃: 'stepfun', 阶跃星辰: 'stepfun' },
    avatarId: 'stepfun',
    description: '阶跃星辰（Stepfun）开放平台服务适配器。支持 Step-1 系列千亿/万亿参数大模型及多模态模型，完全兼容 OpenAI 协议。\n\n**获取方式**：请前往 [阶跃星辰开放平台](https://platform.stepfun.com) 注册并获取 API Key。',
    initialConfigSchema: createConfigSchema({
      apiKeyDesc: '阶跃星辰 API 密钥',
      baseUrl: 'https://api.stepfun.com/v1',
      baseUrlDesc: '阶跃星辰 API 基础 URL',
      namePlaceholder: '例如：阶跃星辰-主要',
    }),
    name: 'Stepfun (阶跃星辰)',
    supportedFeatures: ['chat', 'streaming', 'vision'],
    type: 'stepfun',
  },
  {
    avatarAliases: { '01.ai': 'zeroone', yi: 'zeroone', zeroone: 'zeroone', 零一: 'zeroone', 零一万物: 'zeroone' },
    avatarId: 'zeroone',
    description: '零一万物（01.AI）开放平台服务适配器。支持 Yi 系列模型，提供领先的中文和双语语言理解能力，完全兼容 OpenAI 协议。\n\n**获取方式**：请前往 [零一万物开放平台](https://platform.lingyiwanwu.com) 注册并获取 API Key。',
    initialConfigSchema: createConfigSchema({
      apiKeyDesc: '零一万物 API 密钥',
      baseUrl: 'https://api.lingyiwanwu.com/v1',
      baseUrlDesc: '零一万物 API 基础 URL',
      namePlaceholder: '例如：零一万物-主要',
    }),
    name: '01.AI (零一万物)',
    supportedFeatures: ['chat', 'streaming', 'vision'],
    type: 'zeroone',
  },
  {
    avatarId: 'deepseek',
    defaultReasoningEffort: -1,
    description: 'DeepSeek 官方 API 适配器。提供对 DeepSeek-V3, DeepSeek-R1 等高性能模型的访问，以极低成本提供媲美主流大模型的推理能力。原生兼容 OpenAI 接口规范，特别优化了思维链（Reasoning）渲染逻辑。\n\n**获取方式**：在 [DeepSeek 开放平台](https://platform.deepseek.com/api_keys) 创建 API 密钥。',
    initialConfigSchema: createConfigSchema({
      apiKeyDesc: 'DeepSeek API 密钥',
      baseUrl: 'https://api.deepseek.com/v1',
      baseUrlDesc: 'DeepSeek API 的基础 URL',
      nameDesc: '适配器实例的自定义名称，用于区分多个实例',
      namePlaceholder: '例如：DeepSeek-主要',
    }),
    name: 'DeepSeek',
    reasoningEffortTable: {
      '-1': 'high',
      0: undefined,
      1: undefined,
      2: 'high',
      3: 'high',
      4: 'max',
      5: 'max',
    },
    reasoningStrategy: 'extra_body',
    shouldPreserveReasoningContent: true,
    supportedFeatures: ['chat', 'streaming', 'function_calling', 'reasoning'],
    type: 'deepseek',
  },
  {
    avatarAliases: { mimo: 'xiaomimimo', xiaomi: 'xiaomimimo', 小米: 'xiaomimimo' },
    avatarId: 'xiaomimimo',
    description: '小米大模型开放平台（MiMo）服务适配器。支持 MiMo 系列模型，完全兼容 OpenAI 协议。可以使用 `mimo-v2.5-pro`、`mimo-v2-flash` 等模型。\n\n**获取方式**：请前往 [小米大模型开放平台](https://platform.xiaomimimo.com/) 注册并申请 API Key。',
    initialConfigSchema: createConfigSchema({
      apiKeyDesc: '小米 API 密钥',
      baseUrl: 'https://api.xiaomimimo.com/v1',
      baseUrlDesc: '小米 API 基础 URL',
      namePlaceholder: '例如：小米-主要',
    }),
    name: 'Xiaomi MiMo',
    reasoningStrategy: 'extra_body',
    shouldPreserveReasoningContent: true,
    supportedFeatures: ['chat', 'streaming', 'function_calling', 'reasoning', 'vision'],
    type: 'xiaomimimo',
  },
  {
    avatarAliases: { glm: 'zhipu', zhipu: 'zhipu', 智谱: 'zhipu', 智谱AI: 'zhipu' },
    avatarId: 'zhipu',
    description: '智谱 AI（bigmodel.cn）开放平台服务适配器。支持 GLM-4, GLM-5.1 等系列模型，在数学、逻辑推理和多模态理解方面表现优秀，完全兼容 OpenAI 协议。\n\n**获取方式**：请前往 [智谱 AI 开放平台](https://bigmodel.cn) 注册并创建 API Key。',
    extraSettingsSchema: {
      zhipu: {
        web_search: {
          fields: {
            enable: { default: false, label: '启用联网搜索', type: 'boolean' },
            search_result: { default: true, label: '返回搜索结果明细', type: 'boolean' },
          },
          label: '联网搜索',
          type: 'group',
        },
      },
    },
    initialConfigSchema: createConfigSchema({
      apiKeyDesc: '智谱 AI API 密钥',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
      baseUrlDesc: '智谱 AI API 基础 URL',
      namePlaceholder: '例如：智谱-主要',
    }),
    name: 'Zhipu (智谱AI)',
    nativeTools: [
      {
        buildPayload: (ws) => ({
          enable: true,
          search_result: ws.search_result ?? true,
        }),
        provider: 'zhipu',
        type: 'web_search',
      },
    ],
    reasoningStrategy: 'extra_body',
    supportedFeatures: ['chat', 'streaming', 'function_calling', 'vision', 'reasoning'],
    type: 'zhipu',
  },
]

export const declarativeProfilesMap = new Map(
  declarativeProfiles.map((p) => [p.type, p]),
)

/**
 * 根据声明式 profile 异步构造适配器类
 * @param {Object} profile
 * @returns {Promise<typeof OpenAIBot>}
 */
export async function makeDeclarativeAdapter(profile) {
  let BaseClass
  if (profile.protocol === 'openai-responses') {
    if (!cachedOpenAIResponsesBot) {
      const module = await import('./implementations/openai-responses.js')
      cachedOpenAIResponsesBot = module.default
    }
    BaseClass = cachedOpenAIResponsesBot
  } else {
    if (!cachedOpenAIBot) {
      const module = await import('./implementations/openai.js')
      cachedOpenAIBot = module.default
    }
    BaseClass = cachedOpenAIBot
  }

  return class DeclarativeAdapter extends BaseClass {
    static getAdapterMetadata() {
      const meta = {
        avatarAliases: profile.avatarAliases,
        avatarId: profile.avatarId,
        description: profile.description,
        initialConfigSchema: profile.initialConfigSchema,
        name: profile.name,
        supportedFeatures: profile.supportedFeatures || [
          'chat',
          'streaming',
          'vision',
        ],
        type: profile.type,
      }
      if (profile.extraSettingsSchema !== undefined) {
        meta.extraSettingsSchema = profile.extraSettingsSchema
      }
      if (profile.aliases !== undefined) {
        meta.aliases = profile.aliases
      }
      return meta
    }

    constructor(config) {
      super(config)
      this.provider = profile.type
      this.profile = profile
      if (profile.shouldPreserveReasoningContent !== undefined) {
        this.shouldPreserveReasoningContent =
          profile.shouldPreserveReasoningContent
      }
      if (profile.reasoningStrategy !== undefined) {
        this.reasoningStrategy = profile.reasoningStrategy
      }
      if (profile.reasoningEffortTable !== undefined) {
        this.reasoningEffortTable = profile.reasoningEffortTable
      }
      if (profile.defaultReasoningEffort !== undefined) {
        this.defaultReasoningEffort = profile.defaultReasoningEffort
      }
      if (profile.nativeTools !== undefined) {
        this.nativeTools = profile.nativeTools
      }
    }
  }
}
