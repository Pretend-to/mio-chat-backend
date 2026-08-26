import { MioFunction } from '../../../function.js'

/**
 * read_screen - 读取 PTY 会话 / 后台任务的最新屏幕输出
 *
 * 典型场景：
 *   - 前台 bash 命令超时（timedOut）后，命令其实继续在会话里执行/已执行完——
 *     用本工具读取其输出（bash 工具的 waitMs 上限 20s 拿不到的结果，这里能读）
 *   - 后台任务进行中查看进度（配合 wait 使用：wait 等完成，read_screen 看输出）
 *   - 复用的 PTY 会话里查看历史命令输出尾部
 */
export default class read_screen extends MioFunction {
  constructor() {
    super({
      adminOnly: true,
      description:
        '读取 PTY 会话或后台任务的最新屏幕输出（尾部 N 行）。' +
        '典型用途：前台命令超时后查看其结果输出、后台任务进度、复用会话的历史输出尾部。' +
        '不执行任何命令，只读屏幕内容。',
      name: 'read_screen',
      parameters: {
        properties: {
          sessionId: {
            description: 'PTY 会话 ID 或后台任务(bg) ID',
            type: 'string',
          },
          tail: {
            default: 100,
            description: '返回尾部行数（默认 100）',
            type: 'number',
          },
        },
        required: ['sessionId'],
        type: 'object',
      },
    })
    this.func = this.execute
  }
  getDisplayName(params) {
    return `Read screen: ${params.sessionId}`
  }
  async execute(e) {
    const { sessionId, tail = 100 } = e.params
    const { sessions } = this.parentPlugin
    const session = sessions.get(sessionId)
    const bgJob = sessions.getBgJob ? sessions.getBgJob(sessionId) : null
    if (!session && !bgJob) {
      return {
        error: `Session ${sessionId} not found.`,
        sessionId,
        status: 'not_found',
        success: false,
      }
    }
    const target = session || bgJob
    const screen = bgJob
      ? sessions.readBgScreen(sessionId, { tail })
      : sessions.readScreen(sessionId, { tail })
    return {
      lineCount: screen?.lineCount || screen?.lines?.length || 0,
      lines: screen?.lines || [],
      sessionId,
      status: target.status,
      success: true,
    }
  }
}