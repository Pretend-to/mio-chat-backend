import test from 'node:test'
import assert from 'node:assert/strict'
import { WebSocketServer } from 'ws'

global.logger = global.logger || console
// console 没有这两个语义级别，补上空实现即可（单测不输出 mark/json）
global.logger.mark ??= () => {}
global.logger.json ??= () => {}

const { default: OnebotWebSocketAdapter } =
  await import('../../lib/chat/onebot/adapters/websocket.js')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitFor(predicate, { timeout = 5000, interval = 20 } = {}) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (predicate()) return true
    await sleep(interval)
  }
  return false
}

/** 监听一个随机端口再关掉，拿到一个「确定没人监听」的端口 */
async function reserveClosedPort() {
  const server = new WebSocketServer({ port: 0 })
  await new Promise((resolve) => server.once('listening', resolve))
  const { port } = server.address()
  await new Promise((resolve) => server.close(resolve))
  return port
}

test('OneBot 适配器：连上 → 断线自动重连 → close() 后彻底停止', async (t) => {
  const wss = new WebSocketServer({ port: 0 })
  await new Promise((resolve) => wss.once('listening', resolve))
  const { port } = wss.address()

  const adapter = new OnebotWebSocketAdapter({
    botId: '10001',
    masterId: '10000',
    reconnectDelay: 50,
    token: 'test-token',
    url: `ws://127.0.0.1:${port}`,
    userAgent: 'test-agent',
  })
  t.after(() => {
    adapter.close()
    wss.close()
  })

  assert.equal(
    await waitFor(() => adapter.isAvaliable()),
    true,
    '应能连上本地 ws 服务',
  )

  const online = adapter.getStatus()
  assert.equal(online.connected, true)
  assert.equal(online.attemptCount, 1)
  assert.ok(online.connectedAt > 0, '连接成功应记录 connectedAt')
  assert.equal(online.lastError, null)

  // 重复 connect 不应堆积旧连接
  adapter.connect('manual')
  assert.equal(await waitFor(() => adapter.isAvaliable()), true)
  await sleep(80)
  assert.equal(wss.clients.size, 1, '重复 connect 必须销毁旧 socket')

  // 对端断线 → 自动重连（由单一定时器驱动，不会双份重连）
  for (const client of wss.clients) client.terminate()
  assert.equal(
    await waitFor(() => adapter.getStatus().attemptCount >= 3),
    true,
    '断线后应自动重连',
  )

  // close() 之后不得再有任何连接尝试
  adapter.close()
  const attemptCountAfterClose = adapter.getStatus().attemptCount
  await sleep(400)
  assert.equal(
    adapter.getStatus().attemptCount,
    attemptCountAfterClose,
    'close() 之后不得再尝试连接',
  )
  assert.equal(adapter.getStatus().stopped, true)
  assert.equal(adapter.isAvaliable(), false)
  assert.equal(adapter.getStatus().readyState, null)
})

test('OneBot 适配器：连不上时记录 lastError 并持续重试', async (t) => {
  const port = await reserveClosedPort()
  const adapter = new OnebotWebSocketAdapter({
    botId: '1',
    masterId: '2',
    reconnectDelay: 50,
    url: `ws://127.0.0.1:${port}`,
    userAgent: 'test-agent',
  })
  t.after(() => adapter.close())

  assert.equal(
    await waitFor(() => Boolean(adapter.getStatus().lastError)),
    true,
    '连接失败应记录 lastError（设置页要能看到失败原因）',
  )
  assert.equal(
    await waitFor(() => adapter.getStatus().attemptCount >= 3),
    true,
    '失败后应持续重试',
  )
  assert.equal(adapter.isAvaliable(), false)
  assert.ok(adapter.getStatus().lastAttemptAt > 0, '应记录尝试时间')
})
