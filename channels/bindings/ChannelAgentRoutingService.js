import prismaManager from '../../lib/database/prisma.js'
import { DomainError } from '../../lib/agents/AgentService.js'

const normalizeSelector = (value) =>
  String(value || '')
    .trim()
    .toLocaleLowerCase()

const selectTarget = (targets, selector) => {
  const needle = normalizeSelector(selector)
  if (!needle) {
    throw new DomainError(
      'route_target_required',
      'Agent id or name is required',
      422,
    )
  }
  const exactId = targets.filter(
    (target) => normalizeSelector(target.id) === needle,
  )
  if (exactId.length === 1) return exactId[0]

  const exactName = targets.filter(
    (target) => normalizeSelector(target.name) === needle,
  )
  if (exactName.length === 1) return exactName[0]
  if (exactName.length > 1) {
    throw new DomainError(
      'route_target_ambiguous',
      `More than one target is named ${selector}`,
      409,
    )
  }

  const prefixes = targets.filter((target) =>
    normalizeSelector(target.id).startsWith(needle),
  )
  if (prefixes.length === 1) return prefixes[0]
  if (prefixes.length > 1) {
    throw new DomainError(
      'route_target_ambiguous',
      `Target prefix ${selector} is ambiguous`,
      409,
    )
  }
  throw new DomainError(
    'route_target_not_found',
    `Agent target ${selector} is not available in this Channel`,
    404,
  )
}

/** Channel-scoped Agent and SubAgent routing controls. */
export class ChannelAgentRoutingService {
  constructor({ prisma = null, conversationService, routeResolver } = {}) {
    this.prisma = prisma
    this.conversationService = conversationService
    this.routeResolver = routeResolver
  }

  async _database() {
    if (!this.prisma) this.prisma = await prismaManager.initialize()
    return this.prisma
  }

  scope(envelope) {
    return {
      current: () => this.current(envelope),
      list: () => this.list(envelope),
      use: (selector) => this.use(envelope, selector),
    }
  }

  async _snapshot(envelope) {
    const prisma = await this._database()
    const channelId = envelope.source.channelId
    const externalConversationId = envelope.conversation.externalConversationId
    const [bindings, route, conversations] = await Promise.all([
      prisma.agentChannelBinding.findMany({
        include: { agent: true },
        orderBy: { createdAt: 'asc' },
        where: { channelId, enabled: true },
      }),
      prisma.channelRoute.findUnique({
        where: {
          channelId_externalConversationId: {
            channelId,
            externalConversationId,
          },
        },
      }),
      prisma.channelConversation.findMany({
        include: {
          activeSession: true,
          sessions: {
            include: {
              session: {
                include: {
                  subAgentRuns: {
                    orderBy: { createdAt: 'desc' },
                    select: { status: true },
                    take: 1,
                  },
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        where: { channelId, externalConversationId },
      }),
    ])
    const conversationByAgent = new Map(
      conversations.map((item) => [item.agentId, item]),
    )
    const targets = []
    for (const binding of bindings) {
      const conversation = conversationByAgent.get(binding.agentId) || null
      targets.push({
        active: route?.bindingId === binding.id,
        agentId: binding.agentId,
        bindingId: binding.id,
        id: binding.agentId,
        name: binding.agent.name,
        sessionId: conversation?.activeSessionId || null,
        type: 'agent',
      })
      for (const link of conversation?.sessions || []) {
        if (link.session.kind !== 'subagent') continue
        const runStatus = link.session.subAgentRuns?.[0]?.status || null
        const switchable =
          !runStatus ||
          [
            'blocked',
            'cancelled',
            'expired',
            'failed',
            'result_ready',
          ].includes(runStatus)
        targets.push({
          active:
            route?.bindingId === binding.id &&
            conversation.activeSessionId === link.sessionId,
          agentId: binding.agentId,
          bindingId: binding.id,
          id: link.sessionId,
          name: link.session.title || '子任务',
          parentSessionId: link.session.parentSessionId,
          runStatus,
          sessionId: link.sessionId,
          switchable,
          type: 'subagent',
        })
      }
    }
    return { bindings, route, targets }
  }

  async list(envelope) {
    return (await this._snapshot(envelope)).targets
  }

  async current(envelope) {
    const { route, targets } = await this._snapshot(envelope)
    if (!route) return null
    const activeSubAgent = targets.find(
      (target) => target.type === 'subagent' && target.active,
    )
    return (
      activeSubAgent ||
      targets.find((target) => target.type === 'agent' && target.active) ||
      null
    )
  }

  async use(envelope, selector) {
    const snapshot = await this._snapshot(envelope)
    const target = selectTarget(snapshot.targets, selector)
    if (target.type === 'subagent' && target.switchable === false) {
      throw new DomainError(
        'subagent_session_busy',
        'Running SubAgent sessions are read-only and cannot receive ordinary chat input',
        409,
        { runStatus: target.runStatus },
      )
    }
    const resolved = await this.conversationService.resolve({
      agentId: target.agentId,
      channelId: envelope.source.channelId,
      envelope,
    })
    if (target.type === 'subagent') {
      await this.conversationService.activate(
        resolved.conversation.id,
        target.agentId,
        target.sessionId,
      )
    }
    await this.routeResolver.resolve({
      channelId: envelope.source.channelId,
      explicitAgentId: target.agentId,
      externalConversationId: envelope.conversation.externalConversationId,
    })
    return {
      ...target,
      sessionId:
        target.type === 'subagent' ? target.sessionId : resolved.sessionId,
    }
  }
}

export default ChannelAgentRoutingService
