# 工具与插件可见性策略审计

> 审计日期：2026-09-18  
> 范围：`mio-chat-backend`、`mio-chat-frontend` 当前工作树。除本报告外未修改代码。

## 1. 结论摘要

当前可见性/权限不是统一策略，而是插件列表、插件详情、Web 工具目录、LLM Schema、MetaTool、运行时执行六条各自判断的路径。字段虽然主要只有 `hidden`、`adminOnly`、`channelOnly`、`groupOnly`，但读取点互不一致，造成“目录可见但执行拒绝”“插件列表隐藏但工具目录仍暴露”“MetaTool 能探查但最终调用失败”等现象。

最重要的结论：

1. `agent-manager-plugin` 在 `package.json` 和插件实例上均设置 `hidden: true`，但这只被 `GET /api/plugins` 使用；`GET /api/openai/tools` 的 `serveToolsList()` 不读取它，所以 Agent 管理工具仍会进入前端工具缓存和普通 Web 会话工具选择器。
2. `adminOnly` 目前主要是执行时 Hook 语义。`getLLMTools()`、`serveToolsList()`、`GET /api/plugins/:name/tools`、MetaTool `list/query` 都没有统一排除非管理员；Schema 已发送给模型后，最终执行才可能被 `CheckPermissionHook` 拒绝。
3. `channelOnly`、`groupOnly` 在部分装配/执行路径生效，但实现是分散布尔判断；插件 API、前端配置页、MetaTool、SubAgent 资源策略没有共享判定 API。
4. `subagent` 没有 `agentOnly` 或 `serverAgentOnly` 声明。现在依赖 `requireContext()` 在执行时检查 `agentId + sessionId`，所以普通 Web-local 会话通常调用失败，但仍可能发现、选择并尝试调用该工具。
5. `/api/openai/tools` 路由没有 `authConfigAPI`，直接公开 `serveToolsList()`；前端 `Config.loadllmTools()` 无上下文地缓存全部返回内容。
6. `/api/plugins/:pluginName/tools` 只过滤 `channelOnly`。隐藏插件、管理员工具、Agent 专用工具均可通过该详情接口返回；调试执行接口的缺省用户还被设置为管理员。

因此不能只再加一个 `agentOnly` 布尔字段。应增加唯一的 `ToolAccessPolicy`，令发现、Schema、MetaTool、执行、SubAgent 分配全部调用同一个上下文评估器；旧字段只作为兼容输入。策略维度必须沿用现有正交场景模型，不能把 `server-agent`、`web`、`task` 这类不同层级概念塞进同一个枚举。

## 2. 字段与声明位置

### 2.1 插件级字段

`lib/plugin.js::_loadMetadata()` 从插件目录 `package.json` 读取元数据并合并到 `plugin.metaData`。当前实际的插件可见性字段只有：

| 字段 | 声明位置 | 当前读取位置 | 实际语义 | 缺陷 |
| --- | --- | --- | --- | --- |
| `package.json.hidden` | `lib/plugins/agent-manager-plugin/package.json` | `pluginController.listPlugins()` 的 `metadata.hidden` | 从插件管理列表隐藏 | 不影响工具目录、LLM Schema、MetaTool、直接插件 URL |
| `plugin.hidden` | `lib/plugins/agent-manager-plugin/index.js` | `pluginController.listPlugins()` | 同上 | 与 package 字段同名、不同存储层；只有一个读取点 |
| `enabled` | DB PluginConfig + `Plugin.enabled` | 插件加载和前端插件列表 | 启用/禁用插件 | 不是 access policy，工具目录没有统一再次判断 |

没有发现插件级 `adminOnly`、`channelOnly`、`groupOnly`、`visibility`、`agentOnly`、`serverAgentOnly` 的统一声明。插件 Hook 可以自定义限制，但它不会生成目录策略。

### 2.2 MioFunction 工具字段

`lib/function.js` 的构造函数定义：

```js
adminOnly = false
channelOnly = false
groupOnly = false
```

工具实例保存这三个属性，但 `MioFunction.json()` 不将它们作为统一策略元数据输出。静态工具清单如下（53 个；MCP 工具是运行时动态工具）：

| 插件 | 数量 | `adminOnly: true` | `adminOnly: false` | `channelOnly` | `groupOnly` | 未显式声明（默认 false） |
| --- | ---: | --- | --- | --- | --- |
| `agent-manager-plugin` | 4 | `agent_model`, `agent_profile`, `subagent` | `agent_session` | — | — | — |
| `ai-plugin` | 10 | `cron`, `sentinel` | `draw`, `meta_tool`, `parse`, `profile`, `search`, `skill` | `sentinel` | `profile` | `memory`, `share` |
| `anyui-plugin` | 3 | — | — | — | — | 全部 3 |
| `config-plugin` | 5 | 全部 5 | — | — | — | — |
| `edge-tts-plugin` | 2 | — | — | — | — | 全部 2 |
| `file-editor-plugin` | 9 | `append`, `batch`, `grep`, `insert`, `read`, `replace`, `write` | `init_folder`, `read_folder` | — | — | — |
| `terminal-pty` | 5 | 全部 5 | — | — | — | — |
| `web-plugin` | 5 | — | — | — | — | 全部 5 |
| `email-plugin` | 3 | 全部 3 | — | — | — | — |
| `note-plugin` | 7 | — | — | — | — | 全部 7 |
| **合计** | **53** | **25** | **9** | **1** | **1** | **19** |

表中“未显式声明”实际为 19 个工具：`memory`、`share`、全部 `anyui`/`edge-tts`/`web`/`note` 工具等。`mcp-plugin` 的 `mcpLoader.js` 动态创建 `mcpFunction extends MioFunction`，只传 `name/description/parameters`，默认获得全部 false；外部 `custom` 工具也同样默认放行。

### 2.3 容易混淆但不是工具可见性的字段

- `memory` 参数的 `scope: local/global` 是记忆数据作用域。
- `agent_session` Schema 的 `visible` 是 Session 列表展示状态。
- Agent/Session/Preset 的 `visible/hidden` 是实体或预设状态。
- 前端 CSS/DOM 的 `visibility/hidden` 与服务端工具策略无关。
- `toolCallSettings.tools` 是调用方的工具选集/allowlist，只能收窄，不能授权原本不允许的工具。

## 3. 读取路径矩阵

### 3.1 插件与工具发现

| 路径 | 当前过滤 | 结论 |
| --- | --- | --- |
| `Plugin._loadMetadata()` | 读取 package 全部字段 | 只加载，不解释 access |
| `Plugin.loadTools()` | `TOOL_BEFORE_LOAD` Hook | 无通用 visibility 过滤，能加载就进 Map |
| `pluginController.listPlugins()` | `metadata.hidden || plugin.hidden` | 只有插件列表过滤 hidden |
| `pluginController.getPlugin()` | 只过滤工具 `channelOnly` | hidden 插件可被已知名称访问；admin 工具出现在详情 |
| `pluginController.getPluginTools()` | 无过滤 | hidden/admin/channel/group 工具全部返回 |
| `GET /api/openai/tools` → `serveToolsList()` | 只过滤 `channelOnly` | hidden/admin/group/Agent scope 均未处理 |
| 前端 `Config.loadllmTools()` | 直接缓存 API 数据 | 不读取任何 access 字段 |
| 前端 `ContactorToolsTab` | 对返回工具做勾选 | 不具备上下文策略 |
| 前端 `PresetEditor` | 列插件后逐个取工具 | 详情接口仍泄漏 admin 等工具 |

### 3.2 LLM Schema 与执行

| 路径 | 当前判断 | 未覆盖 |
| --- | --- | --- |
| `LLMChatService.serveToolsList()` | Web 屏蔽 `channelOnly` | hidden/admin/group/Agent/SubAgent |
| `LLMChatService.getLLMTools()` | `channelOnly`、`groupOnly` | `adminOnly`、hidden、Agent-only |
| `LLMChatService.runTool()` | allowlist、channel、group | 没有显式 admin 检查，依赖 Hook 链 |
| `MioFunction.run()` → `CheckPermissionHook` | adminOnly 且用户非管理员时拒绝 | 只保护 run，不保护目录/Schema/MetaTool |
| `toolPolicy.getPluginToolNames()` | channel/group/admin（仅显式非管理员） | 只服务 Channel 固定白名单 |
| `toolPolicy.getChannelToolNames()` | 硬编码插件集合 + 部分过滤 | 不是插件声明策略 |
| `applyChannelToolPolicy()` | 每轮 Channel 递归 LLM 重写 tools | Web/Task/SubAgent 不共用该逻辑 |

### 3.3 MetaTool

MetaTool 重新扫描 `global.middleware.plugins`，没有调用 LLM/目录统一策略：

- `list` 过滤 `channelOnly`、`groupOnly`、allowlist，但不按 `adminOnly` 过滤；还把 `adminOnly: true` 返回给模型。
- `query` 同样不按 adminOnly 过滤，非管理员可探查管理员工具 Schema。
- `call` 先过滤 allowlist/channel/group，再进入目标工具 `run()`，最终可能由 `CheckPermissionHook` 拒绝；这是“能发现但不能执行”的不一致。
- `findTool()` 只负责全局完整名/短名搜索，没有上下文参数，也不判断插件 hidden。
- MetaTool 本身 `adminOnly: false`，因此是绕过普通目录过滤的二级入口。

### 3.4 Agent/SubAgent

`subagent.js` 的当前保护链为：

```text
requireContext(event)
  -> event.agentId 或 channel.memory.agentId 或 memory.agentId
  -> event.sessionId 或 body.sessionId 或 body.sid
  -> 缺任一字段即失败
```

创建 Run 时还要求 `agentId + parentSessionId`，父工具名冻结到 `toolNamesJson`。`SubAgentExecutor` 使用 `source: 'subagent'`，但把 `principal.isAdmin` 固定为 true；这是系统执行身份，不能替代对 `sessionKind=subagent`、Agent/Session 归属和 Run 工具快照的显式校验。

现状判断：

- 服务端 Agent/绑定 Channel Agent 有 `agentId + sessionId`，可调用 `subagent`。
- Web-local 通常缺少 Agent 身份，执行会失败，但 Schema/工具目录可能已经暴露它。
- 若父工具快照包含 `subagent`，子 Run 按既定规则继承该能力；能否再派生由 Run 递归深度/预算控制，不应由可见性隐式改变。
- `agent_profile`、`agent_model`、`agent_session` 实现中调用 `requireAgentId()`，但目录/LLM 层没有表达“仅 server-agent”。

## 4. 已确认问题

### P1：Agent hidden 只对插件列表生效

`agent-manager-plugin/package.json` 与 index 均 hidden；`listPlugins()` 过滤二者，但 `serveToolsList()` 遍历所有插件，只检查 `tool.channelOnly`。`/api/openai/tools` 无上下文，前端直接缓存，所以普通 Web 工具选择器仍可能加载 `agent_profile`、`agent_model`、`agent_session`、`subagent`。

### P1：adminOnly 是执行末端保护，不是可见性策略

配置、Shell、文件写入、邮件、SubAgent、定时任务等管理员工具可进入非管理员 Schema、插件详情、MetaTool list/query；只有真的执行才可能被 Hook 拒绝。这会造成模型无效调用、错误气泡和策略信息泄漏。

### P1：工具目录 API 缺少上下文

`/api/openai/tools` 不接收 Socket 用户、Agent、Channel、Task 上下文，且没有 `authConfigAPI`。未来即使在 `serveToolsList()` 增加判断，也必须先建立 API caller context，不能使用全局默认。

### P2：字段同名不同义、判断重复

- `hidden` 有 package 元数据、插件实例、Preset、前端 DOM 等多种语义。
- `adminOnly` 被不同路径分别理解为“不可执行”“不进目录”“Channel 非管理员不进白名单”，但只有执行 Hook 是硬保证。
- `channelOnly` 注释是“屏蔽 Web”，实现却不覆盖所有 API、MetaTool、SubAgent 路径。
- `groupOnly` 只按 `conversationKind === 'group'`，无法表达 Task、Server-Agent、SubAgent。
- allowlist 缺失时 `isToolAllowed()` 默认 true；“未配置”与“明确授权”没有统一区分。

### P2：动态工具默认 public

MCP 和外部插件不声明任何策略就获得 Web/Channel/Task/MetaTool 默认可见性；未声明不应默认为内部能力可用。

### P2：调试默认管理员

插件调试接口缺省 `user` 使用 `isAdmin: true`，对管理员配置面板可以合理，但必须显式标成 `operation=debug`，不能与模型/普通会话执行授权混用。

## 5. 统一抽象设计

### 5.1 标准化上下文

所有目录、Schema、MetaTool、执行、SubAgent 创建先进入：

```js
normalizeToolAccessContext({
  // 沿用 ChatEvent 已有的三个正交维度
  source: 'web' | 'channel' | 'proxy' | 'internal',
  triggerKind: 'interactive' | 'task' | 'system',
  conversationKind: 'direct' | 'group' | null,
  // 来自持久化 Session.kind，而不是从 source 猜测
  sessionKind: 'conversation' | 'subagent' | null,
  agentId: String | null,
  sessionId: String | null,
  parentSessionId: String | null,
  principal: {
    id: String | null,
    role: String | null,
    isAdmin: Boolean
  },
  toolAllowlist: String[] | null,
  operation: 'discover' | 'schema' | 'execute' | 'assign' | 'debug'
})
```

`source` 是流量入口，`triggerKind` 是触发方式，`conversationKind` 是会话形态，`sessionKind` 是执行所在的持久化 Session 类型。它们不能互相代替。

“服务端 Agent”不是一个 source：同一 Agent Session 可以由 Web、Channel、Cron 或 Trigger 驱动。判断它的权威事实是服务端已校验的 `agentId + sessionId + Session.agentId`，而不是 `source === 'server-agent'`。`agentId + sessionId` 也不自动意味管理员，用户身份仍由 `principal` 独立表达。

当前 `SessionTurnService.runTurn()` 还会收到 `scheduled_task/trigger/subagent/system` 等历史 source 字符串。这些值必须在进入 evaluator 前被映射为上述正交维度，不能继续扩充成新的混合枚举。

### 5.2 唯一规范字段

插件和工具使用相同结构，工具值只能收窄插件值：

```js
access: {
  exposure: ['schema', 'meta'],
  scene: {
    sources: ['web', 'channel', 'proxy', 'internal'],
    triggerKinds: ['interactive', 'task', 'system'],
    conversationKinds: ['direct', 'group', 'none'],
    sessionKinds: ['conversation', 'subagent', 'none']
  },
  requires: {
    admin: false,
    agentContext: false
  },
  delegation: 'inherit' | 'explicit' | 'deny'
}
```

含义：

- `exposure` 只控制模型如何发现工具：`schema` 表示可直接进入 LLM tool schema，`meta` 表示可被 MetaTool `list/query` 发现。空数组表示只允许受信的程序化调用。它不表达 admin 权限。
- `scene` 是对现有正交场景维度的白名单。Web 访问服务端 Agent 仍是 `source=web`；Cron 是 `source=internal + triggerKind=task + sessionKind=conversation`；SubAgent 是 `source=internal + sessionKind=subagent`。
- `requires` 是身份/上下文前置条件。`admin` 只读取已验证 principal；`agentContext` 要求后端校验 Agent、Session 存在且归属一致。`group` 不再混入 requires，而应写在 `scene.conversationKinds`。
- `delegation` 只定义单个工具如何进入 SubAgent 快照：`inherit` 跟随父有效工具集默认继承，`explicit` 只有父请求显式 tools 且本来拥有时才能分配，`deny` 永不进入子快照。子集规则始终是 `parentEffectiveTools ∩ requestedTools`，所以原先的 `subset/full` 不是合法的单工具枚举。

`Plugin.enabled` 是生命周期开关，`plugin.management.hidden` 只是管理 UI 展示属性；两者都不属于 ToolAccessPolicy，也不应把当前 `plugin.hidden` 自动映射为工具 internal。插件级 access 是默认值；工具只能收窄，不能无声明扩大范围。

`subagent` 推荐：

```js
access: {
  exposure: ['schema', 'meta'],
  scene: {
    sources: ['web', 'channel', 'internal'],
    triggerKinds: ['interactive', 'task', 'system'],
    conversationKinds: ['direct', 'group'],
    sessionKinds: ['conversation', 'subagent']
  },
  requires: { admin: true, agentContext: true },
  delegation: 'inherit'
}
```

这会排除没有服务端 Agent Session 的 Web-local Bot，但允许同一服务端 Agent 被 Web、Channel、Cron/Trigger 驱动时使用该能力。根据已确定的产品规则，SubAgent 默认完整继承父有效工具集，因此这里必须是 `delegation: 'inherit'`；SubAgent 再次派生的允许与否由 Run 的递归深度和预算控制，不由可见性策略控制。

`agent_profile`、`agent_model`、`agent_session` 也应显式 `requires.agentContext: true`。它们是否对 SubAgent 开放，应通过 `scene.sessionKinds` 和 `delegation` 单独审核，不要用 `adminOnly` 代替 Agent 身份条件。

### 5.3 单一判定 API

建议提供纯函数/服务：

```js
evaluateToolAccess(tool, context, operation)
// { allowed, reason, policy, canonicalName }

listVisibleTools({ plugins, context, operation: 'discover' })
```

以下路径必须全部调用它：

1. `LLMChatService.serveToolsList()`、`getLLMTools()`；
2. `LLMChatService.runTool()` 的执行前二次校验；
3. MetaTool `list/query/call`；
4. `pluginController.listPlugins/getPlugin/getPluginTools`；
5. `/api/openai/tools` 上下文适配器；
6. SubAgent `capabilities/createGroup` 的工具快照与 assign 校验。

执行时二次校验必须保留：目录过滤防止模型看到不应看到的工具，执行判断防止伪造/过期/短名调用绕过权限。

#### 5.3.1 Schema 投影作为末端兜底

`MioFunction.json(type, context)` 在读取动态 description/parameters 之前，先调用统一 evaluator 判断 `operation='schema'`。不允许时返回 `null`，上层统一 `.filter(Boolean)`：

```js
json(type, context = null) {
  if (!this.#canProject(context, 'schema')) return null
  return this.#buildProviderSchema(type, context)
}
```

`#canProject` 只负责调用公共 `evaluateToolAccess()`，不在基类或工具子类中复制策略逻辑。这是最后一层泄漏兜底，不是唯一过滤点。

因为 `/api/openai/tools` 和 MetaTool 当前不都调用 `json()`，基类还应提供同样受 evaluator 保护的投影方法，或由统一 registry 完成这些投影：

```js
tool.toCatalogEntry(context)       // API/前端选择器
tool.toSchema(provider, context)   // 直接 LLM schema
tool.toMetaSummary(context)        // MetaTool list
tool.toMetaSchema(context)         // MetaTool query
```

所有方法在不可见时都返回 `null`。目录合成必须先过滤再分组，空分组也不返回，避免通过分组名、数量或 description 推断隐藏工具。MetaTool 的动态 `getDescription()` 目前会枚举全部工具名，也必须改用同一投影结果。

对不可见工具的 MetaTool query/call 和模型直调，对模型只返回统一的 `tool_not_found`；真实拒绝原因只进入服务端审计日志，否则仍会泄漏工具存在。

### 5.4 API 与前端

`GET /api/openai/tools` 应基于认证 Web principal 返回上下文过滤结果；请求服务端 Agent 工具目录时必须带 `agentId/sessionId`，由后端查询 Session 并校验归属，不接受前端自报的 `server-agent` 身份。插件管理页使用管理员目录接口，不能复用普通 LLM 工具缓存。

前端不应自行解释 `adminOnly/hidden`；后端返回已过滤数据，管理员页可额外显示非敏感的 access summary。

### 5.5 MetaTool 迁移

- `list` → `listVisibleTools(operation='discover')`；
- `query` → 同一 evaluator 后返回 Schema；
- `call` → `evaluateToolAccess(operation='execute')` 后进入统一 `runTool`；
- `findTool` 只做 canonical name 解析，不能决定可见性。

MetaTool 不再保留自己的 channel/group/allowlist/admin 判断。

## 6. 兼容迁移步骤

1. 新增 evaluator/context normalizer，先映射旧字段：
   - `adminOnly: true` → `requires.admin: true`；
   - `channelOnly: true` → `scene.sources: ['channel']`；
   - `groupOnly: true` → `scene.conversationKinds: ['group']`；
   - plugin `hidden` 只迁移到 `plugin.management.hidden`，不修改工具 access；
   - 未声明工具过渡期使用当前宽松值并告警，后续对外部/MCP 收紧。
2. 先让 `/api/openai/tools`、`getLLMTools()`、MetaTool、`runTool()` 共用 evaluator，修复 Agent hidden/admin 泄漏。
3. 保留旧 Hook 作为短期重复保护；覆盖确认后删除直接字段判断。
4. 为 Agent、Shell、文件、配置、sentinel 插件补显式 access。
5. MCP/外部插件要求 policy；过渡期不允许它们声明程序化隐藏能力或扩大 scene，执行仍需显式 allowlist。
6. 前端只消费上下文过滤后的目录；插件热重载也重新经过同一过滤。
7. 旧字段使用量为零后，从 `MioFunction` 构造器移除三个布尔字段。

## 7. 测试策略

### 7.1 evaluator 真值表

| 上下文 | public | admin | channel-only | group-only | agent-only | subagent-only |
| --- | --- | --- | --- | --- | --- | --- |
| Web-local 普通用户 | 允许 | 拒绝/不发现 | 拒绝 | 拒绝 | 拒绝 | 拒绝 |
| Web-local 管理员 | 允许 | 允许 | 拒绝 | 按 conversation | 无 Agent context 时拒绝 | 拒绝 |
| Web 服务端 Agent 管理员 | 允许 | 允许 | 按上下文 | 按上下文 | 允许 | 按 delegation |
| Channel 普通用户 | 允许 | 拒绝 | 允许 | 按 group | 按产品策略 | 拒绝 |
| Channel Agent 管理员 | 允许 | 允许 | 允许 | 按上下文 | 允许 | 按 delegation |
| Task/Trigger | 按任务快照 | 按任务策略 | 不因 source 混入 | 显式上下文 | 必须有 Agent context | 不默认允许 |
| SubAgent | 仅冻结子集 | 不得用 isAdmin 伪装 | 按快照 | 按快照 | 绑定 parent Agent | 默认禁止递归 |

### 7.2 集成/前端回归

- `/api/openai/tools` 对普通 Web、管理员 Web、服务端 Agent 返回不同集合；普通 Web 不出现 Agent 管理工具。
- 三个插件 API 与 LLM Schema 均按同一策略过滤 hidden/admin/channel/group。
- MetaTool `list/query/call` 不能发现或调用当前上下文不可见工具。
- 伪造完整 hash 名、短名、旧缓存工具名都不能绕过执行二次校验。
- SubAgent 缺 Agent/session、Session 归属不匹配、错误 parent、超出递归深度/预算、超出父工具快照均有明确失败；合法子 Run 只能继承父有效集的允许子集。
- MCP/外部插件缺 policy 时按迁移默认处理并告警。
- 前端普通 Web-local 工具选择器不出现 `agent_profile`、`agent_model`、`agent_session`、`subagent`、Shell、系统配置等内部/管理员工具；服务端 Agent 页面能获得允许集合。

## 8. 机器可读摘要

```json
{
  "staticToolCount": 53,
  "dynamicToolSources": ["mcp-plugin", "custom-plugin"],
  "agentManagerPlugin": {
    "packageHidden": true,
    "instanceHidden": true,
    "listPluginsFiltered": true,
    "serveToolsListFiltered": false,
    "recommended": {
      "exposure": ["schema", "meta"],
      "scene": {
        "sources": ["web", "channel", "internal"],
        "triggerKinds": ["interactive", "task", "system"],
        "conversationKinds": ["direct", "group"],
        "sessionKinds": ["conversation", "subagent"]
      },
      "requires": { "admin": true, "agentContext": true },
      "delegation": "inherit"
    }
  },
  "legacyFlags": {
    "adminOnlyTrue": 25,
    "adminOnlyFalse": 9,
    "channelOnly": 1,
    "groupOnly": 1,
    "implicitDefaultFalse": 19
  },
  "readers": {
    "pluginList": ["metadata.hidden", "plugin.hidden"],
    "pluginDetails": ["tool.channelOnly"],
    "openaiTools": ["tool.channelOnly"],
    "llmSchema": ["tool.channelOnly", "tool.groupOnly"],
    "runtime": ["allowlist", "channelOnly", "groupOnly", "CheckPermissionHook(adminOnly)"],
    "channelPolicy": ["hardcoded plugin set", "channelOnly", "groupOnly", "adminOnly for explicit non-admin"],
    "metaTool": ["allowlist", "channelOnly", "groupOnly"],
    "subagentRuntime": ["agentId", "sessionId", "frozen tool names"]
  },
  "missingCanonicalFields": ["agentOnly", "serverAgentOnly", "subagentDelegable", "discoverable", "schemaVisible", "debugOnly", "internalOnly"]
}
```

## 9. 收尾建议

不要继续在各个调用点追加 `if (tool.xxx)`。优先实现 evaluator + context normalizer，并让 `/api/openai/tools`、`getLLMTools()`、MetaTool、`runTool()` 四条路径先共用它；同时把 `subagent` 标成 `requires.agentContext + requires.admin + delegation:inherit`。这样可以一次性消除 Web-local 前端误加载与 MetaTool 旁路，又不会破坏 SubAgent 完整继承和可配置递归的既定设计。
