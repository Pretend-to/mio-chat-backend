import { test, describe } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import './mock-env.js'
import {
  getAdapterMetadataList,
  getAvailableAdapterTypes,
  getAdapterAliasesMap,
} from '../../lib/chat/llm/adapters/registry.js'

describe('LLM Adapter Metadata Snapshot Integrity [Invariant I3 & I4]', async () => {
  const fixturePath = path.resolve(
    'tests/fixtures/adapter-metadata-snapshot.json',
  )
  const expectedSnapshot = JSON.parse(fs.readFileSync(fixturePath, 'utf8'))

  test('Metadata snapshot must match exactly across all adapters', async () => {
    const list = await getAdapterMetadataList()
    list.sort((a, b) => a.type.localeCompare(b.type))

    const currentNormalized = list.map((meta) => {
      const clone = JSON.parse(JSON.stringify(meta))
      if (clone.type === 'geminiOauth' && clone.description) {
        clone.description = clone.description
          .replace(/state=[^&)]+/g, 'state=[DYNAMIC_STATE]')
          .replace(/code_challenge=[^&)]+/g, 'code_challenge=[DYNAMIC_CHALLENGE]')
      }
      return clone
    })

    // 1. 数量与类型集合完整性
    const currentTypes = currentNormalized.map((m) => m.type)
    const expectedTypes = expectedSnapshot.map((m) => m.type)
    assert.deepStrictEqual(
      currentTypes,
      expectedTypes,
      'Adapter types list diverged from snapshot!',
    )

    // 2. 逐字段完全一致性（只增不减，已有定义 100% 吻合）
    for (let i = 0; i < expectedSnapshot.length; i++) {
      const expected = expectedSnapshot[i]
      const current = currentNormalized[i]

      assert.strictEqual(
        current.type,
        expected.type,
        `Type mismatch at index ${i}`,
      )
      assert.strictEqual(
        current.name,
        expected.name,
        `Name mismatch for ${current.type}`,
      )
      assert.strictEqual(
        current.avatarId,
        expected.avatarId,
        `avatarId mismatch for ${current.type}`,
      )
      assert.deepStrictEqual(
        current.avatarAliases,
        expected.avatarAliases,
        `avatarAliases mismatch for ${current.type}`,
      )
      assert.deepStrictEqual(
        current.supportedFeatures,
        expected.supportedFeatures,
        `supportedFeatures mismatch for ${current.type}`,
      )
      assert.deepStrictEqual(
        current.initialConfigSchema,
        expected.initialConfigSchema,
        `initialConfigSchema mismatch for ${current.type}`,
      )
      assert.deepStrictEqual(
        current.extraSettingsSchema,
        expected.extraSettingsSchema,
        `extraSettingsSchema mismatch for ${current.type}`,
      )
    }

    // 全结构深比较
    assert.deepStrictEqual(currentNormalized, expectedSnapshot)
  })

  test('Available adapter types and aliases map must match snapshot keys', async () => {
    const availableTypes = await getAvailableAdapterTypes()
    const expectedTypes = expectedSnapshot.map((m) => m.type)

    for (const t of expectedTypes) {
      assert.ok(
        availableTypes.includes(t),
        `Available types must include ${t}`,
      )
    }

    const aliasesMap = await getAdapterAliasesMap()
    assert.ok(typeof aliasesMap === 'object' && aliasesMap !== null)
  })
})
