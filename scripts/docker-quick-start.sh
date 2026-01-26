#!/bin/bash

# Docker 快速启动脚本
# 自动生成访问码并启动 Docker 容器

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 生成随机访问码
generate_code() {
    openssl rand -base64 16 2>/dev/null || head -c 16 /dev/urandom | base64
}

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker 服务未运行，请启动 Docker 服务"
        exit 1
    fi
}

# 主函数
main() {
    print_info "🚀 Mio-Chat Docker 快速启动脚本"
    echo
    
    # 检查 Docker
    check_docker
    
    # 设置默认值
    PORT=${PORT:-3080}
    ADMIN_CODE=${ADMIN_CODE:-$(generate_code)}
    USER_CODE=${USER_CODE:-$(generate_code)}
    CONTAINER_NAME=${CONTAINER_NAME:-mio-chat-backend}
    
    # 显示配置信息
    print_info "配置信息："
    echo "  端口: $PORT"
    echo "  容器名: $CONTAINER_NAME"
    echo "  管理员访问码: $ADMIN_CODE"
    echo "  用户访问码: $USER_CODE"
    echo
    
    # 检查端口是否被占用
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "端口 $PORT 已被占用，请使用其他端口"
        print_info "使用方法: PORT=8080 $0"
        exit 1
    fi
    
    # 停止并删除已存在的容器
    if docker ps -a --format "table {{.Names}}" | grep -q "^$CONTAINER_NAME$"; then
        print_info "停止并删除已存在的容器..."
        docker stop $CONTAINER_NAME >/dev/null 2>&1 || true
        docker rm $CONTAINER_NAME >/dev/null 2>&1 || true
    fi
    
    # 启动容器
    print_info "正在启动 Docker 容器..."
    
    docker run -d \
        --name $CONTAINER_NAME \
        -p $PORT:$PORT \
        -e PORT=$PORT \
        -e HOST=0.0.0.0 \
        -e ADMIN_CODE="$ADMIN_CODE" \
        -e USER_CODE="$USER_CODE" \
        -e NODE_ENV=production \
        --restart unless-stopped \
        miofcip/miochat:latest
    
    # 等待容器启动
    print_info "等待服务启动..."
    sleep 5
    
    # 检查容器状态
    if docker ps --format "table {{.Names}}" | grep -q "^$CONTAINER_NAME$"; then
        print_success "🎉 容器启动成功！"
        echo
        print_info "📋 服务信息："
        echo "  🌐 访问地址: http://localhost:$PORT"
        echo "  🔐 管理员访问码: $ADMIN_CODE"
        echo "  👤 用户访问码: $USER_CODE"
        echo "  🏥 健康检查: http://localhost:$PORT/api/health"
        echo
        print_info "📝 管理命令："
        echo "  查看日志: docker logs $CONTAINER_NAME"
        echo "  停止服务: docker stop $CONTAINER_NAME"
        echo "  重启服务: docker restart $CONTAINER_NAME"
        echo "  删除容器: docker rm -f $CONTAINER_NAME"
        echo
        print_warning "⚠️  请妥善保存访问码！"
    else
        print_error "❌ 容器启动失败"
        print_info "查看错误日志: docker logs $CONTAINER_NAME"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo "Mio-Chat Docker 快速启动脚本"
    echo
    echo "用法:"
    echo "  $0                          # 使用默认配置启动"
    echo "  PORT=8080 $0               # 自定义端口"
    echo "  ADMIN_CODE=password $0     # 自定义管理员密码"
    echo "  CONTAINER_NAME=myapp $0    # 自定义容器名"
    echo
    echo "环境变量:"
    echo "  PORT           服务端口 (默认: 3080)"
    echo "  ADMIN_CODE     管理员访问码 (默认: 自动生成)"
    echo "  USER_CODE      用户访问码 (默认: 自动生成)"
    echo "  CONTAINER_NAME 容器名称 (默认: mio-chat-backend)"
    echo
    echo "示例:"
    echo "  PORT=8080 ADMIN_CODE=mypassword $0"
}

# 处理命令行参数
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac