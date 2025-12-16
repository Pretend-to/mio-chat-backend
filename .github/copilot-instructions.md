<!-- .github/copilot-instructions.md for mio-chat-backend -->
# Repo snapshot for AI coding agents

Quick, focused guidance so an AI coding agent can be productive immediately in this repository.

- Entry point: `app.js` — runs `statusCheck()` then `startServer()` from `lib/server/http/index.js`.
- Primary responsibilities live under `lib/`:
  - `lib/server/http/` — Express HTTP server, API endpoints, static file serving and file upload routes.
  - `lib/server/socket.io/` — Socket.IO server (real-time chat bridge). Look here for event handlers and client message formats.
  - `lib/middleware.js` — runtime glue: initializes socket server, loads LLM adapters, starts OneBot reverse WS, and loads plugins.
  - `lib/chat/` — protocol adapters: `llm/` (OpenAI/Gemini adapters) and `onebot/` (OneBot integration).
  - `lib/plugins` and `plugins/custom` — built-in vs third‑party plugin system; plugins expose tools and are discovered dynamically.

- Config: `config/config/config.example.yaml` (copy to `config/config.yaml` or set envs). Key sections: `openai`, `gemini`, `onebot`, `server`, `web`.

- How to run locally (discoverable from repo):
  - Install: `pnpm install` (repo uses pnpm workspaces; plugins live under `plugins/*`).
  - Foreground (dev): `node app` — runs without pm2 and prints logs to stdout.
  - Production-ish: `pnpm start` runs `pm2 start ./config/pm2.json` as defined in `package.json`.

- Important runtime globals and conventions:
  - `global.middleware` is created in `lib/check.js` and used across runtime to access socket server, plugins, LLMs and OneBot adapter.
  - Logging: `utils/logger.js` (used as `logger` in many files). Prefer using `logger.info`, `logger.warn`, `logger.error`, `logger.mark`, `logger.json`.
  - Plugins are loaded from both `lib/plugins` (internal) and `plugins` (external). A plugin class must expose `initialize()`, `getTools()` and, for custom single-tool wrappers, `singleTools` is used.

- Patterns and data flows to know when changing code:
  - Client messages enter via Socket.IO; `middleware.initSocketServer()` registers two handlers: `onebot` and `llm`. Modifying message formats requires updating both the socket layer and the receiving protocol adapter in `lib/chat/*`.
  - LLM adapters are discovered and initialized via `config.getLLMEnabled()` inside `middleware.loadLLMAdapters()`. Add a new adapter by adding a module under `lib/chat/llm/` and updating config shape.
  - OneBot runs as a reverse WebSocket client when configured. `statusCheck()` will call `global.middleware.startOnebot(...)` if `onebot` is enabled in config.

- Conventions specific to this project:
  - ES modules are used (`"type": "module"` in `package.json`). Use import/export syntax.
  - Dynamic imports: plugin and adapter modules are often imported via `pathToFileURL(...).toString()` and `await import(url)`. Keep code compatible with the dynamic import style.
  - Files under `dist/` are served as frontend static assets; the server sets ETag and Last-Modified headers.
  - Rate limiting: implemented in `lib/server/http/middleware/rateLimiter.js` and applied globally except for `127.0.0.1`.

- Quick editing checklist for typical tasks:
  - Add API route: update `lib/server/http/index.js` routes and add a controller in `lib/server/http/controllers/`.
  - Add Socket event: update `lib/server/socket.io/index.js` handlers and corresponding middleware mapping in `lib/middleware.js`.
  - Add LLM adapter: create `lib/chat/llm/<your-adapter>/index.js`, ensure `config` exposes it via `getLLMEnabled()` and handled by `middleware.loadLLMAdapters()`.
  - Add plugin: put folder in `plugins/<your-plugin>/index.js` or `lib/plugins/<plugin>/index.js` and export a default class implementing `initialize()` and `getTools()`.

- Testing and validation hints (discoverable):
  - There are not many automated tests in the repo. Use these manual checks:
    - `node app` to verify startup flows (status checks, adapter loading, plugin loading).
    - Inspect `stdout`/`pm2 logs` for `logger` output when running with pm2.
  - Lint/format: `pnpm run lint` (oxlint) and `pnpm run format` (prettier).

- Safety and error patterns to watch for:
  - Many modules assume config files exist and will call `process.exit(1)` if no LLM adapters are enabled. When writing code paths that may be used in CI or test, avoid leaving the repo in a state that triggers immediate exit during import.
  - Dynamic imports may throw; existing code catches and logs then continues. Mirror that strategy when adding dynamic-loading code.

- Files to reference when editing or debugging (examples):
  - `app.js` — entry.
  - `lib/check.js` — startup & status checks; sets `global.middleware`.
  - `lib/middleware.js` — most orchestration logic (LLM loading, OneBot, plugins, socket handlers).
  - `lib/server/http/index.js` — HTTP routes and static serving.
  - `config/config/config.example.yaml` — canonical config keys and expected shapes.
  - `package.json` — scripts, dependencies, workspaces.

If anything in this summary looks incomplete or you want me to expand a section (example code snippets for adding adapters or plugins), tell me which part and I will iterate.
