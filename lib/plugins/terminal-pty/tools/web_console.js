import { MioFunction } from '../../../function.js'
import {
  exec,
  listClients,
} from '../../../server/socket.io/services/webConsole.js'

/**
 * 前端 DevTools 控制台通道（web only）。
 *
 * 服务端下发 → 浏览器页面里真执行 → 结果原路回传，走 socket.io 实时往返。
 * 作用域：只作用于调用者自己名下的连接（ChatEvent 的 user.id === principalId），
 * 因此不需要 admin —— 谁也碰不到别人的浏览器。
 */
export default class webConsole extends MioFunction {
  constructor() {
    super({
      description:
        '在「浏览器里的前端页面」执行 JavaScript —— 等价于在 DevTools 控制台敲代码，通过 socket.io 实时下发并拿到结果。\n【web only】只对 Web 端会话可用（渠道侧没有浏览器连接会直接报错），且只能操作你自己名下的连接。\n【典型用途】读/改 localStorage（比如清掉卡死的会话链）、清 Cache Storage、注销 Service Worker、查页面/DOM 状态、触发前端行为 —— 不用再让人「去刷新一下」。\n【用法】action=list 列出你名下的在线前端（clientId / userAgent / ip，靠 UA 认设备）；action=exec 执行 code；clientId 省略时默认打到「当前这个页面」这条连接。\n【code 写法】表达式（localStorage.length、await caches.keys()）或语句块（localStorage.clear(); location.reload()），支持 await 与多行。\n【注意】改动立刻生效且持久；清理类操作前先读一遍确认。',
      name: 'web_console',
      parameters: {
        properties: {
          action: {
            description: 'list=列出你名下的在线前端；exec=在指定前端执行 code',
            enum: ['list', 'exec'],
            type: 'string',
          },
          clientId: {
            description:
              'exec 时的目标前端（来自 list 的 clientId）；省略则默认当前页面这条连接',
            type: 'string',
          },
          code: {
            description: 'exec 时必填：要执行的 JavaScript 代码',
            type: 'string',
          },
          timeoutMs: {
            description: '执行超时毫秒数，默认 15000',
            type: 'number',
          },
        },
        required: ['action'],
        type: 'object',
      },
    })
    this.func = this.execute
  }

  getDisplayName(params) {
    if (params.action === 'exec') {
      const code = (params.code || '').replace(/\s+/g, ' ').trim()
      return code.length > 28 ? `${code.slice(0, 25)}...` : code || 'web_console'
    }
    return 'web_console: list'
  }

  /** 调用者身份：Web 端才有真 socket，渠道侧是 null client */
  resolveCaller(e) {
    const callerSocketId = e.client?.socket?.id || null
    if (!callerSocketId) {
      throw new Error(
        'web_console 只在 Web 端可用：当前会话没有浏览器连接（渠道侧没有前端页面可控制）',
      )
    }
    return { callerSocketId, principalId: String(e.principalId) }
  }

  async execute(e) {
    const { action, clientId, code, timeoutMs } = e.params
    const caller = this.resolveCaller(e)

    if (action === 'list') {
      const clients = listClients(caller)
      return {
        clients,
        message: clients.length
          ? `你名下在线前端 ${clients.length} 个`
          : '你名下没有已连接的 Web 前端',
        status: 'ok',
      }
    }

    if (action !== 'exec') {
      throw new Error(`未知 action：${action}`)
    }

    const result = await exec({ ...caller, clientId, code, timeoutMs })
    const ok = result?.success !== false
    return {
      clientId: clientId || caller.callerSocketId,
      message: ok ? result?.value : `执行报错：${result?.error}`,
      page: result?.url,
      status: ok ? 'ok' : 'error',
    }
  }
}
