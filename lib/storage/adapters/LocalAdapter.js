import fs from 'fs'
import path from 'path'
import StorageAdapter from '../StorageAdapter.js'

export default class LocalAdapter extends StorageAdapter {
  constructor(config = {}) {
    super(config)
    this.baseDir = config.baseDir || path.join(process.cwd(), 'output', 'uploaded')

    // 如果配置了外部访问域名与端口，拼装出完整访问 baseUrl
    if (config.domain) {
      let domain = String(config.domain).trim().replace(/\/+$/, '')
      if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
        domain = `http://${domain}`
      }
      try {
        const urlObj = new URL(domain)
        if (config.port && !urlObj.port) {
          urlObj.port = String(config.port)
        }
        domain = urlObj.origin
      } catch {
        if (config.port && !domain.includes(':', 7)) {
          domain = `${domain}:${config.port}`
        }
      }
      this.baseUrl = `${domain}/f/up`
    } else {
      this.baseUrl = config.baseUrl || '/f/up'
    }
  }

  async upload(data, fileName, type = 'file', options = {}) {
    const safeType = path.basename(type)

    // 保留相对路径结构（如 web/<hash>/index.html），同时防御路径遍历攻击
    const normalizedRelative = path
      .normalize(fileName)
      .replace(/^(\.\.[/\\\\])+/, '')
      .replace(/^[/\\\\]+/, '')
    const baseDirPath = path.join(this.baseDir, safeType)
    let uploadPath = path.resolve(baseDirPath, normalizedRelative)

    // 确保 uploadPath 落在 baseDirPath 内
    if (
      !uploadPath.startsWith(baseDirPath + path.sep) &&
      uploadPath !== baseDirPath
    ) {
      throw new Error('非法的文件路径')
    }

    const relDir = path.dirname(normalizedRelative)
    const ext = path.extname(normalizedRelative)
    const baseName = path.basename(normalizedRelative, ext)
    let finalRelativeName = normalizedRelative
    let counter = 1

    // 内容寻址去重：文件名基于内容哈希（如 MD5）时，相同 key 应幂等返回已有 URL，而非生成序号副本
    if (options.dedup === true) {
      if (fs.existsSync(uploadPath)) {
        const key = `${type}/${normalizedRelative.split(path.sep).join('/')}`
        return {
          deduped: true,
          key,
          size: data.length,
          url: `${this.baseUrl}/${key}`,
        }
      }
    } else {
      // 自定义文件名场景：重名时追加序号，保留不同文件
      while (fs.existsSync(uploadPath)) {
        const numberedFile = `${baseName}(${counter})${ext}`
        finalRelativeName =
          relDir && relDir !== '.'
            ? path.join(relDir, numberedFile)
            : numberedFile
        uploadPath = path.resolve(baseDirPath, finalRelativeName)
        counter++
      }
    }

    const parentDir = path.dirname(uploadPath)
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true })
    }

    fs.writeFileSync(uploadPath, data)

    const finalFileName = finalRelativeName.split(path.sep).join('/')
    const key = `${type}/${finalFileName}`

    return {
      key,
      size: data.length,
      url: `${this.baseUrl}/${key}`,
    }
  }

  async delete(key) {
    const safeKey = path.normalize(key).replace(/^(\.\.[/\\\\])+/, '')
    const baseDirPath = path.resolve(this.baseDir)
    const filePath = path.resolve(baseDirPath, safeKey)
    if (
      !filePath.startsWith(baseDirPath + path.sep) &&
      filePath !== baseDirPath
    ) {
      throw new Error('非法的文件路径')
    }
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }

  async exists(key) {
    const safeKey = path.normalize(key).replace(/^(\.\.[/\\\\])+/, '')
    const baseDirPath = path.resolve(this.baseDir)
    const filePath = path.resolve(baseDirPath, safeKey)
    if (
      !filePath.startsWith(baseDirPath + path.sep) &&
      filePath !== baseDirPath
    ) {
      return false
    }
    return fs.existsSync(filePath)
  }

  getUrl(key) {
    const normalizedKey = path
      .normalize(key)
      .replace(/^(\.\.[/\\\\])+/, '')
      .split(path.sep)
      .join('/')
    return `${this.baseUrl}/${normalizedKey}`
  }
}