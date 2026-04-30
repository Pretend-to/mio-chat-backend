import { MioFunction } from '../../../function.js'
import { launchBrowser } from '../lib/browser.js'
import logger from '../../../../utils/logger.js'
import { extractPageContent } from '../lib/extractor.js'

export default class searchInternet extends MioFunction {
  constructor() {
    super({
      name: 'searchInternet',
      description: 'A tool to search and scrape data from Bing results.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to search for.',
          },
        },
        required: ['query'],
      },
    })
    this.func = this.scrapeData
    this.maxConcurrency = 3
    this.pageParseTimeout = 15000
  }

  async checkConnectivity(url) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 2000)
      const response = await fetch(url, { method: 'HEAD', signal: controller.signal })
      clearTimeout(timeout)
      return response.ok
    } catch (error) {
      return false
    }
  }

  async scrapeData(e) {
    const { query } = e.params
    const startTime = Date.now()
    let browser

    try {
      let bingURL = 'https://www.bing.com/search?q='
      const isWWWBingReachable = await this.checkConnectivity('https://www.bing.com')
      
      if (!isWWWBingReachable) {
        const isCNBingReachable = await this.checkConnectivity('https://cn.bing.com')
        if (isCNBingReachable) {
          bingURL = 'https://cn.bing.com/search?q='
        }
      }

      browser = await launchBrowser()
      const page = await browser.newPage()
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
      
      await page.goto(`${bingURL}${encodeURIComponent(query)}`, {
        waitUntil: 'domcontentloaded',
      })
      
      await page.waitForSelector('li.b_algo', { timeout: 10000 })

      const results = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('li.b_algo')).map((item) => ({
          title: item.querySelector('h2 a')?.innerText || '',
          url: item.querySelector('h2 a')?.href || '',
          snippet: item.querySelector('p')?.innerText || '',
        })).filter(item => item.url).slice(0, 5)
      })

      const parsedPages = []
      const taskList = results.map(async (result) => {
          let pageInstance
          try {
              pageInstance = await browser.newPage()
              await pageInstance.goto(result.url, {
                  waitUntil: 'domcontentloaded',
                  timeout: this.pageParseTimeout,
              })
              const contentData = await extractPageContent(pageInstance)
              if (contentData.pureText) {
                  parsedPages.push({
                      ...result,
                      content: contentData.pureText
                  })
              }
          } catch (err) {
              logger.error(`Error parsing ${result.url}: ${err.message}`)
          } finally {
              if (pageInstance) await pageInstance.close()
          }
      })

      for (let i = 0; i < taskList.length; i += this.maxConcurrency) {
          const chunk = taskList.slice(i, i + this.maxConcurrency)
          await Promise.all(chunk)
      }

      logger.info(`Search for "${query}" completed in ${Date.now() - startTime}ms. Found ${parsedPages.length} results.`)
      return parsedPages.length > 0 ? parsedPages : null
    } catch (err) {
      logger.error(`searchInternet failed: ${err.message}`)
      throw err
    } finally {
      if (browser) await browser.close()
    }
  }
}
