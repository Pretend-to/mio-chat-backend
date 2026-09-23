import crypto from 'node:crypto'

import prismaManager from '../../lib/database/prisma.js'
import { DomainError } from '../../lib/agents/AgentService.js'

const CLAIM_TTL_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5

const newId = (prefix) => `${prefix}_${crypto.randomUUID()}`

function normalizeCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
}

function hashCode(value) {
  return crypto.createHash('sha256').update(normalizeCode(value)).digest('hex')
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''), 'hex')
  const b = Buffer.from(String(right || ''), 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function createClaimCode() {
  const body = crypto.randomBytes(6).toString('hex').toUpperCase()
  return `MIO-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`
}

export class ChannelIdentityService {
  constructor({ prisma = null, claimTtlMs = CLAIM_TTL_MS } = {}) {
    this.prisma = prisma
    this.claimTtlMs = claimTtlMs
  }

  async _database() {
    if (!this.prisma) this.prisma = await prismaManager.initialize()
    return this.prisma
  }

  principalId(envelope) {
    return `channel:${envelope.source.channelId}:${envelope.actor.externalUserId}`
  }

  async issueAdminClaim(channelId) {
    const prisma = await this._database()
    const code = createClaimCode()
    const expiresAt = new Date(Date.now() + this.claimTtlMs)
    await prisma.channelAdminClaim.upsert({
      create: {
        channelId: String(channelId),
        codeHash: hashCode(code),
        expiresAt,
        id: newId('claim'),
      },
      update: {
        attemptCount: 0,
        claimedAt: null,
        codeHash: hashCode(code),
        expiresAt,
      },
      where: { channelId: String(channelId) },
    })
    return { code, expiresAt: expiresAt.toISOString() }
  }

  async resolve(envelope) {
    const prisma = await this._database()
    const principalId = this.principalId(envelope)
    const principal = await prisma.channelPrincipal.findUnique({
      where: {
        channelId_externalUserId: {
          channelId: envelope.source.channelId,
          externalUserId: envelope.actor.externalUserId,
        },
      },
    })
    return {
      externalUserId: envelope.actor.externalUserId,
      id: principalId,
      isAdmin: principal?.role === 'system_admin',
      role: principal?.role || 'user',
    }
  }

  async claimAdmin(envelope, code) {
    if (envelope.conversation.type !== 'private') {
      throw new DomainError(
        'admin_claim_private_only',
        '管理员认领只能在私聊中完成',
        403,
      )
    }
    const prisma = await this._database()
    const channelId = envelope.source.channelId
    const claim = await prisma.channelAdminClaim.findUnique({
      where: { channelId },
    })
    if (!claim || claim.claimedAt) {
      throw new DomainError(
        'admin_claim_unavailable',
        '当前没有可用的管理员认领码，请在 Web 管理页面重新生成',
        404,
      )
    }
    if (claim.expiresAt.getTime() <= Date.now()) {
      throw new DomainError(
        'admin_claim_expired',
        '管理员认领码已过期，请在 Web 管理页面重新生成',
        410,
      )
    }
    if (claim.attemptCount >= MAX_ATTEMPTS) {
      throw new DomainError(
        'admin_claim_locked',
        '管理员认领码已锁定，请在 Web 管理页面重新生成',
        423,
      )
    }

    if (!safeEqual(claim.codeHash, hashCode(code))) {
      await prisma.channelAdminClaim.update({
        data: { attemptCount: { increment: 1 } },
        where: { channelId },
      })
      throw new DomainError('admin_claim_invalid', '管理员认领码无效', 403)
    }

    const now = new Date()
    const principal = await prisma.$transaction(async (tx) => {
      const saved = await tx.channelPrincipal.upsert({
        create: {
          channelId,
          claimedAt: now,
          displayName: envelope.actor.displayName,
          externalUserId: envelope.actor.externalUserId,
          id: newId('principal'),
          role: 'system_admin',
        },
        update: {
          claimedAt: now,
          displayName: envelope.actor.displayName,
          role: 'system_admin',
        },
        where: {
          channelId_externalUserId: {
            channelId,
            externalUserId: envelope.actor.externalUserId,
          },
        },
      })
      await tx.channelAdminClaim.update({
        data: { claimedAt: now },
        where: { channelId },
      })
      return saved
    })
    return {
      externalUserId: principal.externalUserId,
      id: this.principalId(envelope),
      isAdmin: true,
      role: principal.role,
    }
  }

  async status(envelope) {
    const principal = await this.resolve(envelope)
    return {
      ...principal,
      channelId: envelope.source.channelId,
    }
  }

  scope(envelope) {
    return {
      claim: (code) => this.claimAdmin(envelope, code),
      status: () => this.status(envelope),
    }
  }

  async getChannelSummary(channelId) {
    const prisma = await this._database()
    const [adminCount, claim] = await Promise.all([
      prisma.channelPrincipal.count({
        where: { channelId: String(channelId), role: 'system_admin' },
      }),
      prisma.channelAdminClaim.findUnique({
        select: { claimedAt: true, expiresAt: true },
        where: { channelId: String(channelId) },
      }),
    ])
    return {
      adminCount,
      claimAvailable: Boolean(
        claim && !claim.claimedAt && claim.expiresAt.getTime() > Date.now(),
      ),
      claimExpiresAt: claim?.expiresAt?.toISOString() || null,
    }
  }
}

export default ChannelIdentityService
