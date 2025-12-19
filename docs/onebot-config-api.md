# OneBot 配置管理 API

## 概述

OneBot 配置管理 API 提供了完整的 OneBot 协议配置管理功能，包括配置的读取、更新、验证等操作。配置数据存储在 `system_settings` 表中，与其他系统配置保持一致的管理方式。

## 认证

所有 OneBot 配置 API 都需要管理员权限，请在请求头中包含管理员访问码：

```http
X-Admin-Code: your_admin_code
```

## 配置数据结构

### OneBot 配置对象

```json
{
  "enable": false,
  "reverse_ws_url": "ws://localhost:8080/onebot/v11/ws",
  "bot_qq": "2698788044",
  "admin_qq": "1099834705",
  "token": "your_access_token",
  "plugins": {
    "options": {
      "textwraper": {
        "options": [
          {
            "value": "",
            "label": "默认"
          },
          {
            "value": "GPT",
            "label": "AI对话",
            "children": [
              {
                "value": "gptUseAPI",
                "label": "基于API",
                "preset": "#api{xxx}"
              }
            ]
          }
        ]
      }
    }
  }
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `enable` | boolean | 是 | 是否启用 OneBot 协议 |
| `reverse_ws_url` | string | 否 | 反向 WebSocket 连接地址 |
| `bot_qq` | string | 否 | 机器人 QQ 号 |
| `admin_qq` | string | 否 | 管理员 QQ 号 |
| `token` | string | 否 | 访问令牌 |
| `plugins` | object | 否 | 插件配置选项 |

## API 接口

### 1. 获取完整配置

获取包含 OneBot 配置在内的完整系统配置。

**请求**
```http
GET /api/config
X-Admin-Code: your_admin_code
```

**响应**
```json
{
  "success": true,
  "code": 0,
  "message": "success",
  "data": {
    "debug": false,
    "server": {
      "port": 3080,
      "host": "0.0.0.0"
    },
    "web": {
      "title": "Mio Chat",
      "full_screen": false,
      "beian": ""
    },
    "onebot": {
      "enable": true,
      "reverse_ws_url": "ws://localhost:8080/onebot/v11/ws",
      "bot_qq": "2698788044",
      "admin_qq": "1099834705",
      "token": "****...****",
      "plugins": {
        "options": {
          "textwraper": {
            "options": [...]
          }
        }
      }
    },
    "llm_adapters": {...},
    "models": {...}
  }
}
```

### 2. 获取 OneBot 配置

获取 OneBot 配置节点的详细信息。

**请求**
```http
GET /api/config/onebot
X-Admin-Code: your_admin_code
```

**响应**
```json
{
  "success": true,
  "code": 0,
  "message": "success",
  "data": {
    "enable": true,
    "reverse_ws_url": "ws://localhost:8080/onebot/v11/ws",
    "bot_qq": "2698788044",
    "admin_qq": "1099834705",
    "token": "****...****",
    "plugins": {
      "options": {
        "textwraper": {
          "options": [
            {
              "value": "",
              "label": "默认"
            },
            {
              "value": "GPT",
              "label": "AI对话",
              "children": [
                {
                  "value": "gptUseAPI",
                  "label": "基于API",
                  "preset": "#api{xxx}"
                }
              ]
            }
          ]
        }
      }
    }
  }
}
```

### 3. 更新 OneBot 配置

更新 OneBot 配置的全部或部分字段。

**请求**
```http
PUT /api/config/onebot
Content-Type: application/json
X-Admin-Code: your_admin_code

{
  "enable": true,
  "reverse_ws_url": "ws://localhost:8080/onebot/v11/ws",
  "bot_qq": "2698788044",
  "admin_qq": "1099834705",
  "token": "your_access_token"
}
```

**响应**
```json
{
  "success": true,
  "code": 0,
  "message": "配置节点 onebot 更新成功",
  "data": {
    "message": "配置节点 onebot 更新成功",
    "section": "onebot"
  }
}
```

### 4. 批量更新配置

在批量更新中包含 OneBot 配置。

**请求**
```http
PUT /api/config
Content-Type: application/json
X-Admin-Code: your_admin_code

{
  "onebot": {
    "enable": true,
    "reverse_ws_url": "ws://localhost:8080/onebot/v11/ws",
    "bot_qq": "2698788044",
    "admin_qq": "1099834705",
    "token": "your_access_token"
  },
  "web": {
    "title": "My Chat Bot"
  }
}
```

**响应**
```json
{
  "success": true,
  "code": 0,
  "message": "success",
  "data": {
    "message": "配置更新成功",
    "updated": ["onebot", "web"]
  }
}
```

### 5. 获取 OneBot 插件选项

获取 OneBot 插件的配置选项（用于前端界面）。

**请求**
```http
GET /api/onebot/plugins
```

**响应**
```json
{
  "success": true,
  "code": 0,
  "message": "success",
  "data": {
    "options": {
      "textwraper": {
        "options": [
          {
            "value": "",
            "label": "默认"
          },
          {
            "value": "AP",
            "label": "画图",
            "children": [
              {
                "value": "eDraw",
                "label": "绘个图",
                "preset": "#绘个图{xxx}"
              }
            ]
          }
        ]
      }
    }
  }
}
```

## 配置验证

### 验证规则

1. **enable**: 必须为布尔值
2. **reverse_ws_url**: 如果 enable 为 true，则必须提供有效的 WebSocket URL
3. **bot_qq**: 可选，应为有效的 QQ 号格式
4. **admin_qq**: 可选，应为有效的 QQ 号格式
5. **token**: 可选，用于 OneBot 协议认证

### 验证示例

**请求**
```http
POST /api/config/validate
Content-Type: application/json
X-Admin-Code: your_admin_code

{
  "onebot": {
    "enable": true,
    "reverse_ws_url": "invalid-url"
  }
}
```

**响应**
```json
{
  "success": true,
  "code": 0,
  "message": "success",
  "data": {
    "valid": false,
    "errors": [
      "onebot.reverse_ws_url 必须是有效的 WebSocket URL"
    ]
  }
}
```

## 错误处理

### 常见错误码

| 错误码 | HTTP状态码 | 说明 |
|--------|------------|------|
| 0 | 200 | 成功 |
| 1 | 400 | 请求参数错误 |
| 1 | 401 | 未授权（缺少或无效的管理员访问码） |
| 1 | 404 | 配置节点不存在 |
| 1 | 500 | 服务器内部错误 |

### 错误响应示例

```json
{
  "success": false,
  "code": 1,
  "message": "配置验证失败: onebot.reverse_ws_url 必须是有效的 WebSocket URL",
  "data": null
}
```

## 安全注意事项

### 敏感信息脱敏

在 API 响应中，敏感字段会被自动脱敏：

- `token`: 显示为 `****...****` 格式
- 其他敏感信息按需脱敏

### 权限控制

- 所有配置管理接口都需要管理员权限
- 使用 `X-Admin-Code` 请求头进行认证
- 无效的访问码会返回 401 错误

## 使用示例

### JavaScript/Node.js

```javascript
// 获取 OneBot 配置
async function getOneBotConfig() {
  const response = await fetch('/api/config/onebot', {
    headers: {
      'X-Admin-Code': 'your_admin_code'
    }
  });
  
  const result = await response.json();
  if (result.success) {
    console.log('OneBot 配置:', result.data);
  } else {
    console.error('获取配置失败:', result.message);
  }
}

// 更新 OneBot 配置
async function updateOneBotConfig(config) {
  const response = await fetch('/api/config/onebot', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Code': 'your_admin_code'
    },
    body: JSON.stringify(config)
  });
  
  const result = await response.json();
  if (result.success) {
    console.log('配置更新成功');
  } else {
    console.error('配置更新失败:', result.message);
  }
}

// 启用 OneBot
await updateOneBotConfig({
  enable: true,
  reverse_ws_url: 'ws://localhost:8080/onebot/v11/ws',
  bot_qq: '2698788044',
  admin_qq: '1099834705',
  token: 'your_access_token'
});
```

### Python

```python
import requests
import json

class OneBotConfigAPI:
    def __init__(self, base_url, admin_code):
        self.base_url = base_url
        self.headers = {
            'X-Admin-Code': admin_code,
            'Content-Type': 'application/json'
        }
    
    def get_config(self):
        """获取 OneBot 配置"""
        response = requests.get(
            f'{self.base_url}/api/config/onebot',
            headers=self.headers
        )
        return response.json()
    
    def update_config(self, config):
        """更新 OneBot 配置"""
        response = requests.put(
            f'{self.base_url}/api/config/onebot',
            headers=self.headers,
            data=json.dumps(config)
        )
        return response.json()

# 使用示例
api = OneBotConfigAPI('http://localhost:3080', 'your_admin_code')

# 获取配置
config = api.get_config()
print('当前配置:', config)

# 更新配置
result = api.update_config({
    'enable': True,
    'reverse_ws_url': 'ws://localhost:8080/onebot/v11/ws',
    'bot_qq': '2698788044',
    'admin_qq': '1099834705'
})
print('更新结果:', result)
```

### cURL

```bash
# 获取 OneBot 配置
curl -X GET http://localhost:3080/api/config/onebot \
  -H "X-Admin-Code: your_admin_code"

# 更新 OneBot 配置
curl -X PUT http://localhost:3080/api/config/onebot \
  -H "Content-Type: application/json" \
  -H "X-Admin-Code: your_admin_code" \
  -d '{
    "enable": true,
    "reverse_ws_url": "ws://localhost:8080/onebot/v11/ws",
    "bot_qq": "2698788044",
    "admin_qq": "1099834705",
    "token": "your_access_token"
  }'

# 批量更新配置
curl -X PUT http://localhost:3080/api/config \
  -H "Content-Type: application/json" \
  -H "X-Admin-Code: your_admin_code" \
  -d '{
    "onebot": {
      "enable": true,
      "reverse_ws_url": "ws://localhost:8080/onebot/v11/ws"
    }
  }'
```

## 配置生效

### 自动重载

配置更新后会自动触发以下操作：

1. **内存配置重载**: 调用 `config.reload()` 重新加载内存中的配置
2. **OneBot 服务重启**: 如果 OneBot 配置发生变化，相关服务会自动重启
3. **客户端通知**: 通过 WebSocket 向所有连接的客户端推送配置更新通知

### 手动重启

如果需要手动重启 OneBot 服务：

```bash
# 重启整个应用
npm restart

# 或者通过 API 重新加载配置
curl -X POST http://localhost:3080/api/config/reload \
  -H "X-Admin-Code: your_admin_code"
```

## 故障排除

### 常见问题

1. **配置更新后不生效**
   - 检查管理员访问码是否正确
   - 确认配置格式是否正确
   - 查看服务器日志获取详细错误信息

2. **OneBot 连接失败**
   - 检查 `reverse_ws_url` 是否正确
   - 确认目标 OneBot 实现是否正常运行
   - 验证 `token` 是否匹配

3. **权限错误**
   - 确认使用了正确的管理员访问码
   - 检查访问码是否已过期

### 调试信息

启用调试模式获取更多日志信息：

```bash
# 设置环境变量
export DEBUG=true
export NODE_ENV=development

# 或通过配置文件
curl -X PUT http://localhost:3080/api/config \
  -H "Content-Type: application/json" \
  -H "X-Admin-Code: your_admin_code" \
  -d '{"debug": true}'
```

## 测试工具

### 自动化测试

项目提供了完整的测试套件来验证 OneBot 配置 API：

```bash
# 运行所有测试
./scripts/run-tests.sh

# 或者分别运行
node scripts/quick-test-onebot-api.js      # 快速测试
node scripts/test-onebot-api.js           # 完整测试
node scripts/test-onebot-config.js        # 配置测试
```

### 测试配置

```bash
# 设置测试环境
export BASE_URL=http://localhost:3080
export ADMIN_CODE=your_admin_code

# 运行测试
./scripts/run-tests.sh
```

详细的测试说明请参考 [测试指南](../scripts/README-TESTING.md)。

## 相关文档

- [OneBot 配置迁移说明](./ONEBOT_CONFIG_MIGRATION.md)
- [系统配置 API](./config-api.md)
- [数据库初始化指南](./NEW_USER_DATABASE_INIT.md)
- [SQLite 迁移指南](./SQLITE_MIGRATION_PLAN.md)
- [测试指南](../scripts/README-TESTING.md)