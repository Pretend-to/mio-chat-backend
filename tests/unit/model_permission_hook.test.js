import assert from 'node:assert/strict'
import test from 'node:test'

import ModelPermissionHook from '../../lib/hooks/builtins/ModelPermissionHook.js'
import { HOOK_POINTS } from '../../lib/hooks/types.js'

function context(eventOverrides = {}, serviceOverrides = {}) {
  return {
    event: {
      body: { settings: { base: { model: 'private-model' } } },
      ...eventOverrides,
    },
    instanceId: 'provider-1',
    llmService: {
      _isGuestModelAllowed: async () => false,
      ...serviceOverrides,
    },
  }
}

test('ModelPermissionHook accepts the canonical runtime principal', async () => {
  const hook = new ModelPermissionHook()
  const ctx = context({
    principal: {
      id: 'system:subagent:wake',
      isAdmin: true,
      role: 'system_admin',
    },
    user: { id: 'guest-shaped-projection', isAdmin: false },
  })

  assert.equal(await hook[HOOK_POINTS.LLM_BEFORE_CHAT](ctx), true)
  assert.equal(ctx.error, undefined)
})

test('ModelPermissionHook does not downgrade a trusted SubAgent wake to guest', async () => {
  const hook = new ModelPermissionHook()
  const ctx = context({
    isWake: true,
    source: 'subagent',
    triggerKind: 'task',
    user: { id: 'missing-principal', isAdmin: false },
  })

  assert.equal(await hook[HOOK_POINTS.LLM_BEFORE_CHAT](ctx), true)
  assert.equal(ctx.error, undefined)
})

test('ModelPermissionHook still enforces the guest whitelist for Web events', async () => {
  const hook = new ModelPermissionHook()
  const ctx = context({
    source: 'web',
    triggerKind: 'interactive',
    user: { id: 'guest-1', isAdmin: false },
  })

  assert.equal(await hook[HOOK_POINTS.LLM_BEFORE_CHAT](ctx), false)
  assert.match(ctx.error, /不在游客可用范围内/)
})
