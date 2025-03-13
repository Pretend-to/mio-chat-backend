import fs from 'fs'
import path from 'path'
import { bufferToImageUrl } from '../utils/imgTools.js'
const parseableFileTypes = [
  'txt',
  'md',
  'html',
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
  json(type) {
    if (type === 'openai') {
      return this.jsonOpenai()
    } else if (type === 'gemini') {
      return this.jsonGemini()
    }
  }
  jsonOpenai() {
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
  jsonGemini() {
    const json = {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'OBJECT',
        properties: {},
        required: [],
      },
    }

    if (this.params.length > 0) {
      this.params.forEach((param) => {
        const geminiTypeMap = {
          'string': 'STRING',
          'number': 'NUMBER',
          'integer': 'INTEGER',
          'boolean': 'BOOLEAN',
          'array': 'ARRAY',
          'object': 'OBJECT',
        }
        const geminiType = geminiTypeMap[param.type] || 'STRING' // Default to STRING

        json.parameters.properties[param.name] = {
          type: geminiType,
          description: param.description,
        }

        if (param.enum) {
          json.parameters.properties[param.name].enum = param.enum
        }

        if (param.items) {
          json.parameters.properties[param.name].items = {
            type: geminiTypeMap[param.items.type] || 'STRING', // Handle items type
          }
        }

        if (param.required) {
          json.parameters.required.push(param.name)
        }
      })
    }

    return json
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
    const plugin = global.middleware.getPluginbyToolName(this.name)
    if (plugin) {
      return plugin.getConfig()
    } else {
      return {}
    }
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