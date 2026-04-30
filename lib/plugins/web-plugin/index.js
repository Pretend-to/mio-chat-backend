import Plugin from '../../plugin.js'
import path from 'path'
import { fileURLToPath } from 'url'

export default class GlmPlugin extends Plugin {
  constructor() {
    super()
  }

  getFilePath() {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    return __dirname
  }

  getInitialConfig() {
    return {
      search: {
        engine: 'bing',
        puppeteer: true,
      },
      parse: {
        puppeteer: {
          engine: 'bing',
        },
      },
    }
  }
}
