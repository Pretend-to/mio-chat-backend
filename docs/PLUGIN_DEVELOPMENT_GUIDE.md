# Mio-Chat 插件开发指南

本指南将帮助开发者创建和维护 Mio-Chat 项目级插件。

## 目录

- [插件架构概述](#插件架构概述)
- [快速开始](#快速开始)
- [插件结构](#插件结构)
- [基础类说明](#基础类说明)
- [工具开发](#工具开发)
- [配置管理](#配置管理)
- [最佳实践](#最佳实践)
- [调试和测试](#调试和测试)
- [部署和分发](#部署和分发)

## 插件架构概述

Mio-Chat 插件系统采用模块化设计，每个插件都是一个独立的功能模块，可以提供多个工具（tools）供 LLM 调用。

### 核心组件

1. **Plugin 基类** - 所有插件的基础类，提供配置管理、工具加载、文件监听等功能
2. **MioFunction 基类** - 所有工具的基础类，定义工具的标准接口
3. **配置系统** - 基于数据库的配置管理，支持热重载
4. **工具系统** - 动态加载和管理工具，支持热重载

### 插件类型

- **标准插件** - 继承自 Plugin 基类的完整插件
- **自定义工具集** - 使用 singleTools 类的简单工具集合

## 快速开始

### 1. 创建插件目录结构

```
lib/plugins/your-plugin-name/
├── package.json          # 插件元数据
├── index.js              # 插件主入口
├── lib/                  # 插件库文件
│   └── helper.js
└── tools/                # 工具目录
    ├── tool1.js
    └── tool2.js
```

### 2. 创建 package.json

```json
{
  "name": "your-plugin-name",
  "version": "1.0.0",
  "description": "插件描述",
  "author": "作者名称",
  "main": "index.js",
  "type": "module"
}
```

### 3. 创建插件主文件

```javascript
// lib/plugins/your-plugin-name/index.js
import Plugin from '../../plugin.js'
import path from 'path'
import { fileURLToPath } from 'url'

export default class YourPlugin extends Plugin {
  constructor() {
    super()
  }

  getFilePath() {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    return __dirname
  }

  getInitialConfig() {
    return {
      enabled: true,
      apiKey: '',
      baseUrl: 'https://api.example.com',
      timeout: 30000
    }
  }
}
```

### 4. 创建工具

```javascript
// lib/plugins/your-plugin-name/tools/exampleTool.js
import { MioFunction } from '../../../function.js'

export default class ExampleTool extends MioFunction {
  constructor() {
    super({
      name: 'exampleTool',
      description: '这是一个示例工具',
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
    const config = this.getPluginConfig()
    
    try {
      // 工具逻辑实现
      const result = await this.processInput(input, config)
      
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

  async processInput(input, config) {
    // 具体的处理逻辑
    return `处理结果: ${input}`
  }
}
```

## 插件结构

### 目录结构说明

```
lib/plugins/plugin-name/
├── package.json          # 必需：插件元数据
├── index.js              # 必需：插件主入口文件
├── README.md             # 推荐：插件说明文档
├── lib/                  # 可选：插件库文件
│   ├── api.js           # API 封装
│   ├── parser.js        # 数据解析器
│   └── utils.js         # 工具函数
├── tools/                # 必需：工具目录
│   ├── tool1.js         # 工具实现
│   ├── tool2.js
│   └── ...
├── tests/                # 推荐：测试文件
│   ├── plugin.test.js
│   └── tools.test.js
└── docs/                 # 可选：详细文档
    ├── api.md
    └── examples.md
```

### 文件命名规范

- 插件目录：使用 kebab-case（如：web-plugin、mcp-plugin）
- 文件名：使用 camelCase（如：parseWebPage.js、makeRequest.js）
- 类名：使用 PascalCase（如：WebPlugin、ParseWebPage）

## 基础类说明

### Plugin 基类

Plugin 基类提供了插件的核心功能：

#### 必需实现的方法

```javascript
class YourPlugin extends Plugin {
  // 必需：返回插件目录路径
  getFilePath() {
    const __filename = fileURLToPath(import.meta.url)
    return path.dirname(__filename)
  }

  // 必需：返回默认配置
  getInitialConfig() {
    return {
      enabled: true,
      // 其他配置项
    }
  }
}
```

#### 可选重写的方法

```javascript
class YourPlugin extends Plugin {
  // 自定义工具加载逻辑
  async loadTools() {
    // 调用父类方法加载标准工具
    await super.loadTools()
    
    // 添加自定义逻辑
    await this.loadCustomTools()
  }

  // 自定义工具获取逻辑
  getTools() {
    // 返回 Map<string, Iterator<Tool>>
    const toolsMap = new Map()
    toolsMap.set(this.name, this.tools.values())
    return toolsMap
  }
}
```

#### 可用的属性和方法

```javascript
// 属性
this.name           // 插件名称
this.config         // 当前配置
this.tools          // 工具 Map
this.pluginPath     // 插件目录路径
this.toolsPath      // 工具目录路径
this.configPath     // 配置文件路径

// 方法
await this.getConfig()      // 获取最新配置
this.getMetaData()          // 获取插件元数据
await this.loadConfig()     // 重新加载配置
await this.loadTools()      // 重新加载工具
await this.destroy()        // 销毁插件
```

### MioFunction 基类

MioFunction 基类定义了工具的标准接口：

#### 构造函数参数

```javascript
super({
  name: 'toolName',           // 工具名称（必需）
  description: '工具描述',     // 工具描述（必需）
  parameters: {               // 参数定义（必需）
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: '参数描述'
      }
    },
    required: ['param1']
  },
  timeout: 30000             // 超时时间（可选，默认300秒）
})
```

#### 可用的方法

```javascript
// 获取插件配置
const config = this.getPluginConfig()

// 保存图片文件
const imageUrl = await this.getImgUrlFromBuffer(baseUrl, buffer)

// 保存文本文件
const fileUrl = this.saveTextFile(baseUrl, content, filename)

// 生成不同格式的工具定义
const openaiFormat = this.json('openai')
const claudeFormat = this.json('claude')
const geminiFormat = this.json('gemini')
```

## 工具开发

### 工具开发模式

#### 1. 简单工具模式

```javascript
export default class SimpleTool extends MioFunction {
  constructor() {
    super({
      name: 'simpleTool',
      description: '简单工具示例',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: '输入文本' }
        },
        required: ['text']
      }
    })
    this.func = this.process
  }

  async process(e) {
    const { text } = e.params
    return { result: text.toUpperCase() }
  }
}
```

#### 2. 复杂工具模式

```javascript
export default class ComplexTool extends MioFunction {
  constructor() {
    super({
      name: 'complexTool',
      description: '复杂工具示例',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL地址' },
          method: { 
            type: 'string', 
            enum: ['GET', 'POST'],
            description: 'HTTP方法' 
          },
          headers: {
            type: 'object',
            description: '请求头'
          }
        },
        required: ['url']
      }
    })
    this.func = this.makeRequest
  }

  async makeRequest(e) {
    const { url, method = 'GET', headers = {} } = e.params
    const config = this.getPluginConfig()
    
    try {
      // 参数验证
      this.validateParams(e.params)
      
      // 执行请求
      const response = await this.httpRequest(url, method, headers, config)
      
      // 处理响应
      return this.formatResponse(response)
      
    } catch (error) {
      logger.error(`[${this.name}] 请求失败:`, error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  validateParams(params) {
    if (!params.url || typeof params.url !== 'string') {
      throw new Error('URL参数无效')
    }
    
    try {
      new URL(params.url)
    } catch {
      throw new Error('URL格式无效')
    }
  }

  async httpRequest(url, method, headers, config) {
    const options = {
      method,
      headers: {
        'User-Agent': 'Mio-Chat-Plugin/1.0',
        ...headers
      },
      timeout: config.timeout || 30000
    }

    const response = await fetch(url, options)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    return response
  }

  formatResponse(response) {
    return {
      success: true,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data: response.body
    }
  }
}
```

### 参数定义规范

使用 JSON Schema 定义工具参数：

```javascript
parameters: {
  type: 'object',
  properties: {
    // 字符串参数
    text: {
      type: 'string',
      description: '文本内容',
      minLength: 1,
      maxLength: 1000
    },
    
    // 数字参数
    count: {
      type: 'number',
      description: '数量',
      minimum: 1,
      maximum: 100
    },
    
    // 枚举参数
    format: {
      type: 'string',
      enum: ['json', 'xml', 'csv'],
      description: '输出格式'
    },
    
    // 数组参数
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: '标签列表'
    },
    
    // 对象参数
    options: {
      type: 'object',
      properties: {
        timeout: { type: 'number' },
        retries: { type: 'number' }
      },
      description: '选项配置'
    }
  },
  required: ['text', 'format']
}
```

### 错误处理

```javascript
async execute(e) {
  try {
    // 参数验证
    if (!e.params.required_param) {
      throw new Error('缺少必需参数: required_param')
    }
    
    // 业务逻辑
    const result = await this.processData(e.params)
    
    return {
      success: true,
      data: result
    }
    
  } catch (error) {
    // 记录错误
    logger.error(`[${this.name}] 执行失败:`, error)
    
    // 返回标准错误格式
    return {
      success: false,
      error: {
        code: error.code || 'EXECUTION_ERROR',
        message: error.message,
        details: error.details || null
      }
    }
  }
}
```

## 配置管理

### 配置结构

插件配置存储在数据库中，支持热重载：

```javascript
getInitialConfig() {
  return {
    // 基础配置
    enabled: true,
    debug: false,
    
    // API 配置
    api: {
      baseUrl: 'https://api.example.com',
      apiKey: '',
      timeout: 30000,
      retries: 3
    },
    
    // 功能配置
    features: {
      caching: true,
      compression: false,
      rateLimit: {
        enabled: true,
        requests: 100,
        window: 60000
      }
    },
    
    // 自定义配置
    custom: {
      // 插件特定配置
    }
  }
}
```

### 配置访问

```javascript
// 在插件中访问配置
const config = await this.getConfig()
const apiKey = config.api?.apiKey

// 在工具中访问配置
const config = this.getPluginConfig()
const timeout = config.api?.timeout || 30000
```

### 配置验证

```javascript
async loadConfig() {
  await super.loadConfig()
  
  // 验证配置
  this.validateConfig(this.config)
}

validateConfig(config) {
  if (config.api?.baseUrl && !this.isValidUrl(config.api.baseUrl)) {
    throw new Error('无效的 API 基础URL')
  }
  
  if (config.api?.timeout && config.api.timeout < 1000) {
    logger.warn(`[${this.name}] 超时时间过短，建议至少1000ms`)
  }
}

isValidUrl(string) {
  try {
    new URL(string)
    return true
  } catch {
    return false
  }
}
```

## 最佳实践

### 1. 代码组织

```javascript
// 推荐的插件结构
export default class WellOrganizedPlugin extends Plugin {
  constructor() {
    super()
    this.apiClient = null
    this.cache = new Map()
  }

  async initialize() {
    await super.initialize()
    await this.initializeApiClient()
    await this.setupCache()
  }

  async initializeApiClient() {
    const config = await this.getConfig()
    this.apiClient = new ApiClient(config.api)
  }

  async setupCache() {
    // 缓存初始化逻辑
  }

  getFilePath() {
    return path.dirname(fileURLToPath(import.meta.url))
  }

  getInitialConfig() {
    return {
      enabled: true,
      api: {
        baseUrl: process.env.API_BASE_URL || 'https://api.example.com',
        apiKey: process.env.API_KEY || '',
        timeout: 30000
      }
    }
  }
}
```

### 2. 错误处理和日志

```javascript
async execute(e) {
  const startTime = Date.now()
  
  try {
    logger.info(`[${this.name}] 开始执行，参数:`, e.params)
    
    const result = await this.processRequest(e.params)
    
    const duration = Date.now() - startTime
    logger.info(`[${this.name}] 执行成功，耗时: ${duration}ms`)
    
    return result
    
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error(`[${this.name}] 执行失败，耗时: ${duration}ms`, error)
    
    // 根据错误类型返回不同的错误信息
    if (error.code === 'NETWORK_ERROR') {
      return {
        success: false,
        error: '网络连接失败，请稍后重试'
      }
    } else if (error.code === 'INVALID_PARAMS') {
      return {
        success: false,
        error: `参数错误: ${error.message}`
      }
    } else {
      return {
        success: false,
        error: '内部错误，请联系管理员'
      }
    }
  }
}
```

### 3. 性能优化

```javascript
export default class OptimizedTool extends MioFunction {
  constructor() {
    super({
      name: 'optimizedTool',
      description: '优化的工具示例',
      parameters: { /* ... */ }
    })
    
    // 缓存和连接池
    this.cache = new Map()
    this.requestQueue = []
    this.processing = false
  }

  async execute(e) {
    // 缓存检查
    const cacheKey = this.getCacheKey(e.params)
    if (this.cache.has(cacheKey)) {
      logger.debug(`[${this.name}] 缓存命中: ${cacheKey}`)
      return this.cache.get(cacheKey)
    }

    // 请求去重
    if (this.isDuplicateRequest(e.params)) {
      return this.waitForExistingRequest(e.params)
    }

    // 执行请求
    const result = await this.processRequest(e.params)
    
    // 缓存结果
    this.cache.set(cacheKey, result)
    
    // 清理过期缓存
    this.cleanupCache()
    
    return result
  }

  getCacheKey(params) {
    return JSON.stringify(params)
  }

  cleanupCache() {
    if (this.cache.size > 1000) {
      const entries = Array.from(this.cache.entries())
      const toDelete = entries.slice(0, 500)
      toDelete.forEach(([key]) => this.cache.delete(key))
    }
  }
}
```

### 4. 安全考虑

```javascript
async execute(e) {
  try {
    // 输入验证和清理
    const sanitizedParams = this.sanitizeParams(e.params)
    
    // 权限检查
    if (!this.hasPermission(e.context)) {
      throw new Error('权限不足')
    }
    
    // 速率限制
    if (!this.checkRateLimit(e.context.userId)) {
      throw new Error('请求过于频繁')
    }
    
    return await this.processRequest(sanitizedParams)
    
  } catch (error) {
    // 不要在错误信息中暴露敏感信息
    logger.error(`[${this.name}] 执行失败`, error)
    return {
      success: false,
      error: '请求处理失败'
    }
  }
}

sanitizeParams(params) {
  const sanitized = {}
  
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      // 清理潜在的恶意输入
      sanitized[key] = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}
```

## 调试和测试

### 1. 调试模式

```javascript
export default class DebuggableTool extends MioFunction {
  constructor() {
    super({
      name: 'debuggableTool',
      description: '可调试的工具',
      parameters: { /* ... */ }
    })
  }

  async execute(e) {
    const config = this.getPluginConfig()
    const isDebug = config.debug || global.debug
    
    if (isDebug) {
      logger.debug(`[${this.name}] 调试信息:`, {
        params: e.params,
        config: config,
        timestamp: new Date().toISOString()
      })
    }
    
    try {
      const result = await this.processRequest(e.params)
      
      if (isDebug) {
        logger.debug(`[${this.name}] 执行结果:`, result)
      }
      
      return result
      
    } catch (error) {
      if (isDebug) {
        logger.debug(`[${this.name}] 详细错误信息:`, {
          error: error.message,
          stack: error.stack,
          params: e.params
        })
      }
      throw error
    }
  }
}
```

### 2. 单元测试

```javascript
// tests/tools.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import ExampleTool from '../tools/exampleTool.js'

describe('ExampleTool', () => {
  let tool

  beforeEach(() => {
    tool = new ExampleTool()
  })

  it('should process input correctly', async () => {
    const result = await tool.execute({
      params: { input: 'test' }
    })

    expect(result.success).toBe(true)
    expect(result.data).toContain('test')
  })

  it('should handle invalid input', async () => {
    const result = await tool.execute({
      params: {}
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})
```

### 3. 集成测试

```javascript
// tests/plugin.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import YourPlugin from '../index.js'

describe('YourPlugin Integration', () => {
  let plugin

  beforeAll(async () => {
    plugin = new YourPlugin()
    await plugin.initialize()
  })

  afterAll(async () => {
    await plugin.destroy()
  })

  it('should load tools correctly', () => {
    const tools = plugin.getTools()
    expect(tools.size).toBeGreaterThan(0)
  })

  it('should have valid configuration', async () => {
    const config = await plugin.getConfig()
    expect(config).toBeDefined()
    expect(config.enabled).toBe(true)
  })
})
```

## 部署和分发

### 1. 插件打包

创建插件发布脚本：

```javascript
// scripts/build-plugin.js
import fs from 'fs'
import path from 'path'
import archiver from 'archiver'

async function buildPlugin(pluginName) {
  const pluginPath = path.join('lib/plugins', pluginName)
  const outputPath = path.join('dist', `${pluginName}.zip`)
  
  // 创建输出目录
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  
  // 创建压缩包
  const output = fs.createWriteStream(outputPath)
  const archive = archiver('zip', { zlib: { level: 9 } })
  
  archive.pipe(output)
  archive.directory(pluginPath, false)
  
  await archive.finalize()
  
  console.log(`插件 ${pluginName} 已打包到 ${outputPath}`)
}
```

### 2. 版本管理

在 package.json 中管理版本：

```json
{
  "name": "your-plugin-name",
  "version": "1.2.3",
  "description": "插件描述",
  "keywords": ["mio-chat", "plugin", "ai"],
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/your-plugin-name"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "axios": "^1.0.0"
  }
}
```

### 3. 文档和示例

创建完整的插件文档：

```markdown
# Your Plugin Name

## 安装

1. 将插件文件复制到 `lib/plugins/your-plugin-name/`
2. 重启 Mio-Chat 或调用重载 API
3. 在配置中启用插件

## 配置

```json
{
  "enabled": true,
  "api": {
    "baseUrl": "https://api.example.com",
    "apiKey": "your-api-key"
  }
}
```

## 工具列表

### exampleTool

描述工具功能和用法...

## 更新日志

### v1.2.3
- 修复了某个bug
- 添加了新功能

### v1.2.2
- 性能优化
```

## 常见问题

### Q: 插件无法加载怎么办？

1. 检查插件目录结构是否正确
2. 确认 package.json 格式正确
3. 查看日志中的错误信息
4. 确认所有必需方法都已实现

### Q: 工具无法被 LLM 调用？

1. 检查工具的 parameters 定义是否正确
2. 确认工具名称没有冲突
3. 验证工具的 execute 方法返回格式

### Q: 配置修改后不生效？

1. 配置修改会自动热重载
2. 如果不生效，可以调用重载 API
3. 检查配置格式是否正确

### Q: 如何调试插件？

1. 在配置中启用 debug 模式
2. 查看日志输出
3. 使用插件调试 API 进行测试

---

通过遵循本指南，你可以创建功能完整、性能良好、易于维护的 Mio-Chat 插件。如有问题，请参考现有插件的实现或提交 Issue。