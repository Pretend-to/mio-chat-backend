import { loadMcpPlugins } from './lib/mcpLoader.js'
import Plugin from '../../plugin.js' // 假设 utils.js 在 lib 目录下
import path from 'path'
import { fileURLToPath } from 'url' // 导入 fileURLToPath

export default class mcpPlugin extends Plugin {
  constructor() {
    super()
    this.mcpServers = new Map() // 存储每个服务的实例
  }

  getFilePath() {
    const __filename = fileURLToPath(import.meta.url)  // 获取当前文件的路径
    const __dirname = path.dirname(__filename)          // 获取当前目录的路径
    return __dirname // 返回当前目录
  }

  async loadTools() {
    if (this.isReloading) {
        return; // Prevent recursive calls
    }
    this.isReloading = true;

    try {
      const config = this.getConfig()
      await this._getMcpTools(config)
      
    } catch (error) {
      logger.error(`[${this.name}] Error reading tools directory (${this.toolsPath}):`, error);
       this.tools.clear(); // Clear tools on error reading directory
    }
    
    this.isReloading = false;
  }

  getInitialConfig() {
    return {
      mcpServers: {

      }
    }
  }

  getTools() {
   const map = new Map()
   for (const [serverName, tools] of this.mcpServers) { // 使用 for...of 循环遍历 Map 中的键值对
    map.set(serverName, tools) // 使用 set 方法添加键值对到新的 Map 中
   }
   return map;
  }

  async _getMcpTools(config){
    this.mcpServers = await loadMcpPlugins(config)
  }
}
