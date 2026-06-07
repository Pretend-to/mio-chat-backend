/**
 * 定义系统中所有可用的钩子挂载点
 */
export const HOOK_POINTS = {
  // --- 工具执行生命周期 (MioFunction.run) ---
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
};
