# ACP (Agent Client Protocol) 知识库

## 目录索引

### 1. 协议核心规范 (Protocol)
- [协议概览](./protocol-overview.md): 通信模型、生命周期与消息流。
- [初始化与协商](./protocol-initialization.md): 握手、版本兼容与能力声明。
- [Session 生命周期](./protocol-sessions.md): 创建、加载、恢复与关闭。
- [Prompt 轮次状态机](./protocol-prompt-turn.md): 交互循环、更新通知与停止原因。

### 2. SDK 参考指南 (SDK)
- [快速开始](./sdk-quickstart.md): 安装与基础连接。
- [ClientSideConnection 详解](./sdk-client-connection.md): 方法回调、反向请求处理。
- [传输层实现](./sdk-transports.md): Stdio 与 WebSocket 传输。

### 3. 数据模型与能力 (Reference)
- [标准数据结构](./reference-schemas.md): ContentBlock, Plan, ToolCall, Diff。
- [能力集合详解](./reference-capabilities.md): FS, Terminal, Slash Commands。

---
> 本文档旨在为 MioChat 深度集成 ACP 协议提供离线参考。
