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

### 7.1 迁移对象

第一批迁移：

- session 基本信息和 `chat[]`
- 当前 `crystal`
- `pending_memories`
- active session
- agent meta

原 `archives/` 作为冷备保留，不在首批重新展开导入；新产生的归档通过
`Message.archivedAt` 表示。`soul.md` 和 `global/*.md` 保持原读写，待 session 迁移
稳定后单独切换，避免一次改变所有记忆语义。

### 7.2 幂等算法

每个源文件：

1. 读取并计算内容 hash；
2. upsert `LegacyMigration(sourcePath, sourceHash, status=running)`；
3. 在单事务中 upsert Agent/Session，并按稳定规则导入 Message、Crystal、
   PendingMemory；
4. 校验消息数、角色顺序、首尾业务时间及内容 hash；
5. 标记该源为 completed，保存导入数量；
6. 失败则回滚该文件事务并记录 error，下次可重试。

旧消息没有 id 时，使用 `sourcePath + chatIndex + contentHash` 生成确定性 id，禁止用
本次执行时间生成 id。

### 7.3 灰度阶段

通过配置控制存储模式：

- `legacy`：只读写 JSON；
- `shadow`：JSON 为主，DB 异步镜像并持续比对；
- `database`：DB 为主，JSON 只读回退；

至少完成一轮真实会话的 shadow 比对后才能切到 database。首版切换不重命名、
不删除旧 JSON；确认经过回滚窗口后再提供独立归档命令。

## 8. Schema 与删除策略

可执行设计见 `session-persistence-schema.prisma`。关键删除规则：

- 删除 Agent：级联其 session/message/memory；这是显式管理操作；
- 删除 Session：级联 message/chunk/tool/crystal/pending memory；
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
- shadow 模式逐 session 对比消息数、角色、文本和 content hash；
- database 模式失败时可切回 legacy，旧文件未被修改。

## 10. 暂不包含

- 全文检索与统计看板；
- webhook；
- soul/global memory 的数据库切换；
- 对冷备 `archives/*.json` 的历史重建；
- Prefix Cache 与 `mio_meta` 工具路由。

这些项目不应阻塞 Session Persistence 的独立上线和回滚。
