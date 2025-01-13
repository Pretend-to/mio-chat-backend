import { MioFunction, Param } from '../../../lib/functions.js'
import { pluginInfo } from '../index.js'
import { createProdia } from 'prodia/v2'
import { bufferToUrl } from '../../../utils/imgTools.js'

export class drawPainting extends MioFunction {
  constructor() {
    super({
      name: 'drawPainting',
      description: 'A tool that help you to draw a painting,you can adjust the style and orientation of the painting.After got the url of the picture,send the picture to user by markdown format directly,instead of sending the picture by image url',

      params: [
        new Param({
          name: 'prompt',
          type: 'string',
          description: 'the prompt of the painting,the prompt must be in english',
          required: true
        }),
      ],
    })
    this.func = this.drawPainting
  }

  async drawPainting(e) {
    const prompt = e.params.prompt
    const url = e.user.origin

    const prodia = createProdia({
      token: pluginInfo.config.token,
    })

    const job = await prodia.job({
      'type': 'inference.flux.pro.txt2img.v1',
      'config': {
        'prompt': prompt,
        'guidance_scale': 3,
        'steps': 25,
        'width': 1024,
        'height': 768
      }
    }, {
      accept: 'image/jpeg'
    })

    const image = await job.arrayBuffer()

    const result = await bufferToUrl(image, url)

    return {
      url: result
    }
  }
}
