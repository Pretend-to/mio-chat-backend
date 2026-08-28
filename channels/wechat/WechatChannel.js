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
import path from 'node:path'
import { sleep } from '../memory/sleep.js'
import { BaseChannel } from '../BaseChannel.js'
import { extractText, buildSendMsg, buildSendImageMsg, splitWechatText, extractImages, extractFiles } from './msgHelper.js'
import { bufferToImageUrl } from '../../utils/imgTools.js'
import storageService from '../../lib/storage/StorageService.js'

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
    this._tokenQuotaMap = new Map() // contextToken -> count (微信 24h 内限额回复 10 条消息)
  }

  _recordTokenUsage(contextToken) {
    if (!contextToken) return 1
    const count = (this._tokenQuotaMap.get(contextToken) || 0) + 1
    this._tokenQuotaMap.set(contextToken, count)
    if (count >= 8) {
      this.log?.warn?.(`[WechatChannel] ⚠️ 警告：contextToken "${contextToken.slice(0, 10)}..." 24h 下发额度已达 ${count}/10 条！`)
    }
    return count
  }

  // ===============================================================
  /**
   * 微信渠道专属系统提示词：
   * 1. 简短、口语化、接地气，像日常发微信一样自然；
   * 2. 避免大段长篇大论，单条消息控制在 1~3 句话；
   * 3. 支持使用 <msg>...</msg> 或 <break/> 分隔符将一次回复切分成多条微信消息逐条发出；
   * 4. 复杂任务或工具调用时，严禁长时间静默，穿插阶段性进展输出。
   * 5. 配额防爆：感知 24h 10 条限额预警，自动压制分条拆分。
   */
  getChannelPrompt(ctx = {}) {
    const contextToken = ctx.contextToken || null
    const currentUsage = contextToken ? (this._tokenQuotaMap.get(contextToken) || 0) : 0
    const remaining = Math.max(0, 10 - currentUsage)

    let quotaNotice = ''
    if (contextToken && remaining <= 4) {
      quotaNotice = `\n⚠️【微信 24h 通道配额紧缺预警】：当前凭证已累计回复 ${currentUsage}/10 条消息（仅剩 ${remaining} 次配额）！请严禁使用 <msg> / <break/> 切分为多条气泡！必须将你的解答、进度与结论合并在 1 条消息内一次性输出！`
    }

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
      quotaNotice,
    ].filter(Boolean).join('\n')
  }

  /**
   * 微信渠道：将 LLM 产出的文本切分为微信消息气泡。
   * 智能配额保护：当 contextToken 使用频次过高或单次分条数挤占剩余额度时，自动抑制 <msg> 拆分，强行合并为单条下发！
   */
  splitTextToSegments(text, ctx = {}) {
    const contextToken = ctx.contextToken || null
    const currentUsage = contextToken ? (this._tokenQuotaMap.get(contextToken) || 0) : 0
    const rawSegments = splitWechatText(text)

    if (rawSegments.length <= 1) return rawSegments

    // 微信限额 10 条，安全阀设为 8
    const remainingQuota = Math.max(1, 8 - currentUsage)

    if (currentUsage >= 6 || rawSegments.length > remainingQuota) {
      this.log?.warn?.(`[WechatChannel] 🛡️ 配额智能防护触发：contextToken 额度已用 ${currentUsage}/10，将 ${rawSegments.length} 段分条合并为 1 条微信气泡下发！`)
      return [rawSegments.join('\n\n')]
    }

    return rawSegments
  }

  extractText(msg) {
    return extractText(msg)
  }

  async handleIncomingMessage(msg) {
    const from = msg.from_user_id || msg.userId || msg.from
    if (from !== this.masterId) {
      this.log?.warn?.(`[WechatChannel] 拦截非绑定者消息 (from=${from}, master=${this.masterId})`)
      return
    }

    const text = extractText(msg)
    const rawImages = extractImages(msg)
    const rawFiles = extractFiles(msg)

    // 1. 初始化缓冲池
    if (!this._msgBuffer) this._msgBuffer = new Map()
    let buf = this._msgBuffer.get(from)

    const hasIncomingMedia = rawImages.length > 0 || rawFiles.length > 0
    const hasPendingMedia = buf && (buf.pendingCount > 0 || buf.images?.length > 0 || buf.files?.length > 0)

    // 2. 纯文本且完全没有挂起/缓冲的媒体任务时，零延迟立刻放行
    if (!hasIncomingMedia && !hasPendingMedia) {
      if (buf) {
        clearTimeout(buf.timer)
        this._msgBuffer.delete(from)
      }
      await super.handleIncomingMessage(msg)
      return
    }

    // 3. 有媒体或挂起任务，建立缓冲
    if (!buf) {
      buf = { timer: null, textParts: [], images: [], files: [], pendingCount: 0, contextToken: null, rawMsg: msg }
      this._msgBuffer.set(from, buf)
    }

    buf.contextToken = msg.context_token || buf.contextToken
    buf.rawMsg = msg

    // 过滤掉纯图片/纯文件占位符，保留用户真实输入的文字
    if (text && !text.startsWith('[图片]') && !text.startsWith('[文件:')) {
      buf.textParts.push(text)
    }

    // 4. 如果是图片消息，增加挂起计数，并在后台异步解密转存
    if (rawImages.length > 0) {
      buf.pendingCount += rawImages.length

      ;(async () => {
        for (const img of rawImages) {
          try {
            const buffer = await this.client.downloadAndDecryptMedia(img.full_url, img.aes_key)
            let localUrl = typeof this.bufferToImageUrl === 'function'
              ? await this.bufferToImageUrl(buffer)
              : await bufferToImageUrl('', buffer)
            
            // 转换为绝对 file:// 协议路径，方便本地工具直读
            if (localUrl && localUrl.startsWith('/f/up/')) {
              const parts = localUrl.split('/')
              const safeType = parts[3]
              const safeName = parts[4]
              const absPath = path.join(process.cwd(), 'output', 'uploaded', safeType, safeName)
              localUrl = `file://${absPath}`
            }
            buf.images.push(localUrl)
            this.log?.info?.(`[WechatChannel] 图片解密转存成功: ${localUrl}`)
          } catch (e) {
            this.log?.error?.(`[WechatChannel] 图片下载解密失败: ${e.message}`)
          } finally {
            buf.pendingCount = Math.max(0, buf.pendingCount - 1)
          }
        }
      })()
    }

    // 5. 如果是文件消息，增加挂起计数，并在后台异步解密转存到 Storage
    if (rawFiles.length > 0) {
      buf.pendingCount += rawFiles.length

      ;(async () => {
        for (const f of rawFiles) {
          try {
            const buffer = await this.client.downloadAndDecryptMedia(f.full_url, f.aes_key)
            let localUrl
            if (typeof this.uploadFile === 'function') {
              localUrl = await this.uploadFile(buffer, f.file_name)
            } else {
              const res = await storageService.upload(buffer, f.file_name, 'file', { dedup: true })
              localUrl = res.url
            }
            // 转换为绝对 file:// 协议路径
            if (localUrl && localUrl.startsWith('/f/up/')) {
              const parts = localUrl.split('/')
              const safeType = parts[3]
              const safeName = parts[4]
              const absPath = path.join(process.cwd(), 'output', 'uploaded', safeType, safeName)
              localUrl = `file://${absPath}`
            }
            if (!buf.files) buf.files = []
            buf.files.push({ name: f.file_name, url: localUrl })
            this.log?.info?.(`[WechatChannel] 文件解密转存成功: ${f.file_name} -> ${localUrl}`)
          } catch (e) {
            this.log?.error?.(`[WechatChannel] 文件下载解密失败: ${e.message}`)
          } finally {
            buf.pendingCount = Math.max(0, buf.pendingCount - 1)
          }
        }
      })()
    }

    // 6. 触发/重置 1.2 秒防抖定时器
    if (buf.timer) clearTimeout(buf.timer)

    const triggerDebouncedMessage = async () => {
      // 检查当前是否还有正在后台解密的媒体
      if (buf.pendingCount > 0) {
        buf.timer = setTimeout(triggerDebouncedMessage, 300)
        return
      }

      this._msgBuffer.delete(from)

      const combinedTextParts = []
      const userText = buf.textParts.join('\n').trim()
      if (userText) combinedTextParts.push(userText)

      if (Array.isArray(buf.files) && buf.files.length > 0) {
        const fileLinks = buf.files.map(f => `[文件: ${f.name}](${f.url})`).join('\n')
        combinedTextParts.push(`\n以下是用户上传的文件：\n${fileLinks}`)
      }

      if (Array.isArray(buf.images) && buf.images.length > 0) {
        const imgLinks = buf.images.join('\n')
        combinedTextParts.push(`\n以下是用户所上传的图片链接：\n${imgLinks}`)
      }

      let finalAddressableText = combinedTextParts.join('\n\n').trim()
      if (!finalAddressableText && (buf.images?.length > 0 || buf.files?.length > 0)) {
        const parts = []
        if (buf.images?.length > 0) {
          parts.push(`[图片]\n\n以下是用户所上传的图片链接：\n${buf.images.join('\n')}`)
        }
        if (buf.files?.length > 0) {
          const fileLinks = buf.files.map(f => `[文件: ${f.name}](${f.url})`).join('\n')
          parts.push(`[文件]\n\n以下是用户上传的文件：\n${fileLinks}`)
        }
        finalAddressableText = parts.join('\n\n')
      }

      if (!finalAddressableText) return

      const mergedMsg = {
        ...buf.rawMsg,
        context_token: buf.contextToken,
        images: buf.images.length > 0 ? buf.images : undefined,
        files: buf.files?.length > 0 ? buf.files : undefined,
        item_list: [
          {
            type: 1,
            text: finalAddressableText,
            text_item: { text: finalAddressableText }
          }
        ]
      }

      this.log?.info?.(`[WechatChannel] ⚡ 微信消息防抖合并完成: 合并文本行数=${buf.textParts.length}, 图片数=${buf.images.length}, 文件数=${buf.files?.length || 0}`)
      await super.handleIncomingMessage(mergedMsg)
    }

    buf.timer = setTimeout(triggerDebouncedMessage, 1200)
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
    if (payload?.context_token) {
      this._recordTokenUsage(payload.context_token)
    }
    return this.client.sendMessage(payload)
  }

  /**
   * 微信原生图片发送实现：
   * 1. 加载图片数据（Buffer / 本地文件路径 / HTTP URL）
   * 2. 通过 client.uploadMedia 进行 AES-128-CBC 加密并直传腾讯 CDN
   * 3. 构造 type: 2 (IMAGE) 的 WeixinMessage 发送
   */
  async doSendImage({ to, contextToken, buffer, url }) {
    if (contextToken) {
      this._recordTokenUsage(contextToken)
    }
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