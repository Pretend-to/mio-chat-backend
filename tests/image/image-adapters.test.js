import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import BaseImageAdapter from '../../lib/chat/image/BaseImageAdapter.js'
import { ImageService } from '../../lib/chat/image/ImageService.js'
import GoogleImageAdapter from '../../lib/chat/image/implementations/google-image.js'
import OpenAIImageAdapter from '../../lib/chat/image/implementations/openai-image.js'
import SiliconFlowImageAdapter from '../../lib/chat/image/implementations/siliconflow-image.js'
import VolcEngineImageAdapter from '../../lib/chat/image/implementations/volcengine-image.js'

const originalFetch = global.fetch

afterEach(() => {
  global.fetch = originalFetch
})

test('BaseImageAdapter accepts standard raw base64 containing slash characters', async () => {
  const adapter = new BaseImageAdapter()
  const raw = Buffer.from([255, 216, 255, 255, 255, 255, 0, 1, 2, 3, 4, 5]).toString('base64')
  assert.match(raw, /\//)

  const resolved = await adapter._resolveImageBase64(raw)
  assert.equal(resolved.base64, raw)
  assert.equal(resolved.dataUri, `data:image/jpeg;base64,${raw}`)
})

test('BaseImageAdapter rejects unknown bytes instead of inventing JPEG MIME', async () => {
  const adapter = new BaseImageAdapter()
  const unknown = Buffer.from('this is not an image').toString('base64')
  await assert.rejects(adapter._resolveImageBase64(unknown), /无法识别参考图格式/)
  assert.equal(adapter._detectMimeType(Buffer.from('not an image')), null)
})

test('BaseImageAdapter validates local and remote image bytes despite JPEG labels', async t => {
  const adapter = new BaseImageAdapter()
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mio-image-mime-'))
  t.after(() => fs.rm(directory, { force: true, recursive: true }))
  const file = path.join(directory, 'invalid.jpg')
  await fs.writeFile(file, 'not an image')
  await assert.rejects(adapter._resolveImageBase64(file), /无法识别参考图格式/)
  global.fetch = async () => new Response('not an image', {
    headers: { 'content-type': 'image/jpeg' },
  })
  await assert.rejects(adapter._resolveImageBase64('https://example.test/invalid.jpg'), /无法识别参考图格式/)
})

test('ImageService rejects reference images before calling an unsupported adapter', async () => {
  let called = false
  const adapter = Object.assign(new BaseImageAdapter(), {
    config: { model: 'text-only-model' },
    name: 'text-only',
    supportsImageInput: () => false,
    generate: async () => {
      called = true
      return []
    }
  })
  const service = new ImageService()
  service.initialized = true
  service.instances.set('text-only', adapter)
  service.defaultInstanceId = 'text-only'

  await assert.rejects(
    service.generate({ prompt: 'edit it', image: 'data:image/png;base64,AAAA' }),
    /不支持参考图输入/
  )
  assert.equal(called, false)
})

test('ImageService enforces each adapter model reference-image limit', async () => {
  const adapter = new SiliconFlowImageAdapter({ apiKey: 'test', model: 'Kwai-Kolors/Kolors' })
  adapter.instanceName = 'kolors'
  const service = new ImageService()
  service.initialized = true
  service.instances.set('kolors', adapter)
  service.defaultInstanceId = 'kolors'

  await assert.rejects(
    service.generate({
      prompt: 'combine them',
      images: ['data:image/png;base64,AAAA', 'data:image/png;base64,BBBB']
    }),
    /最多支持 1 张参考图/
  )
})

test('adapter image-input capability follows the configured model', () => {
  assert.equal(new OpenAIImageAdapter({ model: 'gpt-image-2' }).supportsImageInput(), true)
  assert.equal(new OpenAIImageAdapter({ model: 'dall-e-3' }).supportsImageInput(), false)
  assert.equal(new GoogleImageAdapter({ model: 'gemini-2.5-flash-image' }).supportsImageInput(), true)
  assert.equal(new GoogleImageAdapter({ model: 'gemini-2.5-flash-image' }).getImageInputLimit(), 3)
  assert.equal(new GoogleImageAdapter({ model: 'imagen-3.0-generate-002' }).supportsImageInput(), false)
  assert.equal(new SiliconFlowImageAdapter({ model: 'Qwen/Qwen-Image-Edit' }).supportsImageInput(), true)
  assert.equal(new SiliconFlowImageAdapter({ model: 'Qwen/Qwen-Image' }).supportsImageInput(), false)
})

test('Google Gemini img2img includes inline image and image output configuration', async () => {
  let requestBody
  global.fetch = async (_url, init) => {
    requestBody = JSON.parse(init.body)
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'AAAA' } }] } }]
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  const adapter = new GoogleImageAdapter({ apiKey: 'test', model: 'gemini-2.5-flash-image' })
  await adapter.generate({
    prompt: 'edit it',
    images: ['data:image/png;base64,AAAA', 'data:image/jpeg;base64,BBBB'],
    size: 'landscape'
  })

  assert.equal(requestBody.contents[0].parts[1].inlineData.data, 'AAAA')
  assert.equal(requestBody.contents[0].parts[2].inlineData.data, 'BBBB')
  assert.deepEqual(requestBody.generationConfig.responseModalities, ['TEXT', 'IMAGE'])
  assert.equal(requestBody.generationConfig.imageConfig.aspectRatio, '4:3')
})

test('SiliconFlow img2img uses the documented image field', async () => {
  let requestBody
  global.fetch = async (_url, init) => {
    requestBody = JSON.parse(init.body)
    return new Response(JSON.stringify({ images: [{ url: 'https://example.test/result.png' }] }), { status: 200 })
  }

  const adapter = new SiliconFlowImageAdapter({ apiKey: 'test', model: 'Kwai-Kolors/Kolors' })
  await adapter.generate({ prompt: 'edit it', image: 'data:image/png;base64,AAAA' })
  assert.equal(requestBody.image, 'data:image/png;base64,AAAA')
})

test('SiliconFlow Qwen Image Edit maps up to three reference images', async () => {
  let requestBody
  global.fetch = async (_url, init) => {
    requestBody = JSON.parse(init.body)
    return new Response(JSON.stringify({ images: [{ url: 'https://example.test/result.png' }] }), { status: 200 })
  }

  const adapter = new SiliconFlowImageAdapter({ apiKey: 'test', model: 'Qwen/Qwen-Image-Edit-2509' })
  await adapter.generate({
    prompt: 'combine them',
    images: [
      'data:image/png;base64,AAAA',
      'data:image/png;base64,BBBB',
      'data:image/png;base64,CCCC'
    ]
  })
  assert.equal(requestBody.image, 'data:image/png;base64,AAAA')
  assert.equal(requestBody.image2, 'data:image/png;base64,BBBB')
  assert.equal(requestBody.image3, 'data:image/png;base64,CCCC')
  assert.equal('image_size' in requestBody, false)
})

test('VolcEngine img2img uses current image and size fields', async () => {
  let requestBody
  global.fetch = async (_url, init) => {
    requestBody = JSON.parse(init.body)
    return new Response(JSON.stringify({ data: [{ url: 'https://example.test/result.png' }] }), { status: 200 })
  }

  const adapter = new VolcEngineImageAdapter({ apiKey: 'test', model: 'doubao-seedream-4-0-250828' })
  await adapter.generate({ prompt: 'edit it', image: 'data:image/png;base64,AAAA', size: 'landscape' })
  assert.equal(requestBody.image, 'data:image/png;base64,AAAA')
  assert.equal(requestBody.size, '2048x1536')
  assert.equal('image_url' in requestBody, false)
  assert.equal('width' in requestBody, false)
})

test('VolcEngine passes multiple reference images as an image array', async () => {
  let requestBody
  global.fetch = async (_url, init) => {
    requestBody = JSON.parse(init.body)
    return new Response(JSON.stringify({ data: [{ url: 'https://example.test/result.png' }] }), { status: 200 })
  }

  const adapter = new VolcEngineImageAdapter({ apiKey: 'test', model: 'doubao-seedream-5-0-lite-260128' })
  await adapter.generate({
    prompt: 'combine them',
    images: ['data:image/png;base64,AAAA', 'data:image/png;base64,BBBB']
  })
  assert.deepEqual(requestBody.image, ['data:image/png;base64,AAAA', 'data:image/png;base64,BBBB'])
})
