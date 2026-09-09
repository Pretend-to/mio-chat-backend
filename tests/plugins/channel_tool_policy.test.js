import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyChannelToolPolicy,
  getPluginToolNames,
} from '../../lib/chat/llm/toolPolicy.js'

function tool(name, options = {}) {
  return { name, ...options }
}

test('Channel policy always exposes the complete context-visible ai-plugin', () => {
  const previous = global.middleware
  global.middleware = {
    plugins: [
      {
        name: 'ai-plugin',
        getTools: () => new Map([['ai-plugin', [
          tool('memory_mid_1'),
          tool('channel_action_mid_1', { channelOnly: true }),
        ]]]),
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

    const channelEvent = { body: {}, channel: { type: 'weixin-ilink' } }
    assert.equal(applyChannelToolPolicy(channelEvent), true)
    assert.deepEqual(channelEvent.body.settings.toolCallSettings.tools, [
      'memory_mid_1',
      'channel_action_mid_1',
    ])
    assert.deepEqual(getPluginToolNames('other-plugin'), ['other_mid_1'])
  } finally {
    global.middleware = previous
  }
})

test('Task policy keeps its explicit tool allowlist even with channel context', () => {
  const event = {
    body: {
      settings: {
        toolCallSettings: { mode: 'AUTO', tools: ['task_tool'] },
      },
    },
    channel: { type: 'weixin-ilink' },
    metaData: { isTask: true, triggerType: 'task' },
  }
  assert.equal(applyChannelToolPolicy(event), false)
  assert.deepEqual(event.body.settings.toolCallSettings.tools, ['task_tool'])
})
