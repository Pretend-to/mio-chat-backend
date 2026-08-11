import { test } from 'node:test'
import assert from 'node:assert'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import '../adapters/mock-env.js'

import storageService from '../../lib/storage/StorageService.js'
import * as fileController from '../../lib/server/http/controllers/fileController.js'
import * as imageController from '../../lib/server/http/controllers/imageController.js'

test('Uploads and Image Controllers - URL Absolute Path Conversion', async (t) => {
  // Save original methods
  const origExists = storageService.exists
  const origGetUrl = storageService.getUrl
  const origUpload = storageService.upload
  const origAdapter = storageService.adapter

  t.after(() => {
    storageService.exists = origExists
    storageService.getUrl = origGetUrl
    storageService.upload = origUpload
    storageService.adapter = origAdapter
  })

  storageService.adapter = { constructor: { name: 'LocalAdapter' } }

  await t.test('imageController.uploadImage: should prepend origin to relative URL when file exists', async () => {
    storageService.exists = async () => true
    storageService.getUrl = async () => '/f/up/image/test-img.jpg'

    const req = {
      file: {
        buffer: Buffer.from('fake-image-data'),
        mimetype: 'image/jpeg',
        originalname: 'test.jpg'
      },
      get: (header) => {
        if (header === 'host') return 'localhost:3080'
        return null
      },
      protocol: 'http'
    }

    let jsonResponse = null
    const res = {
      json(data) {
        jsonResponse = data
        return this
      },
      status(_code) {
        return this
      }
    }

    await imageController.uploadImage(req, res)

    assert.ok(jsonResponse)
    assert.strictEqual(jsonResponse.code, 0)
    assert.strictEqual(jsonResponse.data.url, 'http://localhost:3080/f/up/image/test-img.jpg')
  })

  await t.test('imageController.uploadImage: should prepend origin to relative URL when uploading new file', async () => {
    storageService.exists = async () => false
    storageService.upload = async () => ({ url: '/f/up/image/new-img.jpg' })

    const req = {
      file: {
        buffer: Buffer.from('fake-image-data-2'),
        mimetype: 'image/jpeg',
        originalname: 'new.jpg'
      },
      get: (header) => {
        if (header === 'host') return 'miochat.com'
        return null
      },
      protocol: 'https'
    }

    let jsonResponse = null
    const res = {
      json(data) {
        jsonResponse = data
        return this
      },
      status(_code) {
        return this
      }
    }

    await imageController.uploadImage(req, res)

    assert.ok(jsonResponse)
    assert.strictEqual(jsonResponse.code, 0)
    assert.strictEqual(jsonResponse.data.url, 'https://miochat.com/f/up/image/new-img.jpg')
  })

  await t.test('fileController.finalizeUpload: should prepend origin to relative URL when file already exists', async () => {
    storageService.exists = async () => true
    storageService.getUrl = async () => '/f/up/file/existing.txt'

    const req = {
      body: {
        filename: 'existing.txt',
        md5: '0123456789abcdef0123456789abcdef',
        totalChunks: '1'
      },
      get: (header) => {
        if (header === 'host') return 'localhost:3080'
        return null
      },
      protocol: 'http'
    }

    let jsonResponse = null
    const res = {
      json(data) {
        jsonResponse = data
        return this
      },
      status(_code) {
        return this
      }
    }

    await fileController.finalizeUpload(req, res)

    assert.ok(jsonResponse)
    assert.strictEqual(jsonResponse.code, 0)
    assert.strictEqual(jsonResponse.data.url, 'http://localhost:3080/f/up/file/existing.txt')
  })

  await t.test('fileController.finalizeUpload: should prepend origin to relative URL after uploading new merged chunks', async () => {
    storageService.exists = async () => false
    storageService.upload = async () => ({ url: '/f/up/file/merged.txt' })

    const fileContent = 'hello world chunk content'
    const md5 = crypto.createHash('md5').update(fileContent).digest('hex')
    
    // Create actual chunk files to let the controller merge them successfully
    const chunkDir = path.join('output', 'uploaded', 'chunks', md5)
    fs.mkdirSync(chunkDir, { recursive: true })
    fs.writeFileSync(path.join(chunkDir, 'chunk-0'), Buffer.from(fileContent))

    const req = {
      body: {
        filename: 'merged.txt',
        md5,
        totalChunks: '1'
      },
      get: (header) => {
        if (header === 'host') return 'miochat.com'
        return null
      },
      protocol: 'https'
    }

    let jsonResponse = null
    const res = {
      json(data) {
        jsonResponse = data
        return this
      },
      status(_code) {
        return this
      }
    }

    try {
      await fileController.finalizeUpload(req, res)
    } finally {
      // Clean up in case of failure or success
      if (fs.existsSync(chunkDir)) {
        fs.rmSync(chunkDir, { force: true, recursive: true })
      }
      const outputFilePath = path.join('output', 'uploaded', 'file', `${md5.substring(0, 8)}.txt`)
      if (fs.existsSync(outputFilePath)) {
        fs.unlinkSync(outputFilePath)
      }
    }

    assert.ok(jsonResponse)
    assert.strictEqual(jsonResponse.code, 0)
    assert.strictEqual(jsonResponse.data.url, 'https://miochat.com/f/up/file/merged.txt')
  })
})
