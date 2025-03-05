import { MioFunction, Param } from '../../../functions.js'
import puppeteer from 'puppeteer'

export default class WebScreenshot extends MioFunction {
  constructor() {
    super({
      name: 'WebScreenshot',
      description: 'Takes a full-page screenshot of a specified URL, seed user the url in markdown picture preview format like ![title](url)',
      params: [
        new Param({
          name: 'url',
          type: 'string',
          description: 'The URL to capture a screenshot from.',
          required: true,
        }),
      ],
    })
    this.func = this.takeScreenshot
  }

  async takeScreenshot(e) {
    const { url } = e.params
    const baseUrl = e.user.origin
    let browser = null

    try {
      browser = await puppeteer.launch()
      const page = await browser.newPage()

      // Wait for network idle before taking the screenshot.  This means
      // the browser will wait until no network connections are being made for
      // at least 500ms. This is much more reliable than domcontentloaded for
      // complex web pages.  Increase the timeout if still having issues.
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })

      // Take a full-page screenshot
      const imageBuffer = await page.screenshot({ fullPage: true })
      const imageUrl = await this.getImgUrlFromBuffer(baseUrl, imageBuffer) // Use hostname in filename

      return {
        success: true,
        url: imageUrl,
      }

    } catch (error) {
      logger.error(`Error taking screenshot of ${url}: ${error.message}`)
      return {
        success: false,
        error: error.message,
      }
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
}