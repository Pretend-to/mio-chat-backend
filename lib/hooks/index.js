import HookManager from './HookManager.js';
import CheckPermissionHook from './builtins/checkPermission.js';
import ValidateParamsHook from './builtins/validateParams.js';
import ModelPermissionHook from './builtins/ModelPermissionHook.js';
import AuditHook from './builtins/AuditHook.js';
import SkillCatalogHook from './builtins/SkillCatalogHook.js';
import PresetHistoryHook from './builtins/PresetHistoryHook.js';
import ToolResolutionHook from './builtins/ToolResolutionHook.js';
import DatabaseAuditHook from './builtins/DatabaseAuditHook.js';

/**
 * 全局单例 Hook 管理器
 * 负责管理内置钩子和各插件传播上来的全局钩子
 */
const hookManager = new HookManager();

// 注册内置钩子
hookManager.register(new ValidateParamsHook());
hookManager.register(new CheckPermissionHook());
hookManager.register(new ModelPermissionHook());
hookManager.register(new AuditHook());
hookManager.register(new SkillCatalogHook());
hookManager.register(new PresetHistoryHook());
hookManager.register(new ToolResolutionHook());
hookManager.register(new DatabaseAuditHook());

export default hookManager;
export { hookManager };
