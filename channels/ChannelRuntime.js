import { createSessionPersistence } from '../lib/chat/persistence/createSessionPersistence.js'
import { createBackendLlm } from './llm.js'
import { IlinkClient } from './wechat/IlinkClient.js'
import { WechatChannel } from './wechat/WechatChannel.js'
import {
  isNativeIlinkChannel,
  isOneBotsChannel,
  resolveChannelAdapter,
  resolveOneBotsPlatform,
} from './ChannelAdapterRegistry.js'
import prismaManager from '../lib/database/prisma.js'
import { ChannelAgentRoutingService } from './bindings/ChannelAgentRoutingService.js'
import { ChannelConversationService } from './bindings/ChannelConversationService.js'
import { ChannelIdentityService } from './bindings/ChannelIdentityService.js'
import { ChannelRouteResolver } from './bindings/ChannelRouteResolver.js'
import logger from '../utils/logger.js'

/**
 * ChannelRuntime — 渠道运行时管理器（M6 后端）
 *
 * 职责：把「已绑定的渠道配置」挂载到对应运行时，并统一管理启/停 / 运行态。
 *       微信 iLink 默认使用 MioChat 原生实现；OneBots 运行时保留但不再承载 iLink。
 * 解耦：llm 可注入（默认 createBackendLlm）；client 可注入（测试用 mock）。
 */
export class ChannelRuntime {
  /**
   * @param {object} opts
   * @param {import('./ChannelStore.js').ChannelStore} opts.channelStore 渠道配置存储
   * @param {object} [opts.llm]  llmProcessor（默认 createBackendLlm）
   * @param {string} [opts.memoryBase] memory 根目录（默认 'memory'）
   * @param {(channel)=>object} [opts.clientFactory] 自定义 client 工厂（测试注入 mock）
   * @param {object} [opts.onebotsGateway] OneBots 网关（可注入，默认按需加载）
   * @param {(options)=>object|Promise<object>} [opts.onebotChannelFactory] OneBotChannel 工厂
   * @param {object} [opts.logger] 日志器（默认系统全局 logger）
   */
  constructor({
    channelStore,
    clientFactory,
    onebotsGateway = null,
    onebotChannelFactory = null,
    llm,
    memoryBase = 'memory',
    persistenceFactory = createSessionPersistence,
    persistenceMode = process.env.MIO_CHANNEL_PERSISTENCE_MODE || 'database',
    prisma = null,
    bindingResolver = null,
    routeResolver = null,
    conversationService = null,
    agentRoutingService = null,
    identityService = null,
    logger: customLogger = null,
  } = {}) {
    if (!channelStore) throw new Error('ChannelRuntime requires channelStore')
    this.channelStore = channelStore
    this.logger = customLogger || logger
    this.llm = llm || createBackendLlm()
    this.memoryBase = memoryBase
    this.clientFactory = clientFactory
    this.onebotsGateway = onebotsGateway
    this.onebotChannelFactory = onebotChannelFactory
    this._onebotsInitialized = false
    this.persistenceFactory = persistenceFactory
    this.persistenceMode = persistenceMode
    this.prisma = prisma
    this.bindingResolver = bindingResolver
    this.routeResolver = routeResolver || new ChannelRouteResolver({ prisma })
    this.conversationService =
      conversationService || new ChannelConversationService({ prisma })
    this.agentRoutingService =
      agentRoutingService ||
      new ChannelAgentRoutingService({
        conversationService: this.conversationService,
        prisma,
        routeResolver: this.routeResolver,
      })
    this.identityService =
      identityService || new ChannelIdentityService({ prisma })
    this.running = new Map() // channelId -> { channel, chn, agents, gateway }
  }

  /** OneBots 渠道判定；历史 `wechat` 类型也统一由 OneBots 接管。 */
  static isOneBotsChannel(channel) {
    return isOneBotsChannel(channel)
  }

  isOneBotsChannel(channel) {
    return ChannelRuntime.isOneBotsChannel(channel)
  }

  static isNativeIlinkChannel(channel) {
    return isNativeIlinkChannel(channel)
  }

  isNativeIlinkChannel(channel) {
    return ChannelRuntime.isNativeIlinkChannel(channel)
  }

  /**
   * Resolve the optional gateway only when a OneBots channel is actually used.
   * This keeps installations without OneBots (and the legacy iLink path) lazy.
   */
  async getOnebotsGateway({ initialize = false } = {}) {
    if (!this.onebotsGateway) {
      const mod = await import('./onebots/OneBotsGateway.js')
      const Gateway = mod.OneBotsGateway || mod.default
      if (typeof Gateway === 'function')
        this.onebotsGateway = new Gateway({ logger: this.logger })
      else if (Gateway) this.onebotsGateway = Gateway
    }
    if (!this.onebotsGateway) {
      throw new Error('OneBots gateway is not available')
    }
    if (initialize && !this._onebotsInitialized) {
      if (typeof this.onebotsGateway.init === 'function') {
        await this.onebotsGateway.init()
      }
      this._onebotsInitialized = true
    }
    return this.onebotsGateway
  }

  async getOnebotChannelFactory() {
    if (this.onebotChannelFactory) return this.onebotChannelFactory
    const mod = await import('./onebots/OneBotChannel.js')
    const OneBotChannel = mod.OneBotChannel || mod.default
    if (typeof OneBotChannel !== 'function') {
      throw new Error('OneBotChannel is not available')
    }
    this.onebotChannelFactory = (options) => new OneBotChannel(options)
    return this.onebotChannelFactory
  }

  /** Migrate persisted iLink accounts, then restore all supported channels. */
  async init() {
    const channels =
      typeof this.channelStore.listInternal === 'function'
        ? await this.channelStore.listInternal()
        : []
    const onebots = channels.filter((channel) => this.isOneBotsChannel(channel))
    if (onebots.length > 0) await this.getOnebotsGateway({ initialize: true })

    const supported = channels.filter(
      (channel) =>
        this.isNativeIlinkChannel(channel) || this.isOneBotsChannel(channel),
    )
    for (const channel of supported) {
      const bound = this.isNativeIlinkChannel(channel)
        ? Boolean(channel.token && channel.userId)
        : Boolean(channel.userId || channel.botId)
      if (channel.status !== 'running' || !bound) continue
      try {
        await this.start(channel.id)
      } catch (error) {
        this.logger.warn?.(
          `[ChannelRuntime] 渠道 "${channel.id}" 恢复失败: ${error.message}`,
        )
        await this.channelStore.update(channel.id, { status: 'stopped' })
      }
    }
    return this
  }

  async dispose() {
    // 进程退出时的停止：只停轮询与 OneBots 账号，不把 status 落库。
    // 否则“被动停止”会被写成 stopped，下次启动 init() 不会恢复该渠道。
    await this.stopAll({ persistStatus: false })
    if (
      this.onebotsGateway &&
      typeof this.onebotsGateway.dispose === 'function'
    ) {
      await this.onebotsGateway.dispose()
    }
    this._onebotsInitialized = false
  }

  async createMemory(agentId, { recover = false } = {}) {
    const memory = await this.persistenceFactory({
      agentId,
      baseDir: this.memoryBase,
      mode: this.persistenceMode,
      prisma: this.prisma,
    })
    await memory.ensure()
    if (recover) {
      const recovered = await memory.recoverInterruptedMessages()
      if (recovered > 0) {
        console.warn(
          `[ChannelRuntime] recovered ${recovered} interrupted message(s) for ${agentId}`,
        )
      }
    }
    return memory
  }

  async _database() {
    if (!this.prisma) this.prisma = await prismaManager.initialize()
    return this.prisma
  }

  async _loadBindings(channelId) {
    if (this.bindingResolver) return await this.bindingResolver(channelId)
    const prisma = await this._database()
    return await prisma.agentChannelBinding.findMany({
      include: { agent: true },
      orderBy: { createdAt: 'asc' },
      where: { channelId: String(channelId), enabled: true },
    })
  }

  async broadcastConfigUpdate(channel) {
    try {
      const { default: sessions } =
        await import('../lib/server/socket.io/services/sessions.js')
      const publicChannel =
        typeof this.channelStore.getPublic === 'function'
          ? await this.channelStore.getPublic(channel.id)
          : channel
      for (const client of sessions.getAllAdminClients() || []) {
        client.sendSystemMessage?.('channel_config_updated', {
          channel: publicChannel,
        })
      }
    } catch (error) {
      this.logger.warn?.(`[ChannelRuntime] 渠道配置广播失败: ${error.message}`)
    }
  }

  /** 持久化渠道配置并同步当前运行实例。 */
  async updateConfig(channelId, patch, { broadcast = true } = {}) {
    const updated = await this.channelStore.update(channelId, patch)
    if (!updated) return null
    const entry = this.running.get(channelId)
    if (entry) {
      Object.assign(entry.channel, patch)
      Object.assign(entry.chn, patch)
    }
    if (broadcast) await this.broadcastConfigUpdate(updated)
    return updated
  }

  /** 启动一个已绑定渠道 */
  async start(channelId) {
    let channel = await this.channelStore.get(channelId)
    if (!channel) throw new Error(`channel ${channelId} not found`)
    const adapterDefinition = resolveChannelAdapter(channel)
    const onebots = this.isOneBotsChannel(channel)
    const nativeIlink = this.isNativeIlinkChannel(channel)
    if (!onebots && !nativeIlink) {
      throw new Error(`unsupported channel type: ${channel.type || 'unknown'}`)
    }
    if (
      nativeIlink
        ? !channel.token || !channel.userId
        : !channel.userId && !channel.botId
    ) {
      throw new Error(`channel ${channelId} not bound`)
    }
    if (this.running.has(channelId)) return this.running.get(channelId).chn

    const bindings = await this._loadBindings(channelId)
    const platform = onebots ? resolveOneBotsPlatform(channel) : 'weixin-ilink'
    if (onebots && !platform) {
      throw new Error(
        `channel adapter has no OneBots platform: ${channel.type || 'unknown'}`,
      )
    }
    this.logger.info?.(
      `[ChannelRuntime] 🚀 正在启动渠道 "${channelId}" (type=${channel.type}, driver=${onebots ? 'onebots' : 'native'}, platform=${platform}, masterId=${channel.userId || channel.botId})`,
    )
    let client
    let gateway = null
    try {
      if (onebots) {
        gateway = await this.getOnebotsGateway({ initialize: true })
        await gateway.startAccount(channel, adapterDefinition)
        if (typeof gateway.createClient !== 'function') {
          throw new Error(
            'OneBots gateway does not provide createClient(channel)',
          )
        }
        client = await gateway.createClient(channel)
      } else {
        client = this.clientFactory
          ? await this.clientFactory(channel)
          : new IlinkClient().setAuth({
              botId: channel.botId,
              token: channel.token,
              userId: channel.userId,
            })
      }
      const factory = onebots
        ? this.onebotChannelFactory || (await this.getOnebotChannelFactory())
        : adapterDefinition?.createChannel ||
          ((options) => new WechatChannel(options))
      const agents = new Map()
      let routeTargetResolver = null
      let transportContext = null
      for (const binding of bindings) {
        const memory = await this.createMemory(binding.agentId, {
          recover: true,
        })
        const chn = await factory({
          adapterDefinition,
          channel,
          channelId,
          client,
          gateway,
          id: channelId,
          llm: this.llm,
          logger: this.logger,
          masterId: channel.userId || channel.botId || channelId,
          memory,
          model: binding.agent?.model || null,
          onActivity: () => {
            this.channelStore
              .update(channelId, { lastActive: Date.now() })
              .catch(() => {})
          },
          onConfigUpdate: async (patch) => {
            const prisma = await this._database()
            const agent = await prisma.agent.update({
              data: {
                ...(Object.hasOwn(patch, 'model')
                  ? { model: patch.model || null }
                  : {}),
                ...(Object.hasOwn(patch, 'provider')
                  ? { provider: patch.provider || null }
                  : {}),
              },
              where: { id: binding.agentId },
            })
            this.syncAgentCompatibilityMirror(agent.id, agent)
            return { model: agent.model || '', provider: agent.provider || '' }
          },
          outboundEnabled: binding.outboundEnabled,
          platform,
          provider: binding.agent?.provider || null,
          routeTargetResolver: (...args) => routeTargetResolver(...args),
        })
        agents.set(binding.id, { agent: binding.agent, binding, chn, memory })
      }
      if (!agents.size) {
        const metadata = new Map()
        const memory = {
          agentId: null,
          async getAgentMeta(key, fallback = null) {
            return metadata.has(key) ? metadata.get(key) : fallback
          },
          async setAgentMeta(key, value) {
            metadata.set(key, value)
            return value
          },
        }
        const chn = await factory({
          adapterDefinition,
          channel,
          channelId,
          client,
          gateway,
          id: channelId,
          keepAlive: { enabled: false },
          llm: this.llm,
          logger: this.logger,
          masterId: channel.userId || channel.botId || channelId,
          memory,
          model: null,
          onActivity: () =>
            this.channelStore
              .update(channelId, { lastActive: Date.now() })
              .catch(() => {}),
          // No Agent is bound, but the transport must still be able to send
          // routing/control notices such as "no available Agent".
          outboundEnabled: true,
          platform,
          provider: null,
          routeTargetResolver: (...args) => routeTargetResolver(...args),
        })
        transportContext = { chn, memory }
      }
      routeTargetResolver = async (envelope) => {
        const principal = await this.identityService.resolve(envelope)
        const commandName = envelope.content.text
          .trim()
          .match(/^\/([^\s]+)/)?.[1]
          ?.toLocaleLowerCase()
        if (
          commandName === 'admin' ||
          commandName === 'agent' ||
          commandName === 'agents'
        ) {
          const context = agents.values().next().value || transportContext
          return {
            enqueueInboundDebounce: (from, packet = {}) =>
              context.chn.enqueueInboundDebounce(from, {
                ...packet,
                ctx: {
                  ...packet.ctx,
                  channelAgentScope: this.agentRoutingService.scope(envelope),
                  channelIdentityScope: this.identityService.scope(envelope),
                  channelId,
                  envelope,
                  principal,
                },
              }),
            get latestContextToken() {
              return context.chn.latestContextToken
            },
            set latestContextToken(value) {
              context.chn.latestContextToken = value
            },
            keepAlive: context.chn.keepAlive,
            memory: context.memory,
          }
        }
        const target = await this.routeResolver.resolve({
          channelId: envelope.source.channelId,
          explicitAgentId: envelope.explicitAgentId || null,
          externalConversationId: envelope.conversation.externalConversationId,
        })
        const context = agents.get(target.bindingId)
        if (!context)
          throw new Error(`resolved binding ${target.bindingId} is not active`)
        const resolvedConversation = await this.conversationService.resolve({
          agentId: target.agentId,
          channelId,
          envelope,
        })
        const sessionScope = this.conversationService.scope(
          resolvedConversation.conversation.id,
          target.agentId,
        )
        return {
          enqueueInboundDebounce: (from, packet = {}) =>
            context.chn.enqueueInboundDebounce(from, {
              ...packet,
              ctx: {
                ...packet.ctx,
                agentId: target.agentId,
                bindingId: target.bindingId,
                channelId,
                channelConversationId: resolvedConversation.conversation.id,
                externalConversationId:
                  resolvedConversation.conversation.externalConversationId,
                externalThreadId:
                  resolvedConversation.conversation.externalThreadId || null,
                envelope,
                principal,
                sessionId: resolvedConversation.sessionId,
                sessionScope,
                sid: resolvedConversation.sessionId,
              },
            }),
          get latestContextToken() {
            return context.chn.latestContextToken
          },
          set latestContextToken(value) {
            context.chn.latestContextToken = value
          },
          keepAlive: context.chn.keepAlive,
          memory: context.memory,
        }
      }
      for (const context of agents.values()) {
        context.chn.routeTargetResolver = routeTargetResolver
      }
      const primaryContext = agents.values().next().value || transportContext
      const chn = primaryContext.chn
      await chn.start()
      this.running.set(channelId, {
        agents,
        channel,
        chn,
        gateway,
        memory: primaryContext.memory,
        onebots,
      })
      await this.channelStore.update(channelId, { status: 'running' })
      this.logger.info?.(
        `[ChannelRuntime] ✅ 渠道 "${channelId}" 启动成功并进入运行状态 (running)`,
      )
      return chn
    } catch (error) {
      this.logger.error?.(
        `[ChannelRuntime] ❌ 渠道 "${channelId}" 启动失败:`,
        error,
      )
      // A partially started embedded account otherwise keeps polling even
      // though no Channel instance owns it.
      if (onebots && gateway?.stopAccount) {
        await gateway.stopAccount(channelId).catch(() => {})
      }
      throw error
    }
  }

  /** Remove a deleted Agent from live execution maps without stopping its transports. */
  detachAgent(agentId) {
    const target = String(agentId)
    for (const entry of this.running.values()) {
      for (const [bindingId, context] of entry.agents || []) {
        if (String(context.binding?.agentId) !== target) continue
        for (const job of context.chn?.activeJobs?.values?.() || []) {
          job?._abortLlm?.()
          job?.abort?.()
        }
        context.chn?.activeJobs?.clear?.()
        entry.agents.delete(bindingId)
      }
    }
  }

  /**
   * Keep legacy realtime Channel executors aligned after an Agent update.
   * These fields are compatibility mirrors only; SessionTurnService always
   * reloads the Agent and never reads model/provider from this runtime state.
   */
  syncAgentCompatibilityMirror(agentId, patch = {}) {
    const target = String(agentId)
    for (const entry of this.running.values()) {
      for (const context of entry.agents?.values?.() || []) {
        if (String(context.binding?.agentId) !== target) continue
        if (Object.hasOwn(patch, 'model')) {
          context.chn.model = patch.model || null
        }
        if (Object.hasOwn(patch, 'provider')) {
          context.chn.provider = patch.provider || null
        }
        if (context.agent) {
          if (Object.hasOwn(patch, 'model')) {
            context.agent.model = patch.model || null
          }
          if (Object.hasOwn(patch, 'provider')) {
            context.agent.provider = patch.provider || null
          }
        }
      }
    }
  }

  /**
   * 停止渠道（停止长轮询 + notifyStop + 状态落 stopped）
   * @param {string} channelId
   * @param {{persistStatus?: boolean}} [options] persistStatus=false 时只停运行实例、
   *   不把 status 落库为 stopped —— 供进程退出（dispose）使用，避免重启后 init()
   *   因 status 已被改写而拒绝恢复该渠道。用户主动停止仍使用默认的 true。
   */
  async stop(channelId, { persistStatus = true } = {}) {
    this.logger.info?.(`[ChannelRuntime] 🛑 正在停止渠道 "${channelId}"...`)
    const entry = this.running.get(channelId)
    let channel = entry?.channel
    if (!channel) channel = await this.channelStore.get(channelId)
    let firstError = null
    if (entry) {
      const channels = new Set([
        entry.chn,
        ...[...(entry.agents?.values?.() || [])].map((context) => context.chn),
      ])
      for (const chn of channels) {
        try {
          await chn?.stop?.()
        } catch (error) {
          firstError ||= error
        }
      }
      this.running.delete(channelId)
    }
    if (entry?.onebots || this.isOneBotsChannel(channel)) {
      try {
        // A never-started account has no gateway lifecycle to tear down. Avoid
        // loading the optional dependency merely to mark such a channel stopped.
        const gateway = entry?.gateway || this.onebotsGateway
        if (gateway && typeof gateway.stopAccount === 'function')
          await gateway.stopAccount(channelId)
      } catch (error) {
        if (!firstError) firstError = error
      }
    }
    if (persistStatus) {
      await this.channelStore.update(channelId, { status: 'stopped' })
    }
    if (firstError) {
      this.logger.error?.(
        `[ChannelRuntime] ⚠️ 停止渠道 "${channelId}" 发生异常:`,
        firstError,
      )
      throw firstError
    }
    this.logger.info?.(
      `[ChannelRuntime] ⏹️ 渠道 "${channelId}" 已停止 (${persistStatus ? 'stopped' : '不落库，status 保持 running 以便重启后自动恢复'})`,
    )
  }

  async stopAll({ persistStatus = true } = {}) {
    for (const id of this.running.keys()) await this.stop(id, { persistStatus })
  }

  isRunning(channelId) {
    return this.running.has(channelId)
  }
  runningIds() {
    return [...this.running.keys()]
  }
}

export default ChannelRuntime
