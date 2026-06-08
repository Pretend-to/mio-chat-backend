# @agentclientprotocol/sdk 使用指南

## 1. 安装
```bash
pnpm add @agentclientprotocol/sdk
```

## 2. 核心类说明

### ClientSideConnection
MioChat 后端作为 Client 使用此类。
- **构造函数**: `new ClientSideConnection(transport)`。
- **核心方法**:
  - `initialize(params)`: 发起握手。
  - `newSession(params)`: 开启新对话。
  - `onReadFile(callback)`: 注册文件读取处理器。
  - `onRequestPermission(callback)`: 注册权限请求处理器。

### Session 对象
由 `newSession` 返回。
- `prompt(text, options)`: 发送提示词，`options` 中包含 `onUpdate` 回调。
- `cancel()`: 中断当前 Prompt 轮次。
- `close()`: 释放 Session。

## 3. 传输层 (Transports)
- **StdioTransport**: 用于本地二进制进程。
  - `new StdioTransport(command, args, options)`。
- **WebSocketTransport**: 用于远程 Agent。
