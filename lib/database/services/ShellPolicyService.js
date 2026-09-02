import prismaManager from '../prisma.js'
import { analyzeShellCommand } from './ShellCommandAnalyzer.js'

/**
 * 绝对危险命令：永远禁止"记住/自动放行"，强制每次人工确认（档1）
 * 破坏/提权/切换交互 shell/系统级操作。一般高危（node/python/npm/pnpm/curl...）属档2，可记住仅限工作区。
 */
export const FORCE_APPROVAL_EXECS = [
  'rm', 'rmdir', 'sudo', 'mv', 'chmod', 'chown', 'unlink',
  'dd', 'mkfs', 'shutdown', 'reboot',
  'sh', 'bash', 'zsh',
]

// PowerShell cmdlets and Windows utilities that can mutate the filesystem,
// services, ACLs, scheduled tasks, or launch arbitrary code.  TerminalSession
// runs PowerShell on win32, so aliases are included as well as canonical names.
export const WINDOWS_FORCE_APPROVAL_EXECS = [
  'remove-item', 'ri', 'del', 'erase', 'rd', 'move-item', 'mi', 'move',
  'copy-item', 'ci', 'copy', 'new-item', 'ni', 'set-content', 'sc',
  'add-content', 'ac', 'out-file', 'start-process', 'start',
  'invoke-expression', 'iex', 'invoke-command', 'icm',
  'cmd', 'cmd.exe', 'powershell', 'powershell.exe', 'pwsh', 'pwsh.exe',
  'wsl', 'wsl.exe', 'msiexec', 'msiexec.exe', 'rundll32', 'rundll32.exe',
  'reg', 'reg.exe', 'schtasks', 'schtasks.exe',
  'invoke-item', 'add-type', 'new-object', 'set-executionpolicy',
  'install-module', 'uninstall-module', 'update-module',
  'stop-computer', 'restart-computer', 'format', 'format.exe',
  'diskpart', 'diskpart.exe', 'takeown', 'takeown.exe', 'icacls', 'icacls.exe',
  'set-acl', 'register-scheduledtask', 'unregister-scheduledtask',
  'start-service', 'stop-service', 'restart-service', 'set-service',
]

// 命令包装器/分发器可能把真正的可执行文件藏在参数中。
// 它们不能被前缀白名单自动放行，否则 `env rm ...` 会绕过 rm 的强制确认。
export const FORCE_APPROVAL_WRAPPERS = [
  '.', 'builtin', 'busybox', 'chroot', 'command', 'coproc', 'env', 'eval',
  'exec', 'flock', 'nice', 'nohup', 'setsid', 'source', 'stdbuf', 'taskset',
  'time', 'timeout', 'watch', 'xargs',
]

/**
 * Shell 自动审批策略服务（后端权威名单）
 *
 * 后端数据库是唯一策略来源：
 *  - allow 规则：白名单放行（可选 cwd 目录前缀绑定 → 只在指定工作区内生效）
 *  - deny 规则：高危黑名单，永远必须人工介入（deny 优先于 allow）
 *  - 高危命令不允许进入 allow 名单（防呆，与前端旧 isHighRiskCommand 清单保持一致）
 *
 * 判定语义（evaluate）：
 *   deny 命中        → { verdict: 'block' }    （直接拒绝/发人工审批）
 *   allow 命中且目录匹配 → { verdict: 'allow' }  （后端直接放行，不依赖前端）
 *   AST 判定为只读安全命令 → { verdict: 'allow' } （包含安全的复合管道）
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
      // Windows / PowerShell 网络下载、系统安装与脚本执行
      'invoke-webrequest', 'iwr', 'invoke-restmethod', 'irm',
      'start-bitstransfer', 'certutil', 'certutil.exe', 'bitsadmin', 'bitsadmin.exe',
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
    if (!command || !command.trim()) return { verdict: 'unknown', reason: 'empty-command' }
    const cmd = command.trim()

    if (this.isForceApprovalCommand(cmd)) {
      return { verdict: 'block', reason: 'force-approval-command' }
    }

    // Parse before consulting persisted rules.  AST inspection lets safe
    // read-only commands use pipes/&&/; while still rejecting expansion,
    // script blocks, background jobs, and non-/dev/null output redirections.
    const analysis = analyzeShellCommand(cmd)
    const metadata = { compound: analysis.compound, safeShell: analysis.safe }
    if (!analysis.syntaxSafe) {
      return { verdict: 'block', reason: 'unsafe-shell-syntax' }
    }

    let rules
    try {
      await this.initialize()
      rules = await this.prisma.shellAutoApproveRule.findMany({ where: { enabled: true } })
    } catch {
      return { verdict: 'block', reason: 'policy-error' }
    }

    // 1. allow 优先：用户人工确认并"记住"的放行规则（可覆盖默认高危黑名单）
    //    命中命令 + 目录匹配（规则无 cwd=全局；有 cwd=仅绑定工作区及子目录内生效）
    for (const rule of rules) {
      if (rule.deny) continue
      if (!this._matchCommand(cmd, rule, analysis)) continue
      if (rule.cwd) {
        if (!actualCwd) continue
        if (!this._cwdInScope(actualCwd, rule.cwd)) continue
      }
      return { verdict: 'allow', rule: this._toPlain(rule), reason: 'allow-rule-hit', ...metadata }
    }

    // 2. deny：默认高危黑名单命中 → block（不看 cwd，全局生效）
    //    匹配语义：拆子命令(&&/||/|/;)按可执行名全等判定，防止 `cd / && rm -rf` 这类绕过
    for (const rule of rules) {
      if (!rule.deny) continue
      if (this._matchDeny(cmd, rule.match)) {
        return { verdict: 'block', rule: this._toPlain(rule), reason: 'deny-rule-hit', ...metadata }
      }
    }

    // Older installations may already contain user rules and therefore never
    // receive newly added built-in deny rows through the empty-table seeder.
    // Keep the built-in high-risk set authoritative in that case, while still
    // allowing an explicit user allow rule above to opt in deliberately.
    if (this.isHighRiskCommand(cmd)) {
      return { verdict: 'block', reason: 'deny-rule-hit', ...metadata }
    }

    // A positive list is intentionally evaluated after deny rules.  This
    // makes a future persisted deny rule authoritative without weakening the
    // no-confirmation path for ordinary read-only compound commands.
    if (analysis.safe) {
      return { verdict: 'allow', reason: 'safe-readonly-command', ...metadata }
    }

    return { verdict: 'unknown', reason: 'no-rule-hit', ...metadata }
  }

  /**
   * deny 规则匹配：将命令按 && / || / | / ; 拆成子命令段，
   * 任一子命令可执行名与黑名单项全等即命中（高危判定在命令层，不在目录层）
   */
  _matchDeny(cmd, executable) {
    for (const segment of this._splitShellSegments(cmd)) {
      const exe = this._getExecutableName(segment)
      if (exe && exe === executable) return true
    }
    return false
  }

  /**
   * allow 规则匹配（command 全等 / prefix 前缀）
   */
  _matchCommand(cmd, rule, analysis = analyzeShellCommand(cmd)) {
    const match = this._canonicalCommand(rule.match)
    const canonicalCommand = this._canonicalCommand(cmd)
    if (!match || !canonicalCommand || !analysis.syntaxSafe || analysis.compound) return false
    if (rule.matchType === 'prefix') {
      return canonicalCommand === match || canonicalCommand.startsWith(`${match} `)
    }
    return canonicalCommand === match
  }

  _hasSingleShellCommand(command) {
    const clean = String(command || '').replace(/"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`/g, ' ')
    return !/&&|\|\||[|;&\n]/.test(clean)
  }

  _hasUnsafeShellSyntax(command) {
    // Kept for callers that need the legacy lexical check; evaluate and
    // persisted allow matching use the AST result above so quoted operators
    // and safe /dev/null redirections are not rejected accidentally.
    return /\r|\n|&&|\|\||[|;&<>`$()!]/.test(String(command || ''))
  }

  /**
   * 实际 cwd 是否在规则绑定的工作区目录前缀内（含子目录）。同时接受
   * Unix `/` 和 Windows `\\` 分隔符，Windows 比较不区分大小写。
   */
  _cwdInScope(actualCwd, scopeCwd) {
    const trimSeparators = value => String(value).replace(/[\\/]+$/, '')
    let a = trimSeparators(actualCwd)
    let s = trimSeparators(scopeCwd)
    if (process.platform === 'win32') {
      a = a.toLowerCase()
      s = s.toLowerCase()
    }
    return a === s || a.startsWith(`${s}/`) || a.startsWith(`${s}\\`)
  }

  /**
   * 判断命令是否“绝对危险”（档1，禁记住/强制人工确认）
   * 拆子命令按可执行名全等判定，防 `cd / && sudo rm` 绕过
   */
  isForceApprovalCommand(command) {
    if (!command) return true
    const forceSet = new Set([
      ...FORCE_APPROVAL_EXECS,
      ...WINDOWS_FORCE_APPROVAL_EXECS,
      ...FORCE_APPROVAL_WRAPPERS,
    ])
    for (const segment of this._splitShellSegments(command)) {
      const words = this._extractCommandWords(segment)
      const rawExecutable = words[0] || ''
      const exe = this._getExecutableName(segment)
      if (/^(?:\.{1,2}[\\/]|[A-Za-z]:[\\/])/.test(rawExecutable)) return true
      if (exe && forceSet.has(exe)) return true
    }
    return false
  }

  /**
   * 复刻前端 isHighRiskCommand：解析命令可执行名（拆掉管道/&&/引号），判断是否高危。
   * 该静态回退用于已有规则的数据库，避免新增平台规则只能在空表播种时生效。
   */
  isHighRiskCommand(command) {
    if (!command) return true
    const HIGH_RISK = new Set([
      'rm', 'rmdir', 'sh', 'bash', 'zsh', 'sudo', 'unlink',
      'node', 'python', 'python3', 'pip', 'pip3', 'npm', 'yarn', 'pnpm',
      'curl', 'wget', 'docker', 'mv', 'chmod', 'chown',
      'invoke-webrequest', 'iwr', 'invoke-restmethod', 'irm',
      'start-bitstransfer', 'certutil', 'certutil.exe', 'bitsadmin', 'bitsadmin.exe',
    ])
    for (let subCmd of this._splitShellSegments(command)) {
      subCmd = subCmd.trim()
      if (!subCmd) continue
      const executable = this._getExecutableName(subCmd)
      if (executable && HIGH_RISK.has(executable)) return true
    }
    return false
  }

  /**
   * 提取命令的前 N 个可执行词（复刻前端 getCommandPrefix）
   * @param {string} command
   * @param {number} [wordCount=1]
   * @returns {string} 小写命令前缀（如 'git status --short' → 'git status'）
   */
  getCommandPrefix(command, wordCount = 1) {
    const words = this._extractCommandWords(command)
    if (words.length === 0) return ''
    const count = Math.max(1, Number(wordCount) || 1)
    return words.slice(0, count).map((word, index) => {
      const cleaned = word.replace(/^[^a-zA-Z0-9_\-/]+|[^a-zA-Z0-9_\-/]+$/g, '')
      return index === 0 ? cleaned.toLowerCase() : cleaned
    }).filter(Boolean).join(' ')
  }

  getCommandPrefixes(command) {
    const words = this._extractCommandWords(command)
    return {
      prefix1: words.slice(0, 1).join(' '),
      prefix2: words.slice(0, 2).join(' '),
    }
  }

  _canonicalCommand(command) {
    return this._extractCommandWords(command).join(' ')
  }

  _extractCommandWords(command) {
    if (!command) return []
    const words = this._tokenizeShellWords(command)
    let start = 0
    while (start < words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[start])) start++
    return words.slice(start)
  }

  _getExecutableName(command) {
    const words = this._extractCommandWords(command)
    if (words.length === 0) return ''
    const first = words[0].replace(/^.*[\\/]/, '')
    const executable = first.toLowerCase()
    return executable.endsWith('.exe') ? executable.slice(0, -4) : executable
  }

  _tokenizeShellWords(command) {
    const tokens = []
    let token = ''
    let quote = null
    let escaped = false
    for (const char of String(command || '').trim()) {
      if (escaped) {
        token += char
        escaped = false
      } else if (char === '\\' && quote !== "'") {
        escaped = true
      } else if (quote) {
        if (char === quote) quote = null
        else token += char
      } else if (char === '"' || char === "'") {
        quote = char
      } else if (/\s/.test(char)) {
        if (token) {
          tokens.push(token)
          token = ''
        }
      } else {
        token += char
      }
    }
    if (escaped) token += '\\'
    if (token) tokens.push(token)
    return tokens
  }

  _splitShellSegments(command) {
    const segments = []
    let segment = ''
    let quote = null
    let escaped = false
    const source = String(command || '')
    for (let i = 0; i < source.length; i++) {
      const char = source[i]
      const next = source[i + 1]
      if (escaped) {
        segment += char
        escaped = false
        continue
      }
      if (char === '\\' && quote !== "'") {
        segment += char
        escaped = true
        continue
      }
      if (quote) {
        segment += char
        if (char === quote) quote = null
        continue
      }
      if (char === '"' || char === "'") {
        segment += char
        quote = char
        continue
      }
      if (char === '&' && next === '&' || char === '|' && next === '|' || char === '|' || char === ';' || char === '\n') {
        if (segment.trim()) segments.push(segment.trim())
        segment = ''
        if ((char === '&' && next === '&') || (char === '|' && next === '|')) i++
        continue
      }
      segment += char
    }
    if (segment.trim()) segments.push(segment.trim())
    return segments
  }

  _toPlain(rule) {
    return { cwd: rule.cwd, deny: rule.deny, id: rule.id, match: rule.match, matchType: rule.matchType, rememberable: rule.rememberable }
  }
}

export const shellPolicyService = new ShellPolicyService()
