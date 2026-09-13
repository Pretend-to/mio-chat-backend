# Loop Engineering 深度解析 × MioChat Channel 侧源码对照

> 撰稿：高坂桐乃（3U Alpha Fund 风控总监） · 日期：2026-09-13
> 对照对象：mio-chat-backend 仓库 `channels/` + `lib/triggers/` + `lib/cron.js`
> 方法：概念侧搜集公开资料，工程侧逐文件读源码；本文所引源码行号以 2026-09-13 工作区快照为准。

---

## 0. 一句话结论

**Loop Engineering 讲的是「设计那个驱动 Agent 的外循环」；MioChat 已经把这套外循环的 70% 用工程手段实现完了，而且有两处设计比公开范式更激进——但也有三处关键缺口。**

- 比范式更强的：**零 Token 条件待机**（哨兵把「判断」下推到外部脚本进程）与**三层防爆**（冷却 / 日配额 / 指数退避）。
- 缺口所在：**独立验证者（Verifier）缺失**、**任务隔离（Workspace/Worktree）缺失**、**可验证停止条件的表达力弱**。

---

## 1. 概念层：Loop Engineering 到底是什么

### 1.1 定义

Loop Engineering（循环工程）是**设计、运营和持续改进反馈循环**的工程实践——这些循环让 AI Agent 能自主完成「规划 → 执行 → 观察 → 迭代」，直到任务真正完成。

它由 Google 的 **Addy Osmani** 在 2026 年 6 月系统整理，Anthropic Claude Code 负责人 **Boris Cherny** 与开发者 **Peter Steinberger** 分别独立提出同一判断。传播开的那句话很有杀伤力：

> 你不再是「给 Agent 写提示词的人」，而是「设计那个替 you 写提示词的系统的工程师」。

### 1.2 演进链：四层包裹关系

| 阶段 | 时间 | 回答的问题 | 代表 |
| --- | --- | --- | --- |
| Prompt Engineering | 2022–2024 | 怎么把一条指令说清楚 | 提示词模板、few-shot |
| Context Engineering | 2025 | 模型这一次能看到什么 | RAG、上下文裁剪、压缩 |
| Harness Engineering | 2026 初 | 模型外围的运行机制 | 工具、护栏、记忆、可观测性 |
| **Loop Engineering** | **2026** | **这一切怎么自己转起来** | 触发器 + 决策器 + 验证 + 记忆 |

每一层包裹前一层。前一代的核心资产（好的 prompt、好的 context、好的 harness）在这一代变成**被调度对象**。

### 1.3 核心公式

```
Loop = Trigger（何时开工） + Decider（这一轮做什么） + Verifiable Goal（什么算完） + Memory（下一轮记得什么）
```

- **Trigger**：定时（cron/心跳）、事件（webhook）、提及（mention）、人工介入。
- **Decider**：LLM 本身，退化成一个「子程序」。
- **Verifiable Goal**：必须可验证。「保证认证模块测试全绿且 lint 通过」可以，「把代码写好一点」不行。
- **Memory**：跨轮次、跨会话的持久状态。

### 1.4 内循环 / 外循环（最关键的区分）

| 层级 | 谁驱动 | 干什么 |
| --- | --- | --- |
| **内循环**（Agent 内置） | Agent 自己 | 读文件 → 改代码 → 跑测试 → 读报错 → 再改（ReAct 循环） |
| **外循环**（你设计的系统） | 你写的调度层 | 按计划发现任务 → 分派 Agent → 验证结果 → 记录状态 → 开下一轮 |

ReAct（2022）解决的是「当前这一步怎么走」；Loop Engineering 解决的是「这条路怎么一直走下去、什么时候停」。

### 1.5 六大骨架

1. **Heartbeat**：定时唤醒，让系统在没有人类输入时也能推进。
2. **Trigger / Discover**：谁来决定「现在有事要做」——这是外循环与内循环的分界线。
3. **Execute**：把任务丢给 Agent（可含子 Agent 并行）。
4. **Verify**：**独立于生产者**的检查者。写代码的和判断写没写完的，不能是同一个。
5. **Memory**：跨轮次状态。
6. **Isolation（Worktrees）**：多 Agent 并行时的文件/环境隔离，避免互相踩踏。

### 1.6 五类 Loop 模式

| 模式 | 形态 | 适用 |
| --- | --- | --- |
| ReAct Loop | Think→Act→Observe 单体内循环 | 短任务 |
| Plan-Execute Loop | 先出计划，再逐步执行 | 多步骤可控任务 |
| Reflection Loop | 执行后自评、再修 | 质量敏感任务 |
| Goal Long-running Loop | 声明目标 + 跨多轮持续跑，独立小模型判定是否达标 | 长期工程 |
| Optimization Self-Harness Loop | 连 harness 自己都改 | 元优化 |

### 1.7 已知的现实风险（别只看好话）

1. **Token 成本**：无人值守循环每推进一次都要读上下文、跑工具、重试；分工越细成本越高。
2. **质量漂移**：无人审核的循环里，AI 代码质量下滑更隐蔽。
3. **Goodhart 陷阱**：指标（测试全绿）达标了，但产品没变好。
4. **失控姿态**：目标漂移、无限循环、账单爆炸——AutoGPT（2023）就是前车之鉴。

**所以这套东西的真正难点不是「让循环转起来」，而是「让循环能停、停得对、停得起」。**

---

## 2. MioChat Channel 侧 Loop 解剖

### 2.1 全景：三类触发源 → 一个入口

```
                       ┌─────────────────────────────┐
 用户消息 ──────────▶  │                             │
 cron 定时任务 ─────▶  │   appendUserMessage()       │──▶ 单飞锁排队 ──▶ _processChat() ──▶ LLM（工具循环）
 哨兵 @WAKE@ ───────▶  │   （统一注入通道）           │        │
                       └─────────────────────────────┘        └─▶ 防抖合并 / 中途插话
```

**MioChat 最漂亮的一处设计**：无论来源是用户、定时任务还是哨兵，最终都被归一化成**一条注入会话的 User 消息**，走同一个 `appendUserMessage()`（`channels/common/BaseChannel.js:1052`）。这意味着「外循环」在架构上没有特权通道——它和用户说话完全等价。

- cron 注入（`lib/cron.js:214 _executeTask`）：`chn.appendUserMessage(sid, '[定时任务触发]\n' + finalPrompt, { isTask: true, ... })`
- 哨兵注入（`lib/triggers/WakeInjector.js`）：`targetChannel.appendUserMessage(sid, wakeMessage, { source: 'trigger', triggerId, ... })`

### 2.2 内循环：会话队列（BaseChannel）

| 机制 | 位置 | 作用 |
| --- | --- | --- |
| 入站防抖 | `BaseChannel.js:529 enqueueInboundDebounce` | 5000ms 窗口聚合连续消息；slash 指令与 `packet.immediate` 走直通（跳过防抖） |
| 统一路由 | `:712 _route` | 确认拦截 → Slash 指令 → 主路排队 |
| 会话单飞锁 | `:808 _enqueueSession` | 同一 session 串行，杜绝并发写上下文 |
| **批合并** | `:904 _drainNextSessionBatch` | 队列里堆了多条时，**合并成一次 LLM 调用**，并给用户发「检测到 N 个待处理任务，开始合并处理」提示 |
| 中途插话 | `:1084 _handleTransientFollowup` | 任务执行途中用户可插话，不必等循环结束 |
| 主流水线 | `:1156 _processChat` | soul + 全局记忆 + 结晶 → 拼装消息链 → 流式推理 → 落盘 |

注意 `_drainNextSessionBatch` 是**递归自调用**（每批处理完 `finally { await this._drainNextSessionBatch(sid) }`）——这本身就是一个典型的外循环骨架：**取任务 → 执行 → 收尾 → 再取**，直到队列空才释放锁。

**批合并是 MioChat 独有的成本优化**：Loop Engineering 范式里通常强调「并行开子 Agent」，MioChat 反其道行之，把**同一会话的多个触发合并成一次推理**。两种取向的取舍很清晰——并行换吞吐，合并换成本与上下文一致性。

### 2.3 中循环：LLM 工具调用（`channels/llm.js`）

`createBackendLlm`（`llm.js:694`，单文件 1562 行）承载实际推理。与循环相关的关键设施：

- `collectRecursiveUserMessages`（`llm.js:194`）：收集工具调用链中的递归用户消息。
- `appendRecursiveContextMessages`（`:233`）：把递归上下文按标记位重新拼回内容流。
- `convertChatHistoryToLLMHistory`（`:303`）：把持久化的 chatHistory（含 `tool_calls` 链）还原成 LLM 可消费的消息序列。
- `prepareChannelUserInput`（`:118`）：统一「文本 + 图片」的入参准备，保证 Web 镜像 / 落盘 / 当前请求看到同一个前缀。

这就是 ReAct 内循环的宿主层：多轮工具调用通过「递归上下文收集 + 历史还原」实现，而不是靠一个显式的 `while`。也就是说——**MioChat 的内循环是「由持久化历史驱动」的，而不是「由内存循环变量驱动」的**。这带来一个副作用：进程崩了，内循环状态不丢。

### 2.4 外循环 A：cron（Heartbeat）

- 实现：`lib/cron.js`（418 行），基于 node-cron。
- 入口：`TaskScheduler.initialize()` → 每个 active 任务 `cron.schedule(expr, () => this.runTaskById(id))`（`:181`）。
- 触发体：`_executeTask`（`:214`）构造标准 prompt 头：

```
[Current Time: ...]
[Execution Round: #N]
[AUTONOMOUS TASK MODE]
You are currently running as a background scheduled task. The user is NOT available...
```

注意 **`Execution Round: #N`** ——MioChat 的 cron 给 Agent 显式注入了「这是第几轮」，这是**循环计数器的显式化**，让模型知道自己身处一个循环而非一次对话。

- **硬性边界**：cron 工具描述里写死了「本工具没有外部条件判断能力，严禁用于监控价格/网页/接口/状态变化」。
  → 这是对「Trigger 能力边界」的诚实声明：**纯时间触发 ≠ 条件触发**。

### 2.5 外循环 B：sentinel（Discover / 条件触发）

四件套（都在 `lib/triggers/`）：

| 文件 | 职责 |
| --- | --- |
| `TriggerRegistry.js` (18KB) | 触发器持久化、审计日志、日限额计数 |
| `TriggerRunner.js` | 子进程 spawn / stdio 解析 / 超时 / 进程组 kill |
| `WakeProtocol.js` | `@WAKE@` JSON 契约的解析与构造 |
| `WakeInjector.js` | 冷却校验 → 配额校验 → 模板插值 → 注入会话 → 审计 → 生命周期 |
| `index.js` (17KB) | `TriggerService` 门面：对账、启停、重启退避 |

**核心机制：`@WAKE@` stdio 契约（语言无关）**

```js
// WakeProtocol.js
export const WAKE_PREFIX = '@WAKE@'
// 脚本在 stdout 输出：
// @WAKE@ {"wake": true, "reason": "BTC 突破 78400", "data": {"price": 78412}}
```

解析规则很克制：逐行扫描取**最后一条** `@WAKE@` 行，JSON 必须合法，`reason` ≤ 2KB，`data` ≤ 16KB，且必须是对象（数组直接判错）。

**这是整个系统里最「Loop Engineering」的一处设计**：
> **判断权被下推到了外部进程**。哨兵脚本自己循环、自己判断、自己决定何时叫醒 LLM。LLM 在待机期间 **零 Token 消耗**（sentinel 工具描述原话：「平时后台轻量运行，零 Token 消耗」）。

对比 Claude Code 的 `/loop`（每轮固定节奏唤醒，每轮都花钱）——MioChat 走的是**事件驱动 + 边缘判断**路线，成本结构完全不同量级。

**哨兵脚本长什么样**（`channels-data/triggers/scripts/btc_price_watch.js`）：

```js
// 一级参数：test（只验一次并退出） / loop（后台模式，缺参数不允许默认运行）
const runMode = process.argv[2]
const params = JSON.parse(process.env.TRIGGER_PARAMS || '{}')   // 参数经环境变量注入
for (;;) {
  const r = await checkOnce()
  if (r.hit) { console.log(buildWake(r)); process.exit(0) }     // 命中即吐出契约行并自杀
  await sleep(pollSec * 1000)
}
```

两个细节值得注意：
1. **`test` / `loop` 双模式强制**：缺参数不允许默认运行——防止「本意是调试，结果起了个生产轮询」。
2. **命中即 `process.exit(0)`**：一个进程生命周期内最多产生一次唤醒。`TriggerRunner` 甚至在注释里写明「上层服务会立即停止它，并在 persistent 模式下重新拉起一个干净实例」。

### 2.6 生命周期与三层防爆

**生命周期（once / persistent）** —— `WakeInjector._processWake` 尾部：

- `mode === 'once'`：注入成功即 `registry.remove(trigger.id)`（审计日志保留）。
- `mode === 'persistent'`：更新 `fireCount / wakeCount / lastFiredAt`。

**三层防爆**：

| 层 | 机制 | 位置 |
| --- | --- | --- |
| 1. 冷却 | `cooldownSec`（默认 1800s），冷却期内触发只记 `cooldown_skipped`，不唤醒 LLM | `WakeInjector._processWake` |
| 2. 日配额 | `maxFiresPerDay`（默认 5），达上限记 `quota_exceeded` | 同上 |
| 3. 指数退避重启 | `min(60s, 500ms × 2^attempt)`，attempt 上限 7；进程稳定运行 5s 后重置计数 | `TriggerService._scheduleRestart` (`index.js:376`) |

第 3 层有个很细的工程细节：`startTrigger` 里挂了一个 5 秒的 `stableTimer`，**只有活过 5 秒才清零重启计数**。也就是说「起-崩-起-崩」会被判定为不稳定并逐步拉长间隔，而「跑很久后偶尔崩」不会累积惩罚。

审计状态机也完整：`checked_no_wake / cooldown_skipped / quota_exceeded / woken / inject_failed / target_unavailable / error`。

### 2.7 记忆层

- `memory.readSoul()`（人格）+ `readAllGlobal()`（全局事实）+ `getCrystal(sid)`（会话结晶）在 `_processChat` 开头一次性载入。
- 结晶支持压缩（`/compact` 生成 XML 分区结晶）。
- 分层：Soul（人格）/ Global（跨 Agent 事实）/ Crystal（会话结晶）/ 会话历史落盘。

---

## 3. 逐项对照表

| Loop Engineering 要素 | MioChat 实现 | 评价 |
| --- | --- | --- |
| **Heartbeat** | `lib/cron.js` node-cron，day-boundary 清理任务，`Execution Round: #N` 显式轮次 | ✅ 有；且轮次显式化是加分项 |
| **Trigger 能力边界** | cron 声明「无条件判断能力」，条件交给 sentinel | ✅ 边界诚实，避免了「用定时器假装监控」的经典事故 |
| **Discover（条件发现）** | 哨兵脚本外部循环 + `@WAKE@` 契约 | ✅✅ **超越范式**：判断下沉到零成本进程 |
| **Decider** | 唤醒注入为标准 User 消息 → 复用宿主 Channel 的 Provider/Model/上下文 | ✅ 与范式一致，且「无特权通道」更干净 |
| **Verify（独立验证者）** | **无独立 Verifier**；靠同模型自检 + prompt 里的「先 preview 再 send」「禁止编造执行结果」等纪律 | ❌ **最大缺口**（违反「生产者≠验收者」铁律） |
| **Verifiable Goal** | 哨兵条件（价格阈值、RSS 变动）可验证；cron 任务的停止条件只能写在 prompt 里，机器不可判 | ⚠️ 部分；任务级停条件弱 |
| **Memory** | Soul / Global / Crystal（XML 分区）/ 会话历史 | ✅ 比 CLAUDE.md 式单文件更结构化 |
| **Isolation（Worktrees）** | **无隔离**：所有触发注入同一活跃会话，副作用直接落在生产环境 | ❌ 缺口，且有真实风险（我确实能在同一环境里改代码） |
| **防死循环** | 冷却 1800s + 日配额 5 次 + 指数退避（上限 60s） | ✅✅ 比多数公开实现完整 |
| **Human-in-the-loop** | `requestConfirmation` / 待确认队列 / 防抖可插话 / `_handleTransientFollowup` 中途插话 | ✅ 且比「暂停-恢复」更自然（直接插话） |
| **Observability** | `executions.json` 审计、pm2 日志、第三方渠道消息镜像到 Web 客户端、`channel_user_message` 广播 | ✅ 完整 |
| **成本控制** | 入口侧：冷却/配额/批合并；内部：`/compact` 结晶压缩 | ⚠️ 缺单循环内的 token 预算与卸载 |
| **多 Loop 协同（Factory）** | 15 个 cron 任务 + 3 个常驻哨兵，各自独立，无相互编排 | ⚠️ 未到 Factory 层 |

---

## 4. MioChat 的独到设计（教科书没写的部分）

1. **判断下沉（Judgment Offloading）**
   把「条件是否满足」交给外部脚本进程，LLM 只在命中时被叫醒。范式里 Trigger 只是「何时开工」，MioChat 把它升级成了「**何时才值得花钱**」。

2. **无特权注入通道**
   用户消息、定时任务、哨兵唤醒走同一个 `appendUserMessage`。好处：外循环天然享有内循环的全部能力（工具、记忆、确认拦截、插话），不需要为自动化单独开一条受限制的路径。

3. **批合并（Batch Merging）**
   同一会话堆积多个触发时合并成一次 LLM 调用，并在合并前告知用户。这是对「并行开子 Agent」路线的反向取舍：**牺牲吞吐，换 token 与上下文一致性**。

4. **进程稳定度作为重启惩罚的度量**
   5 秒 stableTimer + `2^attempt` 退避 + 上限 60s，把「崩溃频率」翻译成了「重启间隔」。这是把「无限循环/账单爆炸」风险工程化的具体答案。

5. **人格即对齐层**
   `Soul` 里那套「禁止编造执行结果」「先 preview 再 send」「没有止损的单一张都不开」——本质上是**把验收标准人格化**，让 Verify 环节由人格纪律而非独立 Agent 承担。（有用，但不如独立 Verifier 可靠，见缺口。）

---

## 5. 三处关键缺口与改造建议

### 缺口一：没有独立 Verifier（最严重）

- 现状：谁执行谁自检。我在跑晨报时，前端数据、渲染、发送全由同一次推理完成；「preview 验证」也只是我自己看。
- 风险：Goodhart / 自我一致性偏差——我会倾向于相信自己做对了。
- 范式要求：写代码的 Agent 和判断写没写完的 Agent **必须是两个**。
- **改造建议**：给 cron/sentinel 的产物加一道**独立校验脚本**（或独立小模型调用），例如：
  - 邮件类：渲染后校验必填板块是否非空（AI 电讯、GitHub、行情行数是否=4），不通过则回退并告警。
  - 交易类：开单后由脚本核对「止损是否真的挂上（algo orders 查得到）+ 保证金占比 ≤10%」，不通过立即平仓并点名。
  - 实现位置建议：`lib/triggers/verify/` 独立模块，或作为 cron `_executeTask` 的后置钩子。

### 缺口二：没有任务隔离

- 现状：所有触发落在同一活跃会话，工作目录也是同一个仓库。
- 风险：自动任务可以直接改生产代码（就是现在这个仓库），无沙箱、无 worktree、无 diff 审核。
- **改造建议**：
  1. 给「写操作类」任务分配独立工作目录 + git worktree（`/tmp/loop-<taskId>/`），产出以补丁形式回传；
  2. 生产仓库写入需显式确认（现有 `requestConfirmation` 机制可以直接复用）；
  3. 哨兵脚本目录（`channels-data/triggers/scripts/`）与主仓库权限分离。

### 缺口三：可验证停止条件表达力弱

- 现状：sentinel 的条件是硬编码在脚本里的；cron 任务的停止条件只能写在自然语言 prompt 里，机器无法判定。
- 后果：无法实现「跑两轮，把评分最高的三张给我」这类**可判定的多次迭代**，也无法自动检测「连续两轮无进展」。
- **改造建议**：
  1. 在触发器 schema 里加 `stopCondition: { type: 'jsonpath'|'expr', ... }`，由 Runner 在每轮结束时求值；
  2. 引入 `noProgressRounds`（连续 N 轮无产出即停）——这正是公开范式强调的「连续几次没进展就停下来回报」；
  3. 长期目标类任务改造成 Goal Long-running Loop：显式声明「可验证停止条件 + 暂停/恢复/清除」。

### 附：值得保持的三条纪律

1. **cron 只做时间，sentinel 只做条件**——这条边界一旦被打破，就会出现「用定时器轮询价格」这种既贵又不可靠的怪物。
2. **哨兵必须有 `test` 模式**——调试路径与生产路径分离，是防止「一次误部署撑爆配额」的关键。
3. **唤醒必须走冷却 + 配额**——没有这两层的循环系统迟早会自己把自己烧掉。

---

## 6. 关键源码索引（按调用链）

```
外循环 · 时间          外循环 · 条件                    内循环 · 执行
─────────────────     ──────────────────────────       ─────────────────────────────
lib/cron.js:14        lib/triggers/index.js:14          channels/common/BaseChannel.js:529  防抖
  TaskScheduler         TriggerService                   channels/common/BaseChannel.js:712  _route
lib/cron.js:181         :71  startScheduler               channels/common/BaseChannel.js:808  _enqueueSession
  cron.schedule          :155 startTrigger                 channels/common/BaseChannel.js:904  _drainNextSessionBatch（递归）
lib/cron.js:214          :376 _scheduleRestart            channels/common/BaseChannel.js:1084 _handleTransientFollowup
  _executeTask           :424 _handleScriptWake           channels/common/BaseChannel.js:1156 _processChat
                        lib/triggers/TriggerRunner.js     channels/llm.js:694  createBackendLlm
                          executeScript / startScript     channels/llm.js:194  collectRecursiveUserMessages
                        lib/triggers/WakeProtocol.js      channels/llm.js:303  convertChatHistoryToLLMHistory
                          parseWakeLine
                        lib/triggers/WakeInjector.js
                          processWake（冷却/配额/注入/审计）
                        channels-data/triggers/scripts/*.js
                          哨兵脚本（test|loop）
```

---

## 7. 一页总结

- **Loop Engineering 的价值主张**：把「你手动提示 Agent」换成「你设计提示 Agent 的系统」，并把停止条件、验证、记忆、隔离当作一等公民。
- **MioChat 的定位**：实现了外循环的 **Trigger / Decider / Memory / 防爆**，且在「判断下沉」和「成本结构」上走出了自己的路线；但在 **Verify / Isolation / 可验证停止条件** 三处仍是「内循环 + 人格纪律」在硬扛。
- **下一步最该做的一件事**：给自动化产物加**独立校验钩子**。因为循环真正危险的地方不是转不起来，而是**转错了还没人发现**。

> 桐乃按：范式会过时，但这三条不会——**能停、停得对、停得起**。
