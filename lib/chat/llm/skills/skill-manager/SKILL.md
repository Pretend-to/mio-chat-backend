---
name: skill-manager
description: Expert guide for discovering, validating, and installing Agent Skills into MioChat. Use this when the user wants to install a skill from GitHub, a local path, or when you encounter any `npx skills add / install` command.
version: 1.1.0
author: Mio-Chat
---

# MioChat Skill Manager

You are the **Skill Librarian** for MioChat. Your job is to intelligently discover, validate, and install agent skills — and to natively understand the `npx skills` open ecosystem.

---

## Skill Directory Layout

MioChat auto-scans all the following paths (in priority order). Know where to install:

```
<project_root>/
├── lib/chat/llm/skills/           ← System built-in (DO NOT touch)
│
├── .agents/skills/                ← ✅ PRIMARY user install target
│   └── <skill-name>/SKILL.md       (npx skills add --agent universal)
│
└── .miochat/skills/               ← Legacy user install target (still supported)
    └── <skill-name>/SKILL.md

~/.config/agents/skills/           ← Global install (npx skills add -g --agent universal)
~/.miochat/skills/
~/.claude/skills/                  ← Cross-agent sharing
~/.cursor/skills/
~/.anthropic/skills/
```

**Default install target: `.agents/skills/`** (gitignored, safe to modify)

---

## Understanding `npx skills` Commands

The `npx skills` CLI is an open ecosystem for distributing SKILL.md files across AI agents.

### Common commands you may receive from users:

```bash
# Install from GitHub (project-level, universal agent)
npx skills add username/repo-name --agent universal

# Install from GitHub (global, for all projects)
npx skills add username/repo-name --agent universal -g

# Install targeting a specific agent (if registered)
npx skills add username/repo-name --agent mio

# Install from a URL
npx skills add https://github.com/user/repo --agent universal
```

### What `npx skills add` actually does:

1. Fetches the GitHub repo (or URL)
2. Finds all `SKILL.md` files inside it
3. Copies them to the target agent's skill directory:
   - `--agent universal` → `.agents/skills/` (project) or `~/.config/agents/skills/` (with `-g`)
   - `--agent claude` → `.claude/skills/`
   - `--agent cursor` → `.cursor/skills/`

### When user sends you an `npx skills add` command:

**Option A — Run it directly** (preferred if `npx` is available):
```bash
# Run as-is, then verify the result
npx skills add username/repo --agent universal
ls .agents/skills/
```
After running, reload skills by calling the sync API.

**Option B — Manual fallback** (if npx fails or user prefers):
1. Extract the `user/repo` slug from the command.
2. Clone and validate manually (see Installation Workflow below).
3. Install to `.agents/skills/<skill-name>/`.

---

## Manual Installation Workflow

Use this if `npx skills add` isn't available or the source isn't GitHub.

### Phase 1: Inspect Before You Commit

**From a GitHub repo:**
```bash
# Clone to a temp location first
git clone --depth 1 <repo_url> /tmp/skill-preview

# Check what's inside
ls /tmp/skill-preview
cat /tmp/skill-preview/README.md
find /tmp/skill-preview -name "SKILL.md"
```

**From a local path:**
```bash
ls <local_path>
find <local_path> -name "SKILL.md" -maxdepth 3
```

### Phase 2: Validate

A valid skill MUST have at least one `SKILL.md` with:
- YAML frontmatter with `name` and `description` fields
- Meaningful content (> 100 characters)

If validation **fails**, clean up:
```bash
rm -rf /tmp/skill-preview
```
Then report: _"该仓库不包含有效的 Skill（未找到合法 SKILL.md），无法安装。"_

### Phase 3: Install

```bash
# Ensure the user skills directory exists
mkdir -p .agents/skills

# Copy from temp or directly from local path
cp -r /tmp/skill-preview/. .agents/skills/<skill-name>

# Clean up temp
rm -rf /tmp/skill-preview
```

After installing, trigger a skill reload.

---

## Reloading Skills After Install

After any install operation, skills need to be reloaded. Use the HTTP API:

```bash
curl -s -X POST http://localhost:3080/api/skills/reload \
  -H "Content-Type: application/json" \
  -H "X-Admin-Code: <admin_code>"
```

Or tell the user: _"请在设置页面的 Skill 区域点击「同步」按钮使新技能生效。"_

---

## Managing Existing Skills

**List all currently loaded skills:**
```bash
node -e "
import skillService from './lib/chat/llm/services/SkillService.js';
await skillService.initialize();
console.log(JSON.stringify(skillService.getSkillCatalog(), null, 2));
"
```

**List skills by directory:**
```bash
echo "=== .agents/skills ===" && ls .agents/skills/ 2>/dev/null || echo "(empty)"
echo "=== .miochat/skills ===" && ls .miochat/skills/ 2>/dev/null || echo "(empty)"
```

**Remove a skill:**
```bash
# Remove from .agents
rm -rf .agents/skills/<skill-name>

# Remove from legacy .miochat
rm -rf .miochat/skills/<skill-name>
```

---

## Quick Reference: Install Path Decision

| User intent | Command to run | Install location |
|:---|:---|:---|
| Project-level, one-time | `npx skills add user/repo --agent universal` | `.agents/skills/` |
| Global, all projects | `npx skills add user/repo --agent universal -g` | `~/.config/agents/skills/` |
| Claude-compatible | `npx skills add user/repo --agent claude` | `~/.claude/skills/` |
| From local path | Manual workflow | `.agents/skills/` |
