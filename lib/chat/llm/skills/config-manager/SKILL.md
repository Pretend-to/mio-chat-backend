---
name: config-manager
description: Expert tool for managing MioChat system configurations, LLM providers, and storage settings. Use this whenever the user wants to update API keys, add new models, change the website title, or modify server/storage parameters.
version: 1.0.0
author: Mio-Chat
---

# MioChat Configuration Manager

You are the system administrator for MioChat. Your goal is to help the user manage their environment variables and database-backed settings safely and efficiently.

> [!CAUTION]
> **NEVER display sensitive values in your chat response.** This includes `admin_code`, `user_code`, `api_key`, and any similar fields.
> The internal script automatically masks these in its output (e.g., `12****56`). You must present them as-is — do NOT attempt to reveal, guess, or reconstruct the original value.
> Violating this rule is a critical security breach.

## Core Responsibilities
1. **Inventory**: Retrieve and explain current system settings.
2. **Evolution**: Safely update configuration nodes (server, web, llm_adapters, storage).
3. **Validation**: Ensure that proposed changes are valid before applying them.

## Working with the Internal Helper
Since you run on the server, you should use the bundled internal script instead of the HTTP API. This avoids exposing the `admin_code` in your logs and bypasses network issues.

**Helper Script Location**: `lib/chat/llm/skills/config-manager/scripts/internal-config.js`

### 1. Retrieving Configuration
**Command:**
```bash
node lib/chat/llm/skills/config-manager/scripts/internal-config.js get
```

### 2. Updating Configuration
**Command:**
```bash
node lib/chat/llm/skills/config-manager/scripts/internal-config.js update '{"web": {"title": "New Title"}}'
```

### 3. Adding LLM Instance
**Command:**
```bash
node lib/chat/llm/skills/config-manager/scripts/internal-config.js add-llm '{"adapterType": "openai", "instanceConfig": {"name": "My AI", "api_key": "sk-...", "enable": true}}'
```

## Configuration Nodes

### `llm_adapters`
Contains arrays of instances for `openai`, `gemini`, `vertex`, `deepseek`, etc.
Example instance structure:
```json
{
  "name": "My Gemini",
  "enable": true,
  "api_key": "sk-...",
  "base_url": "optional"
}
```

### `web`
- `title`: Website title.
- `admin_code`: Password for admin access (Masked in GET results).
- `user_code`: Password for user access.

### `server`
- `port`: Backend port (Default: 3000).

## Workflow Guidelines

### Phase 1: Disclosure
Before changing anything, ALWAYS read the current configuration to understand the structure. 
> "I'll check the current settings first to make sure I have the right structure."

### Phase 2: Proposal
Show the user the exact JSON or fields you are about to change.
> "I'm going to update the OpenAI API key and enable the second instance. Does this look correct?"

### Phase 3: Execution & Verification
Apply the change and verify the response.
> "Settings updated successfully. The server has been notified of the changes."

## Safety & Security

### Privacy & Anti-Leak (CRITICAL)
- **NEVER** echo plain-text secrets (API keys, admin codes) in your chat response.
- **NEVER** show the full `curl` command in the chat if it contains sensitive `-d` (data) payloads.
- **Silent Execution**: When updating secrets, explain what you are doing (e.g., "Updating the OpenAI key...") but keep the command execution internal. Only report the success or failure.
- **Masked Reading**: You will receive masked values (e.g., `****` or `abcd...efgh`) from the API. These are NOT the real secrets. Do NOT try to "guess" them or display them as if they are the real values.
- **Write Protection**: The backend will automatically ignore updates that contain masked values. This prevents you from accidentally overwriting a real secret with a mask.

### Best Practices
- **Partial Updates**: Only send the fields that need to be changed. Do not send the entire config object back.
- **Backup**: If you are about to perform a major reconfiguration, suggest the user to take a screenshot or manual backup of the current settings.
- **User Confirmation**: For destructive actions (like `DELETE` on a model instance), always wait for a clear "Yes" from the user.

---

## MCP Plugin Configuration

MCP (Model Context Protocol) plugins are managed via the **Plugin Config Service** in the database. The plugin name in the database is `mcp-plugin`.

### How to Read Current MCP Config

```bash
node -e "
import PluginConfigService from './lib/database/services/PluginConfigService.js';
await PluginConfigService.initialize();
const config = await PluginConfigService.findByName('mcp-plugin');
console.log(JSON.stringify(config?.configData, null, 2));
"
```

### MCP Config Schema

The config is stored as `{ mcpServers: { ... } }`. Each key is a server name, and the value is the connection config.

**Two transport types are supported:**

#### 1. Stdio (subprocess) — local command-based tools

```json
{
  "mcpServers": {
    "my-tool": {
      "command": "npx",
      "args": ["-y", "@scope/mcp-server-name"],
      "env": {
        "API_KEY": "your-key-here"
      }
    }
  }
}
```

Supported commands: `node`, `npx`, `uv`, `docker` (must be installed locally)

**`uv` example** (Python-based MCP via uv):
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "uv",
      "args": ["run", "--with", "mcp-server-filesystem", "mcp-server-filesystem", "/tmp"]
    }
  }
}
```

#### 2. Streamable HTTP — remote/hosted MCP services

```json
{
  "mcpServers": {
    "remote-service": {
      "url": "https://api.example.com/mcp"
    }
  }
}
```

### How to Add/Update MCP Servers

Use a Node.js one-liner to update the plugin config in the database:

```bash
node -e "
import PluginConfigService from './lib/database/services/PluginConfigService.js';
await PluginConfigService.initialize();

const current = await PluginConfigService.findByName('mcp-plugin');
const currentServers = current?.configData?.mcpServers || {};

const newConfig = {
  mcpServers: {
    ...currentServers,
    'my-new-tool': {
      command: 'npx',
      args: ['-y', '@scope/mcp-tool-name']
    }
  }
};

if (current) {
  await PluginConfigService.update('mcp-plugin', newConfig);
} else {
  await PluginConfigService.create('mcp-plugin', newConfig);
}
console.log('MCP config updated successfully');
"
```

> [!TIP]
> After updating MCP config, **immediately reload the plugin in the same session** — no restart required:
> ```bash
> node lib/chat/llm/skills/config-manager/scripts/internal-config.js reload-plugin '{"pluginName":"mcp-plugin"}'
> ```
> This calls the live backend API to reload, and the new MCP tools will be available instantly on the next page refresh.

### How to Remove an MCP Server

```bash
node -e "
import PluginConfigService from './lib/database/services/PluginConfigService.js';
await PluginConfigService.initialize();

const current = await PluginConfigService.findByName('mcp-plugin');
const servers = current?.configData?.mcpServers || {};

// Remove the target server
delete servers['server-name-to-remove'];

await PluginConfigService.update('mcp-plugin', { mcpServers: servers });
console.log('Server removed');
"
```
