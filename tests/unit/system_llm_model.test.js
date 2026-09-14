import { test } from 'node:test'
import assert from 'node:assert/strict'
import '../adapters/mock-env.js'

import SystemSettingsService from '../../lib/database/services/SystemSettingsService.js'
import llmService from '../../lib/chat/llm/index.js'

test('system title generation resolves display name and configured model', async (t) => {
  const originalGet = SystemSettingsService.get
  const originalLlms = llmService.llms
  const originalMetadata = llmService.instanceMetadata

  t.after(() => {
    SystemSettingsService.get = originalGet
    llmService.llms = originalLlms
    llmService.instanceMetadata = originalMetadata
  })

  SystemSettingsService.get = async (key) => {
    if (key === 'system_llm_channel') return { value: '标题模型渠道' }
    if (key === 'system_llm_model') return { value: 'title-model-2' }
    return null
  }

  let selectedModel = null
  llmService.instanceMetadata = {
    'title-instance': {
      adapterType: 'test',
      displayName: '标题模型渠道',
    },
  }
  llmService.llms = {
    'title-instance': {
      models: [{ owner: 'Test', models: ['title-model-1', 'title-model-2'] }],
      guestModels: [],
      provider: 'test',
      async handleChatRequest(event) {
        selectedModel = event.body.settings.base.model
        event.update({ type: 'content', content: '启动优化' })
        event.complete()
      },
    },
  }

  const title = await llmService.generateChatTitle([
    { role: 'user', content: '请优化启动速度' },
  ])

  assert.equal(selectedModel, 'title-model-2')
  assert.equal(title, '启动优化')
})
