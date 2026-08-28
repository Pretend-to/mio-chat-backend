import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CACHE_FILE = path.join(process.cwd(), 'tmp', 'models_registry.json')

// 同步数据源优先级列表 (国内 CDN 优先)
const SYNC_SOURCES = [
  {
    name: 'jsDelivr CDN (LiteLLM)',
    url: 'https://cdn.jsdelivr.net/gh/BerriAI/litellm@main/model_prices_and_context_window.json',
    timeout: 6000,
  },
  {
    name: 'ghproxy Mirror (LiteLLM)',
    timeout: 8000,
    url: 'https://ghproxy.net/https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json',
  },
  {
    name: 'GitHub Raw (LiteLLM)',
    url: 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json',
    timeout: 8000,
  },
]

// 内置核心模型静态规则表（零网络冷启动与保底）
const BUILTIN_MODEL_RULES = [
  // 显式带 vision / vl 的衍生模型优先规则（通用强匹配，防止被基础模型规则如 deepseek 拦截）
  {
    pattern: /vision|[-_]vl\b|[-_]vl[-_]/i,
    maxInput: 131072,
    maxOutput: 8192,
    vision: true,
    fc: true,
    reasoning: (m) => /reasoner|r1|qwq|o1|o3/i.test(m),
  },
  // DeepSeek 系列
  {
    pattern: /deepseek-(chat|v3|reasoner|r1|v4)/i,
    maxInput: 131072,
    maxOutput: 65536,
    vision: false,
    fc: true,
    reasoning: (m) => /reasoner|r1/i.test(m),
  },
  // OpenAI 系列
  {
    pattern: /^gpt-4o(-mini)?/i,
    maxInput: 128000,
    maxOutput: 16384,
    vision: true,
    fc: true,
    reasoning: false,
  },
  {
    pattern: /^o[13](-mini|-preview)?/i,
    maxInput: 200000,
    maxOutput: 100000,
    vision: true,
    fc: true,
    reasoning: true,
  },
  {
    pattern: /^gpt-4-turbo/i,
    maxInput: 128000,
    maxOutput: 4096,
    vision: true,
    fc: true,
    reasoning: false,
  },
  {
    pattern: /^gpt-3\.5-turbo/i,
    maxInput: 16385,
    maxOutput: 4096,
    vision: false,
    fc: true,
    reasoning: false,
  },
  // Claude (Anthropic) 系列
  {
    pattern: /claude-(3|4)/i,
    maxInput: 200000,
    maxOutput: 65536,
    vision: true,
    fc: true,
    reasoning: (m) => /3-7|thinking/i.test(m),
  },
  // Google Gemini 系列 (支持 1.5/2.0/2.5/3.0/3.5 及 flash/pro/lite 各种变体)
  {
    pattern: /gemini/i,
    maxInput: 1048576,
    maxOutput: 65536,
    vision: true,
    fc: true,
    reasoning: true,
  },
  // 阿里通义千问 (Qwen) 系列
  {
    pattern: /qwen-max|qwen-plus|qwen-turbo/i,
    maxInput: 131072,
    maxOutput: 8192,
    vision: false,
    fc: true,
    reasoning: false,
  },
  {
    pattern: /qwen-vl|qwen2\.5-vl/i,
    maxInput: 131072,
    maxOutput: 8192,
    vision: true,
    fc: true,
    reasoning: false,
  },
  {
    pattern: /qwq/i,
    maxInput: 131072,
    maxOutput: 32768,
    vision: false,
    fc: true,
    reasoning: true,
  },
  // 字节豆包 (Doubao) 系列
  {
    pattern: /doubao-pro-128k|doubao-lite-128k/i,
    maxInput: 131072,
    maxOutput: 4096,
    vision: false,
    fc: true,
    reasoning: false,
  },
  {
    pattern: /doubao-pro-32k|doubao-lite-32k/i,
    maxInput: 32768,
    maxOutput: 4096,
    vision: false,
    fc: true,
    reasoning: false,
  },
  {
    pattern: /doubao-vision/i,
    maxInput: 32768,
    maxOutput: 4096,
    vision: true,
    fc: true,
    reasoning: false,
  },
  // 智谱 GLM-5 系列（原生 1M 超长上下文，支持多模态视觉、工具调用与思考链）
  {
    pattern: /glm-5(\.\d+)?/i,
    maxInput: 1048576,
    maxOutput: 65536,
    vision: true,
    fc: true,
    reasoning: true,
  },
  // 智谱 GLM-4 系列
  {
    pattern: /glm-4(\.\d+)?(-turbo)?(-air)?(-flash)?$/i,
    maxInput: 131072,
    maxOutput: 4096,
    vision: false,
    fc: true,
    reasoning: false,
  },
  {
    pattern: /glm-4v/i,
    maxInput: 8192,
    maxOutput: 4096,
    vision: true,
    fc: true,
    reasoning: false,
  },
  // 零一万物 (Yi) 系列
  {
    pattern: /yi-large|yi-medium|yi-spark/i,
    maxInput: 131072,
    maxOutput: 4096,
    vision: false,
    fc: true,
    reasoning: false,
  },
  {
    pattern: /yi-vision/i,
    maxInput: 16384,
    maxOutput: 4096,
    vision: true,
    fc: true,
    reasoning: false,
  },
  // 小米 Mimo 系列
  {
    pattern: /mimo-v2\.5|mimo-v2/i,
    maxInput: 65536,
    maxOutput: 8192,
    vision: true,
    fc: true,
    reasoning: true,
  },
  // 商汤 SenseNova 系列
  {
    pattern: /sensenova/i,
    maxInput: 131072,
    maxOutput: 8192,
    vision: true,
    fc: true,
    reasoning: false,
  },
  // Google Gemma 开源系列
  {
    pattern: /gemma-[34]/i,
    maxInput: 131072,
    maxOutput: 8192,
    vision: false,
    fc: true,
    reasoning: false,
  },
  // 字节豆包 Seed 系列
  {
    pattern: /doubao-seed/i,
    maxInput: 131072,
    maxOutput: 8192,
    vision: true,
    fc: true,
    reasoning: false,
  },
  // 百川 Baichuan 系列
  {
    pattern: /baichuan4|baichuan3/i,
    maxInput: 32768,
    maxOutput: 4096,
    vision: false,
    fc: true,
    reasoning: false,
  },
  // 小红书 Dots Studio 系列（dots3-note / dots.vlm 均为多模态模型，dots3-note 官方 512K 上下文）
  {
    pattern: /dots[._-]?3[-_]?note|dots[._-]?vlm/i,
    maxInput: 524288,
    maxOutput: 32768,
    vision: true,
    fc: true,
    reasoning: true,
  },
]
class ModelRegistryService {
  constructor() {
    this.modelsData = new Map()
    this.lastSyncTime = null
    this.isSyncing = false
    this.isInitialized = false
    this._loadFromCache()
  }

  /**
   * 从本地缓存加载数据
   */
  _loadFromCache() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, 'utf-8')
        const json = JSON.parse(raw)
        const entries = Object.entries(json)
        this.modelsData.clear()
        for (const [k, v] of entries) {
          if (typeof v === 'object' && v !== null) {
            this.modelsData.set(k.toLowerCase(), v)
          }
        }
        const stat = fs.statSync(CACHE_FILE)
        this.lastSyncTime = stat.mtime
        if (typeof logger !== 'undefined') {
          logger.info(
            `[ModelRegistry] 从本地缓存载入 ${this.modelsData.size} 条模型规格数据`,
          )
        }
      }
    } catch (err) {
      if (typeof logger !== 'undefined') {
        logger.warn(`[ModelRegistry] 读取本地缓存失败: ${err.message}`)
      }
    }
  }

  /**
   * 标准化模型名称（提取纯模型名，去除 provider 前缀）
   */
  _normalizeModelName(modelName) {
    if (!modelName || typeof modelName !== 'string') return ''
    let name = modelName.trim().toLowerCase()
    // 去除 openrouter / openai / mistralai 等 provider 前缀
    if (name.includes('/')) {
      const parts = name.split('/')
      name = parts[parts.length - 1]
    }
    return name
  }

  /**
   * 获取指定模型的元数据规格
   * @param {string} rawModelName 模型名称
   * @returns {Object} 模型元数据规格
   */
  getModelMetadata(rawModelName) {
    if (!rawModelName) {
      return this._getDefaultMetadata('unknown')
    }

    const normName = this._normalizeModelName(rawModelName)
    const exactName = rawModelName.trim().toLowerCase()

    // 1. 精确匹配已缓存的 LiteLLM 数据库
    let entry = this.modelsData.get(exactName) || this.modelsData.get(normName)
    let matchSource = entry ? 'litellm-exact' : null

    // 2. 尝试无版本后缀匹配 (如 gpt-4o-2024-08-06 -> gpt-4o)
    if (!entry) {
      for (const [key, value] of this.modelsData.entries()) {
        if (normName.startsWith(key) || key.startsWith(normName)) {
          entry = value
          matchSource = 'litellm-prefix'
          break
        }
      }
    }

    // 3. 基于内置正则规则表决策
    let matchedRule = null
    for (const rule of BUILTIN_MODEL_RULES) {
      if (rule.pattern.test(normName) || rule.pattern.test(exactName)) {
        matchedRule = rule
        if (!matchSource) {
          matchSource = 'builtin-rule'
        }
        break
      }
    }
    if (!matchSource) {
      matchSource = 'fallback'
    }

    const maxInput = entry?.max_input_tokens || matchedRule?.maxInput || 131072
    const maxOutput =
      entry?.max_output_tokens ||
      entry?.max_tokens ||
      matchedRule?.maxOutput ||
      8192

    let supportsVision = false
    if (typeof entry?.supports_vision === 'boolean') {
      supportsVision = entry.supports_vision
    } else if (matchedRule) {
      supportsVision =
        typeof matchedRule.vision === 'function'
          ? matchedRule.vision(normName)
          : matchedRule.vision
    } else {
      supportsVision = /vision|vl|-4o|gemini|claude-3/i.test(normName)
    }

    let supportsFc = true
    if (typeof entry?.supports_function_calling === 'boolean') {
      supportsFc = entry.supports_function_calling
    } else if (matchedRule) {
      supportsFc =
        typeof matchedRule.fc === 'function'
          ? matchedRule.fc(normName)
          : matchedRule.fc
    }

    let supportsReasoning = false
    if (typeof entry?.supports_reasoning === 'boolean') {
      supportsReasoning = entry.supports_reasoning
    } else if (matchedRule) {
      supportsReasoning =
        typeof matchedRule.reasoning === 'function'
          ? matchedRule.reasoning(normName)
          : !!matchedRule.reasoning
    } else {
      supportsReasoning = /reasoner|r1|qwq|o1|o3/i.test(normName)
    }

    // 80% 记忆结晶水位线计算
    const crystallizeWatermark = Math.floor(maxInput * 0.8)

    return {
      model: rawModelName,
      normalizedModel: normName,
      matchSource,
      max_input_tokens: maxInput,
      max_output_tokens: maxOutput,
      context_window: maxInput,
      crystallize_watermark: crystallizeWatermark,
      supports_vision: supportsVision,
      supports_function_calling: supportsFc,
      supports_reasoning: supportsReasoning,
      input_cost_per_token: entry?.input_cost_per_token || 0,
      output_cost_per_token: entry?.output_cost_per_token || 0,
      litellm_provider:
        entry?.litellm_provider || matchedRule?.provider || 'custom',
    }
  }

  _getDefaultMetadata(model) {
    return {
      model,
      normalizedModel: model,
      max_input_tokens: 131072,
      max_output_tokens: 8192,
      context_window: 131072,
      crystallize_watermark: 104857,
      supports_vision: false,
      supports_function_calling: true,
      supports_reasoning: false,
      input_cost_per_token: 0,
      output_cost_per_token: 0,
      litellm_provider: 'custom',
    }
  }

  /**
   * 获取模型的 80% 结晶安全水位线
   * @param {string} modelName 模型名称
   * @returns {number} Token 数量
   */
  getWatermark(modelName) {
    const meta = this.getModelMetadata(modelName)
    return meta.crystallize_watermark
  }

  /**
   * 判断模型是否具备多模态视觉识图能力
   * @param {string} modelName 模型名称
   * @returns {boolean}
   */
  supportsVision(modelName) {
    const meta = this.getModelMetadata(modelName)
    return meta.supports_vision
  }

  /**
   * 审计当前已配置的存量模型与注册表的匹配情况并输出日志
   * @param {object} llmService - LLM 服务实例 (含 llms 字典)
   */
  auditConfiguredModels(llmService) {
    if (!llmService?.llms) {
      logger.warn('[ModelRegistry] 无法审计存量模型: llmService 不可用')
      return
    }

    const stats = {
      ['litellm-exact']: 0,
      ['litellm-prefix']: 0,
      ['builtin-rule']: 0,
      fallback: 0,
    }
    let total = 0

    for (const [instanceId, instance] of Object.entries(llmService.llms)) {
      const groups = instance.models || []
      const modelIds = groups.flatMap((g) => g.models || [])
      if (modelIds.length === 0) {
        continue
      }

      for (const model of modelIds) {
        total++
        const meta = this.getModelMetadata(model)
        const source = meta.matchSource || 'fallback'
        stats[source] = (stats[source] || 0) + 1
        logger.debug(
          '[ModelRegistry] 模型匹配 ' +
            source.padEnd(14) +
            ' | ' +
            instanceId.padEnd(20) +
            ' | ' +
            model +
            ' (ctx=' +
            meta.max_input_tokens +
            ', wm=' +
            meta.crystallize_watermark +
            ', vision=' +
            meta.supports_vision +
            ')',
        )
      }
    }

    if (total === 0) {
      logger.info('[ModelRegistry] 当前无已配置模型，跳过匹配审计')
      return
    }

    logger.info(
      '[ModelRegistry] 存量模型匹配审计完成: 共 ' +
        total +
        ' 个模型 | 精确命中 ' +
        stats['litellm-exact'] +
        ' | 前缀命中 ' +
        stats['litellm-prefix'] +
        ' | 内置规则命中 ' +
        stats['builtin-rule'] +
        ' | 未知兜底 ' +
        (stats.fallback || 0),
    )
  }

  /**
   * 同步拉取最新的模型规格与价格数据库 (多源降级)
   * @returns {Promise<{success: boolean, source?: string, count?: number, error?: string}>}
   */
  async syncRegistry() {
    if (this.isSyncing) {
      return { success: false, error: 'Sync already in progress' }
    }

    this.isSyncing = true
    let lastError = null

    for (const source of SYNC_SOURCES) {
      const start = Date.now()
      try {
        if (typeof logger !== 'undefined') {
          logger.info(
            `[ModelRegistry] 正在从 ${source.name} 同步模型规格数据库...`,
          )
        }

        const res = await fetch(source.url, {
          signal: AbortSignal.timeout(source.timeout),
          headers: { 'User-Agent': 'MioChat-ModelRegistry/1.0' },
        })

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`)
        }

        const data = await res.json()
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid JSON payload')
        }

        const entries = Object.entries(data)
        if (entries.length === 0) {
          throw new Error('Empty registry response')
        }

        // 热更新内存缓存
        this.modelsData.clear()
        for (const [k, v] of entries) {
          if (typeof v === 'object' && v !== null) {
            this.modelsData.set(k.toLowerCase(), v)
          }
        }
        this.lastSyncTime = new Date()

        // 确保 tmp 目录存在并写入本地文件
        const tmpDir = path.dirname(CACHE_FILE)
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true })
        }
        fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8')

        const ms = Date.now() - start
        if (typeof logger !== 'undefined') {
          logger.info(
            `[ModelRegistry] 同步成功 (${source.name}, ${entries.length} 个模型, 耗时 ${ms}ms)`,
          )
        }

        this.isSyncing = false
        return {
          success: true,
          source: source.name,
          count: entries.length,
          durationMs: ms,
        }
      } catch (err) {
        lastError = err.message
        if (typeof logger !== 'undefined') {
          logger.warn(
            `[ModelRegistry] 同步源 ${source.name} 失败: ${err.message}，尝试下一个源...`,
          )
        }
      }
    }

    this.isSyncing = false
    return { success: false, error: `所有同步源均失败: ${lastError}` }
  }
}

const modelRegistryService = new ModelRegistryService()
export default modelRegistryService
