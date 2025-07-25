function e(e) {
  if ('string' != typeof e || !e)
    throw new Error('expected a non-empty string, got: ' + e)
}
function t(e) {
  if ('number' != typeof e) throw new Error('expected a number, got: ' + e)
}
const n = 'emoji',
  o = 'keyvalue',
  i = 'favorites',
  r = 'tokens',
  a = 'count',
  s = 'group-order',
  c = 'eTag',
  d = 'url',
  u = 'skinTone',
  l = 'readonly',
  m = 'readwrite',
  h = 'skinUnicodes'
function f(e) {
  return (function (e, t) {
    const n = new Set(),
      o = []
    for (const i of e) {
      const e = t(i)
      n.has(e) || (n.add(e), o.push(i))
    }
    return o
  })(e, (e) => e.unicode)
}
const p = {},
  g = {},
  b = {}
function k(e, t, n) {
  ;((n.onerror = () => t(n.error)),
    (n.onblocked = () => t(new Error('IDB blocked'))),
    (n.onsuccess = () => e(n.result)))
}
async function v(e) {
  const t = await new Promise((t, c) => {
    const d = indexedDB.open(e, 1)
    ;((p[e] = d),
      (d.onupgradeneeded = (e) => {
        e.oldVersion < 1 &&
          (function (e) {
            function t(t, n, o) {
              const i = n
                ? e.createObjectStore(t, { keyPath: n })
                : e.createObjectStore(t)
              if (o)
                for (const [e, [r, a]] of Object.entries(o))
                  i.createIndex(e, r, { multiEntry: a })
              return i
            }
            ;(t(o),
              t(n, 'unicode', {
                [r]: ['tokens', !0],
                [s]: [['group', 'order']],
                [h]: ['skinUnicodes', !0],
              }),
              t(i, void 0, { [a]: [''] }))
          })(d.result)
      }),
      k(t, c, d))
  })
  return ((t.onclose = () => w(e)), t)
}
function y(e, t, n, o) {
  return new Promise((i, r) => {
    const a = e.transaction(t, n, { durability: 'relaxed' }),
      s =
        'string' == typeof t ? a.objectStore(t) : t.map((e) => a.objectStore(e))
    let c
    ;(o(s, a, (e) => {
      c = e
    }),
      (a.oncomplete = () => i(c)),
      (a.onerror = () => r(a.error)))
  })
}
function w(e) {
  const t = p[e],
    n = t && t.result
  if (n) {
    n.close()
    const t = b[e]
    if (t) for (const e of t) e()
  }
  ;(delete p[e], delete g[e], delete b[e])
}
const j = new Set([
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
function E(e) {
  return e
    .split(/[\s_]+/)
    .map((e) =>
      !e.match(/\w/) || j.has(e)
        ? e.toLowerCase()
        : e
            .replace(/[)(:,]/g, '')
            .replace(/’/g, "'")
            .toLowerCase(),
    )
    .filter(Boolean)
}
function S(e) {
  return e
    .filter(Boolean)
    .map((e) => e.toLowerCase())
    .filter((e) => e.length >= 2)
}
function T(e, t, n, o) {
  e[t](n).onsuccess = (e) => o && o(e.target.result)
}
function x(e, t, n) {
  T(e, 'get', t, n)
}
function $(e, t, n) {
  T(e, 'getAll', t, n)
}
function C(e) {
  e.commit && e.commit()
}
function _(e, t) {
  const n = (function (e, t) {
      let n = e[0]
      for (let o = 1; o < e.length; o++) {
        const i = e[o]
        t(n) > t(i) && (n = i)
      }
      return n
    })(e, (e) => e.length),
    o = []
  for (const i of n)
    e.some((e) => -1 === e.findIndex((e) => t(e) === t(i))) || o.push(i)
  return o
}
async function L(e, t, i, r) {
  try {
    const a = (function (e) {
      return e.map(
        ({
          annotation: e,
          emoticon: t,
          group: n,
          order: o,
          shortcodes: i,
          skins: r,
          tags: a,
          emoji: s,
          version: c,
        }) => {
          const d = {
            annotation: e,
            group: n,
            order: o,
            tags: a,
            tokens: [
              ...new Set(
                S([
                  ...(i || []).map(E).flat(),
                  ...(a || []).map(E).flat(),
                  ...E(e),
                  t,
                ]),
              ),
            ].sort(),
            unicode: s,
            version: c,
          }
          if ((t && (d.emoticon = t), i && (d.shortcodes = i), r)) {
            ;((d.skinTones = []), (d.skinUnicodes = []), (d.skinVersions = []))
            for (const { tone: e, emoji: t, version: n } of r)
              (d.skinTones.push(e),
                d.skinUnicodes.push(t),
                d.skinVersions.push(n))
          }
          return d
        },
      )
    })(t)
    await y(e, [n, o], m, ([e, t], n) => {
      let o,
        s,
        u = 0
      function l() {
        2 == ++u &&
          (function () {
            if (o === r && s === i) return
            e.clear()
            for (const t of a) e.put(t)
            ;(t.put(r, c), t.put(i, d), C(n))
          })()
      }
      ;(x(t, c, (e) => {
        ;((o = e), l())
      }),
        x(t, d, (e) => {
          ;((s = e), l())
        }))
    })
  } finally {
  }
}
async function I(e, t) {
  const o = S(E(t))
  return o.length
    ? y(e, n, l, (e, t, n) => {
        const i = [],
          a = () => {
            const e = _(i, (e) => e.unicode)
            n(e.sort((e, t) => (e.order < t.order ? -1 : 1)))
          }
        for (let s = 0; s < o.length; s++) {
          const t = o[s],
            n =
              s === o.length - 1
                ? IDBKeyRange.bound(t, t + '￿', !1, !0)
                : IDBKeyRange.only(t)
          $(e.index(r), n, (e) => {
            ;(i.push(e), i.length === o.length && a())
          })
        }
      })
    : []
}
async function z(e, t) {
  const o = await I(e, t)
  if (!o.length) {
    const o = (e) => (e.shortcodes || []).includes(t.toLowerCase())
    return (
      (await (async function (e, t) {
        return y(e, n, l, (e, n, o) => {
          let i
          const r = () => {
            e.getAll(i && IDBKeyRange.lowerBound(i, !0), 50).onsuccess = (
              e,
            ) => {
              const n = e.target.result
              for (const r of n) if (((i = r.unicode), t(r))) return o(r)
              if (n.length < 50) return o()
              r()
            }
          }
          r()
        })
      })(e, o)) || null
    )
  }
  return (
    o.filter((e) =>
      (e.shortcodes || [])
        .map((e) => e.toLowerCase())
        .includes(t.toLowerCase()),
    )[0] || null
  )
}
function M(e, t, n) {
  return y(e, t, l, (e, t, o) => x(e, n, o))
}
const P = ['name', 'url']
function A(e) {
  !(function (e) {
    const t = e && Array.isArray(e),
      n = t && e.length && (!e[0] || P.some((t) => !(t in e[0])))
    if (!t || n) throw new Error('Custom emojis are in the wrong format')
  })(e)
  const t = (e, t) => (e.name.toLowerCase() < t.name.toLowerCase() ? -1 : 1),
    n = e.sort(t),
    o = (function (e, t) {
      const n = new Map()
      for (const o of e) {
        const e = t(o)
        for (const t of e) {
          let e = n
          for (let n = 0; n < t.length; n++) {
            const o = t.charAt(n)
            let i = e.get(o)
            ;(i || ((i = new Map()), e.set(o, i)), (e = i))
          }
          let i = e.get('')
          ;(i || ((i = []), e.set('', i)), i.push(o))
        }
      }
      return (e, t) => {
        let o = n
        for (let n = 0; n < e.length; n++) {
          const t = e.charAt(n),
            i = o.get(t)
          if (!i) return []
          o = i
        }
        if (t) return o.get('') || []
        const i = [],
          r = [o]
        for (; r.length; ) {
          const e = [...r.shift().entries()].sort((e, t) =>
            e[0] < t[0] ? -1 : 1,
          )
          for (const [t, n] of e) '' === t ? i.push(...n) : r.push(n)
        }
        return i
      }
    })(e, (e) => {
      const t = new Set()
      if (e.shortcodes)
        for (const n of e.shortcodes) for (const e of E(n)) t.add(e)
      return t
    }),
    i = (e) => o(e, !0),
    r = (e) => o(e, !1),
    a = new Map(),
    s = new Map()
  for (const c of e) {
    s.set(c.name.toLowerCase(), c)
    for (const e of c.shortcodes || []) a.set(e.toLowerCase(), c)
  }
  return {
    all: n,
    search: (e) => {
      const n = E(e)
      return _(
        n.map((e, t) => (t < n.length - 1 ? i : r)(e)),
        (e) => e.name,
      ).sort(t)
    },
    byShortcode: (e) => a.get(e.toLowerCase()),
    byName: (e) => s.get(e.toLowerCase()),
  }
}
const B = 'undefined' != typeof wrappedJSObject
function O(e) {
  if (!e) return e
  if ((B && (e = structuredClone(e)), delete e.tokens, e.skinTones)) {
    const t = e.skinTones.length
    e.skins = Array(t)
    for (let n = 0; n < t; n++)
      e.skins[n] = {
        tone: e.skinTones[n],
        unicode: e.skinUnicodes[n],
        version: e.skinVersions[n],
      }
    ;(delete e.skinTones, delete e.skinUnicodes, delete e.skinVersions)
  }
  return e
}
const N = ['annotation', 'emoji', 'group', 'order', 'version']
function D(e, t) {
  if (2 !== Math.floor(e.status / 100))
    throw new Error('Failed to fetch: ' + t + ':  ' + e.status)
}
async function F(e) {
  const t = await fetch(e)
  D(t, e)
  const n = t.headers.get('etag'),
    o = await t.json()
  return (
    (function (e) {
      if (
        !e ||
        !Array.isArray(e) ||
        !e[0] ||
        'object' != typeof e[0] ||
        N.some((t) => !(t in e[0]))
      )
        throw new Error('Emoji data is in the wrong format')
    })(o),
    [n, o]
  )
}
async function U(e) {
  let t = (function (e) {
    for (
      var t = e.length, n = new ArrayBuffer(t), o = new Uint8Array(n), i = -1;
      ++i < t;

    )
      o[i] = e.charCodeAt(i)
    return n
  })(JSON.stringify(e))
  const n = (function (e) {
    for (var t = '', n = new Uint8Array(e), o = n.byteLength, i = -1; ++i < o; )
      t += String.fromCharCode(n[i])
    return t
  })(await crypto.subtle.digest('SHA-1', t))
  return btoa(n)
}
async function W(e, t) {
  let n,
    i = await (async function (e) {
      const t = await fetch(e, { method: 'HEAD' })
      D(t, e)
      const n = t.headers.get('etag')
      return n
    })(t)
  if (!i) {
    const e = await F(t)
    ;((i = e[0]), (n = e[1]), i || (i = await U(n)))
  }
  if (
    await (async function (e, t, n) {
      const [i, r] = await Promise.all([c, d].map((t) => M(e, o, t)))
      return i === n && r === t
    })(e, t, i)
  );
  else {
    if (!n) {
      n = (await F(t))[1]
    }
    await L(e, n, t, i)
  }
}
class G {
  constructor({
    dataSource:
      e = 'https://cdn.jsdelivr.net/npm/emoji-picker-element-data@^1/en/emojibase/data.json',
    locale: t = 'en',
    customEmoji: n = [],
  } = {}) {
    ;((this.dataSource = e),
      (this.locale = t),
      (this._dbName = `emoji-picker-element-${this.locale}`),
      (this._db = void 0),
      (this._lazyUpdate = void 0),
      (this._custom = A(n)),
      (this._clear = this._clear.bind(this)),
      (this._ready = this._init()))
  }
  async _init() {
    const e = (this._db = await ((t = this._dbName),
    g[t] || (g[t] = v(t)),
    g[t]))
    var t
    !(function (e, t) {
      let n = b[e]
      ;(n || (n = b[e] = []), n.push(t))
    })(this._dbName, this._clear)
    const n = this.dataSource,
      i = await (async function (e) {
        return !(await M(e, o, d))
      })(e)
    i
      ? await (async function (e, t) {
          let [n, o] = await F(t)
          ;(n || (n = await U(o)), await L(e, o, t, n))
        })(e, n)
      : (this._lazyUpdate = (async function (e, t) {
          try {
            await W(e, t)
          } catch (n) {
            if ('InvalidStateError' !== n.name) throw n
          }
        })(e, n))
  }
  async ready() {
    const e = async () => (
      this._ready || (this._ready = this._init()),
      this._ready
    )
    ;(await e(), this._db || (await e()))
  }
  async getEmojiByGroup(e) {
    return (
      t(e),
      await this.ready(),
      f(
        await (async function (e, t) {
          return y(e, n, l, (e, n, o) => {
            const i = IDBKeyRange.bound([t, 0], [t + 1, 0], !1, !0)
            $(e.index(s), i, o)
          })
        })(this._db, e),
      ).map(O)
    )
  }
  async getEmojiBySearchQuery(t) {
    ;(e(t), await this.ready())
    return [...this._custom.search(t), ...f(await I(this._db, t)).map(O)]
  }
  async getEmojiByShortcode(t) {
    ;(e(t), await this.ready())
    const n = this._custom.byShortcode(t)
    return n || O(await z(this._db, t))
  }
  async getEmojiByUnicodeOrName(t) {
    ;(e(t), await this.ready())
    const o = this._custom.byName(t)
    return (
      o ||
      O(
        await (async function (e, t) {
          return y(e, n, l, (e, n, o) =>
            x(e, t, (n) => {
              if (n) return o(n)
              x(e.index(h), t, (e) => o(e || null))
            }),
          )
        })(this._db, t),
      )
    )
  }
  async getPreferredSkinTone() {
    return (await this.ready(), (await M(this._db, o, u)) || 0)
  }
  async setPreferredSkinTone(e) {
    return (
      t(e),
      await this.ready(),
      (n = this._db),
      (i = u),
      (r = e),
      y(n, o, m, (e, t) => {
        ;(e.put(r, i), C(t))
      })
    )
    var n, i, r
  }
  async incrementFavoriteEmojiCount(t) {
    return (
      e(t),
      await this.ready(),
      (n = this._db),
      (o = t),
      y(n, i, m, (e, t) =>
        x(e, o, (n) => {
          ;(e.put((n || 0) + 1, o), C(t))
        }),
      )
    )
    var n, o
  }
  async getTopFavoriteEmoji(e) {
    return (
      t(e),
      await this.ready(),
      (
        await (function (e, t, o) {
          return 0 === o
            ? []
            : y(e, [i, n], l, ([e, n], i, r) => {
                const s = []
                e.index(a).openCursor(void 0, 'prev').onsuccess = (e) => {
                  const i = e.target.result
                  if (!i) return r(s)
                  function a(e) {
                    if ((s.push(e), s.length === o)) return r(s)
                    i.continue()
                  }
                  const c = i.primaryKey,
                    d = t.byName(c)
                  if (d) return a(d)
                  x(n, c, (e) => {
                    if (e) return a(e)
                    i.continue()
                  })
                }
              })
        })(this._db, this._custom, e)
      ).map(O)
    )
  }
  set customEmoji(e) {
    this._custom = A(e)
  }
  get customEmoji() {
    return this._custom.all
  }
  async _shutdown() {
    await this.ready()
    try {
      await this._lazyUpdate
    } catch (e) {}
  }
  _clear() {
    this._db = this._ready = this._lazyUpdate = void 0
  }
  async close() {
    ;(await this._shutdown(), await w(this._dbName))
  }
  async delete() {
    var e
    ;(await this._shutdown(),
      await ((e = this._dbName),
      new Promise((t, n) => {
        ;(w(e), k(t, n, indexedDB.deleteDatabase(e)))
      })))
  }
}
const V = [
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
  ].map(([e, t, n]) => ({ id: e, emoji: t, name: n })),
  R = V.slice(1),
  K =
    'function' == typeof requestIdleCallback ? requestIdleCallback : setTimeout
function H(e) {
  return e.unicode.includes('‍')
}
const q = {
    '🫩': 16,
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
  X = [
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
  J =
    '"Twemoji Mozilla","Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji","EmojiOne Color","Android Emoji",sans-serif',
  Q = (e, t) => (e < t ? -1 : e > t ? 1 : 0),
  Y = (e, t) => {
    const n = document.createElement('canvas')
    n.width = n.height = 1
    const o = n.getContext('2d', { willReadFrequently: !0 })
    return (
      (o.textBaseline = 'top'),
      (o.font = `100px ${J}`),
      (o.fillStyle = t),
      o.scale(0.01, 0.01),
      o.fillText(e, 0, 0),
      o.getImageData(0, 0, 1, 1).data
    )
  }
function Z(e) {
  const t = Y(e, '#000'),
    n = Y(e, '#fff')
  return (
    t &&
    n &&
    ((e, t) => {
      const n = [...e].join(',')
      return n === [...t].join(',') && !n.startsWith('0,0,0,')
    })(t, n)
  )
}
let ee
const te = () => (
    ee ||
      (ee = new Promise((e) =>
        K(() =>
          e(
            (function () {
              const e = Object.entries(q)
              try {
                for (const [t, n] of e) if (Z(t)) return n
              } catch (t) {}
              return e[0][1]
            })(),
          ),
        ),
      )),
    ee
  ),
  ne = new Map()
function oe(e) {
  ;(e.preventDefault(), e.stopPropagation())
}
function ie(e, t, n) {
  return (
    (t += e ? -1 : 1) < 0 ? (t = n.length - 1) : t >= n.length && (t = 0),
    t
  )
}
function re(e, t) {
  const n = new Set(),
    o = []
  for (const i of e) {
    const e = t(i)
    n.has(e) || (n.add(e), o.push(i))
  }
  return o
}
const ae = requestAnimationFrame
let se,
  ce = 'function' == typeof ResizeObserver
function de(e) {
  {
    const t = document.createRange()
    return (t.selectNode(e.firstChild), t.getBoundingClientRect().width)
  }
}
function ue(e, t, n) {
  let o = e.get(t)
  return (o || ((o = n()), e.set(t, o)), o)
}
function le(e) {
  return '' + e
}
const me = new WeakMap(),
  he = new WeakMap(),
  fe = Symbol('un-keyed'),
  pe = 'replaceChildren' in Element.prototype
function ge(e, t) {
  const { targetNode: n } = t
  let { targetParentNode: o } = t,
    i = !1
  ;(o
    ? (i = (function (e, t) {
        let n = e.firstChild,
          o = 0
        for (; n; ) {
          if (t[o] !== n) return !0
          ;((n = n.nextSibling), o++)
        }
        return o !== t.length
      })(o, e))
    : ((i = !0),
      (t.targetNode = void 0),
      (t.targetParentNode = o = n.parentNode)),
    i &&
      (function (e, t) {
        pe ? e.replaceChildren(...t) : ((e.innerHTML = ''), e.append(...t))
      })(o, e))
}
function be(e) {
  let t = '',
    n = !1,
    o = !1,
    i = -1
  const r = new Map(),
    a = []
  let s = 0
  for (let d = 0, u = e.length; d < u; d++) {
    const c = e[d]
    if (((t += c.slice(s)), d === u - 1)) break
    for (let e = 0; e < c.length; e++) {
      switch (c.charAt(e)) {
        case '<':
          '/' === c.charAt(e + 1) ? a.pop() : ((n = !0), a.push(++i))
          break
        case '>':
          ;((n = !1), (o = !1))
          break
        case '=':
          o = !0
      }
    }
    const l = ue(r, a[a.length - 1], () => [])
    let m, h, f
    if (o) {
      const n = /(\S+)="?([^"=]*)$/.exec(c)
      ;((m = n[1]), (h = n[2]))
      const o = /^([^">]*)("?)/.exec(e[d + 1])
      ;((f = o[1]), (t = t.slice(0, -1 * n[0].length)), (s = o[0].length))
    } else s = 0
    const p = {
      attributeName: m,
      attributeValuePre: h,
      attributeValuePost: f,
      expressionIndex: d,
    }
    ;(l.push(p), n || o || (t += ' '))
  }
  const c = (function (e) {
    const t = document.createElement('template')
    return ((t.innerHTML = e), t)
  })(t)
  return { template: c, elementsToBindings: r }
}
function ke(e, t, n) {
  for (let o = 0; o < e.length; o++) {
    const i = e[o],
      r = {
        binding: i,
        targetNode: i.attributeName ? t : t.firstChild,
        targetParentNode: void 0,
        currentExpression: void 0,
      }
    n.push(r)
  }
}
function ve(e) {
  const { template: t, elementsToBindings: n } = ue(me, e, () => be(e)),
    o = t.cloneNode(!0).content.firstElementChild,
    i = (function (e, t) {
      const n = []
      let o
      if (1 === t.size && (o = t.get(0))) ke(o, e, n)
      else {
        const o = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT)
        let i = e,
          r = -1
        do {
          const e = t.get(++r)
          e && ke(e, i, n)
        } while ((i = o.nextNode()))
      }
      return n
    })(o, n)
  return function (e) {
    return (
      (function (e, t) {
        for (const n of t) {
          const {
              targetNode: t,
              currentExpression: o,
              binding: {
                expressionIndex: i,
                attributeName: r,
                attributeValuePre: a,
                attributeValuePost: s,
              },
            } = n,
            c = e[i]
          if (o !== c)
            if (((n.currentExpression = c), r))
              if (null === c) t.removeAttribute(r)
              else {
                const e = a + le(c) + s
                t.setAttribute(r, e)
              }
            else {
              let e
              ;(Array.isArray(c)
                ? ge(c, n)
                : c instanceof Element
                  ? ((e = c), t.replaceWith(e))
                  : (t.nodeValue = le(c)),
                e && (n.targetNode = e))
            }
        }
      })(e, i),
      o
    )
  }
}
function ye(e, t, n, o, i, r, a, s, c) {
  const { labelWithSkin: d, titleForEmoji: u, unicodeWithSkin: l } = n,
    { html: m, map: h } = (function (e) {
      const t = ue(he, e, () => new Map())
      let n = fe
      return {
        map: function (e, t, o) {
          return e.map((e, i) => {
            const r = n
            n = o(e)
            try {
              return t(e, i)
            } finally {
              n = r
            }
          })
        },
        html: function (e, ...o) {
          const i = ue(t, e, () => new Map())
          return ue(i, n, () => ve(e))(o)
        },
      }
    })(t)
  function f(e, n, o) {
    return h(
      e,
      (e, i) =>
        m`<button role="${n ? 'option' : 'menuitem'}" aria-selected="${n ? i === t.activeSearchItem : null}" aria-label="${d(e, t.currentSkinTone)}" title="${u(e)}" class="${'emoji' + (n && i === t.activeSearchItem ? ' active' : '') + (e.unicode ? '' : ' custom-emoji')}" id="${`${o}-${e.id}`}" style="${e.unicode ? null : `--custom-emoji-background: url(${JSON.stringify(e.url)})`}">${e.unicode ? l(e, t.currentSkinTone) : ''}</button>`,
      (e) => `${o}-${e.id}`,
    )
  }
  const p = m`<section data-ref="rootElement" class="picker" aria-label="${t.i18n.regionLabel}" style="${t.pickerStyle || ''}"><div class="pad-top"></div><div class="search-row"><div class="search-wrapper"><input id="search" class="search" type="search" role="combobox" enterkeyhint="search" placeholder="${t.i18n.searchLabel}" autocapitalize="none" autocomplete="off" spellcheck="true" aria-expanded="${!(!t.searchMode || !t.currentEmojis.length)}" aria-controls="search-results" aria-describedby="search-description" aria-autocomplete="list" aria-activedescendant="${t.activeSearchItemId ? `emo-${t.activeSearchItemId}` : null}" data-ref="searchElement" data-on-input="onSearchInput" data-on-keydown="onSearchKeydown"><label class="sr-only" for="search">${t.i18n.searchLabel}</label> <span id="search-description" class="sr-only">${t.i18n.searchDescription}</span></div><div class="skintone-button-wrapper ${t.skinTonePickerExpandedAfterAnimation ? 'expanded' : ''}"><button id="skintone-button" class="emoji ${t.skinTonePickerExpanded ? 'hide-focus' : ''}" aria-label="${t.skinToneButtonLabel}" title="${t.skinToneButtonLabel}" aria-describedby="skintone-description" aria-haspopup="listbox" aria-expanded="${t.skinTonePickerExpanded}" aria-controls="skintone-list" data-on-click="onClickSkinToneButton">${t.skinToneButtonText || ''}</button></div><span id="skintone-description" class="sr-only">${t.i18n.skinToneDescription}</span><div data-ref="skinToneDropdown" id="skintone-list" class="skintone-list hide-focus ${t.skinTonePickerExpanded ? '' : 'hidden no-animate'}" style="transform:translateY(${t.skinTonePickerExpanded ? 0 : 'calc(-1 * var(--num-skintones) * var(--total-emoji-size))'})" role="listbox" aria-label="${t.i18n.skinTonesLabel}" aria-activedescendant="skintone-${t.activeSkinTone}" aria-hidden="${!t.skinTonePickerExpanded}" tabIndex="-1" data-on-focusout="onSkinToneOptionsFocusOut" data-on-click="onSkinToneOptionsClick" data-on-keydown="onSkinToneOptionsKeydown" data-on-keyup="onSkinToneOptionsKeyup">${h(
      t.skinTones,
      (e, n) =>
        m`<div id="skintone-${n}" class="emoji ${n === t.activeSkinTone ? 'active' : ''}" aria-selected="${n === t.activeSkinTone}" role="option" title="${t.i18n.skinTones[n]}" aria-label="${t.i18n.skinTones[n]}">${e}</div>`,
      (e) => e,
    )}</div></div><div class="nav" role="tablist" style="grid-template-columns:repeat(${t.groups.length},1fr)" aria-label="${t.i18n.categoriesLabel}" data-on-keydown="onNavKeydown" data-on-click="onNavClick">${h(
      t.groups,
      (e) =>
        m`<button role="tab" class="nav-button" aria-controls="tab-${e.id}" aria-label="${t.i18n.categories[e.name]}" aria-selected="${!t.searchMode && t.currentGroup.id === e.id}" title="${t.i18n.categories[e.name]}" data-group-id="${e.id}"><div class="nav-emoji emoji">${e.emoji}</div></button>`,
      (e) => e.id,
    )}</div><div class="indicator-wrapper"><div class="indicator" style="transform:translateX(${(t.isRtl ? -1 : 1) * t.currentGroupIndex * 100}%)"></div></div><div class="message ${t.message ? '' : 'gone'}" role="alert" aria-live="polite">${t.message || ''}</div><div data-ref="tabpanelElement" class="tabpanel ${!t.databaseLoaded || t.message ? 'gone' : ''}" role="${t.searchMode ? 'region' : 'tabpanel'}" aria-label="${t.searchMode ? t.i18n.searchResultsLabel : t.i18n.categories[t.currentGroup.name]}" id="${t.searchMode ? null : `tab-${t.currentGroup.id}`}" tabIndex="0" data-on-click="onEmojiClick"><div data-action="calculateEmojiGridStyle">${h(
      t.currentEmojisWithCategories,
      (e, n) =>
        m`<div><div id="menu-label-${n}" class="category ${1 === t.currentEmojisWithCategories.length && '' === t.currentEmojisWithCategories[0].category ? 'gone' : ''}" aria-hidden="true">${t.searchMode ? t.i18n.searchResultsLabel : e.category ? e.category : t.currentEmojisWithCategories.length > 1 ? t.i18n.categories.custom : t.i18n.categories[t.currentGroup.name]}</div><div class="emoji-menu ${0 === n || t.searchMode || -1 !== t.currentGroup.id ? '' : 'visibility-auto'}" style="${`--num-rows: ${Math.ceil(e.emojis.length / t.numColumns)}`}" data-action="updateOnIntersection" role="${t.searchMode ? 'listbox' : 'menu'}" aria-labelledby="menu-label-${n}" id="${t.searchMode ? 'search-results' : null}">${f(e.emojis, t.searchMode, 'emo')}</div></div>`,
      (e) => e.category,
    )}</div></div><div class="favorites onscreen emoji-menu ${t.message ? 'gone' : ''}" role="menu" aria-label="${t.i18n.favoritesLabel}" data-on-click="onEmojiClick">${f(t.currentFavorites, !1, 'fav')}</div><button data-ref="baselineEmoji" aria-hidden="true" tabindex="-1" class="abs-pos hidden emoji baseline-emoji">😀</button></section>`,
    g = (t, n) => {
      for (const o of e.querySelectorAll(`[${t}]`)) n(o, o.getAttribute(t))
    }
  if (c) {
    e.appendChild(p)
    for (const e of ['click', 'focusout', 'input', 'keydown', 'keyup'])
      g(`data-on-${e}`, (t, n) => {
        t.addEventListener(e, o[n])
      })
    ;(g('data-ref', (e, t) => {
      r[t] = e
    }),
      a.addEventListener('abort', () => {
        e.removeChild(p)
      }))
  }
  g('data-action', (e, t) => {
    let n = s.get(t)
    ;(n || s.set(t, (n = new WeakSet())), n.has(e) || (n.add(e), i[t](e)))
  })
}
const we =
  'function' == typeof queueMicrotask
    ? queueMicrotask
    : (e) => Promise.resolve().then(e)
function je(e, t, n) {
  if (e.length !== t.length) return !1
  for (let o = 0; o < e.length; o++) if (!n(e[o], t[o])) return !1
  return !0
}
const Ee = new WeakMap()
const Se = [],
  { assign: Te } = Object
function xe(e, t) {
  const n = {},
    o = new AbortController(),
    i = o.signal,
    { state: r, createEffect: a } = (function (e) {
      let t,
        n = !1
      const o = new Map(),
        i = new Set()
      let r
      const a = () => {
          if (n) return
          const e = [...i]
          i.clear()
          try {
            for (const t of e) t()
          } finally {
            ;((r = !1), i.size && ((r = !0), we(a)))
          }
        },
        s = new Proxy(
          {},
          {
            get(e, n) {
              if (t) {
                let e = o.get(n)
                ;(e || ((e = new Set()), o.set(n, e)), e.add(t))
              }
              return e[n]
            },
            set(e, t, n) {
              if (e[t] !== n) {
                e[t] = n
                const s = o.get(t)
                if (s) {
                  for (const e of s) i.add(e)
                  r || ((r = !0), we(a))
                }
              }
              return !0
            },
          },
        )
      return (
        e.addEventListener('abort', () => {
          n = !0
        }),
        {
          state: s,
          createEffect: (e) => {
            const n = () => {
              const o = t
              t = n
              try {
                return e()
              } finally {
                t = o
              }
            }
            return n()
          },
        }
      )
    })(i),
    s = new Map()
  ;(Te(r, {
    skinToneEmoji: void 0,
    i18n: void 0,
    database: void 0,
    customEmoji: void 0,
    customCategorySorting: void 0,
    emojiVersion: void 0,
  }),
    Te(r, t),
    Te(r, {
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
      numColumns: 8,
      isRtl: !1,
      currentGroupIndex: 0,
      groups: R,
      databaseLoaded: !1,
      activeSearchItemId: void 0,
    }),
    a(() => {
      r.currentGroup !== r.groups[r.currentGroupIndex] &&
        (r.currentGroup = r.groups[r.currentGroupIndex])
    }))
  const c = (t) => {
      e.getElementById(t).focus()
    },
    d = (t) => e.getElementById(`emo-${t.id}`),
    u = (e, t) => {
      n.rootElement.dispatchEvent(
        new CustomEvent(e, { detail: t, bubbles: !0, composed: !0 }),
      )
    },
    l = (e, t) => e.id === t.id,
    m = (e, t) => {
      const { category: n, emojis: o } = e,
        { category: i, emojis: r } = t
      return n === i && je(o, r, l)
    },
    h = (e) => {
      je(r.currentEmojis, e, l) || (r.currentEmojis = e)
    },
    f = (e) => {
      r.searchMode !== e && (r.searchMode = e)
    },
    p = (e, t) => (t && e.skins && e.skins[t]) || e.unicode,
    g = {
      labelWithSkin: (e, t) => {
        return ((n = [
          e.name || p(e, t),
          e.annotation,
          ...(e.shortcodes || Se),
        ].filter(Boolean)),
        re(n, (e) => e)).join(', ')
        var n
      },
      titleForEmoji: (e) => e.annotation || (e.shortcodes || Se).join(', '),
      unicodeWithSkin: p,
    },
    b = {
      onClickSkinToneButton: function (e) {
        ;((r.skinTonePickerExpanded = !r.skinTonePickerExpanded),
          (r.activeSkinTone = r.currentSkinTone),
          r.skinTonePickerExpanded && (oe(e), ae(() => c('skintone-list'))))
      },
      onEmojiClick: async function (e) {
        const { target: t } = e
        if (!t.classList.contains('emoji')) return
        oe(e)
        T(t.id.substring(4))
      },
      onNavClick: function (e) {
        const { target: t } = e,
          o = t.closest('.nav-button')
        if (!o) return
        const i = parseInt(o.dataset.groupId, 10)
        ;((n.searchElement.value = ''),
          (r.rawSearchText = ''),
          (r.searchText = ''),
          (r.activeSearchItem = -1),
          (r.currentGroupIndex = r.groups.findIndex((e) => e.id === i)))
      },
      onNavKeydown: function (e) {
        const { target: t, key: n } = e,
          o = (t) => {
            t && (oe(e), t.focus())
          }
        switch (n) {
          case 'ArrowLeft':
            return o(t.previousElementSibling)
          case 'ArrowRight':
            return o(t.nextElementSibling)
          case 'Home':
            return o(t.parentElement.firstElementChild)
          case 'End':
            return o(t.parentElement.lastElementChild)
        }
      },
      onSearchKeydown: function (e) {
        if (!r.searchMode || !r.currentEmojis.length) return
        const t = (t) => {
          ;(oe(e),
            (r.activeSearchItem = ie(t, r.activeSearchItem, r.currentEmojis)))
        }
        switch (e.key) {
          case 'ArrowDown':
            return t(!1)
          case 'ArrowUp':
            return t(!0)
          case 'Enter':
            if (-1 !== r.activeSearchItem)
              return (oe(e), T(r.currentEmojis[r.activeSearchItem].id))
            r.activeSearchItem = 0
        }
      },
      onSkinToneOptionsClick: function (e) {
        const {
            target: { id: t },
          } = e,
          n = t && t.match(/^skintone-(\d)/)
        if (!n) return
        oe(e)
        x(parseInt(n[1], 10))
      },
      onSkinToneOptionsFocusOut: async function (e) {
        const { relatedTarget: t } = e
        ;(t && 'skintone-list' === t.id) || (r.skinTonePickerExpanded = !1)
      },
      onSkinToneOptionsKeydown: function (e) {
        if (!r.skinTonePickerExpanded) return
        const t = async (t) => {
          ;(oe(e), (r.activeSkinTone = t))
        }
        switch (e.key) {
          case 'ArrowUp':
            return t(ie(!0, r.activeSkinTone, r.skinTones))
          case 'ArrowDown':
            return t(ie(!1, r.activeSkinTone, r.skinTones))
          case 'Home':
            return t(0)
          case 'End':
            return t(r.skinTones.length - 1)
          case 'Enter':
            return (oe(e), x(r.activeSkinTone))
          case 'Escape':
            return (
              oe(e),
              (r.skinTonePickerExpanded = !1),
              c('skintone-button')
            )
        }
      },
      onSkinToneOptionsKeyup: function (e) {
        if (!r.skinTonePickerExpanded) return
        if (' ' === e.key) return (oe(e), x(r.activeSkinTone))
      },
      onSearchInput: function (e) {
        r.rawSearchText = e.target.value
      },
    },
    k = {
      calculateEmojiGridStyle: function (e) {
        !(function (e, t, n) {
          let o
          ;(ce ? ((o = new ResizeObserver(n)), o.observe(e)) : ae(n),
            t.addEventListener('abort', () => {
              o && o.disconnect()
            }))
        })(e, i, () => {
          {
            const e = getComputedStyle(n.rootElement),
              t = parseInt(e.getPropertyValue('--num-columns'), 10),
              o = 'rtl' === e.getPropertyValue('direction')
            ;((r.numColumns = t), (r.isRtl = o))
          }
        })
      },
      updateOnIntersection: function (e) {
        !(function (e, t, n) {
          {
            const o = e.closest('.tabpanel')
            let i = Ee.get(o)
            ;(i ||
              ((i = new IntersectionObserver(n, {
                root: o,
                rootMargin: '50% 0px 50% 0px',
                threshold: 0,
              })),
              Ee.set(o, i),
              t.addEventListener('abort', () => {
                i.disconnect()
              })),
              i.observe(e))
          }
        })(e, i, (e) => {
          for (const { target: t, isIntersecting: n } of e)
            t.classList.toggle('onscreen', n)
        })
      },
    }
  let v = !0
  function y() {
    const { customEmoji: e, database: t } = r,
      n = e || Se
    t.customEmoji !== n && (t.customEmoji = n)
  }
  ;(a(() => {
    ;(ye(e, r, g, b, k, n, i, s, v), (v = !1))
  }),
    r.emojiVersion ||
      te().then((e) => {
        e || (r.message = r.i18n.emojiUnsupportedMessage)
      }),
    a(() => {
      r.database &&
        (async function () {
          let e = !1
          const t = setTimeout(() => {
            ;((e = !0), (r.message = r.i18n.loadingMessage))
          }, 1e3)
          try {
            ;(await r.database.ready(), (r.databaseLoaded = !0))
          } catch (n) {
            r.message = r.i18n.networkErrorMessage
          } finally {
            ;(clearTimeout(t), e && ((e = !1), (r.message = '')))
          }
        })()
    }),
    a(() => {
      r.pickerStyle = `\n      --num-groups: ${r.groups.length}; \n      --indicator-opacity: ${r.searchMode ? 0 : 1}; \n      --num-skintones: 6;`
    }),
    a(() => {
      r.customEmoji && r.database && y()
    }),
    a(() => {
      r.customEmoji && r.customEmoji.length
        ? r.groups !== V && (r.groups = V)
        : r.groups !== R &&
          (r.currentGroupIndex && r.currentGroupIndex--, (r.groups = R))
    }),
    a(() => {
      !(async function () {
        r.databaseLoaded &&
          (r.currentSkinTone = await r.database.getPreferredSkinTone())
      })()
    }),
    a(() => {
      r.skinTones = Array(6)
        .fill()
        .map((e, t) =>
          (function (e, t) {
            if (0 === t) return e
            const n = e.indexOf('‍')
            return -1 !== n
              ? e.substring(0, n) +
                  String.fromCodePoint(127995 + t - 1) +
                  e.substring(n)
              : (e.endsWith('️') && (e = e.substring(0, e.length - 1)),
                e + '\ud83c' + String.fromCodePoint(57339 + t - 1))
          })(r.skinToneEmoji, t),
        )
    }),
    a(() => {
      r.skinToneButtonText = r.skinTones[r.currentSkinTone]
    }),
    a(() => {
      r.skinToneButtonLabel = r.i18n.skinToneLabel.replace(
        '{skinTone}',
        r.i18n.skinTones[r.currentSkinTone],
      )
    }),
    a(() => {
      r.databaseLoaded &&
        (async function () {
          const { database: e } = r,
            t = (
              await Promise.all(X.map((t) => e.getEmojiByUnicodeOrName(t)))
            ).filter(Boolean)
          r.defaultFavoriteEmojis = t
        })()
    }),
    a(() => {
      r.databaseLoaded &&
        r.defaultFavoriteEmojis &&
        (async function () {
          y()
          const { database: e, defaultFavoriteEmojis: t, numColumns: n } = r,
            o = await e.getTopFavoriteEmoji(n),
            i = await S(
              re([...o, ...t], (e) => e.unicode || e.name).slice(0, n),
            )
          r.currentFavorites = i
        })()
    }),
    a(() => {
      !(async function () {
        const {
          searchText: e,
          currentGroup: t,
          databaseLoaded: n,
          customEmoji: o,
        } = r
        if (n)
          if (e.length >= 2) {
            const t = await (async function (e) {
              return S(await E(await r.database.getEmojiBySearchQuery(e)))
            })(e)
            r.searchText === e && (h(t), f(!0))
          } else {
            const { id: e } = t
            if (-1 !== e || (o && o.length)) {
              const t = await (async function (e) {
                const t =
                  -1 === e ? r.customEmoji : await r.database.getEmojiByGroup(e)
                return S(await E(t))
              })(e)
              r.currentGroup.id === e && (h(t), f(!1))
            }
          }
        else ((r.currentEmojis = []), (r.searchMode = !1))
      })()
    }))
  const w = () => {
    ae(() => {
      var e
      ;(e = n.tabpanelElement) && (e.scrollTop = 0)
    })
  }
  function j(e) {
    return !e.unicode || !H(e) || ne.get(e.unicode)
  }
  async function E(e) {
    const t = r.emojiVersion || (await te())
    return e.filter(({ version: e }) => !e || e <= t)
  }
  async function S(e) {
    return (function (e, t) {
      const n = (e) => {
        const n = {}
        for (const o of e)
          'number' == typeof o.tone && o.version <= t && (n[o.tone] = o.unicode)
        return n
      }
      return e.map(
        ({
          unicode: e,
          skins: t,
          shortcodes: o,
          url: i,
          name: r,
          category: a,
          annotation: s,
        }) => ({
          unicode: e,
          name: r,
          shortcodes: o,
          url: i,
          category: a,
          annotation: s,
          id: e || r,
          skins: t && n(t),
        }),
      )
    })(e, r.emojiVersion || (await te()))
  }
  async function T(e) {
    const t = await r.database.getEmojiByUnicodeOrName(e),
      n = [...r.currentEmojis, ...r.currentFavorites].find((t) => t.id === e),
      o = n.unicode && p(n, r.currentSkinTone)
    ;(await r.database.incrementFavoriteEmojiCount(e),
      u('emoji-click', {
        emoji: t,
        skinTone: r.currentSkinTone,
        ...(o && { unicode: o }),
        ...(n.name && { name: n.name }),
      }))
  }
  function x(e) {
    ;((r.currentSkinTone = e),
      (r.skinTonePickerExpanded = !1),
      c('skintone-button'),
      u('skin-tone-change', { skinTone: e }),
      r.database.setPreferredSkinTone(e))
  }
  return (
    a(() => {
      const { currentEmojis: e, emojiVersion: t } = r,
        o = e.filter((e) => e.unicode).filter((e) => H(e) && !ne.has(e.unicode))
      if (!t && o.length)
        (h(e),
          ae(() =>
            (function (e) {
              const t = (function (e, t, n) {
                let o = !0
                for (const i of e) {
                  const e = n(i)
                  if (!e) continue
                  const r = de(e)
                  void 0 === se && (se = de(t))
                  const a = r / 1.8 < se
                  ;(ne.set(i.unicode, a), a || (o = !1))
                }
                return o
              })(e, n.baselineEmoji, d)
              t ? w() : (r.currentEmojis = [...r.currentEmojis])
            })(o),
          ))
      else {
        const n = t ? e : e.filter(j)
        ;(h(n), w())
      }
    }),
    a(() => {}),
    a(() => {
      ;((e) => {
        je(r.currentEmojisWithCategories, e, m) ||
          (r.currentEmojisWithCategories = e)
      })(
        (function () {
          const { searchMode: e, currentEmojis: t } = r
          if (e) return [{ category: '', emojis: t }]
          const n = new Map()
          for (const o of t) {
            const e = o.category || ''
            let t = n.get(e)
            ;(t || ((t = []), n.set(e, t)), t.push(o))
          }
          return [...n.entries()]
            .map(([e, t]) => ({ category: e, emojis: t }))
            .sort((e, t) => r.customCategorySorting(e.category, t.category))
        })(),
      )
    }),
    a(() => {
      r.activeSearchItemId =
        -1 !== r.activeSearchItem && r.currentEmojis[r.activeSearchItem].id
    }),
    a(() => {
      const { rawSearchText: e } = r
      K(() => {
        ;((r.searchText = (e || '').trim()), (r.activeSearchItem = -1))
      })
    }),
    a(() => {
      r.skinTonePickerExpanded
        ? n.skinToneDropdown.addEventListener(
            'transitionend',
            () => {
              r.skinTonePickerExpandedAfterAnimation = !0
            },
            { once: !0 },
          )
        : (r.skinTonePickerExpandedAfterAnimation = !1)
    }),
    {
      $set(e) {
        Te(r, e)
      },
      $destroy() {
        o.abort()
      },
    }
  )
}
var $e = {
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
}
const Ce = [
    'customEmoji',
    'customCategorySorting',
    'database',
    'dataSource',
    'i18n',
    'locale',
    'skinToneEmoji',
    'emojiVersion',
  ],
  _e = `:host{--emoji-font-family:${J}}`
class Le extends HTMLElement {
  constructor(e) {
    ;(super(), this.attachShadow({ mode: 'open' }))
    const t = document.createElement('style')
    ;((t.textContent =
      ':host{--emoji-size:1.375rem;--emoji-padding:0.5rem;--category-emoji-size:var(--emoji-size);--category-emoji-padding:var(--emoji-padding);--indicator-height:3px;--input-border-radius:0.5rem;--input-border-size:1px;--input-font-size:1rem;--input-line-height:1.5;--input-padding:0.25rem;--num-columns:8;--outline-size:2px;--border-size:1px;--border-radius:0;--skintone-border-radius:1rem;--category-font-size:1rem;display:flex;width:min-content;height:400px}:host,:host(.light){color-scheme:light;--background:#fff;--border-color:#e0e0e0;--indicator-color:#385ac1;--input-border-color:#999;--input-font-color:#111;--input-placeholder-color:#999;--outline-color:#999;--category-font-color:#111;--button-active-background:#e6e6e6;--button-hover-background:#d9d9d9}:host(.dark){color-scheme:dark;--background:#222;--border-color:#444;--indicator-color:#5373ec;--input-border-color:#ccc;--input-font-color:#efefef;--input-placeholder-color:#ccc;--outline-color:#fff;--category-font-color:#efefef;--button-active-background:#555555;--button-hover-background:#484848}@media (prefers-color-scheme:dark){:host{color-scheme:dark;--background:#222;--border-color:#444;--indicator-color:#5373ec;--input-border-color:#ccc;--input-font-color:#efefef;--input-placeholder-color:#ccc;--outline-color:#fff;--category-font-color:#efefef;--button-active-background:#555555;--button-hover-background:#484848}}:host([hidden]){display:none}button{margin:0;padding:0;border:0;background:0 0;box-shadow:none;-webkit-tap-highlight-color:transparent}button::-moz-focus-inner{border:0}input{padding:0;margin:0;line-height:1.15;font-family:inherit}input[type=search]{-webkit-appearance:none}:focus{outline:var(--outline-color) solid var(--outline-size);outline-offset:calc(-1*var(--outline-size))}:host([data-js-focus-visible]) :focus:not([data-focus-visible-added]){outline:0}:focus:not(:focus-visible){outline:0}.hide-focus{outline:0}*{box-sizing:border-box}.picker{contain:content;display:flex;flex-direction:column;background:var(--background);border:var(--border-size) solid var(--border-color);border-radius:var(--border-radius);width:100%;height:100%;overflow:hidden;--total-emoji-size:calc(var(--emoji-size) + (2 * var(--emoji-padding)));--total-category-emoji-size:calc(var(--category-emoji-size) + (2 * var(--category-emoji-padding)))}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}.hidden{opacity:0;pointer-events:none}.abs-pos{position:absolute;left:0;top:0}.gone{display:none!important}.skintone-button-wrapper,.skintone-list{background:var(--background);z-index:3}.skintone-button-wrapper.expanded{z-index:1}.skintone-list{position:absolute;inset-inline-end:0;top:0;z-index:2;overflow:visible;border-bottom:var(--border-size) solid var(--border-color);border-radius:0 0 var(--skintone-border-radius) var(--skintone-border-radius);will-change:transform;transition:transform .2s ease-in-out;transform-origin:center 0}@media (prefers-reduced-motion:reduce){.skintone-list{transition-duration:.001s}}@supports not (inset-inline-end:0){.skintone-list{right:0}}.skintone-list.no-animate{transition:none}.tabpanel{overflow-y:auto;scrollbar-gutter:stable;-webkit-overflow-scrolling:touch;will-change:transform;min-height:0;flex:1;contain:content}.emoji-menu{display:grid;grid-template-columns:repeat(var(--num-columns),var(--total-emoji-size));justify-content:space-around;align-items:flex-start;width:100%}.emoji-menu.visibility-auto{content-visibility:auto;contain-intrinsic-size:calc(var(--num-columns)*var(--total-emoji-size)) calc(var(--num-rows)*var(--total-emoji-size))}.category{padding:var(--emoji-padding);font-size:var(--category-font-size);color:var(--category-font-color)}.emoji,button.emoji{font-size:var(--emoji-size);display:flex;align-items:center;justify-content:center;border-radius:100%;height:var(--total-emoji-size);width:var(--total-emoji-size);line-height:1;overflow:hidden;font-family:var(--emoji-font-family);cursor:pointer}@media (hover:hover) and (pointer:fine){.emoji:hover,button.emoji:hover{background:var(--button-hover-background)}}.emoji.active,.emoji:active,button.emoji.active,button.emoji:active{background:var(--button-active-background)}.onscreen .custom-emoji::after{content:"";width:var(--emoji-size);height:var(--emoji-size);background-repeat:no-repeat;background-position:center center;background-size:contain;background-image:var(--custom-emoji-background)}.nav,.nav-button{align-items:center}.nav{display:grid;justify-content:space-between;contain:content}.nav-button{display:flex;justify-content:center}.nav-emoji{font-size:var(--category-emoji-size);width:var(--total-category-emoji-size);height:var(--total-category-emoji-size)}.indicator-wrapper{display:flex;border-bottom:1px solid var(--border-color)}.indicator{width:calc(100%/var(--num-groups));height:var(--indicator-height);opacity:var(--indicator-opacity);background-color:var(--indicator-color);will-change:transform,opacity;transition:opacity .1s linear,transform .25s ease-in-out}@media (prefers-reduced-motion:reduce){.indicator{will-change:opacity;transition:opacity .1s linear}}.pad-top,input.search{background:var(--background);width:100%}.pad-top{height:var(--emoji-padding);z-index:3}.search-row{display:flex;align-items:center;position:relative;padding-inline-start:var(--emoji-padding);padding-bottom:var(--emoji-padding)}.search-wrapper{flex:1;min-width:0}input.search{padding:var(--input-padding);border-radius:var(--input-border-radius);border:var(--input-border-size) solid var(--input-border-color);color:var(--input-font-color);font-size:var(--input-font-size);line-height:var(--input-line-height)}input.search::placeholder{color:var(--input-placeholder-color)}.favorites{overflow-y:auto;scrollbar-gutter:stable;display:flex;flex-direction:row;border-top:var(--border-size) solid var(--border-color);contain:content}.message{padding:var(--emoji-padding)}' +
      _e),
      this.shadowRoot.appendChild(t),
      (this._ctx = {
        locale: 'en',
        dataSource:
          'https://cdn.jsdelivr.net/npm/emoji-picker-element-data@^1/en/emojibase/data.json',
        skinToneEmoji: '🖐️',
        customCategorySorting: Q,
        customEmoji: null,
        i18n: $e,
        emojiVersion: null,
        ...e,
      }))
    for (const n of Ce)
      'database' !== n &&
        Object.prototype.hasOwnProperty.call(this, n) &&
        ((this._ctx[n] = this[n]), delete this[n])
    this._dbFlush()
  }
  connectedCallback() {
    this._cmp || (this._cmp = xe(this.shadowRoot, this._ctx))
  }
  disconnectedCallback() {
    we(() => {
      if (!this.isConnected && this._cmp) {
        ;(this._cmp.$destroy(), (this._cmp = void 0))
        const { database: e } = this._ctx
        e.close().catch((e) => {})
      }
    })
  }
  static get observedAttributes() {
    return ['locale', 'data-source', 'skin-tone-emoji', 'emoji-version']
  }
  attributeChangedCallback(e, t, n) {
    this._set(
      e.replace(/-([a-z])/g, (e, t) => t.toUpperCase()),
      'emoji-version' === e ? parseFloat(n) : n,
    )
  }
  _set(e, t) {
    ;((this._ctx[e] = t),
      this._cmp && this._cmp.$set({ [e]: t }),
      ['locale', 'dataSource'].includes(e) && this._dbFlush())
  }
  _dbCreate() {
    const { locale: e, dataSource: t, database: n } = this._ctx
    ;(n && n.locale === e && n.dataSource === t) ||
      this._set('database', new G({ locale: e, dataSource: t }))
  }
  _dbFlush() {
    we(() => this._dbCreate())
  }
}
const Ie = {}
for (const ze of Ce)
  Ie[ze] = {
    get() {
      return ('database' === ze && this._dbCreate(), this._ctx[ze])
    },
    set(e) {
      if ('database' === ze) throw new Error('database is read-only')
      this._set(ze, e)
    },
  }
;(Object.defineProperties(Le.prototype, Ie),
  customElements.get('emoji-picker') ||
    customElements.define('emoji-picker', Le))
//# sourceMappingURL=emoji-nU2WIqY_.js.map
