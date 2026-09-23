import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getChannelCatalog,
  normalizeChannelCreatePayload,
  registerChannelAdapter,
} from '../../channels/ChannelAdapterRegistry.js'

test('channel catalog exposes adapter metadata without a legacy platforms alias', () => {
  const catalog = getChannelCatalog()
  assert.equal(catalog.version, 1)
  assert.equal(catalog.runtimes[0].id, 'native')
  assert.equal(catalog.adapters[0].id, 'weixin-ilink')
  assert.equal(catalog.adapters[0].auth.type, 'qrcode')
  assert.equal('package' in catalog.adapters[0], false)
  assert.equal(catalog.platforms, undefined)
})

test('registered channel adapters normalize optional metadata and remain creatable', () => {
  registerChannelAdapter({
    id: 'TEST-PLATFORM',
    name: '测试平台',
    runtime: 'OneBots',
    protocol: 'OneBot.V12',
    onebots: { platform: 'test-platform' },
  })
  const created = normalizeChannelCreatePayload({
    adapter: { id: 'test-platform', runtime: 'onebots', protocol: 'onebot.v12' },
    profile: {},
    version: 1,
  })
  assert.equal(created.name, '测试平台')
  assert.equal(created.agentId, undefined)
  const adapter = getChannelCatalog().adapters.find(item => item.id === 'test-platform')
  assert.equal(adapter.auth.type, 'none')
  assert.deepEqual(adapter.configSchema, [])
})

test('structured channel creation resolves defaults and adapter config', () => {
  assert.deepEqual(normalizeChannelCreatePayload({
    adapter: {
      id: 'weixin-ilink',
      runtime: 'native',
      protocol: 'weixin.ilink',
    },
    profile: { name: '研发微信' },
    version: 1,
  }), {
    type: 'weixin-ilink',
    adapterId: 'weixin-ilink',
    driver: 'native',
    platform: 'weixin-ilink',
    protocol: 'weixin.ilink',
    name: '研发微信',
    config: {},
  })
})

test('legacy flat creation is rejected and invalid adapters fail closed', () => {
  assert.throws(
    () => normalizeChannelCreatePayload({ type: 'wechat', name: '旧微信' }),
    /Unsupported channel creation version/,
  )
  assert.throws(
    () => normalizeChannelCreatePayload({
      adapter: { id: 'missing', runtime: 'onebots', protocol: 'onebot.v12' },
      profile: {},
      version: 1,
    }),
    /Unsupported channel adapter/,
  )
  assert.throws(
    () => normalizeChannelCreatePayload({ version: 2 }),
    /Unsupported channel creation version/,
  )
})
