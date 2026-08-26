import { EventEmitter } from 'events'
import { spawn } from 'child_process'
const ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
const stripAnsi = (str) => (typeof str === 'string' ? str.replace(ANSI_REGEX, '') : '')

const SH_DONE_MARKER = '__SH_DONE__'
/**
 * Clean terminal output: strip ANSI + normalize control chars.
 * - ANSI escape codes removed via strip-ansi
 * - Carriage returns: \r\n → \n (windows line endings), standalone \r removed
 * - Backspaces: "e\becho" → "echo" resolved on each line
 */
function cleanTerminalOutput(raw) {
  // Step 1: Strip ANSI escape codes
  const noAnsi = stripAnsi(raw)
  // Step 2: Normalize newlines: \r\n → \n, standalone \r → \n (it's a CR, treat as newline)
  const normalized = noAnsi
    .replace(/\r\n/g, '\n')   // Windows newlines
    .replace(/\r/g, '\n')     // Standalone CR → newline
  // Step 3: Resolve backspaces per line
  return normalized
    .split('\n')
    .map(line => {
      let result = ''
      for (const ch of line) {
        if (ch === '\b') {
          result = result.slice(0, -1)
        } else if (ch === '\r') {
          // Already handled above, but just in case
          result = ''
        } else {
          result += ch
        }
      }
      return result.trimEnd()
    })
    .filter(line => line.length > 0) // Remove empty lines
    .join('\n')
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
    const shell = opts.shell || (isWin ? 'powershell.exe' : (process.env.SHELL || '/bin/zsh'))
    const cwd = opts.cwd || process.cwd()
    const cols = opts.cols || this.plugin?.config?.defaultCols || 120
    const rows = opts.rows || this.plugin?.config?.defaultRows || 40
    const sessionId = opts.sessionId || `term_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

    const ptyProcess = pty.spawn(shell, [], {
      cols,
      cwd,
      env: {
        ...process.env,
        ...opts.env,
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
      startTime: new Date(),
      status: 'running',
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
    if (!session || session.status !== 'running') {return false}
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
    const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/bash')
    const maxOutput = this.plugin?.config?.maxOutputLength || 512 * 1024
    const jobId = sessionId || `bg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
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
      this.emit('done', jobId, { exitCode, signal, status: 'finished', error, stdout: buf.stdout, stderr: buf.stderr })
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
    const cleanLines = raw.split('\n').map((l) => l.replace(/[\r\b]+/g, '').trimEnd())
    while (cleanLines.length > 0 && cleanLines[cleanLines.length - 1] === '') cleanLines.pop()
    const totalLines = cleanLines.length
    const startLine = tail ? Math.max(0, totalLines - tail) : Math.max(0, totalLines - 100)
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
    session.ptyProcess.write(`${command}${enter}`)
    // Use marker with newline to ensure it's on its own line as output
    if (isWin) {
      session.ptyProcess.write(`Write-Output ""; Write-Output ${marker}${enter}`)
    } else {
      session.ptyProcess.write(`echo; echo ${marker}${enter}`)
    }

    return new Promise((resolve) => {
      let output = ''
      const maxExecOutput = 512 * 1024 // 512KB cap for exec output
      let resolved = false

      const cleanup = () => {
        if (!resolved) {
          resolved = true
          clearTimeout(timer)
          try { session.ptyProcess.removeListener('data', onData) } catch {}
        }
      }

      const timer = setTimeout(() => {
        cleanup()
        resolve({ exitCode: null, stdout: output, timedOut: true })
      }, timeout)

      const onData = (data) => {
        output += data
        // Cap output to prevent OOM from runaway commands
        if (output.length > maxExecOutput) {
          output = output.slice(-maxExecOutput)
        }
        session.lastActivity = Date.now()

        // Detect marker at start of a new line
        if (output.includes(`\n${marker}`) || output.includes(`\r\n${marker}`)) {
          cleanup()
          const markerIdx = output.lastIndexOf(marker)
          const raw = output.substring(0, markerIdx).trim()

          // Strip ANSI, then extract only command output lines (skip prompts + echoed commands)
          const cleaned = cleanTerminalOutput(raw)
          const lines = cleaned.split('\n')

          // Filter out prompt lines and echoed marker/cmd lines
          const outputLines = lines.filter(l => {
            const t = l.trim()
            // Skip empty, prompt artifacts, echoed commands
            if (!t || t.startsWith('%') || t.startsWith('$') || t.startsWith('#')) {return false}
            if (t.startsWith('echo ') && t.includes(marker.substring(0, 10))) {return false}
            return true
          })

          resolve({ exitCode: 0, stdout: outputLines.join('\n'), timedOut: false })
        }
      }

      session.ptyProcess.onData(onData)
    })
  }

  readScreen(sessionId, opts = {}) {
    const session = this.sessions.get(sessionId)
    if (!session) {return null}

    const { tail, includeCursor = true } = opts

    // Use the raw text ring buffer (strip-ansi'd pty output) instead of
    // Xterm-headless buffer API, which changed significantly in v6.
    const raw = session._buffers.text
    const allLines = raw.split('\n')

    // Clean each line: strip carriage returns, backspace artifacts
    const cleanLines = allLines.map(l => l.replace(/[\r\b]+/g, '').trimEnd())

    // Trim trailing empty lines from shell prompt
    while (cleanLines.length > 0 && cleanLines[cleanLines.length - 1] === '') {
      cleanLines.pop()
    }

    const totalLines = cleanLines.length
    const startLine = tail ? Math.max(0, totalLines - tail) : Math.max(0, totalLines - 100)
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
    if (!session || session.status !== 'running') {return false}
    session.ptyProcess.resize(cols, rows)
    session.xterm.resize(cols, rows)
    session.cols = cols
    session.rows = rows
    session.lastActivity = Date.now()
    return true
  }

  close(sessionId) {
    const session = this.sessions.get(sessionId)
    if (!session) {return false}
    try {
      const sig = process.platform === 'win32' ? undefined : 'SIGHUP'
      session.ptyProcess.kill(sig)
    } catch {}
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
    if (this._gcTimer) {return}
    const timeout = this.plugin?.config?.sessionTimeout || 1_800_000
    this._gcTimer = setInterval(() => {
      const now = Date.now()
      for (const [id, session] of this.sessions) {
        if (session.status === 'running' && (now - session.lastActivity) > timeout) {
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
      throw new Error(`[PTY Error] 系统未检测到真实的交互式终端底层驱动包 'node-pty'。若要启用高级 TTY/PTY 会话支持，请在 backend 目录运行 "npm install node-pty" 安装依赖。`, { cause: err })
    }
  }

  async _loadXtermHeadless() {
    try {
      const xterm = await import('@xterm/headless')
      // @xterm/headless v6+ exports as { default: { Terminal } }
      return xterm.default || xterm['module.exports'] || xterm
    } catch {
      throw new Error(`[PTY Error] 系统缺少 PTY ANSI 流式渲染包 '@xterm/headless'。若要启用高级交互式终端，请在 backend 目录运行 "npm install @xterm/headless" 安装依赖。`, { cause: err })
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
      try { job.child?.kill() } catch {}
    }
    this.bgJobs.clear()
    this.removeAllListeners()
  }
}
