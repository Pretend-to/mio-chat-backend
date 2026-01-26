#!/usr/bin/env node

/**
 * 简单测试 Vertex 手动模型合并功能
 * 只测试配置处理逻辑，不涉及 LLM 实例管理
 */

import logger from '../utils/logger.js'
import { prepareInstanceConfig } from '../lib/server/http/services/configService.js'

async function testVertexModelsMergeSimple() {
  try {
    logger.info('=== 测试 Vertex 手动模型合并逻辑 ===')
    
    // 1. 测试基本合并功能
    logger.info('1. 测试基本合并功能...')
    
    const instanceConfig = {
      name: 'TestVertex',
      enable: true,
      region: 'us-central1',
      service_account_json: '{"test": "config"}',
      manual_models: 'gemini-3-pro-preview\ngemini-3-flash-preview\ngemini-2.0-flash-exp',
      models: []
    }
    
    const fullConfig = {
      llm_adapters: {
        gemini: [{ api_key: 'test', base_url: 'test' }]
      }
    }
    
    const preparedConfig = await prepareInstanceConfig('vertex', instanceConfig, fullConfig)
    
    logger.info('原始 manual_models:')
    logger.info(`  ${instanceConfig.manual_models.replace(/\n/g, ', ')}`)
    
    logger.info('合并后的 models 数组:')
    if (preparedConfig.models && preparedConfig.models.length > 0) {
      preparedConfig.models.forEach((model, index) => {
        logger.info(`  ${index + 1}. ${model}`)
      })
      logger.info('✅ 手动模型成功合并到 models 数组')
    } else {
      logger.error('❌ models 数组为空或不存在')
      return false
    }
    
    // 2. 测试去重功能
    logger.info('\n2. 测试去重功能...')
    
    const instanceConfigWithDuplicates = {
      name: 'TestVertex2',
      enable: true,
      region: 'us-central1',
      service_account_json: '{"test": "config"}',
      manual_models: 'gemini-3-pro-preview\ngemini-3-flash-preview\ngemini-3-pro-preview', // 重复模型
      models: ['gemini-3-flash-preview', 'existing-model'] // 已有模型，包含重复
    }
    
    const preparedConfig2 = await prepareInstanceConfig('vertex', instanceConfigWithDuplicates, fullConfig)
    
    logger.info('原始 models 数组: ' + instanceConfigWithDuplicates.models.join(', '))
    logger.info('原始 manual_models: ' + instanceConfigWithDuplicates.manual_models.replace(/\n/g, ', '))
    logger.info('合并去重后的 models 数组:')
    
    if (preparedConfig2.models && preparedConfig2.models.length > 0) {
      preparedConfig2.models.forEach((model, index) => {
        logger.info(`  ${index + 1}. ${model}`)
      })
      
      // 检查是否正确去重
      const expectedModels = ['gemini-3-flash-preview', 'existing-model', 'gemini-3-pro-preview']
      const hasAllExpected = expectedModels.every(model => preparedConfig2.models.includes(model))
      const noDuplicates = preparedConfig2.models.length === new Set(preparedConfig2.models).size
      
      if (hasAllExpected && noDuplicates) {
        logger.info('✅ 去重功能正常工作')
      } else {
        logger.error('❌ 去重功能有问题')
        return false
      }
    } else {
      logger.error('❌ 去重测试失败，models 数组为空')
      return false
    }
    
    // 3. 测试空 manual_models
    logger.info('\n3. 测试空 manual_models...')
    
    const instanceConfigEmpty = {
      name: 'TestVertex3',
      enable: true,
      region: 'us-central1',
      service_account_json: '{"test": "config"}',
      manual_models: '',
      models: ['existing-model']
    }
    
    const preparedConfig3 = await prepareInstanceConfig('vertex', instanceConfigEmpty, fullConfig)
    
    if (preparedConfig3.models && preparedConfig3.models.length === 1 && preparedConfig3.models[0] === 'existing-model') {
      logger.info('✅ 空 manual_models 处理正确，保留原有 models')
    } else {
      logger.error('❌ 空 manual_models 处理有问题')
      return false
    }
    
    // 4. 测试非 Vertex 适配器
    logger.info('\n4. 测试非 Vertex 适配器...')
    
    const openaiConfig = {
      name: 'TestOpenAI',
      enable: true,
      api_key: 'test',
      base_url: 'test',
      manual_models: 'should-not-process',
      models: ['original-model']
    }
    
    const preparedOpenAI = await prepareInstanceConfig('openai', openaiConfig, fullConfig)
    
    if (preparedOpenAI.models && preparedOpenAI.models.length === 1 && preparedOpenAI.models[0] === 'original-model') {
      logger.info('✅ 非 Vertex 适配器不处理 manual_models')
    } else {
      logger.error('❌ 非 Vertex 适配器错误处理了 manual_models')
      return false
    }
    
    logger.info('\n=== 所有测试通过 ===')
    return true
    
  } catch (error) {
    logger.error('测试过程中发生错误:', error)
    return false
  }
}

// 运行测试
testVertexModelsMergeSimple()
  .then(success => {
    if (success) {
      logger.info('🎉 Vertex 手动模型合并逻辑测试通过')
      process.exit(0)
    } else {
      logger.error('❌ Vertex 手动模型合并逻辑测试失败')
      process.exit(1)
    }
  })
  .catch(error => {
    logger.error('测试执行失败:', error)
    process.exit(1)
  })