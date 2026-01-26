#!/usr/bin/env node

async function testAPIModels() {
  try {
    console.log('=== 测试 API 模型字段 ===')
    
    // 测试 /api/config 接口
    const response = await fetch('http://localhost:3000/api/config', {
      headers: {
        'Authorization': 'Bearer gb6u1soOivcvg62rz1iuYg=='
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const config = await response.json()
    
    console.log('1. API 响应状态:', response.status)
    console.log('2. models 字段存在:', 'models' in config)
    console.log('3. models 字段值:', config.models)
    console.log('4. models 字段类型:', typeof config.models)
    
    if (config.llm_adapters) {
      console.log('5. llm_adapters 配置:')
      for (const [adapterType, instances] of Object.entries(config.llm_adapters)) {
        console.log(`   ${adapterType}: ${Array.isArray(instances) ? instances.length : 'not array'} 个实例`)
        if (Array.isArray(instances) && instances.length > 0) {
          instances.forEach((instance, index) => {
            console.log(`     实例 ${index}: enable=${instance.enable}, name=${instance.name || '未命名'}`)
          })
        }
      }
    }
    
    // 测试 providers 字段
    if (config.providers) {
      console.log('6. providers 字段:', config.providers.length, '个提供商')
    } else {
      console.log('6. providers 字段不存在')
    }
    
  } catch (error) {
    console.error('测试 API 时发生错误:', error.message)
  }
}

testAPIModels()