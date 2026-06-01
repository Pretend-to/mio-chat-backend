#!/bin/bash
set -e

# ============================================
# Sub2API 一键部署脚本
# 端口: 4088
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}   Sub2API 一键部署${NC}"
echo -e "${CYAN}   端口: 4088${NC}"
echo -e "${CYAN}============================================${NC}"

# 检测架构
ARCH=$(uname -m)
echo -e "${YELLOW}[1/6] 检测系统架构...${NC} ${ARCH}"

# 生成安全密钥
echo -e "${YELLOW}[2/6] 生成安全密钥...${NC}"
JWT_SECRET=$(openssl rand -hex 32)
TOTP_KEY=$(openssl rand -hex 32)
DB_PASS=$(openssl rand -hex 16)
ADMIN_PASS=$(openssl rand -hex 8)

# 创建目录
INSTALL_DIR=~/sub2api
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

echo -e "${YELLOW}[3/6] 创建 docker-compose.yml...${NC}"

cat > docker-compose.yml << 'DOCKEREOF'
version: '3.8'

services:
  sub2api:
    image: weishaw/sub2api:latest
    container_name: sub2api
    restart: unless-stopped
    ports:
      - "4088:8080"
    environment:
      - PORT=8080
      - GIN_MODE=release
      - DATABASE_URL=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?sslmode=disable
      - REDIS_URL=redis://redis:6379/0
      - JWT_SECRET=${JWT_SECRET}
      - TOTP_ENCRYPTION_KEY=${TOTP_ENCRYPTION_KEY}
      - ADMIN_EMAIL=${ADMIN_EMAIL}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - TZ=${TZ}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./data:/app/data
    networks:
      - sub2api-net

  db:
    image: postgres:15-alpine
    container_name: sub2api-db
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    networks:
      - sub2api-net

  redis:
    image: redis:7-alpine
    container_name: sub2api-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks:
      - sub2api-net

volumes:
  postgres_data:
  redis_data:

networks:
  sub2api-net:
    driver: bridge
DOCKEREOF

cat > .env << ENVEOF
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${DB_PASS}
POSTGRES_DB=sub2api
ADMIN_EMAIL=admin@sub2api.local
ADMIN_PASSWORD=${ADMIN_PASS}
JWT_SECRET=${JWT_SECRET}
TOTP_ENCRYPTION_KEY=${TOTP_KEY}
TZ=Asia/Shanghai
ENVEOF

echo -e "${YELLOW}[4/6] 拉取镜像（首次约 2-3 分钟）...${NC}"
docker compose pull -q 2>/dev/null || true

echo -e "${YELLOW}[5/6] 启动服务...${NC}"
docker compose up -d 2>&1 | grep -v "Network\|Volume"

echo -e "${YELLOW}[6/6] 等待服务就绪...${NC}"

# 等待 sub2api 启动
for i in $(seq 1 30); do
  if docker compose logs sub2api 2>/dev/null | grep -q "listening on\|started\|admin password"; then
    break
  fi
  sleep 1
done

# 获取服务器 IP
SERVER_IP=$(curl -s https://api.ipify.org 2>/dev/null || curl -s https://ifconfig.me 2>/dev/null || echo "localhost")

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  ✅ Sub2API 部署完成！${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  ${CYAN}管理后台:${NC} http://${SERVER_IP}:4088"
echo -e "  ${CYAN}管理员邮箱:${NC} admin@sub2api.local"
echo -e "  ${CYAN}管理员密码:${NC} ${ADMIN_PASS}"
echo -e "  ${CYAN}安装目录:${NC} ${INSTALL_DIR}"
echo ""
echo -e "${YELLOW}  请在浏览器中打开管理后台，登录后：${NC}"
echo -e "  1. 进入「账号管理」→「添加账号」"
echo -e "  2. 类型选「OAuth (Gemini CLI)」，用 Google 账号授权"
echo -e "  3. 进入「令牌管理」生成 API Key"
echo -e "  4. 下游工具使用："
echo -e "     ${GREEN}Base URL: http://${SERVER_IP}:4088/v1${NC}"
echo -e "     ${GREEN}API Key: 你生成的令牌${NC}"
echo ""
echo -e "${YELLOW}  常用命令：${NC}"
echo -e "  docker compose logs -f sub2api    # 查看日志"
echo -e "  docker compose restart sub2api    # 重启"
echo -e "  docker compose pull && docker compose up -d  # 升级"
echo -e "  docker compose down               # 停止"
echo ""
echo -e "${CYAN}============================================${NC}"
