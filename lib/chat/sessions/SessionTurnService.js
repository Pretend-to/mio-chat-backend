import { BaseChannel } from '../../../channels/common/BaseChannel.js'
import { createBackendLlm } from '../../../channels/llm.js'
import { createSessionPersistence } from '../persistence/createSessionPersistence.js'
import prismaManager from '../../database/prisma.js'

const TRUSTED_RUNTIME_SOURCES = new Set([
  'internal',
  'scheduled_task',
  'subagent',
  'system',
  'trigger',
])

const isWebBinding = (binding) =>
  binding?.channelId === 'web-default' || binding?.channel?.type === 'web'

class HeadlessSessionChannel extends BaseChannel {
  constructor(options) {
    super({
      ...options,
      channelId: `agent:${options.memory.agentId}`,
      channelType: 'session',
      client: {
        botId: 'system',
        getConfig: async () => null,
        sendMessage: async () => null,
      },
      masterId: 'system',
      outboundEnabled: false,
      typing: false,
    })
  }

  async _loop() {}
  buildSendMsg({ text } = {}) {
    return { text }
  }
  async doSendMessage() {
    return null
  }
  async doSendImage() {
    return null
  }
  async doSendFile() {
    return null
  }
  async doSendVideo() {
    return null
  }
  async doSendVoice() {
    return null
  }
}

/** Execute an Agent turn against an exact Session, independently of Channel state. */
export class SessionTurnService {
  constructor({
    prisma = null,
    llm = null,
    channelRuntime = null,
    persistenceFactory = createSessionPersistence,
  } = {}) {
    this.prisma = prisma
    if (llm && typeof llm.process !== 'function') {
      throw new TypeError('[SessionTurnService] llm must expose process()')
    }
    this.llm = llm || createBackendLlm()
    this.channelRuntime = channelRuntime
    this.persistenceFactory = persistenceFactory
    this.headless = new Map()
  }

  async _database() {
    if (!this.prisma) this.prisma = await prismaManager.initialize()
    return this.prisma
  }

  async _target({
    agentId,
    sessionId,
    deliveryBindingId = null,
    deliveryMode = 'default',
  }) {
    if (!agentId || !sessionId)
      throw new Error('agentId and sessionId are required')
    const prisma = await this._database()
    const [agent, session] = await Promise.all([
      prisma.agent.findUnique({ where: { id: String(agentId) } }),
      prisma.session.findUnique({ where: { id: String(sessionId) } }),
    ])
    if (!agent) throw new Error(`Agent ${agentId} not found`)
    if (!session || session.agentId !== agent.id) {
      throw new Error(
        `Session ${sessionId} does not belong to Agent ${agentId}`,
      )
    }
    // An omitted target follows the Agent's default delivery binding. Keep the
    // explicit-vs-default distinction so an explicitly removed binding is
    // reported as needs_rebind instead of silently switching destinations.
    const explicitBindingId = deliveryBindingId || null
    const usingAgentDefault = deliveryMode === 'default' && !explicitBindingId
    let requestedBindingId =
      deliveryMode === 'session_only'
        ? null
        : deliveryMode === 'channel'
          ? explicitBindingId
          : explicitBindingId || agent.defaultDeliveryBindingId || null
    let binding = requestedBindingId
      ? await prisma.agentChannelBinding?.findUnique?.({
          where: { id: String(requestedBindingId) },
          include: { channel: true },
        })
      : null
    if (binding && binding.agentId !== agent.id) {
      throw new Error(
        `Delivery binding ${requestedBindingId} does not belong to Agent ${agentId}`,
      )
    }
    if (isWebBinding(binding)) {
      binding = null
      // A legacy Agent may still point at the system Web binding. Treat that
      // pointer as no external default; an explicitly selected Web target is
      // still a requested but invalid destination and becomes needs_rebind.
      if (usingAgentDefault) requestedBindingId = null
    }
    return {
      agent,
      binding,
      bindingRequested:
        deliveryMode === 'channel' || Boolean(requestedBindingId),
      bindingMissing:
        (deliveryMode === 'channel' || Boolean(requestedBindingId)) && !binding,
      session,
      requestedBindingId,
    }
  }

  async _headlessChannel(agent) {
    let context = this.headless.get(agent.id)
    if (!context) {
      const memory = await this.persistenceFactory({
        agentId: agent.id,
        mode: 'database',
        prisma: await this._database(),
      })
      await memory.ensure()
      context = {
        chn: new HeadlessSessionChannel({
          llm: this.llm,
          memory,
          model: agent.model || null,
          provider: agent.provider || null,
        }),
        memory,
      }
      this.headless.set(agent.id, context)
    }
    context.chn.model = agent.model || null
    context.chn.provider = agent.provider || null
    return context.chn
  }

  async runTurn({
    agentId,
    sessionId,
    text,
    deliveryBindingId = null,
    deliveryMode = null,
    source = 'system',
    ...flags
  }) {
    const effectiveDeliveryMode =
      deliveryMode || (source === 'web' ? 'session_only' : 'default')
    const {
      agent,
      binding,
      bindingMissing,
      bindingRequested,
      requestedBindingId,
    } = await this._target({
      agentId,
      deliveryBindingId,
      deliveryMode: effectiveDeliveryMode,
      sessionId,
    })
    let outputPort = null
    if (binding && this.channelRuntime?.running) {
      outputPort =
        this.channelRuntime.running
          .get(binding.channelId)
          ?.agents?.get(binding.id)?.chn || null
    }
    const deliveryRequested = bindingRequested
    const deliveryEnabled = Boolean(
      binding?.enabled !== false && binding?.outboundEnabled !== false,
    )
    const deliveryAvailable = Boolean(outputPort && deliveryEnabled)
    const executor = await this._headlessChannel(agent)
    const defaultPrincipal =
      flags.principal ||
      (TRUSTED_RUNTIME_SOURCES.has(source)
        ? {
            externalUserId: `${source}-runtime`,
            id: `system:${source}`,
            isAdmin: true,
            role: 'system_admin',
          }
        : null)
    const isWeb =
      typeof flags.isWeb === 'boolean'
        ? flags.isWeb
        : source === 'web' && !deliveryAvailable
    const reply = await executor.appendUserMessage(
      sessionId,
      String(text || ''),
      {
        ...flags,
        agentId: agent.id,
        allowSlashCommands: source === 'web',
        bindingId: binding?.id || null,
        // Agent is the conversation identity. The bound Channel is delivery-only.
        channelId: agent.id,
        deliveryChannelId: binding?.channelId || null,
        contextToken: deliveryAvailable
          ? outputPort.latestContextToken || null
          : null,
        from: deliveryAvailable ? outputPort.masterId : 'system',
        isWeb,
        // Per-turn output delegation avoids storing a mutable delivery target on
        // the shared Agent executor. Disabled/offline bindings intentionally get
        // no output port, but the turn still executes and persists headlessly.
        outputPort: deliveryAvailable ? outputPort : null,
        principal: defaultPrincipal,
        sessionId,
        source,
      },
    )
    const deliveryStatus = bindingMissing
      ? 'needs_rebind'
      : deliveryRequested
        ? !deliveryEnabled
          ? 'disabled'
          : deliveryAvailable
            ? 'delivered'
            : 'unavailable'
        : 'not_requested'
    return {
      deliveryBindingId: binding?.id || requestedBindingId || null,
      deliveryStatus,
      reply,
    }
  }

  async getMemory(agentId) {
    const prisma = await this._database()
    const agent = await prisma.agent.findUnique({
      where: { id: String(agentId) },
    })
    if (!agent) throw new Error(`Agent ${agentId} not found`)
    const memory = await this.persistenceFactory({
      agentId: agent.id,
      mode: 'database',
      prisma,
    })
    await memory.ensure()
    return memory
  }

  async abort({ agentId, sessionId }) {
    const context = this.headless.get(String(agentId))
    const job = context?.chn?.activeJobs?.get(String(sessionId))
    if (!job) return false
    job._abortLlm?.()
    context.chn.activeJobs.delete(String(sessionId))
    return true
  }

  async disposeAgent(agentId) {
    const context = this.headless.get(String(agentId))
    if (context) await context.chn.stop()
    this.headless.delete(String(agentId))
  }
}

export default SessionTurnService
