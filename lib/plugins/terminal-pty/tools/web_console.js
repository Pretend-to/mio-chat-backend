import { MioFunction } from '../../../function.js'
import {
  exec,
  listClients,
  resolveConsoleCaller,
  selectClient,
} from '../../../server/socket.io/services/webConsole.js'

/**
 * 在线浏览器 DevTools 控制台通道。
 *
 * 服务端下发 → 浏览器页面里真执行 → 结果原路回传，走 socket.io 实时往返。
 * 作用域：Web 用户自己的连接；系统管理员 Agent 可使用管理员在线浏览器。
 */
export default class webConsole extends MioFunction {
  constructor() {
    super({
      description:
        '在「浏览器里的前端页面」执行 JavaScript —— 等价于在 DevTools 控制台敲代码，通过 socket.io 实时下发并拿到结果。\n服务端 Agent、渠道及定时唤起均可使用在线浏览器；只能操作当前身份有权访问的连接。\n【典型用途】读/改 localStorage（比如清掉卡死的会话链）、清 Cache Storage、注销 Service Worker、查页面/DOM 状态、触发前端行为 —— 不用再让人「去刷新一下」。\n【用法】action=list 列出你名下的在线前端（clientId / browser / os / ip，靠环境信息认设备）；action=exec 执行 code；clientId 省略时优先当前页面，其次正在观察当前 Agent Session 的唯一页面，再其次唯一在线页面；多个候选时先 list 再指定。\n【code 写法】表达式（localStorage.length、await caches.keys()）或语句块（localStorage.clear(); location.reload()），支持 await 与多行。\n【注意】改动立刻生效且持久；清理类操作前先读一遍确认。',
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
              'exec 时的目标前端（来自 list 的 clientId）；省略时优先当前页面、当前 Session 的唯一观察页面或唯一在线页面',
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
      return code.length > 28
        ? `${code.slice(0, 25)}...`
        : code || 'web_console'
    }
    return 'web_console: list'
  }

  async execute(e) {
    const { action, clientId, code, timeoutMs } = e.params
    const caller = resolveConsoleCaller(e)

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

    const targetId = selectClient(caller, clientId).socket.id
    const result = await exec({
      ...caller,
      clientId: targetId,
      code,
      timeoutMs,
    })
    const ok = result?.success !== false
    return {
      clientId: targetId,
      message: ok ? result?.value : `执行报错：${result?.error}`,
      page: result?.url,
      status: ok ? 'ok' : 'error',
    }
  }
}
