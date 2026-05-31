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
    let finalFileName = fileName
    let uploadPath = path.join(this.baseDir, type, finalFileName)
    
    const ext = path.extname(fileName)
    const baseName = path.basename(fileName, ext)
    let counter = 1

    while (fs.existsSync(uploadPath)) {
      finalFileName = `${baseName}(${counter})${ext}`
      uploadPath = path.join(this.baseDir, type, finalFileName)
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
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }

  async exists(key) {
    const filePath = path.join(this.baseDir, key)
    return fs.existsSync(filePath)
  }

  getUrl(key) {
    return `${this.baseUrl}/${key}`
  }
}
