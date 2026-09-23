import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import logger from '../../utils/logger.js'
import { resolveDatabasePath } from '../database/databasePath.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = path.join(__dirname, 'schema')
const LEDGER_KEY = '_schema_migrations'
const MIGRATION_FILE_RE = /^\d+.*\.js$/

/**
 * 代码自带的结构迁移 runner。
 *
 * 背景：`prisma db push` 在 SQLite 上对「改列名 / 改类型 / 改约束 / 删列」一律走
 * `CREATE new_x → INSERT SELECT → DROP x → RENAME`（整表重建）；配上
 * `--accept-data-loss` 就是静默丢数据。启动期的破坏性预检会拦停这类自动推送。
 *
 * 因此需要重建表的变更，改由本 runner 承接：把迁移写成
 * `lib/migration/schema/<NNN-name>.js`，在事务里显式搬列、带行数校验、跑完记账；
 * 迁移完成后结构已就位，`checkAndSyncSchema()` 看到的 diff 为空 → 启动无感。
 *
 * 迁移模块契约：
 *   export default {
 *     id: '001-rename-example',          // 唯一 id，用于记账（改了 id 会重跑）
 *     description: '...',                 // 可选，日志用
 *     tables: ['messages'],               // 可选，声明受影响表 → 自动做行数校验
 *     allowRowDecrease: false,            // 可选，主动删行时才置 true
 *     detect(db) {},                      // 可选，返回 false 表示"已就位，无需执行"
 *     up(db) {},                          // 必填，事务内执行（DDL 亦可）
 *   }
 *
 * ledger 记在 `system_settings._schema_migrations`（JSON 数组），不额外建表。
 */

function readLedger(db) {
  try {
    const row = db
      .prepare('SELECT value FROM system_settings WHERE key = ?')
      .get(LEDGER_KEY)
    const parsed = row?.value ? JSON.parse(row.value) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function recordLedger(db, entry) {
  const next = [...readLedger(db), entry]
  db.prepare(
    'INSERT INTO system_settings (key, value, category, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP',
  ).run(LEDGER_KEY, JSON.stringify(next), 'system')
}

function tableCounts(db, tables) {
  const counts = {}
  for (const table of tables) {
    try {
      counts[table] = db.prepare(`SELECT COUNT(*) AS c FROM "${table}"`).get().c
    } catch {
      // 表不存在（例如首次重建）时不参与校验
    }
  }
  return counts
}

async function loadMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return []
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => MIGRATION_FILE_RE.test(file))
    .toSorted()

  const migrations = []
  for (const file of files) {
    const fileUrl = `${pathToFileURL(path.join(MIGRATIONS_DIR, file)).toString()}?t=${Date.now()}`
    try {
      const migration = (await import(fileUrl)).default
      if (!migration?.id || typeof migration.up !== 'function') {
        logger.warn(
          `[SchemaMigration] 跳过 ${file}：需要导出 { id, up(db) }（detect/tables 可选）`,
        )
        continue
      }
      migrations.push({ ...migration, file })
    } catch (error) {
      logger.error(`[SchemaMigration] 加载 ${file} 失败:`, error.message)
    }
  }
  return migrations.toSorted((a, b) => a.id.localeCompare(b.id))
}

/**
 * 执行所有未记账的结构迁移。返回 { applied, skipped, backupPath }。
 * 任一步失败都会回滚该迁移并抛出 —— 带着半迁移的库继续启动更危险。
 */
export async function runSchemaMigrations() {
  const migrations = await loadMigrations()
  if (migrations.length === 0) return { applied: [], skipped: [] }

  const databasePath = resolveDatabasePath()
  if (!fs.existsSync(databasePath)) {
    // 全新实例：结构交给 prisma db push 建，谈不上迁移
    return { applied: [], skipped: [] }
  }

  const BetterSqlite3 = (await import('better-sqlite3')).default
  const db = new BetterSqlite3(databasePath, { fileMustExist: true })

  try {
    const hasSettingsTable = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'system_settings'",
      )
      .get()
    if (!hasSettingsTable) return { applied: [], skipped: [] }

    const appliedIds = new Set(readLedger(db).map((entry) => entry.id))
    const pending = migrations.filter((m) => !appliedIds.has(m.id))
    if (pending.length === 0) return { applied: [], skipped: [] }

    const backupPath = `${databasePath}.before-migration-${Date.now()}.bak`
    await db.backup(backupPath)
    logger.warn(`🛡️ 结构迁移前已创建数据库备份: ${backupPath}`)

    const applied = []
    const skipped = []
    db.pragma('foreign_keys = OFF')
    try {
      for (const migration of pending) {
        const needsRun =
          typeof migration.detect === 'function' ? migration.detect(db) : true

        if (!needsRun) {
          logger.info(`↩️ 结构迁移 ${migration.id} 检测为已就位，跳过执行`)
          db.exec('BEGIN IMMEDIATE')
          try {
            recordLedger(db, {
              appliedAt: new Date().toISOString(),
              id: migration.id,
              skipped: true,
            })
            db.exec('COMMIT')
          } catch (error) {
            db.exec('ROLLBACK')
            throw error
          }
          skipped.push(migration.id)
          continue
        }

        const tables = Array.isArray(migration.tables) ? migration.tables : []
        const before = tableCounts(db, tables)
        const startedAt = Date.now()

        db.exec('BEGIN IMMEDIATE')
        try {
          migration.up(db)
          const after = tableCounts(db, tables)
          if (migration.allowRowDecrease !== true) {
            for (const table of tables) {
              if (
                typeof before[table] === 'number' &&
                typeof after[table] === 'number' &&
                after[table] < before[table]
              ) {
                throw new Error(
                  `表 ${table} 行数由 ${before[table]} 降到 ${after[table]}，疑似丢数据`,
                )
              }
            }
          }
          recordLedger(db, {
            appliedAt: new Date().toISOString(),
            id: migration.id,
            rows: after,
            skipped: false,
          })
          db.exec('COMMIT')
        } catch (error) {
          db.exec('ROLLBACK')
          throw new Error(
            `结构迁移 ${migration.id} 执行失败并已回滚: ${error.message}`,
            { cause: error },
          )
        }

        const after = tableCounts(db, tables)
        logger.mark(
          `✅ 结构迁移完成: ${migration.id} (${migration.description || migration.file}) | 耗时 ${Date.now() - startedAt}ms | rows=${JSON.stringify(after)}`,
        )
        applied.push(migration.id)
      }
    } finally {
      db.pragma('foreign_keys = ON')
    }

    return { applied, skipped, backupPath }
  } finally {
    db.close()
  }
}

export default { runSchemaMigrations }
