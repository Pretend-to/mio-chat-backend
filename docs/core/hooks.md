# Mio-Chat Hooks 机制详解 (V3 Architecture)

Hooks 是 Mio-Chat V3 引入的 AOP（面向切面编程）架构体系。它允许开发者在不修改核心代码的前提下，通过注入自定义逻辑来"拦截"、"监视"或"篡改"系统的核心流程。

系统目前支持以下 **16 个生命周期挂载点**（定义于 `lib/hooks/types.js`）：

## 1. 工具执行生命周期 (`TOOL_`)

| 挂载点 | 事件名 | 触发时机 | 典型用途 |
| :--- | :--- | :--- | :--- |
| `TOOL_BEFORE_LOAD` | `tool:beforeLoad` | 工具类被加载到插件内存前 | 名称合规性校验、Schema 静态审计 |
| `TOOL_NOT_FOUND` | `tool:notFound` | LLM 尝试调用不存在的工具时 | 模糊匹配纠错（如 MD5 剥离） |
| `TOOL_BEFORE_EXECUTE` | `tool:beforeExecute` | 工具 `run()` 方法执行前 | 动态鉴权、参数校验、命令白名单拦截 |
| `TOOL_AFTER_EXECUTE` | `tool:afterExecute` | 工具执行成功并获得结果后 | 结果后处理、脱敏、审计 |
| `TOOL_ON_ERROR` | `tool:onError` | 工具执行抛错时 | 错误重试、统一格式化报错 |
| `TOOL_ON_TIMEOUT` | `tool:onTimeout` | 工具执行超时时 | 超时清理、记录告警 |

## 2. 插件生命周期 (`PLUGIN_`)

| 挂载点 | 事件名 | 触发时机 |
| :--- | :--- | :--- |
| `PLUGIN_BEFORE_INIT` | `plugin:beforeInit` | 插件 `initialize()` 前 |
| `PLUGIN_AFTER_INIT` | `plugin:afterInit` | 插件 `initialize()` 后 |
| `PLUGIN_TOOLS_LOADED` | `plugin:toolsLoaded` | 插件 tools 目录加载完成后 |
| `PLUGIN_BEFORE_DESTROY` | `plugin:beforeDestroy` | 插件销毁前 |
| `PLUGIN_AFTER_DESTROY` | `plugin:afterDestroy` | 插件销毁及清理后 |
| `PLUGINS_UPDATED` | `plugins:updated` | 所有插件加载/热重载完成后 |

## 3. 对话执行生命周期 (`LLM_`)

| 挂载点 | 事件名 | 触发时机 | 典型用途 |
| :--- | :--- | :--- | :--- |
| `LLM_BEFORE_CHAT` | `llm:beforeChat` | 消息发送给 LLM 之前（每次用户请求**首次**进入时） | 敏感词过滤、余额检查、模型权限、系统提示词动态注入（Skill/Preset） |
| `LLM_BEFORE_RECURSION` | `llm:beforeRecursion` | `handleChatRequest` **每次调用前，含工具调用后的递归轮次** | 按递归轮次动态调整工具列表、注入轮次上下文 |
| `LLM_AFTER_CHAT` | `llm:afterChat` | LLM 响应结束并获得 Token 用量后 | 用量审计、计费落库、回复内容过滤 |
| `LLM_TOOL_RESULTS` | `llm:toolResults` | 一轮对话内所有工具执行完毕后 | 合并记录多工具并行调用的详细入参和结果 |

### `LLM_BEFORE_CHAT` vs `LLM_BEFORE_RECURSION`

两者是**请求入口**与**递归轮次**的关系：

- `LLM_BEFORE_CHAT` 只在每次用户新消息进入 `LLMChatService.handleMessage` 时执行**一次**（`lib/chat/llm/index.js`），适合做整轮请求级的拦截与注入。
- `LLM_BEFORE_RECURSION` 在 `lib/chat/llm/adapters/base.js` 的 `handleChatRequest` **每次调用**（含首次调用与工具调用后的递归调用）都会执行，context 携带：

```javascript
{
  body,        // 完整请求体（可修改 settings / messages）
  event,       // LLMMessageEvent 实例
  firstCall,   // boolean，首次调用为 true
  llmService,  // LLM 服务实例
  round,       // number，递归轮次计数器（首次=1，之后每次工具递归+1）
  tools,       // 当前工具列表（e.body.settings.toolCallSettings.tools）
}
```

典型用法——**按递归轮次动态调整工具列表**（如 DeepSeek V4 两阶段锚定：首轮只暴露 Minimal 工具集，首次工具调用后解锁全量）：

```javascript
import BaseHook from '../BaseHook.js'
import { HOOK_POINTS } from '../types.js'

export default class TwoPhaseToolsHook extends BaseHook {
  constructor() {
    super({
      hookPoint: HOOK_POINTS.LLM_BEFORE_RECURSION,
      name: 'two-phase-tools',
      namespace: 'my-plugin',
      priority: 90,
    })
  }

  async [HOOK_POINTS.LLM_BEFORE_RECURSION](ctx) {
    const { body, firstCall, round } = ctx
    const tcs = body.settings?.toolCallSettings
    if (!tcs) {return true}

    if (firstCall || round <= 1) {
      // 首轮：锚定为最小工具集（缓存全量以便恢复）
      tcs._fullTools = [...(tcs.tools || [])]
      tcs.tools = (tcs.tools || []).filter((t) => ['bash', 'bash_input', 'wait'].includes(t))
    } else if (Array.isArray(tcs._fullTools)) {
      // 后续轮次：解锁全量
      tcs.tools = tcs._fullTools
    }
    return true
  }
}
```

## 4. 如何编写一个钩子？

所有钩子必须继承 `BaseHook` 基类。

```javascript
import BaseHook from '../BaseHook.js'
import { HOOK_POINTS } from '../types.js'

export default class MyAuditHook extends BaseHook {
  constructor(options) {
    super({
      name: 'my-audit',
      hookPoint: HOOK_POINTS.LLM_AFTER_CHAT,
      namespace: options?.namespace || '', // 插件私有钩子由 loadHooks 自动注入
      priority: 100, // 优先级越高越先执行
    })
  }

  async [HOOK_POINTS.LLM_AFTER_CHAT](ctx) {
    const { usage, model } = ctx
    console.log(`模型 ${model} 消耗了 ${usage.total_tokens} 个 tokens`)
    return true // 返回 true 继续流程，返回 false 拦截
  }
}
```

**实现方式（两种，可混用）**：
1. **动态方法名**：定义 `async [HOOK_POINTS.X](ctx) {}`，HookManager 会自动检测并注册到对应槽位。
2. **静态 hookPoint**：在 `super({ hookPoint: HOOK_POINTS.X })` 中显式指定，实现 `execute(ctx)` 方法。

**返回值语义**：
- `true` / `undefined`：放行，继续下一个钩子
- `false`：拦截，中断后续流程（可设置 `ctx.error` 提供拦截原因）
- `{ consumed: true, result }`：短路，直接返回 result

**优先级**：`priority` 越大越先执行。内置钩子的优先级可见 `lib/hooks/builtins/` 中各实现。

## 5. 内置钩子列表 (Built-ins)

位于 `lib/hooks/builtins/`，由 `lib/hooks/index.js` 启动时自动扫描注册（热重载也会自动重建）：

| 钩子 | 挂载点 | 作用 |
| :--- | :--- | :--- |
| `ModelPermissionHook` | `LLM_BEFORE_CHAT` | 游客/管理员的模型访问权限校验（管理员直通，游客走白名单） |
| `PresetHistoryHook` | `LLM_BEFORE_CHAT` | 合并预设的 System Prompt 与引导历史到消息链 |
| `SkillCatalogHook` | `LLM_BEFORE_CHAT` | 动态向 Prompt 注入 Skill 技能目录（`<skill_registry>`） |
| `checkPermission` | `TOOL_BEFORE_EXECUTE` | 工具执行前的权限/鉴权检查 |
| `validateParams` | `TOOL_BEFORE_EXECUTE` | 基于 JSON Schema 的工具参数强校验 |
| `ToolResolutionHook` | `TOOL_NOT_FOUND` | 工具名 MD5 纠错与引导提示 |
| `ToolResponseLimitHook` | `TOOL_AFTER_EXECUTE` | 工具响应体大小限制与截断 |
| `AuditHook` | `LLM_TOOL_RESULTS` 等 | 内存级的全量用量统计（Token/工具频次） |
| `DatabaseAuditHook` | `LLM_TOOL_RESULTS` | 将用量审计数据异步写入数据库 |

> 插件私有的 Hook 位于 `plugins/<name>/hooks/`，通过 `Plugin.initialize()` 里的 `_propagateHooks()` 传播到全局执行链；热重载时会按 namespace 先卸载再注入。

---

更多实现细节请参考源码：
- `lib/hooks/types.js`（挂载点定义）
- `lib/hooks/HookManager.js`（责任链执行、优先级排序、去重）
- `lib/hooks/BaseHook.js`（钩子基类）
