import { MioFunction } from '../../../function.js'

export default class ps extends MioFunction {
  constructor() {
    super({
      adminOnly: true,
      description: `List active terminal sessions and processes. Shows all persistent PTY sessions (term_...) and legacy background processes (proc_...). Check status before using term_read/write.`,
      name: 'ps',
      parameters: {
        properties: {
          sessionId: { description: 'Optional: check a specific session (term_...) or process (proc_...).', type: 'string' },
        },
        required: [],
        type: 'object',
      },
    })
    this.func = this.status
  }

  async status(e) {
    const { sessionId } = e.params
    const plugin = this.parentPlugin
    const {sessions} = plugin

    if (sessionId) {
      if (sessionId.startsWith('term_')) {
        const session = sessions.get(sessionId)
        if (!session) {return { error: `Session ${sessionId} not found.` }}
        const screen = sessions.readScreen(sessionId, { includeCursor: true, stripAnsi: true, tail: 5 })
        return {
          command: session.command, exitCode: session.exitCode, id: session.id, idleMs: Date.now() - session.lastActivity, lastActivity: session.lastActivity, recentOutput: screen ? screen.lines.slice(-5) : [], shell: session.shell, startTime: session.startTime, status: session.status, terminal: `${session.cols}x${session.rows}`, type: 'session',
        }
      }
      if (sessionId.startsWith('proc_')) {
        const procInfo = plugin.processes?.get(sessionId)
        if (!procInfo) {return { error: `Process ${sessionId} not found.` }}
        return {
          command: procInfo.command, error: procInfo.error, exitCode: procInfo.exitCode, id: procInfo.id, startTime: procInfo.startTime, status: procInfo.status, stderr: procInfo.stderr?.slice(-1000), stdout: procInfo.stdout?.slice(-2000), type: 'process',
        }
      }
      return { error: `Unknown ID format: ${sessionId}.` }
    }

    const sessionList = sessions.list()
    const processList = []
    if (plugin.processes) {
      for (const [id, proc] of plugin.processes) {
        processList.push({
          command: proc.command, exitCode: proc.exitCode, id, startTime: proc.startTime, status: proc.status,
        })
      }
    }
    return { processes: processList, sessions: sessionList, total: sessionList.length + processList.length }
  }
}
