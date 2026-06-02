#!/usr/bin/env node

/**
 * OneBot API 快速测试脚本
 * 快速验证文档中提到的接口是否可用
 */

import logger from '../../utils/logger.js'

// 简单的测试用例
const tests = [
  {
    name: '获取完整配置',
    method: 'GET',
    path: '/api/config',
    expectedFields: ['onebot', 'web', 'server', 'llm_adapters']
  },
  {
    name: '获取 OneBot 配置节点',
    method: 'GET', 
    path: '/api/config/onebot',
    expectedFields: ['enable'] // 只检查必需字段，其他字段可选
  },
  {
    name: '获取 OneBot 插件选项',
    method: 'GET',
    path: '/api/onebot/plugins',
    expectedFields: ['options']
  }
]

async function quickTest() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3080'
  const adminCode = process.env.ADMIN_CODE || 'test_admin_code'
  
  logger.info('🚀 OneBot API 快速测试')
  logger.info(`目标地址: ${baseUrl}`)
  logger.info(`使用访问码: ${adminCode.substring(0, 4)}...`)
  
  let passed = 0
  let failed = 0
  
  for (const test of tests) {
    try {
      logger.info(`\n🧪 测试: ${test.name}`)
      
      const response = await fetch(`${baseUrl}${test.path}`, {
        method: test.method,
        headers: {
          'X-Admin-Code': adminCode,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        logger.error(`❌ HTTP ${response.status}: ${response.statusText}`)
        failed++
        continue
      }
      
      const result = await response.json()
      
      if (!result.data) {
        logger.error('❌ 响应中缺少 data 字段')
        failed++
        continue
      }
      
      // 检查期望的字段
      const missingFields = test.expectedFields.filter(field => !(field in result.data))
      if (missingFields.length > 0) {
        logger.error(`❌ 缺少字段: ${missingFields.join(', ')}`)
        failed++
        continue
      }
      
      logger.info('✅ 测试通过')
      passed++
      
    } catch (error) {
      logger.error(`❌ 请求失败: ${error.message}`)
      failed++
    }
  }
  
  logger.info(`\n📊 测试结果: ${passed}/${tests.length} 通过`)
  
  if (failed > 0) {
    logger.error('部分测试失败，请检查服务是否正常运行')
    process.exit(1)
  } else {
    logger.info('✅ 所有测试通过')
    process.exit(0)
  }
}

// 运行测试
quickTest().catch(error => {
  logger.error('测试执行失败:', error)
  process.exit(1)
})