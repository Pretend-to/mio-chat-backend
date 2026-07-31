# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目定位

Mio-Chat 的后端，自称 "Agent OS"：不只是 API 转发，而是带 Hook 拦截、三层插件体系、真实终端桥接的 Agent 运行环境。配套前端仓库 `mio-chat-frontend`（本机通常在 `../mio-chat-frontend`）。

这是作者自用的个人项目，仍在开发阶段，**没有外部用户**。因此：

- 数据结构可以直接改到对的形态，不必为兼容旧数据写迁移分支（真需要迁移时走 `lib/migration/`，启动时自动检测执行）。
- CI 只构建 Docker 镜像，不卡合并。直接提交到 `master`，无 PR 流程。
- 有测试但覆盖不全，**不要假设改动会被测试拦住**。

## 命令

```bash
pnpm dev          # node --watch app.js，日志打到 stdout
pnpm start        # pm2 start ./config/pm2.json（生产）
pnpm lint         # oxlint
pnpm lint:fix     # oxlint --fix
pnpm format       # prettier --write .

pnpm test         # bash scripts/utils/run-tests.sh
pnpm test:unit    # node --test tests/**/*.test.js
node --test tests/adapters/openai.test.js    # 跑单个测试文件

pnpm db:push      # prisma db push（改完 schema 用这个，开发阶段够了）
pnpm db:migrate   # prisma migrate dev
pnpm db:studio    # 可视化查看 data/app.db

pnpm docker:up / docker:down / docker:logs
```

测试用 Node 内置的 `node --test`，无第三方框架。测试分布：`tests/{adapters,integration,plugins,routes,unit}/`。适配器测试最全（每个 provider 一个文件），业务逻辑覆盖较薄。

## 启动流程

`app.js` 是入口，**所有依赖都是动态 import 的**（`await import(...)`），因为初始化有严格顺序：

```
performFullInitialization()   # 确保 .env 存在、数据库目录存在、schema 已同步
  → prismaManager.initialize()
  → 各 Service.initialize()（Preset / SystemSettings / PluginConfig / Task）
  → initializeDefaults()
  → AutoMigrationDetector.checkAndMigrate()
  → config.reload()
  → statusCheck()               # lib/check.js，在这里创建 global.middleware
  → taskScheduler.initialize()
  → startServer()               # lib/server/http/index.js
```

`app.js` 还实现了优雅关闭（SIGINT/SIGTERM，10s 强制超时），改启动/关闭逻辑时注意别破坏这条链。

## 两个全局

- **`global.middleware`** — 在 `lib/check.js` 里创建，`lib/middleware.js` 定义。运行期访问 socket server、插件、LLM 适配器、OneBot 的统一入口。
- **`logger`** — `utils/logger.js`，全局可用无需 import。用 `logger.info/warn/error/debug/mark/json`。

## 架构

```
lib/
├── server/
│   ├── http/          Express 5：routes(index.js) + controllers/ + middleware/
│   └── socket.io/     实时层，与前端的主通道
├── chat/
│   ├── llm/           适配器、Skills、结晶服务、任务执行
│   ├── onebot/        OneBot v11（反向 WS 客户端）
│   └── acp/           Agent Client Protocol，带独立进程管理
├── hooks/             全局 Hook 架构（V3）
├── plugins/           内置插件
├── database/          Prisma 封装 + Service 层
├── initialization/    首次启动自愈
└── migration/         自动迁移检测
plugins/custom/        第三方插件（pnpm workspace）
```

### 配置存储

**全部配置在 SQLite（`data/app.db`），不是配置文件。** schema 见 `prisma/schema.prisma`。主要分区：`llm_adapters`、`onebot`、`server`、`web`。通过 Web UI 或 API 管理。`lib/config.js` 是内存缓存，改库后需要 `config.reload()`。

### Socket.IO 层（与前端交互最频繁）

```
lib/server/socket.io/
├── services/
│   ├── loader.js       消息入口，分发 llm_message / onebot_message / logs_message
│   ├── client.js       WebUser 类，一个连接一个实例
│   ├── sessions.js     SessionPool，同一 userId 多端共享，跨连接缓存
│   └── streamCache.js  流式内容缓存，用于断线重连补发
└── utils/
    └── LLMMessageEvent.js   单次 LLM 请求的生命周期对象
```

**协议帧格式**（两个方向都是 JSON 字符串走 `message` 事件）：

```js
{ request_id, protocol: 'llm'|'onebot'|'system'|'logs', type, data, metaData }
```

`client.js` 会校验 `request_id`、`protocol`、`data` 三个字段必须存在。

### streamCache 与 ACK（重要）

流式内容边推边缓存在 `streamCache`（内存，key 为 `userId:contactorId`），用于客户端断线重连后补发。

**清除缓存的唯一入口是客户端的 `ack_message`**（`loader.js` 里处理 → `streamCache.deleteMessage`）。`snapshot()` 只读不删 —— 曾经的 `pop()` 会在发出 sync 的同时删除终态消息，sync 帧丢失时消息两端都会丢，已改掉，不要改回去。

`enter_chat` 时会先补发 `streamCache` 快照，再从 DB 查未同步的任务执行记录（覆盖 streamCache GC 后的场景，GC 超时 24h）。

`isAlreadySynced` / `markSynced` 是"水位线"机制：快照发出后标记，防止正在跑的流把已包含在快照里的 chunk 又推一遍。

### LLM 适配器

`lib/chat/llm/adapters/implementations/` 下每个 provider 一个文件（openai、anthropic、gemini、deepseek、openrouter、groq、perplexity、minimax、stepfun 等 15+）。都继承 `adapters/base.js`，通过 `adapters/registry.js` 注册。

新增适配器：加 implementations 文件 → 在 registry 注册 → 确保 `config.getLLMEnabled()` 能返回它 → `middleware.loadLLMAdapters()` 会自动加载。参照 `tests/adapters/` 里的同类测试补一个。

### Hook 架构

`lib/hooks/types.js` 定义所有挂载点，分三类：

- **工具生命周期** — `tool:beforeLoad` / `notFound` / `beforeExecute` / `afterExecute` / `onError` / `onTimeout`
- **插件生命周期** — `plugin:beforeInit` / `afterInit` / `toolsLoaded` / `beforeDestroy` / `afterDestroy`、`plugins:updated`
- **LLM 对话拦截** — `llm:beforeChat` / `afterChat` / `toolResults`

内置 Hook 在 `lib/hooks/builtins/`（鉴权、审计、模型权限、工具解析、响应长度限制等）。加新的横切逻辑优先考虑 Hook，而不是改核心代码。

### 插件与 Skill

三层：

1. **Native Plugins** — `lib/plugins/*`（内置）和 `plugins/custom/*`（第三方，pnpm workspace）。插件类须 export default 并实现 `initialize()` 和 `getTools()`。支持热重载。
2. **Skills** — `lib/chat/llm/skills/*`，专家包形态，由 `SkillService.js` 管理。
3. **MCP** — 通过 `lib/plugins/mcp-plugin` 接标准协议。

插件通过 `pathToFileURL(...)` + `await import(url)` 动态加载，加载失败是 catch + log + 继续，新增动态加载代码时保持这个策略。

### 上下文压缩（结晶）

`lib/chat/llm/services/CrystallizationService.js` + `CrystallizationUtils.js`。把历史压成 XML 分区结构（用户画像、短期目标、运行计划、文件变更、开发约束五个区）。

**水位线由前端下发**，后端不维护该状态。前端在 settings 里传 `crystallization_token_watermark`、`previous_summary`、`crystallization_keep_turns`，后端据此判断是否触发压缩，压完通过 `crystallize` 流式事件推回。

群聊场景下前端是**按成员**独立下发这组参数的 —— 后端无需感知群的概念，收到什么压什么。

## 约定

- ES modules（`"type": "module"`），全程 import/export
- 动态 import 是常态，尤其是插件、适配器、以及 `app.js` 的启动依赖
- `dist/` 是前端构建产物，由 Express 托管并设置 ETag / Last-Modified
- 多处在配置缺失时会 `process.exit(1)`（如没有启用任何 LLM 适配器）。写可能被测试或 CI 引入的代码路径时，注意别让 import 阶段就触发退出。

## 常见改动的落点

| 任务 | 改哪里 |
| --- | --- |
| 加 HTTP 路由 | `lib/server/http/index.js` + `controllers/` 下新增 controller |
| 加 Socket 事件 | `lib/server/socket.io/services/loader.js` + `lib/middleware.js` 映射 |
| 加 LLM 适配器 | `lib/chat/llm/adapters/implementations/` + `registry.js` |
| 加插件 | `plugins/custom/<name>/index.js`，export default 类实现 `initialize()` / `getTools()` |
| 加 Hook | `lib/hooks/builtins/` + 在 `types.js` 确认挂载点 |
| 改数据库结构 | `prisma/schema.prisma` → `pnpm db:push` → 相应 Service |

改前后端交互的消息格式时，**两个仓库要同步改** —— socket 层和 `lib/chat/*` 的协议适配器都可能涉及。
