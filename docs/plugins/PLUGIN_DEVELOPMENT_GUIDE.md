# Mio-Chat 插件开发指南 (V3 标准)

## 1. 插件定位
Mio-Chat 插件是系统的功能扩展单元，具备完整的生命周期钩子（Hooks）、工具集（Tools）和静态预设（Presets）。

## 2. 目录结构
推荐将插件放在 `/plugins/<plugin-name>/`：

```text
my-plugin/
├── package.json      # 元数据与依赖声明
├── index.js          # 插件入口类
├── tools/            # [可选] 存放 MioFunction 工具文件
├── hooks/            # [可选] 存放自定义钩子实现
└── presets/         # [可选] 存放静态预设 JSON
```

## 3. 核心组件开发

### 3.1 插件入口 (`index.js`)
必须继承 `Plugin` 基类：
```javascript
import Plugin from '../../lib/plugin.js';

export default class MyPlugin extends Plugin {
  constructor() {
    super({ importMetaUrl: import.meta.url }); // 自动路径识别
  }

  async initialize() {
    await super.initialize();
    // 执行自定义初始化逻辑...
  }
}
```

### 3.2 编写工具 (`tools/`)
工具是插件对外提供的“能力”，继承自 `MioFunction`。

#### 1) 基础工具定义
```javascript
import { MioFunction } from '../../../lib/function.js';

export default class MyTool extends MioFunction {
  constructor() {
    super({
      name: 'get_weather',
      description: '获取指定城市的天气信息',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: '城市名称' }
        },
        required: ['city']
      }
    });
    this.func = this.execute.bind(this);
  }

  async execute(e) {
    const { city } = e.params;
    return { weather: 'Sunny', temp: 25, city };
  }
}
```

#### 2) 动态 Schema 与多态感知 (进阶特性)
`MioFunction` 支持根据**当前会话上下文（单聊、群聊、不同渠道/平台）**动态调整工具的 Description 与入参 Schema。通过覆盖 `getDescription(context)` 与 `getParameters(type, context)` 实现多态：

```javascript
import { MioFunction } from '../../../lib/function.js';

export default class ContextAwareTool extends MioFunction {
  constructor() {
    super({
      name: 'my_tool',
      description: '单聊默认工具说明',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: '内容' }
        },
        required: ['content']
      }
    });
    this.func = this.execute.bind(this);
  }

  /**
   * 动态返回工具描述（Prompt 指引）
   * @param {Object|null} context - 请求上下文（包含 platform, isGroup, metaData 等）
   */
  getDescription(context = null) {
    if (context?.isGroup || context?.platform === 'group' || context?.metaData?.memberId) {
      return '在群聊场景下的定制说明：管理当前群成员的职责与协同设定...';
    }
    return this.description; // 回退默认描述
  }

  /**
   * 动态返回入参 JSON Schema
   * @param {string|null} type - 目标模型平台（openai, gemini, claude 等）
   * @param {Object|null} context - 请求上下文
   */
  getParameters(type = null, context = null) {
    if (context?.isGroup || context?.platform === 'group' || context?.metaData?.memberId) {
      return {
        type: 'object',
        properties: {
          title: { type: 'string', description: '群内头衔' },
          intro: { type: 'string', description: '群内专长与职责介绍' },
          content: { type: 'string', description: '内容' }
        },
        required: ['content']
      };
    }
    return this.parameters; // 回退默认参数定义（保持 100% 向后兼容）
  }

  async execute(e) {
    // e.metaData: { contactorId, memberId, memberName, ... }
    // e.body: 请求体
    // e.client: Socket.IO 客户端连接（可调用 sendSystemMessage 等）
    const { content, title, intro } = e.params;
    return { success: true, message: '操作完成' };
  }
}
```

### 3.3 编写钩子 (`hooks/`)
钩子用于拦截系统行为（如审计、鉴权）。
```javascript
import BaseHook from '../../../lib/hooks/BaseHook.js';
import { HOOK_POINTS } from '../../../lib/hooks/types.js';

export default class MyAuditHook extends BaseHook {
  async [HOOK_POINTS.TOOL_BEFORE_EXECUTE](ctx) {
    console.log(`正在执行工具: ${ctx.tool.name}`);
    return true;
  }
}
```

## 4. 预设双源机制
你可以将 `.json` 格式的预设文件放在 `presets/` 目录下。
*   **特性**：这些预设在插件加载时自动载入内存，无需手动写入数据库。
*   **只读**：插件自带的预设在 UI 上被标记为“只读”，确保系统稳定性。

---
更多示例请参考 `/plugins/test-hook/` 目录。
