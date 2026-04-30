import logger from '../../../../utils/logger.js'
import { launchBrowser } from './browser.js'
import { extractPageContent } from './extractor.js'

export default class puppPaser {
  constructor(targetUrl, config) {
    this.engine = config.engine
    this.targetUrl = targetUrl
  }

  async parse() {
    let url = this.targetUrl
    let startTime = Date.now()
    let browser
    try {
      browser = await launchBrowser()
      const page = await browser.newPage()
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
      
      logger.debug(`Puppeteer: Navigating to ${url}`)
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      
      const result = await extractPageContent(page)

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
      if (browser) await browser.close()
    }
  }
}
