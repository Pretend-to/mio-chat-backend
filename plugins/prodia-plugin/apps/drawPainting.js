import { MioFunction,Param } from '../../../lib/functions.js'
import Drawer from '../../../lib/draw.js'


export class drawPainting extends MioFunction {
  constructor() {
    super({
      name: 'drawPainting',
      description: 'A tool that help you to draw a painting,you can adjust the style and orientation of the painting.After got the url of the picture,send the picture to user by markdown format directly,instead of sending the picture by image url',

      params: [
        new Param({
          name: 'prompt',
          type:'string',
          description: 'the prompt of the painting,the prompt must be in english',

          required: true
        }),
        new Param({
          name:'style',
          type:'string',
          description: 'the style of the painting',
          required: false,
          enumeration:['anime','realistic']
        }),
        new Param({
          name:'orientation',
          type:'string',
          description: 'the orientation of the painting',
          required: false,
          enumeration:['vertical','horizontal','square']
        }),
      ],
    })
    this.func = this.drawPainting
  }

  async drawPainting(e) {
    const config = e.params
    const painter = new Drawer()

    const drawConfig = {
      model: config.style == 'anime' ? 'animagineXLV3_v30.safetensors [75f2f05b]' : 'devlishphotorealism_sdxl15.safetensors [77cba69f]',
      width: config.orientation =='vertical'? 1 : 
        config.orientation =='horizontal'? 2 : 1 ,
      height: config.orientation =='vertical'? 2 : 
        config.orientation =='horizontal'? 1 : 1 ,
    }

    const result = await painter.draw('prodia.xl',config.prompt,drawConfig)

    return result
  }
}
