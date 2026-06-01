import { MioFunction } from '../../../function.js'
import { launchBrowser } from '../lib/browser.js'
import storageService from '../../../storage/StorageService.js'
import { generateHash } from '../../../../utils/hash.js'

export default class WebPdf extends MioFunction {
  constructor() {
    super({
      name: 'pdf',
      description:
        'Generates a PDF of a specified URL using Puppeteer. Returns a public PDF URL.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL to convert to PDF.',
          },
          landscape: {
            type: 'boolean',
            description: 'Whether to generate the PDF in landscape orientation. Defaults to false.',
            default: false
          },
          format: {
            type: 'string',
            description: 'Paper format. Possible values: Letter, Legal, Tabloid, Ledger, A0, A1, A2, A3, A4, A5, A6. Defaults to A4.',
            default: 'A4'
          },
          margin: {
            type: 'string',
            description: 'Page margin (e.g., "20px" or "1cm"). Defaults to "0px".',
            default: '0px'
          },
          filename: {
            type: 'string',
            description: 'Custom filename for the PDF (e.g., "report"). Extension .pdf will be added if not present.'
          }
        },
        required: ['url'],
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
      await page.setViewport({ width: 1280, height: 800 })
      
      logger.info(`Navigating to ${url} for PDF generation`)
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })

      // Generate the PDF buffer
      const pdfBuffer = await page.pdf({
        format: format,
        landscape: landscape,
        printBackground: true,
        margin: {
            top: margin,
            right: margin,
            bottom: margin,
            left: margin
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
        success: true,
        url: pdfUrl,
        filename: filename
      }
    } catch (error) {
      logger.error(`Error generating PDF for ${url}: ${error.message}`)
      return {
        success: false,
        error: error.message,
      }
    } finally {
      if (browser) await browser.close()
    }
  }
}
