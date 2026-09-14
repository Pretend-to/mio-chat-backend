import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'

import {
  candidateUrls,
  discoverTestRuntime,
  normalizeBaseUrl,
} from '../../scripts/utils/test-runtime.js'
import { findExistingService } from '../../scripts/utils/run-tests.js'

test('test runtime discovery has no fixed port dependency', async (t) => {
  await t.test('normalizes explicit URLs and configured wildcard hosts', () => {
    assert.equal(normalizeBaseUrl('localhost:4567/path?q=1'), 'http://localhost:4567')
    assert.deepEqual(candidateUrls({
      configured: { host: '0.0.0.0', port: 9123 },
      env: {},
      listeningPorts: [4567],
    }), [
      'http://127.0.0.1:9123',
      'http://127.0.0.1:4567',
    ])
  })

  await t.test('prefers an explicit target and discovers credentials from the database', async () => {
    const probed = []
    const runtime = await discoverTestRuntime({
      env: { BASE_URL: 'http://mio.test:7788/' },
      listPorts: async () => [4567],
      probe: async url => {
        probed.push(url)
        return url === 'http://mio.test:7788'
      },
      readSettings: async () => ({
        adminCode: 'database-secret',
        server: { host: '127.0.0.1', port: 9123 },
      }),
    })

    assert.equal(runtime.baseUrl, 'http://mio.test:7788')
    assert.equal(runtime.adminCode, 'database-secret')
    assert.ok(probed.includes('http://127.0.0.1:4567'))
  })

  await t.test('finds a running service on an arbitrary listening port', async () => {
    const runtime = await discoverTestRuntime({
      env: { ADMIN_CODE: 'env-secret' },
      listPorts: async () => [43119, 57991],
      probe: async url => url.endsWith(':57991'),
      readSettings: async () => ({ adminCode: null, server: null }),
    })

    assert.equal(runtime.baseUrl, 'http://127.0.0.1:57991')
    assert.equal(runtime.adminCode, 'env-secret')
    assert.ok(runtime.candidates.every(url => !url.endsWith(':3080')))
  })

  await t.test('probes a real ephemeral HTTP listener', async () => {
    const server = createServer((request, response) => {
      response.writeHead(request.url === '/api/gateway' ? 200 : 404)
      response.end(JSON.stringify({ data: { name: 'mio-chat-backend' } }))
    })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))

    try {
      const port = server.address().port
      const runtime = await discoverTestRuntime({
        env: { ADMIN_CODE: 'ephemeral-secret' },
        listPorts: async () => [port],
        readSettings: async () => ({ adminCode: null, server: null }),
      })
      assert.equal(runtime.baseUrl, `http://127.0.0.1:${port}`)
    } finally {
      await new Promise(resolve => server.close(resolve))
    }
  })
})

test('test launcher detects an existing service without treating it as the test target', async () => {
  assert.equal(
    await findExistingService(async () => ({ baseUrl: 'http://127.0.0.1:43119' })),
    'http://127.0.0.1:43119',
  )
  assert.equal(await findExistingService(async () => ({ baseUrl: null })), null)
})
