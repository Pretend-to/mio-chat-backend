import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SessionTurnService } from '../../lib/chat/sessions/SessionTurnService.js'

test('Web Agent /model persists configuration used by the next turn', async () => {
  let agent = { id: 'agent-test', model: 'old-model', provider: 'openai' }
  const memory = { agentId: agent.id, ensure: async () => {} }
  const prisma = { session: { findUnique: async () => ({ agentId: agent.id }) }, agent: {
    update: async ({ data, where }) => {
      assert.equal(where.id, agent.id)
      agent = { ...agent, ...data }
      return agent
    },
  } }
  const service = new SessionTurnService({ prisma, llm: { process() {} },
    persistenceFactory: async () => memory })
  const frames = []
  await service.handleSlashCommand({
    agent, sessionId: 'selected-session', text: '/model new-model',
    messageId: 'command-message', principal: { isAdmin: true },
    webClient: { sendOpenaiMessage: (...args) => frames.push(args) },
  })
  assert.equal(agent.model, 'new-model')
  const executor = await service._headlessChannel(agent)
  assert.equal(executor.model, 'new-model')
  assert.equal(frames[0][0], 'update')
  assert.equal(frames[0][1].metaData.sessionId, 'selected-session')
  assert.match(frames[0][1].content, /new-model/)
  assert.equal(frames[1][0], 'complete')
})

import { BaseChannel } from '../../channels/common/BaseChannel.js'
import { SlashHandler } from '../../channels/common/SlashHandler.js'

const commands = [
  'help', 'admin', 'abort', 'crush', 'stop', 'cancel', 'interrupt', 'cut', 'break',
  'adjust', 'tools', 'agents', 'agent', 'trigger', 'triggers', 'think', 'reasoning',
  'yolo', 'status', 'model', 'sessions', 'ls', 'new', 'use', 'current', 'compact',
  'clear', 'soul', 'memory', 'context', 'delete',
]

function ingress() {
  const frames = []
  const parsed = []
  const agent = { id: 'agent-test' }
  const channel = {
    id: agent.id, memory: { agentId: agent.id }, activeJobs: new Map(),
    keepAlive: { recordActivity: async () => {} },
    _handlePendingConfirmation: () => false,
    _enqueueSession: () => assert.fail('commands must not enter the inference queue'),
    _route: BaseChannel.prototype._route,
    appendUserMessage: BaseChannel.prototype.appendUserMessage,
    slashHandler: { handle: async (text, ctx) => {
      parsed.push({ text, ctx })
      return { text: `handled ${text}` }
    } },
  }
  const service = new SessionTurnService({
    prisma: { agent: { findUnique: async () => agent },
      session: { findUnique: async () => ({ id: 'selected', agentId: agent.id }) } },
    llm: { process: () => assert.fail('commands must not call the LLM') },
    sessionWorkCoordinator: { withSessionLease: () => assert.fail('commands must not wait for a lease') },
  })
  service._headlessChannel = async () => channel
  const send = text => service.runTurn({
    agentId: agent.id, sessionId: 'selected', source: 'web', text,
    messageId: 'command', principal: { isAdmin: true },
    webClient: { sendOpenaiMessage: (...args) => frames.push(args) },
  })
  return { channel, frames, parsed, send }
}

for (const command of commands) {
  test(`Web /${command} is parsed by the shared router before inference`, async () => {
    const { parsed, frames, send } = ingress()
    await send(`  /${command} argument  `)
    assert.equal(parsed[0].text, `/${command} argument`)
    assert.equal(parsed[0].ctx.sid, 'selected')
    assert.equal(frames.at(-1)[0], 'complete')
  })
}

test('Web /btw uses router-level handling and completes when idle or busy', async () => {
  const { channel, frames, parsed, send } = ingress()
  await send('/btw')
  assert.match(frames[0][1].content, /当前没有/)
  assert.equal(frames.at(-1)[0], 'complete')
  const job = { text: 'working' }
  channel.activeJobs.set('selected', job)
  channel._handleTransientFollowup = async (text, activeJob) => {
    assert.equal(text, 'progress')
    assert.equal(activeJob, job)
    return { text: 'still working' }
  }
  await send('/btw\tprogress')
  assert.equal(frames.at(-2)[1].content, 'still working')
  assert.equal(frames.at(-1)[0], 'complete')
  assert.equal(parsed.length, 0)
})

test('Web /new and /use report the selected session to the browser', async () => {
  const { channel, frames, send } = ingress()
  const sessions = { selected: { id: 'selected' } }
  channel.memory = {
    agentId: 'agent-test',
    createSession: async () => (sessions.created = { id: 'created' }),
    setActiveSession: async () => {},
    getSession: async id => sessions[id] || null,
  }
  channel.slashHandler = new SlashHandler({ channel, memory: channel.memory })
  await send('/new test')
  assert.equal(frames.at(-1)[1].selectedSessionId, 'created')
  assert.equal(frames.at(-1)[1].metaData.sessionId, 'selected')
  await send('/use created')
  assert.equal(frames.at(-1)[1].selectedSessionId, 'created')
})

test('shared Web parser executes ordinary SlashHandler commands and replies', async () => {
  const { channel, frames, send } = ingress()
  channel.memory.getSession = async () => ({ title: 'Selected session' })
  channel.memory.readSessionCrystal = async () => ''
  channel.slashHandler = new SlashHandler({ channel, memory: channel.memory })
  await send('/help')
  assert.match(frames.at(-2)[1].content, /基础与执行控制/)
  await send('/current')
  assert.match(frames.at(-2)[1].content, /selected.*Selected session/)
})

test('slash preprocessing rejects sessions owned by another Agent', async () => {
  // Validate at the public service boundary, before even resolving an executor.
  const service = new SessionTurnService({ prisma: {
    agent: { findUnique: async () => ({ id: 'owner' }) },
    session: { findUnique: async () => ({ agentId: 'someone-else' }) },
  }, llm: { process() {} } })
  service._headlessChannel = async () => assert.fail('invalid session must not execute')
  await assert.rejects(service.runTurn({
    agentId: 'owner', sessionId: 'foreign', source: 'web', text: '/clear',
  }), /does not belong/)
})
