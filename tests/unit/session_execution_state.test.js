import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getSessionYolo,
  setSessionYolo,
} from '../../lib/chat/sessionExecutionState.js'

test('YOLO can be enabled for one explicit Session', async () => {
  let persisted = null
  const memory = {
    getAgentMeta: async () => ({ another: true }),
    setAgentMeta: async (key, value) => {
      assert.equal(key, 'session_yolo')
      persisted = value
    },
  }

  assert.equal(await setSessionYolo(memory, 'session-1', true), true)
  assert.deepEqual(persisted, { another: true, 'session-1': true })
})

test('SubAgent Sessions dynamically inherit YOLO from their parent Session', async () => {
  const sessions = new Map([
    ['child', { id: 'child', parentSessionId: 'parent' }],
    ['parent', { id: 'parent', parentSessionId: null }],
  ])
  const memory = {
    getAgentMeta: async () => ({ parent: true }),
    getSession: async (id) => sessions.get(id) || null,
  }

  assert.equal(await getSessionYolo(memory, 'child'), true)
})

test('YOLO inheritance safely terminates malformed Session cycles', async () => {
  const memory = {
    getAgentMeta: async () => ({}),
    getSession: async (id) => ({ parentSessionId: id }),
  }

  assert.equal(await getSessionYolo(memory, 'child'), false)
})
