import { PrismaClient } from '@prisma/client'

class TaskService {
  constructor() {
    this.prisma = new PrismaClient()
  }

  async initialize() {
    // Initialization logic if needed
  }

  async findAll() {
    return await this.prisma.task.findMany()
  }

  async findActive() {
    return await this.prisma.task.findMany({
      where: { status: 'active' },
    })
  }

  async findById(id) {
    return await this.prisma.task.findUnique({
      where: { id },
    })
  }

  async upsert(taskData) {
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
      prompt,
      userId,
      contactorId,
      status,
    } = taskData
    return await this.prisma.task.upsert({
      where: { id },
      update: {
        name,
        cron,
        runAt: runAt ? new Date(runAt) : null,
        preset,
        systemPrompt,
        tools: typeof tools === 'object' ? JSON.stringify(tools) : tools,
        provider,
        model,
        prompt,
        userId,
        contactorId,
        status: status || 'active',
      },
      create: {
        id,
        name,
        cron,
        runAt: runAt ? new Date(runAt) : null,
        preset,
        systemPrompt,
        tools: typeof tools === 'object' ? JSON.stringify(tools) : tools,
        provider,
        model,
        prompt,
        userId,
        contactorId,
        status: status || 'active',
      },
    })
  }

  async updateLastRun(id) {
    return await this.prisma.task.update({
      where: { id },
      data: { lastRunAt: new Date() },
    })
  }

  async delete(id) {
    return await this.prisma.task.delete({
      where: { id },
    })
  }

  async setStatus(id, status) {
    return await this.prisma.task.update({
      where: { id },
      data: { status },
    })
  }
}

export default new TaskService()
