import { MioFunction } from '../../../function.js'

export default class bash_input extends MioFunction {
  constructor() {
    super({
      adminOnly: true,
      description: 'Send text or control keys to an existing interactive PTY session and return its recent screen output. Use \u0003 for Ctrl+C, \u0004 for Ctrl+D, or normal text ending in \\n.',
      name: 'bash_input',
      parameters: {
        properties: {
          data: { description: 'Text or terminal control sequence to send, for example "yes\\n" or "\\u0003".', type: 'string' },
          resize: { description: 'Optional terminal size.', properties: { cols: { type: 'number' }, rows: { type: 'number' } }, type: 'object' },
          sessionId: { description: 'PTY session ID returned by bash.', type: 'string' },
          tail: { description: 'Maximum number of recent output lines to return.', type: 'number' },
        },
        required: ['sessionId'],
        type: 'object',
      },
    })
    this.func = this.execute
  }

  async execute(e) {
    const { data, resize, sessionId, tail } = e.params
    const { sessions } = this.parentPlugin
    const session = sessions.get(sessionId)
    if (!session) {return { error: `Session ${sessionId} not found`, sessionId }}
    if (resize) {sessions.resize(sessionId, resize.cols || session.cols, resize.rows || session.rows)}
    if (data) {sessions.write(sessionId, data)}
    await new Promise(resolve => setTimeout(resolve, 100))
    const screen = sessions.readScreen(sessionId, { tail, includeCursor: true })
    return {
      cursor: screen?.cursor,
      lines: screen?.lines || [],
      sessionId,
      status: session.status,
      terminal: screen ? `${screen.cols}x${screen.rows}` : undefined,
      wroteData: Boolean(data),
    }
  }
}
