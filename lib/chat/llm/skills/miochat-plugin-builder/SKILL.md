---
name: miochat-plugin-builder
description: Expert guide for building and deploying MioChat plugins. Supports both project-level plugins and hot-reloadable single-file custom tools.
version: 1.0.0
author: Mio-Chat
---

# MioChat Plugin Builder Guide

You are an expert in the MioChat plugin architecture. You can create new capabilities for yourself by writing and deploying plugins.

## Plugin Types

### 1. Single-File Custom Tools (Recommended for Quick Features)
These are standalone tools that are hot-reloaded automatically by the system.
- **Location**: `plugins/custom/<tool_name>.js`
- **Structure**: A single ES module exporting a class that extends `MioFunction`.

> [!IMPORTANT]
> **DO NOT override the `run(e)` method.** The base class `MioFunction` uses `run(e)` to perform security and permission checks. 
> To implement your tool logic, assign your method to `this.func` in the constructor or implement it as a separate method and bind it to `this.func`.

**Template:**
```javascript
import { MioFunction } from '../../lib/function.js'

export default class MyCustomTool extends MioFunction {
  constructor() {
    super({
      name: 'MyToolName',
      description: 'Describe what this tool does.',
      parameters: { /* ... */ },
      adminOnly: true // This will now work correctly!
    })
    // Point the executor to your logic method
    this.func = this.execute.bind(this)
  }

  async execute(e) {
    const { input } = e.params
    return { result: `Processed: ${input}` }
  }
}
```

### 2. Advanced File Editing (Surgical Mode)
When modifying existing files, **ALWAYS** prefer using the `file-editor-plugin` tools over full file writes. This is safer and more efficient.

- **`writeFile`**: Use this for creating NEW files or completely overwriting existing ones. It handles directory creation automatically.
- **`appendFile`**: Use this to quickly add content to the end of a file (e.g., adding imports or logging).
- **`replaceBlock`**: Use this for single, precise modifications. You must provide the exact original text.
- **`multiReplace`**: Use this for multiple changes in the same file (e.g., refactoring).
- **`insertAround`**: Use this to inject code before or after a specific line or pattern.

**Important Note on Tool Loading:**
MioChat uses an **auto-discovery** mechanism for tools. You do NOT need to manually register tools in a plugin's `index.js`. 
Simply create the tool file in the `tools/` directory of the plugin, and the system will automatically load it.

> [!TIP]
> If `replaceBlock` fails due to "Target not found", read the file again to ensure you have the exact indentation and whitespace.

### 3. Project-Level Plugins (For Complex Integrations)
Full plugins with their own directory, configuration, and multiple tools. Since we are in a **Monorepo**, project-level plugins can have their own dependencies and internal library structure.
- **Location**: `lib/plugins/<plugin-name>/`
- **Recommended Structure**:
  - `package.json`: Contains metadata and **unique dependencies**. The Monorepo manager (pnpm) will handle these.
  - `index.js`: Main plugin class (extends `Plugin`).
  - `lib/`: Recommended directory for shared utilities, services, or internal library files used by your tools.
  - `tools/`: Directory containing multiple `MioFunction` files.

**Example Structure:**
```text
lib/plugins/my-complex-plugin/
├── package.json        # Define custom dependencies here
├── index.js            # Plugin entry point
├── lib/
│   └── helper.js       # Internal library utilities
└── tools/
    └── advanced_tool.js # References files in ../lib/
```

**`index.js` Template (copy exactly):**
```javascript
import Plugin from '../../plugin.js'

export default class MyComplexPlugin extends Plugin {
  constructor() {
    super({ importMetaUrl: import.meta.url })
  }
}
```

> [!IMPORTANT]
> Always pass `{ importMetaUrl: import.meta.url }` to `super()`. This tells the base class where your plugin lives so it can auto-discover your `tools/` directory.
> You do NOT need to implement `getFilePath()` or `getInitialConfig()` — the base class handles this automatically.

## Hot Reloading
- **Single-File Tools**: Simply write the file to `plugins/custom/`. The system's file watcher will automatically detect and load it.
- **Project-Level**: After creating the files, you may need to trigger a global reload via the system API if not using watch mode.

## Development Workflow
1. **Define Intent**: Determine if you need a quick tool or a full plugin.
2. **Draft Code**: Use the templates above.
3. **Deploy**: Use `executeCommand` to create the directory structure and write the files.
4. **Install Dependencies**: If you added new dependencies to `package.json`, run `pnpm install` in the root directory to sync the monorepo.
5. **Verify**: Check if the tool appears in your available tools list or try calling it.

## Key Classes to Import
- `Plugin`: `../../lib/plugin.js`
- `MioFunction`: `../../lib/function.js` (from custom dir) or `../../../lib/function.js` (from project tools dir).

## Safety Note
Always validate input parameters and handle errors gracefully within the `run(e)` method.
