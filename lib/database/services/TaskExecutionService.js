import prismaManager from '../prisma.js'

class TaskExecutionService {
  prisma = null
  async initialize() {
    if (!this.prisma) this.prisma = await prismaManager.initialize()
  }

  async create({
    taskId,
    round,
    agentId,
    sessionId,
    deliveryBindingId = null,
    triggerPrompt,
    inputMessages = [],
    status = 'running',
  }) {
    await this.initialize()
    return await this.prisma.taskExecution.create({
      data: {
        agentId,
        deliveryBindingId,
        inputMessages:
          typeof inputMessages === 'string'
            ? inputMessages
            : JSON.stringify(inputMessages),
        round,
        sessionId,
        startedAt: new Date(),
        status,
        taskId,
        triggerPrompt,
      },
    })
  }

  async complete(
    id,
    {
      outputChunks = [],
      finalAssistantMsg,
      deliveryBindingId,
      deliveryStatus,
      deliveryError = null,
    } = {},
  ) {
    await this.initialize()
    return await this.prisma.taskExecution.update({
      data: {
        ...(deliveryBindingId === undefined
          ? {}
          : { deliveryBindingId: deliveryBindingId || null }),
        deliveryError,
        ...(deliveryStatus ? { deliveryStatus } : {}),
        finalAssistantMsg:
          finalAssistantMsg === undefined
            ? undefined
            : typeof finalAssistantMsg === 'string'
              ? finalAssistantMsg
              : JSON.stringify(finalAssistantMsg),
        finishedAt: new Date(),
        outputChunks:
          typeof outputChunks === 'string'
            ? outputChunks
            : JSON.stringify(outputChunks),
        status: 'completed',
      },
      where: { id },
    })
  }

  async markRunning(id) {
    await this.initialize()
    return await this.prisma.taskExecution.updateMany({
      data: { status: 'running' },
      where: { id, status: 'queued' },
    })
  }

  async linkWorkItem(id, sessionWorkItemId) {
    if (!sessionWorkItemId) return null
    await this.initialize()
    return await this.prisma.taskExecution.update({
      data: { sessionWorkItemId: String(sessionWorkItemId) },
      where: { id },
    })
  }

  async findPendingWorkItems() {
    await this.initialize()
    return await this.prisma.taskExecution.findMany({
      orderBy: { startedAt: 'asc' },
      where: {
        sessionWorkItemId: { not: null },
        status: { in: ['queued', 'running', 'needs_attention'] },
      },
    })
  }

  async updateStatus(id, status) {
    await this.initialize()
    return await this.prisma.taskExecution.update({
      data: { status },
      where: { id },
    })
  }

  async fail(
    id,
    {
      errorMessage,
      outputChunks = [],
      deliveryStatus = 'failed',
      deliveryError,
    } = {},
  ) {
    await this.initialize()
    return await this.prisma.taskExecution.update({
      data: {
        deliveryError: deliveryError || errorMessage || null,
        deliveryStatus,
        errorMessage,
        finishedAt: new Date(),
        outputChunks:
          typeof outputChunks === 'string'
            ? outputChunks
            : JSON.stringify(outputChunks),
        status: 'failed',
      },
      where: { id },
    })
  }

  async getNextRound(taskId) {
    await this.initialize()
    const max = await this.prisma.taskExecution.aggregate({
      _max: { round: true },
      where: { taskId },
    })
    return (max._max.round || 0) + 1
  }
  async findUnsynced({ agentId, sessionId = null }) {
    await this.initialize()
    return await this.prisma.taskExecution.findMany({
      orderBy: { startedAt: 'asc' },
      where: {
        agentId,
        ...(sessionId ? { sessionId } : {}),
        status: { in: ['completed', 'failed'] },
        synced: false,
      },
    })
  }
  async markSynced(id) {
    await this.initialize()
    return await this.prisma.taskExecution.update({
      data: { synced: true },
      where: { id },
    })
  }
  async markAllSynced(ids) {
    if (!ids?.length) return
    await this.initialize()
    return await this.prisma.taskExecution.updateMany({
      data: { synced: true },
      where: { id: { in: ids } },
    })
  }
  async findByTaskId(taskId) {
    await this.initialize()
    return await this.prisma.taskExecution.findMany({
      orderBy: { startedAt: 'desc' },
      where: { taskId },
    })
  }
}

export default new TaskExecutionService()
