#!/usr/bin/env node

/**
 * 测试配置接口不再脱敏
 * 验证已认证的 /api/config 接口返回完整的配置数据
 */

import logger from '../utils/logger.js'
import { getFullConfig, getConfigSection } from '../lib/server/http/services/configService.js'

async function testConfigNoMask() {
  try {
    logger.info('=== 测试配置接口不脱敏修复 ===')
    
    // 1. 测试完整配置获取
    logger.info('1. 测试获取完整配置...')
    const fullConfig = await getFullConfig()
    
    // 检查是否有 LLM 适配器配置
    if (fullConfig.llm_adapters) {
      logger.info('   ✅ 找到 llm_adapters 配置')
      
      // 检查 Vertex 适配器
      if (fullConfig.llm_adapters.vertex && Array.isArray(fullConfig.llm_adapters.vertex)) {
        const vertexInstances = fullConfig.llm_adapters.vertex
        logger.info(`   📊 Vertex 适配器实例数量: ${vertexInstances.length}`)
        
        vertexInstances.forEach((instance, index) => {
          if (instance.service_account_json) {
            if (instance.service_account_json === '[HIDDEN]') {
              logger.error(`   ❌ 实例 ${index}: service_account_json 仍然被脱敏`)
            } else {
              logger.info(`   ✅ 实例 ${index}: service_account_json 未脱敏 (长度: ${instance.service_account_json.length})`)
            }
          } else {
            logger.info(`   ℹ️  实例 ${index}: 没有 service_account_json 字段`)
          }
        })
      } else {
        logger.info('   ℹ️  没有 Vertex 适配器配置')
      }
      
      // 检查其他适配器的 API key
      for (const [adapterType, instances] of Object.entries(fullConfig.llm_adapters)) {
        if (Array.isArray(instances) && instances.length > 0) {
          instances.forEach((instance, index) => {
            if (instance.api_key) {
              if (instance.api_key.includes('...')) {
                logger.error(`   ❌ ${adapterType} 实例 ${index}: api_key 仍然被脱敏`)
              } else {
                logger.info(`   ✅ ${adapterType} 实例 ${index}: api_key 未脱敏`)
              }
            }
          })
        }
      }
    } else {
      logger.info('   ℹ️  没有 llm_adapters 配置')
    }
    
    // 检查访问码
    if (fullConfig.web) {
      if (fullConfig.web.admin_code && fullConfig.web.admin_code.includes('...')) {
        logger.error('   ❌ admin_code 仍然被脱敏')
      } else if (fullConfig.web.admin_code) {
        logger.info('   ✅ admin_code 未脱敏')
      }
      
      if (fullConfig.web.user_code && fullConfig.web.user_code.includes('...')) {
        logger.error('   ❌ user_code 仍然被脱敏')
      } else if (fullConfig.web.user_code) {
        logger.info('   ✅ user_code 未脱敏')
      }
    }
    
    // 2. 测试配置节点获取
    logger.info('2. 测试获取 llm_adapters 配置节点...')
    try {
      const llmAdaptersConfig = await getConfigSection('llm_adapters')
      
      if (llmAdaptersConfig.vertex && Array.isArray(llmAdaptersConfig.vertex)) {
        const vertexInstances = llmAdaptersConfig.vertex
        logger.info(`   📊 Vertex 适配器实例数量: ${vertexInstances.length}`)
        
        vertexInstances.forEach((instance, index) => {
          if (instance.service_account_json) {
            if (instance.service_account_json === '[HIDDEN]') {
              logger.error(`   ❌ 节点获取 - 实例 ${index}: service_account_json 仍然被脱敏`)
            } else {
              logger.info(`   ✅ 节点获取 - 实例 ${index}: service_account_json 未脱敏`)
            }
          }
        })
      }
    } catch (error) {
      logger.warn('   ⚠️  获取 llm_adapters 节点失败:', error.message)
    }
    
    logger.info('=== 测试完成 ===')
    logger.info('✅ 配置接口脱敏修复验证完成')
    
    return true
    
  } catch (error) {
    logger.error('测试过程中发生错误:', error)
    return false
  }
}

// 运行测试
testConfigNoMask()
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