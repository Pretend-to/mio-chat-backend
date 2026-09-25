/**
 * 记忆镜像的回归锚点。
 *
 * 核心用例（第一个）复刻 2026-09-24 那场事故的等价形态：
 * **结晶为空、记忆内容全在编辑事件里**（Web 路径的真实形态），
 * 此时任何一次编辑都不能抹掉其它分区。
 *
 * 修复前：base = previous_summary（空）→ 重建整份文档 → 其余分区被写成空。
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  MEMORY_MIRROR_MISSING,
  applyEdit,
  replayEvents,
  resolveMirror,
} from '../../lib/chat/llm/services/MemoryMirror.js'
import {
  CRYSTAL_TAGS,
  buildXmlFromZones,
  parseXmlZones,
} from '../../lib/chat/llm/services/CrystallizationUtils.js'

test('回归锚点：结晶为空、内容全在事件里时，单次编辑不得抹掉其它分区', () => {
  // 前两轮编辑已经落在缓冲里（Web 路径：真结晶还是空的，crystals 表 0 行）
  const historyEvents = [
    { action: 'add', content: '用户是后端主力', zone: 'long_term_profile' },
    { action: 'add', content: '正在收敛 ChatEvent', zone: 'current_plan' },
  ]
  const settings = { pending_memory_events: historyEvents, previous_summary: '' }

  const mirror = resolveMirror(settings)
  assert.equal(mirror.zones.long_term_profile, '用户是后端主力')
  assert.equal(mirror.zones.current_plan, '正在收敛 ChatEvent')

  // 本轮再来一次 add —— 修复前，这里会从空 base 重建，把上面两个分区写成空
  const zones = { ...mirror.zones }
  applyEdit(zones, { action: 'add', content: '不接受"我觉得"', zone: 'behavioral_guidelines' })

  assert.equal(zones.long_term_profile, '用户是后端主力', 'long_term_profile 不能被清空')
  assert.equal(zones.current_plan, '正在收敛 ChatEvent', 'current_plan 不能被清空')
  assert.equal(zones.behavioral_guidelines, '不接受"我觉得"')

  // 对照：修复前的算法（只取 previous_summary，忽略事件）会得到什么
  const oldZones = parseXmlZones(settings.previous_summary)
  applyEdit(oldZones, { action: 'add', content: '不接受"我觉得"', zone: 'behavioral_guidelines' })
  assert.equal(oldZones.long_term_profile, '', '旧算法确实会把 ltp 抹成空（事故复现）')
  assert.equal(oldZones.current_plan, '', '旧算法确实会把 cp 抹成空（事故复现）')
})

test('I4：镜像来源缺失时拒绝写入，而不是当成"空镜像"', () => {
  assert.throws(
    () => resolveMirror({}),
    (error) => error.code === MEMORY_MIRROR_MISSING,
  )
  // 只给了无关字段也一样
  assert.throws(
    () => resolveMirror({ base: {}, chatParams: {} }),
    (error) => error.code === MEMORY_MIRROR_MISSING,
  )
})

test('I4：镜像"确实是空的"是合法的（新会话第一次写记忆）', () => {
  const mirror = resolveMirror({ pending_memory_events: [], previous_summary: '' })
  assert.equal(Object.keys(mirror.zones).length, CRYSTAL_TAGS.length)
  for (const tag of CRYSTAL_TAGS) assert.equal(mirror.zones[tag], '')
  assert.equal(mirror.source, 'crystal+events')
})

test('replay 是纯函数：不改动入参，结晶与事件都能单独作为来源', () => {
  const crystal = buildXmlFromZones({
    behavioral_guidelines: '不要并行写同一资源',
    current_plan: '',
    file_architecture_delta: '',
    long_term_profile: '用户是后端主力',
    short_term_goals: '',
    constraints: '',
  })
  const events = [
    { action: 'add', content: '确认了 lease 语义', zone: 'current_plan' },
  ]
  const eventsCopy = JSON.parse(JSON.stringify(events))

  const mirror = resolveMirror({ pending_memory_events: events, previous_summary: crystal })
  assert.deepEqual(events, eventsCopy, 'replay 不得修改事件数组')
  assert.equal(mirror.zones.long_term_profile, '用户是后端主力', '结晶里的内容要保留')
  assert.equal(mirror.zones.current_plan, '确认了 lease 语义', '事件要重放上去')

  // 只有结晶（前端没送事件时）也要能工作
  const crystalOnly = resolveMirror({ previous_summary: crystal })
  assert.equal(crystalOnly.zones.long_term_profile, '用户是后端主力')
  assert.deepEqual(crystalOnly.zones.current_plan, '')

  // 只有事件（结晶为空）也要能工作
  const eventsOnly = resolveMirror({ pending_memory_events: events })
  assert.equal(eventsOnly.zones.current_plan, '确认了 lease 语义')
})

test('replay 容忍历史脏数据：未知 zone / 未知 action / 非对象条目一律跳过', () => {
  const events = [
    null,
    'not-an-object',
    { action: 'read', content: 'x', zone: 'current_plan' },
    { action: 'add', content: '忽略我', zone: 'not_a_real_zone' },
    { action: 'explode', content: '忽略我', zone: 'current_plan' },
    { action: 'add', content: '保留我', zone: 'current_plan' },
  ]
  const zones = replayEvents('', events)
  assert.equal(zones.current_plan, '保留我')
})

test('applyEdit：add 追加 / delete 按行筛 / update 命中替换（含历史宽松行为）', () => {
  const base = () =>
    parseXmlZones(
      buildXmlFromZones({
        behavioral_guidelines: '',
        current_plan: '第一行\n第二行',
        file_architecture_delta: '',
        long_term_profile: '甲',
        short_term_goals: '',
        constraints: '',
      }),
    )

  const added = base()
  applyEdit(added, { action: 'add', content: '乙', zone: 'long_term_profile' })
  assert.equal(added.long_term_profile, '甲\n乙')

  const deleted = base()
  applyEdit(deleted, { action: 'delete', target: '第一行', zone: 'current_plan' })
  assert.equal(deleted.current_plan, '第二行')

  const updated = base()
  applyEdit(updated, { action: 'update', content: '第三行', target: '第二行', zone: 'current_plan' })
  assert.equal(updated.current_plan, '第一行\n第三行')

  // 历史宽松行为：target 未命中 → 追加（必须保留，否则重放不了旧事件）
  const missTarget = base()
  applyEdit(missTarget, { action: 'update', content: '丙', target: '不存在', zone: 'long_term_profile' })
  assert.equal(missTarget.long_term_profile, '甲\n丙')

  // 历史宽松行为：无 target → 整体覆写该分区
  const overwrite = base()
  applyEdit(overwrite, { action: 'update', content: '只留我', zone: 'long_term_profile' })
  assert.equal(overwrite.long_term_profile, '只留我')
  assert.equal(overwrite.current_plan, '第一行\n第二行', '覆写只影响目标分区')
})
