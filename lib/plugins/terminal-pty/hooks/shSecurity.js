import BaseHook from '../../../hooks/BaseHook.js';
import { HOOK_POINTS } from '../../../hooks/types.js';
import { isCommandWhitelisted } from '../lib/shSecurity.js';
import { shellPolicyService } from '../../../database/services/ShellPolicyService.js';
/**
 * Shell 安全拦截 Hook
 *
 * 判定顺序（2026-08 重构，权威名单下沉后端，解除"前端在线/前端名单"依赖）：
 *   1. yolo 模式            → 全部放行（高危全局开关，仅调试期建议开启）
 *   2. 后端权威名单          → deny(高危黑名单,拆子命令防绕过) 命中: 拒绝
 *                            → allow(白名单, 可选 cwd 工作区绑定) 命中: 放行
 *   3. 旧任务 shWhitelist    → 兼容保留（任务创建时预设的 settings.shWhitelist）
 *   4. 其余                 → 后台任务(isTask): 安全拦截
 *                            → 前台对话: 二次授权(requestUserApproval, 此时才依赖前端)
 *
 * 实际工作区(cwd)解析：本次参数显式 cwd > 复用 session 创建时绑定的 cwd > 后端进程根目录
 */
export default class ShSecurityHook extends BaseHook {
  constructor(options) {
    super({
      description: 'Shell 命令执行安全屏障（后端权威名单 + 工作区绑定 + 二次授权）',
      hookPoint: HOOK_POINTS.TOOL_BEFORE_EXECUTE,
      name: 'sh-security-guard',
      namespace: options.namespace,
      priority: 85
    });
    this.securityTools = ['bash', 'bash_input'];
  }
  async execute(ctx) {
    const { tool, event, params } = ctx;
    const command = params?.command || params?.data;
    const isSecurityTarget = this.securityTools.some(name => tool.name.startsWith(name));
    if (!isSecurityTarget || !command) {return true;}

    // 1. yolo 全局免审
    const isYolo = event.body?.settings?.yolo === true;
    if (isYolo) {return true;}

    // 2. 后端权威名单判定（deny 黑名单 / allow 白名单 × 工作区绑定）
    const actualCwd = this._resolveCwd(tool, params);
    let policy;
    try {
      policy = await shellPolicyService.evaluate(command, actualCwd);
    } catch (error) {
      logger.warn('[sh-security-guard] ShellPolicyService 判定失败，按未知策略处理:', error.message);
      policy = { reason: 'policy-error', verdict: 'unknown' };
    }
    if (policy.verdict === 'block') {
      ctx.error = `[执行终止] 命令 "${command}" 命中高危黑名单，必须人工介入审批，已拒绝执行。`;
      logger.warn(`[sh-security-guard] 高危命令被拒: ${command}`);
      return false;
    }
    if (policy.verdict === 'allow') {
      logger.debug(`[sh-security-guard] 后端自动放行: ${command} (cwd=${actualCwd})`);
      return true;
    }

    // 3. 兼容旧任务 shWhitelist（settings.shWhitelist，暂保留过渡）
    const whitelistStr = event.body?.settings?.shWhitelist || '';
    if (isCommandWhitelisted(command, whitelistStr)) {
      return true;
    }

    // 4. 未命中任何放行策略
    const isTask = event.metaData?.isTask === true;
    if (isTask) {
      logger.warn(`[sh-security-guard] 任务中命令 "${command}" 未命中自动放行名单，自动拦截`);
      ctx.error = `[执行终止] 后台任务中，Shell 命令 "${command}" 未命中自动放行名单（可让管理员将该命令加入后端放行名单），已安全拦截。`;
      return false;
    }
    // 前台对话：二次授权（唯一仍依赖前端在线的环节）
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
    return true;
  }
  /**
   * 解析本次命令的实际工作区目录：
   * 本次参数显式 cwd > 复用 session 创建时绑定的 cwd（持久工作区）> 后端进程根目录
   */
  _resolveCwd(tool, params) {
    if (params?.cwd) {return params.cwd}
    const sessionId = params?.sessionId
    if (sessionId && tool?.parentPlugin?.sessions && typeof tool.parentPlugin.sessions.get === 'function') {
      const session = tool.parentPlugin.sessions.get(sessionId)
      if (session && session.cwd) {return session.cwd}
    }
    return process.cwd()
  }
}