# Agent、Session 与 Channel 重构测试与验收计划

> 权威规格：[Spec.md](./Spec.md)  
> 开发计划：[Development.md](./Development.md)

## 1. 目标

本计划验证四类核心结果：

1. Agent、Session、Channel 的所有权与多对多关系正确；
2. Web、外部 Channel、Cron、Trigger 和 SubAgent 使用同一显式执行身份；
3. 删除/解绑不会误删，也不会留下应删除的聊天数据和运行资源；
4. 新 UI 只暴露用户需要的 Agent 配置与 Channel 绑定操作。

P0 失败阻止合并或发布；P1 失败阻止默认启用；P2 可在明确记录风险后延期。

## 2. 测试层级与环境

### 2.1 层级

- Unit：领域服务、Resolver、Scheduler、Store 和前端 Store/组件；
- Contract：HTTP DTO、错误码、Socket/ChatEvent 身份字段；
- Integration：Prisma + SessionTurnService + Channel/Task/Trigger；
- E2E：浏览器设置页、Web 对话、模拟微信适配器；
- Migration：脱敏生产快照、幂等、回滚和冲突数据；
- Non-functional：并发、崩溃恢复、性能、安全和可观测性。

### 2.2 必测数据库

- SQLite 空库；
- 当前版本升级库；
- 同一 Agent 多 Channel 的存量库；
- 多 Channel 对同一 Agent 存在 model/provider 冲突的库；
- Task/Trigger 目标缺失、歧义或已删除的异常库。

所有集成测试使用隔离数据库，不读取或修改开发者真实数据。

## 3. 需求追踪测试矩阵

### 3.1 Agent 创建与配置

| ID | P | 场景 | 期望 |
|---|---|---|---|
| AG-001 | P0 | 创建 Agent，不传 Channel | 原子创建 Agent、初始 Session、默认 Web Binding |
| AG-002 | P0 | 创建 Agent 并绑定两个 Channel | 一个 Agent、一个初始 Session、两个额外 Binding，无重复 Agent |
| AG-003 | P0 | 第二个 Binding 创建失败 | 整个事务回滚，无孤儿 Agent/Session/Binding |
| AG-004 | P0 | 请求提交 agentId/masterId/botId | 内部 ID 被拒绝或忽略，绝不覆盖系统身份 |
| AG-005 | P1 | 修改 Agent 模型 | 所有入口下一轮使用新配置，Channel 记录不变 |
| AG-006 | P1 | 同名 Agent | 允许存在，主键不同，UI 可区分 |
| AG-007 | P1 | 模型或工具配置非法 | 返回稳定 422，数据库无部分更新 |

### 3.2 多对多 Binding

| ID | P | 场景 | 期望 |
|---|---|---|---|
| BD-001 | P0 | 一个 Agent 绑定 Web 和微信 | 两个 Binding 指向同一 Agent |
| BD-002 | P0 | 一个微信 Channel 绑定两个 Agent | 两个 Binding 指向同一 Channel |
| BD-003 | P0 | 重复绑定相同 Agent/Channel | 幂等返回已有 Binding 或稳定 409，不产生重复行 |
| BD-004 | P0 | 解绑一个 Channel | Agent、Session、Message 数量不变，Binding/Route 删除 |
| BD-005 | P0 | 删除 Channel | 所有相关 Binding/Route 删除，所有 Agent 消息保留 |
| BD-006 | P1 | Binding 指向其他 Agent 的 defaultSession | 返回 ownership_mismatch |
| BD-007 | P1 | Channel 凭据 API | token 永不返回明文，协议身份只读脱敏 |

### 3.3 路由解析

| ID | P | 场景 | 期望 |
|---|---|---|---|
| RT-001 | P0 | Channel 只有一个 enabled Binding，首次外部会话 | 自动创建 Route 并命中该 Agent/Session |
| RT-002 | P0 | Channel 有两个 Agent 且无 Route | 返回 route_required，不执行任何 Agent |
| RT-003 | P0 | 已存在 Route | 精确命中 Binding 和 Session |
| RT-004 | P0 | Route Session 属于其他 Agent | 拒绝路由并记录 ownership 错误 |
| RT-005 | P0 | 仅有一个其他在线 Channel | 不得 fallback 或误投 |
| RT-006 | P1 | Binding disabled | 不接受新入站执行，保留历史 Session |
| RT-007 | P1 | 显式切换 Agent/Session | 原子更新 Route，后续消息只进入新目标 |
| RT-008 | P1 | 并发首次入站 | 唯一键保证只产生一个一致 Route |
| RT-009 | P0 | 新私聊用户首次入站 | 创建独立根 Session 和 ChannelConversation，不使用 Agent 默认 Session |
| RT-010 | P0 | 新群首次入站 | 按群 ID 创建共享 Session，不按首位发言成员建 Session |
| RT-011 | P0 | 同群不同成员发言 | externalUserId 不同但命中同一活动 Session，成员审计分别记录 |
| RT-012 | P0 | 同一用户跨 Channel | 默认创建互相隔离的 ChannelConversation 和 Session |
| RT-013 | P0 | Channel 解绑后重绑同一 Agent | 恢复原 ChannelConversation 和活动 Session |
| RT-014 | P0 | 多 Agent 且无 Route 时执行 /agents | 绕过普通路由并列出所有 enabled Agent，不调用任一 LLM |
| RT-015 | P0 | /agent use Agent 名称或唯一 ID 前缀 | 更新当前外部聊天空间 Route，首次切入创建独立 Session |
| RT-016 | P0 | /agents 存在 child Session | 显示 `[SubAgent]`，不得伪装为永久 Agent |
| RT-017 | P0 | /agent use SubAgent | Route 指向所属 Agent，activeSession 指向 child Session |
| RT-018 | P1 | Agent/SubAgent 名称或 ID 前缀不唯一 | 返回明确歧义提示，不修改 Route |

### 3.4 Session 与 SubAgent

| ID | P | 场景 | 期望 |
|---|---|---|---|
| SS-001 | P0 | 一个 Agent 创建多个根 Session | 均归属同一 Agent，消息互不污染 |
| SS-002 | P0 | 创建 child Session | parent/child 可查询，agentId 一致 |
| SS-003 | P0 | 跨 Agent parentSessionId | 返回 409/422，不创建 Session |
| SS-004 | P0 | 构造 Session 环 | 服务拒绝 |
| SS-005 | P0 | 删除父 Session（显式 cascade） | 子树、Message、Chunk、ToolCall、Crystal 全部删除 |
| SS-006 | P0 | Web 和微信选择同一 Session | 双方读取完全一致的 MessageChain |
| SS-007 | P0 | Web 切换 Session | 微信 Route 的 Session 不发生变化 |
| SS-008 | P1 | SubAgent 执行 | 使用 child Session，不创建永久 Agent |
| SS-009 | P1 | 删除有 Task/Trigger 依赖的 Session | 默认 409 并返回依赖摘要 |
| SS-010 | P1 | 达到最大子 Session 深度 | 返回稳定错误，不破坏已有树 |
| SS-011 | P0 | Channel 下执行 /new | 新根 Session 关联当前外部聊天空间并成为 activeSession |
| SS-012 | P0 | Channel 下执行 /use | 只能切换当前外部聊天空间已关联的 Session/SubSession |
| SS-013 | P0 | Channel 根 Session 派生 SubSession | 子 Session 自动继承相同 ChannelSessionLink 和身份边界 |
| SS-014 | P0 | 普通 Session 异步派发 SubAgent | 父 Session 保持可聊天，不创建 Task Session，child 保存原始上下文 |
| SS-015 | P0 | SubAgent 完成后读取结果 | 自动唤醒父 Session；唤醒只含 group/run ID，主 Agent 再通过 `status/read_result` tool call 读取有界结果 |

### 3.5 SessionTurnService 与消息一致性

| ID | P | 场景 | 期望 |
|---|---|---|---|
| ST-001 | P0 | Web 正常一轮 | user 先落盘，assistant streaming 到 final |
| ST-002 | P0 | 微信正常一轮 | 与 Web 使用同一消息生命周期 |
| ST-003 | P0 | 同 Session 并发 100 条 | FIFO 生效，seq 连续且唯一 |
| ST-004 | P0 | 不同 Session 并发 | 可并行且上下文不串线 |
| ST-005 | P0 | LLM 中止/错误 | 保留部分内容并写正确终态 |
| ST-006 | P0 | 进程重启恢复 | streaming 消息转 aborted_by_restart |
| ST-007 | P0 | 输入 agentId/sessionId 不匹配 | LLM 不被调用，无消息落盘 |
| ST-008 | P1 | Channel 投递失败 | 执行和消息为成功，delivery 单独失败/待重试 |
| ST-009 | P1 | 无 Channel 的内部执行 | 正常完成并持久化 |
| ST-010 | P0 | Adapter 缺少 externalUserId | 返回 invalid_channel_envelope，不建 Session、不调用 LLM |
| ST-011 | P0 | Adapter 缺少 externalConversationId/messageId | 拒绝入站且无部分持久化 |
| ST-012 | P0 | 模型输入包装 V2 | 包含时间、用户 ID、输入渠道、会话类型和外部消息 ID |
| ST-013 | P0 | 包装元信息含引号/XML/换行 | 正确转义，不能突破 message 边界或注入伪造属性 |
| ST-014 | P0 | 持久化后重建上下文 | 元信息稳定且不重复包装，Prompt Cache 前缀一致 |
| ST-015 | P0 | 原始 payload 含 token/密钥 | Prompt、Message metadata、日志均不得泄漏 |

### 3.6 Cron/定时任务

| ID | P | 场景 | 期望 |
|---|---|---|---|
| CR-001 | P0 | 从 Session A 创建 Task 后切到 B | 到点仍写入 A |
| CR-002 | P0 | Agent 绑定多个在线 Channel | 任务执行身份不受 Channel 顺序影响 |
| CR-003 | P0 | 没有在线 Channel | Task 仍执行并写 Session，投递状态可观察 |
| CR-004 | P0 | delivery Binding 离线 | 不把 execution 标记失败，不误投其他 Channel |
| CR-005 | P0 | 删除 Agent | Cron/Timeout 停止，Task/Execution 删除且不再触发 |
| CR-006 | P0 | 删除/解绑投递 Channel | Task 归属保留并标记 needs_rebind |
| CR-007 | P1 | 重启恢复 active 周期任务 | 使用持久化 agentId/sessionId 恢复 |
| CR-008 | P1 | once 执行 | 仅执行一次，目标 Session 固定，状态 finished |
| CR-009 | P1 | Agent scoped list/remove | 无法读取或删除其他 Agent 的 Task |
| CR-010 | P1 | 请求仍传 preset 代替身份 | 返回 4xx，不创建任务 |

### 3.7 Trigger/Sentinel

| ID | P | 场景 | 期望 |
|---|---|---|---|
| TR-001 | P0 | Trigger 唤醒 | 精确注入创建时的 Agent/Session |
| TR-002 | P0 | 多 Channel/Agent 并存 | 无第一个实例或唯一在线实例 fallback |
| TR-003 | P0 | delivery Channel 离线 | Session 执行保留，投递单独失败 |
| TR-004 | P0 | 删除 Agent | Runner/PID 停止，Trigger 和 payload Execution 删除 |
| TR-005 | P0 | 删除 Session | 默认阻止或按显式策略处理，不留下 enabled+NULL Session |
| TR-006 | P1 | 删除 Channel | Trigger owner/Session 保留，投递 needs_rebind |
| TR-007 | P1 | persistent 多次唤醒 | 每次仍命中同一 Session，只有一个活动 PID |
| TR-008 | P1 | once 成功/失败 | 成功后结束；注入失败不误删且有审计 |
| TR-009 | P1 | scope 越权 update/remove | 被拒绝且 Runner 状态不变 |

### 3.8 删除生命周期

| ID | P | 场景 | 期望 |
|---|---|---|---|
| DL-001 | P0 | preview Agent 删除 | 数量准确且不修改数据 |
| DL-002 | P0 | 删除有根/子 Session 的 Agent | Agent、Session 树和全部消息投影为 0 |
| DL-003 | P0 | 删除多 Channel Agent | Binding/Route 为 0，Channel 均保留 |
| DL-004 | P0 | 删除有活跃流的 Agent | 流先取消，无后续 Chunk/Message 写入 |
| DL-005 | P0 | 删除有 Cron/Trigger 的 Agent | 调度器内存、子进程和数据库业务记录均清除 |
| DL-006 | P0 | 删除完成后重启服务 | 被删资源不恢复、不重新调度 |
| DL-007 | P0 | 重复 DELETE | 幂等，不扩大到 Channel 或其他 Agent |
| DL-008 | P0 | 删除 Agent A | 共享 Channel 下 Agent B 的所有数据完全不变 |
| DL-009 | P0 | 浏览器删除成功 | Agent/Session localStorage、IndexedDB、选中态和订阅清除 |
| DL-010 | P1 | 数据库事务失败 | API 不返回成功，DB 不出现半删除 |
| DL-011 | P1 | 清缓存失败 | DB 删除成功可重试清理，不恢复 Agent |
| DL-012 | P1 | 删除审计 | 不包含消息、Prompt、工具参数或外部身份 |

### 3.9 前端 UI/UX

| ID | P | 场景 | 期望 |
|---|---|---|---|
| UI-001 | P0 | 打开设置主入口 | 首屏为 Agent 列表，不是 Channel 账号列表 |
| UI-002 | P0 | 新建 Agent | 只出现用户可理解的 Agent 配置和 Channel 选择 |
| UI-002A | P0 | 选择 Provider | Model 下拉仅展示该 Provider 的可用模型并自动选择默认值 |
| UI-002B | P0 | 编辑 Agent 渠道 | 回填现有 Binding，保存后按多选差异绑定/解绑，Web 始终保留 |
| UI-002C | P0 | 自动生成会话标题 | 使用当前对话 Provider/Model，不读取独立标题模型设置 |
| UI-003 | P0 | 检索表单标签和请求体 | 无 masterId/userId/botId/agentId/sessionId/contactorId/preset 输入 |
| UI-004 | P0 | 创建成功 | 自动进入初始 Session，可立即 Web 对话 |
| UI-005 | P0 | Agent 绑定多个 Channel | 卡片和详情正确显示多个渠道徽标 |
| UI-006 | P0 | Channel 绑定多个 Agent | Channel 连接页显示准确数量和列表 |
| UI-007 | P0 | 解绑确认 | 明示聊天记录不会删除；完成后消息仍可打开 |
| UI-008 | P0 | 删除 Agent 确认 | 展示影响计数和不可恢复说明 |
| UI-009 | P1 | masterId 等诊断信息 | 仅高级折叠区脱敏只读展示 |
| UI-010 | P1 | 移动端创建/绑定/删除 | 无遮挡、横向溢出或不可点击操作 |
| UI-011 | P1 | 键盘与读屏 | Dialog 焦点、标签、错误和确认流程可访问 |
| UI-012 | P1 | 请求失败 | 保留输入、显示可行动错误、不产生重复实体 |
| UI-013 | P0 | 添加微信渠道并扫码 | 只创建 Channel；绑定所选 Agent 后认证并启动 |
| UI-014 | P0 | 创建未绑定渠道 | Agent/Session 数量不变，Channel 可认证、启动并保持在线 |
| UI-015 | P0 | 删除唯一绑定 Agent | Channel 不停止；收到新消息回复未关联 Agent，且不触发模型 |
| UI-015 | P0 | 删除共享渠道 | Binding 被删除，所有 Agent/Session/Message 保留 |
| UI-016 | P0 | 普通 Agent 聊天打开 SubAgent 工作区 | 仅列出当前 Agent + 主 Session 的 RunGroup，不混入其它会话 |
| UI-017 | P0 | Run 执行中实时推送 | Socket.IO 流事件驱动状态与 chunk 原位更新，可取消且不阻塞主聊天输入 |
| UI-018 | P0 | Run 结果就绪 | 自动唤醒主 Agent；主 Agent 通过 `status/read_result` 读取并形成用户可见答复，不出现 accept/reject 批复环节 |
| UI-019 | P0 | 提交调整或下一步指令 | 旧结果保留，同一 child Session 创建 attempt+1 并重新入队，完整保留上下文 |
| UI-020 | P1 | 移动端 SubAgent 工作区 | 抽屉不溢出，结果与显式继续操作可用 |

## 4. 迁移测试

### 4.1 必测用例

| ID | P | 场景 | 期望 |
|---|---|---|---|
| MG-001 | P0 | 任意环境 Schema hash 变化 | 不执行 force-reset；未受影响的表/记录保留，且同步前生成 SQLite 备份 |
| MG-002 | P0 | Schema 变更涉及不兼容字段 | 只影响 Prisma diff 涉及的表；备份可用于恢复，启动日志给出备份路径 |
| MG-003 | P0 | 启动流程收到旧重建开关 | 启动流程忽略该开关，不删除数据库文件；人工离线重建不属于自动启动路径 |
| MG-004 | P0 | 旧 Task 只传 preset | 返回 4xx，不创建兼容记录 |
| MG-005 | P0 | Trigger Session 不属于 Agent | 返回 409，不唤醒 |
| MG-006 | P0 | Channel 请求包含 provider/model | 字段被拒绝或忽略，不污染 Channel |
| MG-007 | P0 | Agent 创建请求包含 masterId | 返回 422 |
| MG-008 | P0 | 回滚演练 | 恢复旧版本与整库备份，不读取新库 |

### 4.2 空库结构校验

重建验收至少包含：

- Agent、Session、Message、Channel、Binding、Task 和 Trigger 初始业务计数为 0；
- 每个 Agent 的 Session/Message 所有权校验；
- 每个 Binding 的 Agent/Channel 存在性；
- Task/Trigger 的 Agent/Session/Binding 一致性；
- enabled 但不可执行资源数量；
- 不包含 token、消息正文或完整外部身份。

## 5. API 契约测试

每个 Endpoint 至少覆盖：

- 成功 DTO 和 Content-Type；
- 400/404/409/422 错误码；
- ownership 越权；
- 重复提交/幂等；
- 数据库事务回滚；
- 不返回 token 和内部协议字段；
- Agent 删除 preview 与实际删除计数一致；
- executionStatus 与 deliveryStatus 分离。

建议将响应 Schema 固化为可执行校验，避免前后端依靠 `res.data || res` 等模糊兼容继续
扩散。

## 6. 非功能测试

### 6.1 并发与性能

- 同一 Session 100 个并发写入，消息 seq 连续唯一；
- 10 个 Agent、每个 10 个 Session 并行执行，无跨 Agent 数据；
- 单 Channel 绑定 100 个 Agent 时，已有 Route 查找使用索引且不全表扫描；
- 1,000 个 active Task/Trigger 重启恢复时间记录并满足既有启动预算；
- Agent 删除 10,000 条 Message 时不出现 SQLite 长期锁死；必要时采用受控批量删除，
  但对外仍保持删除隔离和最终一致性合同。

### 6.2 崩溃恢复

- Agent 创建事务各步骤故障注入；
- Agent 删除在停止 Runner 后、事务前崩溃，重启后根据 DB 恢复调度；
- DB 删除提交后、缓存清理前崩溃，重启后不恢复已删 Agent；
- Task 执行完成但 Delivery 前崩溃，恢复后不重复 LLM 执行，只重试投递；
- Route 创建并发冲突后重读唯一记录。

### 6.3 安全

- 伪造 agentId/sessionId/bindingId 的跨 Agent 请求；
- 前端提交 masterId/userId/botId 覆盖攻击；
- 未认领渠道用户的 `isAdmin` 恒为 false，不能调用 adminOnly、终端或文件工具；
- 管理员码只能私聊认领、15 分钟过期、错误 5 次锁定、成功后不能重复使用；
- 认领只提升精确匹配的 `(channelId, externalUserId)`，同 Channel 其他用户及同用户在
  其他 Channel 均不继承管理员身份；
- `meta_tool` 与直接 `runTool` 都不能越过当前事件的工具白名单；
- Channel token 的创建、读取、日志和错误栈泄漏检查；
- 删除审计和重建日志隐私扫描；
- SubAgent 工具权限不因新增 Binding 扩张；
- Route API 权限和 externalConversationId 日志脱敏。

### 6.4 可观测性

对成功、路由歧义、ownership mismatch、执行失败、投递失败、删除和重建各执行一次，
确认日志/指标具有正确 `agentId/sessionId`，且不存在通过 fallback 填入的错误 ID。

## 7. 自动化测试建议布局

```text
mio-chat-backend/tests/
  agents/
    agent_service.test.js
    agent_lifecycle.test.js
    agent_channel_binding.test.js
    channel_route_resolver.test.js
  sessions/
    session_tree.test.js
    session_turn_service.test.js
  scheduling/
    task_identity.test.js
    task_delivery.test.js
  triggers/
    trigger_identity.test.js
    trigger_lifecycle.test.js
  migrations/
    agent_channel_v2_migration.test.js
  integration/
    web_wechat_shared_agent.test.js
    channel_multi_agent_routing.test.js

mio-chat-frontend/src/
  views/settings/__tests__/
    AgentManagerView.test.js
    ChannelConnectionsView.test.js
  stores/__tests__/
    agentsStore.test.js
    sessionsStore.test.js
  e2e/
    agent-create-bind.spec.js
    agent-delete.spec.js
    shared-agent-cross-channel.spec.js
```

命名可适配当前测试框架，但需求 ID 应写入测试标题，方便生成验收报告。

## 8. 人工验收脚本

### 场景 A：新建并跨 Channel 使用 Agent

1. 打开设置页；
2. 新建“验收助手”，配置模型，不填写任何内部 ID；
3. 确认自动生成初始 Session 且 Web 可立即对话；
4. 绑定一个测试微信 Channel；
5. 从 Web 发送消息，再从微信进入同一 Session；
6. 确认双方看到相同上下文和消息顺序；
7. 在 Web 切换到另一个 Session；
8. 确认微信 Route 未被被动切换。

### 场景 B：一个 Channel 多 Agent

1. 将同一测试 Channel 绑定 Agent A 和 B；
2. 使用无 Route 的新外部会话发消息；
3. 确认系统要求选择 Agent，不自动发送给 A 或 B；
4. 选择 B 并完成 Route；
5. 再次发消息，确认只进入 B 的目标 Session。

### 场景 C：定时任务固定 Session

1. 在 Agent A 的 Session A1 创建一分钟后执行的任务；
2. 切换到 Session A2，并停止所有外部 Channel；
3. 等待任务触发；
4. 确认结果存在 A1，A2 无新增消息；
5. 确认执行成功，投递状态独立显示为 pending/failed。

### 场景 D：解绑和删除

1. 记录 Agent A、Agent B、共享 Channel 及消息计数；
2. 从 Agent A 解绑 Channel，确认 A 的聊天仍存在；
3. 重新绑定并创建 Task/Trigger/子 Session；
4. 删除 Agent A；
5. 确认 A 的 Session、消息、任务、Trigger、Binding 和浏览器缓存全部清除；
6. 确认共享 Channel 与 Agent B 完全可用，B 的计数不变；
7. 重启后端并刷新浏览器，确认 A 不会恢复。

## 9. 最终验收标准

### 9.1 数据与领域

- [ ] 数据库能表达 Agent/Channel 多对多和 Session 父子树；
- [ ] Channel 不再拥有 Agent、Provider 或 Model；
- [ ] 所有 Session、Task、Trigger 均能追溯到唯一 Agent；
- [ ] 所有启用的 Task/Trigger 均绑定合法 Session；
- [ ] 不存在运行时“唯一 Channel”“第一个 Agent”身份兜底。

### 9.2 生命周期

- [ ] 新建 Agent 原子产生 Agent、初始 Session 和 Web Binding；
- [ ] 解绑/删除 Channel 不删除 Agent 聊天记录；
- [ ] 删除 Agent 真正删除所有 Session 和 Message；
- [ ] 删除 Agent 不删除共享 Channel 或其他 Agent 数据；
- [ ] 删除 Agent 不改变 Channel 连接状态；无绑定 Channel 收到消息时明确提示未关联 Agent；
- [ ] 删除后无活跃 LLM、Cron、Timeout、Trigger PID、Socket 订阅或浏览器消息缓存；
- [ ] 重启后被删除资源不恢复。

### 9.3 执行与调度

- [ ] Web、微信、Cron、Trigger 和 SubAgent 共用 SessionTurnService；
- [ ] Cron/Trigger 始终命中创建时固化的 Agent/Session；
- [ ] Channel 离线不阻止任务执行和 Session 持久化；
- [ ] 执行状态与投递状态可独立观察和重试；
- [ ] SubAgent 使用 child Session，不创建永久 Agent。

### 9.4 UI/UX

- [ ] 设置主页面以 Agent 为主体；
- [ ] 用户只配置 Agent 信息并选择 Channel；
- [ ] Agent 表单不出现任何内部或协议身份字段；
- [ ] Channel 认证元数据自动发现、只读、脱敏；
- [ ] 一个 Agent 多 Channel、一个 Channel 多 Agent 均可直观管理；
- [ ] 删除与解绑文案准确表达数据影响范围；
- [ ] 桌面和移动端关键流程通过无障碍验收。

### 9.5 破坏性发布

- [ ] 已确认维护窗口与“全部业务记录清空”的影响；
- [ ] 如需回滚，旧数据库整库备份已验证可恢复；
- [ ] Dev/Test 空库重建、重复启动和回滚演练通过；
- [ ] 新库中无旧字段、兼容投影或身份 fallback；
- [ ] 所有 P0、P1 自动化和人工验收通过；
- [ ] 发布、回滚和数据清理步骤均有执行记录及负责人签字。

只有上述全部验收项通过，才可执行生产整库重建并宣布本次重构完成。
