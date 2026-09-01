import { IlinkClient } from './wechat/IlinkClient.js'
import { createSessionPersistence } from '../lib/chat/persistence/createSessionPersistence.js'
import { WechatChannel } from './wechat/WechatChannel.js'
import { createBackendLlm } from './wechat/llm.js'

/**
 * ChannelRuntime — 渠道运行时管理器（M6 后端）
 *
 * 职责：把「已绑定的渠道配置」拉起为真实运行的 WechatChannel（长轮询），
 *       并统一管理启/停 / 运行态。
 * 解耦：llm 可注入（默认 createBackendLlm）；client 可注入（测试用 mock）。
 */
export class ChannelRuntime {
  /**
   * @param {object} opts
   * @param {import('./ChannelStore.js').ChannelStore} opts.channelStore 渠道配置存储
   * @param {object} [opts.llm]  llmProcessor（默认 createBackendLlm）
   * @param {string} [opts.memoryBase] memory 根目录（默认 'memory'）
   * @param {(channel)=>object} [opts.clientFactory] 自定义 client 工厂（测试注入 mock）
   */
  constructor({
    channelStore,
    clientFactory,
    llm,
    memoryBase = 'memory',
    persistenceFactory = createSessionPersistence,
    persistenceMode = process.env.MIO_CHANNEL_PERSISTENCE_MODE || 'legacy',
    prisma = null,
  } = {}) {
    if (!channelStore) throw new Error('ChannelRuntime requires channelStore')
    this.channelStore = channelStore
    this.llm = llm || createBackendLlm()
    this.memoryBase = memoryBase
    this.clientFactory = clientFactory
    this.persistenceFactory = persistenceFactory
    this.persistenceMode = persistenceMode
    this.prisma = prisma
    this.running = new Map() // channelId -> { channel, chn, memory }
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
        console.warn(`[ChannelRuntime] recovered ${recovered} interrupted message(s) for ${agentId}`)
      }
    }
    return memory
  }

  /** 启动一个已绑定渠道 */
  async start(channelId) {
    const channel = await this.channelStore.get(channelId)
    if (!channel) throw new Error(`channel ${channelId} not found`)
    if (!channel.token || !channel.userId) throw new Error(`channel ${channelId} not bound`)
    if (this.running.has(channelId)) return this.running.get(channelId).chn

    const agentId = channel.agentId || 'wechat-master'
    const memory = await this.createMemory(agentId, { recover: true })
    const client = this.clientFactory
      ? this.clientFactory(channel)
      : (() => {
        const c = new IlinkClient()
        c.setAuth({ token: channel.token, botId: channel.botId, userId: channel.userId })
        return c
      })()
    const savedProvider = await memory.getAgentMeta('provider', channel.provider || null)
    const savedModel = await memory.getAgentMeta('model', channel.model || null)

    const chn = new WechatChannel({ 
      channelId,
      id: channelId,
      client, 
      memory, 
      masterId: channel.userId, 
      llm: this.llm,
      provider: savedProvider,
      model: savedModel,
      logger: typeof logger !== 'undefined' ? logger : console,
      onActivity: () => {
        this.channelStore.update(channelId, { lastActive: Date.now() }).catch(() => {})
      },
    })
    await chn.start()
    this.running.set(channelId, { channel, chn, memory })
    await this.channelStore.update(channelId, { status: 'running' })
    return chn
  }

  /** 停止渠道（停止长轮询 + notifyStop + 状态落 stopped） */
  async stop(channelId) {
    const entry = this.running.get(channelId)
    if (entry) {
      await entry.chn.stop()
      this.running.delete(channelId)
    }
    await this.channelStore.update(channelId, { status: 'stopped' })
  }

  async stopAll() {
    for (const id of this.running.keys()) await this.stop(id)
  }

  isRunning(channelId) {
    return this.running.has(channelId)
  }
  runningIds() {
    return [...this.running.keys()]
  }
}

export default ChannelRuntime
