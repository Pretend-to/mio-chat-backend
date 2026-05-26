import { MioFunction } from '../../../function.js'

const FG_TIMEOUT = 30000

export default class sh extends MioFunction {
  constructor() {
    super({
      name: 'sh',
      description: `Execute shell commands via a real pseudo-terminal. Supports both one-shot and persistent interactive sessions.

BEHAVIOR:
• Normal (no background): Creates a PTY, runs the command, waits for completion, strips ANSI, returns clean text. If command exceeds waitMs, auto-converts to a persistent session.
• Background (background:true): Creates a persistent PTY session, returns sessionId + cmdId immediately. Use wait(processId: cmdId) to wait for command completion (zero polling). Use term_write/term_read for interactive I/O.
• All commands enjoy full TTY capabilities (colors, interactive prompts, TUI programs like vim/htop/mole).

DIFFERENCE FROM PIPE-BASED SHELL:
Commands run in a real pseudo-terminal, so programs that require isatty()=true work correctly.`,
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The shell command to execute.' },
          cwd: { type: 'string', description: 'Working directory. Defaults to current directory.' },
          background: { type: 'boolean', description: 'If true, creates a persistent PTY session. Default: false.' },
          waitMs: { type: 'number', description: 'Max time (ms) to wait before converting to background session. Default 30000, max 120000.' },
        },
        required: ['command'],
      },
      adminOnly: true,
    })
    this.func = this.execute
  }

  async execute(e) {
    const { command, cwd, background = false, waitMs = FG_TIMEOUT } = e.params
    const plugin = this.parentPlugin
    const sessions = plugin.sessions
    const maxWait = Math.min(waitMs, 120000)

    const { sessionId } = await sessions.createSession({
      cwd: cwd || process.cwd(),
      sessionId: `term_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    })

    plugin.processBus.emit('process:start', sessionId, { command, cwd })

    if (background) {
      // Short marker to avoid terminal line-wrapping issues
      const marker = `_D0_${Math.random().toString(36).substr(2, 4)}`
      const cmdId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

      // Store cmdId -> sessionId + marker lookup for wait(cmdId) polling
      if (!plugin._cmdMap) plugin._cmdMap = new Map()
      plugin._cmdMap.set(cmdId, { sessionId, marker })

      // Single write: command + marker echo — avoids PTY buffer jumbling
      const session = sessions.get(sessionId)
      session.ptyProcess.write(`${command}; echo '${marker}'\n`)

      return {
        sessionId,
        cmdId,
        status: 'running',
        message: `Background session ${sessionId} started (command: ${cmdId}). Use term_read("${sessionId}") to check output, term_write("${sessionId}", ...) for input, wait(processId: "${cmdId}") to wait for completion, kill("${sessionId}") to terminate.`,
      }
    }

    try {
      const result = await sessions.execCommand(sessionId, command, maxWait)

      if (result.timedOut) {
        return {
          sessionId,
          status: 'running',
          message: `Command still running after ${maxWait}ms. Converted to persistent session.`,
          stdout: result.stdout,
        }
      }

      plugin.processBus.emit('process:done', sessionId, {
        status: 'finished', exitCode: result.exitCode, elapsed: 0,
      })
      sessions.close(sessionId)

      return {
        processId: sessionId,
        status: 'finished',
        exitCode: result.exitCode,
        stdout: result.stdout,
      }
    } catch (err) {
      sessions.close(sessionId)
      plugin.processBus.emit('process:done', sessionId, {
        status: 'error', exitCode: null, error: err.message,
      })
      return { processId: sessionId, status: 'error', error: err.message }
    }
  }
}
