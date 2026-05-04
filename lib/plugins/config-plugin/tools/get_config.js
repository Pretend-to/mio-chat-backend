import { MioFunction } from '../../../function.js'
import { getFullConfig, sanitizeConfig } from '../../../server/http/services/configService.js'

export default class GetSystemConfig extends MioFunction {
  constructor() {
    super({
      name: 'get_config',
      description: 'Retrieve the current system configuration, including server, web, LLM adapters, and storage settings. Sensitive values are masked.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      },
      adminOnly: true
    })
    this.func = this.execute.bind(this)
  }

  async execute() {
    try {
      const config = await getFullConfig()
      const safeConfig = sanitizeConfig(config)
      return { success: true, config: safeConfig }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}
