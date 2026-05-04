---
name: miochat-plugin-builder
description: Master Guide for building and managing MioChat plugins using terminal and file-editor tools.
version: 3.1.0
author: Mio-Chat
---

# MioChat Plugin Builder: Master Edition

You are a Master Architect of the MioChat ecosystem. You extend the system by managing plugins in the root `/plugins/` (Standard Project-Level) or `/plugins/custom/` (Agile Single-File) directories.

> [!IMPORTANT]
> **Directory Standards**: 
> - **`/plugins/<plugin-name>/`**: The ONLY place for new project-level plugins. 
> - **`lib/plugins/`**: RESERVED for system core plugins. Do not add new plugins here.

## 📦 Monorepo Dependency Management

MioChat uses a **pnpm monorepo** architecture. 

### Best Practice for Dependencies:
1.  **Modify `package.json`**: Add your required dependencies to the `package.json` file inside your specific plugin directory (e.g., `/plugins/my-plugin/package.json`).
2.  **Run Install at ROOT**: Always run the install command at the **project root** to let pnpm handle workspace linking and deduplication.
    - `executeCommand(command: "pnpm install")` (from root)
3.  **CRITICAL**: NEVER run `npm install` or `pnpm install` inside the plugin subdirectory. This will break the monorepo link and cause runtime module errors.

---

## 🏗️ Project-Level Plugins (Standard)

Standard plugins are structured as a package with metadata and configuration support.

- **Location**: `/plugins/<plugin-name>/`
- **Structure**:
  ```text
  plugins/my-plugin/
  ├── package.json      # Metadata & Dependencies
  ├── index.js          # Plugin Entry Class
  └── tools/            # Directory for MioFunction tools
  ```

### 1. `index.js` Implementation
The `index.js` file should be as minimal as possible. By passing `importMetaUrl`, the base class automatically determines the plugin's path.

```javascript
import Plugin from '../../lib/plugin.js' // Note the relative path to lib/plugin.js

export default class MyPlugin extends Plugin {
  constructor() {
    // PASS importMetaUrl for automatic path & metadata detection
    super({ importMetaUrl: import.meta.url })
  }

  getInitialConfig() {
    return {
      apiKey: '',
      enableFeature: true
    }
  }
}
```

---

## 🧪 Debugging & Validation (The Loop)

After writing code, you MUST verify the tool logic using the built-in Debug API.

### 1. Find the Full Tool Name
MioChat adds a hash suffix to tool names to prevent collisions. Before debugging, fetch the actual name:
- **API**: `GET /api/plugins/:pluginName/tools`
- **Header**: `X-Admin-Code: 123456`
- **Example**: `pubWebpage` might actually be `pubWebpage_mid_b1a2a1`.

### 2. Execute Debug Call
Use `curl` to call the debug endpoint. This bypasses LLM orchestration and executes the tool directly.
- **API**: `POST /api/plugins/:pluginName/tools/:toolName/debug`
- **Body**: `{"parameters": { ...your test params... }}`
- **Authentication**: Requires `X-Admin-Code` header.

```bash
# Example Debug Command
curl -X POST http://127.0.0.1:3000/api/plugins/web-plugin/tools/pubWebpage_mid_b1a2a1/debug \
-H "Content-Type: application/json" \
-H "X-Admin-Code: 123456" \
-d '{"parameters": {"localPath": "/path/to/test/site"}}'
```

---

## 🛠️ Master Workflow (Complete Loop)

1.  **Plan**: Core plugin (`lib/plugins/`) or Custom tool (`plugins/custom/`).
2.  **Develop**: Implement code logic and define parameters.
3.  **Hot Reload**: Save files. Check backend logs to confirm `[PluginName] 工具加载完成`.
4.  **Identify**: Call `GET /api/plugins/:pluginName/tools` to find the hashed tool name.
5.  **Validate**: Call `POST /.../debug` with test parameters.
6.  **Refine**: If it fails, fix the code and repeat from step 3.

---
*Note: Call `Skill(skill_name: "miochat-plugin-builder")` to refresh these instructions.*
