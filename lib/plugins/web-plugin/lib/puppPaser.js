import { launchBrowser } from './browser.js'
import { extractPageContent } from './extractor.js'

export default class puppPaser {
  constructor(targetUrl, config = {}) {
    this.engine = config.engine
    this.chromePath = config.chromePath
    this.targetUrl = targetUrl
    this.config = config
  }

  async parse() {
    let url = this.targetUrl
    let startTime = Date.now()
    let browser
    let page
    try {
      browser = await launchBrowser(this.chromePath, this.config)
      page = await browser.newPage()
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

      logger.debug(`Puppeteer: Navigating to ${url}`)
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })

      // page.evaluate() 本身没有超时保护，对复杂 DOM 可能永远阻塞，
      // 用 Promise.race 硬限 10 秒，超时则抛错由外层 catch 捕获。
      const result = await Promise.race([
        extractPageContent(page),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('extractPageContent timed out after 10s')), 10000)
        ),
      ])

      const duration = (Date.now() - startTime) / 1000
      logger.info(`Puppeteer parsing of ${url} completed in ${duration.toFixed(2)}s`)

      return {
        success: true,
        source: 'puppeteer',
        ...result,
      }
    } catch (error) {
      logger.error(`Puppeteer failed to parse ${url}: ${error.message}`)
      return {
        success: false,
        source: 'puppeteer',
        error: { message: error.message },
      }
    } finally {
      // browser 由懒加载池管理（close 被 Proxy noop），
      // 但 page 必须手动关闭，否则每次 parse 都泄漏一个 tab。
      if (page) {
        try { await page.close() } catch (_) {}
      }
    }
  }
}
