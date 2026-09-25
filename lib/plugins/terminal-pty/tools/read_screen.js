import { MioFunction } from '../../../function.js'

/**
 * 空结果提示（纯函数，便于单测）。
 *
 * 空结果最常见的原因不是「命令挂了」，而是管道缓冲：`cmd 2>&1 | tail -80`
 * 这类命令的生产者输出会被管道消费者攒到 EOF 才吐字，后台缓冲区在执行期间
 * 就是真的空的（不是丢数据）。调用方必须能区分这一点。
 */
export function buildEmptyScreenHint({ isBgJob = false } = {}) {
  if (isBgJob) {
    return (
      'hint: 暂无输出。若命令接了管道（| tail / | head / | grep 等），管道会缓冲到命令结束才吐字，' +
      '执行期间这里一直是空的不代表命令挂了；可去掉管道重跑，或用 wait(sessionId) 等它结束。'
    )
  }
  return 'hint: 当前屏幕没有可读文本行（会话刚创建或已被清屏），不代表命令没有在执行。'
}

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
      access: { requires: { admin: true } },
      description:
        '读取 PTY 会话或后台任务的最新屏幕输出（尾部 N 行）。' +
        '典型用途：前台命令超时后查看其结果输出、后台任务进度、复用会话的历史输出尾部。' +
        '不执行任何命令，只读屏幕内容。' +
        '注意：结果为空时返回的 hint 会说明原因——后台命令若接了管道（| tail / | head），' +
        '输出会被缓冲到命令结束才吐字，执行期间读到的空结果不代表命令挂了。',
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
    const lines = screen?.lines || []
    const response = {
      lineCount: screen?.lineCount || lines.length || 0,
      lines,
      sessionId,
      status: target.status,
      success: true,
    }
    // 空结果必须自带可判定的原因，否则调用方会把「管道缓冲」误判成「命令挂了」
    if (response.lineCount === 0) {
      response.hint = buildEmptyScreenHint({ isBgJob: Boolean(bgJob) })
    }
    return response
  }
}
