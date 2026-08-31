# MioChat Channel Architecture v1.0

> 作者：高坂桐乃 ｜ 状态：**v1.0 定稿（三项改动合并，待实施）**
> 日期：2026-08-31
> 范围：Channel 层的存储迁移、Trigger 系统引用、Prefix Cache 稳定化
> 前置：Trigger 系统 P1 已实现（`lib/triggers/`，含 WakeProtocol / TriggerRegistry / trigger_manage 工具 / slash 命令）；openai-image img2img 补丁已就位（待生效）

---

## 0. 三大改动总览

| # | 改动 | 核心收益 | 状态 |
|---|------|----------|------|
| A | **存储迁移**：会话消息从 JSON 文件 → Prisma/SQLite 块级存储 | 消除 O(n²) 写放大、双渠道并发丢更新、重启丢回复 | 设计完成 |
| B | **Trigger 系统**：事件驱动 LLM 唤醒（cron/script/webhook） | Agent 具备事件响应能力，不再仅靠定时轮询 | **已实现** |
| C | **Prefix Cache 稳定化**：工具列表冻结 + mio_meta 万能调度器 | LLM 推理成本 -50%+，tool selection 精度问题根治 | 设计完成 |

**一次重启，三项全部生效。**

---

## A. 存储迁移（JSON → Prisma/SQLite）

### A.1 现状痛点

| # | 痛点 | 严重度 |
|---|------|--------|
| 1 | 每条消息触发整个 session JSON 全量重写，O(n²) 写放大 | 🔴 |
| 2 | stringify/parse 同步操作阻塞事件循环 | 🔴 |
| 3 | web + wechat 双渠道实例并发读写同一 session JSON → 丢更新 | 🔴 |
| 4 | 回复未完成时重启 → assistantMsg 整条丢失 | 🟠 |
| 5 | crystal 单槽覆盖，历史结晶不可回溯 | 🟡 |
| 6 | global/*.md 的 update/delete 靠子串匹配 | 🟡 |

### A.2 Schema（8 张表）

```prisma
// ============ Agent 与配置 ============
model Agent {
  id               String    @id
  soul             String?
  activeSessionId  String?
  provider         String?
  model            String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  sessions         Session[]
  memories         GlobalMemory[]
  metas            AgentMeta[]
  channels         Channel[]
}

model AgentMeta {
  agentId  String
  key      String                                 // last_user_activity / tools / provider / model / keepalive_* ...
  value    String                                 // JSON 序列化
  @@id([agentId, key])
}

model Channel {
  id         String   @id
  agentId    String
  agent      Agent    @relation(fields:[agentId], references:[id])
  type       String                                  // wechat | web
  name       String?
  tokenEnc   String                                  // AES-GCM 加密（密钥走环境变量 MIOCHAT_ENC_KEY）
  botId      String?
  userId     String?
  avatar     String?
  status     String   @default("unbound")
  lastActive DateTime?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

// ============ 会话 ============
model Session {
  id         String    @id                         // s_xxx
  agentId    String
  agent      Agent     @relation(fields:[agentId], references:[id])
  title      String?
  nextSeq    Int       @default(0)                 // 服务端单调发号
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  messages   Message[]
  crystals   Crystal[]
  @@index([agentId, updatedAt])
}

// ============ 消息（核心：块级存储） ============
model Message {
  id            String    @id                       // ULID（时间有序）
  sessionId     String
  session       Session   @relation(fields:[sessionId], references:[id])
  seq           Int                                  // 会话内单调递增
  role          String                               // user | assistant
  status        String    @default("final")          // streaming | final | aborted_by_restart
  kind          String    @default("message")        // message | text_block | tool_call | round_end
  text          String?                              // 纯文本冗余列（prompt 注入 / FTS）
  content       String                               // 完整块 JSON（无损）
  fromUserId    String?
  businessTime  DateTime                             // 业务时间
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt                 // streaming 阶段逐块 UPDATE
  toolCalls     ToolCall[]
  chunks        MessageChunk[]
  @@unique([sessionId, seq])
  @@index([sessionId, status])
  @@index([sessionId, businessTime])
}

model ToolCall {
  id         String   @id
  messageId  String
  message    Message  @relation(fields:[messageId], references:[id])
  seq        Int                                    // 块内顺序
  toolName   String
  argsJson   String
  status     String   @default("ok")                // ok | error | aborted | running
  durationMs Int?
  createdAt  DateTime @default(now())
  @@index([messageId])
  @@index([toolName, createdAt])
}

model MessageChunk {                                   // 替代内存 streamCache（断线回放）
  id         String   @id                            // `${messageId}:${chunkSeq}`
  messageId  String
  seq        Int
  payload    String                                 // 原始 chunk JSON
  createdAt  DateTime @default(now())
  @@index([messageId, seq])
  // 回放完成后按 messageId TTL 清理
}

// ============ 结晶版本链 ============
model Crystal {
  id         String   @id
  sessionId  String
  session    Session  @relation(fields:[sessionId], references:[id])
  content    String                                 // <memory_crystal> XML
  source     String   @default("auto")
  createdAt  DateTime @default(now())
  @@index([sessionId, createdAt])
}

// ============ 长期记忆（行级化） ============
model GlobalMemory {
  id        String   @id
  agentId   String
  agent     Agent    @relation(fields:[agentId], references:[id])
  category  String                                  // user_profile | tech_stack | trading_discipline ...
  content   String                                  // 单条事实
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([agentId, category, updatedAt])
}
```

### A.3 落盘节点（7 个，全部 O(1)）

| # | 时机 | SQL | 代码锚点 |
|---|------|-----|----------|
| 1 | 用户消息到达 | INSERT Message(role=user) | BaseChannel.js:623 |
| 2 | text 块 flush | UPDATE Message(status=streaming) | llm.js flushTextBlock |
| 3 | toolcall 完成 | UPDATE Message(content 追加) | llm.js toolCall 事件 |
| 4 | 回复完成 | UPDATE Message(status=final) | BaseChannel.js:651 |
| 5 | round_end / abort / restart | INSERT kind=round_end/aborted | 新增 |
| 6 | 结晶完成 | INSERT Crystal（版本链） | llm.js:675 |
| 7 | 长期记忆变更 | CRUD GlobalMemory | memory 工具 |

### A.4 流式草稿（解决重启丢回复）

- 回复开始 → INSERT Message(status=streaming) 占位
- 每块 UPDATE → O(1) 行级更新
- 完成 → UPDATE status=final
- **崩溃/重启** → 该行停留在 streaming，读侧将其作为部分回复纳入上下文 + 附加「因中断不完整」注释
- 取消/abort → status=aborted，正常处理

### A.5 并发安全

| 场景 | 保障 |
|------|------|
| web + wechat 双实例同 session | SQLite WAL 模式 |
| 同 session 并发写 | seq 原子发号（RETURNING） |
| 流式草稿 UPDATE | 幂等，最后写者胜 |

### A.6 迁移

启动时扫描旧 JSON → 幂等导入 → 原文件重命名 .bak

---

## B. Trigger 系统（已实现，引用）

> 本节引用 `lib/triggers/` 的已有实现，不重复设计。详细设计见 `docs/architecture/trigger-system.md`。

- **唤醒协议**：向绑定 session 追加 user 消息（首行 `system：trigger 系统监测到事件...`），身份随 session，LLM 无关
- **脚本契约**：stdout `@WAKE@ {json}` 标志行，语言不限
- **生命周期**：once（唤醒即删）/ persistent（长期运行）
- **管理工具**：`trigger_manage`（create/list/remove/enable/disable/run_once）+ `/triggers` slash 命令
- **存储**：TriggerExecution 审计写入本架构的 DB（与 Message 共存）

---

## C. Prefix Cache 稳定化

### C.1 问题

LLM API 的 Prefix Caching 在 prompt 前缀相同时命中 KV Cache。但当前每次 LLM 调用注入 **40 个工具定义 ≈ 3-5k token**，且工具列表随注册/启停/哈希变化而变动 → 前缀不稳定 → 缓存反复失效 → 推理成本翻倍 + tool selection 精度下降。

### C.2 方案：mio_meta 万能调度器

**工具列表冻结为最小不变集**，其余能力通过单一调度器动态路由：

```
channel LLM 注入的工具列表（永不变化）：
  ├── mio_meta               ← 万能调度器（{tool, params} → 路由到任意已注册工具）
  ├── bash                   ← 终端
  ├── read / write           ← 文件读写
  ├── memory                 ← 记忆 CRUD
  ├── search                 ← 搜索
  ├── Skill                  ← 技能按需加载
  └── cron                   ← 定时任务

总计：7 个工具 ≈ 500 token（对比现在 40 个 ≈ 3-5k token）
```

**mio_meta 内部逻辑**（复用 `call_tool.py` 已验证的路由）：
1. 接收 `{tool: string, params: object}`
2. 动态查询工具注册表找到所属插件
3. POST debug 端点执行
4. 返回结果

### C.3 效果

| 指标 | 改前 | 改后 |
|------|------|------|
| 注入工具定义 | 40 个 ≈ 3-5k token | 7 个 ≈ 500 token |
| 前缀稳定性 | 每次注册/启停变化即失效 | **永不变化** |
| KV Cache 命中率 | 低（前缀频繁变化） | **~100%** |
| tool selection 精度 | 40 工具中选 → flash 模型精度不够 | 7 工具中选 → **精度提升** |
| 新工具上线 | 需更新 schema | **注册即用，无需更新** |

### C.4 配套措施

- **能力发现**：LLM 通过 `Skill` 工具按需加载技能描述（`call list` → 发现有什么能力 → `call load` → 加载详细指南）——不污染前缀
- **channel global 记忆**：单渠道场景无意义，**跳过注入**（等多渠道时再启用）
- **toolsmanager 标记 webOnly**：管理面板专用，channel LLM 注入时剔除
- **记忆结晶**：有本地缓存，压缩节点才更新 → 不影响前缀稳定性
- **mio_meta 的 tool 描述**：写成通用调度器描述，列出常用工具名 + 用途速查（LLM 通过上下文理解能力，不需要每个工具的完整 schema）

### C.5 风险与缓解

| 风险 | 缓解 |
|------|------|
| LLM 不知道 mio_meta 能调什么 | prompt 里附常用工具速查表（固定 token，不随工具数变化） |
| mio_meta 调用失败 | 错误信息返回给 LLM，可以重试或换工具 |
| 参数序列化错误 | mio_meta 内部做 schema 校验 + 容错 |

---

## D. 实施计划

### Phase 1：DB Schema + 存储迁移（工作量 ~2 天）
1. Prisma migration（8 表 + Trigger/TriggerExecution 引用）
2. SessionPersistence 服务（读写入口）
3. BaseChannel/llm.js 接入（替换 JSON 读写）
4. 旧数据导入脚本（幂等）
5. SQLite WAL 配置

### Phase 2：mio_meta + 工具列表冻结（工作量 ~1 天）
1. mio_meta 工具注册（ai-plugin）
2. toolsmanager 标记 webOnly
3. BaseChannel 工具注入列表缩减
4. Prefix cache 验证（对比改前改后 token 数）

### Phase 3：Trigger 系统增强（工作量 ~1 天）
1. TriggerExecution 表与存储层对接
2. idleOnly 标志（防止任务中途触发维护类事件）
3. 哨兵脚本目录迁移到 channels-data/triggers/scripts/
4. 桐乃自建哨兵（78,400 盯盘）

### 合并重启窗口
Phase 1 + 2 + 3 + openai-image img2img 补丁 → **一次重启全部生效**

---

## E. 决策记录

| # | 决策 | 日期 |
|---|------|------|
| D1 | 唤醒身份随 session | 8/31 |
| D2 | 脚本语言不限，stdout 契约 | 8/31 |
| D3 | Trigger 表进 app.db | 8/31 |
| D4 | webhook P2 | 8/31 |
| D5 | 会话消息 Prisma/SQLite 块级 | 8/31 |
| D6 | 工具列表冻结 + mio_meta 调度器 | 8/31 |
| D7 | toolsmanager webOnly | 8/31 |
| D8 | channel global 记忆跳过注入 | 8/31 |
