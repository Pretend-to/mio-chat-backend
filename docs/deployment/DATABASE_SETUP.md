# 数据库设置说明

## ⚠️ 重要安全提醒

数据库文件 (`data/app.db` 或 `prisma/data/app.db`) 包含敏感配置信息，包括：
- API 密钥
- 访问令牌
- 用户凭据
- 其他敏感配置

**绝对不要将数据库文件提交到 Git 仓库！**

## 首次设置

1. **启动应用**：首次运行时会自动创建数据库
   ```bash
   pnpm start
   ```

2. **数据库位置**：
   - 默认位置：`prisma/data/app.db`
   - 可通过环境变量 `DATABASE_URL` 自定义

3. **初始化配置**：
   - 应用启动时会自动运行迁移脚本
   - 如果数据库为空，会从默认配置初始化

## 数据迁移

如果你有旧的配置文件需要迁移：

```bash
# 运行迁移脚本
node scripts/migrate-to-sqlite.js
```

## 备份和恢复

```bash
# 备份数据库
cp prisma/data/app.db backup/app-$(date +%Y%m%d).db

# 恢复数据库
cp backup/app-20241217.db prisma/data/app.db
```

## 环境变量配置

可以通过环境变量覆盖数据库配置：

```bash
# 自定义数据库位置
export DATABASE_URL="file:./custom/path/app.db"

# 其他配置
export SERVER_PORT=3000
export DEBUG=true
```

## 故障排除

如果遇到数据库问题：

1. **重置数据库**：
   ```bash
   rm prisma/data/app.db
   pnpm start  # 会重新创建数据库
   ```

2. **查看数据库内容**：
   ```bash
   npx prisma studio
   ```

3. **运行迁移**：
   ```bash
   npx prisma migrate dev
   ```