# Zhipu AI OpenAI Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new Zhipu AI OpenAI-compatible adapter (`zhipu`) to allow full support for GLM-4, GLM-5.1, and other Zhipu models, including smart reasoning (thinking) conversion based on preset parameters.

**Architecture:** Create `zhipu.js` inheriting from `OpenAIBot` in `lib/chat/llm/adapters/implementations/`. Override `_prepareChatBody` to fetch the `reasoning_effort` setting from the input body before it is stripped, inject `extra_body.thinking` config, and strip `reasoning_effort` from the top level body to prevent 400 errors.

**Tech Stack:** Node.js, ESM, OpenAI compatible client SDK, standard unit tests using `node:test`.

---

### Task 1: Create Zhipu Adapter File

**Files:**
- Create: `lib/chat/llm/adapters/implementations/zhipu.js`

- [ ] **Step 1: Write the ZhipuAdapter boilerplate**

Write the new adapter implementation in `lib/chat/llm/adapters/implementations/zhipu.js` that inherits from `OpenAIBot`, specifying Zhipu's metadata, schema, and base URL.

```javascript
import OpenAIBot from './openai.js'

/**
 * @class Zhipu (智谱AI) 适配器
 * 完全继承自 OpenAIBot，仅修改元数据与特有标识，并处理独特的思考（thinking）模式
 */
export default class ZhipuAdapter extends OpenAIBot {
  /**
   * 获取适配器元数据
   */
  static getAdapterMetadata() {
    return {
      type: 'zhipu',
      avatarId: 'zhipu',
      avatarAliases: {
        zhipu: 'zhipu',
        '智谱': 'zhipu',
        '智谱AI': 'zhipu',
        'glm': 'zhipu'
      },
      name: 'Zhipu (智谱AI)',
      description:
        '智谱 AI（bigmodel.cn）开放平台服务适配器。支持 GLM-4, GLM-5.1 等系列模型，在数学、逻辑推理和多模态理解方面表现优秀，完全兼容 OpenAI 协议。\n\n**获取方式**：请前往 [智谱 AI 开放平台](https://bigmodel.cn) 注册并创建 API Key。',
      supportedFeatures: ['chat', 'streaming', 'function_calling', 'vision', 'reasoning'],
      initialConfigSchema: {
        enable: {
          type: 'boolean',
          default: true,
          description: '是否启用此适配器实例',
          required: true,
          label: '启用',
        },
        name: {
          type: 'string',
          default: '',
          description: '适配器实例的自定义名称',
          required: false,
          label: '实例名称',
          placeholder: '例如：智谱-主要',
        },
        api_key: {
          type: 'password',
          default: '',
          description: '智谱 AI API 密钥',
          required: true,
          label: 'API Key',
          placeholder: 'API Key',
        },
        base_url: {
          type: 'url',
          default: 'https://open.bigmodel.cn/api/paas/v4/',
          description: '智谱 AI API 基础 URL',
          required: true,
          label: 'Base URL',
          placeholder: 'https://open.bigmodel.cn/api/paas/v4/',
        },
        models: {
          type: 'array',
          default: [],
          description: '可用的模型列表，通常由系统自动获取',
          required: false,
          label: '模型列表',
          readonly: true,
        },
      },
    }
  }

  /**
   * 构造函数
   */
  constructor(zhipuConfig) {
    super(zhipuConfig)
    this.provider = 'zhipu'
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/chat/llm/adapters/implementations/zhipu.js
git commit -m "feat: add ZhipuAdapter skeleton and metadata"
```

---

### Task 2: Implement Chat Body Preparation and Thinking Adapter

**Files:**
- Modify: `lib/chat/llm/adapters/implementations/zhipu.js`

- [ ] **Step 1: Add custom `_prepareChatBody` method**

Inject `_prepareChatBody` to read `reasoning_effort` from the original body before calling `super._prepareChatBody` (as `super` will strip it), then map it to `extra_body.thinking` and clean up.

Target code chunk to append inside the class in `lib/chat/llm/adapters/implementations/zhipu.js`:

```javascript
  /**
   * 预处理聊天请求体，为智谱 AI 推理模型添加思考模式支持，并剥离顶层不支持的参数
   */
  async _prepareChatBody(body) {
    // 1. 优先提取原始的 reasoning_effort 参数，避免父类过滤剥离
    const reasoningEffort = body.settings?.chatParams?.reasoning_effort

    // 2. 调用父类的常规转换（如 tools、多模态消息处理）
    const preparedBody = await super._prepareChatBody(body)

    // 3. 剥离可能存在的旧 thinking 属性，防止干扰
    if (preparedBody.thinking) {
      delete preparedBody.thinking
    }

    // 4. 根据 reasoning_effort 转换 extra_body 中的 thinking
    if (reasoningEffort !== undefined && reasoningEffort !== null) {
      if (reasoningEffort === 0 || reasoningEffort === '0') {
        preparedBody.extra_body = {
          thinking: {
            type: 'disabled',
          },
        }
      } else {
        preparedBody.extra_body = {
          thinking: {
            type: 'enabled',
          },
        }
      }
    }

    // 5. 绝对确保从顶层请求体中移除 reasoning_effort 字段以防 API 报错 400
    if ('reasoning_effort' in preparedBody) {
      delete preparedBody.reasoning_effort
    }

    return preparedBody
  }
```

- [ ] **Step 2: Commit**

```bash
git add lib/chat/llm/adapters/implementations/zhipu.js
git commit -m "feat: implement _prepareChatBody with thinking mapping in ZhipuAdapter"
```

---

### Task 3: Write and Run Tests

**Files:**
- Create: `tests/adapters/zhipu.test.js`

- [ ] **Step 1: Write Zhipu unit tests**

Create the test file `tests/adapters/zhipu.test.js` that checks metadata, standard body preparation, thinking mode conversion, and runs `runGenericAdapterTests`.

```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import './mock-env.js';
import { runGenericAdapterTests } from './test-suite.js';
import ZhipuAdapter from '../../lib/chat/llm/adapters/implementations/zhipu.js';

test('Zhipu Adapter - Metadata & Core Initialization', async (t) => {
  const metadata = ZhipuAdapter.getAdapterMetadata();
  assert.strictEqual(metadata.type, 'zhipu');
  assert.strictEqual(metadata.avatarId, 'zhipu');
  assert.strictEqual(metadata.initialConfigSchema.base_url.default, 'https://open.bigmodel.cn/api/paas/v4/');
  assert.deepStrictEqual(metadata.supportedFeatures, ['chat', 'streaming', 'function_calling', 'vision', 'reasoning']);
});

test('Zhipu Adapter - Chat Body Preparation', async (t) => {
  const config = {
    api_key: 'sk-zhipu-mock',
    base_url: 'https://open.bigmodel.cn/api/paas/v4/'
  };

  const adapter = new ZhipuAdapter(config);

  // 测试 1: 当 reasoning_effort 开启时
  const bodyWithReasoning = {
    messages: [{ role: 'user', content: 'Hello' }],
    settings: {
      base: { model: 'glm-4.7', stream: true },
      chatParams: { reasoning_effort: 3, temperature: 0.7 },
      toolCallSettings: { tools: [], mode: 'NONE' }
    }
  };

  const resultWithReasoning = await adapter._prepareChatBody(bodyWithReasoning);
  assert.deepStrictEqual(resultWithReasoning.extra_body, {
    thinking: { type: 'enabled' }
  });
  assert.strictEqual(resultWithReasoning.reasoning_effort, undefined);

  // 测试 2: 当 reasoning_effort 关闭（为 0）时
  const bodyWithoutReasoning = {
    messages: [{ role: 'user', content: 'Hello' }],
    settings: {
      base: { model: 'glm-4.7', stream: true },
      chatParams: { reasoning_effort: 0, temperature: 0.7 },
      toolCallSettings: { tools: [], mode: 'NONE' }
    }
  };

  const resultWithoutReasoning = await adapter._prepareChatBody(bodyWithoutReasoning);
  assert.deepStrictEqual(resultWithoutReasoning.extra_body, {
    thinking: { type: 'disabled' }
  });
  assert.strictEqual(resultWithoutReasoning.reasoning_effort, undefined);
});

test('Zhipu Adapter - Generic Suite Integration', async (t) => {
  const config = {
    api_key: 'sk-zhipu-mock',
    base_url: 'https://open.bigmodel.cn/api/paas/v4/'
  };

  const mocks = {
    models: async () => [{ owner: '智谱清言', models: ['glm-4.7'] }],
    createCore: (event) => {
      const createStream = async function* () {
        yield { choices: [{ delta: { reasoning_content: 'Thinking...' } }] };
        yield { choices: [{ delta: { content: 'Hello from GLM' } }] };
      };
      return {
        chat: { completions: { create: async () => ({ [Symbol.asyncIterator]: createStream }) } },
        models: { list: async () => ({ data: [] }) }
      };
    }
  };

  await runGenericAdapterTests(t, ZhipuAdapter, config, mocks);
});
```

- [ ] **Step 2: Run tests and verify**

Run: `npm run test:unit`
Expected: 100% of unit tests pass, showing Zhipu Adapter tests and standard tests passing successfully.

- [ ] **Step 3: Commit**

```bash
git add tests/adapters/zhipu.test.js
git commit -m "test: add unit tests for ZhipuAdapter metadata, payload preparation, and generic flow integration"
```
