import { MioFunction, Param } from '../../../lib/functions.js'

export class playBili extends MioFunction {
  constructor() {
    super({
      name: 'playBili',
      description: 'A tool to generate the iframe for playing Bilibili videos based on the provided BV ID. You can directly send the returned iframe HTML code, which can be parsed by the messaging interface.',
      params: [
        new Param({
          name: 'bvid',
          type: 'string',
          description: 'The BV ID of the Bilibili video.',
          required: true,
        }),
      ],
    })
    this.func = this.generateIframe
  }

  async generateIframe(e) {
    const { bvid } = e.params

    // Validate the bvid format (basic validation)
    if (!/^BV[A-Za-z0-9]+$/.test(bvid)) {
      return {
        success: false,
        error: 'Invalid BV ID format. Please provide a valid BV ID.',
      }
    }

    // Generate iframe HTML
    const iframeHtml = `<iframe src="//player.bilibili.com/player.html?bvid=${bvid}" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>`

    return {
      success: true,
      iframe: iframeHtml,
    }
  }
}
