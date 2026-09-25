import assert from 'node:assert/strict'
import { test } from 'node:test'
import TerminalSessionManager, {
  FOREGROUND_QUIET_MS,
  classifyForegroundState,
  looksLikeContinuationPrompt,
} from '../../lib/plugins/terminal-pty/lib/TerminalSessionManager.js'
import Bash from '../../lib/plugins/terminal-pty/tools/bash.js'
import BashInput from '../../lib/plugins/terminal-pty/tools/bash_input.js'
import ReadScreen, {
  buildEmptyScreenHint,
} from '../../lib/plugins/terminal-pty/tools/read_screen.js'

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

/** 等待后台任务 done 事件；超时直接失败，避免用 sleep 掩盖真实时序。 */
function waitForDone(sessions, jobId, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      sessions.removeListener('done', onDone)
      reject(new Error(`bg job ${jobId} did not finish within ${timeoutMs}ms`))
    }, timeoutMs)
    const onDone = (id, payload) => {
      if (id !== jobId) return
      clearTimeout(timer)
      sessions.removeListener('done', onDone)
      resolve(payload)
    }
    sessions.on('done', onDone)
  })
}

// ---------------------------------------------------------------------------
// P4-1: 前台命令超时后的三态判定（纯函数层）
// ---------------------------------------------------------------------------

test('classifyForegroundState separates executing / waiting_for_input / timed_out', () => {
  // 未超时（marker 命中）仍是终态
  assert.equal(classifyForegroundState({ timedOut: false }), 'finished')

  // 静默期内仍有新输出 → 明确还在执行
  assert.equal(
    classifyForegroundState({ idleMs: 16, tailText: '40', timedOut: true }),
    'executing',
  )

  // 无新输出 + 屏幕末行是续行提示符 → 停在 PS2 等 stdin（bash `>`，zsh 带标签）
  for (const prompt of ['>', 'quote>', 'dquote>', 'heredoc>', 'cmdsubst>', 'for>']) {
    assert.equal(
      classifyForegroundState({ idleMs: 5000, tailText: prompt, timedOut: true }),
      'waiting_for_input',
      `末行 ${prompt} 应判为等待输入`,
    )
  }

  // 无新输出 + 末行不是续行提示符 → 无法判定（静默长命令），保守上报 timed_out
  assert.equal(
    classifyForegroundState({ idleMs: 5000, tailText: '/tmp $ sleep 30', timedOut: true }),
    'timed_out',
  )

  // 刚有新输出时，即使末行恰好是 `>` 也不能覆盖「仍在执行」这一更强的信号
  assert.equal(
    classifyForegroundState({
      idleMs: FOREGROUND_QUIET_MS - 1,
      tailText: '>',
      timedOut: true,
    }),
    'executing',
  )
})

test('looksLikeContinuationPrompt only matches whole-line PS2 tokens', () => {
  assert.equal(looksLikeContinuationPrompt('>'), true)
  assert.equal(looksLikeContinuationPrompt('  quote>  '), true)
  // 普通输出中的 `>` 不能被误判
  assert.equal(looksLikeContinuationPrompt('===>'), false)
  assert.equal(looksLikeContinuationPrompt('/tmp $ echo >'), false)
  assert.equal(looksLikeContinuationPrompt('1 >'), false)
  assert.equal(looksLikeContinuationPrompt(''), false)
  assert.equal(looksLikeContinuationPrompt(undefined), false)
})

test('bash tool reports waiting_for_input for a command stuck at the continuation prompt', { timeout: 30_000 }, async () => {
  const sessions = new TerminalSessionManager(pluginStub)
  const { sessionId } = await sessions.createSession({ cwd: process.cwd() })
  const bash = new Bash()
  bash.parentPlugin = { sessions }

  try {
    // 真复现：复合命令 + 未闭合引号 → 默认 shell 停在 PS2 `>`
    const reply = await bash.func({
      params: {
        command: `for i in 1 2; do echo $i; done && echo 'ok || echo "fallback"`,
        sessionId,
        waitMs: 1200,
      },
    })

    assert.equal(reply.status, 'waiting_for_input')
    assert.equal(reply.timedOut, true)
    assert.equal(reply.exitCode, undefined)
    assert.equal(reply.tailText, '>')
    assert.match(reply.message, /waiting for input/i)
    // 误判代价高（可能误杀正常命令），回执必须带可交叉核对的证据
    assert.match(reply.hint, /stdout/)

    // 会话没有被破坏：Ctrl+C 能收回，命令级空闲检测随即可用
    sessions.write(sessionId, '\u0003')
    const idle = await sessions.waitForIdle(sessionId, 3_000)
    assert.equal(idle.completed, true)
  } finally {
    sessions.close(sessionId)
    await sessions.destroy()
  }
})

test('bash tool keeps executing / timed_out distinguishable for long commands', { timeout: 30_000 }, async () => {
  const sessions = new TerminalSessionManager(pluginStub)
  const bash = new Bash()
  bash.parentPlugin = { sessions }

  const streaming = await sessions.createSession({ cwd: process.cwd() })
  const silent = await sessions.createSession({ cwd: process.cwd() })

  try {
    // 持续输出 → executing
    const streamingReply = await bash.func({
      params: {
        command: 'for i in $(seq 1 200); do echo $i; sleep 0.02; done',
        sessionId: streaming.sessionId,
        waitMs: 1200,
      },
    })
    assert.equal(streamingReply.status, 'executing')
    assert.equal(streamingReply.timedOut, true)

    // 完全静默（无输出、末行是命令回显而非续行符）→ timed_out，且不能谎报 executing
    const silentReply = await bash.func({
      params: { command: 'sleep 30', sessionId: silent.sessionId, waitMs: 1200 },
    })
    assert.equal(silentReply.status, 'timed_out')
    assert.equal(silentReply.timedOut, true)
  } finally {
    sessions.close(streaming.sessionId)
    sessions.close(silent.sessionId)
    await sessions.destroy()
  }
})

// ---------------------------------------------------------------------------
// P4-2: async + 管道导致 read_screen 一直为空，必须给出可判定提示
// ---------------------------------------------------------------------------

test('buildEmptyScreenHint explains pipe buffering for empty background output', () => {
  // 后台任务：空结果的真实原因通常是管道缓冲，必须点明并给出替代动作
  assert.match(buildEmptyScreenHint({ isBgJob: true }), /管道/)
  assert.match(buildEmptyScreenHint({ isBgJob: true }), /wait/)
  // PTY 会话：空屏幕不能等同于「命令挂了」
  assert.match(buildEmptyScreenHint({ isBgJob: false }), /不代表命令没有在执行/)
})

test('read_screen returns a pipe-buffering hint while a piped bg job has no flushed output', { timeout: 30_000 }, async () => {
  const sessions = new TerminalSessionManager(pluginStub)
  const readScreen = new ReadScreen()
  readScreen.parentPlugin = { sessions }

  // `tail` 会把生产者输出缓冲到 EOF：执行期间 bg 缓冲区确实为空，
  // 这正是调用方误判「命令挂了」的场景。
  const { sessionId } = sessions.runBackground(
    undefined,
    '(echo early; sleep 1.5; echo late) | tail -80',
  )

  try {
    await new Promise((resolve) => setTimeout(resolve, 700))
    const mid = await readScreen.func({ params: { sessionId, tail: 80 } })
    assert.equal(mid.lineCount, 0)
    assert.match(mid.hint, /管道/)
    assert.match(mid.hint, /wait/)

    const done = await waitForDone(sessions, sessionId)
    assert.equal(done.exitCode, 0)

    const after = await readScreen.func({ params: { sessionId, tail: 80 } })
    assert.deepEqual(after.lines, ['early', 'late'])
  } finally {
    await sessions.destroy()
  }
})
