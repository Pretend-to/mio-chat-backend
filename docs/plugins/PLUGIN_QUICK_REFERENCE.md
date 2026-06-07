# Mio-Chat 插件开发快速参考

## 快速创建插件

### 1. 创建目录结构
```bash
mkdir -p lib/plugins/my-plugin/{lib,tools,tests}
cd lib/plugins/my-plugin
```

### 2. 创建 package.json
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "我的插件",
  "main": "index.js",
  "type": "module"
}
```

### 3. 创建插件主文件 (index.js)
```javascript
import Plugin from '../../plugin.js'
import path from 'path'
import { fileURLToPath } from 'url'

export default class MyPlugin extends Plugin {
  getFilePath() {
    return path.dirname(fileURLToPath(import.meta.url))
  }

  getInitialConfig() {
    return {
      enabled: true,
      apiKey: '',
      timeout: 30000
    }
  }
}
```

### 4. 创建工具 (tools/myTool.js)
```javascript
import { MioFunction } from '../../../function.js'

export default class MyTool extends MioFunction {
  constructor() {
    super({
      name: 'myTool',
      description: '我的工具',
      parameters: {
        type: 'object',
        properties: {
          input: {
            type: 'string',
            description: '输入参数'
          }
        },
        required: ['input']
      }
    })
    this.func = this.execute
  }

  async execute(e) {
    const { input } = e.params
    
    try {
      // 处理逻辑
      const result = input.toUpperCase()
      
      return {
        success: true,
        data: result
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
}
```

## 常用代码片段

### 获取插件配置
```javascript
const config = this.getPluginConfig()
const apiKey = config.apiKey
```

### HTTP 请求
```javascript
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify(data)
})

if (!response.ok) {
  throw new Error(`HTTP ${response.status}`)
}

const result = await response.json()
```

### 参数验证
```javascript
if (!params.url || typeof params.url !== 'string') {
  throw new Error('url 参数必须是字符串')
}

try {
  new URL(params.url)
} catch {
  throw new Error('url 格式无效')
}
```

### 错误处理
```javascript
try {
  const result = await this.processData(params)
  return { success: true, data: result }
} catch (error) {
  logger.error(`[${this.name}] 执行失败:`, error)
  return {
    success: false,
    error: {
      code: error.code || 'EXECUTION_ERROR',
      message: error.message
    }
  }
}
```

### 缓存使用
```javascript
// 检查缓存
const cacheKey = `${this.name}:${JSON.stringify(params)}`
const cached = this.parentPlugin.cache?.get(cacheKey)
if (cached && Date.now() - cached.timestamp < 300000) {
  return cached.result
}

// 缓存结果
this.parentPlugin.cache?.set(cacheKey, {
  result: result,
  timestamp: Date.now()
})
```

### 文件保存
```javascript
// 保存图片
const imageUrl = await this.getImgUrlFromBuffer(baseUrl, buffer)

// 保存文本文件
const fileUrl = this.saveTextFile(baseUrl, content, 'output.txt')
```

## 参数定义示例

### 基础类型
```javascript
parameters: {
  type: 'object',
  properties: {
    text: { type: 'string', description: '文本' },
    count: { type: 'number', minimum: 1, description: '数量' },
    enabled: { type: 'boolean', description: '是否启用' }
  },
  required: ['text']
}
```

### 枚举类型
```javascript
format: {
  type: 'string',
  enum: ['json', 'xml', 'csv'],
  description: '输出格式'
}
```

### 数组类型
```javascript
tags: {
  type: 'array',
  items: { type: 'string' },
  description: '标签列表'
}
```

### 对象类型
```javascript
options: {
  type: 'object',
  properties: {
    timeout: { type: 'number' },
    retries: { type: 'number' }
  },
  description: '选项'
}
```

## 调试技巧

### 启用调试日志
```javascript
// 在配置中设置
{
  "debug": true
}

// 在代码中使用
if (config.debug) {
  logger.debug(`[${this.name}] 调试信息:`, data)
}
```

### 使用调试API
```bash
# 测试工具
curl -X POST "http://localhost:3080/api/plugins/my-plugin/tools/myTool/debug" \
  -H "Content-Type: application/json" \
  -H "x-admin-code: your-admin-code" \
  -d '{"input": "test"}'

# 重载插件
curl -X POST "http://localhost:3080/api/plugins/my-plugin/reload" \
  -H "x-admin-code: your-admin-code"
```

## 常见错误

### 插件无法加载
- 检查 `getFilePath()` 和 `getInitialConfig()` 方法
- 确认 package.json 格式正确
- 查看控制台错误信息

### 工具无法调用
- 检查工具的 `name` 属性
- 确认 `parameters` 定义正确
- 验证 `execute` 方法存在

### 配置不生效
- 配置会自动热重载
- 可以调用重载API强制刷新
- 检查配置格式是否正确

## 性能优化

### 缓存策略
```javascript
// 插件级缓存
this.cache = new Map()

// 定期清理
setInterval(() => {
  this.cleanupCache()
}, 60000)
```

### 连接池
```javascript
// 复用HTTP连接
this.httpAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 10
})
```

### 异步处理
```javascript
// 并发处理
const results = await Promise.all(
  urls.map(url => this.processUrl(url))
)

// 限制并发数
const limit = 5
const chunks = []
for (let i = 0; i < urls.length; i += limit) {
  chunks.push(urls.slice(i, i + limit))
}

for (const chunk of chunks) {
  await Promise.all(chunk.map(url => this.processUrl(url)))
}
```

## 部署检查清单

- [ ] package.json 信息完整
- [ ] 所有必需方法已实现
- [ ] 参数定义正确
- [ ] 错误处理完善
- [ ] 日志记录适当
- [ ] 配置验证有效
- [ ] 测试用例覆盖
- [ ] 文档说明清晰
- [ ] 性能测试通过
- [ ] 安全检查完成

## 有用的工具函数

### 延迟函数
```javascript
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
```

### 重试函数
```javascript
async function retry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === retries - 1) throw error
      await delay(Math.pow(2, i) * 1000)
    }
  }
}
```

### URL验证
```javascript
function isValidUrl(string) {
  try {
    new URL(string)
    return true
  } catch {
    return false
  }
}
```

### 数据清理
```javascript
function sanitize(str) {
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
}
```

---

更多详细信息请参考 [完整开发指南](./PLUGIN_DEVELOPMENT_GUIDE.md) 和 [插件模板](./PLUGIN_TEMPLATE.md)。