import { test } from 'node:test';
import './mock-env.js';
import { runGenericAdapterTests } from './test-suite.js';
import AgentPlatformAdapter from '../../lib/chat/llm/adapters/implementations/agentPlatform.js';

test('Agent Platform Adapter', async (t) => {
  const config = {
    api_key: 'vertex-mock-key',
    base_url: 'https://aiplatform.googleapis.com'
  };

  const mocks = {
    models: async () => [{ owner: 'Vertex', models: ['gemini-2.5-flash'] }],
    createCore: (event) => ({
      chat: async function* () {
        yield { candidates: [{ content: { parts: [{ text: 'Hello from Vertex AI' }] } }] };
      }
    })
  };

  await runGenericAdapterTests(t, AgentPlatformAdapter, config, mocks);
});
