
# MioChat LLM 适配器架构重构开发文档

| 项目 | 内容 |
| --- | --- |
| 文档版本 | **v4.4（定稿）** |
| 创建日期 | 2026-09-19 |
| 作者 | 桐乃（AI 工程搭档） |
| 审批人 | 老哥（架构决策 + 上线验收） |
| 关联提交 | `300d2bcb`（本轮 context 透传修复）、`cb929365`（SubAgent 工具快照重构） |
| 关联文档 | `docs/research/subagent-tool-injection-defect.md` |
| 当前状态 | **✅ 定稿（2026-09-20）—— 可直接进入实施** |

### 修订记录

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| v1 | 2026-09-19 | 初稿：现状分析 + 四阶段重构方案（仅后端） |
| v2 | 2026-09-19 | **按老板拍板扩围：UI/UX 心智模型一并重构**（新增第 13 章）；相应修订 §4.1 目标、§8.3 数据迁移结论（v1 的「无 DB 变更」在 v2 前提下不再成立）、§12 决策状态 |
| v3 / v4 | 2026-09-19 ~ 20 | 协议自动推断**废弃**、协议改普通下拉；「获取模型列表」与「测试连接」解耦；模型列表改标签流；游客模型改为“前端筛选、落库只存全称”（§13.3.8）；补充特殊形态 UX（§13.12）与现有 OAuth 机制核实 |
| **v4.3** | 2026-09-20 | **把「连接方式」向上抽成显式一等字段**（不再靠预设隐式带出）；确立“预设只填值、不改结构” |
| **v4.4** | 2026-09-20 | 按代码事实纠正 Vertex 描述（无 region 模板、无服务账号 JWT）：连接轴收敛为 4 项（含 `Vertex Express` 与 `Vertex ADC`），新增 §13.12.1；原型验收 40 条断言全绿 |

> **阅读提示**：标 **[实测]** 的结论，均由 2026-09-19 真实执行命令/脚本得出（可复现命令见附录 C）。标 **[推断]** 的结论尚未逐条验证，动手前必须先补验证。标 **[待拍板]** 的条目集中在第 12 章。

---

## 0. 定稿摘要（一页纸，2026-09-20）

> **要执行只看这一节就够**，细节在下方对应章节。“为什么这么定”的依据也都保留在文档里，但不再属于执行路径。

### 交付物

| 交付物 | 位置 |
| --- | --- |
| **可点交互原型（v4.4）** | **https://s3.krumio.com/file/web/37da4e/index.html** |
| 本文档（v4.4 定稿） | `docs/research/adapter-architecture-refactor.md` |
| 验收资产 | 同目录 `verify.mjs`（1,241 行，40 条断言全绿）与 `verification-result-v4.4-run.json` |

### 一句话目标

把 LLM 适配器从「**每家厂商一个类**」重构为「**协议家族是类，厂商是数据**」，并同步重构新增适配器的 UI/UX。

### UI 定稿（可直接实施）

- 表单固定 **7 个槽位**：`显示名 ｜ Base URL ｜ 连接方式 ▾ ｜ 协议 ▾ ｜ 凭据区 ｜ 模型 ｜ 游客`
- **协议轴（用户选，4 项）**：`OpenAI Chat Completions`（默认）/ `OpenAI Responses` / `Anthropic Messages` / `Gemini generateContent`；右侧**不加 tag**，下方写**一行适配器介绍**（不写鉴权）
- **连接轴（用户选，4 项）**：`API Key`（默认）/ `Vertex Express` / `Vertex ADC` / `OAuth 授权`；它决定**凭据区**怎么渲染（这是 v4.3 的核心修正：把隐式形态变成显式字段）
- **预设只填值、不改结构**；选中预设只改 4 个字段的取值，用户可随手改回
- **模型列表 = 标签流**：空格/回车落地、手打自定义、粘贴批量落地、拉取结果自动落地并去重
- **「获取模型列表」与「测试连接」解耦**；拉取失败**不阻断保存**
- **游客模型**：前端可用关键词做筛选器，**落库只存全称列表**（`guest_models: string[]`）——关键词是 yml 无 DB 时代的遗产
- 非法（连接方式 × 协议）组合 → **置灰 + tooltip**
- 弹窗固定高度 + 内部滚动（页面不滚）；模型区固定 5 行高、区内滚动

### 架构定稿

| 层 | 是什么 | 放哪里 |
| --- | --- | --- |
| **Metadata** | 厂商预设（默认 URL / 图标 / 介绍 / 默认值） | 数据表，不是文件 |
| **Protocol** | 四种线协议实现 | 4 个类（openai-chat / openai-responses / anthropic-messages / gemini） |
| **Override** | 仅三类：原生工具注入 / 鉴权传输 / 参数清洗 | 独立目录 + 强制注释“协议到底哪里不一样” |

### 四个适配器的最终处理

| 适配器 | 用户要做什么 | 我们要做什么 | 后端新增 |
| --- | --- | --- | --- |
| 绝大多数厂商 | 填 URL + Key | **零改动**（加一条 profile） | 无 |
| **xai / volcengine** | 什么都不用 | **零界面改动** | 无 |
| **vertex** | 填 project_id + 凭据（API Key 或 ADC） | 固定端点 + 必需参数块 | 无 |
| **geminiOAuth** | 点一次授权 | **复用现有 OAuth 机制** | **无**（现有实现已完整，见 §13.12.1 / §13.12） |

### 实施四阶段

| 阶段 | 内容 | 预估 | 风险 |
| --- | --- | --- | --- |
| **0 护栏** | 契约测试 + metadata 快照测试；**不动生产代码** | 0.5 天 | 极低 |
| **1 数据化** | 10 个零行为文件 → 数据，删 ~744 行；registry 去目录扫描 | 1 天 | 中 |
| **2 钩子化** | `_prepareChatBody` 变模板方法；deepseek / zhipu / xai / xiaomimimo 降为数据 | 1.5 天 | 中高 |
| **3 传输/认证策略化** | geminiOauth / agentPlatform 抽为策略对象；清理 `adapterType === 'vertex'` 类分支 | 2 天 | 高 |

> 前端 **U1（一跳表单）可与阶段 1 并行**，不被后端阻塞。

### 当前未落地（等拍板）

1. 阶段 0 是否立即开工；
2. 预设选中时是否同步协议下拉（现原型按“同步”实现）；
3. 非法组合“置灰” vs “允许选后报错”（现按置灰实现）；
4. 旧别名保留期限；
5. `configService.js` 里 `adapterType === 'vertex'` + `service_account_json` 分支是删还是补（现无对应实现文件）。

---

## 1. 摘要（TL;DR）

- **现状**：`lib/chat/llm/adapters/implementations/` 下 23 个文件、4369 行。真正承载协议实现的是 4 个基类（2549 行，占 58%）；剩下 19 个是厂商文件，而其中 **10 个文件的行为贡献为零**——除了 `static getAdapterMetadata()` 和构造函数里的 `this.provider = 'xxx'`，没有任何 override **[实测]**。
- **主张**：**协议家族是类，厂商是数据。** LLM 线协议本质上只有四种：OpenAI Chat Completions、OpenAI Responses、Anthropic Messages、Gemini generateContent。厂商差异应当被压缩为声明式配置，而不是新的子类。
- **触发这场讨论的不是审美，是一次真实故障**（§3.4）：四个适配器以同一种方式重写同一个方法，其中一条契约（`context` 透传）在复制时被漏掉，导致 27 个工具里有 18 个在 schema 投影阶段被**静默**剔除——无日志、无报错、无告警。
- **可量化收益**：删除 10 个文件 / 约 750 行；新增一个 OpenAI 兼容厂商从「抄 75 行 + 改 4 处」降为「加一条数据 + 一张图标」；协议契约由接口约束，而不是靠复制传播。
- **主要风险**：`getAdapterMetadata()` 的输出形状是**后端 API / 前端动态表单 / 图标解析**三方的既有契约，必须逐字段冻结；`type` 字符串是全系统主键（配置存储、运行时识别、图标解析），一个都不能改。
- **实施方式**：分 4 阶段（阶段 0 护栏 → 1 数据化 → 2 钩子化 → 3 传输/认证策略化），每阶段独立可上线、可回滚，每阶段结束都要过 §9 的验收表。

---

## 2. 背景与触发

### 2.1 触发事件（2026-09-19 13:31 起）

我在会话中被问到「你现在有哪些工具」。如实列举后发现问题：系统日志写着「注入工具数=27」，而我实际收到的 function schema 只有 9 个。追查结论：

1. **工具授权名单 = 27**（`lib/chat/llm/toolPolicy.js` → `applyAgentToolPolicy()`）——正确。
2. **工具 schema 投影**（`lib/function.js:105` → `#canProject(ctx,'schema')` → `evaluateToolAccess()`）拿到的 context 是**裸请求体**：没有 principal、没有 agentId。于是所有声明了 `requires.admin` / `requires.agentContext` 的工具被判为无权，`json()` 返回 `null`，随后**被静默丢弃**。
3. **context 为什么丢**：`deepseek.js` / `zhipu.js` / `xiaomimimo.js` / `xai.js` 把父类的 `_prepareChatBody(body, context)` 重写成了 `_prepareChatBody(body)`，并调用 `super._prepareChatBody(body)`——**参数少传一个**。父类于是 fallback 到裸 body。
4. **算术完全吻合**：27 − 18（terminal-pty 5 + file-editor 7 + ai-plugin 2 + agent-manager 4） = **9**，正是我手里那 9 个。
5. 已由 `300d2bcb` 修复并验证：真实调用四个适配器确认 context 已透传；`node --test` 相关用例 34/34 通过。

### 2.2 这个故障真正暴露的问题

不是某个文件手滑，而是**扩展方式本身在批量制造这类故障**：

1. 厂商适配器需要「在父类流程中间插一段自己的逻辑」，但父类没有声明式钩子，唯一可用的缝是**整段重写**；
2. 一旦选择整段重写，父类的契约（参数个数、传参语义、调用顺序、返回值形态）就只能靠**复制粘贴**传播；
3. 契约被漏抄时，**没有任何机制报警**——`json()` 权限判定失败返回 `null` 不打日志，「工具消失」在整个系统里是完全无声的。

本次漏抄的是 `context`。同类风险的下一个候选点，见 §3.5。

---

## 3. 现状分析（全部为实测）

### 3.1 文件规模与角色分层

`lib/chat/llm/adapters/implementations/` 共 23 个文件、4369 行。按职责可分为三层：

| 层级 | 文件 | 行数 | 说明 |
| --- | --- | --- | --- |
| **协议基类（4）** | openai.js | 646 | Chat Completions 家族基类 |
| | anthropic.js | 685 | Messages 协议 |
| | gemini.js | 694 | generateContent 协议 |
| | openai-responses.js | 524 | Responses API |
| **真差异型厂商（7）** | agentPlatform.js | 304 | 继承 GeminiAdapter，agent 协议 + 自定义 URL/鉴权头 |
| | geminiOauth.js | 168 | 继承 GeminiAdapter，OAuth 客户端 |
| | xai.js | 150 | 继承 OpenAIResponsesBot，删 reasoning + 原生工具 |
| | zhipu.js | 135 | 继承 OpenAIBot，thinking + web_search |
| | volcengine.js | 117 | 继承 OpenAIResponsesBot |
| | deepseek.js | 104 | 继承 OpenAIBot，effort 映射表 |
| | xiaomimimo.js | 93 | 继承 OpenAIBot，thinking |
| **零行为声明型（10）** | groq / minimax / perplexity | 73 × 3 | 无任何 override |
| | openrouter | 74 | 同上 |
| | baichuan / meituan | 75 × 2 | 同上 |
| | github / stepfun | 76 × 2 | 同上 |
| | kuaishou / zeroone | 77 × 2 | 同上 |

合计：协议基类 2549 行（58%）、零行为声明型约 **744 行**、其余厂商差异约 1071 行。

### 3.2 继承关系：21/23 挂在四根柱子上

**[实测]** 23 个实现里，只有 `geminiOauth` 与 `agentPlatform` 是二层继承（均 extends `GeminiAdapter`），其余 21 个直接 extends 四个基类之一。这从侧面证实了本文的核心判断：**真正需要区分的是四种线协议，不是二十三种厂商**。

### 3.3 十个「零行为」文件的同构性实测

我把这 10 个模块真实 import 进来、逐个调用 `getAdapterMetadata()`，并对返回结构做形态归一化（排序后去重）比对，结果：

| 检测项 | 结果 |
| --- | --- |
| `metadata` 顶层 key 形态数 | **1**（`avatarAliases, avatarId, description, initialConfigSchema, name, supportedFeatures, type`） |
| `initialConfigSchema` 字段名形态数 | **1**（`api_key, base_url, enable, models, name`） |
| 每个字段的子 key 形态数 | **1**（每个字段的 default/description/label/placeholder/required/type 完全一致） |
| `supportedFeatures` 取值数 | **1**（全部为 `chat,streaming,vision`） |
| override 的方法数 | **10/10 全为 0** |

也就是说：**这 744 行里，除 `type` / `name` / `description` / `avatarId` / `base_url.default` / `avatarAliases` 这六个值以外，没有任何信息量。** 它们把一份 schema 模板复制了 10 遍。

各文件的实际差异值（附录 A 有完整表）：

| type | avatarId | 备注 | base_url.default |
| --- | --- | --- | --- |
| groq | groq | — | https://api.groq.com/openai/v1 |
| github | github | — | https://models.inference.ai.azure.com |
| baichuan | baichuan | — | https://api.baichuan-ai.com/v1 |
| kuaishou | **kling** | ⚠️ 与 type 不一致 | https://api.klingai.com/v1 |
| meituan | **longcat** | ⚠️ 与 type 不一致 | https://api.longcat.chat/openai |
| minimax | minimax | — | https://api.minimax.chat/v1 |
| openrouter | openrouter | — | https://openrouter.ai/api/v1 |
| perplexity | perplexity | — | https://api.perplexity.ai |
| stepfun | stepfun | — | https://api.stepfun.com/v1 |
| zeroone | zeroone | — | https://api.lingyiwanwu.com/v1 |

> `kuaishou → kling`、`meituan → longcat` 是隐式耦合：这两个厂商复用他人的图标资源，但这件事只存在于代码里，没有任何地方声明。重构时应把它显式化为 `reuseAvatarFrom` 之类的字段。

### 3.4 结构性成因（git 考古）

**[实测]** 用 `git log -S` 逆推得到的时间线：

1. `9e777011` —— *feat: implement _prepareChatBody with thinking mapping in ZhipuAdapter*。最早是智谱的 thinking 映射需求，产生了第一个厂商级 override。
2. `3da79f42` —— *refactor: unify tool call handling and simplify extra thinking logic in LLM adapters*。**历史上确实抽象过一轮**，抽出了基类的 `_applyExtraThinkingBody(preparedBody, effort, table = null)`（openai.js:603）。但**只抽了「怎么应用 thinking」这半截，没抽「整个装配流程」**。原因是基类的 `_prepareChatBody` 仍然是一个**具体实现**而非模板方法，唯一的扩展缝就是这个可选参数 helper。
3. `1b3544de` —— MiMo 的 thinking / reasoning_content 缓存需求 → 第三份 override。
4. `2596ab74` —— *refactor(adapters): 规范化全 LLM 适配器 extraSettings 提取 + 补全 xAI/智谱/Anthropic 联网搜索测试*。zhipu 与 xai 的原生工具注入是**同一个提交里平行加上去的**，两段 `isEnabled()` 判定 + `findIndex(t => t.type === ...)` upsert 几乎逐字相同。

结论：**没有任何人设计过这份分层，它是「每接一家厂商就往里塞一段」的累积产物。** 你指出的「一样的行为模式应该沉到基类」，正是 `3da79f42` 做到一半没做完的事。

另有一个明确的设计气味：基类在流程**中途**会 map/delete `reasoning_effort`，逼得每个子类都必须「在 super 之前先把原始值抢出来」。这条惯例同样被复制了四遍。

### 3.5 现存耦合点清单（重构必须逐项处理的清单）

**[实测]** 按 `adapterType` / `metadata.type` 做分支判断或身份识别的地方：

| 位置 | 耦合形式 | 风险等级 |
| --- | --- | --- |
| `lib/server/http/services/configService.js:296` | `if (adapterType === 'vertex')` | 中 |
| `lib/server/http/services/configService.js:1633` | `if (adapterType === 'vertex')` | 中 |
| `lib/server/http/services/configService.js:216` | 硬编码 `['openai','gemini','vertex']` | 中 |
| `lib/chat/llm/index.js:197` | `if (adapterType === 'vertex')` | 中 |
| `lib/chat/llm/index.js:217` | `if (adapterType === 'geminiOauth' && ...)` | 中 |
| `lib/chat/llm/adapters/implementations/agentPlatform.js:150` | `if (metadata.adapterType === 'gemini')` | 高 |
| `lib/plugins/ai-plugin/tools/draw.js:231,255` | 以 `getAdapterMetadata()?.type` 作为运行期身份 | 低 |
| `lib/plugins/ai-plugin/tools/search.js:45` | 同上 | 低 |
| `lib/plugins/anyui-plugin/tools/sendUi.js:78` | 同上 | 低 |

> 这些分支大多数可以用「profile 上的能力标志」替掉（例：`if (adapterType === 'vertex')` → `if (profile.requiresVertexEndpoint)`），属于阶段 3 的内容。

### 3.6 注册表机制与启动成本

**[实测]** `lib/chat/llm/adapters/registry.js`（165 行）的四个导出函数 `getAdapterTypesSync` / `getAvailableAdapterTypes` / `getAdapterAliasesMap` / `getAdapterMetadataList`，各自重复一遍相同的逻辑：`readdirSync(implementationsDir)` → 逐个 `await import()` → 取 `getAdapterMetadata()`。

后果：
- 新增厂商 = 新增文件（而不是新增数据）；
- 每次冷启动/缓存失效都要把 23 个模块（含各自的上游依赖）import 一遍；
- 测试环境同样承担这个成本；
- 四个函数各自扫目录，逻辑重复四份。

### 3.7 配置持久化形态

**[实测]** 适配器实例**不在** `llm_adapters` 表里（该表当前 **0 行**），而是存在 `system_settings` 表的 `llm_adapters` 键下，形状为：

```json
{
  "openai": [ { "name": "...", "enable": true, "api_key": "...", "base_url": "...", "models": [] } ],
  "gemini": [ ... ],
  "vertex": [ ... ]
}
```

读取路径：`configService.js:545 / 575-595`（还会把运行时状态 `status` / `errorMsg` 回填到实例对象上）。

> 这一条对重构极其重要：**`type` 字符串是配置存储的分组主键**，只要 type 不变，存量配置就能无感兼容。

---

## 4. 目标与非目标

### 4.1 目标

| 编号 | 目标 | 可度量指标 |
| --- | --- | --- |
| G1 | **协议家族化**：只保留四种协议实现作为类 | 协议类数量 = 4 |
| G2 | **厂商数据化**：厂商差异降为声明式 profile | 声明型厂商文件数 10 → 0 |
| G3 | **契约显式化**：厂商差异通过命名钩子扩展，禁止整段重写装配流程 | `implementations/` 下定义 `_prepareChatBody` 的文件数 = 0（用 lint 规则守卫） |
| G4 | **注册表去动态扫描**：registry 读数据表，不再 `readdirSync + import` | 冷启动 import 适配器模块数 23 → 6 |
| G5 | **告别静默失败**：schema 因权限被剔除时必须留痕 | 投影阶段丢弃计数 + warn/debug 日志 |
| G6 | **新增厂商成本降级** | 从「新建文件 + 抄 75 行 + 改 6 处」→「profile 表加 1 条 + 图标 1 张」，代码变更行数 ≤ 10 |
| G7（v2 新增） | **协议显性化、厂商隐性化**：UI 以「协议 + Base URL + 凭据」为用户心智模型 | 新增流程里不再出现「选择适配器类型」弹窗 |
| G8（v2 新增） | **一跳添加 + 预设降级为辅助** | 新增服务商点击数 3 → 1；必填字段 5 → 3；删掉全部内置预设系统仍可用 |

### 4.2 非目标（明确不做）

- ❌ **不重写四个协议基类的内部实现**（流式解析、工具调用组装、多模态处理、OAuth 客户端）。它们是真资产，本次只动「装配流程的扩展方式」。
- ❌ **不改任何 `type` 字符串**。它是配置存储分组键、运行期身份、图标解析键，改了就是破坏性变更。
- ❌ **不改前端表单渲染机制**。前端继续由 `initialConfigSchema` 驱动，后端保证 Schema 形状只增不减。
- ❌ **不引入新依赖**，不引入数据库 migration（配置存在 `system_settings`，无需 schema 变更）。
- ❌ **不动图片/搜索/邮件适配器体系**（image_adapters / search_adapters），它们与 LLM 适配器是平行体系，但本文的结论将来可复用。

---

## 5. 目标架构设计

### 5.1 四根柱子与职责边界

| 协议家族 | 现状文件 | 承载什么 | 不应承载什么 |
| --- | --- | --- | --- |
| OpenAI Chat Completions | `openai.js` | messages/tools/多模态/流式/thinking 装配 | 任何厂商名 |
| OpenAI Responses | `openai-responses.js` | Responses 协议字段、`reasoning`、工具声明格式 | 任何厂商名 |
| Anthropic Messages | `anthropic.js` | content blocks、thinking blocks、tool_use | 任何厂商名 |
| Gemini generateContent | `gemini.js` | contents/parts、safetySettings、functionDeclarations | 任何厂商名 |

判定原则：**“换一家厂商要不要改这段代码？”** 要改 → 属于协议层；不用改、只是值不同 → 属于 profile 数据。

### 5.2 ProviderProfile 数据模型（草案）

```js
// providers/profiles.js （目标形态，字段名待定稿）
{
  type: 'deepseek',                 // 冻结：全局主键，永不改
  protocol: 'openai-chat',          // 四选一，决定挂在哪根柱子上
  name: 'DeepSeek',
  description: '...',               // markdown，前端直接渲染
  baseUrl: 'https://api.deepseek.com/v1',
  auth: { kind: 'bearer' },         // 鉴权策略，阶段 3 引入
  avatarId: 'deepseek',
  avatarAliases: { deepseek: 'deepseek' },
  aliases: [],                      // 历史 type 别名（配置迁移用）
  features: ['chat', 'streaming', 'vision', 'tools', 'reasoning'],
  // —— 厂商参数差异 ——
  reasoningEffortTable: { '-1': 'high', 0: undefined, 1: undefined, 2: 'high', 3: 'high', 4: 'max', 5: 'max' },
  defaultReasoningEffort: -1,
  nativeTools: [],
  postProcess: null,                // 仅极少数厂商需要（计划不超过 2 个）
}
```

字段消费者登记（**新增字段必须登记，否则不许加**）：

| 字段 | 消费者 | 阶段 |
| --- | --- | --- |
| `type` / `name` / `description` / `supportedFeatures` / `initialConfigSchema` | `/api/config/adapter-types` → 前端适配器管理页 | 现在 |
| `avatarId` / `avatarAliases` | 后端 `/p/mava` 图标解析 | 现在 |
| `protocol` | 工厂（选择基类） | 阶段 1 |
| `reasoningEffortTable` / `defaultReasoningEffort` | 基类模板方法 | 阶段 2 |
| `nativeTools` | 基类 `_upsertNativeTool` | 阶段 2 |
| `auth` / `transport` | 鉴权/端点策略 | 阶段 3 |
| `reuseAvatarFrom` | 图标解析（现在的 kuaishou→kling 隐式复用） | 阶段 1（可选） |

### 5.3 厂商差异三等分与归属

| 类型 | 判定标准 | 厂商 | 重构后形态 |
| --- | --- | --- | --- |
| **声明型**（10） | 零 override | groq / github / baichuan / kuaishou / meituan / minimax / openrouter / perplexity / stepfun / zeroone | profile 表一行 |
| **参数型**（5） | 只改 effort 映射 / thinking / 原生工具 | deepseek / zhipu / xai / xiaomimimo / volcengine | profile 字段 + 至多一个 `postProcess` |
| **传输/认证型**（2） | 改了 URL 拼接、鉴权头、模型拉取 | geminiOauth / agentPlatform | protocol + 可复用 transport/auth 策略对象 |

### 5.4 模板方法与钩子契约（核心）

```js
// protocols/openai-chat.js（目标形态，节选）
async _prepareChatBody(body, context = null) {   // 唯一实现，子类/厂商禁止重写
  const rawEffort = body.settings?.chatParams?.reasoning_effort
  const prepared = await this._buildChatRequestBody(body, context)   // 含 tools 投影（需要 context）

  this._applyExtraThinkingBody(
    prepared,
    rawEffort ?? this.profile.defaultReasoningEffort,
    this.profile.reasoningEffortTable ?? null,
  )

  for (const t of this.profile.nativeTools ?? []) {
    this._upsertNativeTool(prepared, t, body)     // 替换 zhipu/xai 那两段重复块
  }

  const finalized = await this.postProcessChatBody(prepared, body, context)  // 默认恒等
  return this.cleanUndefined(finalized)
}

// 默认可覆盖点（显式命名，带 JSDoc 契约）
async postProcessChatBody(preparedBody, body, context) { return preparedBody }
_upsertNativeTool(preparedBody, descriptor, body) { /* 统一 upsert，不重复实现 */ }
```

对比收益（以 deepseek 为例）：

| | 改前 | 改后 |
| --- | --- | --- |
| 代码 | 30+ 行 override（含完整 super 调用与返回值处理） | profile 里两张表，共 2 行 |
| 契约风险 | 重写时必须记得传 context（本次就漏了） | 基类唯一实现，**不可能漏** |
| xiaomimimo | 12 行 override | **整个 override 可删** |

### 5.5 不变式（Invariants，写成测例）

- **I1**：`_getFormattedTools` 收到的 context 必须与 `_prepareChatBody` 收到的 context 是**同一个对象**（本次故障的直接防弹衣）。
- **I2**：`implementations/` / `providers/` 下的任何文件不得定义 `_prepareChatBody`（lint 规则 + 测试双重守卫）。
- **I3**：`getAdapterMetadata()` 输出的字段名集合不得小于冻结快照（只允许新增，不允许删除/重命名）。
- **I4**：任何 `type` 字符串不得变更；历史别名必须保留在 `aliases`。
- **I5**：工具 schema 因权限/场景被剔除时，必须产生可观测记录（计数器 + 日志）。
- **I6**：每个 profile 必须有图标来源（自有 `avatarId` 或显式 `reuseAvatarFrom`）。

### 5.6 删除清单 / 保留清单

**可删**（阶段 1）：`groq.js`、`github.js`、`baichuan.js`、`kuaishou.js`、`meituan.js`、`minimax.js`、`openrouter.js`、`perplexity.js`、`stepfun.js`、`zeroone.js`（共 10 个文件 / 约 744 行）

**可大幅瘦身**（阶段 2）：`xiaomimimo.js`（全删 override）、`deepseek.js`（降为数据）、`zhipu.js` / `xai.js`（只剩原生工具声明）

**保留不动**（本次）：`openai.js`、`openai-responses.js`、`anthropic.js`、`gemini.js`、`geminiOauth.js`、`agentPlatform.js`、`volcengine.js`（最后三个在阶段 3 评估）

---

## 6. UI / UX 设计与影响（重点章节）

> 本章所有“现状”结论均来自真读前端仓代码：`/www/fake_mio/servers/mio-chat-frontend`（Vue 3 + Element Plus）。

### 6.1 现状链路：一个适配器卡片是怎么被渲染出来的

```
前端适配器管理页 src/views/settings/LLMAdaptersView.vue（1415 行）
  ├─ 卡片图标： <img :src="getAvatarByAdapterType(type)">          （第 352 行）
  │     └─ src/utils/avatar.js:77   return `/p/mava?adapter=${adapterType}`
  │           └─ 后端 lib/server/http/index.js:706  app.get('/p/mava', imageController.getModelAvatar)
  │                 └─ imageController.js:25-28
  │                       map[meta.type.toLowerCase()] = (meta.avatarId || meta.type).toLowerCase()
  │                       + 展开 meta.avatarAliases
  ├─ 新增/编辑弹窗 src/components/settings/AdapterEditor.vue（665 行）
  │     └─ 第 176 行  const schema = adapterInfo?.initialConfigSchema || {}   ← 完全 Schema 驱动
  └─ 数据来源 GET /api/config/adapter-types（src/lib/configApi.js:209）
        └─ 后端 configService.getAdapterTypes()，响应体：
           { adapters: [{ description, extraSettingsSchema, initialConfigSchema, name, supportedFeatures, type }], count, types }
```

**这个架构本身是好的**：API 只传 schema，UI 不硬编码厂商。前端仓 **未出现任何厂商名硬编码**（搜 `groq` / `perplexity` / `baichuan` / `zeroone` 无命中）[实测]。所以本次重构**天生对前端友好**——前提是后端把响应形状冻结。

### 6.2 对用户的可见影响：目标为零

| 用户行为 | 期望看到的（与改前完全一致） | 保障手段 |
| --- | --- | --- |
| 打开适配器管理页 | 卡片数量、排序、名称、描述、图标全部一致 | metadata 快照测试（§8.1） |
| 搜索/新增适配器 | 可选项列表一致（10 个厂商一个不少） | `getAvailableAdapterTypes()` 返回集合断言 |
| 点开配置表单 | 字段名、label、placeholder、required、默认值完全一致 | `initialConfigSchema` 逐字段快照比对 |
| 填写 base_url | 默认值仍然是对应厂商的默认端点 | 附录 A 的 base_url 表变成断言用例 |
| 看卡片图标 | `kuaishou` 仍显示 kling 图标、`meituan` 仍显示 longcat 图标 | `avatarId` 冻结 + I6 不变式 |
| 保存/重载配置 | `system_settings.llm_adapters` 结构不变，实例数据不丢 | type 冻结（I4）+ 幂等迁移 |
| 发起对话/拉模型列表 | 行为、流式、工具调用、多模态全部不变 | §8.2 端到端冒烟 |
| 出错时的提示 | 错误文案不因重构而变化 | adapter 套件回归 |

**一句话：重构不应让用户看到任何差异。** 如果某个 UI 变了，那就是重构出了 bug，不是“优化”。

### 6.3 UI/UX 增强建议（与本重构解耦，可单独拍板）

**A. 让“只有四种协议”对用户可见（推荐，可与阶段 1 同批）**
- 后端 `metadata` 新增 `protocolFamily`（`openai-chat` / `openai-responses` / `anthropic-messages` / `gemini`）；
- 前端适配器列表增加**分组视图 / 筛选器**（默认仍平铺，不改变默认体验）；
- 新增适配器弹窗里显示一行小字：“底层协议：OpenAI Chat Completions”；
- 价值：以后遇到“某厂商兼容层行为不一致”时，用户能直接看出它属于哪个家族。

**B. 图标复用显式化（推荐）**
- 现状 `kuaishou → kling`、`meituan → longcat` 是隐式巧合（代码里只写了 `avatarId`）；
- 改为 profile 显式声明 `reuseAvatarFrom: 'kling'`，并在图标缺失时回退到统一的占位图；
- 价值：以后新增厂商忘配图标时，UI 不会出现碎图/404，而是可识别的占位。

**C. 可观测性面板（强烈推荐——这是本次故障的直系产物）**
- 后端将“工具 schema 投影结果”暴露为健康指标：授权数 / 投影数 / 被剔除数 + 剔除原因（`admin_required` / `agent_context_required` / `not_in_allowlist`）；
- 前端在适配器详情或系统状态页展示一行：“工具投影：27/27”，异常时标黄并展示首条剔除原因；
- 价值：本次“27 → 9 静默丢失”这类故障下次会**在 UI 上当场露馅**，而不是等我被追问才发现。

**D. 表单能力增强（可选，为 profile 化铺路）**
- `initialConfigSchema` 字段支持 `advanced: true`（默认折叠）、`dependsOn`（条件显示）、`group`（分组）；
- 价值：当 profile 字段变多时，UI 不会变成一坨。**向后兼容**：老 schema 不写这些键，行为不变。

**E. “零代码新增厂商”向导（需拍板，慎重）**
- 既然新厂商只是一条数据，技术上完全可以做成 UI 表单直接新增一个 OpenAI 兼容厂商；
- **风险**：会绕开开发审计、可能被填入内网地址/非法端点。建议仅对管理员开放，并强制白名单/审计日志。**默认不开，标为 [待拍板] 议题**。

### 6.4 交互验收清单（人工点检，共 12 项）

阶段 1 上线后，请按此表逐项确认（可只看结果不看代码）：

| # | 操作 | 预期结果 |
| --- | --- | --- |
| 1 | 打开适配器管理页 | 卡片总数与改前一致；无碎图 |
| 2 | 核对 10 个样板厂商的卡片名称与描述 | 与改前逐字一致 |
| 3 | 点开 `groq` 配置表单 | 5 个字段（API Key / Base URL / 启用 / 模型列表 / 实例名称）齐全，默认 URL 为 `https://api.groq.com/openai/v1` |
| 4 | 点开 `kuaishou` 卡片 | 图标仍为 kling 图标 |
| 5 | 点开 `deepseek` 卡片并发送一条对话 | 思维链/思考强度行为与改前一致 |
| 6 | 点开 `zhipu` 并开启联网搜索 | `web_search` 工具仍被注入（行为不变） |
| 7 | 新增一个 `openrouter` 实例并保存 | 写入成功，重载后实例仍在 |
| 8 | 重启后端后重新打开页面 | 实例/图标/描述全部保留（无配置丢失） |
| 9 | 在对话里问“你现在有哪些工具” | 应报出完整工具集（不再是 9 个） |
| 10 | 看图片/搜索适配器页面 | 完全不受影响 |
| 11 | 手机窄屏访问管理页 | 卡片布局不错位（El Plus 栅格自适应） |
| 12 | 故意看一次日志 | 无新增 ERROR；若启用 C 项，工具投影健康指标可见 |

---

## 7. 实施计划（阶段 0-3）

> 总体原则：**先护栏、再重构；每阶段一个可独立回滚的提交；每阶段都跑完整适配器套件。** 预估工时为纯工程口径，不含等待重启/验收的间隔。

### 阶段 0：护栏（必须先行）

| 项 | 内容 |
| --- | --- |
| 范围 | 只新增测试，不改生产代码 |
| 交付物 | `tests/adapters/contract.test.js`（不变式 I1：对 `implementations/` 下每个适配器，打桩 `_getFormattedTools` 后调用 `_prepareChatBody(body, event)`，断言收到的 context 与传入的是**同一对象**）；`tests/adapters/metadata-snapshot.test.js`（不变式 I3：对 `getAdapterMetadataList()` 全量输出做快照） |
| 前置 | 无 |
| 风险 | 极低（纯新增） |
| 回滚 | 删文件 |
| 验收 | ① `node --test` 全绿；② **负向验证**：临时把 `deepseek.js` 改回 `_prepareChatBody(body)`，契约测试必须变红；改回后变绿 |
| 预估 | 0.5 天 |

> 阶段 0 的意义：把本次故障变成一个**永远不会再发生**的约束，而且它完全不依赖后面的重构。就算阶段 1-3 全部不做，这一步也值得。

### 阶段 1：声明型适配器数据化（10 个文件 → 数据）

| 项 | 内容 |
| --- | --- |
| 范围 | 新增 provider profile 表 + 工厂 `makeAdapter(profile)`；`registry.js` 改为读数据表（不再 `readdirSync + import`）；删除 10 个样板文件 |
| 强约束 | `getAdapterMetadata()` 输出字段集**只增不减**；`initialConfigSchema` 逐字段比对一致；`type` 不变 |
| 前置 | 阶段 0（快照测试必须已就位） |
| 风险 | 中（面广但语义单一）；最大风险是漏字段或漏 aliases |
| 回滚 | 单个 commit revert（项目无 DB schema 变更，无数据风险） |
| 验收 | §6.4 的 12 项 UI 点检 + 快照测试 + §8.2 端到端冒烟 |
| 预估 | 1 天 |

### 阶段 2：参数型差异钩子化

| 项 | 内容 |
| --- | --- |
| 范围 | 把 `_prepareChatBody` 改为模板方法（§5.4）；deepseek / zhipu / xai / xiaomimimo 降为 profile 字段；抽取 `_upsertNativeTool` + `isFeatureEnabled`；新增 I2 守卫（禁止厂商文件定义 `_prepareChatBody`） |
| 前置 | 阶段 0（契约测试是本次重构唯一安全网） |
| 风险 | 中高（直接改装配流程，涉及 reasoning / thinking / 原生工具） |
| 回滚 | 单 commit revert；建议保留旧类一个版本以便对照 diff |
| 验收 | 适配器套件（deepseek / xai / xiaomimimo / openai / anthropic / gemini / volcengine）+ 人工验证：① deepseek 思考强度映射 ② zhipu 联网搜索注入 ③ xai 不报 reasoning.error |
| 预估 | 1.5 天 |

### 阶段 3：传输/认证策略化 + 耦合点清理

| 项 | 内容 |
| --- | --- |
| 范围 | `geminiOauth` / `agentPlatform` 的鉴权与传输抽为策略对象；将 §3.5 的 `adapterType === 'vertex'` 类分支替换为 profile 能力标志 |
| 前置 | 阶段 1-2 已稳定运行一周（建议） |
| 风险 | **最高**（OAuth 登录态、模型拉取、vertex 双形态） |
| 回滚 | 单 commit revert；OAuth 需回归登录流程 |
| 验收 | Gemini OAuth 重新登录 + 模型列表 + 对话全链路；agentPlatform 模型拉取；vertex 配置读写 |
| 预估 | 2 天 |

### 总览

| 阶段 | 产出 | 预估 | 可否单独价值交付 |
| --- | --- | --- | --- |
| 0 | 契约 + 快照测试 | 0.5 天 | ✅ 强烈建议先做 |
| 1 | 删 10 文件 / 744 行 | 1 天 | ✅ |
| 2 | 装配流程钩子化 | 1.5 天 | ✅ |
| 3 | 传输/认证策略化 | 2 天 | ✅ |

---

## 8. 兼容性与迁移

### 8.1 冻结契约（逐字段）

`GET /api/config/adapter-types` 响应中的 `adapters[]` 元素：

| 字段 | 类型 | 可否缺省 | 消费者 |
| --- | --- | --- | --- |
| `type` | string | ❌ 必须 | 配置分组键、图标、运行期身份 |
| `name` | string | ❌ 必须 | 卡片标题 |
| `description` | string(markdown) | ❌ 必须 | 卡片描述、`/api/base-info` 注入 |
| `initialConfigSchema` | object | ❌ 必须（可空对象） | `AdapterEditor.vue:176` 动态表单 |
| `extraSettingsSchema` | object | ✅（默认 `{}`） | 高级设置表单 |
| `supportedFeatures` | string[] | ✅（默认 `[]`） | 特性徒章 |
| `protocolFamily`（**新增**，阶段 1） | string | ✅ | 分组/筛选（前端未升级时忽略） |

**不在该 API 里但同样是契约的**：`avatarId` / `avatarAliases`（后端 `/p/mava` 内部消费，见 `imageController.js:25-28`）。

### 8.2 冻结标识

- `type` 字符串：全系统主键（`system_settings['llm_adapters']` 的分组键、运行期识别、图标）。
- `avatarId`：代表图标资产名，一旦变更会导致用户可见的图标变化（`kuaishou→kling`、`meituan→longcat` 必须保留原值）。
- `aliases` / `avatarAliases`：兼容旧配置的别名，只增不减。

### 8.3 配置数据迁移

> ⚠️ **v2 修订**：以下结论分两种前提，别看错。

**前提 A：仅执行阶段 0-3（不开放用户自定义服务商）**
- 无 DB schema 变更；实例存在 `system_settings['llm_adapters']` 的 JSON 里，形状不变。
- **不需要写 migration**，只需保证 `type` 不变 + 继续支持 `aliases` 旧名查找。

**前提 B：采纳第 13 章的 v2 设计（用户可自由新增服务商）**
- v1 的“无 DB 变更”结论**不再成立**。一旦用户可以自填 base_url，`type` 就不能再当主键（详见 §13.5）。
- 需将 `{ <type>: [instances] }` 迁移为**平铺实例数组**，每条补齐 `instanceId` / `protocol` / `presetRef`（可空）。
- 迁移必须**幂等**，旧键保留只读一段时间（供回滚），确认稳定后再删。
- **上线前务必备份 `system_settings` 的 `llm_adapters` 键。**

### 8.4 回滚策略

| 层级 | 手段 |
| --- | --- |
| 代码 | 每阶段一个独立 commit，`git revert` 即回退；阶段 1-3 不堆积在同一提交 |
| 数据 | 无 schema 变更，无需数据回滚 |
| 运行时 | 环境变量 `ADAPTER_REGISTRY=data\|legacy` 双实现开关（可选；若不放心可以加，两周后移除） |
| 发布 | 后端先行，前端**无需发版**（除非采纳 §6.3 的 A/C 增强） |

---

## 9. 测试与验收标准

### 9.1 测试清单

| 类型 | 文件 | 状态 | 覆盖 |
| --- | --- | --- | --- |
| **新增** | `tests/adapters/contract.test.js` | 阶段 0 | 不变式 I1（context 同一性）+ I2（禁止厂商重写装配方法） |
| **新增** | `tests/adapters/metadata-snapshot.test.js` | 阶段 0 | 不变式 I3（metadata 形状冻结） |
| **新增** | `tests/adapters/provider-profiles.test.js` | 阶段 1 | profile ↔ 冻结元数据双向一致（每个字段都有消费者且无遗漏） |
| 现有 | `tests/adapters/{deepseek,xai,xiaomimimo,openai,anthropic,gemini,volcengine}.test.js` | 已有 | 各适配器装配与对话行为 |
| 现有 | `tests/plugins/tool_access_policy.test.js` | 已有 | 工具权限策略（本次已跑，34/34 通过） |
| 现有 | `tests/plugins/channel_tool_policy.test.js` | 已有 | 渠道侧工具列表 |

### 9.2 端到端冒烟（每次上线必跑，8 项）

| # | 场景 | 验证点 |
| --- | --- | --- |
| 1 | 在适配器管理页拉取模型列表 | 能正常拉取，不因重构而报错 |
| 2 | 普通对话 | 正常返回 |
| 3 | 流式输出 | 分块正常、无截断 |
| 4 | 工具调用 | `meta_tool` 桥接与直连工具都能跑通 |
| 5 | 多模态（图片输入） | 视觉模型正常；无视觉能力模型正确过滤 |
| 6 | 中断请求（abort） | 能正常中断，不泄露连接 |
| 7 | 推理型模型（deepseek / zhipu / xai） | 思考强度行为与重构前一致 |
| 8 | Token 统计与审计日志 | 用量入库正常（`llm_call_logs`） |

### 9.3 验收签收表（上线时请逐项打勾）

| 验收项 | 凭证 | 状态 |
| --- | --- | --- |
| 阶段 0 测试已就位且负向验证通过 | 测试运行输出（含故意改坏后变红） | ☐ |
| 阶段 1 metadata 快照零差异 | 快照测试输出 | ☐ |
| §6.4 的 12 项 UI 点检全过 | 手工点检记录 | ☐ |
| §9.2 的 8 项端到端冒烟全过 | 冒烟记录 | ☐ |
| 工具投影恢复为完整集（对话内自检） | 对话回复截图 / 日志 | ☐ |
| 配置实例无丢失（重启后复查） | 适配器管理页截图 | ☐ |
| 回滚路径已演练（可选但推荐） | `git revert` 后服务正常 | ☐ |

---

## 10. 风险登记表

| # | 风险 | 概率 | 影响 | 缓解措施 |
| --- | --- | --- | --- | --- |
| R1 | metadata 形状漂移，前端表单/图标异常 | 中 | 高（用户可见） | 快照测试（I3）+ §6.4 点检 |
| R2 | `type` / `avatarId` 被改，配置或图标丢失 | 低 | 高 | I4/I6 不变式 + 别名兼容层 |
| R3 | **部分样板文件里藏着未发现的差异**（我只完整读了 groq / github 两个，另有 8 个未逐行核对） | 中 | 中 | **阶段 1 第一步先做 10 文件互 diff**，逐字核对完再动手 |
| R4 | registry 数据化后，“丢一个文件进去就生效”的隐式能力消失 | 中 | 低 | 文档写清新厂商接入流程；必要时保留兼容扫描层 |
| R5 | 阶段 2 改装配流程影响 thinking / reasoning / 原生工具 | 中 | 中高 | 先做阶段 0 契约测试；保留旧类对照；人工验证三项 |
| R6 | 阶段 3 碰 OAuth 导致登录态失效 | 中 | 高 | 单独排期 + 隔离变更 + 登录流程回归 |
| R7 | 文档与实现漂移 | 高 | 中 | 把不变式写成测试（文档可过期，测试不能） |
| R8 | 重构期间产生新提交，掩盖回滚点 | 中 | 中 | 每阶段单独 commit，不合入无关变更 |

---

## 11. 工作量估算

| 阶段 | 工程 | 验证 | 合计 |
| --- | --- | --- | --- |
| 0 护栏 | 0.3 天 | 0.2 天 | 0.5 天 |
| 1 数据化 | 0.7 天 | 0.3 天 | 1 天 |
| 2 钩子化 | 1 天 | 0.5 天 | 1.5 天 |
| 3 传输/认证 | 1.5 天 | 0.5 天 | 2 天 |
| **合计** | 3.5 天 | 1.5 天 | **5 天** |

注：不含等着重启后端、以及老哥人工点检的时间。建议**阶段 0+1 一并评审，阶段 2/3 分开拍**。

---

## 12. 开放问题与决策状态

### 12.0 已拍板（2026-09-19 15:55 老板决策）

| 议题 | 结论 | 落地位置 |
| --- | --- | --- |
| 是否连 UI/UX 一起重构 | ✅ **改** | 第 13 章 |
| 新增流程形态 | ✅ 取消「选择适配器类型」必经弹窗，改为一跳表单；预设降级为表单内可选辅助 | §13.3 |
| 用户是否可自填 base_url | ✅ 是，且作为默认路径（优先假定用户自己写 URL） | §13.3.2 |
| Override 边界 | ✅ 仅三类：原生工具注入 / 鉴权传输 / 参数清洗 | §13.4 |
| 厂商 metadata 的去向 | ✅ 收束为一个「内置服务预设」下拉表单（选中后预填 base_url + 头像预览） | §13.3.2 |
| 原型验证 | ✅ 已派 SubAgent 制作可点 HTML 原型 | §13.9 |
| 协议自动推断 | ❌ **废弃**（16:52）→ 改为普通下拉，默认 OpenAI Chat Completions | §13.3.3 |
| 测试连接 vs 获取模型列表 | ✅ **必须解耦**：两个独立按钮/端点；拉取失败不得阻断保存 | §13.3.7 |
| 模型列表交互 | ✅ 标签流：输入模型名 + 空格落地成药丸；原生支持手打自定义；拉取结果自动落地为标签 | §13.3.7 |
| 游客模型配置（v4） | ✅ **前端保留关键词/全称的便捷筛选，落库只存模型全称**（关键词是 yml 无 DB 时代的遗产，DB 时代不应把模糊匹配留在运行时） | §13.3.8 |
| 协议字段呈现（v4） | ✅ 右侧**不加 tag**；下方说明写**适配器介绍**，不写鉴权方式 | §13.3.3 |
| 特殊形态 UX（v4） | ✅ 统一为“**一张表单 + 三个可变零件**”（凭据区 / 端点区 / 附加参数块），由 profile 能力标志驱动，不另开表单 | §13.12 |

### 12.1 仍待拍板（v1 遗留）

1. **范围**：只做阶段 0+1（低风险，当场删 744 行 + 拿到护栏），还是直接排满 0-3？
2. **目录**：要不要重新组织为 `protocols/` + `providers/`？还是先“就近改”（在 `implementations/` 下加 profiles），把目录重排推到最后？我的建议：**先就近改**，目录重排的收益很低而 diff 噪音很大。
3. **UI 增强范围**：§6.3 的 A（协议家族分组）和 C（工具投影健康面板）要不要进本次范围？C 是本次故障的直系产物，我个人强烈建议做。
4. **§6.3 E（UI 零代码新增厂商）**：开不开？默认建议**不开**（绕开开发审计，存在内网地址/非法端点风险）。
5. **回滚开关**：要不要加 `ADAPTER_REGISTRY=data|legacy` 双实现（两周后移除）？
6. **旧别名保留期限**：`aliases` 兼容层保留几个版本？

### 12.2 仍待拍板（v2 新增）

7. **预设层的存储**：内置预设放「代码内置 + DB 可覆盖」，还是纯 DB 配置？（我的建议：代码内置兼底，DB 覆盖只允许增改、不允许删除内置项——否则预设被改坏会全线崩）
8. **用户能不能“另存为预设”**：把当前实例存成一个本地预设供下次复用？（价值高，但引入预设层的写入路径，需拍板）
9. **中文别名的去向**：现有 `avatarAliases` 里带着“百川 / 可灵 / 龙猫 / 阶跃星辰 / 零一万物”这类中文名，卡片取消后它们是否作为搜索关键词保留？

---

## 13. v2：以协议为心智模型的适配器系统（UI/UX 一并重构）

> 本章是 2026-09-19 15:55 老板拍板后的设计增补。它**部分推翻**了 §4.2 的非目标（“不碰前端”）与 §8.3 的结论（“无 DB 变更”），以本章为准。

### 13.1 决策来源与范围

老板原话的核心主张（已采纳）：

1. 三大平台的适配协议已成行业标准，**完全没必要再新写其他适配器**；
2. 系统 = **Metadata + Protocol + 极其有限的 Override**（如 xAI 有原生工具、vertex 有 OAuth，协议确实有变化）；
3. 新建适配器时**不再经过“选择适配器”dialog**，直接进表单，**优先假定用户自己写 base_url**；
4. 原有多个厂商 metadata **收束为一个「内置适配器」下拉**：选中后根据 metadata 填一下 base_url、预览一下头像，就完了。

工程侧的精确化（本文补充）：

- 严格说是**四种线协议**（OpenAI Chat Completions / OpenAI Responses / Anthropic Messages / Gemini），不是“三大平台”；其中 Gemini 也提供 OpenAI 兼容端点，所以**对用户只需暴露“常见 3 种 + 高级 1 种”**。
- “取消选择”应该精确为**“把选择从入口降级到字段旁的辅助”**：预设本身不能删（否则新用户不知道 Groq 的 base_url），只是不再当必经关卡。

### 13.2 用户心智模型：改前 vs 改后

| 维度 | 改前（厂商为中心） | 改后（协议为中心） |
| --- | --- | --- |
| 用户要回答的问题 | “我该选哪家厂商？” | “我的服务地址是什么？” |
| 入口路径 | ＋ → 「选择适配器类型」（23 张卡片）→ 表单 | ＋ → **直接进表单** |
| 厂商名的作用 | 一级分类，决定挂哪个类 | **预设别名**（帮填默认值的糖） |
| 必填字段数 | 5（含类型选择） | **3**（显示名 / Base URL / API Key） |
| 协议的可见性 | 隐含在厂商里 | **自动推断 + 高级可改** |
| 新增一个“只是 URL 不同”的服务商 | 0 行代码 | 0 行代码 |
| 用户自定义实例 | 不允许（只能选内置 type） | **允许**（协议 + 自填 URL） |

### 13.3 信息架构与交互设计

#### 13.3.1 列表页

- 卡片内容：**显示名 / 协议徽章 / base_url 摘要 / 状态点 / 实例数**；
- 每个实例额外标注**来源**：“来自 Groq 预设”或“自定义”；
- 组织方式：默认平铺（保持现状手感），可选“按协议分组”开关（§6.3 A）；
- 不再有“23 个类型入口”的概念，列表里的每张卡都是**一个已配置的服务实例**。

#### 13.3.2 新增流程（一跳，v2 核心）

```
点击「＋ 添加模型服务」
  └─ 直接打开表单（无中间选择弹窗）
       显示名      [ Groq                          ]
       Base URL    [ https://api.groq.com/openai/v1 ]  [常用服务 ▾]
       API Key     [ ••••••••••••••••              ]
       协议        [ OpenAI Chat Completions ▾ ]   ← 普通下拉，默认第一项
       ── 模型 ────────────────────────────
       模型列表    [ gpt-4o × ] [ kimi-k2 × ] [ 输入模型名 + 空格 ]
                    [ 获取模型列表 ]  [ 测试连接 ]      ← 两个独立按钮
       默认模型    [ gpt-4o ▾ ]（选项来自上面的标签）
       游客可用    [ 关键词筛选框 → 即时候选预览 ]（**前端便捷，落库只存全称**，见 §13.3.8）
       ── 高级（默认折叠）─────────────────
       extraSettings / 启用 / 别名
       ──────────────────────────────
       [取消]                              [保存并测试连接]
```

关键原则（不可妥協）：

1. **「常用服务」下拉可选、可完全无视**。用户直接手写 URL 一样能提交——这是“大胆”与“断头路”的分界线。
2. 选中预设时：预填 base_url + 默认显示名 + 图标预览；任何时候用户都能覆写预填值。
3. 表单不要求用户理解“适配器/协议/厂商”任何一个词。

#### 13.3.3 协议选择：普通下拉（v3 修订，**自动推断已废弃**）

> v2 曾设计「Base URL 驱动的协议自动推断 + 置信度 + 歧义确认卡片」，**已于 2026-09-19 16:52 全部砍掉**。

**废弃理由（两条）**：

1. **受众判断错误**：会自己 clone 部署 MioChat 的人看得懂厂商文档、也认得协议；“自动推断”是在为不存在的用户解决不存在的问题。
2. **推断本身不可能正确**：`api.openai.com` 这类官方端点**同时支持 Chat Completions 与 Responses**，任何基于 URL 的推断都有一半概率猜错。让用户自己选，才是诚实的设计。

**新规则**：

| 控件 | 形态 | 默认值 |
| --- | --- | --- |
| 协议 | 普通下拉（`el-select`），4 个选项 | **OpenAI Chat Completions** |

选项：`OpenAI Chat Completions`（默认）/ `OpenAI Responses` / `Anthropic Messages` / `Gemini generateContent`。

**呈现规范（v4 修订）**：

- 协议选择框**右侧不加任何 tag / 徐章**（之前原型里那个 `openai-chat` 小标签去掉）——取值已在下拉里可见，重复展示只是噪声。
- 协议选择框**下方的说明文字不写鉴权方式**（不写“Bearer 令牌 / x-api-key”之类），改为写**这个适配器/协议是干什么的**（介绍文案，例：“OpenAI 兼容协议，支持工具调用、流式与多模态；绝大多数第三方服务均属此家族”）。
- 鉴权信息与连接状态归到**状态行**，与介绍文案严格分开（见 §13.12 原则 P4）。

**概念边界**：**协议 ≠ 鉴权**。协议只有 4 个，进下拉；而 `x-api-key`（Anthropic）、`project_id` + OAuth（Vertex）、扫码授权（Gemini OAuth）属于**鉴权形态**，由预设带出 + 独立字段承载，**不要塞进协议下拉**。

**待拍板**：选中服务预设时，要不要把协议下拉一并设成该预设自带的协议？（注：这属于预设的元数据，不是推断）

#### 13.3.4 特殊形态必须显式选择

`vertex`（需 project_id + OAuth）与 `geminiOAuth`（需登录授权）**无法靠推断**，继续保留在预设下拉里并标为“特殊形态”；选中后在表单内给一条黄色提示说明额外步骤。

#### 13.3.5 空态与错误态文案（建议稿）

| 场景 | 文案 |
| --- | --- |
| Base URL 为空 | 占位符：`https://api.example.com/v1`，下方灰字：“不确定？从右侧「常用服务」选一个” |
| URL 非法 | 红字：“请填写完整的 http(s) 地址” |
| Key 为空 | 按钮置灰 + 鼠标悬停提示：“需要 API Key 才能保存” |
| 协议被推断为高级形态 | 黄条：“该端点需要额外授权步骤（OAuth / project_id）” |

#### 13.3.6 移动端

宽度 < 768px：label 置顶（沿用现有 `isMobile` 判断）、卡片单列、下拉改为底部抽屉。

#### 13.3.7 模型列表：标签流 + 与「测试连接」解耦（v3 新增）

**交互规格（老板定稿）**

| 项 | 规格 |
| --- | --- |
| 控件 | **标签流**（chip / pill 容器）。Element Plus 2.11.7 **已内置 `el-input-tag`**，无需自绘、也无需退回 textarea |
| 落地方式 | **输入模型名 + 空格 → 落地成药丸**；回车同样落地；失焦（`saveOnBlur`）也落地 |
| 手打自定义 | 原生支持，任意字符串都能成为标签 |
| 批量粘贴 | 原生支持：粘贴 `gpt-4o kimi-k2 claude-sonnet` → **一次性拆成 3 个标签** |
| 删除 / 排序 | 点 × 删除；`backspace` 删末项；`draggable` 拖动排序 |
| 自动获取 | 点「获取模型列表」→ 拉回的模型**自动落地为标签**（与手打标签共用一个数组，去重后追加，提示“新拉取 N 个，已存在 M 个被跳过”） |

**选型证据**（读 `element-plus@2.11.7` 源码得出，非猜测）：

- 组件存在：`node_modules/element-plus/es/components/input-tag/` ✅
- `delimiter` 属性类型 `[String, RegExp]`，默认 `""` → 传 `' '` 即“空格落地” ✅
- `trigger` 属性类型 `'Enter' | 'Space'`，默认 `Enter` → 与 `delimiter=' '` 并存可同时支持空格与回车 ✅
- 落地逻辑在 `composables/use-input-tag.mjs` 的 `handleInput()`：每次 input 事件（**包括粘贴**）都用 `input.split(delimiter)` 切分并 `addTagsEmit(tags)` → **粘贴多模型批量落地是原生行为** ✅

**推荐写法**：

```vue
<el-input-tag
  v-model="modelConfig.models"
  delimiter=" "
  trigger="Enter"
  placeholder="输入模型名后按空格落地；也可直接粘贴一串模型名"
  clearable draggable tag-type="info" tag-effect="plain"
/>
```

**与「测试连接」解耦（关键）**

现状是耦合的，证据：

- 路由：`POST /api/config/llm/:adapterType/test-models`（`lib/server/http/index.js:232`）→ `configController.testLLMModels`（`:346`）→ `configService.testLLMModels`（`configService.js:1626`）
- 该函数为了“测一次连接”会**真的往运行时注册表里塞一个临时实例**：`global.middleware.llm.addInstance('temp-test-{type}-{ts}', ...)`（`:1673`）——既有副作用，也把“测试连接”与“取模型列表”绑成了一条代码路径。

拆分方案：

| 动作 | 端点 | 返回 | 副作用 |
| --- | --- | --- | --- |
| 测试连接 | `POST /api/config/llm/:adapterType/test-connection` | `{ ok, latencyMs, httpStatus, error }` | **无**（不得注册实例） |
| 获取模型列表 | `POST /api/config/llm/:adapterType/fetch-models` | `{ models: [...], error? }` | **无** |
| （兼容）旧 `test-models` | 保留并标 `deprecated`，内部转调 fetch-models | 同旧格式 | — |

**解耦的真正理由**（不是“少一次请求”）：多数厂商的 `GET /models` 本来就是同一个请求。真正的理由是——**“能不能拉到模型列表”不应该是“配置是否正确”的前置条件**。既然模型现在支持手打自定义，那么**拉取失败必须不阻断保存**：

| 场景 | 旧行为（耦合） | 新行为（解耦 + 标签流） |
| --- | --- | --- |
| 拉取失败 | 无法继续配置 | 黄色提示“获取失败：401”+ 引导“可直接手打模型名”，**保存照常可用** |
| 没点过“测试连接” | 隐式等于没测过 | 显式提醒“未测试”，但**不阻断保存** |

**同一套标签交互复用到三个字段**（保持手感一致）：① 模型列表 ② 默认模型（从标签集合里选）③ 游客可用（前端可用关键词快速筛选，但**落库只存全称**——原因与机制见 §13.3.8）。

---

#### 13.3.8 游客模型：前端便捷输入、落库只存全称（v4 修订）

**背景（历史真相）**：现有实现里的「关键词匹配 + 完整名称」双字段，是 **MioChat 还没有 DB、配置靠 yml 手搓**那个年代的产物——当时必须用一种“轻量、模糊、能手写”的方式表达“哪些模型开放给游客”。**现在有 DB 了，这个理由已经不存在。**

**新规则：三层分工**

| 层 | 职责 | 存什么 |
| --- | --- | --- |
| 前端交互 | 提供便捷表达：用户可敲关键词（如 `gpt`、`claude`）快速圈选一批模型，立即看到候选与命中数 | **不持久化关键词** |
| 提交 / 落库 | 只存**模型全称列表**（确定性的 model id 集合） | `guest_models: string[]` |
| 运行时 | 不做任何模糊匹配，直接按全称判定 | — |

**为什么这么改（三条）**

1. **消除运行时模糊匹配**：关键词匹配意味着每次判定都要扫字符串；全称集合是查表。匹配规则不该活在运行时。
2. **确定性**：关键词 `gpt` 今天命中 3 个、明天服务商上架新模型就变 5 个——游客权限会**静默变化**。全称列表不会。
3. **可审计**：DB 里翻开就是“这个实例给游客开了哪几个模型”，不用跑一遍匹配逻辑反推。

**交互形态（前端）**

- 仍是标签流，但**语义从“存关键词”改为“筛选器”**：输入关键词 → 实时预览“命中 N 个：a, b, c…” → 点「全部加入」→ 候选**立即解析成全称标签**；也支持从模型标签里逐个点选。
- 落库预览区应能看到就是 `['claude-sonnet-4-5','qwen2.5-72b', ...]` 一个字符串数组。
- ⚠️ **对原型的修正待办**：现有原型（v3.2）仍按 `guest.keywords` / `guest.full_name` 双字段落库，与本条不一致，需改为“关键词仅作前端筛选器，提交位只有全称列表”。

**存量迁移**：旧 `guest_models` 里的关键词/完整名称，迁移时**一次性解析成全称快照**写回；原始输入可另存一份供对照（可选）。

---

### 13.4 架构映射：Metadata / Protocol / Override

| 层 | 承载什么 | 放哪里 | 允许谁改 |
| --- | --- | --- | --- |
| **Metadata（预设数据）** | 厂商预设：显示名、base_url 默认值、图标、别名、默认参数 | 代码内置数据表（+ DB 可选覆盖） | 改数据，不改代码 |
| **Protocol（协议类）** | 四种线协议的装配与解析 | `protocols/` | 只有协议变化才改 |
| **Override（极有限）** | ① 原生工具注入（xai `x_search`、zhipu `web_search`）② 鉴权/传输（vertex OAuth、geminiOAuth、agentPlatform 鉴权头）③ 参数清洗（xai 不支持 `reasoning.effort`） | `overrides/` 独立目录，**强制注释“协议到底哪里不一样”** | 必须能说清“协议有变化” |

**硬边界（必须写成 lint 规则 + 契约测试）：** 凡“只是几个值不同”的差异，一律禁止 Override，只能降级为预设数据。否则三个月后又会有 23 个文件。

### 13.5 数据模型：实例层与预设层分离（v2 的关键改动）

| 层 | 字段 | 主键 | 归属 |
| --- | --- | --- | --- |
| **实例层**（用户数据） | `instanceId` / `label` / `protocol` / `baseUrl` / `authRef` / `models[]` / `presetRef?` | `instanceId` | 用户 |
| **预设层**（内置数据） | `presetId` / `label` / `protocol` / `baseUrl` / `avatarId` / `aliases[]` / `defaults` | `presetId` | 开发/运维 |

**为什么必须拆**：现在 `system_settings['llm_adapters'] = { <type>: [instances] }`，`type` 同时是分组键、图标键、运行期身份。一旦用户能自由填 URL，“每家厂商一个 type”就不成立了（每人一个 URL 都算新 type → 图标崩、分组崩、迁移崩）。

**连带改动清单**：

1. 运行期身份：`metadata.type` → `protocol + instanceId`。受影响：`draw.js:231,255`、`search.js:45`、`sendUi.js:78`。
2. 图标：从“按 type 查”改为“按 preset 查；无 preset 则用协议默认图标”（否则用户自定义实例全部碎图）。
3. §3.5 的 `adapterType === 'vertex'` 类分支 → 改为 `protocol` 或能力标志判定。
4. 迁移：旧 `{type: [instances]}` → 平铺数组，补齐 `instanceId` / `protocol` / `presetRef`（能匹配预设就填，否则标记为自定义）。

### 13.6 v2 验收指标（UX 可量化）

| 指标 | 现状 | 目标 |
| --- | --- | --- |
| 新增一个服务商点击数 | 3 跳（＋ → 选卡片 → 填表单） | **1 跳** |
| 必填字段数 | 5 | **3** |
| 新增一个“只是 base_url 不同”的服务商 | 0 行代码 | 0 行代码 |
| 删掉所有内置预设后系统是否还能用 | 不适用 | **必须能用**（预设是糖，不是地基） |
| 用户自定义实例的图标 | — | 协议默认图标，不碎图 |
| 新手能否不查文档就接入 Groq | 能（但多两跳） | 能（预设下拉直接预填） |

### 13.7 v2 新增风险与反例

| # | 风险 | 缓解 |
| --- | --- | --- |
| R9 | “直接进表单 + 空 Base URL”对新用户是断头路 | 保留常用服务下拉 + 占位符引导（§13.3.5） |
| R10 | 协议暴露过度，用户看不懂 | 自动推断 + 高级折叠，默认只显示一行识别结果 |
| R11 | `type` 主键崩塌导致图标/分组/迁移连锁失败 | §13.5 双层模型 + 幂等迁移 |
| R12 | 预设被改坏导致全线崩 | 内置预设**代码兼底**，DB 覆盖只允许增改，不允许删内置 |
| R13 | Override 边界失守（历史重演） | 仅三类 + lint + 契约测试硬挡 |
| R14 | 老用户已有实例在新 UI 下显示异常 | 迁移时补 `presetRef`/`protocol`；列表页标注“自定义” |

### 13.8 v2 实施顺序（在四阶段上叠加）

关键排期结论：**前端可以先动，不被后端阻塞**。现有 `/api/config/adapter-types` 已经返回完整的 metadata 列表，足够支撑“常用服务下拉 + 预填”一跳表单；后端只需在阶段 1 把那份 metadata 换成预设数据源（响应形状不变）。

| 序 | 阶段 | 依赖 | 产出 |
| --- | --- | --- | --- |
| 1 | 阶段 0（护栏） | 无 | 契约测试 + 快照测试 |
| 2 | 阶段 1（Metadata 数据化） | 阶段 0 | 预设数据表 + 工厂；删 10 文件 |
| 3 | **阶段 U1（前端一跳表单）** | 无（可并行） | 新增流程去掉选择弹窗 + 常用服务下拉 |
| 4 | **阶段 U2（列表页改版）** | U1 | 协议徒章 / 来源标注 |
| 5 | 阶段 2（钩子化） | 阶段 0 | 模板方法 + 仅三类 Override |
| 6 | **M1（数据迁移）** | 阶段 1 + U1 | 实例平铺 + `protocol`/`presetRef` 补齐 |
| 7 | 阶段 3（传输/认证策略化） | 前六步稳定一周 | auth/transport 策略对象 |

> 建议：U1 与阶段 1 **并行推进**，因为两者只靠现有 API 契约汇合，互不阻塞。

### 13.9 原型（b 项，已派 SubAgent）

| 项 | 内容 |
| --- | --- |
| 派发时间 | 2026-09-19 15:56 |
| RunGroup | `run_group_32c2528b-d197-4797-97e8-7b96606ffbcd` |
| Run | `run_84a066bb-49bc-4832-9aea-4c39ade56f0c` |
| 产物路径（待交付） | `/home/ubuntu/kirino_gallery/2026-09-19-adapter-v2-prototype/index.html` |
| 要验证的四件事 | ① 一跳表单的手感 ② 预设下拉是帮助还是干扰 ③ 协议识别提示是否可读 ④ 移动端布局 |
| 验收要求 | Chrome headless 截图（`--force-device-scale-factor=2`）至少 5 张 + parse 自检 + 诚实标注“哪些交互真的点过” |

---

### 13.10 v3 原型与独立核验结果（2026-09-19 17:10）

> 本节取代 §13.9（§13.9 描述的是已被废弃的 v2 原型）。

**v3 原型**

| 项 | 内容 |
| --- | --- |
| RunGroup | `run_group_f6118456-90a8-4072-9db8-b384ec757cb6` |
| 产物 | `/home/ubuntu/kirino_gallery/2026-09-19-adapter-v3-prototype/index.html`（75 KB，零外部依赖） |
| 截图 | 同目录 `screenshots/00-… 10-…`（11 张，1440×1020@2x） |
| 公网链接 | 由主 Agent 发布（publish） |

**主 Agent 独立核验**（**不使用**子 Agent 的脚本，自行重写并在独立进程复跑）

| 验收点 | 核验方式 | 结果 |
| --- | --- | --- |
| 协议为普通下拉、默认 OpenAI Chat Completions | 读 `#f_proto` 的 value 与 options | ✅ `openai-chat`，四选项 |
| 无协议推断 | 填入 `https://api.anthropic.com` 后重读 `#f_proto` | ✅ 仍为 `openai-chat`（页面还给出了 v2/v3 对照文案） |
| 输入 + 空格落地成标签 | 输入 `deepseek-chat` + Space | ✅ 落地 |
| 回车落地 + 手打自定义 | 输入 `my-custom-model-9b` + Enter | ✅ 落地 |
| 批量粘贴 | 粘贴 `gpt-4o` / 换行 / `claude-sonnet-4-5, kimi-k2  glm-4.6` | ✅ 一次落地 4 个 |
| 拉取自动落地 + 去重 | 点「获取模型列表」 | ✅ 「已拉取 8 个 → 新增 6，去重 2」 |
| 解耦①：拉取不改连接状态 | 只点拉取后读 `#stTestTxt` | ✅ 「连接：未测试」 |
| 解耦②：测试连接不改标签 | 只点测试连接，前后比对标签数组 | ✅ 逐项一致，文案带「未改动任何模型标签」 |
| 无运行时错误 | 收集 `pageerror` + console error | ✅ 空数组 |
| 保存后实例新增 + 验证清单 | 读表格行数与 `#chkCount` | ✅ 3 行 / 8 / 8 |
| **拉取失败不阻断保存** | 读 `validate()`（`index.html:874` 附近）：`ok = url && urlOk && proto && key`，**完全不引用拉取状态** | ⚠️ 逻辑上成立，但**未实现失败态演示与模拟失败开关** |

**子 Agent 的交付瑕疵（记录在案，避免重犯）**

1. **`verify.mjs` 不可复跑**：脚本写的是 `import puppeteer from 'puppeteer'`，而本机只有 `puppeteer-core@25.3.0`（位于后端 `node_modules/.pnpm`），从该目录解析必然 `ERR_MODULE_NOT_FOUND`。我在 `/tmp` 另建目录 + 软链 `node_modules`，并改用 `puppeteer-core` + 显式 `executablePath` 后才跑通。**声称“可复跑”与实际不符。**
2. **漏了失败态演示**：指令要求的第 ⑤ 张截图（拉取失败态 + 保存仍可用）与「模拟失败开关」均未交付，且报告未主动说明缺失。**“漏做可以说，瞒报不行”。**
3. （v2 那次）**交付路径违规**：产物被写进仓库目录 `docs/assets/prototypes/`，违反“禁止向被 git 跟踪目录写入”的铁律。
4. （v2 那次）**截图未加 `--force-device-scale-factor=2`**（1x），不符合硬性要求。

**下一次派活的三条加固措施**：① 指令里明确要求“验证脚本必须用 `puppeteer-core` + 显式 executablePath，且在交付目录内可独立复跑”；② 要求逐项回填「要求 vs 是否完成」，缺项必须显式写“未做”；③ 路径铁律每次重申（已连续两次踩）。

---

### 13.11 漏项补做与复核（2026-09-19 22:50，用 `continue` 而非新派 run）

**做法对比（重要经验）**

| | 错误做法 | 正确做法（本次） |
| --- | --- | --- |
| 触发场景 | 任务基本完成但漏项 | 同 |
| 手段 | 记一笔“交付瑕疵”了事；或新派 fresh run | **`subagent` action=`continue`（复用原 Session）** |
| 代价 | fresh run 丢掉上下文（它的开场第一句是“Found the v2 prototype”，等于重新摸索） | 几分钟补齐，且不会跑偏 |
| 参数坑 | —— | 带 `reason` 字段会被拒（报 “continue requires runId and instruction”）；**只留 action + groupId + runId + instruction** 即可 |

**补做内容与复核结果（主 Agent 亲手验证）**

| 验收项 | 复核方式 | 结果 |
| --- | --- | --- |
| 新增「模拟拉取失败」开关 | 读图 + 代码 | ✅ 紧贴获取按钮，开态橙框高亮 |
| 失败态文案 | 读图 + 脚本取值 | ✅ 橙色「获取失败：401 Unauthorized」+ 灰字「你可以直接手打模型名」 |
| **失败不阻断保存** | 亲手跑 `verify.mjs` | ✅ `saveDisabledFinal=false`、`rowsAfterFailSave=4`（失败后保存仍写成功） |
| 失败后手打仍可落地 | 亲手跑 `verify.mjs` | ✅ `chipsAfterFail=["pre-fail-model"]` → `chipsAfterManual=["pre-fail-model","manual-after-fail-9b"]` |
| 截图真实且 2x | `file` 命令 | ✅ 2880×2040 |
| **verify.mjs 可原地复跑** | 亲手 `cd 交付目录 && node verify.mjs` | ✅ 跑通（上一轮做不到） |
| 仓库洁净 | `git status` | ✅ 无新增污染 |

**一处技术表述纠正（实测反驳）**：子 Agent 称“headless 下 `--force-device-scale-factor=2` 不会让截图变 2x”。实测（纯 Chrome 命令行，1440×1020 窗口）：**加参数 → 2880×2040；不加 → 1440×1020**。因此：

- 纯 Chrome 命令行工作流：该参数**有效**，“截图必须加 2x 参数”规则**不变**；
- puppeteer/puppeteer-core 工作流：该启动参数会被 CDP 的 device metrics 覆盖，**必须另设 `viewport.deviceScaleFactor: 2`**；
- 本机只装了 `puppeteer-core@25.3.0`（后端 node_modules），**没有 `puppeteer`**；交付目录可建 `node_modules` 软链指向后端 node_modules 以实现原地复跑。

---

### 13.12 特殊形态（需要改请求逻辑的）UX 设计（v4 新增）

**问题的提出**：§13.3 的所有设计都建立在“能直接用原生接口、不需改请求逻辑”这个前提上——用户给「端点 + 密钥」，系统按四种协议之一发请求即可。但有几类是真改了请求逻辑：**vertex**（端点由 region 拼出 + 服务账号 JWT 换 token）、**geminiOAuth**（凭据来自一次浏览器授权，会过期、可撤销）、**xai / volcengine**（鉴权无差异，但协议行为与原生工具有差异）。

问题是：**这些不能硬塞进“Base URL + API Key”那两格，但也不该逼用户去开另一个表单。**

#### 核心答案（v4.3 修正）：把「连接方式」向上抽成显式一等字段

| 可变零件 | 默认形态 | 连接方式变化后变成 | 由谁决定 |
| --- | --- | --- | --- |
| 端点区（Base URL） | 用户手填（主路径） | **只读 + 自动生成**（如 `https://{region}-aiplatform.googleapis.com`） | **用户选中的「连接方式」** |
| 凭据区 | 一个密码输入框 | **授权按钮 + 回填框 + 状态卡** | **用户选中的「连接方式」** |
| 附加参数区 | 不存在 | **参数块**（project_id / region / 凭据 JSON） | **用户选中的「连接方式」** |

> 关键：驱动源从“隐藏在 profile 里的字段”改成了“**用户自己选的显式字段**”——这是 v4.3 相对 v4 的核心修正。

**先认同一个批评**：v4 初版写“形态由预设带出、不由用户理解”，结果是——用户在预设里选一个，**表单字段就凭空变了**：既无预告、也看不见原因。这不符合 MioChat“一切显式、手写 URL 是主路径”的风格。

**修正方案：表单只有 5 个固定槽位，变化只发生在其中一个，而且用户看得见原因。**

```
显示名 ｜ Base URL ｜ 连接方式 ▾ ｜ 凭据区 ｜ [高级]
```

- **「连接方式」是一个用户可见、可切换的一等字段**（不再是藏在 profile 里的隐式维度），与 Base URL 并列；
- 它决定**凭据区**（以及端点区、附加参数区）怎么渲染：

| 连接方式取值 | 凭据区渲染成 | 同时发生 |
| --- | --- | --- |
| `API Key` | 一个密码输入框 | — |
| `服务账号 JWT` | project_id + region + 凭据块 | 端点变为只读模板生成 |
| `OAuth 授权` | 授权按钮 + 回填框 + 状态卡 | 端点变为只读官方端点 |

- **预设的职责收窄为“填值”**：选预设只改字段的**取值**（显示名 / Base URL / 连接方式 / 协议），**不再改变表单结构**；
- 用户因此也获得自由度：例如 Vertex 的 OpenAI 兼容端点，用户可以手动把连接方式切回「API Key」。

**这样“字段会变”就从“魔法”变成了“因果”**：不是表单莫名长出一块，而是“我选了 OAuth，所以这里要授权”。

**两条正交的轴仍然成立，且都上浮为显式字段**：

- 协议轴 = 4 种（用户选）
- 连接轴 = 3 类（用户选）
- → **两个下拉并列，互不混淆**；
- 兼容性校验：连接方式与协议存在合法组合矩阵（如「服务账号」只能配 Gemini），非法组合应直接在下拉里置灰或给出提示。

#### 四种形态与各自的 UX

| 形态 | 代表 | 鉴权有差异？ | 用户需要多做什么 | 表单变化 |
| --- | --- | --- | --- | --- |
| 普通兼容 | 绝大多数厂商 | 是（Bearer） | 什么都不用多做 | 无 |
| 参数组型 | vertex | 否（API Key 或 ADC 两种接法） | 填 project_id + 凭据 | 追加**必需参数块**；端点固定 |
| 授权交互型 | geminiOAuth（及将来任何 OAuth） | 否 | **点一次授权** | 凭据区→授权状态卡；端点只读 |
| 协议差异型 | xai / volcengine | **是（无差异）** | 什么都不用多做 | 无（预设带出协议 + 高级里的原生工具开关） |

**① 普通兼容**

- 字段：显示名 / Base URL / API Key
- 状态行：「连接方式：Bearer 令牌 · 未测试」

**② 参数组型（vertex）—— 实际是“两种接法”，详见 §13.12.1**

- 端点区：**只读、固定** = `https://aiplatform.googleapis.com`（**无 region 模板**，这也是 v4.4 纠正的旧错）。
- 追加必需参数块（**展开、不折叠**）：`project_id`（文本，必填）。
- 凭据区按接法二选一：
  - **Vertex Express**：额外的 `api_key` 输入框（Vertex AI API Key / Access Token）
  - **Vertex ADC**：**不出现 api_key 输入框**，改显说明文案（凭据由环境变量 `GOOGLE_APPLICATION_CREDENTIALS` 或 `gcloud auth application-default login` 提供）；如需手动，可选择粘贴 service account JSON
- 粘贴 JSON 后**即时解析并回显摘要**：项目 ID、服务账号邮箱、是否含 `private_key`。“粘贴即校验”比“保存后报错”体验高一个量级。
- 状态行：`连接方式：Vertex Express（API Key）· 凭据完整度 n/2` / `Vertex ADC · 使用应用默认凭据`。
- 校验：JSON 解析失败 → 红字「粘贴完整的 service account JSON」且**保存置灰**（属于“没填完”，可以阻断；与“拉取失败不阻断”是两回事）。

**③ 授权交互型（geminiOAuth）**

- 端点区：官方端点，**只读展示**，用户不需要知道 URL。
- 凭据区整体**替换成授权状态卡**，三态：
  - **未授权**：大按钮「连接 Google 账号」+ 灰字「将打开 Google 授权页，授权后可随时撤销」
  - **授权中**（设备码模式）：8 位用户码 + 「复制」+ 「打开授权页」+ 旋转态「等待授权中…（自动检测）」——**全程不离开表单，不丢草稿**
  - **已授权**：绿点 + `xxx@gmail.com` + 「刷新令牌剩余 45 天」+ 「重新授权」/「断开」
- 状态行：「连接方式：OAuth 授权 · 已连接」。
- ⚠️ **授权过期不阻断编辑表单**：状态卡变黄 + 「授权已过期，请重新授权」，但保存按钮不禁用——过期是“运行时不可用”，不是“表单没填完”。（这条与 vertex JSON 报错的差别，就是本节的判定规则。）
- 高级里埋一个「强制重新授权」，用于疑难排查。

**④ 协议差异型（xai / volcengine）——最重要的一条：不要给它加 UX**

- 表单**零变化**（还是 URL + Key）。
- 差异只落在两处：a. 预设带出的协议下拉（xai → OpenAI Responses）；b. 「高级设置」里的原生工具开关（启用 X 搜索 / 联网搜索 / 图理解）。
- 原则：**这类差异不允许影响主表单**，因为用户不需为此做任何决定。一旦有人想把“xai 要删 reasoning.effort”翻译成界面上的字段，那就是设计跑偏。

#### 五条设计原则（可复用判定）

- **P1 一张表单，不是多张**：特殊形态不弹“另一个表单”，而是同一张表单按形态换零件。形态由预设带出，不靠用户理解。
- **P2 必需不折叠**：折叠区只放“可选增强”。vertex 的 project_id 是必需的，就必须**展开**显示。这条推翻了 v3 原型里“什么都往高级里塞”的写法。
- **P3 凭据位可被“连接动作”替换**：字段位置不变，内容从输入框变成授权卡。
- **P4 介绍与状态分开**：协议下拉下面写“这是什么”（介绍文案），状态行写“现在怎么样”（未测试 / 已授权 / 配置 3/3）。
- **P5 连接动作不离开表单**：授权全程内嵌（设备码 + 轮询），不跳转、不丢草稿。

#### 概念澄清：不是“特殊协议”，是“特殊连接方式”（v4.1 补充）

本节 v4 初版把“协议”与“连接方式”混在一张表里讲，导致“特殊协议怎么处理”这件事说不清楚。重新定义：

**两条正交的轴**

| 轴 | 取值 | 谁决定 | UI 表现 | 会不会变 |
| --- | --- | --- | --- | --- |
| **协议轴** | 4 种：openai-chat / openai-responses / anthropic-messages / gemini | **用户下拉选** | 一个下拉 + 一行介绍 | 不会变（行业标准） |
| **连接轴（用户可见）** | **4 项**：`API Key` / `Vertex Express` / `Vertex ADC` / `OAuth 授权` | **用户下拉选**（v4.3 修正后不再靠预设隐式带出） | 决定凭据区与端点区长什么样 | 会随着接新厂商增加 |

> **v4.4 澄清**：`Bearer` / `x-api-key` 这类 **header 名是协议内部细节**，由协议实现决定，**不进用户下拉**。之前把“鉴权机制”与“用户可见选项”混在一张表里数，会把用户选项数多算（误以为 5 项）。

→ 结论：**“特殊”的不是协议，是连接的建立方式。** 四类连接方式的处理方式完全不同，不能打包成“特殊适配器”一起想。

**具体到每个适配器（处理清单）**

| 适配器 | 协议 | 连接方式 | 用户操作 | 我们要做什么 | 后端新增 |
| --- | --- | --- | --- | --- | --- |
| 绝大多数厂商 | 四种之一 | Bearer Key | 填 URL + Key | **零改动**：只加一条 profile（图标 / 默认 URL / 介绍） | 无 |
| **xai** | openai-responses | Bearer Key | 什么都不用 | **零界面改动**（差异全在协议实现内部：删 `reasoning.effort`、注入 `x_search`） | 无 |
| **volcengine** | openai-responses | Bearer Key | 什么都不用 | 同上（零界面改动） | 无 |
| **vertex** | gemini | **Vertex Express（API Key）或 Vertex ADC（应用默认凭据）** | 填 project_id + API Key（选 ADC 则免填） | 端点固定 `https://aiplatform.googleapis.com`（**无 region 模板**）+ 必需参数块（project_id） | **零新增**（现有 `agentPlatform` 适配器已支持，详见 §13.12.1） |
| **geminiOAuth** | gemini | OAuth 授权 | 点授权链接 → 回填 code | **机制已存在**（见下节），仅做前端呈现优化 | **零新增**（现有 `requiresSpecialAuth` + `description` 内嵌 PKCE 授权链接 + `onConfigUpdate` 回写 DB） |

#### 13.12.1 Vertex 的两种接法：Express 与 ADC（v4.4 核实修正）

> ⚠️ **纠错**：v4.2 / v4.3 把 Vertex 写成「服务账号 JWT + region 模板端点（`https://{region}-aiplatform.googleapis.com`）」——**这是凭印象写的，与现有实现不符**。读完 `lib/chat/llm/adapters/implementations/agentPlatform.js`（type = `agentPlatform`，`aliases: ['vertexExpress']`）后修正如下。

**现有实现的事实**

| 项 | 值 | 证据（代码位置） |
| --- | --- | --- |
| 适配器 | `agentPlatform`（别名 `vertexExpress`） | `agentPlatform.js:12` |
| 端点 | `https://aiplatform.googleapis.com`（**固定，无 region 前缀**） | `initialConfigSchema.base_url.default` |
| 凭据 A | `api_key`：Vertex AI API Key 或 Access Token（必填） | `initialConfigSchema.api_key` |
| 凭据 B | **ADC（Application Default Credentials）**：由环境变量 / `gcloud auth application-default login` 提供，**`api_key` 不再需要** | `initialConfigSchema.block_express` 的 description |
| 切换开关 | `block_express`（布尔）：「禁用 Express 模式（使用 ADC）」 | `initialConfigSchema.block_express` |
| 必需参数 | `project_id`（必填） | `initialConfigSchema.project_id.required = true` |
| 模型列表拉取 | `models_base_url`（留空则复用 Gemini 原生适配器） | `initialConfigSchema.models_base_url` |

**结论：Vertex 实际上是“两种接法 + 一个开关”**

| 接法 | 凭据 | project_id | 说明 |
| --- | --- | --- | --- |
| **Vertex Express** | API Key（`api_key`） | 必填 | 默认路径；按 Key 计费的简化接入 |
| **Vertex ADC** | 应用默认凭据（无需填 Key） | 必填 | 现有实现用 `block_express: true` 切换 |

**对 v4.3 抽象的落法**：把现有那个 `block_express` 布尔开关**提升为连接方式下拉里的两个显式选项**——`Vertex Express（API Key）` 与 `Vertex ADC（应用默认凭据）`。

这恰好就是 v4.3 的精神：**把藏在布尔开关里的决定，变成用户看得见的选项**。（用户不必知道“block_express”这个词，但必须能看到自己在用哪种接法。）

**顺带一个待核实项**：`lib/server/http/services/configService.js:296` / `:1633` 里还存在 `adapterType === 'vertex'` 的分支，处理 `region` + `service_account_json`；但 `implementations/` 目录下**没有 `vertex.js`**。推测是历史遗留或另一条未接线的路径，**需确认后决定是删还是补**。

---

**新厂商接入决策树（拿到新厂商照着走）**

```
Q1 用户提供「URL + Key」就能连上吗？
   是 → 【零改动】只加一条 profile（图标 / 默认 URL / 协议 / 一行介绍）
   否 → Q2
Q2 只是需要更多静态参数（project / region / 凭据文件）？
   是 → 【加必需字段块】：端点改成只读模板生成，字段块**展开显示**（P2）
   否 → Q3
Q3 凭据必须通过一次授权流程获得（会过期、可撤销）？
   是 → 【复用现有 OAuth 机制】metadata 动态生成带 PKCE 的授权链接 + 一个回填字段
        + `onConfigUpdate` 回调把凭证写回 DB；**后端无需新增接口**
```

**三条落地规则（对应上表）**

1. **能用「URL + Key」表达的，界面上一个像素都不改。** xai / volcengine 属于这类。判定依据：**用户提供的信息量没变，就不加字段。**
2. **只是参数变多的，加“必需字段块”，不新开表单、不折叠。** vertex 属于这类：操作从 2 格变 5 格，但不多一次跳转、不多一个弹窗。
3. **凭据是“授权”出来的，不要自己造流程，复用现有 OAuth 机制。** 实测：`geminiOauth.js` 已在 `getAdapterMetadata()` 里动态生成带 PKCE 的 authUrl 并写进 `description`；`geminiOauthClient.js` 负责 code 换 token 与刷新；`onConfigUpdate` 回调把 `refresh_token` 写回 `system_settings`。**后端接口零新增**，我们只需要在前端把它呈现得更像人用的东西。

**安全边界（v4.2 修正：基于现有实现核实，而非设想）**

- 现有机制把 `sessionStore` / `tokenCache` 通过 `SystemSettingsService.set` 落到 `system_settings`（dbKey：`gemini_oauth_sessions` / `gemini_oauth_token_cache`）；而 `geminiOauthHelper.js` 里的加密函数 `encryptState` **只用于 PKCE 的 state**，refresh token 本身**未见到加密处理**。
  → ⚠️ **列为待核实项**：若 refresh token 以明文落在 `system_settings`，这是一处需要补的安全隐患（需补查 `SystemSettingsService.set` 是否透明加密）。
- **“token 不回传前端”这一点现有实现是成立的**：前端只提交 code / redirect URL，token 由后端持有并刷新。
- 「重新授权」现有做法是重填 code（覆盖旧凭证）；若要支持「断开授权」，应在服务端删除对应 store 缓存。

**分批落地顺序（不要一起做）**

| 批次 | 内容 | 风险 | 依赖 |
| --- | --- | --- | --- |
| 批 1 | xai / volcengine 等：**什么都不做**，仅在阶段 1 把“文件”变成“数据”时顺带完成 | 无 | 阶段 1 |
| 批 2 | vertex：端点模板 + 必需字段块 | 低（纯前端 + 映射表） | 阶段 1 之后 |
| 批 3 | OAuth：**仅前端呈现优化**（授权按钮结构化 / 回填字段语义摆正 / 状态可见）+ 核实 token 落库是否加密 | 中（不碰协议实现，但涉及凭证安全） | 批 2 之后 |

**一句话总结**：**四个适配器里，三个不需要新交互**（xai / volcengine 零改动、vertex 只加字段），**只有 OAuth 那一类要动后端**。别把“特殊协议”当成一揽子工程。

---

#### 一条总判定规则（写进评审 checklist）

> **只有当“不加这条信息就无法建立连接”时，才允许在主表单里增加字段或动作；否则一律放高级。**

#### 后端契约（前端形态必须由 profile 驱动，不许硬编码分支）

| profile 字段 | 取值 | 前端行为 |
| --- | --- | --- |
| `auth.kind` | `bearer` / `x-api-key` / `service-account` / `oauth-device` / `oauth-pkce` | 决定凭据区渲染成输入框还是授权卡；决定状态行文案 |
| `endpoint.mode` | `user-provided` / `templated` | 决定 Base URL 可编辑还是只读生成 |
| `requires` | `['project_id','region','credentials']` | 决定追加的必需字段块内容 |
| `nativeTools` | 如 `['x_search','web_search']` | 决定高级里的开关项 |

#### 验收指标（v4 新增）

| 指标 | 目标 |
| --- | --- |
| 特殊形态是否另开表单 | 否（复用同一张） |
| 用户需不需要理解“鉴权形态”这个词 | 否（只需按提示点按钮 / 填参数） |
| 授权流程是否会导致草稿丢失 | 否（全程内嵌） |
| 必填字段是否出现在折叠区 | 否（P2 硬约束） |
| 新增一个特殊形态厂商所需的前端改动 | 理想为 0（只加 profile） |

---

### 13.13 v4.3 原型复核数据（2026-09-20 03:24）

**产物**：`/home/ubuntu/kirino_gallery/2026-09-19-adapter-v3-prototype/`（`index.html` 115,822 B；`verify.mjs` 1,120 行 / 64,238 B；`verification-result-v4.3-run.json` 25,827 B）

**主 Agent 独立复跑（不依赖子 Agent 报告，亲自执行）**：

```
===== v4.3 原型验收（六类断言） =====
✓ 类 1 · 连接方式是一等字段      (1/1)
✓ 类 2 · 三种凭据区互斥切换      (2/2)
✓ 类 3 · 端点只读/模板生成 + 完整性门禁 (3/3)
✓ 类 4 · 协议 × 连接方式矩阵      (4/4)
✓ 类 5 · OAuth 内嵌流程与过期不阻断 (4/4)
✓ 类 6 · 预设只填值 + 提交契约    (4/4)
✓ v3 既有断言回归            (21/21)

合计 39 条：通过 39，失败 0
运行时错误：（无）
原型自检清单：18 / 18
```

**静态核验**：`#f_conn` 22 处、`credApi`/`credSa`/`credOauth` 各 2 处、`oaExpired` 3 处、「强制重新授权」2 处；`git status` 已跟踪文件零改动。

**本轮补完的两处 doc 要求**：

1. **OAuth 授权过期态**：新增黄边状态卡 + 「模拟令牌过期」演示按钮，并落实“**过期 = 运行时不可用，不阻断编辑表单**”（过期时保存**不禁用**）——与“service account JSON 解析失败必须置灰保存”构成 §13.12 那条判定规则的正反对照。
2. **高级区「强制重新授权」**：OAuth 下的疑难排查入口（其他连接方式下只给提示，不改字段）。

**子 Agent 主动纠正的三处断言缺陷（它纠的正是主 Agent 的设计错误，记在案）**：

1. `assert_GuestDedup` 前提就错了——候选点选是**切换**语义（再点一下 = 取消），原断言“再点一次数量不变”不成立 → 改为不变式“同名全称绝不重复成标签”；
2. `assert_ProtoHintNoAuth` 的 `/鉴权/` 正则**误伤**中性文案「仅用于本实例鉴权」→ 改为只匹配机制名（Bearer / x-api-key / 服务账号 JWT / OAuth 授权）；
3. 类 2 原用 `querySelector` 判“元素存在”——隐藏元素也命中，是**恒真弱断言** → 改为**可见性**判定。

> **教训（值得单独记）**：断言本身也会骗人。“元素存在”不等于“元素可用”；写断言时要反过来问一句：**“这个断言在功能坏掉的情况下，会不会也通过？”**

**说明**：`screenshots/` 仍为 v3.2 时期产物（本轮按指令未截图），**不要拿旧图对照当前 v4.3 原型**。

---

#### 13.13.1 v4.4 追加复核（2026-09-20 03:50）：连接轴收敛为 4 项

**背景**：读 `agentPlatform.js` 后发现 v4.2 / v4.3 里的「服务账号 JWT」是**错误设计**（真实实现不存在），且 Vertex 真实端点无 region 模板。v4.4 按代码事实重建。

**产物变化**

| 文件 | v4.3 → v4.4 |
| --- | --- |
| `index.html` | 115,822 B → **121,130 B** |
| `verify.mjs` | 1,120 行 / 64,238 B → **1,241 行 / 74,187 B** |
| `verification-result-v4.4-run.json` | 新增 31,171 B |

**主 Agent 独立复跑（亲手执行）**

```
合计 40 条：通过 40，失败 0
运行时错误：（无）
原型自检清单：18 / 18
```

**静态核验（亲手）**

| 检查 | 结果 |
| --- | --- |
| `sa-jwt` 在 index.html | **0**（彻底清除；verify.mjs 里 9 处属断言自身检查，正常） |
| 旧元素/函数 `saUrl` / `onSaRegionChange` / `sa_project` / `sa_json` | **0** |
| `{region}` 端点模板 | **0** |
| `aiplatform.googleapis.com` 固定端点 | 5 处 |
| 连接方式选项分布 | `api-key` 23 / `vertex-express` 14 / `vertex-adc` 9 / `oauth` 6 |
| 仓库已跟踪文件 | 零改动 |

**连接轴最终形态（用户可见 4 项）**：`API Key` / `Vertex Express` / `Vertex ADC` / `OAuth 授权`

**子 Agent 本轮做了变异测试（值得单独记）**：故意把错误改回去，验证断言会不会报警——

1. 端点改回 region 模板 → 类 3 / 类 6 共 3 条失败；
2. 把 `sa-jwt` 自洽地塞回第 5 项 → `assert_NoLegacySaJwt` 等 3 处失败。

→ **两次变异均被抓住，证明这些断言不是恒真。** 这正是 §13.13 那条“断言本身也会骗人”教训的正式落实。

---

## 附录 A：10 个“零行为”文件完整实测数据

| type | name | avatarId | avatarAliases（用于图标别名） | base_url 默认值 | features |
| --- | --- | --- | --- | --- | --- |
| groq | Groq | groq | groq | https://api.groq.com/openai/v1 | chat+streaming+vision |
| github | GitHub Models | github | copilot, gh, github, githubcopilot | https://models.inference.ai.azure.com | chat+streaming+vision |
| baichuan | Baichuan (百川智能) | baichuan | baichuan, 百川, 百川智能 | https://api.baichuan-ai.com/v1 | chat+streaming+vision |
| kuaishou | Kuaishou (快手可灵) | **kling** | kling, kwaiyii, 可灵, 快意, 快手 | https://api.klingai.com/v1 | chat+streaming+vision |
| meituan | Meituan (美团龙猫) | **longcat** | longcat, 美团, 龙猫 | https://api.longcat.chat/openai | chat+streaming+vision |
| minimax | Minimax (海螺 AI) | minimax | minimax | https://api.minimax.chat/v1 | chat+streaming+vision |
| openrouter | OpenRouter | openrouter | openrouter, or | https://openrouter.ai/api/v1 | chat+streaming+vision |
| perplexity | Perplexity | perplexity | perplexity | https://api.perplexity.ai | chat+streaming+vision |
| stepfun | Stepfun (阶跃星辰) | stepfun | stepfun, 跃问, 阶跃, 阶跃星辰 | https://api.stepfun.com/v1 | chat+streaming+vision |
| zeroone | 01.AI (零一万物) | zeroone | 01.ai, yi, zeroone, 零一, 零一万物 | https://api.lingyiwanwu.com/v1 | chat+streaming+vision |

补充发现：这 10 个文件里**都没有定义 `aliases` 字段**（只有 `avatarAliases`）。两者用途不同：`avatarAliases` 供图标解析（`imageController.js:25-28`），`aliases` 供配置迁移（`registry.getAdapterAliasesMap()`）。重构时不要混为一谈。

## 附录 B：新增一个 OpenAI 兼容厂商：改前 vs 改后

| 步骤 | 改前 | 改后 |
| --- | --- | --- |
| 1 | 新建 `xxx.js`，抄一份 74 行模板 | profiles 表加一个对象（约 8 行） |
| 2 | 改 `type` / `this.provider` / `name` / `description` | 同上（写在数据里） |
| 3 | 改 `base_url.default` 与 placeholder 两处 | 一处 |
| 4 | 改 `avatarId` / `avatarAliases` | 一处 |
| 5 | 注册表自动扫到（靠文件名 = type） | 数据表即注册 |
| 6 | 后端重启 | 后端重启（或配置热重载） |
| 7 | 图标不存在会碎图 | 阶段 1 后可显式 `reuseAvatarFrom` 或占位图 |
| **变更行数** | **约 80 行（含复制）** | **约 8～10 行** |
| **出错面** | 可能漏改 4 处、漏传参数（本次故障就是这么来的） | 字段缺漏由快照测试拦住 |

## 附录 C：本文档的证据等级与可复现命令

**已完整阅读全文的文件**：`groq.js`、`github.js`、`registry.js`、`AgentToolsInjectorHook.js`、`toolPolicy.js`（前 250 行）、前端 `src/utils/avatar.js`。

**已阅读关键片段**：四个 adapter 的 `_prepareChatBody`；`openai.js` 的 `_prepareChatBody` / `_applyExtraThinkingBody` / `_getFormattedTools`；`function.js` 的 `json()`；`channels/llm.js:941-1070`；`configService.js` 相关区域；`imageController.js:25-28`；前端 `AdapterEditor.vue:176`、`configApi.js:209`。

**已用脚本实测（非阅读推断）**：
- 23 个文件行数与继承关系（`wc -l` + `grep 'class .* extends'`）
- 10 个样板文件的 metadata 形态归一化比对（**形态数 = 1**）、override 方法清单（**全为 0**）
- 10 个文件的 `type/name/avatarId/avatarAliases/base_url` 全量清单（即附录 A）
- 四个适配器 context 透传的行为验证（打桩 `_getFormattedTools`，独立进程运行）
- `node --test` 适配器 + 策略测试：**34/34 通过**
- `llm_adapters` 表当前 **0 行**（实例实际存 `system_settings`）

**尚未验证（动手前必补）**：
- 剩余 8 个样板文件（baichuan / kuaishou / meituan / minimax / openrouter / perplexity / stepfun / zeroone）的**逐行阅读**——本文档对它们的结论基于“形态归一化 + override 清单”，粒度足够但不能代替逐行核对（见风险 R3）。
- `anthropic.js` / `gemini.js` / `openai-responses.js` 内部协议实现细节（本次不动它们）。
- 前端 `LLMAdaptersView.vue`（1415 行）的逐行阅读——只核对了它消费的 API 与图标调用。

**可复现命令（节选）**：

```bash
# 适配器规模与继承
wc -l lib/chat/llm/adapters/implementations/*.js | sort -n
grep -n 'class .* extends' lib/chat/llm/adapters/implementations/*.js

# 耦合点扫描
grep -rn --include=*.js "adapterType ===\|adapter_type ===" lib/ channels/

# 10 个样板文件形态归一化（脚本原型）
node /tmp/audit-adapters.mjs

# 现状测试基线
node --test tests/adapters/*.test.js tests/plugins/tool_access_policy.test.js
```

---

## 附：本文档的定位

这不是一份“我要重写代码”的宣言，而是一份**改动前先把代价、收益、风险、验收标准写清楚**的工程文档。真正最便宜的收益在**阶段 0**（半天，不动任何生产代码，却能让今天这个类型的故障永久不能重犯）；最大的收益在**阶段 1**（删 744 行、新增厂商从 80 行降为 8 行）。阶段 2/3 可以慢慢来，但阶段 0 我希望尽快拿到。


