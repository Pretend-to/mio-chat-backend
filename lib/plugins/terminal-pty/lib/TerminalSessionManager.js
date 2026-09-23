import { EventEmitter } from 'events'
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
const ANSI_REGEX =
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
const OSC_REGEX = /\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g
const stripAnsi = (str) =>
  typeof str === 'string'
    ? str.replace(OSC_REGEX, '').replace(ANSI_REGEX, '')
    : ''

const SH_DONE_MARKER = '__SH_DONE__'
/**
 * Clean terminal output: strip ANSI + normalize control chars.
 * - ANSI escape codes removed via strip-ansi
 * - Carriage returns: \r\n → \n (windows line endings), standalone \r removed
 * - Backspaces: "e\becho" → "echo" resolved on each line
 */
function renderTerminalLine(chunk) {
  const cells = []
  let cursor = 0

  for (const ch of chunk) {
    if (ch === '\r') {
      cursor = 0
      continue
    }
    if (ch === '\b') {
      cursor = Math.max(0, cursor - 1)
      continue
    }

    const code = ch.charCodeAt(0)
    // Keep tabs, but remove BEL/NUL and the remaining C0/DEL controls.
    if ((code < 0x20 && code !== 0x09) || code === 0x7f) continue
    cells[cursor] = ch
    cursor += 1
  }

  return cells.join('').trimEnd()
}

export function cleanTerminalOutput(raw) {
  // Step 1: Strip ANSI escape codes
  const noAnsi = stripAnsi(raw)
  // Step 2: Normalize newlines (\r\n -> \n)
  const normalized = noAnsi.replace(/\r\n/g, '\n')
  // Step 3: Render CR/BS as terminal cursor movement while preserving blank
  // lines. The old implementation kept only the final CR segment, which
  // discarded real output whenever readline/progress output redrew a line.
  return normalized.split('\n').map(renderTerminalLine).join('\n')
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`
}

function powershellQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

function extractMarkerExitCode(raw, marker) {
  const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = raw.match(new RegExp(`${escapedMarker}:(-?\\d+)`))
  return match ? Number.parseInt(match[1], 10) : 0
}

function renderXtermLines(xterm) {
  const buffer = xterm.buffer.active
  const lines = []
  for (let index = 0; index < buffer.length; index += 1) {
    const line = buffer.getLine(index)
    lines.push(line ? line.translateToString(true) : '')
  }
  return lines
}

function isPromptEcho(line, command) {
  const value = line.trim()
  const target = String(command || '').trim()
  if (!value || !target) return false
  if (value === target) return 'plain'
  // Bash/zsh and PowerShell echo the submitted command after a prompt. Match
  // only the complete suffix so command output containing '$' or '>' remains.
  if (
    value.endsWith(`$ ${target}`) ||
    value.endsWith(`# ${target}`) ||
    value.endsWith(`% ${target}`) ||
    value.endsWith(`> ${target}`)
  )
    return 'prompt'
  return false
}

/**
 * Extract only the command result from a PTY transcript. Interactive shells
 * echo both the submitted command and the internal marker command, often with
 * a prompt/title-control prefix. The marker is intentionally used as the
 * right boundary; without it (timeout) we still remove the submitted echo.
 */
export function filterExecOutput(raw, command, marker = '') {
  const cleaned = cleanTerminalOutput(raw)
  const lines = cleaned ? cleaned.split('\n') : []
  const markerToken = marker ? `${marker}:` : ''
  const markerIndexWithExitCode = marker
    ? lines.findLastIndex((line) => line.includes(markerToken))
    : -1
  const markerIndex =
    markerIndexWithExitCode >= 0
      ? markerIndexWithExitCode
      : marker
        ? lines.findLastIndex((line) => line.includes(marker))
        : -1
  const end = markerIndex >= 0 ? markerIndex : lines.length

  let start = -1
  // Prefer a prompt-qualified echo. A plain line equal to the command may be
  // legitimate command output, so only use it as a fallback and take the
  // first occurrence.
  for (let index = end - 1; index >= 0; index--) {
    if (isPromptEcho(lines[index], command) === 'prompt') {
      start = index
      break
    }
  }
  if (start < 0) {
    const plainIndex = lines.findIndex(
      (line, index) => index < end && isPromptEcho(line, command) === 'plain',
    )
    // A bare echo is only considered shell input when it is at the transcript
    // head. Later identical text is much more likely to be legitimate output.
    start = plainIndex >= 0 && plainIndex <= 1 ? plainIndex : -1
  }

  // Two kinds of internal marker lines can appear in the transcript, and both
  // must be stripped:
  //   1) the marker result line, e.g. "__SH_DONE__1789707438334:0"
  //   2) the echo of the marker command itself, e.g.
  //      "printf '\n%s:%s\n' __SH_DONE__1789707438334 $?"
  //      — here the marker is followed by a space, not a colon, so matching
  //      only `${marker}:` lets it leak into every tool result as noise.
  const containsMarker = (line) =>
    Boolean(marker) && (line.includes(markerToken) || line.includes(marker))

  const result = lines
    .slice(start >= 0 ? start + 1 : 0, end)
    .filter((line) => !containsMarker(line))
  while (result.length > 0 && !result[0].trim()) result.shift()
  while (result.length > 0 && !result[result.length - 1].trim()) result.pop()
  return result.join('\n')
}

export default class TerminalSessionManager extends EventEmitter {
  constructor(plugin) {
    super()
    this.plugin = plugin
    this.sessions = new Map()
    this.bgJobs = new Map()
    this._gcTimer = null
  }

  async createSession(opts = {}) {
    const pty = await this._loadPty()
    const HeadlessTerminal = await this._loadXtermHeadless()

    const isWin = process.platform === 'win32'
    // The automatic read-only path needs a known shell with user startup
    // files disabled. Do not inherit $SHELL here: an arbitrary shell/profile
    // can redefine a supposedly safe command before the first invocation.
    const defaultShell = isWin ? 'powershell.exe' : '/bin/bash'
    const shell = opts.shell || defaultShell
    const isDefaultShell = !opts.shell
    const shellBase = shell.replace(/^.*[\\/]/, '').toLowerCase()
    const shellArgs = isDefaultShell
      ? isWin
        ? ['-NoLogo', '-NoProfile']
        : shellBase === 'bash'
          ? ['--noprofile', '--norc']
          : shellBase === 'zsh'
            ? ['-f']
            : []
      : []
    const cwd = opts.cwd || process.cwd()
    const cols = opts.cols || this.plugin?.config?.defaultCols || 120
    const rows = opts.rows || this.plugin?.config?.defaultRows || 40
    const sessionId =
      opts.sessionId ||
      `term_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

    // Startup files are disabled, so the inherited server PATH is a stable
    // baseline for this session. Keeping it avoids breaking manually approved
    // developer commands (node/npm/pnpm) installed outside system directories.
    // Any interactive or manually-approved input taints the session before a
    // later read-only fast-path decision can rely on it again.
    const safePath =
      process.env.PATH ||
      (isWin
        ? `${process.env.SystemRoot || 'C:\\Windows'}\\System32;${process.env.SystemRoot || 'C:\\Windows'}`
        : '/usr/bin:/bin:/usr/sbin:/sbin')
    const ptyProcess = pty.spawn(shell, shellArgs, {
      cols,
      cwd,
      env: {
        ...process.env,
        ...opts.env,
        ...(isDefaultShell ? { PATH: safePath } : {}),
        GIT_PAGER: 'cat',
        PAGER: 'cat',
        PROMPT: '\\w $ ',
        PS1: '\\w $ ', // Shell prompt for marker detection
        TERM: 'xterm-256color',
      },
      name: 'xterm-256color',
      rows,
    })

    const xterm = new HeadlessTerminal.Terminal({ cols, rows })

    const maxOutput = this.plugin?.config?.maxOutputLength || 2 * 1024 * 1024
    // Use mutable object so onData closure and session reference share the same buffer
    const buffers = { ansi: '', text: '' }

    const sessionInfo = {
      cols,
      command: null,
      cwd,
      error: null,
      exitCode: null,
      id: sessionId,
      lastActivity: Date.now(),
      ptyProcess,
      rows,
      shell,
      safeReadonlyEligible: isDefaultShell && !opts.env,
      startTime: new Date(),
      status: 'running',
      tempCommandDirs: new Set(),
      xterm,
    }

    ptyProcess.onData((data) => {
      sessionInfo.lastActivity = Date.now()
      xterm.write(data)

      buffers.ansi += data
      if (buffers.ansi.length > maxOutput) {
        buffers.ansi = buffers.ansi.slice(-maxOutput)
      }

      const plain = cleanTerminalOutput(data)
      buffers.text += plain
      if (buffers.text.length > maxOutput) {
        buffers.text = buffers.text.slice(-maxOutput)
      }

      this.emit('data', sessionId, { data, plain })
    })

    ptyProcess.onExit(({ exitCode, signal }) => {
      sessionInfo.status = 'finished'
      sessionInfo.exitCode = exitCode
      sessionInfo.endTime = new Date()
      this.emit('done', sessionId, { exitCode, signal, status: 'finished' })
    })

    this.sessions.set(sessionId, {
      ...sessionInfo,
      _buffers: buffers,
    })

    this._ensureGc()

    return { cols, cwd, rows, sessionId, shell }
  }

  write(sessionId, data) {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'running') {
      return false
    }
    session.ptyProcess.write(data)
    session.lastActivity = Date.now()
    return true
  }
  /**
   * 以独立子进程运行后台命令（不占用常驻 PTY shell）。
   * 完成靠子进程 exit 事件触发，而非 shell 的 onExit——避免「命令已结束但 shell 仍存活」
   * 导致 done 事件不触发、wait 干等超时的问题。
   */
  runBackground(sessionId, command, opts = {}) {
    const cwd = opts.cwd || process.cwd()
    const shell =
      process.platform === 'win32'
        ? 'powershell.exe'
        : process.env.SHELL || '/bin/bash'
    const maxOutput = this.plugin?.config?.maxOutputLength || 512 * 1024
    const jobId =
      sessionId || `bg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    const buf = { stdout: '', stderr: '' }
    const cap = (s) => (s.length > maxOutput ? s.slice(-maxOutput) : s)
    const job = {
      cwd,
      command,
      error: null,
      exitCode: null,
      id: jobId,
      lastActivity: Date.now(),
      startTime: new Date(),
      status: 'running',
    }
    const child = spawn(shell, ['-c', command], {
      cwd,
      env: { ...process.env, ...opts.env, GIT_PAGER: 'cat', PAGER: 'cat' },
    })
    child.stdout.on('data', (d) => {
      job.lastActivity = Date.now()
      buf.stdout = cap(buf.stdout + d.toString())
    })
    child.stderr.on('data', (d) => {
      job.lastActivity = Date.now()
      buf.stderr = cap(buf.stderr + d.toString())
    })
    const finalize = (exitCode, signal, error) => {
      if (job.status === 'finished') return
      job.status = 'finished'
      job.exitCode = exitCode
      job.error = error || null
      job.endTime = new Date()
      this.emit('done', jobId, {
        exitCode,
        signal,
        status: 'finished',
        error,
        stdout: buf.stdout,
        stderr: buf.stderr,
      })
    }
    child.on('error', (err) => finalize(-1, null, err.message))
    child.on('exit', (code, signal) => finalize(code, signal))
    job.child = child
    job._buf = buf
    this.bgJobs.set(jobId, job)
    return { sessionId: jobId, status: 'running' }
  }
  getBgJob(sessionId) {
    return this.bgJobs.get(sessionId) || null
  }
  readBgScreen(sessionId, opts = {}) {
    const job = this.bgJobs.get(sessionId)
    if (!job || !job._buf) return null
    const { tail } = opts
    const raw = `${job._buf.stdout}${job._buf.stderr ? '\n' + job._buf.stderr : ''}`
    const cleanLines = raw
      .split('\n')
      .map((l) => l.replace(/[\r\b]+/g, '').trimEnd())
    while (cleanLines.length > 0 && cleanLines[cleanLines.length - 1] === '')
      cleanLines.pop()
    const totalLines = cleanLines.length
    const startLine = tail
      ? Math.max(0, totalLines - tail)
      : Math.max(0, totalLines - 100)
    return {
      lineCount: cleanLines.slice(startLine).length,
      lines: cleanLines.slice(startLine),
      sessionId,
    }
  }

  async execCommand(sessionId, command, timeout = 30_000) {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'running') {
      throw new Error(`Session ${sessionId} is not running`)
    }

    session.command = command
    session.lastActivity = Date.now()

    // Use a marker that appears on its own line when the command completes.
    const marker = `${SH_DONE_MARKER}_${Date.now()}`
    const isWin = process.platform === 'win32'
    const enter = isWin ? '\r' : '\n'
    const maxInlineCommandBytes =
      this.plugin?.config?.maxInlineCommandBytes || 700
    const commandBytes = Buffer.byteLength(String(command), 'utf8')
    let commandInput = String(command)
    let markerStatusExpression = isWin ? '$LASTEXITCODE' : '$?'
    let markerInScript = false
    let tempCommandDir = null

    // macOS/Linux PTYs use a canonical input buffer with MAX_CANON around
    // 1024 bytes. Sending a long command directly can silently truncate it,
    // split UTF-8, and leave the shell waiting for a never-complete command.
    // Put oversized input on disk and send only a short source/execute line.
    if (commandBytes > maxInlineCommandBytes) {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mio-pty-'))
      tempCommandDir = tempDir
      session.tempCommandDirs.add(tempDir)
      const tempFile = path.join(tempDir, isWin ? 'command.ps1' : 'command.sh')
      try {
        const statusVariable = `__MIO_CMD_RC_${Date.now()}`
        const file = isWin ? powershellQuote(tempFile) : shellQuote(tempFile)
        const dir = isWin ? powershellQuote(tempDir) : shellQuote(tempDir)
        const script = isWin
          ? `${String(command)}\n` +
            `${statusVariable}=$LASTEXITCODE\n` +
            `Write-Output ""\n` +
            `Write-Output ("${marker}:" + $${statusVariable})\n` +
            `Remove-Item -LiteralPath ${file} -Force -ErrorAction SilentlyContinue\n` +
            `Remove-Item -LiteralPath ${dir} -Force -ErrorAction SilentlyContinue\n`
          : `${String(command)}\n` +
            `${statusVariable}=$?\n` +
            `printf '\\n%s:%s\\n' ${marker} "$${statusVariable}"\n` +
            `rm -f ${file} 2>/dev/null\n` +
            `rmdir ${dir} 2>/dev/null\n`
        await fs.writeFile(tempFile, script, { encoding: 'utf8', mode: 0o700 })
        if (!isWin) {
          await fs.chmod(tempFile, 0o700)
        }

        markerInScript = true
        if (isWin) {
          commandInput = `& ${file}`
        } else {
          const shellBase = session.shell.replace(/^.*[\\/]/, '').toLowerCase()
          const source = ['bash', 'zsh', 'fish'].includes(shellBase) ? 'source' : '.'
          commandInput = `${source} ${file}`
        }
      } catch (error) {
        session.tempCommandDirs.delete(tempDir)
        await fs.rm(tempDir, { force: true, recursive: true }).catch(() => {})
        throw error
      }
    }

    session.ptyProcess.write(`${commandInput}${enter}`)
    // Use a marker with the previous command's exit code. The marker is
    // emitted on its own line so a command echo cannot be mistaken for it.
    if (!markerInScript) {
      if (isWin) {
        session.ptyProcess.write(
          `Write-Output ""; Write-Output "${marker}:${markerStatusExpression}"${enter}`,
        )
      } else {
        session.ptyProcess.write(
          `printf '\\n%s:%s\\n' ${marker} ${markerStatusExpression}${enter}`,
        )
      }
    }

    return new Promise((resolve) => {
      let output = ''
      const maxExecOutput = 512 * 1024 // 512KB cap for exec output
      let resolved = false

      const cleanup = () => {
        if (!resolved) {
          resolved = true
          clearTimeout(timer)
          try {
            session.ptyProcess.removeListener('data', onData)
          } catch {}
        }
      }

      const cleanupTempCommand = () => {
        if (!tempCommandDir) return
        const dir = tempCommandDir
        tempCommandDir = null
        session.tempCommandDirs.delete(dir)
        void fs.rm(dir, { force: true, recursive: true }).catch(() => {})
      }

      const timer = setTimeout(() => {
        cleanup()
        resolve({
          exitCode: null,
          stdout: filterExecOutput(output, commandInput),
          timedOut: true,
        })
      }, timeout)

      const onData = (data) => {
        output += data
        // Cap output to prevent OOM from runaway commands
        if (output.length > maxExecOutput) {
          output = output.slice(-maxExecOutput)
        }
        session.lastActivity = Date.now()

        // Detect marker at start of a new line
        if (
          output.includes(`\n${marker}`) ||
          output.includes(`\r\n${marker}`)
        ) {
          cleanup()
          cleanupTempCommand()
          resolve({
            exitCode: extractMarkerExitCode(output, marker),
            stdout: filterExecOutput(output, commandInput, marker),
            timedOut: false,
          })
        }
      }

      session.ptyProcess.onData(onData)
    })
  }

  readScreen(sessionId, opts = {}) {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return null
    }

    const { tail, includeCursor = true } = opts

    // xterm-headless owns the terminal state, including CR overwrites, cursor
    // movement, clear-screen sequences, scrollback, and blank lines. Reading
    // the raw ANSI ring buffer here cannot reconstruct those semantics.
    let allLines
    try {
      allLines = renderXtermLines(session.xterm)
    } catch {
      // Keep a defensive fallback for sessions created with an older runtime
      // or a partially initialized headless terminal.
      const cleaned = cleanTerminalOutput(session._buffers.ansi)
      allLines = cleaned ? cleaned.split('\n') : []
    }

    // Filter out internal SH_DONE markers
    const cleanLines = allLines
      .map((l) => l.trimEnd())
      .filter((l) => !l.includes(SH_DONE_MARKER))

    // Trim trailing empty lines from shell prompt
    while (cleanLines.length > 0 && cleanLines[cleanLines.length - 1] === '') {
      cleanLines.pop()
    }

    const totalLines = cleanLines.length
    const startLine = tail
      ? Math.max(0, totalLines - tail)
      : Math.max(0, totalLines - 100)
    const lines = cleanLines.slice(startLine)

    const result = {
      cols: session.cols,
      lineCount: lines.length,
      lines,
      rows: session.rows,
      sessionId,
    }

    if (includeCursor) {
      // Try to read xterm-headless cursor, fallback to {0,0}
      try {
        const buf = session.xterm.buffer.active
        result.cursor = {
          viewportY: buf.viewportY || 0,
          x: buf.cursorX != null ? buf.cursorX : 0,
          y: buf.cursorY != null ? buf.cursorY : 0,
        }
      } catch {
        result.cursor = { viewportY: 0, x: 0, y: 0 }
      }
    }

    return result
  }

  resize(sessionId, cols, rows) {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'running') {
      return false
    }
    session.ptyProcess.resize(cols, rows)
    session.xterm.resize(cols, rows)
    session.cols = cols
    session.rows = rows
    session.lastActivity = Date.now()
    return true
  }

  /**
   * 等待 PTY 会话进入“命令空闲”状态（命令级完成检测，与 execCommand 同一 marker 机制）
   *
   * 原理：向会话注入唯一 marker 的 echo 命令——
   *   - shell 空闲（无正在执行命令）：echo 立即返回，marker 立刻在换行后作为实际输出出现 → 命令已完成
   *   - shell 正在执行长命令：echo 排队待命令结束后才执行 → marker 出现即“命令真正跑完”
   * 由此解决“前台命令已完成但 wait 等不到信号”的问题。
   *
   * 注意：必须匹配 \n${marker} 或 \r\n${marker}，绝不能用 includes(marker) 简单匹配，
   * 否则向 PTY 发送 echo marker 命令时，PTY 会立即回显该输入命令文本，导致在命令尚未执行时误报完成！
   *
   * @param {string} sessionId PTY 会话 ID
   * @param {number} timeoutMs 最大等待毫秒
   * @returns {Promise<{completed: boolean, timedOut: boolean, status?: string}>}
   */
  async waitForIdle(sessionId, timeoutMs = 30_000) {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'running') {
      return {
        completed: false,
        timedOut: false,
        status: session?.status || 'not_found',
      }
    }
    const marker = `${SH_DONE_MARKER}_idle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const isWin = process.platform === 'win32'
    const enter = isWin ? '\r' : '\n'
    session.ptyProcess.write(
      isWin
        ? `Write-Output ""; Write-Output ${marker}${enter}`
        : `echo; echo ${marker}${enter}`,
    )
    return new Promise((resolve) => {
      let settled = false
      let timer = null
      let buffer = ''
      const cleanup = () => {
        if (settled) {
          return
        }
        settled = true
        clearTimeout(timer)
        try {
          session.ptyProcess.removeListener('data', onData)
        } catch {}
      }
      timer = setTimeout(() => {
        cleanup()
        resolve({ completed: false, timedOut: true })
      }, timeoutMs)
      const onData = (data) => {
        buffer += data
        // 必须检测换行后单独输出的 marker，严禁匹配指令回显（如 echo ... marker）
        if (
          buffer.includes(`\n${marker}`) ||
          buffer.includes(`\r\n${marker}`)
        ) {
          cleanup()
          resolve({ completed: true, timedOut: false })
        }
      }
      session.ptyProcess.onData(onData)
    })
  }

  close(sessionId) {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return false
    }
    try {
      const sig = process.platform === 'win32' ? undefined : 'SIGHUP'
      session.ptyProcess.kill(sig)
    } catch {}
    for (const dir of session.tempCommandDirs || []) {
      void fs.rm(dir, { force: true, recursive: true }).catch(() => {})
    }
    session.tempCommandDirs?.clear()
    this.sessions.delete(sessionId)
    return true
  }

  list() {
    const result = []
    for (const [id, session] of this.sessions) {
      result.push({
        cols: session.cols,
        command: session.command,
        exitCode: session.exitCode,
        id,
        idleMs: Date.now() - session.lastActivity,
        lastActivity: session.lastActivity,
        rows: session.rows,
        shell: session.shell,
        startTime: session.startTime,
        status: session.status,
      })
    }
    return result
  }

  get(sessionId) {
    return this.sessions.get(sessionId) || null
  }

  _ensureGc() {
    if (this._gcTimer) {
      return
    }
    const timeout = this.plugin?.config?.sessionTimeout || 1_800_000
    this._gcTimer = setInterval(() => {
      const now = Date.now()
      for (const [id, session] of this.sessions) {
        if (
          session.status === 'running' &&
          now - session.lastActivity > timeout
        ) {
          this.close(id)
          this.emit('done', id, { exitCode: null, status: 'idle_timeout' })
        }
      }
      if (this.sessions.size === 0) {
        clearInterval(this._gcTimer)
        this._gcTimer = null
      }
    }, 60_000)
  }

  async _loadPty() {
    try {
      const pty = await import('node-pty')
      return pty.default || pty
    } catch {
      throw new Error(
        `[PTY Error] 系统未检测到真实的交互式终端底层驱动包 'node-pty'。若要启用高级 TTY/PTY 会话支持，请在 backend 目录运行 "npm install node-pty" 安装依赖。`,
        { cause: err },
      )
    }
  }

  async _loadXtermHeadless() {
    try {
      const xterm = await import('@xterm/headless')
      // @xterm/headless v6+ exports as { default: { Terminal } }
      return xterm.default || xterm['module.exports'] || xterm
    } catch {
      throw new Error(
        `[PTY Error] 系统缺少 PTY ANSI 流式渲染包 '@xterm/headless'。若要启用高级交互式终端，请在 backend 目录运行 "npm install @xterm/headless" 安装依赖。`,
        { cause: err },
      )
    }
  }

  async destroy() {
    if (this._gcTimer) {
      clearInterval(this._gcTimer)
      this._gcTimer = null
    }
    for (const id of this.sessions.keys()) {
      this.close(id)
    }
    for (const job of this.bgJobs.values()) {
      try {
        job.child?.kill()
      } catch {}
    }
    this.bgJobs.clear()
    this.removeAllListeners()
  }
}
