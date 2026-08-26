import prismaManager from '../prisma.js'

/**
 * 绝对危险命令：永远禁止"记住/自动放行"，强制每次人工确认（档1）
 * 破坏/提权/切换交互 shell/系统级操作。一般高危（node/python/npm/pnpm/curl...）属档2，可记住仅限工作区。
 */
export const FORCE_APPROVAL_EXECS = [
  'rm', 'rmdir', 'sudo', 'mv', 'chmod', 'chown', 'unlink',
  'dd', 'mkfs', 'shutdown', 'reboot',
  'sh', 'bash', 'zsh',
]

/**
 * Shell 自动审批策略服务（后端权威名单）
 *
 * 替代原先"前端 localStorage 自动批准名单 + 事件体 settings.shWhitelist"的割裂设计：
 *  - allow 规则：白名单放行（可选 cwd 目录前缀绑定 → 只在指定工作区内生效）
 *  - deny 规则：高危黑名单，永远必须人工介入（deny 优先于 allow）
 *  - 高危命令不允许进入 allow 名单（防呆，与前端旧 isHighRiskCommand 清单保持一致）
 *
 * 判定语义（evaluate）：
 *   deny 命中        → { verdict: 'block' }    （直接拒绝/发人工审批）
 *   allow 命中且目录匹配 → { verdict: 'allow' }  （后端直接放行，不依赖前端）
 *   否则              → { verdict: 'unknown' } （按调用方策略：后台任务拦截 / 前台发审批）
 */
export class ShellPolicyService {
  prisma = null
  _seeded = false
  _seededCount = 0

  async initialize() {
    if (!this.prisma) {
      await prismaManager.initialize()
      this.prisma = prismaManager.getClient()
    }
    // 首次访问自动播种内置 deny 规则（幂等；任何入口：REST / hook / 工具 都会走到这里）
    if (!this._seeded) {
      this._seeded = true
      await this._seedIfEmpty()
    }
  }

  /**
   * 若表为空则播种内置高危 deny 规则（清单与前端旧 isHighRiskCommand 保持一致）
   * 幂等：表非空或已播种则跳过；返回本次实际播种条数
   */
  async _seedIfEmpty() {
    if (!this.prisma?.shellAutoApproveRule) return 0
    const count = await this.prisma.shellAutoApproveRule.count()
    if (count > 0) return 0
    const HIGH_RISK = [
      // 档1 绝对危险（禁记住，强制人工确认）
      'rm', 'rmdir', 'sudo', 'mv', 'chmod', 'chown', 'unlink',
      'dd', 'mkfs', 'shutdown', 'reboot', 'sh', 'bash', 'zsh',
      // 档2 一般高危（可记住，限工作区）
      'node', 'python', 'python3', 'pip', 'pip3', 'npm', 'yarn', 'pnpm',
      'curl', 'wget', 'docker',
    ]
    // 档1（绝对危险）禁记住 → rememberable=false；档2（一般高危）可记住 → rememberable=true
    const forceExecSet = new Set(FORCE_APPROVAL_EXECS)
    await this.prisma.shellAutoApproveRule.createMany({
      data: HIGH_RISK.map(cmd => ({
        matchType: 'prefix',
        match: cmd,
        cwd: null,
        deny: true,
        rememberable: !forceExecSet.has(cmd),
        enabled: true,
      })),
    })
    this._seededCount = HIGH_RISK.length
    return this._seededCount
  }

  /**
   * 兼容旧调用：确保初始化并播种
   */
  async ensureDefaults() {
    await this.initialize()
    return this._seededCount
  }

  /**
   * 列出所有规则（deny 在前，allow 按创建倒序）
   */
  async list() {
    await this.initialize()
    const rules = await this.prisma.shellAutoApproveRule.findMany({ orderBy: [{ deny: 'desc' }, { id: 'desc' }] })
    return rules.map(r => ({
      cwd: r.cwd,
      deny: r.deny,
      enabled: r.enabled,
      id: r.id,
      match: r.match,
      matchType: r.matchType,
      rememberable: r.rememberable,
    }))
  }

  /**
   * 新增规则
   * @param {{matchType:'command'|'prefix', match:string, cwd?:string, deny?:boolean, enabled?:boolean}} input
   * @returns 新规则对象；若 allow 规则命中高危命令则抛错
   */
  async add(input) {
    await this.initialize()
    const matchType = input.matchType === 'prefix' ? 'prefix' : 'command'
    const match = String(input.match || '').trim()
    if (!match) throw new Error('规则匹配串不能为空')
    const deny = Boolean(input.deny)
    if (!deny) {
      // 防呆升级：
      //  1) 绝对危险(档1) 永远不允许加入 allow/记住 —— 即使前端传 allowHighRisk 也拒绝（必须每次人工确认）
      //  2) 一般高危(档2) 允许通过“用户现场授权并记住”创建（allowHighRisk=true），但不允许 REST/工具手动添加
      if (this.isForceApprovalCommand(match)) {
        throw new Error(`命令 "${match}" 属绝对危险命令，禁止记住或自动放行，必须每次人工确认`)
      }
      if (this.isHighRiskCommand(match) && !input.allowHighRisk) {
        throw new Error(`命令 "${match}" 属高危命令，不允许加入自动放行名单，只能人工审批`)
      }
    }
    const cwd = input.cwd ? String(input.cwd).trim() : null
    const rule = await this.prisma.shellAutoApproveRule.create({
      data: {
        matchType,
        match,
        cwd,
        deny,
        enabled: input.enabled !== false,
      },
    })
    return {
      cwd: rule.cwd,
      deny: rule.deny,
      enabled: rule.enabled,
      id: rule.id,
      match: rule.match,
      matchType: rule.matchType,
    }
  }

  /**
   * 删除规则（可删除 deny，管理员自担风险）
   */
  async remove(id) {
    await this.initialize()
    const existing = await this.prisma.shellAutoApproveRule.findUnique({ where: { id: Number(id) } })
    if (!existing) throw new Error(`规则 #${id} 不存在`)
    await this.prisma.shellAutoApproveRule.delete({ where: { id: existing.id } })
    return { removed: true }
  }

  /**
   * 核心判定：命令 + 实际工作区目录 → 放行/拦截/未知
   * @param {string} command 待执行命令
   * @param {string|null} actualCwd 实际工作区（会话绑定 cwd / 本次参数 cwd / 兜底后端根目录）
   * @returns {{verdict:'allow'|'block'|'unknown', rule?:object, reason?:string}}
   */
  async evaluate(command, actualCwd = null) {
    await this.initialize()
    if (!command || !command.trim()) return { verdict: 'unknown', reason: 'empty-command' }
    const cmd = command.trim()
    const rules = await this.prisma.shellAutoApproveRule.findMany({ where: { enabled: true } })

    // 1. allow 优先：用户人工确认并"记住"的放行规则（可覆盖默认高危黑名单）
    //    命中命令 + 目录匹配（规则无 cwd=全局；有 cwd=仅绑定工作区及子目录内生效）
    for (const rule of rules) {
      if (rule.deny) continue
      if (!this._matchCommand(cmd, rule)) continue
      if (rule.cwd) {
        if (!actualCwd) continue
        if (!this._cwdInScope(actualCwd, rule.cwd)) continue
      }
      return { verdict: 'allow', rule: this._toPlain(rule), reason: 'allow-rule-hit' }
    }

    // 2. deny：默认高危黑名单命中 → block（不看 cwd，全局生效）
    //    匹配语义：拆子命令(&&/||/|/;)按可执行名全等判定，防止 `cd / && rm -rf` 这类绕过
    for (const rule of rules) {
      if (!rule.deny) continue
      if (this._matchDeny(cmd, rule.match)) {
        return { verdict: 'block', rule: this._toPlain(rule), reason: 'deny-rule-hit' }
      }
    }

    return { verdict: 'unknown', reason: 'no-rule-hit' }
  }

  /**
   * deny 规则匹配：将命令按 && / || / | / ; 拆成子命令段，
   * 任一子命令可执行名与黑名单项全等即命中（高危判定在命令层，不在目录层）
   */
  _matchDeny(cmd, executable) {
    const stripQuotes = /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`/g
    const clean = cmd.replace(stripQuotes, ' ')
    for (const segment of clean.split(/&&|\|\||\||;/)) {
      const exe = this.getCommandPrefix(segment)
      if (exe && exe === executable) return true
    }
    return false
  }

  /**
   * allow 规则匹配（command 全等 / prefix 前缀）
   */
  _matchCommand(cmd, rule) {
    if (rule.matchType === 'prefix') {
      return cmd.startsWith(rule.match)
    }
    return cmd === rule.match
  }

  /**
   * 实际 cwd 是否在规则绑定的工作区目录前缀内（含子目录）
   */
  _cwdInScope(actualCwd, scopeCwd) {
    const a = String(actualCwd).replace(/\/+$/, '')
    const s = String(scopeCwd).replace(/\/+$/, '')
    return a === s || a.startsWith(s + '/')
  }

  /**
   * 判断命令是否“绝对危险”（档1，禁记住/强制人工确认）
   * 拆子命令按可执行名全等判定，防 `cd / && sudo rm` 绕过
   */
  isForceApprovalCommand(command) {
    if (!command) return true
    const forceSet = new Set(FORCE_APPROVAL_EXECS)
    const stripQuotes = /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`/g
    const clean = String(command).replace(stripQuotes, ' ')
    for (const segment of clean.split(/&&|\|\||\||;/)) {
      const exe = this.getCommandPrefix(segment)
      if (exe && forceSet.has(exe)) return true
    }
    return false
  }

  /**
   * 复刻前端 isHighRiskCommand：解析命令可执行名（拆掉管道/&&/引号），判断是否高危
   */
  isHighRiskCommand(command) {
    if (!command) return true
    const HIGH_RISK = new Set([
      'rm', 'rmdir', 'sh', 'bash', 'zsh', 'sudo', 'unlink',
      'node', 'python', 'python3', 'pip', 'pip3', 'npm', 'yarn', 'pnpm',
      'curl', 'wget', 'docker', 'mv', 'chmod', 'chown',
    ])
    const stripQuotes = /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`/g
    const withoutQuotes = command.trim().replace(stripQuotes, ' ')
    for (let subCmd of withoutQuotes.split(/&&|\|\||\||;/)) {
      subCmd = subCmd.trim()
      if (!subCmd) continue
      const executable = this.getCommandPrefix(subCmd)
      if (executable && HIGH_RISK.has(executable)) return true
    }
    return false
  }

  /**
   * 提取命令的第一个可执行名（复刻前端 getCommandPrefix）
   * @param {string} command
   * @returns {string} 小写可执行名（如 'git status' → 'git'）
   */
  getCommandPrefix(command) {
    if (!command) return ''
    const words = command.trim()
      .split(/\s+/)
      .filter(w => !w.includes('=') && w.length > 0)
    if (words.length === 0) return ''
    return words[0]
      .replace(/^[^a-zA-Z0-9_\-/]+|[^a-zA-Z0-9_\-/]+$/g, '')
      .toLowerCase()
  }

  _toPlain(rule) {
    return { cwd: rule.cwd, deny: rule.deny, id: rule.id, match: rule.match, matchType: rule.matchType, rememberable: rule.rememberable }
  }
}

export const shellPolicyService = new ShellPolicyService()