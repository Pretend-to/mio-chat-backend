import path from 'path'
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
    const unsupportedOneOfTypes = ['gemini', 'vertex', 'vertexExpress', 'agentPlatform']
    const extraInputSchemaTypes = ['claude']
    const flatTypes = ['openai-responses', 'xai'] // 扁平化结构，name/description 在 type 下一级而不在 function 下一级

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
    } else if (flatTypes.includes(type)) {
      data = {
        type: 'function',
        name: this.name,
        description: this.description,
        parameters: this.parameters,
      }
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
      const { bufferToImageUrl } = await import('../utils/imgTools.js')
      return await bufferToImageUrl(baseUrl, data)
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

  /**
   * 在前端展示就地选择浮层，阻塞挂起工具 Promise 进程直到用户操作或超时
   * @param {object} e 事件上下文 RequestEvent (LLMMessageEvent)
   * @param {object} options 选择项配置
   * @returns {Promise<object>} 用户选择的载荷
   */
  async showSelectOverlay(e, options) {
    const interactionId = `interact_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    // 推送 action 类型的流式更新，提示前端拉起面板
    e.update({
      type: 'action',
      content: {
        actionType: 'SHOW_SELECT_OVERLAY',
        interactionId,
        options: options.options || options,
        prompt: options.prompt || '请选择一个选项：'
      }
    })

    return new Promise((resolve, reject) => {
      e.registerInteraction(interactionId, (data) => {
        resolve(data) // 唤醒并返回
      })

      // 60秒超时防护，注销交互并抛错
      setTimeout(() => {
        if (e.unregisterInteraction(interactionId)) {
          reject(new Error('交互选择超时，用户未在规定时间内进行操作。'))
        }
      }, 60000)
    })
  }

  /**
   * 请求用户对高危指令的二次授权确认
   * @param {object} e 事件上下文 RequestEvent (LLMMessageEvent)
   * @param {string} prompt 授权提示文字
   * @returns {Promise<boolean>} 是否授权
   */
  async requestUserApproval(e, prompt) {
    const interactionId = `interact_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    e.update({
      type: 'action',
      content: {
        actionType: 'REQUEST_APPROVAL',
        interactionId,
        prompt
      }
    })

    return new Promise((resolve) => {
      e.registerInteraction(interactionId, (data) => {
        resolve(!!data.approved)
      })

      // 超时防护，超时默认直接拒绝以确保系统安全，并注销交互
      setTimeout(() => {
        if (e.unregisterInteraction(interactionId)) {
          resolve(false)
        }
      }, 60000)
    })
  }
}

export { MioFunction }
