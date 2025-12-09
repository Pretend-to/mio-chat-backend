# 插件 CRUD 系统架构图

## 系统架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        插件 CRUD 管理系统                              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         API 层 (HTTP)                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  GET    /api/plugins                    → 列出所有插件                │
│  GET    /api/plugins/:name              → 获取插件详情                │
│  GET    /api/plugins/:name/config       → 获取插件配置                │
│  PUT    /api/plugins/:name/config       → 更新插件配置                │
│  GET    /api/plugins/:name/tools        → 获取工具列表                │
│  POST   /api/plugins/:name/reload       → 重载单个插件                │
│  POST   /api/plugins/:name/toggle       → 启用/禁用插件              │
│  POST   /api/plugins/reload-all         → 重载所有插件                │
│                                                                       │
│  ✅ 需要管理员验证码 (admin_code)                                      │
│  ✅ 标准化响应格式 (makeStandardResponse)                             │
│  ✅ 统一错误处理                                                       │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    控制器层 (pluginController.js)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  • listPlugins()           - 聚合插件元数据                           │
│  • getPlugin()             - 收集详细信息                             │
│  • getPluginConfig()       - 读取配置文件                             │
│  • updatePluginConfig()    - 写入配置 + 触发热更新                    │
│  • getPluginTools()        - 遍历工具 Map                            │
│  • reloadPlugin()          - 调用 middleware.reloadPlugin()          │
│  • togglePlugin()          - 更新 enabled 字段                       │
│  • reloadAllPlugins()      - 调用 middleware.reloadAllPlugins()      │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    中间件层 (global.middleware)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  this.plugins = []           - 插件实例数组                           │
│                                                                       │
│  async reloadAllPlugins()    - 遍历 plugins 调用 loadTools()         │
│  async reloadPlugin(name)    - 查找插件并重载                         │
│                                                                       │
│  每次重载后调用:                                                       │
│  → this.llm.setPlugins(this.plugins)   更新 LLM 工具列表             │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    插件基类 (lib/plugin.js)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  this.tools = new Map()         - 工具存储                            │
│  this.config = {}               - 插件配置                            │
│  this.configPath                - 配置文件路径                        │
│  this.toolsPath                 - 工具目录路径                        │
│                                                                       │
│  async loadTools()              - 扫描 tools/ 目录                    │
│    ├─ 动态 import(fileUrl?t=timestamp)   缓存破坏                     │
│    ├─ 实例化工具类                                                    │
│    └─ 更新 tools Map                                                 │
│                                                                       │
│  loadConfig()                   - 读取/创建配置文件                   │
│    ├─ 检查 configPath 是否存在                                        │
│    ├─ 不存在则创建默认配置                                            │
│    └─ 加载到 this.config                                             │
│                                                                       │
│  _setupWatchers()               - 启动 chokidar 监听                  │
│    ├─ toolWatcher:  监听 tools/*.js                                  │
│    └─ configWatcher: 监听 config.json                                │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    文件监听 (chokidar)                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  config/plugins/*.json          - 插件配置文件                        │
│    ├─ add/change → debouncedLoadConfig() (500ms 防抖)               │
│    └─ unlink → 加载默认配置                                          │
│                                                                       │
│  plugins/*/tools/*.js           - 工具文件                            │
│    ├─ add/change/unlink → debouncedLoadTools() (500ms 防抖)         │
│    └─ 自动重载工具                                                    │
│                                                                       │
│  ⚠️ 注意: MCP 等复杂插件需要手动调用 reload 接口                      │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## 数据流

### 1. 更新插件配置流程

```
用户请求
   ↓
PUT /api/plugins/mcp-plugin/config
   ↓
pluginController.updatePluginConfig()
   ├─ 验证管理员权限
   ├─ 查找插件实例
   ├─ 写入配置文件 (config/plugins/mcp-plugin.json)
   └─ 等待 600ms (让 chokidar 处理)
   ↓
chokidar 检测文件变化
   ↓
触发 configWatcher.on('change')
   ↓
调用 debouncedLoadConfig() (500ms 防抖)
   ↓
plugin.loadConfig()
   ├─ 读取新配置
   └─ 更新 this.config
   ↓
返回更新后的配置
```

### 2. 重载插件流程

```
用户请求
   ↓
POST /api/plugins/mcp-plugin/reload
   ↓
pluginController.reloadPlugin()
   ├─ 验证管理员权限
   └─ 调用 middleware.reloadPlugin('mcp-plugin')
       ↓
middleware.reloadPlugin()
   ├─ 查找插件实例
   ├─ 调用 plugin.loadTools()
   │   ├─ 扫描 tools/ 目录
   │   ├─ 动态 import 工具文件
   │   ├─ 实例化工具类
   │   └─ 更新 tools Map
   ├─ 调用 plugin.initialize() (如果存在)
   │   └─ 对于 MCP: 重新连接所有 MCP 服务器
   ├─ 更新 LLM 适配器
   │   └─ this.llm.setPlugins(this.plugins)
   └─ 返回新的工具数量
       ↓
返回成功响应
```

### 3. 插件启用/禁用流程

```
用户请求
   ↓
POST /api/plugins/web-plugin/toggle
Body: { "enabled": false }
   ↓
pluginController.togglePlugin()
   ├─ 获取当前配置
   ├─ 更新 enabled 字段
   ├─ 写入配置文件
   └─ 等待 600ms
       ↓
chokidar 自动重载配置
   ↓
返回成功响应
   ↓
(可选) 前端调用 /reload 应用变化
```

## 插件类型

### 1. 标准插件 (lib/plugins/*)

```javascript
// lib/plugins/mcp-plugin/index.js
export default class McpPlugin extends Plugin {
  constructor() {
    super()
    this.mcpServers = new Map()
  }
  
  getFilePath() {
    return __dirname
  }
  
  getInitialConfig() {
    return {
      enabled: true,
      mcpServers: {}
    }
  }
  
  async loadTools() {
    // 自定义工具加载逻辑
    // 连接 MCP 服务器并获取工具
  }
  
  async initialize() {
    // 初始化 MCP 连接
  }
}
```

### 2. 自定义插件 (plugins/custom/*)

```javascript
// plugins/custom/my-tool.js
import { MioFunction } from '../../lib/function.js'

export default class MyTool extends MioFunction {
  constructor() {
    super({
      name: 'my_tool',
      description: '我的工具',
      parameters: { /* ... */ }
    })
    this.func = this.execute
  }
  
  async execute(e) {
    // 工具执行逻辑
    return 'result'
  }
}
```

## 安全机制

```
┌─────────────────────────────────────┐
│      authConfigAPI 中间件            │
├─────────────────────────────────────┤
│                                     │
│  1. 检查查询参数 admin_code          │
│  2. 检查请求头 X-Admin-Code          │
│  3. 与 config.web.admin_access_code │
│     进行比对                         │
│  4. 验证失败 → 401 Unauthorized     │
│                                     │
└─────────────────────────────────────┘
```

## 错误处理

```
┌─────────────────────────────────────┐
│         try-catch 包裹               │
├─────────────────────────────────────┤
│                                     │
│  ✅ 单个插件重载失败不影响其他插件    │
│  ✅ 返回详细的错误信息               │
│  ✅ 记录到日志系统                   │
│  ✅ 标准化错误响应格式               │
│                                     │
│  {                                  │
│    "code": 1,                       │
│    "message": "错误描述",            │
│    "data": null                     │
│  }                                  │
│                                     │
└─────────────────────────────────────┘
```

## 与 LLM 适配器的对比

| 特性 | LLM 适配器 CRUD | 插件 CRUD |
|------|----------------|----------|
| **配置位置** | config.yaml | config/plugins/*.json |
| **热更新机制** | config.reload() + reloadLLMAdapters() | chokidar + reloadPlugin() |
| **API 前缀** | /api/config | /api/plugins |
| **列表查询** | GET /api/config | GET /api/plugins |
| **详情查询** | GET /api/config/:section | GET /api/plugins/:name |
| **配置更新** | PUT /api/config/:section | PUT /api/plugins/:name/config |
| **重载接口** | POST /api/config/refresh-models | POST /api/plugins/:name/reload |
| **批量重载** | reloadLLMAdapters() | reloadAllPlugins() |
| **认证方式** | authConfigAPI | authConfigAPI |
| **响应格式** | makeStandardResponse | makeStandardResponse |

**设计理念**: 保持一致的 API 风格，降低学习成本
