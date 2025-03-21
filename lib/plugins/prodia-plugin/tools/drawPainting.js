import { MioFunction } from '../../../functions.js'
import { createProdia } from 'prodia/v2'

export default class drawPainting extends MioFunction {
  constructor() {
    super({
      name: 'drawPainting',
      description: 'A tool that help you to draw a painting. You can adjust the style, quality and orientation of the painting.The default config is landscape,fast.finally,show user the picture in markdown format like ![image](url).',
      params: [{
        name: 'prompt',
        type: 'string',
        description: 'the prompt of the painting,the prompt must be in english',
        required: true,
      },
      {
        name: 'orientation',
        type: 'string',
        description: 'the orientation of the painting: landscape(横), portrait(竖), square(方)',
        required: false,
        enums: ['landscape', 'portrait', 'square']
      },
      {
        name: 'quality',
        type: 'string',
        description: 'the quality of the painting: fast(快速) or high(优质)',
        required: false,
        enums: ['fast', 'high']
      },
      ],
    })
    this.func = this.drawPainting
  }

  async drawPainting(e) {
    const { token } = this.getPluginConfig()

    if (!token) {
      throw new Error('请先配置Prodia token')
    }

    const prompt = e.params.prompt
    const orientation = e.params.orientation || 'landscape'
    const quality = e.params.quality || 'fast'
    const url = e.user.origin
    // 设置图片尺寸
    let width = 1024
    let height = 768
    switch (orientation.toLowerCase()) {
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
      token
    })
  
    const maxRetries = 3 // 设置最大重试次数
    let retryCount = 0
  
    while (retryCount < maxRetries) {
      try {
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
      } catch (error) {
        retryCount++
        console.error(`尝试第 ${retryCount} 次重试... 错误信息:`, error)
        //  可以添加延迟，避免过于频繁的重试
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)) // 延迟1秒, 2秒, 3秒
      }
    }
    // 如果重试达到最大次数仍然失败，抛出错误或者返回一个默认值
    console.error(`重试 ${maxRetries} 次后仍然失败，停止重试.`)
    throw new Error('绘图失败，请稍后重试')
    // 或者 return { url: '默认图片URL或错误提示' };
  }
}