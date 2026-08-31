---
name: trigger-sentinel-author
description: 掌握 MioChat Trigger 系统与后台条件哨兵（Sentinel）编写技能。当用户需要对行情走势、价格突破、指标异常、系统状态、文件变更或外部事件进行后台自动巡逻并在条件达成时唤醒 Agent 时使用。
---

# Trigger 哨兵与后台事件触发专家 (Trigger Sentinel Author)

本技能指导 AI Agent（如桐乃及其他助手）掌握 MioChat 核心 Trigger 系统的设计哲学，并使用 `trigger_manage` 工具自主编写、部署和管理后台条件哨兵。

---

## 1. 核心设计哲学与唤醒机制

Trigger 系统的核心使命是：**让 Agent 拥有在后台自主监控并随时“带着证据醒来”的能力**。

### 唤醒机制原语
1. **唤醒 = 向绑定会话追加一条标准的 User 消息**；
2. **LLM 无关与无状态**：哨兵在后台运行，平时绝不消耗 LLM Token；仅当满足预设条件时，才触发唤醒流程；
3. **身份随 Session**：唤醒消息注入哪个会话，就由该会话绑定的 Agent 人格自然接收并处理。

---

## 2. `@WAKE@` 标准 stdio 契约（铁律）

系统采用**跨语言进程隔离**与 **stdio 标志行契约**来判定是否唤醒。

### 契约格式
脚本运行后，若满足唤醒条件，**必须且只能在 stdout 的最后输出包含 `@WAKE@` 前缀的 JSON 字符串**：

```text
@WAKE@ {"wake": true, "reason": "【事件原因描述】", "data": { ...关键证据与明细... }}
```

### 字段说明
- `wake` (boolean): `true` 表示触发唤醒；`false` 或无输出表示未达到条件、继续沉睡；
- `reason` (string): 核心原因概括（如 `"BTC 突破 78400 关键阻力位"`）；
- `data` (object): 结构化证据（如 `{"price": 78412, "rsi": 71, "volume24h": 1250000000}`），唤醒时会自动附带给 Agent。

### 常用语言编写范例

#### ① Node.js (推荐，内建支持 fetch)
```javascript
const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
const data = await res.json();
const price = parseFloat(data.price);

if (price >= 78400) {
  console.log('@WAKE@ ' + JSON.stringify({
    wake: true,
    reason: `BTC 当前价格 ${price} 已突破预设警戒线 78400!`,
    data: { currentPrice: price, target: 78400, timestamp: Date.now() }
  }));
} else {
  console.log(`当前价格 ${price}，未达标`);
}
```

#### ② Python
```python
import urllib.request, json

req = urllib.request.Request('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    price = float(data['price'])
    if price <= 75000:
        print('@WAKE@ ' + json.dumps({
            "wake": True,
            "reason": f"BTC 触及支撑位 {price}",
            "data": {"price": price, "support": 75000}
        }))
```

#### ③ Bash / Shell
```bash
PRICE=$(curl -s "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT" | grep -o '"price":"[^"]*' | cut -d'"' -f4)
# 条件判断
echo "@WAKE@ {\"wake\": true, \"reason\": \"BTC 价格达到 $PRICE\", \"data\": {\"price\": \"$PRICE\"}}"
```

---

## 3. `trigger_manage` 工具调用指南

编写好脚本后，调用 `trigger_manage(action="create", ...)` 注册触发器：

### 参数规范
| 参数 | 类型 | 说明 | 推荐实践 |
|---|---|---|---|
| `action` | string | `"create"` | 创建触发器 |
| `type` | string | `"script"` (条件哨兵) / `"cron"` (定时调度) | 监控类一律用 `"script"` |
| `mode` | string | `"once"` / `"persistent"` | **单次预警用 once；持续巡检用 persistent** |
| `cronExpr` | string | 调度周期表达式 | 高频监控 `"*/1 * * * *"`，常规巡检 `"*/5 * * * *"` |
| `scriptCode` | string | 哨兵脚本完整源码 | 包含自包含的 HTTP 请求与 `@WAKE@` 输出 |
| `scriptLang` | string | `"js"` / `"python"` / `"bash"` | 默认 `"js"` |
| `promptTemplate` | string | 唤醒时的关注提示词 | 支持 `{{payload.reason}}` 或 `{{payload.data.key}}` |
| `cooldownSec` | number | 冷却时间（秒） | 默认 1800 秒（30分钟），防频繁轰炸 |
| `maxFiresPerDay` | number | 每日最大唤醒限额 | 默认 5 次 |

---

## 4. 生命周期选择策略（`mode`）

1. **`mode: "once"`（一次性触发器）**：
   - **适用场景**：“到 78500 叫我”、“跌破支撑位提醒我”、“下载任务完成后通知我”；
   - **行为**：一旦条件达成并成功唤醒 Agent 一次，触发器**自动从调度中移除销毁**，但**执行审计日志永久保留**，避免重复触发。
2. **`mode: "persistent"`（持久性巡检）**：
   - **适用场景**：“每小时巡检资金曲线与仓位”、“每天早晚指标监控”；
   - **行为**：每次条件达成并唤醒后，更新 `lastFiredAt` 进入冷却期，冷却结束后继续保持巡检。

---

## 5. 调试与排错

当用户询问触发器状态或遇到哨兵未唤醒时：
1. **查看列表**：调用 `trigger_manage(action="list")` 或微信回复 `/triggers ls`；
2. **试跑脚本**：调用 `trigger_manage(action="run_once", id="<triggerId>")`，可直接查看脚本 stdout/stderr 输出与耗时；
3. **查看审计**：调用 `trigger_manage(action="logs", id="<triggerId>")`，核实是否因冷却（`cooldown_skipped`）或限额（`quota_exceeded`）被拦截。
