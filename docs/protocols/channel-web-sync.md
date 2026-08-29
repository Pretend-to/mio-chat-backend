# Channel 与 Web 实时镜像通信协议规范 (Channel-to-Web Sync Protocol)

> **版本**：v1.0  
> **更新时间**：2026-08-29  
> **适用范围**：微信、Telegram、飞书等渠道与 Web 前端多端协同镜像

---

## 1. 架构目标

在多端在线场景下（如用户在手机微信与 PC Web 端同时在线），实现：
1. 用户在微信端发送的消息，实时广播镜像上屏到 Web 端对应联系人聊天链；
2. 服务端在处理微信请求时，流式响应（Reasoning 思考链、Content 文本、ToolCall 工具执行、Complete 结束帧）同步推流至 Web 端；
3. 双方基于明确契约的 `contactorId` 路由，**前端直接索引 `store.contactors[contactorId]`，无需容错猜测**。

---

## 2. 消息流转协议

### 2.1 用户消息广播帧 (`channel_user_message`)

当渠道（如微信）收到用户输入，且检测到有管理员 Web 客户端在线时，服务端通过 WebSocket 下发此广播帧。

- **Socket Event**：`message`
- **Protocol**：`channel`
- **Type**：`channel_user_message`

```json
{
  "protocol": "channel",
  "type": "channel_user_message",
  "data": {
    "contactorId": "ch_wechat_100",
    "assistantMessageId": "msg_a_1787985516_abcd",
    "userMessage": {
      "id": "msg_u_1787985516_1234",
      "role": "user",
      "text": "用户在微信发送的文本",
      "time": 1787985516000,
      "content": [
        { "type": "text", "data": { "text": "用户在微信发送的文本" } },
        { "type": "image", "data": { "file": "http://.../img.jpg" } }
      ]
    }
  }
}
```

#### 字段约束
| 字段名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `contactorId` | String | 是 | 渠道机器人唯一标识（与 Web 前端 `contactorsStore` 的 key 严格一致） |
| `assistantMessageId` | String | 是 | 即将生成的 AI 回复的消息 ID，前端据此建立 `status: 'running'` 的空白占位与 `StreamBuffer` |
| `userMessage.id` | String | 是 | 用户消息唯一 ID |
| `userMessage.content` | Array | 是 | 富文本数组（支持 text、image、file 等） |

---

### 2.2 LLM 流式增量推流 (`llm_message` / `update`)

在 LLM 生成过程中，服务端不仅处理渠道消息发送，还会通过 `sessions.getAllAdminClients()` 将增量 chunk 推送给所有在线 Web 客户端。

- **Socket Event**：`message`
- **Protocol**：`llm`
- **Type / Action**：`update`

```json
{
  "protocol": "llm",
  "message": "update",
  "request_id": "msg_a_1787985516_abcd",
  "data": {
    "type": "content",
    "content": "增量文本片段...",
    "metaData": {
      "contactorId": "ch_wechat_100",
      "messageId": "msg_a_1787985516_abcd"
    }
  }
}
```

#### `type` 类型枚举
- `reason`：思考链增量（`data.data = { text: "...", duration: 0 }`）
- `content`：正文流式输出（`data.content = "..."`）
- `toolCall`：工具调用生命周期状态（`data.content = { action: 'running'|'finished', name: '...', ... }`）
- `action`：二次审批拦截卡片（`data.content = { actionType: 'REQUEST_APPROVAL', interactionId: '...', prompt: '...' }`）

---

### 2.3 完成与异常控制帧 (`complete` / `failed`)

- **Socket Event**：`message`
- **Protocol**：`llm`
- **Type / Action**：`complete` 或 `failed`

```json
{
  "protocol": "llm",
  "message": "complete",
  "request_id": "msg_a_1787985516_abcd",
  "data": {
    "metaData": {
      "contactorId": "ch_wechat_100",
      "messageId": "msg_a_1787985516_abcd"
    }
  }
}
```

---

## 3. 前端处理规范 (No Fuzzy Fallback)

前端 `gateway.js` 严格遵循以下简明契约：
1. 收到 `channel_user_message` 时，直接通过 `contactorStore.contactors[contactorId]` 检索；若无则说明配置未同步，直接丢弃，不做模糊前缀猜测。
2. 收到 LLM `update` / `complete` 时，直接通过 `metaData.contactorId` 索引 `contactorStore.getOrCreateMessage(contactorId, messageId)`。
3. `StreamBuffer` 负责平滑打字与吸底，`ChatView.vue` 响应式监听 `contactor.lastUpdate` 自动滚动。
