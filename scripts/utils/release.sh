#!/bin/bash

# 发布到 production 分支的脚本
# 用于触发 Docker 镜像构建和发布

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查当前分支
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "master" ] && [ "$CURRENT_BRANCH" != "main" ]; then
    print_warn "当前分支是 $CURRENT_BRANCH，建议从 master 或 main 分支发布"
    read -p "是否继续？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "取消发布"
        exit 1
    fi
fi

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    print_error "存在未提交的更改，请先提交或暂存"
    git status --short
    exit 1
fi

# 获取最新的远程代码
print_info "拉取最新的远程代码..."
git fetch origin

# 检查本地分支是否落后
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/"$CURRENT_BRANCH")
if [ "$LOCAL" != "$REMOTE" ]; then
    print_warn "本地分支与远程分支不同步，正在拉取最新代码..."
    git pull origin "$CURRENT_BRANCH"
fi

# 获取版本信息
VERSION=$(node -p "require('./package.json').version")
print_info "准备发布版本: $VERSION"

# 确认发布
echo
print_warn "即将将当前代码推送到 production 分支，这会触发 Docker 镜像构建和发布"
read -p "确认发布？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "取消发布"
    exit 1
fi

# 切换到 production 分支
print_info "切换到 production 分支..."
git checkout production

# 合并当前分支到 production
print_info "合并 $CURRENT_BRANCH 分支到 production..."
git merge "$CURRENT_BRANCH" --no-ff -m "Release v$VERSION"

# 推送到远程 production 分支
print_info "推送到远程 production 分支..."
git push origin production

print_info "发布完成！Docker 镜像将开始构建。"

# 可选：切换回原分支
read -p "是否切换回 $CURRENT_BRANCH 分支？(Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    git checkout "$CURRENT_BRANCH"
    print_info "已切换回 $CURRENT_BRANCH 分支"
fi

print_info "发布流程完成！"
print_info "你可以在 GitHub Actions 中查看构建进度："
print_info "https://github.com/Pretend-to/mio-chat-backend/actions"