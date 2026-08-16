# Mio-Chat 完整部署与使用指引

从零开始把 Mio-Chat 跑起来，并完成第一次真正的人机对话。包含后端、前端、配置与玩法。

---

## 1. 环境要求

| 依赖 | 版本要求 | 说明 |
| :--- | :--- | :--- |
| Node.js | `>=20.19.0` 或 `>=22.12.0` 或 `>=24.0.0` | 推荐使用 Node 22 LTS |
| 包管理器 | pnpm（推荐）/ npm | 项目锁文件为 `pnpm-lock.yaml` |
| 数据库 | SQLite（内置，零配置） | 首次启动自动生成 `prisma/dev.db` |
| 前端（可选） | Node 20+ | 仅本地开发调试需要；生产环境由后端直接托管构建产物 |

> 前置检查：`node -v`、`pnpm -v`。

---

## 2. 后端启动

### 方式 A：一键启动（推荐，适合新手）

```bash
git clone https://github.com/Pretend-to/mio-chat-backend.git
cd mio-chat-backend
pnpm run first-run
```

`first-run` 会自动完成：
1. 安装依赖（`pnpm install` + Prisma Client 生成）
2. 初始化 SQLite 数据库
3. **生成访问码**（管理员 / 普通用户各一个，打印在控制台）
4. 启动服务

启动成功后会看到：

```
🚀 正在启动 Mio-Chat...
🔐 访问码信息：
管理员访问码: yAgiwswqoz9bHdESbdt8Mw==
普通用户访问码: m6df3LsqgcYBUdv5uxi/yg==
⚠️  请妥善保存这些访问码！
💡 建议运行 "pnpm run setup" 来永久保存访问码
服务启动成功: http://127.0.0.1:3080
```

### 方式 B：分步手动（适合了解流程 / 二次开发）

```bash
pnpm install          # 安装依赖（自动触发 prisma generate）
pnpm run db:push      # 同步数据库结构到 SQLite
node app.js           # 启动服务
```

开发模式（文件变更自动重启）：

```bash
pnpm run dev          # node --watch app.js
```

### 方式 C：PM2 守护（生产推荐）

```bash
pnpm install
pnpm run db:push
pnpm start            # 即 pm2 start ./config/pm2.json
pm2 status            # 查看进程状态
pm2 logs mio-chat-backend   # 查看运行日志
pm2 restart mio-chat-backend # 重启
```

> PM2 配置见 `config/pm2.json`（单实例、自动重启、内存超 1G 自动重启）。

### 方式 D：Docker

```bash
cp .env.example .env   # 按需修改
docker compose up -d
```

---

## 3. 访问码与环境变量

访问码是登录前端/管理接口的凭证，来源优先级：**环境变量 > 数据库配置 > 首次启动自动生成**。

| 环境变量 | 作用 | 示例 |
| :--- | :--- | :--- |
| `ADMIN_CODE` | 管理员访问码（完整权限） | `ADMIN_CODE=my-admin-secret` |
| `USER_CODE` | 普通用户访问码 | `USER_CODE=my-user-secret` |
| `PORT` | 覆盖 HTTP 监听端口（默认 3080） | `PORT=8080` |
| `VITE_API_URL` | （前端用）后端 API 地址 | `VITE_API_URL=http://127.0.0.1:3080/` |

把访问码写入 `.env` 永久保存：

```bash
pnpm run setup
```

> ⚠️ 若忘记访问码：删除数据库后重新初始化会生成新码；或直接在 `.env` 设置 `ADMIN_CODE` / `USER_CODE` 并重启。

---

## 4. 前端接入

### 方式 A：生产模式（后端托管前端）

后端默认会尝试托管前端构建产物（`express-static-gzip`）。如果你 clone 了 `mio-chat-frontend` 并 `pnpm build`，将 `dist` 产物复制到后端可识别的静态目录后，**直接访问 `http://<server>:3080` 即可看到完整界面**。

### 方式 B：本地开发（Vite Dev Server）

```bash
git clone https://github.com/Pretend-to/mio-chat-frontend.git
cd mio-chat-frontend
pnpm install
pnpm dev
```

- 前端默认端口 **1314**：`http://localhost:1314`
- Vite 已配置代理：`/api`、`/socket.io`、`/f`、`/p/` 默认转发到 `http://127.0.0.1:3080`
- 后端不在本机/端口不同时，创建 `.env` 覆盖：
  ```bash
  VITE_API_URL=http://your-server:3080/
  ```

> 生产环境建议用 Nginx 将 `443` 反代到后端 `3080`（WebSocket 需配置 Upgrade 头），完整示例见 `docs/deployment/DEPLOYMENT.md`。

---

## 5. 配置模型供应商（LLM Adapter）

首次进入管理界面后，需要配置可用的模型：

1. 登录管理界面（见第 6 节）→ 进入 **设置 / 模型渠道**
2. 点击「添加渠道」，选择适配器类型（OpenAI / Anthropic / Gemini / DeepSeek / 通义 / 智谱 / 火山引擎 / xAI / OpenRouter 等 20+ 家）
3. 填入 Base URL、API Key、可用模型列表
4. 保存后系统自动初始化该渠道，普通用户即可选用

常用渠道配置参考 `docs/adapters/PROVIDER_GUIDE.md`（含 Vertex AI、Gemini OAuth 等复杂认证）。

---

## 6. 进入前端后怎么玩 🎮

> 假设你已经通过方式 A 或 B 打开前端页面（`http://localhost:1314` 或 `:3080`）。

### 6.1 登录

- 页面出现登录框 → 输入 **管理员访问码**（全功能）或 **普通用户访问码**（受限）
- 登录后进入主界面：左侧为会话/联系人列表，中间为对话区，右侧（或悬浮）为设置/工具面板

### 6.2 选择预设（Preset）

预设 = 人格 + 工具集 + 引导历史，决定 Agent 的角色和能力：

- 顶部或左侧的 **预设选择器**，可选：系统内置（如「全能代码架构师」「系统运维总管」「UI/UX 交互设计师」「系统配置专家」等）或自定义预设
- 不同预设拥有不同的**工具集**（代码类含 bash/文件工具，资讯类含搜索/爬取工具）
- 可切换模型：每条消息前在模型选择器里选用已配置的渠道模型

### 6.3 开始对话

- 在输入框输入消息，回车发送，AI 流式回复
- **工具调用**：当任务需要执行命令/读写文件/搜索时，AI 会调用工具，界面上出现「工具调用卡片」展示参数与结果
- **敏感操作二次确认**：若触发了危险命令（如高危 shell），后端会挂起并弹出一张授权卡片，管理员点击「放行」后 AI 继续执行
- **Markdown / Artifacts**：回复支持 Markdown 渲染与 Artifact 交互组件（由 mio-previewer 渲染）

### 6.4 进阶玩法

| 功能 | 入口/用法 |
| :--- | :--- |
| **定时任务 (Cron)** | 让 AI 说「每天早上 9 点总结昨日的 XX」，或在任务面板手动创建；支持 Cron 表达式 / 相对时间 / 单次触发 |
| **多 Agent 群聊** | 在群聊中加入多个不同渠道/预设的 Agent，@指定或轮流讨论 |
| **上下文结晶** | 长对话自动触发记忆压缩（Token 水位线判定），把旧历史提炼为摘要，大幅降低 Token 消耗 |
| **插件管理** | 管理界面 → 插件中心：查看已加载插件、开关插件、查看每个插件的工具列表 |
| **工具调试** | 对插件工具执行独立调试（不经过 LLM），见 `docs/plugins/TOOL_DEBUG_GUIDE.md` |
| **日志审计** | 管理界面查看 Token 用量、工具调用记录、错误日志 |

### 6.5 常用入口速查

- 前端首页：`http://localhost:1314`
- 管理接口（HTTP）：`http://localhost:3080/api/...`（需 `X-Admin-Code` 头，见 `docs/api/api.md`）
- 工具/插件列表 API：`GET /api/openai/tools`、`GET /api/plugins/:name/tools`
- 后端运行日志：`pm2 logs mio-chat-backend`

---

## 7. 常见问题

| 现象 | 处理 |
| :--- | :--- |
| 端口被占用 | `lsof -ti:3080 \| xargs kill -9` 或 `PORT=8080 pnpm dev` |
| `prisma: not found` | `rm -rf node_modules pnpm-lock.yaml && pnpm install` |
| 前端连不上后端 | 检查 `VITE_API_URL`；确认后端 3080 已监听 |
| 登录提示访问码无效 | 确认 `.env` 的 `ADMIN_CODE`/`USER_CODE` 与登录框一致；或重新初始化 |
| WebSocket 掉线 | Nginx 需正确转发 `Upgrade`/`Connection` 头（见 DEPLOYMENT.md） |
| 插件不生效 | 确认插件目录存在且含 `index.js`；查看日志 `[PluginWatcher] 检测到新插件` 是否出现 |

---

**相关文档**：[快速开始](./QUICK_START.md) | [生产部署](./DEPLOYMENT.md) | [Docker](./DOCKER.md) | [数据库初始化](./DATABASE_SETUP.md) | [Hooks 机制](../core/hooks.md)
