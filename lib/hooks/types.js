/**
 * 定义系统中所有可用的钩子挂载点
 */
export const HOOK_POINTS = {
  // --- 工具执行生命周期 (MioFunction.run) ---
  TOOL_BEFORE_LOAD:    'tool:beforeLoad',      // 工具加载到插件内存前：Schema 校验、名称审计
  TOOL_NOT_FOUND:      'tool:notFound',        // 工具查找失败时：纠错、模糊匹配、引导提示
  TOOL_BEFORE_EXECUTE: 'tool:beforeExecute',   // 工具执行前：鉴权、校验、拦截
  TOOL_AFTER_EXECUTE:  'tool:afterExecute',    // 工具执行后：脱敏、审计、后处理
  TOOL_ON_ERROR:       'tool:onError',         // 工具抛错时：异常处理、回滚
  TOOL_ON_TIMEOUT:     'tool:onTimeout',       // 工具超时时：清理、记录

  // --- 插件生命周期 (middleware.js) ---
  PLUGIN_BEFORE_INIT:    'plugin:beforeInit',    // 插件 initialize 前
  PLUGIN_AFTER_INIT:     'plugin:afterInit',     // 插件 initialize 后
  PLUGIN_TOOLS_LOADED:   'plugin:toolsLoaded',   // 插件 tools 目录加载完成后
  PLUGIN_BEFORE_DESTROY: 'plugin:beforeDestroy', // 插件销毁前
  PLUGIN_AFTER_DESTROY:  'plugin:afterDestroy',  // 插件销毁及清理后
  PLUGINS_UPDATED:       'plugins:updated',      // 所有插件加载/重载完成后触发

  // --- LLM 对话拦截 ---
  LLM_BEFORE_CHAT: 'llm:beforeChat',  // 发送给 LLM 前：拦截、注入上下文、拒绝策略
  LLM_AFTER_CHAT:  'llm:afterChat',   // LLM 返回后：内容脱敏、敏感词过滤
  LLM_TOOL_RESULTS: 'llm:toolResults', // 工具批量执行完毕后：记录工具详情到审计日志
};
