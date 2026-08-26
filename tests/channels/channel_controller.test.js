import { test } from 'node:test'
import assert from 'node:assert'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { ChannelStore, ChannelRuntime } from '../../channels/index.js'
import * as cc from '../../lib/server/http/controllers/channelController.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function buildIlinkServer() {
  const state = { pollCount: 0 }
  const server = http.createServer((req, res) => {
    const json = (o, c = 200) => { res.writeHead(c, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)) }
    const p = req.url
    if (p?.includes('/ilink/bot/get_bot_qrcode')) return json({ qrcode: 'qr-1', qrcode_img_content: 'imgdata' })
    if (p?.includes('/ilink/bot/get_qrcode_status')) {
      state.pollCount++
      if (state.pollCount === 1) return json({ status: 'wait' })
      return json({ status: 'confirmed', bot_token: 'tk', ilink_bot_id: 'bot-9', ilink_user_id: 'master@im.wechat' })
    }
    json({ ret: -1 })
  })
  return new Promise((r) => server.listen(0, () => r({ server, state, port: server.address().port })))
}
// WechatChannel 兼容 mock client（runtime start 用）
function mockClient() {
  return {
    botId: 'b', sent: [], getConfig: async () => ({ typing_ticket: 't' }), sendTyping: async () => {},
    sendMessage: async () => {}, getUpdates: async () => { await sleep(15); return { ret: 0, msgs: [], get_updates_buf: '' } },
    notifyStart: async () => {}, notifyStop: async () => {},
  }
}
function mkRes() {
  const r = { statusCode: 200, body: null }
  r.json = (x) => { r.body = x }
  r.status = (c) => { r.statusCode = c; return { json: (x) => { r.body = x } } }
  return r
}
const mkReq = (params = {}, body = {}) => ({ params, body })

test('Channel 管理 API（mock iLink）', async () => {
  const svc = await buildIlinkServer()
  const file = path.join(os.tmpdir(), `chapi-${Date.now()}.json`)
  const base = path.join(os.tmpdir(), `chapi-mem-${Date.now()}`)
  const store = new ChannelStore({ file })
  const runtime = new ChannelRuntime({ channelStore: store, memoryBase: base, clientFactory: () => mockClient() })
  cc.initChannelController({ channelStore: store, runtime, baseUrl: `http://127.0.0.1:${svc.port}` })

  await test('新建渠道 → 生成二维码 → 轮询绑定（token 落库、脱敏）', async () => {
    const c0 = await store.create({ name: '绑定测试' })
    const rQr = mkRes()
    await cc.getChannelQrcode(mkReq({ id: c0.id }), rQr)
    assert.ok(rQr.body.data.qrcode === 'qr-1', '返回 qrcode')
    assert.ok(rQr.body.data.img === 'imgdata', '返回二维码图')

    const rPoll = mkRes()
    await cc.pollChannelQr(mkReq({ id: c0.id }, { qrcode: 'qr-1' }), rPoll)
    assert.strictEqual(rPoll.body.data.status, 'confirmed', 'poll confirmed')
    const raw = await store.get(c0.id)
    assert.strictEqual(raw.token, 'tk', 'token 落库')
    assert.strictEqual(raw.botId, 'bot-9', 'botId 落库')
    assert.strictEqual(raw.status, 'bound', 'status=bound')
    const pub = await store.getPublic(c0.id)
    assert.ok(!('token' in pub), 'token 脱敏')
  })

  await test('list/update/start/stop/delete', async () => {
    const r = mkRes()
    await cc.listChannels(mkReq(), r)
    assert.ok(Array.isArray(r.body.data.channels) && r.body.data.channels.length >= 1, 'list 渠道')
    const c = await store.create({ name: 'A' })
    await store.update(c.id, { token: 't2', botId: 'b2', userId: 'master@im.wechat', agentId: 'wechat-master' })

    const rUp = mkRes()
    await cc.updateChannel(mkReq({ id: c.id }, { name: '改名', avatar: 'http://x/1.png' }), rUp)
    assert.strictEqual((await store.get(c.id)).name, '改名', 'update 名称')

    const rSt = mkRes()
    await cc.startChannel(mkReq({ id: c.id }), rSt)
    assert.strictEqual(rSt.body.data.started, true, 'start')
    assert.ok(runtime.isRunning(c.id), 'runtime running')

    const rStop = mkRes()
    await cc.stopChannel(mkReq({ id: c.id }), rStop)
    assert.ok(!runtime.isRunning(c.id), 'stop')

    const rDel = mkRes()
    await cc.deleteChannel(mkReq({ id: c.id }), rDel)
    assert.strictEqual(await store.get(c.id), null, 'delete')
  })

  svc.server.close()
  await runtime.stopAll()
  fs.rmSync(file, { force: true })
  fs.rmSync(base, { recursive: true, force: true })
})