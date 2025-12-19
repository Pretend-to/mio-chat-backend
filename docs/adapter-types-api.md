# 适配器类型 API 文档

## 概述

适配器类型接口用于获取系统中可用的 LLM 适配器类型和相关元数据信息，帮助前端动态构建适配器配置界面。

## 接口详情

### 获取适配器类型

**接口地址：** `GET /api/config/adapter-types`

**认证方式：** 需要管理员验证码（`x-admin-code` 头部）

**请求示例：**
```bash
curl -H "x-admin-code: YOUR_ADMIN_CODE" \
     http://127.0.0.1:3000/api/config/adapter-types
```

**响应格式：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "types": ["deepseek", "gemini", "openai", "vertex"],
    "adapters": [
      {
        "type": "openai",
        "name": "OpenAI",
        "description": "OpenAI GPT 系列模型适配器，支持 GPT-3.5、GPT-4 等模型",
        "supportedFeatures": ["chat", "streaming", "function_calling", "vision"],
        "initialConfigSchema": {
          "enable": {
            "type": "boolean",
            "default": true,
            "description": "是否启用此适配器实例",
            "required": true,
            "label": "启用"
          },
          "api_key": {
            "type": "password",
            "default": "",
            "description": "OpenAI API 密钥，支持多个密钥用逗号分隔",
            "required": true,
            "label": "API Key",
            "placeholder": "API Key"
          }
        }
      }
    ],
    "count": 4
  }
}
```

## 响应字段说明

### 根级字段
- `types`: 适配器类型列表（字符串数组）
- `adapters`: 适配器详细信息列表
- `count`: 适配器总数

### 适配器对象字段
- `type`: 适配器类型标识符
- `name`: 适配器显示名称
- `description`: 适配器描述信息
- `supportedFeatures`: 支持的功能特性列表
- `initialConfigSchema`: 初始配置模式定义

### 配置模式字段 (initialConfigSchema)
每个配置字段包含以下属性：
- `type`: 字段类型 (`string`, `password`, `url`, `boolean`, `select`, `textarea`, `array`)
- `default`: 默认值
- `description`: 字段描述
- `required`: 是否必填
- `label`: 显示标签
- `placeholder`: 占位符文本（可选）
- `options`: 选择框选项（仅 `select` 类型）
- `validation`: 验证规则（可选）
- `readonly`: 是否只读（可选）
- `rows`: 文本区域行数（仅 `textarea` 类型）

## 支持的适配器类型

### OpenAI
- **类型：** `openai`
- **名称：** OpenAI
- **认证：** API Key
- **支持功能：** 聊天、流式输出、函数调用、视觉理解
- **配置字段：**
  - `enable` (boolean): 是否启用，默认 `true`
  - `name` (string): 实例名称，可选
  - `api_key` (password): API 密钥，必填，支持多个密钥用逗号分隔
  - `base_url` (url): API 基础 URL，默认 `https://api.openai.com/v1`

### Google Gemini
- **类型：** `gemini`
- **名称：** Google Gemini
- **认证：** API Key
- **支持功能：** 聊天、流式输出、视觉理解、多模态
- **配置字段：**
  - `enable` (boolean): 是否启用，默认 `true`
  - `name` (string): 实例名称，可选
  - `api_key` (password): Google AI Studio API 密钥，必填
  - `base_url` (url): API 基础 URL，默认 `https://generativelanguage.googleapis.com/v1beta`

### Google Vertex AI
- **类型：** `vertex`
- **名称：** Google Vertex AI
- **认证：** Service Account JSON
- **支持功能：** 聊天、流式输出、视觉理解、多模态、企业级
- **配置字段：**
  - `enable` (boolean): 是否启用，默认 `true`
  - `name` (string): 实例名称，可选
  - `region` (select): Google Cloud 地区，必填，默认 `us-central1`
  - `service_account_json` (textarea): Service Account JSON 内容，可选
  - `auth_file_path` (string): 认证文件路径，可选
  - `manual_models` (textarea): 手动配置的模型列表，每行一个模型名称

### DeepSeek
- **类型：** `deepseek`
- **名称：** DeepSeek
- **认证：** API Key
- **支持功能：** 聊天、流式输出、函数调用、推理链
- **配置字段：**
  - `enable` (boolean): 是否启用，默认 `true`
  - `name` (string): 实例名称，可选
  - `api_key` (password): DeepSeek API 密钥，必填
  - `base_url` (url): API 基础 URL，默认 `https://api.deepseek.com/v1`

## 使用场景

1. **前端动态配置界面：** 根据 `initialConfigSchema` 动态生成配置表单
2. **适配器选择器：** 为用户提供可用适配器的选择列表
3. **功能特性检查：** 根据适配器支持的功能启用/禁用相关 UI
4. **表单验证：** 使用 `validation` 规则进行客户端验证
5. **默认值填充：** 使用 `default` 值预填充表单字段

## 前端使用示例

```javascript
// 获取适配器类型信息
const response = await fetch('/api/config/adapter-types', {
  headers: { 'x-admin-code': adminCode }
});
const { data } = await response.json();

// 动态生成表单
data.adapters.forEach(adapter => {
  const schema = adapter.initialConfigSchema;
  
  Object.entries(schema).forEach(([fieldName, fieldConfig]) => {
    // 根据字段类型创建不同的表单控件
    switch (fieldConfig.type) {
      case 'boolean':
        createCheckbox(fieldName, fieldConfig);
        break;
      case 'password':
        createPasswordInput(fieldName, fieldConfig);
        break;
      case 'select':
        createSelectBox(fieldName, fieldConfig);
        break;
      case 'textarea':
        createTextarea(fieldName, fieldConfig);
        break;
      default:
        createTextInput(fieldName, fieldConfig);
    }
  });
});
```

## 错误处理

- **401/403：** 管理员验证码无效
- **500：** 服务器内部错误

## 注意事项

1. 此接口需要管理员权限，必须提供有效的管理员验证码
2. 适配器信息是动态加载的，重启服务器后会重新扫描适配器
3. 适配器的元数据信息由各适配器类的 `getAdapterMetadata()` 方法提供