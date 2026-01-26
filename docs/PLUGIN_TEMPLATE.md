# Mio-Chat 插件模板

本文档提供了创建 Mio-Chat 插件的标准模板和代码示例。

## 基础插件模板

### 目录结构

```
lib/plugins/example-plugin/
├── package.json
├── index.js
├── README.md
├── lib/
│   ├── api.js
│   └── utils.js
├── tools/
│   ├── basicTool.js
│   ├── advancedTool.js
│   └── asyncTool.js
└── tests/
    ├── plugin.test.js
    └── tools.test.js
```

### package.json 模板

```json
{
  "name": "example-plugin",
  "version": "1.0.0",
  "description": "Mio-Chat 示例插件",
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "main": "index.js",
  "type": "module",
  "keywords": [
    "mio-chat",
    "plugin",
    "ai",
    "llm"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "cheerio": "^1.0.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0"
  },
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch"
  }
}
```

### 插件主文件模板 (index.js)

```javascript
import Plugin from '../../plugin.js'
import path from 'path'
import { fileURLToPath } from 'url'
import ApiClient from './lib/api.js'
import { validateConfig, formatError } from './lib/utils.js'

/**
 * 示例插件类
 * 展示了插件开发的最佳实践
 */
export default class ExamplePlugin extends Plugin {
  constructor() {
    super()
    this.apiClient = null
    this.cache = new Map()
    this.rateLimiter = new Map()
  }

  /**
   * 获取插件文件路径
   * @returns {string} 插件目录路径
   */
  getFilePath() {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    return __dirname
  }

  /**
   * 获取初始配置
   * @returns {Object} 默认配置对象
   */
  getInitialConfig() {
    return {
      // 基础配置
      enabled: true,
      debug: false,
      
      // API 配置
      api: {
        baseUrl: process.env.EXAMPLE_API_URL || 'https://api.example.com',
        apiKey: process.env.EXAMPLE_API_KEY || '',
        timeout: 30000,
        retries: 3,
        rateLimit: {
          requests: 100,
          window: 60000 // 1分钟
        }
      },
      
      // 缓存配置
      cache: {
        enabled: true,
        ttl: 300000, // 5分钟
        maxSize: 1000
      },
      
      // 功能开关
      features: {
        advancedMode: false,
        experimentalFeatures: false
      }
    }
  }

  /**
   * 插件初始化
   */
  async initialize() {
    await super.initialize()
    
    try {
      await this.initializeApiClient()
      await this.setupCache()
      this.setupRateLimiter()
      
      logger.info(`[${this.name}] 插件初始化完成`)
    } catch (error) {
      logger.error(`[${this.name}] 插件初始化失败:`, error)
      throw error
    }
  }

  /**
   * 初始化 API 客户端
   */
  async initializeApiClient() {
    const config = await this.getConfig()
    
    if (!config.api.apiKey) {
      logger.warn(`[${this.name}] 未配置 API Key，某些功能可能不可用`)
    }
    
    this.apiClient = new ApiClient({
      baseUrl: config.api.baseUrl,
      apiKey: config.api.apiKey,
      timeout: config.api.timeout,
      retries: config.api.retries
    })
  }

  /**
   * 设置缓存
   */
  async setupCache() {
    const config = await this.getConfig()
    
    if (config.cache.enabled) {
      // 定期清理过期缓存
      setInterval(() => {
        this.cleanupCache()
      }, 60000) // 每分钟清理一次
    }
  }

  /**
   * 设置速率限制器
   */
  setupRateLimiter() {
    // 定期重置速率限制计数器
    setInterval(() => {
      this.rateLimiter.clear()
    }, 60000) // 每分钟重置
  }

  /**
   * 清理过期缓存
   */
  cleanupCache() {
    const config = this.config
    const now = Date.now()
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > config.cache.ttl) {
        this.cache.delete(key)
      }
    }
    
    // 如果缓存过大，删除最旧的条目
    if (this.cache.size > config.cache.maxSize) {
      const entries = Array.from(this.cache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      const toDelete = entries.slice(0, this.cache.size - config.cache.maxSize)
      toDelete.forEach(([key]) => this.cache.delete(key))
    }
  }

  /**
   * 检查速率限制
   * @param {string} userId 用户ID
   * @returns {boolean} 是否允许请求
   */
  checkRateLimit(userId) {
    const config = this.config
    const now = Date.now()
    const userRequests = this.rateLimiter.get(userId) || []
    
    // 清理过期的请求记录
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < config.api.rateLimit.window
    )
    
    if (validRequests.length >= config.api.rateLimit.requests) {
      return false
    }
    
    validRequests.push(now)
    this.rateLimiter.set(userId, validRequests)
    return true
  }

  /**
   * 配置验证
   */
  async loadConfig() {
    await super.loadConfig()
    
    try {
      validateConfig(this.config)
      logger.debug(`[${this.name}] 配置验证通过`)
    } catch (error) {
      logger.error(`[${this.name}] 配置验证失败:`, error)
      throw error
    }
  }

  /**
   * 插件销毁
   */
  async destroy() {
    logger.info(`[${this.name}] 正在销毁插件...`)
    
    // 清理资源
    this.cache.clear()
    this.rateLimiter.clear()
    
    if (this.apiClient) {
      await this.apiClient.destroy()
    }
    
    await super.destroy()
    logger.info(`[${this.name}] 插件已销毁`)
  }
}
```

## 工具模板

### 基础工具模板

```javascript
// tools/basicTool.js
import { MioFunction } from '../../../function.js'

/**
 * 基础工具示例
 * 展示了工具开发的基本模式
 */
export default class BasicTool extends MioFunction {
  constructor() {
    super({
      name: 'basicTool',
      description: '基础工具示例，用于演示基本的工具开发模式',
      parameters: {
        type: 'object',
        properties: {
          input: {
            type: 'string',
            description: '输入文本',
            minLength: 1,
            maxLength: 1000
          },
          format: {
            type: 'string',
            enum: ['uppercase', 'lowercase', 'capitalize'],
            description: '文本格式化方式',
            default: 'uppercase'
          }
        },
        required: ['input']
      },
      timeout: 10000 // 10秒超时
    })
    this.func = this.execute
  }

  /**
   * 工具执行方法
   * @param {Object} e 执行上下文
   * @param {Object} e.params 工具参数
   * @returns {Object} 执行结果
   */
  async execute(e) {
    const startTime = Date.now()
    
    try {
      // 参数验证
      this.validateParams(e.params)
      
      // 获取插件配置
      const config = this.getPluginConfig()
      
      // 执行业务逻辑
      const result = await this.processText(e.params, config)
      
      // 记录执行时间
      const duration = Date.now() - startTime
      logger.debug(`[${this.name}] 执行完成，耗时: ${duration}ms`)
      
      return {
        success: true,
        data: result,
        metadata: {
          duration,
          timestamp: new Date().toISOString()
        }
      }
      
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error(`[${this.name}] 执行失败，耗时: ${duration}ms`, error)
      
      return {
        success: false,
        error: {
          code: error.code || 'EXECUTION_ERROR',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * 参数验证
   * @param {Object} params 工具参数
   */
  validateParams(params) {
    if (!params.input || typeof params.input !== 'string') {
      const error = new Error('input 参数必须是非空字符串')
      error.code = 'INVALID_PARAMS'
      throw error
    }
    
    if (params.input.length > 1000) {
      const error = new Error('input 参数长度不能超过1000字符')
      error.code = 'PARAMS_TOO_LONG'
      throw error
    }
  }

  /**
   * 处理文本
   * @param {Object} params 工具参数
   * @param {Object} config 插件配置
   * @returns {Object} 处理结果
   */
  async processText(params, config) {
    const { input, format = 'uppercase' } = params
    
    let processedText
    
    switch (format) {
      case 'uppercase':
        processedText = input.toUpperCase()
        break
      case 'lowercase':
        processedText = input.toLowerCase()
        break
      case 'capitalize':
        processedText = input.charAt(0).toUpperCase() + input.slice(1).toLowerCase()
        break
      default:
        processedText = input
    }
    
    return {
      original: input,
      processed: processedText,
      format: format,
      length: processedText.length
    }
  }
}
```

### 高级工具模板

```javascript
// tools/advancedTool.js
import { MioFunction } from '../../../function.js'

/**
 * 高级工具示例
 * 展示了复杂工具的开发模式，包括缓存、重试、错误处理等
 */
export default class AdvancedTool extends MioFunction {
  constructor() {
    super({
      name: 'advancedTool',
      description: '高级工具示例，展示复杂的业务逻辑处理',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            format: 'uri',
            description: '要处理的URL地址'
          },
          options: {
            type: 'object',
            properties: {
              timeout: {
                type: 'number',
                minimum: 1000,
                maximum: 60000,
                description: '请求超时时间（毫秒）'
              },
              retries: {
                type: 'number',
                minimum: 0,
                maximum: 5,
                description: '重试次数'
              },
              useCache: {
                type: 'boolean',
                description: '是否使用缓存'
              }
            },
            description: '请求选项'
          }
        },
        required: ['url']
      },
      timeout: 60000 // 60秒超时
    })
    this.func = this.execute
  }

  async execute(e) {
    const { url, options = {} } = e.params
    const config = this.getPluginConfig()
    
    try {
      // 参数验证和清理
      const validatedParams = this.validateAndSanitizeParams({ url, options })
      
      // 检查缓存
      if (options.useCache !== false && config.cache?.enabled) {
        const cached = this.getCachedResult(validatedParams)
        if (cached) {
          logger.debug(`[${this.name}] 缓存命中: ${url}`)
          return cached
        }
      }
      
      // 执行请求
      const result = await this.processRequest(validatedParams, config)
      
      // 缓存结果
      if (options.useCache !== false && config.cache?.enabled) {
        this.cacheResult(validatedParams, result)
      }
      
      return result
      
    } catch (error) {
      logger.error(`[${this.name}] 处理失败:`, error)
      
      return {
        success: false,
        error: {
          code: error.code || 'PROCESSING_ERROR',
          message: this.sanitizeErrorMessage(error.message),
          url: url
        }
      }
    }
  }

  /**
   * 参数验证和清理
   */
  validateAndSanitizeParams(params) {
    const { url, options } = params
    
    // URL 验证
    try {
      new URL(url)
    } catch {
      const error = new Error('无效的URL格式')
      error.code = 'INVALID_URL'
      throw error
    }
    
    // 选项验证和默认值
    const validatedOptions = {
      timeout: options.timeout || 30000,
      retries: options.retries || 3,
      useCache: options.useCache !== false
    }
    
    return { url, options: validatedOptions }
  }

  /**
   * 处理请求
   */
  async processRequest(params, config) {
    const { url, options } = params
    let lastError
    
    for (let attempt = 0; attempt <= options.retries; attempt++) {
      try {
        if (attempt > 0) {
          logger.info(`[${this.name}] 重试请求 (${attempt}/${options.retries}): ${url}`)
          await this.delay(Math.pow(2, attempt) * 1000) // 指数退避
        }
        
        const response = await this.makeRequest(url, options, config)
        
        return {
          success: true,
          data: response,
          metadata: {
            url: url,
            attempts: attempt + 1,
            timestamp: new Date().toISOString()
          }
        }
        
      } catch (error) {
        lastError = error
        
        // 某些错误不需要重试
        if (error.code === 'INVALID_URL' || error.code === 'FORBIDDEN') {
          break
        }
      }
    }
    
    throw lastError
  }

  /**
   * 发起HTTP请求
   */
  async makeRequest(url, options, config) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), options.timeout)
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mio-Chat-Plugin/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      })
      
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
        error.code = response.status >= 400 && response.status < 500 ? 'CLIENT_ERROR' : 'SERVER_ERROR'
        throw error
      }
      
      const contentType = response.headers.get('content-type') || ''
      let data
      
      if (contentType.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }
      
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        data: data
      }
      
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * 获取缓存结果
   */
  getCachedResult(params) {
    const plugin = this.parentPlugin
    if (!plugin || !plugin.cache) return null
    
    const cacheKey = this.getCacheKey(params)
    const cached = plugin.cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < plugin.config.cache.ttl) {
      return cached.result
    }
    
    return null
  }

  /**
   * 缓存结果
   */
  cacheResult(params, result) {
    const plugin = this.parentPlugin
    if (!plugin || !plugin.cache) return
    
    const cacheKey = this.getCacheKey(params)
    plugin.cache.set(cacheKey, {
      result: result,
      timestamp: Date.now()
    })
  }

  /**
   * 生成缓存键
   */
  getCacheKey(params) {
    return `${this.name}:${JSON.stringify(params)}`
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 清理错误信息，避免泄露敏感信息
   */
  sanitizeErrorMessage(message) {
    // 移除可能的敏感信息
    return message.replace(/api[_-]?key[=:]\s*[^\s&]+/gi, 'api_key=***')
                 .replace(/token[=:]\s*[^\s&]+/gi, 'token=***')
                 .replace(/password[=:]\s*[^\s&]+/gi, 'password=***')
  }
}
```

### 异步工具模板

```javascript
// tools/asyncTool.js
import { MioFunction } from '../../../function.js'
import { EventEmitter } from 'events'

/**
 * 异步工具示例
 * 展示了长时间运行任务的处理模式
 */
export default class AsyncTool extends MioFunction {
  constructor() {
    super({
      name: 'asyncTool',
      description: '异步工具示例，用于处理长时间运行的任务',
      parameters: {
        type: 'object',
        properties: {
          taskType: {
            type: 'string',
            enum: ['download', 'process', 'analyze'],
            description: '任务类型'
          },
          data: {
            type: 'object',
            description: '任务数据'
          },
          callback: {
            type: 'string',
            description: '回调URL（可选）'
          }
        },
        required: ['taskType', 'data']
      },
      timeout: 300000 // 5分钟超时
    })
    this.func = this.execute
    this.taskEmitter = new EventEmitter()
  }

  async execute(e) {
    const { taskType, data, callback } = e.params
    
    try {
      // 生成任务ID
      const taskId = this.generateTaskId()
      
      // 启动异步任务
      this.startAsyncTask(taskId, taskType, data, callback)
      
      return {
        success: true,
        taskId: taskId,
        status: 'started',
        message: '任务已启动，正在后台处理'
      }
      
    } catch (error) {
      logger.error(`[${this.name}] 任务启动失败:`, error)
      
      return {
        success: false,
        error: {
          code: 'TASK_START_ERROR',
          message: error.message
        }
      }
    }
  }

  /**
   * 启动异步任务
   */
  async startAsyncTask(taskId, taskType, data, callback) {
    try {
      logger.info(`[${this.name}] 启动任务: ${taskId}`)
      
      // 根据任务类型执行不同的处理逻辑
      let result
      switch (taskType) {
        case 'download':
          result = await this.handleDownloadTask(taskId, data)
          break
        case 'process':
          result = await this.handleProcessTask(taskId, data)
          break
        case 'analyze':
          result = await this.handleAnalyzeTask(taskId, data)
          break
        default:
          throw new Error(`未知的任务类型: ${taskType}`)
      }
      
      // 任务完成
      await this.onTaskComplete(taskId, result, callback)
      
    } catch (error) {
      logger.error(`[${this.name}] 任务执行失败: ${taskId}`, error)
      await this.onTaskError(taskId, error, callback)
    }
  }

  /**
   * 处理下载任务
   */
  async handleDownloadTask(taskId, data) {
    const { url, filename } = data
    
    // 模拟下载过程
    for (let progress = 0; progress <= 100; progress += 10) {
      await this.delay(500) // 模拟下载时间
      
      this.taskEmitter.emit('progress', {
        taskId,
        progress,
        message: `下载进度: ${progress}%`
      })
    }
    
    return {
      type: 'download',
      filename: filename,
      size: Math.floor(Math.random() * 1000000),
      url: `/downloads/${filename}`
    }
  }

  /**
   * 处理数据处理任务
   */
  async handleProcessTask(taskId, data) {
    const { input, algorithm } = data
    
    // 模拟处理过程
    const steps = ['预处理', '分析', '计算', '后处理', '生成结果']
    
    for (let i = 0; i < steps.length; i++) {
      await this.delay(1000)
      
      this.taskEmitter.emit('progress', {
        taskId,
        progress: Math.round((i + 1) / steps.length * 100),
        message: `正在${steps[i]}...`
      })
    }
    
    return {
      type: 'process',
      algorithm: algorithm,
      result: `处理结果: ${JSON.stringify(input).length} 字符已处理`,
      metrics: {
        processingTime: steps.length * 1000,
        dataSize: JSON.stringify(input).length
      }
    }
  }

  /**
   * 处理分析任务
   */
  async handleAnalyzeTask(taskId, data) {
    const { content, analysisType } = data
    
    // 模拟分析过程
    await this.delay(2000)
    
    this.taskEmitter.emit('progress', {
      taskId,
      progress: 50,
      message: '正在分析内容...'
    })
    
    await this.delay(2000)
    
    this.taskEmitter.emit('progress', {
      taskId,
      progress: 100,
      message: '分析完成'
    })
    
    return {
      type: 'analyze',
      analysisType: analysisType,
      summary: `内容分析完成，共${content.length}字符`,
      insights: [
        '发现3个关键主题',
        '情感倾向: 中性',
        '复杂度: 中等'
      ]
    }
  }

  /**
   * 任务完成处理
   */
  async onTaskComplete(taskId, result, callback) {
    logger.info(`[${this.name}] 任务完成: ${taskId}`)
    
    const completeData = {
      taskId,
      status: 'completed',
      result: result,
      completedAt: new Date().toISOString()
    }
    
    this.taskEmitter.emit('complete', completeData)
    
    // 如果有回调URL，发送通知
    if (callback) {
      await this.sendCallback(callback, completeData)
    }
  }

  /**
   * 任务错误处理
   */
  async onTaskError(taskId, error, callback) {
    logger.error(`[${this.name}] 任务失败: ${taskId}`, error)
    
    const errorData = {
      taskId,
      status: 'failed',
      error: {
        code: error.code || 'TASK_ERROR',
        message: error.message
      },
      failedAt: new Date().toISOString()
    }
    
    this.taskEmitter.emit('error', errorData)
    
    // 如果有回调URL，发送错误通知
    if (callback) {
      await this.sendCallback(callback, errorData)
    }
  }

  /**
   * 发送回调通知
   */
  async sendCallback(callbackUrl, data) {
    try {
      await fetch(callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      
      logger.debug(`[${this.name}] 回调通知已发送: ${callbackUrl}`)
      
    } catch (error) {
      logger.error(`[${this.name}] 回调通知发送失败:`, error)
    }
  }

  /**
   * 生成任务ID
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

## 辅助库模板

### API 客户端模板

```javascript
// lib/api.js
import logger from '../../../../utils/logger.js'

/**
 * API 客户端类
 * 提供统一的API调用接口
 */
export default class ApiClient {
  constructor(config) {
    this.baseUrl = config.baseUrl
    this.apiKey = config.apiKey
    this.timeout = config.timeout || 30000
    this.retries = config.retries || 3
  }

  /**
   * 发起GET请求
   */
  async get(endpoint, params = {}) {
    const url = new URL(endpoint, this.baseUrl)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })
    
    return this.request('GET', url.toString())
  }

  /**
   * 发起POST请求
   */
  async post(endpoint, data = {}) {
    const url = new URL(endpoint, this.baseUrl).toString()
    
    return this.request('POST', url, {
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  /**
   * 通用请求方法
   */
  async request(method, url, options = {}) {
    let lastError
    
    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        if (attempt > 0) {
          await this.delay(Math.pow(2, attempt) * 1000)
        }
        
        const response = await fetch(url, {
          method,
          timeout: this.timeout,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'User-Agent': 'Mio-Chat-Plugin/1.0',
            ...options.headers
          },
          ...options
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          return await response.json()
        } else {
          return await response.text()
        }
        
      } catch (error) {
        lastError = error
        logger.warn(`API请求失败 (尝试 ${attempt + 1}/${this.retries}):`, error.message)
      }
    }
    
    throw lastError
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 销毁客户端
   */
  async destroy() {
    // 清理资源
  }
}
```

### 工具函数模板

```javascript
// lib/utils.js

/**
 * 配置验证函数
 */
export function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('配置必须是一个对象')
  }
  
  if (config.api) {
    if (!config.api.baseUrl) {
      throw new Error('API baseUrl 不能为空')
    }
    
    try {
      new URL(config.api.baseUrl)
    } catch {
      throw new Error('API baseUrl 格式无效')
    }
  }
  
  if (config.cache && config.cache.enabled) {
    if (typeof config.cache.ttl !== 'number' || config.cache.ttl < 0) {
      throw new Error('缓存TTL必须是非负数')
    }
  }
}

/**
 * 错误格式化函数
 */
export function formatError(error) {
  return {
    code: error.code || 'UNKNOWN_ERROR',
    message: error.message || '未知错误',
    timestamp: new Date().toISOString()
  }
}

/**
 * 数据清理函数
 */
export function sanitizeData(data) {
  if (typeof data === 'string') {
    return data.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeData)
  }
  
  if (data && typeof data === 'object') {
    const sanitized = {}
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeData(value)
    }
    return sanitized
  }
  
  return data
}

/**
 * 缓存键生成函数
 */
export function generateCacheKey(prefix, params) {
  const paramString = JSON.stringify(params, Object.keys(params).sort())
  return `${prefix}:${Buffer.from(paramString).toString('base64')}`
}

/**
 * 重试函数
 */
export async function retry(fn, options = {}) {
  const {
    retries = 3,
    delay = 1000,
    backoff = 2,
    shouldRetry = () => true
  } = options
  
  let lastError
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      if (attempt === retries || !shouldRetry(error)) {
        break
      }
      
      await new Promise(resolve => 
        setTimeout(resolve, delay * Math.pow(backoff, attempt))
      )
    }
  }
  
  throw lastError
}
```

这些模板提供了创建 Mio-Chat 插件的完整框架，包括了最佳实践、错误处理、缓存、重试机制等功能。开发者可以基于这些模板快速创建功能完整的插件。