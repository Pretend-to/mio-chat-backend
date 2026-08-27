/**
 * 微信消息助手函数（序列化、反序列化、消息包装）
 */

/** 从 WeixinMessage 提取文本（item_list 中 text_item.text 或 direct text） */
export function extractText(msg) {
  const items = msg?.item_list || []
  for (const it of items) {
    // 微信官方真实 iLink 结构：item.text_item.text
    if (it.text_item?.text != null) return it.text_item.text
    if (it.type === 1 || it.type === 'text') return it.text ?? it.content ?? ''
    if (it.text != null) return it.text
  }
  return ''
}

/**
 * 构造下行文本 WeixinMessage（发给用户，带回 context_token，message_type=2 bot）。
 */
export function buildSendMsg({ to, fromBot, contextToken, text }) {
  const now = Date.now()
  const randomSuffix = Math.random().toString(36).slice(2, 10)
  return {
    client_id: `bot_msg_${now}_${randomSuffix}`,
    context_token: contextToken,
    create_time_ms: now,
    from_user_id: fromBot,
    message_state: 2, // FINISH
    message_type: 2, // BOT
    item_list: [
      {
        type: 1, // TEXT
        text,
        text_item: { text },
      },
    ],
    to_user_id: to,
  }
}

/**
 * 构造下行原生图片 WeixinMessage。
 * @param {object} params
 * @param {string} params.to
 * @param {string} params.fromBot
 * @param {string} params.contextToken
 * @param {object} params.mediaInfo uploadMedia 返回的 CDN 对象
 */
export function buildSendImageMsg({ to, fromBot, contextToken, mediaInfo }) {
  const now = Date.now()
  const randomSuffix = Math.random().toString(36).slice(2, 10)
  const mediaObj = {
    aes_key: mediaInfo.aes_key,
    encrypt_query_param: mediaInfo.encrypt_query_param || '',
    encrypt_type: mediaInfo.encrypt_type || 1,
  }

  return {
    client_id: `bot_img_${now}_${randomSuffix}`,
    context_token: contextToken,
    create_time_ms: now,
    from_user_id: fromBot,
    message_state: 2, // FINISH
    message_type: 2, // BOT
    item_list: [
      {
        type: 2, // IMAGE
        image_item: {
          media: mediaObj,
          mid_size: mediaInfo.file_size_ciphertext || mediaInfo.raw_size || 0,
          hd_size: mediaInfo.file_size_ciphertext || mediaInfo.raw_size || 0,
        },
      },
    ],
    to_user_id: to,
  }
}
/**
 * 微信渠道协议文本切分：将 LLM 产出的完整文本切为多条独立微信消息。
 * 规则：
 *   - `<msg>...</msg>`：每条为一条独立气泡（标签内内容取 trim）
 *   - `<break/>` / `<break></break>` / `<break>`：消息间分隔符
 *   - 标签外的裸文本：按上述分隔符拆分，各自成一条
 * 返回去空白的字符串数组（保持原始顺序）。
 */
export function splitWechatText(text) {
  const t = (text || '').trim()
  if (!t) return []

  // 第一步：按完整 <msg>...</msg> 单元切分，保留 msg 单元与 msg 外裸文本单元
  const units = []
  const msgRe = /<msg>([\s\S]*?)<\/msg>/g
  let last = 0
  let m
  while ((m = msgRe.exec(t)) !== null) {
    if (m.index > last) units.push({ kind: 'raw', content: t.slice(last, m.index) })
    units.push({ kind: 'msg', content: m[1].trim() })
    last = msgRe.lastIndex
  }
  if (last < t.length) units.push({ kind: 'raw', content: t.slice(last) })
  if (units.length === 0) units.push({ kind: 'raw', content: t })

  // 第二步：每个单元各自产出最终段
  const segments = []
  for (const u of units) {
    if (u.kind === 'msg') {
      if (u.content) segments.push(u.content)
    } else {
      // 清理可能残留的半截 <msg>/</msg> 标签后，再按 <break> 拆分
      const clean = u.content.replace(/<\/?msg>/g, '')
      for (const p of clean.split(/<break\s*\/?>|<\/break>/i)) {
        const seg = p.trim()
        if (seg) segments.push(seg)
      }
    }
  }
  return segments
}