# Mio-Chat Hooks 机制详解 (V3 Architecture)

## 1. 什么是 Hooks？
Hooks 是 Mio-Chat V3 引入的 AOP（面向切面编程）架构体系。它允许开发者在不修改核心代码的前提下，通过注入自定义逻辑来“拦截”、“监视”或“篡改”系统的核心流程。

## 2. 核心 HookPoints (挂载点)

系统目前支持以下生命周期挂载点：

### 工具执行流 (`TOOL_`)
*   **`TOOL_BEFORE_LOAD`**: 工具类被加载到内存前触发。用于名称合规性校验、Schema 静态审计。
*   **`TOOL_BEFORE_EXECUTE`**: 工具 `run()` 方法执行前触发。用于动态鉴权、参数校验。
*   **`TOOL_AFTER_EXECUTE`**: 工具执行成功并获得结果后触发。用于结果后处理、脱敏。
*   **`TOOL_ON_ERROR`**: 工具执行抛错时触发。用于错误重试、统一格式化报错。
*   **`TOOL_NOT_FOUND`**: 当 LLM 尝试调用不存在的工具时触发。用于模糊匹配纠错（如 MD5 剥离）。

### 对话执行流 (`LLM_`)
*   **`LLM_BEFORE_CHAT`**: 消息发送给 LLM 之前触发。用于敏感词过滤、余额检查、系统提示词动态注入（如 Skill/Preset 注入）。
*   **`LLM_AFTER_CHAT`**: LLM 响应结束并获得 Token 用量后触发。用于用量审计、计费落库、回复内容过滤。
*   **`LLM_TOOL_RESULTS`**: 这一轮对话调用的所有工具执行完毕后触发。用于合并记录多工具并行调用的详细入参和执行结果，规避在 `TOOL_AFTER_EXECUTE` 中因并发写造成的数据库竞争与锁表问题。

### 插件生命周期 (`PLUGIN_`)
*   **`PLUGIN_BEFORE_INIT` / `PLUGIN_AFTER_INIT`**: 插件初始化前后触发。
*   **`PLUGINS_UPDATED`**: 所有插件加载或热重载完成后触发。

## 3. 如何编写一个钩子？

所有钩子必须继承 `BaseHook` 基类。

```javascript
import BaseHook from '../BaseHook.js'
import { HOOK_POINTS } from '../types.js'

export default class MyAuditHook extends BaseHook {
  constructor() {
    super('my-namespace:audit') // 命名空间防止冲突
  }

  getPriority() {
    return 100 // 优先级越高越先执行
  }

  /**
   * 监听 LLM 对话结束
   */
  async [HOOK_POINTS.LLM_AFTER_CHAT](ctx) {
    const { usage, model } = ctx
    console.log(`模型 ${model} 消耗了 ${usage.total_tokens} 个 tokens`)
    return true // 返回 true 继续流程，返回 false 拦截
  }
}
```

## 4. 内置钩子列表 (Built-ins)

系统预置了以下核心钩子，它们位于 `lib/hooks/builtins/`：

1.  **`ModelPermissionHook`**: 处理游客/管理员的模型访问权限。
2.  **`AuditHook`**: 内存级的全量用量统计（Token/工具频次）。
3.  **`DatabaseAuditHook`**: 负责将用量审计数据异步存入数据库。
4.  **`ValidateParamsHook`**: 基于 JSON Schema 的工具参数强校验。
5.  **`ToolResolutionHook`**: 处理工具名 MD5 纠错与引导。
6.  **`SkillCatalogHook`**: 动态向 Prompt 中注入 Skill 指南。

---
更多开发细节请参考 `lib/hooks/HookManager.js` 源码。
