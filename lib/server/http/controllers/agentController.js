import agentService, { DomainError } from '../../../agents/AgentService.js'
import { makeStandardResponse } from '../utils/responseFormatter.js'

let service = agentService
let channelRuntime = null
let stopAgentUpdateSync = null

export function initAgentController({ agentService: injected, runtime = null } = {}) {
  if (injected) service = injected
  if (runtime) channelRuntime = runtime
  stopAgentUpdateSync?.()
  stopAgentUpdateSync = service.onUpdated?.((agent) => {
    channelRuntime?.syncAgentCompatibilityMirror?.(agent.id, agent)
  }) || null
}

async function recycleChannel(channelId) {
  if (!channelRuntime?.isRunning?.(channelId)) return
  await channelRuntime.stop(channelId, { persistStatus: false })
  await channelRuntime.start(channelId).catch(error => {
    if (!/no enabled Agent bindings/.test(error.message)) throw error
  })
}

const ok = (res, data, status = 200) => res.status(status).json(makeStandardResponse(data))
const fail = (res, error) => {
  if (error instanceof DomainError || error?.status) {
    return res.status(error.status || 400).json({
      code: error.code || 'domain_error',
      details: error.details || undefined,
      message: error.message,
    })
  }
  return res.status(500).json({ code: 'internal_error', message: error.message })
}

export async function listAgents(_req, res) {
  try { ok(res, { agents: await service.list() }) } catch (error) { fail(res, error) }
}

export async function getAgent(req, res) {
  try {
    const agent = await service.get(req.params.agentId)
    if (!agent) throw new DomainError('agent_not_found', `Agent ${req.params.agentId} not found`, 404)
    ok(res, agent)
  } catch (error) { fail(res, error) }
}

export async function createAgent(req, res) {
  try { ok(res, await service.createWithInitialSession(req.body || {}), 201) } catch (error) { fail(res, error) }
}

export async function updateAgent(req, res) {
  try {
    const agent = await service.update(req.params.agentId, req.body || {})
    // Injected/legacy AgentService implementations may not expose update
    // notifications, so keep a narrow compatibility fallback here.
    if (!stopAgentUpdateSync) {
      channelRuntime?.syncAgentCompatibilityMirror?.(agent.id, agent)
    }
    ok(res, agent)
  } catch (error) { fail(res, error) }
}

export async function previewDeleteAgent(req, res) {
  try { ok(res, await service.previewDelete(req.params.agentId)) } catch (error) { fail(res, error) }
}

export async function deleteAgent(req, res) {
  try {
    const agent = await service.get(req.params.agentId)
    if (!agent) throw new DomainError('agent_not_found', `Agent ${req.params.agentId} not found`, 404)
    const [{ default: taskScheduler }, { getTriggerService }] = await Promise.all([
      import('../../../cron.js'), import('../../../triggers/index.js'),
    ])
    await taskScheduler.stopTasksByAgent(req.params.agentId)
    await getTriggerService().stopTriggersByAgent(req.params.agentId)
    const result = await service.delete(req.params.agentId)
    channelRuntime?.detachAgent?.(req.params.agentId)
    ok(res, result)
  } catch (error) { fail(res, error) }
}

export async function listSessions(req, res) {
  try {
    ok(res, { sessions: await service.listSessions(req.params.agentId, {
      includeChildren: req.query.includeChildren !== 'false',
    }) })
  } catch (error) { fail(res, error) }
}

export async function createSession(req, res) {
  try { ok(res, await service.createSession(req.params.agentId, req.body || {}), 201) } catch (error) { fail(res, error) }
}

export async function deleteSession(req, res) {
  try {
    ok(res, await service.deleteSession(req.params.agentId, req.params.sessionId, {
      cascadeDependencies: req.query.dependencyPolicy === 'cascade',
    }))
  } catch (error) { fail(res, error) }
}

export async function bindChannel(req, res) {
  try {
    const result = await service.bindChannel(req.params.agentId, req.params.channelId)
    await recycleChannel(req.params.channelId)
    ok(res, result, 201)
  } catch (error) { fail(res, error) }
}

export async function unbindChannel(req, res) {
  try {
    const result = await service.unbindChannel(req.params.agentId, req.params.channelId)
    await recycleChannel(req.params.channelId)
    ok(res, result)
  } catch (error) { fail(res, error) }
}

export async function listChannelAgents(req, res) {
  try { ok(res, { bindings: await service.listChannelAgents(req.params.channelId) }) } catch (error) { fail(res, error) }
}

export async function listChannelRoutes(req, res) {
  try { ok(res, { routes: await service.listChannelRoutes(req.params.channelId) }) } catch (error) { fail(res, error) }
}

export async function assignChannelRoute(req, res) {
  try { ok(res, await service.assignChannelRoute(req.params.channelId, req.params.externalConversationId, req.body || {})) } catch (error) { fail(res, error) }
}
