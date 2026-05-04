import { loadMcpPlugins } from './lib/mcpLoader.js'
import Plugin from '../../plugin.js'

export default class McpPlugin extends Plugin {
  constructor() {
    super({ importMetaUrl: import.meta.url })
    this.mcpServers = new Map() // 存储每个服务的实例
  }

  async loadTools() {
    if (this.isReloading) {
      return // Prevent recursive calls
    }
    this.isReloading = true

    try {
      const config = await this.getConfig() // 修复：使用 await 获取配置
      await this._getMcpTools(config)
    } catch (error) {
      logger.error(
        `[${this.name}] Error reading tools directory (${this.toolsPath}):`,
        error,
      )
      this.tools.clear() // Clear tools on error reading directory
    }

    this.isReloading = false
  }

  getInitialConfig() {
    return {
      mcpServers: {
        'tavily-search': {
          url: 'https://mcp.tavily.com/mcp/?tavilyApiKey='
        }
      },
    }
  }

  getTools() {
    const map = new Map()
    for (const [serverName, tools] of this.mcpServers) {
      // 使用 for...of 循环遍历 Map 中的键值对
      map.set(serverName, tools) // 使用 set 方法添加键值对到新的 Map 中
    }
    return map
  }

  async _getMcpTools(config) {
    this.mcpServers = await loadMcpPlugins(config)
  }
}
