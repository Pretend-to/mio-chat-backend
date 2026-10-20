import prismaManager from '../../database/prisma.js'
import { SessionPersistence } from './SessionPersistence.js'

/**
 * 唯一的持久化入口 —— 数据库存储。
 *
 * 文件存储（channels/memory/MemoryStore.js）及其 legacy / shadow / database-shadow
 * 诊断模式已删除，所以这里不再有 mode 开关，也没有 baseDir。
 */
export async function createSessionPersistence({
  agentId,
  logger = console,
  prisma = null,
} = {}) {
  // 开关已删除：显式报错，而不是静默忽略。
  // 留着旧值的人会以为它还在生效，那是比崩溃更贵的误解。
  if (process.env.MIO_CHANNEL_PERSISTENCE_MODE) {
    throw new Error(
      'MIO_CHANNEL_PERSISTENCE_MODE 已废弃：文件存储已删除，持久化只剩数据库一种实现。请从 .env / 运行环境里移除该变量。',
    )
  }
  const client = prisma || await prismaManager.initialize()
  return new SessionPersistence({ agentId, logger, prisma: client })
}

export default createSessionPersistence
