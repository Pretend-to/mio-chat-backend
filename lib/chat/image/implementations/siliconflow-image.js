import BaseImageAdapter from '../BaseImageAdapter.js'

/**
 * SiliconFlowImageAdapter - 硅基流动文生图/图生图适配器 (FLUX / SD 3.5 / Kolors 等)
 * 遵循 SiliconFlow 标准图像生成 API:
 * POST https://api.siliconflow.cn/v1/images/generations
 */
export default class SiliconFlowImageAdapter extends BaseImageAdapter {
  constructor(config = {}) {
    super(config)
    this.name = 'siliconflow-image'
  }

  async generate(options = {}) {
    const { prompt, image, size = '1024x1024', seed, steps } = options

    const apiKey = this.config.apiKey || process.env.SILICONFLOW_API_KEY
    if (!apiKey) {
      throw new Error('[SiliconFlowImageAdapter] Missing SiliconFlow API Key')
    }

    const baseUrl = (this.config.baseUrl || 'https://api.siliconflow.cn/v1').replace(/\/$/, '')
    const model = this.config.model || 'black-forest-labs/FLUX.1-schnell'
    const imgInfo = image ? await this._resolveImageBase64(image) : null

    let targetSize = size
    if (size === 'square') targetSize = '1024x1024'
    else if (size === 'portrait') targetSize = '768x1024'
    else if (size === 'landscape') targetSize = '1024x768'

    const payload = {
      model,
      prompt,
      image_size: targetSize,
      num_inference_steps: steps || this.config.steps || (model.includes('schnell') ? 4 : 20)
    }

    if (imgInfo) {
      payload.image = imgInfo.dataUri
    }

    if (seed !== undefined && seed > 0) {
      payload.seed = seed
    }

    const response = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000)
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`[SiliconFlowImageAdapter] API Error (${response.status}): ${errText}`)
    }

    const data = await response.json()
    const items = data.data || data.images || []
    return items.map(item => ({
      url: item.url,
      base64: item.b64_json,
      seed: item.seed || payload.seed
    }))
  }

  static getAdapterMetadata() {
    return {
      type: 'siliconflow-image',
      name: '硅基流动',
      description: '支持 FLUX.1-schnell、FLUX.1-dev、SD 3.5、Kolors 等前沿模型',
      configSchema: {
        apiKey: { type: 'string', label: 'API Key', required: true, secret: true },
        baseUrl: { type: 'string', label: 'Base URL', default: 'https://api.siliconflow.cn/v1' },
        model: { 
          type: 'string', 
          label: '模型名称', 
          default: 'black-forest-labs/FLUX.1-schnell',
          options: [
            'black-forest-labs/FLUX.1-schnell',
            'black-forest-labs/FLUX.1-dev',
            'stabilityai/stable-diffusion-3-5-large',
            'Kwai-Kolors/Kolors'
          ] 
        }
      }
    }
  }
}
