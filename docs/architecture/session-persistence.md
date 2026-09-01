# MioChat Session Persistence Architecture v0.4

> 状态：schema spike 已完成，待实现
> 日期：2026-08-31
> 范围：Channel 会话、流式回复、结晶和旧 JSON 数据迁移
> 可执行 schema：[`session-persistence-schema.prisma`](./session-persistence-schema.prisma)

## 1. 结论

Channel 会话从 `memory/agents/*/sessions/*.json` 的整文件读写迁移到
Prisma/SQLite。迁移后的基本存储单位是“一条逻辑消息”，不是一个内容块：

- `Message` 保存一条完整的前端格式 user/assistant 消息；
- `MessageChunk` 追加记录 assistant 流式事件，用于崩溃恢复和断线回放；
- `ToolCall` 是从 `Message.content` 派生的可查询审计投影；
- `Crystal` 保存结晶版本及它覆盖到的消息序号；
- `PendingMemory` 替代 session JSON 中的 `pending_memories`；
- `LegacyMigration` 逐源文件记录迁移状态，禁止使用单一全局布尔值判断完成。

`Message.content` 是无损权威数据。`text`、`ToolCall` 等字段均可从它重建，不能
反向覆盖 `content`。

## 2. 当前问题与真实代码锚点

当前 `MemoryStore.appendToChat()` 每追加一条消息都会读出并重写整个 session
JSON。结晶、pending memory 和裁剪也会重写同一个文件，因此既有写放大，也有
读改写竞争。

当前用户消息并非“到达即落盘”，而是在 LLM 整轮完成后才与 assistant 消息一起
追加：

- 对话入口：`channels/common/BaseChannel.js::_processChat()`；
- 当前 user 落盘：约第 673 行；
- 当前 assistant 落盘：约第 701 行；
- 流式文本边界：`channels/llm.js::flushTextBlock()`；
- 结晶与裁剪：`channels/llm.js` 的 `crystallize` 事件分支。

因此实现时必须改变对话生命周期，不能只把 `MemoryStore` 的文件操作替换成 SQL。

## 3. 数据语义

### 3.1 Message

一行代表一条逻辑消息，与现有 `session.chat[]` 元素一一对应。

允许的 `role`：

- `user`
- `assistant`
- `system`（仅兼容导入；新触发器仍以明确标记的 user 消息唤醒）

允许的 `status`：

- `streaming`
- `final`
- `aborted_by_user`
- `aborted_by_restart`
- `error`

不再使用 `kind=round_end` 或创建伪消息表示生命周期。轮次边界由 user 消息和
连续 seq 自然推导；终止原因由 assistant `status` 表示。

`content` 保存现有前端格式块数组的 JSON，包括 text、reason、tool_call、图片、
文件及结晶事件。`text` 仅保存可搜索、可快速注入的纯文本投影。

旧消息缺少 `content` 时，数据库 `content` 写入 JSON 字面量 `null`，并在
`legacyJson` 中保留“字段缺失”这一事实；不得擅自改造成空数组。

### 3.2 MessageChunk

Chunk 是 append-only 事件，不是另一份聊天历史。每个 assistant message 内使用
单调递增的 `seq`，唯一键为 `(messageId, seq)`。

第一版只持久化具备恢复价值的语义事件：

- `text_delta` 或完成的 `text_block`
- `reason_delta`（若供应商允许持久化）
- `tool_start`
- `tool_result`
- `media`
- `complete`
- `error`

不得对每个底层 token 同步执行一次事务。实现应在以下二者中择一：

- 按完成的语义块立即提交；或
- 以不超过 100ms 的窗口批量提交 delta。

### 3.3 ToolCall

`ToolCall` 用于审计、统计和恢复工具执行状态，保存参数、结果、耗时和状态。
它不是 prompt 组装的权威来源。发生投影失败时仍可从 `Message.content` 重建。

### 3.4 Crystal 与归档

结晶采用版本链。`coversThroughSeq` 记录本次结晶覆盖到的最大消息 seq。

原 `rotateChat()` 不再删除历史消息，而是给已被结晶覆盖且不属于保留轮次的消息
设置 `archivedAt`。正常 prompt 查询只读取 `archivedAt IS NULL` 的消息；历史回溯
仍能查询归档消息。

## 4. 原子序号与并发

WAL 和 `busy_timeout` 只处理 SQLite 锁竞争，不定义业务顺序。同一 session 的
消息序号必须在数据库事务内分配：

```js
await prisma.$transaction(async tx => {
  const session = await tx.session.update({
    where: { id: sessionId },
    data: { nextSeq: { increment: 1 } },
    select: { nextSeq: true },
  })
  const seq = session.nextSeq - 1
  await tx.message.create({ data: { ...message, sessionId, seq } })
})
```

`@@unique([sessionId, seq])` 是最后一道防线。遇到唯一键或数据库忙错误时，服务层
应有限次数退避重试，不能静默覆盖。

流式快照更新使用 `revision` 做乐观锁：更新必须携带预期 revision，并原子递增。
旧 flush 不能覆盖更新的内容。单进程内的 session FIFO 保留作为降低冲突的优化，
但不能作为持久化正确性的前提。

## 5. 新对话写入生命周期

### 5.1 正常完成

1. 读取当前历史上界，构建本轮调用所需的历史快照。
2. 原子分配 seq，立即插入 `Message(role=user, status=final)`。
3. 原子分配下一 seq，插入空的
   `Message(role=assistant, status=streaming)`；其 id 复用 `ctx.messageId`。
4. 启动 LLM。
5. 在语义块边界追加 `MessageChunk`，并以 revision 乐观锁更新 Message 快照。
6. 工具开始时 upsert `ToolCall(status=running)`；结束时写入结果、耗时和最终状态。
7. 收到 complete 后写最终 `content/text`，状态改为 `final`，追加 `complete` chunk。

历史快照必须以步骤 2 分配的 user seq 为上界，避免把本轮 user 消息重复注入。

### 5.2 用户中止或运行错误

- 用户中止：保留已生成内容，assistant 状态改为 `aborted_by_user`；
- 供应商/工具错误：保留已生成内容，状态改为 `error` 并写 error chunk；
- 两种情况都不得删除 assistant 占位行。

### 5.3 进程重启

应用启动完成 DB 连接后，扫描仍为 `streaming` 且早于本次进程启动时间的消息，
将其改为 `aborted_by_restart`。读侧把已有内容作为不完整 assistant 回复纳入历史，
并在内部 prompt 转换时附加中断标记；不修改用户可见原文。

## 6. 服务边界

新增 `lib/chat/persistence/SessionPersistence.js` 作为唯一数据库入口。第一阶段提供
与当前 `MemoryStore` 相容的 facade，以降低 BaseChannel、SlashHandler 和工具层的
切换风险：

- `listSessions/getSession/createSession/deleteSession`
- `appendToChat/getChat/clearChat/rotateChat`
- `setCrystal/getCrystal`
- `appendPendingMemory/getPendingMemories/clearPendingMemories`
- `getActiveSession/setActiveSession`
- `getAgentMeta/setAgentMeta`

同时新增生命周期型接口，供 `_processChat` 使用：

- `appendUserMessage()`
- `beginAssistantMessage()`
- `appendAssistantChunk()`
- `upsertToolCall()`
- `finalizeAssistantMessage()`
- `recoverInterruptedMessages()`

业务层不得直接调用 Prisma 的 Message/Chunk 表。

## 7. 迁移与切换

### 7.1 全量覆盖合同

“迁移完成”表示以下所有存量均已进入 DB 并通过逐源校验，而不只是当前 session：

- `memory/agents/<agentId>/`：即使只有 meta、soul 或空目录，也创建 Agent；
- `soul.md`：按 UTF-8 原文完整保存；
- `global/*.md`：每个 category 保存为一份完整 Markdown 文档，不按行拆事实；
- `meta.json`：每个 key 的 JSON 类型和值保持不变；
- `active`：保留 active session 指针并验证归属；
- `sessions/*.json`：session 字段、当前 chat、crystal、pending memories；
- `archives/<sessionId>/*.json`：归档批次、归档时间和全部历史消息；
- `channels-data/channels.json`：Channel 全字段，包括 provider/model 和凭据；
- `channels-data/triggers/triggers.json`、`executions.json`：包括已无 Trigger 主记录的
  孤儿 Execution；
- `channels-data/triggers/scripts/`：脚本仍保留为文件，但进入迁移 manifest，校验
  path、hash、权限和 Trigger 引用。

存储根目录内出现无法识别的文件、损坏 JSON 或不支持的字段形态时，不允许静默
跳过；该源标记 `blocked`，整个实例不能进入数据库主写模式。

### 7.2 已确认的旧格式兼容

2026-09-01 对实际服务器做过只读结构盘点，迁移器必须至少兼容：

- user、assistant、system 三种 role；
- 消息缺少 `time`、`content` 或 `from_user_id`；
- `content` 为数组或缺失；
- text、reason、tool_call、crystallize_event 块及其不同历史字段组合；
- 单条 assistant 消息包含数千个 content block；
- archive 与当前 session 分开保存；
- Trigger 列表为空但 Execution 仍存在；
- meta 值包含 number、boolean、string 和 array。

缺失 `time` 在 DB 中保持 NULL，不能用迁移时间伪造。每条旧 Message 保存原始
`legacyJson` 和唯一 `legacySource=<相对路径>#<数组索引>`，确保未知字段可回放。

### 7.3 Archive 重建

每个 session 的 seq 空间按以下顺序重建：

1. archive 文件按 `archivedAt`、文件名稳定排序；
2. 每个 archive 内保持 chat 原始数组顺序；
3. 最后追加当前 session 的 chat；
4. 当前 session 消息保持 `archivedAt=NULL`，归档消息关联 `SessionArchive` 并保存
   对应 archivedAt。

不得按内容 hash 全局去重，因为用户可能合法发送完全相同的消息。若旧版本 archive
是累计快照，只有检测到“前一批完整后缀 = 后一批完整前缀”的连续边界重叠时才可
消除重叠，并把规则和数量写入 verificationJson；非连续重叠直接阻断自动迁移。

### 7.4 凭据迁移

旧 `channels.json` 中的 token 是明文。迁移时必须使用 `MIOCHAT_ENC_KEY` 加密为
`tokenEnc`，并执行一次解密回读比对。存在非空 token 但没有有效加密密钥时，预检
失败，不允许降级为丢弃 token 或继续明文入库。旧文件在回滚窗口内保持原样，并按
现有文件权限保护。

### 7.5 幂等与完整性算法

迁移开始先生成不可变 manifest：相对路径、sourceKind、字节数、SHA-256、权限和
解析器版本。每个源文件：

1. upsert `LegacyMigration` 并记录 manifest 信息；
2. 使用 `sourcePath + sourceIndex` 生成确定性记录 id；
3. 在事务内导入该源及关联投影；
4. 从 DB 反向重建该源的规范表示；
5. 比较记录数量、字段类型、角色/块顺序和 canonical JSON hash；文本文件比较原始
   UTF-8 bytes；凭据比较解密结果；
6. 把校验统计写入 `verificationJson`，成功后标记 completed；
7. 失败则回滚该源并记录 error，可使用同一 manifest 重跑。

完成门槛是 `manifest discovered == completed` 且 blocked/failed 均为 0。单一
`legacy_migrated=true` 不构成完成证据。

### 7.6 在线切换与回滚

通过配置控制四种模式：

- `legacy`：JSON 主写；
- `shadow`：JSON 主写，DB 镜像并持续逐源比对；
- `database-shadow`：DB 主写，同时生成可回滚的 JSON 镜像；
- `database`：DB 单独主写。

当前运行时开关是环境变量 `MIO_CHANNEL_PERSISTENCE_MODE`。未迁移的新实例未设置时
使用 `legacy`；检测到存量数据并完成自动迁移后使用 `shadow`。允许值只有上述四项，
非法值会在 Channel 启动时直接报错。Channel 停止时
使用的 HTTP/Socket 管理接口和 Channel 工具也必须经过同一个存储工厂，不能绕过
开关直接实例化 `MemoryStore`。

正常升级不需要单独执行迁移命令。应用重启时，init 会在 Channel、Trigger 和 HTTP
服务启动前盘点旧数据，为当前迁移版本创建一次本地快照，生成或读取实例加密密钥，
完成导入并复验。完成标记写入 `SystemSetting`，后续重启直接跳过。任一步失败都会阻止
本次启动，旧数据不会被改名或删除。快照和实例密钥分别保存在
`prisma/data/backups/channel-storage/` 与 `prisma/data/channel-storage.key`，均位于 Git
忽略的运行时数据目录。

以下命令保留用于只读诊断和人工复验（均在实例后端根目录执行）：

```bash
# 1. 只读盘点；输出 manifestHash，不写 DB 和旧文件
pnpm db:migrate:channel-storage

# 2. 使用盘点输出的精确 hash 执行；有 Channel token 时必须提供 32-byte key
MIOCHAT_ENC_KEY='<64 hex or canonical base64>' \
  pnpm db:migrate:channel-storage --apply --manifest '<manifestHash>'

# 3. 独立复验
MIOCHAT_ENC_KEY='<same key>' pnpm db:migrate:channel-storage --verify
```

`--apply` 没有精确匹配当前盘点 hash 时会拒绝执行。迁移器和四模式运行时均不会
自动删除、改名或清空旧文件。

最终切换需要一个短暂维护窗口：暂停 Channel/Trigger 新写入，重新计算 manifest
hash，导入 shadow 期间的增量，执行全量验证后再切到 `database-shadow`。回滚窗口
内 DB 新消息必须同步回旧格式，不能只把旧 JSON 当静态只读备份。稳定运行并完成
一次反向导出恢复演练后，才能进入 `database`。

任何阶段都不自动重命名或删除旧文件。清理是迁移完成后的独立人工操作。

## 8. Schema 与删除策略

可执行设计见 `session-persistence-schema.prisma`。关键删除规则：

- 删除 Agent：级联其 session/message/memory；这是显式管理操作；
- 删除 Session：级联 archive/message/chunk/tool/crystal/pending memory；
- 删除 Message：级联 chunk 和 tool projection；
- Channel 或 Session 删除：Trigger 的目标外键置空并由服务自动 disable；
- once Trigger 使用 `deletedAt` 软删除；
- TriggerExecution 保存 `triggerKey` 快照，外键可空，因此审计不会随 Trigger 消失。

`Agent.activeSessionId` 暂时作为受服务层校验的软引用。SQLite 外键无法直接表达
“active session 必须属于同一 agent”，强行建立普通关系反而会允许跨 agent 引用。

## 9. 验收标准

- 提议 schema 可通过 `prisma validate`；
- 同 session 并发追加 100 条消息，seq 连续且无重复；
- LLM 首个 chunk 前 user 与 assistant placeholder 已可查询；
- kill -9 后重启，部分回复被标为 `aborted_by_restart` 且可继续对话；
- tool_call 参数、结果和顺序往返无损；
- crystallize 后活跃 prompt 与迁移前一致，归档历史仍可回溯；
- 同一旧文件连续导入两次不产生重复数据；
- manifest 中每个 agent/channel/session/archive/global/meta/trigger/execution/script 源均有
  completed 记录，blocked/failed 为 0；
- 旧消息的 role、缺失字段、content block 顺序和原始 JSON 可逐条反向重建；
- soul/global 文本 byte-for-byte 一致，Channel token 解密回读一致；
- archive 批次边界、archivedAt 和历史顺序可重建；
- shadow 模式逐源比较记录数、字段类型和 canonical hash；
- database-shadow 模式新增数据可反向导出，并完成一次切回 legacy 演练；
- 旧文件未被迁移器修改或删除。

## 10. 暂不包含

- 全文检索与统计看板；
- webhook；
- Prefix Cache 与 `mio_meta` 工具路由。

这些项目不应阻塞 Session Persistence 的独立上线和回滚。
