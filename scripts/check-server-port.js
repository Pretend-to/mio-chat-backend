#!/usr/bin/env node

/**
 * 检查和更新数据库中的服务器端口配置
 */

import logger from '../utils/logger.js'
import prismaManager from '../lib/database/prisma.js'
import SystemSettingsService from '../lib/database/services/SystemSettingsService.js'

async function checkServerPort() {
  try {
    logger.info('检查数据库中的服务器端口配置...')
    
    // 初始化数据库连接
    await prismaManager.initialize()
    await SystemSettingsService.initialize()
    
    // 检查当前端口配置
    const serverPort = await SystemSettingsService.get('server_port')
    
    if (serverPort && serverPort.value) {
      logger.info(`数据库中的端口配置: ${serverPort.value}`)
      
      // 如果数据库中的端口不是 3080，询问是否更新
      if (serverPort.value !== 3080) {
        logger.info(`将端口从 ${serverPort.value} 更新为默认值 3080`)
        await SystemSettingsService.set('server_port', 3080)
        logger.info('✅ 端口配置已更新')
      } else {
        logger.info('✅ 端口配置已经是 3080')
      }
    } else {
      logger.info('数据库中没有端口配置，设置默认值 3080')
      await SystemSettingsService.set('server_port', 3080)
      logger.info('✅ 端口配置已设置')
    }
    
    // 验证更新后的配置
    const updatedPort = await SystemSettingsService.get('server_port')
    logger.info(`更新后的端口配置: ${updatedPort.value}`)
    
  } catch (error) {
    logger.error('检查端口配置时发生错误:', error)
  } finally {
    await prismaManager.disconnect()
  }
}

// 运行检查
checkServerPort().catch(error => {
  logger.error('脚本执行失败:', error)
  process.exit(1)
})