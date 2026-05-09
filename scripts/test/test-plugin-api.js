#!/usr/bin/env node

/**
 * 插件管理 API 测试脚本
 * 
 * 使用方法:
 *   node scripts/test-plugin-api.js [admin_code] [base_url]
 * 
 * 示例:
 *   node scripts/test-plugin-api.js your_admin_code http://localhost:3000
 */

const ADMIN_CODE = process.argv[2] || 'admin123'
const BASE_URL = process.argv[3] || 'http://localhost:3000'

console.log(`\n🧪 测试插件管理 API`)
console.log(`📍 服务器: ${BASE_URL}`)
console.log(`🔑 管理员码: ${ADMIN_CODE}\n`)

// 辅助函数
async function apiCall(method, endpoint, body = null) {
  const url = `${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}admin_code=${ADMIN_CODE}`
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  }
  
  if (body) {
    options.body = JSON.stringify(body)
  }
  
  console.log(`➡️  ${method} ${endpoint}`)
  
  try {
    const response = await fetch(url, options)
    const data = await response.json()
    
    if (data.code === 0) {
      console.log(`✅ 成功`)
      return data.data
    } else {
      console.log(`❌ 失败: ${data.message}`)
      return null
    }
  } catch (error) {
    console.log(`❌ 请求错误: ${error.message}`)
    return null
  }
}

// 测试函数
async function testListPlugins() {
  console.log('\n📋 1. 测试: 列出所有插件')
  console.log('─'.repeat(60))
  
  const data = await apiCall('GET', '/api/plugins')
  
  if (data) {
    console.log(`   总计: ${data.total} 个插件`)
    data.plugins.forEach(plugin => {
      console.log(`   - ${plugin.name} (${plugin.version})`)
      console.log(`     工具数量: ${plugin.toolCount}`)
      console.log(`     启用状态: ${plugin.enabled ? '✅' : '❌'}`)
    })
    return data.plugins
  }
  
  return []
}

async function testGetPlugin(pluginName) {
  console.log(`\n🔍 2. 测试: 获取插件详情 (${pluginName})`)
  console.log('─'.repeat(60))
  
  const data = await apiCall('GET', `/api/plugins/${pluginName}`)
  
  if (data) {
    console.log(`   名称: ${data.displayName}`)
    console.log(`   描述: ${data.description || '无'}`)
    console.log(`   版本: ${data.version}`)
    console.log(`   作者: ${data.author}`)
    console.log(`   启用: ${data.enabled ? '✅' : '❌'}`)
    console.log(`   工具组: ${data.tools.length} 个`)
    
    data.tools.forEach(group => {
      console.log(`   - ${group.group}: ${group.tools.length} 个工具`)
      group.tools.forEach(tool => {
        console.log(`     • ${tool.name}: ${tool.description}`)
      })
    })
  }
  
  return data
}

async function testGetPluginConfig(pluginName) {
  console.log(`\n⚙️  3. 测试: 获取插件配置 (${pluginName})`)
  console.log('─'.repeat(60))
  
  const data = await apiCall('GET', `/api/plugins/${pluginName}/config`)
  
  if (data) {
    console.log(`   配置内容:`)
    console.log(JSON.stringify(data, null, 2).split('\n').map(line => `   ${line}`).join('\n'))
  }
  
  return data
}


async function testGetPluginTools(pluginName) {
  console.log(`\n🛠️  5. 测试: 获取插件工具列表 (${pluginName})`)
  console.log('─'.repeat(60))
  
  const data = await apiCall('GET', `/api/plugins/${pluginName}/tools`)
  
  if (data) {
    console.log(`   总计: ${data.totalCount} 个工具`)
    data.tools.forEach(group => {
      console.log(`   组 "${group.group}": ${group.count} 个工具`)
    })
  }
  
  return data
}

async function testReloadPlugin(pluginName) {
  console.log(`\n🔄 6. 测试: 重载插件 (${pluginName})`)
  console.log('─'.repeat(60))
  
  const data = await apiCall('POST', `/api/plugins/${pluginName}/reload`)
  
  if (data) {
    console.log(`   ${data.message}`)
    console.log(`   重载后工具数量: ${data.toolCount}`)
  }
  
  return data
}

async function testTogglePlugin(pluginName, enabled) {
  console.log(`\n🔘 7. 测试: ${enabled ? '启用' : '禁用'}插件 (${pluginName})`)
  console.log('─'.repeat(60))
  
  const data = await apiCall('POST', `/api/plugins/${pluginName}/toggle`, { enabled })
  
  if (data) {
    console.log(`   ${data.message}`)
  }
  
  return data
}

async function testReloadAllPlugins() {
  console.log(`\n🔄 8. 测试: 重载所有插件`)
  console.log('─'.repeat(60))
  
  const data = await apiCall('POST', '/api/plugins/reload-all')
  
  if (data) {
    console.log(`   ${data.message}`)
    console.log(`   成功: ${data.successCount}/${data.totalCount}`)
    
    data.results.forEach(result => {
      if (result.success) {
        console.log(`   ✅ ${result.name}: ${result.toolCount} 个工具`)
      } else {
        console.log(`   ❌ ${result.name}: ${result.error}`)
      }
    })
  }
  
  return data
}

// 主测试流程
async function runTests() {
  try {
    // 1. 列出所有插件
    const plugins = await testListPlugins()
    
    if (plugins.length === 0) {
      console.log('\n⚠️  没有找到插件，测试终止')
      return
    }
    
    // 选择第一个插件进行详细测试
    const testPlugin = plugins[0].name
    
    // 2. 获取插件详情
    await testGetPlugin(testPlugin)
    
    // 3. 获取插件配置
    const currentConfig = await testGetPluginConfig(testPlugin)
    
    // 4. 获取插件工具列表
    await testGetPluginTools(testPlugin)
    
    // 5. 重载插件
    await testReloadPlugin(testPlugin)
    
    // 6. 测试启用/禁用（如果配置存在）
    if (currentConfig) {
      // 禁用
      await testTogglePlugin(testPlugin, false)
      
      // 等待一秒
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 重新启用
      await testTogglePlugin(testPlugin, true)
    }
    
    // 7. 重载所有插件
    await testReloadAllPlugins()
    
    console.log('\n✅ 所有测试完成!\n')
    
  } catch (error) {
    console.error('\n❌ 测试过程中出错:', error.message)
  }
}

// 运行测试
runTests()
