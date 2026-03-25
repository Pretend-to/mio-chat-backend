import puppeteer from 'puppeteer'

export default class puppPaser {
  constructor(targetUrl, config) {
    this.engine = config.engine
    this.targetUrl = targetUrl
  }

  async parse() {
    if (this.engine === 'bing') {
      let url = this.targetUrl
      let startTime = Date.now() // Record start time
      try {
        await using browser = await puppeteer.launch({
          headless: true, // Now defaults to the new headless mode
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'], // Recommended for Docker/Stable runs
        })
        const page = await browser.newPage()
        logger.debug(`Puppeteer: Navigating to ${url}`)
        await page.goto(url, { waitUntil: 'domcontentloaded' })
        logger.debug('Puppeteer: Page loaded')

        const result = await page.evaluate(() => {
          // Helper function to extract data safely
          const extractData = (
            selector,
            attribute,
            process = (el) => el[attribute],
          ) => {
            const elements = Array.from(document.querySelectorAll(selector))
            return elements.map(process)
          }

          // Expand all summary elements
          document
            .querySelectorAll('summary')
            .forEach((summary) => summary.click())

          const allText = document.body.innerText.trim()
          const images = extractData('img', 'src', (img) => ({
            title: img.alt || '',
            url: img.src,
          }))
          const hyperLinks = extractData('a', 'href', (link) => ({
            title: link.innerText.trim() || link.title || link.href,
            url: link.href,
          }))

          return {
            pureText: allText,
            images: images,
            hyperLinks: hyperLinks,
          }
        })

        const endTime = Date.now()
        const duration = (endTime - startTime) / 1000
        logger.info(
          `Puppeteer parsing of ${url} completed in ${duration.toFixed(2)}s`,
        )

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
      }
    }
  }
}
