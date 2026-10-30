import { MioFunction } from '../../../function.js'
import agentService from '../../../agents/AgentService.js'
import { requireAgentId } from '../context.js'
import { validateSelfAction } from '../lib/selfManagement.js'

const deliveryOf = (agent) => ({
  channelId:
    agent.defaultDeliveryChannelId ||
    agent.deliveryChannels?.find((channel) => channel.isDefault)?.channelId ||
    null,
  policy: agent.defaultDeliveryPolicy || 'auto',
  channels: agent.deliveryChannels || [],
})

export default class AgentDeliveryTool extends MioFunction {
  constructor({ service = agentService } = {}) {
    super({
      access: { requires: { admin: true, agentContext: true } },
      name: 'agent_delivery',
      description:
        '查看或设置当前 Agent 后台任务、自主唤起的默认结果投递渠道。read=列出已绑定的非 Web 渠道和当前默认；set=用公开 channelId 指定；clear=显式清空并停止自动选择；reset=恢复自动选择最早绑定的可投递非 Web 渠道，无外部渠道时为空。默认选择不随临时离线切换。定时任务通常省略投递参数使用默认，session_only 只写入会话；Web 是观察面，不是投递目标。',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['action'],
        properties: {
          action: { type: 'string', enum: ['read', 'set', 'clear', 'reset'] },
          channelId: {
            type: 'string',
            description: 'set 必填，必须来自 read 返回的已绑定非 Web 渠道',
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
      set: ['channelId'],
      clear: [],
      reset: [],
    })
    const current = await this.service.get(agentId)
    if (!current) throw new Error(`Agent ${agentId} not found`)
    if (action === 'read')
      return { success: true, delivery: deliveryOf(current) }
    if (
      action === 'set' &&
      (typeof params.channelId !== 'string' || !params.channelId.trim())
    ) {
      throw new Error('set 必须提供非空 channelId；请先 read 查看已绑定渠道')
    }
    const updated = await this.service.update(
      agentId,
      action === 'reset'
        ? { defaultDeliveryPolicy: 'auto' }
        : {
            defaultDeliveryChannelId:
              action === 'clear' ? null : params.channelId,
          },
    )
    return {
      success: true,
      delivery: deliveryOf(updated),
      changed: {
        before: deliveryOf(current).channelId,
        after: deliveryOf(updated).channelId,
      },
      effectiveFrom: 'next_delivery',
    }
  }
}
