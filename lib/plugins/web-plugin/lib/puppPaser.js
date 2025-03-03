import puppeteer from 'puppeteer'

export default class puppPaser {
  constructor(targetUrl, config) {
    this.engine = config.engine
    this.targetUrl = targetUrl
  }

  async parse() {
    if (this.engine === 'bing') {
      let browser = null
      let url = this.targetUrl
      let startTime = Date.now() // Record start time
      let result = null

      try {
        browser = await puppeteer.launch()
        const page = await browser.newPage()
        logger.debug(`Puppeteer: Navigating to ${url}`)
        await page.goto(url, { waitUntil: 'domcontentloaded' })
        logger.debug('Puppeteer: Page loaded')

        result = await page.evaluate(() => {
          // Helper function to extract data safely
          const extractData = (selector, attribute, process = (el) => el[attribute]) => {
            const elements = Array.from(document.querySelectorAll(selector))
            return elements.map(process)
          }

          // Expand all summary elements
          document.querySelectorAll('summary').forEach(summary => summary.click())

          // Extract all text
          const allText = document.body.innerText.trim()

          // Extract images
          const images = extractData('img', 'src', (img) => ({
            title: img.alt || '',
            url: img.src
          }))

          // Extract hyperlinks
          const hyperLinks = extractData('a', 'href', (link) => ({
            title: link.innerText.trim() || link.title || link.href,
            url: link.href
          }))


          return {
            pureText: allText,
            images: images,
            hyperLinks: hyperLinks,
          }
        })

        return {
          success: true,
          source: 'puppeteer',
          ...result
        }

      } catch (error) {
        logger.error(`Puppeteer failed to parse ${url}: ${error.message}`)
        return {
          success: false,
          source: 'puppeteer',
          error: { message: error.message },
        }
      } finally {
        if (browser) {
          try {
            await browser.close()
          } catch (closeError) {
            logger.error(`Error closing browser for ${url}: ${closeError.message}`)
          }
        }

        const endTime = Date.now()
        const duration = (endTime - startTime) / 1000 // in seconds
        logger.info(`Puppeteer parsing of ${url} completed in ${duration.toFixed(2)}s`) // Simplified logging
      }
    }
  }
}