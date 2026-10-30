import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'
import DatabaseAuditHook from '../../lib/hooks/builtins/DatabaseAuditHook.js'
import { HOOK_POINTS } from '../../lib/hooks/types.js'
import prismaManager from '../../lib/database/prisma.js'
import { prepareIsolatedDatabase } from '../../scripts/utils/testIsolation.js'
import {
  getFailureDetail,
  getFailureLogs,
} from '../../lib/server/http/controllers/dashboardController.js'

function response() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

test('failed request body and stack persist in SQLite and load through failure detail API', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mio-diagnostics-'))
  const databasePath = path.join(directory, 'app.db')
  await prepareIsolatedDatabase(databasePath, {
    adminCode: 'test-admin',
    userCode: 'test-user',
  })
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: `file:${databasePath}` }),
  })
  const initialize = prismaManager.initialize
  const getClient = prismaManager.getClient
  prismaManager.initialize = async () => prisma
  prismaManager.getClient = () => prisma
  t.after(async () => {
    prismaManager.initialize = initialize
    prismaManager.getClient = getClient
    await prisma.$disconnect()
    await fs.rm(directory, { recursive: true, force: true })
  })
  const requestBody = {
    round: 4,
    upstreamBody: { tools: [{ name: 'bad_schema' }] },
  }
  const hook = new DatabaseAuditHook()
  await hook[HOOK_POINTS.LLM_AFTER_CHAT]({
    providerName: 'gemini',
    model: 'test',
    timeMetrics: {
      requestId: 'failure-diagnostic',
      status: 'FAILED',
      startTime: Date.now(),
      errorMessage: '400 Invalid schema',
      errorStack: 'Error: Invalid schema\n at test',
      requestBody,
    },
  })
  const stored = await prisma.lLMCallLog.findFirst({
    where: { requestId: 'failure-diagnostic' },
  })
  assert.deepEqual(JSON.parse(stored.requestBody), requestBody)
  assert.match(stored.errorStack, /at test/)
  const detail = response()
  await getFailureDetail({ params: { id: String(stored.id) } }, detail)
  assert.equal(detail.statusCode, 200)
  assert.equal(detail.body.data.requestBody, stored.requestBody)
  const listing = response()
  await getFailureLogs({ query: {} }, listing)
  assert.equal(listing.body.data.logs[0].requestBody, undefined)
  assert.equal(listing.body.data.logs[0].errorStack, undefined)
  const invalid = response()
  await getFailureDetail({ params: { id: 'bad' } }, invalid)
  assert.equal(invalid.statusCode, 400)
})
