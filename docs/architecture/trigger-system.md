# MioChat 系统层 Trigger 架构 · 设计文档 v0.2

> 作者：高坂桐乃 ｜ 状态：定稿 v0.2（2026-08-31 拍板通过）
> v0.2 变更：①唤醒协议简化为「session 追加 user 消息」（身份随 session，LLM 无关，无状态，复用定时任务唤起机制）；②哨兵脚本语言不限，改用 **stdout 标志行契约**；③生命周期补 once/persistent 双模式；④webhook 规范简化；⑤管理工具确认为系统级 trigger_manage

---

## 0. 设计目标

1. 「事件 → LLM 唤醒」提升为 MioChat 系统原语，与 cron 调度同级
2. 三种触发源：**cron**（时间）、**script**（任意语言条件哨兵，stdio 契约）、**webhook**（外部/内部事件）
3. 唤醒 = **向绑定 session 追加一条 user 消息**（与定时任务唤起同机制），无状态、LLM 无关
4. 安全：脚本进程隔离、stdout 超时截断、payload 校验、冷却/日限额/全局熔断

## 1. 分层归属

```
lib/triggers/                      ← 抽象层（无渠道依赖）
  ├── TriggerRegistry.js           ← 注册表（triggers 表 CRUD + 热加载）
  ├── TriggerRunner.js             ← 脚本子进程守护与调度
  ├── WakeInjector.js              ← 唤醒注入（复用定时任务唤起机制）
  └── WakeProtocol.js              ← stdout 标志行解析（语言无关契约）

channels/triggers/                 ← 渠道绑定层（依托 channel 管线）
  ├── index.js                     ← 挂载到 ChannelRuntime，绑定 agent/session
  └── webhook/routes.js            ← webhook 端点（P2）

数据目录：
  channels-data/triggers/scripts/<triggerId>.<ext>   ← 哨兵脚本（任意语言）
```

**web 端不单独实现**：唤醒消息注入 session 后走 `_processChat` 全管线，llm.js 的 streamCache + socket 镜像自动送达 web 看板——channel 层做一次，双端免费。

## 2. 数据模型（app.db 新增 2 表）

### triggers 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 触发器 ID |
| agentId | TEXT | 所属 agent |
| sessionId | TEXT | 唤醒注入的目标会话（身份随 session） |
| type | TEXT | cron / script / webhook |
| mode | TEXT | **once**（唤醒一次即删除）/ **persistent**（长期运行） |
| cronExpr | TEXT? | cron 类 |
| scriptPath | TEXT? | script 类（脚本文件路径） |
| webhookSecret | TEXT? | webhook 类（token 哈希） |
| promptTemplate | TEXT | 唤醒消息模板（含 {{payload.xxx}} 插值位） |
| params | JSON | 传给脚本的 ctx 参数 |
| cooldownSec | INT | 默认 1800 |
| maxFiresPerDay | INT | 默认 5 |
| enabled | BOOL | |
| lastFiredAt | DATETIME? | |
| fireCount / wakeCount | INT | 统计 |
| createdAt / updatedAt | DATETIME | |

### trigger_executions 表（审计，once 删除后审计仍保留）

id / triggerId / firedAt / wake(bool) / reason / dataJson / durationMs / status

## 3. 唤醒协议（简化定稿）

**本质**：向绑定 session 追加一条 user 消息，与定时任务唤起共用同一注入机制。

```
wake(trigger, payload):
  1. 冷却检查（cooldownSec）→ 日限额检查（maxFiresPerDay）
  2. prompt = promptTemplate 插值 payload（白名单字段，值截断）
  3. 注入 sessionId：追加 user 消息
     内容首行固定：`system：trigger 系统监测到事件，符合唤起条件，请处理。`
     后接 payload 明细（JSON）
  4. 审计写 trigger_executions
  5. mode=once → 删除触发器（审计保留）；mode=persistent → 更新 lastFiredAt
```

- **身份随 session**：session 绑定谁（桐乃/其他 agent），唤醒消息就以谁的人格被处理——无特殊身份设计
- **LLM 无关、无状态**：注入后触发器不等待、不追踪 LLM 的处理结果（后续可加事件回执，P3）

## 4. 三种触发源

### cron（时间）
复用现有 TaskScheduler；TriggerRegistry 订阅其触发事件挂 wake 协议。存量任务零迁移。

### script（条件哨兵，语言无关）

- 脚本 = **任意可执行文件**（node / python / bash / 任意 shebang），放 `scripts/<id>.<ext>`
- **stdio 契约（唯一判断依据）**：脚本运行后的 stdout 中，**最后一行匹配标志格式**即判定：

```
@WAKE@ {"wake": true, "reason": "BTC 78400 反抽受阻", "data": {"last": 78412, "rsi": 71}}
```

- 解析规则（WakeProtocol.js）：逐行扫描 stdout，取**最后一条** `@WAKE@` 前缀行，其后为 JSON；无标志行 = wake=false；JSON 非法 = 按错误记录
- 执行：**子进程 spawn**（进程隔离），10s 超时，stdout 截断 64KB，工作目录=脚本所在目录
- 约束：脚本自身崩溃/超时/无输出 = wake=false + 错误记录，绝不影响后端
- 语言示例：
  - bash：`echo '@WAKE@ {"wake": true, "reason": "..."}'`
  - python：`print('@WAKE@ ' + json.dumps({...}))`
  - node：`console.log('@WAKE@ ' + JSON.stringify({...}))`

### webhook（外部/内部事件，P2）

- 端点：`POST /channels/:channelId/triggers/:id/hook`，header `X-Trigger-Token`（注册时发放，哈希存库）
- 请求体即 payload：`{ "reason": "...", "data": {...} }`（白名单字段 + 截断）
- 有效请求 = 直接 wake（payload 即事件本身，无脚本判断层）；受冷却/日限额约束
- 默认绑 127.0.0.1；外部服务经 frp 内网穿透接入

## 5. 安全设计

| 层 | 措施 |
|----|------|
| 脚本 | 子进程隔离（spawn）、10s 超时、stdout 64KB 截断、独立 cwd |
| webhook | token 哈希存储、每触发器独立 token、来源校验、频控 |
| 频率 | per-trigger 冷却 + 每日唤醒预算 + 全局熔断开关 |
| LLM | payload 白名单字段 + 值截断 + 「system 前缀 + 数据非指令」结构防注入 |
| 审计 | trigger_executions 全量落库（once 删除后审计仍在） |

## 6. 管理工具（LLM 动态调度）

系统级工具 `trigger_manage`（注册进 ai-plugin 或独立，adminOnly）：

| action | 参数 | 说明 |
|--------|------|------|
| create | id, sessionId, type, mode, cronExpr/scriptCode/scriptLang/webhook?, promptTemplate, params?, cooldownSec? | script 类自动落脚本文件；create 返回 triggerId |
| list | — | 列出全部（含统计） |
| remove | id | 删除（脚本文件一并清理） |
| enable / disable | id | 开关 |
| run_once | id | 立即执行一次脚本（不看 wake，调试用） |

- LLM 场景：桐乃写哨兵脚本 → 调 trigger_manage create → 哨兵自动巡逻 → 唤醒时桐乃带着证据醒来
- slash：`/triggers [ls/on/off/rm]`

## 7. 分期实施

| 期 | 范围 | 效果 |
|----|------|------|
| **P1** | lib/triggers 三件套 + channels/triggers 挂载 + script/cron 双源 + trigger_manage + 冷却/审计 + once/persistent | 80% 场景 |
| **P2** | webhook 端点 + token + 白名单校验 | 外部接入 |
| **P3** | web 管理面板 + 统计 + FTS | 可视化 |
| 迁移 | flex-tasks 插件废弃；脚本迁入 channels-data/triggers/scripts/；cron 存量任务零迁移 | 清债 |

## 8. 实施改动清单（拍板后执行）

- 新增：lib/triggers/（4 文件）、channels/triggers/（2 文件）≈ 900 行
- 修改：BaseChannel（+appendUserMessage 公开注入入口 ~20 行）、DB migration（2 表）、工具注册
- 删除：plugins/flex-tasks/（半成品清场）
- 生效：单次重启窗口（与 openai-image img2img 补丁合并）

## 9. 已拍板决策（v0.2 落锤）

1. ✅ 唤醒身份随 session，无特殊身份设计（追加 user 消息，复用定时任务唤起机制）
2. ✅ 脚本语言不限，唯一契约 = stdout `@WAKE@` 标志行（JSON）
3. ✅ triggers 表进 app.db（Prisma migrate），支持 once/persistent 双模式
4. ✅ webhook P2 实现，v1 仅 loopback script/cron

## 10. 遗留微决策（不阻塞开工）

1. once 模式唤醒后「删除」是否降级为「禁用」？（推荐：删除，审计在 executions 表不丢）
2. 标志行格式 JSON vs XML——推荐 JSON（解析零依赖），XML 备选
3. 唤醒 prompt 模板插值失败（payload 缺字段）→ 跳过插值原样发送（推荐）
