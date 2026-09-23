import test from 'node:test'
import assert from 'node:assert/strict'

import { ChannelIdentityService } from '../../channels/bindings/ChannelIdentityService.js'
import { SlashHandler } from '../../channels/common/SlashHandler.js'

function createPrisma() {
  const claims = new Map()
  const principals = new Map()
  const key = (channelId, externalUserId) => `${channelId}:${externalUserId}`
  const prisma = {
    channelAdminClaim: {
      async findUnique({ where }) {
        return claims.get(where.channelId) || null
      },
      async update({ data, where }) {
        const current = claims.get(where.channelId)
        if (data.attemptCount?.increment) {
          current.attemptCount += data.attemptCount.increment
        }
        Object.assign(current, {
          ...data,
          ...(data.attemptCount?.increment
            ? { attemptCount: current.attemptCount }
            : {}),
        })
        claims.set(where.channelId, current)
        return current
      },
      async upsert({ create, update, where }) {
        const current = claims.get(where.channelId)
        const next = current
          ? { ...current, ...update }
          : { attemptCount: 0, claimedAt: null, ...create }
        claims.set(where.channelId, next)
        return next
      },
    },
    channelPrincipal: {
      async count({ where }) {
        return [...principals.values()].filter(
          (item) =>
            item.channelId === where.channelId && item.role === where.role,
        ).length
      },
      async findUnique({ where }) {
        const value = where.channelId_externalUserId
        return (
          principals.get(key(value.channelId, value.externalUserId)) || null
        )
      },
      async upsert({ create, update, where }) {
        const value = where.channelId_externalUserId
        const storageKey = key(value.channelId, value.externalUserId)
        const current = principals.get(storageKey)
        const next = current ? { ...current, ...update } : create
        principals.set(storageKey, next)
        return next
      },
    },
  }
  prisma.$transaction = async (callback) => callback(prisma)
  return prisma
}

function envelope({ conversationType = 'private', userId = 'user-1' } = {}) {
  return {
    actor: { displayName: '管理员', externalUserId: userId },
    conversation: { type: conversationType },
    source: { channelId: 'channel-1' },
  }
}

test('one-time private claim maps one Channel user to system_admin', async () => {
  const service = new ChannelIdentityService({
    claimTtlMs: 60_000,
    prisma: createPrisma(),
  })
  const claim = await service.issueAdminClaim('channel-1')
  assert.match(claim.code, /^MIO-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/)

  const before = await service.resolve(envelope())
  assert.equal(before.isAdmin, false)
  assert.equal(before.id, 'channel:channel-1:user-1')

  await assert.rejects(
    service.claimAdmin(envelope({ conversationType: 'group' }), claim.code),
    (error) => error.code === 'admin_claim_private_only',
  )
  await assert.rejects(
    service.claimAdmin(envelope(), 'MIO-WRONG-CODE'),
    (error) => error.code === 'admin_claim_invalid',
  )

  const principal = await service.claimAdmin(
    envelope(),
    claim.code.toLowerCase(),
  )
  assert.equal(principal.isAdmin, true)
  assert.equal(principal.role, 'system_admin')
  assert.equal((await service.resolve(envelope())).isAdmin, true)
  await assert.rejects(
    service.claimAdmin(envelope({ userId: 'user-2' }), claim.code),
    (error) => error.code === 'admin_claim_unavailable',
  )
})

test('Slash identity gates shared group routing and global Agent configuration', async () => {
  let switched = false
  let modelUpdated = false
  const handler = new SlashHandler({
    channel: {
      model: 'old-model',
      provider: 'test',
      async updateModelConfig() {
        modelUpdated = true
      },
    },
    memory: {},
  })
  const ordinaryGroup = {
    channelAgentScope: {
      async use() {
        switched = true
        return { id: 'agent-1', name: 'Agent', type: 'agent' }
      },
    },
    envelope: { conversation: { type: 'group' } },
    principal: { isAdmin: false, role: 'user' },
  }
  assert.match(
    (await handler.handle('/agent use Agent', ordinaryGroup)).text,
    /需要系统管理员权限/,
  )
  assert.equal(switched, false)
  assert.match(
    (await handler.handle('/model new-model', ordinaryGroup)).text,
    /需要系统管理员权限/,
  )
  assert.equal(modelUpdated, false)

  const claimed = await handler.handle('/admin claim MIO-TEST-CODE', {
    channelIdentityScope: {
      async claim(code) {
        assert.equal(code, 'MIO-TEST-CODE')
        return { isAdmin: true, role: 'system_admin' }
      },
    },
    principal: { isAdmin: false, role: 'user' },
  })
  assert.match(claimed.text, /认证成功/)
})
