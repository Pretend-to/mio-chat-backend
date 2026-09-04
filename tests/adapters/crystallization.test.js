import { test } from 'node:test';
import assert from 'node:assert';
import './mock-env.js';
import { compress, scanFrontendTurns } from '../../lib/chat/llm/services/CrystallizationService.js';

test('Crystallization - scanFrontendTurns', async (t) => {
  await t.test('should return 0 for empty or null messages', () => {
    assert.strictEqual(scanFrontendTurns(null), 0);
    assert.strictEqual(scanFrontendTurns([]), 0);
  });

  await t.test('should return 0 when there are fewer turns than requested', () => {
    const messages = [
      { content: 'hello', role: 'user' },
      { content: 'hi', role: 'assistant' },
    ];
    assert.strictEqual(scanFrontendTurns(messages, 2), 0);
  });

  await t.test('should correctly identify turn boundary for simple conversation', () => {
    const messages = [
      { content: 'hello 1', role: 'user' },
      { content: 'hi 1', role: 'assistant' },
      { content: 'hello 2', role: 'user' },
      { content: 'hi 2', role: 'assistant' },
    ];
    // Keep 1 turn (should protect the last user turn)
    assert.strictEqual(scanFrontendTurns(messages, 1), 2); // 'hello 2' is index 2

    // Keep 2 turns (should protect the last two user turns)
    assert.strictEqual(scanFrontendTurns(messages, 2), 0); // 'hello 1' is index 0
  });

  await t.test('should preserve tool_call and tool response chains', () => {
    const messages = [
      { content: 'run tool', role: 'user' }, // Index 0 (turn 3)
      { content: 'ok', role: 'assistant' }, // Index 1
      { content: 'run tool again', role: 'user' }, // Index 2 (turn 2)
      { role: 'assistant', tool_calls: [{ id: 'call_1', name: 'tool' }] }, // Index 3
      { content: 'result', role: 'tool', tool_call_id: 'call_1' }, // Index 4
      { content: 'done', role: 'assistant' }, // Index 5
      { content: 'final', role: 'user' }, // Index 6 (turn 1)
      { content: 'final resp', role: 'assistant' } // Index 7
    ];

    // Keep 1 turn -> should protect from 'final' (index 6) onwards
    assert.strictEqual(scanFrontendTurns(messages, 1), 6);

    // Keep 2 turns -> should protect from 'run tool again' (index 2) onwards
    assert.strictEqual(scanFrontendTurns(messages, 2), 2);

    // Keep 3 turns -> should protect from 'run tool' (index 0) onwards
    assert.strictEqual(scanFrontendTurns(messages, 3), 0);
  });

  await t.test('should treat recursive post messages as part of the current turn', () => {
    const recursivePostMessage = { content: 'image context', role: 'user' };
    Object.defineProperty(recursivePostMessage, '_is_recursive_context', {
      enumerable: false,
      value: true,
    });
    const messages = [
      { content: 'previous', role: 'user' },
      { content: 'previous answer', role: 'assistant' },
      { content: 'current', role: 'user' },
      { role: 'assistant', tool_calls: [{ id: 'call_1' }] },
      { content: 'result', role: 'tool', tool_call_id: 'call_1' },
      recursivePostMessage,
    ];

    assert.strictEqual(scanFrontendTurns(messages, 1), 2);
    assert.strictEqual(scanFrontendTurns(messages, 2), 0);
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
      constraints: '',
      current_plan: 'Task 1',
      file_architecture_delta: '',
      long_term_profile: 'Rust is awesome.',
      short_term_goals: 'Learn Go.',
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
      content: 'User likes C++.',
      zone: 'long_term_profile',
    });
    const parsed = parseXmlZones(updated);
    assert.strictEqual(parsed.long_term_profile, 'User likes Python.\nUser likes C++.');
  });

  await t.test('should perform CRUD DELETE action correctly', () => {
    const initialXml = `<long_term_profile>\nLine 1: User likes Python.\nLine 2: User likes C++.\n</long_term_profile>`;
    const updated = applyMemoryCrud(initialXml, {
      action: 'delete',
      target: 'Python',
      zone: 'long_term_profile',
    });
    const parsed = parseXmlZones(updated);
    assert.strictEqual(parsed.long_term_profile, 'Line 2: User likes C++.');
  });

  await t.test('should perform CRUD UPDATE action with target correctly', () => {
    const initialXml = `<long_term_profile>\nLine 1: User likes Python.\nLine 2: User likes C++.\n</long_term_profile>`;
    const updated = applyMemoryCrud(initialXml, {
      action: 'update',
      content: 'Line 2: User likes Rust',
      target: 'Line 2: User likes C++',
      zone: 'long_term_profile',
    });
    const parsed = parseXmlZones(updated);
    assert.strictEqual(parsed.long_term_profile, 'Line 1: User likes Python.\nLine 2: User likes Rust.');
  });

  await t.test('should perform CRUD UPDATE action without target (overwrite) correctly', () => {
    const initialXml = `<long_term_profile>\nLine 1: User likes Python.\nLine 2: User likes C++.\n</long_term_profile>`;
    const updated = applyMemoryCrud(initialXml, {
      action: 'update',
      content: 'Overwrite completely',
      zone: 'long_term_profile',
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
      body: {
        settings: {
          crystallization_token_watermark: 0, // not enabled
        }
      },
      params: { action: 'add', content: 'test fact', zone: 'long_term_profile' }
    };
    await assert.rejects(
      async () => { await tool.recordMemory(event); },
      /本地会话记忆结晶工具仅在开启结晶功能时可用/
    );
  });

  await t.test('should execute successfully when crystallization is enabled', async () => {
    const tool = new Memory();
    const event = {
      body: {
        settings: {
          crystallization_token_watermark: 500, // enabled
          previous_summary: '',
        }
      },
      params: { action: 'add', content: 'User is a developer', zone: 'long_term_profile' }
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
          { content: 'hello 1', role: 'user' },
          { content: 'hi 1', role: 'assistant' },
          { content: 'hello 2', role: 'user' },
          { content: 'hi 2', role: 'assistant' },
        ],
        settings: {
          crystallization_keep_turns: 1, // Keep 'hello 2' and 'hi 2'
          previous_summary: '<long_term_profile>\nUser likes Rust\n</long_term_profile>',
        }
      },
      update: (data) => {
        updates.push(data);
      }
    };

    const mockLlm = {
      handleChatRequest: async (compressEvent) => {
        compressEvent.update({
          type: 'content',
          content: '<long_term_profile>\nUser likes JavaScript\n</long_term_profile>',
        });
        compressEvent.complete();
      },
      models: [{ models: ['mock-model'] }]
    };

    const result = await compress(mockEvent, mockLlm, 2);

    assert.ok(result);
    assert.strictEqual(result.summary, '<long_term_profile>\nUser likes JavaScript\n</long_term_profile>');
    
    // The reconstructed message chain should be: [crystalSystemMessage, ...recentMessages]
    // RecentMessages: hello 2 (index 2) and hi 2 (index 3)
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
