# 🚀 Mio-Chat 新用户快速启动指南

## 最简单的启动方式

```bash
# 1. 克隆项目
git clone https://github.com/Pretend-to/mio-chat-backend.git
cd mio-chat-backend

# 2. 一键安装并启动
pnpm run first-run
```

**就这么简单！** 🎉

## 启动过程说明

当你运行 `pnpm run first-run` 时，系统会自动：

1. ✅ **安装依赖** - 下载所有必需的 npm 包
2. ✅ **生成数据库客户端** - 创建 Prisma 客户端
3. ✅ **初始化数据库** - 创建 SQLite 数据库文件
4. ✅ **生成访问码** - 自动创建安全的管理员和用户访问码
5. ✅ **启动服务** - 在端口 3080 启动 Web 服务

## 启动成功后

你会看到类似这样的输出：

```
🚀 正在启动 Mio-Chat...

🔐 访问码信息：
管理员访问码: yAgiwswqoz9bHdESbdt8Mw==
普通用户访问码: m6df3LsqgcYBUdv5uxi/yg==

⚠️  请妥善保存这些访问码！
💡 建议运行 "pnpm run setup" 来永久保存访问码

服务启动成功: http://127.0.0.1:3080
```

## 重要提醒

- 🔐 **保存访问码**：请将显示的访问码保存到安全的地方
- 🌐 **访问地址**：打开浏览器访问 `http://localhost:3080`
- 🔑 **首次登录**：使用管理员访问码登录管理界面

## 自定义配置

### 自定义端口

```bash
PORT=8080 pnpm run quick-start
```

### 自定义访问码

```bash
ADMIN_CODE=your-password pnpm run quick-start
```

### 永久保存配置

如果你想永久保存访问码到 `.env` 文件：

```bash
pnpm run setup
```

## 其他启动方式

### 分步启动

```bash
# 1. 安装依赖
pnpm install

# 2. 快速启动
pnpm run quick-start
```

### 手动启动

```bash
# 1. 安装依赖
pnpm install

# 2. 生成数据库客户端
pnpm run db:generate

# 3. 初始化数据库
pnpm run db:push

# 4. 启动服务
node app.js
```

## 故障排除

### 常见问题

#### 1. Prisma 客户端生成失败

**错误信息**: `prisma: not found` 或 `Command failed: pnpm run db:generate`

**解决方案**：
```bash
# 方案一：完整重新安装
rm -rf node_modules package-lock.json pnpm-lock.yaml
pnpm install
pnpm run quick-start

# 方案二：手动设置数据库
pnpm install
pnpm run setup

# 方案三：使用指定版本
npx prisma@5.22.0 generate
npx prisma@5.22.0 db push
node app.js
```

#### 2. 端口被占用

**错误信息**: `EADDRINUSE: address already in use`

**解决方案**：
```bash
# 使用其他端口
PORT=8080 pnpm run quick-start

# 或者停止占用端口的进程
lsof -ti:3080 | xargs kill -9
```

#### 3. 权限问题

**错误信息**: `EACCES: permission denied`

**解决方案**：
```bash
# 修复权限
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) ./node_modules

# 或使用 sudo（不推荐）
sudo pnpm run quick-start
```

#### 4. Node.js 版本过低

**错误信息**: `SyntaxError: Unexpected token`

**解决方案**：
```bash
# 检查版本（需要 >= 18.0.0）
node --version

# 升级 Node.js
# 使用 nvm
nvm install 18
nvm use 18

# 或下载最新版本
# https://nodejs.org/
```

### 完全重置

如果所有方法都失败，可以完全重置：

```bash
# 1. 清理所有文件
rm -rf node_modules package-lock.json pnpm-lock.yaml
rm -rf prisma/dev.db .env

# 2. 重新克隆项目
cd ..
rm -rf mio-chat-backend
git clone https://github.com/Pretend-to/mio-chat-backend.git
cd mio-chat-backend

# 3. 重新安装
pnpm run first-run
```

## 需要帮助？

- 📖 查看完整文档：[README.md](README.md)
- 🐛 报告问题：[GitHub Issues](https://github.com/Pretend-to/mio-chat-backend/issues)
- 💬 加入交流群：[QQ 群](http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=-r56TCEUfe5KAZXx3p256B2_cxMhAznC&authKey=6%2F7fyXh3AxdOsYmqqfxBaoKszlQzKKvI%2FahbRBpdKklWWJsyHUI0iyB7MoHQJ%2BqJ&noverify=0&group_code=798543340)

---

**祝你使用愉快！** 🎉