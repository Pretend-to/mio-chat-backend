import { test } from 'node:test'
import assert from 'node:assert'
import { EventEmitter } from 'node:events'
import WaitTool from '../../lib/plugins/terminal-pty/tools/wait.js'
import TerminalSessionManager from '../../lib/plugins/terminal-pty/lib/TerminalSessionManager.js'

/**
 * wait 工具测试套件
 *
 * 核心命题：wait 能否【实时】监测到命令执行完毕（事件驱动，而非轮询/sleep 猜测）。
 * 分两层：
 *   A. 单元时序层（mock sessions）——验证事件监听/超时/已完成/未找到/监听清理等纯逻辑
 *   B. 集成时序层（真实 TerminalSessionManager + pty）——用真实命令验证
 *      “命令完成瞬间 wait 立即返回（远早于 timeoutMs）”
 */

// ============ 工具函数：构造 wait 实例 ============
function makeWaitTool(sessions) {
  const tool = new WaitTool()
  tool.parentPlugin = { sessions }
  return tool
}
function exec(tool, params) {
  return tool.func({ params })
}

// ============ Mock sessions（真实 EventEmitter 壳，验证事件驱动逻辑）============
function makeMockSessions(overrides = {}) {
  const ee = new EventEmitter()
  const store = new Map()
  const bg = new Map()
  const base = {
    get: (id) => store.get(id) || null,
    getBgJob: (id) => bg.get(id) || null,
    on: (evt, cb) => ee.on(evt, cb),
    removeListener: (evt, cb) => ee.removeListener(evt, cb),
    listenerCount: (evt) => ee.listenerCount(evt),
    readScreen: () => ({ lines: [], cursor: { x: 0, y: 0 } }),
    readBgScreen: () => ({ lines: [] }),
    ...overrides,
  }
  base._ee = ee
  base._store = store
  base._bg = bg
  return base
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ============================================================
// A. 单元时序层：事件驱动、超时、已完成、未找到、监听清理
// ============================================================
test('A: wait 单元时序', async (t) => {
  await t.test('running 会话：命令完成事件(done)触发后【立即返回】，远早于 timeoutMs（事件驱动而非 sleep）', async () => {
    const sessions = makeMockSessions()
    sessions._store.set('term_1', { id: 'term_1', status: 'running', exitCode: null })
    const tool = makeWaitTool(sessions)

    // timeoutMs 设 5000：若 wait 是"等超时/轮询"会等到 5s；事件驱动应在 emit 后立刻返回
    const promise = exec(tool, { sessionId: 'term_1', timeoutMs: 5000 })
    await sleep(30) // 确保 wait 已挂起监听
    sessions._ee.emit('done', 'term_1', { exitCode: 0, signal: null, status: 'finished' })

    const elapsed = Date.now()
    const r = await promise
    assert.strictEqual(r.status, 'finished')
    assert.strictEqual(r.exitCode, 0)
    assert.ok(Date.now() - elapsed < 500, `事件驱动应立即返回（实际 ${Date.now() - elapsed}ms）`)
  })

  await t.test('done 事件透传非 0 退出码（命令失败场景）', async () => {
    const sessions = makeMockSessions()
    sessions._store.set('term_fail', { id: 'term_fail', status: 'running', exitCode: null })
    const tool = makeWaitTool(sessions)
    const promise = exec(tool, { sessionId: 'term_fail', timeoutMs: 5000 })
    await sleep(30)
    sessions._ee.emit('done', 'term_fail', { exitCode: 3, signal: null, status: 'finished' })
    const r = await promise
    assert.strictEqual(r.exitCode, 3)
  })

  await t.test('done 事件只响应【匹配的】sessionId，不误触发其他会话完成', async () => {
    const sessions = makeMockSessions()
    sessions._store.set('term_a', { id: 'term_a', status: 'running', exitCode: null })
    const tool = makeWaitTool(sessions)
    const promise = exec(tool, { sessionId: 'term_a', timeoutMs: 1000 })
    await sleep(30)
    sessions._ee.emit('done', 'term_b', { exitCode: 0, signal: null }) // 别的会话完成
    await sleep(50)
    assert.strictEqual((await Promise.race([promise, Promise.resolve('__pending__')])), '__pending__', '其他会话完成不应唤醒 wait')
    sessions._ee.emit('done', 'term_a', { exitCode: 0, signal: null })
    const r = await promise
    assert.strictEqual(r.status, 'finished')
  })

  await t.test('超时：命令仍在运行，到 timeoutMs 返回 running（不无限挂起）', async () => {
    const sessions = makeMockSessions()
    sessions._store.set('term_slow', { id: 'term_slow', status: 'running', exitCode: null })
    const tool = makeWaitTool(sessions)
    const start = Date.now()
    const r = await exec(tool, { sessionId: 'term_slow', timeoutMs: 150 })
    const elapsed = Date.now() - start
    assert.strictEqual(r.status, 'running')
    assert.ok(elapsed >= 120 && elapsed < 2000, `超时应约 timeoutMs 返回（实际 ${elapsed}ms）`)
  })

  await t.test('会话已完成(finished)：wait 立即返回其 exitCode，不进入等待', async () => {
    const sessions = makeMockSessions()
    sessions._store.set('term_done', { id: 'term_done', status: 'finished', exitCode: 7 })
    const tool = makeWaitTool(sessions)
    const start = Date.now()
    const r = await exec(tool, { sessionId: 'term_done', timeoutMs: 5000 })
    assert.strictEqual(r.status, 'finished')
    assert.strictEqual(r.exitCode, 7)
    assert.ok(Date.now() - start < 100, '已完成会话应立即返回')
  })

  await t.test('会话不存在：返回 not_found（不挂起）', async () => {
    const sessions = makeMockSessions()
    const tool = makeWaitTool(sessions)
    const r = await exec(tool, { sessionId: 'no_such_term', timeoutMs: 5000 })
    assert.strictEqual(r.status, 'not_found')
    assert.strictEqual(r.success, false)
  })

  await t.test('完成后清理监听器：再次等待不会堆叠 listeners', async () => {
    const sessions = makeMockSessions()
    const tool = makeWaitTool(sessions)
    const before = sessions.listenerCount('done')

    // 第一次：事件完成
    sessions._store.set('t1', { id: 't1', status: 'running', exitCode: null })
    const p1 = exec(tool, { sessionId: 't1', timeoutMs: 5000 })
    await sleep(20)
    sessions._ee.emit('done', 't1', { exitCode: 0 })
    await p1
    assert.strictEqual(sessions.listenerCount('done'), before, '完成路径应移除自身监听')

    // 第二次：超时路径
    sessions._store.set('t2', { id: 't2', status: 'running', exitCode: null })
    await exec(tool, { sessionId: 't2', timeoutMs: 100 })
    assert.strictEqual(sessions.listenerCount('done'), before, '超时路径也应移除自身监听')
  })

  await t.test('无 sessionId：纯 sleep 等待', async () => {
    const tool = makeWaitTool(makeMockSessions())
    const start = Date.now()
    const r = await exec(tool, { timeoutMs: 120 })
    assert.strictEqual(r.status, 'finished')
    assert.ok(Date.now() - start >= 100, '应至少睡满 timeoutMs')
  })
})

// ============================================================
// B. 集成时序层：真实 TerminalSessionManager + pty
// ============================================================
const pluginStub = {
  config: {
    defaultCols: 120,
    defaultRows: 40,
    maxOutputLength: 512 * 1024,
    maxSessions: 20,
    sessionTimeout: 600000,
  },
}

test('B: wait 真实 pty 集成（关键：命令完成瞬间返回，远早于 timeoutMs）', { timeout: 60_000 }, async (t) => {
  await t.test('background job `sleep 1 && echo done`：wait(timeoutMs=8000) 应在 ~1s 返回 exitCode 0 且带输出', async () => {
    const sessions = new TerminalSessionManager(pluginStub)
    const tool = makeWaitTool(sessions)
    const { sessionId } = sessions.runBackground('bg_sleep1', 'sleep 1 && echo done')
    const start = Date.now()
    const r = await exec(tool, { sessionId, timeoutMs: 8000 })
    const elapsed = Date.now() - start
    assert.strictEqual(r.status, 'finished', `命令完成应置 finished（实际: ${r.status}）`)
    assert.strictEqual(r.exitCode, 0)
    assert.ok(elapsed < 4000, `事件驱动：约 1s 返回而非等 8s 超时（实际 ${elapsed}ms）`)
    assert.ok(r.lines.some((l) => l.includes('done')), `应捕获命令输出: ${JSON.stringify(r.lines)}`)
    sessions.destroy?.()
  })

  await t.test('background job 失败命令 `exit 3`：wait 返回 exitCode 3', async () => {
    const sessions = new TerminalSessionManager(pluginStub)
    const tool = makeWaitTool(sessions)
    const { sessionId } = sessions.runBackground('bg_fail', 'exit 3')
    const r = await exec(tool, { sessionId, timeoutMs: 8000 })
    assert.strictEqual(r.status, 'finished')
    assert.strictEqual(r.exitCode, 3)
    sessions.destroy?.()
  })

  await t.test('后台命令超时：`sleep 3` + wait(timeoutMs=800) → 约 800ms 返回 running（真实不误报 finished）', async () => {
    const sessions = new TerminalSessionManager(pluginStub)
    const tool = makeWaitTool(sessions)
    const { sessionId } = sessions.runBackground('bg_slow', 'sleep 3')
    const start = Date.now()
    const r = await exec(tool, { sessionId, timeoutMs: 800 })
    const elapsed = Date.now() - start
    assert.strictEqual(r.status, 'running', `未完成应报 running（实际: ${r.status}）`)
    assert.ok(elapsed >= 700 && elapsed < 2500, `约 timeoutMs 返回（实际 ${elapsed}ms）`)
    // 等它真正结束后，wait 应能立即识别已 finished
    await sleep(2600)
    const r2 = await exec(tool, { sessionId, timeoutMs: 5000 })
    assert.strictEqual(r2.status, 'finished', '命令实际结束后再次 wait 应立即 finished')
    sessions.destroy?.()
  })

  await t.test('PTY 会话路径：wait 挂起期间会话被关闭(close→pty exit→done)→ wait 实时返回 finished', async () => {
    const sessions = new TerminalSessionManager(pluginStub)
    const tool = makeWaitTool(sessions)
    const { sessionId } = await sessions.createSession({ cwd: process.cwd() })
    // 关键：先让 wait 挂起监听，再执行命令并关闭会话
    const waiting = exec(tool, { sessionId, timeoutMs: 8000 })
    await sleep(50)
    const rExec = await sessions.execCommand(sessionId, 'echo pty-done', 10_000)
    assert.strictEqual(rExec.timedOut, false)
    sessions.close(sessionId) // 关闭 → pty onExit → done 事件 → wait 立即返回
    const startWait = Date.now()
    const r = await waiting
    // 契约：关闭后 session 缓冲已销毁（readScreen 为空属预期），wait 的职责是【完成信号 + 退出码】
    assert.strictEqual(r.status, 'finished')
    assert.ok(Date.now() - startWait < 2000, `close 触发 done 后应立即返回（实际 ${Date.now() - startWait}ms）`)
    sessions.destroy?.()
  })

  await t.test('无 sessionId 纯 sleep 真实计时', async () => {
    const sessions = new TerminalSessionManager(pluginStub)
    const tool = makeWaitTool(sessions)
    const start = Date.now()
    const r = await exec(tool, { timeoutMs: 200 })
    assert.strictEqual(r.status, 'finished')
    assert.ok(Date.now() - start >= 190, 'sleep 至少 200ms')
    sessions.destroy?.()
})

  await t.test('前台命令超时后，wait 能等到命令真正完成并返回 finished（命令级检测，而非等满 timeout）', async () => {
    const sessions = new TerminalSessionManager(pluginStub)
    const tool = makeWaitTool(sessions)
    const { sessionId } = await sessions.createSession({ cwd: process.cwd() })
    // 模拟 LLM 前台跑长 build：execCommand 800ms 超时，命令仍在 PTY 里继续
    const rExec = await sessions.execCommand(sessionId, 'sleep 3 && echo BUILD_DONE', 800)
    assert.strictEqual(rExec.timedOut, true, '前台命令应超时')
    await sleep(1200) // LLM 稍后才调 wait（此时 build 尚未结束）
    const start = Date.now()
    const r = await exec(tool, { sessionId, timeoutMs: 8000 })
    const elapsed = Date.now() - start
    assert.strictEqual(r.status, 'finished', `wait 应命令完成后返回 finished（实际 ${r.status}）`)
    assert.ok(elapsed < 6000, `应在命令剩余时间返回，而非 8s 超时（实际 ${elapsed}ms）`)
    assert.ok(r.lines.some((l) => l.includes('BUILD_DONE')), `输出应含 BUILD_DONE: ${JSON.stringify(r.lines.slice(-3))}`)
    sessions.close(sessionId)
    sessions.destroy?.()
  })

  await t.test('命令已跑完（shell 空闲）后再 wait → 立即 finished，不等满 timeout', async () => {
    const sessions = new TerminalSessionManager(pluginStub)
    const tool = makeWaitTool(sessions)
    const { sessionId } = await sessions.createSession({ cwd: process.cwd() })
    const rExec = await sessions.execCommand(sessionId, 'echo quick', 5000)
    assert.strictEqual(rExec.timedOut, false)
    // 命令已完成，shell 空闲。wait 应借助空闲探测立即返回 finished
    const start = Date.now()
    const r = await exec(tool, { sessionId, timeoutMs: 8000 })
    const elapsed = Date.now() - start
    assert.strictEqual(r.status, 'finished')
    assert.ok(elapsed < 2000, `空闲会话 wait 应立即返回（实际 ${elapsed}ms，而非 8s）`)
    sessions.close(sessionId)
    sessions.destroy?.()
  })

  await t.test('read_screen 工具：可读取超时命令的历史底部输出', async () => {
    const sessions = new TerminalSessionManager(pluginStub)
    const readTool = new (await import('../../lib/plugins/terminal-pty/tools/read_screen.js')).default()
    readTool.parentPlugin = { sessions }
    const { sessionId } = await sessions.createSession({ cwd: process.cwd() })
    await sessions.execCommand(sessionId, 'echo SCREEN_TAIL_MARKER', 5000)
    const r = await readTool.func({ params: { sessionId, tail: 20 } })
    assert.strictEqual(r.success, true)
    assert.ok(r.lines.some((l) => l.includes('SCREEN_TAIL_MARKER')), `read_screen 应读到输出: ${JSON.stringify(r.lines?.slice(-3))}`)
    sessions.close(sessionId)
    sessions.destroy?.()
  })
})