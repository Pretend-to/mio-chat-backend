export const CHANNEL_TOOL_PLUGINS = [
  'ai-plugin',
  'terminal-pty',
  'file-editor-plugin',
]

function isTaskEvent(event) {
  const evt = event?.event || event
  return evt?.triggerKind === 'task'
}

function isChannelEvent(context) {
  const evt = context?.event || context
  return evt?.source === 'channel'
}

function isGroupEvent(context) {
  const evt = context?.event || context
  return evt?.conversationKind === 'group'
}

/** Return the complete context-visible tool set owned by one plugin. */
export function getPluginToolNames(pluginName, context = null) {
  const plugin = (global.middleware?.plugins || []).find(
    (item) => item?.name === pluginName,
  )
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

/** Return the de-duplicated tools from every plugin pinned to Channel chats. */
export function getChannelToolNames(context = null) {
  const names = []
  for (const pluginName of CHANNEL_TOOL_PLUGINS) {
    for (const toolName of getPluginToolNames(pluginName, context)) {
      if (!names.includes(toolName)) names.push(toolName)
    }
  }
  return names
}

/**
 * Channel chats have one immutable tool policy: the complete ai-plugin,
 * terminal-pty and file-editor-plugin tool sets.
 * Ordinary Web sessions, Task executions and internal/OAI calls retain their
 * own explicit tool settings.
 */
export function applyChannelToolPolicy(event) {
  if (!event || !isChannelEvent(event) || isTaskEvent(event)) return false
  const settings = event.settings || event.body?.settings || {}
  settings.toolCallSettings = {
    mode: 'AUTO',
    tools: getChannelToolNames(event),
  }
  if (event.settings) event.settings = settings
  if (event.body) event.body.settings = settings
  return true
}

export default {
  CHANNEL_TOOL_PLUGINS,
  applyChannelToolPolicy,
  getChannelToolNames,
  getPluginToolNames,
}
