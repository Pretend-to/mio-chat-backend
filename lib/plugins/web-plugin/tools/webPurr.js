import { MioFunction } from '../../../functions.js'
import puppeteer from 'puppeteer'

export default class WebScreenshot extends MioFunction {
  constructor() {
    super({
      name: 'WebScreenshot',
      description:
        'Takes a full-page screenshot of a specified URL. Returns the image URL in markdown preview format like: ![title](url)',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type:'string',
            description: 'The URL to capture a screenshot from.',
          },
        }, 
      }
    })
    this.func = this.takeScreenshot
  }

  async takeScreenshot(e) {
    const { url } = e.params
    const baseUrl = e.user.origin
    let browser = null

    try {
      browser = await puppeteer.launch({ headless: true })
      const page = await browser.newPage()
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 })

      // Auto-scroll to the bottom of the page
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0
          const distance = 100
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight
            window.scrollBy(0, distance)
            totalHeight += distance

            if (totalHeight >= scrollHeight) {
              clearInterval(timer)
              resolve()
            }
          }, 100)
        })
      })

      const imageBuffer = await page.screenshot({ fullPage: true })
      const imageUrl = await this.getImgUrlFromBuffer(baseUrl, imageBuffer) // Assumes this method is defined elsewhere and handles image upload

      return {
        success: true,
        url: imageUrl,
      }
    } catch (error) {
      if (typeof logger !== 'undefined') {
        logger.error(`Error taking screenshot of ${url}: ${error.message}`)
      }
      return {
        success: false,
        error: error.message,
      }
    } finally {
      if (browser) {
        try {
          await browser.close()
        } catch (closeError) {
          if (typeof logger !== 'undefined') {
            logger.error(`Error closing browser: ${closeError.message}`)
          }
        }
      }
    }
  }
}