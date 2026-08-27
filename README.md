<div align="center">

<img src="https://s3.krumio.com/file/web/eadf69/miochat-logo.gif" width="600" alt="MioChat Logo" />

**Not just a chat relay — the next-generation Agent OS.**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.19.0-brightgreen.svg)](https://nodejs.org/)
[![PM2 Ready](https://img.shields.io/badge/pm2-ready-brightgreen.svg)](#quick-start)
[![Architecture](https://img.shields.io/badge/architecture-V3_Hooks-red.svg)](#hooks)
[![UI](https://img.shields.io/badge/UI-Vue%203%20%2B%20Vite%208-42b883)](https://github.com/Pretend-to/mio-chat-frontend)
[![Agent](https://img.shields.io/badge/Agent-Model%20%2B%20Harness-blueviolet)](#why-it-exists)

[**Live Demo**](https://ai.krumio.com) | [Docs](./docs/README.md) | [QQ Group](https://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=-r56TCEUfe5KAZXx3p256B2_cxMhAznC&authKey=6%2F7fyXh3AxdOsYmqqfxBaoKszlQzKKvI%2FahbRBpdKklWWJsyHUI0iyB7MoHQJ%2BqJ&noverify=0&group_code=798543340)

🖥️ [MioChat Frontend](https://github.com/Pretend-to/mio-chat-frontend) · 🎨 [Mio-Previewer (MD Renderer)](https://github.com/Pretend-to/mio-previewer) · 🔌 [Plugin Marketplace](https://github.com/Pretend-to/awesome-miochat-plugins)

</div>

---

Mio-Chat is a complete **Agent ecosystem** built from multiple modules:

| Module | Repository | Description |
| :--- | :--- | :--- |
| **Backend** | [Pretend-to/mio-chat-backend](https://github.com/Pretend-to/mio-chat-backend) | **(this repo)** core runtime, Hook architecture, plugin system |
| **Frontend** | [Pretend-to/mio-chat-frontend](https://github.com/Pretend-to/mio-chat-frontend) | immersive agent UI built on Vue 3 + Element Plus |
| **Renderer** | [Pretend-to/mio-markdown](https://github.com/Pretend-to/mio-markdown) | Markdown rendering engine deeply customized for AI, with Artifacts support |
| **Plugins** | [Pretend-to/awesome-miochat-plugins](https://github.com/Pretend-to/awesome-miochat-plugins) | official & community plugin / Skill / Hook collections |

## Why it exists

<details>
<summary><b>Agent = Model + Harness — the position this project is built on</b></summary>

Traditional AI chat platforms are little more than "API relay stations". **MioChat** is an **Agent Operating System** designed for complex production environments. Through precise context management, bidirectional security authorization, Multi-Agent orchestration and aspect-oriented Hook interception, it lets AI operate on the physical world autonomously *and* safely.

The core agent loop everyone uses is five lines of ReAct. The observable differences live entirely **outside** the loop: context management, permissions, tool contracts, streaming reliability, memory. MioChat owns all of those layers directly — model-agnostic, self-hosted, with nothing between the code and your machine. ~100k lines across two repositories are the difference between a demo and a system that runs unattended tasks without losing context, messages, or trust.

</details>

## Demo

<!-- 回填：演示 GIF → docs/assets/demo/demo.gif（一句话 → 多模型路由 → 工具执行 → 渲染 UI）-->
<img src="./docs/assets/demo/demo.gif" width="720" alt="MioChat demo — one prompt → multi-model routing → tool execution → rendered UI" />

## Architecture


<img src="./.github/diagrams/architecture.svg" width="860" alt="MioChat — Agent Ecosystem architecture" />

## Highlights

### 🧠 Multi-Agent hybrid groups
Break the single-agent silo; run a swarm of heterogeneous LLMs and personas together.

- Add multiple Agents driven by different Channels into one group chat, side by side.
- `@`-directed responses or ordered/conditional multi-agent rounds — cross-perspective review for complex engineering problems.
- One shared message chain, N per-member context views (see Frontend).

<!-- 截图回填：多 Agent 群聊讨论界面 → docs/assets/screenshots/group-chat.png -->
<img src="./docs/assets/screenshots/group-chat.png" width="800" alt="Multi-Agent group discussion" />

### ❄️ Context engineering: "crystallization"
Solves the industry pain point of token explosion and context overflow in long conversations.

- **5 structured XML zones**: user profile, short-term goals, current plan, file-architecture deltas, and global constraints — isolated and normalized.
- **Stateless crystallization + prefix cache**: dynamically watches the token watermark, scans turn boundaries, distills redundant history into read-only memory fragments — engineered to hit Gemini/Claude prompt caches, cutting 80%+ token cost and first-token latency to milliseconds.

<!-- 截图回填：记忆结晶/压缩状态界面 → docs/assets/screenshots/crystallization.png -->
<img src="./docs/assets/screenshots/crystallization.png" width="800" alt="Memory crystallization & context compression" />

### 🛡 Safety: interactive tool suspension
Solves the loss-of-control problem when AI executes dangerous tools (shell commands, file deletion, public publishing).

- **Aspect-oriented mounting**: interception points exposed across the whole LLM + ReAct tool lifecycle.
- **Deferred-Promise suspension**: for sensitive operations the backend pauses the ReAct loop and pushes a second-confirmation card over WebSocket; the loop resumes only after the admin approves.

<!-- 截图回填：敏感工具二次确认卡片 → docs/assets/screenshots/tool-suspend.png -->
<img src="./docs/assets/screenshots/tool-suspend.png" width="800" alt="Sensitive-tool second confirmation card" />

### ⏰ Autonomous tasks & scheduled inspection
Offline autonomy with a visual inspection dashboard.

- Flexible scheduling: standard Cron expressions, relative time, or one-shot triggers.
- Visual Task panel + secure sandbox: inspect execution logs, wake tasks manually; per-task prompts and shell-command allowlists keep the agent from idling.

<!-- 截图回填：定时任务与后台 Agent 巡检界面 → docs/assets/screenshots/cron-task.png -->
<img src="./docs/assets/screenshots/cron-task.png" width="800" alt="Scheduled tasks & background agent inspection" />

### 🔌 Three-layer extensible ecosystem
Expert knowledge, cross-language standards, and high-performance runtime tools together.

- **Skills** (expert guidance) + **MCP protocol** + **Native Plugins** (hot-reload, 9 built-in plugins / ~38 tools).
- **Zod parameter interception + AI self-correction**: tool arguments are strictly validated against Zod schemas; invalid arguments are caught and fed back to the LLM for zero-touch automatic correction.
- Skills follow the open **Agent Skills** standard: `SkillService` scans `.claude/` / `.cursor/` / `.gemini/` skill directories — skills written for other agents install here as-is.

### 🎨 Artifacts & dynamic tool management
- **Artifacts canvas** with `mio-previewer`: independent preview of code, HTML, SVG, Mermaid diagrams and dynamic UI components — side-by-side interaction.
- **Tools Manager**: toggle tools / plugin groups in real time from the conversation UI.

## Hooks

Mio-Chat V3 is built around aspect-oriented interception. The **7 core mount points** (16 in total system-wide) let you control every step of the agent:

| Mount point | Purpose | Typical use |
| :--- | :--- | :--- |
| `LLM_BEFORE_CHAT` | conversation interception | sensitive-word filter, balance deduction, context injection |
| `LLM_BEFORE_RECURSION` | recursion-turn interception | dynamically adjust the tool list per turn, inject turn context |
| `TOOL_BEFORE_LOAD` | load audit | validate tool-name safety, prevent plugin conflicts |
| `TOOL_BEFORE_EXECUTE` | execution intervention | dynamic permission (RBAC), auto param repair, suspend interception |
| `LLM_AFTER_CHAT` | result audit | token usage persistence, response desensitization |
| `LLM_TOOL_RESULTS` | tool-call audit | record tool arguments & outputs after batch execution |
| `TOOL_NOT_FOUND` | smart fallback | strip MD5 suffix, lookup resolution, user guidance |

Backed by 10 built-in hooks (audit, rate-limit, response-size cap, permission checks, model permissions, param validation, …). Every tool runs through `MioFunction.run()` — guarded, content-hashed, timeout-bounded, and impossible to bypass via subclassing. See [Hooks guide](./docs/core/hooks.md).

## Frontend & Plugins

- **Frontend** — the render layer of the harness (streaming reliability, group-context isolation, client-side memory, hand-written PWA) lives in the **[mio-chat-frontend](https://github.com/Pretend-to/mio-chat-frontend)** repo.
- **Plugin / Skill / Hook collections** — official & community: **[awesome-miochat-plugins](https://github.com/Pretend-to/awesome-miochat-plugins)**.

## Quick start

```bash
git clone --depth 1 https://github.com/Pretend-to/mio-chat-backend.git
cd mio-chat-backend
pnpm install
pnpm start
pm2 logs mio-chat-backend
```

First launch auto-initializes the database and schema (built into `app.js` initialization). Then open the web UI and configure your LLM adapters / OneBot / plugins from the **admin panel** — all settings live in SQLite, surfaced through the UI & API.

Frontend (separate repo, syncs with backend models automatically):

```bash
git clone https://github.com/Pretend-to/mio-chat-frontend.git
cd mio-chat-frontend && pnpm install && pnpm dev
```

## Documentation

| Category | Links |
| :--- | :--- |
| **🚀 Quick Start & Deploy** | [Deployment Guide](./docs/deployment/RUNNING_GUIDE.md) \| [PM2](./docs/deployment/DEPLOYMENT.md) \| [Docker](./docs/deployment/DOCKER.md) \| [Config API](./docs/api/config-api.md) |
| **🧠 Core Mechanics** | [Context Crystallization](./docs/core/memory-crystallization.md) \| [Hooks](./docs/core/hooks.md) \| [Socket Protocol](./docs/api/socket_protocol_zod.ts) |
| **🛠️ Development** | [Plugin Guide](./docs/plugins/PLUGIN_DEVELOPMENT_GUIDE.md) \| [Skill Spec](./lib/chat/llm/skills/miochat-plugin-builder/SKILL.md) \| [Adapter Template](./docs/adapters/ADAPTER_TEMPLATE.js) |
| **🗄️ Archive** | [Architecture Migration](./docs/archive/MIGRATION.md) \| [Q&A](./docs/archive/FULL_PROJECT_QA.md) |

## Contributing

Mio-Chat evolves community-driven. Any contribution is welcome:

1. **Contribute a Plugin** — give agents the ability to operate new domains.
2. **Contribute a Skill** — crystallize expert knowledge for a specific domain.
3. **Contribute a Hook** — harden the defense & audit system.

## 🙏 Acknowledgements

Developed with JetBrains' **Open Source Development License** — free professional JetBrains IDE licenses provided for this open-source project.

[![JetBrains](https://resources.jetbrains.com/storage/products/company/brand/logos/jb_beam.svg)](https://www.jetbrains.com/)

## License

[MIT](LICENSE) — © 2026 MioChat contributors
