#!/usr/bin/env node

/**
 * 插件工具调试脚本
 * 
 * 使用方法:
 *   node scripts/debug-tool.js <pluginName> <toolName> [admin_code] [base_url]
 * 
 * 示例:
 *   node scripts/debug-tool.js web-plugin web_search your_admin_code
 *   node scripts/debug-tool.js mcp-plugin read_file your_admin_code http://localhost:3000
 */

import readline from 'readline'

const PLUGIN_NAME = process.argv[2]
const TOOL_NAME = process.argv[3]
const ADMIN_CODE = process.argv[4] || 'admin123'
const BASE_URL = process.argv[5] || 'http://localhost:3000'

if (!PLUGIN_NAME || !TOOL_NAME) {
  console.log('❌ 用法: node scripts/debug-tool.js <pluginName> <toolName> [admin_code] [base_url]')
  console.log('\n示例:')
  console.log('  node scripts/debug-tool.js web-plugin web_search')
  console.log('  node scripts/debug-tool.js mcp-plugin read_file admin123')
  process.exit(1)
}

console.log('\n🔧 工具调试器')
console.log('─'.repeat(60))
console.log(`📦 插件: ${PLUGIN_NAME}`)
console.log(`🛠️  工具: ${TOOL_NAME}`)
console.log(`🔑 管理员码: ${ADMIN_CODE}`)
console.log(`📍 服务器: ${BASE_URL}`)
console.log('─'.repeat(60))

// 获取工具的 schema
async function getToolSchema() {
  try {
    const url = `${BASE_URL}/api/plugins/${PLUGIN_NAME}?admin_code=${ADMIN_CODE}`
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.code !== 0) {
      console.log(`❌ 获取插件信息失败: ${data.message}`)
      return null
    }
    
    // 查找工具
    for (const group of data.data.tools) {
      const tool = group.tools.find(t => t.name === TOOL_NAME)
      if (tool) {
        return tool
      }
    }
    
    console.log(`❌ 工具 ${TOOL_NAME} 不存在`)
    return null
  } catch (error) {
    console.log(`❌ 请求失败: ${error.message}`)
    return null
  }
}

// 执行工具
async function executeTool(parameters) {
  try {
    const url = `${BASE_URL}/api/plugins/${PLUGIN_NAME}/tools/${TOOL_NAME}/debug?admin_code=${ADMIN_CODE}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parameters,
        user: {
          isAdmin: true,
          userId: 'debug-script',
        },
      }),
    })
    
    const data = await response.json()
    return data
  } catch (error) {
    console.log(`❌ 请求失败: ${error.message}`)
    return null
  }
}

// 显示 schema
function displaySchema(tool) {
  console.log('\n📋 工具信息:')
  console.log(`   名称: ${tool.name}`)
  console.log(`   描述: ${tool.description || '无'}`)
  
  if (tool.parameters && tool.parameters.properties) {
    console.log('\n📝 参数说明:')
    
    const props = tool.parameters.properties
    const required = tool.parameters.required || []
    
    for (const [name, schema] of Object.entries(props)) {
      const isRequired = required.includes(name)
      const requiredMark = isRequired ? ' (必填)' : ' (可选)'
      const type = schema.type || 'any'
      const desc = schema.description || '无描述'
      
      console.log(`   • ${name}${requiredMark}`)
      console.log(`     类型: ${type}`)
      console.log(`     说明: ${desc}`)
      
      if (schema.enum) {
        console.log(`     可选值: ${schema.enum.join(', ')}`)
      }
      if (schema.minimum !== undefined) {
        console.log(`     最小值: ${schema.minimum}`)
      }
      if (schema.maximum !== undefined) {
        console.log(`     最大值: ${schema.maximum}`)
      }
      if (schema.minLength !== undefined) {
        console.log(`     最小长度: ${schema.minLength}`)
      }
      if (schema.maxLength !== undefined) {
        console.log(`     最大长度: ${schema.maxLength}`)
      }
    }
  } else {
    console.log('\n   (无参数或参数未定义 schema)')
  }
}

// 显示执行结果
function displayResult(data) {
  console.log('\n' + '═'.repeat(60))
  
  if (data.code !== 0) {
    console.log('❌ 调试失败')
    console.log(`   错误: ${data.message}`)
    
    if (data.data && data.data.errors) {
      console.log('\n📋 验证错误:')
      data.data.errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.field}: ${err.message}`)
      })
      
      if (data.data.schema) {
        console.log('\n📝 期望的参数格式:')
        console.log(JSON.stringify(data.data.schema, null, 2).split('\n').map(line => `   ${line}`).join('\n'))
      }
    }
    return
  }
  
  const result = data.data
  
  if (result.success) {
    console.log('✅ 执行成功')
  } else {
    console.log('❌ 执行失败')
  }
  
  console.log(`⏱️  执行时间: ${result.executionTime}`)
  
  console.log('\n📥 输入参数:')
  console.log(JSON.stringify(result.input, null, 2).split('\n').map(line => `   ${line}`).join('\n'))
  
  if (result.success) {
    console.log('\n📤 执行结果:')
    console.log(JSON.stringify(result.result, null, 2).split('\n').map(line => `   ${line}`).join('\n'))
  } else {
    console.log('\n⚠️  错误信息:')
    console.log(`   ${result.error.message}`)
    if (result.error.stack) {
      console.log('\n📚 堆栈跟踪:')
      console.log(result.error.stack.split('\n').map(line => `   ${line}`).join('\n'))
    }
  }
  
  console.log('═'.repeat(60))
}

// 交互式输入参数
async function interactiveInput(schema) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  
  const question = (prompt) => new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
  
  const parameters = {}
  
  if (!schema.properties) {
    console.log('\n⚠️  该工具没有定义参数 schema，将使用空参数执行')
    rl.close()
    return parameters
  }
  
  console.log('\n📝 请输入参数值 (直接回车跳过可选参数):')
  console.log('   提示: 数组用逗号分隔，对象用 JSON 格式')
  console.log('')
  
  const props = schema.properties
  const required = schema.required || []
  
  for (const [name, fieldSchema] of Object.entries(props)) {
    const isRequired = required.includes(name)
    const type = fieldSchema.type || 'any'
    const desc = fieldSchema.description || ''
    
    let prompt = `   ${name} (${type})`
    if (isRequired) prompt += ' [必填]'
    if (desc) prompt += ` - ${desc}`
    prompt += '\n   > '
    
    const input = await question(prompt)
    
    if (!input && !isRequired) {
      continue
    }
    
    // 类型转换
    try {
      if (type === 'number' || type === 'integer') {
        parameters[name] = type === 'integer' ? parseInt(input) : parseFloat(input)
      } else if (type === 'boolean') {
        parameters[name] = input.toLowerCase() === 'true' || input === '1'
      } else if (type === 'array') {
        parameters[name] = input.split(',').map(s => s.trim())
      } else if (type === 'object') {
        parameters[name] = JSON.parse(input)
      } else {
        parameters[name] = input
      }
    } catch (err) {
      console.log(`   ⚠️  解析失败，使用原始字符串: ${err.message}`)
      parameters[name] = input
    }
  }
  
  rl.close()
  return parameters
}

// 主函数
async function main() {
  // 1. 获取工具 schema
  const tool = await getToolSchema()
  if (!tool) {
    process.exit(1)
  }
  
  // 2. 显示 schema
  displaySchema(tool)
  
  // 3. 交互式输入参数
  const parameters = await interactiveInput(tool.parameters)
  
  console.log('\n🚀 开始执行...')
  
  // 4. 执行工具
  const result = await executeTool(parameters)
  if (!result) {
    process.exit(1)
  }
  
  // 5. 显示结果
  displayResult(result)
}

main().catch(console.error)
