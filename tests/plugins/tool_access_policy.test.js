import test from 'node:test'
import assert from 'node:assert/strict'

import { MioFunction } from '../../lib/function.js'
import {
  evaluateToolAccess,
  normalizeToolAccessContext,
  resolveToolAccess,
} from '../../lib/chat/llm/toolPolicy.js'
import llm from '../../lib/chat/llm/index.js'

function createTool(options = {}) {
  return new MioFunction({
    description: 'Policy test tool',
    func: async () => ({ success: true }),
    name: options.name || 'policy_test',
    parameters: { properties: {}, type: 'object' },
    ...options,
  })
}

test('MioFunction projections return null before reading a forbidden schema', () => {
  let descriptionReads = 0
  const tool = createTool({
    access: { requires: { agentContext: true } },
  })
  tool.getDescription = () => {
    descriptionReads++
    return 'sensitive description'
  }

  assert.equal(
    tool.json('openai', {
      conversationKind: 'none',
      source: 'web',
      triggerKind: 'interactive',
      user: { isAdmin: true },
    }),
    null,
  )
  assert.equal(tool.toCatalogEntry({ source: 'web' }), null)
  assert.equal(tool.toMetaSummary({ source: 'web' }), null)
  assert.equal(descriptionReads, 0)
})

test('verified Agent-shaped runtime context exposes agent tools on every ingress', () => {
  const tool = createTool({
    access: { requires: { agentContext: true } },
  })
  for (const source of ['web', 'channel', 'internal']) {
    const context = {
      agentId: 'agent-1',
      conversationKind: 'direct',
      sessionId: 'session-1',
      source,
      triggerKind: source === 'internal' ? 'task' : 'interactive',
      user: { isAdmin: true },
    }
    assert.ok(tool.json('openai', context))
  }
})

test('plugin policy defaults can only be narrowed by a tool policy', () => {
  const tool = createTool({
    access: {
      delegation: 'deny',
      scene: { sources: ['web', 'channel'] },
    },
  })
  tool.setPlugin({
    access: {
      requires: { agentContext: true },
      scene: { sources: ['channel', 'internal'] },
    },
    enabled: true,
    name: 'policy-plugin',
  })

  const policy = resolveToolAccess(tool)
  assert.deepEqual(policy.scene.sources, ['channel'])
  assert.equal(policy.requires.agentContext, true)
  assert.equal(policy.delegation, 'deny')
  assert.equal(
    evaluateToolAccess(
      tool,
      {
        agentId: 'agent-1',
        conversationKind: 'direct',
        sessionId: 'session-1',
        source: 'channel',
        triggerKind: 'interactive',
      },
      'assign',
    ).reason,
    'delegation_denied',
  )
})

test('scene and principal requirements compose without legacy flags', () => {
  const tool = createTool({
    access: {
      requires: { admin: true },
      scene: { sources: ['channel'] },
    },
  })
  assert.equal(
    evaluateToolAccess(
      tool,
      { source: 'web', user: { isAdmin: true } },
      'schema',
    ).reason,
    'source_not_allowed',
  )
  assert.equal(
    evaluateToolAccess(
      tool,
      { source: 'channel', user: { isAdmin: false } },
      'schema',
    ).reason,
    'admin_required',
  )
  assert.equal(
    evaluateToolAccess(
      tool,
      { source: 'channel', user: { isAdmin: true } },
      'schema',
    ).allowed,
    true,
  )
})

test('historical SessionTurn sources normalize into orthogonal dimensions', () => {
  assert.deepEqual(
    normalizeToolAccessContext({
      agentId: 'agent-1',
      sessionId: 'session-1',
      source: 'subagent',
      subagentRunId: 'run-1',
    }),
    {
      agentId: 'agent-1',
      conversationKind: 'none',
      isAdmin: false,
      principal: {},
      sessionId: 'session-1',
      sessionKind: 'subagent',
      source: 'internal',
      subagentRunId: 'run-1',
      toolAllowlist: null,
      triggerKind: 'task',
    },
  )
})

test('catalog generation omits null projections and empty plugin groups', () => {
  const publicTool = createTool({ name: 'public_catalog_tool' })
  const agentTool = createTool({
    access: { requires: { agentContext: true } },
    name: 'agent_catalog_tool',
  })
  llm.setPlugins([
    {
      getTools: () =>
        new Map([
          ['public-plugin', [publicTool]],
          ['agent-plugin', [agentTool]],
        ]),
    },
  ])

  const localCatalog = llm.serveToolsList({
    conversationKind: 'none',
    source: 'web',
    triggerKind: 'interactive',
    user: { isAdmin: true },
  })
  assert.ok(localCatalog['public-plugin'])
  assert.equal(localCatalog['agent-plugin'], undefined)

  const agentCatalog = llm.serveToolsList({
    agentId: 'agent-1',
    conversationKind: 'direct',
    sessionId: 'session-1',
    source: 'web',
    triggerKind: 'interactive',
    user: { isAdmin: true },
  })
  assert.ok(agentCatalog['agent-plugin'])
})
