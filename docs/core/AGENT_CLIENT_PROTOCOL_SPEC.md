# Agent Client Protocol (ACP) v1 技术规范调研

## 1. 概述 (Overview)
Agent Client Protocol (ACP) 是一个开放的 JSON-RPC 标准，旨在标准化 **AI 编程 Agent**（如 Claude Code, Gemini CLI）与 **客户端应用**（如 IDE, MioChat）之间的通信。它解耦了编辑器与 Agent 的绑定，使得任何支持 ACP 的编辑器都能驱动任何支持 ACP 的 Agent。

## 2. 通信架构 (Architecture)
- **协议协议**: JSON-RPC 2.0
- **传输层**: 
  - **本地模式**: Stdio (stdin/stdout) 是最常用的方式，Agent 作为子进程运行。
  - **远程模式**: 正在开发中（通常基于 WebSocket）。
- **角色**:
  - **Client (Host)**: MioChat。负责提供上下文、管理 Session 生命周期、执行 Agent 请求的操作。
  - **Agent (Provider)**: 外部 Agent 进程。负责推理、生成计划、请求工具调用。

## 3. 生命周期与核心方法 (Core Methods)

### 3.1 初始化阶段 (Initialization)
连接建立后，双方进行握手：
- **Client -> Agent**: 发送初始化请求，包含客户端信息、支持的协议版本和功能。
- **Agent -> Client**: 返回 Agent 基础信息及其 Capability 集合。

### 3.2 认证 (Authentication)
- `authenticate`: 如果 Agent 需要认证（如 API Key），客户端调用此方法。Agent 会在初始化响应中声明支持的认证方法 ID。

### 3.3 会话管理 (Session Management)
- `session/new`: 创建一个全新的会话，返回 `sessionId`。
- `session/load`: 恢复历史会话（需 Agent 支持 `loadSession` 能力）。
- `session/close`: 显式关闭会话并清理资源。

### 3.4 交互循环 (Interaction Loop)
- **Client -> Agent**: `session/prompt`
  - 参数包含 `sessionId` 和 `prompt`。
- **Agent -> Client**: `session/update` (通知/Notification)
  - 这是一个异步流，用于返回中间结果。
  - **类型**:
    - `content`: 返回消息片段。支持 `role` (agent, user, thought)。
    - `plan`: 返回 Agent 的执行计划（步骤列表、优先级、状态）。
    - `toolCall`: Agent 请求执行一个工具。
    - `progress`: 进度描述文字。

## 4. 能力集合 (Capabilities)
ACP 定义了一系列标准能力，Client 需要在初始化时声明自己能满足哪些：

### 4.1 文件系统 (FileSystem)
- `fs.readTextFile`: 读取文本文件内容。
- `fs.writeTextFile`: 写入/覆盖文件内容。
- `fs.listDirectories`: 列出目录结构。

### 4.2 终端 (Terminal)
- `terminal.create`: 创建一个新的终端实例。
- `terminal.write`: 向终端发送指令。
- `terminal.onOutput`: 订阅终端实时输出。

### 4.3 其它
- `slash-commands`: Agent 暴露给用户的快捷命令。
- `search`: 集成搜索能力。

## 5. 消息模型 (Message Schema)

### 5.1 `session/prompt` 请求
```json
{
  "jsonrpc": "2.0",
  "method": "session/prompt",
  "params": {
    "sessionId": "sess_123",
    "prompt": "帮我重构 src/index.js 中的 login 函数"
  },
  "id": 1
}
```

### 5.2 `session/update` (Plan 更新示例)
```json
{
  "jsonrpc": "2.0",
  "method": "session/update",
  "params": {
    "sessionId": "sess_123",
    "update": {
      "type": "plan",
      "entries": [
        { "content": "分析 index.js 逻辑", "status": "completed" },
        { "content": "生成重构方案", "status": "running" },
        { "content": "写入文件", "status": "pending" }
      ]
    }
  }
}
```

## 6. MioChat 对接 ACP 的核心挑战
1. **状态化流转**: MioChat 需要将原本「一问一答」的流式处理升级为「基于步骤（Steps）」的动态渲染。
2. **交互确认流**: Agent 发起的 `fs.writeTextFile` 不能直接执行，必须对接 MioChat 的确认逻辑，并在 UI 上展示 Diff。
3. **PTY 桥接**: 需要将 MioChat 现有的 `node-pty` 终端与 ACP 的 `terminal` 能力池打通。
