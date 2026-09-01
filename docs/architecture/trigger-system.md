# MioChat Trigger Architecture v0.4

> 状态：P1 文件版已实现；数据库化与安全收口待实施
> 日期：2026-08-31
> 依赖：[`session-persistence.md`](./session-persistence.md)
> 可执行 schema：[`session-persistence-schema.prisma`](./session-persistence-schema.prisma)

## 1. 目标与边界

Trigger 把“事件 → 唤醒指定 Channel 会话”定义为系统原语，统一支持 cron、script
和后续 webhook。唤醒仍通过向目标 session 追加一条带明确系统标记的 user 消息并
进入 `_processChat`，不引入特殊 LLM 身份。

当前已实现：

- `TriggerRegistry` 文件版 CRUD 与审计；
- `TriggerRunner` 子进程执行和 stdout `@WAKE@` 协议；
- `WakeInjector` 冷却、日限额和会话注入；
- `trigger_manage` 与 `/triggers`；
- script/cron 轮询运行。

仍待实现：

- Trigger/TriggerExecution 数据库化；
- 精确 channel 路由；
- payload 白名单、长度上限和全局熔断；
- 脚本环境变量白名单与更强隔离；
- webhook。

## 2. 分层

```text
lib/triggers/
  TriggerRegistry.js   Trigger 与 Execution 的存储接口
  TriggerRunner.js     script 子进程与 @WAKE@ 解析
  WakeInjector.js      限频、目标解析、消息注入
  WakeProtocol.js      stdout 协议
channels/triggers/
  index.js             挂载 ChannelRuntime
  webhook/             P2
lib/chat/persistence/
  SessionPersistence.js
```

`TriggerRegistry` 数据库化后保持现有公开方法，避免同时重写工具层和 SlashHandler。

## 3. Schema 与删除语义

Trigger 与 Session 共用一套关系图。权威 schema 位于
`session-persistence-schema.prisma`，本文件不复制模型，也不再用固定表数量约束
职责划分。

删除规则：

- once 唤醒成功后设置 `Trigger.deletedAt`，不物理删除；
- 所有默认查询排除 `deletedAt IS NOT NULL`；
- `TriggerExecution` 保存不可变 `triggerKey`，`triggerId` 为可空外键；
- 后台清理 Trigger 时 `TriggerExecution.triggerId` 置空，审计仍可按 triggerKey 查询；
- Channel/Session 删除时目标外键置空，并由服务事务性 disable Trigger；
- Trigger 不得级联删除 Execution。

## 4. 唤醒协议

脚本在 stdout 输出一行：

```text
@WAKE@ {"wake":true,"reason":"...","data":{}}
```

允许字段只有：

- `wake`: boolean，必需；
- `reason`: string，最大 2 KiB；
- `data`: JSON object，序列化后最大 16 KiB；
- `source`: string，可选，最大 128 字符；
- `firedAt`: ISO datetime，可选。

未知字段丢弃。非法 JSON、超限 payload 或非 object data 都只记录失败审计，不进入
LLM prompt。

标准流程：

1. 加载未删除且 enabled 的 Trigger；
2. 检查 trigger 冷却、日预算和 agent 全局预算；
3. 校验、截断并规范化 payload；
4. 精确查找 `channelId + agentId` 对应的运行实例；
5. 验证 session 存在且归属于同一 agent；
6. 插值 promptTemplate；
7. 通过 SessionPersistence 立即落盘 user 消息，再进入 Channel session FIFO；
8. 写 TriggerExecution；
9. persistent 更新计数；once 设置 deletedAt。

任何一步失败都必须记录 Execution，且不得 fallback 到任意 Channel。

## 5. 目标路由

Trigger 创建时必须绑定 `agentId`，正常情况下同时绑定 `channelId` 和 `sessionId`。

- `channelId` 缺失：只允许迁移期旧数据，自动 disable 并要求重新绑定；
- `sessionId` 缺失：创建时可解析 agent active session 并将结果固化，运行时不动态漂移；
- Channel 未运行：记录 `target_unavailable`，不选择第一个 active channel；
- Session 不属于 Agent：记录 `target_mismatch` 并 disable Trigger。

## 6. 生命周期与计数

区分两个计数：

- `fireCount`：脚本/cron 实际执行次数；
- `wakeCount`：通过限频并成功注入会话的次数。

冷却依据最近一次成功 wake，而不是脚本执行。日预算按 Execution 的成功 wake 统计，
不能只加载最近固定 100 条后推断。

once 仅在消息成功落盘并进入处理队列后软删除。注入失败时保留 enabled 状态，由
冷却和重试策略处理。

## 7. Script 安全

子进程不是安全沙箱。当前实现会继承完整 `process.env`，所以在完成以下措施前，
Trigger 脚本只能视为受信任的本地管理员代码：

- 默认环境只传 PATH、LANG、TRIGGER_ID、TRIGGER_AGENT_ID、TRIGGER_SESSION_ID 和
  TRIGGER_PARAMS；
- API key、数据库 URL、管理口令不得继承；
- scriptPath 必须 realpath 后位于配置的 scripts 根目录内；
- 禁止符号链接逃逸；
- 10 秒超时，stdout/stderr 分别限制 64 KiB；
- 并发执行数设全局上限；
- 可选部署级 sandbox/container 才能声称“不受信任脚本隔离”。

文档和 UI 不应把普通 `spawn()` 描述为安全隔离。

## 8. Webhook（P2）

```text
POST /channels/:channelId/triggers/:triggerId/hook
```

要求：secret 只存 hash、恒定时间比较、请求体大小限制、来源频控、payload 走同一
白名单。Webhook 只允许发起 wake，不能直接执行工具、Shell 或重启服务。

## 9. 数据迁移

从 `channels-data/triggers/triggers.json` 与 `executions.json` 导入：

- 使用稳定 id 保持 Trigger 主键；
- params/data 规范化为 JSON string；
- 旧 webhookSecret 明文不得直接写入新表，应 hash 后导入；
- 缺 channelId 的记录导入为 disabled；
- Execution 写 triggerKey 和原始 legacyJson，即使对应 Trigger 已不存在也可作为
  `triggerId=NULL` 的孤儿审计导入；
- `scripts/` 下的脚本进入 manifest 并校验 hash、权限、realpath 和 Trigger 引用，
  脚本正文继续由文件系统承载；
- 迁移账本复用 `LegacyMigration`，逐文件记录 hash 和状态；
- shadow 期间文件版为主、DB 镜像比对，切换后旧文件只读保留。

## 10. 与 Session Persistence 的关系

Trigger 不自行拼装或写 session JSON。WakeInjector 调用 Channel 的统一注入入口，
底层由 SessionPersistence 完成 user Message 落盘和 assistant placeholder 创建。

TriggerExecution 与 Message 不建立强外键。审计记录保存 `sessionId` 与注入产生的
`messageId` 快照即可，避免删除聊天历史时破坏系统审计。

## 11. 验收标准

- 现有 WakeProtocol/Registry/Runner/Injector/tool 测试在 DB adapter 下继续通过；
- once 唤醒后 list 不可见，但 Execution 可查询；
- 删除 Trigger、Channel 或 Session 后历史 Execution 仍存在；
- 两个运行 Channel 属于不同 agent 时，永不发生 fallback 误投；
- payload 超限、路径逃逸、超时、日预算和全局预算均有审计；
- 同一 Trigger 并发触发只允许一个请求越过冷却；
- 迁移脚本重复执行不产生重复 Trigger 或 Execution。

## 12. 分期

- P1.1：Registry DB adapter、迁移、软删除与精确路由；
- P1.2：payload/环境/路径/并发安全收口；
- P2：webhook；
- P3：管理面板和统计。

Trigger DB 化可跟随 Session schema 发布，但通过独立 feature flag 切换，不与
Prefix Cache 或 `mio_meta` 绑定上线。
