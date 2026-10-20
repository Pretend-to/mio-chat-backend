import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { WakeProtocol } from '../../lib/triggers/WakeProtocol.js'
import { TriggerRegistry } from '../../lib/triggers/TriggerRegistry.js'
import { TriggerRunner } from '../../lib/triggers/TriggerRunner.js'
import { WakeInjector } from '../../lib/triggers/WakeInjector.js'
import { TriggerService } from '../../lib/triggers/index.js'
import SentinelTool from '../../lib/plugins/ai-plugin/tools/sentinel.js'
import { createPrismaFixture } from '../helpers/prismaFixture.js'

let prisma
let closePrisma

const TEST_DATA_DIR = path.join(
  process.cwd(),
  'tests-data',
  'test-triggers-' + Date.now(),
)

test.before(async () => {
  await fs.promises.mkdir(TEST_DATA_DIR, { recursive: true })
  const fixture = await createPrismaFixture()
  prisma = fixture.prisma
  closePrisma = fixture.close
  for (const [agentId, sessionIds] of [
    ['wechat-master', ['session_123', 's_test']],
    ['agent-dedupe', ['session_dedupe']],
    ['agent-running', ['session_running']],
    ['agent-reconcile', ['session_reconcile']],
  ]) {
    await prisma.agent.create({ data: { id: agentId } })
    for (const id of sessionIds) await prisma.session.create({ data: { agentId, id } })
  }
  await prisma.channel.create({
    data: { id: 'sentinel-test-channel', status: 'running', type: 'channel' },
  })
})

test.after(async () => {
  await closePrisma()
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
  const registry = new TriggerRegistry({ dataDir: TEST_DATA_DIR, prisma })

  // 1. 创建 script 触发器并自动落盘脚本文件
  const created = await registry.create({
    agentId: 'wechat-master',
    id: 'test_trg_btc',
    scriptCode: `console.log('@WAKE@ ' + JSON.stringify({ wake: true, reason: 'BTC突破', data: { p: 78500 } }))`,
    scriptLang: 'js',
    mode: 'once',
    type: 'script',
    promptTemplate: '【关注提示】{{payload.reason}}',
    sessionId: 'session_123',
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
  await fs.promises.writeFile(
    scriptFile,
    `
    if (process.argv[2] !== 'test' && process.argv[2] !== 'loop') process.exit(64);
    console.log("Preparing check...");
    console.log("@WAKE@ " + JSON.stringify({ wake: true, reason: "mode=" + process.argv[2], data: { ethPrice: 3050 } }));
  `,
  )

  const res = await runner.executeScript({
    id: 'trg_eth',
    scriptPath: scriptFile,
  })

  assert.equal(res.wake, true)
  assert.equal(res.reason, 'mode=test')
  assert.equal(res.data.ethPrice, 3050)
  assert.ok(res.durationMs >= 0)

  // 2. 脚本无 WAKE 输出
  const silentScript = path.join(TEST_DATA_DIR, 'test_runner_silent.js')
  await fs.promises.writeFile(
    silentScript,
    `if (process.argv[2] !== 'test' && process.argv[2] !== 'loop') process.exit(64); console.log("Everything is normal");`,
  )
  const silentRes = await runner.executeScript({
    id: 'trg_silent',
    scriptPath: silentScript,
  })
  assert.equal(silentRes.wake, false)
})

test('WakeInjector: once trigger stays queued until absorption', async () => {
  const registry = new TriggerRegistry({
    dataDir: path.join(TEST_DATA_DIR, 'injector'),
    prisma,
  })
  const submitted = []
  const dispatcher = {
    onWorkItemStatus() {
      return () => {}
    },
    async submitWake(request) {
      submitted.push(request)
      return {
        eventId: 'event_trigger_once',
        status: 'accepted',
        workItemId: 'work_trigger_once',
      }
    },
  }

  const injector = new WakeInjector({
    dispatcher,
    registry,
  })

  // 1. 创建 once 触发器
  const trigger = await registry.create({
    agentId: 'wechat-master',
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

  assert.equal(wakeRes.accepted, true)
  assert.equal(wakeRes.injected, false)
  assert.equal(wakeRes.status, 'queued')
  assert.equal(submitted.length, 1)
  assert.equal(submitted[0].agentId, 'wechat-master')
  assert.equal(submitted[0].sessionId, 'session_123')
  assert.equal(submitted[0].wakeKind, 'trigger_wake')
  assert.ok(submitted[0].instruction.includes('system：trigger 系统监测到事件'))
  assert.ok(submitted[0].instruction.includes('【警报】BTC拉升 (价格: 79000)'))

  // queued is durable acceptance, but does not consume once until actual start.
  const afterTrigger = await registry.get('trg_once_test')
  assert.ok(afterTrigger, 'queued once trigger must remain until work starts')
  assert.equal(afterTrigger.wakeCount, 0)

  // Actual absorption updates the source audit and consumes the once trigger.
  const [queuedExecution] = await registry.listExecutions('trg_once_test')
  assert.equal(queuedExecution.status, 'queued')
  assert.equal(queuedExecution.wake, false)
  await injector._handleWorkItemStatus({
    previousStatus: 'queued',
    status: 'absorbed',
    workItem: {
      agentId: 'wechat-master',
      eventId: 'event_trigger_once',
      originRef: submitted[0].originRef,
      sessionId: 'session_123',
    },
  })
  assert.equal(await registry.get('trg_once_test'), null)
  const logs = await registry.listExecutions('trg_once_test')
  assert.equal(logs.length, 1)
  assert.equal(logs[0].status, 'absorbed')
  assert.equal(logs[0].wake, true)
})

test('WakeInjector: queued trigger wake is deduplicated after injector restart', async () => {
  const registry = new TriggerRegistry({
    dataDir: path.join(TEST_DATA_DIR, 'injector-dedupe'),
    prisma,
  })
  const trigger = await registry.create({
    agentId: 'agent-dedupe',
    id: 'trg_dedupe',
    mode: 'once',
    sessionId: 'session_dedupe',
  })
  let openItem = null
  let submitCount = 0
  const dispatcher = {
    onWorkItemStatus: () => () => {},
    listOpenWorkItems: async () => (openItem ? [openItem] : []),
    submitWake: async (request) => {
      submitCount += 1
      openItem = {
        agentId: request.agentId,
        eventId: 'event_dedupe',
        id: 'work_dedupe',
        originRef: request.originRef,
        sessionId: request.sessionId,
        status: 'queued',
      }
      return {
        eventId: openItem.eventId,
        status: 'accepted',
        workItemId: openItem.id,
      }
    },
  }
  const first = new WakeInjector({ dispatcher, registry })
  const firstResult = await first.processWake(trigger, { reason: 'once' })
  const restarted = new WakeInjector({ dispatcher, registry })
  const secondResult = await restarted.processWake(trigger, { reason: 'once' })

  assert.equal(firstResult.status, 'queued')
  assert.equal(secondResult.status, 'queued')
  assert.equal(secondResult.eventId, 'event_dedupe')
  assert.equal(submitCount, 1)
  assert.equal((await registry.listExecutions(trigger.id)).length, 1)
})

test('WakeInjector: persistent counters advance once when work starts', async () => {
  const registry = new TriggerRegistry({
    dataDir: path.join(TEST_DATA_DIR, 'injector-running'),
    prisma,
  })
  const trigger = await registry.create({
    agentId: 'agent-running',
    id: 'trg_running',
    mode: 'persistent',
    sessionId: 'session_running',
  })
  let submitted
  const injector = new WakeInjector({
    dispatcher: {
      onWorkItemStatus: () => () => {},
      submitWake: async (request) => {
        submitted = request
        return {
          eventId: 'event_running',
          status: 'accepted',
          workItemId: 'work_running',
        }
      },
    },
    registry,
  })

  await injector.processWake(trigger, { reason: 'started' })
  const [queued] = await registry.listExecutions(trigger.id)
  assert.equal(queued.wake, false)
  assert.equal((await registry.get(trigger.id)).wakeCount, 0)

  const workItem = {
    agentId: trigger.agentId,
    eventId: 'event_running',
    originRef: submitted.originRef,
    sessionId: trigger.sessionId,
  }
  await injector._handleWorkItemStatus({
    previousStatus: 'queued',
    status: 'running',
    workItem,
  })
  await injector._handleWorkItemStatus({
    previousStatus: 'running',
    status: 'running',
    workItem,
  })

  const started = await registry.get(trigger.id)
  const [execution] = await registry.listExecutions(trigger.id)
  assert.equal(started.wakeCount, 1)
  assert.equal(started.fireCount, 1)
  assert.ok(started.lastFiredAt)
  assert.equal(execution.status, 'running')
  assert.equal(execution.wake, true)
})

test('WakeInjector: startup reconciles an already-running open work item', async () => {
  const registry = new TriggerRegistry({
    dataDir: path.join(TEST_DATA_DIR, 'injector-reconcile'),
    prisma,
  })
  const trigger = await registry.create({
    agentId: 'agent-reconcile',
    id: 'trg_reconcile',
    mode: 'persistent',
    sessionId: 'session_reconcile',
  })
  const execution = await registry.recordExecution({
    reason: 'recovered wake',
    status: 'queued',
    triggerId: trigger.id,
    wake: false,
  })
  const openWorkItem = {
    agentId: trigger.agentId,
    eventId: 'event_reconcile',
    id: 'work_reconcile',
    originRef: `trigger_execution:${execution.id}:trigger:${trigger.id}`,
    sessionId: trigger.sessionId,
    status: 'running',
  }
  const dispatcher = {
    onWorkItemStatus: () => () => {},
    listOpenWorkItems: async () => [openWorkItem],
  }
  const injector = new WakeInjector({ dispatcher, registry })

  const reconciled = await injector.reconcileOpenWorkItems()

  assert.equal(reconciled, 1)
  const updatedTrigger = await registry.get(trigger.id)
  const [updatedExecution] = await registry.listExecutions(trigger.id)
  assert.equal(updatedTrigger.wakeCount, 1)
  assert.equal(updatedTrigger.fireCount, 1)
  assert.equal(updatedExecution.status, 'running')
  assert.equal(updatedExecution.wake, true)
})

test('sentinel Tool: 两步流创建、试跑、管理全生命周期', async () => {
  const registry = new TriggerRegistry({
    dataDir: path.join(TEST_DATA_DIR, 'tool-service'),
    prisma,
  })
  const service = new TriggerService({
    injector: new WakeInjector({
      dispatcher: {
        listOpenWorkItems: async () => [],
        onWorkItemStatus: () => () => {},
        submitWake: async () => ({
          eventId: 'event_sentinel_tool',
          status: 'accepted',
          workItemId: 'work_sentinel_tool',
        }),
      },
      registry,
    }),
    registry,
  })
  const tool = new SentinelTool({
    deliveryService: {
      listDeliveryChannels: async () => [],
      resolveDeliveryBinding: async ({ deliveryMode }) => ({
        binding: null,
        deliveryChannelId: null,
        deliveryMode,
      }),
    },
    service,
  })
  const toolContext = {
    agentId: 'wechat-master',
    channelId: 'sentinel-test-channel',
    sessionId: 's_test',
  }
  service.setChannelRuntime({
    running: new Map([
      [
        'sentinel-test-channel',
        {
          channel: { agentId: 'wechat-master', id: 'sentinel-test-channel' },
          chn: {
            appendUserMessage: async () => {},
            channelId: 'sentinel-test-channel',
            id: 'sentinel-test-channel',
            memory: {
              agentId: 'wechat-master',
              getActiveSession: async () => 's_test',
            },
          },
        },
      ],
    ]),
  })

  // 1. 第一步：先落盘独立的哨兵脚本文件
  const testScriptPath = path.join(TEST_DATA_DIR, 'sentinel_sol_test.js')
  await fs.promises.writeFile(
    testScriptPath,
    `
    if (process.argv[2] !== 'test' && process.argv[2] !== 'loop') process.exit(64);
    const params = JSON.parse(process.env.TRIGGER_PARAMS || '{}');
    console.log("@WAKE@ " + JSON.stringify({ wake: true, reason: "SOL 突破 " + (params.target || 200), data: { sol: 205 } }));
    `,
    'utf8',
  )

  // 2. 第二步：调用 sentinel 工具传入 scriptPath 与 params 启动哨兵
  const createRes = await tool.execute({
    ...toolContext,
    params: {
      action: 'create',
      id: 'tool_test_trg',
      mode: 'persistent',
      params: { target: 200 },
      promptTemplate: 'SOL 警报: {{payload.reason}}',
      scriptPath: testScriptPath,
    },
    channel: {
      id: 'sentinel-test-channel',
      memory: {
        agentId: 'wechat-master',
        getActiveSession: async () => 's_test',
      },
    },
  })

  assert.equal(createRes.success, true)
  assert.equal(createRes.trigger.id, 'tool_test_trg')
  assert.equal(createRes.trigger.scriptPath, testScriptPath)

  // 3. 更新哨兵参数并自动重启，使新参数进入 TRIGGER_PARAMS
  const updateRes = await tool.execute({
    ...toolContext,
    params: {
      action: 'update',
      id: 'tool_test_trg',
      params: { target: 210 },
      promptTemplate: 'SOL 更新警报: {{payload.reason}}',
    },
    channel: {
      id: 'sentinel-test-channel',
      memory: {
        agentId: 'wechat-master',
        getActiveSession: async () => 's_test',
      },
    },
  })
  assert.equal(updateRes.success, true)
  assert.equal(updateRes.trigger.params.target, 210)

  // 4. 试跑 (run)

  const runRes = await tool.execute({
    ...toolContext,
    params: {
      action: 'run',
      id: 'tool_test_trg',
    },
  })
  assert.equal(runRes.success, true)
  assert.equal(runRes.result.wake, true)
  assert.equal(runRes.result.reason, 'SOL 突破 210')

  // 5. 列表 (list)
  const listRes = await tool.execute({
    ...toolContext,
    params: { action: 'list' },
  })
  assert.ok(listRes.count >= 1)
  const found = listRes.triggers.find((t) => t.id === 'tool_test_trg')
  assert.ok(found)
  assert.ok(
    [
      'running',
      'waking',
      'wake_queued',
      'woken',
      'restarting',
      'stopped',
    ].includes(found.status),
    JSON.stringify(found),
  )

  // 6. 校验缺少 scriptPath 时报错
  await assert.rejects(async () => {
    await tool.execute({
      ...toolContext,
      params: { action: 'create', id: 'fail_trg' },
    })
  }, /必须提供已落盘的 scriptPath/)

  // 7. 删除 (remove)
  const rmRes = await tool.execute({
    ...toolContext,
    params: { action: 'remove', id: 'tool_test_trg' },
  })
  assert.equal(rmRes.success, true)
})
