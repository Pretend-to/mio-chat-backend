#!/usr/bin/env node

import config from '../lib/config.js'

async function testLLMModuleStatus() {
  try {
    console.log('=== 测试 LLM 模块状态 ===')
    
    // 1. 初始化配置
    await config.initConfig()
    
    // 2. 检查 getLLMEnabled 结果
    const enabledInstances = await config.getLLMEnabled()
    console.log('1. getLLMEnabled 结果:')
    console.log(`   启用的实例数量: ${enabledInstances.length}`)
    enabledInstances.forEach((instance, index) => {
      console.log(`   ${index + 1}. ${instance.displayName} (${instance.adapterType})`)
    })
    
    // 3. 检查 global.middleware 状态
    console.log('2. global.middleware 状态:')
    console.log(`   存在: ${!!global.middleware}`)
    if (global.middleware) {
      console.log(`   llm 模块存在: ${!!global.middleware.llm}`)
      if (global.middleware.llm) {
        console.log(`   llm.llms 对象: ${Object.keys(global.middleware.llm.llms).length} 个实例`)
        console.log(`   实例列表: ${Object.keys(global.middleware.llm.llms).join(', ')}`)
        
        // 检查每个实例的模型
        for (const [instanceId, llmInstance] of Object.entries(global.middleware.llm.llms)) {
          console.log(`   实例 ${instanceId}:`)
          console.log(`     模型数量: ${llmInstance.models ? llmInstance.models.length : 'undefined'}`)
          if (llmInstance.models && llmInstance.models.length > 0) {
            console.log(`     第一个模型组: ${JSON.stringify(llmInstance.models[0], null, 2)}`)
          }
        }
        
        // 测试 getModelList
        const modelList = global.middleware.llm.getModelList(true)
        console.log(`   getModelList 结果: ${Object.keys(modelList).length} 个提供商`)
        for (const [provider, models] of Object.entries(modelList)) {
          console.log(`     ${provider}: ${models.length} 个模型`)
        }
      }
    }
    
    // 4. 检查 config.getProvidersAvailable
    const providers = config.getProvidersAvailable()
    console.log('3. config.getProvidersAvailable 结果:')
    console.log(`   可用提供商数量: ${providers.length}`)
    providers.forEach((provider, index) => {
      console.log(`   ${index + 1}. ${provider.displayName} (${provider.adapterType})`)
    })
    
  } catch (error) {
    console.error('测试过程中发生错误:', error)
  }
}

testLLMModuleStatus()