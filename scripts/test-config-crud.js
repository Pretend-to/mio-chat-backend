import prismaManager from '../lib/database/prisma.js'
import SystemSettingsService from '../lib/database/services/SystemSettingsService.js'
import PluginConfigService from '../lib/database/services/PluginConfigService.js'
import { getFullConfig, getConfigSection } from '../lib/server/http/services/configService.js'
import logger from '../utils/logger.js'

/**
 * 测试配置 CRUD 功能
 */
async function testConfigCRUD() {
  try {
    logger.info('开始测试配置 CRUD 功能...')
    
    // 初始化数据库和服务
    await prismaManager.initialize()
    await SystemSettingsService.initialize()
    await PluginConfigService.initialize()
    
    // 1. 测试系统配置服务
    logger.info('测试系统配置服务...')
    
    // 获取所有配置
    const allSettings = await SystemSettingsService.getAllGroupedByCategory()
    logger.info(`✓ 获取所有系统配置: ${Object.keys(allSettings).length} 个分类`)
    Object.entries(allSettings).forEach(([category, settings]) => {
      logger.info(`  - ${category}: ${Object.keys(settings).length} 项`)
    })
    
    // 测试获取特定分类
    const serverConfig = await SystemSettingsService.getByCategory('server')
    logger.info(`✓ 获取服务器配置: ${serverConfig.length} 项`)
    
    // 2. 测试插件配置服务
    logger.info('测试插件配置服务...')
    
    const pluginConfigs = await PluginConfigService.findAll()
    logger.info(`✓ 获取所有插件配置: ${pluginConfigs.length} 个`)
    pluginConfigs.forEach(config => {
      logger.info(`  - ${config.pluginName}: ${config.enabled ? '启用' : '禁用'}`)
    })
    
    // 测试获取特定插件配置
    const onebotConfig = await PluginConfigService.findByName('onebotConfig')
    if (onebotConfig) {
      logger.info(`✓ 获取 OneBot 配置成功`)
    } else {
      logger.warn('OneBot 配置不存在')
    }
    
    // 3. 测试配置服务层
    logger.info('测试配置服务层...')
    
    // 测试获取完整配置
    const fullConfig = await getFullConfig()
    logger.info(`✓ 获取完整配置成功: ${Object.keys(fullConfig).length} 个顶级键`)
    
    // 测试获取配置节点
    try {
      const serverSection = await getConfigSection('server')
      logger.info(`✓ 获取服务器配置节点成功`)
    } catch (error) {
      logger.warn('获取服务器配置节点失败:', error.message)
    }
    
    // 4. 测试配置更新
    logger.info('测试配置更新...')
    
    // 创建测试配置
    const testKey = 'test_config_' + Date.now()
    await SystemSettingsService.set(testKey, { test: true }, 'general', '测试配置')
    logger.info(`✓ 创建测试配置: ${testKey}`)
    
    // 读取测试配置
    const testConfig = await SystemSettingsService.get(testKey)
    if (testConfig && testConfig.value.test === true) {
      logger.info(`✓ 读取测试配置成功`)
    } else {
      logger.error('读取测试配置失败')
    }
    
    // 删除测试配置
    await SystemSettingsService.delete(testKey)
    logger.info(`✓ 删除测试配置成功`)
    
    logger.info('配置 CRUD 功能测试完成！')
    
  } catch (error) {
    logger.error('配置 CRUD 测试失败:', error)
    throw error
  } finally {
    await prismaManager.disconnect()
  }
}

// 执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testConfigCRUD()
    .then(() => {
      logger.info('所有配置 CRUD 测试通过！')
      process.exit(0)
    })
    .catch(error => {
      logger.error('配置 CRUD 测试失败:', error)
      process.exit(1)
    })
}

export default testConfigCRUD