/* eslint-disable camelcase */
import { MioFunction, Param } from '../../../lib/functions.js'
import { pluginInfo } from '../index.js'
import ProdiaAdapter from '../lib/ProdiaAdapter.js'

export class drawAnime extends MioFunction {
  constructor() {
    super({
      name: 'drawAnime',
      description: 'A tool to draw some animime painting,by default,the user will give you some prompt like "1girl,long_hair,shirt,shorts,smile,white_shirt,looking_at_viewer,indoors,brown_eyes,solo,bangs,black_hair,blush,short_shorts,short_sleeves,blue_shorts,collarbone,closed_mouth,spread_legs,thighs,off_shoulder,straddling,blunt_bangs,breasts,small_breasts,holding,sitting,dolphin_shorts,[Artist:ke-ta],Artist:sorairo" which is made by many single words,in that case,do not chage the origin prompt.Otherwise,you can give the prompt you want to draw .Show the result images in 3x2 markdown table',

      params: [
        new Param({
          name: 'prompt',
          type: 'string',
          description: 'the prompt of the painting,the prompt must be in english',
          required: true
        }),
        new Param({
          name: 'dimension',
          type:'string',
          description: 'the dimension of the painting ,portrait by default', 
          required: true,
          enumeration: ['square', 'portrait', 'landscape'],
        })
      ],
    })
    this.func = this.drawPainting
  }

  async drawPainting(e) {
    const prompt = e.params.prompt
    const prodia = new ProdiaAdapter(pluginInfo.config.apiKey)
    const models = prodia.recommendModels
    const tasks = []
    models.forEach(model => {
      const task = async (model) => {
        const result = await prodia.generate({
          prompt: prompt,
          aspect_ratio: e.params.dimension,
          model
        })
        if(result.code === 200) {
          logger.mark(`[${model}] 生成成功`)
          return result.url
        } else {
          console.log(result.msg)
        }
      }
      tasks.push(task(model))
    })
    
    const results = await Promise.all(tasks)


    return {
      image_urls: results
    }
  }
}
