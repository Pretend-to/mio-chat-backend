import prismaManager from '../../database/prisma.js'
import { SessionPersistence } from './SessionPersistence.js'

export const DEFAULT_PERSISTENCE_MODE = 'legacy'

export async function createSessionPersistence({
  agentId,
  baseDir = 'memory',
  logger = console,
  mode = process.env.MIO_CHANNEL_PERSISTENCE_MODE || DEFAULT_PERSISTENCE_MODE,
  prisma = null,
} = {}) {
  const client = mode === 'legacy' ? null : prisma || await prismaManager.initialize()
  return new SessionPersistence({ agentId, baseDir, logger, mode, prisma: client })
}

export default createSessionPersistence
