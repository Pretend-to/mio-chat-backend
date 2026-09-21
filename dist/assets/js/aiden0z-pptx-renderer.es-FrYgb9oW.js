import { o as t } from './rolldown-runtime-DZQF51_2.js'
import {
  An as e,
  Bn as n,
  Fn as i,
  Gn as r,
  Hn as o,
  In as l,
  Jn as s,
  Kn as a,
  Ln as d,
  Mn as c,
  Nn as u,
  Pn as h,
  Rn as p,
  Un as f,
  Vn as m,
  Wn as $,
  jn as g,
  kn as y,
  qn as x,
  zn as v,
} from './vendor_misc-1x0aym02.js'
var b = t(s(), 1),
  M = Object.defineProperty,
  w = (t, e, n) =>
    ((t, e, n) =>
      e in t
        ? M(t, e, { enumerable: !0, configurable: !0, writable: !0, value: n })
        : (t[e] = n))(t, 'symbol' != typeof e ? e + '' : e, n)
function k(t) {
  try {
    return decodeURIComponent(t)
  } catch {
    return t
  }
}
function A(t) {
  const e = (function (t) {
      const e = []
      for (const n of t.replace(/\\/g, '/').split('/'))
        if (n && '.' !== n) {
          if ('..' === n) {
            e.pop()
            continue
          }
          e.push(n)
        }
      return e
    })(
      (function (t) {
        const e = t.search(/[?#]/)
        return e >= 0 ? t.slice(0, e) : t
      })(t),
    ),
    n = e.lastIndexOf('media')
  return (n >= 0 && n < e.length - 1 ? e.slice(n + 1) : e.slice(-1)).join('/')
}
function L(t) {
  return `ppt/media/${A(t).split('/').map(k).join('/')}`
}
function S(t) {
  const e = A(t),
    n = L(t),
    i = `ppt/media/${e}`
  return n === i ? [n] : [n, i]
}
function C(t, e) {
  for (const n of S(t)) {
    const t = e.get(n)
    if (t) return { mediaPath: n, data: t }
  }
}
async function F(t, e, n) {
  return C(t, e) || (null == n ? void 0 : n.resolve(t))
}
function B(t, e, n) {
  let i = n.get(t)
  if (!i) {
    const r = (function (t) {
        var e
        return (
          {
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            gif: 'image/gif',
            svg: 'image/svg+xml',
            bmp: 'image/bmp',
            tiff: 'image/tiff',
            tif: 'image/tiff',
            emf: 'image/x-emf',
            wmf: 'image/x-wmf',
            webp: 'image/webp',
            mp4: 'video/mp4',
            m4v: 'video/mp4',
            webm: 'video/webm',
            avi: 'video/x-msvideo',
            mp3: 'audio/mpeg',
            wav: 'audio/wav',
            m4a: 'audio/mp4',
            ogg: 'audio/ogg',
          }[
            (null == (e = t.split('.').pop()) ? void 0 : e.toLowerCase()) || ''
          ] || 'application/octet-stream'
        )
      })(t),
      o = new Blob([e], { type: r })
    ;((i = URL.createObjectURL(o)), n.set(t, i))
  }
  return i
}
Object.freeze({
  maxEntries: 4e3,
  maxEntryUncompressedBytes: 33554432,
  maxTotalUncompressedBytes: 268435456,
  maxMediaBytes: 201326592,
  maxConcurrency: 8,
})
function j(t) {
  throw new Error(`PPTX zip limit exceeded: ${t}`)
}
function E(t) {
  return t.startsWith('ppt/media/')
}
function P(t, e, n) {
  t.set(e, n)
  const i = (function (t) {
    return t
      .split('/')
      .map((t) => {
        try {
          return decodeURIComponent(t)
        } catch {
          return t
        }
      })
      .join('/')
  })(e)
  i !== e && !t.has(i) && t.set(i, n)
}
function T(t) {
  const e = t._data,
    n = null == e ? void 0 : e.uncompressedSize
  return 'number' == typeof n && Number.isFinite(n) ? n : void 0
}
var z = class {
  constructor(t, e, n, i) {
    ;((this.entries = t),
      (this.media = e),
      (this.state = n),
      (this.totalBytes = i),
      (this.inflight = new Map()),
      (this.loadedPaths = new Set()),
      (this.totalCount = new Set(Array.from(t.values(), (t) => t.path)).size))
  }
  get loadedBytes() {
    var t
    let e = 0
    for (const n of this.loadedPaths)
      e += (null == (t = this.media.get(n)) ? void 0 : t.byteLength) ?? 0
    return e
  }
  get loadedCount() {
    return this.loadedPaths.size
  }
  async resolve(t) {
    for (const e of S(t)) {
      const t = this.media.get(e)
      if (t) return { mediaPath: e, data: t }
    }
    for (const e of S(t)) {
      const t = this.entries.get(e)
      if (t) return { mediaPath: e, data: await this.readEntry(t) }
    }
  }
  async readEntry(t) {
    let e = this.inflight.get(t.path)
    e ||
      ((e = I(t.path, t.file, this.state).then(
        (e) => (P(this.media, t.path, e), this.loadedPaths.add(t.path), e),
      )),
      this.inflight.set(t.path, e))
    try {
      return await e
    } finally {
      this.inflight.delete(t.path)
    }
  }
}
function N(t, e, n) {
  if (
    (void 0 !== n.limits.maxEntryUncompressedBytes &&
      e > n.limits.maxEntryUncompressedBytes &&
      j(
        `${t} is ${e} bytes > maxEntryUncompressedBytes ${n.limits.maxEntryUncompressedBytes}`,
      ),
    n.knownSizeByPath.has(t))
  )
    return
  n.unknownTotalBytes += e
  const i = n.knownTotalBytes + n.unknownTotalBytes
  if (
    (void 0 !== n.limits.maxTotalUncompressedBytes &&
      i > n.limits.maxTotalUncompressedBytes &&
      j(
        `total uncompressed bytes ${i} > maxTotalUncompressedBytes ${n.limits.maxTotalUncompressedBytes}`,
      ),
    E(t))
  ) {
    n.unknownMediaBytes += e
    const t = n.knownMediaBytes + n.unknownMediaBytes
    void 0 !== n.limits.maxMediaBytes &&
      t > n.limits.maxMediaBytes &&
      j(`media bytes ${t} > maxMediaBytes ${n.limits.maxMediaBytes}`)
  }
}
async function R(t, e, n) {
  const i = await e.async('string')
  return (
    N(
      t,
      (function (t) {
        return new TextEncoder().encode(t).byteLength
      })(i),
      n,
    ),
    i
  )
}
async function I(t, e, n) {
  const i = await e.async('uint8array')
  return (N(t, i.byteLength, n), i)
}
async function D(t, e, n) {
  const i = e.maxConcurrency ?? 8
  ;(!Number.isInteger(i) || i < 1) &&
    j(`maxConcurrency ${e.maxConcurrency} must be an integer >= 1`)
  const r = await b.default.loadAsync(t),
    o = Object.entries(r.files).filter(([, t]) => !t.dir)
  void 0 !== e.maxEntries &&
    o.length > e.maxEntries &&
    j(`entries ${o.length} > maxEntries ${e.maxEntries}`)
  const l = new Map()
  let s = 0,
    a = 0
  for (const [h, p] of o) {
    const t = h.replace(/\\/g, '/'),
      n = T(p)
    void 0 !== n &&
      (l.set(t, n),
      void 0 !== e.maxEntryUncompressedBytes &&
        n > e.maxEntryUncompressedBytes &&
        j(
          `${t} is ${n} bytes > maxEntryUncompressedBytes ${e.maxEntryUncompressedBytes}`,
        ),
      (s += n),
      void 0 !== e.maxTotalUncompressedBytes &&
        s > e.maxTotalUncompressedBytes &&
        j(
          `total uncompressed bytes ${s} > maxTotalUncompressedBytes ${e.maxTotalUncompressedBytes}`,
        ),
      E(t) &&
        ((a += n),
        void 0 !== e.maxMediaBytes &&
          a > e.maxMediaBytes &&
          j(`media bytes ${a} > maxMediaBytes ${e.maxMediaBytes}`)))
  }
  const d = {
      contentTypes: '',
      presentation: '',
      presentationRels: '',
      slides: new Map(),
      slideRels: new Map(),
      slideLayouts: new Map(),
      slideLayoutRels: new Map(),
      slideMasters: new Map(),
      slideMasterRels: new Map(),
      themes: new Map(),
      themeOverrides: new Map(),
      media: new Map(),
      fonts: new Map(),
      charts: new Map(),
      chartRels: new Map(),
      chartStyles: new Map(),
      chartColors: new Map(),
      diagramDrawings: new Map(),
    },
    c = {
      limits: e,
      knownSizeByPath: l,
      knownTotalBytes: s,
      knownMediaBytes: a,
      unknownTotalBytes: 0,
      unknownMediaBytes: 0,
    },
    u = new Map()
  return (
    await (async function (t, e, n) {
      if (0 === t.length) return
      const i = Math.min(e, t.length)
      let r = 0
      const o = Array.from({ length: i }, async () => {
        for (;;) {
          const e = r++
          if (e >= t.length) return
          await n(t[e])
        }
      })
      await Promise.all(o)
    })(o, i, async ([t, e]) => {
      const i = t.replace(/\\/g, '/')
      if ('[Content_Types].xml' !== i)
        if ('ppt/presentation.xml' !== i)
          if ('ppt/_rels/presentation.xml.rels' !== i)
            if ('ppt/tableStyles.xml' !== i) {
              if (E(i)) {
                if (n.lazyMedia) return void P(u, i, { path: i, file: e })
                const t = await I(i, e, c)
                return void P(d.media, i, t)
              }
              if (/^ppt\/fonts\/[^/]+\.fntdata$/i.test(i)) {
                const t = await I(i, e, c)
                return void P(d.fonts, i, t)
              }
              ;/^ppt\/slides\/_rels\/[^/]+\.xml\.rels$/.test(i)
                ? P(d.slideRels, i, await R(i, e, c))
                : /^ppt\/slides\/[^/]+\.xml$/.test(i)
                  ? P(d.slides, i, await R(i, e, c))
                  : /^ppt\/slideLayouts\/_rels\/[^/]+\.xml\.rels$/.test(i)
                    ? P(d.slideLayoutRels, i, await R(i, e, c))
                    : /^ppt\/slideLayouts\/[^/]+\.xml$/.test(i)
                      ? P(d.slideLayouts, i, await R(i, e, c))
                      : /^ppt\/slideMasters\/_rels\/[^/]+\.xml\.rels$/.test(i)
                        ? P(d.slideMasterRels, i, await R(i, e, c))
                        : /^ppt\/slideMasters\/[^/]+\.xml$/.test(i)
                          ? P(d.slideMasters, i, await R(i, e, c))
                          : /^ppt\/theme\/(?!themeOverride[^/]*\.xml$)[^/]+\.xml$/.test(
                                i,
                              )
                            ? P(d.themes, i, await R(i, e, c))
                            : /^ppt\/theme\/themeOverride[^/]*\.xml$/.test(i)
                              ? d.themeOverrides &&
                                P(d.themeOverrides, i, await R(i, e, c))
                              : /^ppt\/charts\/_rels\/[^/]+\.xml\.rels$/.test(i)
                                ? d.chartRels &&
                                  P(d.chartRels, i, await R(i, e, c))
                                : /^ppt\/charts\/(?!style[^/]*\.xml$)(?!colors[^/]*\.xml$)[^/]+\.xml$/.test(
                                      i,
                                    )
                                  ? P(d.charts, i, await R(i, e, c))
                                  : /^ppt\/charts\/style[^/]*\.xml$/.test(i)
                                    ? P(d.chartStyles, i, await R(i, e, c))
                                    : /^ppt\/charts\/colors[^/]*\.xml$/.test(i)
                                      ? P(d.chartColors, i, await R(i, e, c))
                                      : /^ppt\/diagrams\/[^/]+\.xml$/.test(i)
                                        ? P(
                                            d.diagramDrawings,
                                            i,
                                            await R(i, e, c),
                                          )
                                        : await (async function (t, e, n) {
                                            n.knownSizeByPath.has(t) ||
                                              (void 0 ===
                                                n.limits
                                                  .maxEntryUncompressedBytes &&
                                                void 0 ===
                                                  n.limits
                                                    .maxTotalUncompressedBytes) ||
                                              N(
                                                t,
                                                (await e.async('uint8array'))
                                                  .byteLength,
                                                n,
                                              )
                                          })(i, e, c)
            } else d.tableStyles = await R(i, e, c)
          else d.presentationRels = await R(i, e, c)
        else d.presentation = await R(i, e, c)
      else d.contentTypes = await R(i, e, c)
    }),
    n.lazyMedia && (d.mediaResolver = new z(u, d.media, c, a)),
    d
  )
}
function O(t) {
  const e = t ?? 'obj'
  return 'ctrTitle' === e
    ? 'title'
    : [
          'obj',
          'subTitle',
          'pic',
          'chart',
          'clipArt',
          'dgm',
          'media',
          'tbl',
        ].includes(e)
      ? 'body'
      : e
}
var U = class t {
  constructor(t) {
    this.el = t
  }
  attr(t) {
    if (!this.el) return
    if (this.el.hasAttribute(t)) return this.el.getAttribute(t)
    const e = t.indexOf(':'),
      n = e >= 0 ? t.slice(e + 1) : t,
      i = e >= 0 ? this.resolveAttributeNamespace(t.slice(0, e)) : void 0
    for (let r = 0; r < this.el.attributes.length; r++) {
      const t = this.el.attributes[r]
      if (
        t.localName === n &&
        (e < 0 || (i ? t.namespaceURI === i : null !== t.namespaceURI))
      )
        return t.value
    }
  }
  resolveAttributeNamespace(t) {
    var e
    return (
      (null == (e = this.el) ? void 0 : e.lookupNamespaceURI(t)) ??
      ('r' === t
        ? 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
        : void 0)
    )
  }
  numAttr(t) {
    const e = this.attr(t)
    if (void 0 === e) return
    const n = Number(e)
    return Number.isNaN(n) ? void 0 : n
  }
  child(e) {
    if (!this.el) return new t(null)
    const n = this.el.children
    for (let i = 0; i < n.length; i++)
      if (n[i].localName === e) return new t(n[i])
    return new t(null)
  }
  children(e) {
    if (!this.el) return []
    const n = [],
      i = this.el.children
    for (let r = 0; r < i.length; r++)
      (void 0 === e || i[r].localName === e) && n.push(new t(i[r]))
    return n
  }
  text() {
    return this.el ? (this.el.textContent ?? '') : ''
  }
  exists() {
    return null !== this.el
  }
  allChildren() {
    return this.children()
  }
  get localName() {
    var t
    return (null == (t = this.el) ? void 0 : t.localName) ?? ''
  }
  get element() {
    return this.el
  }
}
function Z(t) {
  const e = new DOMParser().parseFromString(t, 'application/xml'),
    n = e.querySelector('parsererror')
  return new U(n ? null : e.documentElement)
}
function G(t) {
  return 'external' === (null == t ? void 0 : t.trim().toLowerCase())
}
function X(t) {
  try {
    return decodeURIComponent(t)
  } catch {
    return t
  }
}
function Y(t) {
  const e = new Map()
  if (!t) return e
  const n = Z(t)
  if (!n.exists()) return e
  const i = n.children('Relationship')
  for (const r of i) {
    const t = r.attr('Id'),
      n = r.attr('Type'),
      i = r.attr('Target'),
      o = r.attr('TargetMode')
    t &&
      void 0 !== n &&
      void 0 !== i &&
      e.set(t, { type: n, target: i, targetMode: o })
  }
  return e
}
function W(t, e) {
  const n = (function (t) {
    const e = t.search(/[?#]/)
    return e >= 0 ? t.slice(0, e) : t
  })(e)
  if (n.startsWith('/'))
    return n.slice(1).replace(/\\/g, '/').split('/').map(X).join('/')
  const i = t.replace(/\\/g, '/').split('/').filter(Boolean),
    r = n.replace(/\\/g, '/').split('/').filter(Boolean).map(X),
    o = [...i]
  for (const l of r) '..' === l ? o.pop() : '.' !== l && o.push(l)
  return o.join('/')
}
function H(t) {
  return (t / 914400) * 96
}
function V(t) {
  return t / 6e4
}
function q(t) {
  return t / 1e5
}
var _ = [
  'dk1',
  'dk2',
  'lt1',
  'lt2',
  'accent1',
  'accent2',
  'accent3',
  'accent4',
  'accent5',
  'accent6',
  'hlink',
  'folHlink',
]
function Q(t) {
  const e = t.child('srgbClr')
  if (e.exists()) return e.attr('val')
  const n = t.child('sysClr')
  return n.exists() ? (n.attr('lastClr') ?? n.attr('val')) : void 0
}
function K(t) {
  const e = {}
  for (const i of t.children('font')) {
    const t = i.attr('script'),
      n = i.attr('typeface')
    t && n && (e[t] = n)
  }
  const n = {
    latin: t.child('latin').attr('typeface') ?? '',
    ea: t.child('ea').attr('typeface') ?? '',
    cs: t.child('cs').attr('typeface') ?? '',
  }
  return (Object.keys(e).length > 0 && (n.scripts = e), n)
}
function J(t) {
  const e = t.child('themeElements'),
    n = e.exists() ? e : t,
    i = n.child('clrScheme'),
    r = new Map()
  for (const d of _) {
    const t = i.child(d)
    if (t.exists()) {
      const e = Q(t)
      void 0 !== e && r.set(d, e)
    }
  }
  const o = n.child('fontScheme'),
    l = K(o.child('majorFont')),
    s = K(o.child('minorFont')),
    a = n.child('fmtScheme')
  return {
    colorScheme: r,
    majorFont: l,
    minorFont: s,
    fillStyles: a.child('fillStyleLst').allChildren(),
    bgFillStyles: a.child('bgFillStyleLst').allChildren(),
    lineStyles: a.child('lnStyleLst').allChildren(),
    effectStyles: a.child('effectStyleLst').allChildren(),
  }
}
var tt = new Set(['1', 'true', 't', 'on']),
  et = new Set(['0', 'false', 'f', 'off'])
function nt(t, e = !1) {
  if (void 0 === t) return e
  const n = t.trim().toLowerCase()
  return !!tt.has(n) || (!et.has(n) && e)
}
function it(t) {
  const e = t.child('spPr')
  if (e.exists()) {
    const t = e.child('xfrm')
    if (t.exists()) return t
  }
  const n = t.child('grpSpPr')
  if (n.exists()) {
    const t = n.child('xfrm')
    if (t.exists()) return t
  }
  const i = t.child('xfrm')
  return i.exists() ? i : t.child('__nonexistent__')
}
function rt(t) {
  const { cNvPr: e, nvPr: n } = (function (t) {
      for (const e of [
        'nvSpPr',
        'nvPicPr',
        'nvGrpSpPr',
        'nvGraphicFramePr',
        'nvCxnSpPr',
      ]) {
        const n = t.child(e)
        if (n.exists())
          return { cNvPr: n.child('cNvPr'), nvPr: n.child('nvPr') }
      }
      return { cNvPr: t.child('cNvPr'), nvPr: t.child('nvPr') }
    })(t),
    i = e.attr('id') ?? '',
    r = e.attr('name') ?? '',
    o = it(t),
    l = o.child('off'),
    s = o.child('ext'),
    a = { x: H(l.numAttr('x') ?? 0), y: H(l.numAttr('y') ?? 0) },
    d = { w: H(s.numAttr('cx') ?? 0), h: H(s.numAttr('cy') ?? 0) },
    c = V(o.numAttr('rot') ?? 0),
    u = nt(o.attr('flipH')),
    h = nt(o.attr('flipV')),
    p = (function (t) {
      const e = t.child('ph')
      if (e.exists()) return { type: e.attr('type'), idx: e.numAttr('idx') }
    })(n)
  let f
  const m = e.child('hlinkClick')
  return (
    m.exists() &&
      (f = {
        action: m.attr('action') ?? void 0,
        rId: m.attr('id') ?? m.attr('r:id') ?? void 0,
        tooltip: m.attr('tooltip') ?? void 0,
      }),
    {
      id: i,
      name: r,
      position: a,
      size: d,
      rotation: c,
      flipH: u,
      flipV: h,
      placeholder: p,
      hlinkClick: f,
      source: t,
    }
  )
}
function ot(t, e, n) {
  const i = t.attr(e)
  if (void 0 === i) return
  const r = Number(i)
  if (Number.isFinite(r) && ('fov' === e ? r > 0 && r <= 108e5 : r > 0))
    return 'fov' === e ? V(r) : q(r)
  lt(n, 'malformed-numeric')
}
function lt(t, e) {
  t.includes(e) || t.push(e)
}
function st(t, e) {
  if (!t.exists()) return
  const n = [t.attr('lat'), t.attr('lon'), t.attr('rev')].map((t) =>
    void 0 === t ? 0 : Number(t),
  )
  if (!n.some((t) => !Number.isFinite(t)))
    return { latitude: V(n[0]), longitude: V(n[1]), revolution: V(n[2]) }
  lt(e, 'malformed-numeric')
}
function at(t, e, n, i) {
  const r = t.attr(e)
  if (void 0 === r) return H(n)
  const o = Number(r)
  if (Number.isFinite(o) && !(o < 0)) return H(o)
  lt(i, 'malformed-numeric')
}
function dt(t, e, n) {
  const i = t.attr(e)
  if (void 0 === i) return
  const r = Number(i)
  if (Number.isFinite(r)) return H(r)
  lt(n, 'malformed-numeric')
}
function ct(t, e) {
  if (!t.exists()) return
  const n = t.attr('prst')
  return {
    preset: n ?? 'circle',
    presetExplicit: void 0 !== n,
    width: at(t, 'w', 76200, e),
    height: at(t, 'h', 76200, e),
  }
}
function ut(t) {
  if (!t.exists()) return
  const e = t.allChildren()[0]
  return null != e && e.exists()
    ? { type: e.localName, value: e.attr('val') ?? e.attr('lastClr') }
    : void 0
}
function ht(t) {
  const e = t.child('scene3d'),
    n = t.child('sp3d')
  if (!e.exists() && !n.exists()) return
  const i = []
  let r, o
  if (e.exists()) {
    const t = e.child('camera'),
      n = e.child('lightRig')
    if (((r = {}), t.exists())) {
      ;((r.cameraPreset = t.attr('prst')),
        (r.fieldOfView = ot(t, 'fov', i)),
        (r.cameraZoom = ot(t, 'zoom', i)))
      const e = t.child('rot')
      r.cameraRotation = st(e, i)
    }
    if (n.exists()) {
      ;((r.lightRig = n.attr('rig')), (r.lightDirection = n.attr('dir')))
      const t = n.child('rot')
      r.lightRotation = st(t, i)
    }
    e.child('backdrop').exists() && (r.hasBackdrop = !0)
  }
  if (n.exists()) {
    const t = ct(n.child('bevelT'), i),
      e = ct(n.child('bevelB'), i),
      r = n.child('contourClr'),
      l = n.child('extrusionClr')
    o = {
      zPosition: dt(n, 'z', i),
      extrusionHeight: at(n, 'extrusionH', 0, i),
      contourWidth: at(n, 'contourW', 0, i),
      presetMaterial: n.attr('prstMaterial'),
      bevelTop: t,
      bevelBottom: e,
      extrusionColor: ut(l),
      contourColor: ut(r),
      contourColorSource: r.exists() ? r : void 0,
    }
  }
  const l = t.child('effectLst'),
    s = t.child('effectDag')
  return {
    scene: r,
    shape: o,
    effectKinds: l.exists()
      ? l.allChildren().map((t) => t.localName)
      : s.exists()
        ? ['effectDag']
        : [],
    parseIssues: i,
  }
}
var pt = 'http://schemas.microsoft.com/office/drawing/2010/main',
  ft = new Set([
    'http://schemas.openxmlformats.org/officeDocument/2006/math',
    'http://purl.oclc.org/ooxml/officeDocument/math',
  ]),
  mt = new Set([
    'http://schemas.openxmlformats.org/drawingml/2006/main',
    'http://purl.oclc.org/ooxml/drawingml/main',
  ])
function $t(t, e) {
  var n
  return (
    t.exists() &&
    ft.has((null == (n = t.element) ? void 0 : n.namespaceURI) ?? '') &&
    (void 0 === e || t.localName === e)
  )
}
function gt(t, e) {
  return t.allChildren().find((t) => $t(t, e))
}
function yt(t, e) {
  return t.allChildren().every((t) => {
    var n
    const i = (null == (n = t.element) ? void 0 : n.namespaceURI) ?? ''
    return ft.has(i) && e.has(t.localName)
  })
}
function xt(t, e = new Set(['argPr', 'ctrlPr'])) {
  const n = []
  for (const i of t.allChildren()) {
    if (!$t(i)) return
    if (e.has(i.localName)) continue
    const t = Mt(i)
    if (!t) return
    n.push(t)
  }
  return { kind: 'row', children: n }
}
function vt(t, e) {
  const n = gt(t, e)
  return n ? xt(n) : void 0
}
function bt(t, e) {
  const n = gt(t, e)
  return n ? { present: !0, value: xt(n) } : { present: !1 }
}
function Mt(t) {
  if ($t(t))
    switch (t.localName) {
      case 'r':
        return (function (t) {
          var e, n
          const i = new Set(['rPr', 't'])
          for (const s of t.allChildren()) {
            const t = (null == (e = s.element) ? void 0 : e.namespaceURI) ?? ''
            if (!(
              ($t(s) && i.has(s.localName)) ||
              (mt.has(t) && 'rPr' === s.localName)
            ))
              return
          }
          const r = t.allChildren().filter((t) => $t(t, 't'))
          if (0 === r.length) return
          const o = null == (n = gt(t, 'rPr')) ? void 0 : n.child('nor'),
            l = null != o && o.exists() ? nt(o.attr('val') ?? '1') : void 0
          return {
            kind: 'text',
            text: r.map((t) => t.text()).join(''),
            ...(void 0 !== l ? { normal: l } : {}),
          }
        })(t)
      case 'f':
        return (function (t) {
          var e
          if (!yt(t, new Set(['fPr', 'num', 'den']))) return
          const n = vt(t, 'num'),
            i = vt(t, 'den')
          if (!n || !i) return
          const r =
            (null == (e = gt(t, 'fPr'))
              ? void 0
              : e.child('type').attr('val')) ?? 'bar'
          return ['bar', 'noBar', 'skw', 'lin'].includes(r)
            ? { kind: 'fraction', numerator: n, denominator: i, style: r }
            : void 0
        })(t)
      case 'rad':
        return (function (t) {
          var e
          if (!yt(t, new Set(['radPr', 'deg', 'e']))) return
          const n = vt(t, 'e')
          if (!n) return
          const i = bt(t, 'deg')
          if (i.present && !i.value) return
          const r = i.present ? i.value : void 0,
            o = null == (e = gt(t, 'radPr')) ? void 0 : e.child('degHide')
          return {
            kind: 'radical',
            radicand: n,
            degree:
              (null == o || !o.exists() || !nt(o.attr('val') ?? '1')) &&
              r &&
              r.children.length > 0
                ? r
                : void 0,
          }
        })(t)
      case 'sSub':
      case 'sSup':
      case 'sSubSup':
        return (function (t, e) {
          const n = new Set([`${e}Pr`, 'e'])
          if (
            ('sSup' !== e && n.add('sub'),
            'sSub' !== e && n.add('sup'),
            !yt(t, n))
          )
            return
          const i = vt(t, 'e')
          if (!i) return
          const r = 'sSup' === e ? void 0 : vt(t, 'sub'),
            o = 'sSub' === e ? void 0 : vt(t, 'sup')
          return ('sSup' !== e && !r) || ('sSub' !== e && !o)
            ? void 0
            : { kind: 'scripts', base: i, subscript: r, superscript: o }
        })(t, t.localName)
      case 'd':
        return (function (t) {
          if (!yt(t, new Set(['dPr', 'e']))) return
          const e = t
            .allChildren()
            .filter((t) => $t(t, 'e'))
            .map((t) => xt(t))
          if (0 === e.length || e.some((t) => !t)) return
          const n = gt(t, 'dPr')
          return {
            kind: 'delimiter',
            begin: (null == n ? void 0 : n.child('begChr').attr('val')) ?? '(',
            end: (null == n ? void 0 : n.child('endChr').attr('val')) ?? ')',
            separator:
              (null == n ? void 0 : n.child('sepChr').attr('val')) ?? '|',
            elements: e,
          }
        })(t)
      case 'nary':
        return (function (t) {
          if (!yt(t, new Set(['naryPr', 'sub', 'sup', 'e']))) return
          const e = gt(t, 'naryPr'),
            n = bt(t, 'sub'),
            i = bt(t, 'sup'),
            r = bt(t, 'e')
          if (
            (n.present && !n.value) ||
            (i.present && !i.value) ||
            (r.present && !r.value)
          )
            return
          const o =
            (null == e ? void 0 : e.child('limLoc').attr('val')) ?? 'subSup'
          return 'subSup' === o || 'undOvr' === o
            ? {
                kind: 'nary',
                operator:
                  (null == e ? void 0 : e.child('chr').attr('val')) ?? '∫',
                lower: n.present ? n.value : void 0,
                upper: i.present ? i.value : void 0,
                body: r.present ? r.value : void 0,
                limitLocation: o,
              }
            : void 0
        })(t)
      case 'm':
        return (function (t) {
          if (!yt(t, new Set(['mPr', 'mr']))) return
          const e = []
          for (const n of t.allChildren().filter((t) => $t(t, 'mr'))) {
            if (!yt(n, new Set(['e']))) return
            const t = n
              .allChildren()
              .filter((t) => $t(t, 'e'))
              .map((t) => xt(t))
            if (0 === t.length || t.some((t) => !t)) return
            e.push(t)
          }
          return e.length > 0 ? { kind: 'matrix', rows: e } : void 0
        })(t)
      case 'func':
        return (function (t) {
          if (!yt(t, new Set(['funcPr', 'fName', 'e']))) return
          const e = vt(t, 'fName'),
            n = vt(t, 'e')
          return e && n ? { kind: 'function', name: e, argument: n } : void 0
        })(t)
      default:
        return
    }
}
function wt(t) {
  if ($t(t, 'oMath')) return xt(t, new Set(['argPr', 'ctrlPr']))
}
function kt(t) {
  var e
  if (
    'm' !== t.localName ||
    (null == (e = t.element) ? void 0 : e.namespaceURI) !== pt
  )
    return
  const n = []
  let i = 'inline'
  for (const r of t.allChildren()) {
    if ($t(r, 'oMath')) {
      const t = wt(r)
      if (!t) return
      n.push(...t.children)
      continue
    }
    if ($t(r, 'oMathPara')) {
      if (((i = 'block'), !yt(r, new Set(['oMathParaPr', 'oMath'])))) return
      const t = r.allChildren().filter((t) => $t(t, 'oMath'))
      if (0 === t.length) return
      for (const e of t) {
        const t = wt(e)
        if (!t) return
        n.push(...t.children)
      }
      continue
    }
    return
  }
  return n.length > 0
    ? { display: i, body: { kind: 'row', children: n } }
    : void 0
}
function At(t) {
  const e = t.element
  if (!e) return
  const n = Array.from(e.children)
  for (; n.length > 0;) {
    const t = n.shift()
    if (mt.has(t.namespaceURI ?? '') && 'rPr' === t.localName) return new U(t)
    n.unshift(...Array.from(t.children))
  }
}
function Lt(t) {
  switch (t.kind) {
    case 'row':
      return t.children.map(Lt).join('')
    case 'text':
      return t.text
    case 'fraction':
      return `(${Lt(t.numerator)})/(${Lt(t.denominator)})`
    case 'radical':
      return t.degree
        ? `root(${Lt(t.degree)},${Lt(t.radicand)})`
        : `sqrt(${Lt(t.radicand)})`
    case 'scripts':
      return `${Lt(t.base)}${t.subscript ? `_(${Lt(t.subscript)})` : ''}${t.superscript ? `^(${Lt(t.superscript)})` : ''}`
    case 'delimiter':
      return `${t.begin}${t.elements.map(Lt).join(t.separator)}${t.end}`
    case 'nary':
      return `${t.operator}${t.lower ? `_(${Lt(t.lower)})` : ''}${t.upper ? `^(${Lt(t.upper)})` : ''}${t.body ? Lt(t.body) : ''}`
    case 'matrix':
      return `[${t.rows.map((t) => t.map(Lt).join(',')).join(';')}]`
    case 'function':
      return `${Lt(t.name)}(${Lt(t.argument)})`
  }
}
function St(t) {
  return Lt(t.body)
}
function Ct(t) {
  var e
  const n = t.child('pPr'),
    i = n.numAttr('lvl') ?? 0,
    r = []
  for (const s of t.children('r')) {
    const t = s.child('rPr'),
      e = s.child('t')
    r.push({ text: e.text(), properties: t.exists() ? t : void 0 })
  }
  for (const s of t.allChildren()) s.localName
  const o = []
  for (const s of t.allChildren()) {
    const t = s.localName
    if ('r' === t) {
      const t = s.child('rPr'),
        e = s.child('t')
      o.push({ text: e.text(), properties: t.exists() ? t : void 0 })
    } else if ('br' === t) {
      const t = s.child('rPr')
      o.push({ text: '\n', properties: t.exists() ? t : void 0 })
    } else if ('tab' === t) o.push({ text: '\t' })
    else if ('fld' === t) {
      const t = s.child('rPr'),
        e = s.child('t')
      o.push({
        text: e.text(),
        fieldType: s.attr('type'),
        properties: t.exists() ? t : void 0,
      })
    } else if (
      'm' === t &&
      (null == (e = s.element) ? void 0 : e.namespaceURI) === pt
    ) {
      const t = kt(s)
      t && o.push({ text: St(t), math: t, properties: At(s) })
    }
  }
  const l = t.child('endParaRPr')
  return {
    properties: n.exists() ? n : void 0,
    runs: o.length > 0 ? o : r,
    level: i,
    endParaRPr: l.exists() ? l : void 0,
  }
}
function Ft(t) {
  if (!t.exists()) return
  const e = t.child('bodyPr'),
    n = t.child('lstStyle'),
    i = []
  for (const r of t.children('p')) i.push(Ct(r))
  return {
    bodyProperties: e.exists() ? e : void 0,
    listStyle: n.exists() ? n : void 0,
    paragraphs: i,
  }
}
var Bt = ['solidFill', 'gradFill', 'blipFill', 'pattFill', 'grpFill', 'noFill']
function jt(t) {
  const e = new Map()
  for (const n of t.children('gd')) {
    const t = n.attr('name'),
      i = n.attr('fmla') ?? ''
    if (!t) continue
    const r = i.match(/val\s+(-?\d+)/)
    if (r) e.set(t, Number(r[1]))
    else {
      const n = Number(i)
      Number.isNaN(n) || e.set(t, n)
    }
  }
  return e
}
function Et(t) {
  const e = rt(t),
    n = t.child('spPr'),
    i = n.child('prstGeom'),
    r = i.attr('prst'),
    o = jt(i.child('avLst')),
    l = n.child('custGeom'),
    s = l.exists() ? l : void 0,
    a = (function (t) {
      for (const e of Bt) {
        const n = t.child(e)
        if (n.exists()) return n
      }
    })(n),
    d = n.child('ln'),
    c = d.exists() ? d : void 0,
    u = ht(n)
  let h, p
  if (d.exists()) {
    const t = d.child('headEnd')
    if (t.exists()) {
      const e = t.attr('type')
      e && 'none' !== e && (h = { type: e, w: t.attr('w'), len: t.attr('len') })
    }
    const e = d.child('tailEnd')
    if (e.exists()) {
      const t = e.attr('type')
      t && 'none' !== t && (p = { type: t, w: e.attr('w'), len: e.attr('len') })
    }
  }
  const f = Ft(t.child('txBody'))
  let m
  const $ = t.child('txXfrm')
  if ($.exists()) {
    const t = $.child('off'),
      e = $.child('ext'),
      i = n.child('xfrm'),
      r = i.child('off'),
      o = i.child('ext'),
      l = r.numAttr('x') ?? 0,
      s = r.numAttr('y') ?? 0,
      a = o.numAttr('cx') ?? 0,
      d = o.numAttr('cy') ?? 0,
      c = t.numAttr('x') ?? 0,
      u = t.numAttr('y') ?? 0,
      h = e.numAttr('cx') ?? 0,
      p = e.numAttr('cy') ?? 0
    if (a > 0 && d > 0) {
      const t = V($.numAttr('rot') ?? 0),
        e = c - l,
        n = u - s,
        i = Math.abs(Math.round(t)) % 360 == 180,
        r = i ? d - (n + p) : n
      m = { x: H(i ? a - (e + h) : e), y: H(r), w: H(h), h: H(p), rotation: t }
    }
  }
  return {
    ...e,
    nodeType: 'shape',
    presetGeometry: r,
    adjustments: o,
    customGeometry: s,
    fill: a,
    line: c,
    shape3d: u,
    headEnd: h,
    tailEnd: p,
    textBody: f,
    textBoxBounds: m,
  }
}
var Pt = 1e5
function Tt(t) {
  const e = rt(t),
    n = t.child('blipFill'),
    i = n.child('blip'),
    r = i
      .child('extLst')
      .children('ext')
      .map((t) => t.child('svgBlip'))
      .find((t) => t.exists()),
    o =
      (null == r ? void 0 : r.attr('embed')) ??
      (null == r ? void 0 : r.attr('r:embed')),
    l = i.attr('embed') ?? i.attr('r:embed'),
    s = o ?? l,
    a = i.attr('link') ?? i.attr('r:link'),
    d = n.child('srcRect')
  let c
  if (d.exists()) {
    const t = d.numAttr('t'),
      e = d.numAttr('b'),
      n = d.numAttr('l'),
      i = d.numAttr('r')
    ;(void 0 !== t || void 0 !== e || void 0 !== n || void 0 !== i) &&
      (c = {
        top: (t ?? 0) / Pt,
        bottom: (e ?? 0) / Pt,
        left: (n ?? 0) / Pt,
        right: (i ?? 0) / Pt,
      })
  }
  const u = t.child('spPr'),
    h = u.child('solidFill'),
    p = u.child('gradFill'),
    f = h.exists() ? h : p.exists() ? p : void 0,
    m = u.child('ln'),
    $ = m.exists() ? m : void 0,
    g = ht(u),
    y = u.child('prstGeom'),
    x = y.exists() ? y.attr('prst') : void 0,
    v = y.exists() ? jt(y.child('avLst')) : void 0,
    b = u.child('custGeom'),
    M = b.exists() ? b : void 0,
    w = t.child('nvPicPr').child('nvPr'),
    k = w.child('videoFile'),
    A = w.child('audioFile'),
    L = k.exists(),
    S = A.exists()
  let C
  return (
    L
      ? (C = k.attr('link') ?? k.attr('r:link'))
      : S && (C = A.attr('link') ?? A.attr('r:link')),
    {
      ...e,
      nodeType: 'picture',
      blipEmbed: s,
      blipLink: a,
      crop: c,
      fill: f,
      line: $,
      shape3d: g,
      presetGeometry: x,
      geometryAdjustments: v,
      customGeometry: M,
      isVideo: L || void 0,
      isAudio: S || void 0,
      mediaRId: C,
    }
  )
}
function zt(t) {
  const e = t.numAttr('gridSpan') ?? 1,
    n = t.numAttr('rowSpan') ?? 1,
    i = nt(t.attr('hMerge')),
    r = nt(t.attr('vMerge')),
    o = Ft(t.child('txBody')),
    l = t.child('tcPr')
  return {
    gridSpan: e,
    rowSpan: n,
    hMerge: i,
    vMerge: r,
    textBody: o,
    properties: l.exists() ? l : void 0,
  }
}
function Nt(t) {
  const e = H(t.numAttr('h') ?? 0),
    n = []
  for (const i of t.children('tc')) n.push(zt(i))
  return { height: e, cells: n }
}
var Rt = new Set(['sp', 'pic', 'grpSp', 'graphicFrame', 'cxnSp'])
var It = new Set(['sp', 'pic', 'grpSp', 'graphicFrame', 'cxnSp']),
  Dt = ['nvSpPr', 'nvPicPr', 'nvGrpSpPr', 'nvGraphicFramePr', 'nvCxnSpPr'],
  Ot = new Set([
    'http://schemas.openxmlformats.org/presentationml/2006/main',
    'http://purl.oclc.org/ooxml/presentationml/main',
    'http://schemas.openxmlformats.org/drawingml/2006/main',
    'http://purl.oclc.org/ooxml/drawingml/main',
    'http://schemas.openxmlformats.org/drawingml/2006/chart',
    'http://purl.oclc.org/ooxml/drawingml/chart',
    'http://schemas.openxmlformats.org/drawingml/2006/diagram',
    'http://purl.oclc.org/ooxml/drawingml/diagram',
    'http://schemas.microsoft.com/office/drawing/2008/diagram',
    'http://schemas.microsoft.com/office/drawing/2016/SVG/main',
  ])
function Ut(t) {
  var e
  const n = null == (e = t.attr('Requires')) ? void 0 : e.trim()
  if (!n) return !0
  const i = t.element
  return (
    !!i &&
    n.split(/\s+/).every((e) => {
      const n = i.lookupNamespaceURI(e) ?? ''
      return (
        !!Ot.has(n) ||
        (n === pt &&
          (function (t) {
            const e = t.element
            if (!e) return !1
            const n = Array.from(e.children)
            let i = 0
            for (; n.length > 0;) {
              const t = n.pop()
              if (
                t.namespaceURI === pt &&
                ('m' !== t.localName || ((i += 1), !kt(new U(t))))
              )
                return !1
              n.push(...Array.from(t.children))
            }
            return i > 0
          })(t))
      )
    })
  )
}
function Zt(t) {
  for (const n of t.children('Choice')) if (Ut(n)) return n
  const e = t.child('Fallback')
  return e.exists() ? e : void 0
}
function Gt(t) {
  if ('AlternateContent' !== t.localName) return [t]
  const e = Zt(t)
  return e ? e.allChildren().flatMap(Gt) : []
}
function Xt(t) {
  for (const e of Dt) {
    const n = t.child(e)
    if (n.exists() && n.child('nvPr').child('ph').exists()) return !0
  }
  return !1
}
function Yt(t) {
  const e = (function (t) {
    const e = t.child('graphic').child('graphicData')
    if (!(e.attr('uri') || '').includes('ole')) return null
    const n = (t) => {
        const e = t.child('blipFill').child('blip')
        return !!(
          e.attr('embed') ??
          e.attr('r:embed') ??
          e.attr('link') ??
          e.attr('r:link')
        )
      },
      i = e.child('oleObj')
    if (i.exists()) {
      const t = i.child('pic')
      if (t.exists() && n(t)) return t
    }
    const r = e.child('AlternateContent')
    if (!r.exists()) return null
    const o = Zt(r)
    if (!o) return null
    const l = o.child('oleObj')
    if (!l.exists()) return null
    const s = l.child('pic')
    return s.exists() && n(s) ? s : null
  })(t)
  if (!e) return
  const n = rt(t),
    i = Tt(e)
  return i.blipEmbed || i.blipLink
    ? { ...i, ...n, nodeType: 'picture', source: e }
    : void 0
}
function Wt(t, e) {
  const n = Z(e).child('spTree'),
    i = []
  if (n.exists())
    for (const r of n.allChildren())
      for (const t of Gt(r)) It.has(t.localName) && i.push(t)
  return {
    ...t,
    nodeType: 'group',
    childOffset: { x: 0, y: 0 },
    childExtent: { w: Math.max(1, t.size.w), h: Math.max(1, t.size.h) },
    children: i,
  }
}
function Ht(t, e) {
  if (!e.skipPlaceholders || !Xt(t))
    switch (t.localName) {
      case 'sp':
      case 'cxnSp':
        return Et(t)
      case 'pic':
        return Tt(t)
      case 'grpSp': {
        const e = (function (t) {
          const e = rt(t),
            n = t.child('grpSpPr'),
            i = n.child('xfrm'),
            r = i.child('chOff'),
            o = i.child('chExt'),
            l = r.exists()
              ? { x: H(r.numAttr('x') ?? 0), y: H(r.numAttr('y') ?? 0) }
              : { x: 0, y: 0 },
            s = (() => {
              if (!o.exists()) return { w: e.size.w, h: e.size.h }
              const t = o.numAttr('cx'),
                n = o.numAttr('cy')
              return {
                w: void 0 !== t && t > 0 ? H(t) : e.size.w,
                h: void 0 !== n && n > 0 ? H(n) : e.size.h,
              }
            })(),
            a = []
          for (const d of t.allChildren()) Rt.has(d.localName) && a.push(d)
          return {
            ...e,
            nodeType: 'group',
            shape3d: ht(n),
            childOffset: l,
            childExtent: s,
            children: a,
          }
        })(t)
        return (
          (e.children = t
            .allChildren()
            .flatMap(Gt)
            .filter((t) => It.has(t.localName))),
          e
        )
      }
      case 'graphicFrame':
        return (function (t) {
          return t.child('graphic').child('graphicData').child('tbl').exists()
        })(t)
          ? (function (t) {
              const e = rt(t),
                n = (function (t) {
                  return t.child('graphic').child('graphicData').child('tbl')
                })(t),
                i = n.child('tblGrid'),
                r = []
              for (const c of i.children('gridCol'))
                r.push(H(c.numAttr('w') ?? 0))
              const o = []
              for (const c of n.children('tr')) o.push(Nt(c))
              const l = r.reduce((t, e) => t + e, 0),
                s = o.reduce((t, e) => t + e.height, 0),
                a = n.child('tblPr'),
                d = (function (t) {
                  const e = t.child('tableStyleId')
                  if (e.exists()) return e.text() || e.attr('val') || void 0
                  const n = t.child('tblStyle')
                  return n.exists()
                    ? (n.attr('val') ?? (n.text() || void 0))
                    : (t.attr('tblStyle') ?? void 0)
                })(a)
              return {
                ...e,
                size: { w: l > 0 ? l : e.size.w, h: s > 0 ? s : e.size.h },
                nodeType: 'table',
                columns: r,
                rows: o,
                properties: a.exists() ? a : void 0,
                tableStyleId: d,
              }
            })(t)
          : (function (t) {
                return (
                  t.child('graphic').child('graphicData').attr('uri') || ''
                ).includes('chart')
              })(t)
            ? (function (t, e, n) {
                const i = rt(t),
                  r = t.child('graphic').child('graphicData')
                let o
                for (const s of r.allChildren())
                  if ('chart' === s.localName) {
                    o = s.attr('r:id') || s.attr('id')
                    break
                  }
                if (!o) return
                const l = e.get(o)
                if (!l) return
                return {
                  ...i,
                  nodeType: 'chart',
                  chartPath: W(n.substring(0, n.lastIndexOf('/')), l.target),
                }
              })(t, e.rels, e.partPath ?? '')
            : (function (t) {
                  return (
                    t.child('graphic').child('graphicData').attr('uri') || ''
                  ).includes('diagram')
                })(t)
              ? (function (t, e) {
                  var n
                  if (!e.diagramDrawings) return
                  const i = rt(t),
                    r = (function (t) {
                      if (!t) return ''
                      const e = t.lastIndexOf('/')
                      return e >= 0 ? t.substring(0, e) : ''
                    })(e.partPath),
                    o = Array.from(e.rels.values())
                      .filter(
                        (t) =>
                          t.type.includes('diagramDrawing') ||
                          t.target.includes('diagrams/drawing'),
                      )
                      .map((t) => {
                        const e = t.target.match(/drawing(\d+)/)
                        return {
                          target: t.target,
                          num: e ? Number.parseInt(e[1], 10) : void 0,
                        }
                      }),
                    l = t.child('graphic').child('graphicData').child('relIds')
                  if (l.exists()) {
                    const t = l.attr('r:dm') ?? l.attr('dm'),
                      i = t ? e.rels.get(t) : void 0,
                      r =
                        null ==
                        (n = null == i ? void 0 : i.target.match(/data(\d+)/))
                          ? void 0
                          : n[1]
                    if (r) {
                      const t = Number.parseInt(r, 10)
                      o.sort(
                        (e, n) =>
                          (void 0 === e.num
                            ? Number.POSITIVE_INFINITY
                            : Math.abs(e.num - t)) -
                          (void 0 === n.num
                            ? Number.POSITIVE_INFINITY
                            : Math.abs(n.num - t)),
                      )
                    }
                  }
                  for (const s of o) {
                    const t = W(r, s.target),
                      n = e.diagramDrawings.get(t)
                    if (n) {
                      const t = Wt(i, n),
                        o = l.attr('r:lo') ?? l.attr('lo'),
                        s = o ? e.rels.get(o) : void 0
                      if (
                        s &&
                        !G(s.targetMode) &&
                        s.type.endsWith('/diagramLayout')
                      ) {
                        const n = e.diagramDrawings.get(W(r, s.target))
                        n && (t.diagramLayoutId = Z(n).attr('uniqueId'))
                      }
                      return t
                    }
                  }
                })(t, e)
              : Yt(t)
      default:
        return
    }
}
function Vt(t, e) {
  const n = []
  for (const i of Gt(t)) {
    const t = Ht(i, e)
    t && n.push(t)
  }
  return n
}
function qt(t, e) {
  return Vt(t, e)[0]
}
function _t(t) {
  for (const e of ['nvSpPr', 'nvPicPr', 'nvGraphicFramePr', 'nvCxnSpPr']) {
    const n = t.child(e)
    if (n.exists() && n.child('nvPr').child('ph').exists()) return !0
  }
  return !1
}
function Qt(t) {
  const e = t.child('spPr').child('xfrm'),
    n = e.exists() ? e : t.child('xfrm')
  if (!n.exists()) return null
  const i = n.child('off'),
    r = n.child('ext')
  return {
    offX: i.numAttr('x') ?? 0,
    offY: i.numAttr('y') ?? 0,
    cx: r.numAttr('cx') ?? 0,
    cy: r.numAttr('cy') ?? 0,
  }
}
function Kt(t) {
  const e = t.child('grpSpPr')
  if (!e.exists()) return null
  const n = e.child('xfrm')
  if (!n.exists()) return null
  const i = n.child('off'),
    r = n.child('ext'),
    o = n.child('chOff'),
    l = n.child('chExt'),
    s = i.numAttr('x') ?? 0,
    a = i.numAttr('y') ?? 0,
    d = r.numAttr('cx') ?? 0,
    c = r.numAttr('cy') ?? 0,
    u = o.exists() ? (o.numAttr('x') ?? 0) : 0,
    h = o.exists() ? (o.numAttr('y') ?? 0) : 0,
    p = l.exists() ? (l.numAttr('cx') ?? d) : d,
    f = l.exists() ? (l.numAttr('cy') ?? c) : c
  return {
    offX: s,
    offY: a,
    cx: d,
    cy: c,
    chOffX: u,
    chOffY: h,
    chExtCx: p > 0 ? p : 1,
    chExtCy: f > 0 ? f : 1,
  }
}
function Jt(t, e) {
  const n = []
  for (const i of t.allChildren().flatMap(Gt)) {
    if ('grpSp' === i.localName) {
      const t = Kt(i)
      if (t && t.chExtCx > 0 && t.chExtCy > 0) {
        const r = t.cx / t.chExtCx,
          o = t.cy / t.chExtCy,
          l = t.offX - t.chOffX * r,
          s = t.offY - t.chOffY * o,
          a = e
            ? {
                offX: e.offX + l * e.scaleX,
                offY: e.offY + s * e.scaleY,
                scaleX: e.scaleX * r,
                scaleY: e.scaleY * o,
              }
            : { offX: l, offY: s, scaleX: r, scaleY: o }
        n.push(...Jt(i, a))
      } else n.push(...Jt(i, e))
      continue
    }
    if (!_t(i)) continue
    const t = Qt(i)
    if (t)
      if (e) {
        const r = e.offX + t.offX * e.scaleX,
          o = e.offY + t.offY * e.scaleY,
          l = t.cx * e.scaleX,
          s = t.cy * e.scaleY
        n.push({
          node: i,
          absoluteXfrm: {
            position: { x: H(r), y: H(o) },
            size: { w: H(l), h: H(s) },
          },
        })
      } else
        n.push({
          node: i,
          absoluteXfrm: {
            position: { x: H(t.offX), y: H(t.offY) },
            size: { w: H(t.cx), h: H(t.cy) },
          },
        })
    else n.push({ node: i })
  }
  return n
}
function te(t) {
  const e = t.child('cSld'),
    n = e.child('bg'),
    i = n.exists() ? n : void 0,
    r = e.child('spTree'),
    o = (function (t) {
      const e = new Map(),
        n = t.element
      if (!n) return e
      const i = n.attributes
      for (let r = 0; r < i.length; r++) {
        const t = i[r]
        e.set(t.localName, t.value)
      }
      return e
    })(t.child('clrMap')),
    l = t.child('txStyles'),
    s = l.child('titleStyle'),
    a = l.child('bodyStyle'),
    d = l.child('otherStyle'),
    c = t.child('defaultTextStyle'),
    u = Jt(r, null),
    h = u.map((t) => t.node)
  return {
    colorMap: o,
    background: i,
    textStyles: {
      titleStyle: s.exists() ? s : void 0,
      bodyStyle: a.exists() ? a : void 0,
      otherStyle: d.exists() ? d : void 0,
    },
    defaultTextStyle: c.exists() ? c : void 0,
    placeholders: h,
    placeholderEntries: u,
    spTree: r,
    rels: new Map(),
  }
}
function ee(t) {
  for (const e of ['nvSpPr', 'nvPicPr', 'nvGraphicFramePr', 'nvCxnSpPr']) {
    const n = t.child(e)
    if (n.exists() && n.child('nvPr').child('ph').exists()) return !0
  }
  return !1
}
function ne(t) {
  const e = t.child('spPr').child('xfrm'),
    n = e.exists() ? e : t.child('xfrm')
  if (!n.exists()) return null
  const i = n.child('off'),
    r = n.child('ext')
  return {
    offX: i.numAttr('x') ?? 0,
    offY: i.numAttr('y') ?? 0,
    cx: r.numAttr('cx') ?? 0,
    cy: r.numAttr('cy') ?? 0,
  }
}
function ie(t) {
  const e = t.child('grpSpPr')
  if (!e.exists()) return null
  const n = e.child('xfrm')
  if (!n.exists()) return null
  const i = n.child('off'),
    r = n.child('ext'),
    o = n.child('chOff'),
    l = n.child('chExt'),
    s = i.numAttr('x') ?? 0,
    a = i.numAttr('y') ?? 0,
    d = r.numAttr('cx') ?? 0,
    c = r.numAttr('cy') ?? 0,
    u = o.exists() ? (o.numAttr('x') ?? 0) : 0,
    h = o.exists() ? (o.numAttr('y') ?? 0) : 0,
    p = l.exists() ? (l.numAttr('cx') ?? d) : d,
    f = l.exists() ? (l.numAttr('cy') ?? c) : c
  return {
    offX: s,
    offY: a,
    cx: d,
    cy: c,
    chOffX: u,
    chOffY: h,
    chExtCx: p > 0 ? p : 1,
    chExtCy: f > 0 ? f : 1,
  }
}
function re(t, e) {
  const n = []
  for (const i of t.allChildren().flatMap(Gt)) {
    if ('grpSp' === i.localName) {
      const t = ie(i)
      if (t && t.chExtCx > 0 && t.chExtCy > 0) {
        const r = t.cx / t.chExtCx,
          o = t.cy / t.chExtCy,
          l = t.offX - t.chOffX * r,
          s = t.offY - t.chOffY * o,
          a = re(
            i,
            e
              ? {
                  offX: e.offX + l * e.scaleX,
                  offY: e.offY + s * e.scaleY,
                  scaleX: e.scaleX * r,
                  scaleY: e.scaleY * o,
                }
              : { offX: l, offY: s, scaleX: r, scaleY: o },
          )
        n.push(...a)
      } else n.push(...re(i, e))
      continue
    }
    if (!ee(i)) continue
    const t = ne(i)
    if (t)
      if (e) {
        const r = e.offX + t.offX * e.scaleX,
          o = e.offY + t.offY * e.scaleY,
          l = t.cx * e.scaleX,
          s = t.cy * e.scaleY
        n.push({
          node: i,
          absoluteXfrm: {
            position: { x: H(r), y: H(o) },
            size: { w: H(l), h: H(s) },
          },
        })
      } else
        n.push({
          node: i,
          absoluteXfrm: {
            position: { x: H(t.offX), y: H(t.offY) },
            size: { w: H(t.cx), h: H(t.cy) },
          },
        })
    else n.push({ node: i })
  }
  return n
}
function oe(t) {
  const e = new Map(),
    n = t.element
  if (!n) return e
  const i = n.attributes
  for (let r = 0; r < i.length; r++) {
    const t = i[r]
    e.set(t.localName, t.value)
  }
  return e
}
function le(t) {
  const e = t.child('clrMapOvr')
  if (!e.exists()) return {}
  const n = e.child('overrideClrMapping')
  return n.exists()
    ? { colorMapOverride: oe(n), colorMapOverrideMode: 'override' }
    : e.child('masterClrMapping').exists()
      ? { colorMapOverrideMode: 'master' }
      : {}
}
function se(t) {
  const e = t.child('cSld'),
    n = e.child('bg'),
    i = n.exists() ? n : void 0,
    r = e.child('spTree'),
    { colorMapOverride: o, colorMapOverrideMode: l } = le(t),
    s = re(r, null),
    a = (function (t) {
      return nt(t, !0)
    })(t.attr('showMasterSp'))
  return {
    colorMapOverride: o,
    colorMapOverrideMode: l,
    background: i,
    placeholders: s,
    spTree: r,
    rels: new Map(),
    showMasterSp: a,
  }
}
function ae(t) {
  return nt(t, !0)
}
function de(t) {
  for (const [, e] of t) if (e.type.includes('slideLayout')) return e.target
  return ''
}
function ce(t, e, n, i = '', r) {
  const o = t.child('cSld'),
    l = o.child('bg'),
    s = l.exists() ? l : void 0,
    a = o.child('spTree'),
    d = []
  for (const m of a.allChildren()) {
    const t = Vt(m, { rels: n, partPath: i, diagramDrawings: r })
    d.push(...t)
  }
  const c = de(n),
    u = ae(t.attr('showMasterSp')),
    h = !ae(t.attr('show')),
    { colorMapOverride: p, colorMapOverrideMode: f } = le(t)
  return {
    index: e,
    hidden: h,
    nodes: d,
    background: s,
    layoutIndex: c,
    rels: n,
    slidePath: i,
    showMasterSp: u,
    colorMapOverride: p,
    colorMapOverrideMode: f,
    nodesMaterialized: !0,
  }
}
function ue(t, e, n, i = '') {
  return {
    index: e,
    nodes: [],
    layoutIndex: de(n),
    rels: n,
    slidePath: i,
    showMasterSp: !0,
    sourceXml: t,
    nodesMaterialized: !1,
  }
}
function he(t) {
  const e = t.lastIndexOf('/')
  return e >= 0 ? t.substring(0, e) : ''
}
function pe(t) {
  return `${he(t)}/_rels/${t.substring(t.lastIndexOf('/') + 1)}.rels`
}
function fe(t, e) {
  for (const [, n] of t) if (n.type.includes(e)) return n
}
var me = 0
function $e(t, e = {}) {
  var n, i, r, o
  const l = Z(t.presentation),
    s = Y(t.presentationRels),
    a = l.child('sldSz'),
    d = H(a.numAttr('cx') ?? 9144e3),
    c = H(a.numAttr('cy') ?? 6858e3),
    u = l.numAttr('firstSlideNum') ?? 1,
    h = (function (t) {
      return (
        t.includes('wps') ||
        t.includes('kso') ||
        t.includes('Kingsoft') ||
        t.includes('WPS')
      )
    })(t.presentation),
    p = l.child('defaultTextStyle'),
    f = (function (t, e, n) {
      var i, r
      const o = [],
        l = new Map(),
        s = ++me,
        a = [
          ['regular', '400', 'normal'],
          ['bold', '700', 'normal'],
          ['italic', '400', 'italic'],
          ['boldItalic', '700', 'italic'],
        ]
      for (const d of t.child('embeddedFontLst').children('embeddedFont')) {
        const t =
          null == (i = d.child('font').attr('typeface')) ? void 0 : i.trim()
        if (!t) continue
        const c = `__pptx_embedded_${s}_${l.size}`
        let u = !1
        for (const [i, l, s] of a) {
          const a = d.child(i),
            h = a.attr('id') ?? a.attr('r:id'),
            p = h ? e.get(h) : void 0
          if (!p) continue
          const f = null == (r = n.fonts) ? void 0 : r.get(W('ppt', p.target))
          f &&
            (o.push({
              family: t,
              renderFamily: c,
              data: f,
              weight: l,
              style: s,
            }),
            (u = !0))
        }
        u && l.set(t.toLowerCase(), c)
      }
      return { faces: o, families: l }
    })(l, s, t),
    m = new Map()
  for (const [B, j] of t.themes) {
    const t = Z(j)
    m.set(B, J(t))
  }
  const $ = new Map(),
    g = new Map()
  for (const [B, j] of t.slideMasters) {
    const e = te(Z(j)),
      n = pe(B),
      i = t.slideMasterRels.get(n)
    if (i) {
      const t = Y(i)
      e.rels = t
      const n = fe(t, 'theme')
      if (n) {
        const t = W(he(B), n.target)
        g.set(B, t)
      }
    }
    $.set(B, e)
  }
  const y = new Map(),
    x = new Map()
  for (const [B, j] of t.slideLayouts) {
    const e = se(Z(j)),
      n = pe(B),
      i = t.slideLayoutRels.get(n)
    if (i) {
      const t = Y(i)
      e.rels = t
      const n = fe(t, 'slideMaster')
      if (n) {
        const t = W(he(B), n.target)
        x.set(B, t)
      }
    }
    y.set(B, e)
  }
  const v = new Map(),
    b = new Map(),
    M = new Map(),
    w = new Map()
  for (const [B, j] of t.charts) {
    const e = Z(j)
    e.exists() && v.set(B, e)
    const l = pe(B),
      s = null == (n = t.chartRels) ? void 0 : n.get(l)
    if (!s) continue
    const a = Y(s),
      d = fe(a, 'chartStyle')
    if (d) {
      const e = W(he(B), d.target),
        n = null == (i = t.chartStyles) ? void 0 : i.get(e)
      if (n) {
        const t = Z(n)
        t.exists() && M.set(B, t)
      }
    }
    const c = fe(a, 'chartColorStyle')
    if (c) {
      const e = W(he(B), c.target),
        n = null == (r = t.chartColors) ? void 0 : r.get(e)
      if (n) {
        const t = Z(n)
        t.exists() && w.set(B, t)
      }
    }
    const u = fe(a, 'themeOverride')
    if (!u) continue
    const h = W(he(B), u.target),
      p =
        (null == (o = t.themeOverrides) ? void 0 : o.get(h)) ?? t.themes.get(h)
    if (!p) continue
    const f = Z(p)
    f.exists() && b.set(B, J(f))
  }
  const k = l.child('sldIdLst'),
    A = []
  for (const B of k.children('sldId')) {
    const t = B.attr('r:id') ?? B.attr('id')
    if (t) {
      const e = s.get(t)
      if (e) {
        const t = W('ppt', e.target)
        A.push(t)
      }
    }
  }
  if (0 === A.length) {
    const t = (function (t, e) {
      const n = []
      for (const [i, r] of t) r.type.includes(e) && n.push([i, r])
      return n
    })(s, 'slide')
    t.sort(
      (t, e) =>
        (parseInt(t[0].replace(/\D/g, ''), 10) || 0) -
        (parseInt(e[0].replace(/\D/g, ''), 10) || 0),
    )
    for (const [, e] of t)
      if (
        e.type.includes('/slide') &&
        !e.type.includes('slideLayout') &&
        !e.type.includes('slideMaster')
      ) {
        const t = W('ppt', e.target)
        A.push(t)
      }
  }
  const L = [],
    S = new Map()
  for (let B = 0; B < A.length; B++) {
    const n = A[B],
      i = t.slides.get(n)
    if (!i) continue
    const r = pe(n),
      o = t.slideRels.get(r),
      l = o ? Y(o) : new Map(),
      s = e.lazySlides ? ue(i, B, l, n) : ce(Z(i), B, l, n, t.diagramDrawings)
    if (s.layoutIndex) {
      const t = W(he(n), s.layoutIndex)
      ;((s.layoutIndex = t), S.set(B, t))
    }
    L.push(s)
  }
  let C
  if (t.tableStyles) {
    const e = Z(t.tableStyles)
    e.exists() && (C = e)
  }
  const F = {
    width: d,
    height: c,
    firstSlideNum: u,
    slides: L,
    layouts: y,
    masters: $,
    themes: m,
    slideToLayout: S,
    layoutToMaster: x,
    masterToTheme: g,
    media: t.media,
    mediaResolver: t.mediaResolver,
    embeddedFonts: f.faces,
    embeddedFontFamilies: f.families,
    tableStyles: C,
    defaultTextStyle: p.exists() ? p : void 0,
    charts: v,
    diagramDrawings: t.diagramDrawings,
    chartThemes: b,
    chartStyles: M,
    chartColorStyles: w,
    isWps: h,
  }
  return (
    e.lazySlides ||
      (function (t) {
        for (let e = 0; e < t.slides.length; e++) ye(t, t.slides[e])
      })(F),
    F
  )
}
function ge(t) {
  for (const e of [
    'nvSpPr',
    'nvPicPr',
    'nvGrpSpPr',
    'nvGraphicFramePr',
    'nvCxnSpPr',
  ]) {
    const n = t.child(e)
    if (n.exists()) {
      const t = n.child('nvPr').child('ph')
      if (t.exists()) {
        const e = t.attr('type'),
          n = t.attr('idx'),
          i = void 0 !== n ? Number(n) : void 0
        return { type: e, idx: void 0 === i || isNaN(i) ? void 0 : i }
      }
    }
  }
  return {}
}
function ye(t, e) {
  if (e.placeholderInheritanceResolved) return
  const n = t.slideToLayout.get(e.index) || e.layoutIndex,
    i = n ? t.layouts.get(n) : void 0,
    r = n ? t.layoutToMaster.get(n) : void 0,
    o = r ? t.masters.get(r) : void 0
  ;((function (t, e, n) {
    for (const i of t) (i.nodeType, be(i, e, n))
  })(e.nodes, i, o),
    (e.placeholderInheritanceResolved = !0))
}
function xe(t, e) {
  ;((function (t, e) {
    if (t.nodesMaterialized) return
    if (!t.sourceXml) return void (t.nodesMaterialized = !0)
    const n = t.layoutIndex,
      i = ce(Z(t.sourceXml), t.index, t.rels, t.slidePath, e)
    ;((t.hidden = i.hidden),
      (t.nodes = i.nodes),
      (t.background = i.background),
      (t.layoutIndex = n || i.layoutIndex),
      (t.showMasterSp = i.showMasterSp),
      (t.colorMapOverride = i.colorMapOverride),
      (t.colorMapOverrideMode = i.colorMapOverrideMode),
      (t.nodesMaterialized = !0),
      (t.sourceXml = void 0))
  })(e, t.diagramDrawings),
    ye(t, e))
}
function ve(t) {
  const e = t.child('txBody')
  if (!e.exists()) return
  const n = e.child('bodyPr')
  return n.exists() ? n : void 0
}
function be(t, e, n, i = {}) {
  if (!t.placeholder) return
  const { idx: r } = t.placeholder,
    o = e
      ? (function (t, e) {
          return t.find((t) => (ge(t.node).idx ?? 0) === (e ?? 0))
        })(e.placeholders, r)
      : void 0
  o &&
    (function (t, e) {
      if (t.type) return
      const n = ge(e)
      n.type && (t.type = n.type)
    })(t.placeholder, o.node)
  const l = n
      ? (function (t) {
          return (
            t.placeholderEntries ?? t.placeholders.map((t) => ({ node: t }))
          )
        })(n).find((e) => {
          var n
          return (
            (ge(e.node).type ?? 'obj') ===
            O(
              o
                ? ge(o.node).type
                : null == (n = t.placeholder)
                  ? void 0
                  : n.type,
            )
          )
        })
      : void 0,
    s = it(t.source),
    a = s.child('off'),
    d = s.child('ext'),
    c = [o, l]
      .map(
        (t) =>
          t &&
          (t.absoluteXfrm ??
            (function (t) {
              const e = t.child('spPr').child('xfrm'),
                n = e.exists() ? e : t.child('xfrm')
              if (n.exists()) {
                const t = n.child('off'),
                  e = n.child('ext'),
                  i = t.numAttr('x'),
                  r = e.numAttr('cx')
                if (void 0 !== i && void 0 !== r)
                  return {
                    position: {
                      x: H(t.numAttr('x') ?? 0),
                      y: H(t.numAttr('y') ?? 0),
                    },
                    size: {
                      w: H(e.numAttr('cx') ?? 0),
                      h: H(e.numAttr('cy') ?? 0),
                    },
                  }
              }
            })(t.node)),
      )
      .find((t) => void 0 !== t)
  if (c) {
    const e = (function (t, e) {
      return e.parentGroup
        ? (function (t, e) {
            const n = e.childExtent.w > 0 ? e.size.w / e.childExtent.w : 1,
              i = e.childExtent.h > 0 ? e.size.h / e.childExtent.h : 1
            return 0 === n || 0 === i
              ? t
              : {
                  position: {
                    x: e.childOffset.x + (t.position.x - e.position.x) / n,
                    y: e.childOffset.y + (t.position.y - e.position.y) / i,
                  },
                  size: { w: t.size.w / n, h: t.size.h / i },
                }
          })(t, e.parentGroup)
        : t
    })(c, i)
    ;(void 0 === a.attr('x') && (t.position.x = e.position.x),
      void 0 === a.attr('y') && (t.position.y = e.position.y),
      void 0 === d.attr('cx') && (t.size.w = e.size.w),
      void 0 === d.attr('cy') && (t.size.h = e.size.h))
  }
  if ('textBody' in t && t.textBody) {
    const e = o && ve(o.node),
      n = l && ve(l.node)
    if (e && n) {
      const i = e.element.cloneNode(!0)
      for (const t of ['anchor', 'lIns', 'tIns', 'rIns', 'bIns']) {
        const e = n.attr(t)
        !i.hasAttribute(t) && void 0 !== e && i.setAttribute(t, e)
      }
      t.textBody.layoutBodyProperties = new U(i)
    } else t.textBody.layoutBodyProperties = e ?? n
  }
}
function Me(t) {
  const e = t.replace(/^#/, '')
  if (6 !== e.length && 3 !== e.length) return { r: 0, g: 0, b: 0 }
  const n = 3 === e.length ? e[0] + e[0] + e[1] + e[1] + e[2] + e[2] : e,
    i = parseInt(n, 16)
  return { r: (i >> 16) & 255, g: (i >> 8) & 255, b: 255 & i }
}
function we(t, e, n) {
  const i = (t) => Math.max(0, Math.min(255, Math.round(t)))
  return (
    '#' +
    [i(t), i(e), i(n)].map((t) => t.toString(16).padStart(2, '0')).join('')
  )
}
function ke(t, e, n) {
  const i = t / 255,
    r = e / 255,
    o = n / 255,
    l = Math.max(i, r, o),
    s = Math.min(i, r, o),
    a = (l + s) / 2
  let d = 0,
    c = 0
  if (l !== s) {
    const t = l - s
    switch (((c = a > 0.5 ? t / (2 - l - s) : t / (l + s)), l)) {
      case i:
        d = 60 * ((r - o) / t + (r < o ? 6 : 0))
        break
      case r:
        d = 60 * ((o - i) / t + 2)
        break
      case o:
        d = 60 * ((i - r) / t + 4)
    }
  }
  return { h: d, s: c, l: a }
}
function Ae(t, e, n) {
  if (
    ((t = ((t % 360) + 360) % 360),
    (e = Math.max(0, Math.min(1, e))),
    (n = Math.max(0, Math.min(1, n))),
    0 === e)
  ) {
    const t = Math.round(255 * n)
    return { r: t, g: t, b: t }
  }
  const i = (t, e, n) => (
      n < 0 && (n += 1),
      n > 1 && (n -= 1),
      n < 1 / 6
        ? t + 6 * (e - t) * n
        : n < 0.5
          ? e
          : n < 2 / 3
            ? t + (e - t) * (2 / 3 - n) * 6
            : t
    ),
    r = n < 0.5 ? n * (1 + e) : n + e - n * e,
    o = 2 * n - r,
    l = t / 360
  return {
    r: Math.round(255 * i(o, r, l + 1 / 3)),
    g: Math.round(255 * i(o, r, l)),
    b: Math.round(255 * i(o, r, l - 1 / 3)),
  }
}
function Le(t) {
  const e = t / 255
  return e <= 0.04045 ? e / 12.92 : ((e + 0.055) / 1.055) ** 2.4
}
function Se(t) {
  const e = t <= 0.0031308 ? 12.92 * t : 1.055 * t ** 0.4166666666666667 - 0.055
  return Math.max(0, Math.min(255, Math.round(255 * e)))
}
function Ce(t, e) {
  const { r: n, g: i, b: r } = Me(t),
    o = e / 1e5,
    l = Le(n),
    s = Le(i),
    a = Le(r)
  return we(
    Se(l * o + 1 * (1 - o)),
    Se(s * o + 1 * (1 - o)),
    Se(a * o + 1 * (1 - o)),
  )
}
function Fe(t, e) {
  const { r: n, g: i, b: r } = Me(t),
    o = e / 1e5
  return we(Se(Le(n) * o), Se(Le(i) * o), Se(Le(r) * o))
}
function Be(t, e) {
  const { r: n, g: i, b: r } = Me(t),
    { h: o, s: l, l: s } = ke(n, i, r),
    a = Ae(o, l, Math.max(0, Math.min(1, s * (e / 1e5))))
  return we(a.r, a.g, a.b)
}
function je(t, e) {
  const { r: n, g: i, b: r } = Me(t),
    { h: o, s: l, l: s } = ke(n, i, r),
    a = Ae(o, l, Math.max(0, Math.min(1, s + e / 1e5)))
  return we(a.r, a.g, a.b)
}
function Ee(t, e) {
  const { r: n, g: i, b: r } = Me(t),
    { h: o, s: l, l: s } = ke(n, i, r),
    a = Ae(o, Math.max(0, Math.min(1, l * (e / 1e5))), s)
  return we(a.r, a.g, a.b)
}
function Pe(t, e) {
  const { r: n, g: i, b: r } = Me(t),
    { h: o, s: l, l: s } = ke(n, i, r),
    a = Ae((o * (e / 1e5)) % 360, l, s)
  return we(a.r, a.g, a.b)
}
function Te(t, e) {
  const { r: n, g: i, b: r } = Me(t),
    { h: o, s: l, l: s } = ke(n, i, r),
    a = Ae((((o + e / 6e4) % 360) + 360) % 360, l, s)
  return we(a.r, a.g, a.b)
}
function ze(t, e) {
  const { r: n, g: i, b: r } = Me(t),
    { h: o, s: l, l: s } = ke(n, i, r),
    a = Ae(o, Math.max(0, Math.min(1, l + e / 1e5)), s)
  return we(a.r, a.g, a.b)
}
function Ne(t) {
  return (t / 1e5) * 255
}
function Re(t, e, n) {
  const i = Me(t)
  return ((i[e] = n(i[e])), we(i.r, i.g, i.b))
}
function Ie(t, e, n) {
  return Re(t, e, (t) => t * (n / 1e5))
}
function De(t, e, n) {
  return Re(t, e, (t) => t + Ne(n))
}
function Oe(t, e, n) {
  return Re(t, e, () => Ne(n))
}
function Ue(t, e) {
  const { r: n, g: i, b: r } = Me(t),
    { h: o, s: l } = ke(n, i, r),
    s = Ae(o, l, e / 1e5)
  return we(s.r, s.g, s.b)
}
function Ze(t, e) {
  const { r: n, g: i, b: r } = Me(t),
    { h: o, l: l } = ke(n, i, r),
    s = Ae(o, e / 1e5, l)
  return we(s.r, s.g, s.b)
}
function Ge(t, e) {
  const { r: n, g: i, b: r } = Me(t),
    { s: o, l: l } = ke(n, i, r),
    s = Ae(e / 6e4, o, l)
  return we(s.r, s.g, s.b)
}
function Xe(t) {
  const { r: e, g: n, b: i } = Me(t)
  return we(255 - e, 255 - n, 255 - i)
}
function Ye(t) {
  const { r: e, g: n, b: i } = Me(t),
    r = 0.2126 * e + 0.7152 * n + 0.0722 * i
  return we(r, r, r)
}
function We(t) {
  const { r: e, g: n, b: i } = Me(t),
    { h: r, s: o, l: l } = ke(e, n, i),
    s = Ae(r + 180, o, l)
  return we(s.r, s.g, s.b)
}
function He(t) {
  const { r: e, g: n, b: i } = Me(t)
  return we(255 * Le(e), 255 * Le(n), 255 * Le(i))
}
function Ve(t) {
  const { r: e, g: n, b: i } = Me(t)
  return we(Se(e / 255), Se(n / 255), Se(i / 255))
}
function qe(t) {
  return Math.max(0, Math.min(1, t / 1e5))
}
function _e(t, e) {
  let n = t,
    i = 1
  for (const r of e)
    switch (r.name.startsWith('a:') ? r.name.slice(2) : r.name) {
      case 'tint':
        n = Ce(n, r.val)
        break
      case 'shade':
        n = Fe(n, r.val)
        break
      case 'red':
        n = Oe(n, 'r', r.val)
        break
      case 'green':
        n = Oe(n, 'g', r.val)
        break
      case 'blue':
        n = Oe(n, 'b', r.val)
        break
      case 'redMod':
        n = Ie(n, 'r', r.val)
        break
      case 'greenMod':
        n = Ie(n, 'g', r.val)
        break
      case 'blueMod':
        n = Ie(n, 'b', r.val)
        break
      case 'redOff':
        n = De(n, 'r', r.val)
        break
      case 'greenOff':
        n = De(n, 'g', r.val)
        break
      case 'blueOff':
        n = De(n, 'b', r.val)
        break
      case 'lum':
        n = Ue(n, r.val)
        break
      case 'lumMod':
        n = Be(n, r.val)
        break
      case 'lumOff':
        n = je(n, r.val)
        break
      case 'sat':
        n = Ze(n, r.val)
        break
      case 'satMod':
        n = Ee(n, r.val)
        break
      case 'hue':
        n = Ge(n, r.val)
        break
      case 'hueMod':
        n = Pe(n, r.val)
        break
      case 'hueOff':
        n = Te(n, r.val)
        break
      case 'satOff':
        n = ze(n, r.val)
        break
      case 'inv':
        n = Xe(n)
        break
      case 'gray':
        n = Ye(n)
        break
      case 'comp':
        n = We(n)
        break
      case 'gamma':
        n = He(n)
        break
      case 'invGamma':
        n = Ve(n)
        break
      case 'alpha':
        i = qe(r.val)
        break
      case 'alphaMod':
      case 'alphaModFix':
        i = Math.max(0, Math.min(1, i * (r.val / 1e5)))
        break
      case 'alphaOff':
        i = Math.max(0, Math.min(1, i + r.val / 1e5))
    }
  return { color: n, alpha: i }
}
var Qe = {
  black: '#000000',
  white: '#FFFFFF',
  red: '#FF0000',
  green: '#008000',
  blue: '#0000FF',
  yellow: '#FFFF00',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  orange: '#FFA500',
  purple: '#800080',
  brown: '#A52A2A',
  pink: '#FFC0CB',
  gray: '#808080',
  grey: '#808080',
  lime: '#00FF00',
  navy: '#000080',
  teal: '#008080',
  maroon: '#800000',
  olive: '#808000',
  silver: '#C0C0C0',
  aqua: '#00FFFF',
  fuchsia: '#FF00FF',
  aliceBlue: '#F0F8FF',
  antiqueWhite: '#FAEBD7',
  aquamarine: '#7FFFD4',
  azure: '#F0FFFF',
  beige: '#F5F5DC',
  bisque: '#FFE4C4',
  blanchedAlmond: '#FFEBCD',
  blueViolet: '#8A2BE2',
  burlyWood: '#DEB887',
  cadetBlue: '#5F9EA0',
  chartreuse: '#7FFF00',
  chocolate: '#D2691E',
  coral: '#FF7F50',
  cornflowerBlue: '#6495ED',
  cornsilk: '#FFF8DC',
  crimson: '#DC143C',
  darkBlue: '#00008B',
  darkCyan: '#008B8B',
  darkGoldenrod: '#B8860B',
  darkGray: '#A9A9A9',
  darkGrey: '#A9A9A9',
  darkGreen: '#006400',
  darkKhaki: '#BDB76B',
  darkMagenta: '#8B008B',
  darkOliveGreen: '#556B2F',
  darkOrange: '#FF8C00',
  darkOrchid: '#9932CC',
  darkRed: '#8B0000',
  darkSalmon: '#E9967A',
  darkSeaGreen: '#8FBC8F',
  darkSlateBlue: '#483D8B',
  darkSlateGray: '#2F4F4F',
  darkSlateGrey: '#2F4F4F',
  darkTurquoise: '#00CED1',
  darkViolet: '#9400D3',
  deepPink: '#FF1493',
  deepSkyBlue: '#00BFFF',
  dimGray: '#696969',
  dimGrey: '#696969',
  dodgerBlue: '#1E90FF',
  firebrick: '#B22222',
  floralWhite: '#FFFAF0',
  forestGreen: '#228B22',
  gainsboro: '#DCDCDC',
  ghostWhite: '#F8F8FF',
  gold: '#FFD700',
  goldenrod: '#DAA520',
  greenYellow: '#ADFF2F',
  honeydew: '#F0FFF0',
  hotPink: '#FF69B4',
  indianRed: '#CD5C5C',
  indigo: '#4B0082',
  ivory: '#FFFFF0',
  khaki: '#F0E68C',
  lavender: '#E6E6FA',
  lavenderBlush: '#FFF0F5',
  lawnGreen: '#7CFC00',
  lemonChiffon: '#FFFACD',
  lightBlue: '#ADD8E6',
  lightCoral: '#F08080',
  lightCyan: '#E0FFFF',
  lightGoldenrodYellow: '#FAFAD2',
  lightGray: '#D3D3D3',
  lightGrey: '#D3D3D3',
  lightGreen: '#90EE90',
  lightPink: '#FFB6C1',
  lightSalmon: '#FFA07A',
  lightSeaGreen: '#20B2AA',
  lightSkyBlue: '#87CEFA',
  lightSlateGray: '#778899',
  lightSlateGrey: '#778899',
  lightSteelBlue: '#B0C4DE',
  lightYellow: '#FFFFE0',
  limeGreen: '#32CD32',
  linen: '#FAF0E6',
  mediumAquamarine: '#66CDAA',
  mediumBlue: '#0000CD',
  mediumOrchid: '#BA55D3',
  mediumPurple: '#9370DB',
  mediumSeaGreen: '#3CB371',
  mediumSlateBlue: '#7B68EE',
  mediumSpringGreen: '#00FA9A',
  mediumTurquoise: '#48D1CC',
  mediumVioletRed: '#C71585',
  midnightBlue: '#191970',
  mintCream: '#F5FFFA',
  mistyRose: '#FFE4E1',
  moccasin: '#FFE4B5',
  navajoWhite: '#FFDEAD',
  oldLace: '#FDF5E6',
  oliveDrab: '#6B8E23',
  orangeRed: '#FF4500',
  orchid: '#DA70D6',
  paleGoldenrod: '#EEE8AA',
  paleGreen: '#98FB98',
  paleTurquoise: '#AFEEEE',
  paleVioletRed: '#DB7093',
  papayaWhip: '#FFEFD5',
  peachPuff: '#FFDAB9',
  peru: '#CD853F',
  plum: '#DDA0DD',
  powderBlue: '#B0E0E6',
  rosyBrown: '#BC8F8F',
  royalBlue: '#4169E1',
  saddleBrown: '#8B4513',
  salmon: '#FA8072',
  sandyBrown: '#F4A460',
  seaGreen: '#2E8B57',
  seaShell: '#FFF5EE',
  sienna: '#A0522D',
  skyBlue: '#87CEEB',
  slateBlue: '#6A5ACD',
  slateGray: '#708090',
  slateGrey: '#708090',
  snow: '#FFFAFA',
  springGreen: '#00FF7F',
  steelBlue: '#4682B4',
  tan: '#D2B48C',
  thistle: '#D8BFD8',
  tomato: '#FF6347',
  turquoise: '#40E0D0',
  violet: '#EE82EE',
  wheat: '#F5DEB3',
  whiteSmoke: '#F5F5F5',
  yellowGreen: '#9ACD32',
}
function Ke(t) {
  if (void 0 !== Qe[t]) return Qe[t]
  const e = t.toLowerCase()
  for (const [n, i] of Object.entries(Qe)) if (n.toLowerCase() === e) return i
}
function Je(t) {
  const e = []
  for (const n of t.allChildren()) {
    const t = n.localName,
      i = n.numAttr('val') ?? n.numAttr('amt')
    void 0 !== i && t
      ? e.push({ name: t, val: i })
      : ('inv' === t ||
          'gray' === t ||
          'comp' === t ||
          'gamma' === t ||
          'invGamma' === t) &&
        e.push({ name: t, val: 0 })
  }
  return e
}
function tn(t, e) {
  let n = t
  const i =
      e.slide.colorMapOverrideMode ??
      (e.slide.colorMapOverride ? 'override' : void 0),
    r =
      e.layout.colorMapOverrideMode ??
      (e.layout.colorMapOverride ? 'override' : void 0),
    o = (e) => !(null == e || !e.has(t)) && ((n = e.get(t) ?? t), !0)
  return (
    'override' === i
      ? o(e.slide.colorMapOverride) || o(e.master.colorMap)
      : 'master' === i
        ? o(e.master.colorMap)
        : ('override' === r && o(e.layout.colorMapOverride)) ||
          o(e.master.colorMap),
    e.theme.colorScheme.get(n) || e.theme.colorScheme.get(t) || '000000'
  )
}
function en(t, e) {
  const n = (function (t) {
      const e = [t.localName, t.attr('val') ?? '']
      for (const n of t.allChildren()) {
        const t = n.localName,
          i = n.attr('val') ?? n.attr('amt')
        t && e.push(`${t}:${i ?? ''}`)
        for (const r of n.allChildren()) {
          const t = r.localName,
            n = r.attr('val') ?? r.attr('amt')
          t && e.push(`${t}:${n ?? ''}`)
        }
      }
      return e.join('|')
    })(t),
    i = e.colorCache.get(n)
  if (i) return i
  const r = nn(t, e)
  return (e.colorCache.set(n, r), r)
}
function nn(t, e, n) {
  for (const r of t.allChildren()) {
    const t = r.localName,
      i = Je(r)
    switch (t) {
      case 'srgbClr':
        return _e(r.attr('val') || '000000', i)
      case 'schemeClr': {
        const t = r.attr('val') || 'tx1'
        if ('phclr' === t.toLowerCase() && null != n && n.exists()) {
          const t = en(n, e),
            r = _e(t.color.startsWith('#') ? t.color.slice(1) : t.color, i)
          return { color: r.color, alpha: r.alpha * t.alpha }
        }
        return _e(tn(t, e), i)
      }
      case 'sysClr':
        return _e(r.attr('lastClr') || r.attr('val') || '000000', i)
      case 'prstClr':
        return _e(
          (Ke(r.attr('val') || 'black') || '#000000').replace('#', ''),
          i,
        )
      case 'hslClr': {
        const t = Ae(
          (r.numAttr('hue') ?? 0) / 6e4,
          (r.numAttr('sat') ?? 0) / 1e5,
          (r.numAttr('lum') ?? 0) / 1e5,
        )
        return _e(we(t.r, t.g, t.b).replace('#', ''), i)
      }
      case 'scrgbClr':
        return _e(
          we(
            Math.round(((r.numAttr('r') ?? 0) / 1e5) * 255),
            Math.round(((r.numAttr('g') ?? 0) / 1e5) * 255),
            Math.round(((r.numAttr('b') ?? 0) / 1e5) * 255),
          ).replace('#', ''),
          i,
        )
    }
  }
  const i = t.localName
  if ('srgbClr' === i) return _e(t.attr('val') || '000000', Je(t))
  if ('schemeClr' === i) {
    const i = t.attr('val') || 'tx1'
    if ('phclr' === i.toLowerCase() && null != n && n.exists()) {
      const i = en(n, e),
        r = _e(i.color.startsWith('#') ? i.color.slice(1) : i.color, Je(t))
      return { color: r.color, alpha: r.alpha * i.alpha }
    }
    return _e(tn(i, e), Je(t))
  }
  if ('sysClr' === i)
    return _e(t.attr('lastClr') || t.attr('val') || '000000', Je(t))
  if ('prstClr' === i)
    return _e(
      (Ke(t.attr('val') || 'black') || '#000000').replace('#', ''),
      Je(t),
    )
  if ('hslClr' === i) {
    const e = Ae(
      (t.numAttr('hue') ?? 0) / 6e4,
      (t.numAttr('sat') ?? 0) / 1e5,
      (t.numAttr('lum') ?? 0) / 1e5,
    )
    return _e(we(e.r, e.g, e.b).replace('#', ''), Je(t))
  }
  return 'scrgbClr' === i
    ? _e(
        we(
          Math.round(((t.numAttr('r') ?? 0) / 1e5) * 255),
          Math.round(((t.numAttr('g') ?? 0) / 1e5) * 255),
          Math.round(((t.numAttr('b') ?? 0) / 1e5) * 255),
        ).replace('#', ''),
        Je(t),
      )
    : { color: '#000000', alpha: 1 }
}
function rn(t, e) {
  const { color: n, alpha: i } = en(t, e)
  return on(n, i)
}
function on(t, e) {
  const n = t.startsWith('#') ? t : `#${t}`,
    { r: i, g: r, b: o } = Me(n)
  return e >= 1 ? n : `rgba(${i},${r},${o},${e.toFixed(3)})`
}
function ln(t, e, n) {
  return null != n && n.exists() ? nn(t, e, n) : en(t, e)
}
function sn(t, e) {
  const n = t.child('solidFill')
  if (n.exists()) {
    const { color: t, alpha: i } = en(n, e)
    return on(t, i)
  }
  const i = t.child('gradFill')
  if (i.exists()) return dn(i, e)
  if (t.child('blipFill').exists()) return ''
  const r = t.child('pattFill')
  return r.exists()
    ? an(r, e)
    : t.child('grpFill').exists()
      ? e.groupFillNode
        ? sn(e.groupFillNode, e)
        : ''
      : t.child('noFill').exists()
        ? 'transparent'
        : ''
}
function an(t, e, n) {
  const i = t.attr('prst') ?? 'solid'
  let r = '#000000',
    o = '#ffffff'
  const l = t.child('fgClr')
  if (l.exists()) {
    const { color: t, alpha: i } = ln(l, e, n)
    r = on(t, i)
  }
  const s = t.child('bgClr')
  if (s.exists()) {
    const { color: t, alpha: i } = ln(s, e, n)
    o = on(t, i)
  }
  const a = (t) => `${t} 0 0 / 8px 8px, ${o}`,
    d = (t, e) => `${t} 0 0 / 8px 8px, ${e} 0 0 / 8px 8px, ${o}`
  switch (i) {
    case 'solid':
    case 'solidDmnd':
      return r
    case 'pct5':
    case 'pct10':
    case 'pct20':
    case 'pct25':
    case 'dotGrid':
    case 'dotDmnd':
      return a(`radial-gradient(${r} 1px, transparent 1px)`)
    case 'pct30':
    case 'pct40':
    case 'pct50':
      return a(`radial-gradient(${r} 1.5px, transparent 1.5px)`)
    case 'pct60':
    case 'pct70':
    case 'pct75':
    case 'pct80':
    case 'pct90':
      return a(`radial-gradient(${r} 2.5px, transparent 2.5px)`)
    case 'horz':
    case 'ltHorz':
    case 'narHorz':
    case 'dkHorz':
      return a(
        `repeating-linear-gradient(0deg, ${r} 0px, ${r} 1px, transparent 1px, transparent 8px)`,
      )
    case 'vert':
    case 'ltVert':
    case 'narVert':
    case 'dkVert':
      return a(
        `repeating-linear-gradient(90deg, ${r} 0px, ${r} 1px, transparent 1px, transparent 8px)`,
      )
    case 'dnDiag':
    case 'ltDnDiag':
    case 'narDnDiag':
    case 'dkDnDiag':
    case 'wdDnDiag':
      return a(
        `repeating-linear-gradient(45deg, ${r} 0px, ${r} 1px, transparent 1px, transparent 8px)`,
      )
    case 'upDiag':
    case 'ltUpDiag':
    case 'narUpDiag':
    case 'dkUpDiag':
    case 'wdUpDiag':
      return a(
        `repeating-linear-gradient(-45deg, ${r} 0px, ${r} 1px, transparent 1px, transparent 8px)`,
      )
    case 'smGrid':
    case 'lgGrid':
    case 'cross':
      return d(
        `repeating-linear-gradient(0deg, ${r} 0px, ${r} 1px, transparent 1px, transparent 8px)`,
        `repeating-linear-gradient(90deg, ${r} 0px, ${r} 1px, transparent 1px, transparent 8px)`,
      )
    case 'smCheck':
    case 'lgCheck':
    case 'diagCross':
    case 'openDmnd':
      return d(
        `repeating-linear-gradient(45deg, ${r} 0px, ${r} 1px, transparent 1px, transparent 8px)`,
        `repeating-linear-gradient(-45deg, ${r} 0px, ${r} 1px, transparent 1px, transparent 8px)`,
      )
    case 'trellis':
    case 'weave':
      return d(
        `repeating-linear-gradient(45deg, ${r} 0px, ${r} 2px, transparent 2px, transparent 8px)`,
        `repeating-linear-gradient(-45deg, ${r} 0px, ${r} 2px, transparent 2px, transparent 8px)`,
      )
    case 'dashDnDiag':
    case 'dashUpDiag':
    case 'dashHorz':
    case 'dashVert':
      return a(
        `repeating-linear-gradient(${i.includes('Dn') ? '45deg' : i.includes('Up') ? '-45deg' : i.includes('Horz') ? '0deg' : '90deg'}, ${r} 0px, ${r} 3px, transparent 3px, transparent 8px)`,
      )
    case 'sphere':
    case 'shingle':
    case 'plaid':
    case 'divot':
    case 'zigZag':
      return a(`radial-gradient(${r} 2px, transparent 2px)`)
    default:
      return o
  }
}
function dn(t, e, n) {
  const i = t.child('gsLst'),
    r = []
  for (const a of i.children('gs')) {
    const t = 100 * q(a.numAttr('pos') ?? 0),
      { color: i, alpha: o } = ln(a, e, n)
    r.push({ position: t, color: on(i, o) })
  }
  if (0 === r.length) return ''
  r.sort((t, e) => t.position - e.position)
  const o = $n(r),
    l = t.child('lin')
  if (l.exists())
    return `linear-gradient(${((V(l.numAttr('ang') ?? 0) + 90) % 360).toFixed(1)}deg, ${o})`
  const s = t.child('path')
  if (s.exists()) {
    const t = s.attr('path')
    if ('circle' === t || 'shape' === t || 'rect' === t) {
      const e = hn(s),
        { cx: n, cy: i } = pn(e),
        o = $n(mn({ stops: r, cx: n, cy: i, fillToRect: e }))
      return 'rect' === t
        ? `radial-gradient(closest-side at ${(100 * n).toFixed(1)}% ${(100 * i).toFixed(1)}%, ${o})`
        : `radial-gradient(ellipse at ${(100 * n).toFixed(1)}% ${(100 * i).toFixed(1)}%, ${o})`
    }
  }
  return `linear-gradient(180deg, ${o})`
}
function cn(t, e, n) {
  let i = H(t.numAttr('w') ?? 0),
    r = 'transparent'
  const o = t.child('solidFill')
  if (o.exists()) {
    const t = o.child('schemeClr')
    if (
      t.exists() &&
      'phclr' === (t.attr('val') ?? '').toLowerCase() &&
      n &&
      n.exists()
    ) {
      const i = en(n, e),
        o = _e(i.color.startsWith('#') ? i.color.slice(1) : i.color, Je(t))
      r = on(o.color, o.alpha * i.alpha)
    } else {
      const t = en(o, e)
      r = on(t.color, t.alpha)
    }
  } else if (n && n.exists() && (n.numAttr('idx') ?? 0) > 0) {
    const t = n.numAttr('idx') ?? 0
    if (t > 0 && e.theme.lineStyles && e.theme.lineStyles.length >= t) {
      const o = e.theme.lineStyles[t - 1]
      0 === i && (i = H(o.numAttr('w') ?? 0))
      const l = en(n, e)
      r = on(l.color, l.alpha)
    } else {
      const o = en(n, e)
      ;((r = on(o.color, o.alpha)), 0 === i && t > 0 && (i = 0.75 * t))
    }
  }
  if (0 === i && n && n.exists()) {
    const t = n.numAttr('idx') ?? 0
    t > 0 && e.theme.lineStyles && e.theme.lineStyles.length >= t
      ? (i = H(e.theme.lineStyles[t - 1].numAttr('w') ?? 0))
      : t > 0 && (i = 0.75 * t)
  }
  0 === i && 'transparent' !== r && !t.child('noFill').exists() && (i = 1)
  let l = 'solid',
    s = 'solid'
  const a = t.child('prstDash')
  if (a.exists()) {
    const t = a.attr('val') || 'solid'
    ;((s = t), (l = un(t)))
  }
  if ('solid' === l && n && n.exists()) {
    const t = n.numAttr('idx') ?? 0
    if (t > 0 && e.theme.lineStyles && e.theme.lineStyles.length >= t) {
      const n = e.theme.lineStyles[t - 1].child('prstDash')
      n.exists() && ((s = n.attr('val') || 'solid'), (l = un(s)))
    }
  }
  return { width: i, color: r, dash: l, dashKind: s }
}
function un(t) {
  switch (t) {
    case 'solid':
    default:
      return 'solid'
    case 'dot':
    case 'sysDot':
      return 'dotted'
    case 'dash':
    case 'sysDash':
    case 'lgDash':
    case 'dashDot':
    case 'lgDashDot':
    case 'lgDashDotDot':
    case 'sysDashDot':
    case 'sysDashDotDot':
      return 'dashed'
  }
}
function hn(t) {
  const e = t.child('fillToRect')
  if (e.exists())
    return {
      l: (e.numAttr('l') ?? 0) / 1e5,
      t: (e.numAttr('t') ?? 0) / 1e5,
      r: (e.numAttr('r') ?? 0) / 1e5,
      b: (e.numAttr('b') ?? 0) / 1e5,
    }
}
function pn(t) {
  return t
    ? { cx: (t.l + (1 - t.r)) / 2, cy: (t.t + (1 - t.b)) / 2 }
    : { cx: 0.5, cy: 0.5 }
}
function fn(t) {
  return Math.max(0, Math.min(1, t))
}
function mn(t, e = {}) {
  const n = (function (t, e = {}) {
    const n = t.fillToRect
    if (!n) return 0
    const i = Math.max(0, 1 - n.l - n.r),
      r = Math.max(0, 1 - n.t - n.b)
    if (i <= 0 && r <= 0) return 0
    const o = t.cx ?? 0.5,
      l = t.cy ?? 0.5,
      s = Math.max(Math.abs(o), Math.abs(1 - o)),
      a = Math.max(Math.abs(l), Math.abs(1 - l))
    if ('x' === e.axis) return s > 0 ? fn(i / 2 / s) : 0
    if ('y' === e.axis) return a > 0 ? fn(r / 2 / a) : 0
    const d = e.width ?? 1,
      c = e.height ?? 1,
      u = Math.hypot((i / 2) * d, (r / 2) * c),
      h = Math.hypot(s * d, a * c)
    return h > 0 ? fn(u / h) : 0
  })(t, e)
  return n <= 0
    ? t.stops
    : t.stops.map((t) => ({ ...t, position: 100 * n + t.position * (1 - n) }))
}
function $n(t) {
  return t.map((t) => `${t.color} ${t.position.toFixed(1)}%`).join(', ')
}
function gn(t, e, n) {
  const i = t.child('gsLst'),
    r = []
  for (const s of i.children('gs')) {
    const t = 100 * q(s.numAttr('pos') ?? 0),
      { color: i, alpha: o } = ln(s, e, n)
    r.push({ position: t, color: on(i, o) })
  }
  if (0 === r.length) return null
  r.sort((t, e) => t.position - e.position)
  const o = t.child('lin')
  if (o.exists())
    return {
      type: 'linear',
      stops: r,
      angle: V(o.numAttr('ang') ?? 0),
      colorInterpolation: 'linearRGB',
    }
  const l = t.child('path')
  if (l.exists()) {
    const t = l.attr('path')
    if ('circle' === t || 'shape' === t || 'rect' === t) {
      const e = hn(l),
        { cx: n, cy: i } = pn(e)
      return {
        type: 'radial',
        stops: r,
        angle: 0,
        cx: n,
        cy: i,
        pathType: t,
        fillToRect: e,
        colorInterpolation: 'linearRGB',
      }
    }
  }
  return { type: 'linear', stops: r, angle: 0, colorInterpolation: 'linearRGB' }
}
function yn(t, e) {
  let n = t.child('gradFill')
  return (
    !n.exists() &&
      t.child('grpFill').exists() &&
      e.groupFillNode &&
      (n = e.groupFillNode.child('gradFill')),
    n.exists() ? gn(n, e) : null
  )
}
function xn(t, e) {
  const n = t.numAttr('idx') ?? 0
  return vn(t, e, e.theme.fillStyles, n)
}
function vn(t, e, n, i) {
  if (i <= 0 || ((null == n ? void 0 : n.length) ?? 0) < i)
    return { fillCss: rn(t, e), gradientFillData: null }
  const r = null == n ? void 0 : n[i - 1]
  if (null == r || !r.exists())
    return { fillCss: rn(t, e), gradientFillData: null }
  if ('solidFill' === r.localName) {
    const n = ln(r, e, t)
    return { fillCss: on(n.color, n.alpha), gradientFillData: null }
  }
  return 'gradFill' === r.localName
    ? { fillCss: dn(r, e, t), gradientFillData: gn(r, e, t) }
    : 'pattFill' === r.localName
      ? { fillCss: an(r, e, t), gradientFillData: null }
      : 'noFill' === r.localName
        ? { fillCss: 'transparent', gradientFillData: null }
        : { fillCss: rn(t, e), gradientFillData: null }
}
var bn = new Set(['http:', 'https:', 'mailto:']),
  Mn = new Set(['http:', 'https:'])
function wn(t) {
  try {
    return new URL(t).protocol.toLowerCase()
  } catch {
    return
  }
}
function kn(t) {
  const e = wn(t)
  return void 0 !== e && bn.has(e)
}
function An(t) {
  const e = wn(t)
  return void 0 !== e && Mn.has(e)
}
function Ln(t, e) {
  if (!(e > 0)) return t
  const n = t.trim()
  if (!n) return 100 / e + '%'
  if (n.length > 128) return t
  const i = (function (t) {
    let e = 0
    ;('-' === t[e] || '+' === t[e]) && e++
    let n = 0
    for (; Fn(t.charCodeAt(e));) (e++, n++)
    if ('.' === t[e]) for (e++; Fn(t.charCodeAt(e));) (e++, n++)
    if (0 === n) return null
    if ('e' === t[e] || 'E' === t[e]) {
      const n = e
      ;(e++, ('-' === t[e] || '+' === t[e]) && e++)
      let i = 0
      for (; Fn(t.charCodeAt(e));) (e++, i++)
      0 === i && (e = n)
    }
    const i = Number(t.slice(0, e))
    if (!Number.isFinite(i)) return null
    const r = t.slice(e)
    return (function (t) {
      if (!t || '%' === t) return !0
      for (let e = 0; e < t.length; e++) if (!Bn(t.charCodeAt(e))) return !1
      return !0
    })(r)
      ? { value: i, unit: r }
      : null
  })(n)
  return i ? `${i.value / e}${i.unit || '%'}` : t
}
function Sn(t) {
  const e = (function (t) {
    let e = 0
    for (let n = t.length - 1; n >= 0; n--) {
      const i = t[n]
      if (')' === i) e++
      else if ('(' === i) e > 0 && e--
      else if (',' === i && 0 === e) return n
    }
    return -1
  })(t)
  if (e < 0) return null
  const n = t.slice(e + 1).trim()
  return (function (t) {
    if (!t) return !1
    if ('#' === t[0]) {
      const e = t.length - 1
      if (![3, 4, 6, 8].includes(e)) return !1
      for (let n = 1; n < t.length; n++) if (!jn(t.charCodeAt(n))) return !1
      return !0
    }
    const e = t.toLowerCase()
    if (e.startsWith('rgb(') || e.startsWith('rgba('))
      return t.endsWith(')') && !t.slice(0, -1).includes(')')
    for (let n = 0; n < t.length; n++) if (!Bn(t.charCodeAt(n))) return !1
    return !0
  })(n)
    ? { imageLayers: Cn(t.slice(0, e)), color: n }
    : null
}
function Cn(t) {
  return t.split('0 0 / 8px 8px').join('').trimEnd()
}
function Fn(t) {
  return t >= 48 && t <= 57
}
function Bn(t) {
  return (t >= 65 && t <= 90) || (t >= 97 && t <= 122)
}
function jn(t) {
  return Fn(t) || (t >= 65 && t <= 70) || (t >= 97 && t <= 102)
}
var En = 0
function Pn(t, e, n, i) {
  return `rgb(${Math.round(t * i + 255 * (1 - i))},${Math.round(e * i + 255 * (1 - i))},${Math.round(n * i + 255 * (1 - i))})`
}
function Tn(t, e) {
  if (e.includes('gradient') && e.includes(' 0 0 / ')) {
    const n = Sn(e)
    if (n)
      return (
        (t.style.backgroundImage = n.imageLayers),
        (t.style.backgroundSize = '8px 8px'),
        (t.style.backgroundRepeat = 'repeat'),
        void (t.style.backgroundColor = n.color)
      )
  }
  e.includes('gradient') || e.startsWith('url(') || e.includes('repeating-')
    ? (t.style.background = e)
    : (t.style.backgroundColor = e)
}
function zn(t, e) {
  for (const n of e) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
    ;(e.setAttribute('offset', `${n.position}%`),
      e.setAttribute('stop-color', n.color),
      t.appendChild(e))
  }
}
function Nn(t, e, n, i) {
  const r = 'http://www.w3.org/2000/svg',
    o = document.createElementNS(r, 'svg')
  ;(o.setAttribute('data-pptx-background-gradient', 'true'),
    o.setAttribute('viewBox', `0 0 ${n} ${i}`),
    o.setAttribute('width', '100%'),
    o.setAttribute('height', '100%'),
    (o.style.position = 'absolute'),
    (o.style.left = '0'),
    (o.style.top = '0'),
    (o.style.width = '100%'),
    (o.style.height = '100%'),
    (o.style.pointerEvents = 'none'),
    (o.style.display = 'block'))
  const l = document.createElementNS(r, 'defs')
  o.appendChild(l)
  const s = 'bg-grad-' + ++En
  if ('radial' === e.type && 'rect' === e.pathType) {
    const t = e.cx ?? 0.5,
      a = e.cy ?? 0.5,
      d = (t, n) => {
        const i = mn(e, { axis: n }),
          r = []
        for (const e of i) {
          const n = e.position / 100
          ;(r.push({ offset: t - n * t, color: e.color }),
            r.push({ offset: t + n * (1 - t), color: e.color }))
        }
        return r.sort((t, e) => t.offset - e.offset)
      },
      c = `${s}-h`,
      u = document.createElementNS(r, 'linearGradient')
    ;(u.setAttribute('id', c),
      u.setAttribute(
        'color-interpolation',
        e.colorInterpolation ?? 'linearRGB',
      ),
      u.setAttribute('x1', '0%'),
      u.setAttribute('y1', '0%'),
      u.setAttribute('x2', '100%'),
      u.setAttribute('y2', '0%'))
    for (const e of d(t, 'x')) {
      const t = document.createElementNS(r, 'stop')
      ;(t.setAttribute('offset', `${(100 * e.offset).toFixed(2)}%`),
        t.setAttribute('stop-color', e.color),
        u.appendChild(t))
    }
    l.appendChild(u)
    const h = `${s}-v`,
      p = document.createElementNS(r, 'linearGradient')
    ;(p.setAttribute('id', h),
      p.setAttribute(
        'color-interpolation',
        e.colorInterpolation ?? 'linearRGB',
      ),
      p.setAttribute('x1', '0%'),
      p.setAttribute('y1', '0%'),
      p.setAttribute('x2', '0%'),
      p.setAttribute('y2', '100%'))
    for (const e of d(a, 'y')) {
      const t = document.createElementNS(r, 'stop')
      ;(t.setAttribute('offset', `${(100 * e.offset).toFixed(2)}%`),
        t.setAttribute('stop-color', e.color),
        p.appendChild(t))
    }
    l.appendChild(p)
    const f = document.createElementNS(r, 'g')
    f.setAttribute('style', 'isolation: isolate')
    const m = document.createElementNS(r, 'rect')
    ;(m.setAttribute('width', String(n)),
      m.setAttribute('height', String(i)),
      m.setAttribute('fill', 'black'),
      f.appendChild(m))
    for (const e of [c, h]) {
      const t = document.createElementNS(r, 'rect')
      ;(t.setAttribute('width', String(n)),
        t.setAttribute('height', String(i)),
        t.setAttribute('fill', `url(#${e})`),
        t.setAttribute('style', 'mix-blend-mode: lighten'),
        f.appendChild(t))
    }
    o.appendChild(f)
  } else if ('radial' === e.type) {
    const t = document.createElementNS(r, 'radialGradient')
    ;(t.setAttribute('id', s),
      t.setAttribute(
        'color-interpolation',
        e.colorInterpolation ?? 'linearRGB',
      ),
      t.setAttribute('gradientUnits', 'userSpaceOnUse'))
    const a = e.cx ?? 0.5,
      d = e.cy ?? 0.5
    ;(t.setAttribute('cx', String(a * n)), t.setAttribute('cy', String(d * i)))
    const c = Math.max(a, 1 - a),
      u = Math.max(d, 1 - d)
    ;(t.setAttribute('r', String(Math.hypot(c * n, u * i))),
      zn(t, mn(e, { width: n, height: i })),
      l.appendChild(t))
    const h = document.createElementNS(r, 'rect')
    ;(h.setAttribute('width', String(n)),
      h.setAttribute('height', String(i)),
      h.setAttribute('fill', `url(#${s})`),
      o.appendChild(h))
  } else {
    const t = document.createElementNS(r, 'linearGradient')
    ;(t.setAttribute('id', s),
      t.setAttribute(
        'color-interpolation',
        e.colorInterpolation ?? 'linearRGB',
      ),
      t.setAttribute('gradientUnits', 'userSpaceOnUse'))
    const a = (function (t) {
      const e = (t * Math.PI) / 180
      return {
        x1: 50 - 50 * Math.cos(e),
        y1: 50 - 50 * Math.sin(e),
        x2: 50 + 50 * Math.cos(e),
        y2: 50 + 50 * Math.sin(e),
      }
    })(e.angle)
    ;(t.setAttribute('x1', String((a.x1 / 100) * n)),
      t.setAttribute('y1', String((a.y1 / 100) * i)),
      t.setAttribute('x2', String((a.x2 / 100) * n)),
      t.setAttribute('y2', String((a.y2 / 100) * i)),
      zn(t, e.stops),
      l.appendChild(t))
    const d = document.createElementNS(r, 'rect')
    ;(d.setAttribute('width', String(n)),
      d.setAttribute('height', String(i)),
      d.setAttribute('fill', `url(#${s})`),
      o.appendChild(d))
  }
  ;(t.style.position || (t.style.position = 'relative'),
    (t.style.background = ''),
    t
      .querySelectorAll('svg[data-pptx-background-gradient="true"]')
      .forEach((t) => {
        t.remove()
      }),
    t.insertBefore(o, t.firstChild))
}
function Rn(t, e, n) {
  return (
    !(null == t || !t.pathType) &&
    (Nn(n, t, e.presentation.width, e.presentation.height), !0)
  )
}
function In(t, e) {
  let n,
    i = t.slide.rels
  if (
    (t.slide.background
      ? ((n = t.slide.background), (i = t.slide.rels))
      : t.layout.background
        ? ((n = t.layout.background), (i = t.layout.rels))
        : t.master.background &&
          ((n = t.master.background), (i = t.master.rels)),
    !n)
  )
    return void (e.style.backgroundColor = '#FFFFFF')
  const r = n.child('bgPr')
  if (r.exists())
    return void (function (t, e, n, i) {
      const r = t.child('solidFill')
      if (r.exists()) {
        const { color: t, alpha: i } = en(r, e),
          o = t.startsWith('#') ? t : `#${t}`
        if (i < 1) {
          const { r: t, g: e, b: r } = Me(o)
          n.style.backgroundColor = Pn(t, e, r, i)
        } else n.style.backgroundColor = o
        return
      }
      if (t.child('gradFill').exists()) {
        if (
          (function (t, e, n) {
            return Rn(yn(t, e), e, n)
          })(t, e, n)
        )
          return
        const i = sn(t, e)
        return void (i && (n.style.background = i))
      }
      if (t.child('pattFill').exists()) {
        const i = sn(t, e)
        return void (i && Tn(n, i))
      }
      const o = t.child('blipFill')
      if (o.exists())
        return void (function (t, e, n, i) {
          var r
          const o = t.child('blip'),
            l = o.attr('embed') ?? o.attr('r:embed'),
            s = o.attr('link') ?? o.attr('r:link'),
            a = l ?? s
          if (!a) return
          const d = (i ?? e.slide.rels).get(a)
          if (!d) return
          let c
          if (G(d.targetMode)) {
            if (!An(d.target)) return
            c = d.target
          } else {
            const i = C(d.target, e.presentation.media)
            if (!i) {
              if (e.presentation.mediaResolver) {
                const i = F(
                  d.target,
                  e.presentation.media,
                  e.presentation.mediaResolver,
                )
                  .then((i) => {
                    var r
                    ;(null != (r = e.signal) && r.aborted) ||
                      !i ||
                      Dn(t, n, B(i.mediaPath, i.data, e.mediaUrlCache))
                  })
                  .catch(() => {})
                ;(null == (r = e.asyncTasks) || r.push(i), e.asyncTasks)
              }
              return
            }
            const { mediaPath: o, data: l } = i
            c = B(o, l, e.mediaUrlCache)
          }
          Dn(t, n, c)
        })(o, e, n, i)
      if (t.child('noFill').exists()) n.style.backgroundColor = '#FFFFFF'
    })(r, t, e, i)
  const o = n.child('bgRef')
  o.exists()
    ? (function (t, e, n) {
        var i, r
        const o = t.numAttr('idx') ?? 0
        if (
          (o >= 1001 &&
            o - 1e3 <=
              ((null == (i = e.theme.bgFillStyles) ? void 0 : i.length) ??
                0)) ||
          (o > 0 &&
            o <= ((null == (r = e.theme.fillStyles) ? void 0 : r.length) ?? 0))
        ) {
          const { fillCss: i, gradientFillData: r } = (function (t, e) {
            const n = t.numAttr('idx') ?? 0
            return n >= 1001
              ? vn(t, e, e.theme.bgFillStyles ?? [], n - 1e3)
              : vn(t, e, e.theme.fillStyles, n)
          })(t, e)
          if (Rn(r, e, n)) return
          return void Tn(n, i)
        }
        const { color: l, alpha: s } = en(t, e)
        if (l && '#000000' !== l) {
          const t = l.startsWith('#') ? l : `#${l}`
          if (s < 1) {
            const { r: e, g: i, b: r } = Me(t)
            n.style.backgroundColor = Pn(e, i, r, s)
          } else n.style.backgroundColor = t
        } else n.style.backgroundColor = '#FFFFFF'
      })(o, t, e)
    : (e.style.backgroundColor = '#FFFFFF')
}
function Dn(t, e, n) {
  const i = (function (t) {
    let e = 1
    const n = t.child('alphaModFix')
    n.exists() && (e *= (n.numAttr('amt') ?? 1e5) / 1e5)
    const i = t.child('alphaMod')
    i.exists() && (e *= (i.numAttr('val') ?? 1e5) / 1e5)
    const r = t.child('alphaOff')
    return (
      r.exists() && (e += (r.numAttr('val') ?? 0) / 1e5),
      Math.max(0, Math.min(1, e))
    )
  })(t.child('blip'))
  if (i < 1 || t.child('srcRect').exists())
    return void (function (t, e, n, i) {
      ;(e.style.position || (e.style.position = 'relative'),
        (e.style.backgroundImage = ''),
        e
          .querySelectorAll('[data-pptx-background-image="true"]')
          .forEach((t) => {
            t.remove()
          }))
      const r = document.createElement('div')
      ;(r.setAttribute('data-pptx-background-image', 'true'),
        (r.style.position = 'absolute'),
        (r.style.pointerEvents = 'none'),
        (r.style.opacity = `${Number(i.toFixed(4))}`))
      const o = t.child('stretch')
      !(function (t, e) {
        const n = (function (t) {
          if (!t.exists()) return { left: 0, top: 0, width: 100, height: 100 }
          const e = On(t, 'l'),
            n = On(t, 't'),
            i = On(t, 'r'),
            r = On(t, 'b')
          return { left: e, top: n, width: 100 - e - i, height: 100 - n - r }
        })(e)
        ;((t.style.left = `${n.left}%`),
          (t.style.top = `${n.top}%`),
          (t.style.width = `${n.width}%`),
          (t.style.height = `${n.height}%`))
      })(r, o.exists() ? o.child('fillRect') : new U(null))
      const l = t.child('srcRect')
      if (l.exists()) {
        r.style.overflow = 'hidden'
        const t = document.createElement('div')
        return (
          t.setAttribute('data-pptx-background-crop', 'true'),
          (t.style.position = 'absolute'),
          (t.style.backgroundImage = `url("${n}")`),
          (t.style.backgroundSize = '100% 100%'),
          (t.style.backgroundRepeat = 'no-repeat'),
          (function (t, e) {
            const n = On(e, 'l') / 100,
              i = On(e, 't') / 100,
              r = On(e, 'r') / 100,
              o = On(e, 'b') / 100,
              l = 1 - n - r,
              s = 1 - i - o
            if (l <= 0.001 || s <= 0.001)
              return (
                (t.style.left = '0%'),
                (t.style.top = '0%'),
                (t.style.width = '100%'),
                void (t.style.height = '100%')
              )
            const a = 1 / l,
              d = 1 / s
            ;((t.style.left = -n * a * 100 + '%'),
              (t.style.top = -i * d * 100 + '%'),
              (t.style.width = 100 * a + '%'),
              (t.style.height = 100 * d + '%'))
          })(t, l),
          r.appendChild(t),
          void e.insertBefore(r, e.firstChild)
        )
      }
      ;((r.style.backgroundImage = `url("${n}")`),
        o.exists() &&
          ((r.style.backgroundSize = '100% 100%'),
          (r.style.backgroundRepeat = 'no-repeat')),
        t.child('tile').exists() &&
          ((r.style.backgroundRepeat = 'repeat'),
          (r.style.backgroundSize = 'auto')),
        e.insertBefore(r, e.firstChild))
    })(t, e, n, i)
  e.style.backgroundImage = `url("${n}")`
  const r = t.child('stretch')
  ;(r.exists() &&
    ((function (t, e) {
      if (!e.exists())
        return (
          (t.style.backgroundSize = '100% 100%'),
          void (t.style.backgroundPosition = '')
        )
      const n = On(e, 'l'),
        i = On(e, 't'),
        r = On(e, 'r'),
        o = On(e, 'b'),
        l = 100 - n - r,
        s = 100 - i - o
      ;((t.style.backgroundSize = `${l}% ${s}%`),
        (t.style.backgroundPosition = `${Un(n, r)}% ${Un(i, o)}%`))
    })(e, r.child('fillRect')),
    (e.style.backgroundRepeat = 'no-repeat')),
    t.child('tile').exists() &&
      ((e.style.backgroundRepeat = 'repeat'),
      (e.style.backgroundSize = 'auto')))
}
function On(t, e) {
  return (t.numAttr(e) ?? 0) / 1e3
}
function Un(t, e) {
  const n = t + e
  return Math.abs(n) < 1e-4 ? 0 : (t / n) * 100
}
var Zn = 0
function Gn(t, e, n) {
  return Math.min(n, Math.max(e, t))
}
function Xn(t) {
  return (((t / 6e4) % 360) + 360) % 360
}
function Yn(t) {
  const e = Math.abs(t) < 5e-5 ? 0 : Number(t.toFixed(4))
  return String(e)
}
function Wn(t, e) {
  return { x: t.a * e.x + t.c * e.y + t.e, y: t.b * e.x + t.d * e.y + t.f }
}
function Hn(t, e, n) {
  const i = t.cloneNode(!0)
  return (
    (i.dataset.pptxReflectionSource = 'true'),
    i.setAttribute('aria-hidden', 'true'),
    (i.style.position = 'absolute'),
    (i.style.left = '0'),
    (i.style.top = '0'),
    (i.style.width = `${Yn(e)}px`),
    (i.style.height = `${Yn(n)}px`),
    (i.style.pointerEvents = 'none'),
    i.style.removeProperty('-webkit-box-reflect'),
    (function (t) {
      const e = '-reflection-' + ++Zn,
        n = [t, ...Array.from(t.querySelectorAll('[id]'))],
        i = new Map()
      for (const r of n) {
        const t = r.id
        if (!t) continue
        const n = `${t}${e}`
        ;(i.set(t, n), (r.id = n))
      }
      if (0 !== i.size)
        for (const r of [t, ...Array.from(t.querySelectorAll('*'))])
          for (const t of Array.from(r.attributes)) {
            let e = t.value.replace(/url\(#([^)]+)\)/g, (t, e) => {
              const n = i.get(e)
              return n ? `url(#${n})` : t
            })
            if (e.startsWith('#')) {
              const t = i.get(e.slice(1))
              t && (e = `#${t}`)
            }
            e !== t.value && r.setAttribute(t.name, e)
          }
    })(i),
    i
  )
}
function Vn(t, e, n) {
  const i = Math.max(0, n.w),
    r = Math.max(0, n.h)
  if (!e.exists() || 0 === i || 0 === r) return
  const o = Gn(H(e.numAttr('blurRad') ?? 0), 0, 512),
    l = Gn((e.numAttr('stA') ?? 1e5) / 1e5, 0, 1),
    s = Gn((e.numAttr('stPos') ?? 0) / 1e3, 0, 100),
    a = Gn((e.numAttr('endA') ?? 0) / 1e5, 0, 1),
    d = Gn((e.numAttr('endPos') ?? 1e5) / 1e3, 0, 100),
    c = Math.max(0, H(e.numAttr('dist') ?? 0)),
    u = Xn(e.numAttr('dir') ?? 0),
    h = Xn(e.numAttr('fadeDir') ?? 54e5),
    p = Gn((e.numAttr('sx') ?? 1e5) / 1e5, -16, 16),
    f = Gn((e.numAttr('sy') ?? 1e5) / 1e5, -16, 16),
    m = Gn(Math.tan((Xn(e.numAttr('kx') ?? 0) * Math.PI) / 180), -16, 16),
    $ = Gn(Math.tan((Xn(e.numAttr('ky') ?? 0) * Math.PI) / 180), -16, 16),
    g = (function (t, e, n) {
      return {
        x:
          t.endsWith('l') || 'l' === t
            ? 0
            : t.endsWith('r') || 'r' === t
              ? e
              : e / 2,
        y:
          t.startsWith('t') || 't' === t
            ? 0
            : t.startsWith('b') || 'b' === t
              ? n
              : n / 2,
      }
    })((e.attr('algn') ?? 'b').toLowerCase(), i, r),
    y = (u * Math.PI) / 180,
    x = c * Math.cos(y),
    v = c * Math.sin(y),
    b = {
      a: p,
      b: $,
      c: m,
      d: f,
      e: g.x + x - p * g.x - m * g.y,
      f: g.y + v - $ * g.x - f * g.y,
    },
    M = [
      Wn(b, { x: 0, y: 0 }),
      Wn(b, { x: i, y: 0 }),
      Wn(b, { x: 0, y: r }),
      Wn(b, { x: i, y: r }),
    ],
    w = Math.min(...M.map((t) => t.x)),
    k = Math.max(...M.map((t) => t.x)),
    A = Math.min(...M.map((t) => t.y)),
    L = Math.max(...M.map((t) => t.y)),
    S = document.createElement('div')
  ;((S.dataset.pptxReflectionLayer = 'true'),
    S.setAttribute('aria-hidden', 'true'),
    (S.style.position = 'absolute'),
    (S.style.left = `${Yn(w)}px`),
    (S.style.top = `${Yn(A)}px`),
    (S.style.width = `${Yn(Math.max(0, k - w))}px`),
    (S.style.height = `${Yn(Math.max(0, L - A))}px`),
    (S.style.overflow = 'visible'),
    (S.style.pointerEvents = 'none'),
    o > 0 && (S.style.filter = `blur(${Yn(o)}px)`))
  const C = (h + 90) % 360,
    F = Hn(t, i, r)
  return (
    (F.style.transformOrigin = '0 0'),
    (F.style.transform = `matrix(${Yn(b.a)}, ${Yn(b.b)}, ${Yn(b.c)}, ${Yn(b.d)}, ${Yn(b.e - w)}, ${Yn(b.f - A)})`),
    (function (t, e) {
      ;(t.style.setProperty('-webkit-mask-image', e),
        t.style.setProperty('mask-image', e),
        t.style.setProperty('-webkit-mask-repeat', 'no-repeat'),
        t.style.setProperty('mask-repeat', 'no-repeat'),
        t.style.setProperty('-webkit-mask-size', '100% 100%'),
        t.style.setProperty('mask-size', '100% 100%'))
    })(
      S,
      (function (t, e, n, i, r) {
        return `linear-gradient(${Yn(t)}deg, rgba(255,255,255,${e.toFixed(3)}) ${n.toFixed(1)}%, rgba(255,255,255,${i.toFixed(3)}) ${r.toFixed(1)}%)`
      })(C, l, s, a, d),
    ),
    S.appendChild(F),
    t.insertBefore(S, t.firstChild),
    S
  )
}
function qn(t, e) {
  var n, i
  const r =
    null == (n = null == t ? void 0 : t.bodyProperties) ? void 0 : n.child(e)
  if (null != r && r.exists()) return r
  const o = ['noAutofit', 'normAutofit', 'spAutoFit']
  if (
    o.includes(e) &&
    o.some((e) => {
      var n
      return null == (n = null == t ? void 0 : t.bodyProperties)
        ? void 0
        : n.child(e).exists()
    })
  )
    return
  const l =
    null == (i = null == t ? void 0 : t.layoutBodyProperties)
      ? void 0
      : i.child(e)
  return null != l && l.exists() ? l : void 0
}
function _n(t) {
  if (void 0 === t || '' === t.trim()) return
  const e = t.trim(),
    n = e.endsWith('%'),
    i = Number(n ? e.slice(0, -1) : e)
  return Number.isFinite(i) ? i / (n ? 100 : 1e5) : void 0
}
var Qn = /^\+(mj|mn)-(lt|ea|cs)$/,
  Kn = { lt: 'latin', ea: 'ea', cs: 'cs' },
  Jn = ['Hans', 'Hant', 'Jpan', 'Hang']
function ti(t) {
  const e = t.toLowerCase()
  return e.startsWith('zh')
    ? /-(tw|hk|mo)\b/.test(e)
      ? 'Hant'
      : 'Hans'
    : e.startsWith('ja')
      ? 'Jpan'
      : e.startsWith('ko')
        ? 'Hang'
        : e.startsWith('ar')
          ? 'Arab'
          : e.startsWith('he')
            ? 'Hebr'
            : e.startsWith('th')
              ? 'Thai'
              : e.startsWith('hi') || e.startsWith('mr') || e.startsWith('ne')
                ? 'Deva'
                : void 0
}
function ei(t, e) {
  if (t) {
    for (const n of (function (t) {
      return Array.isArray(t)
        ? t.filter((t) => 'string' == typeof t && t.length > 0)
        : 'string' == typeof t && t.length > 0
          ? [t]
          : []
    })(e)) {
      const e = ti(n)
      if (e && t[e]) return t[e]
    }
    for (const e of Jn) if (t[e]) return t[e]
  }
}
function ni(t, e, n) {
  const i = t.match(Qn)
  if (!i) return t
  const r = i[1],
    o = i[2],
    l = 'mj' === r ? e.theme.majorFont : e.theme.minorFont,
    s = l[Kn[o]]
  if (s) return s
  if ('ea' === o) {
    const t = ei(l.scripts, n)
    if (t) return t
  }
  return l.latin || l.ea || l.cs || t
}
function ii(t, e, n) {
  var i, r
  const o = new Set(),
    l = []
  for (const s of t) {
    if (!s) continue
    const t = ni(s, e, n).trim(),
      a =
        null == (i = e.presentation.embeddedFontFamilies)
          ? void 0
          : i.get(t.toLowerCase())
    a && (null == (r = e.usedEmbeddedFontFamilies) || r.add(a))
    for (const e of a ? [a, t] : [t]) {
      const t = e.toLowerCase()
      !e || o.has(t) || (o.add(t), l.push(e))
    }
  }
  return l
}
var ri = new Set([
    'serif',
    'sans-serif',
    'monospace',
    'cursive',
    'fantasy',
    'system-ui',
    'ui-serif',
    'ui-sans-serif',
    'ui-monospace',
    'emoji',
    'math',
    'fangsong',
  ]),
  oi = [
    'PingFang SC',
    'Hiragino Sans GB',
    'Noto Sans CJK SC',
    'Source Han Sans SC',
    'Arial Unicode MS',
    'sans-serif',
  ],
  li = new Set([
    'microsoft yahei',
    'microsoft yahei ui',
    '微软雅黑',
    'dengxian',
    '等线',
    'simhei',
    '黑体',
    'heiti sc',
  ]),
  si = {
    calibri: [
      'Calibri',
      'Aptos',
      'Carlito',
      'system-ui',
      'Arial',
      'Helvetica',
      'sans-serif',
    ],
    'calibri light': [
      'Calibri Light',
      'Aptos Display',
      'Aptos',
      'Carlito',
      'system-ui',
      'Arial',
      'Helvetica',
      'sans-serif',
    ],
    aptos: ['Aptos', 'system-ui', 'Arial', 'Helvetica', 'sans-serif'],
    'aptos display': [
      'Aptos Display',
      'Aptos',
      'system-ui',
      'Arial',
      'Helvetica',
      'sans-serif',
    ],
    'microsoft yahei': ['Microsoft YaHei', '微软雅黑'],
    'microsoft yahei ui': ['Microsoft YaHei UI', 'Microsoft YaHei', '微软雅黑'],
    微软雅黑: ['微软雅黑', 'Microsoft YaHei'],
    dengxian: ['DengXian', '等线'],
    等线: ['等线', 'DengXian'],
    simhei: ['SimHei', '黑体'],
    黑体: ['黑体', 'SimHei'],
    'heiti sc': ['Heiti SC', '黑体', 'SimHei'],
  }
function ai(t) {
  return t
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .toLowerCase()
}
function di(t) {
  const e = ai(t)
  return ri.has(e)
    ? e
    : `"${t.trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}
function ci(t) {
  return si[ai(t)] ?? [t.trim()]
}
function ui(t) {
  const e = Array.isArray(t) ? t.flatMap(ci) : ci(t),
    n = e.some((t) => li.has(ai(t))) ? [...e, ...oi] : e,
    i = new Set()
  return n
    .filter((t) => {
      const e = ai(t)
      return !i.has(e) && (i.add(e), !0)
    })
    .map(di)
    .join(', ')
}
function hi(t) {
  const e = t.search(/[?#]/)
  return e >= 0 ? t.slice(0, e) : t
}
function pi(t) {
  return hi(t).replace(/\\/g, '/').replace(/^\/+/, '')
}
function fi(t) {
  const e = t.slide.index
  if (e >= 0 && e < t.presentation.slides.length) return e
  const n = pi(t.slide.slidePath || ''),
    i = t.presentation.slides.findIndex((t) => pi(t.slidePath || '') === n)
  return i >= 0 ? i : 0
}
function mi(t) {
  try {
    return decodeURIComponent(t.replace(/\+/g, ' '))
  } catch {
    return t
  }
}
function $i(t, e) {
  var n
  const i = e.match(/^ppaction:\/\/hlinkshowjump\?(.+)$/i)
  if (!i) return
  const r =
      null ==
      (n = (function (t, e) {
        const n = e.toLowerCase()
        for (const i of t.split('&')) {
          const [t, ...e] = i.split('=')
          if (mi(t).toLowerCase() === n) return mi(e.join('='))
        }
      })(i[1], 'jump'))
        ? void 0
        : n.toLowerCase(),
    o = t.presentation.slides.length
  if (0 !== o)
    switch (r) {
      case 'firstslide':
        return 0
      case 'lastslide':
        return o - 1
      case 'nextslide': {
        const e = fi(t) + 1
        return e < o ? e : void 0
      }
      case 'previousslide': {
        const e = fi(t) - 1
        return e >= 0 ? e : void 0
      }
      default:
        return
    }
}
function gi(t, e, n) {
  return 'ppaction://hlinksldjump' === (null == e ? void 0 : e.toLowerCase()) &&
    n
    ? (function (t, e) {
        if (G(e.targetMode)) return
        const n = pi(
            W(
              (function (t) {
                const e = t.replace(/\\/g, '/'),
                  n = e.lastIndexOf('/')
                return n >= 0 ? e.slice(0, n) : ''
              })(t.slide.slidePath || 'ppt/slides/slide1.xml'),
              e.target,
            ),
          ),
          i = t.presentation.slides.findIndex(
            (t) => pi(t.slidePath || '') === n,
          )
        if (i >= 0) return i
        const r = hi(e.target).match(/(?:^|[\\/])slide(\d+)\.xml$/i)
        return r ? parseInt(r[1], 10) - 1 : void 0
      })(t, n)
    : e
      ? $i(t, e)
      : void 0
}
function yi(t) {
  return `Go to slide ${t + 1}`
}
function xi(t, e) {
  const n = document.createElementNS('http://www.w3.org/1998/Math/MathML', t)
  return (void 0 !== e && (n.textContent = e), n)
}
function vi(t, ...e) {
  for (const n of e) n && t.appendChild(n)
  return t
}
function bi(t) {
  switch (t.kind) {
    case 'row':
      return vi(xi('mrow'), ...t.children.map(bi))
    case 'text':
      return (function (t, e = !1) {
        const n = xi('mrow'),
          i =
            t.match(
              new RegExp(
                '\\s+|\\p{L}[\\p{L}\\p{Mn}\\p{Mc}]*|\\p{N}+(?:[.,]\\p{N}+)*|.',
                'gu',
              ),
            ) ?? []
        for (const r of i)
          if (/^\s+$/u.test(r)) n.appendChild(xi('mtext', r))
          else if (new RegExp('^\\p{N}', 'u').test(r))
            n.appendChild(xi('mn', r))
          else if (new RegExp('^\\p{L}', 'u').test(r))
            if (e) {
              const t = xi('mi', r)
              ;(t.setAttribute('mathvariant', 'normal'), n.appendChild(t))
            } else for (const t of r) n.appendChild(xi('mi', t))
          else n.appendChild(xi('mo', r))
        return 1 === n.childElementCount ? n.firstElementChild : n
      })(t.text, t.normal)
    case 'fraction': {
      if ('lin' === t.style)
        return vi(xi('mrow'), bi(t.numerator), xi('mo', '/'), bi(t.denominator))
      const e = vi(xi('mfrac'), bi(t.numerator), bi(t.denominator))
      return (
        'noBar' === t.style && e.setAttribute('linethickness', '0'),
        'skw' === t.style && e.setAttribute('bevelled', 'true'),
        e
      )
    }
    case 'radical':
      return t.degree
        ? vi(xi('mroot'), bi(t.radicand), bi(t.degree))
        : vi(xi('msqrt'), bi(t.radicand))
    case 'scripts':
      return (function (t) {
        return t.subscript && t.superscript
          ? vi(xi('msubsup'), bi(t.base), bi(t.subscript), bi(t.superscript))
          : t.subscript
            ? vi(xi('msub'), bi(t.base), bi(t.subscript))
            : t.superscript
              ? vi(xi('msup'), bi(t.base), bi(t.superscript))
              : bi(t.base)
      })(t)
    case 'delimiter': {
      const e = xi('mrow'),
        n = xi('mo', t.begin)
      ;(n.setAttribute('fence', 'true'),
        n.setAttribute('stretchy', 'true'),
        e.appendChild(n),
        t.elements.forEach((n, i) => {
          if (i > 0) {
            const n = xi('mo', t.separator)
            ;(n.setAttribute('separator', 'true'), e.appendChild(n))
          }
          e.appendChild(bi(n))
        }))
      const i = xi('mo', t.end)
      return (
        i.setAttribute('fence', 'true'),
        i.setAttribute('stretchy', 'true'),
        e.appendChild(i),
        e
      )
    }
    case 'nary':
      return (function (t) {
        const e = xi('mo', t.operator)
        ;(e.setAttribute('largeop', 'true'),
          e.setAttribute('movablelimits', 'true'))
        let n = e
        return (
          t.lower && t.upper
            ? (n = vi(
                xi('undOvr' === t.limitLocation ? 'munderover' : 'msubsup'),
                e,
                bi(t.lower),
                bi(t.upper),
              ))
            : t.lower
              ? (n = vi(
                  xi('undOvr' === t.limitLocation ? 'munder' : 'msub'),
                  e,
                  bi(t.lower),
                ))
              : t.upper &&
                (n = vi(
                  xi('undOvr' === t.limitLocation ? 'mover' : 'msup'),
                  e,
                  bi(t.upper),
                )),
          vi(xi('mrow'), n, t.body ? bi(t.body) : void 0)
        )
      })(t)
    case 'matrix': {
      const e = xi('mtable')
      ;(e.setAttribute('columnspacing', '1.1em'),
        e.setAttribute('rowspacing', '0.5em'))
      for (const n of t.rows) {
        const t = xi('mtr')
        for (const e of n) {
          const n = xi('mtd')
          ;(n.setAttribute('style', 'padding: 0.25em 0.55em'),
            t.appendChild(vi(n, bi(e))))
        }
        e.appendChild(t)
      }
      return e
    }
    case 'function':
      return vi(xi('mrow'), bi(t.name), xi('mo', '⁡'), bi(t.argument))
  }
}
function Mi(t) {
  const e = document.createElement('span')
  ;((e.className = 'pptx-math'),
    (e.style.display = 'inline-block'),
    (e.style.verticalAlign = 'middle'),
    (e.style.whiteSpace = 'nowrap'),
    (e.style.lineHeight = 'normal'))
  const n = xi('math')
  return (
    n.setAttribute('display', t.display),
    n.setAttribute('aria-label', St(t)),
    n.setAttribute('style', 'font-family: inherit; font-size: inherit'),
    n.appendChild(bi(t.body)),
    e.appendChild(n),
    e
  )
}
function wi(t) {
  if (!t) return
  const e = t.trim()
  return 0 === e.length || e.length > 32
    ? void 0
    : /^[+-]?(?:\d+(?:[.,]\d+)?|\d{1,3}(?:,\d{3})+(?:\.\d+)?)\s*(?:%|[A-Za-z]{1,4})?$/.test(
          e,
        )
      ? e
      : void 0
}
function ki(t) {
  return void 0 !== wi(t)
}
function Ai(t, e) {
  e && t.appendChild(document.createTextNode(e.replace(/ {2}/g, '  ')))
}
function Li(t) {
  const e = new Map()
  let n = 1
  for (let i = 0; i < t.length; i++) {
    if (e.has(i)) continue
    let r = '',
      o = -1
    for (let e = i; e < t.length && e < i + 4; e++) {
      const n = t[e].text
      if (
        t[e].math ||
        void 0 === n ||
        '\n' === n ||
        n.includes('\t') ||
        ((r += n), r.trim().length > 32)
      )
        break
      e > i && ki(r) && (o = e)
    }
    if (o > i) {
      const t = n++
      for (let n = i; n <= o; n++) e.set(n, t)
      i = o
    }
  }
  return e
}
function Si(t, e) {
  if (!t || !t.exists()) return new U(null)
  const n = t.child(`lvl${e + 1}pPr`)
  return n.exists() ? n : t.child('defPPr')
}
function Ci(t, e, n) {
  for (const i of t) {
    let t
    const r = i.child('nvSpPr')
    if ((r.exists() && (t = r.child('nvPr').child('ph')), !t || !t.exists())) {
      const e = i.child('nvPicPr')
      e.exists() && (t = e.child('nvPr').child('ph'))
    }
    if (!t || !t.exists()) continue
    const o = t.attr('type'),
      l = t.numAttr('idx')
    if (
      ('idx' === n && (l ?? 0) === (e.idx ?? 0)) ||
      ('type' === n && (o ?? 'obj') === O(e.type))
    )
      return i
  }
}
function Fi(t) {
  const e = t.child('txBody')
  if (!e.exists()) return
  const n = e.child('lstStyle')
  return n.exists() ? n : void 0
}
var Bi = 1.19
function ji(t, e) {
  return Number((t * e * Bi).toFixed(3))
}
function Ei(t, e) {
  if (!e.exists()) return
  const n = e.attr('algn')
  n && (t.align = n)
  const i = e.attr('rtl')
  void 0 !== i && (t.rtl = nt(i))
  const r = e.attr('eaLnBrk')
  void 0 !== r && (t.eastAsianLineBreak = nt(r))
  const o = e.numAttr('marL')
  void 0 !== o && (t.marginLeft = H(o))
  const l = e.numAttr('indent')
  void 0 !== l && (t.textIndent = H(l))
  const s = e.numAttr('defTabSz')
  void 0 !== s && (t.defaultTabSize = H(s))
  const a = e.child('lnSpc')
  if (a.exists()) {
    const e = a.child('spcPct')
    if (e.exists()) {
      const n = _n(e.attr('val'))
      void 0 !== n &&
        ((t.lineHeightPercent = n),
        (t.lineHeight = `${(n * Bi).toFixed(3)}`),
        (t.lineHeightAbsolute = !1))
    }
    const n = a.child('spcPts')
    if (n.exists()) {
      const e = n.numAttr('val')
      void 0 !== e &&
        ((t.lineHeight = e / 100 + 'pt'),
        (t.lineHeightPercent = void 0),
        (t.lineHeightAbsolute = !0))
    }
  }
  const d = e.child('spcBef')
  if (d.exists()) {
    const e = d.child('spcPts')
    if (e.exists()) {
      const n = e.numAttr('val')
      void 0 !== n && ((t.spaceBefore = n / 100), (t.spaceBeforePct = void 0))
    }
    const n = d.child('spcPct')
    if (n.exists()) {
      const e = _n(n.attr('val'))
      void 0 !== e && ((t.spaceBeforePct = e), (t.spaceBefore = void 0))
    }
  }
  const c = e.child('spcAft')
  if (c.exists()) {
    const e = c.child('spcPts')
    if (e.exists()) {
      const n = e.numAttr('val')
      void 0 !== n && ((t.spaceAfter = n / 100), (t.spaceAfterPct = void 0))
    }
    const n = c.child('spcPct')
    if (n.exists()) {
      const e = _n(n.attr('val'))
      void 0 !== e && ((t.spaceAfterPct = e), (t.spaceAfter = void 0))
    }
  }
  const u = e.child('buChar')
  u.exists() &&
    ((t.bulletAutoNum = void 0),
    (t.bulletAutoNumStartAt = void 0),
    (t.bulletChar = u.attr('char') || ''),
    (t.bulletNone = !1))
  const h = e.child('buAutoNum')
  if (h.exists()) {
    ;((t.bulletChar = void 0),
      (t.bulletAutoNumStartAt = void 0),
      (t.bulletAutoNum = h.attr('type') || 'arabicPeriod'))
    const e = h.numAttr('startAt')
    ;(void 0 !== e && (t.bulletAutoNumStartAt = e), (t.bulletNone = !1))
  }
  e.child('buNone').exists() &&
    ((t.bulletNone = !0), (t.bulletChar = void 0), (t.bulletAutoNum = void 0))
  const p = e.child('buFont')
  p.exists() && (t.bulletFont = p.attr('typeface'))
  const f = e.child('buSzPct')
  if (f.exists()) {
    const e = _n(f.attr('val'))
    void 0 !== e && ((t.bulletSizePct = e), (t.bulletSizePt = void 0))
  }
  const m = e.child('buSzPts')
  if (m.exists()) {
    const e = m.numAttr('val')
    void 0 !== e && ((t.bulletSizePt = e / 100), (t.bulletSizePct = void 0))
  }
  ;(e.child('buSzTx').exists() &&
    ((t.bulletSizePct = void 0), (t.bulletSizePt = void 0)),
    e.child('buClrTx').exists() &&
      ((t.bulletColorFollowsText = !0), (t.bulletColorNode = void 0)))
  const $ = e.child('buClr')
  $.exists() && ((t.bulletColorNode = $), (t.bulletColorFollowsText = !1))
  const g = e.child('defRPr')
  g.exists() &&
    ((t.defRPr = g), t.defRPrs ?? (t.defRPrs = []), t.defRPrs.push(g))
}
function Pi(t) {
  if (null == t || !t.exists()) return 'none'
  if (t.child('gradFill').exists()) return 'explicit'
  const e = t.child('solidFill')
  if (!e.exists()) return 'none'
  const n = e.child('schemeClr').attr('val')
  return 'tx1' === n || 'tx2' === n ? 'defaultTextScheme' : 'explicit'
}
function Ti(t, e, n) {
  if (!e.exists()) return
  const i = e.numAttr('sz')
  void 0 !== i && (t.fontSize = i / 100)
  const r = e.attr('b')
  void 0 !== r && (t.bold = nt(r))
  const o = e.attr('i')
  void 0 !== o && (t.italic = nt(o))
  const l = e.attr('u')
  ;(void 0 !== l && 'none' !== l && (t.underline = !0),
    'none' === l && (t.underline = !1))
  const s = e.attr('strike')
  ;(void 0 !== s && 'noStrike' !== s && (t.strikethrough = !0),
    'noStrike' === s && (t.strikethrough = !1))
  const a = e.child('highlight')
  a.exists() && (t.highlightColor = rn(a, n))
  const d = e.child('uFill')
  if (d.exists()) {
    const e = d.child('solidFill')
    e.exists() && ((t.underlineColor = rn(e, n)), (t.underlineFollowsText = !1))
  }
  e.child('uFillTx').exists() &&
    ((t.underlineFollowsText = !0), (t.underlineColor = void 0))
  const c = e.child('solidFill')
  if (c.exists()) {
    ;(delete t.textGradientCss, delete t.textPatternCss, delete t.textNoFill)
    const { color: e, alpha: i } = en(c, n),
      r = e.startsWith('#') ? e : `#${e}`
    if (i < 1) {
      const { r: e, g: n, b: o } = Ri(r)
      t.color = `rgba(${e},${n},${o},${i.toFixed(3)})`
    } else t.color = r
  }
  const u = e.child('gradFill')
  if (u.exists()) {
    ;(delete t.color, delete t.textPatternCss, delete t.textNoFill)
    const e = Yi(u, n)
    e && (t.textGradientCss = e)
  }
  if (e.child('pattFill').exists()) {
    ;(delete t.color, delete t.textGradientCss, delete t.textNoFill)
    const i = sn(e, n)
    i && (t.textPatternCss = i)
  }
  const h = [],
    p = [e.attr('lang'), e.attr('altLang')]
  for (const w of ['latin', 'ea', 'cs']) {
    const t = e.child(w)
    if (!t.exists()) continue
    const i = t.attr('typeface')
    i && h.push(...ii([i], n, p))
  }
  h.length > 0 && ((t.fontFamily = h[0]), (t.fontFamilyStack = h))
  const f = e.child('hlinkClick')
  if (f.exists()) {
    const e = f.attr('id') ?? f.attr('r:id'),
      i = e ? n.slide.rels.get(e) : void 0,
      r = gi(n, f.attr('action'), i)
    void 0 !== r && n.onNavigate
      ? ((t.hlinkSlideIndex = r),
        (t.hlinkTooltip = f.attr('tooltip')),
        void 0 === t.underline && (t.underline = !0))
      : i &&
        G(i.targetMode) &&
        kn(i.target) &&
        ((t.hlinkClick = i.target),
        void 0 === t.underline && (t.underline = !0))
  }
  const m = e.numAttr('spc')
  void 0 !== m && (t.letterSpacingPt = m / 100)
  const $ = e.numAttr('kern')
  void 0 !== $ && (t.kern = $ / 100)
  const g = e.attr('cap')
  void 0 !== g && (t.cap = g)
  const y = e.numAttr('baseline')
  void 0 !== y && (t.baseline = y)
  const x = e.child('effectLst'),
    v = x.child('outerShdw')
  if (v.exists()) {
    const e = (function (t, e) {
      const n = H(t.numAttr('dist') ?? 0),
        i = H(t.numAttr('blurRad') ?? 0),
        r = (t.numAttr('dir') ?? 0) / 6e4,
        o = n * Math.cos((r * Math.PI) / 180),
        l = n * Math.sin((r * Math.PI) / 180),
        { color: s, alpha: a } = en(t, e)
      if (s && !(a <= 0))
        return `${o.toFixed(1)}px ${l.toFixed(1)}px ${i.toFixed(1)}px ${Ii(s, a)}`
    })(v, n)
    e && Di(t, e)
  }
  const b = x.child('glow')
  if (b.exists()) {
    const e = (function (t, e) {
      const n = H(t.numAttr('rad') ?? 0)
      if (!(n > 0)) return
      const { color: i, alpha: r } = en(t, e)
      if (i && !(r <= 0)) return `0px 0px ${n.toFixed(1)}px ${Ii(i, r)}`
    })(b, n)
    e && Di(t, e)
  }
  e.child('noFill').exists() &&
    (delete t.color,
    delete t.textGradientCss,
    delete t.textPatternCss,
    (t.textNoFill = !0))
  const M = e.child('ln')
  if (M.exists() && !M.child('noFill').exists()) {
    const e = M.numAttr('w')
    t.textOutlineWidth = e ? H(e) : 0.75
    const i = M.child('solidFill')
    if (i.exists()) {
      const { color: e, alpha: r } = en(i, n)
      t.textOutlineColor = Ii(e, r)
    }
    const r = M.child('gradFill')
    r.exists() && (t.textOutlineGradientCss = Yi(r, n))
  }
}
function zi(t, e, n) {
  for (const i of e.defRPrs ?? []) Ti(t, i, n)
}
function Ni(t, e) {
  const n = {}
  return (zi(n, t, e), n)
}
function Ri(t) {
  const e = t.replace(/^#/, ''),
    n = parseInt(
      3 === e.length ? e[0] + e[0] + e[1] + e[1] + e[2] + e[2] : e,
      16,
    )
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: 255 & n }
}
function Ii(t, e) {
  const n = t.startsWith('#') ? t : `#${t}`
  if (e >= 1) return n
  const { r: i, g: r, b: o } = Ri(n)
  return `rgba(${i},${r},${o},${e.toFixed(3)})`
}
function Di(t, e) {
  t.textShadow = t.textShadow ? `${t.textShadow}, ${e}` : e
}
function Oi(t, e) {
  if (null == t || !t.exists()) return
  const n = {}
  return (Ti(n, t, e), n.color)
}
function Ui(t) {
  if (!t) return
  const e = t.trim().toLowerCase()
  if (e.startsWith('#')) {
    const { r: t, g: n, b: i } = Ri(e)
    return `${t},${n},${i},1`
  }
  const n = e.match(/^rgba?\(([^)]+)\)$/)
  if (!n) return e
  const i = n[1].split(',').map((t) => t.trim())
  if (i.length < 3) return e
  const [r, o, l] = i,
    s = i[3] ?? '1'
  return `${Number(r)},${Number(o)},${Number(l)},${Number(s)}`
}
function Zi(t, e) {
  const n = Ui(t),
    i = Ui(e)
  return void 0 !== n && n === i
}
function Gi(t) {
  return (null == t ? void 0 : t.child('hlinkClick').exists()) ?? !1
}
function Xi(t, e, n, i, r, o) {
  return (
    !!(function (t) {
      return !!t.hlinkClick || void 0 !== t.hlinkSlideIndex
    })(n) &&
    (!r ||
      'defaultTextScheme' === i ||
      (!(
        'explicit' !== i ||
        !(function (t) {
          return (
            (null == t
              ? void 0
              : t.child('solidFill').child('srgbClr').exists()) ?? !1
          )
        })(t.properties)
      ) &&
        (function (t, e, n, i) {
          if (!n) return !1
          for (const r of e.runs)
            if (r !== t && !Gi(r.properties) && Zi(n, Oi(r.properties, i)))
              return !0
          return Zi(n, Oi(e.endParaRPr, i))
        })(t, e, n.color, o)))
  )
}
function Yi(t, e) {
  const n = t.child('gsLst'),
    i = []
  for (const l of n.children('gs')) {
    const t = 100 * q(l.numAttr('pos') ?? 0),
      { color: n, alpha: r } = en(l, e)
    i.push({ position: t, color: Ii(n, r) })
  }
  if (0 === i.length) return ''
  i.sort((t, e) => t.position - e.position)
  const r = i.map((t) => `${t.color} ${t.position.toFixed(1)}%`).join(', '),
    o = t.child('lin')
  return o.exists()
    ? `linear-gradient(${((V(o.numAttr('ang') ?? 0) + 90) % 360).toFixed(1)}deg, ${r})`
    : `linear-gradient(180deg, ${r})`
}
function Wi(t, e) {
  var n
  if (
    ((t.style.background = e),
    !t.style.background && e.includes(' 0 0 / 8px 8px, '))
  ) {
    const i = e.split(' 0 0 / 8px 8px, '),
      r = null == (n = i[i.length - 1]) ? void 0 : n.trim(),
      o = i.slice(0, -1).map((t) => t.trim())
    ;(o.length > 0 &&
      ((t.style.backgroundImage = o.join(', ')),
      (t.style.backgroundSize = o.map(() => '8px 8px').join(', '))),
      r && (t.style.backgroundColor = r))
  }
  ;((t.style.webkitBackgroundClip = 'text'),
    (t.style.backgroundClip = 'text'),
    (t.style.color = 'transparent'))
}
function Hi(t, e) {
  switch (t) {
    case 'arabicPeriod':
    default:
      return `${e}.`
    case 'arabicParenR':
      return `${e})`
    case 'arabicParenBoth':
      return `(${e})`
    case 'arabicPlain':
      return `${e}`
    case 'romanUcPeriod':
      return `${Vi(e)}.`
    case 'romanLcPeriod':
      return `${Vi(e).toLowerCase()}.`
    case 'alphaUcPeriod':
      return `${String.fromCharCode(((e - 1) % 26) + 1 + 64)}.`
    case 'alphaLcPeriod':
      return `${String.fromCharCode(((e - 1) % 26) + 1 + 96)}.`
    case 'alphaUcParenR':
      return `${String.fromCharCode(((e - 1) % 26) + 1 + 64)})`
    case 'alphaLcParenR':
      return `${String.fromCharCode(((e - 1) % 26) + 1 + 96)})`
  }
}
function Vi(t) {
  const e = [1e3, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1],
    n = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I']
  let i = '',
    r = t
  for (let o = 0; o < e.length; o++)
    for (; r >= e[o];) ((i += n[o]), (r -= e[o]))
  return i
}
function qi(t, e) {
  let n = !1
  const i = String((e.presentation.firstSlideNum ?? 1) + e.slide.index),
    r = t.paragraphs.map((t) => {
      let e = !1
      const r = t.runs.map((t) => {
        var r
        return 'slidenum' !==
          (null == (r = t.fieldType) ? void 0 : r.toLowerCase())
          ? t
          : ((n = !0), (e = !0), { ...t, text: i })
      })
      return e ? { ...t, runs: r } : t
    })
  return n ? { ...t, paragraphs: r } : t
}
function _i(t, e, n, i, r) {
  var o, l, s, a, d, c, u, h, p, f
  const m = qi(t, n),
    $ = e
      ? Ci(
          n.layout.placeholders.map((t) => t.node),
          e,
          'idx',
        )
      : void 0,
    g = null == $ ? void 0 : $.child('nvSpPr').child('nvPr').child('ph'),
    y =
      null != g && g.exists()
        ? g.attr('type')
        : null == $
          ? void 0
          : $.child('nvPicPr').child('nvPr').child('ph').attr('type'),
    x = $ ? { type: y } : e,
    v = (function (t) {
      if (!t || !t.type) return 'other'
      const e = t.type
      return 'title' === e || 'ctrTitle' === e
        ? 'title'
        : 'body' === e ||
            'subTitle' === e ||
            'obj' === e ||
            'dt' === e ||
            'ftr' === e ||
            'sldNum' === e
          ? 'body'
          : 'other'
    })(x ? { type: O(x.type) } : void 0)
  if (!i.style.whiteSpace) {
    const t =
      (null == (o = m.bodyProperties) ? void 0 : o.attr('wrap')) ??
      (null == (l = m.layoutBodyProperties) ? void 0 : l.attr('wrap'))
    i.style.whiteSpace = 'none' === t ? 'nowrap' : 'normal'
  }
  let b = 1,
    M = 0
  const w = qn(m, 'normAutofit')
  if (null != w && w.exists()) {
    const t = _n(w.attr('fontScale'))
    void 0 !== t && (b = t)
    const e = _n(w.attr('lnSpcReduction'))
    void 0 !== e && (M = e)
  }
  const k = new Map(),
    A = m.paragraphs
      .map((t, e) => ({
        index: e,
        visible: t.runs.some((t) => null != t.text && t.text.length > 0),
      }))
      .filter((t) => t.visible)
      .map((t) => t.index),
    L = A[0],
    S = A[A.length - 1],
    C = 1 === A.length ? A[0] : void 0
  for (const [F, B] of m.paragraphs.entries()) {
    const t = document.createElement('div')
    ;((t.style.width = '100%'),
      (t.style.minWidth = '0px'),
      (t.style.maxWidth = '100%'),
      (t.style.boxSizing = 'border-box'),
      (t.style.overflowWrap = 'anywhere'))
    const o = B.level
    null != r && r.isVerticalText && (t.style.wordBreak = 'keep-all')
    const l = B.runs.some((t) => '\n' === t.text),
      g = (null == r ? void 0 : r.compactSingleLineSpacing) && F === C && !l,
      y = {}
    if (
      (Ei(y, Si(n.presentation.defaultTextStyle, o)),
      Ei(y, Si(n.master.defaultTextStyle, o)),
      Ei(
        y,
        Si(
          'title' === v
            ? n.master.textStyles.titleStyle
            : 'body' === v
              ? n.master.textStyles.bodyStyle
              : n.master.textStyles.otherStyle,
          o,
        ),
      ),
      x)
    ) {
      const t = Ci(n.master.placeholders, x, 'type')
      t && Ei(y, Si(Fi(t), o))
    }
    if (
      ($ && Ei(y, Si(Fi($), o)),
      Ei(y, Si(m.listStyle, o)),
      B.properties && Ei(y, B.properties),
      y.align)
    ) {
      const e = {
        l: 'left',
        ctr: 'center',
        r: 'right',
        just: 'justify',
        justLow: 'justify',
        dist: 'justify',
        thaiDist: 'justify',
      }
      t.style.textAlign = e[y.align] || 'left'
    }
    ;(void 0 !== y.rtl && (t.style.direction = y.rtl ? 'rtl' : 'ltr'),
      (t.style.lineBreak = !1 === y.eastAsianLineBreak ? 'anywhere' : 'auto'),
      void 0 !== y.marginLeft && (t.style.paddingLeft = `${y.marginLeft}px`),
      void 0 !== y.textIndent && (t.style.textIndent = `${y.textIndent}px`))
    let w = y.lineHeight ?? (null == r ? void 0 : r.defaultLineHeight)
    if (w) {
      if (M > 0 && void 0 !== y.lineHeightPercent)
        w = `${(Math.max(0, y.lineHeightPercent - M) * Bi).toFixed(3)}`
      else if (M > 0 && !w.includes('pt')) {
        const t = parseFloat(w)
        isNaN(t) || (w = `${Math.max(0, t - M * Bi).toFixed(3)}`)
      }
      ;(null != r && r.isVerticalText && !y.lineHeightAbsolute
        ? (w = '1')
        : g && y.lineHeightAbsolute && (w = 'normal'),
        (t.style.lineHeight = w))
    }
    const A = B.runs.find(
        (t) =>
          null != t.text &&
          t.text.length > 0 &&
          '\n' !== t.text &&
          '\t' !== t.text,
      ),
      j = void 0 !== A,
      E = { ...Ni(y, n) },
      P = A
        ? A.properties
        : ((null == (s = B.runs.find((t) => '\n' === t.text && t.properties))
            ? void 0
            : s.properties) ??
          B.endParaRPr ??
          (null == (a = B.runs[0]) ? void 0 : a.properties))
    P && Ti(E, P, n)
    const T = E.fontSize ?? 12
    if (((t.style.fontSize = T * b + 'pt'), !A)) {
      const e = E.fontFamilyStack ?? E.fontFamily
      e && (t.style.fontFamily = ui(e))
    }
    const z = (null == r ? void 0 : r.trimOuterParagraphSpacing) && F === L,
      N = (null == r ? void 0 : r.trimOuterParagraphSpacing) && F === S
    ;(z
      ? (t.style.marginTop = '0px')
      : void 0 !== y.spaceBefore
        ? (t.style.marginTop = `${y.spaceBefore}pt`)
        : void 0 !== y.spaceBeforePct &&
          (t.style.marginTop = `${ji(y.spaceBeforePct, T)}pt`),
      N
        ? (t.style.marginBottom = '0px')
        : void 0 !== y.spaceAfter
          ? (t.style.marginBottom = `${y.spaceAfter}pt`)
          : void 0 !== y.spaceAfterPct &&
            (t.style.marginBottom = `${ji(y.spaceAfterPct, T)}pt`))
    let R = ''
    if (
      !(
        !j ||
        'sldNum' === (null == e ? void 0 : e.type) ||
        'dt' === (null == e ? void 0 : e.type) ||
        'ftr' === (null == e ? void 0 : e.type) ||
        'title' === (null == e ? void 0 : e.type) ||
        'ctrTitle' === (null == e ? void 0 : e.type) ||
        'subTitle' === (null == e ? void 0 : e.type)
      ) &&
      !0 !== y.bulletNone
    )
      if (y.bulletChar) R = y.bulletChar
      else if (y.bulletAutoNum) {
        const t = `${o}:${y.bulletAutoNum}`,
          e = y.bulletAutoNumStartAt ?? k.get(t) ?? 1
        ;((R = Hi(y.bulletAutoNum, e)), k.set(t, e + 1))
      }
    if (R) {
      const e = document.createElement('span')
      e.textContent = R + ' '
      const i = y.marginLeft,
        l = y.textIndent
      if (void 0 !== i && i > 0 && void 0 !== l && l < 0) {
        const n = Math.max(0, i + l),
          r = Math.max(0, i - n)
        ;((t.style.textIndent = '0px'),
          'ctr' === y.align || 'r' === y.align
            ? ((t.style.paddingLeft = '0px'),
              (e.style.display = 'inline-block'),
              (e.style.width = `${r}px`),
              (e.style.whiteSpace = 'pre'))
            : ((t.style.position = 'relative'),
              (e.style.position = 'absolute'),
              (e.style.left = `${n}px`),
              (e.style.top = '0px'),
              (e.style.width = `${r}px`),
              (e.style.whiteSpace = 'pre')))
      }
      y.bulletFont && (e.style.fontFamily = ui(ii([y.bulletFont], n)))
      const s = y.bulletSizePt ?? T * (y.bulletSizePct ?? 1)
      let a
      e.style.fontSize = s * b + 'pt'
      const d = () => {
        if (!A) return
        const t = Ni(y, n)
        return (
          A.properties && Ti(t, A.properties, n),
          t.color ??
            (null == r ? void 0 : r.fontRefColor) ??
            (null == r ? void 0 : r.cellTextColor) ??
            (t.textNoFill ? 'transparent' : void 0)
        )
      }
      if (
        (y.bulletColorNode &&
          y.bulletColorNode.exists() &&
          (a = rn(y.bulletColorNode, n)),
        void 0 === a && (a = d()),
        void 0 === a && m.listStyle)
      ) {
        const t = Si(m.listStyle, o)
        if (t.exists()) {
          const e = t.child('defRPr')
          if (e.exists()) {
            const t = {}
            ;(Ti(t, e, n), void 0 !== t.color && (a = t.color))
          }
        }
      }
      ;((e.style.color =
        a ??
        (null == r ? void 0 : r.fontRefColor) ??
        (null == r ? void 0 : r.cellTextColor) ??
        '#000000'),
        t.appendChild(e))
    }
    const I = Li(B.runs),
      D = new Map()
    if (
      (j || t.appendChild(document.createElement('br')),
      B.runs.some((t) => {
        var e
        return null == (e = t.text) ? void 0 : e.includes('\t')
      }))
    ) {
      const e = y.defaultTabSize ?? 96
      t.style.tabSize = `${e}px`
    }
    const O = y.lineHeightAbsolute && l && w
    let U = null
    O &&
      ((U = document.createElement('div')),
      (U.style.height = w),
      (U.style.overflow = 'visible'),
      t.appendChild(U))
    for (const [e, i] of B.runs.entries()) {
      if ('\n' === i.text && O) {
        ;((U = document.createElement('div')),
          (U.style.height = w),
          (U.style.overflow = 'visible'),
          t.appendChild(U))
        continue
      }
      const l = {}
      if (
        (zi(l, y, n),
        i.properties && Ti(l, i.properties, n),
        void 0 === l.color && m.listStyle)
      ) {
        const t = Si(m.listStyle, o)
        if (t.exists()) {
          const e = t.child('defRPr')
          if (e.exists()) {
            const t = {}
            ;(Ti(t, e, n), void 0 !== t.color && (l.color = t.color))
          }
        }
      }
      let s
      if ('\n' === i.text) s = document.createElement('span')
      else if (i.math) s = Mi(i.math)
      else if (void 0 !== l.hlinkSlideIndex) {
        const t = document.createElement('span'),
          e = l.hlinkSlideIndex
        ;(t.setAttribute('role', 'link'),
          (t.tabIndex = 0),
          (t.title = l.hlinkTooltip || yi(e)),
          (t.style.cursor = 'pointer'),
          t.addEventListener('click', (t) => {
            var i
            ;(t.stopPropagation(),
              null == (i = n.onNavigate) || i.call(n, { slideIndex: e }))
          }),
          t.addEventListener('keydown', (t) => {
            var i
            ;('Enter' !== t.key && ' ' !== t.key) ||
              (t.preventDefault(),
              t.stopPropagation(),
              null == (i = n.onNavigate) || i.call(n, { slideIndex: e }))
          }),
          (s = t))
      } else if (l.hlinkClick) {
        const t = document.createElement('a')
        ;((t.href = l.hlinkClick),
          (t.target = '_blank'),
          (t.rel = 'noopener noreferrer'),
          (s = t))
      } else s = document.createElement('span')
      const a = i.math ? void 0 : wi(i.text),
        $ = !!(
          l.textGradientCss ||
          l.textPatternCss ||
          l.textNoFill ||
          void 0 !== l.textOutlineWidth ||
          l.textOutlineColor ||
          l.textOutlineGradientCss
        ),
        g = !!i.text && !!a && i.text !== a && !$
      if ('\n' === i.text) s.appendChild(document.createElement('br'))
      else if (!i.math)
        if (i.text && i.text.includes('\t'))
          ((s.textContent = i.text), (s.style.whiteSpace = 'pre'))
        else if (g) {
          const t = i.text.indexOf(a),
            e = t + a.length
          Ai(s, i.text.slice(0, t))
          const n = document.createElement('span')
          ;((n.textContent = a),
            (n.style.whiteSpace = 'nowrap'),
            s.appendChild(n),
            Ai(s, i.text.slice(e)))
        } else if (i.text && / {2}/.test(i.text)) {
          const t = i.text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/ {2}/g, '  ')
          s.innerHTML = t
        } else s.textContent = i.text
      a &&
        (i.text === a || (i.text && i.text !== a && $)) &&
        (s.style.whiteSpace = 'nowrap')
      const x = l.fontSize || 12
      ;((s.style.fontSize = x * b + 'pt'),
        (void 0 !== (null == (d = i.properties) ? void 0 : d.attr('b'))
          ? l.bold
          : ((null == r ? void 0 : r.cellTextBold) ?? l.bold)) &&
          (s.style.fontWeight = 'bold'),
        (void 0 !== (null == (c = i.properties) ? void 0 : c.attr('i'))
          ? l.italic
          : ((null == r ? void 0 : r.cellTextItalic) ?? l.italic)) &&
          (s.style.fontStyle = 'italic'))
      const v = []
      ;(l.underline && v.push('underline'),
        l.strikethrough && v.push('line-through'),
        v.length > 0 && (s.style.textDecoration = v.join(' ')),
        l.highlightColor && (s.style.backgroundColor = l.highlightColor))
      const M = Pi(i.properties),
        k = 'none' !== M
      let A
      const L =
        'none' !== Pi(null == (u = B.properties) ? void 0 : u.child('defRPr'))
      if (
        ((A =
          k || L
            ? l.color
            : null != r && r.cellTextColor
              ? r.cellTextColor
              : null != r && r.fontRefColor
                ? r.fontRefColor
                : l.color),
        Xi(i, B, l, M, k, n))
      ) {
        const t = n.theme.colorScheme.get('hlink')
        t && (A = t.startsWith('#') ? t : `#${t}`)
      }
      if (
        ((s.style.color = A || '#000000'),
        l.underlineFollowsText && A && (s.style.textDecorationColor = A),
        l.underlineColor && (s.style.textDecorationColor = l.underlineColor),
        l.textShadow && (s.style.textShadow = l.textShadow),
        l.textGradientCss && Wi(s, l.textGradientCss),
        l.textPatternCss && Wi(s, l.textPatternCss),
        l.textNoFill || l.textOutlineWidth)
      ) {
        const t = l.textOutlineWidth ?? 0.75
        if (l.textNoFill && l.textOutlineGradientCss) {
          const e = '#ffffff'
          ;((s.style.color = 'transparent'),
            (s.style.webkitTextStrokeWidth = `${t}px`),
            (s.style.webkitTextStrokeColor = e),
            (s.style.paintOrder = 'stroke fill'))
          const n = l.textOutlineGradientCss
          ;((s.style.maskImage = n), (s.style.webkitMaskImage = n))
        } else
          l.textNoFill && l.textOutlineColor
            ? ((s.style.color = 'transparent'),
              (s.style.webkitTextStrokeWidth = `${t}px`),
              (s.style.webkitTextStrokeColor = l.textOutlineColor),
              (s.style.paintOrder = 'stroke fill'))
            : l.textNoFill
              ? (s.style.color = 'transparent')
              : l.textOutlineColor &&
                ((s.style.webkitTextStrokeWidth = `${t}px`),
                (s.style.webkitTextStrokeColor = l.textOutlineColor),
                (s.style.paintOrder = 'stroke fill'))
      }
      const S =
        (null == (h = i.properties) ? void 0 : h.child('latin').exists()) ||
        (null == (p = i.properties) ? void 0 : p.child('ea').exists()) ||
        (null == (f = i.properties) ? void 0 : f.child('cs').exists())
          ? (l.fontFamilyStack ?? l.fontFamily)
          : ((null == r ? void 0 : r.cellTextFontFamily) ??
            l.fontFamilyStack ??
            l.fontFamily)
      if (S) {
        const t = ii(Array.isArray(S) ? S : [S], n)
        s.style.fontFamily = ui(t)
      } else {
        const t = n.theme.minorFont.latin || n.theme.minorFont.ea
        t && (s.style.fontFamily = ui(t))
      }
      if (
        (void 0 !== l.letterSpacingPt &&
          (s.style.letterSpacing = `${l.letterSpacingPt}pt`),
        void 0 !== l.kern)
      ) {
        const t = (l.fontSize || 12) * b
        s.style.fontKerning = t >= l.kern ? 'normal' : 'none'
      }
      if (
        ('all' === l.cap
          ? (s.style.textTransform = 'uppercase')
          : 'small' === l.cap && (s.style.fontVariant = 'small-caps'),
        void 0 !== l.baseline && 0 !== l.baseline)
      ) {
        const t = l.baseline / 1e3
        ;((s.style.verticalAlign = `${t}%`),
          Math.abs(t) >= 20 && (s.style.fontSize = x * b * 0.65 + 'pt'))
      }
      const C = U ?? t,
        F = I.get(e)
      if (void 0 !== F) {
        let t = D.get(F)
        ;(t ||
          ((t = document.createElement('span')),
          (t.style.whiteSpace = 'nowrap'),
          D.set(F, t),
          C.appendChild(t)),
          t.appendChild(s))
      } else C.appendChild(s)
    }
    if (B.endParaRPr) {
      const e = B.runs[B.runs.length - 1]
      if ('\n' === (null == e ? void 0 : e.text)) {
        const e = B.endParaRPr.numAttr('sz')
        if (void 0 !== e) {
          const n = document.createElement('span')
          ;((n.textContent = '​'),
            (n.style.fontSize = (e / 100) * b + 'pt'),
            (U ?? t).appendChild(n))
        }
      }
    }
    i.appendChild(t)
  }
}
function Qi(t) {
  let e = 0,
    n = 0
  for (const i of t.allChildren()) {
    if ('moveTo' === i.localName || 'lnTo' === i.localName) {
      const t = i.child('pt')
      ;((e = Math.max(e, t.numAttr('x') ?? 0)),
        (n = Math.max(n, t.numAttr('y') ?? 0)))
      continue
    }
    if ('cubicBezTo' !== i.localName && 'quadBezTo' !== i.localName)
      'arcTo' === i.localName &&
        ((e = Math.max(e, i.numAttr('wR') ?? 0)),
        (n = Math.max(n, i.numAttr('hR') ?? 0)))
    else
      for (const t of i.children('pt'))
        ((e = Math.max(e, t.numAttr('x') ?? 0)),
          (n = Math.max(n, t.numAttr('y') ?? 0)))
  }
  return { w: Math.max(1, e), h: Math.max(1, n) }
}
function Ki(t, e, n, i) {
  const r = t.child('pathLst')
  if (!r.exists()) return ''
  const o = r.children('path'),
    l = []
  for (const s of o) {
    const t = Qi(s),
      r = s.numAttr('w') ?? (null == i ? void 0 : i.w) ?? t.w,
      o = s.numAttr('h') ?? (null == i ? void 0 : i.h) ?? t.h,
      a = r > 0 ? e / r : 1,
      d = o > 0 ? n / o : 1
    let c = 0,
      u = 0
    const h = s.allChildren()
    for (const e of h)
      switch (e.localName) {
        case 'moveTo': {
          const t = e.child('pt'),
            n = (t.numAttr('x') ?? 0) * a,
            i = (t.numAttr('y') ?? 0) * d
          ;(l.push(`M${n},${i}`), (c = n), (u = i))
          break
        }
        case 'lnTo': {
          const t = e.child('pt'),
            n = (t.numAttr('x') ?? 0) * a,
            i = (t.numAttr('y') ?? 0) * d
          ;(l.push(`L${n},${i}`), (c = n), (u = i))
          break
        }
        case 'cubicBezTo': {
          const t = e.children('pt')
          if (t.length >= 3) {
            const e = (t[0].numAttr('x') ?? 0) * a,
              n = (t[0].numAttr('y') ?? 0) * d,
              i = (t[1].numAttr('x') ?? 0) * a,
              r = (t[1].numAttr('y') ?? 0) * d,
              o = (t[2].numAttr('x') ?? 0) * a,
              s = (t[2].numAttr('y') ?? 0) * d
            ;(l.push(`C${e},${n} ${i},${r} ${o},${s}`), (c = o), (u = s))
          }
          break
        }
        case 'quadBezTo': {
          const t = e.children('pt')
          if (t.length >= 2) {
            const e = (t[0].numAttr('x') ?? 0) * a,
              n = (t[0].numAttr('y') ?? 0) * d,
              i = (t[1].numAttr('x') ?? 0) * a,
              r = (t[1].numAttr('y') ?? 0) * d
            ;(l.push(`Q${e},${n} ${i},${r}`), (c = i), (u = r))
          }
          break
        }
        case 'arcTo': {
          const t = e.numAttr('wR') ?? 0,
            n = e.numAttr('hR') ?? 0,
            i = t * a,
            r = n * d,
            o = (e.numAttr('stAng') ?? 0) / 6e4,
            s = (e.numAttr('swAng') ?? 0) / 6e4
          if (0 === i || 0 === r || 0 === s) break
          const h = (o * Math.PI) / 180,
            p = Math.atan2(t * Math.sin(h), n * Math.cos(h)),
            f = ((o + s) * Math.PI) / 180,
            m = Math.atan2(t * Math.sin(f), n * Math.cos(f)),
            $ = u / d,
            g = c / a - t * Math.cos(p),
            y = $ - n * Math.sin(p),
            x = (g + t * Math.cos(m)) * a,
            v = (y + n * Math.sin(m)) * d,
            b = Math.abs(s) > 180 ? 1 : 0,
            M = s > 0 ? 1 : 0
          ;(l.push(`A${i},${r} 0 ${b},${M} ${x},${v}`), (c = x), (u = v))
          break
        }
        case 'close':
          l.push('Z')
      }
  }
  return l.join(' ')
}
function Ji(t, e, n, i, r, o, l) {
  const s = (r * Math.PI) / 180,
    a = (o * Math.PI) / 180
  let d = (((o - r) % 360) + 360) % 360
  return (
    0 === d && r !== o && (d = 360),
    `M${t + n * Math.cos(s)},${e + i * Math.sin(s)} A${n},${i} 0 ${d > 180 ? 1 : 0},1 ${t + n * Math.cos(a)},${e + i * Math.sin(a)}`
  )
}
var tr = 6e4,
  er = (180 * tr) / Math.PI,
  nr = Math.PI / (180 * tr),
  ir = Object.freeze({
    '*/': 3,
    '+-': 3,
    '+/': 3,
    '?:': 3,
    abs: 1,
    at2: 2,
    cat2: 3,
    cos: 2,
    max: 2,
    min: 2,
    mod: 3,
    pin: 3,
    sat2: 3,
    sin: 2,
    sqrt: 1,
    tan: 2,
    val: 1,
  }),
  rr = [
    {
      adjustmentGuides: [],
      calculatedGuides: [],
      name: 'flowChartProcess',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 1 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 1 },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'norm',
          height: { kind: 'literal', value: 1 },
          stroke: !0,
          width: { kind: 'literal', value: 1 },
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'r' },
              { kind: 'literal', value: 0 },
              { kind: 'guide', name: 'ssd6' },
            ],
            operator: '+-',
          },
          name: 'x2',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'b' },
              { kind: 'literal', value: 0 },
              { kind: 'guide', name: 'ssd6' },
            ],
            operator: '+-',
          },
          name: 'y2',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'ssd6' },
              { kind: 'literal', value: 29289 },
              { kind: 'literal', value: 1e5 },
            ],
            operator: '*/',
          },
          name: 'il',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'r' },
              { kind: 'literal', value: 0 },
              { kind: 'guide', name: 'il' },
            ],
            operator: '+-',
          },
          name: 'ir',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'b' },
              { kind: 'literal', value: 0 },
              { kind: 'guide', name: 'il' },
            ],
            operator: '+-',
          },
          name: 'ib',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartAlternateProcess',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'guide', name: 'l' },
              y: { kind: 'guide', name: 'ssd6' },
            },
            {
              heightRadius: { kind: 'guide', name: 'ssd6' },
              startAngle: { kind: 'guide', name: 'cd2' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'ssd6' },
            },
            {
              type: 'lnTo',
              x: { kind: 'guide', name: 'x2' },
              y: { kind: 'guide', name: 't' },
            },
            {
              heightRadius: { kind: 'guide', name: 'ssd6' },
              startAngle: { kind: 'guide', name: '3cd4' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'ssd6' },
            },
            {
              type: 'lnTo',
              x: { kind: 'guide', name: 'r' },
              y: { kind: 'guide', name: 'y2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'ssd6' },
              startAngle: { kind: 'literal', value: 0 },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'ssd6' },
            },
            {
              type: 'lnTo',
              x: { kind: 'guide', name: 'ssd6' },
              y: { kind: 'guide', name: 'b' },
            },
            {
              heightRadius: { kind: 'guide', name: 'ssd6' },
              startAngle: { kind: 'guide', name: 'cd4' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'ssd6' },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'norm',
          height: null,
          stroke: !0,
          width: null,
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'w' },
              { kind: 'literal', value: 3 },
              { kind: 'literal', value: 4 },
            ],
            operator: '*/',
          },
          name: 'ir',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'h' },
              { kind: 'literal', value: 3 },
              { kind: 'literal', value: 4 },
            ],
            operator: '*/',
          },
          name: 'ib',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartDecision',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 1 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 2 },
              y: { kind: 'literal', value: 1 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 2 },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'norm',
          height: { kind: 'literal', value: 2 },
          stroke: !0,
          width: { kind: 'literal', value: 2 },
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'w' },
              { kind: 'literal', value: 2 },
              { kind: 'literal', value: 5 },
            ],
            operator: '*/',
          },
          name: 'x3',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'w' },
              { kind: 'literal', value: 3 },
              { kind: 'literal', value: 5 },
            ],
            operator: '*/',
          },
          name: 'x4',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'w' },
              { kind: 'literal', value: 4 },
              { kind: 'literal', value: 5 },
            ],
            operator: '*/',
          },
          name: 'x5',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'w' },
              { kind: 'literal', value: 9 },
              { kind: 'literal', value: 10 },
            ],
            operator: '*/',
          },
          name: 'x6',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartInputOutput',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 5 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 5 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 4 },
              y: { kind: 'literal', value: 5 },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'norm',
          height: { kind: 'literal', value: 5 },
          stroke: !0,
          width: { kind: 'literal', value: 5 },
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'w' },
              { kind: 'literal', value: 7 },
              { kind: 'literal', value: 8 },
            ],
            operator: '*/',
          },
          name: 'x2',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartPredefinedProcess',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 1 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 1 },
            },
            { type: 'close' },
          ],
          extrusionOk: !1,
          fill: 'norm',
          height: { kind: 'literal', value: 1 },
          stroke: !1,
          width: { kind: 'literal', value: 1 },
        },
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 8 },
            },
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 7 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 7 },
              y: { kind: 'literal', value: 8 },
            },
          ],
          extrusionOk: !1,
          fill: 'none',
          height: { kind: 'literal', value: 8 },
          stroke: !0,
          width: { kind: 'literal', value: 8 },
        },
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 1 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 1 },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'none',
          height: { kind: 'literal', value: 1 },
          stroke: !0,
          width: { kind: 'literal', value: 1 },
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [],
      name: 'flowChartInternalStorage',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 1 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 1 },
            },
            { type: 'close' },
          ],
          extrusionOk: !1,
          fill: 'norm',
          height: { kind: 'literal', value: 1 },
          stroke: !1,
          width: { kind: 'literal', value: 1 },
        },
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 8 },
            },
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 1 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 8 },
              y: { kind: 'literal', value: 1 },
            },
          ],
          extrusionOk: !1,
          fill: 'none',
          height: { kind: 'literal', value: 8 },
          stroke: !0,
          width: { kind: 'literal', value: 8 },
        },
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 1 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 1 },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'none',
          height: { kind: 'literal', value: 1 },
          stroke: !0,
          width: { kind: 'literal', value: 1 },
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'h' },
              { kind: 'literal', value: 17322 },
              { kind: 'literal', value: 21600 },
            ],
            operator: '*/',
          },
          name: 'y1',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'h' },
              { kind: 'literal', value: 20172 },
              { kind: 'literal', value: 21600 },
            ],
            operator: '*/',
          },
          name: 'y2',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartDocument',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 21600 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 21600 },
              y: { kind: 'literal', value: 17322 },
            },
            {
              control1: {
                x: { kind: 'literal', value: 10800 },
                y: { kind: 'literal', value: 17322 },
              },
              control2: {
                x: { kind: 'literal', value: 10800 },
                y: { kind: 'literal', value: 23922 },
              },
              end: {
                x: { kind: 'literal', value: 0 },
                y: { kind: 'literal', value: 20172 },
              },
              type: 'cubicBezTo',
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'norm',
          height: { kind: 'literal', value: 21600 },
          stroke: !0,
          width: { kind: 'literal', value: 21600 },
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'h' },
              { kind: 'literal', value: 3675 },
              { kind: 'literal', value: 21600 },
            ],
            operator: '*/',
          },
          name: 'y2',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'h' },
              { kind: 'literal', value: 20782 },
              { kind: 'literal', value: 21600 },
            ],
            operator: '*/',
          },
          name: 'y8',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'w' },
              { kind: 'literal', value: 9298 },
              { kind: 'literal', value: 21600 },
            ],
            operator: '*/',
          },
          name: 'x3',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'w' },
              { kind: 'literal', value: 12286 },
              { kind: 'literal', value: 21600 },
            ],
            operator: '*/',
          },
          name: 'x4',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'w' },
              { kind: 'literal', value: 18595 },
              { kind: 'literal', value: 21600 },
            ],
            operator: '*/',
          },
          name: 'x5',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartMultidocument',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 20782 },
            },
            {
              control1: {
                x: { kind: 'literal', value: 9298 },
                y: { kind: 'literal', value: 23542 },
              },
              control2: {
                x: { kind: 'literal', value: 9298 },
                y: { kind: 'literal', value: 18022 },
              },
              end: {
                x: { kind: 'literal', value: 18595 },
                y: { kind: 'literal', value: 18022 },
              },
              type: 'cubicBezTo',
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 18595 },
              y: { kind: 'literal', value: 3675 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 3675 },
            },
            { type: 'close' },
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 1532 },
              y: { kind: 'literal', value: 3675 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1532 },
              y: { kind: 'literal', value: 1815 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 2e4 },
              y: { kind: 'literal', value: 1815 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 2e4 },
              y: { kind: 'literal', value: 16252 },
            },
            {
              control1: {
                x: { kind: 'literal', value: 19298 },
                y: { kind: 'literal', value: 16252 },
              },
              control2: {
                x: { kind: 'literal', value: 18595 },
                y: { kind: 'literal', value: 16352 },
              },
              end: {
                x: { kind: 'literal', value: 18595 },
                y: { kind: 'literal', value: 16352 },
              },
              type: 'cubicBezTo',
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 18595 },
              y: { kind: 'literal', value: 3675 },
            },
            { type: 'close' },
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 2972 },
              y: { kind: 'literal', value: 1815 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 2972 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 21600 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 21600 },
              y: { kind: 'literal', value: 14392 },
            },
            {
              control1: {
                x: { kind: 'literal', value: 20800 },
                y: { kind: 'literal', value: 14392 },
              },
              control2: {
                x: { kind: 'literal', value: 2e4 },
                y: { kind: 'literal', value: 14467 },
              },
              end: {
                x: { kind: 'literal', value: 2e4 },
                y: { kind: 'literal', value: 14467 },
              },
              type: 'cubicBezTo',
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 2e4 },
              y: { kind: 'literal', value: 1815 },
            },
            { type: 'close' },
          ],
          extrusionOk: !1,
          fill: 'norm',
          height: { kind: 'literal', value: 21600 },
          stroke: !1,
          width: { kind: 'literal', value: 21600 },
        },
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 3675 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 18595 },
              y: { kind: 'literal', value: 3675 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 18595 },
              y: { kind: 'literal', value: 18022 },
            },
            {
              control1: {
                x: { kind: 'literal', value: 9298 },
                y: { kind: 'literal', value: 18022 },
              },
              control2: {
                x: { kind: 'literal', value: 9298 },
                y: { kind: 'literal', value: 23542 },
              },
              end: {
                x: { kind: 'literal', value: 0 },
                y: { kind: 'literal', value: 20782 },
              },
              type: 'cubicBezTo',
            },
            { type: 'close' },
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 1532 },
              y: { kind: 'literal', value: 3675 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1532 },
              y: { kind: 'literal', value: 1815 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 2e4 },
              y: { kind: 'literal', value: 1815 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 2e4 },
              y: { kind: 'literal', value: 16252 },
            },
            {
              control1: {
                x: { kind: 'literal', value: 19298 },
                y: { kind: 'literal', value: 16252 },
              },
              control2: {
                x: { kind: 'literal', value: 18595 },
                y: { kind: 'literal', value: 16352 },
              },
              end: {
                x: { kind: 'literal', value: 18595 },
                y: { kind: 'literal', value: 16352 },
              },
              type: 'cubicBezTo',
            },
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 2972 },
              y: { kind: 'literal', value: 1815 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 2972 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 21600 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 21600 },
              y: { kind: 'literal', value: 14392 },
            },
            {
              control1: {
                x: { kind: 'literal', value: 20800 },
                y: { kind: 'literal', value: 14392 },
              },
              control2: {
                x: { kind: 'literal', value: 2e4 },
                y: { kind: 'literal', value: 14467 },
              },
              end: {
                x: { kind: 'literal', value: 2e4 },
                y: { kind: 'literal', value: 14467 },
              },
              type: 'cubicBezTo',
            },
          ],
          extrusionOk: !1,
          fill: 'none',
          height: { kind: 'literal', value: 21600 },
          stroke: !0,
          width: { kind: 'literal', value: 21600 },
        },
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 20782 },
            },
            {
              control1: {
                x: { kind: 'literal', value: 9298 },
                y: { kind: 'literal', value: 23542 },
              },
              control2: {
                x: { kind: 'literal', value: 9298 },
                y: { kind: 'literal', value: 18022 },
              },
              end: {
                x: { kind: 'literal', value: 18595 },
                y: { kind: 'literal', value: 18022 },
              },
              type: 'cubicBezTo',
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 18595 },
              y: { kind: 'literal', value: 16352 },
            },
            {
              control1: {
                x: { kind: 'literal', value: 18595 },
                y: { kind: 'literal', value: 16352 },
              },
              control2: {
                x: { kind: 'literal', value: 19298 },
                y: { kind: 'literal', value: 16252 },
              },
              end: {
                x: { kind: 'literal', value: 2e4 },
                y: { kind: 'literal', value: 16252 },
              },
              type: 'cubicBezTo',
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 2e4 },
              y: { kind: 'literal', value: 14467 },
            },
            {
              control1: {
                x: { kind: 'literal', value: 2e4 },
                y: { kind: 'literal', value: 14467 },
              },
              control2: {
                x: { kind: 'literal', value: 20800 },
                y: { kind: 'literal', value: 14392 },
              },
              end: {
                x: { kind: 'literal', value: 21600 },
                y: { kind: 'literal', value: 14392 },
              },
              type: 'cubicBezTo',
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 21600 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 2972 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 2972 },
              y: { kind: 'literal', value: 1815 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1532 },
              y: { kind: 'literal', value: 1815 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1532 },
              y: { kind: 'literal', value: 3675 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 3675 },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'none',
          height: { kind: 'literal', value: 21600 },
          stroke: !1,
          width: { kind: 'literal', value: 21600 },
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'w' },
              { kind: 'literal', value: 1018 },
              { kind: 'literal', value: 21600 },
            ],
            operator: '*/',
          },
          name: 'il',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'w' },
              { kind: 'literal', value: 20582 },
              { kind: 'literal', value: 21600 },
            ],
            operator: '*/',
          },
          name: 'ir',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'h' },
              { kind: 'literal', value: 3163 },
              { kind: 'literal', value: 21600 },
            ],
            operator: '*/',
          },
          name: 'it',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'h' },
              { kind: 'literal', value: 18437 },
              { kind: 'literal', value: 21600 },
            ],
            operator: '*/',
          },
          name: 'ib',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartTerminator',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 3475 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 18125 },
              y: { kind: 'literal', value: 0 },
            },
            {
              heightRadius: { kind: 'literal', value: 10800 },
              startAngle: { kind: 'guide', name: '3cd4' },
              sweepAngle: { kind: 'guide', name: 'cd2' },
              type: 'arcTo',
              widthRadius: { kind: 'literal', value: 3475 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 3475 },
              y: { kind: 'literal', value: 21600 },
            },
            {
              heightRadius: { kind: 'literal', value: 10800 },
              startAngle: { kind: 'guide', name: 'cd4' },
              sweepAngle: { kind: 'guide', name: 'cd2' },
              type: 'arcTo',
              widthRadius: { kind: 'literal', value: 3475 },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'norm',
          height: { kind: 'literal', value: 21600 },
          stroke: !0,
          width: { kind: 'literal', value: 21600 },
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'w' },
              { kind: 'literal', value: 4 },
              { kind: 'literal', value: 5 },
            ],
            operator: '*/',
          },
          name: 'x2',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartPreparation',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 5 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 2 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 8 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 10 },
              y: { kind: 'literal', value: 5 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 8 },
              y: { kind: 'literal', value: 10 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 2 },
              y: { kind: 'literal', value: 10 },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'norm',
          height: { kind: 'literal', value: 10 },
          stroke: !0,
          width: { kind: 'literal', value: 10 },
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [],
      name: 'flowChartManualInput',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 1 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 5 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 5 },
              y: { kind: 'literal', value: 5 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 5 },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'norm',
          height: { kind: 'literal', value: 5 },
          stroke: !0,
          width: { kind: 'literal', value: 5 },
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'w' },
              { kind: 'literal', value: 4 },
              { kind: 'literal', value: 5 },
            ],
            operator: '*/',
          },
          name: 'x3',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'w' },
              { kind: 'literal', value: 9 },
              { kind: 'literal', value: 10 },
            ],
            operator: '*/',
          },
          name: 'x4',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartManualOperation',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 5 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 4 },
              y: { kind: 'literal', value: 5 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 5 },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'norm',
          height: { kind: 'literal', value: 5 },
          stroke: !0,
          width: { kind: 'literal', value: 5 },
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'wd2' },
              { kind: 'literal', value: 27e5 },
            ],
            operator: 'cos',
          },
          name: 'idx',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'hd2' },
              { kind: 'literal', value: 27e5 },
            ],
            operator: 'sin',
          },
          name: 'idy',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'hc' },
              { kind: 'literal', value: 0 },
              { kind: 'guide', name: 'idx' },
            ],
            operator: '+-',
          },
          name: 'il',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'hc' },
              { kind: 'guide', name: 'idx' },
              { kind: 'literal', value: 0 },
            ],
            operator: '+-',
          },
          name: 'ir',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'vc' },
              { kind: 'literal', value: 0 },
              { kind: 'guide', name: 'idy' },
            ],
            operator: '+-',
          },
          name: 'it',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'vc' },
              { kind: 'guide', name: 'idy' },
              { kind: 'literal', value: 0 },
            ],
            operator: '+-',
          },
          name: 'ib',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartConnector',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'guide', name: 'l' },
              y: { kind: 'guide', name: 'vc' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'guide', name: 'cd2' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'guide', name: '3cd4' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'literal', value: 0 },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'guide', name: 'cd4' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'norm',
          height: null,
          stroke: !0,
          width: null,
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'h' },
              { kind: 'literal', value: 4 },
              { kind: 'literal', value: 5 },
            ],
            operator: '*/',
          },
          name: 'y1',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartOffpageConnector',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 10 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 10 },
              y: { kind: 'literal', value: 8 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 5 },
              y: { kind: 'literal', value: 10 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 8 },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'norm',
          height: { kind: 'literal', value: 10 },
          stroke: !0,
          width: { kind: 'literal', value: 10 },
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [],
      name: 'flowChartPunchedCard',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 1 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 5 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 5 },
              y: { kind: 'literal', value: 5 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 5 },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'norm',
          height: { kind: 'literal', value: 5 },
          stroke: !0,
          width: { kind: 'literal', value: 5 },
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'h' },
              { kind: 'literal', value: 9 },
              { kind: 'literal', value: 10 },
            ],
            operator: '*/',
          },
          name: 'y2',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'h' },
              { kind: 'literal', value: 4 },
              { kind: 'literal', value: 5 },
            ],
            operator: '*/',
          },
          name: 'ib',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartPunchedTape',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 2 },
            },
            {
              heightRadius: { kind: 'literal', value: 2 },
              startAngle: { kind: 'guide', name: 'cd2' },
              sweepAngle: { kind: 'literal', value: -108e5 },
              type: 'arcTo',
              widthRadius: { kind: 'literal', value: 5 },
            },
            {
              heightRadius: { kind: 'literal', value: 2 },
              startAngle: { kind: 'guide', name: 'cd2' },
              sweepAngle: { kind: 'guide', name: 'cd2' },
              type: 'arcTo',
              widthRadius: { kind: 'literal', value: 5 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 20 },
              y: { kind: 'literal', value: 18 },
            },
            {
              heightRadius: { kind: 'literal', value: 2 },
              startAngle: { kind: 'literal', value: 0 },
              sweepAngle: { kind: 'literal', value: -108e5 },
              type: 'arcTo',
              widthRadius: { kind: 'literal', value: 5 },
            },
            {
              heightRadius: { kind: 'literal', value: 2 },
              startAngle: { kind: 'literal', value: 0 },
              sweepAngle: { kind: 'guide', name: 'cd2' },
              type: 'arcTo',
              widthRadius: { kind: 'literal', value: 5 },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'norm',
          height: { kind: 'literal', value: 20 },
          stroke: !0,
          width: { kind: 'literal', value: 20 },
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'wd2' },
              { kind: 'literal', value: 27e5 },
            ],
            operator: 'cos',
          },
          name: 'idx',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'hd2' },
              { kind: 'literal', value: 27e5 },
            ],
            operator: 'sin',
          },
          name: 'idy',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'hc' },
              { kind: 'literal', value: 0 },
              { kind: 'guide', name: 'idx' },
            ],
            operator: '+-',
          },
          name: 'il',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'hc' },
              { kind: 'guide', name: 'idx' },
              { kind: 'literal', value: 0 },
            ],
            operator: '+-',
          },
          name: 'ir',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'vc' },
              { kind: 'literal', value: 0 },
              { kind: 'guide', name: 'idy' },
            ],
            operator: '+-',
          },
          name: 'it',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'vc' },
              { kind: 'guide', name: 'idy' },
              { kind: 'literal', value: 0 },
            ],
            operator: '+-',
          },
          name: 'ib',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartSummingJunction',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'guide', name: 'l' },
              y: { kind: 'guide', name: 'vc' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'guide', name: 'cd2' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'guide', name: '3cd4' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'literal', value: 0 },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'guide', name: 'cd4' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            { type: 'close' },
          ],
          extrusionOk: !1,
          fill: 'norm',
          height: null,
          stroke: !1,
          width: null,
        },
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'guide', name: 'il' },
              y: { kind: 'guide', name: 'it' },
            },
            {
              type: 'lnTo',
              x: { kind: 'guide', name: 'ir' },
              y: { kind: 'guide', name: 'ib' },
            },
            {
              type: 'moveTo',
              x: { kind: 'guide', name: 'ir' },
              y: { kind: 'guide', name: 'it' },
            },
            {
              type: 'lnTo',
              x: { kind: 'guide', name: 'il' },
              y: { kind: 'guide', name: 'ib' },
            },
          ],
          extrusionOk: !1,
          fill: 'none',
          height: null,
          stroke: !0,
          width: null,
        },
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'guide', name: 'l' },
              y: { kind: 'guide', name: 'vc' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'guide', name: 'cd2' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'guide', name: '3cd4' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'literal', value: 0 },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'guide', name: 'cd4' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'none',
          height: null,
          stroke: !0,
          width: null,
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'wd2' },
              { kind: 'literal', value: 27e5 },
            ],
            operator: 'cos',
          },
          name: 'idx',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'hd2' },
              { kind: 'literal', value: 27e5 },
            ],
            operator: 'sin',
          },
          name: 'idy',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'hc' },
              { kind: 'literal', value: 0 },
              { kind: 'guide', name: 'idx' },
            ],
            operator: '+-',
          },
          name: 'il',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'hc' },
              { kind: 'guide', name: 'idx' },
              { kind: 'literal', value: 0 },
            ],
            operator: '+-',
          },
          name: 'ir',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'vc' },
              { kind: 'literal', value: 0 },
              { kind: 'guide', name: 'idy' },
            ],
            operator: '+-',
          },
          name: 'it',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'vc' },
              { kind: 'guide', name: 'idy' },
              { kind: 'literal', value: 0 },
            ],
            operator: '+-',
          },
          name: 'ib',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartOr',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'guide', name: 'l' },
              y: { kind: 'guide', name: 'vc' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'guide', name: 'cd2' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'guide', name: '3cd4' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'literal', value: 0 },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'guide', name: 'cd4' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            { type: 'close' },
          ],
          extrusionOk: !1,
          fill: 'norm',
          height: null,
          stroke: !1,
          width: null,
        },
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'guide', name: 'hc' },
              y: { kind: 'guide', name: 't' },
            },
            {
              type: 'lnTo',
              x: { kind: 'guide', name: 'hc' },
              y: { kind: 'guide', name: 'b' },
            },
            {
              type: 'moveTo',
              x: { kind: 'guide', name: 'l' },
              y: { kind: 'guide', name: 'vc' },
            },
            {
              type: 'lnTo',
              x: { kind: 'guide', name: 'r' },
              y: { kind: 'guide', name: 'vc' },
            },
          ],
          extrusionOk: !1,
          fill: 'none',
          height: null,
          stroke: !0,
          width: null,
        },
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'guide', name: 'l' },
              y: { kind: 'guide', name: 'vc' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'guide', name: 'cd2' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'guide', name: '3cd4' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'literal', value: 0 },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'guide', name: 'cd4' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'none',
          height: null,
          stroke: !0,
          width: null,
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'w' },
              { kind: 'literal', value: 3 },
              { kind: 'literal', value: 4 },
            ],
            operator: '*/',
          },
          name: 'ir',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'h' },
              { kind: 'literal', value: 3 },
              { kind: 'literal', value: 4 },
            ],
            operator: '*/',
          },
          name: 'ib',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartCollate',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 2 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 1 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 2 },
              y: { kind: 'literal', value: 2 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 2 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 1 },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'norm',
          height: { kind: 'literal', value: 2 },
          stroke: !0,
          width: { kind: 'literal', value: 2 },
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'w' },
              { kind: 'literal', value: 3 },
              { kind: 'literal', value: 4 },
            ],
            operator: '*/',
          },
          name: 'ir',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'h' },
              { kind: 'literal', value: 3 },
              { kind: 'literal', value: 4 },
            ],
            operator: '*/',
          },
          name: 'ib',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartSort',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 1 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 2 },
              y: { kind: 'literal', value: 1 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 2 },
            },
            { type: 'close' },
          ],
          extrusionOk: !1,
          fill: 'norm',
          height: { kind: 'literal', value: 2 },
          stroke: !1,
          width: { kind: 'literal', value: 2 },
        },
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 1 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 2 },
              y: { kind: 'literal', value: 1 },
            },
          ],
          extrusionOk: !1,
          fill: 'none',
          height: { kind: 'literal', value: 2 },
          stroke: !0,
          width: { kind: 'literal', value: 2 },
        },
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 1 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 2 },
              y: { kind: 'literal', value: 1 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 2 },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'none',
          height: { kind: 'literal', value: 2 },
          stroke: !0,
          width: { kind: 'literal', value: 2 },
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'w' },
              { kind: 'literal', value: 3 },
              { kind: 'literal', value: 4 },
            ],
            operator: '*/',
          },
          name: 'x2',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartExtract',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 2 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 2 },
              y: { kind: 'literal', value: 2 },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'norm',
          height: { kind: 'literal', value: 2 },
          stroke: !0,
          width: { kind: 'literal', value: 2 },
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'w' },
              { kind: 'literal', value: 3 },
              { kind: 'literal', value: 4 },
            ],
            operator: '*/',
          },
          name: 'x2',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartMerge',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 2 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 2 },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'norm',
          height: { kind: 'literal', value: 2 },
          stroke: !0,
          width: { kind: 'literal', value: 2 },
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'w' },
              { kind: 'literal', value: 5 },
              { kind: 'literal', value: 6 },
            ],
            operator: '*/',
          },
          name: 'x2',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartOnlineStorage',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 6 },
              y: { kind: 'literal', value: 0 },
            },
            {
              heightRadius: { kind: 'literal', value: 3 },
              startAngle: { kind: 'guide', name: '3cd4' },
              sweepAngle: { kind: 'literal', value: -108e5 },
              type: 'arcTo',
              widthRadius: { kind: 'literal', value: 1 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 6 },
            },
            {
              heightRadius: { kind: 'literal', value: 3 },
              startAngle: { kind: 'guide', name: 'cd4' },
              sweepAngle: { kind: 'guide', name: 'cd2' },
              type: 'arcTo',
              widthRadius: { kind: 'literal', value: 1 },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'norm',
          height: { kind: 'literal', value: 6 },
          stroke: !0,
          width: { kind: 'literal', value: 6 },
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'wd2' },
              { kind: 'literal', value: 27e5 },
            ],
            operator: 'cos',
          },
          name: 'idx',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'hd2' },
              { kind: 'literal', value: 27e5 },
            ],
            operator: 'sin',
          },
          name: 'idy',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'hc' },
              { kind: 'guide', name: 'idx' },
              { kind: 'literal', value: 0 },
            ],
            operator: '+-',
          },
          name: 'ir',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'vc' },
              { kind: 'literal', value: 0 },
              { kind: 'guide', name: 'idy' },
            ],
            operator: '+-',
          },
          name: 'it',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'vc' },
              { kind: 'guide', name: 'idy' },
              { kind: 'literal', value: 0 },
            ],
            operator: '+-',
          },
          name: 'ib',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartDelay',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'guide', name: 'l' },
              y: { kind: 'guide', name: 't' },
            },
            {
              type: 'lnTo',
              x: { kind: 'guide', name: 'hc' },
              y: { kind: 'guide', name: 't' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'guide', name: '3cd4' },
              sweepAngle: { kind: 'guide', name: 'cd2' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              type: 'lnTo',
              x: { kind: 'guide', name: 'l' },
              y: { kind: 'guide', name: 'b' },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'norm',
          height: null,
          stroke: !0,
          width: null,
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'wd2' },
              { kind: 'literal', value: 27e5 },
            ],
            operator: 'cos',
          },
          name: 'idx',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'hd2' },
              { kind: 'literal', value: 27e5 },
            ],
            operator: 'sin',
          },
          name: 'idy',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'hc' },
              { kind: 'literal', value: 0 },
              { kind: 'guide', name: 'idx' },
            ],
            operator: '+-',
          },
          name: 'il',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'hc' },
              { kind: 'guide', name: 'idx' },
              { kind: 'literal', value: 0 },
            ],
            operator: '+-',
          },
          name: 'ir',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'vc' },
              { kind: 'literal', value: 0 },
              { kind: 'guide', name: 'idy' },
            ],
            operator: '+-',
          },
          name: 'it',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'vc' },
              { kind: 'guide', name: 'idy' },
              { kind: 'literal', value: 0 },
            ],
            operator: '+-',
          },
          name: 'ib',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'w' },
              { kind: 'guide', name: 'h' },
            ],
            operator: 'at2',
          },
          name: 'ang1',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartMagneticTape',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'guide', name: 'hc' },
              y: { kind: 'guide', name: 'b' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'guide', name: 'cd4' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'guide', name: 'cd2' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'guide', name: '3cd4' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'literal', value: 0 },
              sweepAngle: { kind: 'guide', name: 'ang1' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              type: 'lnTo',
              x: { kind: 'guide', name: 'r' },
              y: { kind: 'guide', name: 'ib' },
            },
            {
              type: 'lnTo',
              x: { kind: 'guide', name: 'r' },
              y: { kind: 'guide', name: 'b' },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'norm',
          height: null,
          stroke: !0,
          width: null,
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'h' },
              { kind: 'literal', value: 5 },
              { kind: 'literal', value: 6 },
            ],
            operator: '*/',
          },
          name: 'y3',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartMagneticDisk',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 1 },
            },
            {
              heightRadius: { kind: 'literal', value: 1 },
              startAngle: { kind: 'guide', name: 'cd2' },
              sweepAngle: { kind: 'guide', name: 'cd2' },
              type: 'arcTo',
              widthRadius: { kind: 'literal', value: 3 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 6 },
              y: { kind: 'literal', value: 5 },
            },
            {
              heightRadius: { kind: 'literal', value: 1 },
              startAngle: { kind: 'literal', value: 0 },
              sweepAngle: { kind: 'guide', name: 'cd2' },
              type: 'arcTo',
              widthRadius: { kind: 'literal', value: 3 },
            },
            { type: 'close' },
          ],
          extrusionOk: !1,
          fill: 'norm',
          height: { kind: 'literal', value: 6 },
          stroke: !1,
          width: { kind: 'literal', value: 6 },
        },
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 6 },
              y: { kind: 'literal', value: 1 },
            },
            {
              heightRadius: { kind: 'literal', value: 1 },
              startAngle: { kind: 'literal', value: 0 },
              sweepAngle: { kind: 'guide', name: 'cd2' },
              type: 'arcTo',
              widthRadius: { kind: 'literal', value: 3 },
            },
          ],
          extrusionOk: !1,
          fill: 'none',
          height: { kind: 'literal', value: 6 },
          stroke: !0,
          width: { kind: 'literal', value: 6 },
        },
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 1 },
            },
            {
              heightRadius: { kind: 'literal', value: 1 },
              startAngle: { kind: 'guide', name: 'cd2' },
              sweepAngle: { kind: 'guide', name: 'cd2' },
              type: 'arcTo',
              widthRadius: { kind: 'literal', value: 3 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 6 },
              y: { kind: 'literal', value: 5 },
            },
            {
              heightRadius: { kind: 'literal', value: 1 },
              startAngle: { kind: 'literal', value: 0 },
              sweepAngle: { kind: 'guide', name: 'cd2' },
              type: 'arcTo',
              widthRadius: { kind: 'literal', value: 3 },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'none',
          height: { kind: 'literal', value: 6 },
          stroke: !0,
          width: { kind: 'literal', value: 6 },
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'w' },
              { kind: 'literal', value: 2 },
              { kind: 'literal', value: 3 },
            ],
            operator: '*/',
          },
          name: 'x2',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartMagneticDrum',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 5 },
              y: { kind: 'literal', value: 0 },
            },
            {
              heightRadius: { kind: 'literal', value: 3 },
              startAngle: { kind: 'guide', name: '3cd4' },
              sweepAngle: { kind: 'guide', name: 'cd2' },
              type: 'arcTo',
              widthRadius: { kind: 'literal', value: 1 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 6 },
            },
            {
              heightRadius: { kind: 'literal', value: 3 },
              startAngle: { kind: 'guide', name: 'cd4' },
              sweepAngle: { kind: 'guide', name: 'cd2' },
              type: 'arcTo',
              widthRadius: { kind: 'literal', value: 1 },
            },
            { type: 'close' },
          ],
          extrusionOk: !1,
          fill: 'norm',
          height: { kind: 'literal', value: 6 },
          stroke: !1,
          width: { kind: 'literal', value: 6 },
        },
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 5 },
              y: { kind: 'literal', value: 6 },
            },
            {
              heightRadius: { kind: 'literal', value: 3 },
              startAngle: { kind: 'guide', name: 'cd4' },
              sweepAngle: { kind: 'guide', name: 'cd2' },
              type: 'arcTo',
              widthRadius: { kind: 'literal', value: 1 },
            },
          ],
          extrusionOk: !1,
          fill: 'none',
          height: { kind: 'literal', value: 6 },
          stroke: !0,
          width: { kind: 'literal', value: 6 },
        },
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 5 },
              y: { kind: 'literal', value: 0 },
            },
            {
              heightRadius: { kind: 'literal', value: 3 },
              startAngle: { kind: 'guide', name: '3cd4' },
              sweepAngle: { kind: 'guide', name: 'cd2' },
              type: 'arcTo',
              widthRadius: { kind: 'literal', value: 1 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 6 },
            },
            {
              heightRadius: { kind: 'literal', value: 3 },
              startAngle: { kind: 'guide', name: 'cd4' },
              sweepAngle: { kind: 'guide', name: 'cd2' },
              type: 'arcTo',
              widthRadius: { kind: 'literal', value: 1 },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'none',
          height: { kind: 'literal', value: 6 },
          stroke: !0,
          width: { kind: 'literal', value: 6 },
        },
      ],
    },
    {
      adjustmentGuides: [],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'w' },
              { kind: 'literal', value: 5 },
              { kind: 'literal', value: 6 },
            ],
            operator: '*/',
          },
          name: 'x2',
          normalizedFrom: null,
        },
      ],
      name: 'flowChartDisplay',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'literal', value: 0 },
              y: { kind: 'literal', value: 3 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 0 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 5 },
              y: { kind: 'literal', value: 0 },
            },
            {
              heightRadius: { kind: 'literal', value: 3 },
              startAngle: { kind: 'guide', name: '3cd4' },
              sweepAngle: { kind: 'guide', name: 'cd2' },
              type: 'arcTo',
              widthRadius: { kind: 'literal', value: 1 },
            },
            {
              type: 'lnTo',
              x: { kind: 'literal', value: 1 },
              y: { kind: 'literal', value: 6 },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'norm',
          height: { kind: 'literal', value: 6 },
          stroke: !0,
          width: { kind: 'literal', value: 6 },
        },
      ],
    },
    {
      adjustmentGuides: [
        {
          formula: {
            operands: [{ kind: 'literal', value: 25e3 }],
            operator: 'val',
          },
          name: 'adj',
          normalizedFrom: null,
        },
      ],
      calculatedGuides: [
        {
          formula: {
            operands: [
              { kind: 'literal', value: 0 },
              { kind: 'guide', name: 'adj' },
              { kind: 'literal', value: 5e4 },
            ],
            operator: 'pin',
          },
          name: 'a',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'ss' },
              { kind: 'guide', name: 'a' },
              { kind: 'literal', value: 1e5 },
            ],
            operator: '*/',
          },
          name: 'dr',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'wd2' },
              { kind: 'literal', value: 0 },
              { kind: 'guide', name: 'dr' },
            ],
            operator: '+-',
          },
          name: 'iwd2',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'hd2' },
              { kind: 'literal', value: 0 },
              { kind: 'guide', name: 'dr' },
            ],
            operator: '+-',
          },
          name: 'ihd2',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'wd2' },
              { kind: 'literal', value: 27e5 },
            ],
            operator: 'cos',
          },
          name: 'idx',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'hd2' },
              { kind: 'literal', value: 27e5 },
            ],
            operator: 'sin',
          },
          name: 'idy',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'hc' },
              { kind: 'literal', value: 0 },
              { kind: 'guide', name: 'idx' },
            ],
            operator: '+-',
          },
          name: 'il',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'hc' },
              { kind: 'guide', name: 'idx' },
              { kind: 'literal', value: 0 },
            ],
            operator: '+-',
          },
          name: 'ir',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'vc' },
              { kind: 'literal', value: 0 },
              { kind: 'guide', name: 'idy' },
            ],
            operator: '+-',
          },
          name: 'it',
          normalizedFrom: null,
        },
        {
          formula: {
            operands: [
              { kind: 'guide', name: 'vc' },
              { kind: 'guide', name: 'idy' },
              { kind: 'literal', value: 0 },
            ],
            operator: '+-',
          },
          name: 'ib',
          normalizedFrom: null,
        },
      ],
      name: 'donut',
      paths: [
        {
          commands: [
            {
              type: 'moveTo',
              x: { kind: 'guide', name: 'l' },
              y: { kind: 'guide', name: 'vc' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'guide', name: 'cd2' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'guide', name: '3cd4' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'literal', value: 0 },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'hd2' },
              startAngle: { kind: 'guide', name: 'cd4' },
              sweepAngle: { kind: 'guide', name: 'cd4' },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'wd2' },
            },
            { type: 'close' },
            {
              type: 'moveTo',
              x: { kind: 'guide', name: 'dr' },
              y: { kind: 'guide', name: 'vc' },
            },
            {
              heightRadius: { kind: 'guide', name: 'ihd2' },
              startAngle: { kind: 'guide', name: 'cd2' },
              sweepAngle: { kind: 'literal', value: -54e5 },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'iwd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'ihd2' },
              startAngle: { kind: 'guide', name: 'cd4' },
              sweepAngle: { kind: 'literal', value: -54e5 },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'iwd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'ihd2' },
              startAngle: { kind: 'literal', value: 0 },
              sweepAngle: { kind: 'literal', value: -54e5 },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'iwd2' },
            },
            {
              heightRadius: { kind: 'guide', name: 'ihd2' },
              startAngle: { kind: 'guide', name: '3cd4' },
              sweepAngle: { kind: 'literal', value: -54e5 },
              type: 'arcTo',
              widthRadius: { kind: 'guide', name: 'iwd2' },
            },
            { type: 'close' },
          ],
          extrusionOk: !0,
          fill: 'norm',
          height: null,
          stroke: !0,
          width: null,
        },
      ],
    },
  ],
  or = new Map(rr.map((t) => [t.name.toLowerCase(), t]))
Object.freeze(rr.map(({ name: t }) => t))
var lr = Object.freeze(
  rr.filter(({ paths: t }) => t.length > 1).map(({ name: t }) => t),
)
function sr(t, e) {
  if (!Number.isFinite(t)) throw new Error(`${e} must be finite`)
  return Object.is(t, -0) ? 0 : t
}
function ar(t, e) {
  const n = sr(t, e)
  if (n <= 0) throw new Error(`${e} must be greater than zero`)
  return n
}
function dr(t, e, n) {
  if (0 === e) throw new Error(`Division by zero while evaluating ${n}`)
  return t / e
}
function cr(t, e, n) {
  if ('literal' === t.kind) return sr(t.value, `${n} literal`)
  const i = e.get(t.name)
  if (void 0 === i) throw new Error(`${n}: unknown guide ${t.name}`)
  return sr(i, `${n} guide ${t.name}`)
}
function ur(t, e) {
  return (function (t, e) {
    if (!Object.prototype.hasOwnProperty.call(ir, t))
      throw new Error(`Unknown OOXML guide formula operator: ${t}`)
    const n = t,
      i = ir[n]
    if (e.length !== i)
      throw new Error(
        `OOXML guide formula operator ${t} expects ${i} operands; received ${e.length}`,
      )
    const r = e.map((t, e) => sr(t, `OOXML guide formula operand ${e + 1}`))
    let o
    switch (n) {
      case '*/':
        o = dr(r[0] * r[1], r[2], '*/')
        break
      case '+-':
        o = r[0] + r[1] - r[2]
        break
      case '+/':
        o = dr(r[0] + r[1], r[2], '+/')
        break
      case '?:':
        o = r[0] > 0 ? r[1] : r[2]
        break
      case 'abs':
        o = Math.abs(r[0])
        break
      case 'at2':
        o = 0 === r[0] && 0 === r[1] ? 0 : Math.atan2(r[1], r[0]) * er
        break
      case 'cat2':
        o = r[0] * Math.cos(Math.atan2(r[2], r[1]))
        break
      case 'cos':
        o = r[0] * Math.cos(r[1] * nr)
        break
      case 'max':
        o = Math.max(r[0], r[1])
        break
      case 'min':
        o = Math.min(r[0], r[1])
        break
      case 'mod':
        o = Math.hypot(r[0], r[1], r[2])
        break
      case 'pin':
        o = r[1] < r[0] ? r[0] : r[1] > r[2] ? r[2] : r[1]
        break
      case 'sat2':
        o = r[0] * Math.sin(Math.atan2(r[2], r[1]))
        break
      case 'sin':
        o = r[0] * Math.sin(r[1] * nr)
        break
      case 'sqrt':
        o = Math.sqrt(Math.abs(r[0]))
        break
      case 'tan':
        o = r[0] * Math.tan(r[1] * nr)
        break
      case 'val':
        ;[o] = r
    }
    return sr(o, `Non-finite result while evaluating ${t}`)
  })(
    t.operator,
    t.operands.map((t) => cr(t, e, 'Formula operand')),
  )
}
function hr(t, e, n) {
  return { x: cr(t.x, e, `${n} x`), y: cr(t.y, e, `${n} y`) }
}
function pr(t, e, n, i) {
  const r = (function (t, e) {
      const n = ar(t, 'width'),
        i = ar(e, 'height'),
        r = Math.min(n, i)
      return new Map([
        ['3cd4', 162e5],
        ['3cd8', 81e5],
        ['5cd8', 135e5],
        ['7cd8', 189e5],
        ['b', i],
        ['cd2', 108e5],
        ['cd3', 72e5],
        ['cd4', 54e5],
        ['cd8', 27e5],
        ['h', i],
        ['hc', n / 2],
        ['hd2', i / 2],
        ['hd3', i / 3],
        ['hd4', i / 4],
        ['hd5', i / 5],
        ['hd6', i / 6],
        ['hd8', i / 8],
        ['hd10', i / 10],
        ['l', 0],
        ['ls', Math.max(n, i)],
        ['r', n],
        ['ss', r],
        ['ssd2', r / 2],
        ['ssd4', r / 4],
        ['ssd6', r / 6],
        ['ssd8', r / 8],
        ['ssd16', r / 16],
        ['ssd32', r / 32],
        ['t', 0],
        ['vc', i / 2],
        ['w', n],
        ['wd2', n / 2],
        ['wd3', n / 3],
        ['wd4', n / 4],
        ['wd5', n / 5],
        ['wd6', n / 6],
        ['wd8', n / 8],
        ['wd10', n / 10],
        ['wd12', n / 12],
        ['wd32', n / 32],
      ])
    })(e, n),
    o = new Set(t.adjustmentGuides.map(({ name: t }) => t))
  for (const [l, s] of i) o.has(l) && sr(s, `Adjustment ${l}`)
  for (const l of t.adjustmentGuides) {
    const t = i.has(l.name)
      ? sr(i.get(l.name), `Adjustment ${l.name}`)
      : ur(l.formula, r)
    r.set(l.name, t)
  }
  for (const l of t.calculatedGuides) r.set(l.name, ur(l.formula, r))
  return t.paths.map((i, o) => ({
    width:
      null === i.width
        ? e
        : ar(
            cr(i.width, r, `${t.name} path ${o} width`),
            `${t.name} path ${o} width`,
          ),
    height:
      null === i.height
        ? n
        : ar(
            cr(i.height, r, `${t.name} path ${o} height`),
            `${t.name} path ${o} height`,
          ),
    fill: i.fill,
    stroke: i.stroke,
    extrusionOk: i.extrusionOk,
    commands: i.commands.map((e, n) =>
      (function (t, e, n) {
        switch (t.type) {
          case 'moveTo':
          case 'lnTo':
            return { type: t.type, ...hr(t, e, n) }
          case 'quadBezTo':
            return {
              type: t.type,
              control: hr(t.control, e, `${n} control`),
              end: hr(t.end, e, `${n} end`),
            }
          case 'cubicBezTo':
            return {
              type: t.type,
              control1: hr(t.control1, e, `${n} control1`),
              control2: hr(t.control2, e, `${n} control2`),
              end: hr(t.end, e, `${n} end`),
            }
          case 'arcTo':
            return {
              type: t.type,
              widthRadius: cr(t.widthRadius, e, `${n} widthRadius`),
              heightRadius: cr(t.heightRadius, e, `${n} heightRadius`),
              startAngle: cr(t.startAngle, e, `${n} startAngle`),
              sweepAngle: cr(t.sweepAngle, e, `${n} sweepAngle`),
            }
          case 'close':
            return { type: t.type }
        }
      })(e, r, `${t.name} path ${o} command ${n}`),
    ),
  }))
}
function fr(t, e) {
  const n = Number(sr(t, e).toFixed(6))
  return 0 === n || Object.is(n, -0) ? '0' : String(n)
}
function mr(t, e) {
  return `${fr(t.x, `${e} x`)},${fr(t.y, `${e} y`)}`
}
function $r(t, e, n, i) {
  const r = i * nr,
    o = Math.atan2(e * Math.sin(r), n * Math.cos(r))
  return { x: t.x + e * Math.cos(o), y: t.y + n * Math.sin(o) }
}
function gr(t, e, n, i = new Map()) {
  const r = or.get(t.toLowerCase())
  if (!r) return null
  const o = ar(e, `${r.name} width`),
    l = ar(n, `${r.name} height`)
  return pr(r, o, l, i).map((t, e) =>
    (function (t, e, n, i, r) {
      const o = `${t.name} path ${n}`,
        l = i / e.width,
        s = r / e.height,
        a = (t) => ({ x: t.x * l, y: t.y * s }),
        d = []
      let c = null,
        u = null
      for (const [h, p] of e.commands.entries()) {
        const t = `${o} command ${h}`
        switch (p.type) {
          case 'moveTo':
            ;((c = p), (u = p), d.push(`M${mr(a(p), t)}`))
            break
          case 'lnTo':
            if (!c) throw new Error(`${t}: command requires a current point`)
            ;((c = p), d.push(`L${mr(a(p), t)}`))
            break
          case 'quadBezTo':
            if (!c) throw new Error(`${t}: command requires a current point`)
            ;(d.push(
              `Q${mr(a(p.control), `${t} control`)} ${mr(a(p.end), `${t} end`)}`,
            ),
              (c = p.end))
            break
          case 'cubicBezTo':
            if (!c) throw new Error(`${t}: command requires a current point`)
            ;(d.push(
              `C${mr(a(p.control1), `${t} control1`)} ${mr(a(p.control2), `${t} control2`)} ${mr(a(p.end), `${t} end`)}`,
            ),
              (c = p.end))
            break
          case 'arcTo': {
            if (!c) throw new Error(`${t}: command requires a current point`)
            let n = sr(p.widthRadius, `${t} widthRadius`),
              i = sr(p.heightRadius, `${t} heightRadius`)
            const r =
              Number.EPSILON *
              Math.max(1, e.width, e.height, Math.abs(n), Math.abs(i)) *
              64
            if (n < -r || i < -r)
              throw new Error(`${t}: arc radii must be non-negative`)
            if (
              (n < 0 && (n = 0),
              i < 0 && (i = 0),
              0 === n || 0 === i || 0 === p.sweepAngle)
            )
              break
            const o = $r({ x: 0, y: 0 }, n, i, p.startAngle),
              u = { x: c.x - o.x, y: c.y - o.y },
              h = p.sweepAngle / tr,
              f = Math.abs(h) >= 360 ? Math.ceil(Math.abs(h) / 180) : 1,
              m = p.sweepAngle / f,
              $ = Math.abs(m / tr) > 180 ? 1 : 0,
              g = m > 0 ? 1 : 0,
              y = mr({ x: n * l, y: i * s }, `${t} radii`)
            for (let e = 1; e <= f; e += 1)
              ((c = $r(u, n, i, p.startAngle + m * e)),
                d.push(`A${y} 0 ${$},${g} ${mr(a(c), `${t} endpoint ${e}`)}`))
            break
          }
          case 'close':
            if (!u) throw new Error(`${t}: close requires a subpath start`)
            ;(d.push('Z'), (c = u))
        }
      }
      return {
        d: d.join(' '),
        fill: e.fill,
        stroke: e.stroke,
        extrusionOk: e.extrusionOk,
      }
    })(r, t, e, o, l),
  )
}
function yr(t, e, n) {
  return ((null == t ? void 0 : t.get(e)) ?? n) / 1e5
}
function xr(t, e, n) {
  return (null == t ? void 0 : t.get(e)) ?? n
}
function vr(t, e, n, i = 0.4) {
  const r = t / 2,
    o = e / 2,
    l = t / 2,
    s = e / 2,
    a = l * i,
    d = s * i,
    c = 2 * n,
    u = []
  for (let h = 0; h < c; h++) {
    const t = (2 * Math.PI * h) / c - Math.PI / 2,
      e = h % 2 == 0,
      n = e ? s : d,
      i = r + (e ? l : a) * Math.cos(t),
      p = o + n * Math.sin(t)
    u.push(0 === h ? `M${i},${p}` : `L${i},${p}`)
  }
  return (u.push('Z'), u.join(' '))
}
function br(t, e) {
  const n = t.match(/[MLAZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi)
  if (!n) return t
  const i = []
  let r = 0
  for (; r < n.length;) {
    const t = n[r++]
    if (!t) break
    if ((i.push(t), 'Z' !== t)) {
      if ('M' === t || 'L' === t) {
        const t = Number(n[r++]),
          o = Number(n[r++])
        i.push(String(t), String(e - o))
        continue
      }
      if ('A' === t) {
        const t = n[r++],
          o = n[r++],
          l = n[r++],
          s = n[r++],
          a = Number(n[r++]),
          d = Number(n[r++]),
          c = Number(n[r++])
        i.push(t, o, l, s, String(a ? 0 : 1), String(d), String(e - c))
      }
    }
  }
  return i.join(' ')
}
var Mr = new Map()
function wr(t) {
  const e = t.indexOf('Z')
  return -1 === e
    ? { outer: t, remainder: '' }
    : { outer: t.slice(0, e + 1).trim(), remainder: t.slice(e + 1).trim() }
}
function kr(t, e, n, i) {
  const r = Mr.get(t)(e, n, i),
    { outer: o, remainder: l } = wr(r)
  return l
    ? 'curvedRightArrow' === t
      ? [
          { d: l, fill: 'norm', stroke: !0 },
          { d: o, fill: 'norm', stroke: !0 },
        ]
      : [
          { d: o, fill: 'norm', stroke: !0 },
          { d: l, fill: 'norm', stroke: !0 },
        ]
    : [{ d: r, fill: 'norm', stroke: !0 }]
}
function Ar(t, e, n, i) {
  const r = Mr.get('curvedDownArrow')(e, n, i),
    { outer: o, remainder: l } = wr(r),
    s = l
      ? [
          { d: l, fill: 'norm', stroke: !0 },
          { d: o, fill: 'norm', stroke: !0 },
        ]
      : [{ d: r, fill: 'norm', stroke: !0 }]
  return 'curvedDownArrow' === t
    ? s
    : s.map((t) => ({ ...t, d: br(t.d, n) })).reverse()
}
function Lr(t, e, n, i = !1, r = 'circularArrow') {
  const o = t / 2,
    l = e / 2,
    s = t / 2,
    a = e / 2,
    d = Math.min(t, e),
    c = (t) => ((t / 6e4) * Math.PI) / 180,
    u = (t, e) => t * Math.sin(c(e)),
    h = (t, e) => t * Math.cos(c(e)),
    p = (t, e, n) => t * Math.cos(Math.atan2(n, e)),
    f = (t, e, n) => t * Math.sin(Math.atan2(n, e)),
    m = (t, e) => ((180 * Math.atan2(e, t)) / Math.PI) * 6e4,
    $ = (t, e, n) => Math.sqrt(t * t + e * e + n * n),
    g = 'leftCircularArrow' === r,
    y = (null == n ? void 0 : n.get('adj1')) ?? 12500,
    x = (null == n ? void 0 : n.get('adj2')) ?? (g ? -1142319 : 1142319),
    v = (null == n ? void 0 : n.get('adj3')) ?? (g ? 1142319 : 20457681),
    b = (null == n ? void 0 : n.get('adj4')) ?? 108e5,
    M = (null == n ? void 0 : n.get('adj5')) ?? 12500,
    w = Math.max(0, Math.min(M, 25e3)),
    k = 2 * w,
    A = Math.max(0, Math.min(y, k)),
    L = Math.max(1, Math.min(v, 21599999)),
    S = Math.max(0, Math.min(b, 21599999)),
    C = (d * A) / 1e5,
    F = (d * w) / 1e5,
    B = C / 2,
    j = s + B - F,
    E = a + B - F,
    P = j - C,
    T = E - C,
    z = P + B,
    N = T + B,
    R = u(z, L),
    I = h(N, L),
    D = p(z, I, R),
    O = f(N, I, R),
    U = o + D,
    Z = l + O,
    G = Math.min(P, T),
    X = D * D,
    Y = O * O,
    W = G * G,
    H = X - W,
    V = 1 - (0 !== Y ? (0 !== Y ? (H * (Y - W)) / X : 0) / Y : 0),
    q = Math.sqrt(Math.max(0, V)),
    _ = 0 !== O ? (0 !== D ? H / D : 0) / O : 0,
    Q = m(1, 0 !== _ ? (1 + q) / _ : 0),
    K = (Q >= 0 ? Q : Q + 216e5) - L,
    J = K >= 0 ? K : K + 216e5,
    tt = J - 108e5,
    et = J - 216e5,
    nt = Math.abs(tt >= 0 ? et : J)
  let it
  if (g) {
    const t = -nt,
      e = -Math.abs(x)
    it = Math.max(t, Math.min(e, 0))
  } else it = Math.max(0, Math.min(x, nt))
  const rt = L + it,
    ot = u(z, rt),
    lt = h(N, rt),
    st = o + p(z, lt, ot),
    at = l + f(N, lt, ot),
    dt = u(j, S),
    ct = h(E, S),
    ut = o + p(j, ct, dt),
    ht = l + f(E, ct, dt),
    pt = h(F, rt),
    ft = u(F, rt),
    mt = U + pt,
    $t = Z + ft,
    gt = U - pt,
    yt = Z - ft,
    xt = gt - o,
    vt = yt - l,
    bt = mt - o,
    Mt = $t - l,
    wt = Math.min(j, E),
    kt = 0 !== j ? (xt * wt) / j : 0,
    At = 0 !== E ? (vt * wt) / E : 0,
    Lt = 0 !== j ? (bt * wt) / j : 0,
    St = 0 !== E ? (Mt * wt) / E : 0,
    Ct = Lt - kt,
    Ft = St - At,
    Bt = $(Ct, Ft, 0),
    jt = kt * St - Lt * At,
    Et = Bt * Bt,
    Pt = wt * wt * Et - jt * jt,
    Tt = Math.sqrt(Math.max(Pt, 0)),
    zt = -1 * Ft >= 0 ? -1 : 1,
    Nt = zt * Ct * Tt,
    Rt = jt * Ft,
    It = 0 !== Et ? (Rt + Nt) / Et : 0,
    Dt = 0 !== Et ? (Rt - Nt) / Et : 0,
    Ot = Math.abs(Ft) * Tt,
    Ut = jt * Ct * -1,
    Zt = 0 !== Et ? (Ut + Ot) / Et : 0,
    Gt = 0 !== Et ? (Ut - Ot) / Et : 0,
    Xt = Lt - Dt,
    Yt = St - Gt,
    Wt = $(Lt - It, St - Zt, 0),
    Ht = $(Xt, Yt, 0) - Wt,
    Vt = 0 !== wt ? ((Ht >= 0 ? It : Dt) * j) / wt : 0,
    qt = 0 !== wt ? ((Ht >= 0 ? Zt : Gt) * E) / wt : 0,
    _t = o + Vt,
    Qt = l + qt,
    Kt = 0 !== P ? (xt * G) / P : 0,
    Jt = 0 !== T ? (vt * G) / T : 0,
    te = 0 !== P ? (bt * G) / P : 0,
    ee = 0 !== T ? (Mt * G) / T : 0,
    ne = te - Kt,
    ie = ee - Jt,
    re = $(ne, ie, 0),
    oe = Kt * ee - te * Jt,
    le = re * re,
    se = G * G * le - oe * oe,
    ae = Math.sqrt(Math.max(se, 0)),
    de = zt * ne * ae,
    ce = oe * ie,
    ue = 0 !== le ? (ce + de) / le : 0,
    he = 0 !== le ? (ce - de) / le : 0,
    pe = Math.abs(ie) * ae,
    fe = oe * ne * -1,
    me = 0 !== le ? (fe + pe) / le : 0,
    $e = 0 !== le ? (fe - pe) / le : 0,
    ge = Kt - he,
    ye = Jt - $e,
    xe = $(Kt - ue, Jt - me, 0),
    ve = $(ge, ye, 0) - xe,
    be = 0 !== G ? ((ve >= 0 ? ue : he) * P) / G : 0,
    Me = 0 !== G ? ((ve >= 0 ? me : $e) * T) / G : 0,
    we = o + be,
    ke = l + Me,
    Ae = m(be, Me),
    Le = Ae >= 0 ? Ae : Ae + 216e5,
    Se = S - Le
  let Ce, Fe
  if (g) {
    const t = Se >= 0 ? Se : Se + 216e5
    ;((Ce = Le + t), (Fe = -t))
  } else ((Ce = Le), (Fe = Se >= 0 ? Se - 216e5 : Se))
  const Be = $(_t - we, Qt - ke, 0) / 2 - F,
    je = Be >= 0 ? _t : mt,
    Ee = Be >= 0 ? Qt : $t,
    Pe = Be >= 0 ? we : gt,
    Te = Be >= 0 ? ke : yt,
    ze = m(Vt, qt),
    Ne = (ze >= 0 ? ze : ze + 216e5) - S
  let Re, Ie
  if (g) {
    const t = Ne >= 0 ? Ne - 216e5 : Ne
    ;((Re = S + t), (Ie = -t))
  } else {
    ;((Re = S), (Ie = Ne >= 0 ? Ne : Ne + 216e5))
  }
  const De = Re + Ie,
    Oe = u(j, De),
    Ue = h(E, De),
    Ze = o + p(j, Ue, Oe),
    Ge = l + f(E, Ue, Oe),
    Xe = Ce + Fe,
    Ye = u(P, Xe),
    We = h(T, Xe),
    He = o + p(P, We, Ye),
    Ve = l + f(T, We, Ye),
    qe = Math.abs(Ie / 6e4) > 180 ? 1 : 0,
    _e = Ie > 0 ? 1 : 0,
    Qe = Math.abs(Fe / 6e4) > 180 ? 1 : 0,
    Ke = Fe > 0 ? 1 : 0
  if (g) {
    const t = u(P, S),
      e = h(T, S)
    return [
      `M${ut},${ht}`,
      `L${o + p(P, e, t)},${l + f(T, e, t)}`,
      `A${P},${T} 0 ${Qe},${Ke} ${He},${Ve}`,
      `L${Pe},${Te}`,
      `L${st},${at}`,
      `L${je},${Ee}`,
      `L${_t},${Qt}`,
      `A${j},${E} 0 ${qe},${_e} ${Ze},${Ge}`,
      'Z',
    ].join(' ')
  }
  return [
    `M${ut},${ht}`,
    `A${j},${E} 0 ${qe},${_e} ${Ze},${Ge}`,
    `L${je},${Ee}`,
    `L${st},${at}`,
    `L${Pe},${Te}`,
    `L${we},${ke}`,
    `A${P},${T} 0 ${Qe},${Ke} ${He},${Ve}`,
    'Z',
  ].join(' ')
}
function Sr(t, e, n, i, r) {
  const o = t / 2,
    l = e / 2,
    s = Math.min(t, e),
    a = 6 === n ? 5358 : 2679,
    d = (s * Math.min(Math.max(i, 0), 2e4)) / 1e5,
    c = (s * Math.min(Math.max(r, 0), a)) / 1e5,
    u = t / 2 - d,
    h = e / 2 - d
  if (u <= 0 || h <= 0) return `M0,0 L${t},0 L${t},${e} L0,${e} Z`
  const p = d / 2 + c / 2,
    f = Math.atan2(p, Math.min(u, h)),
    m =
      6 === n
        ? [330, 30, 90, 150, 210, 270]
        : [310, 350, 30, 70, 110, 150, 190, 230, 270],
    $ = []
  for (let g = 0; g < m.length; g++) {
    const t = (m[g] * Math.PI) / 180,
      e = t - f,
      n = t + f,
      i = o + u * Math.cos(e),
      r = l + h * Math.sin(e),
      s = o + u * Math.cos(n),
      a = l + h * Math.sin(n),
      p = s - i,
      y = a - r,
      x = Math.sqrt(p * p + y * y),
      v = Math.cos(t),
      b = Math.sin(t)
    let M = v,
      w = b
    ;(x > 0 && ((M = -y / x), (w = p / x)),
      M * v + w * b < 0 && ((M = -M), (w = -w)))
    const k = x > 0 ? p / x : 0,
      A = x > 0 ? y / x : 0,
      L = i + k * c + M * d,
      S = r + A * c + w * d,
      C = s - k * c + M * d,
      F = a - A * c + w * d
    if (0 === g) {
      const t = (m[m.length - 1] * Math.PI) / 180 + f,
        e = o + u * Math.cos(t),
        n = l + h * Math.sin(t)
      ;($.push(`M${e},${n}`), $.push(`A${u},${h} 0 0,1 ${i},${r}`))
    }
    if (
      ($.push(`L${L},${S}`),
      $.push(`L${C},${F}`),
      $.push(`L${s},${a}`),
      g < m.length - 1)
    ) {
      const t = (m[g + 1] * Math.PI) / 180 - f,
        e = o + u * Math.cos(t),
        n = l + h * Math.sin(t)
      $.push(`A${u},${h} 0 0,1 ${e},${n}`)
    }
  }
  return ($.push('Z'), $.join(' '))
}
;(Mr.set('rect', (t, e) => `M0,0 L${t},0 L${t},${e} L0,${e} Z`),
  Mr.set('roundRect', (t, e, n) => {
    const i = yr(n, 'adj', 16667),
      r = Math.min(t, e) * i
    return [
      `M${r},0`,
      `L${t - r},0`,
      `A${r},${r} 0 0,1 ${t},${r}`,
      `L${t},${e - r}`,
      `A${r},${r} 0 0,1 ${t - r},${e}`,
      `L${r},${e}`,
      `A${r},${r} 0 0,1 0,${e - r}`,
      `L0,${r}`,
      `A${r},${r} 0 0,1 ${r},0`,
      'Z',
    ].join(' ')
  }),
  Mr.set('plaque', (t, e, n) => {
    const i = Math.min(Math.max(xr(n, 'adj', 16667), 0), 5e4),
      r = (Math.min(t, e) * i) / 1e5,
      o = t - r,
      l = e - r,
      s = Er(0, r, r, r, 90, -90),
      a = Er(o, 0, r, r, 180, -90),
      d = Er(t, l, r, r, 270, -90),
      c = Er(r, e, r, r, 0, -90)
    return [
      `M0,${r}`,
      s.svg,
      `L${o},0`,
      a.svg,
      `L${t},${l}`,
      d.svg,
      `L${r},${e}`,
      c.svg,
      'Z',
    ].join(' ')
  }),
  Mr.set('cornerTabs', (t, e) => {
    const n = Math.sqrt(t * t + e * e) / 20
    return [
      `M0,0 L${n},0 L0,${n} Z`,
      `M${t},0 L${t - n},0 L${t},${n} Z`,
      `M${t},${e} L${t - n},${e} L${t},${e - n} Z`,
      `M0,${e} L${n},${e} L0,${e - n} Z`,
    ].join(' ')
  }),
  Mr.set('squareTabs', (t, e) => {
    const n = Math.sqrt(t * t + e * e) / 20
    return [
      `M0,0 L${n},0 L${n},${n} L0,${n} Z`,
      `M${t - n},0 L${t},0 L${t},${n} L${t - n},${n} Z`,
      `M0,${e - n} L${n},${e - n} L${n},${e} L0,${e} Z`,
      `M${t - n},${e - n} L${t},${e - n} L${t},${e} L${t - n},${e} Z`,
    ].join(' ')
  }),
  Mr.set('plaqueTabs', (t, e) => {
    const n = Math.sqrt(t * t + e * e) / 20
    return [
      `M0,0 L${n},0 A${n},${n} 0 0,1 0,${n} Z`,
      `M${t},0 L${t - n},0 A${n},${n} 0 0,0 ${t},${n} Z`,
      `M0,${e} L0,${e - n} A${n},${n} 0 0,1 ${n},${e} Z`,
      `M${t},${e} L${t - n},${e} A${n},${n} 0 0,1 ${t},${e - n} Z`,
    ].join(' ')
  }),
  Mr.set('ellipse', (t, e) => {
    const n = t / 2,
      i = e / 2
    return [
      `M${t},${i}`,
      `A${n},${i} 0 1,1 0,${i}`,
      `A${n},${i} 0 1,1 ${t},${i}`,
      'Z',
    ].join(' ')
  }),
  Mr.set(
    'triangle',
    (t, e, n) => `M${t * yr(n, 'adj', 5e4)},0 L${t},${e} L0,${e} Z`,
  ),
  Mr.set(
    'isosTriangle',
    (t, e, n) => `M${t * yr(n, 'adj', 5e4)},0 L${t},${e} L0,${e} Z`,
  ),
  Mr.set('rtTriangle', (t, e) => `M0,0 L${t},${e} L0,${e} Z`),
  Mr.set('diamond', (t, e) => {
    const n = t / 2,
      i = e / 2
    return `M${n},0 L${t},${i} L${n},${e} L0,${i} Z`
  }),
  Mr.set('pentagon', (t, e) => {
    const n = t / 2,
      i = (105146 * n) / 1e5,
      r = ((e / 2) * 110557) / 1e5,
      o = r,
      l = i * Math.cos((18 * Math.PI) / 180),
      s = i * Math.cos((54 * Math.PI) / 180),
      a = r * Math.sin((18 * Math.PI) / 180),
      d = r * Math.sin((54 * Math.PI) / 180)
    return [
      `M${n - l},${o - a}`,
      `L${n},0`,
      `L${n + l},${o - a}`,
      `L${n + s},${o + d}`,
      `L${n - s},${o + d}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('hexagon', (t, e, n) => {
    const i = Math.min(t, e),
      r =
        (i *
          Math.min(
            Math.max(xr(n, 'adj', 25e3), 0),
            i > 0 ? (5e4 * t) / i : 5e4,
          )) /
        1e5,
      o = t - r,
      l = e / 2,
      s = (((e / 2) * 115470) / 1e5) * Math.sin((60 * Math.PI) / 180),
      a = l - s,
      d = l + s
    return [
      `M0,${l}`,
      `L${r},${a}`,
      `L${o},${a}`,
      `L${t},${l}`,
      `L${o},${d}`,
      `L${r},${d}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('octagon', (t, e, n) => {
    const i =
        (Math.min(t, e) * Math.min(Math.max(xr(n, 'adj', 29289), 0), 5e4)) /
        1e5,
      r = t - i,
      o = e - i
    return [
      `M0,${i}`,
      `L${i},0`,
      `L${r},0`,
      `L${t},${i}`,
      `L${t},${o}`,
      `L${r},${e}`,
      `L${i},${e}`,
      `L0,${o}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('heptagon', (t, e) => {
    const n = t / 2,
      i = (102572 * n) / 1e5,
      r = ((e / 2) * 105210) / 1e5,
      o = ((e / 2) * 105210) / 1e5,
      l = (97493 * i) / 1e5,
      s = (78183 * i) / 1e5,
      a = (43388 * i) / 1e5,
      d = (62349 * r) / 1e5,
      c = (22252 * r) / 1e5,
      u = (90097 * r) / 1e5
    return [
      `M${n - l},${o + c}`,
      `L${n - s},${o - d}`,
      `L${n},0`,
      `L${n + s},${o - d}`,
      `L${n + l},${o + c}`,
      `L${n + a},${o + u}`,
      `L${n - a},${o + u}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('decagon', (t, e) => {
    const n = t / 2,
      i = e / 2,
      r = (105146 * i) / 1e5,
      o = n * Math.cos((36 * Math.PI) / 180),
      l = n * Math.cos((72 * Math.PI) / 180),
      s = r * Math.sin((72 * Math.PI) / 180),
      a = r * Math.sin((36 * Math.PI) / 180)
    return [
      `M0,${i}`,
      `L${n - o},${i - a}`,
      `L${n - l},${i - s}`,
      `L${n + l},${i - s}`,
      `L${n + o},${i - a}`,
      `L${t},${i}`,
      `L${n + o},${i + a}`,
      `L${n + l},${i + s}`,
      `L${n - l},${i + s}`,
      `L${n - o},${i + a}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('dodecagon', (t, e) => {
    const n = (2894 * t) / 21600,
      i = (7906 * t) / 21600,
      r = (13694 * t) / 21600,
      o = (18706 * t) / 21600,
      l = (2894 * e) / 21600,
      s = (7906 * e) / 21600,
      a = (13694 * e) / 21600,
      d = (18706 * e) / 21600
    return [
      `M0,${s}`,
      `L${n},${l}`,
      `L${i},0`,
      `L${r},0`,
      `L${o},${l}`,
      `L${t},${s}`,
      `L${t},${a}`,
      `L${o},${d}`,
      `L${r},${e}`,
      `L${i},${e}`,
      `L${n},${d}`,
      `L0,${a}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('parallelogram', (t, e, n) => {
    const i = Math.min(t, e),
      r = i > 0 ? (1e5 * t) / i : 1e5,
      o = (i * Math.min(Math.max(xr(n, 'adj', 25e3), 0), r)) / 1e5
    return `M0,${e} L${o},0 L${t},0 L${t - o},${e} Z`
  }),
  Mr.set('trapezoid', (t, e, n) => {
    const i = Math.min(t, e),
      r = i > 0 ? (5e4 * t) / i : 5e4,
      o = (i * Math.min(Math.max(xr(n, 'adj', 25e3), 0), r)) / 1e5
    return `M0,${e} L${o},0 L${t - o},0 L${t},${e} Z`
  }),
  Mr.set('nonIsoscelesTrapezoid', (t, e, n) => {
    const i = Math.min(t, e),
      r = i > 0 ? (5e4 * t) / i : 5e4
    return `M0,${e} L${(i * Math.min(Math.max(xr(n, 'adj1', 25e3), 0), r)) / 1e5},0 L${t - (i * Math.min(Math.max(xr(n, 'adj2', 25e3), 0), r)) / 1e5},0 L${t},${e} Z`
  }),
  Mr.set('corner', (t, e, n) => {
    const i = Math.min(t, e),
      r = Math.min(Math.max(yr(n, 'adj1', 5e4), 0), 1),
      o = i * Math.min(Math.max(yr(n, 'adj2', 5e4), 0), 1),
      l = e - i * r
    return [
      'M0,0',
      `L${o},0`,
      `L${o},${l}`,
      `L${t},${l}`,
      `L${t},${e}`,
      `L0,${e}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('diagStripe', (t, e, n) => {
    const i = Math.min(Math.max(yr(n, 'adj', 5e4), 0), 1)
    return ['M0,' + e * i, `L${t * i},0`, `L${t},0`, `L0,${e}`, 'Z'].join(' ')
  }),
  Mr.set('star4', (t, e, n) => {
    const i = 2 * yr(n, 'adj', 12500)
    return vr(t, e, 4, Math.min(Math.max(i, 0), 1))
  }),
  Mr.set('star5', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj')) ?? 19098,
      r = Math.min(Math.max(i, 0), 5e4),
      o = 110557,
      l = ((t / 2) * 105146) / 1e5,
      s = ((e / 2) * o) / 1e5,
      a = ((e / 2) * o) / 1e5,
      d = (l * r) / 5e4,
      c = (s * r) / 5e4,
      u = t / 2,
      h = (2 * Math.PI) / 5,
      p = h / 2,
      f = -Math.PI / 2,
      m = []
    for (let $ = 0; $ < 5; $++) {
      const t = f + h * $,
        e = t + p,
        n = u + l * Math.cos(t),
        i = a + s * Math.sin(t),
        r = u + d * Math.cos(e),
        o = a + c * Math.sin(e)
      ;(m.push(0 === $ ? `M${n},${i}` : `L${n},${i}`), m.push(`L${r},${o}`))
    }
    return (m.push('Z'), m.join(' '))
  }),
  Mr.set('star6', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj')) ?? 28868,
      r = Math.min(Math.max(i, 0), 5e4),
      o = ((t / 2) * 115470) / 1e5,
      l = e / 2,
      s = (o * r) / 5e4,
      a = (l * r) / 5e4,
      d = t / 2,
      c = e / 2,
      u = (2 * Math.PI) / 6,
      h = u / 2,
      p = -Math.PI / 2,
      f = []
    for (let m = 0; m < 6; m++) {
      const t = p + u * m,
        e = t + h,
        n = d + o * Math.cos(t),
        i = c + l * Math.sin(t),
        r = d + s * Math.cos(e),
        $ = c + a * Math.sin(e)
      ;(f.push(0 === m ? `M${n},${i}` : `L${n},${i}`), f.push(`L${r},${$}`))
    }
    return (f.push('Z'), f.join(' '))
  }),
  Mr.set('star7', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj')) ?? 34601,
      r = Math.min(Math.max(i, 0), 5e4),
      o = ((t / 2) * 102572) / 1e5,
      l = ((e / 2) * 105210) / 1e5,
      s = l,
      a = (o * r) / 5e4,
      d = (l * r) / 5e4,
      c = t / 2,
      u = (2 * Math.PI) / 7,
      h = u / 2,
      p = -Math.PI / 2,
      f = []
    for (let m = 0; m < 7; m++) {
      const t = p + u * m,
        e = t + h,
        n = c + o * Math.cos(t),
        i = s + l * Math.sin(t),
        r = c + a * Math.cos(e),
        $ = s + d * Math.sin(e)
      ;(f.push(0 === m ? `M${n},${i}` : `L${n},${i}`), f.push(`L${r},${$}`))
    }
    return (f.push('Z'), f.join(' '))
  }),
  Mr.set('star8', (t, e, n) => {
    const i = 2 * yr(n, 'adj', 37500)
    return vr(t, e, 8, Math.min(Math.max(i, 0), 1))
  }),
  Mr.set('star10', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj')) ?? 42533,
      r = Math.min(Math.max(i, 0), 5e4),
      o = ((t / 2) * 105146) / 1e5,
      l = e / 2,
      s = (o * r) / 5e4,
      a = (l * r) / 5e4,
      d = t / 2,
      c = e / 2,
      u = (2 * Math.PI) / 10,
      h = u / 2,
      p = -Math.PI / 2,
      f = []
    for (let m = 0; m < 10; m++) {
      const t = p + u * m,
        e = t + h,
        n = d + o * Math.cos(t),
        i = c + l * Math.sin(t),
        r = d + s * Math.cos(e),
        $ = c + a * Math.sin(e)
      ;(f.push(0 === m ? `M${n},${i}` : `L${n},${i}`), f.push(`L${r},${$}`))
    }
    return (f.push('Z'), f.join(' '))
  }),
  Mr.set('star12', (t, e, n) => {
    const i = 2 * yr(n, 'adj', 37500)
    return vr(t, e, 12, Math.min(Math.max(i, 0), 1))
  }),
  Mr.set('star16', (t, e, n) => {
    const i = 2 * yr(n, 'adj', 37500)
    return vr(t, e, 16, Math.min(Math.max(i, 0), 1))
  }),
  Mr.set('star24', (t, e, n) => {
    const i = 2 * yr(n, 'adj', 37500)
    return vr(t, e, 24, Math.min(Math.max(i, 0), 1))
  }),
  Mr.set('star32', (t, e, n) => {
    const i = 2 * yr(n, 'adj', 37500)
    return vr(t, e, 32, Math.min(Math.max(i, 0), 1))
  }),
  Mr.set('line', (t, e) =>
    0 === t
      ? `M0.5,0 L0.5,${e || 1}`
      : 0 === e
        ? `M0,0.5 L${t || 1},0.5`
        : `M0,0 L${t},${e}`,
  ),
  Mr.set('lineInv', (t, e) =>
    0 === t
      ? `M0.5,0 L0.5,${e || 1}`
      : 0 === e
        ? `M0,0.5 L${t || 1},0.5`
        : `M${t},0 L0,${e}`,
  ),
  Mr.set('straightConnector1', (t, e) =>
    0 === t
      ? `M0.5,0 L0.5,${e || 1}`
      : 0 === e
        ? `M0,0.5 L${t || 1},0.5`
        : `M0,0 L${t},${e}`,
  ),
  Mr.set('bentConnector2', (t, e) => `M0,0 L${t},0 L${t},${e}`),
  Mr.set('bentConnector3', (t, e, n) => {
    const i = t * yr(n, 'adj1', 5e4)
    return `M0,0 L${i},0 L${i},${e} L${t},${e}`
  }),
  Mr.set('bentConnector4', (t, e, n) => {
    const i = t * yr(n, 'adj1', 5e4),
      r = e * yr(n, 'adj2', 5e4)
    return `M0,0 L${i},0 L${i},${r} L${t},${r} L${t},${e}`
  }),
  Mr.set(
    'curvedConnector2',
    (t, e) => `M0,0 C${t / 2},0 ${t},${e / 2} ${t},${e}`,
  ),
  Mr.set('curvedConnector3', (t, e, n) => {
    const i = t * yr(n, 'adj1', 5e4)
    return `M0,0 C${i / 2},0 ${i},${e / 4} ${i},${e / 2} C${i},${(3 * e) / 4} ${(t + i) / 2},${e} ${t},${e}`
  }),
  Mr.set('curvedConnector4', (t, e, n) => {
    const i = t * yr(n, 'adj1', 5e4),
      r = e * yr(n, 'adj2', 5e4),
      o = (t + i) / 2,
      l = r / 2
    return [
      'M0,0',
      `C${i / 2},0 ${i},${l / 2} ${i},${l}`,
      `C${i},${(l + r) / 2} ${(i + o) / 2},${r} ${o},${r}`,
      `C${(o + t) / 2},${r} ${t},${(e + r) / 2} ${t},${e}`,
    ].join(' ')
  }),
  Mr.set('curvedConnector5', (t, e, n) => {
    const i = t * yr(n, 'adj1', 5e4),
      r = e * yr(n, 'adj2', 5e4),
      o = t * yr(n, 'adj3', 5e4),
      l = (i + o) / 2,
      s = r / 2,
      a = (e + r) / 2
    return [
      'M0,0',
      `C${i / 2},0 ${i},${s / 2} ${i},${s}`,
      `C${i},${(s + r) / 2} ${(i + l) / 2},${r} ${l},${r}`,
      `C${(o + l) / 2},${r} ${o},${(a + r) / 2} ${o},${a}`,
      `C${o},${(a + e) / 2} ${(o + t) / 2},${e} ${t},${e}`,
    ].join(' ')
  }),
  Mr.set('bentConnector5', (t, e, n) => {
    const i = t * yr(n, 'adj1', 5e4),
      r = e * yr(n, 'adj2', 5e4),
      o = t * yr(n, 'adj3', 5e4)
    return `M0,0 L${i},0 L${i},${r} L${o},${r} L${o},${e} L${t},${e}`
  }),
  Mr.set('rightArrow', (t, e, n) => {
    const i = yr(n, 'adj1', 5e4),
      r = yr(n, 'adj2', 5e4),
      o = (e * i) / 2,
      l = e / 2,
      s = t - Math.min(t, e) * r
    return [
      'M0,' + (l - o),
      `L${s},${l - o}`,
      `L${s},0`,
      `L${t},${l}`,
      `L${s},${e}`,
      `L${s},${l + o}`,
      `L0,${l + o}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('leftArrow', (t, e, n) => {
    const i = yr(n, 'adj1', 5e4),
      r = yr(n, 'adj2', 5e4),
      o = (e * i) / 2,
      l = Math.min(t, e) * r,
      s = e / 2
    return [
      `M${t},${s - o}`,
      `L${l},${s - o}`,
      `L${l},0`,
      `L0,${s}`,
      `L${l},${e}`,
      `L${l},${s + o}`,
      `L${t},${s + o}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('upArrow', (t, e, n) => {
    const i = (t * yr(n, 'adj1', 5e4)) / 2,
      r = e * yr(n, 'adj2', 5e4),
      o = t / 2
    return [
      `M${o - i},${e}`,
      `L${o - i},${r}`,
      `L0,${r}`,
      `L${o},0`,
      `L${t},${r}`,
      `L${o + i},${r}`,
      `L${o + i},${e}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('downArrow', (t, e, n) => {
    const i = (t * yr(n, 'adj1', 5e4)) / 2,
      r = t / 2,
      o = e - e * yr(n, 'adj2', 5e4)
    return [
      `M${r - i},0`,
      `L${r + i},0`,
      `L${r + i},${o}`,
      `L${t},${o}`,
      `L${r},${e}`,
      `L0,${o}`,
      `L${r - i},${o}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('downArrowCallout', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj1')) ?? 25e3,
      r = (null == n ? void 0 : n.get('adj2')) ?? 25e3,
      o = (null == n ? void 0 : n.get('adj3')) ?? 25e3,
      l = (null == n ? void 0 : n.get('adj4')) ?? 64977,
      s = Math.min(t, e),
      a = Math.max(0, Math.min(r, (5e4 * t) / Math.max(s, 1))),
      d = Math.max(0, Math.min(i, 2 * a)),
      c = Math.max(0, Math.min(o, (1e5 * e) / Math.max(s, 1))),
      u = (c * s) / Math.max(e, 1),
      h = t / 2,
      p = (s * a) / 1e5,
      f = (s * d) / 2e5,
      m = h - f,
      $ = h + f,
      g = e - (s * c) / 1e5,
      y = (e * Math.max(0, Math.min(l, 1e5 - u))) / 1e5
    return [
      'M0,0',
      `L${t},0`,
      `L${t},${y}`,
      `L${$},${y}`,
      `L${$},${g}`,
      `L${h + p},${g}`,
      `L${h},${e}`,
      `L${h - p},${g}`,
      `L${m},${g}`,
      `L${m},${y}`,
      `L0,${y}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('rightArrowCallout', (t, e, n) => {
    const i = Math.min(t, e),
      r = (5e4 * e) / Math.max(i, 1),
      o = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj2')) ?? 25e3, r),
      ),
      l = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj1')) ?? 25e3, 2 * o),
      ),
      s = (1e5 * t) / Math.max(i, 1),
      a = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj3')) ?? 25e3, s),
      ),
      d = (a * i) / Math.max(t, 1),
      c = e / 2,
      u = (i * o) / 1e5,
      h = (i * l) / 2e5,
      p = c - h,
      f = c + h,
      m = t - (i * a) / 1e5,
      $ =
        (t *
          Math.max(
            0,
            Math.min((null == n ? void 0 : n.get('adj4')) ?? 64977, 1e5 - d),
          )) /
        1e5
    return [
      'M0,0',
      `L${$},0`,
      `L${$},${p}`,
      `L${m},${p}`,
      `L${m},${c - u}`,
      `L${t},${c}`,
      `L${m},${c + u}`,
      `L${m},${f}`,
      `L${$},${f}`,
      `L${$},${e}`,
      `L0,${e}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('leftArrowCallout', (t, e, n) => {
    const i = Math.min(t, e),
      r = (5e4 * e) / Math.max(i, 1),
      o = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj2')) ?? 25e3, r),
      ),
      l = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj1')) ?? 25e3, 2 * o),
      ),
      s = (1e5 * t) / Math.max(i, 1),
      a = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj3')) ?? 25e3, s),
      ),
      d = (a * i) / Math.max(t, 1),
      c = e / 2,
      u = (i * o) / 1e5,
      h = (i * l) / 2e5,
      p = c - h,
      f = c + h,
      m = (i * a) / 1e5,
      $ =
        t -
        (t *
          Math.max(
            0,
            Math.min((null == n ? void 0 : n.get('adj4')) ?? 64977, 1e5 - d),
          )) /
          1e5
    return [
      `M0,${c}`,
      `L${m},${c - u}`,
      `L${m},${p}`,
      `L${$},${p}`,
      `L${$},0`,
      `L${t},0`,
      `L${t},${e}`,
      `L${$},${e}`,
      `L${$},${f}`,
      `L${m},${f}`,
      `L${m},${c + u}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('upArrowCallout', (t, e, n) => {
    const i = Math.min(t, e),
      r = (5e4 * t) / Math.max(i, 1),
      o = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj2')) ?? 25e3, r),
      ),
      l = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj1')) ?? 25e3, 2 * o),
      ),
      s = (1e5 * e) / Math.max(i, 1),
      a = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj3')) ?? 25e3, s),
      ),
      d = (a * i) / Math.max(e, 1),
      c = t / 2,
      u = (i * o) / 1e5,
      h = (i * l) / 2e5,
      p = c - h,
      f = c + h,
      m = (i * a) / 1e5,
      $ =
        e -
        (e *
          Math.max(
            0,
            Math.min((null == n ? void 0 : n.get('adj4')) ?? 64977, 1e5 - d),
          )) /
          1e5
    return [
      `M0,${$}`,
      `L${p},${$}`,
      `L${p},${m}`,
      `L${c - u},${m}`,
      `L${c},0`,
      `L${c + u},${m}`,
      `L${f},${m}`,
      `L${f},${$}`,
      `L${t},${$}`,
      `L${t},${e}`,
      `L0,${e}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('upDownArrowCallout', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj1')) ?? 25e3,
      r = (null == n ? void 0 : n.get('adj2')) ?? 25e3,
      o = (null == n ? void 0 : n.get('adj3')) ?? 25e3,
      l = (null == n ? void 0 : n.get('adj4')) ?? 48123,
      s = Math.min(t, e),
      a = Math.max(0, Math.min(r, (5e4 * t) / Math.max(s, 1))),
      d = Math.max(0, Math.min(i, 2 * a)),
      c = Math.max(0, Math.min(o, (5e4 * e) / Math.max(s, 1))),
      u = (c * s) / Math.max(e, 1),
      h = (s * a) / 1e5,
      p = (s * d) / 2e5,
      f = t / 2,
      m = f - h,
      $ = f - p,
      g = f + p,
      y = f + h,
      x = (s * c) / 1e5,
      v = (e * Math.max(0, Math.min(l, 1e5 - u - u))) / 2e5,
      b = e / 2 - v,
      M = e / 2 + v,
      w = e - x
    return [
      `M${f},0`,
      `L${y},${x}`,
      `L${g},${x}`,
      `L${g},${b}`,
      `L${t},${b}`,
      `L${t},${M}`,
      `L${g},${M}`,
      `L${g},${w}`,
      `L${y},${w}`,
      `L${f},${e}`,
      `L${m},${w}`,
      `L${$},${w}`,
      `L${$},${M}`,
      `L0,${M}`,
      `L0,${b}`,
      `L${$},${b}`,
      `L${$},${x}`,
      `L${m},${x}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('leftRightArrowCallout', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj1')) ?? 25e3,
      r = (null == n ? void 0 : n.get('adj2')) ?? 25e3,
      o = (null == n ? void 0 : n.get('adj3')) ?? 25e3,
      l = (null == n ? void 0 : n.get('adj4')) ?? 48123,
      s = Math.min(t, e),
      a = Math.max(0, Math.min(r, (5e4 * e) / Math.max(s, 1))),
      d = Math.max(0, Math.min(i, 2 * a)),
      c = Math.max(0, Math.min(o, (5e4 * t) / Math.max(s, 1))),
      u = (c * s) / Math.max(t, 1),
      h = (s * a) / 1e5,
      p = (s * d) / 2e5,
      f = e / 2,
      m = f - h,
      $ = f - p,
      g = f + p,
      y = f + h,
      x = (s * c) / 1e5,
      v = (t * Math.max(0, Math.min(l, 1e5 - u - u))) / 2e5,
      b = t / 2 - v,
      M = t / 2 + v,
      w = t - x
    return [
      `M0,${f}`,
      `L${x},${m}`,
      `L${x},${$}`,
      `L${b},${$}`,
      `L${b},0`,
      `L${M},0`,
      `L${M},${$}`,
      `L${w},${$}`,
      `L${w},${m}`,
      `L${t},${f}`,
      `L${w},${y}`,
      `L${w},${g}`,
      `L${M},${g}`,
      `L${M},${e}`,
      `L${b},${e}`,
      `L${b},${g}`,
      `L${x},${g}`,
      `L${x},${y}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('uturnArrow', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj1')) ?? 25e3,
      r = (null == n ? void 0 : n.get('adj2')) ?? 25e3,
      o = (null == n ? void 0 : n.get('adj3')) ?? 25e3,
      l = (null == n ? void 0 : n.get('adj4')) ?? 43750,
      s = (null == n ? void 0 : n.get('adj5')) ?? 75e3,
      a = Math.min(t, e),
      d = Math.max(0, Math.min(r, 25e3)),
      c = Math.max(0, Math.min(i, 2 * d)),
      u = 1e5 - (c * a) / Math.max(e, 1),
      h = Math.max(0, Math.min(o, (u * e) / Math.max(a, 1))),
      p = ((h + c) * a) / Math.max(e, 1),
      f = (a * c) / 1e5,
      m = (a * d) / 1e5,
      $ = m - f / 2,
      g = (e * Math.max(p, Math.min(s, 1e5))) / 1e5,
      y = g - (a * h) / 1e5,
      x = t - $,
      v = Math.min(x / 2, y),
      b = (a * Math.max(0, Math.min(l, (1e5 * v) / Math.max(a, 1)))) / 1e5,
      M = Math.max(b - f, 0),
      w = f + M,
      k = t - m,
      A = k - m,
      L = A + $,
      S = L - M
    return [
      `M0,${e}`,
      `L0,${b}`,
      b > 0.1 ? `A${b},${b} 0 0,1 ${b},0` : 'L0,0',
      `L${x - b},0`,
      b > 0.1 ? `A${b},${b} 0 0,1 ${x},${b}` : `L${x},0`,
      `L${x},${y}`,
      `L${t},${y}`,
      `L${k},${g}`,
      `L${A},${y}`,
      `L${L},${y}`,
      `L${L},${w}`,
      M > 0.1 ? `A${M},${M} 0 0,0 ${S},${f}` : `L${S},${f}`,
      `L${w},${f}`,
      M > 0.1 ? `A${M},${M} 0 0,0 ${f},${w}` : `L${f},${w}`,
      `L${f},${e}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('leftRightArrow', (t, e, n) => {
    const i = Math.min(t, e),
      r = e / 2,
      o = i > 0 ? (5e4 * t) / i : 0,
      l = Math.min(
        Math.max((null == n ? void 0 : n.get('adj1')) ?? 5e4, 0),
        1e5,
      ),
      s =
        (i *
          Math.min(
            Math.max((null == n ? void 0 : n.get('adj2')) ?? 5e4, 0),
            o,
          )) /
        1e5,
      a = t - s,
      d = (e * l) / 2e5,
      c = r - d,
      u = r + d
    return [
      `M0,${r}`,
      `L${s},0`,
      `L${s},${c}`,
      `L${a},${c}`,
      `L${a},0`,
      `L${t},${r}`,
      `L${a},${e}`,
      `L${a},${u}`,
      `L${s},${u}`,
      `L${s},${e}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('leftUpArrow', (t, e, n) => {
    const i = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj2')) ?? 25e3, 5e4),
      ),
      r = 2 * i,
      o = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj1')) ?? 25e3, r),
      ),
      l = 1e5 - r,
      s = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj3')) ?? 25e3, l),
      ),
      a = Math.min(t, e),
      d = (a * s) / 1e5,
      c = (a * i) / 5e4,
      u = (a * i) / 1e5,
      h = t - u,
      p = e - u,
      f = (a * o) / 2e5,
      m = h - f,
      $ = h + f,
      g = p - f,
      y = p + f
    return [
      `M0,${p}`,
      `L${d},${e - c}`,
      `L${d},${g}`,
      `L${m},${g}`,
      `L${m},${d}`,
      `L${t - c},${d}`,
      `L${h},0`,
      `L${t},${d}`,
      `L${$},${d}`,
      `L${$},${y}`,
      `L${d},${y}`,
      `L${d},${e}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('upDownArrow', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj1')) ?? 5e4,
      r = (null == n ? void 0 : n.get('adj2')) ?? 5e4,
      o = Math.min(t, e),
      l = (5e4 * e) / Math.max(o, 1),
      s = Math.max(0, Math.min(r, l)),
      a = (o * Math.max(0, Math.min(i, 1e5))) / 2e5,
      d = (o * s) / 1e5,
      c = t / 2
    return [
      `M${c},0`,
      `L${t},${d}`,
      `L${c + a},${d}`,
      `L${c + a},${e - d}`,
      `L${t},${e - d}`,
      `L${c},${e}`,
      'L0,' + (e - d),
      `L${c - a},${e - d}`,
      `L${c - a},${d}`,
      `L0,${d}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('notchedRightArrow', (t, e, n) => {
    const i = yr(n, 'adj1', 5e4),
      r = yr(n, 'adj2', 5e4),
      o = (e * i) / 2,
      l = Math.min(t, e) * r,
      s = e / 2,
      a = t - l
    return [
      'M0,' + (s - o),
      `L${a},${s - o}`,
      `L${a},0`,
      `L${t},${s}`,
      `L${a},${e}`,
      `L${a},${s + o}`,
      `L0,${s + o}`,
      `L${s > 0 ? (o * l) / s : 0},${s}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('chevron', (t, e, n) => {
    const i = yr(n, 'adj', 5e4),
      r = Math.min(t, e) * i
    return [
      'M0,0',
      `L${t - r},0`,
      `L${t},${e / 2}`,
      `L${t - r},${e}`,
      `L0,${e}`,
      `L${r},${e / 2}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('homePlate', (t, e, n) => {
    const i = yr(n, 'adj', 5e4),
      r = t - Math.min(t, e) * i
    return [
      'M0,0',
      `L${r},0`,
      `L${t},${e / 2}`,
      `L${r},${e}`,
      `L0,${e}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('stripedRightArrow', (t, e, n) => {
    const i = Math.min(t, e),
      r = i > 0 ? (84375 * t) / i : 84375,
      o = (e * Math.min(Math.max(xr(n, 'adj1', 5e4), 0), 1e5)) / 2e5,
      l = t - (i * Math.min(Math.max(xr(n, 'adj2', 5e4), 0), r)) / 1e5,
      s = e / 2,
      a = s - o,
      d = s + o,
      c = i / 32,
      u = i / 16,
      h = i / 8,
      p = (5 * i) / 32
    return [
      `M0,${a} L${c},${a} L${c},${d} L0,${d} Z`,
      `M${u},${a} L${h},${a} L${h},${d} L${u},${d} Z`,
      `M${p},${a}`,
      `L${l},${a}`,
      `L${l},0`,
      `L${t},${s}`,
      `L${l},${e}`,
      `L${l},${d}`,
      `L${p},${d}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('bentArrow', (t, e, n) => {
    const i = Math.min(t, e),
      r = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj2')) ?? 25e3, 5e4),
      ),
      o = 2 * r,
      l =
        (i *
          Math.max(
            0,
            Math.min((null == n ? void 0 : n.get('adj1')) ?? 25e3, o),
          )) /
        1e5,
      s = (i * r) / 1e5,
      a = s - l / 2,
      d =
        (i *
          Math.max(
            0,
            Math.min((null == n ? void 0 : n.get('adj3')) ?? 25e3, 5e4),
          )) /
        1e5,
      c = t - d,
      u = e - a,
      h = Math.min(c, u),
      p = h > 0 ? (1e5 * h) / i : 0,
      f =
        (i *
          Math.max(
            0,
            Math.min((null == n ? void 0 : n.get('adj4')) ?? 43750, p),
          )) /
        1e5,
      m = Math.max(f - l, 0),
      $ = l + m,
      g = t - d,
      y = a + l,
      x = y + a,
      v = y + m,
      b = [`M0,${e}`, `L0,${a + f}`]
    return (
      f > 0.1 ? b.push(`A${f},${f} 0 0,1 ${f},${a}`) : b.push(`L0,${a}`),
      b.push(
        `L${g},${a}`,
        `L${g},0`,
        `L${t},${s}`,
        `L${g},${x}`,
        `L${g},${y}`,
        `L${$},${y}`,
      ),
      m > 0.1 ? b.push(`A${m},${m} 0 0,0 ${l},${v}`) : b.push(`L${l},${y}`),
      b.push(`L${l},${e}`, 'Z'),
      b.join(' ')
    )
  }),
  Mr.set('bentUpArrow', (t, e, n) => {
    const i = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj1')) ?? 25e3, 5e4),
      ),
      r = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj2')) ?? 25e3, 5e4),
      ),
      o = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj3')) ?? 25e3, 5e4),
      ),
      l = Math.min(t, e),
      s = (l * o) / 1e5,
      a = t - (l * r) / 1e5,
      d = (l * i) / 2e5,
      c = a - d,
      u = a + d,
      h = e - (l * i) / 1e5
    return [
      `M0,${h}`,
      `L${c},${h}`,
      `L${c},${s}`,
      `L${t - (l * r) / 5e4},${s}`,
      `L${a},0`,
      `L${t},${s}`,
      `L${u},${s}`,
      `L${u},${e}`,
      `L0,${e}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('curvedRightArrow', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj1')) ?? 25e3,
      r = (null == n ? void 0 : n.get('adj2')) ?? 5e4,
      o = (null == n ? void 0 : n.get('adj3')) ?? 25e3,
      l = 1e5,
      s = e / 2,
      a = t,
      d = e,
      c = 180,
      u = Math.max(Math.min(t, e), 1),
      h = (5e4 * e) / u,
      p = Math.max(0, Math.min(r, h)),
      f = (u * Math.max(0, Math.min(i, p))) / l,
      m = (u * p) / l,
      $ = s - (f + m) / 4,
      g = 2 * $,
      y = g * g,
      x = f * f,
      v = Math.max(y - x, 0),
      b = (Math.sqrt(v) * t) / Math.max(g, 1e-6),
      M = (l * b) / u,
      w = (u * Math.max(0, Math.min(o, M))) / l,
      k = $ + f,
      A = t * t,
      L = w * w,
      S = Math.max(A - L, 0),
      C = (Math.sqrt(S) * $) / Math.max(t, 1e-6),
      F = $ + C,
      B = k + C,
      j = (m - f) / 2,
      E = F - j,
      P = B + j,
      T = d - m / 2,
      z = a - w,
      N = Math.atan(C / Math.max(w, 1e-6)),
      R = Math.PI - N,
      I = -N,
      D = f / 2,
      O = Math.atan2(D, Math.max(b, 1e-6)) - Math.PI / 2,
      U = (180 * R) / Math.PI,
      Z = (180 * I) / Math.PI,
      G = (180 * N) / Math.PI,
      X = (180 * O) / Math.PI,
      Y = (t, e, n, i, r, o) => {
        const l = (r * Math.PI) / 180,
          s = (o * Math.PI) / 180,
          a = t + n * Math.cos(l),
          d = e + i * Math.sin(l),
          c = t + n * Math.cos(s),
          u = e + i * Math.sin(s),
          h = o - r
        return `M${a},${d} A${n},${i} 0 ${Math.abs(h) > 180 ? 1 : 0},${h >= 0 ? 1 : 0} ${c},${u}`
      }
    return [
      `M0,${$}`,
      Y(t, $, t, $, c, c + Z).replace('M', 'L'),
      `L${z},${F}`,
      `L${z},${E}`,
      `L${a},${T}`,
      `L${z},${P}`,
      `L${z},${B}`,
      Y(t, k, t, $, U, U + G).replace('M', 'L'),
      'Z',
      Y(t, $, t, $, c, 270),
      `L${a},${f}`,
      Y(t, k, t, $, 270, 270 + X).replace('M', 'L'),
      'Z',
    ].join(' ')
  }),
  Mr.set('curvedLeftArrow', (t, e, n) =>
    (function (t, e) {
      const n = t.match(/[MLAZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi)
      if (!n) return t
      const i = []
      let r = 0
      for (; r < n.length;) {
        const o = n[r++]
        if (!o) break
        if ((i.push(o), 'Z' !== o)) {
          if ('M' === o || 'L' === o) {
            const t = Number(n[r++]),
              o = Number(n[r++])
            i.push(String(e - t), String(o))
            continue
          }
          if ('A' === o) {
            const t = n[r++],
              o = n[r++],
              l = n[r++],
              s = n[r++],
              a = Number(n[r++]),
              d = Number(n[r++]),
              c = Number(n[r++])
            i.push(t, o, l, s, String(a ? 0 : 1), String(e - d), String(c))
            continue
          }
          return t
        }
      }
      return i.join(' ')
    })(Mr.get('curvedRightArrow')(t, e, n), t),
  ),
  Mr.set('curvedUpArrow', (t, e, n) => {
    const i = (t, e, n, i, r, o) => {
        const l = (r * Math.PI) / 180,
          s = (o * Math.PI) / 180,
          a = t + n * Math.cos(l),
          d = e + i * Math.sin(l),
          c = t + n * Math.cos(s),
          u = e + i * Math.sin(s),
          h = o - r
        return `M${a},${d} A${n},${i} 0 ${Math.abs(h) > 180 ? 1 : 0},${h >= 0 ? 1 : 0} ${c},${u}`
      },
      r = Math.min(t, e),
      o = t / 2,
      l = (null == n ? void 0 : n.get('adj1')) ?? 25e3,
      s = (null == n ? void 0 : n.get('adj2')) ?? 5e4,
      a = (null == n ? void 0 : n.get('adj3')) ?? 25e3,
      d = (5e4 * t) / Math.max(r, 1),
      c = Math.max(0, Math.min(s, d)),
      u = (r * Math.max(0, Math.min(l, 1e5))) / 1e5,
      h = (r * c) / 1e5,
      p = o - (u + h) / 4,
      f = 2 * p,
      m = (Math.sqrt(Math.max(f * f - u * u, 0)) * e) / Math.max(f, 1),
      $ = (1e5 * m) / Math.max(r, 1),
      g = (r * Math.max(0, Math.min(a, $))) / 1e5,
      y = p + u,
      x = (Math.sqrt(Math.max(e * e - g * g, 0)) * p) / Math.max(e, 1),
      v = p + x,
      b = y + x,
      M = (h - u) / 2,
      w = v - M,
      k = b + M,
      A = t - h / 2,
      L = g,
      S = Math.atan2(x, g),
      C = Math.atan2(u / 2, m),
      F = Math.PI / 2 - C,
      B = C - S,
      j = Math.PI / 2 - S,
      E = (180 * F) / Math.PI,
      P = (180 * B) / Math.PI,
      T = (180 * j) / Math.PI,
      z = (180 * S) / Math.PI
    return [
      i(p, 0, p, e, E, E + P),
      `L${v},${L}`,
      `L${w},${L}`,
      `L${A},0`,
      `L${k},${L}`,
      `L${b},${L}`,
      i(y, 0, p, e, T, T + z).replace('M', 'L'),
      `L${p},${e}`,
      i(p, 0, p, e, 90, 180).replace('M', 'L'),
      `L${u},0`,
      i(y, 0, p, e, 180, 90).replace('M', 'L'),
      'Z',
    ].join(' ')
  }),
  Mr.set('curvedDownArrow', (t, e, n) => {
    const i = (t, e, n, i, r, o) => {
        const l = (r * Math.PI) / 180,
          s = (o * Math.PI) / 180,
          a = t + n * Math.cos(l),
          d = e + i * Math.sin(l),
          c = t + n * Math.cos(s),
          u = e + i * Math.sin(s),
          h = o - r
        return `M${a},${d} A${n},${i} 0 ${Math.abs(h) > 180 ? 1 : 0},${h >= 0 ? 1 : 0} ${c},${u}`
      },
      r = Math.min(t, e),
      o = t / 2,
      l = (null == n ? void 0 : n.get('adj1')) ?? 25e3,
      s = (null == n ? void 0 : n.get('adj2')) ?? 5e4,
      a = (null == n ? void 0 : n.get('adj3')) ?? 25e3,
      d = (5e4 * t) / Math.max(r, 1),
      c = Math.max(0, Math.min(s, d)),
      u = (r * Math.max(0, Math.min(l, 1e5))) / 1e5,
      h = (r * c) / 1e5,
      p = o - (u + h) / 4,
      f = 2 * p,
      m = (Math.sqrt(Math.max(f * f - u * u, 0)) * e) / Math.max(f, 1),
      $ = (1e5 * m) / Math.max(r, 1),
      g = (r * Math.max(0, Math.min(a, $))) / 1e5,
      y = p + u,
      x = (Math.sqrt(Math.max(e * e - g * g, 0)) * p) / Math.max(e, 1),
      v = p + x,
      b = (h - u) / 2,
      M = v - b,
      w = y + x + b,
      k = t - h / 2,
      A = e - g,
      L = (180 * Math.atan2(x, g)) / Math.PI,
      S = (180 * Math.atan2(u / 2, m)) / Math.PI,
      C = 270 + L,
      F = 270 - S,
      B = S - 90,
      j = 90 + S
    return [
      `M${k},${e}`,
      `L${M},${A}`,
      `L${v},${A}`,
      i(p, e, p, e, C, C - L).replace('M', 'L'),
      `L${y},0`,
      i(y, e, p, e, 270, 270 + L).replace('M', 'L'),
      `L${v + u},${A}`,
      `L${w},${A}`,
      'Z',
      `M${y},0`,
      i(y, e, p, e, F, F + B).replace('M', 'L'),
      i(p, e, p, e, 180, 180 + j).replace('M', 'L'),
      'Z',
    ].join(' ')
  }),
  Mr.set('circularArrow', (t, e, n) => Lr(t, e, n, !1, 'circularArrow')),
  Mr.set('leftCircularArrow', (t, e, n) =>
    Lr(t, e, n, !1, 'leftCircularArrow'),
  ),
  Mr.set('leftRightCircularArrow', (t, e, n) => {
    const i = t / 400,
      r = e / 280,
      o = (t, e) => ({ x: t * i, y: e * r }),
      l = o(35, 140),
      s = o(19.9536, 89.9471),
      a = o(33.4296, 89.9471),
      d = o(74.6127, 28.1974),
      c = o(182.5744, 0.5489),
      u = o(274.5688, 28.1924),
      h = o(315.4978, 40.4912),
      p = o(348.2481, 62.4743),
      f = o(366.5707, 89.9471),
      m = o(380.0463, 89.9471),
      $ = o(365, 140),
      g = o(310.0463, 89.9471),
      y = o(320.9838, 89.9471),
      x = o(274.3848, 50.3095),
      v = o(182.4425, 40.5864),
      b = o(115.6249, 68.2298),
      M = o(101.3589, 74.1319),
      w = o(88.9651, 81.4842),
      k = o(79.0159, 89.947),
      A = o(89.9536, 89.9471)
    return [
      `M${l.x},${l.y}`,
      `L${s.x},${s.y}`,
      `L${a.x},${a.y}`,
      `C${d.x},${d.y} ${c.x},${c.y} ${u.x},${u.y}`,
      `C${h.x},${h.y} ${p.x},${p.y} ${f.x},${f.y}`,
      `L${m.x},${m.y}`,
      `L${$.x},${$.y}`,
      `L${g.x},${g.y}`,
      `L${y.x},${y.y}`,
      `C${x.x},${x.y} ${v.x},${v.y} ${b.x},${b.y}`,
      `C${M.x},${M.y} ${w.x},${w.y} ${k.x},${k.y}`,
      `L${A.x},${A.y}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('quadArrow', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj1')) ?? 22500,
      r = (null == n ? void 0 : n.get('adj2')) ?? 22500,
      o = (null == n ? void 0 : n.get('adj3')) ?? 22500,
      l = e / 2,
      s = t / 2,
      a = Math.min(t, e),
      d = Math.max(0, Math.min(r, 5e4)),
      c = Math.max(0, Math.min(i, 2 * d)),
      u = (a * Math.max(0, Math.min(o, (1e5 - 2 * d) / 2))) / 1e5,
      h = (a * d) / 1e5,
      p = s - h,
      f = s + h,
      m = (a * c) / 2e5,
      $ = s - m,
      g = s + m,
      y = t - u,
      x = l - h,
      v = l + h,
      b = l - m,
      M = l + m,
      w = e - u
    return [
      `M0,${l}`,
      `L${u},${x}`,
      `L${u},${b}`,
      `L${$},${b}`,
      `L${$},${u}`,
      `L${p},${u}`,
      `L${s},0`,
      `L${f},${u}`,
      `L${g},${u}`,
      `L${g},${b}`,
      `L${y},${b}`,
      `L${y},${x}`,
      `L${t},${l}`,
      `L${y},${v}`,
      `L${y},${M}`,
      `L${g},${M}`,
      `L${g},${w}`,
      `L${f},${w}`,
      `L${s},${e}`,
      `L${p},${w}`,
      `L${$},${w}`,
      `L${$},${M}`,
      `L${u},${M}`,
      `L${u},${v}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('quadArrowCallout', (t, e, n) => {
    const i = Math.min(t, e),
      r = t / 2,
      o = e / 2,
      l = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj2')) ?? 18515, 5e4),
      ),
      s = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj1')) ?? 18515, 2 * l),
      ),
      a = 5e4 - l,
      d = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj3')) ?? 18515, a),
      ),
      c = 2 * d,
      u = Math.max(
        s,
        Math.min((null == n ? void 0 : n.get('adj4')) ?? 48123, 1e5 - c),
      ),
      h = (i * l) / 1e5,
      p = (i * s) / 2e5,
      f = (i * d) / 1e5,
      m = (t * u) / 2e5,
      $ = (e * u) / 2e5,
      g = t - f,
      y = r - m,
      x = r + m,
      v = r - h,
      b = r + h,
      M = r - p,
      w = r + p,
      k = e - f,
      A = o - $,
      L = o + $,
      S = o - h,
      C = o + h,
      F = o - p,
      B = o + p
    return [
      `M0,${o}`,
      `L${f},${S}`,
      `L${f},${F}`,
      `L${y},${F}`,
      `L${y},${A}`,
      `L${M},${A}`,
      `L${M},${f}`,
      `L${v},${f}`,
      `L${r},0`,
      `L${b},${f}`,
      `L${w},${f}`,
      `L${w},${A}`,
      `L${x},${A}`,
      `L${x},${F}`,
      `L${g},${F}`,
      `L${g},${S}`,
      `L${t},${o}`,
      `L${g},${C}`,
      `L${g},${B}`,
      `L${x},${B}`,
      `L${x},${L}`,
      `L${w},${L}`,
      `L${w},${k}`,
      `L${b},${k}`,
      `L${r},${e}`,
      `L${v},${k}`,
      `L${M},${k}`,
      `L${M},${L}`,
      `L${y},${L}`,
      `L${y},${B}`,
      `L${f},${B}`,
      `L${f},${C}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('leftRightUpArrow', (t, e, n) => {
    const i = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj2')) ?? 25e3, 5e4),
      ),
      r = 2 * i,
      o = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj1')) ?? 25e3, r),
      ),
      l = (1e5 - r) / 2,
      s = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj3')) ?? 25e3, l),
      ),
      a = Math.min(t, e),
      d = t / 2,
      c = (a * s) / 1e5,
      u = (a * i) / 1e5,
      h = (a * o) / 2e5,
      p = d - h,
      f = d + h,
      m = t - c,
      $ = e - (a * i) / 5e4,
      g = e - u,
      y = g - h,
      x = g + h
    return [
      `M0,${g}`,
      `L${c},${$}`,
      `L${c},${y}`,
      `L${p},${y}`,
      `L${p},${c}`,
      `L${d - u},${c}`,
      `L${d},0`,
      `L${d + u},${c}`,
      `L${f},${c}`,
      `L${f},${y}`,
      `L${m},${y}`,
      `L${m},${$}`,
      `L${t},${g}`,
      `L${m},${e}`,
      `L${m},${x}`,
      `L${c},${x}`,
      `L${c},${e}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('swooshArrow', (t, e, n) => {
    const i = Math.min(t, e),
      r = (null == n ? void 0 : n.get('adj1')) ?? 25e3,
      o = (null == n ? void 0 : n.get('adj2')) ?? 16667,
      l = (7e4 * t) / i,
      s = (e * Math.max(1, Math.min(r, 75e3))) / 1e5,
      a = (i * Math.max(0, Math.min(o, l))) / 1e5,
      d = i / 8,
      c = e / 6,
      u = Math.PI / 2 / 14,
      h = Math.tan(u),
      p = t - a,
      f = d * h,
      m = d + s,
      $ = p + s * h,
      g = m + d
    return [
      `M0,${e}`,
      `Q${t / 6},${c + c} ${p},${d}`,
      `L${p - f},0`,
      `L${t},${g / 2 + e / 20}`,
      `L${$ + f},${g}`,
      `L${$},${m}`,
      `Q${t / 4},${m + c / 2} 0,${e}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('flowChartProcess', (t, e) => `M0,0 L${t},0 L${t},${e} L0,${e} Z`),
  Mr.set('flowChartDecision', (t, e) => {
    const n = t / 2,
      i = e / 2
    return `M${n},0 L${t},${i} L${n},${e} L0,${i} Z`
  }),
  Mr.set('flowChartTerminator', (t, e) => {
    const n = (3475 * t) / 21600,
      i = (18125 * t) / 21600,
      r = e / 2
    return [
      `M${n},0`,
      `L${i},0`,
      `A${n},${r} 0 0,1 ${i},${e}`,
      `L${n},${e}`,
      `A${n},${r} 0 0,1 ${n},0`,
      'Z',
    ].join(' ')
  }),
  Mr.set('flowChartDocument', (t, e) => {
    const n = (17322 * e) / 21600
    return [
      'M0,0',
      `L${t},0`,
      `L${t},${n}`,
      `C${t / 2},${n} ${t / 2},${(23922 * e) / 21600} 0,${(20172 * e) / 21600}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('flowChartInputOutput', (t, e) => {
    const n = t / 5
    return `M${n},0 L${t},0 L${t - n},${e} L0,${e} Z`
  }),
  Mr.set('flowChartPredefinedProcess', (t, e) => {
    const n = t / 8
    return [
      `M0,0 L${t},0 L${t},${e} L0,${e} Z`,
      `M${n},0 L${n},${e}`,
      `M${t - n},0 L${t - n},${e}`,
    ].join(' ')
  }),
  Mr.set('flowChartAlternateProcess', (t, e) => {
    const n = Math.min(t, e) / 6
    return [
      `M${n},0`,
      `L${t - n},0`,
      `A${n},${n} 0 0,1 ${t},${n}`,
      `L${t},${e - n}`,
      `A${n},${n} 0 0,1 ${t - n},${e}`,
      `L${n},${e}`,
      `A${n},${n} 0 0,1 0,${e - n}`,
      `L0,${n}`,
      `A${n},${n} 0 0,1 ${n},0`,
      'Z',
    ].join(' ')
  }),
  Mr.set(
    'flowChartManualInput',
    (t, e) => `M0,${0.2 * e} L${t},0 L${t},${e} L0,${e} Z`,
  ),
  Mr.set(
    'flowChartManualOperation',
    (t, e) => `M0,0 L${t},0 L${(4 * t) / 5},${e} L${t / 5},${e} Z`,
  ),
  Mr.set('flowChartPreparation', (t, e) => {
    const n = 0.2 * t,
      i = e / 2
    return `M${n},0 L${t - n},0 L${t},${i} L${t - n},${e} L${n},${e} L0,${i} Z`
  }),
  Mr.set('flowChartData', (t, e) => {
    const n = 0.15 * t
    return `M${n},0 L${t},0 L${t - n},${e} L0,${e} Z`
  }),
  Mr.set('flowChartInternalStorage', (t, e) => {
    const n = t / 8,
      i = e / 8
    return [
      `M0,0 L${t},0 L${t},${e} L0,${e} Z`,
      `M${n},0 L${n},${e}`,
      `M0,${i} L${t},${i}`,
    ].join(' ')
  }),
  Mr.set('flowChartMagneticDisk', (t, e) => {
    const n = e / 6,
      i = e - n
    return [
      `M0,${n}`,
      `A${t / 2},${n} 0 1,1 ${t},${n}`,
      `L${t},${i}`,
      `A${t / 2},${n} 0 1,1 0,${i}`,
      `L0,${n}`,
      'Z',
      `M${t},${n}`,
      `A${t / 2},${n} 0 1,1 0,${n}`,
    ].join(' ')
  }),
  Mr.set('flowChartDelay', (t, e) => {
    const n = t / 2
    return [
      'M0,0',
      `L${n},0`,
      Er(n, 0, n, e / 2, 270, 180).svg,
      `L0,${e}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('flowChartDisplay', (t, e) => {
    const n = t / 6,
      i = e / 6
    return [
      'M0,' + 3 * i,
      `L${n},0`,
      `L${5 * n},0`,
      Er(5 * n, 0, n, 3 * i, 270, 180).svg,
      `L${n},${e}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('flowChartExtract', (t, e) => `M${t / 2},0 L${t},${e} L0,${e} Z`),
  Mr.set('flowChartMerge', (t, e) => `M0,0 L${t},0 L${t / 2},${e} Z`),
  Mr.set('flowChartOffpageConnector', (t, e) => {
    const n = 0.2 * e
    return [
      'M0,0',
      `L${t},0`,
      `L${t},${e - n}`,
      `L${t / 2},${e}`,
      'L0,' + (e - n),
      'Z',
    ].join(' ')
  }),
  Mr.set('flowChartConnector', (t, e) => {
    const n = t / 2,
      i = e / 2
    return [
      `M${t},${i}`,
      `A${n},${i} 0 1,1 0,${i}`,
      `A${n},${i} 0 1,1 ${t},${i}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('flowChartSort', (t, e) => {
    const n = t / 2,
      i = e / 2
    return [
      `M${n},0 L${t},${i} L${n},${e} L0,${i} Z`,
      `M0,${i} L${t},${i}`,
    ].join(' ')
  }),
  Mr.set('flowChartCollate', (t, e) => {
    const n = t / 2,
      i = e / 2
    return [
      `M0,0 L${t},0 L${n},${i} Z`,
      `M0,${e} L${t},${e} L${n},${i} Z`,
    ].join(' ')
  }),
  Mr.set('flowChartPunchedTape', (t, e) => {
    const n = t / 20,
      i = e / 20,
      r = (t, e, n, i, r, o) => {
        const l = r / 6e4,
          s = o / 6e4,
          a = (l * Math.PI) / 180,
          d = ((l + s) * Math.PI) / 180,
          c = t - n * Math.cos(a),
          u = e - i * Math.sin(a),
          h = c + n * Math.cos(d),
          p = u + i * Math.sin(d)
        return {
          endX: h,
          endY: p,
          svg: `A${n},${i} 0 ${Math.abs(s) > 180 ? 1 : 0},${s > 0 ? 1 : 0} ${h},${p}`,
        }
      },
      o = 5 * n,
      l = 2 * i
    let s = 0,
      a = 2 * i
    const d = [`M${s},${a}`]
    let c = r(s, a, o, l, 108e5, -108e5)
    ;(d.push(c.svg),
      (s = c.endX),
      (a = c.endY),
      (c = r(s, a, o, l, 108e5, 108e5)),
      d.push(c.svg),
      (s = c.endX),
      (a = c.endY))
    const u = 20 * n,
      h = 18 * i
    return (
      d.push(`L${u},${h}`),
      (s = u),
      (a = h),
      (c = r(s, a, o, l, 0, -108e5)),
      d.push(c.svg),
      (s = c.endX),
      (a = c.endY),
      (c = r(s, a, o, l, 0, 108e5)),
      d.push(c.svg),
      d.push('Z'),
      d.join(' ')
    )
  }),
  Mr.set(
    'flowChartPunchedCard',
    (t, e) => `M0,${e / 5} L${t / 5},0 L${t},0 L${t},${e} L0,${e} Z`,
  ),
  Mr.set('flowChartSummingJunction', (t, e) => {
    const n = t / 2,
      i = e / 2,
      r = n * Math.cos(Math.PI / 4),
      o = i * Math.sin(Math.PI / 4),
      l = n - r,
      s = n + r,
      a = i - o,
      d = i + o
    return [
      `M0,${i}`,
      `A${n},${i} 0 1,1 ${t},${i}`,
      `A${n},${i} 0 1,1 0,${i}`,
      'Z',
      `M${l},${a} L${s},${d}`,
      `M${s},${a} L${l},${d}`,
    ].join(' ')
  }),
  Mr.set('flowChartOr', (t, e) => {
    const n = t / 2,
      i = e / 2
    return [
      `M0,${i}`,
      `A${n},${i} 0 1,1 ${t},${i}`,
      `A${n},${i} 0 1,1 0,${i}`,
      'Z',
      `M${n},0 L${n},${e}`,
      `M0,${i} L${t},${i}`,
    ].join(' ')
  }),
  Mr.set('flowChartOnlineStorage', (t, e) => {
    const n = t / 6
    return [
      `M${n},0`,
      `L${t},0`,
      `A${n},${e / 2} 0 0,0 ${t},${e}`,
      `L${n},${e}`,
      `A${n},${e / 2} 0 0,1 ${n},0`,
      'Z',
    ].join(' ')
  }),
  Mr.set('flowChartMagneticDrum', (t, e) => {
    const n = t / 6,
      i = (5 * t) / 6,
      r = e / 2
    return [
      `M${n},0`,
      `L${i},0`,
      `A${n},${r} 0 0,1 ${i},${e}`,
      `L${n},${e}`,
      `A${n},${r} 0 0,1 ${n},0`,
      'Z',
      `M${i},${e}`,
      `A${n},${r} 0 0,1 ${i},0`,
    ].join(' ')
  }),
  Mr.set('flowChartMagneticTape', (t, e) => {
    const n = t / 2,
      i = e / 2,
      r = n,
      o = i,
      l = Math.atan2(e, t),
      s = o + i * Math.sin(Math.PI / 4),
      a = (t, e, n, i, r, o) => {
        const l = (r * Math.PI) / 180,
          s = ((r + o) * Math.PI) / 180,
          a = t - n * Math.cos(l),
          d = e - i * Math.sin(l),
          c = a + n * Math.cos(s),
          u = d + i * Math.sin(s)
        return {
          endX: c,
          endY: u,
          svg: `A${n},${i} 0 ${Math.abs(o) > 180 ? 1 : 0},${o > 0 ? 1 : 0} ${c},${u}`,
        }
      }
    let d = r,
      c = e
    const u = a(d, c, n, i, 90, 90)
    ;((d = u.endX), (c = u.endY))
    const h = a(d, c, n, i, 180, 90)
    ;((d = h.endX), (c = h.endY))
    const p = a(d, c, n, i, 270, 90)
    ;((d = p.endX), (c = p.endY))
    const f = a(d, c, n, i, 0, (180 * l) / Math.PI)
    return [
      `M${r},${e}`,
      u.svg,
      h.svg,
      p.svg,
      f.svg,
      `L${t},${s}`,
      `L${t},${e}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('flowChartMultidocument', (t, e) => {
    const n = (e) => (t * e) / 21600,
      i = (t) => (e * t) / 21600
    return [
      `M0,${i(20782)}`,
      `C${n(9298)},${i(23542)} ${n(9298)},${i(18022)} ${n(18595)},${i(18022)}`,
      `L${n(18595)},${i(3675)} L0,${i(3675)} Z`,
      `M${n(1532)},${i(3675)} L${n(1532)},${i(1815)} L${n(2e4)},${i(1815)}`,
      `L${n(2e4)},${i(16252)}`,
      `C${n(19298)},${i(16252)} ${n(18595)},${i(16352)} ${n(18595)},${i(16352)}`,
      `L${n(18595)},${i(3675)} Z`,
      `M${n(2972)},${i(1815)} L${n(2972)},0 L${t},0`,
      `L${t},${i(14392)}`,
      `C${n(20800)},${i(14392)} ${n(2e4)},${i(14467)} ${n(2e4)},${i(14467)}`,
      `L${n(2e4)},${i(1815)} Z`,
    ].join(' ')
  }),
  Mr.set('wedgeRectCallout', (t, e, n) => {
    const i = t / 2,
      r = e / 2,
      o = (t * ((null == n ? void 0 : n.get('adj1')) ?? -20833)) / 1e5,
      l = (e * ((null == n ? void 0 : n.get('adj2')) ?? 62500)) / 1e5,
      s = i + o,
      a = r + l,
      d = (o * e) / t,
      c = Math.abs(l) - Math.abs(d),
      u = (t * (o >= 0 ? 7 : 2)) / 12,
      h = (t * (o >= 0 ? 10 : 5)) / 12,
      p = (e * (l >= 0 ? 7 : 2)) / 12,
      f = (e * (l >= 0 ? 10 : 5)) / 12
    return [
      'M0,0',
      `L${u},0`,
      `L${c > 0 ? (l >= 0 ? u : s) : u},${c > 0 ? (l >= 0 ? 0 : a) : 0}`,
      `L${h},0`,
      `L${t},0`,
      `L${t},${p}`,
      `L${c > 0 ? t : o >= 0 ? s : t},${c > 0 ? p : o >= 0 ? a : p}`,
      `L${t},${f}`,
      `L${t},${e}`,
      `L${h},${e}`,
      `L${c > 0 && l >= 0 ? s : u},${c > 0 && l >= 0 ? a : e}`,
      `L${u},${e}`,
      `L0,${e}`,
      `L0,${f}`,
      `L${c > 0 || o >= 0 ? 0 : s},${c > 0 || o >= 0 ? p : a}`,
      `L0,${p}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('wedgeRoundRectCallout', (t, e, n) => {
    const i = t / 2,
      r = e / 2,
      o = Math.min(t, e),
      l = (t * ((null == n ? void 0 : n.get('adj1')) ?? -20833)) / 1e5,
      s = (e * ((null == n ? void 0 : n.get('adj2')) ?? 62500)) / 1e5,
      a = (o * ((null == n ? void 0 : n.get('adj3')) ?? 16667)) / 1e5,
      d = i + l,
      c = r + s,
      u = (l * e) / t,
      h = Math.abs(s) - Math.abs(u),
      p = t - a,
      f = e - a,
      m = (t * (l >= 0 ? 7 : 2)) / 12,
      $ = (t * (l >= 0 ? 10 : 5)) / 12,
      g = (e * (s >= 0 ? 7 : 2)) / 12,
      y = (e * (s >= 0 ? 10 : 5)) / 12
    return [
      `M0,${a}`,
      `A${a},${a} 0 0,1 ${a},0`,
      `L${m},0`,
      `L${h > 0 ? (s >= 0 ? m : d) : m},${h > 0 ? (s >= 0 ? 0 : c) : 0}`,
      `L${$},0`,
      `L${p},0`,
      `A${a},${a} 0 0,1 ${t},${a}`,
      `L${t},${g}`,
      `L${h > 0 ? t : l >= 0 ? d : t},${h > 0 ? g : l >= 0 ? c : g}`,
      `L${t},${y}`,
      `L${t},${f}`,
      `A${a},${a} 0 0,1 ${p},${e}`,
      `L${$},${e}`,
      `L${h > 0 && s >= 0 ? d : m},${h > 0 && s >= 0 ? c : e}`,
      `L${m},${e}`,
      `L${a},${e}`,
      `A${a},${a} 0 0,1 0,${f}`,
      `L0,${y}`,
      `L${h > 0 || l >= 0 ? 0 : d},${h > 0 || l >= 0 ? g : c}`,
      `L0,${g}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('wedgeEllipseCallout', (t, e, n) => {
    const i = t / 2,
      r = e / 2,
      o = i + t * yr(n, 'adj1', -20833),
      l = r + e * yr(n, 'adj2', 62500),
      s = Math.atan2(l - r, o - i)
    return [
      Ji(
        i,
        r,
        i,
        r,
        (180 * (s + 0.15)) / Math.PI,
        (180 * (s - 0.15 + 2 * Math.PI)) / Math.PI,
      ),
      `L${o},${l}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('cloudCallout', (t, e, n) => {
    const i = t / 2 + t * yr(n, 'adj1', -20833),
      r = e / 2 + e * yr(n, 'adj2', 62500),
      o = Mr.get('cloud')(t, e),
      l = t / 2,
      s = e / 2,
      a = i - l,
      d = r - s,
      c = 0.04 * Math.min(t, e),
      u = 0.025 * Math.min(t, e),
      h = l + 0.5 * a,
      p = s + 0.5 * d,
      f = l + 0.75 * a,
      m = s + 0.75 * d
    return [
      o,
      `M${h + c},${p} A${c},${c} 0 1,1 ${h - c},${p} A${c},${c} 0 1,1 ${h + c},${p} Z`,
      `M${f + u},${m} A${u},${u} 0 1,1 ${f - u},${m} A${u},${u} 0 1,1 ${f + u},${m} Z`,
    ].join(' ')
  }),
  Mr.set('borderCallout1', (t, e, n) => {
    const i = (e * ((null == n ? void 0 : n.get('adj1')) ?? 18750)) / 1e5,
      r = (t * ((null == n ? void 0 : n.get('adj2')) ?? -8333)) / 1e5,
      o = (e * ((null == n ? void 0 : n.get('adj3')) ?? 112500)) / 1e5
    return `M0,0 L${t},0 L${t},${e} L0,${e} Z M${r},${i} L${(t * ((null == n ? void 0 : n.get('adj4')) ?? -38333)) / 1e5},${o}`
  }),
  Mr.set('cube', (t, e, n) => {
    const i = yr(n, 'adj', 25e3),
      r = Math.min(t, e) * i
    return [
      `M0,${r} L${t - r},${r} L${t - r},${e} L0,${e} Z`,
      `M0,${r} L${r},0 L${t},0 L${t - r},${r} Z`,
      `M${t - r},${r} L${t},0 L${t},${e - r} L${t - r},${e} Z`,
    ].join(' ')
  }),
  Mr.set('plus', (t, e, n) => {
    const i =
        (Math.min(t, e) * Math.min(Math.max(xr(n, 'adj', 25e3), 0), 5e4)) / 1e5,
      r = t - i,
      o = e - i
    return [
      `M0,${i}`,
      `L${i},${i}`,
      `L${i},0`,
      `L${r},0`,
      `L${r},${i}`,
      `L${t},${i}`,
      `L${t},${o}`,
      `L${r},${o}`,
      `L${r},${e}`,
      `L${i},${e}`,
      `L${i},${o}`,
      `L0,${o}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('heart', (t, e) => {
    const n = t / 2,
      i = e / 4,
      r = (49 * t) / 48,
      o = (10 * t) / 48,
      l = -(e / 3)
    return [
      `M${n},${i}`,
      `C${n + o},${l} ${n + r},${i} ${n},${e}`,
      `C${n - r},${i} ${n - o},${l} ${n},${i}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('cloud', (t, e) => {
    const n = t / 43200,
      i = e / 43200,
      r = [
        [6753, 9190, -11429249, 7426832],
        [5333, 7267, -8646143, 5396714],
        [4365, 5945, -8748475, 5983381],
        [4857, 6595, -7859164, 7034504],
        [5333, 7273, -4722533, 6541615],
        [6775, 9220, -2776035, 7816140],
        [5785, 7867, 37501, 6842e3],
        [6752, 9215, 1347096, 6910353],
        [7720, 10543, 3974558, 4542661],
        [4360, 5918, -16496525, 8804134],
        [4345, 5945, -14809710, 9151131],
      ]
    let o = 3900 * n,
      l = 14370 * i
    const s = [`M${o},${l}`]
    let a = 3900,
      d = 14370
    for (const [c, u, h, p] of r) {
      const t = h / 6e4,
        e = p / 6e4,
        r = (t * Math.PI) / 180,
        f = Math.atan2(c * Math.sin(r), u * Math.cos(r)),
        m = ((t + e) * Math.PI) / 180,
        $ = Math.atan2(c * Math.sin(m), u * Math.cos(m)),
        g = a - c * Math.cos(f),
        y = d - u * Math.sin(f),
        x = g + c * Math.cos($),
        v = y + u * Math.sin($),
        b = x * n,
        M = v * i,
        w = c * n,
        k = u * i,
        A = Math.abs(e) > 180 ? 1 : 0,
        L = e > 0 ? 1 : 0
      ;(s.push(`A${w},${k} 0 ${A},${L} ${b},${M}`),
        (a = x),
        (d = v),
        (o = b),
        (l = M))
    }
    return (s.push('Z'), s.join(' '))
  }),
  Mr.set('frame', (t, e, n) => {
    const i = yr(n, 'adj1', 12500),
      r = Math.min(t, e) * i
    return [
      `M0,0 L${t},0 L${t},${e} L0,${e} Z`,
      `M${r},${r} L${r},${e - r} L${t - r},${e - r} L${t - r},${r} Z`,
    ].join(' ')
  }),
  Mr.set('halfFrame', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj1')) ?? 33333,
      r = (null == n ? void 0 : n.get('adj2')) ?? 33333,
      o = Math.min(t, e),
      l = (o * Math.max(0, Math.min(r, (1e5 * t) / Math.max(o, 1)))) / 1e5,
      s = e - (e * l) / Math.max(t, 1),
      a = (o * Math.max(0, Math.min(i, (1e5 * s) / Math.max(o, 1)))) / 1e5
    return [
      'M0,0',
      `L${t},0`,
      `L${t - (a * t) / Math.max(e, 1)},${a}`,
      `L${l},${a}`,
      `L${l},${e - (l * e) / Math.max(t, 1)}`,
      `L0,${e}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('donut', (t, e, n) => {
    const i =
        (Math.min(t, e) * Math.min(Math.max(xr(n, 'adj', 25e3), 0), 5e4)) / 1e5,
      r = t / 2,
      o = e / 2,
      l = Math.max(0, r - i),
      s = Math.max(0, o - i)
    return [
      `M0,${o}`,
      `A${r},${o} 0 1,1 ${t},${o}`,
      `A${r},${o} 0 1,1 0,${o}`,
      'Z',
      `M${i},${o}`,
      `A${l},${s} 0 1,0 ${t - i},${o}`,
      `A${l},${s} 0 1,0 ${i},${o}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('noSmoking', (t, e, n) => {
    const i =
        (Math.min(t, e) * Math.min(Math.max(xr(n, 'adj', 18750), 0), 5e4)) /
        1e5,
      r = t / 2,
      o = e / 2,
      l = t / 2,
      s = e / 2,
      a = r - i,
      d = o - i,
      c = Math.atan2(e, t),
      u = d * Math.cos(c),
      h = a * Math.sin(c),
      p = Math.sqrt(u * u + h * h) || 1,
      f = (a * d) / p,
      m = i / 2,
      $ = Math.atan2(m, f),
      g = 2 * $,
      y = -(Math.PI - g),
      x = c - $,
      v = x - Math.PI,
      b = (t) => {
        const e = d * Math.cos(t),
          n = a * Math.sin(t),
          i = Math.sqrt(e * e + n * n) || 1,
          r = (a * d) / i
        return { x: l + r * Math.cos(t), y: s + r * Math.sin(t) }
      },
      M = b(x),
      w = b(v),
      k = v + y,
      A = b(x + y),
      L = b(k),
      S = Math.abs(y) > Math.PI ? 1 : 0,
      C = y > 0 ? 1 : 0
    return [
      `M0,${s}`,
      `A${r},${o} 0 1,1 ${t},${s}`,
      `A${r},${o} 0 1,1 0,${s}`,
      'Z',
      `M${M.x},${M.y}`,
      `A${a},${d} 0 ${S},${C} ${A.x},${A.y}`,
      'Z',
      `M${w.x},${w.y}`,
      `A${a},${d} 0 ${S},${C} ${L.x},${L.y}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('blockArc', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj1')) ?? 108e5,
      r = (null == n ? void 0 : n.get('adj2')) ?? 0,
      o = (null == n ? void 0 : n.get('adj3')) ?? 25e3,
      l = Math.min(Math.max(i / 6e4, 0), 360),
      s = Math.min(Math.max(r / 6e4, 0), 360),
      a = (s - l + 360) % 360 || 360,
      d = l + a,
      c = s - a,
      u = t / 2,
      h = e / 2,
      p = (Math.min(t, e) * Math.max(0, Math.min(o, 5e4))) / 1e5,
      f = Math.max(1, u - p),
      m = Math.max(1, h - p),
      $ = (t, e, n, i, r) => {
        const o = (r * Math.PI) / 180
        return { x: t + n * Math.cos(o), y: e + i * Math.sin(o) }
      },
      g = $(u, h, u, h, l),
      y = $(u, h, u, h, d),
      x = $(u, h, f, m, s),
      v = $(u, h, f, m, c),
      b = a > 180 ? 1 : 0
    return [
      `M${g.x},${g.y}`,
      `A${u},${h} 0 ${b},1 ${y.x},${y.y}`,
      `L${x.x},${x.y}`,
      `A${f},${m} 0 ${b},0 ${v.x},${v.y}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('gear6', (t, e, n) =>
    Sr(
      t,
      e,
      6,
      (null == n ? void 0 : n.get('adj1')) ?? 15e3,
      (null == n ? void 0 : n.get('adj2')) ?? 3526,
    ),
  ),
  Mr.set('gear9', (t, e, n) =>
    Sr(
      t,
      e,
      9,
      (null == n ? void 0 : n.get('adj1')) ?? 1e4,
      (null == n ? void 0 : n.get('adj2')) ?? 1763,
    ),
  ),
  Mr.set('mathPlus', (t, e, n) => {
    const i = (73490 * t) / 2e5,
      r = (73490 * e) / 2e5,
      o =
        (Math.min(t, e) * Math.min(Math.max(xr(n, 'adj', 23520), 0), 73490)) /
        2e5,
      l = t / 2,
      s = e / 2,
      a = l - i,
      d = l - o,
      c = l + o,
      u = l + i,
      h = s - r,
      p = s - o,
      f = s + o,
      m = s + r
    return [
      `M${a},${p}`,
      `L${d},${p}`,
      `L${d},${h}`,
      `L${c},${h}`,
      `L${c},${p}`,
      `L${u},${p}`,
      `L${u},${f}`,
      `L${c},${f}`,
      `L${c},${m}`,
      `L${d},${m}`,
      `L${d},${f}`,
      `L${a},${f}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('mathMinus', (t, e, n) => {
    const i = (e * Math.min(Math.max(xr(n, 'adj1', 23520), 0), 1e5)) / 2e5,
      r = (73490 * t) / 2e5,
      o = t / 2,
      l = e / 2,
      s = o - r,
      a = o + r,
      d = l - i,
      c = l + i
    return `M${s},${d} L${a},${d} L${a},${c} L${s},${c} Z`
  }),
  Mr.set('mathMultiply', (t, e, n) => {
    const i = t / 2,
      r = e / 2,
      o =
        (Math.min(t, e) * Math.min(Math.max(xr(n, 'adj1', 23520), 0), 51965)) /
        1e5,
      l = Math.atan2(e, t),
      s = Math.sin(l),
      a = Math.cos(l),
      d = s / a,
      c = Math.sqrt(t * t + e * e),
      u = c - (51965 * c) / 1e5,
      h = (a * u) / 2,
      p = (s * u) / 2,
      f = (s * o) / 2,
      m = (a * o) / 2,
      $ = h - f,
      g = p + m,
      y = h + f,
      x = p - m,
      v = (i - y) * d + x,
      b = t - y,
      M = t - $,
      w = (r - g) / d,
      k = e - g,
      A = e - x
    return [
      `M${$},${g}`,
      `L${y},${x}`,
      `L${i},${v}`,
      `L${b},${x}`,
      `L${M},${g}`,
      `L${M - w},${r}`,
      `L${M},${k}`,
      `L${b},${A}`,
      `L${i},${e - v}`,
      `L${y},${A}`,
      `L${$},${k}`,
      `L${$ + w},${r}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('mathDivide', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj1')) ?? 23520,
      r = (null == n ? void 0 : n.get('adj2')) ?? 5880,
      o = (null == n ? void 0 : n.get('adj3')) ?? 11760,
      l = Math.min(Math.max(i, 1e3), 36745),
      s = Math.min((73490 - l) / 4, (36745 * t) / Math.max(e, 1)),
      a = Math.min(Math.max(o, 1e3), s),
      d = 73490 - 4 * a - l,
      c = t / 2,
      u = e / 2,
      h = (e * l) / 2e5,
      p = (e * a) / 1e5,
      f = (73490 * t) / 2e5,
      m = u - h,
      $ = u + h,
      g = m - ((e * Math.min(Math.max(r, 0), d)) / 1e5 + p) - p,
      y = e - g,
      x = c - f,
      v = c + f
    return [
      `M${c + p},${g + p} A${p},${p} 0 1,1 ${c - p},${g + p} A${p},${p} 0 1,1 ${c + p},${g + p} Z`,
      `M${c + p},${y - p} A${p},${p} 0 1,1 ${c - p},${y - p} A${p},${p} 0 1,1 ${c + p},${y - p} Z`,
      `M${x},${m} L${v},${m} L${v},${$} L${x},${$} Z`,
    ].join(' ')
  }),
  Mr.set('mathEqual', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj1')) ?? 23520,
      r = (null == n ? void 0 : n.get('adj2')) ?? 11760,
      o = Math.min(Math.max(i, 0), 36745),
      l = 1e5 - 2 * o,
      s = (e * o) / 1e5,
      a = (e * Math.min(Math.max(r, 0), Math.max(l, 0))) / 2e5,
      d = (73490 * t) / 2e5,
      c = t / 2,
      u = e / 2,
      h = u - a,
      p = u + a,
      f = h - s,
      m = p + s,
      $ = c - d,
      g = c + d
    return [
      `M${$},${f} L${g},${f} L${g},${h} L${$},${h} Z`,
      `M${$},${p} L${g},${p} L${g},${m} L${$},${m} Z`,
    ].join(' ')
  }),
  Mr.set('mathNotEqual', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj1')) ?? 23520,
      r = null == n ? void 0 : n.get('adj2'),
      o = (null == n ? void 0 : n.get('adj3')) ?? 11760,
      l = t / 2,
      s = e / 2,
      a = e / 2,
      d = Math.min(Math.max(i, 0), 5e4),
      c = (() => {
        if (void 0 === r) return (110 * Math.PI) / 180
        const t = ((r / 6e4) * Math.PI) / 180,
          e = (70 * Math.PI) / 180,
          n = (110 * Math.PI) / 180
        return Math.min(Math.max(t, e), n)
      })(),
      u = 1e5 - 2 * d,
      h = (e * d) / 1e5,
      p = (e * Math.min(Math.max(o, 0), u)) / 2e5,
      f = (73490 * t) / 2e5,
      m = l - f,
      $ = l + f,
      g = s - p,
      y = s + p,
      x = g - h,
      v = y + h,
      b = c - Math.PI / 2,
      M = a * Math.tan(b),
      w = Math.hypot(M, a) || 1,
      k = (w * h) / a,
      A = l + M - k / 2,
      L = A - (M * x) / a,
      S = A - (M * g) / a,
      C = A - (M * y) / a,
      F = A - (M * v) / a,
      B = A + k,
      j = (h * a) / w,
      E = b > 0 ? A + j : B,
      P = b > 0 ? A : B - j,
      T = (h * M) / w,
      z = b > 0 ? T : 0,
      N = b > 0 ? 0 : -T
    return [
      `M${m},${x}`,
      `L${L},${x}`,
      `L${P},${N}`,
      `L${E},${z}`,
      `L${L + k},${x}`,
      `L${$},${x}`,
      `L${$},${g}`,
      `L${S + k},${g}`,
      `L${C + k},${y}`,
      `L${$},${y}`,
      `L${$},${v}`,
      `L${F + k},${v}`,
      `L${t - P},${e - N}`,
      `L${t - E},${e - z}`,
      `L${F},${v}`,
      `L${m},${v}`,
      `L${m},${y}`,
      `L${C},${y}`,
      `L${S},${g}`,
      `L${m},${g}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('round1Rect', (t, e, n) => {
    const i = yr(n, 'adj', 16667),
      r = Math.min(t, e) * i
    return [
      'M0,0',
      `L${t - r},0`,
      `A${r},${r} 0 0,1 ${t},${r}`,
      `L${t},${e}`,
      `L0,${e}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('round2SameRect', (t, e, n) => {
    const i = yr(n, 'adj1', 16667),
      r = yr(n, 'adj2', 0),
      o = Math.min(t, e) * i,
      l = Math.min(t, e) * r
    return [
      `M${o},0`,
      `L${t - o},0`,
      `A${o},${o} 0 0,1 ${t},${o}`,
      `L${t},${e - l}`,
      `A${l},${l} 0 0,1 ${t - l},${e}`,
      `L${l},${e}`,
      `A${l},${l} 0 0,1 0,${e - l}`,
      `L0,${o}`,
      `A${o},${o} 0 0,1 ${o},0`,
      'Z',
    ].join(' ')
  }),
  Mr.set('round2DiagRect', (t, e, n) => {
    const i = yr(n, 'adj1', 16667),
      r = yr(n, 'adj2', 0),
      o = Math.min(t, e) * i,
      l = Math.min(t, e) * r
    return [
      `M${o},0`,
      `L${t},0`,
      `L${t},${e - l}`,
      `A${l},${l} 0 0,1 ${t - l},${e}`,
      `L0,${e}`,
      `L0,${o}`,
      `A${o},${o} 0 0,1 ${o},0`,
      'Z',
    ].join(' ')
  }),
  Mr.set('snip1Rect', (t, e, n) => {
    const i = yr(n, 'adj', 16667),
      r = Math.min(t, e) * i
    return `M0,0 L${t - r},0 L${t},${r} L${t},${e} L0,${e} Z`
  }),
  Mr.set('snip2SameRect', (t, e, n) => {
    const i = yr(n, 'adj1', 16667),
      r = yr(n, 'adj2', 0),
      o = Math.min(t, e) * i,
      l = Math.min(t, e) * r
    return `M${o},0 L${t - o},0 L${t},${o} L${t},${e - l} L${t - l},${e} L${l},${e} L0,${e - l} L0,${o} Z`
  }),
  Mr.set('snip2DiagRect', (t, e, n) => {
    const i = Math.min(t, e),
      r =
        (i *
          Math.min(
            Math.max((null == n ? void 0 : n.get('adj1')) ?? 0, 0),
            5e4,
          )) /
        1e5,
      o =
        (i *
          Math.min(
            Math.max((null == n ? void 0 : n.get('adj2')) ?? 16667, 0),
            5e4,
          )) /
        1e5
    return `M${r},0 L${t - o},0 L${t},${o} L${t},${e - r} L${t - r},${e} L${o},${e} L0,${e - o} L0,${r} Z`
  }),
  Mr.set('snipRoundRect', (t, e, n) => {
    const i = yr(n, 'adj1', 16667),
      r = yr(n, 'adj2', 16667),
      o = Math.min(t, e) * i,
      l = Math.min(t, e) * r
    return [
      `M${o},0`,
      `L${t - l},0`,
      `L${t},${l}`,
      `L${t},${e}`,
      `L0,${e}`,
      `L0,${o}`,
      `A${o},${o} 0 0,1 ${o},0`,
      'Z',
    ].join(' ')
  }),
  Mr.set('bevel', (t, e, n) => {
    const i = yr(n, 'adj', 12500),
      r = Math.min(t, e) * i
    return [
      `M0,0 L${t},0 L${t},${e} L0,${e} Z`,
      `M${r},${r} L${r},${e - r} L${t - r},${e - r} L${t - r},${r} Z`,
      `M0,0 L${t},0 L${t - r},${r} L${r},${r} Z`,
      `M${t},0 L${t},${e} L${t - r},${e - r} L${t - r},${r} Z`,
      `M${t},${e} L0,${e} L${r},${e - r} L${t - r},${e - r} Z`,
      `M0,${e} L0,0 L${r},${r} L${r},${e - r} Z`,
    ].join(' ')
  }),
  Mr.set('foldedCorner', (t, e, n) => {
    const i = yr(n, 'adj', 16667),
      r = Math.min(t, e) * i * 0.7
    return [
      `M0,0 L${t},0 L${t},${e} L0,${e} Z`,
      `M${t - r},${e} L${t},${e} L${t},${e - r}`,
    ].join(' ')
  }),
  Mr.set('sun', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj')) ?? 25e3,
      r = Math.min(Math.max(i, 12500), 46875),
      o = 5e4 - r,
      l = (3 * (5e4 - (30274 * o) / 32768)) / 4,
      s = (3 * (5e4 - (12540 * o) / 32768)) / 4,
      a = l + 3662,
      d = s + 3662,
      c = s + 12500,
      u = 1e5 - l,
      h = 1e5 - a,
      p = 1e5 - d,
      f = 1e5 - c,
      m = t / 2,
      $ = e / 2,
      g = (18436 * t) / 21600,
      y = (3163 * e) / 21600,
      x = (3163 * t) / 21600,
      v = (18436 * e) / 21600,
      b = (t, e) => (e * t) / 1e5,
      M = b(l, t),
      w = b(a, t),
      k = b(d, t),
      A = b(c, t),
      L = b(u, t),
      S = b(h, t),
      C = b(p, t),
      F = b(f, t),
      B = b(o, t),
      j = b(o, e),
      E = b(l, e),
      P = b(a, e),
      T = b(d, e),
      z = b(c, e),
      N = b(u, e),
      R = b(h, e),
      I = b(p, e),
      D = b(f, e),
      O = b(r, t)
    return [
      `M${t},${$} L${L},${D} L${L},${z} Z`,
      `M${g},${y} L${S},${T} L${C},${P} Z`,
      `M${m},0 L${F},${E} L${A},${E} Z`,
      `M${x},${y} L${k},${P} L${w},${T} Z`,
      `M0,${$} L${M},${z} L${M},${D} Z`,
      `M${x},${v} L${w},${I} L${k},${R} Z`,
      `M${m},${e} L${A},${N} L${F},${N} Z`,
      `M${g},${v} L${C},${R} L${S},${I} Z`,
      `M${O},${$}`,
      `A${B},${j} 0 1,1 ${O + 2 * B},${$}`,
      `A${B},${j} 0 1,1 ${O},${$}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('moon', (t, e, n) => {
    if (t <= 0 || e <= 0) return `M0,0 L${t},0 L${t},${e} L0,${e} Z`
    const i = Math.min(t, e),
      r = e / 2,
      o =
        (i *
          Math.min(
            Math.max((null == n ? void 0 : n.get('adj')) ?? 5e4, 0),
            87500,
          )) /
        1e5,
      l = i - o
    if (l <= 0) return `M0,0 L${t},0 L${t},${e} L0,${e} Z`
    const s = (2 * i * i - o * o) / l
    return [
      `M${t},${e}`,
      `A${t},${r} 0 0,1 ${t},0`,
      `A${(((s - o) * t) / i - (o * t) / i) / 2},${((s / 2 - o) * r) / i} 0 0,0 ${t},${e}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('lightningBolt', (t, e) =>
    [
      `M${0.3895 * t},${0 * e}`,
      `L${0 * t},${0.1821 * e}`,
      `L${0.3425 * t},${0.3845 * e}`,
      `L${0.2265 * t},${0.4452 * e}`,
      `L${0.5497 * t},${0.6391 * e}`,
      `L${0.453 * t},${0.683 * e}`,
      `L${0.9972 * t},${0.9983 * e}`,
      `L${0.6796 * t},${0.5919 * e}`,
      `L${0.7624 * t},${0.5514 * e}`,
      `L${0.5138 * t},${0.3153 * e}`,
      `L${0.5939 * t},${0.2816 * e}`,
      'Z',
    ].join(' '),
  ),
  Mr.set('bracketPair', (t, e, n) => {
    const i =
        (Math.min(t, e) * Math.min(Math.max(xr(n, 'adj', 16667), 0), 5e4)) /
        1e5,
      r = t - i,
      o = e - i
    return [
      `M${i},${e}`,
      `A${i},${i} 0 0,1 0,${o}`,
      `L0,${i}`,
      `A${i},${i} 0 0,1 ${i},0`,
      `M${r},0`,
      `A${i},${i} 0 0,1 ${t},${i}`,
      `L${t},${o}`,
      `A${i},${i} 0 0,1 ${r},${e}`,
    ].join(' ')
  }),
  Mr.set('bracePair', (t, e, n) => {
    const i = yr(n, 'adj', 8333),
      r = Math.min(t, e) * i,
      o = e / 2
    return [
      `M${2 * r},0`,
      `A${r},${r} 0 0,0 ${r},${r}`,
      `L${r},${o - r}`,
      `A${r},${r} 0 0,1 0,${o}`,
      `A${r},${r} 0 0,1 ${r},${o + r}`,
      `L${r},${e - r}`,
      `A${r},${r} 0 0,0 ${2 * r},${e}`,
      `M${t - 2 * r},0`,
      `A${r},${r} 0 0,1 ${t - r},${r}`,
      `L${t - r},${o - r}`,
      `A${r},${r} 0 0,0 ${t},${o}`,
      `A${r},${r} 0 0,0 ${t - r},${o + r}`,
      `L${t - r},${e - r}`,
      `A${r},${r} 0 0,1 ${t - 2 * r},${e}`,
    ].join(' ')
  }),
  Mr.set('leftBracket', (t, e, n) => {
    const i = Math.min(t, e),
      r = i > 0 ? (5e4 * e) / i : 0,
      o =
        (i *
          Math.max(
            0,
            Math.min((null == n ? void 0 : n.get('adj')) ?? 8333, r),
          )) /
        1e5,
      l = (t) => t / 6e4,
      s = (t, e, n, i, r, o) => {
        const s = (l(r) * Math.PI) / 180,
          a = (l(o) * Math.PI) / 180,
          d = t - n * Math.cos(s),
          c = e - i * Math.sin(s),
          u = d + n * Math.cos(s + a),
          h = c + i * Math.sin(s + a)
        return {
          cmd: `A${n},${i} 0 ${Math.abs(l(o)) > 180 ? 1 : 0},1 ${u},${h}`,
          x: u,
          y: h,
        }
      },
      a = s(t, e, t, o, 54e5, 54e5),
      d = s(0, o, t, o, 108e5, 54e5)
    return [`M${t},${e}`, a.cmd, `L0,${o}`, d.cmd].join(' ')
  }),
  Mr.set('rightBracket', (t, e, n) => {
    const i = Math.min(t, e),
      r = i > 0 ? (5e4 * e) / i : 0,
      o =
        (i *
          Math.max(
            0,
            Math.min((null == n ? void 0 : n.get('adj')) ?? 8333, r),
          )) /
        1e5,
      l = e - o,
      s = (t) => t / 6e4,
      a = (t, e, n, i, r, o) => {
        const l = (s(r) * Math.PI) / 180,
          a = (s(o) * Math.PI) / 180,
          d = t - n * Math.cos(l),
          c = e - i * Math.sin(l),
          u = d + n * Math.cos(l + a),
          h = c + i * Math.sin(l + a)
        return {
          cmd: `A${n},${i} 0 ${Math.abs(s(o)) > 180 ? 1 : 0},1 ${u},${h}`,
          x: u,
          y: h,
        }
      },
      d = a(0, 0, t, o, 162e5, 54e5),
      c = a(t, l, t, o, 0, 54e5)
    return ['M0,0', d.cmd, `L${t},${l}`, c.cmd].join(' ')
  }),
  Mr.set('leftBrace', (t, e, n) => {
    const i = Math.min(t, e),
      r = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj2')) ?? 5e4, 1e5),
      ),
      o = 1e5 - r,
      l = Math.min(o, r) / 2,
      s = i > 0 ? (l * e) / i : 0,
      a =
        (i *
          Math.max(
            0,
            Math.min((null == n ? void 0 : n.get('adj1')) ?? 8333, s),
          )) /
        1e5,
      d = (e * r) / 1e5 + a,
      c = t / 2,
      u = t / 2,
      h = (t) => t / 6e4,
      p = (t, e, n, i, r, o) => {
        const l = (h(r) * Math.PI) / 180,
          s = (h(o) * Math.PI) / 180,
          a = t - n * Math.cos(l),
          d = e - i * Math.sin(l),
          c = a + n * Math.cos(l + s),
          u = d + i * Math.sin(l + s)
        return {
          cmd: `A${n},${i} 0 ${Math.abs(h(o)) > 180 ? 1 : 0},${o >= 0 ? 1 : 0} ${c},${u}`,
          x: c,
          y: u,
        }
      }
    let f = t,
      m = e
    const $ = p(f, m, c, a, 54e5, 54e5)
    ;((f = $.x), (m = $.y))
    const g = p(u, d, c, a, 0, -54e5),
      y = p(g.x, g.y, c, a, 54e5, -54e5),
      x = p(u, a, c, a, 108e5, 54e5)
    return [
      `M${t},${e}`,
      $.cmd,
      `L${u},${d}`,
      g.cmd,
      y.cmd,
      `L${u},${a}`,
      x.cmd,
    ].join(' ')
  }),
  Mr.set('rightBrace', (t, e, n) => {
    const i = Math.min(t, e),
      r = Math.max(
        0,
        Math.min((null == n ? void 0 : n.get('adj2')) ?? 5e4, 1e5),
      ),
      o = 1e5 - r,
      l = Math.min(o, r) / 2,
      s = i > 0 ? (l * e) / i : 0,
      a =
        (i *
          Math.max(
            0,
            Math.min((null == n ? void 0 : n.get('adj1')) ?? 8333, s),
          )) /
        1e5,
      d = (e * r) / 1e5 - a,
      c = e - a,
      u = t / 2,
      h = t / 2,
      p = (t) => t / 6e4,
      f = (t, e, n, i, r, o) => {
        const l = (p(r) * Math.PI) / 180,
          s = (p(o) * Math.PI) / 180,
          a = t - n * Math.cos(l),
          d = e - i * Math.sin(l),
          c = a + n * Math.cos(l + s),
          u = d + i * Math.sin(l + s)
        return {
          cmd: `A${n},${i} 0 ${Math.abs(p(o)) > 180 ? 1 : 0},${o >= 0 ? 1 : 0} ${c},${u}`,
          x: c,
          y: u,
        }
      },
      m = f(0, 0, u, a, 162e5, 54e5),
      $ = f(h, d, u, a, 108e5, -54e5),
      g = f($.x, $.y, u, a, 162e5, -54e5),
      y = f(h, c, u, a, 0, 54e5)
    return [
      'M0,0',
      m.cmd,
      `L${h},${d}`,
      $.cmd,
      g.cmd,
      `L${h},${c}`,
      y.cmd,
    ].join(' ')
  }),
  Mr.set('actionButtonBlank', (t, e) => `M0,0 L${t},0 L${t},${e} L0,${e} Z`))
var Cr = new Map()
;(Cr.set('actionButtonForwardNext', (t, e) => {
  const n = t / 2,
    i = e / 2,
    r = 0.3 * Math.min(t, e)
  return `M${n - 0.5 * r},${i - r} L${n + r},${i} L${n - 0.5 * r},${i + r} Z`
}),
  Cr.set('actionButtonBackPrevious', (t, e) => {
    const n = t / 2,
      i = e / 2,
      r = 0.3 * Math.min(t, e)
    return `M${n + 0.5 * r},${i - r} L${n - r},${i} L${n + 0.5 * r},${i + r} Z`
  }),
  Cr.set('actionButtonReturn', (t, e) => {
    const n = t / 2,
      i = e / 2,
      r = 0.28 * Math.min(t, e),
      o = 0.22 * r,
      l = i + 0.4 * r,
      s = i - 0.4 * r,
      a = n - 0.6 * r,
      d = n + 0.6 * r,
      c = (l - s) / 2
    return [
      `M${a},${l}`,
      `L${d},${l}`,
      `A${c},${c} 0 0,1 ${d},${s}`,
      `L${a + 0.15 * r},${s}`,
      `L${a + 0.15 * r},${s + o}`,
      `L${d - 0.3 * o},${s + o}`,
      `A${c - o},${c - o} 0 0,0 ${d - 0.3 * o},${l - o}`,
      `L${a},${l - o}`,
      'Z',
      `M${a - 0.3 * r},${s + o / 2}`,
      `L${a + 0.15 * r},${s - 0.2 * r}`,
      `L${a + 0.15 * r},${s + o + 0.2 * r}`,
      'Z',
    ].join(' ')
  }),
  Cr.set('actionButtonBeginning', (t, e) => {
    const n = t / 2,
      i = e / 2,
      r = 0.28 * Math.min(t, e)
    return [
      `M${n - r},${i - r} L${n - r + 0.2 * r},${i - r} L${n - r + 0.2 * r},${i + r} L${n - r},${i + r} Z`,
      `M${n + r},${i - r} L${n - r + 0.35 * r},${i} L${n + r},${i + r} Z`,
    ].join(' ')
  }),
  Cr.set('actionButtonEnd', (t, e) => {
    const n = t / 2,
      i = e / 2,
      r = 0.28 * Math.min(t, e)
    return [
      `M${n + r - 0.2 * r},${i - r} L${n + r},${i - r} L${n + r},${i + r} L${n + r - 0.2 * r},${i + r} Z`,
      `M${n - r},${i - r} L${n + r - 0.35 * r},${i} L${n - r},${i + r} Z`,
    ].join(' ')
  }),
  Cr.set('actionButtonInformation', (t, e) => {
    const n = t / 2,
      i = e / 2,
      r = 0.28 * Math.min(t, e)
    return [
      `M${n - 0.1 * r},${i - 0.65 * r} L${n + 0.1 * r},${i - 0.65 * r} L${n + 0.1 * r},${i - 0.4 * r} L${n - 0.1 * r},${i - 0.4 * r} Z`,
      `M${n - 0.12 * r},${i - 0.2 * r} L${n + 0.12 * r},${i - 0.2 * r} L${n + 0.12 * r},${i + 0.65 * r} L${n - 0.12 * r},${i + 0.65 * r} Z`,
    ].join(' ')
  }),
  Cr.set('actionButtonDocument', (t, e) => {
    const n = t / 2,
      i = e / 2,
      r = 0.28 * Math.min(t, e),
      o = 0.7 * r,
      l = 0.3 * r
    return [
      `M${n - o},${i - r}`,
      `L${n + o - l},${i - r} L${n + o},${i - r + l}`,
      `L${n + o},${i + r} L${n - o},${i + r} Z`,
      `M${n + o - l},${i - r} L${n + o - l},${i - r + l} L${n + o},${i - r + l}`,
    ].join(' ')
  }),
  Mr.set('wave', (t, e, n) => {
    const i = (e * Math.min(Math.max(xr(n, 'adj1', 12500), 0), 2e4)) / 1e5,
      r = (10 * i) / 3,
      o = e - i,
      l = (t * Math.min(Math.max(xr(n, 'adj2', 0), -1e4), 1e4)) / 5e4,
      s = l < 0 ? 0 : l,
      a = l < 0 ? l : 0,
      d = -s,
      c = t - a,
      u = d + (c - d) / 3,
      h = t + s,
      p = a + (h - a) / 3
    return [
      `M${d},${i}`,
      `C${u},${i - r} ${(u + c) / 2},${i + r} ${c},${i}`,
      `L${h},${o}`,
      `C${(p + h) / 2},${o + r} ${p},${o - r} ${a},${o}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('doubleWave', (t, e, n) => {
    const i = (e * Math.min(Math.max(xr(n, 'adj1', 6250), 0), 12500)) / 1e5,
      r = (10 * i) / 3,
      o = i - r,
      l = i + r,
      s = e - i,
      a = s - r,
      d = s + r,
      c = (t * Math.min(Math.max(xr(n, 'adj2', 0), -1e4), 1e4)) / 5e4,
      u = c < 0 ? 0 : c,
      h = c < 0 ? c : 0,
      p = -u,
      f = t - h,
      m = (f - p) / 6,
      $ = (p + f) / 2,
      g = $ + m,
      y = t + u,
      x = (y - h) / 6,
      v = (h + y) / 2,
      b = v + x
    return [
      `M${p},${i}`,
      `C${p + m},${o} ${p + (f - p) / 3},${l} ${$},${i}`,
      `C${g},${o} ${(g + f) / 2},${l} ${f},${i}`,
      `L${y},${s}`,
      `C${(b + y) / 2},${d} ${b},${a} ${v},${s}`,
      `C${h + (y - h) / 3},${d} ${h + x},${a} ${h},${s}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('irregularSeal1', (t, e) => {
    const n = (e) => (t * e) / 21600,
      i = (t) => (e * t) / 21600
    return [
      `M${n(10800)},${i(5800)}`,
      `L${n(14522)},0`,
      `L${n(14155)},${i(5325)}`,
      `L${n(18380)},${i(4457)}`,
      `L${n(16702)},${i(7315)}`,
      `L${n(21097)},${i(8137)}`,
      `L${n(17607)},${i(10475)}`,
      `L${n(21600)},${i(13290)}`,
      `L${n(16837)},${i(12942)}`,
      `L${n(18145)},${i(18095)}`,
      `L${n(14020)},${i(14457)}`,
      `L${n(13247)},${i(19737)}`,
      `L${n(10532)},${i(14935)}`,
      `L${n(8485)},${i(21600)}`,
      `L${n(7715)},${i(15627)}`,
      `L${n(4762)},${i(17617)}`,
      `L${n(5667)},${i(13937)}`,
      `L${n(135)},${i(14587)}`,
      `L${n(3722)},${i(11775)}`,
      `L0,${i(8615)}`,
      `L${n(4627)},${i(7617)}`,
      `L${n(370)},${i(2295)}`,
      `L${n(7312)},${i(6320)}`,
      `L${n(8352)},${i(2295)}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('irregularSeal2', (t, e) =>
    [
      `M${(11462 * t) / 21600},${(4342 * e) / 21600}`,
      `L${(14790 * t) / 21600},0`,
      `L${(14525 * t) / 21600},${(5777 * e) / 21600}`,
      `L${(18007 * t) / 21600},${(3172 * e) / 21600}`,
      `L${(16380 * t) / 21600},${(6532 * e) / 21600}`,
      `L${t},${(6645 * e) / 21600}`,
      `L${(16985 * t) / 21600},${(9402 * e) / 21600}`,
      `L${(18270 * t) / 21600},${(11290 * e) / 21600}`,
      `L${(16380 * t) / 21600},${(12310 * e) / 21600}`,
      `L${(18877 * t) / 21600},${(15632 * e) / 21600}`,
      `L${(14640 * t) / 21600},${(14350 * e) / 21600}`,
      `L${(14942 * t) / 21600},${(17370 * e) / 21600}`,
      `L${(12180 * t) / 21600},${(15935 * e) / 21600}`,
      `L${(11612 * t) / 21600},${(18842 * e) / 21600}`,
      `L${(9872 * t) / 21600},${(17370 * e) / 21600}`,
      `L${(8700 * t) / 21600},${(19712 * e) / 21600}`,
      `L${(7527 * t) / 21600},${(18125 * e) / 21600}`,
      `L${(4917 * t) / 21600},${e}`,
      `L${(4805 * t) / 21600},${(18240 * e) / 21600}`,
      `L${(1285 * t) / 21600},${(17825 * e) / 21600}`,
      `L${(3330 * t) / 21600},${(15370 * e) / 21600}`,
      'L0,' + (12877 * e) / 21600,
      `L${(3935 * t) / 21600},${(11592 * e) / 21600}`,
      `L${(1172 * t) / 21600},${(8270 * e) / 21600}`,
      `L${(5372 * t) / 21600},${(7817 * e) / 21600}`,
      `L${(4502 * t) / 21600},${(3625 * e) / 21600}`,
      `L${(8550 * t) / 21600},${(6382 * e) / 21600}`,
      `L${(9722 * t) / 21600},${(1887 * e) / 21600}`,
      'Z',
    ].join(' '),
  ),
  Mr.set('teardrop', (t, e) => {
    const n = t / 2,
      i = e / 2
    return [
      `M${t},${i}`,
      `A${n},${i} 0 1,1 ${n},0`,
      `L${t},0`,
      `L${t},${i}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('pie', (t, e, n) => {
    const i = (((null == n ? void 0 : n.get('adj1')) ?? 0) / 6e4) % 360,
      r = (((null == n ? void 0 : n.get('adj2')) ?? 162e5) / 6e4) % 360
    let o = (((r - i) % 360) + 360) % 360
    0 === o && i !== r && (o = 360)
    const l = t / 2,
      s = e / 2,
      a = (t) => (t * Math.PI) / 180,
      d = (t) => Math.atan2(Math.sin(a(t)) / s, Math.cos(a(t)) / l),
      c = d(i),
      u = d(r),
      h = l + l * Math.cos(c),
      p = s + s * Math.sin(c),
      f = l + l * Math.cos(u),
      m = s + s * Math.sin(u)
    return [
      `M${l},${s}`,
      `L${h},${p}`,
      `A${l},${s} 0 ${o > 180 ? 1 : 0},1 ${f},${m}`,
      'Z',
    ].join(' ')
  }),
  Mr.set('pieWedge', (t, e) =>
    [`M0,${e}`, `A${t},${e} 0 0,1 ${t},0`, `L${t},${e}`, 'Z'].join(' '),
  ),
  Mr.set('arc', (t, e, n) => {
    const i = ((null == n ? void 0 : n.get('adj1')) ?? 162e5) / 6e4,
      r = ((null == n ? void 0 : n.get('adj2')) ?? 0) / 6e4,
      o = t / 2,
      l = e / 2,
      s = (t) => (t * Math.PI) / 180,
      a = (t) => Math.atan2(Math.sin(s(t)) / l, Math.cos(s(t)) / o),
      d = a(i),
      c = a(r),
      u = o + o * Math.cos(d),
      h = l + l * Math.sin(d),
      p = o + o * Math.cos(c),
      f = l + l * Math.sin(c)
    let m = (((r - i) % 360) + 360) % 360
    return (
      0 === m && i !== r && (m = 360),
      `M${u},${h} A${o},${l} 0 ${m > 180 ? 1 : 0},1 ${p},${f}`
    )
  }),
  Mr.set('chord', (t, e, n) => {
    const i = ((null == n ? void 0 : n.get('adj1')) ?? 27e5) / 6e4,
      r = ((null == n ? void 0 : n.get('adj2')) ?? 162e5) / 6e4,
      o = t / 2,
      l = e / 2,
      s = t / 2,
      a = e / 2,
      d = (t) => (t * Math.PI) / 180,
      c = (t) => Math.atan2(Math.sin(d(t)) / a, Math.cos(d(t)) / s),
      u = c(i),
      h = c(r),
      p = o + s * Math.cos(u),
      f = l + a * Math.sin(u),
      m = o + s * Math.cos(h),
      $ = l + a * Math.sin(h)
    let g = (((r - i) % 360) + 360) % 360
    return (
      0 === g && i !== r && (g = 360),
      0 === g
        ? `M${o - s},${l} A${s},${a} 0 1,1 ${o + s},${l} A${s},${a} 0 1,1 ${o - s},${l} Z`
        : `M${p},${f} A${s},${a} 0 ${g > 180 ? 1 : 0},1 ${m},${$} Z`
    )
  }),
  Mr.set('funnel', (t, e) => {
    const n = t / 2,
      i = e / 4,
      r = t / 2,
      o = e,
      l = Math.min(t, e) / 20,
      s = n - l,
      a = i - l,
      d = (8 * Math.PI) / 180,
      c = n * Math.cos(d),
      u = i * Math.sin(d),
      h = Math.atan2(u, c),
      p = Math.PI - h,
      f = Math.PI + 2 * h,
      m = Math.PI - 2 * h,
      $ = n / 4,
      g = i / 4,
      y = i * Math.cos(p),
      x = n * Math.sin(p),
      v = (n * i) / Math.sqrt(y * y + x * x),
      b = r + v * Math.cos(p),
      M = i + v * Math.sin(p),
      w = p + f,
      k = i * Math.cos(w),
      A = n * Math.sin(w),
      L = (n * i) / Math.sqrt(k * k + A * A),
      S = r + L * Math.cos(w),
      C = i + L * Math.sin(w),
      F = o - g,
      B = g * Math.cos(h),
      j = $ * Math.sin(h),
      E = ($ * g) / Math.sqrt(B * B + j * j),
      P = r + E * Math.cos(h),
      T = F + E * Math.sin(h),
      z = h + m,
      N = g * Math.cos(z),
      R = $ * Math.sin(z),
      I = ($ * g) / Math.sqrt(N * N + R * R),
      D = r + I * Math.cos(z),
      O = F + I * Math.sin(z),
      U = (180 * f) / Math.PI,
      Z = Math.abs(U) > 180 ? 1 : 0,
      G = f > 0 ? 1 : 0,
      X = (180 * m) / Math.PI,
      Y = n - s
    return `${[`M${b},${M}`, `A${n},${i} 0 ${Z},${G} ${S},${C}`, `L${P},${T}`, `A${$},${g} 0 ${Math.abs(X) > 180 ? 1 : 0},${m > 0 ? 1 : 0} ${D},${O}`, 'Z'].join(' ')} ${[`M${Y},${i}`, `A${s},${a} 0 1,0 ${n + s},${i}`, `A${s},${a} 0 1,0 ${Y},${i}`, 'Z'].join(' ')}`
  }),
  new Map().set('can', (t, e) => {
    const n = 0.1 * e,
      i = t / 2
    return [
      {
        path: [
          `M0,${n}`,
          `A${i},${n} 0 0,1 ${t},${n}`,
          `A${i},${n} 0 0,1 0,${n}`,
          'Z',
        ].join(' '),
        fillModifier: 'lighten',
      },
    ]
  }))
var Fr = new Map()
function Br(t, e) {
  const n = Math.min(t, e),
    i = t / 2,
    r = e / 2,
    o = (3 * n) / 8
  return {
    ss: n,
    hc: i,
    vc: r,
    dx2: o,
    g9: r - o,
    g10: r + o,
    g11: i - o,
    g12: i + o,
    g13: (3 * n) / 4,
  }
}
var jr = (t, e) => `M0,0 L${t},0 L${t},${e} L0,${e} Z`
function Er(t, e, n, i, r, o) {
  const l = (r * Math.PI) / 180,
    s = t - n * Math.cos(l),
    a = e - i * Math.sin(l),
    d = ((r + o) * Math.PI) / 180,
    c = s + n * Math.cos(d),
    u = a + i * Math.sin(d)
  return {
    svg: `A${n},${i} 0 ${Math.abs(o) > 180 ? 1 : 0},${o >= 0 ? 1 : 0} ${c},${u}`,
    x: c,
    y: u,
  }
}
function Pr(t, e, n, i) {
  var r
  if ('textNoShape' === t || 'textnoshape' === t.toLowerCase()) return ''
  if (e > 0 && n > 0) {
    const o = gr(t, e, n, i)
    if (1 === (null == o ? void 0 : o.length))
      return (null == (r = o[0]) ? void 0 : r.d) ?? ''
  }
  const o = t.toLowerCase(),
    l = Mr.get(o) ?? Mr.get(t)
  return l ? l(e, n, i) : `M0,0 L${e},0 L${e},${n} L0,${n} Z`
}
;(Fr.set('actionButtonForwardNext', (t, e) => {
  const { g9: n, g10: i, g11: r, g12: o, vc: l } = Br(t, e),
    s = `M${o},${l} L${r},${n} L${r},${i} Z`
  return [
    { d: `${jr(t, e)} ${s}`, fill: 'norm', stroke: !1 },
    { d: s, fill: 'darken', stroke: !1 },
    { d: s, fill: 'none', stroke: !0 },
    { d: jr(t, e), fill: 'none', stroke: !0 },
  ]
}),
  Fr.set('actionButtonForward', (t, e) => {
    const n = Fr.get('actionButtonForwardNext')
    return n ? n(t, e) : []
  }),
  Fr.set('actionButtonBackPrevious', (t, e) => {
    const { g9: n, g10: i, g11: r, g12: o, vc: l } = Br(t, e),
      s = `M${r},${l} L${o},${n} L${o},${i} Z`
    return [
      { d: `${jr(t, e)} ${s}`, fill: 'norm', stroke: !1 },
      { d: s, fill: 'darken', stroke: !1 },
      { d: s, fill: 'none', stroke: !0 },
      { d: jr(t, e), fill: 'none', stroke: !0 },
    ]
  }),
  Fr.set('actionButtonBeginning', (t, e) => {
    const { g9: n, g10: i, g11: r, g12: o, g13: l, vc: s } = Br(t, e),
      a = r + l / 8,
      d = `M${r + l / 4},${s} L${o},${n} L${o},${i} Z M${a},${n} L${r},${n} L${r},${i} L${a},${i} Z`
    return [
      { d: `${jr(t, e)} ${d}`, fill: 'norm', stroke: !1 },
      { d: d, fill: 'darken', stroke: !1 },
      { d: d, fill: 'none', stroke: !0 },
      { d: jr(t, e), fill: 'none', stroke: !0 },
    ]
  }),
  Fr.set('actionButtonEnd', (t, e) => {
    const { g9: n, g10: i, g11: r, g12: o, g13: l, vc: s } = Br(t, e),
      a = r + (7 * l) / 8,
      d = `M${r + (3 * l) / 4},${s} L${r},${n} L${r},${i} Z M${a},${n} L${o},${n} L${o},${i} L${a},${i} Z`
    return [
      { d: `${jr(t, e)} ${d}`, fill: 'norm', stroke: !1 },
      { d: d, fill: 'darken', stroke: !1 },
      { d: d, fill: 'none', stroke: !0 },
      { d: jr(t, e), fill: 'none', stroke: !0 },
    ]
  }),
  Fr.set('actionButtonReturn', (t, e) => {
    const { g9: n, g10: i, g11: r, g12: o, g13: l, hc: s } = Br(t, e),
      a = (3 * l) / 4,
      d = (5 * l) / 8,
      c = (3 * l) / 8,
      u = l / 4,
      h = l / 8,
      p = n + a,
      f = n + d,
      m = n + u,
      $ = r + (7 * l) / 8,
      g = r + a,
      y = r + d,
      x = r + c,
      v = r + u,
      b = [
        `M${o},${m}`,
        `L${g},${n}`,
        `L${s},${m}`,
        `L${y},${m}`,
        `L${y},${f}`,
        `A${h},${h} 0 0,1 ${y - h},${p}`,
        `L${x},${p}`,
        `A${h},${h} 0 0,1 ${v},${f}`,
        `L${v},${m}`,
        `L${r},${m}`,
        `L${r},${f}`,
        `A${c},${c} 0 0,0 ${x},${i}`,
        `L${s},${i}`,
        `A${c},${c} 0 0,0 ${s + c},${i - c}`,
        `L${$},${m}`,
        'Z',
      ].join(' '),
      M = [
        `M${o},${m}`,
        `L${$},${m}`,
        `L${$},${f}`,
        `A${c},${c} 0 0,1 ${r + l / 2},${i}`,
        `L${x},${i}`,
        `A${c},${c} 0 0,1 ${r},${f}`,
        `L${r},${m}`,
        `L${v},${m}`,
        `L${v},${f}`,
        `A${h},${h} 0 0,0 ${x},${p}`,
        `L${s},${p}`,
        `A${h},${h} 0 0,0 ${y},${f}`,
        `L${y},${m}`,
        `L${s},${m}`,
        `L${g},${n}`,
        'Z',
      ].join(' ')
    return [
      { d: `${jr(t, e)} ${b}`, fill: 'norm', stroke: !1 },
      { d: b, fill: 'darken', stroke: !1 },
      { d: M, fill: 'none', stroke: !0 },
      { d: jr(t, e), fill: 'none', stroke: !0 },
    ]
  }),
  Fr.set('actionButtonSound', (t, e) => {
    const { g9: n, g10: i, g11: r, g12: o, g13: l, vc: s } = Br(t, e),
      a = (5 * l) / 16,
      d = n + a,
      c = n + (11 * l) / 16,
      u = r + a,
      h = r + (5 * l) / 8,
      p = r + (3 * l) / 4,
      f = `M${r},${d} L${r},${c} L${u},${c} L${h},${i} L${h},${n} L${u},${d} Z`,
      m = `M${r},${d} L${u},${d} L${h},${n} L${h},${i} L${u},${c} L${r},${c} Z M${p},${d} L${o},${n + l / 8} M${p},${s} L${o},${s} M${p},${c} L${o},${n + (7 * l) / 8}`
    return [
      { d: `${jr(t, e)} ${f}`, fill: 'norm', stroke: !1 },
      { d: f, fill: 'darken', stroke: !1 },
      { d: m, fill: 'none', stroke: !0 },
      { d: jr(t, e), fill: 'none', stroke: !0 },
    ]
  }),
  Fr.set('actionButtonInformation', (t, e) => {
    const { g9: n, g10: i, g11: r, g13: o, hc: l, dx2: s } = Br(t, e),
      a = (5 * o) / 16,
      d = (3 * o) / 32,
      c = n + o / 32,
      u = n + a,
      h = n + (3 * o) / 8,
      p = n + (13 * o) / 16,
      f = n + (7 * o) / 8,
      m = r + a,
      $ = r + (13 * o) / 32,
      g = r + (19 * o) / 32,
      y = r + (11 * o) / 16,
      x = `M${l},${n} A${s},${s} 0 1,1 ${l},${i} A${s},${s} 0 1,1 ${l},${n} Z`,
      v = `M${l},${c} A${d},${d} 0 1,1 ${l},${c + 2 * d} A${d},${d} 0 1,1 ${l},${c} Z M${m},${u} L${y},${u} L${y},${h} L${g},${h} L${g},${p} L${y},${p} L${y},${f} L${m},${f} L${m},${p} L${$},${p} L${$},${h} L${m},${h} Z`
    return [
      { d: `${jr(t, e)} ${x}`, fill: 'norm', stroke: !1 },
      { d: `${x} ${v}`, fill: 'darken', stroke: !1 },
      { d: v, fill: 'lighten', stroke: !1 },
      { d: `${x} ${v}`, fill: 'none', stroke: !0 },
      { d: jr(t, e), fill: 'none', stroke: !0 },
    ]
  }),
  Fr.set('actionButtonHome', (t, e) => {
    const { g9: n, g10: i, g11: r, g12: o, g13: l, hc: s, vc: a } = Br(t, e),
      d = n + l / 16,
      c = n + (3 * l) / 16,
      u = n + (5 * l) / 16,
      h = n + (3 * l) / 4,
      p = r + l / 8,
      f = r + (7 * l) / 16,
      m = r + (9 * l) / 16,
      $ = r + (11 * l) / 16,
      g = r + (13 * l) / 16,
      y = r + (7 * l) / 8,
      x = `M${s},${n} L${r},${a} L${p},${a} L${p},${i} L${y},${i} L${y},${a} L${o},${a} L${g},${u} L${g},${d} L${$},${d} L${$},${c} Z`,
      v = `M${g},${u} L${g},${d} L${$},${d} L${$},${c} Z`,
      b = `M${p},${a} L${p},${i} L${f},${i} L${f},${h} L${m},${h} L${m},${i} L${y},${i} L${y},${a} Z`,
      M = `M${s},${n} L${r},${a} L${o},${a} Z`,
      w = `M${f},${h} L${m},${h} L${m},${i} L${f},${i} Z`,
      k = `M${s},${n} L${$},${c} L${$},${d} L${g},${d} L${g},${u} L${o},${a} L${y},${a} L${y},${i} L${p},${i} L${p},${a} L${r},${a} Z M${$},${c} L${g},${u} M${y},${a} L${p},${a} M${f},${i} L${f},${h} L${m},${h} L${m},${i}`
    return [
      { d: `${jr(t, e)} ${x}`, fill: 'norm', stroke: !1 },
      { d: `${v} ${b}`, fill: 'darkenLess', stroke: !1 },
      { d: `${M} ${w}`, fill: 'darken', stroke: !1 },
      { d: k, fill: 'none', stroke: !0 },
      { d: jr(t, e), fill: 'none', stroke: !0 },
    ]
  }),
  Fr.set('actionButtonHelp', (t, e) => {
    const { g9: n, g11: i, g13: r, hc: o } = Br(t, e),
      l = r / 7,
      s = (3 * r) / 14,
      a = (2 * r) / 7,
      d = r / 14,
      c = (3 * r) / 28,
      u = n + a,
      h = n + (17 * r) / 28,
      p = n + (21 * r) / 28,
      f = n + (11 * r) / 14,
      m = i + s,
      $ = i + (3 * r) / 7,
      g = i + (4 * r) / 7,
      y = (t, e, n, i, r, o) => {
        const l = (r * Math.PI) / 180,
          s = ((r + o) * Math.PI) / 180,
          a = t - n * Math.cos(l),
          d = e - i * Math.sin(l),
          c = a + n * Math.cos(s),
          u = d + i * Math.sin(s)
        return {
          endX: c,
          endY: u,
          svg: `A${n},${i} 0 ${Math.abs(o) > 180 ? 1 : 0},${o > 0 ? 1 : 0} ${c},${u}`,
        }
      }
    let x = m,
      v = u
    const b = y(x, v, a, a, 180, 180)
    ;((x = b.endX), (v = b.endY))
    const M = y(x, v, l, s, 0, 90)
    ;((x = M.endX), (v = M.endY))
    const w = y(x, v, d, c, 270, -90),
      k = y($, h, l, s, 180, 90),
      A = y(k.endX, k.endY, d, c, 90, -90),
      L = y(A.endX, A.endY, l, l, 0, -180),
      S = `M${o},${f} A${c},${c} 0 1,1 ${o},${f + 2 * c} A${c},${c} 0 1,1 ${o},${f} Z`,
      C = `M${m},${u} ${b.svg} ${M.svg} ${w.svg} L${g},${p} L${$},${p} L${$},${h} ${k.svg} ${A.svg} ${L.svg} Z ${S}`
    return [
      { d: `${jr(t, e)} ${C}`, fill: 'norm', stroke: !1 },
      { d: C, fill: 'darken', stroke: !1 },
      { d: C, fill: 'none', stroke: !0 },
      { d: jr(t, e), fill: 'none', stroke: !0 },
    ]
  }),
  Fr.set('actionButtonDocument', (t, e) => {
    const n = Math.min(t, e),
      i = t / 2,
      r = e / 2,
      o = (3 * n) / 8,
      l = (9 * n) / 32,
      s = r - o,
      a = r + o,
      d = i - l,
      c = i + l,
      u = (3 * n) / 16,
      h = c - u,
      p = s + u,
      f = `M${d},${s} L${h},${s} L${c},${p} L${c},${a} L${d},${a} Z`,
      m = `M${h},${s} L${h},${p} L${c},${p} Z`,
      $ = `${f} M${c},${p} L${h},${p} L${h},${s}`
    return [
      { d: `${jr(t, e)} ${f}`, fill: 'norm', stroke: !1 },
      { d: f, fill: 'darkenLess', stroke: !1 },
      { d: m, fill: 'darken', stroke: !1 },
      { d: $, fill: 'none', stroke: !0 },
      { d: jr(t, e), fill: 'none', stroke: !0 },
    ]
  }),
  Fr.set('actionButtonMovie', (t, e) => {
    const { g9: n, g11: i, g12: r, g13: o } = Br(t, e),
      l = i + (1455 * o) / 21600,
      s = i + (1905 * o) / 21600,
      a = i + (2325 * o) / 21600,
      d = i + (17010 * o) / 21600,
      c = i + (20595 * o) / 21600,
      u = n + (5280 * o) / 21600,
      h = n + (5730 * o) / 21600,
      p = n + (6630 * o) / 21600,
      f = n + (7492 * o) / 21600,
      m = n + (9067 * o) / 21600,
      $ = n + (9555 * o) / 21600,
      g = n + (13342 * o) / 21600,
      y = n + (14580 * o) / 21600,
      x = n + (15592 * o) / 21600,
      v = [
        `M${i},${u}`,
        `L${i},${$}`,
        `L${l},${$}`,
        `L${s},${m}`,
        `L${a},${m}`,
        `L${a},${x}`,
        `L${d},${x}`,
        `L${d},${g}`,
        `L${i + (19335 * o) / 21600},${g}`,
        `L${c},${y}`,
        `L${r},${y}`,
        `L${r},${p}`,
        `L${c},${p}`,
        `L${i + (19725 * o) / 21600},${f}`,
        `L${d},${f}`,
        `L${d},${p}`,
        `L${i + (16155 * o) / 21600},${h}`,
        `L${s},${h}`,
        `L${l},${u}`,
        'Z',
      ].join(' ')
    return [
      { d: `${jr(t, e)} ${v}`, fill: 'norm', stroke: !1 },
      { d: v, fill: 'darken', stroke: !1 },
      { d: v, fill: 'none', stroke: !0 },
      { d: jr(t, e), fill: 'none', stroke: !0 },
    ]
  }),
  Fr.set('flowChartOfflineStorage', (t, e) => {
    const n = `M0,0 L${t},0 L${t / 2},${e} Z`,
      i = (4 * e) / 5
    return [
      { d: n, fill: 'norm', stroke: !1 },
      {
        d: `M${(2 * t) / 5},${i} L${(3 * t) / 5},${i}`,
        fill: 'none',
        stroke: !0,
      },
      { d: n, fill: 'none', stroke: !0 },
    ]
  }),
  Fr.set('cube', (t, e, n) => {
    const i = Math.min(Math.max(yr(n, 'adj', 25e3), 0), 0.45),
      r = Math.min(t, e) * i
    return [
      {
        d: [`M0,${r}`, `L${t - r},${r}`, `L${t - r},${e}`, `L0,${e}`, 'Z'].join(
          ' ',
        ),
        fill: 'norm',
        stroke: !0,
      },
      {
        d: [`M0,${r}`, `L${r},0`, `L${t},0`, `L${t - r},${r}`, 'Z'].join(' '),
        fill: 'lightenLess',
        stroke: !0,
      },
      {
        d: [
          `M${t - r},${r}`,
          `L${t},0`,
          `L${t},${e - r}`,
          `L${t - r},${e}`,
          'Z',
        ].join(' '),
        fill: 'darkenLess',
        stroke: !0,
      },
    ]
  }),
  Fr.set('bevel', (t, e, n) => {
    const i = Math.min(Math.max(yr(n, 'adj', 12500), 0), 0.45),
      r = Math.min(t, e) * i
    return [
      {
        d: `M${r},${r} L${t - r},${r} L${t - r},${e - r} L${r},${e - r} Z`,
        fill: 'norm',
        stroke: !0,
      },
      {
        d: `M0,0 L${t},0 L${t - r},${r} L${r},${r} Z`,
        fill: 'lightenLess',
        stroke: !0,
      },
      {
        d: `M${t},0 L${t},${e} L${t - r},${e - r} L${t - r},${r} Z`,
        fill: 'darken',
        stroke: !0,
      },
      {
        d: `M0,${e} L${r},${e - r} L${t - r},${e - r} L${t},${e} Z`,
        fill: 'darken',
        stroke: !0,
      },
      {
        d: `M0,0 L${r},${r} L${r},${e - r} L0,${e} Z`,
        fill: 'lighten',
        stroke: !0,
      },
    ]
  }),
  Fr.set('leftRightRibbon', (t, e, n) => {
    const i = Math.min(t, e),
      r = t / 2,
      o = t / 32,
      l = t / 2,
      s = e / 2,
      a = Math.min(
        Math.max(((null == n ? void 0 : n.get('adj3')) ?? 16667) / 1e5, 0),
        0.33333,
      ),
      d = 1 - a,
      c = Math.min(
        Math.max(((null == n ? void 0 : n.get('adj1')) ?? 5e4) / 1e5, 0),
        d,
      ),
      u = (r - o) / i,
      h =
        i *
        Math.min(
          Math.max(((null == n ? void 0 : n.get('adj2')) ?? 5e4) / 1e5, 0),
          u,
        ),
      p = t - h,
      f = (e * c) / 2,
      m = (-e * a) / 2,
      $ = s + m - f,
      g = s + f - m,
      y = $ + f,
      x = e - y,
      v = 2 * y,
      b = e - v,
      M = v - $,
      w = e - M,
      k = (a * i) / 4,
      A = l - o,
      L = l + o,
      S = $ + k,
      C = w - k,
      F = (t, e, n, i, r, o) => {
        const l = (r * Math.PI) / 180,
          s = ((r + o) * Math.PI) / 180,
          a = t - n * Math.cos(l),
          d = e - i * Math.sin(l),
          c = a + n * Math.cos(s),
          u = d + i * Math.sin(s)
        return {
          endX: c,
          endY: u,
          svg: `A${n},${i} 0 ${Math.abs(o) > 180 ? 1 : 0},${o > 0 ? 1 : 0} ${c},${u}`,
        }
      },
      B = F(l, $, o, k, 270, 180),
      j = F(B.endX, B.endY, o, k, 270, -180),
      E = F(l, g, o, k, 90, 90),
      P = [
        `M0,${y}`,
        `L${h},0`,
        `L${h},${$}`,
        `L${l},${$}`,
        B.svg,
        j.svg,
        `L${p},${w}`,
        `L${p},${b}`,
        `L${t},${x}`,
        `L${p},${e}`,
        `L${p},${g}`,
        `L${l},${g}`,
        E.svg,
        `L${A},${M}`,
        `L${h},${M}`,
        `L${h},${v}`,
        'Z',
      ].join(' '),
      T = F(L, S, o, k, 0, 90),
      z = F(T.endX, T.endY, o, k, 270, -180),
      N = [`M${L},${S}`, T.svg, z.svg, `L${L},${w}`, 'Z'].join(' '),
      R = [P, `M${L},${S} L${L},${w}`, `M${A},${C} L${A},${M}`].join(' ')
    return [
      { d: P, fill: 'norm', stroke: !1 },
      { d: N, fill: 'darkenLess', stroke: !1 },
      { d: R, fill: 'none', stroke: !0 },
    ]
  }),
  Fr.set('ellipseRibbon', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj1')) ?? 25e3,
      r = (null == n ? void 0 : n.get('adj2')) ?? 5e4,
      o = (null == n ? void 0 : n.get('adj3')) ?? 12500,
      l = Math.max(0, Math.min(i, 1e5)),
      s = Math.max(25e3, Math.min(r, 75e3)),
      a = l - (1e5 - l) / 2,
      d = Math.max(Math.max(0, a), Math.min(o, l)),
      c = t / 2 - (t * s) / 2e5,
      u = c + t / 8,
      h = t - u,
      p = t - c,
      f = t - t / 8,
      m = (e * d) / 1e5,
      $ = t > 0 ? (4 * m) / t : 0,
      g = (e) => $ * (e - (e * e) / t),
      y = g(u),
      x = u / 2,
      v = $ * x,
      b = t - x,
      M = (e * l) / 1e5,
      w = M - m,
      k = g(c),
      A = k + w,
      L = m + w - A + m + w,
      S = e - M,
      C = ((14 * m) / 16 + S) / 2,
      F = k + S,
      B = A + S,
      j = c / 2,
      E = $ * j + S,
      P = t - j,
      T = L + S,
      z = y + w,
      N = M + M - z,
      R = t / 2,
      I = t / 8
    return [
      {
        d: [
          'M0,0',
          `Q${x},${v} ${u},${y}`,
          `L${c},${A}`,
          `Q${R},${L} ${p},${A}`,
          `L${h},${y}`,
          `Q${b},${v} ${t},0`,
          `L${f},${C}`,
          `L${t},${S}`,
          `Q${P},${E} ${p},${F}`,
          `L${p},${B}`,
          `Q${R},${T} ${c},${B}`,
          `L${c},${F}`,
          `Q${j},${E} 0,${S}`,
          `L${I},${C}`,
          'Z',
        ].join(' '),
        fill: 'norm',
        stroke: !1,
      },
      {
        d: [
          `M${u},${z}`,
          `L${u},${y}`,
          `L${c},${A}`,
          `Q${R},${L} ${p},${A}`,
          `L${h},${y}`,
          `L${h},${z}`,
          `Q${R},${N} ${u},${z}`,
          'Z',
        ].join(' '),
        fill: 'darkenLess',
        stroke: !1,
      },
      {
        d: [
          'M0,0',
          `Q${x},${v} ${u},${y}`,
          `L${c},${A}`,
          `Q${R},${L} ${p},${A}`,
          `L${h},${y}`,
          `Q${b},${v} ${t},0`,
          `L${f},${C}`,
          `L${t},${S}`,
          `Q${P},${E} ${p},${F}`,
          `L${p},${B}`,
          `Q${R},${T} ${c},${B}`,
          `L${c},${F}`,
          `Q${j},${E} 0,${S}`,
          `L${I},${C}`,
          'Z',
          `M${c},${F} L${c},${A}`,
          `M${p},${A} L${p},${F}`,
          `M${u},${y} L${u},${z}`,
          `M${h},${z} L${h},${y}`,
        ].join(' '),
        fill: 'none',
        stroke: !0,
      },
    ]
  }),
  Fr.set('ellipseRibbon2', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj1')) ?? 25e3,
      r = (null == n ? void 0 : n.get('adj2')) ?? 5e4,
      o = (null == n ? void 0 : n.get('adj3')) ?? 12500,
      l = Math.max(0, Math.min(i, 1e5)),
      s = l - (1e5 - l) / 2,
      a = e,
      d = t / 2 - (t * Math.max(25e3, Math.min(r, 75e3))) / 2e5,
      c = d + t / 8,
      u = t - c,
      h = t - d,
      p = t - t / 8,
      f = (e * Math.max(Math.max(0, s), Math.min(o, l))) / 1e5,
      m = t > 0 ? (4 * f) / t : 0,
      $ = m * (c - (c * c) / t),
      g = a - $,
      y = c / 2,
      x = a - m * y,
      v = t - y,
      b = (e * l) / 1e5,
      M = b - f,
      w = m * (d - (d * d) / t),
      k = w + M,
      A = a - k,
      L = f + M - k + f + M,
      S = a - L,
      C = a - b,
      F = a - ((14 * f) / 16 + C) / 2,
      B = a - (w + C),
      j = a - (k + C),
      E = d / 2,
      P = a - (m * E + C),
      T = t - E,
      z = a - (L + C),
      N = $ + M,
      R = a - N,
      I = a - (b + b - N),
      D = t / 2,
      O = t / 8
    return [
      {
        d: [
          `M0,${a}`,
          `Q${y},${x} ${c},${g}`,
          `L${d},${A}`,
          `Q${D},${S} ${h},${A}`,
          `L${u},${g}`,
          `Q${v},${x} ${t},${a}`,
          `L${p},${F}`,
          `L${t},${b}`,
          `Q${T},${P} ${h},${B}`,
          `L${h},${j}`,
          `Q${D},${z} ${d},${j}`,
          `L${d},${B}`,
          `Q${E},${P} 0,${b}`,
          `L${O},${F}`,
          'Z',
        ].join(' '),
        fill: 'norm',
        stroke: !1,
      },
      {
        d: [
          `M${c},${R}`,
          `L${c},${g}`,
          `L${d},${A}`,
          `Q${D},${S} ${h},${A}`,
          `L${u},${g}`,
          `L${u},${R}`,
          `Q${D},${I} ${c},${R}`,
          'Z',
        ].join(' '),
        fill: 'darkenLess',
        stroke: !1,
      },
      {
        d: [
          `M0,${a}`,
          `L${O},${F}`,
          `L0,${b}`,
          `Q${E},${P} ${d},${B}`,
          `L${d},${j}`,
          `Q${D},${z} ${h},${j}`,
          `L${h},${B}`,
          `Q${T},${P} ${t},${b}`,
          `L${p},${F}`,
          `L${t},${a}`,
          `Q${v},${x} ${u},${g}`,
          `L${h},${A}`,
          `Q${D},${S} ${d},${A}`,
          `L${c},${g}`,
          `Q${y},${x} 0,${a}`,
          'Z',
          `M${d},${A} L${d},${B}`,
          `M${h},${B} L${h},${A}`,
          `M${c},${R} L${c},${g}`,
          `M${u},${g} L${u},${R}`,
        ].join(' '),
        fill: 'none',
        stroke: !0,
      },
    ]
  }),
  Fr.set('smileyFace', (t, e, n) => {
    const i = t / 2,
      r = e / 2,
      o = t / 2,
      l = e / 2,
      s = (null == n ? void 0 : n.get('adj')) ?? 4653,
      a = Math.max(-4653, Math.min(s, 4653)),
      d = (6215 * t) / 21600,
      c = (13135 * t) / 21600,
      u = (7570 * e) / 21600,
      h = (1125 * t) / 21600,
      p = (1125 * e) / 21600,
      f = (4969 * t) / 21699,
      m = (16640 * t) / 21600,
      $ = (16515 * e) / 21600,
      g = (e * a) / 1e5,
      y = $ - g,
      x = $ + g + (e * a) / 5e4
    return [
      {
        d: `M${t},${l} A${i},${r} 0 1,1 0,${l} A${i},${r} 0 1,1 ${t},${l} Z`,
        fill: 'norm',
        stroke: !1,
      },
      {
        d: `${`M${(d + h).toFixed(2)},${u.toFixed(2)} A${h.toFixed(2)},${p.toFixed(2)} 0 1,1 ${(d - h).toFixed(2)},${u.toFixed(2)} A${h.toFixed(2)},${p.toFixed(2)} 0 1,1 ${(d + h).toFixed(2)},${u.toFixed(2)} Z`} ${`M${(c + h).toFixed(2)},${u.toFixed(2)} A${h.toFixed(2)},${p.toFixed(2)} 0 1,1 ${(c - h).toFixed(2)},${u.toFixed(2)} A${h.toFixed(2)},${p.toFixed(2)} 0 1,1 ${(c + h).toFixed(2)},${u.toFixed(2)} Z`}`,
        fill: 'darkenLess',
        stroke: !1,
      },
      {
        d: `M${f.toFixed(2)},${y.toFixed(2)} Q${o.toFixed(2)},${x.toFixed(2)} ${m.toFixed(2)},${y.toFixed(2)}`,
        fill: 'none',
        stroke: !0,
      },
      {
        d: `M${t},${l} A${i},${r} 0 1,1 0,${l} A${i},${r} 0 1,1 ${t},${l} Z`,
        fill: 'none',
        stroke: !0,
      },
    ]
  }),
  Fr.set('foldedCorner', (t, e, n) => {
    const i = yr(n, 'adj', 16667),
      r = Math.min(t, e) * i * 0.7
    return [
      {
        d: `M0,0 L${t},0 L${t},${e - r} L${t - r},${e} L0,${e} Z`,
        fill: 'norm',
        stroke: !0,
      },
      {
        d: `M${t - r},${e} L${t - r},${e - r} L${t},${e - r} Z`,
        fill: 'darkenLess',
        stroke: !1,
      },
      { d: `M${t - r},${e} L${t - r},${e - r}`, fill: 'none', stroke: !0 },
    ]
  }),
  Fr.set('can', (t, e, n) => {
    const i = Math.min(t, e),
      r = (5e4 * e) / i,
      o =
        (i *
          Math.min(
            Math.max((null == n ? void 0 : n.get('adj')) ?? 25e3, 0),
            r,
          )) /
        2e5,
      l = e - o,
      s = t / 2,
      a = (t, e, n, i, r, o) => {
        const l = (r * Math.PI) / 180,
          s = ((r + o) * Math.PI) / 180,
          a = t - n * Math.cos(l),
          d = e - i * Math.sin(l),
          c = a + n * Math.cos(s),
          u = d + i * Math.sin(s)
        return {
          endX: c,
          endY: u,
          svg: `A${n},${i} 0 ${Math.abs(o) > 180 ? 1 : 0},${o > 0 ? 1 : 0} ${c},${u}`,
        }
      },
      d = a(0, o, s, o, 180, -180),
      c = a(t, l, s, o, 0, 180),
      u = `M0,${o} ${d.svg} L${t},${l} ${c.svg} Z`,
      h = a(0, o, s, o, 180, 180),
      p = a(h.endX, h.endY, s, o, 0, 180),
      f = `M0,${o} ${h.svg} ${p.svg} Z`,
      m = a(t, o, s, o, 0, 180),
      $ = a(m.endX, m.endY, s, o, 180, 180),
      g = a(t, l, s, o, 0, 180)
    return [
      { d: u, fill: 'norm', stroke: !1 },
      { d: f, fill: 'lighten', stroke: !1 },
      {
        d: `M${t},${o} ${m.svg} ${$.svg} L${t},${l} ${g.svg} L0,${o}`,
        fill: 'none',
        stroke: !0,
      },
    ]
  }),
  Fr.set('curvedrightarrow', (t, e, n) => kr('curvedRightArrow', t, e, n)),
  Fr.set('curvedleftarrow', (t, e, n) => kr('curvedLeftArrow', t, e, n)),
  Fr.set('curveduparrow', (t, e, n) => Ar('curvedUpArrow', t, e, n)),
  Fr.set('curveddownarrow', (t, e, n) => Ar('curvedDownArrow', t, e, n)),
  Fr.set('bordercallout1', (t, e, n) => {
    const i = (e * ((null == n ? void 0 : n.get('adj1')) ?? 18750)) / 1e5,
      r = (t * ((null == n ? void 0 : n.get('adj2')) ?? -8333)) / 1e5,
      o = (e * ((null == n ? void 0 : n.get('adj3')) ?? 112500)) / 1e5
    return [
      { d: `M0,0 L${t},0 L${t},${e} L0,${e} Z`, fill: 'norm', stroke: !0 },
      {
        d: `M${r},${i} L${(t * ((null == n ? void 0 : n.get('adj4')) ?? -38333)) / 1e5},${o}`,
        fill: 'none',
        stroke: !0,
      },
    ]
  }),
  Fr.set('accentcallout1', (t, e, n) => {
    const i = (e * ((null == n ? void 0 : n.get('adj1')) ?? 18750)) / 1e5,
      r = (t * ((null == n ? void 0 : n.get('adj2')) ?? -8333)) / 1e5,
      o = (e * ((null == n ? void 0 : n.get('adj3')) ?? 112500)) / 1e5
    return [
      { d: `M0,0 L${t},0 L${t},${e} L0,${e} Z`, fill: 'norm', stroke: !1 },
      { d: `M${r},0 L${r},${e}`, fill: 'none', stroke: !0 },
      {
        d: `M${r},${i} L${(t * ((null == n ? void 0 : n.get('adj4')) ?? -38333)) / 1e5},${o}`,
        fill: 'none',
        stroke: !0,
      },
    ]
  }),
  Fr.set('accentcallout2', (t, e, n) => {
    const i = (e * ((null == n ? void 0 : n.get('adj1')) ?? 18750)) / 1e5,
      r = (t * ((null == n ? void 0 : n.get('adj2')) ?? -8333)) / 1e5,
      o = (e * ((null == n ? void 0 : n.get('adj3')) ?? 18750)) / 1e5,
      l = (t * ((null == n ? void 0 : n.get('adj4')) ?? -16667)) / 1e5,
      s = (e * ((null == n ? void 0 : n.get('adj5')) ?? 112500)) / 1e5
    return [
      { d: `M0,0 L${t},0 L${t},${e} L0,${e} Z`, fill: 'norm', stroke: !1 },
      { d: `M${r},0 L${r},${e}`, fill: 'none', stroke: !0 },
      {
        d: `M${r},${i} L${l},${o} L${(t * ((null == n ? void 0 : n.get('adj6')) ?? -46667)) / 1e5},${s}`,
        fill: 'none',
        stroke: !0,
      },
    ]
  }),
  Fr.set('accentcallout3', (t, e, n) => {
    const i = (e * ((null == n ? void 0 : n.get('adj1')) ?? 18750)) / 1e5,
      r = (t * ((null == n ? void 0 : n.get('adj2')) ?? -8333)) / 1e5,
      o = (e * ((null == n ? void 0 : n.get('adj3')) ?? 18750)) / 1e5,
      l = (t * ((null == n ? void 0 : n.get('adj4')) ?? -16667)) / 1e5,
      s = (e * ((null == n ? void 0 : n.get('adj5')) ?? 1e5)) / 1e5,
      a = (t * ((null == n ? void 0 : n.get('adj6')) ?? -16667)) / 1e5,
      d = (e * ((null == n ? void 0 : n.get('adj7')) ?? 112963)) / 1e5
    return [
      { d: `M0,0 L${t},0 L${t},${e} L0,${e} Z`, fill: 'norm', stroke: !1 },
      { d: `M${r},0 L${r},${e}`, fill: 'none', stroke: !0 },
      {
        d: `M${r},${i} L${l},${o} L${a},${s} L${(t * ((null == n ? void 0 : n.get('adj8')) ?? -8333)) / 1e5},${d}`,
        fill: 'none',
        stroke: !0,
      },
    ]
  }),
  Fr.set('callout1', (t, e, n) => {
    const i = (e * ((null == n ? void 0 : n.get('adj1')) ?? 18750)) / 1e5,
      r = (t * ((null == n ? void 0 : n.get('adj2')) ?? -8333)) / 1e5,
      o = (e * ((null == n ? void 0 : n.get('adj3')) ?? 112500)) / 1e5
    return [
      { d: `M0,0 L${t},0 L${t},${e} L0,${e} Z`, fill: 'norm', stroke: !1 },
      {
        d: `M${r},${i} L${(t * ((null == n ? void 0 : n.get('adj4')) ?? -38333)) / 1e5},${o}`,
        fill: 'none',
        stroke: !0,
      },
    ]
  }),
  Fr.set('callout2', (t, e, n) => {
    const i = (e * ((null == n ? void 0 : n.get('adj1')) ?? 18750)) / 1e5,
      r = (t * ((null == n ? void 0 : n.get('adj2')) ?? -8333)) / 1e5,
      o = (e * ((null == n ? void 0 : n.get('adj3')) ?? 18750)) / 1e5,
      l = (t * ((null == n ? void 0 : n.get('adj4')) ?? -16667)) / 1e5,
      s = (e * ((null == n ? void 0 : n.get('adj5')) ?? 112500)) / 1e5
    return [
      { d: `M0,0 L${t},0 L${t},${e} L0,${e} Z`, fill: 'norm', stroke: !1 },
      {
        d: `M${r},${i} L${l},${o} L${(t * ((null == n ? void 0 : n.get('adj6')) ?? -46667)) / 1e5},${s}`,
        fill: 'none',
        stroke: !0,
      },
    ]
  }),
  Fr.set('callout3', (t, e, n) => {
    const i = (e * ((null == n ? void 0 : n.get('adj1')) ?? 18750)) / 1e5,
      r = (t * ((null == n ? void 0 : n.get('adj2')) ?? -8333)) / 1e5,
      o = (e * ((null == n ? void 0 : n.get('adj3')) ?? 18750)) / 1e5,
      l = (t * ((null == n ? void 0 : n.get('adj4')) ?? -16667)) / 1e5,
      s = (e * ((null == n ? void 0 : n.get('adj5')) ?? 1e5)) / 1e5,
      a = (t * ((null == n ? void 0 : n.get('adj6')) ?? -16667)) / 1e5,
      d = (e * ((null == n ? void 0 : n.get('adj7')) ?? 112963)) / 1e5
    return [
      { d: `M0,0 L${t},0 L${t},${e} L0,${e} Z`, fill: 'norm', stroke: !1 },
      {
        d: `M${r},${i} L${l},${o} L${a},${s} L${(t * ((null == n ? void 0 : n.get('adj8')) ?? -8333)) / 1e5},${d}`,
        fill: 'none',
        stroke: !0,
      },
    ]
  }),
  Fr.set('bordercallout2', (t, e, n) => {
    const i = (e * ((null == n ? void 0 : n.get('adj1')) ?? 18750)) / 1e5,
      r = (t * ((null == n ? void 0 : n.get('adj2')) ?? -8333)) / 1e5,
      o = (e * ((null == n ? void 0 : n.get('adj3')) ?? 18750)) / 1e5,
      l = (t * ((null == n ? void 0 : n.get('adj4')) ?? -16667)) / 1e5,
      s = (e * ((null == n ? void 0 : n.get('adj5')) ?? 112500)) / 1e5
    return [
      { d: `M0,0 L${t},0 L${t},${e} L0,${e} Z`, fill: 'norm', stroke: !0 },
      {
        d: `M${r},${i} L${l},${o} L${(t * ((null == n ? void 0 : n.get('adj6')) ?? -46667)) / 1e5},${s}`,
        fill: 'none',
        stroke: !0,
      },
    ]
  }),
  Fr.set('bordercallout3', (t, e, n) => {
    const i = (e * ((null == n ? void 0 : n.get('adj1')) ?? 18750)) / 1e5,
      r = (t * ((null == n ? void 0 : n.get('adj2')) ?? -8333)) / 1e5,
      o = (e * ((null == n ? void 0 : n.get('adj3')) ?? 18750)) / 1e5,
      l = (t * ((null == n ? void 0 : n.get('adj4')) ?? -16667)) / 1e5,
      s = (e * ((null == n ? void 0 : n.get('adj5')) ?? 1e5)) / 1e5,
      a = (t * ((null == n ? void 0 : n.get('adj6')) ?? -16667)) / 1e5,
      d = (e * ((null == n ? void 0 : n.get('adj7')) ?? 112963)) / 1e5
    return [
      { d: `M0,0 L${t},0 L${t},${e} L0,${e} Z`, fill: 'norm', stroke: !0 },
      {
        d: `M${r},${i} L${l},${o} L${a},${s} L${(t * ((null == n ? void 0 : n.get('adj8')) ?? -8333)) / 1e5},${d}`,
        fill: 'none',
        stroke: !0,
      },
    ]
  }),
  Fr.set('accentbordercallout1', (t, e, n) => {
    const i = (e * ((null == n ? void 0 : n.get('adj1')) ?? 18750)) / 1e5,
      r = (t * ((null == n ? void 0 : n.get('adj2')) ?? -8333)) / 1e5,
      o = (e * ((null == n ? void 0 : n.get('adj3')) ?? 112500)) / 1e5
    return [
      { d: `M0,0 L${t},0 L${t},${e} L0,${e} Z`, fill: 'norm', stroke: !0 },
      { d: `M${r},0 L${r},${e}`, fill: 'none', stroke: !0 },
      {
        d: `M${r},${i} L${(t * ((null == n ? void 0 : n.get('adj4')) ?? -38333)) / 1e5},${o}`,
        fill: 'none',
        stroke: !0,
      },
    ]
  }),
  Fr.set('accentbordercallout2', (t, e, n) => {
    const i = (e * ((null == n ? void 0 : n.get('adj1')) ?? 18750)) / 1e5,
      r = (t * ((null == n ? void 0 : n.get('adj2')) ?? -8333)) / 1e5,
      o = (e * ((null == n ? void 0 : n.get('adj3')) ?? 18750)) / 1e5,
      l = (t * ((null == n ? void 0 : n.get('adj4')) ?? -16667)) / 1e5,
      s = (e * ((null == n ? void 0 : n.get('adj5')) ?? 112500)) / 1e5
    return [
      { d: `M0,0 L${t},0 L${t},${e} L0,${e} Z`, fill: 'norm', stroke: !0 },
      { d: `M${r},0 L${r},${e}`, fill: 'none', stroke: !0 },
      {
        d: `M${r},${i} L${l},${o} L${(t * ((null == n ? void 0 : n.get('adj6')) ?? -46667)) / 1e5},${s}`,
        fill: 'none',
        stroke: !0,
      },
    ]
  }),
  Fr.set('accentbordercallout3', (t, e, n) => {
    const i = (e * ((null == n ? void 0 : n.get('adj1')) ?? 18750)) / 1e5,
      r = (t * ((null == n ? void 0 : n.get('adj2')) ?? -8333)) / 1e5,
      o = (e * ((null == n ? void 0 : n.get('adj3')) ?? 18750)) / 1e5,
      l = (t * ((null == n ? void 0 : n.get('adj4')) ?? -16667)) / 1e5,
      s = (e * ((null == n ? void 0 : n.get('adj5')) ?? 1e5)) / 1e5,
      a = (t * ((null == n ? void 0 : n.get('adj6')) ?? -16667)) / 1e5,
      d = (e * ((null == n ? void 0 : n.get('adj7')) ?? 112963)) / 1e5
    return [
      { d: `M0,0 L${t},0 L${t},${e} L0,${e} Z`, fill: 'norm', stroke: !0 },
      { d: `M${r},0 L${r},${e}`, fill: 'none', stroke: !0 },
      {
        d: `M${r},${i} L${l},${o} L${a},${s} L${(t * ((null == n ? void 0 : n.get('adj8')) ?? -8333)) / 1e5},${d}`,
        fill: 'none',
        stroke: !0,
      },
    ]
  }),
  Fr.set('chartx', (t, e) => [
    { d: `M0,0 L${t},0 L${t},${e} L0,${e} Z`, fill: 'norm', stroke: !1 },
    { d: `M0,0 L${t},${e} M${t},0 L0,${e}`, fill: 'none', stroke: !0 },
  ]),
  Fr.set('chartplus', (t, e) => {
    const n = t / 2,
      i = e / 2
    return [
      { d: `M0,0 L${t},0 L${t},${e} L0,${e} Z`, fill: 'norm', stroke: !1 },
      { d: `M${n},0 L${n},${e} M0,${i} L${t},${i}`, fill: 'none', stroke: !0 },
    ]
  }),
  Fr.set('chartstar', (t, e) => {
    const n = t / 2
    return [
      { d: `M0,0 L${t},0 L${t},${e} L0,${e} Z`, fill: 'norm', stroke: !1 },
      {
        d: `M0,0 L${t},${e} M${t},0 L0,${e} M${n},0 L${n},${e}`,
        fill: 'none',
        stroke: !0,
      },
    ]
  }),
  Fr.set('ribbon', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj1')) ?? 16667,
      r = (null == n ? void 0 : n.get('adj2')) ?? 5e4,
      o = Math.min(Math.max(i, 0), 33333),
      l = t / 2,
      s = t / 8,
      a = t / 32,
      d = t - s,
      c = (t * Math.min(Math.max(r, 25e3), 75e3)) / 2e5,
      u = l - c,
      h = l + c,
      p = u + a,
      f = h - a,
      m = u + s,
      $ = h - s,
      g = m - a,
      y = $ + a,
      x = (e * o) / 2e5,
      v = (e * o) / 1e5,
      b = e - v,
      M = b / 2,
      w = (e * o) / 4e5,
      k = e - w,
      A = v - w
    let L, S, C
    const F = []
    ;((L = 0),
      (S = 0),
      F.push('M0,0'),
      F.push(`L${g},0`),
      (L = g),
      (S = 0),
      (C = Er(L, S, a, w, 270, 180)),
      F.push(C.svg),
      (L = C.x),
      (S = C.y),
      F.push(`L${p},${x}`),
      (L = p),
      (S = x),
      (C = Er(L, S, a, w, 270, -180)),
      F.push(C.svg),
      (L = C.x),
      (S = C.y),
      F.push(`L${f},${v}`),
      (L = f),
      (S = v),
      (C = Er(L, S, a, w, 90, -180)),
      F.push(C.svg),
      (L = C.x),
      (S = C.y),
      F.push(`L${y},${x}`),
      (L = y),
      (S = x),
      (C = Er(L, S, a, w, 90, 180)),
      F.push(C.svg),
      (L = C.x),
      (S = C.y),
      F.push(`L${t},0`),
      F.push(`L${d},${M}`),
      F.push(`L${t},${b}`),
      F.push(`L${h},${b}`),
      F.push(`L${h},${k}`),
      (L = h),
      (S = k),
      (C = Er(L, S, a, w, 0, 90)),
      F.push(C.svg),
      (L = C.x),
      (S = C.y),
      F.push(`L${p},${e}`),
      (L = p),
      (S = e),
      (C = Er(L, S, a, w, 90, 90)),
      F.push(C.svg),
      (L = C.x),
      (S = C.y),
      F.push(`L${u},${b}`),
      F.push(`L0,${b}`),
      F.push(`L${s},${M}`),
      F.push('Z'))
    const B = []
    ;((L = m),
      (S = w),
      B.push(`M${L},${S}`),
      (C = Er(L, S, a, w, 0, 90)),
      B.push(C.svg),
      (L = C.x),
      (S = C.y),
      B.push(`L${p},${x}`),
      (L = p),
      (S = x),
      (C = Er(L, S, a, w, 270, -180)),
      B.push(C.svg),
      (L = C.x),
      (S = C.y),
      B.push(`L${m},${v}`),
      B.push('Z'),
      (L = $),
      (S = w),
      B.push(`M${L},${S}`),
      (C = Er(L, S, a, w, 180, -90)),
      B.push(C.svg),
      (L = C.x),
      (S = C.y),
      B.push(`L${f},${x}`),
      (L = f),
      (S = x),
      (C = Er(L, S, a, w, 270, 180)),
      B.push(C.svg),
      (L = C.x),
      (S = C.y),
      B.push(`L${$},${v}`),
      B.push('Z'))
    const j = []
    return (
      (L = 0),
      (S = 0),
      j.push('M0,0'),
      j.push(`L${g},0`),
      (L = g),
      (S = 0),
      (C = Er(L, S, a, w, 270, 180)),
      j.push(C.svg),
      (L = C.x),
      (S = C.y),
      j.push(`L${p},${x}`),
      (L = p),
      (S = x),
      (C = Er(L, S, a, w, 270, -180)),
      j.push(C.svg),
      (L = C.x),
      (S = C.y),
      j.push(`L${f},${v}`),
      (L = f),
      (S = v),
      (C = Er(L, S, a, w, 90, -180)),
      j.push(C.svg),
      (L = C.x),
      (S = C.y),
      j.push(`L${y},${x}`),
      (L = y),
      (S = x),
      (C = Er(L, S, a, w, 90, 180)),
      j.push(C.svg),
      (L = C.x),
      (S = C.y),
      j.push(`L${t},0`),
      j.push(`L${d},${M}`),
      j.push(`L${t},${b}`),
      j.push(`L${h},${b}`),
      j.push(`L${h},${k}`),
      (L = h),
      (S = k),
      (C = Er(L, S, a, w, 0, 90)),
      j.push(C.svg),
      (L = C.x),
      (S = C.y),
      j.push(`L${p},${e}`),
      (L = p),
      (S = e),
      (C = Er(L, S, a, w, 90, 90)),
      j.push(C.svg),
      (L = C.x),
      (S = C.y),
      j.push(`L${u},${b}`),
      j.push(`L0,${b}`),
      j.push(`L${s},${M}`),
      j.push('Z'),
      j.push(`M${m},${w} L${m},${v}`),
      j.push(`M${$},${v} L${$},${w}`),
      j.push(`M${u},${b} L${u},${A}`),
      j.push(`M${h},${A} L${h},${b}`),
      [
        { d: F.join(' '), fill: 'norm', stroke: !1 },
        { d: B.join(' '), fill: 'darkenLess', stroke: !1 },
        { d: j.join(' '), fill: 'none', stroke: !0 },
      ]
    )
  }),
  Fr.set('ribbon2', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj1')) ?? 16667,
      r = (null == n ? void 0 : n.get('adj2')) ?? 5e4,
      o = Math.min(Math.max(i, 0), 33333),
      l = t / 2,
      s = t / 8,
      a = t / 32,
      d = t - s,
      c = (t * Math.min(Math.max(r, 25e3), 75e3)) / 2e5,
      u = l - c,
      h = l + c,
      p = u + a,
      f = h - a,
      m = u + s,
      $ = h - s,
      g = m - a,
      y = $ + a,
      x = e - (e * o) / 2e5,
      v = (e * o) / 1e5,
      b = e - v,
      M = v,
      w = (M + e) / 2,
      k = (e * o) / 4e5,
      A = e - k,
      L = x - k
    let S, C, F
    const B = []
    ;(B.push(`M0,${e}`),
      B.push(`L${g},${e}`),
      (S = g),
      (C = e),
      (F = Er(S, C, a, k, 90, -180)),
      B.push(F.svg),
      (S = F.x),
      (C = F.y),
      B.push(`L${p},${x}`),
      (S = p),
      (C = x),
      (F = Er(S, C, a, k, 90, 180)),
      B.push(F.svg),
      (S = F.x),
      (C = F.y),
      B.push(`L${f},${b}`),
      (S = f),
      (C = b),
      (F = Er(S, C, a, k, 270, 180)),
      B.push(F.svg),
      (S = F.x),
      (C = F.y),
      B.push(`L${y},${x}`),
      (S = y),
      (C = x),
      (F = Er(S, C, a, k, 270, -180)),
      B.push(F.svg),
      (S = F.x),
      (C = F.y),
      B.push(`L${t},${e}`),
      B.push(`L${d},${w}`),
      B.push(`L${t},${M}`),
      B.push(`L${h},${M}`),
      B.push(`L${h},${k}`),
      (S = h),
      (C = k),
      (F = Er(S, C, a, k, 0, -90)),
      B.push(F.svg),
      (S = F.x),
      (C = F.y),
      B.push(`L${p},0`),
      (S = p),
      (C = 0),
      (F = Er(S, C, a, k, 270, -90)),
      B.push(F.svg),
      (S = F.x),
      (C = F.y),
      B.push(`L${u},${M}`),
      B.push(`L0,${M}`),
      B.push(`L${s},${w}`),
      B.push('Z'))
    const j = []
    ;((S = m),
      (C = A),
      j.push(`M${S},${C}`),
      (F = Er(S, C, a, k, 0, -90)),
      j.push(F.svg),
      (S = F.x),
      (C = F.y),
      j.push(`L${p},${x}`),
      (S = p),
      (C = x),
      (F = Er(S, C, a, k, 90, 180)),
      j.push(F.svg),
      (S = F.x),
      (C = F.y),
      j.push(`L${m},${b}`),
      j.push('Z'),
      (S = $),
      (C = A),
      j.push(`M${S},${C}`),
      (F = Er(S, C, a, k, 180, 90)),
      j.push(F.svg),
      (S = F.x),
      (C = F.y),
      j.push(`L${f},${x}`),
      (S = f),
      (C = x),
      (F = Er(S, C, a, k, 90, -180)),
      j.push(F.svg),
      (S = F.x),
      (C = F.y),
      j.push(`L${$},${b}`),
      j.push('Z'))
    const E = []
    return (
      E.push(`M0,${e}`),
      E.push(`L${s},${w}`),
      E.push(`L0,${M}`),
      E.push(`L${u},${M}`),
      E.push(`L${u},${k}`),
      (S = u),
      (C = k),
      (F = Er(S, C, a, k, 180, 90)),
      E.push(F.svg),
      (S = F.x),
      (C = F.y),
      E.push(`L${f},0`),
      (S = f),
      (C = 0),
      (F = Er(S, C, a, k, 270, 90)),
      E.push(F.svg),
      (S = F.x),
      (C = F.y),
      E.push(`L${h},${M}`),
      E.push(`L${t},${M}`),
      E.push(`L${d},${w}`),
      E.push(`L${t},${e}`),
      E.push(`L${y},${e}`),
      (S = y),
      (C = e),
      (F = Er(S, C, a, k, 90, 180)),
      E.push(F.svg),
      (S = F.x),
      (C = F.y),
      E.push(`L${f},${x}`),
      (S = f),
      (C = x),
      (F = Er(S, C, a, k, 90, -180)),
      E.push(F.svg),
      (S = F.x),
      (C = F.y),
      E.push(`L${p},${b}`),
      (S = p),
      (C = b),
      (F = Er(S, C, a, k, 270, -180)),
      E.push(F.svg),
      (S = F.x),
      (C = F.y),
      E.push(`L${g},${x}`),
      (S = g),
      (C = x),
      (F = Er(S, C, a, k, 270, 180)),
      E.push(F.svg),
      (S = F.x),
      (C = F.y),
      E.push('Z'),
      E.push(`M${m},${b} L${m},${A}`),
      E.push(`M${$},${A} L${$},${b}`),
      E.push(`M${u},${L} L${u},${M}`),
      E.push(`M${h},${M} L${h},${L}`),
      [
        { d: B.join(' '), fill: 'norm', stroke: !1 },
        { d: j.join(' '), fill: 'darkenLess', stroke: !1 },
        { d: E.join(' '), fill: 'none', stroke: !0 },
      ]
    )
  }),
  Fr.set('horizontalscroll', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj')) ?? 12500,
      r = (Math.min(t, e) * Math.min(Math.max(i, 0), 25e3)) / 1e5,
      o = r / 2,
      l = r / 4,
      s = r + o,
      a = r + r,
      d = e - r,
      c = e - o,
      u = d - o,
      h = t - r,
      p = t - o,
      f = []
    let m, $
    ;((m = t), ($ = o), f.push(`M${m},${$}`))
    let g = Er(m, $, o, o, 0, 90)
    ;(f.push(g.svg),
      (m = g.x),
      ($ = g.y),
      f.push(`L${p},${o}`),
      (g = Er(p, o, l, l, 0, 180)),
      f.push(g.svg),
      (m = g.x),
      ($ = g.y),
      f.push(`L${h},${r}`),
      f.push(`L${o},${r}`),
      (m = o),
      ($ = r),
      (g = Er(m, $, o, o, 270, -90)),
      f.push(g.svg),
      (m = g.x),
      ($ = g.y),
      f.push(`L0,${c}`),
      (m = 0),
      ($ = c),
      (g = Er(m, $, o, o, 180, -180)),
      f.push(g.svg),
      (m = g.x),
      ($ = g.y),
      f.push(`L${r},${d}`),
      f.push(`L${p},${d}`),
      (m = p),
      ($ = d),
      (g = Er(m, $, o, o, 90, -90)),
      f.push(g.svg),
      f.push('Z'),
      (m = o),
      ($ = a),
      f.push(`M${m},${$}`),
      (g = Er(m, $, o, o, 90, -90)),
      f.push(g.svg),
      (m = g.x),
      ($ = g.y),
      (g = Er(m, $, l, l, 0, -180)),
      f.push(g.svg),
      f.push('Z'))
    const y = []
    ;((m = o),
      ($ = a),
      y.push(`M${m},${$}`),
      (g = Er(m, $, o, o, 90, -90)),
      y.push(g.svg),
      (m = g.x),
      ($ = g.y),
      (g = Er(m, $, l, l, 0, -180)),
      y.push(g.svg),
      y.push('Z'),
      (m = p),
      ($ = r),
      y.push(`M${m},${$}`),
      (g = Er(m, $, o, o, 90, -270)),
      y.push(g.svg),
      (m = g.x),
      ($ = g.y),
      (g = Er(m, $, l, l, 180, -180)),
      y.push(g.svg),
      y.push('Z'))
    const x = []
    return (
      (m = 0),
      ($ = s),
      x.push(`M${m},${$}`),
      (g = Er(m, $, o, o, 180, 90)),
      x.push(g.svg),
      (m = g.x),
      ($ = g.y),
      x.push(`L${h},${r}`),
      x.push(`L${h},${o}`),
      (m = h),
      ($ = o),
      (g = Er(m, $, o, o, 180, 180)),
      x.push(g.svg),
      (m = g.x),
      ($ = g.y),
      x.push(`L${t},${u}`),
      (m = t),
      ($ = u),
      (g = Er(m, $, o, o, 0, 90)),
      x.push(g.svg),
      (m = g.x),
      ($ = g.y),
      x.push(`L${r},${d}`),
      x.push(`L${r},${c}`),
      (m = r),
      ($ = c),
      (g = Er(m, $, o, o, 0, 180)),
      x.push(g.svg),
      x.push('Z'),
      x.push(`M${h},${r}`),
      x.push(`L${p},${r}`),
      (m = p),
      ($ = r),
      (g = Er(m, $, o, o, 90, -90)),
      x.push(g.svg),
      x.push(`M${p},${r}`),
      x.push(`L${p},${o}`),
      (m = p),
      ($ = o),
      (g = Er(m, $, l, l, 0, 180)),
      x.push(g.svg),
      x.push(`M${o},${a}`),
      x.push(`L${o},${s}`),
      (m = o),
      ($ = s),
      (g = Er(m, $, l, l, 180, 180)),
      x.push(g.svg),
      (m = g.x),
      ($ = g.y),
      (g = Er(m, $, o, o, 0, 180)),
      x.push(g.svg),
      x.push(`M${r},${s}`),
      x.push(`L${r},${d}`),
      [
        { d: f.join(' '), fill: 'norm', stroke: !1 },
        { d: y.join(' '), fill: 'darkenLess', stroke: !1 },
        { d: x.join(' '), fill: 'none', stroke: !0 },
      ]
    )
  }),
  Fr.set('verticalscroll', (t, e, n) => {
    const i = (null == n ? void 0 : n.get('adj')) ?? 12500,
      r = (Math.min(t, e) * Math.min(Math.max(i, 0), 25e3)) / 1e5,
      o = r / 2,
      l = r / 4,
      s = r + o,
      a = r + r,
      d = t - r,
      c = t - o,
      u = e - r,
      h = e - o,
      p = []
    let f, m
    ;((f = o), (m = e), p.push(`M${f},${m}`))
    let $ = Er(f, m, o, o, 90, -90)
    ;(p.push($.svg),
      (f = $.x),
      (m = $.y),
      p.push(`L${o},${h}`),
      (f = o),
      (m = h),
      ($ = Er(f, m, l, l, 90, -180)),
      p.push($.svg),
      (f = $.x),
      (m = $.y),
      p.push(`L${r},${u}`),
      p.push(`L${r},${o}`),
      (f = r),
      (m = o),
      ($ = Er(f, m, o, o, 180, 90)),
      p.push($.svg),
      (f = $.x),
      (m = $.y),
      p.push(`L${c},0`),
      (f = c),
      (m = 0),
      ($ = Er(f, m, o, o, 270, 180)),
      p.push($.svg),
      (f = $.x),
      (m = $.y),
      p.push(`L${d},${r}`),
      p.push(`L${d},${h}`),
      (f = d),
      (m = h),
      ($ = Er(f, m, o, o, 0, 90)),
      p.push($.svg),
      p.push('Z'),
      (f = a),
      (m = o),
      p.push(`M${f},${m}`),
      ($ = Er(f, m, o, o, 0, 90)),
      p.push($.svg),
      (f = $.x),
      (m = $.y),
      ($ = Er(f, m, l, l, 90, 180)),
      p.push($.svg),
      p.push('Z'))
    const g = []
    ;((f = a),
      (m = o),
      g.push(`M${f},${m}`),
      ($ = Er(f, m, o, o, 0, 90)),
      g.push($.svg),
      (f = $.x),
      (m = $.y),
      ($ = Er(f, m, l, l, 90, 180)),
      g.push($.svg),
      g.push('Z'),
      (f = r),
      (m = h),
      g.push(`M${f},${m}`),
      ($ = Er(f, m, o, o, 0, 270)),
      g.push($.svg),
      (f = $.x),
      (m = $.y),
      ($ = Er(f, m, l, l, 270, 180)),
      g.push($.svg),
      g.push('Z'))
    const y = []
    return (
      (f = r),
      (m = u),
      y.push(`M${f},${m}`),
      y.push(`L${r},${o}`),
      (f = r),
      (m = o),
      ($ = Er(f, m, o, o, 180, 90)),
      y.push($.svg),
      (f = $.x),
      (m = $.y),
      y.push(`L${c},0`),
      (f = c),
      (m = 0),
      ($ = Er(f, m, o, o, 270, 180)),
      y.push($.svg),
      (f = $.x),
      (m = $.y),
      y.push(`L${d},${r}`),
      y.push(`L${d},${h}`),
      (f = d),
      (m = h),
      ($ = Er(f, m, o, o, 0, 90)),
      y.push($.svg),
      (f = $.x),
      (m = $.y),
      y.push(`L${o},${e}`),
      (f = o),
      (m = e),
      ($ = Er(f, m, o, o, 90, 180)),
      y.push($.svg),
      y.push('Z'),
      y.push(`M${s},0`),
      (f = s),
      (m = 0),
      ($ = Er(f, m, o, o, 270, 180)),
      y.push($.svg),
      (f = $.x),
      (m = $.y),
      ($ = Er(f, m, l, l, 90, 180)),
      y.push($.svg),
      (f = $.x),
      (m = $.y),
      y.push(`L${a},${o}`),
      y.push(`M${d},${r}`),
      y.push(`L${s},${r}`),
      y.push(`M${o},${u}`),
      (f = o),
      (m = u),
      ($ = Er(f, m, l, l, 270, 180)),
      y.push($.svg),
      (f = $.x),
      (m = $.y),
      y.push(`L${r},${h}`),
      y.push(`M${o},${e}`),
      (f = o),
      (m = e),
      ($ = Er(f, m, o, o, 90, -90)),
      y.push($.svg),
      (f = $.x),
      (m = $.y),
      y.push(`L${r},${u}`),
      [
        { d: p.join(' '), fill: 'norm', stroke: !1 },
        { d: g.join(' '), fill: 'darkenLess', stroke: !1 },
        { d: y.join(' '), fill: 'none', stroke: !0 },
      ]
    )
  }))
function Tr(t, e = 1e5) {
  if (!t || t.length > e) return null
  const n = []
  let i = 0
  for (; i < t.length;) {
    const e = t.charCodeAt(i)
    if (Dr(e)) {
      i++
      continue
    }
    if (Ur(e)) {
      n.push(t[i++])
      continue
    }
    const r = Ir(t, i)
    r > i ? (n.push(t.slice(i, r)), (i = r)) : i++
  }
  return n
}
function zr(t) {
  const e = Tr(t)
  if (!e || 6 !== e.length || 'M' !== e[0] || 'L' !== e[3]) return null
  const n = Nr(e, 1),
    i = Nr(e, 4)
  return n && i ? { start: n, end: i } : null
}
function Nr(t, e) {
  if (e + 1 >= t.length) return null
  const n = Number(t[e]),
    i = Number(t[e + 1])
  return Number.isFinite(n) && Number.isFinite(i) ? { x: n, y: i } : null
}
function Rr(t) {
  return Number.isInteger(t) ? String(t) : String(Number(t.toFixed(6)))
}
function Ir(t, e) {
  let n = e
  ;('-' === t[n] || '+' === t[n]) && n++
  let i = 0
  for (; Or(t.charCodeAt(n));) (n++, i++)
  if ('.' === t[n]) for (n++; Or(t.charCodeAt(n));) (n++, i++)
  if (0 === i) return e
  if ('e' === t[n] || 'E' === t[n]) {
    const e = n
    ;(n++, ('-' === t[n] || '+' === t[n]) && n++)
    let i = 0
    for (; Or(t.charCodeAt(n));) (n++, i++)
    if (0 === i) return e
  }
  return n
}
function Dr(t) {
  return 44 === t || 32 === t || 9 === t || 10 === t || 13 === t || 12 === t
}
function Or(t) {
  return t >= 48 && t <= 57
}
function Ur(t) {
  return (t >= 65 && t <= 90) || (t >= 97 && t <= 122)
}
var Zr = Number.POSITIVE_INFINITY
function Gr(t, e, n, i, r, o, l, s, a) {
  let d = -1
  for (let h = 0; h < i; h += 1)
    if (Number.isFinite(t[e + h * n])) {
      d = h
      break
    }
  if (d < 0) {
    for (let t = 0; t < i; t += 1) r[o + t * l] = Zr
    return
  }
  let c = 0
  ;((s[0] = d),
    (a[0] = Number.NEGATIVE_INFINITY),
    (a[1] = Number.POSITIVE_INFINITY))
  for (let h = d + 1; h < i; h += 1) {
    const i = t[e + h * n]
    if (!Number.isFinite(i)) continue
    let r = s[c],
      o = (i + h * h - (t[e + r * n] + r * r)) / (2 * (h - r))
    for (; c > 0 && o <= a[c];)
      ((c -= 1),
        (r = s[c]),
        (o = (i + h * h - (t[e + r * n] + r * r)) / (2 * (h - r))))
    ;((c += 1), (s[c] = h), (a[c] = o), (a[c + 1] = Number.POSITIVE_INFINITY))
  }
  let u = 0
  for (let h = 0; h < i; h += 1) {
    for (; u < c && a[u + 1] < h;) u += 1
    const i = s[u],
      d = h - i
    r[o + h * l] = d * d + t[e + i * n]
  }
}
function Xr(t, e, n, i = 128) {
  if (
    ((function (t, e, n) {
      if (!Number.isInteger(e) || !Number.isInteger(n) || e <= 0 || n <= 0)
        throw new RangeError('width and height must be positive integers')
      if (t.length !== e * n)
        throw new RangeError('alpha length must equal width * height')
    })(t, e, n),
    !Number.isFinite(i) || i < 0 || i > 255)
  )
    throw new RangeError('threshold must be between 0 and 255')
  const r = e + 2,
    o = n + 2,
    l = r * o,
    s = new Float64Array(l)
  s.fill(0)
  for (let h = 0; h < n; h += 1) {
    const n = (h + 1) * r + 1,
      o = h * e
    for (let r = 0; r < e; r += 1) s[n + r] = t[o + r] >= i ? Zr : 0
  }
  const a = new Float64Array(l),
    d = new Int32Array(Math.max(r, o)),
    c = new Float64Array(d.length + 1)
  for (let h = 0; h < r; h += 1) Gr(s, h, r, o, a, h, r, d, c)
  for (let h = 0; h < o; h += 1) {
    const t = h * r
    Gr(a, t, 1, r, s, t, 1, d, c)
  }
  const u = new Float32Array(e * n)
  for (let h = 0; h < n; h += 1) {
    const n = (h + 1) * r + 1,
      o = h * e
    for (let r = 0; r < e; r += 1)
      t[o + r] >= i && (u[o + r] = Math.sqrt(s[n + r]))
  }
  return u
}
function Yr(t, e, n) {
  return Math.max(e, Math.min(n, t))
}
function Wr(t, e, n, i, r) {
  return i < 0 || r < 0 || i >= e || r >= n ? 0 : t[r * e + i]
}
function Hr(t, e, n, i) {
  !(function (t) {
    if (
      !Number.isFinite(t.bandPx) ||
      !Number.isFinite(t.heightPx) ||
      t.bandPx <= 0 ||
      t.heightPx <= 0
    )
      throw new RangeError(
        'bandPx and heightPx must be positive finite numbers',
      )
    if (
      !Number.isFinite(t.lightAzimuthDeg) ||
      (void 0 !== t.shadowAzimuthDeg && !Number.isFinite(t.shadowAzimuthDeg)) ||
      !Number.isFinite(t.lightElevationDeg)
    )
      throw new RangeError('light angles must be finite numbers')
    if (
      void 0 !== t.shadowDirectionMix &&
      (!Number.isFinite(t.shadowDirectionMix) ||
        t.shadowDirectionMix < 0 ||
        t.shadowDirectionMix > 1)
    )
      throw new RangeError(
        'shadow direction mix must be a finite normalized value',
      )
    if (!Number.isFinite(t.intensity) || t.intensity < 0)
      throw new RangeError('intensity must be a non-negative finite number')
    if (
      (void 0 !== t.shadowFloor &&
        (!Number.isFinite(t.shadowFloor) ||
          t.shadowFloor < 0 ||
          t.shadowFloor > 0.72)) ||
      (void 0 !== t.shadowScale &&
        (!Number.isFinite(t.shadowScale) ||
          t.shadowScale < 0 ||
          t.shadowScale > 1)) ||
      (void 0 !== t.highlightScale &&
        (!Number.isFinite(t.highlightScale) ||
          t.highlightScale < 0 ||
          t.highlightScale > 2))
    )
      throw new RangeError(
        'shadow floor and scale must be finite normalized values',
      )
  })(i)
  const r = Xr(t, e, n),
    o = (function (t, e, n, i) {
      if (i <= 0) return t
      const r = new Float32Array(t.length),
        o = new Float32Array(t.length)
      for (let l = 0; l < n; l += 1) {
        let n = 0
        for (let r = -i; r <= i; r += 1) r >= 0 && r < e && (n += t[l * e + r])
        for (let o = 0; o < e; o += 1) {
          r[l * e + o] = n / (2 * i + 1)
          const s = o - i,
            a = o + i + 1
          ;(s >= 0 && (n -= t[l * e + s]), a < e && (n += t[l * e + a]))
        }
      }
      for (let l = 0; l < e; l += 1) {
        let t = 0
        for (let o = -i; o <= i; o += 1) o >= 0 && o < n && (t += r[o * e + l])
        for (let s = 0; s < n; s += 1) {
          o[s * e + l] = t / (2 * i + 1)
          const a = s - i,
            d = s + i + 1
          ;(a >= 0 && (t -= r[a * e + l]), d < n && (t += r[d * e + l]))
        }
      }
      return o
    })(r, e, n, Yr(Math.round(0.16 * i.bandPx), 1, 3)),
    l = new Uint8ClampedArray(e * n * 4),
    s = (i.lightAzimuthDeg * Math.PI) / 180,
    a = (i.lightElevationDeg * Math.PI) / 180,
    d = Math.cos(a),
    c = Math.sin(s) * d,
    u = -Math.cos(s) * d,
    h = Math.sin(a),
    p = ((i.shadowAzimuthDeg ?? i.lightAzimuthDeg) * Math.PI) / 180,
    f = Math.sin(p) * d,
    m = -Math.cos(p) * d
  for (let $ = 0; $ < n; $ += 1)
    for (let s = 0; s < e; s += 1) {
      const a = $ * e + s,
        d = Yr(t[a] / 255, 0, 1),
        p = r[a]
      if (d <= 0 || p <= 0 || p >= i.bandPx) continue
      const g = (Wr(o, e, n, s + 1, $) - Wr(o, e, n, s - 1, $)) / 2,
        y = (Wr(o, e, n, s, $ + 1) - Wr(o, e, n, s, $ - 1)) / 2,
        x = Math.hypot(g, y)
      if (x < 1e-6) continue
      const v = g / x,
        b = y / x,
        M = 1 - Yr(p / i.bandPx, 0, 1),
        w = Math.sqrt(Math.max(1e-6, 1 - M * M)),
        k = (i.heightPx / i.bandPx) * (M / w)
      let A = -v * k,
        L = -b * k,
        S = 1
      const C = Math.hypot(A, L, S)
      ;((A /= C), (L /= C), (S /= C))
      const F = Math.max(0, A * c + L * u + S * h) - Math.max(0, h),
        B = Math.max(0, A * f + L * m + S * h) - Math.max(0, h),
        j = Math.max(-F, 0),
        E = Math.max(-B, 0),
        P = i.shadowDirectionMix ?? 1,
        T = F > 0 ? F : -(j + (E - j) * P),
        z = Math.abs(T) * i.intensity,
        N =
          T > 0
            ? z * (i.highlightScale ?? 1)
            : z * (i.shadowScale ?? 1) + (i.shadowFloor ?? 0) * M,
        R = Math.round(255 * Yr(N * d, 0, 0.72))
      if (R <= 0) continue
      const I = 4 * a,
        D = T > 0 ? 255 : 0
      ;((l[I] = D), (l[I + 1] = D), (l[I + 2] = D), (l[I + 3] = R))
    }
  return l
}
var Vr = 1e-9
function qr(t) {
  return Number.isFinite(t.x) && Number.isFinite(t.y)
}
function _r(t, e, n) {
  if (
    !Number.isFinite(t) ||
    !Number.isFinite(e) ||
    t <= 0 ||
    e <= 0 ||
    !n.every(qr)
  )
    return
  const [i, r, o, l] = n,
    s = n.reduce((t, e, i) => {
      const r = n[(i + 1) % n.length]
      return t + e.x * r.y - r.x * e.y
    }, 0)
  if (!Number.isFinite(s) || Math.abs(s) <= Vr) return
  const a = r.x - o.x,
    d = l.x - o.x,
    c = i.x - r.x + o.x - l.x,
    u = r.y - o.y,
    h = l.y - o.y,
    p = i.y - r.y + o.y - l.y
  let f = 0,
    m = 0
  if (Math.abs(c) > Vr || Math.abs(p) > Vr) {
    const t = a * h - d * u
    if (!Number.isFinite(t) || Math.abs(t) <= Vr) return
    ;((f = (c * h - d * p) / t), (m = (a * p - c * u) / t))
  }
  const $ = {
    h11: (r.x - i.x + f * r.x) / t,
    h12: (l.x - i.x + m * l.x) / e,
    h13: i.x,
    h21: (r.y - i.y + f * r.y) / t,
    h22: (l.y - i.y + m * l.y) / e,
    h23: i.y,
    h31: f / t,
    h32: m / e,
  }
  return Object.values($).every(Number.isFinite) ? $ : void 0
}
function Qr(t, e) {
  const n = t.h31 * e.x + t.h32 * e.y + 1
  if (!Number.isFinite(n) || Math.abs(n) <= Vr) return
  const i = {
    x: (t.h11 * e.x + t.h12 * e.y + t.h13) / n,
    y: (t.h21 * e.x + t.h22 * e.y + t.h23) / n,
  }
  return qr(i) ? i : void 0
}
function Kr(t) {
  const e = Math.abs(t) < 5e-7 ? 0 : t
  return Number.isInteger(e) ? String(e) : String(Number(e.toFixed(6)))
}
function Jr(t) {
  return `${Kr(t.x)},${Kr(t.y)}`
}
function to(t, e) {
  return { x: (t.x + e.x) / 2, y: (t.y + e.y) / 2 }
}
function eo(t, e, n) {
  const i = n.x - e.x,
    r = n.y - e.y,
    o = Math.hypot(i, r)
  return o <= Vr
    ? Math.hypot(t.x - e.x, t.y - e.y)
    : Math.abs(r * t.x - i * t.y + n.x * e.y - n.y * e.x) / o
}
function no(t, e, n, i, r, o = 0) {
  const l = n.map((t) => Qr(e, t))
  if (l.some((t) => void 0 === t)) return !1
  const [s, a, d, c] = l
  if (Math.max(eo(a, s, c), eo(d, s, c)) <= i || o >= 10)
    return ((r.value += 1), !(r.value > 8192) && (t.push(`L${Jr(c)}`), !0))
  const [u, h] = (function (t, e, n, i) {
    const r = to(t, e),
      o = to(e, n),
      l = to(n, i),
      s = to(r, o),
      a = to(o, l),
      d = to(s, a)
    return [
      [t, r, s, d],
      [d, a, l, i],
    ]
  })(...n)
  return no(t, e, u, i, r, o + 1) && no(t, e, h, i, r, o + 1)
}
function io(t, e, n) {
  const i = _r(t, e, n)
  if (!i) return
  const { h11: r, h12: o, h13: l, h21: s, h22: a, h23: d, h31: c, h32: u } = i,
    h = [r, s, 0, c, o, a, 0, u, 0, 0, 1, 0, l, d, 0, 1]
  return h.some((t) => !Number.isFinite(t))
    ? void 0
    : `matrix3d(${h.map((t) => Number(t.toFixed(12))).join(',')})`
}
function ro(t) {
  return ((((((t + 180) % 360) + 360) % 360) - 180) * Math.PI) / 180
}
function oo(t) {
  const { kind: e, width: n, height: i, presentationWidth: r, rotation: o } = t
  if (![n, i, r].every(Number.isFinite) || n <= 0 || i <= 0 || r <= 0) return
  const l = ro(o.latitude),
    s = ro(o.longitude),
    a = ro(o.revolution),
    d = Math.cos(l),
    c = Math.sin(l),
    u = Math.cos(s),
    h = Math.sin(s),
    p = Math.cos(a),
    f = Math.sin(a)
  let m
  if ('perspective' === e) {
    const e = t.fieldOfView,
      n = t.presetViewportScale
    if (
      void 0 === e ||
      void 0 === n ||
      !Number.isFinite(e) ||
      !Number.isFinite(n) ||
      e <= 0 ||
      e >= 180 ||
      n <= 0 ||
      ((m = (r / (2 * Math.tan((e * Math.PI) / 360))) * n),
      !Number.isFinite(m) || m <= 0)
    )
      return
  }
  const $ = n / 2,
    g = i / 2,
    y = [
      [-$, -g],
      [$, -g],
      [$, g],
      [-$, g],
    ],
    x = []
  for (const [v, b] of y) {
    let e = v * u,
      n = b * d + v * h * c
    if (void 0 !== m) {
      const t = m + (b * c - v * h * d)
      if (!Number.isFinite(t) || t <= 0.1 * m) return
      const i = m / t
      ;((e *= i), (n *= i))
    }
    const i = t.presetProjectionScale ?? 1
    if (!Number.isFinite(i) || i <= 0) return
    const r = { x: $ + (e * p - n * f) * i, y: g + (e * f + n * p) * i }
    if (!Number.isFinite(r.x) || !Number.isFinite(r.y)) return
    x.push(r)
  }
  return { corners: x, cameraDistance: m }
}
function lo(t, e) {
  const n = t / e,
    i = Math.max(1.04, Math.min(1.09, 1.0725 - 0.0315 * Math.log(n)))
  return { brightness: Number(i.toFixed(4)), color: '#FFFFFF', opacity: 0.02 }
}
var so = new Set(['donut', 'ellipse', 'rect', 'roundrect']),
  ao = new Set(['rect']),
  co = new Set(['#2f75b5', '#4f81bd']),
  uo = new Set(['#2f75b5', '#ffffff']),
  ho = 0.95,
  po = [
    { width: 403.2, height: 403.2 },
    { width: 768, height: 307.2 },
    { width: 307.2, height: 518.4 },
  ],
  fo = new WeakMap(),
  mo = 0
var $o = [
    { aspect: 0.55, strength: 0.72 },
    { aspect: 1, strength: 0.58 },
    { aspect: 1.6, strength: 0.45 },
  ],
  go = [
    { aspect: 0.55, strength: 0.72 },
    { aspect: 1, strength: 0.572 },
    { aspect: 1.6, strength: 0.45 },
  ],
  yo = [
    { aspect: 0.55, floor: 0, scale: 0.9 },
    { aspect: 1, floor: 0.6, scale: 0.25 },
    { aspect: 1.6, floor: 0.7, scale: 0.4 },
  ],
  xo = 258,
  vo = 0.5,
  bo = 0.35,
  Mo = 1.05
function wo(t, e) {
  return null != e && e.length
    ? { mode: 'flat', reason: t, parseIssues: e }
    : { mode: 'flat', reason: t }
}
function ko(t) {
  var e
  return t.presetGeometry || 'picture' !== t.nodeType
    ? ((null == (e = t.presetGeometry) ? void 0 : e.toLowerCase()) ?? '')
    : 'rect'
}
function Ao(t, e) {
  return (
    !!t &&
    ['latitude', 'longitude', 'revolution'].every(
      (n) => Math.abs(t[n] - e[n]) <= 1e-6,
    )
  )
}
function Lo(t, e) {
  if ('orthographic-identity' === e) {
    const e = Ee(je(t, 3700), 96e3)
    return { top: e, bottom: e }
  }
  if ('orthographic-rotated' === e) {
    const e = Ee(je(t, 1800), 1e5)
    return { top: e, bottom: e }
  }
  const n = Me(t),
    { s: i, l: r } = ke(n.r, n.g, n.b),
    o = No((r - 0.4470588235) / 0.07843137260000005, 0, 1),
    l = No((i - 0.5877192982) / -0.13317384370000002, 0, 1),
    s = Math.round(12e3 + -4200 * o),
    a = Math.round(6100 + -2200 * o),
    d = Math.round(107e3 + 17e3 * l),
    c = Math.round(94e3 + 19e3 * l)
  return { top: Ee(je(t, s), d), bottom: Ee(je(t, a), c) }
}
var So = [
  {
    aspect: 3.2 / 5.4,
    top: [73, 146, 212],
    middle: [61, 134, 200],
    bottom: [55, 128, 194],
  },
  {
    aspect: 1,
    top: [75, 148, 214],
    middle: [67, 139, 206],
    bottom: [60, 133, 199],
  },
  {
    aspect: 2.5,
    top: [64, 137, 203],
    middle: [60, 133, 199],
    bottom: [54, 126, 193],
  },
]
function Co(t, e, n) {
  return we(
    t[0] + (e[0] - t[0]) * n,
    t[1] + (e[1] - t[1]) * n,
    t[2] + (e[2] - t[2]) * n,
  )
}
function Fo(t, e) {
  const n = t / e
  let i = So[0],
    r = So[So.length - 1]
  for (let a = 1; a < So.length; a += 1)
    if (n <= So[a].aspect) {
      ;((i = So[a - 1]), (r = So[a]))
      break
    }
  const o = Math.log(i.aspect),
    l = Math.log(r.aspect),
    s = i === r ? 0 : No((Math.log(n) - o) / Math.max(l - o, 1e-9), 0, 1)
  return {
    top: Co(i.top, r.top, s),
    middle: Co(i.middle, r.middle, s),
    bottom: Co(i.bottom, r.bottom, s),
  }
}
var Bo = [3.2 / 5.2, 1, 2]
function jo(t, e, n) {
  var i
  const r = t.scene,
    o = t.shape,
    l = o.bevelBottom
  if ('orthographicFront' !== r.cameraPreset) return wo('camera-preset')
  if (r.cameraRotation) return wo('camera-rotation')
  if (void 0 !== r.fieldOfView) return wo('camera-field-of-view')
  if (void 0 !== r.cameraZoom) return wo('camera-zoom')
  if (!r.lightRig) return wo('missing-light-rig')
  if ('threePt' !== r.lightRig) return wo('light-rig')
  if ('t' !== r.lightDirection) return wo('light-direction')
  if (
    r.lightRotation &&
    !Ao(r.lightRotation, { latitude: 0, longitude: 0, revolution: 50 })
  )
    return wo('light-rotation')
  if (
    (o.contourWidth ?? 0) > 0 ||
    (null != (i = o.contourColorSource) && i.exists())
  )
    return wo('contour-paint')
  if ('rect' !== ko(e)) return wo('geometry-preset')
  if (
    ('relaxedInset' !== l.preset && 'circle' !== l.preset) ||
    Math.abs((l.width ?? 0) - 8) > 1e-6 ||
    Math.abs((l.height ?? 0) - 8) > 1e-6 ||
    !(function (t, e) {
      const n = t / e
      return Bo.some((t) => Math.abs(Math.log(n / t)) <= 1e-4)
    })(e.width, e.height)
  )
    return wo('bottom-bevel')
  if (void 0 !== o.presetMaterial && 'dkEdge' !== o.presetMaterial)
    return wo('preset-material')
  if (
    'solid' !== e.paintKind ||
    !e.baseFill ||
    !/^#[0-9a-f]{6}$/i.test(e.baseFill)
  )
    return wo('paint-kind')
  if ('#4472c4' !== e.baseFill.toLowerCase()) return wo('paint-value')
  if ('standalone-slide' !== e.container) return wo('parent-container')
  if (e.hasVisibleText) {
    const t = e.textPlane
    if (
      !t ||
      void 0 !== t.wrap ||
      'ctr' !== t.anchor ||
      'none' !== t.autofit ||
      void 0 !== t.vertical ||
      t.hasIndependentBounds
    )
      return wo('text-body-properties')
  }
  const s = oo({
    kind: 'orthographic',
    width: e.width,
    height: e.height,
    presentationWidth: n.presentation.width,
    rotation: { latitude: 0, longitude: 0, revolution: 0 },
  })
  if (!s) return wo('projection-out-of-range')
  const a = 'dkEdge' === o.presetMaterial ? 'dkEdge' : 'implicit',
    d = 'dkEdge' === a ? '#4676cb' : '#4b7bd0'
  return {
    mode: 'camera-projected-plane',
    surface: 'shape',
    geometry: 'rect',
    frontMaterial: a,
    bounds: { width: e.width, height: e.height },
    corners: s.corners,
    camera: {
      kind: 'orthographic',
      preset: 'orthographicFront',
      rotation: { latitude: 0, longitude: 0, revolution: 0 },
    },
    fill: { top: d, bottom: d },
  }
}
function Eo(t, e, n) {
  var i, r
  const o = t.scene,
    l = t.shape
  if (e.hasVisibleStroke) return wo('visible-stroke')
  if (0 !== (e.rotation ?? 0) || e.flipH || e.flipV)
    return wo('shape-transform')
  if (t.effectKinds.length > 0) return wo('effect-list-conflict')
  if (((null == l ? void 0 : l.extrusionHeight) ?? 0) > 0)
    return wo('extrusion-height')
  if (null != l && l.bevelBottom) return jo(t, e, n)
  if (void 0 !== (null == l ? void 0 : l.presetMaterial))
    return wo('preset-material')
  if (
    ((null == l ? void 0 : l.contourWidth) ?? 0) > 0 ||
    (null != (i = null == l ? void 0 : l.contourColorSource) && i.exists())
  )
    return wo('contour-paint')
  const s =
    'shape' === e.nodeType &&
    !0 === e.hasCustomGeometry &&
    'multi-contour-cubic' === e.customGeometryProfile &&
    !e.presetGeometry
  if ((e.hasCustomGeometry && !s) || (!s && 'rect' !== ko(e)))
    return wo('geometry-preset')
  if (s) {
    if ('standalone-slide' !== e.container) return wo('parent-container')
    if (e.hasStyleReference) return wo('style-reference')
    if (
      !(function (t, e) {
        return po.some(
          (n) =>
            Math.abs(t - n.width) <= 0.01 && Math.abs(e - n.height) <= 0.01,
        )
      })(e.width, e.height)
    )
      return wo('invalid-bounds')
    if (l) return wo('missing-shape-format')
  }
  if (!o.lightRig) return wo('missing-light-rig')
  if ('threePt' !== o.lightRig) return wo('light-rig')
  if ('t' !== o.lightDirection) return wo('light-direction')
  if (o.lightRotation) return wo('light-rotation')
  if (void 0 !== o.cameraZoom) return wo('camera-zoom')
  if ('picture' === e.nodeType) {
    if (l) return wo('picture-shape-format')
    if ('picture' !== e.paintKind) return wo('paint-kind')
    if (e.hasStyleReference) return wo('style-reference')
    if (
      'rect' !== (null == (r = e.presetGeometry) ? void 0 : r.toLowerCase()) ||
      e.hasCustomGeometry
    )
      return wo('geometry-preset')
    if (!e.hasStretchMode) return wo('picture-stretch-mode')
    if (e.hasStretchFillRect) return wo('picture-fill-rect')
    if (e.hasBlipEffects) return wo('picture-blip-effect')
    if (e.hasPictureBackgroundFill) return wo('paint-kind')
    if ('perspectiveRight' !== o.cameraPreset) return wo('camera-preset')
    if (void 0 === o.fieldOfView || Math.abs(o.fieldOfView - 95) > 1e-6)
      return wo('camera-field-of-view')
    if (o.cameraRotation) return wo('camera-rotation')
    const t = { latitude: 0, longitude: -20, revolution: 0 },
      i = oo({
        kind: 'perspective',
        width: e.width,
        height: e.height,
        presentationWidth: n.presentation.width,
        rotation: t,
        fieldOfView: o.fieldOfView,
        presetViewportScale: 0.95,
      })
    return i
      ? {
          mode: 'camera-projected-picture-plane',
          surface: 'picture',
          geometry: 'rect',
          bounds: { width: e.width, height: e.height },
          corners: i.corners,
          camera: {
            kind: 'perspective',
            preset: 'perspectiveRight',
            rotation: t,
            fieldOfView: o.fieldOfView,
          },
          lighting: { brightness: 1.01, color: '#FFFFFF', opacity: 0.09 },
        }
      : wo('projection-out-of-range')
  }
  if (e.hasVisibleText) {
    if (l) return wo('visible-text')
    if ('none' !== e.paintKind) return wo('paint-kind')
    if (e.hasStyleReference) return wo('style-reference')
    const t = e.textPlane
    if (
      !t ||
      'none' !== t.wrap ||
      'spAutoFit' !== t.autofit ||
      void 0 !== t.vertical ||
      t.hasIndependentBounds
    )
      return wo('text-body-properties')
    let i, r, s, a
    if ('perspectiveContrastingRightFacing' === o.cameraPreset) {
      if ('ctr' !== t.anchor) return wo('text-body-properties')
      if (void 0 === o.fieldOfView || Math.abs(o.fieldOfView - 85) > 1e-6)
        return wo('camera-field-of-view')
      if (
        !Ao(o.cameraRotation, {
          latitude: 0,
          longitude: 19532225 / 6e4,
          revolution: 0,
        })
      )
        return wo('camera-rotation')
      ;((i = 'perspectiveContrastingRightFacing'),
        (r = o.cameraRotation),
        (s = o.fieldOfView),
        (a = 0.95))
    } else {
      if ('perspectiveLeft' !== o.cameraPreset) return wo('camera-preset')
      if (void 0 !== t.anchor) return wo('text-body-properties')
      if (void 0 === o.fieldOfView || Math.abs(o.fieldOfView - 120) > 1e-6)
        return wo('camera-field-of-view')
      if (o.cameraRotation) return wo('camera-rotation')
      ;((i = 'perspectiveLeft'),
        (r = { latitude: 0, longitude: 20, revolution: 0 }),
        (s = o.fieldOfView),
        (a = ho))
    }
    const d = oo({
      kind: 'perspective',
      width: e.width,
      height: e.height,
      presentationWidth: n.presentation.width,
      rotation: r,
      fieldOfView: s,
      presetViewportScale: a,
    })
    return d
      ? {
          mode: 'camera-projected-text-plane',
          surface: 'shape',
          geometry: 'rect',
          bounds: { width: e.width, height: e.height },
          corners: d.corners,
          camera: {
            kind: 'perspective',
            preset: i,
            rotation: r,
            fieldOfView: s,
          },
        }
      : wo('projection-out-of-range')
  }
  if (
    'solid' !== e.paintKind ||
    !e.baseFill ||
    !/^#[0-9a-f]{6}$/i.test(e.baseFill)
  )
    return wo('paint-kind')
  const a = e.baseFill.toLowerCase()
  if (!(s ? uo : co).has(a) || (!l && !s && '#2f75b5' !== a))
    return wo('paint-value')
  let d, c, u, h, p, f
  if ('orthographicFront' === o.cameraPreset) {
    if (s) return wo('camera-preset')
    if (void 0 !== o.fieldOfView) return wo('camera-field-of-view')
    if ('#2f75b5' !== a) return wo('paint-value')
    if (((d = 'orthographic'), (c = 'orthographicFront'), o.cameraRotation)) {
      if (!Ao(o.cameraRotation, { latitude: 20, longitude: 30, revolution: 0 }))
        return wo('camera-rotation')
      ;((u = o.cameraRotation), (p = 'orthographic-rotated'))
    } else
      ((u = { latitude: 0, longitude: 0, revolution: 0 }),
        (p = 'orthographic-identity'))
  } else {
    if ('perspectiveRelaxedModerately' !== o.cameraPreset)
      return wo(l ? 'camera-preset' : 'missing-shape-format')
    if (void 0 === o.fieldOfView || Math.abs(o.fieldOfView - 120) > 1e-6)
      return wo('camera-field-of-view')
    if (
      !Ao(o.cameraRotation, {
        latitude: 18590633 / 6e4,
        longitude: 0,
        revolution: 0,
      })
    )
      return wo('camera-rotation')
    ;((d = 'perspective'),
      (c = 'perspectiveRelaxedModerately'),
      (u = o.cameraRotation),
      (h = o.fieldOfView),
      (p = 'perspective'),
      (f = s ? 1.1 : 0.95))
  }
  const m = oo({
    kind: d,
    width: e.width,
    height: e.height,
    presentationWidth: n.presentation.width,
    rotation: u,
    fieldOfView: h,
    presetViewportScale: f,
    presetProjectionScale: 'perspective' === d ? (s ? 1.1 : 0.996) : void 0,
  })
  return m
    ? {
        mode: 'camera-projected-plane',
        surface: 'shape',
        geometry: s ? 'custom' : 'rect',
        bounds: { width: e.width, height: e.height },
        corners: m.corners,
        camera: { kind: d, preset: c, rotation: u, fieldOfView: h },
        fill:
          s && '#ffffff' === a
            ? { top: '#ffffff', bottom: '#ffffff' }
            : l
              ? Lo(a, p)
              : Fo(e.width, e.height),
      }
    : wo('projection-out-of-range')
}
function Po(t, e, n) {
  var i, r
  if (!t) return wo('missing-properties')
  if (t.parseIssues.length > 0) return wo('parse-issue', t.parseIssues)
  if (
    !Number.isFinite(e.width) ||
    !Number.isFinite(e.height) ||
    e.width <= 0 ||
    e.height <= 0
  )
    return wo('invalid-bounds')
  const o =
      'group' === e.container &&
      'donut' === (null == (i = e.presetGeometry) ? void 0 : i.toLowerCase())
        ? e.sourceBounds
        : void 0,
    l = !!(
      o &&
      Number.isFinite(o.width) &&
      Number.isFinite(o.height) &&
      o.width > 0 &&
      o.height > 0
    ),
    s = l ? o : { width: e.width, height: e.height }
  if (e.isLineLike) return wo('line-like')
  if (e.isTiledPicture) return wo('tiled-picture')
  if (
    'picture' === e.nodeType &&
    !(function (t) {
      return (
        !t ||
        ([t.top, t.right, t.bottom, t.left].every(
          (t) => Number.isFinite(t) && t >= 0 && t <= 1,
        ) &&
          t.left + t.right < 0.999 &&
          t.top + t.bottom < 0.999)
      )
    })(e.sourceCrop)
  )
    return wo('picture-source-crop')
  const a = t.scene
  if (!a) return wo('missing-scene')
  if (!a.cameraPreset) return wo('missing-camera')
  const d = t.shape
  if (a.hasBackdrop) return wo('backdrop')
  if (Math.abs((null == d ? void 0 : d.zPosition) ?? 0) > 1e-9)
    return wo('z-position')
  if (null != d && d.extrusionColor) return wo('extrusion-paint')
  if (null == d || !d.bevelTop) return Eo(t, e, n)
  if ('orthographicFront' !== a.cameraPreset) return wo('camera-preset')
  if (a.cameraRotation) return wo('camera-rotation')
  if (!a.lightRig) return wo('missing-light-rig')
  if ('twoPt' !== a.lightRig && 'threePt' !== a.lightRig) return wo('light-rig')
  if ('t' !== a.lightDirection) return wo('light-direction')
  if (
    a.lightRotation &&
    !(function (t, e, n) {
      return (
        'twoPt' === t &&
        't' === e &&
        0 === n.latitude &&
        0 === n.longitude &&
        120 === n.revolution
      )
    })(a.lightRig, a.lightDirection, a.lightRotation)
  )
    return wo('light-rotation')
  if (t.effectKinds.some((t) => 'outerShdw' !== t))
    return wo('effect-list-conflict')
  if ((d.extrusionHeight ?? 0) > 0) return wo('extrusion-height')
  if (d.bevelBottom) return wo('bottom-bevel')
  if ('circle' !== d.bevelTop.preset) return wo('top-bevel-preset')
  if (!(
    Number.isFinite(d.bevelTop.width) &&
    Number.isFinite(d.bevelTop.height) &&
    d.bevelTop.width > 0 &&
    d.bevelTop.height > 0
  ))
    return wo('top-bevel-dimensions')
  if (void 0 !== d.presetMaterial) return wo('preset-material')
  const c = ko(e)
  if (!('shape' === e.nodeType ? so : ao).has(c)) return wo('geometry-preset')
  if (
    ('shape' === e.nodeType && e.paintKind && 'solid' !== e.paintKind) ||
    ('shape' === e.nodeType &&
      (!e.baseFill || !/^#[0-9a-f]{6}$/i.test(e.baseFill)))
  )
    return wo('paint-kind')
  const u = d.bevelTop,
    h = (function (t, e) {
      var n, i
      const r = (null == (n = t.shape) ? void 0 : n.contourWidth) ?? 0,
        o = null == (i = t.shape) ? void 0 : i.contourColorSource
      if (!(r > 0 && null != o && o.exists())) return
      const { color: l, alpha: s } = en(o, e)
      return !l || s <= 0
        ? void 0
        : { width: r, color: l.startsWith('#') ? l : `#${l}`, alpha: s }
    })(t, n)
  if (((null == (r = t.shape) ? void 0 : r.contourWidth) ?? 0) > 0 && !h)
    return wo('contour-paint')
  const p = Math.min(u.width, s.width / 2),
    f = Math.min(u.height, s.height / 2)
  if (!(p > 0 && f > 0)) return wo('invalid-bounds')
  const m = a.lightRig,
    $ = a.lightRotation,
    g = 'twoPt' === m && 120 === (null == $ ? void 0 : $.revolution),
    y =
      'threePt' === m
        ? (function (t, e, n) {
            return 'ellipse' !== n && 'donut' !== n
              ? 350
              : 330 + 20 * No(Math.abs(Math.log(t / e)) / Math.log(1.6), 0, 1)
          })(s.width, s.height, c)
        : g
          ? 285
          : 225,
    x = 'threePt' === m ? 50 : g ? 45 : 60,
    v =
      'threePt' === m && 'donut' === c
        ? (function (t, e) {
            const n = t / e
            let i = yo[0],
              r = yo[yo.length - 1]
            for (let l = 1; l < yo.length; l += 1)
              if (n <= yo[l].aspect) {
                ;((i = yo[l - 1]), (r = yo[l]))
                break
              }
            const o = No(
              (Math.log(n) - Math.log(i.aspect)) /
                Math.max(Math.log(r.aspect) - Math.log(i.aspect), 1e-9),
              0,
              1,
            )
            return {
              floor: i.floor + (r.floor - i.floor) * o,
              scale: i.scale + (r.scale - i.scale) * o,
              highlightScale: n > 1.6 ? 1.02 : void 0,
            }
          })(s.width, s.height)
        : void 0,
    b = v ? (l ? xo : s.width / s.height > 1.6 ? 300 : 285) : void 0
  return {
    mode: 'orthographic-top-bevel',
    surface: e.nodeType,
    geometry: c,
    faceColor:
      'shape' === e.nodeType && e.baseFill
        ? Ee(je(e.baseFill, 3500), 102e3)
        : void 0,
    bounds: { width: e.width, height: e.height },
    lightingBounds: s,
    bevel: { preset: 'circle', width: p, height: f },
    contour: h,
    light: {
      rig: m,
      direction: 't',
      rotation: $,
      azimuth: y,
      shadowAzimuth: b,
      highlightScale: null == v ? void 0 : v.highlightScale,
      shadowFloor: l ? vo : null == v ? void 0 : v.floor,
      shadowScale: l ? bo : null == v ? void 0 : v.scale,
      shadowMaterialScale: v && l ? Mo : void 0,
      elevation: x,
      intensity: 'picture' === e.nodeType ? 0.8 : 1.75,
    },
  }
}
function To(t, e, n, i) {
  const r = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
  ;(r.setAttribute('offset', e),
    r.setAttribute('stop-color', n),
    r.setAttribute('stop-opacity', String(i)),
    t.appendChild(r))
}
function zo(t, e, n, i, r) {
  'shape' === e.surface && e.faceColor
    ? To(
        t,
        n,
        '#FFFFFF' === i
          ? Ee(je(e.faceColor, Math.round(4e4 * r)), Math.round(1e5 + 13e4 * r))
          : Be(e.faceColor, Math.round(1e5 * (1 - 0.85 * r))),
        1,
      )
    : To(t, n, i, r)
}
function No(t, e, n) {
  return Math.min(n, Math.max(e, t))
}
async function Ro(t, e) {
  if (null != e && e.aborted) return !1
  const n = document.createElement('img')
  let i = () => {}
  const r = new Promise((t) => {
      if (!e) return
      const n = () => t(!1)
      ;(e.addEventListener('abort', n, { once: !0 }),
        (i = () => e.removeEventListener('abort', n)))
    }),
    o = new Promise((e) => {
      'function' == typeof n.decode
        ? ((n.src = t),
          n.decode().then(
            () => e(!0),
            () => e(!1),
          ))
        : ((n.onload = () => e(!0)), (n.onerror = () => e(!1)), (n.src = t))
    })
  try {
    return e ? await Promise.race([o, r]) : await o
  } finally {
    i()
  }
}
function Io(t, e, n) {
  const i = document.createElementNS('http://www.w3.org/2000/svg', 'image')
  ;((i.dataset.pptxShape3dLighting = 'distance-field'),
    i.setAttribute('x', '0'),
    i.setAttribute('y', '0'),
    i.setAttribute('width', String(n.width)),
    i.setAttribute('height', String(n.height)),
    i.setAttribute('preserveAspectRatio', 'none'),
    i.setAttribute('href', e))
  for (const r of t.querySelectorAll('[data-pptx-shape3d-face]')) r.remove()
  t.appendChild(i)
}
async function Do(t, e, n, i) {
  var r, o, l, s, a
  if ((null != (r = i.signal) && r.aborted) || 'function' != typeof Path2D)
    return
  const d = (function (t, e, n, i) {
    if (
      !Number.isFinite(t) ||
      !Number.isFinite(e) ||
      !Number.isFinite(n) ||
      !Number.isFinite(i) ||
      t <= 0 ||
      e <= 0 ||
      n <= 0 ||
      i < 1
    )
      return 0
    const r = Math.floor(i),
      o = (n) =>
        Math.max(1, Math.ceil(t * n)) * Math.max(1, Math.ceil(e * n)) <= r
    if (o(n)) return n
    let l = 0,
      s = n,
      a = 0
    for (let d = 0; d < 64; d += 1) {
      const t = (l + s) / 2
      o(t) ? ((a = t), (l = t)) : (s = t)
    }
    return a
  })(n.lightingBounds.width, n.lightingBounds.height, 2, 262144)
  if (d < 0.25) return
  const c = Math.max(1, Math.ceil(n.lightingBounds.width * d)),
    u = Math.max(1, Math.ceil(n.lightingBounds.height * d)),
    h = (function (t, e, n, i) {
      return [
        'shape3d-lighting:distance-field-v8',
        e.surface,
        e.geometry,
        `${e.bounds.width}x${e.bounds.height}`,
        `${e.lightingBounds.width}x${e.lightingBounds.height}`,
        `${n}x${i}`,
        `${e.bevel.width}:${e.bevel.height}`,
        `${e.light.rig}:${e.light.azimuth}:${e.light.shadowAzimuth ?? e.light.azimuth}:${e.light.shadowDirectionMix ?? 1}:${e.light.highlightScale ?? 1}:${e.light.shadowFloor ?? 0}:${e.light.shadowScale ?? 1}:${e.light.shadowMaterialScale ?? 1}:${e.light.elevation}:${e.light.intensity}`,
        t,
      ].join('|')
    })(e, n, c, u),
    p = i.mediaUrlCache.get(h)
  if (p)
    return void (
      (await Ro(p, i.signal)) &&
      (null == (o = i.signal) || !o.aborted) &&
      Io(t, p, n.bounds)
    )
  const f = document.createElement('canvas')
  ;((f.width = c), (f.height = u))
  const m = f.getContext('2d', { willReadFrequently: !0 })
  if (!m) return
  ;(m.setTransform(c / n.bounds.width, 0, 0, u / n.bounds.height, 0, 0),
    (m.fillStyle = '#000000'),
    m.fill(new Path2D(e), 'evenodd'))
  const $ = m.getImageData(0, 0, c, u).data,
    g = new Uint8Array(c * u)
  for (let S = 0, C = 3; S < g.length; S += 1, C += 4) g[S] = $[C]
  const y = Math.sqrt(
    (c / n.lightingBounds.width) * (u / n.lightingBounds.height),
  )
  let x = Hr(g, c, u, {
    bandPx: n.bevel.width * y,
    heightPx: n.bevel.height * y,
    lightAzimuthDeg: n.light.azimuth,
    shadowAzimuthDeg: n.light.shadowAzimuth,
    shadowDirectionMix: n.light.shadowDirectionMix,
    highlightScale: n.light.highlightScale,
    shadowFloor: n.light.shadowFloor,
    shadowScale: n.light.shadowScale,
    lightElevationDeg: n.light.elevation,
    intensity: n.light.intensity,
  })
  'shape' === n.surface &&
    n.faceColor &&
    (x = (function (t, e, n) {
      const i = new Uint8Array(768),
        r = new Uint8Array(768)
      for (let l = 1; l <= 255; l += 1) {
        const t = l / 255,
          o = Me(Ee(je(e, Math.round(4e4 * t)), Math.round(1e5 + 13e4 * t))),
          s = Me(Be(e, Math.round(1e5 * (1 - t * n))))
        for (const [e, n] of [
          [i, o],
          [r, s],
        ]) {
          const t = 3 * l
          ;((e[t] = n.r), (e[t + 1] = n.g), (e[t + 2] = n.b))
        }
      }
      const o = new Uint8ClampedArray(t.length)
      for (let l = 0; l < t.length; l += 4) {
        const e = t[l + 3]
        if (0 === e) continue
        const n = t[l] >= 128 ? i : r,
          s = 3 * e
        ;((o[l] = n[s]),
          (o[l + 1] = n[s + 1]),
          (o[l + 2] = n[s + 2]),
          (o[l + 3] = 255))
      }
      return o
    })(
      x,
      n.faceColor,
      (function (t, e, n, i) {
        const r = t / e,
          o = 'donut' === n ? go : $o
        let l = o[0],
          s = o[o.length - 1]
        for (let p = 1; p < o.length; p += 1)
          if (r <= o[p].aspect) {
            ;((l = o[p - 1]), (s = o[p]))
            break
          }
        const a = Math.log(l.aspect),
          d = Math.log(s.aspect),
          c = No((Math.log(r) - a) / Math.max(d - a, 1e-9), 0, 1)
        let u = l.strength + (s.strength - l.strength) * c
        'roundrect' !== n &&
          r > 1.6 &&
          (u +=
            (('donut' === n ? 0.382 : 0.415) - u) *
            No((r - 1.6) / 0.8999999999999999, 0, 1))
        'rect' === n &&
          r < 0.55 &&
          (u += (0.646 - u) * No((0.55 - r) / 0.08125000000000004, 0, 1))
        if ('rect' !== n || Math.abs(r - 1) > 1e-6) return u
        const h = 40 / 3
        return u + (0.7 - u) * No((h - i) / (h - 8), 0, 1)
      })(n.bounds.width, n.bounds.height, n.geometry, n.bevel.width) *
        (n.light.shadowMaterialScale ?? 1),
    ))
  const v = document.createElement('canvas')
  ;((v.width = c), (v.height = u))
  const b = v.getContext('2d')
  if (!b) return
  const M = b.createImageData(c, u)
  ;(M.data.set(x), b.putImageData(M, 0, 0))
  const w = await (function (t) {
    return new Promise((e) => {
      t.toBlob((t) => e(t ?? void 0), 'image/png')
    })
  })(v)
  if (!w || (null != (l = i.signal) && l.aborted)) return
  const k = i.mediaUrlCache.get(h),
    A = k ?? URL.createObjectURL(w),
    L = !k
  ;(L && i.mediaUrlCache.set(h, A),
    (await Ro(A, i.signal))
      ? (null != (a = i.signal) && a.aborted) || Io(t, A, n.bounds)
      : L &&
        i.mediaUrlCache.get(h) === A &&
        (null == (s = i.signal) || !s.aborted) &&
        (i.mediaUrlCache.delete(h), URL.revokeObjectURL(A)))
}
function Oo(t, e, n, i) {
  if (!n) return
  const r = 'http://www.w3.org/2000/svg',
    o = ++mo,
    l = document.createElementNS(r, 'g')
  ;((l.dataset.pptxShape3dCamera = i.camera.preset),
    (l.dataset.pptxShape3dCameraGeometry = i.geometry),
    i.frontMaterial && (l.dataset.pptxShape3dFrontMaterial = i.frontMaterial),
    l.setAttribute('pointer-events', 'none'))
  const s = document.createElementNS(r, 'path')
  if ('custom' === i.geometry) {
    const t = (function (t, e, n, i, r = 0.25) {
      if (!Number.isFinite(r) || r <= 0 || !/^[MLCZ0-9eE+.,\-\s]+$/.test(t))
        return
      const o = _r(e, n, i),
        l = Tr(t)
      if (!o || !l || 0 === l.length || l.length > 16384) return
      const s = [],
        a = { value: 0 }
      let d,
        c = 0,
        u = !1,
        h = 0
      const p = () => {
        if (c + 1 >= l.length) return
        const t = { x: Number(l[c]), y: Number(l[c + 1]) }
        return (
          (c += 2),
          !qr(t) || t.x < 0 || t.x > e || t.y < 0 || t.y > n ? void 0 : t
        )
      }
      for (; c < l.length;) {
        const t = l[c++]
        if ('M' === t) {
          if (u) return
          const t = p(),
            e = t && Qr(o, t)
          if (!t || !e) return
          ;(s.push(`M${Jr(e)}`), (d = t), (u = !0), (h += 1), (a.value += 1))
        } else if ('L' === t) {
          if (!u || !d) return
          const t = p(),
            e = t && Qr(o, t)
          if (!t || !e) return
          ;(s.push(`L${Jr(e)}`), (d = t), (a.value += 1))
        } else if ('C' === t) {
          if (!u || !d) return
          const t = p(),
            e = p(),
            n = p()
          if (!(t && e && n && no(s, o, [d, t, e, n], r, a))) return
          d = n
        } else {
          if ('Z' !== t) return
          if (!u) return
          ;(s.push('Z'), (d = void 0), (u = !1))
        }
        if (a.value > 8192) return
      }
      return h > 0 && !u ? s.join(' ') : void 0
    })(n.getAttribute('d') ?? '', i.bounds.width, i.bounds.height, i.corners)
    if (!t) return
    ;((s.dataset.pptxShape3dProjectedCustomPlane = i.camera.kind),
      s.setAttribute('d', t),
      s.setAttribute('fill-rule', n.getAttribute('fill-rule') ?? 'evenodd'))
  } else
    ((s.dataset.pptxShape3dProjectedPlane = i.camera.kind),
      s.setAttribute(
        'd',
        (function (t) {
          return `${t.map((t, e) => `${0 === e ? 'M' : 'L'}${t.x},${t.y}`).join(' ')} Z`
        })(i.corners),
      ))
  if ((s.setAttribute('stroke', 'none'), i.fill.top === i.fill.bottom))
    s.setAttribute('fill', i.fill.top)
  else {
    const t = `shape3d-camera-gradient-${o}`,
      n = document.createElementNS(r, 'linearGradient')
    ;((n.id = t),
      (n.dataset.pptxShape3dCameraGradient = i.camera.preset),
      n.setAttribute('gradientUnits', 'userSpaceOnUse'),
      n.setAttribute('color-interpolation', 'linearRGB'))
    const l = i.corners.map((t) => t.y)
    ;(n.setAttribute('x1', String(i.bounds.width / 2)),
      n.setAttribute('x2', String(i.bounds.width / 2)),
      n.setAttribute('y1', String(Math.min(...l))),
      n.setAttribute('y2', String(Math.max(...l))),
      To(n, '0%', i.fill.top, 1),
      i.fill.middle && To(n, '50%', i.fill.middle, 1),
      To(n, '100%', i.fill.bottom, 1),
      e.appendChild(n),
      s.setAttribute('fill', `url(#${t})`))
  }
  return (
    l.appendChild(s),
    t.appendChild(l),
    n.setAttribute('visibility', 'hidden'),
    e.children.length > 0 && !e.parentNode && t.insertBefore(e, t.firstChild),
    { group: l }
  )
}
function Uo(t) {
  const {
    svg: e,
    defs: n,
    basePath: i,
    pathD: r,
    bounds: o,
    plan: l,
    ctx: s,
  } = t
  if ('camera-projected-plane' === l.mode) return Oo(e, n, i, l)
  if (
    'orthographic-top-bevel' !== l.mode ||
    !r ||
    !Number.isFinite(o.width) ||
    !Number.isFinite(o.height) ||
    o.width <= 0 ||
    o.height <= 0
  )
    return
  const a = 'http://www.w3.org/2000/svg',
    d = ++mo,
    c = `shape3d-clip-${d}`,
    u = document.createElementNS(a, 'clipPath')
  ;((u.id = c), u.setAttribute('clipPathUnits', 'userSpaceOnUse'))
  const h = document.createElementNS(a, 'path')
  ;(h.setAttribute('d', r),
    h.setAttribute('fill-rule', 'evenodd'),
    u.appendChild(h),
    n.appendChild(u))
  const p = document.createElementNS(a, 'g')
  if (
    ((p.dataset.pptxShape3dBevel = 'orthographic-top-bevel'),
    p.setAttribute('clip-path', `url(#${c})`),
    p.setAttribute('pointer-events', 'none'),
    'shape' === l.surface && l.faceColor)
  ) {
    const t = document.createElementNS(a, 'path')
    ;(t.setAttribute('d', r),
      t.setAttribute('fill', l.faceColor),
      t.setAttribute('fill-rule', 'evenodd'),
      t.setAttribute('stroke', 'none'),
      (t.dataset.pptxShape3dSurface = 'sheen'),
      p.appendChild(t))
  }
  const f = Math.min(l.bevel.width, o.width / 2, o.height / 2),
    m =
      No(Math.sqrt(l.bevel.height / f), 0.65, 1.25) *
      ('picture' === l.surface ? 0.9 : 1) *
      ('threePt' === l.light.rig ? 1 : 0.9)
  for (const $ of (function (t, e) {
    const { width: n, height: i } = t
    return [
      {
        face: 'top',
        gradient: { x1: 0, y1: 0, x2: 0, y2: e },
        points: [
          [0, 0],
          [n, 0],
          [n - e, e],
          [e, e],
        ],
        stops: [
          ['0%', '#000000', 0.28],
          ['18%', '#000000', 0.08],
          ['35%', '#FFFFFF', 0.28],
          ['58%', '#FFFFFF', 0.58],
          ['82%', '#FFFFFF', 0.18],
          ['100%', '#FFFFFF', 0],
        ],
      },
      {
        face: 'right',
        gradient: { x1: n, y1: 0, x2: n - e, y2: 0 },
        points: [
          [n, 0],
          [n, i],
          [n - e, i - e],
          [n - e, e],
        ],
        stops: [
          ['0%', '#000000', 0.9],
          ['55%', '#000000', 0.62],
          ['100%', '#000000', 0],
        ],
      },
      {
        face: 'bottom',
        gradient: { x1: 0, y1: i, x2: 0, y2: i - e },
        points: [
          [n, i],
          [0, i],
          [e, i - e],
          [n - e, i - e],
        ],
        stops: [
          ['0%', '#000000', 0.8],
          ['52%', '#000000', 0.55],
          ['100%', '#000000', 0],
        ],
      },
      {
        face: 'left',
        gradient: { x1: 0, y1: 0, x2: e, y2: 0 },
        points: [
          [0, i],
          [0, 0],
          [e, e],
          [e, i - e],
        ],
        stops: [
          ['0%', '#000000', 0.48],
          ['45%', '#000000', 0.16],
          ['65%', '#FFFFFF', 0.1],
          ['100%', '#FFFFFF', 0],
        ],
      },
    ]
  })(o, f)) {
    const t = `${d}-${$.face}`,
      e = `shape3d-gradient-${t}`,
      i = `shape3d-face-clip-${t}`,
      o = document.createElementNS(a, 'linearGradient')
    ;((o.id = e),
      (o.dataset.pptxShape3dFaceGradient = $.face),
      o.setAttribute('gradientUnits', 'userSpaceOnUse'),
      o.setAttribute('color-interpolation', 'linearRGB'))
    for (const [n, r] of Object.entries($.gradient))
      o.setAttribute(n, String(r))
    for (const [n, r, a] of $.stops) zo(o, l, n, r, No(a * m, 0, 1))
    n.appendChild(o)
    const s = document.createElementNS(a, 'clipPath')
    ;((s.id = i), s.setAttribute('clipPathUnits', 'userSpaceOnUse'))
    const c = document.createElementNS(a, 'polygon')
    ;(c.setAttribute('points', $.points.map(([t, e]) => `${t},${e}`).join(' ')),
      s.appendChild(c),
      n.appendChild(s))
    const u = document.createElementNS(a, 'path')
    ;((u.dataset.pptxShape3dFace = $.face),
      u.setAttribute('d', r),
      u.setAttribute('fill', 'none'),
      u.setAttribute('stroke', `url(#${e})`),
      u.setAttribute('stroke-width', String(2 * f)),
      u.setAttribute(
        'stroke-linejoin',
        'roundrect' === l.geometry ? 'round' : 'miter',
      ),
      u.setAttribute('clip-path', `url(#${i})`),
      p.appendChild(u))
  }
  if ((e.appendChild(p), l.contour)) {
    const t = document.createElementNS(a, 'path')
    ;((t.dataset.pptxShape3dContour = 'true'),
      t.setAttribute('d', r),
      t.setAttribute('fill', 'none'),
      t.setAttribute('stroke', l.contour.color),
      t.setAttribute('stroke-opacity', String(l.contour.alpha)),
      t.setAttribute('stroke-width', String(l.contour.width)),
      t.setAttribute('stroke-linejoin', 'round'),
      t.setAttribute('pointer-events', 'none'),
      e.appendChild(t))
  }
  return (
    s &&
      (function (t, e, n, i) {
        const r = () => Do(t, e, n, i).catch(() => {}),
          o = i.asyncTasks
        if (!o) return void r()
        const l = fo.get(o),
          s = l ? l.then(r, r) : r()
        ;(fo.set(o, s), o.push(s))
      })(p, r, l, s),
    n.parentNode || e.insertBefore(n, e.firstChild),
    { group: p, clipId: c }
  )
}
function Zo(t) {
  for (const e of t.paragraphs)
    for (const t of e.runs)
      if (null != t.text && t.text.trim().length > 0) return !0
  return !1
}
function Go(t) {
  let e = 0
  for (const n of t.paragraphs)
    if (
      n.runs.some((t) => null != t.text && t.text.length > 0) &&
      (e++, e > 1 || n.runs.some((t) => '\n' === t.text))
    )
      return !1
  return 1 === e
}
function Xo(t) {
  const e = t.paragraphs
    .flatMap((t) => t.runs.map((t) => t.text ?? ''))
    .join('')
    .replace(/\s+/g, '')
  return Array.from(e).length
}
function Yo(t) {
  const e = Xo(t)
  return e > 0 && e <= 36
}
function Wo(t) {
  return t.paragraphs.filter((t) =>
    t.runs.some((t) => null != t.text && t.text.length > 0),
  ).length
}
function Ho(t) {
  return t.paragraphs.some(
    (e) =>
      e.runs.some((t) => null != t.text && t.text.length > 0) &&
      (function (t, e) {
        var n, i
        const r = [
          e.properties,
          null == (n = t.listStyle) ? void 0 : n.child(`lvl${e.level + 1}pPr`),
          null == (i = t.listStyle) ? void 0 : i.child('defPPr'),
        ]
        for (const o of r)
          if (null != o && o.exists()) {
            if (o.child('buNone').exists()) return !1
            if (
              o.child('buChar').exists() ||
              o.child('buAutoNum').exists() ||
              o.child('buBlip').exists()
            )
              return !0
          }
        return !1
      })(t, e),
  )
}
var Vo = new Set(lr.map((t) => t.toLowerCase()))
function qo(t) {
  var e, n
  if (null == t || !t.exists()) return
  for (const f of ['avLst', 'gdLst', 'ahLst', 'cxnLst']) {
    const e = t.child(f)
    if (!e.exists() || e.allChildren().length > 0) return
  }
  const i = t.child('rect')
  if (
    !i.exists() ||
    4 !== (null == (e = i.element) ? void 0 : e.attributes.length) ||
    'l' !== i.attr('l') ||
    't' !== i.attr('t') ||
    'r' !== i.attr('r') ||
    'b' !== i.attr('b')
  )
    return
  const r = t.child('pathLst').children('path')
  if (1 !== r.length) return
  const o = r[0],
    l = o.numAttr('w'),
    s = o.numAttr('h')
  if (
    1e3 !== l ||
    1e3 !== s ||
    2 !== (null == (n = o.element) ? void 0 : n.attributes.length) ||
    void 0 !== o.attr('fill') ||
    void 0 !== o.attr('stroke')
  )
    return
  const a = o.allChildren(),
    d = new Set(['moveTo', 'lnTo', 'cubicBezTo', 'close'])
  let c = 0,
    u = 0,
    h = 0,
    p = !1
  for (const f of a) {
    if (!d.has(f.localName)) return
    if ('close' === f.localName) {
      if (!p || f.allChildren().length > 0) return
      ;((p = !1), (u += 1))
      continue
    }
    if ('moveTo' === f.localName) {
      if (p) return
      p = !0
    } else if (!p) return
    const t = f.children('pt'),
      e = 'cubicBezTo' === f.localName ? 3 : 1
    if (
      t.length !== e ||
      f.allChildren().length !== e ||
      t.some((t) => {
        const e = t.attr('x'),
          n = t.attr('y'),
          i = Number(e),
          r = Number(n)
        return (
          void 0 === e ||
          void 0 === n ||
          !Number.isFinite(i) ||
          !Number.isFinite(r) ||
          i < 0 ||
          i > 1e3 ||
          r < 0 ||
          r > 1e3
        )
      })
    )
      return
    ;('moveTo' === f.localName && (c += 1),
      'cubicBezTo' === f.localName && (h += 1))
  }
  return !p && c >= 2 && u === c && h >= 1 ? 'multi-contour-cubic' : void 0
}
function _o(t, e) {
  t.style.transform = `${t.style.transform || ''} ${e}`.trim()
}
function Qo(t, e) {
  const n = t.style.filter.trim()
  t.style.filter = n ? `${n} ${e}` : e
}
function Ko(t) {
  return Number.isInteger(t) ? String(t) : String(Number(t.toFixed(6)))
}
function Jo(t, e, n) {
  const i = (function (t, e) {
    const n = H(t.numAttr('rad') ?? 0)
    if (!(n > 0)) return
    const { color: i, alpha: r } = en(t, e)
    if (!i || r <= 0) return
    const { r: o, g: l, b: s } = Me(i.startsWith('#') ? i : `#${i}`)
    return `drop-shadow(0px 0px ${n.toFixed(1)}px rgba(${o},${l},${s},${r.toFixed(3)}))`
  })(e, n)
  i && Qo(t, i)
}
function tl(t, e) {
  return Ln(t, e)
}
function el(t, e, n = !1, i = 'vertical-rl') {
  ;((t.style.writingMode = i),
    (t.style.justifyContent = 'center'),
    (t.style.alignItems =
      'b' === e ? 'flex-end' : 'ctr' === e ? 'center' : 'flex-start'),
    n &&
      ((t.style.textOrientation = 'upright'), (t.style.whiteSpace = 'normal')))
}
function nl(t, e) {
  if (!t.textBody) return null
  const n = (function (t) {
    var e
    const n = null == (e = t.bodyProperties) ? void 0 : e.child('prstTxWarp'),
      i = null == n ? void 0 : n.attr('prst')
    return 'textArchDown' === i || 'textArchUp' === i ? i : null
  })(t.textBody)
  if (!n) return null
  const i = (function (t) {
    let e = '',
      n = 0
    for (const i of t.paragraphs) {
      const t = i.runs.filter((t) => null != t.text && t.text.length > 0)
      if (0 !== t.length) {
        if ((n++, n > 1 || t.some((t) => '\n' === t.text))) return null
        e += t.map((t) => t.text).join('')
      }
    }
    return e.length > 0 ? e : null
  })(t.textBody)
  if (!i) return null
  const r = (function (t) {
      for (const e of t.paragraphs)
        for (const t of e.runs)
          if (null != t.text && t.text.length > 0) return t.properties
    })(t.textBody),
    o =
      void 0 !== (null == r ? void 0 : r.numAttr('sz'))
        ? r.numAttr('sz') / 100
        : 12,
    l = ii(
      [
        null == r ? void 0 : r.child('latin').attr('typeface'),
        null == r ? void 0 : r.child('ea').attr('typeface'),
        null == r ? void 0 : r.child('cs').attr('typeface'),
      ],
      e,
      [
        null == r ? void 0 : r.attr('lang'),
        null == r ? void 0 : r.attr('altLang'),
      ],
    ),
    s = nt(null == r ? void 0 : r.attr('b')) ? 'bold' : void 0,
    a = null == r ? void 0 : r.child('solidFill'),
    d = null != a && a.exists() ? rn(a, e) : '#000000',
    c = 'http://www.w3.org/2000/svg',
    u = document.createElementNS(c, 'svg')
  ;(u.setAttribute('viewBox', `0 0 ${t.size.w} ${t.size.h}`),
    u.setAttribute('width', String(t.size.w)),
    u.setAttribute('height', String(t.size.h)),
    (u.style.position = 'absolute'),
    (u.style.left = '0'),
    (u.style.top = '0'),
    (u.style.overflow = 'visible'))
  const h = document.createElementNS(c, 'defs'),
    p = document.createElementNS(c, 'path'),
    f = 'text-warp-' + ++ll
  ;(p.setAttribute('id', f),
    p.setAttribute(
      'd',
      (function (t, e, n) {
        const i = Math.min(Math.max(0.04 * e, 4), 18),
          r = i,
          o = Math.max(r, e - i)
        if ('textArchDown' === t) {
          const t = 0.36 * n
          return `M${r},${t} Q${e / 2},${0.9 * n} ${o},${t}`
        }
        const l = 0.66 * n
        return `M${r},${l} Q${e / 2},${0.08 * n} ${o},${l}`
      })(n, t.size.w, t.size.h),
    ),
    p.setAttribute('fill', 'none'),
    h.appendChild(p),
    u.appendChild(h))
  const m = document.createElementNS(c, 'text')
  ;(m.setAttribute('font-size', `${o}pt`),
    l.length > 0 && m.setAttribute('font-family', ui(l)),
    s && m.setAttribute('font-weight', s),
    m.setAttribute('fill', d),
    m.setAttribute('dominant-baseline', 'middle'))
  const $ = document.createElementNS(c, 'textPath')
  return (
    $.setAttribute('href', `#${f}`),
    $.setAttribute('startOffset', '50%'),
    $.setAttribute('text-anchor', 'middle'),
    $.setAttribute('xml:space', 'preserve'),
    ($.textContent = i),
    m.appendChild($),
    u.appendChild(m),
    u
  )
}
function il(t, e) {
  return (t.numAttr(e) ?? 0) / 1e3
}
function rl(t, e, n, i, r, o, l, s) {
  const a = 'shape-clip-' + ++ll,
    d = document.createElementNS(t, 'clipPath')
  d.setAttribute('id', a)
  const c = document.createElementNS(t, 'path')
  ;(c.setAttribute('d', r), d.appendChild(c), n.appendChild(d))
  const u = document.createElementNS(t, 'image'),
    h = (function (t, e) {
      const n = t.child('stretch')
      if (!n.exists())
        return {
          x: 0,
          y: 0,
          w: e.w,
          h: e.h,
          preserveAspectRatio: 'xMidYMid slice',
        }
      const i = n.child('fillRect'),
        r = i.exists() ? il(i, 'l') : 0,
        o = i.exists() ? il(i, 't') : 0,
        l = i.exists() ? il(i, 'r') : 0,
        s = i.exists() ? il(i, 'b') : 0
      return {
        x: e.w * (r / 100),
        y: e.h * (o / 100),
        w: e.w * ((100 - r - l) / 100),
        h: e.h * ((100 - o - s) / 100),
        preserveAspectRatio: 'none',
      }
    })(i, o)
  ;(u.setAttributeNS('http://www.w3.org/1999/xlink', 'href', l),
    u.setAttribute('x', String(h.x)),
    u.setAttribute('y', String(h.y)),
    u.setAttribute('width', String(h.w)),
    u.setAttribute('height', String(h.h)),
    u.setAttribute('clip-path', `url(#${a})`),
    u.setAttribute('preserveAspectRatio', h.preserveAspectRatio),
    n.parentNode || e.appendChild(n),
    (null == s ? void 0 : s.parentNode) === e
      ? e.insertBefore(u, s)
      : e.appendChild(u))
}
var ol = 0,
  ll = 0,
  sl = 1 / 3,
  al = new Set([50800, 76200, 101600, 115455, 127e3, 317500]),
  dl = new Set([0, 38100, 46182, 50800, 76200, 127e3]),
  cl = new Set([0, 27e5, 54e5, 81e5]),
  ul = new Set([92e3, 1e5, 102e3]),
  hl = new Set(['b', 'ctr', 'tr'])
function pl(t, e, n, i, r) {
  const o = 'shape-shadow-' + ++ll,
    l = document.createElementNS(t, 'filter'),
    s = Math.max(Math.abs(r.dx), Math.abs(r.dy)) + 4 * r.blur + 4,
    a = i.x ?? 0,
    d = i.y ?? 0
  ;(l.setAttribute('id', o),
    l.setAttribute('filterUnits', 'userSpaceOnUse'),
    r.colorInterpolation &&
      l.setAttribute('color-interpolation-filters', r.colorInterpolation),
    l.setAttribute('x', String(a - s)),
    l.setAttribute('y', String(d - s)),
    l.setAttribute('width', String(i.w + 2 * s)),
    l.setAttribute('height', String(i.h + 2 * s)))
  const c = document.createElementNS(t, 'feDropShadow')
  ;(c.setAttribute('dx', r.dx.toFixed(1)),
    c.setAttribute('dy', r.dy.toFixed(1)),
    c.setAttribute(
      'stdDeviation',
      Math.max(0, r.blur * (r.stdDeviationScale ?? 0.5)).toFixed(2),
    ),
    c.setAttribute(
      'flood-color',
      `rgb(${r.color.r},${r.color.g},${r.color.b})`,
    ),
    c.setAttribute('flood-opacity', r.opacity.toFixed(4)),
    l.appendChild(c),
    e.appendChild(l),
    !e.parentNode &&
      n.ownerSVGElement &&
      n.ownerSVGElement.insertBefore(e, n.ownerSVGElement.firstChild),
    n.setAttribute('filter', `url(#${o})`))
}
function fl(t) {
  const e = null == t ? void 0 : t.toLowerCase()
  return 'tl' === e ||
    't' === e ||
    'tr' === e ||
    'l' === e ||
    'ctr' === e ||
    'r' === e ||
    'bl' === e ||
    'b' === e ||
    'br' === e
    ? e
    : 'b'
}
function ml(t) {
  return /^#[0-9a-f]{6}$/i.test(t)
}
function $l(t, e) {
  const n = Math.max(e, 1)
  switch (t) {
    case 'dot':
    case 'sysDot':
      return `${n},${2 * n}`
    case 'dash':
    case 'sysDash':
      return `${4 * n},${2 * n}`
    case 'lgDash':
      return `${8 * n},${3 * n}`
    case 'dashDot':
    case 'sysDashDot':
      return `${4 * n},${2 * n},${n},${2 * n}`
    case 'lgDashDot':
      return `${8 * n},${3 * n},${n},${3 * n}`
    case 'lgDashDotDot':
    case 'sysDashDotDot':
      return `${8 * n},${3 * n},${n},${2 * n},${n},${2 * n}`
    default:
      return null
  }
}
function gl(t) {
  if (!t) return null
  const e = t.trim()
  if (e.startsWith('#')) return Me(e)
  const n = e.match(/rgba?\(([^)]+)\)/i)
  if (!n) return null
  const i = n[1].split(',').map((t) => Number.parseFloat(t.trim()))
  return i.length < 3 || i.some((t) => Number.isNaN(t))
    ? null
    : {
        r: Math.max(0, Math.min(255, i[0])),
        g: Math.max(0, Math.min(255, i[1])),
        b: Math.max(0, Math.min(255, i[2])),
      }
}
function yl(t, e, n) {
  const i = Math.max(0, Math.min(1, n))
  return we(t.r + (e.r - t.r) * i, t.g + (e.g - t.g) * i, t.b + (e.b - t.b) * i)
}
function xl(t) {
  const e = (t * Math.PI) / 180,
    n = Math.round(50 + 50 * Math.cos(e)),
    i = Math.round(50 + 50 * Math.sin(e))
  return {
    x1: `${Math.round(50 - 50 * Math.cos(e))}%`,
    y1: `${Math.round(50 - 50 * Math.sin(e))}%`,
    x2: `${n}%`,
    y2: `${i}%`,
  }
}
function vl(t, e, n, i, r) {
  const o = 'grad-stroke-' + ++ll,
    l = document.createElementNS(t, 'linearGradient')
  if (
    (l.setAttribute('id', o),
    l.setAttribute('color-interpolation', n.colorInterpolation ?? 'linearRGB'),
    l.setAttribute('gradientUnits', 'userSpaceOnUse'),
    r || i.w <= 1 || i.h <= 1)
  ) {
    const t = (n.angle * Math.PI) / 180,
      e = Math.cos(t),
      r = Math.sin(t),
      o = i.w / 2,
      s = i.h / 2,
      a = Math.max(i.w, i.h) / 2
    ;(l.setAttribute('x1', String(o - a * e)),
      l.setAttribute('y1', String(s - a * r)),
      l.setAttribute('x2', String(o + a * e)),
      l.setAttribute('y2', String(s + a * r)))
  } else {
    const t = xl(n.angle)
    ;(l.setAttribute('x1', String((parseFloat(t.x1) / 100) * i.w)),
      l.setAttribute('y1', String((parseFloat(t.y1) / 100) * i.h)),
      l.setAttribute('x2', String((parseFloat(t.x2) / 100) * i.w)),
      l.setAttribute('y2', String((parseFloat(t.y2) / 100) * i.h)))
  }
  for (const s of n.stops) {
    const e = document.createElementNS(t, 'stop')
    ;(e.setAttribute('offset', `${s.position}%`),
      e.setAttribute('stop-color', s.color),
      l.appendChild(e))
  }
  return (
    e.appendChild(l),
    {
      paint: `url(#${o})`,
      width: r || i.w <= 1 || i.h <= 1 ? Math.max(n.width, 1) : n.width,
    }
  )
}
function bl(t, e, n, i, r, o, l) {
  ;(t.setAttribute('stroke', e),
    t.setAttribute('stroke-width', String(n)),
    o && t.setAttribute('stroke-linecap', o),
    l && t.setAttribute('stroke-linejoin', l))
  const s = $l(i, n)
  s
    ? t.setAttribute('stroke-dasharray', s)
    : 'dashed' === r
      ? t.setAttribute('stroke-dasharray', `${4 * n},${2 * n}`)
      : 'dotted' === r && t.setAttribute('stroke-dasharray', `${n},${2 * n}`)
}
function Ml(t) {
  switch (t) {
    case 'sm':
      return 0.5
    case 'lg':
      return 1.5
    default:
      return 1
  }
}
function wl(t, e) {
  const n = Ml(t.w),
    i = Ml(t.len)
  return {
    markerW: Math.max(3 * e, 10) * i,
    markerH: Math.max(2.5 * e, 7.5) * n,
  }
}
function kl(t) {
  if (!t) return !0
  const e = t.trim().toLowerCase()
  if ('transparent' === e) return !0
  const n = e.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\)$/)
  return !!n && Number(n[1]) <= 0.001
}
function Al(t, e, n) {
  var i, r
  if (0 === t.length) return n
  const o = 'start' === e ? 0 : t.length - 1,
    l = 'start' === e ? 1 : -1,
    s = null == (i = t[o]) ? void 0 : i.color
  if (s && !kl(s)) return s
  for (let a = o; a >= 0 && a < t.length; a += l) {
    const e = null == (r = t[a]) ? void 0 : r.color
    if (e && !kl(e)) return e
  }
  return s || n
}
function Ll(t, e, n) {
  return { x: t.x + (e.x - t.x) * n, y: t.y + (e.y - t.y) * n }
}
function Sl(t, e, n, i, r) {
  const o = Ll(t, e, r),
    l = Ll(e, n, r),
    s = Ll(n, i, r)
  return Ll(Ll(o, l, r), Ll(l, s, r), r)
}
function Cl(t, e, n, i, r) {
  let o = 0,
    l = t
  for (let s = 1; s <= 24; s++) {
    const a = Sl(t, e, n, i, (r * s) / 24)
    ;((o += Math.hypot(a.x - l.x, a.y - l.y)), (l = a))
  }
  return o
}
function Fl(t) {
  return (function (t) {
    const e = Tr(t)
    if (!e || e.length < 8 || 'M' !== e[0]) return null
    const n = Nr(e, 1)
    if (!n) return null
    const i = []
    let r = 3
    for (; r < e.length;) {
      if ('C' !== e[r++]) return null
      const t = Nr(e, r),
        n = Nr(e, r + 2),
        o = Nr(e, r + 4)
      if (!t || !n || !o) return null
      ;(i.push({ c1: t, c2: n, end: o }), (r += 6))
    }
    return i.length > 0 ? { start: n, segments: i } : null
  })(t)
}
function Bl(t, e) {
  const n = [`M${Ko(t.x)},${Ko(t.y)}`]
  for (const i of e)
    n.push(
      [
        `C${Ko(i.c1.x)},${Ko(i.c1.y)}`,
        `${Ko(i.c2.x)},${Ko(i.c2.y)}`,
        `${Ko(i.end.x)},${Ko(i.end.y)}`,
      ].join(' '),
    )
  return n.join(' ')
}
function jl(t) {
  return (function (t) {
    const e = Tr(t)
    if (!e || 11 !== e.length || 'M' !== e[0] || 'A' !== e[3]) return null
    const n = Nr(e, 1),
      i = Number(e[4]),
      r = Number(e[5]),
      o = Number(e[6]),
      l = Number(e[7]) ? 1 : 0,
      s = Number(e[8]) ? 1 : 0,
      a = Nr(e, 9)
    return n &&
      a &&
      Number.isFinite(i) &&
      Number.isFinite(r) &&
      Number.isFinite(o)
      ? {
          start: n,
          arc: {
            rx: i,
            ry: r,
            xAxisRotation: o,
            largeArc: l,
            sweep: s,
            end: a,
          },
        }
      : null
  })(t)
}
function El(t, e) {
  if (0 !== e.xAxisRotation) return null
  let n = Math.abs(e.rx),
    i = Math.abs(e.ry)
  if (!(n > 0 && i > 0)) return null
  const r = (t.x - e.end.x) / 2,
    o = (t.y - e.end.y) / 2,
    l = (r * r) / (n * n) + (o * o) / (i * i)
  if (l > 1) {
    const t = Math.sqrt(l)
    ;((n *= t), (i *= t))
  }
  const s = n * n,
    a = i * i,
    d = r * r,
    c = o * o,
    u = s * c + a * d
  if (!(u > 0)) return null
  const h =
      (e.largeArc === e.sweep ? -1 : 1) *
      Math.sqrt(Math.max(0, (s * a - s * c - a * d) / u)),
    p = (h * n * o) / i,
    f = (-h * i * r) / n,
    m = { x: (t.x + e.end.x) / 2 + p, y: (t.y + e.end.y) / 2 + f },
    $ = (r - p) / n,
    g = (o - f) / i,
    y = (-r - p) / n,
    x = (-o - f) / i,
    v = Math.atan2(g, $)
  let b = (function (t, e, n, i) {
    const r = t * n + e * i,
      o = Math.hypot(t, e) * Math.hypot(n, i),
      l = Math.acos(Math.min(1, Math.max(-1, o > 0 ? r / o : 1)))
    return t * i - e * n < 0 ? -l : l
  })($, g, y, x)
  return (
    0 === e.sweep && b > 0 && (b -= 2 * Math.PI),
    1 === e.sweep && b < 0 && (b += 2 * Math.PI),
    {
      center: m,
      rx: n,
      ry: i,
      startAngle: v,
      deltaAngle: b,
      xAxisRotation: e.xAxisRotation,
      sweep: e.sweep,
    }
  )
}
function Pl(t, e) {
  const n = t.startAngle + t.deltaAngle * e
  return {
    x: t.center.x + t.rx * Math.cos(n),
    y: t.center.y + t.ry * Math.sin(n),
  }
}
function Tl(t, e) {
  let n = 0,
    i = Pl(t, 0)
  for (let r = 1; r <= 24; r++) {
    const o = Pl(t, (e * r) / 24)
    ;((n += Math.hypot(o.x - i.x, o.y - i.y)), (i = o))
  }
  return n
}
function zl(t, e, n, i) {
  const r = Math.abs(e.deltaAngle * n) > Math.PI ? 1 : 0
  return [
    `M${Ko(t.x)},${Ko(t.y)}`,
    `A${Ko(e.rx)},${Ko(e.ry)}`,
    Ko(e.xAxisRotation),
    `${r},${e.sweep}`,
    `${Ko(i.x)},${Ko(i.y)}`,
  ].join(' ')
}
function Nl(t, e) {
  if (!(e > 0)) return t
  const n = zr(t)
  if (!n)
    return (
      (function (t, e) {
        const n = Il(t)
        if (!n || n.length < 3) return null
        const i = n[0],
          r = n[1],
          o = r.x - i.x,
          l = r.y - i.y,
          s = Math.hypot(o, l)
        return s > e
          ? Dl([{ x: i.x + (o / s) * e, y: i.y + (l / s) * e }, ...n.slice(1)])
          : null
      })(t, e) ??
      (function (t, e) {
        const n = jl(t)
        if (!n) return null
        const i = El(n.start, n.arc)
        if (!i) return null
        const r = Tl(i, 1)
        if (!(r > 0)) return null
        const o = Math.min(e, 0.95 * r)
        let l = 0,
          s = 1
        for (let d = 0; d < 24; d++) {
          const t = (l + s) / 2
          Tl(i, t) < o ? (l = t) : (s = t)
        }
        const a = s
        return zl(Pl(i, a), i, 1 - a, n.arc.end)
      })(t, e) ??
      (function (t, e) {
        const n = Fl(t)
        if (!n) return t
        const i = n.start,
          r = n.segments[0],
          o = r.c1,
          l = r.c2,
          s = r.end,
          a = Cl(i, o, l, s, 1)
        if (!(a > 0)) return t
        const d = Math.min(e, 0.95 * a)
        let c = 0,
          u = 1
        for (let v = 0; v < 24; v++) {
          const t = (c + u) / 2
          Cl(i, o, l, s, t) < d ? (c = t) : (u = t)
        }
        const h = u,
          p = Ll(i, o, h),
          f = Ll(o, l, h),
          m = Ll(l, s, h),
          $ = Ll(p, f, h),
          g = Ll(f, m, h),
          y = Ll($, g, h),
          x = n.segments.slice()
        return ((x[0] = { c1: g, c2: m, end: s }), Bl(y, x))
      })(t, e)
    )
  const i = n.start.x,
    r = n.start.y,
    o = n.end.x,
    l = n.end.y,
    s = o - i,
    a = l - r,
    d = Math.hypot(s, a)
  if (!(d > 0)) return t
  const c = Math.min(e, 0.95 * d)
  return `M${i + (s / d) * c},${r + (a / d) * c} L${o},${l}`
}
function Rl(t, e) {
  if (!(e > 0)) return t
  const n = zr(t)
  if (!n)
    return (
      (function (t, e) {
        const n = Il(t)
        if (!n || n.length < 3) return null
        const i = n[n.length - 1],
          r = n[n.length - 2],
          o = i.x - r.x,
          l = i.y - r.y,
          s = Math.hypot(o, l)
        if (!(s > e)) return null
        const a = { x: i.x - (o / s) * e, y: i.y - (l / s) * e }
        return Dl([...n.slice(0, -1), a])
      })(t, e) ??
      (function (t, e) {
        const n = Fl(t)
        if (!n) return null
        const i = n.segments.length - 1,
          r = 0 === i ? n.start : n.segments[i - 1].end,
          o = n.segments[i],
          l = Cl(r, o.c1, o.c2, o.end, 1)
        if (!(l > 0)) return null
        const s = l - Math.min(e, 0.95 * l)
        let a = 0,
          d = 1
        for (let g = 0; g < 24; g++) {
          const t = (a + d) / 2
          Cl(r, o.c1, o.c2, o.end, t) < s ? (a = t) : (d = t)
        }
        const c = d,
          u = Ll(r, o.c1, c),
          h = Ll(o.c1, o.c2, c),
          p = Ll(o.c2, o.end, c),
          f = Ll(u, h, c),
          m = Ll(f, Ll(h, p, c), c),
          $ = n.segments.slice()
        return (($[i] = { c1: u, c2: f, end: m }), Bl(n.start, $))
      })(t, e) ??
      (function (t, e) {
        const n = jl(t)
        if (!n) return null
        const i = El(n.start, n.arc)
        if (!i) return null
        const r = Tl(i, 1)
        if (!(r > 0)) return null
        const o = r - Math.min(e, 0.95 * r)
        let l = 0,
          s = 1
        for (let d = 0; d < 24; d++) {
          const t = (l + s) / 2
          Tl(i, t) < o ? (l = t) : (s = t)
        }
        const a = s
        return zl(n.start, i, a, Pl(i, a))
      })(t, e) ??
      t
    )
  const i = n.start.x,
    r = n.start.y,
    o = n.end.x,
    l = n.end.y,
    s = o - i,
    a = l - r,
    d = Math.hypot(s, a)
  if (!(d > 0)) return t
  const c = Math.min(e, 0.95 * d)
  return `M${i},${r} L${o - (s / d) * c},${l - (a / d) * c}`
}
function Il(t) {
  return (function (t) {
    const e = Tr(t)
    if (!e || e.length < 3 || 'M' !== e[0]) return null
    const n = []
    let i = 1
    const r = Nr(e, i)
    if (!r) return null
    for (n.push(r), i += 2; i < e.length;) {
      if ('L' !== e[i++]) return null
      const t = Nr(e, i)
      if (!t) return null
      ;(n.push(t), (i += 2))
    }
    return n.length >= 2 ? n : null
  })(t)
}
function Dl(t) {
  return t
    .map((t, e) => `${0 === e ? 'M' : 'L'}${Ko(t.x)},${Ko(t.y)}`)
    .join(' ')
}
function Ol(t, e) {
  return Math.hypot(e.x - t.x, e.y - t.y)
}
function Ul(t, e, n, i, r) {
  const o = document.createElementNS(t, 'marker'),
    l = 'arrow-marker-' + ++ol
  ;(o.setAttribute('id', l),
    o.setAttribute('markerUnits', 'userSpaceOnUse'),
    o.setAttribute('orient', 'auto'))
  const { markerW: s, markerH: a } = wl(e, i)
  switch (e.type) {
    case 'triangle':
    case 'arrow': {
      ;(o.setAttribute('viewBox', '0 0 10 10'),
        o.setAttribute('refX', r ? '10' : '0'),
        o.setAttribute('refY', '5'),
        o.setAttribute('markerWidth', String(s)),
        o.setAttribute('markerHeight', String(a)))
      const e = document.createElementNS(t, 'polygon')
      ;(r
        ? e.setAttribute('points', '0,5 10,0 10,10')
        : e.setAttribute('points', '10,5 0,0 0,10'),
        e.setAttribute('fill', n),
        o.appendChild(e))
      break
    }
    case 'stealth': {
      ;(o.setAttribute('viewBox', '0 0 10 10'),
        o.setAttribute('refX', r ? '10' : '0'),
        o.setAttribute('refY', '5'),
        o.setAttribute('markerWidth', String(s)),
        o.setAttribute('markerHeight', String(a)))
      const e = document.createElementNS(t, 'path')
      ;(r
        ? e.setAttribute('d', 'M0,5 L10,0 L7,5 L10,10 Z')
        : e.setAttribute('d', 'M10,5 L0,0 L3,5 L0,10 Z'),
        e.setAttribute('fill', n),
        o.appendChild(e))
      break
    }
    case 'diamond': {
      ;(o.setAttribute('viewBox', '0 0 10 10'),
        o.setAttribute('refX', '5'),
        o.setAttribute('refY', '5'),
        o.setAttribute('markerWidth', String(s)),
        o.setAttribute('markerHeight', String(a)))
      const e = document.createElementNS(t, 'polygon')
      ;(e.setAttribute('points', '5,0 10,5 5,10 0,5'),
        e.setAttribute('fill', n),
        o.appendChild(e))
      break
    }
    case 'oval': {
      ;(o.setAttribute('viewBox', '0 0 10 10'),
        o.setAttribute('refX', '5'),
        o.setAttribute('refY', '5'),
        o.setAttribute('markerWidth', String(s)),
        o.setAttribute('markerHeight', String(a)))
      const e = document.createElementNS(t, 'circle')
      ;(e.setAttribute('cx', '5'),
        e.setAttribute('cy', '5'),
        e.setAttribute('r', '4'),
        e.setAttribute('fill', n),
        o.appendChild(e))
      break
    }
    default:
      return null
  }
  return ((o._markerId = l), o)
}
var Zl = new WeakMap()
function Gl(t, e, n, i) {
  var r
  const o = (function (t) {
      return t && 0 !== t.size
        ? Array.from(t.entries())
            .sort(([t], [e]) => t.localeCompare(e))
            .map(([t, e]) => `${t}:${e}`)
            .join('|')
        : ''
    })(t.adjustments),
    l = Zl.get(t)
  if (
    l &&
    l.effectivePreset === e &&
    l.w === n &&
    l.h === i &&
    l.adjustmentKey === o
  )
    return { pathD: l.pathD, multiPaths: l.multiPaths }
  const s = (function (t, e, n, i) {
      if (e > 0 && n > 0) {
        const r = gr(t, e, n, i)
        if (r && r.length > 1)
          return r.map(({ d: t, fill: e, stroke: n }) => ({
            d: t,
            fill: e,
            stroke: n,
          }))
      }
      const r = t.toLowerCase(),
        o = Fr.get(r) ?? Fr.get(t)
      return o ? o(e, n, i) : null
    })(e, n, i, t.adjustments),
    a = s
      ? ((null == (r = s[0]) ? void 0 : r.d) ?? '')
      : Pr(e, n, i, t.adjustments)
  return (
    Zl.set(t, {
      effectivePreset: e,
      w: n,
      h: i,
      adjustmentKey: o,
      pathD: a,
      multiPaths: s,
    }),
    { pathD: a, multiPaths: s }
  )
}
function Xl(t, e) {
  var n, i, r, o, l, s, a, d, c, u, h, p, f, m, $, g, y, x, v, b, M, w, k, A, L
  const S = document.createElement('div')
  ;((S.style.position = 'absolute'),
    (S.style.left = `${t.position.x}px`),
    (S.style.top = `${t.position.y}px`),
    (S.style.width = `${t.size.w}px`))
  const j = (null == (n = t.presetGeometry) ? void 0 : n.toLowerCase()) ?? '',
    E = new Set(['arc']),
    P =
      !!j &&
      ('line' === j ||
        'lineinv' === j ||
        j.startsWith('straightconnector') ||
        j.startsWith('bentconnector') ||
        j.startsWith('curvedconnector') ||
        E.has(j)),
    T = 'cxnSp' === t.source.localName,
    z = (t.size.w > 0 && t.size.h < 1) || (t.size.w < 1 && t.size.h > 0),
    N = P || T || z,
    R = N && t.size.h < 1 ? 1 : t.size.h,
    I = N && t.size.w < 1 ? 1 : t.size.w
  ;((S.style.height = `${R}px`),
    0 === t.size.w && (S.style.width = `${I}px`),
    (S.style.overflow = 'visible'))
  const D = []
  ;(0 !== t.rotation && D.push(`rotate(${t.rotation}deg)`),
    t.flipH && !N && D.push('scaleX(-1)'),
    t.flipV && !N && D.push('scaleY(-1)'),
    D.length > 0 && (S.style.transform = D.join(' ')))
  const O = t.size.w,
    U = t.size.h,
    Z = O,
    X = U,
    Y = t.source.child('style'),
    W = Y.exists() ? Y.child('lnRef') : void 0,
    _ = Y.exists() ? Y.child('fillRef') : void 0
  let Q = '',
    K = null
  if (t.presetGeometry) {
    let e = t.presetGeometry
    T && 'line' === e && (e = 'straightConnector1')
    const n = Gl(t, e, Z, X)
    ;((Q = n.pathD), (K = n.multiPaths))
  } else if (t.customGeometry) {
    const e = t.source.child('spPr').child('xfrm').child('ext'),
      n = { w: e.numAttr('cx') ?? 0, h: e.numAttr('cy') ?? 0 }
    Q = Ki(t.customGeometry, Z, X, n)
  }
  const J = !!K && !!t.presetGeometry && Vo.has(t.presetGeometry.toLowerCase())
  ;(!Q &&
    N &&
    ((null != (i = t.line) && i.exists()) ||
      (null != W &&
        W.exists() &&
        (W.numAttr('idx') ?? 0) > 0 &&
        ((null == (r = e.theme.lineStyles) ? void 0 : r.length) ?? 0) >=
          (W.numAttr('idx') ?? 0))) &&
    (Q = Pr(T ? 'straightConnector1' : 'line', Z, X, void 0)),
    Q &&
      N &&
      (t.flipH || t.flipV) &&
      (Q = (function (t, e, n, i, r) {
        if (!t || (!i && !r)) return t
        const o = Tr(t)
        if (!o) return t
        const l = []
        let s = 0
        const a = (t) => {
            if (s + t > o.length) return null
            const e = o.slice(s, s + t).map(Number)
            return e.some((t) => !Number.isFinite(t)) ? null : ((s += t), e)
          },
          d = (t, o) => {
            const l = r ? n - o : o
            return `${Rr(i ? e - t : t)},${Rr(l)}`
          }
        for (; s < o.length;) {
          const c = o[s++]
          if ('Z' === c || 'z' === c) {
            l.push('Z')
            continue
          }
          if ('M' !== c && 'L' !== c && 'C' !== c && 'Q' !== c && 'A' !== c)
            return t
          const u = a('C' === c ? 6 : 'Q' === c ? 4 : 'A' === c ? 7 : 2)
          if (!u) return t
          if ('M' === c || 'L' === c) l.push(`${c}${d(u[0], u[1])}`)
          else if ('C' === c)
            l.push(`C${d(u[0], u[1])} ${d(u[2], u[3])} ${d(u[4], u[5])}`)
          else if ('Q' === c) l.push(`Q${d(u[0], u[1])} ${d(u[2], u[3])}`)
          else {
            const [t, o, s, a, d, c, h] = u,
              p = i !== r ? (d ? 0 : 1) : d,
              f = i ? e - c : c,
              m = r ? n - h : h
            l.push(
              `A${Rr(t)},${Rr(o)} ${Rr(i !== r ? -s : s)} ${a},${p} ${Rr(f)},${Rr(m)}`,
            )
          }
        }
        return l.join(' ')
      })(Q, Z, X, t.flipH, t.flipV)))
  const tt = t.source.child('spPr')
  let et = '',
    nt = t.fill ? yn(tt, e) : null
  if (t.fill && t.fill.exists()) {
    if ('solidFill' === t.fill.localName) {
      const n = t.fill.child('srgbClr').exists()
        ? t.fill.child('srgbClr')
        : t.fill.child('schemeClr').exists()
          ? t.fill.child('schemeClr')
          : t.fill.child('scrgbClr').exists()
            ? t.fill.child('scrgbClr')
            : t.fill.child('sysClr').exists()
              ? t.fill.child('sysClr')
              : void 0
      null != n && n.exists() && (et = rn(n, e))
    }
    et || (et = sn(tt, e))
  }
  if (!et) {
    const t = tt.child('solidFill')
    if (t.exists()) {
      const n = t.child('srgbClr').exists()
        ? t.child('srgbClr')
        : t.child('schemeClr').exists()
          ? t.child('schemeClr')
          : t.child('scrgbClr').exists()
            ? t.child('scrgbClr')
            : t.child('sysClr').exists()
              ? t.child('sysClr')
              : void 0
      null != n && n.exists() && (et = rn(n, e))
    }
  }
  if (!et && _ && _.exists() && (_.numAttr('idx') ?? 0) > 0) {
    const t = xn(_, e)
    ;((et = t.fillCss), nt || (nt = t.gradientFillData))
  }
  N && ((et = ''), (nt = null))
  let it = 'none',
    rt = 0,
    ot = '',
    lt = 'solid',
    st = '',
    at = '',
    dt = null
  const ct = t.line && t.line.child('noFill').exists(),
    ut = t.line && !ct,
    ht =
      !ut &&
      !ct &&
      null != W &&
      W.exists() &&
      (W.numAttr('idx') ?? 0) > 0 &&
      ((null == (o = e.theme.lineStyles) ? void 0 : o.length) ?? 0) >=
        (W.numAttr('idx') ?? 0)
        ? e.theme.lineStyles[(W.numAttr('idx') ?? 1) - 1]
        : void 0
  let pt = ut ? t.line : ht
  if ((ct && (pt = void 0), null != pt && pt.exists())) {
    const t = cn(pt, e, W)
    ;((ot = t.dash),
      (lt = t.dashKind),
      (dt = (function (t, e) {
        const n = t.child('gradFill')
        if (!n.exists()) return null
        const i = n.child('gsLst'),
          r = []
        for (const a of i.children('gs')) {
          const t = 100 * q(a.numAttr('pos') ?? 0),
            { color: n, alpha: i } = en(a, e),
            o = on(n, i)
          r.push({ position: t, color: o })
        }
        if (0 === r.length) return null
        r.sort((t, e) => t.position - e.position)
        const o = n.child('lin')
        let l = 0
        o.exists() && (l = V(o.numAttr('ang') ?? 0))
        let s = H(t.numAttr('w') ?? 0)
        return (
          s <= 0 && (s = 1),
          { stops: r, angle: l, width: s, colorInterpolation: 'linearRGB' }
        )
      })(pt, e)),
      dt || ((it = t.color), (rt = t.width)))
    const n = pt.attr('cap')
    ;('rnd' === n
      ? (st = 'round')
      : 'sq' === n
        ? (st = 'square')
        : 'flat' === n && (st = 'butt'),
      pt.child('round').exists()
        ? (at = 'round')
        : pt.child('bevel').exists()
          ? (at = 'bevel')
          : pt.child('miter').exists() && (at = 'miter'))
  }
  ct && ((it = 'none'), (rt = 0), (dt = null))
  const ft =
    'circulararrow' ===
    (null == (l = t.presetGeometry) ? void 0 : l.toLowerCase())
  if (ft && ((it = 'none'), (rt = 0), (dt = null), !et)) {
    const t = tt.child('solidFill')
    if (t.exists()) {
      const n = t.child('srgbClr').exists()
        ? t.child('srgbClr')
        : t.child('schemeClr').exists()
          ? t.child('schemeClr')
          : t.child('scrgbClr').exists()
            ? t.child('scrgbClr')
            : t.child('sysClr').exists()
              ? t.child('sysClr')
              : void 0
      null != n && n.exists() && (et = rn(n, e))
    }
  }
  let mt,
    $t = null,
    gt = null,
    yt = null,
    xt = null,
    vt = null
  if (Q) {
    const n = 'http://www.w3.org/2000/svg',
      i = document.createElementNS(n, 'svg'),
      r = N ? I : O,
      o = N ? R : U
    ;(i.setAttribute('viewBox', `0 0 ${r} ${o}`),
      i.setAttribute('width', String(r)),
      i.setAttribute('height', String(o)),
      (i.style.position = 'absolute'),
      (i.style.left = '0'),
      (i.style.top = '0'),
      (i.style.overflow = 'visible'),
      (xt = i))
    const l = tt.child('blipFill'),
      y = l.exists()
        ? (function (t, e) {
            const n = t.child('blip'),
              i = n.attr('embed') ?? n.attr('r:embed'),
              r = n.attr('link') ?? n.attr('r:link'),
              o = i ?? r
            if (!o) return null
            const l = e.slide.rels.get(o)
            if (!l) return null
            if (G(l.targetMode)) return An(l.target) ? l.target : null
            const s = C(l.target, e.presentation.media)
            if (!s) return null
            const { mediaPath: a, data: d } = s
            return B(a, d, e.mediaUrlCache)
          })(l, e)
        : null
    if (y) {
      const t = document.createElementNS(n, 'defs')
      if ((rl(n, i, t, l, Q, { w: r, h: o }, y), K && K.length > 1 && J)) {
        const e =
          dt && dt.stops.length > 0 ? vl(n, t, dt, { w: r, h: o }, N) : null
        for (const t of K.slice(1)) {
          const r = document.createElementNS(n, 'path')
          ;(r.setAttribute('d', t.d), r.setAttribute('fill', 'none'))
          const o =
            t.strokeWidthScale &&
            Number.isFinite(t.strokeWidthScale) &&
            t.strokeWidthScale > 0
              ? t.strokeWidthScale
              : 1
          ;(t.stroke && !ct && e
            ? bl(r, e.paint, e.width * o, lt, ot, st, at)
            : t.stroke && !ct && rt > 0 && 'none' !== it && 'transparent' !== it
              ? bl(r, it, rt * o, lt, ot, st, at)
              : r.setAttribute('stroke', 'none'),
            i.appendChild(r))
        }
      }
      const e = K && !1 === (null == (s = K[0]) ? void 0 : s.stroke)
      if (!ft && !e && !dt && rt > 0 && 'none' !== it && 'transparent' !== it) {
        const t = document.createElementNS(n, 'path')
        ;(t.setAttribute('d', Q),
          t.setAttribute('fill', 'none'),
          t.setAttribute('stroke', it),
          t.setAttribute('stroke-width', String(rt)),
          st && t.setAttribute('stroke-linecap', st),
          at && t.setAttribute('stroke-linejoin', at))
        const e = $l(lt, rt)
        ;(e
          ? t.setAttribute('stroke-dasharray', e)
          : 'dashed' === ot
            ? t.setAttribute('stroke-dasharray', `${4 * rt},${2 * rt}`)
            : 'dotted' === ot &&
              t.setAttribute('stroke-dasharray', `${rt},${2 * rt}`),
          i.appendChild(t))
      }
      S.appendChild(i)
    } else {
      const s = document.createElementNS(n, 'defs'),
        y = document.createElementNS(n, 'path')
      ;(y.setAttribute('d', Q),
        ($t = n),
        (gt = s),
        (yt = y),
        (vt = { w: r, h: o }))
      const x = null == (a = t.presetGeometry) ? void 0 : a.toLowerCase()
      if (
        ('curveduparrow' === x || 'curveddownarrow' === x
          ? (y.setAttribute('fill-rule', 'evenodd'),
            y.setAttribute('stroke-linejoin', 'round'))
          : 'funnel' === x && y.setAttribute('fill-rule', 'evenodd'),
        et)
      ) {
        const t = tt.child('pattFill'),
          i = t.exists()
            ? (function (t, e, n, i) {
                if (!n.exists()) return null
                const r = n.attr('prst') ?? 'solid'
                if ('solid' === r || 'solidDmnd' === r) return null
                const o = n.child('fgClr'),
                  l = n.child('bgClr'),
                  s = o.exists() ? rn(o, i) : '#000000',
                  a = l.exists() ? rn(l, i) : '#ffffff',
                  d = 'shape-pattern-' + ++ll,
                  c = document.createElementNS(t, 'pattern')
                ;(c.setAttribute('id', d),
                  c.setAttribute('patternUnits', 'userSpaceOnUse'),
                  c.setAttribute('width', String(8)),
                  c.setAttribute('height', String(8)))
                const u = document.createElementNS(t, 'rect')
                ;(u.setAttribute('width', String(8)),
                  u.setAttribute('height', String(8)),
                  u.setAttribute('fill', a),
                  c.appendChild(u))
                let h = !1
                const p = (e, n, i, r, o) => {
                    const l = document.createElementNS(t, 'line')
                    ;(l.setAttribute('x1', String(e)),
                      l.setAttribute('y1', String(n)),
                      l.setAttribute('x2', String(i)),
                      l.setAttribute('y2', String(r)),
                      l.setAttribute('stroke', s),
                      l.setAttribute('stroke-width', String(1)),
                      o && l.setAttribute('stroke-dasharray', o),
                      c.appendChild(l),
                      (h = !0))
                  },
                  f = (e, n, i) => {
                    const r = document.createElementNS(t, 'circle')
                    ;(r.setAttribute('cx', String(e)),
                      r.setAttribute('cy', String(n)),
                      r.setAttribute('r', String(i)),
                      r.setAttribute('fill', s),
                      c.appendChild(r),
                      (h = !0))
                  },
                  m = 0.5,
                  $ = '3,2'
                let g = 0
                switch (r) {
                  case 'pct5':
                  case 'pct10':
                  case 'pct20':
                  case 'pct25':
                    f(4, 4, 0.75)
                    break
                  case 'pct30':
                  case 'pct40':
                  case 'pct50':
                  case 'dotGrid':
                  case 'dotDmnd':
                    f(4, 4, 1)
                    break
                  case 'pct60':
                  case 'pct70':
                  case 'pct75':
                  case 'pct80':
                  case 'pct90':
                  case 'sphere':
                  case 'shingle':
                  case 'plaid':
                  case 'divot':
                  case 'zigZag':
                    f(4, 4, 1.5)
                    break
                  case 'horz':
                  case 'ltHorz':
                  case 'narHorz':
                  case 'dkHorz':
                    p(0, m, 8, m)
                    break
                  case 'vert':
                  case 'ltVert':
                  case 'narVert':
                  case 'dkVert':
                    p(m, 0, m, 8)
                    break
                  case 'dnDiag':
                  case 'ltDnDiag':
                  case 'narDnDiag':
                  case 'dkDnDiag':
                  case 'wdDnDiag':
                    p(0, 8, 8, 0)
                    break
                  case 'upDiag':
                  case 'ltUpDiag':
                  case 'narUpDiag':
                  case 'dkUpDiag':
                  case 'wdUpDiag':
                    p(0, 0, 8, 8)
                    break
                  case 'smGrid':
                  case 'lgGrid':
                  case 'cross':
                    ;((g = -3), p(0, m, 8, m), p(m, 0, m, 8))
                    break
                  case 'smCheck':
                  case 'lgCheck':
                  case 'diagCross':
                  case 'openDmnd':
                  case 'trellis':
                  case 'weave':
                    ;(p(0, 8, 8, 0), p(0, 0, 8, 8))
                    break
                  case 'dashHorz':
                    p(0, m, 8, m, $)
                    break
                  case 'dashVert':
                    p(m, 0, m, 8, $)
                    break
                  case 'dashDnDiag':
                    p(0, 8, 8, 0, $)
                    break
                  case 'dashUpDiag':
                    p(0, 0, 8, 8, $)
                    break
                  default:
                    return null
                }
                return h
                  ? (0 !== g && c.setAttribute('y', String(g)),
                    e.appendChild(c),
                    d)
                  : null
              })(n, s, t, e)
            : null
        if (i) y.setAttribute('fill', `url(#${i})`)
        else if (nt && nt.stops.length > 0) {
          const t = 'grad-fill-' + ++ll
          if ('radial' === nt.type && 'rect' === nt.pathType) {
            const e = nt.cx ?? 0.5,
              i = nt.cy ?? 0.5,
              r = (t, e) => {
                const n = mn(nt, { axis: e }),
                  i = []
                for (const r of n) {
                  const e = r.position / 100,
                    n = t - e * t,
                    o = t + e * (1 - t)
                  ;(i.push({ offset: n, color: r.color }),
                    i.push({ offset: o, color: r.color }))
                }
                return (i.sort((t, e) => t.offset - e.offset), i)
              },
              o = `${t}-h`,
              l = document.createElementNS(n, 'linearGradient')
            ;(l.setAttribute('id', o),
              l.setAttribute(
                'color-interpolation',
                nt.colorInterpolation ?? 'linearRGB',
              ),
              l.setAttribute('x1', '0%'),
              l.setAttribute('y1', '0%'),
              l.setAttribute('x2', '100%'),
              l.setAttribute('y2', '0%'))
            for (const t of r(e, 'x')) {
              const e = document.createElementNS(n, 'stop')
              ;(e.setAttribute('offset', `${(100 * t.offset).toFixed(2)}%`),
                e.setAttribute('stop-color', t.color),
                l.appendChild(e))
            }
            s.appendChild(l)
            const a = `${t}-v`,
              d = document.createElementNS(n, 'linearGradient')
            ;(d.setAttribute('id', a),
              d.setAttribute(
                'color-interpolation',
                nt.colorInterpolation ?? 'linearRGB',
              ),
              d.setAttribute('x1', '0%'),
              d.setAttribute('y1', '0%'),
              d.setAttribute('x2', '0%'),
              d.setAttribute('y2', '100%'))
            for (const t of r(i, 'y')) {
              const e = document.createElementNS(n, 'stop')
              ;(e.setAttribute('offset', `${(100 * t.offset).toFixed(2)}%`),
                e.setAttribute('stop-color', t.color),
                d.appendChild(e))
            }
            s.appendChild(d)
            const c = `${t}-clip`,
              u = document.createElementNS(n, 'clipPath')
            u.setAttribute('id', c)
            const h = document.createElementNS(n, 'path')
            ;(h.setAttribute('d', Q), u.appendChild(h), s.appendChild(u))
            const p = document.createElementNS(n, 'g')
            ;(p.setAttribute('clip-path', `url(#${c})`),
              p.setAttribute('style', 'isolation: isolate'))
            const f = document.createElementNS(n, 'rect')
            ;(f.setAttribute('width', '100%'),
              f.setAttribute('height', '100%'),
              f.setAttribute('fill', 'black'),
              p.appendChild(f))
            const m = document.createElementNS(n, 'path')
            ;(m.setAttribute('d', Q),
              m.setAttribute('fill', `url(#${o})`),
              m.setAttribute('style', 'mix-blend-mode: lighten'),
              p.appendChild(m))
            const $ = document.createElementNS(n, 'path')
            ;($.setAttribute('d', Q),
              $.setAttribute('fill', `url(#${a})`),
              $.setAttribute('style', 'mix-blend-mode: lighten'),
              p.appendChild($),
              y.setAttribute('fill', 'none'),
              (y.__rectBlendGroup = p))
          } else if ('radial' === nt.type) {
            const e = document.createElementNS(n, 'radialGradient')
            ;(e.setAttribute('id', t),
              e.setAttribute(
                'color-interpolation',
                nt.colorInterpolation ?? 'linearRGB',
              ),
              e.setAttribute('gradientUnits', 'userSpaceOnUse'))
            const i = nt.cx ?? 0.5,
              l = nt.cy ?? 0.5
            ;(e.setAttribute('cx', String(i * r)),
              e.setAttribute('cy', String(l * o)))
            const a = Math.max(i, 1 - i),
              d = Math.max(l, 1 - l)
            e.setAttribute('r', String(Math.hypot(a * r, d * o)))
            for (const t of mn(nt, { width: r, height: o })) {
              const i = document.createElementNS(n, 'stop')
              ;(i.setAttribute('offset', `${t.position}%`),
                i.setAttribute('stop-color', t.color),
                e.appendChild(i))
            }
            s.appendChild(e)
          } else {
            const e = document.createElementNS(n, 'linearGradient')
            ;(e.setAttribute('id', t),
              e.setAttribute(
                'color-interpolation',
                nt.colorInterpolation ?? 'linearRGB',
              ),
              e.setAttribute('gradientUnits', 'userSpaceOnUse'))
            const i = xl(nt.angle)
            ;(e.setAttribute('x1', String((parseFloat(i.x1) / 100) * r)),
              e.setAttribute('y1', String((parseFloat(i.y1) / 100) * o)),
              e.setAttribute('x2', String((parseFloat(i.x2) / 100) * r)),
              e.setAttribute('y2', String((parseFloat(i.y2) / 100) * o)))
            for (const t of nt.stops) {
              const i = document.createElementNS(n, 'stop')
              ;(i.setAttribute('offset', `${t.position}%`),
                i.setAttribute('stop-color', t.color),
                e.appendChild(i))
            }
            s.appendChild(e)
          }
          ;('radial' === nt.type && 'rect' === nt.pathType) ||
            y.setAttribute('fill', `url(#${t})`)
        } else
          'transparent' === et
            ? y.setAttribute('fill', 'none')
            : et.includes('gradient')
              ? ((S.style.background = et),
                y.setAttribute('fill', 'transparent'))
              : y.setAttribute('fill', et)
      } else y.setAttribute('fill', 'none')
      if (ft) {
        if (!et || 'none' === et || 'transparent' === et) {
          const n = [
            'srgbClr',
            'schemeClr',
            'scrgbClr',
            'sysClr',
            'hslClr',
            'prstClr',
          ]
          let i = ''
          const r = tt.child('solidFill')
          if (r.exists())
            for (const t of r.allChildren())
              if (n.includes(t.localName)) {
                i = rn(t, e)
                break
              }
          if (!i && null != (d = t.fill) && d.exists())
            for (const o of t.fill.allChildren())
              if (n.includes(o.localName)) {
                i = rn(o, e)
                break
              }
          i && y.setAttribute('fill', i)
        }
        y.setAttribute('stroke', 'none')
      }
      let v = t.headEnd,
        b = t.tailEnd
      if ((!v || !b) && null != pt && pt.exists()) {
        const t = (function (t) {
          const e = {},
            n = t.child('headEnd')
          if (n.exists()) {
            const t = n.attr('type')
            t &&
              'none' !== t &&
              (e.headEnd = { type: t, w: n.attr('w'), len: n.attr('len') })
          }
          const i = t.child('tailEnd')
          if (i.exists()) {
            const t = i.attr('type')
            t &&
              'none' !== t &&
              (e.tailEnd = { type: t, w: i.attr('w'), len: i.attr('len') })
          }
          return e
        })(pt)
        ;(!v && t.headEnd && (v = t.headEnd),
          !b && t.tailEnd && (b = t.tailEnd))
      }
      const M = dt ? Al(dt.stops, 'start', 'black') : it,
        w = dt ? Al(dt.stops, 'end', M) : it
      let k = dt ? dt.width : rt
      N && (v || b) && k <= 0 && (k = 1)
      const A = N && (v || b) ? 'butt' : st
      if (
        (N &&
          (v || b) &&
          k > 0 &&
          ((Q = (function (t, e, n, i) {
            if (!n && !i) return t
            const r = Il(t)
            if (!r || r.length < 3) return t
            const o = Math.min(Math.max(2, 1.5 * e), 4)
            let l = r.slice()
            if (n && l.length >= 3) {
              const t = Ol(l[0], l[1]),
                e = Ol(l[1], l[2])
              t <= o && e > o && (l = l.slice(1))
            }
            if (i && l.length >= 3) {
              const t = l.length - 1,
                e = Ol(l[t - 1], l[t]),
                n = Ol(l[t - 2], l[t - 1])
              e <= o && n > o && (l = l.slice(0, -1))
            }
            return l.length === r.length ? t : Dl(l)
          })(Q, k, !!v, !!b)),
          y.setAttribute('d', Q)),
        N && v && k > 0)
      ) {
        const t = (function (t, e) {
          return 'triangle' !== t.type &&
            'arrow' !== t.type &&
            'stealth' !== t.type
            ? 0
            : wl(t, e).markerW
        })(v, k)
        t > 0 && ((Q = Nl(Q, t)), y.setAttribute('d', Q))
      }
      if (N && b && k > 0) {
        const t = (function (t, e) {
          return 'triangle' !== t.type &&
            'arrow' !== t.type &&
            'stealth' !== t.type
            ? 0
            : wl(t, e).markerW
        })(b, k)
        t > 0 && ((Q = Rl(Q, t)), y.setAttribute('d', Q))
      }
      const L = K && !1 === (null == (c = K[0]) ? void 0 : c.stroke)
      let C = null
      if (!ft && !L && dt && dt.stops.length > 0)
        ((C = vl(n, s, dt, { w: r, h: o }, N)),
          bl(y, C.paint, C.width, lt, ot, A, at))
      else if (!ft && !L && k > 0 && 'transparent' !== it) {
        ;(y.setAttribute('stroke', it),
          y.setAttribute('stroke-width', String(k)),
          A && y.setAttribute('stroke-linecap', A),
          at && y.setAttribute('stroke-linejoin', at))
        const t = $l(lt, k)
        t
          ? y.setAttribute('stroke-dasharray', t)
          : 'dashed' === ot
            ? y.setAttribute('stroke-dasharray', `${4 * k},${2 * k}`)
            : 'dotted' === ot &&
              y.setAttribute('stroke-dasharray', `${k},${2 * k}`)
      } else y.setAttribute('stroke', 'none')
      if (k > 0 && (v || b)) {
        if (v) {
          const t = Ul(n, v, M, k, !0)
          t &&
            (s.appendChild(t),
            y.setAttribute('marker-start', `url(#${t._markerId})`))
        }
        if (b) {
          const t = Ul(n, b, w, k, !1)
          t &&
            (s.appendChild(t),
            y.setAttribute('marker-end', `url(#${t._markerId})`))
        }
      }
      if (
        (y.__rectBlendGroup &&
          (i.appendChild(y.__rectBlendGroup), delete y.__rectBlendGroup),
        i.appendChild(y),
        l.exists() && e.presentation.mediaResolver)
      ) {
        const t = (async function (t, e) {
          const n = t.child('blip'),
            i = n.attr('embed') ?? n.attr('r:embed'),
            r = n.attr('link') ?? n.attr('r:link'),
            o = i ?? r
          if (!o) return null
          const l = e.slide.rels.get(o)
          if (!l) return null
          if (G(l.targetMode)) return An(l.target) ? l.target : null
          const s = await F(
            l.target,
            e.presentation.media,
            e.presentation.mediaResolver,
          )
          if (!s) return null
          const { mediaPath: a, data: d } = s
          return B(a, d, e.mediaUrlCache)
        })(l, e)
          .then((t) => {
            t && rl(n, i, s, l, Q, { w: r, h: o }, t, y)
          })
          .catch(() => {})
        ;(null == (u = e.asyncTasks) || u.push(t), e.asyncTasks)
      }
      if (K && K.length > 1) {
        const l = y.getAttribute('fill') ?? '',
          a = (null == (h = t.presetGeometry) ? void 0 : h.toLowerCase()) ?? '',
          d = gl(
            l && !l.startsWith('url(')
              ? l
              : null != _ && _.exists()
                ? rn(_, e)
                : ((null == (p = null == nt ? void 0 : nt.stops[0])
                    ? void 0
                    : p.color) ?? et),
          ),
          c = (t, e) => {
            if (
              'linear' !== (null == nt ? void 0 : nt.type) ||
              0 === nt.stops.length
            )
              return
            const i = 'grad-fill-detail-' + ++ll,
              l = document.createElementNS(n, 'linearGradient')
            ;(l.setAttribute('id', i),
              l.setAttribute('gradientUnits', 'userSpaceOnUse'),
              l.setAttribute(
                'color-interpolation',
                nt.colorInterpolation ?? 'sRGB',
              ))
            const a = xl(nt.angle)
            ;(l.setAttribute('x1', String((parseFloat(a.x1) / 100) * r)),
              l.setAttribute('y1', String((parseFloat(a.y1) / 100) * o)),
              l.setAttribute('x2', String((parseFloat(a.x2) / 100) * r)),
              l.setAttribute('y2', String((parseFloat(a.y2) / 100) * o)))
            for (const r of nt.stops) {
              const i = document.createElementNS(n, 'stop')
              i.setAttribute('offset', `${r.position}%`)
              const o = gl(r.color)
              ;(i.setAttribute('stop-color', o ? yl(o, e, t) : r.color),
                l.appendChild(i))
            }
            return (s.appendChild(l), `url(#${i})`)
          },
          u =
            dt && dt.stops.length > 0 && K.slice(1).some(({ stroke: t }) => t)
              ? (C ?? vl(n, s, dt, { w: r, h: o }, N))
              : null
        for (let e = 1; e < K.length; e++) {
          const h = K[e],
            p = document.createElementNS(n, 'path')
          if ((p.setAttribute('d', h.d), 'none' === h.fill))
            p.setAttribute('fill', 'none')
          else if ('darkenLess' === h.fill)
            p.setAttribute(
              'fill',
              c(0.15, { r: 0, g: 0, b: 0 }) ||
                (d ? yl(d, { r: 0, g: 0, b: 0 }, 0.15) : 'rgba(0,0,0,0.15)'),
            )
          else if ('darken' === h.fill)
            p.setAttribute(
              'fill',
              c(0.3, { r: 0, g: 0, b: 0 }) ||
                (d ? yl(d, { r: 0, g: 0, b: 0 }, 0.3) : 'rgba(0,0,0,0.3)'),
            )
          else if ('lightenLess' === h.fill)
            p.setAttribute(
              'fill',
              c(0.18, { r: 255, g: 255, b: 255 }) ||
                (d
                  ? yl(d, { r: 255, g: 255, b: 255 }, 0.18)
                  : 'rgba(255,255,255,0.15)'),
            )
          else if ('lighten' === h.fill) {
            let t
            if (
              'can' === a &&
              'linear' === (null == nt ? void 0 : nt.type) &&
              nt.stops.length > 0
            ) {
              const e = 'grad-fill-face-' + ++ll,
                i = document.createElementNS(n, 'linearGradient')
              ;(i.setAttribute('id', e),
                i.setAttribute('gradientUnits', 'userSpaceOnUse'),
                i.setAttribute('color-interpolation', 'sRGB'))
              const l = xl(nt.angle)
              ;(i.setAttribute('x1', String((parseFloat(l.x1) / 100) * r)),
                i.setAttribute('y1', String((parseFloat(l.y1) / 100) * o)),
                i.setAttribute('x2', String((parseFloat(l.x2) / 100) * r)),
                i.setAttribute('y2', String((parseFloat(l.y2) / 100) * o)))
              for (const t of nt.stops) {
                const e = document.createElementNS(n, 'stop')
                ;(e.setAttribute('offset', `${t.position}%`),
                  e.setAttribute('stop-color', Ce(t.color, 65e3)),
                  i.appendChild(e))
              }
              ;(s.appendChild(i), (t = `url(#${e})`))
            } else 'can' === a && l.startsWith('url(') && (t = l)
            const e = 'can' === a ? void 0 : c(0.3, { r: 255, g: 255, b: 255 })
            p.setAttribute(
              'fill',
              t ||
                e ||
                (d
                  ? yl(d, { r: 255, g: 255, b: 255 }, 0.3)
                  : 'rgba(255,255,255,0.3)'),
            )
          } else p.setAttribute('fill', l || 'none')
          if (h.stroke && !ct && u) {
            const t =
              h.strokeWidthScale &&
              Number.isFinite(h.strokeWidthScale) &&
              h.strokeWidthScale > 0
                ? u.width * h.strokeWidthScale
                : u.width
            bl(p, u.paint, t, lt, ot, st, at)
          } else if (
            h.stroke &&
            k > 0 &&
            'none' !== it &&
            'transparent' !== it
          ) {
            const e =
                'bordercallout1' ===
                  (null == (f = t.presetGeometry) ? void 0 : f.toLowerCase()) &&
                'none' === h.fill,
              i =
                h.strokeWidthScale &&
                Number.isFinite(h.strokeWidthScale) &&
                h.strokeWidthScale > 0
                  ? k * h.strokeWidthScale
                  : k,
              l = e ? Math.max(i, 2.4) : i
            if (
              (bl(p, it, l, lt, ot, e ? 'round' : st, at),
              h.maskToMainOutlineBandScale &&
                h.maskToMainOutlineBandScale > 0 &&
                h.maskToMainOutlineBandScale < 1)
            ) {
              const t = 'shape-detail-band-mask-' + ++ll,
                e = document.createElementNS(n, 'mask')
              ;(e.setAttribute('id', t),
                e.setAttribute('maskUnits', 'userSpaceOnUse'),
                e.setAttribute('maskContentUnits', 'userSpaceOnUse'))
              const i = document.createElementNS(n, 'rect')
              ;(i.setAttribute('x', '0'),
                i.setAttribute('y', '0'),
                i.setAttribute('width', String(r)),
                i.setAttribute('height', String(o)),
                i.setAttribute('fill', 'black'),
                e.appendChild(i))
              const l = document.createElementNS(n, 'path')
              ;(l.setAttribute('d', Q),
                l.setAttribute('fill', 'white'),
                l.setAttribute('stroke', 'none'),
                e.appendChild(l))
              const a = h.maskToMainOutlineBandScale,
                d = document.createElementNS(n, 'path')
              ;(d.setAttribute('d', Q),
                d.setAttribute('fill', 'black'),
                d.setAttribute('stroke', 'none'))
              const c = (r * (1 - a)) / 2,
                u = (o * (1 - a)) / 2
              ;(d.setAttribute('transform', `translate(${c} ${u}) scale(${a})`),
                e.appendChild(d),
                s.appendChild(e),
                p.setAttribute('mask', `url(#${t})`))
            } else if (h.maskToMainOutline) {
              const t = 'shape-detail-mask-' + ++ll,
                e = document.createElementNS(n, 'mask')
              ;(e.setAttribute('id', t),
                e.setAttribute('maskUnits', 'userSpaceOnUse'),
                e.setAttribute('maskContentUnits', 'userSpaceOnUse'))
              const i = document.createElementNS(n, 'rect')
              ;(i.setAttribute('x', '0'),
                i.setAttribute('y', '0'),
                i.setAttribute('width', String(r)),
                i.setAttribute('height', String(o)),
                i.setAttribute('fill', 'black'),
                e.appendChild(i))
              const a = document.createElementNS(n, 'path')
              ;(a.setAttribute('d', Q),
                a.setAttribute('fill', 'none'),
                a.setAttribute('stroke', 'white'))
              const d = Math.max(
                l *
                  (h.maskStrokeScale && h.maskStrokeScale > 0
                    ? h.maskStrokeScale
                    : 3),
                l,
              )
              ;(a.setAttribute('stroke-width', String(d)),
                a.setAttribute('stroke-linecap', 'round'),
                a.setAttribute('stroke-linejoin', 'round'),
                e.appendChild(a),
                s.appendChild(e),
                p.setAttribute('mask', `url(#${t})`))
            }
          } else if (!h.stroke || ct || J) p.setAttribute('stroke', 'none')
          else {
            const t = d ? yl(d, { r: 0, g: 0, b: 0 }, 0.55) : '#666666'
            ;(p.setAttribute('stroke', t), p.setAttribute('stroke-width', '1'))
          }
          i.appendChild(p)
        }
      }
      const j = !nt && /^#[0-9a-f]{6}$/i.test(et),
        E = l.exists()
          ? 'picture'
          : tt.child('gradFill').exists() || nt
            ? 'gradient'
            : tt.child('pattFill').exists()
              ? 'pattern'
              : tt.child('grpFill').exists()
                ? 'group'
                : tt.child('noFill').exists()
                  ? 'none'
                  : tt.child('solidFill').exists() ||
                      'solidFill' ===
                        (null == (m = t.fill) ? void 0 : m.localName) ||
                      j
                    ? 'solid'
                    : 'unknown',
        P = t.textBody,
        T = null == P ? void 0 : P.bodyProperties,
        z = ['spAutoFit', 'normAutofit', 'noAutofit'].find((t) =>
          null == T ? void 0 : T.child(t).exists(),
        ),
        R = e.groupChildScale,
        I = !!(
          R &&
          Number.isFinite(R.x) &&
          Number.isFinite(R.y) &&
          R.x > 0 &&
          R.y > 0 &&
          (Math.abs(R.x - 1) > 1e-6 || Math.abs(R.y - 1) > 1e-6)
        )
      if (
        ((mt = Po(
          t.shape3d,
          {
            nodeType: 'shape',
            presetGeometry: t.presetGeometry,
            width: r,
            height: o,
            sourceBounds: I ? { width: r / R.x, height: o / R.y } : void 0,
            isLineLike: N,
            paintKind: E,
            baseFill: /^#[0-9a-f]{6}$/i.test(et) ? et : void 0,
            hasVisibleText:
              (null == ($ = t.textBody)
                ? void 0
                : $.paragraphs.some((t) =>
                    t.runs.some((t) => t.text.trim().length > 0),
                  )) ?? !1,
            container:
              (e.groupDepth ?? 0) > 0
                ? 'group'
                : 'master' === e.nodeOrigin
                  ? 'master'
                  : 'layout' === e.nodeOrigin
                    ? 'layout'
                    : t.placeholder
                      ? 'placeholder'
                      : 'standalone-slide',
            hasStyleReference: Y.exists(),
            hasCustomGeometry:
              (null == (g = t.customGeometry) ? void 0 : g.exists()) ?? !1,
            customGeometryProfile: qo(t.customGeometry),
            hasVisibleStroke: 'none' !== y.getAttribute('stroke'),
            rotation: t.rotation,
            flipH: t.flipH,
            flipV: t.flipV,
            textPlane: P
              ? {
                  wrap: null == T ? void 0 : T.attr('wrap'),
                  anchor: null == T ? void 0 : T.attr('anchor'),
                  autofit: z ?? 'none',
                  vertical: null == T ? void 0 : T.attr('vert'),
                  hasIndependentBounds: void 0 !== t.textBoxBounds,
                }
              : void 0,
          },
          e,
        )),
        Uo({
          svg: i,
          defs: s,
          basePath: y,
          pathD: Q,
          bounds: { width: r, height: o },
          plan: mt,
          ctx: e,
        }),
        s.children.length > 0 &&
          !s.parentNode &&
          i.insertBefore(s, i.firstChild),
        ft &&
          (y.setAttribute('stroke', 'none'),
          y.removeAttribute('stroke-width'),
          y.removeAttribute('marker-start'),
          y.removeAttribute('marker-end')),
        t.presetGeometry && !K)
      ) {
        const e = (function (t, e, n) {
          const i = t.toLowerCase(),
            r = Cr.get(i) ?? Cr.get(t)
          return null == r ? void 0 : r(e, n)
        })(t.presetGeometry, Z, X)
        if (e) {
          const t = document.createElementNS(n, 'path')
          t.setAttribute('d', e)
          let r = '#333333'
          if (et && 'transparent' !== et && 'none' !== et) {
            const t = et.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i)
            if (t) {
              const e = parseInt(t[1], 16),
                n = parseInt(t[2], 16),
                i = parseInt(t[3], 16)
              r = we(
                Math.round(0.5 * e),
                Math.round(0.5 * n),
                Math.round(0.5 * i),
              )
            }
          }
          ;(t.setAttribute('fill', r),
            t.setAttribute('stroke', 'none'),
            i.appendChild(t))
        }
      }
      S.appendChild(i)
    }
  } else
    et &&
      'transparent' !== et &&
      (et.includes('gradient')
        ? (S.style.background = et)
        : (S.style.backgroundColor = et))
  const bt = t.textBody ? qi(t.textBody, e) : void 0
  if (bt && bt.paragraphs.length > 0 && Zo(bt)) {
    const n = nl(bt === t.textBody ? t : { ...t, textBody: bt }, e)
    if (n) S.appendChild(n)
    else {
      const n = document.createElement('div')
      ;((n.style.position = 'absolute'),
        t.textBoxBounds
          ? ((n.style.left = `${t.textBoxBounds.x}px`),
            (n.style.top = `${t.textBoxBounds.y}px`),
            (n.style.width = `${t.textBoxBounds.w}px`),
            (n.style.height = `${t.textBoxBounds.h}px`))
          : ((n.style.left = '0'),
            (n.style.top = '0'),
            (n.style.width = '100%'),
            (n.style.height = '100%')),
        (n.style.display = 'flex'),
        (n.style.flexDirection = 'column'),
        (n.style.boxSizing = 'border-box'),
        (n.style.whiteSpace = 'normal'))
      const i = qn(bt, 'spAutoFit'),
        r = null == i ? void 0 : i.exists(),
        o = qn(bt, 'normAutofit'),
        l = null == o ? void 0 : o.exists(),
        s = qn(bt, 'noAutofit'),
        a = null == s ? void 0 : s.exists(),
        d = bt.bodyProperties,
        c = bt.layoutBodyProperties,
        u = (d ? d.attr('wrap') : void 0) ?? (c ? c.attr('wrap') : void 0),
        h =
          (d ? d.attr('horzOverflow') : void 0) ??
          (c ? c.attr('horzOverflow') : void 0),
        p =
          (d ? d.attr('vertOverflow') : void 0) ??
          (c ? c.attr('vertOverflow') : void 0),
        f = d ? d.attr('anchor') : void 0,
        m = c ? c.attr('anchor') : void 0,
        $ = f || m,
        g = r && !l && 'overflow' === h,
        b = r && !l && 'overflow' === p,
        M =
          !r &&
          !l &&
          !a &&
          Go(bt) &&
          !Ho(bt) &&
          ('none' === u || (void 0 === u && Yo(bt))),
        w =
          a &&
          'clip' !== h &&
          'clip' !== p &&
          (function (t) {
            return (
              'title' === (null == t ? void 0 : t.type) ||
              'ctrTitle' === (null == t ? void 0 : t.type)
            )
          })(t.placeholder) &&
          Go(bt),
        k = !r && !l && !a && 'square' === u && Go(bt) && Yo(bt) && !Ho(bt)
      ;((n.style.overflowX = 'visible'),
        (n.style.overflowY = 'visible'),
        a &&
          ((n.style.overflowX = 'clip' === h ? 'clip' : 'visible'),
          (n.style.overflowY = 'clip' === p ? 'clip' : 'visible')))
      let A = !1,
        L = !1
      if (l && o) {
        ;((n.style.overflowX = 'hidden'), (n.style.overflowY = 'hidden'))
        const t = _n(o.attr('lnSpcReduction')) ?? 0
        if (((A = !0), t > 0)) {
          const e = Math.max(0, 1 - t)
          n.style.lineHeight = `${e}`
        }
      }
      if (r && !l) {
        if (g === b) {
          const t = g ? 'visible' : 'hidden'
          ;((n.style.overflowX = t), (n.style.overflowY = t))
        } else
          ((n.style.overflowX = g ? 'visible' : 'clip'),
            (n.style.overflowY = b ? 'visible' : 'clip'))
        A = !g || !b
        const e = (d ? d.attr('vert') : void 0) ?? (c ? c.attr('vert') : void 0)
        L = !(
          '1' !== t.source.child('nvSpPr').child('cNvSpPr').attr('txBox') ||
          t.textBoxBounds ||
          'square' !== u ||
          (void 0 !== e && 'horz' !== e) ||
          (void 0 !== $ && 't' !== $) ||
          void 0 !== h ||
          void 0 !== p
        )
      }
      ;(M &&
        ((n.style.overflowX = 'hidden'),
        (n.style.overflowY = 'hidden'),
        (A = !0)),
        w && (A = !0),
        k && (A = !0))
      let C,
        F = !1
      const B = !!r && !l && Go(bt),
        j = (function (t) {
          const e = t.paragraphs.filter((t) =>
            t.runs.some((t) => null != t.text && t.text.length > 0),
          )
          return (
            0 !== e.length &&
            e.every((t) => {
              var e
              return (
                'ctr' === (null == (e = t.properties) ? void 0 : e.attr('algn'))
              )
            })
          )
        })(bt)
      {
        'none' === u && (n.style.whiteSpace = 'nowrap')
        const e = $,
          i = void 0 !== f || void 0 !== m
        C = e
        const r = (d ? d.attr('vert') : null) || (c ? c.attr('vert') : null)
        n.style.justifyContent =
          't' === e
            ? 'flex-start'
            : 'ctr' === e
              ? 'center'
              : 'b' === e
                ? 'flex-end'
                : 'flex-start'
        const o =
            (d ? d.numAttr('lIns') : void 0) ??
            (c ? c.numAttr('lIns') : void 0),
          l =
            (d ? d.numAttr('tIns') : void 0) ??
            (c ? c.numAttr('tIns') : void 0),
          s =
            (d ? d.numAttr('rIns') : void 0) ??
            (c ? c.numAttr('rIns') : void 0),
          a =
            (d ? d.numAttr('bIns') : void 0) ??
            (c ? c.numAttr('bIns') : void 0),
          h = H(void 0 !== o ? o : 91440),
          p = H(void 0 !== l ? l : 45720),
          g = H(void 0 !== s ? s : 91440),
          x = H(void 0 !== a ? a : 45720),
          v = (null == (y = t.textBoxBounds) ? void 0 : y.h) ?? t.size.h,
          b = M && !r && 'ctr' === e && v > 0 && p + x >= v,
          w = b ? 0 : p,
          k = b ? 0 : x
        ;((n.style.paddingLeft = `${h}px`),
          (n.style.paddingTop = `${w}px`),
          (n.style.paddingRight = `${g}px`),
          (n.style.paddingBottom = `${k}px`),
          'eaVert' === r
            ? (el(n, C), (F = !0))
            : 'wordArtVert' === r
              ? (el(n, C, !0, 'vertical-lr'), (F = !0))
              : 'vert' === r
                ? (el(n, C), (F = !0))
                : 'vert270' === r &&
                  (el(n, C), _o(n, 'rotate(180deg)'), (F = !0)),
          B &&
            !i &&
            !F &&
            'none' !== u &&
            j &&
            (n.style.justifyContent = 'center'))
      }
      if (
        (null != (x = t.textBoxBounds) &&
          x.rotation &&
          0 !== t.textBoxBounds.rotation &&
          (_o(n, `rotate(${t.textBoxBounds.rotation}deg)`),
          (n.style.transformOrigin = 'center center')),
        t.flipH || t.flipV)
      ) {
        const t = n.style.transform || ''
        n.style.transform = `${t} scaleX(-1)`.trim()
      }
      let E
      const P = t.source.child('style')
      if (P.exists()) {
        const t = P.child('fontRef')
        t.exists() && t.allChildren().length > 0 && (E = rn(t, e))
      }
      const T = Wo(bt),
        z = {
          trimOuterParagraphSpacing: !0,
          defaultLineHeight: T > 1 ? '1.16' : '1.18',
          ...(E ? { fontRefColor: E } : {}),
          ...(F ? { isVerticalText: F } : {}),
          ...(r && !l
            ? (() => {
                const t =
                  !(function (t) {
                    return t.paragraphs.some((t) => {
                      const e = t.properties
                      return (
                        (null == e ? void 0 : e.child('lnSpc').exists()) ||
                        (null == e ? void 0 : e.child('spcBef').exists()) ||
                        (null == e ? void 0 : e.child('spcAft').exists())
                      )
                    })
                  })(bt) &&
                  'none' !== u &&
                  (T > 1 || Xo(bt) > 36)
                return !B || F || ('none' !== u && !j)
                  ? t
                    ? { defaultLineHeight: '1.1' }
                    : {}
                  : { compactSingleLineSpacing: !0, defaultLineHeight: '1' }
              })()
            : {}),
        }
      if (
        (_i(bt, t.placeholder, e, n, z),
        (function (t, e) {
          if (
            'camera-projected-text-plane' !== (null == e ? void 0 : e.mode) ||
            t.style.transform
          )
            return !1
          const n = io(e.bounds.width, e.bounds.height, e.corners)
          !!n &&
            ((t.dataset.pptxShape3dProjectedTextPlane = e.camera.kind),
            (t.style.transformOrigin = '0px 0px'),
            (t.style.transform = n))
        })(n, mt),
        S.appendChild(n),
        A)
      ) {
        const t = S.style.width,
          i = S.style.height,
          o = n.style.transform,
          s = n.style.transformOrigin,
          a = n.style.width,
          d = n.style.height,
          c = n.style.whiteSpace,
          h = n.style.overflowY,
          p = (null == xt ? void 0 : xt.getAttribute('width')) ?? null,
          f = (null == xt ? void 0 : xt.getAttribute('height')) ?? null,
          m =
            (null == xt ? void 0 : xt.getAttribute('preserveAspectRatio')) ??
            null,
          $ = () => {
            var $
            ;((S.style.width = t),
              (S.style.height = i),
              (n.style.transform = o),
              (n.style.transformOrigin = s),
              (n.style.width = a),
              (n.style.height = d),
              (n.style.whiteSpace = c),
              (n.style.overflowY = h),
              xt &&
                (null === p
                  ? xt.removeAttribute('width')
                  : xt.setAttribute('width', p),
                null === f
                  ? xt.removeAttribute('height')
                  : xt.setAttribute('height', f),
                null === m
                  ? xt.removeAttribute('preserveAspectRatio')
                  : xt.setAttribute('preserveAspectRatio', m)))
            const y = S.isConnected,
              x = S.style.visibility,
              v =
                null != ($ = e.measurementRoot) && $.isConnected
                  ? e.measurementRoot
                  : document.body
            y || ((S.style.visibility = 'hidden'), v.appendChild(S))
            const A = n.style.justifyContent,
              C = n.style.whiteSpace
            n.style.justifyContent = 'flex-start'
            const E = n.clientWidth,
              P = n.clientHeight,
              T = n.scrollHeight,
              z = n.scrollWidth
            let N = z,
              D = T
            const O = E > 0 && z <= E + 1,
              U = P > 0 && (T <= P || (!b && O && T <= P * (B ? 1.25 : 1.1))),
              Z = E > 0 && P > 0 && O && U,
              G = r && !l && !b && O && U && T > P && P > 0,
              X = M && O && T > P && P > 0
            let Y = !1
            ;(!F &&
              !g &&
              !Z &&
              (!O || !U || B || M || w || k) &&
              ((n.style.whiteSpace = 'nowrap'),
              (N = n.scrollWidth),
              (D = n.scrollHeight),
              (Y = !0),
              (n.style.whiteSpace = C)),
              (n.style.justifyContent = A),
              y ||
                (S.parentNode === v && v.removeChild(S),
                (S.style.visibility = x)))
            const W = Y && N > 0 ? E / N : 1
            if (
              L &&
              !Z &&
              (Wo(bt) > 1 ||
                (Y &&
                  (D <= P ||
                    (function (t) {
                      return t.paragraphs.some((t) =>
                        t.runs.some((t) => {
                          var e
                          return (
                            null != t.text &&
                            t.text.length > 0 &&
                            void 0 !==
                              (null == (e = t.properties)
                                ? void 0
                                : e.numAttr('sz'))
                          )
                        }),
                      )
                    })(bt)) &&
                  W < 0.9))
            ) {
              const t = 'none' === u ? Math.max(I, N) : Math.max(I, E),
                e = Math.max(R, T)
              return (
                (S.style.width = `${t}px`),
                (S.style.height = `${e}px`),
                (n.style.overflowX = 'visible'),
                (n.style.overflowY = 'visible'),
                void (
                  xt &&
                  (xt.setAttribute('width', String(t)),
                  xt.setAttribute('height', String(e)),
                  (t !== I || e !== R) &&
                    xt.setAttribute('preserveAspectRatio', 'none'))
                )
              )
            }
            let H = 1
            const V = w || M || k,
              q = r && !l && 'none' !== u && Y && !U && N <= E + 1 && D <= P
            if (
              (q && (n.style.whiteSpace = 'nowrap'), !g && N > E + 1 && E > 0)
            ) {
              const t = E / N
              ;(!r ||
                l ||
                (r && !l && !U && D <= P && t >= 0.9) ||
                (r && !l && B && (void 0 === u || 'none' === u || j)) ||
                M ||
                w ||
                k) &&
                (!w || t >= 0.9) &&
                (!k || t >= 0.98) &&
                (H = Math.min(H, t))
            }
            const _ = ((r && !l) || k) && H < 1 && D <= P && !U
            ;(_ && (n.style.whiteSpace = 'nowrap'),
              !V &&
                !q &&
                !_ &&
                !b &&
                !U &&
                D > P &&
                P > 0 &&
                (H = Math.min(H, P / D)),
              !V &&
                !q &&
                !_ &&
                !b &&
                1 === H &&
                !U &&
                T > P &&
                P > 0 &&
                (H = P / T),
              H < 1
                ? (n.style.transform || (n.style.transformOrigin = 'top left'),
                  _o(n, `scale(${H})`),
                  (n.style.width = tl(a, H)),
                  (n.style.height = tl(d, H)))
                : (G || X) &&
                  ('hidden' === n.style.overflowX &&
                    (n.style.overflowX = 'clip'),
                  (n.style.overflowY = 'visible')))
          },
          y = () => {
            'function' == typeof requestAnimationFrame
              ? requestAnimationFrame(() => requestAnimationFrame($))
              : setTimeout($, 0)
          }
        ;($(),
          y(),
          'loading' === (null == (v = document.fonts) ? void 0 : v.status) &&
            document.fonts.ready &&
            document.fonts.ready.then(() => y()).catch(() => {}))
      }
    }
  }
  let Mt = tt.child('effectLst')
  if (!Mt.exists()) {
    const n = t.source.child('style').child('effectRef').numAttr('idx') ?? 0
    if (
      n > 0 &&
      ((null == (b = e.theme.effectStyles) ? void 0 : b.length) ?? 0) >= n
    ) {
      const t = e.theme.effectStyles[n - 1]
      if (t.exists()) {
        const e = t.child('effectLst')
        e.exists() && (Mt = e)
      }
    }
  }
  if (Mt.exists()) {
    const n = Mt.child('outerShdw')
    if (n.exists()) {
      const i =
          'camera-projected-plane' === (null == mt ? void 0 : mt.mode)
            ? ((null == xt
                ? void 0
                : xt.querySelector(
                    'path[data-pptx-shape3d-projected-plane]',
                  )) ?? yt)
            : yt,
        r =
          'camera-projected-plane' === (null == mt ? void 0 : mt.mode)
            ? (() => {
                const t = mt.corners.map((t) => t.x),
                  e = mt.corners.map((t) => t.y),
                  n = Math.min(...t),
                  i = Math.min(...e)
                return {
                  x: n,
                  y: i,
                  w: Math.max(...t) - n,
                  h: Math.max(...e) - i,
                }
              })()
            : vt,
        o = n.numAttr('dir') ?? 0,
        l = n.numAttr('dist') ?? 0,
        s = n.numAttr('blurRad') ?? 0,
        a = n.numAttr('sx'),
        d = n.numAttr('sy'),
        c = n.attr('algn'),
        u = o / 6e4,
        h = H(l),
        p = H(s),
        f =
          'camera-projected-plane' === (null == mt ? void 0 : mt.mode) && r
            ? 'perspective' === mt.camera.kind
              ? Math.min(4, Math.max(1, r.w / Math.max(mt.bounds.width, 1)))
              : Math.min(
                  4,
                  Math.max(0.25, (r.w / Math.max(mt.bounds.width, 1)) * 0.95),
                )
            : 1,
        m =
          'camera-projected-plane' === (null == mt ? void 0 : mt.mode)
            ? { colorInterpolation: 'sRGB' }
            : {},
        $ = p * f,
        g = h * f * Math.cos((u * Math.PI) / 180),
        y = h * f * Math.sin((u * Math.PI) / 180)
      let x = 'rgba(0,0,0,0.4)',
        v = { r: 0, g: 0, b: 0 }
      const { color: b, alpha: C } = en(n, e)
      if (b) {
        const { r: t, g: e, b: n } = Me(b.startsWith('#') ? b : `#${b}`)
        ;((v = { r: t, g: e, b: n }),
          (x = `rgba(${t},${e},${n},${C.toFixed(3)})`))
      }
      const F = tt.child('effectLst'),
        B = F.children(),
        j = (null == (M = t.presetGeometry) ? void 0 : M.toLowerCase()) ?? '',
        E = e.groupChildScale,
        P = e.groupDepth ?? 0,
        T =
          (0 === P && !E) ||
          (1 === P &&
            !!E &&
            Number.isFinite(E.x) &&
            Number.isFinite(E.y) &&
            Math.abs(E.x - 1.25) <= 1e-6 &&
            Math.abs(E.y - 1.25) <= 1e-6),
        z = 0 === P && !E,
        R = 1 === P && T,
        I = ((o % 216e5) + 216e5) % 216e5,
        D =
          (null == a && null == d) ||
          (null != a &&
            null != d &&
            a > 0 &&
            d > 0 &&
            Math.abs(a - d) <= 1e-6 &&
            ul.has(a)),
        O = tt.child('solidFill').exists() && ml(et),
        U =
          tt.child('gradFill').exists() &&
          'linear' === (null == nt ? void 0 : nt.type) &&
          2 === nt.stops.length &&
          nt.stops.every((t) => ml(t.color)),
        Z = n.children(),
        G = 1 === Z.length ? Z[0] : void 0,
        X = (null == G ? void 0 : G.children()) ?? [],
        Y =
          'srgbClr' === (null == G ? void 0 : G.localName) &&
          /^[0-9a-f]{6}$/i.test(G.attr('val') ?? '') &&
          1 === X.length &&
          'alpha' === X[0].localName &&
          35e3 === X[0].numAttr('val'),
        W =
          'schemeClr' === (null == G ? void 0 : G.localName) &&
          !!G.attr('val') &&
          3 === X.length &&
          6e4 === G.child('lumMod').numAttr('val') &&
          1e4 === G.child('lumOff').numAttr('val') &&
          35e3 === G.child('alpha').numAttr('val'),
        V = null == a && null == d,
        q = null == c ? void 0 : c.toLowerCase(),
        _ =
          (z &&
            'rect' === j &&
            O &&
            Y &&
            127e3 === s &&
            null == n.attr('dist') &&
            null == n.attr('dir') &&
            V &&
            null == c) ||
          (z &&
            'roundrect' === j &&
            O &&
            Y &&
            50800 === s &&
            38100 === l &&
            54e5 === I &&
            V &&
            null == c) ||
          (z &&
            'ellipse' === j &&
            U &&
            Y &&
            101600 === s &&
            76200 === l &&
            27e5 === I &&
            V &&
            'ctr' === q) ||
          (z &&
            'rect' === j &&
            O &&
            Y &&
            115455 === s &&
            46182 === l &&
            null == n.attr('dir') &&
            102e3 === a &&
            102e3 === d &&
            'ctr' === q) ||
          (z &&
            'rect' === j &&
            O &&
            Y &&
            317500 === s &&
            127e3 === l &&
            81e5 === I &&
            92e3 === a &&
            92e3 === d &&
            'tr' === q) ||
          (R &&
            'roundrect' === j &&
            O &&
            Y &&
            76200 === s &&
            50800 === l &&
            27e5 === I &&
            V &&
            null == c) ||
          (z &&
            'rect' === j &&
            O &&
            W &&
            101600 === s &&
            50800 === l &&
            54e5 === I &&
            1e5 === a &&
            1e5 === d &&
            'b' === q),
        Q =
          al.has(s) &&
          dl.has(l) &&
          cl.has(I) &&
          (function (t) {
            if (null == t) return !0
            const e = t.toLowerCase()
            return hl.has(e)
          })(c) &&
          D &&
          Math.abs(C - 0.35) <= 1e-6 &&
          0 === (n.numAttr('kx') ?? 0) &&
          0 === (n.numAttr('ky') ?? 0) &&
          '0' === n.attr('rotWithShape') &&
          F.exists() &&
          F.child('outerShdw').element === n.element &&
          1 === B.length &&
          'outerShdw' === B[0].localName &&
          ('rect' === j || 'roundrect' === j || 'ellipse' === j) &&
          (O || U) &&
          (Y || W) &&
          !0 === (null == (w = t.line) ? void 0 : w.child('noFill').exists()) &&
          (!t.textBody || !Zo(t.textBody)) &&
          0 === t.rotation &&
          !t.flipH &&
          !t.flipV &&
          !t.shape3d &&
          !e.groupTransformHasRotationOrFlip &&
          T &&
          _
      if (null != a && null != d && a > 0 && d > 0) {
        const e = a / 1e5,
          n = d / 1e5
        if (
          Q &&
          Math.abs(e - n) <= 1e-6 &&
          Math.abs(e - 1) > 1e-6 &&
          $t &&
          xt &&
          gt &&
          yt &&
          vt &&
          $t &&
          xt &&
          gt &&
          yt &&
          vt
        )
          !(function (t, e, n, i, r, o) {
            const l = (function (t, e) {
                const n = t.x ?? 0,
                  i = t.y ?? 0,
                  r = n + t.w / 2,
                  o = i + t.h / 2,
                  l = n + t.w,
                  s = i + t.h
                return {
                  x:
                    'tl' === e || 'l' === e || 'bl' === e
                      ? n
                      : 'tr' === e || 'r' === e || 'br' === e
                        ? l
                        : r,
                  y:
                    'tl' === e || 't' === e || 'tr' === e
                      ? i
                      : 'bl' === e || 'b' === e || 'br' === e
                        ? s
                        : o,
                }
              })(r, o.alignment),
              s = 'shape-shadow-blur-' + ++ll,
              a = document.createElementNS(t, 'filter'),
              d = r.x ?? 0,
              c = r.y ?? 0,
              u = l.x + (d - l.x) * o.scaleX + o.dx,
              h = l.y + (c - l.y) * o.scaleY + o.dy,
              p = l.x + (d + r.w - l.x) * o.scaleX + o.dx,
              f = l.y + (c + r.h - l.y) * o.scaleY + o.dy,
              m = 4 * o.blur + 4
            ;(a.setAttribute('id', s),
              a.setAttribute('filterUnits', 'userSpaceOnUse'),
              a.setAttribute('x', String(Math.min(u, p) - m)),
              a.setAttribute('y', String(Math.min(h, f) - m)),
              a.setAttribute('width', String(Math.abs(p - u) + 2 * m)),
              a.setAttribute('height', String(Math.abs(f - h) + 2 * m)))
            const $ = document.createElementNS(t, 'feGaussianBlur')
            ;($.setAttribute(
              'stdDeviation',
              Math.max(0, o.blur * sl).toFixed(2),
            ),
              a.appendChild($),
              n.appendChild(a),
              n.parentNode || e.insertBefore(n, e.firstChild))
            const g = document.createElementNS(t, 'g')
            ;(g.setAttribute('data-pptx-outer-shadow', 'scaled-silhouette'),
              g.setAttribute('data-pptx-shadow-scale-x', String(o.scaleX)),
              g.setAttribute('data-pptx-shadow-scale-y', String(o.scaleY)),
              g.setAttribute('data-pptx-shadow-alignment', o.alignment),
              g.setAttribute('data-pptx-shadow-anchor-x', String(l.x)),
              g.setAttribute('data-pptx-shadow-anchor-y', String(l.y)),
              g.setAttribute('transform', `translate(${o.dx} ${o.dy})`),
              g.setAttribute('filter', `url(#${s})`))
            const y = document.createElementNS(t, 'path')
            ;(y.setAttribute('d', i.getAttribute('d') ?? ''),
              y.setAttribute(
                'transform',
                `translate(${l.x} ${l.y}) scale(${o.scaleX} ${o.scaleY}) translate(${-l.x} ${-l.y})`,
              ),
              y.setAttribute(
                'fill',
                `rgb(${o.color.r},${o.color.g},${o.color.b})`,
              ),
              y.setAttribute('fill-opacity', o.opacity.toFixed(4)),
              y.setAttribute('stroke', 'none'))
            const x = i.getAttribute('fill-rule')
            ;(x && y.setAttribute('fill-rule', x),
              g.appendChild(y),
              e.insertBefore(g, i))
          })($t, xt, gt, yt, vt, {
            dx: g,
            dy: y,
            blur: p,
            scaleX: e,
            scaleY: n,
            alignment: fl(c),
            color: v,
            opacity: C,
          })
        else {
          const o = (null == (k = t.size) ? void 0 : k.w) ?? 100,
            l = (null == (A = t.size) ? void 0 : A.h) ?? 100
          let s = o,
            a = l
          if (N || o <= 1 || l <= 1) {
            const e = (null == (L = t.line) ? void 0 : L.numAttr('w')) ?? 12700,
              n = Math.max(1, H(e))
            ;((s = n), (a = n))
          }
          const d = (s * (e - 1)) / 2,
            u = (a * (n - 1)) / 2,
            h = Math.max(0, (d + u) / 2)
          let $ = 0,
            M = 0
          if (c) {
            const t = c.toLowerCase()
            ;(('t' === t || 'tl' === t || 'tr' === t) &&
              (M = (a * (n - 1)) / 2),
              ('b' === t || 'bl' === t || 'br' === t) &&
                (M = (-a * (n - 1)) / 2),
              ('l' === t || 'tl' === t || 'bl' === t) &&
                ($ = (s * (e - 1)) / 2),
              ('r' === t || 'tr' === t || 'br' === t) &&
                ($ = (-s * (e - 1)) / 2))
          }
          const w = h > 0 ? Math.min(p, 3 * h) : p
          let F = C
          if ((h > 0 && p > 0 && h < p && (F = C * (h / p)), F >= 0.01)) {
            const t = g + $,
              e = y + M
            let n = x
            if (b) {
              const { r: t, g: e, b: i } = Me(b.startsWith('#') ? b : `#${b}`)
              ;((v = { r: t, g: e, b: i }),
                (n = `rgba(${t},${e},${i},${F.toFixed(4)})`))
            }
            !N && $t && gt && i && r
              ? pl($t, gt, i, r, {
                  dx: t,
                  dy: e,
                  blur: w * f,
                  color: v,
                  opacity: F,
                  ...m,
                })
              : (S.style.boxShadow = `${t.toFixed(1)}px ${e.toFixed(1)}px ${w.toFixed(1)}px ${h.toFixed(1)}px ${n}`)
          }
        }
      } else
        !N && $t && gt && i && r
          ? pl($t, gt, i, r, {
              dx: g,
              dy: y,
              blur: $,
              color: v,
              opacity: C,
              stdDeviationScale: Q && 0 === l ? 0.375 : void 0,
              ...m,
            })
          : Qo(
              S,
              `drop-shadow(${g.toFixed(1)}px ${y.toFixed(1)}px ${p.toFixed(1)}px ${x})`,
            )
    }
    const i = Mt.child('glow')
    i.exists() && Jo(S, i, e)
    const r = Mt.child('softEdge')
    if (r.exists() && !N && $t && gt && yt && vt) {
      const t = H(r.numAttr('rad') ?? 0)
      t > 0 &&
        (function (t, e, n, i, r) {
          const o = 'shape-soft-edge-' + ++ll,
            l = document.createElementNS(t, 'filter'),
            s = Math.max(4 * r + 4, i.w, i.h)
          ;(l.setAttribute('id', o),
            l.setAttribute('filterUnits', 'userSpaceOnUse'),
            l.setAttribute('x', String(-s)),
            l.setAttribute('y', String(-s)),
            l.setAttribute('width', String(i.w + 2 * s)),
            l.setAttribute('height', String(i.h + 2 * s)))
          const a = document.createElementNS(t, 'feGaussianBlur')
          ;(a.setAttribute('in', 'SourceGraphic'),
            a.setAttribute('stdDeviation', Math.max(0, r / 2).toFixed(2)),
            l.appendChild(a),
            e.appendChild(l),
            !e.parentNode &&
              n.ownerSVGElement &&
              n.ownerSVGElement.insertBefore(e, n.ownerSVGElement.firstChild))
          const d = n.parentNode
          if (!d) return
          const c = document.createElementNS(t, 'g')
          ;(c.setAttribute('filter', `url(#${o})`),
            d.insertBefore(c, n),
            c.appendChild(n))
        })($t, gt, yt, vt, t)
    }
    const o = Mt.child('innerShdw')
    if (o.exists() && !N && $t && gt && yt && vt) {
      const t = o.numAttr('dir') ?? 0,
        n = H(o.numAttr('dist') ?? 0),
        i = H(o.numAttr('blurRad') ?? 0),
        r = t / 6e4,
        l = n * Math.cos((r * Math.PI) / 180),
        s = n * Math.sin((r * Math.PI) / 180),
        { color: a, alpha: d } = en(o, e)
      if (a && d > 0) {
        !(function (t, e, n, i, r) {
          const o = 'shape-inner-shadow-' + ++ll,
            l = document.createElementNS(t, 'filter'),
            s = Math.max(Math.abs(r.dx), Math.abs(r.dy)) + 4 * r.blur + 4
          ;(l.setAttribute('id', o),
            l.setAttribute('filterUnits', 'userSpaceOnUse'),
            l.setAttribute('x', String(-s)),
            l.setAttribute('y', String(-s)),
            l.setAttribute('width', String(i.w + 2 * s)),
            l.setAttribute('height', String(i.h + 2 * s)))
          const a = document.createElementNS(t, 'feOffset')
          ;(a.setAttribute('in', 'SourceAlpha'),
            a.setAttribute('dx', r.dx.toFixed(1)),
            a.setAttribute('dy', r.dy.toFixed(1)),
            a.setAttribute('result', 'innerOffset'),
            l.appendChild(a))
          const d = document.createElementNS(t, 'feGaussianBlur')
          ;(d.setAttribute('in', 'innerOffset'),
            d.setAttribute('stdDeviation', Math.max(0, r.blur / 2).toFixed(2)),
            d.setAttribute('result', 'innerBlur'),
            l.appendChild(d))
          const c = document.createElementNS(t, 'feComposite')
          ;(c.setAttribute('in', 'innerBlur'),
            c.setAttribute('in2', 'SourceAlpha'),
            c.setAttribute('operator', 'in'),
            c.setAttribute('result', 'innerMask'),
            l.appendChild(c))
          const u = document.createElementNS(t, 'feFlood')
          ;(u.setAttribute(
            'flood-color',
            `rgb(${r.color.r},${r.color.g},${r.color.b})`,
          ),
            u.setAttribute('flood-opacity', r.opacity.toFixed(4)),
            u.setAttribute('result', 'innerColor'),
            l.appendChild(u))
          const h = document.createElementNS(t, 'feComposite')
          ;(h.setAttribute('in', 'innerColor'),
            h.setAttribute('in2', 'innerMask'),
            h.setAttribute('operator', 'in'),
            h.setAttribute('result', 'innerShadow'),
            l.appendChild(h))
          const p = document.createElementNS(t, 'feMerge'),
            f = document.createElementNS(t, 'feMergeNode')
          f.setAttribute('in', 'SourceGraphic')
          const m = document.createElementNS(t, 'feMergeNode')
          ;(m.setAttribute('in', 'innerShadow'),
            p.appendChild(f),
            p.appendChild(m),
            l.appendChild(p),
            e.appendChild(l),
            !e.parentNode &&
              n.ownerSVGElement &&
              n.ownerSVGElement.insertBefore(e, n.ownerSVGElement.firstChild),
            n.setAttribute('filter', `url(#${o})`))
        })($t, gt, yt, vt, {
          dx: l,
          dy: s,
          blur: i,
          color: Me(a.startsWith('#') ? a : `#${a}`),
          opacity: d,
        })
      }
    }
    const l = Mt.child('reflection')
    l.exists() && Vn(S, l, { w: I, h: R })
  }
  if (t.hlinkClick && e.onNavigate) {
    const { action: n, rId: i } = t.hlinkClick,
      r = i ? e.slide.rels.get(i) : void 0,
      o = gi(e, n, r)
    void 0 !== o
      ? ((S.style.cursor = 'pointer'),
        (S.title = t.hlinkClick.tooltip || yi(o)),
        S.addEventListener('click', (t) => {
          ;(t.stopPropagation(), e.onNavigate({ slideIndex: o }))
        }))
      : i &&
        r &&
        G(r.targetMode) &&
        kn(r.target) &&
        ((S.style.cursor = 'pointer'),
        (S.title = t.hlinkClick.tooltip || r.target),
        S.addEventListener('click', (t) => {
          ;(t.stopPropagation(), e.onNavigate({ url: r.target }))
        }))
  }
  return S
}
var Yl = [37, 80, 68, 70],
  Wl = [37, 37, 69, 79, 70]
function Hl(t, e, n, i) {
  if (n + 16 > t.length) return null
  if (1128875079 === e.getUint32(n + 12, !0) && n + 20 <= t.length) {
    const r = e.getUint32(n + 16, !0)
    if (2 === r) {
      const e = Vl(t.subarray(n + 8, n + i))
      if (e) return { type: 'pdf', data: e }
    }
    if (1073741828 === r && n + 24 <= t.length) {
      const i = (function (t, e, n) {
        if (n + 40 > t.length) return null
        const i = e.getUint32(n + 36, !0),
          r = n + 40
        for (let o = 0; o < i && o < 10; o++) {
          const i = r + 16 * o
          if (i + 16 > t.length) break
          const l = e.getUint32(i + 8, !0),
            s = n + e.getUint32(i + 12, !0)
          if (s + l > t.length || 0 === l) continue
          const a = Vl(t.subarray(s, s + l))
          if (a) return { type: 'pdf', data: a }
        }
        return null
      })(t, e, n)
      if (i) return i
    }
  }
  if (i > 100) {
    const e = Vl(t.subarray(n + 8, n + i))
    if (e) return { type: 'pdf', data: e }
  }
  return null
}
function Vl(t) {
  const e = (function (t, e) {
    const n = t.length - e.length
    for (let i = 0; i <= n; i++) if (_l(t, i, e)) return i
    return -1
  })(t, Yl)
  if (-1 === e) return null
  let n = -1
  for (let i = t.length - Wl.length; i >= e; i--)
    if (_l(t, i, Wl)) {
      n = i + Wl.length
      break
    }
  return (-1 === n && (n = t.length), t.slice(e, n))
}
function ql(t, e, n, i) {
  if (n + 80 > t.length) return null
  const r = e.getUint32(n + 48, !0),
    o = e.getUint32(n + 52, !0),
    l = e.getUint32(n + 56, !0),
    s = e.getUint32(n + 60, !0)
  if (0 === o || 0 === s) return null
  const a = n + r
  if (a + 40 > t.length) return null
  const d = e.getInt32(a + 4, !0),
    c = e.getInt32(a + 8, !0),
    u = e.getUint16(a + 14, !0)
  if (0 !== e.getUint32(a + 16, !0) || (24 !== u && 32 !== u)) return null
  const h = Math.abs(d),
    p = Math.abs(c)
  if (0 === h || 0 === p || h > 8192 || p > 8192 || h * p > 16777216)
    return null
  const f = n + l
  if (f + s > t.length) return null
  const m = u / 8,
    $ = 4 * Math.ceil((h * m) / 4),
    g = $ * p
  if (s < g) return null
  const y = t.subarray(f, f + g),
    x = c < 0,
    v = new ImageData(h, p)
  for (let b = 0; b < p; b++) {
    const t = (x ? b : p - 1 - b) * $,
      e = b * h * 4
    for (let n = 0; n < h; n++) {
      const i = t + n * m
      if (i + m > y.length) break
      ;((v.data[e + 4 * n + 0] = y[i + 2]),
        (v.data[e + 4 * n + 1] = y[i + 1]),
        (v.data[e + 4 * n + 2] = y[i + 0]),
        (v.data[e + 4 * n + 3] = 32 === u ? y[i + 3] : 255))
    }
  }
  return { type: 'bitmap', imageData: v }
}
function _l(t, e, n) {
  for (let i = 0; i < n.length; i++) if (t[e + i] !== n[i]) return !1
  return !0
}
var Ql = null,
  Kl = null
function Jl(t) {
  try {
    const e = import.meta.resolve
    if ('function' == typeof e) return e(t)
  } catch {}
  return null
}
function ts(t, e) {
  if (!t || 'object' != typeof t) return null
  const n = t[e]
  return 'string' != typeof n ? null : n.trim() || null
}
function es(t) {
  return !1 === t
    ? null
    : (ts(t, 'moduleUrl') ??
        (null !== Ql
          ? Ql
          : (Ql = Jl('pdfjs-dist/build/pdf.min.mjs') ?? '') || null))
}
function ns(t) {
  return !1 === t
    ? null
    : (ts(t, 'workerUrl') ??
        (null !== Kl
          ? Kl
          : (Kl = Jl('pdfjs-dist/build/pdf.worker.min.mjs') ?? '') || null))
}
var is = 0,
  rs = []
function os() {
  for (; is < 4;) {
    const t = rs.shift()
    if (!t) return
    t.start()
  }
}
async function ls(t, e, n, i, r) {
  if (null != r && r.aborted) return null
  const o = es(i),
    l = ns(i)
  if (!o || !l || typeof OffscreenCanvas > 'u' || typeof Worker > 'u')
    return null
  try {
    const i = await (function (t, e) {
      return null != e && e.aborted
        ? Promise.resolve(null)
        : new Promise((n) => {
            let i = !1,
              r = !1
            const o = (t) => {
                r || ((r = !0), n(t))
              },
              l = {
                start: () => {
                  r ||
                    ((i = !0),
                    e?.removeEventListener('abort', l.cancel),
                    (is += 1),
                    Promise.resolve()
                      .then(t)
                      .then(o, () => o(null))
                      .finally(() => {
                        ;((is -= 1), os())
                      }))
                },
                cancel: () => {
                  if (i || r) return
                  const t = rs.indexOf(l)
                  ;(t >= 0 && rs.splice(t, 1),
                    e?.removeEventListener('abort', l.cancel),
                    o(null))
                },
              }
            ;(e?.addEventListener('abort', l.cancel, { once: !0 }),
              rs.push(l),
              os())
          })
    })(
      () =>
        (function (t, e, n, i, r, o) {
          return null != o && o.aborted
            ? Promise.resolve(null)
            : new Promise((l) => {
                let s,
                  a = null,
                  d = !1
                const c = (t) => {
                    d ||
                      ((d = !0),
                      void 0 !== s && clearTimeout(s),
                      o?.removeEventListener('abort', u),
                      a &&
                        ((a.onmessage = null),
                        (a.onerror = null),
                        a.terminate(),
                        (a = null)),
                      l(t))
                  },
                  u = () => c(null)
                try {
                  const l = new Blob(
                      [
                        "\nlet pdfjsLib = null;\n\n// PDF.js resolves its nested worker through browser window APIs. Aliasing\n// this isolated worker global keeps it on the real-worker path; otherwise its\n// fake-worker fallback would bind to this worker's message port.\nglobalThis.window = globalThis;\n\nself.onmessage = async (e) => {\n  const { id, pdfData, width, height, pdfjsUrl, pdfWorkerUrl } = e.data;\n  try {\n    if (!pdfjsLib) {\n      pdfjsLib = await import(pdfjsUrl);\n      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;\n    }\n\n    const loadingTask = pdfjsLib.getDocument({ data: pdfData });\n    let doc = null;\n    try {\n      doc = await loadingTask.promise;\n      if (doc.numPages < 1) {\n        self.postMessage({ id, error: 'no pages' });\n        return;\n      }\n      const page = await doc.getPage(1);\n      const vp = page.getViewport({ scale: 1 });\n      const scale = Math.max(width / vp.width, height / vp.height);\n      const svp = page.getViewport({ scale });\n\n      const canvas = new OffscreenCanvas(Math.ceil(svp.width), Math.ceil(svp.height));\n      const ctx = canvas.getContext('2d', { alpha: true });\n      await page.render({ canvasContext: ctx, viewport: svp, background: 'rgba(0,0,0,0)' }).promise;\n\n      const blob = await canvas.convertToBlob({ type: 'image/png' });\n      self.postMessage({ id, blob });\n    } finally {\n      if (typeof loadingTask.destroy === 'function') {\n        await loadingTask.destroy();\n      } else if (doc && typeof doc.destroy === 'function') {\n        await doc.destroy();\n      }\n    }\n  } catch (err) {\n    self.postMessage({ id, error: String(err) });\n  }\n};\n",
                      ],
                      { type: 'text/javascript' },
                    ),
                    d = URL.createObjectURL(l)
                  try {
                    a = new Worker(d, { type: 'module' })
                  } finally {
                    URL.revokeObjectURL(d)
                  }
                  ;((a.onmessage = (t) => {
                    const { blob: e, error: n } = t.data
                    c(n ? null : (e ?? null))
                  }),
                    (a.onerror = () => c(null)),
                    o?.addEventListener('abort', u, { once: !0 }))
                  const h = t.slice()
                  ;(a.postMessage(
                    {
                      id: 1,
                      pdfData: h,
                      width: e,
                      height: n,
                      pdfjsUrl: i,
                      pdfWorkerUrl: r,
                    },
                    [h.buffer],
                  ),
                    (s = setTimeout(() => c(null), 15e3)))
                } catch {
                  c(null)
                }
              })
        })(t, e, n, o, l, r),
      r,
    )
    if (i && (null == r || !r.aborted)) return URL.createObjectURL(i)
  } catch {}
  return null
}
function ss(t) {
  var e
  return (
    'wmf' ===
    ((null == (e = t.split('.').pop()) ? void 0 : e.toLowerCase()) || '')
  )
}
var as = 0
function ds(t, e) {
  var n, i
  const r = document.createElement('div')
  ;((r.style.position = 'absolute'),
    (r.style.left = `${t.position.x}px`),
    (r.style.top = `${t.position.y}px`),
    (r.style.width = `${t.size.w}px`),
    (r.style.height = `${t.size.h}px`),
    (r.style.overflow = 'hidden'))
  const o = ps(t),
    l = []
  if (
    (0 !== t.rotation && l.push(`rotate(${t.rotation}deg)`),
    t.flipH && !o && l.push('scaleX(-1)'),
    t.flipV && !o && l.push('scaleY(-1)'),
    l.length > 0 && (r.style.transform = l.join(' ')),
    (function (t, e, n) {
      ;((function (t, e, n) {
        const i = sn(e.source.child('spPr'), n)
        i &&
          (function (t, e) {
            if (
              ((function (t) {
                ;((t.style.background = ''),
                  (t.style.backgroundColor = ''),
                  (t.style.backgroundImage = ''),
                  (t.style.backgroundRepeat = ''),
                  (t.style.backgroundSize = ''))
              })(t),
              e.includes('gradient') && e.includes(' 0 0 / '))
            ) {
              const n = Sn(e)
              if (n)
                return (
                  (t.style.backgroundImage = n.imageLayers),
                  (t.style.backgroundSize = '8px 8px'),
                  (t.style.backgroundRepeat = 'repeat'),
                  void (t.style.backgroundColor = n.color)
                )
            }
            e.includes('gradient') ||
            e.startsWith('url(') ||
            e.includes('repeating-')
              ? (t.style.background = e)
              : (t.style.backgroundColor = e)
          })(t, i)
      })(t, e, n),
        (function (t, e, n) {
          const i = fs(e, n)
          i &&
            ((t.style.boxSizing = 'border-box'),
            (t.style.border = `${i.width}px ${i.dash} ${i.color}`))
        })(t, e, n),
        (function (t, e, n) {
          const i = e.source.child('spPr').child('effectLst')
          if (!i.exists()) return
          const r = i.child('outerShdw')
          r.exists() &&
            (function (t, e, n, i) {
              const r = n.numAttr('dir') ?? 0,
                o = H(n.numAttr('dist') ?? 0),
                l = H(n.numAttr('blurRad') ?? 0),
                s = r / 6e4,
                a = o * Math.cos((s * Math.PI) / 180),
                d = o * Math.sin((s * Math.PI) / 180),
                c = (function (t, e, n) {
                  const { color: i, alpha: r } = en(t, e)
                  if (!i) return n
                  const {
                    r: o,
                    g: l,
                    b: s,
                  } = Me(i.startsWith('#') ? i : `#${i}`)
                  return `rgba(${o},${l},${s},${r.toFixed(3)})`
                })(n, i, 'rgba(0,0,0,0.4)'),
                u = n.numAttr('sx'),
                h = n.numAttr('sy')
              if (null != u && null != h && u > 0 && h > 0) {
                const n = u / 1e5,
                  i = h / 1e5,
                  r = (e.size.w * (n - 1)) / 2,
                  o = (e.size.h * (i - 1)) / 2,
                  s = Math.max(0, (r + o) / 2)
                return void (t.style.boxShadow = `${a.toFixed(1)}px ${d.toFixed(1)}px ${l.toFixed(1)}px ${s.toFixed(1)}px ${c}`)
              }
              ms(
                t,
                `drop-shadow(${a.toFixed(1)}px ${d.toFixed(1)}px ${l.toFixed(1)}px ${c})`,
              )
            })(t, e, r, n)
          const o = i.child('glow')
          o.exists() &&
            (function (t, e, n) {
              const i = H(e.numAttr('rad') ?? 0)
              if (!(i > 0)) return
              const { color: r, alpha: o } = en(e, n)
              if (!r || o <= 0) return
              const { r: l, g: s, b: a } = Me(r.startsWith('#') ? r : `#${r}`)
              ms(
                t,
                `drop-shadow(0px 0px ${i.toFixed(1)}px rgba(${l},${s},${a},${o.toFixed(3)}))`,
              )
            })(t, o, n)
          const l = i.child('softEdge')
          l.exists() &&
            (function (t, e, n) {
              const i = H(n.numAttr('rad') ?? 0)
              if (!(i > 0)) return
              const r = Math.max(0, Math.min(e.size.w, e.size.h) / 2),
                o = `${Number((r > 0 ? Math.min(i, r) : i).toFixed(4))}px`,
                l = 'var(--pptx-soft-edge-radius)',
                s = [
                  `linear-gradient(to right, transparent 0, black ${l}, black calc(100% - ${l}), transparent 100%)`,
                  `linear-gradient(to bottom, transparent 0, black ${l}, black calc(100% - ${l}), transparent 100%)`,
                ].join(', ')
              ;(t.style.setProperty('--pptx-soft-edge-radius', o),
                t.style.setProperty('-webkit-mask-image', s),
                t.style.setProperty('mask-image', s),
                t.style.setProperty('-webkit-mask-size', '100% 100%'),
                t.style.setProperty('mask-size', '100% 100%'),
                t.style.setProperty('-webkit-mask-repeat', 'no-repeat'),
                t.style.setProperty('mask-repeat', 'no-repeat'),
                t.style.setProperty('-webkit-mask-composite', 'source-in'),
                t.style.setProperty('mask-composite', 'intersect'))
              const a = t.style
              ;((a.webkitMaskImage = s),
                (a.maskImage = s),
                (a.webkitMaskComposite = 'source-in'),
                (a.maskComposite = 'intersect'))
            })(t, e, l)
          const s = i.child('reflection')
          s.exists() &&
            (function (t, e) {
              const n = H(e.numAttr('dist') ?? 0),
                i = (e.numAttr('stA') ?? 5e4) / 1e5,
                r = (e.numAttr('endA') ?? 0) / 1e5,
                o = Math.max(0, Math.min(100, (e.numAttr('stPos') ?? 0) / 1e3)),
                l = Math.max(
                  0,
                  Math.min(100, (e.numAttr('endPos') ?? 1e5) / 1e3),
                ),
                s = `linear-gradient(to bottom, rgba(255,255,255,${i.toFixed(3)}) ${o.toFixed(1)}%, rgba(255,255,255,${r.toFixed(3)}) ${l.toFixed(1)}%)`,
                a = `below ${n.toFixed(1)}px ${s}`
              ;(t.style.setProperty('-webkit-box-reflect', a),
                (t.style.webkitBoxReflect = a))
            })(t, s)
        })(t, e, n),
        (function (t, e, n) {
          if (!e.hlinkClick || !n.onNavigate) return
          const { action: i, rId: r } = e.hlinkClick,
            o = r ? n.slide.rels.get(r) : void 0,
            l = gi(n, i, o)
          if (void 0 !== l)
            return (
              (t.style.cursor = 'pointer'),
              (t.title = e.hlinkClick.tooltip || yi(l)),
              void t.addEventListener('click', (t) => {
                ;(t.stopPropagation(), n.onNavigate({ slideIndex: l }))
              })
            )
          r &&
            (!o ||
              !G(o.targetMode) ||
              !kn(o.target) ||
              ((t.style.cursor = 'pointer'),
              (t.title = e.hlinkClick.tooltip || o.target),
              t.addEventListener('click', (t) => {
                ;(t.stopPropagation(), n.onNavigate({ url: o.target }))
              })))
        })(t, e, n))
    })(r, t, e),
    t.isVideo)
  )
    return (
      (function (t, e, n) {
        $s(t, e, n, 'video')
      })(t, e, r),
      r
    )
  if (t.isAudio)
    return (
      (function (t, e, n) {
        $s(t, e, n, 'audio')
      })(t, e, r),
      r
    )
  const s = t.blipEmbed
  let a
  if (s) {
    const i = e.slide.rels.get(s)
    if (!i) return (ys(r, 'Missing image reference'), r)
    if (!G(i.targetMode)) {
      const o = L(i.target)
      if (ss(o))
        return (
          (function (t, e) {
            var n
            const i =
                (null == (n = e.split('.').pop()) ? void 0 : n.toUpperCase()) ||
                'Unknown',
              r = document.createElement('div')
            ;((r.style.width = '100%'),
              (r.style.height = '100%'),
              (r.style.display = 'flex'),
              (r.style.flexDirection = 'column'),
              (r.style.alignItems = 'center'),
              (r.style.justifyContent = 'center'),
              (r.style.backgroundColor = '#f5f5f5'),
              (r.style.color = '#999'),
              (r.style.fontSize = '11px'),
              (r.style.border = '1px dashed #ddd'))
            const o = document.createElement('div')
            ;((o.style.fontSize = '24px'),
              (o.style.marginBottom = '4px'),
              (o.textContent = '🖼'))
            const l = document.createElement('div')
            ;((l.textContent = `Unsupported format: ${i}`),
              r.appendChild(o),
              r.appendChild(l),
              t.appendChild(r))
          })(r, o),
          r
        )
      const l = C(i.target, e.presentation.media)
      if (!l) {
        if (e.presentation.mediaResolver) {
          const o = F(
            i.target,
            e.presentation.media,
            e.presentation.mediaResolver,
          )
            .then((n) => {
              var i
              if (null == (i = e.signal) || !i.aborted)
                return n
                  ? cs(t, e, r, n.mediaPath, n.data)
                  : void ys(r, 'Image not found')
            })
            .catch(() => {
              var t
              ;(null != (t = e.signal) && t.aborted) || ys(r, 'Image not found')
            })
          return (null == (n = e.asyncTasks) || n.push(o), e.asyncTasks, r)
        }
        return (ys(r, 'Image not found'), r)
      }
      return (cs(t, e, r, l.mediaPath, l.data), r)
    }
    if (((a = An(i.target) ? i.target : void 0), !a))
      return (ys(r, 'Image not found'), r)
  } else {
    if (!t.blipLink) return (ys(r, 'No image data'), r)
    {
      const n = gs(t.blipLink, e)
      if (n instanceof Promise) {
        const o = n.then((n) => {
          var i
          ;(null != (i = e.signal) && i.aborted) ||
            (n ? us(t, e, r, n) : ys(r, 'Image not found'))
        })
        return (null == (i = e.asyncTasks) || i.push(o), r)
      }
      if (((a = n), !a)) return (ys(r, 'Image not found'), r)
    }
  }
  return (us(t, e, r, a), r)
}
function cs(t, e, n, i, r) {
  var o
  if (null == (o = e.signal) || !o.aborted)
    return (function (t) {
      var e
      return (
        'emf' ===
        ((null == (e = t.split('.').pop()) ? void 0 : e.toLowerCase()) || '')
      )
    })(i)
      ? (function (t, e, n, i, r) {
          const o = (function (t) {
            if (t.length < 44) return { type: 'unsupported' }
            const e = new DataView(t.buffer, t.byteOffset, t.byteLength)
            if (1179469088 !== e.getUint32(40, !0))
              return { type: 'unsupported' }
            let n = 0,
              i = 0
            for (; n + 8 <= t.length;) {
              const r = e.getUint32(n, !0),
                o = e.getUint32(n + 4, !0)
              if (o < 8 || n + o > t.length || (i++, 14 === r)) break
              if (70 === r && o > 16) {
                const i = Hl(t, e, n, o)
                if (i) return i
              }
              if (81 === r && o > 80) {
                const i = ql(t, e, n)
                if (i) return i
              }
              n += o
            }
            return i <= 2 ? { type: 'empty' } : { type: 'unsupported' }
          })(t)
          switch (o.type) {
            case 'pdf':
              return (function (t, e, n, i, r) {
                var o
                const l = `${r}:emf-pdf`,
                  s = i.mediaUrlCache.get(l)
                if (s) return void e.appendChild(xs(s))
                const a = ls(t, n.size.w, n.size.h, i.pdfjs, i.signal)
                  .then((t) => {
                    var n
                    if (!t) return
                    if (null != (n = i.signal) && n.aborted)
                      return void URL.revokeObjectURL(t)
                    const r = i.mediaUrlCache.get(l)
                    r
                      ? (URL.revokeObjectURL(t), e.appendChild(xs(r)))
                      : (i.mediaUrlCache.set(l, t), e.appendChild(xs(t)))
                  })
                  .catch(() => {})
                return (null == (o = i.asyncTasks) || o.push(a), a)
              })(o.data, i, e, n, r)
            case 'bitmap':
              return (function (t, e, n, i) {
                var r
                const o = `${i}:emf-bitmap`,
                  l = n.mediaUrlCache.get(o)
                if (l) return void e.appendChild(xs(l))
                const s = document.createElement('canvas')
                ;((s.width = t.width), (s.height = t.height))
                const a = s.getContext('2d')
                if (!a) return
                a.putImageData(t, 0, 0)
                const d = new Promise((t) => {
                  s.toBlob((i) => {
                    var r
                    if (i && (null == (r = n.signal) || !r.aborted)) {
                      const t = n.mediaUrlCache.get(o) ?? URL.createObjectURL(i)
                      ;(n.mediaUrlCache.set(o, t), e.appendChild(xs(t)))
                    }
                    t()
                  }, 'image/png')
                })
                return (null == (r = n.asyncTasks) || r.push(d), d)
              })(o.imageData, i, n, r)
          }
        })(r instanceof Uint8Array ? r : new Uint8Array(r), t, e, n, i)
      : void us(t, e, n, B(i, r, e.mediaUrlCache))
}
function us(t, e, n, i) {
  var r
  const o = t.source.child('blipFill'),
    l = o.child('blip'),
    s = (function (t) {
      let e = 1
      const n = t.child('alphaModFix')
      n.exists() && (e *= (n.numAttr('amt') ?? 1e5) / 1e5)
      const i = t.child('alphaMod')
      i.exists() && (e *= (i.numAttr('val') ?? 1e5) / 1e5)
      const r = t.child('alphaOff')
      return (
        r.exists() && (e += (r.numAttr('val') ?? 0) / 1e5),
        Math.max(0, Math.min(1, e))
      )
    })(l),
    a = o.child('tile'),
    d = o.child('stretch'),
    c = d.child('fillRect'),
    u = fs(t, e),
    h = t.source.child('spPr'),
    p = Po(
      t.shape3d,
      {
        nodeType: 'picture',
        presetGeometry: t.presetGeometry,
        width: t.size.w,
        height: t.size.h,
        paintKind: 'picture',
        isTiledPicture: a.exists(),
        hasStretchMode: d.exists(),
        hasStretchFillRect: c.exists(),
        hasBlipEffects: l.allChildren().length > 0,
        hasPictureBackgroundFill: [
          'solidFill',
          'gradFill',
          'pattFill',
          'blipFill',
          'grpFill',
        ].some((t) => h.child(t).exists()),
        hasCustomGeometry:
          (null == (r = t.customGeometry) ? void 0 : r.exists()) ?? !1,
        hasStyleReference: t.source.child('style').exists(),
        hasVisibleStroke: void 0 !== u,
        rotation: t.rotation,
        flipH: t.flipH,
        flipV: t.flipV,
        sourceCrop: t.crop,
      },
      e,
    )
  if (a.exists())
    return (
      (n.style.backgroundImage = `url("${i}")`),
      (n.style.backgroundRepeat = 'repeat'),
      (n.style.backgroundSize = 'auto'),
      void (s < 1 && (n.style.opacity = `${Number(s.toFixed(4))}`))
    )
  const f = c.exists()
      ? (function (t) {
          const e = hs(t, 'l'),
            n = hs(t, 't'),
            i = hs(t, 'r'),
            r = hs(t, 'b')
          return { left: e, top: n, width: 100 - e - i, height: 100 - n - r }
        })(c)
      : void 0,
    m = ps(t),
    $ =
      'orthographic-top-bevel' === p.mode
        ? (m ?? `M0,0 L${t.size.w},0 L${t.size.w},${t.size.h} L0,${t.size.h} Z`)
        : m
  if ($) {
    const r = 'orthographic-top-bevel' === p.mode ? u : void 0
    return (
      'orthographic-top-bevel' === p.mode &&
        ((n.style.overflow = 'visible'),
        r && ((n.style.border = ''), (n.style.boxSizing = ''))),
      (function (t, e, n, i, r, o, l, s, a) {
        const d = 'http://www.w3.org/2000/svg',
          c = document.createElementNS(d, 'svg')
        ;(c.setAttribute('viewBox', `0 0 ${t.size.w} ${t.size.h}`),
          c.setAttribute('width', '100%'),
          c.setAttribute('height', '100%'),
          (c.style.display = 'block'),
          (c.style.overflow =
            'orthographic-top-bevel' === (null == s ? void 0 : s.mode)
              ? 'visible'
              : 'hidden'))
        const u = 'picture-clip-' + as++,
          h = document.createElementNS(d, 'defs'),
          p = document.createElementNS(d, 'clipPath')
        ;(p.setAttribute('id', u),
          p.setAttribute('clipPathUnits', 'userSpaceOnUse'))
        const f = document.createElementNS(d, 'path')
        f.setAttribute('d', i)
        const m = (function (t) {
          if (t.flipH && t.flipV)
            return `translate(${t.size.w} ${t.size.h}) scale(-1 -1)`
          if (t.flipH) return `translate(${t.size.w} 0) scale(-1 1)`
          if (t.flipV) return `translate(0 ${t.size.h}) scale(1 -1)`
        })(t)
        ;(m && f.setAttribute('transform', m),
          p.appendChild(f),
          h.appendChild(p),
          c.appendChild(h))
        const $ = document.createElementNS(d, 'image')
        ;($.setAttribute('href', n),
          $.setAttribute('preserveAspectRatio', 'none'),
          (function (t, e, n, i, r) {
            const o = 'http://www.w3.org/2000/svg',
              l = document.createElementNS(o, 'filter')
            ;((l.id = `${r}-effects`),
              l.setAttribute('color-interpolation-filters', 'sRGB'))
            const s = () => {
                const t = document.createElementNS(o, 'feColorMatrix')
                ;(t.setAttribute('type', 'matrix'),
                  t.setAttribute(
                    'values',
                    '0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0',
                  ),
                  l.appendChild(t))
              },
              a = (t) => {
                const e = document.createElementNS(o, 'feComponentTransfer')
                for (const [n, i] of ['R', 'G', 'B'].entries()) {
                  const r = document.createElementNS(o, `feFunc${i}`)
                  ;(r.setAttribute('type', 'linear'),
                    r.setAttribute('slope', String(t[n].slope)),
                    r.setAttribute('intercept', String(t[n].intercept)),
                    e.appendChild(r))
                }
                l.appendChild(e)
              }
            n.child('grayscl').exists() && s()
            const d = n
              .child('duotone')
              .allChildren()
              .map((t) => en(t, i).color)
            if (d.length >= 2 && d[0] && d[1]) {
              const t = Me(d[0]),
                e = Me(d[1])
              ;(s(),
                a(
                  ['r', 'g', 'b'].map((n) => ({
                    slope: (e[n] - t[n]) / 255,
                    intercept: t[n] / 255,
                  })),
                ))
            }
            const c = n.child('lum')
            if (c.exists()) {
              const t = (c.numAttr('contrast') ?? 0) / 1e5,
                e = (c.numAttr('bright') ?? 0) / 1e5
              a(
                Array.from({ length: 3 }, () => ({
                  slope: 1 + t,
                  intercept: e - t / 2,
                })),
              )
            }
            const u = n.child('biLevel')
            if (u.exists()) {
              s()
              const t = (u.numAttr('thresh') ?? 5e4) / 1e5
              a(
                Array.from({ length: 3 }, () => ({
                  slope: 1,
                  intercept: 0.5 - t,
                })),
              )
              const e = document.createElementNS(o, 'feComponentTransfer')
              for (const n of ['R', 'G', 'B']) {
                const t = document.createElementNS(o, `feFunc${n}`)
                ;(t.setAttribute('type', 'discrete'),
                  t.setAttribute('tableValues', '0 1'),
                  e.appendChild(t))
              }
              l.appendChild(e)
            }
            l.children.length &&
              (e.appendChild(l), t.setAttribute('filter', `url(#${l.id})`))
          })($, h, r, o, u),
          m && $.setAttribute('transform', m))
        const g = document.createElementNS(d, 'g')
        g.setAttribute('clip-path', `url(#${u})`)
        let y = (((null == l ? void 0 : l.left) ?? 0) / 100) * t.size.w,
          x = (((null == l ? void 0 : l.top) ?? 0) / 100) * t.size.h,
          v = (((null == l ? void 0 : l.width) ?? 100) / 100) * t.size.w,
          b = (((null == l ? void 0 : l.height) ?? 100) / 100) * t.size.h
        if (t.crop) {
          const { top: e, right: n, bottom: i, left: r } = t.crop,
            o = 1 - r - n,
            s = 1 - e - i
          if (o > 0.001 && s > 0.001) {
            const n = 1 / o,
              i = 1 / s
            ;((v *= n),
              (b *= i),
              (y +=
                -r *
                n *
                (((null == l ? void 0 : l.width) ?? 100) / 100) *
                t.size.w),
              (x +=
                -e *
                i *
                (((null == l ? void 0 : l.height) ?? 100) / 100) *
                t.size.h))
          }
        }
        if (
          ($.setAttribute('x', String(y)),
          $.setAttribute('y', String(x)),
          $.setAttribute('width', String(v)),
          $.setAttribute('height', String(b)),
          e.appendChild(c),
          c.appendChild(g),
          g.appendChild($),
          s &&
            Uo({
              svg: c,
              defs: h,
              pathD: i,
              bounds: { width: t.size.w, height: t.size.h },
              plan: s,
              ctx: o,
            }),
          a)
        ) {
          const t = document.createElementNS(d, 'path')
          if (
            ((t.dataset.pptxPictureOutline = 'true'),
            t.setAttribute('d', i),
            t.setAttribute('fill', 'none'),
            t.setAttribute('stroke', a.color),
            t.setAttribute('stroke-width', String(a.width)),
            a.linecap && t.setAttribute('stroke-linecap', a.linecap),
            a.linejoin && t.setAttribute('stroke-linejoin', a.linejoin),
            'solid' !== a.dashKind)
          ) {
            const e = Math.max(1, a.width),
              n = a.dashKind.includes('dot')
                ? `${e},${2 * e}`
                : `${4 * e},${2 * e}`
            t.setAttribute('stroke-dasharray', n)
          }
          ;(t.setAttribute('pointer-events', 'none'), c.appendChild(t))
        }
      })(t, n, i, $, l, e, f, p, r),
      void (s < 1 && (n.style.opacity = `${Number(s.toFixed(4))}`))
    )
  }
  const g = document.createElement('img')
  if (
    ((g.src = i),
    (g.style.width = '100%'),
    (g.style.height = '100%'),
    (g.style.maxWidth = 'none'),
    (g.style.maxHeight = 'none'),
    (g.style.objectFit = 'fill'),
    (g.style.display = 'block'),
    (g.draggable = !1),
    f &&
      (function (t, e) {
        ;((t.style.position = 'absolute'),
          (t.style.left = `${e.left}%`),
          (t.style.top = `${e.top}%`),
          (t.style.width = `${e.width}%`),
          (t.style.height = `${e.height}%`))
      })(g, f),
    t.crop)
  ) {
    const { top: e, right: n, bottom: i, left: r } = t.crop,
      o = 1 - r - n,
      l = 1 - e - i
    if (o > 0.001 && l > 0.001) {
      const n = 1 / o,
        i = 1 / l,
        s = t.size.w * (((null == f ? void 0 : f.width) ?? 100) / 100),
        a = t.size.h * (((null == f ? void 0 : f.height) ?? 100) / 100)
      ;((g.style.width = `${(n * s).toFixed(4)}px`),
        (g.style.height = `${(i * a).toFixed(4)}px`),
        (g.style.marginLeft = `${(-r * n * s).toFixed(4)}px`),
        (g.style.marginTop = `${(-e * i * a).toFixed(4)}px`))
    }
  }
  ;(s < 1 && (n.style.opacity = `${Number(s.toFixed(4))}`),
    l.child('grayscl').exists() && ms(g, 'grayscale(1)'))
  const y = l.child('duotone')
  y.exists() &&
    (function (t, e, n) {
      const i = t.allChildren()
      if (i.length < 2) return
      const { color: r } = en(i[0], e),
        { color: o } = en(i[1], e)
      if (!r || !o) return
      const l = r.startsWith('#') ? r : `#${r}`,
        s = o.startsWith('#') ? o : `#${o}`,
        a = Me(l),
        d = Me(s),
        c = () => {
          var t
          if (null != (t = e.signal) && t.aborted) return
          const i = n.naturalWidth,
            r = n.naturalHeight
          if (!i || !r) return
          const o = document.createElement('canvas')
          ;((o.width = i), (o.height = r))
          const l = o.getContext('2d')
          if (!l) return
          l.drawImage(n, 0, 0)
          const s = l.getImageData(0, 0, i, r),
            c = s.data
          for (let e = 0; e < c.length; e += 4) {
            const t =
              (0.2126 * c[e] + 0.7152 * c[e + 1] + 0.0722 * c[e + 2]) / 255
            ;((c[e] = Math.round(a.r + (d.r - a.r) * t)),
              (c[e + 1] = Math.round(a.g + (d.g - a.g) * t)),
              (c[e + 2] = Math.round(a.b + (d.b - a.b) * t)))
          }
          ;(l.putImageData(s, 0, 0), (n.src = o.toDataURL()))
        }
      n.complete && n.naturalWidth
        ? c()
        : n.addEventListener('load', c, { once: !0 })
    })(y, e, g)
  const x = l.child('lum')
  x.exists() &&
    (function (t, e, n) {
      const i = (t.numAttr('bright') ?? 0) / 1e5,
        r = (t.numAttr('contrast') ?? 0) / 1e5
      if (0 === i && 0 === r) return
      const o = () => {
        if (null != n && n.aborted) return
        const t = e.naturalWidth,
          o = e.naturalHeight
        if (!t || !o) return
        const l = document.createElement('canvas')
        ;((l.width = t), (l.height = o))
        const s = l.getContext('2d')
        if (!s) return
        s.drawImage(e, 0, 0)
        const a = s.getImageData(0, 0, t, o),
          d = a.data
        for (let e = 0; e < d.length; e += 4)
          for (let t = 0; t < 3; t++) {
            let n = d[e + t] / 255
            ;(0 !== r && (n = 0.5 + (n - 0.5) * (1 + r)),
              (n += i),
              (d[e + t] = Math.round(Math.max(0, Math.min(255, 255 * n)))))
          }
        ;(s.putImageData(a, 0, 0), (e.src = l.toDataURL()))
      }
      e.complete && e.naturalWidth
        ? o()
        : e.addEventListener('load', o, { once: !0 })
    })(x, g, e.signal)
  const v = l.child('biLevel')
  if (
    (v.exists() &&
      (function (t, e, n) {
        const i = (t.numAttr('thresh') ?? 5e4) / 1e5,
          r = () => {
            if (null != n && n.aborted) return
            const t = e.naturalWidth,
              r = e.naturalHeight
            if (!t || !r) return
            const o = document.createElement('canvas')
            ;((o.width = t), (o.height = r))
            const l = o.getContext('2d')
            if (!l) return
            l.drawImage(e, 0, 0)
            const s = l.getImageData(0, 0, t, r),
              a = s.data
            for (let e = 0; e < a.length; e += 4) {
              const t =
                (0.2126 * a[e] + 0.7152 * a[e + 1] + 0.0722 * a[e + 2]) / 255 >=
                i
                  ? 255
                  : 0
              ;((a[e] = t), (a[e + 1] = t), (a[e + 2] = t))
            }
            ;(l.putImageData(s, 0, 0), (e.src = o.toDataURL()))
          }
        e.complete && e.naturalWidth
          ? r()
          : e.addEventListener('load', r, { once: !0 })
      })(v, g, e.signal),
    'camera-projected-picture-plane' === p.mode)
  ) {
    const t = document.createElement('div')
    if (
      ((t.style.position = 'absolute'),
      (t.style.left = '0'),
      (t.style.top = '0'),
      (t.style.width = '100%'),
      (t.style.height = '100%'),
      (t.style.overflow = 'hidden'),
      (function (t, e) {
        if (
          'camera-projected-picture-plane' !== (null == e ? void 0 : e.mode) ||
          t.style.transform
        )
          return !1
        const n = io(e.bounds.width, e.bounds.height, e.corners)
        return (
          !!n &&
          ((t.dataset.pptxShape3dProjectedPicturePlane = e.camera.kind),
          (t.style.transformOrigin = '0px 0px'),
          (t.style.transform = n),
          !0)
        )
      })(t, p))
    ) {
      ;((n.style.overflow = 'visible'),
        (g.style.filter = `brightness(${p.lighting.brightness})`),
        t.appendChild(g))
      const e = document.createElement('div')
      return (
        (e.dataset.pptxShape3dPictureLighting = 'threePt:t'),
        (e.style.position = 'absolute'),
        (e.style.inset = '0'),
        (e.style.pointerEvents = 'none'),
        (e.style.backgroundColor = `rgba(255, 255, 255, ${p.lighting.opacity})`),
        t.appendChild(e),
        void n.appendChild(t)
      )
    }
  }
  n.appendChild(g)
}
function hs(t, e) {
  return (t.numAttr(e) ?? 0) / 1e3
}
function ps(t) {
  const e = t.source.child('spPr').child('custGeom'),
    n = t.customGeometry ?? (e.exists() ? e : void 0)
  if (null != n && n.exists()) {
    const e = t.source.child('spPr').child('xfrm').child('ext'),
      i = { w: e.numAttr('cx') ?? 0, h: e.numAttr('cy') ?? 0 }
    return Ki(n, t.size.w, t.size.h, i) || void 0
  }
  const i = t.source.child('spPr').child('prstGeom').attr('prst'),
    r = t.presetGeometry ?? i
  return (
    (r &&
      'rect' !== r &&
      (function (t, e, n, i) {
        if (e > 0 && n > 0) {
          const r = gr(t, e, n, i),
            o = null == r ? void 0 : r.find(({ fill: t }) => 'none' !== t)
          if (o) return o.d
        }
        return Pr(t, e, n, i)
      })(r, t.size.w, t.size.h, t.geometryAdjustments)) ||
    void 0
  )
}
function fs(t, e) {
  var n, i, r
  const o = t.source.child('style').child('lnRef')
  if (null == (n = t.line) ? void 0 : n.child('noFill').exists()) return
  const l = (null == (i = t.line) ? void 0 : i.exists()) ?? !1,
    s =
      !l &&
      o.exists() &&
      (o.numAttr('idx') ?? 0) > 0 &&
      ((null == (r = e.theme.lineStyles) ? void 0 : r.length) ?? 0) >=
        (o.numAttr('idx') ?? 0)
        ? e.theme.lineStyles[(o.numAttr('idx') ?? 1) - 1]
        : void 0,
    a = l ? t.line : s
  if (null == a || !a.exists()) return
  const d = cn(a, e, o)
  if (d.width <= 0 || 'transparent' === d.color) return
  const c = a.attr('cap'),
    u =
      'rnd' === c
        ? 'round'
        : 'sq' === c
          ? 'square'
          : 'flat' === c
            ? 'butt'
            : void 0,
    h = a.child('round').exists()
      ? 'round'
      : a.child('bevel').exists()
        ? 'bevel'
        : a.child('miter').exists()
          ? 'miter'
          : void 0
  return { ...d, linecap: u, linejoin: h }
}
function ms(t, e) {
  const n = t.style.filter.trim()
  t.style.filter = n ? `${n} ${e}` : e
}
function $s(t, e, n, i) {
  var r
  const o = gs(t.mediaRId, e),
    l = gs(t.blipEmbed ?? t.blipLink, e),
    s = (t, r) => {
      var o, l
      if (null == (o = e.signal) || !o.aborted)
        if (t) {
          const o = document.createElement(i)
          if (
            ((o.src = t),
            (o.preload = 'none'),
            (o.controls = !0),
            (o.style.width = '100%'),
            'video' === i)
          )
            ((o.style.height = '100%'),
              (o.style.objectFit = 'contain'),
              (o.style.backgroundColor = '#000'),
              r && (o.poster = r))
          else {
            if (r) {
              const t = xs(r)
              ;((t.style.height = 'calc(100% - 32px)'),
                (t.style.objectFit = 'contain'),
                n.appendChild(t))
            }
            ;((o.style.position = 'absolute'),
              (o.style.bottom = '0'),
              (o.style.left = '0'))
          }
          ;(n.appendChild(o),
            null == (l = e.signal) ||
              l.addEventListener(
                'abort',
                () => {
                  ;(o.pause(), o.removeAttribute('src'), o.load())
                },
                { once: !0 },
              ))
        } else if (r && 'video' === i) {
          n.appendChild(xs(r))
          const t = document.createElement('div')
          ;(Object.assign(t.style, {
            position: 'absolute',
            inset: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.3)',
            color: '#fff',
            fontSize: '24px',
          }),
            (t.textContent = '▶'),
            n.appendChild(t))
        } else ys(n, 'video' === i ? 'Video' : 'Audio')
    }
  if (o instanceof Promise || l instanceof Promise) {
    const t = Promise.all([o, l]).then(([t, e]) => s(t, e))
    null == (r = e.asyncTasks) || r.push(t)
  } else s(o, l)
}
function gs(t, e) {
  if (!t) return
  const n = e.slide.rels.get(t)
  return n
    ? (function (t, e) {
        if (G(t.targetMode)) return An(t.target) ? t.target : void 0
        const n = C(t.target, e.presentation.media)
        if (!n)
          return e.presentation.mediaResolver
            ? F(t.target, e.presentation.media, e.presentation.mediaResolver)
                .then((t) => {
                  var n
                  if (!(
                    (null != (n = e.signal) && n.aborted) ||
                    !t ||
                    ss(t.mediaPath)
                  ))
                    return B(t.mediaPath, t.data, e.mediaUrlCache)
                })
                .catch(() => {})
            : void 0
        const { mediaPath: i, data: r } = n
        return ss(i) ? void 0 : B(i, r, e.mediaUrlCache)
      })(n, e)
    : void 0
}
function ys(t, e) {
  const n = document.createElement('div')
  ;((n.style.width = '100%'),
    (n.style.height = '100%'),
    (n.style.display = 'flex'),
    (n.style.alignItems = 'center'),
    (n.style.justifyContent = 'center'),
    (n.style.backgroundColor = '#f0f0f0'),
    (n.style.color = '#888'),
    (n.style.fontSize = '12px'),
    (n.style.border = '1px dashed #ccc'),
    (n.textContent = e),
    t.appendChild(n))
}
function xs(t) {
  const e = document.createElement('img')
  return (
    (e.src = t),
    (e.style.width = '100%'),
    (e.style.height = '100%'),
    (e.style.objectFit = 'fill'),
    (e.style.display = 'block'),
    (e.draggable = !1),
    e
  )
}
var vs = new Map([
  ['{2D5ABB26-0587-4C30-8999-92F81FD0307C}', ['Themed-Style-1', '']],
  ['{3C2FFA5D-87B4-456A-9821-1D502468CF0F}', ['Themed-Style-1', 'accent1']],
  ['{284E427A-3D55-4303-BF80-6455036E1DE7}', ['Themed-Style-1', 'accent2']],
  ['{69C7853C-536D-4A76-A0AE-DD22124D55A5}', ['Themed-Style-1', 'accent3']],
  ['{775DCB02-9BB8-47FD-8907-85C794F793BA}', ['Themed-Style-1', 'accent4']],
  ['{35758FB7-9AC5-4552-8A53-C91805E547FA}', ['Themed-Style-1', 'accent5']],
  ['{08FB837D-C827-4EFA-A057-4D05807E0F7C}', ['Themed-Style-1', 'accent6']],
  ['{5940675A-B579-460E-94D1-54222C63F5DA}', ['Themed-Style-2', '']],
  ['{D113A9D2-9D6B-4929-AA2D-F23B5EE8CBE7}', ['Themed-Style-2', 'accent1']],
  ['{18603FDC-E32A-4AB5-989C-0864C3EAD2B8}', ['Themed-Style-2', 'accent2']],
  ['{306799F8-075E-4A3A-A7F6-7FBC6576F1A4}', ['Themed-Style-2', 'accent3']],
  ['{E269D01E-BC32-4049-B463-5C60D7B0CCD2}', ['Themed-Style-2', 'accent4']],
  ['{327F97BB-C833-4FB7-BDE5-3F7075034690}', ['Themed-Style-2', 'accent5']],
  ['{638B1855-1B75-4FBE-930C-398BA8C253C6}', ['Themed-Style-2', 'accent6']],
  ['{9D7B26C5-4107-4FEC-AEDC-1716B250A1EF}', ['Light-Style-1', '']],
  ['{3B4B98B0-60AC-42C2-AFA5-B58CD77FA1E5}', ['Light-Style-1', 'accent1']],
  ['{0E3FDE45-AF77-4B5C-9715-49D594BDF05E}', ['Light-Style-1', 'accent2']],
  ['{C083E6E3-FA7D-4D7B-A595-EF9225AFEA82}', ['Light-Style-1', 'accent3']],
  ['{D27102A9-8310-4765-A935-A1911B00CA55}', ['Light-Style-1', 'accent4']],
  ['{5FD0F851-EC5A-4D38-B0AD-8093EC10F338}', ['Light-Style-1', 'accent5']],
  ['{68D230F3-CF80-4859-8CE7-A43EE81993B5}', ['Light-Style-1', 'accent6']],
  ['{7E9639D4-E3E2-4D34-9284-5A2195B3D0D7}', ['Light-Style-2', '']],
  ['{69012ECD-51FC-41F1-AA8D-1B2483CD663E}', ['Light-Style-2', 'accent1']],
  ['{72833802-FEF1-4C79-8D5D-14CF1EAF98D9}', ['Light-Style-2', 'accent2']],
  ['{F2DE63D5-997A-4646-A377-4702673A728D}', ['Light-Style-2', 'accent3']],
  ['{17292A2E-F333-43FB-9621-5CBBE7FDCDCB}', ['Light-Style-2', 'accent4']],
  ['{5A111915-BE36-4E01-A7E5-04B1672EAD32}', ['Light-Style-2', 'accent5']],
  ['{912C8C85-51F0-491E-9774-3900AFEF0FD7}', ['Light-Style-2', 'accent6']],
  ['{616DA210-FB5B-4158-B5E0-FEB733F419BA}', ['Light-Style-3', '']],
  ['{BC89EF96-8CEA-46FF-86C4-4CE0E7609802}', ['Light-Style-3', 'accent1']],
  ['{5DA37D80-6434-44D0-A028-1B22A696006F}', ['Light-Style-3', 'accent2']],
  ['{8799B23B-EC83-4686-B30A-512413B5E67A}', ['Light-Style-3', 'accent3']],
  ['{ED083AE6-46FA-4A59-8FB0-9F97EB10719F}', ['Light-Style-3', 'accent4']],
  ['{BDBED569-4797-4DF1-A0F4-6AAB3CD982D8}', ['Light-Style-3', 'accent5']],
  ['{E8B1032C-EA38-4F05-BA0D-38AFFFC7BED3}', ['Light-Style-3', 'accent6']],
  ['{793D81CF-94F2-401A-BA57-92F5A7B2D0C5}', ['Medium-Style-1', '']],
  ['{B301B821-A1FF-4177-AEE7-76D212191A09}', ['Medium-Style-1', 'accent1']],
  ['{9DCAF9ED-07DC-4A11-8D7F-57B35C25682E}', ['Medium-Style-1', 'accent2']],
  ['{1FECB4D8-DB02-4DC6-A0A2-4F2EBAE1DC90}', ['Medium-Style-1', 'accent3']],
  ['{1E171933-4619-4E11-9A3F-F7608DF75F80}', ['Medium-Style-1', 'accent4']],
  ['{FABFCF23-3B69-468F-B69F-88F6DE6A72F2}', ['Medium-Style-1', 'accent5']],
  ['{10A1B5D5-9B99-4C35-A422-299274C87663}', ['Medium-Style-1', 'accent6']],
  ['{073A0DAA-6AF3-43AB-8588-CEC1D06C72B9}', ['Medium-Style-2', '']],
  ['{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}', ['Medium-Style-2', 'accent1']],
  ['{21E4AEA4-8DFA-4A89-87EB-49C32662AFE0}', ['Medium-Style-2', 'accent2']],
  ['{F5AB1C69-6EDB-4FF4-983F-18BD219EF322}', ['Medium-Style-2', 'accent3']],
  ['{00A15C55-8517-42AA-B614-E9B94910E393}', ['Medium-Style-2', 'accent4']],
  ['{7DF18680-E054-41AD-8BC1-D1AEF772440D}', ['Medium-Style-2', 'accent5']],
  ['{93296810-A885-4BE3-A3E7-6D5BEEA58F35}', ['Medium-Style-2', 'accent6']],
  ['{8EC20E35-A176-4012-BC5E-935CFFF8708E}', ['Medium-Style-3', '']],
  ['{6E25E649-3F16-4E02-A733-19D2CDBF48F0}', ['Medium-Style-3', 'accent1']],
  ['{85BE263C-DBD7-4A20-BB59-AAB30ACAA65A}', ['Medium-Style-3', 'accent2']],
  ['{EB344D84-9AFB-497E-A393-DC336BA19D2E}', ['Medium-Style-3', 'accent3']],
  ['{EB9631B5-78F2-41C9-869B-9F39066F8104}', ['Medium-Style-3', 'accent4']],
  ['{74C1A8A3-306A-4EB7-A6B1-4F7E0EB9C5D6}', ['Medium-Style-3', 'accent5']],
  ['{2A488322-F2BA-4B5B-9748-0D474271808F}', ['Medium-Style-3', 'accent6']],
  ['{D7AC3CCA-C797-4891-BE02-D94E43425B78}', ['Medium-Style-4', '']],
  ['{69CF1AB2-1976-4502-BF36-3FF5EA218861}', ['Medium-Style-4', 'accent1']],
  ['{8A107856-5554-42FB-B03E-39F5DBC370BA}', ['Medium-Style-4', 'accent2']],
  ['{0505E3EF-67EA-436B-97B2-0124C06EBD24}', ['Medium-Style-4', 'accent3']],
  ['{C4B1156A-380E-4F78-BDF5-A606A8083BF9}', ['Medium-Style-4', 'accent4']],
  ['{22838BEF-8BB2-4498-84A7-C5851F593DF1}', ['Medium-Style-4', 'accent5']],
  ['{16D9F66E-5EB9-4882-86FB-DCBF35E3C3E4}', ['Medium-Style-4', 'accent6']],
  ['{E8034E78-7F5D-4C2E-B375-FC64B27BC917}', ['Dark-Style-1', '']],
  ['{125E5076-3810-47DD-B79F-674D7AD40C01}', ['Dark-Style-1', 'accent1']],
  ['{37CE84F3-28C3-443E-9E96-99CF82512B78}', ['Dark-Style-1', 'accent2']],
  ['{D03447BB-5D67-496B-8E87-E561075AD55C}', ['Dark-Style-1', 'accent3']],
  ['{E929F9F4-4A8F-4326-A1B4-22849713DDAB}', ['Dark-Style-1', 'accent4']],
  ['{8FD4443E-F989-4FC4-A0C8-D5A2AF1F390B}', ['Dark-Style-1', 'accent5']],
  ['{AF606853-7671-496A-8E4F-DF71F8EC918B}', ['Dark-Style-1', 'accent6']],
  ['{5202B0CA-FC54-4496-8BCA-5EF66A818D29}', ['Dark-Style-2', '']],
  ['{0660B408-B3CF-4A94-85FC-2B1E0A45F4A2}', ['Dark-Style-2', 'accent1']],
  ['{91EBBBCC-DAD2-459C-BE2E-F6DE35CF9A28}', ['Dark-Style-2', 'accent3']],
  ['{46F890A9-2807-4EBB-B81D-B2AA78EC7F39}', ['Dark-Style-2', 'accent5']],
])
function bs(t, e) {
  return `<a:fill><a:solidFill><a:schemeClr val="${t}">${e ? `<a:${e}/>` : ''}</a:schemeClr></a:solidFill></a:fill>`
}
function Ms(t, e) {
  return `<a:ln w="12700"><a:solidFill><a:schemeClr val="${t}">${e ? `<a:${e}/>` : ''}</a:schemeClr></a:solidFill></a:ln>`
}
function ws(t, e) {
  if (!(e.textColor || e.bold || e.fill || e.borders)) return ''
  const n = [`<a:${t}>`]
  if (
    ((e.textColor || e.bold) &&
      n.push(
        (function (t, e) {
          return `<a:tcTxStyle${e ? ' b="on"' : ''}>${t ? `<a:schemeClr val="${t}"/>` : ''}</a:tcTxStyle>`
        })(e.textColor ?? '', e.bold),
      ),
    n.push('<a:tcStyle>'),
    e.fill && n.push(e.fill),
    e.borders)
  ) {
    n.push('<a:tcBdr>')
    for (const [t, i] of Object.entries(e.borders))
      n.push(`<a:${t}>${i}</a:${t}>`)
    n.push('</a:tcBdr>')
  }
  return (n.push('</a:tcStyle>'), n.push(`</a:${t}>`), n.join(''))
}
function ks(t, e, n) {
  return `<a:tblStyle xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" styleId="${t}" styleName="${e}">${n}</a:tblStyle>`
}
var As = {
    'Themed-Style-1': function (t, e) {
      const n = '' !== t,
        i = n ? t : 'tx1',
        r = []
      if (n) {
        const t = {
          left: Ms(i),
          right: Ms(i),
          top: Ms(i),
          bottom: Ms(i),
          insideH: Ms(i),
          insideV: Ms(i),
        }
        r.push(ws('wholeTbl', { textColor: 'dk1', borders: t }))
        const e = bs(i, 'alpha val="40000"')
        ;(r.push(ws('band1H', { fill: e })),
          r.push(ws('band1V', { fill: e })),
          r.push(
            ws('firstRow', {
              textColor: 'lt1',
              bold: !0,
              fill: bs(i),
              borders: {
                left: Ms(i),
                right: Ms(i),
                top: Ms(i),
                bottom: Ms('lt1'),
              },
            }),
          ),
          r.push(
            ws('lastRow', {
              bold: !0,
              borders: { left: Ms(i), right: Ms(i), top: Ms(i), bottom: Ms(i) },
            }),
          ))
        const n = {
          left: Ms(i),
          right: Ms(i),
          top: Ms(i),
          bottom: Ms(i),
          insideH: Ms(i),
        }
        ;(r.push(ws('firstCol', { bold: !0, borders: n })),
          r.push(ws('lastCol', { bold: !0, borders: n })))
      } else {
        r.push(ws('wholeTbl', { textColor: 'tx1' }))
        const t = bs('tx1', 'alpha val="40000"')
        ;(r.push(ws('band1H', { fill: t })), r.push(ws('band1V', { fill: t })))
      }
      return ks(e, 'Themed-Style-1', r.join(''))
    },
    'Themed-Style-2': function (t, e) {
      const n = []
      if ('' !== t) {
        const i = t,
          r = `<a:tblBg><a:fillRef idx="1"><a:schemeClr val="${i}"/></a:fillRef></a:tblBg>`,
          o = {
            left: Ms(i, 'tint val="50000"'),
            right: Ms(i, 'tint val="50000"'),
            top: Ms(i, 'tint val="50000"'),
            bottom: Ms(i, 'tint val="50000"'),
          }
        n.push(ws('wholeTbl', { textColor: 'lt1', borders: o }))
        const l = bs('lt1', 'alpha val="20000"')
        return (
          n.push(ws('band1H', { fill: l })),
          n.push(ws('band1V', { fill: l })),
          n.push(
            ws('firstRow', {
              textColor: 'lt1',
              bold: !0,
              borders: { bottom: Ms('lt1') },
            }),
          ),
          n.push(ws('lastRow', { bold: !0, borders: { top: Ms('lt1') } })),
          n.push(ws('firstCol', { bold: !0, borders: { right: Ms('lt1') } })),
          n.push(ws('lastCol', { bold: !0, borders: { left: Ms('lt1') } })),
          ks(e, 'Themed-Style-2', r + n.join(''))
        )
      }
      {
        const t = {
          left: Ms('tx1', 'tint val="50000"'),
          right: Ms('tx1', 'tint val="50000"'),
          top: Ms('tx1', 'tint val="50000"'),
          bottom: Ms('tx1', 'tint val="50000"'),
          insideH: Ms('tx1'),
          insideV: Ms('tx1'),
        }
        n.push(ws('wholeTbl', { borders: t }))
        const i = bs('tx1', 'alpha val="20000"')
        return (
          n.push(ws('band1H', { fill: i })),
          n.push(ws('band1V', { fill: i })),
          ks(e, 'Themed-Style-2', n.join(''))
        )
      }
    },
    'Light-Style-1': function (t, e) {
      const n = t || 'tx1',
        i = []
      i.push(
        ws('wholeTbl', {
          textColor: 'tx1',
          borders: { top: Ms(n), bottom: Ms(n) },
        }),
      )
      const r = bs(n, 'alpha val="20000"')
      return (
        i.push(ws('band1H', { fill: r })),
        i.push(ws('band1V', { fill: r })),
        i.push(
          ws('firstRow', {
            textColor: 'tx1',
            bold: !0,
            borders: { bottom: Ms(n) },
          }),
        ),
        i.push(ws('lastRow', { bold: !0, borders: { top: Ms(n) } })),
        i.push(ws('firstCol', { textColor: 'tx1', bold: !0 })),
        i.push(ws('lastCol', { textColor: 'tx1', bold: !0 })),
        ks(e, 'Light-Style-1', i.join(''))
      )
    },
    'Light-Style-2': function (t, e) {
      const n = t || 'tx1',
        i = []
      return (
        i.push(
          ws('wholeTbl', {
            textColor: 'tx1',
            borders: { left: Ms(n), right: Ms(n), top: Ms(n), bottom: Ms(n) },
          }),
        ),
        i.push(ws('band1H', { borders: { top: Ms(n), bottom: Ms(n) } })),
        i.push(ws('band1V', { borders: { left: Ms(n), right: Ms(n) } })),
        i.push(ws('band2V', { borders: { left: Ms(n), right: Ms(n) } })),
        i.push(ws('firstRow', { textColor: 'bg1', bold: !0, fill: bs(n) })),
        i.push(ws('lastRow', { bold: !0, borders: { top: Ms(n) } })),
        i.push(ws('firstCol', { bold: !0 })),
        i.push(ws('lastCol', { bold: !0 })),
        ks(e, 'Light-Style-2', i.join(''))
      )
    },
    'Light-Style-3': function (t, e) {
      const n = t || 'tx1',
        i = []
      i.push(
        ws('wholeTbl', {
          textColor: 'tx1',
          borders: {
            left: Ms(n),
            right: Ms(n),
            top: Ms(n),
            bottom: Ms(n),
            insideH: Ms(n),
            insideV: Ms(n),
          },
        }),
      )
      const r = bs(n, 'alpha val="20000"')
      return (
        i.push(ws('band1H', { fill: r })),
        i.push(ws('band1V', { fill: r })),
        i.push(
          ws('firstRow', {
            textColor: n,
            bold: !0,
            borders: { bottom: Ms(n) },
          }),
        ),
        i.push(ws('lastRow', { bold: !0, borders: { top: Ms(n) } })),
        i.push(ws('firstCol', { bold: !0 })),
        i.push(ws('lastCol', { bold: !0 })),
        ks(e, 'Light-Style-3', i.join(''))
      )
    },
    'Medium-Style-1': function (t, e) {
      const n = t || 'dk1',
        i = []
      i.push(
        ws('wholeTbl', {
          textColor: 'dk1',
          fill: bs('lt1'),
          borders: {
            left: Ms(n),
            right: Ms(n),
            top: Ms(n),
            bottom: Ms(n),
            insideH: Ms(n),
          },
        }),
      )
      const r = bs(n, 'tint val="20000"')
      return (
        i.push(ws('band1H', { fill: r })),
        i.push(ws('band1V', { fill: r })),
        i.push(ws('firstRow', { textColor: 'lt1', bold: !0, fill: bs(n) })),
        i.push(
          ws('lastRow', { bold: !0, fill: bs('lt1'), borders: { top: Ms(n) } }),
        ),
        i.push(ws('firstCol', { bold: !0 })),
        i.push(ws('lastCol', { bold: !0 })),
        ks(e, 'Medium-Style-1', i.join(''))
      )
    },
    'Medium-Style-2': function (t, e) {
      const n = t || 'dk1',
        i = []
      i.push(
        ws('wholeTbl', {
          textColor: 'dk1',
          fill: bs(n, 'tint val="20000"'),
          borders: {
            left: Ms('lt1'),
            right: Ms('lt1'),
            top: Ms('lt1'),
            bottom: Ms('lt1'),
            insideH: Ms('lt1'),
            insideV: Ms('lt1'),
          },
        }),
      )
      const r = bs(n, 'tint val="40000"')
      return (
        i.push(ws('band1H', { fill: r })),
        i.push(ws('band1V', { fill: r })),
        i.push(
          ws('firstRow', {
            textColor: 'lt1',
            bold: !0,
            fill: bs(n),
            borders: { bottom: Ms('lt1') },
          }),
        ),
        i.push(
          ws('lastRow', {
            textColor: 'lt1',
            bold: !0,
            fill: bs(n),
            borders: { top: Ms('lt1') },
          }),
        ),
        i.push(ws('firstCol', { textColor: 'lt1', bold: !0, fill: bs(n) })),
        i.push(ws('lastCol', { textColor: 'lt1', bold: !0, fill: bs(n) })),
        ks(e, 'Medium-Style-2', i.join(''))
      )
    },
    'Medium-Style-3': function (t, e) {
      const n = t || 'dk1',
        i = []
      i.push(
        ws('wholeTbl', {
          textColor: 'dk1',
          fill: bs('lt1'),
          borders: { top: Ms('dk1'), bottom: Ms('dk1') },
        }),
      )
      const r = bs('dk1', 'tint val="20000"')
      return (
        i.push(ws('band1H', { fill: r })),
        i.push(ws('band1V', { fill: r })),
        i.push(
          ws('firstRow', {
            textColor: 'lt1',
            bold: !0,
            fill: bs(n),
            borders: { bottom: Ms('dk1') },
          }),
        ),
        i.push(
          ws('lastRow', {
            bold: !0,
            fill: bs('lt1'),
            borders: { top: Ms('dk1') },
          }),
        ),
        i.push(ws('firstCol', { textColor: 'lt1', bold: !0, fill: bs(n) })),
        i.push(ws('lastCol', { textColor: 'lt1', bold: !0, fill: bs(n) })),
        ks(e, 'Medium-Style-3', i.join(''))
      )
    },
    'Medium-Style-4': function (t, e) {
      const n = t || 'dk1',
        i = []
      i.push(
        ws('wholeTbl', {
          textColor: 'dk1',
          fill: bs(n, 'tint val="20000"'),
          borders: {
            left: Ms(n),
            right: Ms(n),
            top: Ms(n),
            bottom: Ms(n),
            insideH: Ms(n),
            insideV: Ms(n),
          },
        }),
      )
      const r = bs(n, 'tint val="40000"')
      return (
        i.push(ws('band1H', { fill: r })),
        i.push(ws('band1V', { fill: r })),
        i.push(
          ws('firstRow', {
            textColor: n,
            bold: !0,
            fill: bs(n, 'tint val="20000"'),
          }),
        ),
        i.push(
          ws('lastRow', {
            bold: !0,
            fill: bs('dk1', 'tint val="20000"'),
            borders: { top: Ms('dk1') },
          }),
        ),
        i.push(ws('firstCol', { bold: !0 })),
        i.push(ws('lastCol', { bold: !0 })),
        ks(e, 'Medium-Style-4', i.join(''))
      )
    },
    'Dark-Style-1': function (t, e) {
      const n = '' !== t,
        i = n ? t : 'dk1',
        r = n ? 'shade' : 'tint',
        o = []
      o.push(
        ws('wholeTbl', { textColor: 'dk1', fill: bs(i, `${r} val="20000"`) }),
      )
      const l = bs(i, `${r} val="40000"`)
      return (
        o.push(ws('band1H', { fill: l })),
        o.push(ws('band1V', { fill: l })),
        o.push(
          ws('firstRow', {
            textColor: 'lt1',
            bold: !0,
            fill: bs('dk1'),
            borders: { bottom: Ms('lt1') },
          }),
        ),
        o.push(
          ws('lastRow', { bold: !0, fill: bs(i), borders: { top: Ms('lt1') } }),
        ),
        o.push(
          ws('firstCol', {
            bold: !0,
            fill: bs(i, `${r} val="60000"`),
            borders: { right: Ms('lt1') },
          }),
        ),
        o.push(
          ws('lastCol', {
            bold: !0,
            fill: bs(i, `${r} val="60000"`),
            borders: { left: Ms('lt1') },
          }),
        ),
        ks(e, 'Dark-Style-1', o.join(''))
      )
    },
    'Dark-Style-2': function (t, e) {
      const n = t || 'dk1',
        i = []
      let r
      ;((r =
        '' === t
          ? 'dk1'
          : 'accent1' === t
            ? 'accent2'
            : 'accent3' === t
              ? 'accent4'
              : 'accent5' === t
                ? 'accent6'
                : n),
        i.push(
          ws('wholeTbl', { textColor: 'dk1', fill: bs(n, 'tint val="20000"') }),
        ))
      const o = bs(n, 'tint val="40000"')
      return (
        i.push(ws('band1H', { fill: o })),
        i.push(ws('band1V', { fill: o })),
        i.push(ws('firstRow', { textColor: 'lt1', bold: !0, fill: bs(r) })),
        i.push(
          ws('lastRow', {
            bold: !0,
            fill: bs(n, 'tint val="20000"'),
            borders: { top: Ms('dk1') },
          }),
        ),
        i.push(ws('firstCol', { bold: !0 })),
        i.push(ws('lastCol', { bold: !0 })),
        ks(e, 'Dark-Style-2', i.join(''))
      )
    },
  },
  Ls = new Map()
function Ss(t, e) {
  if ((Cs(t), e.includes('gradient') && e.includes(' 0 0 / '))) {
    const n = Sn(e)
    if (n)
      return (
        (t.style.backgroundImage = n.imageLayers),
        (t.style.backgroundSize = '8px 8px'),
        (t.style.backgroundRepeat = 'repeat'),
        void (t.style.backgroundColor = n.color)
      )
  }
  e.includes('gradient') || e.startsWith('url(') || e.includes('repeating-')
    ? (t.style.background = e)
    : (t.style.backgroundColor = e)
}
function Cs(t) {
  ;((t.style.background = ''),
    (t.style.backgroundColor = ''),
    (t.style.backgroundImage = ''),
    (t.style.backgroundRepeat = ''),
    (t.style.backgroundSize = ''))
}
function Fs(t, e) {
  if (!t || !e.presentation.tableStyles) return
  const n = e.presentation.tableStyles
  for (const i of n.children('tblStyle')) if (i.attr('styleId') === t) return i
  for (const i of n.children())
    if ('tblStyle' === i.localName && i.attr('styleId') === t) return i
  return (function (t) {
    const e = Ls.get(t)
    if (e) return e
    const n = vs.get(t)
    if (!n) return
    const [i, r] = n,
      o = As[i]
    if (!o) return
    const l = Z(o(r, t))
    return l.exists() ? (Ls.set(t, l), l) : void 0
  })(t)
}
function Bs(t, e, n, i, r, o) {
  const l = [],
    s = (t, e) => {
      if (!o) return !1
      const n = o.attr(t)
      if (void 0 !== n) return nt(n)
      const i = o.child(e)
      return !!i.exists() && nt(i.attr('val'), !0)
    },
    a = s('bandRow', 'bandRow'),
    d = s('bandCol', 'bandCol'),
    c = s('firstRow', 'firstRow'),
    u = s('lastRow', 'lastRow'),
    h = s('firstCol', 'firstCol'),
    p = s('lastCol', 'lastCol'),
    f = t.child('wholeTbl')
  if ((f.exists() && l.push(f), a)) {
    const n = c ? e - 1 : e
    if (n >= 0 && n % 2 == 1) {
      const e = t.child('band2H')
      e.exists() && l.push(e)
    } else if (n >= 0 && n % 2 == 0) {
      const e = t.child('band1H')
      e.exists() && l.push(e)
    }
  }
  if (d)
    if (n % 2 == 1) {
      const e = t.child('band2V')
      e.exists() && l.push(e)
    } else {
      const e = t.child('band1V')
      e.exists() && l.push(e)
    }
  if (c && 0 === e) {
    const e = t.child('firstRow')
    e.exists() && l.push(e)
  }
  if (u && e === i - 1) {
    const e = t.child('lastRow')
    e.exists() && l.push(e)
  }
  if (h && 0 === n) {
    const e = t.child('firstCol')
    e.exists() && l.push(e)
  }
  if (p && n === r - 1) {
    const e = t.child('lastCol')
    e.exists() && l.push(e)
  }
  const m = [
    ['nwCell', c && h && 0 === e && 0 === n],
    ['swCell', u && h && e === i - 1 && 0 === n],
    ['neCell', c && p && 0 === e && n === r - 1],
    ['seCell', u && p && e === i - 1 && n === r - 1],
  ]
  for (const [$, g] of m) {
    const e = t.child($)
    g && e.exists() && l.push(e)
  }
  return l
}
function js(t, e) {
  for (let n = t.length - 1; n >= 0; n--) {
    const i = t[n].child('tcTxStyle')
    if (!i.exists()) continue
    const r = {},
      o = i.attr('b')
    void 0 !== o && (r.bold = nt(o))
    const l = i.attr('i')
    void 0 !== l && (r.italic = nt(l))
    for (const t of i.allChildren()) {
      const n = t.localName
      if (
        'schemeClr' === n ||
        'solidFill' === n ||
        'srgbClr' === n ||
        'scrgbClr' === n ||
        'prstClr' === n ||
        'sysClr' === n
      ) {
        const { color: n, alpha: i } = en(t, e),
          o = n.startsWith('#') ? n : `#${n}`
        if (i < 1) {
          const { r: t, g: e, b: n } = Me(o)
          r.color = `rgba(${t},${e},${n},${i.toFixed(3)})`
        } else r.color = o
        break
      }
    }
    const s = i.child('font')
    if (s.exists()) {
      const t = ii(
        [
          s.child('latin').attr('typeface'),
          s.child('ea').attr('typeface'),
          s.child('cs').attr('typeface'),
        ],
        e,
      )
      t.length > 0 && (r.fontFamily = t)
    }
    if (!r.fontFamily) {
      const t = i.child('fontRef')
      if (t.exists()) {
        const n = t.attr('idx')
        if ('major' === n) {
          const t = ii(['+mj-lt', '+mj-ea', '+mj-cs'], e)
          t.length > 0 && (r.fontFamily = t)
        } else if ('minor' === n) {
          const t = ii(['+mn-lt', '+mn-ea', '+mn-cs'], e)
          t.length > 0 && (r.fontFamily = t)
        }
      }
    }
    return r
  }
}
function Es(t, e, n) {
  const i = e.child('fill')
  if (!i.exists()) return !1
  if (i.child('noFill').exists())
    return (Cs(t), (t.style.background = 'transparent'), !0)
  const r = i.child('solidFill')
  if (r.exists()) {
    Cs(t)
    const { color: e, alpha: i } = en(r, n),
      o = e.startsWith('#') ? e : `#${e}`
    if (i < 1) {
      const { r: e, g: n, b: r } = Me(o)
      t.style.backgroundColor = `rgba(${e},${n},${r},${i.toFixed(3)})`
    } else t.style.backgroundColor = o
    return !0
  }
  const o = sn(i, n)
  if (o) return (Ss(t, o), !0)
  const l = i.child('fillRef')
  if (l.exists()) {
    const { fillCss: e } = xn(l, n)
    return (Ss(t, e), !0)
  }
  return !1
}
function Ps(t, e, n, i, r, o, l, s = 1, a = 1) {
  const d = e.child('tcBdr')
  if (!d.exists()) return
  const c = [
    ['top', 'borderTop'],
    ['bottom', 'borderBottom'],
    ['left', 'borderLeft'],
    ['right', 'borderRight'],
  ]
  ;(d.child('insideH').exists() &&
    void 0 !== i &&
    void 0 !== o &&
    (i + s < o && c.push(['insideH', 'borderBottom']),
    i > 0 && c.push(['insideH', 'borderTop'])),
    d.child('insideV').exists() &&
      void 0 !== r &&
      void 0 !== l &&
      (r + a < l && c.push(['insideV', 'borderRight']),
      r > 0 && c.push(['insideV', 'borderLeft'])))
  for (const [u, h] of c) {
    const e = d.child(u)
    if (!e.exists()) continue
    const i = e.child('ln')
    if (i.exists()) {
      if (i.child('noFill').exists()) {
        t.style[h] = 'none'
        continue
      }
      const e = cn(i, n)
      e.width > 0 &&
        'transparent' !== e.color &&
        (t.style[h] = `${Math.max(e.width, 0.5)}px ${e.dash} ${e.color}`)
      continue
    }
    const r = e.child('lnRef')
    if (r.exists()) {
      const e = r.numAttr('idx') ?? 0
      if (0 === e) {
        t.style[h] = 'none'
        continue
      }
      const { color: i, alpha: o } = en(r, n),
        l = i.startsWith('#') ? i : `#${i}`
      let s = 1
      n.theme.lineStyles &&
        n.theme.lineStyles.length >= e &&
        (s = H(n.theme.lineStyles[e - 1].numAttr('w') ?? 12700))
      const a =
        o < 1 ? `rgba(${Me(l).r},${Me(l).g},${Me(l).b},${o.toFixed(3)})` : l
      s > 0 && (t.style[h] = `${Math.max(s, 0.5)}px solid ${a}`)
    }
  }
}
function Ts(t) {
  const e = []
  return (
    t.flipH && e.push('scaleX(-1)'),
    t.flipV && e.push('scaleY(-1)'),
    e.join(' ')
  )
}
function zs(t, e) {
  const n = t.columns.reduce((t, e) => t + e, 0),
    i = t.rows.reduce((t, e) => t + e.height, 0),
    r = document.createElement('div')
  ;((r.style.position = 'absolute'),
    (r.style.left = `${t.position.x}px`),
    (r.style.top = `${t.position.y}px`),
    (r.style.width = `${t.size.w}px`),
    (r.style.height = `${t.size.h}px`),
    (r.style.overflow = 'hidden'))
  const o = []
  ;(0 !== t.rotation && o.push(`rotate(${t.rotation}deg)`),
    t.flipH && o.push('scaleX(-1)'),
    t.flipV && o.push('scaleY(-1)'),
    o.length > 0 && (r.style.transform = o.join(' ')))
  const l = Fs(t.tableStyleId, e),
    s = t.properties,
    a = t.rows.length,
    d = t.columns.length,
    c = document.createElement('table')
  if (
    ((c.style.borderCollapse = 'collapse'),
    (c.style.width = '100%'),
    (c.style.height = '100%'),
    (c.style.tableLayout = 'fixed'),
    l &&
      (function (t, e, n) {
        const i = e.child('tblBg')
        if (!i.exists()) return
        const r = i.child('fillRef')
        if (r.exists()) {
          const { fillCss: e } = xn(r, n)
          return void Ss(t, e)
        }
        const o = i.child('solidFill')
        if (o.exists()) {
          Cs(t)
          const { color: e, alpha: i } = en(o, n),
            r = e.startsWith('#') ? e : `#${e}`
          if (i < 1) {
            const { r: e, g: n, b: o } = Me(r)
            t.style.backgroundColor = `rgba(${e},${n},${o},${i.toFixed(3)})`
          } else t.style.backgroundColor = r
          return
        }
        const l = sn(i, n)
        l && Ss(t, l)
      })(c, l, e),
    n > 0 && t.columns.length > 0)
  ) {
    const e = document.createElement('colgroup')
    for (const i of t.columns) {
      const t = document.createElement('col')
      ;((t.style.width = (i / n) * 100 + '%'), e.appendChild(t))
    }
    c.appendChild(e)
  }
  const u = document.createElement('tbody')
  let h = 0
  for (let p = 0; p < t.rows.length; p++) {
    const n = t.rows[p],
      r = document.createElement('tr')
    ;(n.height > 0 && i > 0 && (r.style.height = (n.height / i) * 100 + '%'),
      (h = 0))
    for (const i of n.cells) {
      if (i.hMerge || i.vMerge) {
        i.vMerge && !i.hMerge && (h += i.gridSpan)
        continue
      }
      const n = document.createElement('td')
      ;((n.style.overflow = 'hidden'),
        i.gridSpan > 1 && (n.colSpan = i.gridSpan),
        i.rowSpan > 1 && (n.rowSpan = i.rowSpan))
      let o = []
      if (l) {
        o = Bs(l, p, h, a, d, s)
        for (const t of o) {
          const r = t.child('tcStyle')
          r.exists() &&
            (Es(n, r, e), Ps(n, r, e, p, h, a, d, i.rowSpan, i.gridSpan))
        }
      }
      Ns(n, i, e)
      const c = o.length > 0 ? js(o, e) : void 0
      if (i.textBody) {
        const r = Ts(t) ? document.createElement('div') : n,
          o = Ts(t)
        o &&
          r !== n &&
          ((r.style.width = '100%'),
          (r.style.height = '100%'),
          (r.style.transform = o),
          (r.style.transformOrigin = 'center center'))
        const l = {
          defaultLineHeight: '1',
          trimOuterParagraphSpacing: !0,
          ...(c
            ? {
                cellTextColor: c.color,
                cellTextBold: c.bold,
                cellTextItalic: c.italic,
                cellTextFontFamily: c.fontFamily,
              }
            : {}),
        }
        ;(_i(i.textBody, void 0, e, r, l), r !== n && n.appendChild(r))
      }
      ;(r.appendChild(n), (h += i.gridSpan))
    }
    u.appendChild(r)
  }
  return (c.appendChild(u), r.appendChild(c), r)
}
function Ns(t, e, n) {
  const i = e.properties
  if (
    ('overflow' === (null == i ? void 0 : i.attr('horzOverflow')) &&
      (t.style.overflow = 'visible'),
    i)
  ) {
    if (i.child('noFill').exists())
      (Cs(t), (t.style.background = 'transparent'))
    else if (i.child('solidFill').exists()) {
      const e = i.child('solidFill')
      Cs(t)
      const { color: r, alpha: o } = en(e, n),
        l = r.startsWith('#') ? r : `#${r}`
      if (o < 1) {
        const { r: e, g: n, b: i } = Me(l)
        t.style.backgroundColor = `rgba(${e},${n},${i},${o.toFixed(3)})`
      } else t.style.backgroundColor = l
    } else {
      const e = sn(i, n)
      e && Ss(t, e)
    }
    ;(Rs(t, i, 'lnT', 'borderTop', n),
      Rs(t, i, 'lnB', 'borderBottom', n),
      Rs(t, i, 'lnL', 'borderLeft', n),
      Rs(t, i, 'lnR', 'borderRight', n))
  }
  const r = null == i ? void 0 : i.numAttr('marL'),
    o = null == i ? void 0 : i.numAttr('marR'),
    l = null == i ? void 0 : i.numAttr('marT'),
    s = null == i ? void 0 : i.numAttr('marB')
  ;((t.style.paddingLeft = `${H(r ?? 91440)}px`),
    (t.style.paddingRight = `${H(o ?? 91440)}px`),
    (t.style.paddingTop = `${H(l ?? 45720)}px`),
    (t.style.paddingBottom = `${H(s ?? 45720)}px`))
  const a = null == i ? void 0 : i.attr('anchor')
  t.style.verticalAlign =
    { t: 'top', ctr: 'middle', b: 'bottom' }[a || 't'] || 'top'
}
function Rs(t, e, n, i, r) {
  const o = e.child(n)
  if (!o.exists()) return
  if (o.child('noFill').exists()) return void (t.style[i] = 'none')
  const l = cn(o, r)
  l.width > 0 &&
    'transparent' !== l.color &&
    (t.style[i] = `${Math.max(l.width, 0.5)}px ${l.dash} ${l.color}`)
}
function Is(t) {
  return 'table' !== t.nodeType && 'chart' !== t.nodeType
}
function Ds(t, e) {
  const n = t.attr(e)
  if (void 0 === n) return !0
  const i = Number(n)
  return Number.isFinite(i) && 0 === i
}
function Os(t) {
  var e
  if ('pic' !== t.localName || t.child('style').exists()) return !1
  const n = t.child('nvPicPr').child('nvPr')
  if (n.child('videoFile').exists() || n.child('audioFile').exists()) return !1
  const i = t.child('blipFill'),
    r = i.child('blip'),
    o = i.child('stretch')
  if (
    !i.exists() ||
    !r.exists() ||
    !(r.attr('embed') ?? r.attr('r:embed')) ||
    r.allChildren().length > 0 ||
    !o.exists() ||
    i.child('tile').exists() ||
    !(function (t) {
      if (!t.exists()) return !0
      const e = ['t', 'r', 'b', 'l'].map((e) => {
        const n = t.attr(e)
        return void 0 === n ? 0 : Number(n) / 1e5
      })
      if (!e.every((t) => Number.isFinite(t) && t >= 0 && t <= 1)) return !1
      const [n, i, r, o] = e
      return o + i < 0.999 && n + r < 0.999
    })(i.child('srcRect'))
  )
    return !1
  const l = o.allChildren()
  if (
    l.length > 1 ||
    (1 === l.length &&
      ('fillRect' !== l[0].localName ||
        ((null == (e = l[0].element) ? void 0 : e.attributes.length) ?? 0) > 0))
  )
    return !1
  const s = t.child('spPr'),
    a = s.child('xfrm'),
    d = a.child('ext'),
    c = d.numAttr('cx'),
    u = d.numAttr('cy'),
    h = s.child('prstGeom')
  return !(
    !s.exists() ||
    !a.exists() ||
    !Number.isFinite(c) ||
    !Number.isFinite(u) ||
    !(c > 0) ||
    !(u > 0) ||
    !Ds(a, 'rot') ||
    !Ds(a, 'flipH') ||
    !Ds(a, 'flipV') ||
    (h.exists() &&
      ('rect' !== h.attr('prst') ||
        h.child('avLst').allChildren().length > 0)) ||
    s.child('custGeom').exists() ||
    s.child('scene3d').exists() ||
    s.child('sp3d').exists() ||
    s.child('effectLst').exists() ||
    s.child('effectDag').exists() ||
    s.child('ln').exists() ||
    ['solidFill', 'gradFill', 'pattFill', 'blipFill', 'grpFill'].some((t) =>
      s.child(t).exists(),
    )
  )
}
function Us(t) {
  const e = t.child('xfrm'),
    n = e.child('ext'),
    i = e.child('chExt')
  return [
    n.numAttr('cx'),
    n.numAttr('cy'),
    i.numAttr('cx'),
    i.numAttr('cy'),
  ].every((t) => void 0 !== t && Number.isFinite(t) && t > 0)
}
function Zs(t) {
  const e = ((t % 360) + 360) % 360
  return Math.abs(e - 90) < 1e-4 || Math.abs(e - 270) < 1e-4
}
function Gs(t, e, n, i) {
  if ('shape' !== t.nodeType) return
  const r = t
  if (!r.textBoxBounds) return
  const o = i ? n : e,
    l = i ? e : n,
    s = r.textBoxBounds
  r.textBoxBounds = { ...s, x: s.x * o, y: s.y * l, w: s.w * o, h: s.h * l }
}
function Xs(t, e, n, i) {
  const r = n.numAttr('dir') ?? 0,
    o = H(n.numAttr('dist') ?? 0),
    l = H(n.numAttr('blurRad') ?? 0),
    s = r / 6e4,
    a = o * Math.cos((s * Math.PI) / 180),
    d = o * Math.sin((s * Math.PI) / 180),
    c = (function (t, e, n) {
      const { color: i, alpha: r } = en(t, e)
      if (!i) return n
      const { r: o, g: l, b: s } = Me(i.startsWith('#') ? i : `#${i}`)
      return `rgba(${o},${l},${s},${r.toFixed(3)})`
    })(n, i, 'rgba(0,0,0,0.4)'),
    u = n.numAttr('sx'),
    h = n.numAttr('sy')
  if (null != u && null != h && u > 0 && h > 0) {
    const n = u / 1e5,
      i = h / 1e5,
      r = (e.size.w * (n - 1)) / 2,
      o = (e.size.h * (i - 1)) / 2,
      s = Math.max(0, (r + o) / 2)
    return void (t.style.boxShadow = `${a.toFixed(1)}px ${d.toFixed(1)}px ${l.toFixed(1)}px ${s.toFixed(1)}px ${c}`)
  }
  t.style.filter = `drop-shadow(${a.toFixed(1)}px ${d.toFixed(1)}px ${l.toFixed(1)}px ${c})`
}
function Ys(t, e, n) {
  var i
  const r = document.createElement('div')
  ;((r.style.position = 'absolute'),
    (r.style.left = `${t.position.x}px`),
    (r.style.top = `${t.position.y}px`),
    (r.style.width = `${t.size.w}px`),
    (r.style.height = `${t.size.h}px`))
  const o = []
  ;(0 !== t.rotation && o.push(`rotate(${t.rotation}deg)`),
    o.length > 0 &&
      ((r.style.transform = o.join(' ')),
      (r.style.transformOrigin = 'center center')))
  const l = t.childOffset,
    s = t.childExtent,
    a = t.size.w,
    d = t.size.h,
    c = t.source.child('grpSpPr'),
    u = {
      ...e,
      groupDepth: (e.groupDepth ?? 0) + 1,
      groupTransformHasRotationOrFlip: !!(
        e.groupTransformHasRotationOrFlip ||
        0 !== t.rotation ||
        t.flipH ||
        t.flipV
      ),
    }
  if (c.exists()) {
    for (const t of ['solidFill', 'gradFill', 'blipFill', 'pattFill'])
      if (c.child(t).exists()) {
        u.groupFillNode = c
        break
      }
    !u.groupFillNode &&
      c.child('grpFill').exists() &&
      e.groupFillNode &&
      (u.groupFillNode = e.groupFillNode)
  }
  const h = (function (t, e, n) {
    if (!t) return wo('missing-properties')
    if (t.parseIssues.length > 0) return wo('parse-issue', t.parseIssues)
    if (
      !Number.isFinite(e.width) ||
      !Number.isFinite(e.height) ||
      e.width <= 0 ||
      e.height <= 0
    )
      return wo('invalid-bounds')
    if (0 !== (e.rotation ?? 0) || e.flipH || e.flipV)
      return wo('shape-transform')
    if (e.hasTransformedAncestor || e.hasSceneAncestor)
      return wo('parent-container')
    if (
      2 !== e.childKinds.length ||
      e.childKinds.some((t) => 'pic' !== t) ||
      !e.hasSupportedPictureChildren ||
      !e.hasValidChildCoordinateSpace
    )
      return wo('group-child-profile')
    if (t.effectKinds.length > 0) return wo('effect-list-conflict')
    if (t.shape) return wo('group-shape-format')
    const i = t.scene
    if (!i) return wo('missing-scene')
    if (!i.cameraPreset) return wo('missing-camera')
    if (i.hasBackdrop) return wo('backdrop')
    if ('perspectiveLeft' !== i.cameraPreset) return wo('camera-preset')
    if (void 0 === i.fieldOfView || Math.abs(i.fieldOfView - 95) > 1e-6)
      return wo('camera-field-of-view')
    if (!Ao(i.cameraRotation, { latitude: 0, longitude: 25, revolution: 0 }))
      return wo('camera-rotation')
    if (void 0 !== i.cameraZoom) return wo('camera-zoom')
    if (!i.lightRig) return wo('missing-light-rig')
    if ('threePt' !== i.lightRig) return wo('light-rig')
    if ('t' !== i.lightDirection) return wo('light-direction')
    if (i.lightRotation) return wo('light-rotation')
    const r = oo({
      kind: 'perspective',
      width: e.width,
      height: e.height,
      presentationWidth: n.presentation.width,
      rotation: i.cameraRotation,
      fieldOfView: i.fieldOfView,
      presetViewportScale: ho,
    })
    return r
      ? {
          mode: 'camera-projected-group-plane',
          surface: 'group',
          geometry: 'rect',
          bounds: { width: e.width, height: e.height },
          corners: r.corners,
          camera: {
            kind: 'perspective',
            preset: 'perspectiveLeft',
            rotation: i.cameraRotation,
            fieldOfView: i.fieldOfView,
          },
          lighting: lo(e.width, e.height),
        }
      : wo('projection-out-of-range')
  })(
    t.shape3d,
    {
      width: a,
      height: d,
      container: 0 === (e.groupDepth ?? 0) ? 'standalone-slide' : 'group',
      hasTransformedAncestor: e.groupTransformHasRotationOrFlip,
      hasSceneAncestor: e.groupAncestorHas3dScene,
      rotation: t.rotation,
      flipH: t.flipH,
      flipV: t.flipV,
      childKinds: t.children.map((t) => t.localName),
      hasSupportedPictureChildren: t.children.every(Os),
      hasValidChildCoordinateSpace: Us(c),
    },
    e,
  )
  let p,
    f = r
  if ('camera-projected-group-plane' === h.mode) {
    const t = document.createElement('div')
    if (
      ((t.style.position = 'absolute'),
      (t.style.left = '0px'),
      (t.style.top = '0px'),
      (t.style.width = `${a}px`),
      (t.style.height = `${d}px`),
      (function (t, e) {
        if (
          'camera-projected-group-plane' !== (null == e ? void 0 : e.mode) ||
          t.style.transform
        )
          return !1
        const n = io(e.bounds.width, e.bounds.height, e.corners)
        return (
          !!n &&
          ((t.dataset.pptxShape3dProjectedGroupPlane = e.camera.kind),
          (t.style.transformOrigin = '0px 0px'),
          (t.style.transform = n),
          !0)
        )
      })(t, h))
    ) {
      const e = document.createElement('div')
      ;((e.dataset.pptxShape3dGroupContent = 'true'),
        (e.style.position = 'absolute'),
        (e.style.inset = '0'),
        (e.style.filter = `brightness(${h.lighting.brightness})`),
        t.appendChild(e),
        r.appendChild(t),
        (f = e),
        (p = t))
    } else r.dataset.pptxShape3dFallback = 'projection-out-of-range'
  } else t.shape3d && (r.dataset.pptxShape3dFallback = h.reason)
  u.groupAncestorHas3dScene = !!(
    e.groupAncestorHas3dScene ||
    (null != (i = t.shape3d) && i.scene)
  )
  const m = new Map(),
    $ = (n) => (
      m.has(n) ||
        m.set(
          n,
          (function (t, e, n) {
            const i = qt(t, {
              rels: e.slide.rels,
              partPath: e.partPath ?? e.slide.slidePath,
              diagramDrawings: e.presentation.diagramDrawings,
              skipPlaceholders: e.skipPlaceholderChildren,
            })
            return (i && be(i, e.layout, e.master, { parentGroup: n }), i)
          })(t.children[n], e, t),
        ),
      m.get(n)
    )
  let g = null,
    y = null
  if (
    'urn:microsoft.com/office/officeart/2005/8/layout/cycle8' ===
      t.diagramLayoutId &&
    6 === t.children.length &&
    s.w > 0 &&
    s.h > 0
  ) {
    const e = (t) => t.child('spPr').child('prstGeom').attr('prst'),
      n = t.children.slice(0, 3).every((t) => 'pie' === e(t)),
      i = t.children.slice(3, 6).every((t) => 'circularArrow' === e(t))
    if (n && i) {
      const t = [0, 1, 2].map((t) => $(t)).filter(Boolean)
      if (3 === t.length) {
        const e = Math.max(...t.map((t) => t.size.w)),
          n = Math.max(...t.map((t) => t.size.h)),
          i = Math.min(e, n, s.w, s.h),
          r = l.x + s.w / 2,
          o = l.y + s.h / 2,
          c = o - i / 2
        g = {
          x: ((r - i / 2 - l.x) / s.w) * a,
          y: ((c - l.y) / s.h) * d,
          w: (i / s.w) * a,
          h: (i / s.h) * d,
        }
        const u = t[0].size
        t.every(
          (t) =>
            Math.abs(t.size.w - u.w) < 0.01 && Math.abs(t.size.h - u.h) < 0.01,
        ) &&
          (y = new Map(
            t.map((t, e) => [
              e,
              {
                x: ((t.position.x + t.size.w / 2 - r) / s.w) * a,
                y: ((t.position.y + t.size.h / 2 - o) / s.h) * d,
              },
            ]),
          ))
      }
    }
  }
  const x = (g ? [3, 4, 5, 0, 1, 2] : void 0) ?? t.children.map((t, e) => e)
  for (const v of x)
    try {
      const e = $(v)
      if (!e) continue
      const i = e.size
      if (s.w > 0 || s.h > 0) {
        const t = s.w > 0 ? a / s.w : 1,
          n = s.h > 0 ? d / s.h : 1,
          r = Zs(e.rotation),
          o = e.position
        if (r) {
          const r = o.x + (i.w - i.h) / 2,
            s = o.y + (i.h - i.w) / 2,
            a = { w: i.w * n, h: i.h * t }
          ;((e.position = {
            x: (r - l.x) * t - (a.w - a.h) / 2,
            y: (s - l.y) * n - (a.h - a.w) / 2,
          }),
            (e.size = a))
        } else
          ((e.position = { x: (o.x - l.x) * t, y: (o.y - l.y) * n }),
            (e.size = { w: i.w * t, h: i.h * n }))
        Gs(e, t, n, r)
      }
      if (
        (t.flipH &&
          ((e.position = { ...e.position, x: a - e.position.x - e.size.w }),
          Is(e) && (e.flipH = !e.flipH)),
        t.flipV &&
          ((e.position = { ...e.position, y: d - e.position.y - e.size.h }),
          Is(e) && (e.flipV = !e.flipV)),
        g && v < 3 && 'shape' === e.nodeType)
      ) {
        const t = e.size.w,
          n = e.size.h,
          i = (null == y ? void 0 : y.get(v)) ?? { x: 0, y: 0 }
        ;((e.position = { x: g.x + i.x, y: g.y + i.y }),
          (e.size = { w: g.w, h: g.h }))
        const r = e
        if (t > 0 && n > 0 && r.textBoxBounds) {
          const e = r.textBoxBounds
          r.textBoxBounds = {
            x: (e.x / t) * g.w,
            y: (e.y / n) * g.h,
            w: (e.w / t) * g.w,
            h: (e.h / n) * g.h,
          }
        }
      }
      const r = {
          x: i.w > 0 ? e.size.w / i.w : 1,
          y: i.h > 0 ? e.size.h / i.h : 1,
        },
        o = n(e, { ...u, groupChildScale: r })
      f.appendChild(o)
    } catch {
      const t = document.createElement('div')
      ;((t.style.position = 'absolute'),
        (t.style.border = '1px dashed #ff6b6b'),
        (t.style.backgroundColor = 'rgba(255,107,107,0.1)'),
        (t.style.fontSize = '10px'),
        (t.style.color = '#cc0000'),
        (t.style.display = 'flex'),
        (t.style.alignItems = 'center'),
        (t.style.justifyContent = 'center'),
        (t.style.padding = '2px'),
        (t.textContent = 'Group child error'),
        f.appendChild(t))
    }
  if (p && 'camera-projected-group-plane' === h.mode) {
    const t = document.createElement('div')
    ;((t.dataset.pptxShape3dGroupLighting = 'threePt:t'),
      (t.style.position = 'absolute'),
      (t.style.inset = '0'),
      (t.style.pointerEvents = 'none'),
      (t.style.backgroundColor = `rgba(255, 255, 255, ${h.lighting.opacity})`),
      p.appendChild(t))
  }
  return (
    c.exists() &&
      (function (t, e, n, i) {
        const r = i.child('effectLst')
        if (!r.exists()) return
        const o = r.child('outerShdw')
        o.exists() && Xs(t, e, o, n)
        const l = r.child('reflection')
        l.exists() && Vn(t, l, e.size)
      })(r, t, e, c),
    r
  )
}
vs.size
var Ws = 1e4
function Hs(t) {
  const e = t.child('ptCount').numAttr('val')
  let n = -1
  for (const o of t.children('pt')) {
    const t = o.numAttr('idx')
    void 0 !== t &&
      Number.isInteger(t) &&
      t >= 0 &&
      t < Ws &&
      (n = Math.max(n, t))
  }
  const i = n + 1
  if (void 0 === e || !Number.isFinite(e) || e < 0) return i
  const r = Math.floor(e)
  return r > Ws ? i : Math.min(Math.max(r, i), Ws)
}
function Vs(t, e) {
  return void 0 !== t && Number.isInteger(t) && t >= 0 && t < e && t < Ws
}
function qs(t, e) {
  const n = [
    t.child(`${e}Ref`).child(`${e}Cache`),
    t.child(`${e}Lit`),
    t.child(`${e}Cache`),
  ]
  return (
    n.find((t) => t.children('pt').length > 0) ??
    n.find((t) => t.exists()) ??
    n[0]
  )
}
function _s(t) {
  const e = qs(t, 'str')
  if (0 === e.children('pt').length) {
    const n = qs(t, 'num')
    if (n.exists() && (!e.exists() || n.children('pt').length > 0))
      return (function (t) {
        const e = Hs(t),
          n = new Array(e).fill(''),
          i = t.child('formatCode').text(),
          r = i && /[yYmMdD]/.test(i) && !/[#0]/.test(i)
        for (const o of t.children('pt')) {
          const t = o.numAttr('idx')
          if (Vs(t, e)) {
            const e = o.child('v').text()
            n[t] = r && e ? ta(parseFloat(e)) : e
          }
        }
        return n
      })(n)
    if (!e.exists()) return []
  }
  const n = Hs(e),
    i = new Array(n).fill('')
  for (const r of e.children('pt')) {
    const t = r.numAttr('idx')
    Vs(t, n) && (i[t] = r.child('v').text())
  }
  return i
}
function Qs(t) {
  const e = qs(t, 'num')
  if (!e.exists()) return
  const n = e.child('formatCode')
  return (n.exists() && n.text()) || void 0
}
function Ks(t, e) {
  if (!e || 'General' === e)
    return Number.isInteger(t) ? String(t) : parseFloat(t.toFixed(2)).toString()
  if (e.includes('%')) {
    const n = e.match(/0\.(0+)%/),
      i = n ? n[1].length : 0
    return `${(100 * t).toFixed(i)}%`
  }
  const n = (function (t, e) {
    const n = (function (t) {
        const e = []
        let n = '',
          i = !1
        for (let r = 0; r < t.length; r++) {
          const o = t[r]
          '"' !== o
            ? ';' !== o || i
              ? (n += o)
              : (e.push(n), (n = ''))
            : ((i = !i), (n += o))
        }
        return (e.push(n), e)
      })(e),
      i = t < 0 && n.length > 1,
      r = (function (t) {
        const e = t.replace(/\[[^\]]+\]/g, '')
        let n = ''
        for (let i = 0; i < e.length; i++) {
          const t = e[i]
          if ('"' !== t)
            '\\' !== t
              ? '_' !== t && '*' !== t
                ? (n += t)
                : i++
              : i + 1 < e.length && (n += e[++i])
          else for (i++; i < e.length && '"' !== e[i];) i++
        }
        return n.trim()
      })(i ? n[1] : n[0])
    if (!/[#0]/.test(r) || (!r.includes(',') && 1 === n.length)) return
    const o = r.match(/\.(0+|#+)/),
      l = o ? o[1].length : 0,
      s = r.includes(','),
      a = (i ? Math.abs(t) : t).toLocaleString('en-US', {
        useGrouping: s,
        minimumFractionDigits: null != o && o[1].includes('0') ? l : 0,
        maximumFractionDigits: l,
      })
    return i
      ? r.includes('(') && r.includes(')')
        ? `(${a})`
        : r.includes('-')
          ? `-${a}`
          : a
      : a
  })(t, e)
  if (void 0 !== n) return n
  const i = e.match(/\.(0+|#+)/)
  if (i) {
    const e = i[1].length
    return parseFloat(t.toFixed(e)).toString()
  }
  return /^[#0,]+$/.test(e.replace(/[[\]"\\]/g, ''))
    ? Math.round(t).toString()
    : Number.isInteger(t)
      ? String(t)
      : parseFloat(t.toFixed(2)).toString()
}
function Js(t) {
  const e = qs(t, 'num')
  if (!e.exists()) return { values: [], blankIndices: new Set() }
  const n = Hs(e),
    i = new Array(n).fill(0),
    r = new Set()
  for (let o = 0; o < n; o++) r.add(o)
  for (const o of e.children('pt')) {
    const t = o.numAttr('idx')
    if (Vs(t, n)) {
      const e = o.child('v').text().trim(),
        n = parseFloat(e)
      '' !== e && !isNaN(n) && ((i[t] = n), r.delete(t))
    }
  }
  return { values: i, blankIndices: r }
}
function ta(t) {
  if (!Number.isFinite(t) || t < 1) return String(t)
  const e = t > 59 ? t - 1 : t,
    n = new Date(Date.UTC(1899, 11, 31) + 864e5 * e)
  return `${n.getUTCFullYear()}/${n.getUTCMonth() + 1}/${n.getUTCDate()}`
}
function ea(t) {
  return !!t.exists() && na(t.attr('val'), !0)
}
function na(t, e) {
  return nt(t, e)
}
function ia(t, e) {
  try {
    const { color: n } = en(t, e)
    return n.startsWith('#') ? n : `#${n}`
  } catch {
    return
  }
}
function ra(t, e) {
  const n = t.numAttr('pos')
  if (void 0 !== n)
    for (const i of t.allChildren()) {
      const r = i.localName
      if (
        'srgbClr' === r ||
        'schemeClr' === r ||
        'sysClr' === r ||
        'prstClr' === r
      )
        try {
          const i = en(t, e)
          return {
            color: i.color.startsWith('#') ? i.color : `#${i.color}`,
            alpha: i.alpha,
            pos: n / 1e5,
          }
        } catch {
          if ('sysClr' === r) {
            const t = i.attr('lastClr')
            if (t) {
              const e = i.child('alpha')
              return {
                color: `#${t}`,
                alpha: e.exists() ? (e.numAttr('val') ?? 1e5) / 1e5 : 1,
                pos: n / 1e5,
              }
            }
          }
          return
        }
    }
}
function oa(t, e) {
  const n = t.child('spPr')
  if (!n.exists()) return
  const i = n.child('solidFill')
  if (i.exists()) {
    const t = ia(i, e)
    if (t) return t
  }
  const r = n.child('gradFill')
  if (r.exists()) {
    const t = (function (t, e) {
      const n = t.child('gsLst')
      if (!n.exists()) return
      const i = []
      for (const c of n.children('gs')) {
        const t = ra(c, e)
        if (t) {
          const e = t.color.replace('#', ''),
            n = parseInt(e.substring(0, 2), 16),
            r = parseInt(e.substring(2, 4), 16),
            o = parseInt(e.substring(4, 6), 16)
          i.push({ offset: t.pos, color: `rgba(${n},${r},${o},${t.alpha})` })
        }
      }
      if (i.length < 2) return
      i.sort((t, e) => t.offset - e.offset)
      const r = t.child('lin'),
        o =
          (((r.exists() ? (r.numAttr('ang') ?? 54e5) : 54e5) / 6e4) * Math.PI) /
          180,
        l = 0.5 - 0.5 * Math.cos(o),
        s = 0.5 - 0.5 * Math.sin(o),
        a = 0.5 + 0.5 * Math.cos(o),
        d = 0.5 + 0.5 * Math.sin(o)
      return new x(l, s, a, d, i)
    })(r, e)
    if (t) return t
  }
  const o = n.child('ln')
  if (o.exists()) {
    const t = o.child('solidFill')
    if (t.exists()) {
      const n = ia(t, e)
      if (n) return n
    }
  }
}
function la(t) {
  const e = t.child('spPr').child('ln').numAttr('w')
  if (!(void 0 === e || e <= 0))
    return Math.max(1, Number((e / 12700).toFixed(3)))
}
function sa(t) {
  return Number(
    (function (t) {
      return (96 * t) / 72
    })(t).toFixed(3),
  )
}
function aa(t) {
  return t.child('spPr').child('ln').child('noFill').exists()
}
function da(t) {
  return 'dotted' === t ? 'dotted' : 'dashed' === t ? 'dashed' : 'solid'
}
function ca(t, e) {
  if (!t.exists() || t.child('noFill').exists()) return
  const n = cn(t, e)
  return n.width <= 0 || 'transparent' === n.color
    ? void 0
    : { color: n.color, width: Math.max(n.width, 0.5), type: da(n.dash) }
}
function ua(t, e) {
  const n = t.children('dPt')
  if (0 === n.length) return
  const i = []
  for (const r of n) {
    const t = r.child('idx').numAttr('val')
    if (void 0 === t) continue
    const n = r.child('spPr')
    if (!n.exists()) continue
    const o = {},
      l = n.child('solidFill')
    if (l.exists()) {
      const t = ia(l, e)
      t && (o.color = t)
    }
    const s = ca(n.child('ln'), e)
    if (
      (s &&
        ((o.borderColor = s.color),
        (o.borderWidth = s.width),
        (o.borderType = s.type)),
      Object.keys(o).length > 0)
    ) {
      for (; i.length <= t;) i.push(void 0)
      i[t] = o
    }
  }
  return i.length > 0 ? i : void 0
}
r([o, d, l, f, m, p, n, i, u, h, e, v, g, c, $, y])
var ha = Symbol('pptxExplicitFontSize'),
  pa = '#000000',
  fa = '#898989',
  ma = { color: fa, width: 1, type: 'solid' },
  $a = { color: '#868686', width: 1, type: 'solid' },
  ga = ['accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6']
function ya(t) {
  return ((t[ha] = !0), t)
}
function xa(t) {
  return !(!t || 'object' != typeof t || !t[ha])
}
var va = [
  'barChart',
  'bar3DChart',
  'lineChart',
  'line3DChart',
  'areaChart',
  'area3DChart',
  'pieChart',
  'pie3DChart',
  'doughnutChart',
  'radarChart',
  'scatterChart',
  'bubbleChart',
  'stockChart',
  'surface3DChart',
]
function ba(t) {
  const e = t.child('tx')
  if (!e.exists()) return
  const n = e.child('rich')
  if (n.exists()) {
    const t = []
    for (const e of n.children('p')) {
      const n = []
      for (const t of e.allChildren()) {
        if ('br' === t.localName) {
          n.push('\n')
          continue
        }
        if ('r' !== t.localName && 'fld' !== t.localName) continue
        const e = t.child('t').text()
        e && n.push(e)
      }
      const i = n.join('')
      i && t.push(i)
    }
    if (t.length > 0) return t.join('\n')
  }
  const i = e.child('strRef')
  if (i.exists()) {
    const t = i.child('strCache').children('pt')
    if (t.length > 0) return t[0].child('v').text()
  }
}
function Ma(t) {
  return t
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\|/g, '\\|')
}
function wa(t) {
  if (!t) return
  const e = {
    ...(t.color ? { color: t.color } : {}),
    ...(void 0 !== t.fontSize ? { fontSize: t.fontSize } : {}),
    ...(t.fontFamily ? { fontFamily: t.fontFamily } : {}),
    ...(t.textShadowColor ? { textShadowColor: t.textShadowColor } : {}),
    ...(void 0 !== t.textShadowBlur
      ? { textShadowBlur: t.textShadowBlur }
      : {}),
    ...(void 0 !== t.textShadowOffsetX
      ? { textShadowOffsetX: t.textShadowOffsetX }
      : {}),
    ...(void 0 !== t.textShadowOffsetY
      ? { textShadowOffsetY: t.textShadowOffsetY }
      : {}),
  }
  return (
    void 0 !== t.bold && (e.fontWeight = t.bold ? 'bold' : 'normal'),
    Object.keys(e).length > 0 ? e : void 0
  )
}
function ka(t, e) {
  const n = t.child('txPr')
  if (n.exists())
    for (const i of n.children('p')) {
      const t = i.child('pPr')
      if (!t.exists()) continue
      const n = t.child('defRPr')
      if (!n.exists()) continue
      const r = n.child('solidFill')
      if (r.exists()) return ia(r, e)
    }
}
function Aa(t, e) {
  const n = t.startsWith('#') ? t : `#${t}`
  if (e >= 1) return n
  const {
    r: i,
    g: r,
    b: o,
  } = (function (t) {
    const e = t.replace(/^#/, ''),
      n = 3 === e.length ? e[0] + e[0] + e[1] + e[1] + e[2] + e[2] : e,
      i = parseInt(n, 16)
    return { r: (i >> 16) & 255, g: (i >> 8) & 255, b: 255 & i }
  })(n)
  return `rgba(${i},${r},${o},${e.toFixed(3)})`
}
function La(t, e) {
  if (!t.exists()) return
  const n = {},
    i = t.child('solidFill')
  if (i.exists()) {
    const t = ia(i, e)
    t && (n.color = t)
  }
  const r = t.numAttr('sz')
  void 0 !== r && r > 0 && ((n.fontSize = Math.round(r / 100)), (n[ha] = !0))
  const o = t.attr('b')
  void 0 !== o && (n.bold = nt(o))
  const l = ii(
    [
      t.child('latin').attr('typeface'),
      t.child('ea').attr('typeface'),
      t.child('cs').attr('typeface'),
    ],
    e,
    [t.attr('lang'), t.attr('altLang')],
  )
  l.length > 0 && (n.fontFamily = ui(l))
  const s = (function (t, e) {
    const n = t.child('effectLst').child('outerShdw')
    if (n.exists())
      try {
        const { color: t, alpha: i } = en(n, e)
        if (!t || i <= 0) return
        const r = H(n.numAttr('dist') ?? 0),
          o = H(n.numAttr('blurRad') ?? 0),
          l = (n.numAttr('dir') ?? 0) / 6e4,
          s = r * Math.cos((l * Math.PI) / 180),
          a = r * Math.sin((l * Math.PI) / 180)
        return {
          textShadowColor: Aa(t, i),
          textShadowBlur: o,
          textShadowOffsetX: s,
          textShadowOffsetY: a,
        }
      } catch {
        return
      }
  })(t, e)
  return (
    s && Object.assign(n, s),
    n.color ||
    void 0 !== n.fontSize ||
    void 0 !== n.bold ||
    void 0 !== n.fontFamily ||
    void 0 !== n.textShadowColor
      ? n
      : void 0
  )
}
function Sa(t, e) {
  for (const n of t.children('p')) {
    const t = n.child('pPr')
    if (!t.exists()) continue
    const i = La(t.child('defRPr'), e)
    if (i) return i
  }
}
function Ca(t, e) {
  const n = t.child('txPr')
  if (n.exists()) return Sa(n, e)
}
function Fa(t, e) {
  return Ca(t, e) ?? Sa(t.child('tx').child('rich'), e)
}
function Ba(t) {
  const e = ii(['+mn-lt', '+mn-ea', '+mj-lt', '+mj-ea'], t)
  return e.length > 0 ? ui(e) : void 0
}
var ja = {
  deleted: !1,
  tickLblPos: 'nextTo',
  hasMajorGridlines: !1,
  orientation: 'minMax',
}
function Ea(t, e) {
  const n = t.theme.colorScheme.get(e)
  return null == n ? void 0 : n.replace('#', '').toUpperCase()
}
function Pa(t) {
  const e = (
    t.child('tx').child('rich').child('bodyPr').exists()
      ? t.child('tx').child('rich').child('bodyPr')
      : t.child('txPr').child('bodyPr')
  ).numAttr('rot')
  if (void 0 === e) return
  return Number((e / 6e4).toFixed(3))
}
function Ta(t, e) {
  if (!t.exists()) return { ...ja }
  const n = ea(t.child('delete')),
    i = t.child('tickLblPos').attr('val') || 'nextTo',
    r = t.child('crosses').attr('val'),
    o = t.child('numFmt'),
    l = (o.exists() && o.attr('formatCode')) || void 0,
    s = t.child('scaling'),
    a = s.child('min'),
    d = s.child('max'),
    c = a.exists() ? parseFloat(a.attr('val') || '') : void 0,
    u = d.exists() ? parseFloat(d.attr('val') || '') : void 0,
    h = t.child('majorGridlines').exists(),
    p = t.child('majorTickMark').attr('val'),
    f = s.child('orientation').attr('val') || 'minMax',
    m = Ca(t, e),
    $ =
      (null == m ? void 0 : m.color) ??
      (function (t, e) {
        const n = t.child('txPr')
        if (n.exists())
          for (const i of n.children('p')) {
            const t = i.child('pPr')
            if (!t.exists()) continue
            const n = t.child('defRPr')
            if (!n.exists()) continue
            const r = n.child('solidFill')
            if (r.exists()) return ia(r, e)
          }
      })(t, e),
    g = null == m ? void 0 : m.fontSize,
    y = (function (t) {
      if ('4F81BD' === Ea(t, 'accent1') && 'C0504D' === Ea(t, 'accent2'))
        return '#000000'
    })(e),
    x =
      (function (t, e) {
        const n = t.child('spPr').child('ln')
        if (!n.exists()) return
        const i = n.child('solidFill')
        return i.exists() ? ia(i, e) : void 0
      })(t, e) ?? y,
    v = h
      ? ((function (t, e) {
          return ca(t.child('majorGridlines').child('spPr').child('ln'), e)
        })(t, e) ?? (y ? { ...ma, color: y } : void 0))
      : void 0,
    b = (function (t, e) {
      const n = t.child('title')
      if (!n.exists()) return {}
      const i = ba(n)
      return i ? { title: i, titleStyle: Fa(n, e), titleRotation: Pa(n) } : {}
    })(t, e)
  return {
    deleted: n,
    tickLblPos: i,
    crosses: r,
    numFmt: l && 'General' !== l ? l : void 0,
    min: void 0 === c || isNaN(c) ? void 0 : c,
    max: void 0 === u || isNaN(u) ? void 0 : u,
    hasMajorGridlines: h,
    majorTickMark: p,
    orientation: f,
    ...b,
    labelColor: $,
    labelFontSize: g,
    lineColor: x,
    majorGridlineStyle: v,
  }
}
function za(t) {
  return null != t && t.exists()
    ? t
        .children('axId')
        .map((t) => t.attr('val'))
        .filter((t) => void 0 !== t && '' !== t)
    : []
}
function Na(t, e, n) {
  var i
  if (n) {
    for (const i of e) {
      const e = t.children(i).find((t) => t.child('axId').attr('val') === n)
      if (e) return e
    }
    return new U(null)
  }
  for (const r of e) {
    const e = t.children(r)
    if (null != (i = e[0]) && i.exists()) return e[0]
  }
  return new U(null)
}
function Ra(t, e, n) {
  const i = za(n),
    r = i[0],
    o = Na(t, ['valAx'], i[1]),
    l = Na(t, ['catAx', 'dateAx'], r)
  return { valueAxis: Ta(o, e), categoryAxis: Ta(l, e) }
}
function Ia(t, e) {
  const n = t.children('valAx')
  let i = { ...ja },
    r = { ...ja }
  for (const o of n) {
    const t = o.child('axPos').attr('val') ?? '',
      n = Ta(o, e)
    'b' === t || 't' === t ? (i = n) : ('l' === t || 'r' === t) && (r = n)
  }
  return (1 === n.length && (r = Ta(n[0], e)), { xAxis: i, yAxis: r })
}
function Da(t, e, n) {
  var i, r, o, l
  if (e.deleted)
    return (
      (t.axisLabel = { ...(t.axisLabel || {}), show: !1 }),
      (t.axisLine = { show: !1 }),
      (t.axisTick = { show: !1 }),
      void ('value' === n && (t.splitLine = { show: !1 }))
    )
  if (
    ('maxMin' === e.orientation && (t.inverse = !0),
    'autoZero' === e.crosses &&
      (t.axisLine = { ...(t.axisLine || {}), onZero: !0 }),
    e.title)
  ) {
    ;((t.name = e.title),
      (t.nameLocation = 'middle'),
      (t.nameGap = 'value' === n ? 42 : 28),
      void 0 !== e.titleRotation && (t.nameRotate = e.titleRotation))
    const s = {}
    ;(null != (i = e.titleStyle) && i.color && (s.color = e.titleStyle.color),
      void 0 !== (null == (r = e.titleStyle) ? void 0 : r.fontSize) &&
        (s.fontSize = e.titleStyle.fontSize),
      null != (o = e.titleStyle) &&
        o.fontFamily &&
        (s.fontFamily = e.titleStyle.fontFamily),
      void 0 !== (null == (l = e.titleStyle) ? void 0 : l.bold) &&
        (s.fontWeight = e.titleStyle.bold ? 'bold' : 'normal'),
      Object.keys(s).length > 0 && (t.nameTextStyle = s))
  }
  if (
    ('none' === e.tickLblPos &&
      (t.axisLabel = { ...(t.axisLabel || {}), show: !1 }),
    'none' === e.majorTickMark)
  )
    t.axisTick = { ...(t.axisTick || {}), show: !1 }
  else if (!e.deleted) {
    const n = t.axisTick || {},
      i = n.lineStyle || {}
    void 0 === i.color &&
      (t.axisTick = { ...n, lineStyle: { ...i, color: e.lineColor ?? fa } })
  }
  if (
    ('value' === n &&
      (void 0 !== e.min && (t.min = e.min),
      void 0 !== e.max && (t.max = e.max)),
    'value' === n && !e.deleted && 'none' !== e.tickLblPos)
  ) {
    const n = t.axisLabel || {}
    if (!n.formatter) {
      const i = e.numFmt
      t.axisLabel = { ...n, formatter: (t) => Ks(t, i) }
    }
  }
  if (!e.deleted && 'none' !== e.tickLblPos) {
    const e = t.axisLabel || {}
    void 0 === e.fontSize && (t.axisLabel = { ...e, fontSize: 10 })
  }
  if ('value' === n)
    if (e.hasMajorGridlines)
      if (e.majorGridlineStyle) {
        const n = t.splitLine || {},
          i = n.lineStyle || {}
        t.splitLine = {
          ...n,
          show: !0,
          lineStyle: { ...i, ...e.majorGridlineStyle },
        }
      } else {
        const e = t.splitLine || {},
          n = e.lineStyle || {}
        t.splitLine = { ...e, show: !0, lineStyle: { ...ma, ...n } }
      }
    else t.splitLine = { show: !1 }
  if (e.labelColor || !e.deleted) {
    const n = t.axisLabel || {},
      i = e.labelColor ?? (void 0 === n.color ? pa : void 0)
    i && (t.axisLabel = { ...n, color: i })
  }
  if (
    (void 0 !== e.labelFontSize &&
      (t.axisLabel = { ...(t.axisLabel || {}), fontSize: e.labelFontSize }),
    e.lineColor || !e.deleted)
  ) {
    const n = t.axisLine || {},
      i = n.lineStyle || {},
      r = e.lineColor ?? (void 0 === i.color ? fa : void 0)
    r &&
      (t.axisLine = { ...n, show: n.show ?? !0, lineStyle: { ...i, color: r } })
  }
}
function Oa(t, e) {
  return ea(t.child(e))
}
function Ua(t) {
  const e = t.child('layout').child('manualLayout')
  if (!e.exists()) return
  const n = {},
    i = e.child('x').numAttr('val'),
    r = e.child('y').numAttr('val'),
    o = e.child('w').numAttr('val'),
    l = e.child('h').numAttr('val')
  return (
    void 0 !== i && (n.x = i),
    void 0 !== r && (n.y = r),
    void 0 !== o && (n.width = o),
    void 0 !== l && (n.height = l),
    Object.keys(n).length > 0 ? n : void 0
  )
}
function Za(t, e) {
  const n = t.child('dLbls')
  if (!n.exists()) return
  const i = Oa(n, 'showVal'),
    r = Oa(n, 'showCatName'),
    o = Oa(n, 'showSerName'),
    l = Oa(n, 'showPercent'),
    s = Oa(n, 'showLeaderLines'),
    a = n.child('dLblPos'),
    d = (a.exists() && a.attr('val')) || void 0,
    c = Ua(n),
    u = Ca(n, e),
    h = (null == u ? void 0 : u.color) ?? ka(n, e),
    p = null == u ? void 0 : u.fontSize,
    f = null == u ? void 0 : u.bold,
    m = Xa(n, e)
  return i || r || o || l
    ? {
        showVal: i,
        showCatName: r,
        showSerName: o,
        showPercent: l,
        position: d,
        showLeaderLines: s,
        manualLayout: c,
        color: h,
        fontSize: p,
        bold: f,
        ...m,
      }
    : void 0
}
function Ga(t, e) {
  const n = t.child(e)
  if (n.exists()) return ea(n)
}
function Xa(t, e) {
  const n = {},
    i = t.child('spPr')
  if (i.exists()) {
    const t = i.child('solidFill')
    if (t.exists()) {
      const i = ia(t, e)
      i && (n.backgroundColor = i)
    }
    const r = i.child('ln')
    if (r.exists() && !r.child('noFill').exists()) {
      const t = r.child('solidFill')
      if (t.exists()) {
        const i = ia(t, e)
        i && (n.borderColor = i)
      }
      const i = r.numAttr('w')
      void 0 !== i && i > 0
        ? (n.borderWidth = Math.max(1, H(i)))
        : n.borderColor && (n.borderWidth = 1)
    }
  }
  const r = t.child('txPr').child('bodyPr')
  if (r.exists()) {
    const t = H(r.numAttr('tIns') ?? 0),
      e = H(r.numAttr('rIns') ?? 0),
      i = H(r.numAttr('bIns') ?? 0),
      o = H(r.numAttr('lIns') ?? 0)
    ;(t || e || i || o) && (n.padding = [t, e, i, o])
  }
  return n
}
function Ya(t, e) {
  const n = new Map()
  if (!t.exists()) return n
  for (const i of t.children('dLbl')) {
    const t = i.child('idx').numAttr('val')
    if (void 0 === t) continue
    const r = Ca(i, e),
      o = i.child('dLblPos'),
      l = {},
      s = Ga(i, 'delete'),
      a = Ga(i, 'showVal'),
      d = Ga(i, 'showCatName'),
      c = Ga(i, 'showSerName'),
      u = Ga(i, 'showPercent'),
      h = Ga(i, 'showLeaderLines'),
      p = Ua(i)
    if (
      (void 0 !== a && (l.showVal = a),
      void 0 !== d && (l.showCatName = d),
      void 0 !== c && (l.showSerName = c),
      void 0 !== u && (l.showPercent = u),
      !0 === s &&
        ((l.deleted = !0),
        (l.showVal = !1),
        (l.showCatName = !1),
        (l.showSerName = !1),
        (l.showPercent = !1)),
      void 0 !== h && (l.showLeaderLines = h),
      p && (l.manualLayout = p),
      o.exists() && (l.position = o.attr('val') || void 0),
      null != r && r.color)
    )
      l.color = r.color
    else {
      const t = ka(i, e)
      t && (l.color = t)
    }
    ;(void 0 !== (null == r ? void 0 : r.fontSize) && (l.fontSize = r.fontSize),
      void 0 !== (null == r ? void 0 : r.bold) && (l.bold = r.bold),
      Object.assign(l, Xa(i, e)),
      Object.keys(l).length > 0 && n.set(t, l))
  }
  return n
}
function Wa(t) {
  const e = t.child('strRef')
  if (e.exists()) {
    const t = e.child('strCache').children('pt')
    if (t.length > 0) return t[0].child('v').text()
  }
  const n = t.child('v')
  return n.exists() ? n.text() : ''
}
function Ha(t, e) {
  const n = new Array(e).fill(0)
  let i = !1
  const r = t.child('explosion').numAttr('val') ?? 0
  r > 0 && (n.fill(r), (i = !0))
  const o = t.children('dPt')
  for (const l of o) {
    const t = l.child('idx').numAttr('val')
    if (void 0 === t) continue
    const e = l.child('explosion').numAttr('val')
    void 0 !== e && e > 0 && ((n[t] = e), (i = !0))
  }
  return i ? n : void 0
}
function Va(t) {
  const e = t.child('dTable')
  return e.exists()
    ? { showKeys: na(e.child('showKeys').attr('val'), !0) }
    : void 0
}
function qa(t, e) {
  const n = (function (t) {
    const e = t.child('clrMapOvr')
    if (!e.exists()) return
    let n = e.element
    const i = e.child('overrideClrMapping')
    if (i.exists() && i.element) n = i.element
    else if (e.child('masterClrMapping').exists()) return
    if (!n) return
    const r = n.attributes,
      o = new Map()
    for (let l = 0; l < r.length; l++) {
      const t = r[l]
      o.set(t.localName, t.value)
    }
    return o.size > 0 ? o : void 0
  })(t)
  return n
    ? {
        ...e,
        slide: {
          ...e.slide,
          colorMapOverride: void 0,
          colorMapOverrideMode: void 0,
        },
        layout: {
          ...e.layout,
          colorMapOverride: n,
          colorMapOverrideMode: 'override',
        },
        colorCache: new Map(),
      }
    : e
}
var _a = new Set([
  'srgbClr',
  'schemeClr',
  'sysClr',
  'prstClr',
  'hslClr',
  'scrgbClr',
])
function Qa(t, e) {
  if (!t.element || !_a.has(t.localName)) return
  const n = t.element.ownerDocument.createElementNS(
    t.element.namespaceURI,
    'solidFill',
  )
  return (n.appendChild(t.element.cloneNode(!0)), ia(new U(n), e))
}
function Ka(t) {
  return ga
    .map((e) => t.theme.colorScheme.get(e))
    .filter((t) => !!t)
    .map((t) => (t.startsWith('#') ? t : `#${t}`))
}
function Ja(t, e = {}) {
  const n = Ka(t)
  return !1 === e.darken
    ? n
    : n.map((t) =>
        (function (t, e) {
          const n = t.replace('#', '')
          if (!/^[0-9a-fA-F]{6}$/.test(n)) return t
          const i = (t) =>
            Math.max(
              0,
              Math.min(255, Math.round(parseInt(n.slice(t, t + 2), 16) * e)),
            )
          return `#${[i(0), i(2), i(4)].map((t) => t.toString(16).padStart(2, '0')).join('')}`
        })(t, 0.88),
      )
}
function td(t, e, n) {
  var i
  if (n) {
    const t = (function (t, e) {
      if (null == t || !t.exists()) return []
      const n = []
      for (const i of t.allChildren()) {
        const t = Qa(i, e)
        t && n.push(t)
      }
      return n
    })(null == (i = e.presentation.chartColorStyles) ? void 0 : i.get(n), e)
    if (t.length > 0) return t
  }
  const r = Ka(e)
  return 0 === r.length
    ? void 0
    : ((function (t) {
        const e = t.child('style').numAttr('val')
        if (void 0 !== e) return e
        const n = t.child('AlternateContent')
        if (n.exists())
          for (const i of n.allChildren()) {
            const t = i.child('style').numAttr('val')
            if (void 0 !== t) return t
          }
      })(t),
      r)
}
function ed(t) {
  const e = Math.round(1e4 * t) / 100
  return `${Number.isInteger(e) ? e.toFixed(0) : e}%`.replace(/\.0%$/, '%')
}
function nd(t, e) {
  const n = t.child('legend')
  if (!n.exists()) return
  const i = n.child('legendPos'),
    r = (i.exists() && i.attr('val')) || 'r',
    o = ['b', 't', 'l', 'r', 'tr'].includes(r) ? r : 'r',
    l = ea(n.child('overlay')),
    s = { confine: !0 }
  let a
  switch (o) {
    case 'b':
      a = { ...s, bottom: '5%', orient: 'horizontal' }
      break
    case 't':
      a = { ...s, top: '14%', orient: 'horizontal' }
      break
    case 'l':
      a = { ...s, left: '2%', top: 'middle', orient: 'vertical' }
      break
    case 'r':
    default:
      a = { ...s, right: '2%', top: 'middle', orient: 'vertical' }
      break
    case 'tr':
      a = { ...s, top: '14%', right: '2%', orient: 'vertical' }
  }
  return {
    option: a,
    position: o,
    overlay: l,
    textStyle: (() => {
      const t = Ca(n, e)
      if (!t) return
      const i = {
        ...(t.color ? { color: t.color } : {}),
        ...(void 0 !== t.fontSize ? { fontSize: t.fontSize } : {}),
        ...(!0 === t.bold ? { fontWeight: 'bold' } : {}),
        ...(t.fontFamily ? { fontFamily: t.fontFamily } : {}),
        ...(t.textShadowColor ? { textShadowColor: t.textShadowColor } : {}),
        ...(void 0 !== t.textShadowBlur
          ? { textShadowBlur: t.textShadowBlur }
          : {}),
        ...(void 0 !== t.textShadowOffsetX
          ? { textShadowOffsetX: t.textShadowOffsetX }
          : {}),
        ...(void 0 !== t.textShadowOffsetY
          ? { textShadowOffsetY: t.textShadowOffsetY }
          : {}),
      }
      return (xa(t) && (i[ha] = !0), i)
    })(),
    manualLayout: id(n),
  }
}
function id(t) {
  const e = t.child('layout').child('manualLayout')
  if (!e.exists()) return {}
  const n = {},
    i = e.child('x').numAttr('val'),
    r = e.child('y').numAttr('val'),
    o = e.child('w').numAttr('val'),
    l = e.child('h').numAttr('val')
  return (
    void 0 !== i && (n.left = ed(i)),
    void 0 !== r && (n.top = ed(r)),
    void 0 !== o && (n.width = ed(o)),
    void 0 !== l && (n.height = ed(l)),
    n
  )
}
function rd(t) {
  return (
    't' === (null == t ? void 0 : t.position) ||
    'tr' === (null == t ? void 0 : t.position)
  )
}
function od(t, e, n = !1) {
  const i = rd(e),
    r = (null == e ? void 0 : e.overlay) ?? !1,
    o = t ? (i && !r ? 52 : 68) : i && !r ? 32 : 20
  return n ? Math.max(0, o - 11) : o
}
function ld(t, e) {
  if (rd(e)) return t ? 26 : 6
}
function sd(t) {
  if (!t || t.overlay || !t.option || 'object' != typeof t.option) return 'none'
  const e = t.option
  return void 0 !== e.bottom
    ? 'bottom'
    : void 0 !== e.top && void 0 === e.left && void 0 === e.right
      ? 'top'
      : void 0 !== e.left
        ? 'left'
        : void 0 !== e.right
          ? 'right'
          : 'none'
}
function ad(t) {
  if (t) {
    const e = t.option
    if (e && void 0 !== e.bottom) return 35
  }
  return 20
}
function dd(t, e, n, i, r) {
  if (!t) return { show: !1 }
  const o = (null == e ? void 0 : e.manualLayout) ?? {},
    l = void 0 !== o.top ? o.top : void 0 !== n ? n : void 0,
    s = r.fontSize ?? 10,
    a = i.some((t) => 'object' == typeof t && t.icon),
    d =
      a &&
      i.every(
        (t) =>
          'object' == typeof t &&
          'string' == typeof t.icon &&
          t.icon === i[0].icon,
      )
        ? i[0].icon
        : void 0,
    c = void 0 !== d && !d.startsWith('path://'),
    u = c ? i.map((t) => ('string' == typeof t ? t : t.name)) : i,
    h = i.some(
      (t) =>
        'object' == typeof t &&
        'string' == typeof t.icon &&
        t.icon.startsWith('path://'),
    )
  return {
    ...t,
    ...o,
    ...(void 0 !== l ? { top: l } : {}),
    ...(c ? { icon: d } : a ? {} : { icon: 'rect' }),
    itemWidth: h ? Math.max(24, Math.round(2.2 * s)) : s,
    itemHeight: h ? Math.max(8, Math.round(0.9 * s)) : s,
    data: u,
    textStyle: r,
  }
}
function cd(t) {
  return t ? (Array.isArray(t) ? (t[0] ?? null) : t) : null
}
function ud(t, e) {
  return 'string' == typeof t ? t : e
}
function hd(t) {
  const e = t
  return (Array.isArray(e.radar) ? e.radar : e.radar ? [e.radar] : [])
    .filter((t) => 'object' == typeof t && null !== t)
    .map((t) => {
      const e = t.name ?? (t.name = {})
      return e.textStyle ?? (e.textStyle = {})
    })
}
function pd(t) {
  const e = t
  return (Array.isArray(e.radar) ? e.radar : e.radar ? [e.radar] : [])
    .filter((t) => 'object' == typeof t && null !== t)
    .flatMap((t) => t.indicator ?? [])
    .map((t) => t.axisLabel)
    .filter((t) => !!t)
}
function fd(t, e) {
  var n, i, r, o
  const l = t
  null != (i = null == (n = l.title) ? void 0 : n.textStyle) &&
    i.fontSize &&
    l.title.textStyle.fontSize <= 14 &&
    (l.title.textStyle.fontSize = e)
  for (const u of hd(t)) {
    const t = u.fontSize
    ;('number' != typeof t || t <= 10) && (u.fontSize = e)
  }
  for (const u of pd(t)) {
    const t = u.fontSize
    ;('number' != typeof t || t <= 10) && (u.fontSize = e)
  }
  const s = Array.isArray(l.series) ? l.series : l.series ? [l.series] : []
  for (const u of s)
    null != (r = null == u ? void 0 : u.label) &&
      r.fontSize &&
      u.label.fontSize <= 10 &&
      !xa(u.label) &&
      (u.label.fontSize = e)
  const a = (t) => {
      if (null == t || !t.axisLabel) return
      const n = t.axisLabel.fontSize
      ;(void 0 === n || n <= 10) && (t.axisLabel.fontSize = e)
    },
    d = Array.isArray(l.xAxis) ? l.xAxis : l.xAxis ? [l.xAxis] : [],
    c = Array.isArray(l.yAxis) ? l.yAxis : l.yAxis ? [l.yAxis] : []
  for (const u of [...d, ...c]) a(u)
  if (null != (o = l.legend) && o.textStyle) {
    const t = l.legend.textStyle.fontSize
    ;(void 0 === t || t <= 10) &&
      !xa(l.legend.textStyle) &&
      (l.legend.textStyle.fontSize = e)
  }
}
function md(t, e) {
  var n, i, r
  const o = t
  ;(null != (n = o.title) &&
    n.textStyle &&
    !o.title.textStyle.fontFamily &&
    (o.title.textStyle.fontFamily = e),
    null != (i = o.title) &&
      i.textStyle &&
      !o.title.textStyle.fontWeight &&
      (o.title.textStyle.fontWeight = 'bold'))
  const l = (t) => {
      if (!t) return
      const n = t.axisLabel ?? (t.axisLabel = {})
      n.fontFamily || (n.fontFamily = e)
    },
    s = Array.isArray(o.xAxis) ? o.xAxis : o.xAxis ? [o.xAxis] : [],
    a = Array.isArray(o.yAxis) ? o.yAxis : o.yAxis ? [o.yAxis] : []
  for (const d of [...s, ...a]) l(d)
  null != (r = o.legend) &&
    r.textStyle &&
    !o.legend.textStyle.fontFamily &&
    (o.legend.textStyle.fontFamily = e)
  for (const d of hd(t)) d.fontFamily || (d.fontFamily = e)
  for (const d of pd(t)) d.fontFamily || (d.fontFamily = e)
}
function $d(t) {
  var e
  const n = t
  null != (e = n.title) &&
    e.textStyle &&
    void 0 === n.title.textStyle.color &&
    (n.title.textStyle.color = pa)
  const i = Array.isArray(n.legend) ? n.legend : n.legend ? [n.legend] : []
  for (const l of i) {
    if (!l || !1 === l.show) continue
    const t = l.textStyle ?? (l.textStyle = {})
    void 0 === t.color && (t.color = pa)
  }
  const r = Array.isArray(n.xAxis) ? n.xAxis : n.xAxis ? [n.xAxis] : [],
    o = Array.isArray(n.yAxis) ? n.yAxis : n.yAxis ? [n.yAxis] : []
  for (const l of [...r, ...o]) {
    if (null == l || !l.name) continue
    const t = l.nameTextStyle ?? (l.nameTextStyle = {})
    void 0 === t.color && (t.color = pa)
  }
  for (const l of hd(t)) void 0 === l.color && (l.color = pa)
  for (const l of pd(t)) void 0 === l.color && (l.color = pa)
}
function gd(t, e, n) {
  var i, r, o
  const l = t
  if (!l.grid || !l.legend || !1 === l.legend.show) return
  const s = e.child('legend')
  if (!s.exists() || ea(s.child('overlay'))) return
  const a = s.child('legendPos').attr('val') || 'r'
  if ('r' === a || 'l' === a) {
    const t = l.legend.data
    if (!t || 0 === t.length) return
    const d = t.map((t) => ('string' == typeof t ? t : t.name)),
      c =
        (null == (r = null == (i = l.legend) ? void 0 : i.textStyle)
          ? void 0
          : r.fontSize) ??
        n ??
        12,
      u = Number(null == (o = l.legend) ? void 0 : o.itemWidth) || c
    let h = 0
    for (const e of d) {
      let t = 0
      for (const n of e) t += n.charCodeAt(0) > 11904 ? c : 0.55 * c
      t > h && (h = t)
    }
    const p = u + 8 + h + 14,
      f = e.child('plotArea'),
      m = f.child('lineChart').exists(),
      $ = f.child('barChart').exists(),
      g = f.child('areaChart').exists(),
      y = f.child('scatterChart').exists(),
      x = f.child('bubbleChart').exists(),
      v = $ && 'bar' === f.child('barChart').child('barDir').attr('val'),
      b = Array.isArray(l.series) ? l.series : l.series ? [l.series] : [],
      M =
        $ &&
        b.some(
          (t) =>
            'bar' === (null == t ? void 0 : t.type) &&
            Array.isArray(t.data) &&
            t.data.some((t) => {
              const e =
                'object' == typeof t && null !== t && 'value' in t ? t.value : t
              return 'number' == typeof e && e < 0
            }),
        ),
      w = $ && !v && !M,
      k = m || w || g || y || x,
      A = s.child('layout').child('manualLayout').exists()
    k && !A && ('r' === a ? (l.legend.right = '1%') : (l.legend.left = '1%'))
    const L = Array.isArray(l.series) ? l.series.length : l.series ? 1 : 0,
      S = Array.isArray(l.xAxis) ? l.xAxis[0] : l.xAxis,
      C = Array.isArray(null == S ? void 0 : S.data) ? S.data.length : 0,
      F = Math.max(
        84,
        Math.round(
          p +
            (m
              ? 'r' === a && m && 1 === L && C >= 20
                ? -10
                : 2
              : g
                ? 8
                : x
                  ? 10
                  : w
                    ? 15
                    : 18),
        ),
      )
    if (
      ('string' == typeof l.grid.left && l.grid.left.includes('%')) ||
      ('string' == typeof l.grid.right && l.grid.right.includes('%'))
    )
      return
    'r' === a ? (l.grid.right = F) : (l.grid.left = F)
  }
}
function yd(t, e, n) {
  if ('number' == typeof t && Number.isFinite(t)) return t
  if ('string' == typeof t) {
    const n = t.trim()
    if (n.endsWith('%')) return (e * parseFloat(n)) / 100
    const i = parseFloat(n)
    if (Number.isFinite(i)) return i
  }
  return n
}
function xd(t, e, n, i, r, o = 2.6) {
  const l = (function (t, e, n) {
    if (!e) return
    const i = 'x' === n ? e.w : e.h,
      r = Array.isArray(t) ? t[0] : t
    if (!r) return i
    const o = 'x' === n ? 'right' : 'bottom',
      l = yd(r['x' === n ? 'left' : 'top'], i, 0),
      s = yd(r[o], i, 0)
    return Math.max(0, i - l - s)
  })(r, i, n)
  if (void 0 === l || l <= 0) return e
  const s = t.axisLabel ?? {},
    a = 'number' == typeof s.fontSize ? s.fontSize : 12,
    d = Math.max(28, a * o),
    c = Math.max(2, Math.floor(l / d) + 1)
  return Math.max(1, Math.min(e, c - 1))
}
function vd(t, e) {
  var n, i
  const r = t
  if (!r.xAxis && !r.yAxis) return
  const o = [],
    l = [],
    s = [],
    a = Array.isArray(r.series) ? r.series : r.series ? [r.series] : [],
    d = new Map(),
    c = [],
    u = new Map(),
    h = (t, e) => {
      ;(u.has(t) || u.set(t, []), u.get(t).push(...e))
    }
  for (const M of a) {
    if (!M.data) continue
    const t = []
    for (const n of M.data)
      if ('number' == typeof n) t.push(n)
      else if (
        n &&
        'object' == typeof n &&
        'value' in n &&
        'number' == typeof n.value
      )
        t.push(n.value)
      else if (Array.isArray(n)) {
        n.length >= 2 &&
          'number' == typeof n[0] &&
          'number' == typeof n[1] &&
          (l.push(n[0]), s.push(n[1]))
        for (const e of n) 'number' == typeof e && t.push(e)
      } else t.push(0)
    const e =
      'number' == typeof M.yAxisIndex && Number.isFinite(M.yAxisIndex)
        ? M.yAxisIndex
        : 0
    if (M.stack) {
      const n = `${e}:${String(M.stack)}`
      ;(d.has(n) || d.set(n, { axisIndex: e, values: [] }),
        d.get(n).values.push(t))
    } else (c.push(...t), h(e, t))
  }
  for (const M of d.values()) {
    const t = [],
      e = Math.max(...M.values.map((t) => t.length))
    for (let n = 0; n < e; n++) {
      let e = 0
      for (const t of M.values) e += t[n] ?? 0
      ;(t.push(e), o.push(e))
    }
    h(M.axisIndex, t)
  }
  o.push(...c)
  const p = a.some((t) => 'bar' === t.type),
    f = a.some((t) => t.type && 'bar' !== t.type),
    m = p && !f,
    $ = m ? 10 : 8,
    g = m ? 2.6 : 2
  if (0 === o.length) return
  const y =
      l.length > 0 &&
      s.length > 0 &&
      'value' ===
        (null == (n = Array.isArray(r.xAxis) ? r.xAxis[0] : r.xAxis)
          ? void 0
          : n.type) &&
      'value' ===
        (null == (i = Array.isArray(r.yAxis) ? r.yAxis[0] : r.yAxis)
          ? void 0
          : i.type),
    x = (t, e, n) => {
      if (
        !t ||
        'value' !== t.type ||
        0 === e.length ||
        (void 0 !== t.min && void 0 !== t.max)
      )
        return
      const i = Math.min(...e),
        r = Math.max(...e),
        o = Md(r, i, n)
      if (void 0 === t.max) {
        let e = bd(r, i, n)
        ;(e > r && e - r < 0.25 * o && (e += o), (t.max = e))
      }
      ;(void 0 === t.min && i >= 0 && (t.min = 0),
        void 0 === t.interval && (t.interval = o))
    },
    v = (t) => {
      if (0 === t.length) return 8
      const e = Math.min(...t)
      return Math.max(...t) - Math.min(0, e) <= 3 ? 3 : 8
    }
  if (y) {
    const t = Array.isArray(r.xAxis) ? r.xAxis : [r.xAxis],
      e = Array.isArray(r.yAxis) ? r.yAxis : [r.yAxis]
    return (
      t.forEach((t) => x(t, l, v(l))),
      void e.forEach((t) => x(t, s, v(s)))
    )
  }
  const b = (t, n, i) => {
    t &&
      (Array.isArray(t) ? t : [t]).forEach((t, l) => {
        if (!t || 'value' !== t.type || (void 0 !== t.min && void 0 !== t.max))
          return
        const s = (null == i ? void 0 : i.get(l)) ?? o
        if (0 === s.length) return
        const a = Math.min(...s),
          d = Math.max(...s),
          c = xd(t, $, n, e, r.grid, g),
          u = Md(d, a, c)
        if (void 0 === t.max) {
          let e = bd(d, a, c)
          ;(c > 1 && e > d && e - d < 0.25 * u && (e += u), (t.max = e))
        }
        ;(void 0 === t.min && a >= 0
          ? (t.min = 0)
          : void 0 === t.min &&
            a < 0 &&
            (t.min = (function (t, e, n = 5) {
              const i = Md(t, e, n),
                r = Math.floor(e / i) * i
              return r >= e ? r - i : r
            })(d, a, c)),
          void 0 === t.interval && (t.interval = u))
      })
  }
  ;(b(r.xAxis, 'x'), b(r.yAxis, 'y', u))
}
function bd(t, e, n = 5) {
  const i = Md(t, e, n),
    r = Math.ceil(t / i) * i
  return r <= t ? r + i : r
}
function Md(t, e, n = 5) {
  if (0 === t && 0 === e) return 1
  const i = t - Math.min(0, e)
  if (0 === i) return t > 0 ? 1.2 * t : 1
  const r = i / n,
    o = Math.pow(10, Math.floor(Math.log10(r))),
    l = r / o
  let s
  return ((s = l <= 1 ? o : l <= 2 ? 2 * o : l <= 5 ? 5 * o : 10 * o), s)
}
function wd(t) {
  const e = t.child('txPr')
  if (e.exists())
    for (const n of e.children('p')) {
      const t = n.child('pPr')
      if (!t.exists()) continue
      const e = t.child('defRPr')
      if (!e.exists()) continue
      const i = e.numAttr('sz')
      if (void 0 !== i && i > 0) return Math.round((i / 100) * (96 / 72))
    }
}
function kd(t, e) {
  const n = ca(t.child('spPr').child('ln'), e)
  if (n)
    return { borderColor: n.color, borderWidth: n.width, borderStyle: n.type }
}
function Ad(t, e, n, i, r = 2, o, l) {
  if ('none' === t) return null
  const s = 'http://www.w3.org/2000/svg',
    a = document.createElementNS(s, 'svg')
  ;(a.setAttribute('width', String(n)),
    a.setAttribute('height', String(i)),
    a.setAttribute('viewBox', `0 0 ${n} ${i}`),
    (a.style.display = 'block'))
  const d = t ?? 'rect'
  if (d.startsWith('path://')) {
    const t = document.createElementNS(s, 'path')
    if (
      (t.setAttribute('d', d.slice(7)),
      t.setAttribute('fill', 'none'),
      t.setAttribute('stroke', e),
      t.setAttribute('stroke-width', String(r)),
      t.setAttribute('stroke-linecap', 'round'),
      a.appendChild(t),
      o && 'none' !== o)
    ) {
      const t = n / 2,
        r = i / 2,
        d = Math.min(
          n,
          i,
          void 0 !== l ? Math.max(3, l) : Math.max(3, 0.55 * i),
        )
      if ('diamond' === o) {
        const n = document.createElementNS(s, 'path')
        ;(n.setAttribute(
          'd',
          `M${t} ${r - d / 2} L${t + d / 2} ${r} L${t} ${r + d / 2} L${t - d / 2} ${r} Z`,
        ),
          n.setAttribute('fill', e),
          a.appendChild(n))
      } else if ('rect' === o) {
        const n = document.createElementNS(s, 'rect')
        ;(n.setAttribute('x', String(t - d / 2)),
          n.setAttribute('y', String(r - d / 2)),
          n.setAttribute('width', String(d)),
          n.setAttribute('height', String(d)),
          n.setAttribute('fill', e),
          a.appendChild(n))
      } else if ('triangle' === o) {
        const n = document.createElementNS(s, 'path')
        ;(n.setAttribute(
          'd',
          `M${t} ${r - d / 2} L${t + d / 2} ${r + d / 2} L${t - d / 2} ${r + d / 2} Z`,
        ),
          n.setAttribute('fill', e),
          a.appendChild(n))
      } else {
        const n = document.createElementNS(s, 'circle')
        ;(n.setAttribute('cx', String(t)),
          n.setAttribute('cy', String(r)),
          n.setAttribute('r', String(d / 2)),
          n.setAttribute('fill', e),
          a.appendChild(n))
      }
    }
    return a
  }
  if ('diamond' === d) {
    const t = document.createElementNS(s, 'path')
    return (
      t.setAttribute(
        'd',
        `M${n / 2} 1 L${n - 1} ${i / 2} L${n / 2} ${i - 1} L1 ${i / 2} Z`,
      ),
      t.setAttribute('fill', e),
      a.appendChild(t),
      a
    )
  }
  if ('circle' === d) {
    const t = document.createElementNS(s, 'circle')
    return (
      t.setAttribute('cx', String(n / 2)),
      t.setAttribute('cy', String(i / 2)),
      t.setAttribute('r', String(Math.max(2, Math.min(n, i) / 2 - 1))),
      t.setAttribute('fill', e),
      a.appendChild(t),
      a
    )
  }
  const c = document.createElementNS(s, 'rect')
  return (
    c.setAttribute('x', '1'),
    c.setAttribute('y', '1'),
    c.setAttribute('width', String(Math.max(2, n - 2))),
    c.setAttribute('height', String(Math.max(2, i - 2))),
    c.setAttribute('fill', e),
    a.appendChild(c),
    a
  )
}
function Ld(t, e) {
  if ('number' == typeof t) return `${t}px`
  const n = t.trim()
  if (n.endsWith('%')) {
    const t = Number.parseFloat(n.slice(0, -1))
    if (!Number.isNaN(t)) return (t / 100) * e + 'px'
  }
  return n
}
function Sd(t, e, n, i) {
  const r = (function (t, e) {
    const n = t.child('autoTitleDeleted')
    if (ea(n)) return
    const i = t.child('title')
    return i.exists()
      ? ba(i)
      : n.exists() && !ea(n) && e && 1 === e.length && e[0].name
        ? e[0].name
        : void 0
  })(t, e)
  if (!r) return
  const o = t.child('title'),
    l = (function (t, e) {
      const n = t.child('tx').child('rich')
      if (!n.exists()) return
      const i = [],
        r = {}
      let o = 0
      for (const l of n.children('p')) {
        const t = []
        for (const i of l.allChildren()) {
          if ('br' === i.localName) {
            t.push('\n')
            continue
          }
          if ('r' !== i.localName && 'fld' !== i.localName) continue
          const n = i.child('t').text()
          if (!n) continue
          const l = wa(La(i.child('rPr'), e))
          if (!l) {
            t.push(Ma(n))
            continue
          }
          const s = 'r' + o++
          ;((r[s] = l), t.push(`{${s}|${Ma(n)}}`))
        }
        const n = t.join('')
        n && i.push(n)
      }
      return 0 !== Object.keys(r).length
        ? { text: i.join('\n'), rich: r }
        : void 0
    })(o, n),
    s = wa(Fa(o, n)),
    a = (function (t) {
      const e = t.child('title').child('layout').child('manualLayout')
      if (!e.exists()) return {}
      const n = {},
        i = e.child('x').numAttr('val'),
        r = e.child('y').numAttr('val')
      return (
        void 0 !== i && (n.left = ed(i)),
        void 0 !== r && (n.top = ed(r)),
        n
      )
    })(t)
  return {
    text: (null == l ? void 0 : l.text) ?? r,
    left: 'center',
    ...a,
    textStyle: { fontSize: i, ...(s ?? {}), ...(l ? { rich: l.rich } : {}) },
  }
}
function Cd(t, e = !1) {
  return e ? t : Math.round(0.5 * t)
}
var Fd = {
  circle: 'circle',
  square: 'rect',
  diamond: 'diamond',
  triangle: 'triangle',
  none: 'none',
  star: 'circle',
  dash: 'circle',
  dot: 'circle',
  plus: 'circle',
  x: 'circle',
}
function Bd(t) {
  if (t) return Fd[t] ?? 'circle'
}
var jd = ['diamond', 'rect', 'triangle', 'circle'],
  Ed = ['diamond', 'square', 'triangle', 'circle'],
  Pd = sa(9),
  Td = Pd
function zd(t, e) {
  return 'lineMarker' === t || 'smoothMarker' === t
    ? jd[e % jd.length]
    : 'circle'
}
function Nd(t) {
  return Ed[t % Ed.length]
}
function Rd(t, e, n = !1) {
  var i, r
  const o = Math.max(
      t.values.length,
      (null == (i = t.xValues) ? void 0 : i.length) ?? 0,
      n ? ((null == (r = t.bubbleSizes) ? void 0 : r.length) ?? 0) : 0,
    ),
    l = 'zero' === e ? 0 : null
  return Array.from({ length: o }, (e, i) => {
    var r, o, s
    const a = t.xValues
        ? null != (r = t.xBlankIndices) && r.has(i)
          ? l
          : (t.xValues[i] ?? l)
        : i,
      d = null != (o = t.blankIndices) && o.has(i) ? l : (t.values[i] ?? l)
    return n
      ? [
          a,
          d,
          t.bubbleSizes
            ? null != (s = t.bubbleBlankIndices) && s.has(i)
              ? l
              : (t.bubbleSizes[i] ?? l)
            : 0,
        ]
      : [a, d]
  })
}
function Id(t, e) {
  const n = []
  let i = []
  const r = () => {
    ;(n.push(
      ...(function (t, e = 24) {
        if (t.length < 3) return t
        for (let a = 1; a < t.length; a++) if (t[a][0] <= t[a - 1][0]) return t
        const n = 0.3,
          i = 1.2,
          r = t.length,
          o = new Array(r - 1)
        for (let a = 0; a < r - 1; a++)
          o[a] = (t[a + 1][1] - t[a][1]) / (t[a + 1][0] - t[a][0])
        const l = new Array(r)
        ;((l[0] = o[0]), (l[r - 1] = o[r - 2] * i))
        for (let a = 1; a < r - 1; a++) l[a] = ((o[a - 1] + o[a]) / 2) * n
        const s = [[t[0][0], t[0][1]]]
        for (let a = 0; a < r - 1; a++) {
          const [n, i] = t[a],
            [r, o] = t[a + 1],
            d = r - n,
            c = l[a],
            u = l[a + 1]
          for (let t = 1; t <= e; t++) {
            const r = t / e,
              l = n + d * r,
              a =
                (2 * r ** 3 - 3 * r ** 2 + 1) * i +
                (r ** 3 - 2 * r ** 2 + r) * d * c +
                (-2 * r ** 3 + 3 * r ** 2) * o +
                (r ** 3 - r ** 2) * d * u
            s.push([Number(l.toFixed(4)), Number(a.toFixed(4))])
          }
        }
        return s
      })(i),
    ),
      (i = []))
  }
  for (const o of t)
    o.some((t) => null === t) ? e || (r(), n.push(o)) : i.push(o)
  return (r(), n)
}
function Dd(t) {
  return (
    void 0 !== t.left ||
    void 0 !== t.top ||
    void 0 !== t.width ||
    void 0 !== t.height
  )
}
function Od(t) {
  return t.some((t) => t.values.some((t) => t < 0))
}
function Ud(t, e, n, i = 0) {
  return void 0 === t || !Number.isFinite(t) || t <= 0
    ? n
    : Math.max(i, Math.round(t * e))
}
function Zd(t, e) {
  switch (t) {
    case 'outEnd':
      return 'top'
    case 'inEnd':
      return 'insideTop'
    case 'ctr':
      return 'inside'
    case 'inBase':
      return 'insideBottom'
    default:
      return e ? 'inside' : 'top'
  }
}
function Gd(t) {
  switch (t) {
    case 'l':
      return 'left'
    case 'r':
      return 'right'
    case 'b':
      return 'bottom'
    default:
      return 'top'
  }
}
function Xd(t) {
  return {
    ...(t.backgroundColor ? { backgroundColor: t.backgroundColor } : {}),
    ...(t.borderColor ? { borderColor: t.borderColor } : {}),
    ...(void 0 !== t.borderWidth ? { borderWidth: t.borderWidth } : {}),
    ...(t.padding ? { padding: t.padding } : {}),
  }
}
function Yd(t) {
  const e = null == t ? void 0 : t.fontSize
  if (void 0 !== e)
    return `font-size: ${e}px; line-height: ${Math.max(e + 5, Math.round(1.45 * e))}px;`
}
function Wd(t, e = 'clustered') {
  const n = t.child('grouping')
  return (n.exists() && n.attr('val')) || e
}
function Hd(t) {
  return 'stacked' === t || 'percentStacked' === t
}
function Vd(t) {
  return 'percentStacked' === t
}
function qd(t) {
  const e = Math.max(0, ...t.map((t) => t.values.length)),
    n = new Array(e).fill(0)
  for (const i of t)
    for (let t = 0; t < e; t++) n[t] += Math.max(i.values[t] ?? 0, 0)
  return t.map((t) =>
    t.values.map((t, e) => {
      const i = n[e] ?? 0
      return 0 === i ? 0 : Number((Math.max(t, 0) / i).toFixed(6))
    }),
  )
}
function _d(t) {
  ;((t.min = 0),
    (t.max = 1),
    (t.interval = 0.1),
    (t.axisLabel = { ...(t.axisLabel || {}), formatter: (t) => Ks(t, '0%') }))
}
function Qd(t, e) {
  const { r: n, g: i, b: r } = Me(t),
    { h: o, s: l, l: s } = ke(n, i, r),
    a = Ae(
      o + (e.hueOffset ?? 0),
      Math.min(1, l * e.saturationScale),
      Math.max(0, Math.min(1, s + e.lightnessOffset)),
    )
  return we(a.r, a.g, a.b)
}
function Kd(t, e, n) {
  const i = (function (t, e) {
    var n
    if (!e)
      return t.flatMap((t) =>
        t.values.filter((e, n) => {
          var i
          return !(null != (i = t.blankIndices) && i.has(n))
        }),
      )
    const i = Math.max(0, ...t.map((t) => t.values.length)),
      r = []
    for (let o = 0; o < i; o++) {
      let e = 0,
        i = !1
      for (const r of t)
        (null != (n = r.blankIndices) && n.has(o)) ||
          ((e += r.values[o] ?? 0), (i = !0))
      i && r.push(e)
    }
    return r
  })(e, n).filter((t) => Number.isFinite(t))
  if (0 === i.length) return
  const r = Math.min(...i),
    o = Math.max(...i),
    l = Md(o, r, 8)
  if (
    (void 0 === t.min && r >= 0 && (t.min = 0),
    void 0 === t.interval && (t.interval = l),
    void 0 === t.max)
  )
    if (n) t.max = Math.ceil(o / l) * l + l
    else {
      let e = bd(o, r, 8)
      ;(e > o && e - o < 0.25 * l && (e += l), (t.max = e))
    }
}
function Jd(t) {
  switch (t) {
    case 'ctr':
    case 'inEnd':
    case 'inBase':
      return 'inside'
    default:
      return 'outside'
  }
}
function tc(t, e) {
  if (t || e)
    return {
      showVal: (null == t ? void 0 : t.showVal) ?? !1,
      showCatName: (null == t ? void 0 : t.showCatName) ?? !1,
      showSerName: (null == t ? void 0 : t.showSerName) ?? !1,
      showPercent: (null == t ? void 0 : t.showPercent) ?? !1,
      position: null == t ? void 0 : t.position,
      showLeaderLines: null == t ? void 0 : t.showLeaderLines,
      manualLayout: null == t ? void 0 : t.manualLayout,
      color: null == t ? void 0 : t.color,
      fontSize: null == t ? void 0 : t.fontSize,
      bold: null == t ? void 0 : t.bold,
      backgroundColor: null == t ? void 0 : t.backgroundColor,
      borderColor: null == t ? void 0 : t.borderColor,
      borderWidth: null == t ? void 0 : t.borderWidth,
      padding: null == t ? void 0 : t.padding,
      ...e,
    }
}
function ec(t, e) {
  const n = null == t ? void 0 : t.child('dLbls')
  return null != n && n.exists() ? n : e.child('dLbls')
}
function nc(t) {
  return !(
    !t ||
    t.deleted ||
    !(t.showVal || t.showCatName || t.showSerName || t.showPercent)
  )
}
function ic(t) {
  const e = t.child('dispBlanksAs').attr('val')
  return 'zero' === e || 'span' === e ? e : 'gap'
}
function rc(t, e, n, i) {
  var r
  return null != (r = t.blankIndices) && r.has(e)
    ? 'zero' === i
      ? 0
      : null
    : n
}
function oc(t) {
  var e
  const n = null == (e = t[0]) ? void 0 : e.formatCode
  if (n) return t.every((t) => t.formatCode === n) ? n : void 0
}
function lc(t, e, n) {
  if (!t || !nc(t)) return
  const i = t,
    r = {
      show: !0,
      formatter: (t) => {
        const r = []
        return (
          i.showSerName && n && r.push(n),
          i.showCatName && r.push(t.name),
          i.showVal && r.push(Ks(t.value, e)),
          i.showPercent && r.push(`${t.percent}%`),
          r.join(' ')
        )
      },
      fontSize: i.fontSize ?? 10,
      ...(!0 === i.bold ? { fontWeight: 'bold' } : {}),
      ...(i.color ? { color: i.color } : {}),
      position: Jd(i.position),
      ...Xd(i),
    }
  return void 0 !== i.fontSize ? ya(r) : r
}
function sc(t) {
  return 0 === t.size
    ? void 0
    : (e) => {
        if (void 0 === e.dataIndex) return
        const n = t.get(e.dataIndex)
        if (!n) return
        const i = e.rect,
          r = {}
        return (
          void 0 !== n.x && (r.x = i ? i.x + i.width * n.x : ed(n.x)),
          void 0 !== n.y && (r.y = i ? i.y + i.height * n.y : ed(n.y)),
          void 0 !== n.width && (r.width = i ? i.width * n.width : ed(n.width)),
          void 0 !== n.height &&
            (r.height = i ? i.height * n.height : ed(n.height)),
          r
        )
      }
}
function ac(t, e, n) {
  if (!Array.isArray(t) || n <= 1) return t
  const i = Number.parseFloat(t[0]),
    r = Number.parseFloat(t[1])
  if (!Number.isFinite(i) || !Number.isFinite(r) || r <= i) return t
  const o = (r - i - 1 * (n - 1)) / n,
    l = Math.round(i + e * (o + 1))
  return [`${l}%`, `${Math.round(l + o)}%`]
}
function dc(t, e, n, i, r, o) {
  var l
  const s =
      (null == (l = n.find((t) => t.categories.length > 0))
        ? void 0
        : l.categories) || [],
    a = Sd(e, n, i, 14),
    d = nd(e, i),
    c = null == d ? void 0 : d.option,
    u = { fontSize: 10, ...((null == d ? void 0 : d.textStyle) ?? {}) },
    h = Wd(t, 'standard'),
    p = Hd(h),
    f = Vd(h),
    m = f ? qd(n) : void 0,
    $ = ic(e)
  let g = Za(t, i)
  if (!g) {
    const e = t.children('ser')[0]
    null != e && e.exists() && (g = Za(e, i))
  }
  const y = t
      .children('ser')
      .map((t, e) => ({ ser: t, order: t.child('order').numAttr('val') ?? e }))
      .sort((t, e) => t.order - e.order)
      .map((t) => t.ser),
    x = t.child('marker'),
    v = x.exists() ? ea(x) : void 0,
    b = (t, e) => t.colorHex ?? (null == o ? void 0 : o[e % o.length]),
    M = (t, e) => {
      const n = b(t, e)
      return 'string' == typeof n ? n : void 0
    },
    w = n.map((e, n) => {
      const o = b(e, n),
        l = Bd(
          e.markerSymbol ?? (!0 === v ? Nd(n) : !1 === v ? 'none' : void 0),
        ),
        s = void 0 !== l ? 'none' !== l : void 0,
        a = {
          ...(o ? { color: o } : {}),
          width: e.lineWidth ?? 3,
          cap: 'round',
          join: 'round',
          ...(e.lineNoFill ? { opacity: 0 } : {}),
        },
        d = e.formatCode,
        c = Za(y[n] ?? t, i) ?? g,
        u = (t) => {
          if (!t || !nc(t)) return
          const e = t,
            n = {
              show: !0,
              position: Gd(e.position),
              fontSize: e.fontSize ?? 9,
              ...(e.color ? { color: e.color } : {}),
              ...(!0 === e.bold ? { fontWeight: 'bold' } : {}),
              ...Xd(e),
              formatter: (t) => {
                const n = null == t ? void 0 : t.value,
                  i = n && 'object' == typeof n && 'value' in n ? n.value : n,
                  r = []
                return (
                  e.showSerName &&
                    null != t &&
                    t.seriesName &&
                    r.push(t.seriesName),
                  e.showCatName && null != t && t.name && r.push(t.name),
                  e.showVal &&
                    'number' == typeof i &&
                    r.push(Ks(i, f ? '0%' : d)),
                  e.showPercent &&
                    'number' == typeof (null == t ? void 0 : t.percent) &&
                    r.push(`${t.percent}%`),
                  r.join(' ')
                )
              },
            }
          return void 0 !== e.fontSize ? ya(n) : n
        },
        h = u(c),
        x = Ya(ec(y[n], t), i),
        M = new Map(),
        w = ((null == m ? void 0 : m[n]) ?? e.values).map((t, n) => {
          const i = rc(e, n, t, $),
            r = x.get(n)
          if (!r) return i
          r.manualLayout && M.set(n, r.manualLayout)
          const o = r.deleted ? { show: !1 } : u(tc(c, r))
          return o ? { value: i, label: o } : i
        }),
        k = !(null == h || !h.show || 'none' !== l),
        A = k ? 'circle' : l && 'none' !== l ? l : void 0,
        L = k
          ? 0
          : (e.markerSize ??
            (void 0 === e.markerSymbol && !0 === v ? Pd : void 0)),
        S = !!k || ((!r || void 0 !== l) && s),
        C = !0 === S && void 0 !== A && 'none' !== A && 0 !== L
      return {
        type: 'line',
        name: e.name,
        data: w,
        stack: p ? 'total' : void 0,
        areaStyle: r ? { ...(o ? { color: o } : {}), opacity: 1 } : void 0,
        itemStyle: o ? { color: o } : void 0,
        lineStyle: a,
        label: h,
        labelLayout: sc(M),
        connectNulls: 'span' === $,
        ...(e.smooth ? { smooth: !0 } : {}),
        ...(e.formatCode
          ? {
              tooltip: {
                valueFormatter: (t) => Ks(t, f ? '0%' : e.formatCode),
              },
            }
          : {}),
        endLabel: { show: !1 },
        ...(A ? { symbol: A } : {}),
        ...(void 0 !== L ? { symbolSize: L } : {}),
        ...(void 0 !== S ? { showSymbol: S } : {}),
        ...(C ? { showAllSymbol: !0 } : {}),
        z: 3,
      }
    }),
    { valueAxis: k, categoryAxis: A } = Ra(e.child('plotArea'), i, t),
    L = oc(n),
    S =
      (f ? '0%' : void 0) ||
      k.numFmt ||
      (null != L && L.includes('%') ? L : void 0),
    C = {
      type: 'value',
      ...(S ? { axisLabel: { formatter: (t) => Ks(t, S) } } : {}),
    }
  ;(f && _d(C), Da(C, k, 'value'), !f && r && Kd(C, n, p))
  const F = {
    type: 'category',
    data: s,
    ...(r ? { boundaryGap: !1 } : {}),
    axisLabel: { interval: 0, rotate: 0 },
  }
  Da(F, A, 'category')
  const B = mc(e),
    j = !((null != d && d.overlay) || Dd(B) || Od(n)),
    E = od(!!a, d, j),
    P = ld(!!a, d),
    T = p && !r ? 12 : 14,
    z = k.deleted ? 4 : j ? T : 18,
    N = S || L,
    R = ad(d) + (j ? 3 : 0),
    I = !Dd(B),
    D = n.map((t, e) => ({ series: t, idx: e })),
    O = p || f ? [...D].reverse() : D
  return {
    title: a,
    tooltip: {
      trigger: 'axis',
      textStyle: u,
      extraCssText: Yd(u),
      ...(N
        ? { valueFormatter: (t) => Ks(Array.isArray(t) ? t[0] : t, N) }
        : {}),
    },
    legend: dd(
      c,
      d,
      P,
      r
        ? O.map(({ series: t, idx: e }) => {
            const n = M(t, e)
            return n ? { name: t.name, itemStyle: { color: n } } : t.name
          })
        : O.map(({ series: t, idx: e }) => {
            const n = Bd(
                t.markerSymbol ??
                  (!0 === v ? Nd(e) : !1 === v ? 'none' : void 0),
              ),
              i = M(t, e),
              r = i ? { lineStyle: { color: i }, itemStyle: { color: i } } : {}
            return n && 'none' !== n
              ? { name: t.name, icon: 'path://M2 4.5 L22 4.5', marker: n, ...r }
              : { name: t.name, icon: 'path://M2 4.5 L22 4.5', ...r }
          }),
      u,
    ),
    grid: {
      containLabel: I,
      left: z,
      right: j ? 15 : 10,
      top: E,
      bottom: R,
      ...B,
    },
    xAxis: F,
    yAxis: C,
    series: w,
  }
}
function cc(t, e, n, i, r) {
  const o = Sd(e, n, r, 12),
    l = nd(e, r),
    s = null == l ? void 0 : l.option,
    a = { fontSize: 10, ...((null == l ? void 0 : l.textStyle) ?? {}) },
    d = i ? n : n.slice(0, 1)
  if (0 === d.length) return { title: o }
  const c = t
      .children('ser')
      .map((t, e) => ({ ser: t, order: t.child('order').numAttr('val') ?? e }))
      .sort((t, e) => t.order - e.order)
      .map((t) => t.ser),
    u = d.map((e, n) => {
      const i = c[n],
        o = (null != i && i.exists() ? Za(i, r) : void 0) ?? Za(t, r),
        l = ec(i, t),
        s =
          ((null == i ? void 0 : i.exists()) && i.child('dLbls').exists()) ||
          t.child('dLbls').exists(),
        a = Ya(l, r),
        d = [...a.values()].some((t) => nc(tc(o, t)))
      return {
        series: e,
        serNode: i,
        sharedLabels: o,
        pointOverrides: a,
        labelsExplicitlyOff: s && !o && !d,
        explosions: i ? Ha(i, e.categories.length) : void 0,
      }
    }),
    h = (function (t, e, n, i = 50, r = !1) {
      const o = sd(t)
      let l = ['50%', '55%'],
        s = n ? 78 : 82
      return (
        'right' === o
          ? e && r
            ? ((l = ['45%', '55%']), (s = 76))
            : e
              ? ((l = ['39%', '54%']), (s = 87))
              : ((l = ['38%', '55%']), (s = 82))
          : 'left' === o
            ? ((l = ['62%', '55%']), (s = 82))
            : 'top' === o
              ? (l = ['50%', '60%'])
              : 'bottom' === o && (l = ['50%', '45%']),
        ('top' === o || 'bottom' === o) && (s -= 4),
        e
          ? {
              center: l,
              radius: [
                `${Math.round(s * (Math.min(Math.max(i, 10), 90) / 100))}%`,
                `${s}%`,
              ],
            }
          : { center: l, radius: `${s}%` }
      )
    })(
      l,
      i,
      u.some(
        (t) =>
          !t.labelsExplicitlyOff &&
          (nc(t.sharedLabels) ||
            [...t.pointOverrides.values()].some((e) =>
              nc(tc(t.sharedLabels, e)),
            )),
      ),
      i ? (t.child('holeSize').numAttr('val') ?? 50) : 50,
      u.some((t) => {
        var e
        return null == (e = t.explosions) ? void 0 : e.some((t) => t > 0)
      }),
    ),
    p = (function (t) {
      if (void 0 !== t && Number.isFinite(t))
        return (((90 - t) % 360) + 360) % 360
    })(t.child('firstSliceAng').numAttr('val')),
    f = u.map((t, e) => {
      var n
      const r = new Map(),
        o = t.series.categories.map((e, n) => {
          var o, l, s
          const a = t.pointOverrides.get(n),
            d = tc(t.sharedLabels, a)
          null != d && d.manualLayout && r.set(n, d.manualLayout)
          const c = {
              name: e || `Item ${n + 1}`,
              value: t.series.values[n] ?? 0,
            },
            u = null == (o = t.series.dataPointStyles) ? void 0 : o[n]
          return (
            u
              ? (c.itemStyle = {
                  ...(u.color ? { color: u.color } : {}),
                  ...(u.borderColor ? { borderColor: u.borderColor } : {}),
                  ...(void 0 !== u.borderWidth
                    ? { borderWidth: u.borderWidth }
                    : {}),
                  ...(u.borderType ? { borderType: u.borderType } : {}),
                })
              : null != (l = t.series.dataPointColors) &&
                l[n] &&
                (c.itemStyle = { color: t.series.dataPointColors[n] }),
            null != (s = t.explosions) &&
              s[n] &&
              t.explosions[n] > 0 &&
              ((c.selected = !0), (c.selectedOffset = Cd(t.explosions[n], i))),
            null != a && a.deleted
              ? (c.label = { show: !1 })
              : a &&
                nc(d) &&
                (c.label = lc(d, t.series.formatCode, t.series.name)),
            c
          )
        }),
        l = lc(t.sharedLabels, t.series.formatCode, t.series.name),
        s =
          !(null == (n = t.sharedLabels) || !n.showLeaderLines) ||
          [...t.pointOverrides.values()].some((t) => !0 === t.showLeaderLines),
        a = t.explosions && Math.max(...t.explosions.map((t) => Cd(t, i)))
      return {
        type: 'pie',
        name: t.series.name,
        radius: i ? ac(h.radius, e, u.length) : h.radius,
        center: h.center,
        data: o,
        selectedMode: !!t.explosions && 'multiple',
        ...(a ? { selectedOffset: a } : {}),
        ...(void 0 !== p ? { startAngle: p, clockwise: !0 } : {}),
        label: l ?? { show: !1 },
        labelLine: { show: s },
        labelLayout: sc(r),
      }
    }),
    m = ld(!!o, l),
    $ = oc(d),
    g = i
      ? (function (t) {
          const e = new Set(),
            n = []
          for (const i of t)
            for (const t of i.categories) e.has(t) || (e.add(t), n.push(t))
          return n
        })(d)
      : d[0].categories
  return {
    title: o,
    tooltip: {
      trigger: 'item',
      ...($
        ? { valueFormatter: (t) => Ks(Array.isArray(t) ? t[0] : t, $) }
        : {}),
    },
    legend: dd(s, l, m, g, a),
    series: f,
  }
}
function uc(t, e, n, i, r, o) {
  var l, s
  const a = Sd(e, n, i, 12),
    d = nd(e, i),
    c = null == d ? void 0 : d.option,
    u = { fontSize: 10, ...((null == d ? void 0 : d.textStyle) ?? {}) },
    h =
      (null == (l = n.find((t) => t.categories.length > 0))
        ? void 0
        : l.categories) || [],
    p = e.child('plotArea'),
    { valueAxis: f } = Ra(p, i)
  let m
  if (void 0 !== f.max) m = f.max
  else {
    let t = 0,
      e = 0
    for (const r of n)
      for (const n of r.values) (n > t && (t = n), n < e && (e = n))
    const i = Md(t, e, 5)
    m = Math.ceil(t / i) * i || 100
  }
  const $ = !f.deleted && 'none' !== f.tickLblPos,
    g = t.child('radarStyle').attr('val'),
    y = $
      ? {
          show: !0,
          formatter: (t) => Ks(t, f.numFmt),
          color: f.labelColor ?? '#000000',
          ...(void 0 !== f.labelFontSize ? { fontSize: f.labelFontSize } : {}),
        }
      : void 0,
    v =
      'filled' === g
        ? { radarZ: 4, seriesZ: 2 }
        : { radarZ: void 0, seriesZ: void 0 },
    b = null == (s = t.children('axId')[1]) ? void 0 : s.attr('val'),
    M =
      p.children('valAx').find((t) => t.child('axId').attr('val') === b) ??
      p.child('valAx'),
    w = M.child('majorGridlines').child('spPr').exists(),
    k = M.child('spPr').child('ln').exists(),
    A =
      f.hasMajorGridlines && ('filled' !== g || w)
        ? {
            show: !0,
            lineStyle: { ...$a, ...(w ? (f.majorGridlineStyle ?? {}) : {}) },
          }
        : { show: !1 },
    L = f.deleted
      ? { show: !1 }
      : {
          show: !0,
          lineStyle: { color: k ? (f.lineColor ?? $a.color) : $a.color },
        },
    S = (h.length > 1 ? [h[0], ...h.slice(1).reverse()] : h).map((t, e) => ({
      name: t,
      max: m,
      ...(void 0 !== f.min ? { min: f.min } : {}),
      ...(0 === e && y ? { axisLabel: y } : {}),
    })),
    C = rd(d) && !(null != d && d.overlay),
    F = (function (t, e) {
      const { x: n, y: i, w: r, h: o } = fc(t)
      if (void 0 === n || void 0 === i || void 0 === r || void 0 === o) return
      const l = n + r / 2,
        s = i + o / 2
      return e
        ? { center: [l * e.w, s * e.h], radius: Math.min(r * e.w, o * e.h) / 2 }
        : { center: [ed(l), ed(s)], radius: ed(Math.min(r, o) / 2) }
    })(e, o),
    B =
      (null == F ? void 0 : F.center) ??
      (C ? ['50%', '66%'] : 'filled' === g ? ['50%', '55%'] : ['50%', '50%']),
    j =
      (null == F ? void 0 : F.radius) ??
      (C ? '58%' : 'filled' === g ? '76%' : '86%'),
    E = n.map((t, e) => {
      const n =
          t.values.length > 1
            ? [t.values[0], ...t.values.slice(1).reverse()]
            : t.values,
        i = Bd(t.markerSymbol),
        o = 'marker' === g || (void 0 !== i && 'none' !== i),
        l = 'filled' === g,
        s = t.colorHex ?? (null == r ? void 0 : r[e % r.length]),
        a =
          'string' == typeof s
            ? (function (t) {
                return new x(0, 0, 0, 1, [
                  {
                    offset: 0,
                    color: Qd(t, {
                      saturationScale: 1.95,
                      lightnessOffset: 0.217,
                    }),
                  },
                  {
                    offset: 1,
                    color: Qd(t, {
                      hueOffset: -5,
                      saturationScale: 1.7,
                      lightnessOffset: -0.128,
                    }),
                  },
                ])
              })(s)
            : s,
        d = l ? { ...(a ? { color: a } : {}), opacity: 0.75 } : void 0
      return {
        name: t.name,
        value: n,
        ...(s
          ? {
              lineStyle: {
                color: s,
                width: t.lineWidth ?? 3,
                cap: 'round',
                join: 'round',
                ...(t.lineNoFill ? { opacity: 0 } : {}),
              },
              itemStyle: { color: s },
            }
          : {
              lineStyle: {
                width: t.lineWidth ?? 3,
                cap: 'round',
                join: 'round',
                ...(t.lineNoFill ? { opacity: 0 } : {}),
              },
            }),
        ...(d ? { areaStyle: d } : {}),
        ...(i && 'none' !== i ? { symbol: i } : {}),
        ...(o ? {} : { symbol: 'none' }),
        ...(t.markerSize ? { symbolSize: t.markerSize } : {}),
        ...(o ? { symbolSize: t.markerSize ?? 6 } : {}),
      }
    })
  return {
    title: a,
    tooltip: {},
    legend: dd(
      c,
      d,
      ld(!!a, d),
      n.map((t) => {
        const e = Bd(t.markerSymbol)
        return t.lineNoFill && e && 'none' !== e
          ? { name: t.name, icon: e }
          : {
              name: t.name,
              icon: 'path://M2 4.5 L22 4.5',
              ...(e && 'none' !== e ? { marker: e } : {}),
            }
      }),
      u,
    ),
    radar: {
      ...(void 0 !== v.radarZ ? { z: v.radarZ } : {}),
      indicator: S,
      radius: j,
      center: B,
      splitNumber: 5,
      splitLine: A,
      axisLine: L,
      splitArea: { show: !1 },
    },
    series: [
      {
        type: 'radar',
        ...(void 0 !== v.seriesZ ? { z: v.seriesZ } : {}),
        data: E,
      },
    ],
  }
}
function hc(t, e, n) {
  if (void 0 !== t.max || 0 === e.length) return
  const i = e
    .map((t, e) => ({ value: t, bubbleSize: n[e] ?? 0 }))
    .filter(({ value: t }) => Number.isFinite(t))
  if (0 === i.length) return
  const r = Math.min(...i.map(({ value: t }) => t)),
    o = Math.max(...i.map(({ value: t }) => t)),
    l = o - Math.min(0, r) <= 3 ? 3 : 8,
    s = Md(o, r, l)
  let a = bd(o, r, l)
  a > o && a - o < 0.25 * s && (a += s)
  const d = Math.max(...i.map(({ bubbleSize: t }) => t)),
    c = Math.max(
      ...i
        .filter(({ value: t }) => Math.abs(t - o) < 1e-9)
        .map(({ bubbleSize: t }) => t),
      0,
    )
  ;(d > 0 && c / d >= 0.75 && (a += s),
    (t.max = a),
    void 0 === t.min && r >= 0 && (t.min = 0),
    void 0 === t.interval && (t.interval = s))
}
function pc(t) {
  switch (t) {
    case 'dot':
    case 'circle':
      return 'circle'
    case 'square':
      return 'rect'
    case 'diamond':
    case 'triangle':
      return t
    case 'none':
    case void 0:
      return 'none'
    default:
      return 'circle'
  }
}
function fc(t) {
  const e = t.child('plotArea').child('layout').child('manualLayout')
  return e.exists()
    ? {
        x: e.child('x').numAttr('val'),
        y: e.child('y').numAttr('val'),
        w: e.child('w').numAttr('val'),
        h: e.child('h').numAttr('val'),
      }
    : {}
}
function mc(t) {
  const e = fc(t),
    n = {}
  return (
    void 0 !== e.x && (n.left = ed(e.x)),
    void 0 !== e.y && (n.top = ed(e.y)),
    void 0 !== e.w && (n.width = ed(e.w)),
    void 0 !== e.h && (n.height = ed(e.h)),
    n
  )
}
function $c(t, e, n) {
  if (!n) return
  const { x: i = 0, y: r = 0, w: o = 1, h: l = 1 } = fc(t)
  return {
    type: 'rect',
    silent: !0,
    z: -10,
    left: i * n.w,
    top: r * n.h,
    shape: { width: o * n.w, height: l * n.h },
    style: { fill: e, stroke: 'none' },
  }
}
function gc(t, e) {
  const n = t.graphic
  t.graphic = n ? (Array.isArray(n) ? [e, ...n] : [e, n]) : e
}
function yc(t, e, n, i, r, o, l) {
  switch (t) {
    case 'barChart':
    case 'bar3DChart':
      return (function (t, e, n, i) {
        var r
        const o = t.child('barDir').attr('val') || t.attr('barDir') || 'col',
          l = Wd(t),
          s = 'bar' === o,
          a = t.child('gapWidth').numAttr('val') ?? 150,
          d = t.child('overlap').numAttr('val'),
          c =
            (null == (r = n.find((t) => t.categories.length > 0))
              ? void 0
              : r.categories) || [],
          u = Sd(e, n, i, 12),
          h = nd(e, i),
          p = null == h ? void 0 : h.option,
          f = { fontSize: 10, ...((null == h ? void 0 : h.textStyle) ?? {}) },
          m = Hd(l),
          $ = Vd(l),
          g = $ ? qd(n) : void 0,
          y = ic(e),
          x = t.child('varyColors'),
          v =
            1 === n.length &&
            n[0].values.length > 1 &&
            !m &&
            !$ &&
            !n[0].colorHex,
          b = x.exists() ? ea(x) : v,
          M = Ja(i, { darken: !s })
        let w = Za(t, i)
        if (!w) {
          const e = t.children('ser')[0]
          null != e && e.exists() && (w = Za(e, i))
        }
        const k = t
            .children('ser')
            .map((t, e) => ({
              ser: t,
              order: t.child('order').numAttr('val') ?? e,
            }))
            .sort((t, e) => t.order - e.order)
            .map((t) => t.ser),
          A = n.map((e, r) => {
            const o = e.formatCode,
              l = Za(k[r] ?? t, i) ?? w,
              s = (t) => {
                if (null == t || !t.showVal) return
                const e = {
                  show: !0,
                  position: Zd(t.position, m),
                  fontSize: t.fontSize ?? 9,
                  ...(t.color ? { color: t.color } : {}),
                  ...(!0 === t.bold ? { fontWeight: 'bold' } : {}),
                  ...Xd(t),
                  formatter: (t) => {
                    const e = null == t ? void 0 : t.value,
                      n =
                        e && 'object' == typeof e && 'value' in e ? e.value : e
                    return 0 === n || null === n ? '' : Ks(n, $ ? '0%' : o)
                  },
                }
                return void 0 !== t.fontSize ? ya(e) : e
              },
              c = s(l),
              u = Ya(ec(k[r], t), i),
              h = ((null == g ? void 0 : g[r]) ?? e.values).map((t, n) => {
                var i
                const r = u.get(n),
                  o = e.values[n] ?? t,
                  a = rc(e, n, t, y),
                  d = null == (i = e.dataPointStyles) ? void 0 : i[n]
                let c, h
                return (
                  d
                    ? (c = {
                        ...(d.color ? { color: d.color } : {}),
                        ...(d.borderColor
                          ? { borderColor: d.borderColor }
                          : {}),
                        ...(void 0 !== d.borderWidth
                          ? { borderWidth: d.borderWidth }
                          : {}),
                        ...(d.borderType ? { borderType: d.borderType } : {}),
                      })
                    : !1 !== e.invertIfNegative && o < 0
                      ? (c = {
                          color: '#FFFFFF',
                          borderColor: '#000000',
                          borderWidth: 1,
                        })
                      : b &&
                        !e.colorHex &&
                        M.length > 0 &&
                        (c = { color: M[n % M.length] }),
                  null != r && r.deleted
                    ? (h = { show: !1 })
                    : r &&
                      (h = s({
                        showVal: (null == l ? void 0 : l.showVal) ?? !1,
                        showCatName: (null == l ? void 0 : l.showCatName) ?? !1,
                        showSerName: (null == l ? void 0 : l.showSerName) ?? !1,
                        showPercent: (null == l ? void 0 : l.showPercent) ?? !1,
                        position: null == l ? void 0 : l.position,
                        showLeaderLines: null == l ? void 0 : l.showLeaderLines,
                        manualLayout: null == l ? void 0 : l.manualLayout,
                        color: null == l ? void 0 : l.color,
                        fontSize: null == l ? void 0 : l.fontSize,
                        bold: null == l ? void 0 : l.bold,
                        backgroundColor: null == l ? void 0 : l.backgroundColor,
                        borderColor: null == l ? void 0 : l.borderColor,
                        borderWidth: null == l ? void 0 : l.borderWidth,
                        padding: null == l ? void 0 : l.padding,
                        ...r,
                      })),
                  c || h
                    ? {
                        value: a,
                        ...(c ? { itemStyle: c } : {}),
                        ...(h ? { label: h } : {}),
                      }
                    : a
                )
              })
            return {
              type: 'bar',
              name: e.name,
              data: h,
              stack: m ? 'total' : void 0,
              itemStyle: e.colorHex ? { color: e.colorHex } : void 0,
              label: c,
              ...(e.formatCode
                ? {
                    tooltip: {
                      valueFormatter: (t) => Ks(t, $ ? '0%' : e.formatCode),
                    },
                  }
                : {}),
              barGap: void 0 !== d ? -d + '%' : '0%',
              barCategoryGap:
                void 0 !== a
                  ? `${Math.round((100 * a) / (100 * (m ? 1 : n.length) + a))}%`
                  : void 0,
            }
          }),
          { valueAxis: L, categoryAxis: S } = Ra(e.child('plotArea'), i, t),
          C = {
            type: 'category',
            data: c,
            axisLabel: { interval: 0, rotate: 0, fontSize: 10 },
          }
        Da(C, S, 'category')
        const F = oc(n),
          B =
            ($ ? '0%' : void 0) ||
            L.numFmt ||
            (null != F && F.includes('%') ? F : void 0),
          j = {
            type: 'value',
            ...(B ? { axisLabel: { formatter: (t) => Ks(t, B) } } : {}),
          }
        ;($ && _d(j), Da(j, L, 'value'))
        const E = mc(e),
          P = !(s || (null != h && h.overlay) || Dd(E) || Od(n)),
          T = !!u,
          z =
            s && (!rd(h) || (null != h && h.overlay))
              ? T
                ? 61
                : 14
              : od(T, h, P),
          N = ld(T, h),
          R = $ ? 13 : m ? 12 : 14,
          I = s ? (m ? 14 : 12) : L.deleted ? 4 : P ? R : 18,
          D = s ? 10 : P ? 15 : 10,
          O = B || F,
          U = ad(h),
          Z = s && 20 === U ? 23 : U + (P ? 3 : 0),
          G = !Dd(E)
        return {
          title: u,
          tooltip: {
            trigger: 'axis',
            textStyle: f,
            extraCssText: Yd(f),
            ...(O
              ? { valueFormatter: (t) => Ks(Array.isArray(t) ? t[0] : t, O) }
              : {}),
          },
          legend: dd(
            p,
            h,
            N,
            n.map((t) => t.name),
            f,
          ),
          grid: { containLabel: G, left: I, right: D, top: z, bottom: Z, ...E },
          xAxis: s ? j : C,
          yAxis: s ? C : j,
          series: A,
        }
      })(e, n, i, r)
    case 'lineChart':
    case 'line3DChart':
      return dc(e, n, i, r, !1, o)
    case 'areaChart':
    case 'area3DChart':
    case 'surface3DChart':
      return dc(e, n, i, r, !0, o)
    case 'pieChart':
    case 'pie3DChart':
      return cc(e, n, i, !1, r)
    case 'doughnutChart':
      return cc(e, n, i, !0, r)
    case 'radarChart':
      return uc(e, n, i, r, o, l)
    case 'scatterChart':
      return (function (t, e, n, i, r) {
        const o = Sd(e, n, i, 14),
          l = nd(e, i),
          s = null == l ? void 0 : l.option,
          a = { fontSize: 10, ...((null == l ? void 0 : l.textStyle) ?? {}) },
          d = t.child('scatterStyle').attr('val') ?? 'lineMarker',
          c =
            'lineMarker' === d ||
            'line' === d ||
            'smoothMarker' === d ||
            'smooth' === d,
          u = 'smoothMarker' === d || 'smooth' === d,
          h = 'line' === d || 'smooth' === d,
          p = n.map((t, n) => {
            const i = Rd(t, ic(e)),
              r = Bd(t.markerSymbol) ?? zd(d, n),
              o = !h && 'none' !== r
            if ((c || t.smooth) && !t.lineNoFill) {
              const n = t.smooth ?? u,
                l = 'span' === ic(e),
                s = n ? Id(i, l) : i,
                a = t.lineWidth ?? 3
              return {
                type: 'line',
                name: t.name,
                data: s,
                connectNulls: l,
                smooth: !1,
                showSymbol: o,
                ...(o ? { symbol: r, symbolSize: t.markerSize ?? Td } : {}),
                ...(t.colorHex
                  ? {
                      lineStyle: {
                        color: t.colorHex,
                        width: a,
                        cap: 'round',
                        join: 'round',
                      },
                      itemStyle: { color: t.colorHex },
                    }
                  : { lineStyle: { width: a, cap: 'round', join: 'round' } }),
              }
            }
            return {
              type: 'scatter',
              name: t.name,
              data: i,
              symbol: o ? r : 'none',
              symbolSize: o ? (t.markerSize ?? Td) : 0,
              itemStyle: t.colorHex ? { color: t.colorHex } : void 0,
            }
          }),
          f = n.map((t, e) => {
            const n = Bd(t.markerSymbol) ?? zd(d, e),
              i = !h && 'none' !== n
            return (!c && !t.smooth) || t.lineNoFill
              ? n && 'none' !== n
                ? { name: t.name, icon: n }
                : t.name
              : i && n
                ? { name: t.name, icon: n }
                : { name: t.name, icon: 'path://M2 4.5 L22 4.5' }
          }),
          { xAxis: m, yAxis: $ } = Ia(e.child('plotArea'), i),
          g = mc(e),
          y = !(void 0 === r || (null != l && l.overlay) || Dd(g)),
          x = od(!!o, l, y),
          v = ld(!!o, l),
          b = !Dd(g),
          M = $.deleted
            ? 4
            : y
              ? Ud(null == r ? void 0 : r.w, 0.018, 18, 4)
              : 18,
          w = y ? Ud(null == r ? void 0 : r.w, 0.01, 10, 4) : 10,
          k = x,
          A = y
            ? 'bottom' === sd(l)
              ? ad(l)
              : Ud(null == r ? void 0 : r.h, 0.04, 20, 8)
            : ad(l),
          L = { type: 'value' },
          S = { type: 'value' }
        return (
          Da(L, m, 'value'),
          Da(S, $, 'value'),
          {
            title: o,
            tooltip: { trigger: 'item' },
            legend: dd(s, l, v, f, a),
            grid: {
              containLabel: b,
              left: M,
              right: w,
              top: k,
              bottom: A,
              ...g,
            },
            xAxis: L,
            yAxis: S,
            series: p,
          }
        )
      })(e, n, i, r, l)
    case 'bubbleChart':
      return (function (t, e, n, i, r) {
        const o = Sd(e, n, i, 14),
          l = nd(e, i),
          s = null == l ? void 0 : l.option,
          a = { fontSize: 10, ...((null == l ? void 0 : l.textStyle) ?? {}) },
          d =
            (Math.max(t.child('bubbleScale').numAttr('val') ?? 100, 0) / 100) *
            120
        let c = -Infinity
        for (const S of n)
          for (const t of Rd(S, ic(e), !0))
            t.every((t) => null !== t) && t[2] > c && (c = t[2])
        const u = c > 0 ? c : 1,
          h = n.map((t) => {
            const n = Rd(t, ic(e), !0)
            return {
              type: 'scatter',
              name: t.name,
              data: n,
              symbolSize: (t) => {
                const e = Math.max(Number(t[2]) || 0, 0)
                return Math.sqrt(e / u) * d
              },
              itemStyle: t.colorHex ? { color: t.colorHex } : void 0,
            }
          }),
          { xAxis: p, yAxis: f } = Ia(e.child('plotArea'), i),
          m = mc(e),
          $ = !(void 0 === r || (null != l && l.overlay) || Dd(m)),
          g = od(!!o, l, $),
          y = ld(!!o, l),
          x = !Dd(m),
          v = f.deleted
            ? 4
            : $
              ? Ud(null == r ? void 0 : r.w, 0.016, 15, 4)
              : 18,
          b = $ ? Ud(null == r ? void 0 : r.w, 0.01, 10, 4) : 10,
          M = g,
          w = $
            ? 'bottom' === sd(l)
              ? ad(l)
              : Ud(null == r ? void 0 : r.h, 0.04, 20, 8)
            : ad(l),
          k = { type: 'value' },
          A = { type: 'value' }
        ;(Da(k, p, 'value'), Da(A, f, 'value'))
        const L = n
          .flatMap((t) => Rd(t, ic(e), !0))
          .filter((t) => t.every((t) => null !== t))
          .map(([t, e, n]) => ({ x: t, y: e, bubbleSize: n }))
        return (
          hc(
            k,
            L.map((t) => t.x),
            L.map((t) => t.bubbleSize),
          ),
          hc(
            A,
            L.map((t) => t.y),
            L.map((t) => t.bubbleSize),
          ),
          {
            title: o,
            tooltip: {
              trigger: 'item',
              formatter: (t) => {
                const e = t
                return `${e.seriesName}<br/>x: ${e.value[0]}, y: ${e.value[1]}, size: ${e.value[2]}`
              },
            },
            legend: dd(
              s,
              l,
              y,
              n.map((t) => ({ name: t.name, icon: 'circle' })),
              a,
            ),
            grid: {
              containLabel: x,
              left: v,
              right: b,
              top: M,
              bottom: w,
              ...m,
            },
            xAxis: k,
            yAxis: A,
            series: h,
          }
        )
      })(e, n, i, r, l)
    case 'stockChart':
      return (function (t, e, n, i) {
        var r, o, l, s, a, d, c
        const u = Sd(e, n, i, 14),
          h = nd(e, i),
          p =
            (null == (r = n.find((t) => t.categories.length > 0))
              ? void 0
              : r.categories) || [],
          f = p.length || Math.max(...n.map((t) => t.values.length), 0),
          m = []
        if (n.length >= 4)
          for (let E = 0; E < f; E++)
            m.push([
              n[0].values[E] ?? 0,
              n[3].values[E] ?? 0,
              n[2].values[E] ?? 0,
              n[1].values[E] ?? 0,
            ])
        else if (n.length >= 3)
          for (let E = 0; E < f; E++) {
            const t = n[2].values[E] ?? 0
            m.push([t, t, n[1].values[E] ?? 0, n[0].values[E] ?? 0])
          }
        else
          for (let E = 0; E < f; E++) {
            const t = (null == (o = n[0]) ? void 0 : o.values[E]) ?? 0
            m.push([0, t, 0, t])
          }
        const { valueAxis: $, categoryAxis: g } = Ra(e.child('plotArea'), i, t),
          y = od(!!u, h),
          x = mc(e),
          v = !Dd(x),
          b = {
            type: 'category',
            data: p,
            axisLabel: { interval: 0, rotate: 0, fontSize: 10 },
            splitLine: { show: !1 },
          }
        Da(b, g, 'category')
        const M =
          p.length >= 3 &&
          p.every((t) =>
            (function (t) {
              return /^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(t.trim())
            })(t),
          ) &&
          !g.deleted &&
          'none' !== g.tickLblPos
        if (M) {
          const t = b.axisLabel || {}
          b.axisLabel = {
            ...t,
            rotate: 45,
            margin: Math.max(Number(t.margin) || 0, 10),
          }
        }
        const w = { type: 'value' }
        Da(w, $, 'value')
        const k = m
          .flatMap((t) => [t[2], t[3]])
          .filter((t) => Number.isFinite(t))
        if (k.length > 0) {
          const t = Math.min(...k),
            e = Math.max(...k)
          if (
            (void 0 === w.min && t >= 0 && (w.min = 0),
            void 0 === w.interval && (w.interval = Md(e, t, 7)),
            void 0 === w.max)
          ) {
            const n = Number(w.interval) || Md(e, t, 7)
            w.max = Math.ceil(e / n) * n + n
          }
        }
        const A = null == h ? void 0 : h.option,
          L = { fontSize: 10, ...((null == h ? void 0 : h.textStyle) ?? {}) },
          S = ld(!!u, h),
          C = Math.max(ad(h), M ? 56 : 0),
          F = n.length >= 3 && n.length < 4,
          B = F
            ? n
                .slice(0, 3)
                .map((t, e) => ({
                  name: t.name,
                  icon: 2 === e ? pc(t.markerSymbol) : 'none',
                }))
            : n.map((t) => t.name),
          j = F
            ? [
                {
                  type: 'custom',
                  name: n[2].name,
                  coordinateSystem: 'cartesian2d',
                  data: Array.from({ length: f }, (t, e) => [
                    e,
                    n[0].values[e] ?? 0,
                    n[1].values[e] ?? 0,
                    n[2].values[e] ?? 0,
                  ]),
                  renderItem: (t, e) => {
                    const i = e.value(0),
                      r = e.value(1),
                      o = e.value(2),
                      l = e.value(3),
                      s = e.coord([i, r]),
                      a = e.coord([i, o]),
                      d = e.coord([i, l]),
                      c = Math.max(8, e.size([1, 0])[0] || 12),
                      u = Math.min(4, Math.max(2, Math.round(0.04 * c))),
                      h = ud(n[0].colorHex, '#000000'),
                      p = ud(n[2].colorHex, '#00B050')
                    return {
                      type: 'group',
                      children: [
                        {
                          type: 'line',
                          shape: { x1: s[0], y1: s[1], x2: a[0], y2: a[1] },
                          style: { stroke: h, lineWidth: 1 },
                        },
                        {
                          type: 'line',
                          shape: { x1: d[0], y1: d[1], x2: d[0] + u, y2: d[1] },
                          style: { stroke: p, lineWidth: 1 },
                        },
                      ],
                    }
                  },
                  silent: !0,
                },
              ]
            : [
                {
                  type: 'candlestick',
                  name:
                    n.length >= 3
                      ? n[2].name
                      : null == (l = n[0])
                        ? void 0
                        : l.name,
                  data: m,
                  itemStyle: {
                    color: ud(
                      null == (s = n[n.length >= 4 ? 3 : 2])
                        ? void 0
                        : s.colorHex,
                      '#ec0000',
                    ),
                    color0: ud(
                      null == (a = n[0]) ? void 0 : a.colorHex,
                      '#00da3c',
                    ),
                    borderColor: ud(
                      null == (d = n[n.length >= 4 ? 3 : 2])
                        ? void 0
                        : d.colorHex,
                      '#ec0000',
                    ),
                    borderColor0: ud(
                      null == (c = n[0]) ? void 0 : c.colorHex,
                      '#00da3c',
                    ),
                  },
                },
              ]
        return {
          title: u,
          tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
          legend: dd(A, h, S, B, L),
          grid: {
            containLabel: v,
            left: 24,
            right: 10,
            top: y,
            bottom: C,
            ...x,
          },
          xAxis: b,
          yAxis: w,
          series: j,
        }
      })(e, n, i, r)
    default:
      return
  }
}
function xc(t) {
  return (
    'barChart' === t ||
    'bar3DChart' === t ||
    'lineChart' === t ||
    'line3DChart' === t ||
    'areaChart' === t ||
    'area3DChart' === t ||
    'stockChart' === t ||
    'surface3DChart' === t
  )
}
function vc(t, e) {
  const n = cd(t),
    i = cd(e)
  if (!n) return e
  if (!i) return t
  const r = [...(n.data ?? []), ...(i.data ?? [])],
    o = new Set(),
    l = r.filter((t) => {
      const e = 'string' == typeof t ? t : t.name
      return !o.has(e) && (o.add(e), !0)
    }),
    s = { ...n, data: l }
  return (l.some((t) => 'object' == typeof t && t.icon) && delete s.icon, s)
}
function bc(t) {
  return void 0 === t ? [] : Array.isArray(t) ? t : [t]
}
function Mc(t, e, n) {
  if ('number' == typeof t && Number.isFinite(t)) return t
  if ('string' == typeof t) {
    if (t.endsWith('%')) {
      const i = parseFloat(t)
      return Number.isFinite(i) ? (e * i) / 100 : n
    }
    const i = parseFloat(t)
    return Number.isFinite(i) ? i : n
  }
  return n
}
function wc(t, e, n, i) {
  if (
    'string' == typeof (null == t ? void 0 : t.width) &&
    'left' === n &&
    t.width.endsWith('%')
  )
    return (e * parseFloat(t.width)) / 100
  if (
    'string' == typeof (null == t ? void 0 : t.height) &&
    'top' === n &&
    t.height.endsWith('%')
  )
    return (e * parseFloat(t.height)) / 100
  if ('number' == typeof (null == t ? void 0 : t.width) && 'left' === n)
    return t.width
  if ('number' == typeof (null == t ? void 0 : t.height) && 'top' === n)
    return t.height
  const r = Mc(null == t ? void 0 : t[n], e, 0),
    o = Mc(null == t ? void 0 : t[i], e, 0)
  return Math.max(0, e - r - o)
}
function kc(t, e, n, i = 1) {
  var r
  if (
    !e ||
    'category' !== t.type ||
    'value' !== e.type ||
    !0 !== (null == (r = t.axisLine) ? void 0 : r.onZero) ||
    !(function (t) {
      return (
        'number' == typeof t.min &&
        'number' == typeof t.max &&
        t.min < 0 &&
        t.max > 0
      )
    })(e) ||
    n <= 0
  )
    return !1
  const o = n * ((0 - e.min) / (e.max - e.min)),
    l = t.axisLabel ?? (t.axisLabel = {}),
    s = Math.max(6, Math.round((l.fontSize ?? 10) * i))
  return (
    (l.margin = -Math.round(Math.max(0, o - s))),
    (t.z = Math.max(t.z ?? 0, 20)),
    !0
  )
}
function Ac(t) {
  return za(t)[1]
}
function Lc(t, e, n, i) {
  const r = Array.isArray(t.series) ? t.series : [],
    o = Array.isArray(e.series) ? e.series : [],
    l = Ac(n),
    s = Ac(i)
  if (void 0 !== l && void 0 !== s && l !== s) {
    const n = bc(t.yAxis),
      i = bc(e.yAxis),
      l = n.length
    return {
      ...t,
      legend: vc(t.legend, e.legend),
      yAxis: [...n, ...i],
      series: [
        ...r,
        ...o.map((t) => ({
          ...t,
          yAxisIndex: void 0 !== t.yAxisIndex ? t.yAxisIndex : l,
        })),
      ],
    }
  }
  return { ...t, legend: vc(t.legend, e.legend), series: [...r, ...o] }
}
function Sc(t, e, n, i) {
  const r = qa(t, e),
    o = td(t, r, n),
    l = t.child('chart'),
    s = l.child('plotArea')
  if (!s.exists())
    return {
      option: { title: { text: 'Unsupported chart', left: 'center' } },
      chartFrameStyle: kd(t, r),
    }
  const { chartBg: a, plotAreaBg: d } = (function (t, e, n) {
      let i, r
      const o = t.child('spPr')
      if (o.exists() && !o.child('noFill').exists()) {
        const t = o.child('solidFill')
        i = t.exists() ? ia(t, n) : '#ffffff'
      }
      const l = e.child('plotArea')
      if (l.exists()) {
        const t = l.child('spPr')
        if (t.exists() && !t.child('noFill').exists()) {
          const e = t.child('solidFill')
          e.exists() && (r = ia(e, n))
        }
      }
      return { chartBg: i, plotAreaBg: r }
    })(t, l, r),
    c = kd(t, r),
    u = va
      .flatMap((t) =>
        s.children(t).map((e) => {
          const n = (function (t, e) {
            const n = []
            for (const i of t.children('ser')) {
              const t = Wa(i.child('tx')),
                r = i.child('order').numAttr('val') ?? n.length,
                o = _s(i.child('cat')),
                l = i.child('val'),
                s = Js(l),
                a = s.values
              let d = s.blankIndices
              const c = Qs(l),
                u = i.child('xVal'),
                h = i.child('yVal')
              let p, f
              if (h.exists()) {
                const t = Js(h)
                t.values.length > 0 &&
                  ((a.length = 0), a.push(...t.values), (d = t.blankIndices))
              }
              if (u.exists()) {
                const t = Js(u)
                if (((p = t.values), (f = t.blankIndices), 0 === o.length)) {
                  const t = _s(u)
                  t.length > 0 && o.push(...t)
                }
              }
              const m = i.child('bubbleSize'),
                $ = m.exists() ? Js(m) : void 0,
                g = null == $ ? void 0 : $.values,
                y = oa(i, e),
                x = la(i),
                v = aa(i),
                b = ua(i, e),
                M =
                  null == b
                    ? void 0
                    : b.map((t) => (null == t ? void 0 : t.color)),
                w = i.child('invertIfNegative'),
                k = w.exists() ? ea(w) : void 0,
                A = i.child('marker'),
                L = A.child('symbol').attr('val'),
                S = A.child('size').numAttr('val'),
                C = void 0 !== S ? sa(S) : void 0,
                F = i.child('smooth'),
                B = F.exists() ? ea(F) : void 0
              n.push({
                name: t,
                order: r,
                categories: o,
                values: a,
                xValues: p,
                xBlankIndices: f,
                bubbleSizes: g,
                bubbleBlankIndices: null == $ ? void 0 : $.blankIndices,
                colorHex: y,
                dataPointColors: M,
                dataPointStyles: b,
                formatCode: c,
                blankIndices: d,
                invertIfNegative: k,
                markerSymbol: L,
                markerSize: C,
                smooth: B,
                lineWidth: x,
                lineNoFill: v,
              })
            }
            return (n.sort((t, e) => t.order - e.order), n)
          })(e, r)
          return 0 === n.length
            ? null
            : { typeName: t, chartTypeNode: e, seriesArr: n }
        }),
      )
      .filter((t) => null !== t)
  for (const [h, p] of u.entries()) {
    let e = yc(p.typeName, p.chartTypeNode, l, p.seriesArr, r, o, i)
    if (!e) continue
    if (0 === h && u.length > 1 && xc(p.typeName))
      for (const t of u.slice(1)) {
        if (!xc(t.typeName)) continue
        const n = yc(t.typeName, t.chartTypeNode, l, t.seriesArr, r, o, i)
        n && (e = Lc(e, n, p.chartTypeNode, t.chartTypeNode))
      }
    const n = wd(t)
    n && fd(e, n)
    const f = Ba(r)
    if (
      (f && md(e, f),
      $d(e),
      gd(e, l, n),
      vd(e, i),
      a && (e.backgroundColor = a),
      o && o.length > 0 && (e.color = o),
      d)
    )
      if (e.grid) ((e.grid.backgroundColor = d), (e.grid.show = !0))
      else {
        const t = $c(l, d, i)
        t && gc(e, t)
      }
    const m =
        0 === h && u.length > 1 && xc(p.typeName)
          ? u
              .filter((t) => xc(t.typeName))
              .flatMap((t) => t.seriesArr)
              .sort((t, e) => t.order - e.order)
          : p.seriesArr,
      $ = Va(s)
    return {
      option: e,
      dataTable: $ ? { seriesArr: m, showKeys: $.showKeys } : void 0,
      chartFrameStyle: c,
    }
  }
  return {
    option: {
      title: {
        text: 'Unsupported chart type',
        left: 'center',
        textStyle: { fontSize: 12 },
      },
    },
    chartFrameStyle: c,
  }
}
function Cc(t, e) {
  var n, i, r
  const o = document.createElement('div')
  ;((o.style.position = 'absolute'),
    (o.style.left = `${t.position.x}px`),
    (o.style.top = `${t.position.y}px`),
    (o.style.width = `${t.size.w}px`),
    (o.style.height = `${t.size.h}px`),
    (o.style.overflow = 'hidden'),
    (o.style.display = 'flex'),
    (o.style.flexDirection = 'column'))
  const l = null == (n = e.presentation.charts) ? void 0 : n.get(t.chartPath)
  if (!l)
    return (
      (o.style.border = '1px dashed #ccc'),
      (o.style.display = 'flex'),
      (o.style.alignItems = 'center'),
      (o.style.justifyContent = 'center'),
      (o.style.color = '#999'),
      (o.style.fontSize = '12px'),
      (o.textContent = 'Chart not found'),
      o
    )
  const s = document.createElement('div')
  ;((s.style.width = '100%'),
    (s.style.flex = '1'),
    (s.style.minWidth = '0'),
    (s.style.minHeight = '0'),
    (s.style.overflow = 'hidden'),
    o.appendChild(s))
  const d =
      null == (i = e.presentation.chartThemes) ? void 0 : i.get(t.chartPath),
    {
      option: c,
      dataTable: u,
      chartFrameStyle: h,
    } = Sc(
      l,
      d ? { ...e, theme: d, colorCache: new Map() } : e,
      t.chartPath,
      t.size,
    )
  ;((function (t, e) {
    const n = bc(t.grid)[0],
      i = bc(t.xAxis),
      r = bc(t.yAxis),
      o = wc(n, e.h, 'top', 'bottom'),
      l = wc(n, e.w, 'left', 'right')
    let s = !1
    ;(i.forEach((t, e) => {
      s = kc(t, r[e] ?? r[0], o) || s
    }),
      r.forEach((t, e) => {
        kc(t, i[e] ?? i[0], l, 2)
      }),
      s &&
        n &&
        ((n.containLabel = !1),
        (n.left = Math.max(Mc(n.left, e.w, 0), 48, Math.round(0.065 * e.w)))))
  })(c, t.size),
    h &&
      ((o.style.boxSizing = 'border-box'),
      h.borderColor &&
        h.borderWidth &&
        h.borderStyle &&
        (o.style.border = `${h.borderWidth}px ${h.borderStyle} ${h.borderColor}`)))
  const p = (function (t, e) {
      var n, i, r, o, l
      const s = cd(t.legend)
      if (!s || !1 === s.show) return null
      const a = 'vertical' === s.orient,
        d = 'horizontal' === s.orient || void 0 === s.orient,
        c =
          void 0 !== s.top ||
          void 0 !== s.bottom ||
          void 0 !== s.left ||
          void 0 !== s.right
      if ((a && void 0 === s.left && void 0 === s.right) || (d && !c))
        return null
      const u = Array.isArray(t.color)
          ? t.color.filter((t) => 'string' == typeof t)
          : [],
        h = s.data ?? [],
        p = Array.isArray(t.series) ? t.series : t.series ? [t.series] : [],
        f =
          1 === p.length && 'radar' === (null == (n = p[0]) ? void 0 : n.type)
            ? p[0]
            : void 0,
        m = Array.isArray(null == f ? void 0 : f.data) ? f.data : void 0,
        $ = h
          .map((t, e) => {
            const n = 'string' == typeof t ? t : t.name,
              i = 'string' == typeof t ? void 0 : t.icon,
              r = 'string' == typeof t ? void 0 : t.marker,
              o = 'string' == typeof t ? void 0 : t
            if (!n) return null
            const l = p.findIndex((t) => (null == t ? void 0 : t.name) === n),
              a = (null == m ? void 0 : m.findIndex((t) => t.name === n)) ?? -1,
              d = l >= 0 ? p[l] : p[e],
              c = m && a >= 0 ? m[a] : ((null == m ? void 0 : m[e]) ?? void 0),
              h = m ? (c ?? o ?? d) : (o ?? d),
              f = c ?? d,
              $ = c ?? d ?? o,
              g = {
                ...((null == f ? void 0 : f.lineStyle) ?? {}),
                ...((null == o ? void 0 : o.lineStyle) ?? {}),
              },
              y = (function (t, e) {
                const n = (null == t ? void 0 : t.lineStyle) ?? {},
                  i = (null == t ? void 0 : t.itemStyle) ?? {}
                return (
                  ('string' == typeof n.color ? n.color : void 0) ??
                  ('string' == typeof i.color ? i.color : void 0) ??
                  e
                )
              })(h, u[l >= 0 ? l : e] ?? '#2f6f8f'),
              x =
                'number' == typeof g.width && Number.isFinite(g.width)
                  ? Math.max(1, g.width)
                  : 2,
              v = null == $ ? void 0 : $.symbolSize,
              b =
                'number' == typeof v && Number.isFinite(v)
                  ? Math.max(3, v)
                  : void 0
            return {
              name: n,
              icon: i ?? s.icon,
              marker: r,
              markerSize: b,
              color: y,
              lineWidth: x,
            }
          })
          .filter((t) => null !== t)
      if (0 === $.length) return null
      const g = document.createElement('div')
      ;((g.className = 'pptx-chart-custom-legend'),
        (g.style.position = 'absolute'),
        (g.style.display = 'flex'),
        (g.style.flexDirection = a ? 'column' : 'row'),
        (g.style.gap = a ? '6px' : '12px'),
        (g.style.pointerEvents = 'none'),
        (g.style.zIndex = '1'),
        (g.style.whiteSpace = 'nowrap'),
        void 0 !== s.left && (g.style.left = Ld(s.left, e.w)),
        void 0 !== s.right && (g.style.right = Ld(s.right, e.w)),
        void 0 !== s.width && (g.style.width = Ld(s.width, e.w)),
        void 0 !== s.height && (g.style.height = Ld(s.height, e.h)),
        (void 0 !== s.width || void 0 !== s.height) &&
          ((g.style.boxSizing = 'border-box'),
          d
            ? ((g.style.alignItems = 'center'),
              void 0 !== s.width && (g.style.justifyContent = 'center'))
            : (void 0 !== s.width && (g.style.alignItems = 'center'),
              void 0 !== s.height && (g.style.justifyContent = 'center'))),
        'vertical' !== s.orient || (void 0 === s.left && void 0 === s.right)
          ? void 0 !== s.top && (g.style.top = Ld(s.top, e.h))
          : 'middle' === s.top
            ? ((g.style.top = e.h / 2 + 'px'),
              (g.style.transform = 'translateY(-50%)'))
            : void 0 !== s.top
              ? (g.style.top = Ld(s.top, e.h))
              : void 0 === s.bottom &&
                ((g.style.top = e.h / 2 + 'px'),
                (g.style.transform = 'translateY(-50%)')),
        void 0 !== s.bottom && (g.style.bottom = Ld(s.bottom, e.h)),
        d &&
          void 0 === s.left &&
          void 0 === s.right &&
          ((g.style.left = '50%'), (g.style.transform = 'translateX(-50%)')))
      const y = (null == (i = s.textStyle) ? void 0 : i.fontSize) ?? 10,
        x = s.itemWidth ?? y,
        v = s.itemHeight ?? y
      for (const b of $) {
        const t = document.createElement('div')
        ;((t.style.display = 'flex'),
          (t.style.alignItems = 'center'),
          (t.style.gap = '6px'))
        const e = b.marker && 'none' !== b.marker ? b.markerSize : void 0,
          n = void 0 !== e ? Math.max(x, Math.ceil(e)) : x,
          i = void 0 !== e ? Math.max(v, Math.ceil(e)) : v,
          a = Ad(b.icon, b.color, n, i, b.lineWidth, b.marker, e)
        a && t.appendChild(a)
        const d = document.createElement('span')
        ;((d.textContent = b.name),
          (d.style.color =
            (null == (r = s.textStyle) ? void 0 : r.color) ?? '#000000'),
          (d.style.fontSize = `${y}px`),
          null != (o = s.textStyle) &&
            o.fontFamily &&
            (d.style.fontFamily = s.textStyle.fontFamily),
          void 0 !== (null == (l = s.textStyle) ? void 0 : l.fontWeight) &&
            (d.style.fontWeight = String(s.textStyle.fontWeight)),
          t.appendChild(d),
          g.appendChild(t))
      }
      return g
    })(c, t.size),
    f = cd(c.legend)
  if ((p && f && ((f.show = !1), o.appendChild(p)), u)) {
    const t = u.seriesArr.map((t) => t.colorHex).filter(Boolean),
      e = (function (t, e) {
        var n, i
        const r = document.createElement('table')
        ;((r.style.width = '100%'),
          (r.style.borderCollapse = 'collapse'),
          (r.style.fontSize = '10px'),
          (r.style.marginTop = '8px'))
        const { seriesArr: o, showKeys: l, formatCode: s } = t,
          a =
            (null == (n = o.find((t) => t.categories.length > 0))
              ? void 0
              : n.categories) || [],
          d = s,
          c = document.createElement('thead'),
          u = document.createElement('tr'),
          h = document.createElement('th')
        ;((h.style.border = '1px solid #ccc'),
          (h.style.padding = '2px 6px'),
          (h.style.textAlign = 'left'),
          (h.style.fontWeight = 'bold'),
          u.appendChild(h))
        for (let f = 0; f < a.length; f++) {
          const t = document.createElement('th')
          ;((t.style.border = '1px solid #ccc'),
            (t.style.padding = '2px 6px'),
            (t.style.textAlign = 'right'),
            (t.style.fontWeight = 'bold'),
            (t.textContent = a[f] ?? ''),
            u.appendChild(t))
        }
        ;(c.appendChild(u), r.appendChild(c))
        const p = document.createElement('tbody')
        for (let f = 0; f < o.length; f++) {
          const t = o[f],
            n = document.createElement('tr'),
            r = document.createElement('td')
          if (
            ((r.style.border = '1px solid #ccc'),
            (r.style.padding = '2px 6px'),
            (r.style.textAlign = 'left'),
            (r.style.fontWeight = 'bold'),
            l && e && e[f])
          ) {
            const t = document.createElement('span')
            ;((t.style.display = 'inline-block'),
              (t.style.width = '8px'),
              (t.style.height = '8px'),
              (t.style.marginRight = '4px'),
              (t.style.verticalAlign = 'middle'),
              (t.style.backgroundColor = e[f]),
              r.appendChild(t))
          }
          ;(r.appendChild(document.createTextNode(t.name || '')),
            n.appendChild(r))
          for (let e = 0; e < a.length; e++) {
            const r = document.createElement('td')
            ;((r.style.border = '1px solid #ccc'),
              (r.style.padding = '2px 6px'),
              (r.style.textAlign = 'right'))
            const o = t.values[e]
            ;((r.textContent =
              void 0 === o || (null != (i = t.blankIndices) && i.has(e))
                ? ''
                : Ks(o, d ?? t.formatCode)),
              n.appendChild(r))
          }
          p.appendChild(n)
        }
        return (r.appendChild(p), r)
      })(u, t.length > 0 ? t : void 0)
    o.appendChild(e)
  }
  const m = e.chartInstances,
    $ = new Promise((t) => {
      var n, i
      let r, o
      const l = () => {
          var n
          ;(void 0 !== o && cancelAnimationFrame(o),
            r?.disconnect(),
            null == (n = e.signal) || n.removeEventListener('abort', l),
            t())
        },
        d = () => {
          var n, i
          ;(r?.disconnect(),
            null == (n = e.signal) || n.removeEventListener('abort', l),
            !(null != (i = e.signal) && i.aborted) &&
              s.isConnected &&
              (function (t, e, n, i) {
                try {
                  const r = a(t)
                  ;(r.setOption(e), n?.add(r))
                  const o = () => {
                    ;(l?.disconnect(),
                      r.isDisposed() || r.dispose(),
                      n?.delete(r),
                      i?.removeEventListener('abort', o))
                  }
                  i?.addEventListener('abort', o, { once: !0 })
                  const l =
                    typeof ResizeObserver > 'u'
                      ? void 0
                      : new ResizeObserver(() => {
                          ;(null != i && i.aborted) || r.isDisposed()
                            ? o()
                            : t.isConnected
                              ? r.resize()
                              : o()
                        })
                  l?.observe(t)
                } catch (s) {
                  ;((t.style.display = 'flex'),
                    (t.style.alignItems = 'center'),
                    (t.style.justifyContent = 'center'),
                    (t.style.color = '#999'),
                    (t.style.fontSize = '12px'),
                    (t.textContent = 'Chart render error'))
                }
              })(s, c, m, e.signal),
            t())
        }
      null != (n = e.signal) && n.aborted
        ? t()
        : (null == (i = e.signal) ||
            i.addEventListener('abort', l, { once: !0 }),
          (o = requestAnimationFrame(() => {
            var n
            if (
              ((o = void 0),
              (null == (n = e.signal) || !n.aborted) && s.isConnected)
            )
              return 0 === s.offsetWidth || 0 === s.offsetHeight
                ? typeof ResizeObserver > 'u'
                  ? void d()
                  : ((r = new ResizeObserver((t) => {
                      var n, i
                      if (
                        (null != (n = e.signal) && n.aborted) ||
                        !s.isConnected
                      )
                        return void l()
                      const { width: r, height: o } = (null == (i = t[0])
                        ? void 0
                        : i.contentRect) ?? { width: 0, height: 0 }
                      r > 0 && o > 0 && d()
                    })),
                    r.observe(s),
                    void t())
                : void d()
            l()
          })))
    })
  return (null == (r = e.asyncTasks) || r.push($), o)
}
var Fc = class t {
    constructor(t, e) {
      ;(w(this, 'buf'),
        w(this, 'size'),
        w(this, 'reserved'),
        w(this, 'pos'),
        w(this, 'bitPos'),
        t
          ? ((this.buf = t), (this.size = e), (this.reserved = t.length))
          : ((this.buf = new Uint8Array(0)),
            (this.size = 0),
            (this.reserved = 0)),
        (this.pos = 0),
        (this.bitPos = 0))
    }
    static fromExisting(e, n, i) {
      const r = new t(null, 0)
      return ((r.buf = e), (r.size = n), (r.reserved = i), r)
    }
    reserve(t) {
      if (this.reserved >= t) return
      const e = new Uint8Array(t)
      ;(e.set(this.buf.subarray(0, this.size)),
        (this.buf = e),
        (this.reserved = t))
    }
    ensureWrite(t) {
      const e = this.pos + t
      ;(e > this.reserved &&
        this.reserve(Math.max(e, 2 * this.reserved || 256)),
        e > this.size && (this.size = e))
    }
    ensureRead(t) {
      if (this.pos + t > this.size)
        throw new Error(
          `Stream: not enough data (need ${t} bytes at pos ${this.pos}, size ${this.size})`,
        )
    }
    seekAbsolute(t) {
      if (t > this.size)
        throw new Error(`Stream: seek past end (${t} > ${this.size})`)
      ;((this.pos = t), (this.bitPos = 0))
    }
    seekRelative(t) {
      const e = this.pos + t
      if (e < 0) throw new Error('Stream: negative seek')
      if (e > this.size) throw new Error('Stream: seek past end')
      ;((this.pos = e), (this.bitPos = 0))
    }
    seekAbsoluteThroughReserve(t) {
      ;(t > this.reserved && this.reserve(t),
        t > this.size && (this.size = t),
        (this.pos = t),
        (this.bitPos = 0))
    }
    seekRelativeThroughReserve(t) {
      this.seekAbsoluteThroughReserve(this.pos + t)
    }
    readU8() {
      return (this.ensureRead(1), this.buf[this.pos++])
    }
    peekU8() {
      return (this.ensureRead(1), this.buf[this.pos])
    }
    readU16() {
      this.ensureRead(2)
      const t = (this.buf[this.pos] << 8) | this.buf[this.pos + 1]
      return ((this.pos += 2), t)
    }
    readU24() {
      this.ensureRead(3)
      const t =
        (this.buf[this.pos] << 16) |
        (this.buf[this.pos + 1] << 8) |
        this.buf[this.pos + 2]
      return ((this.pos += 3), t)
    }
    readU32() {
      this.ensureRead(4)
      const t =
        ((this.buf[this.pos] << 24) |
          (this.buf[this.pos + 1] << 16) |
          (this.buf[this.pos + 2] << 8) |
          this.buf[this.pos + 3]) >>>
        0
      return ((this.pos += 4), t)
    }
    readS16() {
      const t = this.readU16()
      return t >= 32768 ? t - 65536 : t
    }
    readS8() {
      const t = this.readU8()
      return t >= 128 ? t - 256 : t
    }
    readChar() {
      return String.fromCharCode(this.readU8())
    }
    writeU8(t) {
      ;(this.ensureWrite(1), (this.buf[this.pos++] = 255 & t))
    }
    writeU16(t) {
      ;(this.ensureWrite(2),
        (this.buf[this.pos++] = (t >> 8) & 255),
        (this.buf[this.pos++] = 255 & t))
    }
    writeU24(t) {
      ;(this.ensureWrite(3),
        (this.buf[this.pos++] = (t >> 16) & 255),
        (this.buf[this.pos++] = (t >> 8) & 255),
        (this.buf[this.pos++] = 255 & t))
    }
    writeU32(t) {
      ;(this.ensureWrite(4),
        (this.buf[this.pos++] = (t >>> 24) & 255),
        (this.buf[this.pos++] = (t >> 16) & 255),
        (this.buf[this.pos++] = (t >> 8) & 255),
        (this.buf[this.pos++] = 255 & t))
    }
    writeS16(t) {
      this.writeU16(t < 0 ? t + 65536 : t)
    }
    writeS8(t) {
      this.writeU8(t < 0 ? t + 256 : t)
    }
    readNBits(t) {
      if (0 === t) return 0
      let e = 0,
        n = t
      for (; n > 0;) {
        if (this.pos >= this.size && 0 === this.bitPos)
          throw new Error('Stream: not enough data for bit read')
        const t = 8 - this.bitPos,
          i = Math.min(n, t),
          r = t - i,
          o = ((1 << i) - 1) << r
        ;((e = (e << i) | ((this.buf[this.pos] & o) >> r)),
          (this.bitPos += i),
          this.bitPos >= 8 && ((this.bitPos = 0), this.pos++),
          (n -= i))
      }
      return e
    }
    copyTo(t, e) {
      if (this.pos + e > this.size)
        throw new Error('Stream: not enough data for copy')
      ;(t.ensureWrite(e),
        t.buf.set(this.buf.subarray(this.pos, this.pos + e), t.pos),
        (this.pos += e),
        (t.pos += e))
    }
    readRestAsU32() {
      if (this.pos + 4 > this.size) {
        if (this.pos >= this.size) return null
        let t = 0
        const e = this.size - this.pos
        for (let n = 0; n < 4; n++)
          ((t <<= 8), n < e && (t |= this.buf[this.pos + n]))
        return ((this.pos = this.size), t >>> 0)
      }
      return this.readU32()
    }
    checksumU32(t, e) {
      let n = 0
      const i = this.pos
      for (this.pos = t; this.pos < e;) {
        const t = this.readRestAsU32()
        if (null === t) break
        n = (n + t) >>> 0
      }
      return ((this.pos = i), n)
    }
    toUint8Array() {
      return this.buf.slice(0, this.size)
    }
  },
  Bc = [
    {
      byteCount: 2,
      xBits: 0,
      yBits: 8,
      deltaX: 0,
      deltaY: 0,
      xSign: 0,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 0,
      yBits: 8,
      deltaX: 0,
      deltaY: 0,
      xSign: 0,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 0,
      yBits: 8,
      deltaX: 0,
      deltaY: 256,
      xSign: 0,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 0,
      yBits: 8,
      deltaX: 0,
      deltaY: 256,
      xSign: 0,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 0,
      yBits: 8,
      deltaX: 0,
      deltaY: 512,
      xSign: 0,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 0,
      yBits: 8,
      deltaX: 0,
      deltaY: 512,
      xSign: 0,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 0,
      yBits: 8,
      deltaX: 0,
      deltaY: 768,
      xSign: 0,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 0,
      yBits: 8,
      deltaX: 0,
      deltaY: 768,
      xSign: 0,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 0,
      yBits: 8,
      deltaX: 0,
      deltaY: 1024,
      xSign: 0,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 0,
      yBits: 8,
      deltaX: 0,
      deltaY: 1024,
      xSign: 0,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 8,
      yBits: 0,
      deltaX: 0,
      deltaY: 0,
      xSign: -1,
      ySign: 0,
    },
    {
      byteCount: 2,
      xBits: 8,
      yBits: 0,
      deltaX: 0,
      deltaY: 0,
      xSign: 1,
      ySign: 0,
    },
    {
      byteCount: 2,
      xBits: 8,
      yBits: 0,
      deltaX: 256,
      deltaY: 0,
      xSign: -1,
      ySign: 0,
    },
    {
      byteCount: 2,
      xBits: 8,
      yBits: 0,
      deltaX: 256,
      deltaY: 0,
      xSign: 1,
      ySign: 0,
    },
    {
      byteCount: 2,
      xBits: 8,
      yBits: 0,
      deltaX: 512,
      deltaY: 0,
      xSign: -1,
      ySign: 0,
    },
    {
      byteCount: 2,
      xBits: 8,
      yBits: 0,
      deltaX: 512,
      deltaY: 0,
      xSign: 1,
      ySign: 0,
    },
    {
      byteCount: 2,
      xBits: 8,
      yBits: 0,
      deltaX: 768,
      deltaY: 0,
      xSign: -1,
      ySign: 0,
    },
    {
      byteCount: 2,
      xBits: 8,
      yBits: 0,
      deltaX: 768,
      deltaY: 0,
      xSign: 1,
      ySign: 0,
    },
    {
      byteCount: 2,
      xBits: 8,
      yBits: 0,
      deltaX: 1024,
      deltaY: 0,
      xSign: -1,
      ySign: 0,
    },
    {
      byteCount: 2,
      xBits: 8,
      yBits: 0,
      deltaX: 1024,
      deltaY: 0,
      xSign: 1,
      ySign: 0,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 1,
      deltaY: 1,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 1,
      deltaY: 1,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 1,
      deltaY: 1,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 1,
      deltaY: 1,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 1,
      deltaY: 17,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 1,
      deltaY: 17,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 1,
      deltaY: 17,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 1,
      deltaY: 17,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 1,
      deltaY: 33,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 1,
      deltaY: 33,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 1,
      deltaY: 33,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 1,
      deltaY: 33,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 1,
      deltaY: 49,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 1,
      deltaY: 49,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 1,
      deltaY: 49,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 1,
      deltaY: 49,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 17,
      deltaY: 1,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 17,
      deltaY: 1,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 17,
      deltaY: 1,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 17,
      deltaY: 1,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 17,
      deltaY: 17,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 17,
      deltaY: 17,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 17,
      deltaY: 17,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 17,
      deltaY: 17,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 17,
      deltaY: 33,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 17,
      deltaY: 33,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 17,
      deltaY: 33,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 17,
      deltaY: 33,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 17,
      deltaY: 49,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 17,
      deltaY: 49,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 17,
      deltaY: 49,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 17,
      deltaY: 49,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 33,
      deltaY: 1,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 33,
      deltaY: 1,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 33,
      deltaY: 1,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 33,
      deltaY: 1,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 33,
      deltaY: 17,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 33,
      deltaY: 17,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 33,
      deltaY: 17,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 33,
      deltaY: 17,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 33,
      deltaY: 33,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 33,
      deltaY: 33,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 33,
      deltaY: 33,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 33,
      deltaY: 33,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 33,
      deltaY: 49,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 33,
      deltaY: 49,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 33,
      deltaY: 49,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 33,
      deltaY: 49,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 49,
      deltaY: 1,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 49,
      deltaY: 1,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 49,
      deltaY: 1,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 49,
      deltaY: 1,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 49,
      deltaY: 17,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 49,
      deltaY: 17,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 49,
      deltaY: 17,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 49,
      deltaY: 17,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 49,
      deltaY: 33,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 49,
      deltaY: 33,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 49,
      deltaY: 33,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 49,
      deltaY: 33,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 49,
      deltaY: 49,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 49,
      deltaY: 49,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 49,
      deltaY: 49,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 2,
      xBits: 4,
      yBits: 4,
      deltaX: 49,
      deltaY: 49,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 1,
      deltaY: 1,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 1,
      deltaY: 1,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 1,
      deltaY: 1,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 1,
      deltaY: 1,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 1,
      deltaY: 257,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 1,
      deltaY: 257,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 1,
      deltaY: 257,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 1,
      deltaY: 257,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 1,
      deltaY: 513,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 1,
      deltaY: 513,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 1,
      deltaY: 513,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 1,
      deltaY: 513,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 257,
      deltaY: 1,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 257,
      deltaY: 1,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 257,
      deltaY: 1,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 257,
      deltaY: 1,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 257,
      deltaY: 257,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 257,
      deltaY: 257,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 257,
      deltaY: 257,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 257,
      deltaY: 257,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 257,
      deltaY: 513,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 257,
      deltaY: 513,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 257,
      deltaY: 513,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 257,
      deltaY: 513,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 513,
      deltaY: 1,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 513,
      deltaY: 1,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 513,
      deltaY: 1,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 513,
      deltaY: 1,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 513,
      deltaY: 257,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 513,
      deltaY: 257,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 513,
      deltaY: 257,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 513,
      deltaY: 257,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 513,
      deltaY: 513,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 513,
      deltaY: 513,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 513,
      deltaY: 513,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 3,
      xBits: 8,
      yBits: 8,
      deltaX: 513,
      deltaY: 513,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 4,
      xBits: 12,
      yBits: 12,
      deltaX: 0,
      deltaY: 0,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 4,
      xBits: 12,
      yBits: 12,
      deltaX: 0,
      deltaY: 0,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 4,
      xBits: 12,
      yBits: 12,
      deltaX: 0,
      deltaY: 0,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 4,
      xBits: 12,
      yBits: 12,
      deltaX: 0,
      deltaY: 0,
      xSign: 1,
      ySign: 1,
    },
    {
      byteCount: 5,
      xBits: 16,
      yBits: 16,
      deltaX: 0,
      deltaY: 0,
      xSign: -1,
      ySign: -1,
    },
    {
      byteCount: 5,
      xBits: 16,
      yBits: 16,
      deltaX: 0,
      deltaY: 0,
      xSign: 1,
      ySign: -1,
    },
    {
      byteCount: 5,
      xBits: 16,
      yBits: 16,
      deltaX: 0,
      deltaY: 0,
      xSign: -1,
      ySign: 1,
    },
    {
      byteCount: 5,
      xBits: 16,
      yBits: 16,
      deltaX: 0,
      deltaY: 0,
      xSign: 1,
      ySign: 1,
    },
  ],
  jc = -32768
function Ec(t) {
  return (t &= 65535) >= 32768 ? t - 65536 : t
}
function Pc(t) {
  const e = t.readU8()
  return 253 === e
    ? t.readU16()
    : 255 === e
      ? 253 + t.readU8()
      : 254 === e
        ? 506 + t.readU8()
        : e
}
function Tc(t) {
  let e,
    n = 1,
    i = t.readU8()
  return 253 === i
    ? t.readS16()
    : (250 === i && ((n = -1), (i = t.readU8())),
      (e = 255 === i ? 250 + t.readU8() : 254 === i ? 500 + t.readU8() : i),
      e * n)
}
function zc(t, e) {
  e.seekAbsolute(t.offset)
  const n = e.readU16(),
    i = n >>> 1,
    r = new Fc(null, 0)
  r.reserve(n)
  let o = 0
  for (let l = 0; l < i; l++) {
    const t = e.readU8()
    let n
    ;((n =
      t >= 248
        ? 238 * (t - 247) + e.readU8()
        : t >= 239
          ? -(238 * (t - 239) + e.readU8())
          : 238 === t
            ? e.readS16()
            : t),
      (o = Ec(o + n)),
      r.writeS16(o))
  }
  ;((t.buf = r.toUint8Array()), (t.bufSize = t.buf.length))
}
function Nc(t, e, n) {
  if (0 === n) return
  const i = []
  let r = n,
    o = !1
  const l = []
  function s() {
    if (0 === l.length) return
    const t = l.length
    if (o) {
      t < 8 ? e.writeU8(t - 1 + 184) : (e.writeU8(65), e.writeU8(t))
      for (const t of l) e.writeS16(t)
    } else {
      t < 8 ? e.writeU8(t - 1 + 176) : (e.writeU8(64), e.writeU8(t))
      for (const t of l) e.writeU8(255 & t)
    }
    l.length = 0
  }
  function a(t) {
    i.push(t)
    const e = t < 0 || t > 255
    ;(l.length > 0 && e !== o && s(),
      0 === l.length && (o = e),
      l.push(t),
      l.length >= 255 && s())
  }
  for (; r > 0;) {
    const e = t.peekU8()
    if (251 === e && r >= 3 && i.length >= 2) {
      t.readU8()
      const e = i[i.length - 2]
      ;(a(e), a(Tc(t)), a(e), (r -= 3))
    } else if (252 === e && r >= 5 && i.length >= 2) {
      t.readU8()
      const e = i[i.length - 2]
      ;(a(e), a(Tc(t)), a(e), a(Tc(t)), a(e), (r -= 5))
    } else (a(Tc(t)), (r -= 1))
  }
  s()
}
function Rc(t, e, n, i) {
  let r = 0
  return (
    n && (r |= 1),
    i || 0 !== t
      ? t > -256 && t < 0
        ? (r |= 2)
        : t >= 0 && t < 256 && (r |= 18)
      : (r |= 16),
    i || 0 !== e
      ? e > -256 && e < 0
        ? (r |= 4)
        : e >= 0 && e < 256 && (r |= 36)
      : (r |= 32),
    r
  )
}
function Ic(t, e, n, i, r, o, l, s) {
  if (0 === t) return
  const a = e[0]
  n.writeS16(t)
  const d = n.pos
  i
    ? ((r = 32767),
      (o = 32767),
      (l = jc),
      (s = jc),
      n.writeS16(0),
      n.writeS16(0),
      n.writeS16(0),
      n.writeS16(0))
    : (n.writeS16(r), n.writeS16(o), n.writeS16(l), n.writeS16(s))
  let c = 0
  for (let M = 0; M < t; M++) {
    0 === M && (c = 1)
    ;((c += Pc(a)), n.writeU16(c - 1))
  }
  const u = new Uint8Array(c)
  for (let M = 0; M < c; M++) u[M] = a.readU8()
  const h = new Int16Array(c),
    p = new Int16Array(c),
    f = new Uint8Array(c)
  let m = 0,
    $ = 0
  for (let M = 0; M < c; M++) {
    const t = u[M]
    f[M] = 128 & t ? 0 : 1
    const e = Bc[127 & t]
    let n = a.readNBits(e.xBits) + e.deltaX,
      d = a.readNBits(e.yBits) + e.deltaY
    ;(0 !== e.xSign && (n *= e.xSign),
      0 !== e.ySign && (d *= e.ySign),
      (h[M] = n),
      (p[M] = d),
      (m += n),
      ($ += d),
      i &&
        (m < r && (r = m),
        m > l && (l = m),
        $ < o && (o = $),
        $ > s && (s = $)))
  }
  const g = n.pos
  n.writeU16(0)
  const y = Pc(a)
  Nc(e[1], n, y)
  const x = Pc(a)
  x > 0 && e[2].copyTo(n, x)
  const v = n.pos - (g + 2),
    b = n.pos
  ;(n.seekAbsolute(g), n.writeU16(v), n.seekAbsolute(b))
  for (let M = 0; M < c; M++) {
    const t = Rc(h[M], p[M], 0 !== f[M], 0 === M)
    n.writeU8(t)
  }
  for (let M = 0; M < c; M++) {
    const t = h[M]
    if (0 === M || 0 !== t) {
      const e = Math.abs(t)
      e < 256 ? n.writeU8(e) : n.writeS16(t)
    }
  }
  for (let M = 0; M < c; M++) {
    const t = p[M]
    if (0 === M || 0 !== t) {
      const e = Math.abs(t)
      e < 256 ? n.writeU8(e) : n.writeS16(t)
    }
  }
  if (i) {
    const t = n.pos
    ;(n.seekAbsolute(d),
      n.writeS16(r),
      n.writeS16(o),
      n.writeS16(l),
      n.writeS16(s),
      n.seekAbsolute(t))
  }
}
function Dc(t, e) {
  const n = t[0].readS16()
  n < 0
    ? (function (t, e) {
        const n = t[0]
        ;(e.writeS16(-1),
          e.writeS16(n.readS16()),
          e.writeS16(n.readS16()),
          e.writeS16(n.readS16()),
          e.writeS16(n.readS16()))
        let i = 0
        do {
          i = n.readU16()
          const t = n.readU16()
          let r
          ;(e.writeU16(i), e.writeU16(t), (r = 1 & i ? 4 : 2), n.copyTo(e, r))
          let o = 0
          ;(128 & i ? (o = 8) : 64 & i ? (o = 4) : 8 & i && (o = 2),
            o > 0 && n.copyTo(e, o))
        } while (32 & i)
        if (256 & i) {
          const i = e.pos
          e.writeU16(0)
          const r = Pc(n)
          Nc(t[1], e, r)
          const o = Pc(n)
          o > 0 && t[2].copyTo(e, o)
          const l = e.pos - (i + 2),
            s = e.pos
          ;(e.seekAbsolute(i), e.writeU16(l), e.seekAbsolute(s))
        }
      })(t, e)
    : 32767 === n
      ? Ic(
          t[0].readS16(),
          t,
          e,
          !1,
          t[0].readS16(),
          t[0].readS16(),
          t[0].readS16(),
          t[0].readS16(),
        )
      : Ic(n, t, e, !0, 0, 0, 0, 0)
}
function Oc(t) {
  const e = t[0]
  e.readU32()
  const n = e.readU16()
  ;(e.readU16(), e.readU16(), e.readU16())
  const i = []
  let r = -1,
    o = -1,
    l = -1,
    s = -1
  for (let c = 0; c < n; c++) {
    const t = e.readChar() + e.readChar() + e.readChar() + e.readChar()
    if ('hdmx' === t || 'VDMX' === t) {
      e.seekRelative(12)
      continue
    }
    e.seekRelative(4)
    const n = {
        tag: t,
        offset: e.readU32(),
        bufSize: e.readU32(),
        buf: new Uint8Array(0),
        checksum: 0,
      },
      a = i.length
    ;(i.push(n),
      'glyf' === t
        ? (r = a)
        : 'loca' === t
          ? (o = a)
          : 'maxp' === t
            ? (l = a)
            : 'head' === t && (s = a))
  }
  for (let c = 0; c < i.length; c++) {
    const t = i[c]
    if ('glyf' === t.tag || 'loca' === t.tag) continue
    if ('cvt ' === t.tag) {
      zc(t, e)
      continue
    }
    e.seekAbsolute(t.offset)
    const n = new Uint8Array(t.bufSize)
    for (let i = 0; i < t.bufSize; i++) n[i] = e.readU8()
    ;((t.buf = n),
      'head' === t.tag &&
        ((t.buf[8] = 0), (t.buf[9] = 0), (t.buf[10] = 0), (t.buf[11] = 0)))
  }
  let a = { indexToLocFormat: 0 }
  s >= 0 &&
    (a = (function (t) {
      const e = new Fc(t.buf, t.bufSize)
      return (e.seekAbsolute(50), { indexToLocFormat: e.readS16() })
    })(i[s]))
  let d = {
    numGlyphs: 0,
    maxPoints: 0,
    maxContours: 0,
    maxSizeOfInstructions: 0,
    maxComponentElements: 0,
  }
  if (
    (l >= 0 &&
      (d = (function (t) {
        const e = new Fc(t.buf, t.bufSize),
          n = e.readU32(),
          i = e.readU16()
        let r = 0,
          o = 0,
          l = 0,
          s = 0
        return (
          65536 === n &&
            ((r = e.readU16()),
            (o = e.readU16()),
            e.readU16(),
            e.readU16(),
            e.readU16(),
            e.readU16(),
            e.readU16(),
            e.readU16(),
            e.readU16(),
            e.readU16(),
            (l = e.readU16()),
            (s = e.readU16())),
          {
            numGlyphs: i,
            maxPoints: r,
            maxContours: o,
            maxSizeOfInstructions: l,
            maxComponentElements: s,
          }
        )
      })(i[l])),
    r >= 0)
  ) {
    if (o < 0) {
      const t = {
        tag: 'loca',
        offset: 0,
        bufSize: 0,
        buf: new Uint8Array(0),
        checksum: 0,
      }
      ;((o = i.length), i.push(t))
    }
    !(function (t, e, n, i, r) {
      const o = i.numGlyphs
      ;(r[0].seekAbsolute(t.offset), r[1].seekAbsolute(0), r[2].seekAbsolute(0))
      const l =
          10 +
          2 * i.maxContours +
          2 +
          i.maxSizeOfInstructions +
          256 +
          5 * i.maxPoints +
          4 * i.maxComponentElements * 6 +
          256,
        s = new Fc(null, 0)
      s.reserve(256 * o)
      const a = 0 === n.indexToLocFormat,
        d = a ? 2 : 4,
        c = new Fc(null, 0)
      ;(c.reserve((o + 1) * d), a ? c.writeU16(0) : c.writeU32(0))
      for (let u = 0; u < o; u++)
        (s.pos,
          s.reserve(s.pos + l),
          Dc(r, s),
          1 & s.pos && s.writeU8(0),
          a ? c.writeU16(s.pos >>> 1) : c.writeU32(s.pos))
      ;((t.buf = s.toUint8Array()),
        (t.bufSize = t.buf.length),
        (e.buf = c.toUint8Array()),
        (e.bufSize = e.buf.length))
    })(i[r], i[o], a, d, t)
  }
  return { tables: i }
}
function Uc(t) {
  return t <= 0 ? 0 : 32 - Math.clz32(t)
}
var Zc,
  Gc =
    ((Zc = class {
      constructor(t, e) {
        ;(w(this, 'bio'),
          w(this, 'range'),
          w(this, 'tree'),
          w(this, 'symbolIndex'),
          w(this, 'bitCount'),
          w(this, 'bitCount2'),
          (this.bio = t),
          (this.range = e),
          (this.bitCount = Uc(e - 1)),
          (this.bitCount2 = 0),
          e > 256 && e < 512 && (this.bitCount2 = Uc(e - 256 - 1) + 1))
        const n = 2 * e
        this.tree = Array.from({ length: n })
        for (let i = 0; i < n; i++)
          this.tree[i] = { up: 0, left: 0, right: 0, code: -1, weight: 0 }
        for (let i = 2; i < n; i++)
          ((this.tree[i].up = i >> 1), (this.tree[i].weight = 1))
        for (let i = 1; i < e; i++)
          ((this.tree[i].left = 2 * i),
            (this.tree[i].right = 2 * i + 1),
            (this.tree[i].code = -1))
        for (let i = 0; i < e; i++) {
          const t = e + i
          ;((this.tree[t].code = i),
            (this.tree[t].left = -1),
            (this.tree[t].right = -1))
        }
        this.symbolIndex = Array.from({ length: e })
        for (let i = 0; i < e; i++) this.symbolIndex[i] = e + i
        if ((this.initWeight(Zc.ROOT), 0 !== this.bitCount2)) {
          ;(this.updateWeight(this.symbolIndex[256]),
            this.updateWeight(this.symbolIndex[257]))
          const t = e - 3
          for (let e = 0; e < 12; e++) this.updateWeight(this.symbolIndex[t])
          const n = e - 2
          for (let e = 0; e < 6; e++) this.updateWeight(this.symbolIndex[n])
        } else
          for (let i = 0; i < 2; i++)
            for (let t = 0; t < e; t++) this.updateWeight(this.symbolIndex[t])
      }
      readSymbol() {
        let t,
          e = Zc.ROOT
        do {
          ;((e = this.bio.inputBit() ? this.tree[e].right : this.tree[e].left),
            (t = this.tree[e].code))
        } while (t < 0)
        return (this.updateWeight(e), t)
      }
      updateWeight(t) {
        const e = this.tree
        for (; t !== Zc.ROOT; t = e[t].up) {
          const n = e[t].weight
          let i = t - 1
          if (e[i].weight === n) {
            do {
              i--
            } while (e[i].weight === n)
            ;(i++, i > Zc.ROOT && (this.swapNodes(t, i), (t = i)))
          }
          e[t].weight = n + 1
        }
        e[Zc.ROOT].weight++
      }
      swapNodes(t, e) {
        const n = this.tree,
          i = n[t].up,
          r = n[e].up,
          o = n[t]
        ;((n[t] = n[e]), (n[e] = o), (n[t].up = i), (n[e].up = r))
        let l = n[t].code
        ;(l < 0
          ? ((n[n[t].left].up = t), (n[n[t].right].up = t))
          : (this.symbolIndex[l] = t),
          (l = n[e].code),
          l < 0
            ? ((n[n[e].left].up = e), (n[n[e].right].up = e))
            : (this.symbolIndex[l] = e))
      }
      initWeight(t) {
        const e = this.tree[t]
        return (
          e.code >= 0 ||
            (e.weight = this.initWeight(e.left) + this.initWeight(e.right)),
          e.weight
        )
      }
    }),
    w(Zc, 'ROOT', 1),
    Zc),
  Xc = class {
    constructor(t, e = 0, n) {
      ;(w(this, 'data'),
        w(this, 'index'),
        w(this, 'size'),
        w(this, 'bitBuffer', 0),
        w(this, 'bitCount', 0),
        (this.data = t),
        (this.index = e),
        (this.size = n ?? t.length))
    }
    inputBit() {
      if (0 === this.bitCount--) {
        if (this.index >= this.size) throw new Error('BitIO: end of data')
        ;((this.bitBuffer = this.data[this.index++]), (this.bitCount = 7))
      }
      return ((this.bitBuffer <<= 1), !!(256 & this.bitBuffer))
    }
    readValue(t) {
      let e = 0
      for (let n = t - 1; n >= 0; n--) ((e <<= 1), this.inputBit() && (e |= 1))
      return e
    }
  },
  Yc = 7168,
  Wc = 4194304,
  Hc = 16777216
function Vc(t, e, n) {
  let i,
    r = !0,
    o = 0,
    l = 0
  do {
    if (++l > 16) throw new Error('LZCOMP decodeLength: iteration cap exceeded')
    let s
    ;(r
      ? ((s = e - 256), (r = !1), (n[0] = Math.floor(s / 8) + 1), (s %= 8))
      : (s = t.readSymbol()),
      (i = !(4 & s)),
      (s &= -5),
      (o <<= 2),
      (o |= s))
  } while (!i)
  return ((o += 2), o)
}
function qc(t, e) {
  let n = 0
  for (let i = e; i > 0; i--) {
    ;((n <<= 3), (n |= t.readSymbol()))
  }
  return ((n += 1), n)
}
function _c(t, e, n) {
  const i = new Xc(t, 0, e)
  let r
  r = 1 !== n && i.inputBit()
  const o = new Gc(i, 8),
    l = new Gc(i, 8),
    s = i.readValue(24)
  if (s > Wc) throw new Error(`LZCOMP outLen ${s} exceeds maximum (${Wc})`)
  const {
      DUP2: a,
      DUP4: d,
      DUP6: c,
      NUM_SYMS: u,
    } = (function (t) {
      let e = 1,
        n = (1 << (3 * e)) - 1 + 1
      for (; n < t;) {
        if ((e++, e > 8))
          throw new Error(
            'LZCOMP setDistRange: numDistRanges exceeds bound (8)',
          )
        n = (1 << (3 * e)) - 1 + 1
      }
      const i = 256 + 8 * e,
        r = i + 1,
        o = r + 1
      return {
        numDistRanges: e,
        distMax: n,
        DUP2: i,
        DUP4: r,
        DUP6: o,
        NUM_SYMS: o + 1,
      }
    })(s),
    h = new Gc(i, u),
    p = new Uint8Array(Yc + s)
  !(function (t) {
    let e = 0
    for (let i = 0; i < 32; i++)
      for (let n = 0; n < 96; n++) ((t[e++] = i), (t[e++] = n))
    let n = 0
    for (; e < Yc && n < 256;)
      ((t[e++] = n), (t[e++] = n), (t[e++] = n), (t[e++] = n), n++)
  })(p)
  const f = Yc
  let m = s,
    $ = new Uint8Array(m),
    g = 0,
    y = 0,
    x = 0,
    v = 0
  const b = (t) => {
    if (r)
      switch (y) {
        case 0:
          ;((x = t), (y = 1))
          break
        case 1:
          if (t === x) y = 2
          else {
            if (g >= m) {
              if (((m += m >>> 1), m > Hc))
                throw new Error('LZCOMP output exceeds maximum size budget')
              const t = new Uint8Array(m)
              ;(t.set($), ($ = t))
            }
            $[g++] = t
          }
          break
        case 2:
          if (((v = t), 0 === v)) {
            if (g >= m) {
              if (((m += m >>> 1), m > Hc))
                throw new Error('LZCOMP output exceeds maximum size budget')
              const t = new Uint8Array(m)
              ;(t.set($), ($ = t))
            }
            ;(($[g++] = x), (y = 1))
          } else y = 3
          break
        case 3:
          if (g + v > m) {
            if (((m = g + v + (m >>> 1)), m > Hc))
              throw new Error('LZCOMP output exceeds maximum size budget')
            const t = new Uint8Array(m)
            ;(t.set($), ($ = t))
          }
          for (let e = 0; e < v; e++) $[g++] = t
          y = 1
      }
    else {
      if (g >= m) {
        if (((m += m >>> 1), m > Hc))
          throw new Error('LZCOMP output exceeds maximum size budget')
        const t = new Uint8Array(m)
        ;(t.set($), ($ = t))
      }
      $[g++] = t
    }
  }
  for (let M = 0; M < s;) {
    const t = h.readSymbol()
    let e
    if (t < 256) e = t
    else if (t === a) e = p[f + M - 2]
    else if (t === d) e = p[f + M - 4]
    else {
      if (t !== c) {
        const n = [0]
        let i = Vc(l, t, n)
        const r = qc(o, n[0])
        r >= 512 && i++
        const s = f + M - r - i + 1
        for (let t = 0; t < i; t++) ((e = p[s + t]), (p[f + M] = e), M++, b(e))
        continue
      }
      e = p[f + M - 6]
    }
    ;((p[f + M] = e), M++, b(e))
  }
  return $.subarray(0, g)
}
function Qc(t) {
  let e = 0
  for (; t > 1;) ((t = Math.floor(t / 2)), e++)
  return e
}
function Kc(t, e) {
  const n = t.tables.length,
    i =
      16 *
      (function (t) {
        return 1 << Qc(t)
      })(n),
    r = Qc(n),
    o = 16 * n - i
  ;(e.writeU32(65536),
    e.writeU16(n),
    e.writeU16(i),
    e.writeU16(r),
    e.writeU16(o))
}
function Jc(t, e) {
  t.offset = e.pos
  let n = 0
  const i = t.buf,
    r = t.bufSize,
    o = Math.floor(r / 4),
    l = r % 4
  for (let s = 0; s < o; s++) {
    const t = 4 * s,
      r = ((i[t] << 24) | (i[t + 1] << 16) | (i[t + 2] << 8) | i[t + 3]) >>> 0
    ;((n = (n + r) >>> 0), e.writeU32(r))
  }
  if (l > 0) {
    let t = 0
    for (let e = 0; e < l; e++) t |= i[4 * o + e] << (24 - 8 * e)
    ;((t >>>= 0), (n = (n + t) >>> 0), e.writeU32(t))
  }
  t.checksum = n
}
function tu(t) {
  return 16 * t.tables.length
}
function eu(t) {
  const e = (function (t) {
      const e = tu(t)
      let n = 0
      for (const i of t.tables) n += 4 * Math.ceil(i.bufSize / 4)
      return 12 + e + n
    })(t),
    n = new Fc(new Uint8Array(e), 0)
  Kc(t, n)
  const i = n.pos,
    r = tu(t)
  n.pos += r
  let o,
    l = 0
  for (const p of t.tables) (Jc(p, n), (l = (l + p.checksum) >>> 0))
  for (const p of t.tables)
    if ('head' === p.tag) {
      o = p
      break
    }
  const s = n.pos
  ;((n.pos = i),
    (function (t, e) {
      for (const n of t.tables)
        (e.writeU8(n.tag.charCodeAt(0)),
          e.writeU8(n.tag.charCodeAt(1)),
          e.writeU8(n.tag.charCodeAt(2)),
          e.writeU8(n.tag.charCodeAt(3)),
          e.writeU32(n.checksum),
          e.writeU32(n.offset),
          e.writeU32(n.bufSize))
    })(t, n))
  const a = 12 + r
  let d = 0
  const c = n.buf,
    u = Math.floor(a / 4)
  for (let p = 0; p < u; p++) {
    const t = 4 * p
    d =
      (d +
        (((c[t] << 24) | (c[t + 1] << 16) | (c[t + 2] << 8) | c[t + 3]) >>>
          0)) >>>
      0
  }
  l = (l + d) >>> 0
  const h = (2981146554 - l) >>> 0
  if (o) {
    const t = o.offset + 8
    ;((c[t] = (h >>> 24) & 255),
      (c[t + 1] = (h >>> 16) & 255),
      (c[t + 2] = (h >>> 8) & 255),
      (c[t + 3] = 255 & h))
  }
  return ((n.pos = s), n.buf.subarray(0, n.pos))
}
function nu(t, e) {
  const n = (null == e ? void 0 : e.encrypted) ?? !1,
    i = (null == e ? void 0 : e.compressed) ?? !0
  let r
  if (n) {
    r = new Uint8Array(t.length)
    for (let e = 0; e < t.length; e++) r[e] = 80 ^ t[e]
  } else r = t
  if (!i) return r
  const { streams: o } = (function (t, e) {
    if (e < 10 || t.length < 10)
      throw new Error('MTX data too small: header requires at least 10 bytes')
    const n = t[0],
      i = (t[4] << 16) | (t[5] << 8) | t[6],
      r = (t[7] << 16) | (t[8] << 8) | t[9]
    if (i < 10 || r < i || r > e)
      throw new Error(
        `MTX header offsets out of bounds: offset2=${i}, offset3=${r}, size=${e}`,
      )
    const o = [10, i, r],
      l = [Math.max(0, i - 10), Math.max(0, r - i), Math.max(0, e - r)],
      s = [],
      a = []
    for (let d = 0; d < 3; d++) {
      const e = _c(t.subarray(o[d]), l[d], n)
      ;(s.push(e), a.push(e.length))
    }
    return { streams: s, sizes: a }
  })(r, r.length)
  return eu(Oc(o.map((t) => new Fc(t, t.length))))
}
var iu = Object.freeze({
  maxFaces: 16,
  maxInputBytesPerFace: 8388608,
  maxDecompressedBytesPerFace: 16777216,
  maxTotalDecompressedBytes: 33554432,
  maxProcessingMs: 250,
})
var ru = new WeakMap()
function ou(t, e, n) {
  if (e + 2 > t.byteLength) throw new Error('Invalid EOT string header')
  const i = e + 2 + t.getUint16(e, !0) + n
  if (i > t.byteLength) throw new Error('Invalid EOT string size')
  return i
}
function lu(t, e = iu.maxInputBytesPerFace) {
  if (t.byteLength > e) throw new Error('Embedded font input limit exceeded')
  if (t.byteLength < 82) throw new Error('Invalid EOT header')
  const n = new DataView(t.buffer, t.byteOffset, t.byteLength).getUint32(0, !0)
  if (n < 82 || n > t.byteLength) throw new Error('Invalid EOT size')
  const i = new DataView(t.buffer, t.byteOffset, n),
    r = i.getUint32(4, !0),
    o = i.getUint32(8, !0),
    l = i.getUint32(12, !0),
    s = i.getUint16(32, !0)
  if (20556 !== i.getUint16(34, !0)) throw new Error('Invalid EOT signature')
  if (2 & s || 512 & s)
    throw new Error('Embedded font licensing does not permit this use')
  let a = 82
  if (
    ((a = ou(i, a, 2)),
    (a = ou(i, a, 2)),
    (a = ou(i, a, 2)),
    (a = ou(i, a, 0)),
    o >= 131073 && (a = ou(i, a + 2, 0)),
    o >= 131074)
  ) {
    if (((a += 10), (a = ou(i, a, 0)), (a += 4), a + 4 > i.byteLength))
      throw new Error('Invalid EOT EUDC header')
    a += 4 + i.getUint32(a, !0)
  }
  if (0 === r || a + r > i.byteLength)
    throw new Error('Invalid EOT font payload')
  return {
    bytes: t.subarray(a, a + r),
    compressed: !!(4 & l),
    encrypted: !!(268435456 & l),
  }
}
function su(t) {
  return `${t.renderFamily}:${t.weight}:${t.style}`
}
function au(t, e, n) {
  t.faces.get(e) === n &&
    (document.fonts.delete(n.fontFace),
    t.faces.delete(e),
    (t.totalBytes -= n.byteLength))
}
function du(t, e) {
  const n = e.buffer instanceof ArrayBuffer ? e : new Uint8Array(e),
    i = new FontFace(t.renderFamily, n, { weight: t.weight, style: t.style })
  document.fonts.add(i)
  try {
    return {
      fontFace: i,
      byteLength: e.byteLength,
      references: 0,
      ready: i.load().then(() => {}),
    }
  } catch (r) {
    throw (document.fonts.delete(i), r)
  }
}
function cu() {
  return typeof performance > 'u' ? Date.now() : performance.now()
}
function uu(t, e, n = {}) {
  const i = (function (t) {
    const e = { ...iu, ...t }
    if (!Number.isSafeInteger(e.maxFaces) || e.maxFaces < 0)
      throw new Error(
        'Invalid embedded font limit: maxFaces must be a non-negative integer',
      )
    for (const n of [
      'maxInputBytesPerFace',
      'maxDecompressedBytesPerFace',
      'maxTotalDecompressedBytes',
    ])
      if (!Number.isSafeInteger(e[n]) || e[n] < 0)
        throw new Error(
          `Invalid embedded font limit: ${n} must be a non-negative integer`,
        )
    if (!Number.isFinite(e.maxProcessingMs) || e.maxProcessingMs < 0)
      throw new Error(
        'Invalid embedded font limit: maxProcessingMs must be finite and non-negative',
      )
    return e
  })(n)
  if (typeof FontFace > 'u' || typeof document > 'u' || !document.fonts)
    return { ready: Promise.resolve(), dispose() {} }
  let r = ru.get(t)
  r ||
    ((r = { faces: new Map(), rejected: new Set(), totalBytes: 0 }),
    ru.set(t, r))
  const o = cu(),
    l = []
  let s = 0
  for (const d of t.embeddedFonts ?? []) {
    if (!e.has(d.renderFamily)) continue
    const t = su(d)
    if (r.rejected.has(t)) continue
    let n = r.faces.get(t)
    if (!n) {
      if (
        r.faces.size >= i.maxFaces ||
        s >= i.maxFaces ||
        cu() - o > i.maxProcessingMs
      )
        break
      s++
      try {
        const e = lu(d.data, i.maxInputBytesPerFace),
          l = nu(e.bytes, { compressed: e.compressed, encrypted: e.encrypted })
        if (cu() - o > i.maxProcessingMs) {
          r.rejected.add(t)
          break
        }
        if (l.byteLength > i.maxDecompressedBytesPerFace) {
          r.rejected.add(t)
          continue
        }
        if (r.totalBytes + l.byteLength > i.maxTotalDecompressedBytes) break
        ;((n = du(d, l)),
          r.faces.set(t, n),
          (r.totalBytes += n.byteLength),
          n.ready.catch(() => {
            ;(r.rejected.add(t), au(r, t, n))
          }))
      } catch {
        r.rejected.add(t)
        continue
      }
    }
    ;(n.references++, l.push([t, n]))
  }
  let a = !1
  return {
    ready: Promise.allSettled(l.map(([, t]) => t.ready)).then(() => {}),
    dispose() {
      if (!a) {
        a = !0
        for (const [t, e] of l) {
          if ((e.references--, e.references > 0)) continue
          const n = () => {
            e.references <= 0 && au(r, t, e)
          }
          e.ready.then(n, n)
        }
      }
    },
  }
}
var hu = new WeakMap()
function pu(t) {
  t.registered && (document.fonts.delete(t.fontFace), (t.registered = !1))
}
function fu(t) {
  if (!t.family.trim()) return
  let e
  try {
    ;((e = new FontFace(
      t.family.trim(),
      (function (t) {
        return t instanceof Uint8Array
          ? t.buffer instanceof ArrayBuffer
            ? t
            : new Uint8Array(t)
          : t
      })(t.source),
      t.descriptors,
    )),
      document.fonts.add(e))
  } catch {
    return
  }
  const n = { fontFace: e, registered: !0, ready: Promise.resolve() }
  try {
    n.ready = e.load().then(
      () => {},
      () => pu(n),
    )
  } catch {
    pu(n)
  }
  return n
}
function mu(t, e) {
  switch (t.nodeType) {
    case 'shape':
      return Xl(t, e)
    case 'picture':
      return ds(t, e)
    case 'table':
      return zs(t, e)
    case 'group':
      return Ys(t, e, mu)
    case 'chart':
      return Cc(t, e)
    default: {
      const e = document.createElement('div')
      return (
        (e.style.position = 'absolute'),
        (e.style.left = `${t.position.x}px`),
        (e.style.top = `${t.position.y}px`),
        (e.style.width = `${t.size.w}px`),
        (e.style.height = `${t.size.h}px`),
        e
      )
    }
  }
}
function $u(t) {
  const e = document.createElement('div')
  return (
    (e.style.position = 'absolute'),
    (e.style.left = `${t.position.x}px`),
    (e.style.top = `${t.position.y}px`),
    (e.style.width = `${t.size.w}px`),
    (e.style.height = `${t.size.h}px`),
    (e.style.border = '2px dashed #ff4444'),
    (e.style.backgroundColor = 'rgba(255,68,68,0.08)'),
    (e.style.display = 'flex'),
    (e.style.alignItems = 'center'),
    (e.style.justifyContent = 'center'),
    (e.style.color = '#cc0000'),
    (e.style.fontSize = '11px'),
    (e.style.fontFamily = 'monospace'),
    (e.style.overflow = 'hidden'),
    (e.style.boxSizing = 'border-box'),
    (e.style.padding = '4px'),
    (e.textContent = 'Render Error'),
    (e.title = `Failed to render node: ${t.id} (${t.name})`),
    e
  )
}
var gu = new WeakMap()
function yu(t, e, n, i) {
  const r = gu.get(t)
  if (r && r.rels === e && r.partPath === n && r.diagramDrawings === i)
    return r.nodes
  const o = (function (t, e, n, i) {
    const r = []
    if (!t || !t.exists || !t.exists()) return r
    const o = { rels: e ?? new Map(), partPath: n, diagramDrawings: i }
    for (const l of t.allChildren())
      try {
        for (const t of Vt(l, o))
          Xt(t.source) || ((t.size.w > 0 || t.size.h > 0) && r.push(t))
      } catch {}
    return r
  })(t, e, n, i)
  return (gu.set(t, { nodes: o, rels: e, partPath: n, diagramDrawings: i }), o)
}
function xu(t, e, n) {
  var i, r
  xe(t, e)
  const o = !(null == n || !n.mediaUrlCache),
    l = (null == n ? void 0 : n.chartInstances) ?? new Set(),
    s = [],
    a = new AbortController(),
    d = (function (t) {
      if (
        null == t ||
        !t.length ||
        typeof FontFace > 'u' ||
        typeof document > 'u' ||
        !document.fonts
      )
        return { ready: Promise.resolve(), dispose() {} }
      let e = hu.get(t)
      ;(e ||
        ((e = {
          faces: t.flatMap((t) => {
            const e = fu(t)
            return e ? [e] : []
          }),
          references: 0,
        }),
        hu.set(t, e)),
        e.references++)
      let n = !1
      return {
        ready: Promise.allSettled(e.faces.map((t) => t.ready)).then(() => {}),
        dispose() {
          if (!(n || ((n = !0), e.references--, e.references > 0))) {
            for (const t of e.faces) pu(t)
            hu.delete(t)
          }
        },
      }
    })(null == n ? void 0 : n.fontFaces)
  s.push(d.ready)
  const c = (function (t, e, n, i, r, o) {
    const l = t.slideToLayout.get(e.index) || '',
      s = t.layoutToMaster.get(l) || '',
      a = t.masterToTheme.get(s) || '',
      d = t.layouts.get(l) || {
        placeholders: [],
        spTree: {},
        rels: new Map(),
        showMasterSp: !0,
      },
      c = t.masters.get(s) || {
        colorMap: new Map(),
        textStyles: {},
        placeholders: [],
        spTree: {},
        rels: new Map(),
      }
    return {
      presentation: t,
      slide: e,
      theme: t.themes.get(a) || {
        colorScheme: new Map(),
        majorFont: { latin: 'Calibri', ea: '', cs: '' },
        minorFont: { latin: 'Calibri', ea: '', cs: '' },
        fillStyles: [],
        bgFillStyles: [],
        lineStyles: [],
        effectStyles: [],
      },
      master: c,
      layout: d,
      partPath: e.slidePath,
      layoutPath: l,
      masterPath: s,
      mediaUrlCache: n ?? new Map(),
      colorCache: new Map(),
      nodeOrigin: 'slide',
      groupDepth: 0,
      groupAncestorHas3dScene: !1,
      usedEmbeddedFontFamilies: new Set(),
      pdfjs: r,
      signal: o,
      chartInstances: i,
    }
  })(
    t,
    e,
    null == n ? void 0 : n.mediaUrlCache,
    l,
    null == n ? void 0 : n.pdfjs,
    a.signal,
  )
  ;((c.asyncTasks = s),
    null != n && n.onNavigate && (c.onNavigate = n.onNavigate))
  const u = document.createElement('div')
  ;((u.style.position = 'relative'),
    (u.style.width = `${t.width}px`),
    (u.style.height = `${t.height}px`),
    (u.style.overflow = 'hidden'),
    (u.style.backgroundColor = '#FFFFFF'),
    (c.measurementRoot = u))
  const h = (function (t) {
    if (t.isConnected) return () => {}
    const e = {
      position: t.style.position,
      left: t.style.left,
      top: t.style.top,
      visibility: t.style.visibility,
      pointerEvents: t.style.pointerEvents,
      contain: t.style.contain,
    }
    return (
      (t.style.position = 'fixed'),
      (t.style.left = '-100000px'),
      (t.style.top = '0'),
      (t.style.visibility = 'hidden'),
      (t.style.pointerEvents = 'none'),
      (t.style.contain = 'layout style paint'),
      document.body.appendChild(t),
      () => {
        ;(t.parentNode === document.body && document.body.removeChild(t),
          (t.style.position = e.position),
          (t.style.left = e.left),
          (t.style.top = e.top),
          (t.style.visibility = e.visibility),
          (t.style.pointerEvents = e.pointerEvents),
          (t.style.contain = e.contain))
      }
    )
  })(u)
  try {
    try {
      In(c, u)
    } catch (y) {
      null == (i = null == n ? void 0 : n.onNodeError) ||
        i.call(n, '__background__', y)
    }
    if (e.showMasterSp && c.layout.showMasterSp) {
      const e = {
          ...c,
          nodeOrigin: 'master',
          slide: { ...c.slide, rels: c.master.rels },
          partPath: c.masterPath,
          skipPlaceholderChildren: !0,
        },
        n = yu(c.master.spTree, c.master.rels, c.masterPath, t.diagramDrawings)
      for (const t of n)
        try {
          const n = mu(t, e)
          u.appendChild(n)
        } catch {}
    }
    if (e.showMasterSp) {
      const e = {
          ...c,
          nodeOrigin: 'layout',
          slide: { ...c.slide, rels: c.layout.rels },
          partPath: c.layoutPath,
          skipPlaceholderChildren: !0,
        },
        n = yu(c.layout.spTree, c.layout.rels, c.layoutPath, t.diagramDrawings)
      for (const t of n)
        try {
          const n = mu(t, e)
          u.appendChild(n)
        } catch {}
    }
    for (const t of e.nodes)
      try {
        const e = mu(t, c)
        u.appendChild(e)
      } catch (x) {
        ;(null == (r = null == n ? void 0 : n.onNodeError) ||
          r.call(n, t.id, x),
          u.appendChild($u(t)))
      }
  } finally {
    h()
  }
  const p = uu(
    t,
    c.usedEmbeddedFontFamilies ?? new Set(),
    null == n ? void 0 : n.embeddedFontLimits,
  )
  s.push(p.ready)
  let f = !1
  const m = c.mediaUrlCache,
    $ = Promise.allSettled(s).then(() => {}),
    g = () => {
      if (!f) {
        if (((f = !0), a.abort(), p.dispose(), d.dispose(), l))
          for (const t of l)
            !t.isDisposed() &&
              u.contains(t.getDom()) &&
              (t.dispose(), l.delete(t))
        if (!o) {
          for (const t of m.values()) URL.revokeObjectURL(t)
          m.clear()
        }
      }
    }
  return {
    element: u,
    ready: $,
    dispose: g,
    [Symbol.dispose]() {
      g()
    },
  }
}
var vu = { includeShapes: !0, includeTables: !0, includeGroups: !0 },
  bu = { offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1 },
  Mu = (t) =>
    t
      ? t.paragraphs.map((t) => t.runs.map((t) => t.text).join('')).join('\n')
      : '',
  wu = (t, e = bu) => ({
    x: e.offsetX + t.position.x * e.scaleX,
    y: e.offsetY + t.position.y * e.scaleY,
    w: t.size.w * e.scaleX,
    h: t.size.h * e.scaleY,
  }),
  ku = (t) => t.trim().length > 0,
  Au = (t) => void 0 !== t && /[A-Za-z0-9_]/.test(t),
  Lu = (t, e, n) => !Au(t[e - 1]) && !Au(t[n]),
  Su = (t, e, n, i) => {
    const r = Math.max(0, e - i),
      o = Math.min(t.length, n + i),
      l = r > 0 ? '...' : '',
      s = o < t.length ? '...' : ''
    return `${l}${t.slice(r, o)}${s}`
  },
  Cu = (t, e, n = !1, i) => {
    const r = qt(t, { ...e, skipPlaceholders: n })
    return (r && be(r, e.layout, e.master, { parentGroup: i }), r)
  },
  Fu = (t, e, n) => {
    if (t.childExtent.w <= 0 && t.childExtent.h <= 0)
      return {
        offsetX: n.offsetX + t.position.x * n.scaleX,
        offsetY: n.offsetY + t.position.y * n.scaleY,
        scaleX: n.scaleX,
        scaleY: n.scaleY,
      }
    const i = t.childExtent.w > 0 ? t.size.w / t.childExtent.w : 1,
      r = t.childExtent.h > 0 ? t.size.h / t.childExtent.h : 1
    if (
      ((t) => {
        const e = ((t % 360) + 360) % 360
        return Math.abs(e - 90) < 1e-4 || Math.abs(e - 270) < 1e-4
      })(e.rotation)
    ) {
      const o = e.position.x + (e.size.w - e.size.h) / 2,
        l = e.position.y + (e.size.h - e.size.w) / 2,
        s = { w: e.size.w * r, h: e.size.h * i },
        a = {
          x: (o - t.childOffset.x) * i - (s.w - s.h) / 2,
          y: (l - t.childOffset.y) * r - (s.h - s.w) / 2,
        },
        d = n.scaleX * r,
        c = n.scaleY * i
      return {
        offsetX: n.offsetX + (t.position.x + a.x) * n.scaleX - e.position.x * d,
        offsetY: n.offsetY + (t.position.y + a.y) * n.scaleY - e.position.y * c,
        scaleX: d,
        scaleY: c,
      }
    }
    return {
      offsetX: n.offsetX + (t.position.x - t.childOffset.x * i) * n.scaleX,
      offsetY: n.offsetY + (t.position.y - t.childOffset.y * r) * n.scaleY,
      scaleX: n.scaleX * i,
      scaleY: n.scaleY * r,
    }
  },
  Bu = (t, e, n, i, r) => {
    n.rows.forEach((o, l) => {
      o.cells.forEach((o, s) => {
        const a = ((t) => Mu(t.textBody))(o)
        ku(a) &&
          t.push({
            slideIndex: e,
            nodeId: n.id,
            nodePath: `${i}/rows/${l}/cells/${s}`,
            nodeType: n.nodeType,
            textKind: 'table-cell',
            text: a,
            bounds: wu(n, r),
            rowIndex: l,
            cellIndex: s,
          })
      })
    })
  },
  ju = (t, e, n, i, r, o, l = bu, s = !1) => {
    if (!s || !n.placeholder)
      switch (n.nodeType) {
        case 'shape':
          r.includeShapes &&
            ((t, e, n, i, r) => {
              const o = Mu(n.textBody)
              ku(o) &&
                t.push({
                  slideIndex: e,
                  nodeId: n.id,
                  nodePath: i,
                  nodeType: n.nodeType,
                  textKind: 'shape',
                  text: o,
                  bounds: wu(n, r),
                })
            })(t, e, n, i, l)
          break
        case 'table':
          r.includeTables && Bu(t, e, n, i, l)
          break
        case 'group':
          if (!r.includeGroups) break
          {
            const a = n
            n.children.forEach((n, d) => {
              try {
                const c = Cu(n, o, s, a)
                if (!c) return
                const u = Fu(a, c, l)
                ju(
                  t,
                  e,
                  c,
                  `${i}/children/${d}/${c.id || c.name || String(d)}`,
                  r,
                  o,
                  u,
                  s,
                )
              } catch {}
            })
          }
      }
  },
  Eu = (t, e, n, i, r, o) => {
    null != n &&
      n.exists() &&
      n.allChildren().forEach((n, l) => {
        if (!Xt(n))
          try {
            const s = Cu(n, o, !0)
            if (!s) return
            ju(
              t,
              e,
              s,
              `slides/${e}/${i}/nodes/${s.id || s.name || String(l)}`,
              r,
              o,
              bu,
              !0,
            )
          } catch {}
      })
  },
  Pu = (t, e) => {
    const n = { ...vu, ...e },
      i = []
    return (
      t.slides.forEach((e, r) => {
        xe(t, e)
        const o = t.slideToLayout.get(e.index) || e.layoutIndex,
          l = t.layouts.get(o),
          s = o ? t.layoutToMaster.get(o) : '',
          a = s ? t.masters.get(s) : void 0
        ;(e.showMasterSp &&
          (null != l &&
            l.showMasterSp &&
            a &&
            Eu(i, r, a.spTree, 'master', n, {
              rels: a.rels,
              partPath: s,
              diagramDrawings: t.diagramDrawings,
              layout: l,
              master: a,
            }),
          l &&
            Eu(i, r, l.spTree, 'layout', n, {
              rels: l.rels,
              partPath: o,
              diagramDrawings: t.diagramDrawings,
              layout: l,
              master: a,
            })),
          e.nodes.forEach((o, s) => {
            ju(i, r, o, `slides/${r}/nodes/${o.id || o.name || String(s)}`, n, {
              rels: e.rels,
              partPath: e.slidePath,
              diagramDrawings: t.diagramDrawings,
              layout: l,
              master: a,
            })
          }))
      }),
      i
    )
  },
  Tu = (t, e, n = {}) => {
    const i = ((t, e) => {
      if (t instanceof RegExp) {
        const e = new Set(t.flags.split(''))
        return (e.add('g'), new RegExp(t.source, [...e].join('')))
      }
      if (!t) return null
      const n = e.useRegex
          ? t
          : ((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))(t),
        i = e.matchCase ? 'g' : 'gi'
      return new RegExp(n, i)
    })(e, n)
    if (!i) return []
    const r = n.snippetRadius ?? 32,
      o = []
    for (const l of t) {
      let t
      for (i.lastIndex = 0; null !== (t = i.exec(l.text));) {
        const e = t[0]
        if (0 === e.length) {
          i.lastIndex += 1
          continue
        }
        const s = t.index,
          a = s + e.length
        ;(n.wholeWord && !Lu(l.text, s, a)) ||
          o.push({
            ...l,
            matchStart: s,
            matchEnd: a,
            snippet: Su(l.text, s, a, r),
          })
      }
    }
    return o
  },
  zu = class t extends EventTarget {
    constructor(t, e) {
      ;(super(),
        (this.presentation = null),
        (this.inputGeneration = 0),
        (this.mediaUrlCache = new Map()),
        (this.chartInstances = new Set()),
        (this.currentSlide = 0),
        (this._isRendering = !1),
        (this.zoomFactor = 1),
        (this.renderChain = Promise.resolve()),
        (this.renderGeneration = 0),
        (this.suppressScrollChange = !1),
        (this.resizeRafId = null),
        (this.lastMeasuredContainerWidth = 0),
        (this.mountedSlides = new Set()),
        (this.slideHandles = new Map()),
        (this.searchHighlightHandles = new Set()),
        (this.textIndexCache = null),
        (this.activeRenderMode = null),
        (this.listOptions = {
          windowed: !1,
          batchSize: 12,
          initialSlides: 4,
          overscanViewport: 1.5,
          showSlideLabels: !1,
        }),
        (this.container = t),
        (this.viewerOptions = e ?? {}))
      const n = this.normalizeZoomPercent(
        (null == e ? void 0 : e.zoomPercent) ?? 100,
      )
      if (
        ((this._fitMode = (null == e ? void 0 : e.fitMode) ?? 'contain'),
        (this.zoomFactor = n / 100),
        null != e && e.onSlideChange)
      ) {
        const t = e.onSlideChange
        this.addEventListener('slidechange', (e) => t(e.detail.index))
      }
      if (null != e && e.onSlideRendered) {
        const t = e.onSlideRendered
        this.addEventListener('sliderendered', (e) =>
          t(e.detail.index, e.detail.element),
        )
      }
      if (null != e && e.onSlideError) {
        const t = e.onSlideError
        this.addEventListener('slideerror', (e) =>
          t(e.detail.index, e.detail.error),
        )
      }
      if (null != e && e.onSlideUnmounted) {
        const t = e.onSlideUnmounted
        this.addEventListener('slideunmounted', (e) => t(e.detail.index))
      }
      if (null != e && e.onNodeError) {
        const t = e.onNodeError
        this.addEventListener('nodeerror', (e) =>
          t(e.detail.nodeId, e.detail.error),
        )
      }
      if (null != e && e.onRenderStart) {
        const t = e.onRenderStart
        this.addEventListener('renderstart', () => t())
      }
      if (null != e && e.onRenderComplete) {
        const t = e.onRenderComplete
        this.addEventListener('rendercomplete', () => t())
      }
    }
    emitRenderStart() {
      ;((this._isRendering = !0), this.dispatchEvent(new Event('renderstart')))
    }
    emitRenderComplete() {
      ;((this._isRendering = !1),
        this.dispatchEvent(new Event('rendercomplete')))
    }
    emitSlideChange(t) {
      this.dispatchEvent(
        new CustomEvent('slidechange', { detail: { index: t } }),
      )
    }
    emitSlideRendered(t, e) {
      this.dispatchEvent(
        new CustomEvent('sliderendered', { detail: { index: t, element: e } }),
      )
    }
    emitSlideError(t, e) {
      this.dispatchEvent(
        new CustomEvent('slideerror', { detail: { index: t, error: e } }),
      )
    }
    emitSlideUnmounted(t) {
      this.dispatchEvent(
        new CustomEvent('slideunmounted', { detail: { index: t } }),
      )
    }
    emitNodeError(t, e) {
      this.dispatchEvent(
        new CustomEvent('nodeerror', { detail: { nodeId: t, error: e } }),
      )
    }
    load(t) {
      ;(this.inputGeneration++,
        this.renderGeneration++,
        (this._isRendering = !1),
        this.unloadRenderedState(),
        (this.presentation = t),
        (this.currentSlide = 0),
        (this.textIndexCache = null),
        this.setupAdaptiveResize())
    }
    async renderList(t) {
      ;((this.activeRenderMode = 'list'),
        (this.listOptions = {
          windowed: (null == t ? void 0 : t.windowed) ?? !1,
          batchSize: this.normalizeBatchSize(
            (null == t ? void 0 : t.batchSize) ?? 12,
          ),
          initialSlides: this.normalizePositiveInt(
            (null == t ? void 0 : t.initialSlides) ?? 4,
            4,
          ),
          overscanViewport: this.normalizePositiveFloat(
            (null == t ? void 0 : t.overscanViewport) ?? 1.5,
            1.5,
          ),
          showSlideLabels: (null == t ? void 0 : t.showSlideLabels) ?? !1,
        }),
        await this.queueRender())
    }
    async renderSlide(t) {
      ;((this.activeRenderMode = 'slide'),
        void 0 !== t &&
          this.presentation &&
          (this.currentSlide = Math.max(
            0,
            Math.min(t, this.presentation.slides.length - 1),
          )),
        await this.queueRender())
    }
    async open(t, e) {
      const n = null == e ? void 0 : e.signal,
        i = () => {
          if (null != n && n.aborted)
            throw new DOMException('Preview aborted', 'AbortError')
        }
      ;(i(), this.destroy())
      const r = this.inputGeneration,
        o = await (async function (t) {
          if (t instanceof ArrayBuffer) return t
          if (t instanceof Uint8Array) {
            const e = new Uint8Array(t.byteLength)
            return (e.set(t), e.buffer)
          }
          const e = t
          if ('function' == typeof e.arrayBuffer) return e.arrayBuffer()
          if (typeof FileReader < 'u')
            return new Promise((t, n) => {
              const i = new FileReader()
              ;((i.onload = () => t(i.result)),
                (i.onerror = () =>
                  n(i.error ?? new Error('Failed to read Blob input'))),
                i.readAsArrayBuffer(e))
            })
          if (typeof Response < 'u') return new Response(e).arrayBuffer()
          throw new Error('Blob preview input is not supported in this runtime')
        })(t)
      if ((i(), r !== this.inputGeneration)) return
      const l =
        ((null == e ? void 0 : e.lazyMedia) ?? this.viewerOptions.lazyMedia)
          ? await (async function (t, e = {}) {
              return D(t, e, { lazyMedia: !0 })
            })(o, this.viewerOptions.zipLimits)
          : await (async function (t, e = {}) {
              return D(t, e, { lazyMedia: !1 })
            })(o, this.viewerOptions.zipLimits)
      if ((i(), r !== this.inputGeneration)) return
      const s =
        ((null == e ? void 0 : e.lazySlides) ?? this.viewerOptions.lazySlides)
          ? $e(l, { lazySlides: !0 })
          : $e(l)
      ;(i(),
        this.load(s),
        'slide' === ((null == e ? void 0 : e.renderMode) ?? 'list')
          ? await this.renderSlide(0)
          : await this.renderList(null == e ? void 0 : e.listOptions),
        i())
    }
    static async open(e, n, i) {
      const r = new t(n, i)
      return (
        await r.open(e, {
          renderMode: null == i ? void 0 : i.renderMode,
          listOptions: null == i ? void 0 : i.listOptions,
          signal: null == i ? void 0 : i.signal,
          lazyMedia: null == i ? void 0 : i.lazyMedia,
          lazySlides: null == i ? void 0 : i.lazySlides,
        }),
        r
      )
    }
    async goToSlide(t, e) {
      var n
      if (!this.presentation) return
      const i = this.currentSlide
      if (
        ((this.currentSlide = Math.max(
          0,
          Math.min(t, this.presentation.slides.length - 1),
        )),
        this.currentSlide !== i && this.emitSlideChange(this.currentSlide),
        'slide' === this.activeRenderMode)
      ) {
        const {
          scale: t,
          displayWidth: e,
          displayHeight: n,
        } = this.getDisplayMetrics()
        this.renderSingleSlide(t, e, n)
      } else {
        ;((this.suppressScrollChange = !0),
          await new Promise((t) =>
            requestAnimationFrame(() => {
              ;((this.suppressScrollChange = !1), t())
            }),
          ),
          null == (n = this.ensureListSlideMountedFn) ||
            n.call(this, this.currentSlide))
        const t = this.container.querySelector(
          `[data-slide-index="${this.currentSlide}"]`,
        )
        t &&
          'function' == typeof t.scrollIntoView &&
          t.scrollIntoView(e ?? { behavior: 'smooth', block: 'center' })
      }
    }
    async setZoom(t) {
      const e = this.normalizeZoomPercent(t) / 100
      e !== this.zoomFactor && ((this.zoomFactor = e), await this.queueRender())
    }
    async setFitMode(t) {
      this._fitMode !== t &&
        ((this._fitMode = t),
        'none' === t && (this.lastMeasuredContainerWidth = 0),
        await this.queueRender())
    }
    get presentationData() {
      return this.presentation
    }
    get slideCount() {
      var t
      return (null == (t = this.presentation) ? void 0 : t.slides.length) ?? 0
    }
    get slideWidth() {
      var t
      return (null == (t = this.presentation) ? void 0 : t.width) ?? 0
    }
    get slideHeight() {
      var t
      return (null == (t = this.presentation) ? void 0 : t.height) ?? 0
    }
    get currentSlideIndex() {
      return this.currentSlide
    }
    get isRendering() {
      return this._isRendering
    }
    get zoomPercent() {
      return 100 * this.zoomFactor
    }
    get fitMode() {
      return this._fitMode
    }
    on(t, e) {
      return (this.addEventListener(t, e), this)
    }
    off(t, e) {
      return (this.removeEventListener(t, e), this)
    }
    isSlideMounted(t) {
      return this.mountedSlides.has(t)
    }
    getMountedSlides() {
      return [...this.mountedSlides].sort((t, e) => t - e)
    }
    renderSlideToContainer(t, e, n) {
      if (!this.presentation) return null
      const i = this.presentation.slides[t]
      if (!i) return null
      const r = xu(this.presentation, i, {
        onNodeError: (t, e) => this.emitNodeError(t, e),
        onNavigate: (t) => this.handleNavigate(t),
        pdfjs: this.viewerOptions.pdfjs,
        embeddedFontLimits: this.viewerOptions.embeddedFontLimits,
        fontFaces: this.viewerOptions.fontFaces,
      })
      return (
        void 0 !== n &&
          1 !== n &&
          ((r.element.style.transform = `scale(${n})`),
          (r.element.style.transformOrigin = 'top left')),
        e.appendChild(r.element),
        this.emitSlideRendered(t, r.element),
        r
      )
    }
    searchText(t, e) {
      return this.presentation ? Tu(this.getTextIndex(e), t, e) : []
    }
    renderThumbnailToContainer(t, e, n) {
      if (!this.presentation || !this.presentation.slides[t]) return null
      const i = this.getThumbnailScale(n),
        r = this.presentation.width * i,
        o = this.presentation.height * i,
        l = document.createElement('div')
      ;((l.dataset.slideIndex = String(t)),
        (l.dataset.pptxThumbnail = 'true'),
        (l.style.cssText = `\n      width: ${r}px;\n      height: ${o}px;\n      overflow: hidden;\n      position: relative;\n      background: #fff;\n      contain: layout paint style;\n    `),
        e.appendChild(l))
      const s = this.renderSlideToContainer(t, l, i)
      if (!s) return (l.remove(), null)
      let a = !1
      const d = () => {
        a || ((a = !0), s.dispose(), l.remove())
      }
      return {
        element: l,
        ready: s.ready,
        dispose: d,
        [Symbol.dispose]() {
          d()
        },
      }
    }
    async highlightSearchResult(t, e) {
      if (!this.presentation || !this.presentation.slides[t.slideIndex])
        return null
      await this.prepareSearchHighlightTarget(t.slideIndex, e)
      const n = this.findRenderedSlideElement(t.slideIndex)
      if (!n) return null
      'static' === getComputedStyle(n).position &&
        (n.style.position = 'relative')
      const i = document.createElement('div')
      ;((i.className = 'pptx-search-highlight'),
        null != e &&
          e.className &&
          i.classList.add(...e.className.split(/\s+/).filter(Boolean)),
        (i.dataset.pptxSearchHighlight = 'true'),
        this.applySearchHighlightStyle(i, t, e),
        n.appendChild(i))
      let r = !1
      const o = {
        element: i,
        result: t,
        dispose: () => {
          r || ((r = !0), i.remove(), this.searchHighlightHandles.delete(o))
        },
        [Symbol.dispose]() {
          this.dispose()
        },
      }
      return (this.searchHighlightHandles.add(o), o)
    }
    clearSearchHighlights() {
      for (const t of [...this.searchHighlightHandles]) t.dispose()
      this.searchHighlightHandles.clear()
    }
    afterSingleSlideRender() {}
    destroy() {
      ;(this.inputGeneration++,
        this.renderGeneration++,
        (this._isRendering = !1),
        this.teardownAdaptiveResize(),
        this.unloadRenderedState(),
        (this.presentation = null))
    }
    unloadRenderedState() {
      var t, e
      ;(this.clearSearchHighlights(),
        null == (t = this.cleanupScrollObserver) || t.call(this),
        (this.cleanupScrollObserver = void 0),
        null == (e = this.cleanupListMount) || e.call(this),
        (this.cleanupListMount = void 0),
        (this.ensureListSlideMountedFn = void 0),
        this.mountedSlides.clear())
      for (const n of this.slideHandles.values()) n.dispose()
      ;(this.slideHandles.clear(),
        (this.textIndexCache = null),
        this.disposeAllCharts())
      for (const n of this.mediaUrlCache.values()) URL.revokeObjectURL(n)
      ;(this.mediaUrlCache.clear(),
        (this.container.innerHTML = ''),
        (this.activeRenderMode = null))
    }
    [Symbol.dispose]() {
      this.destroy()
    }
    normalizeZoomPercent(t) {
      return Number.isFinite(t) ? Math.max(10, Math.min(400, t)) : 100
    }
    normalizeBatchSize(t) {
      return Number.isInteger(t) && t > 0 ? t : 12
    }
    normalizePositiveInt(t, e) {
      return Number.isInteger(t) && t > 0 ? t : e
    }
    normalizePositiveFloat(t, e) {
      return Number.isFinite(t) && t > 0 ? t : e
    }
    toCssLength(t, e) {
      return void 0 === t ? e : 'number' == typeof t ? `${t}px` : t
    }
    async prepareSearchHighlightTarget(t, e) {
      var n
      const i = null == e ? void 0 : e.scrollIntoView
      !1 === i
        ? 'slide' !== this.activeRenderMode || this.currentSlide === t
          ? 'list' === this.activeRenderMode &&
            (null == (n = this.ensureListSlideMountedFn) || n.call(this, t))
          : await this.goToSlide(t)
        : await this.goToSlide(
            t,
            'object' == typeof i ? i : { behavior: 'smooth', block: 'center' },
          )
    }
    findRenderedSlideElement(t) {
      if ('list' === this.activeRenderMode) {
        const e = this.container.querySelector(`[data-slide-index="${t}"]`),
          n = null == e ? void 0 : e.firstElementChild,
          i = null == n ? void 0 : n.firstElementChild
        return i instanceof HTMLElement ? i : null
      }
      const e = this.container.firstElementChild,
        n = null == e ? void 0 : e.firstElementChild
      return n instanceof HTMLElement ? n : null
    }
    applySearchHighlightStyle(t, e, n) {
      const i = Number.isFinite(null == n ? void 0 : n.padding)
        ? Math.max(0, n.padding)
        : 0
      if (
        ((t.style.position = 'absolute'),
        (t.style.pointerEvents = 'none'),
        (t.style.boxSizing = 'border-box'),
        (t.style.left = e.bounds.x - i + 'px'),
        (t.style.top = e.bounds.y - i + 'px'),
        (t.style.width = `${e.bounds.w + 2 * i}px`),
        (t.style.height = `${e.bounds.h + 2 * i}px`),
        (t.style.zIndex = String((null == n ? void 0 : n.zIndex) ?? 1e4)),
        (t.style.borderStyle = 'solid'),
        (t.style.borderWidth = this.toCssLength(
          null == n ? void 0 : n.borderWidth,
          '3px',
        )),
        (t.style.borderColor =
          (null == n ? void 0 : n.borderColor) ?? 'rgba(255, 214, 102, 0.95)'),
        (t.style.borderRadius = this.toCssLength(
          null == n ? void 0 : n.borderRadius,
          '6px',
        )),
        (t.style.background =
          (null == n ? void 0 : n.backgroundColor) ??
          'rgba(255, 214, 102, 0.16)'),
        (t.style.boxShadow =
          (null == n ? void 0 : n.boxShadow) ??
          '0 0 0 2px rgba(17, 17, 34, 0.45)'),
        null != n && n.style)
      )
        for (const [r, o] of Object.entries(n.style))
          void 0 !== o && t.style.setProperty(r, String(o))
    }
    getTextIndex(t) {
      var e
      const n = JSON.stringify({
        includeShapes: (null == t ? void 0 : t.includeShapes) ?? !0,
        includeTables: (null == t ? void 0 : t.includeTables) ?? !0,
        includeGroups: (null == t ? void 0 : t.includeGroups) ?? !0,
      })
      if ((null == (e = this.textIndexCache) ? void 0 : e.key) === n)
        return this.textIndexCache.entries
      const i = this.presentation ? Pu(this.presentation, t) : []
      return ((this.textIndexCache = { key: n, entries: i }), i)
    }
    getThumbnailScale(t) {
      if (!this.presentation) return 1
      if (
        void 0 !== (null == t ? void 0 : t.scale) &&
        Number.isFinite(t.scale) &&
        t.scale > 0
      )
        return t.scale
      const e =
          void 0 !== (null == t ? void 0 : t.width) &&
          Number.isFinite(t.width) &&
          t.width > 0
            ? t.width / this.presentation.width
            : void 0,
        n =
          void 0 !== (null == t ? void 0 : t.height) &&
          Number.isFinite(t.height) &&
          t.height > 0
            ? t.height / this.presentation.height
            : void 0
      return void 0 !== e && void 0 !== n
        ? Math.min(e, n)
        : void 0 !== e
          ? e
          : void 0 !== n
            ? n
            : 180 / this.presentation.width
    }
    getDisplayMetrics() {
      if (!this.presentation)
        return { scale: 1, displayWidth: 0, displayHeight: 0 }
      const t = this.viewerOptions.width ?? (this.container.clientWidth || 960)
      'contain' === this._fitMode &&
        void 0 === this.viewerOptions.width &&
        (this.lastMeasuredContainerWidth = t)
      const e =
        ('contain' === this._fitMode ? t / this.presentation.width : 1) *
        this.zoomFactor
      return {
        scale: e,
        displayWidth: this.presentation.width * e,
        displayHeight: this.presentation.height * e,
      }
    }
    async queueRender() {
      const t = ++this.renderGeneration
      return (
        (this.renderChain = this.renderChain
          .catch(() => {})
          .then(async () => {
            var e, n
            if (!this.isRenderStale(t)) {
              this.emitRenderStart()
              try {
                if (this.isRenderStale(t)) return
                const {
                  scale: i,
                  displayWidth: r,
                  displayHeight: o,
                } = this.getDisplayMetrics()
                ;(null == (e = this.cleanupScrollObserver) || e.call(this),
                  (this.cleanupScrollObserver = void 0),
                  null == (n = this.cleanupListMount) || n.call(this),
                  (this.cleanupListMount = void 0),
                  (this.ensureListSlideMountedFn = void 0),
                  this.clearSearchHighlights(),
                  this.mountedSlides.clear())
                for (const t of this.slideHandles.values()) t.dispose()
                if (
                  (this.slideHandles.clear(),
                  this.disposeAllCharts(),
                  (this.container.innerHTML = ''),
                  (this.container.style.position = 'relative'),
                  'slide' === this.activeRenderMode
                    ? this.renderSingleSlide(i, r, o)
                    : this.listOptions.windowed
                      ? await this.renderAllSlidesWindowed(i, r, o, t)
                      : await this.renderAllSlidesFull(i, r, o, t),
                  this.isRenderStale(t))
                )
                  return
                ;('slide' !== this.activeRenderMode &&
                  this.correctListMetricsIfNeeded(),
                  this.emitSlideChange(this.currentSlide))
              } finally {
                this.emitRenderComplete()
              }
            }
          })),
        this.renderChain
      )
    }
    isRenderStale(t) {
      return t !== this.renderGeneration || !this.presentation
    }
    handleContainerResize() {
      if (
        !this.presentation ||
        'contain' !== this._fitMode ||
        void 0 !== this.viewerOptions.width
      )
        return
      const t = this.container.clientWidth || 0
      !t ||
        t === this.lastMeasuredContainerWidth ||
        ((this.lastMeasuredContainerWidth = t),
        null !== this.resizeRafId && cancelAnimationFrame(this.resizeRafId),
        (this.resizeRafId = requestAnimationFrame(() => {
          ;((this.resizeRafId = null), this.queueRender())
        })))
    }
    setupAdaptiveResize() {
      if ((this.teardownAdaptiveResize(), typeof ResizeObserver < 'u')) {
        const t = new ResizeObserver(() => this.handleContainerResize())
        return (t.observe(this.container), void (this.resizeObserver = t))
      }
      ;((this.windowResizeHandler = () => this.handleContainerResize()),
        window.addEventListener('resize', this.windowResizeHandler))
    }
    teardownAdaptiveResize() {
      var t
      ;(null == (t = this.resizeObserver) || t.disconnect(),
        (this.resizeObserver = void 0),
        this.windowResizeHandler &&
          (window.removeEventListener('resize', this.windowResizeHandler),
          (this.windowResizeHandler = void 0)),
        null !== this.resizeRafId &&
          (cancelAnimationFrame(this.resizeRafId), (this.resizeRafId = null)))
    }
    disposeAllCharts() {
      for (const t of this.chartInstances) t.isDisposed() || t.dispose()
      this.chartInstances.clear()
    }
    createListSlideItem(t, e, n) {
      const i = document.createElement('div')
      ;((i.dataset.slideIndex = String(t)),
        (i.style.cssText = 'width: fit-content; margin: 0 auto 20px;'))
      const r = document.createElement('div')
      if (
        ((r.style.cssText = `\n      width: ${e}px;\n      height: ${n}px;\n      box-shadow: 0 2px 8px rgba(0,0,0,0.15);\n      overflow: hidden;\n      position: relative;\n      background: #fff;\n    `),
        i.appendChild(r),
        this.listOptions.showSlideLabels)
      ) {
        const e = document.createElement('div')
        ;((e.style.cssText =
          'text-align: center; padding: 4px; font-size: 12px; color: #666;'),
          (e.textContent = `Slide ${t + 1}`),
          i.appendChild(e))
      }
      return { item: i, wrapper: r }
    }
    mountListSlide(t, e, n, i, r) {
      if (!this.presentation || '1' === e.dataset.mounted) return
      ;((e.dataset.mounted = '1'),
        (e.innerHTML = ''),
        this.mountedSlides.add(t))
      const o = this.presentation.slides[t]
      try {
        const i = xu(this.presentation, o, {
          onNodeError: (t, e) => this.emitNodeError(t, e),
          onNavigate: (t) => this.handleNavigate(t),
          mediaUrlCache: this.mediaUrlCache,
          pdfjs: this.viewerOptions.pdfjs,
          embeddedFontLimits: this.viewerOptions.embeddedFontLimits,
          fontFaces: this.viewerOptions.fontFaces,
          chartInstances: this.chartInstances,
        })
        ;(this.slideHandles.set(t, i),
          (i.element.style.transform = `scale(${n})`),
          (i.element.style.transformOrigin = 'top left'),
          e.appendChild(i.element),
          this.emitSlideRendered(t, i.element))
      } catch (l) {
        ;(this.emitSlideError(t, l),
          (e.style.background = '#fff3f3'),
          (e.style.display = 'flex'),
          (e.style.alignItems = 'center'),
          (e.style.justifyContent = 'center'),
          (e.style.border = '2px dashed #ff6b6b'),
          (e.style.color = '#cc0000'),
          (e.style.fontSize = '14px'),
          (e.textContent = `Slide ${t + 1}: Render Error - ${l instanceof Error ? l.message : String(l)}`))
      }
    }
    unmountListSlide(t, e, n) {
      if ('1' !== e.dataset.mounted) return
      ;((e.dataset.mounted = '0'), this.mountedSlides.delete(t))
      const i = this.slideHandles.get(t)
      ;(i && (i.dispose(), this.slideHandles.delete(t)),
        (e.innerHTML = ''),
        (e.style.background = '#fff'),
        (e.style.display = ''),
        (e.style.alignItems = ''),
        (e.style.justifyContent = ''),
        (e.style.border = ''),
        (e.style.color = ''),
        (e.style.fontSize = ''),
        (e.style.height = `${n}px`),
        this.emitSlideUnmounted(t))
    }
    async renderAllSlidesFull(t, e, n, i) {
      if (!this.presentation) return
      const r = this.listOptions.batchSize
      let o = document.createDocumentFragment()
      for (let l = 0; l < this.presentation.slides.length; l++) {
        if (this.isRenderStale(i)) return
        const { item: s, wrapper: a } = this.createListSlideItem(l, e, n)
        if (
          (this.mountListSlide(l, a, t, e, n),
          o.appendChild(s),
          (l + 1) % r === 0 &&
            (this.container.appendChild(o),
            (o = document.createDocumentFragment()),
            await new Promise((t) => requestAnimationFrame(() => t())),
            this.isRenderStale(i)))
        )
          return
      }
      this.isRenderStale(i) ||
        (o.childNodes.length > 0 && this.container.appendChild(o),
        this.setupScrollSlideTracking())
    }
    async renderAllSlidesWindowed(t, e, n, i) {
      if (!this.presentation) return
      const r = this.listOptions.batchSize
      let o = document.createDocumentFragment()
      const l = []
      for (let m = 0; m < this.presentation.slides.length; m++) {
        if (this.isRenderStale(i)) return
        const { item: t, wrapper: s } = this.createListSlideItem(m, e, n)
        if (
          (l.push(s),
          o.appendChild(t),
          (m + 1) % r === 0 &&
            (this.container.appendChild(o),
            (o = document.createDocumentFragment()),
            await new Promise((t) => requestAnimationFrame(() => t())),
            this.isRenderStale(i)))
        )
          return
      }
      if (this.isRenderStale(i)) return
      o.childNodes.length > 0 && this.container.appendChild(o)
      const s = (i) => {
          i < 0 || i >= l.length || this.mountListSlide(i, l[i], t, e, n)
        },
        a = (t) => {
          t < 0 || t >= l.length || this.unmountListSlide(t, l[t], n)
        },
        d = this.listOptions.initialSlides
      for (let m = 0; m < Math.min(d, l.length); m++) s(m)
      this.ensureListSlideMountedFn = s
      const c = window.IntersectionObserver
      if (!c) {
        for (let t = d; t < l.length; t++) s(t)
        return void this.setupScrollSlideTracking()
      }
      const u = this.viewerOptions.scrollContainer ?? null,
        h = this.listOptions.overscanViewport,
        p = u ? u.clientHeight : window.innerHeight,
        f = new c(
          (t) => {
            for (const e of t) {
              const t = e.target.parentElement,
                n = Number((null == t ? void 0 : t.dataset.slideIndex) ?? '-1')
              Number.isNaN(n) || n < 0 || (e.isIntersecting ? s(n) : a(n))
            }
          },
          { root: u, rootMargin: `${Math.round(p * h)}px 0px`, threshold: 0 },
        )
      ;(l.forEach((t) => {
        f.observe(t)
      }),
        (this.cleanupListMount = () => {
          ;(f.disconnect(), (this.ensureListSlideMountedFn = void 0))
        }),
        this.setupScrollSlideTracking())
    }
    setupScrollSlideTracking() {
      if ('slide' === this.activeRenderMode) return
      const t = window.IntersectionObserver
      if (!t) return
      const e = this.container.querySelectorAll('[data-slide-index]')
      if (!e.length) return
      const n = new Map(),
        i = new t(
          (t) => {
            for (const r of t) {
              const t = Number(r.target.dataset.slideIndex ?? '-1')
              Number.isNaN(t) || t < 0 || n.set(t, r.intersectionRatio)
            }
            if (this.suppressScrollChange) return
            let e = -1,
              i = -1
            for (const [r, o] of n) o > i && ((i = o), (e = r))
            e >= 0 &&
              e !== this.currentSlide &&
              ((this.currentSlide = e), this.emitSlideChange(e))
          },
          {
            root: this.viewerOptions.scrollContainer ?? null,
            threshold: [0, 0.25, 0.5, 0.75, 1],
          },
        )
      ;(e.forEach((t) => i.observe(t)),
        (this.cleanupScrollObserver = () => {
          i.disconnect()
        }))
    }
    renderSingleSlide(t, e, n) {
      if (!this.presentation) return
      const i = this.presentation.slides[this.currentSlide]
      if (!i) return
      for (const l of this.slideHandles.values()) l.dispose()
      ;(this.slideHandles.clear(),
        this.disposeAllCharts(),
        (this.container.innerHTML = ''),
        this.mountedSlides.clear(),
        this.mountedSlides.add(this.currentSlide))
      const r = document.createElement('div')
      r.style.cssText = `\n      width: ${e}px; height: ${n}px;\n      margin: 0 auto; overflow: hidden; position: relative;\n      box-shadow: 0 2px 8px rgba(0,0,0,0.15);\n    `
      try {
        const e = xu(this.presentation, i, {
          onNodeError: (t, e) => this.emitNodeError(t, e),
          onNavigate: (t) => this.handleNavigate(t),
          mediaUrlCache: this.mediaUrlCache,
          pdfjs: this.viewerOptions.pdfjs,
          embeddedFontLimits: this.viewerOptions.embeddedFontLimits,
          fontFaces: this.viewerOptions.fontFaces,
          chartInstances: this.chartInstances,
        })
        ;(this.slideHandles.set(this.currentSlide, e),
          (e.element.style.transform = `scale(${t})`),
          (e.element.style.transformOrigin = 'top left'),
          r.appendChild(e.element),
          this.emitSlideRendered(this.currentSlide, e.element))
      } catch (o) {
        ;(this.emitSlideError(this.currentSlide, o),
          (r.style.background = '#fff3f3'),
          (r.style.display = 'flex'),
          (r.style.alignItems = 'center'),
          (r.style.justifyContent = 'center'),
          (r.style.border = '2px dashed #ff6b6b'),
          (r.style.color = '#cc0000'),
          (r.style.fontSize = '14px'),
          (r.textContent = `Slide ${this.currentSlide + 1}: Render Error - ${o instanceof Error ? o.message : String(o)}`))
      }
      ;(this.container.appendChild(r), this.afterSingleSlideRender())
    }
    correctListMetricsIfNeeded() {
      if (
        !this.presentation ||
        'contain' !== this._fitMode ||
        void 0 !== this.viewerOptions.width
      )
        return
      const t = this.container.clientWidth || 0
      if (!t || t === this.lastMeasuredContainerWidth) return
      this.lastMeasuredContainerWidth = t
      const e = (t / this.presentation.width) * this.zoomFactor,
        n = this.presentation.width * e,
        i = this.presentation.height * e,
        r = this.container.querySelectorAll('[data-slide-index]')
      for (const o of r) {
        const t = o.firstElementChild
        if (!t) continue
        ;((t.style.width = `${n}px`), (t.style.height = `${i}px`))
        const r = t.firstElementChild
        r && (r.style.transform = `scale(${e})`)
      }
    }
    handleNavigate(t) {
      void 0 !== t.slideIndex
        ? this.goToSlide(t.slideIndex)
        : t.url &&
          kn(t.url) &&
          window.open(t.url, '_blank', 'noopener,noreferrer')
    }
  }
export { zu as PptxViewer }
//# sourceMappingURL=aiden0z-pptx-renderer.es-FrYgb9oW.js.map
