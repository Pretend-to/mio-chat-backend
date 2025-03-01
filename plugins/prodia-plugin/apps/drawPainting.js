import { MioFunction, Param } from '../../../lib/functions.js'
import { pluginInfo } from '../index.js'
import { createProdia } from 'prodia/v2'

export class drawPainting extends MioFunction {
  constructor() {
    super({
      name: 'drawPainting',
      description: 'A tool that help you to draw a painting. You can adjust the style, quality and orientation of the painting.The default config is landscape,fast.Send the reault url in markdown format to let the user preview directly.',
      params: [
        new Param({
          name: 'prompt',
          type: 'string',
          description: 'the prompt of the painting,the prompt must be in english',
          required: true,
        }),
        new Param({
          name: 'orientation',
          type: 'string',
          description: 'the orientation of the painting: landscape(横), portrait(竖), square(方)',
          required: false,
          enums: ['landscape', 'portrait', 'square']
        }),
        new Param({
          name: 'quality',
          type: 'string',
          description: 'the quality of the painting: fast(快速) or high(优质)',
          required: false,
          enums: ['fast', 'high']
        }),
      ],
    })
    this.func = this.drawPainting
  }

  async drawPainting(e) {
    const prompt = e.params.prompt
    const orientation = e.params.orientation || 'landscape'
    const quality = e.params.quality || 'fast'
    const url = e.user.origin

    // 设置图片尺寸
    let width = 1024
    let height = 768
    
    switch(orientation.toLowerCase()) {
      case 'portrait':
        width = 768
        height = 1024
        break
      case 'square':
        width = 1024
        height = 1024
        break
      // landscape为默认值，保持原有尺寸
    }

    const prodia = createProdia({
      token: pluginInfo.config.token,
    })

    const job = await prodia.job({
      'type': quality === 'high' ? 'inference.flux.pro.txt2img.v1' : 'inference.flux.dev.txt2img.v1',
      'config': {
        'prompt': prompt,
        'guidance_scale': 3,
        'steps': 25,
        'width': width,
        'height': height
      }
    }, {
      accept: 'image/jpeg'
    })
  
    const image = await job.arrayBuffer()
    const buffer = Buffer.from(image)
    const result = await this.getImgUrlFromBuffer(url, buffer)
    return {
      url: result
    }
  }
}