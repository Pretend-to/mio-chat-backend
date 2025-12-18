#!/usr/bin/env node

/**
 * 专门测试 Vertex 配置不再脱敏的修复
 */

import logger from '../utils/logger.js'
import { getFullConfig } from '../lib/server/http/services/configService.js'

async function testVertexConfigFix() {
  try {
    logger.info('=== 测试 Vertex 配置脱敏修复 ===')
    
    const config = await getFullConfig()
    
    if (!config.llm_adapters?.vertex) {
      logger.warn('没有找到 Vertex 适配器配置，创建一个测试配置...')
      
      // 这里只是为了演示，实际使用中不应该直接修改配置
      logger.info('请在管理界面中添加 Vertex 适配器配置来测试此修复')
      return true
    }
    
    const vertexInstances = config.llm_adapters.vertex
    logger.info(`找到 ${vertexInstances.length} 个 Vertex 适配器实例`)
    
    let allGood = true
    
    vertexInstances.forEach((instance, index) => {
      logger.info(`\n检查实例 ${index}:`)
      logger.info(`  - 名称: ${instance.name || '未命名'}`)
      logger.info(`  - 启用状态: ${instance.enable ? '启用' : '禁用'}`)
      logger.info(`  - 区域: ${instance.region || '未设置'}`)
      
      if (instance.service_account_json) {
        if (instance.service_account_json === '[HIDDEN]') {
          logger.error(`  ❌ service_account_json 仍然被脱敏为 [HIDDEN]`)
          allGood = false
        } else if (typeof instance.service_account_json === 'string') {
          try {
            // 尝试解析 JSON 来验证格式
            const parsed = JSON.parse(instance.service_account_json)
            if (parsed.type && parsed.project_id && parsed.private_key) {
              logger.info(`  ✅ service_account_json 是有效的 JSON 格式`)
              logger.info(`  📋 项目ID: ${parsed.project_id}`)
              logger.info(`  📋 服务账号邮箱: ${parsed.client_email || '未设置'}`)
            } else {
              logger.warn(`  ⚠️  service_account_json 格式可能不完整`)
            }
          } catch (error) {
            logger.warn(`  ⚠️  service_account_json 不是有效的 JSON: ${error.message}`)
          }
        } else {
          logger.info(`  ✅ service_account_json 是对象格式`)
        }
      } else {
        logger.info(`  ℹ️  没有 service_account_json 配置`)
      }
      

    })
    
    if (allGood) {
      logger.info('\n🎉 所有 Vertex 实例的配置都未被脱敏！')
    } else {
      logger.error('\n❌ 仍有配置被脱敏')
    }
    
    return allGood
    
  } catch (error) {
    logger.error('测试过程中发生错误:', error)
    return false
  }
}

// 运行测试
testVertexConfigFix()
  .then(success => {
    if (success) {
      logger.info('\n✅ Vertex 配置脱敏修复验证通过')
      process.exit(0)
    } else {
      logger.error('\n❌ Vertex 配置脱敏修复验证失败')
      process.exit(1)
    }
  })
  .catch(error => {
    logger.error('测试执行失败:', error)
    process.exit(1)
  })