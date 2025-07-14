import Plugin from '../../plugin.js' // 假设 utils.js 在 lib 目录下
import path from 'path'
import { fileURLToPath } from 'url' // 导入 fileURLToPath

export default class GlmPlugin extends Plugin {
  constructor() {
    super()
  }

  getFilePath() {
    const __filename = fileURLToPath(import.meta.url) // 获取当前文件的路径
    const __dirname = path.dirname(__filename) // 获取当前目录的路径
    return __dirname // 返回当前目录
  }

  getInitialConfig() {
    // 枚举搜索引擎为 bing 或 google
    // 枚举 parse 模式为 api / puppetter / mixed
    return {
      search: {
        engine: 'bing',
        puppeteer: true,
        apiKey: '',
      },
      parse: {
        api: {
          baseUrl: 'https://magic-html-api.vercel.app',
          path: '/api/extract',
          query: {
            url: '{url}',
          },
        },
        puppeteer: {
          engine: 'bing',
        },
      },
    }
  }
}
