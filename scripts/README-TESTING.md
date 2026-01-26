# OneBot API 测试指南

## 概述

本目录包含了用于测试 OneBot 配置 API 的脚本和工具。

## 测试脚本

### 1. 完整测试脚本 (`test-onebot-api.js`)

全面测试所有 OneBot 配置 API 接口，包括：
- 获取完整配置
- 获取 OneBot 配置节点
- 更新 OneBot 配置
- 批量更新配置
- 获取插件选项
- 配置验证
- 权限控制

**使用方法：**
```bash
# 基本使用
node scripts/test-onebot-api.js

# 使用环境变量
BASE_URL=http://localhost:3080 ADMIN_CODE=your_code node scripts/test-onebot-api.js

# 导出测试结果
EXPORT_RESULTS=true node scripts/test-onebot-api.js
```

### 2. 快速测试脚本 (`quick-test-onebot-api.js`)

快速验证核心接口是否可用：

```bash
# 快速测试
node scripts/quick-test-onebot-api.js

# 指定服务器地址
BASE_URL=http://your-server:3080 ADMIN_CODE=your_code node scripts/quick-test-onebot-api.js
```

### 3. 配置测试脚本 (`test-onebot-config.js`)

测试 OneBot 配置的加载和一致性：

```bash
node scripts/test-onebot-config.js
```

## 环境配置

### 方式 1: 环境变量

```bash
export BASE_URL=http://localhost:3080
export ADMIN_CODE=your_admin_code
export EXPORT_RESULTS=true
```

### 方式 2: .env 文件

复制 `test-config.example.env` 为 `.env` 并修改配置：

```bash
cp scripts/test-config.example.env .env
# 编辑 .env 文件
```

## 获取管理员访问码

### 方法 1: 使用脚本

```bash
node scripts/get-admin-code.js
```

### 方法 2: 查看数据库

```sql
SELECT value FROM system_settings WHERE key = 'admin_code';
```

### 方法 3: 查看启动日志

应用启动时会在日志中显示管理员访问码。

## 测试前准备

1. **确保服务运行**
   ```bash
   npm start
   # 或
   node app.js
   ```

2. **确保数据库初始化**
   ```bash
   node scripts/initialize-defaults.js
   ```

3. **获取管理员访问码**
   ```bash
   node scripts/get-admin-code.js
   ```

## 测试示例

### 完整测试流程

```bash
# 1. 启动服务
npm start &

# 2. 等待服务启动
sleep 5

# 3. 获取管理员访问码
ADMIN_CODE=$(node scripts/get-admin-code.js | grep "管理员访问码" | cut -d: -f2 | tr -d ' ')

# 4. 运行完整测试
ADMIN_CODE=$ADMIN_CODE node scripts/test-onebot-api.js

# 5. 运行快速测试
ADMIN_CODE=$ADMIN_CODE node scripts/quick-test-onebot-api.js
```

### CI/CD 集成

```yaml
# GitHub Actions 示例
- name: Test OneBot API
  run: |
    npm start &
    sleep 10
    ADMIN_CODE=$(node scripts/get-admin-code.js | grep -o '[a-zA-Z0-9]\{32\}')
    ADMIN_CODE=$ADMIN_CODE node scripts/test-onebot-api.js
  env:
    BASE_URL: http://localhost:3080
    EXPORT_RESULTS: true
```

## 测试结果

### 控制台输出

测试脚本会在控制台输出详细的测试过程和结果：

```
🚀 开始 OneBot 配置 API 测试
测试目标: http://localhost:3080

🧪 测试 1: GET /api/config - 获取完整配置
✅ 获取完整配置
   OneBot enable: false

🧪 测试 2: GET /api/config/onebot - 获取 OneBot 配置节点
✅ 获取 OneBot 配置节点
   enable: false, bot_qq: 2698788044

📊 测试结果统计
总测试数: 7
通过: 7
失败: 0
成功率: 100.0%
```

### JSON 结果文件

设置 `EXPORT_RESULTS=true` 时，会生成 `onebot-api-test-results.json` 文件：

```json
{
  "timestamp": "2025-12-19T10:30:00.000Z",
  "baseUrl": "http://localhost:3080",
  "summary": {
    "total": 7,
    "passed": 7,
    "failed": 0
  },
  "tests": [
    {
      "test": "获取完整配置",
      "success": true,
      "details": "OneBot enable: false",
      "timestamp": "2025-12-19T10:30:01.000Z"
    }
  ]
}
```

## 故障排除

### 常见问题

1. **连接被拒绝**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:3080
   ```
   - 确保服务正在运行
   - 检查端口是否正确

2. **401 未授权**
   ```
   ❌ HTTP 401: Unauthorized
   ```
   - 检查管理员访问码是否正确
   - 确保访问码未过期

3. **404 接口不存在**
   ```
   ❌ HTTP 404: Not Found
   ```
   - 检查 API 路径是否正确
   - 确保使用的是正确的服务版本

4. **配置不存在**
   ```
   ❌ 响应中缺少 onebot 配置
   ```
   - 运行初始化脚本：`node scripts/initialize-defaults.js`
   - 检查数据库中是否存在 OneBot 配置

### 调试模式

启用详细日志：

```bash
DEBUG=true node scripts/test-onebot-api.js
```

### 手动验证

使用 cURL 手动测试接口：

```bash
# 获取管理员访问码
ADMIN_CODE=$(node scripts/get-admin-code.js | grep -o '[a-zA-Z0-9]\{32\}')

# 测试获取配置
curl -H "X-Admin-Code: $ADMIN_CODE" http://localhost:3080/api/config/onebot

# 测试更新配置
curl -X PUT \
  -H "Content-Type: application/json" \
  -H "X-Admin-Code: $ADMIN_CODE" \
  -d '{"enable": false}' \
  http://localhost:3080/api/config/onebot
```

## 自动化测试

### 定时测试

```bash
# 添加到 crontab
0 */6 * * * cd /path/to/project && ADMIN_CODE=your_code node scripts/quick-test-onebot-api.js
```

### 监控集成

可以将测试结果集成到监控系统中：

```bash
# 将测试结果发送到监控系统
node scripts/test-onebot-api.js && curl -X POST https://your-monitor.com/api/health -d '{"status": "ok"}'
```

## 贡献

如果发现测试脚本的问题或需要添加新的测试用例，请：

1. 创建新的测试函数
2. 添加到测试套件中
3. 更新文档
4. 提交 Pull Request