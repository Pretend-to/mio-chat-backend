import { test } from 'node:test'
import assert from 'node:assert/strict'

import { ConfirmationManager } from '../../channels/common/ConfirmationManager.js'

function createChannel() {
  const sent = []
  return {
    masterId: 'master',
    latestContextToken: null,
    sent,
    _safeSend: async (from, contextToken, text) => {
      sent.push({ from, contextToken, text })
    },
  }
}

test('确认项按用户/会话 FIFO，连续审批不会倒序串线', async () => {
  const channel = createChannel()
  const manager = new ConfirmationManager({ channel, ttlMs: 10_000 })
  const ctx = { from: 'master', sid: 'session-a', contextToken: 'ctx-a' }

  const first = manager.request({
    command: 'okx list --limit 100',
    commandPrefix1: 'okx',
    commandPrefix2: 'okx list',
    description: '执行 okx list',
    rememberable: true,
  }, ctx)
  const second = manager.request({ description: '第二个动作' }, ctx)

  await new Promise(resolve => setTimeout(resolve, 10))
  assert.equal(manager.size, 2)
  assert.equal(channel.sent.filter(message => message.text.includes('⚠️')).length, 1)
  assert.match(channel.sent[0].text, /okx list/)
  assert.doesNotMatch(channel.sent[0].text, /--limit/)

  // 无效输入必须被当前确认流消费，不能落入旁路会话。
  assert.equal(manager.handleMessage('这是普通聊天', ctx), true)
  assert.equal(manager.size, 2)

  // 记住型命令只有卡片展示的 1/2 选项有效，普通“确认”不能绕过白名单粒度。
  assert.equal(manager.handleMessage('确认', ctx), true)
  assert.equal(manager.size, 2)

  assert.equal(manager.handleMessage('1', ctx), true)
  const firstResult = await first
  assert.equal(firstResult.approved, true)
  assert.equal(firstResult.rememberType, 'prefix2')

  await new Promise(resolve => setTimeout(resolve, 10))
  assert.ok(channel.sent.some(message => message.text.includes('第二个动作')))
  assert.equal(manager.handleMessage('确认', ctx), true)
  assert.equal((await second).approved, true)
})

test('确认项不会被其他会话的确认回复消费', async () => {
  const channel = createChannel()
  const manager = new ConfirmationManager({ channel, ttlMs: 10_000 })
  const pending = manager.request({ description: '仅属于 session-a' }, {
    from: 'master',
    sid: 'session-a',
  })

  assert.equal(manager.handleMessage('确认', { from: 'master', sid: 'session-b' }), false)
  assert.equal(manager.size, 1)
  assert.equal(manager.handleMessage('取消', { from: 'master', sid: 'session-a' }), true)
  assert.equal((await pending).approved, false)
})

test('记住型命令只有一个前缀选项时拒绝隐藏的 2 号选项', async () => {
  const channel = createChannel()
  const manager = new ConfirmationManager({ channel, ttlMs: 10_000 })
  const pending = manager.request({
    command: 'okx',
    commandPrefix1: 'okx',
    commandPrefix2: 'okx',
    description: '执行 okx',
    rememberable: true,
  }, { from: 'master', sid: 'session-a' })

  assert.equal(manager.handleMessage('2', { from: 'master', sid: 'session-a' }), true)
  assert.equal(manager.size, 1)
  assert.equal(manager.handleMessage('1', { from: 'master', sid: 'session-a' }), true)
  assert.equal((await pending).rememberType, 'prefix2')
})
