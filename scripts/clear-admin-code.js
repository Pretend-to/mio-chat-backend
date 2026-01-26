#!/usr/bin/env node

/**
 * 清除管理员访问码的测试脚本
 */

import prismaManager from '../lib/database/prisma.js'
import SystemSettingsService from '../lib/database/services/SystemSettingsService.js'
import logger from '../utils/logger.js'

async function clearAdminCode() {
  try {
    logger.info('正在清除管理员访问码...')
    
    // 初始化数据库连接
    await prismaManager.initialize()
    await SystemSettingsService.initialize()
    
    // 删除访问码设置
    await SystemSettingsService.delete('admin_code')
    await SystemSettingsService.delete('user_code')
    
    logger.info('访问码已清除')
    
  } catch (error) {
    logger.error('清除访问码失败:', error)
  } finally {
    await prismaManager.disconnect()
  }
}

clearAdminCode()