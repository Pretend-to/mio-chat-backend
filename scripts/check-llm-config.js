#!/usr/bin/env node

/**
 * 检查当前的LLM适配器配置
 */

import config from '../lib/config.js'
import logger from '../utils/logger.js'

async function checkLLMConfig() {
  try {
    logger.info('检查当前LLM适配器配置...')
    
    // 等待配置初始化完成
    await config._waitForInit()
    
    // 获取当前的 llm_adapters 配置
    const llmAdapters = config.llm_adapters
    logger.info('当前 llm_adapters 配置:')
    console.log(JSON.stringify(llmAdapters, null, 2))
    
    // 获取启用的实例
    const enabledInstances = await config.getLLMEnabled()
    logger.info(`找到 ${enabledInstances.length} 个启用的LLM实例:`)
    enabledInstances.forEach((instance, index) => {
      console.log(`${index + 1}. ${instance.displayName} (${instance.adapterType})`)
      console.log(`   默认模型: ${instance.config.default_model || '未设置'}`)
      console.log(`   启用状态: ${instance.config.enable}`)
    })
    
    // 获取默认模型
    const defaultModels = await config.getDefaultModel()
    logger.info('当前默认模型:')
    console.log(JSON.stringify(defaultModels, null, 2))
    
  } catch (error) {
    logger.error('检查失败:', error)
    process.exit(1)
  }
}

// 运行检查
checkLLMConfig().then(() => {
  logger.info('检查完成')
  process.exit(0)
}).catch(error => {
  logger.error('检查异常:', error)
  process.exit(1)
})