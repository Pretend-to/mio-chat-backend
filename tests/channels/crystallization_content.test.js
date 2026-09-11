import assert from 'node:assert/strict'
import test from 'node:test'

import { createBackendLlm } from '../../channels/llm.js'
import { coalesceCrystallizeEvents } from '../../lib/chat/crystallizationContent.js'

test('累计式结晶快照合并为单个事件并保留最终内容', () => {
  const content = coalesceCrystallizeEvents([
    { data: { text: 'before' }, type: 'text' },
    {
      data: { status: 'running', summary: '<' },
      type: 'crystallize_event',
    },
    { data: { text: 'after' }, type: 'text' },
    {
      data: { status: 'running', summary: '<long' },
      type: 'crystallize_event',
    },
    {
      data: { status: 'finished', summary: '<long_term>ok</long_term>' },
      type: 'crystallize_event',
    },
  ])

  assert.equal(
    content.filter(item => item.type === 'crystallize_event').length,
    1,
  )
  assert.deepEqual(content[1], {
    data: {
      status: 'finished',
      summary: '<long_term>ok</long_term>',
    },
    type: 'crystallize_event',
  })
  assert.equal(content[2].data.text, 'after')
})

test('Channel 落盘内容不会把每个结晶 chunk 保存成独立事件', async () => {
  const llm = createBackendLlm({
    llmService: {
      handleMessage: async event => {
        await event.update({
          content: { status: 'running' },
          type: 'crystallize',
        })
        await event.update({
          content: { status: 'running', summary: '<' },
          type: 'crystallize',
        })
        await event.update({
          content: { status: 'running', summary: '<long' },
          type: 'crystallize',
        })
        await event.update({
          content: {
            commit: true,
            status: 'finished',
            summary: '<long_term>ok</long_term>',
          },
          type: 'crystallize',
        })
        await event.complete()
      },
    },
  })

  const result = await llm.process({
    channel: {},
    chat: [],
    crystal: '',
    globalMem: '',
    memory: {
      clearPendingMemories: async () => {},
      getAgentMeta: async () => null,
      rotateChat: async () => ({ rotated: false }),
      setCrystal: async () => {},
    },
    sessionId: 'session-crystal-stream',
    text: 'current',
  })

  const events = result.content.filter(
    item => item.type === 'crystallize_event',
  )
  assert.equal(events.length, 1)
  assert.deepEqual(events[0].data, {
    status: 'finished',
    summary: '<long_term>ok</long_term>',
  })
})
