import { MioFunction } from '../../../function.js'

export default class kill extends MioFunction {
  constructor() {
    super({
      adminOnly: true,
      description: `Terminate a running process or PTY session. Unified endpoint for:
• PTY sessions (term_... IDs)
• Legacy background processes (proc_... IDs)`,
      name: 'kill',
      parameters: {
        properties: {
          signal: { default: 'SIGTERM', description: 'Signal to send. Default: SIGTERM.', type: 'string' },
          targetId: { description: 'The session ID (term_...) or process ID (proc_...) to terminate.', type: 'string' },
        },
        required: ['targetId'],
        type: 'object',
      },
    })
    this.func = this.terminate
  }

  async terminate(e) {
    const { targetId, signal = 'SIGTERM' } = e.params
    const plugin = this.parentPlugin
    const {sessions} = plugin

    if (targetId.startsWith('term_')) {
      const session = sessions.get(targetId)
      if (!session) {return { success: false, message: `Session ${targetId} not found.` }}
      if (session.status !== 'running') {return { success: true, message: `Session ${targetId} already ${session.status}.` }}
      sessions.close(targetId)
      plugin.processBus.emit('process:done', targetId, { exitCode: null, signal, status: 'terminated' })
      return { message: `Session ${targetId} terminated.`, success: true }
    }

    if (targetId.startsWith('proc_')) {
      const procInfo = plugin.processes?.get(targetId)
      if (!procInfo) {return { success: false, message: `Process ${targetId} not found.` }}
      try {
        procInfo.process.kill(signal)
        procInfo.status = 'terminating'
        return { message: `Signal ${signal} sent to process ${targetId}.`, success: true }
      } catch (error) {
        return { error: `Failed to kill: ${error.message}` }
      }
    }

    return { error: `Unknown target: ${targetId}. Use term_ or proc_ prefix.` }
  }
}
