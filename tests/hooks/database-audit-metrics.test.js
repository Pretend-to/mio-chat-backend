import assert from 'node:assert/strict'
import test from 'node:test'

import { calculatePerformanceMetrics } from '../../lib/hooks/builtins/DatabaseAuditHook.js'

test('审计吞吐按完整请求耗时计算，不使用首响应到结束的极短区间', () => {
  const metrics = calculatePerformanceMetrics({
    candidates: 3,
    endTime: 7148,
    firstTokenTime: 7146,
    startTime: 1000,
  })

  assert.equal(metrics.latency, 6148)
  assert.equal(metrics.ttft, 6146)
  assert.ok(Math.abs(metrics.tps - 0.4879635654) < 0.000001)
})

test('没有首响应时间时仍可计算端到端输出吞吐', () => {
  const metrics = calculatePerformanceMetrics({
    candidates: 100,
    endTime: 3000,
    startTime: 1000,
  })

  assert.equal(metrics.ttft, null)
  assert.equal(metrics.tps, 50)
})
