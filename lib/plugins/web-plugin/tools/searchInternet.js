import { MioFunction } from '../../../functions.js'
import puppeteer from 'puppeteer'

export default class searchInternet extends MioFunction {
  constructor() {
    super({
      name: 'searchInternet',
      description: 'A tool to scrape web data from Bing search results.',
      params: [{
        name: 'query',
        type: 'string',
        description: 'The search query to scrape data for.',
      }],
      required: ['query'],
    })
    this.func = this.scrapeData
    this.maxConcurrency = 3 // Limit concurrency to 3
    this.pageParseTimeout = 8000 // Reduced page parse timeout for faster results on average
  }

  async scrapeData(e) {
    const startTime = Date.now()
    logger.debug('Starting scrapeData function...')
    const { query } = e.params

    let browser = null // Declare browser outside the try block

    try {
      browser = await puppeteer.launch() // Launch browser only once
      const page = await browser.newPage()

      await page.goto(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('li.b_algo', { timeout: 10000 })

      let results = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('li.b_algo'))
        return items.map(item => ({
          title: item.querySelector('h2 a')?.innerText || '',
          url: item.querySelector('h2 a')?.href || '',
          snippet: item.querySelector('p')?.innerText || '',
        }))
      })

      results.splice(5)

      const parse = async (url) => {
        const pageStartTime = Date.now()
        try {
          const parsePage = await browser.newPage()
          await parsePage.goto(url, { waitUntil: 'domcontentloaded', timeout: this.pageParseTimeout })

          const content = await this.extractContent(parsePage)
          await parsePage.close()

          const pageEndTime = Date.now()
          logger.debug(`Parsed page ${url} in ${pageEndTime - pageStartTime} ms`)
          return { success: true, content }

        } catch (error) {
          logger.error(`Error parsing page ${url}: ${error.message}`)
          return { success: false }
        }
      }

      // Control concurrency using a manual Promise.all implementation
      const parsedPages = []
      const queue = [...results]  // Create a copy to avoid modifying original
      let running = 0

      const processNext = async () => {
        if (queue.length === 0 && running === 0) {
          return // All tasks complete
        }

        while (running < this.maxConcurrency && queue.length > 0) {
          running++
          const result = queue.shift()
          const { url } = result // Destructure here

          try {
            const parsedResult = await parse(url) // Wait for each parse
            if (parsedResult.success) {
              parsedPages.push({
                title: result.title,
                url: result.url,
                snippet: result.snippet,
                content: parsedResult.content,
              })
            }
          } catch (err) {
            logger.error(`Parse task failed ${url}: ${err.message}`) //Log real errors.
          } finally {
            running--
            processNext() // Process the next item in the queue.
          }
        }
      }
      // Start processing the queue
      await Promise.all(Array(Math.min(results.length, this.maxConcurrency)).fill(null).map(() => processNext()))

      const endTime = Date.now()
      logger.debug(`Finished scrapeData function. Total time taken: ${endTime - startTime} ms`)

      return parsedPages.length > 0 ? parsedPages : null // Return only successfully parse ones.

    } catch (err) {
      logger.error(`scrapeData failed: ${err.message}`)
      return null
    } finally {
      if (browser) {
        try {
          await browser.close()
        } catch (closeError) {
          logger.error(`Error closing browser: ${closeError.message}`)
        }
      }
    }
  }

  async extractContent(parsePage) {
    try {

      const result = await parsePage.evaluate(() => {
        const texts = []
        // 先把所有 summary 元素展开（如果有）
        const summaryElements = document.querySelectorAll('summary')
        summaryElements.forEach(summary => {
          summary.click()
        })
        // 模拟用户选中整个文档
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
      return result.pureText
    } catch (error) {
      logger.error(`Error extracting content: ${error.message}`)
      return '' // Return an empty string
    }

  }
}