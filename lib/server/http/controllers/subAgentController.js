import { DomainError } from '../../../agents/AgentService.js'
import SubAgentRunService from '../../../subagents/SubAgentRunService.js'
import { getSubAgentRuntime } from '../../../subagents/index.js'
import { makeStandardResponse } from '../utils/responseFormatter.js'

let service = new SubAgentRunService()

export function initSubAgentController({ subAgentRunService = null } = {}) {
  if (subAgentRunService) service = subAgentRunService
}

const ok = (res, data) => res.json(makeStandardResponse(data))
const fail = (res, error) => {
  if (error instanceof DomainError || error?.status) {
    return res.status(error.status || 400).json({
      code: error.code || 'domain_error',
      details: error.details || undefined,
      message: error.message,
    })
  }
  return res
    .status(500)
    .json({ code: 'internal_error', message: error.message })
}

export async function listSessionGroups(req, res) {
  try {
    ok(res, {
      groups: await service.listGroups({
        agentId: req.params.agentId,
        limit: req.query.limit,
        parentSessionId: req.params.sessionId,
      }),
    })
  } catch (error) {
    fail(res, error)
  }
}

export async function getGroup(req, res) {
  try {
    ok(res, await service.getGroup(req.params.groupId))
  } catch (error) {
    fail(res, error)
  }
}

export async function getRun(req, res) {
  try {
    ok(res, await service.getRun(req.params.runId))
  } catch (error) {
    fail(res, error)
  }
}

export async function continueRun(req, res) {
  try {
    const runtime = getSubAgentRuntime()
    const target = await service.getRun(req.params.runId)
    if (target?.status === 'running' || target?.status === 'queued') {
      await runtime.dispatcher.abortRun(
        req.params.runId,
        'interrupted_for_continuation',
      )
    }
    const run = await service.continueRun(req.params.runId, {
      instruction: req.body?.instruction || '',
    })
    runtime.dispatcher.startGroup(run.groupId)
    ok(res, run)
  } catch (error) {
    fail(res, error)
  }
}

export async function cancelRun(req, res) {
  try {
    ok(
      res,
      await getSubAgentRuntime().dispatcher.abortRun(
        req.params.runId,
        req.body?.reason || '',
      ),
    )
  } catch (error) {
    fail(res, error)
  }
}

export async function cancelGroup(req, res) {
  try {
    const group = await service.getGroup(req.params.groupId)
    const runs = []
    for (const run of group.runs) {
      runs.push(
        await getSubAgentRuntime().dispatcher.abortRun(
          run.id,
          req.body?.reason || '',
        ),
      )
    }
    ok(res, { groupId: group.id, runs })
  } catch (error) {
    fail(res, error)
  }
}
