import crypto from 'node:crypto'

import prismaManager from '../database/prisma.js'

export const WEB_CHANNEL_ID = 'web-default'
const SESSION_KINDS = new Set(['conversation', 'subagent', 'task'])

export class DomainError extends Error {
  constructor(code, message, status = 400, details = null) {
    super(message)
    this.name = 'DomainError'
    this.code = code
    this.status = status
    this.details = details
  }
}

const newId = (prefix) => `${prefix}_${crypto.randomUUID()}`
const cleanText = (value, fallback = null) => {
  if (value == null) return fallback
  const text = String(value).trim()
  return text || fallback
}

const publicChannel = (channel) =>
  channel && {
    avatar: channel.avatar,
    id: channel.id,
    name: channel.name,
    status: channel.status,
    type: channel.type,
  }

const publicDeliveryChannel = (binding, defaultDeliveryBindingId) => ({
  channelId: binding.channelId,
  name: binding.channel?.name || binding.channelId,
  type: binding.channel?.type || 'unknown',
  isDefault: binding.id === defaultDeliveryBindingId,
  enabled: binding.enabled !== false,
  outboundEnabled: binding.outboundEnabled !== false,
})

const isWebBinding = (binding) =>
  binding?.channelId === WEB_CHANNEL_ID || binding?.channel?.type === 'web'

export class AgentService {
  constructor({ prisma = null, beforeDelete = null, afterDelete = null } = {}) {
    this.prisma = prisma
    this.beforeDelete = beforeDelete
    this.afterDelete = afterDelete
    this.updateListeners = new Set()
  }

  onUpdated(listener) {
    if (typeof listener !== 'function') return () => {}
    this.updateListeners.add(listener)
    return () => this.updateListeners.delete(listener)
  }

  async _notifyUpdated(agent) {
    for (const listener of this.updateListeners) {
      try {
        await listener(agent)
      } catch (error) {
        console.warn(
          `[AgentService] Agent ${agent?.id || 'unknown'} update listener failed: ${error?.message || error}`,
        )
      }
    }
  }

  async _database() {
    if (!this.prisma) this.prisma = await prismaManager.initialize()
    return this.prisma
  }

  async _ensureWebChannel(tx) {
    return await tx.channel.upsert({
      create: {
        id: WEB_CHANNEL_ID,
        name: 'Web',
        status: 'running',
        type: 'web',
      },
      update: { name: 'Web', status: 'running', type: 'web' },
      where: { id: WEB_CHANNEL_ID },
    })
  }

  _agentInclude() {
    return {
      _count: {
        select: {
          channelBindings: true,
          sessions: true,
          tasks: true,
          triggers: true,
        },
      },
      channelBindings: {
        include: { channel: true },
        orderBy: { createdAt: 'asc' },
      },
    }
  }

  _publicAgent(row) {
    if (!row) return null
    const defaultDeliveryBindingId =
      (row.channelBindings || []).find(
        (binding) =>
          binding.id === row.defaultDeliveryBindingId && !isWebBinding(binding),
      )?.id || null
    return {
      avatar: row.avatar || '',
      bindings: (row.channelBindings || []).map((binding) => ({
        channel: publicChannel(binding.channel),
        channelId: binding.channelId,
        defaultSessionId: binding.defaultSessionId,
        enabled: binding.enabled,
        id: binding.id,
        inboundPolicy: binding.inboundPolicy,
        outboundEnabled: binding.outboundEnabled,
      })),
      counts: row._count
        ? {
            bindings: row._count.channelBindings,
            sessions: row._count.sessions,
            tasks: row._count.tasks,
            triggers: row._count.triggers,
          }
        : undefined,
      createdAt: row.createdAt?.getTime?.() ?? row.createdAt,
      defaultSessionId: row.defaultSessionId,
      defaultDeliveryBindingId,
      deliveryChannels: (row.channelBindings || [])
        .filter((binding) => !isWebBinding(binding))
        .map((binding) =>
          publicDeliveryChannel(binding, defaultDeliveryBindingId),
        ),
      description: row.description || '',
      id: row.id,
      model: row.model || '',
      name: row.name,
      provider: row.provider || '',
      soul: row.soul || '',
      status: row.status,
      updatedAt: row.updatedAt?.getTime?.() ?? row.updatedAt,
    }
  }

  async list() {
    const prisma = await this._database()
    const rows = await prisma.agent.findMany({
      include: this._agentInclude(),
      orderBy: { createdAt: 'asc' },
    })
    return rows.map((row) => this._publicAgent(row))
  }

  async get(agentId) {
    const prisma = await this._database()
    return this._publicAgent(
      await prisma.agent.findUnique({
        include: this._agentInclude(),
        where: { id: String(agentId) },
      }),
    )
  }

  async createWithInitialSession(input = {}) {
    const forbidden = [
      'agentId',
      'id',
      'masterId',
      'userId',
      'botId',
      'sessionId',
      'contactorId',
      'preset',
    ].filter((key) => Object.hasOwn(input, key))
    if (forbidden.length) {
      throw new DomainError(
        'internal_identity_forbidden',
        `Internal identity fields are managed by the server: ${forbidden.join(', ')}`,
        422,
      )
    }
    const name = cleanText(input.name)
    if (!name)
      throw new DomainError('invalid_agent_name', 'Agent name is required', 422)

    const prisma = await this._database()
    const agentId = newId('agent')
    const sessionId = newId('session')
    const requestedChannelIds = Array.isArray(input.channelIds)
      ? input.channelIds.map(String).filter(Boolean)
      : []
    const channelIds = [...new Set([WEB_CHANNEL_ID, ...requestedChannelIds])]

    const result = await prisma.$transaction(async (tx) => {
      await this._ensureWebChannel(tx)
      const channels = await tx.channel.findMany({
        where: { id: { in: channelIds } },
      })
      const found = new Set(channels.map((channel) => channel.id))
      const missing = channelIds.filter((id) => !found.has(id))
      if (missing.length) {
        throw new DomainError(
          'channel_not_found',
          `Channel not found: ${missing.join(', ')}`,
          404,
        )
      }

      const agent = await tx.agent.create({
        data: {
          avatar: cleanText(input.avatar),
          defaultSessionId: sessionId,
          description: cleanText(input.description),
          id: agentId,
          model: cleanText(input.model),
          name,
          provider: cleanText(input.provider),
          soul: input.soul == null ? null : String(input.soul),
          status: 'active',
        },
      })
      const session = await tx.session.create({
        data: {
          agentId,
          id: sessionId,
          kind: 'conversation',
          title: cleanText(input.initialSession?.title, '新对话'),
          visible: true,
        },
      })
      if (Array.isArray(input.tools)) {
        await tx.agentMeta.create({
          data: { agentId, key: 'tools', value: JSON.stringify(input.tools) },
        })
      }
      const bindings = []
      for (const channelId of channelIds) {
        bindings.push(
          await tx.agentChannelBinding.create({
            data: {
              agentId,
              channelId,
              defaultSessionId: sessionId,
              id: newId('binding'),
            },
            include: { channel: true },
          }),
        )
      }
      const requestedDefault = input.defaultDeliveryBindingId
        ? String(input.defaultDeliveryBindingId)
        : input.defaultDeliveryChannelId
          ? bindings.find(
              (binding) =>
                binding.channelId === String(input.defaultDeliveryChannelId),
            )?.id
          : null
      if (
        (input.defaultDeliveryChannelId || input.defaultDeliveryBindingId) &&
        !requestedDefault
      ) {
        throw new DomainError(
          'invalid_default_delivery_binding',
          'Requested default delivery channel is not bound to the Agent',
          422,
        )
      }
      if (requestedDefault) {
        const defaultBinding = bindings.find(
          (binding) => binding.id === requestedDefault,
        )
        if (!defaultBinding || defaultBinding.agentId !== agentId) {
          throw new DomainError(
            'invalid_default_delivery_binding',
            'Default delivery binding must belong to the Agent',
            422,
          )
        }
        if (isWebBinding(defaultBinding)) {
          throw new DomainError(
            'invalid_default_delivery_binding',
            'Web is a session observation surface, not a delivery channel',
            422,
          )
        }
        await tx.agent.update({
          data: { defaultDeliveryBindingId: defaultBinding.id },
          where: { id: agentId },
        })
        agent.defaultDeliveryBindingId = defaultBinding.id
      }
      return { agent, bindings, session }
    })

    return {
      agent: this._publicAgent({
        ...result.agent,
        channelBindings: result.bindings,
      }),
      bindings: result.bindings.map((binding) => ({
        channel: publicChannel(binding.channel),
        channelId: binding.channelId,
        defaultSessionId: binding.defaultSessionId,
        enabled: binding.enabled,
        id: binding.id,
      })),
      initialSession: this._publicSession(result.session),
    }
  }

  async update(agentId, input = {}) {
    const prisma = await this._database()
    const current = await prisma.agent.findUnique({
      where: { id: String(agentId) },
    })
    if (!current)
      throw new DomainError(
        'agent_not_found',
        `Agent ${agentId} not found`,
        404,
      )
    const data = {}
    for (const key of ['avatar', 'description', 'model', 'provider', 'soul']) {
      if (Object.hasOwn(input, key))
        data[key] = input[key] == null ? null : String(input[key])
    }
    if (Object.hasOwn(input, 'name')) {
      const name = cleanText(input.name)
      if (!name)
        throw new DomainError(
          'invalid_agent_name',
          'Agent name is required',
          422,
        )
      data.name = name
    }
    if (Object.hasOwn(input, 'status')) {
      if (!['active', 'disabled'].includes(input.status)) {
        throw new DomainError(
          'invalid_agent_status',
          'Agent status must be active or disabled',
          422,
        )
      }
      data.status = input.status
    }
    if (
      Object.hasOwn(input, 'defaultDeliveryBindingId') ||
      Object.hasOwn(input, 'defaultDeliveryChannelId')
    ) {
      const requestedBindingId = input.defaultDeliveryBindingId
        ? String(input.defaultDeliveryBindingId)
        : input.defaultDeliveryChannelId
          ? (
              await prisma.agentChannelBinding.findUnique({
                where: {
                  agentId_channelId: {
                    agentId: String(agentId),
                    channelId: String(input.defaultDeliveryChannelId),
                  },
                },
              })
            )?.id
          : null
      if (input.defaultDeliveryChannelId && !requestedBindingId) {
        throw new DomainError(
          'invalid_default_delivery_binding',
          'Requested default delivery channel is not bound to the Agent',
          422,
        )
      }
      if (requestedBindingId) {
        const binding = await prisma.agentChannelBinding.findUnique({
          where: { id: requestedBindingId },
          include: { channel: true },
        })
        if (!binding || binding.agentId !== String(agentId)) {
          throw new DomainError(
            'invalid_default_delivery_binding',
            'Default delivery binding must belong to the Agent',
            422,
          )
        }
        if (isWebBinding(binding)) {
          throw new DomainError(
            'invalid_default_delivery_binding',
            'Web is a session observation surface, not a delivery channel',
            422,
          )
        }
      }
      data.defaultDeliveryBindingId = requestedBindingId
    }
    await prisma.$transaction(async (tx) => {
      await tx.agent.update({ data, where: { id: String(agentId) } })
      if (Array.isArray(input.tools)) {
        await tx.agentMeta.upsert({
          create: {
            agentId: String(agentId),
            key: 'tools',
            value: JSON.stringify(input.tools),
          },
          update: { value: JSON.stringify(input.tools) },
          where: { agentId_key: { agentId: String(agentId), key: 'tools' } },
        })
      }
    })
    const updated = await this.get(agentId)
    await this._notifyUpdated(updated)
    return updated
  }

  _publicSession(row) {
    return (
      row && {
        agentId: row.agentId,
        createdAt: row.createdAt?.getTime?.() ?? row.createdAt,
        id: row.id,
        kind: row.kind,
        messageCount: row._count?.messages,
        parentSessionId: row.parentSessionId,
        title: row.title || '',
        updatedAt: row.updatedAt?.getTime?.() ?? row.updatedAt,
        visible: row.visible,
      }
    )
  }

  async listSessions(agentId, { includeChildren = true } = {}) {
    const prisma = await this._database()
    const rows = await prisma.session.findMany({
      include: { _count: { select: { messages: true } } },
      orderBy: { createdAt: 'asc' },
      where: {
        agentId: String(agentId),
        ...(includeChildren ? {} : { parentSessionId: null }),
      },
    })
    return rows.map((row) => this._publicSession(row))
  }

  async createSession(agentId, input = {}) {
    const prisma = await this._database()
    const agent = await prisma.agent.findUnique({
      where: { id: String(agentId) },
    })
    if (!agent)
      throw new DomainError(
        'agent_not_found',
        `Agent ${agentId} not found`,
        404,
      )
    const parentSessionId = input.parentSessionId
      ? String(input.parentSessionId)
      : null
    if (parentSessionId) {
      const parent = await prisma.session.findUnique({
        where: { id: parentSessionId },
      })
      if (!parent || parent.agentId !== String(agentId)) {
        throw new DomainError(
          'invalid_parent_session',
          'Parent session must belong to the same Agent',
          409,
        )
      }
    }
    const kind = input.kind || (parentSessionId ? 'subagent' : 'conversation')
    if (!SESSION_KINDS.has(kind)) {
      throw new DomainError(
        'invalid_session_kind',
        `Unsupported session kind: ${kind}`,
        422,
      )
    }
    const row = await prisma.$transaction(async (tx) => {
      const session = await tx.session.create({
        data: {
          agentId: String(agentId),
          id: newId('session'),
          kind,
          parentSessionId,
          title: cleanText(
            input.title,
            kind === 'subagent' ? '子任务' : '新对话',
          ),
          visible:
            input.visible == null
              ? kind !== 'subagent'
              : Boolean(input.visible),
        },
      })
      if (parentSessionId) {
        const parentLinks = await tx.channelSessionLink.findMany({
          select: { channelConversationId: true },
          where: { sessionId: parentSessionId },
        })
        if (parentLinks.length > 0) {
          await tx.channelSessionLink.createMany({
            data: parentLinks.map((link) => ({
              channelConversationId: link.channelConversationId,
              sessionId: session.id,
            })),
          })
        }
      }
      return session
    })
    return this._publicSession(row)
  }

  async bindChannel(agentId, channelId) {
    const prisma = await this._database()
    const [agent, channel] = await Promise.all([
      prisma.agent.findUnique({ where: { id: String(agentId) } }),
      prisma.channel.findUnique({ where: { id: String(channelId) } }),
    ])
    if (!agent)
      throw new DomainError(
        'agent_not_found',
        `Agent ${agentId} not found`,
        404,
      )
    if (!channel)
      throw new DomainError(
        'channel_not_found',
        `Channel ${channelId} not found`,
        404,
      )
    const defaultSessionId =
      agent.defaultSessionId ||
      (
        await prisma.session.findFirst({
          orderBy: { createdAt: 'asc' },
          where: { agentId: String(agentId), parentSessionId: null },
        })
      )?.id
    if (!defaultSessionId)
      throw new DomainError(
        'session_not_found',
        'Agent has no root session',
        409,
      )
    const binding = await prisma.agentChannelBinding.upsert({
      create: {
        agentId: String(agentId),
        channelId: String(channelId),
        defaultSessionId,
        id: newId('binding'),
      },
      update: { enabled: true },
      where: {
        agentId_channelId: {
          agentId: String(agentId),
          channelId: String(channelId),
        },
      },
      include: { channel: true },
    })
    const currentAgent = await prisma.agent.findUnique({
      where: { id: String(agentId) },
      select: { defaultDeliveryBindingId: true },
    })
    const shouldAutoDefault =
      channel.id !== WEB_CHANNEL_ID &&
      channel.type !== 'web' &&
      binding.enabled !== false &&
      binding.outboundEnabled !== false
    let effectiveDefaultBindingId = currentAgent.defaultDeliveryBindingId
    if (effectiveDefaultBindingId) {
      const currentDefault = await prisma.agentChannelBinding.findUnique({
        where: { id: effectiveDefaultBindingId },
        include: { channel: true },
      })
      if (!currentDefault || isWebBinding(currentDefault)) {
        effectiveDefaultBindingId = null
      }
    }
    if (!effectiveDefaultBindingId && shouldAutoDefault) {
      await prisma.agent.update({
        data: { defaultDeliveryBindingId: binding.id },
        where: { id: String(agentId) },
      })
      effectiveDefaultBindingId = binding.id
    }
    return {
      channel: publicChannel(binding.channel),
      channelId: binding.channelId,
      defaultSessionId: binding.defaultSessionId,
      defaultDeliveryBindingId: effectiveDefaultBindingId,
      enabled: binding.enabled,
      id: binding.id,
      isDefault: binding.id === effectiveDefaultBindingId,
    }
  }

  async unbindChannel(agentId, channelId) {
    const prisma = await this._database()
    const binding = await prisma.agentChannelBinding.findUnique({
      where: {
        agentId_channelId: {
          agentId: String(agentId),
          channelId: String(channelId),
        },
      },
    })
    if (!binding)
      throw new DomainError(
        'binding_not_found',
        'Channel binding not found',
        404,
      )
    if (binding.channelId === WEB_CHANNEL_ID) {
      throw new DomainError(
        'system_binding_required',
        'The default Web binding cannot be removed',
        409,
      )
    }
    const agentDefaultBindingId =
      (
        await prisma.agent.findUnique({
          where: { id: String(agentId) },
          select: { defaultDeliveryBindingId: true },
        })
      )?.defaultDeliveryBindingId || null
    await prisma.$transaction(async (tx) => {
      await tx.agentChannelBinding.delete({ where: { id: binding.id } })
      if (binding.id === agentDefaultBindingId) {
        await tx.agent.update({
          data: { defaultDeliveryBindingId: null },
          where: { id: String(agentId) },
        })
      }
    })
    return {
      deleted: true,
      defaultCleared: binding.id === agentDefaultBindingId,
      id: binding.id,
    }
  }

  async listChannelAgents(channelId) {
    const prisma = await this._database()
    const channel = await prisma.channel.findUnique({
      where: { id: String(channelId) },
    })
    if (!channel)
      throw new DomainError(
        'channel_not_found',
        `Channel ${channelId} not found`,
        404,
      )
    const bindings = await prisma.agentChannelBinding.findMany({
      include: { agent: true },
      orderBy: { createdAt: 'asc' },
      where: { channelId: String(channelId) },
    })
    return bindings.map((binding) => ({
      agent: this._publicAgent(binding.agent),
      agentId: binding.agentId,
      defaultSessionId: binding.defaultSessionId,
      enabled: binding.enabled,
      id: binding.id,
    }))
  }

  async listChannelRoutes(channelId) {
    const prisma = await this._database()
    return await prisma.channelRoute.findMany({
      include: { binding: { include: { agent: true } } },
      orderBy: { updatedAt: 'desc' },
      where: { channelId: String(channelId) },
    })
  }

  async assignChannelRoute(
    channelId,
    externalConversationId,
    { agentId } = {},
  ) {
    const prisma = await this._database()
    const binding = await prisma.agentChannelBinding.findUnique({
      where: {
        agentId_channelId: {
          agentId: String(agentId),
          channelId: String(channelId),
        },
      },
    })
    if (!binding?.enabled)
      throw new DomainError(
        'binding_not_found',
        'Enabled Agent/Channel binding not found',
        404,
      )
    return await prisma.channelRoute.upsert({
      create: {
        channelId: String(channelId),
        externalConversationId: String(externalConversationId),
        bindingId: binding.id,
        id: newId('route'),
      },
      update: { bindingId: binding.id },
      where: {
        channelId_externalConversationId: {
          channelId: String(channelId),
          externalConversationId: String(externalConversationId),
        },
      },
    })
  }

  async previewDelete(agentId) {
    const prisma = await this._database()
    const id = String(agentId)
    const agent = await prisma.agent.findUnique({ where: { id } })
    if (!agent)
      throw new DomainError('agent_not_found', `Agent ${id} not found`, 404)
    const [sessions, messages, bindings, routes, tasks, triggers] =
      await Promise.all([
        prisma.session.count({ where: { agentId: id } }),
        prisma.message.count({ where: { session: { agentId: id } } }),
        prisma.agentChannelBinding.count({ where: { agentId: id } }),
        prisma.channelRoute.count({ where: { binding: { agentId: id } } }),
        prisma.task.count({ where: { agentId: id } }),
        prisma.trigger.count({ where: { agentId: id } }),
      ])
    return {
      agentId: id,
      bindings,
      messages,
      routes,
      sessions,
      tasks,
      triggers,
    }
  }

  async delete(agentId) {
    const id = String(agentId)
    const preview = await this.previewDelete(id)
    if (this.beforeDelete) await this.beforeDelete(id, preview)
    const prisma = await this._database()
    await prisma.agent.delete({ where: { id } })
    if (this.afterDelete) await this.afterDelete(id, preview)
    return { deleted: true, ...preview }
  }

  async deleteSession(
    agentId,
    sessionId,
    { cascadeDependencies = false } = {},
  ) {
    const prisma = await this._database()
    const session = await prisma.session.findUnique({
      where: { id: String(sessionId) },
    })
    if (!session || session.agentId !== String(agentId)) {
      throw new DomainError(
        'session_not_found',
        `Session ${sessionId} not found for Agent ${agentId}`,
        404,
      )
    }
    const allSessions = await prisma.session.findMany({
      select: { id: true, parentSessionId: true },
      where: { agentId: String(agentId) },
    })
    const subtree = new Set([String(sessionId)])
    let changed = true
    while (changed) {
      changed = false
      for (const candidate of allSessions) {
        if (
          candidate.parentSessionId &&
          subtree.has(candidate.parentSessionId) &&
          !subtree.has(candidate.id)
        ) {
          subtree.add(candidate.id)
          changed = true
        }
      }
    }
    const sessionIds = [...subtree]
    const [tasks, triggers, activeSubAgentRuns] = await Promise.all([
      prisma.task.count({ where: { sessionId: { in: sessionIds } } }),
      prisma.trigger.count({ where: { sessionId: { in: sessionIds } } }),
      prisma.subAgentRun.count({
        where: {
          sessionId: { in: sessionIds },
          status: { in: ['queued', 'running', 'waiting_tool', 'interrupted'] },
        },
      }),
    ])
    if (activeSubAgentRuns) {
      throw new DomainError(
        'session_has_active_subagent_runs',
        'Session has active SubAgent runs; cancel them before deletion',
        409,
        { activeSubAgentRuns },
      )
    }
    if (!cascadeDependencies && (tasks || triggers)) {
      throw new DomainError(
        'session_has_dependencies',
        'Session has scheduled task or trigger dependencies',
        409,
        { tasks, triggers },
      )
    }
    await prisma.$transaction(async (tx) => {
      await tx.agentChannelBinding.updateMany({
        data: { defaultSessionId: null },
        where: {
          agentId: String(agentId),
          defaultSessionId: { in: sessionIds },
        },
      })
      if (
        subtree.has(
          (await tx.agent.findUnique({ where: { id: String(agentId) } }))
            ?.defaultSessionId,
        )
      ) {
        await tx.agent.update({
          data: { defaultSessionId: null },
          where: { id: String(agentId) },
        })
      }
      await tx.session.delete({ where: { id: String(sessionId) } })
    })
    return { deleted: true, sessionId: String(sessionId) }
  }
}

export default new AgentService()
