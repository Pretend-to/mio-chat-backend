export const DEFAULT_DELIVERY_POLICY_KEY = 'default_delivery_policy'

export const defaultDeliveryInclude = () => ({
  metas: { where: { key: DEFAULT_DELIVERY_POLICY_KEY } },
  channelBindings: {
    include: { channel: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
})

export function getDefaultDeliveryPolicy(agent) {
  const value = agent?.metas?.find(
    (meta) => meta.key === DEFAULT_DELIVERY_POLICY_KEY,
  )?.value
  if (value === '"none"') return 'none'
  if (value === '"auto"') return 'auto'
  if (value === '"manual"') return 'manual'
  // Preserve an existing configured destination; legacy empty defaults adopt
  // the automatic policy without a data migration.
  return agent?.defaultDeliveryBindingId ? 'manual' : 'auto'
}

export function isExternalDeliveryBinding(binding) {
  return Boolean(
    binding &&
    binding.channelId !== 'web-default' &&
    binding.channel?.type !== 'web' &&
    binding.enabled !== false &&
    binding.outboundEnabled !== false,
  )
}

const time = (value) => (value == null ? 0 : new Date(value).getTime())

export function selectDefaultDeliveryBinding(
  agent,
  bindings = agent?.channelBindings || [],
) {
  if (getDefaultDeliveryPolicy(agent) === 'none') return null
  const candidates = bindings.filter(
    (binding) =>
      binding.agentId === agent.id && isExternalDeliveryBinding(binding),
  )
  const explicit = candidates.find(
    (binding) => binding.id === agent.defaultDeliveryBindingId,
  )
  if (explicit && getDefaultDeliveryPolicy(agent) === 'manual') return explicit
  return (
    candidates.toSorted(
      (a, b) =>
        time(a.createdAt) - time(b.createdAt) ||
        time(a.channel?.createdAt) - time(b.channel?.createdAt) ||
        String(a.id).localeCompare(String(b.id)),
    )[0] || null
  )
}

/** Shared by task creation, wake compatibility and actual execution. No online
 * status fallback: a temporary disconnect must not change the destination.
 */
export async function getDefaultDeliveryBinding(agentId, { prisma }) {
  const agent = await prisma.agent.findUnique({
    where: { id: String(agentId) },
    include: defaultDeliveryInclude(),
  })
  if (!agent) return null
  return selectDefaultDeliveryBinding(agent)
}
