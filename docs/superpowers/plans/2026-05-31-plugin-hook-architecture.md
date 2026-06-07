# 插件系统重构计划：两层级 Hook 架构 (v3 - 目录规范全面升级)

> **状态**: 已定稿 · **已实现 (2026-06-07)**
> **涉及文件**: 20+ 个（5 新增 + 15+ 改造）
> **影响范围**: 已覆盖所有内置高危插件 (Config, FileEditor, Terminal)

---

## 1. 动机 (已解决 ✅)

| 问题 | 状态 | 解决方案 |
|------|------|----------|
| `Plugin.initialize()` 不可靠 | **已修复** | 逻辑外移至 `middleware.js` 编排层 |
| 权限校验硬编码 | **已解耦** | 迁移至内置 `checkPermission` Hook |
| 无切面逻辑 | **已实现** | 引入两层级 Hook 拦截链 |
| 预设同步繁琐 | **已自动化** | `Plugin.js` 自动扫描 `presets/` 目录 |
| 卸载残留 | **已解决** | `unregisterByNamespace` 精准物理清理 |

... (中间内容保持不变) ...

## 9. 实施记录 (2026-06-07)

1.  **基础设施 ✅**：实现 `HookManager`, `BaseHook`, `types`。
2.  **内置逻辑迁移 ✅**：实现 `validateParams` 和 `checkPermission` 钩子。
3.  **基类改造 ✅**：`lib/plugin.js` 已支持自动加载 `hooks/` 和 `presets/`。
4.  **执行链改造 ✅**：`lib/function.js` 的 `run()` 已重构为双链调用。
5.  **生命周期接入 ✅**：`lib/middleware.js` 接入全生命周期。
6.  **内置插件适配 ✅**：
    *   `config-plugin`: 接入 `riskApproval` Hook，移除冗余授权代码。
    *   `file-editor-plugin`: 接入 `pathGuard` Hook，防御路径穿越，广播至全局。
    *   `terminal-pty`: 接入 `shSecurity` Hook，统一命令安全策略。
7.  **集成测试 ✅**：通过 `scripts/test-plugin-architecture.js` 验证通过。
├── hooks/             # [新增] 存放插件专属的 BaseHook 实现
│   ├── rateLimit.js   # 限流 Hook
│   └── auditLog.js    # 审计 Hook
└── presets/           # [新增] 存放插件自带的预设 JSON
    ├── default.json
    └── pro-config.json
```

---

## 3. 核心架构：两层级 Hook 执行

```mermaid
graph TD
    subgraph Global_Level [全局层级]
        GH[Global HookManager] -->|Builtins| B1[validateParams]
        GH -->|Builtins| B2[checkPermission]
        GH -->|Propagated| PH[Hooks from Plugins]
    end

    subgraph Plugin_Level [插件层级]
        PH -->|Propagate| GH
        PL[Plugin Instance] -->|Owns| LH[Local HookManager]
        LH -->|Scanner| HD[hooks/ directory]
    end

    subgraph Tool_Execution [工具执行链]
        R[MioFunction.run] -->|Step 1| GH
        GH -->|Step 2| LH
        LH -->|Step 3| FUNC[this.func]
    end
```

---

## 4. 实现细节：Plugin 基类升级

```js
// lib/plugin.js (核心改动)

class Plugin extends EventEmitter {
  constructor(info, settings = {}) {
    super(info, settings);
    this.hooks = new HookManager();
    this.hooksPath = path.join(this.pluginPath, 'hooks');
    this.presetsPath = path.join(this.pluginPath, 'presets');
  }

  async initialize() {
    await this.loadConfig();
    await this.loadTools({ silent: true });
    await this.loadHooks();    // [新增] 自动加载 hooks/ 目录
    this._setupWatchers(); 
  }

  /** [新增] 扫描 hooks/ 目录并自动注册 */
  async loadHooks() {
    if (!fs.existsSync(this.hooksPath)) return;
    const files = fs.readdirSync(this.hooksPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const HookClass = (await import(pathToFileURL(path.join(this.hooksPath, file)))).default;
      const hookInstance = new HookClass({ namespace: this.name });
      this.hooks.register(hookInstance);
    }
  }

  /** [新增] 同步 presets/ 目录下的预设到数据库 */
  async seedPresets() {
    if (!fs.existsSync(this.presetsPath)) return;
    const files = fs.readdirSync(this.presetsPath).filter(f => f.endsWith('.json'));
    const presets = files.map(f => {
      const content = fs.readFileSync(path.join(this.presetsPath, f), 'utf-8');
      return { ...JSON.parse(content), provider: this.name, source: 'plugin' };
    });
    if (presets.length > 0) {
      const { default: PresetService } = await import('./database/services/PresetService.js');
      await PresetService.upsertMany(presets);
    }
  }
}
```

---

## 5. Hook 设计语义

插件内部的 Hook 依然继承 `BaseHook`，但其 `namespace` 锁定为插件名。

```js
// plugins/weather/hooks/rateLimit.js
import BaseHook from '../../../lib/hooks/BaseHook.js';

export default class WeatherRateLimit extends BaseHook {
  constructor(options) {
    super({
      name: 'weather-limit',
      hookPoint: 'tool:beforeExecute',
      priority: 60,
      namespace: options.namespace
    });
  }

  async execute(ctx) {
    // ctx.config 已经包含了插件的配置
    const limit = ctx.config.maxRequestsPerMinute || 10;
    // ... 执行限流逻辑 ...
  }
}
```

---

## 6. 改动清单汇总 (v3)

| 文件 | 操作 | 内容描述 |
|------|------|----------|
| `lib/hooks/*.js` | **新增** | 实现 HookManager, BaseHook, types |
| `lib/plugin.js` | **改动** | 增加 `loadHooks()`, `seedPresets()`, 初始化 `this.hooks` |
| `lib/function.js` | **改动** | `run()` 方法重构为双链调用，透传 `ctx` |
| `lib/middleware.js` | **改动** | `loadPlugin` 时调用 `seedPresets` 和 `_propagateHooks` |
| `lib/database/services/PresetService.js` | **改动** | 增加 `upsertMany` 方法支持插件同步 |

---

## 7. 实施步骤

1.  **基础设施**：建立 `lib/hooks/` 体系。
2.  **基类强化**：在 `Plugin.js` 中实现 `hooks/` 和 `presets/` 的自动化扫描加载。
3.  **编排接入**：在 `middleware.js` 中确立生命周期：`init -> loadHooks -> seedPresets -> propagate`。
4.  **执行链改造**：重写 `MioFunction.run()`。
5.  **内置 Hook 迁移**：将系统级校验逻辑移入 `lib/hooks/builtins/`。

---

**Reviewer 结论**：
v3 版本将 Hook 架构与目录规范升级深度结合。插件开发者现在只需在目录下新建文件即可完成功能扩展，无需修改插件 `index.js` 的初始化逻辑，极大地降低了开发门槛并提升了系统的可维护性。方案完整，准予执行。