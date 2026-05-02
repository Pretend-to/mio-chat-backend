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
        let result
        if (existing) {
          // Perform a shallow merge of the config objects
          const mergedConfig = { ...existing.configData, ...config }
          result = await PluginConfigService.update(pluginName, mergedConfig)
        } else {
          result = await PluginConfigService.create(pluginName, config)
        }
        
        return { success: true, message: `Configuration for plugin "${pluginName}" updated successfully.`, result }
      }

      throw new Error(`Unknown action: ${action}`)
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}
