import { MioFunction } from '../../../function.js'

export default class term_read extends MioFunction {
  constructor() {
    super({
      name: 'term_read',
      description: `Read the current screen content of a persistent terminal session.

Returns the visible screen buffer with cursor position, allowing you to see what the running program currently displays. Use this to check output after term_write, or to see TUI program state (menus, editors, etc.).`,
      parameters: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'The session ID to read from.' },
          tail: { type: 'number', description: 'Number of recent lines from bottom. Defaults to all visible lines.' },
          stripAnsi: { type: 'boolean', description: 'Strip ANSI escape codes. Default true.', default: true },
        },
        required: ['sessionId'],
      },
      adminOnly: true,
    })
    this.func = this.readScreen
  }

  async readScreen(e) {
    const { sessionId, tail, stripAnsi = true } = e.params
    const sessions = this.parentPlugin.sessions
    const session = sessions.get(sessionId)
    if (!session) return { error: `Session ${sessionId} not found.` }

    const screen = sessions.readScreen(sessionId, { tail, stripAnsi, includeCursor: true })
    if (!screen) return { error: `Failed to read session ${sessionId}.` }

    return {
      sessionId,
      status: session.status,
      idleMs: Date.now() - session.lastActivity,
      terminal: `${screen.cols}x${screen.rows}`,
      cursor: screen.cursor,
      lines: screen.lines,
      totalLines: screen.lineCount,
      exitCode: session.status !== 'running' ? session.exitCode : undefined,
    }
  }
}
