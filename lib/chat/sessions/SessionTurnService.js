import { BaseChannel } from '../../../channels/common/BaseChannel.js'
import { createBackendLlm } from '../../../channels/llm.js'
import { createSessionPersistence } from '../persistence/createSessionPersistence.js'
import prismaManager from '../../database/prisma.js'
import {
  getSessionWorkCoordinator,
  SessionWorkCoordinator,
} from './SessionWorkCoordinator.js'
import { getChatEventDispatcher } from '../llm/events/ChatEventDispatcher.js'

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
    sessionWorkCoordinator = null,
    dispatcher = null,
  } = {}) {
    this.prisma = prisma
    this.sessionWorkCoordinator =
      sessionWorkCoordinator ||
      (prisma
        ? prisma.sessionWorkLease
          ? new SessionWorkCoordinator({ prisma })
          : null
        : getSessionWorkCoordinator())
    this.dispatcher = dispatcher || getChatEventDispatcher()
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

  async runTurn(options = {}) {
    const { agentId, sessionId, sessionLease = null } = options
    if (sessionLease || !this.sessionWorkCoordinator) {
      return await this._runTurnUnlocked(options)
    }
    return await this.sessionWorkCoordinator.withSessionLease(
      { agentId, sessionId },
      async ({ sessionLease: acquiredLease }) =>
        await this._runTurnUnlocked({
          ...options,
          sessionLease: acquiredLease,
        }),
    )
  }

  async _runTurnUnlocked({
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
        deliveryBindingId: binding?.id || requestedBindingId || null,
        deliveryMode: effectiveDeliveryMode,
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

  /** Run one durable wake item under the shared per-Session write lease. */
  async runWorkItem(workItem) {
    if (!workItem?.id || !workItem.agentId || !workItem.sessionId) {
      throw new TypeError('runWorkItem requires a persisted SessionWorkItem')
    }
    if (['completed', 'failed', 'needs_attention'].includes(workItem.status)) {
      return { workItem, status: workItem.status }
    }

    const coordinator =
      this.sessionWorkCoordinator || getSessionWorkCoordinator()
    const dispatcher = this.dispatcher
    return await coordinator.withSessionLease(
      {
        agentId: workItem.agentId,
        sessionId: workItem.sessionId,
      },
      async ({ sessionLease }) => {
        const current = await dispatcher.getWorkItem(workItem.id)
        if (
          !current ||
          ['completed', 'failed', 'needs_attention'].includes(current.status)
        ) {
          return { workItem: current || workItem, status: current?.status }
        }
        await dispatcher.markWorkItemStatus(current.id, 'running')

        let principal = null
        try {
          principal = current.principalJson
            ? JSON.parse(current.principalJson)
            : null
        } catch {
          principal = null
        }
        const wakeKinds = [current.wakeKind, current.kind]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase())
        const source = wakeKinds.some((value) => value.startsWith('trigger'))
          ? 'trigger'
          : wakeKinds.some((value) => value.startsWith('cron'))
            ? 'scheduled_task'
            : wakeKinds.some(
                  (value) =>
                    value === 'subagent' || value.includes('subagent_done'),
                )
              ? 'subagent'
              : 'system'

        try {
          const result = await this._runTurnUnlocked({
            agentId: current.agentId,
            deliveryBindingId: current.deliveryBindingId,
            deliveryMode: current.deliveryMode,
            eventId: current.eventId,
            idempotencyKey: current.idempotencyKey,
            instruction: current.instruction,
            isTask: true,
            isWake: true,
            kind: current.kind,
            originRef: current.originRef,
            principal,
            sessionId: current.sessionId,
            sessionLease,
            source,
            text: current.instruction,
            wakeKind: current.wakeKind,
            userMessageId: `msg_u_work_${current.eventId}`,
            messageId: `msg_a_work_${current.eventId}`,
            workItemId: current.id,
          })
          await sessionLease.assertLease()
          if (result.reply?.aborted) {
            const needsAttention = await dispatcher.markWorkItemStatus(
              current.id,
              'needs_attention',
              {
                error:
                  'The wake was aborted after execution began; review Session history before retrying.',
              },
            )
            return { ...result, workItem: needsAttention }
          }
          const assistantMessageId = `msg_a_work_${current.eventId}`
          const assistantText = await this._readAssistantText({
            agentId: current.agentId,
            messageId: assistantMessageId,
            sessionId: current.sessionId,
          })
          const completed = await dispatcher.markWorkItemStatus(
            current.id,
            'completed',
            {
              completion: {
                assistantMessageId,
                assistantText,
                deliveryBindingId: result.deliveryBindingId,
                deliveryStatus: result.deliveryStatus,
                executionKind: 'standalone',
              },
            },
          )
          return { ...result, workItem: completed }
        } catch (error) {
          if (
            error?.code === 'session_busy' ||
            error?.code === 'session_lease_lost'
          ) {
            await dispatcher.markWorkItemStatus(current.id, 'deferred', {
              availableAt: new Date(Date.now() + 1000),
              error: error?.message || String(error),
            })
          } else {
            await dispatcher.markWorkItemStatus(current.id, 'failed', {
              error: error?.message || String(error),
            })
          }
          throw error
        }
      },
    )
  }

  async _readAssistantText({ agentId, messageId, sessionId }) {
    try {
      const memory = this.headless.get(String(agentId))?.memory
      const session = await memory?.getSession(sessionId)
      const message = (session?.chat || []).find(
        (item) => String(item.id) === String(messageId),
      )
      if (message?.text) return String(message.text)
      const content = Array.isArray(message?.content) ? message.content : []
      return content
        .filter((item) => item?.type === 'text')
        .map((item) => item?.data?.text || item?.text || '')
        .filter(Boolean)
        .join('\n')
    } catch {
      return ''
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
