import {
  Cn as e,
  Dn as a,
  Hn as s,
  Jn as t,
  Mn as l,
  Nn as n,
  Pn as o,
  Tn as i,
  Xn as r,
  Yn as c,
  Zn as d,
  bn as u,
  cn as p,
  fn as v,
  i as m,
  in as f,
  kn as h,
  ln as k,
  on as b,
  pn as g,
  rn as w,
  sn as T,
  tn as y,
  un as x,
  wn as C,
} from './vendor_element_plus-C50nGDP8.js'
import { D as S, J as I, N as _, rt as M } from './components-B1PNFfUD.js'
import { Kn as D, qn as $ } from './vendor_misc-1x0aym02.js'
import { i as H } from './vendor_vue-Dv8aZs6n.js'
var R = M('dashboard', () => {
    const e = s('overview'),
      a = s('24h'),
      t = s(''),
      l = s(!1),
      n = s(!1),
      o = s(null),
      i = s('ttft'),
      r = s({
        connections: 0,
        users: 0,
        pending: 0,
        totalTokens: 0,
        promptTokens: 0,
        compTokens: 0,
      }),
      c = s(null),
      d = s('All'),
      u = s('All'),
      p = s([]),
      v = s([]),
      f = s([]),
      h = s([]),
      k = s(null),
      g = s([]),
      w = s('USD'),
      T = s({
        provider: '',
        inputPrice: 0.15,
        outputPrice: 0.6,
        cachePrice: 0.075,
      }),
      y = b(() => c.value?.modelDistribution || []),
      x = y,
      C = b(() => r.value.totalTokens || 0),
      S = b(() =>
        y.value
          .reduce((e, a) => {
            const s = a.adapterName || a.provider || '历史未识别实例'
            let t = e.find((e) => e.name === s)
            ;(t ||
              ((t = {
                name: s,
                hitTokens: 0,
                missTokens: 0,
                calls: 0,
                promptTokens: 0,
                compTokens: 0,
                totalTokens: 0,
              }),
              e.push(t)),
              (t.calls += a.callCount || 0),
              (t.promptTokens += a.promptTokens || 0),
              (t.compTokens += a.candidatesTokens || 0),
              (t.hitTokens += a.cacheHitTokens || 0),
              (t.missTokens += Math.max(
                0,
                (a.promptTokens || 0) - (a.cacheHitTokens || 0),
              )),
              (t.totalTokens +=
                a.totalTokens ||
                (a.promptTokens || 0) + (a.candidatesTokens || 0)))
            const l = t.promptTokens
            return (
              (t.cacheHitRate =
                l > 0 ? Math.round((t.hitTokens / l) * 100) : 0),
              e
            )
          }, [])
          .sort((e, a) => {
            const s =
              e.totalTokens || (e.promptTokens || 0) + (e.compTokens || 0)
            return (
              (a.totalTokens || (a.promptTokens || 0) + (a.compTokens || 0)) - s
            )
          }),
      ),
      _ = b(() => {
        const e = y.value.reduce((e, a) => {
          const s = a.adapterName || a.provider || '历史未识别实例'
          return ((e[s] = (e[s] || 0) + (a.totalTokens || 0)), e)
        }, {})
        return Object.entries(e)
          .map(([e, a]) => ({ name: e, totalTokens: a }))
          .sort((e, a) => a.totalTokens - e.totalTokens)
      }),
      M = b(() => S.value.map((e) => e.name)),
      D = b(() =>
        [...p.value].sort((e, a) => a.tokens - e.tokens).slice(0, 10),
      ),
      $ = b(() => [...p.value].sort((e, a) => a.calls - e.calls).slice(0, 10)),
      H = b(() => {
        const e = S.value.find((e) => e.name === T.value.provider)
        return e
          ? (e.promptTokens / 1e6) * T.value.inputPrice +
              (e.compTokens / 1e6) * T.value.outputPrice +
              (e.hitTokens / 1e6) * T.value.cachePrice
          : 0
      }),
      R = s(!1),
      L = s(!1),
      A = s(!1),
      z = s(!1)
    let U = 0,
      N = 0,
      E = 0,
      O = 0,
      V = !1
    async function q() {
      const e = ++U
      R.value = !0
      try {
        const s =
            u.value && 'All' !== u.value
              ? `&userId=${encodeURIComponent(u.value)}`
              : '',
          t = await I.request(`/api/admin/dashboard/stats?range=${a.value}${s}`)
        if (e !== U) return
        if (t.success) {
          const e = t.data
          ;((c.value = e),
            (r.value.totalTokens = e.summary.totalTokens),
            (r.value.promptTokens = e.summary.promptTokens),
            (r.value.compTokens = e.summary.candidatesTokens),
            !T.value.provider &&
              S.value.length > 0 &&
              (T.value.provider = S.value[0].name),
            (p.value = (e.userRanking || []).map((e) => ({
              channelId: e.channelId,
              channelName: e.channelName,
              channelType: e.channelType,
              userId: e.userId,
              rawUserId: e.rawUserId || e.userId,
              calls: e.callCount,
              sourceType: e.sourceType,
              tokens: e.totalTokens,
              promptTokens: e.promptTokens || 0,
              candidatesTokens: e.candidatesTokens || 0,
              cacheHitTokens: e.cacheHitTokens || 0,
              avgTokensPerCall: Math.round(
                (e.totalTokens || 0) / Math.max(e.callCount || 1, 1),
              ),
            }))),
            (v.value = (e.sessionRanking || []).map((e) => ({
              ...e,
              calls: e.callCount,
              tokens: e.totalTokens,
            }))),
            (f.value = e.sourceDistribution || []))
        }
      } catch (s) {
        e === U && m.error('无法连接服务或管理员验证失败')
      } finally {
        e === U && (R.value = !1)
      }
    }
    async function F() {
      const e = ++O
      z.value = !0
      try {
        const a = await I.request(
          '/api/admin/dashboard/failures?limit=50&offset=0',
        )
        if (e !== O) return
        a.success && (g.value = a.data.logs)
      } catch (a) {
      } finally {
        e === O && (z.value = !1)
      }
    }
    async function P(e = '') {
      const a = ++N
      L.value = !0
      try {
        const s = e
            ? `/api/admin/dashboard/turns?limit=50&offset=0&search=${encodeURIComponent(e)}`
            : '/api/admin/dashboard/turns?limit=50&offset=0',
          t = await I.request(s)
        if (a !== N) return
        if (t.success)
          if (
            ((h.value = t.data.turns.map((e) => ({
              requestId: e.requestId,
              user: e.userId,
              userIp: e.userIp || '未知',
              sourceType: e.sourceType,
              sourceLabel: e.sourceLabel,
              channelId: e.channelId,
              channelName: e.channelName,
              channelType: e.channelType,
              contactorId: e.contactorId,
              sessionId: e.sessionId,
              sessionTitle: e.sessionTitle,
              createdAt: e.createdAt,
              totalTokens: e.totalTokens,
              stepsCount: e.stepsCount,
              steps: [],
            }))),
            'undefined' != typeof window && window.innerWidth < 900)
          )
            k.value = null
          else if (h.value.length > 0) {
            const e = h.value.find((e) => e.requestId === k.value?.requestId)
            W(e || h.value[0])
          } else k.value = null
      } catch (s) {
      } finally {
        a === N && (L.value = !1)
      }
    }
    async function W(e) {
      if (!e) return void (k.value = null)
      k.value = e
      const a = ++E
      A.value = !0
      try {
        const s = await I.request(`/api/admin/dashboard/trace/${e.requestId}`)
        if (a !== E) return
        s.success &&
          k.value &&
          k.value.requestId === e.requestId &&
          (k.value.steps = s.data.steps)
      } catch (s) {
        a === E && m.error('获取调用链 Trace 失败')
      } finally {
        a === E && (A.value = !1)
      }
    }
    return {
      activeTab: e,
      timeRange: a,
      currentTime: t,
      showCostModal: l,
      showTraceModal: n,
      activeTrace: o,
      slaMetric: i,
      stats: r,
      historicalData: c,
      selectedProvider: d,
      selectedUser: u,
      userRankings: p,
      sessionRankings: v,
      sourceDistribution: f,
      toolCallTurns: h,
      activeTurn: k,
      failures: g,
      costCalc: T,
      currency: w,
      loadingOverview: R,
      loadingTurns: L,
      loadingTrace: A,
      loadingFailures: z,
      modelDistribution: y,
      rawModelDistribution: x,
      providerStats: S,
      groupedProviders: _,
      totalAllTokens: C,
      providers: M,
      tokenTopUsers: D,
      callsTopUsers: $,
      calculatedCost: H,
      fetchRealtimeStats: async function () {
        if (!V) {
          V = !0
          try {
            const e = await I.request('/api/admin/dashboard/realtime')
            e.success &&
              ((r.value.connections = e.data.onlineConnections),
              (r.value.users = e.data.onlineUsers),
              (r.value.pending = e.data.pendingRequests))
          } catch (e) {
          } finally {
            V = !1
          }
        }
      },
      fetchHistoricalStats: q,
      fetchFailures: F,
      fetchTurns: P,
      fetchUserDetail: async function (e) {
        try {
          const a = await I.request(
            `/api/admin/dashboard/user/${encodeURIComponent(e)}`,
          )
          if (a.success) return a.data
        } catch (a) {
          m.error('获取用户画像详情失败')
        }
        return null
      },
      selectTurn: W,
      setSelectedUser: function (e) {
        return ((u.value = e || 'All'), q())
      },
      refreshData: function () {
        ;(q(), F(), P())
      },
    }
  }),
  L = { class: 'overview-container' },
  A = { class: 'stats-grid' },
  z = { class: 'stat-card' },
  U = { class: 'stat-card connections' },
  N = { class: 'stat-info' },
  E = { class: 'stat-value text-green' },
  O = { class: 'stat-card' },
  V = { class: 'stat-card active-users' },
  q = { class: 'stat-info' },
  F = { class: 'stat-value text-blue' },
  P = { class: 'stat-card' },
  W = { class: 'stat-card pending-reqs' },
  B = { class: 'stat-info' },
  j = { class: 'stat-value text-amber' },
  J = { class: 'stat-card' },
  Y = { class: 'stat-card token-metrics' },
  Z = { class: 'stat-info' },
  G = { class: 'stat-value text-indigo' },
  K = { class: 'stat-sub' },
  X = { class: 'charts-row' },
  Q = { class: 'chart-card-col col-6' },
  ee = { class: 'saas-card' },
  ae = { class: 'card-header' },
  se = { class: 'card-body' },
  te = { class: 'chart-card-col col-6' },
  le = { class: 'saas-card' },
  ne = { class: 'card-body' },
  oe = { class: 'saas-card mt-lg' },
  ie = { class: 'card-body p-none' },
  re = { class: 'table-responsive-wrapper' },
  ce = ['title'],
  de = ['title'],
  ue = ['title'],
  pe = {
    __name: 'DashboardOverview',
    setup(a) {
      const s = R()
      let m = null,
        f = null,
        b = null
      function w(e) {
        if (!e && 0 !== e) return '0'
        const a = Number(e)
        return isNaN(a) || 0 === a
          ? '0'
          : a >= 1e9
            ? (a / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'b'
            : a >= 1e6
              ? (a / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'm'
              : a >= 1e3
                ? (a / 1e3).toFixed(1).replace(/\.?0+$/, '') + 'k'
                : a.toString()
      }
      function S(e) {
        return e || 0 === e
          ? e.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
          : '0'
      }
      function I() {
        const e = document.getElementById('sla-chart'),
          a = document.getElementById('trend-chart')
        ;(e &&
          e.clientWidth > 0 &&
          e.clientHeight > 0 &&
          ((m && !m.isDisposed()) || (m = D(e))),
          a &&
            a.clientWidth > 0 &&
            a.clientHeight > 0 &&
            ((f && !f.isDisposed()) || (f = D(a))))
      }
      function _() {
        if (!s.historicalData) return
        I()
        const e = (function () {
          const e =
            'undefined' != typeof document &&
            ('dark' === document.documentElement.getAttribute('data-theme') ||
              document.documentElement.classList.contains('dark'))
          return {
            isDark: e,
            backgroundColor: 'transparent',
            textStyle: {
              color: e ? '#94a3b8' : '#64748b',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
            },
            grid: {
              left: '3%',
              right: '4%',
              bottom: '3%',
              containLabel: !0,
              borderColor: e ? '#334155' : '#f1f5f9',
            },
            tooltip: {
              appendTo: 'body',
              backgroundColor: e ? '#1e293b' : '#ffffff',
              borderColor: e ? '#334155' : '#e2e8f0',
              borderWidth: 1,
              textStyle: {
                color: e ? '#f8fafc' : '#0f172a',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              },
              borderRadius: 8,
              confine: !1,
              extraCssText: 'z-index: 10000;',
              renderMode: 'html',
              boxShadow: e
                ? '0 4px 12px rgba(0, 0, 0, 0.4)'
                : '0 4px 12px rgba(0, 0, 0, 0.05)',
            },
          }
        })()
        if (m) {
          const a = (s.historicalData.modelDistribution || [])
            .filter((e) => e.callCount > 0)
            .sort((e, a) => a.callCount - e.callCount)
          if ('ttft' === s.slaMetric) {
            const s = a
                .map((e) => {
                  const a = e.performanceCalls ?? e.callCount ?? 0,
                    s =
                      e.avgPromptTokens ??
                      Math.round((e.promptTokens || 0) / Math.max(a, 1)),
                    t =
                      e.avgUncachedInputTokens ??
                      Math.round(
                        Math.max(
                          0,
                          (e.promptTokens || 0) - (e.cacheHitTokens || 0),
                        ) / Math.max(a, 1),
                      ),
                    l =
                      e.performanceCacheHitRate ??
                      ((e.promptTokens || 0) > 0
                        ? Math.round(
                            ((e.cacheHitTokens || 0) / e.promptTokens) * 100,
                          )
                        : 0)
                  return {
                    name: `[${e.adapterName || e.provider}] ${e.model}`,
                    value: [
                      Math.max(1, t),
                      Number(e.avgTtft || 0),
                      a,
                      s,
                      Math.min(100, l),
                    ],
                  }
                })
                .filter((e) => e.value[1] > 0 && e.value[2] > 0),
              t = s.map((e) => e.value[0]),
              l = Math.min(...t),
              n = Math.max(...t),
              o = s.length > 1 && l > 0 && n / l >= 10
            m.setOption(
              {
                backgroundColor: e.backgroundColor,
                textStyle: e.textStyle,
                grid: { ...e.grid, bottom: 62, containLabel: !0 },
                graphic:
                  s.length > 0
                    ? []
                    : [
                        {
                          type: 'text',
                          left: 'center',
                          top: 'middle',
                          style: {
                            text: '暂无可用的 TTFT 样本',
                            fill: e.isDark ? '#94a3b8' : '#64748b',
                            fontSize: 13,
                          },
                        },
                      ],
                tooltip: {
                  ...e.tooltip,
                  trigger: 'item',
                  formatter: ({ data: e }) => {
                    const [a, s, t, l, n] = e.value
                    return `<strong>${
                      ((o = e.name),
                      String(o ?? '')
                        .replaceAll('&', '&amp;')
                        .replaceAll('<', '&lt;')
                        .replaceAll('>', '&gt;')
                        .replaceAll('"', '&quot;')
                        .replaceAll("'", '&#039;'))
                    }</strong><br/>平均输入：${S(l)} Token<br/>平均未缓存输入：${S(a)} Token<br/>平均首响应：${S(s)} ms<br/>缓存命中率：${n}%<br/>成功调用：${S(t)}`
                    var o
                  },
                },
                xAxis: {
                  type: o ? 'log' : 'value',
                  ...(o ? { logBase: 10 } : { min: 0 }),
                  name: '平均未缓存输入 Token' + (o ? '（对数轴）' : ''),
                  nameLocation: 'middle',
                  nameGap: 42,
                  axisLabel: { formatter: (e) => w(e) },
                  splitLine: {
                    lineStyle: { color: e.isDark ? '#334155' : '#f1f5f9' },
                  },
                },
                yAxis: {
                  type: 'value',
                  name: '平均首响应延迟 (ms)',
                  axisLabel: { formatter: (e) => w(e) },
                  splitLine: {
                    lineStyle: { color: e.isDark ? '#334155' : '#f1f5f9' },
                  },
                },
                series: [
                  {
                    name: '上下文规模 / 首响应延迟',
                    type: 'scatter',
                    data: s,
                    symbolSize: (e) =>
                      Math.min(34, Math.max(10, 8 + 2 * Math.sqrt(e[2] || 1))),
                    itemStyle: { color: '#3b82f6', opacity: 0.78 },
                    emphasis: { focus: 'self', scale: 1.15 },
                  },
                ],
              },
              !0,
            )
          } else {
            const s = a.map(
                (e) => `[${e.adapterName || e.provider}] ${e.model}`,
              ),
              t = a.map((e) => e.avgTps || 0),
              l = s.length > 7
            m.setOption(
              {
                backgroundColor: e.backgroundColor,
                textStyle: e.textStyle,
                grid: {
                  ...e.grid,
                  bottom: l ? '24%' : '14%',
                  containLabel: !0,
                },
                tooltip: {
                  ...e.tooltip,
                  trigger: 'axis',
                  axisPointer: { type: 'shadow' },
                },
                xAxis: {
                  type: 'category',
                  data: s,
                  axisLine: {
                    lineStyle: { color: e.isDark ? '#475569' : '#cbd5e1' },
                  },
                  axisLabel: {
                    interval: 0,
                    rotate: 30,
                    fontSize: 10,
                    color: e.isDark ? '#94a3b8' : '#64748b',
                    formatter: function (e) {
                      return e.length > 25 ? e.substring(0, 22) + '...' : e
                    },
                  },
                },
                yAxis: {
                  type: 'value',
                  name: '输出 Token / 请求秒数',
                  splitLine: {
                    lineStyle: { color: e.isDark ? '#334155' : '#f1f5f9' },
                  },
                  axisLine: {
                    lineStyle: { color: e.isDark ? '#475569' : '#cbd5e1' },
                  },
                },
                dataZoom: l
                  ? [
                      {
                        type: 'slider',
                        show: !0,
                        startValue: 0,
                        endValue: 6,
                        height: 8,
                        bottom: 5,
                        borderColor: 'transparent',
                        backgroundColor: e.isDark ? '#1e293b' : '#f1f5f9',
                        fillerColor: e.isDark ? '#475569' : '#cbd5e1',
                        handleSize: 0,
                        showDetail: !1,
                        moveHandleSize: 0,
                      },
                      {
                        type: 'inside',
                        startValue: 0,
                        endValue: 6,
                        zoomOnMouseWheel: !1,
                        moveOnMouseMove: !0,
                        moveOnMouseWheel: !0,
                      },
                    ]
                  : [],
                series: [
                  {
                    name: '端到端吞吐',
                    type: 'bar',
                    barWidth: '35%',
                    data: t,
                    itemStyle: {
                      color: new $(0, 0, 0, 1, [
                        { offset: 0, color: '#3b82f6' },
                        { offset: 1, color: '#2563eb' },
                      ]),
                      borderRadius: [4, 4, 0, 0],
                    },
                  },
                ],
              },
              !0,
            )
          }
        }
        if (f) {
          const a = s.historicalData.trends || [],
            t = {}
          a.forEach((e) => {
            const a = e.timeBucket || '未知'
            ;(t[a] || (t[a] = { calls: 0, tokens: 0 }),
              (t[a].calls += e.callCount || 0),
              (t[a].tokens += e.tokenCount || 0))
          })
          const l = Object.keys(t).map((e) =>
              e.length > 10 ? e.substring(5, 16) : e.substring(5),
            ),
            n = Object.values(t).map((e) => e.calls),
            o = Object.values(t).map((e) => e.tokens)
          f.setOption(
            {
              backgroundColor: e.backgroundColor,
              textStyle: e.textStyle,
              tooltip: { ...e.tooltip, trigger: 'axis' },
              legend: {
                data: ['调用频次 (次)', 'Token 消耗 (Tokens)'],
                textStyle: { color: e.isDark ? '#cbd5e1' : '#475569' },
                top: 0,
                right: 10,
              },
              grid: { ...e.grid, bottom: '14%', containLabel: !0 },
              xAxis: {
                type: 'category',
                data: l,
                axisLine: {
                  lineStyle: { color: e.isDark ? '#475569' : '#cbd5e1' },
                },
                axisLabel: {
                  color: e.isDark ? '#94a3b8' : '#64748b',
                  rotate: 25,
                  fontSize: 10,
                },
              },
              yAxis: [
                {
                  type: 'value',
                  name: '调用次数',
                  splitLine: {
                    lineStyle: { color: e.isDark ? '#334155' : '#f1f5f9' },
                  },
                  axisLine: {
                    lineStyle: { color: e.isDark ? '#475569' : '#cbd5e1' },
                  },
                },
                {
                  type: 'value',
                  name: 'Tokens',
                  splitLine: { show: !1 },
                  axisLine: {
                    lineStyle: { color: e.isDark ? '#475569' : '#cbd5e1' },
                  },
                },
              ],
              series: [
                {
                  name: '调用频次 (次)',
                  type: 'bar',
                  data: n,
                  itemStyle: { color: '#3b82f6', borderRadius: [3, 3, 0, 0] },
                  barWidth: '30%',
                },
                {
                  name: 'Token 消耗 (Tokens)',
                  type: 'line',
                  yAxisIndex: 1,
                  data: o,
                  smooth: !0,
                  showSymbol: !1,
                  itemStyle: { color: '#10b981' },
                  areaStyle: {
                    color: new $(0, 0, 0, 1, [
                      { offset: 0, color: 'rgba(16, 185, 129, 0.28)' },
                      { offset: 1, color: 'rgba(16, 185, 129, 0.01)' },
                    ]),
                  },
                },
              ],
            },
            !0,
          )
        }
      }
      function M() {
        const e = document.getElementById('sla-chart'),
          a = document.getElementById('trend-chart')
        ;(e &&
          e.clientWidth > 0 &&
          e.clientHeight > 0 &&
          (!m || m.isDisposed() ? (I(), _()) : m.resize()),
          a &&
            a.clientWidth > 0 &&
            a.clientHeight > 0 &&
            (!f || f.isDisposed() ? (I(), _()) : f.resize()))
      }
      ;(l(
        () => s.historicalData,
        () => {
          u(() => {
            ;(I(), _())
          })
        },
        { deep: !0 },
      ),
        l(
          () => s.slaMetric,
          () => {
            u(() => {
              ;(I(), _())
            })
          },
        ),
        l(
          () => s.loadingOverview,
          (e) => {
            e ||
              u(() => {
                ;(I(), _())
              })
          },
        ))
      let H = null
      return (
        e(() => {
          u(() => {
            if (
              (I(),
              _(),
              'undefined' != typeof window &&
                window.addEventListener('resize', M),
              'undefined' != typeof ResizeObserver)
            ) {
              H = new ResizeObserver(() => {
                M()
              })
              const e = document.getElementById('sla-chart'),
                a = document.getElementById('trend-chart')
              ;(e && H.observe(e), a && H.observe(a))
            }
            'undefined' != typeof document &&
              ((b = new MutationObserver(() => {
                _()
              })),
              b.observe(document.documentElement, {
                attributes: !0,
                attributeFilter: ['data-theme', 'class'],
              }))
          })
        }),
        C(() => {
          ;('undefined' != typeof window &&
            window.removeEventListener('resize', M),
            H?.disconnect(),
            b?.disconnect(),
            m?.dispose(),
            f?.dispose(),
            (m = null),
            (f = null))
        }),
        (e, a) => {
          const l = h('el-skeleton-item'),
            u = h('el-skeleton'),
            m = h('el-option'),
            f = h('el-select'),
            b = h('el-table-column'),
            C = h('el-progress'),
            I = h('el-table')
          return (
            i(),
            x('div', L, [
              T('div', A, [
                g(
                  u,
                  {
                    loading:
                      t(s).loadingOverview &&
                      !t(s).stats.connections &&
                      !t(s).stats.totalTokens,
                    animated: '',
                    rows: 2,
                  },
                  {
                    template: n(() => [
                      T('div', z, [
                        g(l, { variant: 'text', style: { width: '50%' } }),
                        g(l, {
                          variant: 'h3',
                          style: { width: '80%', 'margin-top': '8px' },
                        }),
                      ]),
                    ]),
                    default: n(() => [
                      T('div', U, [
                        T('div', N, [
                          a[1] ||
                            (a[1] = T(
                              'span',
                              { class: 'stat-title' },
                              '在线 WebSocket 连接',
                              -1,
                            )),
                          T('span', E, d(t(s).stats.connections), 1),
                        ]),
                        a[2] ||
                          (a[2] = T(
                            'div',
                            { class: 'stat-icon bg-green' },
                            [T('i', { class: 'fa-solid fa-plug' })],
                            -1,
                          )),
                      ]),
                    ]),
                    _: 1,
                  },
                  8,
                  ['loading'],
                ),
                g(
                  u,
                  {
                    loading:
                      t(s).loadingOverview &&
                      !t(s).stats.users &&
                      !t(s).stats.totalTokens,
                    animated: '',
                    rows: 2,
                  },
                  {
                    template: n(() => [
                      T('div', O, [
                        g(l, { variant: 'text', style: { width: '50%' } }),
                        g(l, {
                          variant: 'h3',
                          style: { width: '80%', 'margin-top': '8px' },
                        }),
                      ]),
                    ]),
                    default: n(() => [
                      T('div', V, [
                        T('div', q, [
                          a[3] ||
                            (a[3] = T(
                              'span',
                              { class: 'stat-title' },
                              '活跃用户数',
                              -1,
                            )),
                          T('span', F, d(t(s).stats.users), 1),
                        ]),
                        a[4] ||
                          (a[4] = T(
                            'div',
                            { class: 'stat-icon bg-blue' },
                            [T('i', { class: 'fa-solid fa-user-check' })],
                            -1,
                          )),
                      ]),
                    ]),
                    _: 1,
                  },
                  8,
                  ['loading'],
                ),
                g(
                  u,
                  {
                    loading:
                      t(s).loadingOverview &&
                      !t(s).stats.pending &&
                      !t(s).stats.totalTokens,
                    animated: '',
                    rows: 2,
                  },
                  {
                    template: n(() => [
                      T('div', P, [
                        g(l, { variant: 'text', style: { width: '50%' } }),
                        g(l, {
                          variant: 'h3',
                          style: { width: '80%', 'margin-top': '8px' },
                        }),
                      ]),
                    ]),
                    default: n(() => [
                      T('div', W, [
                        T('div', B, [
                          a[5] ||
                            (a[5] = T(
                              'span',
                              { class: 'stat-title' },
                              '执行中流式请求',
                              -1,
                            )),
                          T('span', j, d(t(s).stats.pending), 1),
                        ]),
                        a[6] ||
                          (a[6] = T(
                            'div',
                            { class: 'stat-icon bg-amber' },
                            [
                              T('i', {
                                class: 'fa-solid fa-spinner fa-spin-slow',
                              }),
                            ],
                            -1,
                          )),
                      ]),
                    ]),
                    _: 1,
                  },
                  8,
                  ['loading'],
                ),
                g(
                  u,
                  {
                    loading: t(s).loadingOverview && !t(s).stats.totalTokens,
                    animated: '',
                    rows: 2,
                  },
                  {
                    template: n(() => [
                      T('div', J, [
                        g(l, { variant: 'text', style: { width: '50%' } }),
                        g(l, {
                          variant: 'h3',
                          style: { width: '80%', 'margin-top': '8px' },
                        }),
                      ]),
                    ]),
                    default: n(() => [
                      T('div', Y, [
                        T('div', Z, [
                          a[7] ||
                            (a[7] = T(
                              'span',
                              { class: 'stat-title' },
                              '聚合 Token 消耗',
                              -1,
                            )),
                          T('span', G, d(w(t(s).stats.totalTokens)), 1),
                          T(
                            'span',
                            K,
                            ' 入: ' +
                              d(w(t(s).stats.promptTokens)) +
                              ' | 出: ' +
                              d(w(t(s).stats.compTokens)),
                            1,
                          ),
                        ]),
                        a[8] ||
                          (a[8] = T(
                            'div',
                            { class: 'stat-icon bg-indigo' },
                            [T('i', { class: 'fa-solid fa-chart-simple' })],
                            -1,
                          )),
                      ]),
                    ]),
                    _: 1,
                  },
                  8,
                  ['loading'],
                ),
              ]),
              T('div', X, [
                T('div', Q, [
                  T('div', ee, [
                    T('div', ae, [
                      a[9] ||
                        (a[9] = T(
                          'span',
                          { class: 'card-title' },
                          '大模型性能 SLA',
                          -1,
                        )),
                      g(
                        f,
                        {
                          modelValue: t(s).slaMetric,
                          'onUpdate:modelValue':
                            a[0] || (a[0] = (e) => (t(s).slaMetric = e)),
                          size: 'small',
                          class: 'saas-select',
                          style: { width: '150px' },
                        },
                        {
                          default: n(() => [
                            g(m, { label: '首响应延迟 (TTFT)', value: 'ttft' }),
                            g(m, { label: '端到端输出吞吐', value: 'tps' }),
                          ]),
                          _: 1,
                        },
                        8,
                        ['modelValue'],
                      ),
                    ]),
                    T('div', se, [
                      t(s).loadingOverview && !t(s).historicalData
                        ? (i(), p(u, { key: 0, animated: '', rows: 6 }))
                        : k('', !0),
                      T(
                        'div',
                        {
                          id: 'sla-chart',
                          class: 'chart-container',
                          style: r({
                            display:
                              t(s).loadingOverview && !t(s).historicalData
                                ? 'none'
                                : 'block',
                          }),
                        },
                        null,
                        4,
                      ),
                    ]),
                  ]),
                ]),
                T('div', te, [
                  T('div', le, [
                    a[10] ||
                      (a[10] = T(
                        'div',
                        { class: 'card-header' },
                        [
                          T(
                            'span',
                            { class: 'card-title' },
                            '请求吞吐与 Token 时序走势',
                          ),
                        ],
                        -1,
                      )),
                    T('div', ne, [
                      t(s).loadingOverview && !t(s).historicalData
                        ? (i(), p(u, { key: 0, animated: '', rows: 6 }))
                        : k('', !0),
                      T(
                        'div',
                        {
                          id: 'trend-chart',
                          class: 'chart-container',
                          style: r({
                            display:
                              t(s).loadingOverview && !t(s).historicalData
                                ? 'none'
                                : 'block',
                          }),
                        },
                        null,
                        4,
                      ),
                    ]),
                  ]),
                ]),
              ]),
              T('div', oe, [
                a[11] ||
                  (a[11] = T(
                    'div',
                    { class: 'card-header' },
                    [
                      T(
                        'span',
                        { class: 'card-title' },
                        '适配器实例与缓存命中审计',
                      ),
                    ],
                    -1,
                  )),
                T('div', ie, [
                  t(s).loadingOverview && 0 === t(s).providerStats.length
                    ? (i(),
                      p(u, {
                        key: 0,
                        animated: '',
                        rows: 5,
                        style: { padding: '20px' },
                      }))
                    : k('', !0),
                  o(
                    T(
                      'div',
                      re,
                      [
                        g(
                          I,
                          {
                            data: t(s).providerStats,
                            style: { width: '100%' },
                            class: 'saas-table',
                          },
                          {
                            default: n(() => [
                              g(b, {
                                prop: 'name',
                                label: '适配器实例',
                                'min-width': '140',
                              }),
                              g(
                                b,
                                {
                                  prop: 'calls',
                                  label: '调用次数',
                                  'min-width': '100',
                                  align: 'center',
                                  sortable: '',
                                },
                                {
                                  default: n((e) => [v(d(S(e.row.calls)), 1)]),
                                  _: 1,
                                },
                              ),
                              g(
                                b,
                                {
                                  prop: 'promptTokens',
                                  label: '输入 Tokens',
                                  'min-width': '120',
                                  align: 'center',
                                  sortable: '',
                                },
                                {
                                  default: n((e) => [
                                    T(
                                      'span',
                                      { title: S(e.row.promptTokens) },
                                      d(w(e.row.promptTokens)),
                                      9,
                                      ce,
                                    ),
                                  ]),
                                  _: 1,
                                },
                              ),
                              g(
                                b,
                                {
                                  prop: 'compTokens',
                                  label: '输出 Tokens',
                                  'min-width': '120',
                                  align: 'center',
                                  sortable: '',
                                },
                                {
                                  default: n((e) => [
                                    T(
                                      'span',
                                      { title: S(e.row.compTokens) },
                                      d(w(e.row.compTokens)),
                                      9,
                                      de,
                                    ),
                                  ]),
                                  _: 1,
                                },
                              ),
                              g(
                                b,
                                {
                                  prop: 'cacheHitRate',
                                  label: '缓存命中率',
                                  'min-width': '160',
                                  align: 'center',
                                  sortable: '',
                                },
                                {
                                  default: n((e) => {
                                    return [
                                      T(
                                        'div',
                                        {
                                          class: 'progress-wrapper',
                                          title: `命中: ${S(e.row.hitTokens)} / 输入: ${S(e.row.promptTokens)}`,
                                        },
                                        [
                                          T(
                                            'span',
                                            {
                                              class: c([
                                                'progress-num',
                                                {
                                                  'rate-high':
                                                    e.row.cacheHitRate >= 70,
                                                  'rate-mid':
                                                    e.row.cacheHitRate >= 40 &&
                                                    e.row.cacheHitRate < 70,
                                                  'rate-low':
                                                    e.row.cacheHitRate < 40,
                                                },
                                              ]),
                                            },
                                            d(e.row.cacheHitRate) + '% ',
                                            3,
                                          ),
                                          g(
                                            C,
                                            {
                                              percentage: e.row.cacheHitRate,
                                              'stroke-width': 6,
                                              color:
                                                ((a = e.row.cacheHitRate),
                                                a >= 70
                                                  ? '#10b981'
                                                  : a >= 40
                                                    ? '#34d399'
                                                    : a > 0
                                                      ? '#60a5fa'
                                                      : '#cbd5e1'),
                                              'show-text': !1,
                                            },
                                            null,
                                            8,
                                            ['percentage', 'color'],
                                          ),
                                        ],
                                        8,
                                        ue,
                                      ),
                                    ]
                                    var a
                                  }),
                                  _: 1,
                                },
                              ),
                            ]),
                            _: 1,
                          },
                          8,
                          ['data'],
                        ),
                      ],
                      512,
                    ),
                    [
                      [
                        y,
                        !t(s).loadingOverview || t(s).providerStats.length > 0,
                      ],
                    ],
                  ),
                ]),
              ]),
            ])
          )
        }
      )
    },
  },
  ve = S(pe, [['__scopeId', 'data-v-753ffdc6']]),
  me = { class: 'usage-view' },
  fe = { class: 'top-nav-bar' },
  he = { class: 'view-switch', role: 'tablist', 'aria-label': '用量分析视图' },
  ke = ['onClick'],
  be = { class: 'user-filter-box' },
  ge = { key: 0, class: 'user-focus-banner' },
  we = { class: 'user-focus-info' },
  Te = { class: 'mono user-tag' },
  ye = { class: 'summary-grid' },
  xe = { class: 'summary-card' },
  Ce = { class: 'summary-card' },
  Se = { class: 'summary-card' },
  Ie = { class: 'summary-card' },
  _e = { class: 'saas-card' },
  Me = { class: 'card-header user-header' },
  De = { class: 'header-filters' },
  $e = { class: 'source-filters' },
  He = ['onClick'],
  Re = { class: 'table-responsive-wrapper' },
  Le = { class: 'user-cell' },
  Ae = ['title', 'onClick'],
  ze = { class: 'model-bar-tooltip' },
  Ue = { class: 'tooltip-header' },
  Ne = { class: 'tooltip-list' },
  Ee = { class: 'tooltip-row' },
  Oe = ['title'],
  Ve = { class: 'tooltip-row' },
  qe = ['title'],
  Fe = { class: 'tooltip-row' },
  Pe = ['title'],
  We = { class: 'tooltip-row total' },
  Be = ['title'],
  je = { class: 'mini-bar-track' },
  Je = { class: 'user-actions' },
  Ye = { key: 0, class: 'empty-state' },
  Ze = { class: 'summary-grid' },
  Ge = { class: 'summary-heading' },
  Ke = { class: 'saas-card' },
  Xe = { class: 'card-header source-header' },
  Qe = { key: 0, class: 'filter-hint' },
  ea = { class: 'source-filters' },
  aa = ['onClick'],
  sa = { class: 'table-responsive-wrapper' },
  ta = { class: 'session-cell' },
  la = { class: 'session-title' },
  na = { class: 'session-id' },
  oa = ['title', 'onClick'],
  ia = { key: 0, class: 'empty-state' },
  ra = { class: 'model-summary-grid' },
  ca = { class: 'metric-card' },
  da = { class: 'metric-card' },
  ua = { class: 'metric-card' },
  pa = { class: 'saas-card model-usage-card' },
  va = { class: 'card-header' },
  ma = { key: 0, class: 'filter-hint' },
  fa = { class: 'model-bars' },
  ha = { class: 'model-label' },
  ka = ['title'],
  ba = { class: 'model-bar-tooltip' },
  ga = { class: 'tooltip-header' },
  wa = { key: 0 },
  Ta = { class: 'tooltip-list' },
  ya = { class: 'tooltip-row' },
  xa = ['title'],
  Ca = { class: 'tooltip-row' },
  Sa = ['title'],
  Ia = { class: 'tooltip-row' },
  _a = ['title'],
  Ma = { class: 'tooltip-row total' },
  Da = ['title'],
  $a = { class: 'bar-track' },
  Ha = { key: 0, class: 'empty-state' },
  Ra = { class: 'saas-card' },
  La = { class: 'table-responsive-wrapper' },
  Aa = { class: 'rate' },
  za = S(
    {
      __name: 'DashboardUsers',
      setup(e) {
        const l = R(),
          o = s('users'),
          u = s('all'),
          m = s('all'),
          w = s(''),
          y = [
            {
              value: 'users',
              label: '用户用量与排行',
              icon: 'fa-solid fa-ranking-star',
            },
            {
              value: 'sessions',
              label: '来源与会话',
              icon: 'fa-solid fa-users-viewfinder',
            },
            {
              value: 'models',
              label: '模型用量',
              icon: 'fa-solid fa-chart-simple',
            },
          ],
          C = [
            { value: 'all', label: '全部' },
            { value: 'web', label: 'Web' },
            { value: 'channel', label: 'Channel' },
            { value: 'system', label: '系统' },
          ],
          S = {
            web: { label: 'Web', icon: 'fa-solid fa-window-maximize' },
            channel: { label: 'Channel', icon: 'fa-solid fa-comments' },
            system: { label: '系统任务', icon: 'fa-solid fa-gears' },
            unknown: {
              label: '历史未识别',
              icon: 'fa-solid fa-circle-question',
            },
          },
          I = b(() => l.userRankings.reduce((e, a) => e + (a.calls || 0), 0)),
          _ = b(() => l.userRankings.reduce((e, a) => e + (a.tokens || 0), 0)),
          M = b(() =>
            l.userRankings.length > 0
              ? Math.round(I.value / l.userRankings.length)
              : 0,
          ),
          D = b(() =>
            l.userRankings.length > 0
              ? Math.round(_.value / l.userRankings.length)
              : 0,
          ),
          $ = b(() => l.userRankings[0]?.tokens || 0),
          H = b(() =>
            _.value > 0 ? (($.value / _.value) * 100).toFixed(1) : '0',
          ),
          L = b(() =>
            l.userRankings
              .filter((e) => 'all' === m.value || e.sourceType === m.value)
              .sort((e, a) => a.tokens - e.tokens),
          ),
          A = b(() => {
            if (!w.value.trim()) return L.value
            const e = w.value.trim().toLowerCase()
            return L.value.filter(
              (a) =>
                (a.userId && a.userId.toLowerCase().includes(e)) ||
                (a.channelName && a.channelName.toLowerCase().includes(e)),
            )
          })
        function z(e) {
          l.setSelectedUser(e)
        }
        const U = b(() => {
            const e = new Map()
            for (const a of l.sourceDistribution) {
              const s = a.sourceType || 'unknown',
                t = e.get(s) || { calls: 0, tokens: 0 }
              ;((t.calls += a.callCount || 0),
                (t.tokens += a.totalTokens || 0),
                e.set(s, t))
            }
            return ['web', 'channel', 'system', 'unknown'].map((a) => ({
              type: a,
              ...S[a],
              ...(e.get(a) || { calls: 0, tokens: 0 }),
            }))
          }),
          N = b(() =>
            l.sessionRankings
              .filter((e) => 'all' === u.value || e.sourceType === u.value)
              .sort((e, a) => a.tokens - e.tokens),
          ),
          E = b(() =>
            (l.rawModelDistribution || [])
              .map((e) => {
                const a = e.promptTokens || 0
                return {
                  ...e,
                  adapterName: e.adapterName || e.provider || '历史未识别实例',
                  uncachedInputTokens: Math.max(
                    0,
                    (e.promptTokens || 0) - (e.cacheHitTokens || 0),
                  ),
                  cacheHitRate:
                    a > 0
                      ? Math.min(
                          100,
                          Math.round(((e.cacheHitTokens || 0) / a) * 100),
                        )
                      : 0,
                }
              })
              .sort((e, a) => a.totalTokens - e.totalTokens),
          ),
          O = b(() =>
            'All' === l.selectedProvider
              ? E.value
              : E.value.filter((e) => e.adapterName === l.selectedProvider),
          ),
          V = b(() => E.value.reduce((e, a) => e + (a.callCount || 0), 0)),
          q = b(() => E.value.reduce((e, a) => e + (a.cacheHitTokens || 0), 0)),
          F = b(() => E.value.reduce((e, a) => e + (a.promptTokens || 0), 0)),
          P = b(() =>
            F.value > 0
              ? Math.min(100, Math.round((q.value / F.value) * 100))
              : 0,
          )
        function W(e) {
          return (S[e] || S.unknown).icon
        }
        function B(e) {
          return 'channel' === e.sourceType
            ? e.channelName || e.channelType || 'Channel'
            : (S[e.sourceType] || S.unknown).label
        }
        function j(e) {
          const a = O.value[0]?.totalTokens || 1
          return { width: `${Math.max(0, ((e || 0) / a) * 100)}%` }
        }
        function J(e) {
          const a = Number(e || 0)
          return a >= 1e9
            ? `${(a / 1e9).toFixed(2).replace(/\.?0+$/, '')}B`
            : a >= 1e6
              ? `${(a / 1e6).toFixed(2).replace(/\.?0+$/, '')}M`
              : a >= 1e3
                ? `${(a / 1e3).toFixed(1).replace(/\.?0+$/, '')}k`
                : a.toLocaleString('zh-CN')
        }
        function Y(e) {
          return Number(e || 0).toLocaleString('zh-CN')
        }
        return (e, s) => {
          const b = h('el-option'),
            S = h('el-select'),
            R = h('el-button'),
            L = h('el-input'),
            F = h('el-table-column'),
            Z = h('el-tooltip'),
            G = h('el-table')
          return (
            i(),
            x('div', me, [
              T('div', fe, [
                T('div', he, [
                  (i(),
                  x(
                    f,
                    null,
                    a(y, (e) =>
                      T(
                        'button',
                        {
                          key: e.value,
                          class: c([
                            'switch-button',
                            { active: o.value === e.value },
                          ]),
                          type: 'button',
                          onClick: (a) => (o.value = e.value),
                        },
                        [
                          T('i', { class: c(e.icon) }, null, 2),
                          v(' ' + d(e.label), 1),
                        ],
                        10,
                        ke,
                      ),
                    ),
                    64,
                  )),
                ]),
                T('div', be, [
                  g(
                    S,
                    {
                      'model-value': t(l).selectedUser,
                      filterable: '',
                      clearable: '',
                      placeholder: '聚焦指定用户...',
                      style: { width: '220px' },
                      'onUpdate:modelValue':
                        s[0] ||
                        (s[0] = (e) => t(l).setSelectedUser(e || 'All')),
                      onClear:
                        s[1] || (s[1] = (e) => t(l).setSelectedUser('All')),
                    },
                    {
                      default: n(() => [
                        g(b, { label: '全部用户 (All)', value: 'All' }),
                        (i(!0),
                        x(
                          f,
                          null,
                          a(
                            t(l).userRankings,
                            (e) => (
                              i(),
                              p(
                                b,
                                {
                                  key: e.userId,
                                  label: `${e.userId} (${J(e.tokens)})`,
                                  value: e.userId,
                                },
                                null,
                                8,
                                ['label', 'value'],
                              )
                            ),
                          ),
                          128,
                        )),
                      ]),
                      _: 1,
                    },
                    8,
                    ['model-value'],
                  ),
                ]),
              ]),
              'All' !== t(l).selectedUser
                ? (i(),
                  x('div', ge, [
                    T('div', we, [
                      s[5] ||
                        (s[5] = T(
                          'i',
                          { class: 'fa-solid fa-filter' },
                          null,
                          -1,
                        )),
                      s[6] || (s[6] = T('span', null, '当前已聚焦用户：', -1)),
                      T('strong', Te, d(t(l).selectedUser), 1),
                      s[7] ||
                        (s[7] = T(
                          'span',
                          { class: 'user-focus-hint' },
                          '（已切片该用户的会话与模型用量数据）',
                          -1,
                        )),
                    ]),
                    g(
                      R,
                      {
                        size: 'small',
                        type: 'primary',
                        plain: '',
                        onClick:
                          s[2] || (s[2] = (e) => t(l).setSelectedUser('All')),
                      },
                      {
                        default: n(
                          () =>
                            s[8] ||
                            (s[8] = [
                              T('i', { class: 'fa-solid fa-xmark' }, null, -1),
                              v(' 清除筛选 / 查看全部 '),
                            ]),
                        ),
                        _: 1,
                      },
                    ),
                  ]))
                : k('', !0),
              'users' === o.value
                ? (i(),
                  x(
                    f,
                    { key: 1 },
                    [
                      T('div', ye, [
                        T('article', xe, [
                          s[9] ||
                            (s[9] = T(
                              'div',
                              { class: 'summary-heading' },
                              [
                                T('span', { class: 'source-icon web' }, [
                                  T('i', { class: 'fa-solid fa-users' }),
                                ]),
                                T('span', null, '活跃用户总数'),
                              ],
                              -1,
                            )),
                          T('strong', null, d(Y(t(l).userRankings.length)), 1),
                          s[10] ||
                            (s[10] = T(
                              'span',
                              null,
                              '当前时间窗口内产生调用的用户',
                              -1,
                            )),
                        ]),
                        T('article', Ce, [
                          s[11] ||
                            (s[11] = T(
                              'div',
                              { class: 'summary-heading' },
                              [
                                T('span', { class: 'source-icon channel' }, [
                                  T('i', { class: 'fa-solid fa-bolt' }),
                                ]),
                                T('span', null, '人均调用次数'),
                              ],
                              -1,
                            )),
                          T('strong', null, d(Y(M.value)), 1),
                          T('span', null, '总调用 ' + d(Y(I.value)) + ' 次', 1),
                        ]),
                        T('article', Se, [
                          s[12] ||
                            (s[12] = T(
                              'div',
                              { class: 'summary-heading' },
                              [
                                T('span', { class: 'source-icon system' }, [
                                  T('i', { class: 'fa-solid fa-coins' }),
                                ]),
                                T('span', null, '人均 Token'),
                              ],
                              -1,
                            )),
                          T('strong', null, d(J(D.value)), 1),
                          T('span', null, '总 Token ' + d(J(_.value)), 1),
                        ]),
                        T('article', Ie, [
                          s[13] ||
                            (s[13] = T(
                              'div',
                              { class: 'summary-heading' },
                              [
                                T('span', { class: 'source-icon unknown' }, [
                                  T('i', { class: 'fa-solid fa-crown' }),
                                ]),
                                T('span', null, 'Top 1 消耗占比'),
                              ],
                              -1,
                            )),
                          T('strong', null, d(H.value) + '%', 1),
                          T(
                            'span',
                            null,
                            '最高单人 ' + d(J($.value)) + ' Token',
                            1,
                          ),
                        ]),
                      ]),
                      T('section', _e, [
                        T('header', Me, [
                          s[15] ||
                            (s[15] = T(
                              'div',
                              null,
                              [
                                T('h3', null, '用户用量排行榜'),
                                T(
                                  'p',
                                  null,
                                  ' 展示当前活跃用户的 Token 构成细分（输出、输入、缓存输入）、调用频次及单次均值 ',
                                ),
                              ],
                              -1,
                            )),
                          T('div', De, [
                            T('div', $e, [
                              (i(),
                              x(
                                f,
                                null,
                                a(C, (e) =>
                                  T(
                                    'button',
                                    {
                                      key: e.value,
                                      type: 'button',
                                      class: c({ active: m.value === e.value }),
                                      onClick: (a) => (m.value = e.value),
                                    },
                                    d(e.label),
                                    11,
                                    He,
                                  ),
                                ),
                                64,
                              )),
                            ]),
                            g(
                              L,
                              {
                                modelValue: w.value,
                                'onUpdate:modelValue':
                                  s[3] || (s[3] = (e) => (w.value = e)),
                                placeholder: '搜索用户标识...',
                                size: 'small',
                                clearable: '',
                                style: { width: '170px' },
                              },
                              {
                                prefix: n(
                                  () =>
                                    s[14] ||
                                    (s[14] = [
                                      T(
                                        'i',
                                        {
                                          class: 'fa-solid fa-magnifying-glass',
                                          style: { color: '#94a3b8' },
                                        },
                                        null,
                                        -1,
                                      ),
                                    ]),
                                ),
                                _: 1,
                              },
                              8,
                              ['modelValue'],
                            ),
                          ]),
                        ]),
                        T('div', Re, [
                          g(
                            G,
                            {
                              data: A.value,
                              class: 'saas-table',
                              style: { width: '100%' },
                              'default-sort': {
                                prop: 'tokens',
                                order: 'descending',
                              },
                            },
                            {
                              default: n(() => [
                                g(
                                  F,
                                  {
                                    label: '排名',
                                    width: '80',
                                    align: 'center',
                                  },
                                  {
                                    default: n((e) => [
                                      T(
                                        'span',
                                        {
                                          class: c([
                                            'rank-badge',
                                            `rank-${e.$index + 1}`,
                                          ]),
                                        },
                                        d(
                                          e.$index < 3
                                            ? ['🥇', '🥈', '🥉'][e.$index]
                                            : `#${e.$index + 1}`,
                                        ),
                                        3,
                                      ),
                                    ]),
                                    _: 1,
                                  },
                                ),
                                g(
                                  F,
                                  {
                                    label: '用户标识',
                                    'min-width': '220',
                                    prop: 'userId',
                                    sortable: '',
                                  },
                                  {
                                    default: n((e) => [
                                      T('div', Le, [
                                        T(
                                          'span',
                                          {
                                            class: c([
                                              'avatar',
                                              e.row.sourceType,
                                            ]),
                                          },
                                          [
                                            T(
                                              'i',
                                              { class: c(W(e.row.sourceType)) },
                                              null,
                                              2,
                                            ),
                                          ],
                                          2,
                                        ),
                                        T('div', null, [
                                          T(
                                            'span',
                                            {
                                              class:
                                                'mono ellipsis user-clickable',
                                              title: `${e.row.userId} (点击聚焦此用户)`,
                                              onClick: (a) => z(e.row.userId),
                                            },
                                            d(e.row.userId),
                                            9,
                                            Ae,
                                          ),
                                          T('small', null, d(B(e.row)), 1),
                                        ]),
                                      ]),
                                    ]),
                                    _: 1,
                                  },
                                ),
                                g(
                                  F,
                                  { label: 'Token 构成', 'min-width': '170' },
                                  {
                                    default: n((e) => [
                                      g(
                                        Z,
                                        {
                                          placement: 'top',
                                          'show-after': 50,
                                          'popper-class':
                                            'model-bar-tooltip-popper',
                                        },
                                        {
                                          content: n(() => [
                                            T('div', ze, [
                                              T('div', Ue, [
                                                T(
                                                  'span',
                                                  null,
                                                  d(e.row.userId),
                                                  1,
                                                ),
                                              ]),
                                              T('div', Ne, [
                                                T('div', Ee, [
                                                  s[16] ||
                                                    (s[16] = T(
                                                      'span',
                                                      {
                                                        class: 'tooltip-label',
                                                      },
                                                      [
                                                        T('i', {
                                                          class:
                                                            'legend-dot output',
                                                        }),
                                                        v('输出: '),
                                                      ],
                                                      -1,
                                                    )),
                                                  T(
                                                    'span',
                                                    {
                                                      class: 'tooltip-val',
                                                      title: Y(
                                                        e.row.candidatesTokens,
                                                      ),
                                                    },
                                                    d(
                                                      J(e.row.candidatesTokens),
                                                    ) +
                                                      ' Tokens (' +
                                                      d(
                                                        e.row.tokens > 0
                                                          ? Math.round(
                                                              (e.row
                                                                .candidatesTokens /
                                                                e.row.tokens) *
                                                                100,
                                                            )
                                                          : 0,
                                                      ) +
                                                      '%) ',
                                                    9,
                                                    Oe,
                                                  ),
                                                ]),
                                                T('div', Ve, [
                                                  s[17] ||
                                                    (s[17] = T(
                                                      'span',
                                                      {
                                                        class: 'tooltip-label',
                                                      },
                                                      [
                                                        T('i', {
                                                          class:
                                                            'legend-dot input',
                                                        }),
                                                        v('输入: '),
                                                      ],
                                                      -1,
                                                    )),
                                                  T(
                                                    'span',
                                                    {
                                                      class: 'tooltip-val',
                                                      title: Y(
                                                        Math.max(
                                                          0,
                                                          e.row.promptTokens -
                                                            e.row
                                                              .cacheHitTokens,
                                                        ),
                                                      ),
                                                    },
                                                    d(
                                                      J(
                                                        Math.max(
                                                          0,
                                                          e.row.promptTokens -
                                                            e.row
                                                              .cacheHitTokens,
                                                        ),
                                                      ),
                                                    ) +
                                                      ' Tokens (' +
                                                      d(
                                                        e.row.tokens > 0
                                                          ? Math.round(
                                                              (Math.max(
                                                                0,
                                                                e.row
                                                                  .promptTokens -
                                                                  e.row
                                                                    .cacheHitTokens,
                                                              ) /
                                                                e.row.tokens) *
                                                                100,
                                                            )
                                                          : 0,
                                                      ) +
                                                      '%) ',
                                                    9,
                                                    qe,
                                                  ),
                                                ]),
                                                T('div', Fe, [
                                                  s[18] ||
                                                    (s[18] = T(
                                                      'span',
                                                      {
                                                        class: 'tooltip-label',
                                                      },
                                                      [
                                                        T('i', {
                                                          class:
                                                            'legend-dot cache',
                                                        }),
                                                        v('缓存输入: '),
                                                      ],
                                                      -1,
                                                    )),
                                                  T(
                                                    'span',
                                                    {
                                                      class: 'tooltip-val',
                                                      title: Y(
                                                        e.row.cacheHitTokens,
                                                      ),
                                                    },
                                                    d(J(e.row.cacheHitTokens)) +
                                                      ' Tokens (' +
                                                      d(
                                                        e.row.tokens > 0
                                                          ? Math.round(
                                                              (e.row
                                                                .cacheHitTokens /
                                                                e.row.tokens) *
                                                                100,
                                                            )
                                                          : 0,
                                                      ) +
                                                      '%) ',
                                                    9,
                                                    Pe,
                                                  ),
                                                ]),
                                                s[20] ||
                                                  (s[20] = T(
                                                    'div',
                                                    {
                                                      class: 'tooltip-divider',
                                                    },
                                                    null,
                                                    -1,
                                                  )),
                                                T('div', We, [
                                                  s[19] ||
                                                    (s[19] = T(
                                                      'span',
                                                      {
                                                        class: 'tooltip-label',
                                                      },
                                                      '总计:',
                                                      -1,
                                                    )),
                                                  T(
                                                    'span',
                                                    {
                                                      class: 'tooltip-val',
                                                      title: Y(e.row.tokens),
                                                    },
                                                    d(J(e.row.tokens)) +
                                                      ' Tokens',
                                                    9,
                                                    Be,
                                                  ),
                                                ]),
                                              ]),
                                            ]),
                                          ]),
                                          default: n(() => [
                                            T('div', je, [
                                              T(
                                                'span',
                                                {
                                                  class: 'bar output',
                                                  style: r({
                                                    width:
                                                      (e.row.tokens > 0
                                                        ? (e.row
                                                            .candidatesTokens /
                                                            e.row.tokens) *
                                                          100
                                                        : 0) + '%',
                                                  }),
                                                },
                                                null,
                                                4,
                                              ),
                                              T(
                                                'span',
                                                {
                                                  class: 'bar input',
                                                  style: r({
                                                    width:
                                                      (e.row.tokens > 0
                                                        ? (Math.max(
                                                            0,
                                                            e.row.promptTokens -
                                                              e.row
                                                                .cacheHitTokens,
                                                          ) /
                                                            e.row.tokens) *
                                                          100
                                                        : 0) + '%',
                                                  }),
                                                },
                                                null,
                                                4,
                                              ),
                                              T(
                                                'span',
                                                {
                                                  class: 'bar cache',
                                                  style: r({
                                                    width:
                                                      (e.row.tokens > 0
                                                        ? (e.row
                                                            .cacheHitTokens /
                                                            e.row.tokens) *
                                                          100
                                                        : 0) + '%',
                                                  }),
                                                },
                                                null,
                                                4,
                                              ),
                                            ]),
                                          ]),
                                          _: 2,
                                        },
                                        1024,
                                      ),
                                    ]),
                                    _: 1,
                                  },
                                ),
                                g(
                                  F,
                                  {
                                    label: '总 Token',
                                    width: '140',
                                    align: 'right',
                                    prop: 'tokens',
                                    sortable: '',
                                  },
                                  {
                                    default: n((e) => [
                                      T('strong', null, d(J(e.row.tokens)), 1),
                                    ]),
                                    _: 1,
                                  },
                                ),
                                g(
                                  F,
                                  {
                                    label: '调用次数',
                                    width: '120',
                                    align: 'right',
                                    prop: 'calls',
                                    sortable: '',
                                  },
                                  {
                                    default: n((e) => [
                                      v(d(Y(e.row.calls)), 1),
                                    ]),
                                    _: 1,
                                  },
                                ),
                                g(
                                  F,
                                  {
                                    label: '单次平均',
                                    width: '130',
                                    align: 'right',
                                    prop: 'avgTokensPerCall',
                                    sortable: '',
                                  },
                                  {
                                    default: n((e) => [
                                      v(d(J(e.row.avgTokensPerCall)), 1),
                                    ]),
                                    _: 1,
                                  },
                                ),
                                g(
                                  F,
                                  {
                                    label: '快捷下钻',
                                    width: '150',
                                    align: 'center',
                                  },
                                  {
                                    default: n((e) => [
                                      T('div', Je, [
                                        g(
                                          R,
                                          {
                                            type: 'primary',
                                            link: '',
                                            size: 'small',
                                            onClick: (a) => {
                                              return (
                                                (s = e.row.userId),
                                                l.setSelectedUser(s),
                                                void (o.value = 'sessions')
                                              )
                                              var s
                                            },
                                          },
                                          {
                                            default: n(
                                              () =>
                                                s[21] ||
                                                (s[21] = [v(' 看会话 ')]),
                                            ),
                                            _: 2,
                                          },
                                          1032,
                                          ['onClick'],
                                        ),
                                        g(
                                          R,
                                          {
                                            type: 'primary',
                                            link: '',
                                            size: 'small',
                                            onClick: (a) => {
                                              return (
                                                (s = e.row.userId),
                                                l.setSelectedUser(s),
                                                void (o.value = 'models')
                                              )
                                              var s
                                            },
                                          },
                                          {
                                            default: n(
                                              () =>
                                                s[22] ||
                                                (s[22] = [v(' 看模型 ')]),
                                            ),
                                            _: 2,
                                          },
                                          1032,
                                          ['onClick'],
                                        ),
                                      ]),
                                    ]),
                                    _: 1,
                                  },
                                ),
                              ]),
                              _: 1,
                            },
                            8,
                            ['data'],
                          ),
                          0 === A.value.length
                            ? (i(),
                              x(
                                'div',
                                Ye,
                                ' 当前时间范围内没有匹配的用户用量数据 ',
                              ))
                            : k('', !0),
                        ]),
                      ]),
                    ],
                    64,
                  ))
                : 'sessions' === o.value
                  ? (i(),
                    x(
                      f,
                      { key: 2 },
                      [
                        T('div', Ze, [
                          (i(!0),
                          x(
                            f,
                            null,
                            a(
                              U.value,
                              (e) => (
                                i(),
                                x(
                                  'article',
                                  { key: e.type, class: 'summary-card' },
                                  [
                                    T('div', Ge, [
                                      T(
                                        'span',
                                        { class: c(['source-icon', e.type]) },
                                        [T('i', { class: c(e.icon) }, null, 2)],
                                        2,
                                      ),
                                      T('span', null, d(e.label), 1),
                                    ]),
                                    T('strong', null, d(Y(e.calls)), 1),
                                    T(
                                      'span',
                                      null,
                                      d(J(e.tokens)) + ' Token',
                                      1,
                                    ),
                                  ],
                                )
                              ),
                            ),
                            128,
                          )),
                        ]),
                        T('section', Ke, [
                          T('header', Xe, [
                            T('div', null, [
                              s[24] ||
                                (s[24] = T('h3', null, '来源与会话', -1)),
                              T('p', null, [
                                s[23] ||
                                  (s[23] = v(
                                    ' 按真实 Session 标题归集，并区分 Web 用户与外部 Channel 用户 ',
                                  )),
                                'All' !== t(l).selectedUser
                                  ? (i(),
                                    x(
                                      'span',
                                      Qe,
                                      ' (已按用户 ' +
                                        d(t(l).selectedUser) +
                                        ' 切片) ',
                                      1,
                                    ))
                                  : k('', !0),
                              ]),
                            ]),
                            T('div', ea, [
                              (i(),
                              x(
                                f,
                                null,
                                a(C, (e) =>
                                  T(
                                    'button',
                                    {
                                      key: e.value,
                                      type: 'button',
                                      class: c({ active: u.value === e.value }),
                                      onClick: (a) => (u.value = e.value),
                                    },
                                    d(e.label),
                                    11,
                                    aa,
                                  ),
                                ),
                                64,
                              )),
                            ]),
                          ]),
                          T('div', sa, [
                            g(
                              G,
                              {
                                data: N.value,
                                class: 'saas-table',
                                style: { width: '100%' },
                                'default-sort': {
                                  prop: 'tokens',
                                  order: 'descending',
                                },
                              },
                              {
                                default: n(() => [
                                  g(
                                    F,
                                    { label: '会话', 'min-width': '260' },
                                    {
                                      default: n((e) => [
                                        T('div', ta, [
                                          T(
                                            'span',
                                            la,
                                            d(e.row.sessionTitle),
                                            1,
                                          ),
                                          T(
                                            'span',
                                            na,
                                            d(
                                              e.row.sessionId ||
                                                '历史记录未关联 Session',
                                            ),
                                            1,
                                          ),
                                        ]),
                                      ]),
                                      _: 1,
                                    },
                                  ),
                                  g(
                                    F,
                                    { label: '来源', 'min-width': '150' },
                                    {
                                      default: n((e) => [
                                        T(
                                          'span',
                                          {
                                            class: c([
                                              'source-pill',
                                              e.row.sourceType,
                                            ]),
                                          },
                                          [
                                            T(
                                              'i',
                                              { class: c(W(e.row.sourceType)) },
                                              null,
                                              2,
                                            ),
                                            v(d(B(e.row)), 1),
                                          ],
                                          2,
                                        ),
                                      ]),
                                      _: 1,
                                    },
                                  ),
                                  g(
                                    F,
                                    {
                                      label: '用户标识',
                                      'min-width': '210',
                                      prop: 'userId',
                                      sortable: '',
                                    },
                                    {
                                      default: n((e) => [
                                        T(
                                          'span',
                                          {
                                            class:
                                              'mono ellipsis user-clickable',
                                            title: `${e.row.userId} (点击聚焦此用户)`,
                                            onClick: (a) => z(e.row.userId),
                                          },
                                          d(e.row.userId),
                                          9,
                                          oa,
                                        ),
                                      ]),
                                      _: 1,
                                    },
                                  ),
                                  g(
                                    F,
                                    {
                                      label: '调用',
                                      width: '110',
                                      align: 'right',
                                      prop: 'calls',
                                      sortable: '',
                                    },
                                    {
                                      default: n((e) => [
                                        v(d(Y(e.row.calls)), 1),
                                      ]),
                                      _: 1,
                                    },
                                  ),
                                  g(
                                    F,
                                    {
                                      label: 'Token',
                                      width: '130',
                                      align: 'right',
                                      prop: 'tokens',
                                      sortable: '',
                                    },
                                    {
                                      default: n((e) => [
                                        T(
                                          'strong',
                                          null,
                                          d(J(e.row.tokens)),
                                          1,
                                        ),
                                      ]),
                                      _: 1,
                                    },
                                  ),
                                ]),
                                _: 1,
                              },
                              8,
                              ['data'],
                            ),
                            0 === N.value.length
                              ? (i(),
                                x(
                                  'div',
                                  ia,
                                  ' 当前时间范围内没有对应来源的会话审计数据 ',
                                ))
                              : k('', !0),
                          ]),
                        ]),
                      ],
                      64,
                    ))
                  : (i(),
                    x(
                      f,
                      { key: 3 },
                      [
                        T('div', ra, [
                          T('article', ca, [
                            s[25] || (s[25] = T('span', null, '总 Token', -1)),
                            T('strong', null, d(J(t(l).stats.totalTokens)), 1),
                            T(
                              'small',
                              null,
                              d(J(t(l).stats.promptTokens)) +
                                ' 输入 / ' +
                                d(J(t(l).stats.compTokens)) +
                                ' 输出',
                              1,
                            ),
                          ]),
                          T('article', da, [
                            s[26] || (s[26] = T('span', null, 'API 调用', -1)),
                            T('strong', null, d(Y(V.value)), 1),
                            T('small', null, d(E.value.length) + ' 个模型', 1),
                          ]),
                          T('article', ua, [
                            s[27] ||
                              (s[27] = T('span', null, '缓存命中率', -1)),
                            T('strong', null, d(P.value) + '%', 1),
                            T(
                              'small',
                              null,
                              d(J(q.value)) + ' 缓存读取 Token',
                              1,
                            ),
                          ]),
                        ]),
                        T('section', pa, [
                          T('header', va, [
                            T('div', null, [
                              s[29] || (s[29] = T('h3', null, '模型用量', -1)),
                              T('p', null, [
                                s[28] ||
                                  (s[28] = v(
                                    ' 输出、输入与缓存输入 Token 的横向对照 ',
                                  )),
                                'All' !== t(l).selectedUser
                                  ? (i(),
                                    x(
                                      'span',
                                      ma,
                                      ' (已按用户 ' +
                                        d(t(l).selectedUser) +
                                        ' 切片) ',
                                      1,
                                    ))
                                  : k('', !0),
                              ]),
                            ]),
                            g(
                              S,
                              {
                                modelValue: t(l).selectedProvider,
                                'onUpdate:modelValue':
                                  s[4] ||
                                  (s[4] = (e) => (t(l).selectedProvider = e)),
                                size: 'small',
                                style: { width: '160px' },
                              },
                              {
                                default: n(() => [
                                  g(b, { label: '全部适配器', value: 'All' }),
                                  (i(!0),
                                  x(
                                    f,
                                    null,
                                    a(
                                      t(l).providers,
                                      (e) => (
                                        i(),
                                        p(
                                          b,
                                          { key: e, label: e, value: e },
                                          null,
                                          8,
                                          ['label', 'value'],
                                        )
                                      ),
                                    ),
                                    128,
                                  )),
                                ]),
                                _: 1,
                              },
                              8,
                              ['modelValue'],
                            ),
                          ]),
                          s[35] ||
                            (s[35] = T(
                              'div',
                              { class: 'legend' },
                              [
                                T('span', null, [
                                  T('i', { class: 'legend-dot output' }),
                                  v('输出'),
                                ]),
                                T('span', null, [
                                  T('i', { class: 'legend-dot input' }),
                                  v('输入'),
                                ]),
                                T('span', null, [
                                  T('i', { class: 'legend-dot cache' }),
                                  v('缓存输入'),
                                ]),
                              ],
                              -1,
                            )),
                          T('div', fa, [
                            (i(!0),
                            x(
                              f,
                              null,
                              a(
                                O.value,
                                (e) => (
                                  i(),
                                  x(
                                    'div',
                                    {
                                      key: `${e.adapterInstanceId || e.adapterName}/${e.model}`,
                                      class: 'model-row',
                                    },
                                    [
                                      T('div', ha, [
                                        T(
                                          'span',
                                          { title: e.model },
                                          d(e.model),
                                          9,
                                          ka,
                                        ),
                                        T('small', null, d(e.adapterName), 1),
                                      ]),
                                      g(
                                        Z,
                                        {
                                          placement: 'top',
                                          'show-after': 50,
                                          'popper-class':
                                            'model-bar-tooltip-popper',
                                        },
                                        {
                                          content: n(() => [
                                            T('div', ba, [
                                              T('div', ga, [
                                                T('span', null, d(e.model), 1),
                                                e.adapterName
                                                  ? (i(),
                                                    x(
                                                      'small',
                                                      wa,
                                                      '(' +
                                                        d(e.adapterName) +
                                                        ')',
                                                      1,
                                                    ))
                                                  : k('', !0),
                                              ]),
                                              T('div', Ta, [
                                                T('div', ya, [
                                                  s[30] ||
                                                    (s[30] = T(
                                                      'span',
                                                      {
                                                        class: 'tooltip-label',
                                                      },
                                                      [
                                                        T('i', {
                                                          class:
                                                            'legend-dot output',
                                                        }),
                                                        v('输出: '),
                                                      ],
                                                      -1,
                                                    )),
                                                  T(
                                                    'span',
                                                    {
                                                      class: 'tooltip-val',
                                                      title: Y(
                                                        e.candidatesTokens,
                                                      ),
                                                    },
                                                    d(J(e.candidatesTokens)) +
                                                      ' Tokens',
                                                    9,
                                                    xa,
                                                  ),
                                                ]),
                                                T('div', Ca, [
                                                  s[31] ||
                                                    (s[31] = T(
                                                      'span',
                                                      {
                                                        class: 'tooltip-label',
                                                      },
                                                      [
                                                        T('i', {
                                                          class:
                                                            'legend-dot input',
                                                        }),
                                                        v('输入: '),
                                                      ],
                                                      -1,
                                                    )),
                                                  T(
                                                    'span',
                                                    {
                                                      class: 'tooltip-val',
                                                      title: Y(
                                                        e.uncachedInputTokens,
                                                      ),
                                                    },
                                                    d(
                                                      J(e.uncachedInputTokens),
                                                    ) + ' Tokens',
                                                    9,
                                                    Sa,
                                                  ),
                                                ]),
                                                T('div', Ia, [
                                                  s[32] ||
                                                    (s[32] = T(
                                                      'span',
                                                      {
                                                        class: 'tooltip-label',
                                                      },
                                                      [
                                                        T('i', {
                                                          class:
                                                            'legend-dot cache',
                                                        }),
                                                        v('缓存输入: '),
                                                      ],
                                                      -1,
                                                    )),
                                                  T(
                                                    'span',
                                                    {
                                                      class: 'tooltip-val',
                                                      title: Y(
                                                        e.cacheHitTokens,
                                                      ),
                                                    },
                                                    d(J(e.cacheHitTokens)) +
                                                      ' Tokens',
                                                    9,
                                                    _a,
                                                  ),
                                                ]),
                                                s[34] ||
                                                  (s[34] = T(
                                                    'div',
                                                    {
                                                      class: 'tooltip-divider',
                                                    },
                                                    null,
                                                    -1,
                                                  )),
                                                T('div', Ma, [
                                                  s[33] ||
                                                    (s[33] = T(
                                                      'span',
                                                      {
                                                        class: 'tooltip-label',
                                                      },
                                                      '总计:',
                                                      -1,
                                                    )),
                                                  T(
                                                    'span',
                                                    {
                                                      class: 'tooltip-val',
                                                      title: Y(e.totalTokens),
                                                    },
                                                    d(J(e.totalTokens)) +
                                                      ' Tokens',
                                                    9,
                                                    Da,
                                                  ),
                                                ]),
                                              ]),
                                            ]),
                                          ]),
                                          default: n(() => [
                                            T('div', $a, [
                                              T(
                                                'span',
                                                {
                                                  class: 'bar output',
                                                  style: r(
                                                    j(e.candidatesTokens),
                                                  ),
                                                },
                                                null,
                                                4,
                                              ),
                                              T(
                                                'span',
                                                {
                                                  class: 'bar input',
                                                  style: r(
                                                    j(e.uncachedInputTokens),
                                                  ),
                                                },
                                                null,
                                                4,
                                              ),
                                              T(
                                                'span',
                                                {
                                                  class: 'bar cache',
                                                  style: r(j(e.cacheHitTokens)),
                                                },
                                                null,
                                                4,
                                              ),
                                            ]),
                                          ]),
                                          _: 2,
                                        },
                                        1024,
                                      ),
                                      T('strong', null, d(J(e.totalTokens)), 1),
                                    ],
                                  )
                                ),
                              ),
                              128,
                            )),
                            0 === O.value.length
                              ? (i(),
                                x('div', Ha, ' 当前时间范围内暂无模型用量 '))
                              : k('', !0),
                          ]),
                        ]),
                        T('section', Ra, [
                          s[36] ||
                            (s[36] = T(
                              'header',
                              { class: 'card-header' },
                              [
                                T('div', null, [
                                  T('h3', null, '模型明细'),
                                  T(
                                    'p',
                                    null,
                                    '缓存命中率仅以输入 Token 为可缓存基数',
                                  ),
                                ]),
                              ],
                              -1,
                            )),
                          T('div', La, [
                            g(
                              G,
                              {
                                data: O.value,
                                class: 'saas-table',
                                style: { width: '100%' },
                              },
                              {
                                default: n(() => [
                                  g(F, {
                                    prop: 'model',
                                    label: '模型',
                                    'min-width': '190',
                                  }),
                                  g(F, {
                                    prop: 'adapterName',
                                    label: '适配器实例',
                                    'min-width': '150',
                                  }),
                                  g(
                                    F,
                                    {
                                      label: '调用',
                                      width: '100',
                                      align: 'right',
                                      prop: 'callCount',
                                      sortable: '',
                                    },
                                    {
                                      default: n((e) => [
                                        v(d(Y(e.row.callCount)), 1),
                                      ]),
                                      _: 1,
                                    },
                                  ),
                                  g(
                                    F,
                                    {
                                      label: '输入',
                                      width: '120',
                                      align: 'right',
                                      prop: 'promptTokens',
                                      sortable: '',
                                    },
                                    {
                                      default: n((e) => [
                                        v(d(J(e.row.promptTokens)), 1),
                                      ]),
                                      _: 1,
                                    },
                                  ),
                                  g(
                                    F,
                                    {
                                      label: '输出',
                                      width: '120',
                                      align: 'right',
                                      prop: 'candidatesTokens',
                                      sortable: '',
                                    },
                                    {
                                      default: n((e) => [
                                        v(d(J(e.row.candidatesTokens)), 1),
                                      ]),
                                      _: 1,
                                    },
                                  ),
                                  g(
                                    F,
                                    {
                                      label: '缓存读取',
                                      width: '130',
                                      align: 'right',
                                      prop: 'cacheHitTokens',
                                      sortable: '',
                                    },
                                    {
                                      default: n((e) => [
                                        v(d(J(e.row.cacheHitTokens)), 1),
                                      ]),
                                      _: 1,
                                    },
                                  ),
                                  g(
                                    F,
                                    {
                                      label: '命中率',
                                      width: '120',
                                      align: 'right',
                                      prop: 'cacheHitRate',
                                      sortable: '',
                                    },
                                    {
                                      default: n((e) => [
                                        T(
                                          'span',
                                          Aa,
                                          d(e.row.cacheHitRate) + '%',
                                          1,
                                        ),
                                      ]),
                                      _: 1,
                                    },
                                  ),
                                ]),
                                _: 1,
                              },
                              8,
                              ['data'],
                            ),
                          ]),
                        ]),
                      ],
                      64,
                    )),
            ])
          )
        }
      },
    },
    [['__scopeId', 'data-v-23d11dcc']],
  ),
  Ua = { class: 'trace-view-container' },
  Na = { class: 'row-flex' },
  Ea = { key: 0, class: 'left-col-4' },
  Oa = { class: 'saas-card list-card' },
  Va = { class: 'filter-bar border-b' },
  qa = { class: 'filter-row' },
  Fa = { class: 'filter-row mt-sm' },
  Pa = { class: 'turns-list-scroll' },
  Wa = { key: 0, class: 'empty-state' },
  Ba = ['onClick'],
  ja = { class: 'turn-header' },
  Ja = ['title'],
  Ya = { class: 'turn-meta' },
  Za = ['onClick'],
  Ga = { class: 'turn-footer' },
  Ka = { class: 'turn-ip-meta' },
  Xa = { class: 'turn-tokens' },
  Qa = { key: 1, class: 'right-col-8' },
  es = { class: 'saas-card timeline-card' },
  as = { class: 'card-header border-b' },
  ss = { class: 'header-title-wrapper' },
  ts = { class: 'card-title' },
  ls = { key: 0, class: 'total-tokens-badge' },
  ns = { key: 0, class: 'trace-empty-container' },
  os = { key: 1, class: 'trace-timeline-scroll' },
  is = { class: 'timeline-container' },
  rs = { class: 'node-indicator' },
  cs = { key: 0, class: 'node-line' },
  ds = { class: 'node-content-card' },
  us = { class: 'step-card-header' },
  ps = { class: 'step-time' },
  vs = { key: 0, class: 'step-model-tag' },
  ms = { class: 'step-details' },
  fs = { class: 'step-title' },
  hs = { key: 0, class: 'llm-fields' },
  ks = { class: 'metric-row' },
  bs = { class: 'metric-item' },
  gs = { class: 'metric-item' },
  ws = { key: 0, class: 'metric-item latency' },
  Ts = { key: 1, class: 'metric-item tps' },
  ys = { key: 2, class: 'metric-item cache' },
  xs = { key: 3, class: 'metric-item cache-rate' },
  Cs = { key: 0, class: 'tools-called-box' },
  Ss = { class: 'tags-group' },
  Is = { key: 1, class: 'tool-fields' },
  _s = { class: 'code-editor-box' },
  Ms = { class: 'code-box-content' },
  Ds = { key: 0, class: 'loading-box' },
  $s = { key: 1, class: 'user-detail-profile' },
  Hs = { class: 'profile-header' },
  Rs = { class: 'user-meta-info' },
  Ls = { class: 'profile-user-id' },
  As = { class: 'profile-ip-badge' },
  zs = { class: 'profile-metrics' },
  Us = { class: 'metric-card-mini' },
  Ns = { class: 'mini-value' },
  Es = { class: 'metric-card-mini' },
  Os = { class: 'mini-value' },
  Vs = { class: 'metric-breakdown-row' },
  qs = { class: 'breakdown-item' },
  Fs = { class: 'breakdown-item' },
  Ps = { key: 0, class: 'fav-models-section' },
  Ws = { class: 'fav-model-list' },
  Bs = { class: 'fav-model-name' },
  js = { class: 'fav-model-calls' },
  Js = { class: 'profile-footer' },
  Ys = { class: 'last-active-time' },
  Zs = S(
    {
      __name: 'DashboardTrace',
      setup(l) {
        const o = R(),
          u = _(),
          m = s(!1),
          y = s(''),
          S = s(''),
          I = b(() => {
            const e = new Set()
            return (
              o.userRankings &&
                o.userRankings.length > 0 &&
                o.userRankings.forEach((a) => {
                  a.userId &&
                    'Direct Chat / API' !== a.userId &&
                    e.add(a.userId)
                }),
              o.toolCallTurns &&
                o.toolCallTurns.length > 0 &&
                o.toolCallTurns.forEach((a) => {
                  a.user && 'Direct Chat / API' !== a.user && e.add(a.user)
                }),
              Array.from(e)
            )
          }),
          M = b(() => {
            if (!o.activeTurn) return 0
            const e = o.activeTurn.steps
            if (e && e.length > 0)
              for (let a = e.length - 1; a >= 0; a--)
                if ('llm' === e[a].type) {
                  const s = e[a]
                  if (s.totalTokens) return s.totalTokens
                  if (
                    void 0 !== s.promptTokens ||
                    void 0 !== s.candidatesTokens
                  )
                    return (s.promptTokens || 0) + (s.candidatesTokens || 0)
                }
            return o.activeTurn.totalTokens || 0
          })
        let D = null
        function $() {
          L()
        }
        function H() {
          ;(D && clearTimeout(D),
            (D = setTimeout(() => {
              L()
            }, 400)))
        }
        function L() {
          const e = y.value ? y.value : S.value
          o.fetchTurns(e)
        }
        const A = s(!1),
          z = s(!1),
          U = s(null)
        function N(e) {
          return (
            !!e &&
            ![
              'Direct Chat / API',
              '标题生成 (Title)',
              '会话压缩 (Compress)',
              '定时任务 (Task)',
              '视觉分析 (Vision)',
              '系统内部任务 (System)',
            ].some((a) => e.includes(a))
          )
        }
        function E() {
          ;((A.value = !1), (U.value = null))
        }
        function O(e) {
          if (!e) return '-'
          const a = new Date(e)
          return `${a.getFullYear()}-${(a.getMonth() + 1).toString().padStart(2, '0')}-${a.getDate().toString().padStart(2, '0')} ${a.getHours().toString().padStart(2, '0')}:${a.getMinutes().toString().padStart(2, '0')}:${a.getSeconds().toString().padStart(2, '0')}`
        }
        function V() {
          m.value = window.innerWidth < 900
        }
        function q(e) {
          return e.sessionTitle
            ? e.sessionTitle
            : e.requestId && e.requestId.startsWith('system_title')
              ? '🏷️ 自动生成会话标题'
              : e.contactorId && u.contactors[e.contactorId]
                ? u.contactors[e.contactorId].name || '常规对话'
                : e.channelName ||
                  e.sourceLabel ||
                  ((a = e.requestId)
                    ? a.length > 20
                      ? a.substring(0, 8) + '...' + a.substring(a.length - 8)
                      : a
                    : '')
          var a
        }
        function F(e) {
          return e || 0 === e
            ? e.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
            : '0'
        }
        function P(e) {
          return void 0 !== e.tps && null !== e.tps
            ? e.tps
            : e.latency > 0 && e.candidatesTokens > 0
              ? Number(((1e3 * e.candidatesTokens) / e.latency).toFixed(1))
              : null
        }
        function W(e) {
          if (!e && 0 !== e) return '0'
          const a = Number(e)
          return a >= 1e6
            ? `${(a / 1e6).toFixed(1).replace(/\.0$/, '')}M`
            : a >= 1e3
              ? `${(a / 1e3).toFixed(1).replace(/\.0$/, '')}k`
              : String(a)
        }
        function B(e) {
          if (!e) return '-'
          const a = new Date(e)
          return `${a.getMonth() + 1}-${a.getDate()} ${a.getHours().toString().padStart(2, '0')}:${a.getMinutes().toString().padStart(2, '0')}:${a.getSeconds().toString().padStart(2, '0')}`
        }
        return (
          e(() => {
            ;(V(), window.addEventListener('resize', V))
          }),
          C(() => {
            window.removeEventListener('resize', V)
          }),
          (e, s) => {
            const l = h('el-option'),
              u = h('el-select'),
              b = h('el-input'),
              C = h('el-tag'),
              _ = h('el-skeleton'),
              D = h('el-dialog')
            return (
              i(),
              x(
                f,
                null,
                [
                  T('div', Ua, [
                    T('div', Na, [
                      m.value && t(o).activeTurn
                        ? k('', !0)
                        : (i(),
                          x('div', Ea, [
                            T('div', Oa, [
                              s[10] ||
                                (s[10] = T(
                                  'div',
                                  { class: 'card-header border-b' },
                                  [
                                    T(
                                      'span',
                                      { class: 'card-title' },
                                      '最近活跃会话流',
                                    ),
                                  ],
                                  -1,
                                )),
                              T('div', Va, [
                                T('div', qa, [
                                  g(
                                    u,
                                    {
                                      modelValue: y.value,
                                      'onUpdate:modelValue':
                                        s[0] || (s[0] = (e) => (y.value = e)),
                                      placeholder: '👤 点选活跃用户...',
                                      clearable: '',
                                      filterable: '',
                                      class: 'saas-filter-select',
                                      style: { width: '100%' },
                                      onChange: $,
                                    },
                                    {
                                      default: n(() => [
                                        g(l, {
                                          label: '全部活跃用户',
                                          value: '',
                                        }),
                                        (i(!0),
                                        x(
                                          f,
                                          null,
                                          a(
                                            I.value,
                                            (e) => (
                                              i(),
                                              p(
                                                l,
                                                { key: e, label: e, value: e },
                                                null,
                                                8,
                                                ['label', 'value'],
                                              )
                                            ),
                                          ),
                                          128,
                                        )),
                                      ]),
                                      _: 1,
                                    },
                                    8,
                                    ['modelValue'],
                                  ),
                                ]),
                                T('div', Fa, [
                                  g(
                                    b,
                                    {
                                      modelValue: S.value,
                                      'onUpdate:modelValue':
                                        s[1] || (s[1] = (e) => (S.value = e)),
                                      placeholder: '🔍 匹配会话主题/IP/ID...',
                                      clearable: '',
                                      class: 'saas-filter-input',
                                      onInput: H,
                                    },
                                    {
                                      prefix: n(
                                        () =>
                                          s[4] ||
                                          (s[4] = [
                                            T(
                                              'i',
                                              {
                                                class:
                                                  'fa-solid fa-magnifying-glass',
                                              },
                                              null,
                                              -1,
                                            ),
                                          ]),
                                      ),
                                      _: 1,
                                    },
                                    8,
                                    ['modelValue'],
                                  ),
                                ]),
                              ]),
                              T('div', Pa, [
                                g(
                                  _,
                                  {
                                    loading:
                                      t(o).loadingTurns &&
                                      0 === t(o).toolCallTurns.length,
                                    animated: '',
                                    rows: 6,
                                    style: { padding: '10px' },
                                  },
                                  {
                                    default: n(() => [
                                      0 === t(o).toolCallTurns.length
                                        ? (i(), x('div', Wa, ' 暂无对话记录 '))
                                        : k('', !0),
                                      (i(!0),
                                      x(
                                        f,
                                        null,
                                        a(
                                          t(o).toolCallTurns,
                                          (e) => (
                                            i(),
                                            x(
                                              'div',
                                              {
                                                key: e.requestId,
                                                onClick: (a) =>
                                                  t(o).selectTurn(e),
                                                class: c([
                                                  'turn-item',
                                                  {
                                                    active:
                                                      t(o).activeTurn
                                                        ?.requestId ===
                                                      e.requestId,
                                                  },
                                                ]),
                                              },
                                              [
                                                T('div', ja, [
                                                  T(
                                                    'span',
                                                    {
                                                      class: 'turn-id',
                                                      title: e.requestId,
                                                    },
                                                    d(q(e)),
                                                    9,
                                                    Ja,
                                                  ),
                                                  g(
                                                    C,
                                                    {
                                                      size: 'small',
                                                      type:
                                                        e.stepsCount > 1
                                                          ? 'danger'
                                                          : 'info',
                                                      class: 'turn-tag',
                                                      effect: 'plain',
                                                    },
                                                    {
                                                      default: n(() => [
                                                        v(
                                                          d(
                                                            e.stepsCount > 1
                                                              ? '递归多步'
                                                              : '单步',
                                                          ),
                                                          1,
                                                        ),
                                                      ]),
                                                      _: 2,
                                                    },
                                                    1032,
                                                    ['type'],
                                                  ),
                                                ]),
                                                T('div', Ya, [
                                                  T('span', null, [
                                                    s[5] ||
                                                      (s[5] = T(
                                                        'i',
                                                        {
                                                          class:
                                                            'fa-solid fa-user',
                                                        },
                                                        null,
                                                        -1,
                                                      )),
                                                    T(
                                                      'a',
                                                      {
                                                        href: '#',
                                                        class: c([
                                                          'user-profile-link',
                                                          {
                                                            'disabled-link': !N(
                                                              e.user,
                                                            ),
                                                          },
                                                        ]),
                                                        onClick: w(
                                                          (a) =>
                                                            (async function (
                                                              e,
                                                            ) {
                                                              if (N(e)) {
                                                                ;((A.value =
                                                                  !0),
                                                                  (z.value =
                                                                    !0),
                                                                  (U.value =
                                                                    null))
                                                                try {
                                                                  const a =
                                                                    await o.fetchUserDetail(
                                                                      e,
                                                                    )
                                                                  a &&
                                                                    (U.value =
                                                                      a)
                                                                } catch (a) {
                                                                } finally {
                                                                  z.value = !1
                                                                }
                                                              }
                                                            })(e.user),
                                                          ['stop'],
                                                        ),
                                                      },
                                                      d(e.user),
                                                      11,
                                                      Za,
                                                    ),
                                                  ]),
                                                  T('span', null, [
                                                    s[6] ||
                                                      (s[6] = T(
                                                        'i',
                                                        {
                                                          class:
                                                            'fa-solid fa-route',
                                                        },
                                                        null,
                                                        -1,
                                                      )),
                                                    v(
                                                      ' ' +
                                                        d(
                                                          e.sourceLabel ||
                                                            '未知来源',
                                                        ),
                                                      1,
                                                    ),
                                                  ]),
                                                ]),
                                                T('div', Ga, [
                                                  T('span', null, [
                                                    s[7] ||
                                                      (s[7] = T(
                                                        'i',
                                                        {
                                                          class:
                                                            'fa-regular fa-clock',
                                                        },
                                                        null,
                                                        -1,
                                                      )),
                                                    v(
                                                      ' ' + d(B(e.createdAt)),
                                                      1,
                                                    ),
                                                  ]),
                                                  T('span', Ka, [
                                                    s[8] ||
                                                      (s[8] = T(
                                                        'i',
                                                        {
                                                          class:
                                                            'fa-solid fa-earth-asia',
                                                        },
                                                        null,
                                                        -1,
                                                      )),
                                                    v(
                                                      ' ' +
                                                        d(e.userIp || '未知'),
                                                      1,
                                                    ),
                                                  ]),
                                                  T('span', Xa, [
                                                    s[9] ||
                                                      (s[9] = T(
                                                        'i',
                                                        {
                                                          class:
                                                            'fa-solid fa-coins',
                                                        },
                                                        null,
                                                        -1,
                                                      )),
                                                    v(
                                                      ' ' + d(W(e.totalTokens)),
                                                      1,
                                                    ),
                                                  ]),
                                                ]),
                                              ],
                                              10,
                                              Ba,
                                            )
                                          ),
                                        ),
                                        128,
                                      )),
                                    ]),
                                    _: 1,
                                  },
                                  8,
                                  ['loading'],
                                ),
                              ]),
                            ]),
                          ])),
                      !m.value || t(o).activeTurn
                        ? (i(),
                          x('div', Qa, [
                            T('div', es, [
                              T('div', as, [
                                T('div', ss, [
                                  m.value
                                    ? (i(),
                                      x(
                                        'button',
                                        {
                                          key: 0,
                                          class: 'back-btn',
                                          onClick:
                                            s[2] ||
                                            (s[2] = (e) =>
                                              (t(o).activeTurn = null)),
                                          'aria-label': '返回',
                                        },
                                        s[11] ||
                                          (s[11] = [
                                            T(
                                              'i',
                                              {
                                                class:
                                                  'fa-solid fa-chevron-left',
                                              },
                                              null,
                                              -1,
                                            ),
                                            v(' 返回 '),
                                          ]),
                                      ))
                                    : k('', !0),
                                  T(
                                    'span',
                                    ts,
                                    d(
                                      m.value ? '级联链路' : '调用级联链路分析',
                                    ),
                                    1,
                                  ),
                                ]),
                                t(o).activeTurn
                                  ? (i(),
                                    x('span', ls, [
                                      v(d(m.value ? '' : '总 Token: '), 1),
                                      T('strong', null, d(W(M.value)), 1),
                                    ]))
                                  : k('', !0),
                              ]),
                              t(o).activeTurn
                                ? (i(),
                                  x('div', os, [
                                    g(
                                      _,
                                      {
                                        loading:
                                          t(o).loadingTrace &&
                                          (!t(o).activeTurn.steps ||
                                            0 === t(o).activeTurn.steps.length),
                                        animated: '',
                                        rows: 6,
                                        style: { padding: '16px' },
                                      },
                                      {
                                        default: n(() => [
                                          T('div', is, [
                                            (i(!0),
                                            x(
                                              f,
                                              null,
                                              a(
                                                t(o).activeTurn.steps,
                                                (e, l) => (
                                                  i(),
                                                  x(
                                                    'div',
                                                    {
                                                      key: l,
                                                      class: 'timeline-node',
                                                    },
                                                    [
                                                      T('div', rs, [
                                                        T(
                                                          'div',
                                                          {
                                                            class: c([
                                                              'node-dot',
                                                              e.type,
                                                            ]),
                                                          },
                                                          [
                                                            T(
                                                              'i',
                                                              {
                                                                class: c(
                                                                  'tool' ===
                                                                    e.type
                                                                    ? 'fa-solid fa-wrench'
                                                                    : 'fa-solid fa-brain',
                                                                ),
                                                              },
                                                              null,
                                                              2,
                                                            ),
                                                          ],
                                                          2,
                                                        ),
                                                        l <
                                                        t(o).activeTurn.steps
                                                          .length -
                                                          1
                                                          ? (i(), x('div', cs))
                                                          : k('', !0),
                                                      ]),
                                                      T('div', ds, [
                                                        T('div', us, [
                                                          T(
                                                            'span',
                                                            ps,
                                                            d(B(e.timestamp)),
                                                            1,
                                                          ),
                                                          T(
                                                            'span',
                                                            {
                                                              class: c([
                                                                'step-badge',
                                                                e.type,
                                                              ]),
                                                            },
                                                            d(
                                                              'tool' === e.type
                                                                ? 'Tool'
                                                                : 'Inference',
                                                            ),
                                                            3,
                                                          ),
                                                          e.model
                                                            ? (i(),
                                                              x(
                                                                'span',
                                                                vs,
                                                                d(e.model),
                                                                1,
                                                              ))
                                                            : k('', !0),
                                                          e.cacheHitTokens > 0
                                                            ? (i(),
                                                              p(
                                                                C,
                                                                {
                                                                  key: 1,
                                                                  size: 'small',
                                                                  type: 'success',
                                                                  effect:
                                                                    'light',
                                                                  class:
                                                                    'cache-badge',
                                                                },
                                                                {
                                                                  default: n(
                                                                    () => [
                                                                      s[13] ||
                                                                        (s[13] =
                                                                          T(
                                                                            'i',
                                                                            {
                                                                              class:
                                                                                'fa-solid fa-bolt',
                                                                            },
                                                                            null,
                                                                            -1,
                                                                          )),
                                                                      s[14] ||
                                                                        (s[14] =
                                                                          T(
                                                                            'span',
                                                                            {
                                                                              class:
                                                                                'desktop-only-inline',
                                                                            },
                                                                            ' 命中:',
                                                                            -1,
                                                                          )),
                                                                      T(
                                                                        'span',
                                                                        null,
                                                                        d(
                                                                          Math.round(
                                                                            (e.cacheHitTokens /
                                                                              (e.cacheHitTokens +
                                                                                e.cacheMissTokens)) *
                                                                              100,
                                                                          ),
                                                                        ) + '%',
                                                                        1,
                                                                      ),
                                                                    ],
                                                                  ),
                                                                  _: 2,
                                                                },
                                                                1024,
                                                              ))
                                                            : k('', !0),
                                                        ]),
                                                        T('div', ms, [
                                                          T(
                                                            'h4',
                                                            fs,
                                                            d(
                                                              'tool' === e.type
                                                                ? `执行工具: ${e.toolName}`
                                                                : '对话大模型推理',
                                                            ),
                                                            1,
                                                          ),
                                                          'llm' === e.type
                                                            ? (i(),
                                                              x('div', hs, [
                                                                T('div', ks, [
                                                                  T(
                                                                    'span',
                                                                    bs,
                                                                    [
                                                                      s[15] ||
                                                                        (s[15] =
                                                                          v(
                                                                            '输入 Token: ',
                                                                          )),
                                                                      T(
                                                                        'strong',
                                                                        null,
                                                                        d(
                                                                          e.promptTokens,
                                                                        ),
                                                                        1,
                                                                      ),
                                                                    ],
                                                                  ),
                                                                  T(
                                                                    'span',
                                                                    gs,
                                                                    [
                                                                      s[16] ||
                                                                        (s[16] =
                                                                          v(
                                                                            '输出 Token: ',
                                                                          )),
                                                                      T(
                                                                        'strong',
                                                                        null,
                                                                        d(
                                                                          e.candidatesTokens,
                                                                        ),
                                                                        1,
                                                                      ),
                                                                    ],
                                                                  ),
                                                                  e.ttft
                                                                    ? (i(),
                                                                      x(
                                                                        'span',
                                                                        ws,
                                                                        [
                                                                          s[17] ||
                                                                            (s[17] =
                                                                              v(
                                                                                ' 首响应延迟: ',
                                                                              )),
                                                                          T(
                                                                            'strong',
                                                                            null,
                                                                            d(
                                                                              e.ttft,
                                                                            ) +
                                                                              'ms',
                                                                            1,
                                                                          ),
                                                                        ],
                                                                      ))
                                                                    : k('', !0),
                                                                  P(e)
                                                                    ? (i(),
                                                                      x(
                                                                        'span',
                                                                        Ts,
                                                                        [
                                                                          s[18] ||
                                                                            (s[18] =
                                                                              v(
                                                                                ' 端到端吞吐: ',
                                                                              )),
                                                                          T(
                                                                            'strong',
                                                                            null,
                                                                            d(
                                                                              P(
                                                                                e,
                                                                              ),
                                                                            ) +
                                                                              ' tok/s',
                                                                            1,
                                                                          ),
                                                                        ],
                                                                      ))
                                                                    : k('', !0),
                                                                  void 0 !==
                                                                  e.cacheHitTokens
                                                                    ? (i(),
                                                                      x(
                                                                        'span',
                                                                        ys,
                                                                        [
                                                                          s[19] ||
                                                                            (s[19] =
                                                                              v(
                                                                                ' 缓存命中: ',
                                                                              )),
                                                                          T(
                                                                            'strong',
                                                                            {
                                                                              style:
                                                                                r(
                                                                                  {
                                                                                    color:
                                                                                      e.cacheHitTokens >
                                                                                      0
                                                                                        ? '#10b981'
                                                                                        : '#64748b',
                                                                                  },
                                                                                ),
                                                                            },
                                                                            d(
                                                                              F(
                                                                                e.cacheHitTokens,
                                                                              ),
                                                                            ),
                                                                            5,
                                                                          ),
                                                                        ],
                                                                      ))
                                                                    : k('', !0),
                                                                  void 0 !==
                                                                  e.cacheHitTokens
                                                                    ? (i(),
                                                                      x(
                                                                        'span',
                                                                        xs,
                                                                        [
                                                                          s[20] ||
                                                                            (s[20] =
                                                                              v(
                                                                                ' 缓存命中率: ',
                                                                              )),
                                                                          T(
                                                                            'strong',
                                                                            {
                                                                              style:
                                                                                r(
                                                                                  {
                                                                                    color:
                                                                                      e.cacheHitTokens >
                                                                                      0
                                                                                        ? '#10b981'
                                                                                        : '#64748b',
                                                                                  },
                                                                                ),
                                                                            },
                                                                            d(
                                                                              e.promptTokens >
                                                                                0
                                                                                ? Math.round(
                                                                                    (e.cacheHitTokens /
                                                                                      e.promptTokens) *
                                                                                      100,
                                                                                  )
                                                                                : 0,
                                                                            ) +
                                                                              '% ',
                                                                            5,
                                                                          ),
                                                                        ],
                                                                      ))
                                                                    : k('', !0),
                                                                ]),
                                                                e.toolsCalled &&
                                                                e.toolsCalled
                                                                  .length
                                                                  ? (i(),
                                                                    x(
                                                                      'div',
                                                                      Cs,
                                                                      [
                                                                        s[21] ||
                                                                          (s[21] =
                                                                            T(
                                                                              'span',
                                                                              {
                                                                                class:
                                                                                  'box-label',
                                                                              },
                                                                              [
                                                                                T(
                                                                                  'i',
                                                                                  {
                                                                                    class:
                                                                                      'fa-solid fa-code-branch',
                                                                                  },
                                                                                ),
                                                                                v(
                                                                                  ' 触发的后续工具:',
                                                                                ),
                                                                              ],
                                                                              -1,
                                                                            )),
                                                                        T(
                                                                          'div',
                                                                          Ss,
                                                                          [
                                                                            (i(
                                                                              !0,
                                                                            ),
                                                                            x(
                                                                              f,
                                                                              null,
                                                                              a(
                                                                                e.toolsCalled,
                                                                                (
                                                                                  e,
                                                                                ) => (
                                                                                  i(),
                                                                                  p(
                                                                                    C,
                                                                                    {
                                                                                      key: e,
                                                                                      size: 'small',
                                                                                      type: 'warning',
                                                                                      effect:
                                                                                        'dark',
                                                                                    },
                                                                                    {
                                                                                      default:
                                                                                        n(
                                                                                          () => [
                                                                                            v(
                                                                                              d(
                                                                                                e,
                                                                                              ),
                                                                                              1,
                                                                                            ),
                                                                                          ],
                                                                                        ),
                                                                                      _: 2,
                                                                                    },
                                                                                    1024,
                                                                                  )
                                                                                ),
                                                                              ),
                                                                              128,
                                                                            )),
                                                                          ],
                                                                        ),
                                                                      ],
                                                                    ))
                                                                  : k('', !0),
                                                              ]))
                                                            : k('', !0),
                                                          'tool' === e.type
                                                            ? (i(),
                                                              x('div', Is, [
                                                                T('div', _s, [
                                                                  s[22] ||
                                                                    (s[22] = T(
                                                                      'div',
                                                                      {
                                                                        class:
                                                                          'code-box-header',
                                                                      },
                                                                      [
                                                                        T(
                                                                          'span',
                                                                          null,
                                                                          '参数与返回值',
                                                                        ),
                                                                      ],
                                                                      -1,
                                                                    )),
                                                                  T('pre', Ms, [
                                                                    T(
                                                                      'code',
                                                                      null,
                                                                      '参数: ' +
                                                                        d(
                                                                          e.arguments,
                                                                        ) +
                                                                        '\n返回值: ' +
                                                                        d(
                                                                          e.output,
                                                                        ),
                                                                      1,
                                                                    ),
                                                                  ]),
                                                                ]),
                                                              ]))
                                                            : k('', !0),
                                                        ]),
                                                      ]),
                                                    ],
                                                  )
                                                ),
                                              ),
                                              128,
                                            )),
                                          ]),
                                        ]),
                                        _: 1,
                                      },
                                      8,
                                      ['loading'],
                                    ),
                                  ]))
                                : (i(),
                                  x(
                                    'div',
                                    ns,
                                    s[12] ||
                                      (s[12] = [
                                        T(
                                          'i',
                                          {
                                            class:
                                              'fa-solid fa-diagram-next empty-icon',
                                          },
                                          null,
                                          -1,
                                        ),
                                        T(
                                          'p',
                                          { class: 'empty-text' },
                                          '请在左侧选择一个对话查看级联链路',
                                          -1,
                                        ),
                                      ]),
                                  )),
                            ]),
                          ]))
                        : k('', !0),
                    ]),
                  ]),
                  g(
                    D,
                    {
                      modelValue: A.value,
                      'onUpdate:modelValue':
                        s[3] || (s[3] = (e) => (A.value = e)),
                      title: '👤 用户审计画像与详情',
                      width: '500px',
                      'align-center': '',
                      class: 'saas-dialog',
                      'before-close': E,
                    },
                    {
                      default: n(() => [
                        z.value
                          ? (i(),
                            x(
                              'div',
                              Ds,
                              s[23] ||
                                (s[23] = [
                                  T(
                                    'i',
                                    { class: 'fa-solid fa-spinner fa-spin' },
                                    null,
                                    -1,
                                  ),
                                  v(' 正在加载用户审计画像... '),
                                ]),
                            ))
                          : U.value
                            ? (i(),
                              x('div', $s, [
                                T('div', Hs, [
                                  s[25] ||
                                    (s[25] = T(
                                      'div',
                                      { class: 'avatar-circle' },
                                      [
                                        T('i', {
                                          class: 'fa-solid fa-user-tie',
                                        }),
                                      ],
                                      -1,
                                    )),
                                  T('div', Rs, [
                                    T('h3', Ls, d(U.value.userId), 1),
                                    T('span', As, [
                                      s[24] ||
                                        (s[24] = T(
                                          'i',
                                          { class: 'fa-solid fa-earth-asia' },
                                          null,
                                          -1,
                                        )),
                                      v(
                                        ' 最近活跃 IP: ' + d(U.value.lastIp),
                                        1,
                                      ),
                                    ]),
                                  ]),
                                ]),
                                T('div', zs, [
                                  T('div', Us, [
                                    s[26] ||
                                      (s[26] = T(
                                        'span',
                                        { class: 'mini-label' },
                                        '总计调用',
                                        -1,
                                      )),
                                    T(
                                      'span',
                                      Ns,
                                      d(F(U.value.totalCalls)) + ' 次',
                                      1,
                                    ),
                                  ]),
                                  T('div', Es, [
                                    s[27] ||
                                      (s[27] = T(
                                        'span',
                                        { class: 'mini-label' },
                                        '累计消耗 Tokens',
                                        -1,
                                      )),
                                    T('span', Os, d(F(U.value.totalTokens)), 1),
                                  ]),
                                ]),
                                T('div', Vs, [
                                  T('div', qs, [
                                    s[28] ||
                                      (s[28] = T(
                                        'span',
                                        null,
                                        '输入 Token:',
                                        -1,
                                      )),
                                    T(
                                      'strong',
                                      null,
                                      d(F(U.value.promptTokens)),
                                      1,
                                    ),
                                  ]),
                                  T('div', Fs, [
                                    s[29] ||
                                      (s[29] = T(
                                        'span',
                                        null,
                                        '输出 Token:',
                                        -1,
                                      )),
                                    T(
                                      'strong',
                                      null,
                                      d(F(U.value.candidatesTokens)),
                                      1,
                                    ),
                                  ]),
                                ]),
                                U.value.favModels &&
                                U.value.favModels.length > 0
                                  ? (i(),
                                    x('div', Ps, [
                                      s[30] ||
                                        (s[30] = T(
                                          'h4',
                                          { class: 'section-title-mini' },
                                          [
                                            T('i', {
                                              class: 'fa-solid fa-heart-pulse',
                                            }),
                                            v(' 渠道与模型偏好 Top 5 '),
                                          ],
                                          -1,
                                        )),
                                      T('div', Ws, [
                                        (i(!0),
                                        x(
                                          f,
                                          null,
                                          a(
                                            U.value.favModels,
                                            (e) => (
                                              i(),
                                              x(
                                                'div',
                                                {
                                                  key: e.model,
                                                  class: 'fav-model-item',
                                                },
                                                [
                                                  T('span', Bs, d(e.model), 1),
                                                  T(
                                                    'span',
                                                    js,
                                                    d(e.calls) + ' 次调用',
                                                    1,
                                                  ),
                                                ],
                                              )
                                            ),
                                          ),
                                          128,
                                        )),
                                      ]),
                                    ]))
                                  : k('', !0),
                                T('div', Js, [
                                  T('span', Ys, [
                                    s[31] ||
                                      (s[31] = T(
                                        'i',
                                        { class: 'fa-regular fa-clock' },
                                        null,
                                        -1,
                                      )),
                                    v(
                                      ' 最近活动: ' + d(O(U.value.lastActive)),
                                      1,
                                    ),
                                  ]),
                                ]),
                              ]))
                            : k('', !0),
                      ]),
                      _: 1,
                    },
                    8,
                    ['modelValue'],
                  ),
                ],
                64,
              )
            )
          }
        )
      },
    },
    [['__scopeId', 'data-v-4bdb4d48']],
  ),
  Gs = { class: 'failures-view-container' },
  Ks = { class: 'top-overview-row' },
  Xs = { class: 'saas-card stat-summary-card' },
  Qs = { class: 'card-body failure-metrics-body' },
  et = { class: 'metric-item-block' },
  at = { class: 'metric-value-row' },
  st = { class: 'metric-number text-danger' },
  tt = { class: 'metric-item-block' },
  lt = { class: 'metric-value-row' },
  nt = { class: 'metric-highlight' },
  ot = { class: 'saas-card chart-card' },
  it = { class: 'card-body chart-card-body' },
  rt = { class: 'saas-card table-card' },
  ct = { class: 'card-header table-header-bar' },
  dt = { class: 'header-left' },
  ut = { class: 'record-count-badge' },
  pt = { class: 'card-body p-none table-card-body' },
  vt = { class: 'table-responsive-wrapper' },
  mt = { class: 'time-text' },
  ft = { class: 'mono-text' },
  ht = { class: 'error-msg-text' },
  kt = S(
    {
      __name: 'DashboardFailures',
      setup(a) {
        const s = R()
        let c = null,
          m = null,
          f = null
        function w(e) {
          if (!e) return '-'
          const a = new Date(e)
          return `${(a.getMonth() + 1).toString().padStart(2, '0')}-${a.getDate().toString().padStart(2, '0')} ${a.getHours().toString().padStart(2, '0')}:${a.getMinutes().toString().padStart(2, '0')}:${a.getSeconds().toString().padStart(2, '0')}`
        }
        const S = b(() => {
            const e = (s.failures || []).reduce((e, a) => {
              const s = a.errorMessage || 'Unknown Error'
              let t = 'Other Failures'
              return (
                s.includes('429') || s.toLowerCase().includes('rate limit')
                  ? (t = 'Rate Limit (429)')
                  : s.includes('504') || s.toLowerCase().includes('timeout')
                    ? (t = 'Network Timeout (504)')
                    : s.includes('401') || s.toLowerCase().includes('auth')
                      ? (t = 'Auth Failure (401)')
                      : s.includes('400') || s.includes('未找到指定的适配器')
                        ? (t = 'Config/Adapter Error (400)')
                        : s.toLowerCase().includes('aborted') &&
                          (t = 'Client Aborted'),
                (e[t] = (e[t] || 0) + 1),
                e
              )
            }, {})
            return Object.entries(e)
              .map(([e, a]) => ({ name: e, value: a }))
              .sort((e, a) => a.value - e.value)
          }),
          I = b(() => (0 === S.value.length ? '无故障运行' : S.value[0].name))
        function _() {
          const e = document.getElementById('error-chart')
          e &&
            e.clientWidth > 0 &&
            e.clientHeight > 0 &&
            ((c && !c.isDisposed()) || (c = D(e)))
        }
        function M() {
          if ((_(), !c)) return
          const e = (function () {
              const e =
                'undefined' != typeof document &&
                ('dark' ===
                  document.documentElement.getAttribute('data-theme') ||
                  document.documentElement.classList.contains('dark'))
              return {
                isDark: e,
                backgroundColor: 'transparent',
                textStyle: {
                  color: e ? '#94a3b8' : '#64748b',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                },
                tooltip: {
                  backgroundColor: e ? '#1e293b' : '#ffffff',
                  borderColor: e ? '#334155' : '#e2e8f0',
                  borderWidth: 1,
                  textStyle: {
                    color: e ? '#f8fafc' : '#0f172a',
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                  },
                  borderRadius: 8,
                  boxShadow: e
                    ? '0 4px 12px rgba(0, 0, 0, 0.4)'
                    : '0 4px 12px rgba(0, 0, 0, 0.05)',
                },
              }
            })(),
            a = S.value
          c.setOption(
            {
              backgroundColor: e.backgroundColor,
              textStyle: e.textStyle,
              tooltip: {
                ...e.tooltip,
                trigger: 'item',
                formatter: '{b}: {c} 次 ({d}%)',
              },
              legend: {
                orient: 'vertical',
                right: '10%',
                top: 'center',
                itemWidth: 10,
                itemHeight: 10,
                textStyle: {
                  color: e.isDark ? '#cbd5e1' : '#475569',
                  fontSize: 12,
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                },
              },
              color: ['#f43f5e', '#f59e0b', '#a855f7', '#3b82f6', '#64748b'],
              series: [
                {
                  type: 'pie',
                  radius: ['48%', '82%'],
                  center: ['32%', '50%'],
                  avoidLabelOverlap: !1,
                  data: a.length > 0 ? a : [{ name: '无故障运行', value: 0 }],
                  itemStyle: {
                    borderRadius: 6,
                    borderColor: e.isDark ? '#1e293b' : '#ffffff',
                    borderWidth: 2,
                  },
                  label: { show: !1 },
                  emphasis: {
                    label: { show: !0, fontSize: 13, fontWeight: 'bold' },
                  },
                },
              ],
            },
            !0,
          )
        }
        function $() {
          const e = document.getElementById('error-chart')
          e &&
            e.clientWidth > 0 &&
            e.clientHeight > 0 &&
            (!c || c.isDisposed() ? (_(), M()) : c.resize())
        }
        return (
          l(
            () => s.failures,
            () => {
              u(() => {
                ;(_(), M())
              })
            },
            { deep: !0 },
          ),
          l(
            () => s.loadingFailures,
            (e) => {
              e ||
                u(() => {
                  ;(_(), M(), $())
                })
            },
          ),
          e(() => {
            u(() => {
              if (
                (_(),
                M(),
                'undefined' != typeof window &&
                  window.addEventListener('resize', $),
                'undefined' != typeof ResizeObserver)
              ) {
                f = new ResizeObserver(() => {
                  $()
                })
                const e = document.getElementById('error-chart')
                e && f.observe(e)
              }
              'undefined' != typeof document &&
                ((m = new MutationObserver(() => {
                  M()
                })),
                m.observe(document.documentElement, {
                  attributes: !0,
                  attributeFilter: ['data-theme', 'class'],
                }))
            })
          }),
          C(() => {
            ;('undefined' != typeof window &&
              window.removeEventListener('resize', $),
              f?.disconnect(),
              m?.disconnect(),
              c?.dispose(),
              (c = null))
          }),
          (e, a) => {
            const l = h('el-skeleton'),
              c = h('el-table-column'),
              u = h('el-tag'),
              m = h('el-button'),
              f = h('el-table')
            return (
              i(),
              x('div', Gs, [
                T('div', Ks, [
                  T('div', Xs, [
                    a[4] ||
                      (a[4] = T(
                        'div',
                        { class: 'card-header' },
                        [T('span', { class: 'card-title' }, '故障与异常概况')],
                        -1,
                      )),
                    T('div', Qs, [
                      T('div', et, [
                        a[1] ||
                          (a[1] = T(
                            'span',
                            { class: 'metric-label' },
                            '故障调用总数',
                            -1,
                          )),
                        T('div', at, [
                          T('span', st, d(t(s).failures.length), 1),
                          a[0] ||
                            (a[0] = T(
                              'span',
                              { class: 'metric-unit' },
                              '次',
                              -1,
                            )),
                        ]),
                      ]),
                      a[3] ||
                        (a[3] = T(
                          'div',
                          { class: 'metric-divider' },
                          null,
                          -1,
                        )),
                      T('div', tt, [
                        a[2] ||
                          (a[2] = T(
                            'span',
                            { class: 'metric-label' },
                            '主要异常类型',
                            -1,
                          )),
                        T('div', lt, [T('span', nt, d(I.value), 1)]),
                      ]),
                    ]),
                  ]),
                  T('div', ot, [
                    a[5] ||
                      (a[5] = T(
                        'div',
                        { class: 'card-header' },
                        [T('span', { class: 'card-title' }, '异常类型分布')],
                        -1,
                      )),
                    T('div', it, [
                      t(s).loadingFailures && 0 === t(s).failures.length
                        ? (i(), p(l, { key: 0, animated: '', rows: 3 }))
                        : k('', !0),
                      T(
                        'div',
                        {
                          id: 'error-chart',
                          class: 'chart-container',
                          style: r({
                            display:
                              t(s).loadingFailures && 0 === t(s).failures.length
                                ? 'none'
                                : 'block',
                          }),
                        },
                        null,
                        4,
                      ),
                    ]),
                  ]),
                ]),
                T('div', rt, [
                  T('div', ct, [
                    T('div', dt, [
                      a[6] ||
                        (a[6] = T(
                          'span',
                          { class: 'card-title' },
                          '异常诊断控制台',
                          -1,
                        )),
                      T('span', ut, d(t(s).failures.length) + ' 条记录', 1),
                    ]),
                  ]),
                  T('div', pt, [
                    t(s).loadingFailures && 0 === t(s).failures.length
                      ? (i(),
                        p(l, {
                          key: 0,
                          animated: '',
                          rows: 8,
                          style: { padding: '20px' },
                        }))
                      : k('', !0),
                    o(
                      T(
                        'div',
                        vt,
                        [
                          g(
                            f,
                            {
                              data: t(s).failures,
                              height: '100%',
                              size: 'default',
                              class: 'saas-table',
                              style: { width: '100%' },
                            },
                            {
                              default: n(() => [
                                g(
                                  c,
                                  { label: '发生时间', width: '160' },
                                  {
                                    default: n((e) => [
                                      T('span', mt, d(w(e.row.createdAt)), 1),
                                    ]),
                                    _: 1,
                                  },
                                ),
                                g(
                                  c,
                                  {
                                    prop: 'requestId',
                                    label: '请求 ID',
                                    width: '170',
                                    'show-overflow-tooltip': '',
                                  },
                                  {
                                    default: n((e) => [
                                      T('span', ft, d(e.row.requestId), 1),
                                    ]),
                                    _: 1,
                                  },
                                ),
                                g(
                                  c,
                                  {
                                    prop: 'model',
                                    label: '模型',
                                    width: '180',
                                    'show-overflow-tooltip': '',
                                  },
                                  {
                                    default: n((e) => [
                                      g(
                                        u,
                                        {
                                          size: 'small',
                                          type: 'danger',
                                          effect: 'plain',
                                          class: 'model-tag',
                                        },
                                        {
                                          default: n(() => [
                                            v(d(e.row.model), 1),
                                          ]),
                                          _: 2,
                                        },
                                        1024,
                                      ),
                                    ]),
                                    _: 1,
                                  },
                                ),
                                g(
                                  c,
                                  {
                                    prop: 'errorMessage',
                                    label: '错误信息',
                                    'min-width': '320',
                                    'show-overflow-tooltip': '',
                                  },
                                  {
                                    default: n((e) => [
                                      T(
                                        'span',
                                        ht,
                                        d(e.row.errorMessage || '未知异常'),
                                        1,
                                      ),
                                    ]),
                                    _: 1,
                                  },
                                ),
                                g(
                                  c,
                                  {
                                    label: '诊断',
                                    width: '120',
                                    align: 'center',
                                    fixed: 'right',
                                    'class-name': 'col-diagnosis',
                                  },
                                  {
                                    default: n((e) => [
                                      g(
                                        m,
                                        {
                                          size: 'small',
                                          type: 'danger',
                                          plain: '',
                                          class: 'trace-btn',
                                          onClick: (a) => {
                                            return (
                                              (t = e.row),
                                              (s.activeTrace = t),
                                              void (s.showTraceModal = !0)
                                            )
                                            var t
                                          },
                                        },
                                        {
                                          default: n(
                                            () =>
                                              a[7] || (a[7] = [v(' Trace ')]),
                                          ),
                                          _: 2,
                                        },
                                        1032,
                                        ['onClick'],
                                      ),
                                    ]),
                                    _: 1,
                                  },
                                ),
                              ]),
                              _: 1,
                            },
                            8,
                            ['data'],
                          ),
                        ],
                        512,
                      ),
                      [[y, !t(s).loadingFailures || t(s).failures.length > 0]],
                    ),
                  ]),
                ]),
              ])
            )
          }
        )
      },
    },
    [['__scopeId', 'data-v-bb37f7a1']],
  ),
  bt = { key: 0, class: 'trace-modal-body' },
  gt = { class: 'trace-info-grid' },
  wt = { class: 'info-row' },
  Tt = { class: 'info-value mono-text select-all' },
  yt = { class: 'info-row' },
  xt = { class: 'info-value' },
  Ct = { class: 'info-row' },
  St = { class: 'info-value' },
  It = { class: 'info-row' },
  _t = { class: 'info-value' },
  Mt = { class: 'error-summary-box' },
  Dt = { class: 'error-message' },
  $t = { class: 'stack-trace-container' },
  Ht = { class: 'stack-content' },
  Rt = S(
    {
      __name: 'TraceModal',
      setup(e) {
        const a = R()
        function s(e) {
          if (!e) return '-'
          const a = new Date(e)
          return `${a.getMonth() + 1}-${a.getDate()} ${a.getHours().toString().padStart(2, '0')}:${a.getMinutes().toString().padStart(2, '0')}:${a.getSeconds().toString().padStart(2, '0')}`
        }
        return (e, l) => {
          const o = h('el-tag'),
            r = h('el-dialog')
          return (
            i(),
            p(
              r,
              {
                modelValue: t(a).showTraceModal,
                'onUpdate:modelValue':
                  l[0] || (l[0] = (e) => (t(a).showTraceModal = e)),
                title: '异常堆栈诊断追踪',
                width: '680px',
                'align-center': '',
                class: 'saas-dialog',
                'destroy-on-close': '',
              },
              {
                default: n(() => [
                  t(a).activeTrace
                    ? (i(),
                      x('div', bt, [
                        T('div', gt, [
                          T('div', wt, [
                            l[1] ||
                              (l[1] = T(
                                'span',
                                { class: 'info-label' },
                                'Request ID',
                                -1,
                              )),
                            T('span', Tt, d(t(a).activeTrace.requestId), 1),
                          ]),
                          T('div', yt, [
                            l[2] ||
                              (l[2] = T(
                                'span',
                                { class: 'info-label' },
                                '服务实例',
                                -1,
                              )),
                            T(
                              'span',
                              xt,
                              d(t(a).activeTrace.provider || 'unknown'),
                              1,
                            ),
                          ]),
                          T('div', Ct, [
                            l[3] ||
                              (l[3] = T(
                                'span',
                                { class: 'info-label' },
                                '发生时间',
                                -1,
                              )),
                            T('span', St, d(s(t(a).activeTrace.createdAt)), 1),
                          ]),
                          T('div', It, [
                            l[4] ||
                              (l[4] = T(
                                'span',
                                { class: 'info-label' },
                                '异常模型',
                                -1,
                              )),
                            T('span', _t, [
                              g(
                                o,
                                {
                                  size: 'small',
                                  type: 'danger',
                                  effect: 'plain',
                                },
                                {
                                  default: n(() => [
                                    v(d(t(a).activeTrace.model), 1),
                                  ]),
                                  _: 1,
                                },
                              ),
                            ]),
                          ]),
                        ]),
                        T('div', Mt, [
                          l[5] ||
                            (l[5] = T(
                              'span',
                              { class: 'box-title' },
                              '错误摘要',
                              -1,
                            )),
                          T(
                            'p',
                            Dt,
                            d(
                              t(a).activeTrace.errorMessage ||
                                'No error message.',
                            ),
                            1,
                          ),
                        ]),
                        T('div', $t, [
                          l[6] ||
                            (l[6] = T(
                              'div',
                              { class: 'stack-header' },
                              [T('span', null, '异常追踪调用栈')],
                              -1,
                            )),
                          T('pre', Ht, [
                            T(
                              'code',
                              null,
                              d(
                                t(a).activeTrace.errorStack ||
                                  'No stack trace captured.',
                              ),
                              1,
                            ),
                          ]),
                        ]),
                      ]))
                    : k('', !0),
                ]),
                _: 1,
              },
              8,
              ['modelValue'],
            )
          )
        }
      },
    },
    [['__scopeId', 'data-v-d01fc364']],
  ),
  Lt = { class: 'dashboard-root' },
  At = { class: 'menu-list' },
  zt = { class: 'sidebar-footer' },
  Ut = { class: 'system-time' },
  Nt = { class: 'main-content' },
  Et = { class: 'header-bar' },
  Ot = { class: 'title-area' },
  Vt = { class: 'page-title' },
  qt = { class: 'header-actions' },
  Ft = { class: 'desktop-time-range-group' },
  Pt = { class: 'mobile-subpage-nav' },
  Wt = { class: 'mobile-nav-scroll' },
  Bt = { class: 'tab-pane-content fade-in' },
  jt = { class: 'tab-pane-content fade-in' },
  Jt = { class: 'tab-pane-content fade-in toolcalls-pane' },
  Yt = { class: 'tab-pane-content fade-in failures-pane' },
  Zt = S(
    {
      __name: 'DashboardView',
      setup(a) {
        const l = R(),
          r = H(),
          p = s(!1),
          m = s(!1),
          f = () => {
            'undefined' != typeof window &&
              (m.value = window.innerWidth <= 1024)
          },
          w = b(() => {
            switch (l.activeTab) {
              case 'overview':
                return '实时性能与 SLA 审计'
              case 'users':
                return '会话画像与调用分布'
              case 'toolcalls':
                return '会话与调用链路 Trace'
              case 'failures':
                return '异常分析与故障归因'
              default:
                return '审计大盘'
            }
          })
        let S = null,
          I = null
        function _(e) {
          ;((l.activeTab = e),
            'toolcalls' === e && (l.activeTurn = null),
            (p.value = !1),
            u(() => {
              ;(l.refreshData(),
                setTimeout(() => {
                  window.dispatchEvent(new Event('resize'))
                }, 80))
            }))
        }
        return (
          e(() => {
            if (!document.getElementById('font-awesome-cdn')) {
              const e = document.createElement('link')
              ;((e.rel = 'stylesheet'),
                (e.href =
                  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'),
                (e.id = 'font-awesome-cdn'),
                document.head.appendChild(e))
            }
            if (!document.getElementById('premium-fonts-cdn')) {
              const e = document.createElement('link')
              ;((e.rel = 'stylesheet'),
                (e.href =
                  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap'),
                (e.id = 'premium-fonts-cdn'),
                document.head.appendChild(e))
            }
            ;((I = setInterval(() => {
              const e = new Date()
              l.currentTime = `${e.toLocaleDateString()} ${e.toLocaleTimeString()}`
            }, 1e3)),
              l.fetchRealtimeStats(),
              (S = setInterval(l.fetchRealtimeStats, 5e3)),
              l.refreshData(),
              f(),
              window.addEventListener('resize', f))
          }),
          C(() => {
            ;(window.removeEventListener('resize', f),
              clearInterval(S),
              clearInterval(I),
              document.getElementById('font-awesome-cdn')?.remove(),
              document.getElementById('premium-fonts-cdn')?.remove())
          }),
          (e, a) => {
            const s = h('el-option'),
              u = h('el-select')
            return (
              i(),
              x('div', Lt, [
                p.value
                  ? (i(),
                    x('div', {
                      key: 0,
                      class: 'sidebar-overlay',
                      onClick: a[0] || (a[0] = (e) => (p.value = !1)),
                    }))
                  : k('', !0),
                T(
                  'div',
                  { class: c(['sidebar', { 'drawer-open': p.value }]) },
                  [
                    a[19] ||
                      (a[19] = T(
                        'div',
                        { class: 'logo-area' },
                        [
                          T('i', { class: 'fa-solid fa-chart-line logo-icon' }),
                          T('span', null, 'MioChat 审计大盘'),
                        ],
                        -1,
                      )),
                    T('div', At, [
                      T(
                        'div',
                        {
                          class: c([
                            'menu-item',
                            { active: 'overview' === t(l).activeTab },
                          ]),
                          onClick: a[1] || (a[1] = (e) => _('overview')),
                        },
                        a[12] ||
                          (a[12] = [
                            T(
                              'i',
                              { class: 'fa-solid fa-gauge-high' },
                              null,
                              -1,
                            ),
                            v(' 实时与性能分析 '),
                          ]),
                        2,
                      ),
                      T(
                        'div',
                        {
                          class: c([
                            'menu-item',
                            { active: 'users' === t(l).activeTab },
                          ]),
                          onClick: a[2] || (a[2] = (e) => _('users')),
                        },
                        a[13] ||
                          (a[13] = [
                            T(
                              'i',
                              { class: 'fa-solid fa-users-viewfinder' },
                              null,
                              -1,
                            ),
                            v(' 用户与会话画像 '),
                          ]),
                        2,
                      ),
                      T(
                        'div',
                        {
                          class: c([
                            'menu-item',
                            { active: 'toolcalls' === t(l).activeTab },
                          ]),
                          onClick: a[3] || (a[3] = (e) => _('toolcalls')),
                        },
                        a[14] ||
                          (a[14] = [
                            T(
                              'i',
                              { class: 'fa-solid fa-network-wired' },
                              null,
                              -1,
                            ),
                            v(' 会话与调用 Trace '),
                          ]),
                        2,
                      ),
                      T(
                        'div',
                        {
                          class: c([
                            'menu-item',
                            { active: 'failures' === t(l).activeTab },
                          ]),
                          onClick: a[4] || (a[4] = (e) => _('failures')),
                        },
                        a[15] ||
                          (a[15] = [
                            T(
                              'i',
                              { class: 'fa-solid fa-shield-halved' },
                              null,
                              -1,
                            ),
                            v(' 异常与故障归因 '),
                          ]),
                        2,
                      ),
                    ]),
                    T('div', zt, [
                      T(
                        'div',
                        {
                          class: 'back-to-app',
                          onClick:
                            a[5] || (a[5] = (e) => t(r).push('/settings')),
                          title: '返回设置概览',
                        },
                        a[16] ||
                          (a[16] = [
                            T(
                              'i',
                              { class: 'fa-solid fa-arrow-left-long' },
                              null,
                              -1,
                            ),
                            T('span', null, '返回设置概览', -1),
                          ]),
                      ),
                      T('div', Ut, [
                        a[17] ||
                          (a[17] = T(
                            'i',
                            { class: 'fa-regular fa-clock' },
                            null,
                            -1,
                          )),
                        v(' ' + d(t(l).currentTime), 1),
                      ]),
                      a[18] ||
                        (a[18] = T(
                          'div',
                          { class: 'server-status' },
                          [
                            T('span', { class: 'status-dot' }),
                            T('span', null, '后端服务已连接'),
                          ],
                          -1,
                        )),
                    ]),
                  ],
                  2,
                ),
                T('div', Nt, [
                  T('div', Et, [
                    T('div', Ot, [
                      T(
                        'button',
                        {
                          class: 'burger-btn',
                          onClick: a[6] || (a[6] = (e) => (p.value = !p.value)),
                          'aria-label': 'Toggle Navigation Menu',
                        },
                        a[20] ||
                          (a[20] = [
                            T('i', { class: 'fa-solid fa-bars' }, null, -1),
                          ]),
                      ),
                      T('div', Vt, [
                        T('h2', null, d(w.value), 1),
                        a[21] ||
                          (a[21] = T(
                            'p',
                            { class: 'subtitle' },
                            '实时监控与审计分析平台',
                            -1,
                          )),
                      ]),
                    ]),
                    T('div', qt, [
                      T('div', Ft, [
                        a[22] ||
                          (a[22] = T(
                            'span',
                            { class: 'time-range-label' },
                            '时间范围:',
                            -1,
                          )),
                        g(
                          u,
                          {
                            modelValue: t(l).timeRange,
                            'onUpdate:modelValue':
                              a[7] || (a[7] = (e) => (t(l).timeRange = e)),
                            size: 'default',
                            class: 'saas-time-select',
                            onChange: t(l).refreshData,
                            'aria-label': '时间范围',
                          },
                          {
                            default: n(() => [
                              g(s, { label: '24小时', value: '24h' }),
                              g(s, { label: '近7天', value: '7d' }),
                              g(s, { label: '近30天', value: '30d' }),
                              g(s, { label: '近90天', value: '90d' }),
                              g(s, { label: '近1年', value: '365d' }),
                            ]),
                            _: 1,
                          },
                          8,
                          ['modelValue', 'onChange'],
                        ),
                      ]),
                    ]),
                  ]),
                  T('div', Pt, [
                    T('div', Wt, [
                      T(
                        'button',
                        {
                          class: c([
                            'mobile-nav-pill',
                            { active: 'overview' === t(l).activeTab },
                          ]),
                          onClick: a[8] || (a[8] = (e) => _('overview')),
                        },
                        a[23] ||
                          (a[23] = [
                            T(
                              'i',
                              { class: 'fa-solid fa-gauge-high' },
                              null,
                              -1,
                            ),
                            T('span', null, '实时性能', -1),
                          ]),
                        2,
                      ),
                      T(
                        'button',
                        {
                          class: c([
                            'mobile-nav-pill',
                            { active: 'users' === t(l).activeTab },
                          ]),
                          onClick: a[9] || (a[9] = (e) => _('users')),
                        },
                        a[24] ||
                          (a[24] = [
                            T(
                              'i',
                              { class: 'fa-solid fa-users-viewfinder' },
                              null,
                              -1,
                            ),
                            T('span', null, '会话画像', -1),
                          ]),
                        2,
                      ),
                      T(
                        'button',
                        {
                          class: c([
                            'mobile-nav-pill',
                            { active: 'toolcalls' === t(l).activeTab },
                          ]),
                          onClick: a[10] || (a[10] = (e) => _('toolcalls')),
                        },
                        a[25] ||
                          (a[25] = [
                            T(
                              'i',
                              { class: 'fa-solid fa-network-wired' },
                              null,
                              -1,
                            ),
                            T('span', null, '调用 Trace', -1),
                          ]),
                        2,
                      ),
                      T(
                        'button',
                        {
                          class: c([
                            'mobile-nav-pill',
                            { active: 'failures' === t(l).activeTab },
                          ]),
                          onClick: a[11] || (a[11] = (e) => _('failures')),
                        },
                        a[26] ||
                          (a[26] = [
                            T(
                              'i',
                              { class: 'fa-solid fa-shield-halved' },
                              null,
                              -1,
                            ),
                            T('span', null, '异常归因', -1),
                          ]),
                        2,
                      ),
                    ]),
                  ]),
                  T(
                    'div',
                    {
                      class: c([
                        'view-body',
                        {
                          'flex-layout':
                            'toolcalls' === t(l).activeTab ||
                            'failures' === t(l).activeTab,
                        },
                      ]),
                    },
                    [
                      o(T('div', Bt, [g(ve)], 512), [
                        [y, 'overview' === t(l).activeTab],
                      ]),
                      o(T('div', jt, [g(za)], 512), [
                        [y, 'users' === t(l).activeTab],
                      ]),
                      o(T('div', Jt, [g(Zs)], 512), [
                        [y, 'toolcalls' === t(l).activeTab],
                      ]),
                      o(T('div', Yt, [g(kt)], 512), [
                        [y, 'failures' === t(l).activeTab],
                      ]),
                    ],
                    2,
                  ),
                ]),
                g(Rt),
              ])
            )
          }
        )
      },
    },
    [['__scopeId', 'data-v-d905469f']],
  )
export { Zt as default }
//# sourceMappingURL=DashboardView-CInZ1OEa.js.map
