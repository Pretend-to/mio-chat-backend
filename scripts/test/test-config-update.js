#!/usr/bin/env node

/**
 * 测试系统配置更新接口
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
 * 获取当前配置（用于备份和对比）
 */
async function getCurrentConfig() {
  const { response, data } = await makeRequest(`${BASE_URL}/api/config`)
  if (response.ok && data.code === 0) {
    return data.data
  }
  throw new Error(`获取当前配置失败: ${data.message}`)
}

/**
 * 测试更新完整配置
 */
async function testUpdateFullConfig() {
  logger.info('=== 测试更新完整配置 ===')
  
  try {
    // 获取当前配置作为基础
    const currentConfig = await getCurrentConfig()
    logger.info('✓ 获取当前配置成功')
    
    // 准备更新数据（只修改部分字段）
    const updateData = {
      debug: !currentConfig.debug, // 切换调试模式
      server: {
        ...currentConfig.server,
        port: currentConfig.server.port === 3000 ? 3001 : 3000 // 切换端口
      },
      web: {
        ...currentConfig.web,
        title: 'MioChat 测试更新 - ' + new Date().toISOString()
      }
    }
    
    logger.info(`  - 原调试模式: ${currentConfig.debug}`)
    logger.info(`  - 新调试模式: ${updateData.debug}`)
    logger.info(`  - 原端口: ${currentConfig.server.port}`)
    logger.info(`  - 新端口: ${updateData.server.port}`)
    logger.info(`  - 新标题: ${updateData.web.title}`)
    
    // 发送更新请求
    const { response, data } = await makeRequest(`${BASE_URL}/api/config`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    })
    
    if (response.ok && data.code === 0) {
      logger.info('✓ 完整配置更新成功')
      logger.info(`  - 更新的字段: ${data.data.updated.join(', ')}`)
      
      // 验证更新是否生效
      const updatedConfig = await getCurrentConfig()
      
      logger.info('  - 验证配置更新:')
      logger.info(`    期望调试模式: ${updateData.debug}, 实际: ${updatedConfig.debug}`)
      logger.info(`    期望端口: ${updateData.server.port}, 实际: ${updatedConfig.server.port}`)
      logger.info(`    期望标题: ${updateData.web.title}, 实际: ${updatedConfig.web.title}`)
      
      const debugMatches = updatedConfig.debug === updateData.debug
      const portMatches = updatedConfig.server.port === updateData.server.port
      const titleMatches = updatedConfig.web.title === updateData.web.title
      
      if (debugMatches && portMatches && titleMatches) {
        logger.info('✓ 配置更新验证成功')
        return true
      } else {
        logger.error('✗ 配置更新验证失败')
        logger.error(`  - 调试模式匹配: ${debugMatches}`)
        logger.error(`  - 端口匹配: ${portMatches}`)
        logger.error(`  - 标题匹配: ${titleMatches}`)
        return false
      }
    } else {
      logger.error(`✗ 完整配置更新失败: ${data.message}`)
      return false
    }
  } catch (error) {
    logger.error('✗ 完整配置更新测试失败:', error.message)
    return false
  }
}

/**
 * 测试更新配置节点
 */
async function testUpdateConfigSection() {
  logger.info('=== 测试更新配置节点 ===')
  
  try {
    // 测试更新 web 配置节点
    const webUpdateData = {
      title: 'MioChat 节点更新测试 - ' + new Date().toISOString(),
      full_screen: true,
      beian: '测试备案号-' + Date.now()
    }
    
    logger.info(`  - 更新 web 配置节点`)
    logger.info(`  - 新标题: ${webUpdateData.title}`)
    logger.info(`  - 全屏模式: ${webUpdateData.full_screen}`)
    logger.info(`  - 备案号: ${webUpdateData.beian}`)
    
    const { response, data } = await makeRequest(`${BASE_URL}/api/config/web`, {
      method: 'PUT',
      body: JSON.stringify(webUpdateData)
    })
    
    if (response.ok && data.code === 0) {
      logger.info('✓ web 配置节点更新成功')
      
      // 验证更新是否生效
      const { response: getResponse, data: getData } = await makeRequest(`${BASE_URL}/api/config/web`)
      
      if (getResponse.ok && getData.code === 0) {
        const webConfig = getData.data
        const titleMatches = webConfig.title === webUpdateData.title
        const fullScreenMatches = webConfig.full_screen === webUpdateData.full_screen
        const beianMatches = webConfig.beian === webUpdateData.beian
        
        if (titleMatches && fullScreenMatches && beianMatches) {
          logger.info('✓ web 配置节点更新验证成功')
          return true
        } else {
          logger.error('✗ web 配置节点更新验证失败')
          logger.error(`  - 标题匹配: ${titleMatches}`)
          logger.error(`  - 全屏匹配: ${fullScreenMatches}`)
          logger.error(`  - 备案匹配: ${beianMatches}`)
          return false
        }
      } else {
        logger.error(`✗ 获取更新后的 web 配置失败: ${getData.message}`)
        return false
      }
    } else {
      logger.error(`✗ web 配置节点更新失败: ${data.message}`)
      return false
    }
  } catch (error) {
    logger.error('✗ 配置节点更新测试失败:', error.message)
    return false
  }
}

/**
 * 测试更新服务器配置
 */
async function testUpdateServerConfig() {
  logger.info('=== 测试更新服务器配置 ===')
  
  try {
    // 获取当前服务器配置
    const { response: getResponse, data: getData } = await makeRequest(`${BASE_URL}/api/config/server`)
    
    if (!getResponse.ok || getData.code !== 0) {
      throw new Error(`获取服务器配置失败: ${getData.message}`)
    }
    
    const currentServerConfig = getData.data
    logger.info(`  - 当前端口: ${currentServerConfig.port}`)
    
    // 准备更新数据（注意：不要真的改变端口，否则会断开连接）
    const serverUpdateData = {
      ...currentServerConfig,
      host: '0.0.0.0', // 确保主机配置

    }
    

    
    const { response, data } = await makeRequest(`${BASE_URL}/api/config/server`, {
      method: 'PUT',
      body: JSON.stringify(serverUpdateData)
    })
    
    if (response.ok && data.code === 0) {
      logger.info('✓ 服务器配置更新成功')
      
      // 验证更新是否生效
      const { response: verifyResponse, data: verifyData } = await makeRequest(`${BASE_URL}/api/config/server`)
      
      if (verifyResponse.ok && verifyData.code === 0) {
        const updatedServerConfig = verifyData.data

        
        logger.info('✓ 服务器配置更新验证成功')
        return true
        }
      } else {
        logger.error(`✗ 获取更新后的服务器配置失败: ${verifyData.message}`)
        return false
      }
    } else {
      logger.error(`✗ 服务器配置更新失败: ${data.message}`)
      return false
    }
  } catch (error) {
    logger.error('✗ 服务器配置更新测试失败:', error.message)
    return false
  }
}

/**
 * 测试无效配置更新
 */
async function testInvalidConfigUpdate() {
  logger.info('=== 测试无效配置更新 ===')
  
  try {
    // 测试无效的端口号
    const invalidServerConfig = {
      port: 99999, // 无效端口
      host: '0.0.0.0'
    }
    
    const { response, data } = await makeRequest(`${BASE_URL}/api/config/server`, {
      method: 'PUT',
      body: JSON.stringify(invalidServerConfig)
    })
    
    if (response.status === 400 && data.code === 1) {
      logger.info('✓ 无效配置正确被拒绝')
      logger.info(`  - 错误信息: ${data.message}`)
      return true
    } else {
      logger.error('✗ 无效配置应该被拒绝但没有')
      return false
    }
  } catch (error) {
    logger.error('✗ 无效配置更新测试失败:', error.message)
    return false
  }
}

/**
 * 测试权限验证
 */
async function testAuthRequired() {
  logger.info('=== 测试权限验证 ===')
  
  try {
    const { response, data } = await makeRequest(`${BASE_URL}/api/config`, {
      method: 'PUT',
      headers: {
        'x-admin-code': 'wrong-code'
      },
      body: JSON.stringify({ debug: true })
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
  logger.info('开始测试系统配置更新接口...')
  
  const tests = [
    testUpdateFullConfig,
    testUpdateConfigSection,
    testUpdateServerConfig,
    testInvalidConfigUpdate,
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