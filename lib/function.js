import path from 'path'
import { getBufferName } from '../utils/imgTools.js'
import { generateHash } from '../utils/hash.js'
import storageService from './storage/StorageService.js'

class MioFunction {
  constructor({
    name,
    func,
    description,
    parameters,
    timeout,
    adminOnly = false,
  }) {
    this.func = func
    this.description = description
    this.parameters = parameters
    this.timeout = timeout || 300
    this.adminOnly = adminOnly // 是否仅限管理员执行
    this.hash = generateHash(JSON.stringify({ name, description, parameters }))
    this.name = name + '_mid_' + this.hash // 生成唯一的函数名称
    this.parentPlugin = null

    // 强制禁止覆盖 run() 方法以确保权限校验不会被跳过
    if (this.run !== MioFunction.prototype.run) {
      throw new Error(`[Security Error] Class "${this.constructor.name}" attempts to override final method "run()". Please use "func" property or another method name instead to ensure security checks are preserved.`)
    }
  }
  async run(e) {
    // 如果设置了仅限管理员，检查用户权限
    if (this.adminOnly && (!e.user || !e.user.isAdmin)) {
      throw new Error('Only administrators can execute this function.')
    }
    return await this.func(e)
  }
  json(type) {
    const classicTypes = ['openai', 'deepseek']
    const unsupportedOneOfTypes = ['gemini', 'vertex', 'vertexExpress']
    const extraInputSchemaTypes = ['claude']

    // const baseSechma = {
    //   name: this.name,
    //   description: this.description,
    //   parameters: this.parameters,
    // }

    // let data
    // if (type === 'openai') {
    //   data = { type: 'function', function: baseSechma }
    // } else if (['gemini', 'vertex'].includes(type)) {
    //   data = this.adaptUnsupportedOneOf(baseSechma)
    // } else if (type === 'claude') {
    //   data = {
    //     ...baseSechma,
    //     input_schema: this.parameters,
    //   }
    //   delete data.parameters
    // }

    let data
    if (classicTypes.includes(type)) {
      data = {
        type: 'function',
        function: {
          name: this.name,
          description: this.description,
          parameters: this.parameters,
        },
      }
    } else if (unsupportedOneOfTypes.includes(type)) {
      const baseSechma = {
        name: this.name,
        description: this.description,
        parameters: this.parameters,
      }
      data = this.adaptUnsupportedOneOf(baseSechma)
    } else if (extraInputSchemaTypes.includes(type)) {
      data = {
        name: this.name,
        description: this.description,
        input_schema: this.parameters,
      }
    } else {
      // 默认按照 classic 处理
      data = {
        type: 'function',
        function: {
          name: this.name,
          description: this.description,
          parameters: this.parameters,
        },
      }
    }

    return data
  }

  setPlugin(plugin) {
    this.parentPlugin = plugin
  }

  adaptUnsupportedOneOf(baseSechma) {
    const { parameters } = baseSechma
    if (parameters.type === 'object') {
      for (const key in parameters.properties) {
        if (parameters.properties[key].oneOf) {
          // 随机获取里面的一个对象拿出来 (6)
          const randomIndex = Math.floor(
            Math.random() * parameters.properties[key].oneOf.length,
          )
          parameters.properties[key] =
            parameters.properties[key].oneOf[randomIndex]
        }
      }
    }
    return baseSechma
  }

  async getImgUrlFromBuffer(baseUrl, data) {
    try {
      const filename = await getBufferName(data)
      const result = await storageService.upload(data, filename, 'image')
      return result.url.startsWith('http') ? result.url : `${baseUrl}${result.url}`
    } catch (error) {
      console.error('Error processing image data:', error)
      throw new Error('Failed to save image: ' + error.message)
    }
  }

  async saveTextFile(baseUrl, data, name) {
    try {
      // 根据扩展名自动识别 Content-Type，防止 S3 默认视为下载
      const ext = path.extname(name).toLowerCase()
      const mimeMap = {
        '.html': 'text/html',
        '.htm': 'text/html',
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.json': 'application/json',
      }
      const contentType = mimeMap[ext] || 'application/octet-stream'

      const result = await storageService.upload(Buffer.from(data), name, 'file', {
        contentType,
      })
      // 如果返回的是相对路径，补全 baseUrl
      return result.url.startsWith('http') ? result.url : `${baseUrl}${result.url}`
    } catch (error) {
      console.error('Error saving text file:', error)
      throw new Error('Failed to save file: ' + error.message)
    }
  }

  getPluginConfig() {
    if (this.parentPlugin) {
      // 返回缓存的配置，而不是异步加载
      return this.parentPlugin.config || {}
    } else {
      return {}
    }
  }
}

export { MioFunction }
