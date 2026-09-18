import { MioFunction } from '../../../function.js'
import agentService from '../../../agents/AgentService.js'
import { requireAgentId } from '../context.js'

export default class AgentModelTool extends MioFunction {
  constructor({ service = agentService, llm = null } = {}) {
    super({
      access: { requires: { admin: true } },
      description: [
        '查询或修改当前 Agent 的模型与 Provider。',
        '配置属于 Agent，对 Web、Channel、Task 和后续 SubAgent 执行统一生效。',
        '支持 get、list、switch 和 reset。',
      ].join('\n'),
      name: 'agent_model',
      parameters: {
        properties: {
          action: {
            default: 'get',
            enum: ['get', 'list', 'switch', 'reset'],
            type: 'string',
          },
          model: { description: 'switch 的目标模型', type: 'string' },
          provider: { description: 'switch 的目标 Provider', type: 'string' },
        },
        required: ['action'],
        type: 'object',
      },
    })
    this.service = service
    this.llm = llm
    this.func = this.execute.bind(this)
  }

  async execute(event) {
    const agentId = requireAgentId(event)
    const { action = 'get' } = event.params || {}
    if (action === 'list') {
      const llm = this.llm || global.middleware?.llm
      return {
        availableModels: llm?.getModelList?.(true) || {},
        defaultProvider: llm?._getDefaultProvider?.() || null,
        success: true,
      }
    }

    const current = await this.service.get(agentId)
    if (!current) throw new Error(`Agent ${agentId} not found`)
    if (action === 'get') {
      return {
        model: current.model || null,
        provider: current.provider || null,
        success: true,
      }
    }

    let patch
    if (action === 'reset') {
      patch = { model: '', provider: '' }
    } else if (action === 'switch') {
      patch = {}
      if (event.params?.model?.trim()) patch.model = event.params.model.trim()
      if (event.params?.provider?.trim())
        patch.provider = event.params.provider.trim()
      if (Object.keys(patch).length === 0) {
        return {
          error: 'switch 至少需要 model 或 provider 之一',
          success: false,
        }
      }
    } else {
      return { error: `Unknown action: ${action}`, success: false }
    }

    const updated = await this.service.update(agentId, patch)
    if (event.channel) {
      event.channel.model = updated.model || null
      event.channel.provider = updated.provider || null
    }
    return {
      model: updated.model || null,
      provider: updated.provider || null,
      success: true,
    }
  }
}
