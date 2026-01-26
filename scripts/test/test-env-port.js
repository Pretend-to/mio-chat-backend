#!/usr/bin/env node

/**
 * 测试环境变量端口配置
 */

import logger from '../utils/logger.js'

async function testEnvPortConfig() {
  logger.info('测试环境变量端口配置...')
  
  // 保存原始环境变量
  const originalPort = process.env.PORT
  const originalHost = process.env.HOST
  
  try {
    // 测试 1: 设置环境变量
    process.env.PORT = '8080'
    process.env.HOST = '127.0.0.1'
    
    logger.info('设置环境变量: PORT=8080, HOST=127.0.0.1')
    
    // 重新导入配置模块（使用时间戳避免缓存）
    const config = (await import('../lib/config.js?t=' + Date.now())).default
    
    // 等待配置初始化
    await config._waitForInit()
    
    logger.info(`配置中的端口: ${config.server.port}`)
    logger.info(`配置中的主机: ${config.server.host}`)
    
    // 验证结果
    if (config.server.port === 8080 && config.server.host === '127.0.0.1') {
      logger.info('✅ 环境变量配置测试通过')
    } else {
      logger.error('❌ 环境变量配置测试失败')
      logger.error(`期望: port=8080, host=127.0.0.1`)
      logger.error(`实际: port=${config.server.port}, host=${config.server.host}`)
    }
    
    // 测试 2: 清除环境变量，使用默认值
    delete process.env.PORT
    delete process.env.HOST
    
    logger.info('清除环境变量，测试默认配置...')
    
    // 重新导入配置模块（使用时间戳避免缓存）
    const config2 = (await import('../lib/config.js?t=' + Date.now())).default
    
    // 等待配置初始化
    await config2._waitForInit()
    
    logger.info(`默认端口: ${config2.server.port}`)
    logger.info(`默认主机: ${config2.server.host}`)
    
    if (config2.server.port === 3080 && config2.server.host === '0.0.0.0') {
      logger.info('✅ 默认配置测试通过')
    } else {
      logger.info('ℹ️  使用数据库配置或其他默认值')
    }
    
  } catch (error) {
    logger.error('测试过程中发生错误:', error)
  } finally {
    // 恢复原始环境变量
    if (originalPort !== undefined) {
      process.env.PORT = originalPort
    } else {
      delete process.env.PORT
    }
    
    if (originalHost !== undefined) {
      process.env.HOST = originalHost
    } else {
      delete process.env.HOST
    }
  }
}

// 运行测试
testEnvPortConfig().catch(error => {
  logger.error('测试失败:', error)
  process.exit(1)
})