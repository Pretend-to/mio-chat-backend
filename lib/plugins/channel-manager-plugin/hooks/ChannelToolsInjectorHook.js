import { HOOK_POINTS } from '../../../hooks/types.js'
import BaseHook from '../../../hooks/BaseHook.js'

/**
 * 渠道默认工具与自治工具动态注入 Hook
 *
 * 针对渠道端（如微信等）对话：
 * 1. 默认自动装配开通核心插件工具：
 *    - ai-plugin: memory, search, draw, vision, parse, cron, toolsmanager
 *    - skill-plugin: Skill, reload_skills
 *    - terminal-pty: bash, bash_input, read_screen, wait, shell_policy
 *    - channel-manager-plugin: channel_profile, channel_session, channel_model
 * 2. 兼容 LLM 通过 toolsmanager 动态开启/关闭任何工具与插件组。
 */
export default class ChannelToolsInjectorHook extends BaseHook {
  constructor() {
    super('channel:tools-injector')
  }

  getPriority() {
    return 80
  }

  async [HOOK_POINTS.LLM_BEFORE_RECURSION](ctx) {
    const { event, body, round } = ctx
    if (!event || !body) return

    // 判断是否来源于渠道（微信等）
    const isChannelRequest = Boolean(
      event.channel ||
      event.user?.channel ||
      event.body?.channel ||
      event.user?.channelType === 'wechat' ||
      event.user?.role === 'channel_master' ||
      (typeof event.requestId === 'string' && event.requestId.startsWith('wechat_'))
    )

    if (!isChannelRequest) return

    if (!body.settings) body.settings = {}
    if (!body.settings.toolCallSettings) {
      body.settings.toolCallSettings = { mode: 'AUTO', tools: [] }
    } else {
      body.settings.toolCallSettings.mode = 'AUTO'
      if (!Array.isArray(body.settings.toolCallSettings.tools)) {
        body.settings.toolCallSettings.tools = []
      }
    }

    const currentTools = body.settings.toolCallSettings.tools

    // 第一轮递归时，注入渠道默认开通的工具（ai-plugin, skill-plugin, terminal-pty, channel-manager）
    if (round === 1) {
      const defaultChannelTools = [
        // ai-plugin
        'memory', 'search', 'draw', 'vision', 'parse', 'cron', 'toolsmanager',
        // skill-plugin
        'Skill', 'reload_skills',
        // terminal-pty
        'bash', 'bash_input', 'read_screen', 'wait', 'shell_policy',
        // channel-manager-plugin
        'channel_profile', 'channel_session', 'channel_model',
      ]

      for (const t of defaultChannelTools) {
        if (!currentTools.includes(t)) {
          currentTools.push(t)
        }
      }
    } else {
      // 保证 channel 自治管理工具始终可用
      const mandatoryChannelTools = ['channel_profile', 'channel_session', 'channel_model', 'toolsmanager']
      for (const t of mandatoryChannelTools) {
        if (!currentTools.includes(t)) {
          currentTools.push(t)
        }
      }
    }
  }
}
