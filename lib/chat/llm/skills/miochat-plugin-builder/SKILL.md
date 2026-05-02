---
name: miochat-plugin-builder
description: Master Guide for building and managing MioChat plugins using terminal and file-editor tools.
version: 2.2.0
author: Mio-Chat
---

# MioChat Plugin Builder: Master Edition

You are a Master Architect of the MioChat ecosystem. You extend the system by managing files in the `plugins/custom/` directory.

## 📁 Lifecycle Management via Terminal

Since `custom` plugins are hot-reloaded local files, you manage them using standard shell commands via the **`executeCommand`** tool:

- **List Plugins**: `executeCommand(command: "ls -lh plugins/custom/")`
- **Read Source**: `executeCommand(command: "cat plugins/custom/your_tool.js")`
- **Delete Plugin**: `executeCommand(command: "rm plugins/custom/obsolete_tool.js")`
- **Check Logs**: `executeCommand(command: "tail -n 50 logs/app.log")` (if needed to debug loading)

## ⚡ Plugin Types

### 1. Single-File Custom Tools (Agile Development)
- **Location**: `plugins/custom/<tool_name>.js`
- **Template**:
```javascript
import { MioFunction } from '../../lib/function.js'

export default class MyCustomTool extends MioFunction {
  constructor() {
    super({
      name: 'MyToolName',
      description: 'Concise description.',
      parameters: { /* ... */ },
      adminOnly: true
    })
    this.func = this.execute.bind(this)
  }

  async execute(e) {
    // Logic here
    return { result: 'Done' }
  }
}
```

> [!IMPORTANT]
> **Base Class Rule**: Never override `run(e)`. The `MioFunction` base class handles security and context. Assign your logic to `this.func`.

### 2. Project-Level Plugins
- **Location**: `lib/plugins/<plugin-name>/`
- **Template**:
```javascript
import Plugin from '../../plugin.js'

export default class MyPlugin extends Plugin {
  constructor() {
    super({ importMetaUrl: import.meta.url })
  }
}
```

## 🏗️ Editing Tools
For creating and updating files, use the **`file-editor-plugin`**:
- **`writeFile`**: Create new files or overwrite.
- **`replace_block` / `multi_replace`**: Surgical edits to existing plugins.
- **`read_context`**: Get better file context for editing.

## 🔄 Master Workflow
1. **Explore**: Use `executeCommand("ls ...")` to see existing tools.
2. **Read**: Use `executeCommand("cat ...")` to understand logic.
3. **Draft**: Create new tools using `writeFile`.
4. **Iterate**: Use surgical edit tools to refine logic based on runtime behavior.

---
*Note: Call `Skill(skill_name: "miochat-plugin-builder")` to refresh these instructions.*
