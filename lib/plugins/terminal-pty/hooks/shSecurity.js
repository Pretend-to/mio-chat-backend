import BaseHook from '../../../../lib/hooks/BaseHook.js';
import { HOOK_POINTS } from '../../../../lib/hooks/types.js';
import { isCommandWhitelisted } from '../lib/shSecurity.js';

/**
 * Shell 安全拦截 Hook
 * 统一处理 yolo 模式、白名单校验和二次授权确认
 */
export default class ShSecurityHook extends BaseHook {
  constructor(options) {
    super({
      name: 'sh-security-guard',
      description: 'Shell 命令执行安全屏障',
      hookPoint: HOOK_POINTS.TOOL_BEFORE_EXECUTE,
      priority: 85, 
      namespace: options.namespace
    });
    
    this.securityTools = ['sh', 'pty_sh'];
  }

  async execute(ctx) {
    const { tool, event, params } = ctx;
    const { command } = params;

    const isSecurityTarget = this.securityTools.some(name => tool.name.startsWith(name));
    if (!isSecurityTarget || !command) return true;

    // 从事件主体中提取设置
    const isYolo = event.body?.settings?.yolo === true;
    const whitelistStr = event.body?.settings?.shWhitelist || '';
    const isTask = event.metaData?.isTask === true;

    const isWhitelisted = isCommandWhitelisted(command, whitelistStr);

    if (!isYolo && !isWhitelisted) {
     if (isTask) {
        logger.warn(`[sh-security-guard] 任务中命令 "${command}" 未命中白名单，自动拦截`);
        ctx.error = `[执行终止] 后台定时任务中，Shell 命令未命中白名单规则，且未开启高危 YOLO 模式，已直接安全拦截并拒绝执行该命令。`;
        return false;
      }

      // 触发二次授权
      const approval = await tool.requestUserApproval(
        event,
        `是否授权 LLM 执行命令：`,
        { command }
      );

      if (!approval.approved) {
        const reasonMsg = approval.reason ? ` 原因: ${approval.reason}` : '';
        ctx.error = `[执行终止] 用户拒绝授权此 Shell 命令 "${command}" 的执行。${reasonMsg}`;
        return false;
      }
    }

    return true;
  }
}
