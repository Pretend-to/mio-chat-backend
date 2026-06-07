import BaseHook from '../BaseHook.js';
import { HOOK_POINTS } from '../types.js';

/**
 * 权限检查 Hook
 * 替代原 MioFunction 中硬编码的 adminOnly 检查
 */
export default class CheckPermissionHook extends BaseHook {
  constructor() {
    super({
      name: 'check-permission',
      description: '检查用户执行工具的权限 (adminOnly 等)',
      hookPoint: HOOK_POINTS.TOOL_BEFORE_EXECUTE,
      priority: 90, // 高优先级
      namespace: '__builtin__'
    });
  }

  async execute(ctx) {
    const { tool, user } = ctx;

    // 1. 检查 adminOnly
    if (tool.adminOnly) {
      if (!user || !user.isAdmin) {
        ctx.error = 'Only administrators can execute this function.';
        return false; // 拦截执行
      }
    }

    // 未来可以在这里扩展更多的权限检查，如角色组、白名单等
    return true;
  }
}
