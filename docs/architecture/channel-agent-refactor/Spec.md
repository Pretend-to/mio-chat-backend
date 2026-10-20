# MioChat Agent、Session 与 Channel 重构规格

> 状态：Draft / implementation-ready  
> 版本：1.0  
> 日期：2026-09-15  
> 适用仓库：`mio-chat-backend`、`mio-chat-frontend`  
> 配套文档：[Development.md](./Development.md)、[TestPlan.md](./TestPlan.md)

## 1. 文档目的

本文定义 MioChat 中 Agent、Session、Channel、定时任务、Trigger 和 SubAgent 的统一
领域模型，并作为后续数据库、运行时、HTTP API 和设置页重构的权威规格。

本文取代以下旧假设：

- Channel 拥有且只拥有一个 Agent；
- Agent 通过 Channel 才能执行；
- `channelId`、`contactorId`、`preset` 可以代替 `agentId` 或 `sessionId`；
- 定时任务可以在运行时从任意在线 Channel 猜测目标 Agent；
- Agent 的当前 Session 是所有 I/O 入口共享的单一全局状态。

旧文档中与本文冲突的内容，以本文为准。消息持久化、ChatEvent 和 Trigger 的非冲突
部分继续有效。

## 2. 已确认的产品语义

### 2.1 核心定义

1. **Agent 是可配置、可执行、可持久化的主体。**
   Agent 拥有名称、头像、人格、模型、工具、技能、长期记忆和 Session 列表。
2. **Session 是 Agent 的会话上下文。**
   一个 Agent 可以有多个 Session；Message、Chunk、ToolCall、Crystal 和 PendingMemory
   均通过 Session 归属 Agent。
3. **Session 可以派生子 Session。**
   子 Session 用于 SubAgent 或其他隔离执行上下文，并通过 `parentSessionId` 形成有向树。
4. **Channel 只是 I/O 入口。**
   Channel 保存平台、账号凭据、连接状态和协议能力，不拥有 Agent、模型、人格或聊天记录。
5. **Agent 与 Channel 是多对多关系。**
   一个 Channel 可以绑定多个 Agent；一个 Agent 可以绑定 Web、微信等多个 Channel。
6. **ChannelAgent 是产品操作，不是领域实体。**
   设置页“新建 ChannelAgent”实际执行 `Agent + initial Session + Channel Binding` 的原子创建。

### 2.2 身份字段边界

| 字段 | 含义 | 用户是否配置 |
|---|---|---|
| `agentId` | Agent 稳定主键 | 否，系统生成 |
| `sessionId` | Session 稳定主键 | 否，系统生成 |
| `channelId` | Channel/账号实例主键 | 否，系统生成 |
| `bindingId` | Agent 与 Channel 绑定主键 | 否，系统生成 |
| `masterId` / `userId` / `botId` | Channel 适配器认证和路由元数据 | 否，由认证协议发现 |
| `externalConversationId` | 外部平台会话或联系人标识 | 否，由适配器上报 |
| `contactorId` | Web 展示层窗口键 | 必须等于 `agentId`，不单独持久化为领域身份 |
| `preset` | 已删除的旧任务身份 | 新 Schema 与 API 均不接受 |

`masterId`、`userId` 和 `botId` 可以在管理员诊断界面脱敏只读展示，但不得出现在
Agent 创建或编辑表单中。

## 3. 领域关系

```text
Agent 1 ──────── * Session
  │                  │
  │                  └── 0..1 parent Session / * child Sessions
  │
  * ───────────── * Channel
        AgentChannelBinding

Agent 1 ──────── * ScheduledTask
Agent 1 ──────── * Trigger
Session 1 ────── * ScheduledTask
Session 1 ────── * Trigger

ChannelRoute ──> Binding + Session
```

必须满足的恒等式：

- `Session.agentId` 必须与父 Session 的 `agentId` 相同；
- Binding 的 Session 指针必须属于 Binding 的 Agent；
- Task/Trigger 的 `sessionId` 必须属于其 `agentId`；
- Delivery Binding 必须绑定同一个 Agent；
- 任何入口都不得依靠“当前只有一个 Channel”进行身份兜底。

## 4. 目标数据模型

字段名可在实现时按 Prisma 规范微调，但关系、删除策略和唯一性不可改变。

### 4.1 Agent

```prisma
model Agent {
  id               String   @id
  name             String
  avatar           String?
  description      String?
  soul             String?
  provider         String?
  model            String?
  status           String   @default("active")
  defaultSessionId String?  @map("default_session_id")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  sessions         Session[]
  channelBindings  AgentChannelBinding[]
  tasks            Task[]
  triggers         Trigger[]
}
```

- Agent 是模型、人格、工具策略和长期记忆的唯一拥有者。
- `defaultSessionId` 仅表示新入口的默认选择，不表示所有入口共享的“当前会话”。
- Agent 删除是明确的破坏性操作，见第 9 节。

### 4.2 Channel

```prisma
model Channel {
  id          String   @id
  type        String
  name        String
  status      String
  tokenEnc    String?
  botId       String?
  userId      String?
  avatar      String?
  capabilities String?
  configJson  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  bindings    AgentChannelBinding[]
}
```

- Channel 不再包含 `agentId`、`provider` 或 `model`。
- 一个外部账号/连接实例对应一个 Channel，而不是一个平台类型对应一个 Channel。
- Web 使用系统管理的 Channel 实例，遵循相同 Binding 语义；系统 Web Channel 不允许
  普通用户删除。

### 4.3 AgentChannelBinding

```prisma
model AgentChannelBinding {
  id                String   @id
  agentId           String
  channelId         String
  enabled           Boolean  @default(true)
  defaultSessionId  String?
  inboundPolicy     String   @default("routed")
  outboundEnabled   Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  agent             Agent    @relation(fields: [agentId], references: [id], onDelete: Cascade)
  channel           Channel  @relation(fields: [channelId], references: [id], onDelete: Cascade)
  routes            ChannelRoute[]

  @@unique([agentId, channelId])
  @@index([channelId, enabled])
}
```

- Binding 只保存 I/O 绑定策略，不保存模型、人格或消息。
- 删除 Binding 只解除连接，不删除 Agent、Session 或 Message。
- `defaultSessionId` 必须属于 Binding 的 Agent；由服务层事务校验。
- 如果未来允许同一 Agent 以多个角色绑定同一 Channel，应新增明确的 `roleKey` 并扩展
  唯一键，不能静默移除当前唯一约束。

### 4.4 ChannelRoute

```prisma
model ChannelRoute {
  id                     String   @id
  channelId              String
  externalConversationId String
  bindingId              String
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  binding AgentChannelBinding @relation(fields: [bindingId], references: [id], onDelete: Cascade)

  @@unique([channelId, externalConversationId])
  @@index([bindingId])
}
```

Channel 同时绑定多个 Agent 时，入站消息必须通过确定性路由解析：

1. 协议携带显式 Agent 选择时，校验对应 Binding；
2. 否则查找 `ChannelRoute(channelId, externalConversationId)`；
3. 首次会话仅在 Channel 存在唯一 enabled 入站 Binding 时自动建立 Route；
4. 多个候选 Binding 且无 Route 时，返回 Agent 选择提示或结构化 `route_required`；
5. 永远不选择第一个 Agent、最后活跃 Agent或唯一在线 Channel 作为隐式兜底。

Channel 侧提供传输层路由命令，这些命令必须在普通 Agent 路由前处理，保证多个候选
Binding 且尚无 Route 时仍可使用：

- `/agents`：列出当前 Channel 的 enabled Agent，并在各 Agent 下列出已关联到当前外部
  聊天空间的 child Session，后者明确标记为 `[SubAgent]`；
- `/agent`：显示当前 Route；活动 Session 为 SubAgent 时显示 `[SubAgent]`；
- `/agent use <名称或 ID>`：选择 Agent，或同时切换 Route 与 activeSession 到指定
  SubAgent。名称和 ID 前缀不唯一时必须拒绝，不能猜测；
- `/sessions` 同样必须对 `kind=subagent` 的 Session 显示 `[SubAgent]`。

私聊 Route 只影响当前外部用户；群聊 Route 以群 ID 为作用域，因此切换对整个群生效。
切换 Agent 后恢复该 Agent 在当前外部聊天空间的 activeSession；首次切入时创建独立根
Session。切回旧 Agent 时恢复旧上下文，不合并不同 Agent 的消息。

`ChannelRoute` 只回答“这个外部聊天空间当前路由给哪个 Agent”，不再保存活动 Session。
切换目标 Agent 是显式路由操作，不修改 Agent 全局状态，也不删除该外部聊天空间此前在
其他 Agent 下形成的 Session。

### 4.4A ChannelConversation 与外部身份

每个适配器必须把入站消息规范化为明确的外部聊天身份。所有消息必须提供
`externalUserId`；同时必须提供 `externalConversationId`：私聊时二者相同，群聊时前者为
发言成员、后者为群 ID。支持话题的平台可再提供 `externalThreadId`。

```prisma
model ChannelConversation {
  id                     String   @id
  channelId              String
  agentId                String
  conversationType       String   // private | group
  externalConversationId String
  activeSessionId        String?
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
  lastActiveAt           DateTime?

  @@unique([channelId, agentId, externalConversationId])
  @@index([agentId, activeSessionId])
}

model ChannelConversationMember {
  channelConversationId String
  externalUserId        String
  displayName           String?
  role                   String?
  lastActiveAt           DateTime?

  @@id([channelConversationId, externalUserId])
}

model ChannelSessionLink {
  channelConversationId String
  sessionId             String
  createdAt             DateTime @default(now())

  @@id([channelConversationId, sessionId])
}
```

Session 分配必须遵循以下规则：

1. Agent 创建时只创建一个供 Web/客户端首次进入的默认 Session；
2. 新的 Channel 私聊用户第一次进入某 Agent 时，必须创建新的根 Session，不得复用 Agent
   默认 Session；
3. 新群第一次进入某 Agent 时按群 ID 创建一个共享根 Session，群成员 ID 用于审计和权限，
   不按成员拆分群上下文；
4. 同一外部聊天空间可关联多个根 Session 和 SubSession，并用 `activeSessionId` 表示当前会话；
5. `/sessions`、`/new`、`/use`、`/current` 只作用于当前
   `ChannelConversation + Agent`，不得访问其他用户、群或 Agent 的 Session；
6. SubSession 创建时继承父 Session 的全部 `ChannelSessionLink`，因此仍受同一外部身份边界
   约束；
7. 同一外部 ID 在不同 Channel 中默认互不相认；同一 Channel 外部聊天空间切换到不同 Agent
   时，各 Agent 的 Session 也互相隔离。

Binding 被解绑时，`ChannelConversation`、Session 和 Message 保留但不可继续执行；重新绑定
同一 Agent 后可恢复。删除 Channel 时只删除外部会话映射，Session/Message 保留。删除 Agent
时级联删除它的 ChannelConversation、Session 和 Message。

### 4.5 Session 自关联

```prisma
model Session {
  id              String    @id
  agentId         String
  parentSessionId String?
  kind            String    @default("conversation")
  title           String?
  visible         Boolean   @default(true)
  nextSeq         Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  agent           Agent     @relation(fields: [agentId], references: [id], onDelete: Cascade)
  parent          Session?  @relation("SessionTree", fields: [parentSessionId], references: [id], onDelete: Cascade)
  children        Session[] @relation("SessionTree")
  messages        Message[]

  @@index([agentId, updatedAt])
  @@index([parentSessionId])
}
```

- `kind` 第一版允许 `conversation`、`subagent`、`task`。
- 服务层禁止跨 Agent 父子关系、循环引用和超过配置上限的深度。
- 删除父 Session 默认递归删除子 Session。
- Agent 的普通会话列表默认只返回 `visible=true` 的根 Session；SubAgent 可在详情页展开。
- Cron/Trigger 发起的 SubAgent 编排继续使用其精确绑定的普通父 Session，不创建独立
  Task Session；父 Session 保存触发、编排、验收和最终结论，child Session 保存原始调研
  上下文。

### 4.6 Scheduled Task

现有 `Task.preset`、`Task.contactorId` 不再承担执行身份。目标字段为：

```text
Task
├── agentId             required, immutable ownership
├── sessionId           required, immutable execution context
├── deliveryBindingId   optional output route
├── cron / runAt
├── triggerPrompt
├── provider/model      removed; inherit from Agent at execution time
├── status
└── executions
```

规则：

- 创建任务时固化 `agentId + sessionId`；执行时不得读取 Agent 当前/默认 Session 替代它。
- Task 调用统一 `SessionTurnService`，不依赖 Channel 运行实例。
- `deliveryBindingId` 只决定是否以及从哪里推送结果，不决定谁执行任务。
- Delivery Channel 离线时，任务仍执行并持久化到目标 Session；投递记录为
  `pending` 或 `failed`，不得跳过 LLM 执行。
- Agent 删除时 Task 和 TaskExecution 一并删除；Session 单独删除时，UI 必须先展示依赖
  并要求级联删除或改绑。
- `provider/model` 继承 Agent 当前配置。若未来需要快照，增加显式 `executionConfigSnapshot`，
  不把配置放回 Channel。

### 4.7 Trigger / Sentinel

Trigger 的身份和投递字段必须分离：

```text
Trigger
├── agentId             required owner/executor
├── sessionId           required target context
├── deliveryBindingId   optional output delivery
├── sourceChannelId     optional event source
├── type/mode/script...
└── executions
```

- Sentinel 事件触发后直接唤醒 `agentId + sessionId`。
- `sourceChannelId` 表示事件来源；`deliveryBindingId` 表示结果出口，两者不得复用。
- 删除/解绑 Channel 不删除 Trigger；依赖该 Binding 的投递状态变为 `needs_rebind`。
- 删除 Agent 时停止 Runner，再级联删除 Trigger 及包含业务 payload 的 Execution。
- 删除 Session 时不得把仍 enabled 的 Trigger 留成 `sessionId=NULL`。必须在事务中改绑、
  禁用或级联删除。
- once/persistent、冷却、预算和脚本进程规则沿用 Trigger 现有规格。

### 4.8 审计数据

Channel 用户消息至少持久化以下规范化字段：`sourceType`、`channelId`、
`externalConversationId`、`externalUserId`、`externalMessageId`、`businessTime` 和版本化
`metadata`。这些来源字段保存为历史快照，不对 Channel 建强级联外键，因此删除 Channel
不会破坏既有 Message。`channelId + externalMessageId` 建立幂等约束或等价 ingest key，防止
适配器重投产生重复消息。

Agent 删除必须删除包含该 Agent 对话正文、Prompt、工具参数、输出或外部身份的业务数据，
包括 Message、TaskExecution 和 TriggerExecution payload。

允许保留的系统审计仅限：删除时间、删除操作人、删除数量、不可逆哈希和错误码；不得
保留 Agent 名称、消息正文、Prompt、工具参数、外部用户 ID 或可恢复的关联键。

## 5. 统一运行时

### 5.1 SessionTurnService

新增独立于 Channel 的执行入口：

```js
await sessionTurnService.runTurn({
  agentId,
  sessionId,
  input,
  envelope, // Web/Channel/Task 均使用规范化来源；Channel 使用 ChannelInboundEnvelopeV2
  delivery: { bindingId, policy },
  flags: { isTask, isTrigger, isSubAgent },
})
```

该服务负责：

- 校验 Agent、Session 和父子关系；
- 加载 Agent 配置、工具、技能和记忆；
- Session FIFO、user 消息立即落盘、assistant 生命周期和崩溃恢复；
- 繁忙 Session 的新工作通过统一协调器进入当前工具循环或下一轮；实施方案见
  [`ChatEvent 统一唤起与运行时调整`](../session-work-injection-development-plan.md)；
- 创建规范 ChatEvent；
- 调用 LLM；
- 将最终输出交给可选的 Channel OutputPort；
- 返回结构化执行结果。

该服务不负责：

- 登录或维护 Channel 连接；
- 猜测 Agent 或 Session；
- 修改 Channel 凭据；
- 把 Channel 配置当成 Agent 配置。

### 5.2 ChannelRuntime

ChannelRuntime 只负责：

- Channel 连接的 start/stop/reconnect；
- 认证与适配器账号生命周期；
- 把入站协议消息标准化为 ChannelInboundEnvelopeV2；
- 调用 ChannelRouteResolver；
- 调用 ChannelConversationService 解析或创建活动 Session；
- 把解析后的请求交给 SessionTurnService；
- 通过绑定对应的适配器发送输出。

```text
Adapter input
  -> ChannelInboundEnvelopeV2
  -> Channel Agent control (/agents, /agent)
  -> ChannelRouteResolver
  -> { agentId, bindingId }
  -> ChannelConversationService
  -> { sessionId, externalUserId, externalConversationId }
  -> SessionTurnService
  -> optional ChannelOutputPort
```

同一个 ChannelRuntime 可以服务多个 Binding；不得再为整个 Channel 创建唯一的
`memory(agentId)`。

### 5.3 Web

- Web 是 Channel，而不是特殊 Agent 类型。
- 新建 Agent 时默认绑定系统 Web Channel，并创建初始 Session，使创建完成后可立即对话。
- Web 页面以 `agentId` 加载 Agent，以 `sessionId` 加载消息；浏览器窗口键不得成为后端
  身份来源。
- Web Socket 使用 Agent 协议；消息、历史、中断与记忆请求必须携带
  `agentId + sessionId`，Channel 协议拒绝会话执行。
- 同一 Agent 从 Web 和微信进入同一 Session 时看到一致的持久化 MessageChain。
- Web 和微信可以各自选择该 Agent 的不同 Session，不相互覆盖“当前会话”。

### 5.4 标准入站信封与模型输入包装

Adapter 不得直接把协议原始对象交给路由器或拼进 Prompt。每条入站消息先转换为
`ChannelInboundEnvelopeV2`：

```ts
interface ChannelInboundEnvelopeV2 {
  version: 2
  source: { channelId: string; adapterId: string; accountId?: string }
  conversation: {
    type: 'private' | 'group'
    externalConversationId: string
    externalThreadId?: string
  }
  actor: { externalUserId: string; displayName?: string; role?: string }
  message: {
    externalMessageId: string
    sentAt: number
    receivedAt: number
    replyToMessageId?: string
  }
  content: {
    text: string
    images: Array<object>
    files: Array<object>
    mentions: Array<object>
  }
  raw?: unknown
}
```

`channelId`、`adapterId`、`externalUserId`、`externalConversationId`、`externalMessageId` 和时间
字段为必填。缺失时返回 `invalid_channel_envelope`，不得创建 Route、Session 或 Message。
`raw` 只允许短期诊断使用，不写入 Prompt，不默认持久化，并必须经过凭据脱敏。

信封进入系统后派生三种表示，三者必须使用同一个 canonical 对象：

- 路由表示：用于 Agent Route、ChannelConversation 和活动 Session 解析；
- 持久化表示：Message 保存来源、发送人、外部会话、外部消息 ID、业务时间和扩展 metadata；
- 模型表示：从 allowlist 投影出稳定、转义后的元信息包装，取代当前仅含时间的包装。

模型可见文本建议采用版本化包装：

```xml
<message version="2" time="2026-09-15T10:00:00.000+08:00"
  source="feishu" channel="工作飞书" conversation_type="group"
  conversation_id="oc_xxx" user_id="ou_xxx" user_name="张三"
  message_id="om_xxx">
用户原始文本
</message>
```

所有属性值必须由服务端生成并转义，用户正文保持原始语义。用户可控的昵称、群名、引用内容
均标记为不可信数据；不得把 token、账号密钥、Binding ID、内部 Agent ID、内部 Session ID
或完整协议 payload 暴露给模型。工具和审计代码读取结构化 envelope，不得反向解析 XML 文本。

## 6. 设置页 UI/UX

### 6.1 信息架构

设置页主入口改为“Agent 管理”。原“渠道管理”降级为“渠道连接”，用于管理员管理
账号认证和连接健康度。

```text
Agent 管理
├── Agent 列表
├── 新建 Agent
└── Agent 详情
    ├── 基本信息
    ├── 模型与能力
    ├── Sessions
    ├── 渠道绑定
    ├── 定时任务与 Trigger
    └── 危险操作

渠道连接（高级）
├── Web（系统管理）
├── 微信账号
└── 其他适配器账号
```

### 6.2 新建 Agent 流程

第一步“Agent 信息”：

- 名称（必填）
- 头像
- 简介/人格
- Provider/Model
- 工具、技能和记忆策略

Provider 和 Model 必须来自当前可用模型目录的联动下拉选择，Provider 变化后自动选择其
默认模型或第一个可用模型；不得要求用户手工输入 Provider/Model 内部字符串。
自动会话标题沿用当前对话实际使用的 Provider/Model，不提供或读取独立的标题模型配置。

第二步“绑定渠道”：

- Web 默认已绑定；
- 可选择已有 Channel；
- 或创建新的 Channel 并进入适配器认证；
- 绑定可以跳过，创建后再补充。

创建和编辑 Agent 使用同一个 Channel 多选控件，并回填当前 Binding；保存编辑时按选择
结果增删 Binding。Web 默认 Binding 只读且不出现在可解绑选项中。

提交时调用一个事务型 API。成功响应必须同时返回 Agent、初始 Session 和 Bindings；
任何一步失败均不得留下孤儿 Agent、Session 或 Binding。

表单不得出现 `agentId`、`sessionId`、`masterId`、`userId`、`botId`、`contactorId`、
`preset` 或原始协议字段。

### 6.3 Agent 列表与详情

Agent 卡片至少展示：

- 名称、头像、状态；
- Provider/Model；
- Session 数量；
- 已绑定 Channel 徽标和连接状态；
- 最近一次 Agent 活动时间；
- “进入对话”“配置”“绑定渠道”操作。

详情页的 Channel 区域允许绑定、解绑和查看状态。解绑确认文案必须明确“不会删除 Agent
和聊天记录”。

### 6.4 Channel 连接页

Channel 卡片展示平台、账号名称、认证状态、连接状态和绑定 Agent 数量。协议身份只在
“诊断信息”折叠区脱敏只读展示。

“添加渠道”独立完成适配器选择、连接命名、可选 Agent 绑定、二维码认证和启动；创建
Channel 不得创建 Agent 或 Session。Channel 的连接生命周期独立于 Agent：未绑定 Agent
的 Channel 仍可完成认证并保持在线；收到消息时只回复“未关联可用 Agent”，不得创建
Agent、Session 或触发模型执行。

删除 Channel 前展示受影响的 Binding 和依赖该 Binding 投递的 Task/Trigger 数量。
删除仅清理连接、凭据、Route 和 Binding，不删除 Agent 或 Session。

### 6.5 删除 Agent

删除确认必须展示将删除的对象数量：Session、子 Session、Message、Task、Trigger 和
Binding。用户二次确认后调用 Agent 删除 API。

成功后前端必须同步清理：

- Agent 列表项；
- 所有该 Agent 的 Session 页面；
- 当前选中状态；
- localStorage/IndexedDB 中该 Agent 和 Session 的缓存；

删除 Agent 不得停止或删除其绑定过的 Channel。Channel 与其他 Agent 的绑定继续工作；
若该 Channel 已无可用绑定，则保持原连接状态，并在收到消息时回复未关联 Agent 的提示。
- 正在进行的流式请求和订阅。

不得删除任何 Channel 连接。

## 7. HTTP API 契约

### 7.1 Agent

```text
GET    /api/agents
POST   /api/agents
GET    /api/agents/:agentId
PATCH  /api/agents/:agentId
DELETE /api/agents/:agentId
```

创建请求示例：

```json
{
  "name": "研究助手",
  "avatar": null,
  "description": "负责研究与总结",
  "provider": "openai",
  "model": "gpt-5",
  "soul": "...",
  "tools": ["web", "memory"],
  "initialSession": { "title": "新对话" },
  "channelIds": ["web-default", "channel-wechat-1"]
}
```

创建响应必须包含：

```json
{
  "agent": { "id": "agent_xxx", "name": "研究助手" },
  "initialSession": { "id": "session_xxx", "agentId": "agent_xxx" },
  "bindings": [{ "id": "binding_xxx", "channelId": "web-default" }]
}
```

删除默认是硬删除 Agent 私有业务数据。服务端必须先停止 Agent 的活跃执行、Task 和
Trigger Runner，再在事务中删除。响应返回删除计数，不返回已删除正文。

### 7.2 Session

```text
GET    /api/agents/:agentId/sessions
POST   /api/agents/:agentId/sessions
GET    /api/agents/:agentId/sessions/:sessionId
DELETE /api/agents/:agentId/sessions/:sessionId
```

创建子 Session 时允许传 `parentSessionId` 和 `kind`。跨 Agent parent 返回 409。
单独删除存在 Task/Trigger 依赖的 Session 时，默认返回 409 和依赖摘要；调用方明确选择
`dependencyPolicy=cascade` 或先完成改绑后方可删除。

### 7.3 Binding 与 Route

```text
GET    /api/agents/:agentId/channels
POST   /api/agents/:agentId/channels/:channelId
DELETE /api/agents/:agentId/channels/:channelId
GET    /api/channels/:channelId/agents
PUT    /api/channels/:channelId/routes/:externalConversationId
```

Binding 创建必须验证 Channel 存在且可绑定。Route API 仅接受 Agent、Session 等公开
资源 ID，不接受 `masterId` 作为用户输入。

### 7.4 Task 与 Trigger

新建和更新接口必须显式接收或从当前已验证的 ChatEvent 固化：

- `agentId`
- `sessionId`
- 可选 `deliveryBindingId`

从当前 ChatEvent 固化时，响应仍返回最终绑定值供用户确认。列表默认按 Agent 过滤；
普通 Agent 工具不得无条件列出整个系统所有任务。

## 8. 权限与安全

- 所有 Session、Binding、Task 和 Trigger 操作先校验 Agent ownership。
- 外部协议身份只由已认证 Adapter 生成，不信任前端提交的 `masterId/userId/botId`。
- Channel 创建后由 Web 系统管理员取得 15 分钟有效的一次性认领码；渠道用户必须在
  私聊中执行 `/admin claim <code>`，服务端才将精确的
  `(channelId, externalUserId)` 映射为 `system_admin`。认领码只保存哈希、最多尝试
  5 次且成功后立即失效。
- Channel 管理员等同系统管理员，但管理员属性属于已认领的渠道用户身份，不属于
  Channel、Agent 或群聊；未认领用户始终为普通用户。
- `principalId` 必须描述真实渠道用户，Agent ID 只作为执行者/联系人 ID，二者不得混用。
- Channel token 继续加密存储，任何 API 不返回明文。
- Route 更新需要管理权限或经过认证的协议内 Agent 选择流程。
- 删除 Agent 为高风险操作，必须防重复提交并提供幂等语义。
- 服务日志不得输出 Channel token、完整外部身份或被删除的消息正文。
- SubAgent 继承工具权限必须使用显式快照，不能因绑定新 Channel 扩权。
- `runTool`、`meta_tool`、Channel 和 SubAgent 必须使用同一工具白名单判定；任何嵌套
  调用都不得调用当前执行上下文快照之外的工具。

## 9. 生命周期与删除语义

### 9.1 删除/解绑矩阵

| 操作 | Agent | Session/Message | Channel | Binding/Route | Task/Trigger |
|---|---|---|---|---|---|
| 解绑 Channel | 保留 | 保留 | 保留 | 删除目标 Binding/Route | 执行归属保留，投递需改绑 |
| 删除 Channel | 保留 | 保留 | 删除 | 删除该 Channel 的 Binding/Route | 执行归属保留，投递需改绑 |
| 删除 Session | 保留 | 删除目标树及消息 | 保留 | 清除对应 Session 指针 | 默认阻止；显式级联或先改绑 |
| 删除 Agent | 删除 | 全部删除 | 保留 | 全部解除 | 停止并全部删除 |

### 9.2 Agent 删除顺序

1. 获取 Agent 级删除锁并拒绝新执行；
2. 取消活跃 ChatEvent/SubAgentRun；
3. 停止并移除内存中的 Cron、Timeout 和 Trigger Runner；
4. 统计将删除的资源；
5. 单事务删除 Agent 私有业务数据和 Binding；
6. 清除运行时缓存、Socket 订阅和投递队列；
7. 记录不含业务正文的最小删除审计；
8. 返回删除计数。

任一步失败必须可重试。事务提交失败时不得返回成功；已停止的调度器可根据数据库中
仍存在的任务恢复。

## 10. 破坏性切换策略

本次 Dev 重构不兼容旧 Agent、Channel、Session、Task 或 Trigger API 请求，但启动时的
Schema 同步不得整库清空，也不得通过删除 SQLite 文件来“修复”结构。使用 Prisma 按
schema diff 增量同步，未受影响的表和记录应保留；涉及列删除、类型不兼容或关系重建的
受影响数据仍可能需要迁移，因此同步前必须自动创建 SQLite 备份。

- 任意环境发现 Schema hash 变化时，只能执行 `prisma db push --accept-data-loss`；
- 启动流程禁止使用 `--force-reset`，也禁止删除 `app.db`、`app.db-wal`、`app.db-shm`；
- 不保留 `Channel.agentId/provider/model`、`Agent.activeSessionId`、`Task.preset/contactorId`
  等兼容字段或响应投影；
- 旧 API 传入内部身份字段直接返回校验错误，不猜测、不转换；
- 若确实需要全新空库，必须由运维显式执行离线命令，并先保留备份；
- 回滚方式是恢复旧版本与 schema 同步前备份，不支持新旧 Schema 原地互转。

## 11. 可观测性

每次执行的结构化日志和指标至少包含：

- `requestId`
- `agentId`
- `sessionId`
- 可选 `parentSessionId`
- `sourceType`
- 可选 `channelId/bindingId`
- 可选 `taskId/triggerId/subagentRunId`
- `deliveryStatus`

禁止通过字段 fallback 填写错误 ID。字段未知时使用 NULL，并产生缺失身份指标。

建议指标：

- Route 解析成功、歧义和失败数；
- Task/Trigger 精确目标执行数；
- Channel 离线但执行成功数；
- Delivery pending/failed/retry 数；
- Agent 删除耗时和删除资源计数；
- 兼容 API/旧字段调用量；
- 跨 Agent ownership 校验失败数。

## 12. 非目标

第一版不包含：

- 多租户计费和组织权限模型；
- 任意图结构的 Session，Session 仅为单父节点树；
- Channel 内根据 LLM 自动猜测目标 Agent；
- 跨 Agent 共享同一个 Session；
- Channel Binding 覆盖 Agent 的模型、人格或工具配置；
- 重新设计底层 Message/Chunk 持久化格式；
- 把 SubAgent 建模为新的永久 Agent。

## 13. 发布门槛

只有同时满足以下条件才可默认启用新架构：

1. 新 Schema、迁移和回滚演练通过；
2. 新旧数据逐项计数与所有权校验通过；
3. Web 与至少一个外部 Channel 完成跨入口共享 Agent/Session 集成测试；
4. 同 Channel 多 Agent 路由无歧义、无任意 fallback；
5. Cron 和 Trigger 固定命中创建时的 Agent/Session；
6. 删除 Agent 后数据库、运行时和浏览器缓存均无业务记录残留；
7. 删除/解绑 Channel 不删除任何 Agent 消息；
8. 新建 Agent UI 不出现任何内部身份字段；
9. 旧 API 使用量归零或具备明确延期批准；
10. [TestPlan.md](./TestPlan.md) 中所有 P0/P1 验收项通过。
