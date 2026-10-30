import { MioFunction } from '../../../function.js'
import agentService from '../../../agents/AgentService.js'
import { requireAgentId } from '../context.js'
import {
  changesOf,
  profileOf,
  validateSelfAction,
} from '../lib/selfManagement.js'

const FIELDS = ['name', 'avatar', 'description']

export default class AgentProfileTool extends MioFunction {
  constructor({ service = agentService } = {}) {
    super({
      access: { requires: { admin: true, agentContext: true } },
      description:
        '查看或修改当前 Agent 的名称、头像和对外简介，修改后对 Web 与所有绑定渠道生效。read 不传修改字段；update 至少提供 name、avatar、description 之一，未提供的字段保持原值，avatar/description 传空字符串可清空。长期人格请用 agent_soul，默认投递目标请用 agent_delivery。',
      name: 'agent_profile',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['action'],
        properties: {
          action: { type: 'string', enum: ['read', 'update'] },
          name: { type: 'string', description: 'Agent 名称，不能为空' },
          avatar: { type: 'string', description: '头像 URL；空字符串清空' },
          description: {
            type: 'string',
            description: '对外简介与职责；空字符串清空',
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
    const action = validateSelfAction(params, { read: [], update: FIELDS })
    const current = await this.service.get(agentId)
    if (!current) throw new Error(`Agent ${agentId} not found`)
    if (action === 'read') return { success: true, profile: profileOf(current) }
    const patch = Object.fromEntries(
      FIELDS.filter((key) => Object.hasOwn(params, key)).map((key) => [
        key,
        params[key],
      ]),
    )
    if (!Object.keys(patch).length)
      throw new Error('update 至少提供 name、avatar、description 之一')
    for (const [key, value] of Object.entries(patch)) {
      if (typeof value !== 'string') throw new Error(`${key} 必须是字符串`)
    }
    const updated = await this.service.update(agentId, patch)
    return {
      success: true,
      profile: profileOf(updated),
      changed: changesOf(current, updated, FIELDS),
      effectiveFrom: 'immediately',
    }
  }
}
