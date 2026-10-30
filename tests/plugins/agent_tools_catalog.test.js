import test from 'node:test'
import assert from 'node:assert/strict'
import { MioFunction } from '../../lib/function.js'
import config from '../../lib/config.js'
import llm from '../../lib/chat/llm/index.js'
import { getAgentTools, initAgentController } from '../../lib/server/http/controllers/agentController.js'
import agentService from '../../lib/agents/AgentService.js'
import { evaluateToolAccess } from '../../lib/chat/llm/toolPolicy.js'
import Bash from '../../lib/plugins/terminal-pty/tools/bash.js'

const response = () => ({ status(code) { this.statusCode = code; return this }, json(body) { this.body = body; return this } })
test('Agent tools catalog verifies session ownership and projects the actual core tools', async t => {
  const previous = global.middleware, pluginsBefore = llm.plugins
  const make = (name, access) => new MioFunction({ name, description: `${name} description`, parameters: { type: 'object', properties: {} }, access })
  const manager = make('agent_profile', { requires: { agentContext: true } })
  const bash = new Bash()
  const extra = make('unselected')
  const plugin = (name, tools) => ({ name, getTools: () => new Map([[name, tools]]) })
  const plugins = [plugin('agent-manager-plugin', [manager]), plugin('terminal-pty', [bash]), plugin('custom', [extra])]
  llm.plugins = plugins
  global.middleware = { ...previous, plugins }
  initAgentController({ agentService: {
    get: async id => id === 'a' ? { id: 'a', defaultSessionId: 's' } : null,
    listSessions: async () => [{ id: 's', kind: 'conversation' }],
  } })
  t.after(() => { llm.plugins = pluginsBefore; global.middleware = previous; initAgentController({ agentService }) })
  const req = { params: { agentId: 'a' }, query: {}, headers: { 'x-admin-code': config.web?.admin_code } }
  const res = response()
  await getAgentTools(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.data.mode, 'AUTO')
  assert.ok(res.body.data.plugins['agent-manager-plugin'][manager.name])
  assert.ok(res.body.data.plugins['terminal-pty'][bash.name])
  assert.equal(res.body.data.plugins.custom, undefined)
  assert.equal(evaluateToolAccess(bash, { source: 'web', user: { isAdmin: false } }, 'execute').allowed, false)
  assert.equal(evaluateToolAccess(bash, { source: 'web', user: { isAdmin: true } }, 'execute').allowed, true)
  const invalid = response()
  await getAgentTools({ ...req, query: { sessionId: 'foreign-session' } }, invalid)
  assert.equal(invalid.statusCode, 404)
})
