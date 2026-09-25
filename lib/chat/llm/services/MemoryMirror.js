/**
 * lib/chat/llm/services/MemoryMirror.js
 *
 * 记忆镜像：**唯一的读/写对象**。memory tool 永不触碰真结晶。
 *
 * 背景（真实事故，2026-09-24）：
 *   memory tool 的 base 取自 `previous_summary`（= 真结晶），而编辑产生的事件
 *   （`pending_memory_events`）就躺在同一个 settings 对象里没人看。于是 Web 路径
 *   在 `crystals` 表为空时从**空 base** 重建整份 6 分区文档 ——
 *   **任何一次编辑都会把没碰到的分区写成空**（"整库被覆写"）。
 *
 * 目标（详见 tmp/docs/memory-mirror-design.md 的 I1–I6）：
 *   镜像 = replay(结晶, 编辑事件)
 *   - 读：只读镜像
 *   - 写：只写镜像（= 追加一条事件 + 刷新派生预览）
 *   - 真结晶：两次压缩之间不变（保护 prompt cache）；只在压缩时由系统机械回写
 *   - 「镜像缺失」必须与「镜像确实是空的」可区分 —— 前者拒绝写入，后者允许
 */

import {
  CRYSTAL_TAGS,
  parseXmlZones,
} from './CrystallizationUtils.js'

/** 调用方没有提供任何镜像来源时抛出（I4）。 */
export const MEMORY_MIRROR_MISSING = 'memory_mirror_missing'

/**
 * 对一份 zones 文档施加一次编辑。**只动目标 zone**。
 *
 * 语义与 memory tool 原有的三个 action 保持一致（含历史遗留的宽松行为），
 * 因为 replay 必须能重放**已经落库的历史事件** —— 边界校验放在工具那边做，
 * 这里保持全域可重放。
 *
 * @param {Record<string,string>} zones 原地修改
 * @param {{action?:string, zone?:string, content?:string, target?:string}} event
 * @returns {boolean} 是否实际改动了文档
 */
export function applyEdit(zones, event = {}) {
  const { action, zone, content, target } = event
  if (!zone || !CRYSTAL_TAGS.includes(zone)) return false
  if (action === 'read' || !action) return false

  const existing = zones[zone] || ''

  if (action === 'add') {
    if (!content || !String(content).trim()) return false
    const text = String(content).trim()
    zones[zone] = existing ? `${existing}\n${text}` : text
    return true
  }

  if (action === 'delete') {
    if (!target || !String(target).trim()) return false
    const needle = String(target).trim()
    const lines = existing.split('\n')
    const filtered = lines.filter((line) => !line.includes(needle))
    if (filtered.length === lines.length) return false
    zones[zone] = filtered.join('\n')
    return true
  }

  if (action === 'update') {
    if (!content || !String(content).trim()) return false
    const text = String(content).trim()
    if (target && String(target).trim()) {
      const needle = String(target).trim()
      if (existing.includes(needle)) {
        zones[zone] = existing.replace(needle, text)
      } else {
        // 历史遗留行为：找不到匹配目标时 fallback 追加。
        // 保持它，否则无法重放过去落库的同类事件。
        zones[zone] = existing ? `${existing}\n${text}` : text
      }
    } else {
      // 历史遗留行为：未提供 target 时整体覆写该分区。
      zones[zone] = text
    }
    return true
  }

  return false
}

/**
 * 把编辑事件重放到结晶文档上。纯函数，不碰任何存储。
 *
 * @param {string} crystal 真结晶（XML 分区文档；可为空字符串）
 * @param {Array} events   编辑事件数组（形如 { action, content, target, zone }）
 * @returns {Record<string,string>} 6 个分区的当前内容
 */
export function replayEvents(crystal, events) {
  const zones = parseXmlZones(crystal || '')
  for (const event of Array.isArray(events) ? events : []) {
    if (!event || typeof event !== 'object') continue
    applyEdit(zones, event)
  }
  return zones
}

/**
 * 从调用方给的 settings 里解析出当前镜像。
 *
 * @param {object} settings
 * @returns {{ zones: object, crystal: string, events: Array, source: string }}
 * @throws {Error & {code: string}} code = MEMORY_MIRROR_MISSING
 */
export function resolveMirror(settings = {}) {
  const hasCrystalKey = Object.hasOwn(settings, 'previous_summary')
  const hasEventsKey = Object.hasOwn(settings, 'pending_memory_events')

  // I4：既没有结晶也没有事件 = 调用方**根本没接镜像**（不是"镜像为空"）。
  // 后者允许（新会话第一次写记忆），前者必须拒绝 —— 否则就是从空 base 重建整份文档。
  if (!hasCrystalKey && !hasEventsKey) {
    const error = new Error(
      '记忆镜像不存在：调用方既没有提供 previous_summary 也没有 pending_memory_events。' +
        '拒绝写入——以空镜像为 base 重建整份文档会抹掉其余分区。',
    )
    error.code = MEMORY_MIRROR_MISSING
    throw error
  }

  const crystal = typeof settings.previous_summary === 'string' ? settings.previous_summary : ''
  const events = Array.isArray(settings.pending_memory_events)
    ? settings.pending_memory_events
    : []

  return {
    crystal,
    events,
    source: hasCrystalKey && hasEventsKey ? 'crystal+events' : hasCrystalKey ? 'crystal' : 'events',
    zones: replayEvents(crystal, events),
  }
}

/**
 * 判断一份 settings 是否具备镜像来源（不做抛错的轻量版，供调用方提前决策）。
 */
export function hasMirrorSource(settings = {}) {
  return (
    Object.hasOwn(settings, 'previous_summary') ||
    Object.hasOwn(settings, 'pending_memory_events')
  )
}

export default { applyEdit, hasMirrorSource, replayEvents, resolveMirror }
