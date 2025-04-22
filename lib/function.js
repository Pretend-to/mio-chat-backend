import fs from 'fs'
import path from 'path'
import { bufferToImageUrl } from '../utils/imgTools.js'
const parseableFileTypes = [
  'txt',
  'md',
  'html',
]

class MioFunction {
  constructor({ name, func, description, parameters, timeout }, plugin = {}) {
    this.name = name;
    this.func = func;
    this.description = description;
    this.parameters = parameters;
    this.timeout = timeout || 120;
    this.parentPlugin = plugin;
  }
  async run(e) {
    return await this.func(e)
  }
  json(type) {
    const baseSechma = {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
    }

    let data
    if (type === 'openai') {
      data = { type: 'function', function: baseSechma } 
    } else if (['gemini', 'vertex'].includes(type)) {
      data = this.adaptUnsupportedOneOf(baseSechma)
    } else if (type === 'claude') {
      data = {
        ...baseSechma,
        input_schema: this.parameters
      }
      delete data.parameters
    }
    return data
  }

  adaptUnsupportedOneOf(baseSechma) {
    const { parameters } = baseSechma;  
    if (parameters.type === 'object') {
      for (const key in parameters.properties) {
        if (parameters.properties[key].oneOf) {
          // 随机获取里面的一个对象拿出来 (6)
          const randomIndex = Math.floor(Math.random() * parameters.properties[key].oneOf.length)
          parameters.properties[key] = parameters.properties[key].oneOf[randomIndex]
        }
      } 
    }
    return baseSechma 
  }

  async getImgUrlFromBuffer(baseUrl, data) {
    try {
      // 保存图片
      return await bufferToImageUrl(baseUrl, data)
    } catch (error) {
      console.error('Error processing image data:', error)
      throw new Error('Failed to save image: ' + error.message)
    }
  }
  saveTextFile(baseUrl, data, name) {
    // 保存纯文本文件
    const savePath = path.join(
      process.cwd(),
      'output',
      'generated',
      'file',
      name
    )
    // 确保目录存在
    fs.mkdirSync(path.dirname(savePath), { recursive: true })
    // 写入文件
    fs.writeFileSync(savePath, data)
    let isExploerParseable = false
    // 检查是否是可解析文件
    if (parseableFileTypes.includes(path.extname(savePath))) {
      isExploerParseable = true
    }
    // 返回文件的 URL
    return `${baseUrl}/f/gen/${isExploerParseable ? 'download' : 'show'}/${name}`
  }

  getPluginConfig() {
    if (this.parentPlugin) {
      return this.parentPlugin.getConfig()
    } else {
      return {}
    }
  }
}

export { MioFunction }