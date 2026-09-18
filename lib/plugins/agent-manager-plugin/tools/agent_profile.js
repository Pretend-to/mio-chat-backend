import { MioFunction } from '../../../function.js'
import agentService from '../../../agents/AgentService.js'
import { requireAgentId } from '../context.js'

export default class AgentProfileTool extends MioFunction {
  constructor({ service = agentService } = {}) {
    super({
      access: { requires: { admin: true } },
      description: [
        '管理当前 Agent 自身的资料与灵魂人格。',
        'Agent 是名称、头像、简介和 Soul 的唯一拥有者，修改后对 Web 与所有绑定 Channel 生效。',
        '支持 read、update、append_soul 和 clear_soul。',
      ].join('\n'),
      name: 'agent_profile',
      parameters: {
        properties: {
          action: {
            default: 'read',
            enum: ['read', 'update', 'append_soul', 'clear_soul'],
            type: 'string',
          },
          avatar: { description: 'Agent 头像 URL', type: 'string' },
          description: {
            description: 'Agent 的对外简介与职责',
            type: 'string',
          },
          name: { description: 'Agent 名称或昵称', type: 'string' },
          soul: {
            description: 'Agent 的人格、语气、角色和行为准则',
            type: 'string',
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
    const { action = 'read' } = event.params || {}
    const current = await this.service.get(agentId)
    if (!current) throw new Error(`Agent ${agentId} not found`)

    if (action === 'read') return { agent: current, success: true }
    if (action === 'clear_soul') {
      return {
        agent: await this.service.update(agentId, { soul: '' }),
        success: true,
      }
    }
    if (action === 'append_soul') {
      const addition = String(event.params?.soul || '').trim()
      if (!addition)
        return { error: 'append_soul 需要非空 soul', success: false }
      const soul = current.soul ? `${current.soul}\n\n${addition}` : addition
      return {
        agent: await this.service.update(agentId, { soul }),
        success: true,
      }
    }
    if (action === 'update') {
      const patch = {}
      for (const key of ['avatar', 'description', 'name', 'soul']) {
        if (Object.hasOwn(event.params || {}, key))
          patch[key] = event.params[key]
      }
      if (Object.keys(patch).length === 0) {
        return {
          error: 'update 至少需要 avatar、description、name 或 soul 之一',
          success: false,
        }
      }
      return { agent: await this.service.update(agentId, patch), success: true }
    }
    return { error: `Unknown action: ${action}`, success: false }
  }
}
