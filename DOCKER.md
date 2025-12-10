# Docker 部署

## 快速开始

### 一条命令运行

```bash
# 最简单的方式
docker run -d -p 3080:3080 -e ADMIN_CODE=test123 miofcip/miochat:latest

# 或生成随机密码
docker run -d -p 3080:3080 -e ADMIN_CODE=$(openssl rand -base64 32) miofcip/miochat:latest
```

### 访问服务

- **Web 界面**: http://localhost:3080
- **健康检查**: http://localhost:3080/api/health
- **管理后台**: 使用设置的 ADMIN_CODE

### Docker Compose

```bash
# 正式版本
docker-compose up -d

# 开发版本
docker-compose -f docker-compose.dev.yml up -d
```

### 常用命令

```bash
# 查看日志
docker logs mio-chat-backend

# 停止服务
docker stop mio-chat-backend

# 使用自定义密码
docker run -d -p 3080:3080 -e ADMIN_CODE=your_password miofcip/miochat:latest
```