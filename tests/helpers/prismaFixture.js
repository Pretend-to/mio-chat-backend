import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export async function createPrismaFixture(t = null) {
  const databasePath = path.join(os.tmpdir(), `mio-fixture-${process.pid}-${crypto.randomUUID()}.db`)
  execFileSync(path.join(process.cwd(), 'node_modules/.bin/prisma'), [
    'db', 'push', '--schema', path.join(process.cwd(), 'prisma/schema.prisma'),
    '--url', `file:${databasePath}`,
  ], { env: { ...process.env, RUST_LOG: 'debug' }, stdio: 'ignore' })
  const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${databasePath}` }) })
  await prisma.$connect()
  const close = async () => {
    await prisma.$disconnect()
    await fs.rm(databasePath, { force: true })
  }
  t?.after(close)
  return { close, prisma }
}
