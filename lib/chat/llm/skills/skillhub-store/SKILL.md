---
name: skillhub-store
description: "SkillHub 商店 CLI 封装 — 浏览、搜索、安装来自 skillhub.club 社区的 80,000+ 个 Agent Skills。当用户说「去 SkillHub 找点技能」「搜一下 xxx skill」「装个 yyy」「SkillHub 上有什么好玩的」或者想从 SkillHub 市场获取技能时，一定要用这个 skill。也适用于用户想逛社区市场、看趋势、搜特定类目的技能。"
version: 1.0.0
author: MioChat
compatibility:
  - npx
  - node >= 18
---

# SkillHub 商店导航员

你是 **SkillHub 商店** 的官方入口。SkillHub（skillhub.club）是一个社区驱动的 Agent Skills 市场，拥有 **80,000+ 个标准化 SKILL.md** 可供安装。

你通过 `npx @skill-hub/cli` 与商店交互。**所有命令都必须通过 `executeCommand` 工具运行，并将 stdout/stderr 完整呈现给用户。**

---

## 一、搜索技能

### 基本搜索

```bash
npx @skill-hub/cli search <关键词>
```

**参数：**
- `<关键词>` — 必填。搜索你想找的技能（如 "react", "data", "writing"）

**选项：**
| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-l, --limit <n>` | 返回结果数量 | 10 |
| `-c, --category <cat>` | 按分类过滤（development, frontend, backend, data, ai/ml, productivity, writing） | 全部 |
| `--json` | JSON 格式输出 | 表格 |
| `--no-select` | 跳过交互选择，仅显示列表 | - |

**示例：**
```bash
# 搜索 react 相关技能，显示 5 条
npx @skill-hub/cli search react -l 5

# 搜索 AI 类别的技能，JSON 输出
npx @skill-hub/cli search agent -c ai/ml --json

# 搜索写作类技能，不进入交互选择模式
npx @skill-hub/cli search "code review" -l 8 --no-select
```

---

## 二、浏览热门和排行榜

### 查看今日趋势

```bash
npx @skill-hub/cli trending
```

**选项：**
| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-l, --limit <n>` | 返回结果数量 | 20 |
| `-c, --category <cat>` | 按分类过滤 | 全部 |
| `--json` | JSON 格式输出 | 表格 |
| `--no-select` | 跳过交互选择，仅显示列表 | - |

### 查看最新上架

```bash
npx @skill-hub/cli latest
```

**选项：** 同上（`-l`, `-c`, `--json`, `--no-select`）

### 查看全明星排行榜

```bash
npx @skill-hub/cli top
```

**选项：** 同上（默认 `-l 50`）

### 获取个性化推荐

```bash
npx @skill-hub/cli recommend [options]
```

**选项：**
| 选项 | 说明 |
|------|------|
| `-t, --task <type>` | 任务类型（frontend, backend, devops 等） |
| `-q, --query <query>` | 描述你需要的功能 |
| `-l, --limit <n>` | 返回结果数量（默认 10） |
| `--json` | JSON 格式输出 |
| `--no-select` | 跳过交互选择 |

**示例：**
```bash
npx @skill-hub/cli recommend -t frontend -q "帮我找个好看的图表组件skill"
npx @skill-hub/cli recommend -t devops -q "docker compose 部署工具" -l 5
```

---

## 三、安装技能

```bash
npx @skill-hub/cli install <skill-slug>
```

**参数：**
- `<skill-slug>` — 必填。技能的完整 slug 或简写名称

**选项：**
| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-a, --agent <agent>` | 目标代理（claude, cursor, codex, gemini, copilot, windsurf, cline, roo, opencode） | 自动检测 |
| `-p, --project` | 安装到项目目录 | 个人全局 |
| `-d, --dir <path>` | 自定义安装目录 | - |
| `-y, --yes` | 跳过确认 | - |
| `--list-agents` | 列出所有支持的代理 | - |

**说明：**
1. **交互模式**：先通过 `search`/`trending` 等命令进入交互选择，选中后会自动安装
2. **直接安装**：如果你知道技能的全 slug，可以直接装：
   ```bash
   npx @skill-hub/cli install openclaw-skills-platonic-coding -y
   npx @skill-hub/cli install clean-code -y
   ```
3. **指定代理**：
   ```bash
   npx @skill-hub/cli install clean-code -a claude -y
   ```

---

## 四、管理自有技能

### 初始化新技能项目

```bash
npx @skill-hub/cli init [options]
```

**选项：**
| 选项 | 说明 |
|------|------|
| `-n, --name <name>` | 技能名称 |
| `-d, --description <desc>` | 技能描述 |
| `-c, --category <category>` | 技能分类 |
| `-y, --yes` | 跳过交互，使用默认值 |
| `--link <skill-id>` | 关联已有远程技能 |

### 列出我的技能

```bash
npx @skill-hub/cli list
npx @skill-hub/cli ls -a   # 显示详情
```

### 推送到远程

```bash
npx @skill-hub/cli push -m "更新了描述" --create
```

### 从远程拉取

```bash
npx @skill-hub/cli pull
npx @skill-hub/cli pull -v 2   # 拉取特定版本
```

### 发布到商店

```bash
npx @skill-hub/cli publish
```

### 查看同步状态

```bash
npx @skill-hub/cli status
```

### 账号管理

```bash
npx @skill-hub/cli login       # 登录
npx @skill-hub/cli logout      # 登出
npx @skill-hub/cli whoami      # 查看当前用户
```

---

## 五、交互选择模式

`search`、`trending`、`latest`、`top`、`recommend` 五个命令默认会进入交互选择模式（除非加了 `--no-select`）。

在交互模式下：
- 用 **上下箭头** 浏览列表
- 按 **回车** 选择技能 → 自动进入安装流程
- 安装流程会询问目标代理和确认

**⚠️ 注意：** 由于交互模式需要用户输入，在非交互环境中请使用 `--no-select` 先展示列表，然后让用户选择，再单独执行 `install` 命令。

---

## 六、自动化推荐话术

当用户说"找点好玩的"或不知道装什么时，按以下流程推荐：

1. 先跑 `trending -l 10 --no-select` 看今日趋势
2. 再跑 `top -l 5 --no-select` 看历史最佳
3. 整理成以下格式推荐给用户：

```
🔥 SkillHub 今日精选

🥇 [技能名] ⭐ N
   分类: xxx | 描述: xxx

🎯 推荐理由: xxx
```

4. 用户选好后用 `install` 命令安装

---

## 七、安装路径说明

默认情况下，`npx @skill-hub/cli install` 会安装到 `~/.claude/skills/` 或对应代理的默认路径。

对于 MioChat 环境，安装完成后可以告诉用户：
- 已安装的技能在对应代理的 skills 目录下
- 如果是通用型 SKILL.md，也可以复制到 `.agents/skills/` 目录供 MioChat 使用
