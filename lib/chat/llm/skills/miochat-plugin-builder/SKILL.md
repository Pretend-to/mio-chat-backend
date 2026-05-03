---
name: miochat-plugin-builder
description: Master Guide for building and managing MioChat plugins using terminal and file-editor tools.
version: 3.0.0
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

  /**
   * Define the default configuration schema and initial values
   * This will be persisted in the database and accessible via this.configData
   */
  getInitialConfig() {
    return {
      apiKey: '',
      enableFeature: true
    }
  }
}
```

### 2. Adding Tools
Tools should be placed in the `tools/` subdirectory. Since these are one level deeper, the import path to the base class changes:

```javascript
import { MioFunction } from '../../../lib/function.js' // NOTE: 3 levels up for tools in a subdirectory

export default class MyPluginTool extends MioFunction {
  // ...
}
```

---

## ⚡ Custom Tools (Agile)

For quick additions, use a single-file tool.

- **Location**: `/plugins/custom/<tool_name>.js`
- **Template**:
```javascript
import { MioFunction } from '../../lib/function.js' // NOTE: 2 levels up for custom tools

export default class MyCustomTool extends MioFunction {
  constructor() {
    super({
      name: 'MyToolName',
      description: 'Concise description.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' }
        }
      },
      adminOnly: true
    })
    this.func = this.execute.bind(this)
  }

  async execute(e) {
    const { query } = e.body
    return { result: `Executed: ${query}` }
  }
}
```

---

---
## 🛠️ Master Workflow

1.  **Plan**: Determine if it's a Core plugin (`lib/plugins/`) or a Custom tool (`plugins/custom/`).
2.  **Setup**: For Core plugins, create the directory and `package.json` first.
3.  **Dependencies**: If needed, update `package.json` and run `pnpm install` from the **ROOT**.
4.  **Develop**: Implement `index.js` and add tools in `tools/`.
5.  **Hot Reload**: The system monitors changes and reloads automatically. Check logs for success.

---
*Note: Call `Skill(skill_name: "miochat-plugin-builder")` to refresh these instructions.*
