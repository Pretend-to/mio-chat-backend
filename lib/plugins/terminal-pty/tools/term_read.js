import { MioFunction } from '../../../function.js'

export default class term_read extends MioFunction {
  constructor() {
    super({
      adminOnly: true,
      description: `Read the current screen content of a persistent terminal session.

Returns the visible screen buffer with cursor position, allowing you to see what the running program currently displays. Use this to check output after term_write, or to see TUI program state (menus, editors, etc.).`,
      name: 'term_read',
      parameters: {
        properties: {
          sessionId: { description: 'The session ID to read from.', type: 'string' },
          stripAnsi: { default: true, description: 'Strip ANSI escape codes. Default true.', type: 'boolean' },
          tail: { description: 'Number of recent lines from bottom. Defaults to all visible lines.', type: 'number' },
        },
        required: ['sessionId'],
        type: 'object',
      },
    })
    this.func = this.readScreen
  }

  async readScreen(e) {
    const { sessionId, tail, stripAnsi = true } = e.params
    const plugin = this.parentPlugin

    if (sessionId && sessionId.startsWith('proc_')) {
      const procInfo = plugin.processes?.get(sessionId)
      if (!procInfo) {return { error: `Process ${sessionId} not found.` }}

      const lines = (procInfo.stdout + procInfo.stderr).split('\n')
      const slicedLines = tail ? lines.slice(-tail) : lines

      return {
        exitCode: procInfo.status !== 'running' ? procInfo.exitCode : undefined,
        lines: slicedLines.map(l => l.trimEnd()),
        sessionId,
        status: procInfo.status,
        totalLines: lines.length,
      }
    }

    const {sessions} = plugin
    const session = sessions.get(sessionId)
    if (!session) {return { error: `Session ${sessionId} not found.` }}

    const screen = sessions.readScreen(sessionId, { includeCursor: true, stripAnsi, tail })
    if (!screen) {return { error: `Failed to read session ${sessionId}.` }}

    return {
      cursor: screen.cursor,
      exitCode: session.status !== 'running' ? session.exitCode : undefined,
      idleMs: Date.now() - session.lastActivity,
      lines: screen.lines,
      sessionId,
      status: session.status,
      terminal: `${screen.cols}x${screen.rows}`,
      totalLines: screen.lineCount,
    }
  }
}
