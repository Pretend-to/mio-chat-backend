import { test } from 'node:test'
import assert from 'node:assert'
import SkillTool from '../../lib/plugins/ai-plugin/tools/skill.js'
import skillService from '../../lib/chat/llm/services/SkillService.js'

test('SkillTool: 统一 skill 工具 (list, load, refresh) 与 Progressive Disclosure 测试', async (t) => {
  const tool = new SkillTool()

  await skillService.initialize()

  await t.test('工具元信息校验', () => {
    assert.strictEqual(tool.name.split('_mid_')[0], 'skill')
    assert.ok(tool.name.startsWith('skill_mid_'))
    assert.ok(tool.description.includes('list'))
    assert.ok(tool.description.includes('load'))
    assert.ok(tool.description.includes('refresh'))
    assert.deepStrictEqual(tool.parameters.properties.action.enum, [
      'list',
      'load',
      'refresh',
    ])
    assert.deepStrictEqual(tool.parameters.required, ['action'])
  })

  await t.test('action="list": 列出所有技能并支持 query 搜索', async () => {
    const listRes = await tool.executeAction({ params: { action: 'list' } })
    assert.strictEqual(listRes.success, true)
    assert.ok(Array.isArray(listRes.skills))
    assert.ok(listRes.total_available >= 0)

    if (listRes.skills.length > 0) {
      const firstSkillName = listRes.skills[0].name
      const searchRes = await tool.executeAction({
        params: { action: 'list', query: firstSkillName },
      })
      assert.strictEqual(searchRes.success, true)
      assert.ok(searchRes.skills.some((s) => s.name === firstSkillName))
    }
  })

  await t.test('action="load": 正常加载与错误处理', async () => {
    // 缺少 name
    const noNameRes = await tool.executeAction({ params: { action: 'load' } })
    assert.strictEqual(noNameRes.success, false)
    assert.ok(noNameRes.error.includes('required'))

    // 加载不存在的技能
    const notFoundRes = await tool.executeAction({
      params: { action: 'load', name: 'non_existent_skill_xyz_123' },
    })
    assert.strictEqual(notFoundRes.success, false)
    assert.ok(notFoundRes.error.includes('not found'))
    assert.ok(Array.isArray(notFoundRes.available_skills))

    // 加载已有技能（如果有）
    const catalog = skillService.getSkillCatalog()
    if (catalog.length > 0) {
      const existingName = catalog[0].name
      const loadRes = await tool.executeAction({
        params: { action: 'load', name: existingName },
      })
      assert.strictEqual(loadRes.success, true)
      assert.strictEqual(loadRes.name, existingName)
      assert.ok(typeof loadRes.instructions === 'string')

      // 测试兼容别名 skill_name
      const loadAliasRes = await tool.executeAction({
        params: { action: 'load', skill_name: existingName },
      })
      assert.strictEqual(loadAliasRes.success, true)
      assert.strictEqual(loadAliasRes.name, existingName)
    }
  })

  await t.test('action="refresh": 刷新技能目录', async () => {
    const refreshRes = await tool.executeAction({
      params: { action: 'refresh' },
    })
    assert.strictEqual(refreshRes.success, true)
    assert.ok(refreshRes.total_skills >= 0)
    assert.ok(Array.isArray(refreshRes.available_skills))
  })

  await t.test(
    '工具解析兼容性：getLLMTools 与 runTool 支持大小写兼容',
    async () => {
      const { default: llmService } =
        await import('../../lib/chat/llm/index.js')
      const mockPlugin = {
        getTools: () => new Map([['ai-plugin', [tool]]]),
      }
      llmService.setPlugins([mockPlugin])

      // getLLMTools 支持 'Skill' 与 'skill'
      const toolsSkillUpper = llmService.getLLMTools(['Skill'], 'openai')
      assert.strictEqual(toolsSkillUpper.length, 1)
      assert.strictEqual(toolsSkillUpper[0].function.name, tool.name)

      const toolsSkillLower = llmService.getLLMTools(['skill'], 'openai')
      assert.strictEqual(toolsSkillLower.length, 1)
      assert.strictEqual(toolsSkillLower[0].function.name, tool.name)

      // runTool 支持 'Skill' 与 'skill'
      const runUpper = await llmService.runTool(
        { name: 'Skill', parameters: { action: 'list' } },
        { role: 'admin' },
      )
      assert.strictEqual(runUpper.result.success, true)

      const runLower = await llmService.runTool(
        { name: 'skill', parameters: { action: 'list' } },
        { role: 'admin' },
      )
      assert.strictEqual(runLower.result.success, true)
    },
  )
})
