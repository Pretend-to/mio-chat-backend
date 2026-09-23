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
    sendMessage: async (p) => {
      cli.sent.push(p)
    },
    getUpdates: async () => {
      await sleep(20)
      return { ret: 0, msgs: [], get_updates_buf: '' }
    },
    notifyStart: async () => {},
    notifyStop: async () => {},
  }
  return cli
}

const identityService = {
  async resolve(envelope) {
    return {
      externalUserId: envelope.actor.externalUserId,
      id: `channel:${envelope.source.channelId}:${envelope.actor.externalUserId}`,
      isAdmin: false,
      role: 'user',
    }
  },
  scope: () => ({
    claim: async () => ({ isAdmin: true, role: 'system_admin' }),
    status: async () => ({
      externalUserId: 'user-a',
      isAdmin: false,
      role: 'user',
    }),
  }),
}

test('ChannelRuntime keeps realtime model fields as synchronized Agent compatibility mirrors', () => {
  const runtime = new ChannelRuntime({ channelStore: {}, llm: {} })
  const first = { model: 'old-a', provider: 'old-provider' }
  const second = { model: 'old-b', provider: 'old-provider' }
  const other = { model: 'other', provider: 'other-provider' }
  runtime.running.set('channel-a', {
    agents: new Map([
      [
        'binding-a',
        {
          agent: { id: 'agent-a', model: 'old-a', provider: 'old-provider' },
          binding: { agentId: 'agent-a' },
          chn: first,
        },
      ],
      [
        'binding-other',
        {
          agent: { id: 'agent-other' },
          binding: { agentId: 'agent-other' },
          chn: other,
        },
      ],
    ]),
  })
  runtime.running.set('channel-b', {
    agents: new Map([
      [
        'binding-b',
        {
          agent: { id: 'agent-a', model: 'old-b', provider: 'old-provider' },
          binding: { agentId: 'agent-a' },
          chn: second,
        },
      ],
    ]),
  })

  runtime.syncAgentCompatibilityMirror('agent-a', {
    model: 'fresh-model',
    provider: 'fresh-provider',
  })

  assert.deepEqual(
    [first, second].map(({ model, provider }) => ({ model, provider })),
    [
      { model: 'fresh-model', provider: 'fresh-provider' },
      { model: 'fresh-model', provider: 'fresh-provider' },
    ],
  )
  assert.deepEqual(other, { model: 'other', provider: 'other-provider' })
})

test('ChannelStore + ChannelRuntime：渠道配置持久化 + 运行时启停', async (t) => {
  const file = path.join(os.tmpdir(), `ch-${Date.now()}.json`)
  const base = path.join(os.tmpdir(), `mem-${Date.now()}`)
  const store = new ChannelStore({ file })
  const bindings = new Map()
  const runtime = new ChannelRuntime({
    bindingResolver: async (channelId) => bindings.get(channelId) || [],
    channelStore: store,
    memoryBase: base,
    clientFactory: () => mockIlinkLike(),
    llm: { process: async () => ({ text: 'echo' }) },
    identityService,
    persistenceMode: 'legacy',
  })
  t.after(async () => {
    await runtime.stopAll()
    fs.rmSync(file, { force: true })
    fs.rmSync(base, { recursive: true, force: true })
  })

  await test('渠道配置：create 默认字段 + 脱敏', async () => {
    const c = await store.create({ name: '我的微信' })
    assert.strictEqual(c.agentId, undefined)
    assert.strictEqual(c.status, 'unbound')
    assert.ok(!('token' in c), '对外脱敏')
  })

  await test('已认证但未关联 Agent 的渠道保持在线，关联后加载 Agent memory 并可启停', async () => {
    const unb = await store.create({ name: '未绑定', type: 'wechat' })
    await store.update(unb.id, {
      token: 'tk-passive',
      userId: 'passive@im.wechat',
    })
    await runtime.start(unb.id)
    assert.ok(runtime.isRunning(unb.id), '未绑定 transport 仍保持在线')
    await runtime.stop(unb.id)

    const ch = await store.create({ name: '绑定好', type: 'wechat' })
    await store.update(ch.id, {
      token: 'tk',
      botId: 'b1',
      userId: 'master@im.wechat',
    })
    bindings.set(ch.id, [
      {
        agent: { id: 'wechat-agent', model: null, provider: null },
        agentId: 'wechat-agent',
        id: 'binding-wechat',
        outboundEnabled: true,
      },
    ])
    const chn = await runtime.start(ch.id)
    assert.ok(chn, 'start 返回 WechatChannel')
    assert.ok(runtime.isRunning(ch.id), '运行时 running')
    assert.strictEqual(
      (await store.get(ch.id)).status,
      'running',
      'store status=running',
    )
    assert.equal(
      runtime.running.get(ch.id).agents.get('binding-wechat').memory.agentId,
      'wechat-agent',
      '运行时 memory 按 Agent id 隔离',
    )

    await runtime.stop(ch.id)
    assert.ok(!runtime.isRunning(ch.id), 'stop 后非 running')
    assert.strictEqual(
      (await store.get(ch.id)).status,
      'stopped',
      'store status=stopped',
    )
    await runtime.start(ch.id)
    assert.ok(runtime.isRunning(ch.id), '可再次启动')
    await runtime.stopAll()
    assert.strictEqual(runtime.runningIds().length, 0, 'stopAll 全部停止')
  })

  await test('多 Agent 未选路由时 /agents 由 Channel 控制层直接处理', async () => {
    const ch = await store.create({ name: '多助理微信', type: 'wechat' })
    await store.update(ch.id, { token: 'tk-multi', userId: 'multi@im.wechat' })
    bindings.set(ch.id, [
      {
        agent: { id: 'agent-a', name: 'A' },
        agentId: 'agent-a',
        id: 'binding-a',
        outboundEnabled: true,
      },
      {
        agent: { id: 'agent-b', name: 'B' },
        agentId: 'agent-b',
        id: 'binding-b',
        outboundEnabled: true,
      },
    ])
    let ordinaryRouteCalls = 0
    const agentUseCalls = []
    const scopedRuntime = new ChannelRuntime({
      agentRoutingService: {
        scope: () => ({
          current: async () => null,
          list: async () => [
            { active: false, id: 'agent-a', name: 'A', type: 'agent' },
            {
              active: false,
              id: 'session-child',
              name: '研究员',
              type: 'subagent',
            },
          ],
          use: async (selector) => {
            agentUseCalls.push(selector)
            return { id: 'agent-a', name: 'A', type: 'agent' }
          },
        }),
      },
      bindingResolver: async (channelId) => bindings.get(channelId) || [],
      channelStore: store,
      clientFactory: () => mockIlinkLike(),
      memoryBase: `${base}-scoped`,
      identityService,
      persistenceMode: 'legacy',
      routeResolver: {
        async resolve() {
          ordinaryRouteCalls++
          const error = new Error('ambiguous')
          error.code = 'route_required'
          throw error
        },
      },
    })
    t.after(async () => {
      await scopedRuntime.stopAll()
      fs.rmSync(`${base}-scoped`, { recursive: true, force: true })
    })
    const channel = await scopedRuntime.start(ch.id)
    const client = channel.client
    await channel.handleIncomingMessage({
      context_token: 'ctx-agents',
      from_user_id: 'user-a',
      item_list: [{ text: '/agents', type: 1 }],
      message_id: 'msg-agents',
      message_type: 1,
    })
    assert.equal(ordinaryRouteCalls, 0)
    const reply = client.sent.at(-1)?.item_list?.[0]?.text || ''
    assert.match(reply, /\[Agent\] A/)
    assert.match(reply, /\[SubAgent\] 研究员/)

    await channel.handleIncomingMessage({
      context_token: 'ctx-agent-use',
      from_user_id: 'user-a',
      item_list: [{ text: '/agent use A', type: 1 }],
      message_id: 'msg-agent-use',
      message_type: 1,
    })
    assert.deepEqual(agentUseCalls, ['A'])
    assert.match(
      client.sent.at(-1)?.item_list?.[0]?.text || '',
      /已切换到 \[Agent\] A/,
    )
    assert.equal(ordinaryRouteCalls, 0)
  })

  await test('删除渠道', async () => {
    const c = await store.create()
    assert.strictEqual(await store.remove(c.id), true)
  })

  fs.rmSync(file, { force: true })
  fs.rmSync(base, { recursive: true, force: true })
})
