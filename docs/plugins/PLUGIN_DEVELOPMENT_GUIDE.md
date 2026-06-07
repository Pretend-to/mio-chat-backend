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
工具是插件对外提供的“能力”。
```javascript
import MioFunction from '../../../lib/function.js';

export default class MyTool extends MioFunction {
  constructor() {
    super({
      name: 'get_weather',
      description: '获取指定城市的天气信息',
      parameters: { /* JSON Schema */ }
    });
  }

  async func({ params }) {
    return { weather: 'Sunny', temp: 25 };
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
