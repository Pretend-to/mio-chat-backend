import {
  evaluateToolAccess,
  normalizeToolPolicyName,
  resolveToolAccess,
} from '../chat/llm/toolPolicy.js'

function registeredTools() {
  return global.middleware?.llm?.getAllTools?.() || new Map()
}

function resolveTool(name, tools) {
  const normalized = normalizeToolPolicyName(name)
  for (const [registeredName, tool] of tools.entries()) {
    if (normalizeToolPolicyName(registeredName) === normalized) return tool
  }
  return null
}

function delegatedToolNames(toolNames, context, acceptedDelegation) {
  const tools = registeredTools()
  const result = []
  for (const name of new Set(toolNames.map(String).filter(Boolean))) {
    const tool = resolveTool(name, tools)
    if (!tool) continue
    const decision = evaluateToolAccess(tool, context, 'assign')
    if (!decision.allowed) continue
    if (!acceptedDelegation.includes(resolveToolAccess(tool).delegation)) continue
    result.push(tool.name)
  }
  return result
}

/** Default child snapshot: only tools declaring delegation=inherit. */
export function getBackgroundToolNames(toolNames = [], context = null) {
  return delegatedToolNames(toolNames, context, ['inherit'])
}

/** Explicit jobs[].tools may additionally select delegation=explicit tools. */
export function getAssignableBackgroundToolNames(toolNames = [], context = null) {
  return delegatedToolNames(toolNames, context, ['inherit', 'explicit'])
}

export default {
  getAssignableBackgroundToolNames,
  getBackgroundToolNames,
}
