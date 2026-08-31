# MioChat 系统层 Trigger 架构 · 设计文档 v0.3（定稿）

> 作者：高坂桐乃 ｜ 状态：**v0.3 定稿**（存储层决策落锤：全部进 Prisma/SQLite）
> v0.3 变更：①会话消息持久化从 JSON 文件整体改为 **Prisma/SQLite 块级存储**（废 JSONL 方案）；②补全 8 张表 schema；③落地节点不变（text 块边界 / toolcall 完成 / round_end / exit hook），存储介质换成 DB INSERT/UPDATE；④迁移：旧 session JSON → DB 导入脚本
> v0.2 已拍板：①唤醒身份随 session（追加 user 消息，复用定时任务唤起机制）；②脚本语言不限，stdout `@WAKE@` JSON 标志行契约；③once/persistent 双生命周期；④webhook P2 极简实现

---

## 0. 设计目标

1. 「事件 → LLM 唤醒」提升为 MioChat 系统原语（cron / script / webhook 三源统一）
2. 唤醒 = 向绑定 session 追加一条 user 消息（与定时任务同机制），无状态、LLM 无关
3. **会话消息持久化迁移至 Prisma/SQLite**（块级存储，替代整文件 JSON 重写）
4. 安全：脚本进程隔离、payload 校验、冷却/限频/熔断、WAL 并发安全

## 1. 分层归属

```
lib/triggers/                      ← 抽象层
  ├── TriggerRegistry.js           ← triggers 表 CRUD + 热加载
  ├── TriggerRunner.js             ← script 哨兵子进程守护
  ├── WakeInjector.js              ← 唤醒注入（复用定时任务机制）
  └── WakeProtocol.js              ← stdout @WAKE@ 标志行解析
channels/triggers/                 ← 渠道绑定层
  ├── index.js                     ← 挂载 ChannelRuntime
  └── webhook/routes.js            ← P2
lib/chat/persistence/              ← 【新增】会话持久化服务（JSON → DB）
  └── SessionPersistence.js        ← 读写入口，适配 BaseChannel/llm.js
```

**web 端零额外实现**：唤醒消息走 `_processChat` 管线后，llm.js 的 streamCache + socket 镜像自动送达 web。

## 2. 数据库 Schema（Prisma，8 张表）

```prisma
// ============ Agent 与会话 ============
model Agent {
  id               String    @id                  // 'wechat-master'
  soul             String?
  activeSessionId  String?                          // 单指针
  provider         String?
  model            String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  sessions         Session[]
  memories         GlobalMemory[]
  metas            AgentMeta[]
  triggers         Trigger[]
}

model AgentMeta {                                    // 替代 meta.json 杂物抽屉
  agentId  String
  key      String
  value    String                                    // JSON 序列化
  @@id([agentId, key])
}

model Session {
  id         String    @id                           // s_xxx
  agentId    String
  agent      Agent     @relation(fields:[agentId], references:[id])
  title      String?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  messages   Message[]
  crystals   Crystal[]
  nextSeq    Int       @default(0)                   // 会话内单调发号
  @@index([agentId, updatedAt])
}

// ============ 消息（核心，块级存储） ============
model Message {
  id            String    @id                        // ULID（时间有序）
  sessionId     String
  session       Session   @relation(fields:[sessionId], references:[id])
  seq           Int                                  // 会话内单调递增
  role          String                               // user | assistant
  status        String    @default("final")          // streaming | final | aborted
  kind          String    @default("message")        // message | text_block | tool_call | round_end
  text          String?                              // 纯文本冗余列（prompt 注入/FTS）
  content       String                               // 完整块 JSON（无损）
  fromUserId    String?
  businessTime  DateTime                             // 业务时间戳
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  toolCalls     ToolCall[]
  chunks        MessageChunk[]
  @@unique([sessionId, seq])
  @@index([sessionId, status])
  @@index([sessionId, businessTime])
}

model ToolCall {                                     // tool_call 块拍平（审计/统计）
  id         String   @id
  messageId  String
  message    Message  @relation(fields:[messageId], references:[id])
  seq        Int
  toolName   String
  argsJson   String
  status     String   @default("ok")                 // ok|error|aborted|running
  durationMs Int?
  createdAt  DateTime @default(now())
  @@index([messageId])
  @@index([toolName, createdAt])
}

model MessageChunk {                                 // 替代内存 streamCache（断线回放）
  id         String   @id                           // `${messageId}:${chunkSeq}`
  messageId  String
  seq        Int
  payload    String                                 // 原始 chunk JSON
  createdAt  DateTime @default(now())
  @@index([messageId, seq])
}
// 回放完成后按 messageId TTL 清理

// ============ 结晶版本链（替代单槽覆盖） ============
model Crystal {
  id         String   @id
  sessionId  String
  session    Session  @relation(fields:[sessionId], references:[id])
  content    String                                 // <memory_crystal> XML
  source     String   @default("auto")              // auto | manual
  createdAt  DateTime @default(now())
  @@index([sessionId, createdAt])
}

// ============ 长期记忆（global md 行级化） ============
model GlobalMemory {
  id        String   @id
  agentId   String
  agent     Agent    @relation(fields:[agentId], references:[id])
  category  String                                  // user_profile | tech_stack | trading_discipline ...
  content   String                                  // 单条事实（原 md 一行）
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([agentId, category, updatedAt])
}

// ============ 渠道 ============
model Channel {
  id         String   @id                           // c_xxx
  agentId    String
  agent      Agent    @relation(fields:[agentId], references:[id])
  type       String                                  // wechat | web
  name       String?
  tokenEnc   String                                  // AES-GCM 加密
  botId      String?
  userId     String?
  avatar     String?
  status     String   @default("unbound")
  lastActive DateTime?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

// ============ Trigger 系统（本架构核心） ============
model Trigger {
  id               String   @id
  agentId          String
  agent            Agent    @relation(fields:[agentId], references:[id])
  channelId        String                                 // 唤醒注入的目标渠道
  sessionId        String                                 // 唤醒注入的目标会话
  type             String                                 // cron | script | webhook
  mode             String   @default("persistent")        // once | persistent
  cronExpr         String?                                // cron 类
  scriptPath       String?                                // script 类
  webhookSecretHash String?                               // webhook 类
  promptTemplate   String                                 // 唤醒 prompt 模板（{{payload.xxx}}）
  params           String?                                // 脚本 ctx（JSON）
  cooldownSec      Int      @default(1800)
  maxFiresPerDay   Int      @default(5)
  enabled          Boolean  @default(true)
  lastFiredAt      DateTime?
  fireCount        Int      @default(0)
  wakeCount        Int      @default(0)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  executions       TriggerExecution[]
  @@index([agentId, enabled])
  @@index([type, enabled])
}

model TriggerExecution {                               // 审计（once 删除后仍保留）
  id          String   @id
  triggerId   String
  trigger     Trigger  @relation(fields:[triggerId], references:[id])
  wake        Boolean
  reason      String?
  dataJson    String?
  sessionId   String?                                 // 唤醒注入的会话
  durationMs  Int?
  status      String   @default("ok")                // ok | error | suppressed_cooldown | suppressed_budget
  createdAt   DateTime @default(now())
  @@index([triggerId, createdAt])
}
```

## 3. 持久化节点（落盘时机，存储介质 = DB）

| 节点 | 动作 | 对应 SQL | 锚点 |
|------|------|----------|------|
| 用户消息到达 | INSERT Message(role=user) | O(1) | BaseChannel.js:623 原位 |
| **text 块 flush** | UPDATE Message(status=streaming, text, content) | O(1) 行更新 | llm.js flushTextBlock |
| **toolcall 完成** | UPDATE Message(content 追加块) 或 INSERT ToolCall 行 | O(1) | llm.js toolCall 事件 |
| 回复完成 | UPDATE Message(status=final) | O(1) | BaseChannel.js:651 原位 |
| **round_end / abort / restart** | INSERT kind=round_end/aborted 行 | O(1) | 新增 |
| 结晶完成 | INSERT Crystal（版本链） | O(1) | llm.js:675 原位 |
| trigger 唤醒 | INSERT TriggerExecution | O(1) | 新增 |

**不再存在**：整文件 JSON.stringify + 全量重写、O(n²) 写放大、同步 parse 卡事件循环。

## 4. 唤醒协议（不变，v0.2 定稿）

```
wake(trigger, payload):
  1. 冷却 + 日限额检查
  2. payload 白名单校验（reason/data/source/firedAt，截断）
  3. prompt = promptTemplate 插值（缺字段原样发送）
  4. 追加 user 消息至 sessionId（首行 system 前缀 + payload JSON）
     → INSERT Message(role=user, kind=message, status=final)
     → 走 _processChat 管线 → LLM 醒来 → 输出双端推送 + 落盘
  5. INSERT TriggerExecution 审计
  6. mode=once → DELETE Trigger 行；persistent → UPDATE lastFiredAt
```

**身份随 session**：无特殊身份设计，LLM 无关，无状态。

## 5. 三种触发源

### cron：复用 TaskScheduler，零迁移
### script：子进程 spawn，stdout `@WAKE@ {json}` 标志行契约（语言不限）
### webhook：POST /channels/:cid/triggers/:id/hook，token + payload 白名单，P2

## 6. 安全（v0.2 继承 + DB 加固）

| 层 | 措施 |
|----|------|
| 脚本 | 子进程隔离 + 10s 超时 + stdout 截断 |
| webhook | token 哈希 + 来源校验 + 频控 + **动作白名单（仅唤醒，禁执行/重启）** |
| 频率 | 冷却 + 日预算 + 全局熔断 |
| LLM | payload 白名单 + 截断 + system 分隔标记 |
| 审计 | trigger_executions 全量 |
| DB | SQLite WAL 模式 + busy_timeout=5000 + foreign_keys=ON |

## 7. 迁移

启动时扫描 `memory/agents/*/sessions/*.json`：
- 每条 assistantMsg/userMsg → INSERT Message（seq 按 chat 数组序号）
- 旧 crystal → INSERT Crystal（保留为历史版本）
- 旧 global/*.md 按行 → INSERT GlobalMemory
- 完成后写 AgentMeta('legacy_migrated', true) 幂等防重跑

## 8. 分期实施

| 期 | 范围 |
|----|------|
| **P1** | DB migration（8 表）+ SessionPersistence 服务 + BaseChannel/llm.js 接入 + Trigger 系统（script+cron+注入+工具）+ 旧数据导入 |
| **P2** | webhook 路由 + token 管理 |
| **P3** | web 管理面板 + FTS 全文检索 + 统计看板 |
| 合并重启 | 本架构实施 + openai-image img2img 补丁（已就位）+ flex-tasks 清场（已完成）→ **一次重启全部生效** |

## 9. 决策记录

| # | 决策 | 结论 | 日期 |
|---|------|------|------|
| D1 | 唤醒身份 | 随 session（追加 user 消息，复用定时任务机制） | 8/31 |
| D2 | 脚本语言 | 不限，stdout `@WAKE@ {json}` 契约 | 8/31 |
| D3 | 存储 | triggers 表进 app.db（Prisma） | 8/31 |
| D4 | webhook | P2 实现，v1 仅 loopback script/cron | 8/31 |
| D5 | 会话消息存储 | **Prisma/SQLite 块级存储**（废 JSONL 与整文件 JSON） | 8/31 |
