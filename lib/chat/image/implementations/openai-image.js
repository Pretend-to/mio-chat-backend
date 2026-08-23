import BaseImageAdapter from '../BaseImageAdapter.js'

/**
 * OpenAIImageAdapter - OpenAI 原生图像生成适配器
 * 支持最新的 GPT Image 2 系列、GPT Image 1.5、DALL-E 3、DALL-E 2 及第三方 OpenAI 兼容图像网关
 */
export default class OpenAIImageAdapter extends BaseImageAdapter {
  constructor(config = {}) {
    super(config)
    this.name = 'openai-image'
  }

  async generate(options = {}) {
    const {
      prompt,
      image,
      size = '1024x1024',
      n = 1,
      style = 'vivid',
      quality = 'standard'
    } = options

    const apiKey = this.config.apiKey || process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('[OpenAIImageAdapter] Missing API Key in configuration')
    }

    const baseUrl = (this.config.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')
    const model = this.config.model || 'gpt-image-2'
    const imgInfo = image ? await this._resolveImageBase64(image) : null

    // 格式化尺寸
    let targetSize = size
    if (size === 'square') targetSize = '1024x1024'
    else if (size === 'portrait') targetSize = '1024x1792'
    else if (size === 'landscape') targetSize = '1792x1024'

    const payload = {
      model,
      prompt,
      n: model.includes('dall-e-3') ? 1 : Math.min(n, 4),
      size: targetSize,
      response_format: this.config.responseFormat || 'url'
    }

    if (imgInfo) {
      payload.image = imgInfo.dataUri
    }

    if (model.includes('dall-e-3')) {
      payload.style = style === 'anime' ? 'vivid' : style
      payload.quality = quality
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
      throw new Error(`[OpenAIImageAdapter] API Error (${response.status}): ${errText}`)
    }

    const data = await response.json()
    const items = data.data || data.images || []
    if (!Array.isArray(items)) {
      throw new Error('[OpenAIImageAdapter] Invalid API response structure')
    }

    return items.map(item => ({
      url: item.url,
      base64: item.b64_json,
      revisedPrompt: item.revised_prompt
    }))
  }

  static getAdapterMetadata() {
    return {
      type: 'openai-image',
      name: 'OpenAI',
      description: '支持最新 GPT Image 2、GPT Image 1.5、DALL-E 3 及兼容网关',
      configSchema: {
        apiKey: { type: 'string', label: 'API Key', required: true, secret: true },
        baseUrl: { type: 'string', label: 'Base URL', default: 'https://api.openai.com/v1' },
        model: { 
          type: 'string', 
          label: '模型名称', 
          default: 'gpt-image-2', 
          options: [
            'gpt-image-2',
            'gpt-image-1.5',
            'gpt-image-1.5-mini',
            'dall-e-3',
            'dall-e-2'
          ] 
        }
      }
    }
  }
}
