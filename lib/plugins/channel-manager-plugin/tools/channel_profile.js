import { MioFunction } from '../../../function.js'
import { MemoryStore } from '../../../../channels/memory/MemoryStore.js'

export default class ChannelProfileTool extends MioFunction {
  constructor() {
    super({
      adminOnly: false,
      description: [
        '管理当前渠道/机器人的自身灵魂设定 (Soul) 与人格人设 (Persona)。',
        '当你与用户的对话中明确提炼出用户对你的称呼、性格、说话语气、专属助理定位等诉求时，你可以调用此工具自主更新或读取自己的灵魂设定，从而永久记住自己的身份定位。',
        '操作支持：read (查看当前灵魂设定), update (更新/设定自己的灵魂), clear (清空重设)。',
      ].join('\n'),
      name: 'channel_profile',
      parameters: {
        properties: {
          action: {
            default: 'read',
            description: '操作类型：read (读取当前灵魂设定), update (设定/更新灵魂设定), clear (清空设定)',
            enum: ['read', 'update', 'clear'],
            type: 'string',
          },
          soul: {
            description: '当 action 为 update 时：要设置的灵魂人格描述文本（包含称呼、性格特点、说话风格、行为准则等）',
            type: 'string',
          },
        },
        required: ['action'],
        type: 'object',
      },
    })
    this.func = this.execute.bind(this)
  }

  async execute(e) {
    const { action, soul } = e.params || {}
    const agentId = e.user?.agentId || e.channel?.agentId || 'wechat-master'
    const memory = e.channel?.memory || new MemoryStore({ agentId })

    try {
      if (action === 'read') {
        const currentSoul = await memory.readSoul()
        return {
          agentId,
          soul: currentSoul || '（尚未设定灵魂）',
          success: true,
        }
      }

      if (action === 'update') {
        if (!soul || !soul.trim()) {
          return { error: '更新灵魂时 soul 字段不能为空', success: false }
        }
        await memory.writeSoul(soul.trim())
        return {
          agentId,
          message: '灵魂设定已成功更新并持久化落盘 ✅',
          soul: soul.trim(),
          success: true,
        }
      }

      if (action === 'clear') {
        await memory.writeSoul('')
        return {
          agentId,
          message: '灵魂设定已清空重置',
          success: true,
        }
      }

      return { error: `未知 action: ${action}`, success: false }
    } catch (err) {
      return { error: err.message, success: false }
    }
  }
}
