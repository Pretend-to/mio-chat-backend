# 🚀 MioChat 生产环境部署指南

本中心提供 MioChat 在生产环境下的各种高级部署方案。

## 1. 使用 Docker Compose (推荐)

这是最稳定的生产部署方式，已预设好持久化卷和环境变量。

### 环境要求
- Docker 20.10+
- Docker Compose v2.0+

### 部署步骤
1. 克隆项目并进入目录。
2. 拷贝并配置环境变量：`cp .env.example .env`。
3. 启动容器：`docker compose up -d`。

---

## 2. 使用 PM2 (源码部署)

如果你希望直接在宿主机运行以获得最佳性能，建议使用 PM2 进行进程管理。

### 配置文件示例 (`config/pm2.json`)
```json
{
  "apps": [
    {
      "name": "mio-chat-backend",
      "script": "app.js",
      "instances": 1,
      "autorestart": true,
      "watch": false,
      "max_memory_restart": "1G",
      "env": {
        "NODE_ENV": "production",
        "PORT": 3000
      }
    }
  ]
}
```

### 启动命令
```bash
pnpm install
pnpm run init
pm2 start config/pm2.json
```

---

## 3. Nginx 反向代理配置

建议使用 Nginx 作为前置代理，处理 SSL 和 WebSocket。

### 完整配置示例
```nginx
# 在 http {} 块中添加压缩支持
map $http_accept_encoding $enc {
    default         "";
    "~*br"          "br";
    "~*gzip"        "gzip";
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 静态资源缓存 (由后端 express-static-gzip 处理)
    location /assets/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache my_cache;
        proxy_cache_valid 200 7d;
        add_header X-Cache-Status $upstream_cache_status;
    }

    # Socket.IO WebSocket 支持
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API 与 其他路由
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 4. Systemd 服务管理

如果你不使用 PM2，可以使用 Linux 原生的 Systemd。

创建 `/etc/systemd/system/mio-chat.service`:
```ini
[Unit]
Description=Mio-Chat Backend Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/mio-chat-backend
ExecStart=/usr/bin/node app.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

---

## 5. 常见问题排查
- **WebSocket 连接失败**：请检查 Nginx 是否正确转发了 `Upgrade` 和 `Connection` 请求头。
- **文件上传限制**：Nginx 默认限制为 1M，请调大 `client_max_body_size 50M;`。
- **权限问题**：确保 `output` 和 `plugins` 目录对运行用户有读写权限。
