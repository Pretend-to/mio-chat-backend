# MioChat

> **Agent = 模型 + Harness。** 决定一个 agent 靠不靠谱的，往往不是模型本身，而是模型周围那一层 harness——本仓库就是那层 harness，从零亲手写的。

**MioChat** 是一款自托管、模型无关的 Agent 编排平台。它不是某个 LLM API 的封装壳，而是一套完整的 harness：20+ 厂商适配器 + 动态模型路由、每个环节都可被 hook 拦截的工具生命周期、不会切断 tool_calls 对话的长上下文压缩（"结晶"）、多协议入口（Web / Socket.io / OneBot v11 / ACP / HTTP），以及一个承担了一半上下文工程的前端。

核心循环只是五行 ReAct。而这里（前后端两个仓库、约 10 万行）的所有其他代码，正是"能演示"与"能无人值守跑任务而不丢上下文、不丢消息、不丢信任"之间的全部差距。

## 为什么做它

主流 agent 产品的核心循环趋于同构：*调模型 → 执行工具 → 把结果喂回去*。可感知的差异全部发生在循环**之外**：上下文管理、权限、工具契约、流式可靠性、记忆。MioChat 想做的，是把这些层全部握在自己手里——模型无关、自托管、中间没有任何黑盒。

## 截图

<!-- 图片回填清单：将下列 img src 指向 docs/assets/screenshots/ 下你的实际截图即可。
     已预留桌面端聊天、移动端聊天、管理后台/数据看板三个槽位。 -->

<img src="./docs/assets/screenshots/desktop-chat.png" width="720" alt="桌面端 · 聊天界面（流式输出与工具调用时间线）" />

<img src="./docs/assets/screenshots/mobile-chat.png" width="360" alt="移动端 · 聊天界面" />

<img src="./docs/assets/screenshots/admin-dashboard.png" width="720" alt="管理后台 · 模型管理 / 日志 / 数据看板" />

## 架构

```
┌──────────────────────────── SURFACE 入口层 ────────────────────────────┐
│  Web UI (Vue3)    OneBot v11(QQ)    ACP    HTTP API    cron 定时任务    │
└───────────────┬────────────────────────────────────────────────────────┘
                │  Socket.io（流式）/ REST                前后端双仓库构建
┌───────────────▼────────────────────────────────────────────────────────┐
│                             AGENT LOOP  循环层                          │
│   handleMessage → 适配器 → tool_calls → runTool → 工具结果回灌          │
│         ↑                                        │                      │
│         └──────────────  递归轮次  ───────────────┘                      │
│   每一轮开始前 LLM_BEFORE_RECURSION 会动态重排工具列表                    │
├─────────────────────────────────────────────────────────────────────────┤
│                          CONTEXT  上下文层                               │
│   SystemPromptAssembler（人格 + 全局记忆 + memory_crystal 合并为一条     │
│   system 消息）；CrystallizationService（轮次安全的 XML 压缩）；          │
│   MemoryManager 前端可视化编辑 5 个记忆分区                              │
├─────────────────────────────────────────────────────────────────────────┤
│                           SAFETY  安全层                                 │
│   16 个 hook 挂载点 × 10 个内置 hook（审计/限流/长度上限/参数校验/       │
│   权限/工具纠错/模型权限）；MioFunction.run() 被设计为 final——           │
│   子类无法覆写跳过权限校验                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                           BACKEND  能力层                                │
│   21 个厂商适配器 · ModelRegistry（LiteLLM 同步 + 零网络兜底规则）       │
│   9 个插件 / 约 38 个工具（PTY 终端、文件、Web、生图、TTS、MCP、AnyUI）  │
│   SkillService（扫描 9 个技能目录）· SQLite + Prisma · streamCache 回放  │
└─────────────────────────────────────────────────────────────────────────┘
```

## 工程亮点

### 1. 每个环节都可被拦截的工具生命周期

所有工具都走 `MioFunction.run()`——带守卫、内容哈希命名、超时兜底的唯一执行路径。系统在四个生命周期（工具 / 插件 / LLM / 递归轮次）上提供了 **16 个 hook 挂载点**，内置 **10 个 hook**：审计、限流、响应长度上限、权限校验、参数校验、未知工具纠错——`tool:notFound` 会返回结构化兜底结果而不是让整个回合崩掉。

### 2. 模型无关

21 个厂商适配器共享一套注册表：OpenAI、Anthropic、Gemini（两种鉴权）、DeepSeek、智谱、MiniMax、xAI、Groq、OpenRouter、火山引擎、阶跃、百川、快手、美团、GitHub Models、Perplexity、小米 MiMo、零一 … `ModelRegistryService` 同步 LiteLLM 的模型能力/价格表（国内 CDN 镜像优先），同时内置规则表——**零网络也能正确冷启动**。

### 3. 上下文工程：结晶

长对话由无状态的"结晶"服务压缩：先扫描**前端轮次边界**（绝不拦腰切断 tool_calls 的半截对话），再把历史滚成带 **5 个分区**的 XML 摘要（用户画像 / 短期目标 / 运行计划 / 文件变更 / 开发约束），最近一轮原文完整保留。记忆分区既可以被 agent 通过 `memory` 工具 CRUD，也可以被用户在界面上可视化编辑。

### 4. 可靠性是协议，不是承诺

流式 chunk 在服务端 `streamCache` 缓冲、断线重连回放；客户端**先落盘（localforage）成功再 ACK**，落盘失败不发 ACK、服务端保留缓存等你下次进来同步；`StreamBuffer` 以 80ms 节流批量写 store，防止 Safari 高频重绘 OOM 崩溃。

## 前端：渲染层（render layer）

前端（仓库 `mio-chat-frontend`）不是聊天皮肤，它参与 harness 本身：

- **崩溃安全的流式链路** —— 落盘后 ACK、断线回放、节流写 store（见上）。
- **群聊上下文隔离引擎** —— 一条共享消息链、N 个成员各自的视图。成员自己的发言保持原生 `assistant` 格式，其他人的发言打包成 `group_chat_history` XML 的 `user` 消息；数组强制以 user 轮收尾，`@` 路由按 ID 解析，从构造上避免名字互为前缀时的误唤起。
- **客户端记忆工程** —— `SystemPromptAssembler` 把人格 + 全局长期记忆 + 结晶记忆合并成唯一一条 system 消息；`MemoryManager.vue` 让用户可视化查看/编辑五个记忆分区。
- **手写 PWA，不用 Workbox** —— 版本化 Service Worker（v4/v5）+ 自研 IndexedDB 响应缓存：7 天 TTL、每日过期清扫、`CACHE_VERSION=17` 迁移、`postMessage` 开发模式握手。
- **还有** —— Web Worker 分块 MD5 上传、自写 markdown-it @提及插件、Shadow DOM 动态渲染（AnyUI，agent 自己产出的 UI）、8 组手调 Rolldown 分包（把 1MB 的图表库隔离在启动路径之外）。

## 插件与工具

| 插件 | 工具数 | 说明 |
|---|---|---|
| `ai-plugin` | 7 | 搜索 / 识图 / 生图 / 记忆 / cron 定时 / 工具管理 |
| `file-editor-plugin` | 9 | read/write/replace/batch/grep/tree/insert/append |
| `terminal-pty` | 3 | 真实 PTY 会话（node-pty），512KB 输出截断，空闲回收 |
| `web-plugin` | 6 | fetch / crawl / 浏览器管理 / pdf / publish / share |
| `mcp-plugin` | — | MCP 协议客户端（stdio / HTTP / SSE） |
| `anyui-plugin` | 3 | agent 生成的 UI 模板，Shadow DOM 渲染 |
| `edge-tts` / `config` / `skill` | 9 | 语音合成 / 动态配置表单 / 技能管理 |

技能遵循开放 **Agent Skills** 标准，`SkillService` 扫描 9 个目录（含 `.claude/`、`.cursor/`、`.gemini/` 技能目录）——给其他 agent 写好的技能，这里原样能装。

## 快速开始

```bash
# 后端
git clone <backend-repo> mio-chat-backend && cd mio-chat-backend
pnpm install
cp .env.example .env      # 填入你的 LLM API Key
pnpm db:push
pnpm dev                  # http://127.0.0.1:3080

# 前端（独立仓库）
cd ../mio-chat-frontend && pnpm install
pnpm dev                  # http://localhost:1314，代理 /socket.io 与 /api 到 :3080
```

## 仓库布局

```
mio-chat-backend/
├── lib/
│   ├── chat/llm/         适配器、技能、结晶、模型注册表
│   ├── chat/onebot/      OneBot v11（QQ）桥接
│   ├── chat/acp/         Agent Client Protocol + 独立进程管理
│   ├── hooks/            16 个挂载点 + 内置 hook
│   ├── plugins/          9 个内置插件（PTY、MCP、AnyUI、TTS…）
│   ├── server/           Express 5 + Socket.io 运行时
│   └── database/         Prisma + SQLite 服务层
├── prisma/               schema
├── docs/                 架构、RFC、资源
└── config/               PM2 运行配置

mio-chat-frontend/
├── src/lib/              网关、客户端、群聊网关、配置、运行时
├── src/stores/           Pinia（会话、交互、连接…）
├── src/components/       聊天时间线、MemoryManager、AnyUI…
├── src/composables/      20+ 交互逻辑组合式函数
└── public/               版本化 Service Worker + manifest（PWA）
```

## 项目状态

个人研究/工程级项目，直接在 `master` 上开放开发——**目前没有外部用户**。但每个子系统都按生产标准构建：审计 hook、限流、优雅关闭、PM2 零停机 reload、多架构 Docker 镜像流水线。它存在是为了验证一个立场：**harness 才是产品**。

## 文档

- `docs/architecture/` —— RFC（如多模态能力抽象）
- `docs/adapters/` · `docs/plugins/` · `docs/deployment/`

## 许可证

**首个公开版本发布前待定稿。** 当前后端 `LICENSE` 文件为 GPL-3.0（版权信息为占位符）而 `package.json` 声明 ISC；前端尚无许可证文件。仓库对外宣传前将统一并更新本段。
