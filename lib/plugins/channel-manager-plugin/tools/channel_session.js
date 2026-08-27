import { MioFunction } from '../../../function.js'
import { MemoryStore } from '../../../../channels/memory/MemoryStore.js'

export default class ChannelSessionTool extends MioFunction {
  constructor() {
    super({
      adminOnly: false,
      description: [
        '管理当前渠道的对话会话（Sessions）与上下文。',
        '当用户需要开启新话题、列出过去的会话历史、切换至某个特定会话、或者清空当前会话记忆时调用此工具。',
        '支持 action：list (列出所有会话), create (新建会话), switch (切换当前会话), clear (清空当前会话上下文), delete (删除会话)。',
      ].join('\n'),
      name: 'channel_session',
      parameters: {
        properties: {
          action: {
            default: 'list',
            description: '操作类型：list (列出历史会话), create (新建会话), switch (切换会话), clear (清空当前会话聊天), delete (删除会话)',
            enum: ['list', 'create', 'switch', 'clear', 'delete'],
            type: 'string',
          },
          sessionId: {
            description: '当 action 为 switch 或 delete 时：目标会话的 ID',
            type: 'string',
          },
          title: {
            description: '当 action 为 create 时：新会话的标题',
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
    const { action, sessionId, title } = e.params || {}
    const agentId = e.user?.agentId || e.channel?.agentId || 'wechat-master'
    const memory = e.channel?.memory || new MemoryStore({ agentId })

    try {
      if (action === 'list') {
        const list = await memory.listSessions()
        const active = await memory.getActiveSession()
        return {
          activeSessionId: active,
          sessions: list,
          success: true,
        }
      }

      if (action === 'create') {
        const s = await memory.createSession({ title: title || '新会话' })
        await memory.setActiveSession(s.id)
        return {
          activeSessionId: s.id,
          message: `已成功新建并切换到会话「${s.title}」(${s.id})`,
          session: s,
          success: true,
        }
      }

      if (action === 'switch') {
        if (!sessionId) return { error: 'switch 操作缺少 sessionId 参数', success: false }
        const s = await memory.getSession(sessionId)
        if (!s) return { error: `会话 ${sessionId} 不存在`, success: false }
        await memory.setActiveSession(s.id)
        return {
          activeSessionId: s.id,
          message: `已切换到会话「${s.title || ''}」(${s.id})`,
          success: true,
        }
      }

      if (action === 'clear') {
        const active = await memory.getActiveSession()
        if (!active) return { error: '当前无激活会话', success: false }
        await memory.clearChat(active)
        return {
          clearedSessionId: active,
          message: `已清空会话 ${active} 的聊天记录（结晶记忆保留）`,
          success: true,
        }
      }

      if (action === 'delete') {
        if (!sessionId) return { error: 'delete 操作缺少 sessionId 参数', success: false }
        await memory.deleteSession(sessionId)
        return {
          deletedSessionId: sessionId,
          message: `已删除会话 ${sessionId}`,
          success: true,
        }
      }

      return { error: `未知 action: ${action}`, success: false }
    } catch (err) {
      return { error: err.message, success: false }
    }
  }
}
