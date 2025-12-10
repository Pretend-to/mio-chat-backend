# WebSocket Fetch API 使用指南

本文档介绍了如何使用前端的 `fetch` 方法通过 WebSocket 调用后端的管理员功能。

## 前端 fetch 方法说明

前端的 `fetch` 方法会将 URL 路径解析为 WebSocket 消息：

```javascript
fetch(url, data) {
  return new Promise((resolve, reject) => {
    const pathArray = url.split("/").filter(Boolean);
    const request = {
      request_id: randomString(16),
      protocol: pathArray[1],  // 路径的第2部分
      type: pathArray[2],      // 路径的第3部分
      id: pathArray[3],        // 路径的第4部分（可选）
      data: data,              // 请求体数据
      metaData: {
        contactorId: this.id,
      },
    };
    // ... 监听响应逻辑
    this.sendMessage(request);
  });
}
```

## API 端点

### 1. 调试工具

**URL**: `/admin/debug_tool`

**使用示例**:
```javascript
// 调试 web-plugin 的 fetch_url 工具
const response = await fetch('/admin/debug_tool', {
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
});

if (response.code === 0) {
  console.log('工具执行成功:', response.data);
  console.log('执行时间:', response.data.executionTime);
} else {
  console.error('工具执行失败:', response.message);
}
```

**请求参数**:
- `pluginName` (string): 插件名称
- `toolName` (string): 工具名称
- `parameters` (object): 工具参数
- `user` (object): 用户信息（可选）

**响应格式**:
```javascript
{
  code: 0,        // 0表示成功，非0表示失败
  message: '',    // 状态消息
  data: {
    success: true,               // 工具是否执行成功
    pluginName: 'web-plugin',    // 插件名称
    toolName: 'fetch_url',       // 工具名称
    executionTime: '1234ms',     // 执行时间
    timedOut: false,             // 是否超时
    result: {},                  // 工具执行结果
    error: null,                 // 错误信息（如果有）
    input: {}                    // 输入参数
  }
}
```

### 2. 刷新模型列表

**URL**: `/admin/refresh_models`

**使用示例**:

```javascript
// 刷新所有模型的模型列表
const response = await fetch('/admin/refresh_models', {});
```

```javascript
// 刷新指定类型的所有实例
const response = await fetch('/admin/refresh_models', {
  adapterType: 'openai'
});
```

```javascript
// 刷新指定的单个实例
const response = await fetch('/admin/refresh_models', {
  adapterType: 'openai',
  instanceId: 'openai-1'
});
```

**请求参数**:
- `adapterType` (string, 可选): 适配器类型（如 'openai', 'gemini', 'vertex', 'deepseek'）
- `instanceId` (string, 可选): 实例ID（需要配合 adapterType 使用）

**响应格式**:
```javascript
{
  code: 0,        // 0表示成功，非0表示失败
  message: '',    // 状态消息
  data: {
    success: true,               // 是否全部成功
    refreshResults: [            // 每个实例的刷新结果
      {
        adapterType: 'openai',
        instanceId: 'openai-1',
        displayName: 'openai-1',
        success: true,
        error: null
      },
      // ... 更多实例
    ],
    models: {},                  // 最新的模型列表
    providers: []                // 最新的提供商列表
  }
}
```

## 完整的前端集成示例

### React Hook 封装

```javascript
import { useState, useCallback } from 'react';

// 假设 fetch 方法已经在某个上下文中可用
function useAdminApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 调试工具
  const debugTool = useCallback(async (pluginName, toolName, parameters) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/admin/debug_tool', {
        pluginName,
        toolName,
        parameters,
        user: {
          isAdmin: true,
          userId: 'current-user'
        }
      });

      if (response.code === 0) {
        return response.data;
      } else {
        throw new Error(response.message);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 刷新模型列表
  const refreshModels = useCallback(async (adapterType, instanceId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/admin/refresh_models', {
        adapterType,
        instanceId
      });

      if (response.code === 0) {
        return response.data;
      } else {
        throw new Error(response.message);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    debugTool,
    refreshModels,
    loading,
    error
  };
}
```

### Vue 组合式 API

```javascript
import { ref } from 'vue';

export function useAdminApi() {
  const loading = ref(false);
  const error = ref(null);

  // 调试工具
  const debugTool = async (pluginName, toolName, parameters) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch('/admin/debug_tool', {
        pluginName,
        toolName,
        parameters,
        user: {
          isAdmin: true,
          userId: 'current-user'
        }
      });

      if (response.code === 0) {
        return response.data;
      } else {
        throw new Error(response.message);
      }
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // 刷新模型列表
  const refreshModels = async (adapterType, instanceId) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch('/admin/refresh_models', {
        adapterType,
        instanceId
      });

      if (response.code === 0) {
        return response.data;
      } else {
        throw new Error(response.message);
      }
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    debugTool,
    refreshModels,
    loading,
    error
  };
}
```

### 使用示例

```javascript
// 在组件中使用
function DebugPanel() {
  const { debugTool, refreshModels, loading, error } = useAdminApi();

  const handleDebugWebPlugin = async () => {
    try {
      const result = await debugTool('web-plugin', 'fetch_url', {
        url: 'https://api.github.com/repos/pretend-to/mio-chat-backend'
      });

      console.log('调试结果:', result.result);
      alert(`工具执行成功，耗时 ${result.executionTime}`);
    } catch (err) {
      alert(`调试失败: ${err.message}`);
    }
  };

  const handleRefreshAllModels = async () => {
    try {
      const result = await refreshModels();

      // 更新模型列表状态
      updateModelList(result.models);
      updateProviderList(result.providers);

      alert(`刷新完成: ${result.refreshResults.filter(r => r.success).length}/${result.refreshResults.length} 成功`);
    } catch (err) {
      alert(`刷新失败: ${err.message}`);
    }
  };

  const handleRefreshOpenAI = async () => {
    try {
      const result = await refreshModels('openai');

      console.log('OpenAI 模型已更新:', result.models);
      alert('OpenAI 模型列表已刷新');
    } catch (err) {
      alert(`刷新失败: ${err.message}`);
    }
  };

  if (error) {
    return <div className="error">错误: {error}</div>;
  }

  return (
    <div className="debug-panel">
      <h3>调试工具</h3>
      <button
        onClick={handleDebugWebPlugin}
        disabled={loading}
      >
        {loading ? '执行中...' : '调试 Web 插件'}
      </button>

      <h3>模型管理</h3>
      <button
        onClick={handleRefreshAllModels}
        disabled={loading}
      >
        {loading ? '刷新中...' : '刷新所有模型'}
      </button>
      <button
        onClick={handleRefreshOpenAI}
        disabled={loading}
      >
        {loading ? '刷新中...' : '刷新 OpenAI 模型'}
      </button>
    </div>
  );
}
```

## 错误处理

### 常见错误代码

- `code: 1` + `message: "需要管理员权限"` - 当前用户不是管理员
- `code: 1` + `message: "插件 xxx 不存在"` - 指定的插件未找到
- `code: 1` + `message: "工具 xxx 在插件 yyy 中不存在"` - 指定的工具未找到
- `code: 1` + `message: "参数验证失败"` - 提供的参数不符合工具的 schema

### 超时处理

工具调试有 5 分钟的超时限制：
```javascript
const result = await debugTool('plugin', 'tool', parameters);
if (result.timedOut) {
  console.error('工具执行超时');
}
```

### 权限检查

确保只有管理员用户才能调用这些 API：
```javascript
// 在调用前检查用户权限
if (!user.isAdmin) {
  alert('需要管理员权限');
  return;
}
```

## 最佳实践

1. **加载状态管理**: 始终显示加载状态，避免重复提交
2. **错误提示**: 为用户提供清晰的错误反馈
3. **批量操作**: 使用单个请求刷新所有模型，而不是逐个刷新
4. **参数验证**: 在发送前尽量验证参数格式
5. **结果缓存**: 考虑缓存模型列表，避免频繁刷新

## 调试技巧

1. **查看浏览器开发者工具**: 在 Network 面板中查看 WebSocket 消息
2. **服务器日志**: 查看服务器日志了解详细的执行信息
3. **使用 try-catch**: 始终包裹异步调用以捕获错误
4. **逐步测试**: 先测试简单的工具，再测试复杂的工具