#!/usr/bin/env node

/**
 * 测试 Vertex AI 适配器的手动模型配置功能
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
 * 测试手动模型配置
 */
async function testManualModels() {
  console.log('🧪 测试 Vertex AI 适配器手动模型配置功能\n')

  // 测试配置
  const testConfigs = [
    {
      name: '空配置',
      config: {},
      expectedManualModels: []
    },
    {
      name: '单个手动模型',
      config: {
        manual_models: 'gemini-1.5-pro'
      },
      expectedManualModels: ['gemini-1.5-pro']
    },
    {
      name: '多个手动模型',
      config: {
        manual_models: 'gemini-1.5-pro\ngemini-1.5-flash\ngemini-1.0-pro'
      },
      expectedManualModels: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro']
    },
    {
      name: '包含空行的手动模型',
      config: {
        manual_models: 'gemini-1.5-pro\n\ngemini-1.5-flash\n  \ngemini-1.0-pro\n'
      },
      expectedManualModels: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro']
    },
    {
      name: '包含空白字符的手动模型',
      config: {
        manual_models: '  gemini-1.5-pro  \n  gemini-1.5-flash  \n  gemini-1.0-pro  '
      },
      expectedManualModels: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro']
    }
  ]

  let passedTests = 0
  let totalTests = testConfigs.length

  for (const testCase of testConfigs) {
    try {
      console.log(`📋 测试: ${testCase.name}`)
      
      // 创建适配器实例
      const adapter = new VertexAdapter(testCase.config)
      
      // 检查手动模型是否正确解析
      const actualManualModels = adapter.manualModels || []
      
      console.log(`   配置: ${JSON.stringify(testCase.config.manual_models || 'undefined')}`)
      console.log(`   期望: [${testCase.expectedManualModels.join(', ')}]`)
      console.log(`   实际: [${actualManualModels.join(', ')}]`)
      
      // 验证结果
      if (JSON.stringify(actualManualModels) === JSON.stringify(testCase.expectedManualModels)) {
        console.log(`   ✅ 通过\n`)
        passedTests++
      } else {
        console.log(`   ❌ 失败: 手动模型解析不正确\n`)
      }
      
    } catch (error) {
      console.log(`   ❌ 失败: ${error.message}\n`)
    }
  }

  return { passedTests, totalTests }
}

/**
 * 测试适配器元数据
 */
async function testAdapterMetadata() {
  console.log('🔍 测试适配器元数据\n')
  
  try {
    const metadata = VertexAdapter.getAdapterMetadata()
    
    console.log('📊 适配器元数据:')
    console.log(`   类型: ${metadata.type}`)
    console.log(`   名称: ${metadata.name}`)
    console.log(`   描述: ${metadata.description}`)
    console.log(`   支持功能: [${metadata.supportedFeatures.join(', ')}]`)
    
    // 检查 manual_models 字段是否存在
    if (metadata.initialConfigSchema && metadata.initialConfigSchema.manual_models) {
      const manualModelsField = metadata.initialConfigSchema.manual_models
      console.log(`   ✅ manual_models 字段已配置:`)
      console.log(`      类型: ${manualModelsField.type}`)
      console.log(`      标签: ${manualModelsField.label}`)
      console.log(`      描述: ${manualModelsField.description}`)
      console.log(`      占位符: ${manualModelsField.placeholder}`)
      return true
    } else {
      console.log(`   ❌ manual_models 字段未找到`)
      return false
    }
    
  } catch (error) {
    console.log(`   ❌ 获取元数据失败: ${error.message}`)
    return false
  }
}

/**
 * 主测试函数
 */
async function main() {
  try {
    console.log('🚀 Vertex AI 适配器手动模型配置测试\n')
    console.log('=' .repeat(60) + '\n')
    
    // 测试适配器元数据
    const metadataTest = await testAdapterMetadata()
    console.log()
    
    // 测试手动模型配置
    const { passedTests, totalTests } = await testManualModels()
    
    // 总结
    console.log('=' .repeat(60))
    console.log('📊 测试总结:')
    console.log(`   元数据测试: ${metadataTest ? '✅ 通过' : '❌ 失败'}`)
    console.log(`   手动模型测试: ${passedTests}/${totalTests} 通过`)
    console.log(`   总体通过率: ${metadataTest && passedTests === totalTests ? '100%' : `${Math.round(((metadataTest ? 1 : 0) + passedTests) / (totalTests + 1) * 100)}%`}`)
    
    if (metadataTest && passedTests === totalTests) {
      console.log('\n🎉 所有测试通过！Vertex AI 适配器手动模型配置功能正常工作。')
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