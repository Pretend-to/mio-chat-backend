# 配置管理 API 文档

完整的配置 CRUD API，支持热更新，无需重启服务。

## 目录

- [认证](#认证)
- [配置查询](#配置查询)
- [配置修改](#配置修改)
- [LLM 适配器管理](#llm-适配器管理)
- [模型列表刷新](#模型列表刷新)
- [配置验证与重置](#配置验证与重置)
- [错误码](#错误码)

---

## 认证

所有配置管理 API 需要提供管理员验证码 `admin_code`（在配置文件 `web.admin_code` 中设置）。

### 认证方式

支持以下三种方式之一：

1. **请求头**（推荐）
   ```http
   X-Admin-Code: 123456
   ```

2. **查询参数**
   ```http
   GET /api/config?admin_code=123456
   ```

3. **请求体**
   ```json
   {
     "admin_code": "123456",
     ...
   }
   ```

### 认证失败响应

```json
{
  "error": "访问被拒绝",
  "message": "需要提供有效的管理员验证码"
}
```

**状态码**: `403 Forbidden`

---

## 配置查询

### 1. 获取完整配置

获取整个配置文件，敏感信息（API keys、tokens、passwords）会被脱敏。

**请求**

```http
GET /api/config
X-Admin-Code: 123456
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "debug": false,
    "onebot": {
      "enable": true,
      "reverse_ws_url": "ws://example.com:2536/OneBotv11",
      "bot_qq": "3038848622",
      "admin_qq": "1099834705",
      "token": "Mio***nly"
    },
    "server": {
      "port": 3080,
      "host": "0.0.0.0"
    },
    "web": {
      "admin_code": "123***456",
      "user_code": "",
      "beian": "",
      "full_screen": true,
      "title": "MioChat"
    },
    "llm_adapters": {
      "openai": [
        {
          "name": "主力OpenAI",
          "enable": true,
          "api_key": "sk-kQK***xtBA",
          "base_url": "https://track.krumio.com/v1",
          "default_model": "gpt-4.1-mini",
          "guest_models": {
            "keywords": ["gpt-4.1-mini"],
            "full_name": ["gemini-2.0-flash", "deepseek-chat"]
          }
        }
      ],
      "gemini": [...],
      "vertex": [...]
    }
  }
}
```

**状态码**: `200 OK`

---

### 2. 获取指定配置节点

获取配置的某个特定部分。

**请求**

```http
GET /api/config/:section
X-Admin-Code: 123456
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| section | string | 配置节点名称，如 `server`、`web`、`llm_adapters`、`onebot` |

**示例**

```http
GET /api/config/server
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "port": 3080,
    "host": "0.0.0.0"
  }
}
```

**错误响应**

```json
{
  "code": 1,
  "message": "配置节点 invalid_section 不存在",
  "data": null
}
```

**状态码**: 
- `200 OK` - 成功
- `404 Not Found` - 节点不存在

---

## 配置修改

### 3. 更新完整配置

更新整个配置文件（部分更新，使用深度合并）。

**请求**

```http
PUT /api/config
Content-Type: application/json
X-Admin-Code: 123456

{
  "server": {
    "port": 8080
  },
  "web": {
    "title": "New Title"
  }
}
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "配置更新成功，请重启服务使配置生效"
  }
}
```

**注意事项**

- ⚠️ 非 LLM 适配器的配置更改需要**重启服务**才能生效
- 使用深度合并，只更新提供的字段
- 自动进行配置验证

**状态码**: 
- `200 OK` - 成功
- `400 Bad Request` - 验证失败

---

### 4. 更新指定配置节点

更新配置的某个特定部分。

**请求**

```http
PUT /api/config/:section
Content-Type: application/json
X-Admin-Code: 123456

{
  "port": 8080,
  "host": "127.0.0.1"
}
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| section | string | 配置节点名称 |

**示例**

```http
PUT /api/config/server
Content-Type: application/json

{
  "port": 8080
}
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "配置节点 server 更新成功，请重启服务使配置生效",
    "section": "server"
  }
}
```

**状态码**: 
- `200 OK` - 成功
- `404 Not Found` - 节点不存在
- `400 Bad Request` - 验证失败

---

## LLM 适配器管理

所有 LLM 适配器操作支持**热更新**，无需重启服务。

### 5. 添加适配器实例

为指定类型的 LLM 适配器添加新实例。

**请求**

```http
POST /api/config/llm/:adapterType
Content-Type: application/json
X-Admin-Code: 123456

{
  "name": "我的 OpenAI",
  "enable": true,
  "api_key": "sk-xxxxxxxxxxxx",
  "base_url": "https://api.openai.com/v1",
  "default_model": "gpt-4o",
  "guest_models": {
    "keywords": ["gpt"],
    "full_name": ["gpt-4o", "gpt-4o-mini"]
  }
}
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| adapterType | string | 适配器类型：`openai`、`gemini`、`vertex` |

**请求体（OpenAI）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 实例名称（为空时自动生成，如 `openai-1`） |
| enable | boolean | 是 | 是否启用 |
| api_key | string | 是 | API Key |
| base_url | string | 是 | API 基础 URL |
| default_model | string | 是 | 默认模型 |
| guest_models | object | 否 | 访客可用模型 |
| guest_models.keywords | string[] | 否 | 关键词匹配（如 `["gpt"]`） |
| guest_models.full_name | string[] | 否 | 完整模型名称列表 |

**请求体（Gemini）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 实例名称 |
| enable | boolean | 是 | 是否启用 |
| api_key | string | 是 | Google AI API Key |
| base_url | string | 是 | API 基础 URL |
| default_model | string | 是 | 默认模型（如 `gemini-2.0-flash`） |
| guest_models | object | 否 | 访客可用模型 |

**请求体（Vertex AI）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 实例名称 |
| enable | boolean | 是 | 是否启用 |
| region | string | 是 | Vertex AI 区域（如 `us-central1`、`asia-northeast1`） |
| service_account_json | string | 二选一 | 服务账号 JSON 字符串（完整 JSON 对象） |
| auth_file_path | string | 二选一 | 服务账号 JSON 文件的绝对路径 |
| models | string[] | 否 | 默认模型列表（当无法自动获取时使用，**Claude 模型必须在此配置**） |
| default_model | string | 是 | 默认模型 |
| guest_models | object | 否 | 访客可用模型 |

**重要说明（Vertex AI）**

1. **区域配置**：`region` 必须是有效的 GCP 区域，常用区域：
   - `us-central1`（美国中部）
   - `us-east4`（美国东部）
   - `asia-northeast1`（日本东京）
   - `europe-west4`（荷兰）

2. **认证配置**（二选一）：
   - `service_account_json`：直接提供服务账号 JSON 字符串
   - `auth_file_path`：提供 JSON 文件的绝对路径

3. **模型列表**：`models` 数组用于：
   - Claude 模型（**必须**显式配置，如 `claude-3-5-sonnet-v2@20241022`）
   - 网络异常时的备用模型列表
   - 私有模型或自定义模型

4. **Gemini 备用**：如果配置了 Gemini 实例，Vertex 会自动使用它作为备用（通过 `geminiConfig`）

**Vertex AI 配置示例**

```json
{
  "name": "Vertex 主实例",
  "enable": true,
  "region": "us-central1",
  "service_account_json": "{\"type\":\"service_account\",\"project_id\":\"my-project\",\"private_key_id\":\"...\",\"private_key\":\"...\",\"client_email\":\"...\",\"client_id\":\"...\"}",
  "models": [
    "gemini-2.0-flash-001",
    "gemini-1.5-pro-002",
    "claude-3-5-sonnet-v2@20241022",
    "claude-3-5-haiku@20241022"
  ],
  "default_model": "gemini-2.0-flash-001",
  "guest_models": {
    "keywords": ["flash", "haiku"],
    "full_name": ["claude-3-5-sonnet-v2@20241022"]
  }
}
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "openai 适配器实例添加成功",
    "adapterType": "openai",
    "instanceId": "adp_550e8400-e29b-41d4-a716-446655440000",
    "providers": ["openai-1", "我的 OpenAI"],
    "models": {
      "openai-1": [...],
      "我的 OpenAI": [...]
    }
  }
}
```

**返回字段说明**

| 字段 | 说明 |
|------|------|
| instanceId | 后端生成的稳定实例 ID |
| providers | 所有可用的适配器实例名称列表 |
| models | 每个实例的模型列表（热更新后的最新数据） |

**特性**

- ✅ **热更新**：立即生效，无需重启
- ✅ **自动命名**：name 为空时自动生成（如 `openai-1`、`openai-2`）
- ✅ **模型刷新**：添加后自动获取模型列表
- ✅ **失败回滚**：如果 API key 无效，会在返回的 `models` 中为空

**状态码**: 
- `200 OK` - 成功
- `400 Bad Request` - 参数错误

---

### 6. 更新适配器实例

更新指定的适配器实例配置。

每个实例都会由后端生成稳定的 `id`（格式为 `adp_<UUID>`）。更新、删除和刷新接口只接受该 ID，数字数组索引不再是合法的实例身份。

**请求**

```http
PUT /api/config/llm/:adapterType/:instanceId
Content-Type: application/json
X-Admin-Code: 123456

{
  "name": "更新后的名称",
  "enable": true,
  "api_key": "sk-new-key-xxxx",
  "default_model": "gpt-4o"
}
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| adapterType | string | 适配器类型：`openai`、`gemini`、`vertex` |
| instanceId | string | 实例稳定 ID（例如 `adp_...`） |

**请求体**

完整的实例配置（将完全替换原配置）。

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "openai 适配器实例更新成功",
    "adapterType": "openai",
    "instanceId": "adp_550e8400-e29b-41d4-a716-446655440000",
    "providers": ["更新后的名称"],
    "models": {
      "更新后的名称": [...]
    }
  }
}
```

**特性**

- ✅ **热更新**：立即生效
- ✅ **自动重载**：更新后自动重新加载所有适配器
- ✅ **模型刷新**：返回最新的模型列表

**状态码**: 
- `200 OK` - 成功
- `404 Not Found` - 实例不存在
- `400 Bad Request` - 参数错误

---

### 7. 删除适配器实例

删除指定的适配器实例。

**请求**

```http
DELETE /api/config/llm/:adapterType/:instanceId
X-Admin-Code: 123456
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| adapterType | string | 适配器类型：`openai`、`gemini`、`vertex` |
| instanceId | string | 实例稳定 ID（例如 `adp_...`） |

**示例**

```http
DELETE /api/config/llm/openai/adp_550e8400-e29b-41d4-a716-446655440000
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "openai 适配器实例删除成功",
    "adapterType": "openai",
    "providers": ["openai-1"],
    "models": {
      "openai-1": [...]
    }
  }
}
```

**特性**

- ✅ **热更新**：立即生效
- ✅ **自动重载**：删除后重新加载剩余适配器

**状态码**: 
- `200 OK` - 成功
- `404 Not Found` - 实例不存在
- `400 Bad Request` - 索引无效

---

## 模型列表刷新

当 LLM 提供商发布新模型时，可以刷新模型列表而无需修改配置或重启服务。

### 8. 刷新所有适配器模型列表

重新从所有 LLM 提供商获取最新的模型列表。

**请求**

```http
POST /api/config/refresh-models
X-Admin-Code: 123456
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "所有适配器模型列表刷新成功",
    "providers": ["openai-1", "gemini-1"],
    "models": {
      "openai-1": [
        {
          "owner": "OpenAI",
          "models": [
            "gpt-4o",
            "gpt-4o-mini",
            "gpt-5",
            "o3-mini"
          ]
        }
      ],
      "gemini-1": [...]
    }
  }
}
```

**特性**

- ✅ **热刷新**：无需重启服务
- ✅ **批量更新**：一次刷新所有已启用的适配器
- ✅ **最新数据**：直接从 LLM 提供商 API 获取

**使用场景**

- 🆕 LLM 提供商发布新模型（如 GPT-5、Gemini-3）
- 🔧 API key 权限变更导致可用模型变化
- 🔍 定期同步最新模型列表

**状态码**: `200 OK`

---

### 9. 刷新单个适配器实例模型列表

只刷新指定实例的模型列表。

**请求**

```http
POST /api/config/llm/:adapterType/:instanceId/refresh-models
X-Admin-Code: 123456
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| adapterType | string | 适配器类型：`openai`、`gemini`、`vertex` |
| instanceId | string | 实例稳定 ID（例如 `adp_...`） |

**示例**

```http
POST /api/config/llm/openai/adp_550e8400-e29b-41d4-a716-446655440000/refresh-models
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "openai 适配器实例 #0 模型列表刷新成功",
    "providers": ["openai-1"],
    "models": {
      "openai-1": [...]
    }
  }
}
```

**特性**

- ✅ **精准刷新**：只影响指定实例
- ✅ **快速响应**：比刷新全部更快
- ✅ **独立操作**：不影响其他实例

**状态码**: 
- `200 OK` - 成功
- `404 Not Found` - 实例不存在

---

## 配置验证与重置

### 10. 验证配置

验证配置文件的有效性，不保存。

**请求**

```http
POST /api/config/validate
Content-Type: application/json
X-Admin-Code: 123456

{
  "server": {
    "port": 999999
  }
}
```

**响应（验证失败）**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "valid": false,
    "errors": [
      "server.port 必须在 1-65535 之间"
    ]
  }
}
```

**响应（验证成功）**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "valid": true,
    "errors": []
  }
}
```

**验证规则**

- 端口范围：1-65535
- 必填字段检查
- 数据类型验证

**状态码**: `200 OK`

---

### 11. 重置配置

将配置重置为示例配置（`config.example.yaml`）。

**请求**

```http
POST /api/config/reset
X-Admin-Code: 123456
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "配置已重置为示例配置，请重启服务使配置生效"
  }
}
```

**警告**

- ⚠️ **危险操作**：将清除所有当前配置
- ⚠️ **需要重启**：重置后必须重启服务

**状态码**: `200 OK`

---

## 错误码

### 标准响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

### 错误响应格式

```json
{
  "code": 1,
  "message": "错误描述",
  "data": null
}
```

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 403 | 认证失败（admin_code 错误） |
| 404 | 资源不存在（配置节点或实例不存在） |
| 500 | 服务器内部错误 |

### 常见错误

#### 1. 认证失败

```json
{
  "error": "访问被拒绝",
  "message": "需要提供有效的管理员验证码"
}
```

**状态码**: `403`

---

#### 2. 实例不存在

```json
{
  "code": 1,
  "message": "openai 适配器实例 #5 不存在",
  "data": null
}
```

**状态码**: `404`

---

#### 3. 参数验证失败

```json
{
  "code": 1,
  "message": "配置验证失败: server.port 必须在 1-65535 之间",
  "data": null
}
```

**状态码**: `400`

---

#### 4. 无效的适配器类型

```json
{
  "code": 1,
  "message": "无效的适配器类型，支持: openai, gemini, vertex",
  "data": null
}
```

**状态码**: `400`

---

## 完整使用示例

### 场景 1: 添加新的 OpenAI 实例

```bash
curl -X POST http://localhost:3080/api/config/llm/openai \
  -H "X-Admin-Code: 123456" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "备用 OpenAI",
    "enable": true,
    "api_key": "sk-xxxxxxxxxxxx",
    "base_url": "https://api.openai.com/v1",
    "default_model": "gpt-4o",
    "guest_models": {
      "keywords": ["gpt-4"],
      "full_name": ["gpt-4o", "gpt-4o-mini"]
    }
  }'
```

**返回**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "openai 适配器实例添加成功",
    "adapterType": "openai",
    "instanceId": "adp_550e8400-e29b-41d4-a716-446655440000",
    "providers": ["openai-1", "备用 OpenAI"],
    "models": {
      "openai-1": [...],
      "备用 OpenAI": [...]
    }
  }
}
```

---

### 场景 2: 更新实例的 API Key

```bash
curl -X PUT http://localhost:3080/api/config/llm/openai/adp_550e8400-e29b-41d4-a716-446655440000 \
  -H "X-Admin-Code: 123456" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "主力 OpenAI",
    "enable": true,
    "api_key": "sk-new-key-xxxx",
    "base_url": "https://api.openai.com/v1",
    "default_model": "gpt-4o"
  }'
```

---

### 场景 3: OpenAI 发布 GPT-5，刷新模型列表

```bash
curl -X POST http://localhost:3080/api/config/refresh-models \
  -H "X-Admin-Code: 123456"
```

**返回最新模型列表，包括 GPT-5**

---

### 场景 4: 删除不需要的实例

```bash
curl -X DELETE http://localhost:3080/api/config/llm/openai/adp_550e8400-e29b-41d4-a716-446655440000 \
  -H "X-Admin-Code: 123456"
```

---

### 场景 5: 批量配置（Python 示例）

```python
import requests

BASE_URL = "http://localhost:3080"
ADMIN_CODE = "123456"
headers = {"X-Admin-Code": ADMIN_CODE, "Content-Type": "application/json"}

# 1. 获取当前配置
response = requests.get(f"{BASE_URL}/api/config", headers=headers)
config = response.json()["data"]
print(f"当前 providers: {len(config['llm_adapters']['openai'])} 个")

# 2. 添加新实例
new_instance = {
    "name": "测试实例",
    "enable": True,
    "api_key": "sk-test",
    "base_url": "https://api.openai.com/v1",
    "default_model": "gpt-4o"
}
response = requests.post(
    f"{BASE_URL}/api/config/llm/openai",
    headers=headers,
    json=new_instance
)
result = response.json()["data"]
print(f"添加成功，当前 providers: {result['providers']}")

# 3. 刷新模型列表
response = requests.post(
    f"{BASE_URL}/api/config/refresh-models",
    headers=headers
)
models = response.json()["data"]["models"]
print(f"模型列表已刷新，共 {len(models)} 个 provider")

# 4. 删除测试实例
    instance_id = result['instanceId']
response = requests.delete(
    f"{BASE_URL}/api/config/llm/openai/{instance_id}",
    headers=headers
)
print("测试实例已删除")
```

---

## 最佳实践

### 1. 配置备份

修改配置前先备份：

```bash
cp config/config/config.yaml config/config/config.yaml.backup
```

### 2. 分步更新

对于复杂更新，先验证再应用：

```bash
# 1. 验证配置
curl -X POST http://localhost:3080/api/config/validate \
  -H "X-Admin-Code: 123456" \
  -H "Content-Type: application/json" \
  -d @new-config.json

# 2. 确认无误后更新
curl -X PUT http://localhost:3080/api/config \
  -H "X-Admin-Code: 123456" \
  -H "Content-Type: application/json" \
  -d @new-config.json
```

### 3. 定期刷新模型

建议每周刷新一次模型列表：

```bash
# 添加到 crontab
0 0 * * 0 curl -X POST http://localhost:3080/api/config/refresh-models -H "X-Admin-Code: 123456"
```

### 4. 监控实例状态

通过检查返回的 `models` 字段判断实例是否正常：

```python
response = requests.post(
    f"{BASE_URL}/api/config/refresh-models",
    headers=headers
)
models = response.json()["data"]["models"]

for provider, model_list in models.items():
    if not model_list:
        print(f"⚠️ {provider} 无可用模型，请检查配置")
```

---

## 热更新机制说明

### 什么是热更新？

热更新允许在**不重启服务**的情况下，动态加载新的配置。

### 哪些操作支持热更新？

✅ **支持热更新**：
- 添加 LLM 适配器实例
- 更新 LLM 适配器实例
- 删除 LLM 适配器实例
- 刷新模型列表

❌ **需要重启**：
- 修改服务器端口、主机
- 修改 OneBot 配置
- 修改 Web 配置

### 热更新流程

1. **保存配置**：将更改写入 `config.yaml`
2. **重载配置**：重新读取配置文件
3. **清空实例**：清空旧的 LLM 适配器实例
4. **重新加载**：根据新配置重新初始化适配器
5. **获取模型**：从 LLM 提供商获取最新模型列表
6. **返回结果**：返回更新后的 providers 和 models

### 热更新时间

- 通常在 **3-10 秒**内完成
- 取决于 LLM API 响应速度
- 期间旧实例仍可正常使用

---

## 安全注意事项

### 1. 保护 admin_code

```yaml
# ❌ 不要使用弱密码
web:
  admin_code: "123456"

# ✅ 使用强密码
web:
  admin_code: "Xy9$mK2#pL8@qR5"
```

### 2. HTTPS 传输

生产环境务必使用 HTTPS：

```nginx
server {
    listen 443 ssl;
    server_name api.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location /api/config {
        proxy_pass http://localhost:3080;
    }
}
```

### 3. IP 白名单

限制配置 API 访问：

```nginx
location /api/config {
    allow 192.168.1.0/24;
    deny all;
    proxy_pass http://localhost:3080;
}
```

### 4. 敏感信息脱敏

API 返回的配置已自动脱敏：

```json
{
  "api_key": "sk-kQK***xtBA",
  "token": "Mio***nly",
  "admin_code": "123***456"
}
```

---

## 版本历史

### v1.0.0 (2025-12-09)

- ✅ 完整的配置 CRUD API
- ✅ LLM 适配器热更新
- ✅ 模型列表刷新功能
- ✅ 配置验证与重置
- ✅ 敏感信息自动脱敏

---

## 技术支持

如有问题，请查看：

- 📖 [项目文档](../README.md)
- 🐛 [Issue Tracker](https://github.com/Pretend-to/mio-chat-backend/issues)
- 💬 讨论区

---

**最后更新**: 2025-12-09
