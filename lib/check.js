/* eslint-disable no-undef */
// 全局日志记录器
import logger from '../utils/logger.js'
import config from './config.js'
import Middleware from './middleware.js'
import fs from 'fs'

// 初始化中间件
const middleware = new Middleware()
global.middleware = middleware

export async function statusCheck() {

  let enabledProtocols = []

  // 检查是否配置了 OneBot 协议
  const onebotConfig = config.onebot
  if (onebotConfig.enable) {
    enabledProtocols.push('OneBot')

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

  // 检查是否配置了 LLM 协议
  const llmConfig = [
    config.openai,
    config.gemini,
  ]
  if (llmConfig.some((cfg) => cfg.enable)) {
    logger.info('正在检查 LLM 协议配置...')
    enabledProtocols.push('LLM')
    middleware.loadLLMAdapters() 
  }

  if (enabledProtocols.length === 0) {
    logger.warn('未配置任何协议，请检查 config.json 文件。')
    process.exit(1)
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
