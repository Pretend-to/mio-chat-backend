#!/usr/bin/env node

/**
 * OneBot 配置测试脚本
 * 验证 OneBot 配置是否正确加载和保存
 */

import logger from '../utils/logger.js'
import SystemSettingsService from '../lib/database/services/SystemSettingsService.js'
import config from '../lib/config.js'

async function testOneBotConfig() {
  try {
    logger.info('开始测试 OneBot 配置...')
    
    // 等待配置初始化
    await config._waitForInit()
    
    // 1. 测试从数据库读取
    logger.info('\n1. 测试从数据库读取配置')
    const dbConfig = await SystemSettingsService.get('onebot')
    if (dbConfig && dbConfig.value) {
      logger.info('✓ 数据库中存在 OneBot 配置')
      logger.info(`  - enable: ${dbConfig.value.enable}`)
      logger.info(`  - reverse_ws_url: ${dbConfig.value.reverse_ws_url || '(未设置)'}`)
      logger.info(`  - bot_qq: ${dbConfig.value.bot_qq || '(未设置)'}`)
      logger.info(`  - admin_qq: ${dbConfig.value.admin_qq || '(未设置)'}`)
    } else {
      logger.warn('✗ 数据库中未找到 OneBot 配置')
    }
    
    // 2. 测试从内存读取
    logger.info('\n2. 测试从内存读取配置')
    const memoryConfig = config.getOnebotConfig()
    if (memoryConfig) {
      logger.info('✓ 内存中存在 OneBot 配置')
      logger.info(`  - enable: ${memoryConfig.enable}`)
      logger.info(`  - reverse_ws_url: ${memoryConfig.reverse_ws_url || '(未设置)'}`)
      logger.info(`  - bot_qq: ${memoryConfig.bot_qq || '(未设置)'}`)
      logger.info(`  - admin_qq: ${memoryConfig.admin_qq || '(未设置)'}`)
    } else {
      logger.warn('✗ 内存中未找到 OneBot 配置')
    }
    
    // 3. 测试配置一致性
    logger.info('\n3. 测试配置一致性')
    if (dbConfig && dbConfig.value && memoryConfig) {
      const isConsistent = 
        dbConfig.value.enable === memoryConfig.enable &&
        dbConfig.value.reverse_ws_url === memoryConfig.reverse_ws_url &&
        dbConfig.value.bot_qq === memoryConfig.bot_qq &&
        dbConfig.value.admin_qq === memoryConfig.admin_qq
      
      if (isConsistent) {
        logger.info('✓ 数据库配置与内存配置一致')
      } else {
        logger.warn('✗ 数据库配置与内存配置不一致')
        logger.warn('  数据库:', JSON.stringify(dbConfig.value, null, 2))
        logger.warn('  内存:', JSON.stringify(memoryConfig, null, 2))
      }
    }
    
    // 4. 测试配置更新
    logger.info('\n4. 测试配置更新（不会实际修改）')
    const _testConfig = {
      ...memoryConfig,
      enable: false,
      reverse_ws_url: 'ws://test.example.com',
      bot_qq: '123456789',
      admin_qq: '987654321',
      token: 'test_token'
    }
    logger.info('✓ 测试配置准备完成（未实际保存）')
    logger.info('  如需测试保存功能，请取消注释以下代码：')
    logger.info('  // await SystemSettingsService.set("onebot", _testConfig, "onebot", "OneBot 协议配置")')
    
    logger.info('\n✅ 所有测试完成')
    
  } catch (error) {
    logger.error('❌ 测试失败:', error)
    throw error
  }
}

// 主函数
async function main() {
  try {
    await testOneBotConfig()
    process.exit(0)
  } catch (error) {
    logger.error('测试执行失败:', error)
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default testOneBotConfig
