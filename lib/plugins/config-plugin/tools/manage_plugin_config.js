import { MioFunction } from '../../../function.js'
import PluginConfigService from '../../../database/services/PluginConfigService.js'

export default class ManagePluginConfig extends MioFunction {
  constructor() {
    super({
      name: 'manage_plugin_config',
      description: 'Manage configurations for various MioChat plugins (e.g., mcp-plugin, file-editor-plugin). Use this to view or modify plugin-specific settings stored in the database.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list_plugins', 'get_config', 'update_config'],
            description: 'The action to perform.'
          },
          pluginName: {
            type: 'string',
            description: 'The name of the plugin (required for get_config and update_config).'
          },
          config: {
            type: 'object',
            description: 'The new configuration object (required for update_config). This will be merged with or overwrite existing config.'
          }
        },
        required: ['action']
      },
      adminOnly: true
    })
    this.func = this.execute.bind(this)
  }

  async execute(e) {
    const { action, pluginName, config } = e.params
    try {
      await PluginConfigService.initialize()

      if (action === 'list_plugins') {
        // Return a list of all plugins that have configurations in the database
        const configs = await PluginConfigService.findAll()
        const plugins = configs.map(c => ({
          name: c.pluginName,
          lastUpdated: c.updatedAt
        }))
        
        // Also include active plugins from middleware even if they don't have DB config yet
        const activePlugins = (global.middleware.plugins || []).map(p => p.name)
        const combined = Array.from(new Set([...plugins.map(p => p.name), ...activePlugins]))
        
        return { success: true, plugins: combined, databaseConfigs: plugins }
      }

      if (!pluginName) {
        throw new Error('pluginName is required for this action')
      }

      if (action === 'get_config') {
        const result = await PluginConfigService.findByName(pluginName)
        if (!result) {
          // If not in DB, try to get default from the active plugin instance
          const plugin = (global.middleware.plugins || []).find(p => p.name === pluginName)
          if (plugin) {
            const defaultConfig = await plugin.getConfig()
            return { success: true, pluginName, config: defaultConfig, source: 'default' }
          }
          return { success: false, error: `Plugin "${pluginName}" not found in database or active memory.` }
        }
        return { success: true, pluginName, config: result.configData, source: 'database' }
      }

      if (action === 'update_config') {
        if (!config) throw new Error('config is required for update_config action')
        
        const existing = await PluginConfigService.findByName(pluginName)
        let finalConfig = {}
        
        if (existing) {
          finalConfig = JSON.parse(JSON.stringify(existing.configData))
          
          // 深度递归合并函数
          const deepUpdate = (target, source) => {
            for (const key of Object.keys(source)) {
              const value = source[key]
              if (value === null) {
                // 显式删除键
                delete target[key]
              } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // 如果是对象，递归合并
                if (typeof target[key] !== 'object' || target[key] === null || Array.isArray(target[key])) {
                  target[key] = {}
                }
                deepUpdate(target[key], value)
              } else {
                // 基础类型，直接覆盖
                target[key] = value
              }
            }
          }
          
          deepUpdate(finalConfig, config)
          result = await PluginConfigService.update(pluginName, finalConfig)
        } else {
          result = await PluginConfigService.create(pluginName, config)
        }
        
        // 关键：通知内存中的插件实例同步更新配置
        const activePlugin = (global.middleware.plugins || []).find(p => p.name === pluginName)
        if (activePlugin) {
          await activePlugin.reloadConfig()
          // 对于 MCP 插件，更新配置后通常需要重新加载工具
          if (typeof activePlugin.loadTools === 'function') {
            await activePlugin.loadTools()
          }
        }
        
        return { success: true, message: `Configuration for plugin "${pluginName}" updated and hot-reloaded.`, result }
      }

      throw new Error(`Unknown action: ${action}`)
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}
