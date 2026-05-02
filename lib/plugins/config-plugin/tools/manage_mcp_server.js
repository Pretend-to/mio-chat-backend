import { MioFunction } from '../../../function.js'
import PluginConfigService from '../../../database/services/PluginConfigService.js'

export default class ManageMcpServer extends MioFunction {
  constructor() {
    super({
      name: 'manage_mcp_server',
      description: 'Add or remove an MCP (Model Context Protocol) server configuration.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['add', 'remove'],
            description: 'The action to perform.'
          },
          serverName: {
            type: 'string',
            description: 'The unique name of the MCP server.'
          },
          config: {
            type: 'object',
            description: 'The connection config for "add" action. Contains "command" and "args" (stdio) or "url" (http).'
          }
        },
        required: ['action', 'serverName']
      },
      adminOnly: true
    })
    this.func = this.execute.bind(this)
  }

  async execute(e) {
    const { action, serverName, config } = e.params
    try {
      await PluginConfigService.initialize()
      const current = await PluginConfigService.findByName('mcp-plugin')
      const currentData = current?.configData || { mcpServers: {} }
      const mcpServers = currentData.mcpServers || {}

      if (action === 'add') {
        if (!config) throw new Error('Config is required for "add" action')
        mcpServers[serverName] = config
      } else if (action === 'remove') {
        delete mcpServers[serverName]
      }

      const newConfigData = { ...currentData, mcpServers }

      if (current) {
        await PluginConfigService.update('mcp-plugin', newConfigData)
      } else {
        await PluginConfigService.create('mcp-plugin', newConfigData)
      }

      return { success: true, message: `MCP server "${serverName}" ${action}ed successfully.` }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}
