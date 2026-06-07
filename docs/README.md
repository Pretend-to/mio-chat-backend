# 📚 Mio-Chat 文档中心

欢迎来到 Mio-Chat 开发与运维文档中心。这里记录了系统的核心设计思想、API 协议以及开发指南。

## 🧠 核心机制 (Core Concepts)
深入了解 Agent 操作系统底层的运行逻辑。
*   [**Hooks 拦截机制**](./core/hooks.md): V3 架构的灵魂，AOP 编程模型。
*   [**上下文压缩机制**](./core/context-compression.md): 如何实现极致的上下文压缩与 Cache 优化。

## 🛠️ 扩展与开发 (Development)
手把手教你如何为系统增加新能力。
*   [**插件开发指南**](./plugins/PLUGIN_DEVELOPMENT_GUIDE.md): Tools + Hooks + Presets。
*   [**工具调试手册**](./plugins/TOOL_DEBUG_GUIDE.md): 如何在不调用 LLM 的情况下调试工具逻辑。
*   [**适配器开发模版**](./adapters/ADAPTER_TEMPLATE.js): 接入新的大模型供应商。*   [**主流厂商配置指南**](./adapters/PROVIDER_GUIDE.md): Vertex AI / Gemini OAuth 等复杂认证说明。


## 🌐 接口协议 (API & Protocols)
*   [**Socket.io 协议详解**](./api/socket_protocol_zod.ts): 前后端流式通信的契约。
*   [**HTTP REST API**](./api/api.md): 系统配置与管理接口。
*   [**系统配置项说明**](./api/config-api.md): 环境变量与 .env 指南。

## 🚀 部署与运维 (Ops)
*   [**Docker 部署手册**](./deployment/DOCKER.md)
*   [**生产环境部署 (PM2)**](./deployment/DEPLOYMENT.md)
*   [**数据库初始化指南**](./deployment/DATABASE_SETUP.md)

---
**提示**：如果你在寻找旧版本的迁移指南或历史设计，请前往 [归档目录](./archive/)。
