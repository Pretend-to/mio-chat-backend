import BaseImageAdapter from '../BaseImageAdapter.js'

/**
 * VolcEngineImageAdapter - 字节火山引擎文生图/图生图 (SeaDream / 豆包文生图) 适配器
 */
export default class VolcEngineImageAdapter extends BaseImageAdapter {
  constructor(config = {}) {
    super(config)
    this.name = 'volcengine-image'
  }

  supportsImageInput() {
    const model = (this.config.model || 'doubao-seedream-5-0-lite-260128').toLowerCase()
    return model.includes('seedream-4-') || model.includes('seedream-5-')
  }

  getImageInputLimit() {
    return this.supportsImageInput() ? 10 : 0
  }

  async generate(options = {}) {
    const { prompt, size = '1024x1024', seed = -1 } = options

    const apiKey = this.config.apiKey
    if (!apiKey) {
      throw new Error('[VolcEngineImageAdapter] Missing API Key / Access Key')
    }

    const baseUrl = (this.config.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '')
    const model = this.config.model || 'doubao-seedream-5-0-lite-260128'
    const imgInfos = await this._resolveImageInputs(options)

    let width = 1024
    let height = 1024
    if (size === 'portrait') { width = 1536; height = 2048 }
    else if (size === 'landscape') { width = 2048; height = 1536 }
    else if (size.includes('x')) {
      const parts = size.split('x').map(Number)
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        width = parts[0]
        height = parts[1]
      }
    }

    const payload = {
      model,
      prompt,
      size: `${width}x${height}`,
      response_format: this.config.responseFormat || 'url',
      watermark: this.config.watermark !== false
    }
    if (seed > 0) payload.seed = seed

    if (imgInfos.length > 0) {
      const inputImages = imgInfos.map(info => info.dataUri)
      payload.image = inputImages.length === 1 ? inputImages[0] : inputImages
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
      throw new Error(`[VolcEngineImageAdapter] API Error (${response.status}): ${errText}`)
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
      type: 'volcengine-image',
      name: '火山引擎',
      description: '字节跳动火山引擎豆包生图与文生图大模型 (SeaDream 5.0 / 4.5)',
      configSchema: {
        apiKey: { type: 'string', label: 'API Key (ARK)', required: true, secret: true },
        baseUrl: { type: 'string', label: 'Base URL', default: 'https://ark.cn-beijing.volces.com/api/v3' },
        model: {
          type: 'string',
          label: '模型接入点/名称',
          default: 'doubao-seedream-5-0-lite-260128',
          options: [
            'doubao-seedream-5-0-lite-260128',
            'doubao-seedream-5-0-260128',
            'doubao-seedream-4-5-251128',
            'doubao-seedream-4-0-250828'
          ]
        },
        responseFormat: { type: 'string', label: '返回格式', default: 'url', options: ['url', 'b64_json'] },
        watermark: { type: 'boolean', label: '添加水印', default: true }
      }
    }
  }
}
