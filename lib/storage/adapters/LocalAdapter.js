import fs from 'fs'
import path from 'path'
import StorageAdapter from '../StorageAdapter.js'
import { ensureDirectoryExists } from '../../server/http/utils/fileUtils.js'

export default class LocalAdapter extends StorageAdapter {
  constructor(config = {}) {
    super(config)
    this.baseDir = config.baseDir || path.join(process.cwd(), 'output', 'uploaded')
    this.baseUrl = config.baseUrl || '/f/up'
  }

  async upload(data, fileName, type = 'file', _options = {}) {
    const uploadDir = path.join(this.baseDir, type)
    const uploadPath = path.join(uploadDir, fileName)
    
    ensureDirectoryExists(uploadDir)
    
    fs.writeFileSync(uploadPath, data)
    
    return {
      key: `${type}/${fileName}`,
      url: `${this.baseUrl}/${type}/${fileName}`,
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
