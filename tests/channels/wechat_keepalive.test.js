import { test } from 'node:test'
import assert from 'node:assert'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { MemoryStore } from '../../channels/memory/index.js'
import { WechatChannel } from '../../channels/wechat/WechatChannel.js'

/**
 * 保活（M5）：记录活动、到期前提醒、过期通知、不重复、健康清理
 */
const MASTER = 'master@im.wechat'

function makeHarness(keepAlive = {}) {
  const mockClient = {
    botId: 'bot', sendLog: [],
    getUpdates: async () => ({ ret: 0, msgs: [], get_updates_buf: '' }),
    sendMessage: async (p) => { mockClient.sendLog.push(p) },
    sendTyping: async () => {}, getConfig: async () => ({ typing_ticket: 't' }), notifyStart: async () => {}, notifyStop: async () => {},
  }
  const baseDir = path.join(os.tmpdir(), `mio-ka-${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)
  const memory = new MemoryStore({ agentId: 'wechat', baseDir })
  const chn = new WechatChannel({ client: mockClient, memory, masterId: MASTER, llm: { process: async (c) => ({ text: c.text }) }, typing: false, keepAlive })
  const msg = (t) => ({ from_user_id: MASTER, message_type: 1, message_id: 1, context_token: 'CTX', item_list: [{ type: 1, text: t }] })
  return { mockClient, memory, chn, msg, baseDir }
}

test('WechatChannel 保活：到期前提醒 / 过期通知 / 不重复 / 健康清理', async () => {
  const { mockClient, memory, chn, msg, baseDir } = makeHarness({
    enabled: true, userTimeoutMs: 10_000, remindBeforeMs: 5_000,
  })
  const sentText = () => mockClient.sendLog.map((s) => s.item_list?.[0]?.text ?? s.sent?.text ?? '')

  // 用户消息 → 记录活动 + 缓存 context_token
  await chn._handleMessage(msg('hi'))
  assert.ok((await memory.getAgentMeta('last_user_activity')) > 0, '收到消息记录活动时间')
  mockClient.sendLog.length = 0 // 清掉 echo 回复，下面只统计保活消息

  // 模拟 6s 前活动（userTimeout 10s → 剩余 4s < remindBefore 5s）→ 应发提醒
  await memory.setAgentMeta('last_user_activity', Date.now() - 6000)
  await chn._checkKeepAlive()
  assert.ok(mockClient.sendLog.length === 1, '到期前窗口发一次提醒')
  assert.ok(mockClient.sendLog[0].context_token === 'CTX', '提醒发送用缓存的 context_token')

  // 窗口内再次检查 → 不重复提醒
  await chn._checkKeepAlive()
  assert.strictEqual(mockClient.sendLog.length, 1, '窗口内不重复提醒')

  // 已超时（idle 20s >= 10s）→ 过期通知（一次）
  await memory.setAgentMeta('last_user_activity', Date.now() - 20_000)
  await chn._checkKeepAlive()
  assert.ok(mockClient.sendLog.length === 2, '超时后发过期通知')
  assert.ok(sentText().some((t) => t.includes('失效')), '过期通知文案含"失效"')
  await chn._checkKeepAlive()
  assert.strictEqual(mockClient.sendLog.length, 2, '过期通知仅一次')

  // 恢复健康 → 清理提醒标记，下次可再提醒
  await memory.setAgentMeta('last_user_activity', Date.now())
  await chn._checkKeepAlive()
  assert.strictEqual(await memory.getAgentMeta('keepalive_last_reminder', 9), 0, '健康时清 remind 标记')
  assert.strictEqual(await memory.getAgentMeta('keepalive_expire_reminded', false), false, '健康时清 expire 标记')

  fs.rmSync(baseDir, { recursive: true, force: true })
})