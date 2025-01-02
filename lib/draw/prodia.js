import api from 'api'
import config from '../config.js'

export default class Prodia {
  constructor() {
    this.sdk = api('@prodia/v1.3.0#dl31dlw7p7fes')
    this.key = this.getKey()
    this.sdk.auth(this.key)
  }
  async initProdia() {
    const [apiAvailable, keyAvailable] = await this.testApi()
    if (apiAvailable && keyAvailable) {
      logger.info('Prodia服务正常运行中...')
    } else if (!apiAvailable) {
      logger.error('Prodia API不可用，请检查网络连接或代理...')
    } else {
      logger.error('Prodia API密钥不可用，请检查Prodia API密钥是否正确...')
    }
  }
  getKey() {
    // read yaml file and get key
    const doc = config.draw
    return doc.prodia_key ? doc.prodia_key : ''
  }
  async testApi() {
    try {
      await this.sdk.listLoras()
      return [true, true]
    } catch (error) {
      logger.warn('Prodia API is not available')
      logger.error(error)
      if (error.status == 401) return [true, false]
      else return [false, false]
    }
  }
  async getJob(id) {
    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        const { data } = await this.sdk.getJob({ jobId: id })
        if (data.status === 'succeeded') {
          resolve(data)
        } else if (data.status === 'failed') {
          reject(new Error('Job status is failed'))
        } else {
          setTimeout(checkStatus, 250)
        }
      }
      checkStatus()
    })
  }

  async getImage(paintConfig, engine = 'sd', type = 'text2img', retry = 3) {
    let paintError = null
    if (retry !== 0) {
      try {
        let data

        // 根据类型选择调用sdk的方法
        if (type === 'text2img') {
          data =
            engine === 'sd'
              ? await this.sdk.generate(paintConfig)
              : await this.sdk.sdxlGenerate(paintConfig)
        } else if (type === 'img2img') {
          data =
            engine === 'sd'
              ? await this.sdk.transform(paintConfig)
              : await this.sdk.sdxlTransform(paintConfig) 
        } else if (type === 'upscale') {
          data = await this.sdk.upscale(paintConfig)
        } else {
          throw new Error('Unsupported image generation type')
        }

        logger.debug('上面请求完了')

        const result = await this.getJob(data.data.job)

        let finalUrl = result.imageUrl
        const proxyPass = config.draw.reverse_proxy_url || undefined

        if (proxyPass && finalUrl.startsWith('https://images.prodia.xyz')) {
          // exchange https://images.prodia.xyz to proxy_pass
          finalUrl = finalUrl.replace('https://images.prodia.xyz', proxyPass)
          logger.info(`使用反向代理 ${proxyPass} 获取图片`)
        }

        return finalUrl
      } catch (error) {
        logger.error('获取图片失败')
        paintError = error
        logger.warn(`Prodia API请求失败，重试次数${retry - 1}`)
        await new Promise((resolve) => setTimeout(resolve, 1000)) // 添加1秒延迟
        return this.getImage(paintConfig, engine, type, retry - 1) // 递归调用
      }
    } else {
      logger.error('Prodia API请求失败，重试次数已用完...')
      logger.debug(paintError)
      throw paintError
    }
  }
}
