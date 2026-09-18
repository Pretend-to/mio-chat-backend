export const AGENT_TOOL_PLUGINS = [
  'ai-plugin',
  'agent-manager-plugin',
  'terminal-pty',
  'file-editor-plugin',
]

const ALL_EXPOSURES = ['schema', 'meta']
const ALL_TRIGGER_KINDS = ['interactive', 'task', 'system']
const ALL_CONVERSATION_KINDS = ['direct', 'group', 'none']
const ALL_SESSION_KINDS = ['conversation', 'subagent', 'none']
const DELEGATION_RANK = { deny: 2, explicit: 1, inherit: 0 }

const DEFAULT_ACCESS = Object.freeze({
  delegation: 'inherit',
  exposure: ALL_EXPOSURES,
  requires: Object.freeze({ admin: false, agentContext: false }),
  scene: Object.freeze({
    conversationKinds: ALL_CONVERSATION_KINDS,
    sessionKinds: ALL_SESSION_KINDS,
    triggerKinds: ALL_TRIGGER_KINDS,
  }),
})

function isTaskEvent(event) {
  const evt = event?.event || event
  return evt?.triggerKind === 'task'
}

function uniqueKnown(values, allowed, fallback) {
  if (!Array.isArray(values)) return [...fallback]
  return [...new Set(values.filter((value) => allowed.includes(value)))]
}

function intersect(left, right) {
  return left.filter((value) => right.includes(value))
}

function normalizeDeclaredAccess(access = {}) {
  const scene = access?.scene || {}
  return {
    delegation: Object.hasOwn(DELEGATION_RANK, access?.delegation)
      ? access.delegation
      : DEFAULT_ACCESS.delegation,
    exposure: uniqueKnown(
      access?.exposure,
      ALL_EXPOSURES,
      DEFAULT_ACCESS.exposure,
    ),
    requires: {
      admin: access?.requires?.admin === true,
      agentContext: access?.requires?.agentContext === true,
    },
    scene: {
      conversationKinds: uniqueKnown(
        scene.conversationKinds,
        ALL_CONVERSATION_KINDS,
        DEFAULT_ACCESS.scene.conversationKinds,
      ),
      sessionKinds: uniqueKnown(
        scene.sessionKinds,
        ALL_SESSION_KINDS,
        DEFAULT_ACCESS.scene.sessionKinds,
      ),
      triggerKinds: uniqueKnown(
        scene.triggerKinds,
        ALL_TRIGGER_KINDS,
        DEFAULT_ACCESS.scene.triggerKinds,
      ),
    },
  }
}

function narrowAccess(parent, child) {
  return {
    delegation:
      DELEGATION_RANK[child.delegation] > DELEGATION_RANK[parent.delegation]
        ? child.delegation
        : parent.delegation,
    exposure: intersect(parent.exposure, child.exposure),
    requires: {
      admin: parent.requires.admin || child.requires.admin,
      agentContext:
        parent.requires.agentContext || child.requires.agentContext,
    },
    scene: {
      conversationKinds: intersect(
        parent.scene.conversationKinds,
        child.scene.conversationKinds,
      ),
      sessionKinds: intersect(
        parent.scene.sessionKinds,
        child.scene.sessionKinds,
      ),
      triggerKinds: intersect(
        parent.scene.triggerKinds,
        child.scene.triggerKinds,
      ),
    },
  }
}

function canonicalTransportSource(source) {
  if (['web', 'channel', 'proxy', 'internal'].includes(source)) return source
  if (['scheduled_task', 'trigger', 'subagent', 'system'].includes(source)) {
    return 'internal'
  }
  return 'web'
}

/**
 * Tool visibility follows the owning session model, not the ingress message.
 * A server Agent may receive turns from Web, Channel, cron or a wake-up; all
 * of those turns still belong to the same Agent context. A frontend OpenAI
 * session has no persisted Agent ownership and must not see Agent tools.
 */
function resolveSessionOrigin({ rawSource, agentId, sessionId }) {
  if (agentId && sessionId) return 'agent'
  if (rawSource === 'web') return 'web_session'
  return 'none'
}

/** Convert ChatEvent/tool-event/HTTP projection context into one policy shape. */
export function normalizeToolAccessContext(context = null) {
  const wrapper = context && typeof context === 'object' ? context : {}
  const event = wrapper.event || wrapper.parentEvent || wrapper
  const principal =
    wrapper.principal || event?.principal || wrapper.user || event?.user || {}
  const rawSource = event?.source || wrapper.source || 'web'
  const agentId = event?.agentId || wrapper.agentId || null
  const sessionId =
    event?.sessionId || event?.body?.sessionId || wrapper.sessionId || null
  const subagentRunId =
    event?.subagentRunId || wrapper.subagentRunId || null
  const sessionKind =
    event?.sessionKind ||
    wrapper.sessionKind ||
    (subagentRunId ? 'subagent' : agentId && sessionId ? 'conversation' : 'none')
  const triggerKind =
    event?.triggerKind ||
    wrapper.triggerKind ||
    'interactive'
  const transportSource = canonicalTransportSource(rawSource)

  return {
    agentId,
    conversationKind:
      event?.conversationKind || wrapper.conversationKind || 'none',
    isAdmin:
      principal?.isAdmin === true ||
      principal?.role === 'admin' ||
      principal?.role === 'system_admin',
    principal,
    sessionId,
    sessionKind,
    sessionOrigin: resolveSessionOrigin({
      agentId,
      rawSource,
      sessionId,
    }),
    subagentRunId,
    // Transport is retained for routing/audit diagnostics only. It is not a
    // Tool Schema or Tool Call authorization dimension.
    transportSource,
    toolAllowlist: getEventToolAllowlist(event),
    triggerKind,
  }
}

/** Resolve plugin defaults, tool declarations and legacy flags into one policy. */
export function resolveToolAccess(tool) {
  const pluginAccess =
    tool?.parentPlugin?.access || tool?.parentPlugin?.metaData?.access || null
  let policy = normalizeDeclaredAccess(DEFAULT_ACCESS)
  if (pluginAccess) {
    policy = narrowAccess(policy, normalizeDeclaredAccess(pluginAccess))
  }
  if (tool?.access) {
    policy = narrowAccess(policy, normalizeDeclaredAccess(tool.access))
  }

  return policy
}

/**
 * The single authorization decision used by discovery, schema projection,
 * MetaTool, delegation and execution. Catalog deliberately ignores a
 * conversation's current tool allowlist; all model-bound operations do not.
 */
export function evaluateToolAccess(tool, context = null, operation = 'execute') {
  const policy = resolveToolAccess(tool)
  const accessContext = normalizeToolAccessContext(context)
  const deny = (reason) => ({
    allowed: false,
    context: accessContext,
    policy,
    reason,
  })

  if (!tool?.name) return deny('invalid_tool')
  if (tool.parentPlugin?.enabled === false) return deny('plugin_disabled')

  const exposure =
    operation === 'meta' || operation === 'meta_call'
      ? 'meta'
      : ['catalog', 'discover', 'schema'].includes(operation)
        ? 'schema'
        : null
  if (exposure && !policy.exposure.includes(exposure)) {
    return deny('not_exposed')
  }
  if (!policy.scene.triggerKinds.includes(accessContext.triggerKind)) {
    return deny('trigger_not_allowed')
  }
  if (
    !policy.scene.conversationKinds.includes(accessContext.conversationKind)
  ) {
    return deny('conversation_not_allowed')
  }
  if (!policy.scene.sessionKinds.includes(accessContext.sessionKind)) {
    return deny('session_not_allowed')
  }
  if (policy.requires.admin && !accessContext.isAdmin) {
    return deny('admin_required')
  }
  if (
    policy.requires.agentContext &&
    !(accessContext.agentId && accessContext.sessionId)
  ) {
    return deny('agent_context_required')
  }
  if (operation === 'assign' && policy.delegation === 'deny') {
    return deny('delegation_denied')
  }
  if (
    operation !== 'catalog' &&
    operation !== 'debug' &&
    operation !== 'meta' &&
    accessContext.toolAllowlist &&
    !isToolAllowed(eventForAllowlist(context), tool)
  ) {
    const isMetaBridged =
      operation === 'meta_call' ||
      context?.isMetaCall === true ||
      context?.event?.isMetaCall === true
    const metaAllowed =
      isMetaBridged &&
      isToolAllowed(eventForAllowlist(context), 'meta_tool') &&
      policy.exposure.includes('meta')

    if (!metaAllowed) {
      return deny('not_in_allowlist')
    }
  }

  return { allowed: true, context: accessContext, policy, reason: null }
}

function eventForAllowlist(context) {
  return context?.event || context?.parentEvent || context
}

export function normalizeToolPolicyName(name) {
  return String(name || '')
    .split('_mid_')[0]
    .toLowerCase()
}

export function getEventToolAllowlist(context) {
  const evt = context?.event || context
  const settings = evt?.settings || evt?.body?.settings
  const tools = settings?.toolCallSettings?.tools
  return Array.isArray(tools) ? tools : null
}

export function isToolAllowed(context, toolOrName) {
  const allowlist = getEventToolAllowlist(context)
  if (!allowlist) return true
  const name = normalizeToolPolicyName(
    typeof toolOrName === 'string' ? toolOrName : toolOrName?.name,
  )
  return allowlist.some((tool) => normalizeToolPolicyName(tool) === name)
}

/** Return the complete context-visible tool set owned by one plugin. */
export function getPluginToolNames(pluginName, context = null) {
  const plugin = (global.middleware?.plugins || []).find(
    (item) => item?.name === pluginName,
  )
  if (!plugin || typeof plugin.getTools !== 'function') return []

  const names = []
  for (const tools of plugin.getTools().values()) {
    for (const tool of tools) {
      if (!tool?.name) continue
      if (!evaluateToolAccess(tool, context, 'catalog').allowed) continue
      if (!names.includes(tool.name)) names.push(tool.name)
    }
  }
  return names
}

/** Return the de-duplicated tools from every plugin pinned to Agent sessions. */
export function getAgentToolNames(context = null) {
  const names = []
  for (const pluginName of AGENT_TOOL_PLUGINS) {
    for (const toolName of getPluginToolNames(pluginName, context)) {
      if (!names.includes(toolName)) names.push(toolName)
    }
  }
  return names
}

/**
 * Agent sessions have one immutable core tool policy. The Agent manager owns
 * profile/model/session operations; a delivery transport is only an output
 * port. Frontend OpenAI sessions without Agent ownership retain their own
 * explicit tool settings.
 */
export function applyAgentToolPolicy(event) {
  const context = normalizeToolAccessContext(event)
  if (
    !context.agentId ||
    !context.sessionId ||
    isTaskEvent(event) ||
    event?.subagentRunId
  ) {
    return false
  }
  const settings = event.settings || event.body?.settings || {}
  settings.toolCallSettings = {
    mode: 'AUTO',
    tools: getAgentToolNames(event),
  }
  if (event.settings) event.settings = settings
  if (event.body) event.body.settings = settings
  return true
}

export default {
  AGENT_TOOL_PLUGINS,
  applyAgentToolPolicy,
  evaluateToolAccess,
  getAgentToolNames,
  getEventToolAllowlist,
  getPluginToolNames,
  isToolAllowed,
  normalizeToolAccessContext,
  normalizeToolPolicyName,
  resolveToolAccess,
}
