# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Installation & Setup
```bash
pnpm install
# 配置已迁移到数据库，首次启动会自动初始化
# 后续配置请通过Web界面管理
```

### Running the Application
- **Development mode**: `node app.js` - Runs in foreground with real-time logs
- **Production mode**: `pnpm start` - Runs PM2 cluster using config/pm2.json
- **Format code**: `pnpm run format` - Uses Prettier
- **Lint**: `pnpm run lint` - Uses oxlint for fast linting

### Testing & Validation
```bash
# Check service health
curl http://localhost:3000/api/health

# PM2 process management
pm2 list
pm2 logs mio-chat-backend
```

## Architecture Overview

### Project Structure
Mio-Chat is an enterprise-grade, multi-protocol AI chat platform backend:

```
lib/
├── check.js              # Startup checks & global.middleware initialization
├── middleware.js         # Core service orchestration (central singleton)
├── config.js             # Configuration loading and validation
├── plugin.js             # Plugin loader system
├── chat/
│   ├── llm/              # LLM adapter implementations (OpenAI, Gemini, Vertex)
│   └── onebot/           # OneBot protocol (QQ bot) implementation
├── plugins/              # Built-in plugins (MCP client, Web parser)
└── server/
    ├── http/             # Express HTTP server & API routes
    └── socket.io/        # Socket.IO real-time communication
```

### Core Concepts

**global.middleware Singleton**: Created in `lib/check.js`, this global object orchestrates all core services:
- Socket.IO server
- LLM adapter pool (multiple instances per provider)
- OneBot client
- Plugin registry

**Adapter Pattern**: LLM providers implement a unified interface. New adapters go in `lib/chat/llm/<provider>/index.js`.

**Plugin System**: Two-tier loading:
- Built-in: `lib/plugins/` (core functionality)
- External: `plugins/` (third-party, pnpm workspaces)

**Configuration Management**: YAML-based with hot-reload support. Environment variables override config values.

### API Structure

**REST Endpoints**:
- `/api/gateway` - Gateway information
- `/api/base_info` - Basic server info
- `/api/config*` - Configuration management (admin-only)
- `/api/plugins*` - Plugin management (admin-only)
- `/api/openai/:type` - OpenAI resources
- `/api/upload/*` - File uploads
- `/f/:type/:name` - File serving
- `/s/:id` - Share link redirects

**Socket.IO Events**:
- Client→Server: `llm` (chat messages), `onebot` (QQ messages)
- Server→Client: `llm_stream` (streaming responses), `llm_done`, `onebot_message`

## Configuration

Key config sections in `config/config/config.yaml`:

- `llm_adapters` - Multi-instance LLM provider configurations
- `onebot` - QQ bot settings
- `server` - Port, host, rate limiting
- `web` - Access codes, UI settings

Each LLM adapter type (openai, gemini, vertex) supports multiple instances with separate configurations.

## Plugin Development

### Simple Plugin (extends MioFunction):
```javascript
// plugins/custom/hello.js
import { MioFunction } from '../../lib/function.js'

export default class HelloFunction extends MioFunction {
  constructor() {
    super({
      name: 'say_hello',
      description: 'Greet the user',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name']
      }
    })
    this.func = this.sayHello
  }

  async sayHello(e) {
    return `Hello, ${e.params.name}!`
  }
}
```

### Advanced Plugin (with initialize):
```javascript
// plugins/my-plugin/index.js
export default class MyPlugin {
  async initialize(middleware) {
    this.middleware = middleware
    // Access to all core services
  }

  getTools() {
    return [/* tool definitions */]
  }

  singleTools = {
    tool_name: async (args) => {
      // Implementation
    }
  }
}
```

## Important Patterns

1. **ES Modules**: Use `import`/`export` syntax (type: "module" in package.json)
2. **Dynamic Imports**: Plugins and adapters use `pathToFileURL` + `await import`
3. **Logging**: Use `utils/logger.js` as `logger.info/warn/error/mark/json`
4. **Error Handling**: Many modules may call `process.exit(1)` if config is invalid
5. **Hot Reload**: Both adapters and plugins support runtime hot-reload via file watchers
6. **Rate Limiting**: Applied globally except for 127.0.0.1

## Key Files to Reference

- `app.js` - Application entry point
- `lib/check.js` - Startup sequence and global.middleware creation
- `lib/middleware.js` - Core service orchestration
- `lib/server/http/index.js` - HTTP routes and middleware
- `lib/server/socket.io/index.js` - Socket.IO event handlers
- `lib/chat/llm/openai/index.js` - Example LLM adapter implementation
- `prisma/schema.prisma` - Database schema and configuration structure