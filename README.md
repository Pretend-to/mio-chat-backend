# Mio-Chat-Backend

<div align="center">

**企业级多协议 AI 对话平台与 Agent 操作系统**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.19.0-brightgreen.svg)](https://nodejs.org/)
[![Docker Hub](https://img.shields.io/badge/docker-ready-blue.svg)](https://hub.docker.com/r/miofcip/miochat)
[![Package Manager](https://img.shields.io/badge/pnpm-%3E%3D9.0.0-orange.svg)](https://pnpm.io/)

[在线演示](https://ai.krumio.com) | [插件市场](https://github.com/Pretend-to/awesome-miochat-plugins) | [前端仓库](https://github.com/Pretend-to/mio-chat-frontend) | [QQ 交流群](https://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=-r56TCEUfe5KAZXx3p256B2_cxMhAznC&authKey=6%2F7fyXh3AxdOsYmqqfxBaoKszlQzKKvI%2FahbRBpdKklWWJsyHUI0iyB7MoHQJ%2BqJ&noverify=0&group_code=798543340)

</div>

---

## 📖 项目定位：从“对话转发”到“Agent 操作系统”

传统的 AI 对话平台往往只扮演“大模型 API 转发者”的角色，难以解决大模型与复杂实体物理环境（代码、系统、文件）直接交互的痛点。

**Mio-Chat** 致力于打破这一篱藩。它是基于 Node.js 构建的 **Agent 操作系统 (Agent OS)**。通过对大模型上下文的精密管理、三位一体的扩展机制、全异步的自治任务循环，以及对真实操作系统环境的安全桥接，Mio-Chat 赋予 Agent 自主规划、自写代码、动态载入插件、以及在后台不间断自主解决极度复杂工程问题的完备能力。

---

## 🧬 Core Agent OS 架构设计

Mio-Chat 后端的核心价值在于其高度解耦、强工程落地的 Agent 架构体系。

```
                  ┌──────────────────────────────────────────────┐
                  │          Mio-Chat Agent OS Runtime           │
                  └──────────────────────┬───────────────────────┘
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
     ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
     │ 🧠 记忆结晶系统 (CMS) │ │ ⚙️ 三层扩展架构体系  │ │ 🔁 异步自治调度引擎   │
     │  Crystallization      │ │  Skills/MCP/Plugins   │ │  TaskRunnerService    │
     └───────────┬───────────┘ └───────────┬───────────┘ └───────────┬───────────┘
                 │                         │                         │
                 │ 1. 扫描轮次边界          │ 1. Skills: 动态注册     │ 1. 注入 [AUTONOMOUS]
                 │ 2. XML 结构提炼         │ 2. MCP: 跨语言工具       │    自治指令围栏
                 │ 3. 命中 Prompt Cache    │ 3. Plugins: 代码热插拔   │ 2. 虚拟客户端桥接 
                 ▼                         ▼                         ▼    Socket.IO 流式日志
     ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
     │ 极致上下文与事实压缩  │ │ 自演进工具箱与专家库  │ │ 长时后台无干预自治链  │
     └───────────────────────┘ └───────────────────────┘ └───────────────────────┘
                                         │
                                         ▼
                     ┌───────────────────────────────────────┐
                     │     🖥️ 实体物理操作系统桥接层 (OS Bridge)    │
                     │  PTY Sandbox (终端) / Puppeteer (视觉) │
                     └───────────────────────────────────────┘
```

### 1. 🧠 无状态上下文“雪球”记忆结晶系统 (Memory Crystallization)
大模型在超长对话中经常会面临两个痛点：**Token 消耗呈指数级增长**，以及**长上下文导致的指令偏移和约束丢失**。
Mio-Chat 独创了 **无状态记忆结晶技术 (`CrystallizationService`)**：
*   **轮次边界识别**：采用反向扫描算法定位完整的“前端对话轮次（Frontend Turn）”，确保在截断时绝不切断正在进行中的 `tool_calls` 和 `tool` 结果消息链，维护上下文的结构严整。
*   **XML 结构化分区**：将会话的远期历史通过独立内部 Event 异步调用压缩大模型，并智能提炼为 5 个高内聚的 XML 分区：
    *   `<long_term_profile>`：记录用户的技术栈偏好和稳定个人习惯（采用 **保守保留** 策略）。
    *   `<short_term_goals>`：记录本次对话明确的任务期望（采用 **激退出清** 策略，已完成自动移出）。
    *   `<current_plan>`：执行中的阶段性任务与待办步骤（完成的任务自动归纳为一句「已完成」描述）。
    *   `<file_architecture_delta>`：会话涉及到的关键文件拓扑与功能摘要。
    *   `<constraints>`：开发所必须遵守的硬性技术限制（具备 **高维记忆退化** 策略，连续 3 次压缩未提及自动移除）。
*   **Prompt Cache 极限优化**：结晶后的 XML 记忆块包裹在 `<memory_crystal>` 标签中置于新消息链的头部作为 System Prompt 语境，尾部合并最近完整的原始轮次。此方案完美命中大模型的 `Prompt Cache`（提示词缓存），将海量长对话压缩至几百 Token 的同时，保证 Agent 拥有零衰减的工程约束感知和长期记忆。

### 2. ⚙️ 三位一体扩展架构：Skills + MCP + Plugins
Agent 需要高自由度的工具和针对特定场景的“专家经验指南”。Mio-Chat 提供了三层扩展底座：
*   **Skills (专家经验包)**：采用非入侵式声明。系统扫描 `SKILL.md` 的 YAML 元数据，并自动装载至全局 `<skill_registry>`。当 Agent 识别到当前问题进入了某个专长领域时，会主动调用 `Skill` 工具**即时、按需加载**完整的专家操作指南、代码模版与最佳实践，极大地提高了复杂、垂直任务的生成精度。
*   **MCP (Model Context Protocol)**：原生支持 Anthropic 的 MCP 协议标准。允许 Agent 以毫秒级、跨语言、跨容器地接入互联网上庞大的开源 MCP 工具。
*   **Plugins (运行时热拔插工具链)**：支持运行时自适应扫描与加载。最核心的是，**Agent 可以通过 `file-editor` 插件在 `/plugins` 目录下实时用 JavaScript 自写新工具并平滑热重载**，实现真正的“代码级自我自主演进（Self-Evolution）”。

### 3. 🔁 异步自治执行环与长时任务调度 (Autonomous Execution Loop)
传统 Agent 在执行多步工具调用（如：编译代码、打包部署）时，往往需要用户保持前端在线，或需要用户多次手动点击确认。Mio-Chat 的 **`TaskRunnerService`** 彻底解决了这一问题：
*   **自治围栏指令 (Autonomous Guard)**：对于定时或后台触发的长时任务，系统会自动在 Prompt 尾部追加专有的自治围栏指令，切断 Agent 向用户“索要权限”的意图，强制其充分利用手头工具，独立自主贯通整个任务流并输出最终报告。
*   **虚拟客户端桥接 (Virtual LLM Client)**：即便在没有真实 Web 连接的后台环境下，系统也会为任务分配独立的 `VirtualLLMClient` 实例。它完美模拟了真实 Socket 连接的流式处理，负责在后台追踪思维链（Reasoning Content）、工具执行、和状态演进，并与 Socket.IO 的日志传输层和 Redis 缓存无缝对接。用户可以随时进入控制台，像看直播一样以打字机流式查阅后台长时任务的执行进度与实时日志。

### 4. 🖥️ 现实操作系统桥接器 (OS Bridge)
作为操作系统，Mio-Chat 提供给 Agent 与底层实体环境最扎实的接触面：
*   **真实伪终端沙盒 (Terminal Sandbox)**：引入 `node-pty` 原生 C++ 绑定。Agent 能运行真实的交互式 Bash、操作构建工具链（Vite/Webpack）、编译运行多语言程序（C++/Python/Go），并完美接收 TTY 终端流。
*   **无头浏览器视觉自动化 (Puppeteer & Browsers)**：内置 `puppeteer-core`，Agent 可自由爬取复杂动态网页、截取视觉快照（Screenshot），使不具备视觉的多模态模型也能通过快照图片直观“看懂”复杂的网页界面。

---

## 🏗️ 目录结构说明

```
mio-chat-backend/
├── app.js                    # 统一应用入口 (整合环境自动配置、健康检查与初始化)
├── lib/
│   ├── chat/llm/             # Agent 核心逻辑：多通道适配器、记忆结晶与任务调度
│   │   ├── adapters/         # 多大模型供应商（OpenAI, Gemini, Vertex, Anthropic 等）适配器
│   │   ├── services/         # 核心服务 (记忆结晶、Skills、Task 调度执行)
│   │   └── skills/           # 系统级预置 Skills 专家指南
│   ├── database/             # 数据服务层与 Prisma Client 实例
│   ├── initialization/       # 系统自动初始化流程（保障环境自愈与 .env 自动补全）
│   ├── migration/            # 数据库配置与模型自动同步探测器
│   └── server/               # 基础服务器 (Express 路由、Socket.IO 实时通信)
├── plugins/                  # 外部自定义插件存放目录 (支持 Agent 运行时动态热重载)
├── config/                   # 配置文件目录 (owners.yaml、PM2 进程配置等)
├── presets/                  # Agent 预设、系统提示词
├── docs/                     # 详细的系统开发与架构文档
└── output/                   # 运行时输出 (图片、长时任务 chunk 分片、生成物、系统日志)
```

---

## 🚀 极速部署指南

在开始部署前，请确保您的服务器满足以下基础环境要求：
*   **Node.js**：`>= 20.19.0` (推荐 `v22.x` 长期支持版)
*   **包管理工具**：推荐安装 `pnpm >= 9.0.0`
*   **系统环境**：Linux 最佳 (如 Ubuntu 20.04+)，以完美支持 `node-pty` 原生编译。

---

### 方案 A：Docker Compose 部署 (推荐)

这是最快捷、隔离性最好的生产部署方式。

#### 1. 编写 `docker-compose.yml`
```yaml
version: '3.8'

services:
  miochat-backend:
    image: miofcip/miochat:latest
    container_name: mio-chat-backend
    restart: always
    ports:
      - "3000:3000"
    volumes:
      - ./data/output:/www/fake_mio/servers/mio-chat-backend/output
      - ./data/plugins:/www/fake_mio/servers/mio-chat-backend/plugins
      - ./data/config:/www/fake_mio/servers/mio-chat-backend/config
    environment:
      - NODE_ENV=production
      - PORT=3000
```

#### 2. 一键运行与查看日志
```bash
# 启动容器
docker compose up -d

# 查看日志
docker compose logs -f
```

---

### 方案 B：本地/生产 PM2 部署 (源码编译)

如果您希望利用物理机的真实环境，让 Agent 拥有更完整的系统执行能力，源码部署是最佳选择。

#### 1. 极速克隆仓库
> 💡 **构建提示**：在服务器克隆时，强烈建议使用 `--depth 1` 进行浅克隆，以节省带宽和磁盘空间。
```bash
git clone --depth 1 https://github.com/Pretend-to/mio-chat-backend.git
cd mio-chat-backend
```

#### 2. 安装依赖并自动生成 Prisma 客户端
```bash
# 安装 pnpm (如未安装)
npm install -g pnpm

# 安装依赖 (将自动触发 postinstall 编译 node-pty 与生成 prisma-client)
pnpm install
```

#### 3. 启动与守护运行 (包含自动数据库初始化与自愈)
项目内部集成了**数据库自动侦测与自愈机制**。启动时，应用会**自动检测 Schema 变更并同步数据库结构**，无需您手动运行任何数据库迁移命令。

```bash
# 全局安装 PM2 (如未安装)
npm install -g pm2

# 使用预置配置启动应用
pnpm start
```

若需监控、重启或排查：
```bash
pm2 list                         # 查看应用列表
pm2 logs mio-chat-backend        # 查看实时日志
pm2 restart mio-chat-backend     # 重启服务
```

---

## 🔄 版本更新与平滑升级

随着项目的快速迭代，定期升级项目非常简单。请根据您的部署方案选择对应的平滑升级流程：

### 1. Docker 容器平滑更新 (如果您使用方案 A)
```bash
# 1. 拉取最新镜像
docker compose pull

# 2. 重新启动服务 (Docker 会自动销毁旧容器并拉起新容器，实现秒级热更新)
docker compose up -d

# 3. 清理废弃的旧镜像
docker image prune -f
```

### 2. 源码构建更新 (如果您使用方案 B)
当您在服务器上采用 Git 源码和 PM2 运行项目时，请执行以下命令链：
```bash
# 1. 浅拉取最新代码，保持 Git 目录轻量化
git pull --depth 1

# 2. 安装并更新任何可能新增的 npm 依赖包
pnpm install

# 3. PM2 平滑热重载 (应用启动时，app.js 将全自动完成数据库 Schema 检测与热升级)
pm2 reload mio-chat-backend
```

---

## 🔒 Nginx 反向代理配置最佳实践

在生产环境部署时，建议在前端挂载 Nginx 代理，并正确开启 **WebSocket (Socket.IO)** 和 **Server-Sent Events (SSE)** 流式响应支持。以下是经过实战验证的 Nginx 配置模板：

```nginx
server {
    listen 80;
    server_name ai.yourdomain.com;

    # 强制跳转 HTTPS (可选，推荐)
    # return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ai.yourdomain.com;

    # SSL 证书配置 (可选)
    # ssl_certificate /path/to/fullchain.pem;
    # ssl_certificate_key /path/to/privkey.pem;

    client_max_body_size 100M; # 保证大文件断点续传不被拦截

    # 1. 后端 API 反向代理
    location / {
        proxy_pass http://127.0.0.1:3000;
        
        # 基础 Proxy 头
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 核心：支持 Server-Sent Events (SSE) 流式传输，避免 Nginx 缓存缓冲
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
        
        # 超时时间调整
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }

    # 2. Socket.IO WebSocket 专用反向代理
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000/socket.io/;
        
        # 核心：支持 WebSocket 升级协议
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 读写超时设置
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

---

## 🤝 参与贡献

我们非常欢迎开发者参与贡献。在这里，无论是设计一套极具创意的 **Skill 能力包**，还是开发一个全新的 **原生扩展插件**，都能找到您的用武之地。
*   **设计规范**：具体请参考 `docs/` 下的相关文档或设计指引
*   **开源协议**：本项目基于 **MIT License** 开源协议
