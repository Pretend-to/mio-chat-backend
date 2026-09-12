import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyChannelToolPolicy,
  getChannelToolNames,
  getPluginToolNames,
} from '../../lib/chat/llm/toolPolicy.js'
import { ChatEventFactory } from '../../lib/chat/llm/events/ChatEventFactory.js'

function tool(name, options = {}) {
  return { name, ...options }
}

test('Channel policy always exposes complete ai-plugin and terminal-pty tools', () => {
  const previous = global.middleware
  global.middleware = {
    plugins: [
      {
        name: 'ai-plugin',
        getTools: () =>
          new Map([
            [
              'ai-plugin',
              [
                tool('memory_mid_1'),
                tool('channel_action_mid_1', { channelOnly: true }),
              ],
            ],
          ]),
      },
      {
        name: 'terminal-pty',
        getTools: () =>
          new Map([
            [
              'terminal-pty',
              [
                tool('bash_mid_1'),
                tool('bash_input_mid_1'),
                tool('read_screen_mid_1'),
                tool('shell_policy_mid_1'),
                tool('wait_mid_1'),
              ],
            ],
          ]),
      },
      {
        name: 'other-plugin',
        getTools: () => new Map([['other-plugin', [tool('other_mid_1')]]]),
      },
    ],
  }

  try {
    const event = {
      body: {
        settings: {
          toolCallSettings: {
            mode: 'NONE',
            passthrough: true,
            tools: ['other_mid_1'],
          },
        },
      },
    }
    assert.equal(applyChannelToolPolicy(event), false)
    assert.deepEqual(event.body.settings.toolCallSettings, {
      mode: 'NONE',
      passthrough: true,
      tools: ['other_mid_1'],
    })

    const channelEvent = ChatEventFactory.createMock({
      body: {},
      channel: { type: 'weixin-ilink' },
      source: 'channel',
    })
    assert.equal(applyChannelToolPolicy(channelEvent), true)
    assert.deepEqual(channelEvent.body.settings.toolCallSettings.tools, [
      'memory_mid_1',
      'channel_action_mid_1',
      'bash_mid_1',
      'bash_input_mid_1',
      'read_screen_mid_1',
      'shell_policy_mid_1',
      'wait_mid_1',
    ])
    assert.deepEqual(getChannelToolNames(channelEvent), [
      'memory_mid_1',
      'channel_action_mid_1',
      'bash_mid_1',
      'bash_input_mid_1',
      'read_screen_mid_1',
      'shell_policy_mid_1',
      'wait_mid_1',
    ])
    assert.deepEqual(getPluginToolNames('other-plugin'), ['other_mid_1'])
  } finally {
    global.middleware = previous
  }
})

test('Task policy keeps its explicit tool allowlist even with channel context', () => {
  const event = ChatEventFactory.createMock({
    channel: { type: 'weixin-ilink' },
    settings: {
      toolCallSettings: { mode: 'AUTO', tools: ['task_tool'] },
    },
    source: 'channel',
    triggerKind: 'task',
  })
  assert.equal(applyChannelToolPolicy(event), false)
  assert.deepEqual(event.settings.toolCallSettings.tools, ['task_tool'])
})
