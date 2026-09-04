# MioChat Channel SubAgent 开发设计

> 版本：v0.1
> 状态：Channel-first 设计稿，尚未实现
> 日期：2026-09-04
> 范围：Channel 侧子 Agent、独立 Session、后台任务和结果投递
> 后续范围：Web 管理界面、跨进程 Worker、跨机器调度

## 1. 设计结论

MioChat 的 SubAgent 应该被实现为一个独立的「任务运行时」，每个运行实例拥有
自己的子 Session，而不是把子任务继续追加到主 Agent 当前 Session，也不是每次
重新加载一份 `ai-plugin`。

核心关系如下：

```text
Channel
└── 主 Session（active session）
    ├── SubAgent Session：行情调研
    ├── SubAgent Session：日报编辑
    └── SubAgent Session：数据校验
```

子 Session 与主 Session 属于同一个 Agent 和 Channel，但有独立的：

- MessageChain；
- session FIFO 与运行锁；
- LLM 调用历史；
- 工具调用记录；
- 运行状态、超时和取消信号。

父子关系只作为元数据保存。主 Session 默认只看到子任务的最终摘要或产物引用，
不会看到子任务的完整搜索、工具调用和中间思考过程。

这能满足以下目标：

1. 每日行情调研和日报编辑不占用主 Agent 的上下文窗口；
2. 主 Session 的 MessageChain 保持稳定，继续最大化利用 input cache；
3. 子 Agent 仍然复用 MioChat 现有的 SessionPersistence、LLM、工具和 Channel
   发送链路；
4. 后续 Web 只需要读取 SubAgentRun 和子 Session，不需要重新设计执行模型。

## 2. 代码审阅结论

### 2.1 可以直接复用的基础设施

| 现有能力 | 代码位置 | 复用方式 |
| --- | --- | --- |
| Channel 运行实例与 Agent/Channel 绑定 | `channels/ChannelRuntime.js` | SubAgent 解析目标 Channel，复用其 `chn` 和 `memory` |
| Session 创建、查询、消息持久化 | `lib/chat/persistence/SessionPersistence.js`、`lib/chat/persistence/DatabaseMemoryStore.js` | 子任务创建独立 Session，写入同一 Agent 的持久化空间 |
| Session 级 FIFO | `channels/common/BaseChannel.js::_enqueueSession()` | 子 Session 使用自己的 `sessionId`，天然与主 Session 隔离 |
| 用户消息先落盘、assistant 生命周期和流式 Chunk | `channels/common/BaseChannel.js::_processChat()` | 子任务沿用同一套消息一致性和崩溃恢复语义 |
| LLM 统一调用入口 | `channels/llm.js`、`channels/wechat/llm.js` | 子任务使用同一 LLM service，但传入独立上下文 |
| 全局插件实例和工具注册 | `lib/middleware.js`、`lib/plugin.js` | 插件只在进程启动时加载一次，子任务只拿工具快照 |
| 纯时间任务调度 | `lib/cron.js` | Cron 只负责创建/唤醒 SubAgentRun，不再把复杂工作塞入主 Session |
| 条件唤醒 | `lib/triggers/` | Sentinel 触发 SubAgentRun 或投递结构化结果，不直接污染主上下文 |

### 2.2 必须明确的边界

#### active session 是 Agent 级指针，不是子任务工作区

当前 `getActiveSession()` / `setActiveSession()` 属于 Agent 级状态。SubAgent 创建
子 Session 后严禁调用 `setActiveSession()`，否则后台任务会抢走用户当前会话。

所有子任务执行必须显式传入 `sessionId`。如果 `sessionId` 缺失，SubAgent 入口
应该直接报错，不能像普通用户入口一样回退到 active session。

#### 不要直接调用普通入站消息处理

当前普通消息入口会处理 Slash、active session、typing、用户回执和渠道上下文。
SubAgent 不应该伪造一条普通入站消息调用完整入口。

建议在 `BaseChannel` 增加明确的 session 级接口：

```js
await channel.runSessionTurn(childSessionId, prompt, {
  runId,
  isSubAgent: true,
  silentQueue: true,
  toolNames,
  delivery: 'silent',
})
```

该接口可以内部复用 `_enqueueSession()` 和 `_processChat()`，但必须保证：

- `sid` 必须是调用方传入的子 Session；
- 不读取或改写 active session 指针；
- 不执行 Slash 指令；
- 不向 Channel 发送中间 typing 或工具过程；
- 最终输出由 SubAgentManager 决定是保存、投递还是回传父任务。

#### 工具配置是 Agent 级 metadata，不能作为子任务临时配置

当前 `channels/llm.js` 从 `memory.getAgentMeta('tools')` 读取工具列表。若 SubAgent
通过 `setAgentMeta()` 临时切工具，会影响同一 Agent 的主 Session 和其他子任务。

因此 LLM 请求需要增加本次调用级覆盖字段，例如：

```js
ctx.toolNames = ['search_mid_xxx', 'file_editor_mid_xxx']
```

优先级应为：

```text
run.toolNames > channel/agent saved tools > all registered system tools
```

Provider、model、reasoning effort 同样优先使用 Run 快照，不能为了子任务去写共享
Agent metadata。

#### Cron 与 Sentinel 不能直接复用主 Session

当前 [lib/cron.js](../../lib/cron.js) 的 `_executeTask()` 会确保 active session
存在，然后调用 `chn.appendUserMessage()`。这适合“让主 Agent 到点做一次事”，不适合
SubAgent 任务。

SubAgent 调度路径应该是：

```text
Cron/Sentinel
  → SubAgentManager.createRun()
  → 创建 child Session
  → Channel.runSessionTurn(childSessionId, ...)
```

不能把复杂行情调研继续写入主 Session。当前 Cron 的 `_findChannelByPreset()` 还
存在“只有一个运行 Channel 时兜底选择”的行为；SubAgent 必须使用明确的
`channelId + agentId`，找不到目标就进入 `target_unavailable`，不能误投到其他 Channel。

## 3. 术语和对象关系

### 3.1 Agent

MioChat 当前的 Agent 身份，负责绑定人格、Provider、Model、工具默认配置和多个
Channel。SubAgent 不新建一个永久 Agent，不与现有 `agentId` 概念混用。

### 3.2 主 Session

用户可见的 active session。它承载正常对话、用户主动输入和需要保留在主上下文内的
最终摘要。

### 3.3 SubAgent Session

一个 SubAgentRun 的上下文存储。它属于同一 Agent，可绑定同一 Channel，但默认不成为
active session，也不在普通用户的 session 列表中展示。

### 3.4 SubAgentRun

一次可观察、可取消、可恢复的执行实例。一个 Run 通常对应一个 SubAgent Session，
但 Session 是上下文容器，Run 是生命周期实体，二者不要混为一谈。

### 3.5 Parent Run

如果主 Agent 通过工具创建 SubAgent，当前 LLM 调用对应的父 Run 记录
`parentRunId`。如果任务由 Cron/Sentinel 直接创建，则 `parentRunId` 可以为空，
但仍然要保存 `parentSessionId` 和目标 Channel。

## 4. 总体架构

```text
┌──────────────────────────────┐
│ Channel / 主 Session          │
│ BaseChannel session FIFO      │
└──────────────┬───────────────┘
               │ subagent tool / cron / sentinel
               ▼
┌──────────────────────────────┐
│ SubAgentManager              │
│ create / queue / cancel      │
│ quota / recovery / delivery  │
└───────┬───────────┬──────────┘
        │           │
        ▼           ▼
┌──────────────┐  ┌────────────────┐
│ Run store     │  │ Run executor   │
│ DB/legacy     │  │ in-process LLM │
└──────────────┘  └───────┬────────┘
                           │ explicit child sessionId
                           ▼
                    ┌──────────────┐
                    │ Child Session │
                    │ MessageChain  │
                    │ own FIFO      │
                    └──────┬───────┘
                           │ final result
                           ▼
              ┌─────────────────────────┐
              │ Delivery policy          │
              │ channel / parent / none  │
              └─────────────────────────┘
```

第一版采用进程内执行：SubAgent 使用新的执行上下文，但不创建新的 Node 进程，也不
重新加载插件。真正需要 OS 进程隔离的仍然是 Sentinel 脚本。

## 5. Session 复用方案

### 5.1 子 Session 创建规则

SubAgentManager 创建 Run 后立即创建子 Session：

```js
const childSession = await memory.createSession({
  kind: 'subagent',
  parentSessionId,
  runId,
  title: '行情调研 · 2026-09-04',
  visible: false,
})
```

子 Session 必须满足：

- `agentId` 与目标 Channel 一致；
- `channelId` 绑定明确的目标 Channel；
- `parentSessionId` 可以为空（Cron/Sentinel 直接创建的任务）；
- 不修改 Agent 的 active session；
- 不继承父 Session 的完整 `chat[]`；
- 创建后第一条 user 消息就是任务指令或任务输入。

### 5.2 子 Session 的上下文继承

默认只继承以下内容：

- Agent soul/persona，除非 Run 指定独立 persona；
- Provider、model 和 reasoning effort 的只读快照；
- Run 级工具白名单；
- 任务说明、输出格式、时间范围和资源限制；
- 必要的父任务摘要或结构化输入。

默认不继承：

- 父 Session 全部聊天历史；
- 父 Session 的完整 ToolCall 过程；
- 父 Session 的 pending memory；
- 父 Session 的 active 状态；
- 父 Session 的用户即时插话。

如果确实需要父上下文，调用方必须显式传入经过截断的 `contextDigest`，并记录它
的来源和 hash，防止无意中复制整个 MessageChain。

### 5.3 Session 可见性和保留

第一版建议：

- 普通 `listSessions()` 默认只返回 `kind=main`；
- SubAgent Session 在内部可通过 `runId` 查询；
- Run 完成后保留 Session 和审计一段时间，便于复盘；
- 后续增加清理策略：按天数、总 token、产物引用和失败状态清理；
- 不主动合并子 Session 到主 Session。

### 5.4 Legacy 与 Database 模式

Database 模式应把子 Session 元数据作为正式字段保存。Legacy 兼容实现可以在
session JSON 顶层增加 metadata，但不得把 `kind`、`parentSessionId` 和 `runId` 写入
聊天 content 块。

SessionPersistence 需要扩展以下兼容 API：

```js
createSession({ kind, parentSessionId, runId, title, visible })
getSession(id, { includeSubagent })
listSessions({ kind, parentSessionId, visible })
updateSessionMeta(id, patch)
```

已有 `getSession(id)`、`appendUserMessage()`、`beginAssistantMessage()`、
`appendAssistantChunk()` 和 `finalizeAssistantMessage()` 语义保持不变。

## 6. SubAgentRun 数据模型

建议新增独立的 `SubAgentRun` 表，不把完整运行状态塞进 `Session` 或 Agent metadata。

### 6.1 推荐字段

```text
SubAgentRun
├── id                  String PK                 run_xxx
├── agentId             String                   归属 Agent
├── channelId           String                   精确目标 Channel
├── parentRunId         String?                  父 Run
├── parentSessionId     String?                  父 Session
├── sessionId           String UNIQUE             子 Session
├── taskType            String                   research/report/analysis...
├── mode                String                   delegate/spawn
├── status              String                   状态机状态
├── prompt              String                   初始任务（可脱敏）
├── inputJson           String                   结构化输入
├── toolNamesJson       String                   工具快照
├── provider            String?
├── model               String?
├── reasoningEffort     Int?
├── delivery            String                   silent/channel/parent
├── budgetJson          String                   token/time/depth 限制
├── resultJson          String?
├── resultText          String?
├── errorJson           String?
├── cancelReason        String?
├── idempotencyKey      String?
├── startedAt           DateTime?
├── heartbeatAt         DateTime?
├── finishedAt          DateTime?
├── createdAt           DateTime
└── updatedAt           DateTime
```

约束：

- `sessionId` 唯一，一个 Run 不重复绑定多个子 Session；
- `(agentId, idempotencyKey)` 可选唯一，用于 Cron 重试去重；
- `channelId` 和 `agentId` 必须一起校验；
- 结果大小要有限制，大结果保存为 artifact/file 引用；
- prompt、result、tool arguments 可能包含用户数据，应按现有审计策略保护。

### 6.2 SubAgentEvent

可以增加 append-only 的 `SubAgentEvent` 表，第一版只记录恢复和观测所需事件：

```text
run_created
run_started
tool_started
tool_finished
progress
result_ready
delivery_started
delivery_finished
run_failed
run_cancelled
```

不建议把每个 token 写入数据库。流式内容仍由子 Session 的 MessageChunk 和现有
stream cache 负责；RunEvent 只存状态变化和摘要。

## 7. Run 状态机

```text
queued
  │
  ▼
running ───────► waiting_tool ───────► running
  │                  │
  │                  ├───────────────► failed
  │                  └───────────────► cancelled
  │
  ├──────────────► completed
  ├──────────────► failed
  ├──────────────► cancelled
  └──────────────► expired
```

状态语义：

| 状态 | 含义 | 是否允许重试 |
| --- | --- | --- |
| `queued` | 已持久化，等待执行槽位 | 是 |
| `running` | 正在执行 LLM 或工具 | 需 heartbeat 判断 |
| `waiting_tool` | 等待工具结果或异步资源 | 是，但必须去重 |
| `completed` | 已得到最终结果 | 否，除非人工重新运行 |
| `failed` | 业务、模型或持久化失败 | 按错误类型决定 |
| `cancelled` | 用户、父任务或系统取消 | 默认否 |
| `expired` | 超过 deadline | 可人工重试 |

### 7.1 取消语义

- 父 Run 取消时，默认级联取消未完成子 Run；
- `detach=true` 时子 Run 不受父 Run 取消影响；
- Channel 停止时，运行中的 Run 进入 `queued` 或 `interrupted`，不能直接标记
  `completed`；
- 应用重启后扫描旧 `running`：有可靠 heartbeat 的可以恢复，否则标记为
  `failed`/`interrupted` 并按策略重新排队；
- 取消必须调用 LLM abort、工具 abort 和等待中的 timer，不能只更新数据库状态。

## 8. Channel 执行接口

### 8.1 BaseChannel 新增接口

建议新增一个公开但仅供内部调用的接口：

```js
await channel.runSessionTurn(sessionId, prompt, {
  runId,
  agentId,
  channelId,
  isSubAgent: true,
  silentQueue: true,
  toolNames,
  provider,
  model,
  reasoningEffort,
  deadlineAt,
  delivery: 'silent',
  onProgress,
})
```

要求：

1. 校验 `sessionId` 属于当前 Agent；
2. 校验 `channelId` 与当前 Channel 一致；
3. 显式调用 `_enqueueSession(sessionId, ...)`；
4. 复用用户消息先落盘和 assistant draft 生命周期；
5. 将 `isSubAgent` 传到 LLM 与输出层；
6. 禁止默认发送中间文本、typing、工具确认卡片；
7. 返回结构化的最终结果、assistant message id、token 和错误状态。

### 8.2 为什么仍然复用 Session FIFO

当前 `_sessionLocks` 与 `_sessionWaitingQueues` 按 session id 隔离。这样：

- 主 Session 可以继续处理用户消息；
- 子 Session 可以独立执行和排队；
- 同一个 SubAgent Session 的多次 continuation 仍然串行；
- 多个子任务之间可以并行，但受 SubAgentManager 的全局/Agent/Channel 配额限制。

注意：Session FIFO 不是跨进程锁。后续引入多 Worker 时，必须增加数据库 lease 或
队列层去重，不能只依赖内存 Map。

### 8.3 输出策略

子任务的中间输出默认只写子 Session，不直接下发 Channel。

最终结果使用以下三种 delivery：

#### `silent`

只保存 Run 和子 Session，调用方通过 `wait` 获取结果。适合内部分析或中间阶段。

#### `channel`

子 Agent 直接通过目标 Channel 的统一发送队列向用户发送最终报告。适合每日行情
日报，不需要唤醒主 Agent。

#### `parent`

子 Agent 完成后向父任务返回结构化结果。同步 `delegate` 作为一个 tool result；
异步 `spawn` 则向父 Session 排队一条短摘要事件，不能伪装成已经完成的旧 tool call。

结果格式建议：

```json
{
  "runId": "run_20260904_001",
  "status": "completed",
  "summary": "今日市场出现两项显著变化……",
  "artifacts": [
    { "type": "file", "path": "reports/2026-09-04.md", "name": "日报" }
  ],
  "metrics": {
    "durationMs": 182000,
    "promptTokens": 12000,
    "completionTokens": 3500,
    "toolCalls": 18
  }
}
```

## 9. `subagent` Channel 工具契约

第一版工具必须 `channelOnly: true`，后续 Web 接入同一 Manager，不在 Web 端复制
执行逻辑。

### 9.1 `delegate`

同步创建并等待一个子任务：

```json
{
  "action": "delegate",
  "task": "调研今天 BTC、ETH 的价格、成交量和重大新闻，输出结构化研究笔记。",
  "taskType": "market_research",
  "mode": "delegate",
  "delivery": "parent",
  "tools": ["search", "finance"],
  "timeoutSec": 600
}
```

工具返回最终结果，不把子任务的每次工具调用展开到主 Agent 上下文。

### 9.2 `spawn`

后台创建并立即返回：

```json
{
  "action": "spawn",
  "task": "每天收集市场数据并生成日报。",
  "taskType": "daily_market_report",
  "delivery": "channel",
  "scheduleSource": "cron",
  "tools": ["search", "finance", "file_editor"],
  "timeoutSec": 900,
  "detach": true
}
```

返回：

```json
{
  "success": true,
  "runId": "run_xxx",
  "sessionId": "s_sub_xxx",
  "status": "queued"
}
```

### 9.3 `status`、`wait`、`cancel`

- `status(runId)`：返回状态、heartbeat、耗时、PID 不适用时不伪造 PID；
- `wait(runId, timeoutSec)`：只等待状态变化或完成，不重复输出全部过程；
- `cancel(runId, reason)`：执行真正的 abort 和状态变更；
- 所有操作都必须校验当前 Agent/Channel 对 Run 的所有权。

### 9.4 参数限制

第一版建议：

- 最大递归深度：2；
- 单个 Agent 同时运行：2；
- 单个 Channel 同时运行：2；
- 单个 Run 最大 wall time：15 分钟；
- 单个 Run 最大工具调用数：50；
- 结果文本默认 64 KiB，超过则写 artifact；
- 不允许子 Agent 默认创建新的 SubAgent；需要显式 `allowSubagent=true`。

## 10. 上下文、MessageChain 和 input cache

### 10.1 主链稳定原则

主 Agent 的 MessageChain 只因以下情况改变：

- 用户正常输入；
- 主 Agent 自己的 tool call/result；
- 用户明确要求接收 SubAgent 摘要；
- `delivery=parent` 的异步完成摘要。

子 Agent 的搜索、工具调用、思考和中间输出全部写入子 Session。不能把它们拼接到
主 Session 的 `ctx.chat`，也不能把整个子 Session 序列化进父 tool result。

### 10.2 同步 delegate

同步调用时，主链只出现一次稳定的 tool call/result：

```text
assistant: tool_call subagent.delegate(...)
tool:     { runId, status, summary, artifacts }
```

父模型如果需要继续推理，只消费 `summary` 和产物引用。

### 10.3 异步 spawn

异步创建时，主链先收到：

```text
assistant: tool_call subagent.spawn(...)
tool:     { runId, status: "queued" }
```

完成后不能回写这次已经结束的 tool call。应通过现有 Session FIFO 排队一条明确的
后台事件，或者按 `delivery=channel` 直接发送最终报告：

```text
user/system event:
【SubAgent 任务完成】runId=run_xxx
摘要：...
产物：...
```

如果最终报告很长，默认使用 Channel 直接发送或保存为文件，只向主 Session 写短
摘要。这是保持主链和 provider cache 稳定的关键。

### 10.4 子链稳定原则

子 Session 的每次调用也必须保持稳定前缀：

- 固定 SubAgent system prompt；
- 固定工具快照和工具顺序；
- 固定任务元数据；
- 只在尾部追加本次 user/tool/assistant 消息；
- 不把动态日志塞进 system prompt。

## 11. 工具和插件模型

### 11.1 不重新加载 `ai-plugin`

当前插件由 Middleware 在进程启动时加载，插件工具保存在全局实例的 Map 中。
SubAgent 只读取工具定义和调用入口，不创建第二份插件实例。

### 11.2 Tool snapshot

Run 创建时冻结：

```text
toolNames
tool definitions hash
provider
model
reasoning effort
permission policy
```

热重载发生后，已运行 Run 继续使用自己的快照；新 Run 使用新版本。若工具已被
删除，执行时进入明确的 `tool_unavailable`，不能静默换成同名其他工具。

### 11.3 权限继承

默认继承 Channel/Agent 的基础权限，但进一步收窄：

- `adminOnly` 工具不自动开放给子任务；
- `channelOnly` 工具只有在目标 Channel 明确匹配时才可用；
- `subagent` 工具默认禁止递归；
- 交互式确认工具在后台 Run 中默认失败关闭，不等待用户；
- 文件工具的工作目录和读写范围必须在 Run policy 中明确；
- Sentinel 的 AdminOnly 受信任脚本规则不应自动扩展为 SubAgent 的 Shell 权限。

## 12. 日报示例：行情调研 + 日报编辑

推荐使用两个子任务，而不是让主 Agent 参与全过程：

```text
Cron 08:00
  │
  └─ createRun(market_research, delivery=silent)
       │
       └─ child session A：抓取行情、新闻、指标
            │ result: research artifact + structured facts
            ▼
       createRun(report_editor, parentRunId=A, delivery=channel)
            │
            └─ child session B：读取 research artifact，生成日报
                 │
                 └─ Channel 统一发送日报
```

主 Session 不接收原始调研过程。只有当用户主动询问“今天的日报依据是什么”时，
主 Agent 再通过 `runId` 或 artifact 引用读取必要资料。

如果调研和编辑始终是固定流水线，也可以由一个 Orchestrator SubAgent 创建两个
子 Run；但递归深度和总预算必须由父 Run 控制。

## 13. Cron、Sentinel 和 SubAgent 的职责

| 组件 | 负责什么 | 不负责什么 |
| --- | --- | --- |
| Cron | 到点创建 SubAgentRun | 不负责外部条件轮询，不直接拼主 Session |
| Sentinel | 自己 loop，条件满足后发事件 | 不负责复杂日报编辑，不直接重写主 MessageChain |
| SubAgentManager | Run 生命周期、上下文、预算、恢复和投递 | 不负责实现业务调研逻辑 |
| Channel Session | 子任务上下文和消息持久化 | 不成为后台任务的全局调度器 |
| 主 Agent | 用户可见对话和最终决策 | 不承载所有后台中间过程 |

Sentinel 触发 SubAgent 时，事件至少携带：

```text
agentId
channelId
parentSessionId?
triggerId?
taskType
payload
idempotencyKey
```

目标 Channel 找不到时，Run 进入 `target_unavailable` 或 `queued`（取决于调用方是否
允许等待 Channel 恢复），禁止 fallback 到其他 Channel。

## 14. 故障、恢复和幂等

### 14.1 持久化顺序

Run 必须先落库再执行：

1. 校验 Agent、Channel、父 Session 归属；
2. 创建 `SubAgentRun(status=queued)`；
3. 创建子 Session；
4. 写入初始任务输入；
5. 更新 Run 为 `running`；
6. 进入 Channel session FIFO；
7. 完成子 assistant draft 和 Run result；
8. 执行 delivery；
9. 最后更新 `completed` 或 `failed`。

任何阶段失败都必须留下可查询状态。不能出现“用户收到已创建，但数据库没有
Run”或“Run completed，但子 Session 没有最终消息”的半状态。

### 14.2 应用重启

第一版是进程内执行，因此主进程死亡时子 LLM 调用也会停止。重启后：

- `queued` 继续排队；
- `running` / `waiting_tool` 根据 heartbeat 和最后事件判断是否中断；
- 子 Session 保留已落盘的 user、assistant draft 和 chunks；
- 不重复发送已经完成的 delivery；
- 使用 `idempotencyKey` 防止 Cron/Sentinel 重试重复创建日报。

后续引入独立 Worker 后，才讨论跨进程存活和租约转移；不要在第一版混入 Worker
进程、worktree 和分布式队列。

### 14.3 Delivery 幂等

Channel 投递必须记录 `deliveryStartedAt`、`deliveryFinishedAt` 和外部消息 id。
重启重试时：

- 已有成功外部消息 id：不重复发送；
- 只有 started 没有 finished：根据 Channel 能力查询或标记人工重试；
- 没有 started：允许重试。

## 15. 安全和资源策略

SubAgent 不是安全沙箱。第一版至少实现：

- Channel/Agent/Run 所有权校验；
- 明确工具白名单；
- 单 Run wall-time deadline；
- LLM token 和工具调用预算；
- 最大递归深度；
- 结果和事件大小限制；
- Prompt、工具参数和结果日志脱敏；
- 后台任务默认不等待交互式确认；
- 文件 artifact 必须记录来源 Run 和路径；
- 取消时清理 abort handler、timer 和 pending delivery。

`adminOnly` 只说明调用入口受信任，不等于可以忽略 Run 级权限。尤其不能因为
Sentinel 当前允许受信任本地脚本，就让所有 SubAgent 自动获得 Shell 或文件系统
全权限。

## 16. 观测和管理

Channel 侧第一版提供：

- `subagent.status(runId)`；
- `subagent.wait(runId)`；
- `subagent.cancel(runId)`；
- `/subagents ls`；
- `/subagents status <runId>`；
- `/subagents cancel <runId>`。

日志必须包含：

```text
runId
parentRunId
agentId
channelId
parentSessionId
sessionId
taskType
status transition
provider/model
duration
token metrics
tool count
delivery status
```

中间进度默认写 debug/audit，不直接刷 Channel。只有调用方显式设置
`progressDelivery=channel` 才允许发送阶段性进度，并且要有节流。

## 17. 测试计划

### 17.1 Session 隔离

- 创建主 Session 和子 Session，确认 active session 不变；
- 子消息只出现在子 Session；
- 主 Session 的 `getChat()` 不包含子消息；
- 子 Session 与主 Session 可以并行处理；
- 同一子 Session 的两次调用仍严格串行；
- `listSessions()` 默认隐藏子 Session，内部过滤可以查到。

### 17.2 MessageChain 和缓存

- 主 Agent 调用 `delegate` 后只有一个 tool result；
- 子 Agent 的中间 tool call 不进入主 `ctx.chat`；
- `spawn` 完成后使用新后台事件，不伪造旧 tool result；
- 父 Session 下一轮历史保持原顺序；
- 子 Session 连续轮次的 system/tool 前缀稳定。

### 17.3 工具和权限

- SubAgent 使用 Run 工具快照，不改变 Agent metadata；
- 主 Agent 与子 Agent 并发时工具列表互不污染；
- adminOnly、channelOnly、交互确认和递归调用按 policy 拦截；
- 工具热重载不改变已运行 Run 的快照。

### 17.4 调度和投递

- Cron 创建 Run 而不是追加主 active session；
- Sentinel 事件能精确路由到 Channel；
- 找不到目标 Channel 不 fallback；
- 同一 idempotency key 不重复创建；
- Channel delivery 成功后重启不重复发送；
- `channel`、`parent`、`silent` 三种 delivery 都有覆盖。

### 17.5 故障恢复

- LLM abort 后 Run 为 cancelled，assistant draft 保留；
- 工具失败后 Run 为 failed，Session 可查询；
- 应用重启后旧 running Run 可识别为 interrupted；
- 数据库写失败不会留下 enabled/queued 但无可恢复记录的半状态；
- 父 Run 取消能级联，detach Run 不被误取消。

## 18. 分阶段实施

### Phase 1：Session-first 同步 SubAgent

交付：

1. `SubAgentRunService` / `SubAgentManager`；
2. `SubAgentRun` 数据表和 Session 子类型；
3. `BaseChannel.runSessionTurn()`；
4. LLM 调用级 `toolNames/provider/model` 覆盖；
5. `subagent(action="delegate")`；
6. 独立子 Session、结果结构和基础取消；
7. Session 隔离与 MessageChain 测试。

Phase 1 不做：并行编排、Web、跨进程 Worker、自动 worktree、复杂 UI。

### Phase 2：后台 Run 和 Channel 投递

交付：

1. `spawn/status/wait/cancel`；
2. Channel FIFO 投递；
3. Cron 创建 SubAgentRun 的入口；
4. Sentinel 触发 SubAgentRun 的入口；
5. heartbeat、重启恢复和 delivery 幂等；
6. `/subagents` 管理指令。

### Phase 3：编排和 Web

后续再考虑：

- research → editor 多阶段 DAG；
- 并行 fan-out/fan-in；
- Web 运行列表和日志；
- 独立 Worker 进程；
- worktree/container 隔离；
- 跨机器队列和租约。

## 19. 开发验收标准

满足以下条件才算 Channel-first SubAgent 第一版完成：

- 新建子任务不会改变主 active session；
- 主 Session MessageChain 不包含子任务中间消息；
- 子任务可以独立使用 Session FIFO 和持久化生命周期；
- 主 Agent 和子 Agent 的工具配置互不污染；
- Cron/Sentinel 可以创建子任务且不再把复杂任务写入主 Session；
- 子任务可以被查询、等待、取消；
- Channel 目标校验严格，不发生跨 Agent/Channel fallback；
- 应用重启后任务状态可解释、可恢复或明确失败；
- 日报类长任务可以直接从子 Session 生成并投递 Channel，不占用主 Agent 上下文；
- 所有测试覆盖 Session 隔离、MessageChain 稳定、权限、投递幂等和恢复路径。

## 20. 明确暂缓的决定

以下内容不应阻塞 Channel-first 第一版：

- Web 端展示和操作；
- 独立 Node Worker；
- Codex 风格 worktree；
- 任意脚本沙箱；
- 跨机器分布式调度；
- 自动将所有子任务结果合并回主上下文；
- 旧工具名兼容迁移。

第一版的核心不是“再造一个完整 Codex”，而是让 MioChat 的 Channel 能够安全地
拥有多个彼此隔离、可持久化、可取消的后台工作 Session，并让主 Agent 只接收它
真正需要的结果。
