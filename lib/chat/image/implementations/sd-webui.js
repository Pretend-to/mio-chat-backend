import BaseImageAdapter from '../BaseImageAdapter.js'

/**
 * SDWebUIAdapter - SD WebUI (Automatic1111) / ComfyUI API 适配器
 * 支持文生图 (txt2img) 与图生图 (img2img)
 */
export default class SDWebUIAdapter extends BaseImageAdapter {
  constructor(config = {}) {
    super(config)
    this.name = 'sd-webui'
  }

  async generate(options = {}) {
    const {
      prompt,
      image,
      strength = 0.75,
      negativePrompt = '',
      size = '512x512',
      n = 1,
      seed = -1
    } = options

    const baseUrl = (this.config.baseUrl || 'http://127.0.0.1:7860').replace(/\/$/, '')
    
    // 解析宽高
    let width = 512
    let height = 512
    if (size === 'portrait') { width = 512; height = 768 }
    else if (size === 'landscape') { width = 768; height = 512 }
    else if (size.includes('x')) {
      const parts = size.split('x').map(Number)
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        width = parts[0]
        height = parts[1]
      }
    }

    const payload = {
      prompt,
      negative_prompt: negativePrompt || this.config.defaultNegativePrompt || 'blurry, low quality, bad anatomy',
      steps: this.config.steps || 20,
      width,
      height,
      batch_size: Math.min(n, 4),
      seed: seed || -1,
      sampler_name: this.config.samplerName || 'DPM++ 2M Karras'
    }

    const imgInfo = image ? await this._resolveImageBase64(image) : null
    let endpoint = `${baseUrl}/sdapi/v1/txt2img`

    if (imgInfo) {
      endpoint = `${baseUrl}/sdapi/v1/img2img`
      payload.init_images = [imgInfo.dataUri || `data:image/png;base64,${imgInfo.base64}`]
      payload.denoising_strength = strength !== undefined ? strength : 0.75
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000)
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`[SDWebUIAdapter] WebUI Error (${response.status}): ${errText}`)
    }

    const data = await response.json()
    if (!data.images || !Array.isArray(data.images)) {
      throw new Error('[SDWebUIAdapter] Invalid WebUI response')
    }

    let parsedInfo = {}
    if (data.info) {
      try { parsedInfo = JSON.parse(data.info) } catch {}
    }

    return data.images.map((base64Str, i) => ({
      base64: base64Str.startsWith('data:') ? base64Str : `data:image/png;base64,${base64Str}`,
      seed: parsedInfo.all_seeds?.[i] || seed
    }))
  }

  static getAdapterMetadata() {
    return {
      type: 'sd-webui',
      name: 'Stable Diffusion',
      description: '本地部署的 SD WebUI (Automatic1111) txt2img / img2img 接口',
      configSchema: {
        baseUrl: { type: 'string', label: 'WebUI 地址', default: 'http://127.0.0.1:7860' },
        steps: { type: 'number', label: '采样步数', default: 20 },
        samplerName: { type: 'string', label: '采样器', default: 'DPM++ 2M Karras' },
        defaultNegativePrompt: { type: 'string', label: '默认负向词', default: 'blurry, low quality, bad anatomy' }
      }
    }
  }
}
