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

## 📖 项目定位与愿景

**Mio-Chat-Backend** 是一个基于 Node.js 技术栈打造的、不仅局限于多协议大模型（LLM）转发的 **Agent 操作系统**。

传统的 AI 对话平台往往只扮演“请求转发者”的角色，而 Mio-Chat 致力于打破大模型与现实操作系统之间的藩篱。它内置了 **真实伪终端沙盒（PTY）**、**无头浏览器视觉与自动化控制（Puppeteer）**、**长时持续性任务流调度引擎**，以及**原生 Model Context Protocol（MCP）**，赋能 Agent 拥有自我编写代码、编译运行、动态热加载插件、执行分布式后台任务的完备能力。

---

## 🧬 核心架构与黑科技

### 1. 🚀 三位一体扩展架构：Skills + MCP + Plugins
*   **Skills (能力包)**：基于自然语言、Prompt 模版及特定工具集定义的专家能力（如 `miochat-plugin-builder`），让 Agent 变身为垂直领域专家。
*   **MCP (Model Context Protocol)**：原生接入 Anthropic 推出的 MCP 协议标准。不管是 Node.js 生态、UV 环境、还是 Docker 沙盒，皆可毫秒级接入外部海量开源工具。
*   **Plugins (原生插件)**：采用动态加载机制，允许 Agent 利用其内置的 `file-editor` 插件直接在 `/plugins` 目录下实时编写代码，并执行运行时热插拔加载，实现功能“自演进”。

### 2. 🖥️ 真实伪终端沙盒 (Terminal Sandbox)
*   引入 `node-pty`（底层的 C++ 伪终端绑定），提供真实的 TTY 交互通道。
*   Agent 可以直接运行复杂的 Shell 命令、操作构建工具链（Webpack/Vite）、编译运行 C++/Python 等多语言程序，并获取高保真的命令行终端输出。

### 3. 🌐 无头浏览器视觉自动化 (Puppeteer & Browsers)
*   内置 `puppeteer-core` 驱动，支持 Agent 进行动态网页渲染、自动化登录与爬取。
*   支持视觉快照捕获（Screenshot），让不支持视觉的多模态大模型也能通过图片直观感知网页内容。

### 4. ⚡ 极致性能数据基座
*   **Prisma 7 无 Rust 引擎架构**：采用最新的轻量级 JS 驱动，解决传统 Node 服务中 Rust 二进制加载慢、内存占用高的问题。
*   **极速嵌入式存储**：集成 `better-sqlite3` 作为默认存储引擎，实现超轻量、毫秒级响应、零配置开箱即用。同时支持无缝扩展至企业级 **PostgreSQL**。
*   **S3 兼容存储**：原生集成 AWS S3 SDK，支持将海量图片、文档及音频资产无缝托管到第三方对象存储中。

### 5. ⏱️ 持久化长时任务调度 (Persistent Scheduler)
*   基于高性能事件队列与 Cron 驱动，支持 Agent 创建和管理可在后台自主运行的长时、周期性或单次复杂任务。
*   **Socket.IO 实时同步**：支持客户端双向实时流式传输 Agent 思考过程、步骤日志与交互式终端信息。

---

## 🏗️ 目录结构说明

```
mio-chat-backend/
├── app.js                    # 应用启动入口 (包含自动配置、初始化检查)
├── lib/
│   ├── chat/llm/             # LLM 核心：适配器 (OpenAI/Gemini/DeepSeek...) 与技能
│   ├── database/             # 数据库模型、数据服务层与 Prisma Client 实例
│   ├── plugins/              # 系统级内置核心插件
│   └── server/               # 核心服务器 (Express 路由、Socket.IO、中间件)
├── plugins/                  # 外部自定义插件存放目录 (支持热加载)
├── config/                   # 配置文件目录 (owners.yaml、PM2 进程配置等)
├── presets/                  # Agent 预设、系统提示词
├── docs/                     # 生产部署、架构等详细文档
└── output/                   # 运行时输出 (图片、断点分片 chunks、生成物、日志)
```

---

## 🚀 极速部署指南

在开始部署前，请确保您的服务器满足以下基础环境要求：
*   **Node.js**：`>= 20.19.0` (推荐 `v22.x` 长期支持版)
*   **包管理工具**：推荐安装 `pnpm >= 9.0.0`
*   **系统环境**：Linux 最佳 (如 Ubuntu 20.04+)，以完美支持 `node-pty` 编译。

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

如果您希望利用物理机的环境，让 Agent 拥有更完整的系统执行能力，源码部署是最佳选择。

#### 1. 极速克隆仓库
> 💡 **最佳实践提示**：由于项目的二进制编译和频繁构建，在服务器克隆时，强烈建议使用 `--depth 1` 进行浅克隆，以节省带宽和磁盘空间。
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
