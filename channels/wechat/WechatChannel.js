/**
 * WechatChannel — 微信 iLink 渠道（channel 层）
 *
 * 职责（只做微信侧 + 会话路由 + 记忆读写，不碰核心逻辑）：
 *   - 长轮询 getUpdates 主循环（游标推进、异常重连、-14 过期提示）
 *   - 单用户边界：仅处理绑定者(masterId)消息（iLink 本就只开放绑定者对话）
 *   - slash 命令路由：/help /sessions /new /use /current /clear /soul /memory /context /delete
 *   - 普通消息：落到 active session → 组装 messageChain(soul+global+chat) → 注入 llmProcessor
 *     → LLM 内部流式、微信侧对 tool-call chunk 不更新，仅聚合完整 text 一次发送（带 context_token）
 *   - typing 反馈：getConfig 拿 typing_ticket → 处理前 typing(1)、完成后 typing(2/cancel)
 *   - 记忆/会话/结晶持久化：MemoryStore（无前端 store 渠道的落盘端）
 *
 * 核心解耦：llmProcessor 可注入（M2 用可测 handler；真实接入见 lib/chat/llm 的桥接阶段）。
 */
import { sleep } from '../memory/sleep.js'

const LONG_POLL_MS = 30_000
const RETRY_DELAY_MS = 3_000

export class WechatChannel {
  /**
   * @param {object} opts
   * @param {import('../wechat/IlinkClient.js').IlinkClient} opts.client      iLink 协议客户端
   * @param {import('../memory/MemoryStore.js').MemoryStore} opts.memory     记忆/会话落盘
   * @param {string} opts.masterId   绑定者微信 UID（唯一对话用户，跳过其他）
   * @param {object} opts.llm        { async process(ctx) -> { text, crystal? } } 处理普通消息
   * @param {boolean} [opts.typing]  是否启用"正在输入"反馈（默认 true）
   */
  constructor({ client, memory, masterId, llm, typing = true, keepAlive = {}, logger = console }) {
    if (!client || !memory || !masterId) throw new Error('WechatChannel requires client/memory/masterId')
    this.client = client
    this.memory = memory
    this.masterId = masterId
    this.llm = llm
    this.typing = typing
    this.log = logger
    this.running = false
    this._buf = ''
    this._abort = null
    this._typingTickets = new Map() // userId -> typing_ticket（可缓存）
    this._lastContextToken = null // 最近一条 master 消息的 context_token（保活提醒发送需要）
    this.keepAlive = {
      enabled: keepAlive.enabled ?? true,
      userTimeoutMs: keepAlive.userTimeoutMs ?? 24 * 60 * 60 * 1000, // 24h
      remindBeforeMs: keepAlive.remindBeforeMs ?? 60 * 60 * 1000, // 到期前 1h 提醒
      checkEveryMs: keepAlive.checkEveryMs ?? 5 * 60 * 1000,
      remindText: keepAlive.remindText ?? '你有一阵没跟我说话啦～微信通道很快需要保活，回我一句话我们就保持联系！',
      expireText: keepAlive.expireText ?? '微信通道可能已失效：回复任意消息重新激活，或到管理后台重新绑定。',
      _timer: null,
    }
  }

  // ===============================================================
  // 生命周期
  // ===============================================================
  async start() {
    this.running = true
    this._abort = new AbortController()
    try { await this.client.notifyStart() } catch {}
    this._loop() // 异步循环，不阻塞
    if (this.keepAlive.enabled) this._startKeepAlive()
    return this
  }
  async stop() {
    this.running = false
    if (this.keepAlive._timer) { clearInterval(this.keepAlive._timer); this.keepAlive._timer = null }
    try { this._abort?.abort() } catch {}
    try { await this.client.notifyStop() } catch {}
    return this
  }

  async _loop() {
    while (this.running) {
      try {
        const resp = await this.client.getUpdates(this._buf, { timeoutMs: LONG_POLL_MS, signal: this._abort?.signal })
        if (!this.running) break
        this._buf = resp.get_updates_buf || this._buf
        for (const msg of resp.msgs || []) {
          if (!this.running) break
          await this._handleMessage(msg)
        }
      } catch (e) {
        if (!this.running) break
        if (e?.name === 'AbortError' && !this.running) break
        this.log?.warn?.(`[WechatChannel] getUpdates error: ${e?.message}`)
        // -14 = 会话过期需重扫；其余网络错误退避重试
        await sleep(RETRY_DELAY_MS)
      }
    }
  }

  // ===============================================================
  // 消息入口
  // ===============================================================
  async _handleMessage(msg) {
    const from = msg.from_user_id
    if (from !== this.masterId) return // 单用户边界：只处理绑定者
    // 记录活动 + 缓存 context_token（保活提醒发送需要）
    this._lastContextToken = msg.context_token
    await this._recordActivity()
    const contextToken = msg.context_token
    const text = extractText(msg)
    if (typeof text !== 'string' || !text.trim()) return
    try {
      const reply = await this._route(text, { contextToken, from })
      if (reply?.text) {
        await this.client.sendMessage(buildSendMsg({ to: from, fromBot: this.client.botId, contextToken, text: reply.text }))
      }
    } catch (e) {
      this.log?.error?.('[WechatChannel] handle message failed:', e?.message)
      await this._safeSend(from, contextToken, `抱歉，处理出错了：${e?.message}（回复 /help 查看命令）`)
    }
  }
  async _safeSend(from, contextToken, text) {
    try {
      await this.client.sendMessage(buildSendMsg({ to: from, fromBot: this.client.botId, contextToken, text }))
    } catch {}
  }

  async _route(text, ctx) {
    if (text.trim().startsWith('/')) return this._slash(text.trim())
    return this._processChat(text.trim(), ctx)
  }

  // ===============================================================
  // slash 命令
  // ===============================================================
  async _slash(cmd) {
    const [name, ...rest] = cmd.slice(1).trim().split(/\s+/)
    const arg = rest.join(' ').trim()
    const active = (() => this.memory.getActiveSession())
    const wrap = (s) => ({ text: s })
    switch (name) {
      case 'help': {
        return wrap(['/help 帮助', '/sessions 列出会话', '/new [标题] 新建会话', '/use <id> 切换会话',
          '/current 当前会话', '/clear 清空当前会话', '/soul 查看灵魂 | /soul set xxx 重设',
          '/memory 查看长期记忆', '/context 当前会话记忆', '/delete <id> 删除会话'].join('\n'))
      }
      case 'sessions': case 'ls': {
        const list = await this.memory.listSessions()
        const cur = await active()
        return wrap(list.length ? list.map(s => `${s.id} ${s.id === cur ? '*' : ' '} ${s.title || ''} (${s.msgCount}条)`).join('\n') : '暂无会话，用 /new 新建')
      }
      case 'new': {
        const s = await this.memory.createSession({ title: arg || '新会话' })
        await this.memory.setActiveSession(s.id)
        return wrap(`已新建并切换到会话 ${s.id}`)
      }
      case 'use': {
        if (!arg) return wrap('用法：/use <会话id>')
        const s = await this.memory.getSession(arg)
        if (!s) return wrap(`会话 ${arg} 不存在，/sessions 查看`)
        await this.memory.setActiveSession(s.id)
        return wrap(`已切换到会话 ${s.id}`)
      }
      case 'current': {
        const cur = await active()
        if (!cur) return wrap('当前无激活会话')
        const s = await this.memory.getSession(cur)
        return wrap(`当前会话 ${cur}${s?.title ? `「${s.title}」` : ''}`)
      }
      case 'clear': {
        const cur = await active()
        if (!cur) return wrap('当前无激活会话')
        await this.memory.clearChat(cur)
        return wrap(`已清空会话 ${cur} 的聊天（记忆保留，/context 查看）`)
      }
      case 'soul': {
        if (rest[0] === 'set' && rest[1]) {
          const soul = rest.slice(1).join(' ')
          await this.memory.writeSoul(soul)
          return wrap('灵魂已重设 ✅')
        }
        const soul = await this.memory.readSoul()
        return wrap(soul ? `【灵魂】\n${soul}` : '还没有设定灵魂，直接告诉我你希望我怎样陪伴你吧～')
      }
      case 'memory': {
        const g = await this.memory.readAllGlobal()
        return wrap(g ? `【长期记忆】\n${g}` : '暂无长期记忆')
      }
      case 'context': {
        const cur = await active()
        const crystal = cur ? await this.memory.getCrystal(cur) : ''
        return wrap(crystal ? `【会话记忆】\n${crystal}` : '当前会话暂无结晶记忆')
      }
      case 'delete': {
        if (!arg) return wrap('用法：/delete <会话id>')
        await this.memory.deleteSession(arg)
        return wrap(`已删除会话 ${arg}`)
      }
      default:
        return wrap(`未知命令 /${name}，/help 查看可用命令`)
    }
  }

  // ===============================================================
  // 普通对话
  // ===============================================================
  async _processChat(text, ctx) {
    // 1. 确保有 active session
    let sid = await this.memory.getActiveSession()
    if (!sid) {
      const s = await this.memory.createSession({ title: '默认会话' })
      sid = s.id
      await this.memory.setActiveSession(sid)
    }
    // 2. typing 开始
    await this._typingStart(ctx)
    try {
      const soul = await this.memory.readSoul()
      const globalMem = await this.memory.readAllGlobal()
      const chat = await this.memory.getChat(sid)

      // 3. 灵魂引导（M3）：无 soul 时走引导模式，直到 AI 提炼出 soulDraft 并固化
      if (!soul) {
        const reply = await this.llm.process({ sessionId: sid, soul: '', globalMem: '', chat: [], guidance: true, text })
        const replyText = (reply?.text ?? '').trim()
        if (reply?.soulDraft) {
          await this.memory.writeSoul(reply.soulDraft)
          return { text: replyText || '好呀，我已经记下我的灵魂了～' }
        }
        // 未提炼出灵魂：引导对话不进正式会话记录
        return { text: replyText || '（请告诉我你希望我怎样陪伴你）' }
      }

      // 4. 正常对话：组装 messageChain(soul + global + chat) → llmProcessor → 聚合 text
      const reply = await this.llm.process({ sessionId: sid, soul, globalMem, chat, text })
      const replyText = (reply?.text ?? '').trim()
      if (replyText) {
        await this.memory.appendToChat(sid, { from_user_id: ctx.from, role: 'user', text })
        await this.memory.appendToChat(sid, { role: 'assistant', text: replyText })
        if (reply.crystal) await this.memory.setCrystal(sid, reply.crystal)
      }
      return { text: replyText || '（没有生成内容）' }
    } finally {
      await this._typingStop(ctx)
    }
  }

// ===============================================================
  // 保活（M5）：记录活动时间 + 到期前提醒，让用户回来发条消息维持通道
  // ===============================================================
  /** 用户产生活动时更新（写入 memory agent meta，持久化） */
  async _recordActivity() {
    if (!this.keepAlive.enabled) return
    try { await this.memory.setAgentMeta('last_user_activity', Date.now()) } catch {}
  }
  _startKeepAlive() {
    const { checkEveryMs } = this.keepAlive
    this.keepAlive._timer = setInterval(() => { this._checkKeepAlive().catch(() => {}) }, checkEveryMs)
    this.keepAlive._timer.unref?.()
  }
  async _checkKeepAlive() {
    if (!this.keepAlive.enabled) return
    const { userTimeoutMs, remindBeforeMs, remindText, expireText } = this.keepAlive
    const last = await this.memory.getAgentMeta('last_user_activity', null)
    if (last == null) { await this._recordActivity(); return } // 尚无活动，以当前为基准
    const idle = Date.now() - last
    const remaining = userTimeoutMs - idle
    if (idle >= userTimeoutMs) {
      // 已超时：通道可能失效 → 通知（仅一次）
      const reminded = await this.memory.getAgentMeta('keepalive_expire_reminded', false)
      if (!reminded) {
        await this._safeSend(this.masterId, this._lastContextToken ?? undefined, expireText)
        await this.memory.setAgentMeta('keepalive_expire_reminded', true)
      }
      return
    }
    if (remaining < remindBeforeMs) {
      // 到期前窗口：窗口内只提醒一次
      const lastRemind = await this.memory.getAgentMeta('keepalive_last_reminder', 0)
      if (!lastRemind || Date.now() - lastRemind > remindBeforeMs) {
        await this._safeSend(this.masterId, this._lastContextToken ?? undefined, remindText)
        await this.memory.setAgentMeta('keepalive_last_reminder', Date.now())
      }
    } else {
      // 健康：清提醒状态，下次窗口可再提醒
      if (await this.memory.getAgentMeta('keepalive_last_reminder', 0)) {
        await this.memory.setAgentMeta('keepalive_last_reminder', 0)
      }
      if (await this.memory.getAgentMeta('keepalive_expire_reminded', false)) {
        await this.memory.setAgentMeta('keepalive_expire_reminded', false)
      }
    }
  }

  // ===============================================================
  // typing 反馈（"对方正在输入"）
  // ==============================================================="  // ===============================================================
  // typing 反馈（"对方正在输入"）
  // ===============================================================
  async _typingStart(ctx) {
    if (!this.typing) return
    try {
      const ticket = await this._getTypingTicket(ctx.from)
      await this.client.sendTyping({ ilinkUserId: ctx.from, typingTicket: ticket, status: 1 })
    } catch { /* typing 失败不阻断 */ }
  }
  async _typingStop(ctx) {
    if (!this.typing) return
    try {
      const ticket = await this._getTypingTicket(ctx.from)
      await this.client.sendTyping({ ilinkUserId: ctx.from, typingTicket: ticket, status: 2 })
    } catch {}
  }
  async _getTypingTicket(userId) {
    if (this._typingTickets.has(userId)) return this._typingTickets.get(userId)
    const cfg = await this.client.getConfig({ ilinkUserId: userId })
    const ticket = cfg?.typing_ticket
    if (ticket) this._typingTickets.set(userId, ticket)
    return ticket
  }
}

/** 从 WeixinMessage 提取文本（item_list 中 type:1 的 text） */
export function extractText(msg) {
  const items = msg?.item_list || []
  for (const it of items) {
    if (it.type === 1 || it.type === 'text') return it.text ?? it.content ?? ''
    if (it.text != null) return it.text
  }
  return ''
}

/** 构造下行 WeixinMessage（发给用户，带回 context_token，message_type=2 bot）。
 *  注意：返回的是 WeixinMessage 本体，传给 client.sendMessage 后由其再包一层 `{msg: ...}`，
 *  避免双重 msg 嵌套。 */
export function buildSendMsg({ to, fromBot, contextToken, text }) {
  return {
    context_token: contextToken,
    from_user_id: fromBot,
    message_state: 2, // FINISH
    message_type: 2, // BOT
    item_list: [{ text, type: 1 }],
    to_user_id: to,
  }
}

export default WechatChannel