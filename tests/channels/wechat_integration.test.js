import { test } from 'node:test'
import assert from 'node:assert'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { IlinkClient } from '../../channels/wechat/index.js'
import { MemoryStore } from '../../channels/memory/index.js'
import { WechatChannel } from '../../channels/wechat/WechatChannel.js'
import { createEchoLlm } from '../../channels/wechat/llm.js'

/**
 * WechatChannel 端到端集成测试（确定性，手动驱动）
 * 真实 HTTP mock iLink 服务 + 真实 IlinkClient（登录、收、发都走真网络）+ 真 MemoryStore + WechatChannel。
 * 验证「登录 → 收消息 → AI 回复 → 真网络发出 → 记忆落盘 → slash 会话路由 → 单用户边界」全链路。
 */

const MASTER = 'master@im.wechat'

function buildIlinkServer() {
  const state = { pollCount: 0, sent: [] }
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    const json = (o, code = 200) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)) }
    const read = (cb) => { let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => cb(b ? JSON.parse(b) : {})) }
    const p = url.pathname
    if (p === '/ilink/bot/get_bot_qrcode') return json({ qrcode: 'qr1', qrcode_img_content: 'img' })
    if (p === '/ilink/bot/get_qrcode_status') {
      state.pollCount++
      if (state.pollCount === 1) return json({ status: 'wait', qrcode: url.searchParams.get('qrcode') })
      return json({ status: 'confirmed', bot_token: 'tk', ilink_bot_id: 'bot-1', ilink_user_id: 'bot-1@im.wechat' })
    }
    if (p === '/ilink/bot/getupdates') return read((body) => json({ ret: 0, msgs: [], get_updates_buf: body?.get_updates_buf || '' }))
    if (p === '/ilink/bot/sendmessage') return read((b) => { state.sent.push(b); json({ ret: 0 }) })
    if (p === '/ilink/bot/sendtyping') return read(() => json({ ret: 0 }))
    if (p === '/ilink/bot/getconfig') return read(() => json({ ret: 0, typing_ticket: 't' }))
    if (p === '/ilink/bot/msg/notifystart' || p === '/ilink/bot/msg/notifystop') return read(() => json({ ret: 0 }))
    json({ ret: -1, errmsg: `unknown ${p}` }, 404)
  })
  return new Promise((r) => server.listen(0, () => r({ server, state, port: server.address().port })))
}

async function loginAndChannel(svc, { soul = true, typing = false } = {}) {
  const client = new IlinkClient({ baseUrl: `http://127.0.0.1:${svc.port}` })
  const qr = await client.getLoginQrCode()
  await client.pollQrStatus(qr.qrcode)
  const c = await client.pollQrStatus(qr.qrcode, { timeoutMs: 2000 })
  client.setAuth({ token: c.bot_token, botId: c.ilink_bot_id, userId: c.ilink_user_id })
  const baseDir = path.join(os.tmpdir(), `mio-int-${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)
  const memory = new MemoryStore({ agentId: 'wechat', baseDir })
  if (soul) await memory.writeSoul('你叫小助手')
  const chn = new WechatChannel({ client, memory, masterId: MASTER, llm: createEchoLlm(), typing })
  return { client, memory, chn, baseDir }
}
const line = (text, from = MASTER, token = 'CTX') => ({ from_user_id: from, message_id: 1, message_type: 1, context_token: token, item_list: [{ type: 1, text }] })
const lastSent = (state) => state.sent[state.sent.length - 1]?.msg?.item_list?.[0]?.text ?? null

test('WechatChannel 端到端：登录→收→AI回复→真网络发出→记忆→slash→单用户', async () => {
  const svc = await buildIlinkServer()
  const { memory, chn, baseDir } = await loginAndChannel(svc)

  // 绑定者消息 → AI 回复 → 经真实 client 发到 mock 服务 + 记忆落盘
  await chn._handleMessage(line('你好呀'))
  assert.strictEqual(svc.state.sent.length, 1, '真网络发出 1 条')
  assert.strictEqual(lastSent(svc.state), '你好呀', 'echo 回复文本')
  assert.strictEqual(svc.state.sent[0].msg.context_token, 'CTX', '发送带回 context_token')
  const sid = await memory.getActiveSession()
  assert.strictEqual((await memory.getChat(sid)).length, 2, '会话聊天落盘(user+assistant)')

  // 陌生人被忽略（真网络不发出）
  const before = svc.state.sent.length
  await chn._handleMessage(line('你是谁', 'stranger@im.wechat'))
  assert.strictEqual(svc.state.sent.length, before, '陌生人消息不回复')

  // slash：/sessions 与 /new
  await chn._handleMessage(line('/sessions'))
  assert.ok(lastSent(svc.state).includes('默认会话'), '/sessions 列出会话')
  await chn._handleMessage(line('/new 项目'))
  const sid2 = await memory.getActiveSession()
  assert.strictEqual((await memory.getSession(sid2)).title, '项目', '/new 新建并激活')

  fs.rmSync(baseDir, { recursive: true, force: true })
  svc.server.close()
})

test('WechatChannel 灵魂引导（无 soul）：走引导、不写 soul、不计入会话', async () => {
  const svc = await buildIlinkServer()
  const { memory, chn, baseDir } = await loginAndChannel(svc, { soul: false })

  await chn._handleMessage(line('你好'))
  assert.strictEqual(lastSent(svc.state), '你好', '引导模式 echo 回复')
  assert.strictEqual(await memory.readSoul(), '', '引导期未写 soul')
  assert.strictEqual((await memory.getChat(await memory.getActiveSession())).length, 0, '引导对话不计入会话')

  fs.rmSync(baseDir, { recursive: true, force: true })
  svc.server.close()
})