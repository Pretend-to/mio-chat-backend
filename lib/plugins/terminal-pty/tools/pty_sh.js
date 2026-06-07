import os from 'os'
import { MioFunction } from '../../../function.js'


const FG_TIMEOUT = 5000

export default class pty_sh extends MioFunction {
  constructor() {
    super({
      name: 'pty_sh',
      description: `Execute shell commands inside a real pseudo-terminal (PTY). Supports persistent interactive TUI sessions (like vim/htop) and stdin/stdout TTY stream.
Requires node-pty and @xterm/headless packages to be properly installed.

CURRENT SYSTEM ENVIRONMENT:
• OS Platform: ${os.platform()} (${os.type()} ${os.release()})
• Architecture: ${os.arch()}
• Home Directory: ${os.homedir()}
• Shell Path: ${process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : '/bin/sh')}
• Current Workspace: ${process.cwd()}`,
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The shell command to execute.' },
          cwd: { type: 'string', description: 'Working directory. Defaults to current directory.' },
          background: { type: 'boolean', description: 'If true, creates a persistent PTY interactive session. Default: false.' },
          waitMs: { type: 'number', description: 'Max time (ms) to wait before converting to background session. Default 5000, max 20000.' },
        },
        required: ['command'],
      },
      adminOnly: true,
    })
    this.func = this.execute
  }

  getDisplayName(params) {
    const { command } = params
    const cmd = command ? command.trim() : ''
    const shortCmd = cmd.length > 25 ? cmd.substring(0, 22) + '...' : cmd
    return `PTY: ${shortCmd || 'shell'}`
  }

  async execute(e) {
    const { command, cwd, background = false, waitMs = FG_TIMEOUT } = e.params
    
    const plugin = this.parentPlugin
    const maxWait = Math.min(waitMs, 20000)
    const sessions = plugin.sessions

    const { sessionId } = await sessions.createSession({
      cwd: cwd || process.cwd(),
      sessionId: `term_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    })

    plugin.processBus.emit('process:start', sessionId, { command, cwd })

    if (background) {
      const marker = `_D0_${Math.random().toString(36).substr(2, 4)}`
      const cmdId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

      if (!plugin._cmdMap) plugin._cmdMap = new Map()
      plugin._cmdMap.set(cmdId, { sessionId, marker })

      const session = sessions.get(sessionId)
      session.ptyProcess.write(`${command}; echo '${marker}'\n`)

      return {
        sessionId,
        cmdId,
        status: 'running',
        message: `Background PTY session ${sessionId} started (command: ${cmdId}). Use term_read("${sessionId}") to check output, term_write("${sessionId}", ...) for input, wait(processId: "${cmdId}") to wait for completion, kill("${sessionId}") to terminate.`,
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
