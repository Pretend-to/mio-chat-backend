import { BaseChannel } from '../../../channels/common/BaseChannel.js'
import { createBackendLlm } from '../../../channels/llm.js'
import { createSessionPersistence } from '../persistence/createSessionPersistence.js'
import prismaManager from '../../database/prisma.js'

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
      typing: false,
    })
  }

  async _loop() {}
  buildSendMsg({ text } = {}) { return { text } }
  async doSendMessage() { return null }
  async doSendImage() { return null }
  async doSendFile() { return null }
  async doSendVideo() { return null }
  async doSendVoice() { return null }
}

/** Execute an Agent turn against an exact Session, independently of Channel state. */
export class SessionTurnService {
  constructor({ prisma = null, llm = null, channelRuntime = null, persistenceFactory = createSessionPersistence } = {}) {
    this.prisma = prisma
    this.llm = llm || createBackendLlm()
    this.channelRuntime = channelRuntime
    this.persistenceFactory = persistenceFactory
    this.headless = new Map()
  }

  async _database() {
    if (!this.prisma) this.prisma = await prismaManager.initialize()
    return this.prisma
  }

  async _target({ agentId, sessionId, deliveryBindingId = null }) {
    if (!agentId || !sessionId) throw new Error('agentId and sessionId are required')
    const prisma = await this._database()
    const [agent, session, binding] = await Promise.all([
      prisma.agent.findUnique({ where: { id: String(agentId) } }),
      prisma.session.findUnique({ where: { id: String(sessionId) } }),
      deliveryBindingId
        ? prisma.agentChannelBinding.findUnique({ where: { id: String(deliveryBindingId) } })
        : null,
    ])
    if (!agent) throw new Error(`Agent ${agentId} not found`)
    if (!session || session.agentId !== agent.id) {
      throw new Error(`Session ${sessionId} does not belong to Agent ${agentId}`)
    }
    if (deliveryBindingId && (!binding || binding.agentId !== agent.id || !binding.enabled)) {
      throw new Error(`Delivery binding ${deliveryBindingId} is not enabled for Agent ${agentId}`)
    }
    return { agent, binding, session }
  }

  async _headlessChannel(agent) {
    let context = this.headless.get(agent.id)
    if (!context) {
      const memory = await this.persistenceFactory({ agentId: agent.id, mode: 'database', prisma: await this._database() })
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

  async runTurn({ agentId, sessionId, text, deliveryBindingId = null, source = 'system', ...flags }) {
    const { agent, binding } = await this._target({ agentId, sessionId, deliveryBindingId })
    let chn = null
    if (binding && this.channelRuntime?.running) {
      chn = this.channelRuntime.running.get(binding.channelId)?.agents?.get(binding.id)?.chn || null
    }
    const deliveryRequested = Boolean(binding)
    const deliveryAvailable = Boolean(chn && binding.outboundEnabled)
    chn ||= await this._headlessChannel(agent)
    const reply = await chn.appendUserMessage(sessionId, String(text || ''), {
      agentId: agent.id,
      allowSlashCommands: source === 'web',
      bindingId: binding?.id || null,
      // Agent is the conversation identity. The bound Channel is delivery-only.
      channelId: agent.id,
      deliveryChannelId: binding?.channelId || null,
      from: deliveryAvailable ? chn.masterId : 'system',
      isWeb: !deliveryAvailable,
      sessionId,
      source,
      ...flags,
    })
    return {
      deliveryStatus: deliveryRequested ? (deliveryAvailable ? 'delivered' : 'unavailable') : 'not_requested',
      reply,
    }
  }

  async getMemory(agentId) {
    const prisma = await this._database()
    const agent = await prisma.agent.findUnique({ where: { id: String(agentId) } })
    if (!agent) throw new Error(`Agent ${agentId} not found`)
    const memory = await this.persistenceFactory({ agentId: agent.id, mode: 'database', prisma })
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
