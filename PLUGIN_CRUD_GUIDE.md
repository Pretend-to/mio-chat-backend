# 插件 CRUD 快速上手指南

本指南介绍如何使用插件管理 API 实现插件的完整生命周期管理。

## 🎯 核心概念

### 什么是插件 CRUD？

插件 CRUD 是指通过 HTTP API 动态管理插件的能力：

- **Create (创建)**: 安装新插件 *(即将支持)*
- **Read (读取)**: 查看插件列表、详情、配置
- **Update (更新)**: 修改插件配置、启用/禁用状态
- **Delete (删除)**: 卸载插件 *(即将支持)*

### 为什么需要插件 CRUD？

✅ **零停机配置更新** - 修改插件配置无需重启服务  
✅ **动态工具管理** - 实时添加/删除 AI 工具能力  
✅ **可视化管理界面** - 前端可以构建插件管理面板  
✅ **自动化运维** - 通过 API 批量管理多个插件  

---

## 🚀 快速开始

### 前置条件

1. 服务已启动 (默认端口 3000)
2. 已配置管理员访问码 (`config/config/config.yaml` → `web.admin_access_code`)

### 基础示例

#### 1. 查看所有插件

```bash
curl "http://localhost:3000/api/plugins?admin_code=your_admin_code"
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "plugins": [
      {
        "name": "mcp-plugin",
        "enabled": true,
        "toolCount": 5
      },
      {
        "name": "web-plugin",
        "enabled": true,
        "toolCount": 3
      }
    ],
    "total": 2
  }
}
```

#### 2. 查看插件详情

```bash
curl "http://localhost:3000/api/plugins/mcp-plugin?admin_code=your_admin_code"
```

#### 3. 更新插件配置

```bash
curl -X PUT "http://localhost:3000/api/plugins/mcp-plugin/config?admin_code=your_admin_code" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "mcpServers": {
      "filesystem": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/your/path"]
      }
    }
  }'
```

#### 4. 重载插件

```bash
curl -X POST "http://localhost:3000/api/plugins/mcp-plugin/reload?admin_code=your_admin_code"
```

---

## 📋 常见场景

### 场景 0: 调试插件工具

在开发或排查问题时，可以直接调试工具执行：

**方法 1: 使用调试脚本（推荐）**

```bash
# 交互式输入参数
node scripts/debug-tool.js web-plugin web_search your_admin_code

# 按提示输入参数:
#   query (string) [必填] - 搜索关键词
#   > GitHub Copilot
#   limit (number) [可选] - 结果数量  
#   > 5
```

**方法 2: 使用 curl**

```bash
# 调试 web_search 工具
curl -X POST "http://localhost:3000/api/plugins/web-plugin/tools/web_search/debug?admin_code=your_admin_code" \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "query": "GitHub Copilot",
      "limit": 5
    }
  }'

# 返回结果包含执行时间和输出
# {
#   "code": 0,
#   "data": {
#     "success": true,
#     "executionTime": "1234ms",
#     "result": { ... },
#     "input": { "query": "GitHub Copilot", "limit": 5 }
#   }
# }
```

**调试失败示例（参数验证失败）**

```bash
curl -X POST "http://localhost:3000/api/plugins/web-plugin/tools/web_search/debug?admin_code=your_admin_code" \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "limit": "not-a-number"
    }
  }'

# 返回验证错误:
# {
#   "code": 1,
#   "message": "参数验证失败",
#   "data": {
#     "errors": [
#       {
#         "field": "query",
#         "message": "缺少必需参数: query",
#         "type": "required"
#       },
#       {
#         "field": "limit",
#         "message": "参数类型错误: 期望 number，实际 string",
#         "type": "type_mismatch"
#       }
#     ],
#     "schema": { ... }
#   }
# }
```

### 场景 1: 添加新的 MCP 服务器

假设你想为 MCP 插件添加一个新的搜索服务器：

**步骤**:

1. **获取当前配置**
```bash
curl "http://localhost:3000/api/plugins/mcp-plugin/config?admin_code=your_admin_code"
```

2. **更新配置（添加 brave-search）**
```bash
curl -X PUT "http://localhost:3000/api/plugins/mcp-plugin/config?admin_code=your_admin_code" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "mcpServers": {
      "filesystem": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
      },
      "brave-search": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-brave-search"],
        "env": {
          "BRAVE_API_KEY": "YOUR_API_KEY_HERE"
        }
      }
    }
  }'
```

3. **重载插件以连接新服务器**
```bash
curl -X POST "http://localhost:3000/api/plugins/mcp-plugin/reload?admin_code=your_admin_code"
```

4. **验证工具已加载**
```bash
curl "http://localhost:3000/api/plugins/mcp-plugin/tools?admin_code=your_admin_code"
```

### 场景 2: 临时禁用某个插件

假设你想临时禁用 web-plugin：

```bash
# 禁用插件
curl -X POST "http://localhost:3000/api/plugins/web-plugin/toggle?admin_code=your_admin_code" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# 验证状态
curl "http://localhost:3000/api/plugins?admin_code=your_admin_code" | jq '.data.plugins[] | select(.name=="web-plugin")'

# 重新启用
curl -X POST "http://localhost:3000/api/plugins/web-plugin/toggle?admin_code=your_admin_code" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

### 场景 3: 批量重载所有插件

适用于你更新了多个插件的代码或配置：

```bash
curl -X POST "http://localhost:3000/api/plugins/reload-all?admin_code=your_admin_code"
```

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "results": [
      {"name": "mcp-plugin", "success": true, "toolCount": 5},
      {"name": "web-plugin", "success": true, "toolCount": 3},
      {"name": "custom", "success": false, "error": "工具目录不存在"}
    ],
    "successCount": 2,
    "totalCount": 3
  }
}
```

---

## 🛠️ 使用测试脚本

项目提供了一个完整的测试脚本来验证所有 API：

```bash
# 安装依赖（如果需要）
npm install node-fetch

# 运行测试
node scripts/test-plugin-api.js your_admin_code http://localhost:3000
```

测试脚本会自动：
1. 列出所有插件
2. 获取第一个插件的详情
3. 查看配置和工具列表
4. 测试重载功能
5. 测试启用/禁用
6. 重载所有插件

---

## 💡 高级技巧

### 1. 在前端构建插件管理界面

```javascript
// 示例: React 组件

import { useState, useEffect } from 'react'

function PluginManager() {
  const [plugins, setPlugins] = useState([])
  const adminCode = 'your_admin_code'
  
  useEffect(() => {
    fetch(`/api/plugins?admin_code=${adminCode}`)
      .then(res => res.json())
      .then(data => setPlugins(data.data.plugins))
  }, [])
  
  const togglePlugin = async (pluginName, enabled) => {
    await fetch(`/api/plugins/${pluginName}/toggle?admin_code=${adminCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    })
    // 刷新列表
  }
  
  return (
    <div>
      {plugins.map(plugin => (
        <div key={plugin.name}>
          <h3>{plugin.displayName}</h3>
          <p>工具数量: {plugin.toolCount}</p>
          <button onClick={() => togglePlugin(plugin.name, !plugin.enabled)}>
            {plugin.enabled ? '禁用' : '启用'}
          </button>
        </div>
      ))}
    </div>
  )
}
```

### 2. 配置热更新的工作原理

```
修改配置文件 → chokidar 监听变化 → 触发 loadConfig() → 自动重载
```

但对于某些插件（如 MCP），需要手动调用 `/reload` 接口才能重新连接服务。

### 3. 监控插件状态

定期轮询插件列表，检查工具数量变化：

```javascript
setInterval(async () => {
  const res = await fetch(`/api/plugins?admin_code=${adminCode}`)
  const { plugins } = (await res.json()).data
  
  plugins.forEach(plugin => {
    if (plugin.toolCount === 0 && plugin.enabled) {
      console.warn(`插件 ${plugin.name} 已启用但没有工具！`)
    }
  })
}, 60000) // 每分钟检查一次
```

---

## 🔒 安全注意事项

1. **保护管理员验证码**
   - 不要在前端代码中硬编码
   - 使用环境变量或安全存储
   - 定期更换验证码

2. **仅在受信任的网络使用**
   - API 允许修改服务器配置
   - 建议仅在内网或 VPN 环境使用
   - 生产环境可结合 IP 白名单

3. **验证配置合法性**
   - 更新配置前验证 JSON 格式
   - 确保路径和命令安全
   - 备份原配置

---

## 📚 相关文档

- [完整 API 文档](./docs/plugin-api.md) - 所有接口的详细说明
- [插件开发指南](./README.md#插件开发指南) - 如何开发自定义插件
- [配置管理 API](./docs/config-api.md) - LLM 适配器配置管理

---

## ❓ 常见问题

### Q: 更新配置后为什么没有生效？

A: 配置更新分两种情况：
- **自动生效**: 配置文件由 chokidar 监听，会自动重载
- **需要手动重载**: 某些插件（如 MCP）需要调用 `/reload` 接口

建议在更新配置后，等待 600ms 然后调用 `/reload` 接口。

### Q: 如何知道插件支持哪些配置项？

A: 每个插件的配置结构不同，可以：
1. 查看 `config/plugins/<plugin-name>.json` 示例
2. 调用 `/api/plugins/<plugin-name>/config` 查看当前配置
3. 查阅插件源码中的 `getInitialConfig()` 方法

### Q: 重载插件会影响正在进行的对话吗？

A: 不会。重载只是刷新插件的工具列表，不会中断 LLM 的对话流程。

### Q: 可以动态安装新插件吗？

A: 当前版本需要手动将插件代码放到 `plugins/` 目录，然后调用 `/reload-all`。
未来版本会支持通过 API 安装 npm 包形式的插件。

---

## 🎉 总结

插件 CRUD API 让你可以：

- ✅ 动态管理插件配置
- ✅ 实时重载插件工具
- ✅ 构建可视化管理界面
- ✅ 实现零停机更新

立即尝试，让你的 AI 对话平台更加灵活强大！
