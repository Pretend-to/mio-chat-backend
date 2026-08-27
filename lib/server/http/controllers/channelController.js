import { makeStandardResponse } from '../utils/responseFormatter.js'
import { ChannelStore } from '../../../../channels/index.js'
import { ChannelRuntime } from '../../../../channels/ChannelRuntime.js'
import { IlinkClient, DEFAULT_BASE_URL } from '../../../../channels/wechat/IlinkClient.js'

/**
 * Channel 管理 API（M6）
 * 依赖可注入（initChannelController），便于测试走 mock iLink 服务。
 * API：
 *   GET    /api/channels                   列表（脱敏）
 *   POST   /api/channels {name,type}       新建（未绑定）
 *   POST   /api/channels/:id/qrcode        生成登录二维码
 *   POST   /api/channels/:id/poll {qrcode} 轮询扫码 → confirmed 自动写 token 等
 *   PUT    /api/channels/:id {name,avatar,agentId} 编辑基本信息
 *   POST   /api/channels/:id/start|stop    运行时启停
 *   DELETE /api/channels/:id               删除（运行时先停下）
 */
let deps = null

export function initChannelController(o = {}) {
  const store = o.channelStore || new ChannelStore()
  deps = {
    baseUrl: o.baseUrl || DEFAULT_BASE_URL,
    runtime: o.runtime || new ChannelRuntime({ channelStore: store }),
    store,
  }
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
  return new IlinkClient({ baseUrl: d().baseUrl })
}
const ok = (res, data) => res.json(makeStandardResponse(data))
const fail = (res, e) => res.status(500).json({ code: 1, message: e.message })

export async function listChannels(req, res) {
  try { ok(res, { channels: await d().store.list() }) } catch (e) { fail(res, e) }
}
export async function createChannel(req, res) {
  try {
    const { name, type = 'wechat' } = req.body || {}
    ok(res, await d().store.create({ name, type }))
  } catch (e) { fail(res, e) }
}
export async function getChannelQrcode(req, res) {
  try {
    const id = req.params.id
    const ch = await d().store.get(id)
    if (!ch) throw new Error(`channel ${id} not found`)
    const qr = await ilink().getLoginQrCode()
    // 微信 iLink 的 qrcode_img_content 可能是 base64 字符串，也可能是 URL；
    // 部分接口版本返回的是 qrcode_url 字段，这里做兼容取值。
    const img = qr.qrcode_img_content || qr.qrcode_url || ''
    ok(res, { channelId: id, img, qrcode: qr.qrcode || null })
  } catch (e) { fail(res, e) }
}
export async function pollChannelQr(req, res) {
  try {
    const id = req.params.id
    const { qrcode } = req.body || {}
    if (!qrcode) throw new Error('qrcode required')
    const store = d().store
    const ch = await store.get(id)
    if (!ch) throw new Error(`channel ${id} not found`)
    const cli = ilink()
    for (let i = 0; i < 10; i++) {
      const s = await cli.pollQrStatus(qrcode, { timeoutMs: 2000 })
      if (s?.status === 'confirmed') {
        await store.update(id, { botId: s.ilink_bot_id, status: 'bound', token: s.bot_token, userId: s.ilink_user_id })
        return ok(res, { botId: s.ilink_bot_id, status: 'confirmed', userId: s.ilink_user_id })
      }
      if (s?.status === 'expired') return ok(res, { status: 'expired' })
      await new Promise((r) => setTimeout(r, 500))
    }
    ok(res, { status: 'wait' })
  } catch (e) { fail(res, e) }
}
export async function updateChannel(req, res) {
  try {
    const { name, avatar, agentId, provider, model } = req.body || {}
    const patch = {}
    if (name != null) patch.name = name
    if (avatar != null) patch.avatar = avatar
    if (agentId != null) patch.agentId = agentId
    if (provider != null) patch.provider = provider
    if (model != null) patch.model = model
    const c = await d().store.update(req.params.id, patch)
    if (!c) throw new Error(`channel ${req.params.id} not found`)
    // 若正在运行，同步更新运行时配置
    const runningEntry = d().runtime.running.get(req.params.id)
    if (runningEntry?.chn) {
      if (provider !== undefined) runningEntry.chn.provider = provider
      if (model !== undefined) runningEntry.chn.model = model
    }
    ok(res, c)
  } catch (e) { fail(res, e) }
}
export async function startChannel(req, res) {
  try { await d().runtime.start(req.params.id); ok(res, { started: true }) } catch (e) { fail(res, e) }
}
export async function stopChannel(req, res) {
  try { await d().runtime.stop(req.params.id); ok(res, { stopped: true }) } catch (e) { fail(res, e) }
}
export async function deleteChannel(req, res) {
  try {
    const store = d().store
    const runtime = d().runtime
    const id = req.params.id
    if (runtime.isRunning(id)) await runtime.stop(id)
    const removed = await store.remove(id)
    if (!removed) throw new Error(`channel ${id} not found`)
    ok(res, { deleted: true })
  } catch (e) { fail(res, e) }
}