import { test } from 'node:test'
import assert from 'node:assert'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { MemoryStore } from '../../channels/memory/index.js'

/**
 * MemoryStore — 渠道无关记忆落盘层测试
 * 覆盖：soul / global 长期记忆(分类CRUD) / sessions / crystal / active / 安全 / 隔离
 */

test('MemoryStore 记忆落盘层', async () => {
  const baseDir = path.join(os.tmpdir(), `mio-mem-${Date.now()}`)
  const m = new MemoryStore({ agentId: 'wechat-master', baseDir })

  await test('soul 读写', async () => {
    assert.strictEqual(await m.readSoul(), '')
    await m.writeSoul('你叫小助手，陪伴用户工作')
    assert.ok((await m.readSoul()).includes('小助手'))
  })

  await test('global 长期记忆：分类分区 + 合并 + update/delete', async () => {
    await m.addGlobal('user_profile', '用户喜欢 Node.js')
    await m.addGlobal('user_profile', '用户是开发者')
    await m.addGlobal('tech_stack', '常用 pnpm')
    const cats = await m.listGlobalCategories()
    assert.ok(cats.includes('user_profile') && cats.includes('tech_stack'))
    const all = await m.readAllGlobal()
    assert.ok(all.includes('## user_profile') && all.includes('## tech_stack') && all.includes('pnpm'))
    await m.updateGlobal('user_profile', '开发者', '用户是高级工程师')
    const up = await m.readGlobal('user_profile')
    assert.ok(up.includes('高级工程师') && !up.includes('开发者'))
    await m.deleteGlobal('user_profile', 'Node.js')
    assert.ok(!(await m.readGlobal('user_profile')).includes('Node.js'))
  })

  await test('sessions：创建/列表/追加聊天', async () => {
    const s1 = await m.createSession({ title: '会话1' })
    await m.createSession({ title: '会话2' })
    assert.strictEqual((await m.listSessions()).length, 2)
    await m.appendToChat(s1.id, { role: 'user', content: '早上好' })
    await m.appendToChat(s1.id, { role: 'assistant', content: '早！' })
    const chat = await m.getChat(s1.id)
    assert.strictEqual(chat.length, 2)
    assert.strictEqual(chat[1].content, '早！')
    assert.strictEqual((await m.listSessions()).find((s) => s.id === s1.id).msgCount, 2)
  })

  await test('结晶：setCrystal/getCrystal + clearChat 保留 crystal', async () => {
    const s = await m.createSession({ title: 'ctx' })
    await m.setCrystal(s.id, '<memory_crystal>长期事实A</memory_crystal>')
    assert.ok((await m.getCrystal(s.id)).includes('长期事实A'))
    await m.appendToChat(s.id, { role: 'user', content: 'x' })
    await m.clearChat(s.id)
    assert.strictEqual((await m.getChat(s.id)).length, 0)
    assert.ok((await m.getCrystal(s.id)).includes('长期事实A'))
  })

  await test('active 会话：set/get + 删除激活会话重置', async () => {
    assert.strictEqual(await m.getActiveSession(), null)
    const s = await m.createSession({ title: 'act' })
    await m.setActiveSession(s.id)
    assert.strictEqual(await m.getActiveSession(), s.id)
    await m.deleteSession(s.id)
    assert.strictEqual(await m.getActiveSession(), null)
  })

  await test('安全：非法 sessionId 被 sanitize 不会越权', async () => {
    assert.strictEqual(await m.getSession('../../etc/passwd'), null)
  })

  await test('agent 隔离', async () => {
    const m2 = new MemoryStore({ agentId: 'other-agent', baseDir })
    await m2.writeSoul('另一个灵魂')
    assert.ok((await m.readSoul()).includes('小助手'))
  })

  fs.rmSync(baseDir, { recursive: true, force: true })
})