#!/usr/bin/env node

/**
 * 测试配置更新后是否立即生效（不需要重启）
 */

import config from '../lib/config.js'
import logger from '../utils/logger.js'
import { updateConfigSection } from '../lib/server/http/services/configService.js'

async function testConfigReload() {
  try {
    logger.info('开始测试配置更新和重新加载...')
    
    // 等待配置初始化完成
    await config._waitForInit()
    
    // 1. 获取当前的 llm_adapters 配置
    logger.info('1. 获取当前配置...')
    const currentConfig = config.llm_adapters
    logger.info('当前 llm_adapters 配置:', JSON.stringify(currentConfig, null, 2))
    
    // 2. 获取当前默认模型
    logger.info('2. 获取当前默认模型...')
    const currentDefaultModel = await config.getDefaultModel()
    logger.info('当前默认模型:', JSON.stringify(currentDefaultModel, null, 2))
    
    // 3. 模拟更新一个适配器的默认模型
    if (currentConfig.vertex && currentConfig.vertex.length > 0) {
      logger.info('3. 更新 Vertex 适配器的默认模型...')
      
      const updatedConfig = JSON.parse(JSON.stringify(currentConfig))
      const originalModel = updatedConfig.vertex[0].default_model
      const newModel = originalModel === 'gemini-2.0-flash-exp' ? 'gemini-3-pro-preview' : 'gemini-2.0-flash-exp'
      
      updatedConfig.vertex[0].default_model = newModel
      logger.info(`将默认模型从 ${originalModel} 更改为 ${newModel}`)
      
      // 4. 通过 API 更新配置
      logger.info('4. 通过 API 更新配置...')
      await updateConfigSection('llm_adapters', updatedConfig)
      
      // 5. 立即检查配置是否已更新（不重启）
      logger.info('5. 检查配置是否立即生效...')
      const updatedDefaultModel = await config.getDefaultModel()
      logger.info('更新后的默认模型:', JSON.stringify(updatedDefaultModel, null, 2))
      
      // 6. 验证更新是否生效
      const instanceName = Object.keys(updatedDefaultModel)[0]
      if (instanceName && updatedDefaultModel[instanceName] && updatedDefaultModel[instanceName].includes(newModel)) {
        logger.info('✅ 配置更新立即生效！无需重启')
        
        // 7. 恢复原始配置
        logger.info('7. 恢复原始配置...')
        updatedConfig.vertex[0].default_model = originalModel
        await updateConfigSection('llm_adapters', updatedConfig)
        
        const restoredDefaultModel = await config.getDefaultModel()
        logger.info('恢复后的默认模型:', JSON.stringify(restoredDefaultModel, null, 2))
        
        logger.info('✅ 测试完成：配置更新和重新加载功能正常工作')
      } else {
        logger.error('❌ 配置更新未立即生效，仍需要重启')
      }
    } else if (currentConfig.openai && currentConfig.openai.length > 0) {
      logger.info('3. 更新 OpenAI 适配器的默认模型...')
      
      const updatedConfig = JSON.parse(JSON.stringify(currentConfig))
      const originalModel = updatedConfig.openai[0].default_model
      const newModel = originalModel === 'gpt-4' ? 'gpt-3.5-turbo' : 'gpt-4'
      
      updatedConfig.openai[0].default_model = newModel
      logger.info(`将默认模型从 ${originalModel} 更改为 ${newModel}`)
      
      // 4. 通过 API 更新配置
      logger.info('4. 通过 API 更新配置...')
      await updateConfigSection('llm_adapters', updatedConfig)
      
      // 5. 立即检查配置是否已更新（不重启）
      logger.info('5. 检查配置是否立即生效...')
      const updatedDefaultModel = await config.getDefaultModel()
      logger.info('更新后的默认模型:', JSON.stringify(updatedDefaultModel, null, 2))
      
      // 6. 验证更新是否生效
      const instanceName = Object.keys(updatedDefaultModel)[0]
      if (instanceName && updatedDefaultModel[instanceName] && updatedDefaultModel[instanceName].includes(newModel)) {
        logger.info('✅ 配置更新立即生效！无需重启')
        
        // 7. 恢复原始配置
        logger.info('7. 恢复原始配置...')
        updatedConfig.openai[0].default_model = originalModel
        await updateConfigSection('llm_adapters', updatedConfig)
        
        const restoredDefaultModel = await config.getDefaultModel()
        logger.info('恢复后的默认模型:', JSON.stringify(restoredDefaultModel, null, 2))
        
        logger.info('✅ 测试完成：配置更新和重新加载功能正常工作')
      } else {
        logger.error('❌ 配置更新未立即生效，仍需要重启')
      }
    } else {
      logger.warn('未找到可用的适配器配置，跳过测试')
    }
    
  } catch (error) {
    logger.error('测试失败:', error)
    process.exit(1)
  }
}

// 运行测试
testConfigReload().then(() => {
  logger.info('测试完成')
  process.exit(0)
}).catch(error => {
  logger.error('测试异常:', error)
  process.exit(1)
})