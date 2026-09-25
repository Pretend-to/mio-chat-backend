import { DomainError } from '../agents/AgentService.js'

export const RUN_STATUS = Object.freeze({
  BLOCKED: 'blocked',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  FAILED: 'failed',
  INTERRUPTED: 'interrupted',
  QUEUED: 'queued',
  RESULT_READY: 'result_ready',
  RUNNING: 'running',
  WAITING_TOOL: 'waiting_tool',
})

export const GROUP_STATUS = Object.freeze({
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  COMPOSING: 'composing',
  DISPATCHED: 'dispatched',
  FAILED: 'failed',
  PLANNING: 'planning',
  WAITING_CHILDREN: 'waiting_children',
})

const runTransitions = new Map([
  [
    RUN_STATUS.QUEUED,
    new Set([RUN_STATUS.RUNNING, RUN_STATUS.CANCELLED, RUN_STATUS.EXPIRED]),
  ],
  [
    RUN_STATUS.RUNNING,
    new Set([
      RUN_STATUS.WAITING_TOOL,
      RUN_STATUS.RESULT_READY,
      RUN_STATUS.FAILED,
      RUN_STATUS.CANCELLED,
      RUN_STATUS.EXPIRED,
      RUN_STATUS.INTERRUPTED,
      RUN_STATUS.BLOCKED,
    ]),
  ],
  [
    RUN_STATUS.WAITING_TOOL,
    new Set([
      RUN_STATUS.RUNNING,
      RUN_STATUS.RESULT_READY,
      RUN_STATUS.FAILED,
      RUN_STATUS.CANCELLED,
      RUN_STATUS.EXPIRED,
      RUN_STATUS.INTERRUPTED,
      RUN_STATUS.BLOCKED,
    ]),
  ],
  [
    RUN_STATUS.INTERRUPTED,
    new Set([
      RUN_STATUS.QUEUED,
      RUN_STATUS.FAILED,
      RUN_STATUS.BLOCKED,
      RUN_STATUS.CANCELLED,
    ]),
  ],
])

export const TERMINAL_RUN_STATUSES = new Set([
  RUN_STATUS.BLOCKED,
  RUN_STATUS.CANCELLED,
  RUN_STATUS.EXPIRED,
  RUN_STATUS.FAILED,
  RUN_STATUS.RESULT_READY,
])

// A Run stopped by `subagent action=continue` is a middle state, not an
// outcome: its replacement attempt is created in the same RunGroup moments
// later. Cancellation reasons below only ever describe that hand-off.
const CONTINUATION_SUPERSEDE_REASONS = new Set([
  'interrupted_for_continuation',
  'superseded_by_continuation',
])

/** True when `continue` stopped the Run to hand the job to its next attempt. */
export function isSupersededByContinuation(run) {
  return (
    run?.status === RUN_STATUS.CANCELLED &&
    CONTINUATION_SUPERSEDE_REASONS.has(run.cancelReason)
  )
}

function assertTransition(map, current, next, code) {
  if (current === next || map.get(current)?.has(next)) return true
  throw new DomainError(
    code,
    `Invalid state transition: ${current} -> ${next}`,
    409,
    { current, next },
  )
}

export function assertRunTransition(current, next) {
  return assertTransition(
    runTransitions,
    current,
    next,
    'invalid_subagent_run_transition',
  )
}
