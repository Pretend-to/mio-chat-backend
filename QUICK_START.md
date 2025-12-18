# 🚀 Mio-Chat 新用户快速启动指南

## 最简单的启动方式

```bash
# 1. 克隆项目
git clone https://github.com/Pretend-to/mio-chat-backend.git
cd mio-chat-backend

# 2. 一键安装并启动
npm run first-run
```

**就这么简单！** 🎉

## 启动过程说明

当你运行 `npm run first-run` 时，系统会自动：

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
💡 建议运行 "npm run setup" 来永久保存访问码

服务启动成功: http://127.0.0.1:3080
```

## 重要提醒

- 🔐 **保存访问码**：请将显示的访问码保存到安全的地方
- 🌐 **访问地址**：打开浏览器访问 `http://localhost:3080`
- 🔑 **首次登录**：使用管理员访问码登录管理界面

## 自定义配置

### 自定义端口

```bash
PORT=8080 npm run quick-start
```

### 自定义访问码

```bash
ADMIN_CODE=your-password npm run quick-start
```

### 永久保存配置

如果你想永久保存访问码到 `.env` 文件：

```bash
npm run setup
```

## 其他启动方式

### 分步启动

```bash
# 1. 安装依赖
npm install

# 2. 快速启动
npm run quick-start
```

### 手动启动

```bash
# 1. 安装依赖
npm install

# 2. 生成数据库客户端
npm run db:generate

# 3. 初始化数据库
npm run db:push

# 4. 启动服务
node app.js
```

## 故障排除

如果遇到问题，请尝试：

1. **清理并重新安装**：
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run quick-start
   ```

2. **手动设置数据库**：
   ```bash
   npm run db:generate
   npm run db:push
   ```

3. **检查 Node.js 版本**：
   ```bash
   node --version  # 需要 >= 18.0.0
   ```

## 需要帮助？

- 📖 查看完整文档：[README.md](README.md)
- 🐛 报告问题：[GitHub Issues](https://github.com/Pretend-to/mio-chat-backend/issues)
- 💬 加入交流群：[QQ 群](http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=-r56TCEUfe5KAZXx3p256B2_cxMhAznC&authKey=6%2F7fyXh3AxdOsYmqqfxBaoKszlQzKKvI%2FahbRBpdKklWWJsyHUI0iyB7MoHQJ%2BqJ&noverify=0&group_code=798543340)

---

**祝你使用愉快！** 🎉