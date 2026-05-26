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
      _avg: {
        ttft: true,
        tps: true,
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

    // 5.1 请求类型分布 (isStream)
    const streamCounts = await prisma.lLMCallLog.groupBy({
      by: ['isStream'],
      where: {
        createdAt: { gte: start, lte: end },
      },
      _count: {
        id: true,
      },
    })

    const streamMap = { stream: 0, nonStream: 0 }
    streamCounts.forEach((item) => {
      if (item.isStream === true || item.isStream === 1) {
        streamMap.stream = item._count.id
      } else {
        streamMap.nonStream = item._count.id
      }
    })

    // 5.2 流量类型分布 (trafficType)
    const trafficCounts = await prisma.lLMCallLog.groupBy({
      by: ['trafficType'],
      where: {
        createdAt: { gte: start, lte: end },
      },
      _count: {
        id: true,
      },
    })

    const trafficTypeDistribution = trafficCounts.map((item) => ({
      type: item.trafficType || 'ON_DEMAND',
      callCount: item._count.id,
    }))

    // 5.3 会话窗口排行 (contactorId) (取 Top 10)
    const sessionRanking = await prisma.lLMCallLog.groupBy({
      by: ['contactorId'],
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

    const rawTrends = await prisma.$queryRaw`
      SELECT 
        strftime(${dateFormat}, created_at) AS time_bucket,
        status,
        COUNT(id) AS call_count,
        SUM(total_tokens) AS token_count,
        AVG(latency) AS avg_latency,
        AVG(ttft) AS avg_ttft
      FROM llm_call_logs
      WHERE created_at >= ${start} AND created_at <= ${end}
      GROUP BY time_bucket, status
      ORDER BY time_bucket ASC
    `

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
          avgTtft: item._avg?.ttft ? Math.round(item._avg.ttft) : 0,
          avgTps: item._avg?.tps ? parseFloat(item._avg.tps.toFixed(2)) : 0,
        })),
        requestTypeDistribution: {
          streamCount: streamMap.stream,
          nonStreamCount: streamMap.nonStream,
        },
        trafficTypeDistribution,
        userRanking: userRanking.map((item) => ({
          userId: item.userId || 'Direct Chat / API',
          callCount: item._count.id,
          totalTokens: item._sum.totalTokens || 0,
        })),
        sessionRanking: sessionRanking.map((item) => ({
          contactorId: item.contactorId || 'Direct Dialogue',
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

/**
 * 获取最近的活跃对话列表 (用于 Tool Call 级联链左侧面板)
 */
export async function getRecentTurns(req, res) {
  try {
    const limit = Number(req.query.limit || 50)
    const offset = Number(req.query.offset || 0)

    await prismaManager.initialize()
    const prisma = prismaManager.getClient()

    // 采用 groupBy 对 requestId 进行聚合，同时查出关联的 userId、presetName 和产生的总 Token 以及多步计数
    const turns = await prisma.lLMCallLog.groupBy({
      by: ['requestId', 'userId', 'presetName', 'contactorId', 'sessionTitle'],
      _sum: {
        totalTokens: true
      },
      _count: {
        id: true
      },
      _max: {
        createdAt: true
      },
      orderBy: {
        _max: {
          createdAt: 'desc'
        }
      },
      take: limit,
      skip: offset
    })

    // 统计总 requestId 数量作为分页总量
    const totalGroup = await prisma.lLMCallLog.groupBy({
      by: ['requestId']
    })
    const total = totalGroup.length

    res.json({
      success: true,
      data: {
        turns: turns.map(t => ({
          requestId: t.requestId,
          userId: t.userId || 'Direct Chat / API',
          presetName: t.presetName || 'Direct Dialogue',
          contactorId: t.contactorId,
          sessionTitle: t.sessionTitle || null,
          createdAt: t._max.createdAt ? t._max.createdAt.getTime() : Date.now(),
          totalTokens: t._sum.totalTokens || 0,
          stepsCount: t._count.id
        })),
        total
      }
    })
  } catch (error) {
    global.logger?.error('[DashboardController] 获取最近对话列表失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

/**
 * 获取特定 requestId 的级联追踪链路
 */
export async function getTurnTrace(req, res) {
  try {
    const { requestId } = req.params
    if (!requestId) {
      return res.status(400).json({ success: false, error: 'requestId is required' })
    }

    await prismaManager.initialize()
    const prisma = prismaManager.getClient()

    // 查询该请求下的所有大模型调用日志，按 id 升序（即调用顺序）排列
    const llmCalls = await prisma.lLMCallLog.findMany({
      where: { requestId },
      orderBy: { id: 'asc' }
    })

    if (llmCalls.length === 0) {
      return res.status(404).json({ success: false, error: 'Request trace not found' })
    }

    const steps = []
    let stepIndex = 1

    for (const call of llmCalls) {
      // 1. 解析当前步骤调用的工具列表
      let toolsCalled = []
      try {
        if (call.toolsCalled) {
          toolsCalled = JSON.parse(call.toolsCalled)
        }
      } catch (e) {
        toolsCalled = []
      }

      // 2. 压入大模型调用步骤
      steps.push({
        stepIndex: stepIndex++,
        type: 'llm',
        timestamp: call.createdAt.getTime(),
        provider: call.provider,
        model: call.model,
        promptTokens: call.promptTokens,
        candidatesTokens: call.candidatesTokens,
        cacheHitTokens: call.cacheHitTokens || 0,
        cacheMissTokens: call.cacheMissTokens || 0,
        ttft: call.ttft || null,
        toolsCalled
      })

      // 3. 如果当前步骤触发了工具，动态合成对应的 tool 步骤
      let toolDetails = []
      try {
        if (call.toolDetails) {
          toolDetails = JSON.parse(call.toolDetails)
        }
      } catch (e) {
        toolDetails = []
      }

      if (toolDetails.length > 0) {
        for (const detail of toolDetails) {
          steps.push({
            stepIndex: stepIndex++,
            type: 'tool',
            timestamp: call.createdAt.getTime() + 500, // 在 LLM 调用后推迟 500ms 作为模拟执行耗时
            toolName: detail.name,
            arguments: typeof detail.arguments === 'string' ? detail.arguments : JSON.stringify(detail.arguments),
            output: typeof detail.output === 'string' ? detail.output : JSON.stringify(detail.output)
          })
        }
      } else if (toolsCalled.length > 0) {
        // 兼容没有详细信息时的旧数据
        for (const toolName of toolsCalled) {
          steps.push({
            stepIndex: stepIndex++,
            type: 'tool',
            timestamp: call.createdAt.getTime() + 500,
            toolName,
            arguments: '{}',
            output: '执行完毕'
          })
        }
      }
    }

    res.json({
      success: true,
      data: {
        requestId,
        userId: llmCalls[0].userId || 'Direct Chat / API',
        totalTokens: llmCalls.reduce((sum, c) => sum + (c.totalTokens || 0), 0),
        steps
      }
    })
  } catch (error) {
    global.logger?.error('[DashboardController] 获取链路详情失败:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}
