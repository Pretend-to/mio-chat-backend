# Docker 部署指南

## 快速开始

### 1. 从 Docker Hub 拉取镜像

```bash
docker pull yourusername/mio-chat-backend:latest
```

### 2. 创建必要目录

```bash
mkdir -p config config/config presets logs plugins
```

### 3. 准备配置文件

```bash
# 复制配置模板
cp config/config/config.example.yaml config/config/config.yaml

# 编辑配置文件，添加你的 API Keys
vim config/config/config.yaml
```

### 4. 运行容器

```bash
docker run -d \
  -p 3080:3080 \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/presets:/app/presets \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/plugins:/app/plugins \
  --name mio-chat-backend \
  yourusername/mio-chat-backend:latest
```

### 5. 使用 Docker Compose

```bash
# 使用提供的 production compose 文件
cp scripts/docker-compose.prod.yml docker-compose.yml

# 编辑环境变量
vim .env

# 启动服务
docker-compose up -d
```

## 构建和发布

### 本地构建

```bash
# 构建镜像
docker build -t mio-chat-backend .

# 运行
docker run -d -p 3080:3080 --name mio-chat mio-chat-backend
```

### 发布到 Docker Hub

1. **设置脚本**

编辑 `scripts/docker-build.sh`，修改 `DOCKERHUB_REPO` 为你的 Docker Hub 用户名。

2. **构建并推送**

```bash
# 构建并推送 latest 标签
./scripts/docker-build.sh

# 推送特定版本
./scripts/docker-build.sh v1.0.0
```

3. **自动化发布**

GitHub Actions 已配置自动构建和发布：
- 推送到 `master/main` 分支时自动构建并推送 `latest` 标签
- 创建 `v*` 标签时自动构建并推送对应版本标签
- Pull Request 时仅构建测试

### GitHub Secrets 配置

在 GitHub 仓库设置中添加以下 Secrets：

- `DOCKER_USERNAME`: Docker Hub 用户名
- `DOCKER_PASSWORD`: Docker Hub 密码或 Access Token

## 配置说明

### 环境变量

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `ADMIN_CODE` | 是 | 管理员访问码 |
| `USER_CODE` | 否 | 普通用户访问码 |
| `NODE_ENV` | 否 | 运行环境，默认为 `production` |
| `TZ` | 否 | 时区设置，默认为 `Asia/Shanghai` |

### 端口映射

- **3080**: 服务主端口（HTTP API 和 Web 界面）

### 数据卷

- `/app/config`: 配置文件目录
- `/app/presets`: 预设文件目录（头像等）
- `/app/logs`: 日志文件目录
- `/app/plugins`: 外部插件目录

## 健康检查

容器包含健康检查端点：`http://localhost:3080/api/health`

```bash
# 检查健康状态
curl http://localhost:3080/api/health
```

## 性能优化

1. **资源限制**

默认配置：
- CPU: 最大 2 核
- 内存: 最大 2GB

可在 `docker-compose.yml` 中调整。

2. **日志管理**

日志文件自动轮转：
- 单个文件最大 10MB
- 保留 3 个历史文件

## 故障排查

### 查看日志

```bash
# Docker 容器日志
docker logs mio-chat-backend

# Docker Compose 日志
docker-compose logs -f mio-chat-backend
```

### 进入容器调试

```bash
docker exec -it mio-chat-backend /bin/sh
```

### 常见问题

1. **配置文件错误**
   - 确保 `config/config/config.yaml` 格式正确
   - 检查所有必需的 API Keys 是否已配置

2. **权限问题**
   - 确保挂载的目录权限正确
   - 避免使用 root 用户运行

3. **端口占用**
   - 检查 3080 端口是否被占用
   - 修改端口映射避免冲突

## 更新镜像

```bash
# 拉取最新版本
docker pull yourusername/mio-chat-backend:latest

# 重新创建容器
docker-compose down
docker-compose up -d
```