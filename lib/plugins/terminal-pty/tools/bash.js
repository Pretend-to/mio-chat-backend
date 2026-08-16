import { MioFunction } from '../../../function.js'

const DEFAULT_TIMEOUT = 5000

export default class bash extends MioFunction {
  constructor() {
    super({
      adminOnly: true,
      description: 'Execute a shell command in a persistent PTY session. Use sessionId to run commands in parallel or reuse a session. Returns command output, exit status, and session status.',
      name: 'bash',
      parameters: {
        properties: {
          background: { description: 'Start the command and return immediately, keeping the PTY session alive.', type: 'boolean' },
          command: { description: 'Shell command to execute.', type: 'string' },
          cwd: { description: 'Working directory when creating a new session.', type: 'string' },
          sessionId: { description: 'Optional stable session ID. Reuse it for parallel sessions or an existing interactive terminal.', type: 'string' },
          waitMs: { description: 'Maximum wait time for foreground commands. Default 5000, maximum 20000.', type: 'number' },
        },
        required: ['command'],
        type: 'object',
      },
    })
    this.func = this.execute
  }

  getDisplayName(params) {
    const command = params.command?.trim() || 'shell'
    return `Bash: ${command.length > 25 ? `${command.slice(0, 22)}...` : command}`
  }

  async execute(e) {
    const { command, cwd, background = false, sessionId, waitMs = DEFAULT_TIMEOUT } = e.params
    const { sessions } = this.parentPlugin
    const timeout = Math.min(Math.max(waitMs, 0), 20_000)
    let session = sessionId ? sessions.get(sessionId) : null
    let created = false

    if (!session) {
      const createdSession = await sessions.createSession({ cwd, sessionId })
      session = sessions.get(createdSession.sessionId)
      created = true
    }

    if (!session) {throw new Error('Failed to create terminal session')}

    if (background) {
      sessions.write(session.id, `${command}\n`)
      return {
        message: `Command started in PTY session ${session.id}. Use bash_input or wait with this sessionId.`,
        sessionId: session.id,
        status: 'running',
      }
    }

    try {
      const result = await sessions.execCommand(session.id, command, timeout)
      if (result.timedOut) {
        return {
          message: `Command is still running after ${timeout}ms; the PTY session remains available.`,
          sessionId: session.id,
          status: 'running',
          stdout: result.stdout,
        }
      }

      const response = {
        exitCode: result.exitCode,
        sessionId: session.id,
        status: 'finished',
        stdout: result.stdout,
      }
      if (created) {sessions.close(session.id)}
      return response
    } catch (error) {
      if (created) {sessions.close(session.id)}
      return { error: error.message, sessionId: session.id, status: 'error' }
    }
  }
}
