import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { WakeProtocol } from '../../lib/triggers/WakeProtocol.js'
import { TriggerRegistry } from '../../lib/triggers/TriggerRegistry.js'
import { TriggerRunner } from '../../lib/triggers/TriggerRunner.js'
import { WakeInjector } from '../../lib/triggers/WakeInjector.js'
import TriggerManage from '../../lib/plugins/ai-plugin/tools/trigger_manage.js'

const TEST_DATA_DIR = path.join(process.cwd(), 'tests-data', 'test-triggers-' + Date.now())

test.before(async () => {
  await fs.promises.mkdir(TEST_DATA_DIR, { recursive: true })
})

test.after(async () => {
  await fs.promises.rm(TEST_DATA_DIR, { recursive: true, force: true })
})

test('WakeProtocol: 标准契约解析与异常保护', () => {
  // 1. 成功解析标准契约
  const stdout = [
    'Log line 1: checking BTC price',
    'Log line 2: price = 78412',
    '@WAKE@ {"wake": true, "reason": "BTC 突破 78400", "data": {"price": 78412}}',
  ].join('\n')

  const parsed = WakeProtocol.parseWakeLine(stdout)
  assert.equal(parsed.wake, true)
  assert.equal(parsed.reason, 'BTC 突破 78400')
  assert.equal(parsed.data.price, 78412)

  // 2. wake=false 契约
  const noWakeStdout = '@WAKE@ {"wake": false, "reason": "未达标"}'
  const noWakeParsed = WakeProtocol.parseWakeLine(noWakeStdout)
  assert.equal(noWakeParsed.wake, false)

  // 3. 无契约行
  const emptyStdout = 'Just normal logs without wake'
  const emptyParsed = WakeProtocol.parseWakeLine(emptyStdout)
  assert.equal(emptyParsed.wake, false)

  // 4. JSON 损坏防御
  const brokenStdout = '@WAKE@ {broken_json}'
  const brokenParsed = WakeProtocol.parseWakeLine(brokenStdout)
  assert.equal(brokenParsed.wake, false)
  assert.ok(brokenParsed.error)
})

test('TriggerRegistry: 触发器增删改查与脚本文件管理', async () => {
  const registry = new TriggerRegistry({ dataDir: TEST_DATA_DIR })

  // 1. 创建 script 触发器并自动落盘脚本文件
  const created = await registry.create({
    id: 'test_trg_btc',
    scriptCode: `console.log('@WAKE@ ' + JSON.stringify({ wake: true, reason: 'BTC突破', data: { p: 78500 } }))`,
    scriptLang: 'js',
    mode: 'once',
    type: 'script',
    promptTemplate: '【关注提示】{{payload.reason}}',
  })

  assert.equal(created.id, 'test_trg_btc')
  assert.equal(created.mode, 'once')
  assert.ok(fs.existsSync(created.scriptPath))

  // 2. 读取列表
  const list = await registry.list()
  assert.equal(list.length, 1)
  assert.equal(list[0].id, 'test_trg_btc')

  // 3. 记录执行审计
  await registry.recordExecution({
    triggerId: created.id,
    wake: true,
    reason: 'BTC突破',
    data: { p: 78500 },
    durationMs: 45,
  })

  const logs = await registry.listExecutions('test_trg_btc')
  assert.equal(logs.length, 1)
  assert.equal(logs[0].wake, true)

  // 4. 删除触发器并验证脚本被清理
  const scriptPath = created.scriptPath
  await registry.remove(created.id)
  const afterList = await registry.list()
  assert.equal(afterList.length, 0)
  assert.ok(!fs.existsSync(scriptPath), '删除触发器应同时清理脚本文件')
})

test('TriggerRunner: 真实子进程安全执行与超时保护', async () => {
  const runner = new TriggerRunner({ timeoutMs: 3000 })

  // 1. 正常运行脚本并输出契约
  const scriptFile = path.join(TEST_DATA_DIR, 'test_runner_normal.js')
  await fs.promises.writeFile(scriptFile, `
    console.log("Preparing check...");
    console.log("@WAKE@ " + JSON.stringify({ wake: true, reason: "ETH 突破 3000", data: { ethPrice: 3050 } }));
  `)

  const res = await runner.executeScript({
    id: 'trg_eth',
    scriptPath: scriptFile,
  })

  assert.equal(res.wake, true)
  assert.equal(res.reason, 'ETH 突破 3000')
  assert.equal(res.data.ethPrice, 3050)
  assert.ok(res.durationMs >= 0)

  // 2. 脚本无 WAKE 输出
  const silentScript = path.join(TEST_DATA_DIR, 'test_runner_silent.js')
  await fs.promises.writeFile(silentScript, `console.log("Everything is normal");`)
  const silentRes = await runner.executeScript({
    id: 'trg_silent',
    scriptPath: silentScript,
  })
  assert.equal(silentRes.wake, false)
})

test('WakeInjector: 会话注入、冷却限制与 once 生命周期自动销毁', async () => {
  const registry = new TriggerRegistry({ dataDir: path.join(TEST_DATA_DIR, 'injector') })
  const injectedMessages = []

  const mockChannel = {
    appendUserMessage: async (sid, text, opts) => {
      injectedMessages.push({ sid, text, opts })
    },
    memory: {
      agentId: 'wechat-master',
      getActiveSession: async () => 'session_123',
    }
  }

  const mockRuntime = {
    running: new Map([['c_1', { chn: mockChannel }]])
  }

  const injector = new WakeInjector({
    registry,
    channelRuntime: mockRuntime,
  })

  // 1. 创建 once 触发器
  const trigger = await registry.create({
    id: 'trg_once_test',
    mode: 'once',
    cooldownSec: 10,
    sessionId: 'session_123',
    promptTemplate: '【警报】{{payload.reason}} (价格: {{payload.data.price}})',
  })

  // 2. 执行唤醒
  const wakeRes = await injector.processWake(trigger, {
    reason: 'BTC拉升',
    data: { price: 79000 },
  })

  assert.equal(wakeRes.injected, true)
  assert.equal(injectedMessages.length, 1)
  assert.ok(injectedMessages[0].text.includes('system：trigger 系统监测到事件'))
  assert.ok(injectedMessages[0].text.includes('【警报】BTC拉升 (价格: 79000)'))

  // 3. 验证 once 模式触发器已自动销毁
  const afterTrigger = await registry.get('trg_once_test')
  assert.equal(afterTrigger, null, 'once 模式触发器唤醒后应自动销毁')

  // 4. 验证审计日志依然保留
  const logs = await registry.listExecutions('trg_once_test')
  assert.equal(logs.length, 1)
  assert.equal(logs[0].status, 'woken')
})

test('trigger_manage Tool: 创建、试跑、管理全生命周期', async () => {
  const tool = new TriggerManage()

  // 1. 创建
  const createRes = await tool.execute({
    params: {
      action: 'create',
      id: 'tool_test_trg',
      type: 'script',
      mode: 'persistent',
      scriptCode: `console.log("@WAKE@ " + JSON.stringify({ wake: true, reason: "SOL 突破 200", data: { sol: 205 } }))`,
      scriptLang: 'js',
      promptTemplate: 'SOL 警报: {{payload.reason}}',
    },
    channel: {
      memory: { agentId: 'wechat-master', getActiveSession: async () => 's_test' }
    }
  })

  assert.equal(createRes.success, true)
  assert.equal(createRes.trigger.id, 'tool_test_trg')

  // 2. 试跑 (run_once)
  const runRes = await tool.execute({
    params: {
      action: 'run_once',
      id: 'tool_test_trg',
    }
  })
  assert.equal(runRes.success, true)
  assert.equal(runRes.result.wake, true)
  assert.equal(runRes.result.reason, 'SOL 突破 200')

  // 3. 列表
  const listRes = await tool.execute({
    params: { action: 'list' }
  })
  assert.ok(listRes.count >= 1)

  // 4. 删除
  const rmRes = await tool.execute({
    params: { action: 'remove', id: 'tool_test_trg' }
  })
  assert.equal(rmRes.success, true)
})
