#!/usr/bin/env node

import config from '../lib/config.js'
import { getAvailableAdapterTypes } from '../lib/chat/llm/adapters/registry.js'

async function debugGetLLMEnabled() {
  try {
    console.log('=== 调试 getLLMEnabled 方法 ===')
    
    // 1. 初始化配置
    await config.initConfig()
    
    // 2. 检查可用的适配器类型
    const allAdapterTypes = await getAvailableAdapterTypes()
    console.log('1. 可用的适配器类型:', allAdapterTypes)
    
    // 3. 检查 llm_adapters 配置
    console.log('2. llm_adapters 配置存在:', !!config.llm_adapters)
    if (config.llm_adapters) {
      console.log('   配置的适配器类型:', Object.keys(config.llm_adapters))
      
      // 检查每个适配器类型
      for (const adapterType of allAdapterTypes) {
        const instancesList = config.llm_adapters[adapterType]
        console.log(`   ${adapterType}:`, {
          exists: !!instancesList,
          isArray: Array.isArray(instancesList),
          length: Array.isArray(instancesList) ? instancesList.length : 'N/A'
        })
        
        if (Array.isArray(instancesList) && instancesList.length > 0) {
          instancesList.forEach((instance, index) => {
            console.log(`     实例 ${index}:`, {
              enable: instance.enable,
              name: instance.name || '未命名',
              hasConfig: Object.keys(instance).length > 0
            })
          })
        }
      }
    }
    
    // 4. 手动执行 getLLMEnabled 逻辑
    console.log('3. 手动执行 getLLMEnabled 逻辑...')
    const instances = []
    
    if (!config.llm_adapters) {
      console.log('   ❌ 未找到 llm_adapters 配置')
      return
    }
    
    // 遍历所有适配器类型
    for (const adapterType of allAdapterTypes) {
      const instancesList = config.llm_adapters[adapterType]
      console.log(`   检查 ${adapterType}:`)
      
      if (!Array.isArray(instancesList)) {
        console.log(`     ⚠️  不是数组，跳过`)
        continue
      }
      
      let instanceCounter = 0
      for (const instanceConfig of instancesList) {
        console.log(`     实例 ${instanceCounter}:`, {
          enable: instanceConfig.enable,
          enableType: typeof instanceConfig.enable,
          name: instanceConfig.name
        })
        
        if (!instanceConfig.enable) {
          console.log(`       ❌ 未启用，跳过`)
          continue
        }
        
        instanceCounter++
        const displayName = instanceConfig.name || `${adapterType}-${instanceCounter}`
        const instanceId = displayName
        
        console.log(`       ✅ 添加实例: ${instanceId}`)
        
        instances.push({
          instanceId,
          adapterType,
          displayName,
          config: instanceConfig,
          setAvailable: () => {
            console.log(`       📝 标记 ${instanceId} 为可用`)
          },
        })
      }
    }
    
    console.log('4. 最终结果:')
    console.log(`   启用的实例数量: ${instances.length}`)
    instances.forEach((instance, index) => {
      console.log(`   ${index + 1}. ${instance.displayName} (${instance.adapterType})`)
    })
    
    // 5. 调用实际的 getLLMEnabled 方法进行对比
    console.log('5. 调用实际的 getLLMEnabled 方法:')
    const actualResult = await config.getLLMEnabled()
    console.log(`   实际返回的实例数量: ${actualResult.length}`)
    
    if (actualResult.length !== instances.length) {
      console.log('   ❌ 手动执行和实际方法结果不一致！')
    } else {
      console.log('   ✅ 手动执行和实际方法结果一致')
    }
    
  } catch (error) {
    console.error('调试过程中发生错误:', error)
  }
}

debugGetLLMEnabled()