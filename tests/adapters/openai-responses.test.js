import { test } from 'node:test'
import assert from 'node:assert'
import './mock-env.js'
import OpenAIResponsesBot from '../../lib/chat/llm/adapters/implementations/openai-responses.js'

test('OpenAI Responses Adapter - reasoning_text preservation in message history', async () => {
  const adapter = new OpenAIResponsesBot({
    api_key: 'sk-mock',
    base_url: 'https://mock.openai.com/v1',
  })

  // 1. Assistant message with reasoning_content and tool_calls
  const messagesWithTools = [
    {
      content: 'What is 1+1?',
      role: 'user',
    },
    {
      content: 'Let me calculate',
      reasoning_content: 'Thinking about simple math addition...',
      role: 'assistant',
      tool_calls: [
        {
          function: { arguments: '{"expr":"1+1"}', name: 'calculate' },
          id: 'call_calc_1',
          type: 'function',
        },
      ],
    },
    {
      content: '2',
      name: 'calculate',
      role: 'tool',
      tool_call_id: 'call_calc_1',
    },
  ]

  const processed = await adapter._processMessages(
    messagesWithTools,
    'deepseek-flash',
  )
  // user, reasoning, assistant, function_call, function_call_output
  assert.strictEqual(processed.length, 5)

  const reasoningItem = processed[1]
  assert.strictEqual(reasoningItem.type, 'reasoning')
  assert.deepStrictEqual(reasoningItem.content, [
    {
      text: 'Thinking about simple math addition...',
      type: 'reasoning_text',
    },
  ])

  const assistantMsg = processed[2]
  assert.strictEqual(assistantMsg.role, 'assistant')
  assert.strictEqual(assistantMsg.content, 'Let me calculate')

  const functionCallItem = processed[3]
  assert.strictEqual(functionCallItem.type, 'function_call')
  assert.strictEqual(functionCallItem.name, 'calculate')

  const toolOutputItem = processed[4]
  assert.strictEqual(toolOutputItem.type, 'function_call_output')
  assert.strictEqual(toolOutputItem.output, '2')

  // 2. Regular assistant message with reasoning_content
  const regularMessages = [
    {
      content: 'Hello',
      role: 'user',
    },
    {
      content: 'Hi there!',
      reasoning_content: 'Thinking about greeting the user warmly...',
      role: 'assistant',
    },
  ]

  const processedRegular = await adapter._processMessages(
    regularMessages,
    'deepseek-flash',
  )
  // user, reasoning, assistant
  assert.strictEqual(processedRegular.length, 3)
  assert.strictEqual(processedRegular[1].type, 'reasoning')
  assert.deepStrictEqual(processedRegular[1].content, [
    {
      text: 'Thinking about greeting the user warmly...',
      type: 'reasoning_text',
    },
  ])
  assert.strictEqual(processedRegular[2].role, 'assistant')
  assert.strictEqual(processedRegular[2].content, 'Hi there!')
})

test('OpenAI Responses Adapter - tool calls cache extraCachedReasoningContent', async () => {
  const adapter = new OpenAIResponsesBot({
    api_key: 'sk-mock',
    base_url: 'https://mock.openai.com/v1',
  })

  const mockStream = async function* () {
    yield {
      delta: 'Thinking about the weather...',
      type: 'response.reasoning_text.delta',
    }
    yield {
      item: {
        id: 'call_weather_1',
        name: 'get_weather',
        type: 'function_call',
      },
      type: 'response.output_item.added',
    }
    yield {
      arguments: '{"city":"Beijing"}',
      item_id: 'call_weather_1',
      type: 'response.function_call_arguments.done',
    }
  }

  Object.defineProperty(adapter, 'openai', {
    configurable: true,
    value: {
      responses: {
        create: async () => mockStream(),
      },
    },
  })

  const updates = []
  const fakeEvent = {
    body: {},
    client: { pushConnection: () => {} },
    onAbort: () => {},
    pending: () => {},
    requestId: 'req-1',
    update: (u) => updates.push(u),
  }

  const body = { model: 'deepseek-flash', stream: true }
  const result = await adapter._executeChatRequest(body, fakeEvent)

  assert.strictEqual(result.toolCalls.length, 1)
  assert.strictEqual(
    fakeEvent.body.extraCachedReasoningContent,
    'Thinking about the weather...',
  )
  const reasoningUpdate = updates.find((u) => u.type === 'reasoningContent')
  assert.ok(reasoningUpdate)
  assert.strictEqual(reasoningUpdate.content, 'Thinking about the weather...')
})

test('OpenAI Responses Adapter - non-streaming tool calls cache extraCachedReasoningContent', async () => {
  const adapter = new OpenAIResponsesBot({
    api_key: 'sk-mock',
    base_url: 'https://mock.openai.com/v1',
  })

  Object.defineProperty(adapter, 'openai', {
    configurable: true,
    value: {
      responses: {
        create: async () => ({
          output: [
            {
              content: [
                { text: 'Non-streaming thinking...', type: 'reasoning_text' },
                { text: 'Let me check', type: 'output_text' },
              ],
              type: 'message',
            },
            {
              arguments: '{"city":"Shanghai"}',
              id: 'call_weather_2',
              name: 'get_weather',
              type: 'function_call',
            },
          ],
        }),
      },
    },
  })

  const fakeEvent = {
    body: {},
    client: { pushConnection: () => {} },
    onAbort: () => {},
    pending: () => {},
    requestId: 'req-2',
    update: () => {},
  }

  const body = { model: 'deepseek-flash', stream: false }
  const result = await adapter._executeChatRequest(body, fakeEvent)

  assert.strictEqual(result.toolCalls.length, 1)
  assert.strictEqual(fakeEvent.body.extraCachedContent, 'Let me check')
  assert.strictEqual(
    fakeEvent.body.extraCachedReasoningContent,
    'Non-streaming thinking...',
  )
})

test('OpenAI Responses Adapter - WebChatEvent preserves reasoning through tool recursion flow', async () => {
  const { ChatEventFactory } = await import('../../lib/chat/llm/events/ChatEventFactory.js')
  const adapter = new OpenAIResponsesBot({
    api_key: 'sk-mock',
    base_url: 'https://mock.openai.com/v1',
  })

  // 模拟真实 WebChatEvent 实例
  const webEvent = ChatEventFactory.createForWeb({
    client: {
      id: 'test_client',
      ip: '127.0.0.1',
      popConnection: () => {},
      pushConnection: () => {},
      sendOpenaiMessage: () => {},
    },
    req: {
      data: {
        messages: [{ content: 'check pc', role: 'user' }],
        settings: { base: { model: 'deepseek-flash' } },
      },
      request_id: 'test_req_recursion',
    },
  })

  // 1. 模拟流式生成工具调用和思考内容
  const mockStream = async function* () {
    yield {
      delta: 'Inspecting operating system and hardware...',
      type: 'response.reasoning_text.delta',
    }
    yield {
      item: {
        id: 'fc_bash_001',
        name: 'bash',
        type: 'function_call',
      },
      type: 'response.output_item.added',
    }
    yield {
      arguments: '{"command":"uname -a"}',
      item_id: 'fc_bash_001',
      type: 'response.function_call_arguments.done',
    }
  }

  Object.defineProperty(adapter, 'openai', {
    configurable: true,
    value: {
      responses: {
        create: async () => mockStream(),
      },
    },
  })

  const execResult = await adapter._executeChatRequest(
    { model: 'deepseek-flash', stream: true },
    webEvent,
  )

  assert.strictEqual(execResult.toolCalls.length, 1)
  // 验证 webEvent.body 上的属性持久存在未丢失
  assert.strictEqual(
    webEvent.body.extraCachedReasoningContent,
    'Inspecting operating system and hardware...',
  )

  // 2. 模拟 _handleToolCalls 逻辑将 callMessage 推入 webEvent.body.messages
  const callMessage = { role: 'assistant', step: 1, tool_calls: execResult.toolCalls }
  const extraReasoning = webEvent.body.extraCachedReasoningContent || webEvent.extraCachedReasoningContent
  if (extraReasoning) {
    callMessage.reasoning_content = extraReasoning
    delete webEvent.body.extraCachedReasoningContent
    delete webEvent.extraCachedReasoningContent
  }
  webEvent.body.messages.push(callMessage)
  webEvent.body.messages.push({
    content: 'Darwin Kernel Version 25.4.0',
    name: 'bash',
    role: 'tool',
    tool_call_id: 'fc_bash_001',
  })

  // 3. 构建第二轮准备发送给上游 API 的请求体
  const nextBody = await adapter._buildChatRequestBody(webEvent.body, webEvent)
  const inputItems = nextBody.input

  // 必须包含 reasoning item，并且位于 tool_call 之前！
  const reasoningItem = inputItems.find((item) => item.type === 'reasoning')
  assert.ok(reasoningItem, 'input must contain a reasoning item for the API')
  assert.strictEqual(
    reasoningItem.content[0].text,
    'Inspecting operating system and hardware...',
  )
  assert.strictEqual(reasoningItem.content[0].type, 'reasoning_text')

  const funcCallItem = inputItems.find((item) => item.type === 'function_call')
  assert.ok(funcCallItem)
  assert.strictEqual(funcCallItem.name, 'bash')

  const funcOutputItem = inputItems.find((item) => item.type === 'function_call_output')
  assert.ok(funcOutputItem)
  assert.strictEqual(funcOutputItem.output, 'Darwin Kernel Version 25.4.0')
})

