import { test } from 'node:test';
import assert from 'node:assert';
import '../adapters/mock-env.js';
import { veryfyMcpConfig } from '../../lib/plugins/mcp-plugin/lib/mcpLoader.js';

test('MCP Loader - Disabled attribute', async (t) => {
  await t.test('should skip disabled MCP servers and preserve others', () => {
    const config = {
      mcpServers: {
        'disabled-http-server': {
          url: 'https://mcp.tavily.com/mcp/',
          disabled: true,
        },
        'disabled-stdio-server': {
          command: 'node',
          args: ['server.js'],
          disabled: 'true', // string 'true' also counts
        },
        'active-http-server': {
          url: 'https://mcp.active.com/mcp/',
          // disabled is undefined, should load by default
        },
        'active-stdio-server': {
          command: 'node',
          args: ['active.js'],
          disabled: false, // explicitly false should load
        }
      }
    };

    const verified = veryfyMcpConfig(config);

    // Verify that disabled servers are omitted
    assert.strictEqual(verified['disabled-http-server'], undefined);
    assert.strictEqual(verified['disabled-stdio-server'], undefined);

    // Verify that active servers are preserved
    assert.ok(verified['active-http-server']);
    assert.strictEqual(verified['active-http-server'].url, 'https://mcp.active.com/mcp/');
    
    assert.ok(verified['active-stdio-server']);
    assert.strictEqual(verified['active-stdio-server'].command, 'node');
  });
});
