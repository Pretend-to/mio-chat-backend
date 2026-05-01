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
    const _startTime = Date.now()
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
      
      // Stealth: Remove webdriver flag
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
      })

      // Set more realistic headers and UA
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36')
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      })

      // Use a more realistic search URL with form params
      const searchUrl = `${bingURL}${encodeURIComponent(query)}&FORM=QBLH&sp=-1&ghc=1`
      
      await page.goto(searchUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      })

      // Small delay to simulate human reading
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))

      try {
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

      const results = await page.evaluate((searchQuery) => {
        const blacklist = [
            'apps.apple.com', 'play.google.com', 'microsoft.com/detail', 
            'zhihu.com', 'bilibili.com', 'weibo.com', 'douyin.com'
        ]
        
        const keywords = searchQuery.split(/\s+/).filter(k => k.length > 1)

        return Array.from(document.querySelectorAll('li.b_algo')).map((item) => {
          const anchor = item.querySelector('h2 a')
          const title = anchor?.innerText || ''
          const url = anchor?.href || ''
          const snippet = item.querySelector('.b_caption p, .b_snippet')?.innerText || item.querySelector('p')?.innerText || ''
          
          const matches = keywords.filter(k => title.includes(k) || snippet.includes(k)).length
          const relevance = keywords.length > 0 ? matches / keywords.length : 1

          return { title, url, snippet, relevance }
        }).filter(item => {
            if (!item.url || item.url.includes('bing.com')) return false
            if (blacklist.some(domain => item.url.includes(domain))) return false
            // Allow low relevance results if they are not from blacklisted domains
            return true 
        }).sort((a, b) => b.relevance - a.relevance)
      }, query)

      const domainCount = {}
      const filteredResults = []
      for (const res of results) {
          try {
              const domain = new URL(res.url).hostname
              domainCount[domain] = (domainCount[domain] || 0) + 1
              if (domainCount[domain] <= 1) { 
                  filteredResults.push(res)
              }
          } catch {
              filteredResults.push(res)
          }
          if (filteredResults.length >= 4) break 
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

      return parsedPages.length > 0 ? parsedPages : null

    } catch (err) {
      logger.error(`searchInternet failed: ${err.message}`)
      throw err
    } finally {
      if (browser) await browser.close()
    }
  }
}
