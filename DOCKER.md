# Docker 部署指南

## 两个版本

### 🚀 正式版本 (生产环境)

使用在线镜像，开箱即用：

```bash
# 拉取镜像并启动
docker-compose up -d

# 或设置管理员密码
export ADMIN_CODE=your_password
docker-compose up -d
```

**特点**：
- 使用在线镜像 `miofcip/miochat:latest`
- 无需本地代码
- 不映射任何目录，避免权限问题
- 开箱即用

### 🔧 开发版本 (开发环境)

映射整个目录，实时修改：

```bash
# 构建并运行
docker-compose -f docker-compose.dev.yml up -d

# 查看实时日志
docker-compose -f docker-compose.dev.yml logs -f
```

**特点**：
- 本地构建镜像
- 映射整个项目目录
- 代码修改实时生效
- 适合开发和调试

## 配置说明

### 环境变量

创建 `.env` 文件：
```bash
ADMIN_CODE=your_admin_code
USER_CODE=optional_user_code
```

### 访问服务

- **Web 界面**: http://localhost:3080
- **健康检查**: http://localhost:3080/api/health

### 修改配置

**正式版本**（需要进入容器）：
```bash
docker exec -it mio-chat-backend vi /app/config/config/config.yaml
docker restart mio-chat-backend
```

**开发版本**（直接编辑）：
```bash
vim config/config/config.yaml
docker-compose -f docker-compose.dev.yml restart
```

## 常用命令

```bash
# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 更新镜像（正式版本）
docker-compose pull && docker-compose up -d

# 重新构建（开发版本）
docker-compose -f docker-compose.dev.yml build
```