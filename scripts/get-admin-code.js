#!/usr/bin/env node

/**
 * 获取管理员访问码
 */

import prismaManager from '../lib/database/prisma.js'
import SystemSettingsService from '../lib/database/services/SystemSettingsService.js'
import logger from '../utils/logger.js'

async function getAdminCode() {
  try {
    // 初始化数据库连接
    await prismaManager.initialize()
    await SystemSettingsService.initialize()
    
    // 获取管理员访问码
    const adminCode = await SystemSettingsService.get('admin_code')
    const userCode = await SystemSettingsService.get('user_code')
    
    if (adminCode && adminCode.value) {
      console.log(`管理员访问码: ${adminCode.value}`)
    }
    
    if (userCode && userCode.value) {
      console.log(`普通用户访问码: ${userCode.value}`)
    }
    
  } catch (error) {
    logger.error('获取访问码失败:', error)
  } finally {
    await prismaManager.disconnect()
  }
}

getAdminCode()