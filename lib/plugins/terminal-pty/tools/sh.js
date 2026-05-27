import os from 'os'
import { MioFunction } from '../../../function.js'

const FG_TIMEOUT = 5000

export default class sh extends MioFunction {
  constructor() {
    super({
      name: 'sh',
      description: `Execute shell commands via a real pseudo-terminal. Supports both one-shot and persistent interactive sessions.

CURRENT SYSTEM ENVIRONMENT:
• OS Platform: ${os.platform()} (${os.type()} ${os.release()})
• Architecture: ${os.arch()}
• Home Directory: ${os.homedir()}
• Shell Path: ${process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : '/bin/sh')}
• Current Workspace: ${process.cwd()}

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
          background: { type: 'boolean', description: 'If true, creates a persistent PTY/pipe session. Default: false.' },
          waitMs: { type: 'number', description: 'Max time (ms) to wait before converting to background session. Default 5000, max 20000.' },
          pty: { type: 'boolean', description: 'If true, runs command inside a real pseudo-terminal (PTY). Default: false.', default: false },
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
    return `Running: ${shortCmd || 'shell'}`
  }
  async execute(e) {
    const { command, cwd, background = false, waitMs = FG_TIMEOUT, pty = false } = e.params
    
    // 安全拦截机制：向前端长连接发起双向二次授权确认拦截，挂起 Promise 直至用户操作
    const approval = await this.requestUserApproval(
      e,
      `Do you authorize the LLM to execute command: \`${command}\`?`
    )
    if (!approval.approved) {
      const reasonMsg = approval.reason ? ` Reason: ${approval.reason}` : ''
      return `[Execution Terminated] User denied authorization to execute this shell command.${reasonMsg}`
    }

    const plugin = this.parentPlugin
    const maxWait = Math.min(waitMs, 20000)

    if (!pty) {
      if (!plugin.processes) plugin.processes = new Map()

      const procId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
      const isWin = process.platform === 'win32'
      const shellCmd = isWin ? 'powershell.exe' : '/bin/sh'
      const shellArgs = isWin ? ['-Command', command] : ['-c', command]

      const { spawn } = await import('child_process')
      const child = spawn(shellCmd, shellArgs, {
        cwd: cwd || process.cwd(),
        env: { ...process.env, PAGER: 'cat', GIT_PAGER: 'cat' },
      })

      const procInfo = {
        id: procId,
        command,
        startTime: new Date(),
        child,
        process: child, // For compatibility with kill.js
        status: 'running',
        stdout: '',
        stderr: '',
        exitCode: null,
      }
      plugin.processes.set(procId, procInfo)

      plugin.processBus.emit('process:start', procId, { command, cwd })

      child.stdout.on('data', (data) => {
        procInfo.stdout += data.toString()
      })
      child.stderr.on('data', (data) => {
        procInfo.stderr += data.toString()
      })

      child.on('close', (code) => {
        procInfo.status = 'finished'
        procInfo.exitCode = code
        plugin.processBus.emit('process:done', procId, { status: 'finished', exitCode: code })
      })

      child.on('error', (err) => {
        procInfo.status = 'error'
        procInfo.error = err.message
        plugin.processBus.emit('process:done', procId, { status: 'error', exitCode: null, error: err.message })
      })

      if (background) {
        return {
          processId: procId,
          status: 'running',
          message: `Background process ${procId} started. Use wait(processId: "${procId}") to wait for completion.`,
        }
      }

      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          resolve({
            processId: procId,
            status: 'running',
            message: `Command still running after ${maxWait}ms. Converted to persistent background process.`,
            stdout: procInfo.stdout,
            stderr: procInfo.stderr,
          })
        }, maxWait)

        const onDone = (id, result) => {
          if (id === procId) {
            clearTimeout(timer)
            plugin.processBus.removeListener('process:done', onDone)
            resolve({
              processId: procId,
              status: result.status,
              exitCode: result.exitCode,
              stdout: procInfo.stdout,
              stderr: procInfo.stderr,
              error: result.error,
            })
          }
        }
        plugin.processBus.on('process:done', onDone)
      })
    }

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
