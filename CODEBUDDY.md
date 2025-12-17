# Mio-Chat Backend - CodeBuddy Guide

## Development Commands

### Starting the Application
```bash
# Development (foreground)
node app

# Production (PM2 background)
npm run start

# Test
npm run test
```

### Code Quality
```bash
# Format code
npm run format

# Lint (oxlint configured)
pnpm run lint
```

### Package Management
- Uses `pnpm` as package manager
- Workspace configuration with plugins in `plugins/*`

## Architecture Overview

### Core Structure
- **Entry Point**: `app.js` - Minimal bootstrap that runs status checks and starts the server
- **Main Server**: `lib/server/` - Contains HTTP and Socket.IO server implementations
- **Configuration**: `lib/config.js` - Centralized config management using YAML files
- **Plugin System**: Two-tier plugin architecture:
  - Built-in plugins: `lib/plugins/` (mcp-plugin, web-plugin)
  - Custom plugins: `plugins/` (workspace packages)

### Key Components
- **Chat Engine**: `lib/chat/` - Core chat functionality and AI model integration
- **Middleware**: `lib/middleware.js` - Express middleware and request handling
- **Plugin Manager**: `lib/plugin.js` - Plugin loading and lifecycle management
- **Utilities**: `lib/function.js` - Shared utility functions

### Configuration System
- All configuration: SQLite database (`data/app.db`)
- Configuration management: Web UI or API endpoints
- Database schema: `prisma/schema.prisma`
- Presets: `presets/` directory
- Vertex AI auth: `config/config/vertex.json`

### Supported Protocols
- **OpenAI API**: Standard ChatGPT-compatible endpoints
- **Gemini API**: Google's Gemini models (AI Studio + Vertex AI)
- **OneBot v11**: QQ bot protocol for chat integration
- **MCP (Model Context Protocol)**: Plugin extensibility

### Plugin Development
- Plugins are npm packages in the workspace
- Built-in plugins provide web scraping and MCP integration
- Custom plugins go in `plugins/custom/`
- Plugin configuration via YAML files in `config/plugins/`

### Technology Stack
- **Runtime**: Node.js with ES modules
- **Web Framework**: Express.js
- **Real-time**: Socket.IO
- **Process Management**: PM2
- **AI Integration**: OpenAI SDK, Google Auth Library
- **File Processing**: Puppeteer, multer, officeparser

## Important Notes
- Project uses ES modules (`"type": "module"`)
- Configuration files must be copied from `.example` versions
- Supports multimodal conversations (text + images)
- Real-time communication via Socket.IO
- Plugin system supports hot-plugging