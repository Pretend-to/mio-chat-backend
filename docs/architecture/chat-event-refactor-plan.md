# ChatEvent 领域事件体系重构计划

> 状态：已实施 (Phase 0 ~ Phase 5 完成，Steering 留作后续独立交付)  
> 适用仓库：`mio-chat-backend`、`mio-chat-frontend`  
> 最后更新：2026-09-11  
> 决策目标：统一 LLM 请求生命周期对象，消除内部 `body/metaData` 穿透和场景嗅探，同时保持 Socket、HTTP、缓存和持久化边界清晰可验证。

## 1. 背景与结论

当前系统存在多种形态不一致的“事件对象”：

- Web 使用 `LLMMessageEvent`；
- Channel 在 `channels/llm.js` 中手工构造大型虚拟 Event；
- Task 通过 `InternalEventFactory.createFullReq()` 再实例化 `LLMMessageEvent`；
- OpenAI Proxy 和 Internal 调用各自维护 Mock；
- Adapter、Hook 和插件通过 `e.body`、`e.metaData`、`e.user`、`e.channel` 等隐式字段协作；
- Channel、Group、Task 的判断依赖多层特征嗅探。

重构采用以下结论：

1. 内部只保留一种 `ChatEvent` 领域对象，不再兼容旧 Event 形状。
2. 不用单一 `scene` 表示所有场景，改用三个正交枚举：来源、会话类型、触发类型。
3. 不使用五个事件子类复制生命周期状态机，改用 `ChatEvent + OutputPort` 组合。
4. 内部 Event 扁平化不等于修改外部协议；Socket、HTTP、`streamCache` 都使用独立 DTO/序列化器。
5. 工厂只组装和校验规范参数；旧请求形状解析由入口 Normalizer 负责，禁止工厂继续嗅探。
6. `actorId`、`principalId` 和缓存接收者分离，避免把真实发言人、权限主体和 Web Client 混成一个 `userId`。
7. Steering/`adjust` 在核心事件稳定后单独上线，不和基础迁移捆绑。

本项目没有外部用户，因此不为旧内部 Event 建兼容 Getter 或 fallback。重构期间允许新旧实现短暂并存于开发分支，但切换完成后必须删除旧路径。

## 2. 目标与非目标

### 2.1 目标

- 所有进入 LLM Adapter 的请求都是经过校验的 `ChatEvent`。
- Adapter、Hook、工具和服务不再读取 `event.body` 或 `event.metaData`。
- 场景判断完全基于显式枚举，不再基于对象特征或 `requestId` 前缀。
- Web、Channel、Task、Proxy、Internal 共用同一生命周期和中断/交互实现。
- Channel 的流输出、二次确认、记忆结晶持久化和 Web 镜像行为保持不变。
- Web 的断线重连、ACK、水位线去重和自动标题行为保持不变。
- Task 的超时、执行记录、流缓存和历史重建行为保持不变。
- Proxy 的 SSE/JSON 格式和 Usage 注入行为保持不变。
- 每一个外部边界都有独立契约测试。

### 2.2 非目标

- 本次不重新设计模型 Provider 请求格式。
- 本次不修改 `streamCache` 的 ACK 和 GC 语义。
- 本次不顺带重构 Channel 消息组装、记忆实现或工具系统。
- 第一阶段不改变当前 Socket 帧中的 `data.metaData` 格式。
- 第一阶段不允许在模型正在输出普通文本时强制插入 Steering；只支持工具轮次之间的确定性注入。
- 不以减少几个对象属性作为性能目标。性能收益主要来自减少重复转换、分支嗅探和错误恢复成本。

## 3. 不变量

实施过程中必须持续满足以下不变量：

1. `requestId` 标识一次后端执行；`messageId` 标识一个前端消息。两者允许相等，但语义不能混用。
2. `contactorId` 是 Web Store 的对话窗口路由键；`channelId` 是渠道实例标识；两者不得依靠 fallback 互相推断。
3. `sessionId` 是会话/记忆隔离键，不得使用 `contactorId` 或 `actorId` 隐式代替。
4. `actorId` 表示产生当前输入的人或系统；`principalId` 表示权限和审计主体。
5. Channel 用户 ID 必须带命名空间，至少包含渠道类型与渠道实例，禁止直接把裸 `openid/senderId` 当作全局 ID。
6. `cacheOwnerIds` 明确列出流缓存接收者。它不从 `actorId` 推导。
7. 每一个 Tool Call Assistant 消息后必须存在完整、同序的 Tool Result，再允许插入 Steering 或进入下一轮。
8. `complete()`、`fail()`、`abort()` 均幂等，一个 Event 只允许产生一个终态。
9. Channel 只有在结晶持久化及 `rotateChat` 完成后才能对其 FIFO 队列宣布完成。
10. `streamCache` 终态数据仍只能由客户端 ACK 清理，`snapshot()` 不删除数据。

## 4. 领域模型

### 4.1 正交场景枚举

```js
export const CHAT_SOURCES = Object.freeze({
  WEB: 'web',
  CHANNEL: 'channel',
  SCHEDULER: 'scheduler',
  PROXY: 'proxy',
  INTERNAL: 'internal',
})

export const CONVERSATION_KINDS = Object.freeze({
  DIRECT: 'direct',
  GROUP: 'group',
  NONE: 'none',
})

export const TRIGGER_KINDS = Object.freeze({
  INTERACTIVE: 'interactive',
  TASK: 'task',
  SYSTEM: 'system',
})
```

判断规则只比较枚举值：

```js
const isChannel = event.source === CHAT_SOURCES.CHANNEL
const isGroup = event.conversationKind === CONVERSATION_KINDS.GROUP
const isTask = event.triggerKind === TRIGGER_KINDS.TASK
```

`source` 表示请求从哪里进入运行时：普通后台任务使用 `scheduler`，Channel 内触发的任务仍使用 `channel`。这允许合法表达 `CHANNEL + GROUP + TASK`，不会丢失任何维度。日志需要单值时可以生成只读 `sceneKey`，例如 `channel:group:task`，但业务逻辑不得解析该字符串。

### 4.2 身份模型

| 字段            | 含义                        | 示例                           | 用途                     |
| --------------- | --------------------------- | ------------------------------ | ------------------------ |
| `actorId`       | 当前输入的真实发起者        | `wechat:channel-42:openid-7`   | 画像、个性化、业务归属   |
| `principalId`   | 权限及审计主体              | `admin`、Web 账户 ID、`system` | 工具授权、模型权限、审计 |
| `cacheOwnerIds` | 接收断线流缓存的主体集合    | `['admin', 'web-client-1']`    | `streamCache` 写入和回放 |
| `member.id`     | 群聊中当前响应的 Agent/成员 | `agent-3`                      | 群成员画像、发送者展示   |

约束：

- Web 普通对话：`actorId === principalId === client.id`。
- Web 群聊：人类输入的 `actorId` 仍是 Web 用户，`member.id` 是当前响应 Agent。
- Channel 单聊/群聊：`actorId` 是带命名空间的第三方人类用户；`principalId` 根据当前渠道权限策略显式传入，不能默认把所有 Channel 用户设为管理员。
- Task：`actorId` 是任务所属用户或 `system`；`principalId` 是任务执行权限主体。
- Internal：二者均为 `system`。
- Proxy：认证成功时使用认证主体；没有主体时生成请求级匿名 ID。禁止用 IP 或固定字符串宣称“全局唯一”。IP 可以单独保留为审计字段。

### 4.3 ChatEvent 数据契约

后端是原生 ESM JavaScript，因此使用 JSDoc 和运行时校验，不在 `.js` 文件中写 TypeScript 字段语法。

```js
/**
 * @typedef {Object} ChatEventInit
 * @property {string} requestId
 * @property {string} messageId
 * @property {'web'|'channel'|'scheduler'|'proxy'|'internal'} source
 * @property {'direct'|'group'|'none'} conversationKind
 * @property {'interactive'|'task'|'system'} triggerKind
 * @property {string} actorId
 * @property {string} principalId
 * @property {string|null} sessionId
 * @property {string|null} contactorId
 * @property {string|null} channelId
 * @property {Array<object>} messages
 * @property {object} settings
 * @property {object|null} member
 * @property {object} principal
 * @property {string[]} cacheOwnerIds
 * @property {ChatEventOutputPort} output
 * @property {object|null} client
 * @property {object|null} channel
 * @property {object|null} memory
 * @property {object|null} auditContext
 * @property {object} outputMetadata
 */
```

`ChatEvent` 暴露的一级字段：

- 路由：`requestId`、`messageId`、`sessionId`、`contactorId`、`channelId`；
- 场景：`source`、`conversationKind`、`triggerKind`；
- 身份：`actorId`、`principalId`、`principal`、`member`、`cacheOwnerIds`；
- 模型请求：`messages`、`settings`；
- 明确声明的运行依赖：`client`、`channel`、`memory`、`auditContext`、`outputMetadata`；
- 生命周期：`state`、`requestStartTime`、`aborted`、`completed`、Usage 和递归轮次状态；
- 行为：`start()`、`pending()`、`update()`、`complete()`、`fail()`、`abort()`、`onAbort()`；
- 交互：`registerInteraction()`、`unregisterInteraction()`、`emitInteraction()`；
- Steering：后续阶段增加 `enqueueAdjustment()`、`consumeAdjustments()`。

不再存在：

- `event.body`；
- `event.metaData`；
- `event.user.id` 与 `event.userId` 两套身份；
- 从 `requestId`、`channel` 对象形状或 `memberId` 猜测场景的 Getter。

### 4.4 生命周期状态机

```text
CREATED -> RUNNING -> COMPLETING -> COMPLETED
                    \-> FAILED
                    \-> ABORTED
```

规则：

- `start()` 注册活动 Event 并初始化审计和 Usage 状态；
- `complete()`、`fail()`、`abort()` 返回 `Promise<void>`；
- Adapter 必须 `await event.complete()`，不能发起后即返回；
- `abort()` 先切换状态并触发 Abort callbacks，再由 OutputPort 下发 `aborted` 对应的终态帧；
- 完成过程中的异常转为 `FAILED`，不能让外层等待 Promise 永久悬挂；
- 到达终态时统一注销活动 Event 和连接流；
- Abort callback 使用 `Set`，注册方法返回取消订阅函数，避免长期任务累积监听器；
- Interaction 在任意终态统一清空并以“会话已结束”拒绝尚未完成的等待。

## 5. 组合式输出架构

所有场景使用同一个 `ChatEvent`。差异通过 OutputPort 组合，不通过继承覆盖生命周期。一个事件可以装配多个 Port：例如 Channel Task 同时装配 Channel 输出和 Task 执行记录输出。

### 5.1 OutputPort 接口

```js
/**
 * @typedef {Object} ChatEventOutputPort
 * @property {(event: ChatEvent) => Promise<void>} onStart
 * @property {(event: ChatEvent) => Promise<void>} onPending
 * @property {(event: ChatEvent, chunk: object) => Promise<void>} onUpdate
 * @property {(event: ChatEvent, outcome: object) => Promise<void>} onComplete
 * @property {(event: ChatEvent, error: Error) => Promise<void>} onError
 * @property {(event: ChatEvent) => Promise<void>} onAbort
 * @property {(event: ChatEvent, interaction: object) => Promise<void>} requestInteraction
 */
```

实现：

| OutputPort            | 责任                                                                       |
| --------------------- | -------------------------------------------------------------------------- |
| `WebEventOutput`      | reasoning 转换、Socket 推送、`streamCache`、水位线去重、自动标题           |
| `ChannelEventOutput`  | 文本块累积和 flush、渠道审批、Web 镜像双写、结构化结果收集、结晶持久化等待 |
| `TaskEventOutput`     | 任务流缓存、任务状态与执行结果通知；可复用 Web 缓存组件                    |
| `ProxyEventOutput`    | SSE/JSON 响应、断连中止、Usage、Tool Call 透传                             |
| `InternalEventOutput` | 内存内容回调和完成 Promise，不依赖虚拟 Client                              |

可复用的小组件：

- `ReasoningChunkNormalizer`
- `StreamCacheWriter`
- `ActiveEventRegistryPort`
- `SocketLlmFrameSerializer`
- `ChannelStructuredContentCollector`
- `CompositeEventOutput`

`CompositeEventOutput` 按显式优先级调用多个 Port。更新阶段允许并行的无依赖输出；完成阶段严格按顺序执行，例如先排空 Channel 文本与结晶持久化，再完成 Task 记录，最后释放活动 Event。各 Port 必须声明自己是否拥有终端帧发送权，避免 Channel Task 重复发送 `complete`。

`ChatEvent.update()` 仍可保持调用方不等待，以避免逐 token 引入串行延迟；内部将 OutputPort 更新串入有界队列。`complete()` 必须等待该队列排空。队列错误由 Event 捕获并进入失败终态，禁止静默 `catch {}` 吞掉关键持久化错误。

## 6. 外部协议与 DTO 边界

### 6.1 Socket LLM DTO

第一阶段保持当前协议：

```js
{
  protocol: 'llm',
  message: 'update' | 'complete' | 'failed' | 'sync',
  request_id: event.requestId,
  data: {
    ...chunk,
    metaData: {
      contactorId: event.contactorId,
      messageId: event.messageId,
      triggerType: event.triggerKind === 'task' ? 'task' : 'chat',
      isTask: event.triggerKind === 'task',
      memberId: event.member?.id,
      memberName: event.member?.name,
      memberAvatar: event.member?.avatar,
      executionId: event.outputMetadata.executionId,
      timestamp: event.outputMetadata.timestamp,
    },
  },
}
```

只有 `SocketLlmFrameSerializer` 可以创建传输层 `metaData`。领域对象和业务消费者禁止读取该 DTO。

如未来要升级为扁平 Socket v2，应另立协议 RFC，同时修改：

- 前端 `src/lib/websocket.js`；
- 前端 `src/lib/gateway.js`；
- 前端 Store 的 sync/complete/failed 处理；
- 后端 loader、client 和 Channel Web 镜像；
- `docs/api/socket_protocol_zod.ts`；
- `docs/protocols/channel-web-sync.md`；
- 协议契约测试。

### 6.2 streamCache DTO

`streamCache` 继续接收：

```js
{
  ownerId,
  contactorId,
  messageId,
  chunk,
  metadata,
}
```

写入者从 `event.cacheOwnerIds` 迭代，不从 `actorId` 或 `principalId` 猜测。缓存 metadata 是回放 DTO 的一部分，不是 ChatEvent 的内部 `metaData`。

### 6.3 Proxy DTO

`ProxyEventOutput` 独占 OpenAI Chat Completions 的 SSE/JSON 序列化。Adapter 不直接访问 Express `req/res`。客户端断开只触发一次 AbortSignal。

## 7. 工厂和入口 Normalizer

### 7.1 分层责任

```text
原始 Web/Channel/Scheduler/Proxy 输入
              |
              v
Boundary Normalizer  -- 解析旧形状、补全命名空间、给出明确错误
              |
              v
ChatEventInit（规范对象）
              |
              v
ChatEventFactory -- 校验不变量、装配 OutputPort、创建 ChatEvent
```

Normalizer：

- `normalizeWebChatRequest(req, client)`
- `normalizeChannelChatContext(ctx)`
- `normalizeTaskRequest(taskContext)`
- `normalizeProxyRequest(req, res, resolvedModel)`
- `normalizeInternalRequest(options)`

Factory：

```js
ChatEventFactory.create(normalizedInit)
```

不提供 `ctx.from || ctx.userId || ctx.senderId` 这类无限 fallback。每个具体渠道适配器必须在进入通用 Channel LLM 层之前给出规范 `actorId`。Normalizer 只接受该字段并校验。

### 7.2 校验规则

工厂至少验证：

- 所有枚举值合法；
- `requestId`、`messageId`、`actorId`、`principalId` 非空；
- `messages` 是数组，`settings` 是普通对象；
- Web/Channel 交互对话必须有 `contactorId`；
- Channel 必须有 `channelId`、`sessionId`、`channel` 和 `memory`；
- Group 必须有完整的 `member.id/name`；
- Task 必须有 `outputMetadata.executionId/taskId`；
- Proxy/Internal 的 `conversationKind` 必须为 `none`，除非调用方显式提供可解释的会话；
- `cacheOwnerIds` 去重且不包含空字符串；
- `principal.id === principalId`；
- 不能把 Express、Socket 或渠道对象复制进可序列化 DTO。

校验失败抛出带 `code`、`field`、`source` 的 `ChatEventValidationError`，入口负责转为对应协议错误。

## 8. Adapter 与工具上下文契约

### 8.1 Adapter

统一替换：

| 旧访问                | 新访问                                     |
| --------------------- | ------------------------------------------ |
| `e.body.messages`     | `e.messages`                               |
| `e.body.settings`     | `e.settings`                               |
| `e.body.model`        | `e.settings.base.model`                    |
| `e.body.contactorId`  | `e.contactorId`                            |
| `e.user.id`           | `e.principalId` 或 `e.actorId`，按用途选择 |
| `e.user.ip`           | `e.principal.ip`                           |
| `e.metaData.isTask`   | `e.triggerKind === 'task'`                 |
| `e.metaData.memberId` | `e.member?.id`                             |

`BaseLLMAdapter.handleChatRequest()` 调整为：

1. 首轮 `await event.start()`；
2. 使用 `event.messages/settings` 构造 Provider Body；
3. Tool Calls 完成后按原顺序写入 Tool Results；
4. 执行结晶，并调用预留的 Steering drain 扩展点；在 Phase 6 前该扩展点为空操作；
5. 递归调用下一轮；
6. 首轮最终 `await event.complete()`；
7. `finally` 不再重复操作 Client 注册表，由 Event 状态机统一清理。

所有 Provider Adapter 都必须使用 `getAuditContext(event)` 的统一结果，禁止自行重新从旧字段拼审计上下文。

### 8.2 ToolExecutionContext

工具不应直接收到一个再次伪装成 Event 的对象。新增明确契约：

```js
{
  params,
  principal,
  parentEvent,
  source,
  conversationKind,
  triggerKind,
  actorId,
  sessionId,
  contactorId,
  channelId,
  channel,
  memory,
  signal,
  update,
  setExtraRender,
  setOuterRender,
  registerInteraction,
  unregisterInteraction,
}
```

工具读取模型消息时使用 `parentEvent.messages`。权限 Hook 根据 `principal` 判断；画像工具根据 `actorId/member` 判断；安全 Hook 根据 `triggerKind` 判断是否为 Task。

## 9. Steering 设计（第二阶段功能）

Steering 不进入基础 Event 迁移的首个切换版本。基础重构稳定后再实现。

### 9.1 支持范围

第一版只接受处于以下状态的 Event：

- 正在执行工具；
- 已完成本轮 Tool Results，尚未发起下一轮模型请求。

模型正在普通文本输出且不会进入下一轮时，服务端返回 `not_steerable`，前端可选择 Abort 后重新发起。不得谎报“已接受”但最终不消费。

### 9.2 Socket 协议

新增明确事件，例如：

```js
{
  protocol: 'llm',
  type: 'adjust',
  request_id: '<active request id>',
  data: {
    adjustmentId: '<idempotency id>',
    text: '<user instruction>',
  },
}
```

响应 ACK 必须区分：`accepted`、`duplicate`、`expired`、`not_owner`、`not_steerable`、`queue_full`。

入口通过当前 Client 的活动 Event Registry 查找请求，并验证 `principalId`/缓存接收关系，禁止跨用户注入。

### 9.3 队列和消息注入

- 队列元素保存 `adjustmentId`、`text`、`actorId`、`timestamp`；
- 按接收顺序消费；
- 以 `adjustmentId` 去重；
- 限制条数和总字符数；
- Event 终态后拒绝新增；
- 在所有 Tool Results 写入后、下一轮 Provider 请求前原子 drain；
- 注入消息标记为内部 continuation/steering，Provider 序列化时移除内部字段；
- 结晶扫描器必须将 Steering 识别为当前前端轮次的延续，不能切断 Tool Call/Result 链；
- Channel 和 Task 是否持久化 Steering 必须在各自 OutputPort 中显式定义。

## 10. 文件布局

建议新增：

```text
lib/chat/llm/events/
├── ChatEvent.js
├── ChatEventFactory.js
├── constants.js
├── errors.js
├── validateChatEventInit.js
├── normalizers/
│   ├── web.js
│   ├── channel.js
│   ├── task.js
│   ├── proxy.js
│   └── internal.js
├── outputs/
│   ├── CompositeEventOutput.js
│   ├── WebEventOutput.js
│   ├── ChannelEventOutput.js
│   ├── TaskEventOutput.js
│   ├── ProxyEventOutput.js
│   └── InternalEventOutput.js
└── serializers/
    ├── SocketLlmFrameSerializer.js
    └── StreamCacheSerializer.js
```

迁移后删除：

- `lib/server/socket.io/utils/LLMMessageEvent.js`
- `lib/chat/llm/utils/InternalEventFactory.js`
- 各入口中的 Event Mock/虚拟 Client
- 重复的 `isChannelEvent/isGroupEvent/isTaskEvent`

`VirtualLLMClient` 若只剩 Task 完成 Promise 用途，应重命名为 `TaskExecutionOutput` 或合并进 `TaskEventOutput`，避免继续假装成 Web Client。

## 11. 分阶段实施计划

### Phase 0：契约冻结与特征测试

目的：先记录当前正确行为，防止“代码能跑”但业务语义回退。

任务：

- 为 Web update/reason/complete/failed/sync 建立 Socket 帧快照测试；
- 为 `streamCache` ACK、水位线和 admin fallback 建立特征测试；
- 为 Channel 文本 flush、结构化内容、审批、Web 镜像和结晶完成顺序建立测试；
- 为 Task 超时、Abort、执行记录、缓存和 history 重建建立测试；
- 为 Proxy 流式/非流式/Usage/Tool Calls/客户端断连建立测试；
- 为 Internal 标题、视觉、结晶压缩建立测试；
- 记录全仓旧访问基线。

退出条件：上述行为均有自动化测试，并在重构前通过。

### Phase 1：领域核心与 OutputPort

任务：

- 新增常量、错误、校验器、`ChatEvent` 状态机；
- 新增 Interaction 和 Abort 单元测试；
- 新增五种 OutputPort 及共享 serializer；
- 新代码暂不接入生产入口；
- 禁止在新目录中出现 `body/metaData`，serializer 文件除外。

退出条件：核心测试覆盖成功、失败、中止、重复终态、输出队列 drain 和 Interaction 清理。

### Phase 2：入口 Normalizer 与身份模型

任务：

- Web、Channel、Task、Proxy、Internal 分别产生 `ChatEventInit`；
- Channel Adapter 在进入公共 LLM 层前生成命名空间化 `actorId`；
- 明确所有场景的 `principalId` 与 `cacheOwnerIds`；
- 添加场景矩阵和无效参数测试；
- 不在工厂中保留 fallback 嗅探。

退出条件：所有入口样本都能生成通过强校验的 Init，缺字段样本得到明确错误。

### Phase 3：Adapter、Hook 和工具消费者迁移

需要逐项迁移：

- `lib/chat/llm/adapters/base.js`
- `lib/chat/llm/adapters/implementations/openai.js`
- `lib/chat/llm/adapters/implementations/openai-responses.js`
- `lib/chat/llm/adapters/implementations/anthropic.js`
- `lib/chat/llm/adapters/implementations/gemini.js`
- `lib/chat/llm/adapters/lib/geminiOauthClient.js`
- `lib/chat/llm/index.js`
- `lib/chat/llm/toolPolicy.js`
- `lib/hooks/builtins/DatabaseAuditHook.js`
- `lib/plugins/terminal-pty/hooks/shSecurity.js`
- `lib/plugins/ai-plugin/tools/profile.js`
- `lib/plugins/ai-plugin/tools/cron.js`
- `lib/plugins/ai-plugin/tools/sentinel.js`
- `lib/plugins/ai-plugin/tools/memory.js`
- `lib/plugins/ai-plugin/tools/meta_tool.js`
- `lib/plugins/ai-plugin/tools/parse.js`
- `lib/chat/llm/services/CrystallizationService.js`

同时更新 Adapter 测试 Fixture，使测试本身只创建标准 `ChatEvent`。

退出条件：所有 Adapter 和插件测试通过；业务代码不再从 Event 读取旧字段。

### Phase 4：五个入口原子切换

任务：

- `loader.js` 切到 Web Normalizer + Factory；
- `channels/llm.js` 删除 Event 桩，Channel 独有逻辑移入 `ChannelEventOutput`；
- `TaskRunnerService.js` 删除 `baseReq/createFullReq`；
- `oaiProxyController.js` 删除 Event Mock；
- Vision、标题和结晶切到 Internal Normalizer；
- 更新所有活动 Event 注册、中断和 Interaction 路由。

退出条件：五类入口的集成测试全部通过，生产路径不再实例化 `LLMMessageEvent` 或 `InternalEventFactory`。

### Phase 5：删除旧实现与静态门禁

任务：

- 删除旧 Event、旧 Factory、虚拟 Client 和嗅探函数；
- 更新注释、JSDoc、Skill 示例和架构文档；
- 加入静态检查脚本，对 Event 旧字段访问失败；
- 更新 `docs/api/socket_protocol_zod.ts` 中的实际协议定义。

建议门禁：

```bash
rg '\b(e|event|parentEvent)\??\.(body|metaData)\b' lib channels
rg 'function is(Channel|Group|Task)Event' lib channels
rg 'LLMMessageEvent|InternalEventFactory' lib channels tests
```

第一条只允许 serializer/normalizer 白名单命中。退出条件是无未解释命中。

### Phase 6：Steering

基础体系稳定并完成一次完整回归后，按第 9 节独立实现和验收。

## 12. 测试矩阵

### 12.1 场景矩阵

| Source    | Conversation | Trigger     | 必测能力                               |
| --------- | ------------ | ----------- | -------------------------------------- |
| Web       | Direct       | Interactive | 流式、Abort、审批、标题、断线恢复      |
| Web       | Group        | Interactive | member 路由、按成员结晶、群工具策略    |
| Channel   | Direct       | Interactive | 渠道输出、Web 镜像、actor namespace    |
| Channel   | Group        | Interactive | 群用户与 Agent member 不混淆           |
| Channel   | Direct/Group | Task        | Task 安全策略与 Channel 能力同时生效   |
| Scheduler | Direct       | Task        | 执行记录、缓存、超时、history          |
| Proxy     | None         | Interactive | SSE/JSON、Usage、断连、Tool Calls 透传 |
| Internal  | None         | System      | 无 Client、回调、错误传播              |

### 12.2 生命周期测试

- 空响应自动提示；
- 首 chunk、连续 reasoning、reasoning 到 content 转换；
- 多次 `complete/fail/abort` 只产生一个终态；
- Abort 在 Provider 请求、工具执行、审批等待和 Channel flush 阶段均可结束；
- Output 更新队列在完成前排空；
- Channel 持久化失败不会永久悬挂；
- Interaction 超时、消费和终态清理；
- 多工具并行完成但 Tool Results 保持调用顺序；
- Tool Results 不产生孤儿 ID。

### 12.3 协议与缓存测试

- Socket DTO 快照与当前前端解析保持一致；
- complete/failed/sync 都含正确 `contactorId/messageId`；
- Task metadata 含 `executionId/timestamp/triggerType`；
- Channel 审批不产生 Web“幽灵”卡片；
- admin 和指定 Web Client 正确双写，第三方 `actorId` 不会意外成为 cache key；
- ACK 是唯一删除终态缓存的路径；
- 水位线防止 snapshot 后重复增量。

### 12.4 Steering 测试

- 活动 Tool Call 期间接受；
- 普通模型输出阶段返回 `not_steerable`；
- 顺序、去重、队列上限和跨用户拒绝；
- Tool Result 后再插入 user adjustment；
- Provider Payload 不泄漏内部标记；
- 结晶和 Task history 对 Steering 的处理符合约定；
- Complete/Abort 与 enqueue 的竞态只有一种可观察结果。

## 13. 验证命令

后端每个 Phase 至少执行：

```bash
pnpm lint
pnpm test:unit
pnpm test
```

涉及前端协议时同时在 `mio-chat-frontend` 执行其 lint、unit test 和 build。最终手工验证：

1. Web 私聊连续 Tool Call；
2. Web 群聊两个 Agent 连锁响应；
3. Channel 私聊带 reasoning、工具和审批；
4. Channel 请求实时镜像到 Web，随后断线重连；
5. Task 在线、离线、超时和中止；
6. Proxy 流式和非流式；
7. 自动标题和记忆结晶；
8. Steering 成功、拒绝和竞态。

## 14. 可观测性

统一日志上下文：

```js
{
  requestId,
  messageId,
  source,
  conversationKind,
  triggerKind,
  actorId,
  principalId,
  sessionId,
  contactorId,
  channelId,
  adapterInstanceId,
  model,
}
```

隐私要求：日志中的第三方 `actorId` 应支持 hash/截断；不得记录审批 payload 中的敏感凭证。Usage 审计使用 `principalId` 作为计费/权限主体，并额外保存 `actorId` 供业务分析，两者不能覆盖彼此。

建议增加计数器：

- Event 按 source/trigger 的成功、失败、中止数；
- Event 非法输入数及字段；
- Output 队列长度和 flush 延迟；
- Channel 持久化失败数；
- Steering accepted/rejected/expired 数；
- 活动 Event 与 Interaction 数，辅助发现泄漏。

## 15. 风险与回滚

| 风险                         | 控制措施                                    | 回滚方式                  |
| ---------------------------- | ------------------------------------------- | ------------------------- |
| 前端收不到流                 | Socket DTO 快照 + 前后端集成测试            | 回滚入口切换提交          |
| Channel FIFO 提前释放        | `complete()` async + 持久化顺序测试         | 恢复旧 Channel Event 路径 |
| Task 缓存 key 改变           | 显式 `cacheOwnerIds` + 特征测试             | 回滚 Task OutputPort      |
| 工具权限主体改变             | actor/principal 场景表 + 安全测试           | 回滚身份映射提交          |
| Adapter Fixture 与生产不一致 | 测试统一通过 Factory 创建 Event             | 回滚 Adapter 迁移提交     |
| Steering 破坏消息序列        | 独立 Phase、限定状态、Provider Payload 测试 | 单独关闭 adjust 入口      |

本重构不需要数据库 Schema 变更。切换点应集中在一个可回滚提交中；在该提交之前，新核心可以处于未接入状态，旧生产路径保持工作。切换完成并通过回归后，再以独立提交删除旧实现。

## 16. 完成定义

只有同时满足以下条件才视为完成：

- 五类入口全部通过 `ChatEventFactory` 创建事件；
- 业务层不存在 `event.body/event.metaData` 访问；
- 不存在基于对象形状或 ID 前缀的场景嗅探；
- `LLMMessageEvent`、`InternalEventFactory` 和入口 Event Mock 已删除；
- Web/Channel/Task/Proxy/Internal 测试矩阵通过；
- 前端协议、Channel-Web Sync 和实际 serializer 一致；
- 身份、缓存、审计三种主体在代码和文档中均有明确语义；
- Channel 完成顺序、Task history、断线回放和审批无回归；
- Steering 若纳入本轮交付，所有第 12.4 节测试通过；否则不暴露半成品入口；
- `pnpm lint`、`pnpm test:unit`、`pnpm test` 全部通过。
