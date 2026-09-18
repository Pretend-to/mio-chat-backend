import assert from 'node:assert/strict'
import test from 'node:test'

import SubAgentTool from '../../lib/plugins/agent-manager-plugin/tools/subagent.js'

function registerTools(names, accessByName = {}) {
  const previous = global.middleware
  global.middleware = {
    ...previous,
    llm: {
      getAllTools: () =>
        new Map(
          names.map((name) => [
            name,
            { access: accessByName[name] || null, name },
          ]),
        ),
    },
  }
  return () => {
    global.middleware = previous
  }
}

test('subagent tool derives ownership from execution context and returns an immediate queued receipt', async () => {
  const restoreTools = registerTools([
    'read_mid_hash',
    'subagent_mid_hash',
  ])
  const agentId = 'agent-context'
  const sessionId = 'session-context'
  const createCalls = []
  const runService = {
    createGroup: async (request) => {
      createCalls.push(request)
      return {
        id: 'group-1',
        runs: [
          {
            id: 'run-1',
            jobKey: request.jobs[0].key,
            sessionId: 'child-1',
            status: 'queued',
            toolNamesJson: JSON.stringify(['read_mid_hash']),
          },
        ],
        status: 'dispatched',
      }
    },
  }
  const started = []
  const runtime = {
    dispatcher: {
      startGroup: (groupId) => {
        started.push(groupId)
        return true
      },
    },
    runService,
  }
  const tool = new SubAgentTool({ runtimeFactory: () => runtime })
  try {
    const receipt = await tool.execute({
      agentId,
      body: {
        settings: {
          toolCallSettings: { tools: ['read_mid_hash', 'subagent_mid_hash'] },
        },
      },
      params: {
        action: 'spawn',
        objective: 'Inspect data',
        taskType: 'code_review',
        tools: ['read'],
      },
      sessionId,
    })

    assert.equal(receipt.success, true)
    assert.equal(receipt.runs.length, 1)
    assert.deepEqual(receipt.runs[0].tools, ['read_mid_hash'])
    assert.deepEqual(started, [receipt.groupId])
    assert.equal(createCalls[0].agentId, agentId)
    assert.equal(createCalls[0].parentSessionId, sessionId)
    assert.deepEqual(createCalls[0].allowedToolNames, [
      'read_mid_hash',
      'subagent_mid_hash',
    ])
    assert.deepEqual(createCalls[0].jobs[0].tools, ['read'])
    assert.equal(createCalls[0].jobs[0].taskType, 'code_review')
    assert.equal(createCalls[0].resumeParent, undefined)
  } finally {
    restoreTools()
  }
})

test('subagent continue reuses the completed child run through an explicit follow-up', async () => {
  const calls = []
  const started = []
  const runtime = {
    dispatcher: {
      startGroup: (groupId) => started.push(groupId),
    },
    runService: {
      continueRun: async (runId, options) => {
        calls.push([runId, options])
        return {
          groupId: 'group-1',
          id: 'run-2',
          inputJson: '{}',
          jobKey: 'task',
          sessionId: 'child-1',
          status: 'queued',
          toolNamesJson: '[]',
        }
      },
      getRun: async () => ({ agentId: 'agent-context', id: 'run-1' }),
    },
  }
  const tool = new SubAgentTool({ runtimeFactory: () => runtime })

  const result = await tool.execute({
    agentId: 'agent-context',
    params: {
      action: 'continue',
      instruction: '根据用户反馈补充两个来源',
      runId: 'run-1',
    },
    sessionId: 'session-context',
  })

  assert.equal(result.success, true)
  assert.deepEqual(calls, [
    ['run-1', { instruction: '根据用户反馈补充两个来源' }],
  ])
  assert.deepEqual(started, ['group-1'])
  assert.equal(result.run.sessionId, 'child-1')
})

test('subagent capabilities fully inherits the parent tool snapshot by default', async () => {
  const names = [
    'search_mid_1',
    'read_mid_1',
    'bash_mid_1',
    'wait_mid_1',
    'write_mid_1',
  ]
  const restoreTools = registerTools(names)
  const tool = new SubAgentTool({ runtimeFactory: () => ({}) })
  try {
    const result = await tool.execute({
      agentId: 'agent-context',
      body: {
        settings: {
          toolCallSettings: { tools: names },
        },
      },
      params: { action: 'capabilities' },
      sessionId: 'session-context',
    })

    assert.deepEqual(result.defaultTools, names)
    assert.deepEqual(result.assignableTools, names)
    assert.deepEqual(result.explicitOnlyTools, [])
  } finally {
    restoreTools()
  }
})
