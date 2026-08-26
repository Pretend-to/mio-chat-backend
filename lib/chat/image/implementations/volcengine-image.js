import BaseImageAdapter from '../BaseImageAdapter.js'

/**
 * VolcEngineImageAdapter - 字节火山引擎文生图/图生图 (SeaDream / 豆包文生图) 适配器
 */
export default class VolcEngineImageAdapter extends BaseImageAdapter {
  constructor(config = {}) {
    super(config)
    this.name = 'volcengine-image'
  }

  async generate(options = {}) {
    const { prompt, image, size = '1024x1024', seed = -1 } = options

    const apiKey = this.config.apiKey
    if (!apiKey) {
      throw new Error('[VolcEngineImageAdapter] Missing API Key / Access Key')
    }

    const baseUrl = (this.config.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '')
    const model = this.config.model || 'cv-seadream-v1'
    const imgInfo = image ? await this._resolveImageBase64(image) : null

    let width = 1024
    let height = 1024
    if (size === 'portrait') { width = 768; height = 1024 }
    else if (size === 'landscape') { width = 1024; height = 768 }
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
      width,
      height,
      seed: seed > 0 ? seed : Math.floor(Math.random() * 100000000)
    }

    if (imgInfo) {
      payload.image_url = imgInfo.dataUri
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
        model: { type: 'string', label: '模型接入点/名称', default: 'cv-seadream-v1' }
      }
    }
  }
}
