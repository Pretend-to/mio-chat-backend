import prismaManager from '../prisma.js'

export class TaskService {
  prisma = null

  async initialize() {
    if (!this.prisma) this.prisma = await prismaManager.initialize()
  }

  async findAll(filters = {}) {
    await this.initialize()
    if (typeof filters === 'boolean') filters = {}
    return await this.prisma.task.findMany({
      orderBy: { createdAt: 'desc' },
      where: {
        ...(filters.agentId ? { agentId: String(filters.agentId) } : {}),
        ...(filters.sessionId ? { sessionId: String(filters.sessionId) } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
    })
  }

  async findActive() {
    await this.initialize()
    return await this.prisma.task.findMany({ where: { status: 'active' } })
  }

  async findById(id) {
    await this.initialize()
    return await this.prisma.task.findUnique({ where: { id: String(id) } })
  }

  async upsert(taskData) {
    await this.initialize()
    if (!taskData?.id) throw new Error('Task id is required')
    const id = String(taskData.id)
    const current = await this.prisma.task.findUnique({ where: { id } })
    const agentId = taskData.agentId == null ? current?.agentId : String(taskData.agentId)
    const sessionId = taskData.sessionId == null ? current?.sessionId : String(taskData.sessionId)
    const cron = taskData.cron == null ? current?.cron : String(taskData.cron)
    if (!agentId || !sessionId || !cron) throw new Error('Task requires agentId, sessionId and cron')
    const [agent, session, binding] = await Promise.all([
      this.prisma.agent.findUnique({ where: { id: agentId } }),
      this.prisma.session.findUnique({ where: { id: sessionId } }),
      taskData.deliveryBindingId ? this.prisma.agentChannelBinding.findUnique({ where: { id: String(taskData.deliveryBindingId) } }) : null,
    ])
    if (!agent) throw new Error(`Agent ${agentId} not found`)
    if (!session || session.agentId !== agentId) throw new Error(`Session ${sessionId} does not belong to Agent ${agentId}`)
    if (taskData.deliveryBindingId && (!binding || binding.agentId !== agentId)) throw new Error(`Delivery binding does not belong to Agent ${agentId}`)
    const data = {
      ...(Object.hasOwn(taskData, 'name') ? { name: taskData.name || null } : {}),
      ...(Object.hasOwn(taskData, 'cron') ? { cron } : {}),
      ...(Object.hasOwn(taskData, 'runAt') ? { runAt: taskData.runAt ? new Date(taskData.runAt) : null } : {}),
      ...(Object.hasOwn(taskData, 'agentId') ? { agentId } : {}),
      ...(Object.hasOwn(taskData, 'sessionId') ? { sessionId } : {}),
      ...(Object.hasOwn(taskData, 'deliveryBindingId') ? { deliveryBindingId: taskData.deliveryBindingId || null } : {}),
      ...(Object.hasOwn(taskData, 'triggerPrompt') ? { triggerPrompt: taskData.triggerPrompt || '' } : {}),
      ...(Object.hasOwn(taskData, 'status') ? { status: taskData.status || 'active' } : {}),
    }
    if (current) return await this.prisma.task.update({ data, where: { id } })
    return await this.prisma.task.create({ data: {
      id, name: taskData.name || id, cron, runAt: taskData.runAt ? new Date(taskData.runAt) : null,
      agentId, sessionId, deliveryBindingId: taskData.deliveryBindingId || null,
      triggerPrompt: taskData.triggerPrompt || '', status: taskData.status || 'active',
    } })
  }

  async updateLastRun(id) { await this.initialize(); return await this.prisma.task.update({ data: { lastRunAt: new Date() }, where: { id: String(id) } }) }
  async delete(id) { await this.initialize(); const task = await this.findById(id); return task ? await this.prisma.task.delete({ where: { id: String(id) } }) : null }
  async setStatus(id, status) { await this.initialize(); return await this.prisma.task.update({ data: { status }, where: { id: String(id) } }) }
}

export default new TaskService()
