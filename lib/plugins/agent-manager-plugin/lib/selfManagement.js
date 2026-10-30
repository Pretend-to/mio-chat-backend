export function validateSelfAction(params, fieldsByAction) {
  const action = params?.action
  if (!Object.hasOwn(fieldsByAction, action || '')) {
    throw new Error(
      `action 必须是 ${Object.keys(fieldsByAction).join('、')} 之一`,
    )
  }
  const allowed = new Set(['action', ...fieldsByAction[action]])
  const unexpected = Object.keys(params).filter((key) => !allowed.has(key))
  if (unexpected.length)
    throw new Error(`${action} 不接受字段：${unexpected.join('、')}`)
  return action
}

export function profileOf(agent) {
  return {
    id: agent.id,
    name: agent.name,
    avatar: agent.avatar || '',
    description: agent.description || '',
  }
}

export function changesOf(before, after, fields) {
  return Object.fromEntries(
    fields
      .filter((key) => before[key] !== after[key])
      .map((key) => [
        key,
        { before: before[key] ?? '', after: after[key] ?? '' },
      ]),
  )
}
