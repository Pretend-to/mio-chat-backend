/* eslint-disable no-undef */
import Prodia from './draw/prodia.js'
import logger from '../utils/logger.js'
import config from './config.js'
import Middleware from './middleware.js'
import fs from 'fs'

// 全局日志记录器
global.logger = logger

// 初始化中间件
const middleware = new Middleware()
global.middleware = middleware

export async function statusCheck() {


  // 检查Prodia服务状态
  if (config.draw.enable_sd_server) {
    logger.info('正在检查Prodia服务状态...')
    const prodia = new Prodia()
    await prodia.initProdia()
  }

  // 检查是否配置了 OneBot 协议
  const onebotConfig = config.onebot
  if (onebotConfig.enable) {

    logger.info('正在检查 OneBot 协议配置...')
    if (
      onebotConfig.reverse_ws_url &&
      onebotConfig.bot_qq &&
      onebotConfig.admin_qq
    ) {
      middleware.startOnebot({
        url: onebotConfig.reverse_ws_url,
        qq: onebotConfig.bot_qq,
        master: onebotConfig.admin_qq,
        userAgent: await getUserAgent(),
      })
    } else logger.warn('OneBot 协议配置不完整，请检查 config.json 文件。')
  }

  // 检查是否配置了 OpenAI 协议
  const openaiConfig = config.openai
  if (openaiConfig.enable) {
    logger.info('正在检查 OpenAI 协议配置...')
    if (openaiConfig.openai_api_key && openaiConfig.openai_base_url) {
      await middleware.startOpenai()
      logger.info('OpenAI 协议配置成功。正在加载插件...')
      await middleware.loadPlugins()
    } else logger.warn('OpenAI 协议配置不完整，请检查 config.json 文件。')
  }
}
function getUserAgent() {
  return new Promise((resolve, reject) => {
    fs.readFile('package.json', 'utf8', (err, data) => {
      if (err) {
        console.error('读取package.json文件出错:', err)
        reject(err)
        return
      }

      try {
        const packageJson = JSON.parse(data)
        const userAgent = `${packageJson.name}/${packageJson.version}`

        resolve(userAgent)
      } catch (error) {
        console.error('解析package.json文件出错:', error)
        reject(error)
      }
    })
  })
}
