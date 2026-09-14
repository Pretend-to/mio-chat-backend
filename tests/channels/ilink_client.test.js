import { test } from 'node:test'
import assert from 'node:assert'
import http from 'node:http'
import { IlinkClient } from '../../channels/wechat/IlinkClient.js'

/**
 * IlinkClient 协议层测试（mock ilink 服务端，验证登录/长轮询/收发/typing/notify）
 * 协议依据：channels/wechat/PROTOCOL.md
 */

function startMockServer() {
  const state = { sendLog: [], pollCount: 0, getUpdatesCalls: 0 }
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    const json = (o, code = 200) => {
      res.writeHead(code, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(o))
    }
    const read = (cb) => {
      let b = ''
      req.on('data', (d) => (b += d))
      req.on('end', () => cb(b ? JSON.parse(b) : {}))
    }
    const path = url.pathname
    if (path === '/ilink/bot/get_bot_qrcode') return json({ qrcode: 'mockqr_123', qrcode_img_content: 'base64img' })
    if (path === '/ilink/bot/get_qrcode_status') {
      state.pollCount++
      if (state.pollCount === 1) return json({ status: 'wait', qrcode: url.searchParams.get('qrcode') })
      return json({ status: 'confirmed', bot_token: 'mock-bot-token', ilink_bot_id: 'bot-001', ilink_user_id: 'u_wechat@im.wechat' })
    }
    if (path === '/ilink/bot/getupdates') {
      return read((body) => {
        state.getUpdatesCalls++
        const buf = body.get_updates_buf || ''
        if (!buf) return json({ ret: 0, msgs: [], get_updates_buf: 'cursor-A' })
        return json({
          ret: 0,
          msgs: [{
            message_id: 1,
            from_user_id: 'u_wechat@im.wechat',
            to_user_id: 'bot-001',
            message_type: 1,
            context_token: 'ctx-TOKEN-1',
            item_list: [{ type: 1, text: '你好微信' }],
          }],
          get_updates_buf: 'cursor-B',
        })
      })
    }
    if (path === '/ilink/bot/sendmessage') return read((body) => { state.sendLog.push(body); json({ ret: 0 }) })
    if (path === '/ilink/bot/sendtyping') return read(() => json({ ret: 0 }))
    if (path === '/ilink/bot/getconfig') return read(() => json({ ret: 0, typing_ticket: 'tt-9' }))
    if (path === '/ilink/bot/msg/notifystop' || path === '/ilink/bot/msg/notifystart') return read(() => json({ ret: 0 }))
    json({ ret: -1, errmsg: `unknown ${path}` }, 404)
  })
  return new Promise((resolve) => {
    server.listen(0, () => resolve({ server, state, port: server.address().port }))
  })
}

test('IlinkClient 协议层（mock iLink server）', async (t) => {
  const { server, state, port } = await startMockServer()
  const client = new IlinkClient({ baseUrl: `http://127.0.0.1:${port}`, channelVersion: '0.1.0' })

  await t.test('登录：二维码 + 扫码状态轮询到 confirmed + 写入登录态', async () => {
    const qr = await client.getLoginQrCode()
    assert.strictEqual(qr.qrcode, 'mockqr_123')
    assert.ok(qr.qrcode_img_content, '有二维码内容')
    const s1 = await client.pollQrStatus(qr.qrcode)
    assert.strictEqual(s1.status, 'wait')
    const s2 = await client.pollQrStatus(qr.qrcode, { timeoutMs: 5000 })
    assert.strictEqual(s2.status, 'confirmed')
    assert.ok(s2.bot_token)
    client.setAuth({ token: s2.bot_token, botId: s2.ilink_bot_id, userId: s2.ilink_user_id })
    assert.ok(client.authed)
    assert.strictEqual(client.botId, 'bot-001')
  })

  await t.test('长轮询 getupdates：游标推进 + 拉到消息与 context_token', async () => {
    const u1 = await client.getUpdates('', { timeoutMs: 5000 })
    assert.strictEqual(u1.get_updates_buf, 'cursor-A')
    assert.strictEqual(u1.msgs.length, 0)
    const u2 = await client.getUpdates(u1.get_updates_buf, { timeoutMs: 5000 })
    assert.strictEqual(u2.msgs.length, 1)
    assert.strictEqual(u2.msgs[0].context_token, 'ctx-TOKEN-1')
    assert.strictEqual(u2.msgs[0].item_list[0].text, '你好微信')
  })

  await t.test('sendMessage：主动推送 + 带回 context_token', async () => {
    await client.sendMessage({
      to_user_id: 'u_wechat@im.wechat',
      from_user_id: client.botId,
      message_type: 2,
      message_state: 2,
      context_token: 'ctx-TOKEN-1',
      item_list: [{ type: 1, text: '回复：收到！' }],
    })
    assert.strictEqual(state.sendLog.length, 1)
    assert.strictEqual(state.sendLog[0].msg.item_list[0].text, '回复：收到！')
    assert.strictEqual(state.sendLog[0].msg.context_token, 'ctx-TOKEN-1')
  })

  await t.test('getConfig / sendTyping / notifyStart / notifyStop 无异常', async () => {
    const cfg = await client.getConfig({ contextToken: 'ctx-TOKEN-1' })
    assert.strictEqual(cfg.typing_ticket, 'tt-9')
    await client.sendTyping({ typingTicket: 'tt-9', status: 1 })
    await client.notifyStart()
    await client.notifyStop()
  })

  server.close()
})