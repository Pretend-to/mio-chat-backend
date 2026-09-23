# 结构迁移（schema migrations）

这里存放**需要重建表**的结构变更。启动时会由 `lib/migration/schemaRunner.js`
按文件名顺序执行，并把执行记录写进 `system_settings._schema_migrations`。

## 为什么需要它

`prisma db push` 在 SQLite 上对「改列名 / 改类型 / 改约束 / 删列」一律走：

```sql
CREATE TABLE new_x (...);
INSERT INTO new_x (...) SELECT ... FROM x;
DROP TABLE x;
ALTER TABLE new_x RENAME TO x;
```

也就是**整表重建**。配上 `--accept-data-loss` 就是静默丢数据。

因此启动期的破坏性预检（`lib/initialization/index.js`）会拦停这类自动推送。
需要重建表时，把变更写成本目录下的迁移文件：**自己显式搬列 + 事务 + 行数校验**，
跑完之后库结构已就位，`checkAndSyncSchema()` 看到的 diff 为空 → 启动无感。

> 纯增量变更（新增表 / 新增可空列或带默认值的列 / 新增索引）**不需要写迁移**，
> `db push` 自己就能无感完成，预检也不会拦。

## 契约

```js
export default {
  id: '001-rename-message-column', // 唯一 id；改了 id 会被当成新迁移重跑
  description: '把人肉改名的例子写清楚', // 可选，日志用
  tables: ['messages'], // 可选：声明受影响表 → 自动对比迁移前后行数
  allowRowDecrease: false, // 可选：确实要删行时才置 true
  detect(db) {
    // 可选：返回 false 表示"结构已就位，无需执行"（幂等兜底）
    return true
  },
  up(db) {
    // 必填：在事务里执行（runner 已开 BEGIN IMMEDIATE / COMMIT，失败自动 ROLLBACK）
  },
}
```

## 模板（复制另存为 `NNN-<name>.js`）

```js
/**
 * 例：messages 表把 content 列改名成 body，并删掉旧列 legacy_flag。
 * 关键点：
 * 1) 显式列名搬运，禁止 `INSERT INTO new_x SELECT *`
 * 2) 全部放在 up() 里，由 runner 的事务兜底
 * 3) tables 声明后 runner 会自动做行数校验
 */
export default {
  id: '001-rename-messages-content-to-body',
  description: 'messages.content → body，并移除 legacy_flag',
  tables: ['messages'],

  detect(db) {
    // 新列已存在、旧列已消失 → 说明迁移早已完成
    const columns = db.prepare('PRAGMA table_info("messages")').all()
    const names = columns.map((c) => c.name)
    return !(names.includes('body') && !names.includes('content'))
  },

  up(db) {
    db.exec(`
      CREATE TABLE new_messages ( /* 与最新 prisma/schema.prisma 完全一致的结构 */ );
      INSERT INTO new_messages (id, session_id, body, created_at, updated_at)
        SELECT id, session_id, content, created_at, updated_at FROM messages;
      DROP TABLE messages;
      ALTER TABLE new_messages RENAME TO messages;
      CREATE INDEX "messages_session_id_idx" ON "messages"("session_id");
    `)
  },
}
```

## 工作流

1. 改 `prisma/schema.prisma`；
2. **先离线预演**，看 `db push` 会做什么：

   ```bash
   sqlite3 data/app.db ".backup /tmp/preview.db"
   pnpm exec prisma migrate diff --from-config-datasource \
     --to-schema prisma/schema.prisma --script
   ```

   - 只有 `CREATE TABLE <新表>` / `ALTER TABLE … ADD COLUMN` / `CREATE INDEX` → 直接发版；
   - 出现 `CREATE TABLE "new_*"` / `DROP TABLE` / `DROP COLUMN` → 写一个本目录下的迁移；

3. 迁移写完后正常启动即可（runner 会在 `checkAndSyncSchema()` 之前执行，
   结构就位 → diff 为空 → 不触发任何自动重建）；
4. 验证：看日志里的 `✅ 结构迁移完成: <id> | rows={...}` 与
   `data/app.db.before-migration-<ts>.bak` 备份。

## 注意

- 迁移前 runner 会自动 `.backup` 一份到 `data/app.db.before-migration-<ts>.bak`；
- **不要**用 `up()` 去删数据；真要删行，显式设置 `allowRowDecrease: true` 并在
  迁移里写清楚原因；
- 迁移文件的 `id` 一旦上线就不要再改名（否则会重跑一遍）。
