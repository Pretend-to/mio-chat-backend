import { MioFunction } from '../../../function.js'
import { launchBrowser } from '../lib/browser.js'
import { searchParsers } from '../lib/searchParsers.js'

const engineUrls = {
  duckduckgo: {
    name: 'DuckDuckGo (HTML)',
    searchUrl: 'https://html.duckduckgo.com/html/?q='
  },
  bing: {
    name: 'Bing',
    searchUrl: 'https://www.bing.com/search?q='
  },
  cn_bing: {
    name: 'CN Bing',
    searchUrl: 'https://cn.bing.com/search?q='
  },
  baidu: {
    name: 'Baidu',
    searchUrl: 'https://www.baidu.com/s?wd='
  },
  google: {
    name: 'Google',
    searchUrl: 'https://www.google.com/search?q='
  }
}

export default class headless_search extends MioFunction {
  constructor() {
    super({
      name: 'headless_search',
      description: 'Search the web using a headless browser. Uses the specified or active search engine (DuckDuckGo, Bing, CN Bing, Baidu, Google) and returns structured results.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query string.',
          },
          engine: {
            type: 'string',
            description: 'Optional. The search engine to use: "duckduckgo", "bing", "cn_bing", "baidu", or "google". If not specified, uses the best active engine detected at startup.',
            enum: ['duckduckgo', 'bing', 'cn_bing', 'baidu', 'google']
          }
        },
        required: ['query'],
      },
    })
    this.func = this.runSearch
  }
  getDisplayName(params) {
    const { query } = params
    if (!query) return 'Searching web'
    return `Searching: "${query}"`
  }

  async runSearch(e) {
    const { query, engine } = e.params
    logger.info(`Starting headless search for query: "${query}"`)

    const pluginConfig = this.getPluginConfig() || {}
    const engineId = engine || this.parentPlugin?.activeEngine || pluginConfig.search?.engine || 'duckduckgo'
    const engineInfo = engineUrls[engineId] || engineUrls['duckduckgo']

    logger.info(`Selected search engine: ${engineInfo.name} (requested/active: ${engineId})`)

    const searchUrl = `${engineInfo.searchUrl}${encodeURIComponent(query)}`
    const pluginConfigObject = this.getPluginConfig() || {}
    const chromePath = pluginConfigObject.chromePath || pluginConfigObject.parse?.puppeteer?.chromePath
    
    let browser
    try {
      browser = await launchBrowser(chromePath, { parentPlugin: this.parentPlugin })
      const page = await browser.newPage()
      await page.setViewport({ width: 1280, height: 800 })
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

      logger.debug(`Navigating to: ${searchUrl}`)
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })

      // Evaluate the appropriate parser from searchParsers
      const parser = searchParsers[engineId] || searchParsers['duckduckgo']
      const results = await page.evaluate(parser)

      logger.info(`Headless search completed. Retrieved ${results.length} results from ${engineInfo.name}.`)

      return {
        success: true,
        engine: engineInfo.name,
        results: results.slice(0, 10), // Limit to top 10 results
      }
    } catch (err) {
      logger.error(`Headless search failed: ${err.message}`)
      return {
        success: false,
        error: err.message,
      }
    } finally {
      if (browser) await browser.close()
    }
  }
}
