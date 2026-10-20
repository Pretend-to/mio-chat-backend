import assert from 'node:assert/strict'
import test from 'node:test'

import { createBackendLlm } from '../../channels/llm.js'
import streamCache from '../../lib/server/socket.io/services/streamCache.js'
import SubAgentExecutor from '../../lib/subagents/SubAgentExecutor.js'

test('SubAgentExecutor runs the exact child Session with a frozen tool snapshot', async () => {
  const calls = []
  let reads = 0
  const memory = {
    getSession: async () => {
      reads += 1
      if (reads === 1) {
        return { chat: [{ role: 'assistant', text: 'old result' }] }
      }
      return {
        chat: [
          { role: 'assistant', text: 'old result' },
          {
            content: [{ data: { text: 'fresh result' }, type: 'text' }],
            role: 'assistant',
          },
        ],
      }
    },
  }
  const sessionTurns = {
    getMemory: async (agentId) => {
      assert.equal(agentId, 'agent-1')
      return memory
    },
    runTurn: async (request) => {
      calls.push(request)
      return { deliveryStatus: 'not_requested', reply: null }
    },
  }
  const executor = new SubAgentExecutor({ sessionTurns })
  const result = await executor.execute({
    agentId: 'agent-1',
    id: 'run-1',
    groupId: 'group-1',
    inputJson: JSON.stringify({
      contextDigest: 'only relevant facts',
      continuationInstruction: 'Add two sources',
    }),
    jobKey: 'research',
    objective: 'Research the topic',
    outputContractJson: JSON.stringify({ type: 'brief' }),
    parentSessionId: 'parent-1',
    sessionId: 'child-1',
    toolNamesJson: JSON.stringify(['read_mid_hash']),
  })

  assert.equal(calls.length, 1)
  assert.equal(calls[0].agentId, 'agent-1')
  assert.equal(calls[0].sessionId, 'child-1')
  assert.equal(calls[0].subagentRunId, 'run-1')
  assert.equal(calls[0].isTask, true)
  assert.equal(calls[0].isWeb, false)
  assert.equal(calls[0].messageId, 'msg_subagent_run-1')
  assert.equal(calls[0].streamContactorId, 'sub_agent_child-1')
  assert.deepEqual(calls[0].subagentContact, {
    agentId: 'agent-1',
    groupId: 'group-1',
    id: 'run-1',
    jobKey: 'research',
    objective: 'Research the topic',
    parentSessionId: 'parent-1',
    role: 'research',
    runId: 'run-1',
    sessionId: 'child-1',
    status: undefined,
  })
  assert.deepEqual(calls[0].toolNames, ['read_mid_hash'])
  assert.equal(calls[0].principal.isAdmin, true)
  assert.deepEqual(calls[0].approvalTarget, {
    agentId: 'agent-1',
    approvalSource: 'subagent',
    label: 'research',
    parentSessionId: 'parent-1',
    sourceSessionId: 'child-1',
    subagentRunId: 'run-1',
  })
  assert.match(calls[0].text, /Research the topic/)
  assert.match(calls[0].text, /同一 SubAgent Session 的后续回合/)
  assert.match(calls[0].text, /Add two sources/)
  assert.equal(result.resultText, 'fresh result')
  assert.equal(result.resultJson.messageId, null)
})

test('SubAgent stream is routed to its child contact in real time', async (t) => {
  const contactorId = 'sub_agent_child-stream'
  const messageId = 'msg_subagent_run-stream'
  const subagentContact = {
    agentId: 'agent-stream',
    id: 'run-stream',
    parentSessionId: 'parent-stream',
    runId: 'run-stream',
    sessionId: 'child-stream',
    status: 'running',
  }
  t.after(() => streamCache.delete('admin', contactorId))
  const llm = createBackendLlm({
    llmService: {
      handleMessage: async (event) => {
        await event.update({
          content: 'streamed child result',
          type: 'content',
        })
        await event.complete()
      },
    },
  })

  await llm.process({
    agentId: 'agent-stream',
    channel: { channelType: 'session', log: { info: () => {} } },
    chat: [],
    isTask: true,
    isWeb: false,
    memory: {
      agentId: 'agent-stream',
      getAgentMeta: async () => 0,
    },
    messageId,
    sessionId: 'child-stream',
    source: 'subagent',
    streamContactorId: contactorId,
    subagentContact,
    text: 'do work',
    toolNames: ['bash_mid_test', 'write_mid_test'],
  })

  const cached = streamCache
    .snapshot('admin', contactorId)
    .find((item) => item.messageId === messageId)
  assert.equal(cached?.status, 'completed')
  assert.equal(cached?.metaData?.contactorId, contactorId)
  assert.deepEqual(cached?.metaData?.subagentContact, subagentContact)
})

test('SubAgentExecutor keeps process narration out of the final answer', async () => {
  const finalAssistant = {
    content: [
      {
        data: { text: "I'll start by reproducing the failure." },
        type: 'text',
      },
      {
        data: { name: 'bash_mid_test', result: 'exit 1' },
        type: 'tool_call',
      },
      { data: { text: 'Now let me fix it.' }, type: 'text' },
      {
        data: { name: 'write_mid_test', result: 'ok' },
        type: 'tool_call',
      },
      {
        data: { text: 'Root cause: the cache key ignored the tenant id.' },
        type: 'text',
      },
      {
        data: { text: 'Fix: prefix the key with the tenant id.' },
        type: 'text',
      },
    ],
    id: 'msg-child-1',
    role: 'assistant',
    // The persisted flatten of the whole turn: narration glued to answer.
    text: "I'll start by reproducing the failure.\nNow let me fix it.\nRoot cause: the cache key ignored the tenant id.\nFix: prefix the key with the tenant id.",
  }
  let reads = 0
  const memory = {
    getSession: async () => {
      reads += 1
      return {
        chat:
          reads === 1
            ? [{ role: 'user', text: 'go' }]
            : [{ role: 'user', text: 'go' }, finalAssistant],
      }
    },
  }
  const sessionTurns = {
    getMemory: async () => memory,
    runTurn: async () => ({ deliveryStatus: 'not_requested', reply: null }),
  }
  const executor = new SubAgentExecutor({ sessionTurns })
  const result = await executor.execute({
    agentId: 'agent-1',
    id: 'run-trace',
    groupId: 'group-trace',
    inputJson: '{}',
    jobKey: 'trace',
    objective: 'Split trace from answer',
    outputContractJson: '{}',
    parentSessionId: 'parent-1',
    sessionId: 'child-trace',
    toolNamesJson: JSON.stringify(['bash_mid_test']),
  })

  assert.equal(
    result.resultText,
    'Root cause: the cache key ignored the tenant id.\nFix: prefix the key with the tenant id.',
  )
  assert.equal(result.resultJson.summary, result.resultText)
  assert.equal(
    result.resultJson.trace,
    "I'll start by reproducing the failure.\nNow let me fix it.",
  )
  assert.equal(result.resultJson.truncated, false)
  assert.equal(result.resultJson.traceTruncated, false)
})
