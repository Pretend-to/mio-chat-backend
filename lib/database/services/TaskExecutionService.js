import prismaManager from '../prisma.js'

class TaskExecutionService {
  prisma = null;


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
        contactorId,
        inputMessages: typeof inputMessages === 'string' ? inputMessages : JSON.stringify(inputMessages),
        model,
        provider,
        round,
        startedAt: new Date(),
        status: 'running',
        taskId,
        triggerPrompt,
        userId,
      },
    })
  }

  /**
   * 标记执行完成，写入原始 chunks 和组装后的 assistant 消息
   */
  async complete(id, { outputChunks, finalAssistantMsg }) {
    await this.initialize()
    return await this.prisma.taskExecution.update({
      data: {
        finalAssistantMsg: finalAssistantMsg !== undefined
          ? (typeof finalAssistantMsg === 'string' ? finalAssistantMsg : JSON.stringify(finalAssistantMsg))
          : undefined,
        finishedAt: new Date(),
        outputChunks: typeof outputChunks === 'string' ? outputChunks : JSON.stringify(outputChunks),
        status: 'completed',
      },
      where: { id },
    })
  }

  /**
   * 标记执行失败
   */
  async fail(id, { errorMessage, outputChunks }) {
    await this.initialize()
    return await this.prisma.taskExecution.update({
      data: {
        errorMessage,
        finishedAt: new Date(),
        outputChunks: outputChunks !== undefined
          ? (typeof outputChunks === 'string' ? outputChunks : JSON.stringify(outputChunks))
          : undefined,
        status: 'failed',
      },
      where: { id },
    })
  }

  /**
   * 获取某个任务的下一个执行轮次
   */
  async getNextRound(taskId) {
    await this.initialize()
    const max = await this.prisma.taskExecution.aggregate({
      _max: { round: true },
      where: { taskId },
    })
    return (max._max.round || 0) + 1
  }

  /**
   * 查询某个 contactor 下所有尚未推送到前端的已完成/失败执行记录
   */
  async findUnsyncedByContactorId(contactorId) {
    await this.initialize()
    return await this.prisma.taskExecution.findMany({
      orderBy: { startedAt: 'asc' },
      where: {
        contactorId,
        status: { in: ['completed', 'failed'] },
        synced: false,
      },
    })
  }

  /**
   * 标记单条执行记录为已同步
   */
  async markSynced(id) {
    await this.initialize()
    return await this.prisma.taskExecution.update({
      data: { synced: true },
      where: { id },
    })
  }

  /**
   * 批量标记执行记录为已同步
   */
  async markAllSynced(ids) {
    if (!ids || ids.length === 0) {return}
    await this.initialize()
    return await this.prisma.taskExecution.updateMany({
      data: { synced: true },
      where: { id: { in: ids } },
    })
  }

  /**
   * 按任务 ID 查询所有执行记录
   */
  async findByTaskId(taskId) {
    await this.initialize()
    return await this.prisma.taskExecution.findMany({
      orderBy: { startedAt: 'desc' },
      where: { taskId },
    })
  }
}

export default new TaskExecutionService()
