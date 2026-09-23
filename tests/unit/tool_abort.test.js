import { test } from 'node:test'
import assert from 'node:assert'

import '../adapters/mock-env.js'

import llmService from '../../lib/chat/llm/index.js'

/**
 * 回归防护：用户中断（USER_ABORT）必须从 runTool 冒泡出去，
 * 交给 adapters/base.js 的 _handleToolCalls 落成「已中止」终态
 * （action: finished + status: aborted + result: 'User aborted.'）。
 *
 * 曾经 runTool 的 catch 把 USER_ABORT 一并吞成普通失败结果
 * （result: { error: 'USER_ABORT' }），导致：
 *   - base.js 里的 abort 分支成为死代码；
 *   - 前端只收到一个 finished 结果、拿不到 status: 'aborted'，
 *     工具条停在 running，计时器一直跑。
 */
function createAbortableEvent() {
  const callbacks = []
  return {
    aborted: false,
    agentId: null,
    conversationKind: 'direct',
    sessionId: null,
    settings: {},
    source: 'web',
    triggerKind: 'interactive',
    update: () => {},
    onAbort(callback) {
      callbacks.push(callback)
    },
    fireAbort() {
      this.aborted = true
      for (const callback of callbacks) callback()
    },
  }
}

function registerSlowTool({ name, delayMs = 5_000 }) {
  const tool = {
    access: null,
    description: 'test tool',
    name,
    parentPlugin: null,
    timeout: 30,
    async run() {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
      return { ok: true }
    },
  }
  llmService.setPlugins([
    {
      getTools: () => new Map([['test-plugin', [tool]]]),
      name: 'test-plugin',
    },
  ])
  return tool
}

test('runTool: 用户中断冒泡为 USER_ABORT（不被吞成普通失败结果）', async () => {
  const tool = registerSlowTool({ name: 'slow_tool_mid_aborttest' })
  const event = createAbortableEvent()

  const pending = llmService.runTool(
    { name: tool.name, parameters: '{}' },
    { id: 'test-user' },
    event,
  )

  setTimeout(() => event.fireAbort(), 10)

  await assert.rejects(
    () => pending,
    (error) => error?.message === 'USER_ABORT',
    'runTool 必须把 USER_ABORT 原样抛出，而不是返回 result:{error:"USER_ABORT"}',
  )
})

test('runTool: 普通异常仍按原样包成失败结果（不误伤）', async () => {
  const tool = {
    access: null,
    description: 'test tool',
    name: 'boom_tool_mid_aborttest',
    parentPlugin: null,
    timeout: 30,
    async run() {
      throw new Error('boom')
    },
  }
  llmService.setPlugins([
    { getTools: () => new Map([['test-plugin', [tool]]]), name: 'test-plugin' },
  ])

  const result = await llmService.runTool(
    { name: tool.name, parameters: '{}' },
    { id: 'test-user' },
    createAbortableEvent(),
  )

  assert.strictEqual(result.call.name, tool.name)
  assert.deepStrictEqual(result.result, { error: 'boom' })
})
