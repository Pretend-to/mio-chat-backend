# Socket.IO 管理员 API 使用指南

本文档介绍了通过 Socket.IO 进行工具调试和模型列表管理的 API。

## 连接要求

使用这些 API 需要管理员权限。确保在连接时提供正确的访问码。

## API 端点

### 1. 调试工具 (debug_tool)

调试指定的插件工具，用于测试工具的执行。

#### 请求格式
```javascript
socket.emit('message', JSON.stringify({
  request_id: 'unique-request-id',
  protocol: 'admin',
  data: {
    type: 'debug_tool',
    pluginName: '插件名称',
    toolName: '工具名称',
    parameters: {
      // 工具参数对象
    },
    user: {
      isAdmin: true,
      userId: 'user-id'
    }
  }
}))
```

#### 响应格式
```javascript
socket.on('debug_tool_response', (response) => {
  // 成功响应
  if (response.success) {
    console.log('工具执行成功:', response.result)
    console.log('执行时间:', response.executionTime)
  }
  // 失败响应
  else {
    console.error('工具执行失败:', response.error)
    if (response.timedOut) {
      console.error('执行超时')
    }
  }
})
```

#### 完整示例
```javascript
import io from 'socket.io-client'

// 连接到服务器
const socket = io('http://localhost:3000', {
  auth: {
    accessCode: 'admin-access-code' // 管理员访问码
  }
})

socket.on('connect', () => {
  console.log('已连接到服务器')

  // 调试 web-plugin 的 fetch_url 工具
  socket.emit('message', JSON.stringify({
    request_id: Date.now().toString(),
    protocol: 'admin',
    data: {
      type: 'debug_tool',
      pluginName: 'web-plugin',
      toolName: 'fetch_url',
      parameters: {
        url: 'https://api.github.com/repos/pretend-to/mio-chat-backend',
        method: 'GET'
      },
      user: {
        isAdmin: true,
        userId: 'admin'
      }
    }
  }))
})

// 监听调试响应
socket.on('debug_tool_response', (response) => {
  console.log('调试响应:', response)

  if (response.requestId) {
    // 根据 requestId 匹配请求和响应
    console.log('请求ID:', response.requestId)
  }
})
```

### 2. 刷新模型列表 (refresh_models)

重新获取指定适配器或所有适配器的模型列表。

#### 请求格式

##### 刷新所有模型的模型列表
```javascript
socket.emit('message', JSON.stringify({
  request_id: 'unique-request-id',
  protocol: 'admin',
  data: {
    type: 'refresh_models'
    // 不指定 adapterType 和 instanceId，刷新所有
  }
}))
```

##### 刷新指定类型的所有实例
```javascript
socket.emit('message', JSON.stringify({
  request_id: 'unique-request-id',
  protocol: 'admin',
  data: {
    type: 'refresh_models',
    adapterType: 'openai' // 或 'gemini', 'vertex', 'deepseek' 等
  }
}))
```

##### 刷新指定的单个实例
```javascript
socket.emit('message', JSON.stringify({
  request_id: 'unique-request-id',
  protocol: 'admin',
  data: {
    type: 'refresh_models',
    adapterType: 'openai',
    instanceId: 'openai-1' // 实例ID
  }
}))
```

#### 响应格式
```javascript
socket.on('refresh_models_response', (response) => {
  console.log('刷新结果:', response)

  if (response.success) {
    console.log('成功刷新的实例:')
    response.refreshResults.forEach(result => {
      if (result.success) {
        console.log(`- ${result.displayName} (${result.instanceId})`)
      } else {
        console.error(`- ${result.displayName} 失败: ${result.error}`)
      }
    })

    console.log('最新的模型列表:', response.models)
  } else {
    console.error('刷新失败:', response.error)
  }
})
```

#### 完整示例
```javascript
import io from 'socket.io-client'

const socket = io('http://localhost:3000', {
  auth: {
    accessCode: 'admin-access-code'
  }
})

socket.on('connect', () => {
  console.log('已连接到服务器')

  // 刷新所有模型列表
  socket.emit('message', JSON.stringify({
    request_id: 'refresh-all-models-' + Date.now(),
    protocol: 'admin',
    data: {
      type: 'refresh_models'
    }
  }))
})

socket.on('refresh_models_response', (response) => {
  console.log('模型列表刷新响应:', response)

  // 保存新的模型列表到状态管理
  if (response.success) {
    // 更新前端状态
    updateModelsState(response.models)
    updateProvidersState(response.providers)

    // 显示成功通知
    showNotification('模型列表刷新成功', 'success')
  } else {
    showNotification('模型列表刷新失败: ' + response.error, 'error')
  }
})

// 辅助函数
function updateModelsState(models) {
  // 将模型列表保存到 Vuex/Redux 或其他状态管理
  console.log('更新模型状态:', models)
}

function updateProvidersState(providers) {
  // 更新提供商列表
  console.log('更新提供商状态:', providers)
}

function showNotification(message, type) {
  // 显示通知
  console.log(`[${type}] ${message}`)
}
```

## 错误处理

所有响应都包含 `success` 字段来标识操作是否成功：

- `success: true` - 操作成功
- `success: false` - 操作失败，错误信息在 `error` 字段中

常见错误：
1. **权限错误**: 非管理员用户尝试访问管理员 API
2. **插件不存在**: 指定的插件名称未找到
3. **工具不存在**: 指定的工具在插件中未找到
4. **参数验证失败**: 提供的参数不符合工具的 schema
5. **执行超时**: 工具执行时间超过 5 分钟
6. **实例不存在**: 指定的实例 ID 不存在

## 注意事项

1. **权限管理**: 所有管理员 API 都需要管理员权限
2. **超时设置**: 工具调试有 5 分钟的超时限制
3. **并发执行**: 可以同时执行多个调试请求，每个请求使用唯一的 `request_id` 标识
4. **资源使用**: 某些工具可能会消耗较多资源，请谨慎使用
5. **日志记录**: 所有操作都会记录在服务器日志中

## 最佳实践

1. **使用 requestId**: 始终为每个请求提供唯一的 `request_id`，以便正确匹配响应
2. **错误处理**: 始终检查响应的 `success` 字段
3. **参数验证**: 在发送请求前，尽量验证参数格式
4. **状态更新**: 获取到新的模型列表后，及时更新前端状态
5. **用户反馈**: 在操作过程中提供适当的用户反馈（加载状态、成功/失败通知等）

## 示例：React Hook

```javascript
import { useEffect, useRef } from 'react'
import io from 'socket.io-client'

export function useSocketAdmin() {
  const socketRef = useRef(null)
  const pendingRequests = useRef(new Map())

  useEffect(() => {
    // 初始化 Socket.IO 连接
    socketRef.current = io('http://localhost:3000', {
      auth: {
        accessCode: localStorage.getItem('adminAccessCode')
      }
    })

    const socket = socketRef.current

    // 调试工具响应处理
    socket.on('debug_tool_response', (response) => {
      const { requestId } = response
      const resolver = pendingRequests.current.get(requestId)
      if (resolver) {
        pendingRequests.current.delete(requestId)
        resolver(response)
      }
    })

    // 刷新模型响应处理
    socket.on('refresh_models_response', (response) => {
      const { requestId } = response
      const resolver = pendingRequests.current.get(requestId)
      if (resolver) {
        pendingRequests.current.delete(requestId)
        resolver(response)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const debugTool = (pluginName, toolName, parameters) => {
    return new Promise((resolve) => {
      const requestId = 'debug-' + Date.now()
      pendingRequests.current.set(requestId, resolve)

      socketRef.current.emit('message', JSON.stringify({
        request_id: requestId,
        protocol: 'admin',
        data: {
          type: 'debug_tool',
          pluginName,
          toolName,
          parameters,
          user: {
            isAdmin: true,
            userId: 'current-user'
          }
        }
      }))
    })
  }

  const refreshModels = (adapterType, instanceId) => {
    return new Promise((resolve) => {
      const requestId = 'refresh-' + Date.now()
      pendingRequests.current.set(requestId, resolve)

      socketRef.current.emit('message', JSON.stringify({
        request_id: requestId,
        protocol: 'admin',
        data: {
          type: 'refresh_models',
          adapterType,
          instanceId
        }
      }))
    })
  }

  return {
    debugTool,
    refreshModels
  }
}
```

这个 Hook 可以在 React 组件中使用：

```javascript
function AdminPanel() {
  const { debugTool, refreshModels } = useSocketAdmin()

  const handleDebugTool = async () => {
    const result = await debugTool('web-plugin', 'fetch_url', {
      url: 'https://api.example.com'
    })

    if (result.success) {
      console.log('工具执行结果:', result.result)
    }
  }

  const handleRefreshModels = async () => {
    const result = await refreshModels()

    if (result.success) {
      console.log('模型列表已更新:', result.models)
    }
  }

  return (
    <div>
      <button onClick={handleDebugTool}>调试工具</button>
      <button onClick={handleRefreshModels}>刷新模型列表</button>
    </div>
  )
}
```