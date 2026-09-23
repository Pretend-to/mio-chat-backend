import assert from 'node:assert/strict'
import test from 'node:test'

import { buildWebPrincipal } from '../../lib/server/socket.io/controllers/agent.js'

test('Web Agent chat maps authenticated socket admin directly to system principal', () => {
  assert.deepEqual(buildWebPrincipal({ id: 'admin-1', isAdmin: true }), {
    externalUserId: 'admin-1',
    id: 'web:admin-1',
    isAdmin: true,
    role: 'system_admin',
  })
  assert.deepEqual(buildWebPrincipal({ id: 'guest-1', isAdmin: false }), {
    externalUserId: 'guest-1',
    id: 'web:guest-1',
    isAdmin: false,
    role: 'user',
  })
})
