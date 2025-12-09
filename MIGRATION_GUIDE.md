# 多实例配置迁移指南

## 概述

从本版本开始，系统支持为同一类型的适配器配置多个实例。例如，你可以同时配置多个 OpenAI 兼容的服务，每个使用不同的 API Key 或 Base URL。

## 配置格式变更

### 旧配置格式（仍然支持）

```yaml
debug: false

openai:
  enable: true
  api_key: 'your-key'
  base_url: 'https://api.openai.com/v1'
  guest_models:
    keywords:
      - gpt-4
  default_model: 'gpt-4.1-mini'

gemini:
  enable: false
  api_key: ''
  base_url: 'https://generativelanguage.googleapis.com'
  # ...
```

### 新配置格式（推荐）

```yaml
debug: false

llm_adapters:
  openai:
    - name: 'openai-official'  # 实例名称（可选）
      enable: true
      api_key: 'your-key-1'
      base_url: 'https://api.openai.com/v1'
      guest_models:
        keywords:
          - gpt-4
      default_model: 'gpt-4.1-mini'
    
    - name: 'openai-proxy'  # 第二个实例
      enable: true
      api_key: 'your-key-2'
      base_url: 'https://proxy.example.com/v1'
      guest_models:
        keywords:
          - gpt-3.5
      default_model: 'gpt-3.5-turbo'

  gemini:
    - name: ''  # 不指定名称时，自动命名为 gemini-1
      enable: true
      api_key: 'gemini-key'
      base_url: 'https://generativelanguage.googleapis.com'
      guest_models:
        keywords:
          - flash
      default_model: 'gemini-2.0-flash'

  vertex:
    - name: ''
      enable: false
      # ...
```

## 实例命名规则

1. **指定名称**：在配置中设置 `name` 字段
   ```yaml
   - name: 'my-custom-name'
     enable: true
     # ...
   ```

2. **自动命名**：如果不设置 `name` 或设为空字符串，系统会自动命名
   - 第一个实例：`openai-1`
   - 第二个实例：`openai-2`
   - 以此类推...

## 前端 API 变更

### `/api/base` 接口变更

**旧响应格式：**
```json
{
  "data": {
    "llm_providers": ["openai", "gemini"],
    "default_model": {
      "openai": "gpt-4.1-mini",
      "gemini": "models/gemini-2.0-flash"
    }
  }
}
```

**新响应格式：**
```json
{
  "data": {
    "llm_providers": ["openai-official", "openai-proxy", "gemini-1"],
    "default_model": {
      "openai-official": "gpt-4.1-mini",
      "openai-proxy": "gpt-3.5-turbo",
      "gemini-1": "models/gemini-2.0-flash"
    }
  }
}
```

### 前端代码适配

在发送聊天请求时，需要使用实例名称而不是适配器类型：

**旧代码：**
```javascript
const settings = {
  provider: 'openai',  // 适配器类型
  model: 'gpt-4'
}
```

**新代码：**
```javascript
const settings = {
  provider: 'openai-official',  // 实例名称
  model: 'gpt-4'
}
```

## 向后兼容性

- ✅ 旧配置格式会被**自动静默迁移**到新格式
- ✅ 启动时检测到旧格式会自动转换并保存
- ✅ 无需手动迁移，只需重启服务即可

## 迁移步骤

**好消息：系统会自动迁移！**

启动时如果检测到旧配置格式，会自动执行以下操作：
1. 将旧格式（`openai:`, `gemini:`, `vertex:`）转换为新格式（`llm_adapters:`）
2. 保留所有配置数据
3. 删除旧格式字段
4. 保存到配置文件

你只需要：
1. **备份配置**（可选但推荐）
   ```bash
   cp config/config/config.yaml config/config/config.yaml.backup
   ```

2. **重启服务**
   ```bash
   node app.js
   ```

3. **查看日志确认迁移成功**
   ```
   [INFO] 检测到旧配置格式，自动迁移到新的多实例格式...
   [INFO]   ✓ 迁移 openai 配置
   [INFO]   ✓ 迁移 gemini 配置
   [INFO]   ✓ 迁移 vertex 配置
   [INFO] 配置迁移完成，已保存到文件
   ```

4. **更新前端代码**（如果需要）
   - 默认实例名称为 `{adapterType}-1`
   - 如需自定义名称，可在配置文件中修改

## 配置示例

### 场景1：同时使用官方 OpenAI 和国内代理

```yaml
llm_adapters:
  openai:
    - name: 'openai-official'
      enable: true
      api_key: 'sk-official-key'
      base_url: 'https://api.openai.com/v1'
      default_model: 'gpt-4'
    
    - name: 'openai-cn-proxy'
      enable: true
      api_key: 'sk-proxy-key'
      base_url: 'https://proxy.cn/v1'
      default_model: 'gpt-3.5-turbo'
```

### 场景2：多个团队 API Key 隔离

```yaml
llm_adapters:
  openai:
    - name: 'team-a'
      enable: true
      api_key: 'sk-team-a-key'
      base_url: 'https://api.openai.com/v1'
      default_model: 'gpt-4'
    
    - name: 'team-b'
      enable: true
      api_key: 'sk-team-b-key'
      base_url: 'https://api.openai.com/v1'
      default_model: 'gpt-4'
```

### 场景3：测试和生产环境分离

```yaml
llm_adapters:
  openai:
## 常见问题

### Q: 我必须手动迁移到新格式吗？
A: **不需要**！系统会在启动时自动检测并迁移旧格式配置。

### Q: 迁移会丢失我的配置吗？
A: 不会。迁移过程会完整保留所有配置数据，只是改变配置的组织结构。

### Q: 迁移后能回退吗？
A: 建议在迁移前备份配置文件。如需回退，恢复备份即可。

### Q: 如何在不指定名称的情况下使用？
A: 留空 `name` 字段或不设置，系统会自动使用 `{adapterType}-{序号}` 格式命名（如 `openai-1`）。

### Q: 实例名称有什么限制？
A: 建议使用字母、数字、下划线和短横线，避免使用特殊字符和空格。
## 常见问题

### Q: 我必须迁移到新格式吗？
A: 不必。旧格式仍然完全支持，系统会自动处理兼容性。

### Q: 如何在不指定名称的情况下使用？
A: 留空 `name` 字段或不设置，系统会自动使用 `{adapterType}-{序号}` 格式命名。

### Q: 实例名称有什么限制？
A: 建议使用字母、数字、下划线和短横线，避免使用特殊字符和空格。

### Q: 可以同时使用新旧格式吗？
A: 不建议。请选择一种格式并保持一致。

## 技术细节

### 内部实现变更

1. **config.js**
   - `getLLMEnabled()` 现在返回实例数组而非适配器类型数组
   - 新增 `availableInstances` 存储已加载的实例元数据
   - 新增 `getAvailableInstancesDetail()` 获取实例详情

2. **middleware.js**
   - `loadLLMAdapters()` 现在按实例而非按类型加载适配器

3. **lib/chat/llm/index.js**
   - 适配器使用 `instanceId` 作为 key 而非 `adapterType`
   - 新增 `instanceMetadata` 存储实例的元数据
   - `handleMessage()` 支持通过 displayName 查找实例

## Vertex AI 特殊配置

Vertex AI 支持两种认证方式，每个实例可以独立配置：

### 方式1：使用 JSON 字符串（推荐）

直接在配置文件中提供服务账号 JSON：

```yaml
llm_adapters:
  vertex:
    - name: 'vertex-project-a'
      enable: true
      region: 'us-central1'
      service_account_json: '{"type":"service_account","project_id":"your-project-a","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token",...}'
      default_model: 'gemini-2.0-flash-001'
```

### 方式2：使用文件路径

指定服务账号 JSON 文件的绝对路径：

```yaml
llm_adapters:
  vertex:
    - name: 'vertex-project-b'
      enable: true
      region: 'asia-northeast1'
      auth_file_path: '/absolute/path/to/service-account.json'
      default_model: 'gemini-2.0-flash-001'
```

### 多实例配置示例

```yaml
llm_adapters:
  vertex:
    - name: 'vertex-us'
      enable: true
      region: 'us-central1'
      service_account_json: '{...}'  # 美国项目的认证
      default_model: 'gemini-2.0-flash-001'
    
    - name: 'vertex-asia'
      enable: true
      region: 'asia-northeast1'
      auth_file_path: '/path/to/asia-credentials.json'  # 亚洲项目的认证
      default_model: 'gemini-2.0-flash-001'
```

**注意：**
- 如果两个字段都配置了，优先使用 `service_account_json`
- 如果两个字段都为空，会尝试从默认路径 `config/config/vertex.json` 加载（向后兼容）

## 获取帮助

如果在迁移过程中遇到问题，请：
1. 查看日志输出
2. 确认配置文件格式正确（YAML 语法）
3. 提交 Issue 到项目仓库
