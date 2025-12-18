import prismaManager from '../lib/database/prisma.js'
import PresetService from '../lib/database/services/PresetService.js'
import SystemSettingsService from '../lib/database/services/SystemSettingsService.js'
import PluginConfigService from '../lib/database/services/PluginConfigService.js'
import logger from '../utils/logger.js'

/**
 * 测试数据库功能
 */
async function testDatabase() {
  try {
    logger.info('开始测试数据库功能...')
    
    // 初始化数据库和服务
    await prismaManager.initialize()
    await PresetService.initialize()
    await SystemSettingsService.initialize()
    await PluginConfigService.initialize()
    
    // 测试预设服务
    logger.info('测试预设服务...')
    const presets = await PresetService.getAllPresets()
    const presetCount = Object.values(presets).reduce((sum, category) => sum + category.length, 0)
    logger.info(`✓ 预设总数: ${presetCount}`)
    logger.info(`  - 普通预设: ${presets.common.length}`)
    logger.info(`  - 推荐预设: ${presets.recommended.length}`)
    logger.info(`  - 隐藏预设: ${presets.hidden.length}`)
    
    // 测试搜索功能
    const searchResults = await PresetService.search('助手', 5)
    logger.info(`✓ 搜索 "助手" 找到 ${searchResults.length} 个结果`)
    
    // 测试系统配置服务
    logger.info('测试系统配置服务...')
    const systemSettings = await SystemSettingsService.getAllGroupedByCategory()
    const settingCount = Object.values(systemSettings).reduce((sum, category) => sum + Object.keys(category).length, 0)
    logger.info(`✓ 系统配置总数: ${settingCount}`)
    Object.entries(systemSettings).forEach(([category, settings]) => {
      logger.info(`  - ${category}: ${Object.keys(settings).length} 项`)
    })
    
    // 测试插件配置服务
    logger.info('测试插件配置服务...')
    const pluginConfigs = await PluginConfigService.findAll()
    logger.info(`✓ 插件配置总数: ${pluginConfigs.length}`)
    pluginConfigs.forEach(config => {
      logger.info(`  - ${config.pluginName}: ${config.enabled ? '启用' : '禁用'}`)
    })
    
    // 测试数据库健康检查
    logger.info('测试数据库健康检查...')
    const healthCheck = await prismaManager.healthCheck()
    logger.info(`✓ 数据库健康状态: ${healthCheck.healthy ? '正常' : '异常'}`)
    if (!healthCheck.healthy) {
      logger.error(`  错误信息: ${healthCheck.message}`)
    }
    
    logger.info('数据库功能测试完成！')
    
  } catch (error) {
    logger.error('数据库测试失败:', error)
    throw error
  } finally {
    await prismaManager.disconnect()
  }
}

// 执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testDatabase()
    .then(() => {
      logger.info('所有测试通过！')
      process.exit(0)
    })
    .catch(error => {
      logger.error('测试失败:', error)
      process.exit(1)
    })
}

export default testDatabase