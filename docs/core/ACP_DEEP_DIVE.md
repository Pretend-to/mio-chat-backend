# Agent Client Protocol (ACP) v1 深度解析手册

> 本文档基于对 agentclientprotocol.com 的逐页调研，旨在为 MioChat 提供最全面的 ACP 实现参考。

---

## 第 1 页：架构与设计哲学 (Architecture & Design Philosophy)

### 1.1 核心定位
ACP 是为了解决 **IDE/编辑器 (Client)** 与 **AI 编程 Agent (Provider)** 之间的解耦问题。

### 1.2 三大哲学
1.  **MCP 友好 (MCP-friendly)**: 尽力复用 Model Context Protocol 的数据类型，减少重复发明。
2.  **用户体验优先 (UX-first)**: 重点解决 AI 交互中的 UI 呈现挑战（如计划展示、进度反馈）。
3.  **受信任模型 (Trusted)**: 假设用户信任 Agent，允许 Agent 访问本地文件和 MCP 服务器，但 Client 保留对工具调用的控制权。

### 1.3 运行模式 (Setup)
*   **本地进程**: 客户端通过 `stdin/stdout` 启动并通信。
*   **多会话并行**: 单个连接可支持多个并发 Session。
*   **实时流式**: 重度依赖 JSON-RPC 通知来实时更新 UI。

---

## 第 2 页：通信模型与协议概览 (Communication Model & Overview)

### 2.1 协议基础
*   **JSON-RPC 2.0**:
    *   `Methods`: 请求-响应对（双向）。
    *   `Notifications`: 单向通知。

### 2.2 典型消息流
1.  **初始化**: `initialize` (协商版本/能力) -> `authenticate` (可选认证)。
2.  **会话建立**: `session/new` 或 `session/load` (恢复)。
3.  **提示轮次 (Prompt Turn)**:
    *   Client -> `session/prompt`
    *   Agent -> 多条 `session/update` (计划、进度、内容)
    *   Agent -> Client 请求文件操作或权限。
    *   Agent -> 返回 `session/prompt` 最终响应（包含 `stopReason`）。

---

## 第 3 页：初始化与能力协商 (Initialization)

### 3.1 握手协议
*   **Client 发送**: `protocolVersion`, `clientCapabilities` (fs, terminal), `clientInfo` (name, version)。
*   **Agent 返回**: `protocolVersion`, `agentCapabilities` (loadSession, promptCapabilities, mcpCapabilities), `agentInfo`, `authMethods`。

### 3.2 关键能力项 (Capabilities)
*   **Client 端**:
    *   `fs.readTextFile`: 是否支持 Agent 读取本地文件。
    *   `fs.writeTextFile`: 是否支持 Agent 写入本地文件。
    *   `terminal`: 是否支持 Agent 操作终端。
*   **Agent 端**:
    *   `promptCapabilities`: 支持的内容类型 (image, audio, embeddedContext)。
    *   `mcpCapabilities`: 支持的 MCP 传输协议 (http, sse)。

---

## 第 4 页：认证管理 (Authentication)

### 4.1 认证流程
1.  Agent 在初始化响应的 `authMethods` 中列出支持的方法 ID。
2.  Client 调用 `authenticate(methodId)` 进行认证。
3.  成功后方可创建 Session。

### 4.2 登出
*   支持 `logout` 方法（需 Agent 声明 `agentCapabilities.auth.logout`）。

---

## 第 5 页：会话生命周期 (Session Setup)

### 5.1 创建会话 (`session/new`)
*   **参数**: `cwd` (工作目录), `mcpServers` (Agent 需要连接的工具服务器列表)。
*   **返回**: `sessionId`。

### 5.2 恢复会话 (`session/load` vs `session/resume`)
*   `session/load`: Agent 会通过 `session/update` **重放** 历史对话，最后响应请求。
*   `session/resume`: 仅恢复状态，不重放消息，直接响应。

### 5.3 终止会话 (`session/close`)
*   Agent 必须停止所有进行中的工作并释放资源。

---

## 第 6 页：提示轮次生命周期 (Prompt Turn)

### 6.1 阶段流转
1.  **用户消息**: Client 发送 `session/prompt` 包含 `ContentBlock[]`。
2.  **Agent 处理**: 进入推理阶段。
3.  **输出报告**: Agent 通过 `session/update` 发送：
    *   `plan`: 执行计划。
    *   `agent_message_chunk`: 文本回复片段。
    *   `tool_call`: 声明要调用的工具。
4.  **工具调用与状态**:
    *   `tool_call_update`: 更新工具执行状态 (pending -> in_progress -> completed/failed)。
    *   Agent 可能会调用 Client 的 `fs/*` 或 `terminal/*` 方法。
5.  **结束**: Agent 返回 `session/prompt` 响应，带有 `stopReason` (end_turn, max_tokens, cancelled 等)。

---

## 第 7 页：内容块定义 (Content Blocks)

ACP 复用了 MCP 的 `ContentBlock` 结构：
*   `text`: 纯文本。
*   `image`: Base64 编码的图像，带 `mimeType`。
*   `audio`: Base64 编码的音频。
*   `resource`: 嵌入式资源（如文件内容直接注入，带 `uri` 和 `text/blob`）。
*   `resource_link`: 外部资源引用。

---

## 第 8 页：工具调用与权限控制 (Tool Calls & Permissions)

### 8.1 权限申请 (`session/request_permission`)
*   Agent 发起请求，提供 `options` (allow_once, allow_always, reject_once, reject_always)。
*   Client 返回用户的选择或 `cancelled` 结果。

### 8.2 工具输出类型
除了普通内容，还支持：
*   `diff`: 文件修改对比 (`path`, `oldText`, `newText`)。
*   `terminal`: 引用特定的终端 ID 的实时输出。

---

## 第 9 页：执行计划 (Agent Plan)

### 9.1 计划条目 (`PlanEntry`)
*   `content`: 任务描述。
*   `priority`: `high`, `medium`, `low`。
*   `status`: `pending`, `in_progress`, `completed`。

### 9.2 更新机制
Agent 每次更新计划必须发送 **全量条目列表**，Client 执行全量覆盖。

---

## 第 10 页：能力池详解 (Capabilities Deep Dive)

### 10.1 文件系统 (`fs/*`)
*   `fs/read_text_file`: 支持 `path`, `line` (起始行), `limit` (行数)。
*   `fs/write_text_file`: 覆盖或创建文件。路径必须是 **绝对路径**。

### 10.2 终端 (`terminal/*`)
*   `terminal/create`: 启动命令，支持 `env`, `cwd`, `outputByteLimit`。返回 `terminalId`。
*   `terminal/output`: 轮询或流式获取输出，包含 `truncated` 标志。
*   `terminal/wait_for_exit`: 阻塞直到进程退出。
*   `terminal/kill` & `terminal/release`: 管理生命周期。

---

## MioChat 对接核心结论
1.  **前端重头戏**: `session/update` 中的 `plan` 和 `tool_call_update` 是渲染精美进度条、任务树的关键。
2.  **权限中转**: MioChat 必须实现 `session/request_permission` 界面，这是 Agent 操作本地环境的安全边界。
3.  **能力互补**: MioChat 的 `file-editor` 插件天然契合 `diff` 类型的输出，可直接用于展示 Agent 的修改建议。
