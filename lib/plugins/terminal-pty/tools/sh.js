import os from 'os'
import { MioFunction } from '../../../function.js'
import { isCommandWhitelisted, splitShellCommands } from '../lib/shSecurity.js'

const FG_TIMEOUT = 5000

export default class sh extends MioFunction {
  constructor() {
    super({
      name: 'sh',
      description: `Execute standard one-shot shell commands via child process spawn. High efficiency and pure execution.
Does NOT support persistent interactive TUI apps (like vim/htop). For interactive PTY/TTY terminal session, use pty_sh tool.

CURRENT SYSTEM ENVIRONMENT:
• OS Platform: ${os.platform()} (${os.type()} ${os.release()})
• Architecture: ${os.arch()}
• Home Directory: ${os.homedir()}
• Current Workspace: ${process.cwd()}`,
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The shell command to execute.' },
          cwd: { type: 'string', description: 'Working directory. Defaults to current directory.' },
          background: { type: 'boolean', description: 'If true, runs command as a background child process. Default: false.' },
          waitMs: { type: 'number', description: 'Max time (ms) to wait before converting to background process. Default 5000, max 20000.' },
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
    const { command, cwd, background = false, waitMs = FG_TIMEOUT } = e.params
    
    const isYolo = e.body?.settings?.yolo === true
    const whitelistStr = e.body?.settings?.shWhitelist || ''
    const isTask = e.metaData?.isTask === true

    const isWhitelisted = isCommandWhitelisted(command, whitelistStr)

    if (!isYolo && !isWhitelisted) {
      if (isTask) {
        logger.warn(`[sh] 后台定时任务中，命令 "${command}" 未命中白名单规则，自动进行安全拦截直接拒绝`)
        return `[执行终止] 后台定时任务中，Shell 命令未命中白名单规则，且未开启高危 YOLO 模式，已直接安全拦截并拒绝执行该命令。`
      }

      // 逐个子命令校验与授权
      const subCommands = splitShellCommands(command)
      for (const subCmd of subCommands) {
        const isSubWhitelisted = isCommandWhitelisted(subCmd, whitelistStr)
        if (!isSubWhitelisted) {
          // 安全拦截机制：向前端长连接发起双向二次授权确认拦截，挂起 Promise 直至用户操作
          const approval = await this.requestUserApproval(
            e,
            `是否授权 LLM 执行命令：`,
            { command: subCmd }
          )
          if (!approval.approved) {
            const reasonMsg = approval.reason ? ` 原因: ${approval.reason}` : ''
            return `[执行终止] 用户拒绝授权此 Shell 子命令 "${subCmd}" 的执行。${reasonMsg}`
          }
        }
      }
    }


    const plugin = this.parentPlugin
    const maxWait = Math.min(waitMs, 20000)

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
}
