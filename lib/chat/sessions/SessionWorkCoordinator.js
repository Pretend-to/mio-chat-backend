import crypto from 'node:crypto'
import prismaManager from '../../database/prisma.js'

const OPEN_WORK_STATUSES = [
  'accepted',
  'queued',
  'absorbed',
  'running',
  'deferred',
]

/** waitMs > 0 时的轮询间隔。只在确实有人排队等待时才发生。 */
const LEASE_WAIT_POLL_MS = 250

const TERMINAL_WORK_STATUSES = new Set([
  'completed',
  'failed',
  'needs_attention',
])

const WORK_TRANSITIONS = {
  accepted: new Set([
    'queued',
    'absorbed',
    'running',
    'deferred',
    'failed',
    'needs_attention',
  ]),
  queued: new Set([
    'absorbed',
    'running',
    'deferred',
    'failed',
    'needs_attention',
  ]),
  absorbed: new Set([
    'running',
    'completed',
    'failed',
    'deferred',
    'needs_attention',
  ]),
  running: new Set(['completed', 'failed', 'deferred', 'needs_attention']),
  deferred: new Set([
    'queued',
    'absorbed',
    'running',
    'failed',
    'needs_attention',
  ]),
  completed: new Set(),
  failed: new Set(),
  needs_attention: new Set(),
}

const boundedString = (value, name, maxLength, { optional = false } = {}) => {
  if (value == null && optional) return null
  const result = String(value ?? '').trim()
  if (!result) throw new TypeError(`${name} is required`)
  if (result.length > maxLength) {
    const error = new RangeError(`${name} exceeds ${maxLength} characters`)
    error.code = 'session_work_value_too_large'
    throw error
  }
  return result
}

const serializeJson = (value, name, maxLength = 16384) => {
  if (value == null) return null
  let serialized
  try {
    serialized = typeof value === 'string' ? value : JSON.stringify(value)
  } catch {
    throw new TypeError(`${name} must be JSON serializable`)
  }
  if (serialized.length > maxLength) {
    const error = new RangeError(`${name} exceeds ${maxLength} characters`)
    error.code = 'session_work_value_too_large'
    throw error
  }
  return serialized
}

const isUniqueConflict = (error) => error?.code === 'P2002'

export class SessionWorkError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'SessionWorkError'
    this.code = code
  }
}

/**
 * Persistent work inbox and fencing leases for Agent Sessions.
 *
 * The lease coordinates writers across runtime entry points. A lease token is
 * monotonic across takeovers; protected database writes should verify the
 * sessionId, owner and token with assertLease() before committing.
 */
export class SessionWorkCoordinator {
  constructor({
    prisma = null,
    leaseOwner = `session-work:${crypto.randomUUID()}`,
    now = () => new Date(),
    idFactory = (prefix) => `${prefix}_${crypto.randomUUID()}`,
    leaseTtlMs = 30000,
  } = {}) {
    this.prisma = prisma
    this.leaseOwner = leaseOwner
    this.now = now
    this.idFactory = idFactory
    this.leaseTtlMs = leaseTtlMs
    this.statusListeners = new Set()
    // waitMs > 0 的同进程 FIFO 排队链，按 sessionId 分组（见 _waitForTurn）。
    this._turnGates = new Map()
  }

  async _database() {
    if (!this.prisma) this.prisma = await prismaManager.initialize()
    return this.prisma
  }

  async _assertTarget(prisma, agentId, sessionId) {
    const agentKey = boundedString(agentId, 'agentId', 255)
    const sessionKey = boundedString(sessionId, 'sessionId', 255)
    const session = await prisma.session.findUnique({
      select: { agentId: true, id: true },
      where: { id: sessionKey },
    })
    if (!session || session.agentId !== agentKey) {
      throw new SessionWorkError(
        'session_agent_mismatch',
        `Session ${sessionKey} does not belong to Agent ${agentKey}`,
      )
    }
    return { agentId: agentKey, sessionId: sessionKey }
  }

  /**
   * Durably accept a wake, returning the original row on an idempotent retry.
   */
  async acceptWake(input = {}) {
    const prisma = await this._database()
    const agentId = boundedString(input.agentId, 'agentId', 255)
    const sessionId = boundedString(input.sessionId, 'sessionId', 255)
    const kind = boundedString(input.kind || 'wake', 'kind', 80)
    const wakeKind = boundedString(input.wakeKind, 'wakeKind', 80)
    const idempotencyKey = boundedString(
      input.idempotencyKey,
      'idempotencyKey',
      512,
    )
    const instruction = boundedString(input.instruction, 'instruction', 16000)
    const originRef = boundedString(input.originRef, 'originRef', 512, {
      optional: true,
    })
    const deliveryMode = boundedString(
      input.deliveryMode || 'default',
      'deliveryMode',
      80,
    )
    const deliveryBindingId = boundedString(
      input.deliveryBindingId,
      'deliveryBindingId',
      255,
      { optional: true },
    )
    const principalJson = serializeJson(input.principal, 'principal', 8192)
    const conversationKey = `agent:${agentId}:session:${sessionId}`

    await this._assertTarget(prisma, agentId, sessionId)
    const uniqueWhere = {
      agentId_sessionId_idempotencyKey: {
        agentId,
        idempotencyKey,
        sessionId,
      },
    }
    const existing = await prisma.sessionWorkItem.findUnique({
      where: uniqueWhere,
    })
    if (existing) return existing

    const eventId = boundedString(
      input.eventId || this.idFactory('event'),
      'eventId',
      255,
    )
    const id = boundedString(
      input.workItemId || this.idFactory('work'),
      'workItemId',
      255,
    )
    const data = {
      agentId,
      conversationKey,
      deliveryBindingId,
      deliveryMode,
      eventId,
      id,
      idempotencyKey,
      instruction,
      kind,
      originRef,
      principalJson,
      sessionId,
      status: 'accepted',
      wakeKind,
    }

    try {
      return await prisma.sessionWorkItem.create({ data })
    } catch (error) {
      if (!isUniqueConflict(error)) throw error
      const duplicate = await prisma.sessionWorkItem.findUnique({
        where: uniqueWhere,
      })
      if (duplicate) return duplicate
      throw error
    }
  }

  async getWorkItem(workItemId) {
    const prisma = await this._database()
    return await prisma.sessionWorkItem.findUnique({
      where: { id: String(workItemId) },
    })
  }

  async getWorkItemByEventId(eventId) {
    const prisma = await this._database()
    return await prisma.sessionWorkItem.findUnique({
      where: { eventId: String(eventId) },
    })
  }

  async getDefaultDeliveryBindingId(agentId) {
    const prisma = await this._database()
    const agent = await prisma.agent.findUnique({
      select: { defaultDeliveryBindingId: true },
      where: { id: String(agentId) },
    })
    return agent?.defaultDeliveryBindingId || null
  }

  /**
   * Inspect durable Session messages before deciding whether interrupted work
   * can safely be retried after a process restart.
   */
  async inspectWorkItemPersistence(workItem) {
    if (!workItem?.eventId || !workItem?.sessionId) {
      throw new TypeError('inspectWorkItemPersistence requires a work item')
    }
    const prisma = await this._database()
    const sessionId = String(workItem.sessionId)
    const standaloneAssistantId = `msg_a_work_${workItem.eventId}`
    const standaloneUserId = `msg_u_work_${workItem.eventId}`
    const assistantSelect = {
      content: true,
      id: true,
      role: true,
      sessionId: true,
      status: true,
      text: true,
    }
    const standaloneAssistant = await prisma.message.findUnique({
      select: assistantSelect,
      where: { id: standaloneAssistantId },
    })
    if (
      standaloneAssistant?.sessionId === sessionId &&
      standaloneAssistant.role === 'assistant'
    ) {
      return standaloneAssistant.status === 'final'
        ? {
            assistantMessageId: standaloneAssistant.id,
            assistantText: standaloneAssistant.text || '',
            state: 'completed',
          }
        : { assistantMessageId: standaloneAssistant.id, state: 'partial' }
    }

    const candidateMessages = await prisma.message.findMany({
      orderBy: { seq: 'desc' },
      select: assistantSelect,
      where: {
        content: { contains: String(workItem.eventId) },
        role: 'assistant',
        sessionId,
      },
    })
    for (const message of candidateMessages) {
      let content
      try {
        content = JSON.parse(message.content)
      } catch {
        continue
      }
      const hasWorkMarker =
        Array.isArray(content) &&
        content.some(
          (node) =>
            node?.type === 'context_message' &&
            node?.data?.eventId === String(workItem.eventId),
        )
      if (!hasWorkMarker) continue
      return message.status === 'final'
        ? {
            assistantMessageId: message.id,
            assistantText: message.text || '',
            state: 'completed',
          }
        : { assistantMessageId: message.id, state: 'partial' }
    }

    const standaloneUser = await prisma.message.findUnique({
      select: { id: true, sessionId: true },
      where: { id: standaloneUserId },
    })
    if (standaloneUser?.sessionId === sessionId) {
      return { userMessageId: standaloneUser.id, state: 'partial' }
    }
    return { state: 'none' }
  }

  async findOpenWorkItemByOriginRef(originRef, { agentId = null } = {}) {
    const prisma = await this._database()
    return await prisma.sessionWorkItem.findFirst({
      orderBy: [{ createdAt: 'desc' }],
      where: {
        originRef: String(originRef),
        status: { in: OPEN_WORK_STATUSES },
        ...(agentId ? { agentId: String(agentId) } : {}),
      },
    })
  }

  async listOpenWorkItems({ agentId = null, sessionId = null } = {}) {
    const prisma = await this._database()
    const where = {
      status: { in: OPEN_WORK_STATUSES },
      ...(agentId ? { agentId: String(agentId) } : {}),
      ...(sessionId ? { sessionId: String(sessionId) } : {}),
    }
    return await prisma.sessionWorkItem.findMany({
      orderBy: [{ availableAt: 'asc' }, { createdAt: 'asc' }],
      where,
    })
  }

  onWorkItemStatus(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('listener must be a function')
    }
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  _emitStatus(change) {
    for (const listener of this.statusListeners) {
      try {
        const result = listener(change)
        if (result && typeof result.catch === 'function') {
          result.catch((error) =>
            console.error('[SessionWorkCoordinator] 状态监听回调失败:', error),
          )
        }
      } catch (error) {
        console.error('[SessionWorkCoordinator] 状态监听回调失败:', error)
      }
    }
  }

  async markWorkItemStatus(workItemId, status, details = {}) {
    const nextStatus = boundedString(status, 'status', 80)
    if (!Object.hasOwn(WORK_TRANSITIONS, nextStatus)) {
      throw new SessionWorkError(
        'invalid_session_work_status',
        `Unknown SessionWorkItem status: ${nextStatus}`,
      )
    }
    const prisma = await this._database()
    const id = String(workItemId)
    const current = await prisma.sessionWorkItem.findUnique({ where: { id } })
    if (!current) {
      throw new SessionWorkError(
        'session_work_item_not_found',
        `SessionWorkItem ${id} not found`,
      )
    }
    if (current.status === nextStatus) return current
    if (!WORK_TRANSITIONS[current.status]?.has(nextStatus)) {
      if (TERMINAL_WORK_STATUSES.has(current.status)) return current
      throw new SessionWorkError(
        'invalid_session_work_transition',
        `Cannot transition SessionWorkItem from ${current.status} to ${nextStatus}`,
      )
    }

    const now = this.now()
    const completionJson =
      details.completionJson === undefined && details.completion === undefined
        ? undefined
        : serializeJson(
            details.completionJson ?? details.completion,
            'completion',
            32768,
          )
    const data = {
      ...(details.absorbedByEventId === undefined
        ? {}
        : { absorbedByEventId: details.absorbedByEventId || null }),
      ...(details.absorbedAssistantMessageId === undefined
        ? {}
        : {
            absorbedAssistantMessageId:
              details.absorbedAssistantMessageId || null,
          }),
      ...(completionJson === undefined ? {} : { completionJson }),
      ...(details.lastError === undefined && details.error === undefined
        ? {}
        : {
            lastError:
              details.lastError == null && details.error == null
                ? null
                : String(details.lastError ?? details.error).slice(0, 8192),
          }),
      ...(details.availableAt === undefined
        ? {}
        : { availableAt: new Date(details.availableAt) }),
      ...(details.attempts === undefined
        ? nextStatus === 'running'
          ? { attempts: { increment: 1 } }
          : {}
        : { attempts: Math.max(0, Math.trunc(Number(details.attempts) || 0)) }),
      ...(nextStatus === 'queued' ||
      nextStatus === 'absorbed' ||
      nextStatus === 'running'
        ? { claimedAt: current.claimedAt || now }
        : {}),
      ...(nextStatus === 'running' && !current.startedAt
        ? { startedAt: now }
        : {}),
      ...(TERMINAL_WORK_STATUSES.has(nextStatus) ? { finishedAt: now } : {}),
      status: nextStatus,
    }
    const updated = await prisma.sessionWorkItem.updateMany({
      data,
      where: { id, status: current.status },
    })
    if (updated.count !== 1) {
      const fresh = await prisma.sessionWorkItem.findUnique({ where: { id } })
      if (fresh?.status === nextStatus) return fresh
      throw new SessionWorkError(
        'session_work_item_status_conflict',
        `SessionWorkItem ${id} changed while transitioning`,
      )
    }
    const workItem = await prisma.sessionWorkItem.findUnique({ where: { id } })
    this._emitStatus({
      occurredAt: now,
      previousStatus: current.status,
      status: nextStatus,
      workItem,
    })
    return workItem
  }

  async _assertTargetForLease(prisma, agentId, sessionId) {
    return await this._assertTarget(prisma, agentId, sessionId)
  }

  async acquireLease({
    agentId,
    sessionId,
    owner = this.leaseOwner,
    ttlMs = this.leaseTtlMs,
  } = {}) {
    const prisma = await this._database()
    const target = await this._assertTargetForLease(prisma, agentId, sessionId)
    const leaseOwner = boundedString(owner, 'owner', 255)
    const duration = Math.trunc(Number(ttlMs))
    if (!Number.isFinite(duration) || duration < 100) {
      throw new RangeError('ttlMs must be at least 100 milliseconds')
    }
    const now = this.now()
    const leaseExpiresAt = new Date(now.getTime() + duration)
    try {
      return await prisma.sessionWorkLease.create({
        data: {
          fencingToken: 1,
          heartbeatAt: now,
          leaseExpiresAt,
          leaseOwner,
          sessionId: target.sessionId,
        },
      })
    } catch (error) {
      if (!isUniqueConflict(error)) throw error
    }

    const renewed = await prisma.sessionWorkLease.updateMany({
      data: { heartbeatAt: now, leaseExpiresAt },
      where: {
        leaseExpiresAt: { gt: now },
        leaseOwner,
        sessionId: target.sessionId,
      },
    })
    if (renewed.count === 1) {
      return await prisma.sessionWorkLease.findUnique({
        where: { sessionId: target.sessionId },
      })
    }

    const takenOver = await prisma.sessionWorkLease.updateMany({
      data: {
        fencingToken: { increment: 1 },
        heartbeatAt: now,
        leaseExpiresAt,
        leaseOwner,
      },
      where: {
        leaseExpiresAt: { lte: now },
        sessionId: target.sessionId,
      },
    })
    if (takenOver.count === 1) {
      return await prisma.sessionWorkLease.findUnique({
        where: { sessionId: target.sessionId },
      })
    }
    return null
  }

  async renewLease({
    agentId,
    sessionId,
    owner = this.leaseOwner,
    fencingToken,
    ttlMs = this.leaseTtlMs,
  } = {}) {
    const prisma = await this._database()
    const target = await this._assertTargetForLease(prisma, agentId, sessionId)
    const leaseOwner = boundedString(owner, 'owner', 255)
    const token = Math.trunc(Number(fencingToken))
    const duration = Math.trunc(Number(ttlMs))
    if (!Number.isFinite(token) || token < 1) {
      throw new TypeError('fencingToken must be a positive integer')
    }
    if (!Number.isFinite(duration) || duration < 100) {
      throw new RangeError('ttlMs must be at least 100 milliseconds')
    }
    const now = this.now()
    const updated = await prisma.sessionWorkLease.updateMany({
      data: {
        heartbeatAt: now,
        leaseExpiresAt: new Date(now.getTime() + duration),
      },
      where: {
        fencingToken: token,
        leaseExpiresAt: { gt: now },
        leaseOwner,
        sessionId: target.sessionId,
      },
    })
    if (updated.count !== 1) {
      throw new SessionWorkError(
        'session_lease_lost',
        `Session lease lost for ${target.sessionId}`,
      )
    }
    return await prisma.sessionWorkLease.findUnique({
      where: { sessionId: target.sessionId },
    })
  }

  async assertLease({
    agentId,
    sessionId,
    owner = this.leaseOwner,
    fencingToken,
  } = {}) {
    const prisma = await this._database()
    const target = await this._assertTargetForLease(prisma, agentId, sessionId)
    const now = this.now()
    const lease = await prisma.sessionWorkLease.findUnique({
      where: { sessionId: target.sessionId },
    })
    if (
      !lease ||
      lease.leaseOwner !== owner ||
      lease.fencingToken !== Math.trunc(Number(fencingToken)) ||
      lease.leaseExpiresAt <= now
    ) {
      throw new SessionWorkError(
        'session_lease_lost',
        `Session lease lost for ${target.sessionId}`,
      )
    }
    return lease
  }

  async releaseLease({
    agentId,
    sessionId,
    owner = this.leaseOwner,
    fencingToken,
  } = {}) {
    const prisma = await this._database()
    const target = await this._assertTargetForLease(prisma, agentId, sessionId)
    const now = this.now()
    const released = await prisma.sessionWorkLease.updateMany({
      data: { heartbeatAt: now, leaseExpiresAt: now },
      where: {
        fencingToken: Math.trunc(Number(fencingToken)),
        leaseOwner: String(owner),
        sessionId: target.sessionId,
      },
    })
    return released.count === 1
  }

  async withSessionLease(
    {
      agentId,
      sessionId,
      owner = null,
      ttlMs = this.leaseTtlMs,
      waitMs = 0,
    } = {},
    callback,
  ) {
    if (typeof callback !== 'function') {
      throw new TypeError('callback must be a function')
    }
    const leaseOwner = owner || `${this.leaseOwner}:${crypto.randomUUID()}`
    // waitMs > 0 = 交互式入口（Web Agent 消息）：租约被占用时排队等待，
    // 而不是把 session_busy 抛到调用方变成用户可见失败。
    // 同进程内按到达顺序 FIFO，跨进程仍由 DB 租约裁决。
    const releaseTurn =
      waitMs > 0 ? await this._waitForTurn(String(sessionId)) : null
    try {
      const lease = await this._acquireLeaseWithin(
        { agentId, owner: leaseOwner, sessionId, ttlMs },
        waitMs,
      )
      if (!lease) {
        throw new SessionWorkError(
          'session_busy',
          waitMs > 0
            ? `Session ${sessionId} 等待 ${waitMs}ms 后仍被其它写者占用`
            : `Session ${sessionId} already has an active writer`,
        )
      }

      let leaseError = null
      let renewalInProgress = false
      const intervalMs = Math.max(50, Math.floor(ttlMs / 3))
      const timer = setInterval(async () => {
        if (renewalInProgress || leaseError) return
        renewalInProgress = true
        try {
          await this.renewLease({
            agentId,
            fencingToken: lease.fencingToken,
            owner: leaseOwner,
            sessionId,
            ttlMs,
          })
        } catch (error) {
          leaseError = error
        } finally {
          renewalInProgress = false
        }
      }, intervalMs)
      timer.unref?.()

      try {
        const assertLease = () =>
          this.assertLease({
            agentId,
            fencingToken: lease.fencingToken,
            owner: leaseOwner,
            sessionId,
          })
        const sessionLease = {
          agentId: String(agentId),
          fencingToken: lease.fencingToken,
          owner: leaseOwner,
          sessionId: String(sessionId),
          assertLease,
        }
        const result = await callback({
          assertLease,
          lease: sessionLease,
          sessionLease,
        })
        if (leaseError) throw leaseError
        await assertLease()
        return result
      } finally {
        clearInterval(timer)
        await this.releaseLease({
          agentId,
          fencingToken: lease.fencingToken,
          owner: leaseOwner,
          sessionId,
        }).catch(() => {})
      }
    } finally {
      // 必须在租约释放（或确认拿不到）之后才交棒，
      // 否则下一个等待者会白轮询一轮。
      releaseTurn?.()
    }
  }

  /**
   * 同进程 FIFO 排队链：把同一 sessionId 上所有 waitMs > 0 的调用方串行化。
   * 返回值是「交棒」函数，必须在租约释放之后调用。
   */
  async _waitForTurn(sessionId) {
    const previous = this._turnGates.get(sessionId) || Promise.resolve()
    let releaseMine
    const mine = new Promise((resolve) => {
      releaseMine = resolve
    })
    const tail = previous.then(
      () => mine,
      () => mine,
    )
    this._turnGates.set(sessionId, tail)
    const release = () => {
      releaseMine()
      if (this._turnGates.get(sessionId) === tail) {
        this._turnGates.delete(sessionId)
      }
    }
    await previous.catch(() => {})
    return release
  }

  /** 在 waitMs 预算内反复尝试取租约；waitMs <= 0 时保持原有的「抢不到即失败」。 */
  async _acquireLeaseWithin(options, waitMs) {
    let lease = await this.acquireLease(options)
    if (lease || waitMs <= 0) return lease
    const deadline = Date.now() + waitMs
    while (!lease && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, LEASE_WAIT_POLL_MS))
      lease = await this.acquireLease(options)
    }
    return lease
  }
}

let singleton

export function getSessionWorkCoordinator() {
  if (!singleton) singleton = new SessionWorkCoordinator()
  return singleton
}

export default SessionWorkCoordinator
