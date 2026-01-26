#!/usr/bin/env node

/**
 * 测试配置 API
 */

import prismaManager from '../lib/database/prisma.js'
import SystemSettingsService from '../lib/database/services/SystemSettingsService.js'
import logger from '../utils/logger.js'

async function testConfigAPI() {
  try {
    // 初始化数据库连接
    await prismaManager.initialize()
    await SystemSettingsService.initialize()
    
    // 测试 getAllGroupedByCategory
    logger.info('测试 getAllGroupedByCategory...')
    const groupedSettings = await SystemSettingsService.getAllGroupedByCategory()
    
    logger.info('分组配置结构:')
    console.log(JSON.stringify(groupedSettings, null, 2))
    
    // 测试 getFullConfig
    logger.info('\n测试 getFullConfig...')
    const { getFullConfig } = await import('../lib/server/http/services/configService.js')
    const fullConfig = await getFullConfig()
    
    logger.info('完整配置结构:')
    console.log(JSON.stringify(fullConfig, null, 2))
    
  } catch (error) {
    logger.error('测试失败:', error)
  } finally {
    await prismaManager.disconnect()
  }
}

testConfigAPI()