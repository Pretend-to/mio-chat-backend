# Agent 自我管理与默认投递

## 工具职责

- `agent_profile`：`read` / `update`，仅管理当前 Agent 的名称、头像、简介。
- `agent_soul`：`read` / `append` / `replace` / `clear`，管理长期人格。追加和替换必须提供非空 `soul`，清空使用明确 action。修改在下一轮独立执行加载，不追溯改写正在运行的模型上下文，也不能改变服务端权限。
- `agent_delivery`：`read` / `set` / `clear` / `reset`。`read` 返回已绑定的非 Web 渠道；`set` 接受公开的 `channelId`；`clear` 显式清空；`reset` 恢复自动选择。

所有工具要求明确的 Agent 上下文和管理员执行身份；不接受模型传入另一个 `agentId`。每个 action 只接受对应字段，写操作返回实际变化及生效时机。Soul 追加在数据库事务内读取当前值并写入。

旧 `agent_profile` 的 Soul、投递动作已移到对应工具，不保留模糊的多职责入口。工具描述和参数变化会改变 `_mid_` hash；Agent 固定工具集会重新发现新工具，手工保存完整工具名的前端配置需要重新解析。

## 默认规则

默认值仅从**当前 Agent 已绑定、enabled 且 outboundEnabled 的非 Web 渠道**中选择。

- 自动策略按绑定创建时间升序选第一个；同时间按渠道创建时间、Binding ID 稳定排序。
- 没有外部投递渠道时默认值为空，不能把 Web 当投递渠道。
- 临时离线不导致自动改投其他渠道。
- 手工指定目标后优先使用手工目标；目标解绑/失效后可使用剩余候选中的最早渠道。
- 显式 `clear` 通过 `AgentMeta.default_delivery_policy = "none"` 持久化，保持为空。`reset` 将策略恢复为 `"auto"`。未提供投递设置不改变已有选择。
- 旧 Agent 的默认指针为空时，也按照同一规则计算有效默认值，无需重新绑定或数据迁移。旧的非空手工指针继续尊重。

默认解析由 `lib/chat/delivery/DefaultDelivery.js` 提供。Agent API、任务/探针创建、Session 唤起投递兼容判定和 Session 实际执行均使用该规则，避免 UI 有默认值而运行时仍读到空指针。

## 自主安排下一次工作

后台唤起和用户会话中的 `cron` 都从当前执行上下文取得 `agentId + sessionId`。自主 Agent 可以调用：

```json
{"action":"add","taskId":"next-work","cron":"+15m","triggerPrompt":"继续完成下一阶段工作"}
```

省略投递参数时，交互请求沿用当前有效外部入口，后台自主唤起使用 Agent 最新默认渠道；不会被前一次唤起遗留的渠道锁定。不需要人工另填投递渠道。无外部渠道也允许创建后续任务，结果保留在 Session；显式 `session_only` 始终禁止外部投递。显式选择已删除的目标不会静默换渠道，仍按 `needs_rebind` 报告。

任务持久化后交给调度器，触发时通过统一 Dispatcher 唤起同一 Agent / Session。Agent 可以复用任务 ID 重新安排后续工作；旧单次任务仅在 `cron/runAt/status` 仍匹配本次调度时标记完成，并且不清理新计划的定时器，避免旧任务收尾覆盖新的计划。新增工具不改变调度权限、会话租约、幂等与工具权限边界。
