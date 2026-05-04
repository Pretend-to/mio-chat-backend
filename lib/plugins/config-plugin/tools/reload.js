import { MioFunction } from '../../../function.js'
import logger from '../../../../utils/logger.js'

export default class ReloadService extends MioFunction {
  constructor() {
    super({
      name: 'reload',
      description: 'Trigger a reload of a specific plugin or all LLM adapters to apply new configurations.',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            enum: ['llm_adapters', 'plugin'],
            description: 'What to reload.'
          },
          pluginName: {
            type: 'string',
            description: 'Name of the plugin to reload (required if target is "plugin").'
          }
        },
        required: ['target']
      },
      adminOnly: true
    })
    this.func = this.execute.bind(this)
  }

  async execute(e) {
    const { target, pluginName } = e.params
    try {
      // We call the internal API to ensure middleware state is updated correctly
      // We need to get the admin_code and port
      const { getFullConfig } = await import('../../../server/http/services/configService.js')
      const cfg = await getFullConfig()
      const port = cfg?.server?.port || 3000
      const adminCode = cfg?.web?.admin_code || ''

      let url = `http://localhost:${port}/api/`
      if (target === 'llm_adapters') {
        url += 'llm/reload'
      } else {
        if (!pluginName) throw new Error('pluginName is required for target "plugin"')
        url += `plugins/${pluginName}/reload`
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'x-admin-code': adminCode,
          'Content-Type': 'application/json'
        }
      })

      const data = await res.json()
      if (!res.ok || data.code !== 0) {
        throw new Error(data.message || 'Reload failed')
      }

      return { success: true, message: `${target} reloaded successfully`, details: data.data }
    } catch (error) {
      logger.error('ReloadService execution failed:', error)
      return { success: false, error: error.message }
    }
  }
}
