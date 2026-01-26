# 使用 Node.js 20 LTS Alpine 镜像（支持 chrome-devtools-mcp）
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 安装必要的系统工具和 Chrome（用于 puppeteer）
RUN apk add --no-cache \
    curl \
    bash \
    python3 \
    py3-pip \
    uv \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    git \
    && npm install -g pnpm

# 复制 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml* ./

# 安装 Node.js 依赖
# 跳过 puppeteer 的 Chromium 下载（使用系统安装的）
RUN PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    pnpm install --frozen-lockfile --ignore-scripts

# 生成 Prisma 客户端
RUN pnpm run db:generate

# 创建 logs 目录
RUN mkdir -p logs

# 复制源代码
COPY . .

# 创建非 root 用户（安全最佳实践）
RUN addgroup -g 1001 -S nodejs && \
    adduser -S miochat -u 1001

# 更改文件所有权
RUN chown -R miochat:nodejs /app

# 切换到非 root 用户
USER miochat

# 暴露端口（支持环境变量配置，默认 3080）
EXPOSE 3080

# 健康检查（支持动态端口）
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3080}/api/health || exit 1

# 设置环境变量
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PORT=3080 \
    HOST=0.0.0.0 \
    NODE_ENV=production

# 初始化数据库并启动应用
CMD ["sh", "-c", "pnpm run db:push && node app.js"]