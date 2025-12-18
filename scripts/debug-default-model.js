#!/usr/bin/env node

/**
 * 调试默认模型获取问题
 */

import config from '../lib/config.js'
import logger from '../utils/logger.js'

async function debugDefaultModel() {
  try {
    logger.info('调试默认模型获取...')
    
    // 等待配置初始化完成
    await config._waitForInit()
    
    // 1. 检查 llm_adapters 配置
    logger.info('1. 检查 llm_adapters 配置:')
    console.log('config.llm_adapters:', JSON.stringify(config.llm_adapters, null, 2))
    
    // 2. 检查 getLLMEnabled() 返回的结果
    logger.info('2. 检查 getLLMEnabled() 返回的结果:')
    const enabledInstances = await config.getLLMEnabled()
    console.log('enabledInstances:', JSON.stringify(enabledInstances, null, 2))
    
    // 3. 检查 availableInstances
    logger.info('3. 检查 availableInstances:')
    console.log('config.availableInstances:', JSON.stringify(config.availableInstances, null, 2))
    
    // 4. 手动计算默认模型
    logger.info('4. 手动计算默认模型:')
    const defaultModel = {}
    for (const instance of enabledInstances) {
      const { displayName, adapterType, config: instanceConfig } = instance
      console.log(`处理实例: ${displayName} (${adapterType})`)
      console.log(`实例配置:`, JSON.stringify(instanceConfig, null, 2))
      
      if (instanceConfig && instanceConfig.default_model) {
        let modelName = instanceConfig.default_model
        console.log(`找到默认模型: ${modelName}`)
        
        // Gemini 需要添加 models/ 前缀
        if (adapterType === 'gemini' && !modelName.startsWith('models/')) {
          modelName = `models/${modelName}`
        }
        defaultModel[displayName] = modelName
        console.log(`设置默认模型: ${displayName} = ${modelName}`)
      } else {
        console.log(`未找到默认模型配置`)
      }
    }
    
    console.log('手动计算的默认模型:', JSON.stringify(defaultModel, null, 2))
    
    // 5. 调用 getDefaultModel() 方法
    logger.info('5. 调用 getDefaultModel() 方法:')
    const apiDefaultModel = await config.getDefaultModel()
    console.log('API返回的默认模型:', JSON.stringify(apiDefaultModel, null, 2))
    
  } catch (error) {
    logger.error('调试失败:', error)
    process.exit(1)
  }
}

// 运行调试
debugDefaultModel().then(() => {
  logger.info('调试完成')
  process.exit(0)
}).catch(error => {
  logger.error('调试异常:', error)
  process.exit(1)
})