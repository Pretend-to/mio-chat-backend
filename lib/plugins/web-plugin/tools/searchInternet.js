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
    } catch {
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
      
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
      })

      await page.goto(`${bingURL}${encodeURIComponent(query)}`, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      })

      try {
        // Wait for the results container or specific result items
        await page.waitForSelector('#b_results, li.b_algo, .b_algo', { timeout: 15000 })
      } catch (err) {
        const title = await page.title()
        const hasCaptcha = await page.evaluate(() => 
          document.body.innerText.includes('CAPTCHA') || 
          document.body.innerText.includes('验证码') || 
          !!document.querySelector('#challenge-form')
        )
        if (hasCaptcha) {
          throw new Error(`Bing blocked the request with a CAPTCHA. Server: HK/International.`)
        }
        throw new Error(`Search results not found. Title: ${title}. ${err.message}`)
      }

      const results = await page.evaluate(() => {
        const blacklist = ['zhihu.com', 'bilibili.com', 'weibo.com'] // Domains that are hard to scrape or 403 often
        return Array.from(document.querySelectorAll('li.b_algo')).map((item) => {
          const anchor = item.querySelector('h2 a')
          return {
            title: anchor?.innerText || '',
            url: anchor?.href || '',
            snippet: item.querySelector('.b_caption p, .b_snippet')?.innerText || item.querySelector('p')?.innerText || '',
          }
        }).filter(item => {
            if (!item.url || item.url.includes('bing.com')) return false
            return !blacklist.some(domain => item.url.includes(domain))
        })
      })

      // Result Diversity Filter
      const domainCount = {}
      const filteredResults = []
      for (const res of results) {
          try {
              const domain = new URL(res.url).hostname
              domainCount[domain] = (domainCount[domain] || 0) + 1
              if (domainCount[domain] <= 2) { // Limit to 2 results per domain
                  filteredResults.push(res)
              }
          } catch {
              filteredResults.push(res)
          }
          if (filteredResults.length >= 5) break
      }


      const parsedPages = []
      const taskList = filteredResults.map(async (result) => {
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

      logger.info(`Search for "${query}" completed in ${Date.now() - startTime}ms. Found ${parsedPages.length} diverse results.`)
      return parsedPages.length > 0 ? parsedPages : null

    } catch (err) {
      logger.error(`searchInternet failed: ${err.message}`)
      throw err
    } finally {
      if (browser) await browser.close()
    }
  }
}
