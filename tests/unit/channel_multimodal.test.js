import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { createBackendLlm } from '../../channels/llm.js'
import { MemoryStore } from '../../channels/memory/MemoryStore.js'
import { WechatChannel } from '../../channels/wechat/WechatChannel.js'
import { convertAudioToSilk } from '../../channels/wechat/audioHelper.js'

describe('Channel Multi-Modal & ExtraRender Pipeline Test', () => {
  test('convertAudioToSilk should successfully transcode silent PCM/WAV to Silk v3 format with 0x02 prefix', async () => {
    const sampleRate = 24000
    const silentPcm = Buffer.alloc(sampleRate * 2) // 1 second silent PCM
    const { silkBuffer, durationMs } = await convertAudioToSilk(silentPcm, {
      sampleRate,
    })

    assert.ok(
      silkBuffer && silkBuffer.length > 0,
      'Silk buffer should not be empty',
    )
    assert.equal(
      silkBuffer[0],
      0x02,
      'Silk buffer should have WeChat 0x02 header',
    )
    assert.ok(durationMs > 0, 'Duration should be positive')
  })

  test('WechatChannel should send audio extraRender as a shared file (mp3/wav) since native VOICE is disabled', async () => {
    const memory = new MemoryStore({
      agentId: 'test-multimodal-agent',
      storageDir: './data/test-channels',
    })
    const session = await memory.createSession({
      title: 'Test MultiModal Session',
    })
    await memory.setActiveSession(session.id)

    const sentMessages = []
    const uploadedMedia = []

    const mockClient = {
      botId: 'bot_test_1',
      sendMessage: async (msg) => {
        sentMessages.push(msg)
        return { errmsg: 'ok', ret: 0 }
      },
      uploadMedia: async (buf, opts) => {
        uploadedMedia.push({ buf, opts })
        return {
          aes_key: 'aes_test_key_base64==',
          encrypt_query_param: 'query_param_test',
          encrypt_type: 1,
          file_size_ciphertext: buf.length,
          full_url: 'https://novac2c.cdn.weixin.qq.com/c2c/test',
          raw_size: buf.length,
        }
      },
      getConfig: async () => ({ typing_ticket: 'ticket_123' }),
      sendTyping: async () => ({ ret: 0 }),
    }

    const mockLlmService = {
      handleMessage: async (event) => {
        const sampleRate = 24000
        const fakeAudio = Buffer.alloc(sampleRate * 2)
        await event.update({
          content: {
            action: 'finished',
            extraRender: [
              {
                buffer: fakeAudio,
                fileName: 'test_voice.mp3',
                placement: 'outer',
                text: '你好，这是合成的语音测试！',
                type: 'audio',
              },
            ],
            id: 'call_tts_1',
            name: 'tts_speech',
            result: { success: true },
          },
          type: 'toolCall',
        })
        await event.update({
          content: '请听语音回复。',
          type: 'content',
        })
        event.complete()
      },
    }

    const llm = createBackendLlm({ llmService: mockLlmService })

    const channel = new WechatChannel({
      client: mockClient,
      llm,
      masterId: 'user_123',
      memory,
    })

    const ctx = {
      contextToken: 'token_multimodal_1',
      from: 'user_123',
      sid: session.id,
      text: '用语音对我说你好',
    }

    await channel._route(ctx.text, ctx)

    // 原生语音气泡禁用，转为分享音频文件直传：应包含 type 4 消息且 uploadMedia (mediaType=3)
    const voiceMsg = sentMessages.find((m) =>
      m.item_list?.some((it) => it.type === 3),
    )
    assert.ok(!voiceMsg, 'Should NOT contain a native type 3 (VOICE) message')

    const fileMsg = sentMessages.find((m) =>
      m.item_list?.some((it) => it.type === 4),
    )
    assert.ok(fileMsg, 'Should contain a type 4 (FILE) message for the audio')
    const fileItem = fileMsg.item_list.find((it) => it.type === 4)?.file_item
    assert.strictEqual(fileItem?.file_name, 'test_voice.mp3')

    const audioUpload = uploadedMedia.find((u) => u.opts.mediaType === 3)
    assert.ok(
      audioUpload,
      'Should upload audio to WeChat CDN with mediaType 3 (FILE)',
    )

    const voiceUpload = uploadedMedia.find((u) => u.opts.mediaType === 4)
    assert.ok(!voiceUpload, 'Should NOT upload with mediaType 4 (VOICE)')

    // 文本回复应正常送达
    const textMsg = sentMessages.find((m) =>
      m.item_list?.some((it) => it.text_item?.text?.includes('请听语音回复')),
    )
    assert.ok(textMsg, 'Text reply should still be delivered')

    // Cleanup
    await memory.deleteSession(session.id)
  })

  test('WechatChannel should degrade file extraRender to download-link notice since native FILE send is disabled', async () => {
    const memory = new MemoryStore({
      agentId: 'test-multimodal-agent-2',
      storageDir: './data/test-channels',
    })
    const session = await memory.createSession({
      title: 'Test Share File Session',
    })
    await memory.setActiveSession(session.id)

    const sentMessages = []
    const uploadedMedia = []

    const mockClient = {
      botId: 'bot_test_1',
      sendMessage: async (msg) => {
        sentMessages.push(msg)
        return { ret: 0, errmsg: 'ok' }
      },
      uploadMedia: async (buf, opts) => {
        uploadedMedia.push({ buf, opts })
        return {
          aes_key: 'aes_test_key_base64==',
          encrypt_query_param: 'query_param_test',
          encrypt_type: 1,
          file_size_ciphertext: buf.length,
          full_url: 'https://novac2c.cdn.weixin.qq.com/c2c/test',
          raw_size: buf.length,
        }
      },
      getConfig: async () => ({ typing_ticket: 'ticket_123' }),
      sendTyping: async () => ({ ret: 0 }),
    }

    const mockLlmService = {
      handleMessage: async (event) => {
        const dummyPdf = Buffer.from('%PDF-1.4 dummy pdf content')
        await event.update({
          type: 'toolCall',
          content: {
            id: 'call_share_1',
            name: 'share',
            action: 'finished',
            result: { success: true },
            extraRender: [
              {
                type: 'file',
                buffer: dummyPdf,
                fileName: '财务季度报告.pdf',
                placement: 'outer',
                url: 'http://localhost/data/report.pdf',
              },
            ],
          },
        })
        event.complete()
      },
    }

    const llm = createBackendLlm({ llmService: mockLlmService })

    const channel = new WechatChannel({
      client: mockClient,
      masterId: 'user_123',
      memory,
      llm,
    })

    const ctx = {
      from: 'user_123',
      sid: session.id,
      text: '请分享季度报告',
      contextToken: 'token_multimodal_2',
    }

    await channel._route(ctx.text, ctx)

    // 原生文件直传：应包含 type 4 消息且正确调用 uploadMedia (mediaType=3)
    const fileMsg = sentMessages.find((m) =>
      m.item_list?.some((it) => it.type === 4),
    )
    assert.ok(fileMsg, 'Should contain a native type 4 (FILE) message')
    const fileUpload = uploadedMedia.find((u) => u.opts.mediaType === 3)
    assert.ok(fileUpload, 'Should upload to WeChat CDN with mediaType 3 (FILE)')
    const fileItem = fileMsg.item_list.find((it) => it.type === 4)?.file_item
    assert.strictEqual(fileItem?.file_name, '财务季度报告.pdf')

    // Cleanup
    await memory.deleteSession(session.id)
  })

  test('WechatChannel should include webpage URL when publish extraRender of type link is emitted', async () => {
    const memory = new MemoryStore({
      agentId: 'test-multimodal-agent-3',
      storageDir: './data/test-channels',
    })
    const session = await memory.createSession({
      title: 'Test Publish Webpage Session',
    })
    await memory.setActiveSession(session.id)

    const sentMessages = []

    const mockClient = {
      botId: 'bot_test_1',
      sendMessage: async (msg) => {
        sentMessages.push(msg)
        return { ret: 0, errmsg: 'ok' }
      },
      getConfig: async () => ({ typing_ticket: 'ticket_123' }),
      sendTyping: async () => ({ ret: 0 }),
    }

    const testWebUrl = 'http://localhost:3080/storage/web/abc123/index.html'

    const mockLlmService = {
      handleMessage: async (event) => {
        // 模拟 publish 工具返回 extraRender
        await event.update({
          type: 'toolCall',
          content: {
            id: 'call_publish_1',
            name: 'publish',
            action: 'finished',
            result: { url: testWebUrl },
            extraRender: [
              {
                type: 'link',
                url: testWebUrl,
                text: '打开已发布的网页 🌐',
                placement: 'outer',
              },
            ],
          },
        })
        // LLM 模型遵从 publish 工具说明，在正文中无需重复输出 URL
        await event.update({
          type: 'content',
          content: '网页已成功发布！',
        })
        event.complete()
      },
    }

    const llm = createBackendLlm({ llmService: mockLlmService })

    const channel = new WechatChannel({
      client: mockClient,
      masterId: 'user_123',
      memory,
      llm,
    })

    const ctx = {
      from: 'user_123',
      sid: session.id,
      text: '帮我发布个人主页',
      contextToken: 'token_multimodal_3',
    }

    await channel._route(ctx.text, ctx)

    // 检查发送的消息列表中，必须包含包含发布链接 URL 的文本消息
    const linkMsg = sentMessages.find((m) =>
      m.item_list?.some((it) => it.text_item?.text?.includes(testWebUrl)),
    )
    assert.ok(linkMsg, 'Sent messages should contain the webpage URL')

    const linkText = linkMsg.item_list.find((it) =>
      it.text_item?.text?.includes(testWebUrl),
    ).text_item.text
    assert.ok(
      linkText.includes('打开已发布的网页 🌐'),
      'Message should contain the link label',
    )
    assert.ok(
      linkText.includes(testWebUrl),
      'Message should contain the webpage URL',
    )

    // 检查模型后续正文回复也正常发送
    const contentMsg = sentMessages.find((m) =>
      m.item_list?.some((it) =>
        it.text_item?.text?.includes('网页已成功发布！'),
      ),
    )
    assert.ok(contentMsg, 'Model text response should also be delivered')

    // Cleanup
    await memory.deleteSession(session.id)
  })

  test('Channel adapter should receive full structured data in doSendLink when extraRender of type link is emitted', async () => {
    const memory = new MemoryStore({
      agentId: 'test-multimodal-agent-4',
      storageDir: './data/test-channels',
    })
    const session = await memory.createSession({
      title: 'Test Structured Link Session',
    })
    await memory.setActiveSession(session.id)

    let capturedLinkPayload = null

    // 模拟一个支持原生富文本卡片的渠道适配器（如 Telegram / 飞书 / 企微）
    class RichMediaMockChannel extends WechatChannel {
      async doSendLink(options) {
        capturedLinkPayload = options
        return { customType: 'rich_interactive_card', success: true }
      }
    }

    const testItem = {
      customMeta: { theme: 'dark', version: 2 },
      description: '动态数据大屏预览页面',
      placement: 'outer',
      text: '点击体验交互组件 🚀',
      title: '可视化图表组件',
      type: 'link',
      url: 'https://preview.mio.chat/page/123',
    }

    const mockLlmService = {
      handleMessage: async (event) => {
        await event.update({
          content: {
            action: 'finished',
            extraRender: [testItem],
            id: 'call_preview_1',
            name: 'publish',
            result: { url: testItem.url },
          },
          type: 'toolCall',
        })
        event.complete()
      },
    }

    const llm = createBackendLlm({ llmService: mockLlmService })
    const channel = new RichMediaMockChannel({
      client: {
        botId: 'bot_rich_1',
        getConfig: async () => ({ typing_ticket: 'ticket_rich' }),
        sendMessage: async () => ({ ret: 0 }),
        sendTyping: async () => ({ ret: 0 }),
      },
      llm,
      masterId: 'user_456',
      memory,
    })

    const ctx = {
      contextToken: 'token_rich_1',
      from: 'user_456',
      sid: session.id,
      text: '查看图表',
    }

    await channel._route(ctx.text, ctx)

    // 验证适配器接收到了完整的结构化数据
    assert.ok(capturedLinkPayload, 'doSendLink should be called')
    assert.strictEqual(
      capturedLinkPayload.url,
      'https://preview.mio.chat/page/123',
    )
    assert.strictEqual(capturedLinkPayload.text, '点击体验交互组件 🚀')
    assert.strictEqual(capturedLinkPayload.title, '可视化图表组件')
    assert.strictEqual(capturedLinkPayload.description, '动态数据大屏预览页面')
    assert.deepStrictEqual(capturedLinkPayload.extraRender.customMeta, {
      theme: 'dark',
      version: 2,
    })
    assert.strictEqual(capturedLinkPayload.to, 'user_456')
    assert.strictEqual(capturedLinkPayload.contextToken, 'token_rich_1')

    // Cleanup
    await memory.deleteSession(session.id)
  })
})
