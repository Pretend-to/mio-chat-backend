var uo = Object.defineProperty
var no = (e, t, u) =>
  t in e
    ? uo(e, t, { enumerable: !0, configurable: !0, writable: !0, value: u })
    : (e[t] = u)
var Z = (e, t, u) => (no(e, typeof t != 'symbol' ? t + '' : t, u), u),
  Ru = (e, t, u) => {
    if (!t.has(e)) throw TypeError('Cannot ' + u)
  }
var f = (e, t, u) => (
    Ru(e, t, 'read from private field'), u ? u.call(e) : t.get(e)
  ),
  j = (e, t, u) => {
    if (t.has(e))
      throw TypeError('Cannot add the same private member more than once')
    t instanceof WeakSet ? t.add(e) : t.set(e, u)
  },
  T = (e, t, u, n) => (
    Ru(e, t, 'write to private field'), n ? n.call(e, u) : t.set(e, u), u
  )
var Xt = (e, t, u, n) => ({
    set _(i) {
      T(e, t, i, u)
    },
    get _() {
      return f(e, t, n)
    },
  }),
  S = (e, t, u) => (Ru(e, t, 'access private method'), u)
import {
  g as vn,
  h as Lr,
  i as ro,
  e as it,
  j as ye,
  F as au,
  k as Ue,
  l as nt,
  m as et,
  w as Ye,
  n as jr,
  q as Ou,
  s as gu,
  u as io,
  v as un,
  _ as oo,
  c as Bu,
  a as ue,
  x as zt,
  y as Qt,
  b as F,
  t as Pu,
  z as Yt,
  r as $u,
  A as so,
  B as ao,
  o as J,
  C as Nn,
  p as co,
  d as lo,
  f as qn,
} from './index-DOclrP3U.js'
const P = 'md-editor',
  fo = 'https://at.alicdn.com/t/c/font_2605852_rfu1p40qggh.js',
  ho = 'https://at.alicdn.com/t/c/font_2605852_rfu1p40qggh.css',
  te = 'https://cdnjs.cloudflare.com/ajax/libs',
  po = `${te}/highlight.js/11.8.0/highlight.min.js`,
  mo = [
    'bold',
    'underline',
    'italic',
    'strikeThrough',
    '-',
    'title',
    'sub',
    'sup',
    'quote',
    'unorderedList',
    'orderedList',
    'task',
    '-',
    'codeRow',
    'code',
    'link',
    'image',
    'table',
    'mermaid',
    'katex',
    '-',
    'revoke',
    'next',
    'save',
    '=',
    'prettier',
    'pageFullscreen',
    'fullscreen',
    'preview',
    'previewOnly',
    'htmlPreview',
    'catalog',
    'github',
  ],
  bo = ['markdownTotal', '=', 'scrollSwitch'],
  Hn = {
    'zh-CN': {
      toolbarTips: {
        bold: '加粗',
        underline: '下划线',
        italic: '斜体',
        strikeThrough: '删除线',
        title: '标题',
        sub: '下标',
        sup: '上标',
        quote: '引用',
        unorderedList: '无序列表',
        orderedList: '有序列表',
        task: '任务列表',
        codeRow: '行内代码',
        code: '块级代码',
        link: '链接',
        image: '图片',
        table: '表格',
        mermaid: 'mermaid图',
        katex: 'katex公式',
        revoke: '后退',
        next: '前进',
        save: '保存',
        prettier: '美化',
        pageFullscreen: '浏览器全屏',
        fullscreen: '屏幕全屏',
        preview: '预览',
        previewOnly: '仅预览',
        htmlPreview: 'html代码预览',
        catalog: '目录',
        github: '源码地址',
      },
      titleItem: {
        h1: '一级标题',
        h2: '二级标题',
        h3: '三级标题',
        h4: '四级标题',
        h5: '五级标题',
        h6: '六级标题',
      },
      imgTitleItem: {
        link: '添加链接',
        upload: '上传图片',
        clip2upload: '裁剪上传',
      },
      linkModalTips: {
        linkTitle: '添加链接',
        imageTitle: '添加图片',
        descLabel: '链接描述：',
        descLabelPlaceHolder: '请输入描述...',
        urlLabel: '链接地址：',
        urlLabelPlaceHolder: '请输入链接...',
        buttonOK: '确定',
      },
      clipModalTips: { title: '裁剪图片上传', buttonUpload: '上传' },
      copyCode: {
        text: '复制代码',
        successTips: '已复制！',
        failTips: '复制失败！',
      },
      mermaid: {
        flow: '流程图',
        sequence: '时序图',
        gantt: '甘特图',
        class: '类图',
        state: '状态图',
        pie: '饼图',
        relationship: '关系图',
        journey: '旅程图',
      },
      katex: { inline: '行内公式', block: '块级公式' },
      footer: { markdownTotal: '字数', scrollAuto: '同步滚动' },
    },
    'en-US': {
      toolbarTips: {
        bold: 'bold',
        underline: 'underline',
        italic: 'italic',
        strikeThrough: 'strikeThrough',
        title: 'title',
        sub: 'subscript',
        sup: 'superscript',
        quote: 'quote',
        unorderedList: 'unordered list',
        orderedList: 'ordered list',
        task: 'task list',
        codeRow: 'inline code',
        code: 'block-level code',
        link: 'link',
        image: 'image',
        table: 'table',
        mermaid: 'mermaid',
        katex: 'formula',
        revoke: 'revoke',
        next: 'undo revoke',
        save: 'save',
        prettier: 'prettier',
        pageFullscreen: 'fullscreen in page',
        fullscreen: 'fullscreen',
        preview: 'preview',
        previewOnly: 'preview only',
        htmlPreview: 'html preview',
        catalog: 'catalog',
        github: 'source code',
      },
      titleItem: {
        h1: 'Lv1 Heading',
        h2: 'Lv2 Heading',
        h3: 'Lv3 Heading',
        h4: 'Lv4 Heading',
        h5: 'Lv5 Heading',
        h6: 'Lv6 Heading',
      },
      imgTitleItem: {
        link: 'Add Img Link',
        upload: 'Upload Img',
        clip2upload: 'Clip Upload',
      },
      linkModalTips: {
        linkTitle: 'Add Link',
        imageTitle: 'Add Image',
        descLabel: 'Desc:',
        descLabelPlaceHolder: 'Enter a description...',
        urlLabel: 'Link:',
        urlLabelPlaceHolder: 'Enter a link...',
        buttonOK: 'OK',
      },
      clipModalTips: { title: 'Crop Image', buttonUpload: 'Upload' },
      copyCode: {
        text: 'Copy',
        successTips: 'Copied!',
        failTips: 'Copy failed!',
      },
      mermaid: {
        flow: 'flow',
        sequence: 'sequence',
        gantt: 'gantt',
        class: 'class',
        state: 'state',
        pie: 'pie',
        relationship: 'relationship',
        journey: 'journey',
      },
      katex: { inline: 'inline', block: 'block' },
      footer: { markdownTotal: 'Character Count', scrollAuto: 'Scroll Auto' },
    },
  },
  go = `${te}/mermaid/10.6.1/mermaid.esm.min.mjs`,
  Un = {
    js: `${te}/KaTeX/0.16.9/katex.min.js`,
    css: `${te}/KaTeX/0.16.9/katex.min.css`,
  },
  Vn = {
    a11y: {
      light: `${te}/highlight.js/11.8.0/styles/a11y-light.min.css`,
      dark: `${te}/highlight.js/11.8.0/styles/a11y-dark.min.css`,
    },
    atom: {
      light: `${te}/highlight.js/11.8.0/styles/atom-one-light.min.css`,
      dark: `${te}/highlight.js/11.8.0/styles/atom-one-dark.min.css`,
    },
    github: {
      light: `${te}/highlight.js/11.8.0/styles/github.min.css`,
      dark: `${te}/highlight.js/11.8.0/styles/github-dark.min.css`,
    },
    gradient: {
      light: `${te}/highlight.js/11.8.0/styles/gradient-light.min.css`,
      dark: `${te}/highlight.js/11.8.0/styles/gradient-dark.min.css`,
    },
    kimbie: {
      light: `${te}/highlight.js/11.8.0/styles/kimbie-light.min.css`,
      dark: `${te}/highlight.js/11.8.0/styles/kimbie-dark.min.css`,
    },
    paraiso: {
      light: `${te}/highlight.js/11.8.0/styles/paraiso-light.min.css`,
      dark: `${te}/highlight.js/11.8.0/styles/paraiso-dark.min.css`,
    },
    qtcreator: {
      light: `${te}/highlight.js/11.8.0/styles/qtcreator-light.min.css`,
      dark: `${te}/highlight.js/11.8.0/styles/qtcreator-dark.min.css`,
    },
    stackoverflow: {
      light: `${te}/highlight.js/11.8.0/styles/stackoverflow-light.min.css`,
      dark: `${te}/highlight.js/11.8.0/styles/stackoverflow-dark.min.css`,
    },
  },
  Pe = {
    editorExtensions: {},
    editorConfig: {},
    codeMirrorExtensions: (e, t) => t,
    markdownItConfig: () => {},
    markdownItPlugins: (e) => e,
    iconfontType: 'svg',
    mermaidConfig: (e) => e,
  },
  xo = (e) => {
    const t = typeof e
    return (t !== 'function' && t !== 'object') || e === null
  },
  _o = (e) => {
    const t = e.flags === '' ? void 0 : e.flags
    return new RegExp(e.source, t)
  },
  Mt = (e, t = new WeakMap()) => {
    if (e === null || xo(e)) return e
    if (t.has(e)) return t.get(e)
    if (e instanceof RegExp) return _o(e)
    if (e instanceof Date) return new Date(e.getTime())
    if (e instanceof Function) return e
    if (e instanceof Map) {
      const n = new Map()
      return (
        t.set(e, n),
        e.forEach((i, r) => {
          n.set(r, Mt(i, t))
        }),
        n
      )
    }
    if (e instanceof Set) {
      const n = new Set()
      t.set(e, n)
      for (const i of e) n.add(Mt(i, t))
      return n
    }
    if (Array.isArray(e)) {
      const n = []
      return (
        t.set(e, n),
        e.forEach((i) => {
          n.push(Mt(i, t))
        }),
        n
      )
    }
    const u = {}
    t.set(e, u)
    for (const n in e)
      Object.prototype.hasOwnProperty.call(e, n) && (u[n] = Mt(e[n], t))
    return u
  },
  wn = (e, t = 200) => {
    let u = 0
    return (...n) =>
      new Promise((i) => {
        u && (clearTimeout(u), i('cancel')),
          (u = window.setTimeout(() => {
            e.apply(void 0, n), (u = 0), i('done')
          }, t))
      })
  },
  nn = () =>
    `${Date.now().toString(36)}${Math.random().toString(36).substring(2)}`,
  Wn = (e) => e !== null && typeof e == 'object' && !Array.isArray(e),
  Mr = (e, t) => {
    for (const u in t)
      Wn(t[u]) && Wn(e[u]) ? (e[u] = Mr(e[u], t[u])) : (e[u] = t[u])
    return e
  }
var ko = Object.defineProperty,
  yo = (e, t, u) =>
    t in e
      ? ko(e, t, { enumerable: !0, configurable: !0, writable: !0, value: u })
      : (e[t] = u),
  vo = (e, t, u) => (yo(e, typeof t != 'symbol' ? t + '' : t, u), u)
class wo {
  constructor() {
    vo(this, 'pools', {})
  }
  remove(t, u, n) {
    const r = this.pools[t] && this.pools[t][u]
    r && (this.pools[t][u] = r.filter((o) => o !== n))
  }
  clear(t) {
    this.pools[t] = {}
  }
  on(t, u) {
    return (
      this.pools[t] || (this.pools[t] = {}),
      this.pools[t][u.name] || (this.pools[t][u.name] = []),
      this.pools[t][u.name].push(u.callback),
      this.pools[t][u.name].includes(u.callback)
    )
  }
  emit(t, u, ...n) {
    this.pools[t] || (this.pools[t] = {})
    const r = this.pools[t][u]
    r &&
      r.forEach((o) => {
        try {
          o(...n)
        } catch (s) {
          console.error(`${u} monitor event exception！`, s)
        }
      })
  }
}
const ot = new wo(),
  Eo = 'buildFinished',
  Gn = 'catalogChanged',
  Co = 'pushCatalog',
  Rr = 'rerender',
  Ao = (e) => {
    if (!e) return e
    const t = e.split(`
`),
      u = ['<span rn-wrapper aria-hidden="true">']
    return (
      t.forEach(() => {
        u.push('<span></span>')
      }),
      u.push('</span>'),
      `<span class="code-block">${e}</span>${u.join('')}`
    )
  },
  Do = (() => {
    let e = 0
    return (t) => t + ++e
  })(),
  dt = (e, t = '') => {
    const u = document.getElementById(e.id),
      n = e.onload
    e.onload = null
    const i = function (r) {
      typeof n == 'function' && n.bind(this)(r),
        e.removeEventListener('load', i)
    }
    u
      ? t !== '' &&
        (u.addEventListener('load', i),
        Reflect.get(window, t) && u.dispatchEvent(new Event('load')))
      : (e.addEventListener('load', i), document.head.appendChild(e))
  },
  Fo = wn((e, t, u) => {
    const n = document.getElementById(e)
    n && n.setAttribute(t, u)
  }, 10)
/*! medium-zoom 1.1.0 | MIT License | https://github.com/francoischalifour/medium-zoom */ var rt =
    Object.assign ||
    function (e) {
      for (var t = 1; t < arguments.length; t++) {
        var u = arguments[t]
        for (var n in u)
          Object.prototype.hasOwnProperty.call(u, n) && (e[n] = u[n])
      }
      return e
    },
  Jt = function (t) {
    return t.tagName === 'IMG'
  },
  So = function (t) {
    return NodeList.prototype.isPrototypeOf(t)
  },
  cu = function (t) {
    return t && t.nodeType === 1
  },
  Zn = function (t) {
    var u = t.currentSrc || t.src
    return u.substr(-4).toLowerCase() === '.svg'
  },
  Kn = function (t) {
    try {
      return Array.isArray(t)
        ? t.filter(Jt)
        : So(t)
          ? [].slice.call(t).filter(Jt)
          : cu(t)
            ? [t].filter(Jt)
            : typeof t == 'string'
              ? [].slice.call(document.querySelectorAll(t)).filter(Jt)
              : []
    } catch {
      throw new TypeError(`The provided selector is invalid.
Expects a CSS selector, a Node element, a NodeList or an array.
See: https://github.com/francoischalifour/medium-zoom`)
    }
  },
  To = function (t) {
    var u = document.createElement('div')
    return u.classList.add('medium-zoom-overlay'), (u.style.background = t), u
  },
  Io = function (t) {
    var u = t.getBoundingClientRect(),
      n = u.top,
      i = u.left,
      r = u.width,
      o = u.height,
      s = t.cloneNode(),
      a =
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0,
      c =
        window.pageXOffset ||
        document.documentElement.scrollLeft ||
        document.body.scrollLeft ||
        0
    return (
      s.removeAttribute('id'),
      (s.style.position = 'absolute'),
      (s.style.top = n + a + 'px'),
      (s.style.left = i + c + 'px'),
      (s.style.width = r + 'px'),
      (s.style.height = o + 'px'),
      (s.style.transform = ''),
      s
    )
  },
  bt = function (t, u) {
    var n = rt({ bubbles: !1, cancelable: !1, detail: void 0 }, u)
    if (typeof window.CustomEvent == 'function') return new CustomEvent(t, n)
    var i = document.createEvent('CustomEvent')
    return i.initCustomEvent(t, n.bubbles, n.cancelable, n.detail), i
  },
  zo = function e(t) {
    var u = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {},
      n =
        window.Promise ||
        function (I) {
          function M() {}
          I(M, M)
        },
      i = function (I) {
        var M = I.target
        if (M === H) {
          h()
          return
        }
        k.indexOf(M) !== -1 && _({ target: M })
      },
      r = function () {
        if (!(E || !v.original)) {
          var I =
            window.pageYOffset ||
            document.documentElement.scrollTop ||
            document.body.scrollTop ||
            0
          Math.abs(C - I) > D.scrollOffset && setTimeout(h, 150)
        }
      },
      o = function (I) {
        var M = I.key || I.keyCode
        ;(M === 'Escape' || M === 'Esc' || M === 27) && h()
      },
      s = function () {
        var I =
            arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {},
          M = I
        if (
          (I.background && (H.style.background = I.background),
          I.container &&
            I.container instanceof Object &&
            (M.container = rt({}, D.container, I.container)),
          I.template)
        ) {
          var q = cu(I.template)
            ? I.template
            : document.querySelector(I.template)
          M.template = q
        }
        return (
          (D = rt({}, D, M)),
          k.forEach(function (N) {
            N.dispatchEvent(bt('medium-zoom:update', { detail: { zoom: R } }))
          }),
          R
        )
      },
      a = function () {
        var I =
          arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}
        return e(rt({}, D, I))
      },
      c = function () {
        for (var I = arguments.length, M = Array(I), q = 0; q < I; q++)
          M[q] = arguments[q]
        var N = M.reduce(function (O, re) {
          return [].concat(O, Kn(re))
        }, [])
        return (
          N.filter(function (O) {
            return k.indexOf(O) === -1
          }).forEach(function (O) {
            k.push(O), O.classList.add('medium-zoom-image')
          }),
          w.forEach(function (O) {
            var re = O.type,
              pe = O.listener,
              ze = O.options
            N.forEach(function (Le) {
              Le.addEventListener(re, pe, ze)
            })
          }),
          R
        )
      },
      l = function () {
        for (var I = arguments.length, M = Array(I), q = 0; q < I; q++)
          M[q] = arguments[q]
        v.zoomed && h()
        var N =
          M.length > 0
            ? M.reduce(function (O, re) {
                return [].concat(O, Kn(re))
              }, [])
            : k
        return (
          N.forEach(function (O) {
            O.classList.remove('medium-zoom-image'),
              O.dispatchEvent(bt('medium-zoom:detach', { detail: { zoom: R } }))
          }),
          (k = k.filter(function (O) {
            return N.indexOf(O) === -1
          })),
          R
        )
      },
      d = function (I, M) {
        var q =
          arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}
        return (
          k.forEach(function (N) {
            N.addEventListener('medium-zoom:' + I, M, q)
          }),
          w.push({ type: 'medium-zoom:' + I, listener: M, options: q }),
          R
        )
      },
      m = function (I, M) {
        var q =
          arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}
        return (
          k.forEach(function (N) {
            N.removeEventListener('medium-zoom:' + I, M, q)
          }),
          (w = w.filter(function (N) {
            return !(
              N.type === 'medium-zoom:' + I &&
              N.listener.toString() === M.toString()
            )
          })),
          R
        )
      },
      p = function () {
        var I =
            arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {},
          M = I.target,
          q = function () {
            var O = {
                width: document.documentElement.clientWidth,
                height: document.documentElement.clientHeight,
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
              },
              re = void 0,
              pe = void 0
            if (D.container)
              if (D.container instanceof Object)
                (O = rt({}, O, D.container)),
                  (re = O.width - O.left - O.right - D.margin * 2),
                  (pe = O.height - O.top - O.bottom - D.margin * 2)
              else {
                var ze = cu(D.container)
                    ? D.container
                    : document.querySelector(D.container),
                  Le = ze.getBoundingClientRect(),
                  It = Le.width,
                  zu = Le.height,
                  Lu = Le.left,
                  ju = Le.top
                O = rt({}, O, { width: It, height: zu, left: Lu, top: ju })
              }
            ;(re = re || O.width - D.margin * 2),
              (pe = pe || O.height - D.margin * 2)
            var ut = v.zoomedHd || v.original,
              y = Zn(ut) ? re : ut.naturalWidth || re,
              A = Zn(ut) ? pe : ut.naturalHeight || pe,
              z = ut.getBoundingClientRect(),
              B = z.top,
              Q = z.left,
              Y = z.width,
              ce = z.height,
              mt = Math.min(Math.max(Y, y), re) / Y,
              Ji = Math.min(Math.max(ce, A), pe) / ce,
              Mu = Math.min(mt, Ji),
              eo = (-Q + (re - Y) / 2 + D.margin + O.left) / Mu,
              to = (-B + (pe - ce) / 2 + D.margin + O.top) / Mu,
              $n =
                'scale(' + Mu + ') translate3d(' + eo + 'px, ' + to + 'px, 0)'
            ;(v.zoomed.style.transform = $n),
              v.zoomedHd && (v.zoomedHd.style.transform = $n)
          }
        return new n(function (N) {
          if (M && k.indexOf(M) === -1) {
            N(R)
            return
          }
          var O = function It() {
            ;(E = !1),
              v.zoomed.removeEventListener('transitionend', It),
              v.original.dispatchEvent(
                bt('medium-zoom:opened', { detail: { zoom: R } }),
              ),
              N(R)
          }
          if (v.zoomed) {
            N(R)
            return
          }
          if (M) v.original = M
          else if (k.length > 0) {
            var re = k
            v.original = re[0]
          } else {
            N(R)
            return
          }
          if (
            (v.original.dispatchEvent(
              bt('medium-zoom:open', { detail: { zoom: R } }),
            ),
            (C =
              window.pageYOffset ||
              document.documentElement.scrollTop ||
              document.body.scrollTop ||
              0),
            (E = !0),
            (v.zoomed = Io(v.original)),
            document.body.appendChild(H),
            D.template)
          ) {
            var pe = cu(D.template)
              ? D.template
              : document.querySelector(D.template)
            ;(v.template = document.createElement('div')),
              v.template.appendChild(pe.content.cloneNode(!0)),
              document.body.appendChild(v.template)
          }
          if (
            (v.original.parentElement &&
              v.original.parentElement.tagName === 'PICTURE' &&
              v.original.currentSrc &&
              (v.zoomed.src = v.original.currentSrc),
            document.body.appendChild(v.zoomed),
            window.requestAnimationFrame(function () {
              document.body.classList.add('medium-zoom--opened')
            }),
            v.original.classList.add('medium-zoom-image--hidden'),
            v.zoomed.classList.add('medium-zoom-image--opened'),
            v.zoomed.addEventListener('click', h),
            v.zoomed.addEventListener('transitionend', O),
            v.original.getAttribute('data-zoom-src'))
          ) {
            ;(v.zoomedHd = v.zoomed.cloneNode()),
              v.zoomedHd.removeAttribute('srcset'),
              v.zoomedHd.removeAttribute('sizes'),
              v.zoomedHd.removeAttribute('loading'),
              (v.zoomedHd.src = v.zoomed.getAttribute('data-zoom-src')),
              (v.zoomedHd.onerror = function () {
                clearInterval(ze),
                  console.warn(
                    'Unable to reach the zoom image target ' + v.zoomedHd.src,
                  ),
                  (v.zoomedHd = null),
                  q()
              })
            var ze = setInterval(function () {
              v.zoomedHd.complete &&
                (clearInterval(ze),
                v.zoomedHd.classList.add('medium-zoom-image--opened'),
                v.zoomedHd.addEventListener('click', h),
                document.body.appendChild(v.zoomedHd),
                q())
            }, 10)
          } else if (v.original.hasAttribute('srcset')) {
            ;(v.zoomedHd = v.zoomed.cloneNode()),
              v.zoomedHd.removeAttribute('sizes'),
              v.zoomedHd.removeAttribute('loading')
            var Le = v.zoomedHd.addEventListener('load', function () {
              v.zoomedHd.removeEventListener('load', Le),
                v.zoomedHd.classList.add('medium-zoom-image--opened'),
                v.zoomedHd.addEventListener('click', h),
                document.body.appendChild(v.zoomedHd),
                q()
            })
          } else q()
        })
      },
      h = function () {
        return new n(function (I) {
          if (E || !v.original) {
            I(R)
            return
          }
          var M = function q() {
            v.original.classList.remove('medium-zoom-image--hidden'),
              document.body.removeChild(v.zoomed),
              v.zoomedHd && document.body.removeChild(v.zoomedHd),
              document.body.removeChild(H),
              v.zoomed.classList.remove('medium-zoom-image--opened'),
              v.template && document.body.removeChild(v.template),
              (E = !1),
              v.zoomed.removeEventListener('transitionend', q),
              v.original.dispatchEvent(
                bt('medium-zoom:closed', { detail: { zoom: R } }),
              ),
              (v.original = null),
              (v.zoomed = null),
              (v.zoomedHd = null),
              (v.template = null),
              I(R)
          }
          ;(E = !0),
            document.body.classList.remove('medium-zoom--opened'),
            (v.zoomed.style.transform = ''),
            v.zoomedHd && (v.zoomedHd.style.transform = ''),
            v.template &&
              ((v.template.style.transition = 'opacity 150ms'),
              (v.template.style.opacity = 0)),
            v.original.dispatchEvent(
              bt('medium-zoom:close', { detail: { zoom: R } }),
            ),
            v.zoomed.addEventListener('transitionend', M)
        })
      },
      _ = function () {
        var I =
            arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {},
          M = I.target
        return v.original ? h() : p({ target: M })
      },
      b = function () {
        return D
      },
      g = function () {
        return k
      },
      x = function () {
        return v.original
      },
      k = [],
      w = [],
      E = !1,
      C = 0,
      D = u,
      v = { original: null, zoomed: null, zoomedHd: null, template: null }
    Object.prototype.toString.call(t) === '[object Object]'
      ? (D = t)
      : (t || typeof t == 'string') && c(t),
      (D = rt(
        {
          margin: 0,
          background: '#fff',
          scrollOffset: 40,
          container: null,
          template: null,
        },
        D,
      ))
    var H = To(D.background)
    document.addEventListener('click', i),
      document.addEventListener('keyup', o),
      document.addEventListener('scroll', r),
      window.addEventListener('resize', h)
    var R = {
      open: p,
      close: h,
      toggle: _,
      update: s,
      clone: a,
      attach: c,
      detach: l,
      on: d,
      off: m,
      getOptions: b,
      getImages: g,
      getZoomedImage: x,
    }
    return R
  }
function Lo(e, t) {
  t === void 0 && (t = {})
  var u = t.insertAt
  if (!(!e || typeof document > 'u')) {
    var n = document.head || document.getElementsByTagName('head')[0],
      i = document.createElement('style')
    ;(i.type = 'text/css'),
      u === 'top' && n.firstChild
        ? n.insertBefore(i, n.firstChild)
        : n.appendChild(i),
      i.styleSheet
        ? (i.styleSheet.cssText = e)
        : i.appendChild(document.createTextNode(e))
  }
}
var jo =
  '.medium-zoom-overlay{position:fixed;top:0;right:0;bottom:0;left:0;opacity:0;transition:opacity .3s;will-change:opacity}.medium-zoom--opened .medium-zoom-overlay{cursor:pointer;cursor:zoom-out;opacity:1}.medium-zoom-image{cursor:pointer;cursor:zoom-in;transition:transform .3s cubic-bezier(.2,0,.2,1)!important}.medium-zoom-image--hidden{visibility:hidden}.medium-zoom-image--opened{position:relative;cursor:pointer;cursor:zoom-out;will-change:transform}'
Lo(jo)
var Mo = function () {
    var e = document.getSelection()
    if (!e.rangeCount) return function () {}
    for (var t = document.activeElement, u = [], n = 0; n < e.rangeCount; n++)
      u.push(e.getRangeAt(n))
    switch (t.tagName.toUpperCase()) {
      case 'INPUT':
      case 'TEXTAREA':
        t.blur()
        break
      default:
        t = null
        break
    }
    return (
      e.removeAllRanges(),
      function () {
        e.type === 'Caret' && e.removeAllRanges(),
          e.rangeCount ||
            u.forEach(function (i) {
              e.addRange(i)
            }),
          t && t.focus()
      }
    )
  },
  Ro = Mo,
  Xn = { 'text/plain': 'Text', 'text/html': 'Url', default: 'Text' },
  Oo = 'Copy to clipboard: #{key}, Enter'
function Bo(e) {
  var t = (/mac os x/i.test(navigator.userAgent) ? '⌘' : 'Ctrl') + '+C'
  return e.replace(/#{\s*key\s*}/g, t)
}
function Po(e, t) {
  var u,
    n,
    i,
    r,
    o,
    s,
    a = !1
  t || (t = {}), (u = t.debug || !1)
  try {
    ;(i = Ro()),
      (r = document.createRange()),
      (o = document.getSelection()),
      (s = document.createElement('span')),
      (s.textContent = e),
      (s.ariaHidden = 'true'),
      (s.style.all = 'unset'),
      (s.style.position = 'fixed'),
      (s.style.top = 0),
      (s.style.clip = 'rect(0, 0, 0, 0)'),
      (s.style.whiteSpace = 'pre'),
      (s.style.webkitUserSelect = 'text'),
      (s.style.MozUserSelect = 'text'),
      (s.style.msUserSelect = 'text'),
      (s.style.userSelect = 'text'),
      s.addEventListener('copy', function (l) {
        if ((l.stopPropagation(), t.format))
          if ((l.preventDefault(), typeof l.clipboardData > 'u')) {
            u && console.warn('unable to use e.clipboardData'),
              u && console.warn('trying IE specific stuff'),
              window.clipboardData.clearData()
            var d = Xn[t.format] || Xn.default
            window.clipboardData.setData(d, e)
          } else
            l.clipboardData.clearData(), l.clipboardData.setData(t.format, e)
        t.onCopy && (l.preventDefault(), t.onCopy(l.clipboardData))
      }),
      document.body.appendChild(s),
      r.selectNodeContents(s),
      o.addRange(r)
    var c = document.execCommand('copy')
    if (!c) throw new Error('copy command was unsuccessful')
    a = !0
  } catch (l) {
    u && console.error('unable to copy using execCommand: ', l),
      u && console.warn('trying IE specific stuff')
    try {
      window.clipboardData.setData(t.format || 'text', e),
        t.onCopy && t.onCopy(window.clipboardData),
        (a = !0)
    } catch (d) {
      u && console.error('unable to copy using clipboardData: ', d),
        u && console.error('falling back to prompt'),
        (n = Bo('message' in t ? t.message : Oo)),
        window.prompt(n, e)
    }
  } finally {
    o &&
      (typeof o.removeRange == 'function'
        ? o.removeRange(r)
        : o.removeAllRanges()),
      s && document.body.removeChild(s),
      i()
  }
  return a
}
var $o = Po
const No = vn($o),
  Qn = {}
function qo(e) {
  let t = Qn[e]
  if (t) return t
  t = Qn[e] = []
  for (let u = 0; u < 128; u++) {
    const n = String.fromCharCode(u)
    t.push(n)
  }
  for (let u = 0; u < e.length; u++) {
    const n = e.charCodeAt(u)
    t[n] = '%' + ('0' + n.toString(16).toUpperCase()).slice(-2)
  }
  return t
}
function At(e, t) {
  typeof t != 'string' && (t = At.defaultChars)
  const u = qo(t)
  return e.replace(/(%[a-f0-9]{2})+/gi, function (n) {
    let i = ''
    for (let r = 0, o = n.length; r < o; r += 3) {
      const s = parseInt(n.slice(r + 1, r + 3), 16)
      if (s < 128) {
        i += u[s]
        continue
      }
      if ((s & 224) === 192 && r + 3 < o) {
        const a = parseInt(n.slice(r + 4, r + 6), 16)
        if ((a & 192) === 128) {
          const c = ((s << 6) & 1984) | (a & 63)
          c < 128 ? (i += '��') : (i += String.fromCharCode(c)), (r += 3)
          continue
        }
      }
      if ((s & 240) === 224 && r + 6 < o) {
        const a = parseInt(n.slice(r + 4, r + 6), 16),
          c = parseInt(n.slice(r + 7, r + 9), 16)
        if ((a & 192) === 128 && (c & 192) === 128) {
          const l = ((s << 12) & 61440) | ((a << 6) & 4032) | (c & 63)
          l < 2048 || (l >= 55296 && l <= 57343)
            ? (i += '���')
            : (i += String.fromCharCode(l)),
            (r += 6)
          continue
        }
      }
      if ((s & 248) === 240 && r + 9 < o) {
        const a = parseInt(n.slice(r + 4, r + 6), 16),
          c = parseInt(n.slice(r + 7, r + 9), 16),
          l = parseInt(n.slice(r + 10, r + 12), 16)
        if ((a & 192) === 128 && (c & 192) === 128 && (l & 192) === 128) {
          let d =
            ((s << 18) & 1835008) |
            ((a << 12) & 258048) |
            ((c << 6) & 4032) |
            (l & 63)
          d < 65536 || d > 1114111
            ? (i += '����')
            : ((d -= 65536),
              (i += String.fromCharCode(
                55296 + (d >> 10),
                56320 + (d & 1023),
              ))),
            (r += 9)
          continue
        }
      }
      i += '�'
    }
    return i
  })
}
At.defaultChars = ';/?:@&=+$,#'
At.componentChars = ''
const Yn = {}
function Ho(e) {
  let t = Yn[e]
  if (t) return t
  t = Yn[e] = []
  for (let u = 0; u < 128; u++) {
    const n = String.fromCharCode(u)
    ;/^[0-9a-z]$/i.test(n)
      ? t.push(n)
      : t.push('%' + ('0' + u.toString(16).toUpperCase()).slice(-2))
  }
  for (let u = 0; u < e.length; u++) t[e.charCodeAt(u)] = e[u]
  return t
}
function Gt(e, t, u) {
  typeof t != 'string' && ((u = t), (t = Gt.defaultChars)),
    typeof u > 'u' && (u = !0)
  const n = Ho(t)
  let i = ''
  for (let r = 0, o = e.length; r < o; r++) {
    const s = e.charCodeAt(r)
    if (
      u &&
      s === 37 &&
      r + 2 < o &&
      /^[0-9a-f]{2}$/i.test(e.slice(r + 1, r + 3))
    ) {
      ;(i += e.slice(r, r + 3)), (r += 2)
      continue
    }
    if (s < 128) {
      i += n[s]
      continue
    }
    if (s >= 55296 && s <= 57343) {
      if (s >= 55296 && s <= 56319 && r + 1 < o) {
        const a = e.charCodeAt(r + 1)
        if (a >= 56320 && a <= 57343) {
          ;(i += encodeURIComponent(e[r] + e[r + 1])), r++
          continue
        }
      }
      i += '%EF%BF%BD'
      continue
    }
    i += encodeURIComponent(e[r])
  }
  return i
}
Gt.defaultChars = ";/?:@&=+$,-_.!~*'()#"
Gt.componentChars = "-_.!~*'()"
function En(e) {
  let t = ''
  return (
    (t += e.protocol || ''),
    (t += e.slashes ? '//' : ''),
    (t += e.auth ? e.auth + '@' : ''),
    e.hostname && e.hostname.indexOf(':') !== -1
      ? (t += '[' + e.hostname + ']')
      : (t += e.hostname || ''),
    (t += e.port ? ':' + e.port : ''),
    (t += e.pathname || ''),
    (t += e.search || ''),
    (t += e.hash || ''),
    t
  )
}
function xu() {
  ;(this.protocol = null),
    (this.slashes = null),
    (this.auth = null),
    (this.port = null),
    (this.hostname = null),
    (this.hash = null),
    (this.search = null),
    (this.pathname = null)
}
const Uo = /^([a-z0-9.+-]+:)/i,
  Vo = /:[0-9]*$/,
  Wo = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,
  Go = [
    '<',
    '>',
    '"',
    '`',
    ' ',
    '\r',
    `
`,
    '	',
  ],
  Zo = ['{', '}', '|', '\\', '^', '`'].concat(Go),
  Ko = ["'"].concat(Zo),
  Jn = ['%', '/', '?', ';', '#'].concat(Ko),
  er = ['/', '?', '#'],
  Xo = 255,
  tr = /^[+a-z0-9A-Z_-]{0,63}$/,
  Qo = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
  ur = { javascript: !0, 'javascript:': !0 },
  nr = {
    http: !0,
    https: !0,
    ftp: !0,
    gopher: !0,
    file: !0,
    'http:': !0,
    'https:': !0,
    'ftp:': !0,
    'gopher:': !0,
    'file:': !0,
  }
function Cn(e, t) {
  if (e && e instanceof xu) return e
  const u = new xu()
  return u.parse(e, t), u
}
xu.prototype.parse = function (e, t) {
  let u,
    n,
    i,
    r = e
  if (((r = r.trim()), !t && e.split('#').length === 1)) {
    const c = Wo.exec(r)
    if (c) return (this.pathname = c[1]), c[2] && (this.search = c[2]), this
  }
  let o = Uo.exec(r)
  if (
    (o &&
      ((o = o[0]),
      (u = o.toLowerCase()),
      (this.protocol = o),
      (r = r.substr(o.length))),
    (t || o || r.match(/^\/\/[^@\/]+@[^@\/]+/)) &&
      ((i = r.substr(0, 2) === '//'),
      i && !(o && ur[o]) && ((r = r.substr(2)), (this.slashes = !0))),
    !ur[o] && (i || (o && !nr[o])))
  ) {
    let c = -1
    for (let h = 0; h < er.length; h++)
      (n = r.indexOf(er[h])), n !== -1 && (c === -1 || n < c) && (c = n)
    let l, d
    c === -1 ? (d = r.lastIndexOf('@')) : (d = r.lastIndexOf('@', c)),
      d !== -1 && ((l = r.slice(0, d)), (r = r.slice(d + 1)), (this.auth = l)),
      (c = -1)
    for (let h = 0; h < Jn.length; h++)
      (n = r.indexOf(Jn[h])), n !== -1 && (c === -1 || n < c) && (c = n)
    c === -1 && (c = r.length), r[c - 1] === ':' && c--
    const m = r.slice(0, c)
    ;(r = r.slice(c)), this.parseHost(m), (this.hostname = this.hostname || '')
    const p =
      this.hostname[0] === '[' &&
      this.hostname[this.hostname.length - 1] === ']'
    if (!p) {
      const h = this.hostname.split(/\./)
      for (let _ = 0, b = h.length; _ < b; _++) {
        const g = h[_]
        if (g && !g.match(tr)) {
          let x = ''
          for (let k = 0, w = g.length; k < w; k++)
            g.charCodeAt(k) > 127 ? (x += 'x') : (x += g[k])
          if (!x.match(tr)) {
            const k = h.slice(0, _),
              w = h.slice(_ + 1),
              E = g.match(Qo)
            E && (k.push(E[1]), w.unshift(E[2])),
              w.length && (r = w.join('.') + r),
              (this.hostname = k.join('.'))
            break
          }
        }
      }
    }
    this.hostname.length > Xo && (this.hostname = ''),
      p && (this.hostname = this.hostname.substr(1, this.hostname.length - 2))
  }
  const s = r.indexOf('#')
  s !== -1 && ((this.hash = r.substr(s)), (r = r.slice(0, s)))
  const a = r.indexOf('?')
  return (
    a !== -1 && ((this.search = r.substr(a)), (r = r.slice(0, a))),
    r && (this.pathname = r),
    nr[u] && this.hostname && !this.pathname && (this.pathname = ''),
    this
  )
}
xu.prototype.parseHost = function (e) {
  let t = Vo.exec(e)
  t &&
    ((t = t[0]),
    t !== ':' && (this.port = t.substr(1)),
    (e = e.substr(0, e.length - t.length))),
    e && (this.hostname = e)
}
const Yo = Object.freeze(
    Object.defineProperty(
      { __proto__: null, decode: At, encode: Gt, format: En, parse: Cn },
      Symbol.toStringTag,
      { value: 'Module' },
    ),
  ),
  Or =
    /[\0-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/,
  Br = /[\0-\x1F\x7F-\x9F]/,
  Jo =
    /[\xAD\u0600-\u0605\u061C\u06DD\u070F\u0890\u0891\u08E2\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]|\uD804[\uDCBD\uDCCD]|\uD80D[\uDC30-\uDC3F]|\uD82F[\uDCA0-\uDCA3]|\uD834[\uDD73-\uDD7A]|\uDB40[\uDC01\uDC20-\uDC7F]/,
  An =
    /[!-#%-\*,-\/:;\?@\[-\]_\{\}\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061D-\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1B7D\u1B7E\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4F\u2E52-\u2E5D\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD803[\uDEAD\uDF55-\uDF59\uDF86-\uDF89]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDC4B-\uDC4F\uDC5A\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDEB9\uDF3C-\uDF3E]|\uD806[\uDC3B\uDD44-\uDD46\uDDE2\uDE3F-\uDE46\uDE9A-\uDE9C\uDE9E-\uDEA2\uDF00-\uDF09]|\uD807[\uDC41-\uDC45\uDC70\uDC71\uDEF7\uDEF8\uDF43-\uDF4F\uDFFF]|\uD809[\uDC70-\uDC74]|\uD80B[\uDFF1\uDFF2]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD81B[\uDE97-\uDE9A\uDFE2]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD83A[\uDD5E\uDD5F]/,
  Pr =
    /[\$\+<->\^`\|~\xA2-\xA6\xA8\xA9\xAC\xAE-\xB1\xB4\xB8\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u02FF\u0375\u0384\u0385\u03F6\u0482\u058D-\u058F\u0606-\u0608\u060B\u060E\u060F\u06DE\u06E9\u06FD\u06FE\u07F6\u07FE\u07FF\u0888\u09F2\u09F3\u09FA\u09FB\u0AF1\u0B70\u0BF3-\u0BFA\u0C7F\u0D4F\u0D79\u0E3F\u0F01-\u0F03\u0F13\u0F15-\u0F17\u0F1A-\u0F1F\u0F34\u0F36\u0F38\u0FBE-\u0FC5\u0FC7-\u0FCC\u0FCE\u0FCF\u0FD5-\u0FD8\u109E\u109F\u1390-\u1399\u166D\u17DB\u1940\u19DE-\u19FF\u1B61-\u1B6A\u1B74-\u1B7C\u1FBD\u1FBF-\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED-\u1FEF\u1FFD\u1FFE\u2044\u2052\u207A-\u207C\u208A-\u208C\u20A0-\u20C0\u2100\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F\u218A\u218B\u2190-\u2307\u230C-\u2328\u232B-\u2426\u2440-\u244A\u249C-\u24E9\u2500-\u2767\u2794-\u27C4\u27C7-\u27E5\u27F0-\u2982\u2999-\u29D7\u29DC-\u29FB\u29FE-\u2B73\u2B76-\u2B95\u2B97-\u2BFF\u2CE5-\u2CEA\u2E50\u2E51\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFF\u3004\u3012\u3013\u3020\u3036\u3037\u303E\u303F\u309B\u309C\u3190\u3191\u3196-\u319F\u31C0-\u31E3\u31EF\u3200-\u321E\u322A-\u3247\u3250\u3260-\u327F\u328A-\u32B0\u32C0-\u33FF\u4DC0-\u4DFF\uA490-\uA4C6\uA700-\uA716\uA720\uA721\uA789\uA78A\uA828-\uA82B\uA836-\uA839\uAA77-\uAA79\uAB5B\uAB6A\uAB6B\uFB29\uFBB2-\uFBC2\uFD40-\uFD4F\uFDCF\uFDFC-\uFDFF\uFE62\uFE64-\uFE66\uFE69\uFF04\uFF0B\uFF1C-\uFF1E\uFF3E\uFF40\uFF5C\uFF5E\uFFE0-\uFFE6\uFFE8-\uFFEE\uFFFC\uFFFD]|\uD800[\uDD37-\uDD3F\uDD79-\uDD89\uDD8C-\uDD8E\uDD90-\uDD9C\uDDA0\uDDD0-\uDDFC]|\uD802[\uDC77\uDC78\uDEC8]|\uD805\uDF3F|\uD807[\uDFD5-\uDFF1]|\uD81A[\uDF3C-\uDF3F\uDF45]|\uD82F\uDC9C|\uD833[\uDF50-\uDFC3]|\uD834[\uDC00-\uDCF5\uDD00-\uDD26\uDD29-\uDD64\uDD6A-\uDD6C\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDDEA\uDE00-\uDE41\uDE45\uDF00-\uDF56]|\uD835[\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3]|\uD836[\uDC00-\uDDFF\uDE37-\uDE3A\uDE6D-\uDE74\uDE76-\uDE83\uDE85\uDE86]|\uD838[\uDD4F\uDEFF]|\uD83B[\uDCAC\uDCB0\uDD2E\uDEF0\uDEF1]|\uD83C[\uDC00-\uDC2B\uDC30-\uDC93\uDCA0-\uDCAE\uDCB1-\uDCBF\uDCC1-\uDCCF\uDCD1-\uDCF5\uDD0D-\uDDAD\uDDE6-\uDE02\uDE10-\uDE3B\uDE40-\uDE48\uDE50\uDE51\uDE60-\uDE65\uDF00-\uDFFF]|\uD83D[\uDC00-\uDED7\uDEDC-\uDEEC\uDEF0-\uDEFC\uDF00-\uDF76\uDF7B-\uDFD9\uDFE0-\uDFEB\uDFF0]|\uD83E[\uDC00-\uDC0B\uDC10-\uDC47\uDC50-\uDC59\uDC60-\uDC87\uDC90-\uDCAD\uDCB0\uDCB1\uDD00-\uDE53\uDE60-\uDE6D\uDE70-\uDE7C\uDE80-\uDE88\uDE90-\uDEBD\uDEBF-\uDEC5\uDECE-\uDEDB\uDEE0-\uDEE8\uDEF0-\uDEF8\uDF00-\uDF92\uDF94-\uDFCA]/,
  $r = /[ \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/,
  es = Object.freeze(
    Object.defineProperty(
      { __proto__: null, Any: Or, Cc: Br, Cf: Jo, P: An, S: Pr, Z: $r },
      Symbol.toStringTag,
      { value: 'Module' },
    ),
  ),
  ts = new Uint16Array(
    'ᵁ<Õıʊҝջאٵ۞ޢߖࠏ੊ઑඡ๭༉༦჊ረዡᐕᒝᓃᓟᔥ\0\0\0\0\0\0ᕫᛍᦍᰒᷝ὾⁠↰⊍⏀⏻⑂⠤⤒ⴈ⹈⿎〖㊺㘹㞬㣾㨨㩱㫠㬮ࠀEMabcfglmnoprstu\\bfms¦³¹ÈÏlig耻Æ䃆P耻&䀦cute耻Á䃁reve;䄂Āiyx}rc耻Â䃂;䐐r;쀀𝔄rave耻À䃀pha;䎑acr;䄀d;橓Āgp¡on;䄄f;쀀𝔸plyFunction;恡ing耻Å䃅Ācs¾Ãr;쀀𝒜ign;扔ilde耻Ã䃃ml耻Ä䃄ЀaceforsuåûþėĜĢħĪĀcrêòkslash;或Ŷöø;櫧ed;挆y;䐑ƀcrtąċĔause;戵noullis;愬a;䎒r;쀀𝔅pf;쀀𝔹eve;䋘còēmpeq;扎܀HOacdefhilorsuōőŖƀƞƢƵƷƺǜȕɳɸɾcy;䐧PY耻©䂩ƀcpyŝŢźute;䄆Ā;iŧŨ拒talDifferentialD;慅leys;愭ȀaeioƉƎƔƘron;䄌dil耻Ç䃇rc;䄈nint;戰ot;䄊ĀdnƧƭilla;䂸terDot;䂷òſi;䎧rcleȀDMPTǇǋǑǖot;抙inus;抖lus;投imes;抗oĀcsǢǸkwiseContourIntegral;戲eCurlyĀDQȃȏoubleQuote;思uote;怙ȀlnpuȞȨɇɕonĀ;eȥȦ户;橴ƀgitȯȶȺruent;扡nt;戯ourIntegral;戮ĀfrɌɎ;愂oduct;成nterClockwiseContourIntegral;戳oss;樯cr;쀀𝒞pĀ;Cʄʅ拓ap;才րDJSZacefiosʠʬʰʴʸˋ˗ˡ˦̳ҍĀ;oŹʥtrahd;椑cy;䐂cy;䐅cy;䐏ƀgrsʿ˄ˇger;怡r;憡hv;櫤Āayː˕ron;䄎;䐔lĀ;t˝˞戇a;䎔r;쀀𝔇Āaf˫̧Ācm˰̢riticalȀADGT̖̜̀̆cute;䂴oŴ̋̍;䋙bleAcute;䋝rave;䁠ilde;䋜ond;拄ferentialD;慆Ѱ̽\0\0\0͔͂\0Ѕf;쀀𝔻ƀ;DE͈͉͍䂨ot;惜qual;扐blèCDLRUVͣͲ΂ϏϢϸontourIntegraìȹoɴ͹\0\0ͻ»͉nArrow;懓Āeo·ΤftƀARTΐΖΡrrow;懐ightArrow;懔eåˊngĀLRΫτeftĀARγιrrow;柸ightArrow;柺ightArrow;柹ightĀATϘϞrrow;懒ee;抨pɁϩ\0\0ϯrrow;懑ownArrow;懕erticalBar;戥ǹABLRTaВЪаўѿͼrrowƀ;BUНОТ憓ar;椓pArrow;懵reve;䌑eft˒к\0ц\0ѐightVector;楐eeVector;楞ectorĀ;Bљњ憽ar;楖ightǔѧ\0ѱeeVector;楟ectorĀ;BѺѻ懁ar;楗eeĀ;A҆҇护rrow;憧ĀctҒҗr;쀀𝒟rok;䄐ࠀNTacdfglmopqstuxҽӀӄӋӞӢӧӮӵԡԯԶՒ՝ՠեG;䅊H耻Ð䃐cute耻É䃉ƀaiyӒӗӜron;䄚rc耻Ê䃊;䐭ot;䄖r;쀀𝔈rave耻È䃈ement;戈ĀapӺӾcr;䄒tyɓԆ\0\0ԒmallSquare;旻erySmallSquare;斫ĀgpԦԪon;䄘f;쀀𝔼silon;䎕uĀaiԼՉlĀ;TՂՃ橵ilde;扂librium;懌Āci՗՚r;愰m;橳a;䎗ml耻Ë䃋Āipժկsts;戃onentialE;慇ʀcfiosօֈ֍ֲ׌y;䐤r;쀀𝔉lledɓ֗\0\0֣mallSquare;旼erySmallSquare;斪Ͱֺ\0ֿ\0\0ׄf;쀀𝔽All;戀riertrf;愱cò׋؀JTabcdfgorstר׬ׯ׺؀ؒؖ؛؝أ٬ٲcy;䐃耻>䀾mmaĀ;d׷׸䎓;䏜reve;䄞ƀeiy؇،ؐdil;䄢rc;䄜;䐓ot;䄠r;쀀𝔊;拙pf;쀀𝔾eater̀EFGLSTصلَٖٛ٦qualĀ;Lؾؿ扥ess;招ullEqual;执reater;檢ess;扷lantEqual;橾ilde;扳cr;쀀𝒢;扫ЀAacfiosuڅڋږڛڞڪھۊRDcy;䐪Āctڐڔek;䋇;䁞irc;䄤r;愌lbertSpace;愋ǰگ\0ڲf;愍izontalLine;攀Āctۃۅòکrok;䄦mpńېۘownHumðįqual;扏܀EJOacdfgmnostuۺ۾܃܇܎ܚܞܡܨ݄ݸދޏޕcy;䐕lig;䄲cy;䐁cute耻Í䃍Āiyܓܘrc耻Î䃎;䐘ot;䄰r;愑rave耻Ì䃌ƀ;apܠܯܿĀcgܴܷr;䄪inaryI;慈lieóϝǴ݉\0ݢĀ;eݍݎ戬Āgrݓݘral;戫section;拂isibleĀCTݬݲomma;恣imes;恢ƀgptݿރވon;䄮f;쀀𝕀a;䎙cr;愐ilde;䄨ǫޚ\0ޞcy;䐆l耻Ï䃏ʀcfosuެ޷޼߂ߐĀiyޱ޵rc;䄴;䐙r;쀀𝔍pf;쀀𝕁ǣ߇\0ߌr;쀀𝒥rcy;䐈kcy;䐄΀HJacfosߤߨ߽߬߱ࠂࠈcy;䐥cy;䐌ppa;䎚Āey߶߻dil;䄶;䐚r;쀀𝔎pf;쀀𝕂cr;쀀𝒦րJTaceflmostࠥࠩࠬࡐࡣ঳সে্਷ੇcy;䐉耻<䀼ʀcmnpr࠷࠼ࡁࡄࡍute;䄹bda;䎛g;柪lacetrf;愒r;憞ƀaeyࡗ࡜ࡡron;䄽dil;䄻;䐛Āfsࡨ॰tԀACDFRTUVarࡾࢩࢱࣦ࣠ࣼयज़ΐ४Ānrࢃ࢏gleBracket;柨rowƀ;BR࢙࢚࢞憐ar;懤ightArrow;懆eiling;挈oǵࢷ\0ࣃbleBracket;柦nǔࣈ\0࣒eeVector;楡ectorĀ;Bࣛࣜ懃ar;楙loor;挊ightĀAV࣯ࣵrrow;憔ector;楎Āerँगeƀ;AVउऊऐ抣rrow;憤ector;楚iangleƀ;BEतथऩ抲ar;槏qual;抴pƀDTVषूौownVector;楑eeVector;楠ectorĀ;Bॖॗ憿ar;楘ectorĀ;B॥०憼ar;楒ightáΜs̀EFGLSTॾঋকঝঢভqualGreater;拚ullEqual;扦reater;扶ess;檡lantEqual;橽ilde;扲r;쀀𝔏Ā;eঽা拘ftarrow;懚idot;䄿ƀnpw৔ਖਛgȀLRlr৞৷ਂਐeftĀAR০৬rrow;柵ightArrow;柷ightArrow;柶eftĀarγਊightáοightáϊf;쀀𝕃erĀLRਢਬeftArrow;憙ightArrow;憘ƀchtਾੀੂòࡌ;憰rok;䅁;扪Ѐacefiosuਗ਼੝੠੷੼અઋ઎p;椅y;䐜Ādl੥੯iumSpace;恟lintrf;愳r;쀀𝔐nusPlus;戓pf;쀀𝕄cò੶;䎜ҀJacefostuણધભીଔଙඑ඗ඞcy;䐊cute;䅃ƀaey઴હાron;䅇dil;䅅;䐝ƀgswે૰଎ativeƀMTV૓૟૨ediumSpace;怋hiĀcn૦૘ë૙eryThiî૙tedĀGL૸ଆreaterGreateòٳessLesóੈLine;䀊r;쀀𝔑ȀBnptଢନଷ଺reak;恠BreakingSpace;䂠f;愕ڀ;CDEGHLNPRSTV୕ୖ୪୼஡௫ఄ౞಄ದ೘ൡඅ櫬Āou୛୤ngruent;扢pCap;扭oubleVerticalBar;戦ƀlqxஃஊ஛ement;戉ualĀ;Tஒஓ扠ilde;쀀≂̸ists;戄reater΀;EFGLSTஶஷ஽௉௓௘௥扯qual;扱ullEqual;쀀≧̸reater;쀀≫̸ess;批lantEqual;쀀⩾̸ilde;扵umpń௲௽ownHump;쀀≎̸qual;쀀≏̸eĀfsఊధtTriangleƀ;BEచఛడ拪ar;쀀⧏̸qual;括s̀;EGLSTవశ఼ౄోౘ扮qual;扰reater;扸ess;쀀≪̸lantEqual;쀀⩽̸ilde;扴estedĀGL౨౹reaterGreater;쀀⪢̸essLess;쀀⪡̸recedesƀ;ESಒಓಛ技qual;쀀⪯̸lantEqual;拠ĀeiಫಹverseElement;戌ghtTriangleƀ;BEೋೌ೒拫ar;쀀⧐̸qual;拭ĀquೝഌuareSuĀbp೨೹setĀ;E೰ೳ쀀⊏̸qual;拢ersetĀ;Eഃആ쀀⊐̸qual;拣ƀbcpഓതൎsetĀ;Eഛഞ쀀⊂⃒qual;抈ceedsȀ;ESTലള഻െ抁qual;쀀⪰̸lantEqual;拡ilde;쀀≿̸ersetĀ;E൘൛쀀⊃⃒qual;抉ildeȀ;EFT൮൯൵ൿ扁qual;扄ullEqual;扇ilde;扉erticalBar;戤cr;쀀𝒩ilde耻Ñ䃑;䎝܀Eacdfgmoprstuvලෂ෉෕ෛ෠෧෼ขภยา฿ไlig;䅒cute耻Ó䃓Āiy෎ීrc耻Ô䃔;䐞blac;䅐r;쀀𝔒rave耻Ò䃒ƀaei෮ෲ෶cr;䅌ga;䎩cron;䎟pf;쀀𝕆enCurlyĀDQฎบoubleQuote;怜uote;怘;橔Āclวฬr;쀀𝒪ash耻Ø䃘iŬื฼de耻Õ䃕es;樷ml耻Ö䃖erĀBP๋๠Āar๐๓r;怾acĀek๚๜;揞et;掴arenthesis;揜Ҁacfhilors๿ງຊຏຒດຝະ໼rtialD;戂y;䐟r;쀀𝔓i;䎦;䎠usMinus;䂱Āipຢອncareplanåڝf;愙Ȁ;eio຺ູ໠໤檻cedesȀ;EST່້໏໚扺qual;檯lantEqual;扼ilde;找me;怳Ādp໩໮uct;戏ortionĀ;aȥ໹l;戝Āci༁༆r;쀀𝒫;䎨ȀUfos༑༖༛༟OT耻"䀢r;쀀𝔔pf;愚cr;쀀𝒬؀BEacefhiorsu༾གྷཇའཱིྦྷྪྭ႖ႩႴႾarr;椐G耻®䂮ƀcnrཎནབute;䅔g;柫rĀ;tཛྷཝ憠l;椖ƀaeyཧཬཱron;䅘dil;䅖;䐠Ā;vླྀཹ愜erseĀEUྂྙĀlq྇ྎement;戋uilibrium;懋pEquilibrium;楯r»ཹo;䎡ghtЀACDFTUVa࿁࿫࿳ဢဨၛႇϘĀnr࿆࿒gleBracket;柩rowƀ;BL࿜࿝࿡憒ar;懥eftArrow;懄eiling;按oǵ࿹\0စbleBracket;柧nǔည\0နeeVector;楝ectorĀ;Bဝသ懂ar;楕loor;挋Āerိ၃eƀ;AVဵံြ抢rrow;憦ector;楛iangleƀ;BEၐၑၕ抳ar;槐qual;抵pƀDTVၣၮၸownVector;楏eeVector;楜ectorĀ;Bႂႃ憾ar;楔ectorĀ;B႑႒懀ar;楓Āpuႛ႞f;愝ndImplies;楰ightarrow;懛ĀchႹႼr;愛;憱leDelayed;槴ڀHOacfhimoqstuფჱჷჽᄙᄞᅑᅖᅡᅧᆵᆻᆿĀCcჩხHcy;䐩y;䐨FTcy;䐬cute;䅚ʀ;aeiyᄈᄉᄎᄓᄗ檼ron;䅠dil;䅞rc;䅜;䐡r;쀀𝔖ortȀDLRUᄪᄴᄾᅉownArrow»ОeftArrow»࢚ightArrow»࿝pArrow;憑gma;䎣allCircle;战pf;쀀𝕊ɲᅭ\0\0ᅰt;戚areȀ;ISUᅻᅼᆉᆯ斡ntersection;抓uĀbpᆏᆞsetĀ;Eᆗᆘ抏qual;抑ersetĀ;Eᆨᆩ抐qual;抒nion;抔cr;쀀𝒮ar;拆ȀbcmpᇈᇛሉላĀ;sᇍᇎ拐etĀ;Eᇍᇕqual;抆ĀchᇠህeedsȀ;ESTᇭᇮᇴᇿ扻qual;檰lantEqual;扽ilde;承Tháྌ;我ƀ;esሒሓሣ拑rsetĀ;Eሜም抃qual;抇et»ሓրHRSacfhiorsሾቄ቉ቕ቞ቱቶኟዂወዑORN耻Þ䃞ADE;愢ĀHc቎ቒcy;䐋y;䐦Ābuቚቜ;䀉;䎤ƀaeyብቪቯron;䅤dil;䅢;䐢r;쀀𝔗Āeiቻ኉ǲኀ\0ኇefore;戴a;䎘Ācn኎ኘkSpace;쀀  Space;怉ldeȀ;EFTካኬኲኼ戼qual;扃ullEqual;扅ilde;扈pf;쀀𝕋ipleDot;惛Āctዖዛr;쀀𝒯rok;䅦ૡዷጎጚጦ\0ጬጱ\0\0\0\0\0ጸጽ፷ᎅ\0᏿ᐄᐊᐐĀcrዻጁute耻Ú䃚rĀ;oጇገ憟cir;楉rǣጓ\0጖y;䐎ve;䅬Āiyጞጣrc耻Û䃛;䐣blac;䅰r;쀀𝔘rave耻Ù䃙acr;䅪Ādiፁ፩erĀBPፈ፝Āarፍፐr;䁟acĀekፗፙ;揟et;掵arenthesis;揝onĀ;P፰፱拃lus;抎Āgp፻፿on;䅲f;쀀𝕌ЀADETadps᎕ᎮᎸᏄϨᏒᏗᏳrrowƀ;BDᅐᎠᎤar;椒ownArrow;懅ownArrow;憕quilibrium;楮eeĀ;AᏋᏌ报rrow;憥ownáϳerĀLRᏞᏨeftArrow;憖ightArrow;憗iĀ;lᏹᏺ䏒on;䎥ing;䅮cr;쀀𝒰ilde;䅨ml耻Ü䃜ҀDbcdefosvᐧᐬᐰᐳᐾᒅᒊᒐᒖash;披ar;櫫y;䐒ashĀ;lᐻᐼ抩;櫦Āerᑃᑅ;拁ƀbtyᑌᑐᑺar;怖Ā;iᑏᑕcalȀBLSTᑡᑥᑪᑴar;戣ine;䁼eparator;杘ilde;所ThinSpace;怊r;쀀𝔙pf;쀀𝕍cr;쀀𝒱dash;抪ʀcefosᒧᒬᒱᒶᒼirc;䅴dge;拀r;쀀𝔚pf;쀀𝕎cr;쀀𝒲Ȁfiosᓋᓐᓒᓘr;쀀𝔛;䎞pf;쀀𝕏cr;쀀𝒳ҀAIUacfosuᓱᓵᓹᓽᔄᔏᔔᔚᔠcy;䐯cy;䐇cy;䐮cute耻Ý䃝Āiyᔉᔍrc;䅶;䐫r;쀀𝔜pf;쀀𝕐cr;쀀𝒴ml;䅸ЀHacdefosᔵᔹᔿᕋᕏᕝᕠᕤcy;䐖cute;䅹Āayᕄᕉron;䅽;䐗ot;䅻ǲᕔ\0ᕛoWidtè૙a;䎖r;愨pf;愤cr;쀀𝒵௡ᖃᖊᖐ\0ᖰᖶᖿ\0\0\0\0ᗆᗛᗫᙟ᙭\0ᚕ᚛ᚲᚹ\0ᚾcute耻á䃡reve;䄃̀;Ediuyᖜᖝᖡᖣᖨᖭ戾;쀀∾̳;房rc耻â䃢te肻´̆;䐰lig耻æ䃦Ā;r²ᖺ;쀀𝔞rave耻à䃠ĀepᗊᗖĀfpᗏᗔsym;愵èᗓha;䎱ĀapᗟcĀclᗤᗧr;䄁g;樿ɤᗰ\0\0ᘊʀ;adsvᗺᗻᗿᘁᘇ戧nd;橕;橜lope;橘;橚΀;elmrszᘘᘙᘛᘞᘿᙏᙙ戠;榤e»ᘙsdĀ;aᘥᘦ戡ѡᘰᘲᘴᘶᘸᘺᘼᘾ;榨;榩;榪;榫;榬;榭;榮;榯tĀ;vᙅᙆ戟bĀ;dᙌᙍ抾;榝Āptᙔᙗh;戢»¹arr;捼Āgpᙣᙧon;䄅f;쀀𝕒΀;Eaeiop዁ᙻᙽᚂᚄᚇᚊ;橰cir;橯;扊d;手s;䀧roxĀ;e዁ᚒñᚃing耻å䃥ƀctyᚡᚦᚨr;쀀𝒶;䀪mpĀ;e዁ᚯñʈilde耻ã䃣ml耻ä䃤Āciᛂᛈoninôɲnt;樑ࠀNabcdefiklnoprsu᛭ᛱᜰ᜼ᝃᝈ᝸᝽០៦ᠹᡐᜍ᤽᥈ᥰot;櫭Ācrᛶ᜞kȀcepsᜀᜅᜍᜓong;扌psilon;䏶rime;怵imĀ;e᜚᜛戽q;拍Ŷᜢᜦee;抽edĀ;gᜬᜭ挅e»ᜭrkĀ;t፜᜷brk;掶Āoyᜁᝁ;䐱quo;怞ʀcmprtᝓ᝛ᝡᝤᝨausĀ;eĊĉptyv;榰séᜌnoõēƀahwᝯ᝱ᝳ;䎲;愶een;扬r;쀀𝔟g΀costuvwឍឝឳេ៕៛៞ƀaiuបពរðݠrc;旯p»፱ƀdptឤឨឭot;樀lus;樁imes;樂ɱឹ\0\0ើcup;樆ar;昅riangleĀdu៍្own;施p;斳plus;樄eåᑄåᒭarow;植ƀako៭ᠦᠵĀcn៲ᠣkƀlst៺֫᠂ozenge;槫riangleȀ;dlr᠒᠓᠘᠝斴own;斾eft;旂ight;斸k;搣Ʊᠫ\0ᠳƲᠯ\0ᠱ;斒;斑4;斓ck;斈ĀeoᠾᡍĀ;qᡃᡆ쀀=⃥uiv;쀀≡⃥t;挐Ȁptwxᡙᡞᡧᡬf;쀀𝕓Ā;tᏋᡣom»Ꮜtie;拈؀DHUVbdhmptuvᢅᢖᢪᢻᣗᣛᣬ᣿ᤅᤊᤐᤡȀLRlrᢎᢐᢒᢔ;敗;敔;敖;敓ʀ;DUduᢡᢢᢤᢦᢨ敐;敦;敩;敤;敧ȀLRlrᢳᢵᢷᢹ;敝;敚;敜;教΀;HLRhlrᣊᣋᣍᣏᣑᣓᣕ救;敬;散;敠;敫;敢;敟ox;槉ȀLRlrᣤᣦᣨᣪ;敕;敒;攐;攌ʀ;DUduڽ᣷᣹᣻᣽;敥;敨;攬;攴inus;抟lus;択imes;抠ȀLRlrᤙᤛᤝ᤟;敛;敘;攘;攔΀;HLRhlrᤰᤱᤳᤵᤷ᤻᤹攂;敪;敡;敞;攼;攤;攜Āevģ᥂bar耻¦䂦Ȁceioᥑᥖᥚᥠr;쀀𝒷mi;恏mĀ;e᜚᜜lƀ;bhᥨᥩᥫ䁜;槅sub;柈Ŭᥴ᥾lĀ;e᥹᥺怢t»᥺pƀ;Eeįᦅᦇ;檮Ā;qۜۛೡᦧ\0᧨ᨑᨕᨲ\0ᨷᩐ\0\0᪴\0\0᫁\0\0ᬡᬮ᭍᭒\0᯽\0ᰌƀcpr᦭ᦲ᧝ute;䄇̀;abcdsᦿᧀᧄ᧊᧕᧙戩nd;橄rcup;橉Āau᧏᧒p;橋p;橇ot;橀;쀀∩︀Āeo᧢᧥t;恁îړȀaeiu᧰᧻ᨁᨅǰ᧵\0᧸s;橍on;䄍dil耻ç䃧rc;䄉psĀ;sᨌᨍ橌m;橐ot;䄋ƀdmnᨛᨠᨦil肻¸ƭptyv;榲t脀¢;eᨭᨮ䂢räƲr;쀀𝔠ƀceiᨽᩀᩍy;䑇ckĀ;mᩇᩈ朓ark»ᩈ;䏇r΀;Ecefms᩟᩠ᩢᩫ᪤᪪᪮旋;槃ƀ;elᩩᩪᩭ䋆q;扗eɡᩴ\0\0᪈rrowĀlr᩼᪁eft;憺ight;憻ʀRSacd᪒᪔᪖᪚᪟»ཇ;擈st;抛irc;抚ash;抝nint;樐id;櫯cir;槂ubsĀ;u᪻᪼晣it»᪼ˬ᫇᫔᫺\0ᬊonĀ;eᫍᫎ䀺Ā;qÇÆɭ᫙\0\0᫢aĀ;t᫞᫟䀬;䁀ƀ;fl᫨᫩᫫戁îᅠeĀmx᫱᫶ent»᫩eóɍǧ᫾\0ᬇĀ;dኻᬂot;橭nôɆƀfryᬐᬔᬗ;쀀𝕔oäɔ脀©;sŕᬝr;愗Āaoᬥᬩrr;憵ss;朗Ācuᬲᬷr;쀀𝒸Ābpᬼ᭄Ā;eᭁᭂ櫏;櫑Ā;eᭉᭊ櫐;櫒dot;拯΀delprvw᭠᭬᭷ᮂᮬᯔ᯹arrĀlr᭨᭪;椸;椵ɰ᭲\0\0᭵r;拞c;拟arrĀ;p᭿ᮀ憶;椽̀;bcdosᮏᮐᮖᮡᮥᮨ截rcap;橈Āauᮛᮞp;橆p;橊ot;抍r;橅;쀀∪︀Ȁalrv᮵ᮿᯞᯣrrĀ;mᮼᮽ憷;椼yƀevwᯇᯔᯘqɰᯎ\0\0ᯒreã᭳uã᭵ee;拎edge;拏en耻¤䂤earrowĀlrᯮ᯳eft»ᮀight»ᮽeäᯝĀciᰁᰇoninôǷnt;戱lcty;挭ঀAHabcdefhijlorstuwz᰸᰻᰿ᱝᱩᱵᲊᲞᲬᲷ᳻᳿ᴍᵻᶑᶫᶻ᷆᷍rò΁ar;楥Ȁglrs᱈ᱍ᱒᱔ger;怠eth;愸òᄳhĀ;vᱚᱛ怐»ऊūᱡᱧarow;椏aã̕Āayᱮᱳron;䄏;䐴ƀ;ao̲ᱼᲄĀgrʿᲁr;懊tseq;橷ƀglmᲑᲔᲘ耻°䂰ta;䎴ptyv;榱ĀirᲣᲨsht;楿;쀀𝔡arĀlrᲳᲵ»ࣜ»သʀaegsv᳂͸᳖᳜᳠mƀ;oș᳊᳔ndĀ;ș᳑uit;晦amma;䏝in;拲ƀ;io᳧᳨᳸䃷de脀÷;o᳧ᳰntimes;拇nø᳷cy;䑒cɯᴆ\0\0ᴊrn;挞op;挍ʀlptuwᴘᴝᴢᵉᵕlar;䀤f;쀀𝕕ʀ;emps̋ᴭᴷᴽᵂqĀ;d͒ᴳot;扑inus;戸lus;戔quare;抡blebarwedgåúnƀadhᄮᵝᵧownarrowóᲃarpoonĀlrᵲᵶefôᲴighôᲶŢᵿᶅkaro÷གɯᶊ\0\0ᶎrn;挟op;挌ƀcotᶘᶣᶦĀryᶝᶡ;쀀𝒹;䑕l;槶rok;䄑Ādrᶰᶴot;拱iĀ;fᶺ᠖斿Āah᷀᷃ròЩaòྦangle;榦Āci᷒ᷕy;䑟grarr;柿ऀDacdefglmnopqrstuxḁḉḙḸոḼṉṡṾấắẽỡἪἷὄ὎὚ĀDoḆᴴoôᲉĀcsḎḔute耻é䃩ter;橮ȀaioyḢḧḱḶron;䄛rĀ;cḭḮ扖耻ê䃪lon;払;䑍ot;䄗ĀDrṁṅot;扒;쀀𝔢ƀ;rsṐṑṗ檚ave耻è䃨Ā;dṜṝ檖ot;檘Ȁ;ilsṪṫṲṴ檙nters;揧;愓Ā;dṹṺ檕ot;檗ƀapsẅẉẗcr;䄓tyƀ;svẒẓẕ戅et»ẓpĀ1;ẝẤĳạả;怄;怅怃ĀgsẪẬ;䅋p;怂ĀgpẴẸon;䄙f;쀀𝕖ƀalsỄỎỒrĀ;sỊị拕l;槣us;橱iƀ;lvỚớở䎵on»ớ;䏵ȀcsuvỪỳἋἣĀioữḱrc»Ḯɩỹ\0\0ỻíՈantĀglἂἆtr»ṝess»Ṻƀaeiἒ἖Ἒls;䀽st;扟vĀ;DȵἠD;橸parsl;槥ĀDaἯἳot;打rr;楱ƀcdiἾὁỸr;愯oô͒ĀahὉὋ;䎷耻ð䃰Āmrὓὗl耻ë䃫o;悬ƀcipὡὤὧl;䀡sôծĀeoὬὴctatioîՙnentialåչৡᾒ\0ᾞ\0ᾡᾧ\0\0ῆῌ\0ΐ\0ῦῪ \0 ⁚llingdotseñṄy;䑄male;晀ƀilrᾭᾳ῁lig;耀ﬃɩᾹ\0\0᾽g;耀ﬀig;耀ﬄ;쀀𝔣lig;耀ﬁlig;쀀fjƀaltῙ῜ῡt;晭ig;耀ﬂns;斱of;䆒ǰ΅\0ῳf;쀀𝕗ĀakֿῷĀ;vῼ´拔;櫙artint;樍Āao‌⁕Ācs‑⁒α‚‰‸⁅⁈\0⁐β•‥‧‪‬\0‮耻½䂽;慓耻¼䂼;慕;慙;慛Ƴ‴\0‶;慔;慖ʴ‾⁁\0\0⁃耻¾䂾;慗;慜5;慘ƶ⁌\0⁎;慚;慝8;慞l;恄wn;挢cr;쀀𝒻ࢀEabcdefgijlnorstv₂₉₟₥₰₴⃰⃵⃺⃿℃ℒℸ̗ℾ⅒↞Ā;lٍ₇;檌ƀcmpₐₕ₝ute;䇵maĀ;dₜ᳚䎳;檆reve;䄟Āiy₪₮rc;䄝;䐳ot;䄡Ȁ;lqsؾق₽⃉ƀ;qsؾٌ⃄lanô٥Ȁ;cdl٥⃒⃥⃕c;檩otĀ;o⃜⃝檀Ā;l⃢⃣檂;檄Ā;e⃪⃭쀀⋛︀s;檔r;쀀𝔤Ā;gٳ؛mel;愷cy;䑓Ȁ;Eajٚℌℎℐ;檒;檥;檤ȀEaesℛℝ℩ℴ;扩pĀ;p℣ℤ檊rox»ℤĀ;q℮ℯ檈Ā;q℮ℛim;拧pf;쀀𝕘Āci⅃ⅆr;愊mƀ;el٫ⅎ⅐;檎;檐茀>;cdlqr׮ⅠⅪⅮⅳⅹĀciⅥⅧ;檧r;橺ot;拗Par;榕uest;橼ʀadelsↄⅪ←ٖ↛ǰ↉\0↎proø₞r;楸qĀlqؿ↖lesó₈ií٫Āen↣↭rtneqq;쀀≩︀Å↪ԀAabcefkosy⇄⇇⇱⇵⇺∘∝∯≨≽ròΠȀilmr⇐⇔⇗⇛rsðᒄf»․ilôکĀdr⇠⇤cy;䑊ƀ;cwࣴ⇫⇯ir;楈;憭ar;意irc;䄥ƀalr∁∎∓rtsĀ;u∉∊晥it»∊lip;怦con;抹r;쀀𝔥sĀew∣∩arow;椥arow;椦ʀamopr∺∾≃≞≣rr;懿tht;戻kĀlr≉≓eftarrow;憩ightarrow;憪f;쀀𝕙bar;怕ƀclt≯≴≸r;쀀𝒽asè⇴rok;䄧Ābp⊂⊇ull;恃hen»ᱛૡ⊣\0⊪\0⊸⋅⋎\0⋕⋳\0\0⋸⌢⍧⍢⍿\0⎆⎪⎴cute耻í䃭ƀ;iyݱ⊰⊵rc耻î䃮;䐸Ācx⊼⊿y;䐵cl耻¡䂡ĀfrΟ⋉;쀀𝔦rave耻ì䃬Ȁ;inoܾ⋝⋩⋮Āin⋢⋦nt;樌t;戭fin;槜ta;愩lig;䄳ƀaop⋾⌚⌝ƀcgt⌅⌈⌗r;䄫ƀelpܟ⌏⌓inåގarôܠh;䄱f;抷ed;䆵ʀ;cfotӴ⌬⌱⌽⍁are;愅inĀ;t⌸⌹戞ie;槝doô⌙ʀ;celpݗ⍌⍐⍛⍡al;抺Āgr⍕⍙eróᕣã⍍arhk;樗rod;樼Ȁcgpt⍯⍲⍶⍻y;䑑on;䄯f;쀀𝕚a;䎹uest耻¿䂿Āci⎊⎏r;쀀𝒾nʀ;EdsvӴ⎛⎝⎡ӳ;拹ot;拵Ā;v⎦⎧拴;拳Ā;iݷ⎮lde;䄩ǫ⎸\0⎼cy;䑖l耻ï䃯̀cfmosu⏌⏗⏜⏡⏧⏵Āiy⏑⏕rc;䄵;䐹r;쀀𝔧ath;䈷pf;쀀𝕛ǣ⏬\0⏱r;쀀𝒿rcy;䑘kcy;䑔Ѐacfghjos␋␖␢␧␭␱␵␻ppaĀ;v␓␔䎺;䏰Āey␛␠dil;䄷;䐺r;쀀𝔨reen;䄸cy;䑅cy;䑜pf;쀀𝕜cr;쀀𝓀஀ABEHabcdefghjlmnoprstuv⑰⒁⒆⒍⒑┎┽╚▀♎♞♥♹♽⚚⚲⛘❝❨➋⟀⠁⠒ƀart⑷⑺⑼rò৆òΕail;椛arr;椎Ā;gঔ⒋;檋ar;楢ॣ⒥\0⒪\0⒱\0\0\0\0\0⒵Ⓔ\0ⓆⓈⓍ\0⓹ute;䄺mptyv;榴raîࡌbda;䎻gƀ;dlࢎⓁⓃ;榑åࢎ;檅uo耻«䂫rЀ;bfhlpst࢙ⓞⓦⓩ⓫⓮⓱⓵Ā;f࢝ⓣs;椟s;椝ë≒p;憫l;椹im;楳l;憢ƀ;ae⓿─┄檫il;椙Ā;s┉┊檭;쀀⪭︀ƀabr┕┙┝rr;椌rk;杲Āak┢┬cĀek┨┪;䁻;䁛Āes┱┳;榋lĀdu┹┻;榏;榍Ȁaeuy╆╋╖╘ron;䄾Ādi═╔il;䄼ìࢰâ┩;䐻Ȁcqrs╣╦╭╽a;椶uoĀ;rนᝆĀdu╲╷har;楧shar;楋h;憲ʀ;fgqs▋▌উ◳◿扤tʀahlrt▘▤▷◂◨rrowĀ;t࢙□aé⓶arpoonĀdu▯▴own»њp»०eftarrows;懇ightƀahs◍◖◞rrowĀ;sࣴࢧarpoonó྘quigarro÷⇰hreetimes;拋ƀ;qs▋ও◺lanôবʀ;cdgsব☊☍☝☨c;檨otĀ;o☔☕橿Ā;r☚☛檁;檃Ā;e☢☥쀀⋚︀s;檓ʀadegs☳☹☽♉♋pproøⓆot;拖qĀgq♃♅ôউgtò⒌ôছiíলƀilr♕࣡♚sht;楼;쀀𝔩Ā;Eজ♣;檑š♩♶rĀdu▲♮Ā;l॥♳;楪lk;斄cy;䑙ʀ;achtੈ⚈⚋⚑⚖rò◁orneòᴈard;楫ri;旺Āio⚟⚤dot;䅀ustĀ;a⚬⚭掰che»⚭ȀEaes⚻⚽⛉⛔;扨pĀ;p⛃⛄檉rox»⛄Ā;q⛎⛏檇Ā;q⛎⚻im;拦Ѐabnoptwz⛩⛴⛷✚✯❁❇❐Ānr⛮⛱g;柬r;懽rëࣁgƀlmr⛿✍✔eftĀar০✇ightá৲apsto;柼ightá৽parrowĀlr✥✩efô⓭ight;憬ƀafl✶✹✽r;榅;쀀𝕝us;樭imes;樴š❋❏st;戗áፎƀ;ef❗❘᠀旊nge»❘arĀ;l❤❥䀨t;榓ʀachmt❳❶❼➅➇ròࢨorneòᶌarĀ;d྘➃;業;怎ri;抿̀achiqt➘➝ੀ➢➮➻quo;怹r;쀀𝓁mƀ;egল➪➬;檍;檏Ābu┪➳oĀ;rฟ➹;怚rok;䅂萀<;cdhilqrࠫ⟒☹⟜⟠⟥⟪⟰Āci⟗⟙;檦r;橹reå◲mes;拉arr;楶uest;橻ĀPi⟵⟹ar;榖ƀ;ef⠀भ᠛旃rĀdu⠇⠍shar;楊har;楦Āen⠗⠡rtneqq;쀀≨︀Å⠞܀Dacdefhilnopsu⡀⡅⢂⢎⢓⢠⢥⢨⣚⣢⣤ઃ⣳⤂Dot;戺Ȁclpr⡎⡒⡣⡽r耻¯䂯Āet⡗⡙;時Ā;e⡞⡟朠se»⡟Ā;sျ⡨toȀ;dluျ⡳⡷⡻owîҌefôएðᏑker;斮Āoy⢇⢌mma;権;䐼ash;怔asuredangle»ᘦr;쀀𝔪o;愧ƀcdn⢯⢴⣉ro耻µ䂵Ȁ;acdᑤ⢽⣀⣄sôᚧir;櫰ot肻·Ƶusƀ;bd⣒ᤃ⣓戒Ā;uᴼ⣘;横ţ⣞⣡p;櫛ò−ðઁĀdp⣩⣮els;抧f;쀀𝕞Āct⣸⣽r;쀀𝓂pos»ᖝƀ;lm⤉⤊⤍䎼timap;抸ఀGLRVabcdefghijlmoprstuvw⥂⥓⥾⦉⦘⧚⧩⨕⨚⩘⩝⪃⪕⪤⪨⬄⬇⭄⭿⮮ⰴⱧⱼ⳩Āgt⥇⥋;쀀⋙̸Ā;v⥐௏쀀≫⃒ƀelt⥚⥲⥶ftĀar⥡⥧rrow;懍ightarrow;懎;쀀⋘̸Ā;v⥻ే쀀≪⃒ightarrow;懏ĀDd⦎⦓ash;抯ash;抮ʀbcnpt⦣⦧⦬⦱⧌la»˞ute;䅄g;쀀∠⃒ʀ;Eiop඄⦼⧀⧅⧈;쀀⩰̸d;쀀≋̸s;䅉roø඄urĀ;a⧓⧔普lĀ;s⧓ସǳ⧟\0⧣p肻 ଷmpĀ;e௹ఀʀaeouy⧴⧾⨃⨐⨓ǰ⧹\0⧻;橃on;䅈dil;䅆ngĀ;dൾ⨊ot;쀀⩭̸p;橂;䐽ash;怓΀;Aadqsxஒ⨩⨭⨻⩁⩅⩐rr;懗rĀhr⨳⨶k;椤Ā;oᏲᏰot;쀀≐̸uiöୣĀei⩊⩎ar;椨í஘istĀ;s஠டr;쀀𝔫ȀEest௅⩦⩹⩼ƀ;qs஼⩭௡ƀ;qs஼௅⩴lanô௢ií௪Ā;rஶ⪁»ஷƀAap⪊⪍⪑rò⥱rr;憮ar;櫲ƀ;svྍ⪜ྌĀ;d⪡⪢拼;拺cy;䑚΀AEadest⪷⪺⪾⫂⫅⫶⫹rò⥦;쀀≦̸rr;憚r;急Ȁ;fqs఻⫎⫣⫯tĀar⫔⫙rro÷⫁ightarro÷⪐ƀ;qs఻⪺⫪lanôౕĀ;sౕ⫴»శiíౝĀ;rవ⫾iĀ;eచథiäඐĀpt⬌⬑f;쀀𝕟膀¬;in⬙⬚⬶䂬nȀ;Edvஉ⬤⬨⬮;쀀⋹̸ot;쀀⋵̸ǡஉ⬳⬵;拷;拶iĀ;vಸ⬼ǡಸ⭁⭃;拾;拽ƀaor⭋⭣⭩rȀ;ast୻⭕⭚⭟lleì୻l;쀀⫽⃥;쀀∂̸lint;樔ƀ;ceಒ⭰⭳uåಥĀ;cಘ⭸Ā;eಒ⭽ñಘȀAait⮈⮋⮝⮧rò⦈rrƀ;cw⮔⮕⮙憛;쀀⤳̸;쀀↝̸ghtarrow»⮕riĀ;eೋೖ΀chimpqu⮽⯍⯙⬄୸⯤⯯Ȁ;cerല⯆ഷ⯉uå൅;쀀𝓃ortɭ⬅\0\0⯖ará⭖mĀ;e൮⯟Ā;q൴൳suĀbp⯫⯭å೸åഋƀbcp⯶ⰑⰙȀ;Ees⯿ⰀഢⰄ抄;쀀⫅̸etĀ;eഛⰋqĀ;qണⰀcĀ;eലⰗñസȀ;EesⰢⰣൟⰧ抅;쀀⫆̸etĀ;e൘ⰮqĀ;qൠⰣȀgilrⰽⰿⱅⱇìௗlde耻ñ䃱çృiangleĀlrⱒⱜeftĀ;eచⱚñదightĀ;eೋⱥñ೗Ā;mⱬⱭ䎽ƀ;esⱴⱵⱹ䀣ro;愖p;怇ҀDHadgilrsⲏⲔⲙⲞⲣⲰⲶⳓⳣash;抭arr;椄p;쀀≍⃒ash;抬ĀetⲨⲬ;쀀≥⃒;쀀>⃒nfin;槞ƀAetⲽⳁⳅrr;椂;쀀≤⃒Ā;rⳊⳍ쀀<⃒ie;쀀⊴⃒ĀAtⳘⳜrr;椃rie;쀀⊵⃒im;쀀∼⃒ƀAan⳰⳴ⴂrr;懖rĀhr⳺⳽k;椣Ā;oᏧᏥear;椧ቓ᪕\0\0\0\0\0\0\0\0\0\0\0\0\0ⴭ\0ⴸⵈⵠⵥ⵲ⶄᬇ\0\0ⶍⶫ\0ⷈⷎ\0ⷜ⸙⸫⸾⹃Ācsⴱ᪗ute耻ó䃳ĀiyⴼⵅrĀ;c᪞ⵂ耻ô䃴;䐾ʀabios᪠ⵒⵗǈⵚlac;䅑v;樸old;榼lig;䅓Ācr⵩⵭ir;榿;쀀𝔬ͯ⵹\0\0⵼\0ⶂn;䋛ave耻ò䃲;槁Ābmⶈ෴ar;榵Ȁacitⶕ⶘ⶥⶨrò᪀Āir⶝ⶠr;榾oss;榻nå๒;槀ƀaeiⶱⶵⶹcr;䅍ga;䏉ƀcdnⷀⷅǍron;䎿;榶pf;쀀𝕠ƀaelⷔ⷗ǒr;榷rp;榹΀;adiosvⷪⷫⷮ⸈⸍⸐⸖戨rò᪆Ȁ;efmⷷⷸ⸂⸅橝rĀ;oⷾⷿ愴f»ⷿ耻ª䂪耻º䂺gof;抶r;橖lope;橗;橛ƀclo⸟⸡⸧ò⸁ash耻ø䃸l;折iŬⸯ⸴de耻õ䃵esĀ;aǛ⸺s;樶ml耻ö䃶bar;挽ૡ⹞\0⹽\0⺀⺝\0⺢⺹\0\0⻋ຜ\0⼓\0\0⼫⾼\0⿈rȀ;astЃ⹧⹲຅脀¶;l⹭⹮䂶leìЃɩ⹸\0\0⹻m;櫳;櫽y;䐿rʀcimpt⺋⺏⺓ᡥ⺗nt;䀥od;䀮il;怰enk;怱r;쀀𝔭ƀimo⺨⺰⺴Ā;v⺭⺮䏆;䏕maô੶ne;明ƀ;tv⺿⻀⻈䏀chfork»´;䏖Āau⻏⻟nĀck⻕⻝kĀ;h⇴⻛;愎ö⇴sҀ;abcdemst⻳⻴ᤈ⻹⻽⼄⼆⼊⼎䀫cir;樣ir;樢Āouᵀ⼂;樥;橲n肻±ຝim;樦wo;樧ƀipu⼙⼠⼥ntint;樕f;쀀𝕡nd耻£䂣Ԁ;Eaceinosu່⼿⽁⽄⽇⾁⾉⾒⽾⾶;檳p;檷uå໙Ā;c໎⽌̀;acens່⽙⽟⽦⽨⽾pproø⽃urlyeñ໙ñ໎ƀaes⽯⽶⽺pprox;檹qq;檵im;拨iíໟmeĀ;s⾈ຮ怲ƀEas⽸⾐⽺ð⽵ƀdfp໬⾙⾯ƀals⾠⾥⾪lar;挮ine;挒urf;挓Ā;t໻⾴ï໻rel;抰Āci⿀⿅r;쀀𝓅;䏈ncsp;怈̀fiopsu⿚⋢⿟⿥⿫⿱r;쀀𝔮pf;쀀𝕢rime;恗cr;쀀𝓆ƀaeo⿸〉〓tĀei⿾々rnionóڰnt;樖stĀ;e【】䀿ñἙô༔઀ABHabcdefhilmnoprstux぀けさすムㄎㄫㅇㅢㅲㆎ㈆㈕㈤㈩㉘㉮㉲㊐㊰㊷ƀartぇおがròႳòϝail;検aròᱥar;楤΀cdenqrtとふへみわゔヌĀeuねぱ;쀀∽̱te;䅕iãᅮmptyv;榳gȀ;del࿑らるろ;榒;榥å࿑uo耻»䂻rր;abcfhlpstw࿜ガクシスゼゾダッデナp;極Ā;f࿠ゴs;椠;椳s;椞ë≝ð✮l;楅im;楴l;憣;憝Āaiパフil;椚oĀ;nホボ戶aló༞ƀabrョリヮrò៥rk;杳ĀakンヽcĀekヹ・;䁽;䁝Āes㄂㄄;榌lĀduㄊㄌ;榎;榐Ȁaeuyㄗㄜㄧㄩron;䅙Ādiㄡㄥil;䅗ì࿲âヺ;䑀Ȁclqsㄴㄷㄽㅄa;椷dhar;楩uoĀ;rȎȍh;憳ƀacgㅎㅟངlȀ;ipsླྀㅘㅛႜnåႻarôྩt;断ƀilrㅩဣㅮsht;楽;쀀𝔯ĀaoㅷㆆrĀduㅽㅿ»ѻĀ;l႑ㆄ;楬Ā;vㆋㆌ䏁;䏱ƀgns㆕ㇹㇼht̀ahlrstㆤㆰ㇂㇘㇤㇮rrowĀ;t࿜ㆭaéトarpoonĀduㆻㆿowîㅾp»႒eftĀah㇊㇐rrowó࿪arpoonóՑightarrows;應quigarro÷ニhreetimes;拌g;䋚ingdotseñἲƀahm㈍㈐㈓rò࿪aòՑ;怏oustĀ;a㈞㈟掱che»㈟mid;櫮Ȁabpt㈲㈽㉀㉒Ānr㈷㈺g;柭r;懾rëဃƀafl㉇㉊㉎r;榆;쀀𝕣us;樮imes;樵Āap㉝㉧rĀ;g㉣㉤䀩t;榔olint;樒arò㇣Ȁachq㉻㊀Ⴜ㊅quo;怺r;쀀𝓇Ābu・㊊oĀ;rȔȓƀhir㊗㊛㊠reåㇸmes;拊iȀ;efl㊪ၙᠡ㊫方tri;槎luhar;楨;愞ൡ㋕㋛㋟㌬㌸㍱\0㍺㎤\0\0㏬㏰\0㐨㑈㑚㒭㒱㓊㓱\0㘖\0\0㘳cute;䅛quï➺Ԁ;Eaceinpsyᇭ㋳㋵㋿㌂㌋㌏㌟㌦㌩;檴ǰ㋺\0㋼;檸on;䅡uåᇾĀ;dᇳ㌇il;䅟rc;䅝ƀEas㌖㌘㌛;檶p;檺im;择olint;樓iíሄ;䑁otƀ;be㌴ᵇ㌵担;橦΀Aacmstx㍆㍊㍗㍛㍞㍣㍭rr;懘rĀhr㍐㍒ë∨Ā;oਸ਼਴t耻§䂧i;䀻war;椩mĀin㍩ðnuóñt;朶rĀ;o㍶⁕쀀𝔰Ȁacoy㎂㎆㎑㎠rp;景Āhy㎋㎏cy;䑉;䑈rtɭ㎙\0\0㎜iäᑤaraì⹯耻­䂭Āgm㎨㎴maƀ;fv㎱㎲㎲䏃;䏂Ѐ;deglnprካ㏅㏉㏎㏖㏞㏡㏦ot;橪Ā;q኱ኰĀ;E㏓㏔檞;檠Ā;E㏛㏜檝;檟e;扆lus;樤arr;楲aròᄽȀaeit㏸㐈㐏㐗Āls㏽㐄lsetmé㍪hp;樳parsl;槤Ādlᑣ㐔e;挣Ā;e㐜㐝檪Ā;s㐢㐣檬;쀀⪬︀ƀflp㐮㐳㑂tcy;䑌Ā;b㐸㐹䀯Ā;a㐾㐿槄r;挿f;쀀𝕤aĀdr㑍ЂesĀ;u㑔㑕晠it»㑕ƀcsu㑠㑹㒟Āau㑥㑯pĀ;sᆈ㑫;쀀⊓︀pĀ;sᆴ㑵;쀀⊔︀uĀbp㑿㒏ƀ;esᆗᆜ㒆etĀ;eᆗ㒍ñᆝƀ;esᆨᆭ㒖etĀ;eᆨ㒝ñᆮƀ;afᅻ㒦ְrť㒫ֱ»ᅼaròᅈȀcemt㒹㒾㓂㓅r;쀀𝓈tmîñiì㐕aræᆾĀar㓎㓕rĀ;f㓔ឿ昆Āan㓚㓭ightĀep㓣㓪psiloîỠhé⺯s»⡒ʀbcmnp㓻㕞ሉ㖋㖎Ҁ;Edemnprs㔎㔏㔑㔕㔞㔣㔬㔱㔶抂;櫅ot;檽Ā;dᇚ㔚ot;櫃ult;櫁ĀEe㔨㔪;櫋;把lus;檿arr;楹ƀeiu㔽㕒㕕tƀ;en㔎㕅㕋qĀ;qᇚ㔏eqĀ;q㔫㔨m;櫇Ābp㕚㕜;櫕;櫓c̀;acensᇭ㕬㕲㕹㕻㌦pproø㋺urlyeñᇾñᇳƀaes㖂㖈㌛pproø㌚qñ㌗g;晪ڀ123;Edehlmnps㖩㖬㖯ሜ㖲㖴㗀㗉㗕㗚㗟㗨㗭耻¹䂹耻²䂲耻³䂳;櫆Āos㖹㖼t;檾ub;櫘Ā;dሢ㗅ot;櫄sĀou㗏㗒l;柉b;櫗arr;楻ult;櫂ĀEe㗤㗦;櫌;抋lus;櫀ƀeiu㗴㘉㘌tƀ;enሜ㗼㘂qĀ;qሢ㖲eqĀ;q㗧㗤m;櫈Ābp㘑㘓;櫔;櫖ƀAan㘜㘠㘭rr;懙rĀhr㘦㘨ë∮Ā;oਫ਩war;椪lig耻ß䃟௡㙑㙝㙠ዎ㙳㙹\0㙾㛂\0\0\0\0\0㛛㜃\0㜉㝬\0\0\0㞇ɲ㙖\0\0㙛get;挖;䏄rë๟ƀaey㙦㙫㙰ron;䅥dil;䅣;䑂lrec;挕r;쀀𝔱Ȁeiko㚆㚝㚵㚼ǲ㚋\0㚑eĀ4fኄኁaƀ;sv㚘㚙㚛䎸ym;䏑Ācn㚢㚲kĀas㚨㚮pproø዁im»ኬsðኞĀas㚺㚮ð዁rn耻þ䃾Ǭ̟㛆⋧es膀×;bd㛏㛐㛘䃗Ā;aᤏ㛕r;樱;樰ƀeps㛡㛣㜀á⩍Ȁ;bcf҆㛬㛰㛴ot;挶ir;櫱Ā;o㛹㛼쀀𝕥rk;櫚á㍢rime;怴ƀaip㜏㜒㝤dåቈ΀adempst㜡㝍㝀㝑㝗㝜㝟ngleʀ;dlqr㜰㜱㜶㝀㝂斵own»ᶻeftĀ;e⠀㜾ñम;扜ightĀ;e㊪㝋ñၚot;旬inus;樺lus;樹b;槍ime;樻ezium;揢ƀcht㝲㝽㞁Āry㝷㝻;쀀𝓉;䑆cy;䑛rok;䅧Āio㞋㞎xô᝷headĀlr㞗㞠eftarro÷ࡏightarrow»ཝऀAHabcdfghlmoprstuw㟐㟓㟗㟤㟰㟼㠎㠜㠣㠴㡑㡝㡫㢩㣌㣒㣪㣶ròϭar;楣Ācr㟜㟢ute耻ú䃺òᅐrǣ㟪\0㟭y;䑞ve;䅭Āiy㟵㟺rc耻û䃻;䑃ƀabh㠃㠆㠋ròᎭlac;䅱aòᏃĀir㠓㠘sht;楾;쀀𝔲rave耻ù䃹š㠧㠱rĀlr㠬㠮»ॗ»ႃlk;斀Āct㠹㡍ɯ㠿\0\0㡊rnĀ;e㡅㡆挜r»㡆op;挏ri;旸Āal㡖㡚cr;䅫肻¨͉Āgp㡢㡦on;䅳f;쀀𝕦̀adhlsuᅋ㡸㡽፲㢑㢠ownáᎳarpoonĀlr㢈㢌efô㠭ighô㠯iƀ;hl㢙㢚㢜䏅»ᏺon»㢚parrows;懈ƀcit㢰㣄㣈ɯ㢶\0\0㣁rnĀ;e㢼㢽挝r»㢽op;挎ng;䅯ri;旹cr;쀀𝓊ƀdir㣙㣝㣢ot;拰lde;䅩iĀ;f㜰㣨»᠓Āam㣯㣲rò㢨l耻ü䃼angle;榧ހABDacdeflnoprsz㤜㤟㤩㤭㦵㦸㦽㧟㧤㧨㧳㧹㧽㨁㨠ròϷarĀ;v㤦㤧櫨;櫩asèϡĀnr㤲㤷grt;榜΀eknprst㓣㥆㥋㥒㥝㥤㦖appá␕othinçẖƀhir㓫⻈㥙opô⾵Ā;hᎷ㥢ïㆍĀiu㥩㥭gmá㎳Ābp㥲㦄setneqĀ;q㥽㦀쀀⊊︀;쀀⫋︀setneqĀ;q㦏㦒쀀⊋︀;쀀⫌︀Āhr㦛㦟etá㚜iangleĀlr㦪㦯eft»थight»ၑy;䐲ash»ံƀelr㧄㧒㧗ƀ;beⷪ㧋㧏ar;抻q;扚lip;拮Ābt㧜ᑨaòᑩr;쀀𝔳tré㦮suĀbp㧯㧱»ജ»൙pf;쀀𝕧roð໻tré㦴Ācu㨆㨋r;쀀𝓋Ābp㨐㨘nĀEe㦀㨖»㥾nĀEe㦒㨞»㦐igzag;榚΀cefoprs㨶㨻㩖㩛㩔㩡㩪irc;䅵Ādi㩀㩑Ābg㩅㩉ar;機eĀ;qᗺ㩏;扙erp;愘r;쀀𝔴pf;쀀𝕨Ā;eᑹ㩦atèᑹcr;쀀𝓌ૣណ㪇\0㪋\0㪐㪛\0\0㪝㪨㪫㪯\0\0㫃㫎\0㫘ៜ៟tré៑r;쀀𝔵ĀAa㪔㪗ròσrò৶;䎾ĀAa㪡㪤ròθrò৫að✓is;拻ƀdptឤ㪵㪾Āfl㪺ឩ;쀀𝕩imåឲĀAa㫇㫊ròώròਁĀcq㫒ីr;쀀𝓍Āpt៖㫜ré។Ѐacefiosu㫰㫽㬈㬌㬑㬕㬛㬡cĀuy㫶㫻te耻ý䃽;䑏Āiy㬂㬆rc;䅷;䑋n耻¥䂥r;쀀𝔶cy;䑗pf;쀀𝕪cr;쀀𝓎Ācm㬦㬩y;䑎l耻ÿ䃿Ԁacdefhiosw㭂㭈㭔㭘㭤㭩㭭㭴㭺㮀cute;䅺Āay㭍㭒ron;䅾;䐷ot;䅼Āet㭝㭡træᕟa;䎶r;쀀𝔷cy;䐶grarr;懝pf;쀀𝕫cr;쀀𝓏Ājn㮅㮇;怍j;怌'
      .split('')
      .map((e) => e.charCodeAt(0)),
  ),
  us = new Uint16Array(
    'Ȁaglq	\x1Bɭ\0\0p;䀦os;䀧t;䀾t;䀼uot;䀢'
      .split('')
      .map((e) => e.charCodeAt(0)),
  )
var Nu
const ns = new Map([
    [0, 65533],
    [128, 8364],
    [130, 8218],
    [131, 402],
    [132, 8222],
    [133, 8230],
    [134, 8224],
    [135, 8225],
    [136, 710],
    [137, 8240],
    [138, 352],
    [139, 8249],
    [140, 338],
    [142, 381],
    [145, 8216],
    [146, 8217],
    [147, 8220],
    [148, 8221],
    [149, 8226],
    [150, 8211],
    [151, 8212],
    [152, 732],
    [153, 8482],
    [154, 353],
    [155, 8250],
    [156, 339],
    [158, 382],
    [159, 376],
  ]),
  rs =
    (Nu = String.fromCodePoint) !== null && Nu !== void 0
      ? Nu
      : function (e) {
          let t = ''
          return (
            e > 65535 &&
              ((e -= 65536),
              (t += String.fromCharCode(((e >>> 10) & 1023) | 55296)),
              (e = 56320 | (e & 1023))),
            (t += String.fromCharCode(e)),
            t
          )
        }
function is(e) {
  var t
  return (e >= 55296 && e <= 57343) || e > 1114111
    ? 65533
    : (t = ns.get(e)) !== null && t !== void 0
      ? t
      : e
}
var ae
;(function (e) {
  ;(e[(e.NUM = 35)] = 'NUM'),
    (e[(e.SEMI = 59)] = 'SEMI'),
    (e[(e.EQUALS = 61)] = 'EQUALS'),
    (e[(e.ZERO = 48)] = 'ZERO'),
    (e[(e.NINE = 57)] = 'NINE'),
    (e[(e.LOWER_A = 97)] = 'LOWER_A'),
    (e[(e.LOWER_F = 102)] = 'LOWER_F'),
    (e[(e.LOWER_X = 120)] = 'LOWER_X'),
    (e[(e.LOWER_Z = 122)] = 'LOWER_Z'),
    (e[(e.UPPER_A = 65)] = 'UPPER_A'),
    (e[(e.UPPER_F = 70)] = 'UPPER_F'),
    (e[(e.UPPER_Z = 90)] = 'UPPER_Z')
})(ae || (ae = {}))
const os = 32
var Je
;(function (e) {
  ;(e[(e.VALUE_LENGTH = 49152)] = 'VALUE_LENGTH'),
    (e[(e.BRANCH_LENGTH = 16256)] = 'BRANCH_LENGTH'),
    (e[(e.JUMP_TABLE = 127)] = 'JUMP_TABLE')
})(Je || (Je = {}))
function rn(e) {
  return e >= ae.ZERO && e <= ae.NINE
}
function ss(e) {
  return (
    (e >= ae.UPPER_A && e <= ae.UPPER_F) || (e >= ae.LOWER_A && e <= ae.LOWER_F)
  )
}
function as(e) {
  return (
    (e >= ae.UPPER_A && e <= ae.UPPER_Z) ||
    (e >= ae.LOWER_A && e <= ae.LOWER_Z) ||
    rn(e)
  )
}
function cs(e) {
  return e === ae.EQUALS || as(e)
}
var ie
;(function (e) {
  ;(e[(e.EntityStart = 0)] = 'EntityStart'),
    (e[(e.NumericStart = 1)] = 'NumericStart'),
    (e[(e.NumericDecimal = 2)] = 'NumericDecimal'),
    (e[(e.NumericHex = 3)] = 'NumericHex'),
    (e[(e.NamedEntity = 4)] = 'NamedEntity')
})(ie || (ie = {}))
var Xe
;(function (e) {
  ;(e[(e.Legacy = 0)] = 'Legacy'),
    (e[(e.Strict = 1)] = 'Strict'),
    (e[(e.Attribute = 2)] = 'Attribute')
})(Xe || (Xe = {}))
class ls {
  constructor(t, u, n) {
    ;(this.decodeTree = t),
      (this.emitCodePoint = u),
      (this.errors = n),
      (this.state = ie.EntityStart),
      (this.consumed = 1),
      (this.result = 0),
      (this.treeIndex = 0),
      (this.excess = 1),
      (this.decodeMode = Xe.Strict)
  }
  startEntity(t) {
    ;(this.decodeMode = t),
      (this.state = ie.EntityStart),
      (this.result = 0),
      (this.treeIndex = 0),
      (this.excess = 1),
      (this.consumed = 1)
  }
  write(t, u) {
    switch (this.state) {
      case ie.EntityStart:
        return t.charCodeAt(u) === ae.NUM
          ? ((this.state = ie.NumericStart),
            (this.consumed += 1),
            this.stateNumericStart(t, u + 1))
          : ((this.state = ie.NamedEntity), this.stateNamedEntity(t, u))
      case ie.NumericStart:
        return this.stateNumericStart(t, u)
      case ie.NumericDecimal:
        return this.stateNumericDecimal(t, u)
      case ie.NumericHex:
        return this.stateNumericHex(t, u)
      case ie.NamedEntity:
        return this.stateNamedEntity(t, u)
    }
  }
  stateNumericStart(t, u) {
    return u >= t.length
      ? -1
      : (t.charCodeAt(u) | os) === ae.LOWER_X
        ? ((this.state = ie.NumericHex),
          (this.consumed += 1),
          this.stateNumericHex(t, u + 1))
        : ((this.state = ie.NumericDecimal), this.stateNumericDecimal(t, u))
  }
  addToNumericResult(t, u, n, i) {
    if (u !== n) {
      const r = n - u
      ;(this.result =
        this.result * Math.pow(i, r) + parseInt(t.substr(u, r), i)),
        (this.consumed += r)
    }
  }
  stateNumericHex(t, u) {
    const n = u
    for (; u < t.length; ) {
      const i = t.charCodeAt(u)
      if (rn(i) || ss(i)) u += 1
      else
        return (
          this.addToNumericResult(t, n, u, 16), this.emitNumericEntity(i, 3)
        )
    }
    return this.addToNumericResult(t, n, u, 16), -1
  }
  stateNumericDecimal(t, u) {
    const n = u
    for (; u < t.length; ) {
      const i = t.charCodeAt(u)
      if (rn(i)) u += 1
      else
        return (
          this.addToNumericResult(t, n, u, 10), this.emitNumericEntity(i, 2)
        )
    }
    return this.addToNumericResult(t, n, u, 10), -1
  }
  emitNumericEntity(t, u) {
    var n
    if (this.consumed <= u)
      return (
        (n = this.errors) === null ||
          n === void 0 ||
          n.absenceOfDigitsInNumericCharacterReference(this.consumed),
        0
      )
    if (t === ae.SEMI) this.consumed += 1
    else if (this.decodeMode === Xe.Strict) return 0
    return (
      this.emitCodePoint(is(this.result), this.consumed),
      this.errors &&
        (t !== ae.SEMI && this.errors.missingSemicolonAfterCharacterReference(),
        this.errors.validateNumericCharacterReference(this.result)),
      this.consumed
    )
  }
  stateNamedEntity(t, u) {
    const { decodeTree: n } = this
    let i = n[this.treeIndex],
      r = (i & Je.VALUE_LENGTH) >> 14
    for (; u < t.length; u++, this.excess++) {
      const o = t.charCodeAt(u)
      if (
        ((this.treeIndex = ds(n, i, this.treeIndex + Math.max(1, r), o)),
        this.treeIndex < 0)
      )
        return this.result === 0 ||
          (this.decodeMode === Xe.Attribute && (r === 0 || cs(o)))
          ? 0
          : this.emitNotTerminatedNamedEntity()
      if (
        ((i = n[this.treeIndex]), (r = (i & Je.VALUE_LENGTH) >> 14), r !== 0)
      ) {
        if (o === ae.SEMI)
          return this.emitNamedEntityData(
            this.treeIndex,
            r,
            this.consumed + this.excess,
          )
        this.decodeMode !== Xe.Strict &&
          ((this.result = this.treeIndex),
          (this.consumed += this.excess),
          (this.excess = 0))
      }
    }
    return -1
  }
  emitNotTerminatedNamedEntity() {
    var t
    const { result: u, decodeTree: n } = this,
      i = (n[u] & Je.VALUE_LENGTH) >> 14
    return (
      this.emitNamedEntityData(u, i, this.consumed),
      (t = this.errors) === null ||
        t === void 0 ||
        t.missingSemicolonAfterCharacterReference(),
      this.consumed
    )
  }
  emitNamedEntityData(t, u, n) {
    const { decodeTree: i } = this
    return (
      this.emitCodePoint(u === 1 ? i[t] & ~Je.VALUE_LENGTH : i[t + 1], n),
      u === 3 && this.emitCodePoint(i[t + 2], n),
      n
    )
  }
  end() {
    var t
    switch (this.state) {
      case ie.NamedEntity:
        return this.result !== 0 &&
          (this.decodeMode !== Xe.Attribute || this.result === this.treeIndex)
          ? this.emitNotTerminatedNamedEntity()
          : 0
      case ie.NumericDecimal:
        return this.emitNumericEntity(0, 2)
      case ie.NumericHex:
        return this.emitNumericEntity(0, 3)
      case ie.NumericStart:
        return (
          (t = this.errors) === null ||
            t === void 0 ||
            t.absenceOfDigitsInNumericCharacterReference(this.consumed),
          0
        )
      case ie.EntityStart:
        return 0
    }
  }
}
function Nr(e) {
  let t = ''
  const u = new ls(e, (n) => (t += rs(n)))
  return function (i, r) {
    let o = 0,
      s = 0
    for (; (s = i.indexOf('&', s)) >= 0; ) {
      ;(t += i.slice(o, s)), u.startEntity(r)
      const c = u.write(i, s + 1)
      if (c < 0) {
        o = s + u.end()
        break
      }
      ;(o = s + c), (s = c === 0 ? o + 1 : o)
    }
    const a = t + i.slice(o)
    return (t = ''), a
  }
}
function ds(e, t, u, n) {
  const i = (t & Je.BRANCH_LENGTH) >> 7,
    r = t & Je.JUMP_TABLE
  if (i === 0) return r !== 0 && n === r ? u : -1
  if (r) {
    const a = n - r
    return a < 0 || a >= i ? -1 : e[u + a] - 1
  }
  let o = u,
    s = o + i - 1
  for (; o <= s; ) {
    const a = (o + s) >>> 1,
      c = e[a]
    if (c < n) o = a + 1
    else if (c > n) s = a - 1
    else return e[a + i]
  }
  return -1
}
const fs = Nr(ts)
Nr(us)
function qr(e, t = Xe.Legacy) {
  return fs(e, t)
}
function hs(e) {
  return Object.prototype.toString.call(e)
}
function Dn(e) {
  return hs(e) === '[object String]'
}
const ps = Object.prototype.hasOwnProperty
function ms(e, t) {
  return ps.call(e, t)
}
function Du(e) {
  return (
    Array.prototype.slice.call(arguments, 1).forEach(function (u) {
      if (u) {
        if (typeof u != 'object') throw new TypeError(u + 'must be object')
        Object.keys(u).forEach(function (n) {
          e[n] = u[n]
        })
      }
    }),
    e
  )
}
function Hr(e, t, u) {
  return [].concat(e.slice(0, t), u, e.slice(t + 1))
}
function Fn(e) {
  return !(
    (e >= 55296 && e <= 57343) ||
    (e >= 64976 && e <= 65007) ||
    (e & 65535) === 65535 ||
    (e & 65535) === 65534 ||
    (e >= 0 && e <= 8) ||
    e === 11 ||
    (e >= 14 && e <= 31) ||
    (e >= 127 && e <= 159) ||
    e > 1114111
  )
}
function _u(e) {
  if (e > 65535) {
    e -= 65536
    const t = 55296 + (e >> 10),
      u = 56320 + (e & 1023)
    return String.fromCharCode(t, u)
  }
  return String.fromCharCode(e)
}
const Ur = /\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g,
  bs = /&([a-z#][a-z0-9]{1,31});/gi,
  gs = new RegExp(Ur.source + '|' + bs.source, 'gi'),
  xs = /^#((?:x[a-f0-9]{1,8}|[0-9]{1,8}))$/i
function _s(e, t) {
  if (t.charCodeAt(0) === 35 && xs.test(t)) {
    const n =
      t[1].toLowerCase() === 'x'
        ? parseInt(t.slice(2), 16)
        : parseInt(t.slice(1), 10)
    return Fn(n) ? _u(n) : e
  }
  const u = qr(e)
  return u !== e ? u : e
}
function ks(e) {
  return e.indexOf('\\') < 0 ? e : e.replace(Ur, '$1')
}
function Dt(e) {
  return e.indexOf('\\') < 0 && e.indexOf('&') < 0
    ? e
    : e.replace(gs, function (t, u, n) {
        return u || _s(t, n)
      })
}
const ys = /[&<>"]/,
  vs = /[&<>"]/g,
  ws = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }
function Es(e) {
  return ws[e]
}
function tt(e) {
  return ys.test(e) ? e.replace(vs, Es) : e
}
const Cs = /[.?*+^$[\]\\(){}|-]/g
function As(e) {
  return e.replace(Cs, '\\$&')
}
function V(e) {
  switch (e) {
    case 9:
    case 32:
      return !0
  }
  return !1
}
function Bt(e) {
  if (e >= 8192 && e <= 8202) return !0
  switch (e) {
    case 9:
    case 10:
    case 11:
    case 12:
    case 13:
    case 32:
    case 160:
    case 5760:
    case 8239:
    case 8287:
    case 12288:
      return !0
  }
  return !1
}
function Pt(e) {
  return An.test(e) || Pr.test(e)
}
function $t(e) {
  switch (e) {
    case 33:
    case 34:
    case 35:
    case 36:
    case 37:
    case 38:
    case 39:
    case 40:
    case 41:
    case 42:
    case 43:
    case 44:
    case 45:
    case 46:
    case 47:
    case 58:
    case 59:
    case 60:
    case 61:
    case 62:
    case 63:
    case 64:
    case 91:
    case 92:
    case 93:
    case 94:
    case 95:
    case 96:
    case 123:
    case 124:
    case 125:
    case 126:
      return !0
    default:
      return !1
  }
}
function Fu(e) {
  return (
    (e = e.trim().replace(/\s+/g, ' ')),
    'ẞ'.toLowerCase() === 'Ṿ' && (e = e.replace(/ẞ/g, 'ß')),
    e.toLowerCase().toUpperCase()
  )
}
const Ds = { mdurl: Yo, ucmicro: es },
  Fs = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        arrayReplaceAt: Hr,
        assign: Du,
        escapeHtml: tt,
        escapeRE: As,
        fromCodePoint: _u,
        has: ms,
        isMdAsciiPunct: $t,
        isPunctChar: Pt,
        isSpace: V,
        isString: Dn,
        isValidEntityCode: Fn,
        isWhiteSpace: Bt,
        lib: Ds,
        normalizeReference: Fu,
        unescapeAll: Dt,
        unescapeMd: ks,
      },
      Symbol.toStringTag,
      { value: 'Module' },
    ),
  )
function Ss(e, t, u) {
  let n, i, r, o
  const s = e.posMax,
    a = e.pos
  for (e.pos = t + 1, n = 1; e.pos < s; ) {
    if (((r = e.src.charCodeAt(e.pos)), r === 93 && (n--, n === 0))) {
      i = !0
      break
    }
    if (((o = e.pos), e.md.inline.skipToken(e), r === 91)) {
      if (o === e.pos - 1) n++
      else if (u) return (e.pos = a), -1
    }
  }
  let c = -1
  return i && (c = e.pos), (e.pos = a), c
}
function Ts(e, t, u) {
  let n,
    i = t
  const r = { ok: !1, pos: 0, str: '' }
  if (e.charCodeAt(i) === 60) {
    for (i++; i < u; ) {
      if (((n = e.charCodeAt(i)), n === 10 || n === 60)) return r
      if (n === 62)
        return (r.pos = i + 1), (r.str = Dt(e.slice(t + 1, i))), (r.ok = !0), r
      if (n === 92 && i + 1 < u) {
        i += 2
        continue
      }
      i++
    }
    return r
  }
  let o = 0
  for (
    ;
    i < u && ((n = e.charCodeAt(i)), !(n === 32 || n < 32 || n === 127));

  ) {
    if (n === 92 && i + 1 < u) {
      if (e.charCodeAt(i + 1) === 32) break
      i += 2
      continue
    }
    if (n === 40 && (o++, o > 32)) return r
    if (n === 41) {
      if (o === 0) break
      o--
    }
    i++
  }
  return (
    t === i ||
      o !== 0 ||
      ((r.str = Dt(e.slice(t, i))), (r.pos = i), (r.ok = !0)),
    r
  )
}
function Is(e, t, u, n) {
  let i,
    r = t
  const o = { ok: !1, can_continue: !1, pos: 0, str: '', marker: 0 }
  if (n) (o.str = n.str), (o.marker = n.marker)
  else {
    if (r >= u) return o
    let s = e.charCodeAt(r)
    if (s !== 34 && s !== 39 && s !== 40) return o
    t++, r++, s === 40 && (s = 41), (o.marker = s)
  }
  for (; r < u; ) {
    if (((i = e.charCodeAt(r)), i === o.marker))
      return (o.pos = r + 1), (o.str += Dt(e.slice(t, r))), (o.ok = !0), o
    if (i === 40 && o.marker === 41) return o
    i === 92 && r + 1 < u && r++, r++
  }
  return (o.can_continue = !0), (o.str += Dt(e.slice(t, r))), o
}
const zs = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        parseLinkDestination: Ts,
        parseLinkLabel: Ss,
        parseLinkTitle: Is,
      },
      Symbol.toStringTag,
      { value: 'Module' },
    ),
  ),
  $e = {}
$e.code_inline = function (e, t, u, n, i) {
  const r = e[t]
  return '<code' + i.renderAttrs(r) + '>' + tt(r.content) + '</code>'
}
$e.code_block = function (e, t, u, n, i) {
  const r = e[t]
  return (
    '<pre' +
    i.renderAttrs(r) +
    '><code>' +
    tt(e[t].content) +
    `</code></pre>
`
  )
}
$e.fence = function (e, t, u, n, i) {
  const r = e[t],
    o = r.info ? Dt(r.info).trim() : ''
  let s = '',
    a = ''
  if (o) {
    const l = o.split(/(\s+)/g)
    ;(s = l[0]), (a = l.slice(2).join(''))
  }
  let c
  if (
    (u.highlight
      ? (c = u.highlight(r.content, s, a) || tt(r.content))
      : (c = tt(r.content)),
    c.indexOf('<pre') === 0)
  )
    return (
      c +
      `
`
    )
  if (o) {
    const l = r.attrIndex('class'),
      d = r.attrs ? r.attrs.slice() : []
    l < 0
      ? d.push(['class', u.langPrefix + s])
      : ((d[l] = d[l].slice()), (d[l][1] += ' ' + u.langPrefix + s))
    const m = { attrs: d }
    return `<pre><code${i.renderAttrs(m)}>${c}</code></pre>
`
  }
  return `<pre><code${i.renderAttrs(r)}>${c}</code></pre>
`
}
$e.image = function (e, t, u, n, i) {
  const r = e[t]
  return (
    (r.attrs[r.attrIndex('alt')][1] = i.renderInlineAsText(r.children, u, n)),
    i.renderToken(e, t, u)
  )
}
$e.hardbreak = function (e, t, u) {
  return u.xhtmlOut
    ? `<br />
`
    : `<br>
`
}
$e.softbreak = function (e, t, u) {
  return u.breaks
    ? u.xhtmlOut
      ? `<br />
`
      : `<br>
`
    : `
`
}
$e.text = function (e, t) {
  return tt(e[t].content)
}
$e.html_block = function (e, t) {
  return e[t].content
}
$e.html_inline = function (e, t) {
  return e[t].content
}
function St() {
  this.rules = Du({}, $e)
}
St.prototype.renderAttrs = function (t) {
  let u, n, i
  if (!t.attrs) return ''
  for (i = '', u = 0, n = t.attrs.length; u < n; u++)
    i += ' ' + tt(t.attrs[u][0]) + '="' + tt(t.attrs[u][1]) + '"'
  return i
}
St.prototype.renderToken = function (t, u, n) {
  const i = t[u]
  let r = ''
  if (i.hidden) return ''
  i.block &&
    i.nesting !== -1 &&
    u &&
    t[u - 1].hidden &&
    (r += `
`),
    (r += (i.nesting === -1 ? '</' : '<') + i.tag),
    (r += this.renderAttrs(i)),
    i.nesting === 0 && n.xhtmlOut && (r += ' /')
  let o = !1
  if (i.block && ((o = !0), i.nesting === 1 && u + 1 < t.length)) {
    const s = t[u + 1]
    ;(s.type === 'inline' ||
      s.hidden ||
      (s.nesting === -1 && s.tag === i.tag)) &&
      (o = !1)
  }
  return (
    (r += o
      ? `>
`
      : '>'),
    r
  )
}
St.prototype.renderInline = function (e, t, u) {
  let n = ''
  const i = this.rules
  for (let r = 0, o = e.length; r < o; r++) {
    const s = e[r].type
    typeof i[s] < 'u'
      ? (n += i[s](e, r, t, u, this))
      : (n += this.renderToken(e, r, t))
  }
  return n
}
St.prototype.renderInlineAsText = function (e, t, u) {
  let n = ''
  for (let i = 0, r = e.length; i < r; i++)
    switch (e[i].type) {
      case 'text':
        n += e[i].content
        break
      case 'image':
        n += this.renderInlineAsText(e[i].children, t, u)
        break
      case 'html_inline':
      case 'html_block':
        n += e[i].content
        break
      case 'softbreak':
      case 'hardbreak':
        n += `
`
        break
    }
  return n
}
St.prototype.render = function (e, t, u) {
  let n = ''
  const i = this.rules
  for (let r = 0, o = e.length; r < o; r++) {
    const s = e[r].type
    s === 'inline'
      ? (n += this.renderInline(e[r].children, t, u))
      : typeof i[s] < 'u'
        ? (n += i[s](e, r, t, u, this))
        : (n += this.renderToken(e, r, t, u))
  }
  return n
}
function he() {
  ;(this.__rules__ = []), (this.__cache__ = null)
}
he.prototype.__find__ = function (e) {
  for (let t = 0; t < this.__rules__.length; t++)
    if (this.__rules__[t].name === e) return t
  return -1
}
he.prototype.__compile__ = function () {
  const e = this,
    t = ['']
  e.__rules__.forEach(function (u) {
    u.enabled &&
      u.alt.forEach(function (n) {
        t.indexOf(n) < 0 && t.push(n)
      })
  }),
    (e.__cache__ = {}),
    t.forEach(function (u) {
      ;(e.__cache__[u] = []),
        e.__rules__.forEach(function (n) {
          n.enabled &&
            ((u && n.alt.indexOf(u) < 0) || e.__cache__[u].push(n.fn))
        })
    })
}
he.prototype.at = function (e, t, u) {
  const n = this.__find__(e),
    i = u || {}
  if (n === -1) throw new Error('Parser rule not found: ' + e)
  ;(this.__rules__[n].fn = t),
    (this.__rules__[n].alt = i.alt || []),
    (this.__cache__ = null)
}
he.prototype.before = function (e, t, u, n) {
  const i = this.__find__(e),
    r = n || {}
  if (i === -1) throw new Error('Parser rule not found: ' + e)
  this.__rules__.splice(i, 0, {
    name: t,
    enabled: !0,
    fn: u,
    alt: r.alt || [],
  }),
    (this.__cache__ = null)
}
he.prototype.after = function (e, t, u, n) {
  const i = this.__find__(e),
    r = n || {}
  if (i === -1) throw new Error('Parser rule not found: ' + e)
  this.__rules__.splice(i + 1, 0, {
    name: t,
    enabled: !0,
    fn: u,
    alt: r.alt || [],
  }),
    (this.__cache__ = null)
}
he.prototype.push = function (e, t, u) {
  const n = u || {}
  this.__rules__.push({ name: e, enabled: !0, fn: t, alt: n.alt || [] }),
    (this.__cache__ = null)
}
he.prototype.enable = function (e, t) {
  Array.isArray(e) || (e = [e])
  const u = []
  return (
    e.forEach(function (n) {
      const i = this.__find__(n)
      if (i < 0) {
        if (t) return
        throw new Error('Rules manager: invalid rule name ' + n)
      }
      ;(this.__rules__[i].enabled = !0), u.push(n)
    }, this),
    (this.__cache__ = null),
    u
  )
}
he.prototype.enableOnly = function (e, t) {
  Array.isArray(e) || (e = [e]),
    this.__rules__.forEach(function (u) {
      u.enabled = !1
    }),
    this.enable(e, t)
}
he.prototype.disable = function (e, t) {
  Array.isArray(e) || (e = [e])
  const u = []
  return (
    e.forEach(function (n) {
      const i = this.__find__(n)
      if (i < 0) {
        if (t) return
        throw new Error('Rules manager: invalid rule name ' + n)
      }
      ;(this.__rules__[i].enabled = !1), u.push(n)
    }, this),
    (this.__cache__ = null),
    u
  )
}
he.prototype.getRules = function (e) {
  return this.__cache__ === null && this.__compile__(), this.__cache__[e] || []
}
function Ie(e, t, u) {
  ;(this.type = e),
    (this.tag = t),
    (this.attrs = null),
    (this.map = null),
    (this.nesting = u),
    (this.level = 0),
    (this.children = null),
    (this.content = ''),
    (this.markup = ''),
    (this.info = ''),
    (this.meta = null),
    (this.block = !1),
    (this.hidden = !1)
}
Ie.prototype.attrIndex = function (t) {
  if (!this.attrs) return -1
  const u = this.attrs
  for (let n = 0, i = u.length; n < i; n++) if (u[n][0] === t) return n
  return -1
}
Ie.prototype.attrPush = function (t) {
  this.attrs ? this.attrs.push(t) : (this.attrs = [t])
}
Ie.prototype.attrSet = function (t, u) {
  const n = this.attrIndex(t),
    i = [t, u]
  n < 0 ? this.attrPush(i) : (this.attrs[n] = i)
}
Ie.prototype.attrGet = function (t) {
  const u = this.attrIndex(t)
  let n = null
  return u >= 0 && (n = this.attrs[u][1]), n
}
Ie.prototype.attrJoin = function (t, u) {
  const n = this.attrIndex(t)
  n < 0
    ? this.attrPush([t, u])
    : (this.attrs[n][1] = this.attrs[n][1] + ' ' + u)
}
function Vr(e, t, u) {
  ;(this.src = e),
    (this.env = u),
    (this.tokens = []),
    (this.inlineMode = !1),
    (this.md = t)
}
Vr.prototype.Token = Ie
const Ls = /\r\n?|\n/g,
  js = /\0/g
function Ms(e) {
  let t
  ;(t = e.src.replace(
    Ls,
    `
`,
  )),
    (t = t.replace(js, '�')),
    (e.src = t)
}
function Rs(e) {
  let t
  e.inlineMode
    ? ((t = new e.Token('inline', '', 0)),
      (t.content = e.src),
      (t.map = [0, 1]),
      (t.children = []),
      e.tokens.push(t))
    : e.md.block.parse(e.src, e.md, e.env, e.tokens)
}
function Os(e) {
  const t = e.tokens
  for (let u = 0, n = t.length; u < n; u++) {
    const i = t[u]
    i.type === 'inline' && e.md.inline.parse(i.content, e.md, e.env, i.children)
  }
}
function Bs(e) {
  return /^<a[>\s]/i.test(e)
}
function Ps(e) {
  return /^<\/a\s*>/i.test(e)
}
function $s(e) {
  const t = e.tokens
  if (e.md.options.linkify)
    for (let u = 0, n = t.length; u < n; u++) {
      if (t[u].type !== 'inline' || !e.md.linkify.pretest(t[u].content))
        continue
      let i = t[u].children,
        r = 0
      for (let o = i.length - 1; o >= 0; o--) {
        const s = i[o]
        if (s.type === 'link_close') {
          for (o--; i[o].level !== s.level && i[o].type !== 'link_open'; ) o--
          continue
        }
        if (
          (s.type === 'html_inline' &&
            (Bs(s.content) && r > 0 && r--, Ps(s.content) && r++),
          !(r > 0) && s.type === 'text' && e.md.linkify.test(s.content))
        ) {
          const a = s.content
          let c = e.md.linkify.match(a)
          const l = []
          let d = s.level,
            m = 0
          c.length > 0 &&
            c[0].index === 0 &&
            o > 0 &&
            i[o - 1].type === 'text_special' &&
            (c = c.slice(1))
          for (let p = 0; p < c.length; p++) {
            const h = c[p].url,
              _ = e.md.normalizeLink(h)
            if (!e.md.validateLink(_)) continue
            let b = c[p].text
            c[p].schema
              ? c[p].schema === 'mailto:' && !/^mailto:/i.test(b)
                ? (b = e.md
                    .normalizeLinkText('mailto:' + b)
                    .replace(/^mailto:/, ''))
                : (b = e.md.normalizeLinkText(b))
              : (b = e.md
                  .normalizeLinkText('http://' + b)
                  .replace(/^http:\/\//, ''))
            const g = c[p].index
            if (g > m) {
              const E = new e.Token('text', '', 0)
              ;(E.content = a.slice(m, g)), (E.level = d), l.push(E)
            }
            const x = new e.Token('link_open', 'a', 1)
            ;(x.attrs = [['href', _]]),
              (x.level = d++),
              (x.markup = 'linkify'),
              (x.info = 'auto'),
              l.push(x)
            const k = new e.Token('text', '', 0)
            ;(k.content = b), (k.level = d), l.push(k)
            const w = new e.Token('link_close', 'a', -1)
            ;(w.level = --d),
              (w.markup = 'linkify'),
              (w.info = 'auto'),
              l.push(w),
              (m = c[p].lastIndex)
          }
          if (m < a.length) {
            const p = new e.Token('text', '', 0)
            ;(p.content = a.slice(m)), (p.level = d), l.push(p)
          }
          t[u].children = i = Hr(i, o, l)
        }
      }
    }
}
const Wr = /\+-|\.\.|\?\?\?\?|!!!!|,,|--/,
  Ns = /\((c|tm|r)\)/i,
  qs = /\((c|tm|r)\)/gi,
  Hs = { c: '©', r: '®', tm: '™' }
function Us(e, t) {
  return Hs[t.toLowerCase()]
}
function Vs(e) {
  let t = 0
  for (let u = e.length - 1; u >= 0; u--) {
    const n = e[u]
    n.type === 'text' && !t && (n.content = n.content.replace(qs, Us)),
      n.type === 'link_open' && n.info === 'auto' && t--,
      n.type === 'link_close' && n.info === 'auto' && t++
  }
}
function Ws(e) {
  let t = 0
  for (let u = e.length - 1; u >= 0; u--) {
    const n = e[u]
    n.type === 'text' &&
      !t &&
      Wr.test(n.content) &&
      (n.content = n.content
        .replace(/\+-/g, '±')
        .replace(/\.{2,}/g, '…')
        .replace(/([?!])…/g, '$1..')
        .replace(/([?!]){4,}/g, '$1$1$1')
        .replace(/,{2,}/g, ',')
        .replace(/(^|[^-])---(?=[^-]|$)/gm, '$1—')
        .replace(/(^|\s)--(?=\s|$)/gm, '$1–')
        .replace(/(^|[^-\s])--(?=[^-\s]|$)/gm, '$1–')),
      n.type === 'link_open' && n.info === 'auto' && t--,
      n.type === 'link_close' && n.info === 'auto' && t++
  }
}
function Gs(e) {
  let t
  if (e.md.options.typographer)
    for (t = e.tokens.length - 1; t >= 0; t--)
      e.tokens[t].type === 'inline' &&
        (Ns.test(e.tokens[t].content) && Vs(e.tokens[t].children),
        Wr.test(e.tokens[t].content) && Ws(e.tokens[t].children))
}
const Zs = /['"]/,
  rr = /['"]/g,
  ir = '’'
function eu(e, t, u) {
  return e.slice(0, t) + u + e.slice(t + 1)
}
function Ks(e, t) {
  let u
  const n = []
  for (let i = 0; i < e.length; i++) {
    const r = e[i],
      o = e[i].level
    for (u = n.length - 1; u >= 0 && !(n[u].level <= o); u--);
    if (((n.length = u + 1), r.type !== 'text')) continue
    let s = r.content,
      a = 0,
      c = s.length
    e: for (; a < c; ) {
      rr.lastIndex = a
      const l = rr.exec(s)
      if (!l) break
      let d = !0,
        m = !0
      a = l.index + 1
      const p = l[0] === "'"
      let h = 32
      if (l.index - 1 >= 0) h = s.charCodeAt(l.index - 1)
      else
        for (
          u = i - 1;
          u >= 0 && !(e[u].type === 'softbreak' || e[u].type === 'hardbreak');
          u--
        )
          if (e[u].content) {
            h = e[u].content.charCodeAt(e[u].content.length - 1)
            break
          }
      let _ = 32
      if (a < c) _ = s.charCodeAt(a)
      else
        for (
          u = i + 1;
          u < e.length &&
          !(e[u].type === 'softbreak' || e[u].type === 'hardbreak');
          u++
        )
          if (e[u].content) {
            _ = e[u].content.charCodeAt(0)
            break
          }
      const b = $t(h) || Pt(String.fromCharCode(h)),
        g = $t(_) || Pt(String.fromCharCode(_)),
        x = Bt(h),
        k = Bt(_)
      if (
        (k ? (d = !1) : g && (x || b || (d = !1)),
        x ? (m = !1) : b && (k || g || (m = !1)),
        _ === 34 && l[0] === '"' && h >= 48 && h <= 57 && (m = d = !1),
        d && m && ((d = b), (m = g)),
        !d && !m)
      ) {
        p && (r.content = eu(r.content, l.index, ir))
        continue
      }
      if (m)
        for (u = n.length - 1; u >= 0; u--) {
          let w = n[u]
          if (n[u].level < o) break
          if (w.single === p && n[u].level === o) {
            w = n[u]
            let E, C
            p
              ? ((E = t.md.options.quotes[2]), (C = t.md.options.quotes[3]))
              : ((E = t.md.options.quotes[0]), (C = t.md.options.quotes[1])),
              (r.content = eu(r.content, l.index, C)),
              (e[w.token].content = eu(e[w.token].content, w.pos, E)),
              (a += C.length - 1),
              w.token === i && (a += E.length - 1),
              (s = r.content),
              (c = s.length),
              (n.length = u)
            continue e
          }
        }
      d
        ? n.push({ token: i, pos: l.index, single: p, level: o })
        : m && p && (r.content = eu(r.content, l.index, ir))
    }
  }
}
function Xs(e) {
  if (e.md.options.typographer)
    for (let t = e.tokens.length - 1; t >= 0; t--)
      e.tokens[t].type !== 'inline' ||
        !Zs.test(e.tokens[t].content) ||
        Ks(e.tokens[t].children, e)
}
function Qs(e) {
  let t, u
  const n = e.tokens,
    i = n.length
  for (let r = 0; r < i; r++) {
    if (n[r].type !== 'inline') continue
    const o = n[r].children,
      s = o.length
    for (t = 0; t < s; t++) o[t].type === 'text_special' && (o[t].type = 'text')
    for (t = u = 0; t < s; t++)
      o[t].type === 'text' && t + 1 < s && o[t + 1].type === 'text'
        ? (o[t + 1].content = o[t].content + o[t + 1].content)
        : (t !== u && (o[u] = o[t]), u++)
    t !== u && (o.length = u)
  }
}
const qu = [
  ['normalize', Ms],
  ['block', Rs],
  ['inline', Os],
  ['linkify', $s],
  ['replacements', Gs],
  ['smartquotes', Xs],
  ['text_join', Qs],
]
function Sn() {
  this.ruler = new he()
  for (let e = 0; e < qu.length; e++) this.ruler.push(qu[e][0], qu[e][1])
}
Sn.prototype.process = function (e) {
  const t = this.ruler.getRules('')
  for (let u = 0, n = t.length; u < n; u++) t[u](e)
}
Sn.prototype.State = Vr
function Ne(e, t, u, n) {
  ;(this.src = e),
    (this.md = t),
    (this.env = u),
    (this.tokens = n),
    (this.bMarks = []),
    (this.eMarks = []),
    (this.tShift = []),
    (this.sCount = []),
    (this.bsCount = []),
    (this.blkIndent = 0),
    (this.line = 0),
    (this.lineMax = 0),
    (this.tight = !1),
    (this.ddIndent = -1),
    (this.listIndent = -1),
    (this.parentType = 'root'),
    (this.level = 0)
  const i = this.src
  for (let r = 0, o = 0, s = 0, a = 0, c = i.length, l = !1; o < c; o++) {
    const d = i.charCodeAt(o)
    if (!l)
      if (V(d)) {
        s++, d === 9 ? (a += 4 - (a % 4)) : a++
        continue
      } else l = !0
    ;(d === 10 || o === c - 1) &&
      (d !== 10 && o++,
      this.bMarks.push(r),
      this.eMarks.push(o),
      this.tShift.push(s),
      this.sCount.push(a),
      this.bsCount.push(0),
      (l = !1),
      (s = 0),
      (a = 0),
      (r = o + 1))
  }
  this.bMarks.push(i.length),
    this.eMarks.push(i.length),
    this.tShift.push(0),
    this.sCount.push(0),
    this.bsCount.push(0),
    (this.lineMax = this.bMarks.length - 1)
}
Ne.prototype.push = function (e, t, u) {
  const n = new Ie(e, t, u)
  return (
    (n.block = !0),
    u < 0 && this.level--,
    (n.level = this.level),
    u > 0 && this.level++,
    this.tokens.push(n),
    n
  )
}
Ne.prototype.isEmpty = function (t) {
  return this.bMarks[t] + this.tShift[t] >= this.eMarks[t]
}
Ne.prototype.skipEmptyLines = function (t) {
  for (
    let u = this.lineMax;
    t < u && !(this.bMarks[t] + this.tShift[t] < this.eMarks[t]);
    t++
  );
  return t
}
Ne.prototype.skipSpaces = function (t) {
  for (let u = this.src.length; t < u; t++) {
    const n = this.src.charCodeAt(t)
    if (!V(n)) break
  }
  return t
}
Ne.prototype.skipSpacesBack = function (t, u) {
  if (t <= u) return t
  for (; t > u; ) if (!V(this.src.charCodeAt(--t))) return t + 1
  return t
}
Ne.prototype.skipChars = function (t, u) {
  for (let n = this.src.length; t < n && this.src.charCodeAt(t) === u; t++);
  return t
}
Ne.prototype.skipCharsBack = function (t, u, n) {
  if (t <= n) return t
  for (; t > n; ) if (u !== this.src.charCodeAt(--t)) return t + 1
  return t
}
Ne.prototype.getLines = function (t, u, n, i) {
  if (t >= u) return ''
  const r = new Array(u - t)
  for (let o = 0, s = t; s < u; s++, o++) {
    let a = 0
    const c = this.bMarks[s]
    let l = c,
      d
    for (
      s + 1 < u || i ? (d = this.eMarks[s] + 1) : (d = this.eMarks[s]);
      l < d && a < n;

    ) {
      const m = this.src.charCodeAt(l)
      if (V(m)) m === 9 ? (a += 4 - ((a + this.bsCount[s]) % 4)) : a++
      else if (l - c < this.tShift[s]) a++
      else break
      l++
    }
    a > n
      ? (r[o] = new Array(a - n + 1).join(' ') + this.src.slice(l, d))
      : (r[o] = this.src.slice(l, d))
  }
  return r.join('')
}
Ne.prototype.Token = Ie
const Ys = 65536
function Hu(e, t) {
  const u = e.bMarks[t] + e.tShift[t],
    n = e.eMarks[t]
  return e.src.slice(u, n)
}
function or(e) {
  const t = [],
    u = e.length
  let n = 0,
    i = e.charCodeAt(n),
    r = !1,
    o = 0,
    s = ''
  for (; n < u; )
    i === 124 &&
      (r
        ? ((s += e.substring(o, n - 1)), (o = n))
        : (t.push(s + e.substring(o, n)), (s = ''), (o = n + 1))),
      (r = i === 92),
      n++,
      (i = e.charCodeAt(n))
  return t.push(s + e.substring(o)), t
}
function Js(e, t, u, n) {
  if (t + 2 > u) return !1
  let i = t + 1
  if (e.sCount[i] < e.blkIndent || e.sCount[i] - e.blkIndent >= 4) return !1
  let r = e.bMarks[i] + e.tShift[i]
  if (r >= e.eMarks[i]) return !1
  const o = e.src.charCodeAt(r++)
  if ((o !== 124 && o !== 45 && o !== 58) || r >= e.eMarks[i]) return !1
  const s = e.src.charCodeAt(r++)
  if ((s !== 124 && s !== 45 && s !== 58 && !V(s)) || (o === 45 && V(s)))
    return !1
  for (; r < e.eMarks[i]; ) {
    const w = e.src.charCodeAt(r)
    if (w !== 124 && w !== 45 && w !== 58 && !V(w)) return !1
    r++
  }
  let a = Hu(e, t + 1),
    c = a.split('|')
  const l = []
  for (let w = 0; w < c.length; w++) {
    const E = c[w].trim()
    if (!E) {
      if (w === 0 || w === c.length - 1) continue
      return !1
    }
    if (!/^:?-+:?$/.test(E)) return !1
    E.charCodeAt(E.length - 1) === 58
      ? l.push(E.charCodeAt(0) === 58 ? 'center' : 'right')
      : E.charCodeAt(0) === 58
        ? l.push('left')
        : l.push('')
  }
  if (
    ((a = Hu(e, t).trim()),
    a.indexOf('|') === -1 || e.sCount[t] - e.blkIndent >= 4)
  )
    return !1
  ;(c = or(a)),
    c.length && c[0] === '' && c.shift(),
    c.length && c[c.length - 1] === '' && c.pop()
  const d = c.length
  if (d === 0 || d !== l.length) return !1
  if (n) return !0
  const m = e.parentType
  e.parentType = 'table'
  const p = e.md.block.ruler.getRules('blockquote'),
    h = e.push('table_open', 'table', 1),
    _ = [t, 0]
  h.map = _
  const b = e.push('thead_open', 'thead', 1)
  b.map = [t, t + 1]
  const g = e.push('tr_open', 'tr', 1)
  g.map = [t, t + 1]
  for (let w = 0; w < c.length; w++) {
    const E = e.push('th_open', 'th', 1)
    l[w] && (E.attrs = [['style', 'text-align:' + l[w]]])
    const C = e.push('inline', '', 0)
    ;(C.content = c[w].trim()), (C.children = []), e.push('th_close', 'th', -1)
  }
  e.push('tr_close', 'tr', -1), e.push('thead_close', 'thead', -1)
  let x,
    k = 0
  for (i = t + 2; i < u && !(e.sCount[i] < e.blkIndent); i++) {
    let w = !1
    for (let C = 0, D = p.length; C < D; C++)
      if (p[C](e, i, u, !0)) {
        w = !0
        break
      }
    if (
      w ||
      ((a = Hu(e, i).trim()), !a) ||
      e.sCount[i] - e.blkIndent >= 4 ||
      ((c = or(a)),
      c.length && c[0] === '' && c.shift(),
      c.length && c[c.length - 1] === '' && c.pop(),
      (k += d - c.length),
      k > Ys)
    )
      break
    if (i === t + 2) {
      const C = e.push('tbody_open', 'tbody', 1)
      C.map = x = [t + 2, 0]
    }
    const E = e.push('tr_open', 'tr', 1)
    E.map = [i, i + 1]
    for (let C = 0; C < d; C++) {
      const D = e.push('td_open', 'td', 1)
      l[C] && (D.attrs = [['style', 'text-align:' + l[C]]])
      const v = e.push('inline', '', 0)
      ;(v.content = c[C] ? c[C].trim() : ''),
        (v.children = []),
        e.push('td_close', 'td', -1)
    }
    e.push('tr_close', 'tr', -1)
  }
  return (
    x && (e.push('tbody_close', 'tbody', -1), (x[1] = i)),
    e.push('table_close', 'table', -1),
    (_[1] = i),
    (e.parentType = m),
    (e.line = i),
    !0
  )
}
function ea(e, t, u) {
  if (e.sCount[t] - e.blkIndent < 4) return !1
  let n = t + 1,
    i = n
  for (; n < u; ) {
    if (e.isEmpty(n)) {
      n++
      continue
    }
    if (e.sCount[n] - e.blkIndent >= 4) {
      n++, (i = n)
      continue
    }
    break
  }
  e.line = i
  const r = e.push('code_block', 'code', 0)
  return (
    (r.content =
      e.getLines(t, i, 4 + e.blkIndent, !1) +
      `
`),
    (r.map = [t, e.line]),
    !0
  )
}
function ta(e, t, u, n) {
  let i = e.bMarks[t] + e.tShift[t],
    r = e.eMarks[t]
  if (e.sCount[t] - e.blkIndent >= 4 || i + 3 > r) return !1
  const o = e.src.charCodeAt(i)
  if (o !== 126 && o !== 96) return !1
  let s = i
  i = e.skipChars(i, o)
  let a = i - s
  if (a < 3) return !1
  const c = e.src.slice(s, i),
    l = e.src.slice(i, r)
  if (o === 96 && l.indexOf(String.fromCharCode(o)) >= 0) return !1
  if (n) return !0
  let d = t,
    m = !1
  for (
    ;
    d++,
      !(
        d >= u ||
        ((i = s = e.bMarks[d] + e.tShift[d]),
        (r = e.eMarks[d]),
        i < r && e.sCount[d] < e.blkIndent)
      );

  )
    if (
      e.src.charCodeAt(i) === o &&
      !(e.sCount[d] - e.blkIndent >= 4) &&
      ((i = e.skipChars(i, o)),
      !(i - s < a) && ((i = e.skipSpaces(i)), !(i < r)))
    ) {
      m = !0
      break
    }
  ;(a = e.sCount[t]), (e.line = d + (m ? 1 : 0))
  const p = e.push('fence', 'code', 0)
  return (
    (p.info = l),
    (p.content = e.getLines(t + 1, d, a, !0)),
    (p.markup = c),
    (p.map = [t, e.line]),
    !0
  )
}
function ua(e, t, u, n) {
  let i = e.bMarks[t] + e.tShift[t],
    r = e.eMarks[t]
  const o = e.lineMax
  if (e.sCount[t] - e.blkIndent >= 4 || e.src.charCodeAt(i) !== 62) return !1
  if (n) return !0
  const s = [],
    a = [],
    c = [],
    l = [],
    d = e.md.block.ruler.getRules('blockquote'),
    m = e.parentType
  e.parentType = 'blockquote'
  let p = !1,
    h
  for (h = t; h < u; h++) {
    const k = e.sCount[h] < e.blkIndent
    if (((i = e.bMarks[h] + e.tShift[h]), (r = e.eMarks[h]), i >= r)) break
    if (e.src.charCodeAt(i++) === 62 && !k) {
      let E = e.sCount[h] + 1,
        C,
        D
      e.src.charCodeAt(i) === 32
        ? (i++, E++, (D = !1), (C = !0))
        : e.src.charCodeAt(i) === 9
          ? ((C = !0),
            (e.bsCount[h] + E) % 4 === 3 ? (i++, E++, (D = !1)) : (D = !0))
          : (C = !1)
      let v = E
      for (s.push(e.bMarks[h]), e.bMarks[h] = i; i < r; ) {
        const H = e.src.charCodeAt(i)
        if (V(H))
          H === 9 ? (v += 4 - ((v + e.bsCount[h] + (D ? 1 : 0)) % 4)) : v++
        else break
        i++
      }
      ;(p = i >= r),
        a.push(e.bsCount[h]),
        (e.bsCount[h] = e.sCount[h] + 1 + (C ? 1 : 0)),
        c.push(e.sCount[h]),
        (e.sCount[h] = v - E),
        l.push(e.tShift[h]),
        (e.tShift[h] = i - e.bMarks[h])
      continue
    }
    if (p) break
    let w = !1
    for (let E = 0, C = d.length; E < C; E++)
      if (d[E](e, h, u, !0)) {
        w = !0
        break
      }
    if (w) {
      ;(e.lineMax = h),
        e.blkIndent !== 0 &&
          (s.push(e.bMarks[h]),
          a.push(e.bsCount[h]),
          l.push(e.tShift[h]),
          c.push(e.sCount[h]),
          (e.sCount[h] -= e.blkIndent))
      break
    }
    s.push(e.bMarks[h]),
      a.push(e.bsCount[h]),
      l.push(e.tShift[h]),
      c.push(e.sCount[h]),
      (e.sCount[h] = -1)
  }
  const _ = e.blkIndent
  e.blkIndent = 0
  const b = e.push('blockquote_open', 'blockquote', 1)
  b.markup = '>'
  const g = [t, 0]
  ;(b.map = g), e.md.block.tokenize(e, t, h)
  const x = e.push('blockquote_close', 'blockquote', -1)
  ;(x.markup = '>'), (e.lineMax = o), (e.parentType = m), (g[1] = e.line)
  for (let k = 0; k < l.length; k++)
    (e.bMarks[k + t] = s[k]),
      (e.tShift[k + t] = l[k]),
      (e.sCount[k + t] = c[k]),
      (e.bsCount[k + t] = a[k])
  return (e.blkIndent = _), !0
}
function na(e, t, u, n) {
  const i = e.eMarks[t]
  if (e.sCount[t] - e.blkIndent >= 4) return !1
  let r = e.bMarks[t] + e.tShift[t]
  const o = e.src.charCodeAt(r++)
  if (o !== 42 && o !== 45 && o !== 95) return !1
  let s = 1
  for (; r < i; ) {
    const c = e.src.charCodeAt(r++)
    if (c !== o && !V(c)) return !1
    c === o && s++
  }
  if (s < 3) return !1
  if (n) return !0
  e.line = t + 1
  const a = e.push('hr', 'hr', 0)
  return (
    (a.map = [t, e.line]),
    (a.markup = Array(s + 1).join(String.fromCharCode(o))),
    !0
  )
}
function sr(e, t) {
  const u = e.eMarks[t]
  let n = e.bMarks[t] + e.tShift[t]
  const i = e.src.charCodeAt(n++)
  if (i !== 42 && i !== 45 && i !== 43) return -1
  if (n < u) {
    const r = e.src.charCodeAt(n)
    if (!V(r)) return -1
  }
  return n
}
function ar(e, t) {
  const u = e.bMarks[t] + e.tShift[t],
    n = e.eMarks[t]
  let i = u
  if (i + 1 >= n) return -1
  let r = e.src.charCodeAt(i++)
  if (r < 48 || r > 57) return -1
  for (;;) {
    if (i >= n) return -1
    if (((r = e.src.charCodeAt(i++)), r >= 48 && r <= 57)) {
      if (i - u >= 10) return -1
      continue
    }
    if (r === 41 || r === 46) break
    return -1
  }
  return i < n && ((r = e.src.charCodeAt(i)), !V(r)) ? -1 : i
}
function ra(e, t) {
  const u = e.level + 2
  for (let n = t + 2, i = e.tokens.length - 2; n < i; n++)
    e.tokens[n].level === u &&
      e.tokens[n].type === 'paragraph_open' &&
      ((e.tokens[n + 2].hidden = !0), (e.tokens[n].hidden = !0), (n += 2))
}
function ia(e, t, u, n) {
  let i,
    r,
    o,
    s,
    a = t,
    c = !0
  if (
    e.sCount[a] - e.blkIndent >= 4 ||
    (e.listIndent >= 0 &&
      e.sCount[a] - e.listIndent >= 4 &&
      e.sCount[a] < e.blkIndent)
  )
    return !1
  let l = !1
  n && e.parentType === 'paragraph' && e.sCount[a] >= e.blkIndent && (l = !0)
  let d, m, p
  if ((p = ar(e, a)) >= 0) {
    if (
      ((d = !0),
      (o = e.bMarks[a] + e.tShift[a]),
      (m = Number(e.src.slice(o, p - 1))),
      l && m !== 1)
    )
      return !1
  } else if ((p = sr(e, a)) >= 0) d = !1
  else return !1
  if (l && e.skipSpaces(p) >= e.eMarks[a]) return !1
  if (n) return !0
  const h = e.src.charCodeAt(p - 1),
    _ = e.tokens.length
  d
    ? ((s = e.push('ordered_list_open', 'ol', 1)),
      m !== 1 && (s.attrs = [['start', m]]))
    : (s = e.push('bullet_list_open', 'ul', 1))
  const b = [a, 0]
  ;(s.map = b), (s.markup = String.fromCharCode(h))
  let g = !1
  const x = e.md.block.ruler.getRules('list'),
    k = e.parentType
  for (e.parentType = 'list'; a < u; ) {
    ;(r = p), (i = e.eMarks[a])
    const w = e.sCount[a] + p - (e.bMarks[a] + e.tShift[a])
    let E = w
    for (; r < i; ) {
      const N = e.src.charCodeAt(r)
      if (N === 9) E += 4 - ((E + e.bsCount[a]) % 4)
      else if (N === 32) E++
      else break
      r++
    }
    const C = r
    let D
    C >= i ? (D = 1) : (D = E - w), D > 4 && (D = 1)
    const v = w + D
    ;(s = e.push('list_item_open', 'li', 1)),
      (s.markup = String.fromCharCode(h))
    const H = [a, 0]
    ;(s.map = H), d && (s.info = e.src.slice(o, p - 1))
    const R = e.tight,
      $ = e.tShift[a],
      I = e.sCount[a],
      M = e.listIndent
    if (
      ((e.listIndent = e.blkIndent),
      (e.blkIndent = v),
      (e.tight = !0),
      (e.tShift[a] = C - e.bMarks[a]),
      (e.sCount[a] = E),
      C >= i && e.isEmpty(a + 1)
        ? (e.line = Math.min(e.line + 2, u))
        : e.md.block.tokenize(e, a, u, !0),
      (!e.tight || g) && (c = !1),
      (g = e.line - a > 1 && e.isEmpty(e.line - 1)),
      (e.blkIndent = e.listIndent),
      (e.listIndent = M),
      (e.tShift[a] = $),
      (e.sCount[a] = I),
      (e.tight = R),
      (s = e.push('list_item_close', 'li', -1)),
      (s.markup = String.fromCharCode(h)),
      (a = e.line),
      (H[1] = a),
      a >= u || e.sCount[a] < e.blkIndent || e.sCount[a] - e.blkIndent >= 4)
    )
      break
    let q = !1
    for (let N = 0, O = x.length; N < O; N++)
      if (x[N](e, a, u, !0)) {
        q = !0
        break
      }
    if (q) break
    if (d) {
      if (((p = ar(e, a)), p < 0)) break
      o = e.bMarks[a] + e.tShift[a]
    } else if (((p = sr(e, a)), p < 0)) break
    if (h !== e.src.charCodeAt(p - 1)) break
  }
  return (
    d
      ? (s = e.push('ordered_list_close', 'ol', -1))
      : (s = e.push('bullet_list_close', 'ul', -1)),
    (s.markup = String.fromCharCode(h)),
    (b[1] = a),
    (e.line = a),
    (e.parentType = k),
    c && ra(e, _),
    !0
  )
}
function oa(e, t, u, n) {
  let i = e.bMarks[t] + e.tShift[t],
    r = e.eMarks[t],
    o = t + 1
  if (e.sCount[t] - e.blkIndent >= 4 || e.src.charCodeAt(i) !== 91) return !1
  function s(x) {
    const k = e.lineMax
    if (x >= k || e.isEmpty(x)) return null
    let w = !1
    if (
      (e.sCount[x] - e.blkIndent > 3 && (w = !0),
      e.sCount[x] < 0 && (w = !0),
      !w)
    ) {
      const D = e.md.block.ruler.getRules('reference'),
        v = e.parentType
      e.parentType = 'reference'
      let H = !1
      for (let R = 0, $ = D.length; R < $; R++)
        if (D[R](e, x, k, !0)) {
          H = !0
          break
        }
      if (((e.parentType = v), H)) return null
    }
    const E = e.bMarks[x] + e.tShift[x],
      C = e.eMarks[x]
    return e.src.slice(E, C + 1)
  }
  let a = e.src.slice(i, r + 1)
  r = a.length
  let c = -1
  for (i = 1; i < r; i++) {
    const x = a.charCodeAt(i)
    if (x === 91) return !1
    if (x === 93) {
      c = i
      break
    } else if (x === 10) {
      const k = s(o)
      k !== null && ((a += k), (r = a.length), o++)
    } else if (x === 92 && (i++, i < r && a.charCodeAt(i) === 10)) {
      const k = s(o)
      k !== null && ((a += k), (r = a.length), o++)
    }
  }
  if (c < 0 || a.charCodeAt(c + 1) !== 58) return !1
  for (i = c + 2; i < r; i++) {
    const x = a.charCodeAt(i)
    if (x === 10) {
      const k = s(o)
      k !== null && ((a += k), (r = a.length), o++)
    } else if (!V(x)) break
  }
  const l = e.md.helpers.parseLinkDestination(a, i, r)
  if (!l.ok) return !1
  const d = e.md.normalizeLink(l.str)
  if (!e.md.validateLink(d)) return !1
  i = l.pos
  const m = i,
    p = o,
    h = i
  for (; i < r; i++) {
    const x = a.charCodeAt(i)
    if (x === 10) {
      const k = s(o)
      k !== null && ((a += k), (r = a.length), o++)
    } else if (!V(x)) break
  }
  let _ = e.md.helpers.parseLinkTitle(a, i, r)
  for (; _.can_continue; ) {
    const x = s(o)
    if (x === null) break
    ;(a += x),
      (i = r),
      (r = a.length),
      o++,
      (_ = e.md.helpers.parseLinkTitle(a, i, r, _))
  }
  let b
  for (
    i < r && h !== i && _.ok
      ? ((b = _.str), (i = _.pos))
      : ((b = ''), (i = m), (o = p));
    i < r;

  ) {
    const x = a.charCodeAt(i)
    if (!V(x)) break
    i++
  }
  if (i < r && a.charCodeAt(i) !== 10 && b)
    for (b = '', i = m, o = p; i < r; ) {
      const x = a.charCodeAt(i)
      if (!V(x)) break
      i++
    }
  if (i < r && a.charCodeAt(i) !== 10) return !1
  const g = Fu(a.slice(1, c))
  return g
    ? (n ||
        (typeof e.env.references > 'u' && (e.env.references = {}),
        typeof e.env.references[g] > 'u' &&
          (e.env.references[g] = { title: b, href: d }),
        (e.line = o)),
      !0)
    : !1
}
const sa = [
    'address',
    'article',
    'aside',
    'base',
    'basefont',
    'blockquote',
    'body',
    'caption',
    'center',
    'col',
    'colgroup',
    'dd',
    'details',
    'dialog',
    'dir',
    'div',
    'dl',
    'dt',
    'fieldset',
    'figcaption',
    'figure',
    'footer',
    'form',
    'frame',
    'frameset',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'head',
    'header',
    'hr',
    'html',
    'iframe',
    'legend',
    'li',
    'link',
    'main',
    'menu',
    'menuitem',
    'nav',
    'noframes',
    'ol',
    'optgroup',
    'option',
    'p',
    'param',
    'search',
    'section',
    'summary',
    'table',
    'tbody',
    'td',
    'tfoot',
    'th',
    'thead',
    'title',
    'tr',
    'track',
    'ul',
  ],
  aa = '[a-zA-Z_:][a-zA-Z0-9:._-]*',
  ca = '[^"\'=<>`\\x00-\\x20]+',
  la = "'[^']*'",
  da = '"[^"]*"',
  fa = '(?:' + ca + '|' + la + '|' + da + ')',
  ha = '(?:\\s+' + aa + '(?:\\s*=\\s*' + fa + ')?)',
  Gr = '<[A-Za-z][A-Za-z0-9\\-]*' + ha + '*\\s*\\/?>',
  Zr = '<\\/[A-Za-z][A-Za-z0-9\\-]*\\s*>',
  pa = '<!---?>|<!--(?:[^-]|-[^-]|--[^>])*-->',
  ma = '<[?][\\s\\S]*?[?]>',
  ba = '<![A-Za-z][^>]*>',
  ga = '<!\\[CDATA\\[[\\s\\S]*?\\]\\]>',
  xa = new RegExp(
    '^(?:' + Gr + '|' + Zr + '|' + pa + '|' + ma + '|' + ba + '|' + ga + ')',
  ),
  _a = new RegExp('^(?:' + Gr + '|' + Zr + ')'),
  gt = [
    [
      /^<(script|pre|style|textarea)(?=(\s|>|$))/i,
      /<\/(script|pre|style|textarea)>/i,
      !0,
    ],
    [/^<!--/, /-->/, !0],
    [/^<\?/, /\?>/, !0],
    [/^<![A-Z]/, />/, !0],
    [/^<!\[CDATA\[/, /\]\]>/, !0],
    [new RegExp('^</?(' + sa.join('|') + ')(?=(\\s|/?>|$))', 'i'), /^$/, !0],
    [new RegExp(_a.source + '\\s*$'), /^$/, !1],
  ]
function ka(e, t, u, n) {
  let i = e.bMarks[t] + e.tShift[t],
    r = e.eMarks[t]
  if (
    e.sCount[t] - e.blkIndent >= 4 ||
    !e.md.options.html ||
    e.src.charCodeAt(i) !== 60
  )
    return !1
  let o = e.src.slice(i, r),
    s = 0
  for (; s < gt.length && !gt[s][0].test(o); s++);
  if (s === gt.length) return !1
  if (n) return gt[s][2]
  let a = t + 1
  if (!gt[s][1].test(o)) {
    for (; a < u && !(e.sCount[a] < e.blkIndent); a++)
      if (
        ((i = e.bMarks[a] + e.tShift[a]),
        (r = e.eMarks[a]),
        (o = e.src.slice(i, r)),
        gt[s][1].test(o))
      ) {
        o.length !== 0 && a++
        break
      }
  }
  e.line = a
  const c = e.push('html_block', '', 0)
  return (c.map = [t, a]), (c.content = e.getLines(t, a, e.blkIndent, !0)), !0
}
function ya(e, t, u, n) {
  let i = e.bMarks[t] + e.tShift[t],
    r = e.eMarks[t]
  if (e.sCount[t] - e.blkIndent >= 4) return !1
  let o = e.src.charCodeAt(i)
  if (o !== 35 || i >= r) return !1
  let s = 1
  for (o = e.src.charCodeAt(++i); o === 35 && i < r && s <= 6; )
    s++, (o = e.src.charCodeAt(++i))
  if (s > 6 || (i < r && !V(o))) return !1
  if (n) return !0
  r = e.skipSpacesBack(r, i)
  const a = e.skipCharsBack(r, 35, i)
  a > i && V(e.src.charCodeAt(a - 1)) && (r = a), (e.line = t + 1)
  const c = e.push('heading_open', 'h' + String(s), 1)
  ;(c.markup = '########'.slice(0, s)), (c.map = [t, e.line])
  const l = e.push('inline', '', 0)
  ;(l.content = e.src.slice(i, r).trim()),
    (l.map = [t, e.line]),
    (l.children = [])
  const d = e.push('heading_close', 'h' + String(s), -1)
  return (d.markup = '########'.slice(0, s)), !0
}
function va(e, t, u) {
  const n = e.md.block.ruler.getRules('paragraph')
  if (e.sCount[t] - e.blkIndent >= 4) return !1
  const i = e.parentType
  e.parentType = 'paragraph'
  let r = 0,
    o,
    s = t + 1
  for (; s < u && !e.isEmpty(s); s++) {
    if (e.sCount[s] - e.blkIndent > 3) continue
    if (e.sCount[s] >= e.blkIndent) {
      let p = e.bMarks[s] + e.tShift[s]
      const h = e.eMarks[s]
      if (
        p < h &&
        ((o = e.src.charCodeAt(p)),
        (o === 45 || o === 61) &&
          ((p = e.skipChars(p, o)), (p = e.skipSpaces(p)), p >= h))
      ) {
        r = o === 61 ? 1 : 2
        break
      }
    }
    if (e.sCount[s] < 0) continue
    let m = !1
    for (let p = 0, h = n.length; p < h; p++)
      if (n[p](e, s, u, !0)) {
        m = !0
        break
      }
    if (m) break
  }
  if (!r) return !1
  const a = e.getLines(t, s, e.blkIndent, !1).trim()
  e.line = s + 1
  const c = e.push('heading_open', 'h' + String(r), 1)
  ;(c.markup = String.fromCharCode(o)), (c.map = [t, e.line])
  const l = e.push('inline', '', 0)
  ;(l.content = a), (l.map = [t, e.line - 1]), (l.children = [])
  const d = e.push('heading_close', 'h' + String(r), -1)
  return (d.markup = String.fromCharCode(o)), (e.parentType = i), !0
}
function wa(e, t, u) {
  const n = e.md.block.ruler.getRules('paragraph'),
    i = e.parentType
  let r = t + 1
  for (e.parentType = 'paragraph'; r < u && !e.isEmpty(r); r++) {
    if (e.sCount[r] - e.blkIndent > 3 || e.sCount[r] < 0) continue
    let c = !1
    for (let l = 0, d = n.length; l < d; l++)
      if (n[l](e, r, u, !0)) {
        c = !0
        break
      }
    if (c) break
  }
  const o = e.getLines(t, r, e.blkIndent, !1).trim()
  e.line = r
  const s = e.push('paragraph_open', 'p', 1)
  s.map = [t, e.line]
  const a = e.push('inline', '', 0)
  return (
    (a.content = o),
    (a.map = [t, e.line]),
    (a.children = []),
    e.push('paragraph_close', 'p', -1),
    (e.parentType = i),
    !0
  )
}
const tu = [
  ['table', Js, ['paragraph', 'reference']],
  ['code', ea],
  ['fence', ta, ['paragraph', 'reference', 'blockquote', 'list']],
  ['blockquote', ua, ['paragraph', 'reference', 'blockquote', 'list']],
  ['hr', na, ['paragraph', 'reference', 'blockquote', 'list']],
  ['list', ia, ['paragraph', 'reference', 'blockquote']],
  ['reference', oa],
  ['html_block', ka, ['paragraph', 'reference', 'blockquote']],
  ['heading', ya, ['paragraph', 'reference', 'blockquote']],
  ['lheading', va],
  ['paragraph', wa],
]
function Su() {
  this.ruler = new he()
  for (let e = 0; e < tu.length; e++)
    this.ruler.push(tu[e][0], tu[e][1], { alt: (tu[e][2] || []).slice() })
}
Su.prototype.tokenize = function (e, t, u) {
  const n = this.ruler.getRules(''),
    i = n.length,
    r = e.md.options.maxNesting
  let o = t,
    s = !1
  for (
    ;
    o < u &&
    ((e.line = o = e.skipEmptyLines(o)),
    !(o >= u || e.sCount[o] < e.blkIndent));

  ) {
    if (e.level >= r) {
      e.line = u
      break
    }
    const a = e.line
    let c = !1
    for (let l = 0; l < i; l++)
      if (((c = n[l](e, o, u, !1)), c)) {
        if (a >= e.line)
          throw new Error("block rule didn't increment state.line")
        break
      }
    if (!c) throw new Error('none of the block rules matched')
    ;(e.tight = !s),
      e.isEmpty(e.line - 1) && (s = !0),
      (o = e.line),
      o < u && e.isEmpty(o) && ((s = !0), o++, (e.line = o))
  }
}
Su.prototype.parse = function (e, t, u, n) {
  if (!e) return
  const i = new this.State(e, t, u, n)
  this.tokenize(i, i.line, i.lineMax)
}
Su.prototype.State = Ne
function Zt(e, t, u, n) {
  ;(this.src = e),
    (this.env = u),
    (this.md = t),
    (this.tokens = n),
    (this.tokens_meta = Array(n.length)),
    (this.pos = 0),
    (this.posMax = this.src.length),
    (this.level = 0),
    (this.pending = ''),
    (this.pendingLevel = 0),
    (this.cache = {}),
    (this.delimiters = []),
    (this._prev_delimiters = []),
    (this.backticks = {}),
    (this.backticksScanned = !1),
    (this.linkLevel = 0)
}
Zt.prototype.pushPending = function () {
  const e = new Ie('text', '', 0)
  return (
    (e.content = this.pending),
    (e.level = this.pendingLevel),
    this.tokens.push(e),
    (this.pending = ''),
    e
  )
}
Zt.prototype.push = function (e, t, u) {
  this.pending && this.pushPending()
  const n = new Ie(e, t, u)
  let i = null
  return (
    u < 0 && (this.level--, (this.delimiters = this._prev_delimiters.pop())),
    (n.level = this.level),
    u > 0 &&
      (this.level++,
      this._prev_delimiters.push(this.delimiters),
      (this.delimiters = []),
      (i = { delimiters: this.delimiters })),
    (this.pendingLevel = this.level),
    this.tokens.push(n),
    this.tokens_meta.push(i),
    n
  )
}
Zt.prototype.scanDelims = function (e, t) {
  const u = this.posMax,
    n = this.src.charCodeAt(e),
    i = e > 0 ? this.src.charCodeAt(e - 1) : 32
  let r = e
  for (; r < u && this.src.charCodeAt(r) === n; ) r++
  const o = r - e,
    s = r < u ? this.src.charCodeAt(r) : 32,
    a = $t(i) || Pt(String.fromCharCode(i)),
    c = $t(s) || Pt(String.fromCharCode(s)),
    l = Bt(i),
    d = Bt(s),
    m = !d && (!c || l || a),
    p = !l && (!a || d || c)
  return {
    can_open: m && (t || !p || a),
    can_close: p && (t || !m || c),
    length: o,
  }
}
Zt.prototype.Token = Ie
function Ea(e) {
  switch (e) {
    case 10:
    case 33:
    case 35:
    case 36:
    case 37:
    case 38:
    case 42:
    case 43:
    case 45:
    case 58:
    case 60:
    case 61:
    case 62:
    case 64:
    case 91:
    case 92:
    case 93:
    case 94:
    case 95:
    case 96:
    case 123:
    case 125:
    case 126:
      return !0
    default:
      return !1
  }
}
function Ca(e, t) {
  let u = e.pos
  for (; u < e.posMax && !Ea(e.src.charCodeAt(u)); ) u++
  return u === e.pos
    ? !1
    : (t || (e.pending += e.src.slice(e.pos, u)), (e.pos = u), !0)
}
const Aa = /(?:^|[^a-z0-9.+-])([a-z][a-z0-9.+-]*)$/i
function Da(e, t) {
  if (!e.md.options.linkify || e.linkLevel > 0) return !1
  const u = e.pos,
    n = e.posMax
  if (
    u + 3 > n ||
    e.src.charCodeAt(u) !== 58 ||
    e.src.charCodeAt(u + 1) !== 47 ||
    e.src.charCodeAt(u + 2) !== 47
  )
    return !1
  const i = e.pending.match(Aa)
  if (!i) return !1
  const r = i[1],
    o = e.md.linkify.matchAtStart(e.src.slice(u - r.length))
  if (!o) return !1
  let s = o.url
  if (s.length <= r.length) return !1
  s = s.replace(/\*+$/, '')
  const a = e.md.normalizeLink(s)
  if (!e.md.validateLink(a)) return !1
  if (!t) {
    e.pending = e.pending.slice(0, -r.length)
    const c = e.push('link_open', 'a', 1)
    ;(c.attrs = [['href', a]]), (c.markup = 'linkify'), (c.info = 'auto')
    const l = e.push('text', '', 0)
    l.content = e.md.normalizeLinkText(s)
    const d = e.push('link_close', 'a', -1)
    ;(d.markup = 'linkify'), (d.info = 'auto')
  }
  return (e.pos += s.length - r.length), !0
}
function Fa(e, t) {
  let u = e.pos
  if (e.src.charCodeAt(u) !== 10) return !1
  const n = e.pending.length - 1,
    i = e.posMax
  if (!t)
    if (n >= 0 && e.pending.charCodeAt(n) === 32)
      if (n >= 1 && e.pending.charCodeAt(n - 1) === 32) {
        let r = n - 1
        for (; r >= 1 && e.pending.charCodeAt(r - 1) === 32; ) r--
        ;(e.pending = e.pending.slice(0, r)), e.push('hardbreak', 'br', 0)
      } else (e.pending = e.pending.slice(0, -1)), e.push('softbreak', 'br', 0)
    else e.push('softbreak', 'br', 0)
  for (u++; u < i && V(e.src.charCodeAt(u)); ) u++
  return (e.pos = u), !0
}
const Tn = []
for (let e = 0; e < 256; e++) Tn.push(0)
'\\!"#$%&\'()*+,./:;<=>?@[]^_`{|}~-'.split('').forEach(function (e) {
  Tn[e.charCodeAt(0)] = 1
})
function Sa(e, t) {
  let u = e.pos
  const n = e.posMax
  if (e.src.charCodeAt(u) !== 92 || (u++, u >= n)) return !1
  let i = e.src.charCodeAt(u)
  if (i === 10) {
    for (
      t || e.push('hardbreak', 'br', 0), u++;
      u < n && ((i = e.src.charCodeAt(u)), !!V(i));

    )
      u++
    return (e.pos = u), !0
  }
  let r = e.src[u]
  if (i >= 55296 && i <= 56319 && u + 1 < n) {
    const s = e.src.charCodeAt(u + 1)
    s >= 56320 && s <= 57343 && ((r += e.src[u + 1]), u++)
  }
  const o = '\\' + r
  if (!t) {
    const s = e.push('text_special', '', 0)
    i < 256 && Tn[i] !== 0 ? (s.content = r) : (s.content = o),
      (s.markup = o),
      (s.info = 'escape')
  }
  return (e.pos = u + 1), !0
}
function Ta(e, t) {
  let u = e.pos
  if (e.src.charCodeAt(u) !== 96) return !1
  const i = u
  u++
  const r = e.posMax
  for (; u < r && e.src.charCodeAt(u) === 96; ) u++
  const o = e.src.slice(i, u),
    s = o.length
  if (e.backticksScanned && (e.backticks[s] || 0) <= i)
    return t || (e.pending += o), (e.pos += s), !0
  let a = u,
    c
  for (; (c = e.src.indexOf('`', a)) !== -1; ) {
    for (a = c + 1; a < r && e.src.charCodeAt(a) === 96; ) a++
    const l = a - c
    if (l === s) {
      if (!t) {
        const d = e.push('code_inline', 'code', 0)
        ;(d.markup = o),
          (d.content = e.src
            .slice(u, c)
            .replace(/\n/g, ' ')
            .replace(/^ (.+) $/, '$1'))
      }
      return (e.pos = a), !0
    }
    e.backticks[l] = c
  }
  return (e.backticksScanned = !0), t || (e.pending += o), (e.pos += s), !0
}
function Ia(e, t) {
  const u = e.pos,
    n = e.src.charCodeAt(u)
  if (t || n !== 126) return !1
  const i = e.scanDelims(e.pos, !0)
  let r = i.length
  const o = String.fromCharCode(n)
  if (r < 2) return !1
  let s
  r % 2 && ((s = e.push('text', '', 0)), (s.content = o), r--)
  for (let a = 0; a < r; a += 2)
    (s = e.push('text', '', 0)),
      (s.content = o + o),
      e.delimiters.push({
        marker: n,
        length: 0,
        token: e.tokens.length - 1,
        end: -1,
        open: i.can_open,
        close: i.can_close,
      })
  return (e.pos += i.length), !0
}
function cr(e, t) {
  let u
  const n = [],
    i = t.length
  for (let r = 0; r < i; r++) {
    const o = t[r]
    if (o.marker !== 126 || o.end === -1) continue
    const s = t[o.end]
    ;(u = e.tokens[o.token]),
      (u.type = 's_open'),
      (u.tag = 's'),
      (u.nesting = 1),
      (u.markup = '~~'),
      (u.content = ''),
      (u = e.tokens[s.token]),
      (u.type = 's_close'),
      (u.tag = 's'),
      (u.nesting = -1),
      (u.markup = '~~'),
      (u.content = ''),
      e.tokens[s.token - 1].type === 'text' &&
        e.tokens[s.token - 1].content === '~' &&
        n.push(s.token - 1)
  }
  for (; n.length; ) {
    const r = n.pop()
    let o = r + 1
    for (; o < e.tokens.length && e.tokens[o].type === 's_close'; ) o++
    o--,
      r !== o &&
        ((u = e.tokens[o]), (e.tokens[o] = e.tokens[r]), (e.tokens[r] = u))
  }
}
function za(e) {
  const t = e.tokens_meta,
    u = e.tokens_meta.length
  cr(e, e.delimiters)
  for (let n = 0; n < u; n++) t[n] && t[n].delimiters && cr(e, t[n].delimiters)
}
const Kr = { tokenize: Ia, postProcess: za }
function La(e, t) {
  const u = e.pos,
    n = e.src.charCodeAt(u)
  if (t || (n !== 95 && n !== 42)) return !1
  const i = e.scanDelims(e.pos, n === 42)
  for (let r = 0; r < i.length; r++) {
    const o = e.push('text', '', 0)
    ;(o.content = String.fromCharCode(n)),
      e.delimiters.push({
        marker: n,
        length: i.length,
        token: e.tokens.length - 1,
        end: -1,
        open: i.can_open,
        close: i.can_close,
      })
  }
  return (e.pos += i.length), !0
}
function lr(e, t) {
  const u = t.length
  for (let n = u - 1; n >= 0; n--) {
    const i = t[n]
    if ((i.marker !== 95 && i.marker !== 42) || i.end === -1) continue
    const r = t[i.end],
      o =
        n > 0 &&
        t[n - 1].end === i.end + 1 &&
        t[n - 1].marker === i.marker &&
        t[n - 1].token === i.token - 1 &&
        t[i.end + 1].token === r.token + 1,
      s = String.fromCharCode(i.marker),
      a = e.tokens[i.token]
    ;(a.type = o ? 'strong_open' : 'em_open'),
      (a.tag = o ? 'strong' : 'em'),
      (a.nesting = 1),
      (a.markup = o ? s + s : s),
      (a.content = '')
    const c = e.tokens[r.token]
    ;(c.type = o ? 'strong_close' : 'em_close'),
      (c.tag = o ? 'strong' : 'em'),
      (c.nesting = -1),
      (c.markup = o ? s + s : s),
      (c.content = ''),
      o &&
        ((e.tokens[t[n - 1].token].content = ''),
        (e.tokens[t[i.end + 1].token].content = ''),
        n--)
  }
}
function ja(e) {
  const t = e.tokens_meta,
    u = e.tokens_meta.length
  lr(e, e.delimiters)
  for (let n = 0; n < u; n++) t[n] && t[n].delimiters && lr(e, t[n].delimiters)
}
const Xr = { tokenize: La, postProcess: ja }
function Ma(e, t) {
  let u,
    n,
    i,
    r,
    o = '',
    s = '',
    a = e.pos,
    c = !0
  if (e.src.charCodeAt(e.pos) !== 91) return !1
  const l = e.pos,
    d = e.posMax,
    m = e.pos + 1,
    p = e.md.helpers.parseLinkLabel(e, e.pos, !0)
  if (p < 0) return !1
  let h = p + 1
  if (h < d && e.src.charCodeAt(h) === 40) {
    for (
      c = !1, h++;
      h < d && ((u = e.src.charCodeAt(h)), !(!V(u) && u !== 10));
      h++
    );
    if (h >= d) return !1
    if (
      ((a = h),
      (i = e.md.helpers.parseLinkDestination(e.src, h, e.posMax)),
      i.ok)
    ) {
      for (
        o = e.md.normalizeLink(i.str),
          e.md.validateLink(o) ? (h = i.pos) : (o = ''),
          a = h;
        h < d && ((u = e.src.charCodeAt(h)), !(!V(u) && u !== 10));
        h++
      );
      if (
        ((i = e.md.helpers.parseLinkTitle(e.src, h, e.posMax)),
        h < d && a !== h && i.ok)
      )
        for (
          s = i.str, h = i.pos;
          h < d && ((u = e.src.charCodeAt(h)), !(!V(u) && u !== 10));
          h++
        );
    }
    ;(h >= d || e.src.charCodeAt(h) !== 41) && (c = !0), h++
  }
  if (c) {
    if (typeof e.env.references > 'u') return !1
    if (
      (h < d && e.src.charCodeAt(h) === 91
        ? ((a = h + 1),
          (h = e.md.helpers.parseLinkLabel(e, h)),
          h >= 0 ? (n = e.src.slice(a, h++)) : (h = p + 1))
        : (h = p + 1),
      n || (n = e.src.slice(m, p)),
      (r = e.env.references[Fu(n)]),
      !r)
    )
      return (e.pos = l), !1
    ;(o = r.href), (s = r.title)
  }
  if (!t) {
    ;(e.pos = m), (e.posMax = p)
    const _ = e.push('link_open', 'a', 1),
      b = [['href', o]]
    ;(_.attrs = b),
      s && b.push(['title', s]),
      e.linkLevel++,
      e.md.inline.tokenize(e),
      e.linkLevel--,
      e.push('link_close', 'a', -1)
  }
  return (e.pos = h), (e.posMax = d), !0
}
function Ra(e, t) {
  let u,
    n,
    i,
    r,
    o,
    s,
    a,
    c,
    l = ''
  const d = e.pos,
    m = e.posMax
  if (e.src.charCodeAt(e.pos) !== 33 || e.src.charCodeAt(e.pos + 1) !== 91)
    return !1
  const p = e.pos + 2,
    h = e.md.helpers.parseLinkLabel(e, e.pos + 1, !1)
  if (h < 0) return !1
  if (((r = h + 1), r < m && e.src.charCodeAt(r) === 40)) {
    for (r++; r < m && ((u = e.src.charCodeAt(r)), !(!V(u) && u !== 10)); r++);
    if (r >= m) return !1
    for (
      c = r,
        s = e.md.helpers.parseLinkDestination(e.src, r, e.posMax),
        s.ok &&
          ((l = e.md.normalizeLink(s.str)),
          e.md.validateLink(l) ? (r = s.pos) : (l = '')),
        c = r;
      r < m && ((u = e.src.charCodeAt(r)), !(!V(u) && u !== 10));
      r++
    );
    if (
      ((s = e.md.helpers.parseLinkTitle(e.src, r, e.posMax)),
      r < m && c !== r && s.ok)
    )
      for (
        a = s.str, r = s.pos;
        r < m && ((u = e.src.charCodeAt(r)), !(!V(u) && u !== 10));
        r++
      );
    else a = ''
    if (r >= m || e.src.charCodeAt(r) !== 41) return (e.pos = d), !1
    r++
  } else {
    if (typeof e.env.references > 'u') return !1
    if (
      (r < m && e.src.charCodeAt(r) === 91
        ? ((c = r + 1),
          (r = e.md.helpers.parseLinkLabel(e, r)),
          r >= 0 ? (i = e.src.slice(c, r++)) : (r = h + 1))
        : (r = h + 1),
      i || (i = e.src.slice(p, h)),
      (o = e.env.references[Fu(i)]),
      !o)
    )
      return (e.pos = d), !1
    ;(l = o.href), (a = o.title)
  }
  if (!t) {
    n = e.src.slice(p, h)
    const _ = []
    e.md.inline.parse(n, e.md, e.env, _)
    const b = e.push('image', 'img', 0),
      g = [
        ['src', l],
        ['alt', ''],
      ]
    ;(b.attrs = g), (b.children = _), (b.content = n), a && g.push(['title', a])
  }
  return (e.pos = r), (e.posMax = m), !0
}
const Oa =
    /^([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/,
  Ba = /^([a-zA-Z][a-zA-Z0-9+.-]{1,31}):([^<>\x00-\x20]*)$/
function Pa(e, t) {
  let u = e.pos
  if (e.src.charCodeAt(u) !== 60) return !1
  const n = e.pos,
    i = e.posMax
  for (;;) {
    if (++u >= i) return !1
    const o = e.src.charCodeAt(u)
    if (o === 60) return !1
    if (o === 62) break
  }
  const r = e.src.slice(n + 1, u)
  if (Ba.test(r)) {
    const o = e.md.normalizeLink(r)
    if (!e.md.validateLink(o)) return !1
    if (!t) {
      const s = e.push('link_open', 'a', 1)
      ;(s.attrs = [['href', o]]), (s.markup = 'autolink'), (s.info = 'auto')
      const a = e.push('text', '', 0)
      a.content = e.md.normalizeLinkText(r)
      const c = e.push('link_close', 'a', -1)
      ;(c.markup = 'autolink'), (c.info = 'auto')
    }
    return (e.pos += r.length + 2), !0
  }
  if (Oa.test(r)) {
    const o = e.md.normalizeLink('mailto:' + r)
    if (!e.md.validateLink(o)) return !1
    if (!t) {
      const s = e.push('link_open', 'a', 1)
      ;(s.attrs = [['href', o]]), (s.markup = 'autolink'), (s.info = 'auto')
      const a = e.push('text', '', 0)
      a.content = e.md.normalizeLinkText(r)
      const c = e.push('link_close', 'a', -1)
      ;(c.markup = 'autolink'), (c.info = 'auto')
    }
    return (e.pos += r.length + 2), !0
  }
  return !1
}
function $a(e) {
  return /^<a[>\s]/i.test(e)
}
function Na(e) {
  return /^<\/a\s*>/i.test(e)
}
function qa(e) {
  const t = e | 32
  return t >= 97 && t <= 122
}
function Ha(e, t) {
  if (!e.md.options.html) return !1
  const u = e.posMax,
    n = e.pos
  if (e.src.charCodeAt(n) !== 60 || n + 2 >= u) return !1
  const i = e.src.charCodeAt(n + 1)
  if (i !== 33 && i !== 63 && i !== 47 && !qa(i)) return !1
  const r = e.src.slice(n).match(xa)
  if (!r) return !1
  if (!t) {
    const o = e.push('html_inline', '', 0)
    ;(o.content = r[0]),
      $a(o.content) && e.linkLevel++,
      Na(o.content) && e.linkLevel--
  }
  return (e.pos += r[0].length), !0
}
const Ua = /^&#((?:x[a-f0-9]{1,6}|[0-9]{1,7}));/i,
  Va = /^&([a-z][a-z0-9]{1,31});/i
function Wa(e, t) {
  const u = e.pos,
    n = e.posMax
  if (e.src.charCodeAt(u) !== 38 || u + 1 >= n) return !1
  if (e.src.charCodeAt(u + 1) === 35) {
    const r = e.src.slice(u).match(Ua)
    if (r) {
      if (!t) {
        const o =
            r[1][0].toLowerCase() === 'x'
              ? parseInt(r[1].slice(1), 16)
              : parseInt(r[1], 10),
          s = e.push('text_special', '', 0)
        ;(s.content = Fn(o) ? _u(o) : _u(65533)),
          (s.markup = r[0]),
          (s.info = 'entity')
      }
      return (e.pos += r[0].length), !0
    }
  } else {
    const r = e.src.slice(u).match(Va)
    if (r) {
      const o = qr(r[0])
      if (o !== r[0]) {
        if (!t) {
          const s = e.push('text_special', '', 0)
          ;(s.content = o), (s.markup = r[0]), (s.info = 'entity')
        }
        return (e.pos += r[0].length), !0
      }
    }
  }
  return !1
}
function dr(e) {
  const t = {},
    u = e.length
  if (!u) return
  let n = 0,
    i = -2
  const r = []
  for (let o = 0; o < u; o++) {
    const s = e[o]
    if (
      (r.push(0),
      (e[n].marker !== s.marker || i !== s.token - 1) && (n = o),
      (i = s.token),
      (s.length = s.length || 0),
      !s.close)
    )
      continue
    t.hasOwnProperty(s.marker) || (t[s.marker] = [-1, -1, -1, -1, -1, -1])
    const a = t[s.marker][(s.open ? 3 : 0) + (s.length % 3)]
    let c = n - r[n] - 1,
      l = c
    for (; c > a; c -= r[c] + 1) {
      const d = e[c]
      if (d.marker === s.marker && d.open && d.end < 0) {
        let m = !1
        if (
          ((d.close || s.open) &&
            (d.length + s.length) % 3 === 0 &&
            (d.length % 3 !== 0 || s.length % 3 !== 0) &&
            (m = !0),
          !m)
        ) {
          const p = c > 0 && !e[c - 1].open ? r[c - 1] + 1 : 0
          ;(r[o] = o - c + p),
            (r[c] = p),
            (s.open = !1),
            (d.end = o),
            (d.close = !1),
            (l = -1),
            (i = -2)
          break
        }
      }
    }
    l !== -1 && (t[s.marker][(s.open ? 3 : 0) + ((s.length || 0) % 3)] = l)
  }
}
function Ga(e) {
  const t = e.tokens_meta,
    u = e.tokens_meta.length
  dr(e.delimiters)
  for (let n = 0; n < u; n++) t[n] && t[n].delimiters && dr(t[n].delimiters)
}
function Za(e) {
  let t,
    u,
    n = 0
  const i = e.tokens,
    r = e.tokens.length
  for (t = u = 0; t < r; t++)
    i[t].nesting < 0 && n--,
      (i[t].level = n),
      i[t].nesting > 0 && n++,
      i[t].type === 'text' && t + 1 < r && i[t + 1].type === 'text'
        ? (i[t + 1].content = i[t].content + i[t + 1].content)
        : (t !== u && (i[u] = i[t]), u++)
  t !== u && (i.length = u)
}
const Uu = [
    ['text', Ca],
    ['linkify', Da],
    ['newline', Fa],
    ['escape', Sa],
    ['backticks', Ta],
    ['strikethrough', Kr.tokenize],
    ['emphasis', Xr.tokenize],
    ['link', Ma],
    ['image', Ra],
    ['autolink', Pa],
    ['html_inline', Ha],
    ['entity', Wa],
  ],
  Vu = [
    ['balance_pairs', Ga],
    ['strikethrough', Kr.postProcess],
    ['emphasis', Xr.postProcess],
    ['fragments_join', Za],
  ]
function Kt() {
  this.ruler = new he()
  for (let e = 0; e < Uu.length; e++) this.ruler.push(Uu[e][0], Uu[e][1])
  this.ruler2 = new he()
  for (let e = 0; e < Vu.length; e++) this.ruler2.push(Vu[e][0], Vu[e][1])
}
Kt.prototype.skipToken = function (e) {
  const t = e.pos,
    u = this.ruler.getRules(''),
    n = u.length,
    i = e.md.options.maxNesting,
    r = e.cache
  if (typeof r[t] < 'u') {
    e.pos = r[t]
    return
  }
  let o = !1
  if (e.level < i) {
    for (let s = 0; s < n; s++)
      if ((e.level++, (o = u[s](e, !0)), e.level--, o)) {
        if (t >= e.pos)
          throw new Error("inline rule didn't increment state.pos")
        break
      }
  } else e.pos = e.posMax
  o || e.pos++, (r[t] = e.pos)
}
Kt.prototype.tokenize = function (e) {
  const t = this.ruler.getRules(''),
    u = t.length,
    n = e.posMax,
    i = e.md.options.maxNesting
  for (; e.pos < n; ) {
    const r = e.pos
    let o = !1
    if (e.level < i) {
      for (let s = 0; s < u; s++)
        if (((o = t[s](e, !1)), o)) {
          if (r >= e.pos)
            throw new Error("inline rule didn't increment state.pos")
          break
        }
    }
    if (o) {
      if (e.pos >= n) break
      continue
    }
    e.pending += e.src[e.pos++]
  }
  e.pending && e.pushPending()
}
Kt.prototype.parse = function (e, t, u, n) {
  const i = new this.State(e, t, u, n)
  this.tokenize(i)
  const r = this.ruler2.getRules(''),
    o = r.length
  for (let s = 0; s < o; s++) r[s](i)
}
Kt.prototype.State = Zt
function Ka(e) {
  const t = {}
  ;(e = e || {}),
    (t.src_Any = Or.source),
    (t.src_Cc = Br.source),
    (t.src_Z = $r.source),
    (t.src_P = An.source),
    (t.src_ZPCc = [t.src_Z, t.src_P, t.src_Cc].join('|')),
    (t.src_ZCc = [t.src_Z, t.src_Cc].join('|'))
  const u = '[><｜]'
  return (
    (t.src_pseudo_letter =
      '(?:(?!' + u + '|' + t.src_ZPCc + ')' + t.src_Any + ')'),
    (t.src_ip4 =
      '(?:(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)'),
    (t.src_auth = '(?:(?:(?!' + t.src_ZCc + '|[@/\\[\\]()]).)+@)?'),
    (t.src_port =
      '(?::(?:6(?:[0-4]\\d{3}|5(?:[0-4]\\d{2}|5(?:[0-2]\\d|3[0-5])))|[1-5]?\\d{1,4}))?'),
    (t.src_host_terminator =
      '(?=$|' +
      u +
      '|' +
      t.src_ZPCc +
      ')(?!' +
      (e['---'] ? '-(?!--)|' : '-|') +
      '_|:\\d|\\.-|\\.(?!$|' +
      t.src_ZPCc +
      '))'),
    (t.src_path =
      '(?:[/?#](?:(?!' +
      t.src_ZCc +
      '|' +
      u +
      `|[()[\\]{}.,"'?!\\-;]).|\\[(?:(?!` +
      t.src_ZCc +
      '|\\]).)*\\]|\\((?:(?!' +
      t.src_ZCc +
      '|[)]).)*\\)|\\{(?:(?!' +
      t.src_ZCc +
      '|[}]).)*\\}|\\"(?:(?!' +
      t.src_ZCc +
      `|["]).)+\\"|\\'(?:(?!` +
      t.src_ZCc +
      "|[']).)+\\'|\\'(?=" +
      t.src_pseudo_letter +
      '|[-])|\\.{2,}[a-zA-Z0-9%/&]|\\.(?!' +
      t.src_ZCc +
      '|[.]|$)|' +
      (e['---'] ? '\\-(?!--(?:[^-]|$))(?:-*)|' : '\\-+|') +
      ',(?!' +
      t.src_ZCc +
      '|$)|;(?!' +
      t.src_ZCc +
      '|$)|\\!+(?!' +
      t.src_ZCc +
      '|[!]|$)|\\?(?!' +
      t.src_ZCc +
      '|[?]|$))+|\\/)?'),
    (t.src_email_name =
      '[\\-;:&=\\+\\$,\\.a-zA-Z0-9_][\\-;:&=\\+\\$,\\"\\.a-zA-Z0-9_]*'),
    (t.src_xn = 'xn--[a-z0-9\\-]{1,59}'),
    (t.src_domain_root =
      '(?:' + t.src_xn + '|' + t.src_pseudo_letter + '{1,63})'),
    (t.src_domain =
      '(?:' +
      t.src_xn +
      '|(?:' +
      t.src_pseudo_letter +
      ')|(?:' +
      t.src_pseudo_letter +
      '(?:-|' +
      t.src_pseudo_letter +
      '){0,61}' +
      t.src_pseudo_letter +
      '))'),
    (t.src_host =
      '(?:(?:(?:(?:' + t.src_domain + ')\\.)*' + t.src_domain + '))'),
    (t.tpl_host_fuzzy =
      '(?:' + t.src_ip4 + '|(?:(?:(?:' + t.src_domain + ')\\.)+(?:%TLDS%)))'),
    (t.tpl_host_no_ip_fuzzy = '(?:(?:(?:' + t.src_domain + ')\\.)+(?:%TLDS%))'),
    (t.src_host_strict = t.src_host + t.src_host_terminator),
    (t.tpl_host_fuzzy_strict = t.tpl_host_fuzzy + t.src_host_terminator),
    (t.src_host_port_strict = t.src_host + t.src_port + t.src_host_terminator),
    (t.tpl_host_port_fuzzy_strict =
      t.tpl_host_fuzzy + t.src_port + t.src_host_terminator),
    (t.tpl_host_port_no_ip_fuzzy_strict =
      t.tpl_host_no_ip_fuzzy + t.src_port + t.src_host_terminator),
    (t.tpl_host_fuzzy_test =
      'localhost|www\\.|\\.\\d{1,3}\\.|(?:\\.(?:%TLDS%)(?:' +
      t.src_ZPCc +
      '|>|$))'),
    (t.tpl_email_fuzzy =
      '(^|' +
      u +
      '|"|\\(|' +
      t.src_ZCc +
      ')(' +
      t.src_email_name +
      '@' +
      t.tpl_host_fuzzy_strict +
      ')'),
    (t.tpl_link_fuzzy =
      '(^|(?![.:/\\-_@])(?:[$+<=>^`|｜]|' +
      t.src_ZPCc +
      '))((?![$+<=>^`|｜])' +
      t.tpl_host_port_fuzzy_strict +
      t.src_path +
      ')'),
    (t.tpl_link_no_ip_fuzzy =
      '(^|(?![.:/\\-_@])(?:[$+<=>^`|｜]|' +
      t.src_ZPCc +
      '))((?![$+<=>^`|｜])' +
      t.tpl_host_port_no_ip_fuzzy_strict +
      t.src_path +
      ')'),
    t
  )
}
function on(e) {
  return (
    Array.prototype.slice.call(arguments, 1).forEach(function (u) {
      u &&
        Object.keys(u).forEach(function (n) {
          e[n] = u[n]
        })
    }),
    e
  )
}
function Tu(e) {
  return Object.prototype.toString.call(e)
}
function Xa(e) {
  return Tu(e) === '[object String]'
}
function Qa(e) {
  return Tu(e) === '[object Object]'
}
function Ya(e) {
  return Tu(e) === '[object RegExp]'
}
function fr(e) {
  return Tu(e) === '[object Function]'
}
function Ja(e) {
  return e.replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&')
}
const Qr = { fuzzyLink: !0, fuzzyEmail: !0, fuzzyIP: !1 }
function e0(e) {
  return Object.keys(e || {}).reduce(function (t, u) {
    return t || Qr.hasOwnProperty(u)
  }, !1)
}
const t0 = {
    'http:': {
      validate: function (e, t, u) {
        const n = e.slice(t)
        return (
          u.re.http ||
            (u.re.http = new RegExp(
              '^\\/\\/' +
                u.re.src_auth +
                u.re.src_host_port_strict +
                u.re.src_path,
              'i',
            )),
          u.re.http.test(n) ? n.match(u.re.http)[0].length : 0
        )
      },
    },
    'https:': 'http:',
    'ftp:': 'http:',
    '//': {
      validate: function (e, t, u) {
        const n = e.slice(t)
        return (
          u.re.no_http ||
            (u.re.no_http = new RegExp(
              '^' +
                u.re.src_auth +
                '(?:localhost|(?:(?:' +
                u.re.src_domain +
                ')\\.)+' +
                u.re.src_domain_root +
                ')' +
                u.re.src_port +
                u.re.src_host_terminator +
                u.re.src_path,
              'i',
            )),
          u.re.no_http.test(n)
            ? (t >= 3 && e[t - 3] === ':') || (t >= 3 && e[t - 3] === '/')
              ? 0
              : n.match(u.re.no_http)[0].length
            : 0
        )
      },
    },
    'mailto:': {
      validate: function (e, t, u) {
        const n = e.slice(t)
        return (
          u.re.mailto ||
            (u.re.mailto = new RegExp(
              '^' + u.re.src_email_name + '@' + u.re.src_host_strict,
              'i',
            )),
          u.re.mailto.test(n) ? n.match(u.re.mailto)[0].length : 0
        )
      },
    },
  },
  u0 =
    'a[cdefgilmnoqrstuwxz]|b[abdefghijmnorstvwyz]|c[acdfghiklmnoruvwxyz]|d[ejkmoz]|e[cegrstu]|f[ijkmor]|g[abdefghilmnpqrstuwy]|h[kmnrtu]|i[delmnoqrst]|j[emop]|k[eghimnprwyz]|l[abcikrstuvy]|m[acdeghklmnopqrstuvwxyz]|n[acefgilopruz]|om|p[aefghklmnrstwy]|qa|r[eosuw]|s[abcdeghijklmnortuvxyz]|t[cdfghjklmnortvwz]|u[agksyz]|v[aceginu]|w[fs]|y[et]|z[amw]',
  n0 =
    'biz|com|edu|gov|net|org|pro|web|xxx|aero|asia|coop|info|museum|name|shop|рф'.split(
      '|',
    )
function r0(e) {
  ;(e.__index__ = -1), (e.__text_cache__ = '')
}
function i0(e) {
  return function (t, u) {
    const n = t.slice(u)
    return e.test(n) ? n.match(e)[0].length : 0
  }
}
function hr() {
  return function (e, t) {
    t.normalize(e)
  }
}
function ku(e) {
  const t = (e.re = Ka(e.__opts__)),
    u = e.__tlds__.slice()
  e.onCompile(),
    e.__tlds_replaced__ || u.push(u0),
    u.push(t.src_xn),
    (t.src_tlds = u.join('|'))
  function n(s) {
    return s.replace('%TLDS%', t.src_tlds)
  }
  ;(t.email_fuzzy = RegExp(n(t.tpl_email_fuzzy), 'i')),
    (t.link_fuzzy = RegExp(n(t.tpl_link_fuzzy), 'i')),
    (t.link_no_ip_fuzzy = RegExp(n(t.tpl_link_no_ip_fuzzy), 'i')),
    (t.host_fuzzy_test = RegExp(n(t.tpl_host_fuzzy_test), 'i'))
  const i = []
  e.__compiled__ = {}
  function r(s, a) {
    throw new Error('(LinkifyIt) Invalid schema "' + s + '": ' + a)
  }
  Object.keys(e.__schemas__).forEach(function (s) {
    const a = e.__schemas__[s]
    if (a === null) return
    const c = { validate: null, link: null }
    if (((e.__compiled__[s] = c), Qa(a))) {
      Ya(a.validate)
        ? (c.validate = i0(a.validate))
        : fr(a.validate)
          ? (c.validate = a.validate)
          : r(s, a),
        fr(a.normalize)
          ? (c.normalize = a.normalize)
          : a.normalize
            ? r(s, a)
            : (c.normalize = hr())
      return
    }
    if (Xa(a)) {
      i.push(s)
      return
    }
    r(s, a)
  }),
    i.forEach(function (s) {
      e.__compiled__[e.__schemas__[s]] &&
        ((e.__compiled__[s].validate =
          e.__compiled__[e.__schemas__[s]].validate),
        (e.__compiled__[s].normalize =
          e.__compiled__[e.__schemas__[s]].normalize))
    }),
    (e.__compiled__[''] = { validate: null, normalize: hr() })
  const o = Object.keys(e.__compiled__)
    .filter(function (s) {
      return s.length > 0 && e.__compiled__[s]
    })
    .map(Ja)
    .join('|')
  ;(e.re.schema_test = RegExp(
    '(^|(?!_)(?:[><｜]|' + t.src_ZPCc + '))(' + o + ')',
    'i',
  )),
    (e.re.schema_search = RegExp(
      '(^|(?!_)(?:[><｜]|' + t.src_ZPCc + '))(' + o + ')',
      'ig',
    )),
    (e.re.schema_at_start = RegExp('^' + e.re.schema_search.source, 'i')),
    (e.re.pretest = RegExp(
      '(' +
        e.re.schema_test.source +
        ')|(' +
        e.re.host_fuzzy_test.source +
        ')|@',
      'i',
    )),
    r0(e)
}
function o0(e, t) {
  const u = e.__index__,
    n = e.__last_index__,
    i = e.__text_cache__.slice(u, n)
  ;(this.schema = e.__schema__.toLowerCase()),
    (this.index = u + t),
    (this.lastIndex = n + t),
    (this.raw = i),
    (this.text = i),
    (this.url = i)
}
function sn(e, t) {
  const u = new o0(e, t)
  return e.__compiled__[u.schema].normalize(u, e), u
}
function _e(e, t) {
  if (!(this instanceof _e)) return new _e(e, t)
  t || (e0(e) && ((t = e), (e = {}))),
    (this.__opts__ = on({}, Qr, t)),
    (this.__index__ = -1),
    (this.__last_index__ = -1),
    (this.__schema__ = ''),
    (this.__text_cache__ = ''),
    (this.__schemas__ = on({}, t0, e)),
    (this.__compiled__ = {}),
    (this.__tlds__ = n0),
    (this.__tlds_replaced__ = !1),
    (this.re = {}),
    ku(this)
}
_e.prototype.add = function (t, u) {
  return (this.__schemas__[t] = u), ku(this), this
}
_e.prototype.set = function (t) {
  return (this.__opts__ = on(this.__opts__, t)), this
}
_e.prototype.test = function (t) {
  if (((this.__text_cache__ = t), (this.__index__ = -1), !t.length)) return !1
  let u, n, i, r, o, s, a, c, l
  if (this.re.schema_test.test(t)) {
    for (a = this.re.schema_search, a.lastIndex = 0; (u = a.exec(t)) !== null; )
      if (((r = this.testSchemaAt(t, u[2], a.lastIndex)), r)) {
        ;(this.__schema__ = u[2]),
          (this.__index__ = u.index + u[1].length),
          (this.__last_index__ = u.index + u[0].length + r)
        break
      }
  }
  return (
    this.__opts__.fuzzyLink &&
      this.__compiled__['http:'] &&
      ((c = t.search(this.re.host_fuzzy_test)),
      c >= 0 &&
        (this.__index__ < 0 || c < this.__index__) &&
        (n = t.match(
          this.__opts__.fuzzyIP ? this.re.link_fuzzy : this.re.link_no_ip_fuzzy,
        )) !== null &&
        ((o = n.index + n[1].length),
        (this.__index__ < 0 || o < this.__index__) &&
          ((this.__schema__ = ''),
          (this.__index__ = o),
          (this.__last_index__ = n.index + n[0].length)))),
    this.__opts__.fuzzyEmail &&
      this.__compiled__['mailto:'] &&
      ((l = t.indexOf('@')),
      l >= 0 &&
        (i = t.match(this.re.email_fuzzy)) !== null &&
        ((o = i.index + i[1].length),
        (s = i.index + i[0].length),
        (this.__index__ < 0 ||
          o < this.__index__ ||
          (o === this.__index__ && s > this.__last_index__)) &&
          ((this.__schema__ = 'mailto:'),
          (this.__index__ = o),
          (this.__last_index__ = s)))),
    this.__index__ >= 0
  )
}
_e.prototype.pretest = function (t) {
  return this.re.pretest.test(t)
}
_e.prototype.testSchemaAt = function (t, u, n) {
  return this.__compiled__[u.toLowerCase()]
    ? this.__compiled__[u.toLowerCase()].validate(t, n, this)
    : 0
}
_e.prototype.match = function (t) {
  const u = []
  let n = 0
  this.__index__ >= 0 &&
    this.__text_cache__ === t &&
    (u.push(sn(this, n)), (n = this.__last_index__))
  let i = n ? t.slice(n) : t
  for (; this.test(i); )
    u.push(sn(this, n)),
      (i = i.slice(this.__last_index__)),
      (n += this.__last_index__)
  return u.length ? u : null
}
_e.prototype.matchAtStart = function (t) {
  if (((this.__text_cache__ = t), (this.__index__ = -1), !t.length)) return null
  const u = this.re.schema_at_start.exec(t)
  if (!u) return null
  const n = this.testSchemaAt(t, u[2], u[0].length)
  return n
    ? ((this.__schema__ = u[2]),
      (this.__index__ = u.index + u[1].length),
      (this.__last_index__ = u.index + u[0].length + n),
      sn(this, 0))
    : null
}
_e.prototype.tlds = function (t, u) {
  return (
    (t = Array.isArray(t) ? t : [t]),
    u
      ? ((this.__tlds__ = this.__tlds__
          .concat(t)
          .sort()
          .filter(function (n, i, r) {
            return n !== r[i - 1]
          })
          .reverse()),
        ku(this),
        this)
      : ((this.__tlds__ = t.slice()),
        (this.__tlds_replaced__ = !0),
        ku(this),
        this)
  )
}
_e.prototype.normalize = function (t) {
  t.schema || (t.url = 'http://' + t.url),
    t.schema === 'mailto:' &&
      !/^mailto:/i.test(t.url) &&
      (t.url = 'mailto:' + t.url)
}
_e.prototype.onCompile = function () {}
const _t = 2147483647,
  Oe = 36,
  In = 1,
  Nt = 26,
  s0 = 38,
  a0 = 700,
  Yr = 72,
  Jr = 128,
  ei = '-',
  c0 = /^xn--/,
  l0 = /[^\0-\x7F]/,
  d0 = /[\x2E\u3002\uFF0E\uFF61]/g,
  f0 = {
    overflow: 'Overflow: input needs wider integers to process',
    'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
    'invalid-input': 'Invalid input',
  },
  Wu = Oe - In,
  Be = Math.floor,
  Gu = String.fromCharCode
function Ze(e) {
  throw new RangeError(f0[e])
}
function h0(e, t) {
  const u = []
  let n = e.length
  for (; n--; ) u[n] = t(e[n])
  return u
}
function ti(e, t) {
  const u = e.split('@')
  let n = ''
  u.length > 1 && ((n = u[0] + '@'), (e = u[1])), (e = e.replace(d0, '.'))
  const i = e.split('.'),
    r = h0(i, t).join('.')
  return n + r
}
function ui(e) {
  const t = []
  let u = 0
  const n = e.length
  for (; u < n; ) {
    const i = e.charCodeAt(u++)
    if (i >= 55296 && i <= 56319 && u < n) {
      const r = e.charCodeAt(u++)
      ;(r & 64512) == 56320
        ? t.push(((i & 1023) << 10) + (r & 1023) + 65536)
        : (t.push(i), u--)
    } else t.push(i)
  }
  return t
}
const p0 = (e) => String.fromCodePoint(...e),
  m0 = function (e) {
    return e >= 48 && e < 58
      ? 26 + (e - 48)
      : e >= 65 && e < 91
        ? e - 65
        : e >= 97 && e < 123
          ? e - 97
          : Oe
  },
  pr = function (e, t) {
    return e + 22 + 75 * (e < 26) - ((t != 0) << 5)
  },
  ni = function (e, t, u) {
    let n = 0
    for (
      e = u ? Be(e / a0) : e >> 1, e += Be(e / t);
      e > (Wu * Nt) >> 1;
      n += Oe
    )
      e = Be(e / Wu)
    return Be(n + ((Wu + 1) * e) / (e + s0))
  },
  ri = function (e) {
    const t = [],
      u = e.length
    let n = 0,
      i = Jr,
      r = Yr,
      o = e.lastIndexOf(ei)
    o < 0 && (o = 0)
    for (let s = 0; s < o; ++s)
      e.charCodeAt(s) >= 128 && Ze('not-basic'), t.push(e.charCodeAt(s))
    for (let s = o > 0 ? o + 1 : 0; s < u; ) {
      const a = n
      for (let l = 1, d = Oe; ; d += Oe) {
        s >= u && Ze('invalid-input')
        const m = m0(e.charCodeAt(s++))
        m >= Oe && Ze('invalid-input'),
          m > Be((_t - n) / l) && Ze('overflow'),
          (n += m * l)
        const p = d <= r ? In : d >= r + Nt ? Nt : d - r
        if (m < p) break
        const h = Oe - p
        l > Be(_t / h) && Ze('overflow'), (l *= h)
      }
      const c = t.length + 1
      ;(r = ni(n - a, c, a == 0)),
        Be(n / c) > _t - i && Ze('overflow'),
        (i += Be(n / c)),
        (n %= c),
        t.splice(n++, 0, i)
    }
    return String.fromCodePoint(...t)
  },
  ii = function (e) {
    const t = []
    e = ui(e)
    const u = e.length
    let n = Jr,
      i = 0,
      r = Yr
    for (const a of e) a < 128 && t.push(Gu(a))
    const o = t.length
    let s = o
    for (o && t.push(ei); s < u; ) {
      let a = _t
      for (const l of e) l >= n && l < a && (a = l)
      const c = s + 1
      a - n > Be((_t - i) / c) && Ze('overflow'), (i += (a - n) * c), (n = a)
      for (const l of e)
        if ((l < n && ++i > _t && Ze('overflow'), l === n)) {
          let d = i
          for (let m = Oe; ; m += Oe) {
            const p = m <= r ? In : m >= r + Nt ? Nt : m - r
            if (d < p) break
            const h = d - p,
              _ = Oe - p
            t.push(Gu(pr(p + (h % _), 0))), (d = Be(h / _))
          }
          t.push(Gu(pr(d, 0))), (r = ni(i, c, s === o)), (i = 0), ++s
        }
      ++i, ++n
    }
    return t.join('')
  },
  b0 = function (e) {
    return ti(e, function (t) {
      return c0.test(t) ? ri(t.slice(4).toLowerCase()) : t
    })
  },
  g0 = function (e) {
    return ti(e, function (t) {
      return l0.test(t) ? 'xn--' + ii(t) : t
    })
  },
  oi = {
    version: '2.3.1',
    ucs2: { decode: ui, encode: p0 },
    decode: ri,
    encode: ii,
    toASCII: g0,
    toUnicode: b0,
  },
  x0 = {
    options: {
      html: !1,
      xhtmlOut: !1,
      breaks: !1,
      langPrefix: 'language-',
      linkify: !1,
      typographer: !1,
      quotes: '“”‘’',
      highlight: null,
      maxNesting: 100,
    },
    components: { core: {}, block: {}, inline: {} },
  },
  _0 = {
    options: {
      html: !1,
      xhtmlOut: !1,
      breaks: !1,
      langPrefix: 'language-',
      linkify: !1,
      typographer: !1,
      quotes: '“”‘’',
      highlight: null,
      maxNesting: 20,
    },
    components: {
      core: { rules: ['normalize', 'block', 'inline', 'text_join'] },
      block: { rules: ['paragraph'] },
      inline: { rules: ['text'], rules2: ['balance_pairs', 'fragments_join'] },
    },
  },
  k0 = {
    options: {
      html: !0,
      xhtmlOut: !0,
      breaks: !1,
      langPrefix: 'language-',
      linkify: !1,
      typographer: !1,
      quotes: '“”‘’',
      highlight: null,
      maxNesting: 20,
    },
    components: {
      core: { rules: ['normalize', 'block', 'inline', 'text_join'] },
      block: {
        rules: [
          'blockquote',
          'code',
          'fence',
          'heading',
          'hr',
          'html_block',
          'lheading',
          'list',
          'reference',
          'paragraph',
        ],
      },
      inline: {
        rules: [
          'autolink',
          'backticks',
          'emphasis',
          'entity',
          'escape',
          'html_inline',
          'image',
          'link',
          'newline',
          'text',
        ],
        rules2: ['balance_pairs', 'emphasis', 'fragments_join'],
      },
    },
  },
  y0 = { default: x0, zero: _0, commonmark: k0 },
  v0 = /^(vbscript|javascript|file|data):/,
  w0 = /^data:image\/(gif|png|jpeg|webp);/
function E0(e) {
  const t = e.trim().toLowerCase()
  return v0.test(t) ? w0.test(t) : !0
}
const si = ['http:', 'https:', 'mailto:']
function C0(e) {
  const t = Cn(e, !0)
  if (t.hostname && (!t.protocol || si.indexOf(t.protocol) >= 0))
    try {
      t.hostname = oi.toASCII(t.hostname)
    } catch {}
  return Gt(En(t))
}
function A0(e) {
  const t = Cn(e, !0)
  if (t.hostname && (!t.protocol || si.indexOf(t.protocol) >= 0))
    try {
      t.hostname = oi.toUnicode(t.hostname)
    } catch {}
  return At(En(t), At.defaultChars + '%')
}
function ve(e, t) {
  if (!(this instanceof ve)) return new ve(e, t)
  t || Dn(e) || ((t = e || {}), (e = 'default')),
    (this.inline = new Kt()),
    (this.block = new Su()),
    (this.core = new Sn()),
    (this.renderer = new St()),
    (this.linkify = new _e()),
    (this.validateLink = E0),
    (this.normalizeLink = C0),
    (this.normalizeLinkText = A0),
    (this.utils = Fs),
    (this.helpers = Du({}, zs)),
    (this.options = {}),
    this.configure(e),
    t && this.set(t)
}
ve.prototype.set = function (e) {
  return Du(this.options, e), this
}
ve.prototype.configure = function (e) {
  const t = this
  if (Dn(e)) {
    const u = e
    if (((e = y0[u]), !e))
      throw new Error('Wrong `markdown-it` preset "' + u + '", check name')
  }
  if (!e) throw new Error("Wrong `markdown-it` preset, can't be empty")
  return (
    e.options && t.set(e.options),
    e.components &&
      Object.keys(e.components).forEach(function (u) {
        e.components[u].rules && t[u].ruler.enableOnly(e.components[u].rules),
          e.components[u].rules2 &&
            t[u].ruler2.enableOnly(e.components[u].rules2)
      }),
    this
  )
}
ve.prototype.enable = function (e, t) {
  let u = []
  Array.isArray(e) || (e = [e]),
    ['core', 'block', 'inline'].forEach(function (i) {
      u = u.concat(this[i].ruler.enable(e, !0))
    }, this),
    (u = u.concat(this.inline.ruler2.enable(e, !0)))
  const n = e.filter(function (i) {
    return u.indexOf(i) < 0
  })
  if (n.length && !t)
    throw new Error('MarkdownIt. Failed to enable unknown rule(s): ' + n)
  return this
}
ve.prototype.disable = function (e, t) {
  let u = []
  Array.isArray(e) || (e = [e]),
    ['core', 'block', 'inline'].forEach(function (i) {
      u = u.concat(this[i].ruler.disable(e, !0))
    }, this),
    (u = u.concat(this.inline.ruler2.disable(e, !0)))
  const n = e.filter(function (i) {
    return u.indexOf(i) < 0
  })
  if (n.length && !t)
    throw new Error('MarkdownIt. Failed to disable unknown rule(s): ' + n)
  return this
}
ve.prototype.use = function (e) {
  const t = [this].concat(Array.prototype.slice.call(arguments, 1))
  return e.apply(e, t), this
}
ve.prototype.parse = function (e, t) {
  if (typeof e != 'string') throw new Error('Input data should be a String')
  const u = new this.core.State(e, this, t)
  return this.core.process(u), u.tokens
}
ve.prototype.render = function (e, t) {
  return (t = t || {}), this.renderer.render(this.parse(e, t), this.options, t)
}
ve.prototype.parseInline = function (e, t) {
  const u = new this.core.State(e, this, t)
  return (u.inlineMode = !0), this.core.process(u), u.tokens
}
ve.prototype.renderInline = function (e, t) {
  return (
    (t = t || {}), this.renderer.render(this.parseInline(e, t), this.options, t)
  )
}
const mr = new Set([!0, !1, 'alt', 'title'])
function ai(e, t) {
  return (Array.isArray(e) ? e : []).filter(([u]) => u !== t)
}
function ci(e, t) {
  e && e.attrs && (e.attrs = ai(e.attrs, t))
}
function D0(e, t) {
  if (!mr.has(e)) throw new TypeError(`figcaption must be one of: ${[...mr]}.`)
  if (e === 'alt') return t.content
  const u = t.attrs.find(([n]) => n === 'title')
  return Array.isArray(u) && u[1] ? (ci(t, 'title'), u[1]) : void 0
}
function F0(e, t) {
  ;(t = t || {}),
    e.core.ruler.before('linkify', 'image_figures', function (u) {
      let n = 1
      for (let i = 1, r = u.tokens.length; i < r - 1; ++i) {
        const o = u.tokens[i]
        if (
          o.type !== 'inline' ||
          !o.children ||
          (o.children.length !== 1 && o.children.length !== 3) ||
          (o.children.length === 1 && o.children[0].type !== 'image')
        )
          continue
        if (o.children.length === 3) {
          const [c, l, d] = o.children
          if (
            c.type !== 'link_open' ||
            l.type !== 'image' ||
            d.type !== 'link_close'
          )
            continue
        }
        if (
          (i !== 0 && u.tokens[i - 1].type !== 'paragraph_open') ||
          (i !== r - 1 && u.tokens[i + 1].type !== 'paragraph_close')
        )
          continue
        const s = u.tokens[i - 1]
        let a
        if (
          ((s.type = 'figure_open'),
          (s.tag = 'figure'),
          (u.tokens[i + 1].type = 'figure_close'),
          (u.tokens[i + 1].tag = 'figure'),
          t.dataType && u.tokens[i - 1].attrPush(['data-type', 'image']),
          t.link && o.children.length === 1)
        ) {
          ;[a] = o.children
          const c = new u.Token('link_open', 'a', 1)
          c.attrPush(['href', a.attrGet('src')]),
            o.children.unshift(c),
            o.children.push(new u.Token('link_close', 'a', -1))
        }
        if (
          ((a = o.children.length === 1 ? o.children[0] : o.children[1]),
          t.figcaption)
        ) {
          const c = D0(t.figcaption, a)
          if (c) {
            const [l] = e.parseInline(c, u.env)
            o.children.push(new u.Token('figcaption_open', 'figcaption', 1)),
              o.children.push(...l.children),
              o.children.push(
                new u.Token('figcaption_close', 'figcaption', -1),
              ),
              a.attrs && (a.attrs = ai(a.attrs, 'title'))
          }
        }
        if (t.copyAttrs && a.attrs) {
          const c = t.copyAttrs === !0 ? '' : t.copyAttrs
          s.attrs = a.attrs
            .filter(([l]) => l.match(c))
            .map((l) => Array.from(l))
        }
        if (
          (t.tabindex && (u.tokens[i - 1].attrPush(['tabindex', n]), n++),
          t.lazy &&
            (a.attrs.some(([c]) => c === 'loading') ||
              a.attrs.push(['loading', 'lazy'])),
          t.async &&
            (a.attrs.some(([c]) => c === 'decoding') ||
              a.attrs.push(['decoding', 'async'])),
          t.classes && typeof t.classes == 'string')
        ) {
          let c = !1
          for (let l = 0, d = a.attrs.length; l < d && !c; l++) {
            const m = a.attrs[l]
            m[0] === 'class' && ((m[1] = `${m[1]} ${t.classes}`), (c = !0))
          }
          c || a.attrs.push(['class', t.classes])
        }
        if (t.removeSrc) {
          const c = a.attrs.find(([l]) => l === 'src')
          a.attrs.push(['data-src', c[1]]), ci(a, 'src')
        }
      }
    })
}
var an = !0,
  li = !1,
  di = !1,
  S0 = function (e, t) {
    t && ((an = !t.enabled), (li = !!t.label), (di = !!t.labelAfter)),
      e.core.ruler.after('inline', 'github-task-lists', function (u) {
        for (var n = u.tokens, i = 2; i < n.length; i++)
          I0(n, i) &&
            (z0(n[i], u.Token),
            br(n[i - 2], 'class', 'task-list-item' + (an ? '' : ' enabled')),
            br(n[T0(n, i - 2)], 'class', 'contains-task-list'))
      })
  }
function br(e, t, u) {
  var n = e.attrIndex(t),
    i = [t, u]
  n < 0 ? e.attrPush(i) : (e.attrs[n] = i)
}
function T0(e, t) {
  for (var u = e[t].level - 1, n = t - 1; n >= 0; n--)
    if (e[n].level === u) return n
  return -1
}
function I0(e, t) {
  return O0(e[t]) && B0(e[t - 1]) && P0(e[t - 2]) && $0(e[t])
}
function z0(e, t) {
  if (
    (e.children.unshift(L0(e, t)),
    (e.children[1].content = e.children[1].content.slice(3)),
    (e.content = e.content.slice(3)),
    li)
  )
    if (di) {
      e.children.pop()
      var u = 'task-item-' + Math.ceil(Math.random() * (1e4 * 1e3) - 1e3)
      ;(e.children[0].content =
        e.children[0].content.slice(0, -1) + ' id="' + u + '">'),
        e.children.push(R0(e.content, u, t))
    } else e.children.unshift(j0(t)), e.children.push(M0(t))
}
function L0(e, t) {
  var u = new t('html_inline', '', 0),
    n = an ? ' disabled="" ' : ''
  return (
    e.content.indexOf('[ ] ') === 0
      ? (u.content =
          '<input class="task-list-item-checkbox"' + n + 'type="checkbox">')
      : (e.content.indexOf('[x] ') === 0 || e.content.indexOf('[X] ') === 0) &&
        (u.content =
          '<input class="task-list-item-checkbox" checked=""' +
          n +
          'type="checkbox">'),
    u
  )
}
function j0(e) {
  var t = new e('html_inline', '', 0)
  return (t.content = '<label>'), t
}
function M0(e) {
  var t = new e('html_inline', '', 0)
  return (t.content = '</label>'), t
}
function R0(e, t, u) {
  var n = new u('html_inline', '', 0)
  return (
    (n.content =
      '<label class="task-list-item-label" for="' + t + '">' + e + '</label>'),
    (n.attrs = [{ for: t }]),
    n
  )
}
function O0(e) {
  return e.type === 'inline'
}
function B0(e) {
  return e.type === 'paragraph_open'
}
function P0(e) {
  return e.type === 'list_item_open'
}
function $0(e) {
  return (
    e.content.indexOf('[ ] ') === 0 ||
    e.content.indexOf('[x] ') === 0 ||
    e.content.indexOf('[X] ') === 0
  )
}
const N0 = vn(S0)
var cn = { exports: {} },
  K = {},
  ln = { exports: {} },
  ht = {}
function fi() {
  var e = {}
  return (
    (e['align-content'] = !1),
    (e['align-items'] = !1),
    (e['align-self'] = !1),
    (e['alignment-adjust'] = !1),
    (e['alignment-baseline'] = !1),
    (e.all = !1),
    (e['anchor-point'] = !1),
    (e.animation = !1),
    (e['animation-delay'] = !1),
    (e['animation-direction'] = !1),
    (e['animation-duration'] = !1),
    (e['animation-fill-mode'] = !1),
    (e['animation-iteration-count'] = !1),
    (e['animation-name'] = !1),
    (e['animation-play-state'] = !1),
    (e['animation-timing-function'] = !1),
    (e.azimuth = !1),
    (e['backface-visibility'] = !1),
    (e.background = !0),
    (e['background-attachment'] = !0),
    (e['background-clip'] = !0),
    (e['background-color'] = !0),
    (e['background-image'] = !0),
    (e['background-origin'] = !0),
    (e['background-position'] = !0),
    (e['background-repeat'] = !0),
    (e['background-size'] = !0),
    (e['baseline-shift'] = !1),
    (e.binding = !1),
    (e.bleed = !1),
    (e['bookmark-label'] = !1),
    (e['bookmark-level'] = !1),
    (e['bookmark-state'] = !1),
    (e.border = !0),
    (e['border-bottom'] = !0),
    (e['border-bottom-color'] = !0),
    (e['border-bottom-left-radius'] = !0),
    (e['border-bottom-right-radius'] = !0),
    (e['border-bottom-style'] = !0),
    (e['border-bottom-width'] = !0),
    (e['border-collapse'] = !0),
    (e['border-color'] = !0),
    (e['border-image'] = !0),
    (e['border-image-outset'] = !0),
    (e['border-image-repeat'] = !0),
    (e['border-image-slice'] = !0),
    (e['border-image-source'] = !0),
    (e['border-image-width'] = !0),
    (e['border-left'] = !0),
    (e['border-left-color'] = !0),
    (e['border-left-style'] = !0),
    (e['border-left-width'] = !0),
    (e['border-radius'] = !0),
    (e['border-right'] = !0),
    (e['border-right-color'] = !0),
    (e['border-right-style'] = !0),
    (e['border-right-width'] = !0),
    (e['border-spacing'] = !0),
    (e['border-style'] = !0),
    (e['border-top'] = !0),
    (e['border-top-color'] = !0),
    (e['border-top-left-radius'] = !0),
    (e['border-top-right-radius'] = !0),
    (e['border-top-style'] = !0),
    (e['border-top-width'] = !0),
    (e['border-width'] = !0),
    (e.bottom = !1),
    (e['box-decoration-break'] = !0),
    (e['box-shadow'] = !0),
    (e['box-sizing'] = !0),
    (e['box-snap'] = !0),
    (e['box-suppress'] = !0),
    (e['break-after'] = !0),
    (e['break-before'] = !0),
    (e['break-inside'] = !0),
    (e['caption-side'] = !1),
    (e.chains = !1),
    (e.clear = !0),
    (e.clip = !1),
    (e['clip-path'] = !1),
    (e['clip-rule'] = !1),
    (e.color = !0),
    (e['color-interpolation-filters'] = !0),
    (e['column-count'] = !1),
    (e['column-fill'] = !1),
    (e['column-gap'] = !1),
    (e['column-rule'] = !1),
    (e['column-rule-color'] = !1),
    (e['column-rule-style'] = !1),
    (e['column-rule-width'] = !1),
    (e['column-span'] = !1),
    (e['column-width'] = !1),
    (e.columns = !1),
    (e.contain = !1),
    (e.content = !1),
    (e['counter-increment'] = !1),
    (e['counter-reset'] = !1),
    (e['counter-set'] = !1),
    (e.crop = !1),
    (e.cue = !1),
    (e['cue-after'] = !1),
    (e['cue-before'] = !1),
    (e.cursor = !1),
    (e.direction = !1),
    (e.display = !0),
    (e['display-inside'] = !0),
    (e['display-list'] = !0),
    (e['display-outside'] = !0),
    (e['dominant-baseline'] = !1),
    (e.elevation = !1),
    (e['empty-cells'] = !1),
    (e.filter = !1),
    (e.flex = !1),
    (e['flex-basis'] = !1),
    (e['flex-direction'] = !1),
    (e['flex-flow'] = !1),
    (e['flex-grow'] = !1),
    (e['flex-shrink'] = !1),
    (e['flex-wrap'] = !1),
    (e.float = !1),
    (e['float-offset'] = !1),
    (e['flood-color'] = !1),
    (e['flood-opacity'] = !1),
    (e['flow-from'] = !1),
    (e['flow-into'] = !1),
    (e.font = !0),
    (e['font-family'] = !0),
    (e['font-feature-settings'] = !0),
    (e['font-kerning'] = !0),
    (e['font-language-override'] = !0),
    (e['font-size'] = !0),
    (e['font-size-adjust'] = !0),
    (e['font-stretch'] = !0),
    (e['font-style'] = !0),
    (e['font-synthesis'] = !0),
    (e['font-variant'] = !0),
    (e['font-variant-alternates'] = !0),
    (e['font-variant-caps'] = !0),
    (e['font-variant-east-asian'] = !0),
    (e['font-variant-ligatures'] = !0),
    (e['font-variant-numeric'] = !0),
    (e['font-variant-position'] = !0),
    (e['font-weight'] = !0),
    (e.grid = !1),
    (e['grid-area'] = !1),
    (e['grid-auto-columns'] = !1),
    (e['grid-auto-flow'] = !1),
    (e['grid-auto-rows'] = !1),
    (e['grid-column'] = !1),
    (e['grid-column-end'] = !1),
    (e['grid-column-start'] = !1),
    (e['grid-row'] = !1),
    (e['grid-row-end'] = !1),
    (e['grid-row-start'] = !1),
    (e['grid-template'] = !1),
    (e['grid-template-areas'] = !1),
    (e['grid-template-columns'] = !1),
    (e['grid-template-rows'] = !1),
    (e['hanging-punctuation'] = !1),
    (e.height = !0),
    (e.hyphens = !1),
    (e.icon = !1),
    (e['image-orientation'] = !1),
    (e['image-resolution'] = !1),
    (e['ime-mode'] = !1),
    (e['initial-letters'] = !1),
    (e['inline-box-align'] = !1),
    (e['justify-content'] = !1),
    (e['justify-items'] = !1),
    (e['justify-self'] = !1),
    (e.left = !1),
    (e['letter-spacing'] = !0),
    (e['lighting-color'] = !0),
    (e['line-box-contain'] = !1),
    (e['line-break'] = !1),
    (e['line-grid'] = !1),
    (e['line-height'] = !1),
    (e['line-snap'] = !1),
    (e['line-stacking'] = !1),
    (e['line-stacking-ruby'] = !1),
    (e['line-stacking-shift'] = !1),
    (e['line-stacking-strategy'] = !1),
    (e['list-style'] = !0),
    (e['list-style-image'] = !0),
    (e['list-style-position'] = !0),
    (e['list-style-type'] = !0),
    (e.margin = !0),
    (e['margin-bottom'] = !0),
    (e['margin-left'] = !0),
    (e['margin-right'] = !0),
    (e['margin-top'] = !0),
    (e['marker-offset'] = !1),
    (e['marker-side'] = !1),
    (e.marks = !1),
    (e.mask = !1),
    (e['mask-box'] = !1),
    (e['mask-box-outset'] = !1),
    (e['mask-box-repeat'] = !1),
    (e['mask-box-slice'] = !1),
    (e['mask-box-source'] = !1),
    (e['mask-box-width'] = !1),
    (e['mask-clip'] = !1),
    (e['mask-image'] = !1),
    (e['mask-origin'] = !1),
    (e['mask-position'] = !1),
    (e['mask-repeat'] = !1),
    (e['mask-size'] = !1),
    (e['mask-source-type'] = !1),
    (e['mask-type'] = !1),
    (e['max-height'] = !0),
    (e['max-lines'] = !1),
    (e['max-width'] = !0),
    (e['min-height'] = !0),
    (e['min-width'] = !0),
    (e['move-to'] = !1),
    (e['nav-down'] = !1),
    (e['nav-index'] = !1),
    (e['nav-left'] = !1),
    (e['nav-right'] = !1),
    (e['nav-up'] = !1),
    (e['object-fit'] = !1),
    (e['object-position'] = !1),
    (e.opacity = !1),
    (e.order = !1),
    (e.orphans = !1),
    (e.outline = !1),
    (e['outline-color'] = !1),
    (e['outline-offset'] = !1),
    (e['outline-style'] = !1),
    (e['outline-width'] = !1),
    (e.overflow = !1),
    (e['overflow-wrap'] = !1),
    (e['overflow-x'] = !1),
    (e['overflow-y'] = !1),
    (e.padding = !0),
    (e['padding-bottom'] = !0),
    (e['padding-left'] = !0),
    (e['padding-right'] = !0),
    (e['padding-top'] = !0),
    (e.page = !1),
    (e['page-break-after'] = !1),
    (e['page-break-before'] = !1),
    (e['page-break-inside'] = !1),
    (e['page-policy'] = !1),
    (e.pause = !1),
    (e['pause-after'] = !1),
    (e['pause-before'] = !1),
    (e.perspective = !1),
    (e['perspective-origin'] = !1),
    (e.pitch = !1),
    (e['pitch-range'] = !1),
    (e['play-during'] = !1),
    (e.position = !1),
    (e['presentation-level'] = !1),
    (e.quotes = !1),
    (e['region-fragment'] = !1),
    (e.resize = !1),
    (e.rest = !1),
    (e['rest-after'] = !1),
    (e['rest-before'] = !1),
    (e.richness = !1),
    (e.right = !1),
    (e.rotation = !1),
    (e['rotation-point'] = !1),
    (e['ruby-align'] = !1),
    (e['ruby-merge'] = !1),
    (e['ruby-position'] = !1),
    (e['shape-image-threshold'] = !1),
    (e['shape-outside'] = !1),
    (e['shape-margin'] = !1),
    (e.size = !1),
    (e.speak = !1),
    (e['speak-as'] = !1),
    (e['speak-header'] = !1),
    (e['speak-numeral'] = !1),
    (e['speak-punctuation'] = !1),
    (e['speech-rate'] = !1),
    (e.stress = !1),
    (e['string-set'] = !1),
    (e['tab-size'] = !1),
    (e['table-layout'] = !1),
    (e['text-align'] = !0),
    (e['text-align-last'] = !0),
    (e['text-combine-upright'] = !0),
    (e['text-decoration'] = !0),
    (e['text-decoration-color'] = !0),
    (e['text-decoration-line'] = !0),
    (e['text-decoration-skip'] = !0),
    (e['text-decoration-style'] = !0),
    (e['text-emphasis'] = !0),
    (e['text-emphasis-color'] = !0),
    (e['text-emphasis-position'] = !0),
    (e['text-emphasis-style'] = !0),
    (e['text-height'] = !0),
    (e['text-indent'] = !0),
    (e['text-justify'] = !0),
    (e['text-orientation'] = !0),
    (e['text-overflow'] = !0),
    (e['text-shadow'] = !0),
    (e['text-space-collapse'] = !0),
    (e['text-transform'] = !0),
    (e['text-underline-position'] = !0),
    (e['text-wrap'] = !0),
    (e.top = !1),
    (e.transform = !1),
    (e['transform-origin'] = !1),
    (e['transform-style'] = !1),
    (e.transition = !1),
    (e['transition-delay'] = !1),
    (e['transition-duration'] = !1),
    (e['transition-property'] = !1),
    (e['transition-timing-function'] = !1),
    (e['unicode-bidi'] = !1),
    (e['vertical-align'] = !1),
    (e.visibility = !1),
    (e['voice-balance'] = !1),
    (e['voice-duration'] = !1),
    (e['voice-family'] = !1),
    (e['voice-pitch'] = !1),
    (e['voice-range'] = !1),
    (e['voice-rate'] = !1),
    (e['voice-stress'] = !1),
    (e['voice-volume'] = !1),
    (e.volume = !1),
    (e['white-space'] = !1),
    (e.widows = !1),
    (e.width = !0),
    (e['will-change'] = !1),
    (e['word-break'] = !0),
    (e['word-spacing'] = !0),
    (e['word-wrap'] = !0),
    (e['wrap-flow'] = !1),
    (e['wrap-through'] = !1),
    (e['writing-mode'] = !1),
    (e['z-index'] = !1),
    e
  )
}
function q0(e, t, u) {}
function H0(e, t, u) {}
var U0 = /javascript\s*\:/gim
function V0(e, t) {
  return U0.test(t) ? '' : t
}
ht.whiteList = fi()
ht.getDefaultWhiteList = fi
ht.onAttr = q0
ht.onIgnoreAttr = H0
ht.safeAttrValue = V0
var W0 = {
    indexOf: function (e, t) {
      var u, n
      if (Array.prototype.indexOf) return e.indexOf(t)
      for (u = 0, n = e.length; u < n; u++) if (e[u] === t) return u
      return -1
    },
    forEach: function (e, t, u) {
      var n, i
      if (Array.prototype.forEach) return e.forEach(t, u)
      for (n = 0, i = e.length; n < i; n++) t.call(u, e[n], n, e)
    },
    trim: function (e) {
      return String.prototype.trim ? e.trim() : e.replace(/(^\s*)|(\s*$)/g, '')
    },
    trimRight: function (e) {
      return String.prototype.trimRight
        ? e.trimRight()
        : e.replace(/(\s*$)/g, '')
    },
  },
  Lt = W0
function G0(e, t) {
  ;(e = Lt.trimRight(e)), e[e.length - 1] !== ';' && (e += ';')
  var u = e.length,
    n = !1,
    i = 0,
    r = 0,
    o = ''
  function s() {
    if (!n) {
      var l = Lt.trim(e.slice(i, r)),
        d = l.indexOf(':')
      if (d !== -1) {
        var m = Lt.trim(l.slice(0, d)),
          p = Lt.trim(l.slice(d + 1))
        if (m) {
          var h = t(i, o.length, m, p, l)
          h && (o += h + '; ')
        }
      }
    }
    i = r + 1
  }
  for (; r < u; r++) {
    var a = e[r]
    if (a === '/' && e[r + 1] === '*') {
      var c = e.indexOf('*/', r + 2)
      if (c === -1) break
      ;(r = c + 1), (i = r + 1), (n = !1)
    } else
      a === '('
        ? (n = !0)
        : a === ')'
          ? (n = !1)
          : a === ';'
            ? n || s()
            : a ===
                `
` && s()
  }
  return Lt.trim(o)
}
var Z0 = G0,
  uu = ht,
  K0 = Z0
function gr(e) {
  return e == null
}
function X0(e) {
  var t = {}
  for (var u in e) t[u] = e[u]
  return t
}
function hi(e) {
  ;(e = X0(e || {})),
    (e.whiteList = e.whiteList || uu.whiteList),
    (e.onAttr = e.onAttr || uu.onAttr),
    (e.onIgnoreAttr = e.onIgnoreAttr || uu.onIgnoreAttr),
    (e.safeAttrValue = e.safeAttrValue || uu.safeAttrValue),
    (this.options = e)
}
hi.prototype.process = function (e) {
  if (((e = e || ''), (e = e.toString()), !e)) return ''
  var t = this,
    u = t.options,
    n = u.whiteList,
    i = u.onAttr,
    r = u.onIgnoreAttr,
    o = u.safeAttrValue,
    s = K0(e, function (a, c, l, d, m) {
      var p = n[l],
        h = !1
      if (
        (p === !0
          ? (h = p)
          : typeof p == 'function'
            ? (h = p(d))
            : p instanceof RegExp && (h = p.test(d)),
        h !== !0 && (h = !1),
        (d = o(l, d)),
        !!d)
      ) {
        var _ = { position: c, sourcePosition: a, source: m, isWhite: h }
        if (h) {
          var b = i(l, d, _)
          return gr(b) ? l + ':' + d : b
        } else {
          var b = r(l, d, _)
          if (!gr(b)) return b
        }
      }
    })
  return s
}
var Q0 = hi
;(function (e, t) {
  var u = ht,
    n = Q0
  function i(o, s) {
    var a = new n(s)
    return a.process(o)
  }
  ;(t = e.exports = i), (t.FilterCSS = n)
  for (var r in u) t[r] = u[r]
  typeof window < 'u' && (window.filterCSS = e.exports)
})(ln, ln.exports)
var zn = ln.exports,
  Ln = {
    indexOf: function (e, t) {
      var u, n
      if (Array.prototype.indexOf) return e.indexOf(t)
      for (u = 0, n = e.length; u < n; u++) if (e[u] === t) return u
      return -1
    },
    forEach: function (e, t, u) {
      var n, i
      if (Array.prototype.forEach) return e.forEach(t, u)
      for (n = 0, i = e.length; n < i; n++) t.call(u, e[n], n, e)
    },
    trim: function (e) {
      return String.prototype.trim ? e.trim() : e.replace(/(^\s*)|(\s*$)/g, '')
    },
    spaceIndex: function (e) {
      var t = /\s|\n|\t/,
        u = t.exec(e)
      return u ? u.index : -1
    },
  },
  Y0 = zn.FilterCSS,
  J0 = zn.getDefaultWhiteList,
  yu = Ln
function pi() {
  return {
    a: ['target', 'href', 'title'],
    abbr: ['title'],
    address: [],
    area: ['shape', 'coords', 'href', 'alt'],
    article: [],
    aside: [],
    audio: [
      'autoplay',
      'controls',
      'crossorigin',
      'loop',
      'muted',
      'preload',
      'src',
    ],
    b: [],
    bdi: ['dir'],
    bdo: ['dir'],
    big: [],
    blockquote: ['cite'],
    br: [],
    caption: [],
    center: [],
    cite: [],
    code: [],
    col: ['align', 'valign', 'span', 'width'],
    colgroup: ['align', 'valign', 'span', 'width'],
    dd: [],
    del: ['datetime'],
    details: ['open'],
    div: [],
    dl: [],
    dt: [],
    em: [],
    figcaption: [],
    figure: [],
    font: ['color', 'size', 'face'],
    footer: [],
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
    header: [],
    hr: [],
    i: [],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    ins: ['datetime'],
    kbd: [],
    li: [],
    mark: [],
    nav: [],
    ol: [],
    p: [],
    pre: [],
    s: [],
    section: [],
    small: [],
    span: [],
    sub: [],
    summary: [],
    sup: [],
    strong: [],
    strike: [],
    table: ['width', 'border', 'align', 'valign'],
    tbody: ['align', 'valign'],
    td: ['width', 'rowspan', 'colspan', 'align', 'valign'],
    tfoot: ['align', 'valign'],
    th: ['width', 'rowspan', 'colspan', 'align', 'valign'],
    thead: ['align', 'valign'],
    tr: ['rowspan', 'align', 'valign'],
    tt: [],
    u: [],
    ul: [],
    video: [
      'autoplay',
      'controls',
      'crossorigin',
      'loop',
      'muted',
      'playsinline',
      'poster',
      'preload',
      'src',
      'height',
      'width',
    ],
  }
}
var mi = new Y0()
function ec(e, t, u) {}
function tc(e, t, u) {}
function uc(e, t, u) {}
function nc(e, t, u) {}
function bi(e) {
  return e.replace(ic, '&lt;').replace(oc, '&gt;')
}
function rc(e, t, u, n) {
  if (((u = vi(u)), t === 'href' || t === 'src')) {
    if (((u = yu.trim(u)), u === '#')) return '#'
    if (
      !(
        u.substr(0, 7) === 'http://' ||
        u.substr(0, 8) === 'https://' ||
        u.substr(0, 7) === 'mailto:' ||
        u.substr(0, 4) === 'tel:' ||
        u.substr(0, 11) === 'data:image/' ||
        u.substr(0, 6) === 'ftp://' ||
        u.substr(0, 2) === './' ||
        u.substr(0, 3) === '../' ||
        u[0] === '#' ||
        u[0] === '/'
      )
    )
      return ''
  } else if (t === 'background') {
    if (((nu.lastIndex = 0), nu.test(u))) return ''
  } else if (t === 'style') {
    if (
      ((xr.lastIndex = 0),
      xr.test(u) ||
        ((_r.lastIndex = 0), _r.test(u) && ((nu.lastIndex = 0), nu.test(u))))
    )
      return ''
    n !== !1 && ((n = n || mi), (u = n.process(u)))
  }
  return (u = wi(u)), u
}
var ic = /</g,
  oc = />/g,
  sc = /"/g,
  ac = /&quot;/g,
  cc = /&#([a-zA-Z0-9]*);?/gim,
  lc = /&colon;?/gim,
  dc = /&newline;?/gim,
  nu =
    /((j\s*a\s*v\s*a|v\s*b|l\s*i\s*v\s*e)\s*s\s*c\s*r\s*i\s*p\s*t\s*|m\s*o\s*c\s*h\s*a):/gi,
  xr = /e\s*x\s*p\s*r\s*e\s*s\s*s\s*i\s*o\s*n\s*\(.*/gi,
  _r = /u\s*r\s*l\s*\(.*/gi
function gi(e) {
  return e.replace(sc, '&quot;')
}
function xi(e) {
  return e.replace(ac, '"')
}
function _i(e) {
  return e.replace(cc, function (u, n) {
    return n[0] === 'x' || n[0] === 'X'
      ? String.fromCharCode(parseInt(n.substr(1), 16))
      : String.fromCharCode(parseInt(n, 10))
  })
}
function ki(e) {
  return e.replace(lc, ':').replace(dc, ' ')
}
function yi(e) {
  for (var t = '', u = 0, n = e.length; u < n; u++)
    t += e.charCodeAt(u) < 32 ? ' ' : e.charAt(u)
  return yu.trim(t)
}
function vi(e) {
  return (e = xi(e)), (e = _i(e)), (e = ki(e)), (e = yi(e)), e
}
function wi(e) {
  return (e = gi(e)), (e = bi(e)), e
}
function fc() {
  return ''
}
function hc(e, t) {
  typeof t != 'function' && (t = function () {})
  var u = !Array.isArray(e)
  function n(o) {
    return u ? !0 : yu.indexOf(e, o) !== -1
  }
  var i = [],
    r = !1
  return {
    onIgnoreTag: function (o, s, a) {
      if (n(o))
        if (a.isClosing) {
          var c = '[/removed]',
            l = a.position + c.length
          return i.push([r !== !1 ? r : a.position, l]), (r = !1), c
        } else return r || (r = a.position), '[removed]'
      else return t(o, s, a)
    },
    remove: function (o) {
      var s = '',
        a = 0
      return (
        yu.forEach(i, function (c) {
          ;(s += o.slice(a, c[0])), (a = c[1])
        }),
        (s += o.slice(a)),
        s
      )
    },
  }
}
function pc(e) {
  for (var t = '', u = 0; u < e.length; ) {
    var n = e.indexOf('<!--', u)
    if (n === -1) {
      t += e.slice(u)
      break
    }
    t += e.slice(u, n)
    var i = e.indexOf('-->', n)
    if (i === -1) break
    u = i + 3
  }
  return t
}
function mc(e) {
  var t = e.split('')
  return (
    (t = t.filter(function (u) {
      var n = u.charCodeAt(0)
      return n === 127 ? !1 : n <= 31 ? n === 10 || n === 13 : !0
    })),
    t.join('')
  )
}
K.whiteList = pi()
K.getDefaultWhiteList = pi
K.onTag = ec
K.onIgnoreTag = tc
K.onTagAttr = uc
K.onIgnoreTagAttr = nc
K.safeAttrValue = rc
K.escapeHtml = bi
K.escapeQuote = gi
K.unescapeQuote = xi
K.escapeHtmlEntities = _i
K.escapeDangerHtml5Entities = ki
K.clearNonPrintableCharacter = yi
K.friendlyAttrValue = vi
K.escapeAttrValue = wi
K.onIgnoreTagStripAll = fc
K.StripTagBody = hc
K.stripCommentTag = pc
K.stripBlankChar = mc
K.attributeWrapSign = '"'
K.cssFilter = mi
K.getDefaultCSSWhiteList = J0
var Iu = {},
  Ke = Ln
function bc(e) {
  var t = Ke.spaceIndex(e),
    u
  return (
    t === -1 ? (u = e.slice(1, -1)) : (u = e.slice(1, t + 1)),
    (u = Ke.trim(u).toLowerCase()),
    u.slice(0, 1) === '/' && (u = u.slice(1)),
    u.slice(-1) === '/' && (u = u.slice(0, -1)),
    u
  )
}
function gc(e) {
  return e.slice(0, 2) === '</'
}
function xc(e, t, u) {
  var n = '',
    i = 0,
    r = !1,
    o = !1,
    s = 0,
    a = e.length,
    c = '',
    l = ''
  e: for (s = 0; s < a; s++) {
    var d = e.charAt(s)
    if (r === !1) {
      if (d === '<') {
        r = s
        continue
      }
    } else if (o === !1) {
      if (d === '<') {
        ;(n += u(e.slice(i, s))), (r = s), (i = s)
        continue
      }
      if (d === '>' || s === a - 1) {
        ;(n += u(e.slice(i, r))),
          (l = e.slice(r, s + 1)),
          (c = bc(l)),
          (n += t(r, n.length, c, l, gc(l))),
          (i = s + 1),
          (r = !1)
        continue
      }
      if (d === '"' || d === "'")
        for (var m = 1, p = e.charAt(s - m); p.trim() === '' || p === '='; ) {
          if (p === '=') {
            o = d
            continue e
          }
          p = e.charAt(s - ++m)
        }
    } else if (d === o) {
      o = !1
      continue
    }
  }
  return i < a && (n += u(e.substr(i))), n
}
var _c = /[^a-zA-Z0-9\\_:.-]/gim
function kc(e, t) {
  var u = 0,
    n = 0,
    i = [],
    r = !1,
    o = e.length
  function s(m, p) {
    if (
      ((m = Ke.trim(m)), (m = m.replace(_c, '').toLowerCase()), !(m.length < 1))
    ) {
      var h = t(m, p || '')
      h && i.push(h)
    }
  }
  for (var a = 0; a < o; a++) {
    var c = e.charAt(a),
      l,
      d
    if (r === !1 && c === '=') {
      ;(r = e.slice(u, a)),
        (u = a + 1),
        (n = e.charAt(u) === '"' || e.charAt(u) === "'" ? u : vc(e, a + 1))
      continue
    }
    if (r !== !1 && a === n) {
      if (((d = e.indexOf(c, a + 1)), d === -1)) break
      ;(l = Ke.trim(e.slice(n + 1, d))), s(r, l), (r = !1), (a = d), (u = a + 1)
      continue
    }
    if (/\s|\n|\t/.test(c))
      if (((e = e.replace(/\s|\n|\t/g, ' ')), r === !1))
        if (((d = yc(e, a)), d === -1)) {
          ;(l = Ke.trim(e.slice(u, a))), s(l), (r = !1), (u = a + 1)
          continue
        } else {
          a = d - 1
          continue
        }
      else if (((d = wc(e, a - 1)), d === -1)) {
        ;(l = Ke.trim(e.slice(u, a))),
          (l = kr(l)),
          s(r, l),
          (r = !1),
          (u = a + 1)
        continue
      } else continue
  }
  return (
    u < e.length && (r === !1 ? s(e.slice(u)) : s(r, kr(Ke.trim(e.slice(u))))),
    Ke.trim(i.join(' '))
  )
}
function yc(e, t) {
  for (; t < e.length; t++) {
    var u = e[t]
    if (u !== ' ') return u === '=' ? t : -1
  }
}
function vc(e, t) {
  for (; t < e.length; t++) {
    var u = e[t]
    if (u !== ' ') return u === "'" || u === '"' ? t : -1
  }
}
function wc(e, t) {
  for (; t > 0; t--) {
    var u = e[t]
    if (u !== ' ') return u === '=' ? t : -1
  }
}
function Ec(e) {
  return (
    (e[0] === '"' && e[e.length - 1] === '"') ||
    (e[0] === "'" && e[e.length - 1] === "'")
  )
}
function kr(e) {
  return Ec(e) ? e.substr(1, e.length - 2) : e
}
Iu.parseTag = xc
Iu.parseAttr = kc
var Cc = zn.FilterCSS,
  ke = K,
  Ei = Iu,
  Ac = Ei.parseTag,
  Dc = Ei.parseAttr,
  lu = Ln
function ru(e) {
  return e == null
}
function Fc(e) {
  var t = lu.spaceIndex(e)
  if (t === -1) return { html: '', closing: e[e.length - 2] === '/' }
  e = lu.trim(e.slice(t + 1, -1))
  var u = e[e.length - 1] === '/'
  return u && (e = lu.trim(e.slice(0, -1))), { html: e, closing: u }
}
function Sc(e) {
  var t = {}
  for (var u in e) t[u] = e[u]
  return t
}
function Tc(e) {
  var t = {}
  for (var u in e)
    Array.isArray(e[u])
      ? (t[u.toLowerCase()] = e[u].map(function (n) {
          return n.toLowerCase()
        }))
      : (t[u.toLowerCase()] = e[u])
  return t
}
function Ci(e) {
  ;(e = Sc(e || {})),
    e.stripIgnoreTag &&
      (e.onIgnoreTag &&
        console.error(
          'Notes: cannot use these two options "stripIgnoreTag" and "onIgnoreTag" at the same time',
        ),
      (e.onIgnoreTag = ke.onIgnoreTagStripAll)),
    e.whiteList || e.allowList
      ? (e.whiteList = Tc(e.whiteList || e.allowList))
      : (e.whiteList = ke.whiteList),
    (this.attributeWrapSign =
      e.singleQuotedAttributeValue === !0 ? "'" : ke.attributeWrapSign),
    (e.onTag = e.onTag || ke.onTag),
    (e.onTagAttr = e.onTagAttr || ke.onTagAttr),
    (e.onIgnoreTag = e.onIgnoreTag || ke.onIgnoreTag),
    (e.onIgnoreTagAttr = e.onIgnoreTagAttr || ke.onIgnoreTagAttr),
    (e.safeAttrValue = e.safeAttrValue || ke.safeAttrValue),
    (e.escapeHtml = e.escapeHtml || ke.escapeHtml),
    (this.options = e),
    e.css === !1
      ? (this.cssFilter = !1)
      : ((e.css = e.css || {}), (this.cssFilter = new Cc(e.css)))
}
Ci.prototype.process = function (e) {
  if (((e = e || ''), (e = e.toString()), !e)) return ''
  var t = this,
    u = t.options,
    n = u.whiteList,
    i = u.onTag,
    r = u.onIgnoreTag,
    o = u.onTagAttr,
    s = u.onIgnoreTagAttr,
    a = u.safeAttrValue,
    c = u.escapeHtml,
    l = t.attributeWrapSign,
    d = t.cssFilter
  u.stripBlankChar && (e = ke.stripBlankChar(e)),
    u.allowCommentTag || (e = ke.stripCommentTag(e))
  var m = !1
  u.stripIgnoreTagBody &&
    ((m = ke.StripTagBody(u.stripIgnoreTagBody, r)), (r = m.onIgnoreTag))
  var p = Ac(
    e,
    function (h, _, b, g, x) {
      var k = {
          sourcePosition: h,
          position: _,
          isClosing: x,
          isWhite: Object.prototype.hasOwnProperty.call(n, b),
        },
        w = i(b, g, k)
      if (!ru(w)) return w
      if (k.isWhite) {
        if (k.isClosing) return '</' + b + '>'
        var E = Fc(g),
          C = n[b],
          D = Dc(E.html, function (v, H) {
            var R = lu.indexOf(C, v) !== -1,
              $ = o(b, v, H, R)
            return ru($)
              ? R
                ? ((H = a(b, v, H, d)), H ? v + '=' + l + H + l : v)
                : (($ = s(b, v, H, R)), ru($) ? void 0 : $)
              : $
          })
        return (
          (g = '<' + b),
          D && (g += ' ' + D),
          E.closing && (g += ' /'),
          (g += '>'),
          g
        )
      } else return (w = r(b, g, k)), ru(w) ? c(g) : w
    },
    c,
  )
  return m && (p = m.remove(p)), p
}
var Ic = Ci
;(function (e, t) {
  var u = K,
    n = Iu,
    i = Ic
  function r(s, a) {
    var c = new i(a)
    return c.process(s)
  }
  ;(t = e.exports = r),
    (t.filterXSS = r),
    (t.FilterXSS = i),
    (function () {
      for (var s in u) t[s] = u[s]
      for (var a in n) t[a] = n[a]
    })(),
    typeof window < 'u' && (window.filterXSS = e.exports)
  function o() {
    return (
      typeof self < 'u' &&
      typeof DedicatedWorkerGlobalScope < 'u' &&
      self instanceof DedicatedWorkerGlobalScope
    )
  }
  o() && (self.filterXSS = e.exports)
})(cn, cn.exports)
var zc = cn.exports
const yr = zc
var Lc = function (t, { xss: u } = {}) {
  const n = new yr.FilterXSS(typeof u == 'function' ? u(yr) : u)
  function i(o) {
    return (o = n.process(o)), o
  }
  function r(o) {
    for (let s = 0; s < o.tokens.length; s++) {
      let a = o.tokens[s]
      if (
        (a.type === 'html_block' && (a.content = i(a.content)),
        a.type === 'inline')
      ) {
        let c = a.children
        for (let l = 0; l < c.length; l++)
          c[l].type === 'html_inline' && (c[l].content = i(c[l].content))
      }
    }
  }
  t.core.ruler.after('linkify', 'xss', r)
}
const jc = vn(Lc),
  xt =
    typeof performance == 'object' &&
    performance &&
    typeof performance.now == 'function'
      ? performance
      : Date,
  Ai = new Set(),
  dn = typeof process == 'object' && process ? process : {},
  Di = (e, t, u, n) => {
    typeof dn.emitWarning == 'function'
      ? dn.emitWarning(e, t, u, n)
      : console.error(`[${u}] ${t}: ${e}`)
  }
let vu = globalThis.AbortController,
  vr = globalThis.AbortSignal
var zr
if (typeof vu > 'u') {
  ;(vr = class {
    constructor() {
      Z(this, 'onabort')
      Z(this, '_onabort', [])
      Z(this, 'reason')
      Z(this, 'aborted', !1)
    }
    addEventListener(n, i) {
      this._onabort.push(i)
    }
  }),
    (vu = class {
      constructor() {
        Z(this, 'signal', new vr())
        t()
      }
      abort(n) {
        var i, r
        if (!this.signal.aborted) {
          ;(this.signal.reason = n), (this.signal.aborted = !0)
          for (const o of this.signal._onabort) o(n)
          ;(r = (i = this.signal).onabort) == null || r.call(i, n)
        }
      }
    })
  let e =
    ((zr = dn.env) == null ? void 0 : zr.LRU_CACHE_IGNORE_AC_WARNING) !== '1'
  const t = () => {
    e &&
      ((e = !1),
      Di(
        'AbortController is not defined. If using lru-cache in node 14, load an AbortController polyfill from the `node-abort-controller` package. A minimal polyfill is provided for use by LRUCache.fetch(), but it should not be relied upon in other contexts (eg, passing it to other APIs that use AbortController/AbortSignal might have undesirable effects). You may disable this with LRU_CACHE_IGNORE_AC_WARNING=1 in the env.',
        'NO_ABORT_CONTROLLER',
        'ENOTSUP',
        t,
      ))
  }
}
const Mc = (e) => !Ai.has(e),
  Ve = (e) => e && e === Math.floor(e) && e > 0 && isFinite(e),
  Fi = (e) =>
    Ve(e)
      ? e <= Math.pow(2, 8)
        ? Uint8Array
        : e <= Math.pow(2, 16)
          ? Uint16Array
          : e <= Math.pow(2, 32)
            ? Uint32Array
            : e <= Number.MAX_SAFE_INTEGER
              ? du
              : null
      : null
class du extends Array {
  constructor(t) {
    super(t), this.fill(0)
  }
}
var yt
const st = class st {
  constructor(t, u) {
    Z(this, 'heap')
    Z(this, 'length')
    if (!f(st, yt))
      throw new TypeError('instantiate Stack using Stack.create(n)')
    ;(this.heap = new u(t)), (this.length = 0)
  }
  static create(t) {
    const u = Fi(t)
    if (!u) return []
    T(st, yt, !0)
    const n = new st(t, u)
    return T(st, yt, !1), n
  }
  push(t) {
    this.heap[this.length++] = t
  }
  pop() {
    return this.heap[--this.length]
  }
}
;(yt = new WeakMap()), j(st, yt, !1)
let fn = st
var we,
  me,
  Ee,
  Ce,
  vt,
  ne,
  Ae,
  ee,
  G,
  L,
  de,
  be,
  le,
  oe,
  De,
  se,
  Fe,
  Se,
  ge,
  Te,
  Qe,
  fe,
  qt,
  pn,
  at,
  qe,
  Ht,
  xe,
  Au,
  Si,
  ct,
  wt,
  Ut,
  Me,
  We,
  Re,
  Ge,
  Vt,
  mn,
  t1,
  Et,
  fu,
  Ct,
  hu,
  U,
  W,
  Wt,
  bn,
  lt,
  Rt
const Pn = class Pn {
  constructor(t) {
    j(this, qt)
    j(this, Au)
    j(this, Me)
    j(this, Re)
    j(this, Vt)
    j(this, Et)
    j(this, Ct)
    j(this, U)
    j(this, Wt)
    j(this, lt)
    j(this, we, void 0)
    j(this, me, void 0)
    j(this, Ee, void 0)
    j(this, Ce, void 0)
    j(this, vt, void 0)
    Z(this, 'ttl')
    Z(this, 'ttlResolution')
    Z(this, 'ttlAutopurge')
    Z(this, 'updateAgeOnGet')
    Z(this, 'updateAgeOnHas')
    Z(this, 'allowStale')
    Z(this, 'noDisposeOnSet')
    Z(this, 'noUpdateTTL')
    Z(this, 'maxEntrySize')
    Z(this, 'sizeCalculation')
    Z(this, 'noDeleteOnFetchRejection')
    Z(this, 'noDeleteOnStaleGet')
    Z(this, 'allowStaleOnFetchAbort')
    Z(this, 'allowStaleOnFetchRejection')
    Z(this, 'ignoreFetchAbort')
    j(this, ne, void 0)
    j(this, Ae, void 0)
    j(this, ee, void 0)
    j(this, G, void 0)
    j(this, L, void 0)
    j(this, de, void 0)
    j(this, be, void 0)
    j(this, le, void 0)
    j(this, oe, void 0)
    j(this, De, void 0)
    j(this, se, void 0)
    j(this, Fe, void 0)
    j(this, Se, void 0)
    j(this, ge, void 0)
    j(this, Te, void 0)
    j(this, Qe, void 0)
    j(this, fe, void 0)
    j(this, at, () => {})
    j(this, qe, () => {})
    j(this, Ht, () => {})
    j(this, xe, () => !1)
    j(this, ct, (t) => {})
    j(this, wt, (t, u, n) => {})
    j(this, Ut, (t, u, n, i) => {
      if (n || i)
        throw new TypeError(
          'cannot set size without setting maxSize or maxEntrySize on cache',
        )
      return 0
    })
    Z(this, t1, 'LRUCache')
    const {
      max: u = 0,
      ttl: n,
      ttlResolution: i = 1,
      ttlAutopurge: r,
      updateAgeOnGet: o,
      updateAgeOnHas: s,
      allowStale: a,
      dispose: c,
      disposeAfter: l,
      noDisposeOnSet: d,
      noUpdateTTL: m,
      maxSize: p = 0,
      maxEntrySize: h = 0,
      sizeCalculation: _,
      fetchMethod: b,
      noDeleteOnFetchRejection: g,
      noDeleteOnStaleGet: x,
      allowStaleOnFetchRejection: k,
      allowStaleOnFetchAbort: w,
      ignoreFetchAbort: E,
    } = t
    if (u !== 0 && !Ve(u))
      throw new TypeError('max option must be a nonnegative integer')
    const C = u ? Fi(u) : Array
    if (!C) throw new Error('invalid max value: ' + u)
    if (
      (T(this, we, u),
      T(this, me, p),
      (this.maxEntrySize = h || f(this, me)),
      (this.sizeCalculation = _),
      this.sizeCalculation)
    ) {
      if (!f(this, me) && !this.maxEntrySize)
        throw new TypeError(
          'cannot set sizeCalculation without setting maxSize or maxEntrySize',
        )
      if (typeof this.sizeCalculation != 'function')
        throw new TypeError('sizeCalculation set to non-function')
    }
    if (b !== void 0 && typeof b != 'function')
      throw new TypeError('fetchMethod must be a function if specified')
    if (
      (T(this, vt, b),
      T(this, Qe, !!b),
      T(this, ee, new Map()),
      T(this, G, new Array(u).fill(void 0)),
      T(this, L, new Array(u).fill(void 0)),
      T(this, de, new C(u)),
      T(this, be, new C(u)),
      T(this, le, 0),
      T(this, oe, 0),
      T(this, De, fn.create(u)),
      T(this, ne, 0),
      T(this, Ae, 0),
      typeof c == 'function' && T(this, Ee, c),
      typeof l == 'function'
        ? (T(this, Ce, l), T(this, se, []))
        : (T(this, Ce, void 0), T(this, se, void 0)),
      T(this, Te, !!f(this, Ee)),
      T(this, fe, !!f(this, Ce)),
      (this.noDisposeOnSet = !!d),
      (this.noUpdateTTL = !!m),
      (this.noDeleteOnFetchRejection = !!g),
      (this.allowStaleOnFetchRejection = !!k),
      (this.allowStaleOnFetchAbort = !!w),
      (this.ignoreFetchAbort = !!E),
      this.maxEntrySize !== 0)
    ) {
      if (f(this, me) !== 0 && !Ve(f(this, me)))
        throw new TypeError('maxSize must be a positive integer if specified')
      if (!Ve(this.maxEntrySize))
        throw new TypeError(
          'maxEntrySize must be a positive integer if specified',
        )
      S(this, Au, Si).call(this)
    }
    if (
      ((this.allowStale = !!a),
      (this.noDeleteOnStaleGet = !!x),
      (this.updateAgeOnGet = !!o),
      (this.updateAgeOnHas = !!s),
      (this.ttlResolution = Ve(i) || i === 0 ? i : 1),
      (this.ttlAutopurge = !!r),
      (this.ttl = n || 0),
      this.ttl)
    ) {
      if (!Ve(this.ttl))
        throw new TypeError('ttl must be a positive integer if specified')
      S(this, qt, pn).call(this)
    }
    if (f(this, we) === 0 && this.ttl === 0 && f(this, me) === 0)
      throw new TypeError('At least one of max, maxSize, or ttl is required')
    if (!this.ttlAutopurge && !f(this, we) && !f(this, me)) {
      const D = 'LRU_CACHE_UNBOUNDED'
      Mc(D) &&
        (Ai.add(D),
        Di(
          'TTL caching without ttlAutopurge, max, or maxSize can result in unbounded memory consumption.',
          'UnboundedCacheWarning',
          D,
          Pn,
        ))
    }
  }
  static unsafeExposeInternals(t) {
    return {
      starts: f(t, Se),
      ttls: f(t, ge),
      sizes: f(t, Fe),
      keyMap: f(t, ee),
      keyList: f(t, G),
      valList: f(t, L),
      next: f(t, de),
      prev: f(t, be),
      get head() {
        return f(t, le)
      },
      get tail() {
        return f(t, oe)
      },
      free: f(t, De),
      isBackgroundFetch: (u) => {
        var n
        return S((n = t), U, W).call(n, u)
      },
      backgroundFetch: (u, n, i, r) => {
        var o
        return S((o = t), Ct, hu).call(o, u, n, i, r)
      },
      moveToTail: (u) => {
        var n
        return S((n = t), lt, Rt).call(n, u)
      },
      indexes: (u) => {
        var n
        return S((n = t), Me, We).call(n, u)
      },
      rindexes: (u) => {
        var n
        return S((n = t), Re, Ge).call(n, u)
      },
      isStale: (u) => {
        var n
        return f((n = t), xe).call(n, u)
      },
    }
  }
  get max() {
    return f(this, we)
  }
  get maxSize() {
    return f(this, me)
  }
  get calculatedSize() {
    return f(this, Ae)
  }
  get size() {
    return f(this, ne)
  }
  get fetchMethod() {
    return f(this, vt)
  }
  get dispose() {
    return f(this, Ee)
  }
  get disposeAfter() {
    return f(this, Ce)
  }
  getRemainingTTL(t) {
    return f(this, ee).has(t) ? 1 / 0 : 0
  }
  *entries() {
    for (const t of S(this, Me, We).call(this))
      f(this, L)[t] !== void 0 &&
        f(this, G)[t] !== void 0 &&
        !S(this, U, W).call(this, f(this, L)[t]) &&
        (yield [f(this, G)[t], f(this, L)[t]])
  }
  *rentries() {
    for (const t of S(this, Re, Ge).call(this))
      f(this, L)[t] !== void 0 &&
        f(this, G)[t] !== void 0 &&
        !S(this, U, W).call(this, f(this, L)[t]) &&
        (yield [f(this, G)[t], f(this, L)[t]])
  }
  *keys() {
    for (const t of S(this, Me, We).call(this)) {
      const u = f(this, G)[t]
      u !== void 0 && !S(this, U, W).call(this, f(this, L)[t]) && (yield u)
    }
  }
  *rkeys() {
    for (const t of S(this, Re, Ge).call(this)) {
      const u = f(this, G)[t]
      u !== void 0 && !S(this, U, W).call(this, f(this, L)[t]) && (yield u)
    }
  }
  *values() {
    for (const t of S(this, Me, We).call(this))
      f(this, L)[t] !== void 0 &&
        !S(this, U, W).call(this, f(this, L)[t]) &&
        (yield f(this, L)[t])
  }
  *rvalues() {
    for (const t of S(this, Re, Ge).call(this))
      f(this, L)[t] !== void 0 &&
        !S(this, U, W).call(this, f(this, L)[t]) &&
        (yield f(this, L)[t])
  }
  [Symbol.iterator]() {
    return this.entries()
  }
  find(t, u = {}) {
    for (const n of S(this, Me, We).call(this)) {
      const i = f(this, L)[n],
        r = S(this, U, W).call(this, i) ? i.__staleWhileFetching : i
      if (r !== void 0 && t(r, f(this, G)[n], this))
        return this.get(f(this, G)[n], u)
    }
  }
  forEach(t, u = this) {
    for (const n of S(this, Me, We).call(this)) {
      const i = f(this, L)[n],
        r = S(this, U, W).call(this, i) ? i.__staleWhileFetching : i
      r !== void 0 && t.call(u, r, f(this, G)[n], this)
    }
  }
  rforEach(t, u = this) {
    for (const n of S(this, Re, Ge).call(this)) {
      const i = f(this, L)[n],
        r = S(this, U, W).call(this, i) ? i.__staleWhileFetching : i
      r !== void 0 && t.call(u, r, f(this, G)[n], this)
    }
  }
  purgeStale() {
    let t = !1
    for (const u of S(this, Re, Ge).call(this, { allowStale: !0 }))
      f(this, xe).call(this, u) && (this.delete(f(this, G)[u]), (t = !0))
    return t
  }
  info(t) {
    const u = f(this, ee).get(t)
    if (u === void 0) return
    const n = f(this, L)[u],
      i = S(this, U, W).call(this, n) ? n.__staleWhileFetching : n
    if (i === void 0) return
    const r = { value: i }
    if (f(this, ge) && f(this, Se)) {
      const o = f(this, ge)[u],
        s = f(this, Se)[u]
      if (o && s) {
        const a = o - (xt.now() - s)
        ;(r.ttl = a), (r.start = Date.now())
      }
    }
    return f(this, Fe) && (r.size = f(this, Fe)[u]), r
  }
  dump() {
    const t = []
    for (const u of S(this, Me, We).call(this, { allowStale: !0 })) {
      const n = f(this, G)[u],
        i = f(this, L)[u],
        r = S(this, U, W).call(this, i) ? i.__staleWhileFetching : i
      if (r === void 0 || n === void 0) continue
      const o = { value: r }
      if (f(this, ge) && f(this, Se)) {
        o.ttl = f(this, ge)[u]
        const s = xt.now() - f(this, Se)[u]
        o.start = Math.floor(Date.now() - s)
      }
      f(this, Fe) && (o.size = f(this, Fe)[u]), t.unshift([n, o])
    }
    return t
  }
  load(t) {
    this.clear()
    for (const [u, n] of t) {
      if (n.start) {
        const i = Date.now() - n.start
        n.start = xt.now() - i
      }
      this.set(u, n.value, n)
    }
  }
  set(t, u, n = {}) {
    var m, p, h, _, b
    if (u === void 0) return this.delete(t), this
    const {
      ttl: i = this.ttl,
      start: r,
      noDisposeOnSet: o = this.noDisposeOnSet,
      sizeCalculation: s = this.sizeCalculation,
      status: a,
    } = n
    let { noUpdateTTL: c = this.noUpdateTTL } = n
    const l = f(this, Ut).call(this, t, u, n.size || 0, s)
    if (this.maxEntrySize && l > this.maxEntrySize)
      return (
        a && ((a.set = 'miss'), (a.maxEntrySizeExceeded = !0)),
        this.delete(t),
        this
      )
    let d = f(this, ne) === 0 ? void 0 : f(this, ee).get(t)
    if (d === void 0)
      (d =
        f(this, ne) === 0
          ? f(this, oe)
          : f(this, De).length !== 0
            ? f(this, De).pop()
            : f(this, ne) === f(this, we)
              ? S(this, Et, fu).call(this, !1)
              : f(this, ne)),
        (f(this, G)[d] = t),
        (f(this, L)[d] = u),
        f(this, ee).set(t, d),
        (f(this, de)[f(this, oe)] = d),
        (f(this, be)[d] = f(this, oe)),
        T(this, oe, d),
        Xt(this, ne)._++,
        f(this, wt).call(this, d, l, a),
        a && (a.set = 'add'),
        (c = !1)
    else {
      S(this, lt, Rt).call(this, d)
      const g = f(this, L)[d]
      if (u !== g) {
        if (f(this, Qe) && S(this, U, W).call(this, g)) {
          g.__abortController.abort(new Error('replaced'))
          const { __staleWhileFetching: x } = g
          x !== void 0 &&
            !o &&
            (f(this, Te) &&
              ((m = f(this, Ee)) == null || m.call(this, x, t, 'set')),
            f(this, fe) && ((p = f(this, se)) == null || p.push([x, t, 'set'])))
        } else
          o ||
            (f(this, Te) &&
              ((h = f(this, Ee)) == null || h.call(this, g, t, 'set')),
            f(this, fe) && ((_ = f(this, se)) == null || _.push([g, t, 'set'])))
        if (
          (f(this, ct).call(this, d),
          f(this, wt).call(this, d, l, a),
          (f(this, L)[d] = u),
          a)
        ) {
          a.set = 'replace'
          const x =
            g && S(this, U, W).call(this, g) ? g.__staleWhileFetching : g
          x !== void 0 && (a.oldValue = x)
        }
      } else a && (a.set = 'update')
    }
    if (
      (i !== 0 && !f(this, ge) && S(this, qt, pn).call(this),
      f(this, ge) &&
        (c || f(this, Ht).call(this, d, i, r),
        a && f(this, qe).call(this, a, d)),
      !o && f(this, fe) && f(this, se))
    ) {
      const g = f(this, se)
      let x
      for (; (x = g == null ? void 0 : g.shift()); )
        (b = f(this, Ce)) == null || b.call(this, ...x)
    }
    return this
  }
  pop() {
    var t
    try {
      for (; f(this, ne); ) {
        const u = f(this, L)[f(this, le)]
        if ((S(this, Et, fu).call(this, !0), S(this, U, W).call(this, u))) {
          if (u.__staleWhileFetching) return u.__staleWhileFetching
        } else if (u !== void 0) return u
      }
    } finally {
      if (f(this, fe) && f(this, se)) {
        const u = f(this, se)
        let n
        for (; (n = u == null ? void 0 : u.shift()); )
          (t = f(this, Ce)) == null || t.call(this, ...n)
      }
    }
  }
  has(t, u = {}) {
    const { updateAgeOnHas: n = this.updateAgeOnHas, status: i } = u,
      r = f(this, ee).get(t)
    if (r !== void 0) {
      const o = f(this, L)[r]
      if (S(this, U, W).call(this, o) && o.__staleWhileFetching === void 0)
        return !1
      if (f(this, xe).call(this, r))
        i && ((i.has = 'stale'), f(this, qe).call(this, i, r))
      else
        return (
          n && f(this, at).call(this, r),
          i && ((i.has = 'hit'), f(this, qe).call(this, i, r)),
          !0
        )
    } else i && (i.has = 'miss')
    return !1
  }
  peek(t, u = {}) {
    const { allowStale: n = this.allowStale } = u,
      i = f(this, ee).get(t)
    if (i === void 0 || (!n && f(this, xe).call(this, i))) return
    const r = f(this, L)[i]
    return S(this, U, W).call(this, r) ? r.__staleWhileFetching : r
  }
  async fetch(t, u = {}) {
    const {
      allowStale: n = this.allowStale,
      updateAgeOnGet: i = this.updateAgeOnGet,
      noDeleteOnStaleGet: r = this.noDeleteOnStaleGet,
      ttl: o = this.ttl,
      noDisposeOnSet: s = this.noDisposeOnSet,
      size: a = 0,
      sizeCalculation: c = this.sizeCalculation,
      noUpdateTTL: l = this.noUpdateTTL,
      noDeleteOnFetchRejection: d = this.noDeleteOnFetchRejection,
      allowStaleOnFetchRejection: m = this.allowStaleOnFetchRejection,
      ignoreFetchAbort: p = this.ignoreFetchAbort,
      allowStaleOnFetchAbort: h = this.allowStaleOnFetchAbort,
      context: _,
      forceRefresh: b = !1,
      status: g,
      signal: x,
    } = u
    if (!f(this, Qe))
      return (
        g && (g.fetch = 'get'),
        this.get(t, {
          allowStale: n,
          updateAgeOnGet: i,
          noDeleteOnStaleGet: r,
          status: g,
        })
      )
    const k = {
      allowStale: n,
      updateAgeOnGet: i,
      noDeleteOnStaleGet: r,
      ttl: o,
      noDisposeOnSet: s,
      size: a,
      sizeCalculation: c,
      noUpdateTTL: l,
      noDeleteOnFetchRejection: d,
      allowStaleOnFetchRejection: m,
      allowStaleOnFetchAbort: h,
      ignoreFetchAbort: p,
      status: g,
      signal: x,
    }
    let w = f(this, ee).get(t)
    if (w === void 0) {
      g && (g.fetch = 'miss')
      const E = S(this, Ct, hu).call(this, t, w, k, _)
      return (E.__returned = E)
    } else {
      const E = f(this, L)[w]
      if (S(this, U, W).call(this, E)) {
        const R = n && E.__staleWhileFetching !== void 0
        return (
          g && ((g.fetch = 'inflight'), R && (g.returnedStale = !0)),
          R ? E.__staleWhileFetching : (E.__returned = E)
        )
      }
      const C = f(this, xe).call(this, w)
      if (!b && !C)
        return (
          g && (g.fetch = 'hit'),
          S(this, lt, Rt).call(this, w),
          i && f(this, at).call(this, w),
          g && f(this, qe).call(this, g, w),
          E
        )
      const D = S(this, Ct, hu).call(this, t, w, k, _),
        H = D.__staleWhileFetching !== void 0 && n
      return (
        g &&
          ((g.fetch = C ? 'stale' : 'refresh'),
          H && C && (g.returnedStale = !0)),
        H ? D.__staleWhileFetching : (D.__returned = D)
      )
    }
  }
  get(t, u = {}) {
    const {
        allowStale: n = this.allowStale,
        updateAgeOnGet: i = this.updateAgeOnGet,
        noDeleteOnStaleGet: r = this.noDeleteOnStaleGet,
        status: o,
      } = u,
      s = f(this, ee).get(t)
    if (s !== void 0) {
      const a = f(this, L)[s],
        c = S(this, U, W).call(this, a)
      return (
        o && f(this, qe).call(this, o, s),
        f(this, xe).call(this, s)
          ? (o && (o.get = 'stale'),
            c
              ? (o &&
                  n &&
                  a.__staleWhileFetching !== void 0 &&
                  (o.returnedStale = !0),
                n ? a.__staleWhileFetching : void 0)
              : (r || this.delete(t),
                o && n && (o.returnedStale = !0),
                n ? a : void 0))
          : (o && (o.get = 'hit'),
            c
              ? a.__staleWhileFetching
              : (S(this, lt, Rt).call(this, s),
                i && f(this, at).call(this, s),
                a))
      )
    } else o && (o.get = 'miss')
  }
  delete(t) {
    var n, i, r, o
    let u = !1
    if (f(this, ne) !== 0) {
      const s = f(this, ee).get(t)
      if (s !== void 0)
        if (((u = !0), f(this, ne) === 1)) this.clear()
        else {
          f(this, ct).call(this, s)
          const a = f(this, L)[s]
          if (
            (S(this, U, W).call(this, a)
              ? a.__abortController.abort(new Error('deleted'))
              : (f(this, Te) || f(this, fe)) &&
                (f(this, Te) &&
                  ((n = f(this, Ee)) == null || n.call(this, a, t, 'delete')),
                f(this, fe) &&
                  ((i = f(this, se)) == null || i.push([a, t, 'delete']))),
            f(this, ee).delete(t),
            (f(this, G)[s] = void 0),
            (f(this, L)[s] = void 0),
            s === f(this, oe))
          )
            T(this, oe, f(this, be)[s])
          else if (s === f(this, le)) T(this, le, f(this, de)[s])
          else {
            const c = f(this, be)[s]
            f(this, de)[c] = f(this, de)[s]
            const l = f(this, de)[s]
            f(this, be)[l] = f(this, be)[s]
          }
          Xt(this, ne)._--, f(this, De).push(s)
        }
    }
    if (f(this, fe) && (r = f(this, se)) != null && r.length) {
      const s = f(this, se)
      let a
      for (; (a = s == null ? void 0 : s.shift()); )
        (o = f(this, Ce)) == null || o.call(this, ...a)
    }
    return u
  }
  clear() {
    var t, u, n
    for (const i of S(this, Re, Ge).call(this, { allowStale: !0 })) {
      const r = f(this, L)[i]
      if (S(this, U, W).call(this, r))
        r.__abortController.abort(new Error('deleted'))
      else {
        const o = f(this, G)[i]
        f(this, Te) &&
          ((t = f(this, Ee)) == null || t.call(this, r, o, 'delete')),
          f(this, fe) && ((u = f(this, se)) == null || u.push([r, o, 'delete']))
      }
    }
    if (
      (f(this, ee).clear(),
      f(this, L).fill(void 0),
      f(this, G).fill(void 0),
      f(this, ge) && f(this, Se) && (f(this, ge).fill(0), f(this, Se).fill(0)),
      f(this, Fe) && f(this, Fe).fill(0),
      T(this, le, 0),
      T(this, oe, 0),
      (f(this, De).length = 0),
      T(this, Ae, 0),
      T(this, ne, 0),
      f(this, fe) && f(this, se))
    ) {
      const i = f(this, se)
      let r
      for (; (r = i == null ? void 0 : i.shift()); )
        (n = f(this, Ce)) == null || n.call(this, ...r)
    }
  }
}
;(t1 = Symbol.toStringTag),
  (we = new WeakMap()),
  (me = new WeakMap()),
  (Ee = new WeakMap()),
  (Ce = new WeakMap()),
  (vt = new WeakMap()),
  (ne = new WeakMap()),
  (Ae = new WeakMap()),
  (ee = new WeakMap()),
  (G = new WeakMap()),
  (L = new WeakMap()),
  (de = new WeakMap()),
  (be = new WeakMap()),
  (le = new WeakMap()),
  (oe = new WeakMap()),
  (De = new WeakMap()),
  (se = new WeakMap()),
  (Fe = new WeakMap()),
  (Se = new WeakMap()),
  (ge = new WeakMap()),
  (Te = new WeakMap()),
  (Qe = new WeakMap()),
  (fe = new WeakMap()),
  (qt = new WeakSet()),
  (pn = function () {
    const t = new du(f(this, we)),
      u = new du(f(this, we))
    T(this, ge, t),
      T(this, Se, u),
      T(this, Ht, (r, o, s = xt.now()) => {
        if (
          ((u[r] = o !== 0 ? s : 0), (t[r] = o), o !== 0 && this.ttlAutopurge)
        ) {
          const a = setTimeout(() => {
            f(this, xe).call(this, r) && this.delete(f(this, G)[r])
          }, o + 1)
          a.unref && a.unref()
        }
      }),
      T(this, at, (r) => {
        u[r] = t[r] !== 0 ? xt.now() : 0
      }),
      T(this, qe, (r, o) => {
        if (t[o]) {
          const s = t[o],
            a = u[o]
          if (!s || !a) return
          ;(r.ttl = s), (r.start = a), (r.now = n || i())
          const c = r.now - a
          r.remainingTTL = s - c
        }
      })
    let n = 0
    const i = () => {
      const r = xt.now()
      if (this.ttlResolution > 0) {
        n = r
        const o = setTimeout(() => (n = 0), this.ttlResolution)
        o.unref && o.unref()
      }
      return r
    }
    ;(this.getRemainingTTL = (r) => {
      const o = f(this, ee).get(r)
      if (o === void 0) return 0
      const s = t[o],
        a = u[o]
      if (!s || !a) return 1 / 0
      const c = (n || i()) - a
      return s - c
    }),
      T(this, xe, (r) => {
        const o = u[r],
          s = t[r]
        return !!s && !!o && (n || i()) - o > s
      })
  }),
  (at = new WeakMap()),
  (qe = new WeakMap()),
  (Ht = new WeakMap()),
  (xe = new WeakMap()),
  (Au = new WeakSet()),
  (Si = function () {
    const t = new du(f(this, we))
    T(this, Ae, 0),
      T(this, Fe, t),
      T(this, ct, (u) => {
        T(this, Ae, f(this, Ae) - t[u]), (t[u] = 0)
      }),
      T(this, Ut, (u, n, i, r) => {
        if (S(this, U, W).call(this, n)) return 0
        if (!Ve(i))
          if (r) {
            if (typeof r != 'function')
              throw new TypeError('sizeCalculation must be a function')
            if (((i = r(n, u)), !Ve(i)))
              throw new TypeError(
                'sizeCalculation return invalid (expect positive integer)',
              )
          } else
            throw new TypeError(
              'invalid size value (must be positive integer). When maxSize or maxEntrySize is used, sizeCalculation or size must be set.',
            )
        return i
      }),
      T(this, wt, (u, n, i) => {
        if (((t[u] = n), f(this, me))) {
          const r = f(this, me) - t[u]
          for (; f(this, Ae) > r; ) S(this, Et, fu).call(this, !0)
        }
        T(this, Ae, f(this, Ae) + t[u]),
          i && ((i.entrySize = n), (i.totalCalculatedSize = f(this, Ae)))
      })
  }),
  (ct = new WeakMap()),
  (wt = new WeakMap()),
  (Ut = new WeakMap()),
  (Me = new WeakSet()),
  (We = function* ({ allowStale: t = this.allowStale } = {}) {
    if (f(this, ne))
      for (
        let u = f(this, oe);
        !(
          !S(this, Vt, mn).call(this, u) ||
          ((t || !f(this, xe).call(this, u)) && (yield u), u === f(this, le))
        );

      )
        u = f(this, be)[u]
  }),
  (Re = new WeakSet()),
  (Ge = function* ({ allowStale: t = this.allowStale } = {}) {
    if (f(this, ne))
      for (
        let u = f(this, le);
        !(
          !S(this, Vt, mn).call(this, u) ||
          ((t || !f(this, xe).call(this, u)) && (yield u), u === f(this, oe))
        );

      )
        u = f(this, de)[u]
  }),
  (Vt = new WeakSet()),
  (mn = function (t) {
    return t !== void 0 && f(this, ee).get(f(this, G)[t]) === t
  }),
  (Et = new WeakSet()),
  (fu = function (t) {
    var r, o
    const u = f(this, le),
      n = f(this, G)[u],
      i = f(this, L)[u]
    return (
      f(this, Qe) && S(this, U, W).call(this, i)
        ? i.__abortController.abort(new Error('evicted'))
        : (f(this, Te) || f(this, fe)) &&
          (f(this, Te) &&
            ((r = f(this, Ee)) == null || r.call(this, i, n, 'evict')),
          f(this, fe) &&
            ((o = f(this, se)) == null || o.push([i, n, 'evict']))),
      f(this, ct).call(this, u),
      t &&
        ((f(this, G)[u] = void 0),
        (f(this, L)[u] = void 0),
        f(this, De).push(u)),
      f(this, ne) === 1
        ? (T(this, le, T(this, oe, 0)), (f(this, De).length = 0))
        : T(this, le, f(this, de)[u]),
      f(this, ee).delete(n),
      Xt(this, ne)._--,
      u
    )
  }),
  (Ct = new WeakSet()),
  (hu = function (t, u, n, i) {
    const r = u === void 0 ? void 0 : f(this, L)[u]
    if (S(this, U, W).call(this, r)) return r
    const o = new vu(),
      { signal: s } = n
    s == null ||
      s.addEventListener('abort', () => o.abort(s.reason), { signal: o.signal })
    const a = { signal: o.signal, options: n, context: i },
      c = (_, b = !1) => {
        const { aborted: g } = o.signal,
          x = n.ignoreFetchAbort && _ !== void 0
        if (
          (n.status &&
            (g && !b
              ? ((n.status.fetchAborted = !0),
                (n.status.fetchError = o.signal.reason),
                x && (n.status.fetchAbortIgnored = !0))
              : (n.status.fetchResolved = !0)),
          g && !x && !b)
        )
          return d(o.signal.reason)
        const k = p
        return (
          f(this, L)[u] === p &&
            (_ === void 0
              ? k.__staleWhileFetching
                ? (f(this, L)[u] = k.__staleWhileFetching)
                : this.delete(t)
              : (n.status && (n.status.fetchUpdated = !0),
                this.set(t, _, a.options))),
          _
        )
      },
      l = (_) => (
        n.status && ((n.status.fetchRejected = !0), (n.status.fetchError = _)),
        d(_)
      ),
      d = (_) => {
        const { aborted: b } = o.signal,
          g = b && n.allowStaleOnFetchAbort,
          x = g || n.allowStaleOnFetchRejection,
          k = x || n.noDeleteOnFetchRejection,
          w = p
        if (
          (f(this, L)[u] === p &&
            (!k || w.__staleWhileFetching === void 0
              ? this.delete(t)
              : g || (f(this, L)[u] = w.__staleWhileFetching)),
          x)
        )
          return (
            n.status &&
              w.__staleWhileFetching !== void 0 &&
              (n.status.returnedStale = !0),
            w.__staleWhileFetching
          )
        if (w.__returned === w) throw _
      },
      m = (_, b) => {
        var x
        const g = (x = f(this, vt)) == null ? void 0 : x.call(this, t, r, a)
        g &&
          g instanceof Promise &&
          g.then((k) => _(k === void 0 ? void 0 : k), b),
          o.signal.addEventListener('abort', () => {
            ;(!n.ignoreFetchAbort || n.allowStaleOnFetchAbort) &&
              (_(void 0), n.allowStaleOnFetchAbort && (_ = (k) => c(k, !0)))
          })
      }
    n.status && (n.status.fetchDispatched = !0)
    const p = new Promise(m).then(c, l),
      h = Object.assign(p, {
        __abortController: o,
        __staleWhileFetching: r,
        __returned: void 0,
      })
    return (
      u === void 0
        ? (this.set(t, h, { ...a.options, status: void 0 }),
          (u = f(this, ee).get(t)))
        : (f(this, L)[u] = h),
      h
    )
  }),
  (U = new WeakSet()),
  (W = function (t) {
    if (!f(this, Qe)) return !1
    const u = t
    return (
      !!u &&
      u instanceof Promise &&
      u.hasOwnProperty('__staleWhileFetching') &&
      u.__abortController instanceof vu
    )
  }),
  (Wt = new WeakSet()),
  (bn = function (t, u) {
    ;(f(this, be)[u] = t), (f(this, de)[t] = u)
  }),
  (lt = new WeakSet()),
  (Rt = function (t) {
    t !== f(this, oe) &&
      (t === f(this, le)
        ? T(this, le, f(this, de)[t])
        : S(this, Wt, bn).call(this, f(this, be)[t], f(this, de)[t]),
      S(this, Wt, bn).call(this, f(this, oe), t),
      T(this, oe, t))
  })
let hn = Pn
const Rc = (e, t) => {
    const u = ye('editorId'),
      { noImgZoomIn: n } = e
    let i = () => {}
    Ye(
      [t, jr(e.setting, 'preview')],
      () => {
        !n && e.setting.preview && i()
      },
      { immediate: !0 },
    ),
      et(() => {
        i = wn(() => {
          const r = document.querySelectorAll(`#${u}-preview img`)
          r.length !== 0 && zo(r, { background: '#00000073' })
        })
      })
  },
  Oc = (e, t) => {
    if (typeof t[e] == 'string') return t[e]
    const u = `<i class="${P}-iconfont ${P}-icon-${e}"></i>`
    switch (Pe.iconfontType) {
      case 'svg':
        return `<svg class="${P}-icon" aria-hidden="true"><use xlink:href="#${P}-icon-${e}"></use></svg>`
      default:
        return u
    }
  },
  Bc = (e, t, u) => {
    const n = ye('editorId'),
      i = ye('usedLanguageText'),
      r = ye('customIcon'),
      o = () => {
        document.querySelectorAll(`#${n}-preview pre`).forEach((c) => {
          var l, d
          let m = -1
          ;(l = c.querySelector('.copy-button')) == null || l.remove()
          const p =
              ((d = i.value.copyCode) == null ? void 0 : d.text) || '复制代码',
            h = document.createElement('span')
          h.setAttribute('class', 'copy-button'),
            (h.dataset.tips = p),
            (h.innerHTML = Oc('copy', r.value)),
            h.addEventListener('click', () => {
              var _, b
              clearTimeout(m)
              const g = c.querySelector('code').innerText,
                x = No(e.formatCopiedText(g)),
                k =
                  ((_ = i.value.copyCode) == null ? void 0 : _.successTips) ||
                  '已复制！',
                w =
                  ((b = i.value.copyCode) == null ? void 0 : b.failTips) ||
                  '已复制！'
              ;(h.dataset.tips = x ? k : w),
                (m = window.setTimeout(() => {
                  h.dataset.tips = p
                }, 1500))
            }),
            c.appendChild(h)
        })
      },
      s = () => {
        un(o)
      },
      a = (c) => {
        c && un(o)
      }
    Ye([t, u], s),
      Ye(() => e.setting.preview, a),
      Ye(() => e.setting.htmlPreview, a),
      Ye(() => i.value, o),
      et(o)
  },
  Pc = (e) => {
    var t
    const u = (t = Pe.editorExtensions) == null ? void 0 : t.highlight,
      n = u == null ? void 0 : u.instance,
      i = ye('highlight'),
      r = gu(n)
    return (
      et(() => {
        if (!e.noHighlight && !r.value) {
          const o = document.createElement('script')
          ;(o.src = i.value.js),
            (o.onload = () => {
              r.value = window.hljs
            }),
            (o.id = `${P}-hljs`),
            dt(o, 'hljs')
          const s = document.createElement('link')
          ;(s.rel = 'stylesheet'),
            (s.href = i.value.css),
            (s.id = `${P}-hlCss`),
            dt(s)
        }
      }),
      Ye(
        () => i.value.css,
        (o) => {
          Fo(`${P}-hlCss`, 'href', o)
        },
      ),
      r
    )
  },
  $c = (e) => {
    const t = ye('theme'),
      { editorExtensions: u, mermaidConfig: n } = Pe,
      i = u == null ? void 0 : u.mermaid,
      r = gu(i == null ? void 0 : i.instance),
      o = gu(-1),
      s = new hn({ max: 1e3, ttl: 6e5 }),
      a = () => {
        const l = r.value
        !e.noMermaid &&
          l &&
          (l.initialize(
            n({
              startOnLoad: !1,
              theme: t.value === 'dark' ? 'dark' : 'default',
            }),
          ),
          (o.value = o.value + 1))
      }
    return (
      Ye(
        () => t.value,
        () => {
          s.clear(), a()
        },
      ),
      et(() => {
        if (!e.noMermaid && !(i != null && i.instance)) {
          const l = (i == null ? void 0 : i.js) || go
          if (/\.mjs/.test(l))
            io(() => import(l), []).then((d) => {
              ;(r.value = d.default), a()
            })
          else {
            const d = document.createElement('script')
            ;(d.id = `${P}-mermaid`),
              (d.src = l),
              (d.onload = () => {
                ;(r.value = window.mermaid), a()
              }),
              dt(d, 'mermaid')
          }
        }
      }),
      {
        mermaidRef: r,
        reRenderRef: o,
        replaceMermaid: () => {
          un(() => {
            if (!e.noMermaid && r.value) {
              const l = document.querySelectorAll(`div.${P}-mermaid`),
                d = document.createElement('div')
              ;(d.style.width = document.body.offsetWidth + 'px'),
                (d.style.height = document.body.offsetHeight + 'px'),
                (d.style.position = 'fixed'),
                (d.style.zIndex = '-10000'),
                (d.style.top = '-10000')
              let m = l.length
              m > 0 && document.body.appendChild(d),
                l.forEach(async (p) => {
                  let h = s.get(p.innerText)
                  if (!h) {
                    const b = nn(),
                      g = r.value.renderAsync || r.value.render
                    let x = ''
                    try {
                      x = await g(b, p.innerText, d)
                    } catch {}
                    ;(h = await e.sanitizeMermaid(
                      typeof x == 'string' ? x : x.svg,
                    )),
                      s.set(p.innerText, h)
                  }
                  const _ = document.createElement('p')
                  ;(_.className = `${P}-mermaid`),
                    _.setAttribute('data-processed', ''),
                    (_.innerHTML = h),
                    p.dataset.line !== void 0 &&
                      (_.dataset.line = p.dataset.line),
                    p.replaceWith(_),
                    --m === 0 && d.remove()
                })
            }
          })
        },
      }
    )
  },
  Nc = (e) => {
    var t
    const u = (t = Pe.editorExtensions) == null ? void 0 : t.katex,
      n = u == null ? void 0 : u.instance,
      i = gu(n)
    return (
      et(() => {
        if (!e.noKatex && !i.value) {
          const r = document.createElement('script')
          ;(r.src = (u == null ? void 0 : u.js) || Un.js),
            (r.onload = () => {
              i.value = window.katex
            }),
            (r.id = `${P}-katex`)
          const o = document.createElement('link')
          ;(o.rel = 'stylesheet'),
            (o.href = (u == null ? void 0 : u.css) || Un.css),
            (o.id = `${P}-katexCss`),
            dt(r, 'katex'),
            dt(o)
        }
      }),
      i
    )
  },
  qc = (e, t) => {
    const u = e.renderer.rules.fence.bind(e.renderer.rules)
    e.renderer.rules.fence = (n, i, r, o, s) => {
      const a = n[i],
        c = a.content.trim()
      if (a.info === 'mermaid') {
        let l
        return (
          n[i].map &&
            n[i].level === 0 &&
            ((l = n[i].map[0]), n[i].attrSet('data-line', String(l))),
          `<div class="${P}-mermaid" ${l !== void 0 ? 'data-line=' + l : ''} data-mermaid-theme=${t.themeRef.value}>${c}</div>`
        )
      }
      return u(n, i, r, o, s)
    }
  },
  Hc = qc,
  wr = (e, t) => {
    let u = !0,
      n = !0
    const i = e.posMax,
      r = t > 0 ? e.src.charCodeAt(t - 1) : -1,
      o = t + 1 <= i ? e.src.charCodeAt(t + 1) : -1
    return (
      (r === 32 || r === 9 || (o >= 48 && o <= 57)) && (n = !1),
      (o === 32 || o === 9) && (u = !1),
      { can_open: u, can_close: n }
    )
  },
  Uc = (e, t) => {
    let u, n, i, r
    if (e.src[e.pos] !== '$') return !1
    if (((i = wr(e, e.pos)), !i.can_open))
      return t || (e.pending += '$'), (e.pos += 1), !0
    const o = e.pos + 1
    for (u = o; (u = e.src.indexOf('$', u)) !== -1; ) {
      for (r = u - 1; e.src[r] === '\\'; ) r -= 1
      if ((u - r) % 2 == 1) break
      u += 1
    }
    return u === -1
      ? (t || (e.pending += '$'), (e.pos = o), !0)
      : u - o === 0
        ? (t || (e.pending += '$$'), (e.pos = o + 1), !0)
        : ((i = wr(e, u)),
          i.can_close
            ? (t ||
                ((n = e.push('math_inline', 'math', 0)),
                (n.markup = '$'),
                (n.content = e.src.slice(o, u))),
              (e.pos = u + 1),
              !0)
            : (t || (e.pending += '$'), (e.pos = o), !0))
  },
  Vc = (e, t, u, n) => {
    let i,
      r,
      o,
      s,
      a = !1,
      c = e.bMarks[t] + e.tShift[t],
      l = e.eMarks[t]
    if (c + 2 > l || e.src.slice(c, c + 2) !== '$$') return !1
    if (((c += 2), (i = e.src.slice(c, l)), n)) return !0
    for (
      i.trim().slice(-2) === '$$' && ((i = i.trim().slice(0, -2)), (a = !0)),
        o = t;
      !a &&
      (o++,
      !(
        o >= u ||
        ((c = e.bMarks[o] + e.tShift[o]),
        (l = e.eMarks[o]),
        c < l && e.tShift[o] < e.blkIndent)
      ));

    )
      e.src.slice(c, l).trim().slice(-2) === '$$' &&
        ((s = e.src.slice(0, l).lastIndexOf('$$')),
        (r = e.src.slice(c, s)),
        (a = !0))
    e.line = o + 1
    const d = e.push('math_block', 'math', 0)
    return (
      (d.block = !0),
      (d.content =
        (i && i.trim()
          ? i +
            `
`
          : '') +
        e.getLines(t + 1, o, e.tShift[t], !0) +
        (r && r.trim() ? r : '')),
      (d.map = [t, e.line]),
      (d.markup = '$$'),
      !0
    )
  },
  Wc = (e, t) => {
    const u = (i) => {
        if (t.katexRef.value) {
          const r = t.katexRef.value.renderToString(i, { throwOnError: !1 })
          return `<span class="${P}-katex-inline" data-processed>${r}</span>`
        } else return `<span class="${P}-katex-inline">${i}</span>`
      },
      n = (i, r) => {
        if (t.katexRef.value) {
          const o = t.katexRef.value.renderToString(i, {
            throwOnError: !1,
            displayMode: !0,
          })
          return `<p class="${P}-katex-block" data-line=${r} data-processed>${o}</p>`
        } else return `<p class="${P}-katex-block" data-line=${r}>${i}</p>`
      }
    e.inline.ruler.after('escape', 'math_inline', Uc),
      e.block.ruler.after('blockquote', 'math_block', Vc, {
        alt: ['paragraph', 'reference', 'blockquote', 'list'],
      }),
      (e.renderer.rules.math_inline = (i, r) => u(i[r].content)),
      (e.renderer.rules.math_block = (i, r) =>
        n(i[r].content, i[r].map[0]) +
        `
`)
  },
  Gc = Wc,
  Zc = (e, t) => {
    t = t || {}
    const u = 3,
      n = t.marker || '!',
      i = n.charCodeAt(0),
      r = n.length
    let o = '',
      s = ''
    const a = (l, d, m, p, h) => {
        const _ = l[d]
        return (
          _.type === 'admonition_open'
            ? (l[d].attrPush([
                'class',
                `${P}-admonition ${P}-admonition-${_.info}`,
              ]),
              l[d].attrSet('data-line', String(l[d].map[0])))
            : _.type === 'admonition_title_open' &&
              l[d].attrPush(['class', `${P}-admonition-title`]),
          h.renderToken(l, d, m)
        )
      },
      c = (l) => {
        const d = l.trim().split(' ', 2)
        ;(s = ''),
          (o = d[0]),
          d.length > 1 && (s = l.substring(o.length + 2)),
          (s === '' || !s) && (s = o)
      }
    e.block.ruler.before(
      'code',
      'admonition',
      (l, d, m, p) => {
        let h,
          _,
          b,
          g = !1,
          x = l.bMarks[d] + l.tShift[d],
          k = l.eMarks[d]
        if (i !== l.src.charCodeAt(x)) return !1
        for (h = x + 1; h <= k && n[(h - x) % r] === l.src[h]; h++);
        const w = Math.floor((h - x) / r)
        if (w !== u) return !1
        h -= (h - x) % r
        const E = l.src.slice(x, h),
          C = l.src.slice(h, k)
        if ((c(C), p)) return !0
        for (
          _ = d;
          _++,
            !(
              _ >= m ||
              ((x = l.bMarks[_] + l.tShift[_]),
              (k = l.eMarks[_]),
              x < k && l.sCount[_] < l.blkIndent)
            );

        )
          if (i === l.src.charCodeAt(x) && !(l.sCount[_] - l.blkIndent >= 4)) {
            for (h = x + 1; h <= k && n[(h - x) % r] === l.src[h]; h++);
            if (
              !(Math.floor((h - x) / r) < w) &&
              ((h -= (h - x) % r), (h = l.skipSpaces(h)), !(h < k))
            ) {
              g = !0
              break
            }
          }
        const D = l.parentType,
          v = l.lineMax
        return (
          (l.parentType = 'root'),
          (l.lineMax = _),
          (b = l.push('admonition_open', 'div', 1)),
          (b.markup = E),
          (b.block = !0),
          (b.info = o),
          (b.map = [d, _]),
          (b = l.push('admonition_title_open', 'p', 1)),
          (b.markup = E + ' ' + o),
          (b.map = [d, _]),
          (b = l.push('inline', '', 0)),
          (b.content = s),
          (b.map = [d, l.line - 1]),
          (b.children = []),
          (b = l.push('admonition_title_close', 'p', -1)),
          (b.markup = E + ' ' + o),
          l.md.block.tokenize(l, d + 1, _),
          (b = l.push('admonition_close', 'div', -1)),
          (b.markup = l.src.slice(x, h)),
          (b.block = !0),
          (l.parentType = D),
          (l.lineMax = v),
          (l.line = _ + (g ? 1 : 0)),
          !0
        )
      },
      { alt: ['paragraph', 'reference', 'blockquote', 'list'] },
    ),
      (e.renderer.rules.admonition_open = a),
      (e.renderer.rules.admonition_title_open = a),
      (e.renderer.rules.admonition_title_close = a),
      (e.renderer.rules.admonition_close = a)
  },
  Kc = Zc,
  Xc = (e, t) => {
    ;(e.renderer.rules.heading_open = (u, n) => {
      var i
      const r = u[n],
        o =
          ((i = u[n + 1].children) == null
            ? void 0
            : i.reduce((a, c) => a + (c.content || ''), '')) || '',
        s = r.markup.length
      return (
        t.headsRef.value.push({ text: o, level: s }),
        r.map &&
          r.level === 0 &&
          (r.attrSet('data-line', String(r.map[0])),
          r.attrSet('id', t.mdHeadingId(o, s, t.headsRef.value.length))),
        e.renderer.renderToken(u, n, t)
      )
    }),
      (e.renderer.rules.heading_close = (u, n, i, r, o) =>
        o.renderToken(u, n, i))
  },
  Qc = Xc,
  Yc = (e, t) => {
    const u = e.renderer.rules.fence,
      n = e.utils.unescapeAll,
      i = /\[(\w*)(?::([\w ]*))?\]/
    function r(c) {
      return c.info ? n(c.info).trim() : ''
    }
    function o(c) {
      const l = r(c),
        [d = null, m = ''] = (i.exec(l) || []).slice(1)
      return [d, m]
    }
    function s(c) {
      const l = r(c)
      return l ? l.split(/(\s+)/g)[0] : ''
    }
    const a = (c, l, d, m, p) => {
      if (c[l].hidden) return ''
      const [h, _] = o(c[l])
      if (h === null) return u(c, l, d, m, p)
      let b,
        g,
        x,
        k,
        w = '',
        E = ''
      for (
        let C = l;
        C < c.length && ((b = c[C]), ([g, x] = o(b)), g === h);
        C++
      )
        (b.info = b.info.replace(i, '')),
          (b.hidden = !0),
          (k = C - l > 0 ? '' : ' checked'),
          (w += `<li><input type="radio" name="label-group-${t.editorId}-${l}"${k}><label for="group-${t.editorId}-${l}-tab-${C - l}" onclick="this.previousElementSibling.click()">${x || s(b)}</label></li>
`),
          (E +=
            `<input type="radio" id="group-${t.editorId}-${l}-tab-${C - l}" name="group-${t.editorId}-${l}"${k}>
` + u(c, C, d, m, p))
      return (
        `<div class="code-tabs">
<ul>
` +
        w +
        `</ul>
` +
        E +
        '</div>'
      )
    }
    e.renderer.rules.fence = a
  },
  Jc = Yc,
  el = (e) => {
    ;[
      'paragraph_open',
      'table_open',
      'ordered_list_open',
      'bullet_list_open',
      'blockquote_open',
      'hr',
      'html_block',
      'fence',
    ].forEach((t) => {
      const u = e.renderer.rules[t]
      u
        ? (e.renderer.rules[t] = (n, i, r, o, s) => {
            let a
            const c = u(n, i, r, o, s)
            return n[i].map && n[i].level === 0 && !/^<!--/.test(c)
              ? ((a = n[i].map[0]),
                c.replace(/^(<[^>]*)/, `$1 data-line="${a}"`))
              : c
          })
        : (e.renderer.rules[t] = (n, i, r, o, s) => {
            let a
            return (
              n[i].map &&
                n[i].level === 0 &&
                ((a = n[i].map[0]), n[i].attrSet('data-line', String(a))),
              s.renderToken(n, i, r)
            )
          })
    })
  },
  tl = (e, t) => {
    const { editorConfig: u, markdownItConfig: n, markdownItPlugins: i } = Pe,
      r = ye('editorId'),
      o = ye('showCodeRowNumber'),
      s = ye('theme'),
      a = Ou([]),
      c = Pc(e),
      l = Nc(e),
      { reRenderRef: d, replaceMermaid: m } = $c(e),
      p = ve({ html: !0, breaks: !0 })
    n(p, { editorId: r })
    const h = [
      { type: 'katex', plugin: Gc, options: { katexRef: l } },
      {
        type: 'image',
        plugin: F0,
        options: { figcaption: !0, classes: 'md-zoom' },
      },
      { type: 'admonition', plugin: Kc, options: {} },
      { type: 'taskList', plugin: N0, options: {} },
      {
        type: 'heading',
        plugin: Qc,
        options: { mdHeadingId: e.mdHeadingId, headsRef: a },
      },
      { type: 'codeTabs', plugin: Jc, options: { editorId: r } },
      {
        type: 'xss',
        plugin: jc,
        options: {
          xss(E) {
            return {
              whiteList: Object.assign({}, E.getDefaultWhiteList(), {
                input: ['class', 'disabled', 'type', 'checked'],
                iframe: [
                  'class',
                  'width',
                  'height',
                  'src',
                  'title',
                  'border',
                  'frameborder',
                  'framespacing',
                  'allow',
                  'allowfullscreen',
                ],
              }),
            }
          },
        },
      },
    ]
    e.noMermaid ||
      h.push({ type: 'mermaid', plugin: Hc, options: { themeRef: s } }),
      i(h, { editorId: r }).forEach((E) => {
        p.use(E.plugin, E.options)
      })
    const _ = p.options.highlight
    p.set({
      highlight: (E, C, D) => {
        if (_) {
          const R = _(E, C, D)
          if (R) return R
        }
        let v
        !e.noHighlight && c.value
          ? c.value.getLanguage(C)
            ? (v = c.value.highlight(E, {
                language: C,
                ignoreIllegals: !0,
              }).value)
            : (v = c.value.highlightAuto(E).value)
          : (v = p.utils.escapeHtml(E))
        const H = o
          ? Ao(v.replace(/^\n+|\n+$/g, ''))
          : `<span class="code-block">${v.replace(/^\n+|\n+$/g, '')}</span>`
        return `<pre><code class="language-${C}" language=${C}>${H}</code></pre>`
      },
    }),
      el(p)
    const b = Ou(`_article-key_${nn()}`),
      g = Ou(e.sanitize(p.render(e.modelValue))),
      x = () => {
        ot.emit(r, Eo, g.value),
          e.onHtmlChanged(g.value),
          e.onGetCatalog(a.value),
          ot.emit(r, Gn, a.value),
          m()
      }
    et(x)
    const k = () => {
        ;(a.value = []), (g.value = e.sanitize(p.render(e.modelValue))), x()
      },
      w = nt(() => (e.noKatex || l.value) && (e.noHighlight || c.value))
    return (
      Ye(
        [jr(e, 'modelValue'), w, d],
        wn(
          k,
          (u == null ? void 0 : u.renderDelay) !== void 0
            ? u == null
              ? void 0
              : u.renderDelay
            : t
              ? 0
              : 500,
        ),
      ),
      et(() => {
        ot.on(r, {
          name: Co,
          callback() {
            ot.emit(r, Gn, a.value)
          },
        }),
          ot.on(r, {
            name: Rr,
            callback: () => {
              k(), (b.value = `_article-key_${nn()}`)
            },
          })
      }),
      { html: g, key: b }
    )
  },
  ul = tl,
  Ti = {
    modelValue: { type: String, default: '' },
    setting: { type: Object, default: () => ({ preview: !0 }) },
    onHtmlChanged: { type: Function, default: () => {} },
    onGetCatalog: { type: Function, default: () => {} },
    mdHeadingId: { type: Function, default: () => '' },
    noMermaid: { type: Boolean, default: !1 },
    sanitize: { type: Function, default: (e) => e },
    noKatex: { type: Boolean, default: !1 },
    formatCopiedText: { type: Function, default: (e) => e },
    noHighlight: { type: Boolean, default: !1 },
    previewOnly: { type: Boolean, default: !1 },
    noImgZoomIn: { type: Boolean },
    sanitizeMermaid: { type: Function },
  }
;({ ...Ti })
const nl = Lr({
    name: 'ContentPreview',
    props: Ti,
    setup(e) {
      const t = ye('editorId'),
        u = ye('previewTheme'),
        n = ye('showCodeRowNumber'),
        { html: i, key: r } = ul(e, e.previewOnly)
      return (
        Bc(e, i, r),
        Rc(e, i),
        () =>
          it(au, null, [
            e.setting.preview &&
              it(
                'div',
                {
                  id: `${t}-preview-wrapper`,
                  class: `${P}-preview-wrapper`,
                  key: 'content-preview-wrapper',
                },
                [
                  it(
                    'div',
                    {
                      key: r.value,
                      id: `${t}-preview`,
                      class: [
                        `${P}-preview`,
                        `${u == null ? void 0 : u.value}-theme`,
                        n && `${P}-scrn`,
                      ],
                      innerHTML: i.value,
                    },
                    null,
                  ),
                ],
              ),
            !e.previewOnly &&
              e.setting.htmlPreview &&
              it(
                'div',
                {
                  id: `${t}-html-wrapper`,
                  class: `${P}-preview-wrapper`,
                  key: 'html-preview-wrapper',
                },
                [it('div', { class: `${P}-html` }, [i.value])],
              ),
          ])
      )
    },
  }),
  rl = (e) => {
    var t, u
    const { editorId: n } = e,
      i =
        (u = (t = Pe) == null ? void 0 : t.editorExtensions) == null
          ? void 0
          : u.highlight
    Ue('editorId', n),
      Ue(
        'theme',
        nt(() => e.theme),
      ),
      Ue(
        'language',
        nt(() => e.language),
      ),
      Ue(
        'highlight',
        nt(() => {
          const o = { ...Vn, ...(i == null ? void 0 : i.css) },
            s =
              e.codeStyleReverse &&
              e.codeStyleReverseList.includes(e.previewTheme)
                ? 'dark'
                : e.theme
          return {
            js: (i == null ? void 0 : i.js) || po,
            css: o[e.codeTheme] ? o[e.codeTheme][s] : Vn.atom[s],
          }
        }),
      ),
      Ue('showCodeRowNumber', e.showCodeRowNumber)
    const r = nt(() => {
      var o, s
      const a = {
        ...Hn,
        ...((s = (o = Pe) == null ? void 0 : o.editorConfig) == null
          ? void 0
          : s.languageUserDefined),
      }
      return Mr(Mt(Hn['en-US']), a[e.language] || {})
    })
    Ue('usedLanguageText', r),
      Ue(
        'previewTheme',
        nt(() => e.previewTheme),
      ),
      Ue(
        'customIcon',
        nt(() => e.customIcon),
      )
  },
  il = (e) => {
    et(() => {
      var t, u
      if (!e.noIconfont)
        if (Pe.iconfontType === 'svg') {
          const n = document.createElement('script')
          ;(n.src =
            ((t = Pe.editorExtensions) == null ? void 0 : t.iconfont) || fo),
            (n.id = `${P}-icon`),
            dt(n)
        } else {
          const n = document.createElement('link')
          ;(n.rel = 'stylesheet'),
            (n.href =
              ((u = Pe.editorExtensions) == null ? void 0 : u.iconfontClass) ||
              ho),
            (n.id = `${P}-icon-class`),
            dt(n)
        }
    })
  },
  ol = (e) => e,
  Ii = {
    modelValue: { type: String, default: '' },
    theme: { type: String, default: 'light' },
    class: { type: String, default: '' },
    language: { type: String, default: 'zh-CN' },
    onHtmlChanged: { type: Function },
    onGetCatalog: { type: Function },
    editorId: { type: String, default: () => Do('md-editor-v3_') },
    showCodeRowNumber: { type: Boolean, default: !1 },
    previewTheme: { type: String, default: 'default' },
    style: { type: Object, default: () => ({}) },
    mdHeadingId: { type: Function, default: ol },
    sanitize: { type: Function, default: (e) => e },
    noMermaid: { type: Boolean, default: !1 },
    noKatex: { type: Boolean, default: !1 },
    codeTheme: { type: String, default: 'atom' },
    noIconfont: { type: Boolean },
    formatCopiedText: { type: Function, default: (e) => e },
    codeStyleReverse: { type: Boolean, default: !0 },
    codeStyleReverseList: { type: Array, default: ['default', 'mk-cute'] },
    noHighlight: { type: Boolean, default: !1 },
    noImgZoomIn: { type: Boolean, default: !1 },
    customIcon: { type: Object, default: {} },
    sanitizeMermaid: { type: Function, default: (e) => Promise.resolve(e) },
  }
;({ ...Ii })
const zi = ['onHtmlChanged', 'onGetCatalog']
;[...zi]
const sl = (e, t) => {
    const { editorId: u } = e,
      n = {
        rerender() {
          ot.emit(u, Rr)
        },
      }
    t.expose(n)
  },
  pu = Lr({
    name: 'MdPreview',
    props: Ii,
    emits: zi,
    setup(e, t) {
      const { editorId: u, noKatex: n, noMermaid: i, noHighlight: r } = e
      return (
        rl(e),
        il(e),
        sl(e, t),
        ro(() => {
          ot.clear(u)
        }),
        () =>
          it(
            'div',
            {
              id: u,
              class: [
                P,
                e.class,
                e.theme === 'dark' && `${P}-dark`,
                `${P}-previewOnly`,
              ],
              style: e.style,
            },
            [
              it(
                nl,
                {
                  modelValue: e.modelValue,
                  onHtmlChanged: (o) => {
                    e.onHtmlChanged
                      ? e.onHtmlChanged(o)
                      : t.emit('onHtmlChanged', o)
                  },
                  onGetCatalog: (o) => {
                    e.onGetCatalog
                      ? e.onGetCatalog(o)
                      : t.emit('onGetCatalog', o)
                  },
                  mdHeadingId: e.mdHeadingId,
                  noMermaid: i,
                  sanitize: e.sanitize,
                  noKatex: n,
                  formatCopiedText: e.formatCopiedText,
                  noHighlight: r,
                  noImgZoomIn: e.noImgZoomIn,
                  previewOnly: !0,
                  sanitizeMermaid: e.sanitizeMermaid,
                },
                null,
              ),
            ],
          )
      )
    },
  })
pu.install = (e) => (e.component(pu.name, pu), e)
function iu(e) {
  if (typeof e != 'string' || !e)
    throw new Error('expected a non-empty string, got: ' + e)
}
function Zu(e) {
  if (typeof e != 'number') throw new Error('expected a number, got: ' + e)
}
const al = 1,
  cl = 1,
  pt = 'emoji',
  Ft = 'keyvalue',
  jn = 'favorites',
  ll = 'tokens',
  Li = 'tokens',
  dl = 'unicode',
  ji = 'count',
  fl = 'group',
  hl = 'order',
  Mi = 'group-order',
  gn = 'eTag',
  wu = 'url',
  Er = 'skinTone',
  Tt = 'readonly',
  Mn = 'readwrite',
  Ri = 'skinUnicodes',
  pl = 'skinUnicodes',
  ml =
    'https://cdn.jsdelivr.net/npm/emoji-picker-element-data@^1/en/emojibase/data.json',
  bl = 'en'
function gl(e, t) {
  const u = new Set(),
    n = []
  for (const i of e) {
    const r = t(i)
    u.has(r) || (u.add(r), n.push(i))
  }
  return n
}
function Cr(e) {
  return gl(e, (t) => t.unicode)
}
function xl(e) {
  function t(u, n, i) {
    const r = n
      ? e.createObjectStore(u, { keyPath: n })
      : e.createObjectStore(u)
    if (i)
      for (const [o, [s, a]] of Object.entries(i))
        r.createIndex(o, s, { multiEntry: a })
    return r
  }
  t(Ft),
    t(pt, dl, { [Li]: [ll, !0], [Mi]: [[fl, hl]], [Ri]: [pl, !0] }),
    t(jn, void 0, { [ji]: [''] })
}
const xn = {},
  mu = {},
  Eu = {}
function Oi(e, t, u) {
  ;(u.onerror = () => t(u.error)),
    (u.onblocked = () => t(new Error('IDB blocked'))),
    (u.onsuccess = () => e(u.result))
}
async function _l(e) {
  const t = await new Promise((u, n) => {
    const i = indexedDB.open(e, al)
    ;(xn[e] = i),
      (i.onupgradeneeded = (r) => {
        r.oldVersion < cl && xl(i.result)
      }),
      Oi(u, n, i)
  })
  return (t.onclose = () => Rn(e)), t
}
function kl(e) {
  return mu[e] || (mu[e] = _l(e)), mu[e]
}
function He(e, t, u, n) {
  return new Promise((i, r) => {
    const o = e.transaction(t, u, { durability: 'relaxed' }),
      s =
        typeof t == 'string' ? o.objectStore(t) : t.map((c) => o.objectStore(c))
    let a
    n(s, o, (c) => {
      a = c
    }),
      (o.oncomplete = () => i(a)),
      (o.onerror = () => r(o.error))
  })
}
function Rn(e) {
  const t = xn[e],
    u = t && t.result
  if (u) {
    u.close()
    const n = Eu[e]
    if (n) for (const i of n) i()
  }
  delete xn[e], delete mu[e], delete Eu[e]
}
function yl(e) {
  return new Promise((t, u) => {
    Rn(e)
    const n = indexedDB.deleteDatabase(e)
    Oi(t, u, n)
  })
}
function vl(e, t) {
  let u = Eu[e]
  u || (u = Eu[e] = []), u.push(t)
}
const wl = new Set([
  ':D',
  'XD',
  ":'D",
  'O:)',
  ':X',
  ':P',
  ';P',
  'XP',
  ':L',
  ':Z',
  ':j',
  '8D',
  'XO',
  '8)',
  ':B',
  ':O',
  ':S',
  ":'o",
  'Dx',
  'X(',
  'D:',
  ':C',
  '>0)',
  ':3',
  '</3',
  '<3',
  '\\M/',
  ':E',
  '8#',
])
function kt(e) {
  return e
    .split(/[\s_]+/)
    .map((t) =>
      !t.match(/\w/) || wl.has(t)
        ? t.toLowerCase()
        : t
            .replace(/[)(:,]/g, '')
            .replace(/’/g, "'")
            .toLowerCase(),
    )
    .filter(Boolean)
}
const El = 2
function Bi(e) {
  return e
    .filter(Boolean)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length >= El)
}
function Cl(e) {
  return e.map(
    ({
      annotation: u,
      emoticon: n,
      group: i,
      order: r,
      shortcodes: o,
      skins: s,
      tags: a,
      emoji: c,
      version: l,
    }) => {
      const d = [
          ...new Set(
            Bi([...(o || []).map(kt).flat(), ...a.map(kt).flat(), ...kt(u), n]),
          ),
        ].sort(),
        m = {
          annotation: u,
          group: i,
          order: r,
          tags: a,
          tokens: d,
          unicode: c,
          version: l,
        }
      if ((n && (m.emoticon = n), o && (m.shortcodes = o), s)) {
        ;(m.skinTones = []), (m.skinUnicodes = []), (m.skinVersions = [])
        for (const { tone: p, emoji: h, version: _ } of s)
          m.skinTones.push(p), m.skinUnicodes.push(h), m.skinVersions.push(_)
      }
      return m
    },
  )
}
function Pi(e, t, u, n) {
  e[t](u).onsuccess = (i) => n && n(i.target.result)
}
function ft(e, t, u) {
  Pi(e, 'get', t, u)
}
function $i(e, t, u) {
  Pi(e, 'getAll', t, u)
}
function On(e) {
  e.commit && e.commit()
}
function Al(e, t) {
  let u = e[0]
  for (let n = 1; n < e.length; n++) {
    const i = e[n]
    t(u) > t(i) && (u = i)
  }
  return u
}
function Ni(e, t) {
  const u = Al(e, (i) => i.length),
    n = []
  for (const i of u)
    e.some((r) => r.findIndex((o) => t(o) === t(i)) === -1) || n.push(i)
  return n
}
async function Dl(e) {
  return !(await Bn(e, Ft, wu))
}
async function Fl(e, t, u) {
  const [n, i] = await Promise.all([gn, wu].map((r) => Bn(e, Ft, r)))
  return n === u && i === t
}
async function Sl(e, t) {
  return He(e, pt, Tt, (n, i, r) => {
    let o
    const s = () => {
      n.getAll(o && IDBKeyRange.lowerBound(o, !0), 50).onsuccess = (a) => {
        const c = a.target.result
        for (const l of c) if (((o = l.unicode), t(l))) return r(l)
        if (c.length < 50) return r()
        s()
      }
    }
    s()
  })
}
async function qi(e, t, u, n) {
  try {
    const i = Cl(t)
    await He(e, [pt, Ft], Mn, ([r, o], s) => {
      let a,
        c,
        l = 0
      function d() {
        ++l === 2 && m()
      }
      function m() {
        if (!(a === n && c === u)) {
          r.clear()
          for (const p of i) r.put(p)
          o.put(n, gn), o.put(u, wu), On(s)
        }
      }
      ft(o, gn, (p) => {
        ;(a = p), d()
      }),
        ft(o, wu, (p) => {
          ;(c = p), d()
        })
    })
  } finally {
  }
}
async function Tl(e, t) {
  return He(e, pt, Tt, (u, n, i) => {
    const r = IDBKeyRange.bound([t, 0], [t + 1, 0], !1, !0)
    $i(u.index(Mi), r, i)
  })
}
async function Hi(e, t) {
  const u = Bi(kt(t))
  return u.length
    ? He(e, pt, Tt, (n, i, r) => {
        const o = [],
          s = () => {
            o.length === u.length && a()
          },
          a = () => {
            const c = Ni(o, (l) => l.unicode)
            r(c.sort((l, d) => (l.order < d.order ? -1 : 1)))
          }
        for (let c = 0; c < u.length; c++) {
          const l = u[c],
            d =
              c === u.length - 1
                ? IDBKeyRange.bound(l, l + '￿', !1, !0)
                : IDBKeyRange.only(l)
          $i(n.index(Li), d, (m) => {
            o.push(m), s()
          })
        }
      })
    : []
}
async function Il(e, t) {
  const u = await Hi(e, t)
  return u.length
    ? u.filter((n) =>
        (n.shortcodes || [])
          .map((r) => r.toLowerCase())
          .includes(t.toLowerCase()),
      )[0] || null
    : (await Sl(e, (i) => (i.shortcodes || []).includes(t.toLowerCase()))) ||
        null
}
async function zl(e, t) {
  return He(e, pt, Tt, (u, n, i) =>
    ft(u, t, (r) => {
      if (r) return i(r)
      ft(u.index(Ri), t, (o) => i(o || null))
    }),
  )
}
function Bn(e, t, u) {
  return He(e, t, Tt, (n, i, r) => ft(n, u, r))
}
function Ll(e, t, u, n) {
  return He(e, t, Mn, (i, r) => {
    i.put(n, u), On(r)
  })
}
function jl(e, t) {
  return He(e, jn, Mn, (u, n) =>
    ft(u, t, (i) => {
      u.put((i || 0) + 1, t), On(n)
    }),
  )
}
function Ml(e, t, u) {
  return u === 0
    ? []
    : He(e, [jn, pt], Tt, ([n, i], r, o) => {
        const s = []
        n.index(ji).openCursor(void 0, 'prev').onsuccess = (a) => {
          const c = a.target.result
          if (!c) return o(s)
          function l(p) {
            if ((s.push(p), s.length === u)) return o(s)
            c.continue()
          }
          const d = c.primaryKey,
            m = t.byName(d)
          if (m) return l(m)
          ft(i, d, (p) => {
            if (p) return l(p)
            c.continue()
          })
        }
      })
}
const ou = ''
function Rl(e, t) {
  const u = new Map()
  for (const i of e) {
    const r = t(i)
    for (const o of r) {
      let s = u
      for (let c = 0; c < o.length; c++) {
        const l = o.charAt(c)
        let d = s.get(l)
        d || ((d = new Map()), s.set(l, d)), (s = d)
      }
      let a = s.get(ou)
      a || ((a = []), s.set(ou, a)), a.push(i)
    }
  }
  return (i, r) => {
    let o = u
    for (let c = 0; c < i.length; c++) {
      const l = i.charAt(c),
        d = o.get(l)
      if (d) o = d
      else return []
    }
    if (r) return o.get(ou) || []
    const s = [],
      a = [o]
    for (; a.length; ) {
      const l = [...a.shift().entries()].sort((d, m) => (d[0] < m[0] ? -1 : 1))
      for (const [d, m] of l) d === ou ? s.push(...m) : a.push(m)
    }
    return s
  }
}
const Ol = ['name', 'url']
function Bl(e) {
  const t = e && Array.isArray(e),
    u = t && e.length && (!e[0] || Ol.some((n) => !(n in e[0])))
  if (!t || u) throw new Error('Custom emojis are in the wrong format')
}
function Ar(e) {
  Bl(e)
  const t = (m, p) => (m.name.toLowerCase() < p.name.toLowerCase() ? -1 : 1),
    u = e.sort(t),
    i = Rl(e, (m) => [
      ...new Set((m.shortcodes || []).map((p) => kt(p)).flat()),
    ]),
    r = (m) => i(m, !0),
    o = (m) => i(m, !1),
    s = (m) => {
      const p = kt(m),
        h = p.map((_, b) => (b < p.length - 1 ? r : o)(_))
      return Ni(h, (_) => _.name).sort(t)
    },
    a = new Map(),
    c = new Map()
  for (const m of e) {
    c.set(m.name.toLowerCase(), m)
    for (const p of m.shortcodes || []) a.set(p.toLowerCase(), m)
  }
  return {
    all: u,
    search: s,
    byShortcode: (m) => a.get(m.toLowerCase()),
    byName: (m) => c.get(m.toLowerCase()),
  }
}
const Pl = typeof wrappedJSObject < 'u'
function jt(e) {
  if (!e) return e
  if ((Pl && (e = structuredClone(e)), delete e.tokens, e.skinTones)) {
    const t = e.skinTones.length
    e.skins = Array(t)
    for (let u = 0; u < t; u++)
      e.skins[u] = {
        tone: e.skinTones[u],
        unicode: e.skinUnicodes[u],
        version: e.skinVersions[u],
      }
    delete e.skinTones, delete e.skinUnicodes, delete e.skinVersions
  }
  return e
}
function Ui(e) {
  e ||
    console.warn(
      'emoji-picker-element is more efficient if the dataSource server exposes an ETag header.',
    )
}
const $l = ['annotation', 'emoji', 'group', 'order', 'tags', 'version']
function Nl(e) {
  if (
    !e ||
    !Array.isArray(e) ||
    !e[0] ||
    typeof e[0] != 'object' ||
    $l.some((t) => !(t in e[0]))
  )
    throw new Error('Emoji data is in the wrong format')
}
function Vi(e, t) {
  if (Math.floor(e.status / 100) !== 2)
    throw new Error('Failed to fetch: ' + t + ':  ' + e.status)
}
async function ql(e) {
  const t = await fetch(e, { method: 'HEAD' })
  Vi(t, e)
  const u = t.headers.get('etag')
  return Ui(u), u
}
async function _n(e) {
  const t = await fetch(e)
  Vi(t, e)
  const u = t.headers.get('etag')
  Ui(u)
  const n = await t.json()
  return Nl(n), [u, n]
}
function Hl(e) {
  for (var t = '', u = new Uint8Array(e), n = u.byteLength, i = -1; ++i < n; )
    t += String.fromCharCode(u[i])
  return t
}
function Ul(e) {
  for (
    var t = e.length, u = new ArrayBuffer(t), n = new Uint8Array(u), i = -1;
    ++i < t;

  )
    n[i] = e.charCodeAt(i)
  return u
}
async function Wi(e) {
  const t = JSON.stringify(e)
  let u = Ul(t)
  const n = await crypto.subtle.digest('SHA-1', u),
    i = Hl(n)
  return btoa(i)
}
async function Vl(e, t) {
  let u,
    n = await ql(t)
  if (!n) {
    const i = await _n(t)
    ;(n = i[0]), (u = i[1]), n || (n = await Wi(u))
  }
  ;(await Fl(e, t, n)) || (u || (u = (await _n(t))[1]), await qi(e, u, t, n))
}
async function Wl(e, t) {
  let [u, n] = await _n(t)
  u || (u = await Wi(n)), await qi(e, n, t, u)
}
class Gl {
  constructor({
    dataSource: t = ml,
    locale: u = bl,
    customEmoji: n = [],
  } = {}) {
    ;(this.dataSource = t),
      (this.locale = u),
      (this._dbName = `emoji-picker-element-${this.locale}`),
      (this._db = void 0),
      (this._lazyUpdate = void 0),
      (this._custom = Ar(n)),
      (this._clear = this._clear.bind(this)),
      (this._ready = this._init())
  }
  async _init() {
    const t = (this._db = await kl(this._dbName))
    vl(this._dbName, this._clear)
    const u = this.dataSource
    ;(await Dl(t)) ? await Wl(t, u) : (this._lazyUpdate = Vl(t, u))
  }
  async ready() {
    const t = async () => (
      this._ready || (this._ready = this._init()), this._ready
    )
    await t(), this._db || (await t())
  }
  async getEmojiByGroup(t) {
    return Zu(t), await this.ready(), Cr(await Tl(this._db, t)).map(jt)
  }
  async getEmojiBySearchQuery(t) {
    iu(t), await this.ready()
    const u = this._custom.search(t),
      n = Cr(await Hi(this._db, t)).map(jt)
    return [...u, ...n]
  }
  async getEmojiByShortcode(t) {
    iu(t), await this.ready()
    const u = this._custom.byShortcode(t)
    return u || jt(await Il(this._db, t))
  }
  async getEmojiByUnicodeOrName(t) {
    iu(t), await this.ready()
    const u = this._custom.byName(t)
    return u || jt(await zl(this._db, t))
  }
  async getPreferredSkinTone() {
    return await this.ready(), (await Bn(this._db, Ft, Er)) || 0
  }
  async setPreferredSkinTone(t) {
    return Zu(t), await this.ready(), Ll(this._db, Ft, Er, t)
  }
  async incrementFavoriteEmojiCount(t) {
    return iu(t), await this.ready(), jl(this._db, t)
  }
  async getTopFavoriteEmoji(t) {
    return (
      Zu(t), await this.ready(), (await Ml(this._db, this._custom, t)).map(jt)
    )
  }
  set customEmoji(t) {
    this._custom = Ar(t)
  }
  get customEmoji() {
    return this._custom.all
  }
  async _shutdown() {
    await this.ready()
    try {
      await this._lazyUpdate
    } catch {}
  }
  _clear() {
    this._db = this._ready = this._lazyUpdate = void 0
  }
  async close() {
    await this._shutdown(), await Rn(this._dbName)
  }
  async delete() {
    await this._shutdown(), await yl(this._dbName)
  }
}
const kn = [
    [-1, '✨', 'custom'],
    [0, '😀', 'smileys-emotion'],
    [1, '👋', 'people-body'],
    [3, '🐱', 'animals-nature'],
    [4, '🍎', 'food-drink'],
    [5, '🏠️', 'travel-places'],
    [6, '⚽', 'activities'],
    [7, '📝', 'objects'],
    [8, '⛔️', 'symbols'],
    [9, '🏁', 'flags'],
  ].map(([e, t, u]) => ({ id: e, emoji: t, name: u })),
  Ku = kn.slice(1),
  Zl = 2,
  Dr = 6,
  Gi =
    typeof requestIdleCallback == 'function' ? requestIdleCallback : setTimeout
function Fr(e) {
  return e.unicode.includes('‍')
}
const Kl = {
    '🫨': 15.1,
    '🫠': 14,
    '🥲': 13.1,
    '🥻': 12.1,
    '🥰': 11,
    '🤩': 5,
    '👱‍♀️': 4,
    '🤣': 3,
    '👁️‍🗨️': 2,
    '😀': 1,
    '😐️': 0.7,
    '😃': 0.6,
  },
  Xl = 1e3,
  Ql = '🖐️',
  Yl = 8,
  Jl = [
    '😊',
    '😒',
    '❤️',
    '👍️',
    '😍',
    '😂',
    '😭',
    '☺️',
    '😔',
    '😩',
    '😏',
    '💕',
    '🙌',
    '😘',
  ],
  Zi =
    '"Twemoji Mozilla","Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji","EmojiOne Color","Android Emoji",sans-serif',
  ed = (e, t) => (e < t ? -1 : e > t ? 1 : 0),
  Sr = (e, t) => {
    const u = document.createElement('canvas')
    u.width = u.height = 1
    const n = u.getContext('2d')
    return (
      (n.textBaseline = 'top'),
      (n.font = `100px ${Zi}`),
      (n.fillStyle = t),
      n.scale(0.01, 0.01),
      n.fillText(e, 0, 0),
      n.getImageData(0, 0, 1, 1).data
    )
  },
  td = (e, t) => {
    const u = [...e].join(','),
      n = [...t].join(',')
    return u === n && !u.startsWith('0,0,0,')
  }
function ud(e) {
  const t = Sr(e, '#000'),
    u = Sr(e, '#fff')
  return t && u && td(t, u)
}
function nd() {
  const e = Object.entries(Kl)
  try {
    for (const [t, u] of e) if (ud(t)) return u
  } catch {
  } finally {
  }
  return e[0][1]
}
let Xu
const Qu = () => (Xu || (Xu = new Promise((e) => Gi(() => e(nd())))), Xu),
  yn = new Map(),
  rd = '️',
  id = '\uD83C',
  od = '‍',
  sd = 127995,
  ad = 57339
function cd(e, t) {
  if (t === 0) return e
  const u = e.indexOf(od)
  return u !== -1
    ? e.substring(0, u) + String.fromCodePoint(sd + t - 1) + e.substring(u)
    : (e.endsWith(rd) && (e = e.substring(0, e.length - 1)),
      e + id + String.fromCodePoint(ad + t - 1))
}
function je(e) {
  e.preventDefault(), e.stopPropagation()
}
function Yu(e, t, u) {
  return (
    (t += e ? -1 : 1), t < 0 ? (t = u.length - 1) : t >= u.length && (t = 0), t
  )
}
function Ki(e, t) {
  const u = new Set(),
    n = []
  for (const i of e) {
    const r = t(i)
    u.has(r) || (u.add(r), n.push(i))
  }
  return n
}
function ld(e, t) {
  const u = (n) => {
    const i = {}
    for (const r of n)
      typeof r.tone == 'number' && r.version <= t && (i[r.tone] = r.unicode)
    return i
  }
  return e.map(
    ({
      unicode: n,
      skins: i,
      shortcodes: r,
      url: o,
      name: s,
      category: a,
      annotation: c,
    }) => ({
      unicode: n,
      name: s,
      shortcodes: r,
      url: o,
      category: a,
      annotation: c,
      id: n || s,
      skins: i && u(i),
    }),
  )
}
const bu = requestAnimationFrame
let dd = typeof ResizeObserver == 'function'
function fd(e, t, u) {
  let n
  dd
    ? ((n = new ResizeObserver((i) => u(i[0].contentRect.width))), n.observe(e))
    : bu(() => u(e.getBoundingClientRect().width)),
    t.addEventListener('abort', () => {
      n && n.disconnect()
    })
}
function Tr(e) {
  {
    const t = document.createRange()
    return t.selectNode(e.firstChild), t.getBoundingClientRect().width
  }
}
let Ju
function hd(e, t, u) {
  for (const n of e) {
    const i = u(n),
      r = Tr(i)
    typeof Ju > 'u' && (Ju = Tr(t))
    const o = r / 1.8 < Ju
    yn.set(n.unicode, o)
  }
}
function pd(e) {
  return Ki(e, (t) => t)
}
function md(e) {
  e && (e.scrollTop = 0)
}
function Ot(e, t, u) {
  let n = e.get(t)
  return n || ((n = u()), e.set(t, n)), n
}
function Ir(e) {
  return '' + e
}
function bd(e) {
  const t = document.createElement('template')
  return (t.innerHTML = e), t
}
const gd = new WeakMap(),
  xd = new WeakMap(),
  _d = Symbol('un-keyed'),
  kd = 'replaceChildren' in Element.prototype
function yd(e, t) {
  kd ? e.replaceChildren(...t) : ((e.innerHTML = ''), e.append(...t))
}
function vd(e, t) {
  let u = e.firstChild,
    n = 0
  for (; u; ) {
    if (t[n] !== u) return !0
    ;(u = u.nextSibling), n++
  }
  return n !== t.length
}
function wd(e, t) {
  const { targetNode: u } = t
  let { targetParentNode: n } = t,
    i = !1
  n
    ? (i = vd(n, e))
    : ((i = !0),
      (t.targetNode = void 0),
      (t.targetParentNode = n = u.parentNode)),
    i && yd(n, e)
}
function Ed(e, t) {
  for (const u of t) {
    const {
        targetNode: n,
        currentExpression: i,
        binding: {
          expressionIndex: r,
          attributeName: o,
          attributeValuePre: s,
          attributeValuePost: a,
        },
      } = u,
      c = e[r]
    if (i !== c)
      if (((u.currentExpression = c), o)) n.setAttribute(o, s + Ir(c) + a)
      else {
        let l
        Array.isArray(c)
          ? wd(c, u)
          : c instanceof Element
            ? ((l = c), n.replaceWith(l))
            : (n.nodeValue = Ir(c)),
          l && (u.targetNode = l)
      }
  }
}
function Cd(e) {
  let t = '',
    u = !1,
    n = !1,
    i = -1
  const r = new Map(),
    o = []
  for (let a = 0, c = e.length; a < c; a++) {
    const l = e[a]
    if (((t += l), a === c - 1)) break
    for (let g = 0; g < l.length; g++)
      switch (l.charAt(g)) {
        case '<': {
          l.charAt(g + 1) === '/' ? o.pop() : ((u = !0), o.push(++i))
          break
        }
        case '>': {
          ;(u = !1), (n = !1)
          break
        }
        case '=': {
          n = !0
          break
        }
      }
    const d = o[o.length - 1],
      m = Ot(r, d, () => [])
    let p, h, _
    if (n) {
      const g = /(\S+)="?([^"=]*)$/.exec(l)
      ;(p = g[1]), (h = g[2]), (_ = /^[^">]*/.exec(e[a + 1])[0])
    }
    const b = {
      attributeName: p,
      attributeValuePre: h,
      attributeValuePost: _,
      expressionIndex: a,
    }
    m.push(b), !u && !n && (t += ' ')
  }
  return { template: bd(t), elementsToBindings: r }
}
function Ad(e, t) {
  const u = [],
    n = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT)
  let i = e,
    r = -1
  do {
    const o = t.get(++r)
    if (o)
      for (let s = 0; s < o.length; s++) {
        const a = o[s],
          c = a.attributeName ? i : i.firstChild,
          l = {
            binding: a,
            targetNode: c,
            targetParentNode: void 0,
            currentExpression: void 0,
          }
        u.push(l)
      }
  } while ((i = n.nextNode()))
  return u
}
function Dd(e) {
  const { template: t, elementsToBindings: u } = Ot(gd, e, () => Cd(e)),
    n = t.cloneNode(!0).content.firstElementChild,
    i = Ad(n, u)
  return function (o) {
    return Ed(o, i), n
  }
}
function Fd(e) {
  const t = Ot(xd, e, () => new Map())
  let u = _d
  function n(r, ...o) {
    const s = Ot(t, r, () => new Map())
    return Ot(s, u, () => Dd(r))(o)
  }
  function i(r, o, s) {
    return r.map((a, c) => {
      const l = u
      u = s(a)
      try {
        return o(a, c)
      } finally {
        u = l
      }
    })
  }
  return { map: i, html: n }
}
function Sd(e, t, u, n, i, r, o, s) {
  const { labelWithSkin: a, titleForEmoji: c, unicodeWithSkin: l } = u,
    { html: d, map: m } = Fd(t)
  function p(b, g, x) {
    return m(
      b,
      (k, w) =>
        d`<button role="${g ? 'option' : 'menuitem'}" aria-selected="${t.searchMode ? w === t.activeSearchItem : ''}" aria-label="${a(k, t.currentSkinTone)}" title="${c(k)}" class="emoji ${g && w === t.activeSearchItem ? 'active' : ''}" id="${`${x}-${k.id}`}">${k.unicode ? l(k, t.currentSkinTone) : d`<img class="custom-emoji" src="${k.url}" alt="" loading="lazy">`}</button>`,
      (k) => `${x}-${k.id}`,
    )
  }
  const _ = d`<section data-ref="rootElement" class="picker" aria-label="${t.i18n.regionLabel}" style="${t.pickerStyle}"><div class="pad-top"></div><div class="search-row"><div class="search-wrapper"><input id="search" class="search" type="search" role="combobox" enterkeyhint="search" placeholder="${t.i18n.searchLabel}" autocapitalize="none" autocomplete="off" spellcheck="true" aria-expanded="${!!(t.searchMode && t.currentEmojis.length)}" aria-controls="search-results" aria-describedby="search-description" aria-autocomplete="list" aria-activedescendant="${t.activeSearchItemId ? `emo-${t.activeSearchItemId}` : ''}" data-ref="searchElement" data-on-input="onSearchInput" data-on-keydown="onSearchKeydown"><label class="sr-only" for="search">${t.i18n.searchLabel}</label> <span id="search-description" class="sr-only">${t.i18n.searchDescription}</span></div><div class="skintone-button-wrapper ${t.skinTonePickerExpandedAfterAnimation ? 'expanded' : ''}"><button id="skintone-button" class="emoji ${t.skinTonePickerExpanded ? 'hide-focus' : ''}" aria-label="${t.skinToneButtonLabel}" title="${t.skinToneButtonLabel}" aria-describedby="skintone-description" aria-haspopup="listbox" aria-expanded="${t.skinTonePickerExpanded}" aria-controls="skintone-list" data-on-click="onClickSkinToneButton">${t.skinToneButtonText}</button></div><span id="skintone-description" class="sr-only">${t.i18n.skinToneDescription}</span><div data-ref="skinToneDropdown" id="skintone-list" class="skintone-list hide-focus ${t.skinTonePickerExpanded ? '' : 'hidden no-animate'}" style="transform:translateY(${t.skinTonePickerExpanded ? 0 : 'calc(-1 * var(--num-skintones) * var(--total-emoji-size))'})" role="listbox" aria-label="${t.i18n.skinTonesLabel}" aria-activedescendant="skintone-${t.activeSkinTone}" aria-hidden="${!t.skinTonePickerExpanded}" tabIndex="-1" data-on-focusout="onSkinToneOptionsFocusOut" data-on-click="onSkinToneOptionsClick" data-on-keydown="onSkinToneOptionsKeydown" data-on-keyup="onSkinToneOptionsKeyup">${m(
    t.skinTones,
    (b, g) =>
      d`<div id="skintone-${g}" class="emoji ${g === t.activeSkinTone ? 'active' : ''}" aria-selected="${g === t.activeSkinTone}" role="option" title="${t.i18n.skinTones[g]}" aria-label="${t.i18n.skinTones[g]}">${b}</div>`,
    (b) => b,
  )}</div></div><div class="nav" role="tablist" style="grid-template-columns:repeat(${t.groups.length},1fr)" aria-label="${t.i18n.categoriesLabel}" data-on-keydown="onNavKeydown" data-on-click="onNavClick">${m(
    t.groups,
    (b) =>
      d`<button role="tab" class="nav-button" aria-controls="tab-${b.id}" aria-label="${t.i18n.categories[b.name]}" aria-selected="${!t.searchMode && t.currentGroup.id === b.id}" title="${t.i18n.categories[b.name]}" data-group-id="${b.id}"><div class="nav-emoji emoji">${b.emoji}</div></button>`,
    (b) => b.id,
  )}</div><div class="indicator-wrapper"><div class="indicator" style="transform:translateX(${(t.isRtl ? -1 : 1) * t.currentGroupIndex * 100}%)"></div></div><div class="message ${t.message ? '' : 'gone'}" role="alert" aria-live="polite">${t.message}</div><div data-ref="tabpanelElement" class="tabpanel ${!t.databaseLoaded || t.message ? 'gone' : ''}" role="${t.searchMode ? 'region' : 'tabpanel'}" aria-label="${t.searchMode ? t.i18n.searchResultsLabel : t.i18n.categories[t.currentGroup.name]}" id="${t.searchMode ? '' : `tab-${t.currentGroup.id}`}" tabIndex="0" data-on-click="onEmojiClick"><div data-action="calculateEmojiGridStyle">${m(
    t.currentEmojisWithCategories,
    (b, g) =>
      d`<div><div id="menu-label-${g}" class="category ${t.currentEmojisWithCategories.length === 1 && t.currentEmojisWithCategories[0].category === '' ? 'gone' : ''}" aria-hidden="true">${t.searchMode ? t.i18n.searchResultsLabel : b.category ? b.category : t.currentEmojisWithCategories.length > 1 ? t.i18n.categories.custom : t.i18n.categories[t.currentGroup.name]}</div><div class="emoji-menu" role="${t.searchMode ? 'listbox' : 'menu'}" aria-labelledby="menu-label-${g}" id="${t.searchMode ? 'search-results' : ''}">${p(b.emojis, t.searchMode, 'emo')}</div></div>`,
    (b) => b.category,
  )}</div></div><div class="favorites emoji-menu ${t.message ? 'gone' : ''}" role="menu" aria-label="${t.i18n.favoritesLabel}" style="padding-inline-end:${`${t.scrollbarWidth}px`}" data-on-click="onEmojiClick">${p(t.currentFavorites, !1, 'fav')}</div><button data-ref="baselineEmoji" aria-hidden="true" tabindex="-1" class="abs-pos hidden emoji baseline-emoji">😀</button></section>`
  if (s) {
    e.appendChild(_)
    const b = (g, x) => {
      for (const k of e.querySelectorAll(`[${g}]`)) x(k, k.getAttribute(g))
    }
    for (const g of ['click', 'focusout', 'input', 'keydown', 'keyup'])
      b(`data-on-${g}`, (x, k) => {
        x.addEventListener(g, n[k])
      })
    b('data-ref', (g, x) => {
      r[x] = g
    }),
      b('data-action', (g, x) => {
        i[x](g)
      }),
      o.addEventListener('abort', () => {
        e.removeChild(_)
      })
  }
}
const Cu =
  typeof queueMicrotask == 'function'
    ? queueMicrotask
    : (e) => Promise.resolve().then(e)
function Td(e) {
  let t = !1,
    u
  const n = new Map(),
    i = new Set()
  let r
  const o = () => {
      if (t) return
      const c = [...i]
      i.clear()
      try {
        for (const l of c) l()
      } finally {
        ;(r = !1), i.size && ((r = !0), Cu(o))
      }
    },
    s = new Proxy(
      {},
      {
        get(c, l) {
          if (u) {
            let d = n.get(l)
            d || ((d = new Set()), n.set(l, d)), d.add(u)
          }
          return c[l]
        },
        set(c, l, d) {
          c[l] = d
          const m = n.get(l)
          if (m) {
            for (const p of m) i.add(p)
            r || ((r = !0), Cu(o))
          }
          return !0
        },
      },
    ),
    a = (c) => {
      const l = () => {
        const d = u
        u = l
        try {
          return c()
        } finally {
          u = d
        }
      }
      return l()
    }
  return (
    e.addEventListener('abort', () => {
      t = !0
    }),
    { state: s, createEffect: a }
  )
}
function en(e, t, u) {
  if (e.length !== t.length) return !1
  for (let n = 0; n < e.length; n++) if (!u(e[n], t[n])) return !1
  return !0
}
const tn = [],
  { assign: su } = Object
function Id(e, t) {
  const u = {},
    n = new AbortController(),
    i = n.signal,
    { state: r, createEffect: o } = Td(i)
  su(r, {
    skinToneEmoji: void 0,
    i18n: void 0,
    database: void 0,
    customEmoji: void 0,
    customCategorySorting: void 0,
    emojiVersion: void 0,
  }),
    su(r, t),
    su(r, {
      initialLoad: !0,
      currentEmojis: [],
      currentEmojisWithCategories: [],
      rawSearchText: '',
      searchText: '',
      searchMode: !1,
      activeSearchItem: -1,
      message: void 0,
      skinTonePickerExpanded: !1,
      skinTonePickerExpandedAfterAnimation: !1,
      currentSkinTone: 0,
      activeSkinTone: 0,
      skinToneButtonText: void 0,
      pickerStyle: void 0,
      skinToneButtonLabel: '',
      skinTones: [],
      currentFavorites: [],
      defaultFavoriteEmojis: void 0,
      numColumns: Yl,
      isRtl: !1,
      scrollbarWidth: 0,
      currentGroupIndex: 0,
      groups: Ku,
      databaseLoaded: !1,
      activeSearchItemId: void 0,
    }),
    o(() => {
      r.currentGroup !== r.groups[r.currentGroupIndex] &&
        (r.currentGroup = r.groups[r.currentGroupIndex])
    })
  const s = (y) => {
      e.getElementById(y).focus()
    },
    a = (y) => e.getElementById(`emo-${y.id}`),
    c = (y, A) => {
      u.rootElement.dispatchEvent(
        new CustomEvent(y, { detail: A, bubbles: !0, composed: !0 }),
      )
    },
    l = (y, A) => y.id === A.id,
    d = (y, A) => {
      const { category: z, emojis: B } = y,
        { category: Q, emojis: Y } = A
      return z !== Q ? !1 : en(B, Y, l)
    },
    m = (y) => {
      en(r.currentEmojis, y, l) || (r.currentEmojis = y)
    },
    p = (y) => {
      r.searchMode !== y && (r.searchMode = y)
    },
    h = (y) => {
      en(r.currentEmojisWithCategories, y, d) ||
        (r.currentEmojisWithCategories = y)
    },
    _ = (y, A) => (A && y.skins && y.skins[A]) || y.unicode,
    x = {
      labelWithSkin: (y, A) =>
        pd(
          [y.name || _(y, A), y.annotation, ...(y.shortcodes || tn)].filter(
            Boolean,
          ),
        ).join(', '),
      titleForEmoji: (y) => y.annotation || (y.shortcodes || tn).join(', '),
      unicodeWithSkin: _,
    },
    k = {
      onClickSkinToneButton: It,
      onEmojiClick: pe,
      onNavClick: N,
      onNavKeydown: O,
      onSearchKeydown: q,
      onSkinToneOptionsClick: Le,
      onSkinToneOptionsFocusOut: ju,
      onSkinToneOptionsKeydown: zu,
      onSkinToneOptionsKeyup: Lu,
      onSearchInput: ut,
    },
    w = { calculateEmojiGridStyle: D }
  let E = !0
  o(() => {
    Sd(e, r, x, k, w, u, i, E), (E = !1)
  }),
    r.emojiVersion ||
      Qu().then((y) => {
        y || (r.message = r.i18n.emojiUnsupportedMessage)
      }),
    o(() => {
      async function y() {
        let A = !1
        const z = setTimeout(() => {
          ;(A = !0), (r.message = r.i18n.loadingMessage)
        }, Xl)
        try {
          await r.database.ready(), (r.databaseLoaded = !0)
        } catch (B) {
          console.error(B), (r.message = r.i18n.networkErrorMessage)
        } finally {
          clearTimeout(z), A && ((A = !1), (r.message = ''))
        }
      }
      r.database && y()
    }),
    o(() => {
      r.pickerStyle = `
      --num-groups: ${r.groups.length}; 
      --indicator-opacity: ${r.searchMode ? 0 : 1}; 
      --num-skintones: ${Dr};`
    }),
    o(() => {
      r.customEmoji && r.database && C()
    }),
    o(() => {
      r.customEmoji && r.customEmoji.length
        ? r.groups !== kn && (r.groups = kn)
        : r.groups !== Ku &&
          (r.currentGroupIndex && r.currentGroupIndex--, (r.groups = Ku))
    }),
    o(() => {
      async function y() {
        r.databaseLoaded &&
          (r.currentSkinTone = await r.database.getPreferredSkinTone())
      }
      y()
    }),
    o(() => {
      r.skinTones = Array(Dr)
        .fill()
        .map((y, A) => cd(r.skinToneEmoji, A))
    }),
    o(() => {
      r.skinToneButtonText = r.skinTones[r.currentSkinTone]
    }),
    o(() => {
      r.skinToneButtonLabel = r.i18n.skinToneLabel.replace(
        '{skinTone}',
        r.i18n.skinTones[r.currentSkinTone],
      )
    }),
    o(() => {
      async function y() {
        const { database: A } = r,
          z = (
            await Promise.all(Jl.map((B) => A.getEmojiByUnicodeOrName(B)))
          ).filter(Boolean)
        r.defaultFavoriteEmojis = z
      }
      r.databaseLoaded && y()
    })
  function C() {
    r.database.customEmoji = r.customEmoji || tn
  }
  o(() => {
    async function y() {
      C()
      const { database: A, defaultFavoriteEmojis: z, numColumns: B } = r,
        Q = await A.getTopFavoriteEmoji(B),
        Y = await $(Ki([...Q, ...z], (ce) => ce.unicode || ce.name).slice(0, B))
      r.currentFavorites = Y
    }
    r.databaseLoaded && r.defaultFavoriteEmojis && y()
  })
  function D(y) {
    fd(y, i, (A) => {
      {
        const z = getComputedStyle(u.rootElement),
          B = parseInt(z.getPropertyValue('--num-columns'), 10),
          Q = z.getPropertyValue('direction') === 'rtl',
          ce = y.parentElement.getBoundingClientRect().width - A
        ;(r.numColumns = B), (r.scrollbarWidth = ce), (r.isRtl = Q)
      }
    })
  }
  o(() => {
    async function y() {
      const {
        searchText: A,
        currentGroup: z,
        databaseLoaded: B,
        customEmoji: Q,
      } = r
      if (!B) (r.currentEmojis = []), (r.searchMode = !1)
      else if (A.length >= Zl) {
        const Y = await M(A)
        r.searchText === A && (m(Y), p(!0))
      } else {
        const { id: Y } = z
        if (Y !== -1 || (Q && Q.length)) {
          const ce = await I(Y)
          r.currentGroup.id === Y && (m(ce), p(!1))
        }
      }
    }
    y()
  }),
    o(() => {
      const { currentEmojis: y, emojiVersion: A } = r,
        z = y
          .filter((B) => B.unicode)
          .filter((B) => Fr(B) && !yn.has(B.unicode))
      if (!A && z.length) m(y), bu(() => v(z))
      else {
        const B = A ? y : y.filter(H)
        m(B), bu(() => md(u.tabpanelElement))
      }
    })
  function v(y) {
    hd(y, u.baselineEmoji, a), (r.currentEmojis = r.currentEmojis)
  }
  function H(y) {
    return !y.unicode || !Fr(y) || yn.get(y.unicode)
  }
  async function R(y) {
    const A = r.emojiVersion || (await Qu())
    return y.filter(({ version: z }) => !z || z <= A)
  }
  async function $(y) {
    return ld(y, r.emojiVersion || (await Qu()))
  }
  async function I(y) {
    const A = y === -1 ? r.customEmoji : await r.database.getEmojiByGroup(y)
    return $(await R(A))
  }
  async function M(y) {
    return $(await R(await r.database.getEmojiBySearchQuery(y)))
  }
  o(() => {}),
    o(() => {
      function y() {
        const { searchMode: z, currentEmojis: B } = r
        if (z) return [{ category: '', emojis: B }]
        const Q = new Map()
        for (const Y of B) {
          const ce = Y.category || ''
          let mt = Q.get(ce)
          mt || ((mt = []), Q.set(ce, mt)), mt.push(Y)
        }
        return [...Q.entries()]
          .map(([Y, ce]) => ({ category: Y, emojis: ce }))
          .sort((Y, ce) => r.customCategorySorting(Y.category, ce.category))
      }
      const A = y()
      h(A)
    }),
    o(() => {
      r.activeSearchItemId =
        r.activeSearchItem !== -1 && r.currentEmojis[r.activeSearchItem].id
    }),
    o(() => {
      const { rawSearchText: y } = r
      Gi(() => {
        ;(r.searchText = (y || '').trim()), (r.activeSearchItem = -1)
      })
    })
  function q(y) {
    if (!r.searchMode || !r.currentEmojis.length) return
    const A = (z) => {
      je(y), (r.activeSearchItem = Yu(z, r.activeSearchItem, r.currentEmojis))
    }
    switch (y.key) {
      case 'ArrowDown':
        return A(!1)
      case 'ArrowUp':
        return A(!0)
      case 'Enter':
        if (r.activeSearchItem === -1) r.activeSearchItem = 0
        else return je(y), re(r.currentEmojis[r.activeSearchItem].id)
    }
  }
  function N(y) {
    const { target: A } = y,
      z = A.closest('.nav-button')
    if (!z) return
    const B = parseInt(z.dataset.groupId, 10)
    ;(u.searchElement.value = ''),
      (r.rawSearchText = ''),
      (r.searchText = ''),
      (r.activeSearchItem = -1),
      (r.currentGroupIndex = r.groups.findIndex((Q) => Q.id === B))
  }
  function O(y) {
    const { target: A, key: z } = y,
      B = (Q) => {
        Q && (je(y), Q.focus())
      }
    switch (z) {
      case 'ArrowLeft':
        return B(A.previousElementSibling)
      case 'ArrowRight':
        return B(A.nextElementSibling)
      case 'Home':
        return B(A.parentElement.firstElementChild)
      case 'End':
        return B(A.parentElement.lastElementChild)
    }
  }
  async function re(y) {
    const A = await r.database.getEmojiByUnicodeOrName(y),
      z = [...r.currentEmojis, ...r.currentFavorites].find((Q) => Q.id === y),
      B = z.unicode && _(z, r.currentSkinTone)
    await r.database.incrementFavoriteEmojiCount(y),
      c('emoji-click', {
        emoji: A,
        skinTone: r.currentSkinTone,
        ...(B && { unicode: B }),
        ...(z.name && { name: z.name }),
      })
  }
  async function pe(y) {
    const { target: A } = y
    if (!A.classList.contains('emoji')) return
    je(y)
    const z = A.id.substring(4)
    re(z)
  }
  function ze(y) {
    ;(r.currentSkinTone = y),
      (r.skinTonePickerExpanded = !1),
      s('skintone-button'),
      c('skin-tone-change', { skinTone: y }),
      r.database.setPreferredSkinTone(y)
  }
  function Le(y) {
    const {
        target: { id: A },
      } = y,
      z = A && A.match(/^skintone-(\d)/)
    if (!z) return
    je(y)
    const B = parseInt(z[1], 10)
    ze(B)
  }
  function It(y) {
    ;(r.skinTonePickerExpanded = !r.skinTonePickerExpanded),
      (r.activeSkinTone = r.currentSkinTone),
      r.skinTonePickerExpanded && (je(y), bu(() => s('skintone-list')))
  }
  o(() => {
    r.skinTonePickerExpanded
      ? u.skinToneDropdown.addEventListener(
          'transitionend',
          () => {
            r.skinTonePickerExpandedAfterAnimation = !0
          },
          { once: !0 },
        )
      : (r.skinTonePickerExpandedAfterAnimation = !1)
  })
  function zu(y) {
    if (!r.skinTonePickerExpanded) return
    const A = async (z) => {
      je(y), (r.activeSkinTone = z)
    }
    switch (y.key) {
      case 'ArrowUp':
        return A(Yu(!0, r.activeSkinTone, r.skinTones))
      case 'ArrowDown':
        return A(Yu(!1, r.activeSkinTone, r.skinTones))
      case 'Home':
        return A(0)
      case 'End':
        return A(r.skinTones.length - 1)
      case 'Enter':
        return je(y), ze(r.activeSkinTone)
      case 'Escape':
        return je(y), (r.skinTonePickerExpanded = !1), s('skintone-button')
    }
  }
  function Lu(y) {
    if (r.skinTonePickerExpanded)
      switch (y.key) {
        case ' ':
          return je(y), ze(r.activeSkinTone)
      }
  }
  async function ju(y) {
    const { relatedTarget: A } = y
    ;(!A || A.id !== 'skintone-list') && (r.skinTonePickerExpanded = !1)
  }
  function ut(y) {
    r.rawSearchText = y.target.value
  }
  return {
    $set(y) {
      su(r, y)
    },
    $destroy() {
      n.abort()
    },
  }
}
const zd =
    'https://cdn.jsdelivr.net/npm/emoji-picker-element-data@^1/en/emojibase/data.json',
  Ld = 'en'
var jd = {
    categoriesLabel: 'Categories',
    emojiUnsupportedMessage: 'Your browser does not support color emoji.',
    favoritesLabel: 'Favorites',
    loadingMessage: 'Loading…',
    networkErrorMessage: 'Could not load emoji.',
    regionLabel: 'Emoji picker',
    searchDescription:
      'When search results are available, press up or down to select and enter to choose.',
    searchLabel: 'Search',
    searchResultsLabel: 'Search results',
    skinToneDescription:
      'When expanded, press up or down to select and enter to choose.',
    skinToneLabel: 'Choose a skin tone (currently {skinTone})',
    skinTonesLabel: 'Skin tones',
    skinTones: [
      'Default',
      'Light',
      'Medium-Light',
      'Medium',
      'Medium-Dark',
      'Dark',
    ],
    categories: {
      custom: 'Custom',
      'smileys-emotion': 'Smileys and emoticons',
      'people-body': 'People and body',
      'animals-nature': 'Animals and nature',
      'food-drink': 'Food and drink',
      'travel-places': 'Travel and places',
      activities: 'Activities',
      objects: 'Objects',
      symbols: 'Symbols',
      flags: 'Flags',
    },
  },
  Md =
    ':host{--emoji-size:1.375rem;--emoji-padding:0.5rem;--category-emoji-size:var(--emoji-size);--category-emoji-padding:var(--emoji-padding);--indicator-height:3px;--input-border-radius:0.5rem;--input-border-size:1px;--input-font-size:1rem;--input-line-height:1.5;--input-padding:0.25rem;--num-columns:8;--outline-size:2px;--border-size:1px;--skintone-border-radius:1rem;--category-font-size:1rem;display:flex;width:min-content;height:400px}:host,:host(.light){color-scheme:light;--background:#fff;--border-color:#e0e0e0;--indicator-color:#385ac1;--input-border-color:#999;--input-font-color:#111;--input-placeholder-color:#999;--outline-color:#999;--category-font-color:#111;--button-active-background:#e6e6e6;--button-hover-background:#d9d9d9}:host(.dark){color-scheme:dark;--background:#222;--border-color:#444;--indicator-color:#5373ec;--input-border-color:#ccc;--input-font-color:#efefef;--input-placeholder-color:#ccc;--outline-color:#fff;--category-font-color:#efefef;--button-active-background:#555555;--button-hover-background:#484848}@media (prefers-color-scheme:dark){:host{color-scheme:dark;--background:#222;--border-color:#444;--indicator-color:#5373ec;--input-border-color:#ccc;--input-font-color:#efefef;--input-placeholder-color:#ccc;--outline-color:#fff;--category-font-color:#efefef;--button-active-background:#555555;--button-hover-background:#484848}}:host([hidden]){display:none}button{margin:0;padding:0;border:0;background:0 0;box-shadow:none;-webkit-tap-highlight-color:transparent}button::-moz-focus-inner{border:0}input{padding:0;margin:0;line-height:1.15;font-family:inherit}input[type=search]{-webkit-appearance:none}:focus{outline:var(--outline-color) solid var(--outline-size);outline-offset:calc(-1*var(--outline-size))}:host([data-js-focus-visible]) :focus:not([data-focus-visible-added]){outline:0}:focus:not(:focus-visible){outline:0}.hide-focus{outline:0}*{box-sizing:border-box}.picker{contain:content;display:flex;flex-direction:column;background:var(--background);border:var(--border-size) solid var(--border-color);width:100%;height:100%;overflow:hidden;--total-emoji-size:calc(var(--emoji-size) + (2 * var(--emoji-padding)));--total-category-emoji-size:calc(var(--category-emoji-size) + (2 * var(--category-emoji-padding)))}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}.hidden{opacity:0;pointer-events:none}.abs-pos{position:absolute;left:0;top:0}.gone{display:none!important}.skintone-button-wrapper,.skintone-list{background:var(--background);z-index:3}.skintone-button-wrapper.expanded{z-index:1}.skintone-list{position:absolute;inset-inline-end:0;top:0;z-index:2;overflow:visible;border-bottom:var(--border-size) solid var(--border-color);border-radius:0 0 var(--skintone-border-radius) var(--skintone-border-radius);will-change:transform;transition:transform .2s ease-in-out;transform-origin:center 0}@media (prefers-reduced-motion:reduce){.skintone-list{transition-duration:.001s}}@supports not (inset-inline-end:0){.skintone-list{right:0}}.skintone-list.no-animate{transition:none}.tabpanel{overflow-y:auto;-webkit-overflow-scrolling:touch;will-change:transform;min-height:0;flex:1;contain:content}.emoji-menu{display:grid;grid-template-columns:repeat(var(--num-columns),var(--total-emoji-size));justify-content:space-around;align-items:flex-start;width:100%}.category{padding:var(--emoji-padding);font-size:var(--category-font-size);color:var(--category-font-color)}.custom-emoji,.emoji,button.emoji{height:var(--total-emoji-size);width:var(--total-emoji-size)}.emoji,button.emoji{font-size:var(--emoji-size);display:flex;align-items:center;justify-content:center;border-radius:100%;line-height:1;overflow:hidden;font-family:var(--emoji-font-family);cursor:pointer}@media (hover:hover) and (pointer:fine){.emoji:hover,button.emoji:hover{background:var(--button-hover-background)}}.emoji.active,.emoji:active,button.emoji.active,button.emoji:active{background:var(--button-active-background)}.custom-emoji{padding:var(--emoji-padding);object-fit:contain;pointer-events:none;background-repeat:no-repeat;background-position:center center;background-size:var(--emoji-size) var(--emoji-size)}.nav,.nav-button{align-items:center}.nav{display:grid;justify-content:space-between;contain:content}.nav-button{display:flex;justify-content:center}.nav-emoji{font-size:var(--category-emoji-size);width:var(--total-category-emoji-size);height:var(--total-category-emoji-size)}.indicator-wrapper{display:flex;border-bottom:1px solid var(--border-color)}.indicator{width:calc(100%/var(--num-groups));height:var(--indicator-height);opacity:var(--indicator-opacity);background-color:var(--indicator-color);will-change:transform,opacity;transition:opacity .1s linear,transform .25s ease-in-out}@media (prefers-reduced-motion:reduce){.indicator{will-change:opacity;transition:opacity .1s linear}}.pad-top,input.search{background:var(--background);width:100%}.pad-top{height:var(--emoji-padding);z-index:3}.search-row{display:flex;align-items:center;position:relative;padding-inline-start:var(--emoji-padding);padding-bottom:var(--emoji-padding)}.search-wrapper{flex:1;min-width:0}input.search{padding:var(--input-padding);border-radius:var(--input-border-radius);border:var(--input-border-size) solid var(--input-border-color);color:var(--input-font-color);font-size:var(--input-font-size);line-height:var(--input-line-height)}input.search::placeholder{color:var(--input-placeholder-color)}.favorites{display:flex;flex-direction:row;border-top:var(--border-size) solid var(--border-color);contain:content}.message{padding:var(--emoji-padding)}'
const Xi = [
    'customEmoji',
    'customCategorySorting',
    'database',
    'dataSource',
    'i18n',
    'locale',
    'skinToneEmoji',
    'emojiVersion',
  ],
  Rd = `:host{--emoji-font-family:${Zi}}`
class Qi extends HTMLElement {
  constructor(t) {
    super(), this.attachShadow({ mode: 'open' })
    const u = document.createElement('style')
    ;(u.textContent = Md + Rd),
      this.shadowRoot.appendChild(u),
      (this._ctx = {
        locale: Ld,
        dataSource: zd,
        skinToneEmoji: Ql,
        customCategorySorting: ed,
        customEmoji: null,
        i18n: jd,
        emojiVersion: null,
        ...t,
      })
    for (const n of Xi)
      n !== 'database' &&
        Object.prototype.hasOwnProperty.call(this, n) &&
        ((this._ctx[n] = this[n]), delete this[n])
    this._dbFlush()
  }
  connectedCallback() {
    this._cmp || (this._cmp = Id(this.shadowRoot, this._ctx))
  }
  disconnectedCallback() {
    Cu(() => {
      if (!this.isConnected && this._cmp) {
        this._cmp.$destroy(), (this._cmp = void 0)
        const { database: t } = this._ctx
        t.close().catch((u) => console.error(u))
      }
    })
  }
  static get observedAttributes() {
    return ['locale', 'data-source', 'skin-tone-emoji', 'emoji-version']
  }
  attributeChangedCallback(t, u, n) {
    this._set(
      t.replace(/-([a-z])/g, (i, r) => r.toUpperCase()),
      t === 'emoji-version' ? parseFloat(n) : n,
    )
  }
  _set(t, u) {
    ;(this._ctx[t] = u),
      this._cmp && this._cmp.$set({ [t]: u }),
      ['locale', 'dataSource'].includes(t) && this._dbFlush()
  }
  _dbCreate() {
    const { locale: t, dataSource: u, database: n } = this._ctx
    ;(!n || n.locale !== t || n.dataSource !== u) &&
      this._set('database', new Gl({ locale: t, dataSource: u }))
  }
  _dbFlush() {
    Cu(() => this._dbCreate())
  }
}
const Yi = {}
for (const e of Xi)
  Yi[e] = {
    get() {
      return e === 'database' && this._dbCreate(), this._ctx[e]
    },
    set(t) {
      if (e === 'database') throw new Error('database is read-only')
      this._set(e, t)
    },
  }
Object.defineProperties(Qi.prototype, Yi)
customElements.get('emoji-picker') || customElements.define('emoji-picker', Qi)
const Od = {
    data() {
      const e = parseInt(this.$route.params.id),
        t = Bu.getContactor(e)
      return (
        console.log(t),
        {
          acting: t,
          showwindow: !0,
          showemoji: !1,
          userInput: '',
          todld: !1,
          client: Bu,
        }
      )
    },
    methods: {
      getSafeText(e) {
        return e.replace(/</g, '&lt;').replace(/>/g, '&gt;')
      },
      handleKeyDown(e) {
        e.ctrlKey &&
          e.key === 'Enter' &&
          (this.userInput && this.isValidInput(this.userInput)
            ? this.send()
            : this.$message({ message: '不能发送空消息', type: 'warning' }))
      },
      async send() {
        this.$refs.textarea.focus()
        const e = this.getSafeText(this.userInput)
        this.userInput = this.textareaRef.value = null
        const t = {
            role: 'user',
            time: new Date().getTime(),
            content: { voice: [], image: [], text: [e] },
          },
          u = await this.acting.webSend(t)
        ;(t.id = u), setTimeout(this.tobuttom, 0), Bu.setLocalStorage()
      },
      eemoji() {
        this.showemoji = !this.showemoji
      },
      getemoji(e) {
        const t = e.detail.unicode,
          u = this.$refs.textarea,
          n = u.selectionStart,
          i = u.selectionEnd,
          r = this.userInput.substring(0, n),
          o = this.userInput.substring(i)
        this.userInput = r + t + o
        const s = n + t.length
        ;(u.selectionStart = s),
          (u.selectionEnd = s),
          u.focus(),
          (this.showemoji = !this.showemoji)
      },
      updateCursorPosition() {
        const e = this.$refs.textarea
        this.cursorPosition = e.selectionStart
      },
      tobuttom(e) {
        e && this.$message('已滑至底部')
        const t = this.$refs.chatWindow
        t.scrollTop = t.scrollHeight
      },
      cleanScreen() {
        this.acting.clean(), this.global.stroge()
      },
      async reset() {
        this.one.init()
      },
      tolist() {
        this.global.alldown(), this.global.tochat(!1)
      },
      isValidInput(e) {
        return !/^[ \n]+$/.test(e)
      },
      waiting() {
        this.$message({ message: '此功能尚未开放', type: 'warning' })
      },
      async voiceList() {
        let e = ['关闭']
        const t = await this.one.getVoices()
        ;(this.tochoose.list = e.concat(t)),
          (this.listype = 1),
          (this.tochoose.chosen =
            this.crtvoice === '关闭'
              ? 0
              : 1 + t.findIndex((u) => u === this.crtvoice)),
          (this.showchose = !0)
      },
      async modelList() {
        let e = ['关闭']
        const t = await getModels()
        ;(this.tochoose.list = e.concat(t)),
          (this.tochoose.chosen = 0),
          (this.showchose = !0)
      },
      getList(e) {
        ;(this.showchose = !1),
          console.log(e),
          console.log(this.listype),
          this.listype === 1
            ? (console.log('dsdasdasdas'), this.changevoice(e))
            : this.listype === 2
              ? this.changemodel(result)
              : this.listype === 3 && this.readmsg(e)
      },
      changevoice(e) {
        console.log(e)
        const t = e.list[e.chosen]
        ;(this.crtvoice = t), (this.userInput = '切换语音 ' + t), this.send()
      },
      async revmsg(e) {
        const t = await this.one.getResponse(e.reqid),
          u = t.container.content
        ;(u.text.length || u.image.length || u.voice.length) &&
          (this.global.friend.find((i) => i.uin === e.uin).addmsg(t.container),
          this.global.stroge()),
          t.continue ? this.revmsg(e) : console.log(u),
          (this.toupdate = !0)
      },
      toplay(e) {
        const t = `voice-${e}`,
          u = document.getElementById(t)
        u.paused
          ? (u.play(), (this.playing = !0))
          : (u.pause(), (this.playing = !1))
        const n = () => {
          ;(this.playing = !1), audioNaNpxoveEventListener('ended', n)
        }
        u.addEventListener('ended', n)
      },
      pickmsg(e) {
        const t = ['复制文本', '删除消息']
        ;(this.listype = 3),
          (this.tochoose.list = t),
          (this.tochoose.chosen = null),
          (this.showchose = !0),
          (this.pickedmsg = e),
          console.log(this.acting.history[e])
      },
      readmsg(e) {
        if ((console.log(e), e.chosen === 0)) {
          var t = document.createElement('textarea')
          ;(t.value = this.acting.history[this.pickedmsg].content.text[0]),
            document.body.appendChild(t),
            t.select(),
            document.execCommand('copy'),
            document.bodyNaNpxoveChild(t),
            this.$message('已复制')
        } else
          this.acting.history.splice(this.pickedmsg, 1),
            this.$message('已删除'),
            this.global.stroge()
      },
    },
    mounted() {
      ;(this.textareaRef = this.$refs.textarea),
        this.textareaRef.addEventListener('input', this.adjustTextareaHeight),
        console.log(this.acting),
        setTimeout(this.tobuttom, 50),
        this.acting.on('revMessage', (e) => {
          this.acting.messageChain.push(e), (this.toupdate = !0)
        })
    },
    updated() {
      this.toupdate && (setTimeout(this.tobuttom, 0), (this.toupdate = !1))
    },
    components: { MdPreview: pu },
    watch: {},
  },
  X = (e) => (co('data-v-f7da6f29'), (e = e()), lo(), e),
  Bd = { id: 'chatwindow' },
  Pd = { class: 'upsidebar', id: 'chat' },
  $d = X(() =>
    F(
      'svg',
      {
        t: '1696954263382',
        class: 'icon',
        viewBox: '0 0 1024 1024',
        version: '1.1',
        xmlns: 'http://www.w3.org/2000/svg',
        'p-id': '1042',
        width: '20',
        height: '20',
      },
      [
        F('path', {
          d: 'M776.191485 982.272081L296.192421 515.840991c-1.279998-1.279998-1.535997-2.815995-1.535997-3.839993 0-1.023998 0.256-2.559995 1.535997-3.839992L775.935485 41.729915c6.143988-5.887989 6.399988-15.871969 0.511999-22.015957l-14.335972-14.847971c-5.887989-6.399988-15.61597-6.399988-21.759957-0.511999L260.60849 470.785079c-11.263978 11.007979-17.407966 25.59995-17.407966 41.215919 0 15.61597 6.143988 30.463941 17.407966 41.21592l479.999064 466.43109c6.143988 5.887989 15.871969 5.631989 21.759958-0.511999l14.335972-14.847971c5.887989-6.143988 5.631989-16.127969-0.511999-22.015957z',
          'p-id': '1043',
        }),
      ],
      -1,
    ),
  ),
  Nd = [$d],
  qd = { key: 0, class: 'somebody' },
  Hd = { class: 'options' },
  Ud = { id: 'system' },
  Vd = X(() =>
    F(
      'svg',
      {
        t: '1696841764189',
        class: 'icon',
        viewBox: '0 0 1024 1024',
        version: '1.1',
        xmlns: 'http://www.w3.org/2000/svg',
        'p-id': '4521',
        width: '16',
        height: '16',
      },
      [
        F('path', {
          d: 'M746.666667 490.666667v42.666666a21.333333 21.333333 0 0 1-21.333334 21.333334H298.666667a21.333333 21.333333 0 0 1-21.333334-21.333334v-42.666666A21.333333 21.333333 0 0 1 298.666667 469.333333h426.666666a21.333333 21.333333 0 0 1 21.333334 21.333334z',
          fill: '#333333',
          'p-id': '4522',
        }),
      ],
      -1,
    ),
  ),
  Wd = [Vd],
  Gd = X(() =>
    F(
      'svg',
      {
        t: '1696841744276',
        class: 'icon',
        viewBox: '0 0 1024 1024',
        version: '1.1',
        xmlns: 'http://www.w3.org/2000/svg',
        'p-id': '4306',
        width: '16',
        height: '16',
      },
      [
        F('path', {
          d: 'M736 234.666667H288c-29.44 0-53.333333 23.893333-53.333333 53.333333v448c0 29.44 23.893333 53.333333 53.333333 53.333333h448c29.44 0 53.333333-23.893333 53.333333-53.333333V288c0-29.44-23.893333-53.333333-53.333333-53.333333zM725.333333 298.666667v426.666666H298.666667V298.666667h426.666666z',
          fill: '#333333',
          'p-id': '4307',
        }),
      ],
      -1,
    ),
  ),
  Zd = [Gd],
  Kd = X(() =>
    F(
      'svg',
      {
        t: '1696841669425',
        class: 'icon',
        viewBox: '0 0 1024 1024',
        version: '1.1',
        xmlns: 'http://www.w3.org/2000/svg',
        'p-id': '4127',
        width: '16',
        height: '16',
      },
      [
        F('path', {
          d: 'M344.362667 299.093333L512 466.773333l167.68-167.68a21.333333 21.333333 0 0 1 27.178667-2.432l2.986666 2.474667 15.061334 15.061333a21.333333 21.333333 0 0 1 0 30.165334L557.226667 512l167.68 167.68a21.333333 21.333333 0 0 1 0 30.165333l-15.104 15.061334a21.333333 21.333333 0 0 1-30.165334 0l-167.68-167.637334-167.594666 167.68a21.333333 21.333333 0 0 1-27.178667 2.432l-2.986667-2.474666-15.061333-15.061334a21.333333 21.333333 0 0 1 0-30.165333l167.594667-167.68-167.594667-167.594667a21.333333 21.333333 0 0 1 0-30.165333l15.061333-15.061333a21.333333 21.333333 0 0 1 30.165334 0z',
          fill: '#333333',
          'p-id': '4128',
        }),
      ],
      -1,
    ),
  ),
  Xd = [Kd],
  Qd = X(() =>
    F(
      'svg',
      {
        t: '1696841917190',
        class: 'icon',
        viewBox: '0 0 1024 1024',
        version: '1.1',
        xmlns: 'http://www.w3.org/2000/svg',
        'p-id': '4742',
      },
      [
        F('path', {
          d: 'M677.333333 245.333333a101.333333 101.333333 0 1 1-76.032 168.362667l-154.026666 85.546667a107.776 107.776 0 0 1-0.64 29.909333l151.978666 84.394667a101.333333 101.333333 0 1 1-22.570666 60.8l-158.250667-87.978667a106.666667 106.666667 0 1 1 2.944-145.621333l155.562667-86.357334a101.333333 101.333333 0 0 1 101.034666-109.056z m0 394.666667a37.333333 37.333333 0 1 0 0 74.666667 37.333333 37.333333 0 0 0 0-74.666667zM341.333333 469.333333a42.666667 42.666667 0 1 0 0 85.333334 42.666667 42.666667 0 0 0 0-85.333334z m336-160a37.333333 37.333333 0 1 0 0 74.666667 37.333333 37.333333 0 0 0 0-74.666667z',
          'p-id': '4743',
        }),
      ],
      -1,
    ),
  ),
  Yd = [Qd],
  Jd = { class: 'message-window', ref: 'chatWindow' },
  ef = ['id'],
  tf = { class: 'avatar' },
  uf = ['src', 'alt'],
  nf = ['src', 'alt'],
  rf = { class: 'msg' },
  of = { class: 'wholename' },
  sf = { class: 'title' },
  af = { class: 'name' },
  cf = { key: 0, class: 'content' },
  lf = { key: 1, class: 'content' },
  df = { key: 2, class: 'content' },
  ff = { class: 'voice-box' },
  hf = ['onClick'],
  pf = {
    key: 0,
    t: '1698576153001',
    viewBox: '0 0 1024 1024',
    version: '1.1',
    xmlns: 'http://www.w3.org/2000/svg',
    'p-id': '7815',
    width: '13',
    height: '13',
  },
  mf = X(() =>
    F(
      'path',
      {
        d: 'M889.18 512.01c-128.19 94.47-241.09 167.88-338.7 220.25S326.29 839.69 170.75 897.44c-23.95-128.25-35.92-256.65-35.92-385.2s11.97-257.11 35.92-385.67c111.17 33.95 228.05 83.81 350.65 149.58 122.59 65.78 245.18 144.4 367.78 235.86z',
        fill: '#ffffff',
        'p-id': '7816',
      },
      null,
      -1,
    ),
  ),
  bf = X(() =>
    F(
      'path',
      {
        d: 'M170.75 940.27c-7.32 0-14.6-1.88-21.1-5.56a42.8 42.8 0 0 1-20.99-29.4C104.34 775.07 92 642.79 92 512.24c0-130.53 12.34-262.94 36.66-393.51a42.708 42.708 0 0 1 19.89-28.77c10.43-6.32 23-7.95 34.71-4.35 113.38 34.65 233.95 86.05 358.37 152.8 123.96 66.5 249.47 147.01 373.14 239.29A42.806 42.806 0 0 1 932 512.14a42.816 42.816 0 0 1-17.4 34.36c-129.02 95.08-244.74 170.28-343.86 223.52-98.81 52.99-228.37 109.37-385.08 167.58a42.848 42.848 0 0 1-14.91 2.67z m33.73-757.78c-17.82 109.74-26.83 220.45-26.83 329.75 0 108.47 8.89 218.21 26.41 326.86 131.47-50.31 241.02-98.87 326.17-144.54 83.41-44.79 179.52-106.14 286.29-182.68C711.55 436.46 605.7 370 501.15 313.9c-102.61-55.06-202.19-99.14-296.67-131.41z',
        fill: '#ffffff',
        'p-id': '7817',
      },
      null,
      -1,
    ),
  ),
  gf = [mf, bf],
  xf = {
    key: 1,
    t: '1698574343186',
    viewBox: '0 0 1024 1024',
    version: '1.1',
    xmlns: 'http://www.w3.org/2000/svg',
    'p-id': '5329',
    id: 'mx_n_1698574343188',
    width: '16',
    height: '16',
  },
  _f = X(() =>
    F(
      'path',
      {
        d: 'M312.89 960a99.55 99.55 0 0 0 99.55-99.56V163.56A99.55 99.55 0 0 0 312.89 64a99.56 99.56 0 0 0-99.56 99.56v696.88A99.56 99.56 0 0 0 312.89 960z m298.67-796.44v696.88A99.55 99.55 0 0 0 711.11 960a99.56 99.56 0 0 0 99.56-99.56V163.56A99.56 99.56 0 0 0 711.11 64a99.55 99.55 0 0 0-99.55 99.56z',
        'p-id': '5330',
        fill: '#ffffff',
      },
      null,
      -1,
    ),
  ),
  kf = [_f],
  yf = X(() =>
    F(
      'div',
      { class: 'wave' },
      [
        F(
          'svg',
          {
            t: '1698574454596',
            viewBox: '0 0 5939 1024',
            version: '1.1',
            xmlns: 'http://www.w3.org/2000/svg',
            'p-id': '6750',
          },
          [
            F('path', {
              d: 'M665.6 358.4c28.16 0 51.2 21.504 51.2 47.7696v262.8608c0 26.2656-23.04 47.7696-51.2 47.7696s-51.2-21.504-51.2-47.7696V406.1696C614.4 379.904 636.9792 358.4 665.6 358.4z m1843.2 0c28.16 0 51.2 21.504 51.2 47.7696v262.8608c0 26.2656-23.04 47.7696-51.2 47.7696s-51.2-21.504-51.2-47.7696V406.1696C2457.6 379.904 2480.64 358.4 2508.8 358.4z m1536 0c28.16 0 51.2 21.504 51.2 47.7696v262.8608c0 26.2656-23.04 47.7696-51.2 47.7696s-51.2-21.504-51.2-47.7696V406.1696C3993.1392 379.904 4016.2304 358.4 4044.8 358.4z m1843.2 0c28.16 0 51.2 21.504 51.2 47.7696v262.8608c0 26.2656-23.04 47.7696-51.2 47.7696s-51.2-21.504-51.2-47.7696V406.1696c0-26.2656 22.5792-47.7696 51.2-47.7696zM2816 307.2c28.16 0 51.2 19.7632 51.2 43.8784v373.0432c0 24.1152-23.04 43.8784-51.2 43.8784s-51.2-19.7632-51.2-43.8784V351.0784c0-24.1152 23.04-43.8784 51.2-43.8784z m921.6-51.2c28.16 0 51.2 20.2752 51.2 45.056v473.088c0 24.7808-23.04 45.056-51.2 45.056s-51.2-20.2752-51.2-45.056V301.056c0-24.7808 23.04-45.056 51.2-45.056zM3123.2 358.4c28.16 0 51.2 23.04 51.2 51.2v204.8c0 28.16-23.04 51.2-51.2 51.2s-51.2-23.04-51.2-51.2V409.6c0-28.6208 23.04-51.2 51.2-51.2z m307.2-51.2c28.16 0 51.2 21.7088 51.2 48.128v313.344c0 26.4192-23.04 48.128-51.2 48.128s-51.2-21.7088-51.2-48.128V355.328c-0.4608-26.88 22.6304-48.128 51.2-48.128zM358.4 256c28.16 0 51.2 20.2752 51.2 45.056v473.088c0 24.7808-23.04 45.056-51.2 45.056s-51.2-20.2752-51.2-45.056V301.056C307.2 276.2752 330.24 256 358.4 256zM51.2 358.4c28.16 0 51.2 23.04 51.2 51.2v204.8c0 28.16-23.04 51.2-51.2 51.2s-51.2-23.04-51.2-51.2V409.6c0-28.6208 22.5792-51.2 51.2-51.2z m921.6-102.4c28.16 0 51.2 20.992 51.2 46.4896v419.0208c0 25.5488-23.04 46.4896-51.2 46.4896s-51.2-20.992-51.2-46.4896V302.4896C921.6 276.992 944.64 256 972.8 256z m1228.8 0c28.16 0 51.2 20.992 51.2 46.4896v419.0208c0 25.5488-23.04 46.4896-51.2 46.4896s-51.2-20.992-51.2-46.4896V302.4896C2150.4 276.992 2173.44 256 2201.6 256z m2150.4 0c28.16 0 51.2 22.016 51.2 48.9472v465.3056c0 26.88-23.04 48.9472-51.2 48.9472s-51.2-22.016-51.2-48.9472V304.9472c0-26.88 23.04-48.9472 51.2-48.9472z m1228.8 0c28.16 0 51.2 20.992 51.2 46.4896v419.0208c0 25.5488-23.04 46.4896-51.2 46.4896s-51.2-20.992-51.2-46.4896V302.4896c0-25.5488 23.04-46.4896 51.2-46.4896zM1280 204.8c28.16 0 51.2 21.2992 51.2 47.2064v519.9872c0 25.9072-23.04 47.2064-51.2 47.2064s-51.2-21.2992-51.2-47.2064V252.0064c0-25.9072 23.04-47.2064 51.2-47.2064z m614.4 0c28.16 0 51.2 20.6336 51.2 45.8752v573.8496c0 25.2416-23.04 45.8752-51.2 45.8752s-51.2-20.6336-51.2-45.8752V250.6752c0-25.2416 23.04-45.8752 51.2-45.8752z m2764.8-51.2c28.16 0 51.2 21.504 51.2 47.7696v621.2608c0 26.2656-23.04 47.7696-51.2 47.7696s-51.2-21.504-51.2-47.7696V201.3696C4607.5392 175.104 4630.6304 153.6 4659.2 153.6z m614.4 0c28.16 0 51.2 21.504 51.2 47.7696v621.2608c0 26.2656-23.04 47.7696-51.2 47.7696s-51.2-21.504-51.2-47.7696V201.3696c0-26.2656 22.5792-47.7696 51.2-47.7696zM1587.2 0c28.16 0 51.2 20.992 51.2 46.4896v931.0208c0 25.5488-23.04 46.4896-51.2 46.4896s-51.2-20.992-51.2-46.4896V46.4896C1536 20.992 1559.04 0 1587.2 0z m3379.2 51.2c28.16 0 51.2 20.736 51.2 46.08v829.44c0 25.344-23.04 46.08-51.2 46.08s-51.2-20.736-51.2-46.08V97.28c0-25.344 23.04-46.08 51.2-46.08z',
              fill: '#333333',
              'p-id': '6751',
            }),
          ],
        ),
      ],
      -1,
    ),
  ),
  vf = ['src', 'id'],
  wf = { class: 'inputbar' },
  Ef = { class: 'options' },
  Cf = { class: 'bu-emoji' },
  Af = X(() => F('p', { id: 'ho-emoji' }, '表情', -1)),
  Df = X(() =>
    F(
      'path',
      {
        d: 'M512 74.666667C270.933333 74.666667 74.666667 270.933333 74.666667 512S270.933333 949.333333 512 949.333333 949.333333 753.066667 949.333333 512 753.066667 74.666667 512 74.666667z m0 810.666666c-204.8 0-373.333333-168.533333-373.333333-373.333333S307.2 138.666667 512 138.666667 885.333333 307.2 885.333333 512 716.8 885.333333 512 885.333333z',
        'p-id': '3989',
      },
      null,
      -1,
    ),
  ),
  Ff = X(() =>
    F(
      'path',
      {
        d: 'M674.133333 608c-46.933333 57.6-100.266667 85.333333-162.133333 85.333333s-115.2-27.733333-162.133333-85.333333c-10.666667-12.8-32-14.933333-44.8-4.266667-12.8 10.666667-14.933333 32-4.266667 44.8 59.733333 70.4 130.133333 106.666667 211.2 106.666667s151.466667-36.266667 211.2-106.666667c10.666667-12.8 8.533333-34.133333-4.266667-44.8-12.8-10.666667-34.133333-8.533333-44.8 4.266667zM362.666667 512c23.466667 0 42.666667-19.2 42.666666-42.666667v-64c0-23.466667-19.2-42.666667-42.666666-42.666666s-42.666667 19.2-42.666667 42.666666v64c0 23.466667 19.2 42.666667 42.666667 42.666667zM661.333333 512c23.466667 0 42.666667-19.2 42.666667-42.666667v-64c0-23.466667-19.2-42.666667-42.666667-42.666666s-42.666667 19.2-42.666666 42.666666v64c0 23.466667 19.2 42.666667 42.666666 42.666667z',
        'p-id': '3990',
      },
      null,
      -1,
    ),
  ),
  Sf = [Df, Ff],
  Tf = { class: 'bu-emoji' },
  If = X(() => F('p', { id: 'ho-emoji' }, '滑到底部', -1)),
  zf = X(() =>
    F(
      'path',
      {
        d: 'M896 864H128c-17.066667 0-32 14.933333-32 32s14.933333 32 32 32h768c17.066667 0 32-14.933333 32-32s-14.933333-32-32-32zM488.533333 727.466667c6.4 6.4 14.933333 8.533333 23.466667 8.533333s17.066667-2.133333 23.466667-8.533333l213.333333-213.333334c12.8-12.8 12.8-32 0-44.8-12.8-12.8-32-12.8-44.8 0l-157.866667 157.866667V170.666667c0-17.066667-14.933333-32-32-32s-34.133333 14.933333-34.133333 32v456.533333L322.133333 469.333333c-12.8-12.8-32-12.8-44.8 0-12.8 12.8-12.8 32 0 44.8l211.2 213.333334z',
        'p-id': '4439',
      },
      null,
      -1,
    ),
  ),
  Lf = [zf],
  jf = { class: 'bu-emoji' },
  Mf = X(() => F('p', { id: 'ho-emoji' }, '重置人格', -1)),
  Rf = X(() =>
    F(
      'path',
      {
        d: 'M934.4 206.933333c-17.066667-4.266667-34.133333 6.4-38.4 23.466667l-23.466667 87.466667C797.866667 183.466667 654.933333 96 497.066667 96 264.533333 96 74.666667 281.6 74.666667 512s189.866667 416 422.4 416c179.2 0 339.2-110.933333 398.933333-275.2 6.4-17.066667-2.133333-34.133333-19.2-40.533333-17.066667-6.4-34.133333 2.133333-40.533333 19.2-51.2 138.666667-187.733333 232.533333-339.2 232.533333C298.666667 864 138.666667 706.133333 138.666667 512S300.8 160 497.066667 160c145.066667 0 277.333333 87.466667 330.666666 217.6l-128-36.266667c-17.066667-4.266667-34.133333 6.4-38.4 23.466667-4.266667 17.066667 6.4 34.133333 23.466667 38.4l185.6 49.066667c2.133333 0 6.4 2.133333 8.533333 2.133333 6.4 0 10.666667-2.133333 17.066667-4.266667 6.4-4.266667 12.8-10.666667 14.933333-19.2l49.066667-185.6c0-17.066667-8.533333-34.133333-25.6-38.4z',
        'p-id': '3850',
      },
      null,
      -1,
    ),
  ),
  Of = [Rf],
  Bf = { class: 'bu-emoji' },
  Pf = X(() => F('p', { id: 'ho-emoji' }, '清除记录', -1)),
  $f = X(() =>
    F(
      'path',
      {
        d: 'M874.666667 241.066667h-202.666667V170.666667c0-40.533333-34.133333-74.666667-74.666667-74.666667h-170.666666c-40.533333 0-74.666667 34.133333-74.666667 74.666667v70.4H149.333333c-17.066667 0-32 14.933333-32 32s14.933333 32 32 32h53.333334V853.333333c0 40.533333 34.133333 74.666667 74.666666 74.666667h469.333334c40.533333 0 74.666667-34.133333 74.666666-74.666667V305.066667H874.666667c17.066667 0 32-14.933333 32-32s-14.933333-32-32-32zM416 170.666667c0-6.4 4.266667-10.666667 10.666667-10.666667h170.666666c6.4 0 10.666667 4.266667 10.666667 10.666667v70.4h-192V170.666667z m341.333333 682.666666c0 6.4-4.266667 10.666667-10.666666 10.666667H277.333333c-6.4 0-10.666667-4.266667-10.666666-10.666667V309.333333h490.666666V853.333333z',
        'p-id': '4764',
      },
      null,
      -1,
    ),
  ),
  Nf = X(() =>
    F(
      'path',
      {
        d: 'M426.666667 736c17.066667 0 32-14.933333 32-32V490.666667c0-17.066667-14.933333-32-32-32s-32 14.933333-32 32v213.333333c0 17.066667 14.933333 32 32 32zM597.333333 736c17.066667 0 32-14.933333 32-32V490.666667c0-17.066667-14.933333-32-32-32s-32 14.933333-32 32v213.333333c0 17.066667 14.933333 32 32 32z',
        'p-id': '4765',
      },
      null,
      -1,
    ),
  ),
  qf = [$f, Nf],
  Hf = { class: 'bu-emoji' },
  Uf = X(() => F('p', { id: 'ho-emoji' }, '语音', -1)),
  Vf = X(() =>
    F(
      'path',
      {
        d: 'M544 851.946667V906.666667a32 32 0 0 1-64 0v-54.72C294.688 835.733333 149.333333 680.170667 149.333333 490.666667v-21.333334a32 32 0 0 1 64 0v21.333334c0 164.949333 133.717333 298.666667 298.666667 298.666666s298.666667-133.717333 298.666667-298.666666v-21.333334a32 32 0 0 1 64 0v21.333334c0 189.514667-145.354667 345.066667-330.666667 361.28zM298.666667 298.56C298.666667 180.8 394.165333 85.333333 512 85.333333c117.781333 0 213.333333 95.541333 213.333333 213.226667v192.213333C725.333333 608.533333 629.834667 704 512 704c-117.781333 0-213.333333-95.541333-213.333333-213.226667V298.56z m64 0v192.213333C362.666667 573.12 429.557333 640 512 640c82.496 0 149.333333-66.805333 149.333333-149.226667V298.56C661.333333 216.213333 594.442667 149.333333 512 149.333333c-82.496 0-149.333333 66.805333-149.333333 149.226667z',
        'p-id': '7283',
      },
      null,
      -1,
    ),
  ),
  Wf = [Vf],
  Gf = { class: 'bu-emoji' },
  Zf = X(() => F('p', { id: 'ho-emoji' }, '模型选择', -1)),
  Kf = X(() =>
    F(
      'path',
      {
        d: 'M618.666667 106.666667H405.333333v85.333333h64v42.666667H149.333333v661.333333h725.333334V234.666667H554.666667V192h64V106.666667zM234.666667 810.666667V320h554.666666v490.666667H234.666667zM21.333333 448v234.666667h85.333334V448H21.333333z m896 0v234.666667h85.333334V448h-85.333334z m-469.333333 64h-106.666667v106.666667h106.666667v-106.666667z m234.666667 0h-106.666667v106.666667h106.666667v-106.666667z',
        'p-id': '6224',
      },
      null,
      -1,
    ),
  ),
  Xf = [Kf],
  Qf = { class: 'input-box' },
  Yf = { class: 'input-content' },
  Jf = ['disabled']
function e1(e, t, u, n, i, r) {
  const o = qn('MdPreview'),
    s = qn('el-image')
  return (
    J(),
    ue('div', Bd, [
      zt(
        F(
          'div',
          Pd,
          [
            F(
              'div',
              {
                class: 'return',
                onClick: t[0] || (t[0] = (...a) => r.tolist && r.tolist(...a)),
              },
              Nd,
            ),
            i.acting.name
              ? (J(), ue('div', qd, Pu(i.acting.name), 1))
              : Yt('', !0),
            F('div', Hd, [
              F('div', Ud, [
                F(
                  'div',
                  {
                    class: 'button',
                    onClick: t[1] || (t[1] = (a) => r.waiting()),
                    id: 'min',
                  },
                  Wd,
                ),
                F(
                  'div',
                  {
                    class: 'button',
                    onClick: t[2] || (t[2] = (a) => r.waiting()),
                    id: 'max',
                  },
                  Zd,
                ),
                F(
                  'div',
                  {
                    class: 'button',
                    onClick: t[3] || (t[3] = (a) => r.waiting()),
                    id: 'close',
                  },
                  Xd,
                ),
              ]),
              F(
                'div',
                { id: 'share', onClick: t[4] || (t[4] = (a) => e.toimg()) },
                Yd,
              ),
            ]),
          ],
          512,
        ),
        [[Qt, i.showwindow]],
      ),
      zt(
        F(
          'div',
          Jd,
          [
            (J(!0),
            ue(
              au,
              null,
              $u(
                i.acting.messageChain,
                (a, c) => (
                  J(),
                  ue(
                    'div',
                    {
                      key: c,
                      class: 'message-container',
                      id: a.role,
                      ref_for: !0,
                      ref: 'message',
                    },
                    [
                      F('div', tf, [
                        a.role === 'other'
                          ? (J(),
                            ue(
                              'img',
                              {
                                key: 0,
                                src: i.acting.avatar,
                                alt: i.acting.name,
                              },
                              null,
                              8,
                              uf,
                            ))
                          : (J(),
                            ue(
                              'img',
                              {
                                key: 1,
                                src: i.client.avatar,
                                alt: i.client.name,
                              },
                              null,
                              8,
                              nf,
                            )),
                      ]),
                      F('div', rf, [
                        F('div', of, [
                          F(
                            'div',
                            sf,
                            Pu(
                              a.role === 'other'
                                ? i.acting.title
                                : i.client.title,
                            ),
                            1,
                          ),
                          F(
                            'div',
                            af,
                            Pu(
                              a.role === 'other'
                                ? i.acting.name
                                : i.client.name,
                            ),
                            1,
                          ),
                        ]),
                        a.content.text.length
                          ? (J(),
                            ue('div', cf, [
                              (J(!0),
                              ue(
                                au,
                                null,
                                $u(
                                  a.content.text,
                                  (l, d) => (
                                    J(),
                                    Nn(
                                      o,
                                      {
                                        previewTheme: 'github',
                                        key: d,
                                        editorId: 'preview-only',
                                        modelValue: l,
                                      },
                                      null,
                                      8,
                                      ['modelValue'],
                                    )
                                  ),
                                ),
                                128,
                              )),
                            ]))
                          : Yt('', !0),
                        a.content.image.length
                          ? (J(),
                            ue('div', lf, [
                              (J(!0),
                              ue(
                                au,
                                null,
                                $u(
                                  a.content.image,
                                  (l, d) => (
                                    J(),
                                    Nn(
                                      s,
                                      {
                                        style: {
                                          margin: '8px 0px',
                                          'max-width': '20rem',
                                          'border-radius': '1rem',
                                        },
                                        src: l,
                                        'zoom-rate': 1.2,
                                        'max-scale': 7,
                                        'min-scale': 0.2,
                                        'preview-src-list': [l],
                                        'initial-index': 4,
                                        key: d,
                                        fit: 'cover',
                                      },
                                      null,
                                      8,
                                      ['src', 'preview-src-list'],
                                    )
                                  ),
                                ),
                                128,
                              )),
                            ]))
                          : Yt('', !0),
                        a.content.voice.length
                          ? (J(),
                            ue('div', df, [
                              F('div', ff, [
                                F(
                                  'div',
                                  {
                                    class: 'icon',
                                    onClick: (l) => r.toplay(a.time),
                                  },
                                  [
                                    e.playing
                                      ? (J(), ue('svg', xf, kf))
                                      : (J(), ue('svg', pf, gf)),
                                  ],
                                  8,
                                  hf,
                                ),
                                yf,
                              ]),
                              F(
                                'audio',
                                {
                                  src: a.content.voice[0],
                                  id: 'voice-' + a.time,
                                },
                                null,
                                8,
                                vf,
                              ),
                            ]))
                          : Yt('', !0),
                      ]),
                    ],
                    8,
                    ef,
                  )
                ),
              ),
              128,
            )),
          ],
          512,
        ),
        [[Qt, i.showwindow]],
      ),
      zt(
        F(
          'div',
          wf,
          [
            F('div', Ef, [
              F('div', Cf, [
                zt(
                  F(
                    'emoji-picker',
                    {
                      ref: 'emojiPicker',
                      onEmojiClick:
                        t[5] ||
                        (t[5] = (...a) => r.getemoji && r.getemoji(...a)),
                    },
                    null,
                    544,
                  ),
                  [[Qt, i.showemoji]],
                ),
                Af,
                (J(),
                ue(
                  'svg',
                  {
                    onClick:
                      t[6] || (t[6] = (...a) => r.eemoji && r.eemoji(...a)),
                    t: '1695146956319',
                    class: 'chat-icon',
                    viewBox: '0 0 1024 1024',
                    version: '1.1',
                    xmlns: 'http://www.w3.org/2000/svg',
                    'p-id': '3988',
                  },
                  Sf,
                )),
              ]),
              F('div', Tf, [
                If,
                (J(),
                ue(
                  'svg',
                  {
                    onClick: t[7] || (t[7] = (a) => r.tobuttom(1)),
                    t: '1695147151930',
                    class: 'chat-icon',
                    viewBox: '0 0 1024 1024',
                    version: '1.1',
                    xmlns: 'http://www.w3.org/2000/svg',
                    'p-id': '4438',
                    width: '20',
                    height: '20',
                  },
                  Lf,
                )),
              ]),
              F('div', jf, [
                Mf,
                (J(),
                ue(
                  'svg',
                  {
                    onClick:
                      t[8] || (t[8] = (...a) => r.reset && r.reset(...a)),
                    t: '1695146872454',
                    class: 'chat-icon',
                    viewBox: '0 0 1024 1024',
                    version: '1.1',
                    xmlns: 'http://www.w3.org/2000/svg',
                    'p-id': '3849',
                  },
                  Of,
                )),
              ]),
              F('div', Bf, [
                Pf,
                (J(),
                ue(
                  'svg',
                  {
                    onClick:
                      t[9] ||
                      (t[9] = (...a) => r.cleanScreen && r.cleanScreen(...a)),
                    t: '1695147353549',
                    class: 'chat-icon',
                    viewBox: '0 0 1024 1024',
                    version: '1.1',
                    xmlns: 'http://www.w3.org/2000/svg',
                    'p-id': '4763',
                    width: '20',
                    height: '20',
                  },
                  qf,
                )),
              ]),
              F('div', Hf, [
                Uf,
                (J(),
                ue(
                  'svg',
                  {
                    onClick:
                      t[10] ||
                      (t[10] = (...a) => r.voiceList && r.voiceList(...a)),
                    t: '1697536440024',
                    class: 'chat-icon',
                    viewBox: '0 0 1024 1024',
                    version: '1.1',
                    xmlns: 'http://www.w3.org/2000/svg',
                    'p-id': '7282',
                    width: '24',
                    height: '24',
                  },
                  Wf,
                )),
              ]),
              F('div', Gf, [
                Zf,
                (J(),
                ue(
                  'svg',
                  {
                    onClick:
                      t[11] || (t[11] = (...a) => r.waiting && r.waiting(...a)),
                    t: '1697536322502',
                    class: 'chat-icon',
                    viewBox: '0 0 1024 1024',
                    version: '1.1',
                    xmlns: 'http://www.w3.org/2000/svg',
                    'p-id': '6223',
                    width: '24',
                    height: '24',
                  },
                  Xf,
                )),
              ]),
            ]),
            F('div', Qf, [
              F('div', Yf, [
                zt(
                  F(
                    'textarea',
                    {
                      onKeydown:
                        t[12] ||
                        (t[12] = (...a) =>
                          r.handleKeyDown && r.handleKeyDown(...a)),
                      ref: 'textarea',
                      'onUpdate:modelValue':
                        t[13] || (t[13] = (a) => (i.userInput = a)),
                      onClick:
                        t[14] ||
                        (t[14] = (...a) =>
                          r.updateCursorPosition &&
                          r.updateCursorPosition(...a)),
                    },
                    null,
                    544,
                  ),
                  [[so, i.userInput]],
                ),
              ]),
              F(
                'button',
                {
                  onClick:
                    t[15] ||
                    (t[15] = ao((...a) => r.send && r.send(...a), ['prevent'])),
                  disabled: !i.userInput || !r.isValidInput(i.userInput),
                  id: 'sendButton',
                },
                '发送',
                8,
                Jf,
              ),
            ]),
          ],
          512,
        ),
        [[Qt, i.showwindow]],
      ),
    ])
  )
}
const o1 = oo(Od, [
  ['render', e1],
  ['__scopeId', 'data-v-f7da6f29'],
])
export { o1 as default }
