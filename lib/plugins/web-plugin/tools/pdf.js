import { MioFunction } from '../../../function.js'
import { launchBrowser } from '../lib/browser.js'
import storageService from '../../../storage/StorageService.js'
import { generateHash } from '../../../../utils/hash.js'

export default class WebPdf extends MioFunction {
  constructor() {
    super({
      description:
        'Generates a PDF of a specified URL using Puppeteer. Returns a public PDF URL.',
      name: 'pdf',
      parameters: {
        properties: {
          filename: {
            description: 'Custom filename for the PDF (e.g., "report"). Extension .pdf will be added if not present.',
            type: 'string'
          },
          format: {
            default: 'A4',
            description: 'Paper format. Possible values: Letter, Legal, Tabloid, Ledger, A0, A1, A2, A3, A4, A5, A6. Defaults to A4.',
            type: 'string'
          },
          landscape: {
            default: false,
            description: 'Whether to generate the PDF in landscape orientation. Defaults to false.',
            type: 'boolean'
          },
          margin: {
            default: '0px',
            description: 'Page margin (e.g., "20px" or "1cm"). Defaults to "0px".',
            type: 'string'
          },
          url: {
            description: 'The URL to convert to PDF.',
            type: 'string',
          }
        },
        required: ['url'],
        type: 'object',
      },
    })
    this.func = this.generatePdf
  }

  async generatePdf(e) {
    const { url, landscape = false, format = 'A4', margin = '0px', filename: customFilename } = e.params
    const baseUrl = e.user.origin
    let browser
    try {
      browser = await launchBrowser()
      const page = await browser.newPage()
      
      // Set a reasonable viewport for better rendering
      await page.setViewport({ height: 800, width: 1280 })
      
      logger.info(`Navigating to ${url} for PDF generation`)
      await page.goto(url, { timeout: 60000, waitUntil: 'networkidle2' })

      // Generate the PDF buffer
      const pdfBuffer = await page.pdf({
        format,
        landscape,
        printBackground: true,
        margin: {
            bottom: margin,
            left: margin,
            right: margin,
            top: margin
        }
      })

      // Generate or use custom filename
      let filename = customFilename || `web-page-${generateHash(url + Date.now()).slice(0, 8)}`
      if (!filename.toLowerCase().endsWith('.pdf')) {
        filename += '.pdf'
      }

      // Upload to storage
      const result = await storageService.upload(pdfBuffer, filename, 'file', {
        contentType: 'application/pdf',
      })

      const pdfUrl = result.url.startsWith('http') ? result.url : `${baseUrl}${result.url}`

      return {
        filename: filename,
        success: true,
        url: pdfUrl
      }
    } catch (error) {
      logger.error(`Error generating PDF for ${url}: ${error.message}`)
      return {
        error: error.message,
        success: false,
      }
    } finally {
      if (browser) {await browser.close()}
    }
  }
}
