#!/usr/bin/env node

/**
 * 端到端测试 Vertex AI 适配器的手动模型配置功能
 * 通过 API 接口测试完整的配置流程
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fetch from 'node-fetch'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// 设置环境变量
process.env.NODE_ENV = 'development'
process.chdir(rootDir)

// 导入模块
import logger from '../utils/logger.js'

const BASE_URL = 'http://127.0.0.1:3000'

/**
 * 获取管理员访问码
 */
async function getAdminCode() {
  // 使用已知的管理员访问码
  return 'gb6u1soOivcvg62rz1iuYg=='
}

/**
 * 发送 API 请求
 */
async function apiRequest(method, path, data = null, adminCode = null) {
  const url = `${BASE_URL}${path}`
  const headers = {
    'Content-Type': 'application/json',
  }
  
  if (adminCode) {
    headers['x-admin-code'] = adminCode
  }

  const options = {
    method,
    headers,
  }

  if (data) {
    options.body = JSON.stringify(data)
  }

  const response = await fetch(url, options)
  
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HTTP ${response.status}: ${text}`)
  }
  
  const result = await response.json()
  return result
}

/**
 * 测试适配器类型接口
 */
async function testAdapterTypes(adminCode) {
  console.log('🔍 测试适配器类型接口\n')
  
  try {
    const result = await apiRequest('GET', '/api/config/adapter-types', null, adminCode)
    
    if (result.code !== 0) {
      throw new Error(`API 返回错误: ${result.message}`)
    }
    
    const vertexAdapter = result.data.adapters.find(adapter => adapter.type === 'vertex')
    
    if (!vertexAdapter) {
      throw new Error('未找到 Vertex AI 适配器')
    }
    
    console.log('📊 Vertex AI 适配器信息:')
    console.log(`   类型: ${vertexAdapter.type}`)
    console.log(`   名称: ${vertexAdapter.name}`)
    console.log(`   描述: ${vertexAdapter.description}`)
    console.log(`   支持功能: [${vertexAdapter.supportedFeatures.join(', ')}]`)
    
    // 检查 manual_models 字段
    const manualModelsField = vertexAdapter.initialConfigSchema?.manual_models
    if (!manualModelsField) {
      throw new Error('Vertex AI 适配器缺少 manual_models 字段')
    }
    
    console.log(`   ✅ manual_models 字段配置正确:`)
    console.log(`      类型: ${manualModelsField.type}`)
    console.log(`      标签: ${manualModelsField.label}`)
    console.log(`      描述: ${manualModelsField.description}`)
    console.log(`      必须: ${manualModelsField.required}`)
    
    return true
    
  } catch (error) {
    console.log(`   ❌ 失败: ${error.message}`)
    return false
  }
}

/**
 * 测试添加 Vertex AI 实例（包含手动模型）
 */
async function testAddVertexInstance(adminCode) {
  console.log('➕ 测试添加 Vertex AI 实例（包含手动模型）\n')
  
  try {
    // 准备测试配置
    const instanceConfig = {
      enable: true,
      name: 'Vertex-Test-Manual-Models',
      region: 'us-central1',
      service_account_json: JSON.stringify({
        type: 'service_account',
        project_id: 'test-project',
        private_key_id: 'test-key-id',
        private_key: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----\n',
        client_email: 'test@test-project.iam.gserviceaccount.com',
        client_id: 'test-client-id',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token'
      }),
      manual_models: 'gemini-1.5-pro-test\ngemini-1.5-flash-test\ngemini-1.0-pro-test'
    }
    
    console.log('📋 添加实例配置:')
    console.log(`   名称: ${instanceConfig.name}`)
    console.log(`   地区: ${instanceConfig.region}`)
    console.log(`   手动模型: ${instanceConfig.manual_models.split('\n').join(', ')}`)
    
    const result = await apiRequest('POST', '/api/config/llm/vertex', instanceConfig, adminCode)
    
    if (result.code !== 0) {
      throw new Error(`API 返回错误: ${result.message}`)
    }
    
    console.log(`   ✅ 实例添加成功`)
    console.log(`   实例索引: ${result.data.instanceIndex}`)
    
    // 验证实例配置
    if (result.data.instance) {
      const instance = result.data.instance
      console.log(`   验证实例配置:`)
      console.log(`     启用: ${instance.enable}`)
      console.log(`     名称: ${instance.name}`)
      console.log(`     地区: ${instance.region}`)
      console.log(`     手动模型: ${instance.manual_models}`)
      
      if (instance.manual_models === instanceConfig.manual_models) {
        console.log(`   ✅ 手动模型配置正确保存`)
      } else {
        throw new Error('手动模型配置保存不正确')
      }
    }
    
    return result.data.instanceIndex
    
  } catch (error) {
    console.log(`   ❌ 失败: ${error.message}`)
    return null
  }
}

/**
 * 测试更新 Vertex AI 实例的手动模型
 */
async function testUpdateVertexInstance(adminCode, instanceIndex) {
  console.log('✏️ 测试更新 Vertex AI 实例的手动模型\n')
  
  try {
    // 准备更新配置
    const updateConfig = {
      manual_models: 'gemini-2.0-pro-test\ngemini-2.0-flash-test\nclaude-3-sonnet-test'
    }
    
    console.log('📋 更新配置:')
    console.log(`   实例索引: ${instanceIndex}`)
    console.log(`   新手动模型: ${updateConfig.manual_models.split('\n').join(', ')}`)
    
    const result = await apiRequest('PUT', `/api/config/llm/vertex/${instanceIndex}`, updateConfig, adminCode)
    
    if (result.code !== 0) {
      throw new Error(`API 返回错误: ${result.message}`)
    }
    
    console.log(`   ✅ 实例更新成功`)
    
    // 验证更新结果
    if (result.data.instance) {
      const instance = result.data.instance
      console.log(`   验证更新结果:`)
      console.log(`     手动模型: ${instance.manual_models}`)
      
      if (instance.manual_models === updateConfig.manual_models) {
        console.log(`   ✅ 手动模型更新正确`)
      } else {
        throw new Error('手动模型更新不正确')
      }
    }
    
    return true
    
  } catch (error) {
    console.log(`   ❌ 失败: ${error.message}`)
    return false
  }
}

/**
 * 测试删除 Vertex AI 实例
 */
async function testDeleteVertexInstance(adminCode, instanceIndex) {
  console.log('🗑️ 测试删除 Vertex AI 实例\n')
  
  try {
    console.log(`📋 删除实例索引: ${instanceIndex}`)
    
    const result = await apiRequest('DELETE', `/api/config/llm/vertex/${instanceIndex}`, null, adminCode)
    
    if (result.code !== 0) {
      throw new Error(`API 返回错误: ${result.message}`)
    }
    
    console.log(`   ✅ 实例删除成功`)
    
    return true
    
  } catch (error) {
    console.log(`   ❌ 失败: ${error.message}`)
    return false
  }
}

/**
 * 主测试函数
 */
async function main() {
  try {
    console.log('🚀 Vertex AI 手动模型配置端到端测试\n')
    console.log('=' .repeat(60) + '\n')
    
    // 获取管理员访问码
    const adminCode = await getAdminCode()
    console.log(`🔑 使用管理员访问码: ${adminCode.substring(0, 4)}...${adminCode.substring(adminCode.length - 4)}\n`)
    
    let passedTests = 0
    let totalTests = 4
    
    // 测试适配器类型接口
    if (await testAdapterTypes(adminCode)) {
      passedTests++
    }
    console.log()
    
    // 测试添加实例
    const instanceIndex = await testAddVertexInstance(adminCode)
    if (instanceIndex !== null) {
      passedTests++
    }
    console.log()
    
    // 如果添加成功，测试更新和删除
    if (instanceIndex !== null) {
      // 测试更新实例
      if (await testUpdateVertexInstance(adminCode, instanceIndex)) {
        passedTests++
      }
      console.log()
      
      // 测试删除实例
      if (await testDeleteVertexInstance(adminCode, instanceIndex)) {
        passedTests++
      }
      console.log()
    } else {
      console.log('⏭️ 跳过更新和删除测试（添加实例失败）\n')
      totalTests = 2 // 只测试前两个
    }
    
    // 总结
    console.log('=' .repeat(60))
    console.log('📊 测试总结:')
    console.log(`   通过测试: ${passedTests}/${totalTests}`)
    console.log(`   通过率: ${Math.round(passedTests / totalTests * 100)}%`)
    
    if (passedTests === totalTests) {
      console.log('\n🎉 所有测试通过！Vertex AI 手动模型配置功能端到端测试成功。')
      process.exit(0)
    } else {
      console.log('\n❌ 部分测试失败，请检查实现。')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error)
    process.exit(1)
  }
}

// 运行测试
main()