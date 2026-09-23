import { MioFunction } from '../../../function.js'
import agentService from '../../../agents/AgentService.js'
import { requireAgentId } from '../context.js'

function buildSessionTree(sessions) {
  const byId = new Map(
    sessions.map((session) => [session.id, { ...session, children: [] }]),
  )
  const roots = []
  for (const session of byId.values()) {
    const parent = session.parentSessionId
      ? byId.get(session.parentSessionId)
      : null
    if (parent) parent.children.push(session)
    else roots.push(session)
  }
  return roots
}

export default class AgentSessionTool extends MioFunction {
  constructor({ service = agentService } = {}) {
    super({
      description: [
        '管理当前 Agent 的普通会话 Session。',
        'Channel 中的列表、新建、切换和删除严格限定于当前 ChannelConversation；Web 中按当前 Agent 管理。',
        'SubAgent child Session 只由后续 `subagent` 工具在创建 RunGroup + Run 的同一事务中创建，本工具不得单独创建。',
        '支持 list、current、create、switch 和 delete。',
      ].join('\n'),
      name: 'agent_session',
      parameters: {
        properties: {
          action: {
            default: 'list',
            enum: ['list', 'current', 'create', 'switch', 'delete'],
            type: 'string',
          },
          cascadeDependencies: {
            default: false,
            description: 'delete 时是否显式级联删除 Task/Trigger 依赖',
            type: 'boolean',
          },
          sessionId: {
            description: 'switch 或 delete 的目标 Session ID',
            type: 'string',
          },
          title: { description: '新 Session 标题', type: 'string' },
          visible: {
            description: '是否在普通 Session 列表中可见',
            type: 'boolean',
          },
        },
        required: ['action'],
        type: 'object',
      },
    })
    this.service = service
    this.func = this.execute.bind(this)
  }

  async execute(event) {
    const agentId = requireAgentId(event)
    const { action = 'list' } = event.params || {}
    const scope = event.sessionScope || null
    if (action === 'list') {
      const sessions = scope
        ? await scope.list()
        : await this.service.listSessions(agentId, { includeChildren: true })
      return { sessions, success: true, tree: buildSessionTree(sessions) }
    }
    if (action === 'current') {
      return {
        currentSessionId: scope
          ? await scope.getActive()
          : event.sessionId || null,
        success: true,
      }
    }
    if (action === 'create') {
      const title = event.params?.title || '新会话'
      return {
        session: scope
          ? await scope.create(title)
          : await this.service.createSession(agentId, {
              kind: 'conversation',
              title,
              visible: true,
            }),
        success: true,
      }
    }
    const sessionId = String(event.params?.sessionId || '').trim()
    if (!sessionId)
      return { error: `${action} requires sessionId`, success: false }
    if (action === 'switch') {
      if (!scope) {
        return {
          error:
            'Web 的当前 Session 由客户端的 agentId + sessionId 选择管理，不能由工具改写 Agent.defaultSessionId',
          success: false,
        }
      }
      return {
        session: await scope.activate(sessionId),
        success: true,
      }
    }
    if (action === 'delete') {
      if (sessionId === event.sessionId) {
        return { error: '不能在执行中删除当前 Session', success: false }
      }
      const sessions = scope
        ? await scope.list()
        : await this.service.listSessions(agentId, { includeChildren: true })
      const target = sessions.find((session) => session.id === sessionId)
      if (target?.kind === 'subagent') {
        return {
          error:
            'SubAgent Session 由 SubAgent Run 生命周期管理；请通过 subagent cancel/continue 协议处理，不能作为普通 Session 删除',
          success: false,
        }
      }
      return {
        ...(scope
          ? await scope.delete(sessionId)
          : await this.service.deleteSession(agentId, sessionId, {
              cascadeDependencies: event.params?.cascadeDependencies === true,
            })),
        success: true,
      }
    }
    return { error: `Unknown action: ${action}`, success: false }
  }
}
