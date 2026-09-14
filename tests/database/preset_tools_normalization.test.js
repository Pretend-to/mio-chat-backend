import test from 'node:test'
import assert from 'node:assert/strict'

import PresetService, {
  normalizePresetTools,
} from '../../lib/database/services/PresetService.js'

test('normalizePresetTools canonicalizes legacy Skill names', () => {
  assert.deepEqual(
    normalizePresetTools([
      'search',
      'Skill',
      'skill',
      'Skill_mid_ab12',
      'skill_mid_ab12',
      'skill-manager',
    ]),
    ['search', 'skill', 'skill_mid_ab12', 'skill-manager'],
  )
})

test('PresetService normalizes tools when reading existing presets', () => {
  const preset = PresetService._parsePreset({
    history: '[]',
    name: 'legacy',
    tools: '["Skill","search"]',
  })

  assert.deepEqual(preset.tools, ['skill', 'search'])
})
