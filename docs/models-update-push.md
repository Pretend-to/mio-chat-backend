# 模型更新推送机制

当服务端的模型列表发生变化时（如添加/删除/更新适配器、刷新模型列表等），系统会主动向所有连接的客户端推送更新消息。

## 推送格式

```javascript
{
  protocol: 'system',
  type: 'models_updated',
  data: {
    providers: [
      { displayName: 'openai-1', adapterType: 'openai' },
      { displayName: 'gemini-1', adapterType: 'gemini' },
      // ... 更多提供商
    ],
    models: {
      'openai-1': ['gpt-4', 'gpt-3.5-turbo', ...],
      'gemini-1': ['gemini-pro', 'gemini-pro-vision', ...],
      // ... 更多模型列表
    },
    default_model: {
      'openai-1': 'gpt-4',
      'gemini-1': 'gemini-pro',
      // ... 每个提供商的默认模型
    },
    timestamp: '2024-01-01T12:00:00.000Z'
  }
}
```

## 前端监听实现

### Socket.IO 客户端

```javascript
import io from 'socket.io-client'

const socket = io('http://localhost:3000', {
  auth: {
    accessCode: 'your-access-code'
  }
})

// 监听模型更新
socket.on('models_update', (message) => {
  console.log('收到模型更新:', message)

  if (message.type === 'models_updated') {
    const { providers, models, default_model, timestamp } = message.data

    // 更新本地状态
    updateProviders(providers)
    updateModels(models)
    updateDefaultModels(default_model)

    // 可以根据需要显示通知
    showNotification('模型列表已更新', 'info')
  }
})

// 更新默认模型
function updateDefaultModels(defaultModels) {
  // defaultModels 是一个对象，键为 displayName，值为默认模型名称
  // 格式: { 'provider-name': 'default-model' }
  console.log('更新默认模型:', defaultModels)

  // 更新到你的状态管理
  // 例如：this.setState({ defaultModels })
  // 或：store.commit('setDefaultModels', defaultModels)
}

// 更新提供商列表
function updateProviders(providers) {
  // providers 是提供商对象数组
  // 格式: [{ displayName, adapterType }]
  console.log('更新提供商:', providers)

  // 更新到你的状态管理
  // 例如：this.setState({ providers })
  // 或：store.commit('setProviders', providers)
}

// 更新模型列表
function updateModels(models) {
  // models 是一个对象，键为 displayName，值为模型数组
  // 格式: { 'provider-name': ['model1', 'model2', ...] }
  console.log('更新模型列表:', models)

  // 更新到你的状态管理
  // 例如：this.setState({ models })
  // 或：store.commit('setModels', models)
}

function showNotification(message, type) {
  // 显示通知的实现
  console.log(`[${type}] ${message}`)
}
```

### Vue 组件示例

```vue
<template>
  <div>
    <h3>可用的 AI 提供商</h3>
    <ul>
      <li v-for="provider in providers" :key="provider.displayName">
        {{ provider.displayName }} ({{ provider.adapterType }})
      </li>
    </ul>

    <h3>模型列表</h3>
    <div v-for="(models, provider) in models" :key="provider">
      <h4>{{ provider }}</h4>
      <ul>
        <li v-for="model in models" :key="model">{{ model }}</li>
      </ul>
    </div>

    <div v-if="lastUpdate" class="update-info">
      最后更新时间: {{ new Date(lastUpdate).toLocaleString() }}
    </div>
  </div>
</template>

<script>
import io from 'socket.io-client'

export default {
  data() {
    return {
      socket: null,
      providers: [],
      models: {},
      lastUpdate: null
    }
  },

  created() {
    this.connectSocket()
    this.loadInitialData()
  },

  beforeDestroy() {
    if (this.socket) {
      this.socket.disconnect()
    }
  },

  methods: {
    connectSocket() {
      this.socket = io(process.env.VUE_APP_API_URL, {
        auth: {
          accessCode: localStorage.getItem('accessCode')
        }
      })

      // 监听模型更新
      this.socket.on('models_update', this.handleModelsUpdate)

      // 监听连接错误
      this.socket.on('connect_error', (error) => {
        console.error('Socket 连接失败:', error)
        this.$message.error('连接失败，请检查网络')
      })
    },

    handleModelsUpdate(message) {
      if (message.type === 'models_updated') {
        const { providers, models, timestamp } = message.data

        // 更新数据
        this.providers = providers
        this.models = models
        this.lastUpdate = timestamp

        // 显示通知
        this.$notify({
          title: '模型列表更新',
          message: '可用的模型列表已更新',
          type: 'info',
          duration: 3000
        })
      }
    },

    async loadInitialData() {
      // 初始加载当前的数据
      try {
        const response = await fetch('/api/base_info')
        const result = await response.json()

        if (result.code === 0) {
          this.providers = result.data.llm_providers
          this.lastUpdate = new Date().toISOString()

          // 需要单独获取模型列表
          const modelsResponse = await fetch('/api/openai/models')
          const modelsResult = await modelsResponse.json()
          if (modelsResult.code === 0) {
            this.models = modelsResult.data
          }
        }
      } catch (error) {
        console.error('加载初始数据失败:', error)
      }
    }
  }
}
</script>

<style scoped>
.update-info {
  margin-top: 20px;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 14px;
  color: #666;
}
</style>
```

### React Hook 示例

```jsx
import { useEffect, useState } from 'react'
import io from 'socket.io-client'
import { notification } from 'antd'

export function useModelsUpdate() {
  const [providers, setProviders] = useState([])
  const [models, setModels] = useState({})
  const [defaultModels, setDefaultModels] = useState({})
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL, {
      auth: {
        accessCode: localStorage.getItem('accessCode')
      }
    })

    // 监听模型更新
    const handleModelsUpdate = (message) => {
      if (message.type === 'models_updated') {
        const { providers: newProviders, models: newModels, default_model: newDefaultModels, timestamp } = message.data

        setProviders(newProviders)
        setModels(newModels)
        setDefaultModels(newDefaultModels)
        setLastUpdate(timestamp)

        // 显示通知
        notification.info({
          message: '模型列表更新',
          description: '可用的模型列表已自动更新',
          duration: 3
        })
      }
    }

    socket.on('models_update', handleModelsUpdate)

    // 错误处理
    socket.on('connect_error', (error) => {
      console.error('Socket 连接失败:', error)
      notification.error({
        message: '连接失败',
        description: '无法连接到服务器，实时更新功能不可用'
      })
    })

    // 初始加载数据
    loadInitialData()

    return () => {
      socket.off('models_update', handleModelsUpdate)
      socket.disconnect()
    }
  }, [])

  const loadInitialData = async () => {
    try {
      const response = await fetch('/api/base_info')
      const result = await response.json()

      if (result.code === 0) {
        setProviders(result.data.llm_providers || [])
        setLastUpdate(new Date().toISOString())
      }
    } catch (error) {
      console.error('加载初始数据失败:', error)
    }
  }

  return {
    providers,
    models,
    defaultModels,
    lastUpdate,
    refresh: loadInitialData // 提供手动刷新功能
  }
}

// 在组件中使用
function ModelsManager() {
  const { providers, models, lastUpdate, refresh } = useModelsUpdate()

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button onClick={refresh}>手动刷新</button>
        {lastUpdate && (
          <span style={{ marginLeft: 16, color: '#666' }}>
            最后更新: {new Date(lastUpdate).toLocaleString()}
          </span>
        )}
      </div>

      <div>
        <h3>提供商</h3>
        <ul>
          {providers.map(p => (
            <li key={p.displayName}>
              {p.displayName} ({p.adapterType})
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3>模型列表</h3>
        {Object.entries(models).map(([provider, modelList]) => (
          <div key={provider}>
            <h4>{provider}</h4>
            <ul>
              {modelList.map(model => (
                <li key={model}>{model}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
```

## 何时会触发推送

以下操作会触发模型更新推送：

1. **添加适配器实例** - 通过 API 添加新的 LLM 适配器实例
2. **更新适配器实例** - 修改现有实例的配置（包括启用/禁用）
3. **删除适配器实例** - 删除某个适配器实例
4. **刷新模型列表** - 手动刷新一个或所有实例的模型列表
5. **热重载适配器** - 通过热重载功能重新加载所有适配器

## 注意事项

1. **连接要求** - 客户端必须正确连接 Socket.IO 并提供有效的访问码
2. **数据格式** - 推送的数据格式与 `/api/base_info` 接口返回的格式一致
3. **性能考虑** - 频繁的模型更新可能会影响性能，系统会合并短时间内的多次更新
4. **错误处理** - 如果连接断开，客户端不会收到更新，重连后需要手动刷新获取最新数据

## 调试技巧

1. **检查连接状态**:
   ```javascript
   console.log('Socket 连接状态:', socket.connected)
   ```

2. **监听所有事件**（调试用）:
   ```javascript
   socket.onAny((eventName, ...args) => {
     console.log(`收到事件: ${eventName}`, args)
   })
   ```

3. **查看服务端日志** - 服务端会记录推送日志：
   ```
   [broadcastModelUpdate] 已向所有客户端推送模型更新
   [热重载] 已向所有客户端推送模型更新
   ```