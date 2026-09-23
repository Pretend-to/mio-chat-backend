# SubAgent as a Tool 异步执行开发计划

> 状态：开发中（Phase 0/1 完成，Phase 2 最小纵向切片已落地）  
> 目标分支：`codex/dev-agent-channel-refactor`  
> 数据策略：启动时按 schema diff 增量同步并保留未受影响数据；不兼容变更先备份，整库重建不属于自动启动流程
> 产品口径：普通主 Session 承载任务触发、编排、结果反馈与最终结论；SubAgent child
> Session 只承载隔离的原始调研上下文。

## 1. 目标与非目标

目标：

1. 主 Agent 通过 `subagent` 工具异步派发一个或多个任务；
2. SubAgent 使用 `Session(kind=subagent)`，不创建永久 Agent；
3. 用户可继续在原普通 Session 中交流，后台 Run 不阻塞主 Session；
4. 子任务的网页、工具调用和中间推理不进入主 Session；
5. 主 Session 保留触发、派发、精简结果和最终报告；
6. 支持独立 child Session 并行、同一 child Session 串行和 DAG 依赖；
7. 支持取消、超时、失败、重启恢复、幂等和显式 continuation；
8. Web 与 Channel 能观察和管理同一套 Run；
9. Cron/Trigger 精确唤醒指定普通 Session，再由主 Agent 编排。

非目标：

- 不创建 Task Session、独立 Node Worker、容器或 worktree；
- 不实现跨机器分布式队列；
- 不把 SubAgent 当作独立 Agent 或 Channel Binding；
- 不复制父 Session 的完整 MessageChain；
- 不允许后台任务默认等待交互式权限确认；
- 不兼容旧 SubAgent、Task 或 Session 数据。

## 2. 领域模型

```text
Agent
└── 普通主 Session
    ├── 用户对话、Cron/Trigger 事件
    ├── RunGroup 编排摘要、结果反馈和最终报告
    ├── SubAgent Session A (kind=subagent)
    │   ├── Run A1
    │   └── Run A2（调整或下一步 continuation）
    └── SubAgent Session B (kind=subagent)
        └── Run B1
```

| 名称              | 定义                                                             |
| ----------------- | ---------------------------------------------------------------- |
| 主 Agent          | 唯一永久 Agent，持有人格、模型默认值、工具策略和 Channel Binding |
| 主 Session        | 用户日常使用的普通 Session，也是 SubAgent 编排父上下文           |
| SubAgent Session  | `kind=subagent` 的 child Session，即持久化工作线程               |
| SubAgentRun       | child Session 上的一次执行，不独占 Session                       |
| RunGroup          | 一次 fan-out/fan-in 编排，记录完成策略和依赖                     |
| SessionInboxEvent | 历史兼容表；当前 SubAgent 结果不再通过 Inbox 投递                 |
| ResultEnvelope    | 返回父 Agent 的有界结果，不含完整子会话历史                      |

不再引入与 Session 一对一的 `SubAgentThread` 表。旧文档中的 `threadId` 统一改为
`subagentSessionId`。

## 3. 生命周期

### 3.1 状态机

Run 执行状态：

```text
queued -> running <-> waiting_tool -> result_ready
   |         |             |
   +---------+-------------+-> failed / cancelled / expired / interrupted / blocked
```

SubAgent 结果不再经过 accept/reject 批复。历史 `reviewStatus` 字段仅为数据库兼容保留，
新 Run 固定写入 `not_required`。

需要调整结果或执行下一步时，显式调用 `continue`：它不会覆盖旧结果，而是在同一
child Session 创建后续 Run，通过 `revisionOfRunId` 保留前后关系，并完整继承此前会话上下文。

RunGroup 编排状态：

```text
planning -> dispatched -> waiting_children -> completed
                                    \-> failed / cancelled
```

这些状态不锁定主 Session；用户始终可以继续聊天。

### 3.2 标准执行顺序

1. 从当前服务端执行上下文取得 `agentId + parentSessionId + parentMessageId`；
2. 校验父 Session 所有权、工具子集、预算、依赖和递归深度；
3. 事务创建 RunGroup、child Session、Run、Dependency 和审计事件；
4. `subagent` 工具立即返回 `queued` receipt；
5. Dispatcher 领取数据库 lease，将 Run 切换为 `running`；
6. 通过统一 Session 协调器调用 `SessionTurnService`；
7. 原始 user/assistant/tool 消息仅写 child Session；
8. 保存 ResultEnvelope，把 Run 切换为 `result_ready`；
9. RunGroup 满足完成策略后，将完成状态和有界结果持久化到 `SubAgentRun`；
10. Dispatcher 唤醒父 Session，但唤醒内容只包含 `groupId/runId` 和读取指令，不包含结果正文；
11. 主 Agent 被唤醒后通过 `status` 或 `read_result` tool call 主动读取结果，再综合结果答复用户；
12. 只有用户要求调整或执行下一步时，主 Agent 才调用 `continue`，在原 child Session 开启后续回合。

## 4. 数据模型

### 4.1 Session 扩展

```text
subagentKey       String?   同一父 Session 内的稳定复用键
subagentRole      String?   展示名称/角色
retentionPolicy   String?   raw/rolling/summary_only
lastRunAt         DateTime?
```

约束：

- 只有 `kind=subagent` 可以设置这些字段；
- parent 必须属于同一 Agent；
- persistent/rolling 策略必须提供 `subagentKey`；
- `(agentId, parentSessionId, subagentKey)` 可选唯一，fresh 使用 null；
- 创建 child Session 不修改 Agent 或 Channel 的 active Session。

### 4.2 SubAgentRunGroup

```text
id                    String PK
agentId               String
parentSessionId       String
parentMessageId       String?
deliveryBindingId     String?      完成后唤醒/投递所沿用的 Binding
originType            String       interactive/cron/trigger/system
originTaskId          String?
originTriggerId       String?
status                String
completionPolicy      String       all/any/quorum
quorum                Int?
resumeParent          Boolean      完成后自动唤醒父 Session；唤醒只带读取指令，不预注入结果正文
contextVersion        Int?
budgetJson            String
resultSummaryJson     String?
idempotencyKey        String?
deadlineAt            DateTime?
createdAt/updatedAt/finishedAt
```

`(agentId, idempotencyKey)` 可选唯一。父 Session 删除时级联取消并清理 Group；删除
Task/Trigger 只将历史来源置空。

### 4.3 SubAgentRun

```text
id                    String PK
groupId               String
agentId               String
sessionId             String       kind=subagent
parentSessionId       String
revisionOfRunId       String?
jobKey/taskType/objective
inputJson/outputContractJson
status/reviewStatus             reviewStatus 仅兼容旧数据，新 Run 为 not_required
resultJson/resultText/errorJson
toolNamesJson/toolDefinitionsHash
provider/model/reasoningEffort
budgetJson/attempt
leaseOwner/leaseExpiresAt/heartbeatAt
cancelRequestedAt/cancelReason
startedAt/finishedAt/createdAt/updatedAt
```

必须校验 Run、child Session、parent Session 的 `agentId` 完全一致。

### 4.4 Dependency、Event、Artifact 与历史 Inbox 兼容表

```text
SubAgentRunDependency(runId, dependsOnRunId, condition)
SubAgentEvent(id, runId, type, payloadJson, createdAt)
SubAgentArtifact(id, runId, type, name, uri/path, mimeType, size, hash)
SessionInboxEvent(id, agentId, sessionId, type, payloadJson,
                  status, availableAt, claimedAt, consumedAt,
                  consumedMessageId, attempts, lastError, idempotencyKey)
```

`SessionInboxEvent` 仅为历史数据和渐进式 schema 兼容保留，当前 SubAgent 执行路径不创建、
claim、consume 或注入它。父 Session 只收到不含结果正文的唤醒指令；结果读取边界由
`status/read_result` 的 tool result 控制，完整结果不会预先进入父 Session 的 system prompt。

## 5. 上下文与结果契约

传给 SubAgent：Agent soul、当前模型快照、裁剪后的 `contextDigest`、结构化任务输入、
输出契约、必要 Artifact/上游结果引用、工具白名单和预算。默认不传父 Session 全量
历史、ToolCall、pending memory 或用户即时插话。

留在主 Session：系统触发、拆解和派发计划、queued receipt、关键状态、结果摘要、证据
引用、continuation 指令、最终报告。网页全文、搜索过程和 child ToolCall 不得进入父链。

ResultEnvelope：

```json
{
  "runId": "run_xxx",
  "status": "result_ready",
  "summary": "发现5条值得进入早报的事件",
  "result": {},
  "evidence": [],
  "artifacts": [],
  "metrics": {
    "durationMs": 82000,
    "promptTokens": 12000,
    "completionTokens": 2400,
    "toolCalls": 16
  }
}
```

- summary 默认不超过 4 KiB；
- resultJson 默认不超过 64 KiB，超出写 Artifact；
- evidence 区分事实、推断和未验证项；
- 主 Session 单个完成事件默认不超过 8 KiB。

## 6. `subagent` 工具协议

内部身份只能来自当前调用上下文。模型不得提交 `agentId/sessionId/channelId/bindingId`。

Actions：

```text
spawn          创建一个异步 Run
spawn_batch    创建带依赖的 RunGroup
status         查询 Group/Run
read_result    读取有界结果或 Artifact 元数据
cancel         请求取消 Group/Run
continue       在原 child Session 中调整结果或执行下一步
capabilities   查看当前父上下文可默认继承/可显式分配的后台工具
```

第一版不提供无限阻塞的 `wait`；Run 完成后自动唤醒父 Session，主 Agent 再通过
`status/read_result` tool call 读取已持久化结果。

```json
{
  "action": "spawn_batch",
  "group": {
    "completionPolicy": "all",
    "resumeParent": true,
    "deadlineSec": 900
  },
  "jobs": [
    {
      "key": "hot_rank",
      "role": "热榜研究员",
      "taskType": "research",
      "objective": "查询过去24小时科技热榜",
      "contextDigest": "早报面向技术管理者",
      "outputContract": {
        "format": "json",
        "required": ["summary", "items", "evidence"]
      },
      "sessionPolicy": "fresh",
      "tools": ["web_search"],
      "dependsOn": [],
      "budget": {
        "timeoutSec": 600,
        "maxToolCalls": 30,
        "maxTokens": 30000
      }
    }
  ]
}
```

调整或下一步任务使用 `continue(runId, instruction)`，在原 child Session 尾部追加指令并
创建新 Run。初次结果完成不会自动创建 continuation。

### 6.1 Run 级工具能力快照

`taskType` 只作为调度与展示元数据，不隐式决定或扩大权限。Run 创建时冻结的工具集为：

```text
effectiveRunTools = parentEffectiveTools                         # tools omitted
effectiveRunTools = parentEffectiveTools ∩ requestedTools        # tools provided
```

未提供 `tools` 时完整冻结并继承主 Agent 当前实际有效的工具权限，包括 Shell、文件写入、
插件工具和 SubAgent 编排能力。显式提供 `tools` 仅用于主动收窄，不能越过父快照扩大权限。
Shell、写入和其他高风险工具继续复用原工具自身的 AST 检查、作用域、审批和 YOLO 策略，
不在 SubAgent 层维护第二套静态安全白名单。

`capabilities` 返回父上下文完整的 `defaultTools` 和 `assignableTools`；
`explicitOnlyTools` 默认为空。spawn/status/read_result 回执携带每个 Run 已冻结的工具快照，便于主
Agent 和 UI 审计实际授权，而不需要从 taskType 或角色名推断权限。

## 7. 执行、并发与恢复

### 7.1 SessionTurnCoordinator

新增统一协调器包裹 `SessionTurnService`，Web、Channel、Cron、Trigger 和 SubAgent
都从这里进入：

- 同一 Session 严格 FIFO，不同 Session 可并行；
- child 执行必须显式传 Session ID，不允许 active fallback；
- SubAgent 模式禁用 Slash、typing、在线用户消息广播和交互确认；
- 执行不依赖 ChannelRuntime，delivery 单独处理。

### 7.2 初始配额

- 系统并发 4；单 Agent 2；单 RunGroup 3；同一 child Session 1；
- 默认递归深度 0，可配置上限 2；
- 单 Run 默认 15 分钟、50 次工具调用；
- 超限进入明确终态，不能静默视为成功。

### 7.3 Lease、恢复与取消

- Dispatcher 使用数据库 lease 原子领取 queued Run；
- running/waiting_tool 定期 heartbeat；过期 lease 转 interrupted；
- 无副作用或有幂等保证的 Run 可重新排队；副作用不确定时进入 blocked；
- queued 自动恢复；delivery 保存 started/finished/externalMessageId；
- 取消必须写请求、abort LLM/工具、清理 timer/lease、finalize draft、写事件并重算 Group。

## 8. Cron 与 Trigger

- Task 精确绑定普通 `agentId + sessionId`，不创建 Task Session；
- 到点向该 Session 写类型化系统事件并唤醒主 Agent；
- Task 不跟随 Agent 当前 active Session，改绑必须显式进行；
- Cron 使用 `taskId + scheduledAt`，Trigger 使用 `triggerId + eventId` 生成幂等键；
- Channel 离线不阻止研究执行，只影响最终 delivery。

## 9. 后端模块与协议

```text
lib/subagents/
├── SubAgentTool.js
├── SubAgentManager.js
├── SubAgentRunService.js
├── SubAgentDispatcher.js
├── SubAgentExecutor.js
├── SubAgentReviewService.js
├── RunGroupCoordinator.js
├── ResultEnvelope.js
└── ResourcePolicy.js

lib/chat/sessions/SessionTurnCoordinator.js
```

HTTP API：

```text
GET  /api/agents/:agentId/sessions/:sessionId/subagent-groups
GET  /api/subagent-groups/:groupId
POST /api/subagent-groups/:groupId/cancel
GET  /api/subagent-runs/:runId
GET  /api/subagent-runs/:runId/messages
GET  /api/subagent-runs/:runId/events
POST /api/subagent-runs/:runId/cancel
POST /api/subagent-runs/:runId/continue
POST /api/subagent-runs/:runId/retry
GET  /api/subagent-runs/:runId/artifacts
```

WebSocket：

```text
subagent_group_created / subagent_group_updated
subagent_run_updated / subagent_run_progress
subagent_result_ready / subagent_continuation_created
subagent_result_read
```

事件携带 `agentId + parentSessionId + groupId + runId + revision`。前端按 revision 幂等
合并，断线后用 HTTP snapshot 补齐。

## 10. 前端 UI/UX

### 10.1 聊天页头部

在 `ChatHeader.vue` 增加按需出现的状态入口：

```text
主 Agent 名称                    [2 个执行中] [SubAgent]
```

点击打开当前父 Session 的活动抽屉；移动端只显示状态图标和数量。

### 10.2 消息流 RunGroup 卡片

新增 `SubAgentGroupCard.vue`：

```text
┌ 早报调研 · 3 个 SubAgent
│ ✓ 热榜研究员       已完成
│ ◌ 行情研究员       执行中  01:24
│ · 深度研究员       等待上游
└ [查看详情] [全部取消]
```

卡片绑定 groupId，WebSocket 原位更新，不反复插入系统消息；默认折叠中间进度，完成后
展示摘要、Artifact 和完成状态。

### 10.3 活动抽屉与详情

```text
components/subagents/
├── SubAgentActivityDrawer.vue
├── SubAgentGroupCard.vue
├── SubAgentRunRow.vue
├── SubAgentRunDetail.vue
├── SubAgentResultPanel.vue
├── SubAgentEventTimeline.vue
├── SubAgentArtifactList.vue
└── SubAgentContinueDialog.vue
```

功能：

- 按运行中、完成、失败过滤；
- 显示依赖、排队、耗时、模型、token、工具次数；
- 查看有界结果、证据、Artifact 和 child Session 消息；
- 取消、重试、提交调整或下一步指令；
- desktop 右侧抽屉，mobile 全屏 sheet；
- running child Session 默认只读，避免普通输入污染任务。

Child Session 不进入普通联系人一级列表。从 Run 详情进入，顶部统一显示 `[SubAgent]`、
所属主 Agent、父 Session 和状态。terminal/paused 后才允许普通路由切入。

### 10.4 Automation 与 Agent 设置

`AutomationView.vue`：选择 Agent 和普通 Session，显示“结果将回到此会话”，禁止选择
SubAgent Session，展示最近 RunGroup 和 delivery，并支持“改绑到当前会话”。

Agent 高级设置：默认并发、timeout/token/tool-call 预算、工具集合、递归深度和 child
保留时间。SubAgent 完成后自动唤醒父 Session，但只发送读取指令；主 Agent 通过工具读取
结果，UI 不出现任何内部 ID 输入框。

### 10.5 状态层

```text
src/stores/subagentStore.js
src/lib/subagentsApi.js
src/composables/useSubAgentEvents.js
```

Store 按 groupId/runId 归一化，记录 snapshot revision、loading/error 和未读数量。切换
联系人时订阅当前 agentId + sessionId，其他 Session 只保留轻量未读计数。

## 11. 分阶段开发

### Phase 0：契约冻结与测试夹具

- 固化本文、JSON Schema、错误码和转换表；
- 建 fake executor、可控时钟和数据库 fixture；
- 废弃旧 Task Session/独立 Thread 口径。

退出：前后端可以用同一 fixtures 独立开发。

### Phase 1：Persistence 与状态机

- Prisma 表、约束、索引和级联；
- repositories、reuse policy、幂等、ownership、删除保护；
- HTTP read-only snapshot API。

退出：不调用 LLM 也能模拟 queued → result_ready → completed，并能显式创建 continuation Run。

当前进度：

- [x] child Session 扩展、RunGroup、Run、Dependency、Event、Artifact 表；历史 Inbox 表保留兼容；
- [x] Run 显式状态机与非法迁移拒绝；结果无需批复；
- [x] Group 幂等创建、同 Agent ownership、fresh/persistent Session 策略；
- [x] Run 级工具快照必须为父执行权限子集；
- [x] HTTP 只读 Group/Run snapshot API；
- [x] 活跃 Run 的 child Session 删除保护和 Channel 只读门禁；
- [x] Group/Run 取消与同 child Session continuation Run 创建。

### Phase 2：单 Run 纵向切片与最小 UI

- SessionTurnCoordinator、Dispatcher 和 fake/real executor 接口；
- `spawn/status/read_result/cancel`，结果仅由主 Agent 显式读取；
- 聊天页状态、RunGroup 卡片、活动抽屉基础版；
- WebSocket snapshot + revision 合并。

退出：真实父 Session 派出一个异步 Run，用户继续聊天，主 Agent 可通过 tool call 主动读取结果并可取消、查看。

当前进度：

- [x] `subagent` 工具支持 spawn/spawn_batch/status/read_result/cancel/continue；
- [x] Dispatcher 异步领取，Executor 通过精确 Agent + child Session 执行真实 LLM turn；
- [x] 创建时冻结继承主 Agent 完整工具权限，显式 `tools` 可按 Run 收窄；
- [x] DAG 就绪节点并行、失败依赖取消、结果幂等写入 SubAgentRun；
- [x] 聊天头部入口与活动抽屉基础版，支持查看结果、取消和显式继续；
- [x] child Session 复用 Socket.IO 流式链路实时推送，首个事件自动创建只读联系人；
- [x] 父 Session 被唤醒后，主 Agent 通过 `status/read_result` tool result 主动读取有界结果，不预注入结果正文；
- [ ] Channel delivery；
- [ ] 未读数量与消息流 GroupCard。

### Phase 3：真实 LLM、工具隔离和结果契约

- child Message 生命周期、模型/工具/权限/预算快照；
- Artifact、ResultEnvelope、blocked/timeout/abort；
- 结果、证据和 Artifact UI。

退出：大量搜索上下文只在 child Session，父 Session 只增加有界摘要。

### Phase 4：并行、依赖和上下文连续执行

- spawn_batch、all/any/quorum、DAG；
- 配额与 child 单飞；
- continuation Run、同 Session 上下文复用和依赖展示。

退出：两个研究员并行、深度研究串行，主 Agent 可只继续其中一项后再撰写。

### Phase 5：Cron、Trigger 与 Channel

- Cron/Trigger 唤醒指定普通 Session；
- 自动编排、幂等触发和 delivery；
- AutomationView 与 Channel `/subagents` 命令；
- Channel/Web 同一 Run 实时同步。

退出：真实早报可跨 Web/微信观察、继续和投递，不创建 Task Session。

### Phase 6：恢复、治理与发布门禁

- lease、heartbeat、重启恢复、delivery 幂等；
- retention/rolling compaction、指标、审计、诊断；
- 性能、故障注入、安全、E2E 和 24 小时 soak test。

## 12. 测试计划

### 12.1 领域与数据库

| ID    | 场景                   | 期望                         |
| ----- | ---------------------- | ---------------------------- |
| DB-01 | 创建 child Session     | agentId 一致，父 active 不变 |
| DB-02 | 跨 Agent parent        | 事务拒绝，无部分记录         |
| DB-03 | persistent 同 reuseKey | 复用 Session，新建 Run       |
| DB-04 | fresh 连续创建         | Session、Run 均不同          |
| DB-05 | 重复 idempotencyKey    | 返回原 Group，不重复执行     |
| DB-06 | 非法状态跳转           | DomainError，旧状态不变      |
| DB-07 | 删除运行中 child       | 409，要求先取消              |
| DB-08 | 删除父 Session/Agent   | child、Run 级联清理；历史 Inbox 兼容表不产生新的 SubAgent 事件   |
| DB-09 | 删除 Channel           | Run 历史保留，delivery 失效  |

### 12.2 上下文隔离

- 子任务执行大量工具调用，父 Session 不出现子 ToolCall；
- 子请求只含 contextDigest，不复制父历史；
- ResultEnvelope 超限转 Artifact；
- persistent continuation 保持 child 消息顺序；
- rolling 只继承摘要/Artifact；
- 父链只出现结果摘要和主 Agent 的用户可见反馈。

### 12.3 异步、并发与恢复

- spawn 只等待事务并立即返回；
- Run 中用户继续聊天，父 Session 正常响应；
- 主 Agent 在用户输入或后续回合中按需读取结果，SubAgent 结果不进入父 Session FIFO；
- 两个 child 真并行，同一 child 两个 Run 串行；
- all/any/quorum 只更新 RunGroup 状态，DAG 不提前执行；
- queued/running/waiting_tool 阶段分别杀进程并重启；
- lease 过期只被一个 Dispatcher 领取；
- delivery 成功后的崩溃不重复发送；
- continuation 创建新 Run，不覆盖旧结果，并复用原 child Session 上下文。

### 12.4 权限与安全

- 模型伪造 agentId/sessionId/channelId；
- SubAgent请求父 Agent没有的工具；
- 子 Run 调用父 Agent 原本无权使用的工具；
- 递归 SubAgent 的深度与预算耗尽；
- 跨 Agent 读取 run/artifact；
- Prompt injection 要求泄露父历史或 Channel token；
- 文件越过 Run workspace；Result/Event payload 超限。

### 12.5 前端与 E2E

- Store 对乱序、重复、缺失 WebSocket 事件幂等合并；
- GroupCard 全状态、部分失败、Continue 防重复提交；
- running child 只读；Artifact 不可用状态；
- Automation 禁止选择 SubAgent Session；
- Web 发起 Run 后继续聊天，结果可通过 `status/read_result` 主动回读；
- 微信发起、Web 实时观察并取消；
- 三 Run DAG、单项 continuation、最终报告；
- 后端重启后 UI 状态可解释且不重复投递；
- desktop/mobile、键盘、焦点和屏幕阅读器验收。

性能基线：spawn P95 < 500ms；1000 个历史 Run 列表 P95 < 300ms；progress 每 Run
最多 1 次/秒；100 个 Run 不造成明显输入卡顿；同一 Session 永远只有一个 LLM turn。

## 13. 最终验收标准

### 生命周期和上下文

- [x] SubAgent 是 child Session，不产生永久 Agent 或 Task Session；
- [x] spawn 先持久化再异步执行并立即返回；
- [x] 结果自动完成且无需批复；显式 continuation 创建新 Run；
- [ ] 取消真正 abort LLM/工具；非终态重启后可恢复或明确失败；
- [x] child 原始消息、网页和 ToolCall 不进入父 Session；
- [ ] 父 Session 保留触发、派发、摘要和最终报告；
- [x] 用户等待期间可继续聊天，SubAgent 只向父 Session 注入不含结果正文的唤醒指令；
- [x] 主 Agent 可按 runId 读取详情和继续追问。

### 编排、安全和调度

- [ ] 不同 child 可并行，同一 child 串行；
- [ ] all/any/quorum 和 DAG 有确定语义；
- [ ] Cron/Trigger 精确绑定普通 Agent + Session 且幂等；
- [ ] Channel 离线不影响研究持久化；
- [ ] 不存在首个 Agent、唯一 Channel 或 active Session fallback；
- [x] SubAgent 默认冻结继承父 Agent 完整有效权限，显式工具列表只能收窄；
- [ ] token、时间、工具、递归和结果大小都有预算；
- [ ] Artifact 可追溯，delivery 独立且幂等。

### 前端与发布

- [ ] 聊天页显示运行中/完成数量和原位更新的 Group 卡片；
- [ ] 抽屉可看依赖、进度、成本、结果、事件、Artifact；
- [ ] 用户可取消并显式继续原 SubAgent；重试尚未实现；
- [ ] `[SubAgent]` 标签全局一致，running child 默认只读；
- [ ] 刷新、重连和跨 Web/Channel 操作后状态一致；
- [ ] 现有全量回归、新增领域/并发/故障/安全/UI/E2E 全部通过；
- [ ] Dev/Test 空库初始化、重复启动、回滚说明和 24 小时早报 soak test 通过。

## 14. 推荐提交边界

1. `docs(subagent): freeze async lifecycle contracts`
2. `feat(db): add subagent run group and inbox models`
3. `feat(runtime): add durable subagent dispatcher`
4. `feat(chat): add unified session turn coordinator`
5. `feat(tool): add async subagent spawn and cancel`
6. `feat(ui): add subagent activity drawer and group cards`
7. `feat(subagent): add explicit result reads after automatic parent wake`
8. `feat(subagent): add batch dependencies and contextual continuation`
9. `feat(automation): orchestrate subagents from parent sessions`
10. `test(subagent): add recovery security and e2e coverage`

数据库、执行器、工具、UI 和全部测试不能塞进一个不可审查的大提交。Phase 1 完成后，
前端可基于共享 fixtures 开发，但每个合并点必须维持可运行的纵向切片。
