---
name: miochat-plugin-builder
description: Master Guide for building and managing MioChat plugins using terminal and file-editor tools.
version: 3.2.0
author: Mio-Chat
---

# MioChat Plugin Builder: Master Edition (V3 Hook Architecture)

You are a Master Architect of the MioChat ecosystem. You extend the system by managing plugins in the root `/plugins/` (Standard Project-Level) or `/plugins/custom/` (Agile Single-File) directories.

> [!IMPORTANT]
> **Directory Standards**: 
> - **`/plugins/<plugin-name>/`**: The ONLY place for new project-level plugins. 
> - **`lib/plugins/`**: RESERVED for system core plugins. Do not add new plugins here.

## 🏗️ Project-Level Plugins (V3 Standard)

V3 plugins support logic-separation via hooks and automatic configuration via presets.

- **Location**: `/plugins/<plugin-name>/`
- **Structure**:
  ```text
  plugins/my-plugin/
  ├── package.json      # Metadata & Dependencies
  ├── index.js          # Plugin Entry Class
  ├── tools/            # MioFunction tools (Business Logic)
  ├── hooks/            # [Optional] BaseHook implementations (AOP Logic)
  └── presets/          # [Optional] Preset JSON files (Auto-Seeding)
  ```

### 1. `index.js` Implementation
The `index.js` should handle initialization and optional hook propagation.

```javascript
import Plugin from '../../lib/plugin.js' 

export default class MyPlugin extends Plugin {
  constructor() {
    super({ importMetaUrl: import.meta.url })
  }

  async initialize() {
    await super.initialize() // MUST call super to load tools/hooks
    
    // Optional: Propagate private hooks to the global execution chain
    // this._propagateHooks() 
  }

  getInitialConfig() {
    return { apiKey: '', maxRequests: 100 }
  }
}
```

### 2. Developing Hooks (`hooks/`)
Hooks allow you to intercept tool execution. Just place files inheriting `BaseHook` in the `hooks/` directory.

```javascript
import BaseHook from '../../../lib/hooks/BaseHook.js'
import { HOOK_POINTS } from '../../../lib/hooks/types.js'

export default class MyRateLimitHook extends BaseHook {
  constructor(options) {
    super({
      name: 'my-limiter',
      hookPoint: HOOK_POINTS.TOOL_BEFORE_EXECUTE,
      priority: 80,
      namespace: options.namespace // Injected automatically
    })
  }

  async execute(ctx) {
    const { user, config } = ctx
    if (user.usage > config.maxRequests) {
      ctx.error = 'Usage limit exceeded'
      return false // Block execution
    }
    return true
  }
}
```

> [!TIP]
> **Detailed Hook Points**:
> For a full list of system-wide hook points (including `TOOL_`, `LLM_`, and `PLUGIN_` lifecycle hooks) and advanced AOP design patterns, please refer to the core documentation: [hooks.md](file:///home/mio/servers/mio-chat-backend/docs/core/hooks.md).

### 3. Using Presets (`presets/`)
Any `.json` files in the `presets/` folder are automatically synchronized to the system database upon plugin loading.

**Preset JSON Structure:**
```json
{
  "name": "Expert Role",
  "category": "common",      // common | recommended | hidden
  "hidden": true,            // [IMPORTANT] Set to true to hide from UI preset list
  "opening": "Hello world",
  "history": [
    { "role": "system", "content": "System prompt goes here" }
  ],
  "tools": ["sh", "read"],
  "model": "gpt-4o",
  "provider": "plugin-name",
  "recommended": false,
  "avatar": "url"
}
```
*Note: The system prompt should be the first element in the `history` array with `role: \"system\"`.*

You can output custom frontend UI components by setting `extraRender` in the tool result or calling `this.setOuterRender(e, renders)`.

### Placement Modes:
- **`'inner'`**: Inside the collapsible tool box.
- **`'outer'`**: Directly in the message flow.

---

## 🧪 Debugging & Validation (The Loop)

### 1. Find Hashed Tool Name
- **API**: `GET /api/plugins/:pluginName/tools`
- **Header**: `X-Admin-Code: ******`

### 2. Execute Debug Call
- **API**: `POST /api/plugins/:pluginName/tools/:toolName/debug`
- **Body**: `{"parameters": { ... }}`

### 💡 Expert Debugging Tips
- **Active Port**: Usually `3080` for the production/live instance.
- **Hot Reload**: 
  - Saving `tools/*.js`: Automatic reload.
  - Saving `hooks/*.js`: Automatic reload via `Plugin.initialize`.
  - Saving `index.js`: Triggers plugin-level hot reload via `middleware.js` watcher.

---

## 🛠️ Master Workflow (V3 Loop)

1.  **Plan**: Define tools, hooks (for security/audit), and presets (for UX).
2.  **Develop**: Implement logic.
3.  **Hot Reload**: Save files. Observe logs: `[PluginName] 已加载 N 个私有钩子`.
4.  **Identify**: Call `GET /.../tools` to find names.
5.  **Validate**: Call `POST /.../debug` with test parameters.
6.  **Refine**: Fix code and repeat.

---
*Note: Call `Skill(skill_name: "miochat-plugin-builder")` to refresh these instructions.*
