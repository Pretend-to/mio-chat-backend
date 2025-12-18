#!/usr/bin/env node

/**
 * 测试适配器类型接口
 */

import fetch from 'node-fetch'
import logger from '../utils/logger.js'

const BASE_URL = 'http://127.0.0.1:3001'
const ADMIN_CODE = 'gb6u1soOivcvg62rz1iuYg=='

/**
 * 发送 HTTP 请求
 */
async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'x-admin-code': ADMIN_CODE,
      ...options.headers
    },
    ...options
  })

  const data = await response.json()
  return { response, data }
}

/**
 * 测试获取适配器类型
 */
async function testGetAdapterTypes() {
  logger.info('=== 测试获取适配器类型 ===')
  
  try {
    const { response, data } = await makeRequest(`${BASE_URL}/api/config/adapter-types`)
    
    if (response.ok && data.code === 0) {
      logger.info('✓ 获取适配器类型成功')
      logger.info(`  - 适配器数量: ${data.data.count}`)
      logger.info(`  - 适配器类型: ${data.data.types.join(', ')}`)
      
      // 显示详细的适配器信息
      if (data.data.adapters && data.data.adapters.length > 0) {
        logger.info('  - 适配器详情:')
        data.data.adapters.forEach(adapter => {
          logger.info(`    * ${adapter.type} (${adapter.name})`)
          logger.info(`      描述: ${adapter.description}`)
          if (adapter.supportedFeatures && adapter.supportedFeatures.length > 0) {
            logger.info(`      支持功能: ${adapter.supportedFeatures.join(', ')}`)
          }
          if (adapter.initialConfigSchema && Object.keys(adapter.initialConfigSchema).length > 0) {
            logger.info(`      配置字段: ${Object.keys(adapter.initialConfigSchema).join(', ')}`)
            // 显示一些关键字段的详细信息
            const keyFields = ['api_key', 'base_url', 'region', 'service_account_json', 'manual_models']
            keyFields.forEach(fieldName => {
              const field = adapter.initialConfigSchema[fieldName]
              if (field) {
                logger.info(`        - ${fieldName}: ${field.description} (${field.required ? '必须' : '可选'})`)
              }
            })
          }
        })
      }
      
      return true
    } else {
      logger.error(`✗ 获取适配器类型失败: ${data.message}`)
      return false
    }
  } catch (error) {
    logger.error('✗ 获取适配器类型请求失败:', error.message)
    return false
  }
}

/**
 * 测试权限验证
 */
async function testAuthRequired() {
  logger.info('=== 测试权限验证 ===')
  
  try {
    const { response, data } = await makeRequest(`${BASE_URL}/api/config/adapter-types`, {
      headers: {
        'x-admin-code': 'wrong-code'
      }
    })
    
    if (response.status === 401 || response.status === 403) {
      logger.info('✓ 权限验证正常工作')
      return true
    } else {
      logger.error('✗ 权限验证失败，应该拒绝无效的管理员代码')
      return false
    }
  } catch (error) {
    logger.error('✗ 权限验证测试失败:', error.message)
    return false
  }
}

/**
 * 主测试函数
 */
async function main() {
  logger.info('开始测试适配器类型接口...')
  
  const tests = [
    testGetAdapterTypes,
    testAuthRequired
  ]
  
  let passed = 0
  let total = tests.length
  
  for (const test of tests) {
    try {
      const result = await test()
      if (result) {
        passed++
      }
    } catch (error) {
      logger.error('测试执行失败:', error)
    }
    logger.info('') // 空行分隔
  }
  
  logger.info(`=== 测试完成 ===`)
  logger.info(`通过: ${passed}/${total}`)
  
  if (passed === total) {
    logger.info('🎉 所有测试通过!')
    process.exit(0)
  } else {
    logger.error('❌ 部分测试失败')
    process.exit(1)
  }
}

// 运行测试
main().catch(error => {
  logger.error('测试运行失败:', error)
  process.exit(1)
})