import { MioFunction } from '../../../function.js'
import agentService from '../../../agents/AgentService.js'
import { requireAgentId } from '../context.js'
import { validateSelfAction } from '../lib/selfManagement.js'

export default class AgentSoulTool extends MioFunction {
  constructor({ service = agentService } = {}) {
    super({
      access: { requires: { admin: true, agentContext: true } },
      name: 'agent_soul',
      description:
        '管理当前 Agent 的长期人格、语气与行为偏好。read=读取，append=追加，replace=整体替换，clear=清空；append/replace 必须传非空 soul，read/clear 不接受 soul。修改从下一次独立会话执行开始使用，不会追溯改变当前运行中的模型上下文，也不能改变服务端工具权限。仅修改长期偏好，当前任务的临时要求不要写入 Soul。',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['action'],
        properties: {
          action: {
            type: 'string',
            enum: ['read', 'append', 'replace', 'clear'],
          },
          soul: {
            type: 'string',
            description: 'append 的新增内容或 replace 的完整人格；不能为空',
          },
        },
      },
    })
    this.service = service
    this.func = this.execute.bind(this)
  }

  async execute(event) {
    const agentId = requireAgentId(event)
    const params = event.params || {}
    const action = validateSelfAction(params, {
      read: [],
      append: ['soul'],
      replace: ['soul'],
      clear: [],
    })
    if (action === 'read') {
      const agent = await this.service.get(agentId)
      if (!agent) throw new Error(`Agent ${agentId} not found`)
      return { success: true, soul: agent.soul || '' }
    }
    if (
      ['append', 'replace'].includes(action) &&
      (typeof params.soul !== 'string' || !params.soul.trim())
    ) {
      throw new Error(`${action} 必须提供非空 soul`)
    }
    const result = await this.service.updateSoul(agentId, {
      action,
      soul: params.soul,
    })
    return { success: true, ...result, effectiveFrom: 'next_turn' }
  }
}
