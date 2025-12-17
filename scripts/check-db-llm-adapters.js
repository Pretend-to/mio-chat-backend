#!/usr/bin/env node

import SystemSettingsService from '../lib/database/services/SystemSettingsService.js'

async function checkDbLLMAdapters() {
  await SystemSettingsService.initialize()
  const llmAdapters = await SystemSettingsService.get('llm_adapters')
  
  console.log('数据库中的 llm_adapters:')
  console.log('存在:', !!llmAdapters)
  
  if (llmAdapters) {
    console.log('值类型:', typeof llmAdapters.value)
    console.log('值内容:')
    console.log(JSON.stringify(llmAdapters.value, null, 2))
    
    if (llmAdapters.value && llmAdapters.value.vertex) {
      console.log('Vertex 配置:')
      console.log('是数组:', Array.isArray(llmAdapters.value.vertex))
      console.log('长度:', llmAdapters.value.vertex.length)
      if (llmAdapters.value.vertex.length > 0) {
        console.log('第一个实例:', llmAdapters.value.vertex[0])
      }
    }
  } else {
    console.log('❌ 数据库中没有 llm_adapters 配置')
  }
}

checkDbLLMAdapters()