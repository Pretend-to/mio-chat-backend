import { MioFunction } from '../../../function.js'

export default class ps extends MioFunction {
  constructor() {
    super({
      name: 'ps',
      description: `List active terminal sessions and processes. Shows all persistent PTY sessions (term_...) and legacy background processes (proc_...). Check status before using term_read/write.`,
      parameters: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Optional: check a specific session (term_...) or process (proc_...).' },
        },
        required: [],
      },
      adminOnly: true,
    })
    this.func = this.status
  }

  async status(e) {
    const { sessionId } = e.params
    const plugin = this.parentPlugin
    const sessions = plugin.sessions

    if (sessionId) {
      if (sessionId.startsWith('term_')) {
        const session = sessions.get(sessionId)
        if (!session) return { error: `Session ${sessionId} not found.` }
        const screen = sessions.readScreen(sessionId, { tail: 5, stripAnsi: true, includeCursor: true })
        return {
          id: session.id, type: 'session', shell: session.shell,
          command: session.command, status: session.status,
          startTime: session.startTime, lastActivity: session.lastActivity,
          idleMs: Date.now() - session.lastActivity,
          terminal: `${session.cols}x${session.rows}`,
          exitCode: session.exitCode,
          recentOutput: screen ? screen.lines.slice(-5) : [],
        }
      }
      if (sessionId.startsWith('proc_')) {
        const procInfo = plugin.processes?.get(sessionId)
        if (!procInfo) return { error: `Process ${sessionId} not found.` }
        return {
          id: procInfo.id, type: 'process', command: procInfo.command,
          status: procInfo.status, startTime: procInfo.startTime,
          exitCode: procInfo.exitCode, error: procInfo.error,
          stdout: procInfo.stdout?.slice(-2000),
          stderr: procInfo.stderr?.slice(-1000),
        }
      }
      return { error: `Unknown ID format: ${sessionId}.` }
    }

    const sessionList = sessions.list()
    const processList = []
    if (plugin.processes) {
      for (const [id, proc] of plugin.processes) {
        processList.push({
          id, command: proc.command, status: proc.status,
          startTime: proc.startTime, exitCode: proc.exitCode,
        })
      }
    }
    return { sessions: sessionList, processes: processList, total: sessionList.length + processList.length }
  }
}
