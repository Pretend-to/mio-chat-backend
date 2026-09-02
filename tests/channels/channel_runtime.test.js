import { test } from 'node:test'
import assert from 'node:assert'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { ChannelStore } from '../../channels/index.js'
import { ChannelRuntime } from '../../channels/ChannelRuntime.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** WechatChannel 兼容的 mock client（getUpdates 加微延时防忙转） */
function mockIlinkLike() {
  const cli = {
    botId: 'b',
    sent: [],
    getConfig: async () => ({ typing_ticket: 't' }),
    sendTyping: async () => {},
    sendMessage: async (p) => { cli.sent.push(p) },
    getUpdates: async () => { await sleep(20); return { ret: 0, msgs: [], get_updates_buf: '' } },
    notifyStart: async () => {},
    notifyStop: async () => {},
  }
  return cli
}

test('ChannelStore + ChannelRuntime：渠道配置持久化 + 运行时启停', async (t) => {
  const file = path.join(os.tmpdir(), `ch-${Date.now()}.json`)
  const base = path.join(os.tmpdir(), `mem-${Date.now()}`)
  const store = new ChannelStore({ file })
  const runtime = new ChannelRuntime({
    channelStore: store,
    memoryBase: base,
    clientFactory: () => mockIlinkLike(),
    llm: { process: async () => ({ text: 'echo' }) },
  })
  t.after(async () => { await runtime.stopAll(); fs.rmSync(file, { force: true }); fs.rmSync(base, { recursive: true, force: true }) })

  await test('渠道配置：create 默认字段 + 脱敏', async () => {
    const c = await store.create({ name: '我的微信' })
    assert.strictEqual(c.agentId, 'wechat-master')
    assert.strictEqual(c.status, 'unbound')
    assert.ok(!('token' in c), '对外脱敏')
  })

  await test('未绑定渠道拒绝启动, 绑定后可启动/停止 + 状态落库', async () => {
    const unb = await store.create({ name: '未绑定' })
    await assert.rejects(runtime.start(unb.id), /not bound/)

    const ch = await store.create({ name: '绑定好' })
    await store.update(ch.id, { token: 'tk', botId: 'b1', userId: 'master@im.wechat', agentId: 'wechat-master' })
    const chn = await runtime.start(ch.id)
    assert.ok(chn, 'start 返回 WechatChannel')
    assert.ok(runtime.isRunning(ch.id), '运行时 running')
    assert.strictEqual((await store.get(ch.id)).status, 'running', 'store status=running')
    assert.ok(fs.existsSync(path.join(base, 'agents', 'wechat-master')), 'memory 目录按 agentId 创建')

    await runtime.stop(ch.id)
    assert.ok(!runtime.isRunning(ch.id), 'stop 后非 running')
    assert.strictEqual((await store.get(ch.id)).status, 'stopped', 'store status=stopped')
    await runtime.start(ch.id)
    assert.ok(runtime.isRunning(ch.id), '可再次启动')
    await runtime.stopAll()
    assert.strictEqual(runtime.runningIds().length, 0, 'stopAll 全部停止')
  })

  await test('删除渠道', async () => {
    const c = await store.create()
    assert.strictEqual(await store.remove(c.id), true)
  })

  fs.rmSync(file, { force: true })
  fs.rmSync(base, { recursive: true, force: true })
})
