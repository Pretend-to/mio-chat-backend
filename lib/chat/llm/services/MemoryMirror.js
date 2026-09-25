/**
 * lib/chat/llm/services/MemoryMirror.js
 *
 * 记忆镜像：**唯一的读/写对象**。memory tool 永不触碰真结晶。
 *
 * 契约（明确，不容商量）：
 *   1. 镜像 = replay(结晶, 编辑事件)。结晶来自 `previous_summary`，事件来自
 *      `pending_memory_events`；两者都必须由调用方提供（可以是空串/空数组）。
 *   2. tool 只读镜像、只写镜像；真结晶只在压缩时由压缩流程机械回写。
 *   3. 编辑事件的契约：
 *      - `{ action:'add',    zone, content }`              target 忽略
 *      - `{ action:'update', zone, target, content }`     两者都必须非空
 *      - `{ action:'delete', zone, target }`               target 必须非空
 *      - `zone` 必须是 6 个结晶分区之一
 *      **不符合契约一律抛错**（带 code），不宽松解析、不 fallback、不静默跳过。
 *
 * 背景（真实事故，2026-09-24）：
 *   旧实现把 base 取成 `previous_summary`（= 真结晶），而编辑事件就在同一个
 *   settings 里没人看。Web 路径结晶为空时 → 从空 base 重建整份 6 分区文档 →
 *   **任何一次编辑都会把没碰到的分区写成空**（"整库被覆写"）。
 *
 * 设计取舍：宁可报错，不要猜。每个违反契约的输入都说明调用方与契约不一致，
 * 静默容忍只会把问题推迟到更难查的地方（"两个地方对同一件事给出不同答案"）。
 */

import { CRYSTAL_TAGS, parseXmlZones } from './CrystallizationUtils.js'

/** 调用方没有提供任何镜像来源（I4：这是"缺失"，不是"空"）。 */
export const MEMORY_MIRROR_MISSING = 'memory_mirror_missing'

/** 编辑事件违反契约。 */
export const MEMORY_EVENT_INVALID = 'memory_event_invalid'

function contractError(message) {
  const error = new Error(`记忆编辑事件违反契约：${message}`)
  error.code = MEMORY_EVENT_INVALID
  return error
}

/**
 * 校验一条编辑事件。不符合契约就抛错 —— 这是唯一的处理方式。
 *
 * @param {object} event
 * @throws {Error & {code: string}}
 */
export function assertValidEvent(event) {
  if (!event || typeof event !== 'object') {
    throw contractError(`事件必须是对象，收到 ${event === null ? 'null' : typeof event}`)
  }
  const { action, content, target, zone } = event

  if (!CRYSTAL_TAGS.includes(zone)) {
    throw contractError(
      `zone 必须是 ${CRYSTAL_TAGS.join(' / ')} 之一，收到 ${JSON.stringify(zone)}`,
    )
  }
  if (action !== 'add' && action !== 'update' && action !== 'delete') {
    throw contractError(`action 必须是 add / update / delete 之一，收到 ${JSON.stringify(action)}`)
  }

  const hasContent = typeof content === 'string' && content.trim() !== ''
  const hasTarget = typeof target === 'string' && target.trim() !== ''

  if (action === 'add' && !hasContent) {
    throw contractError('add 必须提供非空 content')
  }
  if (action === 'update' && !(hasContent && hasTarget)) {
    throw contractError('update 必须同时提供非空 target 与 content')
  }
  if (action === 'delete' && !hasTarget) {
    throw contractError('delete 必须提供非空 target')
  }
}

/**
 * 对一份 zones 文档施加一次编辑。**只动目标 zone**。
 *
 * 写路径与重放路径共用这一份实现，保证「写进去的」与「重放出来的」永远一致。
 *
 * @param {Record<string,string>} zones 原地修改
 * @param {object} event 编辑事件（必须符合契约）
 */
export function applyEdit(zones, event) {
  assertValidEvent(event)

  const { action, content, target, zone } = event
  const existing = zones[zone] || ''
  const needle = typeof target === 'string' ? target.trim() : ''

  if (action === 'add') {
    const text = content.trim()
    zones[zone] = existing ? `${existing}\n${text}` : text
    return
  }

  if (action === 'delete') {
    const lines = existing.split('\n')
    if (!lines.some((line) => line.includes(needle))) {
      throw contractError(`delete: 目标不存在于 ${zone}：${needle.slice(0, 60)}`)
    }
    zones[zone] = lines.filter((line) => !line.includes(needle)).join('\n')
    return
  }

  // update
  if (!existing.includes(needle)) {
    throw contractError(`update: 目标不存在于 ${zone}：${needle.slice(0, 60)}`)
  }
  zones[zone] = existing.replace(needle, content.trim())
}

/**
 * 把编辑事件重放到结晶文档上。纯函数，不碰任何存储。
 *
 * @param {string} crystal 真结晶（XML 分区文档；可为空字符串）
 * @param {Array} events   编辑事件数组
 * @returns {Record<string,string>} 6 个分区的当前内容
 */
export function replayEvents(crystal, events) {
  const zones = parseXmlZones(crystal || '')
  const list = Array.isArray(events) ? events : []
  for (let index = 0; index < list.length; index += 1) {
    try {
      applyEdit(zones, list[index])
    } catch (error) {
      error.message = `${error.message}（第 ${index} 条事件）`
      throw error
    }
  }
  return zones
}

/**
 * 从调用方给的 settings 里解析出当前镜像。
 *
 * @param {object} settings 必须同时提供 `previous_summary` 与 `pending_memory_events`
 * @returns {{ zones: object, crystal: string, events: Array }}
 * @throws {Error & {code: string}} MEMORY_MIRROR_MISSING | MEMORY_EVENT_INVALID
 */
export function resolveMirror(settings = {}) {
  const hasCrystal = Object.hasOwn(settings, 'previous_summary')
  const hasEvents = Object.hasOwn(settings, 'pending_memory_events')

  // I4：两者都没有 = 调用方**根本没接镜像**（不是"镜像为空"）。
  // 后者允许（新会话第一次写记忆），前者必须拒绝——否则就是从空 base 重建整份文档。
  if (!hasCrystal || !hasEvents) {
    const missing = [!hasCrystal && 'previous_summary', !hasEvents && 'pending_memory_events']
      .filter(Boolean)
      .join(' 与 ')
    const error = new Error(
      `记忆镜像不完整：缺少 ${missing}。拒绝写入——以不完整的镜像为 base 会抹掉其余分区。`,
    )
    error.code = MEMORY_MIRROR_MISSING
    throw error
  }

  const crystal = typeof settings.previous_summary === 'string' ? settings.previous_summary : ''
  if (typeof settings.previous_summary !== 'string') {
    const error = new Error('记忆镜像不完整：previous_summary 必须是字符串')
    error.code = MEMORY_MIRROR_MISSING
    throw error
  }
  if (!Array.isArray(settings.pending_memory_events)) {
    const error = new Error('记忆镜像不完整：pending_memory_events 必须是数组')
    error.code = MEMORY_MIRROR_MISSING
    throw error
  }

  return {
    crystal,
    events: settings.pending_memory_events,
    zones: replayEvents(crystal, settings.pending_memory_events),
  }
}

export default { applyEdit, assertValidEvent, replayEvents, resolveMirror }
