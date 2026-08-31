import { spawn } from 'node:child_process'
import path from 'node:path'
import { WakeProtocol } from './WakeProtocol.js'

const MAX_STDOUT_BYTES = 64 * 1024 // 64KB
const DEFAULT_TIMEOUT_MS = 10000 // 10s

/**
 * TriggerRunner — 哨兵脚本安全执行器与调度驱动
 */
export class TriggerRunner {
  constructor({ timeoutMs = DEFAULT_TIMEOUT_MS, maxStdoutBytes = MAX_STDOUT_BYTES } = {}) {
    this.timeoutMs = timeoutMs
    this.maxStdoutBytes = maxStdoutBytes
  }

  /**
   * 执行单个哨兵脚本文件，并解析 stdio 契约
   * @param {object} trigger - 触发器对象
   * @returns {Promise<{ wake: boolean, reason?: string, data?: any, stdout: string, stderr: string, durationMs: number, error?: string }>}
   */
  async executeScript(trigger) {
    if (!trigger.scriptPath) {
      throw new Error(`Trigger "${trigger.id}" has no scriptPath`)
    }

    const scriptPath = path.resolve(trigger.scriptPath)
    const cwd = path.dirname(scriptPath)
    const ext = path.extname(scriptPath).toLowerCase()

    let command = scriptPath
    let args = []

    if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
      command = process.execPath
      args = [scriptPath]
    } else if (ext === '.py') {
      command = process.env.PYTHON_BIN || 'python3'
      args = [scriptPath]
    } else if (ext === '.sh' || ext === '.bash') {
      command = 'bash'
      args = [scriptPath]
    }

    const startTime = Date.now()

    return new Promise((resolve) => {
      let stdout = ''
      let stderr = ''
      let killedDueToTimeout = false
      let resolved = false

      const env = {
        ...process.env,
        TRIGGER_AGENT_ID: trigger.agentId || '',
        TRIGGER_ID: trigger.id || '',
        TRIGGER_PARAMS: JSON.stringify(trigger.params || {}),
        TRIGGER_SESSION_ID: trigger.sessionId || '',
      }

      let child = null
      try {
        child = spawn(command, args, {
          cwd,
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      } catch (spawnError) {
        return resolve({
          durationMs: Date.now() - startTime,
          error: `Spawn failed: ${spawnError.message}`,
          stderr: spawnError.message,
          stdout: '',
          wake: false,
        })
      }

      const timer = setTimeout(() => {
        killedDueToTimeout = true
        try {
          child.kill('SIGKILL')
        } catch {}
      }, this.timeoutMs)

      child.stdout.on('data', (chunk) => {
        if (stdout.length < this.maxStdoutBytes) {
          stdout += chunk.toString('utf-8')
          if (stdout.length > this.maxStdoutBytes) {
            stdout = stdout.slice(0, this.maxStdoutBytes) + '\n[STDOUT TRUNCATED AT 64KB]'
          }
        }
      })

      child.stderr.on('data', (chunk) => {
        if (stderr.length < this.maxStdoutBytes) {
          stderr += chunk.toString('utf-8')
          if (stderr.length > this.maxStdoutBytes) {
            stderr = stderr.slice(0, this.maxStdoutBytes) + '\n[STDERR TRUNCATED AT 64KB]'
          }
        }
      })

      const cleanupAndResolve = (exitCode, signal) => {
        if (resolved) return
        resolved = true
        clearTimeout(timer)
        const durationMs = Date.now() - startTime

        if (killedDueToTimeout) {
          return resolve({
            durationMs,
            error: `Execution timed out after ${this.timeoutMs}ms`,
            stderr,
            stdout,
            wake: false,
          })
        }

        // 解析契约
        const wakeResult = WakeProtocol.parseWakeLine(stdout)

        let error = null
        if (exitCode !== 0 && !wakeResult.wake) {
          error = `Script exited with code ${exitCode}${signal ? ` (${signal})` : ''}: ${stderr.trim() || 'Non-zero exit'}`
        } else if (wakeResult.error) {
          error = wakeResult.error
        }

        resolve({
          data: wakeResult.data,
          durationMs,
          error,
          rawWakeLine: wakeResult.rawLine,
          reason: wakeResult.reason,
          stderr,
          stdout,
          wake: wakeResult.wake,
        })
      }

      child.on('close', (code, signal) => cleanupAndResolve(code, signal))
      child.on('error', (err) => {
        clearTimeout(timer)
        if (!resolved) {
          resolved = true
          resolve({
            durationMs: Date.now() - startTime,
            error: `Process error: ${err.message}`,
            stderr: err.message,
            stdout,
            wake: false,
          })
        }
      })
    })
  }
}
