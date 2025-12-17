#!/usr/bin/env node

/**
 * 测试脱敏字段过滤功能
 */

import fetch from 'node-fetch'
import logger from '../utils/logger.js'

const BASE_URL = 'http://127.0.0.1:3000'
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
 * 测试脱敏字段过滤
 */
async function testMaskedFieldsFiltering() {
  logger.info('=== 测试脱敏字段过滤功能 ===')
  
  try {
    // 1. 获取当前配置（包含脱敏字段）
    const { response: getResponse, data: getData } = await makeRequest(`${BASE_URL}/api/config`)
    
    if (!getResponse.ok || getData.code !== 0) {
      throw new Error(`获取配置失败: ${getData.message}`)
    }
    
    const currentConfig = getData.data
    logger.info('✓ 获取当前配置成功')
    logger.info(`  - 管理员访问码: ${currentConfig.web?.admin_code || '未设置'}`)
    logger.info(`  - 用户访问码: ${currentConfig.web?.user_code || '未设置'}`)
    
    // 2. 尝试使用包含脱敏字段的配置进行全量更新
    const updateData = {
      ...currentConfig,
      web: {
        ...currentConfig.web,
        title: '测试脱敏字段过滤 - ' + new Date().toISOString()
      }
    }
    
    logger.info('  - 尝试更新配置（包含脱敏字段）...')
    logger.info(`  - 更新数据中的管理员访问码: ${updateData.web?.admin_code || '未设置'}`)
    
    const { response: updateResponse, data: updateData2 } = await makeRequest(`${BASE_URL}/api/config`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    })
    
    if (!updateResponse.ok || updateData2.code !== 0) {
      throw new Error(`配置更新失败: ${updateData2.message}`)
    }
    
    logger.info('✓ 配置更新成功')
    logger.info(`  - 更新的字段: ${updateData2.data.updated.join(', ')}`)
    
    // 3. 验证管理员访问码没有被脱敏值覆盖
    const { response: verifyResponse, data: verifyData } = await makeRequest(`${BASE_URL}/api/config`)
    
    if (!verifyResponse.ok || verifyData.code !== 0) {
      throw new Error(`验证配置失败: ${verifyData.message}`)
    }
    
    const verifiedConfig = verifyData.data
    
    // 检查标题是否更新成功
    const titleUpdated = verifiedConfig.web?.title === updateData.web.title
    
    // 检查管理员访问码是否仍然是脱敏格式（说明没有被覆盖）
    const adminCodeStillMasked = verifiedConfig.web?.admin_code && verifiedConfig.web.admin_code.includes('...')
    
    logger.info('  - 验证结果:')
    logger.info(`    标题更新成功: ${titleUpdated}`)
    logger.info(`    管理员访问码仍为脱敏格式: ${adminCodeStillMasked}`)
    logger.info(`    验证后的管理员访问码: ${verifiedConfig.web?.admin_code || '未设置'}`)
    
    if (titleUpdated && adminCodeStillMasked) {
      logger.info('✓ 脱敏字段过滤功能正常工作')
      return true
    } else {
      logger.error('✗ 脱敏字段过滤功能异常')
      return false
    }
    
  } catch (error) {
    logger.error('✗ 脱敏字段过滤测试失败:', error.message)
    return false
  }
}

/**
 * 测试配置节点脱敏字段过滤
 */
async function testSectionMaskedFieldsFiltering() {
  logger.info('=== 测试配置节点脱敏字段过滤功能 ===')
  
  try {
    // 1. 获取 web 配置节点
    const { response: getResponse, data: getData } = await makeRequest(`${BASE_URL}/api/config/web`)
    
    if (!getResponse.ok || getData.code !== 0) {
      throw new Error(`获取 web 配置失败: ${getData.message}`)
    }
    
    const currentWebConfig = getData.data
    logger.info('✓ 获取 web 配置成功')
    logger.info(`  - 管理员访问码: ${currentWebConfig.admin_code || '未设置'}`)
    
    // 2. 尝试更新 web 配置（包含脱敏的访问码）
    const updateData = {
      ...currentWebConfig,
      title: '测试节点脱敏过滤 - ' + new Date().toISOString(),
      beian: '测试备案-' + Date.now()
    }
    
    logger.info('  - 尝试更新 web 配置（包含脱敏字段）...')
    logger.info(`  - 更新数据中的管理员访问码: ${updateData.admin_code || '未设置'}`)
    
    const { response: updateResponse, data: updateData2 } = await makeRequest(`${BASE_URL}/api/config/web`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    })
    
    if (!updateResponse.ok || updateData2.code !== 0) {
      throw new Error(`web 配置更新失败: ${updateData2.message}`)
    }
    
    logger.info('✓ web 配置更新成功')
    
    // 3. 验证更新结果
    const { response: verifyResponse, data: verifyData } = await makeRequest(`${BASE_URL}/api/config/web`)
    
    if (!verifyResponse.ok || verifyData.code !== 0) {
      throw new Error(`验证 web 配置失败: ${verifyData.message}`)
    }
    
    const verifiedWebConfig = verifyData.data
    
    const titleUpdated = verifiedWebConfig.title === updateData.title
    const beianUpdated = verifiedWebConfig.beian === updateData.beian
    const adminCodeStillMasked = verifiedWebConfig.admin_code && verifiedWebConfig.admin_code.includes('...')
    
    logger.info('  - 验证结果:')
    logger.info(`    标题更新成功: ${titleUpdated}`)
    logger.info(`    备案更新成功: ${beianUpdated}`)
    logger.info(`    管理员访问码仍为脱敏格式: ${adminCodeStillMasked}`)
    
    if (titleUpdated && beianUpdated && adminCodeStillMasked) {
      logger.info('✓ 配置节点脱敏字段过滤功能正常工作')
      return true
    } else {
      logger.error('✗ 配置节点脱敏字段过滤功能异常')
      return false
    }
    
  } catch (error) {
    logger.error('✗ 配置节点脱敏字段过滤测试失败:', error.message)
    return false
  }
}

/**
 * 主测试函数
 */
async function main() {
  logger.info('开始测试脱敏字段过滤功能...')
  
  const tests = [
    testMaskedFieldsFiltering,
    testSectionMaskedFieldsFiltering
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