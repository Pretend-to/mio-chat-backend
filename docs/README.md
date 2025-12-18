# 📚 文档目录

## 📋 目录结构

### 🚀 用户指南
- [NEW_USER_GUIDE.md](NEW_USER_GUIDE.md) - 新用户完整指南
- [NEW_USER_DATABASE_INIT.md](NEW_USER_DATABASE_INIT.md) - 新用户数据库初始化指南
- [DATABASE_SETUP.md](DATABASE_SETUP.md) - 数据库设置说明
- [DOCKER.md](DOCKER.md) - Docker 部署指南

### 🔄 迁移指南
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - SQLite 迁移向导
- [PRISMA_MIGRATION_GUIDE.md](PRISMA_MIGRATION_GUIDE.md) - Prisma 迁移指南
- [SQLITE_MIGRATION_PLAN.md](SQLITE_MIGRATION_PLAN.md) - SQLite 迁移计划
- [SQLITE_IMPLEMENTATION_GUIDE.md](SQLITE_IMPLEMENTATION_GUIDE.md) - SQLite 实现指南

### 🔧 开发指南
- [INITIALIZATION_FIX.md](INITIALIZATION_FIX.md) - 初始化修复指南
- [LLM_INITIALIZATION_FIX.md](LLM_INITIALIZATION_FIX.md) - LLM 初始化修复
- [TOOL_DEBUG_GUIDE.md](TOOL_DEBUG_GUIDE.md) - 工具调试指南
- [ADAPTER_DISCOVERY.md](ADAPTER_DISCOVERY.md) - 适配器发现机制
- [ADAPTER_TEMPLATE.js](ADAPTER_TEMPLATE.js) - 适配器模板

### 🏗️ 架构文档
- [PLUGIN_CRUD_ARCHITECTURE.md](PLUGIN_CRUD_ARCHITECTURE.md) - 插件 CRUD 架构
- [PLUGIN_CRUD_IMPLEMENTATION.md](PLUGIN_CRUD_IMPLEMENTATION.md) - 插件 CRUD 实现
- [PLUGIN_CRUD_EXAMPLES.md](PLUGIN_CRUD_EXAMPLES.md) - 插件 CRUD 示例
- [PRESET_CRUD_DEVELOPMENT.md](PRESET_CRUD_DEVELOPMENT.md) - 预设 CRUD 开发
- [VERTEX_MANUAL_MODELS_IMPLEMENTATION.md](VERTEX_MANUAL_MODELS_IMPLEMENTATION.md) - Vertex 手动模型实现

### 🔒 安全文档
- [masked-fields-protection.md](masked-fields-protection.md) - 敏感字段保护

### 📡 API 文档
- [api.md](api.md) - API 接口文档
- [adapter-types-api.md](adapter-types-api.md) - 适配器类型 API
- [config-api.md](config-api.md) - 配置 API
- [logs-api.md](logs-api.md) - 日志 API
- [plugin-api.md](plugin-api.md) - 插件 API
- [presets-api.md](presets-api.md) - 预设 API
- [socketio-admin-api.md](socketio-admin-api.md) - Socket.IO 管理 API
- [websocket-fetch-api.md](websocket-fetch-api.md) - WebSocket 获取 API

### 🔄 更新文档
- [models-update-push.md](models-update-push.md) - 模型更新推送

## 📖 文档使用指南

### 新用户
1. 先阅读 [NEW_USER_GUIDE.md](NEW_USER_GUIDE.md)
2. 按照 [DATABASE_SETUP.md](DATABASE_SETUP.md) 设置数据库
3. 如需 Docker 部署，参考 [DOCKER.md](DOCKER.md)

### 老用户迁移
1. 阅读 [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
2. 按照 [PRISMA_MIGRATION_GUIDE.md](PRISMA_MIGRATION_GUIDE.md) 执行迁移

### 开发者
1. 查看 [PLUGIN_CRUD_ARCHITECTURE.md](PLUGIN_CRUD_ARCHITECTURE.md) 了解架构
2. 参考 [API 文档](#-api-文档) 了解接口
3. 使用 [TOOL_DEBUG_GUIDE.md](TOOL_DEBUG_GUIDE.md) 进行调试

## 📝 文档维护

- 所有技术文档统一放在 `docs/` 目录
- 用户常用文档（README、快速启动、迁移指南）保留在项目根目录
- 过时文档及时删除或归档