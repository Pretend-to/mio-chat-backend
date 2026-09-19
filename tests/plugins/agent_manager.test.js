import test from 'node:test'
import assert from 'node:assert/strict'

import AgentModelTool from '../../lib/plugins/agent-manager-plugin/tools/agent_model.js'
import AgentProfileTool from '../../lib/plugins/agent-manager-plugin/tools/agent_profile.js'
import AgentSessionTool from '../../lib/plugins/agent-manager-plugin/tools/agent_session.js'

test('agent_profile persists fields on the current Agent', async () => {
  let agent = {
    avatar: '',
    description: '',
    id: 'agent-a',
    name: 'Old name',
    soul: 'Original soul',
  }
  const service = {
    async get() {
      return agent
    },
    async update(_agentId, patch) {
      agent = { ...agent, ...patch }
      return agent
    },
  }
  const tool = new AgentProfileTool({ service })
  const updated = await tool.execute({
    agentId: 'agent-a',
    params: {
      action: 'update',
      description: 'Research',
      name: 'Mio',
      soul: 'Careful',
    },
  })
  assert.equal(updated.success, true)
  assert.equal(updated.agent.name, 'Mio')
  assert.equal(updated.agent.description, 'Research')
  assert.equal(updated.agent.soul, 'Careful')

  const appended = await tool.execute({
    agentId: 'agent-a',
    params: { action: 'append_soul', soul: 'Concise' },
  })
  assert.equal(appended.agent.soul, 'Careful\n\nConcise')
})

test('agent_profile updates the public default delivery Channel ID', async () => {
  let patchSeen = null
  const service = {
    async get() {
      return { id: 'agent-a' }
    },
    async update(_agentId, patch) {
      patchSeen = patch
      return { id: 'agent-a', defaultDeliveryBindingId: null }
    },
  }
  const tool = new AgentProfileTool({ service })
  await tool.execute({
    agentId: 'agent-a',
    params: {
      action: 'update',
      defaultDeliveryChannelId: 'feishu',
    },
  })
  assert.deepEqual(patchSeen, { defaultDeliveryChannelId: 'feishu' })
  await tool.execute({
    agentId: 'agent-a',
    params: {
      action: 'update',
      defaultDeliveryChannelId: null,
    },
  })
  assert.deepEqual(patchSeen, { defaultDeliveryChannelId: null })
})

test('Agent management tools require an explicit agentId', async () => {
  const tool = new AgentProfileTool({ service: {} })
  await assert.rejects(
    () => tool.execute({ params: { action: 'read' } }),
    /explicit Agent/,
  )
})

test('agent_model persists configuration and mirrors the active runtime', async () => {
  let agent = { id: 'agent-a', model: 'old-model', provider: 'OldProvider' }
  const service = {
    async get() {
      return agent
    },
    async update(_agentId, patch) {
      agent = { ...agent, ...patch }
      return agent
    },
  }
  const channel = { model: agent.model, provider: agent.provider }
  const tool = new AgentModelTool({ service })
  const switched = await tool.execute({
    agentId: 'agent-a',
    channel,
    params: { action: 'switch', model: 'new-model', provider: 'NewProvider' },
  })
  assert.deepEqual(switched, {
    model: 'new-model',
    provider: 'NewProvider',
    success: true,
  })
  assert.equal(channel.model, 'new-model')

  const reset = await tool.execute({
    agentId: 'agent-a',
    channel,
    params: { action: 'reset' },
  })
  assert.deepEqual(reset, { model: null, provider: null, success: true })
  assert.equal(channel.provider, null)
})

test('agent_session represents ordinary and SubAgent Sessions as one tree', async () => {
  const sessions = [
    { id: 'root', kind: 'conversation', parentSessionId: null, title: 'Main' },
    {
      id: 'child',
      kind: 'subagent',
      parentSessionId: 'root',
      title: 'Researcher',
    },
  ]
  const service = {
    async listSessions() {
      return sessions
    },
  }
  const tool = new AgentSessionTool({ service })
  const result = await tool.execute({
    agentId: 'agent-a',
    params: { action: 'list' },
  })
  assert.equal(result.success, true)
  assert.equal(result.tree[0].id, 'root')
  assert.equal(result.tree[0].children[0].kind, 'subagent')
})

test('agent_session uses ChannelConversation scope and never changes Agent.defaultSessionId', async () => {
  const calls = []
  const scope = {
    async activate(sessionId) {
      calls.push(['activate', sessionId])
      return { id: sessionId }
    },
    async create(title) {
      calls.push(['create', title])
      return { id: 'scoped-new', title }
    },
    async delete(sessionId) {
      calls.push(['delete', sessionId])
      return { deleted: true, sessionId }
    },
    async getActive() {
      return 'scoped-active'
    },
    async list() {
      return []
    },
  }
  const tool = new AgentSessionTool({ service: {} })

  const current = await tool.execute({
    agentId: 'agent-a',
    params: { action: 'current' },
    sessionScope: scope,
  })
  assert.equal(current.currentSessionId, 'scoped-active')

  await tool.execute({
    agentId: 'agent-a',
    params: { action: 'create', title: 'Scoped' },
    sessionScope: scope,
  })
  await tool.execute({
    agentId: 'agent-a',
    params: { action: 'switch', sessionId: 'linked-session' },
    sessionScope: scope,
  })
  assert.deepEqual(calls, [
    ['create', 'Scoped'],
    ['activate', 'linked-session'],
  ])

  const webSwitch = await tool.execute({
    agentId: 'agent-a',
    params: { action: 'switch', sessionId: 'other' },
  })
  assert.equal(webSwitch.success, false)
  assert.match(webSwitch.error, /defaultSessionId/)
})

test('agent_session cannot create or directly delete SubAgent Sessions', async () => {
  const calls = []
  const service = {
    async createSession(_agentId, input) {
      calls.push(input)
      return { id: 'new-root', ...input }
    },
    async deleteSession() {
      throw new Error('must not delete SubAgent Session')
    },
    async listSessions() {
      return [
        {
          id: 'child',
          kind: 'subagent',
          parentSessionId: 'root',
          title: 'Researcher',
        },
      ]
    },
  }
  const tool = new AgentSessionTool({ service })
  const created = await tool.execute({
    agentId: 'agent-a',
    params: {
      action: 'create',
      kind: 'subagent',
      parentSessionId: 'root',
      title: 'Ignored child request',
    },
  })
  assert.equal(created.success, true)
  assert.deepEqual(calls, [
    { kind: 'conversation', title: 'Ignored child request', visible: true },
  ])

  const deleted = await tool.execute({
    agentId: 'agent-a',
    params: { action: 'delete', sessionId: 'child' },
    sessionId: 'root',
  })
  assert.equal(deleted.success, false)
  assert.match(deleted.error, /SubAgent Run/)
})
