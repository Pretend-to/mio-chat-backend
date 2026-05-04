import { MioFunction } from '../../../function.js'
import { updateConfig } from '../../../server/http/services/configService.js'

export default class UpdateSystemConfig extends MioFunction {
  constructor() {
    super({
      name: 'update_config',
      description: 'Update system configuration nodes (server, web, onebot, storage, llm_adapters). Partial updates are supported.',
      parameters: {
        type: 'object',
        properties: {
          updates: {
            type: 'object',
            description: 'The configuration object containing fields to update. Example: {"web": {"title": "MioChat Pro"}}'
          }
        },
        required: ['updates']
      },
      adminOnly: true
    })
    this.func = this.execute.bind(this)
  }

  async execute(e) {
    const { updates } = e.params
    try {
      const result = await updateConfig(updates)
      return { success: true, result }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}
