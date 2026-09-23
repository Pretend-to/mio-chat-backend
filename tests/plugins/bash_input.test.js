import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decodeTerminalInput } from '../../lib/plugins/terminal-pty/tools/bash_input.js'

test('bash_input decodes textual control-key forms', () => {
  assert.equal(decodeTerminalInput('\\u0003'), '\u0003')
  assert.equal(decodeTerminalInput('\\x04'), '\u0004')
  assert.equal(decodeTerminalInput('CTRL_C'), '\u0003')
  assert.equal(decodeTerminalInput('^C'), '\u0003')
  assert.equal(decodeTerminalInput('echo ok\\n'), 'echo ok\r')
})

test('bash_input preserves control characters already decoded by JSON', () => {
  assert.equal(decodeTerminalInput('\u0003'), '\u0003')
  assert.equal(decodeTerminalInput('text\n'), 'text\n')
})
