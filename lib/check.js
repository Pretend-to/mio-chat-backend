import Prodia from './draw/prodia.js'
import logger from './logger.js'
import config from './config.js'
import Middleware from './middleware.js'
import fs from 'fs'

export async function statusCheck() {
  // 初始化中间件
  const middleware = new Middleware()

  // 让middleware成为全局变量
  // eslint-disable-next-line no-undef
  global.middleware = middleware

  // 检查Prodia服务状态
  logger.info('正在检查Prodia服务状态...')
  const prodia = new Prodia()
  prodia.initProdia()

  // 检查是否配置了 OneBot 协议
  const onebotConfig = config.onebot
  if (onebotConfig) {
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
        userAgent: getUserAgent(),
      })
    } else logger.warn('OneBot 协议配置不完整，请检查 config.json 文件。')
  }

  // 检查是否配置了 OpenAI 协议
  const openaiConfig = config.openai
  if (openaiConfig) {
    logger.info('正在检查 OpenAI 协议配置...')
    if (openaiConfig.openai_api_key && openaiConfig.openai_base_url) {
      await middleware.startOpenai()
    }else logger.warn('OpenAI 协议配置不完整，请检查 config.json 文件。')
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
