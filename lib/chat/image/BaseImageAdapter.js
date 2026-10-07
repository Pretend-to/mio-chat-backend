import fs from 'fs'
import path from 'path'
import { base64ToImageUrl, bufferToImageUrl } from '../../../utils/imgTools.js'

/**
 * BaseImageAdapter - 生图适配器抽象基类
 * 规范文生图/图生图的参数格式与适配器元数据声明，
 * 并提供开箱即用的 StorageService 统一存储与 Base64 -> URL 转换能力。
 */
export default class BaseImageAdapter {
  constructor(config = {}) {
    this.config = config
    this.name = 'base-image'
  }

  /**
   * 核心方法：执行生图任务（支持文生图与图生图）
   * @param {Object} options
   * @param {string} options.prompt - 核心正向提示词 / 改图指令
   * @param {string} [options.image] - 参考图片（支持 HTTP URL、本地绝对路径、Data URI、Base64 字符串）
   * @param {string[]} [options.images] - 多张参考图片（受具体模型的数量上限约束）
   * @param {number} [options.strength=0.7] - 图生图重绘幅度 / 提示词相关度 (0.0 ~ 1.0)
   * @param {string} [options.negativePrompt] - 负向提示词
   * @param {string} [options.size='1024x1024'] - 尺寸预设 ('square' | 'portrait' | 'landscape' 或 '1024x1024')
   * @param {number} [options.n=1] - 生成张数
   * @param {string} [options.style] - 风格预设 ('anime' | 'cinematic' | 'natural')
   * @param {number} [options.seed] - 随机种子
   * @returns {Promise<Array<{ url?: string, base64?: string, seed?: number, revisedPrompt?: string }>>}
   */
  async generate(_options) {
    throw new Error('Subclass must implement generate() method')
  }

  /**
   * Whether the configured adapter/model accepts an input image.
   * Model-dependent adapters should override this method.
   */
  supportsImageInput() {
    return false
  }

  getImageInputLimit(options = {}) {
    return this.supportsImageInput(options) ? 1 : 0
  }

  /**
   * 读取静态 metadata 中声明的 model 配置项（options/default 的单一数据源）
   */
  _modelSchema() {
    return this.constructor?.getAdapterMetadata?.()?.configSchema?.model || null
  }

  /**
   * 统一模型解析优先级：per-call options.model > 实例配置 config.model > metadata 默认值。
   * 声明了 options 的通道做白名单校验；没声明模型的通道拒绝覆盖，避免把野值打进上游。
   */
  _resolveModel(options = {}) {
    const schema = this._modelSchema()
    const fallback = typeof schema?.default === 'string' ? schema.default : ''
    const configured = typeof this.config?.model === 'string' ? this.config.model.trim() : ''
    const requested = typeof options?.model === 'string' ? options.model.trim() : ''

    if (!requested) return configured || fallback

    const allowed = [
      ...new Set(
        [
          ...(Array.isArray(schema?.options) ? schema.options.filter(Boolean) : []),
          configured,
          fallback,
        ].filter(Boolean),
      ),
    ]
    if (allowed.length === 0) {
      throw new Error(
        `[${this.name}] 该生图通道未声明可选模型，不支持按次覆盖 model 参数，请留空`,
      )
    }
    if (!allowed.includes(requested)) {
      throw new Error(
        `[${this.name}] 不支持的 model「${requested}」。可选：${allowed.join('、')}（不填则用 ${configured || fallback}）`,
      )
    }
    return requested
  }

  /**
   * 可选模型清单，供 draw 工具列举通道模型与校验 model 参数。
   * isCurrent = 本实例配置生效值；isDefault = metadata 声明的出厂默认；note 为静态补充说明。
   */
  getModelCatalog() {
    const schema = this._modelSchema()
    const options = Array.isArray(schema?.options)
      ? schema.options.filter(Boolean)
      : []
    const fallback = typeof schema?.default === 'string' ? schema.default : ''
    const current =
      (typeof this.config?.model === 'string' && this.config.model.trim()) ||
      fallback
    const notes = this.constructor?.MODEL_NOTES || {}

    return [...new Set([...options, ...(current ? [current] : [])])].map((id) => ({
      id,
      isDefault: Boolean(fallback) && id === fallback,
      isCurrent: id === current,
      supportsImageInput: this.supportsImageInput({ model: id }),
      note: notes[id] || null,
    }))
  }


  _getImageSources(options = {}) {
    const sources = []
    if (typeof options.image === 'string' && options.image) sources.push(options.image)
    if (Array.isArray(options.images)) {
      for (const image of options.images) {
        if (typeof image === 'string' && image && !sources.includes(image)) sources.push(image)
      }
    }
    return sources
  }

  async _resolveImageInputs(options = {}) {
    return Promise.all(this._getImageSources(options).map(image => this._resolveImageBase64(image)))
  }

  /**
   * 统一解析图片输入为标准的 Base64 与 MIME 类型（图生图通用助手方法）
   * @param {string} image 图片 URL / 本地路径 / Data URI / 纯 Base64
   * @returns {Promise<{ base64: string, mimeType: string, dataUri: string } | null>}
   */
  async _resolveImageBase64(image) {
    if (!image || typeof image !== 'string') return null

    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/)
      if (match) {
        return {
          mimeType: match[1],
          base64: match[2],
          dataUri: image
        }
      }
    }

    let buffer

    if (image.startsWith('http://') || image.startsWith('https://')) {
      const response = await fetch(image, { signal: AbortSignal.timeout(15000) })
      if (!response.ok) {
        throw new Error(`[BaseImageAdapter] 下载参考图失败 (${response.status}): ${image}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)

    } else if (this._isRawBase64(image)) {
      const compact = image.replace(/\s+/g, '')
      const decoded = Buffer.from(compact, 'base64')
      const detectedMime = this._detectMimeType(decoded)
      if (!detectedMime) throw new Error('[BaseImageAdapter] 无法识别参考图格式')
      return {
        mimeType: detectedMime,
        base64: compact,
        dataUri: `data:${detectedMime};base64,${compact}`
      }
    } else {
      const absolutePath = path.isAbsolute(image) ? image : path.join(process.cwd(), image)
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`[BaseImageAdapter] 本地参考图文件不存在: ${image}`)
      }
      buffer = await fs.promises.readFile(absolutePath)
    }

    const mimeType = this._detectMimeType(buffer)
    if (!mimeType) throw new Error('[BaseImageAdapter] 无法识别参考图格式')
    const base64 = buffer.toString('base64')
    return {
      base64,
      mimeType,
      dataUri: `data:${mimeType};base64,${base64}`
    }
  }

  _isRawBase64(value) {
    const compact = value.replace(/\s+/g, '')
    if (compact.length < 16 || compact.length % 4 !== 0) return false
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) return false

    try {
      return Buffer.from(compact, 'base64').length > 0
    } catch {
      return false
    }
  }

  _detectMimeType(buffer) {
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
    if (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a') return 'image/gif'
    if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
    if (buffer.subarray(0, 2).toString('ascii') === 'BM') return 'image/bmp'
    return null
  }

  /**
   * 将 Base64 字符串直接转换为 StorageService 持久化托管 URL
   */
  async getImgUrlFromBase64(base64String, originUrl = '') {
    try {
      return await base64ToImageUrl(originUrl, base64String)
    } catch (error) {
      console.error('[BaseImageAdapter] Base64 转图片 URL 失败:', error)
      throw new Error(`Failed to save image to storage: ${error.message}`, { cause: error })
    }
  }

  /**
   * 将 Buffer 二进制数据直接存入 StorageService 并获取 URL
   */
  async getImgUrlFromBuffer(buffer, originUrl = '') {
    try {
      return await bufferToImageUrl(originUrl, buffer)
    } catch (error) {
      console.error('[BaseImageAdapter] Buffer 转图片 URL 失败:', error)
      throw new Error(`Failed to save image buffer: ${error.message}`, { cause: error })
    }
  }

  static getAdapterMetadata() {
    return {
      type: 'base-image',
      name: 'Base Image Adapter',
      description: '抽象基类',
      configSchema: {}
    }
  }
}
