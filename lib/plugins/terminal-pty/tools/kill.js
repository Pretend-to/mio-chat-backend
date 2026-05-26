import { MioFunction } from '../../../function.js'

export default class kill extends MioFunction {
  constructor() {
    super({
      name: 'kill',
      description: `Terminate a running process or PTY session. Unified endpoint for:
• PTY sessions (term_... IDs)
• Legacy background processes (proc_... IDs)`,
      parameters: {
        type: 'object',
        properties: {
          targetId: { type: 'string', description: 'The session ID (term_...) or process ID (proc_...) to terminate.' },
          signal: { type: 'string', description: 'Signal to send. Default: SIGTERM.', default: 'SIGTERM' },
        },
        required: ['targetId'],
      },
      adminOnly: true,
    })
    this.func = this.terminate
  }

  async terminate(e) {
    const { targetId, signal = 'SIGTERM' } = e.params
    const plugin = this.parentPlugin
    const sessions = plugin.sessions

    if (targetId.startsWith('term_')) {
      const session = sessions.get(targetId)
      if (!session) return { success: false, message: `Session ${targetId} not found.` }
      if (session.status !== 'running') return { success: true, message: `Session ${targetId} already ${session.status}.` }
      sessions.close(targetId)
      plugin.processBus.emit('process:done', targetId, { status: 'terminated', exitCode: null, signal })
      return { success: true, message: `Session ${targetId} terminated.` }
    }

    if (targetId.startsWith('proc_')) {
      const procInfo = plugin.processes?.get(targetId)
      if (!procInfo) return { success: false, message: `Process ${targetId} not found.` }
      try {
        procInfo.process.kill(signal)
        procInfo.status = 'terminating'
        return { success: true, message: `Signal ${signal} sent to process ${targetId}.` }
      } catch (err) {
        return { error: `Failed to kill: ${err.message}` }
      }
    }

    return { error: `Unknown target: ${targetId}. Use term_ or proc_ prefix.` }
  }
}
