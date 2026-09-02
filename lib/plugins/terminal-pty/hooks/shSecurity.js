import BaseHook from '../../../hooks/BaseHook.js'
import { HOOK_POINTS } from '../../../hooks/types.js'
import { shellPolicyService } from '../../../database/services/ShellPolicyService.js'
/**
 * Shell 安全拦截 Hook
 *
 * 判定顺序（2026-08 重构，权威名单下沉后端，解除"前端在线/前端名单"依赖）：
 *   1. yolo 模式            → 全部放行（高危全局开关，仅调试期建议开启）
 *   2. 后端权威名单          → allow(白名单, 可选 cwd 工作区绑定) 命中: 放行
 *                            → deny(高危黑名单) / unknown: 进入下一步分流
 *   3. 分流：
 *        - 后台任务(isTask)  → 安全拦截（无人在线可人工审批，高危/未授权一律拒绝）
 *        - 前台对话          → requestUserApproval 人工审批
 *                             （高危命令强调"⚠️ 高危"，用户可在现场授权执行）
 *
 * 语义要点：don't deny-and-silently-block in-front-of-user——高危命令在前台永远走人工审批，
 *           由用户决定是否真需要执行；"一刀切拦截"只发生在无人值守的后台任务。
 *
 * 实际工作区(cwd)解析：本次参数显式 cwd > 复用 session 创建时绑定的 cwd > 后端进程根目录
 */
export default class ShSecurityHook extends BaseHook {
  constructor(options) {
    super({
      description:
        'Shell 命令执行安全屏障（后端权威名单 + 工作区绑定 + 二次授权）',
      hookPoint: HOOK_POINTS.TOOL_BEFORE_EXECUTE,
      name: 'sh-security-guard',
      namespace: options.namespace,
      priority: 85,
    })
    this.securityTools = ['bash', 'bash_input']
  }
  async execute(ctx) {
    const { tool, event, params } = ctx
    const command = params?.command || params?.data
    const isSecurityTarget = this.securityTools.some((name) =>
      tool.name.startsWith(name),
    )
    if (!isSecurityTarget || !command) {
      return true
    }

    // 1. yolo 全局免审
    const isYolo = event.body?.settings?.yolo === true
    if (isYolo) {
      return true
    }

    // 2. 后端权威名单判定（allow 直接放行；deny=高危黑名单 / unknown=未配置）
    const actualCwd = this._resolveCwd(tool, params)
    const isInteractiveInput = tool.name === 'bash_input'
    const session =
      params?.sessionId && tool?.parentPlugin?.sessions?.get?.(params.sessionId)
    // Once arbitrary keys/text have entered a PTY, it may have functions,
    // aliases, variables or a changed PATH. It must never regain the small
    // read-only fast path during that session.
    if (isInteractiveInput && session) session.safeReadonlyEligible = false
    const allowSafeReadonly =
      !isInteractiveInput &&
      params?.async !== true &&
      (!session || session.safeReadonlyEligible === true)
    let policy
    try {
      policy = await shellPolicyService.evaluate(command, actualCwd, {
        allowSafeReadonly,
      })
    } catch (error) {
      logger.warn(
        '[sh-security-guard] ShellPolicyService 判定失败，按阻断策略处理:',
        error.message,
      )
      policy = { reason: 'policy-error', verdict: 'block' }
    }
    // A manually approved command may change aliases, functions, variables,
    // or PATH. Conservatively taint an existing PTY before that command runs.
    if (session && policy.verdict !== 'allow')
      session.safeReadonlyEligible = false
    const isHighRisk =
      policy.reason === 'force-approval-command' ||
      policy.reason === 'deny-rule-hit'
    const isUnsafeSyntax = policy.reason === 'unsafe-shell-syntax'
    if (policy.verdict === 'allow') {
      logger.debug(
        `[sh-security-guard] 后端自动放行: ${command} (cwd=${actualCwd})`,
      )
      return true
    }

    // 3. 分流：后台任务直接拦截；前台对话走人工审批
    const isTask = event.metaData?.isTask === true
    if (isTask) {
      const msg = isHighRisk
        ? `[执行终止] 后台任务中，命令 "${command}" 命中高危黑名单，已安全拦截并拒绝执行。`
        : isUnsafeSyntax
          ? `[执行终止] 后台任务中，命令 "${command}" 包含不安全的 Shell 语法，已安全拦截并拒绝执行。`
          : `[执行终止] 后台任务中，Shell 命令 "${command}" 未命中自动放行名单（可让管理员将该命令加入后端放行名单），已安全拦截。`
      logger.warn(`[sh-security-guard] 任务命令被拦: ${command}`)
      ctx.error = msg
      return false
    }

    // 前台对话：唯一仍依赖前端在线的环节（高危走强化提示的人工审批）
    // rememberable=false（绝对危险）：前端不展示“记住”按钮，强制每次人工确认
    const prompt = isHighRisk
      ? '⚠️ 高危命令，请用户确认是否授权执行：'
      : isUnsafeSyntax
        ? '⚠️ 复杂或不安全的 Shell 语法，请用户确认是否授权执行：'
        : '是否授权 LLM 执行命令：'
    const approval = await tool.requestUserApproval(event, prompt, {
      command,
      highRisk: isHighRisk || undefined,
      rememberable: this._isRememberable(policy, command),
    })
    if (!approval.approved) {
      const reasonMsg = approval.reason ? ` 原因: ${approval.reason}` : ''
      ctx.error = `[执行终止] 用户拒绝授权此 Shell 命令 "${command}" 的执行。${reasonMsg}`
      return false
    }
    // 用户选择“授权并记住”：把该命令/前缀写入后端放行名单（绑定当前工作区 cwd），
    // 之后同一工作区内的相同命令免确认自动放行。
    // 用户选择“授权并记住”：把该命令/前缀写入后端放行名单（绑定当前工作区 cwd），
    // 之后同一工作区内的相同命令免确认自动放行。绝对危险（档1）会被 add 拦下（强制每次确认）。
    if (
      approval.rememberType &&
      ['prefix1', 'prefix2'].includes(approval.rememberType)
    ) {
      try {
        const prefixes = shellPolicyService.getCommandPrefixes(command)
        const rememberMatch =
          approval.rememberType === 'prefix2'
            ? prefixes.prefix2
            : prefixes.prefix1
        const rule = await shellPolicyService.add({
          matchType: 'prefix',
          match: rememberMatch,
          cwd: actualCwd, // 绑定当前工作区：换目录需重新确认
          deny: false,
          allowHighRisk: true, // 用户现场授权记住，允许覆盖默认高危黑名单（但绝对危险仍会被拒）
        })
        logger.info(
          `[sh-security-guard] 用户授权并记住放行规则 #${rule.id}: ${rule.matchType} "${rule.match}"${rule.cwd ? ` (cwd=${rule.cwd})` : ''}`,
        )
      } catch (error) {
        logger.warn(
          '[sh-security-guard] 记住放行规则失败（强制人工确认）:',
          error.message,
        )
      }
    } else if (approval.rememberType) {
      logger.warn(
        `[sh-security-guard] 忽略未知白名单粒度: ${approval.rememberType}`,
      )
    }
    return true
  }

  /**
   * 该命令是否允许“记住”（供前端渲染记住按钮）
   * 绝对危险命令 ⇢ 永远 false；高危 deny 规则 ⇢ 看规则 rememberable；其余未知命令 ⇢ true
   */
  _isRememberable(policy, command) {
    if (shellPolicyService.isForceApprovalCommand(command)) return false
    if (
      policy.reason === 'unsafe-shell-syntax' ||
      policy.reason === 'policy-error'
    )
      return false
    if (policy.compound && policy.safeShell !== true) return false
    if (policy.verdict === 'block') return policy.rule?.rememberable === true
    return true
  }
  /**
   * 解析本次命令的实际工作区目录：
   * 本次参数显式 cwd > 复用 session 创建时绑定的 cwd（持久工作区）> 后端进程根目录
   */
  _resolveCwd(tool, params) {
    if (params?.cwd) {
      return params.cwd
    }
    const sessionId = params?.sessionId
    if (
      sessionId &&
      tool?.parentPlugin?.sessions &&
      typeof tool.parentPlugin.sessions.get === 'function'
    ) {
      const session = tool.parentPlugin.sessions.get(sessionId)
      if (session && session.cwd) {
        return session.cwd
      }
    }
    return process.cwd()
  }
}
