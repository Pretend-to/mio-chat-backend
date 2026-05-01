// 全局日志记录器
import logger from '../utils/logger.js'
import config from './config.js'
import Middleware from './middleware.js'
import fs from 'fs'

// 初始化中间件
global.middleware = new Middleware()

export async function statusCheck() {
  // 运行数据库种子填充
  const { seed } = await import('./database/seed.js')
  await seed()

  // 检查管理员访问码（安全要求）
  let adminCode = process.env.ADMIN_CODE || config.web.admin_code
  let userCode = process.env.USER_CODE || config.web.user_code

  // 如果没有管理员访问码，自动生成一个
  if (!adminCode) {
    logger.warn('未设置管理员访问码，正在自动生成...')
    
    // 动态导入数据库服务
    const { default: SystemSettingsService } = await import('./database/services/SystemSettingsService.js')
    
    // 确保服务已初始化
    if (!SystemSettingsService.prisma) {
      await SystemSettingsService.initialize()
    }
    
    // 生成安全的访问码
    const crypto = await import('crypto')
    const generatedAdminCode = crypto.randomBytes(16).toString('base64')
    const generatedUserCode = crypto.randomBytes(16).toString('base64')
    
    // 保存到数据库
    await SystemSettingsService.set('admin_code', generatedAdminCode, '管理员访问码')
    await SystemSettingsService.set('user_code', generatedUserCode, '普通用户访问码')
    
    // 更新配置
    config.web.admin_code = generatedAdminCode
    config.web.user_code = generatedUserCode
    
    adminCode = generatedAdminCode
    userCode = generatedUserCode
    
    logger.warn('🔐 自动生成的访问码：')
    logger.warn(`管理员访问码: ${generatedAdminCode}`)
    logger.warn(`普通用户访问码: ${generatedUserCode}`)
    logger.warn('⚠️  请妥善保存这些访问码！可在 Web 管理界面中修改')
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
    } else logger.warn('OneBot 协议配置不完整，请在 Web 管理界面中完善配置。')
  }

  // 检查是否配置了 LLM 协议
  const avaliableList = await config.getLLMEnabled()

  if (avaliableList.length > 0) {
    logger.info('正在检查 LLM 协议配置...')
    enabledProtocols.push('LLM')
    await global.middleware.loadLLMAdapters()
  } else {
    logger.warn('未配置后端 LLM 适配器，将仅使用前端配置的模型')
    // 即使没有配置适配器，也要初始化 LLM 模块以支持后续动态添加
    logger.info('初始化 LLM 模块以支持动态配置...')
    await global.middleware.loadLLMAdapters()
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
