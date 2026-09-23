import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'fs'
import path from 'path'

import { resolveOrigin, formatAssetUrl, getFallbackOrigin } from '../../utils/origin.js'
import LocalAdapter from '../../lib/storage/adapters/LocalAdapter.js'
import PublishTool from '../../lib/plugins/web-plugin/tools/publish.js'
import * as fileController from '../../lib/server/http/controllers/fileController.js'
import storageService from '../../lib/storage/StorageService.js'

test('1. utils/origin.js - resolveOrigin & formatAssetUrl', async (t) => {
  await t.test('resolves valid http and https URLs', () => {
    assert.strictEqual(resolveOrigin('http://localhost:5173'), 'http://localhost:5173')
    assert.strictEqual(resolveOrigin('http://localhost:5173/'), 'http://localhost:5173')
    assert.strictEqual(resolveOrigin('https://miochat.com'), 'https://miochat.com')
    assert.strictEqual(resolveOrigin('https://miochat.com/'), 'https://miochat.com')
  })

  await t.test('falls back to localhost+port for invalid or special keywords', () => {
    const fallback = getFallbackOrigin()
    assert.ok(fallback.startsWith('http://localhost:'))
    assert.strictEqual(resolveOrigin('web'), fallback)
    assert.strictEqual(resolveOrigin('channel'), fallback)
    assert.strictEqual(resolveOrigin(''), fallback)
    assert.strictEqual(resolveOrigin(null), fallback)
    assert.strictEqual(resolveOrigin(undefined), fallback)
  })

  await t.test('formats asset URLs cleanly without duplicate slashes', () => {
    assert.strictEqual(
      formatAssetUrl('http://localhost:3080', '/f/up/file/test.txt'),
      'http://localhost:3080/f/up/file/test.txt'
    )
    assert.strictEqual(
      formatAssetUrl('http://localhost:3080/', 'f/up/file/test.txt'),
      'http://localhost:3080/f/up/file/test.txt'
    )
    assert.strictEqual(
      formatAssetUrl('https://example.com', 'https://cdn.example.com/image.png'),
      'https://cdn.example.com/image.png'
    )
  })
})

test('2. LocalAdapter - External domain config & Subdirectory preservation', async (t) => {
  const testDir = path.join(process.cwd(), 'output', 'uploaded_test_' + Date.now())

  t.after(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
  })

  await t.test('respects domain and port in config', () => {
    const adapterWithDomain = new LocalAdapter({
      baseDir: testDir,
      domain: 'https://chat.example.com',
    })
    assert.strictEqual(adapterWithDomain.baseUrl, 'https://chat.example.com/f/up')

    const adapterWithDomainAndPort = new LocalAdapter({
      baseDir: testDir,
      domain: 'http://192.168.1.100',
      port: 8080,
    })
    assert.strictEqual(adapterWithDomainAndPort.baseUrl, 'http://192.168.1.100:8080/f/up')

    const adapterDefault = new LocalAdapter({ baseDir: testDir })
    assert.strictEqual(adapterDefault.baseUrl, '/f/up')
  })

  await t.test('preserves subdirectories when uploading (web/hash/index.html)', async () => {
    const adapter = new LocalAdapter({ baseDir: testDir })
    const hash = 'a1b2c3'
    const fileName = `web/${hash}/index.html`
    const content = Buffer.from('<!DOCTYPE html><html><body><h1>Hello Mio</h1></body></html>')

    const res = await adapter.upload(content, fileName, 'file')

    assert.strictEqual(res.key, `file/web/${hash}/index.html`)
    assert.strictEqual(res.url, `/f/up/file/web/${hash}/index.html`)

    // Verify physical file existence
    const physicalPath = path.join(testDir, 'file', 'web', hash, 'index.html')
    assert.ok(fs.existsSync(physicalPath))
    assert.strictEqual(fs.readFileSync(physicalPath, 'utf-8'), content.toString())

    // Verify exists and getUrl
    assert.ok(await adapter.exists(`file/web/${hash}/index.html`))
    assert.strictEqual(adapter.getUrl(`file/web/${hash}/index.html`), `/f/up/file/web/${hash}/index.html`)

    // Verify delete
    await adapter.delete(`file/web/${hash}/index.html`)
    assert.ok(!fs.existsSync(physicalPath))
    assert.ok(!await adapter.exists(`file/web/${hash}/index.html`))
  })

  await t.test('blocks directory traversal attempts in upload', async () => {
    const adapter = new LocalAdapter({ baseDir: testDir })
    // Either normalized away safely or blocked
    const res = await adapter.upload(Buffer.from('safe'), '../../safe.txt', 'file')
    assert.ok(!res.key.includes('..'))
  })
})

test('3. publish tool - Generates full visit URL with hash directory', async (t) => {
  const origAdapter = storageService.adapter
  const origIsInit = storageService.isInitialized
  const testDir = path.join(process.cwd(), 'output', 'uploaded_pub_test_' + Date.now())

  const localAdapter = new LocalAdapter({ baseDir: testDir })
  storageService.adapter = localAdapter
  storageService.isInitialized = true

  t.after(() => {
    storageService.adapter = origAdapter
    storageService.isInitialized = origIsInit
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
  })

  const publishInstance = new PublishTool()

  await t.test('publishes direct HTML and returns browser visit URL with hash', async () => {
    const mockEvent = {
      user: {
        id: 'user_test',
        origin: 'http://localhost:5173',
      },
      params: {
        html: '<h1>My Page</h1>',
      },
    }

    const output = await publishInstance.pubWebpage(mockEvent)
    assert.ok(output.result?.url)
    assert.ok(output.result.url.startsWith('http://localhost:5173/f/up/file/web/'))
    assert.ok(output.result.url.endsWith('/index.html'))
    assert.ok(!output.result.url.includes('web/f/up'))

    // Verify extraRender
    assert.strictEqual(output.extraRender?.[0]?.type, 'link')
    assert.strictEqual(output.extraRender?.[0]?.url, output.result.url)
  })

  await t.test('falls back to localhost:port when user.origin is "web"', async () => {
    const mockEvent = {
      user: {
        id: 'user_fallback',
        origin: 'web', // legacy bad origin
      },
      params: {
        html: '<p>Fallback test</p>',
      },
    }

    const output = await publishInstance.pubWebpage(mockEvent)
    assert.ok(output.result?.url)
    const fallback = getFallbackOrigin()
    assert.ok(output.result.url.startsWith(`${fallback}/f/up/file/web/`))
    assert.ok(!output.result.url.startsWith('web/f/up'))
  })
})

test('4. fileController.serveUploadedFile - Priority for browser rendering vs download', async (t) => {
  const uploadedDir = path.join(process.cwd(), 'output', 'uploaded')
  const testSubDir = path.join(uploadedDir, 'file', 'web', 'test_render')
  fs.mkdirSync(testSubDir, { recursive: true })

  const htmlFile = path.join(testSubDir, 'index.html')
  fs.writeFileSync(htmlFile, '<!DOCTYPE html><html><body>Test</body></html>')

  const zipFile = path.join(testSubDir, 'archive.zip')
  fs.writeFileSync(zipFile, 'dummy-zip-data')

  t.after(() => {
    if (fs.existsSync(testSubDir)) {
      fs.rmSync(testSubDir, { recursive: true, force: true })
    }
  })

  await t.test('serves renderable HTML inline using sendFile', () => {
    let sentFile = null
    let downloadedFile = null

    const req = {
      params: {
        type: 'file',
        name: ['web', 'test_render', 'index.html'],
      },
      query: {},
    }
    const res = {
      sendFile(fp) { sentFile = fp },
      download(fp) { downloadedFile = fp },
      status() { return this },
      send() { return this },
    }

    fileController.serveUploadedFile(req, res)
    assert.strictEqual(sentFile, htmlFile)
    assert.strictEqual(downloadedFile, null)
  })

  await t.test('serves renderable HTML as download if ?download=1 is set', () => {
    let sentFile = null
    let downloadedFile = null

    const req = {
      params: {
        type: 'file',
        name: ['web', 'test_render', 'index.html'],
      },
      query: { download: '1' },
    }
    const res = {
      sendFile(fp) { sentFile = fp },
      download(fp) { downloadedFile = fp },
      status() { return this },
      send() { return this },
    }

    fileController.serveUploadedFile(req, res)
    assert.strictEqual(sentFile, null)
    assert.strictEqual(downloadedFile, htmlFile)
  })

  await t.test('serves non-renderable file (.zip) via res.download', () => {
    let sentFile = null
    let downloadedFile = null

    const req = {
      params: {
        type: 'file',
        name: ['web', 'test_render', 'archive.zip'],
      },
      query: {},
    }
    const res = {
      sendFile(fp) { sentFile = fp },
      download(fp) { downloadedFile = fp },
      status() { return this },
      send() { return this },
    }

    fileController.serveUploadedFile(req, res)
    assert.strictEqual(sentFile, null)
    assert.strictEqual(downloadedFile, zipFile)
  })

  await t.test('blocks path traversal attempts with 403', () => {
    let statusCode = null
    let _responseText = null

    const req = {
      params: {
        type: 'file',
        name: ['..', '..', 'etc', 'passwd'],
      },
      query: {},
    }
    const res = {
      status(code) { statusCode = code; return this },
      send(msg) { _responseText = msg; return this },
    }

    fileController.serveUploadedFile(req, res)
    // Because ../ is normalized or escapes baseDir, it either 404s (if resolved inside base) or 403s
    assert.ok(statusCode === 403 || statusCode === 404)
  })

  await t.test('allows document category directory', () => {
    const docDir = path.join(uploadedDir, 'document')
    fs.mkdirSync(docDir, { recursive: true })
    const testDoc = path.join(docDir, 'test-report.md')
    fs.writeFileSync(testDoc, '# Report')

    let sentFile = null
    const req = {
      params: {
        type: 'document',
        name: 'test-report.md',
      },
      query: {},
    }
    const res = {
      sendFile(fp) { sentFile = fp },
      download() {},
      status() { return this },
      send() { return this },
    }

    try {
      fileController.serveUploadedFile(req, res)
      assert.strictEqual(sentFile, testDoc)
    } finally {
      if (fs.existsSync(testDoc)) fs.unlinkSync(testDoc)
    }
  })
})
