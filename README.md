# MioChat

> **Agent = Model + Harness.** Most of what makes an agent reliable lives outside the model, in the harness wrapped around it — this repository *is* that harness, built from scratch.

**MioChat** is a self-hosted, model-agnostic agent orchestration platform. Not a wrapper around a single LLM API: a full harness with dynamic routing across 20+ provider adapters, a hook-interceptable tool lifecycle, turn-safe long-context compression ("crystallization"), multi-protocol entry points (Web / Socket.io / OneBot v11 / ACP / HTTP), and a frontend that carries half of the context engineering in the browser.

The core agent loop is five lines of ReAct. Everything else here — ~100k lines across two repositories — is the difference between a demo and a system that runs unattended tasks without losing context, messages, or trust.

## Why it exists

All mainstream agent products converge on the same loop: *call model → execute tool → feed the result back*. The observable differences live entirely **outside** the loop: context management, permissions, tool contracts, streaming reliability, memory. MioChat owns all of those layers directly — model-agnostic, self-hosted, with nothing between the code and your machine.

## Screenshots

<!-- 筛选回填清单：将下列 img src 指向 docs/assets/screenshots/ 下你的实际截图即可。
     已预留桌面端聊天、移动端聊天、管理后台/数据看板三个槽位。 -->

<img src="./docs/assets/screenshots/desktop-chat.png" width="720" alt="Desktop chat — streaming output with a tool-call timeline" />

<img src="./docs/assets/screenshots/mobile-chat.png" width="360" alt="Mobile chat interface" />

<img src="./docs/assets/screenshots/admin-dashboard.png" width="720" alt="Admin dashboard — model management, logs, data views" />

## Architecture

```
┌───────────────────────────── SURFACE ─────────────────────────────┐
│  Web UI (Vue 3)    OneBot v11 (QQ)    ACP    HTTP API    cron     │
└───────────────┬───────────────────────────────────────────────────┘
                │  Socket.io (streaming) / REST         dual-repo build
┌───────────────▼───────────────────────────────────────────────────┐
│                          AGENT LOOP                                │
│   handleMessage → adapter → tool_calls → runTool → tool results   │
│         ↑                                        │                 │
│         └───────────── recursion ────────────────┘                 │
│   LLM_BEFORE_RECURSION re-shapes the tool list on every turn      │
├────────────────────────────────────────────────────────────────────┤
│                        CONTEXT ENGINEERING                          │
│   SystemPromptAssembler (persona + global memory + memory_crystal) │
│   CrystallizationService (turn-boundary-safe XML compression)      │
│   MemoryManager — 5 visual, editable memory zones (frontend)       │
├────────────────────────────────────────────────────────────────────┤
│                            SAFETY                                   │
│   16 hook points × 10 built-in hooks (audit / rate-limit /         │
│   param-validation / permission / tool-resolution / model-perm)     │
│   MioFunction.run() is final — permission checks can't be          │
│   bypassed by subclassing                                           │
├────────────────────────────────────────────────────────────────────┤
│                            BACKEND                                  │
│   21 provider adapters · ModelRegistry (LiteLLM sync + zero-network │
│   fallback rules) · 9 plugins / ~38 tools (PTY, files, web, image, │
│   TTS, MCP, AnyUI) · SkillService (9 scan roots) · SQLite + Prisma │
│   in-memory streamCache (lost-chunk replay)                        │
└────────────────────────────────────────────────────────────────────┘
```

## Engineering highlights

### 1. A tool lifecycle that can be intercepted at every stage

Every tool runs through `MioFunction.run()` — guarded, content-hashed, and timeout-bounded. The system fires **16 hook points** across four lifecycles (tool / plugin / LLM / recursion), backed by **10 built-in hooks**: audit trails, rate limits, response-size caps, permission checks, parameter validation, and unknown-tool recovery — `tool:notFound` returns a structured fallback result instead of crashing the turn.

### 2. Model-agnostic by design

21 provider adapters (OpenAI, Anthropic, Gemini ×2 auth modes, DeepSeek, Zhipu, MiniMax, xAI, Groq, OpenRouter, Volcengine, StepFun, Baichuan, Kuaishou, Meituan, GitHub Models, Perplexity, Xiaomi MiMo, 01.AI, …) share one registry. `ModelRegistryService` syncs LiteLLM's capability/pricing table (China-CDN-mirrored) **and** ships built-in rule tables so the system boots correctly with zero network access.

### 3. Context engineering: "crystallization"

Long conversations are compressed by a stateless **crystallization** service: it scans frontend *turn* boundaries (never cutting a half-finished tool-call dialogue), rolls history into an XML summary with **five zones** (user profile / short-term goals / current plan / file deltas / constraints), and keeps the latest turn verbatim. Memory zones are CRUD-able by the agent via a `memory` tool — and visually editable by the user.

### 4. Reliability as a protocol, not a promise

Streamed chunks are buffered server-side (`streamCache`) and replayed on reconnect. On the client, a message is only ACKed **after** it survives persistence (`localforage`); failed persistence means no ACK, so the server keeps the buffer and resyncs on next entry. An 80ms `StreamBuffer` throttle batches store writes to avoid Safari OOM on high-frequency repaints.

## Frontend: the render layer

The frontend (repo: `mio-chat-frontend`) is not a chat skin — it participates in the harness.

- **Crash-safe streaming** — ACK-after-persist protocol, stream replay on reconnect, throttled store writes (see above).
- **Group-context isolation engine** — one shared message chain, N per-member views. Each member's own turns keep native `assistant` shape; everyone else's turns are packaged into `group_chat_history` XML as `user` messages. Arrays are forced to end on a `user` turn, and `@` routing is ID-based (prefix-clash-safe by construction).
- **Client-side memory engineering** — `SystemPromptAssembler` merges persona + global long-term memory + memory crystal into a single system message; `MemoryManager.vue` lets users inspect and edit the five memory zones.
- **Hand-written PWA, no Workbox** — versioned Service Workers (`v4`/`v5`) backed by a custom IndexedDB response cache (7-day TTL, daily expiry sweep, `CACHE_VERSION=17` migrations, dev-mode handshake via `postMessage`).
- **And a few more** — Web Worker chunked MD5 for uploads, a bespoke `markdown-it` mention plugin, dynamic Shadow-DOM rendering (`AnyUI`) for agent-produced UI, hand-tuned Rolldown code splitting (8 groups) so a 1MB charting lib never leaks into the startup path.

## Plugins & tools

| Plugin | Tools | Notes |
|---|---|---|
| `ai-plugin` | 7 | search / vision / image draw / memory / cron scheduler / tool management |
| `file-editor-plugin` | 9 | read / write / replace / batch / grep / tree / insert / append |
| `terminal-pty` | 3 | real PTY sessions (node-pty), 512KB output truncation, session reaping |
| `web-plugin` | 6 | fetch / crawl / browser mgmt / pdf / publish / share |
| `mcp-plugin` | — | Model Context Protocol client (stdio / HTTP / SSE) |
| `anyui-plugin` | 3 | agent-authored UI templates rendered in Shadow DOM |
| `edge-tts` / `config` / `skill` | 9 | TTS, dynamic config forms, skill management |

Skills follow the open **Agent Skills** standard; `SkillService` scans 9 locations including your `.claude/`, `.cursor/` and `.gemini/` skill directories — skills written for other agents install here as-is.

## Quick start

```bash
# backend
git clone <backend-repo> mio-chat-backend && cd mio-chat-backend
pnpm install
cp .env.example .env      # add your LLM API keys
pnpm db:push
pnpm dev                  # http://127.0.0.1:3080

# frontend (separate repo)
cd ../mio-chat-frontend && pnpm install
pnpm dev                  # http://localhost:1314, proxies /socket.io & /api to :3080
```

## Repository layout

```
mio-chat-backend/
├── lib/
│   ├── chat/llm/         adapters, skills, crystallization, model registry
│   ├── chat/onebot/      OneBot v11 (QQ) bridge
│   ├── chat/acp/         Agent Client Protocol with process management
│   ├── hooks/            16 hook points + built-in hooks
│   ├── plugins/          9 built-in plugins (PTY, MCP, AnyUI, TTS…)
│   ├── server/           Express 5 + Socket.io runtime
│   └── database/         Prisma + SQLite services
├── prisma/               schema
├── docs/                 architecture, RFCs, assets
└── config/               PM2 runtime config

mio-chat-frontend/
├── src/lib/              gateway, client, group-gateway, config, runtime
├── src/stores/           Pinia (contactors, interaction, connection…)
├── src/components/       chat timeline, MemoryManager, AnyUI, …
├── src/composables/      20+ interaction composables
└── public/               versioned Service Workers + manifest (PWA)
```

## Project status

A personal research/engineering project, developed openly on `master` — **no external users yet**. Every subsystem is nevertheless built to production standard (audit hooks, rate limits, graceful shutdown, zero-downtime PM2 reloads, multi-arch Docker image pipeline). It exists to prove a position: **the harness is the product**.

## Documentation

- `docs/architecture/` — RFCs (e.g., multimodal capability abstraction)
- `docs/adapters/` · `docs/plugins/` · `docs/deployment/`

## License

**Pending finalization before the first public release.** The backend currently ships a GPL-3.0 `LICENSE` file (placeholder copyright) while `package.json` declares ISC; the frontend has no license file yet. These will be unified, and this section updated, before the repository is advertised.
