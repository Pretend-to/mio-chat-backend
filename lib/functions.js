import fs from 'fs'
import path from 'path'
import { bufferToImageUrl } from '../utils/imgTools.js'

const parseableFileTypes = [
  'txt',
  'md',
  'html',
  'htm', 
]

class MioFunction {
  constructor(config) {
    (this.name = config.name),
    (this.func = config.func),
    (this.description = config.description),
    (this.params = config.params)
  }

  async run(e) {
    return await this.func(e)
  }

  json() {
    const json = {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
      },
    }
    if (this.params.length > 0) {
      json.function.parameters = {
        type: 'object',
        properties: {},
        required: [],
      }
      this.params.forEach((param) => {
        json.function.parameters.properties[param.name] = {
          type: param.type,
          description: param.description,
          ...(param.enum && { enum: param.enum }),
        }
        if (param.items) {
          json.function.parameters.properties[param.name].items = param.items
        }
        if (param.required) {
          json.function.parameters.required.push(param.name)
        }
      })
    }
    // return JSON.stringify(json)
    return json
  }

  async getImgUrlFromBuffer(baseUrl, data) {
    try {
      // 保存图片
      return await bufferToImageUrl(data)
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
    if ( parseableFileTypes.includes(path.extname(savePath))) {
      isExploerParseable = true
    }

    // 返回文件的 URL
    return `${baseUrl}/f/gen/${isExploerParseable ? 'download' : 'show'}/${name}`
  }
}

class Param {
  constructor(config) {
    this.name = config.name
    this.type = config.type
    this.required = config.required
    this.enum = config?.enumeration || null
    this.description = config?.description || null
    this.items = config?.items || null
  }
}

export { MioFunction, Param }
