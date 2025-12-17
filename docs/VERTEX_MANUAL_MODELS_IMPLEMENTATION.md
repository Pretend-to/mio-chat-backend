# Vertex AI 适配器手动模型配置功能实现

## 概述

本文档记录了为 Vertex AI 适配器添加手动模型配置功能的完整实现过程。该功能允许用户手动配置模型列表，这些模型将与自动获取的模型合并，为用户提供更大的灵活性。

## 实现的功能

### 1. 手动模型配置字段

在 Vertex AI 适配器的配置模式中添加了 `manual_models` 字段：

```javascript
manual_models: {
  type: 'textarea',
  default: '',
  description: '手动配置的模型列表，每行一个模型名称。这些模型将与自动获取的模型合并',
  required: false,
  label: '手动配置模型',
  placeholder: 'gemini-1.5-pro\ngemini-1.5-flash\ngemini-1.0-pro',
  rows: 4
}
```

### 2. 构造函数增强

修改了 `VertexAdapter` 构造函数来处理手动配置的模型：

```javascript
constructor(config) {
  // 原有逻辑...
  
  // 处理手动配置的模型
  this.manualModels = []
  if (config.manual_models && typeof config.manual_models === 'string') {
    // 将多行文本分割为模型数组，过滤空行和空白
    this.manualModels = config.manual_models
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
  }
}
```

### 3. 模型获取逻辑增强

修改了 `_getModels` 方法来合并自动获取和手动配置的模型：

```javascript
async _getModels() {
  try {
    let models = await this.core.models()
    // 原有的自动获取和默认模型逻辑...
    
    // 添加手动配置的模型
    if (this.manualModels && this.manualModels.length > 0) {
      const manualModelObjects = this.manualModels.map((model) => {
        return { id: model }
      })
      models = [...models, ...manualModelObjects]
    }
    
    let modelList = this._groupModelsByOwner(models, this.owners)
    return this._sortModelList(modelList)
  } catch (error) {
    logger.error('Failed to get models:', error)
    throw error
  }
}
```

## 功能特性

### 1. 灵活的输入格式

- 支持多行文本输入
- 自动过滤空行和空白字符
- 每行一个模型名称

### 2. 模型合并策略

- 手动配置的模型与自动获取的模型合并
- 保持原有的模型分组和排序逻辑
- 不影响现有的默认模型机制

### 3. 配置持久化

- 手动配置的模型保存在数据库中
- 支持通过 API 进行 CRUD 操作
- 配置更新时实时生效

## API 接口

### 1. 获取适配器类型

```http
GET /api/config/adapter-types
```

返回包含 `manual_models` 字段的完整配置模式。

### 2. 添加 Vertex AI 实例

```http
POST /api/config/llm/vertex
Content-Type: application/json
x-admin-code: <admin-code>

{
  "enable": true,
  "name": "Vertex-Production",
  "region": "us-central1",
  "service_account_json": "{...}",
  "manual_models": "gemini-1.5-pro\ngemini-1.5-flash\ngemini-1.0-pro"
}
```

### 3. 更新实例配置

```http
PUT /api/config/llm/vertex/{index}
Content-Type: application/json
x-admin-code: <admin-code>

{
  "manual_models": "gemini-2.0-pro\ngemini-2.0-flash"
}
```

### 4. 删除实例

```http
DELETE /api/config/llm/vertex/{index}
x-admin-code: <admin-code>
```

## 测试覆盖

### 1. 单元测试

- **配置解析测试**: 验证手动模型字符串的正确解析
- **模型合并测试**: 验证自动获取和手动配置模型的合并逻辑
- **边界情况测试**: 空配置、空行、空白字符等

### 2. 集成测试

- **适配器元数据测试**: 验证配置模式的正确性
- **模型获取测试**: 验证完整的模型获取流程
- **错误处理测试**: 验证异常情况的处理

### 3. 端到端测试

- **API 接口测试**: 完整的 CRUD 操作测试
- **权限验证测试**: 管理员权限验证
- **数据持久化测试**: 配置保存和读取验证

## 测试脚本

创建了以下测试脚本来验证功能：

1. `scripts/test-vertex-manual-models.js` - 基础功能测试
2. `scripts/test-vertex-integration.js` - 集成测试
3. `scripts/test-vertex-manual-models-e2e.js` - 端到端测试

## 使用示例

### 1. 基本配置

```javascript
{
  "enable": true,
  "name": "Vertex-Production",
  "region": "us-central1",
  "service_account_json": "{...}",
  "manual_models": "gemini-1.5-pro\ngemini-1.5-flash"
}
```

### 2. 混合模型配置

系统会自动合并：
- 自动获取的 Gemini 模型
- 默认的 Claude 模型
- 手动配置的自定义模型

最终用户可以使用所有这些模型。

## 兼容性

### 1. 向后兼容

- 现有配置不受影响
- `manual_models` 字段为可选
- 不影响现有的模型获取逻辑

### 2. 前向兼容

- 配置模式设计支持未来扩展
- 模型合并逻辑可以轻松扩展
- API 接口遵循现有规范

## 注意事项

### 1. 模型验证

- 手动配置的模型名称不会进行有效性验证
- 用户需要确保模型名称的正确性
- 无效的模型名称可能导致调用失败

### 2. 性能考虑

- 手动配置的模型不会增加额外的网络请求
- 模型合并在内存中进行，性能影响最小
- 建议合理控制手动配置模型的数量

### 3. 安全考虑

- 手动模型配置需要管理员权限
- 配置数据经过脱敏处理
- 支持增量更新，避免敏感信息覆盖

## 总结

Vertex AI 适配器的手动模型配置功能已经完全实现并通过了全面的测试。该功能提供了：

- ✅ 灵活的手动模型配置
- ✅ 智能的模型合并策略
- ✅ 完整的 API 支持
- ✅ 全面的测试覆盖
- ✅ 良好的向后兼容性

用户现在可以通过配置界面或 API 接口轻松地为 Vertex AI 适配器添加自定义模型，大大提高了系统的灵活性和可用性。