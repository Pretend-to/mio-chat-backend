import os from 'os'
import { MioFunction } from '../../../function.js'


const FG_TIMEOUT = 5000

export default class sh extends MioFunction {
  constructor() {
    super({
      adminOnly: true,
      description: `Execute standard one-shot shell commands via child process spawn. High efficiency and pure execution.
Does NOT support persistent interactive TUI apps (like vim/htop). For interactive PTY/TTY terminal session, use pty_sh tool.

CURRENT SYSTEM ENVIRONMENT:
• OS Platform: ${os.platform()} (${os.type()} ${os.release()})
• Architecture: ${os.arch()}
• Home Directory: ${os.homedir()}
• Current Workspace: ${process.cwd()}`,
      name: 'sh',
      parameters: {
        properties: {
          background: { description: 'If true, runs command as a background child process. Default: false.', type: 'boolean' },
          command: { description: 'The shell command to execute.', type: 'string' },
          cwd: { description: 'Working directory. Defaults to current directory.', type: 'string' },
          waitMs: { description: 'Max time (ms) to wait before converting to background process. Default 5000, max 20000.', type: 'number' },
        },
        required: ['command'],
        type: 'object',
      },
    })
    this.func = this.execute
  }

  getDisplayName(params) {
    const { command } = params
    const cmd = command ? command.trim() : ''
    const shortCmd = cmd.length > 25 ? `${cmd.substring(0, 22)  }...` : cmd
    return `Running: ${shortCmd || 'shell'}`
  }

  async execute(e) {
    const { command, cwd, background = false, waitMs = FG_TIMEOUT } = e.params
    
    const plugin = this.parentPlugin
    const maxWait = Math.min(waitMs, 20_000)

    if (!plugin.processes) {plugin.processes = new Map()}

    const procId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    const isWin = process.platform === 'win32'
    const shellCmd = isWin ? 'powershell.exe' : '/bin/sh'
    const shellArgs = isWin ? ['-Command', command] : ['-c', command]

    const { spawn } = await import('child_process')
    const child = spawn(shellCmd, shellArgs, {
      cwd: cwd || process.cwd(),
      env: { ...process.env, GIT_PAGER: 'cat', PAGER: 'cat' },
    })

    const procInfo = {
      child,
      command,
      exitCode: null,
      id: procId,
      process: child, // For compatibility with kill.js
      startTime: new Date(),
      status: 'running',
      stderr: '',
      stdout: '',
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
      plugin.processBus.emit('process:done', procId, { exitCode: code, status: 'finished' })
    })

    child.on('error', (err) => {
      procInfo.status = 'error'
      procInfo.error = err.message
      plugin.processBus.emit('process:done', procId, { error: err.message, exitCode: null, status: 'error' })
    })

    if (background) {
      return {
        message: `Background process ${procId} started. Use wait(processId: "${procId}") to wait for completion.`,
        processId: procId,
        status: 'running',
      }
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve({
          message: `Command still running after ${maxWait}ms. Converted to persistent background process.`,
          processId: procId,
          status: 'running',
          stderr: procInfo.stderr,
          stdout: procInfo.stdout,
        })
      }, maxWait)

      const onDone = (id, result) => {
        if (id === procId) {
          clearTimeout(timer)
          plugin.processBus.removeListener('process:done', onDone)
          resolve({
            error: result.error,
            exitCode: result.exitCode,
            processId: procId,
            status: result.status,
            stderr: procInfo.stderr,
            stdout: procInfo.stdout,
          })
        }
      }
      plugin.processBus.on('process:done', onDone)
    })
  }
}
