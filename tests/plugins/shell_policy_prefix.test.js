import { test } from 'node:test'
import assert from 'node:assert/strict'

import { ShellPolicyService } from '../../lib/database/services/ShellPolicyService.js'

test('未知命令不能通过白名单前缀获得自动放行', () => {
  const service = new ShellPolicyService()

  assert.equal(service.getCommandPrefix('okx list --limit 100'), 'okx')
  assert.equal(service.getCommandPrefix('okx list --limit 100', 2), 'okx list')
  assert.deepEqual(
    service.getCommandPrefixes('ENV=prod okx --format=json list'),
    {
      prefix1: 'okx',
      prefix2: 'okx --format=json',
    },
  )
  assert.equal(service.getCommandPrefix('ENV=prod okx list', 2), 'okx list')

  assert.equal(
    service._matchCommand('okx list --limit 100', {
      matchType: 'prefix',
      match: 'okx list',
    }),
    false,
  )
  assert.equal(
    service._matchCommand('grep foo file', {
      matchType: 'prefix',
      match: 'grep foo',
    }),
    true,
  )
  assert.equal(
    service._matchCommand('okx list && rm -rf /', {
      matchType: 'prefix',
      match: 'okx list',
    }),
    false,
  )
  assert.equal(
    service._matchCommand('okx list\nrm -rf /', {
      matchType: 'prefix',
      match: 'okx list',
    }),
    false,
  )
  assert.equal(
    service._matchCommand('okx list $(rm -rf /tmp/x)', {
      matchType: 'prefix',
      match: 'okx list',
    }),
    false,
  )
  assert.equal(
    service._matchCommand('okx list "$(rm -rf /tmp/x)"', {
      matchType: 'prefix',
      match: 'okx list',
    }),
    false,
  )
})

test('Shell 白名单对命令替换与换行 fail-closed，且绝对危险命令优先于 allow', async () => {
  const service = new ShellPolicyService()
  service._seeded = true
  service.prisma = {
    shellAutoApproveRule: {
      findMany: async () => [
        {
          id: 1,
          matchType: 'prefix',
          match: 'okx list',
          cwd: null,
          deny: false,
          enabled: true,
        },
      ],
    },
  }

  assert.equal(
    (await service.evaluate('okx list $(rm -rf /tmp/x)')).verdict,
    'block',
  )
  assert.equal(
    (await service.evaluate('okx list\nrm -rf /tmp/x')).verdict,
    'block',
  )
  assert.equal((await service.evaluate('rm -rf /tmp/x')).verdict, 'block')
})

test('Shell 包装器不允许进入前缀白名单自动放行', async () => {
  const service = new ShellPolicyService()
  service._seeded = true
  service.prisma = {
    shellAutoApproveRule: {
      findMany: async () => [
        {
          id: 1,
          matchType: 'prefix',
          match: 'env',
          cwd: null,
          deny: false,
          enabled: true,
        },
      ],
    },
  }

  assert.equal((await service.evaluate('env rm -rf /tmp/x')).verdict, 'block')
  assert.equal((await service.evaluate('command sudo reboot')).verdict, 'block')
  assert.equal(
    (await service.evaluate('timeout 1 nice rm -rf /tmp/x')).verdict,
    'block',
  )
  assert.equal((await service.evaluate('/bin/rm -rf /tmp/x')).verdict, 'block')
  assert.equal((await service.evaluate('"rm" -rf /tmp/x')).verdict, 'block')
  assert.equal(
    (await service.evaluate('/usr/bin/env rm -rf /tmp/x')).verdict,
    'block',
  )
  assert.equal((await service.evaluate('(rm -rf /tmp/x)')).verdict, 'block')
  assert.equal((await service.evaluate('eval rm -rf /tmp/x')).verdict, 'block')
  assert.equal(
    (await service.evaluate('source /tmp/destructive.sh')).verdict,
    'block',
  )
  assert.equal((await service.evaluate('! rm -rf /tmp/x')).verdict, 'block')
  assert.equal(
    (await service.evaluate('./run-destructive-script')).verdict,
    'block',
  )
})

test('环境变量赋值不能借助持久白名单自动放行', async () => {
  const service = new ShellPolicyService()
  service._seeded = true
  service.prisma = {
    shellAutoApproveRule: {
      findMany: async () => [
        {
          id: 1,
          matchType: 'prefix',
          match: 'okx list',
          cwd: null,
          deny: false,
          enabled: true,
        },
      ],
    },
  }

  assert.equal(
    (await service.evaluate('MODE=prod  okx   list --limit 100')).verdict,
    'block',
  )
  assert.equal(
    (await service.evaluate('okx list --limit 100')).verdict,
    'unknown',
  )
})

test('Shell 策略数据库异常时 fail-closed，且本地危险语法不依赖数据库', async () => {
  const unsafeService = new ShellPolicyService()
  unsafeService.initialize = async () => {
    throw new Error('database unavailable')
  }
  const unsafe = await unsafeService.evaluate('okx list $(rm -rf /tmp/x)')
  assert.equal(unsafe.reason, 'unsafe-shell-syntax')
  assert.equal(unsafe.verdict, 'block')

  const databaseFailureService = new ShellPolicyService()
  databaseFailureService._seeded = true
  databaseFailureService.prisma = {
    shellAutoApproveRule: {
      findMany: async () => {
        throw new Error('database unavailable')
      },
    },
  }
  assert.deepEqual(await databaseFailureService.evaluate('okx list'), {
    reason: 'policy-error',
    verdict: 'block',
  })
})
