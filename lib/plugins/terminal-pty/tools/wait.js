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
      const settle = (payload) => {
        if (!resolved) {
          cleanup()
          resolve(payload)
        }
      }

      // 信号1：会话生命周期结束（子进程 exit / pty onExit / GC idle_timeout）
      const onDone = (id, result) => {
        if (id === sessionId) {
          const screen = getScreen(50)
          settle({
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

      // 信号2（PTY 会话专属）：命令级完成探测。
      // 解决「前台命令已跑完/超时命令结束，但 wait 拿不到 done」的问题：
      //   - shell 空闲：marker 立即出现 → 立即 finished（无需傻等 timeout）
      //   - 长命令运行中：echo 排队，命令结束后 marker 才出现 → 等到命令真正跑完
      if (!isBg && typeof sessions.waitForIdle === 'function') {
        sessions.waitForIdle(sessionId, maxWait).then((idle) => {
          if (idle.completed) {
            const screen = getScreen(50)
            settle({
              lines: screen?.lines || [],
              message: `Session ${sessionId} finished (command completed).`,
              sessionId,
              status: 'finished',
              success: true,
            })
          }
          // idle 未完成：由外层 timer 兜底 settle(running)
        }).catch(() => {})
      }

      timer = setTimeout(() => {
        const screen = getScreen(30)
        settle({
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