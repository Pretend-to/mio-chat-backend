export const CHANNEL_TOOL_PLUGIN = 'ai-plugin'

function isTaskEvent(event) {
  return event?.metaData?.isTask === true ||
    event?.metaData?.triggerType === 'task'
}

function isChannelEvent(context) {
  return Boolean(
    context?.channel ||
    context?.body?.channel ||
    context?.user?.channel ||
    context?.user?.channelType ||
    context?.user?.role === 'channel_master',
  )
}

function isGroupEvent(context) {
  return Boolean(
    context?.isGroup ||
    context?.platform === 'group' ||
    context?.metaData?.memberId ||
    context?.body?.metaData?.memberId ||
    context?.body?.memberId ||
    context?.channel?.isGroup ||
    context?.user?.isGroup,
  )
}

/** Return the complete context-visible tool set owned by one plugin. */
export function getPluginToolNames(pluginName, context = null) {
  const plugin = (global.middleware?.plugins || [])
    .find(item => item?.name === pluginName)
  if (!plugin || typeof plugin.getTools !== 'function') return []

  const channel = isChannelEvent(context)
  const group = isGroupEvent(context)
  const names = []
  for (const tools of plugin.getTools().values()) {
    for (const tool of tools) {
      if (!tool?.name) continue
      if (tool.channelOnly && !channel) continue
      if (tool.groupOnly && !group) continue
      if (!names.includes(tool.name)) names.push(tool.name)
    }
  }
  return names
}

/**
 * Channel chats have one immutable tool policy: the complete ai-plugin.
 * Ordinary Web sessions, Task executions and internal/OAI calls retain their
 * own explicit tool settings.
 */
export function applyChannelToolPolicy(event) {
  if (!event?.body || !isChannelEvent(event) || isTaskEvent(event)) return false
  event.body.settings ??= {}
  event.body.settings.toolCallSettings = {
    mode: 'AUTO',
    tools: getPluginToolNames(CHANNEL_TOOL_PLUGIN, event),
  }
  return true
}

export default {
  CHANNEL_TOOL_PLUGIN,
  applyChannelToolPolicy,
  getPluginToolNames,
}
