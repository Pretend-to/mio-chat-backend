# Agent、Session 与 Channel 重构开发文档

> 依赖规格：[Spec.md](./Spec.md)  
> 测试与验收：[TestPlan.md](./TestPlan.md)

## 1. 实施原则

本次重构跨越数据库、运行时、调度器、API 和前端，采用一次性领域模型切换，不兼容
旧前端请求；数据库启动同步不因 schema 变化而整库清空，未受影响的存量数据应保留。

核心原则：

- 直接替换 Schema、API 与 UI，不保留双读双写；
- 所有身份均显式传递，禁止新增 fallback；
- Channel 连接生命周期与 Agent 执行生命周期分别管理；
- 破坏性删除集中到领域服务，Controller 和 UI 不直接拼级联操作；
- Dev/Test/生产启动时都只做按 schema diff 的增量同步；同步前自动备份 SQLite，整库重建只能由人工离线执行；
- 每一阶段均以 [TestPlan.md](./TestPlan.md) 对应门禁结束。

## 2. 当前代码改造地图

### 后端

| 现有位置 | 当前职责/问题 | 目标改造 |
|---|---|---|
| `prisma/schema.prisma` | `Channel.agentId` 单向归属；Session 无 parent | 新增 Binding、Route、自关联和 Task 外键 |
| `channels/ChannelStore.js` | 创建 Channel 时 upsert Agent | 只管理 Channel，不创建/更新 Agent |
| `channels/ChannelRuntime.js` | 每个 Channel 创建唯一 Agent Memory | 连接管理 + 入站 Envelope，不拥有 Agent Memory |
| `channels/common/BaseChannel.js` | Channel 内完成 Session 执行 | 拆出 SessionTurnService，保留适配器输出能力 |
| `lib/chat/persistence/*` | Agent/Session 消息存储 | 增加 parent/ownership 查询和删除统计 |
| `lib/cron.js` | 用 preset 找运行 Channel，动态取 active Session | 用固定 agentId/sessionId 调 SessionTurnService |
| `lib/plugins/ai-plugin/tools/cron.js` | 把 contactorId 当执行身份 | 从 ChatEvent 固化 Agent/Session/Binding |
| `lib/triggers/WakeInjector.js` | 通过 agentId+channelId 找运行实例 | 先执行 Session，再独立投递 |
| `lib/triggers/TriggerRegistry.js` | Trigger 关系接近目标但删除策略不完整 | 增加 Binding/source 语义和 ownership 校验 |
| `lib/server/http/controllers/channelController.js` | Channel CRUD 混入 Agent 字段 | 收窄为连接管理，新增 Agent/Binding Controller |
| `lib/chat/llm/events/normalizers/ChannelNormalizer.js` | 多字段 fallback 生成 channelId | 接收已解析的显式身份 |

### 前端

| 现有位置 | 当前职责/问题 | 目标改造 |
|---|---|---|
| `src/views/settings/ChannelManagerView.vue` | Channel 卡片即 Agent 卡片；可编辑 agentId/model | 拆为 AgentManager 与 ChannelConnections |
| `src/components/profile/ChannelSettingsView.vue` | Agent 配置与 Channel 配置混杂 | Agent 详情的 Binding 面板 |
| `src/stores/contactorsStore.js` | Channel contactor 以 channelId 为 id | Agent/Session 作为对话主键，Channel 仅为来源元数据 |
| `src/lib/client.js` | 本地消息按 contactorId 分片 | 迁移到 agentId/sessionId 缓存键 |
| Automation 页面与 store | 展示 preset，缺少 Session 绑定 | 展示 Agent、Session、投递 Channel |

## 3. 推荐模块边界

```text
lib/agents/
  AgentService.js
  AgentLifecycleService.js
  AgentRepository.js

lib/chat/sessions/
  SessionService.js
  SessionTurnService.js
  SessionOwnership.js

channels/bindings/
  AgentChannelBindingService.js
  ChannelRouteResolver.js
  ChannelConversationService.js
  ChannelEnvelope.js
  ChannelOutputPort.js

lib/scheduling/
  ScheduledTaskService.js
  ScheduledTaskRunner.js

lib/server/http/controllers/
  agentController.js
  sessionController.js
  agentChannelBindingController.js
```

实际目录可遵循仓库既有风格微调，但依赖方向必须是：

```text
Controller / Tool / Adapter
          -> Domain Service
          -> Repository / Persistence
```

Controller、Tool 和 Adapter 不直接操作 Prisma 级联关系。

## 4. 分阶段开发计划

### Phase 0：契约冻结与特征测试

目标：在改动前锁定当前可保留行为和已知错误行为。

工作项：

1. 为 Channel start/stop/auth、消息落盘和 Trigger Runner 添加特征测试；
2. 添加失败测试，证明当前 Cron 会动态漂移 Session、Channel 删除只删 Channel、
   多 Channel fallback 存在；
3. 定义 ID 生成器：`agent_`、`session_`、`binding_`、`route_`；
4. 定义统一 DTO 和错误码；
5. 建立 feature flags：
   - `MIO_AGENT_CHANNEL_MODEL=v1|v2`
   - `MIO_SESSION_TURN_SERVICE=legacy|unified`
   - `MIO_AGENT_SETTINGS_UI=legacy|v2`

退出条件：所有旧行为有测试证据，新规格中的禁止 fallback 已有失败用例。

### Phase 1：Additive Schema

目标：只增加结构，不改变生产读取路径。

工作项：

1. 扩展 Agent 展示与状态字段；
2. 新增 `AgentChannelBinding` 和 `ChannelRoute`；
3. 为 Session 增加 `parentSessionId/kind/visible`；
4. 为 Task 增加 nullable `agentId/sessionId/deliveryBindingId/migrationStatus`；
5. 为 Trigger 增加 `deliveryBindingId/sourceChannelId/migrationStatus`；
6. 为执行记录增加必要的 Agent、Session 和 Delivery 快照；
7. 添加索引、外键和 Prisma migration；
8. 保留 `Channel.agentId/provider/model` 与 Task 旧字段。

注意：由于 Task 存量尚未回填，第一阶段新增外键必须 nullable。切换完成后再收紧为
required。

退出条件：`prisma validate`、空库迁移、生产快照迁移和回滚演练通过。

### Phase 2：领域服务与原子生命周期

目标：建立新 API 的可靠写路径。

#### AgentService

- create/update/list/get；
- 生成 ID，不接受调用方指定内部 ID；
- 校验模型、工具、技能配置；
- 默认 Web Binding 策略。

#### AgentLifecycleService

- `createWithInitialSession(input)`：单事务创建 Agent、Session、Bindings；
- `previewDelete(agentId)`：返回删除计数和活跃资源；
- `delete(agentId)`：先隔离执行，再事务级联，再清缓存；
- 幂等删除：已不存在返回稳定结果，不因重试删除 Channel。

#### SessionService

- 根/子 Session CRUD；
- parent 同 Agent、无环、深度限制；
- 删除前依赖检查；
- Session 树查询；
- Binding/Route Session 指针校验。

#### BindingService

- bind/unbind/list；
- 绑定时验证 Agent/Channel；
- unbind 后处理 Route 和 Delivery 依赖；
- 不触碰 Agent 消息。

退出条件：领域服务单元测试和事务故障注入测试通过。

### Phase 3：增量 Schema 切换

目标：启用新关系时保留未受影响的存量数据，不读取或转换已删除的旧字段。

切换步骤为：

1. 启动时由 Prisma 按 schema diff 同步必要的表；
2. 同步前自动创建 SQLite 一致性备份；
3. 若涉及列删除、类型不兼容或关系重建，依据备份和显式迁移处理受影响数据；
4. 重新创建缺失的 Agent、渠道连接、任务与哨兵；
5. 验证所有权约束和删除级联。

退出条件：未受影响的表/记录保持可读，且不存在任何旧字段读取或 fallback。

### Phase 4：统一 SessionTurnService

目标：让 Agent 执行脱离 Channel 生命周期。

步骤：

1. 从 BaseChannel 提取 Agent 配置加载、Session FIFO 和消息生命周期；
2. 定义 `runTurn()` 输入输出 DTO；
3. Web 路径接入统一服务；
4. Web 联系人仅由 `/api/agents` 生成，`web-default` 只作为 Binding 展示；
5. 会话 RPC 改为 `/api/agent/*/:agentId` 并显式携带 `sessionId`；
6. Channel 路径接入 Envelope + RouteResolver；
7. 保留 BaseChannel 适配器发送、typing、确认交互等 I/O 能力；
8. ChatEventFactory/Normalizer 只接收显式身份；
9. 移除 `channelId || agentId`、`sessionId || activeSession` 等运行时 fallback；
10. 为同 Session FIFO 和不同 Session 并行建立压力测试。

BaseChannel 只作为协议适配器复用执行管线，不得恢复旧身份 fallback。

同时完成 Channel 会话作用域切换：

- 所有 Adapter 输出 `ChannelInboundEnvelopeV2`，强制携带外部用户、外部会话和消息 ID；
- `ChannelRouteResolver` 只解析 Agent，`ChannelConversationService` 负责首次建 Session、活动
  Session 和 Slash 切换；
- `ChannelAgentRoutingService` 在普通路由前处理 `/agents`、`/agent`，支持按名称、完整 ID
  或唯一 ID 前缀切换；列表将 child Session 明确标记为 `[SubAgent]`；
- 私聊按用户建 Session，群聊按群共享 Session；
- SubSession 继承父 Session 的 ChannelSessionLink；
- `prepareChannelUserInput` 由单一时间戳参数升级为接收 canonical envelope，并同时派生模型
  包装和持久化 metadata。

退出条件：Web、微信、内部任务使用同一执行入口；跨入口消息顺序一致。

### Phase 5：Cron、Trigger 与 SubAgent

#### Cron

1. Task 创建时固化 Agent/Session/Delivery Binding；
2. Scheduler 直接调用 SessionTurnService；
3. 删除 `_findChannelByPreset()` 和“只有一个 Channel”兜底；
4. 离线投递不影响任务执行；
5. Task list/update/remove 强制 Agent scope；
6. 一次性任务、周期任务、禁用和重启恢复保持原语义。

#### Trigger

1. Registry 校验 Agent/Session/Binding 一致性；
2. WakeInjector 不再查找唯一运行 Channel；
3. Runner 只负责事件进程生命周期；
4. 事件唤醒进入 SessionTurnService；
5. 结果通过可选 Binding 投递；
6. 删除/解绑 Channel 只改变投递状态；
7. 删除 Agent 时 Runner 必须同步停止。

#### SubAgent

完整异步生命周期、工具协议、前端 UI、测试与验收以
[`SubAgentAsyncDevelopmentPlan.md`](./SubAgentAsyncDevelopmentPlan.md) 为准。

1. 子任务创建 `kind=subagent` 的 child Session；
2. 每次执行显式携带 parent/child Session ID；
3. 不创建永久子 Agent；
4. 工具和安全策略使用 Run 快照；
5. 父级必须是用户日常使用的普通 Session，不额外创建 Task Session；
6. 结果只持久化在 SubAgentRun；完成后唤醒父 Session，但只发送 group/run ID 和读取指令，
   由主 Agent 通过 `status/read_result` tool call 主动读取。若需要外部投递，单独走指定 Binding。

退出条件：调度器无 ChannelRuntime 身份依赖，SubAgent Session 树可查询和级联删除。

### Phase 6：HTTP API 与前端 V2

#### 后端 API

- 新增 Agent、Session、Binding、Route Controller；
- 增加 OpenAPI/接口测试；
- 所有写接口使用统一错误码和 ownership 校验；
- 删除 API 提供 preview 和实际删除计数；
- Channel 创建 API 只接受版本化 Adapter/Profile/Config DTO，并拒绝 Agent 或内部身份字段。

#### 前端页面

1. 新建 `AgentManagerView` 作为设置主入口；
2. 新建 Agent 两步流程；
3. Agent Detail 分区展示配置、Session、Binding 和 Automation；
4. 将 ChannelManager 改为 ChannelConnections，仅管理认证连接；
5. 删除所有内部 ID 输入框；
6. Web 聊天状态改为 `activeAgentId + activeSessionId`；
7. IndexedDB 使用版本化缓存键，例如 `mio_msg_v2_<agentId>_<sessionId>`；
8. 首次加载直接删除旧 Channel-contactor 缓存，不迁移旧记录；
9. 删除 Agent 后清理所有相关本地缓存和订阅；
10. Automation 页面改为 Agent/Session/Delivery Channel 选择器；
11. ChannelConnections 提供创建、扫码、轮询、启停和删除，并允许选择已有 Agent 绑定。

建议 UI 状态：

- Agent create：`editing -> creating -> created -> binding -> ready`；
- Channel auth：`unbound -> authenticating -> bound -> running/stopped/error`；
- Agent delete：`previewing -> confirming -> deleting -> deleted/error`。

退出条件：前端 E2E、无障碍和响应式验收通过，用户路径不暴露内部身份。

### Phase 7：切换与观测

1. 在 Dev/Test 空库验证新读写路径；
2. 检查 Route、Agent/Session 解析和任务目标；
3. 同版本启用新 UI 与新 API；
4. 观察 ownership 错误、路由歧义和投递指标；
5. 生产维护窗口执行整库重建；
6. 更新旧架构文档状态。

## 5. 错误码

建议稳定错误码：

| HTTP | code | 场景 |
|---|---|---|
| 404 | `agent_not_found` | Agent 不存在 |
| 404 | `session_not_found` | Session 不存在 |
| 404 | `channel_not_found` | Channel 不存在 |
| 409 | `ownership_mismatch` | Session/Binding 不属于目标 Agent |
| 409 | `route_required` | Channel 多 Agent 且无法确定路由 |
| 409 | `session_has_dependencies` | 删除 Session 前仍有任务/Trigger |
| 409 | `agent_deleting` | Agent 已进入删除隔离状态 |
| 422 | `internal_identity_forbidden` | 客户端提交服务端管理的身份字段 |
| 422 | `invalid_parent_session` | 父子 Session 非法或成环 |
| 503 | `delivery_unavailable` | 执行成功但实时投递不可用 |

执行成功但投递失败不应把整个 Task 标记为 execution failed。API/Execution 应分别返回
`executionStatus` 和 `deliveryStatus`。

## 6. 事务边界

必须使用单事务的操作：

- 创建 Agent + 初始 Session + 默认/选定 Binding；
- 更新 Route + 校验 Binding/Session ownership；
- 删除 Binding + Route + 标记 Delivery 依赖；
- 删除 Session 树 + 处理 Task/Trigger 依赖；
- 删除 Agent 全部私有业务数据；
- Task/Trigger 创建时固化身份。

不能放在数据库事务内的操作：停止进程、取消 LLM、断开 Socket、发送外部消息。
使用“先隔离、再事务、后清缓存/投递”的顺序，并为事务失败提供恢复逻辑。

## 7. 前端接口状态模型

建议 Store 归一化：

```text
agentsById
sessionsById
sessionIdsByAgentId
channelsById
bindingsById
bindingIdsByAgentId
activeAgentId
activeSessionIdByAgentId
```

消息按 `sessionId` 管理。ChannelEnvelope 元数据可挂在 Message source 上，但不得决定
消息存储分片。

客户端不得从名称、数组位置、Channel 数量或旧 contactorId 推导 Agent/Session。

## 8. Code Review 检查表

每个相关 PR 必须确认：

- [ ] 没有新增 ID fallback；
- [ ] 没有让 Channel 保存模型/人格/工具配置；
- [ ] Session ownership 在服务端校验；
- [ ] 删除操作有测试且不扩大删除范围；
- [ ] Task/Trigger 固化 Agent 和 Session；
- [ ] Channel 离线不阻止无 I/O 依赖的 Agent 执行；
- [ ] 前端没有展示或提交内部协议身份；
- [ ] 迁移可重复执行且有验证报告；
- [ ] 日志无 token、消息正文和未脱敏外部身份；
- [ ] 新增指标可区分执行失败与投递失败。

## 9. 文档交付

实现期间同步维护：

- 本规格及决策变更记录；
- Prisma ERD/迁移说明；
- Agent、Session、Binding、Task/Trigger API 文档；
- Channel Adapter 接入指南；
- 前端用户操作说明；
- 运维迁移、回滚和数据验证手册；
- [TestPlan.md](./TestPlan.md) 的执行证据。
