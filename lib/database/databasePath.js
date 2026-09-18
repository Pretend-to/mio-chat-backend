import fs from 'node:fs'
import path from 'node:path'

export function migrateLegacyDatabaseLocation({ rootDir = process.cwd() } = {}) {
  const legacyDir = path.join(rootDir, 'prisma/data')
  const targetDir = path.join(rootDir, 'data')

  if (!fs.existsSync(legacyDir)) return

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  const files = ['app.db', 'app.db-wal', 'app.db-shm', 'channel-storage.key']
  for (const file of files) {
    const legacyPath = path.join(legacyDir, file)
    const targetPath = path.join(targetDir, file)
    if (fs.existsSync(legacyPath) && !fs.existsSync(targetPath)) {
      try {
        fs.renameSync(legacyPath, targetPath)
      } catch {
        fs.copyFileSync(legacyPath, targetPath)
        fs.unlinkSync(legacyPath)
      }
    }
  }

  try {
    const remaining = fs.readdirSync(legacyDir)
    if (remaining.length === 0) {
      fs.rmdirSync(legacyDir)
    }
  } catch {}
}

export function resolveDatabasePath({ env = process.env, rootDir = process.cwd() } = {}) {
  if (env.MIOCHAT_DATABASE_PATH) {
    return path.resolve(env.MIOCHAT_DATABASE_PATH)
  }
  migrateLegacyDatabaseLocation({ rootDir })
  return path.resolve(path.join(rootDir, 'data/app.db'))
}

export default resolveDatabasePath
