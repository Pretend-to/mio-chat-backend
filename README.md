# Mio-Chat Agent OS 🚀

<div align="center">

<img src="https://s3.krumio.com/file/web/eadf69/miochat-logo.gif" width="600" alt="Mio-Chat Logo" />

**不仅仅是对话转发，更是下一代 Agent 操作系统**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.19.0-brightgreen.svg)](https://nodejs.org/)
[![Docker Hub](https://img.shields.io/badge/docker-ready-blue.svg)](https://hub.docker.com/r/miofcip/miochat)
[![Architecture](https://img.shields.io/badge/architecture-V3_Hooks-red.svg)](#-核心架构-hooks-机制)

[在线演示](https://ai.krumio.com) | [文档中心](./docs/README.md) | [QQ 交流群](https://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=-r56TCEUfe5KAZXx3p256B2_cxMhAznC&authKey=6%2F7fyXh3AxdOsYmqqfxBaoKszlQzKKvI%2FahbRBpdKklWWJsyHUI0iyB7MoHQJ%2BqJ&noverify=0&group_code=798543340)

### 📦 Mio-Chat 生态全家桶

[🖥️ Mio-Chat Frontend](https://github.com/Pretend-to/mio-chat-frontend) | [🎨 Mio-Previewer (MD 渲染器)](https://github.com/Pretend-to/mio-previewer) | [🔌 插件市场](https://github.com/Pretend-to/awesome-miochat-plugins)

</div>

</div>

---

## 🌐 生态全景 (Ecosystem)

Mio-Chat 是一个由多个模块构成的完整 Agent 生态系统：

| 模块 | 仓库地址 | 说明 |
| :--- | :--- | :--- |
| **Backend** | [Pretend-to/mio-chat-backend](https://github.com/Pretend-to/mio-chat-backend) | **(当前仓库)** 核心运行环境、Hook 架构、插件系统 |
| **Frontend** | [Pretend-to/mio-chat-frontend](https://github.com/Pretend-to/mio-chat-frontend) | 基于 Vue3 + Element Plus 的沉浸式 Agent 交互界面 |
| **Renderer** | [Pretend-to/mio-markdown](https://github.com/Pretend-to/mio-markdown) | 专为 AI 深度定制的 Markdown 渲染引擎，支持 Artifacts |
| **Plugins** | [Pretend-to/awesome-miochat-plugins](https://github.com/Pretend-to/awesome-miochat-plugins) | 官方及社区维护的插件、Skill、Hook 集合仓库 |


---

## 🌟 为什么选择 Mio-Chat?

传统的 AI 对话平台只是“API 搬运工”。**Mio-Chat** 是为复杂生产环境设计的 **Agent 操作系统**。它通过精密的上下文管理、双向安全桥接和强大的 Hook 拦截机制，让 AI 能够真正地、自主地、可控地操作物理世界。

### 🚀 核心黑科技

*   **🧠 上下文压缩系统 (Context Compression)**: 独创无状态上下文压缩算法。通过 XML 结构化分区，在保留 100% 关键工程约束的前提下，将 Token 消耗降低 80% 以上，并极限命中 Prompt Cache。
*   **🪝 全局 Hooks 架构 (V3)**: 仿 Webpack/Koa 的插件化设计。鉴权、审计、过滤、篡改，万物皆可 Hook。支持在不修改核心代码的情况下，动态干预 Agent 的行为逻辑。
*   **⚡ 三层插件体系**: 原生支持 **Skills (专家包)**、**MCP (标准协议)**、**Native Plugins (运行时热重载)**。Agent 甚至可以自写代码插件并即时加载运行。
*   **🖥️ 真实环境桥接 (OS Bridge)**: 内置 `node-pty` 真实伪终端和 Puppeteer 视觉自动化。AI 能像人类一样使用 Bash、编译代码、浏览网页。
*   **📂 预设双源机制**: 物理隔离静态 JSON 预设与用户自定义预设。支持代码即配置，插件自带的预设自动生效，无需写库。

---

## 🏗️ 核心架构：Hooks 机制

Mio-Chat V3 采用了 **AOP (面向切面编程)** 的设计理念。通过一系列生命周期钩子，你可以精准控制 Agent 的每一步操作：

| 挂载点 | 作用 | 典型应用场景 |
| :--- | :--- | :--- |
| `LLM_BEFORE_CHAT` | 对话拦截 | 敏感词过滤、余额预扣费、Context 注入 |
| `TOOL_BEFORE_LOAD` | 加载审计 | 校验工具名称安全性、防止插件冲突 |
| `TOOL_BEFORE_EXECUTE` | 执行干预 | 权限动态校验 (RBAC)、参数自动修复 |
| `LLM_AFTER_CHAT` | 结果审计 | Token 用量落库、响应内容脱敏 |
| `TOOL_NOT_FOUND` | 智能纠错 | 剥离 MD5 后缀自动寻址、用户引导提示 |

> 详情参考：[📖 Hooks 开发指南](./docs/core/hooks.md)

---

## 📖 文档中心索引

| 分类 | 内容大纲 |
| :--- | :--- |
| **🚀 快速开始** | [Docker 部署](./docs/deployment/DOCKER.md) \| [PM2 部署](./docs/deployment/DEPLOYMENT.md) \| [配置指南](./docs/api/config-api.md) |
| **🧠 核心机制** | [上下文压缩原理](./docs/core/memory-crystallization.md) \| [Hooks 拦截机制](./docs/core/hooks.md) \| [Socket 协议](./docs/api/socket_protocol_zod.ts) |
| **🛠️ 开发指南** | [插件开发手册](./docs/plugins/PLUGIN_DEVELOPMENT_GUIDE.md) \| [Skill 编写规范](./lib/chat/llm/skills/miochat-plugin-builder/SKILL.md) \| [Adapter 模板](./docs/adapters/ADAPTER_TEMPLATE.js) |
| **🗄️ 归档资料** | [架构迁移历史](./docs/archive/MIGRATION.md) \| [常见问题 Q&A](./docs/archive/FULL_PROJECT_QA.md) |

---

## 🚀 极速启动 (Docker)

```bash
# 1. 启动容器
docker compose up -d

# 2. 查看日志
docker compose logs -f
```

---

## 🤝 参与贡献

我们欢迎任何形式的贡献。Mio-Chat 的演进由社区驱动：
1.  **贡献 Plugin**: 赋予 Agent 操作新领域工具的能力。
2.  **贡献 Skill**: 沉淀特定领域的专家经验指南。
3.  **贡献 Hook**: 完善系统的防御与审计体系。

---

**© 2024 Mio-Chat Team. Based on MIT License.**
