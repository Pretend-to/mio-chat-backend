/**
 * WechatChannel — 微信 iLink 渠道适配器
 *
 * 继承自 BaseChannel 统一基类，专注于处理微信 iLink 协议特异性：
 *   - 微信长轮询 getUpdates 循环
 *   - 微信专有 Protobuf / JSON 消息解析 (extractText) 与文本消息构建 (buildSendMsg)
 *   - 微信官方多模态 CDN 加密直传与原生图片消息下发 (doSendImage)
 *   - 微信 Typing 状态票据与交互 (doSendTyping)
 */

import fs from 'node:fs'
import { sleep } from '../memory/sleep.js'
import { BaseChannel } from '../BaseChannel.js'
import { extractText, buildSendMsg, buildSendImageMsg, splitWechatText } from './msgHelper.js'

const LONG_POLL_MS = 30_000
const RETRY_DELAY_MS = 3_000

export class WechatChannel extends BaseChannel {
  /**
   * @param {object} opts
   * @param {import('./IlinkClient.js').IlinkClient} opts.client      iLink 协议客户端
   * @param {import('../memory/MemoryStore.js').MemoryStore} opts.memory     记忆/会话落盘
   * @param {string} opts.masterId   绑定者微信 UID（唯一对话用户，跳过其他）
   * @param {object} opts.llm        { async process(ctx) -> { completed } } 处理普通消息
   * @param {boolean} [opts.typing]  是否启用"正在输入"反馈（默认 true）
   */
  constructor(opts) {
    super({
      ...opts,
      channelType: 'wechat',
    })
    this._buf = ''
    this._typingTickets = new Map() // userId -> typing_ticket（可缓存）
  }

  // ===============================================================
  /**
   * 微信渠道专属系统提示词：
   * 1. 简短、口语化、接地气，像日常发微信一样自然；
   * 2. 避免大段长篇大论，单条消息控制在 1~3 句话；
   * 3. 支持使用 <msg>...</msg> 或 <break/> 分隔符将一次回复切分成多条微信消息逐条发出；
   * 4. 复杂任务或工具调用时，严禁长时间静默，穿插阶段性进展输出。
   */
  getChannelPrompt() {
    return [
      '【微信渠道交互与消息风格规范】',
      '1. 你正在通过【微信】直接与用户私聊，请遵循真实人类微信聊天习惯：',
      '   - 语言简短明快、生动自然、口语化，不要长篇大论或官腔堆砌。',
      '   - 除非用户明确要求写长文/代码/长报告，否则日常问答单条保持在 1~3 句话以内。',
      '2. 【分条发送与进度穿插规范】：',
      '   - 你可以使用 `<msg>消息内容</msg>` 标签将本次回复切分成多条独立的微信消息发送（或者在消息之间使用 `<break/>` 分隔）。',
      '   - 微信客户端会自动为你把每段 `<msg>...</msg>` 作为一条独立气泡发送给用户，体验非常连贯自然！',
      '   - ⚠️【严禁长时间静默调用工具】：当需要连续调用耗时工具（如查文件、跑命令、画图、搜索等）时，你必须在调用工具前或工具之间先输出一小句进度说明（如 `<msg>正在为你检索系统网络状态，请稍候～</msg>`），严禁长时间没有任何文字输出让用户盲目等待！',
      '   - 示例：',
      '     <msg>好嘞，正在帮你画一张可爱的自画像，可能需要十几秒～</msg>',
      '     (随后执行 draw 工具)',
      '     <msg>画好啦！你看看喜欢不～</msg>',
    ].join('\n')
  }

  /** 微信渠道：将 LLM 产出的完整文本按 <msg>/<break/> 协议切分为多条独立气泡 */
  splitTextToSegments(text) {
    return splitWechatText(text)
  }

  extractText(msg) {
    return extractText(msg)
  }

  buildSendMsg({ to, fromBot, contextToken, text }) {
    return buildSendMsg({
      to,
      fromBot: fromBot || this.client.botId,
      contextToken,
      text,
    })
  }

  async doSendMessage(payload) {
    return this.client.sendMessage(payload)
  }

  /**
   * 微信原生图片发送实现：
   * 1. 加载图片数据（Buffer / 本地文件路径 / HTTP URL）
   * 2. 通过 client.uploadMedia 进行 AES-128-CBC 加密并直传腾讯 CDN
   * 3. 构造 type: 2 (IMAGE) 的 WeixinMessage 发送
   */
  async doSendImage({ to, contextToken, buffer, url }) {
    let imgBuffer = buffer
    if (!imgBuffer && url) {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const resp = await fetch(url)
        imgBuffer = Buffer.from(await resp.arrayBuffer())
      } else if (fs.existsSync(url)) {
        imgBuffer = await fs.promises.readFile(url)
      }
    }

    if (!imgBuffer || imgBuffer.length === 0) {
      throw new Error(`无法获取有效的图片二进制数据 (url=${url})`)
    }

    // 上传并加密到微信 CDN
    const mediaInfo = await this.client.uploadMedia(imgBuffer, { mediaType: 1, toUserId: to })

    // 构造下行原生图片包并发送
    const imgMsg = buildSendImageMsg({
      contextToken,
      fromBot: this.client.botId,
      mediaInfo,
      to,
    })

    const sendRes = await this.client.sendMessage(imgMsg)
    this.log?.info?.(`[WechatChannel] 📤 原生图片消息发送结果: ${JSON.stringify(sendRes)}`)
    return sendRes
  }

  async doSendTyping(ctx, status) {
    if (!this.typing) return
    try {
      const ticket = await this._getTypingTicket(ctx.from, ctx.contextToken)
      if (!ticket) return
      await this.client.sendTyping({ ilinkUserId: ctx.from, typingTicket: ticket, status })
    } catch (e) {
      this.log?.warn?.(`[WechatChannel] sendTyping 失败: ${e?.message}`)
    }
  }

  async _getTypingTicket(userId, contextToken) {
    if (this._typingTickets.has(userId)) return this._typingTickets.get(userId)
    const cfg = await this.client.getConfig({ contextToken, ilinkUserId: userId })
    const ticket = cfg?.typing_ticket
    if (ticket) this._typingTickets.set(userId, ticket)
    return ticket
  }

  // ===============================================================
  // 微信长轮询主循环
  // ===============================================================
  async _loop() {
    this.log?.info?.(`[WechatChannel] 🚀 微信渠道已启动长轮询监听 (masterId=${this.masterId}, botId=${this.client.botId})`)
    while (this.running) {
      try {
        const resp = await this.client.getUpdates(this._buf, { timeoutMs: LONG_POLL_MS, signal: this._abort?.signal })
        if (!this.running) break
        this._buf = resp.get_updates_buf || this._buf
        const msgs = resp.msgs || []
        if (msgs.length > 0) {
          this.log?.info?.(`[WechatChannel] 📥 收到微信推送消息 ${msgs.length} 条`)
        }
        for (const msg of msgs) {
          if (!this.running) break
          this.log?.info?.(`[WechatChannel] 🔍 原始消息结构: ${JSON.stringify(msg)}`)
          await this.handleIncomingMessage(msg)
        }
      } catch (e) {
        if (!this.running) break
        if (e?.name === 'AbortError' && !this.running) break
        this.log?.warn?.(`[WechatChannel] getUpdates error: ${e?.message}`)
        // 遇到网络异常退避重试
        await sleep(RETRY_DELAY_MS)
      }
    }
  }
}

// 导出辅助函数保证外部引用和单测向下兼容
export { extractText, buildSendMsg, buildSendImageMsg } from './msgHelper.js'
export default WechatChannel