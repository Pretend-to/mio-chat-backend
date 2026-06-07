import HookManager from './HookManager.js';
import CheckPermissionHook from './builtins/checkPermission.js';
import ValidateParamsHook from './builtins/validateParams.js';

/**
 * 全局单例 Hook 管理器
 * 负责管理内置钩子和各插件传播上来的全局钩子
 */
const hookManager = new HookManager();

// 注册内置钩子
hookManager.register(new ValidateParamsHook());
hookManager.register(new CheckPermissionHook());

export default hookManager;
export { hookManager };
