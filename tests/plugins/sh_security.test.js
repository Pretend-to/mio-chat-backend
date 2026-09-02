import { test } from 'node:test'
import assert from 'node:assert/strict'

import ShSecurityHook from '../../lib/plugins/terminal-pty/hooks/shSecurity.js'
import { shellPolicyService } from '../../lib/database/services/ShellPolicyService.js'

test('bash_input cannot use either automatic allow path and taints its PTY', async (t) => {
  const originalEvaluate = shellPolicyService.evaluate
  let options
  shellPolicyService.evaluate = async (_command, _cwd, receivedOptions) => {
    options = receivedOptions
    return { verdict: 'unknown', reason: 'no-rule-hit' }
  }
  t.after(() => {
    shellPolicyService.evaluate = originalEvaluate
  })

  const session = { cwd: '/workspace', safeReadonlyEligible: true }
  let approvalRequested = false
  const hook = new ShSecurityHook({ namespace: 'terminal-pty' })
  const allowed = await hook.execute({
    event: { body: { settings: {} }, metaData: {} },
    params: { data: 'grep foo file | head -10', sessionId: 'term_1' },
    tool: {
      name: 'bash_input',
      parentPlugin: { sessions: { get: () => session } },
      requestUserApproval: async () => {
        approvalRequested = true
        return { approved: false }
      },
    },
  })

  assert.equal(allowed, false)
  assert.equal(approvalRequested, true)
  assert.equal(options.allowPersistedAllow, false)
  assert.equal(options.allowSafeReadonly, false)
  assert.equal(session.safeReadonlyEligible, false)
})

test('session yolo bypasses every shell approval entry point', async () => {
  const originalEvaluate = shellPolicyService.evaluate
  let evaluated = false
  shellPolicyService.evaluate = async () => {
    evaluated = true
    return { verdict: 'unknown', reason: 'no-rule-hit' }
  }
  try {
    const hook = new ShSecurityHook({ namespace: 'terminal-pty' })
    const channel = { isSessionYoloEnabled: async (sessionId) => sessionId === 'chat-1' }
    const requestApproval = async () => {
      throw new Error('approval must not be requested')
    }
    const allowed = await hook.execute({
      event: {
        body: { settings: {} },
        channel,
        sessionId: 'chat-1',
      },
      params: { command: 'rm -rf /', async: true },
      tool: { name: 'bash', requestUserApproval: requestApproval },
    })
    assert.equal(allowed, true)
    assert.equal(evaluated, false)
  } finally {
    shellPolicyService.evaluate = originalEvaluate
  }
})
