import assert from 'node:assert/strict'
import test from 'node:test'

import './mock-env.js'
import BaseLLMAdapter from '../../lib/chat/llm/adapters/base.js'
import CrystallizationService from '../../lib/chat/llm/services/CrystallizationService.js'

function makeEvent() {
  const updates = []
  return {
    _updates: updates,
    body: {
      messages: [
        { content: 'old', role: 'user' },
        { content: 'old answer', role: 'assistant' },
        { content: 'current', role: 'user' },
      ],
      settings: {
        crystallization: { enabled: true },
        crystallization_keep_turns: 1,
        crystallization_token_watermark: 1,
        previous_summary: '<memory_crystal>old</memory_crystal>',
      },
    },
    lastUsage: { prompt_tokens: 100 },
    update: (data) => updates.push(data),
  }
}

test('crystallization lifecycle emits an explicit commit only for valid LLM output', async (t) => {
  const adapter = Object.create(BaseLLMAdapter.prototype)
  const originalCompress = CrystallizationService.compress
  t.after(() => {
    CrystallizationService.compress = originalCompress
  })

  await t.test('successful mock output is committable', async () => {
    const event = makeEvent()
    CrystallizationService.compress = async () => ({
      messages: [{ content: 'new context', role: 'system' }],
      summary: '<memory_crystal>new</memory_crystal>',
    })

    await adapter._checkAndCrystallize(event)

    const final = event._updates.at(-1)
    assert.equal(final.type, 'crystallize')
    assert.deepEqual(final.content, {
      commit: true,
      status: 'finished',
      summary: '<memory_crystal>new</memory_crystal>',
    })
  })

  await t.test('empty mock output is not committable', async () => {
    const event = makeEvent()
    CrystallizationService.compress = async () => null

    await adapter._checkAndCrystallize(event)

    assert.deepEqual(event._updates.at(-1).content, {
      commit: false,
      status: 'failed',
    })
  })

  await t.test('thrown mock error is not committable', async () => {
    const event = makeEvent()
    CrystallizationService.compress = async () => {
      throw new Error('mock LLM failed')
    }

    await adapter._checkAndCrystallize(event)

    assert.deepEqual(event._updates.at(-1).content, {
      commit: false,
      error: 'mock LLM failed',
      status: 'failed',
    })
  })
})
