import { test } from 'node:test';
import assert from 'node:assert';
import './mock-env.js';
import { scanFrontendTurns, compress } from '../../lib/chat/llm/services/CrystallizationService.js';

test('Crystallization - scanFrontendTurns', async (t) => {
  await t.test('should return 0 for empty or null messages', () => {
    assert.strictEqual(scanFrontendTurns(null), 0);
    assert.strictEqual(scanFrontendTurns([]), 0);
  });

  await t.test('should return 0 when there are fewer turns than requested', () => {
    const messages = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
    ];
    assert.strictEqual(scanFrontendTurns(messages, 2), 0);
  });

  await t.test('should correctly identify turn boundary for simple conversation', () => {
    const messages = [
      { role: 'user', content: 'hello 1' },
      { role: 'assistant', content: 'hi 1' },
      { role: 'user', content: 'hello 2' },
      { role: 'assistant', content: 'hi 2' },
    ];
    // Keep 1 turn (should protect the last user turn)
    assert.strictEqual(scanFrontendTurns(messages, 1), 2); // 'hello 2' is index 2

    // Keep 2 turns (should protect the last two user turns)
    assert.strictEqual(scanFrontendTurns(messages, 2), 0); // 'hello 1' is index 0
  });

  await t.test('should preserve tool_call and tool response chains', () => {
    const messages = [
      { role: 'user', content: 'run tool' }, // index 0 (turn 3)
      { role: 'assistant', content: 'ok' }, // index 1
      { role: 'user', content: 'run tool again' }, // index 2 (turn 2)
      { role: 'assistant', tool_calls: [{ id: 'call_1', name: 'tool' }] }, // index 3
      { role: 'tool', tool_call_id: 'call_1', content: 'result' }, // index 4
      { role: 'assistant', content: 'done' }, // index 5
      { role: 'user', content: 'final' }, // index 6 (turn 1)
      { role: 'assistant', content: 'final resp' } // index 7
    ];

    // Keep 1 turn -> should protect from 'final' (index 6) onwards
    assert.strictEqual(scanFrontendTurns(messages, 1), 6);

    // Keep 2 turns -> should protect from 'run tool again' (index 2) onwards
    assert.strictEqual(scanFrontendTurns(messages, 2), 2);

    // Keep 3 turns -> should protect from 'run tool' (index 0) onwards
    assert.strictEqual(scanFrontendTurns(messages, 3), 0);
  });
});

import { parseXmlZones, buildXmlFromZones, applyMemoryCrud } from '../../lib/chat/llm/services/CrystallizationService.js';

test('Crystallization - Memory CRUD helpers', async (t) => {
  await t.test('should parse XML zones correctly', () => {
    const xml = `
<long_term_profile>
Rust is awesome.
JavaScript is okay.
</long_term_profile>

<short_term_goals>
Learn Go.
</short_term_goals>
`;
    const zones = parseXmlZones(xml);
    assert.strictEqual(zones.long_term_profile, 'Rust is awesome.\nJavaScript is okay.');
    assert.strictEqual(zones.short_term_goals, 'Learn Go.');
    assert.strictEqual(zones.current_plan, '');
  });

  await t.test('should build XML zones correctly', () => {
    const zones = {
      long_term_profile: 'Rust is awesome.',
      short_term_goals: 'Learn Go.',
      current_plan: 'Task 1',
      file_architecture_delta: '',
      constraints: '',
    };
    const xml = buildXmlFromZones(zones);
    assert.ok(xml.includes('<long_term_profile>\nRust is awesome.\n</long_term_profile>'));
    assert.ok(xml.includes('<short_term_goals>\nLearn Go.\n</short_term_goals>'));
    assert.ok(xml.includes('<current_plan>\nTask 1\n</current_plan>'));
  });

  await t.test('should perform CRUD ADD action correctly', () => {
    const initialXml = `<long_term_profile>\nUser likes Python.\n</long_term_profile>`;
    const updated = applyMemoryCrud(initialXml, {
      action: 'add',
      zone: 'long_term_profile',
      content: 'User likes C++.',
    });
    const parsed = parseXmlZones(updated);
    assert.strictEqual(parsed.long_term_profile, 'User likes Python.\nUser likes C++.');
  });

  await t.test('should perform CRUD DELETE action correctly', () => {
    const initialXml = `<long_term_profile>\nLine 1: User likes Python.\nLine 2: User likes C++.\n</long_term_profile>`;
    const updated = applyMemoryCrud(initialXml, {
      action: 'delete',
      zone: 'long_term_profile',
      target: 'Python',
    });
    const parsed = parseXmlZones(updated);
    assert.strictEqual(parsed.long_term_profile, 'Line 2: User likes C++.');
  });

  await t.test('should perform CRUD UPDATE action with target correctly', () => {
    const initialXml = `<long_term_profile>\nLine 1: User likes Python.\nLine 2: User likes C++.\n</long_term_profile>`;
    const updated = applyMemoryCrud(initialXml, {
      action: 'update',
      zone: 'long_term_profile',
      target: 'Line 2: User likes C++',
      content: 'Line 2: User likes Rust',
    });
    const parsed = parseXmlZones(updated);
    assert.strictEqual(parsed.long_term_profile, 'Line 1: User likes Python.\nLine 2: User likes Rust.');
  });

  await t.test('should perform CRUD UPDATE action without target (overwrite) correctly', () => {
    const initialXml = `<long_term_profile>\nLine 1: User likes Python.\nLine 2: User likes C++.\n</long_term_profile>`;
    const updated = applyMemoryCrud(initialXml, {
      action: 'update',
      zone: 'long_term_profile',
      content: 'Overwrite completely',
    });
    const parsed = parseXmlZones(updated);
    assert.strictEqual(parsed.long_term_profile, 'Overwrite completely');
  });
});

import Memory from '../../lib/plugins/ai-plugin/tools/memory.js';

test('Crystallization - Memory Tool integration', async (t) => {
  await t.test('should throw error if crystallization is not enabled', async () => {
    const tool = new Memory();
    const event = {
      params: { action: 'add', zone: 'long_term_profile', content: 'test fact' },
      body: {
        settings: {
          crystallization_token_watermark: 0, // not enabled
        }
      }
    };
    await assert.rejects(
      async () => { await tool.recordMemory(event); },
      /记忆管理工具仅在开启记忆结晶功能时可用/
    );
  });

  await t.test('should execute successfully when crystallization is enabled', async () => {
    const tool = new Memory();
    const event = {
      params: { action: 'add', zone: 'long_term_profile', content: 'User is a developer' },
      body: {
        settings: {
          crystallization_token_watermark: 500, // enabled
          previous_summary: '',
        }
      }
    };
    const result = await tool.recordMemory(event);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.action, 'add');
    assert.strictEqual(result.zone, 'long_term_profile');
    assert.ok(result.summary.includes('<long_term_profile>\nUser is a developer\n</long_term_profile>'));
    assert.strictEqual(event.body.settings.previous_summary, result.summary);
  });
});

test('Crystallization - compress process', async (t) => {
  await t.test('should run compression successfully and reconstruct message chain', async () => {
    const updates = [];
    const mockEvent = {
      body: {
        messages: [
          { role: 'user', content: 'hello 1' },
          { role: 'assistant', content: 'hi 1' },
          { role: 'user', content: 'hello 2' },
          { role: 'assistant', content: 'hi 2' },
        ],
        settings: {
          crystallization_keep_turns: 1, // keep 'hello 2' and 'hi 2'
          previous_summary: '<long_term_profile>\nUser likes Rust\n</long_term_profile>',
        }
      },
      update: (data) => {
        updates.push(data);
      }
    };

    const mockLlmService = {
      llms: {
        mock_channel: {
          models: [{ models: ['mock-model'] }],
          handleChatRequest: async (compressEvent) => {
            compressEvent.update({
              type: 'content',
              content: '<long_term_profile>\nUser likes JavaScript\n</long_term_profile>',
            });
            compressEvent.complete();
          }
        }
      }
    };

    const result = await compress(mockEvent, mockLlmService);

    assert.ok(result);
    assert.strictEqual(result.summary, '<long_term_profile>\nUser likes JavaScript\n</long_term_profile>');
    
    // The reconstructed message chain should be: [crystalSystemMessage, ...recentMessages]
    // recentMessages: hello 2 (index 2) and hi 2 (index 3)
    assert.strictEqual(result.messages.length, 3);
    assert.strictEqual(result.messages[0].role, 'system');
    assert.strictEqual(result.messages[0]._is_crystal, true);
    assert.ok(result.messages[0].content.includes('User likes JavaScript'));
    assert.strictEqual(result.messages[1].content, 'hello 2');
    assert.strictEqual(result.messages[2].content, 'hi 2');

    // Verify updates stream was triggered
    assert.ok(updates.length > 0);
    assert.strictEqual(updates[0].type, 'crystallize');
    assert.strictEqual(updates[0].content.status, 'running');
    assert.strictEqual(updates[0].content.summary, '<long_term_profile>\nUser likes JavaScript\n</long_term_profile>');
  });
});

