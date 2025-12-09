# 插件管理 API 文档

完整的插件 CRUD API，支持热更新，无需重启服务。

## 目录

- [概述](#概述)
- [认证](#认证)
- [API 接口](#api-接口)
  - [列出所有插件](#列出所有插件)
  - [获取插件详情](#获取插件详情)
  - [获取插件配置](#获取插件配置)
  - [更新插件配置](#更新插件配置)
  - [获取插件工具列表](#获取插件工具列表)
  - [调试工具执行](#调试工具执行)
  - [重载单个插件](#重载单个插件)
  - [重载所有插件](#重载所有插件)
  - [启用/禁用插件](#启用禁用插件)
- [错误码](#错误码)
- [使用示例](#使用示例)

---

## 概述

插件管理 API 提供了完整的插件生命周期管理功能，包括：

- **查看插件信息**：列出所有插件、查看详情、配置和工具
- **配置管理**：动态更新插件配置（热更新）
- **热重载**：不重启服务即可重载插件工具
- **启用控制**：动态启用/禁用插件

所有 API 都需要管理员权限认证。

---

## 认证

所有插件管理 API 都需要管理员验证码。通过以下两种方式之一提供：

1. **查询参数**：`?admin_code=your_admin_code`
2. **请求头**：`X-Admin-Code: your_admin_code`

管理员验证码在 `config/config/config.yaml` 的 `web.admin_access_code` 字段配置。

**示例**：
```bash
# 方式1: 查询参数
GET /api/plugins?admin_code=123456

# 方式2: 请求头
GET /api/plugins
X-Admin-Code: 123456
```

---

## API 接口

### 列出所有插件

获取所有已加载插件的列表和概览信息。

**请求**

```http
GET /api/plugins
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "plugins": [
      {
        "name": "mcp-plugin",
        "displayName": "mcp-plugin",
        "description": "MCP (Model Context Protocol) 客户端插件",
        "version": "1.0.0",
        "author": "Mio-Chat Team",
        "enabled": true,
        "toolCount": 5,
        "type": "standard",
        "hasConfig": true
      },
      {
        "name": "web-plugin",
        "displayName": "web-plugin",
        "description": "网页解析和搜索插件",
        "version": "1.0.0",
        "author": "Mio-Chat Team",
        "enabled": true,
        "toolCount": 3,
        "type": "standard",
        "hasConfig": true
      },
      {
        "name": "custom",
        "displayName": "custom",
        "description": "",
        "version": "unknown",
        "author": "unknown",
        "enabled": true,
        "toolCount": 2,
        "type": "custom",
        "hasConfig": true
      }
    ],
    "total": 3
  }
}
```

**字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 插件唯一标识 |
| `displayName` | string | 插件显示名称 |
| `description` | string | 插件描述 |
| `version` | string | 插件版本 |
| `author` | string | 插件作者 |
| `enabled` | boolean | 是否启用 |
| `toolCount` | number | 工具数量 |
| `type` | string | 插件类型（`standard` 或 `custom`） |
| `hasConfig` | boolean | 是否有配置文件 |

---

### 获取插件详情

获取指定插件的详细信息，包括配置、工具列表和路径信息。

**请求**

```http
GET /api/plugins/:pluginName
```

**路径参数**

- `pluginName` (string, required): 插件名称

**示例**

```http
GET /api/plugins/mcp-plugin
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "name": "mcp-plugin",
    "displayName": "mcp-plugin",
    "description": "MCP (Model Context Protocol) 客户端插件",
    "version": "1.0.0",
    "author": "Mio-Chat Team",
    "enabled": true,
    "config": {
      "enabled": true,
      "mcpServers": {
        "filesystem": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"]
        }
      }
    },
    "tools": [
      {
        "group": "filesystem",
        "tools": [
          {
            "name": "read_file",
            "description": "读取文件内容",
            "parameters": {
              "type": "object",
              "properties": {
                "path": {
                  "type": "string",
                  "description": "文件路径"
                }
              },
              "required": ["path"]
            }
          },
          {
            "name": "write_file",
            "description": "写入文件内容",
            "parameters": {
              "type": "object",
              "properties": {
                "path": {
                  "type": "string",
                  "description": "文件路径"
                },
                "content": {
                  "type": "string",
                  "description": "文件内容"
                }
              },
              "required": ["path", "content"]
            }
          }
        ]
      }
    ],
    "pluginPath": "/path/to/lib/plugins/mcp-plugin",
    "configPath": "/path/to/config/plugins/mcp-plugin.json",
    "toolsPath": "/path/to/lib/plugins/mcp-plugin/tools"
  }
}
```

---

### 获取插件配置

获取指定插件的当前配置。

**请求**

```http
GET /api/plugins/:pluginName/config
```

**示例**

```http
GET /api/plugins/mcp-plugin/config
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "enabled": true,
    "mcpServers": {
      "filesystem": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/files"]
      },
      "brave-search": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-brave-search"],
        "env": {
          "BRAVE_API_KEY": "your_api_key"
        }
      }
    }
  }
}
```

---

### 更新插件配置

更新指定插件的配置。配置会立即写入文件，并通过 chokidar 监听触发热更新。

**请求**

```http
PUT /api/plugins/:pluginName/config
Content-Type: application/json

{
  "enabled": true,
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/new/path"]
    }
  }
}
```

**请求体**

插件的完整配置对象（JSON格式）。结构因插件而异。

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "配置更新成功",
    "config": {
      "enabled": true,
      "mcpServers": {
        "filesystem": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-filesystem", "/new/path"]
        }
      }
    }
  }
}
```

**注意事项**

- 配置更新后会自动触发热更新（约600ms延迟）
- 对于 MCP 插件，更新配置后需要手动调用重载接口才能重新连接 MCP 服务器

---

### 获取插件工具列表

获取指定插件提供的所有工具。

**请求**

```http
GET /api/plugins/:pluginName/tools
```

**示例**

```http
GET /api/plugins/web-plugin/tools
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "pluginName": "web-plugin",
    "tools": [
      {
        "group": "web-plugin",
        "count": 3,
        "tools": [
          {
            "name": "web_search",
            "description": "搜索网页内容",
            "parameters": {
              "type": "object",
              "properties": {
                "query": {
                  "type": "string",
                  "description": "搜索关键词"
                }
              },
              "required": ["query"]
            }
          },
          {
            "name": "web_parse",
            "description": "解析网页内容",
            "parameters": {
              "type": "object",
              "properties": {
                "url": {
                  "type": "string",
                  "description": "网页URL"
                }
              },
              "required": ["url"]
            }
          },
          {
            "name": "web_screenshot",
            "description": "截取网页截图",
            "parameters": {
              "type": "object",
              "properties": {
                "url": {
                  "type": "string",
                  "description": "网页URL"
                }
              },
              "required": ["url"]
            }
          }
        ]
      }
    ],
    "totalCount": 3
  }
}
```

---

### 调试工具执行

直接调试执行插件工具，用于测试工具功能和参数验证。

**请求**

```http
POST /api/plugins/:pluginName/tools/:toolName/debug
Content-Type: application/json

{
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  },
  "user": {
    "isAdmin": true,
    "userId": "test-user"
  }
}
```

**路径参数**

- `pluginName` (string, required): 插件名称
- `toolName` (string, required): 工具名称

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `parameters` | object | 是 | 工具执行参数（根据工具 schema） |
| `user` | object | 否 | 模拟用户上下文（默认管理员） |

**执行上下文**

调试接口会自动构造完整的执行上下文:

- `params`: 传入的 parameters 对象
- `user.isAdmin`: 默认为 `true`
- `user.userId`: 默认为 `"debug-user"` (可自定义)
- `user.origin`: 自动从 HTTP 请求中获取,格式为 `protocol://host` (如 `http://localhost:7001`)
  - 用于需要 baseUrl 的工具(如图片上传、文件访问等)

**示例**

```http
POST /api/plugins/web-plugin/tools/web_search/debug
Content-Type: application/json

{
  "parameters": {
    "query": "GitHub Copilot",
    "limit": 5
  }
}
```

**成功响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "success": true,
    "pluginName": "web-plugin",
    "toolName": "web_search",
    "executionTime": "1234ms",
    "result": {
      "results": [
        {
          "title": "GitHub Copilot",
          "url": "https://github.com/features/copilot",
          "snippet": "..."
        }
      ]
    },
    "input": {
      "query": "GitHub Copilot",
      "limit": 5
    }
  }
}
```

**失败响应（参数验证失败）**

```json
{
  "code": 1,
  "message": "参数验证失败",
  "data": {
    "errors": [
      {
        "field": "query",
        "message": "缺少必需参数: query",
        "type": "required"
      },
      {
        "field": "limit",
        "message": "参数类型错误: 期望 number，实际 string",
        "type": "type_mismatch",
        "expected": "number",
        "actual": "string"
      }
    ],
    "schema": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "搜索关键词"
        },
        "limit": {
          "type": "number",
          "description": "结果数量"
        }
      },
      "required": ["query"]
    }
  }
}
```

**失败响应（执行错误）**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "success": false,
    "pluginName": "web-plugin",
    "toolName": "web_search",
    "executionTime": "523ms",
    "error": {
      "message": "Network timeout",
      "stack": "Error: Network timeout\n    at ..."
    },
    "input": {
      "query": "test"
    }
  }
}
```

**参数验证规则**

调试接口会自动验证以下内容：

1. **必需参数** - 检查 `required` 字段
2. **类型检查** - 验证 `string`, `number`, `integer`, `boolean`, `array`, `object`
3. **数组项类型** - 验证 `items.type`
4. **枚举值** - 检查 `enum` 约束
5. **字符串长度** - 验证 `minLength`, `maxLength`
6. **数值范围** - 验证 `minimum`, `maximum`

**使用场景**

1. **开发调试** - 测试新开发的工具
2. **参数验证** - 验证 schema 定义是否正确
3. **问题排查** - 快速定位工具执行问题
4. **性能测试** - 查看工具执行时间

**超时设置**

- 工具执行超时时间: **5分钟**
- 服务器超时时间: **6分钟**
- 如果工具执行超过5分钟，将返回超时错误
- 响应中会包含 `timedOut: true` 标识

**超时响应示例**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "success": false,
    "pluginName": "prodia-plugin",
    "toolName": "draw_image",
    "executionTime": "300000ms",
    "timedOut": true,
    "error": {
      "message": "工具执行超时 (>300秒)",
      "stack": "..."
    },
    "input": { ... }
  }
}
```
2. **参数验证** - 验证 schema 定义是否正确
3. **问题排查** - 快速定位工具执行问题
4. **性能测试** - 查看工具执行时间

---

### 重载单个插件

重新加载指定插件的工具（不重启服务）。适用于：

- 插件代码更新后
- 添加/删除工具文件后
- 配置更新需要重新初始化

**请求**

```http
POST /api/plugins/:pluginName/reload
```

**示例**

```http
POST /api/plugins/mcp-plugin/reload
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "插件重载成功",
    "pluginName": "mcp-plugin",
    "toolCount": 5
  }
}
```

**工作流程**

1. 调用插件的 `loadTools()` 方法
2. 调用插件的 `initialize()` 方法（如果存在）
3. 更新 LLM 适配器的插件引用
4. 返回新的工具数量

---

### 重载所有插件

重新加载所有插件的工具。适用于批量更新场景。

**请求**

```http
POST /api/plugins/reload-all
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "插件重载完成",
    "results": [
      {
        "name": "mcp-plugin",
        "success": true,
        "toolCount": 5
      },
      {
        "name": "web-plugin",
        "success": true,
        "toolCount": 3
      },
      {
        "name": "custom",
        "success": false,
        "error": "工具目录不存在"
      }
    ],
    "successCount": 2,
    "totalCount": 3
  }
}
```

---

### 启用/禁用插件

动态启用或禁用插件。禁用的插件不会提供工具给 LLM。

**请求**

```http
POST /api/plugins/:pluginName/toggle
Content-Type: application/json

{
  "enabled": false
}
```

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `enabled` | boolean | 是 | `true` 启用，`false` 禁用 |

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "插件已禁用",
    "pluginName": "web-plugin",
    "enabled": false
  }
}
```

**注意事项**

- 状态更新会写入配置文件
- 更新后会自动触发配置热更新
- 禁用插件不会卸载工具，只是标记为不可用

---

## 错误码

| HTTP状态码 | code | 说明 |
|-----------|------|------|
| 200 | 0 | 成功 |
| 401 | 1 | 未授权（缺少或错误的管理员验证码） |
| 404 | 1 | 插件不存在 |
| 500 | 1 | 服务器内部错误 |

**错误响应格式**

```json
{
  "code": 1,
  "message": "错误描述",
  "data": null
}
```

---

## 使用示例

### 示例 1: 查看所有插件并重载特定插件

```bash
# 1. 获取所有插件列表
curl -X GET "http://localhost:3000/api/plugins?admin_code=your_admin_code"

# 2. 查看 mcp-plugin 详情
curl -X GET "http://localhost:3000/api/plugins/mcp-plugin?admin_code=your_admin_code"

# 3. 重载 mcp-plugin
curl -X POST "http://localhost:3000/api/plugins/mcp-plugin/reload?admin_code=your_admin_code"
```

### 示例 2: 更新 MCP 插件配置并重载

```bash
# 1. 获取当前配置
curl -X GET "http://localhost:3000/api/plugins/mcp-plugin/config?admin_code=your_admin_code"

# 2. 更新配置（添加新的 MCP 服务器）
curl -X PUT "http://localhost:3000/api/plugins/mcp-plugin/config?admin_code=your_admin_code" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "mcpServers": {
      "filesystem": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/new/path"]
      },
      "brave-search": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-brave-search"],
        "env": {
          "BRAVE_API_KEY": "your_new_api_key"
        }
      }
    }
  }'

# 3. 重载插件以应用新配置
curl -X POST "http://localhost:3000/api/plugins/mcp-plugin/reload?admin_code=your_admin_code"
```

### 示例 3: 禁用/启用插件

```bash
# 禁用 web-plugin
curl -X POST "http://localhost:3000/api/plugins/web-plugin/toggle?admin_code=your_admin_code" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# 启用 web-plugin
curl -X POST "http://localhost:3000/api/plugins/web-plugin/toggle?admin_code=your_admin_code" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

### 示例 4: 批量重载所有插件

```bash
curl -X POST "http://localhost:3000/api/plugins/reload-all?admin_code=your_admin_code"
```

### 示例 5: JavaScript 客户端示例

```javascript
const ADMIN_CODE = 'your_admin_code'
const BASE_URL = 'http://localhost:3000'

// 获取所有插件
async function listPlugins() {
  const response = await fetch(`${BASE_URL}/api/plugins?admin_code=${ADMIN_CODE}`)
  const data = await response.json()
  return data.data.plugins
}

// 更新插件配置
async function updatePluginConfig(pluginName, config) {
  const response = await fetch(
    `${BASE_URL}/api/plugins/${pluginName}/config?admin_code=${ADMIN_CODE}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    }
  )
  return await response.json()
}

// 重载插件
async function reloadPlugin(pluginName) {
  const response = await fetch(
    `${BASE_URL}/api/plugins/${pluginName}/reload?admin_code=${ADMIN_CODE}`,
    {
      method: 'POST',
    }
  )
  return await response.json()
}

// 使用示例
async function updateMcpPlugin() {
  const plugins = await listPlugins()
  console.log('所有插件:', plugins)
  
  const newConfig = {
    enabled: true,
    mcpServers: {
      filesystem: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/new/path']
      }
    }
  }
  
  await updatePluginConfig('mcp-plugin', newConfig)
  console.log('配置已更新')
  
  await reloadPlugin('mcp-plugin')
  console.log('插件已重载')
}

updateMcpPlugin()
```

---

## 工作原理

### 热更新机制

插件系统使用 **chokidar** 监听文件变化：

1. **配置热更新**：
   - 监听 `config/plugins/*.json`
   - 检测到变化后自动调用 `loadConfig()`
   - 无需手动重载（除非需要重新初始化）

2. **工具热更新**：
   - 监听插件的 `tools/` 目录
   - 检测到 `.js` 文件变化后自动调用 `loadTools()`
   - 使用动态 import 和缓存破坏（timestamp query）

3. **防抖处理**：
   - 使用 500ms 防抖避免频繁重载
   - `awaitWriteFinish` 确保文件写入完成

### 与 LLM 适配器集成

每次插件重载后，会自动调用：

```javascript
global.middleware.llm.setPlugins(global.middleware.plugins)
```

确保 LLM 适配器使用最新的插件工具列表。

---

## 最佳实践

1. **配置更新流程**：
   ```
   更新配置 → 等待600ms → 重载插件（如需要）
   ```

2. **开发插件时**：
   - 将工具文件放在 `tools/` 目录
   - 文件变化会自动热更新
   - 复杂初始化逻辑放在 `initialize()` 方法

3. **生产环境**：
   - 使用 API 而非手动编辑文件
   - 先在测试环境验证配置
   - 重载前备份当前配置

4. **错误处理**：
   - 重载失败不会影响其他插件
   - 检查 `loadResults` 中的错误信息
   - 使用日志系统排查问题

---

## 相关文档

- [配置管理 API](./config-api.md) - LLM 适配器配置管理
- [插件开发指南](../README.md#插件开发指南) - 如何开发自定义插件
- [MCP 插件配置](../config/plugins/mcp-plugin.json) - MCP 插件配置示例
