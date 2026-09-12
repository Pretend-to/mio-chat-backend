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

  supportsImageInput() {
    const model = (this.config.model || 'Kwai-Kolors/Kolors').toLowerCase()
    return model === 'kwai-kolors/kolors' || model.includes('image-edit')
  }

  getImageInputLimit() {
    const model = (this.config.model || 'Kwai-Kolors/Kolors').toLowerCase()
    if (!this.supportsImageInput()) return 0
    return model.includes('image-edit-2509') ? 3 : 1
  }

  async generate(options = {}) {
    const { prompt, size = '1024x1024', seed, steps, negativePrompt } = options

    const apiKey = this.config.apiKey || process.env.SILICONFLOW_API_KEY
    if (!apiKey) {
      throw new Error('[SiliconFlowImageAdapter] Missing SiliconFlow API Key')
    }

    const baseUrl = (this.config.baseUrl || 'https://api.siliconflow.cn/v1').replace(/\/$/, '')
    const model = this.config.model || 'Kwai-Kolors/Kolors'
    const imgInfos = await this._resolveImageInputs(options)

    let targetSize = size
    if (size === 'square') targetSize = '1024x1024'
    else if (size === 'portrait') targetSize = '768x1024'
    else if (size === 'landscape') targetSize = '1024x768'

    const payload = {
      model,
      prompt,
      num_inference_steps: steps || this.config.steps || (model.includes('schnell') ? 4 : 20)
    }

    if (!model.toLowerCase().includes('image-edit')) {
      payload.image_size = targetSize
    }

    for (const [index, info] of imgInfos.entries()) {
      payload[index === 0 ? 'image' : `image${index + 1}`] = info.dataUri
    }

    if (negativePrompt) {
      payload.negative_prompt = negativePrompt
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
      description: '支持 Kolors、Qwen Image 与 Qwen Image Edit',
      configSchema: {
        apiKey: { type: 'string', label: 'API Key', required: true, secret: true },
        baseUrl: { type: 'string', label: 'Base URL', default: 'https://api.siliconflow.cn/v1' },
        model: { 
          type: 'string', 
          label: '模型名称', 
          default: 'Kwai-Kolors/Kolors',
          options: [
            'Kwai-Kolors/Kolors',
            'Qwen/Qwen-Image',
            'Qwen/Qwen-Image-Edit',
            'Qwen/Qwen-Image-Edit-2509'
          ] 
        }
      }
    }
  }
}
