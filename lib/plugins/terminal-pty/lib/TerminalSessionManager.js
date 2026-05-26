import { EventEmitter } from 'events'
import stripAnsi from 'strip-ansi'

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
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: {
        ...process.env,
        ...opts.env,
        TERM: 'xterm-256color',
        PAGER: 'cat',
        GIT_PAGER: 'cat',
        PS1: '\\w $ ', // Shell prompt for marker detection
        PROMPT: '\\w $ ',
      },
    })

    const xterm = new HeadlessTerminal.Terminal({ cols, rows })

    const maxOutput = this.plugin?.config?.maxOutputLength || 2 * 1024 * 1024
    // Use mutable object so onData closure and session reference share the same buffer
    const buffers = { ansi: '', text: '' }

    const sessionInfo = {
      id: sessionId,
      ptyProcess,
      xterm,
      shell,
      cwd,
      cols,
      rows,
      startTime: new Date(),
      lastActivity: Date.now(),
      status: 'running',
      command: null,
      exitCode: null,
      error: null,
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
      this.emit('done', sessionId, { status: 'finished', exitCode, signal })
    })

    this.sessions.set(sessionId, {
      ...sessionInfo,
      _buffers: buffers,
    })

    this._ensureGc()

    return { sessionId, shell, cwd, cols, rows }
  }

  write(sessionId, data) {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'running') return false
    session.ptyProcess.write(data)
    session.lastActivity = Date.now()
    return true
  }

  async execCommand(sessionId, command, timeout = 30000) {
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
      const timer = setTimeout(() => {
        session.ptyProcess.removeListener('data', onData)
        resolve({ stdout: output, exitCode: null, timedOut: true })
      }, timeout)

      const onData = (data) => {
        output += data
        session.lastActivity = Date.now()

        // Detect marker at start of a new line
        if (output.includes(`\n${marker}`) || output.includes(`\r\n${marker}`)) {
          clearTimeout(timer)
          const markerIdx = output.lastIndexOf(marker)
          const raw = output.substring(0, markerIdx).trim()

          // Strip ANSI, then extract only command output lines (skip prompts + echoed commands)
          const cleaned = cleanTerminalOutput(raw)
          const lines = cleaned.split('\n')

          // Filter out prompt lines and echoed marker/cmd lines
          const outputLines = lines.filter(l => {
            const t = l.trim()
            // Skip empty, prompt artifacts, echoed commands
            if (!t || t.startsWith('%') || t.startsWith('$') || t.startsWith('#')) return false
            if (t.startsWith('echo ') && t.includes(marker.substring(0, 10))) return false
            return true
          })

          resolve({ stdout: outputLines.join('\n'), exitCode: 0, timedOut: false })
        }
      }

      session.ptyProcess.onData(onData)
    })
  }

  readScreen(sessionId, opts = {}) {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    const { tail, includeCursor = true } = opts

    // Use the raw text ring buffer (strip-ansi'd pty output) instead of
    // xterm-headless buffer API, which changed significantly in v6.
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
      sessionId,
      cols: session.cols,
      rows: session.rows,
      lines,
      lineCount: lines.length,
    }

    if (includeCursor) {
      // Try to read xterm-headless cursor, fallback to {0,0}
      try {
        const buf = session.xterm.buffer.active
        result.cursor = {
          x: buf.cursorX != null ? buf.cursorX : 0,
          y: buf.cursorY != null ? buf.cursorY : 0,
          viewportY: buf.viewportY || 0,
        }
      } catch {
        result.cursor = { x: 0, y: 0, viewportY: 0 }
      }
    }

    return result
  }

  resize(sessionId, cols, rows) {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'running') return false
    session.ptyProcess.resize(cols, rows)
    session.xterm.resize(cols, rows)
    session.cols = cols
    session.rows = rows
    session.lastActivity = Date.now()
    return true
  }

  close(sessionId) {
    const session = this.sessions.get(sessionId)
    if (!session) return false
    try {
      const sig = process.platform === 'win32' ? undefined : 'SIGHUP'
      session.ptyProcess.kill(sig)
    } catch (_) {}
    this.sessions.delete(sessionId)
    return true
  }

  list() {
    const result = []
    for (const [id, session] of this.sessions) {
      result.push({
        id,
        shell: session.shell,
        command: session.command,
        status: session.status,
        startTime: session.startTime,
        lastActivity: session.lastActivity,
        idleMs: Date.now() - session.lastActivity,
        cols: session.cols,
        rows: session.rows,
        exitCode: session.exitCode,
      })
    }
    return result
  }

  get(sessionId) {
    return this.sessions.get(sessionId) || null
  }

  _ensureGc() {
    if (this._gcTimer) return
    const timeout = this.plugin?.config?.sessionTimeout || 1800000
    this._gcTimer = setInterval(() => {
      const now = Date.now()
      for (const [id, session] of this.sessions) {
        if (session.status === 'running' && (now - session.lastActivity) > timeout) {
          this.close(id)
          this.emit('done', id, { status: 'idle_timeout', exitCode: null })
        }
      }
      if (this.sessions.size === 0) {
        clearInterval(this._gcTimer)
        this._gcTimer = null
      }
    }, 60000)
  }

  async _loadPty() {
    const pty = await import('node-pty')
    return pty.default || pty
  }

  async _loadXtermHeadless() {
    const xterm = await import('@xterm/headless')
    // @xterm/headless v6+ exports as { default: { Terminal } }
    return xterm.default || xterm['module.exports'] || xterm
  }

  async destroy() {
    if (this._gcTimer) {
      clearInterval(this._gcTimer)
      this._gcTimer = null
    }
    for (const id of this.sessions.keys()) {
      this.close(id)
    }
    this.removeAllListeners()
  }
}
