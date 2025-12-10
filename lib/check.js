// 全局日志记录器
import logger from '../utils/logger.js'
import config from './config.js'
import Middleware from './middleware.js'
import fs from 'fs'

// 初始化中间件
global.middleware = new Middleware()

export async function statusCheck() {
  // 检查管理员访问码（安全要求）
  const adminCode = process.env.ADMIN_CODE || config.web.admin_code
  const userCode = process.env.USER_CODE || config.web.user_code

  if (!adminCode) {
    logger.error('安全错误：必须设置管理员访问码!')
    logger.error('请通过以下方式之一设置：')
    logger.error('1. 在环境变量中设置：ADMIN_CODE=your-admin-code')
    logger.error('2. 在配置文件中设置：config/config/config.yaml')
    logger.error('')
    logger.error('为确保安全，请设置强密码作为访问码！')
    logger.error('推荐使用：openssl rand -base64 32 生成随机密码')
    process.exit(1)
  }

  if (adminCode === 'admin' || adminCode === 'admin123') {
    logger.warn('警告：检测到使用默认的管理员访问码，建议修改为更安全的密码！')
  }

  if (adminCode === userCode) {
    logger.warn('警告：管理员访问码和普通用户访问码不能相同！')
    process.exit(1)
  }

  logger.info('✓ 安全配置检查通过（管理员访问码已设置）')

  let enabledProtocols = []

  // 检查是否配置了 OneBot 协议
  const onebotConfig = config.getOnebotConfig()
  if (onebotConfig.enable) {
    enabledProtocols.push('OneBot')

    logger.info('正在检查 OneBot 协议配置...')
    if (
      onebotConfig.reverse_ws_url &&
      onebotConfig.bot_qq &&
      onebotConfig.admin_qq
    ) {
      global.middleware.startOnebot({
        url: onebotConfig.reverse_ws_url,
        botId: onebotConfig.bot_qq,
        masterId: onebotConfig.admin_qq,
        token: onebotConfig.token,
        userAgent: await getUserAgent(),
      })
    } else logger.warn('OneBot 协议配置不完整，请检查 config.json 文件。')
  }

  // 检查是否配置了 LLM 协议
  const avaliableList = await config.getLLMEnabled()

  if (avaliableList.length > 0) {
    logger.info('正在检查 LLM 协议配置...')
    enabledProtocols.push('LLM')
    await global.middleware.loadLLMAdapters()
  } else {
    logger.warn('未配置后端 LLM 适配器，将仅使用前端配置的模型')
  }

  if (enabledProtocols.length === 0) {
    logger.warn('未启用任何协议 (OneBot/LLM)，服务器将仅提供前端配置功能')
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
