import fs from 'fs'
import path from 'path'
import { base64ToImageUrl, bufferToImageUrl } from '../../../utils/imgTools.js'
import storageService from '../../storage/StorageService.js'

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
   * @param {number} [options.strength=0.7] - 图生图重绘幅度 / 提示词相关度 (0.0 ~ 1.0)
   * @param {string} [options.negativePrompt] - 负向提示词
   * @param {string} [options.size='1024x1024'] - 尺寸预设 ('square' | 'portrait' | 'landscape' 或 '1024x1024')
   * @param {number} [options.n=1] - 生成张数
   * @param {string} [options.style] - 风格预设 ('anime' | 'cinematic' | 'natural')
   * @param {number} [options.seed] - 随机种子
   * @returns {Promise<Array<{ url?: string, base64?: string, seed?: number, revisedPrompt?: string }>>}
   */
  async generate(options) {
    throw new Error('Subclass must implement generate() method')
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

    let mimeType = 'image/jpeg'
    let buffer

    if (image.startsWith('http://') || image.startsWith('https://')) {
      const response = await fetch(image, { signal: AbortSignal.timeout(15000) })
      if (!response.ok) {
        throw new Error(`[BaseImageAdapter] 下载参考图失败 (${response.status}): ${image}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)

      const contentType = response.headers.get('content-type')
      if (contentType && contentType.startsWith('image/')) {
        mimeType = contentType
      } else {
        const ext = path.extname(new URL(image).pathname).toLowerCase()
        mimeType = this._getMimeType(ext)
      }
    } else if (image.length > 200 && !image.includes('/') && !image.includes('\\')) {
      return {
        mimeType: 'image/jpeg',
        base64: image,
        dataUri: `data:image/jpeg;base64,${image}`
      }
    } else {
      const absolutePath = path.isAbsolute(image) ? image : path.join(process.cwd(), image)
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`[BaseImageAdapter] 本地参考图文件不存在: ${image}`)
      }
      buffer = await fs.promises.readFile(absolutePath)
      const ext = path.extname(absolutePath).toLowerCase()
      mimeType = this._getMimeType(ext)
    }

    const base64 = buffer.toString('base64')
    return {
      base64,
      mimeType,
      dataUri: `data:${mimeType};base64,${base64}`
    }
  }

  _getMimeType(ext) {
    const map = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp'
    }
    return map[ext] || 'image/jpeg'
  }

  /**
   * 将 Base64 字符串直接转换为 StorageService 持久化托管 URL
   */
  async getImgUrlFromBase64(base64String, originUrl = '') {
    try {
      return await base64ToImageUrl(originUrl, base64String)
    } catch (error) {
      console.error('[BaseImageAdapter] Base64 转图片 URL 失败:', error)
      throw new Error(`Failed to save image to storage: ${error.message}`)
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
      throw new Error(`Failed to save image buffer: ${error.message}`)
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
