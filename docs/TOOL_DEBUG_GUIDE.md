# 工具调试接口使用示例

## 概述

工具调试接口 (`POST /api/plugins/:pluginName/tools/:toolName/debug`) 允许你直接测试插件工具的执行，验证参数 schema，并查看执行结果。

## 快速开始

### 1. 使用交互式脚本（推荐）

```bash
# 基本用法
node scripts/debug-tool.js <插件名> <工具名> [管理员码]

# 示例：调试 web-plugin 的 web_search 工具
node scripts/debug-tool.js web-plugin web_search admin123
```

**交互流程**:

```
🔧 工具调试器
────────────────────────────────────────────────────────────
📦 插件: web-plugin
🛠️  工具: web_search
🔑 管理员码: admin123
📍 服务器: http://localhost:3000
────────────────────────────────────────────────────────────

📋 工具信息:
   名称: web_search
   描述: 搜索网页内容

📝 参数说明:
   • query (必填)
     类型: string
     说明: 搜索关键词
   • limit (可选)
     类型: number
     说明: 结果数量

📝 请输入参数值 (直接回车跳过可选参数):
   提示: 数组用逗号分隔，对象用 JSON 格式

   query (string) [必填] - 搜索关键词
   > GitHub Copilot

   limit (number) [可选] - 结果数量
   > 5

🚀 开始执行...

════════════════════════════════════════════════════════════
✅ 执行成功
⏱️  执行时间: 1234ms

📥 输入参数:
   {
     "query": "GitHub Copilot",
     "limit": 5
   }

📤 执行结果:
   {
     "results": [
       {
         "title": "GitHub Copilot",
         "url": "https://github.com/features/copilot",
         "snippet": "Your AI pair programmer"
       }
     ]
   }
════════════════════════════════════════════════════════════
```

### 2. 使用 curl

```bash
# 基本调试
curl -X POST "http://localhost:3000/api/plugins/web-plugin/tools/web_search/debug?admin_code=admin123" \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "query": "GitHub Copilot",
      "limit": 5
    }
  }'
```

## 调试场景示例

### 场景 1: 测试自定义工具

假设你在 `plugins/custom/` 下创建了一个新工具 `calculate.js`:

```javascript
// plugins/custom/calculate.js
import { MioFunction } from '../../lib/function.js'

export default class CalculateFunction extends MioFunction {
  constructor() {
    super({
      name: 'calculate',
      description: '简单计算器',
      parameters: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            description: '运算类型',
            enum: ['add', 'subtract', 'multiply', 'divide']
          },
          a: {
            type: 'number',
            description: '第一个数'
          },
          b: {
            type: 'number',
            description: '第二个数'
          }
        },
        required: ['operation', 'a', 'b']
      }
    })
    this.func = this.execute
  }

  async execute(e) {
    const { operation, a, b } = e.params
    
    switch (operation) {
      case 'add':
        return { result: a + b }
      case 'subtract':
        return { result: a - b }
      case 'multiply':
        return { result: a * b }
      case 'divide':
        if (b === 0) throw new Error('除数不能为0')
        return { result: a / b }
      default:
        throw new Error('不支持的运算类型')
    }
  }
}
```

**调试步骤**:

```bash
# 1. 重载插件加载新工具
curl -X POST "http://localhost:3000/api/plugins/reload-all?admin_code=admin123"

# 2. 测试加法
curl -X POST "http://localhost:3000/api/plugins/custom/tools/calculate/debug?admin_code=admin123" \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "operation": "add",
      "a": 10,
      "b": 20
    }
  }'

# 成功响应:
# {
#   "code": 0,
#   "data": {
#     "success": true,
#     "executionTime": "2ms",
#     "result": { "result": 30 }
#   }
# }

# 3. 测试除零错误
curl -X POST "http://localhost:3000/api/plugins/custom/tools/calculate/debug?admin_code=admin123" \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "operation": "divide",
      "a": 10,
      "b": 0
    }
  }'

# 失败响应:
# {
#   "code": 0,
#   "data": {
#     "success": false,
#     "executionTime": "3ms",
#     "error": {
#       "message": "除数不能为0",
#       "stack": "Error: 除数不能为0\n    at ..."
#     }
#   }
# }
```

### 场景 2: 参数验证测试

```bash
# 缺少必需参数
curl -X POST "http://localhost:3000/api/plugins/custom/tools/calculate/debug?admin_code=admin123" \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "operation": "add"
    }
  }'

# 返回验证错误:
# {
#   "code": 1,
#   "message": "参数验证失败",
#   "data": {
#     "errors": [
#       {
#         "field": "a",
#         "message": "缺少必需参数: a",
#         "type": "required"
#       },
#       {
#         "field": "b",
#         "message": "缺少必需参数: b",
#         "type": "required"
#       }
#     ],
#     "schema": { ... }
#   }
# }

# 类型错误
curl -X POST "http://localhost:3000/api/plugins/custom/tools/calculate/debug?admin_code=admin123" \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "operation": "add",
      "a": "not-a-number",
      "b": 20
    }
  }'

# 返回类型错误:
# {
#   "code": 1,
#   "message": "参数验证失败",
#   "data": {
#     "errors": [
#       {
#         "field": "a",
#         "message": "参数类型错误: 期望 number，实际 string",
#         "type": "type_mismatch"
#       }
#     ]
#   }
# }

# 枚举值错误
curl -X POST "http://localhost:3000/api/plugins/custom/tools/calculate/debug?admin_code=admin123" \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "operation": "power",
      "a": 2,
      "b": 3
    }
  }'

# 返回枚举错误:
# {
#   "code": 1,
#   "message": "参数验证失败",
#   "data": {
#     "errors": [
#       {
#         "field": "operation",
#         "message": "参数值不在枚举范围内: add, subtract, multiply, divide",
#         "type": "enum_violation"
#       }
#     ]
#   }
# }
```

### 场景 3: 调试 MCP 工具

```bash
# 调试文件系统读取
curl -X POST "http://localhost:3000/api/plugins/mcp-plugin/tools/read_file/debug?admin_code=admin123" \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "path": "/path/to/file.txt"
    }
  }'

# 调试 Brave 搜索
curl -X POST "http://localhost:3000/api/plugins/mcp-plugin/tools/brave_search/debug?admin_code=admin123" \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "query": "TypeScript best practices",
      "count": 5
    }
  }'
```

### 场景 4: 性能测试

使用调试接口进行性能基准测试:

```bash
#!/bin/bash

# 测试工具执行时间
for i in {1..10}; do
  echo "测试 $i:"
  curl -s -X POST "http://localhost:3000/api/plugins/web-plugin/tools/web_search/debug?admin_code=admin123" \
    -H "Content-Type: application/json" \
    -d '{
      "parameters": {
        "query": "test query '$i'"
      }
    }' | jq '.data.executionTime'
done

# 输出示例:
# 测试 1: "1234ms"
# 测试 2: "1156ms"
# 测试 3: "1278ms"
# ...
```

### 场景 5: 批量测试

```javascript
// test-all-tools.js
import fetch from 'node-fetch'

const ADMIN_CODE = 'admin123'
const BASE_URL = 'http://localhost:3000'

async function testAllTools() {
  // 1. 获取所有插件
  const pluginsRes = await fetch(`${BASE_URL}/api/plugins?admin_code=${ADMIN_CODE}`)
  const { data: { plugins } } = await pluginsRes.json()
  
  // 2. 遍历每个插件
  for (const plugin of plugins) {
    console.log(`\n测试插件: ${plugin.name}`)
    
    // 获取工具列表
    const toolsRes = await fetch(`${BASE_URL}/api/plugins/${plugin.name}/tools?admin_code=${ADMIN_CODE}`)
    const { data: { tools } } = await toolsRes.json()
    
    // 3. 测试每个工具 (使用空参数)
    for (const group of tools) {
      for (const tool of group.tools) {
        console.log(`  测试工具: ${tool.name}`)
        
        const debugRes = await fetch(
          `${BASE_URL}/api/plugins/${plugin.name}/tools/${tool.name}/debug?admin_code=${ADMIN_CODE}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parameters: {} })
          }
        )
        
        const result = await debugRes.json()
        
        if (result.code === 0 && result.data.success) {
          console.log(`    ✅ 成功 (${result.data.executionTime})`)
        } else if (result.code === 1) {
          console.log(`    ⚠️  参数验证失败 (需要必填参数)`)
        } else {
          console.log(`    ❌ 失败: ${result.data.error.message}`)
        }
      }
    }
  }
}

testAllTools()
```

## 验证规则

调试接口会自动验证以下内容:

### 1. 必需参数
```json
{
  "field": "query",
  "message": "缺少必需参数: query",
  "type": "required"
}
```

### 2. 类型检查
```json
{
  "field": "limit",
  "message": "参数类型错误: 期望 number，实际 string",
  "type": "type_mismatch",
  "expected": "number",
  "actual": "string"
}
```

### 3. 枚举值
```json
{
  "field": "status",
  "message": "参数值不在枚举范围内: active, inactive, pending",
  "type": "enum_violation",
  "allowedValues": ["active", "inactive", "pending"]
}
```

### 4. 字符串长度
```json
{
  "field": "username",
  "message": "字符串长度小于最小值 3",
  "type": "min_length_violation"
}
```

### 5. 数值范围
```json
{
  "field": "age",
  "message": "数值小于最小值 0",
  "type": "minimum_violation"
}
```

### 6. 数组项类型
```json
{
  "field": "tags[2]",
  "message": "数组项类型错误: 期望 string",
  "type": "array_item_type_mismatch",
  "expected": "string",
  "actual": "number"
}
```

## 最佳实践

1. **开发流程**
   ```
   编写工具 → 重载插件 → 调试测试 → 修复问题 → 重新测试
   ```

2. **参数设计**
   - 提供详细的 `description`
   - 使用 `enum` 限制可选值
   - 设置合理的 `minimum`/`maximum`
   - 标记必需参数

3. **错误处理**
   - 在工具中抛出清晰的错误信息
   - 使用调试接口验证错误堆栈

4. **性能优化**
   - 使用 `executionTime` 识别慢工具
   - 批量测试找出性能瓶颈

## 与其他工具的配合

```bash
# 1. 查看工具列表
curl "http://localhost:3000/api/plugins/web-plugin/tools?admin_code=admin123" | jq '.data.tools[].tools[].name'

# 2. 调试特定工具
node scripts/debug-tool.js web-plugin web_search admin123

# 3. 如果失败，查看详细错误
curl "http://localhost:3000/api/plugins/web-plugin?admin_code=admin123" | jq '.data.tools[].tools[] | select(.name=="web_search")'

# 4. 修复后重载
curl -X POST "http://localhost:3000/api/plugins/web-plugin/reload?admin_code=admin123"

# 5. 重新测试
node scripts/debug-tool.js web-plugin web_search admin123
```

## 总结

工具调试接口是插件开发和维护的强大工具:

✅ **快速验证** - 无需启动完整对话流程  
✅ **参数检查** - 自动 schema 验证  
✅ **错误定位** - 详细的错误信息和堆栈  
✅ **性能监控** - 执行时间追踪  
✅ **开发效率** - 交互式调试脚本  

立即使用调试接口提升你的插件开发效率！
