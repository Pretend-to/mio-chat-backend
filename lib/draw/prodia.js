import api from 'api'
import logger from '../logger.js'
import config from '../config.js'

export default class Prodia {
  constructor() {
    this.sdk = api('@prodia/v1.3.0#be019b2kls0gqss3')
    this.key = this.getKey()
    this.sdk.auth(this.key)
  }
  async initProdia() {
    const [apiAvailable,keyAvailable] = await this.testApi()
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
      return [true,true]
    } catch (error) {
      logger.warn('Prodia API is not available')
      logger.error(error)
      if(error.status == 401) return [true,false]
      else return [false,false]
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
  async getText2Img(config, engine = 'sd', retry = 3) {
    if (retry !== 0) {
      try {
        const { data } =
          engine === 'sd'
            ? await this.sdk.generate(config)
            : await this.sdk.sdxlGenerate(config)
        const result = await this.getJob(data.job)
        return result.imageUrl
      } catch (error) {
        logger.warn(`Prodia API请求失败，重试次数${retry - 1}`)
        await new Promise((resolve) => setTimeout(resolve, 1000)) // 添加1秒延迟
        return this.getText2Img(config, engine, retry - 1)
      }
    } else {
      logger.error('Prodia API请求失败，重试次数已用完...')
      throw new Error()
    }
  }

  async getImg2Img(config, engine = 'sd', retry = 3) {
    if (retry !== 0) {
      try {
        const { data } =
          engine === 'sd'
            ? await this.sdk.transform(config)
            : await this.sdk.sdxlTransform(config)
        const result = await this.getJob(data.job)
        return result.imageUrl
      } catch (error) {
        logger.warn(`Prodia API请求失败，重试次数${retry - 1}`)
        await new Promise((resolve) => setTimeout(resolve, 1000)) // 添加1秒延迟
        return this.getImg2Img(config, engine, retry - 1)
      }
    } else {
      logger.error('Prodia API请求失败，重试次数已用完...')
      throw new Error()
    }
  }

  async getUpscaleImg(config, retry = 3) {
    if (retry !== 0) {
      try {
        const { data } = await this.sdk.upscale(config)
        const result = await this.getJob(data.job)
        return result.imageUrl
      } catch (error) {
        logger.warn(`Prodia API请求失败，重试次数${retry - 1}`)
        await new Promise((resolve) => setTimeout(resolve, 1000)) // 添加1秒延迟
        return this.getUpscaleImg(config, retry - 1)
      }
    } else {
      logger.error('Prodia API请求失败，重试次数已用完...')
      throw new Error()
    }
  }
}
