import { test } from 'node:test'
import assert from 'node:assert/strict'

import ChannelModelTool from '../../lib/plugins/channel-manager-plugin/tools/channel_model.js'

test('channel_model persists switch and reset through the channel config API', async () => {
  const updates = []
  const channel = {
    defaultModel: 'default-model',
    defaultProvider: 'DefaultProvider',
    model: 'old-model',
    provider: 'OldProvider',
    async updateModelConfig(patch) {
      updates.push(patch)
      Object.assign(this, patch)
    },
  }
  const tool = new ChannelModelTool()

  const switched = await tool.execute({
    channel,
    params: { action: 'switch', model: 'new-model', provider: 'NewProvider' },
  })
  assert.equal(switched.success, true)
  assert.deepEqual(updates[0], { model: 'new-model', provider: 'NewProvider' })
  assert.equal(channel.model, 'new-model')

  const reset = await tool.execute({ channel, params: { action: 'reset' } })
  assert.equal(reset.success, true)
  assert.deepEqual(updates[1], { model: 'default-model', provider: 'DefaultProvider' })
  assert.equal(channel.provider, 'DefaultProvider')
})
