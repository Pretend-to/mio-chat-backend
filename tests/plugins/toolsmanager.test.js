import { test } from 'node:test'
import assert from 'node:assert'
import '../adapters/mock-env.js'

import ToolsManager from '../../lib/plugins/ai-plugin/tools/toolsmanager.js'
import PresetService from '../../lib/database/services/PresetService.js'

test('ToolsManager - list tools', async (t) => {
  const tool = new ToolsManager()

  // Mock global.middleware.plugins
  global.middleware.plugins = [
    {
      name: 'ai-plugin',
      getTools: () => {
        const map = new Map()
        map.set('ai-plugin', [
          { name: 'cron', description: 'Manage tasks' },
          { name: 'toolsmanager', description: 'Manage tools' }
        ])
        return map
      }
    },
    {
      name: 'web-plugin',
      getTools: () => {
        const map = new Map()
        map.set('web-plugin', [
          { name: 'crawl', description: 'Crawl web pages' }
        ])
        return map
      }
    }
  ]

  await t.test('should dynamically generate description containing tool names', () => {
    const jsonSchema = tool.json('openai')
    const desc = jsonSchema.function.description
    assert.ok(desc.includes('cron'))
    assert.ok(desc.includes('toolsmanager'))
    assert.ok(desc.includes('crawl'))
    assert.ok(desc.includes('CRITICAL'))
  })

  await t.test('should list all tools with correct enabled status', async () => {
    const e = {
      params: { action: 'list' },
      body: {
        settings: {
          toolCallSettings: {
            tools: ['cron', 'crawl']
          }
        }
      }
    }

    const result = await tool.execute(e)
    assert.strictEqual(result.success, true)
    
    // Check that tools list has correct enabled fields
    const groups = result.groups
    assert.ok(groups['ai-plugin'])
    assert.ok(groups['web-plugin'])
    
    const cronTool = groups['ai-plugin'].find(t => t.name === 'cron')
    const managerTool = groups['ai-plugin'].find(t => t.name === 'toolsmanager')
    const crawlTool = groups['web-plugin'].find(t => t.name === 'crawl')
    
    assert.strictEqual(cronTool.enabled, true)
    assert.strictEqual(managerTool.enabled, false)
    assert.strictEqual(crawlTool.enabled, true)
  })
})

test('ToolsManager - toggle tools', async (t) => {
  const tool = new ToolsManager()

  // Mock global.middleware.plugins
  global.middleware.plugins = [
    {
      name: 'ai-plugin',
      getTools: () => {
        const map = new Map()
        map.set('ai-plugin', [
          { name: 'cron', description: 'Manage tasks' },
          { name: 'toolsmanager', description: 'Manage tools' }
        ])
        return map
      }
    },
    {
      name: 'web-plugin',
      getTools: () => {
        const map = new Map()
        map.set('web-plugin', [
          { name: 'crawl', description: 'Crawl web pages' }
        ])
        return map
      }
    }
  ]

  await t.test('should enable specified tool', async () => {
    let sentSystemMessage = null
    const e = {
      params: { action: 'toggle', tools: ['toolsmanager'], enabled: true },
      body: {
        contactorId: 'test-contactor',
        settings: {
          toolCallSettings: {
            tools: ['cron']
          }
        }
      },
      client: {
        sendSystemMessage: (type, data) => {
          sentSystemMessage = { type, data }
        }
      }
    }

    const result = await tool.execute(e)
    assert.strictEqual(result.success, true)
    assert.deepStrictEqual(e.body.settings.toolCallSettings.tools, ['cron', 'toolsmanager'])
    
    // System message verification
    assert.ok(sentSystemMessage)
    assert.strictEqual(sentSystemMessage.type, 'contactor_tools_updated')
    assert.deepStrictEqual(sentSystemMessage.data.tools, ['cron', 'toolsmanager'])
  })

  await t.test('should disable specified tool', async () => {
    const e = {
      params: { action: 'toggle', tools: ['cron'], enabled: false },
      body: {
        contactorId: 'test-contactor',
        settings: {
          toolCallSettings: {
            tools: ['cron', 'toolsmanager']
          }
        }
      },
      client: {
        sendSystemMessage: () => {}
      }
    }

    const result = await tool.execute(e)
    assert.strictEqual(result.success, true)
    assert.deepStrictEqual(e.body.settings.toolCallSettings.tools, ['toolsmanager'])
  })

  await t.test('should toggle entire group of tools', async () => {
    const e = {
      params: { action: 'toggle', groups: ['ai-plugin'], enabled: false },
      body: {
        contactorId: 'test-contactor',
        settings: {
          toolCallSettings: {
            tools: ['cron', 'toolsmanager', 'crawl']
          }
        }
      },
      client: {
        sendSystemMessage: () => {}
      }
    }

    const result = await tool.execute(e)
    assert.strictEqual(result.success, true)
    // Both cron and toolsmanager are in ai-plugin, so they should be disabled, leaving only crawl
    assert.deepStrictEqual(e.body.settings.toolCallSettings.tools, ['crawl'])
  })
})
