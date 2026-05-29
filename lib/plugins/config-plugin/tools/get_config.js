import { MioFunction } from '../../../function.js'
import { getFullConfig, getConfigSection, sanitizeConfig, maskSecret } from '../../../server/http/services/configService.js'

export default class GetSystemConfig extends MioFunction {
  constructor() {
    super({
      name: 'get_config',
      description: 'Retrieve system configuration. Optionally specify a "section" to get only that part. Sensitive values (api_key, tokens, access codes) are masked.',
      parameters: {
        type: 'object',
        properties: {
          section: {
            type: 'string',
            enum: ['server', 'web', 'onebot', 'llm_adapters', 'storage', 'system', 'models', 'debug'],
            description: 'Optional: specify a config section. If omitted, returns full system config.'
          }
        },
        required: []
      },
      adminOnly: true
    })
    this.func = this.execute.bind(this)
  }

  getDisplayName(params) {
    const { section } = params || {}
    return section ? `Reading ${section} config` : 'Reading system config'
  }

  /**
   * Tool 层脱敏：mask api_key，不影响前端管理面板
   */
  _maskToolApiKeys(data) {
    const copy = JSON.parse(JSON.stringify(data))

    // 处理完整配置格式: { ..., llm_adapters: { openai: [...], gemini: [...] } }
    if (copy.llm_adapters && typeof copy.llm_adapters === 'object') {
      for (const instances of Object.values(copy.llm_adapters)) {
        if (Array.isArray(instances)) {
          instances.forEach(inst => {
            if (inst.api_key) inst.api_key = maskSecret(inst.api_key)
          })
        }
      }
    }

    // 处理 section = llm_adapters 格式: { openai: [...], gemini: [...] }
    for (const value of Object.values(copy)) {
      if (Array.isArray(value)) {
        const hasApiKey = value.some(item => item && typeof item === 'object' && 'api_key' in item)
        if (hasApiKey) {
          value.forEach(inst => {
            if (inst.api_key) inst.api_key = maskSecret(inst.api_key)
          })
        }
      }
    }

    return copy
  }

  async execute(e) {
    const { section } = e.params || {}
    try {
      if (section) {
        // 走细粒度 section 查询，避免一次拉全量
        const config = await getConfigSection(section)
        const safeConfig = this._maskToolApiKeys(config)
        return { success: true, section, config: safeConfig }
      }

      // 无 section 参数，返回完整配置（兼容旧行为）
      const config = await getFullConfig()
      const safeConfig = sanitizeConfig(config)
      const toolSafeConfig = this._maskToolApiKeys(safeConfig)
      return { success: true, config: toolSafeConfig }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}
