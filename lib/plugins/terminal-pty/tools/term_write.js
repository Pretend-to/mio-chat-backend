import { MioFunction } from '../../../function.js'

export default class term_write extends MioFunction {
  constructor() {
    super({
      adminOnly: true,
      description: `Send keystrokes or input data to a persistent terminal session.

Use this to interact with running commands, fill prompts, send Ctrl sequences, navigate TUI menus.

COMMON KEY SEQUENCES:
• Regular text + Enter: "npm init\\r"
• Ctrl+C (SIGINT): "\\x03"
• Ctrl+D (EOF): "\\x04"
• Arrow keys: "\\x1b[A" (up), "\\x1b[B" (down), "\\x1b[C" (right), "\\x1b[D" (left)
• Tab: "\\t"
• Escape: "\\x1b"`,
      name: 'term_write',
      parameters: {
        properties: {
          data: { description: 'Text/keystrokes to send.', type: 'string' },
          resize: {
            description: 'Optional: resize the terminal.', properties: {
              cols: { type: 'number' },
              rows: { type: 'number' },
            }, type: 'object',
          },
          sessionId: { description: 'The session ID returned by sh(background:true).', type: 'string' },
        },
        required: ['sessionId'],
        type: 'object',
      },
    })
    this.func = this.sendInput
  }

  async sendInput(e) {
    const { sessionId, data, resize } = e.params
    const {sessions} = this.parentPlugin
    const session = sessions.get(sessionId)

    if (!session) {return { error: `Session ${sessionId} not found.` }}
    if (session.status !== 'running') {return { error: `Session ${sessionId} not running (status: ${session.status}).` }}

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
      cursor: screen ? screen.cursor : undefined,
      output: screenLines.join('\n'),
      resized: !!resize,
      sessionId,
      success: true,
      wroteData: !!data,
    }
  }
}
