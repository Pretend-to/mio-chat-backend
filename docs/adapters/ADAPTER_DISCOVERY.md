# LLM 适配器自动发现机制

## 概述

本次更新实现了 LLM 适配器的自动发现机制,**移除了所有硬编码的适配器类型列表**,使系统能够自动识别和加载 `lib/chat/llm/adapters/` 目录下的所有适配器。

## 主要改进

### 1. 适配器元数据声明

每个适配器现在需要在类中声明自己的元数据:

```javascript
// lib/chat/llm/adapters/openai.js
export default class OpenAIBot extends BaseLLMAdapter {
  static getAdapterMetadata() {
    return {
      type: 'openai',                // 适配器类型标识
      requiresSpecialAuth: false     // 是否需要特殊认证(如 Vertex 的 Service Account JSON)
    }
  }
}
```

### 2. 适配器注册表

新增 `lib/chat/llm/adapters/registry.js` 提供自动发现功能:

- `getAdapterTypesSync()` - 同步获取适配器类型(仅文件扫描)
- `getAvailableAdapterTypes()` - 异步获取适配器类型(加载元数据)
- `getAdapterMetadataList()` - 获取所有适配器的完整元数据
- `isValidAdapterType()` - 验证适配器类型是否有效
- `getSpecialAuthAdapters()` - 获取需要特殊认证的适配器列表

### 3. 移除硬编码

以下位置的硬编码 `['openai', 'gemini', 'vertex']` 已全部替换为动态获取:

- ✅ `lib/server/http/controllers/configController.js` - 所有 API 接口的适配器类型验证
- ✅ `lib/config.js` - 配置加载、迁移和验证逻辑

## 添加新适配器

现在添加新适配器只需 3 步:

### 步骤 1: 创建适配器文件

在 `lib/chat/llm/adapters/` 目录下创建新文件,例如 `claude.js`:

```javascript
import BaseLLMAdapter from './base.js'

export default class ClaudeAdapter extends BaseLLMAdapter {
  // 声明元数据
  static getAdapterMetadata() {
    return {
      type: 'claude',
      requiresSpecialAuth: false  // 如果只需要 api_key 和 base_url
    }
  }

  constructor(config) {
    super(config)
    this.provider = 'claude'
  }

  // 实现其他必需方法...
}
```

### 步骤 2: 更新配置文件

在 `config/config/config.yaml` 中添加配置:

```yaml
llm_adapters:
  claude:  # 类型名必须与 getAdapterMetadata() 返回的 type 一致
    - enable: true
      name: claude-1
      api_key: your_api_key
      base_url: https://api.anthropic.com
```

### 步骤 3: 重启服务

```bash
pnpm start
```

系统会自动发现并加载新适配器,无需修改任何验证或配置代码!

## 技术细节

### 认证方式标记

`requiresSpecialAuth` 字段用于标记适配器是否需要特殊认证方式:

- `false` - 标准认证(api_key + base_url),适用于大多数适配器
- `true` - 特殊认证(如 Vertex AI 的 Service Account JSON)

这个标记主要用于配置接口中的特殊处理逻辑。

### 性能优化

- 适配器类型列表会被缓存,避免重复扫描和加载
- 配置加载时使用同步方法 `getAdapterTypesSync()`,仅通过文件名推断类型
- API 接口使用异步方法 `getAvailableAdapterTypes()`,加载完整元数据

## 向后兼容

所有现有功能保持不变:

- ✅ 配置 API 正常工作
- ✅ 适配器实例的增删改查
- ✅ 模型列表刷新
- ✅ 连接测试
- ✅ 配置验证

## 注意事项

1. **文件命名**: 适配器文件名应与类型标识一致(例如 `openai.js` → type: 'openai')
2. **元数据方法**: 必须实现静态方法 `getAdapterMetadata()`
3. **基类继承**: 必须继承 `BaseLLMAdapter`
4. **配置格式**: 配置文件中的适配器类型名必须与元数据中的 `type` 一致
