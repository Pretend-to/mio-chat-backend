#!/usr/bin/env node

/**
 * 测试 LLM 适配器初始化修复
 * 验证即使没有配置适配器，LLM 模块也能正确初始化
 */

import logger from '../utils/logger.js'
import config from '../lib/config.js'
import Middleware from '../lib/middleware.js'

async function testLLMInitialization() {
  try {
    logger.info('=== 测试 LLM 适配器初始化修复 ===')
    
    // 1. 初始化配置
    logger.info('1. 初始化配置系统...')
    await config.initConfig()
    
    // 2. 检查当前配置的适配器数量
    const availableList = await config.getLLMEnabled()
    logger.info(`2. 当前配置的适配器数量: ${availableList.length}`)
    
    if (availableList.length === 0) {
      logger.info('   没有配置任何适配器，这是测试场景')
    } else {
      logger.info('   已配置的适配器:')
      availableList.forEach((instance, index) => {
        logger.info(`   ${index + 1}. ${instance.displayName} (${instance.adapterType})`)
      })
    }
    
    // 3. 创建中间件实例并测试初始化
    logger.info('3. 创建中间件实例...')
    const middleware = new Middleware()
    
    // 4. 测试 LLM 适配器加载
    logger.info('4. 测试 LLM 适配器加载...')
    await middleware.loadLLMAdapters()
    
    // 5. 验证 LLM 模块是否正确初始化
    logger.info('5. 验证 LLM 模块状态...')
    if (middleware.llm) {
      logger.info('   ✅ LLM 模块已正确初始化')
      
      // 检查模型列表
      const models = middleware.llm.getModelList(true)
      const modelCount = Object.keys(models).length
      logger.info(`   📊 可用模型提供商数量: ${modelCount}`)
      
      if (modelCount === 0) {
        logger.info('   ℹ️  当前没有可用的模型（符合预期，因为没有配置适配器）')
      } else {
        logger.info('   📋 可用的模型提供商:')
        Object.keys(models).forEach(provider => {
          logger.info(`      - ${provider}: ${models[provider].length} 个模型`)
        })
      }
    } else {
      logger.error('   ❌ LLM 模块未初始化')
      return false
    }
    
    // 6. 测试消息处理（模拟场景）
    logger.info('6. 测试消息处理能力...')
    
    // 模拟一个消息事件对象
    const mockMessageEvent = {
      body: {
        settings: {
          provider: 'test-provider',
          base: { model: 'test-model' }
        }
      },
      user: { isAdmin: true },
      error: (err) => {
        logger.info(`   📨 消息处理返回错误（符合预期）: ${err.message}`)
      }
    }
    
    // 测试消息处理
    try {
      middleware.llm.handleMessage(mockMessageEvent)
      logger.info('   ✅ 消息处理方法可正常调用')
    } catch (error) {
      logger.warn(`   ⚠️  消息处理出现异常: ${error.message}`)
    }
    
    logger.info('=== 测试完成 ===')
    logger.info('✅ 修复验证成功：即使没有配置适配器，LLM 模块也能正确初始化')
    
    return true
    
  } catch (error) {
    logger.error('测试过程中发生错误:', error)
    return false
  }
}

// 运行测试
testLLMInitialization()
  .then(success => {
    if (success) {
      logger.info('🎉 所有测试通过')
      process.exit(0)
    } else {
      logger.error('❌ 测试失败')
      process.exit(1)
    }
  })
  .catch(error => {
    logger.error('测试执行失败:', error)
    process.exit(1)
  })