import { test } from 'node:test';
import assert from 'node:assert';
import {
  assembleSystemPrompt,
  parseXmlZones,
  buildXmlFromZones,
  CRYSTAL_ZONES,
} from '../../../mio-chat-frontend/src/utils/SystemPromptAssembler.js';

test('SystemPromptAssembler - frontend system prompt assembler tests', async (t) => {
  await t.test('assembleSystemPrompt should combine base prompt and latestSummary', () => {
    const base = 'You are a helpful assistant.';
    const summary = '<long_term_profile>Likes coding</long_term_profile>';
    const expected = 'You are a helpful assistant.\n\n<memory_crystal>\n<long_term_profile>Likes coding</long_term_profile>\n</memory_crystal>';
    assert.strictEqual(assembleSystemPrompt(base, summary), expected);
  });

  await t.test('assembleSystemPrompt should return base prompt if summary is empty', () => {
    const base = 'You are a helpful assistant.';
    assert.strictEqual(assembleSystemPrompt(base, ''), base);
    assert.strictEqual(assembleSystemPrompt(base, null), base);
  });

  await t.test('parseXmlZones should correctly parse valid xml zones', () => {
    const xml = `
<long_term_profile>
User likes Javascript.
</long_term_profile>

<short_term_goals>
Implement crystallization.
</short_term_goals>

<current_plan>
Phase 3 testing.
</current_plan>

<file_architecture_delta>
Add test files.
</file_architecture_delta>

<constraints>
No external dependencies.
</constraints>
    `;

    const parsed = parseXmlZones(xml);
    assert.strictEqual(parsed.long_term_profile, 'User likes Javascript.');
    assert.strictEqual(parsed.short_term_goals, 'Implement crystallization.');
    assert.strictEqual(parsed.current_plan, 'Phase 3 testing.');
    assert.strictEqual(parsed.file_architecture_delta, 'Add test files.');
    assert.strictEqual(parsed.constraints, 'No external dependencies.');
  });

  await t.test('parseXmlZones should handle missing zones gracefully', () => {
    const xml = `
<long_term_profile>
User likes Javascript.
</long_term_profile>
    `;
    const parsed = parseXmlZones(xml);
    assert.strictEqual(parsed.long_term_profile, 'User likes Javascript.');
    assert.strictEqual(parsed.short_term_goals, '');
    assert.strictEqual(parsed.current_plan, '');
  });

  await t.test('buildXmlFromZones should correctly construct xml from object', () => {
    const zones = {
      long_term_profile: 'User likes Javascript.',
      short_term_goals: 'Implement crystallization.',
      current_plan: 'Phase 3 testing.',
      file_architecture_delta: 'Add test files.',
      constraints: 'No external dependencies.',
    };

    const xml = buildXmlFromZones(zones);
    assert.ok(xml.includes('<long_term_profile>\nUser likes Javascript.\n</long_term_profile>'));
    assert.ok(xml.includes('<constraints>\nNo external dependencies.\n</constraints>'));

    // Round trip test
    const parsed = parseXmlZones(xml);
    assert.deepStrictEqual(parsed, zones);
  });
});
