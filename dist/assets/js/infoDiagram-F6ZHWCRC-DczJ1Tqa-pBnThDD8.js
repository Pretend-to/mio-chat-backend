import {
  Gn as r,
  Kn as e,
  On as a,
  f as t,
  h as s,
} from './vendor_editor_preview-Ccdt85Fz.js'
import { r as n } from './mermaid-parser.core-C45JiJ5u-CB90PcCy.js'
var i = {
    parse: r(async (r) => {
      let a = await n('info', r)
      e.debug(a)
    }, 'parse'),
  },
  o = { version: s.version + '' },
  d = {
    parser: i,
    db: { getVersion: r(() => o.version, 'getVersion') },
    renderer: {
      draw: r((r, s, n) => {
        e.debug('rendering info diagram\n' + r)
        let i = t(s)
        ;(a(i, 100, 400, !0),
          i
            .append('g')
            .append('text')
            .attr('x', 100)
            .attr('y', 40)
            .attr('class', 'version')
            .attr('font-size', 32)
            .style('text-anchor', 'middle')
            .text(`v${n}`))
      }, 'draw'),
    },
  }
export { d as diagram }
//# sourceMappingURL=infoDiagram-F6ZHWCRC-DczJ1Tqa-pBnThDD8.js.map
