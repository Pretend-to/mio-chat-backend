/**
 * WechatChannel — 微信 iLink 渠道专属适配器
 *
 * 继承自 BaseChannel 统一基类，专注于处理微信 iLink 协议特异性：
 *   - 微信长轮询 getUpdates 循环与心跳重试
 *   - 微信专有 WeixinMessage 消息解析 (extractText) 与消息构建 (buildSendMsg)
 *   - 微信官方多模态 CDN 加密直传 (doSendImage, doSendVoice Silk 转码, doSendFile, doSendVideo)
 *   - 微信 24h ContextToken 额度防护与智能紧凑合并 (splitTextToSegments)
 *   - 微信 Typing 状态票据交互 (doSendTyping)
 */

import { sleep } from '../memory/sleep.js'
import { BaseChannel } from '../common/BaseChannel.js'
import { MediaResolver } from '../common/MediaResolver.js'
import { convertAudioToSilk } from '../utils/audioHelper.js'
import {
  extractText,
  buildSendMsg,
  buildSendImageMsg,
  buildSendVoiceMsg,
  buildSendFileMsg,
  buildSendVideoMsg,
  splitWechatText,
  extractImages,
  extractFiles,
} from './msgHelper.js'
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

  // ===============================================================
  // Token 配额监控与智能分条合并
  // ===============================================================
  _recordTokenUsage(contextToken) {
    if (!contextToken) return
    const current = this._tokenQuotaMap.get(contextToken) || 0
    this._tokenQuotaMap.set(contextToken, current + 1)
  }

  _getTokenUsageCount(contextToken) {
    if (!contextToken) return 0
    return this._tokenQuotaMap.get(contextToken) || 0
  }

  /**
   * 微信协议文本切分：
   * 1. 正常情况下解析 <msg>...</msg> / <break/> 切为多条气泡；
   * 2. 当检测到该 contextToken 额度即将耗尽（已用 >= 7 条）时，智能紧凑化合并为 1 条微信气泡下发。
   */
  splitTextToSegments(text, ctx = {}) {
    const rawSegments = splitWechatText(text)
    if (rawSegments.length <= 1) return rawSegments

    const token = ctx.contextToken || this.latestContextToken
    const usedCount = this._getTokenUsageCount(token)
    const MAX_SAFE_QUOTA = 7 // 微信单 Token 上限 10 条，阈值设为 7

    if (usedCount >= MAX_SAFE_QUOTA) {
      this.log?.warn?.(`[WechatChannel] 🛡️ 配额智能防护触发：contextToken 额度已用 ${usedCount}/10，将 ${rawSegments.length} 段分条合并为 1 条微信气泡下发！`)
      return [rawSegments.join('\n\n')]
    }

    return rawSegments
  }

  // ===============================================================
  // 微信长轮询主循环与入站消息处理
  // ===============================================================
  async _loop() {
    this.log?.info?.(`[WechatChannel] 微信长轮询已启动，监听来自 masterId=${this.masterId} 的消息`)
    while (this.running) {
      try {
        // 注意：IlinkClient.getUpdates 签名为 (buff, { timeoutMs, signal })，
        // 第一参数是字符串游标，不可传对象，否则 get_updates_buf 非法导致服务端 ret=-12
        const res = await this.client.getUpdates(this._buf, {
          signal: this._abort?.signal,
          timeoutMs: LONG_POLL_MS,
        })
        if (!this.running) break

        // iLink 空轮询超时响应可能不带 ret 字段（如空 body → {}），缺省视为成功；
        // 旧版 _loop 从不检查 ret，仅此处的 -14/-12 等显式错误码需要处理
        const ret = res?.ret ?? 0
        if (ret === 0) {
          this.connected = true
          this.lastPollSuccess = Date.now()
          this.lastError = null
          if (res.get_updates_buf != null) {
            this._buf = res.get_updates_buf
          }
          const msgs = res.msgs || []
          for (const msg of msgs) {
            this.lastActive = Date.now()
            this.onActivity?.()
            this.handleIncomingMessage(msg).catch((err) => {
              this.log?.error?.('[WechatChannel] 处理入站消息异常:', err)
            })
          }
        } else if (ret === -14) {
          this.connected = false
          this.lastError = '微信会话已过期 (ret=-14)，需要重新扫码'
          this.log?.error?.('[WechatChannel] 微信会话已过期 (ret=-14)，需要重新扫码')
          this.stop()
          break
        } else {
          this.connected = false
          this.lastError = `微信接口返回异常 (ret=${ret})`
          this.log?.warn?.(`[WechatChannel] getUpdates 返回异常: ret=${ret}`)
          await sleep(RETRY_DELAY_MS)
        }
      } catch (err) {
        if (!this.running) break
        if (err?.name === 'TimeoutError' || err?.message?.includes('timeout') || err?.code === 20 || err?.name === 'AbortError') {
          if (err?.name !== 'AbortError') {
            this.connected = true
            this.lastPollSuccess = Date.now()
          }
          continue
        }
        this.connected = false
        this.lastError = err?.message || '轮询网络异常'
        this.log?.error?.('[WechatChannel] 轮询异常:', err?.message)
        await sleep(RETRY_DELAY_MS)
      }
    }
    this.connected = false
  }

  async handleIncomingMessage(msg) {
    if (!msg) return
    const from = msg.from_user_id || msg.userId || msg.from
    if (from !== this.masterId) {
      return
    }

    const text = extractText(msg)
    const contextToken = msg.context_token || null
    if (contextToken) {
      this.latestContextToken = contextToken
      if (this.memory) {
        this.memory.setAgentMeta('latestContextToken', contextToken).catch(() => {})
      }
    }
    await this.keepAlive.recordActivity(contextToken || this.latestContextToken || null)

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
      const ctx = {
        contextToken,
        files: [],
        from,
        images: [],
        rawMsg: msg,
        sid: await this.memory.getActiveSession(),
        text,
      }
      return this._route(text, ctx)
    }

    // 3. 有媒体或挂起任务，建立缓冲
    if (!buf) {
      buf = { contextToken: null, files: [], images: [], pendingCount: 0, rawMsg: msg, textParts: [], timer: null }
      this._msgBuffer.set(from, buf)
    }

    buf.contextToken = contextToken || buf.contextToken
    buf.rawMsg = msg

    // 过滤掉纯图片/纯文件占位符，保留用户真实输入的文字
    if (text && !text.startsWith('[图片]') && !text.startsWith('[文件:')) {
      buf.textParts.push(text)
    }

    // 4. 图片解密与转存
    if (rawImages.length > 0) {
      buf.pendingCount += rawImages.length
      ;(async () => {
        for (const img of rawImages) {
          try {
            const downloadFn = this.client.downloadAndDecryptMedia || this.client.downloadMedia
            const buffer = typeof downloadFn === 'function' ? await downloadFn.call(this.client, img.full_url, img.aes_key) : null
            let localUrl = null
            if (typeof this.bufferToImageUrl === 'function') {
              localUrl = await this.bufferToImageUrl(buffer)
            } else if (buffer) {
              localUrl = await bufferToImageUrl(this.baseUrl || '', buffer)
            }
            if (localUrl) {
              buf.images.push(localUrl)
            }
          } catch (e) {
            this.log?.warn?.(`[WechatChannel] 图片下载解密失败: ${e.message}`)
          } finally {
            buf.pendingCount = Math.max(0, buf.pendingCount - 1)
          }
        }
      })().catch((e) => {
        this.log?.error?.(`[WechatChannel] 图片处理异常: ${e.message}`)
      })
    }

    // 5. 文件解密与转存
    if (rawFiles.length > 0) {
      buf.pendingCount += rawFiles.length
      ;(async () => {
        for (const f of rawFiles) {
          try {
            const downloadFn = this.client.downloadAndDecryptMedia || this.client.downloadMedia
            const buffer = typeof downloadFn === 'function' ? await downloadFn.call(this.client, f.full_url, f.aes_key) : null
            let fileUrl = null
            if (typeof this.uploadFile === 'function') {
              fileUrl = await this.uploadFile(buffer, f.file_name)
            } else if (buffer) {
              const stored = await storageService.upload(buffer, f.file_name, 'file', { contentType: 'application/octet-stream' })
              fileUrl = stored?.url
            }
            if (fileUrl) {
              buf.files.push({ name: f.file_name, url: fileUrl })
            }
          } catch (e) {
            this.log?.warn?.(`[WechatChannel] 文件下载解密失败: ${e.message}`)
          } finally {
            buf.pendingCount = Math.max(0, buf.pendingCount - 1)
          }
        }
      })().catch((e) => {
        this.log?.error?.(`[WechatChannel] 文件处理异常: ${e.message}`)
      })
    }

    // 6. 防抖触发
    clearTimeout(buf.timer)
    const triggerDebouncedMessage = async () => {
      let waitTimes = 0
      while (buf.pendingCount > 0 && waitTimes < 30) {
        await sleep(100)
        waitTimes++
      }

      this._msgBuffer.delete(from)

      let mergedText = buf.textParts.join('\n').trim()
      if (buf.files.length > 0) {
        const fileLinks = buf.files.map((f) => `[文件: ${f.name}](${f.url})`).join('\n')
        mergedText = mergedText ? `${mergedText}\n${fileLinks}` : fileLinks
      }

      const ctx = {
        contextToken: buf.contextToken,
        files: buf.files,
        from,
        images: buf.images,
        rawMsg: buf.rawMsg,
        sid: await this.memory.getActiveSession(),
        text: mergedText,
      }

      return this._route(mergedText, ctx)
    }

    buf.timer = setTimeout(triggerDebouncedMessage, 1200)
  }

  // ===============================================================
  // 微信专用消息构建与发送
  // ===============================================================
  extractText(msg) {
    return extractText(msg)
  }

  buildSendMsg({ to, text, contextToken, fromBot }) {
    return buildSendMsg({
      contextToken,
      fromBot: fromBot || this.client.botId,
      text,
      to,
    })
  }

  async doSendMessage(payload) {
    if (payload?.context_token) {
      this._recordTokenUsage(payload.context_token)
    }
    return this.client.sendMessage(payload)
  }

  /**
   * 微信原生图片发送实现 (IMAGE=1)
   */
  async doSendImage({ to, contextToken, buffer, url, localPath }) {
    if (contextToken) {
      this._recordTokenUsage(contextToken)
    }
    const imgBuffer = await MediaResolver.resolveBuffer({ buffer, localPath, url })
    if (!imgBuffer || imgBuffer.length === 0) {
      throw new Error(`无法获取有效的图片二进制数据 (url=${url}, localPath=${localPath})`)
    }

    const mediaInfo = await this.client.uploadMedia(imgBuffer, { mediaType: 1, toUserId: to })
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

  /**
   * 微信原生语音发送实现 (VOICE=4，自动转码为 Silk v3 格式)
   * ⚠️ 2026-08-28 实测禁用：sendmessage 成功返回 message_id，但微信客户端无法渲染该语音气泡。
   * 现直接抛错走 BaseChannel 的 catch 分支，降级为「音频链接」文本通知。恢复原生直传时解开下方注释即可。
   */
  async doSendVoice({ to, contextToken, buffer, url, localPath, text = '', durationMs = 0 }) {
    throw new Error('微信客户端暂无法渲染原生语音消息，降级为链接发送')
    /*
    if (contextToken) {
      this._recordTokenUsage(contextToken)
    }
    const rawAudioBuffer = await MediaResolver.resolveBuffer({ buffer, localPath, url })
    if (!rawAudioBuffer || rawAudioBuffer.length === 0) {
      throw new Error(`无法获取有效的音频二进制数据 (url=${url}, localPath=${localPath})`)
    }

    const { silkBuffer, durationMs: calculatedDuration } = await convertAudioToSilk(rawAudioBuffer)
    const mediaInfo = await this.client.uploadMedia(silkBuffer, { mediaType: 4, toUserId: to })
    const voiceMsg = buildSendVoiceMsg({
      contextToken,
      durationMs: durationMs || calculatedDuration,
      fromBot: this.client.botId,
      mediaInfo,
      text,
      to,
    })

    const sendRes = await this.client.sendMessage(voiceMsg)
    this.log?.info?.(`[WechatChannel] 📤 原生语音消息发送结果 (长度: ${durationMs || calculatedDuration}ms): ${JSON.stringify(sendRes)}`)
    return sendRes
    */
  }

  /**
   * 微信原生文件发送实现 (FILE=3)
   */
  async doSendFile({ to, contextToken, buffer, url, localPath, fileName }) {
    if (contextToken) {
      this._recordTokenUsage(contextToken)
    }
    const fileBuffer = await MediaResolver.resolveBuffer({ buffer, localPath, url })
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error(`无法获取有效的文件二进制数据 (url=${url}, localPath=${localPath})`)
    }

    const finalFileName = fileName || (localPath ? localPath.split('/').pop() : (url ? url.split('/').pop() : 'file'))
    const mediaInfo = await this.client.uploadMedia(fileBuffer, { mediaType: 3, toUserId: to })
    const fileMsg = buildSendFileMsg({
      contextToken,
      fileName: finalFileName,
      fromBot: this.client.botId,
      mediaInfo,
      to,
    })

    const sendRes = await this.client.sendMessage(fileMsg)
    this.log?.info?.(`[WechatChannel] 📤 原生文件消息发送结果 (${finalFileName}): ${JSON.stringify(sendRes)}`)
    return sendRes
  }

  /**
   * 微信原生视频发送实现 (VIDEO=2)
   */
  async doSendVideo({ to, contextToken, buffer, url, localPath, durationMs = 0 }) {
    if (contextToken) {
      this._recordTokenUsage(contextToken)
    }
    const videoBuffer = await MediaResolver.resolveBuffer({ buffer, localPath, url })
    if (!videoBuffer || videoBuffer.length === 0) {
      throw new Error(`无法获取有效的视频二进制数据 (url=${url}, localPath=${localPath})`)
    }

    const mediaInfo = await this.client.uploadMedia(videoBuffer, { mediaType: 2, toUserId: to })
    const videoMsg = buildSendVideoMsg({
      contextToken,
      durationMs,
      fromBot: this.client.botId,
      mediaInfo,
      to,
    })

    const sendRes = await this.client.sendMessage(videoMsg)
    this.log?.info?.(`[WechatChannel] 📤 原生视频消息发送结果: ${JSON.stringify(sendRes)}`)
    return sendRes
  }

  // ===============================================================
  // Typing 状态交互
  // ===============================================================
  async doSendTyping(ctx, status) {
    if (!this.typing) return
    try {
      const ticket = await this._getTypingTicket(ctx.from, ctx.contextToken)
      if (!ticket) return
      await this.client.sendTyping({ ilinkUserId: ctx.from, status, typingTicket: ticket })
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
}

export default WechatChannel