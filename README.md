# Mio-Chat Agent OS 🚀

<div align="center">

<img src="https://s3.krumio.com/file/web/eadf69/miochat-logo.gif" width="600" alt="Mio-Chat Logo" />

**不仅仅是对话转发，更是下一代 Agent 操作系统**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.19.0-brightgreen.svg)](https://nodejs.org/)
[![PM2 Ready](https://img.shields.io/badge/pm2-ready-brightgreen.svg)](#-极速启动-pm2)
[![Architecture](https://img.shields.io/badge/architecture-V3_Hooks-red.svg)](#-核心架构-hooks-机制)

[在线演示](https://ai.krumio.com) | [文档中心](./docs/README.md) | [QQ 交流群](https://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=-r56TCEUfe5KAZXx3p256B2_cxMhAznC&authKey=6%2F7fyXh3AxdOsYmqqfxBaoKszlQzKKvI%2FahbRBpdKklWWJsyHUI0iyB7MoHQJ%2BqJ&noverify=0&group_code=798543340)

### 📦 Mio-Chat 生态全家桶

[🖥️ Mio-Chat Frontend](https://github.com/Pretend-to/mio-chat-frontend) | [🎨 Mio-Previewer (MD 渲染器)](https://github.com/Pretend-to/mio-previewer) | [🔌 插件市场](https://github.com/Pretend-to/awesome-miochat-plugins)

</div>

---

## 🌐 生态全景

Mio-Chat 是一个由多个模块构成的完整 Agent 生态系统：

| 模块 | 仓库地址 | 说明 |
| :--- | :--- | :--- |
| **Backend** | [Pretend-to/mio-chat-backend](https://github.com/Pretend-to/mio-chat-backend) | **(当前仓库)** 核心运行环境、Hook 架构、插件系统 |
| **Frontend** | [Pretend-to/mio-chat-frontend](https://github.com/Pretend-to/mio-chat-frontend) | 基于 Vue3 + Element Plus 的沉浸式 Agent 交互界面 |
| **Renderer** | [Pretend-to/mio-markdown](https://github.com/Pretend-to/mio-markdown) | 专为 AI 深度定制的 Markdown 渲染引擎，支持 Artifacts |
| **Plugins** | [Pretend-to/awesome-miochat-plugins](https://github.com/Pretend-to/awesome-miochat-plugins) | 官方及社区维护的插件、Skill、Hook 集合仓库 |

---

## 🌟 为什么选择 Mio-Chat?

传统的 AI 对话平台仅仅是简单的“API 搬运工”。**Mio-Chat** 是专为复杂生产环境设计的 **Agent 操作系统**。它通过精密的上下文管理、双向安全授权、Multi-Agent 多智能体协同和面向切面的 Hook 拦截机制，让 AI 能够真正地、自主地、安全可控地操作物理世界。

---

## 🚀 核心硬核特性

### 1. 👥 Multi-Agent 群聊与多智能体协同
打破单 Agent 孤岛，实现异构 LLM 与多元人格的集群智慧。
- **多 Agent 混合群组**：支持在同一个群聊中加入多个不同 Channel 驱动的 Agent 本尊。
- **智能路由与轮询讨论**：支持 @指定 Agent 响应或多 Agent 顺序/条件触发讨论，实现复杂工程问题下的多视角交叉审核与协作。

<!-- 📸 截图位置 1：Multi-Agent 群聊讨论界面 -->
<!-- <p align="center"><img src="./docs/assets/readme_multi_agent_group.png" width="800" alt="Multi-Agent 群聊讨论示意图" /></p> -->

---

### 2. 🧠 无状态记忆结晶与前缀缓存引擎
解决长对话 Token 暴增与上下文溢出的行业痛点。
- **5 大 XML 结构化分区**：将用户画像、短期目标、当前计划、工程结构增量与全局约束规范化隔离。
- **无状态结晶与前缀缓存**：动态判定 Token 水位线，扫描对话轮次边界，自动将冗余历史提炼为只读 Memory Fragment，极限命中 Gemini / Claude 的 Prompt Cache，降低 80%+ Token 开销，首字延迟缩短至毫秒级。

<!-- 📸 截图位置 2：记忆结晶 / 压缩状态界面 -->
<!-- <p align="center"><img src="./docs/assets/readme_crystallization.png" width="800" alt="记忆结晶与上下文压缩示意图" /></p> -->

---

### 3. 🪝 面向切面 Hook 拦截与交互挂起系统
解决 AI 自主执行危险工具（如 Shell 命令、文件删除、公网发布）时的安全失控难题。
- **面向切面挂载**：在 LLM 推理与 ReAct 工具循环的生命周期中暴露核心拦截切面。
- **Deferred Promise 异步挂起**：判定为敏感操作时，后端创建 Deferred Promise 暂停 ReAct 循环，并通过 WebSocket 向前端推送二次确认卡片；待管理员点击放行后，唤醒 Promise 继续推进流程。

<!-- 📸 截图位置 3：敏感工具二次确认卡片 -->
<!-- <p align="center"><img src="./docs/assets/readme_tool_suspend.png" width="800" alt="敏感工具二次确认与授权挂起卡片" /></p> -->

---

### 4. ⏰ 自动化巡检与任务管理
赋予 Agent 离线自治与可视化巡检能力。
- **灵活调度**：支持标准 Cron 表达式、相对时间与单次触发。
- **可视化面板与安全沙盒**：前端提供专用的 Task 管理面板，可直观查看执行日志与手动唤醒；后端支持设置任务专属 Prompt 与 shell 命令白名单，防止 Agent 陷入无意义的用户交互等待。

<!-- 📸 截图位置 4：定时任务与后台 Agent 巡检界面 -->
<!-- <p align="center"><img src="./docs/assets/readme_cron_task.png" width="800" alt="定时任务与后台 Agent 巡检界面" /></p> -->

---

### 5. ⚡ 三层插件体系与工具自纠错
兼顾专家经验、跨语言标准与高性能运行时工具。
- **三层可插拔生态**：原生支持 Skills 专家经验指南、MCP 协议与 Native Plugins 运行时热重载插件。
- **Zod 参数拦截与 AI 自纠错**：工具参数通过 Zod Schema 进行严格校验。当 LLM 传递非法参数时，系统自动捕捉报错并喂回大模型，触发 LLM 零人工干预自动修正参数。

---

### 6. 🎨 沉浸式 Artifacts 渲染与可视化工具管理
- **Artifacts 画板交互**：结合 `mio-previewer`，实现代码、HTML 网页、SVG 矢量图、Mermaid 流程图及动态 UI 组件的独立画板预览与分屏交互。
- **Tools Manager 动态调配**：前端支持在会话中实时感知与开关指定的工具或插件组，随心所欲调配 Agent 技能库。

---

## 🏗️ 核心架构：Hooks 机制

Mio-Chat V3 采用了面向切面编程的设计理念。通过一系列生命周期钩子，你可以精准控制 Agent 的每一步操作：

| 挂载点 | 作用 | 典型应用场景 |
| :--- | :--- | :--- |
| `LLM_BEFORE_CHAT` | 对话拦截 | 敏感词过滤、余额预扣费、Context 注入 |
| `TOOL_BEFORE_LOAD` | 加载审计 | 校验工具名称安全性、防止插件冲突 |
| `TOOL_BEFORE_EXECUTE` | 执行干预 | 权限动态校验 (RBAC)、参数自动修复、挂起拦截 |
| `LLM_AFTER_CHAT` | 结果审计 | Token 用量落库、响应内容脱敏 |
| `LLM_TOOL_RESULTS` | 工具调用审计 | 批量工具执行完成后记录工具参数与出参详情 |
| `TOOL_NOT_FOUND` | 智能纠错 | 剥离 MD5 后缀自动寻址、用户引导提示 |

> 详情参考：[📖 Hooks 开发指南](./docs/core/hooks.md)

---

## 📖 文档中心索引

| 分类 | 内容大纲 |
| :--- | :--- |
| **🚀 快速开始** | [PM2 部署](./docs/deployment/DEPLOYMENT.md) \| [Docker 部署](./docs/deployment/DOCKER.md) \| [配置指南](./docs/api/config-api.md) |
| **🧠 核心机制** | [上下文压缩原理](./docs/core/memory-crystallization.md) \| [Hooks 拦截机制](./docs/core/hooks.md) \| [Socket 协议](./docs/api/socket_protocol_zod.ts) |
| **🛠️ 开发指南** | [插件开发手册](./docs/plugins/PLUGIN_DEVELOPMENT_GUIDE.md) \| [Skill 编写规范](./lib/chat/llm/skills/miochat-plugin-builder/SKILL.md) \| [Adapter 模板](./docs/adapters/ADAPTER_TEMPLATE.js) |
| **🗄️ 归档资料** | [架构迁移历史](./docs/archive/MIGRATION.md) \| [常见问题 Q&A](./docs/archive/FULL_PROJECT_QA.md) |

---

## 🚀 极速启动 (PM2)

```bash
# 1. 深度 1 极速克隆仓库
git clone --depth 1 https://github.com/Pretend-to/mio-chat-backend.git
cd mio-chat-backend

# 2. 一键安装依赖 (自动生成数据库 Client)
pnpm install

# 3. PM2 极速启动服务
pnpm start

# 4. 查看服务实时日志
pm2 logs mio-chat-backend
```

---

## 🤝 参与贡献

我们欢迎任何形式的贡献。Mio-Chat 的演进由社区驱动：
1.  **贡献 Plugin**: 赋予 Agent 操作新领域工具的能力。
2.  **贡献 Skill**: 沉淀特定领域的专家经验指南。
3.  **贡献 Hook**: 完善系统的防御与审计体系。

---

**© 2024 Mio-Chat Team. Based on MIT License.**
