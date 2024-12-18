import { MioFunction, Param } from '../../../lib/functions.js'
import puppeteer from 'puppeteer'

export class searchInternet extends MioFunction {
  constructor() {
    super({
      name: 'searchInternet',
      description: 'A tool to scrape web data from Bing search results.',
      params: [
        new Param({
          name: 'query',
          type: 'string',
          description: 'The search query to scrape data for.',
          required: true,
        }),
      ],
    })
    this.func = this.scrapeData
  }

  async scrapeData(e) {
    const startTime = Date.now() // 记录开始时间
    logger.debug('Starting scrapeData function...')

    const { query } = e.params

    const browser = await puppeteer.launch()
    const page = await browser.newPage()

    // Navigate to Bing search with the provided query
    await page.goto(
      `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
      { waitUntil: 'domcontentloaded' }
    )

    // Wait for the search result items to load
    await page.waitForSelector('li.b_algo', { timeout: 10000 }) // Wait for up to 10 seconds

    // Extract data
    const results = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('li.b_algo'))
      return items.map((item) => ({
        title: item.querySelector('h2 a')?.innerText || '',
        url: item.querySelector('h2 a')?.href || '',
        snippet: item.querySelector('p')?.innerText || '',
      }))
    })

    // results 只取前五个
    results.splice(5)

    const parsedPages = []

    const parse = async (url) => {
      const pageStartTime = Date.now() // 记录页面开始时间
      try {
        const page = await browser.newPage()
        await page.goto(url, { waitUntil: 'domcontentloaded' })
        const result = await page.evaluate(() => {
          const texts = []

          // 先把所有summary都展开
          const summaryElements = document.querySelectorAll('summary')
          summaryElements.forEach(summary => {
            summary.click()
          })

          // 模拟用户选择所有文本
          const selection = window.getSelection()
          const range = document.createRange()
          range.selectNodeContents(document.body)
          selection.removeAllRanges()
          selection.addRange(range)

          // 获取选中的文本
          const selectedText = selection.toString().trim()
          if (selectedText) {
            texts.push(selectedText)
          }

          return {
            pureText: texts.join('\n'),
          }
        })
        const pageEndTime = Date.now() // 记录页面结束时间
        logger.debug(`Parsed page ${url} in ${pageEndTime - pageStartTime} ms`)
        return result
      } catch (error) {
        console.error('Error parsing page:', error)
        return null
      }
    }

    logger.debug(results)

    // 使用promise.all()来等待所有解析操作完成
    await Promise.all(
      results.map(async (result) => {
        const text = await parse(result.url)
        parsedPages.push({
          title: result.title,
          url: result.url,
          snippet: result.snippet,
          content: text,
        })
      })
    )

    await browser.close()
    const endTime = Date.now() // 记录结束时间
    logger.debug(`Finished scrapeData function. Time taken: ${endTime - startTime} ms`)
    return parsedPages // Returns the scraped results
  }
}
