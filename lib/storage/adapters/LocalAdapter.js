import fs from 'fs'
import path from 'path'
import StorageAdapter from '../StorageAdapter.js'

export default class LocalAdapter extends StorageAdapter {
  constructor(config = {}) {
    super(config)
    this.baseDir = config.baseDir || path.join(process.cwd(), 'output', 'uploaded')
    this.baseUrl = config.baseUrl || '/f/up'
  }

  async upload(data, fileName, type = 'file', _options = {}) {
    const safeType = path.basename(type)
    const safeFileName = path.basename(fileName)
    let finalFileName = safeFileName
    let uploadPath = path.join(this.baseDir, safeType, finalFileName)
    const ext = path.extname(fileName)
    const baseName = path.basename(fileName, ext)
    let counter = 1

    while (fs.existsSync(uploadPath)) {
      finalFileName = `${baseName}(${counter})${ext}`
      uploadPath = path.join(this.baseDir, safeType, finalFileName)
      counter++
    }

    const parentDir = path.dirname(uploadPath)
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true })
    }
    
    fs.writeFileSync(uploadPath, data)
    
    return {
      key: `${type}/${finalFileName}`,
      url: `${this.baseUrl}/${type}/${finalFileName}`,
      size: data.length
    }
  }
  async delete(key) {
    const filePath = path.join(this.baseDir, key)
    if (!filePath.startsWith(this.baseDir)) {
      throw new Error('非法的文件路径')
    }
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }

  async exists(key) {
    const filePath = path.join(this.baseDir, key)
    if (!filePath.startsWith(this.baseDir)) {
      return false
    }
    return fs.existsSync(filePath)
  }

  getUrl(key) {
    // 确保 key 不包含路径回溯
    const safeKey = key.split('/').map(p => path.basename(p)).join('/')
    return `${this.baseUrl}/${safeKey}`
  }
}