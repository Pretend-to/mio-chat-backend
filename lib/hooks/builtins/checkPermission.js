import BaseHook from '../BaseHook.js';
import { HOOK_POINTS } from '../types.js';
import { evaluateToolAccess } from '../../chat/llm/toolPolicy.js';

/**
 * 权限检查 Hook
 * 执行前复用统一 ToolAccessPolicy 作为钩子层二次保护。
 */
export default class CheckPermissionHook extends BaseHook {
  constructor() {
    super({
      description: '检查用户执行工具的统一访问策略',
      hookPoint: HOOK_POINTS.TOOL_BEFORE_EXECUTE,
      name: 'check-permission',
      namespace: '__builtin__',
      priority: 90, // 高优先级
    });
  }

  async execute(ctx) {
    const operation = ctx.event?.isMetaCall ? 'meta_call' : 'execute';
    const decision = evaluateToolAccess(ctx.tool, ctx.event, operation);
    if (!decision.allowed) {
      ctx.error = 'Tool not found';
      return false;
    }
    return true;
  }
}
