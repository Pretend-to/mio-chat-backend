#!/usr/bin/env node

/**
 * 清理系统配置
 */

import prismaManager from '../lib/database/prisma.js'
import logger from '../utils/logger.js'

async function cleanSystemSettings() {
  try {
    logger.info('正在清理系统配置...')
    
    // 初始化数据库连接
    await prismaManager.initialize()
    
    // 删除所有系统配置
    const result = await prismaManager.getClient().systemSetting.deleteMany({})
    
    logger.info(`已删除 ${result.count} 个系统配置项`)
    
  } catch (error) {
    logger.error('清理系统配置失败:', error)
  } finally {
    await prismaManager.disconnect()
  }
}

cleanSystemSettings()