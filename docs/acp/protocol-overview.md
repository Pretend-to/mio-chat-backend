# ACP 协议概览

## 1. 核心理念
- **LSP For Agents**: 像 LSP 标准化代码提示一样，ACP 标准化了 Agent 的交互。
- **UI 导向**: 协议原生支持 Plan (计划) 和 Step (步骤) 的实时反馈。
- **解耦**: 任意 Client (MioChat) 可以驱动任意符合协议的 Agent。

## 2. 通信模型
- **基石**: JSON-RPC 2.0。
- **双向请求**: 
  - Client -> Agent: `prompt`, `new_session`。
  - Agent -> Client: `fs/read_file`, `session/request_permission`。
- **异步通知**: `session/update` 用于推送流式内容。

## 3. 典型流程图
1. **Init**: Client --initialize--> Agent
2. **Auth**: Client --authenticate--> Agent (可选)
3. **Session**: Client --session/new--> Agent (返回 sessionId)
4. **Prompt**: Client --session/prompt--> Agent
5. **Updates**: Agent --session/update (type: plan)--> Client
6. **Interaction**: Agent --fs/read_file--> Client --result--> Agent
7. **End**: Agent --session/prompt Result (stopReason)--> Client
