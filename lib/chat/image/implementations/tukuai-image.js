import BaseImageAdapter from '../BaseImageAdapter.js'

/**
 * TukuaiImageAdapter - 土块绘图 (NovelAI 二次元动漫生图) 适配器
 * 对接 datukuai.top 专属绘图与算力接口（支持文生图与图生图）
 */
export default class TukuaiImageAdapter extends BaseImageAdapter {
  constructor(config = {}) {
    super(config)
    this.name = 'tukuai-image'
  }

  async generate(options = {}) {
    const { prompt, image, strength = 0.7, size = 'portrait', seed = -1, negativePrompt } = options

    const apiKey = this.config.apiKey
    const bindQQ = this.config.bindQQ
    if (!apiKey || !bindQQ) {
      throw new Error('[TukuaiImageAdapter] 请在设置中配置土块 API Token 与绑定 QQ 号')
    }

    const baseUrl = (this.config.baseUrl || 'http://datukuai.top:1450').replace(/\/$/, '')

    // 分辨率映射：保持与原插件完全一致 (默认竖版 512x768，横版 768x512，也可支持自定义比例与高分辨率)
    let width = 512
    let height = 768
    if (size === 'horizontal' || size === 'landscape') {
      width = 768
      height = 512
    } else if (size === 'square') {
      width = 640
      height = 640
    } else if (typeof size === 'string' && size.includes('x')) {
      const parts = size.split('x').map(Number)
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        width = parts[0]
        height = parts[1]
      }
    }

    const defaultNegative = '(easynegative:1.1), (verybadimagenegative_v1.3:1), (low quality:1.2), (worst quality:1.2)'
    const imgInfo = image ? await this._resolveImageBase64(image) : null

    const requestBody = {
      prompt,
      width,
      height,
      cfg_scale: this.config.cfg_scale || 9,
      sampler: this.config.sampler || 'Euler a',
      steps: this.config.steps || 23,
      seed: seed > 0 ? seed : -1,
      n_samples: 1,
      ucPreset: 0,
      negative_prompt: negativePrompt || this.config.negativePrompt || defaultNegative,
      my: apiKey
    }

    if (imgInfo) {
      requestBody.image = imgInfo.base64
      requestBody.strength = strength !== undefined ? strength : 0.7
      requestBody.noise = 0.2
    }

    const apiUrl = `${baseUrl}/ht2.php?qq=${bindQQ}`
    const maxRetries = 3
    let lastError = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer'
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(60000)
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const data = await response.json()
        const images = data.images || []
        if (images.length === 0) {
          throw new Error(data.message || data.error || '土块 API 未返回有效图片数据')
        }

        return images.map(imgBase64 => ({
          base64: imgBase64.startsWith('data:') ? imgBase64 : `data:image/png;base64,${imgBase64}`,
          revisedPrompt: prompt
        }))
      } catch (err) {
        lastError = err
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    }

    throw new Error(`[TukuaiImageAdapter] 生成图片失败 (重试 ${maxRetries} 次): ${lastError?.message}`)
  }

  static getAdapterMetadata() {
    return {
      type: 'tukuai-image',
      name: '土块绘图',
      description: 'NovelAI 动漫二次元高质量生图/图生图（对接 datukuai.top 专属算力服务）',
      configSchema: {
        apiKey: { type: 'string', label: '土块 API Key', required: true, secret: true },
        bindQQ: { type: 'string', label: '绑定 QQ 号', required: true },
        baseUrl: { type: 'string', label: 'Base URL', default: 'http://datukuai.top:1450' },
        steps: { type: 'number', label: '采样步数', default: 23 },
        cfg_scale: { type: 'number', label: 'CFG Scale', default: 9 },
        sampler: { type: 'string', label: '采样器', default: 'Euler a' }
      }
    }
  }
}
