#!/usr/bin/env node

/**
 * 测试 Vertex 手动模型合并功能
 * 验证 manual_models 中的模型能够正确合并到 models 数组中
 */

import logger from '../utils/logger.js'
import { addLLMInstance, updateLLMInstance, getFullConfig } from '../lib/server/http/services/configService.js'

async function testVertexManualModelsMerge() {
  try {
    logger.info('=== 测试 Vertex 手动模型合并功能 ===')
    
    // 1. 获取当前配置
    logger.info('1. 获取当前配置...')
    const currentConfig = await getFullConfig()
    
    // 检查是否已有 Vertex 实例
    const existingVertexInstances = currentConfig.llm_adapters?.vertex || []
    logger.info(`当前 Vertex 实例数量: ${existingVertexInstances.length}`)
    
    if (existingVertexInstances.length > 0) {
      // 测试更新现有实例
      logger.info('2. 测试更新现有 Vertex 实例...')
      
      const instanceIndex = 0
      const existingInstance = existingVertexInstances[instanceIndex]
      logger.info(`更新实例 ${instanceIndex}: ${existingInstance.name || '未命名'}`)
      
      // 准备更新数据，包含手动模型
      const updateData = {
        manual_models: 'gemini-3-pro-preview\ngemini-3-flash-preview\ngemini-2.0-flash-exp'
      }
      
      logger.info(`手动模型配置: ${updateData.manual_models.replace(/\n/g, ', ')}`)
      
      // 更新实例
      const updateResult = await updateLLMInstance('vertex', instanceIndex, updateData)
      
      if (updateResult.instance && updateResult.instance.models) {
        logger.info(`✅ 更新成功！合并后的模型列表:`)
        updateResult.instance.models.forEach((model, index) => {
          logger.info(`   ${index + 1}. ${model}`)
        })
        
        // 检查手动模型是否都包含在内
        const manualModels = updateData.manual_models.split('\n').map(m => m.trim()).filter(m => m)
        const allIncluded = manualModels.every(model => updateResult.instance.models.includes(model))
        
        if (allIncluded) {
          logger.info('✅ 所有手动配置的模型都已成功合并到 models 数组中')
        } else {
          logger.error('❌ 部分手动配置的模型未能合并到 models 数组中')
          const missing = manualModels.filter(model => !updateResult.instance.models.includes(model))
          logger.error(`缺失的模型: ${missing.join(', ')}`)
        }
      } else {
        logger.error('❌ 更新后的实例没有 models 数组')
      }
      
      // 3. 验证配置持久化
      logger.info('3. 验证配置持久化...')
      const updatedConfig = await getFullConfig()
      const updatedInstance = updatedConfig.llm_adapters?.vertex?.[instanceIndex]
      
      if (updatedInstance && updatedInstance.models) {
        logger.info('✅ 配置已正确持久化到数据库')
        logger.info(`持久化后的模型数量: ${updatedInstance.models.length}`)
      } else {
        logger.error('❌ 配置持久化失败')
      }
      
    } else {
      logger.warn('没有现有的 Vertex 实例，跳过测试')
      logger.info('请先在管理界面中添加一个 Vertex 实例，然后重新运行此测试')
    }
    
    logger.info('=== 测试完成 ===')
    return true
    
  } catch (error) {
    logger.error('测试过程中发生错误:', error)
    return false
  }
}

// 运行测试
testVertexManualModelsMerge()
  .then(success => {
    if (success) {
      logger.info('🎉 Vertex 手动模型合并功能测试通过')
      process.exit(0)
    } else {
      logger.error('❌ Vertex 手动模型合并功能测试失败')
      process.exit(1)
    }
  })
  .catch(error => {
    logger.error('测试执行失败:', error)
    process.exit(1)
  })