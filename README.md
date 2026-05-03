# Mio-Chat-Backend

<div align="center">

**企业级多协议 AI 对话平台与 Agent 操作系统**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Docker Hub](https://img.shields.io/badge/docker-ready-blue.svg)](https://hub.docker.com/r/miofcip/miochat)

[在线演示](https://ai.krumio.com) | [插件市场](https://github.com/Pretend-to/awesome-miochat-plugins) | [前端仓库](https://github.com/Pretend-to/mio-chat-frontend) | [QQ 交流群](https://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=-r56TCEUfe5KAZXx3p256B2_cxMhAznC&authKey=6%2F7fyXh3AxdOsYmqqfxBaoKszlQzKKvI%2FahbRBpdKklWWJsyHUI0iyB7MoHQJ%2BqJ&noverify=0&group_code=798543340)

</div>

---

## 📖 项目简介

Mio-Chat-Backend 是一个基于 Node.js 的高性能、模块化 AI 对话平台后端服务。它不仅是一个多协议 LLM 转发器，更是一个具备 **Agent 技能引擎**、**长时任务调度** 和 **多模态存储能力** 的 Agent 操作系统。

### 核心特性

- 🚀 **多协议适配器架构** - 统一抽象层支持 OpenAI, DeepSeek (含 Reasoning 深度思考控制), Gemini, Claude 等主流大模型。
- 🧬 **Agent Skills 系统** - 插件化的技能包，赋予 Agent 专业领域的垂直能力（如代码架构、UI 设计、系统运维）。
- 🔌 **热插拔插件架构 3.0** - 支持内置 (`lib/plugins/`) 与项目级 (`/plugins/`) 插件，支持运行时配置热重载。
- 📅 **自动化任务引擎** - 内置 Cron 表达式调度器，支持 Agent 在后台自主执行周期性或一次性复杂任务。
- 🌐 **MCP 原生集成** - 智能加载与环境自测（Node, UV, Docker），极速扩展 Agent 的工具箱。
- ☁️ **企业级存储抽象** - 统一存储 API，支持本地与 S3 兼容协议，具备智能 MIME 识别预览功能。
- ⚡ **实时状态同步** - 基于 Socket.IO 的全双工通信，支持流式响应、任务进度、插件状态的实时广播。
- 🛠️ **自演进配置管理** - 赋予 Agent 自行管理适配器、MCP 服务器及系统全局参数的能力。
- 🛡️ **生产级安全性** - 敏感配置自动脱敏，终端指令权限校验，完善的操作审计日志。

---

## 🚀 快速开始

### 1. 克隆与安装
```bash
git clone https://github.com/Pretend-to/mio-chat-backend.git
cd mio-chat-backend
pnpm install
```

### 2. 初始化环境
```bash
pnpm run init
```
该指令会自动生成数据库客户端、初始化 SQLite 并在 `.env` 中生成管理员访问码。

### 3. 启动应用
```bash
pnpm run dev
```
启动后访问 `http://localhost:3000`，使用 `.env` 中的 `ADMIN_CODE` 登录。

---

## 📦 生产部署

### 1. 使用 Docker Compose (推荐)
```bash
cp .env.example .env
docker compose up -d
```

### 2. 使用 PM2
```bash
pm2 start config/pm2.json
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
