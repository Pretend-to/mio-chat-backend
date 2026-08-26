import { MioFunction } from '../../../function.js'

const DEFAULT_WAIT = 10_000
const MAX_WAIT = 300_000 // 5 minutes

export default class wait extends MioFunction {
  constructor() {
    super({
      adminOnly: true,
      description: 'Wait for a specified duration, or suspend and wait until a background PTY session completes (event-driven). Ideal for long-running compilation, builds, downloads, or testing.',
      name: 'wait',
      parameters: {
        properties: {
          sessionId: {
            description: 'Optional PTY session ID to wait for completion. If omitted, performs a standard sleep wait.',
            type: 'string',
          },
          timeoutMs: {
            default: 10000,
            description: 'Max time to wait in ms. Default 10000, max 300000 (5 minutes).',
            type: 'number',
          },
        },
        required: [],
        type: 'object',
      },
    })
    this.func = this.execute
  }

  getDisplayName(params) {
    const { sessionId, timeoutMs } = params
    return sessionId ? `Wait session: ${sessionId}` : `Wait ${timeoutMs || 10000}ms`
  }

  async execute(e) {
    const { sessionId, timeoutMs = DEFAULT_WAIT } = e.params
    const { sessions } = this.parentPlugin
    const maxWait = Math.min(Math.max(timeoutMs, 100), MAX_WAIT)

    // 1. Simple sleep wait without sessionId
    if (!sessionId) {
      await new Promise((resolve) => setTimeout(resolve, maxWait))
      return {
        message: `Waited ${maxWait}ms.`,
        status: 'finished',
        success: true,
      }
    }

    // 2. Event-driven wait：同时支持 PTY session 与 background job
    const session = sessions.get(sessionId)
    const bgJob = sessions.getBgJob(sessionId)
    const target = session || bgJob
    const isBg = !session && !!bgJob

    if (!target) {
      return {
        error: `Session ${sessionId} not found.`,
        sessionId,
        status: 'not_found',
        success: false,
      }
    }

    const getScreen = (tail) =>
      isBg ? sessions.readBgScreen(sessionId, { tail }) : sessions.readScreen(sessionId, { tail })

    if (target.status !== 'running') {
      const screen = getScreen(30)
      return {
        exitCode: target.exitCode,
        lines: screen?.lines || [],
        message: `Session ${sessionId} is already ${target.status}.`,
        sessionId,
        status: target.status,
        success: true,
      }
    }

    return new Promise((resolve) => {
      let resolved = false
      let timer = null

      const cleanup = () => {
        if (!resolved) {
          resolved = true
          clearTimeout(timer)
          sessions.removeListener('done', onDone)
        }
      }

      const onDone = (id, result) => {
        if (id === sessionId) {
          cleanup()
          const screen = getScreen(50)
          resolve({
            exitCode: result.exitCode,
            lines: screen?.lines || [],
            message: `Session ${sessionId} finished.`,
            sessionId,
            signal: result.signal,
            status: 'finished',
            success: true,
          })
        }
      }

      sessions.on('done', onDone)

      timer = setTimeout(() => {
        cleanup()
        const screen = getScreen(30)
        resolve({
          cursor: screen?.cursor,
          lines: screen?.lines || [],
          message: `Session ${sessionId} is still running after ${maxWait}ms.`,
          sessionId,
          status: 'running',
          success: true,
        })
      }, maxWait)
    })
  }
}