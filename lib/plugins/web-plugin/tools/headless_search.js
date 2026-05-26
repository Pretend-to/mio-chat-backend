import { MioFunction } from '../../../function.js'
import { launchBrowser } from '../lib/browser.js'
import { searchParsers } from '../lib/searchParsers.js'
import axios from 'axios'

export default class headless_search extends MioFunction {
  constructor() {
    super({
      name: 'headless_search',
      description: 'Search the web using a headless browser. Automatically tests search engines (DuckDuckGo, Bing, Baidu, Google) for connectivity and picks the best responsive engine, returning structured results.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query string.',
          },
        },
        required: ['query'],
      },
    })
    this.func = this.runSearch
  }

  async runSearch(e) {
    const { query } = e.params
    logger.info(`Starting headless search for query: "${query}"`)

    // 1. Test connectivity of search engines in parallel
    const engines = [
      { id: 'duckduckgo', name: 'DuckDuckGo (HTML)', url: 'https://html.duckduckgo.com', searchUrl: 'https://html.duckduckgo.com/html/?q=', priority: 1 },
      { id: 'bing', name: 'Bing', url: 'https://www.bing.com', searchUrl: 'https://www.bing.com/search?q=', priority: 2 },
      { id: 'baidu', name: 'Baidu', url: 'https://www.baidu.com', searchUrl: 'https://www.baidu.com/s?wd=', priority: 3 },
      { id: 'google', name: 'Google', url: 'https://www.google.com', searchUrl: 'https://www.google.com/search?q=', priority: 4 }
    ]

    logger.debug('Testing search engine connectivity in parallel...')
    const checks = await Promise.all(
      engines.map(async (eng) => {
        try {
          const start = Date.now()
          const res = await axios.get(eng.url, { timeout: 2500, headers: { 'User-Agent': 'Mozilla/5.0' } })
          return {
            ...eng,
            ok: res.status === 200,
            latency: Date.now() - start
          }
        } catch (err) {
          return { ...eng, ok: false, error: err.message }
        }
      })
    )

    // Filter available engines and sort by priority first, then latency
    const available = checks
      .filter(eng => eng.ok)
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority
        }
        return a.latency - b.latency
      })

    if (available.length === 0) {
      logger.error('No search engines are reachable. Offline or blocked.')
      return {
        success: false,
        error: 'All search engines are currently unreachable or blocked.',
      }
    }

    const selectedEngine = available[0]
    logger.info(`Selected search engine: ${selectedEngine.name} (Latency: ${selectedEngine.latency}ms)`)

    const searchUrl = `${selectedEngine.searchUrl}${encodeURIComponent(query)}`
    const pluginConfig = this.getPluginConfig() || {}
    const chromePath = pluginConfig.chromePath || pluginConfig.parse?.puppeteer?.chromePath
    
    let browser
    try {
      browser = await launchBrowser(chromePath)
      const page = await browser.newPage()
      await page.setViewport({ width: 1280, height: 800 })
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

      logger.debug(`Navigating to: ${searchUrl}`)
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 })

      // Evaluate the appropriate parser from searchParsers
      const results = await page.evaluate(searchParsers[selectedEngine.id])

      logger.info(`Headless search completed. Retrieved ${results.length} results from ${selectedEngine.name}.`)

      return {
        success: true,
        engine: selectedEngine.name,
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
