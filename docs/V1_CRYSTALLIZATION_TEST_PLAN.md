# Mio-Chat v1 前端驱动与无状态后端结晶系统下放实施计划

本计划记录了将**分区无状态记忆结晶（Partitioned Stateless Crystallization）**机制与**前端记忆管理 CRUD（Client-side Memory CRUD）**核心机制直接下放到现有的 **Mio-Chat v1**（`/Users/krumio/Code/mio-chat-backend` 与 `/Users/krumio/Code/mio-chat-frontend`）中进行闭环测试与验证的方案。

在此架构下，**后端维持绝对的无状态（No Backend Storage）**。上下文压缩仅在**递归 Tool Call（工具迭代 Loop）**的运行过程中在后端内存里临时执行。结晶的分区数据通过**流式事件中途实时推给前端**。**前端全权负责结晶数据的持久化（LocalStorage）、滑动窗口管理、多分区可视化 CRUD、以及大模型 Memory 工具的拦截落盘**。

---

## 一、 后端无状态拦截、内存级滚雪球压缩与“轮次”裁剪算法 (Backend Portion)

### 1. 递归 Tool Call 中途压缩与裁剪
在 V1 大模型适配器递归调用 `handleChatRequest(e, false)` 前：
*   **判定条件**：检测上一次 API 调用返回的 `usage.prompt_tokens` 是否超限（如大于前端设置的 `crystallization_token_watermark` 水位线）。
*   **压缩触发与覆盖**：
    - 后端触发压缩时，调用一个外部总结方法，**另起一个独立的内部虚拟 Event** 提交给后台轻量级 LLM。
    - 传入参数：前端 Payload 携带的 `previous_summary`（XML 标签格式）与本轮将被压缩的 messages 历史段。
    - **覆盖 Event 消息链**：该总结方法返回一个**重组后的消息链**（头部为新生成的 XML 分区结晶，尾部为用于衔接的最近 1~2 轮前端交互消息）。后端**直接覆盖当前执行事件 `e` 中的 `e.body.messages` 消息链**。覆盖完毕后，大模型适配器继续往下调用，实现无缝、低延迟且高度缓存友好的后续推理。

### 2. 核心算法：前端“轮次 (Turn)”边界识别与衔接缓冲
在后端 `messages` 数组（即发给 LLM 的 Payload）中，由于存在 `tool_calls` 与 `tool` 角色的连续交互，大模型视角的一次 Assistant 回复往往占据**多个连续元素**。
为了避免生硬切割 messages 数组导致 LLM 协议报错（如 `assistant` 的工具调用缺失对应的 `tool` 响应，或缺少配套的 `user` 提示），我们设计了**基于“轮次（Turn）”的反向边界扫描算法**：

*   **“一轮完整前端交互 (Frontend Turn)”的定义**：
    - 一个 `user` 角色的发言（包含其携带的文件/图片提示词）；
    - 加上其后续触发的，直到生成最终 `assistant` 文本回复为止的**所有连续 `tool_calls`、`tool` 结果消息链**。
*   **反向扫描算法步骤**：
    - 从内存消息链 `messages` 的末尾（最新消息）反向遍历。
    - 统计完整的“前端轮次（Frontend Turn）”。
    - **保留缓冲策略**：我们要求**完整保留最近的 1~2 轮前端交互**。
      - 例如，如果保留 2 轮：反向扫描直到定位到第 2 轮前端交互中 `user` 角色消息的起点索引 `boundaryIndex`。
    - **安全裁剪区间**：
      - 将 `[0, boundaryIndex - 1]` 范围内的旧消息段（含其头部原本存在的旧 `Fragment`）打包送往总结模型进行滚雪球压缩。
      - `[boundaryIndex, messages.length - 1]` 范围内的最新消息链完整保留，作为重合缓冲区与新生成的 XML 结晶进行头部拼接。

### 3. 流式结晶事件推送
中途结晶发生并得到新的 XML 后，后端通过流式 update 协议实时推给前端：
*   `e.update({ type: 'crystallize', content: { status: 'running', range: [...] } })`
*   `e.update({ type: 'crystallize', content: { status: 'finished', summary: '[最新生成的XML分区结晶数据]' } })`

---

## 二、 前端持久化、滑动窗口、Memory 拦截与可视化 CRUD (Frontend Portion)

前端需对 Pinia 状态、发包拼接、以及 UI 管理进行深度重构：

### 1. 记忆管理 CRUD 与 XML 分块展示界面 (New UI Dashboard)
*   **前端可视化 CRUD 界面**：
    - 前端在联系人管理页面新增一个 **“记忆结晶管理器”** 面板。
    - 前端编写解析器，根据 XML 正则/DOM 拆分 `latestSummary` 中的 5 大标签块，并将它们渲染为多 Tab 或多块面板（如：`用户画像`、`短期目标`、`运行步骤`、`文件变更`、`开发约束`）。
    - **支持直接修改**：用户可直接在界面上对这 5 个分区的文本进行编辑、增加或删除。修改后自动重新组合为标准的 XML 结构回写联系人 `options.latestSummary`，并持久化至 `localStorage`。
*   **初始发包模板**：即使是空会话，前端在发包时也默认注入空标签 XML 作为 `previous_summary` 发送，以便后端启动结晶流。

### 2. 改造 `memory` 工具（长期记忆拦截重合）
*   **全新 CRUD 拦截重定向**：
    - 重新设计 V1 里的 `memory` 插件逻辑（或在前端 `stores/contactorsStore.js` 拦截该工具调用结果）：
    - 当检测到 AI 调用了 `memory` 工具记录新的偏好或事实时，**前端拦截该结果，直接解析并将新事实追加到本地 `latestSummary` 中的 `<long_term_profile>` 标签内**！
    - 通过这种方式，AI 不仅可以通过结晶更新记忆，还可以在运行期间通过调用 `memory` 工具来**自我增删和微调**我们的长期用户画像，而不污染对话历史。

### 3. 滑动窗口与发包 Payload 拼装 (`src/lib/gateway.js`)
*   **重构 `getValidOpenaiMessage`**：
    - **开启结晶开关时**：完全废除从下往上数 N 条 messages 的滑动截取。
    - **模板拼装 (XML Single System Message)**：
      - 前端编写 `SystemPromptAssembler.js` 模块。
      - 合并全局人格 Prompt 与 `<memory_crystal>`（内含当前的 `latestSummary` XML 数据），组装成**唯一的头部 `system` 消息**。
      - 拼接活动消息链 `Recent Messages`（包含结尾 1~2 轮重叠衔接消息）。
      - 在 settings 中携带 `crystallization_token_watermark` 与 `previous_summary` 发送给后端。

---

## 三、 变更文件清单

| 物理路径 | 类型 | 说明 |
| :--- | :--- | :--- |
| **后端** | | |
| **`lib/chat/llm/services/CrystallizationService.js`** | `[NEW]` | 内存 messages 结晶提取、轻量 LLM 总结服务 |
| **`lib/chat/llm/adapters/base.js`** | `[MODIFY]` | 递归前注入 `CrystallizationService` 判断，重构 messages 链，触发 `e.update` 流式推送 |
| **`lib/chat/llm/adapters/implementations/openai.js`** | `[MODIFY]` | 收集各轮调用的 usage 返回值挂载至事件对象 |
| **`scripts/initialize-defaults.js`** | `[MODIFY]` | 注入支持 XML 标签分区的滚雪球压缩提示词 `system_llm_compact_prompt` |
| **前端** | | |
| **`src/utils/SystemPromptAssembler.js`** | `[NEW]` | 单 System 消息合并工具，使用 XML 模板嵌入唯一的 `latestSummary` |
| **`src/stores/contactorsStore.js`** | `[MODIFY]` | 监听流式 `crystallize` 事件并静默将消息隐藏，更新 `latestSummary` 并持久化，提供自动压缩开关 |
| **`src/lib/gateway.js`** | `[MODIFY]` | 改造拼装逻辑：开启压缩时废除条数限制，组合 XML 模板及 1~2 轮衔接消息，外传参数 |
| **`src/components/chat/MessageItem.vue`** | `[MODIFY]` | 屏蔽在消息气泡流渲染结晶卡片，通过流式事件条渲染其发生事件 |
| **`src/components/MemoryManager.vue`** | `[NEW]` | 可视化记忆结晶 CRUD 管理面板，分 Tab 渲染 XML 的 5 个区块 |

---

## 四、 验证与 TDD 路线图
1. **测试轮次（Turn）边界识别算法**：编写测试用例验证包含复杂 `tool_calls` 和多轮工具响应的消息链在进行反向边界扫描时，能否准确地把“最近的 1~2 轮前端交互”完备地保护起来，且不会出现 Role 不对称的崩溃。
2. **测试 XML 合并与解析**：验证 `SystemPromptAssembler` 能够将 `latestSummary` 各区块与系统 Prompt 正确格式化，且前端能成功将 XML 逆向解析为 5 个输入框的结构。
3. **校验记忆工具拦截**：在模拟对话中触发 AI 调用 `memory` 工具，验证前端是否成功拦截该动作并静默写入 `<long_term_profile>` 区块，且 localStorage 成功持久化该变更。
4. **前端渲染事件条测试**：测试中途结晶发生时，聊天气泡列表内原消息静默消失，并在对应位置正确出现 `[已整理记忆]` 状态的 Tool 状态条。
