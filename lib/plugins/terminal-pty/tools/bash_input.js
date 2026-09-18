import { MioFunction } from '../../../function.js'

const NAMED_CONTROL_KEYS = {
  BACKSPACE: '\b',
  DELETE: '\u007f',
  ENTER: '\r',
  ESC: '\u001b',
  ESCAPE: '\u001b',
  RETURN: '\r',
  TAB: '\t',
}

function decodeCaretNotation(value) {
  return value.replace(/\^([@a-z?])/gi, (_, key) => {
    const upper = key.toUpperCase()
    if (upper === '?') return '\u007f'
    const code = upper.charCodeAt(0)
    return code >= 64 && code <= 95 ? String.fromCharCode(code - 64) : `^${key}`
  })
}

/**
 * Decode the textual escape forms accepted by bash_input while leaving real
 * control characters untouched. Tool calls commonly carry "\\u0003" as six
 * printable characters instead of an actual ETX byte, so PTY control keys
 * need an explicit decoding boundary here.
 */
export function decodeTerminalInput(raw = '') {
  let value = String(raw)

  value = value
    .replace(/\\u\{([0-9a-f]{1,6})\}/gi, (_, hex) => {
      const codePoint = Number.parseInt(hex, 16)
      return Number.isNaN(codePoint) ? `\\u{${hex}}` : String.fromCodePoint(codePoint)
    })
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\x([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\(ENTER|RETURN|TAB|ESC|ESCAPE|BACKSPACE|DELETE)\b/gi, (_, name) => NAMED_CONTROL_KEYS[name.toUpperCase()])
    .replace(/\bCTRL_([@a-z])\b/gi, (_, key) => {
      const upper = key.toUpperCase()
      if (upper === '?') return '\u007f'
      const code = upper.charCodeAt(0)
      return code >= 64 && code <= 95 ? String.fromCharCode(code - 64) : `CTRL_${key}`
    })
    .replace(/\\n/g, '\r')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\e/g, '\u001b')

  return decodeCaretNotation(value)
}

export default class bash_input extends MioFunction {
  constructor() {
    super({
      access: { requires: { admin: true } },
      description: 'Send text or control keys to an existing interactive PTY session and return its recent screen output. Use \\u0003 for Ctrl+C, \\u0004 for Ctrl+D, or normal text ending in \\n.',
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
    const decodedData = data == null ? data : decodeTerminalInput(data)
    if (decodedData) {sessions.write(sessionId, decodedData)}
    await new Promise(resolve => setTimeout(resolve, 100))
    const screen = sessions.readScreen(sessionId, { tail, includeCursor: true })
    return {
      cursor: screen?.cursor,
      lines: screen?.lines || [],
      sessionId,
      status: session.status,
      terminal: screen ? `${screen.cols}x${screen.rows}` : undefined,
      wroteData: Boolean(decodedData),
    }
  }
}
