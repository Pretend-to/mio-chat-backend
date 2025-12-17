#!/usr/bin/env node

import prismaManager from '../lib/database/prisma.js'
import SystemSettingsService from '../lib/database/services/SystemSettingsService.js'
import logger from '../utils/logger.js'

/**
 * 清理 LLM 配置中的嵌套问题
 */

async function cleanLLMConfig() {
  try {
    // 初始化数据库连接
    await prismaManager.initialize()
    await SystemSettingsService.initialize()
    
    // 获取当前的 llm_adapters 配置
    const llmAdaptersSettings = await SystemSettingsService.getByCategory('llm_adapters')
    
    logger.info('当前 llm_adapters 配置:')
    llmAdaptersSettings.forEach(setting => {
      console.log(`${setting.key}:`, JSON.stringify(setting.value, null, 2))
    })
    
    // 删除所有 llm_adapters 相关的配置
    for (const setting of llmAdaptersSettings) {
      await SystemSettingsService.delete(setting.key)
      logger.info(`删除配置: ${setting.key}`)
    }
    
    // 重新创建一个干净的 llm_adapters 配置
    const cleanConfig = {
      openai: [],
      gemini: [],
      vertex: [],
      deepseek: []
    }
    
    await SystemSettingsService.set('llm_adapters', cleanConfig, 'llm_adapters', 'LLM 适配器配置')
    logger.info('重新创建干净的 llm_adapters 配置')
    
    logger.info('✅ LLM 配置清理完成')
    
  } catch (error) {
    logger.error('清理 LLM 配置失败:', error)
  } finally {
    await prismaManager.disconnect()
  }
}

cleanLLMConfig()