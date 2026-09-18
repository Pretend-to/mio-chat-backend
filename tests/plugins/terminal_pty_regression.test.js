import assert from 'node:assert/strict'
import { test } from 'node:test'
import TerminalSessionManager from '../../lib/plugins/terminal-pty/lib/TerminalSessionManager.js'
import BashInput from '../../lib/plugins/terminal-pty/tools/bash_input.js'

const pluginStub = {
  config: {
    defaultCols: 120,
    defaultRows: 40,
    maxInlineCommandBytes: 700,
    maxOutputLength: 512 * 1024,
    maxSessions: 20,
    sessionTimeout: 600000,
  },
}

test('long UTF-8 PTY commands use a temporary script instead of canonical input', { timeout: 30_000 }, async () => {
  const sessions = new TerminalSessionManager(pluginStub)
  const { sessionId } = await sessions.createSession({ cwd: process.cwd() })
  const payload = '永雏塔菲'.repeat(120)
  const command = `printf '%s' '${payload}'`

  try {
    const result = await sessions.execCommand(sessionId, command, 10_000)
    assert.equal(result.timedOut, false)
    assert.equal(result.exitCode, 0)
    assert.equal(result.stdout, payload)
    assert.ok(!result.stdout.includes('�'))
  } finally {
    sessions.close(sessionId)
    await sessions.destroy()
  }
})

test('readScreen uses terminal rendering for CR, blank lines, and BEL', { timeout: 30_000 }, async () => {
  const sessions = new TerminalSessionManager(pluginStub)
  const { sessionId } = await sessions.createSession({ cwd: process.cwd() })

  try {
    const result = await sessions.execCommand(
      sessionId,
      "printf 'first\\rsecond\\n\\nbeep\\a\\n'",
      10_000,
    )
    assert.equal(result.timedOut, false)
    assert.ok(result.stdout.includes('second'))
    assert.ok(result.stdout.includes('\n\n'))
    assert.ok(!result.stdout.includes('\u0007'))

    const screen = sessions.readScreen(sessionId, { tail: 100 })
    assert.ok(screen.lines.includes('second'))
    assert.ok(screen.lines.includes('beep'))
    assert.ok(!screen.lines.some((line) => line.includes('\u0007')))
  } finally {
    sessions.close(sessionId)
    await sessions.destroy()
  }
})

test('bash_input turns textual Ctrl+C into an interrupting PTY byte', { timeout: 30_000 }, async () => {
  const sessions = new TerminalSessionManager(pluginStub)
  const { sessionId } = await sessions.createSession({ cwd: process.cwd() })
  const input = new BashInput()
  input.parentPlugin = { sessions }

  try {
    const running = await sessions.execCommand(sessionId, 'sleep 30', 150)
    assert.equal(running.timedOut, true)

    const sent = await input.func({
      params: { data: '\\u0003', sessionId, tail: 10 },
    })
    assert.equal(sent.wroteData, true)

    const idle = await sessions.waitForIdle(sessionId, 3_000)
    assert.equal(idle.completed, true)
  } finally {
    sessions.close(sessionId)
    await sessions.destroy()
  }
})

test('execCommand output does not leak the internal marker or its command echo', { timeout: 30_000 }, async () => {
  const sessions = new TerminalSessionManager(pluginStub)
  const { sessionId } = await sessions.createSession({ cwd: process.cwd() })

  try {
    const result = await sessions.execCommand(sessionId, "printf 'hello\\n'", 10_000)
    assert.equal(result.timedOut, false)
    assert.equal(result.exitCode, 0)
    assert.ok(result.stdout.includes('hello'))

    // 内部 marker 与其命令回显都不应出现在交付给调用方的 stdout 里。
    // 两者的命令行文本都含有 __SH_DONE__（结果行是 "__SH_DONE__<ts>:0"，
    // 回显是 "... __SH_DONE__<ts> $?"，marker 后跟空格而非冒号）。
    assert.ok(
      !result.stdout.includes('__SH_DONE__'),
      `stdout 泄漏了内部 marker: ${JSON.stringify(result.stdout)}`,
    )
  } finally {
    sessions.close(sessionId)
    await sessions.destroy()
  }
})
