import sessions from '../../socket.io/services/sessions.js'
import prismaManager from '../../../database/prisma.js'

/**
 * 获取大盘实时运行状态 (在线用户、连接、Pending 运行请求)
 */
export async function getRealtimeStats(req, res) {
  try {
    const clients = sessions.getAllClients() || []
    const onlineConnections = clients.length
    const onlineUsers = sessions.pool ? sessions.pool.size : 0

    let pendingRequests = 0
    clients.forEach((client) => {
      if (client.activeEvents) {
        pendingRequests += client.activeEvents.size
      }
    })

    res.json({
      success: true,
      data: {
        onlineConnections,
        onlineUsers,
        pendingRequests,
      },
    })
  } catch (error) {
    global.logger?.error('[DashboardController] 获取实时指标失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

/**
 * 获取历史聚合用量与性能 SLA 审计指标
 */
export async function getHistoricalStats(req, res) {
  try {
    const { range = '24h', startTime, endTime } = req.query

    let start = new Date()
    let end = new Date()

    if (startTime && endTime) {
      start = new Date(Number(startTime))
      end = new Date(Number(endTime))
    } else {
      if (range === '24h') {
        start.setHours(start.getHours() - 24)
      } else if (range === '7d') {
        start.setDate(start.getDate() - 7)
      } else if (range === '30d') {
        start.setDate(start.getDate() - 30)
      } else {
        start.setHours(start.getHours() - 24) // 默认 24h
      }
    }

    await prismaManager.initialize()
    const prisma = prismaManager.getClient()

    // 1. 基础聚合指标 (全状态)
    const summary = await prisma.lLMCallLog.aggregate({
      where: {
        createdAt: { gte: start, lte: end },
      },
      _count: {
        id: true,
      },
      _sum: {
        promptTokens: true,
        candidatesTokens: true,
        thinkingTokens: true,
        totalTokens: true,
      },
    })

    // 统计各状态的调用数
    const statusCounts = await prisma.lLMCallLog.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: start, lte: end },
      },
      _count: {
        id: true,
      },
    })

    const statusMap = { SUCCESS: 0, FAILED: 0, ABORTED: 0 }
    statusCounts.forEach((item) => {
      statusMap[item.status] = item._count.id
    })

    const totalCalls = (statusMap.SUCCESS || 0) + (statusMap.FAILED || 0) + (statusMap.ABORTED || 0)
    const successRate = totalCalls > 0 ? (statusMap.SUCCESS || 0) / totalCalls : 1

    // 2. 交互性能 SLA 指标均值 (仅针对成功的调用)
    const averages = await prisma.lLMCallLog.aggregate({
      where: {
        status: 'SUCCESS',
        createdAt: { gte: start, lte: end },
      },
      _avg: {
        latency: true,
        ttft: true,
        tps: true,
      },
    })

    // 3. 模型与渠道的资源分布
    const modelDistribution = await prisma.lLMCallLog.groupBy({
      by: ['model', 'provider'],
      where: {
        createdAt: { gte: start, lte: end },
      },
      _count: {
        id: true,
      },
      _sum: {
        totalTokens: true,
        promptTokens: true,
        candidatesTokens: true,
        cacheHitTokens: true,
        cacheMissTokens: true,
      },
    })

    // 4. 用户活跃排行 (取 Top 10)
    const userRanking = await prisma.lLMCallLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: start, lte: end },
      },
      _count: {
        id: true,
      },
      _sum: {
        totalTokens: true,
      },
      orderBy: {
        _sum: {
          totalTokens: 'desc',
        },
      },
      take: 10,
    })

    // 5. 预设角色活跃排行 (取 Top 10)
    const presetRanking = await prisma.lLMCallLog.groupBy({
      by: ['presetName'],
      where: {
        createdAt: { gte: start, lte: end },
      },
      _count: {
        id: true,
      },
      _sum: {
        totalTokens: true,
      },
      orderBy: {
        _sum: {
          totalTokens: 'desc',
        },
      },
      take: 10,
    })

    // 6. 趋势走势 (时段分布)
    const interval = range === '24h' ? 'hour' : 'day'
    const dateFormat = interval === 'hour' ? '%Y-%m-%d %H:00:00' : '%Y-%m-%d'
    const startStr = start.toISOString()
    const endStr = end.toISOString()

    const rawTrends = await prisma.$queryRawUnsafe(`
      SELECT 
        strftime('${dateFormat}', created_at) AS time_bucket,
        status,
        COUNT(id) AS call_count,
        SUM(total_tokens) AS token_count,
        AVG(latency) AS avg_latency,
        AVG(ttft) AS avg_ttft
      FROM llm_call_logs
      WHERE created_at >= '${startStr}' AND created_at <= '${endStr}'
      GROUP BY time_bucket, status
      ORDER BY time_bucket ASC
    `)

    res.json({
      success: true,
      data: {
        summary: {
          totalCalls,
          successCalls: statusMap.SUCCESS || 0,
          failedCalls: statusMap.FAILED || 0,
          abortedCalls: statusMap.ABORTED || 0,
          successRate,
          totalTokens: summary._sum.totalTokens || 0,
          promptTokens: summary._sum.promptTokens || 0,
          candidatesTokens: summary._sum.candidatesTokens || 0,
          thinkingTokens: summary._sum.thinkingTokens || 0,
          avgLatency: Math.round(averages._avg.latency || 0),
          avgTtft: Math.round(averages._avg.ttft || 0),
          avgTps: parseFloat((averages._avg.tps || 0).toFixed(2)),
        },
        modelDistribution: modelDistribution.map((item) => ({
          model: item.model,
          provider: item.provider,
          callCount: item._count.id,
          totalTokens: item._sum.totalTokens || 0,
          promptTokens: item._sum.promptTokens || 0,
          candidatesTokens: item._sum.candidatesTokens || 0,
          cacheHitTokens: item._sum.cacheHitTokens || 0,
          cacheMissTokens: item._sum.cacheMissTokens || 0,
        })),
        userRanking: userRanking.map((item) => ({
          userId: item.userId || 'Direct Chat / API',
          callCount: item._count.id,
          totalTokens: item._sum.totalTokens || 0,
        })),
        presetRanking: presetRanking.map((item) => ({
          presetName: item.presetName || 'Direct Dialogue',
          callCount: item._count.id,
          totalTokens: item._sum.totalTokens || 0,
        })),
        trends: rawTrends.map((t) => ({
          timeBucket: t.time_bucket,
          status: t.status,
          callCount: Number(t.call_count),
          tokenCount: Number(t.token_count || 0),
          avgLatency: Math.round(t.avg_latency || 0),
          avgTtft: Math.round(t.avg_ttft || 0),
        })),
      },
    })
  } catch (error) {
    global.logger?.error('[DashboardController] 获取历史统计失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

/**
 * 分页获取故障/失败审计日志流
 */
export async function getFailureLogs(req, res) {
  try {
    const { limit = 50, offset = 0 } = req.query

    await prismaManager.initialize()
    const prisma = prismaManager.getClient()

    const failures = await prisma.lLMCallLog.findMany({
      where: {
        status: { not: 'SUCCESS' },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Number(limit),
      skip: Number(offset),
    })

    const total = await prisma.lLMCallLog.count({
      where: {
        status: { not: 'SUCCESS' },
      },
    })

    res.json({
      success: true,
      data: {
        logs: failures,
        total,
      },
    })
  } catch (error) {
    global.logger?.error('[DashboardController] 获取失败日志失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}
