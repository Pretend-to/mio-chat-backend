#!/usr/bin/env python3
"""
MioChat Channel-Agent v2 Dedicated Migration Script
Tailored for production instances migrating from v1 (channels with agentId)
to v2 (orthogonal Agent, Channel, AgentChannelBinding, Session, Task models).
"""

import sqlite3
import json
import sys
import os
import datetime

DEFAULT_SCHEMA_HASH = "0daeef48ffb704f455af535ee4753f12"

def create_backup(db_path):
    backup_dir = os.path.join(os.path.dirname(os.path.abspath(db_path)), "backups")
    os.makedirs(backup_dir, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(backup_dir, f"app.db.pre_v2_migration_{ts}.bak")

    print(f"[*] Creating backup: {backup_path}")
    source = sqlite3.connect(f"file:{os.path.abspath(db_path)}?mode=ro", uri=True)
    dest = sqlite3.connect(backup_path)
    with dest:
        source.backup(dest)
    dest.close()
    source.close()
    print(f"[+] Backup complete. Size: {os.path.getsize(backup_path)} bytes")
    return backup_path

def run_migration(db_path, schema_hash=DEFAULT_SCHEMA_HASH, do_backup=False):
    db_path = os.path.abspath(db_path)
    if not os.path.exists(db_path):
        print(f"[-] Database file does not exist: {db_path}")
        sys.exit(1)

    if do_backup:
        create_backup(db_path)

    print(f"[*] Starting migration on: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Disable foreign keys during table recreation
    cursor.execute("PRAGMA foreign_keys = OFF")
    cursor.execute("BEGIN TRANSACTION")

    try:
        # 1. Migrate agents
        print("[1] Migrating agents...")
        cursor.execute("DROP TABLE IF EXISTS new_agents")
        cursor.execute("""
        CREATE TABLE "new_agents" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "name" TEXT NOT NULL DEFAULT 'Agent',
            "avatar" TEXT,
            "description" TEXT,
            "soul" TEXT,
            "default_session_id" TEXT,
            "provider" TEXT,
            "model" TEXT,
            "status" TEXT NOT NULL DEFAULT 'active',
            "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" DATETIME NOT NULL
        )
        """)

        old_agents = cursor.execute("SELECT * FROM agents").fetchall()
        for a in old_agents:
            aid = a["id"]
            keys = a.keys()
            existing_sess = a["default_session_id"] if "default_session_id" in keys else (a["active_session_id"] if "active_session_id" in keys else None)
            existing_name = a["name"] if "name" in keys else None
            existing_avatar = a["avatar"] if "avatar" in keys else None
            existing_desc = a["description"] if "description" in keys else None
            existing_status = a["status"] if "status" in keys else 'active'

            if aid == "wechat-master":
                name = existing_name or "桐乃"
                avatar = existing_avatar or "https://s3.krumio.com/image/5ef1f3cf.png"
                desc = existing_desc or "微信个人助理"
                def_sess = existing_sess or "s_1787803264090_36fa58"
            elif aid == "heyiwei":
                name = existing_name or "何以为"
                avatar = existing_avatar or None
                desc = existing_desc or "何以为专属助理"
                def_sess = existing_sess or "s_1789407079380_7b7630"
            else:
                name = existing_name or aid
                avatar = existing_avatar or None
                desc = existing_desc or None
                def_sess = existing_sess

            cursor.execute("""
            INSERT INTO new_agents (id, name, avatar, description, soul, default_session_id, provider, model, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (aid, name, avatar, desc, a["soul"], def_sess, a["provider"], a["model"], existing_status, a["created_at"], a["updated_at"]))

        cursor.execute("DROP TABLE agents")
        cursor.execute("ALTER TABLE new_agents RENAME TO agents")

        # 2. Migrate channels
        print("[2] Migrating channels...")
        cursor.execute("DROP TABLE IF EXISTS new_channels")
        cursor.execute("""
        CREATE TABLE "new_channels" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "type" TEXT NOT NULL,
            "name" TEXT,
            "token_enc" TEXT,
            "bot_id" TEXT,
            "user_id" TEXT,
            "avatar" TEXT,
            "status" TEXT NOT NULL DEFAULT 'unbound',
            "last_active" DATETIME,
            "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" DATETIME NOT NULL,
            "legacy_json" TEXT
        )
        """)

        old_channels = cursor.execute("SELECT * FROM channels").fetchall()
        for c in old_channels:
            cursor.execute("""
            INSERT INTO new_channels (id, type, name, token_enc, bot_id, user_id, avatar, status, last_active, created_at, updated_at, legacy_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (c["id"], c["type"], c["name"], c["token_enc"], c["bot_id"], c["user_id"], c["avatar"], c["status"], c["last_active"], c["created_at"], c["updated_at"], c["legacy_json"]))

        # Ensure default Web channel exists
        cursor.execute("""
        INSERT OR IGNORE INTO new_channels (id, type, name, status, created_at, updated_at)
        VALUES ('web-default', 'web', 'Web', 'running', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """)

        cursor.execute("DROP TABLE channels")
        cursor.execute("ALTER TABLE new_channels RENAME TO channels")
        cursor.execute('CREATE INDEX IF NOT EXISTS "channels_type_status_idx" ON "channels"("type", "status")')

        # 3. Create agent_channel_bindings
        print("[3] Creating agent_channel_bindings...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS "agent_channel_bindings" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "agent_id" TEXT NOT NULL,
            "channel_id" TEXT NOT NULL,
            "default_session_id" TEXT,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "inbound_policy" TEXT NOT NULL DEFAULT 'routed',
            "outbound_enabled" BOOLEAN NOT NULL DEFAULT true,
            "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" DATETIME NOT NULL,
            CONSTRAINT "agent_channel_bindings_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "agent_channel_bindings_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
        """)
        cursor.execute('CREATE INDEX IF NOT EXISTS "agent_channel_bindings_channel_id_enabled_idx" ON "agent_channel_bindings"("channel_id", "enabled")')
        cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS "agent_channel_bindings_agent_id_channel_id_key" ON "agent_channel_bindings"("agent_id", "channel_id")')

        wechat_binding_id = "b_c_mtazue7g198ca0_wechat-master"
        cursor.execute("""
        INSERT OR REPLACE INTO agent_channel_bindings (id, agent_id, channel_id, default_session_id, enabled, inbound_policy, outbound_enabled, created_at, updated_at)
        VALUES (?, 'wechat-master', 'c_mtazue7g198ca0', 's_1787803264090_36fa58', 1, 'routed', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, (wechat_binding_id,))

        cursor.execute("""
        INSERT OR REPLACE INTO agent_channel_bindings (id, agent_id, channel_id, default_session_id, enabled, inbound_policy, outbound_enabled, created_at, updated_at)
        VALUES ('b_web-default_wechat-master', 'wechat-master', 'web-default', 's_1787803264090_36fa58', 1, 'routed', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """)

        cursor.execute("""
        INSERT OR REPLACE INTO agent_channel_bindings (id, agent_id, channel_id, default_session_id, enabled, inbound_policy, outbound_enabled, created_at, updated_at)
        VALUES ('b_web-default_heyiwei', 'heyiwei', 'web-default', 's_1789407079380_7b7630', 1, 'routed', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """)

        # 4. Create channel_principals & claims
        print("[4] Creating channel_principals and claims...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS "channel_principals" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "channel_id" TEXT NOT NULL,
            "external_user_id" TEXT NOT NULL,
            "role" TEXT NOT NULL DEFAULT 'system_admin',
            "display_name" TEXT,
            "claimed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" DATETIME NOT NULL,
            CONSTRAINT "channel_principals_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
        """)
        cursor.execute('CREATE INDEX IF NOT EXISTS "channel_principals_external_user_id_idx" ON "channel_principals"("external_user_id")')
        cursor.execute('CREATE INDEX IF NOT EXISTS "channel_principals_channel_id_role_idx" ON "channel_principals"("channel_id", "role")')
        cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS "channel_principals_channel_id_external_user_id_key" ON "channel_principals"("channel_id", "external_user_id")')

        cursor.execute("""
        INSERT OR REPLACE INTO channel_principals (id, channel_id, external_user_id, role, display_name, claimed_at, created_at, updated_at)
        VALUES ('principal_c_mtazue7g198ca0_admin', 'c_mtazue7g198ca0', 'o9cq806qbO9z-RAsXDM7uWov0P-k@im.wechat', 'system_admin', 'Admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS "channel_admin_claims" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "channel_id" TEXT NOT NULL,
            "code_hash" TEXT NOT NULL,
            "expires_at" DATETIME NOT NULL,
            "attempt_count" INTEGER NOT NULL DEFAULT 0,
            "claimed_at" DATETIME,
            "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" DATETIME NOT NULL,
            CONSTRAINT "channel_admin_claims_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
        """)
        cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS "channel_admin_claims_channel_id_key" ON "channel_admin_claims"("channel_id")')
        cursor.execute('CREATE INDEX IF NOT EXISTS "channel_admin_claims_expires_at_idx" ON "channel_admin_claims"("expires_at")')

        # 5. Create channel_routes, channel_conversations, members, links
        print("[5] Creating channel_routes and channel_conversations...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS "channel_routes" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "channel_id" TEXT NOT NULL,
            "external_conversation_id" TEXT NOT NULL,
            "binding_id" TEXT NOT NULL,
            "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" DATETIME NOT NULL,
            CONSTRAINT "channel_routes_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "channel_routes_binding_id_fkey" FOREIGN KEY ("binding_id") REFERENCES "agent_channel_bindings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
        """)
        cursor.execute('CREATE INDEX IF NOT EXISTS "channel_routes_binding_id_idx" ON "channel_routes"("binding_id")')
        cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS "channel_routes_channel_id_external_conversation_id_key" ON "channel_routes"("channel_id", "external_conversation_id")')

        cursor.execute("""
        INSERT OR REPLACE INTO channel_routes (id, channel_id, external_conversation_id, binding_id, created_at, updated_at)
        VALUES ('route_c_mtazue7g198ca0_main', 'c_mtazue7g198ca0', 'o9cq806qbO9z-RAsXDM7uWov0P-k@im.wechat', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, (wechat_binding_id,))

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS "channel_conversations" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "channel_id" TEXT NOT NULL,
            "agent_id" TEXT NOT NULL,
            "conversation_type" TEXT NOT NULL,
            "external_conversation_id" TEXT NOT NULL,
            "external_thread_id" TEXT,
            "active_session_id" TEXT,
            "last_active_at" DATETIME,
            "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" DATETIME NOT NULL,
            CONSTRAINT "channel_conversations_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "channel_conversations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "channel_conversations_active_session_id_fkey" FOREIGN KEY ("active_session_id") REFERENCES "sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
        )
        """)
        cursor.execute('CREATE INDEX IF NOT EXISTS "channel_conversations_agent_id_active_session_id_idx" ON "channel_conversations"("agent_id", "active_session_id")')
        cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS "channel_conversations_channel_id_agent_id_external_conversation_id_key" ON "channel_conversations"("channel_id", "agent_id", "external_conversation_id")')

        cursor.execute("""
        INSERT OR REPLACE INTO channel_conversations (id, channel_id, agent_id, conversation_type, external_conversation_id, active_session_id, created_at, updated_at)
        VALUES ('conv_c_mtazue7g198ca0_main', 'c_mtazue7g198ca0', 'wechat-master', 'direct', 'o9cq806qbO9z-RAsXDM7uWov0P-k@im.wechat', 's_1787803264090_36fa58', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """)

        cursor.execute("DROP TABLE IF EXISTS channel_conversation_members")
        cursor.execute("""
        CREATE TABLE "channel_conversation_members" (
            "channel_conversation_id" TEXT NOT NULL,
            "external_user_id" TEXT NOT NULL,
            "display_name" TEXT,
            "role" TEXT,
            "last_active_at" DATETIME,
            "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" DATETIME NOT NULL,
            CONSTRAINT "channel_conversation_members_channel_conversation_id_fkey" FOREIGN KEY ("channel_conversation_id") REFERENCES "channel_conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            PRIMARY KEY ("channel_conversation_id", "external_user_id")
        )
        """)
        cursor.execute('CREATE INDEX IF NOT EXISTS "channel_conversation_members_external_user_id_idx" ON "channel_conversation_members"("external_user_id")')

        cursor.execute("""
        INSERT OR REPLACE INTO channel_conversation_members (channel_conversation_id, external_user_id, role, created_at, updated_at)
        VALUES ('conv_c_mtazue7g198ca0_main', 'o9cq806qbO9z-RAsXDM7uWov0P-k@im.wechat', 'member', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """)

        cursor.execute("DROP TABLE IF EXISTS channel_session_links")
        cursor.execute("""
        CREATE TABLE "channel_session_links" (
            "channel_conversation_id" TEXT NOT NULL,
            "session_id" TEXT NOT NULL,
            "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "channel_session_links_channel_conversation_id_fkey" FOREIGN KEY ("channel_conversation_id") REFERENCES "channel_conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "channel_session_links_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            PRIMARY KEY ("channel_conversation_id", "session_id")
        )
        """)
        cursor.execute('CREATE INDEX IF NOT EXISTS "channel_session_links_session_id_idx" ON "channel_session_links"("session_id")')
        cursor.execute("""
        INSERT OR REPLACE INTO channel_session_links (channel_conversation_id, session_id, created_at)
        VALUES ('conv_c_mtazue7g198ca0_main', 's_1787803264090_36fa58', CURRENT_TIMESTAMP)
        """)

        # 6. Migrate sessions
        print("[6] Migrating sessions...")
        cursor.execute("DROP TABLE IF EXISTS new_sessions")
        cursor.execute("""
        CREATE TABLE "new_sessions" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "agent_id" TEXT NOT NULL,
            "parent_session_id" TEXT,
            "kind" TEXT NOT NULL DEFAULT 'conversation',
            "title" TEXT,
            "visible" BOOLEAN NOT NULL DEFAULT true,
            "next_seq" INTEGER NOT NULL DEFAULT 0,
            "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" DATETIME NOT NULL,
            "legacy_metadata" TEXT,
            "subagent_key" TEXT,
            "subagent_role" TEXT,
            "retention_policy" TEXT,
            "last_run_at" DATETIME,
            CONSTRAINT "sessions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "sessions_parent_session_id_fkey" FOREIGN KEY ("parent_session_id") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
        """)

        old_sessions = cursor.execute("SELECT * FROM sessions").fetchall()
        for s in old_sessions:
            s_keys = s.keys()
            kind_val = s["kind"] if "kind" in s_keys else 'conversation'
            vis_val = s["visible"] if "visible" in s_keys else 1
            meta_val = s["legacy_metadata"] if "legacy_metadata" in s_keys else None
            cursor.execute("""
            INSERT INTO new_sessions (id, agent_id, parent_session_id, kind, title, visible, next_seq, created_at, updated_at, legacy_metadata)
            VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)
            """, (s["id"], s["agent_id"], kind_val, s["title"], vis_val, s["next_seq"], s["created_at"], s["updated_at"], meta_val))

        cursor.execute("DROP TABLE sessions")
        cursor.execute("ALTER TABLE new_sessions RENAME TO sessions")
        cursor.execute('CREATE INDEX IF NOT EXISTS "sessions_agent_id_updated_at_idx" ON "sessions"("agent_id", "updated_at")')
        cursor.execute('CREATE INDEX IF NOT EXISTS "sessions_parent_session_id_idx" ON "sessions"("parent_session_id")')
        cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS "sessions_agent_id_parent_session_id_subagent_key_key" ON "sessions"("agent_id", "parent_session_id", "subagent_key")')

        # 7. Migrate tasks
        print("[7] Migrating tasks...")
        cursor.execute("DROP TABLE IF EXISTS new_tasks")
        cursor.execute("""
        CREATE TABLE "new_tasks" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "name" TEXT,
            "cron" TEXT NOT NULL,
            "run_at" DATETIME,
            "agent_id" TEXT NOT NULL,
            "session_id" TEXT NOT NULL,
            "delivery_binding_id" TEXT,
            "prompt" TEXT DEFAULT '',
            "status" TEXT NOT NULL DEFAULT 'active',
            "last_run_at" DATETIME,
            "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" DATETIME NOT NULL,
            CONSTRAINT "tasks_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "tasks_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "tasks_delivery_binding_id_fkey" FOREIGN KEY ("delivery_binding_id") REFERENCES "agent_channel_bindings" ("id") ON DELETE SET NULL ON UPDATE CASCADE
        )
        """)

        old_tasks = cursor.execute("SELECT * FROM tasks").fetchall()
        for t in old_tasks:
            t_keys = t.keys()
            agent_id = t["agent_id"] if "agent_id" in t_keys else "wechat-master"
            session_id = t["session_id"] if "session_id" in t_keys else "s_1787803264090_36fa58"
            delivery_binding_id = t["delivery_binding_id"] if "delivery_binding_id" in t_keys else wechat_binding_id
            prompt_val = t["prompt"] if "prompt" in t_keys else ""
            cursor.execute("""
            INSERT INTO new_tasks (id, name, cron, run_at, agent_id, session_id, delivery_binding_id, prompt, status, last_run_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (t["id"], t["name"], t["cron"], t["run_at"], agent_id, session_id, delivery_binding_id, prompt_val, t["status"], t["last_run_at"], t["created_at"], t["updated_at"]))

        cursor.execute("DROP TABLE tasks")
        cursor.execute("ALTER TABLE new_tasks RENAME TO tasks")
        cursor.execute('CREATE INDEX IF NOT EXISTS "tasks_agent_id_status_idx" ON "tasks"("agent_id", "status")')
        cursor.execute('CREATE INDEX IF NOT EXISTS "tasks_session_id_idx" ON "tasks"("session_id")')
        cursor.execute('CREATE INDEX IF NOT EXISTS "tasks_delivery_binding_id_idx" ON "tasks"("delivery_binding_id")')

        # 8. Migrate task_executions
        print("[8] Migrating task_executions...")
        cursor.execute("DROP TABLE IF EXISTS new_task_executions")
        cursor.execute("""
        CREATE TABLE "new_task_executions" (
            "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "task_id" TEXT NOT NULL,
            "round" INTEGER NOT NULL DEFAULT 1,
            "agent_id" TEXT NOT NULL,
            "session_id" TEXT NOT NULL,
            "delivery_binding_id" TEXT,
            "trigger_prompt" TEXT,
            "input_messages" TEXT NOT NULL,
            "output_chunks" TEXT NOT NULL DEFAULT '[]',
            "final_assistant_msg" TEXT,
            "status" TEXT NOT NULL DEFAULT 'running',
            "delivery_status" TEXT NOT NULL DEFAULT 'not_requested',
            "delivery_error" TEXT,
            "synced" BOOLEAN NOT NULL DEFAULT false,
            "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "finished_at" DATETIME,
            "error_message" TEXT,
            CONSTRAINT "task_executions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
        """)

        old_executions = cursor.execute("SELECT * FROM task_executions").fetchall()
        for e in old_executions:
            e_keys = e.keys()
            agent_id = e["agent_id"] if "agent_id" in e_keys else "wechat-master"
            session_id = e["session_id"] if "session_id" in e_keys else "s_1787803264090_36fa58"
            del_binding = e["delivery_binding_id"] if "delivery_binding_id" in e_keys else wechat_binding_id
            del_status = e["delivery_status"] if "delivery_status" in e_keys else "delivered"
            del_err = e["delivery_error"] if "delivery_error" in e_keys else None
            cursor.execute("""
            INSERT INTO new_task_executions (id, task_id, round, agent_id, session_id, delivery_binding_id, trigger_prompt, input_messages, output_chunks, final_assistant_msg, status, delivery_status, delivery_error, synced, started_at, finished_at, error_message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (e["id"], e["task_id"], e["round"], agent_id, session_id, del_binding, e["trigger_prompt"], e["input_messages"], e["output_chunks"], e["final_assistant_msg"], e["status"], del_status, del_err, e["synced"], e["started_at"], e["finished_at"], e["error_message"]))

        cursor.execute("DROP TABLE task_executions")
        cursor.execute("ALTER TABLE new_task_executions RENAME TO task_executions")
        cursor.execute('CREATE INDEX IF NOT EXISTS "task_executions_task_id_idx" ON "task_executions"("task_id")')
        cursor.execute('CREATE INDEX IF NOT EXISTS "task_executions_task_id_round_idx" ON "task_executions"("task_id", "round")')
        cursor.execute('CREATE INDEX IF NOT EXISTS "task_executions_agent_id_session_id_idx" ON "task_executions"("agent_id", "session_id")')
        cursor.execute('CREATE INDEX IF NOT EXISTS "task_executions_status_idx" ON "task_executions"("status")')

        # 9. Migrate triggers
        print("[9] Migrating triggers...")
        cursor.execute("DROP TABLE IF EXISTS new_triggers")
        cursor.execute("""
        CREATE TABLE "new_triggers" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "agent_id" TEXT NOT NULL,
            "session_id" TEXT NOT NULL,
            "delivery_binding_id" TEXT,
            "source_channel_id" TEXT,
            "type" TEXT NOT NULL,
            "mode" TEXT NOT NULL DEFAULT 'persistent',
            "cron_expr" TEXT,
            "script_path" TEXT,
            "webhook_secret_hash" TEXT,
            "prompt_template" TEXT NOT NULL,
            "params" TEXT,
            "cooldown_sec" INTEGER NOT NULL DEFAULT 1800,
            "max_fires_per_day" INTEGER NOT NULL DEFAULT 5,
            "enabled" BOOLEAN NOT NULL DEFAULT true,
            "last_fired_at" DATETIME,
            "fire_count" INTEGER NOT NULL DEFAULT 0,
            "wake_count" INTEGER NOT NULL DEFAULT 0,
            "deleted_at" DATETIME,
            "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" DATETIME NOT NULL,
            "legacy_json" TEXT,
            CONSTRAINT "triggers_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "triggers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "triggers_delivery_binding_id_fkey" FOREIGN KEY ("delivery_binding_id") REFERENCES "agent_channel_bindings" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
            CONSTRAINT "triggers_source_channel_id_fkey" FOREIGN KEY ("source_channel_id") REFERENCES "channels" ("id") ON DELETE SET NULL ON UPDATE CASCADE
        )
        """)

        old_triggers = cursor.execute("SELECT * FROM triggers").fetchall()
        for tr in old_triggers:
            tr_keys = tr.keys()
            sess_id = (tr["session_id"] if "session_id" in tr_keys else None) or "s_1787803264090_36fa58"
            source_chan = tr["source_channel_id"] if "source_channel_id" in tr_keys else (tr["channel_id"] if "channel_id" in tr_keys else None)
            del_binding = tr["delivery_binding_id"] if "delivery_binding_id" in tr_keys else wechat_binding_id
            webhook_hash = tr["webhook_secret_hash"] if "webhook_secret_hash" in tr_keys else None
            last_fired = tr["last_fired_at"] if "last_fired_at" in tr_keys else None
            fire_cnt = tr["fire_count"] if "fire_count" in tr_keys else 0
            wake_cnt = tr["wake_count"] if "wake_count" in tr_keys else 0
            cursor.execute("""
            INSERT INTO new_triggers (id, agent_id, session_id, delivery_binding_id, source_channel_id, type, mode, cron_expr, script_path, webhook_secret_hash, prompt_template, params, cooldown_sec, max_fires_per_day, enabled, last_fired_at, fire_count, wake_count, deleted_at, created_at, updated_at, legacy_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (tr["id"], tr["agent_id"], sess_id, del_binding, source_chan, tr["type"], tr["mode"], tr["cron_expr"], tr["script_path"], webhook_hash, tr["prompt_template"], tr["params"], tr["cooldown_sec"], tr["max_fires_per_day"], tr["enabled"], last_fired, fire_cnt, wake_cnt, tr["deleted_at"], tr["created_at"], tr["updated_at"], tr["legacy_json"]))

        cursor.execute("DROP TABLE triggers")
        cursor.execute("ALTER TABLE new_triggers RENAME TO triggers")
        cursor.execute('CREATE INDEX IF NOT EXISTS "triggers_agent_id_enabled_deleted_at_idx" ON "triggers"("agent_id", "enabled", "deleted_at")')
        cursor.execute('CREATE INDEX IF NOT EXISTS "triggers_session_id_idx" ON "triggers"("session_id")')
        cursor.execute('CREATE INDEX IF NOT EXISTS "triggers_delivery_binding_id_idx" ON "triggers"("delivery_binding_id")')
        cursor.execute('CREATE INDEX IF NOT EXISTS "triggers_source_channel_id_idx" ON "triggers"("source_channel_id")')
        cursor.execute('CREATE INDEX IF NOT EXISTS "triggers_type_enabled_idx" ON "triggers"("type", "enabled")')

        # 10. Migrate trigger_executions
        print("[10] Migrating trigger_executions...")
        cursor.execute("""
        CREATE TABLE "new_trigger_executions" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "trigger_id" TEXT,
            "trigger_key" TEXT NOT NULL,
            "wake" BOOLEAN NOT NULL,
            "reason" TEXT,
            "data_json" TEXT,
            "session_id" TEXT,
            "message_id" TEXT,
            "duration_ms" INTEGER,
            "error" TEXT,
            "status" TEXT NOT NULL DEFAULT 'ok',
            "fired_at" DATETIME,
            "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "legacy_json" TEXT,
            CONSTRAINT "trigger_executions_trigger_id_fkey" FOREIGN KEY ("trigger_id") REFERENCES "triggers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
        """)

        cursor.execute("INSERT INTO new_trigger_executions SELECT * FROM trigger_executions")
        cursor.execute("DROP TABLE trigger_executions")
        cursor.execute("ALTER TABLE new_trigger_executions RENAME TO trigger_executions")
        cursor.execute('CREATE INDEX IF NOT EXISTS "trigger_executions_trigger_key_created_at_idx" ON "trigger_executions"("trigger_key", "created_at")')
        cursor.execute('CREATE INDEX IF NOT EXISTS "trigger_executions_status_created_at_idx" ON "trigger_executions"("status", "created_at")')

        # 11. Migrate messages (add missing columns)
        print("[11] Migrating messages...")
        msg_cols = [r[1] for r in cursor.execute("PRAGMA table_info(messages)").fetchall()]
        if "source_type" not in msg_cols:
            cursor.execute('ALTER TABLE messages ADD COLUMN "source_type" TEXT')
        if "channel_id" not in msg_cols:
            cursor.execute('ALTER TABLE messages ADD COLUMN "channel_id" TEXT')
        if "external_conversation_id" not in msg_cols:
            cursor.execute('ALTER TABLE messages ADD COLUMN "external_conversation_id" TEXT')
        if "external_message_id" not in msg_cols:
            cursor.execute('ALTER TABLE messages ADD COLUMN "external_message_id" TEXT')
        if "metadata" not in msg_cols:
            cursor.execute('ALTER TABLE messages ADD COLUMN "metadata" TEXT')

        cursor.execute("""
        UPDATE messages
        SET channel_id = 'c_mtazue7g198ca0',
            external_conversation_id = 'o9cq806qbO9z-RAsXDM7uWov0P-k@im.wechat',
            source_type = 'channel'
        WHERE session_id = 's_1787803264090_36fa58' AND channel_id IS NULL
        """)

        cursor.execute('CREATE INDEX IF NOT EXISTS "messages_channel_id_external_conversation_id_idx" ON "messages"("channel_id", "external_conversation_id")')
        cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS "messages_channel_id_external_message_id_key" ON "messages"("channel_id", "external_message_id")')

        # 12. Create SubAgent tables
        print("[12] Creating SubAgent tables...")
        cursor.execute("DROP TABLE IF EXISTS subagent_artifacts")
        cursor.execute("DROP TABLE IF EXISTS subagent_events")
        cursor.execute("DROP TABLE IF EXISTS subagent_run_dependencies")
        cursor.execute("DROP TABLE IF EXISTS subagent_runs")
        cursor.execute("DROP TABLE IF EXISTS subagent_run_groups")
        cursor.execute("DROP TABLE IF EXISTS session_inbox_events")
        cursor.execute("""
        CREATE TABLE "subagent_run_groups" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "agent_id" TEXT NOT NULL,
            "parent_session_id" TEXT NOT NULL,
            "parent_message_id" TEXT,
            "origin_type" TEXT NOT NULL DEFAULT 'interactive',
            "origin_task_id" TEXT,
            "origin_trigger_id" TEXT,
            "status" TEXT NOT NULL DEFAULT 'planning',
            "completion_policy" TEXT NOT NULL DEFAULT 'all',
            "quorum" INTEGER,
            "delivery_binding_id" TEXT,
            "resume_parent" BOOLEAN NOT NULL DEFAULT true,
            "context_version" INTEGER,
            "budget_json" TEXT NOT NULL DEFAULT '{}',
            "result_summary_json" TEXT,
            "idempotency_key" TEXT,
            "deadline_at" DATETIME,
            "revision" INTEGER NOT NULL DEFAULT 1,
            "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" DATETIME NOT NULL,
            "finished_at" DATETIME,
            CONSTRAINT "subagent_run_groups_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "subagent_run_groups_delivery_binding_id_fkey" FOREIGN KEY ("delivery_binding_id") REFERENCES "agent_channel_bindings" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
            CONSTRAINT "subagent_run_groups_parent_session_id_fkey" FOREIGN KEY ("parent_session_id") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
        """)
        cursor.execute('CREATE INDEX IF NOT EXISTS "subagent_run_groups_parent_session_id_created_at_idx" ON "subagent_run_groups"("parent_session_id", "created_at")')
        cursor.execute('CREATE INDEX IF NOT EXISTS "subagent_run_groups_delivery_binding_id_idx" ON "subagent_run_groups"("delivery_binding_id")')
        cursor.execute('CREATE INDEX IF NOT EXISTS "subagent_run_groups_agent_id_status_idx" ON "subagent_run_groups"("agent_id", "status")')
        cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS "subagent_run_groups_agent_id_idempotency_key_key" ON "subagent_run_groups"("agent_id", "idempotency_key")')

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS "subagent_runs" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "group_id" TEXT NOT NULL,
            "agent_id" TEXT NOT NULL,
            "session_id" TEXT NOT NULL,
            "parent_session_id" TEXT NOT NULL,
            "revision_of_run_id" TEXT,
            "job_key" TEXT NOT NULL,
            "task_type" TEXT NOT NULL DEFAULT 'research',
            "objective" TEXT NOT NULL,
            "input_json" TEXT NOT NULL DEFAULT '{}',
            "output_contract_json" TEXT NOT NULL DEFAULT '{}',
            "status" TEXT NOT NULL DEFAULT 'queued',
            "review_status" TEXT NOT NULL DEFAULT 'not_required',
            "result_json" TEXT,
            "result_text" TEXT,
            "error_json" TEXT,
            "tool_names_json" TEXT NOT NULL DEFAULT '[]',
            "tool_definitions_hash" TEXT,
            "provider" TEXT,
            "model" TEXT,
            "reasoning_effort" INTEGER,
            "budget_json" TEXT NOT NULL DEFAULT '{}',
            "attempt" INTEGER NOT NULL DEFAULT 1,
            "lease_owner" TEXT,
            "lease_expires_at" DATETIME,
            "heartbeat_at" DATETIME,
            "cancel_requested_at" DATETIME,
            "cancel_reason" TEXT,
            "started_at" DATETIME,
            "finished_at" DATETIME,
            "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" DATETIME NOT NULL,
            CONSTRAINT "subagent_runs_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "subagent_run_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "subagent_runs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "subagent_runs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "subagent_runs_parent_session_id_fkey" FOREIGN KEY ("parent_session_id") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "subagent_runs_revision_of_run_id_fkey" FOREIGN KEY ("revision_of_run_id") REFERENCES "subagent_runs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
        )
        """)
        cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS "subagent_runs_group_id_job_key_attempt_key" ON "subagent_runs"("group_id", "job_key", "attempt")')
        cursor.execute('CREATE INDEX IF NOT EXISTS "subagent_runs_group_id_status_idx" ON "subagent_runs"("group_id", "status")')
        cursor.execute('CREATE INDEX IF NOT EXISTS "subagent_runs_session_id_created_at_idx" ON "subagent_runs"("session_id", "created_at")')
        cursor.execute('CREATE INDEX IF NOT EXISTS "subagent_runs_parent_session_id_created_at_idx" ON "subagent_runs"("parent_session_id", "created_at")')
        cursor.execute('CREATE INDEX IF NOT EXISTS "subagent_runs_status_lease_expires_at_idx" ON "subagent_runs"("status", "lease_expires_at")')

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS "subagent_run_dependencies" (
            "run_id" TEXT NOT NULL,
            "depends_on_run_id" TEXT NOT NULL,
            "condition" TEXT NOT NULL DEFAULT 'success',
            CONSTRAINT "subagent_run_dependencies_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "subagent_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "subagent_run_dependencies_depends_on_run_id_fkey" FOREIGN KEY ("depends_on_run_id") REFERENCES "subagent_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            PRIMARY KEY ("run_id", "depends_on_run_id")
        )
        """)
        cursor.execute('CREATE INDEX IF NOT EXISTS "subagent_run_dependencies_depends_on_run_id_idx" ON "subagent_run_dependencies"("depends_on_run_id")')

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS "subagent_events" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "run_id" TEXT NOT NULL,
            "type" TEXT NOT NULL,
            "payload_json" TEXT NOT NULL DEFAULT '{}',
            "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "subagent_events_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "subagent_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
        """)
        cursor.execute('CREATE INDEX IF NOT EXISTS "subagent_events_run_id_created_at_idx" ON "subagent_events"("run_id", "created_at")')

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS "subagent_artifacts" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "run_id" TEXT NOT NULL,
            "type" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "uri" TEXT,
            "path" TEXT,
            "mime_type" TEXT,
            "size" INTEGER,
            "hash" TEXT,
            "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "subagent_artifacts_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "subagent_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
        """)
        cursor.execute('CREATE INDEX IF NOT EXISTS "subagent_artifacts_run_id_created_at_idx" ON "subagent_artifacts"("run_id", "created_at")')

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS "session_inbox_events" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "agent_id" TEXT NOT NULL,
            "session_id" TEXT NOT NULL,
            "type" TEXT NOT NULL,
            "payload_json" TEXT NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'pending',
            "available_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "claimed_at" DATETIME,
            "consumed_at" DATETIME,
            "consumed_message_id" TEXT,
            "attempts" INTEGER NOT NULL DEFAULT 0,
            "last_error" TEXT,
            "idempotency_key" TEXT NOT NULL,
            "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" DATETIME NOT NULL,
            CONSTRAINT "session_inbox_events_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "session_inbox_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
        """)
        cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS "session_inbox_events_idempotency_key_key" ON "session_inbox_events"("idempotency_key")')
        cursor.execute('CREATE INDEX IF NOT EXISTS "session_inbox_events_session_id_status_available_at_idx" ON "session_inbox_events"("session_id", "status", "available_at")')
        cursor.execute('CREATE INDEX IF NOT EXISTS "session_inbox_events_agent_id_status_idx" ON "session_inbox_events"("agent_id", "status")')

        # 13. Update _schema_hash in system_settings
        print("[13] Updating _schema_hash in system_settings...")
        cursor.execute("""
        INSERT INTO system_settings (category, key, value, created_at, updated_at)
        VALUES ('system', '_schema_hash', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
        """, (json.dumps(schema_hash),))

        # 14. Ensure legacy_migrations table exists (matches schema.prisma)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS "legacy_migrations" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "source_path" TEXT NOT NULL,
            "source_hash" TEXT NOT NULL,
            "source_kind" TEXT NOT NULL,
            "size_bytes" INTEGER NOT NULL,
            "agent_id" TEXT,
            "session_id" TEXT,
            "status" TEXT NOT NULL DEFAULT 'pending',
            "record_count" INTEGER NOT NULL DEFAULT 0,
            "error" TEXT,
            "verification_json" TEXT,
            "started_at" DATETIME,
            "completed_at" DATETIME,
            "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" DATETIME NOT NULL
        )
        """)
        cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS "legacy_migrations_source_path_key" ON "legacy_migrations"("source_path")')
        cursor.execute('CREATE INDEX IF NOT EXISTS "legacy_migrations_agent_id_status_idx" ON "legacy_migrations"("agent_id", "status")')

        conn.commit()
        print("[+] Migration transaction committed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"[-] Migration FAILED: {e}")
        raise e
    finally:
        cursor.execute("PRAGMA foreign_keys = ON")
        conn.close()

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "/www/fake_mio/servers/mio-chat-backend/prisma/data/app.db"
    run_migration(target)
