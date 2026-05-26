import { MioFunction } from '../../../function.js'

export default class term_write extends MioFunction {
  constructor() {
    super({
      name: 'term_write',
      description: `Send keystrokes or input data to a persistent terminal session.

Use this to interact with running commands, fill prompts, send Ctrl sequences, navigate TUI menus.

COMMON KEY SEQUENCES:
• Regular text + Enter: "npm init\\r"
• Ctrl+C (SIGINT): "\\x03"
• Ctrl+D (EOF): "\\x04"
• Arrow keys: "\\x1b[A" (up), "\\x1b[B" (down), "\\x1b[C" (right), "\\x1b[D" (left)
• Tab: "\\t"
• Escape: "\\x1b"`,
      parameters: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'The session ID returned by sh(background:true).' },
          data: { type: 'string', description: 'Text/keystrokes to send.' },
          resize: {
            type: 'object', description: 'Optional: resize the terminal.',
            properties: {
              cols: { type: 'number' },
              rows: { type: 'number' },
            },
          },
        },
        required: ['sessionId'],
      },
      adminOnly: true,
    })
    this.func = this.sendInput
  }

  async sendInput(e) {
    const { sessionId, data, resize } = e.params
    const sessions = this.parentPlugin.sessions
    const session = sessions.get(sessionId)

    if (!session) return { error: `Session ${sessionId} not found.` }
    if (session.status !== 'running') return { error: `Session ${sessionId} not running (status: ${session.status}).` }

    if (resize) {
      sessions.resize(sessionId, resize.cols || session.cols, resize.rows || session.rows)
    }
    if (data) {
      sessions.write(sessionId, data)
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const screen = sessions.readScreen(sessionId, { includeCursor: true })
    const screenLines = screen ? screen.lines : []

    return {
      success: true,
      sessionId,
      wroteData: !!data,
      resized: !!resize,
      output: screenLines.join('\n'),
      cursor: screen ? screen.cursor : undefined,
    }
  }
}
