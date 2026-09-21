import crypto from 'node:crypto'

import prismaManager from '../../lib/database/prisma.js'
import { DomainError } from '../../lib/agents/AgentService.js'

export class ChannelRouteResolver {
  constructor({ prisma = null } = {}) {
    this.prisma = prisma
  }

  async _database() {
    if (!this.prisma) this.prisma = await prismaManager.initialize()
    return this.prisma
  }

  _result(binding, route = null) {
    return {
      agentId: binding.agentId,
      bindingId: binding.id,
      channelId: binding.channelId,
      routeId: route?.id || null,
    }
  }

  async resolve({ channelId, explicitAgentId = null, externalConversationId }) {
    if (!channelId || !externalConversationId) {
      throw new DomainError(
        'invalid_channel_envelope',
        'channelId and externalConversationId are required',
        422,
      )
    }
    const prisma = await this._database()
    const route = await prisma.channelRoute.findUnique({
      include: { binding: true },
      where: {
        channelId_externalConversationId: {
          channelId: String(channelId),
          externalConversationId: String(externalConversationId),
        },
      },
    })
    if (route && !explicitAgentId) {
      if (!route.binding.enabled) {
        throw new DomainError(
          'ownership_mismatch',
          'Stored Channel route is invalid or disabled',
          409,
        )
      }
      return this._result(route.binding, route)
    }

    const where = {
      channelId: String(channelId),
      enabled: true,
      ...(explicitAgentId ? { agentId: String(explicitAgentId) } : {}),
    }
    const bindings = await prisma.agentChannelBinding.findMany({ where })
    if (!bindings.length) {
      throw new DomainError(
        'binding_not_found',
        'No enabled Agent binding for this Channel',
        404,
      )
    }
    if (!explicitAgentId && bindings.length !== 1) {
      throw new DomainError(
        'route_required',
        'This Channel is bound to multiple Agents; explicit routing is required',
        409,
        {
          candidates: bindings.map((binding) => ({
            agentId: binding.agentId,
            bindingId: binding.id,
          })),
        },
      )
    }
    const binding = bindings[0]
    const saved = await prisma.channelRoute.upsert({
      create: {
        bindingId: binding.id,
        channelId: String(channelId),
        externalConversationId: String(externalConversationId),
        id: `route_${crypto.randomUUID()}`,
      },
      update: { bindingId: binding.id },
      where: {
        channelId_externalConversationId: {
          channelId: String(channelId),
          externalConversationId: String(externalConversationId),
        },
      },
    })
    return this._result(binding, saved)
  }
}

export default new ChannelRouteResolver()
