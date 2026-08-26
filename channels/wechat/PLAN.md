# WeChat iLink Channel — 完整开发计划 & UX 设计

> 状态：设计评审稿 v1
> 目标：miochat 自研直连微信（腾讯 ClawBot / iLink 协议），作为第一个「非 Web」渠道验证多渠道抽象。

---

## 1. 背景与目标

将 miochat 从「绑定 Vue3 Web 前端」解耦成「核心 + 多渠道适配器」。微信 ClawBot/iLink（腾讯官方 2026 开放）成为第一个外部渠道。

**边界（官方协议性质）**
- 只对接 **iOS 微信**（安卓未开放）
- 一个微信账号 **只能绑定一个 Bot 实例**
- **仅绑定者本人**能与之对话（无好友/群聊共同会话）
- iLink 支持主动推送，但需 **24h 内有用户主动消息保活**；`-14` 会话过期需重扫

**一句话定位**：微信 = 绑定本人在微信里使用 miochat 的专属入口（单用户、可共享记忆）。

---

## 2. 架构总览

```
            ┌───────────────────────────── miochat 后端 ─────────────────────────────┐
微信 ClawBot│   channels/                     memory/                  lib/ (核心)      │
  (iLink)   │   └─ wechat/                  └─ agents/<id>/           ├─ llm / tools    │
   │        │      ├─ IlinkClient.js  ──────┐  ├─ soul.md             ├─ crystallization │
长轮询/发送 │      ├─ WechatChannel.js  ─────┼─►│  ├─ longterm.md      ├─ admission ...   │
            │      └─ ... (飞书/钉钉将来)       │  └─ sessions/*.json  │                  │
            └────────────────────────────────┼────────────────────────┼──────────────────┘
                                             └─ 渠道无关记忆落盘 ──────► 复用核心(LLM/工具/结晶)
```

**分层原则**：
- `channels/`：渠道只管「微信侧收发 + 会话路由 + 记忆读写」，不碰核心逻辑
- `memory/`：渠道无关的记忆落盘（灵魂/长期记忆/聊天记录）——尤其服务「无前端 store 的渠道」
- `lib/`：核心（LLM、工具、结晶）保持与渠道无关

---

## 3. 数据模型

### 3.1 渠道层映射

| 微信概念 | 映射到 | 说明 |
|---------|--------|------|
| 绑定者微信 UID `xxx@im.wechat` | 一个 **admin** 客户端 | Web 本就无完整用户系统，直接当 admin |
| Bot 会话（多 session）| `memory/agents/<agent>/sessions/<sessionId>.json` | 一用户多会话 |
| 消息 `context_token` | 绑定到对应 session | sendMessage 回话必须带回 |
| 当前激活会话 | `memory/agents/<agent>/active_session` 记录 | `/use` 切换 |

### 3.2 memory 目录（渠道无关记忆落盘）

```
memory/agents/<agentId>/
├── soul.md                    # 🧬 灵魂/人格（用户可定制，markdown）
├── longterm.md                # 长期记忆（对标 memory 工具 scope:global，markdown）
├── active_session             # 当前激活会话 id
└── sessions/
    ├── <sessionId>.json       # { id, title, created_at, chat: WeixinMessage[], crystal: <memory_crystal> }
    └── ...
```

- `soul.md`：人格设定，主历史首条 system 注入；**不是 preset.history**
- `longterm.md`：跨会话稳定事实（对应全局长期记忆）
- `sessions/<id>.json`：对话记录（`chat`）+ 该 session 的结晶摘要（`crystal`）

### 3.3 preset 与 memory 分工

| 层 | 位置 | 管什么 |
|----|------|--------|
| 工具/模型 | `preset`（现有）| provider/model/tools |
| 灵魂/人格 | `memory/.../soul.md` | 性格/名字/陪伴方式 |
| 长期记忆 | `memory/.../longterm.md` | 跨会话稳定事实（对标 global）|
| 会话记录/结晶 | `memory/.../sessions/*.json` | 聊天记录 + 该会话 memory_crystal |

> Web 现状不动（结晶走前端 store、long-term 走 memory 工具 global）；`memory/` 是**无前端 store 渠道**的落盘载体，微信从后端读写，与 Web 不冲突。

---

## 4. UX 设计

### 4.1 绑定流程（一次性）

```
① 管理后台 → 添加渠道「WeChat」
② 生成登录二维码（get_bot_qrcode）→ 前端显示
③ 管理本人手机微信扫码确认
④ 后端轮询状态 → confirmed → 持久化 bot_token/bot_id/user_id
⑤ 绑定者被标记为渠道 admin；渠道进入长轮询
   └─ 绑定前必须先 /bind 归属到某个 agent（首次引导）
```

### 4.2 灵魂引导（新 agent 首聊）

```
微信里第一条消息 ─► 无 soul.md ─► 引导式开场：
    "你好呀～ 我还没有人格设定。你希望我怎样陪伴你？给我取个名字吧？
     （开放引导：名字 / 陪伴方式 / 语气完全由用户自由定义，AI 据此生成 soul.md）"
用户回应 ─► AI 提炼 ─► 写入 soul.md（markdown 固化）
   ├─ 此后请求：soul.md 注入为历史首条 system
   └─ /soul 随时查看 / 重设
```

### 4.3 对话流转

```
用户消息
  ├─ 以 "/" 开头 → slash 命令路由（会话管理）
  └─ 普通消息 → 落入当前激活 session
        → 组装 messageChain = [soul system] + [longterm] + [session chat]
        → 调用核心（LLM/工具/结晶），LLM 侧保持流式；微信侧对 tool-call 类 chunk 不更新/不发送，仅完整 text 生成后聚合一次发送
        → sendMessage 带 context_token 发回
        → 落盘 session chat
        → 超水位 → 结晶 → 更新 session crystal + longterm
```

### 4.4 Slash 命令表

| 命令 | 作用 |
|------|------|
| `/help` | 命令列表 |
| `/sessions` `/ls` | 列出会话 |
| `/new [标题]` | 新建会话并激活（空记忆，longterm 保留）|
| `/use <id>` | 切换当前会话 |
| `/current` | 显示当前会话 |
| `/clear` | 清空当前会话历史（保留人格/长期记忆）|
| `/soul` | 查看/重设人格 |
| `/memory` | 查看长期记忆 |
| `/context` | 看当前会话结晶摘要 |
| `/delete <id>` | 删除会话 |

### 4.5 状态反馈（流式内部 + 聚合推送）

- LLM 侧保持流式；微信侧 **tool-call 类 chunk 不更新/不发送**，只推送最终完整 text 段
- 发送 `sendTyping`（"正在输入"）缓解长思考等待
- 消息 `state: GENERATING → FINISH` 反映处理中/完成
- 出错时回一段错误文案 + `/help` 提示

---

## 5. 消息流时序

```
getUpdates 长轮询循环
  ├─ 空/超时 → 继续轮询（正常控制流）
  ├─ 收到消息 msg
  │    ├─ 解析 from_user_id / item_list / context_token
  │    ├─ 身份：非绑定者 → 忽略（单用户边界）；绑定者 → 走流程
  │    ├─ slash 命令？ → 会话命令处理 → 发回结果
  │    └─ 普通 → 落到 active session → 核心处理 → sendMessage 聚合回复 → 落盘
  ├─ ret=-14（会话过期）→ 提示重扫；24h 无用户消息 → 通知保活/提醒
```

---

## 6. 开发计划（里程碑）

| 里程碑 | 内容 | 状态 |
|--------|------|------|
| **M0** | `channels/` 骨架 + PROTOCOL.md + **IlinkClient 协议层**（登录/长轮询/收发/typing/notify）+ mock 测试 | ✅ 已完成（本地提交）|
| **M1** | `memory/` 记忆落盘层（soul/longterm/sessions JSON + CRUD + channel 通用）| ⬜ |
| **M1.5** | 媒体收发（图/语音/文件）：CDN 上传下载 + AES 加解密 + 转码 | ⬜ |
| **M2** | **WechatChannel 核心**：长轮询主循环、会话路由、slash 命令、单用户 admin、回复聚合发送 | ⬜ |
| **M3** | **灵魂引导**：新 agent 无 soul → 引导定制 → 写 soul.md → 注入 | ⬜ |
| **M4** | **持久化 + 结晶**：session chat 落盘、结晶更新 crystal/longterm、`/soul /memory /context` | ⬜ |
| **M5** | **保活 + 运行时**：24h 窗口监测、`-14` 重扫、typing 反馈、错误恢复 | ⬜ |
| **M6** | 管理面：绑定/二维码 UI、渠道启停、`/help` 文档完善 | ⬜ |
| **M7** | 真实联调（iOS 微信扫码绑定）+ 打磨 | ⬜ |

**建议依赖**：M1 先行（memory 是微信渠道的地基），M2/M3 并行，M4 依赖 M1+全局结晶。每步单测 mock iLink/memory，本地提交审查后再推。

---

## 7. 风险与边界

- iOS-only / 一账号一 bot / 仅绑定者本人 → 单用户设计成立，但**无法多用户或多群体验**
- 24h 保活：需要定时任务 + 失败提醒；主动推送依赖窗口内用户消息
- 无流式：长回复靠 typing + 聚合，体验不是逐 token
- 协议无官方文档：字段来自腾讯官方插件源码逆向，可能有版本漂移（M7 真机验证兜底）

---

## 8. 已定设计决策（2026-08-26 review）

1. **灵魂引导：开放不预设**——不提供陪伴类型选项，名字/陪伴/语气完全由用户自定义，AI 生成 soul.md。
2. **记忆兼容 memory**——longterm 复用后端 `memory 工具 scope:'global'` 的统一机制（memory 目录作为其落盘/视图载体），不另起一套。
3. **媒体入 M1.5**——图/语音/文件收发放在记忆层之后、核心渠道后追加。
4. **流式策略**——LLM 侧保持流式；微信侧对 tool-call 类 chunk 不更新/不发送，仅完整 text 生成后聚合一次发送，配合 sendTyping/GENERATING-FINISH 状态。
