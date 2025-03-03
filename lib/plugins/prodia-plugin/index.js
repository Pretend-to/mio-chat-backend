import Plugin from '../../plugin.js' // 假设 utils.js 在 lib 目录下
import path from 'path'
import { fileURLToPath } from 'url' // 导入 fileURLToPath

export default class GlmPlugin extends Plugin {
  constructor() {
    super()
  }

  getFilePath() {
    const __filename = fileURLToPath(import.meta.url)  // 获取当前文件的路径
    const __dirname = path.dirname(__filename)          // 获取当前目录的路径
    return __dirname // 返回当前目录
  }

  getInitialConfig() {
    return {
      token: ''
    }
  }
}
