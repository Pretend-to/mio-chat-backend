import path from 'node:path'

export function resolveDatabasePath({ env = process.env, rootDir = process.cwd() } = {}) {
  return path.resolve(env.MIOCHAT_DATABASE_PATH || path.join(rootDir, 'prisma/data/app.db'))
}

export default resolveDatabasePath
