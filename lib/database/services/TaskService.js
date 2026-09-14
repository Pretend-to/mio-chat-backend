import prismaManager from '../prisma.js'

class TaskService {
  prisma = null;


  async initialize() {
    if (!this.prisma) {
      await prismaManager.initialize()
      this.prisma = prismaManager.getClient()
    }
  }

  async findAll(includeDeleted = false) {
    await this.initialize()
    if (includeDeleted) {
      return await this.prisma.task.findMany()
    }
    return await this.prisma.task.findMany({
      where: {
        NOT: { status: 'deleted' }
      }
    })
  }


  async findActive() {
    await this.initialize()
    try {
      if (!this.prisma.task) {
        return []
      }
      return await this.prisma.task.findMany({
        where: { status: 'active' },
      })
    } catch {
      return []
  }
  }

  async findById(id) {
    await this.initialize()
    return await this.prisma.task.findUnique({
      where: { id },
    })
  }

  async upsert(taskData) {
    await this.initialize()
    const {
      id,
      name,
      cron,
      runAt,
      preset,
      systemPrompt,
      tools,
      provider,
      model,
      triggerPrompt,
      userId,
      contactorId,
      status,
      history,
    } = taskData
    return await this.prisma.task.upsert({
      create: {
        contactorId,
        cron,
        history: history !== undefined ? (typeof history === 'object' ? JSON.stringify(history) : history) : '[]',
        id,
        model,
        name,
        preset,
        provider,
        runAt: runAt ? new Date(runAt) : null,
        status: status || 'active',
        systemPrompt,
        tools: typeof tools === 'object' ? JSON.stringify(tools) : tools,
        triggerPrompt: triggerPrompt || '',
        userId,
      },
      update: {
        contactorId,
        cron,
        history: history !== undefined ? (typeof history === 'object' ? JSON.stringify(history) : history) : undefined,
        model,
        name,
        preset,
        provider,
        runAt: runAt === undefined ? undefined : (runAt ? new Date(runAt) : null),
        status: status !== undefined ? status : undefined,
        systemPrompt,
        tools: typeof tools === 'object' ? JSON.stringify(tools) : tools,
        triggerPrompt: triggerPrompt !== undefined ? triggerPrompt : undefined,
        userId,
      },
      where: { id },
    })
  }

  async updateLastRun(id) {
    return await this.prisma.task.update({
      data: { lastRunAt: new Date() },
      where: { id },
    })
  }

  /**
   * 删除任务：
   * 如果已是 deleted 状态，执行真删除并级联删除运行记录；否则进行软删除。
   */
  async delete(id) {
    const task = await this.prisma.task.findUnique({ where: { id } })
    if (!task) {return null}

    if (task.status === 'deleted') {
      await this.prisma.taskExecution.deleteMany({
        where: { taskId: id }
      })
      return await this.prisma.task.delete({
        where: { id }
      })
    }

    return await this.prisma.task.update({
      data: { status: 'deleted' },
      where: { id },
    })
  }

  async setStatus(id, status) {
    return await this.prisma.task.update({
      data: { status },
      where: { id },
    })
  }
}

export default new TaskService()
