import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { ChannelStore } from '../../channels/index.js'
import * as controller from '../../lib/server/http/controllers/channelController.js'
import { createPrismaFixture } from '../helpers/prismaFixture.js'

function response() {
  const res = { body: null, statusCode: 200 }
  res.json = (value) => {
    res.body = value
    return value
  }
  res.status = (statusCode) => {
    res.statusCode = statusCode
    return {
      json: (value) => {
        res.body = value
        return value
      },
    }
  }
  return res
}

const request = (params = {}, body = {}) => ({ body, params })

test('Channel 管理 API 使用严格 DTO 创建并认证原生 iLink 连接', async (t) => {
  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'channel-controller-ilink-'),
  )
  t.after(() => fs.promises.rm(tempDir, { force: true, recursive: true }))
  const { prisma } = await createPrismaFixture(t)
  const store = new ChannelStore({ encryptionKey: '33'.repeat(32), prisma })
  const qrClient = {
    async getLoginQrCode() {
      return {
        qrcode: 'qr-1',
        qrcode_img_content: 'https://example.com/qr.png',
      }
    },
    async pollQrStatus(qrcode) {
      assert.equal(qrcode, 'qr-1')
      return {
        bot_token: 'token-9',
        ilink_bot_id: 'bot-9',
        ilink_user_id: 'master@im.wechat',
        status: 'confirmed',
      }
    },
  }
  const running = new Set()
  const runtime = {
    channelStore: store,
    onebotsGateway: null,
    running: new Map(),
    async delete() {},
    async dispose() {},
    isRunning: (id) => running.has(id),
    async start(id) {
      running.add(id)
      return { connected: true }
    },
    async stop(id) {
      running.delete(id)
    },
    async updateConfig(id, patch) {
      return await store.update(id, patch)
    },
  }
  const claims = new Map()
  const identityService = {
    async getChannelSummary(id) {
      return {
        adminCount: 0,
        claimAvailable: claims.has(id),
        claimExpiresAt: null,
      }
    },
    async issueAdminClaim(id) {
      const claim = {
        code: 'MIO-TEST-CODE',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }
      claims.set(id, claim)
      return claim
    },
  }
  controller.initChannelController({
    channelStore: store,
    identityService,
    ilinkClientFactory: () => qrClient,
    runtime,
    startTriggers: false,
  })

  const catalogResponse = response()
  controller.getChannelPlatformCatalog(request(), catalogResponse)
  assert.equal(catalogResponse.body.data.version, 1)
  assert.deepEqual(
    catalogResponse.body.data.adapters.map((platform) => platform.id),
    ['weixin-ilink'],
  )
  assert.equal(catalogResponse.body.data.adapters[0].auth.type, 'qrcode')

  const invalidCreateResponse = response()
  await controller.createChannel(
    request({}, { version: 2 }),
    invalidCreateResponse,
  )
  assert.equal(invalidCreateResponse.statusCode, 400)

  const createResponse = response()
  await controller.createChannel(
    request(
      {},
      {
        version: 1,
        adapter: {
          id: 'weixin-ilink',
          runtime: 'native',
          protocol: 'weixin.ilink',
        },
        profile: { name: '结构化创建' },
        config: {},
      },
    ),
    createResponse,
  )
  const generic = await store.get(createResponse.body.data.id)
  assert.equal(createResponse.body.data.adminClaim.code, 'MIO-TEST-CODE')
  assert.equal(generic.type, 'weixin-ilink')
  assert.equal(generic.driver, 'native')
  assert.equal(generic.platform, 'weixin-ilink')
  assert.equal(generic.protocol, 'weixin.ilink')
  assert.deepEqual(generic.config, {})
  const created = generic
  const qrResponse = response()
  await controller.getChannelQrcode(
    request({ id: created.id }, { force: true }),
    qrResponse,
  )
  assert.equal(qrResponse.body.data.qrcode, 'qr-1')
  assert.equal(qrResponse.body.data.img, 'https://example.com/qr.png')

  const pollResponse = response()
  await controller.pollChannelQr(
    request({ id: created.id }, { qrcode: 'qr-1' }),
    pollResponse,
  )
  assert.equal(pollResponse.body.data.status, 'confirmed')
  const bound = await store.get(created.id)
  assert.equal(bound.token, 'token-9')
  assert.equal(bound.botId, 'bot-9')
  assert.equal(bound.userId, 'master@im.wechat')
  assert.equal(bound.status, 'bound')
  assert.equal(runtime.isRunning(created.id), true)

  const regenerated = response()
  await controller.createChannelAdminClaim(
    request({ id: created.id }),
    regenerated,
  )
  assert.equal(regenerated.body.data.adminClaim.code, 'MIO-TEST-CODE')

  const publicChannel = await store.getPublic(created.id)
  assert.equal('token' in publicChannel, false)
  const detailResponse = response()
  await controller.getChannel(request({ id: created.id }), detailResponse)
  assert.equal('token' in detailResponse.body.data, false)
  assert.equal(detailResponse.body.data.hasToken, true)

  await controller.updateChannel(
    request({ id: created.id }, { name: '改名' }),
    response(),
  )
  assert.equal((await store.get(created.id)).name, '改名')

  await controller.stopChannel(request({ id: created.id }), response())
  assert.equal(runtime.isRunning(created.id), false)

  const startResponse = response()
  await controller.startChannel(request({ id: created.id }), startResponse)
  assert.equal(startResponse.body.data.started, true)

  await controller.deleteChannel(request({ id: created.id }), response())
  assert.equal(await store.get(created.id), null)
})
