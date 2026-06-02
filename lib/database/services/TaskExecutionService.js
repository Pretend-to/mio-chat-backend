import prismaManager from '../prisma.js'

class TaskExecutionService {
  constructor() {
    this.prisma = null
  }

  async initialize() {
    if (!this.prisma) {
      await prismaManager.initialize()
      this.prisma = prismaManager.getClient()
    }
  }

  /**
   * 创建一条新的执行记录
   * @returns {Promise<Object>} 创建的 TaskExecution 记录
   */
  async create({ taskId, round, userId, contactorId, provider, model, triggerPrompt, inputMessages }) {
    await this.initialize()
    return await this.prisma.taskExecution.create({
      data: {
        taskId,
        round,
        userId,
        contactorId,
        provider,
        model,
        triggerPrompt,
        inputMessages: typeof inputMessages === 'string' ? inputMessages : JSON.stringify(inputMessages),
        status: 'running',
        startedAt: new Date(),
      },
    })
  }

  /**
   * 标记执行完成，写入原始 chunks 和组装后的 assistant 消息
   */
  async complete(id, { outputChunks, finalAssistantMsg }) {
    await this.initialize()
    return await this.prisma.taskExecution.update({
      where: { id },
      data: {
        outputChunks: typeof outputChunks === 'string' ? outputChunks : JSON.stringify(outputChunks),
        finalAssistantMsg: finalAssistantMsg !== undefined
          ? (typeof finalAssistantMsg === 'string' ? finalAssistantMsg : JSON.stringify(finalAssistantMsg))
          : undefined,
        status: 'completed',
        finishedAt: new Date(),
      },
    })
  }

  /**
   * 标记执行失败
   */
  async fail(id, { errorMessage, outputChunks }) {
    await this.initialize()
    return await this.prisma.taskExecution.update({
      where: { id },
      data: {
        errorMessage,
        outputChunks: outputChunks !== undefined
          ? (typeof outputChunks === 'string' ? outputChunks : JSON.stringify(outputChunks))
          : undefined,
        status: 'failed',
        finishedAt: new Date(),
      },
    })
  }

  /**
   * 获取某个任务的下一个执行轮次
   */
  async getNextRound(taskId) {
    await this.initialize()
    const max = await this.prisma.taskExecution.aggregate({
      where: { taskId },
      _max: { round: true },
    })
    return (max._max.round || 0) + 1
  }

  /**
   * 查询某个 contactor 下所有尚未推送到前端的已完成/失败执行记录
   */
  async findUnsyncedByContactorId(contactorId) {
    await this.initialize()
    return await this.prisma.taskExecution.findMany({
      where: {
        contactorId,
        synced: false,
        status: { in: ['completed', 'failed'] },
      },
      orderBy: { startedAt: 'asc' },
    })
  }

  /**
   * 标记单条执行记录为已同步
   */
  async markSynced(id) {
    await this.initialize()
    return await this.prisma.taskExecution.update({
      where: { id },
      data: { synced: true },
    })
  }

  /**
   * 批量标记执行记录为已同步
   */
  async markAllSynced(ids) {
    if (!ids || ids.length === 0) return
    await this.initialize()
    return await this.prisma.taskExecution.updateMany({
      where: { id: { in: ids } },
      data: { synced: true },
    })
  }

  /**
   * 按任务 ID 查询所有执行记录
   */
  async findByTaskId(taskId) {
    await this.initialize()
    return await this.prisma.taskExecution.findMany({
      where: { taskId },
      orderBy: { startedAt: 'desc' },
    })
  }
}

export default new TaskExecutionService()
