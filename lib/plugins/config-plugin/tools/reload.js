import { MioFunction } from '../../../function.js'

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

  getDisplayName(params) {
    const { target, pluginName } = params
    return `Reloading: ${target === 'plugin' ? (pluginName || 'plugin') : 'LLM adapters'}`
  }

  async execute(e) {
    const { target, pluginName } = e.params
    try {
      if (target === 'llm_adapters') {
        // 直接调用内存中的 middleware 服务进行热重载，避免走不存在的 HTTP 路由
        if (!global.middleware) {
          throw new Error('Middleware not initialized')
        }
        if (typeof global.middleware.reloadLLMAdapters !== 'function') {
          throw new Error('reloadLLMAdapters method not found on middleware')
        }
        const result = await global.middleware.reloadLLMAdapters()
        return { success: true, message: 'LLM适配器热重载成功', details: result }
      }

      // 插件重载走 HTTP 内部 API（已有对应路由）
      if (!pluginName) throw new Error('pluginName is required for target "plugin"')

      const { getFullConfig } = await import('../../../server/http/services/configService.js')
      const cfg = await getFullConfig()
      const port = cfg?.server?.port || 3000
      const adminCode = cfg?.web?.admin_code || ''

      const url = `http://localhost:${port}/api/plugins/${pluginName}/reload`
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

      return { success: true, message: `插件 ${pluginName} 重载成功`, details: data.data }
    } catch (error) {
      logger.error('ReloadService execution failed:', error)
      return { success: false, error: error.message }
    }
  }
}
