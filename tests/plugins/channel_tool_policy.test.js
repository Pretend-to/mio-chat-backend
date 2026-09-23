import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyAgentToolPolicy,
  evaluateToolAccess,
  getAgentToolNames,
  getPluginToolNames,
  isToolAllowed,
} from '../../lib/chat/llm/toolPolicy.js'
import { ChatEventFactory } from '../../lib/chat/llm/events/ChatEventFactory.js'
import ManageScheduledTasks from '../../lib/plugins/ai-plugin/tools/cron.js'
import SentinelTool from '../../lib/plugins/ai-plugin/tools/sentinel.js'

function tool(name, options = {}) {
  return { name, ...options }
}

test('Agent policy exposes the dedicated manager and three execution plugin sets', () => {
  const previous = global.middleware
  global.middleware = {
    plugins: [
      {
        name: 'ai-plugin',
        getTools: () =>
          new Map([
            [
              'ai-plugin',
              [
                tool('memory_mid_1'),
                tool('agent_action_mid_1', {
                  access: { requires: { agentContext: true } },
                }),
              ],
            ],
          ]),
      },
      {
        access: { requires: { agentContext: true } },
        name: 'agent-manager-plugin',
        getTools: () =>
          new Map([
            [
              'agent-manager-plugin',
              [
                tool('agent_profile_mid_1'),
                tool('agent_model_mid_1'),
                tool('agent_session_mid_1'),
              ],
            ],
          ]),
      },
      {
        name: 'terminal-pty',
        getTools: () =>
          new Map([
            [
              'terminal-pty',
              [
                tool('bash_mid_1'),
                tool('bash_input_mid_1'),
                tool('read_screen_mid_1'),
                tool('shell_policy_mid_1'),
                tool('wait_mid_1'),
              ],
            ],
          ]),
      },
      {
        name: 'file-editor-plugin',
        getTools: () =>
          new Map([
            [
              'file-editor-plugin',
              [tool('read_mid_1'), tool('write_mid_1'), tool('replace_mid_1')],
            ],
          ]),
      },
      {
        name: 'other-plugin',
        getTools: () => new Map([['other-plugin', [tool('other_mid_1')]]]),
      },
    ],
  }

  try {
    const event = {
      body: {
        settings: {
          toolCallSettings: {
            mode: 'NONE',
            passthrough: true,
            tools: ['other_mid_1'],
          },
        },
      },
    }
    assert.equal(applyAgentToolPolicy(event), false)
    assert.deepEqual(event.body.settings.toolCallSettings, {
      mode: 'NONE',
      passthrough: true,
      tools: ['other_mid_1'],
    })

    const channelEvent = ChatEventFactory.createMock({
      agentId: 'agent-1',
      body: {},
      channel: { type: 'weixin-ilink' },
      source: 'channel',
    })
    assert.equal(applyAgentToolPolicy(channelEvent), true)
    assert.deepEqual(channelEvent.body.settings.toolCallSettings.tools, [
      'memory_mid_1',
      'agent_action_mid_1',
      'agent_profile_mid_1',
      'agent_model_mid_1',
      'agent_session_mid_1',
      'bash_mid_1',
      'bash_input_mid_1',
      'read_screen_mid_1',
      'shell_policy_mid_1',
      'wait_mid_1',
      'read_mid_1',
      'write_mid_1',
      'replace_mid_1',
    ])
    assert.deepEqual(getAgentToolNames(channelEvent), [
      'memory_mid_1',
      'agent_action_mid_1',
      'agent_profile_mid_1',
      'agent_model_mid_1',
      'agent_session_mid_1',
      'bash_mid_1',
      'bash_input_mid_1',
      'read_screen_mid_1',
      'shell_policy_mid_1',
      'wait_mid_1',
      'read_mid_1',
      'write_mid_1',
      'replace_mid_1',
    ])
    const webAgentEvent = ChatEventFactory.createMock({
      agentId: 'agent-1',
      body: {},
      channel: null,
      sessionId: 'session-1',
      source: 'web',
    })
    assert.equal(applyAgentToolPolicy(webAgentEvent), true)
    assert.deepEqual(
      webAgentEvent.body.settings.toolCallSettings.tools,
      channelEvent.body.settings.toolCallSettings.tools,
    )
    assert.deepEqual(getPluginToolNames('other-plugin'), ['other_mid_1'])
  } finally {
    global.middleware = previous
  }
})

test('Task policy keeps its explicit tool allowlist even with Agent context', () => {
  const event = ChatEventFactory.createMock({
    channel: { type: 'weixin-ilink' },
    settings: {
      toolCallSettings: { mode: 'AUTO', tools: ['task_tool'] },
    },
    source: 'channel',
    triggerKind: 'task',
  })
  assert.equal(applyAgentToolPolicy(event), false)
  assert.deepEqual(event.settings.toolCallSettings.tools, ['task_tool'])
})

test('non-admin Agent principals cannot see admin tools and execution allowlists are exact', () => {
  const previous = global.middleware
  global.middleware = {
    plugins: [
      {
        name: 'ai-plugin',
        getTools: () =>
          new Map([
            [
              'ai-plugin',
              [
                tool('public_tool_mid_1'),
                tool('admin_tool_mid_1', {
                  access: { requires: { admin: true } },
                }),
              ],
            ],
          ]),
      },
    ],
  }
  try {
    const context = {
      source: 'channel',
      user: { isAdmin: false },
    }
    assert.deepEqual(getAgentToolNames(context), ['public_tool_mid_1'])
    const event = {
      settings: { toolCallSettings: { tools: ['public_tool_mid_1'] } },
    }
    assert.equal(isToolAllowed(event, 'public_tool'), true)
    assert.equal(isToolAllowed(event, 'admin_tool_mid_1'), false)
  } finally {
    global.middleware = previous
  }
})

test('admin Web Agent can execute and meta-call the ai-plugin sentinel tool', () => {
  const sentinel = new SentinelTool()
  const previous = global.middleware
  const principal = { id: 'web:admin', isAdmin: true, role: 'system_admin' }
  global.middleware = {
    plugins: [
      {
        getTools: () => new Map([['ai-plugin', [sentinel]]]),
        name: 'ai-plugin',
      },
    ],
  }
  const directEvent = {
    agentId: 'agent-1',
    conversationKind: 'direct',
    principal,
    sessionId: 'session-1',
    settings: { toolCallSettings: { tools: ['sentinel'] } },
    source: 'web',
    triggerKind: 'interactive',
    user: principal,
  }
  try {
    assert.ok(
      getPluginToolNames('ai-plugin', directEvent).includes(sentinel.name),
    )
    assert.equal(
      evaluateToolAccess(sentinel, { event: directEvent }, 'execute').allowed,
      true,
    )

    const metaEvent = {
      ...directEvent,
      settings: { toolCallSettings: { tools: ['meta_tool'] } },
    }
    assert.equal(
      evaluateToolAccess(sentinel, { event: metaEvent }, 'meta_call').allowed,
      true,
    )

    const guestEvent = {
      ...directEvent,
      principal: { id: 'web:guest', isAdmin: false, role: 'user' },
      user: { id: 'web:guest', isAdmin: false, role: 'user' },
    }
    assert.equal(
      evaluateToolAccess(sentinel, { event: guestEvent }, 'execute').allowed,
      false,
    )
  } finally {
    global.middleware = previous
  }
})

test('Agent-only tools are stable across transports and hidden from frontend OpenAI sessions', () => {
  const agentOnlyTools = [new SentinelTool(), new ManageScheduledTasks()]
  const agentPrincipal = {
    id: 'admin:1',
    isAdmin: true,
    role: 'system_admin',
  }
  const agentContexts = ['web', 'channel', 'internal', 'scheduled_task'].map(
    (source) => ({
      agentId: 'agent-1',
      conversationKind: 'direct',
      principal: agentPrincipal,
      sessionId: 'session-1',
      source,
      triggerKind: source === 'scheduled_task' ? 'task' : 'interactive',
      user: agentPrincipal,
    }),
  )

  const webSession = {
    conversationKind: 'direct',
    principal: agentPrincipal,
    sessionId: null,
    source: 'web',
    triggerKind: 'interactive',
    user: agentPrincipal,
  }
  for (const toolInstance of agentOnlyTools) {
    const schemas = agentContexts.map((event) =>
      toolInstance.json('openai', { event }),
    )
    assert.ok(schemas.every(Boolean), toolInstance.name)
    for (const schema of schemas.slice(1)) {
      assert.deepEqual(schema, schemas[0], toolInstance.name)
    }
    assert.ok(
      agentContexts.every((event) =>
        evaluateToolAccess(toolInstance, { event }, 'execute').allowed,
      ),
    )
    assert.equal(toolInstance.json('openai', { event: webSession }), null)
    assert.equal(
      evaluateToolAccess(toolInstance, { event: webSession }, 'execute').reason,
      'agent_context_required',
    )
  }
})
