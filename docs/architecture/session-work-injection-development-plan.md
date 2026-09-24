# ChatEvent 统一唤起与运行时调整：开发计划

> 状态：核心路径已实现并通过定向测试；生产运行仍需正常重启后生效  
> 日期：2026-09-24  
> 范围：Agent Session、纯 Web 对话、Cron、Trigger/Sentinel 和 SubAgent 完成唤醒；涉及 `mio-chat-backend` 与 `mio-chat-frontend`。  
> 相关文档：[Agent/Session 规格](./channel-agent-refactor/Spec.md)、[ChatEvent 重构计划](./chat-event-refactor-plan.md)、[Session 持久化](./session-persistence.md)、[Trigger 规格](./trigger-system.md)。
> **执行计划**：[收敛实施计划](./session-work-injection-convergence-plan.md) —— 从当前代码到本文档目标的顺序、分阶段验收、明确不做的事。
> **现状事实**：[现状架构图 as-is](./session-work-injection-current-state.md) —— 按当前代码绘制。本文档与它冲突之处，**以它为准**（本文档描述意图，代码是事实）。

## 1. 决策

问题的共同形态是：一个对话的 LLM 工具循环尚未结束，另一个原本会唤起该对话的输入已经到来。当前 Cron、Trigger 和 SubAgent 完成通知会直接向目标 Session 发起另一轮 `runTurn()`；各 `BaseChannel` 实例只持有自己的会话锁，无法保证跨 Web、Channel 和 headless 入口的单飞。手动 `cron(action="run")` 还在原工具调用中同步等待新 loop，导致同一 Session 的消息交错落库。

**所有可能开启一次 LLM 轮次的输入先标准化为 `ChatEvent`，交给统一的 `ChatEventDispatcher`。**若目标对话已有活动 Event，Dispatcher 尝试调用 `activeEvent.adjust(incomingEvent)`：当前工具批次完成后，将新 Event 的指令并入活动 loop 的下一次模型请求。无法并入时，新 Event 等活动轮次收口，再独立启动。没有活动轮次时直接启动新 Event。

Cron 到点、Trigger 的有效 `@WAKE@`、SubAgent 完成通知与 Web 插话都遵守这条路由。Sentinel 脚本的普通巡检、无 wake 的试跑和计时器 tick 不产生 LLM 工作，因此不是 ChatEvent。来源的执行记录仍各自保留；统一的是**唤起 LLM 的事件入口与调整协议**，而非把来源审计表合成一张表。

```text
Cron / Trigger / SubAgentDone / Web input
       → Normalizer → ChatEvent → ChatEventDispatcher
                                   ├─ 空闲：启动该 Event
                                   ├─ 活动且可并入：activeEvent.adjust(incomingEvent)
                                   └─ 不可并入：等待活动 Event 收口后启动
```

## 2. 实施前的代码边界

- `lib/chat/llm/events/ChatEvent.js` 定义了 `requestId`、`messageId`、身份、模型消息和 `abort()`，尚无 `adjust()`。`WebChatEvent`、`ChannelChatEvent`、`TaskChatEvent` 等子类目前仍负责各自输出。
- 关键接线缺口：`channels/llm.js::createBackendLlm().process()` 目前手工组装普通对象作为 Adapter Event；`SessionTurnService → BaseChannel → createBackendLlm` 的 Cron/Trigger/Channel 路径没有实际运行 `ChatEvent` 实例。只给基类加方法不会覆盖这些来源，实施时必须把已规范化的 Event 沿这条链传到 Adapter，移除第二份手工 Event 身份。
- `lib/chat/llm/adapters/base.js::_handleToolCalls()` 在全部 tool result 同序回填之后、下一次递归请求之前提供确定的注入点。
- `channels/llm.js` 已支持把递归 user 消息编码成 `context_message`，并在后续历史重建时按工具边界还原。纯 Web 在前端消息链中直接使用独立 user 消息和分段的 assistant 消息。
- Agent Session 历史在后端数据库；纯 Web 直连对话的历史由前端 `messageChain` 持有，`WebNormalizer` 的 `sessionId` 可为 `null`。不能把纯 Web 的排队恢复建立在后端 Session 表之上。
- `SessionInboxEvent` 当前只作历史兼容保留，不直接复活为本功能的公共 Event 类型。

## 3. 统一 ChatEvent 契约

### 3.1 事件与执行分开建模

`ChatEvent` 是规范化的**候选输入事件**，可以尚未运行。它具有独立的投递状态 `created/queued/absorbed/running/finished`；现有 `aborted/completed` 仍表示真正启动后的 LLM 执行终态。被吸收到活动 loop 的 Event 不启动自己的流输出，也不生成第二条 assistant 占位消息；它的来源执行记录通过 `absorbedByEventId` 关联到实际执行者。

`ChatEventFactory.createForWake()` 从持久化工作项创建无输出副作用的 `WakeChatEvent`。Cron、Trigger 与 SubAgent 完成通知通过工作项进入同一 Dispatcher，并由 `wakeKind` 保留差异：

`EVENT_SOURCE.WAKE` 标识这类候选事件，`triggerKind` 为 task。候选事件不复用现有 `TaskChatEvent`/`WebChatEvent` 的输出方法，避免还未执行就产生完成帧。

| 字段 | 语义 |
| --- | --- |
| `eventId` / `requestId` | 输入事件身份 / 真正执行的请求身份；被吸收时两者不得混用 |
| `conversationKey` | 同一对话的调度键，见 §3.2 |
| `source`, `triggerKind`, `wakeKind` | Web、Channel、scheduler、internal 等来源及 cron/trigger/subagent_done 细分 |
| `actorId`, `principalId`, `agentId`, `sessionId` | 来源、权限主体及精确目标；由可信 Normalizer 填充 |
| `originRef`, `idempotencyKey` | TaskExecution、TriggerExecution、SubAgent Run/Group 或 Web adjustment ID |
| `instruction`, `evidenceRef`, `createdAt`, `deadlineAt` | 有界指令和证据引用；外部内容按不可信数据编码 |
| `deliveryMode`, `deliveryBindingId` | 独立轮次的结果投递要求 |

唤醒 Event 的完整模型历史在**真正启动时**加载，不能在排队时固定一份可能过期的 `messages`。Normalizer 只提供规范初值；被吸收时只提取安全、有界的调整指令，不启动它的 OutputPort。独立启动由 `SessionTurnService` 按工作项的 `eventId` 执行，桥接层生成真正的 `ChannelChatEvent`，使后续新任务仍可调整该 loop。

### 3.2 对话键

- 持久化 Agent Session：`agent:<agentId>:session:<sessionId>`；Task/Trigger 必须命中创建时固定的 `sessionId`。
  - 入站 socket 协议：`agent_message`（`lib/server/socket.io/controllers/agent.js`），路径 `SessionTurnService.runTurn → HeadlessSessionChannel(BaseChannel)`。
- 纯 Web 直连单聊：`web:<principalId>:contactor:<contactorId>`；禁止只凭 `contactorId` 把不同用户的请求合并。已有 `sessionId` 时仍校验其归属。
  - 入站 socket 协议：`llm_message`。历史由前端持有，**服务端不落 Agent Session，因此不参与 `SessionWorkLease`**（见 §5.2）。
  - 另有一个 `channel_message` 协议为拒绝型桩，只回「请使用 agentId + sessionId 调用 Agent 协议」，不产生 LLM 工作。
- 群聊、无会话的 Proxy/Internal 请求不从上述键猜测目标；需要单独定义群成员与共享链的调度规则后再接入。

`requestId` 标识某次 LLM 执行，不能用作长期对话键；同一对话多端连接使用相同的规范键。Dispatcher 负责鉴权并比较目标、权限和路由，来源不能直接取得另一个 Event 引用然后自行 `adjust()`。

## 4. Dispatcher 与 `ChatEvent.adjust()`

`ChatEventDispatcher.submit(incomingEvent)` 是所有唤起入口；活动 Event 通过注册/注销提供可见运行阶段。`ChatEvent.adjust(incomingEvent)` 是基类方法，只对正在运行且未终止的 Event 暂存输入，按 `idempotencyKey` 去重并限制条数与总字符数。返回值明确区分 `accepted_for_checkpoint`、`defer_to_next_turn`、`duplicate`、`incompatible`、`closed`；`accepted_for_checkpoint` 只表示有机会在后续工具检查点消费。若最终没有检查点，Dispatcher 自动转为下一轮，不能宣称模型已经看到。

自动化 Event 只有在目标 Agent/Session 一致、当前执行主体已具备所需工具权限、输出路由为 `session_only` 或与活动 Event 相同、且仍有下一次模型请求时才能被吸收。调整文本不能提升活动 Event 的 `principalId`、工具权限、`triggerKind` 或 OutputPort。条件不符时，按来源自己的身份和投递配置排队成为独立轮次。

纯 Web 用户在同一对话主动发送“插话/调整”时，也创建一个规范的 Web ChatEvent，经 Dispatcher 调用活动 `WebChatEvent.adjust()`。它不依赖 Agent、Task 或数据库 Session。普通 Web 新消息在已有活动 Event 时也走同一 Dispatcher；能并入则并入，否则在当前回复收口后以最新历史续发。

Web Socket `adjust` 帧使用独立的 `request_id/eventId`，在 `data.targetRequestId` 中指向活动请求，并携带 `contactorId` 与调整正文；服务端用已认证 Client 规范化为新 ChatEvent，不信任客户端声称的 `principalId`。ACK 返回 `eventId` 与 `accepted_for_checkpoint/defer_to_next_turn/duplicate/incompatible/closed`，并在注入或转下一轮时发后续状态。若回退成独立轮次，该轮取得新的 `requestId`，但沿用原 `eventId` 以便幂等关联。前端发送时立即创建独立的顶层 user 消息和 assistant 占位；注入检查点先 complete 原 assistant 可见输出，再将后续流写入新 assistant 消息，底层 LLM loop 继续运行。

活动 Event 的工具批次内可能并行调用多个工具；必须等所有 tool result 按调用顺序写入模型消息后再原子 drain 调整队列。实现检查点放在 `BaseLLMAdapter._handleToolCalls()` 的结果回填之后、结晶扫描和递归模型请求之前：

```text
assistant: tool_calls(A, B)
tool: A 的结果
tool: B 的结果
user: [workEventId=... 的调整指令]
assistant: 下一轮模型输出
```

不调用 `ChatEvent.abort()`，也不强制中断正在执行的工具或普通文本流。若活动 Event 后续没有工具调用，或提交与完成同时发生，Dispatcher 将原 Event 转为下一轮输入；只能在“本轮吸收”和“下一轮执行”之间选一个，不能丢失或双执行。

## 5. 两种历史所有权

### 5.1 Agent Session：后端持久化

新增 `SessionWorkItem` 作为 ChatEvent 的**持久化投递记录**，而不是第二套输入领域模型。保存 `eventId`、`conversationKey`、Agent/Session、来源引用、幂等键、状态、被吸收的活动 Event/assistant Message ID、尝试次数和时间；Session 租约由独立的 `SessionWorkLease` 表管理。来源的 `TaskExecution` / `TriggerExecution` 以工作项 ID 关联它。

现有 `task_executions` / `trigger_executions` 只新增可空 `session_work_item_id` 标量列和索引，不在旧表上加外键。SQLite 为补外键会重建整个旧表，启动期的破坏性 schema 检查会拦截；来源关联由服务层按 ID 维护。

`SessionWorkCoordinator` 为 Agent Session 管理数据库写入租约与唯一活动 loop。当前 PM2 只有一个实例，但租约仍以 `sessionId` 原子认领，带递增 fencing token；持有者续租，失去租约后不能继续落库。Web Agent 入口、Channel、`SessionTurnService`、Cron/Trigger 与 SubAgent 父唤醒都经它调度。现有 `BaseChannel` 实例锁只是局部节流，不能作为跨入口互斥。等待中的自动化 Event 第一版不与普通用户输入自动批量合并。

吸收时，Adapter 在工具结果之后追加带有 `eventId/wakeKind/originRef` 的 user-role continuation，并将工作项标记为 `absorbed`；`BaseChannel` 在 assistant 收口时把对应 `context_message` 一同落盘，随后才把工作项记为 `completed`。如果进程在两者之间退出，重启恢复必须先检查已落盘的标记；没有明确完成证据的部分执行不得盲目重试有副作用的任务，应进入 `needs_attention`。

### 5.2 纯 Web：前端持有历史

纯 Web 的活动 Event 使用相同 `adjust()` 和工具检查点。被吸收的 Web 输入显示为独立的顶层 user 消息。检查点先结束原 assistant 的可见输出，保留它的 tool call/result，再把后续输出流写入新 assistant 消息。`getValidOpenaiMessage()` 按原 assistant、user、新 assistant 的顺序重建历史，不能只在当前请求内追加而让下一轮历史丢失。

前端发送时先把独立用户消息、待发送状态与 `eventId` 写入本地消息链并执行 `client.saveNow()`；注入完成状态只负责把前一条 assistant 收口并定位后续 assistant。服务端的 streamCache 按每个可见 assistant 消息的 ACK 清理。重复状态帧用 `eventId` 去重，避免重连后重复插入。

若没有后续工具检查点，后端回复 `defer_to_next_turn`；前端先持久化这条待发送输入，等待当前回答 complete/failed 后**重新读取最新 `messageChain` 和设置**，以相同 `eventId/idempotencyKey` 发起独立轮次。不能直接执行排队时缓存的旧 `messages` 快照。断线重连后仍由前端恢复这条待发送输入；成功落到本地消息链后再清除待发送状态。第一版不声称纯 Web 插话拥有后端数据库的持久化保证。

## 6. 各来源接入

| 来源 | 创建 ChatEvent 的时机 | 后续约束 |
| --- | --- | --- |
| Cron 自然触发、`once`、手动 `run` | 任务实际到点或手动请求时 | 使用 Task 固定 Agent/Session；手动工具先按当前 Agent 校验 Task ownership；工具只返回提交回执，不能等待同 Session 的新 loop |
| Trigger/Sentinel | 脚本产出有效 `@WAKE@` 且通过冷却/预算后 | 无 wake 的脚本检查只记巡检结果；`wakeCount` 与 once 生命周期以持久化吸收或独立轮次启动为准 |
| SubAgent 完成 | Run/Group 结果已落库并需要唤醒父 Session 时 | Event 只带 Run/Group ID 与读取指令，结果正文仍由 `status/read_result` 获取；子 Session 执行独立 |
| 纯 Web 插话 | 用户显式选择运行时调整时 | `principalId + contactorId` 定位活动 Event；无检查点时前端用新历史续发 |

以上来源只向 Dispatcher 提交持久化工作项；Dispatcher 再用 `ChatEventFactory.createForWake()` 创建候选事件。`WakeInjector.processWake()`、`TaskScheduler._executeTask()` 和 `SubAgentDispatcher._deliverParentWake()` 不再直接向目标 Session 调用 `SessionTurnService.runTurn()`。空闲时由 Dispatcher 调用 `SessionTurnService` 执行工作项。

## 7. 完成、投递与回执

一个唤醒 Event 的生命周期至少区分：`accepted`（来源已登记）、`queued`（等待）、`absorbed`（并入活动 loop）、`running`（独立启动或模型已接收）、`completed/failed/deferred`（工作结果）。`absorbed` 不等于任务完成。Cron/Trigger 的执行记录不能用整个活动 assistant 回复填充 `finalAssistantMsg`，因为它还可能包含原长任务的内容。

第一阶段的 `completed` 表示承载该工作的 LLM 轮次及 assistant 消息已成功收口；它不单独证明模型完成了业务目标。Cron/Trigger 的业务结果仍由来源执行记录与模型输出解释。外部副作用可能在落库前已发生，重启时对没有明确落盘证据的部分执行进入 `needs_attention`，避免自动重复。Web 用户插话以包含它的轮次成功收口为消费完成；失败或中断时保留待发送状态。若以后需要逐项业务确认，可在此基础上增加受 `eventId` 约束的结构化回报工具。

被吸收的 Event 不创建第二份 assistant 流，不发送自己的 `complete` 帧。输出路由相同才允许自动化工作并入，防止任务结果泄露到别的 Channel；`session_only` 只写目标 Session。来源结果的独立投递状态以结构化完成回报和实际 OutputPort 结果为准，不能因模型提到任务就假定指定 Channel 已投递。现有 `streamCache`/前端 ACK 清理规则不变。

## 8. 实施顺序

### A. 基类事件与统一入口

先把 `SessionTurnService → BaseChannel → channels/llm.js` 的手工 Adapter Event 接线改为真实 ChatEvent，保持原 Web/Channel/Task 输出契约。再为基类增加规范事件身份、投递状态、`adjust()` 队列和阶段状态；扩展 Factory/Normalizer 为 Cron、Trigger、SubAgentDone 创建 Event。增加 Dispatcher 与鉴权，先让所有来源只排独立轮次，验证来源记录和目标身份正确。

### B. 唯一 Session 执行与后端持久化

增加 `SessionWorkItem`、写入租约、fencing 和重启恢复；Agent Session 的 Web/Channel/headless 入口统一经协调器。移除同一目标 Session 的跨实例并发写入和 `cron run` 的自等待。

### C. 工具边界 adjust

实现 Adapter 检查点、原子 drain、`context_message` 元数据与结晶/历史重建；先验证 Agent Session 和 WebChatEvent 都能接收同一种调整。无工具时验证自动进入下一轮，不谎报已注入。

### D. 纯 Web 续发与自动化完成

前端增加运行中发送入口、本地待发送状态、独立 user/assistant 消息和带最新上下文的续发；后端接入 Cron/Trigger/SubAgent 来源，完成工作项与来源执行记录的状态联动。

## 9. 验收矩阵

| 场景 | 必须满足 |
| --- | --- |
| 长工具循环中 Cron/Trigger/SubAgentDone 到来 | 都先成为 ChatEvent；兼容时由活动 Event 在工具结果后吸收，无第二个同 Session loop |
| 当前工具内调用 `cron run` | 先返回事件 ID；该工具结果回填后才允许吸收，无自等待 |
| 一批并行 tool call | 全部结果同序配齐，再插入调整；历史重建不出现孤儿 tool call |
| 普通文本输出且无后续工具 | 不截断；Agent Session 后端排下一轮，纯 Web 前端以最新历史续发 |
| 纯 Web 插话后刷新或断线 | 独立用户消息与分段助手输出可恢复，下一轮模型历史包含注入内容且不重复发送 |
| 两个 Web 用户使用相同 contactorId | 对话键含 principalId，无法跨用户调整 Event 或复用待发送输入 |
| 不同来源同时命中一个 Agent Session | **Web Agent（协议 `agent_message`）**、Channel、headless 共用写入租约，消息 seq 和 assistant 生命周期不交错 |
| 抢不到租约 | 必须排队等待或延后，**不得返回用户可见失败**（当前 Web Agent 入口会发 `failed` 帧，见[收敛实施计划](./session-work-injection-convergence-plan.md) P0-1） |
| 纯 Web 直连（协议 `llm_message`） | 不落 Agent Session，不参与 Session 租约；其插话需求由 `WebChatEvent.adjust()` 满足 |
| 不同权限或输出路由 | 拒绝并入活动 Event，按来源自己的身份与路由独立运行 |
| 提交与 Event 终态竞态、进程重启、重复 wake | 只选并入或排队之一；同一幂等键不生成两个工作，未完成项可恢复 |
| Agent 未确认、延后或失败 | 来源执行记录不误报完成；有界重试后可查询 `needs_attention` |

完成条件：所有会唤起 LLM 的来源均通过规范 ChatEvent 与 Dispatcher；Agent Session 不存在跨入口并发落库；纯 Web 的活动 Event 可使用同一 `adjust()` 插话；无工具回退与来源执行状态可重放、可查询。

## 10. 与旧 Steering 文档的关系

`chat-event-refactor-plan.md` 第 9 节的“工具结果后注入”和“不得谎报已消费”仍适用。本计划将其从 Web 专用调整扩展到所有会唤起 LLM 的 ChatEvent。对持久化 Agent Session，“不可注入时 `not_steerable`”改为后端排下一轮；对纯 Web，返回 `defer_to_next_turn` 并由前端以最新历史续发。`steering-and-abort-ux-spec.md` 的交互稿应按这些回执更新。Task/Trigger 目标 Session、Session FIFO 和 SubAgent 子 Session 隔离规则保持有效。
