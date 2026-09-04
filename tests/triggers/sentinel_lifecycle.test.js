import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { TriggerRegistry } from '../../lib/triggers/TriggerRegistry.js'
import { TriggerRunner } from '../../lib/triggers/TriggerRunner.js'
import { TriggerService } from '../../lib/triggers/index.js'
import { WakeInjector } from '../../lib/triggers/WakeInjector.js'
import { WakeProtocol } from '../../lib/triggers/WakeProtocol.js'

const tempDirs = []

async function makeTempDir() {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mio-sentinel-'))
  tempDirs.push(dir)
  return dir
}

test.after(async () => {
  for (const dir of tempDirs) {
    await fs.promises.rm(dir, { force: true, recursive: true })
  }
})

test('WakeProtocol: rejects invalid and oversized payloads', () => {
  const invalid = WakeProtocol.parseWakeLine(
    '@WAKE@ {"wake":true,"data":["not","an","object"]}',
  )
  assert.equal(invalid.wake, false)
  assert.match(invalid.error, /data.*object/i)

  const oversized = WakeProtocol.parseWakeLine(
    `@WAKE@ ${JSON.stringify({ data: { value: 'x'.repeat(17 * 1024) }, wake: true })}`,
  )
  assert.equal(oversized.wake, false)
  assert.match(oversized.error, /exceeds/i)
})

test('TriggerRegistry: mutating operations can be scoped to an agent', async () => {
  const dataDir = await makeTempDir()
  const registry = new TriggerRegistry({ dataDir })
  await registry.create({ agentId: 'agent-a', id: 'shared-id' })

  assert.equal(await registry.get('shared-id', { agentId: 'agent-b' }), null)
  assert.equal(
    await registry.update('shared-id', { enabled: false }, { agentId: 'agent-b' }),
    null,
  )
  assert.equal(await registry.remove('shared-id', { agentId: 'agent-b' }), false)
  assert.equal(
    (await registry.get('shared-id', { agentId: 'agent-a' })).enabled,
    true,
  )
})

test('WakeInjector: missing target does not fall back to another channel', async () => {
  const dataDir = await makeTempDir()
  const registry = new TriggerRegistry({ dataDir })
  const trigger = await registry.create({
    agentId: 'agent-a',
    channelId: 'channel-a',
    id: 'target-test',
  })
  const messages = []
  const injector = new WakeInjector({
    channelRuntime: {
      running: new Map([
        [
          'channel-b',
          {
            channel: { agentId: 'agent-b', id: 'channel-b' },
            chn: { appendUserMessage: async (...args) => messages.push(args) },
          },
        ],
      ]),
    },
    registry,
  })

  const result = await injector.processWake(trigger, {
    data: { ok: true },
    reason: 'target check',
  })
  assert.equal(result.injected, false)
  assert.equal(result.status, 'target_unavailable')
  assert.equal(messages.length, 0)
})

test('TriggerService: once keeps its process lifecycle after a failed injection', async () => {
  const trigger = {
    agentId: 'agent-a',
    enabled: true,
    id: 'once-retry',
    mode: 'once',
    type: 'script',
  }
  const service = new TriggerService({
    injector: {
      processWake: async () => ({ injected: false, status: 'inject_failed' }),
    },
    registry: {
      get: async () => trigger,
      update: async () => trigger,
    },
    runner: { startScript: () => null },
  })
  const state = {
    handle: { stop: () => true },
    status: 'running',
    stopRequested: false,
  }

  await service._handleScriptWake(
    trigger,
    state,
    { data: {}, reason: 'retry me' },
    { durationMs: 1 },
  )
  assert.equal(state.stopRequested, false)
  assert.equal(state.restartRequested, true)
  assert.equal(state.status, 'wake_skipped')
})

test('TriggerRunner: long-lived script emits one wake and can be killed by PID handle', async () => {
  const dataDir = await makeTempDir()
  const scriptPath = path.join(dataDir, 'loop.js')
  await fs.promises.writeFile(
    scriptPath,
    `if (process.argv[2] !== 'loop') process.exit(64); setTimeout(() => console.log('@WAKE@ ' + JSON.stringify({wake:true, reason:'ready', data:{pid:process.pid}})), 30); setInterval(() => {}, 1000)`,
  )
  const runner = new TriggerRunner()
  const wake = new Promise((resolve, reject) => {
    let handle
    handle = runner.startScript(
      { agentId: 'agent-a', id: 'loop-test', scriptPath },
      {
        onError: reject,
        onWake: (payload) => {
          assert.equal(payload.reason, 'ready')
          assert.ok(handle.pid > 0)
          handle.stop()
          resolve(payload)
        },
        onExit: (result) => {
          if (!result.wake) reject(new Error('long-lived script exited before wake'))
        },
      },
    )
    assert.ok(handle.pid > 0)
  })
  await wake
})

test('TriggerService: startScheduler starts each sentinel once without cron polling', async () => {
  const trigger = {
    agentId: 'agent-a',
    enabled: true,
    id: 'persistent-test',
    mode: 'persistent',
    type: 'script',
  }
  let starts = 0
  const service = new TriggerService({
    injector: { processWake: async () => ({ injected: true }) },
    registry: {
      get: async () => trigger,
      list: async () => [trigger],
      recordExecution: async () => {},
    },
    runner: {
      startScript: () => {
        starts += 1
        return { pid: starts, startedAt: Date.now(), stop: () => true }
      },
      executeScript: async () => ({ wake: false }),
    },
  })

  await service.startScheduler(1)
  await new Promise((resolve) => setTimeout(resolve, 30))
  assert.equal(starts, 1)
  service.stopScheduler()
})

test('TriggerService: persistent sentinel recovers when exit audit fails', async () => {
  const trigger = {
    agentId: 'agent-a',
    enabled: true,
    id: 'audit-recovery',
    mode: 'persistent',
    type: 'script',
  }
  let starts = 0
  let failAudit = true
  const service = new TriggerService({
    registry: {
      get: async () => trigger,
      recordExecution: async () => {
        if (failAudit) {
          failAudit = false
          throw new Error('temporary audit failure')
        }
      },
    },
    runner: {
      startScript: (_trigger, callbacks) => {
        starts += 1
        return {
          done: Promise.resolve(),
          pid: starts,
          startedAt: Date.now(),
          stop: () => true,
          callbacks,
        }
      },
    },
  })

  await service.startTrigger(trigger)
  const state = service._processes.get(trigger.id)
  const current = service._processes.get(trigger.id)
  assert.ok(current)
  await assert.doesNotReject(
    current.handle.callbacks.onExit({
      code: 1,
      durationMs: 1,
      signal: null,
      stderr: 'crashed',
      stdout: '',
      wake: false,
    }),
  )
  assert.equal(service._processes.has(trigger.id), false)

  await new Promise((resolve) => setTimeout(resolve, 650))
  assert.equal(starts, 2)
  assert.ok(service._processes.has(trigger.id))
  assert.equal(service.getRuntimeState(trigger.id).status, 'running')
  service.stopScheduler()
  assert.ok(state)
})
