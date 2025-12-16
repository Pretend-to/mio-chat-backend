# 实时日志查看器 API 使用指南

本文档介绍了通过 Socket.IO 进行实时日志查看、搜索、导出和配置管理的 API。

## 连接要求

使用这些 API 需要管理员权限。确保在连接时提供正确的访问码。

## API 端点

### 1. 订阅日志流 (subscribe)

订阅实时日志流，开始接收系统日志推送。

#### 请求格式
```javascript
socket.emit('message', JSON.stringify({
  request_id: 'unique-request-id',
  protocol: 'logs',
  type: 'subscribe',
  data: {
    level: 'INFO',                    // 日志级别: ERROR, WARN, MARK, INFO, DEBUG
    modules: ['llm', 'onebot'],       // 模块过滤，空数组表示所有模块
    realtime: true,                   // 是否实时推送
    bufferSize: 1000,                 // 缓冲区大小 (10-5000)
    searchQuery: 'keyword',           // 可选：搜索关键词
    timeRange: {                      // 可选：时间范围
      start: '2024-12-16T00:00:00Z',
      end: '2024-12-16T23:59:59Z'
    },
    sendHistory: true                 // 是否发送历史日志
  }
}))
```

#### 响应格式
```javascript
// 订阅成功响应
{
  request_id: 'unique-request-id',
  protocol: 'logs',
  type: 'SUBSCRIBED',
  success: true,
  data: {
    clientId: 'client-123',
    subscriberCount: 5,
    bufferStats: {
      size: 1000,
      count: 856,
      oldestTimestamp: '2024-12-16T10:00:00Z',
      newestTimestamp: '2024-12-16T10:30:00Z'
    },
    options: {
      level: 'INFO',
      modules: ['llm', 'onebot'],
      realtime: true,
      bufferSize: 1000
    }
  }
}

// 实时日志推送
{
  request_id: 'log_1734345600123_abc123def',
  protocol: 'logs',
  type: 'stream',
  data: {
    id: 'log_1734345600123',
    timestamp: '2024-12-16T10:30:00.123Z',
    level: 'INFO',
    module: 'llm',
    message: '收到来自用户的消息请求',
    caller: 'openai.js:197',
    ip: '192.168.1.100',
    extra: {
      userId: 'user123',
      model: 'gpt-4'
    }
  }
}
```

### 2. 取消订阅 (unsubscribe)

取消日志流订阅，停止接收日志推送。

#### 请求格式
```javascript
socket.emit('message', JSON.stringify({
  request_id: 'unique-request-id',
  protocol: 'logs',
  type: 'unsubscribe',
  data: {}
}))
```

#### 响应格式
```javascript
{
  request_id: 'unique-request-id',
  protocol: 'logs',
  type: 'UNSUBSCRIBED',
  success: true,
  data: {
    clientId: 'client-123'
  }
}
```

### 3. 搜索日志 (search)

搜索历史日志，支持关键词、时间范围、模块等多种过滤条件。

#### 请求格式
```javascript
socket.emit('message', JSON.stringify({
  request_id: 'unique-request-id',
  protocol: 'logs',
  type: 'search',
  data: {
    keyword: 'error',                 // 搜索关键词
    level: 'ERROR',                   // 日志级别过滤
    modules: ['llm'],                 // 模块过滤
    timeRange: {                      // 时间范围
      start: '2024-12-16T00:00:00Z',
      end: '2024-12-16T23:59:59Z'
    },
    page: 1,                          // 页码 (1-10000)
    pageSize: 50,                     // 每页大小 (1-200)
    sortBy: 'timestamp',              // 排序字段
    sortOrder: 'desc'                 // 排序顺序: asc, desc
  }
}))
```

#### 响应格式
```javascript
{
  request_id: 'unique-request-id',
  protocol: 'logs',
  type: 'SEARCH_RESULTS',
  success: true,
  data: {
    logs: [
      {
        id: 'log_1734345600123',
        timestamp: '2024-12-16T10:30:00.123Z',
        level: 'ERROR',
        module: 'llm',
        message: '连接到 OpenAI API 失败: <mark>error</mark> 401',  // 关键词已高亮
        caller: 'openai.js:45',
        ip: '192.168.1.100'
      }
    ],
    total: 156,                       // 总记录数
    page: 1,                          // 当前页
    pageSize: 50,                     // 每页大小
    totalPages: 4                     // 总页数
  }
}
```

### 4. 导出日志 (export)

导出日志到文件，支持 JSON、CSV、TXT 格式。

#### 请求格式
```javascript
socket.emit('message', JSON.stringify({
  request_id: 'unique-request-id',
  protocol: 'logs',
  type: 'export',
  data: {
    format: 'json',                   // 导出格式: json, csv, txt
    level: 'ERROR',                   // 日志级别过滤
    modules: ['llm', 'onebot'],       // 模块过滤
    keyword: 'error',                 // 关键词过滤
    timeRange: {                      // 时间范围
      start: '2024-12-16T00:00:00Z',
      end: '2024-12-16T23:59:59Z'
    },
    maxRecords: 10000,                // 最大导出记录数 (1-50000)
    includeMetadata: true             // 是否包含元数据
  }
}))
```

#### 响应格式
```javascript
// 导出开始响应
{
  request_id: 'unique-request-id',
  protocol: 'logs',
  type: 'EXPORT_STARTED',
  success: true,
  data: {
    exportId: 'export_1_1734345600123',
    message: '导出任务已开始，请等待完成通知'
  }
}

// 导出完成响应
{
  request_id: 'unique-request-id',
  protocol: 'logs',
  type: 'EXPORT_COMPLETED',
  success: true,
  data: {
    exportId: 'export_1_1734345600123',
    format: 'json',
    recordCount: 1256,
    size: 2048576,                    // 文件大小（字节）
    data: '{"metadata":{"exportedAt":"2024-12-16T10:30:00Z",...},"logs":[...]}',
    generatedAt: '2024-12-16T10:30:00Z'
  }
}
```

### 5. 配置管理 (config)

动态更新日志查看器配置。

#### 请求格式
```javascript
// 更新缓冲区大小
socket.emit('message', JSON.stringify({
  request_id: 'unique-request-id',
  protocol: 'logs',
  type: 'config',
  data: {
    type: 'bufferSize',
    value: 2000
  }
}))

// 更新刷新频率
socket.emit('message', JSON.stringify({
  request_id: 'unique-request-id',
  protocol: 'logs',
  type: 'config',
  data: {
    type: 'refreshRate',
    value: 1000                       // 毫秒
  }
}))

// 更新日志源
socket.emit('message', JSON.stringify({
  request_id: 'unique-request-id',
  protocol: 'logs',
  type: 'config',
  data: {
    type: 'logSources',
    value: ['llm', 'onebot', 'system']
  }
}))

// 更新过滤器设置
socket.emit('message', JSON.stringify({
  request_id: 'unique-request-id',
  protocol: 'logs',
  type: 'config',
  data: {
    type: 'filterSettings',
    value: {
      level: 'WARN',
      modules: ['llm'],
      searchQuery: 'error'
    }
  }
}))
```

#### 响应格式
```javascript
{
  request_id: 'unique-request-id',
  protocol: 'logs',
  type: 'CONFIG_UPDATED',
  success: true,
  data: {
    type: 'bufferSize',
    value: 2000,
    message: '缓冲区大小已更新'
  }
}
```

### 6. 获取统计信息 (stats)

获取日志系统的统计信息。

#### 请求格式
```javascript
socket.emit('message', JSON.stringify({
  request_id: 'unique-request-id',
  protocol: 'logs',
  type: 'stats',
  data: {}
}))
```

#### 响应格式
```javascript
{
  request_id: 'unique-request-id',
  protocol: 'logs',
  type: 'LOG_STATS',
  success: true,
  data: {
    service: {
      totalLogsSent: 15678,
      totalSubscriptions: 25,
      activeSubscriptions: 3,
      startTime: '2024-12-16T08:00:00Z',
      lastLogTime: '2024-12-16T10:30:00Z',
      uptime: 9000000                 // 毫秒
    },
    buffer: {
      size: 1000,
      count: 856,
      oldestTimestamp: '2024-12-16T10:00:00Z',
      newestTimestamp: '2024-12-16T10:30:00Z'
    },
    subscriptions: [
      {
        clientId: 'client-123',
        options: {
          level: 'INFO',
          modules: ['llm'],
          realtime: true
        },
        subscribedAt: '2024-12-16T10:15:00Z',
        logsSent: 234,
        duration: 900000
      }
    ]
  }
}
```

### 7. 心跳检测 (heartbeat)

维持连接活跃状态。

#### 请求格式
```javascript
socket.emit('message', JSON.stringify({
  request_id: 'unique-request-id',
  protocol: 'logs',
  type: 'heartbeat',
  data: {
    timestamp: Date.now()
  }
}))
```

#### 响应格式
```javascript
{
  request_id: 'unique-request-id',
  protocol: 'logs',
  type: 'heartbeat',
  success: true,
  data: {
    timestamp: 1734345600123,
    clientId: 'client-123'
  }
}
```

## 完整使用示例

### 基础日志查看器实现

```javascript
import io from 'socket.io-client'

class LogViewer {
  constructor(accessCode) {
    this.socket = io('http://localhost:3000', {
      auth: { accessCode }
    })
    
    this.logs = []
    this.isSubscribed = false
    this.setupEventListeners()
  }

  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('已连接到日志服务器')
    })

    this.socket.on('message', (message) => {
      const data = JSON.parse(message)
      
      if (data.protocol === 'logs') {
        this.handleLogMessage(data)
      }
    })
  }

  handleLogMessage(data) {
    switch (data.type) {
      case 'SUBSCRIBED':
        this.isSubscribed = true
        console.log('订阅成功:', data.data)
        break
        
      case 'stream':
        this.addLog(data.data)
        break
        
      case 'SEARCH_RESULTS':
        this.displaySearchResults(data.data)
        break
        
      case 'EXPORT_COMPLETED':
        this.downloadExport(data.data)
        break
        
      case 'ERROR':
        console.error('日志API错误:', data.error)
        break
    }
  }

  // 订阅日志流
  subscribe(options = {}) {
    const defaultOptions = {
      level: 'INFO',
      modules: [],
      realtime: true,
      bufferSize: 1000,
      sendHistory: true
    }

    this.socket.emit('message', JSON.stringify({
      request_id: this.generateRequestId(),
      protocol: 'logs',
      type: 'subscribe',
      data: { ...defaultOptions, ...options }
    }))
  }

  // 取消订阅
  unsubscribe() {
    this.socket.emit('message', JSON.stringify({
      request_id: this.generateRequestId(),
      protocol: 'logs',
      type: 'unsubscribe',
      data: {}
    }))
    this.isSubscribed = false
  }

  // 搜索日志
  search(query) {
    this.socket.emit('message', JSON.stringify({
      request_id: this.generateRequestId(),
      protocol: 'logs',
      type: 'search',
      data: query
    }))
  }

  // 导出日志
  export(options) {
    this.socket.emit('message', JSON.stringify({
      request_id: this.generateRequestId(),
      protocol: 'logs',
      type: 'export',
      data: options
    }))
  }

  // 更新配置
  updateConfig(type, value) {
    this.socket.emit('message', JSON.stringify({
      request_id: this.generateRequestId(),
      protocol: 'logs',
      type: 'config',
      data: { type, value }
    }))
  }

  // 获取统计信息
  getStats() {
    this.socket.emit('message', JSON.stringify({
      request_id: this.generateRequestId(),
      protocol: 'logs',
      type: 'stats',
      data: {}
    }))
  }

  // 添加日志到本地缓存
  addLog(log) {
    this.logs.push(log)
    
    // 限制本地缓存大小
    if (this.logs.length > 1000) {
      this.logs.shift()
    }
    
    // 触发UI更新
    this.onLogAdded?.(log)
  }

  // 显示搜索结果
  displaySearchResults(results) {
    console.log(`找到 ${results.total} 条日志`)
    this.onSearchResults?.(results)
  }

  // 下载导出文件
  downloadExport(exportData) {
    const blob = new Blob([exportData.data], {
      type: this.getContentType(exportData.format)
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs_${exportData.generatedAt}.${exportData.format}`
    a.click()
    
    URL.revokeObjectURL(url)
  }

  getContentType(format) {
    const types = {
      json: 'application/json',
      csv: 'text/csv',
      txt: 'text/plain'
    }
    return types[format] || 'text/plain'
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// 使用示例
const logViewer = new LogViewer('your-admin-access-code')

// 设置事件回调
logViewer.onLogAdded = (log) => {
  console.log('新日志:', log)
  // 更新UI显示
}

logViewer.onSearchResults = (results) => {
  console.log('搜索结果:', results)
  // 显示搜索结果
}

// 订阅所有INFO级别以上的日志
logViewer.subscribe({
  level: 'INFO',
  modules: ['llm', 'onebot'],
  realtime: true
})

// 搜索错误日志
logViewer.search({
  keyword: 'error',
  level: 'ERROR',
  page: 1,
  pageSize: 50
})

// 导出最近的错误日志
logViewer.export({
  format: 'json',
  level: 'ERROR',
  maxRecords: 1000,
  timeRange: {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24小时前
    end: new Date().toISOString()
  }
})
```

### React Hook 实现

```javascript
import { useState, useEffect, useRef, useCallback } from 'react'
import io from 'socket.io-client'

export function useLogViewer(accessCode) {
  const [logs, setLogs] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [stats, setStats] = useState(null)
  
  const socketRef = useRef(null)
  const pendingRequests = useRef(new Map())

  useEffect(() => {
    // 初始化Socket连接
    socketRef.current = io('http://localhost:3000', {
      auth: { accessCode }
    })

    const socket = socketRef.current

    socket.on('connect', () => {
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      setIsSubscribed(false)
    })

    socket.on('message', (message) => {
      const data = JSON.parse(message)
      
      if (data.protocol === 'logs') {
        handleLogMessage(data)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [accessCode])

  const handleLogMessage = useCallback((data) => {
    const { request_id, type } = data

    // 处理有请求ID的响应
    if (request_id && pendingRequests.current.has(request_id)) {
      const resolver = pendingRequests.current.get(request_id)
      pendingRequests.current.delete(request_id)
      resolver(data)
      return
    }

    // 处理实时日志流
    switch (type) {
      case 'SUBSCRIBED':
        setIsSubscribed(true)
        break
        
      case 'UNSUBSCRIBED':
        setIsSubscribed(false)
        break
        
      case 'stream':
        setLogs(prev => {
          const newLogs = [...prev, data.data]
          // 限制本地缓存大小
          return newLogs.length > 1000 ? newLogs.slice(-1000) : newLogs
        })
        break
    }
  }, [])

  const sendRequest = useCallback((type, data) => {
    return new Promise((resolve) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      pendingRequests.current.set(requestId, resolve)

      socketRef.current.emit('message', JSON.stringify({
        request_id: requestId,
        protocol: 'logs',
        type,
        data
      }))
    })
  }, [])

  const subscribe = useCallback((options = {}) => {
    const defaultOptions = {
      level: 'INFO',
      modules: [],
      realtime: true,
      bufferSize: 1000,
      sendHistory: true
    }

    return sendRequest('subscribe', { ...defaultOptions, ...options })
  }, [sendRequest])

  const unsubscribe = useCallback(() => {
    return sendRequest('unsubscribe', {})
  }, [sendRequest])

  const search = useCallback((query) => {
    return sendRequest('search', query)
  }, [sendRequest])

  const exportLogs = useCallback((options) => {
    return sendRequest('export', options)
  }, [sendRequest])

  const updateConfig = useCallback((type, value) => {
    return sendRequest('config', { type, value })
  }, [sendRequest])

  const getStats = useCallback(async () => {
    const response = await sendRequest('stats', {})
    if (response.success) {
      setStats(response.data)
    }
    return response
  }, [sendRequest])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  return {
    // 状态
    logs,
    isConnected,
    isSubscribed,
    stats,
    
    // 方法
    subscribe,
    unsubscribe,
    search,
    exportLogs,
    updateConfig,
    getStats,
    clearLogs
  }
}
```

### Vue Composition API 实现

```javascript
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import io from 'socket.io-client'

export function useLogViewer(accessCode) {
  const logs = ref([])
  const isConnected = ref(false)
  const isSubscribed = ref(false)
  const stats = ref(null)
  
  let socket = null
  const pendingRequests = new Map()

  const handleLogMessage = (data) => {
    const { request_id, type } = data

    // 处理有请求ID的响应
    if (request_id && pendingRequests.has(request_id)) {
      const resolver = pendingRequests.get(request_id)
      pendingRequests.delete(request_id)
      resolver(data)
      return
    }

    // 处理实时日志流
    switch (type) {
      case 'SUBSCRIBED':
        isSubscribed.value = true
        break
        
      case 'UNSUBSCRIBED':
        isSubscribed.value = false
        break
        
      case 'stream':
        logs.value.push(data.data)
        // 限制本地缓存大小
        if (logs.value.length > 1000) {
          logs.value.shift()
        }
        break
    }
  }

  const sendRequest = (type, data) => {
    return new Promise((resolve) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      pendingRequests.set(requestId, resolve)

      socket.emit('message', JSON.stringify({
        request_id: requestId,
        protocol: 'logs',
        type,
        data
      }))
    })
  }

  const subscribe = (options = {}) => {
    const defaultOptions = {
      level: 'INFO',
      modules: [],
      realtime: true,
      bufferSize: 1000,
      sendHistory: true
    }

    return sendRequest('subscribe', { ...defaultOptions, ...options })
  }

  const unsubscribe = () => {
    return sendRequest('unsubscribe', {})
  }

  const search = (query) => {
    return sendRequest('search', query)
  }

  const exportLogs = (options) => {
    return sendRequest('export', options)
  }

  const updateConfig = (type, value) => {
    return sendRequest('config', { type, value })
  }

  const getStats = async () => {
    const response = await sendRequest('stats', {})
    if (response.success) {
      stats.value = response.data
    }
    return response
  }

  const clearLogs = () => {
    logs.value = []
  }

  onMounted(() => {
    socket = io('http://localhost:3000', {
      auth: { accessCode }
    })

    socket.on('connect', () => {
      isConnected.value = true
    })

    socket.on('disconnect', () => {
      isConnected.value = false
      isSubscribed.value = false
    })

    socket.on('message', (message) => {
      const data = JSON.parse(message)
      
      if (data.protocol === 'logs') {
        handleLogMessage(data)
      }
    })
  })

  onUnmounted(() => {
    if (socket) {
      socket.disconnect()
    }
  })

  return {
    // 响应式状态
    logs,
    isConnected,
    isSubscribed,
    stats,
    
    // 方法
    subscribe,
    unsubscribe,
    search,
    exportLogs,
    updateConfig,
    getStats,
    clearLogs
  }
}
```

## 错误处理

所有响应都包含 `success` 字段来标识操作是否成功：

### 常见错误代码

| 错误代码 | 描述 | 解决方案 |
|---------|------|----------|
| `PERMISSION_DENIED` | 权限不足，只有管理员可以访问 | 确保使用管理员访问码 |
| `INVALID_PARAMS` | 请求参数无效 | 检查参数格式和取值范围 |
| `SUBSCRIPTION_FAILED` | 订阅失败 | 检查订阅参数，重试订阅 |
| `NOT_SUBSCRIBED` | 客户端未订阅日志流 | 先调用订阅接口 |
| `SEARCH_FAILED` | 搜索失败 | 检查搜索参数，简化搜索条件 |
| `EXPORT_FAILED` | 导出失败 | 减少导出记录数，检查过滤条件 |
| `CONFIG_UPDATE_FAILED` | 配置更新失败 | 检查配置类型和值 |
| `INVALID_CONFIG_TYPE` | 不支持的配置类型 | 使用支持的配置类型 |
| `UNKNOWN_TYPE` | 未知的消息类型 | 检查消息类型拼写 |
| `INTERNAL_ERROR` | 服务器内部错误 | 重试请求，联系管理员 |

### 错误响应格式

```javascript
{
  request_id: 'unique-request-id',
  protocol: 'logs',
  type: 'ERROR',
  success: false,
  error: {
    code: 'PERMISSION_DENIED',
    message: '权限不足，只有管理员可以查看日志'
  }
}
```

## 参数限制

| 参数 | 类型 | 限制 | 默认值 |
|------|------|------|--------|
| `level` | string | ERROR, WARN, MARK, INFO, DEBUG | INFO |
| `bufferSize` | number | 10-5000 | 1000 |
| `page` | number | 1-10000 | 1 |
| `pageSize` | number | 1-200 | 50 |
| `maxRecords` | number | 1-50000 | 10000 |
| `modules` | array | 任意字符串数组 | [] |
| `format` | string | json, csv, txt | json |

## 性能优化建议

1. **合理设置缓冲区大小**: 根据系统资源和需求调整 `bufferSize`
2. **使用模块过滤**: 只订阅需要的模块日志，减少网络传输
3. **分页查询**: 搜索大量日志时使用分页，避免一次性加载过多数据
4. **定期清理**: 定期清理前端日志缓存，避免内存泄漏
5. **批量导出**: 导出大量日志时分批进行，避免超时

## 安全注意事项

1. **访问控制**: 确保只有授权的管理员可以访问日志API
2. **敏感信息**: 导出的日志可能包含敏感信息，注意保护
3. **审计日志**: 所有敏感操作都会记录审计日志
4. **会话管理**: 定期检查会话有效性，及时处理过期会话

## 最佳实践

1. **错误处理**: 始终检查响应的 `success` 字段
2. **请求ID**: 为每个请求提供唯一的 `request_id`
3. **连接管理**: 正确处理连接断开和重连
4. **内存管理**: 限制前端日志缓存大小
5. **用户体验**: 提供加载状态和操作反馈
6. **性能监控**: 监控日志流量和系统性能