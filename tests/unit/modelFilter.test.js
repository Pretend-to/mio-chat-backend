import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  isTextChatModel,
  filterTextChatModels,
} from '../../lib/chat/llm/utils/modelFilter.js'

describe('LLM Model Filter (Blacklist + Default Allow)', () => {
  it('should allow standard chat models across providers', () => {
    const chatModels = [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-3.5-turbo',
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-1.5-flash-8b',
      'deepseek-chat',
      'deepseek-reasoner',
      'qwen-plus',
      'qwen-max',
      'moonshot-v1-8k',
      'glm-4-flash',
      'MiniMax-Text-01',
      'llama-3.1-70b-versatile',
      'my-custom-fine-tuned-model',
    ]

    for (const model of chatModels) {
      assert.strictEqual(
        isTextChatModel(model),
        true,
        `Expected ${model} to be allowed`,
      )
    }
  })

  it('should exclude embedding and reranker models', () => {
    const embeddingModels = [
      'text-embedding-3-small',
      'text-embedding-3-large',
      'text-embedding-ada-002',
      'bge-large-zh-v1.5',
      'bge-m3',
      'cohere-rerank-v3',
      'jina-reranker-v2-base-multilingual',
    ]

    for (const model of embeddingModels) {
      assert.strictEqual(
        isTextChatModel(model),
        false,
        `Expected ${model} to be excluded`,
      )
    }
  })

  it('should exclude audio, speech, TTS, and whisper models', () => {
    const audioModels = [
      'whisper-1',
      'tts-1',
      'tts-1-hd',
      'speech-01-turbo',
      'qwen-audio-chat',
      'gemini-tts-test',
    ]

    for (const model of audioModels) {
      assert.strictEqual(
        isTextChatModel(model),
        false,
        `Expected ${model} to be excluded`,
      )
    }
  })

  it('should exclude dedicated image generation and video models', () => {
    const imageModels = [
      'dall-e-3',
      'dall-e-2',
      'flux-schnell',
      'flux-dev',
      'stable-diffusion-3',
      'sdxl-turbo',
      'imagen-3.0-generate-001',
      'cogvideox-flash',
    ]

    for (const model of imageModels) {
      assert.strictEqual(
        isTextChatModel(model),
        false,
        `Expected ${model} to be excluded`,
      )
    }
  })

  it('should exclude realtime and moderation models', () => {
    const excludedModels = [
      'gpt-4o-realtime-preview',
      'gpt-4o-mini-realtime-preview',
      'text-moderation-latest',
      'omni-moderation-2024-09-26',
    ]

    for (const model of excludedModels) {
      assert.strictEqual(
        isTextChatModel(model),
        false,
        `Expected ${model} to be excluded`,
      )
    }
  })

  it('should respect protocol metadata (Gemini supportedGenerationMethods)', () => {
    // Has supportedGenerationMethods and contains generateContent -> Allowed
    assert.strictEqual(
      isTextChatModel({
        id: 'models/gemini-pro',
        supportedGenerationMethods: ['generateContent', 'countTokens'],
      }),
      true,
    )

    // Has supportedGenerationMethods and DOES NOT contain generateContent -> Excluded
    assert.strictEqual(
      isTextChatModel({
        id: 'models/text-bison-001',
        supportedGenerationMethods: ['embedText'],
      }),
      false,
    )
  })

  it('should correctly filter grouped model structures', () => {
    const grouped = [
      {
        owner: 'OpenAI',
        models: [
          { id: 'gpt-4o' },
          { id: 'text-embedding-3-small' },
          { id: 'dall-e-3' },
          { id: 'gpt-4o-mini' },
        ],
      },
      {
        owner: 'OnlyEmbeddings',
        models: [{ id: 'bge-large-zh' }, { id: 'text-embedding-ada-002' }],
      },
    ]

    const filtered = filterTextChatModels(grouped)
    assert.strictEqual(filtered.length, 1) // OnlyEmbeddings is completely removed
    assert.strictEqual(filtered[0].owner, 'OpenAI')
    assert.strictEqual(filtered[0].models.length, 2)
    assert.strictEqual(filtered[0].models[0].id, 'gpt-4o')
    assert.strictEqual(filtered[0].models[1].id, 'gpt-4o-mini')
  })
})
