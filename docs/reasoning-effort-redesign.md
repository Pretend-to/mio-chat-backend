# 思考强度 (reasoning_effort) 统一升级方案

> 日期：2026-07-31（已实施 ✅）  
> 目标：前端扩展为 7 档 `[-1, 0, 1, 2, 3, 4, 5]`，覆盖 GPT 5.x / Claude Sonnet 5 / Gemini 3 / DeepSeek V4 全系最新标准

---

## 一、前端 Slider 改造

### 当前状态

```
范围: [-1, 0, 1, 2, 3]
-1 → 默认
 0 → 关闭思考
 1 → 基础思考
 2 → 均衡思考
 3 → 深度思考
```

### 目标状态

```
范围: [-1, 0, 1, 2, 3, 4, 5]
-1 → 默认
 0 → 关闭思考
 1 → 极简 (none / minimal)
 2 → 轻度 (low)
 3 → 中度 (medium)
 4 → 深度 (high)
 5 → 极致 (xhigh / max)
```

**改动文件**：`src/components/profile/ContactorBasicTab.vue`
- `sliderTypes.d.max`：3 → 5
- `formatter` 映射表扩展为 7 个 key

---

## 二、各供应商最新思考强度标准（2026.07）

### 2.1 OpenAI（GPT 5.6 系列）

**API**：Responses API（官方推荐，Chat Completions 仍可用但不推荐）

**参数**：`reasoning.effort`

| 值 | 含义 | MioChat 内部映射 |
|----|------|-----------------|
| `none` | 关闭推理 | 0 |
| `low` | 轻度推理 | 2 |
| `medium` | 均衡推理（**默认**） | 3 |
| `high` | 深度推理 | 4 |
| `xhigh` | 超深推理 | 5 |
| `max` | **GPT 5.6 独占**，最强推理 | 5（同 xhigh） |

**新增参数**（非必须，后续可扩展）：
- `reasoning.mode`：`standard` / `pro`（更多模型工作量，更强的可靠性）
- `reasoning.context`：`auto` / `current_turn` / `all_turns`（跨轮推理复用）
- `reasoning.summary`：`auto` / `concise` / `detailed`（返回推理摘要）

**三个模型变体**：
- `gpt-5.6` → alias to `gpt-5.6-sol`（旗舰）
- `gpt-5.6-terra`（性价比）
- `gpt-5.6-luna`（低成本高吞吐）

**来源**：https://developers.openai.com/api/docs/guides/reasoning

---

### 2.2 Anthropic Claude

**API**：Messages API

| Claude 代际 | 思考机制 | 参数 |
|-------------|---------|------|
| **Claude 3.5 / 3.7** | Legacy budget | `thinking: {type: "enabled", budget_tokens: N}` |
| **Claude 4.0+ / Sonnet 5 / Opus 5** | Adaptive thinking | `thinking: {type: "adaptive"}` + `output_config: {effort: "low"/"medium"/"high"/"max"}` |

**effort 5 档映射**（Claude 4+ / Sonnet 5 / Opus 5）：
```
MioChat 1→low, 2→low, 3→medium, 4→high, 5→max
```

**关键变化**：Claude 4.7+ **拒绝** `thinking: {type: "enabled", budget_tokens: N}`，返回 400。代码中使用 `isClaude4Plus` 检测（匹配 `claude-4`, `claude-opus-4`, `claude-5`）。

**来源**：https://platform.claude.com/docs/en/build-with-claude/extended-thinking

---

### 2.3 Google Gemini

**两代 API，完全不兼容**：

#### Gemini 2.5 系列（thinkingBudget）

| 模型 | 参数 | 典型值 |
|------|------|--------|
| gemini-2.5-flash | `thinkingConfig.thinkingBudget` | 0(关), 1024, 12800, 24576 |
| gemini-2.5-pro | `thinkingConfig.thinkingBudget` | 0(关), 8192, 16384, 32768 |

#### Gemini 3.x 系列（thinkingLevel）

| 值 | 描述 | 可用模型 |
|----|------|---------|
| `MINIMAL` | 最少 tokens，低复杂度（仅 Flash） | gemini-3.x-flash |
| `LOW` | 较少 tokens | gemini-3.1-pro, gemini-3.x-flash |
| `MEDIUM` | 均衡（仅 Flash） | gemini-3.x-flash |
| `HIGH` | 深度推理，**默认** | gemini-3.1-pro, gemini-3.x-flash |

**注意**：`thinkingLevel` 和 `thinkingBudget` 互斥，不能同时使用。

**来源**：https://ai.google.dev/gemini-api/docs/changelog, https://www.promptfoo.dev/docs/providers/google

---

### 2.4 DeepSeek V4

**API**：Chat Completions（兼容 OpenAI 协议）

**思考强度只有 2 档**：

| 实际值 | 兼容映射 |
|--------|---------|
| `high` | `low` / `medium` → 都映射为 `high` |
| `max` | `xhigh` → 映射为 `max` |

**参数格式**（二选一）：
- OpenAI 格式：`reasoning_effort: "high" / "max"` + `extra_body: {thinking: {type: "enabled"}}`
- Anthropic 格式：`output_config: {effort: "high" / "max"}`

**关键特性**：
- 思考默认开启（`thinking.type` 默认 `enabled`）
- 不支持 `temperature` / `top_p` 等采样参数
- CoT 通过 `reasoning_content` 字段返回
- 模型：`deepseek-v4-pro`、`deepseek-v4-flash`

**来源**：https://api-docs.deepseek.com/guides/thinking_mode

---

### 2.5 智谱 (Zhipu) GLM

走 `extra_body.thinking` 路径（`type: "enabled"/"disabled"`），无分档粒度。保持现有逻辑即可。

---

### 2.6 小米 Mimo

走 `_applyExtraThinkingBody` 通用路径（`extra_body.thinking`），同样无分档。保持现有逻辑即可。

---

## 三、统一映射表

**核心思路**：前端输出 `[-1, 0, 1, 2, 3, 4, 5]`，各适配器按自己的"分辨率"去映射。

```
  MioChat 统一值  含义        OpenAI (Chat)     OpenAI (Resp.)   Claude 4+/S5/O5  Gemini 3.x       DeepSeek V4      Gemini 2.5 (budget)
  ─────────────   ────        ──────────────    ──────────────  ───────────────  ─────────────    ──────────────   ──────────────────
  -1              默认        不传（默认medium） 不传（默认med.） 不传（默认）     不传（默认HIGH） 不传（默认high）  不传
   0              关闭思考     none              none            不启用           不传thinking     disabled         不传thinking
   1              极简         none              none            low              MINIMAL          disabled         不传
   2              轻度         low               low             low              LOW              high             1024 / 8192
   3              中度(默认)   medium            medium          medium           MEDIUM           high             1024 / 16384
   4              深度         high              high            high             HIGH             max              12800 / 32768
   5              极致         xhigh             max             max              HIGH             max              24576 / 32768
```

### 映射"降级"原则

- **少于 6 档的供应商**（如 DeepSeek 只有 high/max，Gemini 3.1 Pro 只有 LOW/HIGH）：合并相邻档位，不抛错。
- **不支持 none 的供应商**：0 直接映射为 disabled / 不启用 thinking。
- **-1 默认**：各适配器保持自己的默认行为，不强灌参数。

---

## 四、后端各适配器改造清单

### 4.1 `openai.js` (Chat Completions) ✅ 已实施

**改造内容**：
- `isReasoningModel` 新增 `model.startsWith('gpt-5.')` 匹配
- 映射表扩展为 7 档 (-1~5)

```js
// 已实施代码
const isReasoningModel =
  model.startsWith('o1') || model.startsWith('o3') || model.startsWith('o4') ||
  model.startsWith('gpt-5.')
if (isReasoningModel) {
  const openaiReasoningEffortTable = {
    '-1': undefined,
    0: 'none',
    1: 'none',
    2: 'low',
    3: 'medium',
    4: 'high',
    5: 'xhigh',    // Chat Completions 不支持 max
  }
```

**注意**：Chat Completions 不支持 `max`，那是 Responses API 独占的。

---

### 4.2 `openai-responses.js` (Responses API) ✅ 已实施

**改造内容**：
- 映射表扩展为 7 档 (-1~5)
- -1 时不传 `reasoning` 字段
- fallback 值从 `'none'` 改为 `'medium'`

```js
// 已实施代码
const reasoningEffortMap = {
  '-1': undefined,   // 不传，用 API 默认 (medium)
  0: 'none',
  1: 'none',
  2: 'low',
  3: 'medium',
  4: 'high',
  5: 'max',
}
const effortValue = chatParams.reasoning_effort
preparedBody.reasoning =
  effortValue === -1 || effortValue === undefined
    ? undefined
    : {
        effort: reasoningEffortMap[effortValue] || 'medium',
      }
```

---

### 4.3 `gemini.js` ✅ 已实施

**改造内容**：flash/pro/level 三套表均扩展为 7 档 (-1~5)

```js
// 已实施代码
const reasoningEffortTables = {
  flash: new Map([
    [-1, undefined],
    [0, undefined],
    [1, 0],           // 关闭
    [2, 1024],        // low
    [3, 1024],        // medium（flash 用 low budget）
    [4, 12800],       // high
    [5, 24576],       // max（flash 最大 budget）
  ]),
  pro: new Map([
    [-1, undefined],
    [0, undefined],
    [1, undefined],   // none → 不启用
    [2, 8192],        // low
    [3, 16384],       // medium
    [4, 32768],       // high
    [5, 32768],       // max
  ]),
  level: new Map([    // Gemini 3.x
    [-1, undefined],
    [0, undefined],
    [1, 'MINIMAL'],
    [2, 'LOW'],
    [3, 'MEDIUM'],
    [4, 'HIGH'],
    [5, 'HIGH'],      // 无 xhigh/max，最高即 HIGH
  ]),
}
```

**已知限制**：Gemini 3.1 Pro 仅支持 `LOW` / `HIGH`，`MINIMAL` / `MEDIUM` 可能被 API 拒绝。后续可按模型做能力检测。

---

### 4.4 `deepseek.js` ✅ 已实施

**改造内容**：扩展为 7 档 (-1~5)，按 DeepSeek 官方兼容规则 (low/medium→high, high/xhigh→max)

```js
// 已实施代码
const deepseekReasoningEffortTable = {
  '-1': 'high',    // 默认 high
  0: undefined,    // disabled
  1: undefined,    // none → disabled
  2: 'high',       // low → high（官方兼容映射）
  3: 'high',       // medium → high（官方兼容映射）
  4: 'max',        // high → max
  5: 'max',        // max → max
}
```

---

### 4.5 `anthropic.js` ✅ 已实施

**改造内容**：
- `isClaude4` → `isClaude4Plus`（新增 `claude-5` 检测）
- `effortMap` 扩至 6 档，`budgetMap` 扩至 6 档

```js
// 已实施代码
const isClaude4Plus =
  base.model.includes('claude-4') ||
  base.model.includes('claude-opus-4') ||
  base.model.includes('claude-5')

if (isClaude4Plus) {
  const effortMap = {
    '1': 'low',
    '2': 'low',       // 极简→low
    '3': 'medium',
    '4': 'high',
    '5': 'max',
  }
} else {
  const budgetMap = {
    '1': 1024,
    '2': 1024,
    '3': 2048,
    '4': 4096,
    '5': 8192,
  }
}
```

---

### 4.6 `zhipu.js`

无分档粒度，保持现有 `extra_body.thinking` 逻辑不变。

---

### 4.7 `xiaomimimo.js`

同上，保持 `_applyExtraThinkingBody` 通用逻辑不变。

---

## 五、实施状态

| 文件 | 状态 | 改动摘要 |
|------|------|---------|
| `ContactorBasicTab.vue` | ✅ | slider max 3→5，formatter 7 档 |
| `openai.js` | ✅ | 新增 `gpt-5.` 匹配，映射表 7 档 |
| `openai-responses.js` | ✅ | 映射表 7 档，-1 不传 reasoning，fallback `medium` |
| `gemini.js` | ✅ | flash/pro/level 三套表均扩至 7 档 |
| `deepseek.js` | ✅ | 按官方兼容规则 7 档映射 |
| `anthropic.js` | ✅ | `isClaude4Plus` 检测，effortMap/budgetMap 各 6 档 |
| `zhipu.js` / `xiaomimimo.js` | 🟢 不变 | 无分档粒度 |

---

## 六、风险与注意事项

1. **前端 slider -1~5 对旧模型**：旧模型不理解 4/5，各适配器需要内部"向下兼容"（把 4/5 映射为各自支持的最大值）
2. **OpenAI Chat Completions 不支持 `max`**：值 5 映射为 `xhigh`
3. **DeepSeek 只有两档**：值 2/3 统一映射为 `high`，4/5 统一映射为 `max`
4. **Gemini 3.1 Pro 只有 LOW/HIGH**：值 1/2 → LOW，3/4/5 → HIGH
5. **Claude 4.7+ 拒绝 budget_tokens**：需要模型版本检测，Claude 4.7+/Sonnet 5/Opus 5 统一走 adaptive
6. **Anthropic adaptive thinking 与 temperature/top_p 互斥**：启用 adaptive 时必须剥离采样参数（当前已处理）
