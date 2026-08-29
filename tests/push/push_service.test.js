import { test } from 'node:test'
import assert from 'node:assert'
import pushService from '../../lib/push/PushService.js'
import systemSettingsService from '../../lib/database/services/SystemSettingsService.js'

test('PushService 完整生命周期测试：VAPID生成与持久化、订阅增删查', async () => {
  // 1. 初始化服务
  await pushService.initialize()
  const publicKey = await pushService.getVapidPublicKey()
  assert.ok(typeof publicKey === 'string' && publicKey.length > 20, 'VAPID 公钥必须为有效的 base64 字符串')

  // 2. 验证 DB 中是否持久化
  const dbKeys = await systemSettingsService.get('vapid_keys')
  assert.ok(dbKeys && dbKeys.value?.publicKey === publicKey, '数据库中存储的公钥必须与服务内存一致')

  // 3. 注册订阅
  const testSub = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/fake-test-endpoint-123',
    expirationTime: null,
    keys: {
      auth: 'fakeAuthKey12345678',
      p256dh: 'fakeP256dhKey12345678901234567890',
    },
  }

  await pushService.addSubscription(testSub, { device: 'ios_pwa', userId: 'admin' })
  const subsAfterAdd = await pushService.getSubscriptions()
  const found = subsAfterAdd.find(s => s.endpoint === testSub.endpoint)
  assert.ok(found, '新增的订阅记录必须能在列表中查到')
  assert.strictEqual(found.device, 'ios_pwa')

  // 4. 重复注册同一 endpoint 应更新而不是追加
  await pushService.addSubscription(testSub, { device: 'web', userId: 'admin' })
  const subsAfterUpdate = await pushService.getSubscriptions()
  const matching = subsAfterUpdate.filter(s => s.endpoint === testSub.endpoint)
  assert.strictEqual(matching.length, 1, '重复 endpoint 必须更新记录而非增加')
  assert.strictEqual(matching[0].device, 'web')

  // 5. 注销订阅
  await pushService.removeSubscription(testSub.endpoint)
  const subsAfterRemove = await pushService.getSubscriptions()
  assert.strictEqual(subsAfterRemove.filter(s => s.endpoint === testSub.endpoint).length, 0, '注销后该 endpoint 必须被清除')

  // 6. 清空所有订阅
  await pushService.addSubscription(testSub, { device: 'pwa', userId: 'admin' })
  await pushService.clearSubscriptions()
  const subsAfterClear = await pushService.getSubscriptions()
  assert.strictEqual(subsAfterClear.length, 0, '清空后订阅列表必须为空')
})
