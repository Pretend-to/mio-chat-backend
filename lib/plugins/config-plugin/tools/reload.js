import { MioFunction } from '../../../function.js'

export default class ReloadService extends MioFunction {
  constructor() {
    super({
      adminOnly: true,
      description: 'Trigger a reload of a specific plugin or all LLM adapters to apply new configurations.',
      name: 'reload',
      parameters: {
        properties: {
          pluginName: {
            description: 'Name of the plugin to reload (required if target is "plugin").',
            type: 'string'
          },
          target: {
            description: 'What to reload.',
            enum: ['llm_adapters', 'plugin'],
            type: 'string'
          }
        },
        required: ['target'],
        type: 'object'
      }
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
        return { details: result, message: 'LLM适配器热重载成功', success: true }
      }

      // 插件重载走 HTTP 内部 API（已有对应路由）
      if (!pluginName) {throw new Error('pluginName is required for target "plugin"')}

      const { getFullConfig } = await import('../../../server/http/services/configService.js')
      const cfg = await getFullConfig()
      const port = cfg?.server?.port || 3000
      const adminCode = cfg?.web?.admin_code || ''

      const url = `http://localhost:${port}/api/plugins/${pluginName}/reload`
      const res = await fetch(url, {
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-code': adminCode
        },
        method: 'POST'
      })

      const data = await res.json()
      if (!res.ok || data.code !== 0) {
        throw new Error(data.message || 'Reload failed')
      }

      return { details: data.data, message: `插件 ${pluginName} 重载成功`, success: true }
    } catch (error) {
      logger.error('ReloadService execution failed:', error)
      return { error: error.message, success: false }
    }
  }
}
