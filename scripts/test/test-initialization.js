#!/usr/bin/env node

/**
 * 测试初始化流程脚本
 */

import prismaManager from '../lib/database/prisma.js'
import SystemSettingsService from '../lib/database/services/SystemSettingsService.js'
import PluginConfigService from '../lib/database/services/PluginConfigService.js'
import PresetService from '../lib/database/services/PresetService.js'
import initializeDefaults from './initialize-defaults.js'
import logger from '../utils/logger.js'

async function testInitialization() {
  try {
    logger.info('开始测试初始化流程...')
    
    // 1. 初始化数据库
    logger.info('1. 初始化数据库连接...')
    await prismaManager.initialize()
    
    // 2. 初始化服务
    logger.info('2. 初始化数据库服务...')
    await SystemSettingsService.initialize()
    await PluginConfigService.initialize()
    await PresetService.initialize()
    
    // 3. 初始化默认配置
    logger.info('3. 初始化默认配置...')
    await initializeDefaults()
    
    // 4. 测试配置加载
    logger.info('4. 测试配置加载...')
    const config = (await import('../lib/config.js')).default
    await config._waitForInit()
    
    // 5. 验证配置
    logger.info('5. 验证配置...')
    logger.info(`- 服务器端口: ${config.server.port}`)
    logger.info(`- 调试模式: ${config.debug}`)
    logger.info(`- 管理员访问码: ${config.web.admin_code ? '已设置' : '未设置'}`)
    
    // 6. 测试数据库查询
    logger.info('6. 测试数据库查询...')
    const allSettings = await SystemSettingsService.findAll()
    logger.info(`- 系统设置数量: ${allSettings.length}`)
    
    const pluginConfigs = await PluginConfigService.findAll()
    logger.info(`- 插件配置数量: ${pluginConfigs.length}`)
    
    const presets = await PresetService.getAllPresets()
    const totalPresets = Object.values(presets).reduce((sum, category) => sum + category.length, 0)
    logger.info(`- 预设数量: ${totalPresets}`)
    
    logger.info('✓ 初始化流程测试成功!')
    
  } catch (error) {
    logger.error('初始化流程测试失败:', error)
    process.exit(1)
  } finally {
    await prismaManager.disconnect()
  }
}

testInitialization()