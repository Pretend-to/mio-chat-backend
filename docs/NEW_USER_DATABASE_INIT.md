# 新用户数据库初始化完整指南

## 概述

当新用户克隆 Mio-Chat 项目后，数据库初始化是一个完全自动化的过程。项目使用 **SQLite** 作为数据库，通过 **Prisma ORM** 进行管理。

## 🚀 最简单的启动方式

```bash
# 1. 克隆项目
git clone https://github.com/Pretend-to/mio-chat-backend.git
cd mio-chat-backend

# 2. 一键启动（推荐）
pnpm run first-run
```

这一条命令会自动完成所有初始化工作！

## 📋 初始化流程详解

### 1. 依赖安装阶段
```bash
pnpm install  # 安装所有 Node.js 依赖
```

### 2. 数据库客户端生成
```bash
pnpm run db:generate  # 生成 Prisma 客户端代码
```

### 3. 数据库文件创建
```bash
pnpm run db:push  # 创建 SQLite 数据库文件和表结构
```
- 数据库文件位置：`prisma/data/app.db`
- 自动创建所有必需的表结构

### 4. 默认配置初始化
应用启动时会自动运行 `scripts/initialize-defaults.js`，初始化：

#### 系统设置 (system_settings 表)
- **访问码**：自动生成安全的管理员和用户访问码
- **服务器配置**：端口、主机等基础配置
- **Web 配置**：界面标题、全屏模式等
- **调试配置**：日志级别、调试模式等

#### 插件配置 (plugin_configs 表)
- **OneBot 配置**：QQ 机器人相关配置（默认禁用）
- **其他插件配置**：根据需要动态添加

#### 预设管理 (presets 表)
- 空表，用于存储用户创建的对话预设

#### LLM 适配器 (llm_adapters 表)
- 空表，用户后续通过 Web 界面配置各种 AI 服务

## 🗄️ 数据库结构

### 核心表结构

| 表名 | 用途 | 重要字段 |
|------|------|----------|
| `system_settings` | 系统配置 | key, value, category |
| `llm_adapters` | AI 服务配置 | adapter_type, instance_name, config_data |
| `presets` | 对话预设 | name, history, tools |
| `plugin_configs` | 插件配置 | plugin_name, config_data, enabled |
| `model_owners` | 模型所有者 | owner, keywords |
| `log_configs` | 日志配置 | name, buffer_size, sources |

### 初始化后的默认数据

#### 1. 系统设置 (system_settings)
```sql
-- 访问码（自动生成）
INSERT INTO system_settings (key, value, category) VALUES 
('admin_code', 'yAgiwswqoz9bHdESbdt8Mw==', 'web'),
('user_code', 'm6df3LsqgcYBUdv5uxi/yg==', 'web');

-- 服务器配置
INSERT INTO system_settings (key, value, category) VALUES 
('server_port', '3080', 'server'),
('debug_mode', 'false', 'general');

-- Web 界面配置
INSERT INTO system_settings (key, value, category) VALUES 
('web_title', 'MioChat', 'web'),
('web_full_screen', 'true', 'web');
```

#### 2. 插件配置 (plugin_configs)
```sql
-- OneBot 配置（默认禁用）- 现在存储在 system_settings 表中
INSERT INTO system_settings (key, value, category, description) VALUES 
('onebot', '{"enable":false,"reverse_ws_url":"","bot_qq":"","admin_qq":"","token":"","plugins":null}', 'onebot', 'OneBot 协议配置');
```

## 🔐 访问码生成

### 自动生成机制
- 使用 `crypto.randomBytes(16).toString('base64')` 生成
- 每次启动都会检查是否已存在，不存在才生成新的
- 生成后会在控制台显示，**请务必保存**

### 访问码示例
```
🔐 访问码信息：
管理员访问码: yAgiwswqoz9bHdESbdt8Mw==
普通用户访问码: m6df3LsqgcYBUdv5uxi/yg==

⚠️  请妥善保存这些访问码！
💡 建议运行 "pnpm run setup" 来永久保存访问码
```

## 📁 文件结构

### 数据库相关文件
```
mio-chat-backend/
├── prisma/
│   ├── schema.prisma          # 数据库模式定义
│   └── data/
│       └── app.db            # SQLite 数据库文件（自动创建）
├── lib/database/
│   ├── prisma.js             # Prisma 管理器
│   └── services/             # 数据库服务层
│       ├── SystemSettingsService.js
│       ├── PluginConfigService.js
│       └── PresetService.js
└── scripts/
    ├── setup.js              # 完整项目设置
    ├── quick-start.js        # 快速启动
    └── initialize-defaults.js # 默认配置初始化
```

### 重要说明
- **数据库文件**：`prisma/data/app.db` 包含敏感信息，已加入 `.gitignore`
- **配置迁移**：项目已完全从文件配置迁移到数据库配置
- **环境变量**：可通过环境变量覆盖数据库中的配置

## 🛠️ 手动初始化（故障排除）

如果自动初始化失败，可以手动执行：

```bash
# 1. 安装依赖
pnpm install

# 2. 生成 Prisma 客户端
pnpm run db:generate

# 3. 创建数据库
pnpm run db:push

# 4. 初始化默认配置
pnpm run init-defaults

# 5. 启动应用
node app.js
```

## 🔧 常见问题

### 1. Prisma 客户端生成失败
```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
pnpm install
pnpm run db:generate
```

### 2. 数据库文件权限问题
```bash
# 确保目录存在且有写权限
mkdir -p prisma/data
chmod 755 prisma/data
```

### 3. 重置数据库
```bash
# 删除数据库文件重新初始化
rm prisma/data/app.db
pnpm run quick-start
```

## 🌐 启动后访问

1. **Web 界面**：http://localhost:3080
2. **使用访问码**：输入生成的管理员访问码登录
3. **配置 AI 服务**：在 Web 界面中添加 OpenAI、Gemini 等配置

## 📊 数据库管理工具

```bash
# 打开 Prisma Studio（数据库可视化工具）
pnpm run db:studio

# 查看数据库健康状态
curl http://localhost:3080/api/health
```

## 🔒 安全注意事项

1. **访问码保护**：生成的访问码请妥善保存，不要泄露
2. **数据库备份**：定期备份 `prisma/data/app.db` 文件
3. **环境变量**：生产环境建议通过环境变量设置访问码
4. **文件权限**：确保数据库文件只有应用程序可以访问

---

**总结**：新用户只需要运行 `pnpm run first-run` 一条命令，就能完成从依赖安装到数据库初始化的全部工作，然后就可以通过生成的访问码登录使用了！