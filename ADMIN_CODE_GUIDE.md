# ADMIN_CODE 管理员访问码配置指南

## 📋 概述

`ADMIN_CODE` 是管理员访问码，用于保护敏感的 API 操作，包括：
- 配置管理
- 插件管理
- 系统设置

## 🔐 三种配置方式（按优先级）

### 1. **环境变量**（最高优先级）
```bash
export ADMIN_CODE=your_admin_code_here
```

### 2. **Docker 环境变量**
```bash
docker run -e ADMIN_CODE=your_admin_code_here ...
```

### 3. **配置文件**（最低优先级）
```yaml
# config/config/config.yaml
web:
  admin_code: 'your_admin_code_here'
```

## 🚀 快速配置

### 方式 1：使用环境变量
```bash
# Linux/Mac
export ADMIN_CODE=$(openssl rand -base64 32)
echo "管理员访问码: $ADMIN_CODE"

# Windows
$env:ADMIN_CODE = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

### 方式 2：创建 .env 文件
```bash
cat > .env << 'EOF'
ADMIN_CODE=your_admin_code_here
USER_CODE=optional_user_code
EOF
```

### 方式 3：Docker Compose
```bash
# 设置环境变量后启动
export ADMIN_CODE=your_admin_code
docker-compose up -d

# 或在 docker-compose.yml 中设置
environment:
  - ADMIN_CODE=your_admin_code
```

## 🐳 Docker 部署配置

### 正式版本
```bash
# 方法 1：环境变量
export ADMIN_CODE=your_admin_code
docker-compose up -d

# 方法 2：.env 文件
echo "ADMIN_CODE=your_admin_code" > .env
docker-compose up -d
```

### 开发版本
```bash
# 方法 1：环境变量
export ADMIN_CODE=your_admin_code
docker-compose -f docker-compose.dev.yml up -d

# 方法 2：编辑配置文件
vim config/config/config.yaml
# 添加：
# web:
#   admin_code: 'your_admin_code'
```

## 🔧 API 使用方法

### 方法 1：查询参数
```bash
curl "http://localhost:3080/api/plugins?admin_code=your_admin_code"
```

### 方法 2：请求头
```bash
curl -H "X-Admin-Code: your_admin_code" http://localhost:3080/api/plugins
```

### 方法 3：请求体
```bash
curl -X POST "http://localhost:3080/api/config" \
  -H "Content-Type: application/json" \
  -d '{"admin_code": "your_admin_code", ...}'
```

## ⚠️ 安全建议

1. **使用强密码**：至少 16 位，包含大小写字母、数字和特殊字符
2. **定期更换**：定期更换管理员访问码
3. **不要提交**：不要将 `ADMIN_CODE` 提交到代码仓库
4. **使用环境变量**：推荐使用环境变量而不是配置文件

## 🛠️ 故障排查

### 1. 忘记 ADMIN_CODE
```bash
# 查看容器环境变量
docker exec mio-chat-backend env | grep ADMIN_CODE

# 或查看配置文件
docker exec mio-chat-backend cat /app/config/config/config.yaml | grep admin_code
```

### 2. 认证失败 (403)
- 检查 `ADMIN_CODE` 是否正确
- 确认配置方式（优先使用环境变量）

### 3. 未设置 ADMIN_CODE
```bash
# 会看到错误提示
Error: 未设置管理员访问码 admin_code
1. 在环境变量中设置：ADMIN_CODE=your-admin-code
2. 或在配置文件 config/config/config.yaml 中设置：web.admin_code
```

## 📝 示例脚本

生成随机 ADMIN_CODE：
```bash
#!/bin/bash
# generate-admin-code.sh

ADMIN_CODE=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
echo "生成的管理员访问码: $ADMIN_CODE"
echo "请将其设置为环境变量："
echo "export ADMIN_CODE=$ADMIN_CODE"
```

Docker 部署脚本：
```bash
#!/bin/bash
# deploy.sh

# 生成或使用现有的 ADMIN_CODE
if [ -z "$ADMIN_CODE" ]; then
    ADMIN_CODE=$(openssl rand -base64 32)
    echo "生成的管理员访问码: $ADMIN_CODE"
fi

# 创建 .env 文件
cat > .env << EOF
ADMIN_CODE=$ADMIN_CODE
USER_CODE=
EOF

echo "已创建 .env 文件"
echo "正在启动服务..."

# 启动服务
docker-compose up -d

echo "服务已启动！"
echo "管理员访问码: $ADMIN_CODE"
echo "访问地址: http://localhost:3080"
```