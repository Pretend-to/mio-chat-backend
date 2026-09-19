import prismaManager from '../../database/prisma.js'

export const DELIVERY_MODES = Object.freeze({
  DEFAULT: 'default',
  CHANNEL: 'channel',
  SESSION_ONLY: 'session_only',
})

const MODE_SET = new Set(Object.values(DELIVERY_MODES))
const isWebChannel = (channel) =>
  channel?.id === 'web-default' || channel?.type === 'web'

export function normalizeDeliveryMode(
  value,
  fallback = DELIVERY_MODES.DEFAULT,
) {
  const mode = value == null || value === '' ? fallback : String(value)
  if (!MODE_SET.has(mode)) {
    throw new Error(`deliveryMode must be one of: ${[...MODE_SET].join(', ')}`)
  }
  return mode
}

function currentBindingId(event) {
  return (
    event?.bindingId ||
    event?.channelBindingId ||
    event?.body?.bindingId ||
    event?.channel?.bindingId ||
    null
  )
}

/**
 * Resolve a public delivery channel selection to an AgentChannelBinding.
 * Adapter/model code never needs to know the internal binding primary key.
 */
export async function resolveDeliveryBinding({
  agentId,
  deliveryBindingId = null,
  deliveryChannelId = null,
  deliveryMode = DELIVERY_MODES.DEFAULT,
  event = null,
  prisma = null,
} = {}) {
  if (!agentId) throw new Error('agentId is required to resolve delivery')
  const db = prisma || (await prismaManager.initialize())
  const mode = normalizeDeliveryMode(deliveryMode)
  const agent = await db.agent.findUnique({ where: { id: String(agentId) } })
  if (!agent) throw new Error(`Agent ${agentId} not found`)
  if (mode === DELIVERY_MODES.SESSION_ONLY) {
    return { agent, binding: null, deliveryChannelId: null, deliveryMode: mode }
  }

  let binding = null
  if (mode === DELIVERY_MODES.CHANNEL) {
    if (deliveryBindingId && !deliveryChannelId) {
      binding = await db.agentChannelBinding.findUnique({
        where: { id: String(deliveryBindingId) },
        include: { channel: true },
      })
      if (!binding || binding.agentId !== String(agentId)) {
        throw new Error(
          `Delivery binding ${deliveryBindingId} is not owned by Agent ${agentId}`,
        )
      }
      if (isWebChannel(binding?.channel)) {
        throw new Error(
          'Web is a session observation surface, not a delivery channel',
        )
      }
    } else {
      if (!deliveryChannelId) {
        throw new Error(
          'deliveryChannelId is required when deliveryMode=channel',
        )
      }
      binding = await db.agentChannelBinding.findUnique({
        where: {
          agentId_channelId: {
            agentId: String(agentId),
            channelId: String(deliveryChannelId),
          },
        },
        include: { channel: true },
      })
      if (!binding) {
        throw new Error(
          `Channel ${deliveryChannelId} is not bound to Agent ${agentId}`,
        )
      }
      if (isWebChannel(binding.channel)) {
        throw new Error(
          'Web is a session observation surface, not a delivery channel',
        )
      }
    }
  } else {
    const inheritedId = currentBindingId(event)
    if (inheritedId) {
      binding = await db.agentChannelBinding.findUnique({
        where: { id: String(inheritedId) },
        include: { channel: true },
      })
      if (binding?.agentId !== String(agentId)) binding = null
      if (isWebChannel(binding?.channel)) binding = null
    }
    if (!binding && agent.defaultDeliveryBindingId) {
      binding = await db.agentChannelBinding.findUnique({
        where: { id: String(agent.defaultDeliveryBindingId) },
        include: { channel: true },
      })
      if (binding?.agentId !== String(agentId)) binding = null
      if (isWebChannel(binding?.channel)) binding = null
    }
    // Older Agents predate defaultDeliveryBindingId. Preserve their default
    // behavior only when exactly one enabled, outbound, non-Web binding is
    // available; multiple candidates remain intentionally ambiguous.
    if (!binding) {
      const candidates = (
        await db.agentChannelBinding.findMany({
          include: { channel: true },
          where: {
            agentId: String(agentId),
            enabled: true,
            outboundEnabled: true,
          },
        })
      ).filter((candidate) => !isWebChannel(candidate.channel))
      if (candidates.length === 1) binding = candidates[0]
    }
  }

  return {
    agent,
    binding,
    deliveryChannelId: binding?.channelId || null,
    deliveryMode: mode,
  }
}

export async function listDeliveryChannels(agentId, { prisma = null } = {}) {
  const db = prisma || (await prismaManager.initialize())
  const agent = await db.agent.findUnique({
    where: { id: String(agentId) },
    select: { defaultDeliveryBindingId: true },
  })
  if (!agent) throw new Error(`Agent ${agentId} not found`)
  const bindings = await db.agentChannelBinding.findMany({
    include: { channel: true },
    orderBy: { createdAt: 'asc' },
    where: { agentId: String(agentId) },
  })
  return bindings
    .filter((binding) => !isWebChannel(binding.channel))
    .map((binding) => ({
      channelId: binding.channelId,
      name: binding.channel?.name || binding.channelId,
      type: binding.channel?.type || 'unknown',
      isDefault: binding.id === agent.defaultDeliveryBindingId,
      enabled: binding.enabled !== false,
      outboundEnabled: binding.outboundEnabled !== false,
    }))
}

export default {
  DELIVERY_MODES,
  listDeliveryChannels,
  normalizeDeliveryMode,
  resolveDeliveryBinding,
}
