import { MioFunction } from '../../../function.js'

const POLL_MS = 150
const MAX_POLL = 300_000

export default class wait extends MioFunction {
  constructor() {
    super({
      adminOnly: true,
      description: `Wait for a specified duration, or until a process/session completes.

If a processId is provided, the wait mechanism depends on the prefix:
• cmd_xxxx — polls the PTY session's output buffer for the completion marker (reliable, zero event dependency)
• term_xxxx — waits for a PTY session to close
• proc_xxxx — waits for a legacy background process`,
      name: 'wait',
      parameters: {
        properties: {
          ms: { default: 2000, description: 'Max time to wait in ms. Default 2000, max 300000.', type: 'number' },
          processId: { description: 'Optional ID to wait on: cmd_xxxx (background command), term_xxxx (PTY session), or proc_xxxx (legacy process).', type: 'string' },
        },
        required: [],
        type: 'object',
      },
    })
    this.func = this.doWait
  }

  async doWait(e) {
    const { ms = 2000, processId } = e.params
    const plugin = this.parentPlugin
    let maxWait = Math.min(ms, MAX_POLL)

    if (!processId) {
      await new Promise(r => setTimeout(r, maxWait))
      return { message: `Waited ${maxWait}ms.`, success: true }
    }

    // 当存在 processId 时，若未显式传 ms，使用更大默认值（5分钟）
    // 因为等待一个进程完成通常需要比空等更久
    if (e.params.ms === undefined) {
      maxWait = MAX_POLL
    }

    // --- cmd_ prefix: poll session buffer for marker ---
    if (processId.startsWith('cmd_')) {
      const cmdMap = plugin._cmdMap
      if (!cmdMap || !cmdMap.has(processId)) {
        await new Promise(r => setTimeout(r, maxWait))
        return { message: `No record of command ${processId}.`, processId, status: 'unknown', success: true }
      }

      const { sessionId, marker } = cmdMap.get(processId)
      const {sessions} = plugin
      const deadline = Date.now() + maxWait

      return new Promise(resolve => {
        const poll = () => {
          // Check if session is gone
          const session = sessions.get(sessionId)
          if (!session) {
            cmdMap.delete(processId)
            return resolve({ processId, sessionId, status: 'finished', success: true })
          }

          // Check text buffer for marker (followed by prompt char, not \n)
          const buf = session._buffers?.text || ''
          if (buf.includes(`\n${marker}`)) {
            cmdMap.delete(processId)
            return resolve({ processId, sessionId, status: 'finished', success: true })
          }

          if (Date.now() >= deadline) {
            return resolve({ message: `Command still running after ${maxWait}ms.`, processId, sessionId, status: 'timeout', success: true })
          }

          setTimeout(poll, POLL_MS)
        }
        poll()
      })
    }

    // --- term_ prefix: wait for a PTY session to close (event-driven) ---
    if (processId.startsWith('term_')) {
      const {sessions} = plugin
      const session = sessions.get(processId)
      if (!session || session.status !== 'running') {
        await new Promise(r => setTimeout(r, maxWait))
        return { processId, status: session?.status || 'not_found', success: true }
      }
      return new Promise(resolve => {
        const timeout = setTimeout(() => {
          sessions.removeListener('done', onDone)
          resolve({ message: `Session still running after ${maxWait}ms.`, processId, status: 'running', success: true })
        }, maxWait)
        const onDone = (id, result) => {
          if (id === processId) {
            clearTimeout(timeout)
            resolve({ exitCode: result.exitCode, processId, status: result.status, success: true })
          }
        }
        sessions.on('done', onDone)
      })
    }

    // --- proc_ prefix: legacy background process ---
    const procInfo = plugin.processes?.get(processId)
    if (!procInfo || procInfo.status !== 'running') {
      await new Promise(r => setTimeout(r, maxWait))
      return { processId, status: procInfo?.status || 'not_found', success: true }
    }
    return new Promise(resolve => {
      const timeout = setTimeout(() => {
        plugin.processBus.removeListener('process:done', onDone)
        resolve({ processId, status: 'running', success: true })
      }, maxWait)
      const onDone = (id, result) => {
        if (id === processId) {
          clearTimeout(timeout)
          resolve({ exitCode: result.exitCode, processId, status: result.status, success: true })
        }
      }
      plugin.processBus.on('process:done', onDone)
    })
  }
}
