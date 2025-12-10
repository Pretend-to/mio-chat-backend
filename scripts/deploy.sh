#!/bin/bash

# Mio Chat Docker 部署脚本
# 自动生成 ADMIN_CODE 并启动服务

set -e

echo "🚀 Mio Chat Docker 部署脚本"
echo "=========================="

# 生成或使用现有的 ADMIN_CODE
if [ -z "$ADMIN_CODE" ]; then
    ADMIN_CODE=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    echo "✅ 已生成新的管理员访问码"
else
    echo "✅ 使用现有的管理员访问码"
fi

# 创建 .env 文件
cat > .env << EOF
ADMIN_CODE=$ADMIN_CODE
USER_CODE=
NODE_ENV=production
EOF

echo "📝 已创建 .env 文件"
echo ""

# 选择部署模式
echo "请选择部署模式："
echo "1) 正式版本（使用在线镜像）"
echo "2) 开发版本（本地构建）"
read -p "请输入选择 (1/2): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[1]$ ]]; then
    echo "🚀 启动正式版本..."
    docker-compose up -d
elif [[ $REPLY =~ ^[2]$ ]]; then
    echo "🔧 启动开发版本..."
    docker-compose -f docker-compose.dev.yml up -d --build
else
    echo "❌ 无效选择"
    exit 1
fi

echo ""
echo "🎉 部署成功！"
echo "============="
echo "管理员访问码: $ADMIN_CODE"
echo "访问地址: http://localhost:3080"
echo ""
echo "📖 常用命令："
echo "  查看日志: docker-compose logs -f"
echo "  重启服务: docker-compose restart"
echo "  停止服务: docker-compose down"
echo ""
echo "🔗 配置 API: http://localhost:3080/api/config?admin_code=$ADMIN_CODE"
echo "🔗 插件管理: http://localhost:3080/api/plugins?admin_code=$ADMIN_CODE"