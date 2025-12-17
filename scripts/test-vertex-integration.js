#!/usr/bin/env node

/**
 * 测试 Vertex AI 适配器的完整集成功能
 * 包括手动模型配置和模型合并逻辑
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// 设置环境变量
process.env.NODE_ENV = 'development'
process.chdir(rootDir)

// 导入模块
import VertexAdapter from '../lib/chat/llm/adapters/vertex.js'
import logger from '../utils/logger.js'

/**
 * 模拟 Vertex 类，用于测试
 */
class MockVertex {
  constructor(config) {
    this.config = config
    this.mockModels = config.mockModels || []
  }

  async models() {
    // 模拟返回一些自动获取的模型
    return this.mockModels
  }
}

/**
 * 创建测试用的 Vertex 适配器
 */
class TestVertexAdapter extends VertexAdapter {
  constructor(config) {
    // 调用父类构造函数
    super({ ...config, geminiConfig: {} })
    
    // 替换 vertex 实例为模拟实例
    this.vertex = new MockVertex(config)
    
    // 设置一些默认模型用于测试
    this.defaultModels = config.defaultModels || ['claude-3-sonnet', 'claude-3-haiku']
    
    // 确保 owners 属性存在（用于测试）
    if (!this.owners) {
      this.owners = [
        { owner: 'Google', keywords: ['gemini', 'bison'] },
        { owner: 'Anthropic', keywords: ['claude'] },
        { owner: 'Custom', keywords: [] }
      ]
    }
  }
}

/**
 * 测试模型合并逻辑
 */
async function testModelMerging() {
  console.log('🔄 测试模型合并逻辑\n')

  const testCases = [
    {
      name: '无自动模型，有手动模型',
      config: {
        mockModels: [], // 无自动获取的模型
        manual_models: 'gemini-1.5-pro\ngemini-1.5-flash',
        defaultModels: ['claude-3-sonnet']
      },
      expectedModels: ['claude-3-sonnet', 'gemini-1.5-pro', 'gemini-1.5-flash']
    },
    {
      name: '有自动模型，有手动模型',
      config: {
        mockModels: [{ id: 'gemini-pro' }, { id: 'gemini-pro-vision' }], // 自动获取的模型
        manual_models: 'gemini-1.5-pro\ngemini-1.5-flash',
        defaultModels: ['claude-3-sonnet']
      },
      expectedModels: ['gemini-pro', 'gemini-pro-vision', 'claude-3-sonnet', 'gemini-1.5-pro', 'gemini-1.5-flash']
    },
    {
      name: '有自动模型，无手动模型',
      config: {
        mockModels: [{ id: 'gemini-pro' }, { id: 'gemini-pro-vision' }],
        manual_models: '', // 空的手动模型
        defaultModels: ['claude-3-sonnet']
      },
      expectedModels: ['gemini-pro', 'gemini-pro-vision', 'claude-3-sonnet']
    },
    {
      name: '无自动模型，无手动模型',
      config: {
        mockModels: [],
        manual_models: '',
        defaultModels: ['claude-3-sonnet']
      },
      expectedModels: ['claude-3-sonnet']
    }
  ]

  let passedTests = 0
  let totalTests = testCases.length

  for (const testCase of testCases) {
    try {
      console.log(`📋 测试: ${testCase.name}`)
      
      // 创建适配器实例
      const adapter = new TestVertexAdapter(testCase.config)
      
      // 获取模型列表
      const models = await adapter._getModels()
      
      // 提取模型 ID
      const modelIds = []
      if (Array.isArray(models)) {
        models.forEach(group => {
          if (group && group.models && Array.isArray(group.models)) {
            group.models.forEach(model => {
              // 模型可能是字符串或对象
              if (typeof model === 'string') {
                modelIds.push(model)
              } else if (model && model.id) {
                modelIds.push(model.id)
              }
            })
          }
        })
      }
      
      console.log(`   配置:`)
      console.log(`     自动模型: [${testCase.config.mockModels.map(m => m.id || 'empty').join(', ')}]`)
      console.log(`     手动模型: "${testCase.config.manual_models}"`)
      console.log(`     默认模型: [${testCase.config.defaultModels.join(', ')}]`)
      console.log(`   期望: [${testCase.expectedModels.join(', ')}]`)
      console.log(`   实际: [${modelIds.join(', ')}]`)
      
      // 验证结果 - 检查所有期望的模型是否都存在
      const allExpectedFound = testCase.expectedModels.every(expectedModel => 
        modelIds.includes(expectedModel)
      )
      
      if (allExpectedFound && modelIds.length >= testCase.expectedModels.length) {
        console.log(`   ✅ 通过\n`)
        passedTests++
      } else {
        console.log(`   ❌ 失败: 模型合并不正确\n`)
      }
      
    } catch (error) {
      console.log(`   ❌ 失败: ${error.message}\n`)
    }
  }

  return { passedTests, totalTests }
}

/**
 * 测试配置解析
 */
async function testConfigParsing() {
  console.log('⚙️ 测试配置解析\n')
  
  const testConfigs = [
    {
      name: '完整配置',
      config: {
        enable: true,
        name: 'Vertex-Production',
        region: 'us-central1',
        service_account_json: '{"type": "service_account"}',
        manual_models: 'gemini-1.5-pro\ngemini-1.5-flash\ngemini-1.0-pro'
      }
    },
    {
      name: '最小配置',
      config: {
        enable: true,
        region: 'us-central1'
      }
    }
  ]

  let passedTests = 0
  let totalTests = testConfigs.length

  for (const testCase of testConfigs) {
    try {
      console.log(`📋 测试: ${testCase.name}`)
      
      // 创建适配器实例
      const adapter = new TestVertexAdapter(testCase.config)
      
      console.log(`   配置解析结果:`)
      console.log(`     provider: ${adapter.provider}`)
      console.log(`     手动模型数量: ${adapter.manualModels ? adapter.manualModels.length : 0}`)
      if (adapter.manualModels && adapter.manualModels.length > 0) {
        console.log(`     手动模型: [${adapter.manualModels.join(', ')}]`)
      }
      
      // 基本验证
      if (adapter.provider === 'vertex' && Array.isArray(adapter.manualModels)) {
        console.log(`   ✅ 通过\n`)
        passedTests++
      } else {
        console.log(`   ❌ 失败: 配置解析不正确\n`)
      }
      
    } catch (error) {
      console.log(`   ❌ 失败: ${error.message}\n`)
    }
  }

  return { passedTests, totalTests }
}

/**
 * 主测试函数
 */
async function main() {
  try {
    console.log('🚀 Vertex AI 适配器集成测试\n')
    console.log('=' .repeat(60) + '\n')
    
    // 测试配置解析
    const configResult = await testConfigParsing()
    
    // 测试模型合并逻辑
    const mergingResult = await testModelMerging()
    
    // 总结
    console.log('=' .repeat(60))
    console.log('📊 测试总结:')
    console.log(`   配置解析测试: ${configResult.passedTests}/${configResult.totalTests} 通过`)
    console.log(`   模型合并测试: ${mergingResult.passedTests}/${mergingResult.totalTests} 通过`)
    
    const totalPassed = configResult.passedTests + mergingResult.passedTests
    const totalTests = configResult.totalTests + mergingResult.totalTests
    console.log(`   总体通过率: ${Math.round(totalPassed / totalTests * 100)}%`)
    
    if (totalPassed === totalTests) {
      console.log('\n🎉 所有测试通过！Vertex AI 适配器手动模型配置功能完全正常。')
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