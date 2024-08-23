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
    const { query } = e.params

    const browser = await puppeteer.launch()
    const page = await browser.newPage()

    // Navigate to Bing search with the provided query
    await page.goto(
      `https://cn.bing.com/search?q=${encodeURIComponent(query)}`,
      { waitUntil: 'networkidle2' }
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

    await browser.close()
    return results // Returns the scraped results
  }
}
