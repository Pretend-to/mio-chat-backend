import {
  r as e,
  c as t,
  a as s,
  n as a,
  o as i,
  M as o,
  b as n,
  F as l,
  d as r,
  t as c,
  e as d,
  f as h,
  g as m,
  w as g,
  v as u,
  h as p,
  i as f,
  j as y,
  k as v,
  l as C,
  T as w,
} from './vue-vendor-DVmbRZJS.js'
import { l as S, a as b, W as L } from './vendor-C0p4anTM.js'
class M {
  constructor() {
    this.events = {}
  }
  on(e, t, s = !0) {
    ;(s && this.off(e),
      this.events[e] || (this.events[e] = []),
      this.events[e].push(t))
  }
  emit(e, t) {
    this.events[e] &&
      this.events[e].forEach((e) => {
        e(t)
      })
  }
  off(e) {
    this.events[e] && delete this.events[e]
  }
}
function x(e) {
  let t = ''
  const s = '0123456789'
  for (let a = 0; a < e; a++) t += s.charAt(Math.floor(10 * Math.random()))
  return t
}
function k(e) {
  let t = ''
  const s = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let a = 0; a < e; a++) t += s.charAt(Math.floor(62 * Math.random()))
  return t
}
class _ extends M {
  constructor(e, t) {
    ;(super(),
      (this.available = null),
      (this.url = this.getURL()),
      (this.socket = null),
      (this.code = t),
      (this.id = e),
      (this.requests = []),
      (this.pendingRequests = new Set()))
  }
  getURL() {
    return new URL(window.location.href).host
  }
  initEventListeners() {
    this.socket &&
      (this.socket.off('connect'),
      this.socket.off('disconnect'),
      this.socket.off('connect_error'),
      this.socket.off('message'),
      this.socket.on('connect', () => this.handleConnect()),
      this.socket.on('disconnect', (e) => this.handleDisconnect(e)),
      this.socket.on('connect_error', (e) => this.handleConnectError(e)),
      this.socket.on('message', (e) => this.messageHandler(e)))
  }
  handleConnect() {
    ;((this.available = !0),
      (this.hasAttemptedPollingFallback = !1),
      (this.isAttemptingWebSocket = !1))
    this.socket.io
  }
  handleDisconnect(e) {
    this.available = !1
  }
  handleConnectError(e) {
    ;(this.emit('connect_error', e),
      this.isAttemptingWebSocket && !this.hasAttemptedPollingFallback
        ? ((this.hasAttemptedPollingFallback = !0),
          (this.isAttemptingWebSocket = !1),
          this.socket && (this.socket.disconnect(), (this.socket = null)),
          setTimeout(() => {
            this._connectWithTransport(['polling'])
          }, 500))
        : (this.isAttemptingWebSocket, (this.available = !1)))
  }
  _connectWithTransport(e) {
    ;(this.socket && this.socket.disconnect(),
      (this.socket = S(this.url, {
        path: '/socket.io',
        transports: e,
        auth: { id: this.id, token: this.code },
        reconnection: !0,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2e3,
        reconnectionDelayMax: 1e4,
        timeout: 15e3,
        forceNew: !0,
      })),
      this.initEventListeners())
  }
  async connect() {
    ;(this.socket && this.socket.connected) ||
      ((this.isAttemptingWebSocket = !0),
      (this.hasAttemptedPollingFallback = !1),
      this._connectWithTransport(['websocket']))
  }
  disconnect() {
    this.socket && (this.socket.disconnect(), (this.available = !1))
  }
  messageHandler(e) {
    try {
      const t = JSON.parse(e)
      ;('llm' === t.protocol &&
        (this.emit(t.request_id, t), this.emit('llm_message', t)),
        'onebot' === t.protocol
          ? this.emit('onebot_message', t)
          : 'system' === t.protocol &&
            ('login' === t.type && this.emit('connect', t.data),
            this.emit('system_message', t)),
        this.emit(t.request_id, t),
        this.pendingRequests.delete(t.request_id))
    } catch (t) {}
  }
  sendMessage(e) {
    if (!this.socket || !this.socket.connected)
      return (
        this.pendingRequests.delete(e.request_id),
        Promise.reject(new Error('Socket not connected'))
      )
    if (this.pendingRequests.has(e.request_id))
      return Promise.reject(new Error(`Duplicate request_id: ${e.request_id}`))
    this.pendingRequests.add(e.request_id)
    try {
      return (this.socket.emit('message', JSON.stringify(e)), Promise.resolve())
    } catch (t) {
      return (this.pendingRequests.delete(e.request_id), Promise.reject(t))
    }
  }
  fetch(e, t) {
    return new Promise((s, a) => {
      const i = e.split('/').filter(Boolean),
        o = {
          request_id: k(16),
          protocol: i[1],
          type: i[2],
          id: i[3],
          data: t,
          metaData: { contactorId: this.id },
        },
        n = new Promise((e, t) => {
          setTimeout(() => {
            ;(this.pendingRequests.delete(o.request_id), t('timeout'))
          }, 6e4)
        }),
        l = new Promise((e) => {
          this.on(o.request_id, (t) => {
            ;(this.pendingRequests.delete(o.request_id), e(t.data))
          })
        })
      ;(Promise.race([n, l])
        .then(s)
        .catch(a)
        .finally(() => {
          this.off(o.request_id)
        }),
        this.sendMessage(o))
    })
  }
  streamCompletions(e, t) {
    const s = {
      request_id: k(16),
      protocol: 'llm',
      type: 'completions',
      data: e,
      metaData: t,
    }
    this.sendMessage(s)
  }
}
class T extends M {
  constructor() {
    super()
  }
  async fetch(e, t) {
    return await V.socket.fetch(e, t)
  }
}
class P extends T {
  constructor() {
    super()
  }
  convertMessage(e) {
    e.message.forEach((t, s) => {
      if ('image' === t.type) {
        const a = t.data.file.replace(/^base64:\/\//, 'data:image/jpeg;base64,')
        e.message[s].data.file = a
      } else
        'nodes' === t.type &&
          t.data.messages.forEach((e) => {
            if ('image' === e.type) {
              const t = e.data.file.replace(
                /^base64:\/\//,
                'data:image/jpeg;base64,',
              )
              e.data.file = t
            }
          })
    })
    const t = e.message.filter((e) => 'reply' === e.type),
      s = e.message.filter((e) => 'reply' !== e.type)
    t.length > 0 && s.push(t[0])
    return {
      role: 'other',
      time: new Date().getTime(),
      content: s,
      id: e.message_id,
      status: 'completed',
    }
  }
  async send(e, t) {
    return (await this.fetch(`/api/onebot/message/${e}`, t)).message_id
  }
}
class I extends T {
  constructor(e) {
    ;(super(), (this.id = e.id))
  }
  convertMessage(e) {
    return {
      ...{
        role: 'other',
        time: new Date().getTime(),
        content: [{ type: 'blank', data: {} }],
        status: 'pending',
        id: x(16),
      },
      ...e,
    }
  }
  async getMessagesSummary(e) {
    const t = `请你根据以下对话的内容\n${JSON.stringify(e)}\n，总结出一个简短的对话主题,你的回答必须只包含对话主题，不要包含任何其他内容，包括句号。`,
      s = q.getLLMDefaultConfig()
    s.base.stream = !1
    const a = { settings: s, messages: [{ role: 'user', content: t }] },
      i = await this.fetch('/api/llm/completions', a),
      { content: o } = i
    return o || '未命名会话'
  }
  handleMessageEvent(e) {
    const t = e.data,
      s = t.metaData.messageId
    delete t.metaData
    const a = (e, t) => {
      this.emit(e, { ...t, messageId: s })
    }
    if ('update' === e.message) {
      const t = {
          reasoningContent: (e) =>
            a('updateReasoning', { reasoning_content: e }),
          content: (e) => a('updateMessage', { chunk: e }),
          toolCall: (e) => a('updateToolCall', { tool_call: e }),
        },
        s = e.data,
        i = t[s.type]
      i && i(s.content)
    } else if (['complete', 'failed'].includes(e.message)) {
      const t = {
        complete: () => a('completeMessage', {}),
        failed: () => a('failedMessage', { error: e.data }),
      }[e.message]
      t && t()
    }
  }
  async send(e, t, s) {
    s = q.getVerifiedLLMConfig(s)
    const a = { contactorId: this.id, messageId: t },
      i = { settings: s, messages: e }
    if (!V.socket) throw new Error('WebSocket connection not established.')
    V.socket.streamCompletions(i, a)
  }
}
const O =
    'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons',
  E = {
    OpenAI: 'openai.svg',
    Cohere: 'cohere-color.svg',
    Anthropic: 'claude-color.svg',
    Google: 'gemini-color.svg',
    'X.AI': 'grok.svg',
    DeepSeek: 'deepseek-color.svg',
    智谱清言: 'zhipu-color.svg',
    豆包: 'doubao-color.svg',
    '月之暗面 (kimi)': 'moonshot.svg',
    科大讯飞: 'spark-color.svg',
    通义千问: 'qwen-color.svg',
    腾讯混元: 'hunyuan-color.svg',
  },
  A = ['MODEL', 'CUSTOM'],
  D = ['MODEL', 'CUSTOM', 'SUMMARY']
class $ extends M {
  constructor(e, t) {
    ;(super(),
      (this.platform = e),
      (this.id = t.id),
      (this.namePolicy = t.namePolicy || 0),
      (this.avatarPolicy = t.avatarPolicy || 0),
      (this.title = t.title),
      (this.name = t.name),
      (this.avatar = t.avatar),
      (this.priority = t.priority),
      (this.firstMessageIndex = t.firstMessageIndex || 0),
      (this.messageChain = t.messageChain || []),
      (this.active = !1),
      (this.lastUpdate = t.lastUpdate || Date.now()),
      (this.createTime = t.createTime || Date.now()),
      (this.lastMessageSummary = this.getLastMessageSummary()),
      (this.options = this.loadOptions(t.options)),
      (this.kernel = 'onebot' === e ? new P(t) : new I(t)),
      'openai' === e && this.enableOpenaiListener())
  }
  toJSON() {
    return {
      platform: this.platform,
      id: this.id,
      options: this.options,
      namePolicy: this.namePolicy,
      avatarPolicy: this.avatarPolicy,
      title: this.title,
      name: this.name,
      avatar: this.avatar,
      priority: this.priority,
      messageChain: this.messageChain,
      active: this.active,
      lastUpdate: this.lastUpdate,
      createTime: this.createTime,
      lastMessageSummary: this.lastMessageSummary,
      firstMessageIndex: this.firstMessageIndex,
    }
  }
  enableOpenaiListener() {
    ;(this.kernel.on('updateReasoning', (e) => {
      const { reasoning_content: t, messageId: s } = e,
        a = this.getMessageById(s)
      if (!a) return
      const i = a.content.findIndex((e) => 'reason' === e.type),
        o = {
          type: 'reason',
          data: { text: t, startTime: new Date().getTime(), endTime: 0 },
        }
      ;(-1 !== i
        ? ((o.data.text = a.content[i].data.text + t),
          (o.data.startTime = a.content[i].data.startTime),
          (a.content[i] = o))
        : 'blank' === a.content[0].type
          ? (a.content[0] = o)
          : a.content.push(o),
        this.emit('updateMessage'),
        this.emit('updateMessageSummary'))
    }),
      this.kernel.on('updateMessage', (e) => {
        const { chunk: t, messageId: s } = e,
          a = this.getMessageById(s)
        if (!a) return
        a.content.forEach((e) => {
          'reason' != e.type ||
            e.data.endTime ||
            (e.data.endTime = new Date().getTime())
        })
        const i = a.content[a.content.length - 1],
          o = ['blank', 'text'].includes(i.type),
          n = {
            type: 'text',
            data: { text: ('text' == i.type ? i.data.text : '').concat(t) },
          }
        ;(o ? (a.content[a.content.length - 1] = n) : a.content.push(n),
          this.emit('updateMessage'),
          this.emit('updateMessageSummary'))
      }),
      this.kernel.on('updateToolCall', (e) => {
        const { tool_call: t, messageId: s } = e,
          a = this.getMessageById(s)
        if (!a) return
        const i = a.content[a.content.length - 1],
          o = { type: 'tool_call', data: t }
        if ('blank' == i.type) a.content[0] = o
        else {
          const e = a.content.find((e) => e.data.id == t.id)
          if (e) {
            const s = JSON.parse(JSON.stringify(e))
            ;((s.data.action = t.action),
              (s.data.result = t.result),
              'pending' == t.action && (s.data.parameters += t.parameters))
            const i = a.content.indexOf(e)
            a.content[i] = s
          } else a.content.push(o)
        }
        ;(this.emit('updateMessage'), this.emit('updateMessageSummary'))
      }),
      this.kernel.on('completeMessage', (e) => {
        this.updateLastUpdate()
        const t = e.messageId,
          s = this.getMessageById(t)
        s &&
          ((s.status = 'completed'),
          this.emit('updateMessageSummary'),
          this.emit('completeMessage', { messageId: t }))
      }),
      this.kernel.on('failedMessage', (e) => {
        if ('string' == typeof e.error)
          try {
            e.error.message = JSON.parse(e.error.message)
          } catch (i) {}
        const t = JSON.stringify(e.error, null, 2)
        this.updateLastUpdate()
        const s = e.messageId,
          a = this.getMessageById(s)
        if (a) {
          const e = {
            type: 'text',
            data: { text: 'Error : LLM 响应失败！\n```json\n ' + t + '\n```' },
          }
          ;(a.content.some((e) => 'blank' === e.type)
            ? (a.content[0] = e)
            : a.content.push(e),
            (a.status = 'completed'),
            this.emit('updateMessageSummary'),
            this.emit('completeMessage', { messageId: s }))
        }
      }))
  }
  handleLLMMessageEvent(e) {
    this.kernel.handleMessageEvent(e)
  }
  loadOptions(e) {
    return 'openai' === this.platform ? q.getVerifiedLLMConfig(e) : e || {}
  }
  async send(e) {
    await this.kernel.send(e)
  }
  _getFilePrompt(e) {
    return '以下是用户上传的文件：\n' + e.join('\n')
  }
  _getValidOpenaiMessage(
    e = this.firstMessageIndex,
    t = this.messageChain.length,
    s = this.options.max_messages_num,
  ) {
    const a = this.messageChain
      .slice(e, t)
      .slice(-s)
      .filter((e) => 'mio_system' != e.role)
      .map((e) => {
        const t = [],
          s = []
        if (
          (e.content.forEach((a) => {
            const i =
                'tool_call' == a.type
                  ? 'tool'
                  : 'user' == e.role
                    ? 'user'
                    : 'assistant',
              o = { role: i, content: 'none', _content_type: void 0 }
            'tool' == i
              ? ((o.role = 'assistant'),
                (o.content = null),
                (o.tool_calls = [
                  {
                    id: a.data.id,
                    function: {
                      name: a.data.name,
                      arguments: a.data.parameters,
                    },
                    type: 'function',
                  },
                ]),
                s.push({ ...o }),
                delete o.tool_calls,
                (o.role = 'tool'),
                (o.content = JSON.stringify(a.data.result)),
                (o.tool_call_id = a.data.id),
                (o.name = a.data.name),
                s.push({ ...o }),
                (o.role = i))
              : ('user' != i && 'assistant' != i) ||
                ('image' == a.type
                  ? ((o.content = a.data.file),
                    (o._content_type = 'image'),
                    s.push(o))
                  : 'text' == a.type
                    ? ((o.content = a.data.text),
                      (o._content_type = 'text'),
                      s.push(o))
                    : 'file' == a.type && t.push(a.data.file))
          }),
          t.length > 0)
        ) {
          0 == s.filter((e) => 'text' == e._content_type).length &&
            s.push({
              role: 'user',
              content: this._getFilePrompt(t),
              _content_type: 'text',
            })
        }
        return s
      })
    let i = []
    a.forEach((e) => {
      const t = e.filter((e) => 'text' == e._content_type),
        s = e.filter((e) => 'image' == e._content_type),
        a = e.filter((e) => 'file' == e._content_type),
        o = a.length > 0 ? this._getFilePrompt(a) : ''
      let n = null
      ;(t.length > 0 &&
        s.length > 0 &&
        'user' == s[0].role &&
        (n = {
          role: 'user',
          content: [
            ...s.map((e) => ({
              type: 'image_url',
              image_url: { url: e.content },
            })),
            ...t.map((e) => ({ type: 'text', text: e.content + o })),
          ],
        }),
        n?.content.length == e.length
          ? i.push(n)
          : (e.forEach((e) => {
              delete e._content_type
            }),
            i.push(...e)))
    })
    const o = this.options.presetSettings.history
    return (o && (i = o.concat(i)), i)
  }
  updateMessageSummary() {
    this.lastMessageSummary = this.getLastMessageSummary()
  }
  getBaseUserContainer() {
    return {
      role: 'user',
      time: new Date().getTime(),
      status: 'completed',
      id: x(16),
      content: [],
    }
  }
  async webSend(e, t = !0) {
    if (
      (this.updateLastUpdate(),
      this.messageChain.push(e),
      this.updateMessageSummary(),
      t)
    )
      try {
        if ('onebot' == this.platform) {
          return await this.kernel.send(this.id, e.content)
        }
        {
          const e = this._getValidOpenaiMessage(),
            t = x(16)
          return (
            await this.kernel.send(e, t, this.options),
            this.revMessage({ id: t }),
            x(16)
          )
        }
      } catch (s) {
        throw s
      }
  }
  insertMessage(e, t) {
    ;(this.messageChain.splice(t, 0, e), this.updateMessageSummary())
  }
  async retryMessage(e) {
    const t = this.getMessageById(e)
    if (t) {
      ;((t.content = [{ type: 'blank' }]), this.updateLastUpdate())
      const s = this.messageChain.indexOf(t),
        a = this._getValidOpenaiMessage(0, s)
      return (this.kernel.send(a, e, this.options), !0)
    }
  }
  as
  revMessage(e) {
    this.updateLastUpdate()
    const t = this.kernel.convertMessage(e)
    return (
      this.active ? this.emit('revMessage', t) : this.messageChain.push(t),
      this.emit('updateMessageSummary'),
      t
    )
  }
  delMessage(e) {
    for (let t = 0; t < this.messageChain.length; t++)
      if (this.messageChain[t].id === e)
        return (
          this.active
            ? this.emit('delMessage', t)
            : this.acting.messageChain.splice(t, 1),
          this.makeSystemMessage(`${this.name}撤回了一条消息`),
          !0
        )
    return !1
  }
  makeSystemMessage(e) {
    const t = {
      role: 'mio_system',
      time: new Date().getTime(),
      id: new Date().getTime(),
      content: [{ type: 'text', data: { text: e } }],
    }
    this.active ? this.emit('revMessage', t) : this.messageChain.push(t)
  }
  getLastTime() {
    const e = this.messageChain[this.messageChain.length - 1]
    if (!e) return ''
    const t = new Date().getTime(),
      s = new Date(e.time),
      a = t - s.getTime()
    if (a < 864e5) {
      this.toinit = !1
      return `${s.getHours().toString().padStart(2, '0')}:${s.getMinutes().toString().padStart(2, '0')}`
    }
    if (a < 1728e5) return '昨天'
    if (a < 6048e5) {
      return `星期${['日', '一', '二', '三', '四', '五', '六'][s.getDay()]}`
    }
    return `${s.getFullYear()}/${(s.getMonth() + 1).toString().padStart(2, '0')}/${s.getDate().toString().padStart(2, '0')}`
  }
  getShownTime(e) {
    const t = new Date().getTime() - e
    if (t < 864e5) {
      return `${new Date(e).getHours().toString().padStart(2, '0')}:${new Date(e).getMinutes().toString().padStart(2, '0')}`
    }
    if (t < 1728e5) {
      return `昨天${new Date(e).getHours().toString().padStart(2, '0')}:${new Date(e).getMinutes().toString().padStart(2, '0')}`
    }
    if (t < 6048e5) {
      const t = ['日', '一', '二', '三', '四', '五', '六'],
        s = new Date(e).getDay(),
        a = new Date(e).getHours().toString().padStart(2, '0'),
        i = new Date(e).getMinutes().toString().padStart(2, '0')
      return `星期${t[s]}${a}:${i}`
    }
    return `${new Date(e).getFullYear()}/${(new Date(e).getMonth() + 1).toString().padStart(2, '0')}/${new Date(e).getDate().toString().padStart(2, '0')} ${new Date(e).getHours().toString().padStart(2, '0')}:${new Date(e).getMinutes().toString().padStart(2, '0')}`
  }
  getLastMessageSummary(e) {
    let t = e || this.messageChain[this.messageChain.length - 1]
    return t
      ? ((t = JSON.parse(JSON.stringify(t))),
        'node' === t.type && (t = t.data),
        ((e) => {
          switch (e.type) {
            case 'text':
            case 'reason':
              return e.data.text
            case 'image':
              return '[图片]'
            case 'record':
              return '[语音]'
            case 'video':
              return '[视频]'
            case 'file':
              return '[文件]'
            case 'tool_call':
              return `[调用工具] ${e.data.name}`
            case 'blank':
              return '正在思考中...'
            case 'reply':
              return ''
            case 'nodes':
              return '[转发消息]'
            default:
              return '[未知消息类型] ' + e.type
          }
        })(t.content ? t.content[0] : t))
      : ''
  }
  updateFirstMessage() {
    this.firstMessageIndex = this.messageChain.length
  }
  updateLastUpdate() {
    this.lastUpdate = new Date().getTime()
  }
  getMessageById(e) {
    return this.messageChain.find((t) => t.id === e)
  }
  loadAvatar() {
    let e = '/static/avatar/miobot.png'
    if ('MODEL' == A[this.avatarPolicy]) {
      const t = this.options.base.model
      e = $.getAvatarByModel(t)
    } else 'CUSTOM' == A[this.avatarPolicy] && (e = this.avatar)
    return (
      'openai' == this.platform && (this.title = this.options.base.model),
      (this.avatar = e),
      e
    )
  }
  async loadName() {
    let e = this.name ?? '未命名 Bot'
    if ('MODEL' == D[this.namePolicy]) {
      e = this.options.model
    } else
      'CUSTOM' == D[this.namePolicy]
        ? (e = this.name)
        : 'SUMMARY' == D[this.namePolicy] &&
          (this.messageChain.length < 2
            ? (e = '新建的 Bot')
            : (2 != this.messageChain.length &&
                this.messageChain.length % 6 != 0) ||
              (e = await this.getMessagesSummary()))
    return ((this.name = e), e)
  }
  getMessagesSummary() {
    return 'openai' == this.platform
      ? this.kernel.getMessagesSummary(this._getValidOpenaiMessage().slice(-4))
      : '仅支持 OpenAI Chat Bot'
  }
  static getAvatarByModel(e) {
    const t = q.getModelOwner(e)
    return Object.keys(E).includes(t) ? `${O}/${E[t]}` : `${O}/openai.svg`
  }
}
function R(e) {
  return new Worker('/assets/fileUpload-CptEYZHI.js', { name: e?.name })
}
b.config({ name: 'mio-chat' })
const U = { AUTO: 'AUTO', ANY: 'ANY', NONE: 'NONE' },
  j = {
    NONE: 'BLOCK_NONE',
    LOW: 'BLOCK_ONLY_HIGH',
    MEDIUM: 'BLOCK_MEDIUM_AND_ABOVE',
    HIGH: 'BLOCK_LOW_AND_ABOVE',
    DEFAULT: 'BLOCK_NONE',
  },
  B = {
    HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
    HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
    SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
  },
  N = 'app_config_v1'
const q = new (class {
    constructor() {
      ;((this.localPresets = []),
        (this.toolsConfig = {}),
        (this.llmTools = []),
        (this.onebotConfig = null),
        (this.llmModels = {}),
        (this.safetyConfig = {}),
        (this.baseConfig = {}),
        (this.LLMDefaultConfig = {}),
        (this.baseConfigCallback = null),
        this._loadStrogeConfig(),
        this.initSafetyConfig(),
        this.initLLMDefaultConfig(),
        this.loadllmTools().catch((e) => {}),
        this.loadonebotConfig().catch((e) => {}),
        this._getLocalStorage(N) || this._saveStrogeConfig())
    }
    _setLocalStorage(e, t) {
      try {
        localStorage.setItem(e, JSON.stringify(t))
      } catch (s) {}
    }
    _getLocalStorage(e) {
      try {
        const t = localStorage.getItem(e)
        return null == t ? null : JSON.parse(t)
      } catch (t) {
        return (localStorage.removeItem(e), null)
      }
    }
    _saveStrogeConfig() {
      const e = {
        localPresets: this.localPresets,
        toolsConfig: this.toolsConfig,
        llmTools: this.llmTools,
        onebotConfig: this.onebotConfig,
        llmModels: this.llmModels,
        baseConfig: this.baseConfig,
        safetyConfig: this.safetyConfig,
        LLMDefaultConfig: this.LLMDefaultConfig,
      }
      this._setLocalStorage(N, e)
    }
    _loadStrogeConfig() {
      const e = this._getLocalStorage(N)
      e &&
        ((this.localPresets = e.localPresets ?? []),
        (this.toolsConfig = e.toolsConfig ?? {}),
        (this.llmTools = e.llmTools ?? []),
        (this.onebotConfig = e.onebotConfig ?? null),
        (this.llmModels = e.llmModels ?? {}),
        (this.baseConfig = e.baseConfig ?? {}),
        (this.safetyConfig = e.safetyConfig ?? {}),
        (this.LLMDefaultConfig = e.LLMDefaultConfig ?? {}))
    }
    _mergeDefaultsRecursive(e, t) {
      if (!e || 'object' != typeof e || !t || 'object' != typeof t) return e
      for (const s in e)
        Object.prototype.hasOwnProperty.call(e, s) && (s in t || delete e[s])
      for (const s in t)
        if (Object.prototype.hasOwnProperty.call(t, s)) {
          const a = t[s],
            i = e[s]
          s in e
            ? 'object' != typeof a ||
              null === a ||
              Array.isArray(a) ||
              'object' != typeof i ||
              null === i ||
              Array.isArray(i) ||
              this._mergeDefaultsRecursive(i, a)
            : 'object' != typeof a || null === a || Array.isArray(a)
              ? Array.isArray(a)
                ? (e[s] = [...a])
                : (e[s] = a)
              : (e[s] = this._mergeDefaultsRecursive({}, a))
        }
      return e
    }
    initSafetyConfig() {
      const e = Object.values(B)
      let t = !1
      ;(this.safetyConfig && 'object' == typeof this.safetyConfig) ||
        ((this.safetyConfig = {}), (t = !0))
      for (const s of e)
        s in this.safetyConfig || ((this.safetyConfig[s] = j.DEFAULT), (t = !0))
    }
    initLLMDefaultConfig() {
      const e = this.baseConfig?.llm_providers?.[0] ?? 'openai',
        t = {
          provider: e,
          base: {
            model: this.getDefaultModel(e) ?? 'gpt-4o-mini',
            max_messages_num: 10,
            stream: !0,
          },
          chatParams: {
            temperature: 1,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
            reasoning_effort: -1,
          },
          toolCallSettings: { mode: U.AUTO, tools: [] },
          presetSettings: { opening: '', history: [] },
          extraSettings: {
            gemini: {
              imageGeneration: !1,
              internalTools: {
                google_search: !1,
                code_execution: !1,
                url_context: !1,
              },
              safetySettings: {
                [B.HARASSMENT]: j.DEFAULT,
                [B.HATE_SPEECH]: j.DEFAULT,
                [B.SEXUALLY_EXPLICIT]: j.DEFAULT,
                [B.DANGEROUS_CONTENT]: j.DEFAULT,
              },
            },
          },
        }
      ;((this.LLMDefaultConfig && 'object' == typeof this.LLMDefaultConfig) ||
        (this.LLMDefaultConfig = {}),
        (this.LLMDefaultConfig = this._mergeDefaultsRecursive(
          this.LLMDefaultConfig,
          t,
        )))
    }
    getBaseConfig() {
      return this.baseConfig
    }
    setBaseConfig(e) {
      this.baseConfig = { ...e }
      const { llm_providers: t = [], default_model: s = {} } = this.baseConfig
      if (t.length > 0) {
        const e = t[0]
        ;(this.updateLLMDefaultConfig(null, { provider: e }),
          s[e] && this.updateLLMDefaultConfig('base', { model: s[e] }))
      }
      if ((this._saveStrogeConfig(), this.baseConfigCallback))
        try {
          this.baseConfigCallback(this.baseConfig)
        } catch (a) {}
    }
    setBaseConfigCallback(e) {
      this.baseConfigCallback = e
    }
    updateBaseConfig(e) {
      const t = { ...this.baseConfig, ...e }
      this.setBaseConfig(t)
    }
    getLLMProviders() {
      return (this.baseConfig?.llm_providers ?? []).map((e) => ({
        value: e,
        label: e,
      }))
    }
    getDefaultModel(e) {
      return this.baseConfig?.default_model?.[e]
    }
    getToolCallModes() {
      return Object.entries(U).map(([e, t]) => ({ value: t, label: e }))
    }
    getLlmModels(e) {
      return e ? (this.llmModels?.[e] ?? []) : (this.llmModels ?? {})
    }
    setLlmModels(e) {
      ;((this.llmModels = e), this._saveStrogeConfig())
    }
    getDefaultLLMModel() {
      return this.baseConfig?.default_model ?? {}
    }
    isModelAvailable(e, t) {
      return (this.llmModels?.[e] ?? []).some((e) => e.models.includes(t))
    }
    getModelOwner(e) {
      for (const t in this.llmModels) {
        const s = (this.llmModels[t] ?? []).find((t) => t.models.includes(e))
        if (s) return s.owner
      }
    }
    getSafetySettingsParams() {
      return j
    }
    getSafetyConfig() {
      return this.safetyConfig
    }
    setSafetyConfig(e) {
      ;((this.safetyConfig = { ...e }),
        this.updateLLMDefaultConfig('safetySettings', { ...this.safetyConfig }))
    }
    updateLLMDefaultConfig(e, t) {
      let s = !1
      if (
        e &&
        this.LLMDefaultConfig[e] &&
        'object' == typeof this.LLMDefaultConfig[e]
      ) {
        const a = JSON.stringify(this.LLMDefaultConfig[e])
        ;((this.LLMDefaultConfig[e] = { ...this.LLMDefaultConfig[e], ...t }),
          JSON.stringify(this.LLMDefaultConfig[e]) !== a && (s = !0))
      } else {
        if (e) return
        {
          const e = { ...this.LLMDefaultConfig }
          ;((this.LLMDefaultConfig = { ...this.LLMDefaultConfig, ...t }),
            JSON.stringify(e) !== JSON.stringify(this.LLMDefaultConfig) &&
              (s = !0))
        }
      }
      s && this._saveStrogeConfig()
    }
    getLLMDefaultConfig(e) {
      if (!this.LLMDefaultConfig || 'object' != typeof this.LLMDefaultConfig)
        return {}
      let t
      try {
        t = JSON.parse(JSON.stringify(this.LLMDefaultConfig))
      } catch (s) {
        return {}
      }
      if (e && e !== t.provider) {
        const s = this.getDefaultModel(e)
        s && ((t.provider = e), (t.base.model = s))
      }
      return t
    }
    getValidTools(e) {
      if (!e || !Array.isArray(e)) return []
      const t = new Set(),
        s = (e) => {
          e &&
            (Array.isArray(e)
              ? e.forEach((e) => s(e))
              : 'object' == typeof e
                ? e.tools && 'object' == typeof e.tools
                  ? Object.keys(e.tools).forEach((e) => t.add(e))
                  : Object.keys(e).forEach((s) => {
                      'object' == typeof e[s] &&
                        null !== e[s] &&
                        Object.keys(e[s]).forEach((e) => t.add(e))
                    })
                : 'string' == typeof e && t.add(e))
        }
      Array.isArray(this.llmTools)
        ? this.llmTools.forEach((e) => s(e))
        : 'object' == typeof this.llmTools &&
          null !== this.llmTools &&
          Object.values(this.llmTools).forEach((e) => {
            e && 'object' == typeof e && Object.keys(e).forEach((e) => t.add(e))
          })
      const a = e.filter((e) => t.has(e))
      if (a.length < e.length) {
        e.filter((e) => !t.has(e))
      }
      return a
    }
    getVerifiedLLMConfig(e) {
      if (!e || 'object' != typeof e) return e
      let t
      try {
        t = JSON.parse(JSON.stringify(e))
      } catch (s) {
        return e
      }
      return (
        this._mergeDefaultsRecursive(t, this.LLMDefaultConfig),
        t.toolCallSettings && Array.isArray(t.toolCallSettings.tools)
          ? (t.toolCallSettings.tools = this.getValidTools(
              t.toolCallSettings.tools,
            ))
          : t.toolCallSettings && (t.toolCallSettings.tools = []),
        t
      )
    }
    async loadllmTools() {
      try {
        const e = await fetch('/api/openai/tools')
        if (!e.ok)
          throw new Error(`请求 LLM 工具失败: ${e.status} ${e.statusText}`)
        const t = await e.json()
        t && t.data && t.data.tools
          ? (this.llmTools = t.data.tools)
          : (this.llmTools = [])
      } catch (e) {}
    }
    async loadonebotConfig() {
      try {
        const e = await fetch('/api/onebot/plugins')
        if (!e.ok)
          throw new Error(`请求 OneBot 配置失败: ${e.status} ${e.statusText}`)
        const t = await e.json()
        t && t.data && t.data.options
          ? ((this.onebotConfig = t.data.options), this._saveStrogeConfig())
          : (this.onebotConfig = null)
      } catch (e) {}
    }
  })(),
  V = new (class extends M {
    constructor(e) {
      ;(super(),
        (this.inited = !1),
        (this.id = null),
        (this.code = null),
        (this.isConnected = !1),
        (this.contactList = []),
        (this.socket = null),
        (this.qq = null),
        (this.bot_qq = null),
        (this.avatar = null),
        (this.onPhone = null),
        (this.title = 'Mio'),
        (this.name = 'user'),
        (this.config = e),
        (this.setLocalStorage = (function (e, t) {
          let s
          return function (...a) {
            ;(clearTimeout(s),
              (s = setTimeout(() => {
                e.apply(this, a)
              }, t)))
          }
        })(this.setLocalStorage.bind(this), 500)))
    }
    async preInit() {
      const e = this.config.getBaseConfig()
      0 === Object.keys(e).length
        ? await this.loadOriginBaseInfo()
        : (this.loadOriginBaseInfo(), this.loadBaseInfo(e))
      const t = await this.getLocalStorage()
      ;(t && this.loadLocalStorage(t), (this.inited = !0), this.emit('loaded'))
    }
    genDefaultConctor(e) {
      if (e.onebot_enabled) {
        const e = {
          id: this.genFakeId(),
          name: 'OneBot',
          namePolicy: 1,
          avatarPolicy: 1,
          avatar: `/p/qava?q=${this.bot_qq}`,
          title: '云崽',
          priority: 0,
          options: {},
          lastUpdate: -Infinity,
        }
        this.addConcator('onebot', e)
      }
      const t = this.config.getLLMDefaultConfig(),
        s = []
      for (const i in this.config.llmTools)
        s.push(...Object.keys(this.config.llmTools[i]))
      t.toolCallSettings.tools = s
      const a = {
        id: this.genFakeId(),
        name: 'MioBot',
        avatar: '/p/ava/miobot.png',
        namePolicy: 1,
        avatarPolicy: 1,
        title: 'chat',
        priority: 0,
        lastUpdate: -Infinity,
        options: t,
      }
      this.addConcator('openai', a)
    }
    async addConcator(t, s) {
      const a = new $(t, s)
      ;(a.loadName(), a.loadAvatar())
      return (e(this.contactList).push(a), await this.setLocalStorage(), a)
    }
    rmContactor(t) {
      const s = e(this.contactList),
        a = s.findIndex((e) => e.id == t)
      ;-1 != a && (s.splice(a, 1), this.setLocalStorage())
    }
    async loadOriginalContactors(e) {
      const t = `/api/share?id=${e}`
      let s = null
      try {
        const e = await fetch(t),
          a = await e.json()
        return (
          0 == a.code &&
          ((s = a.data.contactor),
          this.getContactor(s.id) || this.addConcator(s.platform, s),
          !0)
        )
      } catch (a) {
        return !1
      }
    }
    async shareContactor(e) {
      const t = await this.setOriginalContactor(e)
      if (t) {
        const { previewImage: e, shareUrl: s } = t,
          a = document.location.origin,
          i = navigator.clipboard
        return (i && i.writeText(a + s), t)
      }
      return null
    }
    async setOriginalContactor(e) {
      const t = { contactor: this.getContactor(e) }
      try {
        const e = await fetch('/api/share/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(t),
          }),
          s = await e.json()
        if (0 == s.code) return s.data
      } catch (s) {
        return null
      }
    }
    async reset() {
      ;(b.clear(), localStorage.clear())
      try {
        await this.resetCache()
      } catch (e) {}
      return !0
    }
    async resetCache() {
      try {
        navigator.serviceWorker.controller &&
          (await new Promise((e, t) => {
            const s = new MessageChannel()
            ;((s.port1.onmessage = (s) => {
              'IDB_CACHE_CLEARED' === s.data.type
                ? e()
                : 'IDB_CACHE_CLEAR_FAILED' === s.data.type
                  ? t(s.data.error)
                  : t(new Error('Unknown message from Service Worker'))
            }),
              (s.port1.onerror = (e) => {
                t(e)
              }),
              navigator.serviceWorker.controller.postMessage(
                { type: 'CLEAR_IDB_CACHE' },
                [s.port2],
              ))
          }))
        const t = await navigator.serviceWorker.getRegistrations()
        if (t && t.length > 0)
          for (const s of t)
            try {
              await s.unregister()
            } catch (e) {}
        return !0
      } catch (e) {
        throw e
      }
    }
    everLogin() {
      return !!localStorage.getItem('everLogin')
    }
    setEverLogin() {
      localStorage.setItem('everLogin', !0)
    }
    async init() {
      ;(await this.preInit(),
        this.everLogin() && ((this.isConnected = !1), this.login(this.code)))
    }
    getContactors() {
      return this.contactList
    }
    getContactor(e, t = null) {
      return t
        ? this.contactList.find((e) => 'onebot' == e.platform)
        : this.contactList.find((t) => t.id == e)
    }
    genFakeId() {
      if (this.id) {
        const e = Math.floor(1e3 + 9e3 * Math.random())
        return parseInt(`${this.id}${e}`)
      }
      {
        const e = Math.floor(1e3 + 9e3 * Math.random())
        return parseInt(`1${e}`)
      }
    }
    async getLocalStorage() {
      const e = await b.getItem('client')
      if (e) {
        return JSON.parse(e)
      }
      return ((this.id = this.genFakeId()), (this.code = null), null)
    }
    loadLocalStorage(e) {
      ;((this.id = e.id),
        (this.code = e.code),
        e.contactList && 0 != e.contactList.length
          ? (this.contactList = e.contactList.map((e) => new $(e.platform, e)))
          : (this.contactList = []))
    }
    async setLocalStorage() {
      const e = { id: this.id, code: this.code, contactList: this.contactList }
      await b.setItem('client', JSON.stringify(e))
    }
    async login(e) {
      return (
        (this.code = e),
        new Promise((e, t) => {
          const s = new _(this.id, this.code)
          ;(s.on('connect', async (t) => {
            ;((this.isConnected = !0),
              (this.socket = s),
              this.config.setLlmModels(t.models),
              this.addMsgListener(),
              0 == this.contactList.length && this.genDefaultConctor(t),
              this.setEverLogin(),
              this.setLocalStorage(),
              e(t))
          }),
            s.on('connect_error', (e) => {
              ;((this.isConnected = !1), t(e.message))
            }),
            s.connect())
        })
      )
    }
    addMsgListener() {
      ;(this.socket.on('onebot_message', (e) => {
        const t = e.data,
          s = t.id,
          a = t.content,
          i = t.type
        if ('message' == i) {
          const e = this.getContactor(s, 1e4)
          e && (e.revMessage(a), this.setLocalStorage())
        } else if ('del_msg' == i) {
          const e = this.contactList.filter((e) => 'onebot' == e.platform)
          for (const t of e) {
            if (t.delMessage(a.message_id)) {
              this.setLocalStorage()
              break
            }
          }
        }
      }),
        this.socket.on('llm_message', (e) => {
          const t = e.data,
            { metaData: s } = t
          if (s.contactorId) {
            const t = this.getContactor(s.contactorId)
            t && t.handleLLMMessageEvent(e)
          }
        }))
    }
    async logout() {
      ;((this.isConnected = !1),
        this.socket.disconnect(),
        (this.socket = null),
        this.setLocalStorage())
    }
    async loadOriginBaseInfo() {
      const e = await fetch('/api/base_info'),
        { data: t } = await e.json()
      return (this.config.setBaseConfig(t), this.loadBaseInfo(t), t)
    }
    loadBaseInfo(e) {
      ;((this.admin_qq = e.admin_qq),
        (this.bot_qq = e.bot_qq),
        (this.avatar = `/p/qava?q=${this.admin_qq}`))
      const t = this.getContactor(null, 1e4)
      t && (t.avatar = `/p/qava?q=${this.bot_qq}`)
    }
    async uploadFile(e, t = {}) {
      const { isImage: s = !1, onProgress: a = null } = t
      if (s || ('string' == typeof e && e.startsWith('data:')))
        return this.uploadImage(e)
      const i = e
      return new Promise((e, t) => {
        const s = 1048576
        let o = null
        const n = async (e, t, s) =>
            new Promise((n, l) => {
              const r = new FormData()
              ;(r.append('file', e),
                r.append('md5', o),
                r.append('chunkIndex', t),
                r.append('totalChunks', s),
                r.append('filename', i.name))
              const c = new XMLHttpRequest()
              ;(c.open('POST', '/api/upload/chunk', !0),
                a &&
                  (c.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                      const i = e.loaded / e.total,
                        o = 100 * (t / s + (1 / s) * i)
                      a(Math.round(o))
                    }
                  }),
                (c.onload = () => {
                  c.status >= 200 && c.status < 300 ? n() : l(c.statusText)
                }),
                (c.onerror = () => {
                  l('Network Error')
                }),
                c.send(r))
            }),
          l = async () => {
            if (!i || !o) return t({ error: 'Invalid file or missing hash' })
            const a = Math.ceil(i.size / s)
            try {
              for (let e = 0; e < a; e++) {
                const t = e * s,
                  o = Math.min(t + s, i.size),
                  l = i.slice(t, o)
                await n(l, e, a)
              }
              await (async (s) => {
                try {
                  const t = await fetch('/api/upload/finalize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      totalChunks: s,
                      md5: o,
                      filename: i.name,
                    }),
                  })
                  if (!t.ok) throw new Error(`HTTP error ${t.status}`)
                  const a = await t.json()
                  e(a)
                } catch (a) {
                  t({ error: `Finalization error: ${a.message}` })
                }
              })(a)
            } catch (l) {
              t({ error: `Upload error: ${l}` })
            }
          },
          r = new R()
        ;(r.postMessage({ file: i, chunkSize: s }),
          (r.onmessage = (e) => {
            e.data.hash
              ? ((o = e.data.hash), l())
              : e.data.error && (t({ error: e.data.error }), r.terminate())
          }),
          (r.onerror = (e) => {
            ;(t({ error: `Worker error: ${e.message}` }), r.terminate())
          }))
      })
    }
    async uploadImage(e) {
      try {
        const t = await fetch('/api/upload/image', { method: 'POST', body: e })
        if (!t.ok) throw new Error(`HTTP error ${t.status}`)
        return await t.json()
      } catch (t) {
        throw t
      }
    }
    async _convertBlobToBase64(e) {
      return new Promise((t, s) => {
        const a = new FileReader()
        ;((a.onloadend = () => t(a.result)),
          (a.onerror = s),
          a.readAsDataURL(e))
      })
    }
  })(q)
V.init()
const F = (e, t) => {
    const s = e.__vccOpts || e
    for (const [a, i] of t) s[a] = i
    return s
  },
  H = 'chat',
  G = 'profile',
  W = 'settings',
  z = 'none',
  J = { id: 'sidebar' },
  K = { class: 'admin-avatar' },
  Y = ['src'],
  X = { id: 'side', class: 'options' },
  Z = { class: 'up-half' },
  Q = { class: 'down-half' }
const ee = F(
  {
    data: () => ({ processedImage: '/p/qava?q=1099834705', activePage: z }),
    computed: {
      isChatActive() {
        return this.activePage === H
      },
      isProfileActive() {
        return this.activePage === G
      },
    },
    watch: {
      $route: {
        handler(e) {
          this.activePage = this.getPageStatusFromRoute(e)
        },
        immediate: !0,
      },
    },
    mounted() {
      this.activePage = this.getPageStatusFromRoute()
      const e = V.admin_qq
      e
        ? this.loadAvatar(e)
        : V.on(
            'loaded',
            () => {
              const e = V.admin_qq
              this.loadAvatar(e)
            },
            !1,
          )
    },
    methods: {
      processImage: async (e) =>
        new Promise((t, s) => {
          const a = document.createElement('canvas'),
            i = a.getContext('2d'),
            o = new Image()
          ;((o.src = e),
            (o.onload = () => {
              ;((a.width = o.width),
                (a.height = o.height),
                i.drawImage(o, 0, 0))
              let e = 0.8 * o.width,
                s = 0.86 * o.height,
                n = (5 / 24) * o.width
              ;(i.beginPath(),
                i.arc(e, s, n, 0, 2 * Math.PI, !0),
                i.clip(),
                i.clearRect(0, 0, o.width, o.height),
                a.toBlob((e) => {
                  const s = URL.createObjectURL(e)
                  t(s)
                }, 'image/png'))
            }),
            (o.onerror = (e) => {
              s(e)
            }))
        }),
      async toChat() {
        ;((this.activePage = H), this.$router.push({ name: 'blank' }))
      },
      async toProfile() {
        ;((this.activePage = G), this.$router.push({ name: 'contactors' }))
      },
      async toConfig() {
        ;((this.activePage = W), this.$router.push({ name: 'settings' }))
      },
      async loadAvatar(e) {
        const t = `/p/qava?q=${e}`
        try {
          this.processedImage = await this.processImage(t)
        } catch (s) {}
      },
      getPageStatusFromRoute(e = this.$route) {
        return '/' === e.path || e.path.includes('/chat/')
          ? H
          : '/contactors' === e.path || e.path.includes('/profile/')
            ? G
            : '/settings' === e.path
              ? W
              : z
      },
    },
  },
  [
    [
      'render',
      function (e, o, n, l, r, c) {
        return (
          i(),
          t('div', J, [
            s('div', K, [
              o[3] || (o[3] = s('div', { class: 'status' }, null, -1)),
              s(
                'img',
                { src: r.processedImage, alt: 'admin-avatar' },
                null,
                8,
                Y,
              ),
            ]),
            s('div', X, [
              s('div', Z, [
                s(
                  'div',
                  { class: a(['icon-back', { active: c.isChatActive }]) },
                  [
                    s(
                      'div',
                      {
                        id: 'chatting',
                        onClick:
                          o[0] || (o[0] = (...e) => c.toChat && c.toChat(...e)),
                      },
                      o[4] ||
                        (o[4] = [s('i', { class: 'iconfont chat' }, null, -1)]),
                    ),
                  ],
                  2,
                ),
                s(
                  'div',
                  { class: a(['icon-back', { active: c.isProfileActive }]) },
                  [
                    s(
                      'div',
                      {
                        id: 'editing',
                        onClick:
                          o[1] ||
                          (o[1] = (...e) => c.toProfile && c.toProfile(...e)),
                      },
                      o[5] ||
                        (o[5] = [s('i', { class: 'iconfont user' }, null, -1)]),
                    ),
                  ],
                  2,
                ),
              ]),
              s('div', Q, [
                o[7] ||
                  (o[7] = s(
                    'a',
                    {
                      href: 'https://github.com/Pretend-to/mio-chat-backend',
                      target: '_blank',
                      class: 'side-icon',
                    },
                    [s('i', { class: 'iconfont github' })],
                    -1,
                  )),
                s(
                  'div',
                  {
                    class: 'side-icon',
                    onClick:
                      o[2] || (o[2] = (...e) => c.toConfig && c.toConfig(...e)),
                  },
                  o[6] ||
                    (o[6] = [s('i', { class: 'iconfont menu' }, null, -1)]),
                ),
              ]),
            ]),
          ])
        )
      },
    ],
    ['__scopeId', 'data-v-7a5175b8'],
  ],
)
let te = null
const se = F(
    {
      props: { fullScreen: { type: Boolean, default: !1 } },
      emits: ['set-screen', 'close'],
      data: () => ({
        preview: !1,
        isTauri: !(!window.__TAURI__ && !window.__TAURI_INTERNALS__),
      }),
      created() {
        ;('true' ===
          new URLSearchParams(window.location.search).get('preview') &&
          (this.preview = !0),
          this.isTauri && (te = new L('main')))
      },
      methods: {
        waiting() {
          this.$message
            ? this.$message({ message: '此功能尚未开放', type: 'warning' })
            : alert('此功能尚未开放')
        },
        async getMainWindow() {
          try {
            return te || null
          } catch (e) {
            return null
          }
        },
        async minimizeWindow() {
          if (this.isTauri)
            if (te)
              try {
                await te.minimize()
              } catch (e) {
                this.waiting()
              }
            else this.waiting()
          else this.$emit('close')
        },
        configFullScreen(e) {
          this.isTauri
            ? (async () => {
                if (te)
                  try {
                    ;(e ? await te.maximize() : await te.unmaximize(),
                      this.$emit('set-screen', e))
                  } catch (t) {
                    this.waiting()
                  }
                else this.waiting()
              })()
            : this.$emit('set-screen', e)
        },
        async closeWindow() {
          if (this.isTauri)
            if (te)
              try {
                await te.close()
              } catch (e) {
                this.waiting()
              }
            else this.waiting()
          else this.$emit('close')
        },
      },
    },
    [
      [
        'render',
        function (e, o, n, l, r, c) {
          return (
            i(),
            t(
              'ul',
              {
                class: a({
                  'window-controls': !0,
                  fullscreen: n.fullScreen,
                  preview: r.preview,
                }),
                'data-tauri-drag-region': 'true',
              },
              [
                s(
                  'li',
                  {
                    class: 'button',
                    'data-tauri-drag-region': '',
                    onClick:
                      o[0] ||
                      (o[0] = (...e) =>
                        c.minimizeWindow && c.minimizeWindow(...e)),
                  },
                  o[4] ||
                    (o[4] = [s('span', { class: 'window-min' }, '—', -1)]),
                ),
                n.fullScreen
                  ? (i(),
                    t(
                      'li',
                      {
                        key: 0,
                        class: 'button',
                        'data-tauri-drag-region': '',
                        onClick: o[1] || (o[1] = (e) => c.configFullScreen(!1)),
                      },
                      o[5] ||
                        (o[5] = [
                          s(
                            'span',
                            { class: 'window-inmax' },
                            [s('i', { class: 'iconfont chuangkouhua' })],
                            -1,
                          ),
                        ]),
                    ))
                  : (i(),
                    t(
                      'li',
                      {
                        key: 1,
                        class: 'button',
                        'data-tauri-drag-region': '',
                        onClick: o[2] || (o[2] = (e) => c.configFullScreen(!0)),
                      },
                      o[6] ||
                        (o[6] = [s('span', { class: 'window-max' }, '▢', -1)]),
                    )),
                s(
                  'li',
                  {
                    id: 'close',
                    class: 'button',
                    'data-tauri-drag-region': '',
                    onClick:
                      o[3] ||
                      (o[3] = (...e) => c.closeWindow && c.closeWindow(...e)),
                  },
                  o[7] ||
                    (o[7] = [s('span', { class: 'window-close' }, '×', -1)]),
                ),
              ],
              2,
            )
          )
        },
      ],
      ['__scopeId', 'data-v-a5e279e7'],
    ],
  ),
  ae = { id: 'forward-msg-body' },
  ie = { id: 'forward-msg-foot' },
  oe = { class: 'forward-msg-head' },
  ne = { class: 'body' },
  le = { key: 0, id: 'other', class: 'message-body' },
  re = { class: 'avatar' },
  ce = ['src', 'alt'],
  de = { class: 'msg' },
  he = { class: 'wholename' },
  me = { class: 'title' },
  ge = { class: 'name' }
const ue = F(
    {
      name: 'ForwardMsg',
      components: { MdPreview: o, displayButtons: se },
      props: {
        messages: { type: Array, default: () => [] },
        contactor: { type: Object, default: () => {} },
      },
      data: () => ({ showBox: !1, onPhone: !1 }),
      created() {
        ;((this.onPhone = window.innerWidth < 600),
          V.on(
            'device-change',
            (e) => {
              this.onPhone = 'mobile' == e
            },
            !1,
          ))
      },
    },
    [
      [
        'render',
        function (e, o, g, u, p, f) {
          const y = h('displayButtons'),
            v = h('MdPreview'),
            C = h('el-image'),
            w = h('ForwardMsg', !0)
          return (
            i(),
            t(
              l,
              null,
              [
                s(
                  'div',
                  {
                    id: 'forward-msg-preview',
                    class: a(p.onPhone ? 'on-phone' : ''),
                    onClick: o[0] || (o[0] = (e) => (p.showBox = !0)),
                  },
                  [
                    o[2] ||
                      (o[2] = s(
                        'div',
                        { id: 'forward-msg-head' },
                        '转发的聊天消息',
                        -1,
                      )),
                    s('div', ae, [
                      (i(!0),
                      t(
                        l,
                        null,
                        r(
                          g.messages.slice(0, 2),
                          (e, s) => (
                            i(),
                            t(
                              'div',
                              { id: 'forward-msg-summary', key: s },
                              c(g.contactor.name) +
                                ': ' +
                                c(g.contactor.getLastMessageSummary(e)),
                              1,
                            )
                          ),
                        ),
                        128,
                      )),
                    ]),
                    s(
                      'div',
                      ie,
                      '查看' + c(g.messages.length) + '条转发消息',
                      1,
                    ),
                  ],
                  2,
                ),
                p.showBox
                  ? (i(),
                    t(
                      'div',
                      {
                        key: 0,
                        id: 'forward-msg-box',
                        class: a(p.onPhone ? 'on-phone' : ''),
                      },
                      [
                        s('div', oe, [
                          o[3] ||
                            (o[3] = s(
                              'div',
                              { class: 'forward-msg-title' },
                              '转发的聊天消息',
                              -1,
                            )),
                          d(y, {
                            class: 'cfg-btns',
                            onClose: o[1] || (o[1] = (e) => (p.showBox = !1)),
                          }),
                        ]),
                        s('div', ne, [
                          (i(!0),
                          t(
                            l,
                            null,
                            r(
                              g.messages,
                              (a, o) => (
                                i(),
                                t(
                                  'div',
                                  { key: o, class: 'message-container' },
                                  [
                                    'node' === a.type
                                      ? (i(),
                                        t('div', le, [
                                          s('div', re, [
                                            s(
                                              'img',
                                              {
                                                src: `/p/qava/?q=${a.data.uin}`,
                                                alt: a.data.name,
                                              },
                                              null,
                                              8,
                                              ce,
                                            ),
                                          ]),
                                          s('div', de, [
                                            s('div', he, [
                                              s(
                                                'div',
                                                me,
                                                c(g.contactor.title),
                                                1,
                                              ),
                                              s('div', ge, c(a.data.name), 1),
                                            ]),
                                            (i(!0),
                                            t(
                                              l,
                                              null,
                                              r(
                                                a.data.content,
                                                (a, o) => (
                                                  i(),
                                                  t(
                                                    'div',
                                                    {
                                                      key: o,
                                                      class: 'content',
                                                    },
                                                    [
                                                      s('div', null, [
                                                        'text' === a.type
                                                          ? (i(),
                                                            m(
                                                              v,
                                                              {
                                                                key: 0,
                                                                'preview-theme':
                                                                  'github',
                                                                'editor-id':
                                                                  'preview-only',
                                                                'model-value':
                                                                  a.data.text,
                                                              },
                                                              null,
                                                              8,
                                                              ['model-value'],
                                                            ))
                                                          : 'image' === a.type
                                                            ? (i(),
                                                              m(
                                                                C,
                                                                {
                                                                  key: o,
                                                                  style: {
                                                                    margin:
                                                                      '8px 0',
                                                                    'max-width':
                                                                      '20rem',
                                                                    'border-radius':
                                                                      '1rem',
                                                                  },
                                                                  src: a.data
                                                                    .file,
                                                                  'zoom-rate': 1.2,
                                                                  'preview-teleported':
                                                                    !0,
                                                                  'max-scale': 7,
                                                                  'min-scale': 0.2,
                                                                  'preview-src-list':
                                                                    [
                                                                      a.data
                                                                        .file,
                                                                    ],
                                                                  'initial-index': 4,
                                                                  fit: 'cover',
                                                                },
                                                                null,
                                                                8,
                                                                [
                                                                  'src',
                                                                  'preview-src-list',
                                                                ],
                                                              ))
                                                            : 'nodes' === a.type
                                                              ? (i(),
                                                                m(
                                                                  w,
                                                                  {
                                                                    key: 2,
                                                                    contactor:
                                                                      e.activeContactor,
                                                                    messages:
                                                                      a.data
                                                                        .messages,
                                                                  },
                                                                  null,
                                                                  8,
                                                                  [
                                                                    'contactor',
                                                                    'messages',
                                                                  ],
                                                                ))
                                                              : (i(),
                                                                m(
                                                                  v,
                                                                  {
                                                                    key: 3,
                                                                    'preview-theme':
                                                                      'github',
                                                                    'editor-id':
                                                                      'preview-only',
                                                                    'model-value': `尚未支持的消息类型：${a.type}`,
                                                                  },
                                                                  null,
                                                                  8,
                                                                  [
                                                                    'model-value',
                                                                  ],
                                                                )),
                                                      ]),
                                                    ],
                                                  )
                                                ),
                                              ),
                                              128,
                                            )),
                                          ]),
                                        ]))
                                      : n('', !0),
                                  ],
                                )
                              ),
                            ),
                            128,
                          )),
                        ]),
                      ],
                      2,
                    ))
                  : n('', !0),
              ],
              64,
            )
          )
        },
      ],
      ['__scopeId', 'data-v-19b00d24'],
    ],
  ),
  pe = { class: 'input-bar' },
  fe = { class: 'options' },
  ye = { class: 'bu-emoji' },
  ve = { class: 'bu-emoji' },
  Ce = { class: 'ho-emoji' },
  we = { class: 'bu-emoji' },
  Se = { class: 'bu-emoji' },
  be = { class: 'bu-emoji' },
  Le = { class: 'bu-emoji' },
  Me = { class: 'input-box' },
  xe = { class: 'input-content' },
  ke = ['v-html'],
  _e = ['disabled']
const Te = F(
    {
      props: { activeContactor: { type: Object, required: !0 } },
      emits: ['toButtom', 'cleanHistory', 'cleanScreen', 'setModel', 'stroge'],
      data: () => ({
        userInput: '',
        selectedOption: null,
        cursorPosition: [],
        showemoji: !1,
        openaiModels: null,
        onebotPresets: [],
        host: '',
        uploaded: { files: [], images: [] },
        isPasting: !1,
      }),
      computed: {
        extraOptions() {
          return 'openai' == this.activeContactor.platform
            ? this.openaiModels
            : this.onebotPresets
        },
      },
      watch: {
        '$route.params.id'() {
          this.loadSelected()
        },
      },
      created() {
        this.loadSelected()
      },
      mounted() {
        ;((this.textareaRef = this.$refs.textarea),
          this.textareaRef.addEventListener('input', this.adjustTextareaHeight),
          (this.handleDragOver = (e) => {
            ;(e.preventDefault(),
              (this.textareaRef.style.backgroundColor = '#e0e0e0'))
          }),
          (this.handleDragLeave = (e) => {
            ;(e.preventDefault(),
              (this.textareaRef.style.backgroundColor = '#f1f1f1'))
          }),
          (this.handleDrop = (e) => {
            ;(e.preventDefault(),
              (this.textareaRef.style.backgroundColor = '#f1f1f1'))
            const t = e.dataTransfer.files
            t.length > 0 && this.handleDroppedFile(t[0])
          }),
          this.textareaRef.addEventListener('dragover', this.handleDragOver),
          this.textareaRef.addEventListener('dragleave', this.handleDragLeave),
          this.textareaRef.addEventListener('drop', this.handleDrop),
          (this.handlePaste = (e) => {
            ;(e.preventDefault(), (this.isPasting = !0))
            for (
              var t = (e.clipboardData || window.clipboardData).items, s = 0;
              s < t.length;
              s++
            )
              if (-1 !== t[s].type.indexOf('image')) {
                var a = t[s].getAsFile()
                this.handleUploadImage(a)
              } else if ('text/plain' === t[s].type) {
                var i = (e.originalEvent || e).clipboardData.getData(
                  'text/plain',
                )
                ;(document.execCommand('insertText', !1, i),
                  (this.userInput = this.textareaRef.innerText))
              }
            this.isPasting = !1
          }),
          this.textareaRef.addEventListener('paste', this.handlePaste),
          (this.host = window.location.origin),
          (this.onebotPresets = q.onebotConfig.textwraper.options))
      },
      unmounted() {
        ;(this.textareaRef.removeEventListener(
          'input',
          this.adjustTextareaHeight,
        ),
          this.textareaRef.removeEventListener('dragover', this.handleDragOver),
          this.textareaRef.removeEventListener(
            'dragleave',
            this.handleDragLeave,
          ),
          this.textareaRef.removeEventListener('drop', this.handleDrop),
          this.textareaRef.removeEventListener('paste', this.handlePaste),
          (this.textareaRef = null))
      },
      methods: {
        unsupportedTip() {
          this.$message.warning('功能暂未开放')
        },
        handleDroppedFile(e) {
          e.type.startsWith('image/')
            ? this.handleUploadImage(e)
            : this.uploadFile(e)
        },
        ctrlEmojiPanel() {
          this.showemoji = !this.showemoji
          this.textareaRef.focus()
        },
        uploadFile(e) {
          if (e instanceof File) return void this.handleFileUpload(e)
          const t = document.createElement('input')
          ;((t.type = 'file'),
            (t.accept = [
              'docx',
              'txt',
              'pdf',
              'pptx',
              'xlsx',
              'png',
              'jpg',
              'jpeg',
              'webp',
            ]
              .map((e) => `.${e}`)
              .join(',')))
          const s = async (e) => {
            t.removeEventListener('change', s)
            const a = e.target.files[0]
            a && this.handleFileUpload(a)
          }
          ;(t.addEventListener('change', s), t.click())
        },
        handleFileUpload(e) {
          e.size > 52428800
            ? this.$message.error('文件大小超过50MB，无法上传')
            : (this.$message.info('文件上传中...'),
              e.type.startsWith('image/')
                ? this.handleUploadImage(e)
                : this.uploadDocumentFile(e))
        },
        async uploadDocumentFile(e) {
          try {
            const t = await V.uploadFile(e)
            this.$message.success('文件上传成功')
            const s = `${t.data.url}?size=${e.size}&name=${e.name}`,
              a = this.activeContactor.getBaseUserContainer()
            ;(a.content.push({ type: 'file', data: { file: this.host + s } }),
              this.activeContactor.webSend(a, !1))
          } catch (t) {
            this.$message.error('文件上传失败，请稍后再试')
          }
          ;(this.$emit('stroge'), this.$emit('toButtom'))
        },
        handleUploadImage(e) {
          const t = 5242880,
            s = new Image(),
            a = new FileReader()
          ;((a.onload = (e) => {
            s.src = e.target.result
          }),
            (s.onload = () => {
              const a = e.type.toLowerCase()
              if ('image/gif' === a) {
                if (e.size > t)
                  return void this.$message.error('图片大小不能超过 5MB')
                const s = new FormData()
                return (
                  s.append('image', e, e.name),
                  void V.uploadImage(s)
                    .then((t) => {
                      const s = t.data.url
                      ;(this.uploaded.images.push(s),
                        this.insertImageToTextarea(s, e.name),
                        this.$message.success('上传图片成功'))
                    })
                    .catch((e) => {
                      this.$message.error('上传图片失败')
                    })
                )
              }
              const i = document.createElement('canvas'),
                o = i.getContext('2d')
              let n, l
              ;((i.width = s.width),
                (i.height = s.height),
                o.drawImage(s, 0, 0),
                'image/png' === a
                  ? ((n = 'image/png'), (l = void 0))
                  : 'image/webp' === a
                    ? ((n = 'image/webp'), (l = 0.7))
                    : ((n = 'image/jpeg'), (l = 0.7)),
                i.toBlob(
                  (s) => {
                    if (s.size > t)
                      return void this.$message.error(
                        '图片压缩后仍然超过 5MB，请选择更小的图片',
                      )
                    const a = new FormData()
                    ;(a.append('image', s, e.name),
                      V.uploadImage(a)
                        .then((t) => {
                          const s = t.data.url
                          ;(this.uploaded.images.push(s),
                            this.insertImageToTextarea(s, e.name),
                            this.$message.success('上传图片成功'))
                        })
                        .catch((e) => {
                          this.$message.error('上传图片失败')
                        }))
                  },
                  n,
                  l,
                ))
            }),
            a.readAsDataURL(e))
        },
        insertImageToTextarea(e, t) {
          const s = document.createElement('img')
          ;((s.src = e),
            (s.alt = t),
            (s.style.maxWidth = '10rem'),
            (s.style.maxHeight = '10rem'))
          const a = document.createRange()
          ;(a.selectNodeContents(this.textareaRef), a.collapse(!1))
          const i = window.getSelection()
          ;(i.removeAllRanges(), i.addRange(a))
          const o = a.createContextualFragment(`<span>${s.outerHTML}</span>`)
          ;(a.insertNode(o),
            setTimeout(() => {
              const e = document.createRange()
              ;(e.selectNodeContents(this.textareaRef), e.collapse(!1))
              const t = window.getSelection()
              ;(t.removeAllRanges(), t.addRange(e))
            }, 0))
        },
        initLLMExtraOptions() {
          const e = V.config.getLlmModels()
          this.openaiModels = Object.entries(e).map(([e, t]) => ({
            value: e,
            label: e,
            children: t.map((e) => ({
              value: e.owner,
              label: e.owner,
              children: e.models.map((e) => ({ value: e, label: e })),
            })),
          }))
        },
        getOpenaiModelArray: (e) => [V.config.getModelOwner(e), e],
        wrapText(e) {
          const t = this.getOnebotPreset()
          if (!this.selectedOption || !t) return e
          return t.replace('{xxx}', e)
        },
        getOnebotPreset() {
          const e = this.onebotPresets
            .reduce((e = [], t) => [...e, ...(t.children ?? [t])], [])
            .find((e) => e.value == this.selectedOption)?.preset
          return e
        },
        loadSelected() {
          'onebot' === this.activeContactor.platform
            ? this.activeContactor.preset &&
              (this.selectedOption = this.activeContactor.preset)
            : (this.initLLMExtraOptions(),
              (this.selectedOption = this.activeContactor.options.base.model))
        },
        adjustTextareaHeight() {
          const e = this.textareaRef
          ;((e.style.height = 'auto'), (e.style.height = e.scrollHeight + 'px'))
        },
        getWraperName() {
          const e = this.getOnebotPreset()
          if ('onebot' === this.activeContactor.platform && e) {
            if (!this.selectedOption) return ''
            return e.replace('#', '').replace('{xxx}', '')
          }
          return ''
        },
        waiting() {
          this.$message({ message: '此功能尚未开放', type: 'warning' })
        },
        getemoji(e) {
          const t = this.textareaRef
          t.focus()
          const s = document.createRange(),
            a = window.getSelection()
          if (!a) return
          const i = e.detail.unicode,
            o = this.cursorPosition[0],
            n = this.cursorPosition[1],
            l = this.userInput.substring(0, o),
            r = this.userInput.substring(n)
          ;((this.userInput = l + i + r),
            (t.innerHTML = this.userInput),
            setTimeout(() => {
              ;(s.setStart(t.firstChild, o + i.length),
                s.setEnd(t.firstChild, o + i.length),
                a.removeAllRanges(),
                a.addRange(s),
                (this.cursorPosition = [o + i.length, o + i.length]))
            }, 0),
            this.ctrlEmojiPanel())
        },
        updateCursorPosition() {
          const e = window.getSelection()
          if (e && e.rangeCount > 0) {
            const t = e.getRangeAt(0)
            ;((this.cursorPosition[0] = t.startOffset),
              (this.cursorPosition[1] = t.endOffset))
          }
        },
        presend() {
          this.textareaRef.focus()
          const e = this.textareaRef.querySelectorAll('img'),
            t = Array.from(e).map((e) => e.src)
          let s = this.getSafeText(this.userInput)
          const a =
            'onebot' === this.activeContactor.platform ? this.wrapText(s) : s
          ;((this.userInput = this.textareaRef.innerHTML = ''),
            this.adjustTextareaHeight())
          const i = this.activeContactor.getBaseUserContainer()
          if (
            (i.content.push({ type: 'text', data: { text: a } }),
            t.forEach((e) => {
              i.content.unshift({ type: 'image', data: { file: e } })
            }),
            this.repliedMessageId)
          ) {
            const e = { type: 'reply', data: { id: this.repliedMessageId } }
            i.content.push(e)
          }
          return i
        },
        async send() {
          this.$emit('toButtom')
          const e = this.presend()
          try {
            const t = await this.activeContactor.webSend(e)
            ;((e.id = t),
              this.$emit('stroge'),
              (this.uploaded.images = []),
              (this.uploaded.files = []))
          } catch (t) {
            this.$message.error('发送消息失败')
          }
        },
        getSafeText: (e) => e,
        cleanScreen() {
          this.$emit('cleanScreen')
        },
        currentChange(e, t) {
          if (3 === t.level) {
            if (!t.parent || !t.parent.parent) return
            const s = [t.parent.parent.data.value, t.parent.data.value, e.value]
            this.$message({
              message: '已切换到 ' + s[2] + ' 模型',
              type: 'success',
            })
            const a = s[0]
            ;(a !== this.activeContactor.options?.provider &&
              this.$message({
                message: '已切换到 ' + a + ' 协议',
                type: 'success',
              }),
              this.$emit('setModel', s))
          } else
            2 === t.level &&
              'onebot' === this.activeContactor.platform &&
              this.getOnebotPreset() &&
              !this.getOnebotPreset().includes('xxx') &&
              this.send()
        },
        isValidInput: (e) => e.trim().length > 0,
        handleKeyDown(e) {
          ;('Enter' === e.key &&
            (e.ctrlKey
              ? this.userInput && this.isValidInput(this.userInput)
                ? this.send()
                : this.$message({ message: '不能发送空消息', type: 'warning' })
              : (this.userInput += '\n')),
            setTimeout(() => {
              this.updateCursorPosition()
            }, 0))
        },
        handleInput() {
          this.isPasting || (this.userInput = this.textareaRef.innerText)
        },
      },
    },
    [
      [
        'render',
        function (e, a, o, n, l, r) {
          const m = h('el-tree-select'),
            y = h('el-popconfirm')
          return (
            i(),
            t('div', pe, [
              s('div', fe, [
                s('div', ye, [
                  g(
                    s(
                      'emoji-picker',
                      {
                        ref: 'emojiPicker',
                        onEmojiClick:
                          a[0] ||
                          (a[0] = (...e) => r.getemoji && r.getemoji(...e)),
                      },
                      null,
                      544,
                    ),
                    [[u, l.showemoji]],
                  ),
                  a[11] || (a[11] = s('p', { class: 'ho-emoji' }, '表情', -1)),
                  s('i', {
                    class: 'iconfont smile',
                    onClick:
                      a[1] ||
                      (a[1] = p(
                        (...e) => r.ctrlEmojiPanel && r.ctrlEmojiPanel(...e),
                        ['prevent'],
                      )),
                  }),
                ]),
                s('div', ve, [
                  s(
                    'p',
                    Ce,
                    c(
                      'openai' == o.activeContactor.platform
                        ? '模型选择'
                        : '工具选择',
                    ),
                    1,
                  ),
                  d(
                    m,
                    {
                      id: 'wraper-selector',
                      modelValue: l.selectedOption,
                      'onUpdate:modelValue':
                        a[2] || (a[2] = (e) => (l.selectedOption = e)),
                      data: r.extraOptions,
                      accordion: '',
                      placement: 'top-start',
                      onNodeClick: r.currentChange,
                    },
                    null,
                    8,
                    ['modelValue', 'data', 'onNodeClick'],
                  ),
                  a[12] ||
                    (a[12] = s('i', { class: 'iconfont robot' }, null, -1)),
                ]),
                s('div', we, [
                  a[13] ||
                    (a[13] = s('p', { class: 'ho-emoji' }, '重置人格', -1)),
                  s('i', {
                    class: 'iconfont reset',
                    onClick: a[3] || (a[3] = (t) => e.$emit('cleanHistory')),
                  }),
                ]),
                s('div', Se, [
                  a[14] || (a[14] = s('p', { class: 'ho-emoji' }, '上传', -1)),
                  s('i', {
                    class: 'iconfont upload',
                    onClick:
                      a[4] ||
                      (a[4] = (...e) => r.uploadFile && r.uploadFile(...e)),
                  }),
                ]),
                s('div', be, [
                  a[16] ||
                    (a[16] = s('p', { class: 'ho-emoji' }, '清除记录', -1)),
                  d(
                    y,
                    {
                      class: 'box-item',
                      title: '此操作不可撤销',
                      'confirm-button-text': '确定',
                      'cancel-button-text': '取消',
                      placement: 'top',
                      onConfirm: a[5] || (a[5] = (t) => e.$emit('cleanScreen')),
                    },
                    {
                      reference: f(
                        () =>
                          a[15] ||
                          (a[15] = [
                            s('i', { class: 'iconfont shanchu' }, null, -1),
                          ]),
                      ),
                      _: 1,
                    },
                  ),
                ]),
                s('div', Le, [
                  a[17] || (a[17] = s('p', { class: 'ho-emoji' }, '更多', -1)),
                  s('i', {
                    class: 'iconfont more',
                    onClick:
                      a[6] ||
                      (a[6] = (...e) =>
                        r.unsupportedTip && r.unsupportedTip(...e)),
                  }),
                ]),
              ]),
              s('div', Me, [
                s('div', xe, [
                  s(
                    'div',
                    {
                      ref: 'textarea',
                      class: 'input-area',
                      'v-html': l.userInput,
                      contenteditable: 'true',
                      placeholder: '按 Ctrl + Enter 以发送消息',
                      onKeydown:
                        a[7] ||
                        (a[7] = (...e) =>
                          r.handleKeyDown && r.handleKeyDown(...e)),
                      onInput:
                        a[8] ||
                        (a[8] = (...e) => r.handleInput && r.handleInput(...e)),
                      onClick:
                        a[9] ||
                        (a[9] = (...e) =>
                          r.updateCursorPosition &&
                          r.updateCursorPosition(...e)),
                    },
                    null,
                    40,
                    ke,
                  ),
                ]),
                s(
                  'button',
                  {
                    id: 'sendButton',
                    disabled: !l.userInput || !r.isValidInput(l.userInput),
                    onClick:
                      a[10] ||
                      (a[10] = p(
                        (...e) => r.send && r.send(...e),
                        ['prevent'],
                      )),
                  },
                  ' 发送' +
                    c(r.getWraperName() ? ` | ${r.getWraperName()}` : ''),
                  9,
                  _e,
                ),
              ]),
            ])
          )
        },
      ],
      ['__scopeId', 'data-v-7a904a44'],
    ],
  ),
  Pe = { class: 'file-block' },
  Ie = { class: 'file-block-icon' },
  Oe = { key: 0 },
  Ee = { class: 'file-block-text' },
  Ae = ['title'],
  De = { class: 'file-info' }
const $e = F(
    {
      props: { fileUrl: { type: String, required: !0 } },
      data: () => ({ file_name: '', file_type: '', formated_file_size: '' }),
      computed: {
        iconClass() {
          const e = this.file_type.toLowerCase()
          return 'pdf' === e
            ? 'file-icon-pdf'
            : ['xls', 'xlsx', 'csv'].includes(e)
              ? 'file-icon-spreadsheet'
              : ['doc', 'docx'].includes(e)
                ? 'file-icon-word'
                : ['ppt', 'pptx'].includes(e)
                  ? 'file-icon-ppt'
                  : 'file-icon-other'
        },
      },
      created() {
        const e = this.fileUrl.split('?'),
          t = new URLSearchParams(e[1]),
          s = t.get('size')
        ;((this.file_name = t.get('name')),
          (this.formated_file_size = this.formatFileSize(s)))
        const a = e[0].split('.')
        this.file_type = a[a.length - 1]
      },
      methods: {
        formatFileSize(e) {
          let t = 0
          for (; e >= 1024; ) ((e /= 1024), t++)
          return e.toFixed(2) + ' ' + ['B', 'KB', 'MB'][t]
        },
      },
    },
    [
      [
        'render',
        function (e, o, l, r, d, h) {
          return (
            i(),
            t('div', Pe, [
              s('div', Ie, [
                s(
                  'div',
                  { class: a(['file-icon', h.iconClass]) },
                  [
                    d.file_type
                      ? (i(), t('span', Oe, c(d.file_type.toUpperCase()), 1))
                      : n('', !0),
                  ],
                  2,
                ),
              ]),
              s('div', Ee, [
                s(
                  'div',
                  { class: 'file-name', title: d.file_name },
                  c(d.file_name),
                  9,
                  Ae,
                ),
                s(
                  'div',
                  De,
                  c(d.file_type.toUpperCase()) + ', ' + c(d.formated_file_size),
                  1,
                ),
              ]),
            ])
          )
        },
      ],
      ['__scopeId', 'data-v-f2fa73bf'],
    ],
  ),
  Re = { class: 'tool-call-bar' },
  Ue = { class: 'status-icon' },
  je = { key: 0, class: 'call-success-icon' },
  Be = { key: 1, class: 'call-fail-icon' },
  Ne = { key: 2, class: 'call-pend-icon' },
  qe = { class: 'tool-info' },
  Ve = { class: 'tool-name' },
  Fe = { class: 'tool-status' },
  He = { class: 'extra-info' },
  Ge = { class: 'extra-detail' },
  We = { class: 'detail-params' },
  ze = { class: 'detail-content' },
  Je = { class: 'detail-result' },
  Ke = { class: 'detail-content' }
const Ye = F(
    {
      props: { toolCall: { type: Object, required: !0 } },
      data: () => ({ showExtraInfo: !1 }),
      computed: {
        toolCallSuccess() {
          return (
            'finished' === this.toolCall.action && !this.toolCall?.result?.error
          )
        },
        toolCallFail() {
          return (
            'finished' === this.toolCall.action && this.toolCall?.result?.error
          )
        },
        call_status() {
          return 'started' == this.toolCall.action
            ? '开始运行'
            : 'pending' == this.toolCall.action
              ? '函数构建中'
              : 'running' == this.toolCall.action
                ? '函数运行中'
                : this.toolCallSuccess
                  ? '函数运行成功'
                  : this.toolCallFail
                    ? '函数运行失败'
                    : '未知状态'
        },
      },
      mounted() {},
    },
    [
      [
        'render',
        function (e, o, n, l, r, d) {
          return (
            i(),
            t('div', Re, [
              s('div', Ue, [
                d.toolCallSuccess
                  ? (i(),
                    t(
                      'span',
                      je,
                      o[1] ||
                        (o[1] = [
                          s(
                            'div',
                            { class: 'checkmark-container' },
                            [
                              s(
                                'svg',
                                {
                                  class: 'checkmark',
                                  viewBox: '0 0 52 36',
                                  xmlns: 'http://www.w3.org/2000/svg',
                                },
                                [s('polyline', { points: '1 20 15 36 51 1' })],
                              ),
                            ],
                            -1,
                          ),
                        ]),
                    ))
                  : d.toolCallFail
                    ? (i(), t('span', Be, '❌'))
                    : (i(), t('span', Ne)),
              ]),
              s('div', qe, [
                s('div', null, [
                  s('span', Ve, c(n.toolCall.name.split('_mid_')[0]), 1),
                ]),
                s('div', Fe, c(d.call_status), 1),
              ]),
              s('div', He, [
                s(
                  'button',
                  {
                    ref: 'show-extra-info',
                    class: a({
                      active: r.showExtraInfo,
                      'extra-info-button': !0,
                    }),
                    onClick:
                      o[0] ||
                      (o[0] = (e) => (r.showExtraInfo = !r.showExtraInfo)),
                  },
                  o[2] ||
                    (o[2] = [
                      s(
                        'svg',
                        {
                          t: '1731677922196',
                          class: 'icon',
                          viewBox: '0 0 1024 1024',
                          version: '1.1',
                          xmlns: 'http://www.w3.org/2000/svg',
                          'p-id': '5948',
                          width: '16',
                          height: '16',
                        },
                        [
                          s('path', {
                            d: 'M778.965749 128.759549l-383.064442 383.063419 388.097062 388.096039-0.070608 0.033769c12.709463 13.137205 20.529569 31.024597 20.529569 50.731428 0 40.376593-32.736589 73.112158-73.115228 73.112158-19.705807 0-37.591153-7.819083-50.730405-20.528546l-0.034792 0.035816L241.890654 564.622498l0.035816-0.035816c-13.779841-13.281491-22.3838-31.915897-22.3838-52.585659 0-0.071631 0-0.106424 0-0.178055 0-0.072655 0-0.10847 0-0.144286 0-20.669762 8.603959-39.341007 22.3838-52.622498l-0.035816-0.034792L680.573835 20.337187l0.180102 0.179079c13.139252-12.5662 30.950919-20.313651 50.587142-20.313651 40.378639 0 73.115228 32.736589 73.115228 73.114205C804.455283 95.485725 794.567076 115.334795 778.965749 128.759549z',
                            'p-id': '5949',
                          }),
                        ],
                        -1,
                      ),
                    ]),
                  2,
                ),
              ]),
              s(
                'div',
                { class: a({ active: r.showExtraInfo, 'extra-info-bar': !0 }) },
                [
                  s('div', Ge, [
                    s('div', We, [
                      o[3] ||
                        (o[3] = s(
                          'div',
                          { class: 'detail-title' },
                          '参数',
                          -1,
                        )),
                      s('div', ze, c(n.toolCall.parameters), 1),
                    ]),
                    s('div', Je, [
                      o[4] ||
                        (o[4] = s(
                          'div',
                          { class: 'detail-title' },
                          '返回值',
                          -1,
                        )),
                      s('div', Ke, c(n.toolCall.result), 1),
                    ]),
                  ]),
                ],
                2,
              ),
            ])
          )
        },
      ],
      ['__scopeId', 'data-v-aef1ba4f'],
    ],
  ),
  Xe = { class: 'reason-block' },
  Ze = { class: 'head-bar' },
  Qe = { class: 'reason-info' }
const et = F(
    {
      props: {
        content: { required: !0, type: String, default: '' },
        startTime: { required: !0, type: Number },
        endTime: { required: !1, type: Number, default: 0 },
      },
      data: () => ({ show: !0, maxHeight: 'auto' }),
      computed: {
        getReasonInfo() {
          if (this.endTime) {
            return `已深度思考（耗时 ${((this.endTime - this.startTime) / 1e3).toFixed(2)} 秒）`
          }
          return '正在深度思考......'
        },
      },
      mounted() {
        this.updateMaxHeight()
      },
      updated() {
        this.updateMaxHeight()
      },
      methods: {
        toggleShow() {
          ;((this.show = !this.show), this.updateMaxHeight())
        },
        updateMaxHeight() {
          this.show
            ? (this.maxHeight =
                this.$refs.reasonContent.scrollHeight + 20 + 'px')
            : (this.maxHeight = '0px')
        },
      },
    },
    [
      [
        'render',
        function (e, o, n, l, r, d) {
          return (
            i(),
            t('div', Xe, [
              s('div', Ze, [
                s('div', Qe, c(d.getReasonInfo), 1),
                s(
                  'button',
                  {
                    class: a({ active: r.show, 'extra-info-button': !0 }),
                    onClick:
                      o[0] ||
                      (o[0] = (...e) => d.toggleShow && d.toggleShow(...e)),
                  },
                  o[1] ||
                    (o[1] = [
                      s('i', { class: 'iconfont icon-return' }, null, -1),
                    ]),
                  2,
                ),
              ]),
              s(
                'div',
                {
                  ref: 'reasonContent',
                  class: 'reason-content',
                  style: y({ 'max-height': r.maxHeight }),
                },
                c(n.content),
                5,
              ),
            ])
          )
        },
      ],
      ['__scopeId', 'data-v-81bd691d'],
    ],
  ),
  tt = { id: 'message-menu' }
const st = F(
    {
      name: 'MessageMenu',
      props: {
        type: { type: String, default: 'message' },
        message: { type: Object, default: () => ({}) },
        seletedText: { type: String, default: '' },
        seletedImage: { type: String, default: '' },
      },
      emits: ['close', 'message-option'],
      methods: {
        async copySeletedImage() {
          this.$emit('close')
          try {
            await this.copyImageToClipboard(this.seletedImage)
          } catch (e) {}
        },
        async saveSeletedImage() {
          this.$emit('close')
          try {
            await this.downloadImage(this.seletedImage)
          } catch (e) {}
        },
        copyText() {
          let e = ''
          ;(this.message.content.forEach((t) => {
            'text' === t.type
              ? (e += t.data.text)
              : 'image' === t.type && (e += `\n![图片](${t.data.file})`)
          }),
            this.copyTextToClipboard(e),
            this.$emit('close'))
        },
        copySeletedText() {
          ;(this.copyTextToClipboard(this.seletedText), this.$emit('close'))
        },
        retryMessage() {
          ;(this.$emit('message-option', 'retry'), this.$emit('close'))
        },
        replyMessage() {
          ;(this.$emit('message-option', 'reply'), this.$emit('close'))
        },
        deleteMessage() {
          ;(this.$emit('message-option', 'delete'), this.$emit('close'))
        },
        enterChat() {
          ;(this.$emit('message-option', 'enter'), this.$emit('close'))
        },
        togglePriority() {
          ;(this.$emit('message-option', 'priority'), this.$emit('close'))
        },
        shareBot() {
          ;(this.$emit('message-option', 'share'), this.$emit('close'))
        },
        deleteBot() {
          ;(this.$emit('message-option', 'delete'), this.$emit('close'))
        },
        async copyTextToClipboard(e) {
          let t
          try {
            ;((t = document.createElement('textarea')),
              (t.style.position = 'absolute'),
              (t.style.left = '-9999px'),
              (t.value = e),
              document.body.appendChild(t),
              t.select(),
              t.setSelectionRange(0, 99999),
              await document.execCommand('copy'),
              this.$message({ message: '复制成功', type: 'success' }))
          } catch (s) {
            this.$message({ message: '复制失败', type: 'error' })
          } finally {
            document.body.removeChild(t)
          }
        },
        async copyImageToClipboard(e) {
          try {
            const t = await fetch(e)
            if (!t.ok) throw new Error('网络错误，无法获取图片')
            const s = await t.blob(),
              a = new Image(),
              i = URL.createObjectURL(s)
            ;((a.onload = async () => {
              const e = document.createElement('canvas')
              ;((e.width = a.width), (e.height = a.height))
              e.getContext('2d').drawImage(a, 0, 0)
              const t = await new Promise((t) => {
                e.toBlob(t, 'image/png')
              })
              if (t) {
                const e = new ClipboardItem({ 'image/png': t })
                ;(await navigator.clipboard.write([e]),
                  this.$message({
                    message: '图片已复制到剪贴板',
                    type: 'success',
                  }))
              } else
                this.$message({ message: '转换为 PNG 失败', type: 'error' })
              URL.revokeObjectURL(i)
            }),
              (a.onerror = () => {
                ;(this.$message({ message: '加载图片失败', type: 'error' }),
                  URL.revokeObjectURL(i))
              }),
              (a.src = i))
          } catch (t) {
            this.$message({ message: '复制图片失败', type: 'error' })
          }
        },
        async downloadImage(e) {
          try {
            const t = document.createElement('a')
            ;((t.href = e), (t.download = 'image.png'), t.click())
          } catch (t) {
            this.$message({ message: '保存图片失败', type: 'error' })
          }
        },
      },
    },
    [
      [
        'render',
        function (e, a, o, r, d, h) {
          return (
            i(),
            t('div', tt, [
              'friend' === o.type
                ? (i(),
                  t(
                    l,
                    { key: 0 },
                    [
                      s(
                        'div',
                        {
                          onClick:
                            a[0] ||
                            (a[0] = p(
                              (...e) => h.enterChat && h.enterChat(...e),
                              ['stop'],
                            )),
                        },
                        a[11] ||
                          (a[11] = [
                            s('i', { class: 'iconfont chat' }, null, -1),
                            s('span', null, '进入对话', -1),
                          ]),
                      ),
                      s(
                        'div',
                        {
                          onClick:
                            a[1] ||
                            (a[1] = p(
                              (...e) =>
                                h.togglePriority && h.togglePriority(...e),
                              ['stop'],
                            )),
                        },
                        [
                          a[12] ||
                            (a[12] = s(
                              'i',
                              { class: 'iconfont star' },
                              null,
                              -1,
                            )),
                          s(
                            'span',
                            null,
                            c(0 === o.message.priority ? '取消置顶' : '置顶'),
                            1,
                          ),
                        ],
                      ),
                      s(
                        'div',
                        {
                          onClick:
                            a[2] ||
                            (a[2] = p(
                              (...e) => h.shareBot && h.shareBot(...e),
                              ['stop'],
                            )),
                        },
                        a[13] ||
                          (a[13] = [
                            s('i', { class: 'iconfont icon-share' }, null, -1),
                            s('span', null, '分享', -1),
                          ]),
                      ),
                      s(
                        'div',
                        {
                          onClick:
                            a[3] ||
                            (a[3] = p(
                              (...e) => h.deleteBot && h.deleteBot(...e),
                              ['stop'],
                            )),
                        },
                        a[14] ||
                          (a[14] = [
                            s('i', { class: 'iconfont shanchu' }, null, -1),
                            s('span', null, '删除', -1),
                          ]),
                      ),
                    ],
                    64,
                  ))
                : (i(),
                  t(
                    l,
                    { key: 1 },
                    [
                      o.seletedText
                        ? (i(),
                          t(
                            'div',
                            {
                              key: 0,
                              onClick:
                                a[4] ||
                                (a[4] = p(
                                  (...e) =>
                                    h.copySeletedText &&
                                    h.copySeletedText(...e),
                                  ['stop'],
                                )),
                            },
                            a[15] ||
                              (a[15] = [
                                s('i', { class: 'iconfont fuzhi' }, null, -1),
                                s('span', null, '复制选中', -1),
                              ]),
                          ))
                        : n('', !0),
                      s(
                        'div',
                        {
                          onClick:
                            a[5] ||
                            (a[5] = p(
                              (...e) => h.copyText && h.copyText(...e),
                              ['stop'],
                            )),
                        },
                        a[16] ||
                          (a[16] = [
                            s('i', { class: 'iconfont fuzhi' }, null, -1),
                            s('span', null, '复制消息', -1),
                          ]),
                      ),
                      o.seletedImage
                        ? (i(),
                          t(
                            'div',
                            {
                              key: 1,
                              onClick:
                                a[6] ||
                                (a[6] = p(
                                  (...e) =>
                                    h.copySeletedImage &&
                                    h.copySeletedImage(...e),
                                  ['stop'],
                                )),
                            },
                            a[17] ||
                              (a[17] = [
                                s('i', { class: 'iconfont fuzhi' }, null, -1),
                                s('span', null, '复制图片', -1),
                              ]),
                          ))
                        : n('', !0),
                      o.seletedImage
                        ? (i(),
                          t(
                            'div',
                            {
                              key: 2,
                              onClick:
                                a[7] ||
                                (a[7] = p(
                                  (...e) =>
                                    h.saveSeletedImage &&
                                    h.saveSeletedImage(...e),
                                  ['stop'],
                                )),
                            },
                            a[18] ||
                              (a[18] = [
                                s('i', { class: 'iconfont fuzhi' }, null, -1),
                                s('span', null, '保存图片', -1),
                              ]),
                          ))
                        : n('', !0),
                      s(
                        'div',
                        {
                          onClick:
                            a[8] ||
                            (a[8] = p(
                              (...e) => h.retryMessage && h.retryMessage(...e),
                              ['stop'],
                            )),
                        },
                        a[19] ||
                          (a[19] = [
                            s('i', { class: 'iconfont reset' }, null, -1),
                            s('span', null, '重试消息', -1),
                          ]),
                      ),
                      s(
                        'div',
                        {
                          onClick:
                            a[9] ||
                            (a[9] = p(
                              (...e) => h.replyMessage && h.replyMessage(...e),
                              ['stop'],
                            )),
                        },
                        a[20] ||
                          (a[20] = [
                            s('i', { class: 'iconfont yinyong' }, null, -1),
                            s('span', null, '引用消息', -1),
                          ]),
                      ),
                      s(
                        'div',
                        {
                          onClick:
                            a[10] ||
                            (a[10] = p(
                              (...e) =>
                                h.deleteMessage && h.deleteMessage(...e),
                              ['stop'],
                            )),
                        },
                        a[21] ||
                          (a[21] = [
                            s('i', { class: 'iconfont shanchu' }, null, -1),
                            s('span', null, '删除消息', -1),
                          ]),
                      ),
                    ],
                    64,
                  )),
            ])
          )
        },
      ],
      ['__scopeId', 'data-v-8936958f'],
    ],
  ),
  at = { class: 'add-contactor' },
  it = { class: 'head' },
  ot = { class: 'body' },
  nt = { class: 'search' },
  lt = { class: 'info' },
  rt = { class: 'presets-types' },
  ct = ['onClick'],
  dt = { key: 0, class: 'presets-list' },
  ht = { key: 0, class: 'preset-avatar custom' },
  mt = ['src'],
  gt = { key: 1, class: 'preset-avatar model' },
  ut = ['src'],
  pt = { key: 2, class: 'preset-avatar' },
  ft = { class: 'preset-info' },
  yt = { class: 'preset-name' },
  vt = ['title'],
  Ct = { ref: 'loader', class: 'loading' },
  wt = { key: 1, class: 'empty-list' }
const St = { id: 'friendlists', ref: 'friendlists' },
  bt = { id: 'friends', class: 'upsidebar' },
  Lt = { class: 'bu-add' },
  Mt = { id: 'add-options' },
  xt = ['onClick'],
  kt = { class: 'people' },
  _t = ['id', 'onClick', 'onContextmenu'],
  Tt = ['src', 'alt'],
  Pt = { class: 'info' },
  It = { class: 'name' },
  Ot = { id: 'time', class: 'msginfo' },
  Et = { id: 'msgctt', class: 'msginfo' }
const At = F(
    {
      components: {
        AddContactor: F(
          {
            emits: ['addBot', 'close'],
            data: () => ({
              show: !1,
              presetsList: [],
              recommendPresets: [],
              recentPresets: [],
              localPresets: [],
              systemPresets: [],
              searchPresets: [],
              systemShownNum: 0,
              recommendShownNum: 0,
              keyWord: '',
              activeTypeIndex: 0,
              buttonTranslate: 0,
              avaliablePresetTypes: ['推荐', '最近', '本地', '系统'],
              moreSystemPresets: !0,
              moreRecommendPresets: !0,
              observer: null,
              Contactor: $,
            }),
            computed: {
              showPresetsLoader() {
                return 3 == this.activeTypeIndex
                  ? this.moreSystemPresets
                  : 0 == this.activeTypeIndex && this.moreRecommendPresets
              },
              shownPrestsList() {
                return this.keyWord
                  ? this.searchPresets
                  : 2 === this.activeTypeIndex
                    ? this.localPresets
                    : 1 === this.activeTypeIndex
                      ? this.recentPresets
                      : 0 === this.activeTypeIndex
                        ? this.recommendPresets
                        : 3 === this.activeTypeIndex
                          ? this.systemPresets
                          : null
              },
            },
            async mounted() {
              if (
                (this.getAddHistory(),
                await this.loadSpecificType(),
                'IntersectionObserver' in window)
              ) {
                const e = (e) => {
                  e.forEach((e) => {
                    e.isIntersecting && this.loadMoreData()
                  })
                }
                this.observer = new IntersectionObserver(e)
                const t = this.$refs.loader
                t && this.observer.observe(t)
              } else window.addEventListener('scroll', this.handleScroll)
            },
            beforeUnmount() {
              this.observer
                ? this.observer.disconnect()
                : window.removeEventListener('scroll', this.handleScroll)
            },
            methods: {
              async addBot(e) {
                ;(this.strogeAddHistory(e),
                  this.$emit('addBot', e),
                  this.$message.success('添加成功'))
              },
              strogeAddHistory(e) {
                const t = this.recentPresets.find((t) => t.name === e.name)
                ;(t &&
                  this.recentPresets.splice(this.recentPresets.indexOf(t), 1),
                  this.recentPresets.unshift(e),
                  this.recentPresets.length > 10 && this.recentPresets.pop(),
                  localStorage.setItem(
                    'addHistory',
                    JSON.stringify(this.recentPresets),
                  ))
              },
              getAddHistory() {
                const e = localStorage.getItem('addHistory')
                e && (this.recentPresets = JSON.parse(e))
              },
              async changeShownType(e) {
                ;((this.activeTypeIndex = e),
                  (this.buttonTranslate = 49.6 * e + 'px'),
                  await this.loadSpecificType())
              },
              close() {
                this.$emit('close')
              },
              async loadSpecificType() {
                const e = this.avaliablePresetTypes[this.activeTypeIndex]
                this.presetsList = await this.getPresetList(e)
              },
              async getPresetList(e) {
                return '系统' === e
                  ? await this.loadSystemPresets()
                  : '推荐' === e
                    ? await this.loadRecommendedPresets()
                    : '最近' === e
                      ? this.recentPresets
                      : '本地' === e
                        ? this.localPresets
                        : void 0
              },
              async loadRecommendedPresets() {
                const e = await fetch(
                  `/api/openai/presets?type=recommended&start=${this.recommendShownNum}`,
                ).then((e) => e.json())
                for (let t = 0; t < e.data.length; t++)
                  this.recommendPresets.push(e.data[t])
                return (
                  (this.recommendShownNum += e.data.length),
                  e.data.length < 9 && (this.moreRecommendPresets = !1),
                  this.recommendPresets
                )
              },
              async loadSystemPresets() {
                const e = await fetch(
                  `/api/openai/presets?type=system&start=${this.systemShownNum}`,
                ).then((e) => e.json())
                for (let t = 0; t < e.data.length; t++)
                  this.systemPresets.push(e.data[t])
                return (
                  (this.systemShownNum += e.data.length),
                  e.data.length < 9 && (this.moreSystemPresets = !1),
                  this.systemPresets
                )
              },
              async loadSerachPresets() {
                const e = async () => {
                  const e = await fetch(
                    `/api/openai/presets?type=search&keyword=${this.keyWord}`,
                  ).then((e) => e.json())
                  this.searchPresets = e.data
                }
                ;(this.searchTimer && clearTimeout(this.searchTimer),
                  (this.searchTimer = setTimeout(() => {
                    e()
                  }, 500)))
              },
              loadMoreData() {
                this.showPresetsLoader && 3 === this.activeTypeIndex
                  ? this.loadSystemPresets()
                  : this.showPresetsLoader &&
                    0 === this.activeTypeIndex &&
                    this.loadRecommendedPresets()
              },
              handleScroll() {
                const e = this.$refs.loader
                if (!e) return
                const t = e.getBoundingClientRect()
                t.top >= 0 &&
                  t.left >= 0 &&
                  t.bottom <=
                    (window.innerHeight ||
                      document.documentElement.clientHeight) &&
                  t.right <=
                    (window.innerWidth ||
                      document.documentElement.clientWidth) &&
                  this.loadMoreData()
              },
            },
          },
          [
            [
              'render',
              function (e, o, n, m, p, w) {
                const S = h('el-button'),
                  b = h('el-empty')
                return (
                  i(),
                  t('div', at, [
                    s('div', it, [
                      o[3] ||
                        (o[3] = s('div', { class: 'title' }, '添加机器人', -1)),
                      s(
                        'div',
                        {
                          class: 'close-icon',
                          onClick:
                            o[0] || (o[0] = (...e) => w.close && w.close(...e)),
                        },
                        '✕',
                      ),
                    ]),
                    s('div', ot, [
                      s('div', nt, [
                        o[4] ||
                          (o[4] = s(
                            'i',
                            { class: 'iconfont sousuo listicon' },
                            null,
                            -1,
                          )),
                        g(
                          s(
                            'input',
                            {
                              'onUpdate:modelValue':
                                o[1] || (o[1] = (e) => (p.keyWord = e)),
                              type: 'text',
                              placeholder: '输入搜索关键词',
                              onInput:
                                o[2] ||
                                (o[2] = (...e) =>
                                  w.loadSerachPresets &&
                                  w.loadSerachPresets(...e)),
                            },
                            null,
                            544,
                          ),
                          [[v, p.keyWord]],
                        ),
                      ]),
                      s('div', lt, [
                        s('header', rt, [
                          (i(!0),
                          t(
                            l,
                            null,
                            r(
                              p.avaliablePresetTypes,
                              (e, s) => (
                                i(),
                                t(
                                  'nav',
                                  {
                                    key: s,
                                    class: a(
                                      p.activeTypeIndex === s ? 'active' : '',
                                    ),
                                    onClick: (e) => w.changeShownType(s),
                                  },
                                  c(e),
                                  11,
                                  ct,
                                )
                              ),
                            ),
                            128,
                          )),
                        ]),
                        s(
                          'div',
                          {
                            style: y({ left: p.buttonTranslate }),
                            class: 'slide-button',
                          },
                          null,
                          4,
                        ),
                        w.shownPrestsList.length > 0 ||
                        [0, 3].includes(p.activeTypeIndex)
                          ? (i(),
                            t('div', dt, [
                              (i(!0),
                              t(
                                l,
                                null,
                                r(
                                  w.shownPrestsList,
                                  (e, a) => (
                                    i(),
                                    t(
                                      'div',
                                      { key: a, class: 'presets-item' },
                                      [
                                        e.avatar
                                          ? (i(),
                                            t('div', ht, [
                                              s(
                                                'img',
                                                { src: e.avatar },
                                                null,
                                                8,
                                                mt,
                                              ),
                                            ]))
                                          : e.model
                                            ? (i(),
                                              t('div', gt, [
                                                s(
                                                  'img',
                                                  {
                                                    src: p.Contactor.getAvatarByModel(
                                                      e.model,
                                                    ),
                                                  },
                                                  null,
                                                  8,
                                                  ut,
                                                ),
                                              ]))
                                            : (i(),
                                              t(
                                                'div',
                                                pt,
                                                c(e.name.slice(0, 2)),
                                                1,
                                              )),
                                        s('div', ft, [
                                          s('div', yt, c(e.name), 1),
                                          s(
                                            'div',
                                            {
                                              title: e.opening,
                                              class: 'preset-description',
                                            },
                                            c(e.opening),
                                            9,
                                            vt,
                                          ),
                                        ]),
                                        d(
                                          S,
                                          { onClick: (t) => w.addBot(e) },
                                          {
                                            default: f(
                                              () =>
                                                o[5] || (o[5] = [C('添加')]),
                                            ),
                                            _: 2,
                                          },
                                          1032,
                                          ['onClick'],
                                        ),
                                      ],
                                    )
                                  ),
                                ),
                                128,
                              )),
                              g(
                                s(
                                  'div',
                                  Ct,
                                  o[6] ||
                                    (o[6] = [
                                      s('div', null, null, -1),
                                      s('div', null, null, -1),
                                      s('div', null, null, -1),
                                      s('div', null, null, -1),
                                      s('div', null, null, -1),
                                    ]),
                                  512,
                                ),
                                [[u, w.showPresetsLoader]],
                              ),
                            ]))
                          : (i(), t('div', wt, [d(b, { 'image-size': 200 })])),
                      ]),
                      o[7] || (o[7] = s('div', { class: 'options' }, null, -1)),
                    ]),
                  ])
                )
              },
            ],
            ['__scopeId', 'data-v-5f6ecc2e'],
          ],
        ),
        ContextMenu: st,
      },
      data: () => ({
        contactorList: [],
        showAddOptions: !1,
        showAddWindow: !1,
        showMenu: !1,
        menuX: 0,
        menuY: 0,
        selectedFriend: null,
      }),
      computed: {
        sortedList() {
          return [...this.contactorList].sort((e, t) =>
            t.priority < e.priority ? 1 : t.lastUpdate - e.lastUpdate,
          )
        },
        avaliableProvideres: () => q.getLLMProviders().map((e) => e.value),
      },
      created() {
        0 == V.getContactors().length
          ? V.on(
              'loaded',
              () => {
                ;((this.contactorList = V.getContactors()),
                  this.addReactiveListener())
              },
              !1,
            )
          : ((this.contactorList = V.getContactors()),
            this.addReactiveListener())
      },
      methods: {
        genBotByPreset() {
          ;((this.showAddOptions = !1), (this.showAddWindow = !0))
        },
        showChat(e) {
          'blank' == this.$route.name || 'chat_view' == this.$route.name
            ? this.$router.push({ name: 'chat_view', params: { id: e } })
            : 'contactors' == this.$route.name ||
                'profile_view' == this.$route.name
              ? this.$router.push({ name: 'profile_view', params: { id: e } })
              : this.$router.replace({ name: 'chat_view', params: { id: e } })
        },
        getId(e) {
          return this.$route.params.id == e.id
            ? 'active'
            : 0 == e.priority
              ? 'important'
              : ''
        },
        async genBotByProvider(e) {
          const t = q.getLLMDefaultConfig(e),
            s = {
              id: this.genFakeId(),
              title: t.default_model,
              avatarPolicy: 0,
              namePolicy: 2,
              priority: 1,
              options: t,
            }
          ;((this.showAddOptions = !1),
            await V.addConcator('openai', s),
            this.addReactiveListener())
        },
        startResize(e) {
          ;((this.isResizing = !0),
            (this.startX = e.clientX),
            (this.startWidth = this.$refs.friendlists.offsetWidth),
            document.addEventListener('mousemove', this.resize),
            document.addEventListener('mouseup', this.stopResize))
        },
        resize(e) {
          if (this.isResizing) {
            let t = this.startWidth + (e.clientX - this.startX)
            const s = document.documentElement.style.fontSize
                ? parseFloat(document.documentElement.style.fontSize)
                : 16,
              a = 20 * s,
              i = 12 * s
            ;((t = t > a ? a : t < i ? i : t),
              (this.$refs.friendlists.style.minWidth = t + 'px'),
              (this.$refs.friendlists.style.maxWidth = t + 'px'))
          }
        },
        stopResize() {
          ;((this.isResizing = !1),
            document.removeEventListener('mousemove', this.resize),
            document.removeEventListener('mouseup', this.stopResize))
        },
        genFakeId() {
          const e = `1${Math.floor(1e3 + 9e3 * Math.random())}`
          if (this.id) {
            const e = Math.floor(1e3 + 9e3 * Math.random()),
              t = `${this.id}${e}`
            return parseInt(t)
          }
          return parseInt(e)
        },
        manageAddMenu() {
          this.showAddOptions = !this.showAddOptions
        },
        mergeOptions(e) {
          const t = q.getLLMDefaultConfig()
          if (
            (e.history && (t.presetSettings.history = e.history),
            e.tools && (t.toolCallSettings.tools = q.getValidTools(e.tools)),
            e.opening && (t.presetSettings.opening = e.opening),
            e.model)
          ) {
            const s = q
              .getLLMProviders()
              .map((e) => e.value)
              .find((t) => q.isModelAvailable(t, e.model))
            s
              ? ((t.provider = s), (t.base.model = e.model))
              : ((t.base.model = e.model),
                this.$message({
                  message: '预设模型不存在, 已使用默认模型',
                  type: 'error',
                }))
          }
          return t
        },
        async addPresetContactor(e) {
          const t = {
            id: this.genFakeId(),
            namePolicy: 1,
            avatarPolicy: e.avatar ? 1 : 0,
            avatar: e.avatar ? e.avatar : void 0,
            name: e.name,
            title: e.title,
            priority: 1,
            options: this.mergeOptions(e),
          }
          ;(await V.addConcator('openai', t), this.addReactiveListener())
        },
        showFriendContextMenu(e, t) {
          ;((this.selectedFriend = t),
            (this.menuX = e.clientX),
            (this.menuY = e.clientY),
            (this.showMenu = !0))
          const s = () => {
            ;((this.showMenu = !1), document.removeEventListener('click', s))
          }
          document.addEventListener('click', s)
        },
        async handleFriendOption(e) {
          switch (e) {
            case 'enter':
              this.showChat(this.selectedFriend.id)
              break
            case 'priority':
              ;((this.selectedFriend.priority =
                0 === this.selectedFriend.priority ? 1 : 0),
                V.setLocalStorage())
              break
            case 'share':
              ;(await V.shareContactor(this.selectedFriend.id))
                ? this.$message({ message: '分享链接已复制', type: 'success' })
                : this.$message({ message: '分享失败', type: 'error' })
              break
            case 'delete': {
              let e
              ;((e = this.contactorList.findIndex(
                (e) => e.id === this.selectedFriend.id,
              )),
                -1 !== e &&
                  (this.contactorList.splice(e, 1), V.setLocalStorage()))
              break
            }
          }
          this.showMenu = !1
        },
        addReactiveListener() {
          this.contactorList.map((e) => {
            e.on('updateMessageSummary', () => {
              ;((e.lastMessageSummary = e.getLastMessageSummary()),
                this.$forceUpdate())
            })
          })
        },
      },
    },
    [
      [
        'render',
        function (e, o, d, f, v, C) {
          const w = h('AddContactor'),
            S = h('ContextMenu')
          return (
            i(),
            t(
              'div',
              St,
              [
                s('div', bt, [
                  o[6] ||
                    (o[6] = s(
                      'div',
                      { class: 'search' },
                      [
                        s('i', { class: 'iconfont sousuo listicon' }),
                        s('input', {
                          id: 'main-search',
                          type: 'text',
                          placeholder: '搜索',
                        }),
                      ],
                      -1,
                    )),
                  s('div', Lt, [
                    s(
                      'button',
                      {
                        id: 'addcont',
                        title: 'Add Bot',
                        onClick:
                          o[0] ||
                          (o[0] = (...e) =>
                            C.manageAddMenu && C.manageAddMenu(...e)),
                      },
                      o[5] ||
                        (o[5] = [s('i', { class: 'iconfont add' }, null, -1)]),
                    ),
                    g(
                      s(
                        'div',
                        Mt,
                        [
                          s('ul', null, [
                            (i(!0),
                            t(
                              l,
                              null,
                              r(
                                C.avaliableProvideres,
                                (e, a) => (
                                  i(),
                                  t('li', { key: a }, [
                                    s(
                                      'button',
                                      { onClick: (t) => C.genBotByProvider(e) },
                                      ' 新建 ' + c(e) + ' Bot ',
                                      9,
                                      xt,
                                    ),
                                  ])
                                ),
                              ),
                              128,
                            )),
                            s('li', null, [
                              s(
                                'button',
                                {
                                  onClick:
                                    o[1] ||
                                    (o[1] = (...e) =>
                                      C.genBotByPreset &&
                                      C.genBotByPreset(...e)),
                                },
                                '从预设新建Bot',
                              ),
                            ]),
                          ]),
                        ],
                        512,
                      ),
                      [[u, v.showAddOptions]],
                    ),
                  ]),
                ]),
                s('div', kt, [
                  (i(!0),
                  t(
                    l,
                    null,
                    r(
                      C.sortedList,
                      (e, o) => (
                        i(),
                        t(
                          'div',
                          {
                            id: C.getId(e),
                            key: o,
                            class: 'lists',
                            onClick: (t) => C.showChat(e.id),
                            onContextmenu: p(
                              (t) => C.showFriendContextMenu(t, e),
                              ['prevent'],
                            ),
                          },
                          [
                            s(
                              'div',
                              {
                                class: a([
                                  'avatar',
                                  1 == e.avatarPolicy ? 'custom' : 'model',
                                ]),
                              },
                              [
                                s(
                                  'img',
                                  { src: e.avatar, alt: e.name },
                                  null,
                                  8,
                                  Tt,
                                ),
                              ],
                              2,
                            ),
                            s('div', Pt, [
                              s('div', It, c(e.name), 1),
                              s('div', Ot, c(e.getLastTime()), 1),
                              s('div', Et, c(e.lastMessageSummary), 1),
                            ]),
                          ],
                          40,
                          _t,
                        )
                      ),
                    ),
                    128,
                  )),
                ]),
                s(
                  'div',
                  {
                    class: 'resizer',
                    onMousedown:
                      o[2] ||
                      (o[2] = (...e) => C.startResize && C.startResize(...e)),
                  },
                  null,
                  32,
                ),
                v.showAddWindow
                  ? (i(),
                    m(
                      w,
                      {
                        key: 0,
                        onClose: o[3] || (o[3] = (e) => (v.showAddWindow = !1)),
                        onAddBot: C.addPresetContactor,
                      },
                      null,
                      8,
                      ['onAddBot'],
                    ))
                  : n('', !0),
                v.showMenu
                  ? (i(),
                    m(
                      S,
                      {
                        key: 1,
                        type: 'friend',
                        message: v.selectedFriend,
                        style: y({
                          position: 'fixed',
                          left: v.menuX + 'px',
                          top: v.menuY + 'px',
                        }),
                        onMessageOption: C.handleFriendOption,
                        onClose: o[4] || (o[4] = (e) => (v.showMenu = !1)),
                      },
                      null,
                      8,
                      ['message', 'style', 'onMessageOption'],
                    ))
                  : n('', !0),
              ],
              512,
            )
          )
        },
      ],
      ['__scopeId', 'data-v-1e94626e'],
    ],
  ),
  Dt = { class: 'presets-list' },
  $t = { class: 'preset-message-block' },
  Rt = ['onMouseover'],
  Ut = { key: 0, class: 'avatar-emoji' },
  jt = ['onBlur'],
  Bt = { class: 'messages-buttons' }
const Nt = { class: 'settings-container' },
  qt = { key: 0, class: 'openai-settings' },
  Vt = { class: 'settings-block' },
  Ft = { class: 'block-content' },
  Ht = { class: 'block-content-item' },
  Gt = { class: 'item-content' },
  Wt = { class: 'item-title' },
  zt = { class: 'item-content' },
  Jt = { class: 'settings-block' },
  Kt = { class: 'block-content' },
  Yt = { class: 'block-content-item' },
  Xt = { class: 'item-content' },
  Zt = { class: 'block-content-item', style: { overflow: 'hidden' } },
  Qt = { class: 'settings-block' },
  es = { class: 'block-content' },
  ts = { class: 'block-content-item' },
  ss = { class: 'item-content' },
  as = { class: 'item-title' },
  is = { class: 'item-content' },
  os = ['onClick'],
  ns = { class: 'item-hidden-content plugin-tools-container' },
  ls = ['title'],
  rs = { class: 'item-title' },
  cs = { class: 'item-content' },
  ds = { key: 1, class: 'settings-block' },
  hs = { class: 'block-content' },
  ms = { class: 'block-content-item' },
  gs = { class: 'item-content' },
  us = { class: 'block-content-item' },
  ps = { class: 'item-content' },
  fs = { class: 'block-content-item', style: { overflow: 'hidden' } },
  ys = { id: 'internal-tools-settings', class: 'sub-items' },
  vs = { class: 'item-title' },
  Cs = { class: 'item-content' },
  ws = { class: 'block-content-item' },
  Ss = { class: 'item-content' },
  bs = { class: 'block-content-item', style: { overflow: 'hidden' } },
  Ls = { id: 'safety-settings', class: 'sub-items' },
  Ms = { class: 'item-title' },
  xs = { class: 'item-content' }
const ks = F(
  {
    name: 'ContactorSettings',
    components: {
      PresetsList: F(
        {
          props: { presetsHistory: { type: Array, default: () => [] } },
          emits: ['updatePresets'],
          data() {
            return {
              presetMessages: [...this.presetsHistory],
              hoveredIndex: void 0,
            }
          },
          watch: {
            presetsHistory(e) {
              this.presetMessages = [...e]
            },
          },
          methods: {
            delPresetMessage() {
              ;(this.presetMessages.splice(this.hoveredIndex, 1),
                this.$emit('updatePresets', this.presetMessages))
            },
            addPresetMessage(e) {
              'system' == e && this.presetMessages.length > 0
                ? this.$message.warning('系统消息必须是第一条消息')
                : (this.presetMessages.push({ role: e, content: '' }),
                  this.$emit('updatePresets', this.presetMessages))
            },
            getMessageAvatar: (e) =>
              'assistant' == e ? '🤖' : 'system' == e ? '⚙️' : '👤',
            handleMessageUpdate(e) {
              ;((this.presetMessages[e].content =
                this.$refs[`message-${e}`][0].innerText),
                this.$emit('updatePresets', this.presetMessages))
            },
          },
        },
        [
          [
            'render',
            function (e, a, o, n, m, g) {
              const u = h('el-button')
              return (
                i(),
                t('div', Dt, [
                  (i(!0),
                  t(
                    l,
                    null,
                    r(
                      m.presetMessages,
                      (e, o) => (
                        i(),
                        t('div', { key: o, class: 'preset-message' }, [
                          s('div', $t, [
                            s(
                              'div',
                              {
                                class: 'message-avatar',
                                onMouseover: (e) => (m.hoveredIndex = o),
                                onMouseleave:
                                  a[1] ||
                                  (a[1] = (e) => (m.hoveredIndex = null)),
                              },
                              [
                                m.hoveredIndex != o
                                  ? (i(),
                                    t(
                                      'div',
                                      Ut,
                                      c(g.getMessageAvatar(e.role)),
                                      1,
                                    ))
                                  : (i(),
                                    t(
                                      'div',
                                      {
                                        key: 1,
                                        title: '删除消息',
                                        class: 'avatar-emoji hovered',
                                        onClick:
                                          a[0] ||
                                          (a[0] = (...e) =>
                                            g.delPresetMessage &&
                                            g.delPresetMessage(...e)),
                                      },
                                      ' 🗑️ ',
                                    )),
                              ],
                              40,
                              Rt,
                            ),
                            s(
                              'div',
                              {
                                ref_for: !0,
                                ref: `message-${o}`,
                                class: 'message-content',
                                contenteditable: 'true',
                                onBlur: (e) => g.handleMessageUpdate(o),
                              },
                              c(m.presetMessages[o].content),
                              41,
                              jt,
                            ),
                          ]),
                        ])
                      ),
                    ),
                    128,
                  )),
                  s('div', Bt, [
                    d(
                      u,
                      {
                        title: '添加系统消息',
                        plain: '',
                        onClick:
                          a[2] || (a[2] = (e) => g.addPresetMessage('system')),
                      },
                      { default: f(() => a[5] || (a[5] = [C('➕ ⚙️')])), _: 1 },
                    ),
                    d(
                      u,
                      {
                        title: '添加助手消息',
                        plain: '',
                        onClick:
                          a[3] ||
                          (a[3] = (e) => g.addPresetMessage('assistant')),
                      },
                      { default: f(() => a[6] || (a[6] = [C('➕ 🤖')])), _: 1 },
                    ),
                    d(
                      u,
                      {
                        title: '添加用户消息',
                        plain: '',
                        onClick:
                          a[4] || (a[4] = (e) => g.addPresetMessage('user')),
                      },
                      { default: f(() => a[7] || (a[7] = [C('➕ 👤')])), _: 1 },
                    ),
                  ]),
                ])
              )
            },
          ],
          ['__scopeId', 'data-v-88c48edc'],
        ],
      ),
    },
    props: {
      modelValue: { type: Object, required: !0 },
      activeContactorPlatform: { type: String, required: !0 },
      llmProvidersList: { type: Array, required: !0 },
      toolCallModesList: { type: Array, required: !0 },
      allLlmToolsData: { type: Array, required: !0 },
      safetySettingsParams: { type: Object, required: !0 },
      safetySimpleValueOptions: { type: Array, required: !0 },
      presetsHistoryData: { type: Array, default: () => [] },
    },
    emits: ['update:modelValue', 'provider-changed', 'update-presets'],
    data() {
      return {
        localLlmProvider: this.modelValue.provider,
        localLlmGeneralKeys: {},
        localLlmToolCallMode: this.modelValue.toolCallSettings?.mode,
        localAllLLMTools: JSON.parse(JSON.stringify(this.allLlmToolsData)),
        localGeminiExtraSettings: JSON.parse(
          JSON.stringify(this.modelValue.extraSettings.gemini),
        ),
        localGeminiSafetySettings: {},
        showPresetsDetail: !1,
        showInternalTools: !1,
        showSafetySettings: !1,
        sliderTypes: {
          a: { min: 0, max: 2, step: 0.1 },
          b: { min: 0, max: 1, step: 0.1 },
          c: { min: -2, max: 2, step: 0.1 },
          d: {
            min: -1,
            max: 3,
            step: 1,
            formatter: (e) =>
              ({
                '-1': '默认',
                0: '关闭思考',
                1: '基础思考',
                2: '均衡思考',
                3: '深度思考',
              })[e],
          },
        },
      }
    },
    watch: {
      modelValue: {
        handler(e) {
          ;((this.localLlmProvider = e.provider),
            (this.localLlmToolCallMode = e.toolCallSettings?.mode),
            (this.localGeminiExtraSettings = JSON.parse(
              JSON.stringify(e.extraSettings.gemini),
            )),
            this.initializeSettings())
        },
        deep: !0,
      },
      allLlmToolsData: {
        handler(e) {
          ;((this.localAllLLMTools = JSON.parse(JSON.stringify(e))),
            this.updateEnabledTools())
        },
        deep: !0,
      },
    },
    created() {
      this.initializeSettings()
    },
    methods: {
      initializeSettings() {
        ;((this.localLlmGeneralKeys = {
          ...this.modelValue.base,
          ...this.modelValue.chatParams,
        }),
          ['gemini', 'vertex'].includes(this.localLlmProvider) &&
            (this.localGeminiSafetySettings = this.safeSimplify(
              this.localGeminiExtraSettings.safetySettings,
            )),
          this.updateEnabledTools())
      },
      updateEnabledTools() {
        const e = this.modelValue.toolCallSettings?.tools || []
        this.localAllLLMTools = this.localAllLLMTools.map((t) => ({
          ...t,
          tools: t.tools.map((t) => ({ ...t, enabled: e.includes(t.name) })),
        }))
      },
      getShownKey: (e) =>
        ({
          mode: '工具调用',
          model: '模型',
          max_messages_num: '最大历史消息数',
          stream: '流式响应',
          reasoning_effort: '思考强度',
          temperature: '温度',
          top_p: '核采样',
          frequency_penalty: '重复惩罚度',
          presence_penalty: '话题新鲜度',
          HARM_CATEGORY_HARASSMENT: '骚扰',
          HARM_CATEGORY_HATE_SPEECH: '仇恨言论',
          HARM_CATEGORY_SEXUALLY_EXPLICIT: '色情',
          HARM_CATEGORY_DANGEROUS_CONTENT: '危险内容',
          HARM_CATEGORY_CIVIC_INTEGRITY: '公民诚信',
          imageGeneration: '图像生成',
          google_search: '联网搜索',
          code_execution: '代码执行',
          url_context: '网页解析',
        })[e] || e,
      emitUpdate() {
        const e = JSON.parse(JSON.stringify(this.modelValue)),
          {
            model: t,
            stream: s,
            max_messages_num: a,
            temperature: i,
            top_p: o,
            frequency_penalty: n,
            presence_penalty: l,
            reasoning_effort: r,
          } = this.localLlmGeneralKeys
        ;((e.base = { model: t, max_messages_num: a, stream: s }),
          (e.chatParams = {
            temperature: i,
            top_p: o,
            frequency_penalty: n,
            presence_penalty: l,
            reasoning_effort: r,
          }),
          (e.provider = this.localLlmProvider),
          e.toolCallSettings || (e.toolCallSettings = {}),
          (e.toolCallSettings.mode = this.localLlmToolCallMode))
        const c = this.localAllLLMTools.flatMap((e) =>
          e.tools.filter((e) => e.enabled).map((e) => e.name),
        )
        ;((e.toolCallSettings.tools = c),
          e.extraSettings || (e.extraSettings = {}),
          e.extraSettings.gemini ||
            (e.extraSettings.gemini = {
              internalTools: {},
              safetySettings: {},
            }),
          (e.extraSettings.gemini = JSON.parse(
            JSON.stringify(this.localGeminiExtraSettings),
          )),
          this.$emit('update:modelValue', e))
      },
      updateGeneralSettings() {
        this.emitUpdate()
      },
      handleProviderChange(e) {
        this.localLlmProvider = e
        const t = q.getDefaultModel(e)
        ;(t && (this.localLlmGeneralKeys.model = t),
          this.emitUpdate(),
          this.$emit('provider-changed', e),
          ['gemini', 'vertex'].includes(e) &&
            (this.localGeminiSafetySettings = this.safeSimplify(
              this.localGeminiExtraSettings.safetySettings,
            )))
      },
      handleUpdatePresets(e) {
        this.$emit('update-presets', e)
      },
      handleToolCallModeChange() {
        this.emitUpdate()
      },
      handleToolEnableChange() {
        this.emitUpdate()
      },
      handleGeminiSettingsChange() {
        this.emitUpdate()
      },
      safeSimplify(e) {
        const t = {},
          s = new Map(),
          a = this.safetySettingsParams
        return (
          Object.keys(a).forEach((e) => {
            s.set(a[e], e)
          }),
          Object.keys(e || {}).forEach((a) => {
            t[a] = s.get(e[a])
          }),
          t
        )
      },
      handleSafetySettingChange(e) {
        const t = this.localGeminiSafetySettings[e],
          s = this.safetySettingsParams[t]
        ;(this.localGeminiExtraSettings.safetySettings ||
          (this.localGeminiExtraSettings.safetySettings = {}),
          (this.localGeminiExtraSettings.safetySettings[e] = s),
          this.emitUpdate())
      },
    },
  },
  [
    [
      'render',
      function (e, o, p, y, v, C) {
        const S = h('el-option'),
          b = h('el-select'),
          L = h('el-input'),
          M = h('el-switch'),
          x = h('el-slider'),
          k = h('PresetsList')
        return (
          i(),
          t('div', Nt, [
            'openai' == p.activeContactorPlatform
              ? (i(),
                t('div', qt, [
                  s('div', Vt, [
                    o[7] ||
                      (o[7] = s(
                        'div',
                        { class: 'block-title' },
                        'LLM 基本配置',
                        -1,
                      )),
                    s('div', Ft, [
                      s('div', Ht, [
                        o[6] ||
                          (o[6] = s(
                            'div',
                            { class: 'item-title' },
                            '来源渠道',
                            -1,
                          )),
                        s('div', Gt, [
                          d(
                            b,
                            {
                              modelValue: v.localLlmProvider,
                              'onUpdate:modelValue':
                                o[0] ||
                                (o[0] = (e) => (v.localLlmProvider = e)),
                              style: { width: '10rem' },
                              onChange: C.handleProviderChange,
                            },
                            {
                              default: f(() => [
                                (i(!0),
                                t(
                                  l,
                                  null,
                                  r(
                                    p.llmProvidersList,
                                    (e) => (
                                      i(),
                                      m(
                                        S,
                                        {
                                          key: e.value,
                                          label: e.label,
                                          value: e.value,
                                        },
                                        null,
                                        8,
                                        ['label', 'value'],
                                      )
                                    ),
                                  ),
                                  128,
                                )),
                              ]),
                              _: 1,
                            },
                            8,
                            ['modelValue', 'onChange'],
                          ),
                        ]),
                      ]),
                      (i(!0),
                      t(
                        l,
                        null,
                        r(
                          v.localLlmGeneralKeys,
                          (e, a) => (
                            i(),
                            t('div', { key: a, class: 'block-content-item' }, [
                              s('div', Wt, c(C.getShownKey(a)), 1),
                              s('div', zt, [
                                ['model', 'max_messages_num'].includes(a)
                                  ? (i(),
                                    m(
                                      L,
                                      {
                                        key: 0,
                                        modelValue: v.localLlmGeneralKeys[a],
                                        'onUpdate:modelValue': (e) =>
                                          (v.localLlmGeneralKeys[a] = e),
                                        onChange: C.updateGeneralSettings,
                                      },
                                      null,
                                      8,
                                      [
                                        'modelValue',
                                        'onUpdate:modelValue',
                                        'onChange',
                                      ],
                                    ))
                                  : ['stream'].includes(a)
                                    ? (i(),
                                      m(
                                        M,
                                        {
                                          key: 1,
                                          modelValue: v.localLlmGeneralKeys[a],
                                          'onUpdate:modelValue': (e) =>
                                            (v.localLlmGeneralKeys[a] = e),
                                          onChange: C.updateGeneralSettings,
                                        },
                                        null,
                                        8,
                                        [
                                          'modelValue',
                                          'onUpdate:modelValue',
                                          'onChange',
                                        ],
                                      ))
                                    : ['temperature'].includes(a)
                                      ? (i(),
                                        m(
                                          x,
                                          {
                                            key: 2,
                                            modelValue:
                                              v.localLlmGeneralKeys[a],
                                            'onUpdate:modelValue': (e) =>
                                              (v.localLlmGeneralKeys[a] = e),
                                            step: v.sliderTypes.a.step,
                                            min: v.sliderTypes.a.min,
                                            max: v.sliderTypes.a.max,
                                            onChange: C.updateGeneralSettings,
                                          },
                                          null,
                                          8,
                                          [
                                            'modelValue',
                                            'onUpdate:modelValue',
                                            'step',
                                            'min',
                                            'max',
                                            'onChange',
                                          ],
                                        ))
                                      : ['top_p'].includes(a)
                                        ? (i(),
                                          m(
                                            x,
                                            {
                                              key: 3,
                                              modelValue:
                                                v.localLlmGeneralKeys[a],
                                              'onUpdate:modelValue': (e) =>
                                                (v.localLlmGeneralKeys[a] = e),
                                              step: v.sliderTypes.b.step,
                                              min: v.sliderTypes.b.min,
                                              max: v.sliderTypes.b.max,
                                              onChange: C.updateGeneralSettings,
                                            },
                                            null,
                                            8,
                                            [
                                              'modelValue',
                                              'onUpdate:modelValue',
                                              'step',
                                              'min',
                                              'max',
                                              'onChange',
                                            ],
                                          ))
                                        : [
                                              'frequency_penalty',
                                              'presence_penalty',
                                            ].includes(a)
                                          ? (i(),
                                            m(
                                              x,
                                              {
                                                key: 4,
                                                modelValue:
                                                  v.localLlmGeneralKeys[a],
                                                'onUpdate:modelValue': (e) =>
                                                  (v.localLlmGeneralKeys[a] =
                                                    e),
                                                step: v.sliderTypes.c.step,
                                                min: v.sliderTypes.c.min,
                                                max: v.sliderTypes.c.max,
                                                onChange:
                                                  C.updateGeneralSettings,
                                              },
                                              null,
                                              8,
                                              [
                                                'modelValue',
                                                'onUpdate:modelValue',
                                                'step',
                                                'min',
                                                'max',
                                                'onChange',
                                              ],
                                            ))
                                          : ['reasoning_effort'].includes(a)
                                            ? (i(),
                                              m(
                                                x,
                                                {
                                                  key: 5,
                                                  modelValue:
                                                    v.localLlmGeneralKeys[a],
                                                  'onUpdate:modelValue': (e) =>
                                                    (v.localLlmGeneralKeys[a] =
                                                      e),
                                                  step: v.sliderTypes.d.step,
                                                  min: v.sliderTypes.d.min,
                                                  max: v.sliderTypes.d.max,
                                                  'format-tooltip':
                                                    v.sliderTypes.d.formatter,
                                                  onChange:
                                                    C.updateGeneralSettings,
                                                },
                                                null,
                                                8,
                                                [
                                                  'modelValue',
                                                  'onUpdate:modelValue',
                                                  'step',
                                                  'min',
                                                  'max',
                                                  'format-tooltip',
                                                  'onChange',
                                                ],
                                              ))
                                            : n('', !0),
                              ]),
                            ])
                          ),
                        ),
                        128,
                      )),
                    ]),
                  ]),
                  s('div', Jt, [
                    o[10] ||
                      (o[10] = s(
                        'div',
                        { class: 'block-title' },
                        'LLM 预设配置',
                        -1,
                      )),
                    s('div', Kt, [
                      s('div', Yt, [
                        o[9] ||
                          (o[9] = s(
                            'div',
                            { class: 'item-title' },
                            '预设历史记录',
                            -1,
                          )),
                        s('div', Xt, [
                          s(
                            'button',
                            {
                              class: a({
                                active: v.showPresetsDetail,
                                'extra-info-button': !0,
                              }),
                              onClick:
                                o[1] ||
                                (o[1] = (e) =>
                                  (v.showPresetsDetail = !v.showPresetsDetail)),
                            },
                            o[8] ||
                              (o[8] = [
                                s(
                                  'i',
                                  { class: 'iconfont icon-return' },
                                  null,
                                  -1,
                                ),
                              ]),
                            2,
                          ),
                        ]),
                      ]),
                      d(
                        w,
                        { name: 'expand-slide' },
                        {
                          default: f(() => [
                            g(
                              s(
                                'div',
                                Zt,
                                [
                                  d(
                                    k,
                                    {
                                      'presets-history': p.presetsHistoryData,
                                      onUpdatePresets: C.handleUpdatePresets,
                                    },
                                    null,
                                    8,
                                    ['presets-history', 'onUpdatePresets'],
                                  ),
                                ],
                                512,
                              ),
                              [[u, v.showPresetsDetail]],
                            ),
                          ]),
                          _: 1,
                        },
                      ),
                    ]),
                  ]),
                  s('div', Qt, [
                    o[13] ||
                      (o[13] = s(
                        'div',
                        { class: 'block-title' },
                        'LLM 工具调用配置',
                        -1,
                      )),
                    s('div', es, [
                      s('div', ts, [
                        o[11] ||
                          (o[11] = s(
                            'div',
                            { class: 'item-title' },
                            '工具调用模式',
                            -1,
                          )),
                        s('div', ss, [
                          d(
                            b,
                            {
                              modelValue: v.localLlmToolCallMode,
                              'onUpdate:modelValue':
                                o[2] ||
                                (o[2] = (e) => (v.localLlmToolCallMode = e)),
                              placeholder: 'AUTO',
                              style: { width: '10rem' },
                              onChange: C.handleToolCallModeChange,
                            },
                            {
                              default: f(() => [
                                (i(!0),
                                t(
                                  l,
                                  null,
                                  r(
                                    p.toolCallModesList,
                                    (e) => (
                                      i(),
                                      m(
                                        S,
                                        {
                                          key: e.value,
                                          label: e.label,
                                          value: e.value,
                                        },
                                        null,
                                        8,
                                        ['label', 'value'],
                                      )
                                    ),
                                  ),
                                  128,
                                )),
                              ]),
                              _: 1,
                            },
                            8,
                            ['modelValue', 'onChange'],
                          ),
                        ]),
                      ]),
                      (i(!0),
                      t(
                        l,
                        null,
                        r(
                          v.localAllLLMTools,
                          (e, n) => (
                            i(),
                            t(
                              'div',
                              {
                                key: n,
                                class: 'block-content-item parent-item',
                              },
                              [
                                s('div', as, c(e.name), 1),
                                s('div', is, [
                                  s(
                                    'button',
                                    {
                                      class: a({
                                        active: !e.collapsed,
                                        'extra-info-button': !0,
                                      }),
                                      onClick: (t) =>
                                        (e.collapsed = !e.collapsed),
                                    },
                                    o[12] ||
                                      (o[12] = [
                                        s(
                                          'i',
                                          { class: 'iconfont icon-return' },
                                          null,
                                          -1,
                                        ),
                                      ]),
                                    10,
                                    os,
                                  ),
                                ]),
                                d(
                                  w,
                                  { name: 'expand-slide' },
                                  {
                                    default: f(() => [
                                      g(
                                        s(
                                          'div',
                                          ns,
                                          [
                                            (i(!0),
                                            t(
                                              l,
                                              null,
                                              r(
                                                e.tools,
                                                (e, a) => (
                                                  i(),
                                                  t(
                                                    'div',
                                                    {
                                                      key: a,
                                                      class:
                                                        'block-content-item child-item',
                                                      title: e.description,
                                                    },
                                                    [
                                                      s(
                                                        'div',
                                                        rs,
                                                        c(
                                                          e.name.split(
                                                            '_mid_',
                                                          )[0],
                                                        ),
                                                        1,
                                                      ),
                                                      s('div', cs, [
                                                        d(
                                                          M,
                                                          {
                                                            modelValue:
                                                              e.enabled,
                                                            'onUpdate:modelValue':
                                                              (t) =>
                                                                (e.enabled = t),
                                                            onChange:
                                                              C.handleToolEnableChange,
                                                          },
                                                          null,
                                                          8,
                                                          [
                                                            'modelValue',
                                                            'onUpdate:modelValue',
                                                            'onChange',
                                                          ],
                                                        ),
                                                      ]),
                                                    ],
                                                    8,
                                                    ls,
                                                  )
                                                ),
                                              ),
                                              128,
                                            )),
                                          ],
                                          512,
                                        ),
                                        [[u, !e.collapsed]],
                                      ),
                                    ]),
                                    _: 2,
                                  },
                                  1024,
                                ),
                              ],
                            )
                          ),
                        ),
                        128,
                      )),
                    ]),
                  ]),
                ]))
              : n('', !0),
            ['gemini', 'vertex'].includes(v.localLlmProvider)
              ? (i(),
                t('div', ds, [
                  o[19] ||
                    (o[19] = s(
                      'div',
                      { class: 'block-title' },
                      'Gemini 额外设置',
                      -1,
                    )),
                  s('div', hs, [
                    s('div', ms, [
                      o[14] ||
                        (o[14] = s(
                          'div',
                          { class: 'item-title' },
                          '图像生成',
                          -1,
                        )),
                      s('div', gs, [
                        d(
                          M,
                          {
                            modelValue:
                              v.localGeminiExtraSettings.imageGeneration,
                            'onUpdate:modelValue':
                              o[3] ||
                              (o[3] = (e) =>
                                (v.localGeminiExtraSettings.imageGeneration =
                                  e)),
                            onChange: C.handleGeminiSettingsChange,
                          },
                          null,
                          8,
                          ['modelValue', 'onChange'],
                        ),
                      ]),
                    ]),
                    s('div', us, [
                      o[16] ||
                        (o[16] = s(
                          'div',
                          { class: 'item-title' },
                          '内置工具',
                          -1,
                        )),
                      s('div', ps, [
                        s(
                          'button',
                          {
                            class: a({
                              active: v.showInternalTools,
                              'extra-info-button': !0,
                            }),
                            onClick:
                              o[4] ||
                              (o[4] = (e) =>
                                (v.showInternalTools = !v.showInternalTools)),
                          },
                          o[15] ||
                            (o[15] = [
                              s(
                                'i',
                                { class: 'iconfont icon-return' },
                                null,
                                -1,
                              ),
                            ]),
                          2,
                        ),
                      ]),
                    ]),
                    d(
                      w,
                      { name: 'expand-slide' },
                      {
                        default: f(() => [
                          g(
                            s(
                              'div',
                              fs,
                              [
                                s('ul', ys, [
                                  (i(!0),
                                  t(
                                    l,
                                    null,
                                    r(
                                      v.localGeminiExtraSettings.internalTools,
                                      (e, a) => (
                                        i(),
                                        t(
                                          'li',
                                          {
                                            key: a,
                                            class:
                                              'block-content-item child-item',
                                          },
                                          [
                                            s(
                                              'div',
                                              vs,
                                              c(C.getShownKey(a)),
                                              1,
                                            ),
                                            s('div', Cs, [
                                              d(
                                                M,
                                                {
                                                  modelValue:
                                                    v.localGeminiExtraSettings
                                                      .internalTools[a],
                                                  'onUpdate:modelValue': (e) =>
                                                    (v.localGeminiExtraSettings.internalTools[
                                                      a
                                                    ] = e),
                                                  onChange:
                                                    C.handleGeminiSettingsChange,
                                                },
                                                null,
                                                8,
                                                [
                                                  'modelValue',
                                                  'onUpdate:modelValue',
                                                  'onChange',
                                                ],
                                              ),
                                            ]),
                                          ],
                                        )
                                      ),
                                    ),
                                    128,
                                  )),
                                ]),
                              ],
                              512,
                            ),
                            [[u, v.showInternalTools]],
                          ),
                        ]),
                        _: 1,
                      },
                    ),
                    s('div', ws, [
                      o[18] ||
                        (o[18] = s(
                          'div',
                          { class: 'item-title' },
                          '过滤等级设置',
                          -1,
                        )),
                      s('div', Ss, [
                        s(
                          'button',
                          {
                            class: a({
                              active: v.showSafetySettings,
                              'extra-info-button': !0,
                            }),
                            onClick:
                              o[5] ||
                              (o[5] = (e) =>
                                (v.showSafetySettings = !v.showSafetySettings)),
                          },
                          o[17] ||
                            (o[17] = [
                              s(
                                'i',
                                { class: 'iconfont icon-return' },
                                null,
                                -1,
                              ),
                            ]),
                          2,
                        ),
                      ]),
                    ]),
                    d(
                      w,
                      { name: 'expand-slide' },
                      {
                        default: f(() => [
                          g(
                            s(
                              'div',
                              bs,
                              [
                                s('ul', Ls, [
                                  (i(!0),
                                  t(
                                    l,
                                    null,
                                    r(
                                      v.localGeminiSafetySettings,
                                      (e, a) => (
                                        i(),
                                        t(
                                          'li',
                                          {
                                            key: a,
                                            class:
                                              'block-content-item child-item',
                                          },
                                          [
                                            s(
                                              'div',
                                              Ms,
                                              c(C.getShownKey(a)),
                                              1,
                                            ),
                                            s('div', xs, [
                                              d(
                                                b,
                                                {
                                                  modelValue:
                                                    v.localGeminiSafetySettings[
                                                      a
                                                    ],
                                                  'onUpdate:modelValue': (e) =>
                                                    (v.localGeminiSafetySettings[
                                                      a
                                                    ] = e),
                                                  style: { width: '10rem' },
                                                  onChange: (e) =>
                                                    C.handleSafetySettingChange(
                                                      a,
                                                    ),
                                                },
                                                {
                                                  default: f(() => [
                                                    (i(!0),
                                                    t(
                                                      l,
                                                      null,
                                                      r(
                                                        p.safetySimpleValueOptions,
                                                        (e) => (
                                                          i(),
                                                          m(
                                                            S,
                                                            {
                                                              key: e.value,
                                                              label: e.label,
                                                              value: e.value,
                                                            },
                                                            null,
                                                            8,
                                                            ['label', 'value'],
                                                          )
                                                        ),
                                                      ),
                                                      128,
                                                    )),
                                                  ]),
                                                  _: 2,
                                                },
                                                1032,
                                                [
                                                  'modelValue',
                                                  'onUpdate:modelValue',
                                                  'onChange',
                                                ],
                                              ),
                                            ]),
                                          ],
                                        )
                                      ),
                                    ),
                                    128,
                                  )),
                                ]),
                              ],
                              512,
                            ),
                            [[u, v.showSafetySettings]],
                          ),
                        ]),
                        _: 1,
                      },
                    ),
                  ]),
                ]))
              : n('', !0),
          ])
        )
      },
    ],
  ],
)
export {
  st as C,
  $e as F,
  Te as I,
  et as R,
  Ye as T,
  F as _,
  ue as a,
  ks as b,
  V as c,
  q as d,
  se as e,
  At as f,
  ee as s,
}
//# sourceMappingURL=components-CJBN48R7.js.map
