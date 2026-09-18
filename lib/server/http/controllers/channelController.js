import { makeStandardResponse } from '../utils/responseFormatter.js'
import { ChannelStore } from '../../../../channels/index.js'
import { ChannelRuntime } from '../../../../channels/ChannelRuntime.js'
import { ChannelIdentityService } from '../../../../channels/bindings/ChannelIdentityService.js'
import {
  DEFAULT_BASE_URL,
  IlinkClient,
} from '../../../../channels/wechat/IlinkClient.js'
import {
  getChannelCatalog,
  isNativeIlinkChannel,
  isOneBotsChannel,
  normalizeChannelCreatePayload,
  resolveChannelAdapter,
} from '../../../../channels/ChannelAdapterRegistry.js'
import { mountTriggersToRuntime } from '../../../../channels/triggers/index.js'
import { CHANNEL_TOOL_PLUGINS } from '../../../chat/llm/toolPolicy.js'

/**
 * Channel 管理 API（M6）
 * 依赖可注入（initChannelController），便于测试走 mock iLink 服务。
 * API：
 *   GET    /api/channels                   列表（脱敏）
 *   GET    /api/channels/catalog           可创建的平台、能力与配置 schema
 *   POST   /api/channels {adapter,profile,config} 新建 I/O 连接
 *   POST   /api/channels/:id/qrcode        生成登录二维码
 *   POST   /api/channels/:id/poll {qrcode} 轮询扫码 → confirmed 自动写 token 等
 *   PUT    /api/channels/:id {name,avatar} 编辑连接信息
 *   POST   /api/channels/:id/start|stop    运行时启停
 *   DELETE /api/channels/:id               删除（运行时先停下）
 */
let deps = null

export function initChannelController(o = {}) {
  const store = o.channelStore || new ChannelStore()
  const runtime =
    o.runtime ||
    new ChannelRuntime({
      channelStore: store,
      clientFactory: o.clientFactory,
      onebotsGateway: o.onebotsGateway,
      onebotChannelFactory: o.onebotChannelFactory,
    })
  // Allow callers that supply an existing runtime to inject the gateway/factory
  // through this initializer as well.
  if (o.onebotsGateway && !runtime.onebotsGateway)
    runtime.onebotsGateway = o.onebotsGateway
  if (o.onebotChannelFactory && !runtime.onebotChannelFactory)
    runtime.onebotChannelFactory = o.onebotChannelFactory
  deps = {
    baseUrl: o.baseUrl || DEFAULT_BASE_URL,
    ilinkClientFactory: o.ilinkClientFactory || null,
    runtime,
    store,
    identityService:
      o.identityService ||
      runtime.identityService ||
      new ChannelIdentityService({ prisma: o.prisma }),
    onebotsGateway: o.onebotsGateway || runtime.onebotsGateway || null,
  }
  mountTriggersToRuntime(runtime, { start: o.startTriggers !== false })
}
/** 获取 ChannelRuntime 单例（供外部模块如 cron.js 使用） */
export function getChannelRuntime() {
  if (!deps) initChannelController()
  return deps.runtime
}
function d() {
  if (!deps) initChannelController()
  return deps
}
function ilink() {
  return d().ilinkClientFactory
    ? d().ilinkClientFactory({ baseUrl: d().baseUrl })
    : new IlinkClient({ baseUrl: d().baseUrl })
}
const ok = (res, data) => res.json(makeStandardResponse(data))
const fail = (res, e) => res.status(500).json({ code: 1, message: e.message })
export async function listChannels(req, res) {
  try {
    const channels = await d().store.list()
    for (const c of channels) {
      c.isRunning = d().runtime.isRunning(c.id)
      c.status = c.isRunning ? 'running' : c.status
      c.adminIdentity = await d().identityService.getChannelSummary(c.id)
    }
    ok(res, { channels })
  } catch (e) {
    fail(res, e)
  }
}
export function getChannelPlatformCatalog(_req, res) {
  ok(res, getChannelCatalog())
}
export async function createChannel(req, res) {
  try {
    const channel = normalizeChannelCreatePayload(req.body || {})
    const created = await d().store.create(channel)
    let adminClaim
    try {
      adminClaim = await d().identityService.issueAdminClaim(created.id)
    } catch (error) {
      await d().store.remove(created.id).catch(() => {})
      throw error
    }
    ok(res, { ...created, adminClaim })
  } catch (e) {
    if (e instanceof TypeError) {
      return res.status(400).json({ code: 1, message: e.message })
    }
    fail(res, e)
  }
}

export async function createChannelAdminClaim(req, res) {
  try {
    const channel = await d().store.get(req.params.id)
    if (!channel)
      return res.status(404).json({ code: 1, message: 'channel not found' })
    ok(res, {
      channelId: channel.id,
      adminClaim: await d().identityService.issueAdminClaim(channel.id),
    })
  } catch (e) {
    fail(res, e)
  }
}
export async function getChannelQrcode(req, res) {
  try {
    const id = req.params.id
    const ch = await d().store.get(id)
    if (!ch) throw new Error(`channel ${id} not found`)
    if (isNativeIlinkChannel(ch)) {
      const qr = await ilink().getLoginQrCode()
      const img = qr.qrcode_img_content || qr.qrcode_url || ''
      return ok(res, { channelId: id, img, qrcode: qr.qrcode || null })
    }
    if (!isOneBotsChannel(ch)) {
      throw new Error(`unsupported channel type: ${ch.type || 'unknown'}`)
    }
    const gateway =
      d().onebotsGateway || (await d().runtime.getOnebotsGateway())
    if (typeof gateway.requestQrLogin !== 'function') {
      throw new Error(
        'OneBots gateway does not provide requestQrLogin(channel)',
      )
    }
    const force =
      req.body?.force === true ||
      req.query?.force === 'true' ||
      req.body?.refresh === true
    const qr = await gateway.requestQrLogin(ch, ch.platform, {
      adapterDefinition: resolveChannelAdapter(ch),
      force,
    })
    const qrObject = qr && typeof qr === 'object' ? qr : {}
    const img =
      qrObject.img ||
      qrObject.qrCodeUrl ||
      qrObject.qrcode_url ||
      qrObject.qrcode_img_content ||
      (typeof qr === 'string' ? qr : '')
    return ok(res, {
      ...qrObject,
      channelId: id,
      img,
      qrcode:
        qrObject.qrcode ||
        qrObject.qrCode ||
        (typeof qr === 'string' ? qr : null),
    })
  } catch (e) {
    fail(res, e)
  }
}
export async function pollChannelQr(req, res) {
  try {
    const id = req.params.id
    const { qrcode, verifyCode } = req.body || {}
    const store = d().store
    const ch = await store.get(id)
    if (!ch) throw new Error(`channel ${id} not found`)

    if (isNativeIlinkChannel(ch)) {
      if (!qrcode) throw new Error('qrcode required')
      const cli = ilink()
      for (let i = 0; i < 10; i++) {
        const state = await cli.pollQrStatus(qrcode, {
          timeoutMs: 2000,
          verifyCode: verifyCode || null,
        })
        if (state?.status === 'confirmed') {
          await store.update(id, {
            botId: state.ilink_bot_id,
            status: 'bound',
            token: state.bot_token,
            userId: state.ilink_user_id,
          })
          try {
            if (d().runtime.isRunning(id)) await d().runtime.stop(id)
            await d().runtime.start(id)
          } catch (startError) {
            console.warn(
              `[ChannelController] 扫码确认后自动启动原生 iLink 渠道 "${id}" 失败:`,
              startError.message,
            )
          }
          return ok(res, {
            botId: state.ilink_bot_id,
            status: 'confirmed',
            userId: state.ilink_user_id,
          })
        }
        if (state?.status === 'expired') return ok(res, { status: 'expired' })
        if (i < 9) await new Promise((resolve) => setTimeout(resolve, 500))
      }
      return ok(res, { status: 'wait' })
    }

    if (!isOneBotsChannel(ch)) {
      throw new Error(`unsupported channel type: ${ch.type || 'unknown'}`)
    }
    const gateway =
      d().onebotsGateway || (await d().runtime.getOnebotsGateway())
    if (typeof gateway.getAccountState !== 'function') {
      throw new Error('OneBots gateway does not provide getAccountState(id)')
    }
    for (let i = 0; i < 10; i++) {
      const state = await gateway.getAccountState(id)
      const qrSession =
        typeof gateway.getQrCode === 'function' ? gateway.getQrCode(id) : null
      const status = String(state?.status || '').toLowerCase()

      // 若当前有正在等待扫码的二维码会话，严禁将已在线的常驻账号误判为“扫码已完成”
      if (qrSession?.status === 'qr') {
        if (i < 9) await new Promise((r) => setTimeout(r, 500))
        continue
      }

      if (
        status === 'confirmed' ||
        status === 'online' ||
        status === 'login' ||
        state?.confirmed === true
      ) {
        const candidateUserId =
          state?.userId ||
          state?.user_id ||
          state?.ilink_user_id ||
          state?.credentials?.userId ||
          state?.credentials?.user_id ||
          ''
        const candidateBotId =
          state?.botId ||
          state?.bot_id ||
          state?.ilink_bot_id ||
          state?.credentials?.botId ||
          state?.credentials?.bot_id ||
          state?.account?.botId ||
          state?.account?.bot_id ||
          ''

        // 严格防御：bot ID（如 @im.bot）绝对不可作为用户的 masterId/userId
        const isBot = (u) =>
          typeof u === 'string' &&
          (u.endsWith('@im.bot') || (candidateBotId && u === candidateBotId))
        const userId =
          (!isBot(candidateUserId) ? candidateUserId : '') ||
          (!isBot(ch.userId) ? ch.userId : '')
        const botId = candidateBotId || ch.botId || ''
        const token =
          state?.token ||
          state?.botToken ||
          state?.bot_token ||
          state?.credentials?.token ||
          state?.credentials?.botToken ||
          ''
        const patch = { userId, botId, status: 'bound' }
        if (token) patch.token = token
        await store.update(id, patch)
        try {
          if (d().runtime.isRunning(id)) await d().runtime.stop(id)
          await d().runtime.start(id)
        } catch (startErr) {
          console.warn(
            `[ChannelController] 扫码确认后自动启动 OneBots 渠道 "${id}" 失败:`,
            startErr.message,
          )
        }
        return ok(res, { botId, status: 'confirmed', userId })
      }
      if (status === 'expired') return ok(res, { status: 'expired' })
      if (i < 9) await new Promise((r) => setTimeout(r, 500))
    }
    return ok(res, { status: 'wait' })
  } catch (e) {
    fail(res, e)
  }
}
export async function getChannel(req, res) {
  try {
    const id = req.params.id
    const ch = await d().store.get(id)
    if (!ch)
      return res
        .status(404)
        .json({ code: 404, message: `channel ${id} not found` })
    const isRunning = d().runtime.isRunning(id)
    const runningEntry = d().runtime.running.get(id)
    const chn = runningEntry?.chn
    const connected = isRunning ? (chn?.connected ?? false) : false
    const lastActive = chn?.lastActive || ch.lastActive || null
    const lastPollSuccess = chn?.lastPollSuccess || null
    const lastError = chn?.lastError || null

    const publicChannel = await d().store.getPublic(id)

    ok(res, {
      ...publicChannel,
      connected,
      isRunning,
      lastActive,
      lastError,
      lastPollSuccess,
      status: isRunning ? 'running' : 'stopped',
      toolPolicy: {
        mode: 'AUTO',
        mutable: false,
        plugin: CHANNEL_TOOL_PLUGINS[0],
        plugins: CHANNEL_TOOL_PLUGINS,
      },
    })
  } catch (e) {
    fail(res, e)
  }
}
export async function updateChannel(req, res) {
  try {
    const { name, avatar } = req.body || {}
    const patch = {}
    if (name != null) patch.name = name
    if (avatar != null) patch.avatar = avatar
    const c =
      typeof d().runtime.updateConfig === 'function'
        ? await d().runtime.updateConfig(req.params.id, patch)
        : await d().store.update(req.params.id, patch)
    if (!c)
      return res
        .status(404)
        .json({ code: 404, message: `channel ${req.params.id} not found` })
    ok(res, c)
  } catch (e) {
    fail(res, e)
  }
}
export async function startChannel(req, res) {
  try {
    const chn = await d().runtime.start(req.params.id)
    ok(res, {
      connected: chn?.connected ?? false,
      isRunning: true,
      started: true,
      status: 'running',
    })
  } catch (e) {
    fail(res, e)
  }
}
export async function stopChannel(req, res) {
  try {
    await d().runtime.stop(req.params.id)
    ok(res, {
      connected: false,
      isRunning: false,
      stopped: true,
      status: 'stopped',
    })
  } catch (e) {
    fail(res, e)
  }
}
export async function deleteChannel(req, res) {
  try {
    const store = d().store
    const runtime = d().runtime
    const id = req.params.id
    const ch = await store.get(id)
    if (!ch) throw new Error(`channel ${id} not found`)
    if (runtime.isRunning(id)) await runtime.stop(id)
    const gateway = d().onebotsGateway || runtime.onebotsGateway
    if (isOneBotsChannel(ch) && typeof gateway?.deleteAccount === 'function') {
      await gateway.deleteAccount(id, resolveChannelAdapter(ch))
    }
    const removed = await store.remove(id)
    if (!removed) throw new Error(`channel ${id} not found`)
    ok(res, { deleted: true })
  } catch (e) {
    fail(res, e)
  }
}
