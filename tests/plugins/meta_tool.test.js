import { test } from 'node:test'
import assert from 'node:assert'
import '../adapters/mock-env.js'

import MetaTool, {
  extractQueryTools,
  extractTargetCall,
} from '../../lib/plugins/ai-plugin/tools/meta_tool.js'
import { MioFunction } from '../../lib/function.js'
import { parseConcatenatedJson } from '../../utils/jsonParser.js'

test('MetaTool - parameter extraction', () => {
  // 1. Standard call parameters
  const r1 = extractTargetCall({
    schema: { filePath: 'foo.js' },
    tool_name: 'replace',
  })
  assert.strictEqual(r1.toolName, 'replace')
  assert.deepStrictEqual(r1.schema, { filePath: 'foo.js' })

  // 2. Stringified JSON schema
  const r2 = extractTargetCall({
    schema: '{"count": 5, "query": "hello"}',
    tool_name: 'search',
  })
  assert.strictEqual(r2.toolName, 'search')
  assert.deepStrictEqual(r2.schema, { count: 5, query: 'hello' })

  // 3. Query tools array extraction
  const q1 = extractQueryTools({ tools: ['replace', 'write'] })
  assert.deepStrictEqual(q1, ['replace', 'write'])

  // 4. Query tools comma string extraction
  const q2 = extractQueryTools({ tools: 'replace, write, bash' })
  assert.deepStrictEqual(q2, ['replace', 'write', 'bash'])

  // 5. Query tools singular tool_name
  const q3 = extractQueryTools({ tool_name: 'replace' })
  assert.deepStrictEqual(q3, ['replace'])
})

test('MetaTool - repairs a missing outer brace without string-encoding HTML', async () => {
  class PublishTool extends MioFunction {
    constructor() {
      super({
        description: 'Publish HTML',
        name: 'publish',
        parameters: {
          properties: { html: { type: 'string' } },
          required: ['html'],
          type: 'object',
        },
      })
      this.func = async (event) => ({ html: event.params.html, success: true })
    }
  }

  const publish = new PublishTool()
  global.middleware = {
    plugins: [{ getTools: () => new Map([['web', [publish]]]), name: 'web' }],
  }
  const raw =
    '{"action":"call","tool_name":"publish","schema":{"html":"<div data-json=\\"{&quot;x&quot;:1}\\">hello</div>"}'
  const params = parseConcatenatedJson(raw)
  assert.equal(params.action, 'call')
  assert.deepEqual(params.schema, {
    html: '<div data-json="{&quot;x&quot;:1}">hello</div>',
  })

  const result = await new MetaTool()._execute({ params })
  assert.equal(result.success, true)
  assert.equal(result.html, params.schema.html)
})

test('JSON repair refuses truncated strings and mismatched delimiters', () => {
  assert.deepStrictEqual(
    parseConcatenatedJson('{"action":"call","schema":{"html":"unterminated}'),
    {},
  )
  assert.deepStrictEqual(parseConcatenatedJson('{"schema":[}'), {})
})

test('MetaTool - does not silently route empty parameters to list', async () => {
  const result = await new MetaTool()._execute({ params: {} })
  assert.equal(result.success, false)
  assert.match(result.error, /action/)
})

test('MetaTool - action: list', async () => {
  const meta = new MetaTool()

  class ToolA extends MioFunction {
    constructor() {
      super({
        description: 'Tool A description',
        name: 'tool_a',
        parameters: { properties: {}, type: 'object' },
      })
      this.func = async () => ({})
    }
  }

  class ChannelOnlyTool extends MioFunction {
    constructor() {
      super({
        access: { scene: { sources: ['channel'] } },
        description: 'Channel only tool',
        name: 'channel_only_tool',
        parameters: { properties: {}, type: 'object' },
      })
      this.func = async () => ({})
    }
  }

  const toolA = new ToolA()
  const channelTool = new ChannelOnlyTool()

  global.middleware = {
    plugins: [
      {
        getTools: () => new Map([['plugin-one', [toolA, channelTool]]]),
        name: 'plugin-one',
      },
    ],
  }

  // 1. Web context (channel-scoped tool should be hidden)
  const webList = await meta._execute({
    params: { action: 'list' },
    parentEvent: { body: {} },
  })
  assert.strictEqual(webList.success, true)
  assert.strictEqual(webList.total, 1)
  assert.strictEqual(webList.tools[0].name, 'tool_a')
  assert.ok(webList.groups['plugin-one'])

  // 2. Channel context (channel-scoped tool should be visible)
  const channelList = await meta._execute({
    params: { action: 'list' },
    parentEvent: { channel: { id: 'wx' }, source: 'channel' },
  })
  assert.strictEqual(channelList.success, true)
  assert.strictEqual(channelList.total, 2)
  assert.ok(channelList.tools.some((t) => t.name === 'channel_only_tool'))
})

test('MetaTool - action: query', async () => {
  const meta = new MetaTool()

  class FileEditorTool extends MioFunction {
    constructor() {
      super({
        access: { requires: { admin: true } },
        description: 'Replace code in file',
        name: 'replace',
        parameters: {
          properties: {
            filePath: { type: 'string' },
            replacement: { type: 'string' },
          },
          required: ['filePath', 'replacement'],
          type: 'object',
        },
      })
      this.func = async () => ({})
    }
  }

  class TtsTool extends MioFunction {
    constructor() {
      super({
        description: 'Text to speech synthesis',
        name: 'tts_speech',
        parameters: {
          properties: {
            text: { type: 'string' },
            voice: { type: 'string' },
          },
          required: ['text'],
          type: 'object',
        },
      })
      this.func = async () => ({})
    }
  }

  const replaceTool = new FileEditorTool()
  const ttsTool = new TtsTool()

  global.middleware = {
    plugins: [
      {
        getTools: () =>
          new Map([
            ['editor', [replaceTool]],
            ['tts', [ttsTool]],
          ]),
        name: 'test-plugins',
      },
    ],
  }

  // Query multiple tools with array
  const res = await meta._execute({
    params: {
      action: 'query',
      tools: ['replace', 'tts_speech', 'non_existent_tool'],
    },
    parentEvent: { user: { isAdmin: true, role: 'admin' } },
  })

  assert.strictEqual(res.success, true)
  assert.strictEqual(res.count, 3)

  const queriedReplace = res.tools.find((t) => t.name === 'replace')
  assert.strictEqual(queriedReplace.success, true)
  assert.ok(queriedReplace.parameters.properties.filePath)

  const queriedTts = res.tools.find((t) => t.name === 'tts_speech')
  assert.strictEqual(queriedTts.success, true)
  assert.ok(queriedTts.parameters.properties.text)

  const queriedGhost = res.tools.find((t) => t.name === 'non_existent_tool')
  assert.strictEqual(queriedGhost.success, false)
  assert.ok(queriedGhost.error.includes('not found'))
})

test('MetaTool - action: call without extraRender duplication', async () => {
  const meta = new MetaTool()

  let inFlightExtraReceived = false
  class SoundTool extends MioFunction {
    constructor() {
      super({
        description: 'Sound tool',
        name: 'tts_speech',
        parameters: { properties: {}, type: 'object' },
      })
      this.func = async (e) => {
        // SoundTool itself triggers in-flight extraRender
        e.setExtraRender?.([
          { type: 'audio', url: 'https://example.com/audio.mp3' },
        ])
        // And also returns extraRender in return payload
        return {
          audioUrl: 'https://example.com/audio.mp3',
          extraRender: [
            {
              placement: 'outer',
              type: 'audio',
              url: 'https://example.com/audio.mp3',
            },
          ],
          success: true,
        }
      }
    }
  }

  const soundTool = new SoundTool()
  global.middleware = {
    plugins: [
      {
        getTools: () => new Map([['tts', [soundTool]]]),
        name: 'tts-plugin',
      },
    ],
  }

  let extraRenderCallCount = 0
  const e = {
    params: {
      action: 'call',
      schema: { text: 'hello' },
      tool_name: 'tts_speech',
    },
    setExtraRender: () => {
      extraRenderCallCount++
      inFlightExtraReceived = true
    },
    setOuterRender: () => {
      extraRenderCallCount++
    },
  }

  const result = await meta._execute(e)
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.audioUrl, 'https://example.com/audio.mp3')
  assert.ok(inFlightExtraReceived)
  // Target tool's single setExtraRender should have run exactly once (not re-dispatched by meta_tool)
  assert.strictEqual(extraRenderCallCount, 1)
})

test('MetaTool cannot call a tool outside the parent execution allowlist', async () => {
  const meta = new MetaTool()
  let invoked = false
  class HiddenTool extends MioFunction {
    constructor() {
      super({
        description: 'Hidden tool',
        name: 'hidden_tool',
        parameters: { properties: {}, type: 'object' },
      })
      this.func = async () => {
        invoked = true
        return { success: true }
      }
    }
  }
  global.middleware = {
    plugins: [
      {
        getTools: () => new Map([['hidden', [new HiddenTool()]]]),
        name: 'hidden-plugin',
      },
    ],
  }
  const result = await meta._execute({
    params: { action: 'call', tool_name: 'hidden_tool' },
    parentEvent: {
      settings: { toolCallSettings: { tools: ['meta_tool'] } },
    },
  })
  assert.equal(result.success, false)
  assert.match(result.error, /not found/)
  assert.equal(invoked, false)
})

test('MetaTool - text display echo (getDisplayName)', () => {
  const meta = new MetaTool()

  class EditorTool extends MioFunction {
    constructor() {
      super({
        description: 'Edit files',
        name: 'replace',
        parameters: { properties: {}, type: 'object' },
      })
      this.func = async () => ({})
    }

    getDisplayName(params) {
      return `Replacing in ${params.filePath}`
    }
  }

  const editorTool = new EditorTool()
  global.middleware = {
    plugins: [
      {
        getTools: () => new Map([['editor', [editorTool]]]),
        name: 'editor',
      },
    ],
  }

  // 1. list display name
  assert.strictEqual(
    meta.getDisplayName({ action: 'list' }),
    'Listing available tools',
  )

  // 2. query display name
  assert.strictEqual(
    meta.getDisplayName({ action: 'query', tools: ['replace', 'write'] }),
    'Querying schema: replace, write',
  )

  // 3. call display name stays generic until access is evaluated
  assert.strictEqual(
    meta.getDisplayName({
      action: 'call',
      schema: { filePath: 'index.js' },
      tool_name: 'replace',
    }),
    'Calling replace',
  )
})
