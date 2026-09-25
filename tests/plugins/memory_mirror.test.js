/**
 * 记忆镜像：契约测试。
 *
 * 第一个用例是 2026-09-24 那场事故的回归锚点：**结晶为空、记忆内容全在编辑事件里**
 * （Web 路径的真实形态），此时任何一次编辑都不能抹掉其它分区。
 *
 * 其余用例把**契约本身**钉死：符合契约的行为、不符合契约时必须抛错（不宽松、
 * 不 fallback、不静默跳过）。
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  MEMORY_EVENT_INVALID,
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

const emptyZones = (overrides = {}) =>
  parseXmlZones(buildXmlFromZones({ ...Object.fromEntries(CRYSTAL_TAGS.map((t) => [t, ''])), ...overrides }))

test('回归锚点：结晶为空、内容全在事件里时，单次编辑不得抹掉其它分区', () => {
  // 前两轮编辑已经落在缓冲里（Web 路径：真结晶还是空的）
  const settings = {
    pending_memory_events: [
      { action: 'add', content: '用户是后端主力', target: '', zone: 'long_term_profile' },
      { action: 'add', content: '正在收敛 ChatEvent', target: '', zone: 'current_plan' },
    ],
    previous_summary: '',
  }

  const mirror = resolveMirror(settings)
  assert.equal(mirror.zones.long_term_profile, '用户是后端主力')
  assert.equal(mirror.zones.current_plan, '正在收敛 ChatEvent')

  const zones = { ...mirror.zones }
  applyEdit(zones, { action: 'add', content: '不接受"我觉得"', target: '', zone: 'behavioral_guidelines' })

  assert.equal(zones.long_term_profile, '用户是后端主力', 'long_term_profile 不能被清空')
  assert.equal(zones.current_plan, '正在收敛 ChatEvent', 'current_plan 不能被清空')
  assert.equal(zones.behavioral_guidelines, '不接受"我觉得"')

  // 对照：旧算法（只取 previous_summary、忽略事件）确实会把它们抹成空 —— 事故复现
  const oldZones = parseXmlZones(settings.previous_summary)
  applyEdit(oldZones, { action: 'add', content: '不接受"我觉得"', target: '', zone: 'behavioral_guidelines' })
  assert.equal(oldZones.long_term_profile, '')
  assert.equal(oldZones.current_plan, '')
})

test('真实历史数据可重放：DB 里那 10 行的形态（add/delete/update）全部合规', () => {
  // 形态取自 data/app.db 的 pending_memories（2026-09-25 实测）：
  //   add    → content 非空、target 为空串
  //   delete → target 非空（39/46 字符）、content 为空串
  //   update → target 与 content 都非空（46 / 1577 字符）
  const A = 'A'.repeat(379)
  const B = 'B'.repeat(1128)
  const C = 'C'.repeat(1051)
  const D = 'D'.repeat(1577)
  const zones = replayEvents('', [
    { action: 'add', content: A, target: '', zone: 'long_term_profile' },
    // 真实用法里 target 是【一整行】，所以这里把内容造成多行
    { action: 'add', content: `${B}\n待删除行`, target: '', zone: 'current_plan' },
    { action: 'delete', content: '', target: '待删除行', zone: 'current_plan' },
    { action: 'add', content: C, target: '', zone: 'current_plan' },
    { action: 'update', content: D, target: C, zone: 'current_plan' },
  ])
  assert.equal(zones.long_term_profile, A, 'add 累加进 long_term_profile')
  assert.equal(
    zones.current_plan,
    `${B}\n${D}`,
    'B 保留、待删除行被删掉、C 整行被 D 替换',
  )
})

test('契约：update 必须同时有非空 target 与 content', () => {
  assert.throws(
    () => applyEdit(emptyZones(), { action: 'update', content: '新内容', target: '', zone: 'current_plan' }),
    (e) => e.code === MEMORY_EVENT_INVALID && /update 必须同时提供/.test(e.message),
  )
  assert.throws(
    () => applyEdit(emptyZones(), { action: 'update', content: '', target: '旧内容', zone: 'current_plan' }),
    (e) => e.code === MEMORY_EVENT_INVALID,
  )
})

test('契约：delete 必须有非空 target；add 必须有非空 content', () => {
  assert.throws(
    () => applyEdit(emptyZones(), { action: 'delete', target: '', zone: 'current_plan' }),
    (e) => e.code === MEMORY_EVENT_INVALID && /delete 必须提供非空 target/.test(e.message),
  )
  assert.throws(
    () => applyEdit(emptyZones(), { action: 'add', content: '   ', zone: 'current_plan' }),
    (e) => e.code === MEMORY_EVENT_INVALID && /add 必须提供非空 content/.test(e.message),
  )
})

test('契约：未知 zone / 未知 action / 非对象 一律抛错，不得静默跳过', () => {
  const cases = [
    { action: 'add', content: 'x', zone: 'not_a_zone' },
    { action: 'explode', content: 'x', zone: 'current_plan' },
    { action: 'read', content: 'x', zone: 'current_plan' },
    null,
    'not-an-object',
    undefined,
  ]
  for (const event of cases) {
    assert.throws(
      () => applyEdit(emptyZones(), event),
      (e) => e.code === MEMORY_EVENT_INVALID,
      `应抛契约错误：${JSON.stringify(event)}`,
    )
  }
})

test('契约：target 不存在时抛错，不得 fallback 追加、不得整体覆写分区', () => {
  const zones = emptyZones({ current_plan: '第一行\n第二行' })
  assert.throws(
    () => applyEdit(zones, { action: 'update', content: '新', target: '不存在', zone: 'current_plan' }),
    (e) => e.code === MEMORY_EVENT_INVALID && /目标不存在于 current_plan/.test(e.message),
  )
  assert.throws(
    () => applyEdit(zones, { action: 'delete', target: '不存在', zone: 'current_plan' }),
    (e) => e.code === MEMORY_EVENT_INVALID && /目标不存在于 current_plan/.test(e.message),
  )
  assert.equal(zones.current_plan, '第一行\n第二行', '抛错时不得改动文档')
})

test('契约：I4 —— 镜像来源缺失时拒绝，而不是当成"空镜像"', () => {
  assert.throws(() => resolveMirror({}), (e) => e.code === MEMORY_MIRROR_MISSING)
  assert.throws(() => resolveMirror({ base: {}, chatParams: {} }), (e) => e.code === MEMORY_MIRROR_MISSING)
  // 两个字段缺一不可
  assert.throws(
    () => resolveMirror({ previous_summary: '<current_plan>\nx\n</current_plan>' }),
    (e) => e.code === MEMORY_MIRROR_MISSING,
  )
  assert.throws(
    () => resolveMirror({ pending_memory_events: [] }),
    (e) => e.code === MEMORY_MIRROR_MISSING,
  )
  // 类型不对也是契约违反
  assert.throws(() => resolveMirror({ pending_memory_events: [], previous_summary: null }), (e) => e.code === MEMORY_MIRROR_MISSING)
  assert.throws(() => resolveMirror({ pending_memory_events: {}, previous_summary: '' }), (e) => e.code === MEMORY_MIRROR_MISSING)
})

test('契约：镜像"确实是空的"是合法的（新会话第一次写记忆）', () => {
  const mirror = resolveMirror({ pending_memory_events: [], previous_summary: '' })
  assert.equal(Object.keys(mirror.zones).length, CRYSTAL_TAGS.length)
  for (const tag of CRYSTAL_TAGS) assert.equal(mirror.zones[tag], '')
})

test('replay 是纯函数：不改动入参；结晶与事件叠加结果稳定', () => {
  const crystal = buildXmlFromZones({
    behavioral_guidelines: '不要并行写同一资源',
    current_plan: '',
    file_architecture_delta: '',
    long_term_profile: '用户是后端主力',
    short_term_goals: '',
    constraints: '',
  })
  const events = [{ action: 'add', content: '确认了 lease 语义', target: '', zone: 'current_plan' }]
  const snapshot = JSON.stringify(events)

  const mirror = resolveMirror({ pending_memory_events: events, previous_summary: crystal })
  assert.equal(JSON.stringify(events), snapshot, 'replay 不得修改事件数组')
  assert.equal(mirror.zones.long_term_profile, '用户是后端主力', '结晶内容保留')
  assert.equal(mirror.zones.current_plan, '确认了 lease 语义', '事件重放上去')

  // 顺序敏感：先 add 再 delete 与反过来结果不同，重放必须按顺序
  const ordered = resolveMirror({
    pending_memory_events: [
      { action: 'add', content: '待删内容', target: '', zone: 'constraints' },
      { action: 'delete', target: '待删内容', zone: 'constraints' },
    ],
    previous_summary: '',
  })
  assert.equal(ordered.zones.constraints, '')
})

test('update 命中时替换、只动目标分区', () => {
  const zones = emptyZones({ constraints: '甲\n乙', current_plan: '不要动我' })
  applyEdit(zones, { action: 'update', content: '丙', target: '乙', zone: 'constraints' })
  assert.equal(zones.constraints, '甲\n丙')
  assert.equal(zones.current_plan, '不要动我')
})
