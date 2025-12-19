# LLM 适配器元数据完整指南

本文档详细说明了 LLM 适配器元数据的完整配置选项，包括字段类型、校验规则等。

## 基本结构

每个适配器都需要实现 `getAdapterMetadata()` 静态方法，返回以下结构：

```javascript
static getAdapterMetadata() {
  return {
    type: 'adapter_name',           // 适配器类型标识符
    name: '显示名称',                // 用户界面显示的名称
    description: '适配器描述',       // 适配器功能描述
    supportedFeatures: [],          // 支持的功能列表
    initialConfigSchema: {}         // 配置字段定义
  }
}
```

## 支持的功能 (supportedFeatures)

可用的功能标识符：

- `'chat'` - 基本聊天功能
- `'streaming'` - 流式响应
- `'function_calling'` - 函数调用/工具使用
- `'vision'` - 图像识别
- `'reasoning'` - 推理链功能

## 配置字段类型 (initialConfigSchema)

### 基本字段属性

每个配置字段都支持以下基本属性：

```javascript
field_name: {
  type: 'string',              // 字段类型
  default: '',                 // 默认值
  description: '字段描述',      // 字段说明
  required: true,              // 是否必填
  label: '字段标签',           // 界面显示标签
  placeholder: '占位符文本',    // 输入框占位符
  readonly: false,             // 是否只读
  validation: {}               // 校验规则（可选）
}
```

### 支持的字段类型

#### 1. 字符串类型 (`string`)

```javascript
name: {
  type: 'string',
  default: '',
  description: '适配器实例的自定义名称',
  required: false,
  label: '实例名称',
  placeholder: '例如：OpenAI-主要'
}
```

#### 2. 密码类型 (`password`)

```javascript
api_key: {
  type: 'password',
  default: '',
  description: 'API 密钥，支持多个密钥用逗号分隔',
  required: true,
  label: 'API Key',
  placeholder: 'API Key',
  validation: {
    pattern: '^sk-[a-zA-Z0-9]+',           // 正则表达式校验
    message: 'API Key 必须以 sk- 开头'      // 校验失败提示
  }
}
```

#### 3. URL 类型 (`url`)

```javascript
base_url: {
  type: 'url',
  default: 'https://api.openai.com/v1',
  description: 'API 的基础 URL',
  required: true,
  label: 'Base URL',
  placeholder: 'https://api.openai.com/v1'
}
```

#### 4. 布尔类型 (`boolean`)

```javascript
enable: {
  type: 'boolean',
  default: true,
  description: '是否启用此适配器实例',
  required: true,
  label: '启用'
}
```

#### 5. 数组类型 (`array`)

```javascript
models: {
  type: 'array',
  default: [],
  description: '可用的模型列表，通常由系统自动获取',
  required: false,
  label: '模型列表',
  readonly: true
}
```

#### 6. 数字类型 (`number`)

```javascript
timeout: {
  type: 'number',
  default: 30000,
  description: '请求超时时间（毫秒）',
  required: false,
  label: '超时时间',
  placeholder: '30000',
  validation: {
    min: 1000,                    // 最小值
    max: 300000,                  // 最大值
    message: '超时时间必须在 1000-300000 毫秒之间'
  }
}
```

#### 7. 选择类型 (`select`)

```javascript
region: {
  type: 'select',
  default: 'us-central1',
  description: '服务区域',
  required: true,
  label: '区域',
  options: [
    { value: 'us-central1', label: '美国中部' },
    { value: 'europe-west1', label: '欧洲西部' },
    { value: 'asia-east1', label: '亚洲东部' }
  ]
}
```

#### 8. 文本区域类型 (`textarea`)

```javascript
service_account_json: {
  type: 'textarea',
  default: '',
  description: '服务账户 JSON 配置',
  required: true,
  label: '服务账户 JSON',
  placeholder: '粘贴完整的 JSON 配置',
  rows: 10                       // 文本区域行数
}
```

## 校验规则 (validation)

### 正则表达式校验

```javascript
validation: {
  pattern: '^[a-zA-Z0-9_-]+$',
  message: '只能包含字母、数字、下划线和连字符'
}
```

### 数值范围校验

```javascript
validation: {
  min: 1,
  max: 100,
  message: '值必须在 1-100 之间'
}
```

### 字符串长度校验

```javascript
validation: {
  minLength: 8,
  maxLength: 128,
  message: '长度必须在 8-128 字符之间'
}
```

### 自定义校验函数

```javascript
validation: {
  custom: (value) => {
    // 自定义校验逻辑
    if (!value.startsWith('sk-')) {
      return '必须以 sk- 开头';
    }
    return null; // 校验通过
  }
}
```

## 完整示例

### OpenAI 适配器示例

```javascript
static getAdapterMetadata() {
  return {
    type: 'openai',
    name: 'OpenAI',
    description: 'OpenAI GPT 系列模型适配器，支持 GPT-3.5、GPT-4 等模型',
    supportedFeatures: ['chat', 'streaming', 'function_calling', 'vision'],
    initialConfigSchema: {
      enable: {
        type: 'boolean',
        default: true,
        description: '是否启用此适配器实例',
        required: true,
        label: '启用'
      },
      name: {
        type: 'string',
        default: '',
        description: '适配器实例的自定义名称，用于区分多个实例',
        required: false,
        label: '实例名称',
        placeholder: '例如：OpenAI-主要'
      },
      api_key: {
        type: 'password',
        default: '',
        description: 'OpenAI API 密钥，支持多个密钥用逗号分隔',
        required: true,
        label: 'API Key',
        placeholder: 'API Key'
      },
      base_url: {
        type: 'url',
        default: 'https://api.openai.com/v1',
        description: 'OpenAI API 的基础 URL，可用于代理或第三方兼容服务',
        required: true,
        label: 'Base URL',
        placeholder: 'https://api.openai.com/v1'
      },
      models: {
        type: 'array',
        default: [],
        description: '可用的模型列表，通常由系统自动获取',
        required: false,
        label: '模型列表',
        readonly: true
      }
    }
  }
}
```

### 带校验的适配器示例

```javascript
static getAdapterMetadata() {
  return {
    type: 'custom_provider',
    name: '自定义提供商',
    description: '自定义 API 提供商适配器',
    supportedFeatures: ['chat', 'streaming'],
    initialConfigSchema: {
      enable: {
        type: 'boolean',
        default: true,
        description: '是否启用此适配器实例',
        required: true,
        label: '启用'
      },
      api_key: {
        type: 'password',
        default: '',
        description: 'API 密钥',
        required: true,
        label: 'API Key',
        placeholder: 'sk-xxxxxxxx',
        validation: {
          pattern: '^sk-[a-zA-Z0-9]{32,}$',
          message: 'API Key 必须以 sk- 开头，后跟至少32位字符'
        }
      },
      base_url: {
        type: 'url',
        default: '',
        description: 'API 基础 URL',
        required: true,
        label: 'Base URL',
        validation: {
          pattern: '^https?://.+',
          message: 'URL 必须以 http:// 或 https:// 开头'
        }
      },
      timeout: {
        type: 'number',
        default: 30000,
        description: '请求超时时间（毫秒）',
        required: false,
        label: '超时时间',
        validation: {
          min: 5000,
          max: 300000,
          message: '超时时间必须在 5000-300000 毫秒之间'
        }
      },
      region: {
        type: 'select',
        default: 'us-east-1',
        description: '服务区域',
        required: true,
        label: '区域',
        options: [
          { value: 'us-east-1', label: '美国东部' },
          { value: 'us-west-2', label: '美国西部' },
          { value: 'eu-west-1', label: '欧洲西部' }
        ]
      }
    }
  }
}
```

## 注意事项

1. **字段名称**：使用下划线命名法（snake_case）
2. **必填字段**：`enable` 字段通常应该是必填的
3. **默认值**：为所有字段提供合理的默认值
4. **校验规则**：谨慎使用校验规则，避免过于严格导致用户无法使用
5. **只读字段**：`models` 等系统管理的字段应设为只读
6. **敏感信息**：API 密钥等敏感信息使用 `password` 类型

## 常见校验规则模板

### API Key 校验（OpenAI 格式）
```javascript
validation: {
  pattern: '^sk-[a-zA-Z0-9]+$',
  message: 'API Key 必须以 sk- 开头'
}
```

### URL 校验
```javascript
validation: {
  pattern: '^https?://.+',
  message: 'URL 必须以 http:// 或 https:// 开头'
}
```

### 端口号校验
```javascript
validation: {
  min: 1,
  max: 65535,
  message: '端口号必须在 1-65535 之间'
}
```

### 邮箱校验
```javascript
validation: {
  pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
  message: '请输入有效的邮箱地址'
}
```

这个文档应该涵盖了适配器元数据的所有配置选项，方便以后开发新适配器时参考。