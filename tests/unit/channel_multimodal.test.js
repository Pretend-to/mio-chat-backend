import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createBackendLlm } from '../../channels/llm.js'
import { MemoryStore } from '../../channels/memory/MemoryStore.js'
import { WechatChannel } from '../../channels/wechat/WechatChannel.js'
import { convertAudioToSilk } from '../../channels/wechat/audioHelper.js'

describe('Channel Multi-Modal & ExtraRender Pipeline Test', () => {
  test('convertAudioToSilk should successfully transcode silent PCM/WAV to Silk v3 format with 0x02 prefix', async () => {
    const sampleRate = 24000
    const silentPcm = Buffer.alloc(sampleRate * 2) // 1 second silent PCM
    const { silkBuffer, durationMs } = await convertAudioToSilk(silentPcm, { sampleRate })

    assert.ok(silkBuffer && silkBuffer.length > 0, 'Silk buffer should not be empty')
    assert.equal(silkBuffer[0], 0x02, 'Silk buffer should have WeChat 0x02 header')
    assert.ok(durationMs > 0, 'Duration should be positive')
  })

  test('WechatChannel should degrade audio extraRender to link notice since native VOICE send is disabled', async () => {
    const memory = new MemoryStore({ agentId: 'test-multimodal-agent', storageDir: './data/test-channels' })
    const session = await memory.createSession({ title: 'Test MultiModal Session' })
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

    // Mock LLM service emitting an audio extraRender (simulating EdgeTTS or Share audio)
    const mockLlmService = {
      handleMessage: async (event) => {
        const sampleRate = 24000
        const fakeAudio = Buffer.alloc(sampleRate * 2)
        await event.update({
          type: 'toolCall',
          content: {
            id: 'call_tts_1',
            name: 'tts_speech',
            action: 'finished',
            result: { success: true },
            extraRender: [
              {
                type: 'audio',
                buffer: fakeAudio,
                fileName: 'test_voice.mp3',
                placement: 'outer',
                text: '你好，这是合成的语音测试！'
              }
            ]
          }
        })
        await event.update({
          type: 'content',
          content: '请听语音回复。'
        })
        event.complete()
      }
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
      text: '用语音对我说你好',
      contextToken: 'token_multimodal_1',
    }

    await channel._route(ctx.text, ctx)

    // 原生语音链路已禁用（2026-08-28 实测客户端无法渲染）：不应有 type 3 消息、不应上传 CDN
    const voiceMsg = sentMessages.find(m => m.item_list?.some(it => it.type === 3))
    assert.ok(!voiceMsg, 'Should NOT contain a native type 3 (VOICE) message')
    const voiceUpload = uploadedMedia.find(u => u.opts.mediaType === 4)
    assert.ok(!voiceUpload, 'Should NOT upload to WeChat CDN with mediaType 4 (VOICE)')

    // 文本回复应正常送达（extraRender 仅含 buffer 无 url，降级无链接可发，仅发文本）
    const textMsg = sentMessages.find(m => m.item_list?.some(it => it.text_item?.text?.includes('请听语音回复')))
    assert.ok(textMsg, 'Text reply should still be delivered')

    // Cleanup
    await memory.deleteSession(session.id)
  })

  test('WechatChannel should degrade file extraRender to download-link notice since native FILE send is disabled', async () => {
    const memory = new MemoryStore({ agentId: 'test-multimodal-agent-2', storageDir: './data/test-channels' })
    const session = await memory.createSession({ title: 'Test Share File Session' })
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
                url: 'http://localhost/data/report.pdf'
              }
            ]
          }
        })
        event.complete()
      }
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
    const fileMsg = sentMessages.find(m => m.item_list?.some(it => it.type === 4))
    assert.ok(fileMsg, 'Should contain a native type 4 (FILE) message')
    const fileUpload = uploadedMedia.find(u => u.opts.mediaType === 3)
    assert.ok(fileUpload, 'Should upload to WeChat CDN with mediaType 3 (FILE)')
    const fileItem = fileMsg.item_list.find(it => it.type === 4)?.file_item
    assert.strictEqual(fileItem?.file_name, '财务季度报告.pdf')

    // Cleanup
    await memory.deleteSession(session.id)
  })
})
