import { MioFunction } from '../../../function.js'

const DEFAULT_TIMEOUT = 5000

export default class bash extends MioFunction {
  constructor() {
    super({
      adminOnly: true,
      description: 'Execute a shell command in a PTY session, synchronized by default.\n【前台同步 (async: false，默认)】\n- 适用：短小快速的命令（git status、cat、ls、单条构建/脚本）。\n- 行为：同步执行并直接返回 stdout 与 exitCode；等待上限 waitMs（默认 5s、最大 20s）；超时返回 timedOut（命令仍在会话中继续运行，可随后用 wait(sessionId) 等它跑完、或 read_screen 读取输出）。\n【后台异步 (async: true)】\n- 适用：长时间任务（编译、下载、运行服务、sleep、耗时测试）。\n- 行为：立即返回 sessionId（独立子进程运行，不占用交互会话），可并行启动多个；之后用 wait(sessionId) 实时等待完成、read_screen 查看进度/输出。\n【工作区】cwd 在会话创建时绑定为持久工作区，复用 sessionId 期间保持不变；更换工作区需结束旧会话并新建。\n【并行】不同 sessionId 的会话可并行运行。',
      name: 'bash',
      parameters: {
        properties: {
          async: { description: '是否以后台任务方式运行（默认 false=前台同步）。true 适合长任务（编译/下载/运行服务/sleep/耗时测试）：立即返回 sessionId，可并行多个，之后用 wait(sessionId) 等待完成、read_screen 读取输出。false（默认）适合快速短命令：同步返回结果。', type: 'boolean' },
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
    const command = (params.command || '').trim()
    return command.length > 25 ? `${command.slice(0, 22)}...` : command || 'shell'
  }

  async execute(e) {
    const { command, cwd, sessionId, waitMs = DEFAULT_TIMEOUT } = e.params
    // 兼容旧名 background（新名 async 优先）
    const isAsync = e.params.async ?? e.params.background ?? false
    const { sessions } = this.parentPlugin
    const timeout = Math.min(Math.max(waitMs, 0), 20_000)

    // 后台命令走独立子进程，完成靠子进程 exit，不占用/依赖常驻 PTY shell
    if (isAsync) {
      const result = sessions.runBackground(sessionId, command, { cwd })
      return {
        message: `Command started in background ${result.sessionId}. Use wait with this sessionId.`,
        sessionId: result.sessionId,
        status: 'running',
      }
    }

    let session = sessionId ? sessions.get(sessionId) : null
    let created = false

    if (!session) {
      const createdSession = await sessions.createSession({ cwd, sessionId })
      session = sessions.get(createdSession.sessionId)
      created = true
    }

    if (!session) {throw new Error('Failed to create terminal session')}

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
        cwd: session.cwd, // 会话绑定的持久工作区目录
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
