#!/bin/bash

# Docker Hub 构建和推送脚本
# 使用方法: ./scripts/docker-build.sh [tag]

set -e

# 默认版本标签
VERSION=${1:-latest}

# Docker Hub 仓库名
DOCKERHUB_REPO="miofcip/miochat"

echo "🚀 开始构建 Docker 镜像..."

# 构建镜像
docker build -t ${DOCKERHUB_REPO}:${VERSION} .
docker tag ${DOCKERHUB_REPO}:${VERSION} ${DOCKERHUB_REPO}:latest

echo "✅ 镜像构建完成!"

# 推送镜像
echo "📤 推送镜像到 Docker Hub..."

docker push ${DOCKERHUB_REPO}:${VERSION}
docker push ${DOCKERHUB_REPO}:latest

echo "🎉 镜像推送成功!"
echo ""
echo "镜像信息:"
echo "  - ${DOCKERHUB_REPO}:${VERSION}"
echo "  - ${DOCKERHUB_REPO}:latest"
echo ""
echo "使用命令:"
echo "  docker run -d -p 3080:3080 --name mio-chat ${DOCKERHUB_REPO}:${VERSION}"