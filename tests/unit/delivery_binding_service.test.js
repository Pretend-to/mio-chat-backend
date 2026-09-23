import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DELIVERY_MODES,
  listDeliveryChannels,
  resolveDeliveryBinding,
} from '../../lib/chat/delivery/DeliveryBindingService.js'

function prismaFixture({
  bindings: customBindings = null,
  defaultDeliveryBindingId = 'binding-web',
} = {}) {
  const bindings = customBindings || [
    {
      id: 'binding-web',
      agentId: 'agent-1',
      channelId: 'web-default',
      enabled: true,
      outboundEnabled: false,
      channel: { id: 'web-default', name: 'Web', type: 'web' },
    },
    {
      id: 'binding-wechat',
      agentId: 'agent-1',
      channelId: 'wechat',
      enabled: true,
      outboundEnabled: true,
      channel: { id: 'wechat', name: '我的微信', type: 'wechat' },
    },
    {
      id: 'binding-feishu',
      agentId: 'agent-1',
      channelId: 'feishu',
      enabled: true,
      outboundEnabled: true,
      channel: { id: 'feishu', name: '工作飞书', type: 'feishu' },
    },
  ]
  return {
    agent: {
      findUnique: async ({ select } = {}) =>
        select
          ? { defaultDeliveryBindingId }
          : {
              id: 'agent-1',
              defaultDeliveryBindingId,
            },
    },
    agentChannelBinding: {
      findMany: async () => bindings,
      findUnique: async ({ where }) => {
        if (where.id)
          return bindings.find((item) => item.id === where.id) || null
        return (
          bindings.find(
            (item) =>
              item.agentId === where.agentId_channelId.agentId &&
              item.channelId === where.agentId_channelId.channelId,
          ) || null
        )
      },
    },
  }
}

test('delivery resolver uses current binding before Agent default', async () => {
  const result = await resolveDeliveryBinding({
    agentId: 'agent-1',
    deliveryMode: DELIVERY_MODES.DEFAULT,
    event: { bindingId: 'binding-feishu' },
    prisma: prismaFixture(),
  })
  assert.equal(result.binding.id, 'binding-feishu')
})

test('delivery resolver accepts public Channel ID and supports session_only', async () => {
  const prisma = prismaFixture()
  const selected = await resolveDeliveryBinding({
    agentId: 'agent-1',
    deliveryChannelId: 'feishu',
    deliveryMode: DELIVERY_MODES.CHANNEL,
    prisma,
  })
  assert.equal(selected.binding.id, 'binding-feishu')
  const silent = await resolveDeliveryBinding({
    agentId: 'agent-1',
    deliveryMode: DELIVERY_MODES.SESSION_ONLY,
    prisma,
  })
  assert.equal(silent.binding, null)
  const channels = await listDeliveryChannels('agent-1', { prisma })
  assert.deepEqual(
    channels.map((channel) => [channel.channelId, channel.isDefault]),
    [
      ['wechat', false],
      ['feishu', false],
    ],
  )
})

test('Web is filtered and never becomes an external delivery target', async () => {
  const prisma = prismaFixture()
  const fallback = await resolveDeliveryBinding({
    agentId: 'agent-1',
    deliveryMode: DELIVERY_MODES.DEFAULT,
    prisma,
  })
  assert.equal(fallback.binding, null)
  await assert.rejects(
    resolveDeliveryBinding({
      agentId: 'agent-1',
      deliveryChannelId: 'web-default',
      deliveryMode: DELIVERY_MODES.CHANNEL,
      prisma,
    }),
    /not a delivery channel/,
  )
  assert.equal(
    (await listDeliveryChannels('agent-1', { prisma })).some(
      (channel) => channel.channelId === 'web-default',
    ),
    false,
  )
})

test('default resolver backfills exactly one legacy external binding', async () => {
  const prisma = prismaFixture({
    bindings: [
      {
        id: 'binding-web',
        agentId: 'agent-1',
        channelId: 'web-default',
        enabled: true,
        outboundEnabled: false,
        channel: { id: 'web-default', name: 'Web', type: 'web' },
      },
      {
        id: 'binding-wechat',
        agentId: 'agent-1',
        channelId: 'wechat',
        enabled: true,
        outboundEnabled: true,
        channel: { id: 'wechat', name: '我的微信', type: 'wechat' },
      },
    ],
    defaultDeliveryBindingId: null,
  })
  const result = await resolveDeliveryBinding({
    agentId: 'agent-1',
    deliveryMode: DELIVERY_MODES.DEFAULT,
    prisma,
  })
  assert.equal(result.binding.id, 'binding-wechat')
})

test('default resolver does not guess among multiple legacy external bindings', async () => {
  const result = await resolveDeliveryBinding({
    agentId: 'agent-1',
    deliveryMode: DELIVERY_MODES.DEFAULT,
    prisma: prismaFixture({ defaultDeliveryBindingId: null }),
  })
  assert.equal(result.binding, null)
})
