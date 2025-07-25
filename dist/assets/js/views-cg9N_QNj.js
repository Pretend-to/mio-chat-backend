import {
  M as t,
  c as e,
  a,
  e as s,
  t as o,
  n as i,
  b as n,
  w as l,
  j as c,
  v as r,
  f as d,
  F as h,
  d as m,
  o as u,
  g as p,
  l as v,
  i as g,
  m as y,
  p as C,
  q as f,
  k as w,
  s as b,
  E as k,
  u as S,
  x as M,
} from './vue-vendor-DVmbRZJS.js'
import {
  _ as I,
  R as x,
  F as T,
  T as P,
  I as L,
  a as $,
  C as V,
  c as _,
  f as R,
  b as D,
  d as B,
} from './components-CJBN48R7.js'
import './emoji-nU2WIqY_.js'
import { h as O } from './vendor-C0p4anTM.js'
const U = { id: 'chat-window' },
  W = { class: 'upside-bar' },
  E = { class: 'contactor-name' },
  H = { class: 'delay-num' },
  j = { class: 'options' },
  F = { key: 0, class: 'message-time' },
  q = ['id'],
  A = { key: 0, class: 'avatar' },
  N = ['src', 'alt'],
  J = ['src', 'alt'],
  z = { key: 1, class: 'msg' },
  G = { class: 'wholename' },
  X = { key: 0, class: 'title' },
  Y = { class: 'name' },
  K = ['onContextmenu'],
  Q = { key: 5 },
  Z = {
    key: 7,
    class: 'blank-message',
    style: { width: '10rem', height: '28.8px', position: 'relative' },
  },
  tt = { key: 2, class: 'system-message' },
  et = { class: 'system-message-content' },
  at = { class: 'system-message-button' },
  st = ['onClick']
const ot = I(
    {
      components: {
        MdPreview: t,
        ContextMenu: V,
        ForwardMsg: $,
        InputEditor: L,
        ToolCallBar: P,
        FileBlock: T,
        ReasonBlock: x,
      },
      data() {
        let t,
          e,
          a = !1,
          s = !0
        const o = window.location.href,
          i = new URL(o).searchParams
        ;(i.has('preview') && 'true' === i.get('preview') && (a = !0),
          i.has('shareId') && (t = i.get('shareId')),
          i.has('scroll') && (s = i.get('scroll') || 'true'))
        const n = parseInt(this.$route.params.id)
        try {
          if (((e = _.getContactor(n)), !e)) throw new Error('找不到联系人')
        } catch (l) {
          const s = _.contactList[0].id
          ;(this.$router.push({
            path: `/chat/${s}`,
            query: { preview: a, shareId: t },
          }),
            (e = _.getContactor(s)))
        }
        return {
          scroll: s,
          preview: a,
          shareId: t,
          activeContactor: e,
          showwindow: !0,
          showemoji: !1,
          userInput: '',
          client: _,
          extraOptions: [],
          wraperPresets: {},
          selectedOption: null,
          currentDelay: 0,
          toupdate: !1,
          seletedText: '',
          seletedImage: '',
          retryList: [],
          showMenu: !1,
          menuTop: 0,
          menuLeft: 0,
          validMessageIndex: -1,
          repliedMessageId: -1,
          autoScroll: !1,
          fullScreen: !1,
          chatWindowRef: null,
          prevScrollTop: 0,
          showRollDown: !1,
          inputBarTop: 0,
          clearMessageTip: '以上的对话记录已清除',
          loadingIcon: "<span id='message-loading-icon'></span>",
        }
      },
      computed: {
        getMenuStyle() {
          if (window.innerWidth < 768) {
            const t = 160
            return this.menuTop - t < 0
              ? { top: t + 'px' }
              : { bottom: window.innerHeight - this.menuTop + 16 + 'px' }
          }
          return this.menuLeft + 110 > window.innerWidth
            ? { top: this.menuTop + 'px', left: this.menuLeft - 110 + 'px' }
            : { top: this.menuTop + 'px', left: this.menuLeft + 'px' }
        },
        getDelayStatus() {
          return this.currentDelay > 1e3
            ? 'high'
            : this.currentDelay > 500
              ? 'mid'
              : this.currentDelay > 100
                ? 'low'
                : 'ultra'
        },
        activeMessageChain() {
          return this.activeContactor.options.presetSettings?.opening
            ? [
                {
                  role: 'other',
                  content: [
                    {
                      type: 'text',
                      data: {
                        text: this.activeContactor.options.presetSettings
                          .opening,
                      },
                    },
                  ],
                  time: this.activeContactor.createTime,
                },
                ...this.activeContactor.messageChain,
              ]
            : this.activeContactor.messageChain
        },
      },
      watch: {
        '$route.params.id'(t, e) {
          const a = parseInt(t),
            s = _.getContactor(a)
          if (
            ((this.activeContactor = s),
            this.initContactor(this.activeContactor),
            this.chatWindowRef && this.toButtom(),
            e)
          ) {
            const t = parseInt(e),
              a = _.getContactor(t)
            this.disableContactor(a)
          }
        },
      },
      async mounted() {
        ;(document.addEventListener('click', () => {
          ;((this.showMenu = !1),
            (this.seletedText = ''),
            (this.seletedImage = ''))
        }),
          (this.chatWindowRef = this.$refs.chatWindow),
          this.chatWindowRef.addEventListener('scroll', this.scrollHandler),
          !this.preview && this.scroll && this.toButtom(),
          (this.scroll = !0),
          this.initContactor(this.activeContactor),
          (this.fullScreen = this.client.fullScreen))
        const t = document.querySelector('.input-bar')
        if (t) {
          const e = window.innerHeight
          this.inputBarTop = e - t.offsetTop
        }
        if (this.shareId) {
          ;(await _.loadOriginalContactors(this.shareId))
            ? this.$router.push({
                path: '/chat/' + this.shareId,
                query: { preview: this.preview, scroll: !1 },
              })
            : this.$message({ message: '分享链接已失效', type: 'error' })
        }
      },
      updated() {
        this.toupdate &&
          this.autoScroll &&
          0 === this.retryList.length &&
          (this.toButtom(), (this.toupdate = !1))
      },
      beforeUnmount() {
        ;(this.disableContactor(this.activeContactor),
          this.chatWindowRef.removeEventListener('scroll', this.scrollHandler))
      },
      methods: {
        handleMouseUp() {
          const t = window.getSelection().toString()
          t && (this.seletedText = t)
        },
        toButtom(t) {
          setTimeout(() => {
            ;(() => {
              const e =
                this.chatWindowRef ||
                document.getElementById('main-messages-window')
              e &&
                e.scrollTo({
                  top: e.scrollHeight,
                  behavior: t ? 'smooth' : 'instant',
                })
            })()
          }, 1)
        },
        cleanScreen() {
          ;((this.activeContactor.messageChain = []),
            this.activeContactor.updateFirstMessage(),
            _.setLocalStorage(),
            this.activeContactor.emit('updateMessageSummary'),
            (this.toupdate = !0),
            this.$message({ message: '已清除会话记录', type: 'success' }))
        },
        cleanHistory() {
          ;(this.activeContactor.updateFirstMessage(),
            this.$message({
              message: '上下文信息已清除，之后的请求将不再记录上文记录',
              type: 'success',
            }))
          for (
            let t = this.activeContactor.messageChain.length - 1;
            t >= 0;
            t--
          ) {
            const e = this.activeContactor.messageChain[t]
            'mio_system' === e.role &&
              'text' === e.content[0].type &&
              e.content[0].data.text === this.clearMessageTip &&
              this.activeContactor.messageChain.splice(t, 1)
          }
          ;(this.activeContactor.makeSystemMessage(this.clearMessageTip),
            _.setLocalStorage())
        },
        delSystemMessage(t) {
          const e = this.activeContactor.messageChain[t]
          ;('text' === e.content[0].type &&
            e.content[0].data.text === this.clearMessageTip &&
            (this.activeContactor.firstMessageIndex = 0),
            this.activeContactor.messageChain.splice(t, 1),
            _.setLocalStorage())
        },
        isValidInput: (t) => !/^[ \n]+$/.test(t),
        waiting() {
          this.$message({ message: '此功能尚未开放', type: 'warning' })
        },
        tolist() {
          this.$router.push({ name: 'home' })
        },
        async setModel(t) {
          const e = t[0],
            a = t[2]
          ;((this.activeContactor.options.provider = e),
            (this.activeContactor.options.base.model = a),
            this.activeContactor.loadAvatar(),
            await _.setLocalStorage())
        },
        toimg() {
          const t = this.chatWindowRef.getBoundingClientRect()
          ;((t.height = this.chatWindowRef.scrollHeight),
            O(this.chatWindowRef, {
              windowHeight: 1.2 * t.height,
              width: t.width,
            }).then((t) => {
              const e = t.toDataURL('image/png'),
                a = document.createElement('a')
              ;((a.download = 'chat.png'), (a.href = e), a.click())
            }))
        },
        async share() {
          ;(await _.shareContactor(this.activeContactor.id))
            ? this.$message({ message: '分享链接已复制', type: 'success' })
            : this.$message({ message: '分享失败', type: 'error' })
        },
        hasOpening() {
          return !!this.activeContactor.options.presetSettings?.opening
        },
        getFullMessages() {
          return this.hasOpening()
            ? [
                {
                  role: 'other',
                  content: [
                    {
                      type: 'text',
                      data: {
                        text: this.activeContactor.options.presetSettings
                          .opening,
                      },
                    },
                  ],
                  time: this.activeContactor.createTime,
                },
                ...this.activeContactor.messageChain,
              ]
            : this.activeContactor.messageChain
        },
        showTime(t) {
          const e = this.getFullMessages(),
            a = e[t].time
          if (0 === t)
            return { show: !0, time: this.activeContactor.getShownTime(a) }
          return a - e[t - 1].time > 6e5
            ? { show: !0, time: this.activeContactor.getShownTime(a) }
            : { show: !1, time: '' }
        },
        separateTextAndImages(t) {
          const e = /!\[([^\]]*)\]\((.*)\)/g
          let a,
            s = [],
            o = 0
          for (; null !== (a = e.exec(t)); ) {
            if (a.index > o) {
              const e = t.slice(o, a.index).trim()
              e && s.push({ type: 'text', data: { text: e } })
            }
            ;(s.push({ type: 'image', data: { file: a[2] } }),
              (o = e.lastIndex))
          }
          if (o < t.length) {
            const e = t.slice(o).trim()
            e && s.push({ type: 'text', data: { text: e } })
          }
          return s
        },
        getChatwindowScrollheight() {
          var t = this.chatWindowRef.scrollTop,
            e = this.chatWindowRef.clientHeight,
            a = this.chatWindowRef.scrollHeight
          return a - (t / (a - e)) * a
        },
        initContactor(t) {
          ;((t.active = !0),
            t.on('revMessage', (t) => {
              ;(this.activeContactor.messageChain.push(t), (this.toupdate = !0))
            }),
            t.on('delMessage', (t) => {
              ;(this.activeContactor.messageChain.splice(t, 1),
                (this.toupdate = !0))
            }),
            t.on('updateMessage', () => {
              ;(this.$forceUpdate(), (this.toupdate = !0), _.setLocalStorage())
            }),
            t.on('completeMessage', async (t) => {
              const e = t.messageId,
                a = this.activeContactor.getMessageById(e)
              ;(this.retryList.includes(e) &&
                (this.retryList = this.retryList.filter((t) => t !== e)),
                a.content.forEach((t, e) => {
                  if (
                    'text' === t.type &&
                    'onebot' === this.activeContactor.platform
                  ) {
                    const s = this.separateTextAndImages(t.data.text)
                    a.content.splice(e, 1, ...s)
                  }
                }),
                (this.toupdate = !0),
                this.$forceUpdate(),
                this.activeContactor.loadName(),
                _.setLocalStorage())
            }))
        },
        disableContactor(t) {
          t &&
            ((t.active = !1),
            t.off('updateMessage'),
            t.off('revMessage'),
            t.off('delMessage'),
            t.off('completeMessage'))
        },
        getReplyText(t) {
          let e = ''
          const a = this.activeContactor.messageChain.find((e) => e.id === t)
          if (a)
            return (
              a.content.forEach((t) => {
                'text' === t.type
                  ? (e += t.data.text)
                  : 'image' === t.type && (e += '[图片]')
              }),
              e.length > 20 ? `> ${e.substr(0, 20)}...` : `> ${e}`
            )
        },
        imageLoaded() {
          this.scroll && this.toButtom()
        },
        showMessageMenu(t, e) {
          if ('img' === t.target.tagName.toLowerCase()) {
            const e = t.target.src
            this.seletedImage = e
          }
          ;((this.validMessageIndex =
            'openai' === this.activeContactor.platform && this.hasOpening()
              ? e - 1
              : e),
            t.preventDefault(),
            (this.showMenu = !0),
            (this.menuTop = t.clientY),
            (this.menuLeft = t.clientX))
          const a = window.getSelection().toString()
          this.seletedText = a || ''
        },
        toProfile() {
          this.$router.push({
            name: 'profile_view',
            params: { id: this.activeContactor.id },
          })
        },
        scrollHandler() {
          const t = this.chatWindowRef.scrollTop,
            e = t > this.prevScrollTop,
            a = t < this.prevScrollTop
          ;((this.prevScrollTop = t),
            (this.showMenu = !1),
            this.showemoji && (this.showemoji = !1))
          const s = this.getChatwindowScrollheight()
          this.autoScroll = !(s > 100)
          const o = s <= 199
          !e || this.autoScroll || o
            ? (a || this.autoScroll || o) && (this.showRollDown = !1)
            : (this.showRollDown = !0)
        },
        getseletedMessage() {
          return this.activeContactor.messageChain[this.validMessageIndex]
        },
        handleMessageOption(t) {
          const e = this.getseletedMessage()
          switch (t) {
            case 'retry':
              if ('onebot' === this.activeContactor.platform)
                ('user' === e.role
                  ? this.activeContactor.webSend(e)
                  : this.activeContactor.webSend({ ...e, role: 'user' }),
                  this.$message({ message: '消息已重新发送', type: 'success' }))
              else {
                const t =
                  'user' === e.role
                    ? this.validMessageIndex + 1
                    : this.validMessageIndex
                let a = this.activeContactor.messageChain[t]
                if (!a || 'other' !== a.role) {
                  const e = this.activeContactor.getBaseUserContainer()
                  ;((e.role = 'other'),
                    this.activeContactor.insertMessage(e, t),
                    (a = e))
                }
                if ('retrying' === a.status)
                  return void this.$message({
                    message: '该消息正在重试中',
                    type: 'warning',
                  })
                ;(this.activeContactor.retryMessage(a.id),
                  (a.status = 'retrying'),
                  this.retryList.push(a.id))
              }
              this.toButtom()
              break
            case 'reply':
              'onebot' === this.activeContactor.platform
                ? ((this.repliedMessageId = e.id),
                  this.$message({ message: '已引用该消息', type: 'success' }))
                : (this.userInput +=
                    this.getReplyText(
                      this.activeContactor.messageChain[this.validMessageIndex]
                        .id,
                    ) + '\n\n')
              break
            case 'delete':
              ;(this.activeContactor.messageChain.splice(
                this.validMessageIndex,
                1,
              ),
                _.setLocalStorage())
          }
        },
      },
    },
    [
      [
        'render',
        function (t, v, g, y, C, f) {
          const w = d('ContextMenu'),
            b = d('MdPreview'),
            k = d('el-image'),
            S = d('ForwardMsg'),
            M = d('FileBlock'),
            I = d('ReasonBlock'),
            x = d('ToolCallBar'),
            T = d('InputEditor')
          return (
            u(),
            e('div', U, [
              a('div', W, [
                a(
                  'div',
                  {
                    class: 'return',
                    onClick: v[0] || (v[0] = (t) => f.tolist()),
                  },
                  v[8] ||
                    (v[8] = [
                      a('i', { class: 'iconfont icon-return' }, null, -1),
                    ]),
                ),
                a(
                  'div',
                  {
                    class: 'name-area',
                    onClick:
                      v[1] ||
                      (v[1] = (...t) => f.toProfile && f.toProfile(...t)),
                  },
                  [
                    a('div', E, o(C.activeContactor.name), 1),
                    a(
                      'span',
                      { class: i('delay-status ' + f.getDelayStatus) },
                      null,
                      2,
                    ),
                    a('span', H, '当前延迟: ' + o(C.currentDelay) + ' ms', 1),
                  ],
                ),
                a('ul', j, [
                  a(
                    'li',
                    {
                      class: 'share',
                      onClick: v[2] || (v[2] = (t) => f.share()),
                    },
                    v[9] ||
                      (v[9] = [
                        a('i', { class: 'iconfont icon-share' }, null, -1),
                      ]),
                  ),
                ]),
              ]),
              a(
                'div',
                {
                  id: 'main-messages-window',
                  ref: 'chatWindow',
                  class: i({ 'message-window': !0, preview: C.preview }),
                },
                [
                  C.showRollDown
                    ? (u(),
                      e(
                        'div',
                        {
                          key: 0,
                          id: 'roll-buttom-button',
                          style: c({ bottom: C.inputBarTop + 24 + 'px' }),
                          onClick: v[3] || (v[3] = (t) => f.toButtom(!0)),
                        },
                        v[10] ||
                          (v[10] = [
                            a('i', { class: 'iconfont down1' }, null, -1),
                          ]),
                        4,
                      ))
                    : n('', !0),
                  l(
                    s(
                      w,
                      {
                        type: 'message',
                        message: f.getseletedMessage(),
                        'seleted-text': C.seletedText,
                        'seleted-image': C.seletedImage,
                        style: c(f.getMenuStyle),
                        onMessageOption: f.handleMessageOption,
                        onClose: v[4] || (v[4] = (t) => (C.showMenu = !1)),
                      },
                      null,
                      8,
                      [
                        'message',
                        'seleted-text',
                        'seleted-image',
                        'style',
                        'onMessageOption',
                      ],
                    ),
                    [[r, C.showMenu]],
                  ),
                  (u(!0),
                  e(
                    h,
                    null,
                    m(
                      f.activeMessageChain,
                      (t, s) => (
                        u(),
                        e(
                          'div',
                          {
                            key: `${C.activeContactor.id}-${t.id}`,
                            ref_for: !0,
                            ref: 'message',
                            class: 'message-container',
                          },
                          [
                            f.showTime(s).show
                              ? (u(), e('div', F, o(f.showTime(s).time), 1))
                              : n('', !0),
                            a(
                              'div',
                              { id: t.role, class: 'message-body' },
                              [
                                'mio_system' !== t.role
                                  ? (u(),
                                    e('div', A, [
                                      'other' === t.role
                                        ? (u(),
                                          e(
                                            'img',
                                            {
                                              key: 0,
                                              src: C.activeContactor.avatar,
                                              alt: C.activeContactor.name,
                                              onClick:
                                                v[5] ||
                                                (v[5] = (...t) =>
                                                  f.toProfile &&
                                                  f.toProfile(...t)),
                                            },
                                            null,
                                            8,
                                            N,
                                          ))
                                        : (u(),
                                          e(
                                            'img',
                                            {
                                              key: 1,
                                              src: C.client.avatar,
                                              alt: C.client.name,
                                            },
                                            null,
                                            8,
                                            J,
                                          )),
                                    ]))
                                  : n('', !0),
                                'mio_system' !== t.role
                                  ? (u(),
                                    e('div', z, [
                                      a('div', G, [
                                        (
                                          'other' === t.role
                                            ? C.activeContactor.title
                                            : C.client.title
                                        )
                                          ? (u(),
                                            e(
                                              'div',
                                              X,
                                              o(
                                                'other' === t.role
                                                  ? C.activeContactor.title
                                                  : C.client.title,
                                              ),
                                              1,
                                            ))
                                          : n('', !0),
                                        a(
                                          'div',
                                          Y,
                                          o(
                                            'other' === t.role
                                              ? C.activeContactor.name
                                              : C.client.name,
                                          ),
                                          1,
                                        ),
                                      ]),
                                      a(
                                        'div',
                                        {
                                          class: 'content',
                                          onMouseup:
                                            v[6] ||
                                            (v[6] = (...t) =>
                                              f.handleMouseUp &&
                                              f.handleMouseUp(...t)),
                                          onContextmenu: (t) =>
                                            f.showMessageMenu(t, s),
                                        },
                                        [
                                          (u(!0),
                                          e(
                                            h,
                                            null,
                                            m(
                                              t.content,
                                              (o, i) => (
                                                u(),
                                                e(
                                                  'div',
                                                  {
                                                    key: i,
                                                    class: 'inner-content',
                                                  },
                                                  [
                                                    'text' === o.type
                                                      ? (u(),
                                                        p(
                                                          b,
                                                          {
                                                            key: 0,
                                                            'no-img-zoom-in':
                                                              !1,
                                                            'preview-theme':
                                                              'github',
                                                            'code-foldable': !1,
                                                            'model-value':
                                                              [
                                                                'pending',
                                                                'retrying',
                                                              ].includes(
                                                                t.status,
                                                              ) &&
                                                              t.content.length -
                                                                1 ===
                                                                i
                                                                ? o.data.text +
                                                                  C.loadingIcon
                                                                : o.data.text,
                                                          },
                                                          null,
                                                          8,
                                                          ['model-value'],
                                                        ))
                                                      : 'image' === o.type
                                                        ? (u(),
                                                          p(
                                                            k,
                                                            {
                                                              key: `${C.activeContactor.id}-${s}-${i}-${o.data.file}`,
                                                              src: o.data.file,
                                                              'zoom-rate': 1.2,
                                                              'max-scale': 7,
                                                              'min-scale': 0.2,
                                                              'preview-src-list':
                                                                [o.data.file],
                                                              'initial-index': 4,
                                                              onLoad:
                                                                f.imageLoaded,
                                                              loading: 'lazy',
                                                              fit: 'contain',
                                                            },
                                                            null,
                                                            8,
                                                            [
                                                              'src',
                                                              'preview-src-list',
                                                              'onLoad',
                                                            ],
                                                          ))
                                                        : 'reply' === o.type
                                                          ? (u(),
                                                            p(
                                                              b,
                                                              {
                                                                key: 2,
                                                                'preview-theme':
                                                                  'github',
                                                                'model-value':
                                                                  f.getReplyText(
                                                                    o.data.id,
                                                                  ),
                                                              },
                                                              null,
                                                              8,
                                                              ['model-value'],
                                                            ))
                                                          : 'nodes' === o.type
                                                            ? (u(),
                                                              p(
                                                                S,
                                                                {
                                                                  key: 3,
                                                                  contactor:
                                                                    C.activeContactor,
                                                                  messages:
                                                                    o.data
                                                                      .messages,
                                                                },
                                                                null,
                                                                8,
                                                                [
                                                                  'contactor',
                                                                  'messages',
                                                                ],
                                                              ))
                                                            : 'file' === o.type
                                                              ? (u(),
                                                                p(
                                                                  M,
                                                                  {
                                                                    key: 4,
                                                                    'file-url':
                                                                      o.data
                                                                        .file,
                                                                  },
                                                                  null,
                                                                  8,
                                                                  ['file-url'],
                                                                ))
                                                              : 'at' === o.type
                                                                ? (u(),
                                                                  e('span', Q))
                                                                : 'reason' ===
                                                                    o.type
                                                                  ? (u(),
                                                                    p(
                                                                      I,
                                                                      {
                                                                        key: 6,
                                                                        'end-time':
                                                                          o.data
                                                                            .endTime,
                                                                        'start-time':
                                                                          o.data
                                                                            .startTime,
                                                                        content:
                                                                          o.data
                                                                            .text,
                                                                      },
                                                                      null,
                                                                      8,
                                                                      [
                                                                        'end-time',
                                                                        'start-time',
                                                                        'content',
                                                                      ],
                                                                    ))
                                                                  : 'blank' ===
                                                                      o.type
                                                                    ? (u(),
                                                                      e(
                                                                        'div',
                                                                        Z,
                                                                        v[11] ||
                                                                          (v[11] =
                                                                            [
                                                                              a(
                                                                                'span',
                                                                                {
                                                                                  class:
                                                                                    'blank-loader',
                                                                                },
                                                                                null,
                                                                                -1,
                                                                              ),
                                                                            ]),
                                                                      ))
                                                                    : 'tool_call' ===
                                                                        o.type
                                                                      ? (u(),
                                                                        p(
                                                                          x,
                                                                          {
                                                                            key: 8,
                                                                            'tool-call':
                                                                              o.data,
                                                                          },
                                                                          null,
                                                                          8,
                                                                          [
                                                                            'tool-call',
                                                                          ],
                                                                        ))
                                                                      : n(
                                                                          '',
                                                                          !0,
                                                                        ),
                                                  ],
                                                )
                                              ),
                                            ),
                                            128,
                                          )),
                                        ],
                                        40,
                                        K,
                                      ),
                                    ]))
                                  : (u(),
                                    e('div', tt, [
                                      a(
                                        'div',
                                        et,
                                        o(t.content[0].data.text),
                                        1,
                                      ),
                                      a('div', at, [
                                        a(
                                          'i',
                                          {
                                            class: 'iconfont close',
                                            onClick: (t) =>
                                              f.delSystemMessage(s),
                                          },
                                          null,
                                          8,
                                          st,
                                        ),
                                      ]),
                                    ])),
                              ],
                              8,
                              q,
                            ),
                          ],
                        )
                      ),
                    ),
                    128,
                  )),
                ],
                2,
              ),
              s(
                T,
                {
                  ref: 'inputEditor',
                  'active-contactor': C.activeContactor,
                  'replied-message-id': C.repliedMessageId,
                  onStroge: v[7] || (v[7] = (t) => C.client.setLocalStorage()),
                  onSetModel: f.setModel,
                  onCleanScreen: f.cleanScreen,
                  onCleanHistory: f.cleanHistory,
                  onToButtom: f.toButtom,
                },
                null,
                8,
                [
                  'active-contactor',
                  'replied-message-id',
                  'onSetModel',
                  'onCleanScreen',
                  'onCleanHistory',
                  'onToButtom',
                ],
              ),
            ])
          )
        },
      ],
      ['__scopeId', 'data-v-266726c4'],
    ],
  ),
  it = { class: 'blank-view' }
const nt = I(
    {
      name: 'BlankView',
      data: () => ({ fullScreen: !1, client: _ }),
      watch: {},
      created() {
        this.fullScreen = _.fullScreen
      },
      methods: {
        waiting() {
          this.$message({ message: '此功能尚未开放', type: 'warning' })
        },
      },
    },
    [
      [
        'render',
        function (t, s, o, i, n, l) {
          return (
            u(),
            e(
              'div',
              it,
              s[0] ||
                (s[0] = [
                  a(
                    'div',
                    { class: 'upside-bar' },
                    [a('div', { class: 'options' })],
                    -1,
                  ),
                ]),
            )
          )
        },
      ],
      ['__scopeId', 'data-v-29ea73df'],
    ],
  ),
  lt = { key: 0, id: 'main' },
  ct = { key: 1, id: 'main-mobile' },
  rt = { key: 2, id: 'main-mobile', class: 'mobile-chat' }
const dt = I(
    {
      components: { friendlist: R, blankView: nt },
      data() {
        return {
          onPhone: window.innerWidth < 600,
          pagePath: this.$route.path,
          loaded: !1,
        }
      },
      watch: {
        $route: function (t) {
          this.pagePath = t.path
        },
      },
      mounted() {
        _.inited
          ? (this.loaded = !0)
          : _.on(
              'loaded',
              () => {
                this.loaded = !0
              },
              !1,
            )
      },
    },
    [
      [
        'render',
        function (t, a, o, i, n, l) {
          const c = d('friendlist'),
            r = d('router-view'),
            h = d('blankView')
          return n.onPhone
            ? '/' === n.pagePath
              ? (u(),
                e('div', ct, [
                  n.loaded ? (u(), p(c, { key: 0 })) : (u(), p(h, { key: 1 })),
                ]))
              : (u(),
                e('div', rt, [
                  n.loaded ? (u(), p(r, { key: 0 })) : (u(), p(h, { key: 1 })),
                ]))
            : (u(),
              e('div', lt, [
                s(c),
                n.loaded ? (u(), p(r, { key: 0 })) : (u(), p(h, { key: 1 })),
              ]))
        },
      ],
    ],
  ),
  ht = { class: 'profile-body' },
  mt = { id: 'profile' },
  ut = { class: 'profile-container' },
  pt = { class: 'base-info' },
  vt = { class: 'base-info-avatar' },
  gt = { class: 'base-info-content' },
  yt = { class: 'name' },
  Ct = { class: 'id' },
  ft = { class: 'status' },
  wt = { class: 'info-blocks' },
  bt = { class: 'settings-block' },
  kt = { class: 'block-content' },
  St = { class: 'block-content-item' },
  Mt = { class: 'item-content' },
  It = { class: 'block-content-item' },
  xt = { class: 'item-content' },
  Tt = { key: 0, class: 'block-content-item' },
  Pt = { class: 'item-content' },
  Lt = { key: 1, class: 'block-content-item' },
  $t = { class: 'item-content' },
  Vt = { class: 'block-content-item' },
  _t = { class: 'item-content' },
  Rt = { class: 'info-blocks' },
  Dt = { class: 'action-bar' },
  Bt = { class: 'dialog-footer' }
const Ot = I(
    {
      components: { ContactorSettings: D },
      data() {
        const t = parseInt(this.$route.params.id),
          e = _.getContactor(t),
          a = B.getToolCallModes(),
          s = B.getLLMProviders(),
          o = B.getSafetySettingsParams(),
          i = Object.keys(o).map((t) => ({ value: t, label: t })),
          n = []
        for (const l in B.llmTools) {
          const t = B.llmTools[l],
            e = Object.keys(t).map((e) => ({ enabled: !1, ...t[e] }))
          n.push({ name: l, tools: e, collapsed: !0 })
        }
        return {
          activeContactor: e,
          options: null,
          currentDelay: 0,
          centerDialogVisible: !1,
          avatarPolicyList: [
            { value: 0, label: '跟随模型' },
            { value: 1, label: '自定义' },
          ],
          namePolicyList: [
            { value: 0, label: '跟随模型' },
            { value: 1, label: '自定义' },
            { value: 2, label: '对话摘要' },
          ],
          isOnebot: 'onebot' === e.platform,
          llmProviders: s,
          toolCallModes: a,
          safetyParams: o,
          safetySimpleValue: i,
          allLLMTools: n,
          basicInfo: null,
        }
      },
      computed: {
        getDelayStatus() {
          return this.currentDelay > 1e3
            ? 'high'
            : this.currentDelay > 500
              ? 'mid'
              : this.currentDelay > 100
                ? 'low'
                : 'ultra'
        },
        getAvatarPolicyValue() {
          return 1 === this.basicInfo.avatarPolicy ? '自定义' : '跟随模型'
        },
      },
      watch: {
        '$route.params.id'(t) {
          const e = parseInt(t)
          ;((this.activeContactor = _.getContactor(e)),
            this.activeContactor &&
              (this.isOnebot = 'onebot' === this.activeContactor.platform),
            this.initContactor())
        },
        options: {
          handler(t) {
            t &&
              this.activeContactor &&
              ((this.activeContactor.options = JSON.parse(JSON.stringify(t))),
              _.setLocalStorage())
          },
          deep: !0,
        },
        basicInfo: {
          handler(t) {
            t &&
              this.activeContactor &&
              ((this.activeContactor.name = t.name),
              (this.activeContactor.avatar = t.avatar),
              (this.activeContactor.namePolicy = t.namePolicy),
              (this.activeContactor.avatarPolicy = t.avatarPolicy),
              (this.activeContactor.priority = t.priority ? 0 : 1),
              _.setLocalStorage())
          },
          deep: !0,
        },
      },
      created() {
        this.initContactor()
      },
      mounted() {
        this.delayInterval = setInterval(() => {
          this.currentDelay = _.socket.delay
        }, 3e3)
      },
      beforeUnmount() {
        this.delayInterval && clearInterval(this.delayInterval)
      },
      methods: {
        initContactor() {
          this.options = JSON.parse(
            JSON.stringify(this.activeContactor.options),
          )
          const {
            name: t,
            avatar: e,
            namePolicy: a,
            avatarPolicy: s,
            priority: o,
          } = this.activeContactor
          ;((this.basicInfo = {
            name: t,
            avatar: e,
            namePolicy: a,
            avatarPolicy: s,
            priority: 1 !== o,
          }),
            'onebot' === this.activeContactor.platform &&
              this.options.toolCallSettings &&
              ((this.options.toolCallSettings.mode = 'none'),
              (this.options.toolCallSettings.tools = [])))
        },
        handleUpdateOpenaiPresets(t) {
          this.options &&
            this.options.presetSettings &&
            ((this.options.presetSettings.history = t),
            this.$message({ message: '预设历史记录已更新', type: 'success' }))
        },
        async delContactor() {
          ;((this.centerDialogVisible = !1),
            await _.rmContactor(this.activeContactor.id),
            this.$router.push('/'))
        },
        handleProviderSwitched(t) {
          this.activeContactor.loadAvatar()
        },
        getBaseInfoShownValue(t) {},
        updateContactorName() {
          0 === this.basicInfo.namePolicy &&
            (this.basicInfo.name = this.activeContactor.options.base.model)
        },
        updateContactorAvatar() {
          const { avatarPolicy: t } = this.basicInfo
          ;((this.activeContactor.avatarPolicy = t),
            (this.basicInfo.avatar = this.activeContactor.loadAvatar()))
        },
      },
    },
    [
      [
        'render',
        function (t, l, c, r, y, C) {
          const f = d('el-image'),
            w = d('el-input'),
            b = d('el-option'),
            k = d('el-select'),
            S = d('el-switch'),
            M = d('ContactorSettings'),
            I = d('el-button'),
            x = d('el-dialog')
          return (
            u(),
            e('div', ht, [
              a('div', mt, [
                a('div', ut, [
                  a('div', pt, [
                    a('div', vt, [
                      s(
                        f,
                        {
                          src: y.activeContactor.avatar,
                          'preview-src-list': [y.activeContactor.avatar],
                        },
                        null,
                        8,
                        ['src', 'preview-src-list'],
                      ),
                    ]),
                    a('div', gt, [
                      a('div', yt, o(y.activeContactor.name), 1),
                      a('div', Ct, 'ID ' + o(y.activeContactor.id), 1),
                      a('div', ft, [
                        a(
                          'span',
                          { class: i('delay-status ' + C.getDelayStatus) },
                          null,
                          2,
                        ),
                        l[10] || (l[10] = v(' 在线 ')),
                      ]),
                    ]),
                  ]),
                  a('div', wt, [
                    a('div', bt, [
                      l[16] ||
                        (l[16] = a(
                          'div',
                          { class: 'block-title' },
                          'Bot 基本配置',
                          -1,
                        )),
                      a('div', kt, [
                        a('div', St, [
                          l[11] ||
                            (l[11] = a(
                              'div',
                              { class: 'item-title' },
                              '昵称',
                              -1,
                            )),
                          a('div', Mt, [
                            s(
                              w,
                              {
                                modelValue: y.basicInfo.name,
                                'onUpdate:modelValue':
                                  l[0] ||
                                  (l[0] = (t) => (y.basicInfo.name = t)),
                                disabled: 1 !== y.basicInfo.namePolicy,
                              },
                              null,
                              8,
                              ['modelValue', 'disabled'],
                            ),
                          ]),
                        ]),
                        a('div', It, [
                          l[12] ||
                            (l[12] = a(
                              'div',
                              { class: 'item-title' },
                              '头像',
                              -1,
                            )),
                          a('div', xt, [
                            1 !== y.basicInfo.avatarPolicy
                              ? (u(),
                                p(w, {
                                  key: 0,
                                  value: '跟随模型',
                                  disabled: !0,
                                }))
                              : (u(),
                                p(
                                  w,
                                  {
                                    key: 1,
                                    modelValue: y.basicInfo.avatar,
                                    'onUpdate:modelValue':
                                      l[1] ||
                                      (l[1] = (t) => (y.basicInfo.avatar = t)),
                                    disabled: y.isOnebot,
                                  },
                                  null,
                                  8,
                                  ['modelValue', 'disabled'],
                                )),
                          ]),
                        ]),
                        y.isOnebot
                          ? n('', !0)
                          : (u(),
                            e('div', Tt, [
                              l[13] ||
                                (l[13] = a(
                                  'div',
                                  { class: 'item-title' },
                                  '头像策略',
                                  -1,
                                )),
                              a('div', Pt, [
                                s(
                                  k,
                                  {
                                    modelValue: y.basicInfo.avatarPolicy,
                                    'onUpdate:modelValue':
                                      l[2] ||
                                      (l[2] = (t) =>
                                        (y.basicInfo.avatarPolicy = t)),
                                    onChange: C.updateContactorAvatar,
                                  },
                                  {
                                    default: g(() => [
                                      (u(!0),
                                      e(
                                        h,
                                        null,
                                        m(
                                          y.avatarPolicyList,
                                          (t) => (
                                            u(),
                                            p(
                                              b,
                                              {
                                                key: t.value,
                                                label: t.label,
                                                value: t.value,
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
                            ])),
                        y.isOnebot
                          ? n('', !0)
                          : (u(),
                            e('div', Lt, [
                              l[14] ||
                                (l[14] = a(
                                  'div',
                                  { class: 'item-title' },
                                  '昵称策略',
                                  -1,
                                )),
                              a('div', $t, [
                                s(
                                  k,
                                  {
                                    modelValue: y.basicInfo.namePolicy,
                                    'onUpdate:modelValue':
                                      l[3] ||
                                      (l[3] = (t) =>
                                        (y.basicInfo.namePolicy = t)),
                                    onChange: C.updateContactorName,
                                  },
                                  {
                                    default: g(() => [
                                      (u(!0),
                                      e(
                                        h,
                                        null,
                                        m(
                                          y.namePolicyList,
                                          (t) => (
                                            u(),
                                            p(
                                              b,
                                              {
                                                key: t.value,
                                                label: t.label,
                                                value: t.value,
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
                            ])),
                        a('div', Vt, [
                          l[15] ||
                            (l[15] = a(
                              'div',
                              { class: 'item-title' },
                              '会话置顶',
                              -1,
                            )),
                          a('div', _t, [
                            s(
                              S,
                              {
                                modelValue: y.basicInfo.priority,
                                'onUpdate:modelValue':
                                  l[4] ||
                                  (l[4] = (t) => (y.basicInfo.priority = t)),
                              },
                              null,
                              8,
                              ['modelValue'],
                            ),
                          ]),
                        ]),
                      ]),
                    ]),
                  ]),
                  a('div', Rt, [
                    y.isOnebot
                      ? n('', !0)
                      : (u(),
                        p(
                          M,
                          {
                            key: 0,
                            'model-value': y.options,
                            'onUpdate:modelValue':
                              l[5] || (l[5] = (t) => (y.options = t)),
                            'active-contactor-platform':
                              y.activeContactor.platform,
                            'llm-providers-list': y.llmProviders,
                            'tool-call-modes-list': y.toolCallModes,
                            'all-llm-tools-data': y.allLLMTools,
                            'safety-settings-params': y.safetyParams,
                            'safety-simple-value-options': y.safetySimpleValue,
                            'presets-history-data':
                              y.options.presetSettings?.history,
                            onProviderChanged: C.handleProviderSwitched,
                            onUpdatePresets: C.handleUpdateOpenaiPresets,
                          },
                          null,
                          8,
                          [
                            'model-value',
                            'active-contactor-platform',
                            'llm-providers-list',
                            'tool-call-modes-list',
                            'all-llm-tools-data',
                            'safety-settings-params',
                            'safety-simple-value-options',
                            'presets-history-data',
                            'onProviderChanged',
                            'onUpdatePresets',
                          ],
                        )),
                  ]),
                ]),
              ]),
              a('div', Dt, [
                s(
                  I,
                  {
                    plain: '',
                    onClick:
                      l[6] ||
                      (l[6] = (e) =>
                        t.$router.push(`/chat/${y.activeContactor.id}`)),
                  },
                  {
                    default: g(() => l[17] || (l[17] = [v(' 发送消息 ')])),
                    _: 1,
                  },
                ),
                s(
                  I,
                  {
                    type: 'danger',
                    plain: '',
                    onClick:
                      l[7] || (l[7] = (t) => (y.centerDialogVisible = !0)),
                  },
                  {
                    default: g(() => l[18] || (l[18] = [v(' 删除好友 ')])),
                    _: 1,
                  },
                ),
                s(
                  x,
                  {
                    modelValue: y.centerDialogVisible,
                    'onUpdate:modelValue':
                      l[9] || (l[9] = (t) => (y.centerDialogVisible = t)),
                    title: '警告',
                    width: '300',
                    center: '',
                  },
                  {
                    footer: g(() => [
                      a('div', Bt, [
                        s(
                          I,
                          {
                            onClick:
                              l[8] ||
                              (l[8] = (t) => (y.centerDialogVisible = !1)),
                          },
                          {
                            default: g(() => l[19] || (l[19] = [v('取消')])),
                            _: 1,
                          },
                        ),
                        s(
                          I,
                          { type: 'primary', onClick: C.delContactor },
                          {
                            default: g(() => l[20] || (l[20] = [v(' 确认 ')])),
                            _: 1,
                          },
                          8,
                          ['onClick'],
                        ),
                      ]),
                    ]),
                    default: g(() => [
                      l[21] ||
                        (l[21] = a(
                          'span',
                          null,
                          ' 确认要删除此好友吗？该操作不可逆。 ',
                          -1,
                        )),
                    ]),
                    _: 1,
                  },
                  8,
                  ['modelValue'],
                ),
              ]),
            ])
          )
        },
      ],
      ['__scopeId', 'data-v-00143dfc'],
    ],
  ),
  Ut = { id: 'settings-view' }
const Wt = I(
    {
      name: 'SettingsView',
      data: () => ({}),
      methods: {
        async reset() {
          ;(await _.reset()) &&
            (this.$message.success('重置成功'),
            setTimeout(() => {
              window.location.reload()
            }, 500))
        },
        async resetCache() {
          ;(await _.resetCache(),
            this.$message.success('清理缓存成功'),
            setTimeout(() => {
              window.location.reload()
            }, 500))
        },
      },
    },
    [
      [
        'render',
        function (t, a, o, i, n, l) {
          const c = d('el-button')
          return (
            u(),
            e('div', Ut, [
              s(
                c,
                {
                  type: 'info',
                  plain: '',
                  onClick: a[0] || (a[0] = (t) => l.reset()),
                },
                { default: g(() => a[2] || (a[2] = [v('重置全部')])), _: 1 },
              ),
              s(
                c,
                {
                  type: 'info',
                  plain: '',
                  onClick: a[1] || (a[1] = (t) => l.resetCache()),
                },
                { default: g(() => a[3] || (a[3] = [v('清理缓存')])), _: 1 },
              ),
            ])
          )
        },
      ],
      ['__scopeId', 'data-v-330c2ae1'],
    ],
  ),
  Et = { class: 'auth-view' },
  Ht = { class: 'container' },
  jt = { class: 'controls' },
  Ft = I(
    {
      __name: 'AuthView',
      setup(t) {
        const s = y(),
          o = y(!1),
          i = y(),
          n = async (t) => {
            if ((await b(() => i.value.classList.add('active')), !o.value)) {
              o.value = !0
              try {
                const e = await _.login(t)
                e &&
                  (k.success(
                    `成功以${e.is_admin ? '管理员身份' : '游客身份'}登录，欢迎使用!`,
                  ),
                  qt.currentRoute.value.query.redirect
                    ? qt.push(qt.currentRoute.value.query.redirect)
                    : qt.push('/'))
              } catch (e) {
                k.error(e)
              } finally {
                ;(await b(() => i.value.classList.remove('active')),
                  (o.value = !1))
              }
            }
          }
        function c(t) {
          'Enter' === t.key && n(s.value)
        }
        return (
          C(() => {
            removeEventListener('keydown', c)
          }),
          f(() => {
            ;(addEventListener('keydown', c),
              qt.currentRoute.value.query.key &&
                n(qt.currentRoute.value.query.key))
          }),
          (t, o) => (
            u(),
            e('div', Et, [
              a('div', Ht, [
                a(
                  'div',
                  { ref_key: 'iconContainer', ref: i, class: 'icon-container' },
                  o[3] ||
                    (o[3] = [a('i', { class: 'iconfont ChatGPT' }, null, -1)]),
                  512,
                ),
                o[4] || (o[4] = a('h1', { class: 'title' }, '登录验证', -1)),
                o[5] ||
                  (o[5] = a(
                    'p',
                    { class: 'hint' },
                    '管理员开启了密码验证，请在下方填入访问码',
                    -1,
                  )),
                l(
                  a(
                    'input',
                    {
                      'onUpdate:modelValue':
                        o[0] || (o[0] = (t) => (s.value = t)),
                      type: 'password',
                      placeholder: '在此处填写访问码',
                    },
                    null,
                    512,
                  ),
                  [[w, s.value]],
                ),
                a('div', jt, [
                  a(
                    'button',
                    { class: 'later', onClick: o[1] || (o[1] = (t) => n()) },
                    '游客登录',
                  ),
                  a(
                    'button',
                    {
                      class: 'login',
                      onClick: o[2] || (o[2] = (t) => n(s.value)),
                    },
                    '登录',
                  ),
                ]),
              ]),
            ])
          )
        )
      },
    },
    [['__scopeId', 'data-v-02fd5e8c']],
  ),
  qt = S({
    history: M('/'),
    routes: [
      {
        path: '/',
        name: 'home',
        component: dt,
        children: [
          { path: '/', name: 'blank', component: nt },
          { path: '/contactors', name: 'contactors', component: nt },
          { path: '/chat/:id', name: 'chat_view', component: ot },
          { path: '/profile/:id', name: 'profile_view', component: Ot },
        ],
      },
      { path: '/auth', name: 'auth', component: Ft },
      { path: '/settings', name: 'settings', component: Wt },
    ],
  })
qt.beforeEach(async (t) => {
  if (!_.everLogin() && 'auth' !== t.name) {
    k.warning('请先登录')
    return {
      name: 'auth',
      query: '/settings' === t.path ? null : { redirect: t.fullPath },
    }
  }
})
export { qt as r }
//# sourceMappingURL=views-cg9N_QNj.js.map
