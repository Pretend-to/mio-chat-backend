import {
  c as e,
  a as n,
  b as t,
  e as s,
  g as i,
  f as o,
  n as r,
  t as a,
  F as l,
  o as c,
  y as d,
  z as u,
} from './vue-vendor-DVmbRZJS.js'
import {
  _ as p,
  e as f,
  s as h,
  d as m,
  c as v,
} from './components-CJBN48R7.js'
import { r as g } from './views-cg9N_QNj.js'
import './vendor-C0p4anTM.js'
import './emoji-nU2WIqY_.js'
!(function () {
  const e = document.createElement('link').relList
  if (!(e && e.supports && e.supports('modulepreload'))) {
    for (const e of document.querySelectorAll('link[rel="modulepreload"]')) n(e)
    new MutationObserver((e) => {
      for (const t of e)
        if ('childList' === t.type)
          for (const e of t.addedNodes)
            'LINK' === e.tagName && 'modulepreload' === e.rel && n(e)
    }).observe(document, { childList: !0, subtree: !0 })
  }
  function n(e) {
    if (e.ep) return
    e.ep = !0
    const n = (function (e) {
      const n = {}
      return (
        e.integrity && (n.integrity = e.integrity),
        e.referrerPolicy && (n.referrerPolicy = e.referrerPolicy),
        'use-credentials' === e.crossOrigin
          ? (n.credentials = 'include')
          : 'anonymous' === e.crossOrigin
            ? (n.credentials = 'omit')
            : (n.credentials = 'same-origin'),
        n
      )
    })(e)
    fetch(e.href, n)
  }
})()
const w = { key: 0, class: 'app-mobile' },
  b = {
    key: 0,
    id: 'beian',
    href: 'https://beian.miit.gov.cn/',
    target: '_blank',
  }
const _ = d(
  p(
    {
      components: { sideBar: h, displayButtons: f },
      data() {
        const e = m.getBaseConfig()
        return {
          onPhone: window.innerWidth < 600,
          client: v,
          fullScreen: e?.full_screen || !1,
          beian: e?.beian || '',
          isTauri: !(!window.__TAURI__ && !window.__TAURI_INTERNALS__),
        }
      },
      computed: {
        onPrivate() {
          return (
            this.$route.path.includes('/auth') ||
            this.$route.path.includes('/profile') ||
            this.$route.path.includes('/chat')
          )
        },
      },
      created() {
        const e = m.getBaseConfig()
        ;(Object.keys(e).length > 0
          ? ((this.fullScreen = e.full_screen),
            (this.beian = e.beian),
            (document.title = e.title))
          : m.setBaseConfigCallback((e) => {
              ;((this.fullScreen = e.full_screen),
                (this.beian = e.beian),
                (document.title = e.title))
            }),
          window.addEventListener('resize', this.handleResize))
      },
      beforeUnmount() {
        window.removeEventListener('resize', this.handleResize)
      },
      methods: {
        setWindowSize(e) {
          ;((this.fullScreen = e), m.updateBaseConfig({ full_screen: e }))
        },
        handleResize() {
          this.onPhone = window.innerWidth < 600
        },
        closeApp() {
          this.$message({ message: '浏览器端暂不支持关闭', type: 'warning' })
        },
      },
    },
    [
      [
        'render',
        function (d, u, p, f, h, m) {
          const v = o('router-view'),
            g = o('sideBar'),
            _ = o('displayButtons')
          return (
            c(),
            e(
              l,
              null,
              [
                n(
                  'div',
                  { id: 'mio-chat', class: r({ browser: !h.isTauri }) },
                  [
                    h.onPhone
                      ? (c(),
                        e('div', w, [
                          s(v),
                          m.onPrivate ? t('', !0) : (c(), i(g, { key: 0 })),
                        ]))
                      : (c(),
                        e(
                          'div',
                          {
                            key: 1,
                            class: r([
                              'app-desktop',
                              { fullscreen: h.fullScreen || h.isTauri },
                            ]),
                          },
                          [
                            s(
                              _,
                              {
                                'full-screen': h.fullScreen,
                                onClose: m.closeApp,
                                onSetScreen: m.setWindowSize,
                              },
                              null,
                              8,
                              ['full-screen', 'onClose', 'onSetScreen'],
                            ),
                            s(g),
                            s(v),
                          ],
                          2,
                        )),
                  ],
                  2,
                ),
                h.beian ? (c(), e('a', b, a(h.beian), 1)) : t('', !0),
              ],
              64,
            )
          )
        },
      ],
      ['__scopeId', 'data-v-6b9ec869'],
    ],
  ),
)
;(_.use(u),
  _.use(g),
  _.mount('#app'),
  'serviceWorker' in navigator &&
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.v4.js')
        .then((e) => {
          const n =
            'localhost' === window.location.hostname ||
            '127.0.0.1' === window.location.hostname
          e.active
            ? e.active.postMessage({ type: 'SET_DEV_MODE', isDevMode: n })
            : navigator.serviceWorker.addEventListener(
                'controllerchange',
                () => {
                  navigator.serviceWorker.controller &&
                    navigator.serviceWorker.controller.postMessage({
                      type: 'SET_DEV_MODE',
                      isDevMode: n,
                    })
                },
              )
        })
        .catch((e) => {})
    }))
//# sourceMappingURL=index-DTslDMjZ.js.map
