import { MioFunction } from '../../../function.js'
import { spawn } from 'child_process'
import os from 'os'

export default class executeCommand extends MioFunction {
  constructor() {
    super({
      name: 'executeCommand',
      description: `Execute a terminal command. Supports background execution and interactive input. System: ${os.platform()} (${os.arch()}), Release: ${os.release()}, OS: ${os.platform() === 'darwin' ? 'macOS' : os.platform()}.`,
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The command to execute.',
          },
          cwd: {
            type: 'string',
            description: 'The working directory for the command.',
          },
          background: {
            type: 'boolean',
            description: 'If true, the command will run in the background and return a processId immediately.',
            default: false
          },
          waitMs: {
            type: 'number',
            description: 'Maximum time to wait for the command to finish (in milliseconds). Only applies if background is false.',
            default: 10000
          }
        },
        required: ['command'],
      },
      adminOnly: true
    })
    this.func = this.execute
  }

  async execute(e) {
    const { command, cwd, background, waitMs = 10000 } = e.params
    const plugin = this.parentPlugin

    // --- GC: Cleanup old finished processes ---
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    
    for (const [id, proc] of plugin.processes) {
      if (proc.status !== 'running' && proc.endTime && proc.endTime < fiveMinutesAgo) {
        plugin.processes.delete(id)
        logger.debug(`[Terminal] GC: Removed old process ${id}`)
      }
    }

    // --- Active Process Counting & Transparency ---
    const activeProcesses = []
    for (const [id, proc] of plugin.processes) {
      if (proc.status === 'running') {
        activeProcesses.push({
          id,
          command: proc.command,
          startTime: proc.startTime
        })
      }
    }

    const maxActive = plugin.config.maxProcesses || 10
    if (activeProcesses.length >= maxActive) {
      const processList = activeProcesses.map(p => `- ${p.id}: ${p.command}`).join('\n')
      return { 
        error: `Maximum active process limit reached (${maxActive}). You must terminate an existing process before starting a new one.\n\nCurrently running processes:\n${processList}` 
      }
    }

    const processId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`

    // Spawn process using correct signature: spawn(command, args, options)
    // We use shell: true, so we can pass the whole command string as the first argument (on most platforms)
    const child = spawn(command, [], {
      cwd: cwd || process.cwd(),
      env: { ...process.env },
      shell: true
    })
    
    const procInfo = {
      id: processId,
      process: child,
      command,
      startTime: new Date(),
      status: 'running',
      stdout: '',
      stderr: '',
      exitCode: null,
      error: null
    }

    plugin.processes.set(processId, procInfo)

    child.stdout.on('data', (data) => {
      procInfo.stdout += data.toString()
      if (procInfo.stdout.length > plugin.config.maxOutputLength) {
        procInfo.stdout = procInfo.stdout.slice(-plugin.config.maxOutputLength)
      }
    })

    child.stderr.on('data', (data) => {
      procInfo.stderr += data.toString()
      if (procInfo.stderr.length > plugin.config.maxOutputLength) {
        procInfo.stderr = procInfo.stderr.slice(-plugin.config.maxOutputLength)
      }
    })

    child.on('error', (err) => {
      procInfo.status = 'error'
      procInfo.error = err.message
      procInfo.endTime = new Date()
      logger.error(`[Terminal] Process ${processId} error: ${err.message}`)
    })

    child.on('close', (code) => {
      procInfo.status = 'finished'
      procInfo.exitCode = code
      procInfo.endTime = new Date()
      logger.info(`[Terminal] Process ${processId} exited with code ${code}`)
    })

    if (background) {
      return {
        processId,
        status: 'running',
        message: 'Command started in background. Use getCommandStatus to poll for results.'
      }
    } else {
      // Wait for process to finish or timeout
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          if (procInfo.status === 'running') {
            resolve({
              processId,
              status: 'running',
              message: `Command is still running after ${waitMs}ms. It will continue in background. Use getCommandStatus with processId "${processId}" to poll for completion.`,
              stdout: procInfo.stdout,
              stderr: procInfo.stderr
            })
          }
        }, waitMs)

        // Use 'once' to ensure resolve is only called once
        child.once('close', (code) => {
          clearTimeout(timeout)
          resolve({
            processId,
            status: 'finished',
            exitCode: code,
            stdout: procInfo.stdout,
            stderr: procInfo.stderr
          })
        })

        child.once('error', (err) => {
          clearTimeout(timeout)
          resolve({
            processId,
            status: 'error',
            error: err.message,
            stdout: procInfo.stdout,
            stderr: procInfo.stderr
          })
        })
      })
    }
  }
}
