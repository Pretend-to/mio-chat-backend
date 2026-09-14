import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterExecOutput } from '../../lib/plugins/terminal-pty/lib/TerminalSessionManager.js'

test('PTY exec output keeps command result and removes shell echo/prompt/marker', () => {
  const command = "date '+%Y-%m-%d %H:%M:%S %A %Z'"
  const marker = '__SH_DONE___123'
  const raw = [
    command,
    `echo; echo ${marker}`,
    `\u001b]0;ubuntu@host: /work\u0007ubuntu@host:/work$ ${command}`,
    '2026-09-02 14:20:51 Wednesday CST',
    `\u001b]0;ubuntu@host: /work\u0007ubuntu@host:/work$ echo; echo ${marker}`,
  ].join('\n')

  assert.equal(
    filterExecOutput(raw, command, marker),
    '2026-09-02 14:20:51 Wednesday CST',
  )
})

test('PTY timeout output removes only a leading submitted-command echo', () => {
  assert.equal(
    filterExecOutput('ls -1\nfile-a\nfile-b', 'ls -1'),
    'file-a\nfile-b',
  )
  assert.equal(
    filterExecOutput('echo same\nsame', 'echo same'),
    'same',
  )
})
