import { MioFunction } from '../../../function.js'
import { updateConfig } from '../../../server/http/services/configService.js'

export default class UpdateSystemConfig extends MioFunction {
  constructor() {
    super({
      adminOnly: true,
      description: 'Update system configuration nodes (server, web, onebot, storage, llm_adapters). Partial updates are supported.',
      name: 'update_config',
      parameters: {
        properties: {
          updates: {
            description: 'The configuration object containing fields to update. Example: {"web": {"title": "MioChat Pro"}}',
            type: 'object'
          }
        },
        required: ['updates'],
        type: 'object'
      }
    })
    this.func = this.execute.bind(this)
  }

  getDisplayName(params) {
    const { updates } = params
    const keys = updates ? Object.keys(updates).join(', ') : ''
    return `Updating system config: ${keys || 'system'}`
  }

  async execute(e) {
    const { updates } = e.params
    
    try {
      const result = await updateConfig(updates)
      return { result, success: true }
    } catch (error) {
      return { error: error.message, success: false }
    }
  }
}
