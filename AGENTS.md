# AGENTS.md

> 本文件是 `mio-chat-backend` 的**唯一权威** Agent 指南（人类协作者同样适用）。
> `CLAUDE.md` 是指向本文件的软链接 —— 读 `AGENTS.md` 或 `CLAUDE.md` 的工具都能命中同一份内容。
> 本仓库配套前端仓库 `mio-chat-frontend`（本机通常在 `../mio-chat-frontend`）。

## 项目定位

Mio-Chat 的后端，自称 "Agent OS"：不只是 API 转发，而是带 Hook 拦截、三层插件体系、真实终端桥接的 Agent 运行环境。

作者自用的个人项目，仍在开发阶段，**没有外部用户**。由此推出三条工作原则：

- 数据结构可以直接改到对的形态，不必为兼容旧数据写迁移分支（真需要迁移时走 `lib/migration/`，启动时自动检测执行）。
- CI 只构建 Docker 镜像，不卡合并。主干是 `dev`；本地另有 `master` / `production` 作为发布分支，不主动合并。
- 有测试但覆盖不全，**不要假设改动会被测试拦住**。

## 红线（动手前先读这一节）

1. **数据库路径唯一**：`<cwd>/data/app.db`，由 `lib/database/databasePath.js` 解析。**不存在环境变量覆盖，也不要再加** —— 历史上"测试写进真库"就是路径不唯一造成的。
2. **破坏性 schema 变更必须写成迁移**，而不是靠 `db push`：放 `lib/migration/schema/*.js`（幂等 + 事务 + 行数校验 + 记账 `_schema_migrations` + 自动备份）。启动流程会用 `findDestructiveSchemaChanges()` 拦停破坏性 diff，`assertDatabaseIntact()` 拒绝在库缺失时静默建空库。**纯增量**（新表 / 可空列 / 索引）才允许自动 push。
3. **热重载边界**：`lib/**`、`channels/**`、插件的 `index.js` 与 `lib/**` **不在**插件热重载白名单里，改完必须重启进程（详见"插件与 Skill → 热重载范围"）。
4. **工具注册名 = `<name>_mid_<schemaHash>`**（`lib/function.js`）。hash 的输入包含 `description` —— **改一句工具描述就会让存量配置里的该工具失效**。详见"工具命名与权限"。
5. **OneBot 连接的唯一入口是 `lib/chat/onebot/connectOnebot.js`**（启动 / 保存配置 / 手动重连都走它）。
6. 不要提交 `.env`、`data/*.db`、凭据、运行期渠道数据。

## 命令

```bash
pnpm dev               # node --watch app.js，日志打到 stdout
pnpm start             # pm2 start ./config/pm2.json（生产）
pnpm lint / lint:fix   # oxlint
pnpm format            # prettier --write .

pnpm test:unit         # 单测：隔离 cwd + 真库一致副本（最常用）
pnpm test              # 完整套件（内部驱动 test:unit + 集成）
pnpm test:integration  # 只跑集成用例，需要服务跑在 http://localhost:3080
pnpm test:all          # 全部

pnpm db:push           # prisma db push（纯增量字段才用；破坏性变更走 lib/migration/schema/）
pnpm db:studio         # 可视化查看 data/app.db
pnpm docker:up / docker:down / docker:logs
```

- 单测用 Node 内置 `node --test`，无第三方框架。适配器测试最全（每个 provider 一个文件），业务逻辑覆盖较薄。
- 单测**跑不到真库**：`scripts/utils/testIsolation.js` 会换 cwd 并复制一份真库副本给测试进程。不要给单测进程注入 `ADMIN_CODE` / `USER_CODE` / `NODE_ENV`。
- 已知失败：`tests/adapters/image-url.test.js` 的 2 个用例（GeminiAdapter base64、Image URL pre-processing），与你的改动无关时不要当回归信号。
- 单测每个用例默认 **60s 死线**（`TEST_TIMEOUT_MS=0` 可关掉），并带 `--test-force-exit`：漏了 close 的定时器 / 长连接不会再让套件永生（曾见测试进程挂死 5 天；两个开关都在 `scripts/utils/run-unit-tests.js`）。目标参数可以是文件或目录（目录递归展开），但仍应给带定时器 / 长连接的测试在 `t.after` 里显式 close。

> **发布门禁（已解除 2026-09-23）**：WeChat(onebots) 集成曾依赖本地补丁
> `patches/@onebots__adapter-wechat-clawbot@3.0.12.patch`（给上游适配器加 `outbound_text_format`）。
> 上游已在 `onebots@1.2.14` / `@onebots/*@3.0.14` 正式发布该能力，因此补丁与 `patchedDependencies` 已删除、
> 依赖已升级，`master` 已同步。后续升级这条上游线时，只要确认 `outbound_text_format` 仍在包内即可
> —— `channels/weixin-ilink/OneBotsBridge.js` 依赖它（`channels/weixin-ilink/index.js` 暴露为配置项）。
> 同时 `Dockerfile` 里不再需要 `COPY patches/`。

## 启动流程

`app.js` 是入口，**所有依赖都是动态 import 的**（`await import(...)`），因为初始化有严格顺序：

```
performFullInitialization()   # .env、数据库目录、schema 同步（含破坏性 diff 拦停 + 库完整性校验）
→ prismaManager.initialize()
→ 各 Service.initialize()      # Preset / SystemSettings / PluginConfig / Task
→ imageService / searchService / visionService .initialize()
→ initializeDefaults()         # scripts/initialize-defaults.js
→ checkAndPerformAutoMigration(AutoMigrationDetector)
→ config.reload()              # 同步刚写入的默认值，避免状态检查重复生成访问码
→ statusCheck()                # lib/check.js，在这里创建 global.middleware
→ taskScheduler.initialize()
→ startServer()                # lib/server/http/index.js
```

> 以上是导航性的，**精确顺序以 `app.js` 为准**。

关闭（SIGINT/SIGTERM，10s 强制超时）时会广播 `streamCache` 中仍在执行中的工具调用为 failed 终态
（`notifyInFlightInterrupted`，否则前端那个 bash tool 会永远停在"执行中"），再依次释放 socket sessions、streamCache、TriggerService、ChannelRuntime。改启动/关闭逻辑时别破坏这条链。

## 两个全局

- **`global.middleware`** — 在 `lib/check.js` 里创建，`lib/middleware.js` 定义。运行期访问 socket server、插件、LLM 适配器、OneBot 的统一入口。
- **`logger`** — `utils/logger.js`，全局可用无需 import。用 `logger.info/warn/error/debug/mark/json`。

## 架构

```
lib/
├── server/
│   ├── http/        Express 5：routes(index.js) + controllers/ + middleware/
│   └── socket.io/   实时层，与前端的主通道
├── agents/          AgentService —— Agent 是主体（人格 / 模型 / 工具 / 记忆 / Session 列表）
├── subagents/       SubAgent 编排：Dispatcher / RunService / Executor / StateMachine / ResourcePolicy
├── approvals/       ApprovalNotificationBroker —— 工具挂起的通知与唤醒
├── triggers/        TriggerRegistry / TriggerRunner / WakeInjector / WakeProtocol
├── chat/
│   ├── llm/         适配器、Skills、结晶服务、ChatEvent 流、toolPolicy
│   ├── sessions/    SessionTurnService —— 单轮执行
│   ├── persistence/ SessionPersistence —— 消息链落库
│   ├── search/      搜索调度（两层降级 + 适配器注册表）
│   ├── image/ vision/ 多模态服务
│   └── onebot/      OneBot v11 客户端（主动连配置里的 ws 地址）+ connectOnebot 单一入口
├── hooks/           全局 Hook 架构（V3，16 个挂载点）
├── plugins/         内置插件（ai / web / terminal-pty / agent-manager / mcp / config / ...）
├── database/        Prisma 封装 + Service 层
├── storage/         本地 / S3 兼容存储适配
├── ratelimit/ push/ 限流与推送
├── initialization/  首次启动自愈 + 破坏性 schema 拦停
└── migration/       自动迁移检测 + schema/*.js 幂等结构迁移

channels/   渠道适配层（BaseChannel / ChannelRuntime / ChannelStore / ChannelAdapterRegistry
            + wechat / weixin-ilink / onebots / bindings / triggers）
plugins/    独立成包的插件：custom/、email-plugin/、note-plugin/（pnpm workspace）
```

> 旧文档里的 `lib/chat/acp/`（Agent Client Protocol）**已不存在**，由下面的 Agent / Session / SubAgent 体系取代。

### Agent / Session / SubAgent 领域模型（重构核心）

这是当前重构的中心，权威规格是 [`docs/architecture/channel-agent-refactor/Spec.md`](./docs/architecture/channel-agent-refactor/Spec.md)。
只要改动涉及 Agent、Session、Channel、定时任务、Trigger 或 SubAgent，**先读那份规格**。三条最容易踩错的语义：

1. **Agent 是可配置、可执行、可持久化的主体**；Session 是它的会话上下文，Message / Chunk / ToolCall / Crystal / PendingMemory 都**通过 Session 归属 Agent**。
2. **Channel 只是 I/O 入口** —— 只存平台、凭据、连接状态和协议能力，**不拥有 Agent、模型、人格或聊天记录**。Agent 与 Channel 是多对多。旧假设"Channel 拥有且只拥有一个 Agent""Agent 必须通过 Channel 才能执行"已被废除。
3. **Session 可派生子 Session**，通过 `parentSessionId` 形成有向树。子 Session 承载 SubAgent 与隔离执行上下文，子与父共享 Agent 与 Channel，但**各自独立持有** MessageChain、运行 FIFO 与锁、LLM 调用历史、工具调用记录、超时与取消信号。

相关的领域身份字段边界（`agentId` / `sessionId` / `channelId` / `bindingId` / `contactorId` / 已废弃的 `preset`）在 Spec 的 2.2 节，别在表单或 API 里混用。

### 配置存储

**全部配置在 SQLite（`data/app.db`），不是配置文件。** schema 见 `prisma/schema.prisma`。主要分区：`llm_adapters`、`onebot`、`server`、`web`。通过 Web UI 或 API 管理。`lib/config.js` 是内存缓存，改库后需要 `config.reload()`。

### Socket.IO 层（与前端交互最频繁）

```
lib/server/socket.io/
├── services/
│   ├── loader.js      消息入口，分发 llm_message / onebot_message / logs_message
│   ├── client.js      WebUser 类，一个连接一个实例
│   ├── sessions.js    SessionPool，同一 userId 多端共享，跨连接缓存
│   └── streamCache.js 流式内容缓存，用于断线重连补发
└── utils/             LLMMessageEvent.js 单次 LLM 请求的生命周期对象
```

**协议帧格式**（两个方向都是 JSON 字符串走 `message` 事件）：

```js
{ request_id, protocol: 'llm' | 'onebot' | 'system' | 'logs', type, data, metaData }
```

`client.js` 会校验 `request_id`、`protocol`、`data` 三个字段必须存在。

### streamCache 与 ACK（重要）

流式内容边推边缓存在 `streamCache`（内存，key 为 `userId:contactorId`），用于客户端断线重连后补发。

**清除缓存的唯一入口是客户端的 `ack_message`**（`loader.js` 处理 → `streamCache.deleteMessage`）。`snapshot()` 只读不删 —— 曾经的 `pop()` 会在发出 sync 的同时删除终态消息，sync 帧丢失时消息两端都会丢，已改掉，**不要改回去**。

`enter_chat` 时会先补发 `streamCache` 快照，再从 DB 查未同步的任务执行记录（覆盖 GC 之后的场景，GC 超时 24h）。
`isAlreadySynced` / `markSynced` 是"水位线"机制：快照发出后标记，防止正在跑的流把已包含在快照里的 chunk 又推一遍。

### LLM 适配器

`lib/chat/llm/adapters/implementations/` 下每个 provider 一个文件（openai、anthropic、gemini、deepseek、openrouter、groq、perplexity、minimax、stepfun 等 15+）。都继承 `adapters/base.js`，通过 `adapters/registry.js` 注册。

新增适配器：加 implementations 文件 → registry 注册 → 确保 `config.getLLMEnabled()` 能返回它 → `middleware.loadLLMAdapters()` 自动加载。参照 `tests/adapters/` 里的同类测试补一个。

### 工具命名与权限（最容易踩的一节）

**注册名 = `<name>_mid_<schemaHash>`**：

```js
// lib/function.js
this.hash = generateHash(JSON.stringify({ description, name, parameters })); // md5 前 6 位
this.name = `${name}_mid_${this.hash}`;
```

历史原因：MCP 生态里不同 server 可能暴露**同名工具**，用 schema 哈希来区分"同名但定义不同"的工具。代价有两个，都要知道：

- hash 的输入含 `description` → **改描述/参数 = 所有存量配置里该工具的名字失效**（前端会把解析后的全名持久化进联系人配置）。新增/修改工具文档时请预期这一点；前端重新打开配置会自动重新解析。
- 同名且**定义完全相同**的工具 hash 相同，`plugin.js` / `getAllTools()` 的 Map 会后者覆盖前者 —— 所以它是"同名不同定义"的区分器，不是严格实例身份。

匹配纪律：`runTool`、`meta_tool`、`PresetService`、`toolPolicy.normalizeToolPolicyName` 都按**基名**（`split('_mid_')[0]`）匹配；`getLLMTools` 目前只做单向兼容（请求 `cron` → 命中 `cron_mid_*`），请求名自带旧 hash 时会落到 `not_registered`。改这里时注意：**按基名回退只能用于"候选唯一"的情况**，同名多候选不能猜。

权限判定的唯一入口是 `lib/chat/llm/toolPolicy.js::evaluateToolAccess`：policy = `DEFAULT_ACCESS` ← 插件 `access` ← 工具 `access` 逐层**取交集**（`narrowAccess`）。判定维度是 `scene.conversationKinds` / `sessionKinds` / `triggerKinds`、`exposure`（schema/meta）、`requires.admin`、`requires.agentContext`。`AGENT_TOOL_PLUGINS` + `applyAgentToolPolicy()` 决定 Agent 会话的核心工具集（Agent 会话的工具集是被钉死的，前端设置不生效）。

排查"前端开了但模型没有这个工具"的第一落点是 `getLLMTools` 里那行 warn：

```
[ToolSchema] 本轮注入 19/23 | 未加载 4 个: xxx(not_registered), yyy(conversation_not_allowed) | provider=openai | source=web ...
```

### Hook 架构

`lib/hooks/types.js` 定义所有挂载点，**共 16 个**，分三类：

- **工具生命周期（6）** — `tool:beforeLoad` / `notFound` / `beforeExecute` / `afterExecute` / `onError` / `onTimeout`
- **插件生命周期（6）** — `plugin:beforeInit` / `afterInit` / `toolsLoaded` / `beforeDestroy` / `afterDestroy`、`plugins:updated`
- **LLM 对话拦截（4）** — `llm:beforeChat` / `beforeRecursion` / `afterChat` / `toolResults`

内置 Hook 在 `lib/hooks/builtins/`（鉴权、审计、模型权限、工具解析、响应长度限制等）。加新的横切逻辑优先考虑 Hook，而不是改核心代码。

### 插件与 Skill

三层：

1. **Native Plugins** — `lib/plugins/*`（内置）和 `plugins/*`（独立成包：`custom/`、`email-plugin/`、`note-plugin/`，pnpm workspace）。插件类须 export default 并实现 `initialize()` 和 `getTools()`。
2. **Skills** — `lib/chat/llm/skills/*`，专家包形态，由 `SkillService.js` 管理。
3. **MCP** — 通过 `lib/plugins/mcp-plugin` 接标准协议（`mcpLoader.js` 用 MCP 原始工具名注册，不带 server 前缀）。

**热重载范围（极易踩坑）**：`Plugin._setupWatchers()` 只用 chokidar 监听四个子路径，且 `depth: 0`（不递归）：

| 会热重载             | 不会热重载（必须重启进程）                                          |
| -------------------- | ------------------------------------------------------------------- |
| `tools/`             | 插件根目录的 `index.js`                                             |
| `hooks/`             | 插件的 `lib/` 子目录                                                |
| `presets/`           | **核心 lib**（`lib/chat/**`、`lib/agents/**`、`lib/triggers/**` …） |
| `skills/`（depth 2） |                                                                     |

典型症状是"一半新一半旧"：改了 `plugins/x/tools/a.js` 立即生效，同时改了 `lib/chat/y.js` 却没生效，很容易被误判成 bug。判断标准就一条：**文件是否落在上表左侧四个目录里**。`reload` 工具能热重载插件，但覆盖不到核心 `lib/`。

插件通过 `pathToFileURL(...)` + `await import(url)` 动态加载，加载失败是 catch + log + 继续，新增动态加载代码时保持这个策略。

### 上下文压缩（结晶）

`lib/chat/llm/services/CrystallizationService.js` + `CrystallizationUtils.js`。把历史压成 XML 分区结构（用户画像、短期目标、运行计划、文件变更、开发约束五个区）。

**水位线由前端下发**，后端不维护该状态。前端在 settings 里传 `crystallization_token_watermark`、`previous_summary`、`crystallization_keep_turns`，后端据此判断是否触发压缩，压完通过 `crystallize` 流式事件推回。
群聊场景下前端是**按成员**独立下发这组参数的 —— 后端无需感知群的概念，收到什么压什么。

### OneBot（`lib/chat/onebot/`）

- `connectOnebot.js` 是**唯一入口**：`connectOnebot()`（按当前配置重建连接，幂等）/ `connectOnebotAndWait()`（给"点一下看结果"用）/ `getOnebotState()`（对外状态唯一出口，输出 `phase`: `disabled|incomplete|connecting|online|offline`）。
- 触发点：启动（`lib/check.js`）、`configService` 保存 `onebot` 段（`updateConfig` 与 `updateConfigSection` 两条路径）、`POST /api/onebot/reconnect`（管理员校验）。
- `adapters/websocket.js` 是可控状态机：`connect()` 幂等（先销毁旧 socket）、重连由单一定时器驱动、`close()` 之后彻底停止；重建连接时**先 `disableLifecycleEvent()`**（否则心跳 interval 泄漏），销毁 socket 时**必须留一个吞异常的空 error handler**（CONNECTING 阶段 `close()` 会 emit `error`，没有监听者会升级成 `uncaughtException` 直接干掉进程）。
- 配置字段叫 `reverse_ws_url`，但实现是**主动连出去**的 ws 客户端。

## 约定

- ES modules（`"type": "module"`），全程 import/export，2 空格缩进、无分号、单引号、trailing comma、80 列（`.prettierrc`）。
- 动态 import 是常态，尤其是插件、适配器、以及 `app.js` 的启动依赖。
- `dist/` 是前端构建产物，由 Express 托管并设置 ETag / Last-Modified —— 前端改完要同步到这里。
- 多处在配置缺失时会 `process.exit(1)`（如没有启用任何 LLM 适配器）。写可能被测试或 CI 引入的代码路径时，注意别让 import 阶段就触发退出。
- 提交信息用 Conventional Commits（`feat(channel): ...` / `fix: ...` / `docs: ...`），保持单次提交聚焦。

## 常见改动的落点

| 任务                  | 改哪里                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------- |
| 加 HTTP 路由          | `lib/server/http/index.js` + `controllers/` 下新增 controller                          |
| 加 Socket 事件        | `lib/server/socket.io/services/loader.js` + `lib/middleware.js` 映射                   |
| 加 LLM 适配器         | `lib/chat/llm/adapters/implementations/` + `registry.js`                               |
| 加插件                | `plugins/custom/<name>/index.js`，export default 类实现 `initialize()` / `getTools()`  |
| 加/改工具             | `lib/plugins/<plugin>/tools/*.js`；**注意 `_mid_` 哈希语义与 `access` 声明**            |
| 加 Hook               | `lib/hooks/builtins/` + 在 `types.js` 确认挂载点                                       |
| 改数据库结构          | 纯增量：`prisma/schema.prisma` → `pnpm db:push`；破坏性：写 `lib/migration/schema/*.js` |
| 改 Agent 领域模型     | `lib/agents/AgentService.js` + schema，**先读 Spec.md**                                |
| 改 SubAgent 编排      | `lib/subagents/`（Dispatcher / RunService / Executor / StateMachine / ResourcePolicy） |
| 改渠道接入            | `channels/` 下对应适配器 + `ChannelAdapterRegistry.js` 注册                            |
| 改定时 / 唤醒         | `lib/triggers/`（Registry / Runner / WakeInjector）+ `lib/cron.js`                     |
| 改搜索通道            | `lib/chat/search/`：适配器放 `implementations/`，在 `SearchRegistry.js` 注册           |
| 改 OneBot 连接/状态   | `lib/chat/onebot/connectOnebot.js`（唯一入口）+ 前端设置页 `OnebotConfigView.vue`      |
| 改命令执行 / 审批挂起 | `lib/plugins/terminal-pty/` + `lib/approvals/`                                         |

改前后端交互的消息格式时，**两个仓库要同步改** —— socket 层和 `lib/chat/*` 的协议适配器都可能涉及。

## 文档索引

| 想了解                              | 看哪                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------- |
| **Agent / Session / Channel（权威）** | `docs/architecture/channel-agent-refactor/Spec.md`                          |
| SubAgent 异步编排实施计划           | `docs/architecture/channel-agent-refactor/SubAgentAsyncDevelopmentPlan.md`  |
| 定时任务与 Trigger                  | `docs/architecture/trigger-system.md`                                       |
| ChatEvent 统一唤起与运行时调整      | `docs/architecture/session-work-injection-development-plan.md`             |
| 渠道模型历史演进                    | `docs/architecture/channel-v1.0.md`、`docs/architecture/onebots-deep-dive-research.md` |
| 前端契约（socket/API）              | 前端仓库 `docs/*.md`（`message-rendering-pipeline.md`、`config-api.md` 等） |

## 已知的坑

- 旧文档里的 `lib/chat/acp/` 已不存在。
- 全量套件里可能存在与本次改动无关的红（先 `git log`/`blame` 确认再当回归信号）；已知红：`tests/adapters/image-url.test.js` 的 2 个用例。
- 工具注册名带 `_mid_<hash>`：改了工具描述后，存量前端配置里的旧名会在日志里报 `not_registered`，让用户重开一次配置即可自愈（见"工具命名与权限"）。
