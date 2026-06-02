# Mio-Chat-Backend

<div align="center">

**企业级多协议 AI 对话平台与 Agent 操作系统**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.19.0-brightgreen.svg)](https://nodejs.org/)
[![Docker Hub](https://img.shields.io/badge/docker-ready-blue.svg)](https://hub.docker.com/r/miofcip/miochat)

[在线演示](https://ai.krumio.com) | [插件市场](https://github.com/Pretend-to/awesome-miochat-plugins) | [前端仓库](https://github.com/Pretend-to/mio-chat-frontend) | [QQ 交流群](https://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=-r56TCEUfe5KAZXx3p256B2_cxMhAznC&authKey=6%2F7fyXh3AxdOsYmqqfxBaoKszlQzKKvI%2FahbRBpdKklWWJsyHUI0iyB7MoHQJ%2BqJ&noverify=0&group_code=798543340)

</div>

---

## 📖 项目简介

Mio-Chat-Backend 是一个基于 Node.js 的高性能、模块化 AI 对话平台后端服务。它不仅是一个多协议 LLM 转发器，更是一个具备 **Agent 技能引擎**、**长时任务调度** 和 **多模态存储能力** 的 Agent 操作系统。

### 核心特性

- 🚀 **三位一体扩展架构** - 通过 **Skills (技能)**、**MCP (标准协议)** 与 **Plugins (业务插件)** 三种维度，赋予 Agent 无限的边界扩展能力。
- 🧬 **自演进插件引擎** - Agent 可调用内置工具**自主编写、测试并加载新插件**，实现功能的自我迭代与闭环进化。
- 🛠️ **全能 Agent 操作系统** - 
    - **Skills**: 专家级能力包（如 `miochat-plugin-builder`），让 Agent 掌握垂直领域知识。
    - **MCP**: 毫秒级接入标准生态工具（Node, UV, Docker），极速扩充工具箱。
    - **Plugins**: 高性能业务扩展，支持文件高保真编辑、系统配置热重载。
- 📅 **持久化任务调度** - 内置高性能任务引擎，支持 Agent 在后台自主执行长时、周期性或单次复杂任务。
- ⚡ **极致性能基座** - 升级 Prisma 7 无 Rust 引擎架构，配合 `better-sqlite3` 实现超轻量、毫秒级响应的本地化存储。

---

## 🔌 无限扩展体系

MioChat 提供了三种互补的方式让 Agent 与现实世界连接：

1.  **Skills (能力包)**：基于自然语言定义的专家能力，让 Agent 变身为架构师、运维专家或 UI 设计师。
2.  **MCP (Model Context Protocol)**：原生支持 Anthropic MCP 标准，通过标准协议一键接入外部海量工具集。
3.  **Plugins (原生插件)**：支持 Agent 利用内置的 `file-editor` 插件直接在 `/plugins` 目录下实时编写代码并热加载，实现功能的“自创”。

---

## 🚀 快速开始

### 1. 克隆与安装
```bash
git clone https://github.com/Pretend-to/mio-chat-backend.git
cd mio-chat-backend
pnpm install
```

### 2. 启动应用

项目支持多种启动模式，无论哪种方式，启动时均会**自动完成初始化**（生成 `.env`、配置数据库、生成 Prisma 客户端）。

- **开发模式**（推荐，支持热重载）：
  ```bash
  pnpm dev
  ```

- **生产模式（前台运行）**：
  ```bash
  node app.js
  ```

- **生产模式（后台运行）**：
  ```bash
  pnpm start
  ```
  > **PM2 说明**：后台运行依赖 [PM2](https://pm2.keymetrics.io/)。如果未安装，请执行：`npm install -g pm2`

启动后访问 `http://localhost:3000`，使用控制台打印的 `ADMIN_CODE` 登录。

---

## 📦 生产部署

### 1. 使用 Docker Compose (推荐)
```bash
docker compose up -d
```

### 2. 使用 PM2 后台运行
```bash
pnpm start
```
若需查看日志或管理进程：
```bash
pm2 logs
pm2 list
```

> **详细部署手册**：关于 Nginx 转发、SSL、Systemd 及更多环境配置，请查阅 **[生产部署指南](./docs/DEPLOYMENT.md)**。

---

## 🔌 插件与技能开发

MioChat 支持 **插件 (Plugin)** 和 **技能 (Skill)** 两种扩展模式。
- **AI 辅助开发**：咨询客户端内的 **“插件开发助手”**（集成 `miochat-plugin-builder` 技能）。
- **开发规范**：查阅 **[插件开发全攻略](lib/chat/llm/skills/miochat-plugin-builder/SKILL.md)**。

---

## 🏗️ 项目结构

```
mio-chat-backend/
├── app.js                    # 入口文件
├── lib/
│   ├── chat/llm/              # LLM 适配器 (OpenAI, Gemini, DeepSeek...)
│   ├── plugins/              # 系统内置核心插件
│   ├── database/             # 数据库模型与服务层
│   └── server/               # HTTP 与 Socket.IO 服务器
├── plugins/                  # 外部自定义插件 (推荐)
├── config/                   # 配置文件 (含 PM2, Nginx 示例)
├── presets/                  # 角色与系统预设
└── docs/                     # 详细文档
```

---

## 🤝 贡献与协议
欢迎提交 PR 贡献代码。本项目基于 **MIT License** 开源。
