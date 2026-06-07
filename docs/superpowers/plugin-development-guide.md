# MioChat 插件开发指南 (v3 架构)

本指南旨在帮助开发者基于 MioChat 的两层级 Hook 架构开发高性能、安全且功能丰富的插件。

---

## 1. 插件目录结构

一个标准的 MioChat 插件应遵循以下目录规范：

```text
my-plugin/
├── index.js           # 插件入口
├── package.json       # 插件元数据（必须包含 name 字段作为唯一标识）
├── tools/             # 工具目录：存放继承自 MioFunction 的工具
├── hooks/             # [可选] 钩子目录：存放继承自 BaseHook 的逻辑切面
└── presets/           # [可选] 预设目录：存放预设的 JSON 模板
```

---

## 2. 核心组件开发

### 2.1 插件入口 (index.js)
所有插件必须继承自系统提供的 `Plugin` 基类。

```js
import Plugin from '../../lib/plugin.js';

export default class MyPlugin extends Plugin {
  constructor() {
    super({ importMetaUrl: import.meta.url });
  }

  // 获取插件初始配置，将自动同步到数据库
  getInitialConfig() {
    return {
      apiKey: '',
      maxRequests: 100
    };
  }
}
```

### 2.2 开发工具 (tools/)
工具是插件的功能实现单元。

```js
import { MioFunction } from '../../lib/function.js';

export default class MyTool extends MioFunction {
  constructor() {
    super({
      name: 'hello_world',
      description: '向用户打招呼',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    });
  }

  async func(e) {
    const { name } = e.params;
    return { text: `Hello, ${name}!` };
  }
}
```

### 2.3 开发钩子 (hooks/)
钩子允许你在工具执行的各个生命周期注入逻辑。只需在 `hooks/` 目录下创建文件，系统会自动加载。

```js
import BaseHook from '../../../lib/hooks/BaseHook.js';

export default class RateLimitHook extends BaseHook {
  constructor(options) {
    super({
      name: 'my-rate-limit',
      hookPoint: 'tool:beforeExecute', // 绑定到执行前
      priority: 80,                    // 优先级越高越先执行
      namespace: options.namespace     // 自动分配的插件名
    });
  }

  async execute(ctx) {
    const { tool, user, config } = ctx;
    // 如果返回 false，将拦截本次工具执行
    if (user.requestCount > config.maxRequests) {
      ctx.error = '请求频率超限';
      return false; 
    }
    return true;
  }
}
```

#### 可用的 Hook Points:
- `tool:beforeExecute`: 工具执行前的拦截、校验、鉴权。
- `tool:afterExecute`: 执行后的数据处理、脱敏、审计日志。
- `tool:onError`: 发生错误时的统一处理或状态回滚。
- `plugin:beforeInit` / `plugin:afterInit`: 插件自身的加载生命周期。

---

## 3. 自动化预设 (presets/)

在 `presets/` 目录下放置的 `.json` 文件会在插件加载时自动同步到系统的预设库。

**示例：presets/default.json**
```json
{
  "name": "天气大师",
  "triggerword": "查询天气",
  "llm_config": {
    "model": "gpt-4-turbo",
    "temperature": 0.7
  },
  "system_prompt": "你是一个专业的气象专家..."
}
```

---

## 4. 执行上下文 (Context)

在 Hook 的 `execute(ctx)` 方法中，你可以访问到以下上下文信息：

| 属性 | 描述 |
|------|------|
| `ctx.tool` | 当前正在运行的工具实例 (`MioFunction`) |
| `ctx.event` | 原始请求事件对象 |
| `ctx.user` | 当前调用工具的用户对象 |
| `ctx.params` | LLM 传给工具的参数 |
| `ctx.config` | 当前插件的实时配置 |
| `ctx.result` | (仅 afterExecute) 工具执行返回的结果 |
| `ctx.error` | (仅 onError) 抛出的错误对象 |

---

## 5. 最佳实践

1.  **原子性**：一个 Hook 只做一件事（例如：`validateParams.js` 只负责校验，`auditLog.js` 只负责日志）。
2.  **命名空间**：在 Hook 的 `constructor` 中务必透传 `namespace`，这对于插件热重载时的清理至关重要。
3.  **异常处理**：Hook 内部应尽量自行处理异常。如果 Hook 抛错，默认会被 `HookManager` 捕获以防中断核心执行链，除非该 Hook 是关键的安全拦截。
4.  **优先级分配**：
    *   100+: 参数校验
    *   80-99: 权限拦截
    *   50-79: 业务逻辑、限流
    *   1-49: 审计、观察者、日志处理

---

## 6. 开发者工具 (CLI)

可以使用以下命令管理插件：
- `npm run plugin:reload <name>`: 重新加载特定插件。
- `npm run plugin:list`: 查看当前加载的所有插件及其关联的 Hooks。
