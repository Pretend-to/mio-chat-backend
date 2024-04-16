import {
  _ as h,
  c as v,
  o as c,
  a as n,
  b as t,
  F as f,
  r as m,
  t as r,
  p as g,
  d as w,
  e as l,
  f as p,
} from './index-DOclrP3U.js'
const $ = {
    data() {
      return { contactorList: v.contactList }
    },
    methods: {
      showChat(s) {
        this.$router.push({ path: '/home/chat/' + s })
      },
      getId(s) {
        let e = this.$route.params.id,
          a = this.contactorList[s].id
        return e == a
          ? 'active'
          : this.contactorList[s].priority == 0
            ? 'important'
            : ''
      },
    },
  },
  L = (s) => (g('data-v-f64430d5'), (s = s()), w(), s),
  C = { id: 'friendlists' },
  I = { class: 'upsidebar', id: 'friends' },
  k = L(() =>
    t(
      'div',
      { class: 'search', id: 'people' },
      [
        t(
          'svg',
          {
            t: '1695130526763',
            class: 'listicon',
            viewBox: '0 0 1024 1024',
            version: '1.1',
            xmlns: 'http://www.w3.org/2000/svg',
            'p-id': '3427',
          },
          [
            t('path', {
              d: 'M945.066667 898.133333l-189.866667-189.866666c55.466667-64 87.466667-149.333333 87.466667-241.066667 0-204.8-168.533333-373.333333-373.333334-373.333333S96 264.533333 96 469.333333 264.533333 842.666667 469.333333 842.666667c91.733333 0 174.933333-34.133333 241.066667-87.466667l189.866667 189.866667c6.4 6.4 14.933333 8.533333 23.466666 8.533333s17.066667-2.133333 23.466667-8.533333c8.533333-12.8 8.533333-34.133333-2.133333-46.933334zM469.333333 778.666667C298.666667 778.666667 160 640 160 469.333333S298.666667 160 469.333333 160 778.666667 298.666667 778.666667 469.333333 640 778.666667 469.333333 778.666667z',
              'p-id': '3428',
            }),
          ],
        ),
        t('input', { type: 'text', id: 'tosearch', placeholder: '搜索' }),
      ],
      -1,
    ),
  ),
  S = { class: 'bu-add' },
  b = { class: 'people' },
  y = ['onClick', 'id'],
  B = { class: 'avatar' },
  x = ['src', 'alt'],
  V = { class: 'info' },
  z = { class: 'name' },
  F = { class: 'msginfo', id: 'time' },
  M = { class: 'msginfo', id: 'msgctt' }
function N(s, e, a, u, _, d) {
  return (
    c(),
    n('div', C, [
      t('div', I, [
        k,
        t('div', S, [
          t(
            'button',
            {
              id: 'addcont',
              onClick: e[0] || (e[0] = (...o) => s.addone && s.addone(...o)),
            },
            '+',
          ),
        ]),
      ]),
      t('div', b, [
        (c(!0),
        n(
          f,
          null,
          m(
            _.contactorList,
            (o, i) => (
              c(),
              n(
                'div',
                {
                  onClick: (j) => d.showChat(o.id),
                  key: i,
                  class: 'lists',
                  id: d.getId(i),
                },
                [
                  t('div', B, [
                    t('img', { src: o.avatar, alt: o.name }, null, 8, x),
                  ]),
                  t('div', V, [
                    t('div', z, r(o.name), 1),
                    t('div', F, r(o.getLastTime()), 1),
                    t('div', M, r(o.getLastContent()), 1),
                  ]),
                ],
                8,
                y,
              )
            ),
          ),
          128,
        )),
      ]),
    ])
  )
}
const D = h($, [
    ['render', N],
    ['__scopeId', 'data-v-f64430d5'],
  ]),
  E = {
    data() {
      return {}
    },
    components: { friendlist: D },
  },
  H = { id: 'main' }
function T(s, e, a, u, _, d) {
  const o = p('friendlist'),
    i = p('router-view')
  return c(), n('div', H, [l(o), l(i)])
}
const A = h(E, [['render', T]])
export { A as default }
