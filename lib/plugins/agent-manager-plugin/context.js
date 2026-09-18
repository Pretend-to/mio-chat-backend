export function requireAgentId(event = {}) {
  const agentId = event.agentId
  if (!agentId) {
    throw new Error(
      'Agent management tools require an explicit Agent execution context',
    )
  }
  return String(agentId)
}
