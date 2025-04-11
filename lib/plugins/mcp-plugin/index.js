import { loadMcpPlugins } from './lib/mcpLoader.js'
import Plugin from '../../plugin.js' // 假设 utils.js 在 lib 目录下
import path from 'path'
import { fileURLToPath } from 'url' // 导入 fileURLToPath

export default class mcpPlugin extends Plugin {
  constructor() {
    super()
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
      this.tools.clear()

      const config = this.getConfig()
      const mcpTools = await this._getMcpTools(config)
      
      for (const tool of mcpTools) {
        this.tools.set(tool.name, tool) 
      }

    } catch (error) {
      logger.error(`[${this.name}] Error reading tools directory (${this.toolsPath}):`, error);
       this.tools.clear(); // Clear tools on error reading directory
    }

    if (this.reloadCallback) {
      this.reloadCallback();
    }
    this.isReloading = false;
  }

  getInitialConfig() {

    return {
      mcpServers: {

      },
      mcpOriginServers: {

      }
    }
  }

  async _getMcpTools(config){
    return await loadMcpPlugins(config)
  }
}
