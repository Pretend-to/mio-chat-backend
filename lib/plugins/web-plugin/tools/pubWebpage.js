import { MioFunction } from '../../../function.js'
import crypto from 'crypto'

export default class pubWebpage extends MioFunction {
  constructor() {
    super({
      name: 'pubWebpage',
      description:
        'A tool to help you create a webpage with the given HTML content. After public, you should show the webPage both in iframe and hyperlink to the user. The iframe can be shown directly in your current chat system, send directly ande never wrap it with ```',
      parameters: {
        type: 'object',
        properties: {
          html: {
            type:'string',
            description: 'The html content to be rendered in the webpage.',
          },
        },
        required: ['html'], 
      }
    })
    this.func = this.pubWebpage
  }

  async pubWebpage(e) {
    const baseUrl = e.user.origin
    const uid = e.user.id
    const timestamp = Date.now().toString()
    
    // Generate MD5 hash using uid and timestamp
    const hash = crypto.createHash('md5').update(`${uid}${timestamp}`).digest('hex').substring(0, 6)
    const pageName = `${hash}.html`

    const html = e.params.html

    const url = this.saveTextFile(baseUrl, html, pageName)

    return {
      url: url,
    }
  }
}
