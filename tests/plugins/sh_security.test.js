import { test } from 'node:test'
import assert from 'node:assert/strict'

import ShSecurityHook from '../../lib/plugins/terminal-pty/hooks/shSecurity.js'
import { shellPolicyService } from '../../lib/database/services/ShellPolicyService.js'
import { ChatEventFactory } from '../../lib/chat/llm/events/ChatEventFactory.js'

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

test('SubAgent tasks may wait for parent-window approval while scheduled tasks fail closed', async (t) => {
  const originalEvaluate = shellPolicyService.evaluate
  shellPolicyService.evaluate = async () => ({
    reason: 'no-rule-hit',
    verdict: 'unknown',
  })
  t.after(() => {
    shellPolicyService.evaluate = originalEvaluate
  })

  const hook = new ShSecurityHook({ namespace: 'terminal-pty' })
  let approvals = 0
  const tool = {
    name: 'bash',
    requestUserApproval: async () => {
      approvals += 1
      return { approved: true }
    },
  }
  const subagentAllowed = await hook.execute({
    event: {
      body: { settings: {} },
      subagentRunId: 'run-1',
      triggerKind: 'task',
    },
    params: { command: 'custom-command' },
    tool,
  })
  const scheduledContext = {
    event: { body: { settings: {} }, triggerKind: 'task' },
    params: { command: 'custom-command' },
    tool,
  }
  const scheduledAllowed = await hook.execute(scheduledContext)

  assert.equal(subagentAllowed, true)
  assert.equal(scheduledAllowed, false)
  assert.match(scheduledContext.ctx?.error || scheduledContext.error, /后台任务/)
  assert.equal(approvals, 1)
})

test('factory-created channel events preserve the SubAgent shell approval distinction', async (t) => {
  const originalEvaluate = shellPolicyService.evaluate
  shellPolicyService.evaluate = async () => ({
    reason: 'no-rule-hit',
    verdict: 'unknown',
  })
  t.after(() => {
    shellPolicyService.evaluate = originalEvaluate
  })

  const makeEvent = (subagentRunId) => ChatEventFactory.createForChannel({
    ctx: {
      agentId: 'agent-shell',
      channel: { channelType: 'session' },
      from: 'runtime',
      isTask: true,
      messageId: `message-${subagentRunId || 'scheduled'}`,
      principal: { id: 'system:shell', isAdmin: true, role: 'system_admin' },
      sessionId: 'session-shell',
      subagentRunId,
    },
    messages: [],
    settings: {},
  })
  const hook = new ShSecurityHook({ namespace: 'terminal-pty' })
  let approvals = 0
  const tool = {
    name: 'bash',
    requestUserApproval: async () => {
      approvals += 1
      return { approved: true }
    },
  }
  const subagentAllowed = await hook.execute({
    event: makeEvent('run-shell'),
    params: { command: 'custom-command' },
    tool,
  })
  const scheduledAllowed = await hook.execute({
    event: makeEvent(null),
    params: { command: 'custom-command' },
    tool,
  })

  assert.equal(subagentAllowed, true)
  assert.equal(scheduledAllowed, false)
  assert.equal(approvals, 1)
})

test('event.settings.yolo directly bypasses approval for WebChatEvent', async () => {
  const hook = new ShSecurityHook({ namespace: 'terminal-pty' })
  const tool = {
    name: 'bash',
    requestUserApproval: async () => {
      throw new Error('approval should not be requested when event.settings.yolo is true')
    },
  }
  const allowed = await hook.execute({
    event: {
      settings: { yolo: true },
      body: { settings: { yolo: true } },
    },
    params: { command: 'rm -rf /' },
    tool,
  })
  assert.equal(allowed, true)
})
