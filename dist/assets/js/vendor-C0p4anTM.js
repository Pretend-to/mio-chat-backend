var A =
    'object' == typeof global && global && global.Object === Object && global,
  e = 'object' == typeof self && self && self.Object === Object && self,
  t = A || e || Function('return this')(),
  r = t.Symbol,
  n = Object.prototype,
  i = n.hasOwnProperty,
  o = n.toString,
  s = r ? r.toStringTag : void 0
var a = Object.prototype.toString
var c = r ? r.toStringTag : void 0
function u(A) {
  return null == A
    ? void 0 === A
      ? '[object Undefined]'
      : '[object Null]'
    : c && c in Object(A)
      ? (function (A) {
          var e = i.call(A, s),
            t = A[s]
          try {
            A[s] = void 0
            var r = !0
          } catch (fi) {}
          var n = o.call(A)
          return (r && (e ? (A[s] = t) : delete A[s]), n)
        })(A)
      : (function (A) {
          return a.call(A)
        })(A)
}
function l(A) {
  return null != A && 'object' == typeof A
}
function h(A) {
  return 'symbol' == typeof A || (l(A) && '[object Symbol]' == u(A))
}
function f(A, e) {
  for (var t = -1, r = null == A ? 0 : A.length, n = Array(r); ++t < r; )
    n[t] = e(A[t], t, A)
  return n
}
var d = Array.isArray,
  B = r ? r.prototype : void 0,
  p = B ? B.toString : void 0
function g(A) {
  if ('string' == typeof A) return A
  if (d(A)) return f(A, g) + ''
  if (h(A)) return p ? p.call(A) : ''
  var e = A + ''
  return '0' == e && 1 / A == -Infinity ? '-0' : e
}
var w = /\s/
var m = /^\s+/
function C(A) {
  return A
    ? A.slice(
        0,
        (function (A) {
          for (var e = A.length; e-- && w.test(A.charAt(e)); );
          return e
        })(A) + 1,
      ).replace(m, '')
    : A
}
function y(A) {
  var e = typeof A
  return null != A && ('object' == e || 'function' == e)
}
var Q = /^[-+]0x[0-9a-f]+$/i,
  F = /^0b[01]+$/i,
  U = /^0o[0-7]+$/i,
  v = parseInt
function b(A) {
  if ('number' == typeof A) return A
  if (h(A)) return NaN
  if (y(A)) {
    var e = 'function' == typeof A.valueOf ? A.valueOf() : A
    A = y(e) ? e + '' : e
  }
  if ('string' != typeof A) return 0 === A ? A : +A
  A = C(A)
  var t = F.test(A)
  return t || U.test(A) ? v(A.slice(2), t ? 2 : 8) : Q.test(A) ? NaN : +A
}
function E(A) {
  return A
}
function H(A) {
  if (!y(A)) return !1
  var e = u(A)
  return (
    '[object Function]' == e ||
    '[object GeneratorFunction]' == e ||
    '[object AsyncFunction]' == e ||
    '[object Proxy]' == e
  )
}
var _,
  I = t['__core-js_shared__'],
  D = (_ = /[^.]+$/.exec((I && I.keys && I.keys.IE_PROTO) || ''))
    ? 'Symbol(src)_1.' + _
    : ''
var x = Function.prototype.toString
function k(A) {
  if (null != A) {
    try {
      return x.call(A)
    } catch (fi) {}
    try {
      return A + ''
    } catch (fi) {}
  }
  return ''
}
var L = /^\[object .+?Constructor\]$/,
  S = Function.prototype,
  O = Object.prototype,
  K = S.toString,
  T = O.hasOwnProperty,
  M = RegExp(
    '^' +
      K.call(T)
        .replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
        .replace(
          /hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,
          '$1.*?',
        ) +
      '$',
  )
function R(A) {
  return !(!y(A) || ((e = A), D && D in e)) && (H(A) ? M : L).test(k(A))
  var e
}
function N(A, e) {
  var t = (function (A, e) {
    return null == A ? void 0 : A[e]
  })(A, e)
  return R(t) ? t : void 0
}
var P = N(t, 'WeakMap'),
  V = Object.create,
  G = (function () {
    function A() {}
    return function (e) {
      if (!y(e)) return {}
      if (V) return V(e)
      A.prototype = e
      var t = new A()
      return ((A.prototype = void 0), t)
    }
  })()
function z(A, e) {
  var t = -1,
    r = A.length
  for (e || (e = Array(r)); ++t < r; ) e[t] = A[t]
  return e
}
var j = Date.now
var W,
  q,
  X,
  J = (function () {
    try {
      var A = N(Object, 'defineProperty')
      return (A({}, '', {}), A)
    } catch (fi) {}
  })(),
  Y = J
    ? function (A, e) {
        return J(A, 'toString', {
          configurable: !0,
          enumerable: !1,
          value:
            ((t = e),
            function () {
              return t
            }),
          writable: !0,
        })
        var t
      }
    : E,
  Z =
    ((W = Y),
    (q = 0),
    (X = 0),
    function () {
      var A = j(),
        e = 16 - (A - X)
      if (((X = A), e > 0)) {
        if (++q >= 800) return arguments[0]
      } else q = 0
      return W.apply(void 0, arguments)
    })
function $(A, e, t, r) {
  for (var n = A.length, i = t + (r ? 1 : -1); r ? i-- : ++i < n; )
    if (e(A[i], i, A)) return i
  return -1
}
function AA(A) {
  return A != A
}
function eA(A, e) {
  return (
    !!(null == A ? 0 : A.length) &&
    (function (A, e, t) {
      return e == e
        ? (function (A, e, t) {
            for (var r = t - 1, n = A.length; ++r < n; )
              if (A[r] === e) return r
            return -1
          })(A, e, t)
        : $(A, AA, t)
    })(A, e, 0) > -1
  )
}
var tA = /^(?:0|[1-9]\d*)$/
function rA(A, e) {
  var t = typeof A
  return (
    !!(e = null == e ? 9007199254740991 : e) &&
    ('number' == t || ('symbol' != t && tA.test(A))) &&
    A > -1 &&
    A % 1 == 0 &&
    A < e
  )
}
function nA(A, e, t) {
  '__proto__' == e && J
    ? J(A, e, { configurable: !0, enumerable: !0, value: t, writable: !0 })
    : (A[e] = t)
}
function iA(A, e) {
  return A === e || (A != A && e != e)
}
var oA = Object.prototype.hasOwnProperty
function sA(A, e, t) {
  var r = A[e]
  ;(oA.call(A, e) && iA(r, t) && (void 0 !== t || e in A)) || nA(A, e, t)
}
function aA(A, e, t, r) {
  var n = !t
  t || (t = {})
  for (var i = -1, o = e.length; ++i < o; ) {
    var s = e[i],
      a = void 0
    ;(void 0 === a && (a = A[s]), n ? nA(t, s, a) : sA(t, s, a))
  }
  return t
}
var cA = Math.max
function uA(A, e, t) {
  return (
    (e = cA(void 0 === e ? A.length - 1 : e, 0)),
    function () {
      for (
        var r = arguments, n = -1, i = cA(r.length - e, 0), o = Array(i);
        ++n < i;

      )
        o[n] = r[e + n]
      n = -1
      for (var s = Array(e + 1); ++n < e; ) s[n] = r[n]
      return (
        (s[e] = t(o)),
        (function (A, e, t) {
          switch (t.length) {
            case 0:
              return A.call(e)
            case 1:
              return A.call(e, t[0])
            case 2:
              return A.call(e, t[0], t[1])
            case 3:
              return A.call(e, t[0], t[1], t[2])
          }
          return A.apply(e, t)
        })(A, this, s)
      )
    }
  )
}
function lA(A, e) {
  return Z(uA(A, e, E), A + '')
}
function hA(A) {
  return 'number' == typeof A && A > -1 && A % 1 == 0 && A <= 9007199254740991
}
function fA(A) {
  return null != A && hA(A.length) && !H(A)
}
var dA = Object.prototype
function BA(A) {
  var e = A && A.constructor
  return A === (('function' == typeof e && e.prototype) || dA)
}
function pA(A) {
  return l(A) && '[object Arguments]' == u(A)
}
var gA = Object.prototype,
  wA = gA.hasOwnProperty,
  mA = gA.propertyIsEnumerable,
  CA = pA(
    (function () {
      return arguments
    })(),
  )
    ? pA
    : function (A) {
        return l(A) && wA.call(A, 'callee') && !mA.call(A, 'callee')
      }
var yA = 'object' == typeof exports && exports && !exports.nodeType && exports,
  QA = yA && 'object' == typeof module && module && !module.nodeType && module,
  FA = QA && QA.exports === yA ? t.Buffer : void 0,
  UA =
    (FA ? FA.isBuffer : void 0) ||
    function () {
      return !1
    },
  vA = {}
function bA(A) {
  return function (e) {
    return A(e)
  }
}
;((vA['[object Float32Array]'] =
  vA['[object Float64Array]'] =
  vA['[object Int8Array]'] =
  vA['[object Int16Array]'] =
  vA['[object Int32Array]'] =
  vA['[object Uint8Array]'] =
  vA['[object Uint8ClampedArray]'] =
  vA['[object Uint16Array]'] =
  vA['[object Uint32Array]'] =
    !0),
  (vA['[object Arguments]'] =
    vA['[object Array]'] =
    vA['[object ArrayBuffer]'] =
    vA['[object Boolean]'] =
    vA['[object DataView]'] =
    vA['[object Date]'] =
    vA['[object Error]'] =
    vA['[object Function]'] =
    vA['[object Map]'] =
    vA['[object Number]'] =
    vA['[object Object]'] =
    vA['[object RegExp]'] =
    vA['[object Set]'] =
    vA['[object String]'] =
    vA['[object WeakMap]'] =
      !1))
var EA = 'object' == typeof exports && exports && !exports.nodeType && exports,
  HA = EA && 'object' == typeof module && module && !module.nodeType && module,
  _A = HA && HA.exports === EA && A.process,
  IA = (function () {
    try {
      var A = HA && HA.require && HA.require('util').types
      return A || (_A && _A.binding && _A.binding('util'))
    } catch (fi) {}
  })(),
  DA = IA && IA.isTypedArray,
  xA = DA
    ? bA(DA)
    : function (A) {
        return l(A) && hA(A.length) && !!vA[u(A)]
      },
  kA = Object.prototype.hasOwnProperty
function LA(A, e) {
  var t = d(A),
    r = !t && CA(A),
    n = !t && !r && UA(A),
    i = !t && !r && !n && xA(A),
    o = t || r || n || i,
    s = o
      ? (function (A, e) {
          for (var t = -1, r = Array(A); ++t < A; ) r[t] = e(t)
          return r
        })(A.length, String)
      : [],
    a = s.length
  for (var c in A)
    (!e && !kA.call(A, c)) ||
      (o &&
        ('length' == c ||
          (n && ('offset' == c || 'parent' == c)) ||
          (i && ('buffer' == c || 'byteLength' == c || 'byteOffset' == c)) ||
          rA(c, a))) ||
      s.push(c)
  return s
}
function SA(A, e) {
  return function (t) {
    return A(e(t))
  }
}
var OA = SA(Object.keys, Object),
  KA = Object.prototype.hasOwnProperty
function TA(A) {
  return fA(A)
    ? LA(A)
    : (function (A) {
        if (!BA(A)) return OA(A)
        var e = []
        for (var t in Object(A))
          KA.call(A, t) && 'constructor' != t && e.push(t)
        return e
      })(A)
}
var MA = Object.prototype.hasOwnProperty
function RA(A) {
  if (!y(A))
    return (function (A) {
      var e = []
      if (null != A) for (var t in Object(A)) e.push(t)
      return e
    })(A)
  var e = BA(A),
    t = []
  for (var r in A) ('constructor' != r || (!e && MA.call(A, r))) && t.push(r)
  return t
}
function NA(A) {
  return fA(A) ? LA(A, !0) : RA(A)
}
var PA = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
  VA = /^\w*$/
function GA(A, e) {
  if (d(A)) return !1
  var t = typeof A
  return (
    !('number' != t && 'symbol' != t && 'boolean' != t && null != A && !h(A)) ||
    VA.test(A) ||
    !PA.test(A) ||
    (null != e && A in Object(e))
  )
}
var zA = N(Object, 'create')
var jA = Object.prototype.hasOwnProperty
var WA = Object.prototype.hasOwnProperty
function qA(A) {
  var e = -1,
    t = null == A ? 0 : A.length
  for (this.clear(); ++e < t; ) {
    var r = A[e]
    this.set(r[0], r[1])
  }
}
function XA(A, e) {
  for (var t = A.length; t--; ) if (iA(A[t][0], e)) return t
  return -1
}
;((qA.prototype.clear = function () {
  ;((this.__data__ = zA ? zA(null) : {}), (this.size = 0))
}),
  (qA.prototype.delete = function (A) {
    var e = this.has(A) && delete this.__data__[A]
    return ((this.size -= e ? 1 : 0), e)
  }),
  (qA.prototype.get = function (A) {
    var e = this.__data__
    if (zA) {
      var t = e[A]
      return '__lodash_hash_undefined__' === t ? void 0 : t
    }
    return jA.call(e, A) ? e[A] : void 0
  }),
  (qA.prototype.has = function (A) {
    var e = this.__data__
    return zA ? void 0 !== e[A] : WA.call(e, A)
  }),
  (qA.prototype.set = function (A, e) {
    var t = this.__data__
    return (
      (this.size += this.has(A) ? 0 : 1),
      (t[A] = zA && void 0 === e ? '__lodash_hash_undefined__' : e),
      this
    )
  }))
var JA = Array.prototype.splice
function YA(A) {
  var e = -1,
    t = null == A ? 0 : A.length
  for (this.clear(); ++e < t; ) {
    var r = A[e]
    this.set(r[0], r[1])
  }
}
;((YA.prototype.clear = function () {
  ;((this.__data__ = []), (this.size = 0))
}),
  (YA.prototype.delete = function (A) {
    var e = this.__data__,
      t = XA(e, A)
    return (
      !(t < 0) &&
      (t == e.length - 1 ? e.pop() : JA.call(e, t, 1), --this.size, !0)
    )
  }),
  (YA.prototype.get = function (A) {
    var e = this.__data__,
      t = XA(e, A)
    return t < 0 ? void 0 : e[t][1]
  }),
  (YA.prototype.has = function (A) {
    return XA(this.__data__, A) > -1
  }),
  (YA.prototype.set = function (A, e) {
    var t = this.__data__,
      r = XA(t, A)
    return (r < 0 ? (++this.size, t.push([A, e])) : (t[r][1] = e), this)
  }))
var ZA = N(t, 'Map')
function $A(A, e) {
  var t,
    r,
    n = A.__data__
  return (
    'string' == (r = typeof (t = e)) ||
    'number' == r ||
    'symbol' == r ||
    'boolean' == r
      ? '__proto__' !== t
      : null === t
  )
    ? n['string' == typeof e ? 'string' : 'hash']
    : n.map
}
function Ae(A) {
  var e = -1,
    t = null == A ? 0 : A.length
  for (this.clear(); ++e < t; ) {
    var r = A[e]
    this.set(r[0], r[1])
  }
}
;((Ae.prototype.clear = function () {
  ;((this.size = 0),
    (this.__data__ = {
      hash: new qA(),
      map: new (ZA || YA)(),
      string: new qA(),
    }))
}),
  (Ae.prototype.delete = function (A) {
    var e = $A(this, A).delete(A)
    return ((this.size -= e ? 1 : 0), e)
  }),
  (Ae.prototype.get = function (A) {
    return $A(this, A).get(A)
  }),
  (Ae.prototype.has = function (A) {
    return $A(this, A).has(A)
  }),
  (Ae.prototype.set = function (A, e) {
    var t = $A(this, A),
      r = t.size
    return (t.set(A, e), (this.size += t.size == r ? 0 : 1), this)
  }))
function ee(A, e) {
  if ('function' != typeof A || (null != e && 'function' != typeof e))
    throw new TypeError('Expected a function')
  var t = function () {
    var r = arguments,
      n = e ? e.apply(this, r) : r[0],
      i = t.cache
    if (i.has(n)) return i.get(n)
    var o = A.apply(this, r)
    return ((t.cache = i.set(n, o) || i), o)
  }
  return ((t.cache = new (ee.Cache || Ae)()), t)
}
ee.Cache = Ae
var te =
    /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g,
  re = /\\(\\)?/g,
  ne = (function (A) {
    var e = ee(A, function (A) {
        return (500 === t.size && t.clear(), A)
      }),
      t = e.cache
    return e
  })(function (A) {
    var e = []
    return (
      46 === A.charCodeAt(0) && e.push(''),
      A.replace(te, function (A, t, r, n) {
        e.push(r ? n.replace(re, '$1') : t || A)
      }),
      e
    )
  })
function ie(A, e) {
  return d(A)
    ? A
    : GA(A, e)
      ? [A]
      : ne(
          (function (A) {
            return null == A ? '' : g(A)
          })(A),
        )
}
function oe(A) {
  if ('string' == typeof A || h(A)) return A
  var e = A + ''
  return '0' == e && 1 / A == -Infinity ? '-0' : e
}
function se(A, e) {
  for (var t = 0, r = (e = ie(e, A)).length; null != A && t < r; )
    A = A[oe(e[t++])]
  return t && t == r ? A : void 0
}
function ae(A, e, t) {
  var r = null == A ? void 0 : se(A, e)
  return void 0 === r ? t : r
}
function ce(A, e) {
  for (var t = -1, r = e.length, n = A.length; ++t < r; ) A[n + t] = e[t]
  return A
}
var ue = r ? r.isConcatSpreadable : void 0
function le(A) {
  return d(A) || CA(A) || !!(ue && A && A[ue])
}
function he(A, e, t, r, n) {
  var i = -1,
    o = A.length
  for (t || (t = le), n || (n = []); ++i < o; ) {
    var s = A[i]
    e > 0 && t(s)
      ? e > 1
        ? he(s, e - 1, t, r, n)
        : ce(n, s)
      : r || (n[n.length] = s)
  }
  return n
}
function fe(A) {
  return (null == A ? 0 : A.length) ? he(A, 1) : []
}
function de(A) {
  return Z(uA(A, void 0, fe), A + '')
}
var Be = SA(Object.getPrototypeOf, Object),
  pe = Function.prototype,
  ge = Object.prototype,
  we = pe.toString,
  me = ge.hasOwnProperty,
  Ce = we.call(Object)
function ye(A) {
  if (!l(A) || '[object Object]' != u(A)) return !1
  var e = Be(A)
  if (null === e) return !0
  var t = me.call(e, 'constructor') && e.constructor
  return 'function' == typeof t && t instanceof t && we.call(t) == Ce
}
function Qe() {
  if (!arguments.length) return []
  var A = arguments[0]
  return d(A) ? A : [A]
}
function Fe(A) {
  var e = (this.__data__ = new YA(A))
  this.size = e.size
}
;((Fe.prototype.clear = function () {
  ;((this.__data__ = new YA()), (this.size = 0))
}),
  (Fe.prototype.delete = function (A) {
    var e = this.__data__,
      t = e.delete(A)
    return ((this.size = e.size), t)
  }),
  (Fe.prototype.get = function (A) {
    return this.__data__.get(A)
  }),
  (Fe.prototype.has = function (A) {
    return this.__data__.has(A)
  }),
  (Fe.prototype.set = function (A, e) {
    var t = this.__data__
    if (t instanceof YA) {
      var r = t.__data__
      if (!ZA || r.length < 199)
        return (r.push([A, e]), (this.size = ++t.size), this)
      t = this.__data__ = new Ae(r)
    }
    return (t.set(A, e), (this.size = t.size), this)
  }))
var Ue = 'object' == typeof exports && exports && !exports.nodeType && exports,
  ve = Ue && 'object' == typeof module && module && !module.nodeType && module,
  be = ve && ve.exports === Ue ? t.Buffer : void 0,
  Ee = be ? be.allocUnsafe : void 0
function He(A, e) {
  if (e) return A.slice()
  var t = A.length,
    r = Ee ? Ee(t) : new A.constructor(t)
  return (A.copy(r), r)
}
function _e() {
  return []
}
var Ie = Object.prototype.propertyIsEnumerable,
  De = Object.getOwnPropertySymbols,
  xe = De
    ? function (A) {
        return null == A
          ? []
          : ((A = Object(A)),
            (function (A, e) {
              for (
                var t = -1, r = null == A ? 0 : A.length, n = 0, i = [];
                ++t < r;

              ) {
                var o = A[t]
                e(o, t, A) && (i[n++] = o)
              }
              return i
            })(De(A), function (e) {
              return Ie.call(A, e)
            }))
      }
    : _e
var ke = Object.getOwnPropertySymbols
  ? function (A) {
      for (var e = []; A; ) (ce(e, xe(A)), (A = Be(A)))
      return e
    }
  : _e
function Le(A, e, t) {
  var r = e(A)
  return d(A) ? r : ce(r, t(A))
}
function Se(A) {
  return Le(A, TA, xe)
}
function Oe(A) {
  return Le(A, NA, ke)
}
var Ke = N(t, 'DataView'),
  Te = N(t, 'Promise'),
  Me = N(t, 'Set'),
  Re = '[object Map]',
  Ne = '[object Promise]',
  Pe = '[object Set]',
  Ve = '[object WeakMap]',
  Ge = '[object DataView]',
  ze = k(Ke),
  je = k(ZA),
  We = k(Te),
  qe = k(Me),
  Xe = k(P),
  Je = u
;((Ke && Je(new Ke(new ArrayBuffer(1))) != Ge) ||
  (ZA && Je(new ZA()) != Re) ||
  (Te && Je(Te.resolve()) != Ne) ||
  (Me && Je(new Me()) != Pe) ||
  (P && Je(new P()) != Ve)) &&
  (Je = function (A) {
    var e = u(A),
      t = '[object Object]' == e ? A.constructor : void 0,
      r = t ? k(t) : ''
    if (r)
      switch (r) {
        case ze:
          return Ge
        case je:
          return Re
        case We:
          return Ne
        case qe:
          return Pe
        case Xe:
          return Ve
      }
    return e
  })
var Ye = Object.prototype.hasOwnProperty
var Ze = t.Uint8Array
function $e(A) {
  var e = new A.constructor(A.byteLength)
  return (new Ze(e).set(new Ze(A)), e)
}
var At = /\w*$/
var et = r ? r.prototype : void 0,
  tt = et ? et.valueOf : void 0
function rt(A, e) {
  var t = e ? $e(A.buffer) : A.buffer
  return new A.constructor(t, A.byteOffset, A.length)
}
function nt(A, e, t) {
  var r,
    n,
    i,
    o = A.constructor
  switch (e) {
    case '[object ArrayBuffer]':
      return $e(A)
    case '[object Boolean]':
    case '[object Date]':
      return new o(+A)
    case '[object DataView]':
      return (function (A, e) {
        var t = e ? $e(A.buffer) : A.buffer
        return new A.constructor(t, A.byteOffset, A.byteLength)
      })(A, t)
    case '[object Float32Array]':
    case '[object Float64Array]':
    case '[object Int8Array]':
    case '[object Int16Array]':
    case '[object Int32Array]':
    case '[object Uint8Array]':
    case '[object Uint8ClampedArray]':
    case '[object Uint16Array]':
    case '[object Uint32Array]':
      return rt(A, t)
    case '[object Map]':
    case '[object Set]':
      return new o()
    case '[object Number]':
    case '[object String]':
      return new o(A)
    case '[object RegExp]':
      return (
        ((i = new (n = A).constructor(n.source, At.exec(n))).lastIndex =
          n.lastIndex),
        i
      )
    case '[object Symbol]':
      return ((r = A), tt ? Object(tt.call(r)) : {})
  }
}
function it(A) {
  return 'function' != typeof A.constructor || BA(A) ? {} : G(Be(A))
}
var ot = IA && IA.isMap,
  st = ot
    ? bA(ot)
    : function (A) {
        return l(A) && '[object Map]' == Je(A)
      }
var at = IA && IA.isSet,
  ct = at
    ? bA(at)
    : function (A) {
        return l(A) && '[object Set]' == Je(A)
      },
  ut = '[object Arguments]',
  lt = '[object Function]',
  ht = '[object Object]',
  ft = {}
function dt(A, e, t, r, n, i) {
  var o,
    s = 1 & e,
    a = 2 & e,
    c = 4 & e
  if ((t && (o = n ? t(A, r, n, i) : t(A)), void 0 !== o)) return o
  if (!y(A)) return A
  var u = d(A)
  if (u) {
    if (
      ((o = (function (A) {
        var e = A.length,
          t = new A.constructor(e)
        return (
          e &&
            'string' == typeof A[0] &&
            Ye.call(A, 'index') &&
            ((t.index = A.index), (t.input = A.input)),
          t
        )
      })(A)),
      !s)
    )
      return z(A, o)
  } else {
    var l = Je(A),
      h = l == lt || '[object GeneratorFunction]' == l
    if (UA(A)) return He(A, s)
    if (l == ht || l == ut || (h && !n)) {
      if (((o = a || h ? {} : it(A)), !s))
        return a
          ? (function (A, e) {
              return aA(A, ke(A), e)
            })(
              A,
              (function (A, e) {
                return A && aA(e, NA(e), A)
              })(o, A),
            )
          : (function (A, e) {
              return aA(A, xe(A), e)
            })(
              A,
              (function (A, e) {
                return A && aA(e, TA(e), A)
              })(o, A),
            )
    } else {
      if (!ft[l]) return n ? A : {}
      o = nt(A, l, s)
    }
  }
  i || (i = new Fe())
  var f = i.get(A)
  if (f) return f
  ;(i.set(A, o),
    ct(A)
      ? A.forEach(function (r) {
          o.add(dt(r, e, t, r, A, i))
        })
      : st(A) &&
        A.forEach(function (r, n) {
          o.set(n, dt(r, e, t, n, A, i))
        }))
  var B = u ? void 0 : (c ? (a ? Oe : Se) : a ? NA : TA)(A)
  return (
    (function (A, e) {
      for (
        var t = -1, r = null == A ? 0 : A.length;
        ++t < r && !1 !== e(A[t], t, A);

      );
    })(B || A, function (r, n) {
      ;(B && (r = A[(n = r)]), sA(o, n, dt(r, e, t, n, A, i)))
    }),
    o
  )
}
;((ft[ut] =
  ft['[object Array]'] =
  ft['[object ArrayBuffer]'] =
  ft['[object DataView]'] =
  ft['[object Boolean]'] =
  ft['[object Date]'] =
  ft['[object Float32Array]'] =
  ft['[object Float64Array]'] =
  ft['[object Int8Array]'] =
  ft['[object Int16Array]'] =
  ft['[object Int32Array]'] =
  ft['[object Map]'] =
  ft['[object Number]'] =
  ft[ht] =
  ft['[object RegExp]'] =
  ft['[object Set]'] =
  ft['[object String]'] =
  ft['[object Symbol]'] =
  ft['[object Uint8Array]'] =
  ft['[object Uint8ClampedArray]'] =
  ft['[object Uint16Array]'] =
  ft['[object Uint32Array]'] =
    !0),
  (ft['[object Error]'] = ft[lt] = ft['[object WeakMap]'] = !1))
function Bt(A) {
  return dt(A, 4)
}
function pt(A) {
  return dt(A, 5)
}
function gt(A) {
  var e = -1,
    t = null == A ? 0 : A.length
  for (this.__data__ = new Ae(); ++e < t; ) this.add(A[e])
}
function wt(A, e) {
  for (var t = -1, r = null == A ? 0 : A.length; ++t < r; )
    if (e(A[t], t, A)) return !0
  return !1
}
function mt(A, e) {
  return A.has(e)
}
;((gt.prototype.add = gt.prototype.push =
  function (A) {
    return (this.__data__.set(A, '__lodash_hash_undefined__'), this)
  }),
  (gt.prototype.has = function (A) {
    return this.__data__.has(A)
  }))
function Ct(A, e, t, r, n, i) {
  var o = 1 & t,
    s = A.length,
    a = e.length
  if (s != a && !(o && a > s)) return !1
  var c = i.get(A),
    u = i.get(e)
  if (c && u) return c == e && u == A
  var l = -1,
    h = !0,
    f = 2 & t ? new gt() : void 0
  for (i.set(A, e), i.set(e, A); ++l < s; ) {
    var d = A[l],
      B = e[l]
    if (r) var p = o ? r(B, d, l, e, A, i) : r(d, B, l, A, e, i)
    if (void 0 !== p) {
      if (p) continue
      h = !1
      break
    }
    if (f) {
      if (
        !wt(e, function (A, e) {
          if (!mt(f, e) && (d === A || n(d, A, t, r, i))) return f.push(e)
        })
      ) {
        h = !1
        break
      }
    } else if (d !== B && !n(d, B, t, r, i)) {
      h = !1
      break
    }
  }
  return (i.delete(A), i.delete(e), h)
}
function yt(A) {
  var e = -1,
    t = Array(A.size)
  return (
    A.forEach(function (A, r) {
      t[++e] = [r, A]
    }),
    t
  )
}
function Qt(A) {
  var e = -1,
    t = Array(A.size)
  return (
    A.forEach(function (A) {
      t[++e] = A
    }),
    t
  )
}
var Ft = r ? r.prototype : void 0,
  Ut = Ft ? Ft.valueOf : void 0
var vt = Object.prototype.hasOwnProperty
var bt = '[object Arguments]',
  Et = '[object Array]',
  Ht = '[object Object]',
  _t = Object.prototype.hasOwnProperty
function It(A, e, t, r, n, i) {
  var o = d(A),
    s = d(e),
    a = o ? Et : Je(A),
    c = s ? Et : Je(e),
    u = (a = a == bt ? Ht : a) == Ht,
    l = (c = c == bt ? Ht : c) == Ht,
    h = a == c
  if (h && UA(A)) {
    if (!UA(e)) return !1
    ;((o = !0), (u = !1))
  }
  if (h && !u)
    return (
      i || (i = new Fe()),
      o || xA(A)
        ? Ct(A, e, t, r, n, i)
        : (function (A, e, t, r, n, i, o) {
            switch (t) {
              case '[object DataView]':
                if (
                  A.byteLength != e.byteLength ||
                  A.byteOffset != e.byteOffset
                )
                  return !1
                ;((A = A.buffer), (e = e.buffer))
              case '[object ArrayBuffer]':
                return !(
                  A.byteLength != e.byteLength || !i(new Ze(A), new Ze(e))
                )
              case '[object Boolean]':
              case '[object Date]':
              case '[object Number]':
                return iA(+A, +e)
              case '[object Error]':
                return A.name == e.name && A.message == e.message
              case '[object RegExp]':
              case '[object String]':
                return A == e + ''
              case '[object Map]':
                var s = yt
              case '[object Set]':
                var a = 1 & r
                if ((s || (s = Qt), A.size != e.size && !a)) return !1
                var c = o.get(A)
                if (c) return c == e
                ;((r |= 2), o.set(A, e))
                var u = Ct(s(A), s(e), r, n, i, o)
                return (o.delete(A), u)
              case '[object Symbol]':
                if (Ut) return Ut.call(A) == Ut.call(e)
            }
            return !1
          })(A, e, a, t, r, n, i)
    )
  if (!(1 & t)) {
    var f = u && _t.call(A, '__wrapped__'),
      B = l && _t.call(e, '__wrapped__')
    if (f || B) {
      var p = f ? A.value() : A,
        g = B ? e.value() : e
      return (i || (i = new Fe()), n(p, g, t, r, i))
    }
  }
  return (
    !!h &&
    (i || (i = new Fe()),
    (function (A, e, t, r, n, i) {
      var o = 1 & t,
        s = Se(A),
        a = s.length
      if (a != Se(e).length && !o) return !1
      for (var c = a; c--; ) {
        var u = s[c]
        if (!(o ? u in e : vt.call(e, u))) return !1
      }
      var l = i.get(A),
        h = i.get(e)
      if (l && h) return l == e && h == A
      var f = !0
      ;(i.set(A, e), i.set(e, A))
      for (var d = o; ++c < a; ) {
        var B = A[(u = s[c])],
          p = e[u]
        if (r) var g = o ? r(p, B, u, e, A, i) : r(B, p, u, A, e, i)
        if (!(void 0 === g ? B === p || n(B, p, t, r, i) : g)) {
          f = !1
          break
        }
        d || (d = 'constructor' == u)
      }
      if (f && !d) {
        var w = A.constructor,
          m = e.constructor
        w == m ||
          !('constructor' in A) ||
          !('constructor' in e) ||
          ('function' == typeof w &&
            w instanceof w &&
            'function' == typeof m &&
            m instanceof m) ||
          (f = !1)
      }
      return (i.delete(A), i.delete(e), f)
    })(A, e, t, r, n, i))
  )
}
function Dt(A, e, t, r, n) {
  return (
    A === e ||
    (null == A || null == e || (!l(A) && !l(e))
      ? A != A && e != e
      : It(A, e, t, r, Dt, n))
  )
}
function xt(A) {
  return A == A && !y(A)
}
function kt(A, e) {
  return function (t) {
    return null != t && t[A] === e && (void 0 !== e || A in Object(t))
  }
}
function Lt(A) {
  var e = (function (A) {
    for (var e = TA(A), t = e.length; t--; ) {
      var r = e[t],
        n = A[r]
      e[t] = [r, n, xt(n)]
    }
    return e
  })(A)
  return 1 == e.length && e[0][2]
    ? kt(e[0][0], e[0][1])
    : function (t) {
        return (
          t === A ||
          (function (A, e, t, r) {
            var n = t.length,
              i = n
            if (null == A) return !i
            for (A = Object(A); n--; ) {
              var o = t[n]
              if (o[2] ? o[1] !== A[o[0]] : !(o[0] in A)) return !1
            }
            for (; ++n < i; ) {
              var s = (o = t[n])[0],
                a = A[s],
                c = o[1]
              if (o[2]) {
                if (void 0 === a && !(s in A)) return !1
              } else if (!Dt(c, a, 3, r, new Fe())) return !1
            }
            return !0
          })(t, 0, e)
        )
      }
}
function St(A, e) {
  return null != A && e in Object(A)
}
function Ot(A, e) {
  return (
    null != A &&
    (function (A, e, t) {
      for (var r = -1, n = (e = ie(e, A)).length, i = !1; ++r < n; ) {
        var o = oe(e[r])
        if (!(i = null != A && t(A, o))) break
        A = A[o]
      }
      return i || ++r != n
        ? i
        : !!(n = null == A ? 0 : A.length) &&
            hA(n) &&
            rA(o, n) &&
            (d(A) || CA(A))
    })(A, e, St)
  )
}
function Kt(A) {
  return GA(A)
    ? ((e = oe(A)),
      function (A) {
        return null == A ? void 0 : A[e]
      })
    : (function (A) {
        return function (e) {
          return se(e, A)
        }
      })(A)
  var e
}
function Tt(A) {
  return 'function' == typeof A
    ? A
    : null == A
      ? E
      : 'object' == typeof A
        ? d(A)
          ? ((e = A[0]),
            (t = A[1]),
            GA(e) && xt(t)
              ? kt(oe(e), t)
              : function (A) {
                  var r = ae(A, e)
                  return void 0 === r && r === t ? Ot(A, e) : Dt(t, r, 3)
                })
          : Lt(A)
        : Kt(A)
  var e, t
}
var Mt = function (A, e, t) {
  for (var r = -1, n = Object(A), i = t(A), o = i.length; o--; ) {
    var s = i[++r]
    if (!1 === e(n[s], s, n)) break
  }
  return A
}
var Rt,
  Nt =
    ((Rt = function (A, e) {
      return A && Mt(A, e, TA)
    }),
    function (A, e) {
      if (null == A) return A
      if (!fA(A)) return Rt(A, e)
      for (
        var t = A.length, r = -1, n = Object(A);
        ++r < t && !1 !== e(n[r], r, n);

      );
      return A
    }),
  Pt = function () {
    return t.Date.now()
  },
  Vt = Math.max,
  Gt = Math.min
function zt(A, e, t) {
  var r,
    n,
    i,
    o,
    s,
    a,
    c = 0,
    u = !1,
    l = !1,
    h = !0
  if ('function' != typeof A) throw new TypeError('Expected a function')
  function f(e) {
    var t = r,
      i = n
    return ((r = n = void 0), (c = e), (o = A.apply(i, t)))
  }
  function d(A) {
    var t = A - a
    return void 0 === a || t >= e || t < 0 || (l && A - c >= i)
  }
  function B() {
    var A = Pt()
    if (d(A)) return p(A)
    s = setTimeout(
      B,
      (function (A) {
        var t = e - (A - a)
        return l ? Gt(t, i - (A - c)) : t
      })(A),
    )
  }
  function p(A) {
    return ((s = void 0), h && r ? f(A) : ((r = n = void 0), o))
  }
  function g() {
    var A = Pt(),
      t = d(A)
    if (((r = arguments), (n = this), (a = A), t)) {
      if (void 0 === s)
        return (function (A) {
          return ((c = A), (s = setTimeout(B, e)), u ? f(A) : o)
        })(a)
      if (l) return (clearTimeout(s), (s = setTimeout(B, e)), f(a))
    }
    return (void 0 === s && (s = setTimeout(B, e)), o)
  }
  return (
    (e = b(e) || 0),
    y(t) &&
      ((u = !!t.leading),
      (i = (l = 'maxWait' in t) ? Vt(b(t.maxWait) || 0, e) : i),
      (h = 'trailing' in t ? !!t.trailing : h)),
    (g.cancel = function () {
      ;(void 0 !== s && clearTimeout(s), (c = 0), (r = a = n = s = void 0))
    }),
    (g.flush = function () {
      return void 0 === s ? o : p(Pt())
    }),
    g
  )
}
function jt(A, e, t) {
  ;((void 0 !== t && !iA(A[e], t)) || (void 0 === t && !(e in A))) &&
    nA(A, e, t)
}
function Wt(A) {
  return l(A) && fA(A)
}
function qt(A, e) {
  if (('constructor' !== e || 'function' != typeof A[e]) && '__proto__' != e)
    return A[e]
}
function Xt(A, e, t, r, n, i, o) {
  var s = qt(A, t),
    a = qt(e, t),
    c = o.get(a)
  if (c) jt(A, t, c)
  else {
    var u,
      l = i ? i(s, a, t + '', A, e, o) : void 0,
      h = void 0 === l
    if (h) {
      var f = d(a),
        B = !f && UA(a),
        p = !f && !B && xA(a)
      ;((l = a),
        f || B || p
          ? d(s)
            ? (l = s)
            : Wt(s)
              ? (l = z(s))
              : B
                ? ((h = !1), (l = He(a, !0)))
                : p
                  ? ((h = !1), (l = rt(a, !0)))
                  : (l = [])
          : ye(a) || CA(a)
            ? ((l = s),
              CA(s) ? (l = aA((u = s), NA(u))) : (y(s) && !H(s)) || (l = it(a)))
            : (h = !1))
    }
    ;(h && (o.set(a, l), n(l, a, r, i, o), o.delete(a)), jt(A, t, l))
  }
}
function Jt(A, e, t, r, n) {
  A !== e &&
    Mt(
      e,
      function (i, o) {
        if ((n || (n = new Fe()), y(i))) Xt(A, e, o, t, Jt, r, n)
        else {
          var s = r ? r(qt(A, o), i, o + '', A, e, n) : void 0
          ;(void 0 === s && (s = i), jt(A, o, s))
        }
      },
      NA,
    )
}
function Yt(A, e, t) {
  var r = null == A ? 0 : A.length
  if (!r) return -1
  var n = r - 1
  return $(A, Tt(e), n, !0)
}
function Zt(A, e) {
  var t = -1,
    r = fA(A) ? Array(A.length) : []
  return (
    Nt(A, function (A, n, i) {
      r[++t] = e(A, n, i)
    }),
    r
  )
}
function $t(A, e) {
  return he(
    (function (A, e) {
      return (d(A) ? f : Zt)(A, Tt(e))
    })(A, e),
    1,
  )
}
var Ar = 1 / 0
function er(A) {
  return (null == A ? 0 : A.length) ? he(A, Ar) : []
}
function tr(A) {
  for (var e = -1, t = null == A ? 0 : A.length, r = {}; ++e < t; ) {
    var n = A[e]
    r[n[0]] = n[1]
  }
  return r
}
function rr(A, e) {
  return e.length < 2
    ? A
    : se(
        A,
        (function (A, e, t) {
          var r = -1,
            n = A.length
          ;(e < 0 && (e = -e > n ? 0 : n + e),
            (t = t > n ? n : t) < 0 && (t += n),
            (n = e > t ? 0 : (t - e) >>> 0),
            (e >>>= 0))
          for (var i = Array(n); ++r < n; ) i[r] = A[r + e]
          return i
        })(e, 0, -1),
      )
}
function nr(A, e) {
  return Dt(A, e)
}
function ir(A) {
  return null == A
}
function or(A) {
  return null === A
}
function sr(A) {
  return void 0 === A
}
var ar,
  cr =
    ((ar = function (A, e, t) {
      Jt(A, e, t)
    }),
    lA(function (A, e) {
      var t = -1,
        r = e.length,
        n = r > 1 ? e[r - 1] : void 0,
        i = r > 2 ? e[2] : void 0
      for (
        n = ar.length > 3 && 'function' == typeof n ? (r--, n) : void 0,
          i &&
            (function (A, e, t) {
              if (!y(t)) return !1
              var r = typeof e
              return (
                !!('number' == r
                  ? fA(t) && rA(e, t.length)
                  : 'string' == r && (e in t)) && iA(t[e], A)
              )
            })(e[0], e[1], i) &&
            ((n = r < 3 ? void 0 : n), (r = 1)),
          A = Object(A);
        ++t < r;

      ) {
        var o = e[t]
        o && ar(A, o, t, n)
      }
      return A
    }))
function ur(A, e) {
  return (
    null == (A = rr(A, (e = ie(e, A)))) ||
    delete A[
      oe(((t = e), (r = null == t ? 0 : t.length), r ? t[r - 1] : void 0))
    ]
  )
  var t, r
}
function lr(A) {
  return ye(A) ? void 0 : A
}
var hr = de(function (A, e) {
  var t = {}
  if (null == A) return t
  var r = !1
  ;((e = f(e, function (e) {
    return ((e = ie(e, A)), r || (r = e.length > 1), e)
  })),
    aA(A, Oe(A), t),
    r && (t = dt(t, 7, lr)))
  for (var n = e.length; n--; ) ur(t, e[n])
  return t
})
function fr(A, e, t, r) {
  if (!y(A)) return A
  for (
    var n = -1, i = (e = ie(e, A)).length, o = i - 1, s = A;
    null != s && ++n < i;

  ) {
    var a = oe(e[n]),
      c = t
    if ('__proto__' === a || 'constructor' === a || 'prototype' === a) return A
    if (n != o) {
      var u = s[a]
      void 0 === (c = void 0) && (c = y(u) ? u : rA(e[n + 1]) ? [] : {})
    }
    ;(sA(s, a, c), (s = s[a]))
  }
  return A
}
function dr(A, e) {
  return (function (A, e, t) {
    for (var r = -1, n = e.length, i = {}; ++r < n; ) {
      var o = e[r],
        s = se(A, o)
      t(s, o) && fr(i, ie(o, A), s)
    }
    return i
  })(A, e, function (e, t) {
    return Ot(A, t)
  })
}
var Br = de(function (A, e) {
  return null == A ? {} : dr(A, e)
})
function pr(A, e, t) {
  return null == A ? A : fr(A, e, t)
}
function gr(A, e, t) {
  var r = !0,
    n = !0
  if ('function' != typeof A) throw new TypeError('Expected a function')
  return (
    y(t) &&
      ((r = 'leading' in t ? !!t.leading : r),
      (n = 'trailing' in t ? !!t.trailing : n)),
    zt(A, e, { leading: r, maxWait: e, trailing: n })
  )
}
var wr =
  Me && 1 / Qt(new Me([, -0]))[1] == 1 / 0
    ? function (A) {
        return new Me(A)
      }
    : function () {}
var mr = lA(function (A) {
    return (function (A, e, t) {
      var r = -1,
        n = eA,
        i = A.length,
        o = !0,
        s = [],
        a = s
      if (i >= 200) {
        var c = wr(A)
        if (c) return Qt(c)
        ;((o = !1), (n = mt), (a = new gt()))
      } else a = s
      A: for (; ++r < i; ) {
        var u = A[r],
          l = u
        if (((u = 0 !== u ? u : 0), o && l == l)) {
          for (var h = a.length; h--; ) if (a[h] === l) continue A
          s.push(u)
        } else n(a, l, t) || (a !== s && a.push(l), s.push(u))
      }
      return s
    })(he(A, 1, Wt, !0))
  }),
  Cr = 'top',
  yr = 'bottom',
  Qr = 'right',
  Fr = 'left',
  Ur = 'auto',
  vr = [Cr, yr, Qr, Fr],
  br = 'start',
  Er = 'end',
  Hr = 'viewport',
  _r = 'popper',
  Ir = vr.reduce(function (A, e) {
    return A.concat([e + '-' + br, e + '-' + Er])
  }, []),
  Dr = [].concat(vr, [Ur]).reduce(function (A, e) {
    return A.concat([e, e + '-' + br, e + '-' + Er])
  }, []),
  xr = [
    'beforeRead',
    'read',
    'afterRead',
    'beforeMain',
    'main',
    'afterMain',
    'beforeWrite',
    'write',
    'afterWrite',
  ]
function kr(A) {
  return A ? (A.nodeName || '').toLowerCase() : null
}
function Lr(A) {
  if (null == A) return window
  if ('[object Window]' !== A.toString()) {
    var e = A.ownerDocument
    return (e && e.defaultView) || window
  }
  return A
}
function Sr(A) {
  return A instanceof Lr(A).Element || A instanceof Element
}
function Or(A) {
  return A instanceof Lr(A).HTMLElement || A instanceof HTMLElement
}
function Kr(A) {
  return (
    'undefined' != typeof ShadowRoot &&
    (A instanceof Lr(A).ShadowRoot || A instanceof ShadowRoot)
  )
}
var Tr = {
  name: 'applyStyles',
  enabled: !0,
  phase: 'write',
  fn: function (A) {
    var e = A.state
    Object.keys(e.elements).forEach(function (A) {
      var t = e.styles[A] || {},
        r = e.attributes[A] || {},
        n = e.elements[A]
      !Or(n) ||
        !kr(n) ||
        (Object.assign(n.style, t),
        Object.keys(r).forEach(function (A) {
          var e = r[A]
          !1 === e ? n.removeAttribute(A) : n.setAttribute(A, !0 === e ? '' : e)
        }))
    })
  },
  effect: function (A) {
    var e = A.state,
      t = {
        popper: {
          position: e.options.strategy,
          left: '0',
          top: '0',
          margin: '0',
        },
        arrow: { position: 'absolute' },
        reference: {},
      }
    return (
      Object.assign(e.elements.popper.style, t.popper),
      (e.styles = t),
      e.elements.arrow && Object.assign(e.elements.arrow.style, t.arrow),
      function () {
        Object.keys(e.elements).forEach(function (A) {
          var r = e.elements[A],
            n = e.attributes[A] || {},
            i = Object.keys(
              e.styles.hasOwnProperty(A) ? e.styles[A] : t[A],
            ).reduce(function (A, e) {
              return ((A[e] = ''), A)
            }, {})
          !Or(r) ||
            !kr(r) ||
            (Object.assign(r.style, i),
            Object.keys(n).forEach(function (A) {
              r.removeAttribute(A)
            }))
        })
      }
    )
  },
  requires: ['computeStyles'],
}
function Mr(A) {
  return A.split('-')[0]
}
var Rr = Math.max,
  Nr = Math.min,
  Pr = Math.round
function Vr(A, e) {
  void 0 === e && (e = !1)
  var t = A.getBoundingClientRect(),
    r = 1,
    n = 1
  if (Or(A) && e) {
    var i = A.offsetHeight,
      o = A.offsetWidth
    ;(o > 0 && (r = Pr(t.width) / o || 1), i > 0 && (n = Pr(t.height) / i || 1))
  }
  return {
    width: t.width / r,
    height: t.height / n,
    top: t.top / n,
    right: t.right / r,
    bottom: t.bottom / n,
    left: t.left / r,
    x: t.left / r,
    y: t.top / n,
  }
}
function Gr(A) {
  var e = Vr(A),
    t = A.offsetWidth,
    r = A.offsetHeight
  return (
    Math.abs(e.width - t) <= 1 && (t = e.width),
    Math.abs(e.height - r) <= 1 && (r = e.height),
    { x: A.offsetLeft, y: A.offsetTop, width: t, height: r }
  )
}
function zr(A, e) {
  var t = e.getRootNode && e.getRootNode()
  if (A.contains(e)) return !0
  if (t && Kr(t)) {
    var r = e
    do {
      if (r && A.isSameNode(r)) return !0
      r = r.parentNode || r.host
    } while (r)
  }
  return !1
}
function jr(A) {
  return Lr(A).getComputedStyle(A)
}
function Wr(A) {
  return ['table', 'td', 'th'].indexOf(kr(A)) >= 0
}
function qr(A) {
  return ((Sr(A) ? A.ownerDocument : A.document) || window.document)
    .documentElement
}
function Xr(A) {
  return 'html' === kr(A)
    ? A
    : A.assignedSlot || A.parentNode || (Kr(A) ? A.host : null) || qr(A)
}
function Jr(A) {
  return Or(A) && 'fixed' !== jr(A).position ? A.offsetParent : null
}
function Yr(A) {
  for (var e = Lr(A), t = Jr(A); t && Wr(t) && 'static' === jr(t).position; )
    t = Jr(t)
  return t &&
    ('html' === kr(t) || ('body' === kr(t) && 'static' === jr(t).position))
    ? e
    : t ||
        (function (A) {
          var e = -1 !== navigator.userAgent.toLowerCase().indexOf('firefox')
          if (
            -1 !== navigator.userAgent.indexOf('Trident') &&
            Or(A) &&
            'fixed' === jr(A).position
          )
            return null
          var t = Xr(A)
          for (
            Kr(t) && (t = t.host);
            Or(t) && ['html', 'body'].indexOf(kr(t)) < 0;

          ) {
            var r = jr(t)
            if (
              'none' !== r.transform ||
              'none' !== r.perspective ||
              'paint' === r.contain ||
              -1 !== ['transform', 'perspective'].indexOf(r.willChange) ||
              (e && 'filter' === r.willChange) ||
              (e && r.filter && 'none' !== r.filter)
            )
              return t
            t = t.parentNode
          }
          return null
        })(A) ||
        e
}
function Zr(A) {
  return ['top', 'bottom'].indexOf(A) >= 0 ? 'x' : 'y'
}
function $r(A, e, t) {
  return Rr(A, Nr(e, t))
}
function An(A) {
  return Object.assign({}, { top: 0, right: 0, bottom: 0, left: 0 }, A)
}
function en(A, e) {
  return e.reduce(function (e, t) {
    return ((e[t] = A), e)
  }, {})
}
var tn = {
  name: 'arrow',
  enabled: !0,
  phase: 'main',
  fn: function (A) {
    var e,
      t = A.state,
      r = A.name,
      n = A.options,
      i = t.elements.arrow,
      o = t.modifiersData.popperOffsets,
      s = Mr(t.placement),
      a = Zr(s),
      c = [Fr, Qr].indexOf(s) >= 0 ? 'height' : 'width'
    if (i && o) {
      var u = (function (A, e) {
          return An(
            'number' !=
              typeof (A =
                'function' == typeof A
                  ? A(Object.assign({}, e.rects, { placement: e.placement }))
                  : A)
              ? A
              : en(A, vr),
          )
        })(n.padding, t),
        l = Gr(i),
        h = 'y' === a ? Cr : Fr,
        f = 'y' === a ? yr : Qr,
        d =
          t.rects.reference[c] +
          t.rects.reference[a] -
          o[a] -
          t.rects.popper[c],
        B = o[a] - t.rects.reference[a],
        p = Yr(i),
        g = p ? ('y' === a ? p.clientHeight || 0 : p.clientWidth || 0) : 0,
        w = d / 2 - B / 2,
        m = u[h],
        C = g - l[c] - u[f],
        y = g / 2 - l[c] / 2 + w,
        Q = $r(m, y, C),
        F = a
      t.modifiersData[r] = (((e = {})[F] = Q), (e.centerOffset = Q - y), e)
    }
  },
  effect: function (A) {
    var e = A.state,
      t = A.options.element,
      r = void 0 === t ? '[data-popper-arrow]' : t
    null != r &&
      (('string' == typeof r && !(r = e.elements.popper.querySelector(r))) ||
        !zr(e.elements.popper, r) ||
        (e.elements.arrow = r))
  },
  requires: ['popperOffsets'],
  requiresIfExists: ['preventOverflow'],
}
function rn(A) {
  return A.split('-')[1]
}
var nn = { top: 'auto', right: 'auto', bottom: 'auto', left: 'auto' }
function on(A) {
  var e,
    t = A.popper,
    r = A.popperRect,
    n = A.placement,
    i = A.variation,
    o = A.offsets,
    s = A.position,
    a = A.gpuAcceleration,
    c = A.adaptive,
    u = A.roundOffsets,
    l = A.isFixed,
    h = o.x,
    f = void 0 === h ? 0 : h,
    d = o.y,
    B = void 0 === d ? 0 : d,
    p = 'function' == typeof u ? u({ x: f, y: B }) : { x: f, y: B }
  ;((f = p.x), (B = p.y))
  var g = o.hasOwnProperty('x'),
    w = o.hasOwnProperty('y'),
    m = Fr,
    C = Cr,
    y = window
  if (c) {
    var Q = Yr(t),
      F = 'clientHeight',
      U = 'clientWidth'
    if (
      (Q === Lr(t) &&
        'static' !== jr((Q = qr(t))).position &&
        'absolute' === s &&
        ((F = 'scrollHeight'), (U = 'scrollWidth')),
      n === Cr || ((n === Fr || n === Qr) && i === Er))
    )
      ((C = yr),
        (B -=
          (l && Q === y && y.visualViewport ? y.visualViewport.height : Q[F]) -
          r.height),
        (B *= a ? 1 : -1))
    if (n === Fr || ((n === Cr || n === yr) && i === Er))
      ((m = Qr),
        (f -=
          (l && Q === y && y.visualViewport ? y.visualViewport.width : Q[U]) -
          r.width),
        (f *= a ? 1 : -1))
  }
  var v,
    b = Object.assign({ position: s }, c && nn),
    E =
      !0 === u
        ? (function (A) {
            var e = A.x,
              t = A.y,
              r = window.devicePixelRatio || 1
            return { x: Pr(e * r) / r || 0, y: Pr(t * r) / r || 0 }
          })({ x: f, y: B })
        : { x: f, y: B }
  return (
    (f = E.x),
    (B = E.y),
    a
      ? Object.assign(
          {},
          b,
          (((v = {})[C] = w ? '0' : ''),
          (v[m] = g ? '0' : ''),
          (v.transform =
            (y.devicePixelRatio || 1) <= 1
              ? 'translate(' + f + 'px, ' + B + 'px)'
              : 'translate3d(' + f + 'px, ' + B + 'px, 0)'),
          v),
        )
      : Object.assign(
          {},
          b,
          (((e = {})[C] = w ? B + 'px' : ''),
          (e[m] = g ? f + 'px' : ''),
          (e.transform = ''),
          e),
        )
  )
}
var sn = {
    name: 'computeStyles',
    enabled: !0,
    phase: 'beforeWrite',
    fn: function (A) {
      var e = A.state,
        t = A.options,
        r = t.gpuAcceleration,
        n = void 0 === r || r,
        i = t.adaptive,
        o = void 0 === i || i,
        s = t.roundOffsets,
        a = void 0 === s || s,
        c = {
          placement: Mr(e.placement),
          variation: rn(e.placement),
          popper: e.elements.popper,
          popperRect: e.rects.popper,
          gpuAcceleration: n,
          isFixed: 'fixed' === e.options.strategy,
        }
      ;(null != e.modifiersData.popperOffsets &&
        (e.styles.popper = Object.assign(
          {},
          e.styles.popper,
          on(
            Object.assign({}, c, {
              offsets: e.modifiersData.popperOffsets,
              position: e.options.strategy,
              adaptive: o,
              roundOffsets: a,
            }),
          ),
        )),
        null != e.modifiersData.arrow &&
          (e.styles.arrow = Object.assign(
            {},
            e.styles.arrow,
            on(
              Object.assign({}, c, {
                offsets: e.modifiersData.arrow,
                position: 'absolute',
                adaptive: !1,
                roundOffsets: a,
              }),
            ),
          )),
        (e.attributes.popper = Object.assign({}, e.attributes.popper, {
          'data-popper-placement': e.placement,
        })))
    },
    data: {},
  },
  an = { passive: !0 }
var cn = {
    name: 'eventListeners',
    enabled: !0,
    phase: 'write',
    fn: function () {},
    effect: function (A) {
      var e = A.state,
        t = A.instance,
        r = A.options,
        n = r.scroll,
        i = void 0 === n || n,
        o = r.resize,
        s = void 0 === o || o,
        a = Lr(e.elements.popper),
        c = [].concat(e.scrollParents.reference, e.scrollParents.popper)
      return (
        i &&
          c.forEach(function (A) {
            A.addEventListener('scroll', t.update, an)
          }),
        s && a.addEventListener('resize', t.update, an),
        function () {
          ;(i &&
            c.forEach(function (A) {
              A.removeEventListener('scroll', t.update, an)
            }),
            s && a.removeEventListener('resize', t.update, an))
        }
      )
    },
    data: {},
  },
  un = { left: 'right', right: 'left', bottom: 'top', top: 'bottom' }
function ln(A) {
  return A.replace(/left|right|bottom|top/g, function (A) {
    return un[A]
  })
}
var hn = { start: 'end', end: 'start' }
function fn(A) {
  return A.replace(/start|end/g, function (A) {
    return hn[A]
  })
}
function dn(A) {
  var e = Lr(A)
  return { scrollLeft: e.pageXOffset, scrollTop: e.pageYOffset }
}
function Bn(A) {
  return Vr(qr(A)).left + dn(A).scrollLeft
}
function pn(A) {
  var e = jr(A),
    t = e.overflow,
    r = e.overflowX,
    n = e.overflowY
  return /auto|scroll|overlay|hidden/.test(t + n + r)
}
function gn(A) {
  return ['html', 'body', '#document'].indexOf(kr(A)) >= 0
    ? A.ownerDocument.body
    : Or(A) && pn(A)
      ? A
      : gn(Xr(A))
}
function wn(A, e) {
  var t
  void 0 === e && (e = [])
  var r = gn(A),
    n = r === (null == (t = A.ownerDocument) ? void 0 : t.body),
    i = Lr(r),
    o = n ? [i].concat(i.visualViewport || [], pn(r) ? r : []) : r,
    s = e.concat(o)
  return n ? s : s.concat(wn(Xr(o)))
}
function mn(A) {
  return Object.assign({}, A, {
    left: A.x,
    top: A.y,
    right: A.x + A.width,
    bottom: A.y + A.height,
  })
}
function Cn(A, e) {
  return e === Hr
    ? mn(
        (function (A) {
          var e = Lr(A),
            t = qr(A),
            r = e.visualViewport,
            n = t.clientWidth,
            i = t.clientHeight,
            o = 0,
            s = 0
          return (
            r &&
              ((n = r.width),
              (i = r.height),
              /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ||
                ((o = r.offsetLeft), (s = r.offsetTop))),
            { width: n, height: i, x: o + Bn(A), y: s }
          )
        })(A),
      )
    : Sr(e)
      ? (function (A) {
          var e = Vr(A)
          return (
            (e.top = e.top + A.clientTop),
            (e.left = e.left + A.clientLeft),
            (e.bottom = e.top + A.clientHeight),
            (e.right = e.left + A.clientWidth),
            (e.width = A.clientWidth),
            (e.height = A.clientHeight),
            (e.x = e.left),
            (e.y = e.top),
            e
          )
        })(e)
      : mn(
          (function (A) {
            var e,
              t = qr(A),
              r = dn(A),
              n = null == (e = A.ownerDocument) ? void 0 : e.body,
              i = Rr(
                t.scrollWidth,
                t.clientWidth,
                n ? n.scrollWidth : 0,
                n ? n.clientWidth : 0,
              ),
              o = Rr(
                t.scrollHeight,
                t.clientHeight,
                n ? n.scrollHeight : 0,
                n ? n.clientHeight : 0,
              ),
              s = -r.scrollLeft + Bn(A),
              a = -r.scrollTop
            return (
              'rtl' === jr(n || t).direction &&
                (s += Rr(t.clientWidth, n ? n.clientWidth : 0) - i),
              { width: i, height: o, x: s, y: a }
            )
          })(qr(A)),
        )
}
function yn(A, e, t) {
  var r =
      'clippingParents' === e
        ? (function (A) {
            var e = wn(Xr(A)),
              t =
                ['absolute', 'fixed'].indexOf(jr(A).position) >= 0 && Or(A)
                  ? Yr(A)
                  : A
            return Sr(t)
              ? e.filter(function (A) {
                  return Sr(A) && zr(A, t) && 'body' !== kr(A)
                })
              : []
          })(A)
        : [].concat(e),
    n = [].concat(r, [t]),
    i = n[0],
    o = n.reduce(
      function (e, t) {
        var r = Cn(A, t)
        return (
          (e.top = Rr(r.top, e.top)),
          (e.right = Nr(r.right, e.right)),
          (e.bottom = Nr(r.bottom, e.bottom)),
          (e.left = Rr(r.left, e.left)),
          e
        )
      },
      Cn(A, i),
    )
  return (
    (o.width = o.right - o.left),
    (o.height = o.bottom - o.top),
    (o.x = o.left),
    (o.y = o.top),
    o
  )
}
function Qn(A) {
  var e,
    t = A.reference,
    r = A.element,
    n = A.placement,
    i = n ? Mr(n) : null,
    o = n ? rn(n) : null,
    s = t.x + t.width / 2 - r.width / 2,
    a = t.y + t.height / 2 - r.height / 2
  switch (i) {
    case Cr:
      e = { x: s, y: t.y - r.height }
      break
    case yr:
      e = { x: s, y: t.y + t.height }
      break
    case Qr:
      e = { x: t.x + t.width, y: a }
      break
    case Fr:
      e = { x: t.x - r.width, y: a }
      break
    default:
      e = { x: t.x, y: t.y }
  }
  var c = i ? Zr(i) : null
  if (null != c) {
    var u = 'y' === c ? 'height' : 'width'
    switch (o) {
      case br:
        e[c] = e[c] - (t[u] / 2 - r[u] / 2)
        break
      case Er:
        e[c] = e[c] + (t[u] / 2 - r[u] / 2)
    }
  }
  return e
}
function Fn(A, e) {
  void 0 === e && (e = {})
  var t = e,
    r = t.placement,
    n = void 0 === r ? A.placement : r,
    i = t.boundary,
    o = void 0 === i ? 'clippingParents' : i,
    s = t.rootBoundary,
    a = void 0 === s ? Hr : s,
    c = t.elementContext,
    u = void 0 === c ? _r : c,
    l = t.altBoundary,
    h = void 0 !== l && l,
    f = t.padding,
    d = void 0 === f ? 0 : f,
    B = An('number' != typeof d ? d : en(d, vr)),
    p = u === _r ? 'reference' : _r,
    g = A.rects.popper,
    w = A.elements[h ? p : u],
    m = yn(Sr(w) ? w : w.contextElement || qr(A.elements.popper), o, a),
    C = Vr(A.elements.reference),
    y = Qn({ reference: C, element: g, placement: n }),
    Q = mn(Object.assign({}, g, y)),
    F = u === _r ? Q : C,
    U = {
      top: m.top - F.top + B.top,
      bottom: F.bottom - m.bottom + B.bottom,
      left: m.left - F.left + B.left,
      right: F.right - m.right + B.right,
    },
    v = A.modifiersData.offset
  if (u === _r && v) {
    var b = v[n]
    Object.keys(U).forEach(function (A) {
      var e = [Qr, yr].indexOf(A) >= 0 ? 1 : -1,
        t = [Cr, yr].indexOf(A) >= 0 ? 'y' : 'x'
      U[A] += b[t] * e
    })
  }
  return U
}
var Un = {
  name: 'flip',
  enabled: !0,
  phase: 'main',
  fn: function (A) {
    var e = A.state,
      t = A.options,
      r = A.name
    if (!e.modifiersData[r]._skip) {
      for (
        var n = t.mainAxis,
          i = void 0 === n || n,
          o = t.altAxis,
          s = void 0 === o || o,
          a = t.fallbackPlacements,
          c = t.padding,
          u = t.boundary,
          l = t.rootBoundary,
          h = t.altBoundary,
          f = t.flipVariations,
          d = void 0 === f || f,
          B = t.allowedAutoPlacements,
          p = e.options.placement,
          g = Mr(p),
          w =
            a ||
            (g === p || !d
              ? [ln(p)]
              : (function (A) {
                  if (Mr(A) === Ur) return []
                  var e = ln(A)
                  return [fn(A), e, fn(e)]
                })(p)),
          m = [p].concat(w).reduce(function (A, t) {
            return A.concat(
              Mr(t) === Ur
                ? (function (A, e) {
                    void 0 === e && (e = {})
                    var t = e,
                      r = t.placement,
                      n = t.boundary,
                      i = t.rootBoundary,
                      o = t.padding,
                      s = t.flipVariations,
                      a = t.allowedAutoPlacements,
                      c = void 0 === a ? Dr : a,
                      u = rn(r),
                      l = u
                        ? s
                          ? Ir
                          : Ir.filter(function (A) {
                              return rn(A) === u
                            })
                        : vr,
                      h = l.filter(function (A) {
                        return c.indexOf(A) >= 0
                      })
                    0 === h.length && (h = l)
                    var f = h.reduce(function (e, t) {
                      return (
                        (e[t] = Fn(A, {
                          placement: t,
                          boundary: n,
                          rootBoundary: i,
                          padding: o,
                        })[Mr(t)]),
                        e
                      )
                    }, {})
                    return Object.keys(f).sort(function (A, e) {
                      return f[A] - f[e]
                    })
                  })(e, {
                    placement: t,
                    boundary: u,
                    rootBoundary: l,
                    padding: c,
                    flipVariations: d,
                    allowedAutoPlacements: B,
                  })
                : t,
            )
          }, []),
          C = e.rects.reference,
          y = e.rects.popper,
          Q = new Map(),
          F = !0,
          U = m[0],
          v = 0;
        v < m.length;
        v++
      ) {
        var b = m[v],
          E = Mr(b),
          H = rn(b) === br,
          _ = [Cr, yr].indexOf(E) >= 0,
          I = _ ? 'width' : 'height',
          D = Fn(e, {
            placement: b,
            boundary: u,
            rootBoundary: l,
            altBoundary: h,
            padding: c,
          }),
          x = _ ? (H ? Qr : Fr) : H ? yr : Cr
        C[I] > y[I] && (x = ln(x))
        var k = ln(x),
          L = []
        if (
          (i && L.push(D[E] <= 0),
          s && L.push(D[x] <= 0, D[k] <= 0),
          L.every(function (A) {
            return A
          }))
        ) {
          ;((U = b), (F = !1))
          break
        }
        Q.set(b, L)
      }
      if (F)
        for (
          var S = function (A) {
              var e = m.find(function (e) {
                var t = Q.get(e)
                if (t)
                  return t.slice(0, A).every(function (A) {
                    return A
                  })
              })
              if (e) return ((U = e), 'break')
            },
            O = d ? 3 : 1;
          O > 0;
          O--
        ) {
          if ('break' === S(O)) break
        }
      e.placement !== U &&
        ((e.modifiersData[r]._skip = !0), (e.placement = U), (e.reset = !0))
    }
  },
  requiresIfExists: ['offset'],
  data: { _skip: !1 },
}
function vn(A, e, t) {
  return (
    void 0 === t && (t = { x: 0, y: 0 }),
    {
      top: A.top - e.height - t.y,
      right: A.right - e.width + t.x,
      bottom: A.bottom - e.height + t.y,
      left: A.left - e.width - t.x,
    }
  )
}
function bn(A) {
  return [Cr, Qr, yr, Fr].some(function (e) {
    return A[e] >= 0
  })
}
var En = {
  name: 'hide',
  enabled: !0,
  phase: 'main',
  requiresIfExists: ['preventOverflow'],
  fn: function (A) {
    var e = A.state,
      t = A.name,
      r = e.rects.reference,
      n = e.rects.popper,
      i = e.modifiersData.preventOverflow,
      o = Fn(e, { elementContext: 'reference' }),
      s = Fn(e, { altBoundary: !0 }),
      a = vn(o, r),
      c = vn(s, n, i),
      u = bn(a),
      l = bn(c)
    ;((e.modifiersData[t] = {
      referenceClippingOffsets: a,
      popperEscapeOffsets: c,
      isReferenceHidden: u,
      hasPopperEscaped: l,
    }),
      (e.attributes.popper = Object.assign({}, e.attributes.popper, {
        'data-popper-reference-hidden': u,
        'data-popper-escaped': l,
      })))
  },
}
var Hn = {
  name: 'offset',
  enabled: !0,
  phase: 'main',
  requires: ['popperOffsets'],
  fn: function (A) {
    var e = A.state,
      t = A.options,
      r = A.name,
      n = t.offset,
      i = void 0 === n ? [0, 0] : n,
      o = Dr.reduce(function (A, t) {
        return (
          (A[t] = (function (A, e, t) {
            var r = Mr(A),
              n = [Fr, Cr].indexOf(r) >= 0 ? -1 : 1,
              i =
                'function' == typeof t
                  ? t(Object.assign({}, e, { placement: A }))
                  : t,
              o = i[0],
              s = i[1]
            return (
              (o = o || 0),
              (s = (s || 0) * n),
              [Fr, Qr].indexOf(r) >= 0 ? { x: s, y: o } : { x: o, y: s }
            )
          })(t, e.rects, i)),
          A
        )
      }, {}),
      s = o[e.placement],
      a = s.x,
      c = s.y
    ;(null != e.modifiersData.popperOffsets &&
      ((e.modifiersData.popperOffsets.x += a),
      (e.modifiersData.popperOffsets.y += c)),
      (e.modifiersData[r] = o))
  },
}
var _n = {
  name: 'popperOffsets',
  enabled: !0,
  phase: 'read',
  fn: function (A) {
    var e = A.state,
      t = A.name
    e.modifiersData[t] = Qn({
      reference: e.rects.reference,
      element: e.rects.popper,
      placement: e.placement,
    })
  },
  data: {},
}
var In = {
  name: 'preventOverflow',
  enabled: !0,
  phase: 'main',
  fn: function (A) {
    var e = A.state,
      t = A.options,
      r = A.name,
      n = t.mainAxis,
      i = void 0 === n || n,
      o = t.altAxis,
      s = void 0 !== o && o,
      a = t.boundary,
      c = t.rootBoundary,
      u = t.altBoundary,
      l = t.padding,
      h = t.tether,
      f = void 0 === h || h,
      d = t.tetherOffset,
      B = void 0 === d ? 0 : d,
      p = Fn(e, { boundary: a, rootBoundary: c, padding: l, altBoundary: u }),
      g = Mr(e.placement),
      w = rn(e.placement),
      m = !w,
      C = Zr(g),
      y = (function (A) {
        return 'x' === A ? 'y' : 'x'
      })(C),
      Q = e.modifiersData.popperOffsets,
      F = e.rects.reference,
      U = e.rects.popper,
      v =
        'function' == typeof B
          ? B(Object.assign({}, e.rects, { placement: e.placement }))
          : B,
      b =
        'number' == typeof v
          ? { mainAxis: v, altAxis: v }
          : Object.assign({ mainAxis: 0, altAxis: 0 }, v),
      E = e.modifiersData.offset ? e.modifiersData.offset[e.placement] : null,
      H = { x: 0, y: 0 }
    if (Q) {
      if (i) {
        var _,
          I = 'y' === C ? Cr : Fr,
          D = 'y' === C ? yr : Qr,
          x = 'y' === C ? 'height' : 'width',
          k = Q[C],
          L = k + p[I],
          S = k - p[D],
          O = f ? -U[x] / 2 : 0,
          K = w === br ? F[x] : U[x],
          T = w === br ? -U[x] : -F[x],
          M = e.elements.arrow,
          R = f && M ? Gr(M) : { width: 0, height: 0 },
          N = e.modifiersData['arrow#persistent']
            ? e.modifiersData['arrow#persistent'].padding
            : { top: 0, right: 0, bottom: 0, left: 0 },
          P = N[I],
          V = N[D],
          G = $r(0, F[x], R[x]),
          z = m ? F[x] / 2 - O - G - P - b.mainAxis : K - G - P - b.mainAxis,
          j = m ? -F[x] / 2 + O + G + V + b.mainAxis : T + G + V + b.mainAxis,
          W = e.elements.arrow && Yr(e.elements.arrow),
          q = W ? ('y' === C ? W.clientTop || 0 : W.clientLeft || 0) : 0,
          X = null != (_ = null == E ? void 0 : E[C]) ? _ : 0,
          J = k + j - X,
          Y = $r(f ? Nr(L, k + z - X - q) : L, k, f ? Rr(S, J) : S)
        ;((Q[C] = Y), (H[C] = Y - k))
      }
      if (s) {
        var Z,
          $ = 'x' === C ? Cr : Fr,
          AA = 'x' === C ? yr : Qr,
          eA = Q[y],
          tA = 'y' === y ? 'height' : 'width',
          rA = eA + p[$],
          nA = eA - p[AA],
          iA = -1 !== [Cr, Fr].indexOf(g),
          oA = null != (Z = null == E ? void 0 : E[y]) ? Z : 0,
          sA = iA ? rA : eA - F[tA] - U[tA] - oA + b.altAxis,
          aA = iA ? eA + F[tA] + U[tA] - oA - b.altAxis : nA,
          cA =
            f && iA
              ? (function (A, e, t) {
                  var r = $r(A, e, t)
                  return r > t ? t : r
                })(sA, eA, aA)
              : $r(f ? sA : rA, eA, f ? aA : nA)
        ;((Q[y] = cA), (H[y] = cA - eA))
      }
      e.modifiersData[r] = H
    }
  },
  requiresIfExists: ['offset'],
}
function Dn(A, e, t) {
  void 0 === t && (t = !1)
  var r = Or(e),
    n =
      Or(e) &&
      (function (A) {
        var e = A.getBoundingClientRect(),
          t = Pr(e.width) / A.offsetWidth || 1,
          r = Pr(e.height) / A.offsetHeight || 1
        return 1 !== t || 1 !== r
      })(e),
    i = qr(e),
    o = Vr(A, n),
    s = { scrollLeft: 0, scrollTop: 0 },
    a = { x: 0, y: 0 }
  return (
    (r || (!r && !t)) &&
      (('body' !== kr(e) || pn(i)) &&
        (s = (function (A) {
          return A !== Lr(A) && Or(A)
            ? (function (A) {
                return { scrollLeft: A.scrollLeft, scrollTop: A.scrollTop }
              })(A)
            : dn(A)
        })(e)),
      Or(e)
        ? (((a = Vr(e, !0)).x += e.clientLeft), (a.y += e.clientTop))
        : i && (a.x = Bn(i))),
    {
      x: o.left + s.scrollLeft - a.x,
      y: o.top + s.scrollTop - a.y,
      width: o.width,
      height: o.height,
    }
  )
}
function xn(A) {
  var e = new Map(),
    t = new Set(),
    r = []
  function n(A) {
    ;(t.add(A.name),
      []
        .concat(A.requires || [], A.requiresIfExists || [])
        .forEach(function (A) {
          if (!t.has(A)) {
            var r = e.get(A)
            r && n(r)
          }
        }),
      r.push(A))
  }
  return (
    A.forEach(function (A) {
      e.set(A.name, A)
    }),
    A.forEach(function (A) {
      t.has(A.name) || n(A)
    }),
    r
  )
}
function kn(A) {
  var e
  return function () {
    return (
      e ||
        (e = new Promise(function (t) {
          Promise.resolve().then(function () {
            ;((e = void 0), t(A()))
          })
        })),
      e
    )
  }
}
var Ln = { placement: 'bottom', modifiers: [], strategy: 'absolute' }
function Sn() {
  for (var A = arguments.length, e = new Array(A), t = 0; t < A; t++)
    e[t] = arguments[t]
  return !e.some(function (A) {
    return !(A && 'function' == typeof A.getBoundingClientRect)
  })
}
function On(A) {
  void 0 === A && (A = {})
  var e = A,
    t = e.defaultModifiers,
    r = void 0 === t ? [] : t,
    n = e.defaultOptions,
    i = void 0 === n ? Ln : n
  return function (A, e, t) {
    void 0 === t && (t = i)
    var n = {
        placement: 'bottom',
        orderedModifiers: [],
        options: Object.assign({}, Ln, i),
        modifiersData: {},
        elements: { reference: A, popper: e },
        attributes: {},
        styles: {},
      },
      o = [],
      s = !1,
      a = {
        state: n,
        setOptions: function (t) {
          var s = 'function' == typeof t ? t(n.options) : t
          ;(c(),
            (n.options = Object.assign({}, i, n.options, s)),
            (n.scrollParents = {
              reference: Sr(A)
                ? wn(A)
                : A.contextElement
                  ? wn(A.contextElement)
                  : [],
              popper: wn(e),
            }))
          var u = (function (A) {
            var e = xn(A)
            return xr.reduce(function (A, t) {
              return A.concat(
                e.filter(function (A) {
                  return A.phase === t
                }),
              )
            }, [])
          })(
            (function (A) {
              var e = A.reduce(function (A, e) {
                var t = A[e.name]
                return (
                  (A[e.name] = t
                    ? Object.assign({}, t, e, {
                        options: Object.assign({}, t.options, e.options),
                        data: Object.assign({}, t.data, e.data),
                      })
                    : e),
                  A
                )
              }, {})
              return Object.keys(e).map(function (A) {
                return e[A]
              })
            })([].concat(r, n.options.modifiers)),
          )
          return (
            (n.orderedModifiers = u.filter(function (A) {
              return A.enabled
            })),
            n.orderedModifiers.forEach(function (A) {
              var e = A.name,
                t = A.options,
                r = void 0 === t ? {} : t,
                i = A.effect
              if ('function' == typeof i) {
                var s = i({ state: n, name: e, instance: a, options: r }),
                  c = function () {}
                o.push(s || c)
              }
            }),
            a.update()
          )
        },
        forceUpdate: function () {
          if (!s) {
            var A = n.elements,
              e = A.reference,
              t = A.popper
            if (Sn(e, t)) {
              ;((n.rects = {
                reference: Dn(e, Yr(t), 'fixed' === n.options.strategy),
                popper: Gr(t),
              }),
                (n.reset = !1),
                (n.placement = n.options.placement),
                n.orderedModifiers.forEach(function (A) {
                  return (n.modifiersData[A.name] = Object.assign({}, A.data))
                }))
              for (var r = 0; r < n.orderedModifiers.length; r++)
                if (!0 !== n.reset) {
                  var i = n.orderedModifiers[r],
                    o = i.fn,
                    c = i.options,
                    u = void 0 === c ? {} : c,
                    l = i.name
                  'function' == typeof o &&
                    (n = o({ state: n, options: u, name: l, instance: a }) || n)
                } else ((n.reset = !1), (r = -1))
            }
          }
        },
        update: kn(function () {
          return new Promise(function (A) {
            ;(a.forceUpdate(), A(n))
          })
        }),
        destroy: function () {
          ;(c(), (s = !0))
        },
      }
    if (!Sn(A, e)) return a
    function c() {
      ;(o.forEach(function (A) {
        return A()
      }),
        (o = []))
    }
    return (
      a.setOptions(t).then(function (A) {
        !s && t.onFirstUpdate && t.onFirstUpdate(A)
      }),
      a
    )
  }
}
;(On(), On({ defaultModifiers: [cn, _n, sn, Tr] }))
var Kn = On({ defaultModifiers: [cn, _n, sn, Tr, Hn, Un, In, tn, En] })
function Tn(A, e) {
  ;(function (A) {
    return 'string' == typeof A && -1 !== A.indexOf('.') && 1 === parseFloat(A)
  })(A) && (A = '100%')
  var t = (function (A) {
    return 'string' == typeof A && -1 !== A.indexOf('%')
  })(A)
  return (
    (A = 360 === e ? A : Math.min(e, Math.max(0, parseFloat(A)))),
    t && (A = parseInt(String(A * e), 10) / 100),
    Math.abs(A - e) < 1e-6
      ? 1
      : (A =
          360 === e
            ? (A < 0 ? (A % e) + e : A % e) / parseFloat(String(e))
            : (A % e) / parseFloat(String(e)))
  )
}
function Mn(A) {
  return Math.min(1, Math.max(0, A))
}
function Rn(A) {
  return ((A = parseFloat(A)), (isNaN(A) || A < 0 || A > 1) && (A = 1), A)
}
function Nn(A) {
  return A <= 1 ? ''.concat(100 * Number(A), '%') : A
}
function Pn(A) {
  return 1 === A.length ? '0' + A : String(A)
}
function Vn(A, e, t) {
  ;((A = Tn(A, 255)), (e = Tn(e, 255)), (t = Tn(t, 255)))
  var r = Math.max(A, e, t),
    n = Math.min(A, e, t),
    i = 0,
    o = 0,
    s = (r + n) / 2
  if (r === n) ((o = 0), (i = 0))
  else {
    var a = r - n
    switch (((o = s > 0.5 ? a / (2 - r - n) : a / (r + n)), r)) {
      case A:
        i = (e - t) / a + (e < t ? 6 : 0)
        break
      case e:
        i = (t - A) / a + 2
        break
      case t:
        i = (A - e) / a + 4
    }
    i /= 6
  }
  return { h: i, s: o, l: s }
}
function Gn(A, e, t) {
  return (
    t < 0 && (t += 1),
    t > 1 && (t -= 1),
    t < 1 / 6
      ? A + 6 * t * (e - A)
      : t < 0.5
        ? e
        : t < 2 / 3
          ? A + (e - A) * (2 / 3 - t) * 6
          : A
  )
}
function zn(A, e, t) {
  ;((A = Tn(A, 255)), (e = Tn(e, 255)), (t = Tn(t, 255)))
  var r = Math.max(A, e, t),
    n = Math.min(A, e, t),
    i = 0,
    o = r,
    s = r - n,
    a = 0 === r ? 0 : s / r
  if (r === n) i = 0
  else {
    switch (r) {
      case A:
        i = (e - t) / s + (e < t ? 6 : 0)
        break
      case e:
        i = (t - A) / s + 2
        break
      case t:
        i = (A - e) / s + 4
    }
    i /= 6
  }
  return { h: i, s: a, v: o }
}
function jn(A, e, t, r) {
  var n = [
    Pn(Math.round(A).toString(16)),
    Pn(Math.round(e).toString(16)),
    Pn(Math.round(t).toString(16)),
  ]
  return r &&
    n[0].startsWith(n[0].charAt(1)) &&
    n[1].startsWith(n[1].charAt(1)) &&
    n[2].startsWith(n[2].charAt(1))
    ? n[0].charAt(0) + n[1].charAt(0) + n[2].charAt(0)
    : n.join('')
}
function Wn(A) {
  return qn(A) / 255
}
function qn(A) {
  return parseInt(A, 16)
}
var Xn = {
  aliceblue: '#f0f8ff',
  antiquewhite: '#faebd7',
  aqua: '#00ffff',
  aquamarine: '#7fffd4',
  azure: '#f0ffff',
  beige: '#f5f5dc',
  bisque: '#ffe4c4',
  black: '#000000',
  blanchedalmond: '#ffebcd',
  blue: '#0000ff',
  blueviolet: '#8a2be2',
  brown: '#a52a2a',
  burlywood: '#deb887',
  cadetblue: '#5f9ea0',
  chartreuse: '#7fff00',
  chocolate: '#d2691e',
  coral: '#ff7f50',
  cornflowerblue: '#6495ed',
  cornsilk: '#fff8dc',
  crimson: '#dc143c',
  cyan: '#00ffff',
  darkblue: '#00008b',
  darkcyan: '#008b8b',
  darkgoldenrod: '#b8860b',
  darkgray: '#a9a9a9',
  darkgreen: '#006400',
  darkgrey: '#a9a9a9',
  darkkhaki: '#bdb76b',
  darkmagenta: '#8b008b',
  darkolivegreen: '#556b2f',
  darkorange: '#ff8c00',
  darkorchid: '#9932cc',
  darkred: '#8b0000',
  darksalmon: '#e9967a',
  darkseagreen: '#8fbc8f',
  darkslateblue: '#483d8b',
  darkslategray: '#2f4f4f',
  darkslategrey: '#2f4f4f',
  darkturquoise: '#00ced1',
  darkviolet: '#9400d3',
  deeppink: '#ff1493',
  deepskyblue: '#00bfff',
  dimgray: '#696969',
  dimgrey: '#696969',
  dodgerblue: '#1e90ff',
  firebrick: '#b22222',
  floralwhite: '#fffaf0',
  forestgreen: '#228b22',
  fuchsia: '#ff00ff',
  gainsboro: '#dcdcdc',
  ghostwhite: '#f8f8ff',
  goldenrod: '#daa520',
  gold: '#ffd700',
  gray: '#808080',
  green: '#008000',
  greenyellow: '#adff2f',
  grey: '#808080',
  honeydew: '#f0fff0',
  hotpink: '#ff69b4',
  indianred: '#cd5c5c',
  indigo: '#4b0082',
  ivory: '#fffff0',
  khaki: '#f0e68c',
  lavenderblush: '#fff0f5',
  lavender: '#e6e6fa',
  lawngreen: '#7cfc00',
  lemonchiffon: '#fffacd',
  lightblue: '#add8e6',
  lightcoral: '#f08080',
  lightcyan: '#e0ffff',
  lightgoldenrodyellow: '#fafad2',
  lightgray: '#d3d3d3',
  lightgreen: '#90ee90',
  lightgrey: '#d3d3d3',
  lightpink: '#ffb6c1',
  lightsalmon: '#ffa07a',
  lightseagreen: '#20b2aa',
  lightskyblue: '#87cefa',
  lightslategray: '#778899',
  lightslategrey: '#778899',
  lightsteelblue: '#b0c4de',
  lightyellow: '#ffffe0',
  lime: '#00ff00',
  limegreen: '#32cd32',
  linen: '#faf0e6',
  magenta: '#ff00ff',
  maroon: '#800000',
  mediumaquamarine: '#66cdaa',
  mediumblue: '#0000cd',
  mediumorchid: '#ba55d3',
  mediumpurple: '#9370db',
  mediumseagreen: '#3cb371',
  mediumslateblue: '#7b68ee',
  mediumspringgreen: '#00fa9a',
  mediumturquoise: '#48d1cc',
  mediumvioletred: '#c71585',
  midnightblue: '#191970',
  mintcream: '#f5fffa',
  mistyrose: '#ffe4e1',
  moccasin: '#ffe4b5',
  navajowhite: '#ffdead',
  navy: '#000080',
  oldlace: '#fdf5e6',
  olive: '#808000',
  olivedrab: '#6b8e23',
  orange: '#ffa500',
  orangered: '#ff4500',
  orchid: '#da70d6',
  palegoldenrod: '#eee8aa',
  palegreen: '#98fb98',
  paleturquoise: '#afeeee',
  palevioletred: '#db7093',
  papayawhip: '#ffefd5',
  peachpuff: '#ffdab9',
  peru: '#cd853f',
  pink: '#ffc0cb',
  plum: '#dda0dd',
  powderblue: '#b0e0e6',
  purple: '#800080',
  rebeccapurple: '#663399',
  red: '#ff0000',
  rosybrown: '#bc8f8f',
  royalblue: '#4169e1',
  saddlebrown: '#8b4513',
  salmon: '#fa8072',
  sandybrown: '#f4a460',
  seagreen: '#2e8b57',
  seashell: '#fff5ee',
  sienna: '#a0522d',
  silver: '#c0c0c0',
  skyblue: '#87ceeb',
  slateblue: '#6a5acd',
  slategray: '#708090',
  slategrey: '#708090',
  snow: '#fffafa',
  springgreen: '#00ff7f',
  steelblue: '#4682b4',
  tan: '#d2b48c',
  teal: '#008080',
  thistle: '#d8bfd8',
  tomato: '#ff6347',
  turquoise: '#40e0d0',
  violet: '#ee82ee',
  wheat: '#f5deb3',
  white: '#ffffff',
  whitesmoke: '#f5f5f5',
  yellow: '#ffff00',
  yellowgreen: '#9acd32',
}
function Jn(A) {
  var e,
    t,
    r,
    n = { r: 0, g: 0, b: 0 },
    i = 1,
    o = null,
    s = null,
    a = null,
    c = !1,
    u = !1
  return (
    'string' == typeof A &&
      (A = (function (A) {
        if (((A = A.trim().toLowerCase()), 0 === A.length)) return !1
        var e = !1
        if (Xn[A]) ((A = Xn[A]), (e = !0))
        else if ('transparent' === A)
          return { r: 0, g: 0, b: 0, a: 0, format: 'name' }
        var t = Ai.rgb.exec(A)
        if (t) return { r: t[1], g: t[2], b: t[3] }
        if (((t = Ai.rgba.exec(A)), t))
          return { r: t[1], g: t[2], b: t[3], a: t[4] }
        if (((t = Ai.hsl.exec(A)), t)) return { h: t[1], s: t[2], l: t[3] }
        if (((t = Ai.hsla.exec(A)), t))
          return { h: t[1], s: t[2], l: t[3], a: t[4] }
        if (((t = Ai.hsv.exec(A)), t)) return { h: t[1], s: t[2], v: t[3] }
        if (((t = Ai.hsva.exec(A)), t))
          return { h: t[1], s: t[2], v: t[3], a: t[4] }
        if (((t = Ai.hex8.exec(A)), t))
          return {
            r: qn(t[1]),
            g: qn(t[2]),
            b: qn(t[3]),
            a: Wn(t[4]),
            format: e ? 'name' : 'hex8',
          }
        if (((t = Ai.hex6.exec(A)), t))
          return {
            r: qn(t[1]),
            g: qn(t[2]),
            b: qn(t[3]),
            format: e ? 'name' : 'hex',
          }
        if (((t = Ai.hex4.exec(A)), t))
          return {
            r: qn(t[1] + t[1]),
            g: qn(t[2] + t[2]),
            b: qn(t[3] + t[3]),
            a: Wn(t[4] + t[4]),
            format: e ? 'name' : 'hex8',
          }
        if (((t = Ai.hex3.exec(A)), t))
          return {
            r: qn(t[1] + t[1]),
            g: qn(t[2] + t[2]),
            b: qn(t[3] + t[3]),
            format: e ? 'name' : 'hex',
          }
        return !1
      })(A)),
    'object' == typeof A &&
      (ei(A.r) && ei(A.g) && ei(A.b)
        ? ((e = A.r),
          (t = A.g),
          (r = A.b),
          (n = {
            r: 255 * Tn(e, 255),
            g: 255 * Tn(t, 255),
            b: 255 * Tn(r, 255),
          }),
          (c = !0),
          (u = '%' === String(A.r).substr(-1) ? 'prgb' : 'rgb'))
        : ei(A.h) && ei(A.s) && ei(A.v)
          ? ((o = Nn(A.s)),
            (s = Nn(A.v)),
            (n = (function (A, e, t) {
              ;((A = 6 * Tn(A, 360)), (e = Tn(e, 100)), (t = Tn(t, 100)))
              var r = Math.floor(A),
                n = A - r,
                i = t * (1 - e),
                o = t * (1 - n * e),
                s = t * (1 - (1 - n) * e),
                a = r % 6
              return {
                r: 255 * [t, o, i, i, s, t][a],
                g: 255 * [s, t, t, o, i, i][a],
                b: 255 * [i, i, s, t, t, o][a],
              }
            })(A.h, o, s)),
            (c = !0),
            (u = 'hsv'))
          : ei(A.h) &&
            ei(A.s) &&
            ei(A.l) &&
            ((o = Nn(A.s)),
            (a = Nn(A.l)),
            (n = (function (A, e, t) {
              var r, n, i
              if (
                ((A = Tn(A, 360)), (e = Tn(e, 100)), (t = Tn(t, 100)), 0 === e)
              )
                ((n = t), (i = t), (r = t))
              else {
                var o = t < 0.5 ? t * (1 + e) : t + e - t * e,
                  s = 2 * t - o
                ;((r = Gn(s, o, A + 1 / 3)),
                  (n = Gn(s, o, A)),
                  (i = Gn(s, o, A - 1 / 3)))
              }
              return { r: 255 * r, g: 255 * n, b: 255 * i }
            })(A.h, o, a)),
            (c = !0),
            (u = 'hsl')),
      Object.prototype.hasOwnProperty.call(A, 'a') && (i = A.a)),
    (i = Rn(i)),
    {
      ok: c,
      format: A.format || u,
      r: Math.min(255, Math.max(n.r, 0)),
      g: Math.min(255, Math.max(n.g, 0)),
      b: Math.min(255, Math.max(n.b, 0)),
      a: i,
    }
  )
}
var Yn = '(?:'
    .concat('[-\\+]?\\d*\\.\\d+%?', ')|(?:')
    .concat('[-\\+]?\\d+%?', ')'),
  Zn = '[\\s|\\(]+('
    .concat(Yn, ')[,|\\s]+(')
    .concat(Yn, ')[,|\\s]+(')
    .concat(Yn, ')\\s*\\)?'),
  $n = '[\\s|\\(]+('
    .concat(Yn, ')[,|\\s]+(')
    .concat(Yn, ')[,|\\s]+(')
    .concat(Yn, ')[,|\\s]+(')
    .concat(Yn, ')\\s*\\)?'),
  Ai = {
    CSS_UNIT: new RegExp(Yn),
    rgb: new RegExp('rgb' + Zn),
    rgba: new RegExp('rgba' + $n),
    hsl: new RegExp('hsl' + Zn),
    hsla: new RegExp('hsla' + $n),
    hsv: new RegExp('hsv' + Zn),
    hsva: new RegExp('hsva' + $n),
    hex3: /^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
    hex6: /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,
    hex4: /^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
    hex8: /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,
  }
function ei(A) {
  return Boolean(Ai.CSS_UNIT.exec(String(A)))
}
var ti = (function () {
    function A(e, t) {
      var r
      if ((void 0 === e && (e = ''), void 0 === t && (t = {}), e instanceof A))
        return e
      ;('number' == typeof e &&
        (e = (function (A) {
          return { r: A >> 16, g: (65280 & A) >> 8, b: 255 & A }
        })(e)),
        (this.originalInput = e))
      var n = Jn(e)
      ;((this.originalInput = e),
        (this.r = n.r),
        (this.g = n.g),
        (this.b = n.b),
        (this.a = n.a),
        (this.roundA = Math.round(100 * this.a) / 100),
        (this.format = null !== (r = t.format) && void 0 !== r ? r : n.format),
        (this.gradientType = t.gradientType),
        this.r < 1 && (this.r = Math.round(this.r)),
        this.g < 1 && (this.g = Math.round(this.g)),
        this.b < 1 && (this.b = Math.round(this.b)),
        (this.isValid = n.ok))
    }
    return (
      (A.prototype.isDark = function () {
        return this.getBrightness() < 128
      }),
      (A.prototype.isLight = function () {
        return !this.isDark()
      }),
      (A.prototype.getBrightness = function () {
        var A = this.toRgb()
        return (299 * A.r + 587 * A.g + 114 * A.b) / 1e3
      }),
      (A.prototype.getLuminance = function () {
        var A = this.toRgb(),
          e = A.r / 255,
          t = A.g / 255,
          r = A.b / 255
        return (
          0.2126 *
            (e <= 0.03928 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4)) +
          0.7152 *
            (t <= 0.03928 ? t / 12.92 : Math.pow((t + 0.055) / 1.055, 2.4)) +
          0.0722 *
            (r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4))
        )
      }),
      (A.prototype.getAlpha = function () {
        return this.a
      }),
      (A.prototype.setAlpha = function (A) {
        return (
          (this.a = Rn(A)),
          (this.roundA = Math.round(100 * this.a) / 100),
          this
        )
      }),
      (A.prototype.isMonochrome = function () {
        return 0 === this.toHsl().s
      }),
      (A.prototype.toHsv = function () {
        var A = zn(this.r, this.g, this.b)
        return { h: 360 * A.h, s: A.s, v: A.v, a: this.a }
      }),
      (A.prototype.toHsvString = function () {
        var A = zn(this.r, this.g, this.b),
          e = Math.round(360 * A.h),
          t = Math.round(100 * A.s),
          r = Math.round(100 * A.v)
        return 1 === this.a
          ? 'hsv('.concat(e, ', ').concat(t, '%, ').concat(r, '%)')
          : 'hsva('
              .concat(e, ', ')
              .concat(t, '%, ')
              .concat(r, '%, ')
              .concat(this.roundA, ')')
      }),
      (A.prototype.toHsl = function () {
        var A = Vn(this.r, this.g, this.b)
        return { h: 360 * A.h, s: A.s, l: A.l, a: this.a }
      }),
      (A.prototype.toHslString = function () {
        var A = Vn(this.r, this.g, this.b),
          e = Math.round(360 * A.h),
          t = Math.round(100 * A.s),
          r = Math.round(100 * A.l)
        return 1 === this.a
          ? 'hsl('.concat(e, ', ').concat(t, '%, ').concat(r, '%)')
          : 'hsla('
              .concat(e, ', ')
              .concat(t, '%, ')
              .concat(r, '%, ')
              .concat(this.roundA, ')')
      }),
      (A.prototype.toHex = function (A) {
        return (void 0 === A && (A = !1), jn(this.r, this.g, this.b, A))
      }),
      (A.prototype.toHexString = function (A) {
        return (void 0 === A && (A = !1), '#' + this.toHex(A))
      }),
      (A.prototype.toHex8 = function (A) {
        return (
          void 0 === A && (A = !1),
          (function (A, e, t, r, n) {
            var i,
              o = [
                Pn(Math.round(A).toString(16)),
                Pn(Math.round(e).toString(16)),
                Pn(Math.round(t).toString(16)),
                Pn(((i = r), Math.round(255 * parseFloat(i)).toString(16))),
              ]
            return n &&
              o[0].startsWith(o[0].charAt(1)) &&
              o[1].startsWith(o[1].charAt(1)) &&
              o[2].startsWith(o[2].charAt(1)) &&
              o[3].startsWith(o[3].charAt(1))
              ? o[0].charAt(0) +
                  o[1].charAt(0) +
                  o[2].charAt(0) +
                  o[3].charAt(0)
              : o.join('')
          })(this.r, this.g, this.b, this.a, A)
        )
      }),
      (A.prototype.toHex8String = function (A) {
        return (void 0 === A && (A = !1), '#' + this.toHex8(A))
      }),
      (A.prototype.toHexShortString = function (A) {
        return (
          void 0 === A && (A = !1),
          1 === this.a ? this.toHexString(A) : this.toHex8String(A)
        )
      }),
      (A.prototype.toRgb = function () {
        return {
          r: Math.round(this.r),
          g: Math.round(this.g),
          b: Math.round(this.b),
          a: this.a,
        }
      }),
      (A.prototype.toRgbString = function () {
        var A = Math.round(this.r),
          e = Math.round(this.g),
          t = Math.round(this.b)
        return 1 === this.a
          ? 'rgb('.concat(A, ', ').concat(e, ', ').concat(t, ')')
          : 'rgba('
              .concat(A, ', ')
              .concat(e, ', ')
              .concat(t, ', ')
              .concat(this.roundA, ')')
      }),
      (A.prototype.toPercentageRgb = function () {
        var A = function (A) {
          return ''.concat(Math.round(100 * Tn(A, 255)), '%')
        }
        return { r: A(this.r), g: A(this.g), b: A(this.b), a: this.a }
      }),
      (A.prototype.toPercentageRgbString = function () {
        var A = function (A) {
          return Math.round(100 * Tn(A, 255))
        }
        return 1 === this.a
          ? 'rgb('
              .concat(A(this.r), '%, ')
              .concat(A(this.g), '%, ')
              .concat(A(this.b), '%)')
          : 'rgba('
              .concat(A(this.r), '%, ')
              .concat(A(this.g), '%, ')
              .concat(A(this.b), '%, ')
              .concat(this.roundA, ')')
      }),
      (A.prototype.toName = function () {
        if (0 === this.a) return 'transparent'
        if (this.a < 1) return !1
        for (
          var A = '#' + jn(this.r, this.g, this.b, !1),
            e = 0,
            t = Object.entries(Xn);
          e < t.length;
          e++
        ) {
          var r = t[e],
            n = r[0]
          if (A === r[1]) return n
        }
        return !1
      }),
      (A.prototype.toString = function (A) {
        var e = Boolean(A)
        A = null != A ? A : this.format
        var t = !1,
          r = this.a < 1 && this.a >= 0
        return e || !r || (!A.startsWith('hex') && 'name' !== A)
          ? ('rgb' === A && (t = this.toRgbString()),
            'prgb' === A && (t = this.toPercentageRgbString()),
            ('hex' !== A && 'hex6' !== A) || (t = this.toHexString()),
            'hex3' === A && (t = this.toHexString(!0)),
            'hex4' === A && (t = this.toHex8String(!0)),
            'hex8' === A && (t = this.toHex8String()),
            'name' === A && (t = this.toName()),
            'hsl' === A && (t = this.toHslString()),
            'hsv' === A && (t = this.toHsvString()),
            t || this.toHexString())
          : 'name' === A && 0 === this.a
            ? this.toName()
            : this.toRgbString()
      }),
      (A.prototype.toNumber = function () {
        return (
          (Math.round(this.r) << 16) +
          (Math.round(this.g) << 8) +
          Math.round(this.b)
        )
      }),
      (A.prototype.clone = function () {
        return new A(this.toString())
      }),
      (A.prototype.lighten = function (e) {
        void 0 === e && (e = 10)
        var t = this.toHsl()
        return ((t.l += e / 100), (t.l = Mn(t.l)), new A(t))
      }),
      (A.prototype.brighten = function (e) {
        void 0 === e && (e = 10)
        var t = this.toRgb()
        return (
          (t.r = Math.max(
            0,
            Math.min(255, t.r - Math.round((-e / 100) * 255)),
          )),
          (t.g = Math.max(
            0,
            Math.min(255, t.g - Math.round((-e / 100) * 255)),
          )),
          (t.b = Math.max(
            0,
            Math.min(255, t.b - Math.round((-e / 100) * 255)),
          )),
          new A(t)
        )
      }),
      (A.prototype.darken = function (e) {
        void 0 === e && (e = 10)
        var t = this.toHsl()
        return ((t.l -= e / 100), (t.l = Mn(t.l)), new A(t))
      }),
      (A.prototype.tint = function (A) {
        return (void 0 === A && (A = 10), this.mix('white', A))
      }),
      (A.prototype.shade = function (A) {
        return (void 0 === A && (A = 10), this.mix('black', A))
      }),
      (A.prototype.desaturate = function (e) {
        void 0 === e && (e = 10)
        var t = this.toHsl()
        return ((t.s -= e / 100), (t.s = Mn(t.s)), new A(t))
      }),
      (A.prototype.saturate = function (e) {
        void 0 === e && (e = 10)
        var t = this.toHsl()
        return ((t.s += e / 100), (t.s = Mn(t.s)), new A(t))
      }),
      (A.prototype.greyscale = function () {
        return this.desaturate(100)
      }),
      (A.prototype.spin = function (e) {
        var t = this.toHsl(),
          r = (t.h + e) % 360
        return ((t.h = r < 0 ? 360 + r : r), new A(t))
      }),
      (A.prototype.mix = function (e, t) {
        void 0 === t && (t = 50)
        var r = this.toRgb(),
          n = new A(e).toRgb(),
          i = t / 100
        return new A({
          r: (n.r - r.r) * i + r.r,
          g: (n.g - r.g) * i + r.g,
          b: (n.b - r.b) * i + r.b,
          a: (n.a - r.a) * i + r.a,
        })
      }),
      (A.prototype.analogous = function (e, t) {
        ;(void 0 === e && (e = 6), void 0 === t && (t = 30))
        var r = this.toHsl(),
          n = 360 / t,
          i = [this]
        for (r.h = (r.h - ((n * e) >> 1) + 720) % 360; --e; )
          ((r.h = (r.h + n) % 360), i.push(new A(r)))
        return i
      }),
      (A.prototype.complement = function () {
        var e = this.toHsl()
        return ((e.h = (e.h + 180) % 360), new A(e))
      }),
      (A.prototype.monochromatic = function (e) {
        void 0 === e && (e = 6)
        for (
          var t = this.toHsv(), r = t.h, n = t.s, i = t.v, o = [], s = 1 / e;
          e--;

        )
          (o.push(new A({ h: r, s: n, v: i })), (i = (i + s) % 1))
        return o
      }),
      (A.prototype.splitcomplement = function () {
        var e = this.toHsl(),
          t = e.h
        return [
          this,
          new A({ h: (t + 72) % 360, s: e.s, l: e.l }),
          new A({ h: (t + 216) % 360, s: e.s, l: e.l }),
        ]
      }),
      (A.prototype.onBackground = function (e) {
        var t = this.toRgb(),
          r = new A(e).toRgb(),
          n = t.a + r.a * (1 - t.a)
        return new A({
          r: (t.r * t.a + r.r * r.a * (1 - t.a)) / n,
          g: (t.g * t.a + r.g * r.a * (1 - t.a)) / n,
          b: (t.b * t.a + r.b * r.a * (1 - t.a)) / n,
          a: n,
        })
      }),
      (A.prototype.triad = function () {
        return this.polyad(3)
      }),
      (A.prototype.tetrad = function () {
        return this.polyad(4)
      }),
      (A.prototype.polyad = function (e) {
        for (
          var t = this.toHsl(), r = t.h, n = [this], i = 360 / e, o = 1;
          o < e;
          o++
        )
          n.push(new A({ h: (r + o * i) % 360, s: t.s, l: t.l }))
        return n
      }),
      (A.prototype.equals = function (e) {
        return this.toRgbString() === new A(e).toRgbString()
      }),
      A
    )
  })(),
  ri =
    'undefined' != typeof globalThis
      ? globalThis
      : 'undefined' != typeof window
        ? window
        : 'undefined' != typeof global
          ? global
          : 'undefined' != typeof self
            ? self
            : {}
function ni(A) {
  return A && A.__esModule && Object.prototype.hasOwnProperty.call(A, 'default')
    ? A.default
    : A
}
var ii = { exports: {} }
ii.exports = (function () {
  var A = 1e3,
    e = 6e4,
    t = 36e5,
    r = 'millisecond',
    n = 'second',
    i = 'minute',
    o = 'hour',
    s = 'day',
    a = 'week',
    c = 'month',
    u = 'quarter',
    l = 'year',
    h = 'date',
    f = 'Invalid Date',
    d =
      /^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/,
    B =
      /\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,
    p = {
      name: 'en',
      weekdays:
        'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
      months:
        'January_February_March_April_May_June_July_August_September_October_November_December'.split(
          '_',
        ),
      ordinal: function (A) {
        var e = ['th', 'st', 'nd', 'rd'],
          t = A % 100
        return '[' + A + (e[(t - 20) % 10] || e[t] || e[0]) + ']'
      },
    },
    g = function (A, e, t) {
      var r = String(A)
      return !r || r.length >= e ? A : '' + Array(e + 1 - r.length).join(t) + A
    },
    w = {
      s: g,
      z: function (A) {
        var e = -A.utcOffset(),
          t = Math.abs(e),
          r = Math.floor(t / 60),
          n = t % 60
        return (e <= 0 ? '+' : '-') + g(r, 2, '0') + ':' + g(n, 2, '0')
      },
      m: function A(e, t) {
        if (e.date() < t.date()) return -A(t, e)
        var r = 12 * (t.year() - e.year()) + (t.month() - e.month()),
          n = e.clone().add(r, c),
          i = t - n < 0,
          o = e.clone().add(r + (i ? -1 : 1), c)
        return +(-(r + (t - n) / (i ? n - o : o - n)) || 0)
      },
      a: function (A) {
        return A < 0 ? Math.ceil(A) || 0 : Math.floor(A)
      },
      p: function (A) {
        return (
          { M: c, y: l, w: a, d: s, D: h, h: o, m: i, s: n, ms: r, Q: u }[A] ||
          String(A || '')
            .toLowerCase()
            .replace(/s$/, '')
        )
      },
      u: function (A) {
        return void 0 === A
      },
    },
    m = 'en',
    C = {}
  C[m] = p
  var y = '$isDayjsObject',
    Q = function (A) {
      return A instanceof b || !(!A || !A[y])
    },
    F = function A(e, t, r) {
      var n
      if (!e) return m
      if ('string' == typeof e) {
        var i = e.toLowerCase()
        ;(C[i] && (n = i), t && ((C[i] = t), (n = i)))
        var o = e.split('-')
        if (!n && o.length > 1) return A(o[0])
      } else {
        var s = e.name
        ;((C[s] = e), (n = s))
      }
      return (!r && n && (m = n), n || (!r && m))
    },
    U = function (A, e) {
      if (Q(A)) return A.clone()
      var t = 'object' == typeof e ? e : {}
      return ((t.date = A), (t.args = arguments), new b(t))
    },
    v = w
  ;((v.l = F),
    (v.i = Q),
    (v.w = function (A, e) {
      return U(A, { locale: e.$L, utc: e.$u, x: e.$x, $offset: e.$offset })
    }))
  var b = (function () {
      function p(A) {
        ;((this.$L = F(A.locale, null, !0)),
          this.parse(A),
          (this.$x = this.$x || A.x || {}),
          (this[y] = !0))
      }
      var g = p.prototype
      return (
        (g.parse = function (A) {
          ;((this.$d = (function (A) {
            var e = A.date,
              t = A.utc
            if (null === e) return new Date(NaN)
            if (v.u(e)) return new Date()
            if (e instanceof Date) return new Date(e)
            if ('string' == typeof e && !/Z$/i.test(e)) {
              var r = e.match(d)
              if (r) {
                var n = r[2] - 1 || 0,
                  i = (r[7] || '0').substring(0, 3)
                return t
                  ? new Date(
                      Date.UTC(
                        r[1],
                        n,
                        r[3] || 1,
                        r[4] || 0,
                        r[5] || 0,
                        r[6] || 0,
                        i,
                      ),
                    )
                  : new Date(
                      r[1],
                      n,
                      r[3] || 1,
                      r[4] || 0,
                      r[5] || 0,
                      r[6] || 0,
                      i,
                    )
              }
            }
            return new Date(e)
          })(A)),
            this.init())
        }),
        (g.init = function () {
          var A = this.$d
          ;((this.$y = A.getFullYear()),
            (this.$M = A.getMonth()),
            (this.$D = A.getDate()),
            (this.$W = A.getDay()),
            (this.$H = A.getHours()),
            (this.$m = A.getMinutes()),
            (this.$s = A.getSeconds()),
            (this.$ms = A.getMilliseconds()))
        }),
        (g.$utils = function () {
          return v
        }),
        (g.isValid = function () {
          return !(this.$d.toString() === f)
        }),
        (g.isSame = function (A, e) {
          var t = U(A)
          return this.startOf(e) <= t && t <= this.endOf(e)
        }),
        (g.isAfter = function (A, e) {
          return U(A) < this.startOf(e)
        }),
        (g.isBefore = function (A, e) {
          return this.endOf(e) < U(A)
        }),
        (g.$g = function (A, e, t) {
          return v.u(A) ? this[e] : this.set(t, A)
        }),
        (g.unix = function () {
          return Math.floor(this.valueOf() / 1e3)
        }),
        (g.valueOf = function () {
          return this.$d.getTime()
        }),
        (g.startOf = function (A, e) {
          var t = this,
            r = !!v.u(e) || e,
            u = v.p(A),
            f = function (A, e) {
              var n = v.w(t.$u ? Date.UTC(t.$y, e, A) : new Date(t.$y, e, A), t)
              return r ? n : n.endOf(s)
            },
            d = function (A, e) {
              return v.w(
                t
                  .toDate()
                  [
                    A
                  ].apply(t.toDate('s'), (r ? [0, 0, 0, 0] : [23, 59, 59, 999]).slice(e)),
                t,
              )
            },
            B = this.$W,
            p = this.$M,
            g = this.$D,
            w = 'set' + (this.$u ? 'UTC' : '')
          switch (u) {
            case l:
              return r ? f(1, 0) : f(31, 11)
            case c:
              return r ? f(1, p) : f(0, p + 1)
            case a:
              var m = this.$locale().weekStart || 0,
                C = (B < m ? B + 7 : B) - m
              return f(r ? g - C : g + (6 - C), p)
            case s:
            case h:
              return d(w + 'Hours', 0)
            case o:
              return d(w + 'Minutes', 1)
            case i:
              return d(w + 'Seconds', 2)
            case n:
              return d(w + 'Milliseconds', 3)
            default:
              return this.clone()
          }
        }),
        (g.endOf = function (A) {
          return this.startOf(A, !1)
        }),
        (g.$set = function (A, e) {
          var t,
            a = v.p(A),
            u = 'set' + (this.$u ? 'UTC' : ''),
            f = ((t = {}),
            (t[s] = u + 'Date'),
            (t[h] = u + 'Date'),
            (t[c] = u + 'Month'),
            (t[l] = u + 'FullYear'),
            (t[o] = u + 'Hours'),
            (t[i] = u + 'Minutes'),
            (t[n] = u + 'Seconds'),
            (t[r] = u + 'Milliseconds'),
            t)[a],
            d = a === s ? this.$D + (e - this.$W) : e
          if (a === c || a === l) {
            var B = this.clone().set(h, 1)
            ;(B.$d[f](d),
              B.init(),
              (this.$d = B.set(h, Math.min(this.$D, B.daysInMonth())).$d))
          } else f && this.$d[f](d)
          return (this.init(), this)
        }),
        (g.set = function (A, e) {
          return this.clone().$set(A, e)
        }),
        (g.get = function (A) {
          return this[v.p(A)]()
        }),
        (g.add = function (r, u) {
          var h,
            f = this
          r = Number(r)
          var d = v.p(u),
            B = function (A) {
              var e = U(f)
              return v.w(e.date(e.date() + Math.round(A * r)), f)
            }
          if (d === c) return this.set(c, this.$M + r)
          if (d === l) return this.set(l, this.$y + r)
          if (d === s) return B(1)
          if (d === a) return B(7)
          var p = ((h = {}), (h[i] = e), (h[o] = t), (h[n] = A), h)[d] || 1,
            g = this.$d.getTime() + r * p
          return v.w(g, this)
        }),
        (g.subtract = function (A, e) {
          return this.add(-1 * A, e)
        }),
        (g.format = function (A) {
          var e = this,
            t = this.$locale()
          if (!this.isValid()) return t.invalidDate || f
          var r = A || 'YYYY-MM-DDTHH:mm:ssZ',
            n = v.z(this),
            i = this.$H,
            o = this.$m,
            s = this.$M,
            a = t.weekdays,
            c = t.months,
            u = t.meridiem,
            l = function (A, t, n, i) {
              return (A && (A[t] || A(e, r))) || n[t].slice(0, i)
            },
            h = function (A) {
              return v.s(i % 12 || 12, A, '0')
            },
            d =
              u ||
              function (A, e, t) {
                var r = A < 12 ? 'AM' : 'PM'
                return t ? r.toLowerCase() : r
              }
          return r.replace(B, function (A, r) {
            return (
              r ||
              (function (A) {
                switch (A) {
                  case 'YY':
                    return String(e.$y).slice(-2)
                  case 'YYYY':
                    return v.s(e.$y, 4, '0')
                  case 'M':
                    return s + 1
                  case 'MM':
                    return v.s(s + 1, 2, '0')
                  case 'MMM':
                    return l(t.monthsShort, s, c, 3)
                  case 'MMMM':
                    return l(c, s)
                  case 'D':
                    return e.$D
                  case 'DD':
                    return v.s(e.$D, 2, '0')
                  case 'd':
                    return String(e.$W)
                  case 'dd':
                    return l(t.weekdaysMin, e.$W, a, 2)
                  case 'ddd':
                    return l(t.weekdaysShort, e.$W, a, 3)
                  case 'dddd':
                    return a[e.$W]
                  case 'H':
                    return String(i)
                  case 'HH':
                    return v.s(i, 2, '0')
                  case 'h':
                    return h(1)
                  case 'hh':
                    return h(2)
                  case 'a':
                    return d(i, o, !0)
                  case 'A':
                    return d(i, o, !1)
                  case 'm':
                    return String(o)
                  case 'mm':
                    return v.s(o, 2, '0')
                  case 's':
                    return String(e.$s)
                  case 'ss':
                    return v.s(e.$s, 2, '0')
                  case 'SSS':
                    return v.s(e.$ms, 3, '0')
                  case 'Z':
                    return n
                }
                return null
              })(A) ||
              n.replace(':', '')
            )
          })
        }),
        (g.utcOffset = function () {
          return 15 * -Math.round(this.$d.getTimezoneOffset() / 15)
        }),
        (g.diff = function (r, h, f) {
          var d,
            B = this,
            p = v.p(h),
            g = U(r),
            w = (g.utcOffset() - this.utcOffset()) * e,
            m = this - g,
            C = function () {
              return v.m(B, g)
            }
          switch (p) {
            case l:
              d = C() / 12
              break
            case c:
              d = C()
              break
            case u:
              d = C() / 3
              break
            case a:
              d = (m - w) / 6048e5
              break
            case s:
              d = (m - w) / 864e5
              break
            case o:
              d = m / t
              break
            case i:
              d = m / e
              break
            case n:
              d = m / A
              break
            default:
              d = m
          }
          return f ? d : v.a(d)
        }),
        (g.daysInMonth = function () {
          return this.endOf(c).$D
        }),
        (g.$locale = function () {
          return C[this.$L]
        }),
        (g.locale = function (A, e) {
          if (!A) return this.$L
          var t = this.clone(),
            r = F(A, e, !0)
          return (r && (t.$L = r), t)
        }),
        (g.clone = function () {
          return v.w(this.$d, this)
        }),
        (g.toDate = function () {
          return new Date(this.valueOf())
        }),
        (g.toJSON = function () {
          return this.isValid() ? this.toISOString() : null
        }),
        (g.toISOString = function () {
          return this.$d.toISOString()
        }),
        (g.toString = function () {
          return this.$d.toUTCString()
        }),
        p
      )
    })(),
    E = b.prototype
  return (
    (U.prototype = E),
    [
      ['$ms', r],
      ['$s', n],
      ['$m', i],
      ['$H', o],
      ['$W', s],
      ['$M', c],
      ['$y', l],
      ['$D', h],
    ].forEach(function (A) {
      E[A[1]] = function (e) {
        return this.$g(e, A[0], A[1])
      }
    }),
    (U.extend = function (A, e) {
      return (A.$i || (A(e, b, U), (A.$i = !0)), U)
    }),
    (U.locale = F),
    (U.isDayjs = Q),
    (U.unix = function (A) {
      return U(1e3 * A)
    }),
    (U.en = C[m]),
    (U.Ls = C),
    (U.p = {}),
    U
  )
})()
const oi = ni(ii.exports)
var si = { exports: {} }
si.exports = function (A, e, t) {
  var r = e.prototype,
    n = function (A) {
      return A && (A.indexOf ? A : A.s)
    },
    i = function (A, e, t, r, i) {
      var o = A.name ? A : A.$locale(),
        s = n(o[e]),
        a = n(o[t]),
        c =
          s ||
          a.map(function (A) {
            return A.slice(0, r)
          })
      if (!i) return c
      var u = o.weekStart
      return c.map(function (A, e) {
        return c[(e + (u || 0)) % 7]
      })
    },
    o = function () {
      return t.Ls[t.locale()]
    },
    s = function (A, e) {
      return (
        A.formats[e] ||
        A.formats[e.toUpperCase()].replace(
          /(\[[^\]]+])|(MMMM|MM|DD|dddd)/g,
          function (A, e, t) {
            return e || t.slice(1)
          },
        )
      )
    },
    a = function () {
      var A = this
      return {
        months: function (e) {
          return e ? e.format('MMMM') : i(A, 'months')
        },
        monthsShort: function (e) {
          return e ? e.format('MMM') : i(A, 'monthsShort', 'months', 3)
        },
        firstDayOfWeek: function () {
          return A.$locale().weekStart || 0
        },
        weekdays: function (e) {
          return e ? e.format('dddd') : i(A, 'weekdays')
        },
        weekdaysMin: function (e) {
          return e ? e.format('dd') : i(A, 'weekdaysMin', 'weekdays', 2)
        },
        weekdaysShort: function (e) {
          return e ? e.format('ddd') : i(A, 'weekdaysShort', 'weekdays', 3)
        },
        longDateFormat: function (e) {
          return s(A.$locale(), e)
        },
        meridiem: this.$locale().meridiem,
        ordinal: this.$locale().ordinal,
      }
    }
  ;((r.localeData = function () {
    return a.bind(this)()
  }),
    (t.localeData = function () {
      var A = o()
      return {
        firstDayOfWeek: function () {
          return A.weekStart || 0
        },
        weekdays: function () {
          return t.weekdays()
        },
        weekdaysShort: function () {
          return t.weekdaysShort()
        },
        weekdaysMin: function () {
          return t.weekdaysMin()
        },
        months: function () {
          return t.months()
        },
        monthsShort: function () {
          return t.monthsShort()
        },
        longDateFormat: function (e) {
          return s(A, e)
        },
        meridiem: A.meridiem,
        ordinal: A.ordinal,
      }
    }),
    (t.months = function () {
      return i(o(), 'months')
    }),
    (t.monthsShort = function () {
      return i(o(), 'monthsShort', 'months', 3)
    }),
    (t.weekdays = function (A) {
      return i(o(), 'weekdays', null, null, A)
    }),
    (t.weekdaysShort = function (A) {
      return i(o(), 'weekdaysShort', 'weekdays', 3, A)
    }),
    (t.weekdaysMin = function (A) {
      return i(o(), 'weekdaysMin', 'weekdays', 2, A)
    }))
}
const ai = ni(si.exports)
var ci = { exports: {} }
ci.exports = (function () {
  var A = {
      LTS: 'h:mm:ss A',
      LT: 'h:mm A',
      L: 'MM/DD/YYYY',
      LL: 'MMMM D, YYYY',
      LLL: 'MMMM D, YYYY h:mm A',
      LLLL: 'dddd, MMMM D, YYYY h:mm A',
    },
    e =
      /(\[[^[]*\])|([-_:/.,()\s]+)|(A|a|Q|YYYY|YY?|ww?|MM?M?M?|Do|DD?|hh?|HH?|mm?|ss?|S{1,3}|z|ZZ?)/g,
    t = /\d/,
    r = /\d\d/,
    n = /\d\d?/,
    i = /\d*[^-_:/,()\s\d]+/,
    o = {},
    s = function (A) {
      return (A = +A) + (A > 68 ? 1900 : 2e3)
    },
    a = function (A) {
      return function (e) {
        this[A] = +e
      }
    },
    c = [
      /[+-]\d\d:?(\d\d)?|Z/,
      function (A) {
        ;(this.zone || (this.zone = {})).offset = (function (A) {
          if (!A) return 0
          if ('Z' === A) return 0
          var e = A.match(/([+-]|\d\d)/g),
            t = 60 * e[1] + (+e[2] || 0)
          return 0 === t ? 0 : '+' === e[0] ? -t : t
        })(A)
      },
    ],
    u = function (A) {
      var e = o[A]
      return e && (e.indexOf ? e : e.s.concat(e.f))
    },
    l = function (A, e) {
      var t,
        r = o.meridiem
      if (r) {
        for (var n = 1; n <= 24; n += 1)
          if (A.indexOf(r(n, 0, e)) > -1) {
            t = n > 12
            break
          }
      } else t = A === (e ? 'pm' : 'PM')
      return t
    },
    h = {
      A: [
        i,
        function (A) {
          this.afternoon = l(A, !1)
        },
      ],
      a: [
        i,
        function (A) {
          this.afternoon = l(A, !0)
        },
      ],
      Q: [
        t,
        function (A) {
          this.month = 3 * (A - 1) + 1
        },
      ],
      S: [
        t,
        function (A) {
          this.milliseconds = 100 * +A
        },
      ],
      SS: [
        r,
        function (A) {
          this.milliseconds = 10 * +A
        },
      ],
      SSS: [
        /\d{3}/,
        function (A) {
          this.milliseconds = +A
        },
      ],
      s: [n, a('seconds')],
      ss: [n, a('seconds')],
      m: [n, a('minutes')],
      mm: [n, a('minutes')],
      H: [n, a('hours')],
      h: [n, a('hours')],
      HH: [n, a('hours')],
      hh: [n, a('hours')],
      D: [n, a('day')],
      DD: [r, a('day')],
      Do: [
        i,
        function (A) {
          var e = o.ordinal,
            t = A.match(/\d+/)
          if (((this.day = t[0]), e))
            for (var r = 1; r <= 31; r += 1)
              e(r).replace(/\[|\]/g, '') === A && (this.day = r)
        },
      ],
      w: [n, a('week')],
      ww: [r, a('week')],
      M: [n, a('month')],
      MM: [r, a('month')],
      MMM: [
        i,
        function (A) {
          var e = u('months'),
            t =
              (
                u('monthsShort') ||
                e.map(function (A) {
                  return A.slice(0, 3)
                })
              ).indexOf(A) + 1
          if (t < 1) throw new Error()
          this.month = t % 12 || t
        },
      ],
      MMMM: [
        i,
        function (A) {
          var e = u('months').indexOf(A) + 1
          if (e < 1) throw new Error()
          this.month = e % 12 || e
        },
      ],
      Y: [/[+-]?\d+/, a('year')],
      YY: [
        r,
        function (A) {
          this.year = s(A)
        },
      ],
      YYYY: [/\d{4}/, a('year')],
      Z: c,
      ZZ: c,
    }
  function f(t) {
    var r, n
    ;((r = t), (n = o && o.formats))
    for (
      var i = (t = r.replace(
          /(\[[^\]]+])|(LTS?|l{1,4}|L{1,4})/g,
          function (e, t, r) {
            var i = r && r.toUpperCase()
            return (
              t ||
              n[r] ||
              A[r] ||
              n[i].replace(
                /(\[[^\]]+])|(MMMM|MM|DD|dddd)/g,
                function (A, e, t) {
                  return e || t.slice(1)
                },
              )
            )
          },
        )).match(e),
        s = i.length,
        a = 0;
      a < s;
      a += 1
    ) {
      var c = i[a],
        u = h[c],
        l = u && u[0],
        f = u && u[1]
      i[a] = f ? { regex: l, parser: f } : c.replace(/^\[|\]$/g, '')
    }
    return function (A) {
      for (var e = {}, t = 0, r = 0; t < s; t += 1) {
        var n = i[t]
        if ('string' == typeof n) r += n.length
        else {
          var o = n.regex,
            a = n.parser,
            c = A.slice(r),
            u = o.exec(c)[0]
          ;(a.call(e, u), (A = A.replace(u, '')))
        }
      }
      return (
        (function (A) {
          var e = A.afternoon
          if (void 0 !== e) {
            var t = A.hours
            ;(e ? t < 12 && (A.hours += 12) : 12 === t && (A.hours = 0),
              delete A.afternoon)
          }
        })(e),
        e
      )
    }
  }
  return function (A, e, t) {
    ;((t.p.customParseFormat = !0),
      A && A.parseTwoDigitYear && (s = A.parseTwoDigitYear))
    var r = e.prototype,
      n = r.parse
    r.parse = function (A) {
      var e = A.date,
        r = A.utc,
        i = A.args
      this.$u = r
      var s = i[1]
      if ('string' == typeof s) {
        var a = !0 === i[2],
          c = !0 === i[3],
          u = a || c,
          l = i[2]
        ;(c && (l = i[2]),
          (o = this.$locale()),
          !a && l && (o = t.Ls[l]),
          (this.$d = (function (A, e, t, r) {
            try {
              if (['x', 'X'].indexOf(e) > -1)
                return new Date(('X' === e ? 1e3 : 1) * A)
              var n = f(e)(A),
                i = n.year,
                o = n.month,
                s = n.day,
                a = n.hours,
                c = n.minutes,
                u = n.seconds,
                l = n.milliseconds,
                h = n.zone,
                d = n.week,
                B = new Date(),
                p = s || (i || o ? 1 : B.getDate()),
                g = i || B.getFullYear(),
                w = 0
              ;(i && !o) || (w = o > 0 ? o - 1 : B.getMonth())
              var m,
                C = a || 0,
                y = c || 0,
                Q = u || 0,
                F = l || 0
              return h
                ? new Date(Date.UTC(g, w, p, C, y, Q, F + 60 * h.offset * 1e3))
                : t
                  ? new Date(Date.UTC(g, w, p, C, y, Q, F))
                  : ((m = new Date(g, w, p, C, y, Q, F)),
                    d && (m = r(m).week(d).toDate()),
                    m)
            } catch (U) {
              return new Date('')
            }
          })(e, s, r, t)),
          this.init(),
          l && !0 !== l && (this.$L = this.locale(l).$L),
          u && e != this.format(s) && (this.$d = new Date('')),
          (o = {}))
      } else if (s instanceof Array)
        for (var h = s.length, d = 1; d <= h; d += 1) {
          i[1] = s[d - 1]
          var B = t.apply(this, i)
          if (B.isValid()) {
            ;((this.$d = B.$d), (this.$L = B.$L), this.init())
            break
          }
          d === h && (this.$d = new Date(''))
        }
      else n.call(this, A)
    }
  }
})()
const ui = ni(ci.exports)
var li = { exports: {} }
li.exports = function (A, e) {
  var t = e.prototype,
    r = t.format
  t.format = function (A) {
    var e = this,
      t = this.$locale()
    if (!this.isValid()) return r.bind(this)(A)
    var n = this.$utils(),
      i = (A || 'YYYY-MM-DDTHH:mm:ssZ').replace(
        /\[([^\]]+)]|Q|wo|ww|w|WW|W|zzz|z|gggg|GGGG|Do|X|x|k{1,2}|S/g,
        function (A) {
          switch (A) {
            case 'Q':
              return Math.ceil((e.$M + 1) / 3)
            case 'Do':
              return t.ordinal(e.$D)
            case 'gggg':
              return e.weekYear()
            case 'GGGG':
              return e.isoWeekYear()
            case 'wo':
              return t.ordinal(e.week(), 'W')
            case 'w':
            case 'ww':
              return n.s(e.week(), 'w' === A ? 1 : 2, '0')
            case 'W':
            case 'WW':
              return n.s(e.isoWeek(), 'W' === A ? 1 : 2, '0')
            case 'k':
            case 'kk':
              return n.s(String(0 === e.$H ? 24 : e.$H), 'k' === A ? 1 : 2, '0')
            case 'X':
              return Math.floor(e.$d.getTime() / 1e3)
            case 'x':
              return e.$d.getTime()
            case 'z':
              return '[' + e.offsetName() + ']'
            case 'zzz':
              return '[' + e.offsetName('long') + ']'
            default:
              return A
          }
        },
      )
    return r.bind(this)(i)
  }
}
const hi = ni(li.exports)
var fi,
  di,
  Bi = { exports: {} }
const pi = ni(
  (Bi.exports =
    ((fi = 'week'),
    (di = 'year'),
    function (A, e, t) {
      var r = e.prototype
      ;((r.week = function (A) {
        if ((void 0 === A && (A = null), null !== A))
          return this.add(7 * (A - this.week()), 'day')
        var e = this.$locale().yearStart || 1
        if (11 === this.month() && this.date() > 25) {
          var r = t(this).startOf(di).add(1, di).date(e),
            n = t(this).endOf(fi)
          if (r.isBefore(n)) return 1
        }
        var i = t(this)
            .startOf(di)
            .date(e)
            .startOf(fi)
            .subtract(1, 'millisecond'),
          o = this.diff(i, fi, !0)
        return o < 0 ? t(this).startOf('week').week() : Math.ceil(o)
      }),
        (r.weeks = function (A) {
          return (void 0 === A && (A = null), this.week(A))
        }))
    })),
)
var gi = { exports: {} }
gi.exports = function (A, e) {
  e.prototype.weekYear = function () {
    var A = this.month(),
      e = this.week(),
      t = this.year()
    return 1 === e && 11 === A ? t + 1 : 0 === A && e >= 52 ? t - 1 : t
  }
}
const wi = ni(gi.exports)
var mi = { exports: {} }
mi.exports = function (A, e, t) {
  e.prototype.dayOfYear = function (A) {
    var e =
      Math.round((t(this).startOf('day') - t(this).startOf('year')) / 864e5) + 1
    return null == A ? e : this.add(A - e, 'day')
  }
}
const Ci = ni(mi.exports)
var yi = { exports: {} }
yi.exports = function (A, e) {
  e.prototype.isSameOrAfter = function (A, e) {
    return this.isSame(A, e) || this.isAfter(A, e)
  }
}
const Qi = ni(yi.exports)
var Fi = { exports: {} }
Fi.exports = function (A, e) {
  e.prototype.isSameOrBefore = function (A, e) {
    return this.isSame(A, e) || this.isBefore(A, e)
  }
}
const Ui = ni(Fi.exports)
function vi() {
  return (
    (vi = Object.assign
      ? Object.assign.bind()
      : function (A) {
          for (var e = 1; e < arguments.length; e++) {
            var t = arguments[e]
            for (var r in t)
              Object.prototype.hasOwnProperty.call(t, r) && (A[r] = t[r])
          }
          return A
        }),
    vi.apply(this, arguments)
  )
}
function bi(A) {
  return (bi = Object.setPrototypeOf
    ? Object.getPrototypeOf.bind()
    : function (A) {
        return A.__proto__ || Object.getPrototypeOf(A)
      })(A)
}
function Ei(A, e) {
  return (Ei = Object.setPrototypeOf
    ? Object.setPrototypeOf.bind()
    : function (A, e) {
        return ((A.__proto__ = e), A)
      })(A, e)
}
function Hi(A, e, t) {
  return (Hi = (function () {
    if ('undefined' == typeof Reflect || !Reflect.construct) return !1
    if (Reflect.construct.sham) return !1
    if ('function' == typeof Proxy) return !0
    try {
      return (
        Boolean.prototype.valueOf.call(
          Reflect.construct(Boolean, [], function () {}),
        ),
        !0
      )
    } catch (fi) {
      return !1
    }
  })()
    ? Reflect.construct.bind()
    : function (A, e, t) {
        var r = [null]
        r.push.apply(r, e)
        var n = new (Function.bind.apply(A, r))()
        return (t && Ei(n, t.prototype), n)
      }).apply(null, arguments)
}
function _i(A) {
  var e = 'function' == typeof Map ? new Map() : void 0
  return (
    (_i = function (A) {
      if (
        null === A ||
        ((t = A), -1 === Function.toString.call(t).indexOf('[native code]'))
      )
        return A
      var t
      if ('function' != typeof A)
        throw new TypeError(
          'Super expression must either be null or a function',
        )
      if (void 0 !== e) {
        if (e.has(A)) return e.get(A)
        e.set(A, r)
      }
      function r() {
        return Hi(A, arguments, bi(this).constructor)
      }
      return (
        (r.prototype = Object.create(A.prototype, {
          constructor: {
            value: r,
            enumerable: !1,
            writable: !0,
            configurable: !0,
          },
        })),
        Ei(r, A)
      )
    }),
    _i(A)
  )
}
var Ii = /%[sdj%]/g
function Di(A) {
  if (!A || !A.length) return null
  var e = {}
  return (
    A.forEach(function (A) {
      var t = A.field
      ;((e[t] = e[t] || []), e[t].push(A))
    }),
    e
  )
}
function xi(A) {
  for (
    var e = arguments.length, t = new Array(e > 1 ? e - 1 : 0), r = 1;
    r < e;
    r++
  )
    t[r - 1] = arguments[r]
  var n = 0,
    i = t.length
  return 'function' == typeof A
    ? A.apply(null, t)
    : 'string' == typeof A
      ? A.replace(Ii, function (A) {
          if ('%%' === A) return '%'
          if (n >= i) return A
          switch (A) {
            case '%s':
              return String(t[n++])
            case '%d':
              return Number(t[n++])
            case '%j':
              try {
                return JSON.stringify(t[n++])
              } catch (e) {
                return '[Circular]'
              }
              break
            default:
              return A
          }
        })
      : A
}
function ki(A, e) {
  return (
    null == A ||
    !('array' !== e || !Array.isArray(A) || A.length) ||
    !(
      !(function (A) {
        return (
          'string' === A ||
          'url' === A ||
          'hex' === A ||
          'email' === A ||
          'date' === A ||
          'pattern' === A
        )
      })(e) ||
      'string' != typeof A ||
      A
    )
  )
}
function Li(A, e, t) {
  var r = 0,
    n = A.length
  !(function i(o) {
    if (o && o.length) t(o)
    else {
      var s = r
      ;((r += 1), s < n ? e(A[s], i) : t([]))
    }
  })([])
}
var Si = (function (A) {
  var e, t
  function r(e, t) {
    var r
    return (
      ((r = A.call(this, 'Async Validation Error') || this).errors = e),
      (r.fields = t),
      r
    )
  }
  return (
    (t = A),
    ((e = r).prototype = Object.create(t.prototype)),
    (e.prototype.constructor = e),
    Ei(e, t),
    r
  )
})(_i(Error))
function Oi(A, e, t, r, n) {
  if (e.first) {
    var i = new Promise(function (e, i) {
      var o = (function (A) {
        var e = []
        return (
          Object.keys(A).forEach(function (t) {
            e.push.apply(e, A[t] || [])
          }),
          e
        )
      })(A)
      Li(o, t, function (A) {
        return (r(A), A.length ? i(new Si(A, Di(A))) : e(n))
      })
    })
    return (
      i.catch(function (A) {
        return A
      }),
      i
    )
  }
  var o = !0 === e.firstFields ? Object.keys(A) : e.firstFields || [],
    s = Object.keys(A),
    a = s.length,
    c = 0,
    u = [],
    l = new Promise(function (e, i) {
      var l = function (A) {
        if ((u.push.apply(u, A), ++c === a))
          return (r(u), u.length ? i(new Si(u, Di(u))) : e(n))
      }
      ;(s.length || (r(u), e(n)),
        s.forEach(function (e) {
          var r = A[e]
          ;-1 !== o.indexOf(e)
            ? Li(r, t, l)
            : (function (A, e, t) {
                var r = [],
                  n = 0,
                  i = A.length
                function o(A) {
                  ;(r.push.apply(r, A || []), ++n === i && t(r))
                }
                A.forEach(function (A) {
                  e(A, o)
                })
              })(r, t, l)
        }))
    })
  return (
    l.catch(function (A) {
      return A
    }),
    l
  )
}
function Ki(A, e) {
  return function (t) {
    var r, n
    return (
      (r = A.fullFields
        ? (function (A, e) {
            for (var t = A, r = 0; r < e.length; r++) {
              if (null == t) return t
              t = t[e[r]]
            }
            return t
          })(e, A.fullFields)
        : e[t.field || A.fullField]),
      (n = t) && void 0 !== n.message
        ? ((t.field = t.field || A.fullField), (t.fieldValue = r), t)
        : {
            message: 'function' == typeof t ? t() : t,
            fieldValue: r,
            field: t.field || A.fullField,
          }
    )
  }
}
function Ti(A, e) {
  if (e)
    for (var t in e)
      if (e.hasOwnProperty(t)) {
        var r = e[t]
        'object' == typeof r && 'object' == typeof A[t]
          ? (A[t] = vi({}, A[t], r))
          : (A[t] = r)
      }
  return A
}
var Mi,
  Ri = function (A, e, t, r, n, i) {
    !A.required ||
      (t.hasOwnProperty(A.field) && !ki(e, i || A.type)) ||
      r.push(xi(n.messages.required, A.fullField))
  },
  Ni =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+\.)+[a-zA-Z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]{2,}))$/,
  Pi = /^#?([a-f0-9]{6}|[a-f0-9]{3})$/i,
  Vi = {
    integer: function (A) {
      return Vi.number(A) && parseInt(A, 10) === A
    },
    float: function (A) {
      return Vi.number(A) && !Vi.integer(A)
    },
    array: function (A) {
      return Array.isArray(A)
    },
    regexp: function (A) {
      if (A instanceof RegExp) return !0
      try {
        return !!new RegExp(A)
      } catch (fi) {
        return !1
      }
    },
    date: function (A) {
      return (
        'function' == typeof A.getTime &&
        'function' == typeof A.getMonth &&
        'function' == typeof A.getYear &&
        !isNaN(A.getTime())
      )
    },
    number: function (A) {
      return !isNaN(A) && 'number' == typeof A
    },
    object: function (A) {
      return 'object' == typeof A && !Vi.array(A)
    },
    method: function (A) {
      return 'function' == typeof A
    },
    email: function (A) {
      return 'string' == typeof A && A.length <= 320 && !!A.match(Ni)
    },
    url: function (A) {
      return (
        'string' == typeof A &&
        A.length <= 2048 &&
        !!A.match(
          (function () {
            if (Mi) return Mi
            var A = '[a-fA-F\\d:]',
              e = function (e) {
                return e && e.includeBoundaries
                  ? '(?:(?<=\\s|^)(?=' + A + ')|(?<=' + A + ')(?=\\s|$))'
                  : ''
              },
              t =
                '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}',
              r = '[a-fA-F\\d]{1,4}',
              n = (
                '\n(?:\n(?:' +
                r +
                ':){7}(?:' +
                r +
                '|:)|                                    // 1:2:3:4:5:6:7::  1:2:3:4:5:6:7:8\n(?:' +
                r +
                ':){6}(?:' +
                t +
                '|:' +
                r +
                '|:)|                             // 1:2:3:4:5:6::    1:2:3:4:5:6::8   1:2:3:4:5:6::8  1:2:3:4:5:6::1.2.3.4\n(?:' +
                r +
                ':){5}(?::' +
                t +
                '|(?::' +
                r +
                '){1,2}|:)|                   // 1:2:3:4:5::      1:2:3:4:5::7:8   1:2:3:4:5::8    1:2:3:4:5::7:1.2.3.4\n(?:' +
                r +
                ':){4}(?:(?::' +
                r +
                '){0,1}:' +
                t +
                '|(?::' +
                r +
                '){1,3}|:)| // 1:2:3:4::        1:2:3:4::6:7:8   1:2:3:4::8      1:2:3:4::6:7:1.2.3.4\n(?:' +
                r +
                ':){3}(?:(?::' +
                r +
                '){0,2}:' +
                t +
                '|(?::' +
                r +
                '){1,4}|:)| // 1:2:3::          1:2:3::5:6:7:8   1:2:3::8        1:2:3::5:6:7:1.2.3.4\n(?:' +
                r +
                ':){2}(?:(?::' +
                r +
                '){0,3}:' +
                t +
                '|(?::' +
                r +
                '){1,5}|:)| // 1:2::            1:2::4:5:6:7:8   1:2::8          1:2::4:5:6:7:1.2.3.4\n(?:' +
                r +
                ':){1}(?:(?::' +
                r +
                '){0,4}:' +
                t +
                '|(?::' +
                r +
                '){1,6}|:)| // 1::              1::3:4:5:6:7:8   1::8            1::3:4:5:6:7:1.2.3.4\n(?::(?:(?::' +
                r +
                '){0,5}:' +
                t +
                '|(?::' +
                r +
                '){1,7}|:))             // ::2:3:4:5:6:7:8  ::2:3:4:5:6:7:8  ::8             ::1.2.3.4\n)(?:%[0-9a-zA-Z]{1,})?                                             // %eth0            %1\n'
              )
                .replace(/\s*\/\/.*$/gm, '')
                .replace(/\n/g, '')
                .trim(),
              i = new RegExp('(?:^' + t + '$)|(?:^' + n + '$)'),
              o = new RegExp('^' + t + '$'),
              s = new RegExp('^' + n + '$'),
              a = function (A) {
                return A && A.exact
                  ? i
                  : new RegExp(
                      '(?:' + e(A) + t + e(A) + ')|(?:' + e(A) + n + e(A) + ')',
                      'g',
                    )
              }
            ;((a.v4 = function (A) {
              return A && A.exact ? o : new RegExp('' + e(A) + t + e(A), 'g')
            }),
              (a.v6 = function (A) {
                return A && A.exact ? s : new RegExp('' + e(A) + n + e(A), 'g')
              }))
            var c = a.v4().source,
              u = a.v6().source
            return (Mi = new RegExp(
              '(?:^(?:(?:(?:[a-z]+:)?//)|www\\.)(?:\\S+(?::\\S*)?@)?(?:localhost|' +
                c +
                '|' +
                u +
                '|(?:(?:[a-z\\u00a1-\\uffff0-9][-_]*)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))(?::\\d{2,5})?(?:[/?#][^\\s"]*)?$)',
              'i',
            ))
          })(),
        )
      )
    },
    hex: function (A) {
      return 'string' == typeof A && !!A.match(Pi)
    },
  },
  Gi = 'enum',
  zi = {
    required: Ri,
    whitespace: function (A, e, t, r, n) {
      ;(/^\s+$/.test(e) || '' === e) &&
        r.push(xi(n.messages.whitespace, A.fullField))
    },
    type: function (A, e, t, r, n) {
      if (A.required && void 0 === e) Ri(A, e, t, r, n)
      else {
        var i = A.type
        ;[
          'integer',
          'float',
          'array',
          'regexp',
          'object',
          'method',
          'email',
          'number',
          'date',
          'url',
          'hex',
        ].indexOf(i) > -1
          ? Vi[i](e) || r.push(xi(n.messages.types[i], A.fullField, A.type))
          : i &&
            typeof e !== A.type &&
            r.push(xi(n.messages.types[i], A.fullField, A.type))
      }
    },
    range: function (A, e, t, r, n) {
      var i = 'number' == typeof A.len,
        o = 'number' == typeof A.min,
        s = 'number' == typeof A.max,
        a = e,
        c = null,
        u = 'number' == typeof e,
        l = 'string' == typeof e,
        h = Array.isArray(e)
      if ((u ? (c = 'number') : l ? (c = 'string') : h && (c = 'array'), !c))
        return !1
      ;(h && (a = e.length),
        l && (a = e.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '_').length),
        i
          ? a !== A.len && r.push(xi(n.messages[c].len, A.fullField, A.len))
          : o && !s && a < A.min
            ? r.push(xi(n.messages[c].min, A.fullField, A.min))
            : s && !o && a > A.max
              ? r.push(xi(n.messages[c].max, A.fullField, A.max))
              : o &&
                s &&
                (a < A.min || a > A.max) &&
                r.push(xi(n.messages[c].range, A.fullField, A.min, A.max)))
    },
    enum: function (A, e, t, r, n) {
      ;((A[Gi] = Array.isArray(A[Gi]) ? A[Gi] : []),
        -1 === A[Gi].indexOf(e) &&
          r.push(xi(n.messages[Gi], A.fullField, A[Gi].join(', '))))
    },
    pattern: function (A, e, t, r, n) {
      if (A.pattern)
        if (A.pattern instanceof RegExp)
          ((A.pattern.lastIndex = 0),
            A.pattern.test(e) ||
              r.push(
                xi(n.messages.pattern.mismatch, A.fullField, e, A.pattern),
              ))
        else if ('string' == typeof A.pattern) {
          new RegExp(A.pattern).test(e) ||
            r.push(xi(n.messages.pattern.mismatch, A.fullField, e, A.pattern))
        }
    },
  },
  ji = function (A, e, t, r, n) {
    var i = A.type,
      o = []
    if (A.required || (!A.required && r.hasOwnProperty(A.field))) {
      if (ki(e, i) && !A.required) return t()
      ;(zi.required(A, e, r, o, n, i), ki(e, i) || zi.type(A, e, r, o, n))
    }
    t(o)
  },
  Wi = {
    string: function (A, e, t, r, n) {
      var i = []
      if (A.required || (!A.required && r.hasOwnProperty(A.field))) {
        if (ki(e, 'string') && !A.required) return t()
        ;(zi.required(A, e, r, i, n, 'string'),
          ki(e, 'string') ||
            (zi.type(A, e, r, i, n),
            zi.range(A, e, r, i, n),
            zi.pattern(A, e, r, i, n),
            !0 === A.whitespace && zi.whitespace(A, e, r, i, n)))
      }
      t(i)
    },
    method: function (A, e, t, r, n) {
      var i = []
      if (A.required || (!A.required && r.hasOwnProperty(A.field))) {
        if (ki(e) && !A.required) return t()
        ;(zi.required(A, e, r, i, n), void 0 !== e && zi.type(A, e, r, i, n))
      }
      t(i)
    },
    number: function (A, e, t, r, n) {
      var i = []
      if (A.required || (!A.required && r.hasOwnProperty(A.field))) {
        if (('' === e && (e = void 0), ki(e) && !A.required)) return t()
        ;(zi.required(A, e, r, i, n),
          void 0 !== e && (zi.type(A, e, r, i, n), zi.range(A, e, r, i, n)))
      }
      t(i)
    },
    boolean: function (A, e, t, r, n) {
      var i = []
      if (A.required || (!A.required && r.hasOwnProperty(A.field))) {
        if (ki(e) && !A.required) return t()
        ;(zi.required(A, e, r, i, n), void 0 !== e && zi.type(A, e, r, i, n))
      }
      t(i)
    },
    regexp: function (A, e, t, r, n) {
      var i = []
      if (A.required || (!A.required && r.hasOwnProperty(A.field))) {
        if (ki(e) && !A.required) return t()
        ;(zi.required(A, e, r, i, n), ki(e) || zi.type(A, e, r, i, n))
      }
      t(i)
    },
    integer: function (A, e, t, r, n) {
      var i = []
      if (A.required || (!A.required && r.hasOwnProperty(A.field))) {
        if (ki(e) && !A.required) return t()
        ;(zi.required(A, e, r, i, n),
          void 0 !== e && (zi.type(A, e, r, i, n), zi.range(A, e, r, i, n)))
      }
      t(i)
    },
    float: function (A, e, t, r, n) {
      var i = []
      if (A.required || (!A.required && r.hasOwnProperty(A.field))) {
        if (ki(e) && !A.required) return t()
        ;(zi.required(A, e, r, i, n),
          void 0 !== e && (zi.type(A, e, r, i, n), zi.range(A, e, r, i, n)))
      }
      t(i)
    },
    array: function (A, e, t, r, n) {
      var i = []
      if (A.required || (!A.required && r.hasOwnProperty(A.field))) {
        if (null == e && !A.required) return t()
        ;(zi.required(A, e, r, i, n, 'array'),
          null != e && (zi.type(A, e, r, i, n), zi.range(A, e, r, i, n)))
      }
      t(i)
    },
    object: function (A, e, t, r, n) {
      var i = []
      if (A.required || (!A.required && r.hasOwnProperty(A.field))) {
        if (ki(e) && !A.required) return t()
        ;(zi.required(A, e, r, i, n), void 0 !== e && zi.type(A, e, r, i, n))
      }
      t(i)
    },
    enum: function (A, e, t, r, n) {
      var i = []
      if (A.required || (!A.required && r.hasOwnProperty(A.field))) {
        if (ki(e) && !A.required) return t()
        ;(zi.required(A, e, r, i, n), void 0 !== e && zi.enum(A, e, r, i, n))
      }
      t(i)
    },
    pattern: function (A, e, t, r, n) {
      var i = []
      if (A.required || (!A.required && r.hasOwnProperty(A.field))) {
        if (ki(e, 'string') && !A.required) return t()
        ;(zi.required(A, e, r, i, n),
          ki(e, 'string') || zi.pattern(A, e, r, i, n))
      }
      t(i)
    },
    date: function (A, e, t, r, n) {
      var i = []
      if (A.required || (!A.required && r.hasOwnProperty(A.field))) {
        if (ki(e, 'date') && !A.required) return t()
        var o
        if ((zi.required(A, e, r, i, n), !ki(e, 'date')))
          ((o = e instanceof Date ? e : new Date(e)),
            zi.type(A, o, r, i, n),
            o && zi.range(A, o.getTime(), r, i, n))
      }
      t(i)
    },
    url: ji,
    hex: ji,
    email: ji,
    required: function (A, e, t, r, n) {
      var i = [],
        o = Array.isArray(e) ? 'array' : typeof e
      ;(zi.required(A, e, r, i, n, o), t(i))
    },
    any: function (A, e, t, r, n) {
      var i = []
      if (A.required || (!A.required && r.hasOwnProperty(A.field))) {
        if (ki(e) && !A.required) return t()
        zi.required(A, e, r, i, n)
      }
      t(i)
    },
  }
function qi() {
  return {
    default: 'Validation error on field %s',
    required: '%s is required',
    enum: '%s must be one of %s',
    whitespace: '%s cannot be empty',
    date: {
      format: '%s date %s is invalid for format %s',
      parse: '%s date could not be parsed, %s is invalid ',
      invalid: '%s date %s is invalid',
    },
    types: {
      string: '%s is not a %s',
      method: '%s is not a %s (function)',
      array: '%s is not an %s',
      object: '%s is not an %s',
      number: '%s is not a %s',
      date: '%s is not a %s',
      boolean: '%s is not a %s',
      integer: '%s is not an %s',
      float: '%s is not a %s',
      regexp: '%s is not a valid %s',
      email: '%s is not a valid %s',
      url: '%s is not a valid %s',
      hex: '%s is not a valid %s',
    },
    string: {
      len: '%s must be exactly %s characters',
      min: '%s must be at least %s characters',
      max: '%s cannot be longer than %s characters',
      range: '%s must be between %s and %s characters',
    },
    number: {
      len: '%s must equal %s',
      min: '%s cannot be less than %s',
      max: '%s cannot be greater than %s',
      range: '%s must be between %s and %s',
    },
    array: {
      len: '%s must be exactly %s in length',
      min: '%s cannot be less than %s in length',
      max: '%s cannot be greater than %s in length',
      range: '%s must be between %s and %s in length',
    },
    pattern: { mismatch: '%s value %s does not match pattern %s' },
    clone: function () {
      var A = JSON.parse(JSON.stringify(this))
      return ((A.clone = this.clone), A)
    },
  }
}
var Xi = qi(),
  Ji = (function () {
    function A(A) {
      ;((this.rules = null), (this._messages = Xi), this.define(A))
    }
    var e = A.prototype
    return (
      (e.define = function (A) {
        var e = this
        if (!A) throw new Error('Cannot configure a schema with no rules')
        if ('object' != typeof A || Array.isArray(A))
          throw new Error('Rules must be an object')
        ;((this.rules = {}),
          Object.keys(A).forEach(function (t) {
            var r = A[t]
            e.rules[t] = Array.isArray(r) ? r : [r]
          }))
      }),
      (e.messages = function (A) {
        return (A && (this._messages = Ti(qi(), A)), this._messages)
      }),
      (e.validate = function (e, t, r) {
        var n = this
        ;(void 0 === t && (t = {}), void 0 === r && (r = function () {}))
        var i = e,
          o = t,
          s = r
        if (
          ('function' == typeof o && ((s = o), (o = {})),
          !this.rules || 0 === Object.keys(this.rules).length)
        )
          return (s && s(null, i), Promise.resolve(i))
        if (o.messages) {
          var a = this.messages()
          ;(a === Xi && (a = qi()), Ti(a, o.messages), (o.messages = a))
        } else o.messages = this.messages()
        var c = {}
        ;(o.keys || Object.keys(this.rules)).forEach(function (A) {
          var t = n.rules[A],
            r = i[A]
          t.forEach(function (t) {
            var o = t
            ;('function' == typeof o.transform &&
              (i === e && (i = vi({}, i)), (r = i[A] = o.transform(r))),
              ((o =
                'function' == typeof o
                  ? { validator: o }
                  : vi({}, o)).validator = n.getValidationMethod(o)),
              o.validator &&
                ((o.field = A),
                (o.fullField = o.fullField || A),
                (o.type = n.getType(o)),
                (c[A] = c[A] || []),
                c[A].push({ rule: o, value: r, source: i, field: A })))
          })
        })
        var u = {}
        return Oi(
          c,
          o,
          function (e, t) {
            var r,
              n = e.rule,
              s = !(
                ('object' !== n.type && 'array' !== n.type) ||
                ('object' != typeof n.fields &&
                  'object' != typeof n.defaultField)
              )
            function a(A, e) {
              return vi({}, e, {
                fullField: n.fullField + '.' + A,
                fullFields: n.fullFields ? [].concat(n.fullFields, [A]) : [A],
              })
            }
            function c(r) {
              void 0 === r && (r = [])
              var c = Array.isArray(r) ? r : [r]
              ;(!o.suppressWarning &&
                c.length &&
                A.warning('async-validator:', c),
                c.length && void 0 !== n.message && (c = [].concat(n.message)))
              var l = c.map(Ki(n, i))
              if (o.first && l.length) return ((u[n.field] = 1), t(l))
              if (s) {
                if (n.required && !e.value)
                  return (
                    void 0 !== n.message
                      ? (l = [].concat(n.message).map(Ki(n, i)))
                      : o.error &&
                        (l = [o.error(n, xi(o.messages.required, n.field))]),
                    t(l)
                  )
                var h = {}
                ;(n.defaultField &&
                  Object.keys(e.value).map(function (A) {
                    h[A] = n.defaultField
                  }),
                  (h = vi({}, h, e.rule.fields)))
                var f = {}
                Object.keys(h).forEach(function (A) {
                  var e = h[A],
                    t = Array.isArray(e) ? e : [e]
                  f[A] = t.map(a.bind(null, A))
                })
                var d = new A(f)
                ;(d.messages(o.messages),
                  e.rule.options &&
                    ((e.rule.options.messages = o.messages),
                    (e.rule.options.error = o.error)),
                  d.validate(e.value, e.rule.options || o, function (A) {
                    var e = []
                    ;(l && l.length && e.push.apply(e, l),
                      A && A.length && e.push.apply(e, A),
                      t(e.length ? e : null))
                  }))
              } else t(l)
            }
            if (
              ((s = s && (n.required || (!n.required && e.value))),
              (n.field = e.field),
              n.asyncValidator)
            )
              r = n.asyncValidator(n, e.value, c, e.source, o)
            else if (n.validator) {
              try {
                r = n.validator(n, e.value, c, e.source, o)
              } catch (l) {
                ;(console.error,
                  o.suppressValidatorError ||
                    setTimeout(function () {
                      throw l
                    }, 0),
                  c(l.message))
              }
              !0 === r
                ? c()
                : !1 === r
                  ? c(
                      'function' == typeof n.message
                        ? n.message(n.fullField || n.field)
                        : n.message || (n.fullField || n.field) + ' fails',
                    )
                  : r instanceof Array
                    ? c(r)
                    : r instanceof Error && c(r.message)
            }
            r &&
              r.then &&
              r.then(
                function () {
                  return c()
                },
                function (A) {
                  return c(A)
                },
              )
          },
          function (A) {
            !(function (A) {
              var e = [],
                t = {}
              function r(A) {
                var t
                Array.isArray(A) ? (e = (t = e).concat.apply(t, A)) : e.push(A)
              }
              for (var n = 0; n < A.length; n++) r(A[n])
              e.length ? ((t = Di(e)), s(e, t)) : s(null, i)
            })(A)
          },
          i,
        )
      }),
      (e.getType = function (A) {
        if (
          (void 0 === A.type &&
            A.pattern instanceof RegExp &&
            (A.type = 'pattern'),
          'function' != typeof A.validator &&
            A.type &&
            !Wi.hasOwnProperty(A.type))
        )
          throw new Error(xi('Unknown rule type %s', A.type))
        return A.type || 'string'
      }),
      (e.getValidationMethod = function (A) {
        if ('function' == typeof A.validator) return A.validator
        var e = Object.keys(A),
          t = e.indexOf('message')
        return (
          -1 !== t && e.splice(t, 1),
          1 === e.length && 'required' === e[0]
            ? Wi.required
            : Wi[this.getType(A)] || void 0
        )
      }),
      A
    )
  })()
;((Ji.register = function (A, e) {
  if ('function' != typeof e)
    throw new Error(
      'Cannot register a validator by type, validator is not a function',
    )
  Wi[A] = e
}),
  (Ji.warning = function () {}),
  (Ji.messages = Xi),
  (Ji.validators = Wi))
var Yi =
  Number.isNaN ||
  function (A) {
    return 'number' == typeof A && A != A
  }
function Zi(A, e) {
  if (A.length !== e.length) return !1
  for (var t = 0; t < A.length; t++)
    if (((r = A[t]), (n = e[t]), !(r === n || (Yi(r) && Yi(n))))) return !1
  var r, n
  return !0
}
function $i(A, e) {
  void 0 === e && (e = Zi)
  var t = null
  function r() {
    for (var r = [], n = 0; n < arguments.length; n++) r[n] = arguments[n]
    if (t && t.lastThis === this && e(r, t.lastArgs)) return t.lastResult
    var i = A.apply(this, r)
    return ((t = { lastResult: i, lastArgs: r, lastThis: this }), i)
  }
  return (
    (r.clear = function () {
      t = null
    }),
    r
  )
}
var Ao,
  eo,
  to,
  ro,
  no,
  io,
  oo,
  so,
  ao,
  co,
  uo,
  lo,
  ho,
  fo,
  Bo,
  po = !1
function go() {
  if (!po) {
    po = !0
    var A = navigator.userAgent,
      e =
        /(?:MSIE.(\d+\.\d+))|(?:(?:Firefox|GranParadiso|Iceweasel).(\d+\.\d+))|(?:Opera(?:.+Version.|.)(\d+\.\d+))|(?:AppleWebKit.(\d+(?:\.\d+)?))|(?:Trident\/\d+\.\d+.*rv:(\d+\.\d+))/.exec(
          A,
        ),
      t = /(Mac OS X)|(Windows)|(Linux)/.exec(A)
    if (
      ((lo = /\b(iPhone|iP[ao]d)/.exec(A)),
      (ho = /\b(iP[ao]d)/.exec(A)),
      (co = /Android/i.exec(A)),
      (fo = /FBAN\/\w+;/i.exec(A)),
      (Bo = /Mobile/i.exec(A)),
      (uo = !!/Win64/.exec(A)),
      e)
    ) {
      ;(Ao = e[1] ? parseFloat(e[1]) : e[5] ? parseFloat(e[5]) : NaN) &&
        document &&
        document.documentMode &&
        (Ao = document.documentMode)
      var r = /(?:Trident\/(\d+.\d+))/.exec(A)
      ;((io = r ? parseFloat(r[1]) + 4 : Ao),
        (eo = e[2] ? parseFloat(e[2]) : NaN),
        (to = e[3] ? parseFloat(e[3]) : NaN),
        (ro = e[4] ? parseFloat(e[4]) : NaN)
          ? ((e = /(?:Chrome\/(\d+\.\d+))/.exec(A)),
            (no = e && e[1] ? parseFloat(e[1]) : NaN))
          : (no = NaN))
    } else Ao = eo = to = no = ro = NaN
    if (t) {
      if (t[1]) {
        var n = /(?:Mac OS X (\d+(?:[._]\d+)?))/.exec(A)
        oo = !n || parseFloat(n[1].replace('_', '.'))
      } else oo = !1
      ;((so = !!t[2]), (ao = !!t[3]))
    } else oo = so = ao = !1
  }
}
var wo,
  mo = {
    ie: function () {
      return go() || Ao
    },
    ieCompatibilityMode: function () {
      return go() || io > Ao
    },
    ie64: function () {
      return mo.ie() && uo
    },
    firefox: function () {
      return go() || eo
    },
    opera: function () {
      return go() || to
    },
    webkit: function () {
      return go() || ro
    },
    safari: function () {
      return mo.webkit()
    },
    chrome: function () {
      return go() || no
    },
    windows: function () {
      return go() || so
    },
    osx: function () {
      return go() || oo
    },
    linux: function () {
      return go() || ao
    },
    iphone: function () {
      return go() || lo
    },
    mobile: function () {
      return go() || lo || ho || co || Bo
    },
    nativeApp: function () {
      return go() || fo
    },
    android: function () {
      return go() || co
    },
    ipad: function () {
      return go() || ho
    },
  },
  Co = mo,
  yo = {
    canUseDOM: !!(
      typeof window < 'u' &&
      window.document &&
      window.document.createElement
    ),
  }
yo.canUseDOM &&
  (wo =
    document.implementation &&
    document.implementation.hasFeature &&
    !0 !== document.implementation.hasFeature('', ''))
var Qo = function (A, e) {
  if (!yo.canUseDOM || (e && !('addEventListener' in document))) return !1
  var t = 'on' + A,
    r = t in document
  if (!r) {
    var n = document.createElement('div')
    ;(n.setAttribute(t, 'return;'), (r = 'function' == typeof n[t]))
  }
  return (
    !r &&
      wo &&
      'wheel' === A &&
      (r = document.implementation.hasFeature('Events.wheel', '3.0')),
    r
  )
}
function Fo(A) {
  var e = 0,
    t = 0,
    r = 0,
    n = 0
  return (
    'detail' in A && (t = A.detail),
    'wheelDelta' in A && (t = -A.wheelDelta / 120),
    'wheelDeltaY' in A && (t = -A.wheelDeltaY / 120),
    'wheelDeltaX' in A && (e = -A.wheelDeltaX / 120),
    'axis' in A && A.axis === A.HORIZONTAL_AXIS && ((e = t), (t = 0)),
    (r = 10 * e),
    (n = 10 * t),
    'deltaY' in A && (n = A.deltaY),
    'deltaX' in A && (r = A.deltaX),
    (r || n) &&
      A.deltaMode &&
      (1 == A.deltaMode ? ((r *= 40), (n *= 40)) : ((r *= 800), (n *= 800))),
    r && !e && (e = r < 1 ? -1 : 1),
    n && !t && (t = n < 1 ? -1 : 1),
    { spinX: e, spinY: t, pixelX: r, pixelY: n }
  )
}
Fo.getEventType = function () {
  return Co.firefox() ? 'DOMMouseScroll' : Qo('wheel') ? 'wheel' : 'mousewheel'
}
var Uo = Fo
/**
 * Checks if an event is supported in the current execution environment.
 *
 * NOTE: This will not work correctly for non-generic events such as `change`,
 * `reset`, `load`, `error`, and `select`.
 *
 * Borrows from Modernizr.
 *
 * @param {string} eventNameSuffix Event name, e.g. "click".
 * @param {?boolean} capture Check if the capture phase is supported.
 * @return {boolean} True if the event is supported.
 * @internal
 * @license Modernizr 3.0.0pre (Custom Build) | MIT
 */ const vo = Math.min,
  bo = Math.max,
  Eo = Math.round,
  Ho = Math.floor,
  _o = (A) => ({ x: A, y: A }),
  Io = { left: 'right', right: 'left', bottom: 'top', top: 'bottom' },
  Do = { start: 'end', end: 'start' }
function xo(A, e, t) {
  return bo(A, vo(e, t))
}
function ko(A, e) {
  return 'function' == typeof A ? A(e) : A
}
function Lo(A) {
  return A.split('-')[0]
}
function So(A) {
  return A.split('-')[1]
}
function Oo(A) {
  return 'x' === A ? 'y' : 'x'
}
function Ko(A) {
  return 'y' === A ? 'height' : 'width'
}
function To(A) {
  return ['top', 'bottom'].includes(Lo(A)) ? 'y' : 'x'
}
function Mo(A) {
  return Oo(To(A))
}
function Ro(A) {
  return A.replace(/start|end/g, (A) => Do[A])
}
function No(A) {
  return A.replace(/left|right|bottom|top/g, (A) => Io[A])
}
function Po(A) {
  return 'number' != typeof A
    ? (function (A) {
        return { top: 0, right: 0, bottom: 0, left: 0, ...A }
      })(A)
    : { top: A, right: A, bottom: A, left: A }
}
function Vo(A) {
  const { x: e, y: t, width: r, height: n } = A
  return {
    width: r,
    height: n,
    top: t,
    left: e,
    right: e + r,
    bottom: t + n,
    x: e,
    y: t,
  }
}
function Go(A, e, t) {
  let { reference: r, floating: n } = A
  const i = To(e),
    o = Mo(e),
    s = Ko(o),
    a = Lo(e),
    c = 'y' === i,
    u = r.x + r.width / 2 - n.width / 2,
    l = r.y + r.height / 2 - n.height / 2,
    h = r[s] / 2 - n[s] / 2
  let f
  switch (a) {
    case 'top':
      f = { x: u, y: r.y - n.height }
      break
    case 'bottom':
      f = { x: u, y: r.y + r.height }
      break
    case 'right':
      f = { x: r.x + r.width, y: l }
      break
    case 'left':
      f = { x: r.x - n.width, y: l }
      break
    default:
      f = { x: r.x, y: r.y }
  }
  switch (So(e)) {
    case 'start':
      f[o] -= h * (t && c ? -1 : 1)
      break
    case 'end':
      f[o] += h * (t && c ? -1 : 1)
  }
  return f
}
async function zo(A, e) {
  var t
  void 0 === e && (e = {})
  const { x: r, y: n, platform: i, rects: o, elements: s, strategy: a } = A,
    {
      boundary: c = 'clippingAncestors',
      rootBoundary: u = 'viewport',
      elementContext: l = 'floating',
      altBoundary: h = !1,
      padding: f = 0,
    } = ko(e, A),
    d = Po(f),
    B = s[h ? ('floating' === l ? 'reference' : 'floating') : l],
    p = Vo(
      await i.getClippingRect({
        element:
          null == (t = await (null == i.isElement ? void 0 : i.isElement(B))) ||
          t
            ? B
            : B.contextElement ||
              (await (null == i.getDocumentElement
                ? void 0
                : i.getDocumentElement(s.floating))),
        boundary: c,
        rootBoundary: u,
        strategy: a,
      }),
    ),
    g =
      'floating' === l
        ? { x: r, y: n, width: o.floating.width, height: o.floating.height }
        : o.reference,
    w = await (null == i.getOffsetParent
      ? void 0
      : i.getOffsetParent(s.floating)),
    m = ((await (null == i.isElement ? void 0 : i.isElement(w))) &&
      (await (null == i.getScale ? void 0 : i.getScale(w)))) || { x: 1, y: 1 },
    C = Vo(
      i.convertOffsetParentRelativeRectToViewportRelativeRect
        ? await i.convertOffsetParentRelativeRectToViewportRelativeRect({
            elements: s,
            rect: g,
            offsetParent: w,
            strategy: a,
          })
        : g,
    )
  return {
    top: (p.top - C.top + d.top) / m.y,
    bottom: (C.bottom - p.bottom + d.bottom) / m.y,
    left: (p.left - C.left + d.left) / m.x,
    right: (C.right - p.right + d.right) / m.x,
  }
}
function jo() {
  return 'undefined' != typeof window
}
function Wo(A) {
  return Jo(A) ? (A.nodeName || '').toLowerCase() : '#document'
}
function qo(A) {
  var e
  return (
    (null == A || null == (e = A.ownerDocument) ? void 0 : e.defaultView) ||
    window
  )
}
function Xo(A) {
  var e
  return null == (e = (Jo(A) ? A.ownerDocument : A.document) || window.document)
    ? void 0
    : e.documentElement
}
function Jo(A) {
  return !!jo() && (A instanceof Node || A instanceof qo(A).Node)
}
function Yo(A) {
  return !!jo() && (A instanceof Element || A instanceof qo(A).Element)
}
function Zo(A) {
  return !!jo() && (A instanceof HTMLElement || A instanceof qo(A).HTMLElement)
}
function $o(A) {
  return (
    !(!jo() || 'undefined' == typeof ShadowRoot) &&
    (A instanceof ShadowRoot || A instanceof qo(A).ShadowRoot)
  )
}
function As(A) {
  const { overflow: e, overflowX: t, overflowY: r, display: n } = os(A)
  return (
    /auto|scroll|overlay|hidden|clip/.test(e + r + t) &&
    !['inline', 'contents'].includes(n)
  )
}
function es(A) {
  return ['table', 'td', 'th'].includes(Wo(A))
}
function ts(A) {
  return [':popover-open', ':modal'].some((e) => {
    try {
      return A.matches(e)
    } catch (fi) {
      return !1
    }
  })
}
function rs(A) {
  const e = ns(),
    t = Yo(A) ? os(A) : A
  return (
    ['transform', 'translate', 'scale', 'rotate', 'perspective'].some(
      (A) => !!t[A] && 'none' !== t[A],
    ) ||
    (!!t.containerType && 'normal' !== t.containerType) ||
    (!e && !!t.backdropFilter && 'none' !== t.backdropFilter) ||
    (!e && !!t.filter && 'none' !== t.filter) ||
    ['transform', 'translate', 'scale', 'rotate', 'perspective', 'filter'].some(
      (A) => (t.willChange || '').includes(A),
    ) ||
    ['paint', 'layout', 'strict', 'content'].some((A) =>
      (t.contain || '').includes(A),
    )
  )
}
function ns() {
  return (
    !('undefined' == typeof CSS || !CSS.supports) &&
    CSS.supports('-webkit-backdrop-filter', 'none')
  )
}
function is(A) {
  return ['html', 'body', '#document'].includes(Wo(A))
}
function os(A) {
  return qo(A).getComputedStyle(A)
}
function ss(A) {
  return Yo(A)
    ? { scrollLeft: A.scrollLeft, scrollTop: A.scrollTop }
    : { scrollLeft: A.scrollX, scrollTop: A.scrollY }
}
function as(A) {
  if ('html' === Wo(A)) return A
  const e = A.assignedSlot || A.parentNode || ($o(A) && A.host) || Xo(A)
  return $o(e) ? e.host : e
}
function cs(A) {
  const e = as(A)
  return is(e)
    ? A.ownerDocument
      ? A.ownerDocument.body
      : A.body
    : Zo(e) && As(e)
      ? e
      : cs(e)
}
function us(A, e, t) {
  var r
  ;(void 0 === e && (e = []), void 0 === t && (t = !0))
  const n = cs(A),
    i = n === (null == (r = A.ownerDocument) ? void 0 : r.body),
    o = qo(n)
  if (i) {
    const A = ls(o)
    return e.concat(
      o,
      o.visualViewport || [],
      As(n) ? n : [],
      A && t ? us(A) : [],
    )
  }
  return e.concat(n, us(n, [], t))
}
function ls(A) {
  return A.parent && Object.getPrototypeOf(A.parent) ? A.frameElement : null
}
function hs(A) {
  const e = os(A)
  let t = parseFloat(e.width) || 0,
    r = parseFloat(e.height) || 0
  const n = Zo(A),
    i = n ? A.offsetWidth : t,
    o = n ? A.offsetHeight : r,
    s = Eo(t) !== i || Eo(r) !== o
  return (s && ((t = i), (r = o)), { width: t, height: r, $: s })
}
function fs(A) {
  return Yo(A) ? A : A.contextElement
}
function ds(A) {
  const e = fs(A)
  if (!Zo(e)) return _o(1)
  const t = e.getBoundingClientRect(),
    { width: r, height: n, $: i } = hs(e)
  let o = (i ? Eo(t.width) : t.width) / r,
    s = (i ? Eo(t.height) : t.height) / n
  return (
    (o && Number.isFinite(o)) || (o = 1),
    (s && Number.isFinite(s)) || (s = 1),
    { x: o, y: s }
  )
}
const Bs = _o(0)
function ps(A) {
  const e = qo(A)
  return ns() && e.visualViewport
    ? { x: e.visualViewport.offsetLeft, y: e.visualViewport.offsetTop }
    : Bs
}
function gs(A, e, t, r) {
  ;(void 0 === e && (e = !1), void 0 === t && (t = !1))
  const n = A.getBoundingClientRect(),
    i = fs(A)
  let o = _o(1)
  e && (r ? Yo(r) && (o = ds(r)) : (o = ds(A)))
  const s = (function (A, e, t) {
    return (void 0 === e && (e = !1), !(!t || (e && t !== qo(A))) && e)
  })(i, t, r)
    ? ps(i)
    : _o(0)
  let a = (n.left + s.x) / o.x,
    c = (n.top + s.y) / o.y,
    u = n.width / o.x,
    l = n.height / o.y
  if (i) {
    const A = qo(i),
      e = r && Yo(r) ? qo(r) : r
    let t = A,
      n = ls(t)
    for (; n && r && e !== t; ) {
      const A = ds(n),
        e = n.getBoundingClientRect(),
        r = os(n),
        i = e.left + (n.clientLeft + parseFloat(r.paddingLeft)) * A.x,
        o = e.top + (n.clientTop + parseFloat(r.paddingTop)) * A.y
      ;((a *= A.x),
        (c *= A.y),
        (u *= A.x),
        (l *= A.y),
        (a += i),
        (c += o),
        (t = qo(n)),
        (n = ls(t)))
    }
  }
  return Vo({ width: u, height: l, x: a, y: c })
}
function ws(A, e) {
  const t = ss(A).scrollLeft
  return e ? e.left + t : gs(Xo(A)).left + t
}
function ms(A, e, t) {
  void 0 === t && (t = !1)
  const r = A.getBoundingClientRect()
  return {
    x: r.left + e.scrollLeft - (t ? 0 : ws(A, r)),
    y: r.top + e.scrollTop,
  }
}
function Cs(A, e, t) {
  let r
  if ('viewport' === e)
    r = (function (A, e) {
      const t = qo(A),
        r = Xo(A),
        n = t.visualViewport
      let i = r.clientWidth,
        o = r.clientHeight,
        s = 0,
        a = 0
      if (n) {
        ;((i = n.width), (o = n.height))
        const A = ns()
        ;(!A || (A && 'fixed' === e)) && ((s = n.offsetLeft), (a = n.offsetTop))
      }
      return { width: i, height: o, x: s, y: a }
    })(A, t)
  else if ('document' === e)
    r = (function (A) {
      const e = Xo(A),
        t = ss(A),
        r = A.ownerDocument.body,
        n = bo(e.scrollWidth, e.clientWidth, r.scrollWidth, r.clientWidth),
        i = bo(e.scrollHeight, e.clientHeight, r.scrollHeight, r.clientHeight)
      let o = -t.scrollLeft + ws(A)
      const s = -t.scrollTop
      return (
        'rtl' === os(r).direction &&
          (o += bo(e.clientWidth, r.clientWidth) - n),
        { width: n, height: i, x: o, y: s }
      )
    })(Xo(A))
  else if (Yo(e))
    r = (function (A, e) {
      const t = gs(A, !0, 'fixed' === e),
        r = t.top + A.clientTop,
        n = t.left + A.clientLeft,
        i = Zo(A) ? ds(A) : _o(1)
      return {
        width: A.clientWidth * i.x,
        height: A.clientHeight * i.y,
        x: n * i.x,
        y: r * i.y,
      }
    })(e, t)
  else {
    const t = ps(A)
    r = { x: e.x - t.x, y: e.y - t.y, width: e.width, height: e.height }
  }
  return Vo(r)
}
function ys(A, e) {
  const t = as(A)
  return (
    !(t === e || !Yo(t) || is(t)) && ('fixed' === os(t).position || ys(t, e))
  )
}
function Qs(A, e, t) {
  const r = Zo(e),
    n = Xo(e),
    i = 'fixed' === t,
    o = gs(A, !0, i, e)
  let s = { scrollLeft: 0, scrollTop: 0 }
  const a = _o(0)
  if (r || (!r && !i))
    if ((('body' !== Wo(e) || As(n)) && (s = ss(e)), r)) {
      const A = gs(e, !0, i, e)
      ;((a.x = A.x + e.clientLeft), (a.y = A.y + e.clientTop))
    } else n && (a.x = ws(n))
  const c = !n || r || i ? _o(0) : ms(n, s)
  return {
    x: o.left + s.scrollLeft - a.x - c.x,
    y: o.top + s.scrollTop - a.y - c.y,
    width: o.width,
    height: o.height,
  }
}
function Fs(A) {
  return 'static' === os(A).position
}
function Us(A, e) {
  if (!Zo(A) || 'fixed' === os(A).position) return null
  if (e) return e(A)
  let t = A.offsetParent
  return (Xo(A) === t && (t = t.ownerDocument.body), t)
}
function vs(A, e) {
  const t = qo(A)
  if (ts(A)) return t
  if (!Zo(A)) {
    let e = as(A)
    for (; e && !is(e); ) {
      if (Yo(e) && !Fs(e)) return e
      e = as(e)
    }
    return t
  }
  let r = Us(A, e)
  for (; r && es(r) && Fs(r); ) r = Us(r, e)
  return r && is(r) && Fs(r) && !rs(r)
    ? t
    : r ||
        (function (A) {
          let e = as(A)
          for (; Zo(e) && !is(e); ) {
            if (rs(e)) return e
            if (ts(e)) return null
            e = as(e)
          }
          return null
        })(A) ||
        t
}
const bs = {
  convertOffsetParentRelativeRectToViewportRelativeRect: function (A) {
    let { elements: e, rect: t, offsetParent: r, strategy: n } = A
    const i = 'fixed' === n,
      o = Xo(r),
      s = !!e && ts(e.floating)
    if (r === o || (s && i)) return t
    let a = { scrollLeft: 0, scrollTop: 0 },
      c = _o(1)
    const u = _o(0),
      l = Zo(r)
    if (
      (l || (!l && !i)) &&
      (('body' !== Wo(r) || As(o)) && (a = ss(r)), Zo(r))
    ) {
      const A = gs(r)
      ;((c = ds(r)), (u.x = A.x + r.clientLeft), (u.y = A.y + r.clientTop))
    }
    const h = !o || l || i ? _o(0) : ms(o, a, !0)
    return {
      width: t.width * c.x,
      height: t.height * c.y,
      x: t.x * c.x - a.scrollLeft * c.x + u.x + h.x,
      y: t.y * c.y - a.scrollTop * c.y + u.y + h.y,
    }
  },
  getDocumentElement: Xo,
  getClippingRect: function (A) {
    let { element: e, boundary: t, rootBoundary: r, strategy: n } = A
    const i = [
        ...('clippingAncestors' === t
          ? ts(e)
            ? []
            : (function (A, e) {
                const t = e.get(A)
                if (t) return t
                let r = us(A, [], !1).filter((A) => Yo(A) && 'body' !== Wo(A)),
                  n = null
                const i = 'fixed' === os(A).position
                let o = i ? as(A) : A
                for (; Yo(o) && !is(o); ) {
                  const e = os(o),
                    t = rs(o)
                  ;(t || 'fixed' !== e.position || (n = null),
                    (
                      i
                        ? !t && !n
                        : (!t &&
                            'static' === e.position &&
                            n &&
                            ['absolute', 'fixed'].includes(n.position)) ||
                          (As(o) && !t && ys(A, o))
                    )
                      ? (r = r.filter((A) => A !== o))
                      : (n = e),
                    (o = as(o)))
                }
                return (e.set(A, r), r)
              })(e, this._c)
          : [].concat(t)),
        r,
      ],
      o = i[0],
      s = i.reduce(
        (A, t) => {
          const r = Cs(e, t, n)
          return (
            (A.top = bo(r.top, A.top)),
            (A.right = vo(r.right, A.right)),
            (A.bottom = vo(r.bottom, A.bottom)),
            (A.left = bo(r.left, A.left)),
            A
          )
        },
        Cs(e, o, n),
      )
    return {
      width: s.right - s.left,
      height: s.bottom - s.top,
      x: s.left,
      y: s.top,
    }
  },
  getOffsetParent: vs,
  getElementRects: async function (A) {
    const e = this.getOffsetParent || vs,
      t = this.getDimensions,
      r = await t(A.floating)
    return {
      reference: Qs(A.reference, await e(A.floating), A.strategy),
      floating: { x: 0, y: 0, width: r.width, height: r.height },
    }
  },
  getClientRects: function (A) {
    return Array.from(A.getClientRects())
  },
  getDimensions: function (A) {
    const { width: e, height: t } = hs(A)
    return { width: e, height: t }
  },
  getScale: ds,
  isElement: Yo,
  isRTL: function (A) {
    return 'rtl' === os(A).direction
  },
}
function Es(A, e) {
  return (
    A.x === e.x && A.y === e.y && A.width === e.width && A.height === e.height
  )
}
function Hs(A, e, t, r) {
  void 0 === r && (r = {})
  const {
      ancestorScroll: n = !0,
      ancestorResize: i = !0,
      elementResize: o = 'function' == typeof ResizeObserver,
      layoutShift: s = 'function' == typeof IntersectionObserver,
      animationFrame: a = !1,
    } = r,
    c = fs(A),
    u = n || i ? [...(c ? us(c) : []), ...us(e)] : []
  u.forEach((A) => {
    ;(n && A.addEventListener('scroll', t, { passive: !0 }),
      i && A.addEventListener('resize', t))
  })
  const l =
    c && s
      ? (function (A, e) {
          let t,
            r = null
          const n = Xo(A)
          function i() {
            var A
            ;(clearTimeout(t), null == (A = r) || A.disconnect(), (r = null))
          }
          return (
            (function o(s, a) {
              ;(void 0 === s && (s = !1), void 0 === a && (a = 1), i())
              const c = A.getBoundingClientRect(),
                { left: u, top: l, width: h, height: f } = c
              if ((s || e(), !h || !f)) return
              const d = {
                rootMargin:
                  -Ho(l) +
                  'px ' +
                  -Ho(n.clientWidth - (u + h)) +
                  'px ' +
                  -Ho(n.clientHeight - (l + f)) +
                  'px ' +
                  -Ho(u) +
                  'px',
                threshold: bo(0, vo(1, a)) || 1,
              }
              let B = !0
              function p(e) {
                const r = e[0].intersectionRatio
                if (r !== a) {
                  if (!B) return o()
                  r
                    ? o(!1, r)
                    : (t = setTimeout(() => {
                        o(!1, 1e-7)
                      }, 1e3))
                }
                ;(1 !== r || Es(c, A.getBoundingClientRect()) || o(), (B = !1))
              }
              try {
                r = new IntersectionObserver(p, { ...d, root: n.ownerDocument })
              } catch (fi) {
                r = new IntersectionObserver(p, d)
              }
              r.observe(A)
            })(!0),
            i
          )
        })(c, t)
      : null
  let h,
    f = -1,
    d = null
  o &&
    ((d = new ResizeObserver((A) => {
      let [r] = A
      ;(r &&
        r.target === c &&
        d &&
        (d.unobserve(e),
        cancelAnimationFrame(f),
        (f = requestAnimationFrame(() => {
          var A
          null == (A = d) || A.observe(e)
        }))),
        t())
    })),
    c && !a && d.observe(c),
    d.observe(e))
  let B = a ? gs(A) : null
  return (
    a &&
      (function e() {
        const r = gs(A)
        B && !Es(B, r) && t()
        ;((B = r), (h = requestAnimationFrame(e)))
      })(),
    t(),
    () => {
      var A
      ;(u.forEach((A) => {
        ;(n && A.removeEventListener('scroll', t),
          i && A.removeEventListener('resize', t))
      }),
        null == l || l(),
        null == (A = d) || A.disconnect(),
        (d = null),
        a && cancelAnimationFrame(h))
    }
  )
}
const _s = zo,
  Is = function (A) {
    return (
      void 0 === A && (A = 0),
      {
        name: 'offset',
        options: A,
        async fn(e) {
          var t, r
          const { x: n, y: i, placement: o, middlewareData: s } = e,
            a = await (async function (A, e) {
              const { placement: t, platform: r, elements: n } = A,
                i = await (null == r.isRTL ? void 0 : r.isRTL(n.floating)),
                o = Lo(t),
                s = So(t),
                a = 'y' === To(t),
                c = ['left', 'top'].includes(o) ? -1 : 1,
                u = i && a ? -1 : 1,
                l = ko(e, A)
              let {
                mainAxis: h,
                crossAxis: f,
                alignmentAxis: d,
              } = 'number' == typeof l
                ? { mainAxis: l, crossAxis: 0, alignmentAxis: null }
                : {
                    mainAxis: l.mainAxis || 0,
                    crossAxis: l.crossAxis || 0,
                    alignmentAxis: l.alignmentAxis,
                  }
              return (
                s && 'number' == typeof d && (f = 'end' === s ? -1 * d : d),
                a ? { x: f * u, y: h * c } : { x: h * c, y: f * u }
              )
            })(e, A)
          return o === (null == (t = s.offset) ? void 0 : t.placement) &&
            null != (r = s.arrow) &&
            r.alignmentOffset
            ? {}
            : { x: n + a.x, y: i + a.y, data: { ...a, placement: o } }
        },
      }
    )
  },
  Ds = function (A) {
    return (
      void 0 === A && (A = {}),
      {
        name: 'shift',
        options: A,
        async fn(e) {
          const { x: t, y: r, placement: n } = e,
            {
              mainAxis: i = !0,
              crossAxis: o = !1,
              limiter: s = {
                fn: (A) => {
                  let { x: e, y: t } = A
                  return { x: e, y: t }
                },
              },
              ...a
            } = ko(A, e),
            c = { x: t, y: r },
            u = await zo(e, a),
            l = To(Lo(n)),
            h = Oo(l)
          let f = c[h],
            d = c[l]
          if (i) {
            const A = 'y' === h ? 'bottom' : 'right'
            f = xo(f + u['y' === h ? 'top' : 'left'], f, f - u[A])
          }
          if (o) {
            const A = 'y' === l ? 'bottom' : 'right'
            d = xo(d + u['y' === l ? 'top' : 'left'], d, d - u[A])
          }
          const B = s.fn({ ...e, [h]: f, [l]: d })
          return {
            ...B,
            data: { x: B.x - t, y: B.y - r, enabled: { [h]: i, [l]: o } },
          }
        },
      }
    )
  },
  xs = function (A) {
    return (
      void 0 === A && (A = {}),
      {
        name: 'flip',
        options: A,
        async fn(e) {
          var t, r
          const {
              placement: n,
              middlewareData: i,
              rects: o,
              initialPlacement: s,
              platform: a,
              elements: c,
            } = e,
            {
              mainAxis: u = !0,
              crossAxis: l = !0,
              fallbackPlacements: h,
              fallbackStrategy: f = 'bestFit',
              fallbackAxisSideDirection: d = 'none',
              flipAlignment: B = !0,
              ...p
            } = ko(A, e)
          if (null != (t = i.arrow) && t.alignmentOffset) return {}
          const g = Lo(n),
            w = To(s),
            m = Lo(s) === s,
            C = await (null == a.isRTL ? void 0 : a.isRTL(c.floating)),
            y =
              h ||
              (m || !B
                ? [No(s)]
                : (function (A) {
                    const e = No(A)
                    return [Ro(A), e, Ro(e)]
                  })(s)),
            Q = 'none' !== d
          !h &&
            Q &&
            y.push(
              ...(function (A, e, t, r) {
                const n = So(A)
                let i = (function (A, e, t) {
                  const r = ['left', 'right'],
                    n = ['right', 'left'],
                    i = ['top', 'bottom'],
                    o = ['bottom', 'top']
                  switch (A) {
                    case 'top':
                    case 'bottom':
                      return t ? (e ? n : r) : e ? r : n
                    case 'left':
                    case 'right':
                      return e ? i : o
                    default:
                      return []
                  }
                })(Lo(A), 'start' === t, r)
                return (
                  n &&
                    ((i = i.map((A) => A + '-' + n)),
                    e && (i = i.concat(i.map(Ro)))),
                  i
                )
              })(s, B, d, C),
            )
          const F = [s, ...y],
            U = await zo(e, p),
            v = []
          let b = (null == (r = i.flip) ? void 0 : r.overflows) || []
          if ((u && v.push(U[g]), l)) {
            const A = (function (A, e, t) {
              void 0 === t && (t = !1)
              const r = So(A),
                n = Mo(A),
                i = Ko(n)
              let o =
                'x' === n
                  ? r === (t ? 'end' : 'start')
                    ? 'right'
                    : 'left'
                  : 'start' === r
                    ? 'bottom'
                    : 'top'
              return (e.reference[i] > e.floating[i] && (o = No(o)), [o, No(o)])
            })(n, o, C)
            v.push(U[A[0]], U[A[1]])
          }
          if (
            ((b = [...b, { placement: n, overflows: v }]),
            !v.every((A) => A <= 0))
          ) {
            var E, H
            const A = ((null == (E = i.flip) ? void 0 : E.index) || 0) + 1,
              e = F[A]
            if (e)
              return {
                data: { index: A, overflows: b },
                reset: { placement: e },
              }
            let t =
              null ==
              (H = b
                .filter((A) => A.overflows[0] <= 0)
                .sort((A, e) => A.overflows[1] - e.overflows[1])[0])
                ? void 0
                : H.placement
            if (!t)
              switch (f) {
                case 'bestFit': {
                  var _
                  const A =
                    null ==
                    (_ = b
                      .filter((A) => {
                        if (Q) {
                          const e = To(A.placement)
                          return e === w || 'y' === e
                        }
                        return !0
                      })
                      .map((A) => [
                        A.placement,
                        A.overflows
                          .filter((A) => A > 0)
                          .reduce((A, e) => A + e, 0),
                      ])
                      .sort((A, e) => A[1] - e[1])[0])
                      ? void 0
                      : _[0]
                  A && (t = A)
                  break
                }
                case 'initialPlacement':
                  t = s
              }
            if (n !== t) return { reset: { placement: t } }
          }
          return {}
        },
      }
    )
  },
  ks = (A) => ({
    name: 'arrow',
    options: A,
    async fn(e) {
      const {
          x: t,
          y: r,
          placement: n,
          rects: i,
          platform: o,
          elements: s,
          middlewareData: a,
        } = e,
        { element: c, padding: u = 0 } = ko(A, e) || {}
      if (null == c) return {}
      const l = Po(u),
        h = { x: t, y: r },
        f = Mo(n),
        d = Ko(f),
        B = await o.getDimensions(c),
        p = 'y' === f,
        g = p ? 'top' : 'left',
        w = p ? 'bottom' : 'right',
        m = p ? 'clientHeight' : 'clientWidth',
        C = i.reference[d] + i.reference[f] - h[f] - i.floating[d],
        y = h[f] - i.reference[f],
        Q = await (null == o.getOffsetParent ? void 0 : o.getOffsetParent(c))
      let F = Q ? Q[m] : 0
      ;(F && (await (null == o.isElement ? void 0 : o.isElement(Q)))) ||
        (F = s.floating[m] || i.floating[d])
      const U = C / 2 - y / 2,
        v = F / 2 - B[d] / 2 - 1,
        b = vo(l[g], v),
        E = vo(l[w], v),
        H = b,
        _ = F - B[d] - E,
        I = F / 2 - B[d] / 2 + U,
        D = xo(H, I, _),
        x =
          !a.arrow &&
          null != So(n) &&
          I !== D &&
          i.reference[d] / 2 - (I < H ? b : E) - B[d] / 2 < 0,
        k = x ? (I < H ? I - H : I - _) : 0
      return {
        [f]: h[f] + k,
        data: {
          [f]: D,
          centerOffset: I - D - k,
          ...(x && { alignmentOffset: k }),
        },
        reset: x,
      }
    },
  }),
  Ls = (A, e, t) => {
    const r = new Map(),
      n = { platform: bs, ...t },
      i = { ...n.platform, _c: r }
    return (async (A, e, t) => {
      const {
          placement: r = 'bottom',
          strategy: n = 'absolute',
          middleware: i = [],
          platform: o,
        } = t,
        s = i.filter(Boolean),
        a = await (null == o.isRTL ? void 0 : o.isRTL(e))
      let c = await o.getElementRects({
          reference: A,
          floating: e,
          strategy: n,
        }),
        { x: u, y: l } = Go(c, r, a),
        h = r,
        f = {},
        d = 0
      for (let B = 0; B < s.length; B++) {
        const { name: t, fn: i } = s[B],
          {
            x: p,
            y: g,
            data: w,
            reset: m,
          } = await i({
            x: u,
            y: l,
            initialPlacement: r,
            placement: h,
            strategy: n,
            middlewareData: f,
            rects: c,
            platform: o,
            elements: { reference: A, floating: e },
          })
        ;((u = null != p ? p : u),
          (l = null != g ? g : l),
          (f = { ...f, [t]: { ...f[t], ...w } }),
          m &&
            d <= 50 &&
            (d++,
            'object' == typeof m &&
              (m.placement && (h = m.placement),
              m.rects &&
                (c =
                  !0 === m.rects
                    ? await o.getElementRects({
                        reference: A,
                        floating: e,
                        strategy: n,
                      })
                    : m.rects),
              ({ x: u, y: l } = Go(c, h, a))),
            (B = -1)))
      }
      return { x: u, y: l, placement: h, strategy: n, middlewareData: f }
    })(A, e, { ...n, platform: i })
  },
  Ss = Object.create(null)
;((Ss.open = '0'),
  (Ss.close = '1'),
  (Ss.ping = '2'),
  (Ss.pong = '3'),
  (Ss.message = '4'),
  (Ss.upgrade = '5'),
  (Ss.noop = '6'))
const Os = Object.create(null)
Object.keys(Ss).forEach((A) => {
  Os[Ss[A]] = A
})
const Ks = { type: 'error', data: 'parser error' },
  Ts =
    'function' == typeof Blob ||
    ('undefined' != typeof Blob &&
      '[object BlobConstructor]' === Object.prototype.toString.call(Blob)),
  Ms = 'function' == typeof ArrayBuffer,
  Rs = (A) =>
    'function' == typeof ArrayBuffer.isView
      ? ArrayBuffer.isView(A)
      : A && A.buffer instanceof ArrayBuffer,
  Ns = ({ type: A, data: e }, t, r) =>
    Ts && e instanceof Blob
      ? t
        ? r(e)
        : Ps(e, r)
      : Ms && (e instanceof ArrayBuffer || Rs(e))
        ? t
          ? r(e)
          : Ps(new Blob([e]), r)
        : r(Ss[A] + (e || '')),
  Ps = (A, e) => {
    const t = new FileReader()
    return (
      (t.onload = function () {
        const A = t.result.split(',')[1]
        e('b' + (A || ''))
      }),
      t.readAsDataURL(A)
    )
  }
function Vs(A) {
  return A instanceof Uint8Array
    ? A
    : A instanceof ArrayBuffer
      ? new Uint8Array(A)
      : new Uint8Array(A.buffer, A.byteOffset, A.byteLength)
}
let Gs
const zs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  js = 'undefined' == typeof Uint8Array ? [] : new Uint8Array(256)
for (let qC = 0; qC < 64; qC++) js[zs.charCodeAt(qC)] = qC
const Ws = 'function' == typeof ArrayBuffer,
  qs = (A, e) => {
    if ('string' != typeof A) return { type: 'message', data: Js(A, e) }
    const t = A.charAt(0)
    if ('b' === t) return { type: 'message', data: Xs(A.substring(1), e) }
    return Os[t]
      ? A.length > 1
        ? { type: Os[t], data: A.substring(1) }
        : { type: Os[t] }
      : Ks
  },
  Xs = (A, e) => {
    if (Ws) {
      const t = ((A) => {
        let e,
          t,
          r,
          n,
          i,
          o = 0.75 * A.length,
          s = A.length,
          a = 0
        '=' === A[A.length - 1] && (o--, '=' === A[A.length - 2] && o--)
        const c = new ArrayBuffer(o),
          u = new Uint8Array(c)
        for (e = 0; e < s; e += 4)
          ((t = js[A.charCodeAt(e)]),
            (r = js[A.charCodeAt(e + 1)]),
            (n = js[A.charCodeAt(e + 2)]),
            (i = js[A.charCodeAt(e + 3)]),
            (u[a++] = (t << 2) | (r >> 4)),
            (u[a++] = ((15 & r) << 4) | (n >> 2)),
            (u[a++] = ((3 & n) << 6) | (63 & i)))
        return c
      })(A)
      return Js(t, e)
    }
    return { base64: !0, data: A }
  },
  Js = (A, e) =>
    'blob' === e
      ? A instanceof Blob
        ? A
        : new Blob([A])
      : A instanceof ArrayBuffer
        ? A
        : A.buffer,
  Ys = String.fromCharCode(30)
function Zs() {
  return new TransformStream({
    transform(A, e) {
      !(function (A, e) {
        Ts && A.data instanceof Blob
          ? A.data.arrayBuffer().then(Vs).then(e)
          : Ms && (A.data instanceof ArrayBuffer || Rs(A.data))
            ? e(Vs(A.data))
            : Ns(A, !1, (A) => {
                ;(Gs || (Gs = new TextEncoder()), e(Gs.encode(A)))
              })
      })(A, (t) => {
        const r = t.length
        let n
        if (r < 126)
          ((n = new Uint8Array(1)), new DataView(n.buffer).setUint8(0, r))
        else if (r < 65536) {
          n = new Uint8Array(3)
          const A = new DataView(n.buffer)
          ;(A.setUint8(0, 126), A.setUint16(1, r))
        } else {
          n = new Uint8Array(9)
          const A = new DataView(n.buffer)
          ;(A.setUint8(0, 127), A.setBigUint64(1, BigInt(r)))
        }
        ;(A.data && 'string' != typeof A.data && (n[0] |= 128),
          e.enqueue(n),
          e.enqueue(t))
      })
    },
  })
}
let $s
function Aa(A) {
  return A.reduce((A, e) => A + e.length, 0)
}
function ea(A, e) {
  if (A[0].length === e) return A.shift()
  const t = new Uint8Array(e)
  let r = 0
  for (let n = 0; n < e; n++)
    ((t[n] = A[0][r++]), r === A[0].length && (A.shift(), (r = 0)))
  return (A.length && r < A[0].length && (A[0] = A[0].slice(r)), t)
}
function ta(A) {
  if (A)
    return (function (A) {
      for (var e in ta.prototype) A[e] = ta.prototype[e]
      return A
    })(A)
}
;((ta.prototype.on = ta.prototype.addEventListener =
  function (A, e) {
    return (
      (this._callbacks = this._callbacks || {}),
      (this._callbacks['$' + A] = this._callbacks['$' + A] || []).push(e),
      this
    )
  }),
  (ta.prototype.once = function (A, e) {
    function t() {
      ;(this.off(A, t), e.apply(this, arguments))
    }
    return ((t.fn = e), this.on(A, t), this)
  }),
  (ta.prototype.off =
    ta.prototype.removeListener =
    ta.prototype.removeAllListeners =
    ta.prototype.removeEventListener =
      function (A, e) {
        if (((this._callbacks = this._callbacks || {}), 0 == arguments.length))
          return ((this._callbacks = {}), this)
        var t,
          r = this._callbacks['$' + A]
        if (!r) return this
        if (1 == arguments.length)
          return (delete this._callbacks['$' + A], this)
        for (var n = 0; n < r.length; n++)
          if ((t = r[n]) === e || t.fn === e) {
            r.splice(n, 1)
            break
          }
        return (0 === r.length && delete this._callbacks['$' + A], this)
      }),
  (ta.prototype.emit = function (A) {
    this._callbacks = this._callbacks || {}
    for (
      var e = new Array(arguments.length - 1),
        t = this._callbacks['$' + A],
        r = 1;
      r < arguments.length;
      r++
    )
      e[r - 1] = arguments[r]
    if (t) {
      r = 0
      for (var n = (t = t.slice(0)).length; r < n; ++r) t[r].apply(this, e)
    }
    return this
  }),
  (ta.prototype.emitReserved = ta.prototype.emit),
  (ta.prototype.listeners = function (A) {
    return (
      (this._callbacks = this._callbacks || {}),
      this._callbacks['$' + A] || []
    )
  }),
  (ta.prototype.hasListeners = function (A) {
    return !!this.listeners(A).length
  }))
const ra =
    'function' == typeof Promise && 'function' == typeof Promise.resolve
      ? (A) => Promise.resolve().then(A)
      : (A, e) => e(A, 0),
  na =
    'undefined' != typeof self
      ? self
      : 'undefined' != typeof window
        ? window
        : Function('return this')()
function ia(A, ...e) {
  return e.reduce((e, t) => (A.hasOwnProperty(t) && (e[t] = A[t]), e), {})
}
const oa = na.setTimeout,
  sa = na.clearTimeout
function aa(A, e) {
  e.useNativeTimers
    ? ((A.setTimeoutFn = oa.bind(na)), (A.clearTimeoutFn = sa.bind(na)))
    : ((A.setTimeoutFn = na.setTimeout.bind(na)),
      (A.clearTimeoutFn = na.clearTimeout.bind(na)))
}
function ca() {
  return (
    Date.now().toString(36).substring(3) +
    Math.random().toString(36).substring(2, 5)
  )
}
class ua extends Error {
  constructor(A, e, t) {
    ;(super(A),
      (this.description = e),
      (this.context = t),
      (this.type = 'TransportError'))
  }
}
class la extends ta {
  constructor(A) {
    ;(super(),
      (this.writable = !1),
      aa(this, A),
      (this.opts = A),
      (this.query = A.query),
      (this.socket = A.socket),
      (this.supportsBinary = !A.forceBase64))
  }
  onError(A, e, t) {
    return (super.emitReserved('error', new ua(A, e, t)), this)
  }
  open() {
    return ((this.readyState = 'opening'), this.doOpen(), this)
  }
  close() {
    return (
      ('opening' !== this.readyState && 'open' !== this.readyState) ||
        (this.doClose(), this.onClose()),
      this
    )
  }
  send(A) {
    'open' === this.readyState && this.write(A)
  }
  onOpen() {
    ;((this.readyState = 'open'),
      (this.writable = !0),
      super.emitReserved('open'))
  }
  onData(A) {
    const e = qs(A, this.socket.binaryType)
    this.onPacket(e)
  }
  onPacket(A) {
    super.emitReserved('packet', A)
  }
  onClose(A) {
    ;((this.readyState = 'closed'), super.emitReserved('close', A))
  }
  pause(A) {}
  createUri(A, e = {}) {
    return (
      A +
      '://' +
      this._hostname() +
      this._port() +
      this.opts.path +
      this._query(e)
    )
  }
  _hostname() {
    const A = this.opts.hostname
    return -1 === A.indexOf(':') ? A : '[' + A + ']'
  }
  _port() {
    return this.opts.port &&
      ((this.opts.secure && Number(443 !== this.opts.port)) ||
        (!this.opts.secure && 80 !== Number(this.opts.port)))
      ? ':' + this.opts.port
      : ''
  }
  _query(A) {
    const e = (function (A) {
      let e = ''
      for (let t in A)
        A.hasOwnProperty(t) &&
          (e.length && (e += '&'),
          (e += encodeURIComponent(t) + '=' + encodeURIComponent(A[t])))
      return e
    })(A)
    return e.length ? '?' + e : ''
  }
}
class ha extends la {
  constructor() {
    ;(super(...arguments), (this._polling = !1))
  }
  get name() {
    return 'polling'
  }
  doOpen() {
    this._poll()
  }
  pause(A) {
    this.readyState = 'pausing'
    const e = () => {
      ;((this.readyState = 'paused'), A())
    }
    if (this._polling || !this.writable) {
      let A = 0
      ;(this._polling &&
        (A++,
        this.once('pollComplete', function () {
          --A || e()
        })),
        this.writable ||
          (A++,
          this.once('drain', function () {
            --A || e()
          })))
    } else e()
  }
  _poll() {
    ;((this._polling = !0), this.doPoll(), this.emitReserved('poll'))
  }
  onData(A) {
    ;(((A, e) => {
      const t = A.split(Ys),
        r = []
      for (let n = 0; n < t.length; n++) {
        const A = qs(t[n], e)
        if ((r.push(A), 'error' === A.type)) break
      }
      return r
    })(A, this.socket.binaryType).forEach((A) => {
      if (
        ('opening' === this.readyState && 'open' === A.type && this.onOpen(),
        'close' === A.type)
      )
        return (
          this.onClose({ description: 'transport closed by the server' }),
          !1
        )
      this.onPacket(A)
    }),
      'closed' !== this.readyState &&
        ((this._polling = !1),
        this.emitReserved('pollComplete'),
        'open' === this.readyState && this._poll()))
  }
  doClose() {
    const A = () => {
      this.write([{ type: 'close' }])
    }
    'open' === this.readyState ? A() : this.once('open', A)
  }
  write(A) {
    ;((this.writable = !1),
      ((A, e) => {
        const t = A.length,
          r = new Array(t)
        let n = 0
        A.forEach((A, i) => {
          Ns(A, !1, (A) => {
            ;((r[i] = A), ++n === t && e(r.join(Ys)))
          })
        })
      })(A, (A) => {
        this.doWrite(A, () => {
          ;((this.writable = !0), this.emitReserved('drain'))
        })
      }))
  }
  uri() {
    const A = this.opts.secure ? 'https' : 'http',
      e = this.query || {}
    return (
      !1 !== this.opts.timestampRequests &&
        (e[this.opts.timestampParam] = ca()),
      this.supportsBinary || e.sid || (e.b64 = 1),
      this.createUri(A, e)
    )
  }
}
let fa = !1
try {
  fa =
    'undefined' != typeof XMLHttpRequest &&
    'withCredentials' in new XMLHttpRequest()
} catch (WC) {}
const da = fa
function Ba() {}
class pa extends ha {
  constructor(A) {
    if ((super(A), 'undefined' != typeof location)) {
      const e = 'https:' === location.protocol
      let t = location.port
      ;(t || (t = e ? '443' : '80'),
        (this.xd =
          ('undefined' != typeof location &&
            A.hostname !== location.hostname) ||
          t !== A.port))
    }
  }
  doWrite(A, e) {
    const t = this.request({ method: 'POST', data: A })
    ;(t.on('success', e),
      t.on('error', (A, e) => {
        this.onError('xhr post error', A, e)
      }))
  }
  doPoll() {
    const A = this.request()
    ;(A.on('data', this.onData.bind(this)),
      A.on('error', (A, e) => {
        this.onError('xhr poll error', A, e)
      }),
      (this.pollXhr = A))
  }
}
class ga extends ta {
  constructor(A, e, t) {
    ;(super(),
      (this.createRequest = A),
      aa(this, t),
      (this._opts = t),
      (this._method = t.method || 'GET'),
      (this._uri = e),
      (this._data = void 0 !== t.data ? t.data : null),
      this._create())
  }
  _create() {
    var A
    const e = ia(
      this._opts,
      'agent',
      'pfx',
      'key',
      'passphrase',
      'cert',
      'ca',
      'ciphers',
      'rejectUnauthorized',
      'autoUnref',
    )
    e.xdomain = !!this._opts.xd
    const t = (this._xhr = this.createRequest(e))
    try {
      t.open(this._method, this._uri, !0)
      try {
        if (this._opts.extraHeaders) {
          t.setDisableHeaderCheck && t.setDisableHeaderCheck(!0)
          for (let A in this._opts.extraHeaders)
            this._opts.extraHeaders.hasOwnProperty(A) &&
              t.setRequestHeader(A, this._opts.extraHeaders[A])
        }
      } catch (fi) {}
      if ('POST' === this._method)
        try {
          t.setRequestHeader('Content-type', 'text/plain;charset=UTF-8')
        } catch (fi) {}
      try {
        t.setRequestHeader('Accept', '*/*')
      } catch (fi) {}
      ;(null === (A = this._opts.cookieJar) || void 0 === A || A.addCookies(t),
        'withCredentials' in t &&
          (t.withCredentials = this._opts.withCredentials),
        this._opts.requestTimeout && (t.timeout = this._opts.requestTimeout),
        (t.onreadystatechange = () => {
          var A
          ;(3 === t.readyState &&
            (null === (A = this._opts.cookieJar) ||
              void 0 === A ||
              A.parseCookies(t.getResponseHeader('set-cookie'))),
            4 === t.readyState &&
              (200 === t.status || 1223 === t.status
                ? this._onLoad()
                : this.setTimeoutFn(() => {
                    this._onError('number' == typeof t.status ? t.status : 0)
                  }, 0)))
        }),
        t.send(this._data))
    } catch (fi) {
      return void this.setTimeoutFn(() => {
        this._onError(fi)
      }, 0)
    }
    'undefined' != typeof document &&
      ((this._index = ga.requestsCount++), (ga.requests[this._index] = this))
  }
  _onError(A) {
    ;(this.emitReserved('error', A, this._xhr), this._cleanup(!0))
  }
  _cleanup(A) {
    if (void 0 !== this._xhr && null !== this._xhr) {
      if (((this._xhr.onreadystatechange = Ba), A))
        try {
          this._xhr.abort()
        } catch (fi) {}
      ;('undefined' != typeof document && delete ga.requests[this._index],
        (this._xhr = null))
    }
  }
  _onLoad() {
    const A = this._xhr.responseText
    null !== A &&
      (this.emitReserved('data', A),
      this.emitReserved('success'),
      this._cleanup())
  }
  abort() {
    this._cleanup()
  }
}
if (
  ((ga.requestsCount = 0), (ga.requests = {}), 'undefined' != typeof document)
)
  if ('function' == typeof attachEvent) attachEvent('onunload', wa)
  else if ('function' == typeof addEventListener) {
    addEventListener('onpagehide' in na ? 'pagehide' : 'unload', wa, !1)
  }
function wa() {
  for (let A in ga.requests)
    ga.requests.hasOwnProperty(A) && ga.requests[A].abort()
}
const ma = (function () {
  const A = Ca({ xdomain: !1 })
  return A && null !== A.responseType
})()
function Ca(A) {
  const e = A.xdomain
  try {
    if ('undefined' != typeof XMLHttpRequest && (!e || da))
      return new XMLHttpRequest()
  } catch (fi) {}
  if (!e)
    try {
      return new na[['Active'].concat('Object').join('X')]('Microsoft.XMLHTTP')
    } catch (fi) {}
}
const ya =
  'undefined' != typeof navigator &&
  'string' == typeof navigator.product &&
  'reactnative' === navigator.product.toLowerCase()
class Qa extends la {
  get name() {
    return 'websocket'
  }
  doOpen() {
    const A = this.uri(),
      e = this.opts.protocols,
      t = ya
        ? {}
        : ia(
            this.opts,
            'agent',
            'perMessageDeflate',
            'pfx',
            'key',
            'passphrase',
            'cert',
            'ca',
            'ciphers',
            'rejectUnauthorized',
            'localAddress',
            'protocolVersion',
            'origin',
            'maxPayload',
            'family',
            'checkServerIdentity',
          )
    this.opts.extraHeaders && (t.headers = this.opts.extraHeaders)
    try {
      this.ws = this.createSocket(A, e, t)
    } catch (WC) {
      return this.emitReserved('error', WC)
    }
    ;((this.ws.binaryType = this.socket.binaryType), this.addEventListeners())
  }
  addEventListeners() {
    ;((this.ws.onopen = () => {
      ;(this.opts.autoUnref && this.ws._socket.unref(), this.onOpen())
    }),
      (this.ws.onclose = (A) =>
        this.onClose({
          description: 'websocket connection closed',
          context: A,
        })),
      (this.ws.onmessage = (A) => this.onData(A.data)),
      (this.ws.onerror = (A) => this.onError('websocket error', A)))
  }
  write(A) {
    this.writable = !1
    for (let e = 0; e < A.length; e++) {
      const t = A[e],
        r = e === A.length - 1
      Ns(t, this.supportsBinary, (A) => {
        try {
          this.doWrite(t, A)
        } catch (fi) {}
        r &&
          ra(() => {
            ;((this.writable = !0), this.emitReserved('drain'))
          }, this.setTimeoutFn)
      })
    }
  }
  doClose() {
    void 0 !== this.ws &&
      ((this.ws.onerror = () => {}), this.ws.close(), (this.ws = null))
  }
  uri() {
    const A = this.opts.secure ? 'wss' : 'ws',
      e = this.query || {}
    return (
      this.opts.timestampRequests && (e[this.opts.timestampParam] = ca()),
      this.supportsBinary || (e.b64 = 1),
      this.createUri(A, e)
    )
  }
}
const Fa = na.WebSocket || na.MozWebSocket
const Ua = {
    websocket: class extends Qa {
      createSocket(A, e, t) {
        return ya ? new Fa(A, e, t) : e ? new Fa(A, e) : new Fa(A)
      }
      doWrite(A, e) {
        this.ws.send(e)
      }
    },
    webtransport: class extends la {
      get name() {
        return 'webtransport'
      }
      doOpen() {
        try {
          this._transport = new WebTransport(
            this.createUri('https'),
            this.opts.transportOptions[this.name],
          )
        } catch (WC) {
          return this.emitReserved('error', WC)
        }
        ;(this._transport.closed
          .then(() => {
            this.onClose()
          })
          .catch((A) => {
            this.onError('webtransport error', A)
          }),
          this._transport.ready.then(() => {
            this._transport.createBidirectionalStream().then((A) => {
              const e = (function (A, e) {
                  $s || ($s = new TextDecoder())
                  const t = []
                  let r = 0,
                    n = -1,
                    i = !1
                  return new TransformStream({
                    transform(o, s) {
                      for (t.push(o); ; ) {
                        if (0 === r) {
                          if (Aa(t) < 1) break
                          const A = ea(t, 1)
                          ;((i = !(128 & ~A[0])),
                            (n = 127 & A[0]),
                            (r = n < 126 ? 3 : 126 === n ? 1 : 2))
                        } else if (1 === r) {
                          if (Aa(t) < 2) break
                          const A = ea(t, 2)
                          ;((n = new DataView(
                            A.buffer,
                            A.byteOffset,
                            A.length,
                          ).getUint16(0)),
                            (r = 3))
                        } else if (2 === r) {
                          if (Aa(t) < 8) break
                          const A = ea(t, 8),
                            e = new DataView(A.buffer, A.byteOffset, A.length),
                            i = e.getUint32(0)
                          if (i > Math.pow(2, 21) - 1) {
                            s.enqueue(Ks)
                            break
                          }
                          ;((n = i * Math.pow(2, 32) + e.getUint32(4)), (r = 3))
                        } else {
                          if (Aa(t) < n) break
                          const A = ea(t, n)
                          ;(s.enqueue(qs(i ? A : $s.decode(A), e)), (r = 0))
                        }
                        if (0 === n || n > A) {
                          s.enqueue(Ks)
                          break
                        }
                      }
                    },
                  })
                })(Number.MAX_SAFE_INTEGER, this.socket.binaryType),
                t = A.readable.pipeThrough(e).getReader(),
                r = Zs()
              ;(r.readable.pipeTo(A.writable),
                (this._writer = r.writable.getWriter()))
              const n = () => {
                t.read()
                  .then(({ done: A, value: e }) => {
                    A || (this.onPacket(e), n())
                  })
                  .catch((A) => {})
              }
              n()
              const i = { type: 'open' }
              ;(this.query.sid && (i.data = `{"sid":"${this.query.sid}"}`),
                this._writer.write(i).then(() => this.onOpen()))
            })
          }))
      }
      write(A) {
        this.writable = !1
        for (let e = 0; e < A.length; e++) {
          const t = A[e],
            r = e === A.length - 1
          this._writer.write(t).then(() => {
            r &&
              ra(() => {
                ;((this.writable = !0), this.emitReserved('drain'))
              }, this.setTimeoutFn)
          })
        }
      }
      doClose() {
        var A
        null === (A = this._transport) || void 0 === A || A.close()
      }
    },
    polling: class extends pa {
      constructor(A) {
        super(A)
        const e = A && A.forceBase64
        this.supportsBinary = ma && !e
      }
      request(A = {}) {
        return (
          Object.assign(A, { xd: this.xd }, this.opts),
          new ga(Ca, this.uri(), A)
        )
      }
    },
  },
  va =
    /^(?:(?![^:@\/?#]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@\/?#]*)(?::([^:@\/?#]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/,
  ba = [
    'source',
    'protocol',
    'authority',
    'userInfo',
    'user',
    'password',
    'host',
    'port',
    'relative',
    'path',
    'directory',
    'file',
    'query',
    'anchor',
  ]
function Ea(A) {
  if (A.length > 8e3) throw 'URI too long'
  const e = A,
    t = A.indexOf('['),
    r = A.indexOf(']')
  ;-1 != t &&
    -1 != r &&
    (A =
      A.substring(0, t) +
      A.substring(t, r).replace(/:/g, ';') +
      A.substring(r, A.length))
  let n = va.exec(A || ''),
    i = {},
    o = 14
  for (; o--; ) i[ba[o]] = n[o] || ''
  return (
    -1 != t &&
      -1 != r &&
      ((i.source = e),
      (i.host = i.host.substring(1, i.host.length - 1).replace(/;/g, ':')),
      (i.authority = i.authority
        .replace('[', '')
        .replace(']', '')
        .replace(/;/g, ':')),
      (i.ipv6uri = !0)),
    (i.pathNames = (function (A, e) {
      const t = /\/{2,9}/g,
        r = e.replace(t, '/').split('/')
      ;('/' != e.slice(0, 1) && 0 !== e.length) || r.splice(0, 1)
      '/' == e.slice(-1) && r.splice(r.length - 1, 1)
      return r
    })(0, i.path)),
    (i.queryKey = (function (A, e) {
      const t = {}
      return (
        e.replace(/(?:^|&)([^&=]*)=?([^&]*)/g, function (A, e, r) {
          e && (t[e] = r)
        }),
        t
      )
    })(0, i.query)),
    i
  )
}
const Ha =
    'function' == typeof addEventListener &&
    'function' == typeof removeEventListener,
  _a = []
Ha &&
  addEventListener(
    'offline',
    () => {
      _a.forEach((A) => A())
    },
    !1,
  )
class Ia extends ta {
  constructor(A, e) {
    if (
      (super(),
      (this.binaryType = 'arraybuffer'),
      (this.writeBuffer = []),
      (this._prevBufferLen = 0),
      (this._pingInterval = -1),
      (this._pingTimeout = -1),
      (this._maxPayload = -1),
      (this._pingTimeoutTime = Infinity),
      A && 'object' == typeof A && ((e = A), (A = null)),
      A)
    ) {
      const t = Ea(A)
      ;((e.hostname = t.host),
        (e.secure = 'https' === t.protocol || 'wss' === t.protocol),
        (e.port = t.port),
        t.query && (e.query = t.query))
    } else e.host && (e.hostname = Ea(e.host).host)
    ;(aa(this, e),
      (this.secure =
        null != e.secure
          ? e.secure
          : 'undefined' != typeof location && 'https:' === location.protocol),
      e.hostname && !e.port && (e.port = this.secure ? '443' : '80'),
      (this.hostname =
        e.hostname ||
        ('undefined' != typeof location ? location.hostname : 'localhost')),
      (this.port =
        e.port ||
        ('undefined' != typeof location && location.port
          ? location.port
          : this.secure
            ? '443'
            : '80')),
      (this.transports = []),
      (this._transportsByName = {}),
      e.transports.forEach((A) => {
        const e = A.prototype.name
        ;(this.transports.push(e), (this._transportsByName[e] = A))
      }),
      (this.opts = Object.assign(
        {
          path: '/engine.io',
          agent: !1,
          withCredentials: !1,
          upgrade: !0,
          timestampParam: 't',
          rememberUpgrade: !1,
          addTrailingSlash: !0,
          rejectUnauthorized: !0,
          perMessageDeflate: { threshold: 1024 },
          transportOptions: {},
          closeOnBeforeunload: !1,
        },
        e,
      )),
      (this.opts.path =
        this.opts.path.replace(/\/$/, '') +
        (this.opts.addTrailingSlash ? '/' : '')),
      'string' == typeof this.opts.query &&
        (this.opts.query = (function (A) {
          let e = {},
            t = A.split('&')
          for (let r = 0, n = t.length; r < n; r++) {
            let A = t[r].split('=')
            e[decodeURIComponent(A[0])] = decodeURIComponent(A[1])
          }
          return e
        })(this.opts.query)),
      Ha &&
        (this.opts.closeOnBeforeunload &&
          ((this._beforeunloadEventListener = () => {
            this.transport &&
              (this.transport.removeAllListeners(), this.transport.close())
          }),
          addEventListener(
            'beforeunload',
            this._beforeunloadEventListener,
            !1,
          )),
        'localhost' !== this.hostname &&
          ((this._offlineEventListener = () => {
            this._onClose('transport close', {
              description: 'network connection lost',
            })
          }),
          _a.push(this._offlineEventListener))),
      this.opts.withCredentials && (this._cookieJar = void 0),
      this._open())
  }
  createTransport(A) {
    const e = Object.assign({}, this.opts.query)
    ;((e.EIO = 4), (e.transport = A), this.id && (e.sid = this.id))
    const t = Object.assign(
      {},
      this.opts,
      {
        query: e,
        socket: this,
        hostname: this.hostname,
        secure: this.secure,
        port: this.port,
      },
      this.opts.transportOptions[A],
    )
    return new this._transportsByName[A](t)
  }
  _open() {
    if (0 === this.transports.length)
      return void this.setTimeoutFn(() => {
        this.emitReserved('error', 'No transports available')
      }, 0)
    const A =
      this.opts.rememberUpgrade &&
      Ia.priorWebsocketSuccess &&
      -1 !== this.transports.indexOf('websocket')
        ? 'websocket'
        : this.transports[0]
    this.readyState = 'opening'
    const e = this.createTransport(A)
    ;(e.open(), this.setTransport(e))
  }
  setTransport(A) {
    ;(this.transport && this.transport.removeAllListeners(),
      (this.transport = A),
      A.on('drain', this._onDrain.bind(this))
        .on('packet', this._onPacket.bind(this))
        .on('error', this._onError.bind(this))
        .on('close', (A) => this._onClose('transport close', A)))
  }
  onOpen() {
    ;((this.readyState = 'open'),
      (Ia.priorWebsocketSuccess = 'websocket' === this.transport.name),
      this.emitReserved('open'),
      this.flush())
  }
  _onPacket(A) {
    if (
      'opening' === this.readyState ||
      'open' === this.readyState ||
      'closing' === this.readyState
    )
      switch (
        (this.emitReserved('packet', A), this.emitReserved('heartbeat'), A.type)
      ) {
        case 'open':
          this.onHandshake(JSON.parse(A.data))
          break
        case 'ping':
          ;(this._sendPacket('pong'),
            this.emitReserved('ping'),
            this.emitReserved('pong'),
            this._resetPingTimeout())
          break
        case 'error':
          const e = new Error('server error')
          ;((e.code = A.data), this._onError(e))
          break
        case 'message':
          ;(this.emitReserved('data', A.data),
            this.emitReserved('message', A.data))
      }
  }
  onHandshake(A) {
    ;(this.emitReserved('handshake', A),
      (this.id = A.sid),
      (this.transport.query.sid = A.sid),
      (this._pingInterval = A.pingInterval),
      (this._pingTimeout = A.pingTimeout),
      (this._maxPayload = A.maxPayload),
      this.onOpen(),
      'closed' !== this.readyState && this._resetPingTimeout())
  }
  _resetPingTimeout() {
    this.clearTimeoutFn(this._pingTimeoutTimer)
    const A = this._pingInterval + this._pingTimeout
    ;((this._pingTimeoutTime = Date.now() + A),
      (this._pingTimeoutTimer = this.setTimeoutFn(() => {
        this._onClose('ping timeout')
      }, A)),
      this.opts.autoUnref && this._pingTimeoutTimer.unref())
  }
  _onDrain() {
    ;(this.writeBuffer.splice(0, this._prevBufferLen),
      (this._prevBufferLen = 0),
      0 === this.writeBuffer.length ? this.emitReserved('drain') : this.flush())
  }
  flush() {
    if (
      'closed' !== this.readyState &&
      this.transport.writable &&
      !this.upgrading &&
      this.writeBuffer.length
    ) {
      const A = this._getWritablePackets()
      ;(this.transport.send(A),
        (this._prevBufferLen = A.length),
        this.emitReserved('flush'))
    }
  }
  _getWritablePackets() {
    if (
      !(
        this._maxPayload &&
        'polling' === this.transport.name &&
        this.writeBuffer.length > 1
      )
    )
      return this.writeBuffer
    let A = 1
    for (let t = 0; t < this.writeBuffer.length; t++) {
      const r = this.writeBuffer[t].data
      if (
        (r &&
          (A +=
            'string' == typeof (e = r)
              ? (function (A) {
                  let e = 0,
                    t = 0
                  for (let r = 0, n = A.length; r < n; r++)
                    ((e = A.charCodeAt(r)),
                      e < 128
                        ? (t += 1)
                        : e < 2048
                          ? (t += 2)
                          : e < 55296 || e >= 57344
                            ? (t += 3)
                            : (r++, (t += 4)))
                  return t
                })(e)
              : Math.ceil(1.33 * (e.byteLength || e.size))),
        t > 0 && A > this._maxPayload)
      )
        return this.writeBuffer.slice(0, t)
      A += 2
    }
    var e
    return this.writeBuffer
  }
  _hasPingExpired() {
    if (!this._pingTimeoutTime) return !0
    const A = Date.now() > this._pingTimeoutTime
    return (
      A &&
        ((this._pingTimeoutTime = 0),
        ra(() => {
          this._onClose('ping timeout')
        }, this.setTimeoutFn)),
      A
    )
  }
  write(A, e, t) {
    return (this._sendPacket('message', A, e, t), this)
  }
  send(A, e, t) {
    return (this._sendPacket('message', A, e, t), this)
  }
  _sendPacket(A, e, t, r) {
    if (
      ('function' == typeof e && ((r = e), (e = void 0)),
      'function' == typeof t && ((r = t), (t = null)),
      'closing' === this.readyState || 'closed' === this.readyState)
    )
      return
    ;(t = t || {}).compress = !1 !== t.compress
    const n = { type: A, data: e, options: t }
    ;(this.emitReserved('packetCreate', n),
      this.writeBuffer.push(n),
      r && this.once('flush', r),
      this.flush())
  }
  close() {
    const A = () => {
        ;(this._onClose('forced close'), this.transport.close())
      },
      e = () => {
        ;(this.off('upgrade', e), this.off('upgradeError', e), A())
      },
      t = () => {
        ;(this.once('upgrade', e), this.once('upgradeError', e))
      }
    return (
      ('opening' !== this.readyState && 'open' !== this.readyState) ||
        ((this.readyState = 'closing'),
        this.writeBuffer.length
          ? this.once('drain', () => {
              this.upgrading ? t() : A()
            })
          : this.upgrading
            ? t()
            : A()),
      this
    )
  }
  _onError(A) {
    if (
      ((Ia.priorWebsocketSuccess = !1),
      this.opts.tryAllTransports &&
        this.transports.length > 1 &&
        'opening' === this.readyState)
    )
      return (this.transports.shift(), this._open())
    ;(this.emitReserved('error', A), this._onClose('transport error', A))
  }
  _onClose(A, e) {
    if (
      'opening' === this.readyState ||
      'open' === this.readyState ||
      'closing' === this.readyState
    ) {
      if (
        (this.clearTimeoutFn(this._pingTimeoutTimer),
        this.transport.removeAllListeners('close'),
        this.transport.close(),
        this.transport.removeAllListeners(),
        Ha &&
          (this._beforeunloadEventListener &&
            removeEventListener(
              'beforeunload',
              this._beforeunloadEventListener,
              !1,
            ),
          this._offlineEventListener))
      ) {
        const A = _a.indexOf(this._offlineEventListener)
        ;-1 !== A && _a.splice(A, 1)
      }
      ;((this.readyState = 'closed'),
        (this.id = null),
        this.emitReserved('close', A, e),
        (this.writeBuffer = []),
        (this._prevBufferLen = 0))
    }
  }
}
Ia.protocol = 4
class Da extends Ia {
  constructor() {
    ;(super(...arguments), (this._upgrades = []))
  }
  onOpen() {
    if ((super.onOpen(), 'open' === this.readyState && this.opts.upgrade))
      for (let A = 0; A < this._upgrades.length; A++)
        this._probe(this._upgrades[A])
  }
  _probe(A) {
    let e = this.createTransport(A),
      t = !1
    Ia.priorWebsocketSuccess = !1
    const r = () => {
      t ||
        (e.send([{ type: 'ping', data: 'probe' }]),
        e.once('packet', (A) => {
          if (!t)
            if ('pong' === A.type && 'probe' === A.data) {
              if (
                ((this.upgrading = !0), this.emitReserved('upgrading', e), !e)
              )
                return
              ;((Ia.priorWebsocketSuccess = 'websocket' === e.name),
                this.transport.pause(() => {
                  t ||
                    ('closed' !== this.readyState &&
                      (c(),
                      this.setTransport(e),
                      e.send([{ type: 'upgrade' }]),
                      this.emitReserved('upgrade', e),
                      (e = null),
                      (this.upgrading = !1),
                      this.flush()))
                }))
            } else {
              const A = new Error('probe error')
              ;((A.transport = e.name), this.emitReserved('upgradeError', A))
            }
        }))
    }
    function n() {
      t || ((t = !0), c(), e.close(), (e = null))
    }
    const i = (A) => {
      const t = new Error('probe error: ' + A)
      ;((t.transport = e.name), n(), this.emitReserved('upgradeError', t))
    }
    function o() {
      i('transport closed')
    }
    function s() {
      i('socket closed')
    }
    function a(A) {
      e && A.name !== e.name && n()
    }
    const c = () => {
      ;(e.removeListener('open', r),
        e.removeListener('error', i),
        e.removeListener('close', o),
        this.off('close', s),
        this.off('upgrading', a))
    }
    ;(e.once('open', r),
      e.once('error', i),
      e.once('close', o),
      this.once('close', s),
      this.once('upgrading', a),
      -1 !== this._upgrades.indexOf('webtransport') && 'webtransport' !== A
        ? this.setTimeoutFn(() => {
            t || e.open()
          }, 200)
        : e.open())
  }
  onHandshake(A) {
    ;((this._upgrades = this._filterUpgrades(A.upgrades)), super.onHandshake(A))
  }
  _filterUpgrades(A) {
    const e = []
    for (let t = 0; t < A.length; t++)
      ~this.transports.indexOf(A[t]) && e.push(A[t])
    return e
  }
}
let xa = class extends Da {
  constructor(A, e = {}) {
    const t = 'object' == typeof A ? A : e
    ;((!t.transports || (t.transports && 'string' == typeof t.transports[0])) &&
      (t.transports = (t.transports || ['polling', 'websocket', 'webtransport'])
        .map((A) => Ua[A])
        .filter((A) => !!A)),
      super(A, t))
  }
}
const ka = 'function' == typeof ArrayBuffer,
  La = Object.prototype.toString,
  Sa =
    'function' == typeof Blob ||
    ('undefined' != typeof Blob &&
      '[object BlobConstructor]' === La.call(Blob)),
  Oa =
    'function' == typeof File ||
    ('undefined' != typeof File && '[object FileConstructor]' === La.call(File))
function Ka(A) {
  return (
    (ka &&
      (A instanceof ArrayBuffer ||
        ((A) =>
          'function' == typeof ArrayBuffer.isView
            ? ArrayBuffer.isView(A)
            : A.buffer instanceof ArrayBuffer)(A))) ||
    (Sa && A instanceof Blob) ||
    (Oa && A instanceof File)
  )
}
function Ta(A, e) {
  if (!A || 'object' != typeof A) return !1
  if (Array.isArray(A)) {
    for (let e = 0, t = A.length; e < t; e++) if (Ta(A[e])) return !0
    return !1
  }
  if (Ka(A)) return !0
  if (A.toJSON && 'function' == typeof A.toJSON && 1 === arguments.length)
    return Ta(A.toJSON(), !0)
  for (const t in A)
    if (Object.prototype.hasOwnProperty.call(A, t) && Ta(A[t])) return !0
  return !1
}
function Ma(A) {
  const e = [],
    t = A.data,
    r = A
  return (
    (r.data = Ra(t, e)),
    (r.attachments = e.length),
    { packet: r, buffers: e }
  )
}
function Ra(A, e) {
  if (!A) return A
  if (Ka(A)) {
    const t = { _placeholder: !0, num: e.length }
    return (e.push(A), t)
  }
  if (Array.isArray(A)) {
    const t = new Array(A.length)
    for (let r = 0; r < A.length; r++) t[r] = Ra(A[r], e)
    return t
  }
  if ('object' == typeof A && !(A instanceof Date)) {
    const t = {}
    for (const r in A)
      Object.prototype.hasOwnProperty.call(A, r) && (t[r] = Ra(A[r], e))
    return t
  }
  return A
}
function Na(A, e) {
  return ((A.data = Pa(A.data, e)), delete A.attachments, A)
}
function Pa(A, e) {
  if (!A) return A
  if (A && !0 === A._placeholder) {
    if ('number' == typeof A.num && A.num >= 0 && A.num < e.length)
      return e[A.num]
    throw new Error('illegal attachments')
  }
  if (Array.isArray(A)) for (let t = 0; t < A.length; t++) A[t] = Pa(A[t], e)
  else if ('object' == typeof A)
    for (const t in A)
      Object.prototype.hasOwnProperty.call(A, t) && (A[t] = Pa(A[t], e))
  return A
}
const Va = [
  'connect',
  'connect_error',
  'disconnect',
  'disconnecting',
  'newListener',
  'removeListener',
]
var Ga, za
;(((za = Ga || (Ga = {}))[(za.CONNECT = 0)] = 'CONNECT'),
  (za[(za.DISCONNECT = 1)] = 'DISCONNECT'),
  (za[(za.EVENT = 2)] = 'EVENT'),
  (za[(za.ACK = 3)] = 'ACK'),
  (za[(za.CONNECT_ERROR = 4)] = 'CONNECT_ERROR'),
  (za[(za.BINARY_EVENT = 5)] = 'BINARY_EVENT'),
  (za[(za.BINARY_ACK = 6)] = 'BINARY_ACK'))
function ja(A) {
  return '[object Object]' === Object.prototype.toString.call(A)
}
class Wa extends ta {
  constructor(A) {
    ;(super(), (this.reviver = A))
  }
  add(A) {
    let e
    if ('string' == typeof A) {
      if (this.reconstructor)
        throw new Error('got plaintext data when reconstructing a packet')
      e = this.decodeString(A)
      const t = e.type === Ga.BINARY_EVENT
      t || e.type === Ga.BINARY_ACK
        ? ((e.type = t ? Ga.EVENT : Ga.ACK),
          (this.reconstructor = new qa(e)),
          0 === e.attachments && super.emitReserved('decoded', e))
        : super.emitReserved('decoded', e)
    } else {
      if (!Ka(A) && !A.base64) throw new Error('Unknown type: ' + A)
      if (!this.reconstructor)
        throw new Error('got binary data when not reconstructing a packet')
      ;((e = this.reconstructor.takeBinaryData(A)),
        e && ((this.reconstructor = null), super.emitReserved('decoded', e)))
    }
  }
  decodeString(A) {
    let e = 0
    const t = { type: Number(A.charAt(0)) }
    if (void 0 === Ga[t.type]) throw new Error('unknown packet type ' + t.type)
    if (t.type === Ga.BINARY_EVENT || t.type === Ga.BINARY_ACK) {
      const r = e + 1
      for (; '-' !== A.charAt(++e) && e != A.length; );
      const n = A.substring(r, e)
      if (n != Number(n) || '-' !== A.charAt(e))
        throw new Error('Illegal attachments')
      t.attachments = Number(n)
    }
    if ('/' === A.charAt(e + 1)) {
      const r = e + 1
      for (; ++e; ) {
        if (',' === A.charAt(e)) break
        if (e === A.length) break
      }
      t.nsp = A.substring(r, e)
    } else t.nsp = '/'
    const r = A.charAt(e + 1)
    if ('' !== r && Number(r) == r) {
      const r = e + 1
      for (; ++e; ) {
        const t = A.charAt(e)
        if (null == t || Number(t) != t) {
          --e
          break
        }
        if (e === A.length) break
      }
      t.id = Number(A.substring(r, e + 1))
    }
    if (A.charAt(++e)) {
      const r = this.tryParse(A.substr(e))
      if (!Wa.isPayloadValid(t.type, r)) throw new Error('invalid payload')
      t.data = r
    }
    return t
  }
  tryParse(A) {
    try {
      return JSON.parse(A, this.reviver)
    } catch (fi) {
      return !1
    }
  }
  static isPayloadValid(A, e) {
    switch (A) {
      case Ga.CONNECT:
        return ja(e)
      case Ga.DISCONNECT:
        return void 0 === e
      case Ga.CONNECT_ERROR:
        return 'string' == typeof e || ja(e)
      case Ga.EVENT:
      case Ga.BINARY_EVENT:
        return (
          Array.isArray(e) &&
          ('number' == typeof e[0] ||
            ('string' == typeof e[0] && -1 === Va.indexOf(e[0])))
        )
      case Ga.ACK:
      case Ga.BINARY_ACK:
        return Array.isArray(e)
    }
  }
  destroy() {
    this.reconstructor &&
      (this.reconstructor.finishedReconstruction(), (this.reconstructor = null))
  }
}
class qa {
  constructor(A) {
    ;((this.packet = A), (this.buffers = []), (this.reconPack = A))
  }
  takeBinaryData(A) {
    if (
      (this.buffers.push(A), this.buffers.length === this.reconPack.attachments)
    ) {
      const A = Na(this.reconPack, this.buffers)
      return (this.finishedReconstruction(), A)
    }
    return null
  }
  finishedReconstruction() {
    ;((this.reconPack = null), (this.buffers = []))
  }
}
const Xa = Object.freeze(
  Object.defineProperty(
    {
      __proto__: null,
      Decoder: Wa,
      Encoder: class {
        constructor(A) {
          this.replacer = A
        }
        encode(A) {
          return (A.type !== Ga.EVENT && A.type !== Ga.ACK) || !Ta(A)
            ? [this.encodeAsString(A)]
            : this.encodeAsBinary({
                type: A.type === Ga.EVENT ? Ga.BINARY_EVENT : Ga.BINARY_ACK,
                nsp: A.nsp,
                data: A.data,
                id: A.id,
              })
        }
        encodeAsString(A) {
          let e = '' + A.type
          return (
            (A.type !== Ga.BINARY_EVENT && A.type !== Ga.BINARY_ACK) ||
              (e += A.attachments + '-'),
            A.nsp && '/' !== A.nsp && (e += A.nsp + ','),
            null != A.id && (e += A.id),
            null != A.data && (e += JSON.stringify(A.data, this.replacer)),
            e
          )
        }
        encodeAsBinary(A) {
          const e = Ma(A),
            t = this.encodeAsString(e.packet),
            r = e.buffers
          return (r.unshift(t), r)
        }
      },
      get PacketType() {
        return Ga
      },
      protocol: 5,
    },
    Symbol.toStringTag,
    { value: 'Module' },
  ),
)
function Ja(A, e, t) {
  return (
    A.on(e, t),
    function () {
      A.off(e, t)
    }
  )
}
const Ya = Object.freeze({
  connect: 1,
  connect_error: 1,
  disconnect: 1,
  disconnecting: 1,
  newListener: 1,
  removeListener: 1,
})
class Za extends ta {
  constructor(A, e, t) {
    ;(super(),
      (this.connected = !1),
      (this.recovered = !1),
      (this.receiveBuffer = []),
      (this.sendBuffer = []),
      (this._queue = []),
      (this._queueSeq = 0),
      (this.ids = 0),
      (this.acks = {}),
      (this.flags = {}),
      (this.io = A),
      (this.nsp = e),
      t && t.auth && (this.auth = t.auth),
      (this._opts = Object.assign({}, t)),
      this.io._autoConnect && this.open())
  }
  get disconnected() {
    return !this.connected
  }
  subEvents() {
    if (this.subs) return
    const A = this.io
    this.subs = [
      Ja(A, 'open', this.onopen.bind(this)),
      Ja(A, 'packet', this.onpacket.bind(this)),
      Ja(A, 'error', this.onerror.bind(this)),
      Ja(A, 'close', this.onclose.bind(this)),
    ]
  }
  get active() {
    return !!this.subs
  }
  connect() {
    return (
      this.connected ||
        (this.subEvents(),
        this.io._reconnecting || this.io.open(),
        'open' === this.io._readyState && this.onopen()),
      this
    )
  }
  open() {
    return this.connect()
  }
  send(...A) {
    return (A.unshift('message'), this.emit.apply(this, A), this)
  }
  emit(A, ...e) {
    var t, r, n
    if (Ya.hasOwnProperty(A))
      throw new Error('"' + A.toString() + '" is a reserved event name')
    if (
      (e.unshift(A),
      this._opts.retries && !this.flags.fromQueue && !this.flags.volatile)
    )
      return (this._addToQueue(e), this)
    const i = { type: Ga.EVENT, data: e, options: {} }
    if (
      ((i.options.compress = !1 !== this.flags.compress),
      'function' == typeof e[e.length - 1])
    ) {
      const A = this.ids++,
        t = e.pop()
      ;(this._registerAckCallback(A, t), (i.id = A))
    }
    const o =
        null ===
          (r =
            null === (t = this.io.engine) || void 0 === t
              ? void 0
              : t.transport) || void 0 === r
          ? void 0
          : r.writable,
      s =
        this.connected &&
        !(null === (n = this.io.engine) || void 0 === n
          ? void 0
          : n._hasPingExpired())
    return (
      (this.flags.volatile && !o) ||
        (s
          ? (this.notifyOutgoingListeners(i), this.packet(i))
          : this.sendBuffer.push(i)),
      (this.flags = {}),
      this
    )
  }
  _registerAckCallback(A, e) {
    var t
    const r =
      null !== (t = this.flags.timeout) && void 0 !== t
        ? t
        : this._opts.ackTimeout
    if (void 0 === r) return void (this.acks[A] = e)
    const n = this.io.setTimeoutFn(() => {
        delete this.acks[A]
        for (let e = 0; e < this.sendBuffer.length; e++)
          this.sendBuffer[e].id === A && this.sendBuffer.splice(e, 1)
        e.call(this, new Error('operation has timed out'))
      }, r),
      i = (...A) => {
        ;(this.io.clearTimeoutFn(n), e.apply(this, A))
      }
    ;((i.withError = !0), (this.acks[A] = i))
  }
  emitWithAck(A, ...e) {
    return new Promise((t, r) => {
      const n = (A, e) => (A ? r(A) : t(e))
      ;((n.withError = !0), e.push(n), this.emit(A, ...e))
    })
  }
  _addToQueue(A) {
    let e
    'function' == typeof A[A.length - 1] && (e = A.pop())
    const t = {
      id: this._queueSeq++,
      tryCount: 0,
      pending: !1,
      args: A,
      flags: Object.assign({ fromQueue: !0 }, this.flags),
    }
    ;(A.push((A, ...r) => {
      if (t !== this._queue[0]) return
      return (
        null !== A
          ? t.tryCount > this._opts.retries && (this._queue.shift(), e && e(A))
          : (this._queue.shift(), e && e(null, ...r)),
        (t.pending = !1),
        this._drainQueue()
      )
    }),
      this._queue.push(t),
      this._drainQueue())
  }
  _drainQueue(A = !1) {
    if (!this.connected || 0 === this._queue.length) return
    const e = this._queue[0]
    ;(e.pending && !A) ||
      ((e.pending = !0),
      e.tryCount++,
      (this.flags = e.flags),
      this.emit.apply(this, e.args))
  }
  packet(A) {
    ;((A.nsp = this.nsp), this.io._packet(A))
  }
  onopen() {
    'function' == typeof this.auth
      ? this.auth((A) => {
          this._sendConnectPacket(A)
        })
      : this._sendConnectPacket(this.auth)
  }
  _sendConnectPacket(A) {
    this.packet({
      type: Ga.CONNECT,
      data: this._pid
        ? Object.assign({ pid: this._pid, offset: this._lastOffset }, A)
        : A,
    })
  }
  onerror(A) {
    this.connected || this.emitReserved('connect_error', A)
  }
  onclose(A, e) {
    ;((this.connected = !1),
      delete this.id,
      this.emitReserved('disconnect', A, e),
      this._clearAcks())
  }
  _clearAcks() {
    Object.keys(this.acks).forEach((A) => {
      if (!this.sendBuffer.some((e) => String(e.id) === A)) {
        const e = this.acks[A]
        ;(delete this.acks[A],
          e.withError &&
            e.call(this, new Error('socket has been disconnected')))
      }
    })
  }
  onpacket(A) {
    if (A.nsp === this.nsp)
      switch (A.type) {
        case Ga.CONNECT:
          A.data && A.data.sid
            ? this.onconnect(A.data.sid, A.data.pid)
            : this.emitReserved(
                'connect_error',
                new Error(
                  'It seems you are trying to reach a Socket.IO server in v2.x with a v3.x client, but they are not compatible (more information here: https://socket.io/docs/v3/migrating-from-2-x-to-3-0/)',
                ),
              )
          break
        case Ga.EVENT:
        case Ga.BINARY_EVENT:
          this.onevent(A)
          break
        case Ga.ACK:
        case Ga.BINARY_ACK:
          this.onack(A)
          break
        case Ga.DISCONNECT:
          this.ondisconnect()
          break
        case Ga.CONNECT_ERROR:
          this.destroy()
          const e = new Error(A.data.message)
          ;((e.data = A.data.data), this.emitReserved('connect_error', e))
      }
  }
  onevent(A) {
    const e = A.data || []
    ;(null != A.id && e.push(this.ack(A.id)),
      this.connected
        ? this.emitEvent(e)
        : this.receiveBuffer.push(Object.freeze(e)))
  }
  emitEvent(A) {
    if (this._anyListeners && this._anyListeners.length) {
      const e = this._anyListeners.slice()
      for (const t of e) t.apply(this, A)
    }
    ;(super.emit.apply(this, A),
      this._pid &&
        A.length &&
        'string' == typeof A[A.length - 1] &&
        (this._lastOffset = A[A.length - 1]))
  }
  ack(A) {
    const e = this
    let t = !1
    return function (...r) {
      t || ((t = !0), e.packet({ type: Ga.ACK, id: A, data: r }))
    }
  }
  onack(A) {
    const e = this.acks[A.id]
    'function' == typeof e &&
      (delete this.acks[A.id],
      e.withError && A.data.unshift(null),
      e.apply(this, A.data))
  }
  onconnect(A, e) {
    ;((this.id = A),
      (this.recovered = e && this._pid === e),
      (this._pid = e),
      (this.connected = !0),
      this.emitBuffered(),
      this.emitReserved('connect'),
      this._drainQueue(!0))
  }
  emitBuffered() {
    ;(this.receiveBuffer.forEach((A) => this.emitEvent(A)),
      (this.receiveBuffer = []),
      this.sendBuffer.forEach((A) => {
        ;(this.notifyOutgoingListeners(A), this.packet(A))
      }),
      (this.sendBuffer = []))
  }
  ondisconnect() {
    ;(this.destroy(), this.onclose('io server disconnect'))
  }
  destroy() {
    ;(this.subs && (this.subs.forEach((A) => A()), (this.subs = void 0)),
      this.io._destroy(this))
  }
  disconnect() {
    return (
      this.connected && this.packet({ type: Ga.DISCONNECT }),
      this.destroy(),
      this.connected && this.onclose('io client disconnect'),
      this
    )
  }
  close() {
    return this.disconnect()
  }
  compress(A) {
    return ((this.flags.compress = A), this)
  }
  get volatile() {
    return ((this.flags.volatile = !0), this)
  }
  timeout(A) {
    return ((this.flags.timeout = A), this)
  }
  onAny(A) {
    return (
      (this._anyListeners = this._anyListeners || []),
      this._anyListeners.push(A),
      this
    )
  }
  prependAny(A) {
    return (
      (this._anyListeners = this._anyListeners || []),
      this._anyListeners.unshift(A),
      this
    )
  }
  offAny(A) {
    if (!this._anyListeners) return this
    if (A) {
      const e = this._anyListeners
      for (let t = 0; t < e.length; t++)
        if (A === e[t]) return (e.splice(t, 1), this)
    } else this._anyListeners = []
    return this
  }
  listenersAny() {
    return this._anyListeners || []
  }
  onAnyOutgoing(A) {
    return (
      (this._anyOutgoingListeners = this._anyOutgoingListeners || []),
      this._anyOutgoingListeners.push(A),
      this
    )
  }
  prependAnyOutgoing(A) {
    return (
      (this._anyOutgoingListeners = this._anyOutgoingListeners || []),
      this._anyOutgoingListeners.unshift(A),
      this
    )
  }
  offAnyOutgoing(A) {
    if (!this._anyOutgoingListeners) return this
    if (A) {
      const e = this._anyOutgoingListeners
      for (let t = 0; t < e.length; t++)
        if (A === e[t]) return (e.splice(t, 1), this)
    } else this._anyOutgoingListeners = []
    return this
  }
  listenersAnyOutgoing() {
    return this._anyOutgoingListeners || []
  }
  notifyOutgoingListeners(A) {
    if (this._anyOutgoingListeners && this._anyOutgoingListeners.length) {
      const e = this._anyOutgoingListeners.slice()
      for (const t of e) t.apply(this, A.data)
    }
  }
}
function $a(A) {
  ;((A = A || {}),
    (this.ms = A.min || 100),
    (this.max = A.max || 1e4),
    (this.factor = A.factor || 2),
    (this.jitter = A.jitter > 0 && A.jitter <= 1 ? A.jitter : 0),
    (this.attempts = 0))
}
;(($a.prototype.duration = function () {
  var A = this.ms * Math.pow(this.factor, this.attempts++)
  if (this.jitter) {
    var e = Math.random(),
      t = Math.floor(e * this.jitter * A)
    A = 1 & Math.floor(10 * e) ? A + t : A - t
  }
  return 0 | Math.min(A, this.max)
}),
  ($a.prototype.reset = function () {
    this.attempts = 0
  }),
  ($a.prototype.setMin = function (A) {
    this.ms = A
  }),
  ($a.prototype.setMax = function (A) {
    this.max = A
  }),
  ($a.prototype.setJitter = function (A) {
    this.jitter = A
  }))
class Ac extends ta {
  constructor(A, e) {
    var t
    ;(super(),
      (this.nsps = {}),
      (this.subs = []),
      A && 'object' == typeof A && ((e = A), (A = void 0)),
      ((e = e || {}).path = e.path || '/socket.io'),
      (this.opts = e),
      aa(this, e),
      this.reconnection(!1 !== e.reconnection),
      this.reconnectionAttempts(e.reconnectionAttempts || Infinity),
      this.reconnectionDelay(e.reconnectionDelay || 1e3),
      this.reconnectionDelayMax(e.reconnectionDelayMax || 5e3),
      this.randomizationFactor(
        null !== (t = e.randomizationFactor) && void 0 !== t ? t : 0.5,
      ),
      (this.backoff = new $a({
        min: this.reconnectionDelay(),
        max: this.reconnectionDelayMax(),
        jitter: this.randomizationFactor(),
      })),
      this.timeout(null == e.timeout ? 2e4 : e.timeout),
      (this._readyState = 'closed'),
      (this.uri = A))
    const r = e.parser || Xa
    ;((this.encoder = new r.Encoder()),
      (this.decoder = new r.Decoder()),
      (this._autoConnect = !1 !== e.autoConnect),
      this._autoConnect && this.open())
  }
  reconnection(A) {
    return arguments.length
      ? ((this._reconnection = !!A), A || (this.skipReconnect = !0), this)
      : this._reconnection
  }
  reconnectionAttempts(A) {
    return void 0 === A
      ? this._reconnectionAttempts
      : ((this._reconnectionAttempts = A), this)
  }
  reconnectionDelay(A) {
    var e
    return void 0 === A
      ? this._reconnectionDelay
      : ((this._reconnectionDelay = A),
        null === (e = this.backoff) || void 0 === e || e.setMin(A),
        this)
  }
  randomizationFactor(A) {
    var e
    return void 0 === A
      ? this._randomizationFactor
      : ((this._randomizationFactor = A),
        null === (e = this.backoff) || void 0 === e || e.setJitter(A),
        this)
  }
  reconnectionDelayMax(A) {
    var e
    return void 0 === A
      ? this._reconnectionDelayMax
      : ((this._reconnectionDelayMax = A),
        null === (e = this.backoff) || void 0 === e || e.setMax(A),
        this)
  }
  timeout(A) {
    return arguments.length ? ((this._timeout = A), this) : this._timeout
  }
  maybeReconnectOnOpen() {
    !this._reconnecting &&
      this._reconnection &&
      0 === this.backoff.attempts &&
      this.reconnect()
  }
  open(A) {
    if (~this._readyState.indexOf('open')) return this
    this.engine = new xa(this.uri, this.opts)
    const e = this.engine,
      t = this
    ;((this._readyState = 'opening'), (this.skipReconnect = !1))
    const r = Ja(e, 'open', function () {
        ;(t.onopen(), A && A())
      }),
      n = (e) => {
        ;(this.cleanup(),
          (this._readyState = 'closed'),
          this.emitReserved('error', e),
          A ? A(e) : this.maybeReconnectOnOpen())
      },
      i = Ja(e, 'error', n)
    if (!1 !== this._timeout) {
      const A = this._timeout,
        t = this.setTimeoutFn(() => {
          ;(r(), n(new Error('timeout')), e.close())
        }, A)
      ;(this.opts.autoUnref && t.unref(),
        this.subs.push(() => {
          this.clearTimeoutFn(t)
        }))
    }
    return (this.subs.push(r), this.subs.push(i), this)
  }
  connect(A) {
    return this.open(A)
  }
  onopen() {
    ;(this.cleanup(), (this._readyState = 'open'), this.emitReserved('open'))
    const A = this.engine
    this.subs.push(
      Ja(A, 'ping', this.onping.bind(this)),
      Ja(A, 'data', this.ondata.bind(this)),
      Ja(A, 'error', this.onerror.bind(this)),
      Ja(A, 'close', this.onclose.bind(this)),
      Ja(this.decoder, 'decoded', this.ondecoded.bind(this)),
    )
  }
  onping() {
    this.emitReserved('ping')
  }
  ondata(A) {
    try {
      this.decoder.add(A)
    } catch (fi) {
      this.onclose('parse error', fi)
    }
  }
  ondecoded(A) {
    ra(() => {
      this.emitReserved('packet', A)
    }, this.setTimeoutFn)
  }
  onerror(A) {
    this.emitReserved('error', A)
  }
  socket(A, e) {
    let t = this.nsps[A]
    return (
      t
        ? this._autoConnect && !t.active && t.connect()
        : ((t = new Za(this, A, e)), (this.nsps[A] = t)),
      t
    )
  }
  _destroy(A) {
    const e = Object.keys(this.nsps)
    for (const t of e) {
      if (this.nsps[t].active) return
    }
    this._close()
  }
  _packet(A) {
    const e = this.encoder.encode(A)
    for (let t = 0; t < e.length; t++) this.engine.write(e[t], A.options)
  }
  cleanup() {
    ;(this.subs.forEach((A) => A()),
      (this.subs.length = 0),
      this.decoder.destroy())
  }
  _close() {
    ;((this.skipReconnect = !0),
      (this._reconnecting = !1),
      this.onclose('forced close'))
  }
  disconnect() {
    return this._close()
  }
  onclose(A, e) {
    var t
    ;(this.cleanup(),
      null === (t = this.engine) || void 0 === t || t.close(),
      this.backoff.reset(),
      (this._readyState = 'closed'),
      this.emitReserved('close', A, e),
      this._reconnection && !this.skipReconnect && this.reconnect())
  }
  reconnect() {
    if (this._reconnecting || this.skipReconnect) return this
    const A = this
    if (this.backoff.attempts >= this._reconnectionAttempts)
      (this.backoff.reset(),
        this.emitReserved('reconnect_failed'),
        (this._reconnecting = !1))
    else {
      const e = this.backoff.duration()
      this._reconnecting = !0
      const t = this.setTimeoutFn(() => {
        A.skipReconnect ||
          (this.emitReserved('reconnect_attempt', A.backoff.attempts),
          A.skipReconnect ||
            A.open((e) => {
              e
                ? ((A._reconnecting = !1),
                  A.reconnect(),
                  this.emitReserved('reconnect_error', e))
                : A.onreconnect()
            }))
      }, e)
      ;(this.opts.autoUnref && t.unref(),
        this.subs.push(() => {
          this.clearTimeoutFn(t)
        }))
    }
  }
  onreconnect() {
    const A = this.backoff.attempts
    ;((this._reconnecting = !1),
      this.backoff.reset(),
      this.emitReserved('reconnect', A))
  }
}
const ec = {}
function tc(A, e) {
  'object' == typeof A && ((e = A), (A = void 0))
  const t = (function (A, e = '', t) {
      let r = A
      ;((t = t || ('undefined' != typeof location && location)),
        null == A && (A = t.protocol + '//' + t.host),
        'string' == typeof A &&
          ('/' === A.charAt(0) &&
            (A = '/' === A.charAt(1) ? t.protocol + A : t.host + A),
          /^(https?|wss?):\/\//.test(A) ||
            (A = void 0 !== t ? t.protocol + '//' + A : 'https://' + A),
          (r = Ea(A))),
        r.port ||
          (/^(http|ws)$/.test(r.protocol)
            ? (r.port = '80')
            : /^(http|ws)s$/.test(r.protocol) && (r.port = '443')),
        (r.path = r.path || '/'))
      const n = -1 !== r.host.indexOf(':') ? '[' + r.host + ']' : r.host
      return (
        (r.id = r.protocol + '://' + n + ':' + r.port + e),
        (r.href =
          r.protocol +
          '://' +
          n +
          (t && t.port === r.port ? '' : ':' + r.port)),
        r
      )
    })(A, (e = e || {}).path || '/socket.io'),
    r = t.source,
    n = t.id,
    i = t.path,
    o = ec[n] && i in ec[n].nsps
  let s
  return (
    e.forceNew || e['force new connection'] || !1 === e.multiplex || o
      ? (s = new Ac(r, e))
      : (ec[n] || (ec[n] = new Ac(r, e)), (s = ec[n])),
    t.query && !e.query && (e.query = t.queryKey),
    s.socket(t.path, e)
  )
}
function rc(A) {
  throw new Error(
    'Could not dynamically require "' +
      A +
      '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.',
  )
}
Object.assign(tc, { Manager: Ac, Socket: Za, io: tc, connect: tc })
var nc = { exports: {} }
/*!
    localForage -- Offline Storage, Improved
    Version 1.10.0
    https://localforage.github.io/localForage
    (c) 2013-2017 Mozilla, Apache License 2.0
*/ nc.exports = (function A(e, t, r) {
  function n(o, s) {
    if (!t[o]) {
      if (!e[o]) {
        if (!s && rc) return rc(o)
        if (i) return i(o, !0)
        var a = new Error("Cannot find module '" + o + "'")
        throw ((a.code = 'MODULE_NOT_FOUND'), a)
      }
      var c = (t[o] = { exports: {} })
      e[o][0].call(
        c.exports,
        function (A) {
          var t = e[o][1][A]
          return n(t || A)
        },
        c,
        c.exports,
        A,
        e,
        t,
        r,
      )
    }
    return t[o].exports
  }
  for (var i = rc, o = 0; o < r.length; o++) n(r[o])
  return n
})(
  {
    1: [
      function (A, e, t) {
        ;(function (A) {
          var t,
            r,
            n = A.MutationObserver || A.WebKitMutationObserver
          if (n) {
            var i = 0,
              o = new n(u),
              s = A.document.createTextNode('')
            ;(o.observe(s, { characterData: !0 }),
              (t = function () {
                s.data = i = ++i % 2
              }))
          } else if (A.setImmediate || void 0 === A.MessageChannel)
            t =
              'document' in A &&
              'onreadystatechange' in A.document.createElement('script')
                ? function () {
                    var e = A.document.createElement('script')
                    ;((e.onreadystatechange = function () {
                      ;(u(),
                        (e.onreadystatechange = null),
                        e.parentNode.removeChild(e),
                        (e = null))
                    }),
                      A.document.documentElement.appendChild(e))
                  }
                : function () {
                    setTimeout(u, 0)
                  }
          else {
            var a = new A.MessageChannel()
            ;((a.port1.onmessage = u),
              (t = function () {
                a.port2.postMessage(0)
              }))
          }
          var c = []
          function u() {
            var A, e
            r = !0
            for (var t = c.length; t; ) {
              for (e = c, c = [], A = -1; ++A < t; ) e[A]()
              t = c.length
            }
            r = !1
          }
          function l(A) {
            1 !== c.push(A) || r || t()
          }
          e.exports = l
        }).call(
          this,
          void 0 !== ri
            ? ri
            : 'undefined' != typeof self
              ? self
              : 'undefined' != typeof window
                ? window
                : {},
        )
      },
      {},
    ],
    2: [
      function (A, e, t) {
        var r = A(1)
        function n() {}
        var i = {},
          o = ['REJECTED'],
          s = ['FULFILLED'],
          a = ['PENDING']
        function c(A) {
          if ('function' != typeof A)
            throw new TypeError('resolver must be a function')
          ;((this.state = a),
            (this.queue = []),
            (this.outcome = void 0),
            A !== n && f(this, A))
        }
        function u(A, e, t) {
          ;((this.promise = A),
            'function' == typeof e &&
              ((this.onFulfilled = e),
              (this.callFulfilled = this.otherCallFulfilled)),
            'function' == typeof t &&
              ((this.onRejected = t),
              (this.callRejected = this.otherCallRejected)))
        }
        function l(A, e, t) {
          r(function () {
            var r
            try {
              r = e(t)
            } catch (fi) {
              return i.reject(A, fi)
            }
            r === A
              ? i.reject(A, new TypeError('Cannot resolve promise with itself'))
              : i.resolve(A, r)
          })
        }
        function h(A) {
          var e = A && A.then
          if (
            A &&
            ('object' == typeof A || 'function' == typeof A) &&
            'function' == typeof e
          )
            return function () {
              e.apply(A, arguments)
            }
        }
        function f(A, e) {
          var t = !1
          function r(e) {
            t || ((t = !0), i.reject(A, e))
          }
          function n(e) {
            t || ((t = !0), i.resolve(A, e))
          }
          function o() {
            e(n, r)
          }
          var s = d(o)
          'error' === s.status && r(s.value)
        }
        function d(A, e) {
          var t = {}
          try {
            ;((t.value = A(e)), (t.status = 'success'))
          } catch (fi) {
            ;((t.status = 'error'), (t.value = fi))
          }
          return t
        }
        function B(A) {
          return A instanceof this ? A : i.resolve(new this(n), A)
        }
        function p(A) {
          var e = new this(n)
          return i.reject(e, A)
        }
        function g(A) {
          var e = this
          if ('[object Array]' !== Object.prototype.toString.call(A))
            return this.reject(new TypeError('must be an array'))
          var t = A.length,
            r = !1
          if (!t) return this.resolve([])
          for (var o = new Array(t), s = 0, a = -1, c = new this(n); ++a < t; )
            u(A[a], a)
          return c
          function u(A, n) {
            function a(A) {
              ;((o[n] = A), ++s !== t || r || ((r = !0), i.resolve(c, o)))
            }
            e.resolve(A).then(a, function (A) {
              r || ((r = !0), i.reject(c, A))
            })
          }
        }
        function w(A) {
          var e = this
          if ('[object Array]' !== Object.prototype.toString.call(A))
            return this.reject(new TypeError('must be an array'))
          var t = A.length,
            r = !1
          if (!t) return this.resolve([])
          for (var o = -1, s = new this(n); ++o < t; ) a(A[o])
          return s
          function a(A) {
            e.resolve(A).then(
              function (A) {
                r || ((r = !0), i.resolve(s, A))
              },
              function (A) {
                r || ((r = !0), i.reject(s, A))
              },
            )
          }
        }
        ;((e.exports = c),
          (c.prototype.catch = function (A) {
            return this.then(null, A)
          }),
          (c.prototype.then = function (A, e) {
            if (
              ('function' != typeof A && this.state === s) ||
              ('function' != typeof e && this.state === o)
            )
              return this
            var t = new this.constructor(n)
            return (
              this.state !== a
                ? l(t, this.state === s ? A : e, this.outcome)
                : this.queue.push(new u(t, A, e)),
              t
            )
          }),
          (u.prototype.callFulfilled = function (A) {
            i.resolve(this.promise, A)
          }),
          (u.prototype.otherCallFulfilled = function (A) {
            l(this.promise, this.onFulfilled, A)
          }),
          (u.prototype.callRejected = function (A) {
            i.reject(this.promise, A)
          }),
          (u.prototype.otherCallRejected = function (A) {
            l(this.promise, this.onRejected, A)
          }),
          (i.resolve = function (A, e) {
            var t = d(h, e)
            if ('error' === t.status) return i.reject(A, t.value)
            var r = t.value
            if (r) f(A, r)
            else {
              ;((A.state = s), (A.outcome = e))
              for (var n = -1, o = A.queue.length; ++n < o; )
                A.queue[n].callFulfilled(e)
            }
            return A
          }),
          (i.reject = function (A, e) {
            ;((A.state = o), (A.outcome = e))
            for (var t = -1, r = A.queue.length; ++t < r; )
              A.queue[t].callRejected(e)
            return A
          }),
          (c.resolve = B),
          (c.reject = p),
          (c.all = g),
          (c.race = w))
      },
      { 1: 1 },
    ],
    3: [
      function (A, e, t) {
        ;(function (e) {
          'function' != typeof e.Promise && (e.Promise = A(2))
        }).call(
          this,
          void 0 !== ri
            ? ri
            : 'undefined' != typeof self
              ? self
              : 'undefined' != typeof window
                ? window
                : {},
        )
      },
      { 2: 2 },
    ],
    4: [
      function (A, e, t) {
        var r =
          'function' == typeof Symbol && 'symbol' == typeof Symbol.iterator
            ? function (A) {
                return typeof A
              }
            : function (A) {
                return A &&
                  'function' == typeof Symbol &&
                  A.constructor === Symbol &&
                  A !== Symbol.prototype
                  ? 'symbol'
                  : typeof A
              }
        function n(A, e) {
          if (!(A instanceof e))
            throw new TypeError('Cannot call a class as a function')
        }
        function i() {
          try {
            if ('undefined' != typeof indexedDB) return indexedDB
            if ('undefined' != typeof webkitIndexedDB) return webkitIndexedDB
            if ('undefined' != typeof mozIndexedDB) return mozIndexedDB
            if ('undefined' != typeof OIndexedDB) return OIndexedDB
            if ('undefined' != typeof msIndexedDB) return msIndexedDB
          } catch (fi) {
            return
          }
        }
        var o = i()
        function s() {
          try {
            if (!o || !o.open) return !1
            var A =
                'undefined' != typeof openDatabase &&
                /(Safari|iPhone|iPad|iPod)/.test(navigator.userAgent) &&
                !/Chrome/.test(navigator.userAgent) &&
                !/BlackBerry/.test(navigator.platform),
              e =
                'function' == typeof fetch &&
                -1 !== fetch.toString().indexOf('[native code')
            return (
              (!A || e) &&
              'undefined' != typeof indexedDB &&
              'undefined' != typeof IDBKeyRange
            )
          } catch (fi) {
            return !1
          }
        }
        function a(A, e) {
          ;((A = A || []), (e = e || {}))
          try {
            return new Blob(A, e)
          } catch (fi) {
            if ('TypeError' !== fi.name) throw fi
            for (
              var t = new (
                  'undefined' != typeof BlobBuilder
                    ? BlobBuilder
                    : 'undefined' != typeof MSBlobBuilder
                      ? MSBlobBuilder
                      : 'undefined' != typeof MozBlobBuilder
                        ? MozBlobBuilder
                        : WebKitBlobBuilder
                )(),
                r = 0;
              r < A.length;
              r += 1
            )
              t.append(A[r])
            return t.getBlob(e.type)
          }
        }
        'undefined' == typeof Promise && A(3)
        var c = Promise
        function u(A, e) {
          e &&
            A.then(
              function (A) {
                e(null, A)
              },
              function (A) {
                e(A)
              },
            )
        }
        function l(A, e, t) {
          ;('function' == typeof e && A.then(e),
            'function' == typeof t && A.catch(t))
        }
        function h(A) {
          return ('string' != typeof A && (A = String(A)), A)
        }
        function f() {
          if (
            arguments.length &&
            'function' == typeof arguments[arguments.length - 1]
          )
            return arguments[arguments.length - 1]
        }
        var d = 'local-forage-detect-blob-support',
          B = void 0,
          p = {},
          g = Object.prototype.toString,
          w = 'readonly',
          m = 'readwrite'
        function C(A) {
          for (
            var e = A.length,
              t = new ArrayBuffer(e),
              r = new Uint8Array(t),
              n = 0;
            n < e;
            n++
          )
            r[n] = A.charCodeAt(n)
          return t
        }
        function y(A) {
          return new c(function (e) {
            var t = A.transaction(d, m),
              r = a([''])
            ;(t.objectStore(d).put(r, 'key'),
              (t.onabort = function (A) {
                ;(A.preventDefault(), A.stopPropagation(), e(!1))
              }),
              (t.oncomplete = function () {
                var A = navigator.userAgent.match(/Chrome\/(\d+)/),
                  t = navigator.userAgent.match(/Edge\//)
                e(t || !A || parseInt(A[1], 10) >= 43)
              }))
          }).catch(function () {
            return !1
          })
        }
        function Q(A) {
          return 'boolean' == typeof B
            ? c.resolve(B)
            : y(A).then(function (A) {
                return (B = A)
              })
        }
        function F(A) {
          var e = p[A.name],
            t = {}
          ;((t.promise = new c(function (A, e) {
            ;((t.resolve = A), (t.reject = e))
          })),
            e.deferredOperations.push(t),
            e.dbReady
              ? (e.dbReady = e.dbReady.then(function () {
                  return t.promise
                }))
              : (e.dbReady = t.promise))
        }
        function U(A) {
          var e = p[A.name].deferredOperations.pop()
          if (e) return (e.resolve(), e.promise)
        }
        function v(A, e) {
          var t = p[A.name].deferredOperations.pop()
          if (t) return (t.reject(e), t.promise)
        }
        function b(A, e) {
          return new c(function (t, r) {
            if (((p[A.name] = p[A.name] || O()), A.db)) {
              if (!e) return t(A.db)
              ;(F(A), A.db.close())
            }
            var n = [A.name]
            e && n.push(A.version)
            var i = o.open.apply(o, n)
            ;(e &&
              (i.onupgradeneeded = function (e) {
                var t = i.result
                try {
                  ;(t.createObjectStore(A.storeName),
                    e.oldVersion <= 1 && t.createObjectStore(d))
                } catch (r) {
                  if ('ConstraintError' !== r.name) throw r
                }
              }),
              (i.onerror = function (A) {
                ;(A.preventDefault(), r(i.error))
              }),
              (i.onsuccess = function () {
                var e = i.result
                ;((e.onversionchange = function (A) {
                  A.target.close()
                }),
                  t(e),
                  U(A))
              }))
          })
        }
        function E(A) {
          return b(A, !1)
        }
        function H(A) {
          return b(A, !0)
        }
        function _(A, e) {
          if (!A.db) return !0
          var t = !A.db.objectStoreNames.contains(A.storeName),
            r = A.version < A.db.version,
            n = A.version > A.db.version
          if ((r && (A.version, (A.version = A.db.version)), n || t)) {
            if (t) {
              var i = A.db.version + 1
              i > A.version && (A.version = i)
            }
            return !0
          }
          return !1
        }
        function I(A) {
          return new c(function (e, t) {
            var r = new FileReader()
            ;((r.onerror = t),
              (r.onloadend = function (t) {
                var r = btoa(t.target.result || '')
                e({ __local_forage_encoded_blob: !0, data: r, type: A.type })
              }),
              r.readAsBinaryString(A))
          })
        }
        function D(A) {
          return a([C(atob(A.data))], { type: A.type })
        }
        function x(A) {
          return A && A.__local_forage_encoded_blob
        }
        function k(A) {
          var e = this,
            t = e._initReady().then(function () {
              var A = p[e._dbInfo.name]
              if (A && A.dbReady) return A.dbReady
            })
          return (l(t, A, A), t)
        }
        function L(A) {
          F(A)
          for (var e = p[A.name], t = e.forages, r = 0; r < t.length; r++) {
            var n = t[r]
            n._dbInfo.db && (n._dbInfo.db.close(), (n._dbInfo.db = null))
          }
          return (
            (A.db = null),
            E(A)
              .then(function (e) {
                return ((A.db = e), _(A) ? H(A) : e)
              })
              .then(function (r) {
                A.db = e.db = r
                for (var n = 0; n < t.length; n++) t[n]._dbInfo.db = r
              })
              .catch(function (e) {
                throw (v(A, e), e)
              })
          )
        }
        function S(A, e, t, r) {
          void 0 === r && (r = 1)
          try {
            var n = A.db.transaction(A.storeName, e)
            t(null, n)
          } catch (WC) {
            if (
              r > 0 &&
              (!A.db ||
                'InvalidStateError' === WC.name ||
                'NotFoundError' === WC.name)
            )
              return c
                .resolve()
                .then(function () {
                  if (
                    !A.db ||
                    ('NotFoundError' === WC.name &&
                      !A.db.objectStoreNames.contains(A.storeName) &&
                      A.version <= A.db.version)
                  )
                    return (A.db && (A.version = A.db.version + 1), H(A))
                })
                .then(function () {
                  return L(A).then(function () {
                    S(A, e, t, r - 1)
                  })
                })
                .catch(t)
            t(WC)
          }
        }
        function O() {
          return {
            forages: [],
            db: null,
            dbReady: null,
            deferredOperations: [],
          }
        }
        function K(A) {
          var e = this,
            t = { db: null }
          if (A) for (var r in A) t[r] = A[r]
          var n = p[t.name]
          ;(n || ((n = O()), (p[t.name] = n)),
            n.forages.push(e),
            e._initReady || ((e._initReady = e.ready), (e.ready = k)))
          var i = []
          function o() {
            return c.resolve()
          }
          for (var s = 0; s < n.forages.length; s++) {
            var a = n.forages[s]
            a !== e && i.push(a._initReady().catch(o))
          }
          var u = n.forages.slice(0)
          return c
            .all(i)
            .then(function () {
              return ((t.db = n.db), E(t))
            })
            .then(function (A) {
              return ((t.db = A), _(t, e._defaultConfig.version) ? H(t) : A)
            })
            .then(function (A) {
              ;((t.db = n.db = A), (e._dbInfo = t))
              for (var r = 0; r < u.length; r++) {
                var i = u[r]
                i !== e &&
                  ((i._dbInfo.db = t.db), (i._dbInfo.version = t.version))
              }
            })
        }
        function T(A, e) {
          var t = this
          A = h(A)
          var r = new c(function (e, r) {
            t.ready()
              .then(function () {
                S(t._dbInfo, w, function (n, i) {
                  if (n) return r(n)
                  try {
                    var o = i.objectStore(t._dbInfo.storeName).get(A)
                    ;((o.onsuccess = function () {
                      var A = o.result
                      ;(void 0 === A && (A = null), x(A) && (A = D(A)), e(A))
                    }),
                      (o.onerror = function () {
                        r(o.error)
                      }))
                  } catch (fi) {
                    r(fi)
                  }
                })
              })
              .catch(r)
          })
          return (u(r, e), r)
        }
        function M(A, e) {
          var t = this,
            r = new c(function (e, r) {
              t.ready()
                .then(function () {
                  S(t._dbInfo, w, function (n, i) {
                    if (n) return r(n)
                    try {
                      var o = i.objectStore(t._dbInfo.storeName).openCursor(),
                        s = 1
                      ;((o.onsuccess = function () {
                        var t = o.result
                        if (t) {
                          var r = t.value
                          x(r) && (r = D(r))
                          var n = A(r, t.key, s++)
                          void 0 !== n ? e(n) : t.continue()
                        } else e()
                      }),
                        (o.onerror = function () {
                          r(o.error)
                        }))
                    } catch (fi) {
                      r(fi)
                    }
                  })
                })
                .catch(r)
            })
          return (u(r, e), r)
        }
        function R(A, e, t) {
          var r = this
          A = h(A)
          var n = new c(function (t, n) {
            var i
            r.ready()
              .then(function () {
                return (
                  (i = r._dbInfo),
                  '[object Blob]' === g.call(e)
                    ? Q(i.db).then(function (A) {
                        return A ? e : I(e)
                      })
                    : e
                )
              })
              .then(function (e) {
                S(r._dbInfo, m, function (i, o) {
                  if (i) return n(i)
                  try {
                    var s = o.objectStore(r._dbInfo.storeName)
                    null === e && (e = void 0)
                    var a = s.put(e, A)
                    ;((o.oncomplete = function () {
                      ;(void 0 === e && (e = null), t(e))
                    }),
                      (o.onabort = o.onerror =
                        function () {
                          var A = a.error ? a.error : a.transaction.error
                          n(A)
                        }))
                  } catch (fi) {
                    n(fi)
                  }
                })
              })
              .catch(n)
          })
          return (u(n, t), n)
        }
        function N(A, e) {
          var t = this
          A = h(A)
          var r = new c(function (e, r) {
            t.ready()
              .then(function () {
                S(t._dbInfo, m, function (n, i) {
                  if (n) return r(n)
                  try {
                    var o = i.objectStore(t._dbInfo.storeName).delete(A)
                    ;((i.oncomplete = function () {
                      e()
                    }),
                      (i.onerror = function () {
                        r(o.error)
                      }),
                      (i.onabort = function () {
                        var A = o.error ? o.error : o.transaction.error
                        r(A)
                      }))
                  } catch (fi) {
                    r(fi)
                  }
                })
              })
              .catch(r)
          })
          return (u(r, e), r)
        }
        function P(A) {
          var e = this,
            t = new c(function (A, t) {
              e.ready()
                .then(function () {
                  S(e._dbInfo, m, function (r, n) {
                    if (r) return t(r)
                    try {
                      var i = n.objectStore(e._dbInfo.storeName).clear()
                      ;((n.oncomplete = function () {
                        A()
                      }),
                        (n.onabort = n.onerror =
                          function () {
                            var A = i.error ? i.error : i.transaction.error
                            t(A)
                          }))
                    } catch (fi) {
                      t(fi)
                    }
                  })
                })
                .catch(t)
            })
          return (u(t, A), t)
        }
        function V(A) {
          var e = this,
            t = new c(function (A, t) {
              e.ready()
                .then(function () {
                  S(e._dbInfo, w, function (r, n) {
                    if (r) return t(r)
                    try {
                      var i = n.objectStore(e._dbInfo.storeName).count()
                      ;((i.onsuccess = function () {
                        A(i.result)
                      }),
                        (i.onerror = function () {
                          t(i.error)
                        }))
                    } catch (fi) {
                      t(fi)
                    }
                  })
                })
                .catch(t)
            })
          return (u(t, A), t)
        }
        function G(A, e) {
          var t = this,
            r = new c(function (e, r) {
              A < 0
                ? e(null)
                : t
                    .ready()
                    .then(function () {
                      S(t._dbInfo, w, function (n, i) {
                        if (n) return r(n)
                        try {
                          var o = i.objectStore(t._dbInfo.storeName),
                            s = !1,
                            a = o.openKeyCursor()
                          ;((a.onsuccess = function () {
                            var t = a.result
                            t
                              ? 0 === A || s
                                ? e(t.key)
                                : ((s = !0), t.advance(A))
                              : e(null)
                          }),
                            (a.onerror = function () {
                              r(a.error)
                            }))
                        } catch (fi) {
                          r(fi)
                        }
                      })
                    })
                    .catch(r)
            })
          return (u(r, e), r)
        }
        function z(A) {
          var e = this,
            t = new c(function (A, t) {
              e.ready()
                .then(function () {
                  S(e._dbInfo, w, function (r, n) {
                    if (r) return t(r)
                    try {
                      var i = n
                          .objectStore(e._dbInfo.storeName)
                          .openKeyCursor(),
                        o = []
                      ;((i.onsuccess = function () {
                        var e = i.result
                        e ? (o.push(e.key), e.continue()) : A(o)
                      }),
                        (i.onerror = function () {
                          t(i.error)
                        }))
                    } catch (fi) {
                      t(fi)
                    }
                  })
                })
                .catch(t)
            })
          return (u(t, A), t)
        }
        function j(A, e) {
          e = f.apply(this, arguments)
          var t = this.config()
          ;(A = ('function' != typeof A && A) || {}).name ||
            ((A.name = A.name || t.name),
            (A.storeName = A.storeName || t.storeName))
          var r,
            n = this
          if (A.name) {
            var i =
              A.name === t.name && n._dbInfo.db
                ? c.resolve(n._dbInfo.db)
                : E(A).then(function (e) {
                    var t = p[A.name],
                      r = t.forages
                    t.db = e
                    for (var n = 0; n < r.length; n++) r[n]._dbInfo.db = e
                    return e
                  })
            r = A.storeName
              ? i.then(function (e) {
                  if (e.objectStoreNames.contains(A.storeName)) {
                    var t = e.version + 1
                    F(A)
                    var r = p[A.name],
                      n = r.forages
                    e.close()
                    for (var i = 0; i < n.length; i++) {
                      var s = n[i]
                      ;((s._dbInfo.db = null), (s._dbInfo.version = t))
                    }
                    return new c(function (e, r) {
                      var n = o.open(A.name, t)
                      ;((n.onerror = function (A) {
                        ;(n.result.close(), r(A))
                      }),
                        (n.onupgradeneeded = function () {
                          n.result.deleteObjectStore(A.storeName)
                        }),
                        (n.onsuccess = function () {
                          var A = n.result
                          ;(A.close(), e(A))
                        }))
                    })
                      .then(function (A) {
                        r.db = A
                        for (var e = 0; e < n.length; e++) {
                          var t = n[e]
                          ;((t._dbInfo.db = A), U(t._dbInfo))
                        }
                      })
                      .catch(function (e) {
                        throw (
                          (v(A, e) || c.resolve()).catch(function () {}),
                          e
                        )
                      })
                  }
                })
              : i.then(function (e) {
                  F(A)
                  var t = p[A.name],
                    r = t.forages
                  e.close()
                  for (var n = 0; n < r.length; n++) r[n]._dbInfo.db = null
                  return new c(function (e, t) {
                    var r = o.deleteDatabase(A.name)
                    ;((r.onerror = function () {
                      var A = r.result
                      ;(A && A.close(), t(r.error))
                    }),
                      (r.onblocked = function () {}),
                      (r.onsuccess = function () {
                        var A = r.result
                        ;(A && A.close(), e(A))
                      }))
                  })
                    .then(function (A) {
                      t.db = A
                      for (var e = 0; e < r.length; e++) U(r[e]._dbInfo)
                    })
                    .catch(function (e) {
                      throw ((v(A, e) || c.resolve()).catch(function () {}), e)
                    })
                })
          } else r = c.reject('Invalid arguments')
          return (u(r, e), r)
        }
        var W = {
          _driver: 'asyncStorage',
          _initStorage: K,
          _support: s(),
          iterate: M,
          getItem: T,
          setItem: R,
          removeItem: N,
          clear: P,
          length: V,
          key: G,
          keys: z,
          dropInstance: j,
        }
        function q() {
          return 'function' == typeof openDatabase
        }
        var X =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
          J = '~~local_forage_type~',
          Y = /^~~local_forage_type~([^~]+)~/,
          Z = '__lfsc__:',
          $ = Z.length,
          AA = 'arbf',
          eA = 'blob',
          tA = 'si08',
          rA = 'ui08',
          nA = 'uic8',
          iA = 'si16',
          oA = 'si32',
          sA = 'ur16',
          aA = 'ui32',
          cA = 'fl32',
          uA = 'fl64',
          lA = $ + AA.length,
          hA = Object.prototype.toString
        function fA(A) {
          var e,
            t,
            r,
            n,
            i,
            o = 0.75 * A.length,
            s = A.length,
            a = 0
          '=' === A[A.length - 1] && (o--, '=' === A[A.length - 2] && o--)
          var c = new ArrayBuffer(o),
            u = new Uint8Array(c)
          for (e = 0; e < s; e += 4)
            ((t = X.indexOf(A[e])),
              (r = X.indexOf(A[e + 1])),
              (n = X.indexOf(A[e + 2])),
              (i = X.indexOf(A[e + 3])),
              (u[a++] = (t << 2) | (r >> 4)),
              (u[a++] = ((15 & r) << 4) | (n >> 2)),
              (u[a++] = ((3 & n) << 6) | (63 & i)))
          return c
        }
        function dA(A) {
          var e,
            t = new Uint8Array(A),
            r = ''
          for (e = 0; e < t.length; e += 3)
            ((r += X[t[e] >> 2]),
              (r += X[((3 & t[e]) << 4) | (t[e + 1] >> 4)]),
              (r += X[((15 & t[e + 1]) << 2) | (t[e + 2] >> 6)]),
              (r += X[63 & t[e + 2]]))
          return (
            t.length % 3 == 2
              ? (r = r.substring(0, r.length - 1) + '=')
              : t.length % 3 == 1 && (r = r.substring(0, r.length - 2) + '=='),
            r
          )
        }
        function BA(A, e) {
          var t = ''
          if (
            (A && (t = hA.call(A)),
            A &&
              ('[object ArrayBuffer]' === t ||
                (A.buffer && '[object ArrayBuffer]' === hA.call(A.buffer))))
          ) {
            var r,
              n = Z
            ;(A instanceof ArrayBuffer
              ? ((r = A), (n += AA))
              : ((r = A.buffer),
                '[object Int8Array]' === t
                  ? (n += tA)
                  : '[object Uint8Array]' === t
                    ? (n += rA)
                    : '[object Uint8ClampedArray]' === t
                      ? (n += nA)
                      : '[object Int16Array]' === t
                        ? (n += iA)
                        : '[object Uint16Array]' === t
                          ? (n += sA)
                          : '[object Int32Array]' === t
                            ? (n += oA)
                            : '[object Uint32Array]' === t
                              ? (n += aA)
                              : '[object Float32Array]' === t
                                ? (n += cA)
                                : '[object Float64Array]' === t
                                  ? (n += uA)
                                  : e(
                                      new Error(
                                        'Failed to get type for BinaryArray',
                                      ),
                                    )),
              e(n + dA(r)))
          } else if ('[object Blob]' === t) {
            var i = new FileReader()
            ;((i.onload = function () {
              var t = J + A.type + '~' + dA(this.result)
              e(Z + eA + t)
            }),
              i.readAsArrayBuffer(A))
          } else
            try {
              e(JSON.stringify(A))
            } catch (fi) {
              e(null, fi)
            }
        }
        function pA(A) {
          if (A.substring(0, $) !== Z) return JSON.parse(A)
          var e,
            t = A.substring(lA),
            r = A.substring($, lA)
          if (r === eA && Y.test(t)) {
            var n = t.match(Y)
            ;((e = n[1]), (t = t.substring(n[0].length)))
          }
          var i = fA(t)
          switch (r) {
            case AA:
              return i
            case eA:
              return a([i], { type: e })
            case tA:
              return new Int8Array(i)
            case rA:
              return new Uint8Array(i)
            case nA:
              return new Uint8ClampedArray(i)
            case iA:
              return new Int16Array(i)
            case sA:
              return new Uint16Array(i)
            case oA:
              return new Int32Array(i)
            case aA:
              return new Uint32Array(i)
            case cA:
              return new Float32Array(i)
            case uA:
              return new Float64Array(i)
            default:
              throw new Error('Unkown type: ' + r)
          }
        }
        var gA = {
          serialize: BA,
          deserialize: pA,
          stringToBuffer: fA,
          bufferToString: dA,
        }
        function wA(A, e, t, r) {
          A.executeSql(
            'CREATE TABLE IF NOT EXISTS ' +
              e.storeName +
              ' (id INTEGER PRIMARY KEY, key unique, value)',
            [],
            t,
            r,
          )
        }
        function mA(A) {
          var e = this,
            t = { db: null }
          if (A)
            for (var r in A)
              t[r] = 'string' != typeof A[r] ? A[r].toString() : A[r]
          var n = new c(function (A, r) {
            try {
              t.db = openDatabase(
                t.name,
                String(t.version),
                t.description,
                t.size,
              )
            } catch (fi) {
              return r(fi)
            }
            t.db.transaction(function (n) {
              wA(
                n,
                t,
                function () {
                  ;((e._dbInfo = t), A())
                },
                function (A, e) {
                  r(e)
                },
              )
            }, r)
          })
          return ((t.serializer = gA), n)
        }
        function CA(A, e, t, r, n, i) {
          A.executeSql(
            t,
            r,
            n,
            function (A, o) {
              o.code === o.SYNTAX_ERR
                ? A.executeSql(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
                    [e.storeName],
                    function (A, s) {
                      s.rows.length
                        ? i(A, o)
                        : wA(
                            A,
                            e,
                            function () {
                              A.executeSql(t, r, n, i)
                            },
                            i,
                          )
                    },
                    i,
                  )
                : i(A, o)
            },
            i,
          )
        }
        function yA(A, e) {
          var t = this
          A = h(A)
          var r = new c(function (e, r) {
            t.ready()
              .then(function () {
                var n = t._dbInfo
                n.db.transaction(function (t) {
                  CA(
                    t,
                    n,
                    'SELECT * FROM ' + n.storeName + ' WHERE key = ? LIMIT 1',
                    [A],
                    function (A, t) {
                      var r = t.rows.length ? t.rows.item(0).value : null
                      ;(r && (r = n.serializer.deserialize(r)), e(r))
                    },
                    function (A, e) {
                      r(e)
                    },
                  )
                })
              })
              .catch(r)
          })
          return (u(r, e), r)
        }
        function QA(A, e) {
          var t = this,
            r = new c(function (e, r) {
              t.ready()
                .then(function () {
                  var n = t._dbInfo
                  n.db.transaction(function (t) {
                    CA(
                      t,
                      n,
                      'SELECT * FROM ' + n.storeName,
                      [],
                      function (t, r) {
                        for (var i = r.rows, o = i.length, s = 0; s < o; s++) {
                          var a = i.item(s),
                            c = a.value
                          if (
                            (c && (c = n.serializer.deserialize(c)),
                            void 0 !== (c = A(c, a.key, s + 1)))
                          )
                            return void e(c)
                        }
                        e()
                      },
                      function (A, e) {
                        r(e)
                      },
                    )
                  })
                })
                .catch(r)
            })
          return (u(r, e), r)
        }
        function FA(A, e, t, r) {
          var n = this
          A = h(A)
          var i = new c(function (i, o) {
            n.ready()
              .then(function () {
                void 0 === e && (e = null)
                var s = e,
                  a = n._dbInfo
                a.serializer.serialize(e, function (e, c) {
                  c
                    ? o(c)
                    : a.db.transaction(
                        function (t) {
                          CA(
                            t,
                            a,
                            'INSERT OR REPLACE INTO ' +
                              a.storeName +
                              ' (key, value) VALUES (?, ?)',
                            [A, e],
                            function () {
                              i(s)
                            },
                            function (A, e) {
                              o(e)
                            },
                          )
                        },
                        function (e) {
                          if (e.code === e.QUOTA_ERR) {
                            if (r > 0)
                              return void i(FA.apply(n, [A, s, t, r - 1]))
                            o(e)
                          }
                        },
                      )
                })
              })
              .catch(o)
          })
          return (u(i, t), i)
        }
        function UA(A, e, t) {
          return FA.apply(this, [A, e, t, 1])
        }
        function vA(A, e) {
          var t = this
          A = h(A)
          var r = new c(function (e, r) {
            t.ready()
              .then(function () {
                var n = t._dbInfo
                n.db.transaction(function (t) {
                  CA(
                    t,
                    n,
                    'DELETE FROM ' + n.storeName + ' WHERE key = ?',
                    [A],
                    function () {
                      e()
                    },
                    function (A, e) {
                      r(e)
                    },
                  )
                })
              })
              .catch(r)
          })
          return (u(r, e), r)
        }
        function bA(A) {
          var e = this,
            t = new c(function (A, t) {
              e.ready()
                .then(function () {
                  var r = e._dbInfo
                  r.db.transaction(function (e) {
                    CA(
                      e,
                      r,
                      'DELETE FROM ' + r.storeName,
                      [],
                      function () {
                        A()
                      },
                      function (A, e) {
                        t(e)
                      },
                    )
                  })
                })
                .catch(t)
            })
          return (u(t, A), t)
        }
        function EA(A) {
          var e = this,
            t = new c(function (A, t) {
              e.ready()
                .then(function () {
                  var r = e._dbInfo
                  r.db.transaction(function (e) {
                    CA(
                      e,
                      r,
                      'SELECT COUNT(key) as c FROM ' + r.storeName,
                      [],
                      function (e, t) {
                        var r = t.rows.item(0).c
                        A(r)
                      },
                      function (A, e) {
                        t(e)
                      },
                    )
                  })
                })
                .catch(t)
            })
          return (u(t, A), t)
        }
        function HA(A, e) {
          var t = this,
            r = new c(function (e, r) {
              t.ready()
                .then(function () {
                  var n = t._dbInfo
                  n.db.transaction(function (t) {
                    CA(
                      t,
                      n,
                      'SELECT key FROM ' +
                        n.storeName +
                        ' WHERE id = ? LIMIT 1',
                      [A + 1],
                      function (A, t) {
                        var r = t.rows.length ? t.rows.item(0).key : null
                        e(r)
                      },
                      function (A, e) {
                        r(e)
                      },
                    )
                  })
                })
                .catch(r)
            })
          return (u(r, e), r)
        }
        function _A(A) {
          var e = this,
            t = new c(function (A, t) {
              e.ready()
                .then(function () {
                  var r = e._dbInfo
                  r.db.transaction(function (e) {
                    CA(
                      e,
                      r,
                      'SELECT key FROM ' + r.storeName,
                      [],
                      function (e, t) {
                        for (var r = [], n = 0; n < t.rows.length; n++)
                          r.push(t.rows.item(n).key)
                        A(r)
                      },
                      function (A, e) {
                        t(e)
                      },
                    )
                  })
                })
                .catch(t)
            })
          return (u(t, A), t)
        }
        function IA(A) {
          return new c(function (e, t) {
            A.transaction(
              function (r) {
                r.executeSql(
                  "SELECT name FROM sqlite_master WHERE type='table' AND name <> '__WebKitDatabaseInfoTable__'",
                  [],
                  function (t, r) {
                    for (var n = [], i = 0; i < r.rows.length; i++)
                      n.push(r.rows.item(i).name)
                    e({ db: A, storeNames: n })
                  },
                  function (A, e) {
                    t(e)
                  },
                )
              },
              function (A) {
                t(A)
              },
            )
          })
        }
        function DA(A, e) {
          e = f.apply(this, arguments)
          var t = this.config()
          ;(A = ('function' != typeof A && A) || {}).name ||
            ((A.name = A.name || t.name),
            (A.storeName = A.storeName || t.storeName))
          var r,
            n = this
          return (
            (r = A.name
              ? new c(function (e) {
                  var r
                  ;((r =
                    A.name === t.name
                      ? n._dbInfo.db
                      : openDatabase(A.name, '', '', 0)),
                    A.storeName
                      ? e({ db: r, storeNames: [A.storeName] })
                      : e(IA(r)))
                }).then(function (A) {
                  return new c(function (e, t) {
                    A.db.transaction(
                      function (r) {
                        function n(A) {
                          return new c(function (e, t) {
                            r.executeSql(
                              'DROP TABLE IF EXISTS ' + A,
                              [],
                              function () {
                                e()
                              },
                              function (A, e) {
                                t(e)
                              },
                            )
                          })
                        }
                        for (
                          var i = [], o = 0, s = A.storeNames.length;
                          o < s;
                          o++
                        )
                          i.push(n(A.storeNames[o]))
                        c.all(i)
                          .then(function () {
                            e()
                          })
                          .catch(function (A) {
                            t(A)
                          })
                      },
                      function (A) {
                        t(A)
                      },
                    )
                  })
                })
              : c.reject('Invalid arguments')),
            u(r, e),
            r
          )
        }
        var xA = {
          _driver: 'webSQLStorage',
          _initStorage: mA,
          _support: q(),
          iterate: QA,
          getItem: yA,
          setItem: UA,
          removeItem: vA,
          clear: bA,
          length: EA,
          key: HA,
          keys: _A,
          dropInstance: DA,
        }
        function kA() {
          try {
            return (
              'undefined' != typeof localStorage &&
              'setItem' in localStorage &&
              !!localStorage.setItem
            )
          } catch (fi) {
            return !1
          }
        }
        function LA(A, e) {
          var t = A.name + '/'
          return (A.storeName !== e.storeName && (t += A.storeName + '/'), t)
        }
        function SA() {
          var A = '_localforage_support_test'
          try {
            return (localStorage.setItem(A, !0), localStorage.removeItem(A), !1)
          } catch (fi) {
            return !0
          }
        }
        function OA() {
          return !SA() || localStorage.length > 0
        }
        function KA(A) {
          var e = this,
            t = {}
          if (A) for (var r in A) t[r] = A[r]
          return (
            (t.keyPrefix = LA(A, e._defaultConfig)),
            OA()
              ? ((e._dbInfo = t), (t.serializer = gA), c.resolve())
              : c.reject()
          )
        }
        function TA(A) {
          var e = this,
            t = e.ready().then(function () {
              for (
                var A = e._dbInfo.keyPrefix, t = localStorage.length - 1;
                t >= 0;
                t--
              ) {
                var r = localStorage.key(t)
                0 === r.indexOf(A) && localStorage.removeItem(r)
              }
            })
          return (u(t, A), t)
        }
        function MA(A, e) {
          var t = this
          A = h(A)
          var r = t.ready().then(function () {
            var e = t._dbInfo,
              r = localStorage.getItem(e.keyPrefix + A)
            return (r && (r = e.serializer.deserialize(r)), r)
          })
          return (u(r, e), r)
        }
        function RA(A, e) {
          var t = this,
            r = t.ready().then(function () {
              for (
                var e = t._dbInfo,
                  r = e.keyPrefix,
                  n = r.length,
                  i = localStorage.length,
                  o = 1,
                  s = 0;
                s < i;
                s++
              ) {
                var a = localStorage.key(s)
                if (0 === a.indexOf(r)) {
                  var c = localStorage.getItem(a)
                  if (
                    (c && (c = e.serializer.deserialize(c)),
                    void 0 !== (c = A(c, a.substring(n), o++)))
                  )
                    return c
                }
              }
            })
          return (u(r, e), r)
        }
        function NA(A, e) {
          var t = this,
            r = t.ready().then(function () {
              var e,
                r = t._dbInfo
              try {
                e = localStorage.key(A)
              } catch (n) {
                e = null
              }
              return (e && (e = e.substring(r.keyPrefix.length)), e)
            })
          return (u(r, e), r)
        }
        function PA(A) {
          var e = this,
            t = e.ready().then(function () {
              for (
                var A = e._dbInfo, t = localStorage.length, r = [], n = 0;
                n < t;
                n++
              ) {
                var i = localStorage.key(n)
                0 === i.indexOf(A.keyPrefix) &&
                  r.push(i.substring(A.keyPrefix.length))
              }
              return r
            })
          return (u(t, A), t)
        }
        function VA(A) {
          var e = this.keys().then(function (A) {
            return A.length
          })
          return (u(e, A), e)
        }
        function GA(A, e) {
          var t = this
          A = h(A)
          var r = t.ready().then(function () {
            var e = t._dbInfo
            localStorage.removeItem(e.keyPrefix + A)
          })
          return (u(r, e), r)
        }
        function zA(A, e, t) {
          var r = this
          A = h(A)
          var n = r.ready().then(function () {
            void 0 === e && (e = null)
            var t = e
            return new c(function (n, i) {
              var o = r._dbInfo
              o.serializer.serialize(e, function (e, r) {
                if (r) i(r)
                else
                  try {
                    ;(localStorage.setItem(o.keyPrefix + A, e), n(t))
                  } catch (fi) {
                    ;(('QuotaExceededError' !== fi.name &&
                      'NS_ERROR_DOM_QUOTA_REACHED' !== fi.name) ||
                      i(fi),
                      i(fi))
                  }
              })
            })
          })
          return (u(n, t), n)
        }
        function jA(A, e) {
          if (
            ((e = f.apply(this, arguments)),
            !(A = ('function' != typeof A && A) || {}).name)
          ) {
            var t = this.config()
            ;((A.name = A.name || t.name),
              (A.storeName = A.storeName || t.storeName))
          }
          var r,
            n = this
          return (
            (r = A.name
              ? new c(function (e) {
                  A.storeName ? e(LA(A, n._defaultConfig)) : e(A.name + '/')
                }).then(function (A) {
                  for (var e = localStorage.length - 1; e >= 0; e--) {
                    var t = localStorage.key(e)
                    0 === t.indexOf(A) && localStorage.removeItem(t)
                  }
                })
              : c.reject('Invalid arguments')),
            u(r, e),
            r
          )
        }
        var WA = {
            _driver: 'localStorageWrapper',
            _initStorage: KA,
            _support: kA(),
            iterate: RA,
            getItem: MA,
            setItem: zA,
            removeItem: GA,
            clear: TA,
            length: VA,
            key: NA,
            keys: PA,
            dropInstance: jA,
          },
          qA = function (A, e) {
            return (
              A === e ||
              ('number' == typeof A &&
                'number' == typeof e &&
                isNaN(A) &&
                isNaN(e))
            )
          },
          XA = function (A, e) {
            for (var t = A.length, r = 0; r < t; ) {
              if (qA(A[r], e)) return !0
              r++
            }
            return !1
          },
          JA =
            Array.isArray ||
            function (A) {
              return '[object Array]' === Object.prototype.toString.call(A)
            },
          YA = {},
          ZA = {},
          $A = { INDEXEDDB: W, WEBSQL: xA, LOCALSTORAGE: WA },
          Ae = [
            $A.INDEXEDDB._driver,
            $A.WEBSQL._driver,
            $A.LOCALSTORAGE._driver,
          ],
          ee = ['dropInstance'],
          te = [
            'clear',
            'getItem',
            'iterate',
            'key',
            'keys',
            'length',
            'removeItem',
            'setItem',
          ].concat(ee),
          re = {
            description: '',
            driver: Ae.slice(),
            name: 'localforage',
            size: 4980736,
            storeName: 'keyvaluepairs',
            version: 1,
          }
        function ne(A, e) {
          A[e] = function () {
            var t = arguments
            return A.ready().then(function () {
              return A[e].apply(A, t)
            })
          }
        }
        function ie() {
          for (var A = 1; A < arguments.length; A++) {
            var e = arguments[A]
            if (e)
              for (var t in e)
                e.hasOwnProperty(t) &&
                  (JA(e[t])
                    ? (arguments[0][t] = e[t].slice())
                    : (arguments[0][t] = e[t]))
          }
          return arguments[0]
        }
        var oe = (function () {
            function A(e) {
              for (var t in (n(this, A), $A))
                if ($A.hasOwnProperty(t)) {
                  var r = $A[t],
                    i = r._driver
                  ;((this[t] = i), YA[i] || this.defineDriver(r))
                }
              ;((this._defaultConfig = ie({}, re)),
                (this._config = ie({}, this._defaultConfig, e)),
                (this._driverSet = null),
                (this._initDriver = null),
                (this._ready = !1),
                (this._dbInfo = null),
                this._wrapLibraryMethodsWithReady(),
                this.setDriver(this._config.driver).catch(function () {}))
            }
            return (
              (A.prototype.config = function (A) {
                if ('object' === (void 0 === A ? 'undefined' : r(A))) {
                  if (this._ready)
                    return new Error(
                      "Can't call config() after localforage has been used.",
                    )
                  for (var e in A) {
                    if (
                      ('storeName' === e && (A[e] = A[e].replace(/\W/g, '_')),
                      'version' === e && 'number' != typeof A[e])
                    )
                      return new Error('Database version must be a number.')
                    this._config[e] = A[e]
                  }
                  return (
                    !('driver' in A) ||
                    !A.driver ||
                    this.setDriver(this._config.driver)
                  )
                }
                return 'string' == typeof A ? this._config[A] : this._config
              }),
              (A.prototype.defineDriver = function (A, e, t) {
                var r = new c(function (e, t) {
                  try {
                    var r = A._driver,
                      n = new Error(
                        'Custom driver not compliant; see https://mozilla.github.io/localForage/#definedriver',
                      )
                    if (!A._driver) return void t(n)
                    for (
                      var i = te.concat('_initStorage'), o = 0, s = i.length;
                      o < s;
                      o++
                    ) {
                      var a = i[o]
                      if ((!XA(ee, a) || A[a]) && 'function' != typeof A[a])
                        return void t(n)
                    }
                    var l = function () {
                      for (
                        var e = function (A) {
                            return function () {
                              var e = new Error(
                                  'Method ' +
                                    A +
                                    ' is not implemented by the current driver',
                                ),
                                t = c.reject(e)
                              return (u(t, arguments[arguments.length - 1]), t)
                            }
                          },
                          t = 0,
                          r = ee.length;
                        t < r;
                        t++
                      ) {
                        var n = ee[t]
                        A[n] || (A[n] = e(n))
                      }
                    }
                    l()
                    var h = function (t) {
                      ;(YA[r], (YA[r] = A), (ZA[r] = t), e())
                    }
                    '_support' in A
                      ? A._support && 'function' == typeof A._support
                        ? A._support().then(h, t)
                        : h(!!A._support)
                      : h(!0)
                  } catch (fi) {
                    t(fi)
                  }
                })
                return (l(r, e, t), r)
              }),
              (A.prototype.driver = function () {
                return this._driver || null
              }),
              (A.prototype.getDriver = function (A, e, t) {
                var r = YA[A]
                  ? c.resolve(YA[A])
                  : c.reject(new Error('Driver not found.'))
                return (l(r, e, t), r)
              }),
              (A.prototype.getSerializer = function (A) {
                var e = c.resolve(gA)
                return (l(e, A), e)
              }),
              (A.prototype.ready = function (A) {
                var e = this,
                  t = e._driverSet.then(function () {
                    return (
                      null === e._ready && (e._ready = e._initDriver()),
                      e._ready
                    )
                  })
                return (l(t, A, A), t)
              }),
              (A.prototype.setDriver = function (A, e, t) {
                var r = this
                JA(A) || (A = [A])
                var n = this._getSupportedDrivers(A)
                function i() {
                  r._config.driver = r.driver()
                }
                function o(A) {
                  return (
                    r._extend(A),
                    i(),
                    (r._ready = r._initStorage(r._config)),
                    r._ready
                  )
                }
                function s(A) {
                  return function () {
                    var e = 0
                    function t() {
                      for (; e < A.length; ) {
                        var n = A[e]
                        return (
                          e++,
                          (r._dbInfo = null),
                          (r._ready = null),
                          r.getDriver(n).then(o).catch(t)
                        )
                      }
                      i()
                      var s = new Error('No available storage method found.')
                      return ((r._driverSet = c.reject(s)), r._driverSet)
                    }
                    return t()
                  }
                }
                var a =
                  null !== this._driverSet
                    ? this._driverSet.catch(function () {
                        return c.resolve()
                      })
                    : c.resolve()
                return (
                  (this._driverSet = a
                    .then(function () {
                      var A = n[0]
                      return (
                        (r._dbInfo = null),
                        (r._ready = null),
                        r.getDriver(A).then(function (A) {
                          ;((r._driver = A._driver),
                            i(),
                            r._wrapLibraryMethodsWithReady(),
                            (r._initDriver = s(n)))
                        })
                      )
                    })
                    .catch(function () {
                      i()
                      var A = new Error('No available storage method found.')
                      return ((r._driverSet = c.reject(A)), r._driverSet)
                    })),
                  l(this._driverSet, e, t),
                  this._driverSet
                )
              }),
              (A.prototype.supports = function (A) {
                return !!ZA[A]
              }),
              (A.prototype._extend = function (A) {
                ie(this, A)
              }),
              (A.prototype._getSupportedDrivers = function (A) {
                for (var e = [], t = 0, r = A.length; t < r; t++) {
                  var n = A[t]
                  this.supports(n) && e.push(n)
                }
                return e
              }),
              (A.prototype._wrapLibraryMethodsWithReady = function () {
                for (var A = 0, e = te.length; A < e; A++) ne(this, te[A])
              }),
              (A.prototype.createInstance = function (e) {
                return new A(e)
              }),
              A
            )
          })(),
          se = new oe()
        e.exports = se
      },
      { 3: 3 },
    ],
  },
  {},
  [4],
)(4)
const ic = ni(nc.exports)
var oc
'function' == typeof SuppressedError && SuppressedError
const sc = '__TAURI_TO_IPC_KEY__'
function ac(A, e = !1) {
  return window.__TAURI_INTERNALS__.transformCallback(A, e)
}
async function cc(A, e = {}, t) {
  return window.__TAURI_INTERNALS__.invoke(A, e, t)
}
class uc {
  get rid() {
    return (function (A, e, t, r) {
      if ('function' == typeof e || !e.has(A))
        throw new TypeError(
          'Cannot read private member from an object whose class did not declare it',
        )
      return 'm' === t ? r : 'a' === t ? r.call(A) : r ? r.value : e.get(A)
    })(this, oc, 'f')
  }
  constructor(A) {
    ;(oc.set(this, void 0),
      (function (A, e, t) {
        if ('function' == typeof e || !e.has(A))
          throw new TypeError(
            'Cannot write private member to an object whose class did not declare it',
          )
        e.set(A, t)
      })(this, oc, A))
  }
  async close() {
    return cc('plugin:resources|close', { rid: this.rid })
  }
}
oc = new WeakMap()
class lc {
  constructor(...A) {
    ;((this.type = 'Logical'),
      1 === A.length
        ? 'Logical' in A[0]
          ? ((this.width = A[0].Logical.width),
            (this.height = A[0].Logical.height))
          : ((this.width = A[0].width), (this.height = A[0].height))
        : ((this.width = A[0]), (this.height = A[1])))
  }
  toPhysical(A) {
    return new hc(this.width * A, this.height * A)
  }
  [sc]() {
    return { width: this.width, height: this.height }
  }
  toJSON() {
    return this[sc]()
  }
}
class hc {
  constructor(...A) {
    ;((this.type = 'Physical'),
      1 === A.length
        ? 'Physical' in A[0]
          ? ((this.width = A[0].Physical.width),
            (this.height = A[0].Physical.height))
          : ((this.width = A[0].width), (this.height = A[0].height))
        : ((this.width = A[0]), (this.height = A[1])))
  }
  toLogical(A) {
    return new lc(this.width / A, this.height / A)
  }
  [sc]() {
    return { width: this.width, height: this.height }
  }
  toJSON() {
    return this[sc]()
  }
}
class fc {
  constructor(A) {
    this.size = A
  }
  toLogical(A) {
    return this.size instanceof lc ? this.size : this.size.toLogical(A)
  }
  toPhysical(A) {
    return this.size instanceof hc ? this.size : this.size.toPhysical(A)
  }
  [sc]() {
    return {
      [`${this.size.type}`]: {
        width: this.size.width,
        height: this.size.height,
      },
    }
  }
  toJSON() {
    return this[sc]()
  }
}
class dc {
  constructor(...A) {
    ;((this.type = 'Logical'),
      1 === A.length
        ? 'Logical' in A[0]
          ? ((this.x = A[0].Logical.x), (this.y = A[0].Logical.y))
          : ((this.x = A[0].x), (this.y = A[0].y))
        : ((this.x = A[0]), (this.y = A[1])))
  }
  toPhysical(A) {
    return new Bc(this.x * A, this.y * A)
  }
  [sc]() {
    return { x: this.x, y: this.y }
  }
  toJSON() {
    return this[sc]()
  }
}
class Bc {
  constructor(...A) {
    ;((this.type = 'Physical'),
      1 === A.length
        ? 'Physical' in A[0]
          ? ((this.x = A[0].Physical.x), (this.y = A[0].Physical.y))
          : ((this.x = A[0].x), (this.y = A[0].y))
        : ((this.x = A[0]), (this.y = A[1])))
  }
  toLogical(A) {
    return new dc(this.x / A, this.y / A)
  }
  [sc]() {
    return { x: this.x, y: this.y }
  }
  toJSON() {
    return this[sc]()
  }
}
class pc {
  constructor(A) {
    this.position = A
  }
  toLogical(A) {
    return this.position instanceof dc
      ? this.position
      : this.position.toLogical(A)
  }
  toPhysical(A) {
    return this.position instanceof Bc
      ? this.position
      : this.position.toPhysical(A)
  }
  [sc]() {
    return {
      [`${this.position.type}`]: { x: this.position.x, y: this.position.y },
    }
  }
  toJSON() {
    return this[sc]()
  }
}
var gc, wc
async function mc(A, e) {
  await cc('plugin:event|unlisten', { event: A, eventId: e })
}
async function Cc(A, e, t) {
  var r
  const n =
    'string' == typeof (null == t ? void 0 : t.target)
      ? { kind: 'AnyLabel', label: t.target }
      : null !== (r = null == t ? void 0 : t.target) && void 0 !== r
        ? r
        : { kind: 'Any' }
  return cc('plugin:event|listen', {
    event: A,
    target: n,
    handler: ac(e),
  }).then((e) => async () => mc(A, e))
}
;(((wc = gc || (gc = {})).WINDOW_RESIZED = 'tauri://resize'),
  (wc.WINDOW_MOVED = 'tauri://move'),
  (wc.WINDOW_CLOSE_REQUESTED = 'tauri://close-requested'),
  (wc.WINDOW_DESTROYED = 'tauri://destroyed'),
  (wc.WINDOW_FOCUS = 'tauri://focus'),
  (wc.WINDOW_BLUR = 'tauri://blur'),
  (wc.WINDOW_SCALE_FACTOR_CHANGED = 'tauri://scale-change'),
  (wc.WINDOW_THEME_CHANGED = 'tauri://theme-changed'),
  (wc.WINDOW_CREATED = 'tauri://window-created'),
  (wc.WEBVIEW_CREATED = 'tauri://webview-created'),
  (wc.DRAG_ENTER = 'tauri://drag-enter'),
  (wc.DRAG_OVER = 'tauri://drag-over'),
  (wc.DRAG_DROP = 'tauri://drag-drop'),
  (wc.DRAG_LEAVE = 'tauri://drag-leave'))
let yc = class A extends uc {
  constructor(A) {
    super(A)
  }
  static async new(e, t, r) {
    return cc('plugin:image|new', { rgba: Qc(e), width: t, height: r }).then(
      (e) => new A(e),
    )
  }
  static async fromBytes(e) {
    return cc('plugin:image|from_bytes', { bytes: Qc(e) }).then((e) => new A(e))
  }
  static async fromPath(e) {
    return cc('plugin:image|from_path', { path: e }).then((e) => new A(e))
  }
  async rgba() {
    return cc('plugin:image|rgba', { rid: this.rid }).then(
      (A) => new Uint8Array(A),
    )
  }
  async size() {
    return cc('plugin:image|size', { rid: this.rid })
  }
}
function Qc(A) {
  return null == A
    ? null
    : 'string' == typeof A
      ? A
      : A instanceof yc
        ? A.rid
        : A
}
var Fc, Uc, vc, bc
;(((Uc = Fc || (Fc = {}))[(Uc.Critical = 1)] = 'Critical'),
  (Uc[(Uc.Informational = 2)] = 'Informational'))
class Ec {
  constructor(A) {
    ;((this._preventDefault = !1), (this.event = A.event), (this.id = A.id))
  }
  preventDefault() {
    this._preventDefault = !0
  }
  isPreventDefault() {
    return this._preventDefault
  }
}
async function Hc() {
  return cc('plugin:window|get_all_windows').then((A) =>
    A.map((A) => new Ic(A, { skip: !0 })),
  )
}
;(((bc = vc || (vc = {})).None = 'none'),
  (bc.Normal = 'normal'),
  (bc.Indeterminate = 'indeterminate'),
  (bc.Paused = 'paused'),
  (bc.Error = 'error'))
const _c = ['tauri://created', 'tauri://error']
class Ic {
  constructor(A, e = {}) {
    var t
    ;((this.label = A),
      (this.listeners = Object.create(null)),
      (null == e ? void 0 : e.skip) ||
        cc('plugin:window|create', {
          options: {
            ...e,
            parent:
              'string' == typeof e.parent
                ? e.parent
                : null === (t = e.parent) || void 0 === t
                  ? void 0
                  : t.label,
            label: A,
          },
        })
          .then(async () => this.emit('tauri://created'))
          .catch(async (A) => this.emit('tauri://error', A)))
  }
  static async getByLabel(A) {
    var e
    return null !== (e = (await Hc()).find((e) => e.label === A)) &&
      void 0 !== e
      ? e
      : null
  }
  static getCurrent() {
    return new Ic(window.__TAURI_INTERNALS__.metadata.currentWindow.label, {
      skip: !0,
    })
  }
  static async getAll() {
    return Hc()
  }
  static async getFocusedWindow() {
    for (const A of await Hc()) if (await A.isFocused()) return A
    return null
  }
  async listen(A, e) {
    return this._handleTauriEvent(A, e)
      ? () => {
          const t = this.listeners[A]
          t.splice(t.indexOf(e), 1)
        }
      : Cc(A, e, { target: { kind: 'Window', label: this.label } })
  }
  async once(A, e) {
    return this._handleTauriEvent(A, e)
      ? () => {
          const t = this.listeners[A]
          t.splice(t.indexOf(e), 1)
        }
      : (async function (A, e, t) {
          return Cc(
            A,
            (t) => {
              ;(mc(A, t.id), e(t))
            },
            t,
          )
        })(A, e, { target: { kind: 'Window', label: this.label } })
  }
  async emit(A, e) {
    if (!_c.includes(A))
      return (async function (A, e) {
        await cc('plugin:event|emit', { event: A, payload: e })
      })(A, e)
    for (const t of this.listeners[A] || []) t({ event: A, id: -1, payload: e })
  }
  async emitTo(A, e, t) {
    if (!_c.includes(e))
      return (async function (A, e, t) {
        const r = 'string' == typeof A ? { kind: 'AnyLabel', label: A } : A
        await cc('plugin:event|emit_to', { target: r, event: e, payload: t })
      })(A, e, t)
    for (const r of this.listeners[e] || []) r({ event: e, id: -1, payload: t })
  }
  _handleTauriEvent(A, e) {
    return (
      !!_c.includes(A) &&
      (A in this.listeners
        ? this.listeners[A].push(e)
        : (this.listeners[A] = [e]),
      !0)
    )
  }
  async scaleFactor() {
    return cc('plugin:window|scale_factor', { label: this.label })
  }
  async innerPosition() {
    return cc('plugin:window|inner_position', { label: this.label }).then(
      (A) => new Bc(A),
    )
  }
  async outerPosition() {
    return cc('plugin:window|outer_position', { label: this.label }).then(
      (A) => new Bc(A),
    )
  }
  async innerSize() {
    return cc('plugin:window|inner_size', { label: this.label }).then(
      (A) => new hc(A),
    )
  }
  async outerSize() {
    return cc('plugin:window|outer_size', { label: this.label }).then(
      (A) => new hc(A),
    )
  }
  async isFullscreen() {
    return cc('plugin:window|is_fullscreen', { label: this.label })
  }
  async isMinimized() {
    return cc('plugin:window|is_minimized', { label: this.label })
  }
  async isMaximized() {
    return cc('plugin:window|is_maximized', { label: this.label })
  }
  async isFocused() {
    return cc('plugin:window|is_focused', { label: this.label })
  }
  async isDecorated() {
    return cc('plugin:window|is_decorated', { label: this.label })
  }
  async isResizable() {
    return cc('plugin:window|is_resizable', { label: this.label })
  }
  async isMaximizable() {
    return cc('plugin:window|is_maximizable', { label: this.label })
  }
  async isMinimizable() {
    return cc('plugin:window|is_minimizable', { label: this.label })
  }
  async isClosable() {
    return cc('plugin:window|is_closable', { label: this.label })
  }
  async isVisible() {
    return cc('plugin:window|is_visible', { label: this.label })
  }
  async title() {
    return cc('plugin:window|title', { label: this.label })
  }
  async theme() {
    return cc('plugin:window|theme', { label: this.label })
  }
  async isAlwaysOnTop() {
    return cc('plugin:window|is_always_on_top', { label: this.label })
  }
  async center() {
    return cc('plugin:window|center', { label: this.label })
  }
  async requestUserAttention(A) {
    let e = null
    return (
      A &&
        (e =
          A === Fc.Critical ? { type: 'Critical' } : { type: 'Informational' }),
      cc('plugin:window|request_user_attention', {
        label: this.label,
        value: e,
      })
    )
  }
  async setResizable(A) {
    return cc('plugin:window|set_resizable', { label: this.label, value: A })
  }
  async setEnabled(A) {
    return cc('plugin:window|set_enabled', { label: this.label, value: A })
  }
  async isEnabled() {
    return cc('plugin:window|is_enabled', { label: this.label })
  }
  async setMaximizable(A) {
    return cc('plugin:window|set_maximizable', { label: this.label, value: A })
  }
  async setMinimizable(A) {
    return cc('plugin:window|set_minimizable', { label: this.label, value: A })
  }
  async setClosable(A) {
    return cc('plugin:window|set_closable', { label: this.label, value: A })
  }
  async setTitle(A) {
    return cc('plugin:window|set_title', { label: this.label, value: A })
  }
  async maximize() {
    return cc('plugin:window|maximize', { label: this.label })
  }
  async unmaximize() {
    return cc('plugin:window|unmaximize', { label: this.label })
  }
  async toggleMaximize() {
    return cc('plugin:window|toggle_maximize', { label: this.label })
  }
  async minimize() {
    return cc('plugin:window|minimize', { label: this.label })
  }
  async unminimize() {
    return cc('plugin:window|unminimize', { label: this.label })
  }
  async show() {
    return cc('plugin:window|show', { label: this.label })
  }
  async hide() {
    return cc('plugin:window|hide', { label: this.label })
  }
  async close() {
    return cc('plugin:window|close', { label: this.label })
  }
  async destroy() {
    return cc('plugin:window|destroy', { label: this.label })
  }
  async setDecorations(A) {
    return cc('plugin:window|set_decorations', { label: this.label, value: A })
  }
  async setShadow(A) {
    return cc('plugin:window|set_shadow', { label: this.label, value: A })
  }
  async setEffects(A) {
    return cc('plugin:window|set_effects', { label: this.label, value: A })
  }
  async clearEffects() {
    return cc('plugin:window|set_effects', { label: this.label, value: null })
  }
  async setAlwaysOnTop(A) {
    return cc('plugin:window|set_always_on_top', {
      label: this.label,
      value: A,
    })
  }
  async setAlwaysOnBottom(A) {
    return cc('plugin:window|set_always_on_bottom', {
      label: this.label,
      value: A,
    })
  }
  async setContentProtected(A) {
    return cc('plugin:window|set_content_protected', {
      label: this.label,
      value: A,
    })
  }
  async setSize(A) {
    return cc('plugin:window|set_size', {
      label: this.label,
      value: A instanceof fc ? A : new fc(A),
    })
  }
  async setMinSize(A) {
    return cc('plugin:window|set_min_size', {
      label: this.label,
      value: A instanceof fc ? A : A ? new fc(A) : null,
    })
  }
  async setMaxSize(A) {
    return cc('plugin:window|set_max_size', {
      label: this.label,
      value: A instanceof fc ? A : A ? new fc(A) : null,
    })
  }
  async setSizeConstraints(A) {
    function e(A) {
      return A ? { Logical: A } : null
    }
    return cc('plugin:window|set_size_constraints', {
      label: this.label,
      value: {
        minWidth: e(null == A ? void 0 : A.minWidth),
        minHeight: e(null == A ? void 0 : A.minHeight),
        maxWidth: e(null == A ? void 0 : A.maxWidth),
        maxHeight: e(null == A ? void 0 : A.maxHeight),
      },
    })
  }
  async setPosition(A) {
    return cc('plugin:window|set_position', {
      label: this.label,
      value: A instanceof pc ? A : new pc(A),
    })
  }
  async setFullscreen(A) {
    return cc('plugin:window|set_fullscreen', { label: this.label, value: A })
  }
  async setFocus() {
    return cc('plugin:window|set_focus', { label: this.label })
  }
  async setIcon(A) {
    return cc('plugin:window|set_icon', { label: this.label, value: Qc(A) })
  }
  async setSkipTaskbar(A) {
    return cc('plugin:window|set_skip_taskbar', { label: this.label, value: A })
  }
  async setCursorGrab(A) {
    return cc('plugin:window|set_cursor_grab', { label: this.label, value: A })
  }
  async setCursorVisible(A) {
    return cc('plugin:window|set_cursor_visible', {
      label: this.label,
      value: A,
    })
  }
  async setCursorIcon(A) {
    return cc('plugin:window|set_cursor_icon', { label: this.label, value: A })
  }
  async setBackgroundColor(A) {
    return cc('plugin:window|set_background_color', { color: A })
  }
  async setCursorPosition(A) {
    return cc('plugin:window|set_cursor_position', {
      label: this.label,
      value: A instanceof pc ? A : new pc(A),
    })
  }
  async setIgnoreCursorEvents(A) {
    return cc('plugin:window|set_ignore_cursor_events', {
      label: this.label,
      value: A,
    })
  }
  async startDragging() {
    return cc('plugin:window|start_dragging', { label: this.label })
  }
  async startResizeDragging(A) {
    return cc('plugin:window|start_resize_dragging', {
      label: this.label,
      value: A,
    })
  }
  async setBadgeCount(A) {
    return cc('plugin:window|set_badge_count', { label: this.label, value: A })
  }
  async setBadgeLabel(A) {
    return cc('plugin:window|set_badge_label', { label: this.label, value: A })
  }
  async setOverlayIcon(A) {
    return cc('plugin:window|set_overlay_icon', {
      label: this.label,
      value: A ? Qc(A) : void 0,
    })
  }
  async setProgressBar(A) {
    return cc('plugin:window|set_progress_bar', { label: this.label, value: A })
  }
  async setVisibleOnAllWorkspaces(A) {
    return cc('plugin:window|set_visible_on_all_workspaces', {
      label: this.label,
      value: A,
    })
  }
  async setTitleBarStyle(A) {
    return cc('plugin:window|set_title_bar_style', {
      label: this.label,
      value: A,
    })
  }
  async setTheme(A) {
    return cc('plugin:window|set_theme', { label: this.label, value: A })
  }
  async onResized(A) {
    return this.listen(gc.WINDOW_RESIZED, (e) => {
      ;((e.payload = new hc(e.payload)), A(e))
    })
  }
  async onMoved(A) {
    return this.listen(gc.WINDOW_MOVED, (e) => {
      ;((e.payload = new Bc(e.payload)), A(e))
    })
  }
  async onCloseRequested(A) {
    return this.listen(gc.WINDOW_CLOSE_REQUESTED, async (e) => {
      const t = new Ec(e)
      ;(await A(t), t.isPreventDefault() || (await this.destroy()))
    })
  }
  async onDragDropEvent(A) {
    const e = await this.listen(gc.DRAG_ENTER, (e) => {
        A({
          ...e,
          payload: {
            type: 'enter',
            paths: e.payload.paths,
            position: new Bc(e.payload.position),
          },
        })
      }),
      t = await this.listen(gc.DRAG_OVER, (e) => {
        A({
          ...e,
          payload: { type: 'over', position: new Bc(e.payload.position) },
        })
      }),
      r = await this.listen(gc.DRAG_DROP, (e) => {
        A({
          ...e,
          payload: {
            type: 'drop',
            paths: e.payload.paths,
            position: new Bc(e.payload.position),
          },
        })
      }),
      n = await this.listen(gc.DRAG_LEAVE, (e) => {
        A({ ...e, payload: { type: 'leave' } })
      })
    return () => {
      ;(e(), r(), t(), n())
    }
  }
  async onFocusChanged(A) {
    const e = await this.listen(gc.WINDOW_FOCUS, (e) => {
        A({ ...e, payload: !0 })
      }),
      t = await this.listen(gc.WINDOW_BLUR, (e) => {
        A({ ...e, payload: !1 })
      })
    return () => {
      ;(e(), t())
    }
  }
  async onScaleChanged(A) {
    return this.listen(gc.WINDOW_SCALE_FACTOR_CHANGED, A)
  }
  async onThemeChanged(A) {
    return this.listen(gc.WINDOW_THEME_CHANGED, A)
  }
}
var Dc, xc, kc, Lc, Sc, Oc
;(((xc = Dc || (Dc = {})).Disabled = 'disabled'),
  (xc.Throttle = 'throttle'),
  (xc.Suspend = 'suspend'),
  ((Lc = kc || (kc = {})).AppearanceBased = 'appearanceBased'),
  (Lc.Light = 'light'),
  (Lc.Dark = 'dark'),
  (Lc.MediumLight = 'mediumLight'),
  (Lc.UltraDark = 'ultraDark'),
  (Lc.Titlebar = 'titlebar'),
  (Lc.Selection = 'selection'),
  (Lc.Menu = 'menu'),
  (Lc.Popover = 'popover'),
  (Lc.Sidebar = 'sidebar'),
  (Lc.HeaderView = 'headerView'),
  (Lc.Sheet = 'sheet'),
  (Lc.WindowBackground = 'windowBackground'),
  (Lc.HudWindow = 'hudWindow'),
  (Lc.FullScreenUI = 'fullScreenUI'),
  (Lc.Tooltip = 'tooltip'),
  (Lc.ContentBackground = 'contentBackground'),
  (Lc.UnderWindowBackground = 'underWindowBackground'),
  (Lc.UnderPageBackground = 'underPageBackground'),
  (Lc.Mica = 'mica'),
  (Lc.Blur = 'blur'),
  (Lc.Acrylic = 'acrylic'),
  (Lc.Tabbed = 'tabbed'),
  (Lc.TabbedDark = 'tabbedDark'),
  (Lc.TabbedLight = 'tabbedLight'),
  ((Oc = Sc || (Sc = {})).FollowsWindowActiveState =
    'followsWindowActiveState'),
  (Oc.Active = 'active'),
  (Oc.Inactive = 'inactive'))
const Kc = (A, e = new WeakMap()) => {
    if (
      null === A ||
      ((A) => {
        const e = typeof A
        return ('function' !== e && 'object' !== e) || null === A
      })(A)
    )
      return A
    if (e.has(A)) return e.get(A)
    if (A instanceof RegExp)
      return ((A) => {
        const e = '' === A.flags ? void 0 : A.flags
        return new RegExp(A.source, e)
      })(A)
    if (A instanceof Date) return new Date(A.getTime())
    if (A instanceof Function) return A
    if (A instanceof Map) {
      const t = new Map()
      return (
        e.set(A, t),
        A.forEach((A, r) => {
          t.set(r, Kc(A, e))
        }),
        t
      )
    }
    if (A instanceof Set) {
      const t = new Set()
      e.set(A, t)
      for (const r of A) t.add(Kc(r, e))
      return t
    }
    if (Array.isArray(A)) {
      const t = []
      return (
        e.set(A, t),
        A.forEach((A) => {
          t.push(Kc(A, e))
        }),
        t
      )
    }
    const t = {}
    e.set(A, t)
    for (const r in A)
      Object.prototype.hasOwnProperty.call(A, r) && (t[r] = Kc(A[r], e))
    return t
  },
  Tc = (A, e = 200) => {
    let t = 0
    return (...r) =>
      new Promise((n) => {
        ;(t && (clearTimeout(t), n('cancel')),
          (t = window.setTimeout(() => {
            ;(A.apply(void 0, r), (t = 0), n('done'))
          }, e)))
      })
  },
  Mc = () =>
    `${Date.now().toString(36)}${Math.random().toString(36).substring(2)}`,
  Rc = (A) => null !== A && 'object' == typeof A && !Array.isArray(A),
  Nc = (A, e, t = {}) => {
    const { excludeKeys: r } = t
    for (const n in e)
      r && r(n)
        ? (A[n] = e[n])
        : Rc(e[n]) && Rc(A[n])
          ? (A[n] = Nc(A[n], e[n], t))
          : (A[n] = e[n])
    return A
  }
/*! medium-zoom 1.1.0 | MIT License | https://github.com/francoischalifour/medium-zoom */ var Pc =
    Object.assign ||
    function (A) {
      for (var e = 1; e < arguments.length; e++) {
        var t = arguments[e]
        for (var r in t)
          Object.prototype.hasOwnProperty.call(t, r) && (A[r] = t[r])
      }
      return A
    },
  Vc = function (A) {
    return 'IMG' === A.tagName
  },
  Gc = function (A) {
    return A && 1 === A.nodeType
  },
  zc = function (A) {
    return '.svg' === (A.currentSrc || A.src).substr(-4).toLowerCase()
  },
  jc = function (A) {
    try {
      return Array.isArray(A)
        ? A.filter(Vc)
        : (function (A) {
              return NodeList.prototype.isPrototypeOf(A)
            })(A)
          ? [].slice.call(A).filter(Vc)
          : Gc(A)
            ? [A].filter(Vc)
            : 'string' == typeof A
              ? [].slice.call(document.querySelectorAll(A)).filter(Vc)
              : []
    } catch (WC) {
      throw new TypeError(
        'The provided selector is invalid.\nExpects a CSS selector, a Node element, a NodeList or an array.\nSee: https://github.com/francoischalifour/medium-zoom',
      )
    }
  },
  Wc = function (A, e) {
    var t = Pc({ bubbles: !1, cancelable: !1, detail: void 0 }, e)
    if ('function' == typeof window.CustomEvent) return new CustomEvent(A, t)
    var r = document.createEvent('CustomEvent')
    return (r.initCustomEvent(A, t.bubbles, t.cancelable, t.detail), r)
  },
  qc = function A(e) {
    var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {},
      r =
        window.Promise ||
        function (A) {
          function e() {}
          A(e, e)
        },
      n = function () {
        for (var A = arguments.length, e = Array(A), t = 0; t < A; t++)
          e[t] = arguments[t]
        var r = e.reduce(function (A, e) {
          return [].concat(A, jc(e))
        }, [])
        return (
          r
            .filter(function (A) {
              return -1 === a.indexOf(A)
            })
            .forEach(function (A) {
              ;(a.push(A), A.classList.add('medium-zoom-image'))
            }),
          c.forEach(function (A) {
            var e = A.type,
              t = A.listener,
              n = A.options
            r.forEach(function (A) {
              A.addEventListener(e, t, n)
            })
          }),
          B
        )
      },
      i = function () {
        var A = (
            arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {}
          ).target,
          e = function () {
            var A = {
                width: document.documentElement.clientWidth,
                height: document.documentElement.clientHeight,
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
              },
              e = void 0,
              t = void 0
            if (h.container)
              if (h.container instanceof Object)
                ((e =
                  (A = Pc({}, A, h.container)).width -
                  A.left -
                  A.right -
                  2 * h.margin),
                  (t = A.height - A.top - A.bottom - 2 * h.margin))
              else {
                var r = (
                    Gc(h.container)
                      ? h.container
                      : document.querySelector(h.container)
                  ).getBoundingClientRect(),
                  n = r.width,
                  i = r.height,
                  o = r.left,
                  s = r.top
                A = Pc({}, A, { width: n, height: i, left: o, top: s })
              }
            ;((e = e || A.width - 2 * h.margin),
              (t = t || A.height - 2 * h.margin))
            var a = f.zoomedHd || f.original,
              c = zc(a) ? e : a.naturalWidth || e,
              u = zc(a) ? t : a.naturalHeight || t,
              l = a.getBoundingClientRect(),
              d = l.top,
              B = l.left,
              p = l.width,
              g = l.height,
              w = Math.min(Math.max(p, c), e) / p,
              m = Math.min(Math.max(g, u), t) / g,
              C = Math.min(w, m),
              y =
                'scale(' +
                C +
                ') translate3d(' +
                ((e - p) / 2 - B + h.margin + A.left) / C +
                'px, ' +
                ((t - g) / 2 - d + h.margin + A.top) / C +
                'px, 0)'
            ;((f.zoomed.style.transform = y),
              f.zoomedHd && (f.zoomedHd.style.transform = y))
          }
        return new r(function (t) {
          if (A && -1 === a.indexOf(A)) t(B)
          else {
            if (f.zoomed) t(B)
            else {
              if (A) f.original = A
              else {
                if (!(a.length > 0)) return void t(B)
                var r = a
                f.original = r[0]
              }
              if (
                (f.original.dispatchEvent(
                  Wc('medium-zoom:open', { detail: { zoom: B } }),
                ),
                (l =
                  window.pageYOffset ||
                  document.documentElement.scrollTop ||
                  document.body.scrollTop ||
                  0),
                (u = !0),
                (f.zoomed = (function (A) {
                  var e = A.getBoundingClientRect(),
                    t = e.top,
                    r = e.left,
                    n = e.width,
                    i = e.height,
                    o = A.cloneNode(),
                    s =
                      window.pageYOffset ||
                      document.documentElement.scrollTop ||
                      document.body.scrollTop ||
                      0,
                    a =
                      window.pageXOffset ||
                      document.documentElement.scrollLeft ||
                      document.body.scrollLeft ||
                      0
                  return (
                    o.removeAttribute('id'),
                    (o.style.position = 'absolute'),
                    (o.style.top = t + s + 'px'),
                    (o.style.left = r + a + 'px'),
                    (o.style.width = n + 'px'),
                    (o.style.height = i + 'px'),
                    (o.style.transform = ''),
                    o
                  )
                })(f.original)),
                document.body.appendChild(d),
                h.template)
              ) {
                var n = Gc(h.template)
                  ? h.template
                  : document.querySelector(h.template)
                ;((f.template = document.createElement('div')),
                  f.template.appendChild(n.content.cloneNode(!0)),
                  document.body.appendChild(f.template))
              }
              if (
                (f.original.parentElement &&
                  'PICTURE' === f.original.parentElement.tagName &&
                  f.original.currentSrc &&
                  (f.zoomed.src = f.original.currentSrc),
                document.body.appendChild(f.zoomed),
                window.requestAnimationFrame(function () {
                  document.body.classList.add('medium-zoom--opened')
                }),
                f.original.classList.add('medium-zoom-image--hidden'),
                f.zoomed.classList.add('medium-zoom-image--opened'),
                f.zoomed.addEventListener('click', o),
                f.zoomed.addEventListener('transitionend', function A() {
                  ;((u = !1),
                    f.zoomed.removeEventListener('transitionend', A),
                    f.original.dispatchEvent(
                      Wc('medium-zoom:opened', { detail: { zoom: B } }),
                    ),
                    t(B))
                }),
                f.original.getAttribute('data-zoom-src'))
              ) {
                ;((f.zoomedHd = f.zoomed.cloneNode()),
                  f.zoomedHd.removeAttribute('srcset'),
                  f.zoomedHd.removeAttribute('sizes'),
                  f.zoomedHd.removeAttribute('loading'),
                  (f.zoomedHd.src = f.zoomed.getAttribute('data-zoom-src')),
                  (f.zoomedHd.onerror = function () {
                    ;(clearInterval(i), (f.zoomedHd = null), e())
                  }))
                var i = setInterval(function () {
                  f.zoomedHd.complete &&
                    (clearInterval(i),
                    f.zoomedHd.classList.add('medium-zoom-image--opened'),
                    f.zoomedHd.addEventListener('click', o),
                    document.body.appendChild(f.zoomedHd),
                    e())
                }, 10)
              } else if (f.original.hasAttribute('srcset')) {
                ;((f.zoomedHd = f.zoomed.cloneNode()),
                  f.zoomedHd.removeAttribute('sizes'),
                  f.zoomedHd.removeAttribute('loading'))
                var s = f.zoomedHd.addEventListener('load', function () {
                  ;(f.zoomedHd.removeEventListener('load', s),
                    f.zoomedHd.classList.add('medium-zoom-image--opened'),
                    f.zoomedHd.addEventListener('click', o),
                    document.body.appendChild(f.zoomedHd),
                    e())
                })
              } else e()
            }
          }
        })
      },
      o = function () {
        return new r(function (A) {
          if (!u && f.original) {
            ;((u = !0),
              document.body.classList.remove('medium-zoom--opened'),
              (f.zoomed.style.transform = ''),
              f.zoomedHd && (f.zoomedHd.style.transform = ''),
              f.template &&
                ((f.template.style.transition = 'opacity 150ms'),
                (f.template.style.opacity = 0)),
              f.original.dispatchEvent(
                Wc('medium-zoom:close', { detail: { zoom: B } }),
              ),
              f.zoomed.addEventListener('transitionend', function e() {
                ;(f.original.classList.remove('medium-zoom-image--hidden'),
                  document.body.removeChild(f.zoomed),
                  f.zoomedHd && document.body.removeChild(f.zoomedHd),
                  document.body.removeChild(d),
                  f.zoomed.classList.remove('medium-zoom-image--opened'),
                  f.template && document.body.removeChild(f.template),
                  (u = !1),
                  f.zoomed.removeEventListener('transitionend', e),
                  f.original.dispatchEvent(
                    Wc('medium-zoom:closed', { detail: { zoom: B } }),
                  ),
                  (f.original = null),
                  (f.zoomed = null),
                  (f.zoomedHd = null),
                  (f.template = null),
                  A(B))
              }))
          } else A(B)
        })
      },
      s = function () {
        var A = (
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {}
        ).target
        return f.original ? o() : i({ target: A })
      },
      a = [],
      c = [],
      u = !1,
      l = 0,
      h = t,
      f = { original: null, zoomed: null, zoomedHd: null, template: null }
    '[object Object]' === Object.prototype.toString.call(e)
      ? (h = e)
      : (e || 'string' == typeof e) && n(e)
    var d = (function (A) {
      var e = document.createElement('div')
      return (
        e.classList.add('medium-zoom-overlay'),
        (e.style.background = A),
        e
      )
    })(
      (h = Pc(
        {
          margin: 0,
          background: '#fff',
          scrollOffset: 40,
          container: null,
          template: null,
        },
        h,
      )).background,
    )
    ;(document.addEventListener('click', function (A) {
      var e = A.target
      e !== d ? -1 !== a.indexOf(e) && s({ target: e }) : o()
    }),
      document.addEventListener('keyup', function (A) {
        var e = A.key || A.keyCode
        ;('Escape' !== e && 'Esc' !== e && 27 !== e) || o()
      }),
      document.addEventListener('scroll', function () {
        if (!u && f.original) {
          var A =
            window.pageYOffset ||
            document.documentElement.scrollTop ||
            document.body.scrollTop ||
            0
          Math.abs(l - A) > h.scrollOffset && setTimeout(o, 150)
        }
      }),
      window.addEventListener('resize', o))
    var B = {
      open: i,
      close: o,
      toggle: s,
      update: function () {
        var A =
            arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
          e = A
        if (
          (A.background && (d.style.background = A.background),
          A.container &&
            A.container instanceof Object &&
            (e.container = Pc({}, h.container, A.container)),
          A.template)
        ) {
          var t = Gc(A.template)
            ? A.template
            : document.querySelector(A.template)
          e.template = t
        }
        return (
          (h = Pc({}, h, e)),
          a.forEach(function (A) {
            A.dispatchEvent(Wc('medium-zoom:update', { detail: { zoom: B } }))
          }),
          B
        )
      },
      clone: function () {
        return A(
          Pc(
            {},
            h,
            arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
          ),
        )
      },
      attach: n,
      detach: function () {
        for (var A = arguments.length, e = Array(A), t = 0; t < A; t++)
          e[t] = arguments[t]
        f.zoomed && o()
        var r =
          e.length > 0
            ? e.reduce(function (A, e) {
                return [].concat(A, jc(e))
              }, [])
            : a
        return (
          r.forEach(function (A) {
            ;(A.classList.remove('medium-zoom-image'),
              A.dispatchEvent(
                Wc('medium-zoom:detach', { detail: { zoom: B } }),
              ))
          }),
          (a = a.filter(function (A) {
            return -1 === r.indexOf(A)
          })),
          B
        )
      },
      on: function (A, e) {
        var t =
          arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {}
        return (
          a.forEach(function (r) {
            r.addEventListener('medium-zoom:' + A, e, t)
          }),
          c.push({ type: 'medium-zoom:' + A, listener: e, options: t }),
          B
        )
      },
      off: function (A, e) {
        var t =
          arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {}
        return (
          a.forEach(function (r) {
            r.removeEventListener('medium-zoom:' + A, e, t)
          }),
          (c = c.filter(function (t) {
            return !(
              t.type === 'medium-zoom:' + A &&
              t.listener.toString() === e.toString()
            )
          })),
          B
        )
      },
      getOptions: function () {
        return h
      },
      getImages: function () {
        return a
      },
      getZoomedImage: function () {
        return f.original
      },
    }
    return B
  }
!(function (A, e) {
  void 0 === e && (e = {})
  var t = e.insertAt
  if ('undefined' != typeof document) {
    var r = document.head || document.getElementsByTagName('head')[0],
      n = document.createElement('style')
    ;((n.type = 'text/css'),
      'top' === t && r.firstChild
        ? r.insertBefore(n, r.firstChild)
        : r.appendChild(n),
      n.styleSheet
        ? (n.styleSheet.cssText = A)
        : n.appendChild(document.createTextNode(A)))
  }
})(
  '.medium-zoom-overlay{position:fixed;top:0;right:0;bottom:0;left:0;opacity:0;transition:opacity .3s;will-change:opacity}.medium-zoom--opened .medium-zoom-overlay{cursor:pointer;cursor:zoom-out;opacity:1}.medium-zoom-image{cursor:pointer;cursor:zoom-in;transition:transform .3s cubic-bezier(.2,0,.2,1)!important}.medium-zoom-image--hidden{visibility:hidden}.medium-zoom-image--opened{position:relative;cursor:pointer;cursor:zoom-out;will-change:transform}',
)
var Xc = { exports: {} }
'undefined' != typeof self && self
const Jc = ni(
    (Xc.exports = async function (A) {
      if ('string' == typeof A) {
        if (window.isSecureContext && navigator.clipboard)
          return await navigator.clipboard.writeText(A)
        {
          const e = document.createElement('textarea')
          let t = !1
          if (
            ((e.value = A),
            (e.style.position = 'fixed'),
            (e.style.opacity = 0),
            (e.style.zIndex = '-10000'),
            (e.style.top = '-10000'),
            document.body.appendChild(e),
            e.select(),
            (t = document.execCommand('copy')),
            document.body.removeChild(e),
            t)
          )
            return
          throw new Error('Failed to copy content via "execCommand"!')
        }
      }
    }),
  ),
  Yc = {}
function Zc(A, e) {
  'string' != typeof e && (e = Zc.defaultChars)
  const t = (function (A) {
    let e = Yc[A]
    if (e) return e
    e = Yc[A] = []
    for (let t = 0; t < 128; t++) {
      const A = String.fromCharCode(t)
      e.push(A)
    }
    for (let t = 0; t < A.length; t++) {
      const r = A.charCodeAt(t)
      e[r] = '%' + ('0' + r.toString(16).toUpperCase()).slice(-2)
    }
    return e
  })(e)
  return A.replace(/(%[a-f0-9]{2})+/gi, function (A) {
    let e = ''
    for (let r = 0, n = A.length; r < n; r += 3) {
      const i = parseInt(A.slice(r + 1, r + 3), 16)
      if (i < 128) e += t[i]
      else {
        if (192 == (224 & i) && r + 3 < n) {
          const t = parseInt(A.slice(r + 4, r + 6), 16)
          if (128 == (192 & t)) {
            const A = ((i << 6) & 1984) | (63 & t)
            ;((e += A < 128 ? '��' : String.fromCharCode(A)), (r += 3))
            continue
          }
        }
        if (224 == (240 & i) && r + 6 < n) {
          const t = parseInt(A.slice(r + 4, r + 6), 16),
            n = parseInt(A.slice(r + 7, r + 9), 16)
          if (128 == (192 & t) && 128 == (192 & n)) {
            const A = ((i << 12) & 61440) | ((t << 6) & 4032) | (63 & n)
            ;((e +=
              A < 2048 || (A >= 55296 && A <= 57343)
                ? '���'
                : String.fromCharCode(A)),
              (r += 6))
            continue
          }
        }
        if (240 == (248 & i) && r + 9 < n) {
          const t = parseInt(A.slice(r + 4, r + 6), 16),
            n = parseInt(A.slice(r + 7, r + 9), 16),
            o = parseInt(A.slice(r + 10, r + 12), 16)
          if (128 == (192 & t) && 128 == (192 & n) && 128 == (192 & o)) {
            let A =
              ((i << 18) & 1835008) |
              ((t << 12) & 258048) |
              ((n << 6) & 4032) |
              (63 & o)
            ;(A < 65536 || A > 1114111
              ? (e += '����')
              : ((A -= 65536),
                (e += String.fromCharCode(
                  55296 + (A >> 10),
                  56320 + (1023 & A),
                ))),
              (r += 9))
            continue
          }
        }
        e += '�'
      }
    }
    return e
  })
}
;((Zc.defaultChars = ';/?:@&=+$,#'), (Zc.componentChars = ''))
const $c = {}
function Au(A, e, t) {
  ;('string' != typeof e && ((t = e), (e = Au.defaultChars)),
    void 0 === t && (t = !0))
  const r = (function (A) {
    let e = $c[A]
    if (e) return e
    e = $c[A] = []
    for (let t = 0; t < 128; t++) {
      const A = String.fromCharCode(t)
      ;/^[0-9a-z]$/i.test(A)
        ? e.push(A)
        : e.push('%' + ('0' + t.toString(16).toUpperCase()).slice(-2))
    }
    for (let t = 0; t < A.length; t++) e[A.charCodeAt(t)] = A[t]
    return e
  })(e)
  let n = ''
  for (let i = 0, o = A.length; i < o; i++) {
    const e = A.charCodeAt(i)
    if (
      t &&
      37 === e &&
      i + 2 < o &&
      /^[0-9a-f]{2}$/i.test(A.slice(i + 1, i + 3))
    )
      ((n += A.slice(i, i + 3)), (i += 2))
    else if (e < 128) n += r[e]
    else if (e >= 55296 && e <= 57343) {
      if (e >= 55296 && e <= 56319 && i + 1 < o) {
        const e = A.charCodeAt(i + 1)
        if (e >= 56320 && e <= 57343) {
          ;((n += encodeURIComponent(A[i] + A[i + 1])), i++)
          continue
        }
      }
      n += '%EF%BF%BD'
    } else n += encodeURIComponent(A[i])
  }
  return n
}
function eu(A) {
  let e = ''
  return (
    (e += A.protocol || ''),
    (e += A.slashes ? '//' : ''),
    (e += A.auth ? A.auth + '@' : ''),
    A.hostname && -1 !== A.hostname.indexOf(':')
      ? (e += '[' + A.hostname + ']')
      : (e += A.hostname || ''),
    (e += A.port ? ':' + A.port : ''),
    (e += A.pathname || ''),
    (e += A.search || ''),
    (e += A.hash || ''),
    e
  )
}
function tu() {
  ;((this.protocol = null),
    (this.slashes = null),
    (this.auth = null),
    (this.port = null),
    (this.hostname = null),
    (this.hash = null),
    (this.search = null),
    (this.pathname = null))
}
;((Au.defaultChars = ";/?:@&=+$,-_.!~*'()#"), (Au.componentChars = "-_.!~*'()"))
const ru = /^([a-z0-9.+-]+:)/i,
  nu = /:[0-9]*$/,
  iu = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,
  ou = ['{', '}', '|', '\\', '^', '`'].concat([
    '<',
    '>',
    '"',
    '`',
    ' ',
    '\r',
    '\n',
    '\t',
  ]),
  su = ["'"].concat(ou),
  au = ['%', '/', '?', ';', '#'].concat(su),
  cu = ['/', '?', '#'],
  uu = /^[+a-z0-9A-Z_-]{0,63}$/,
  lu = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
  hu = { javascript: !0, 'javascript:': !0 },
  fu = {
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
function du(A, e) {
  if (A && A instanceof tu) return A
  const t = new tu()
  return (t.parse(A, e), t)
}
;((tu.prototype.parse = function (A, e) {
  let t,
    r,
    n,
    i = A
  if (((i = i.trim()), !e && 1 === A.split('#').length)) {
    const A = iu.exec(i)
    if (A) return ((this.pathname = A[1]), A[2] && (this.search = A[2]), this)
  }
  let o = ru.exec(i)
  if (
    (o &&
      ((o = o[0]),
      (t = o.toLowerCase()),
      (this.protocol = o),
      (i = i.substr(o.length))),
    (e || o || i.match(/^\/\/[^@\/]+@[^@\/]+/)) &&
      ((n = '//' === i.substr(0, 2)),
      !n || (o && hu[o]) || ((i = i.substr(2)), (this.slashes = !0))),
    !hu[o] && (n || (o && !fu[o])))
  ) {
    let A,
      e,
      t = -1
    for (let s = 0; s < cu.length; s++)
      ((r = i.indexOf(cu[s])), -1 !== r && (-1 === t || r < t) && (t = r))
    ;((e = -1 === t ? i.lastIndexOf('@') : i.lastIndexOf('@', t)),
      -1 !== e && ((A = i.slice(0, e)), (i = i.slice(e + 1)), (this.auth = A)),
      (t = -1))
    for (let s = 0; s < au.length; s++)
      ((r = i.indexOf(au[s])), -1 !== r && (-1 === t || r < t) && (t = r))
    ;(-1 === t && (t = i.length), ':' === i[t - 1] && t--)
    const n = i.slice(0, t)
    ;((i = i.slice(t)),
      this.parseHost(n),
      (this.hostname = this.hostname || ''))
    const o =
      '[' === this.hostname[0] &&
      ']' === this.hostname[this.hostname.length - 1]
    if (!o) {
      const A = this.hostname.split(/\./)
      for (let e = 0, t = A.length; e < t; e++) {
        const t = A[e]
        if (t && !t.match(uu)) {
          let r = ''
          for (let A = 0, e = t.length; A < e; A++)
            t.charCodeAt(A) > 127 ? (r += 'x') : (r += t[A])
          if (!r.match(uu)) {
            const r = A.slice(0, e),
              n = A.slice(e + 1),
              o = t.match(lu)
            ;(o && (r.push(o[1]), n.unshift(o[2])),
              n.length && (i = n.join('.') + i),
              (this.hostname = r.join('.')))
            break
          }
        }
      }
    }
    ;(this.hostname.length > 255 && (this.hostname = ''),
      o && (this.hostname = this.hostname.substr(1, this.hostname.length - 2)))
  }
  const s = i.indexOf('#')
  ;-1 !== s && ((this.hash = i.substr(s)), (i = i.slice(0, s)))
  const a = i.indexOf('?')
  return (
    -1 !== a && ((this.search = i.substr(a)), (i = i.slice(0, a))),
    i && (this.pathname = i),
    fu[t] && this.hostname && !this.pathname && (this.pathname = ''),
    this
  )
}),
  (tu.prototype.parseHost = function (A) {
    let e = nu.exec(A)
    ;(e &&
      ((e = e[0]),
      ':' !== e && (this.port = e.substr(1)),
      (A = A.substr(0, A.length - e.length))),
      A && (this.hostname = A))
  }))
const Bu = Object.freeze(
    Object.defineProperty(
      { __proto__: null, decode: Zc, encode: Au, format: eu, parse: du },
      Symbol.toStringTag,
      { value: 'Module' },
    ),
  ),
  pu =
    /[\0-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/,
  gu = /[\0-\x1F\x7F-\x9F]/,
  wu =
    /[!-#%-\*,-\/:;\?@\[-\]_\{\}\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061D-\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1B7D\u1B7E\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4F\u2E52-\u2E5D\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD803[\uDEAD\uDF55-\uDF59\uDF86-\uDF89]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDC4B-\uDC4F\uDC5A\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDEB9\uDF3C-\uDF3E]|\uD806[\uDC3B\uDD44-\uDD46\uDDE2\uDE3F-\uDE46\uDE9A-\uDE9C\uDE9E-\uDEA2\uDF00-\uDF09]|\uD807[\uDC41-\uDC45\uDC70\uDC71\uDEF7\uDEF8\uDF43-\uDF4F\uDFFF]|\uD809[\uDC70-\uDC74]|\uD80B[\uDFF1\uDFF2]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD81B[\uDE97-\uDE9A\uDFE2]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD83A[\uDD5E\uDD5F]/,
  mu =
    /[\$\+<->\^`\|~\xA2-\xA6\xA8\xA9\xAC\xAE-\xB1\xB4\xB8\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u02FF\u0375\u0384\u0385\u03F6\u0482\u058D-\u058F\u0606-\u0608\u060B\u060E\u060F\u06DE\u06E9\u06FD\u06FE\u07F6\u07FE\u07FF\u0888\u09F2\u09F3\u09FA\u09FB\u0AF1\u0B70\u0BF3-\u0BFA\u0C7F\u0D4F\u0D79\u0E3F\u0F01-\u0F03\u0F13\u0F15-\u0F17\u0F1A-\u0F1F\u0F34\u0F36\u0F38\u0FBE-\u0FC5\u0FC7-\u0FCC\u0FCE\u0FCF\u0FD5-\u0FD8\u109E\u109F\u1390-\u1399\u166D\u17DB\u1940\u19DE-\u19FF\u1B61-\u1B6A\u1B74-\u1B7C\u1FBD\u1FBF-\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED-\u1FEF\u1FFD\u1FFE\u2044\u2052\u207A-\u207C\u208A-\u208C\u20A0-\u20C0\u2100\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F\u218A\u218B\u2190-\u2307\u230C-\u2328\u232B-\u2426\u2440-\u244A\u249C-\u24E9\u2500-\u2767\u2794-\u27C4\u27C7-\u27E5\u27F0-\u2982\u2999-\u29D7\u29DC-\u29FB\u29FE-\u2B73\u2B76-\u2B95\u2B97-\u2BFF\u2CE5-\u2CEA\u2E50\u2E51\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFF\u3004\u3012\u3013\u3020\u3036\u3037\u303E\u303F\u309B\u309C\u3190\u3191\u3196-\u319F\u31C0-\u31E3\u31EF\u3200-\u321E\u322A-\u3247\u3250\u3260-\u327F\u328A-\u32B0\u32C0-\u33FF\u4DC0-\u4DFF\uA490-\uA4C6\uA700-\uA716\uA720\uA721\uA789\uA78A\uA828-\uA82B\uA836-\uA839\uAA77-\uAA79\uAB5B\uAB6A\uAB6B\uFB29\uFBB2-\uFBC2\uFD40-\uFD4F\uFDCF\uFDFC-\uFDFF\uFE62\uFE64-\uFE66\uFE69\uFF04\uFF0B\uFF1C-\uFF1E\uFF3E\uFF40\uFF5C\uFF5E\uFFE0-\uFFE6\uFFE8-\uFFEE\uFFFC\uFFFD]|\uD800[\uDD37-\uDD3F\uDD79-\uDD89\uDD8C-\uDD8E\uDD90-\uDD9C\uDDA0\uDDD0-\uDDFC]|\uD802[\uDC77\uDC78\uDEC8]|\uD805\uDF3F|\uD807[\uDFD5-\uDFF1]|\uD81A[\uDF3C-\uDF3F\uDF45]|\uD82F\uDC9C|\uD833[\uDF50-\uDFC3]|\uD834[\uDC00-\uDCF5\uDD00-\uDD26\uDD29-\uDD64\uDD6A-\uDD6C\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDDEA\uDE00-\uDE41\uDE45\uDF00-\uDF56]|\uD835[\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3]|\uD836[\uDC00-\uDDFF\uDE37-\uDE3A\uDE6D-\uDE74\uDE76-\uDE83\uDE85\uDE86]|\uD838[\uDD4F\uDEFF]|\uD83B[\uDCAC\uDCB0\uDD2E\uDEF0\uDEF1]|\uD83C[\uDC00-\uDC2B\uDC30-\uDC93\uDCA0-\uDCAE\uDCB1-\uDCBF\uDCC1-\uDCCF\uDCD1-\uDCF5\uDD0D-\uDDAD\uDDE6-\uDE02\uDE10-\uDE3B\uDE40-\uDE48\uDE50\uDE51\uDE60-\uDE65\uDF00-\uDFFF]|\uD83D[\uDC00-\uDED7\uDEDC-\uDEEC\uDEF0-\uDEFC\uDF00-\uDF76\uDF7B-\uDFD9\uDFE0-\uDFEB\uDFF0]|\uD83E[\uDC00-\uDC0B\uDC10-\uDC47\uDC50-\uDC59\uDC60-\uDC87\uDC90-\uDCAD\uDCB0\uDCB1\uDD00-\uDE53\uDE60-\uDE6D\uDE70-\uDE7C\uDE80-\uDE88\uDE90-\uDEBD\uDEBF-\uDEC5\uDECE-\uDEDB\uDEE0-\uDEE8\uDEF0-\uDEF8\uDF00-\uDF92\uDF94-\uDFCA]/,
  Cu = /[ \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/,
  yu = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        Any: pu,
        Cc: gu,
        Cf: /[\xAD\u0600-\u0605\u061C\u06DD\u070F\u0890\u0891\u08E2\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]|\uD804[\uDCBD\uDCCD]|\uD80D[\uDC30-\uDC3F]|\uD82F[\uDCA0-\uDCA3]|\uD834[\uDD73-\uDD7A]|\uDB40[\uDC01\uDC20-\uDC7F]/,
        P: wu,
        S: mu,
        Z: Cu,
      },
      Symbol.toStringTag,
      { value: 'Module' },
    ),
  ),
  Qu = new Uint16Array(
    'ᵁ<Õıʊҝջאٵ۞ޢߖࠏ੊ઑඡ๭༉༦჊ረዡᐕᒝᓃᓟᔥ\0\0\0\0\0\0ᕫᛍᦍᰒᷝ὾⁠↰⊍⏀⏻⑂⠤⤒ⴈ⹈⿎〖㊺㘹㞬㣾㨨㩱㫠㬮ࠀEMabcfglmnoprstu\\bfms¦³¹ÈÏlig耻Æ䃆P耻&䀦cute耻Á䃁reve;䄂Āiyx}rc耻Â䃂;䐐r;쀀𝔄rave耻À䃀pha;䎑acr;䄀d;橓Āgp¡on;䄄f;쀀𝔸plyFunction;恡ing耻Å䃅Ācs¾Ãr;쀀𝒜ign;扔ilde耻Ã䃃ml耻Ä䃄ЀaceforsuåûþėĜĢħĪĀcrêòkslash;或Ŷöø;櫧ed;挆y;䐑ƀcrtąċĔause;戵noullis;愬a;䎒r;쀀𝔅pf;쀀𝔹eve;䋘còēmpeq;扎܀HOacdefhilorsuōőŖƀƞƢƵƷƺǜȕɳɸɾcy;䐧PY耻©䂩ƀcpyŝŢźute;䄆Ā;iŧŨ拒talDifferentialD;慅leys;愭ȀaeioƉƎƔƘron;䄌dil耻Ç䃇rc;䄈nint;戰ot;䄊ĀdnƧƭilla;䂸terDot;䂷òſi;䎧rcleȀDMPTǇǋǑǖot;抙inus;抖lus;投imes;抗oĀcsǢǸkwiseContourIntegral;戲eCurlyĀDQȃȏoubleQuote;思uote;怙ȀlnpuȞȨɇɕonĀ;eȥȦ户;橴ƀgitȯȶȺruent;扡nt;戯ourIntegral;戮ĀfrɌɎ;愂oduct;成nterClockwiseContourIntegral;戳oss;樯cr;쀀𝒞pĀ;Cʄʅ拓ap;才րDJSZacefiosʠʬʰʴʸˋ˗ˡ˦̳ҍĀ;oŹʥtrahd;椑cy;䐂cy;䐅cy;䐏ƀgrsʿ˄ˇger;怡r;憡hv;櫤Āayː˕ron;䄎;䐔lĀ;t˝˞戇a;䎔r;쀀𝔇Āaf˫̧Ācm˰̢riticalȀADGT̖̜̀̆cute;䂴oŴ̋̍;䋙bleAcute;䋝rave;䁠ilde;䋜ond;拄ferentialD;慆Ѱ̽\0\0\0͔͂\0Ѕf;쀀𝔻ƀ;DE͈͉͍䂨ot;惜qual;扐blèCDLRUVͣͲ΂ϏϢϸontourIntegraìȹoɴ͹\0\0ͻ»͉nArrow;懓Āeo·ΤftƀARTΐΖΡrrow;懐ightArrow;懔eåˊngĀLRΫτeftĀARγιrrow;柸ightArrow;柺ightArrow;柹ightĀATϘϞrrow;懒ee;抨pɁϩ\0\0ϯrrow;懑ownArrow;懕erticalBar;戥ǹABLRTaВЪаўѿͼrrowƀ;BUНОТ憓ar;椓pArrow;懵reve;䌑eft˒к\0ц\0ѐightVector;楐eeVector;楞ectorĀ;Bљњ憽ar;楖ightǔѧ\0ѱeeVector;楟ectorĀ;BѺѻ懁ar;楗eeĀ;A҆҇护rrow;憧ĀctҒҗr;쀀𝒟rok;䄐ࠀNTacdfglmopqstuxҽӀӄӋӞӢӧӮӵԡԯԶՒ՝ՠեG;䅊H耻Ð䃐cute耻É䃉ƀaiyӒӗӜron;䄚rc耻Ê䃊;䐭ot;䄖r;쀀𝔈rave耻È䃈ement;戈ĀapӺӾcr;䄒tyɓԆ\0\0ԒmallSquare;旻erySmallSquare;斫ĀgpԦԪon;䄘f;쀀𝔼silon;䎕uĀaiԼՉlĀ;TՂՃ橵ilde;扂librium;懌Āci՗՚r;愰m;橳a;䎗ml耻Ë䃋Āipժկsts;戃onentialE;慇ʀcfiosօֈ֍ֲ׌y;䐤r;쀀𝔉lledɓ֗\0\0֣mallSquare;旼erySmallSquare;斪Ͱֺ\0ֿ\0\0ׄf;쀀𝔽All;戀riertrf;愱cò׋؀JTabcdfgorstר׬ׯ׺؀ؒؖ؛؝أ٬ٲcy;䐃耻>䀾mmaĀ;d׷׸䎓;䏜reve;䄞ƀeiy؇،ؐdil;䄢rc;䄜;䐓ot;䄠r;쀀𝔊;拙pf;쀀𝔾eater̀EFGLSTصلَٖٛ٦qualĀ;Lؾؿ扥ess;招ullEqual;执reater;檢ess;扷lantEqual;橾ilde;扳cr;쀀𝒢;扫ЀAacfiosuڅڋږڛڞڪھۊRDcy;䐪Āctڐڔek;䋇;䁞irc;䄤r;愌lbertSpace;愋ǰگ\0ڲf;愍izontalLine;攀Āctۃۅòکrok;䄦mpńېۘownHumðįqual;扏܀EJOacdfgmnostuۺ۾܃܇܎ܚܞܡܨ݄ݸދޏޕcy;䐕lig;䄲cy;䐁cute耻Í䃍Āiyܓܘrc耻Î䃎;䐘ot;䄰r;愑rave耻Ì䃌ƀ;apܠܯܿĀcgܴܷr;䄪inaryI;慈lieóϝǴ݉\0ݢĀ;eݍݎ戬Āgrݓݘral;戫section;拂isibleĀCTݬݲomma;恣imes;恢ƀgptݿރވon;䄮f;쀀𝕀a;䎙cr;愐ilde;䄨ǫޚ\0ޞcy;䐆l耻Ï䃏ʀcfosuެ޷޼߂ߐĀiyޱ޵rc;䄴;䐙r;쀀𝔍pf;쀀𝕁ǣ߇\0ߌr;쀀𝒥rcy;䐈kcy;䐄΀HJacfosߤߨ߽߬߱ࠂࠈcy;䐥cy;䐌ppa;䎚Āey߶߻dil;䄶;䐚r;쀀𝔎pf;쀀𝕂cr;쀀𝒦րJTaceflmostࠥࠩࠬࡐࡣ঳সে্਷ੇcy;䐉耻<䀼ʀcmnpr࠷࠼ࡁࡄࡍute;䄹bda;䎛g;柪lacetrf;愒r;憞ƀaeyࡗ࡜ࡡron;䄽dil;䄻;䐛Āfsࡨ॰tԀACDFRTUVarࡾࢩࢱࣦ࣠ࣼयज़ΐ४Ānrࢃ࢏gleBracket;柨rowƀ;BR࢙࢚࢞憐ar;懤ightArrow;懆eiling;挈oǵࢷ\0ࣃbleBracket;柦nǔࣈ\0࣒eeVector;楡ectorĀ;Bࣛࣜ懃ar;楙loor;挊ightĀAV࣯ࣵrrow;憔ector;楎Āerँगeƀ;AVउऊऐ抣rrow;憤ector;楚iangleƀ;BEतथऩ抲ar;槏qual;抴pƀDTVषूौownVector;楑eeVector;楠ectorĀ;Bॖॗ憿ar;楘ectorĀ;B॥०憼ar;楒ightáΜs̀EFGLSTॾঋকঝঢভqualGreater;拚ullEqual;扦reater;扶ess;檡lantEqual;橽ilde;扲r;쀀𝔏Ā;eঽা拘ftarrow;懚idot;䄿ƀnpw৔ਖਛgȀLRlr৞৷ਂਐeftĀAR০৬rrow;柵ightArrow;柷ightArrow;柶eftĀarγਊightáοightáϊf;쀀𝕃erĀLRਢਬeftArrow;憙ightArrow;憘ƀchtਾੀੂòࡌ;憰rok;䅁;扪Ѐacefiosuਗ਼੝੠੷੼અઋ઎p;椅y;䐜Ādl੥੯iumSpace;恟lintrf;愳r;쀀𝔐nusPlus;戓pf;쀀𝕄cò੶;䎜ҀJacefostuણધભીଔଙඑ඗ඞcy;䐊cute;䅃ƀaey઴હાron;䅇dil;䅅;䐝ƀgswે૰଎ativeƀMTV૓૟૨ediumSpace;怋hiĀcn૦૘ë૙eryThiî૙tedĀGL૸ଆreaterGreateòٳessLesóੈLine;䀊r;쀀𝔑ȀBnptଢନଷ଺reak;恠BreakingSpace;䂠f;愕ڀ;CDEGHLNPRSTV୕ୖ୪୼஡௫ఄ౞಄ದ೘ൡඅ櫬Āou୛୤ngruent;扢pCap;扭oubleVerticalBar;戦ƀlqxஃஊ஛ement;戉ualĀ;Tஒஓ扠ilde;쀀≂̸ists;戄reater΀;EFGLSTஶஷ஽௉௓௘௥扯qual;扱ullEqual;쀀≧̸reater;쀀≫̸ess;批lantEqual;쀀⩾̸ilde;扵umpń௲௽ownHump;쀀≎̸qual;쀀≏̸eĀfsఊధtTriangleƀ;BEచఛడ拪ar;쀀⧏̸qual;括s̀;EGLSTవశ఼ౄోౘ扮qual;扰reater;扸ess;쀀≪̸lantEqual;쀀⩽̸ilde;扴estedĀGL౨౹reaterGreater;쀀⪢̸essLess;쀀⪡̸recedesƀ;ESಒಓಛ技qual;쀀⪯̸lantEqual;拠ĀeiಫಹverseElement;戌ghtTriangleƀ;BEೋೌ೒拫ar;쀀⧐̸qual;拭ĀquೝഌuareSuĀbp೨೹setĀ;E೰ೳ쀀⊏̸qual;拢ersetĀ;Eഃആ쀀⊐̸qual;拣ƀbcpഓതൎsetĀ;Eഛഞ쀀⊂⃒qual;抈ceedsȀ;ESTലള഻െ抁qual;쀀⪰̸lantEqual;拡ilde;쀀≿̸ersetĀ;E൘൛쀀⊃⃒qual;抉ildeȀ;EFT൮൯൵ൿ扁qual;扄ullEqual;扇ilde;扉erticalBar;戤cr;쀀𝒩ilde耻Ñ䃑;䎝܀Eacdfgmoprstuvලෂ෉෕ෛ෠෧෼ขภยา฿ไlig;䅒cute耻Ó䃓Āiy෎ීrc耻Ô䃔;䐞blac;䅐r;쀀𝔒rave耻Ò䃒ƀaei෮ෲ෶cr;䅌ga;䎩cron;䎟pf;쀀𝕆enCurlyĀDQฎบoubleQuote;怜uote;怘;橔Āclวฬr;쀀𝒪ash耻Ø䃘iŬื฼de耻Õ䃕es;樷ml耻Ö䃖erĀBP๋๠Āar๐๓r;怾acĀek๚๜;揞et;掴arenthesis;揜Ҁacfhilors๿ງຊຏຒດຝະ໼rtialD;戂y;䐟r;쀀𝔓i;䎦;䎠usMinus;䂱Āipຢອncareplanåڝf;愙Ȁ;eio຺ູ໠໤檻cedesȀ;EST່້໏໚扺qual;檯lantEqual;扼ilde;找me;怳Ādp໩໮uct;戏ortionĀ;aȥ໹l;戝Āci༁༆r;쀀𝒫;䎨ȀUfos༑༖༛༟OT耻"䀢r;쀀𝔔pf;愚cr;쀀𝒬؀BEacefhiorsu༾གྷཇའཱིྦྷྪྭ႖ႩႴႾarr;椐G耻®䂮ƀcnrཎནབute;䅔g;柫rĀ;tཛྷཝ憠l;椖ƀaeyཧཬཱron;䅘dil;䅖;䐠Ā;vླྀཹ愜erseĀEUྂྙĀlq྇ྎement;戋uilibrium;懋pEquilibrium;楯r»ཹo;䎡ghtЀACDFTUVa࿁࿫࿳ဢဨၛႇϘĀnr࿆࿒gleBracket;柩rowƀ;BL࿜࿝࿡憒ar;懥eftArrow;懄eiling;按oǵ࿹\0စbleBracket;柧nǔည\0နeeVector;楝ectorĀ;Bဝသ懂ar;楕loor;挋Āerိ၃eƀ;AVဵံြ抢rrow;憦ector;楛iangleƀ;BEၐၑၕ抳ar;槐qual;抵pƀDTVၣၮၸownVector;楏eeVector;楜ectorĀ;Bႂႃ憾ar;楔ectorĀ;B႑႒懀ar;楓Āpuႛ႞f;愝ndImplies;楰ightarrow;懛ĀchႹႼr;愛;憱leDelayed;槴ڀHOacfhimoqstuფჱჷჽᄙᄞᅑᅖᅡᅧᆵᆻᆿĀCcჩხHcy;䐩y;䐨FTcy;䐬cute;䅚ʀ;aeiyᄈᄉᄎᄓᄗ檼ron;䅠dil;䅞rc;䅜;䐡r;쀀𝔖ortȀDLRUᄪᄴᄾᅉownArrow»ОeftArrow»࢚ightArrow»࿝pArrow;憑gma;䎣allCircle;战pf;쀀𝕊ɲᅭ\0\0ᅰt;戚areȀ;ISUᅻᅼᆉᆯ斡ntersection;抓uĀbpᆏᆞsetĀ;Eᆗᆘ抏qual;抑ersetĀ;Eᆨᆩ抐qual;抒nion;抔cr;쀀𝒮ar;拆ȀbcmpᇈᇛሉላĀ;sᇍᇎ拐etĀ;Eᇍᇕqual;抆ĀchᇠህeedsȀ;ESTᇭᇮᇴᇿ扻qual;檰lantEqual;扽ilde;承Tháྌ;我ƀ;esሒሓሣ拑rsetĀ;Eሜም抃qual;抇et»ሓրHRSacfhiorsሾቄ቉ቕ቞ቱቶኟዂወዑORN耻Þ䃞ADE;愢ĀHc቎ቒcy;䐋y;䐦Ābuቚቜ;䀉;䎤ƀaeyብቪቯron;䅤dil;䅢;䐢r;쀀𝔗Āeiቻ኉ǲኀ\0ኇefore;戴a;䎘Ācn኎ኘkSpace;쀀  Space;怉ldeȀ;EFTካኬኲኼ戼qual;扃ullEqual;扅ilde;扈pf;쀀𝕋ipleDot;惛Āctዖዛr;쀀𝒯rok;䅦ૡዷጎጚጦ\0ጬጱ\0\0\0\0\0ጸጽ፷ᎅ\0᏿ᐄᐊᐐĀcrዻጁute耻Ú䃚rĀ;oጇገ憟cir;楉rǣጓ\0጖y;䐎ve;䅬Āiyጞጣrc耻Û䃛;䐣blac;䅰r;쀀𝔘rave耻Ù䃙acr;䅪Ādiፁ፩erĀBPፈ፝Āarፍፐr;䁟acĀekፗፙ;揟et;掵arenthesis;揝onĀ;P፰፱拃lus;抎Āgp፻፿on;䅲f;쀀𝕌ЀADETadps᎕ᎮᎸᏄϨᏒᏗᏳrrowƀ;BDᅐᎠᎤar;椒ownArrow;懅ownArrow;憕quilibrium;楮eeĀ;AᏋᏌ报rrow;憥ownáϳerĀLRᏞᏨeftArrow;憖ightArrow;憗iĀ;lᏹᏺ䏒on;䎥ing;䅮cr;쀀𝒰ilde;䅨ml耻Ü䃜ҀDbcdefosvᐧᐬᐰᐳᐾᒅᒊᒐᒖash;披ar;櫫y;䐒ashĀ;lᐻᐼ抩;櫦Āerᑃᑅ;拁ƀbtyᑌᑐᑺar;怖Ā;iᑏᑕcalȀBLSTᑡᑥᑪᑴar;戣ine;䁼eparator;杘ilde;所ThinSpace;怊r;쀀𝔙pf;쀀𝕍cr;쀀𝒱dash;抪ʀcefosᒧᒬᒱᒶᒼirc;䅴dge;拀r;쀀𝔚pf;쀀𝕎cr;쀀𝒲Ȁfiosᓋᓐᓒᓘr;쀀𝔛;䎞pf;쀀𝕏cr;쀀𝒳ҀAIUacfosuᓱᓵᓹᓽᔄᔏᔔᔚᔠcy;䐯cy;䐇cy;䐮cute耻Ý䃝Āiyᔉᔍrc;䅶;䐫r;쀀𝔜pf;쀀𝕐cr;쀀𝒴ml;䅸ЀHacdefosᔵᔹᔿᕋᕏᕝᕠᕤcy;䐖cute;䅹Āayᕄᕉron;䅽;䐗ot;䅻ǲᕔ\0ᕛoWidtè૙a;䎖r;愨pf;愤cr;쀀𝒵௡ᖃᖊᖐ\0ᖰᖶᖿ\0\0\0\0ᗆᗛᗫᙟ᙭\0ᚕ᚛ᚲᚹ\0ᚾcute耻á䃡reve;䄃̀;Ediuyᖜᖝᖡᖣᖨᖭ戾;쀀∾̳;房rc耻â䃢te肻´̆;䐰lig耻æ䃦Ā;r²ᖺ;쀀𝔞rave耻à䃠ĀepᗊᗖĀfpᗏᗔsym;愵èᗓha;䎱ĀapᗟcĀclᗤᗧr;䄁g;樿ɤᗰ\0\0ᘊʀ;adsvᗺᗻᗿᘁᘇ戧nd;橕;橜lope;橘;橚΀;elmrszᘘᘙᘛᘞᘿᙏᙙ戠;榤e»ᘙsdĀ;aᘥᘦ戡ѡᘰᘲᘴᘶᘸᘺᘼᘾ;榨;榩;榪;榫;榬;榭;榮;榯tĀ;vᙅᙆ戟bĀ;dᙌᙍ抾;榝Āptᙔᙗh;戢»¹arr;捼Āgpᙣᙧon;䄅f;쀀𝕒΀;Eaeiop዁ᙻᙽᚂᚄᚇᚊ;橰cir;橯;扊d;手s;䀧roxĀ;e዁ᚒñᚃing耻å䃥ƀctyᚡᚦᚨr;쀀𝒶;䀪mpĀ;e዁ᚯñʈilde耻ã䃣ml耻ä䃤Āciᛂᛈoninôɲnt;樑ࠀNabcdefiklnoprsu᛭ᛱᜰ᜼ᝃᝈ᝸᝽០៦ᠹᡐᜍ᤽᥈ᥰot;櫭Ācrᛶ᜞kȀcepsᜀᜅᜍᜓong;扌psilon;䏶rime;怵imĀ;e᜚᜛戽q;拍Ŷᜢᜦee;抽edĀ;gᜬᜭ挅e»ᜭrkĀ;t፜᜷brk;掶Āoyᜁᝁ;䐱quo;怞ʀcmprtᝓ᝛ᝡᝤᝨausĀ;eĊĉptyv;榰séᜌnoõēƀahwᝯ᝱ᝳ;䎲;愶een;扬r;쀀𝔟g΀costuvwឍឝឳេ៕៛៞ƀaiuបពរðݠrc;旯p»፱ƀdptឤឨឭot;樀lus;樁imes;樂ɱឹ\0\0ើcup;樆ar;昅riangleĀdu៍្own;施p;斳plus;樄eåᑄåᒭarow;植ƀako៭ᠦᠵĀcn៲ᠣkƀlst៺֫᠂ozenge;槫riangleȀ;dlr᠒᠓᠘᠝斴own;斾eft;旂ight;斸k;搣Ʊᠫ\0ᠳƲᠯ\0ᠱ;斒;斑4;斓ck;斈ĀeoᠾᡍĀ;qᡃᡆ쀀=⃥uiv;쀀≡⃥t;挐Ȁptwxᡙᡞᡧᡬf;쀀𝕓Ā;tᏋᡣom»Ꮜtie;拈؀DHUVbdhmptuvᢅᢖᢪᢻᣗᣛᣬ᣿ᤅᤊᤐᤡȀLRlrᢎᢐᢒᢔ;敗;敔;敖;敓ʀ;DUduᢡᢢᢤᢦᢨ敐;敦;敩;敤;敧ȀLRlrᢳᢵᢷᢹ;敝;敚;敜;教΀;HLRhlrᣊᣋᣍᣏᣑᣓᣕ救;敬;散;敠;敫;敢;敟ox;槉ȀLRlrᣤᣦᣨᣪ;敕;敒;攐;攌ʀ;DUduڽ᣷᣹᣻᣽;敥;敨;攬;攴inus;抟lus;択imes;抠ȀLRlrᤙᤛᤝ᤟;敛;敘;攘;攔΀;HLRhlrᤰᤱᤳᤵᤷ᤻᤹攂;敪;敡;敞;攼;攤;攜Āevģ᥂bar耻¦䂦Ȁceioᥑᥖᥚᥠr;쀀𝒷mi;恏mĀ;e᜚᜜lƀ;bhᥨᥩᥫ䁜;槅sub;柈Ŭᥴ᥾lĀ;e᥹᥺怢t»᥺pƀ;Eeįᦅᦇ;檮Ā;qۜۛೡᦧ\0᧨ᨑᨕᨲ\0ᨷᩐ\0\0᪴\0\0᫁\0\0ᬡᬮ᭍᭒\0᯽\0ᰌƀcpr᦭ᦲ᧝ute;䄇̀;abcdsᦿᧀᧄ᧊᧕᧙戩nd;橄rcup;橉Āau᧏᧒p;橋p;橇ot;橀;쀀∩︀Āeo᧢᧥t;恁îړȀaeiu᧰᧻ᨁᨅǰ᧵\0᧸s;橍on;䄍dil耻ç䃧rc;䄉psĀ;sᨌᨍ橌m;橐ot;䄋ƀdmnᨛᨠᨦil肻¸ƭptyv;榲t脀¢;eᨭᨮ䂢räƲr;쀀𝔠ƀceiᨽᩀᩍy;䑇ckĀ;mᩇᩈ朓ark»ᩈ;䏇r΀;Ecefms᩟᩠ᩢᩫ᪤᪪᪮旋;槃ƀ;elᩩᩪᩭ䋆q;扗eɡᩴ\0\0᪈rrowĀlr᩼᪁eft;憺ight;憻ʀRSacd᪒᪔᪖᪚᪟»ཇ;擈st;抛irc;抚ash;抝nint;樐id;櫯cir;槂ubsĀ;u᪻᪼晣it»᪼ˬ᫇᫔᫺\0ᬊonĀ;eᫍᫎ䀺Ā;qÇÆɭ᫙\0\0᫢aĀ;t᫞᫟䀬;䁀ƀ;fl᫨᫩᫫戁îᅠeĀmx᫱᫶ent»᫩eóɍǧ᫾\0ᬇĀ;dኻᬂot;橭nôɆƀfryᬐᬔᬗ;쀀𝕔oäɔ脀©;sŕᬝr;愗Āaoᬥᬩrr;憵ss;朗Ācuᬲᬷr;쀀𝒸Ābpᬼ᭄Ā;eᭁᭂ櫏;櫑Ā;eᭉᭊ櫐;櫒dot;拯΀delprvw᭠᭬᭷ᮂᮬᯔ᯹arrĀlr᭨᭪;椸;椵ɰ᭲\0\0᭵r;拞c;拟arrĀ;p᭿ᮀ憶;椽̀;bcdosᮏᮐᮖᮡᮥᮨ截rcap;橈Āauᮛᮞp;橆p;橊ot;抍r;橅;쀀∪︀Ȁalrv᮵ᮿᯞᯣrrĀ;mᮼᮽ憷;椼yƀevwᯇᯔᯘqɰᯎ\0\0ᯒreã᭳uã᭵ee;拎edge;拏en耻¤䂤earrowĀlrᯮ᯳eft»ᮀight»ᮽeäᯝĀciᰁᰇoninôǷnt;戱lcty;挭ঀAHabcdefhijlorstuwz᰸᰻᰿ᱝᱩᱵᲊᲞᲬᲷ᳻᳿ᴍᵻᶑᶫᶻ᷆᷍rò΁ar;楥Ȁglrs᱈ᱍ᱒᱔ger;怠eth;愸òᄳhĀ;vᱚᱛ怐»ऊūᱡᱧarow;椏aã̕Āayᱮᱳron;䄏;䐴ƀ;ao̲ᱼᲄĀgrʿᲁr;懊tseq;橷ƀglmᲑᲔᲘ耻°䂰ta;䎴ptyv;榱ĀirᲣᲨsht;楿;쀀𝔡arĀlrᲳᲵ»ࣜ»သʀaegsv᳂͸᳖᳜᳠mƀ;oș᳊᳔ndĀ;ș᳑uit;晦amma;䏝in;拲ƀ;io᳧᳨᳸䃷de脀÷;o᳧ᳰntimes;拇nø᳷cy;䑒cɯᴆ\0\0ᴊrn;挞op;挍ʀlptuwᴘᴝᴢᵉᵕlar;䀤f;쀀𝕕ʀ;emps̋ᴭᴷᴽᵂqĀ;d͒ᴳot;扑inus;戸lus;戔quare;抡blebarwedgåúnƀadhᄮᵝᵧownarrowóᲃarpoonĀlrᵲᵶefôᲴighôᲶŢᵿᶅkaro÷གɯᶊ\0\0ᶎrn;挟op;挌ƀcotᶘᶣᶦĀryᶝᶡ;쀀𝒹;䑕l;槶rok;䄑Ādrᶰᶴot;拱iĀ;fᶺ᠖斿Āah᷀᷃ròЩaòྦangle;榦Āci᷒ᷕy;䑟grarr;柿ऀDacdefglmnopqrstuxḁḉḙḸոḼṉṡṾấắẽỡἪἷὄ὎὚ĀDoḆᴴoôᲉĀcsḎḔute耻é䃩ter;橮ȀaioyḢḧḱḶron;䄛rĀ;cḭḮ扖耻ê䃪lon;払;䑍ot;䄗ĀDrṁṅot;扒;쀀𝔢ƀ;rsṐṑṗ檚ave耻è䃨Ā;dṜṝ檖ot;檘Ȁ;ilsṪṫṲṴ檙nters;揧;愓Ā;dṹṺ檕ot;檗ƀapsẅẉẗcr;䄓tyƀ;svẒẓẕ戅et»ẓpĀ1;ẝẤĳạả;怄;怅怃ĀgsẪẬ;䅋p;怂ĀgpẴẸon;䄙f;쀀𝕖ƀalsỄỎỒrĀ;sỊị拕l;槣us;橱iƀ;lvỚớở䎵on»ớ;䏵ȀcsuvỪỳἋἣĀioữḱrc»Ḯɩỹ\0\0ỻíՈantĀglἂἆtr»ṝess»Ṻƀaeiἒ἖Ἒls;䀽st;扟vĀ;DȵἠD;橸parsl;槥ĀDaἯἳot;打rr;楱ƀcdiἾὁỸr;愯oô͒ĀahὉὋ;䎷耻ð䃰Āmrὓὗl耻ë䃫o;悬ƀcipὡὤὧl;䀡sôծĀeoὬὴctatioîՙnentialåչৡᾒ\0ᾞ\0ᾡᾧ\0\0ῆῌ\0ΐ\0ῦῪ \0 ⁚llingdotseñṄy;䑄male;晀ƀilrᾭᾳ῁lig;耀ﬃɩᾹ\0\0᾽g;耀ﬀig;耀ﬄ;쀀𝔣lig;耀ﬁlig;쀀fjƀaltῙ῜ῡt;晭ig;耀ﬂns;斱of;䆒ǰ΅\0ῳf;쀀𝕗ĀakֿῷĀ;vῼ´拔;櫙artint;樍Āao‌⁕Ācs‑⁒α‚‰‸⁅⁈\0⁐β•‥‧‪‬\0‮耻½䂽;慓耻¼䂼;慕;慙;慛Ƴ‴\0‶;慔;慖ʴ‾⁁\0\0⁃耻¾䂾;慗;慜5;慘ƶ⁌\0⁎;慚;慝8;慞l;恄wn;挢cr;쀀𝒻ࢀEabcdefgijlnorstv₂₉₟₥₰₴⃰⃵⃺⃿℃ℒℸ̗ℾ⅒↞Ā;lٍ₇;檌ƀcmpₐₕ₝ute;䇵maĀ;dₜ᳚䎳;檆reve;䄟Āiy₪₮rc;䄝;䐳ot;䄡Ȁ;lqsؾق₽⃉ƀ;qsؾٌ⃄lanô٥Ȁ;cdl٥⃒⃥⃕c;檩otĀ;o⃜⃝檀Ā;l⃢⃣檂;檄Ā;e⃪⃭쀀⋛︀s;檔r;쀀𝔤Ā;gٳ؛mel;愷cy;䑓Ȁ;Eajٚℌℎℐ;檒;檥;檤ȀEaesℛℝ℩ℴ;扩pĀ;p℣ℤ檊rox»ℤĀ;q℮ℯ檈Ā;q℮ℛim;拧pf;쀀𝕘Āci⅃ⅆr;愊mƀ;el٫ⅎ⅐;檎;檐茀>;cdlqr׮ⅠⅪⅮⅳⅹĀciⅥⅧ;檧r;橺ot;拗Par;榕uest;橼ʀadelsↄⅪ←ٖ↛ǰ↉\0↎proø₞r;楸qĀlqؿ↖lesó₈ií٫Āen↣↭rtneqq;쀀≩︀Å↪ԀAabcefkosy⇄⇇⇱⇵⇺∘∝∯≨≽ròΠȀilmr⇐⇔⇗⇛rsðᒄf»․ilôکĀdr⇠⇤cy;䑊ƀ;cwࣴ⇫⇯ir;楈;憭ar;意irc;䄥ƀalr∁∎∓rtsĀ;u∉∊晥it»∊lip;怦con;抹r;쀀𝔥sĀew∣∩arow;椥arow;椦ʀamopr∺∾≃≞≣rr;懿tht;戻kĀlr≉≓eftarrow;憩ightarrow;憪f;쀀𝕙bar;怕ƀclt≯≴≸r;쀀𝒽asè⇴rok;䄧Ābp⊂⊇ull;恃hen»ᱛૡ⊣\0⊪\0⊸⋅⋎\0⋕⋳\0\0⋸⌢⍧⍢⍿\0⎆⎪⎴cute耻í䃭ƀ;iyݱ⊰⊵rc耻î䃮;䐸Ācx⊼⊿y;䐵cl耻¡䂡ĀfrΟ⋉;쀀𝔦rave耻ì䃬Ȁ;inoܾ⋝⋩⋮Āin⋢⋦nt;樌t;戭fin;槜ta;愩lig;䄳ƀaop⋾⌚⌝ƀcgt⌅⌈⌗r;䄫ƀelpܟ⌏⌓inåގarôܠh;䄱f;抷ed;䆵ʀ;cfotӴ⌬⌱⌽⍁are;愅inĀ;t⌸⌹戞ie;槝doô⌙ʀ;celpݗ⍌⍐⍛⍡al;抺Āgr⍕⍙eróᕣã⍍arhk;樗rod;樼Ȁcgpt⍯⍲⍶⍻y;䑑on;䄯f;쀀𝕚a;䎹uest耻¿䂿Āci⎊⎏r;쀀𝒾nʀ;EdsvӴ⎛⎝⎡ӳ;拹ot;拵Ā;v⎦⎧拴;拳Ā;iݷ⎮lde;䄩ǫ⎸\0⎼cy;䑖l耻ï䃯̀cfmosu⏌⏗⏜⏡⏧⏵Āiy⏑⏕rc;䄵;䐹r;쀀𝔧ath;䈷pf;쀀𝕛ǣ⏬\0⏱r;쀀𝒿rcy;䑘kcy;䑔Ѐacfghjos␋␖␢␧␭␱␵␻ppaĀ;v␓␔䎺;䏰Āey␛␠dil;䄷;䐺r;쀀𝔨reen;䄸cy;䑅cy;䑜pf;쀀𝕜cr;쀀𝓀஀ABEHabcdefghjlmnoprstuv⑰⒁⒆⒍⒑┎┽╚▀♎♞♥♹♽⚚⚲⛘❝❨➋⟀⠁⠒ƀart⑷⑺⑼rò৆òΕail;椛arr;椎Ā;gঔ⒋;檋ar;楢ॣ⒥\0⒪\0⒱\0\0\0\0\0⒵Ⓔ\0ⓆⓈⓍ\0⓹ute;䄺mptyv;榴raîࡌbda;䎻gƀ;dlࢎⓁⓃ;榑åࢎ;檅uo耻«䂫rЀ;bfhlpst࢙ⓞⓦⓩ⓫⓮⓱⓵Ā;f࢝ⓣs;椟s;椝ë≒p;憫l;椹im;楳l;憢ƀ;ae⓿─┄檫il;椙Ā;s┉┊檭;쀀⪭︀ƀabr┕┙┝rr;椌rk;杲Āak┢┬cĀek┨┪;䁻;䁛Āes┱┳;榋lĀdu┹┻;榏;榍Ȁaeuy╆╋╖╘ron;䄾Ādi═╔il;䄼ìࢰâ┩;䐻Ȁcqrs╣╦╭╽a;椶uoĀ;rนᝆĀdu╲╷har;楧shar;楋h;憲ʀ;fgqs▋▌উ◳◿扤tʀahlrt▘▤▷◂◨rrowĀ;t࢙□aé⓶arpoonĀdu▯▴own»њp»०eftarrows;懇ightƀahs◍◖◞rrowĀ;sࣴࢧarpoonó྘quigarro÷⇰hreetimes;拋ƀ;qs▋ও◺lanôবʀ;cdgsব☊☍☝☨c;檨otĀ;o☔☕橿Ā;r☚☛檁;檃Ā;e☢☥쀀⋚︀s;檓ʀadegs☳☹☽♉♋pproøⓆot;拖qĀgq♃♅ôউgtò⒌ôছiíলƀilr♕࣡♚sht;楼;쀀𝔩Ā;Eজ♣;檑š♩♶rĀdu▲♮Ā;l॥♳;楪lk;斄cy;䑙ʀ;achtੈ⚈⚋⚑⚖rò◁orneòᴈard;楫ri;旺Āio⚟⚤dot;䅀ustĀ;a⚬⚭掰che»⚭ȀEaes⚻⚽⛉⛔;扨pĀ;p⛃⛄檉rox»⛄Ā;q⛎⛏檇Ā;q⛎⚻im;拦Ѐabnoptwz⛩⛴⛷✚✯❁❇❐Ānr⛮⛱g;柬r;懽rëࣁgƀlmr⛿✍✔eftĀar০✇ightá৲apsto;柼ightá৽parrowĀlr✥✩efô⓭ight;憬ƀafl✶✹✽r;榅;쀀𝕝us;樭imes;樴š❋❏st;戗áፎƀ;ef❗❘᠀旊nge»❘arĀ;l❤❥䀨t;榓ʀachmt❳❶❼➅➇ròࢨorneòᶌarĀ;d྘➃;業;怎ri;抿̀achiqt➘➝ੀ➢➮➻quo;怹r;쀀𝓁mƀ;egল➪➬;檍;檏Ābu┪➳oĀ;rฟ➹;怚rok;䅂萀<;cdhilqrࠫ⟒☹⟜⟠⟥⟪⟰Āci⟗⟙;檦r;橹reå◲mes;拉arr;楶uest;橻ĀPi⟵⟹ar;榖ƀ;ef⠀भ᠛旃rĀdu⠇⠍shar;楊har;楦Āen⠗⠡rtneqq;쀀≨︀Å⠞܀Dacdefhilnopsu⡀⡅⢂⢎⢓⢠⢥⢨⣚⣢⣤ઃ⣳⤂Dot;戺Ȁclpr⡎⡒⡣⡽r耻¯䂯Āet⡗⡙;時Ā;e⡞⡟朠se»⡟Ā;sျ⡨toȀ;dluျ⡳⡷⡻owîҌefôएðᏑker;斮Āoy⢇⢌mma;権;䐼ash;怔asuredangle»ᘦr;쀀𝔪o;愧ƀcdn⢯⢴⣉ro耻µ䂵Ȁ;acdᑤ⢽⣀⣄sôᚧir;櫰ot肻·Ƶusƀ;bd⣒ᤃ⣓戒Ā;uᴼ⣘;横ţ⣞⣡p;櫛ò−ðઁĀdp⣩⣮els;抧f;쀀𝕞Āct⣸⣽r;쀀𝓂pos»ᖝƀ;lm⤉⤊⤍䎼timap;抸ఀGLRVabcdefghijlmoprstuvw⥂⥓⥾⦉⦘⧚⧩⨕⨚⩘⩝⪃⪕⪤⪨⬄⬇⭄⭿⮮ⰴⱧⱼ⳩Āgt⥇⥋;쀀⋙̸Ā;v⥐௏쀀≫⃒ƀelt⥚⥲⥶ftĀar⥡⥧rrow;懍ightarrow;懎;쀀⋘̸Ā;v⥻ే쀀≪⃒ightarrow;懏ĀDd⦎⦓ash;抯ash;抮ʀbcnpt⦣⦧⦬⦱⧌la»˞ute;䅄g;쀀∠⃒ʀ;Eiop඄⦼⧀⧅⧈;쀀⩰̸d;쀀≋̸s;䅉roø඄urĀ;a⧓⧔普lĀ;s⧓ସǳ⧟\0⧣p肻 ଷmpĀ;e௹ఀʀaeouy⧴⧾⨃⨐⨓ǰ⧹\0⧻;橃on;䅈dil;䅆ngĀ;dൾ⨊ot;쀀⩭̸p;橂;䐽ash;怓΀;Aadqsxஒ⨩⨭⨻⩁⩅⩐rr;懗rĀhr⨳⨶k;椤Ā;oᏲᏰot;쀀≐̸uiöୣĀei⩊⩎ar;椨í஘istĀ;s஠டr;쀀𝔫ȀEest௅⩦⩹⩼ƀ;qs஼⩭௡ƀ;qs஼௅⩴lanô௢ií௪Ā;rஶ⪁»ஷƀAap⪊⪍⪑rò⥱rr;憮ar;櫲ƀ;svྍ⪜ྌĀ;d⪡⪢拼;拺cy;䑚΀AEadest⪷⪺⪾⫂⫅⫶⫹rò⥦;쀀≦̸rr;憚r;急Ȁ;fqs఻⫎⫣⫯tĀar⫔⫙rro÷⫁ightarro÷⪐ƀ;qs఻⪺⫪lanôౕĀ;sౕ⫴»శiíౝĀ;rవ⫾iĀ;eచథiäඐĀpt⬌⬑f;쀀𝕟膀¬;in⬙⬚⬶䂬nȀ;Edvஉ⬤⬨⬮;쀀⋹̸ot;쀀⋵̸ǡஉ⬳⬵;拷;拶iĀ;vಸ⬼ǡಸ⭁⭃;拾;拽ƀaor⭋⭣⭩rȀ;ast୻⭕⭚⭟lleì୻l;쀀⫽⃥;쀀∂̸lint;樔ƀ;ceಒ⭰⭳uåಥĀ;cಘ⭸Ā;eಒ⭽ñಘȀAait⮈⮋⮝⮧rò⦈rrƀ;cw⮔⮕⮙憛;쀀⤳̸;쀀↝̸ghtarrow»⮕riĀ;eೋೖ΀chimpqu⮽⯍⯙⬄୸⯤⯯Ȁ;cerല⯆ഷ⯉uå൅;쀀𝓃ortɭ⬅\0\0⯖ará⭖mĀ;e൮⯟Ā;q൴൳suĀbp⯫⯭å೸åഋƀbcp⯶ⰑⰙȀ;Ees⯿ⰀഢⰄ抄;쀀⫅̸etĀ;eഛⰋqĀ;qണⰀcĀ;eലⰗñസȀ;EesⰢⰣൟⰧ抅;쀀⫆̸etĀ;e൘ⰮqĀ;qൠⰣȀgilrⰽⰿⱅⱇìௗlde耻ñ䃱çృiangleĀlrⱒⱜeftĀ;eచⱚñదightĀ;eೋⱥñ೗Ā;mⱬⱭ䎽ƀ;esⱴⱵⱹ䀣ro;愖p;怇ҀDHadgilrsⲏⲔⲙⲞⲣⲰⲶⳓⳣash;抭arr;椄p;쀀≍⃒ash;抬ĀetⲨⲬ;쀀≥⃒;쀀>⃒nfin;槞ƀAetⲽⳁⳅrr;椂;쀀≤⃒Ā;rⳊⳍ쀀<⃒ie;쀀⊴⃒ĀAtⳘⳜrr;椃rie;쀀⊵⃒im;쀀∼⃒ƀAan⳰⳴ⴂrr;懖rĀhr⳺⳽k;椣Ā;oᏧᏥear;椧ቓ᪕\0\0\0\0\0\0\0\0\0\0\0\0\0ⴭ\0ⴸⵈⵠⵥ⵲ⶄᬇ\0\0ⶍⶫ\0ⷈⷎ\0ⷜ⸙⸫⸾⹃Ācsⴱ᪗ute耻ó䃳ĀiyⴼⵅrĀ;c᪞ⵂ耻ô䃴;䐾ʀabios᪠ⵒⵗǈⵚlac;䅑v;樸old;榼lig;䅓Ācr⵩⵭ir;榿;쀀𝔬ͯ⵹\0\0⵼\0ⶂn;䋛ave耻ò䃲;槁Ābmⶈ෴ar;榵Ȁacitⶕ⶘ⶥⶨrò᪀Āir⶝ⶠr;榾oss;榻nå๒;槀ƀaeiⶱⶵⶹcr;䅍ga;䏉ƀcdnⷀⷅǍron;䎿;榶pf;쀀𝕠ƀaelⷔ⷗ǒr;榷rp;榹΀;adiosvⷪⷫⷮ⸈⸍⸐⸖戨rò᪆Ȁ;efmⷷⷸ⸂⸅橝rĀ;oⷾⷿ愴f»ⷿ耻ª䂪耻º䂺gof;抶r;橖lope;橗;橛ƀclo⸟⸡⸧ò⸁ash耻ø䃸l;折iŬⸯ⸴de耻õ䃵esĀ;aǛ⸺s;樶ml耻ö䃶bar;挽ૡ⹞\0⹽\0⺀⺝\0⺢⺹\0\0⻋ຜ\0⼓\0\0⼫⾼\0⿈rȀ;astЃ⹧⹲຅脀¶;l⹭⹮䂶leìЃɩ⹸\0\0⹻m;櫳;櫽y;䐿rʀcimpt⺋⺏⺓ᡥ⺗nt;䀥od;䀮il;怰enk;怱r;쀀𝔭ƀimo⺨⺰⺴Ā;v⺭⺮䏆;䏕maô੶ne;明ƀ;tv⺿⻀⻈䏀chfork»´;䏖Āau⻏⻟nĀck⻕⻝kĀ;h⇴⻛;愎ö⇴sҀ;abcdemst⻳⻴ᤈ⻹⻽⼄⼆⼊⼎䀫cir;樣ir;樢Āouᵀ⼂;樥;橲n肻±ຝim;樦wo;樧ƀipu⼙⼠⼥ntint;樕f;쀀𝕡nd耻£䂣Ԁ;Eaceinosu່⼿⽁⽄⽇⾁⾉⾒⽾⾶;檳p;檷uå໙Ā;c໎⽌̀;acens່⽙⽟⽦⽨⽾pproø⽃urlyeñ໙ñ໎ƀaes⽯⽶⽺pprox;檹qq;檵im;拨iíໟmeĀ;s⾈ຮ怲ƀEas⽸⾐⽺ð⽵ƀdfp໬⾙⾯ƀals⾠⾥⾪lar;挮ine;挒urf;挓Ā;t໻⾴ï໻rel;抰Āci⿀⿅r;쀀𝓅;䏈ncsp;怈̀fiopsu⿚⋢⿟⿥⿫⿱r;쀀𝔮pf;쀀𝕢rime;恗cr;쀀𝓆ƀaeo⿸〉〓tĀei⿾々rnionóڰnt;樖stĀ;e【】䀿ñἙô༔઀ABHabcdefhilmnoprstux぀けさすムㄎㄫㅇㅢㅲㆎ㈆㈕㈤㈩㉘㉮㉲㊐㊰㊷ƀartぇおがròႳòϝail;検aròᱥar;楤΀cdenqrtとふへみわゔヌĀeuねぱ;쀀∽̱te;䅕iãᅮmptyv;榳gȀ;del࿑らるろ;榒;榥å࿑uo耻»䂻rր;abcfhlpstw࿜ガクシスゼゾダッデナp;極Ā;f࿠ゴs;椠;椳s;椞ë≝ð✮l;楅im;楴l;憣;憝Āaiパフil;椚oĀ;nホボ戶aló༞ƀabrョリヮrò៥rk;杳ĀakンヽcĀekヹ・;䁽;䁝Āes㄂㄄;榌lĀduㄊㄌ;榎;榐Ȁaeuyㄗㄜㄧㄩron;䅙Ādiㄡㄥil;䅗ì࿲âヺ;䑀Ȁclqsㄴㄷㄽㅄa;椷dhar;楩uoĀ;rȎȍh;憳ƀacgㅎㅟངlȀ;ipsླྀㅘㅛႜnåႻarôྩt;断ƀilrㅩဣㅮsht;楽;쀀𝔯ĀaoㅷㆆrĀduㅽㅿ»ѻĀ;l႑ㆄ;楬Ā;vㆋㆌ䏁;䏱ƀgns㆕ㇹㇼht̀ahlrstㆤㆰ㇂㇘㇤㇮rrowĀ;t࿜ㆭaéトarpoonĀduㆻㆿowîㅾp»႒eftĀah㇊㇐rrowó࿪arpoonóՑightarrows;應quigarro÷ニhreetimes;拌g;䋚ingdotseñἲƀahm㈍㈐㈓rò࿪aòՑ;怏oustĀ;a㈞㈟掱che»㈟mid;櫮Ȁabpt㈲㈽㉀㉒Ānr㈷㈺g;柭r;懾rëဃƀafl㉇㉊㉎r;榆;쀀𝕣us;樮imes;樵Āap㉝㉧rĀ;g㉣㉤䀩t;榔olint;樒arò㇣Ȁachq㉻㊀Ⴜ㊅quo;怺r;쀀𝓇Ābu・㊊oĀ;rȔȓƀhir㊗㊛㊠reåㇸmes;拊iȀ;efl㊪ၙᠡ㊫方tri;槎luhar;楨;愞ൡ㋕㋛㋟㌬㌸㍱\0㍺㎤\0\0㏬㏰\0㐨㑈㑚㒭㒱㓊㓱\0㘖\0\0㘳cute;䅛quï➺Ԁ;Eaceinpsyᇭ㋳㋵㋿㌂㌋㌏㌟㌦㌩;檴ǰ㋺\0㋼;檸on;䅡uåᇾĀ;dᇳ㌇il;䅟rc;䅝ƀEas㌖㌘㌛;檶p;檺im;择olint;樓iíሄ;䑁otƀ;be㌴ᵇ㌵担;橦΀Aacmstx㍆㍊㍗㍛㍞㍣㍭rr;懘rĀhr㍐㍒ë∨Ā;oਸ਼਴t耻§䂧i;䀻war;椩mĀin㍩ðnuóñt;朶rĀ;o㍶⁕쀀𝔰Ȁacoy㎂㎆㎑㎠rp;景Āhy㎋㎏cy;䑉;䑈rtɭ㎙\0\0㎜iäᑤaraì⹯耻­䂭Āgm㎨㎴maƀ;fv㎱㎲㎲䏃;䏂Ѐ;deglnprካ㏅㏉㏎㏖㏞㏡㏦ot;橪Ā;q኱ኰĀ;E㏓㏔檞;檠Ā;E㏛㏜檝;檟e;扆lus;樤arr;楲aròᄽȀaeit㏸㐈㐏㐗Āls㏽㐄lsetmé㍪hp;樳parsl;槤Ādlᑣ㐔e;挣Ā;e㐜㐝檪Ā;s㐢㐣檬;쀀⪬︀ƀflp㐮㐳㑂tcy;䑌Ā;b㐸㐹䀯Ā;a㐾㐿槄r;挿f;쀀𝕤aĀdr㑍ЂesĀ;u㑔㑕晠it»㑕ƀcsu㑠㑹㒟Āau㑥㑯pĀ;sᆈ㑫;쀀⊓︀pĀ;sᆴ㑵;쀀⊔︀uĀbp㑿㒏ƀ;esᆗᆜ㒆etĀ;eᆗ㒍ñᆝƀ;esᆨᆭ㒖etĀ;eᆨ㒝ñᆮƀ;afᅻ㒦ְrť㒫ֱ»ᅼaròᅈȀcemt㒹㒾㓂㓅r;쀀𝓈tmîñiì㐕aræᆾĀar㓎㓕rĀ;f㓔ឿ昆Āan㓚㓭ightĀep㓣㓪psiloîỠhé⺯s»⡒ʀbcmnp㓻㕞ሉ㖋㖎Ҁ;Edemnprs㔎㔏㔑㔕㔞㔣㔬㔱㔶抂;櫅ot;檽Ā;dᇚ㔚ot;櫃ult;櫁ĀEe㔨㔪;櫋;把lus;檿arr;楹ƀeiu㔽㕒㕕tƀ;en㔎㕅㕋qĀ;qᇚ㔏eqĀ;q㔫㔨m;櫇Ābp㕚㕜;櫕;櫓c̀;acensᇭ㕬㕲㕹㕻㌦pproø㋺urlyeñᇾñᇳƀaes㖂㖈㌛pproø㌚qñ㌗g;晪ڀ123;Edehlmnps㖩㖬㖯ሜ㖲㖴㗀㗉㗕㗚㗟㗨㗭耻¹䂹耻²䂲耻³䂳;櫆Āos㖹㖼t;檾ub;櫘Ā;dሢ㗅ot;櫄sĀou㗏㗒l;柉b;櫗arr;楻ult;櫂ĀEe㗤㗦;櫌;抋lus;櫀ƀeiu㗴㘉㘌tƀ;enሜ㗼㘂qĀ;qሢ㖲eqĀ;q㗧㗤m;櫈Ābp㘑㘓;櫔;櫖ƀAan㘜㘠㘭rr;懙rĀhr㘦㘨ë∮Ā;oਫ਩war;椪lig耻ß䃟௡㙑㙝㙠ዎ㙳㙹\0㙾㛂\0\0\0\0\0㛛㜃\0㜉㝬\0\0\0㞇ɲ㙖\0\0㙛get;挖;䏄rë๟ƀaey㙦㙫㙰ron;䅥dil;䅣;䑂lrec;挕r;쀀𝔱Ȁeiko㚆㚝㚵㚼ǲ㚋\0㚑eĀ4fኄኁaƀ;sv㚘㚙㚛䎸ym;䏑Ācn㚢㚲kĀas㚨㚮pproø዁im»ኬsðኞĀas㚺㚮ð዁rn耻þ䃾Ǭ̟㛆⋧es膀×;bd㛏㛐㛘䃗Ā;aᤏ㛕r;樱;樰ƀeps㛡㛣㜀á⩍Ȁ;bcf҆㛬㛰㛴ot;挶ir;櫱Ā;o㛹㛼쀀𝕥rk;櫚á㍢rime;怴ƀaip㜏㜒㝤dåቈ΀adempst㜡㝍㝀㝑㝗㝜㝟ngleʀ;dlqr㜰㜱㜶㝀㝂斵own»ᶻeftĀ;e⠀㜾ñम;扜ightĀ;e㊪㝋ñၚot;旬inus;樺lus;樹b;槍ime;樻ezium;揢ƀcht㝲㝽㞁Āry㝷㝻;쀀𝓉;䑆cy;䑛rok;䅧Āio㞋㞎xô᝷headĀlr㞗㞠eftarro÷ࡏightarrow»ཝऀAHabcdfghlmoprstuw㟐㟓㟗㟤㟰㟼㠎㠜㠣㠴㡑㡝㡫㢩㣌㣒㣪㣶ròϭar;楣Ācr㟜㟢ute耻ú䃺òᅐrǣ㟪\0㟭y;䑞ve;䅭Āiy㟵㟺rc耻û䃻;䑃ƀabh㠃㠆㠋ròᎭlac;䅱aòᏃĀir㠓㠘sht;楾;쀀𝔲rave耻ù䃹š㠧㠱rĀlr㠬㠮»ॗ»ႃlk;斀Āct㠹㡍ɯ㠿\0\0㡊rnĀ;e㡅㡆挜r»㡆op;挏ri;旸Āal㡖㡚cr;䅫肻¨͉Āgp㡢㡦on;䅳f;쀀𝕦̀adhlsuᅋ㡸㡽፲㢑㢠ownáᎳarpoonĀlr㢈㢌efô㠭ighô㠯iƀ;hl㢙㢚㢜䏅»ᏺon»㢚parrows;懈ƀcit㢰㣄㣈ɯ㢶\0\0㣁rnĀ;e㢼㢽挝r»㢽op;挎ng;䅯ri;旹cr;쀀𝓊ƀdir㣙㣝㣢ot;拰lde;䅩iĀ;f㜰㣨»᠓Āam㣯㣲rò㢨l耻ü䃼angle;榧ހABDacdeflnoprsz㤜㤟㤩㤭㦵㦸㦽㧟㧤㧨㧳㧹㧽㨁㨠ròϷarĀ;v㤦㤧櫨;櫩asèϡĀnr㤲㤷grt;榜΀eknprst㓣㥆㥋㥒㥝㥤㦖appá␕othinçẖƀhir㓫⻈㥙opô⾵Ā;hᎷ㥢ïㆍĀiu㥩㥭gmá㎳Ābp㥲㦄setneqĀ;q㥽㦀쀀⊊︀;쀀⫋︀setneqĀ;q㦏㦒쀀⊋︀;쀀⫌︀Āhr㦛㦟etá㚜iangleĀlr㦪㦯eft»थight»ၑy;䐲ash»ံƀelr㧄㧒㧗ƀ;beⷪ㧋㧏ar;抻q;扚lip;拮Ābt㧜ᑨaòᑩr;쀀𝔳tré㦮suĀbp㧯㧱»ജ»൙pf;쀀𝕧roð໻tré㦴Ācu㨆㨋r;쀀𝓋Ābp㨐㨘nĀEe㦀㨖»㥾nĀEe㦒㨞»㦐igzag;榚΀cefoprs㨶㨻㩖㩛㩔㩡㩪irc;䅵Ādi㩀㩑Ābg㩅㩉ar;機eĀ;qᗺ㩏;扙erp;愘r;쀀𝔴pf;쀀𝕨Ā;eᑹ㩦atèᑹcr;쀀𝓌ૣណ㪇\0㪋\0㪐㪛\0\0㪝㪨㪫㪯\0\0㫃㫎\0㫘ៜ៟tré៑r;쀀𝔵ĀAa㪔㪗ròσrò৶;䎾ĀAa㪡㪤ròθrò৫að✓is;拻ƀdptឤ㪵㪾Āfl㪺ឩ;쀀𝕩imåឲĀAa㫇㫊ròώròਁĀcq㫒ីr;쀀𝓍Āpt៖㫜ré។Ѐacefiosu㫰㫽㬈㬌㬑㬕㬛㬡cĀuy㫶㫻te耻ý䃽;䑏Āiy㬂㬆rc;䅷;䑋n耻¥䂥r;쀀𝔶cy;䑗pf;쀀𝕪cr;쀀𝓎Ācm㬦㬩y;䑎l耻ÿ䃿Ԁacdefhiosw㭂㭈㭔㭘㭤㭩㭭㭴㭺㮀cute;䅺Āay㭍㭒ron;䅾;䐷ot;䅼Āet㭝㭡træᕟa;䎶r;쀀𝔷cy;䐶grarr;懝pf;쀀𝕫cr;쀀𝓏Ājn㮅㮇;怍j;怌'
      .split('')
      .map((A) => A.charCodeAt(0)),
  ),
  Fu = new Uint16Array(
    'Ȁaglq\tɭ\0\0p;䀦os;䀧t;䀾t;䀼uot;䀢'.split('').map((A) => A.charCodeAt(0)),
  )
var Uu
const vu = new Map([
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
  bu =
    null !== (Uu = String.fromCodePoint) && void 0 !== Uu
      ? Uu
      : function (A) {
          let e = ''
          return (
            A > 65535 &&
              ((A -= 65536),
              (e += String.fromCharCode(((A >>> 10) & 1023) | 55296)),
              (A = 56320 | (1023 & A))),
            (e += String.fromCharCode(A)),
            e
          )
        }
var Eu, Hu
;(((Hu = Eu || (Eu = {}))[(Hu.NUM = 35)] = 'NUM'),
  (Hu[(Hu.SEMI = 59)] = 'SEMI'),
  (Hu[(Hu.EQUALS = 61)] = 'EQUALS'),
  (Hu[(Hu.ZERO = 48)] = 'ZERO'),
  (Hu[(Hu.NINE = 57)] = 'NINE'),
  (Hu[(Hu.LOWER_A = 97)] = 'LOWER_A'),
  (Hu[(Hu.LOWER_F = 102)] = 'LOWER_F'),
  (Hu[(Hu.LOWER_X = 120)] = 'LOWER_X'),
  (Hu[(Hu.LOWER_Z = 122)] = 'LOWER_Z'),
  (Hu[(Hu.UPPER_A = 65)] = 'UPPER_A'),
  (Hu[(Hu.UPPER_F = 70)] = 'UPPER_F'),
  (Hu[(Hu.UPPER_Z = 90)] = 'UPPER_Z'))
var _u, Iu, Du, xu, ku, Lu
function Su(A) {
  return A >= Eu.ZERO && A <= Eu.NINE
}
function Ou(A) {
  return (
    A === Eu.EQUALS ||
    (function (A) {
      return (
        (A >= Eu.UPPER_A && A <= Eu.UPPER_Z) ||
        (A >= Eu.LOWER_A && A <= Eu.LOWER_Z) ||
        Su(A)
      )
    })(A)
  )
}
;(((Iu = _u || (_u = {}))[(Iu.VALUE_LENGTH = 49152)] = 'VALUE_LENGTH'),
  (Iu[(Iu.BRANCH_LENGTH = 16256)] = 'BRANCH_LENGTH'),
  (Iu[(Iu.JUMP_TABLE = 127)] = 'JUMP_TABLE'),
  ((xu = Du || (Du = {}))[(xu.EntityStart = 0)] = 'EntityStart'),
  (xu[(xu.NumericStart = 1)] = 'NumericStart'),
  (xu[(xu.NumericDecimal = 2)] = 'NumericDecimal'),
  (xu[(xu.NumericHex = 3)] = 'NumericHex'),
  (xu[(xu.NamedEntity = 4)] = 'NamedEntity'),
  ((Lu = ku || (ku = {}))[(Lu.Legacy = 0)] = 'Legacy'),
  (Lu[(Lu.Strict = 1)] = 'Strict'),
  (Lu[(Lu.Attribute = 2)] = 'Attribute'))
class Ku {
  constructor(A, e, t) {
    ;((this.decodeTree = A),
      (this.emitCodePoint = e),
      (this.errors = t),
      (this.state = Du.EntityStart),
      (this.consumed = 1),
      (this.result = 0),
      (this.treeIndex = 0),
      (this.excess = 1),
      (this.decodeMode = ku.Strict))
  }
  startEntity(A) {
    ;((this.decodeMode = A),
      (this.state = Du.EntityStart),
      (this.result = 0),
      (this.treeIndex = 0),
      (this.excess = 1),
      (this.consumed = 1))
  }
  write(A, e) {
    switch (this.state) {
      case Du.EntityStart:
        return A.charCodeAt(e) === Eu.NUM
          ? ((this.state = Du.NumericStart),
            (this.consumed += 1),
            this.stateNumericStart(A, e + 1))
          : ((this.state = Du.NamedEntity), this.stateNamedEntity(A, e))
      case Du.NumericStart:
        return this.stateNumericStart(A, e)
      case Du.NumericDecimal:
        return this.stateNumericDecimal(A, e)
      case Du.NumericHex:
        return this.stateNumericHex(A, e)
      case Du.NamedEntity:
        return this.stateNamedEntity(A, e)
    }
  }
  stateNumericStart(A, e) {
    return e >= A.length
      ? -1
      : (32 | A.charCodeAt(e)) === Eu.LOWER_X
        ? ((this.state = Du.NumericHex),
          (this.consumed += 1),
          this.stateNumericHex(A, e + 1))
        : ((this.state = Du.NumericDecimal), this.stateNumericDecimal(A, e))
  }
  addToNumericResult(A, e, t, r) {
    if (e !== t) {
      const n = t - e
      ;((this.result =
        this.result * Math.pow(r, n) + parseInt(A.substr(e, n), r)),
        (this.consumed += n))
    }
  }
  stateNumericHex(A, e) {
    const t = e
    for (; e < A.length; ) {
      const n = A.charCodeAt(e)
      if (
        !(
          Su(n) ||
          ((r = n),
          (r >= Eu.UPPER_A && r <= Eu.UPPER_F) ||
            (r >= Eu.LOWER_A && r <= Eu.LOWER_F))
        )
      )
        return (
          this.addToNumericResult(A, t, e, 16),
          this.emitNumericEntity(n, 3)
        )
      e += 1
    }
    var r
    return (this.addToNumericResult(A, t, e, 16), -1)
  }
  stateNumericDecimal(A, e) {
    const t = e
    for (; e < A.length; ) {
      const r = A.charCodeAt(e)
      if (!Su(r))
        return (
          this.addToNumericResult(A, t, e, 10),
          this.emitNumericEntity(r, 2)
        )
      e += 1
    }
    return (this.addToNumericResult(A, t, e, 10), -1)
  }
  emitNumericEntity(A, e) {
    var t
    if (this.consumed <= e)
      return (
        null === (t = this.errors) ||
          void 0 === t ||
          t.absenceOfDigitsInNumericCharacterReference(this.consumed),
        0
      )
    if (A === Eu.SEMI) this.consumed += 1
    else if (this.decodeMode === ku.Strict) return 0
    return (
      this.emitCodePoint(
        (function (A) {
          var e
          return (A >= 55296 && A <= 57343) || A > 1114111
            ? 65533
            : null !== (e = vu.get(A)) && void 0 !== e
              ? e
              : A
        })(this.result),
        this.consumed,
      ),
      this.errors &&
        (A !== Eu.SEMI && this.errors.missingSemicolonAfterCharacterReference(),
        this.errors.validateNumericCharacterReference(this.result)),
      this.consumed
    )
  }
  stateNamedEntity(A, e) {
    const { decodeTree: t } = this
    let r = t[this.treeIndex],
      n = (r & _u.VALUE_LENGTH) >> 14
    for (; e < A.length; e++, this.excess++) {
      const i = A.charCodeAt(e)
      if (
        ((this.treeIndex = Mu(t, r, this.treeIndex + Math.max(1, n), i)),
        this.treeIndex < 0)
      )
        return 0 === this.result ||
          (this.decodeMode === ku.Attribute && (0 === n || Ou(i)))
          ? 0
          : this.emitNotTerminatedNamedEntity()
      if (
        ((r = t[this.treeIndex]), (n = (r & _u.VALUE_LENGTH) >> 14), 0 !== n)
      ) {
        if (i === Eu.SEMI)
          return this.emitNamedEntityData(
            this.treeIndex,
            n,
            this.consumed + this.excess,
          )
        this.decodeMode !== ku.Strict &&
          ((this.result = this.treeIndex),
          (this.consumed += this.excess),
          (this.excess = 0))
      }
    }
    return -1
  }
  emitNotTerminatedNamedEntity() {
    var A
    const { result: e, decodeTree: t } = this,
      r = (t[e] & _u.VALUE_LENGTH) >> 14
    return (
      this.emitNamedEntityData(e, r, this.consumed),
      null === (A = this.errors) ||
        void 0 === A ||
        A.missingSemicolonAfterCharacterReference(),
      this.consumed
    )
  }
  emitNamedEntityData(A, e, t) {
    const { decodeTree: r } = this
    return (
      this.emitCodePoint(1 === e ? r[A] & ~_u.VALUE_LENGTH : r[A + 1], t),
      3 === e && this.emitCodePoint(r[A + 2], t),
      t
    )
  }
  end() {
    var A
    switch (this.state) {
      case Du.NamedEntity:
        return 0 === this.result ||
          (this.decodeMode === ku.Attribute && this.result !== this.treeIndex)
          ? 0
          : this.emitNotTerminatedNamedEntity()
      case Du.NumericDecimal:
        return this.emitNumericEntity(0, 2)
      case Du.NumericHex:
        return this.emitNumericEntity(0, 3)
      case Du.NumericStart:
        return (
          null === (A = this.errors) ||
            void 0 === A ||
            A.absenceOfDigitsInNumericCharacterReference(this.consumed),
          0
        )
      case Du.EntityStart:
        return 0
    }
  }
}
function Tu(A) {
  let e = ''
  const t = new Ku(A, (A) => (e += bu(A)))
  return function (A, r) {
    let n = 0,
      i = 0
    for (; (i = A.indexOf('&', i)) >= 0; ) {
      ;((e += A.slice(n, i)), t.startEntity(r))
      const o = t.write(A, i + 1)
      if (o < 0) {
        n = i + t.end()
        break
      }
      ;((n = i + o), (i = 0 === o ? n + 1 : n))
    }
    const o = e + A.slice(n)
    return ((e = ''), o)
  }
}
function Mu(A, e, t, r) {
  const n = (e & _u.BRANCH_LENGTH) >> 7,
    i = e & _u.JUMP_TABLE
  if (0 === n) return 0 !== i && r === i ? t : -1
  if (i) {
    const e = r - i
    return e < 0 || e >= n ? -1 : A[t + e] - 1
  }
  let o = t,
    s = o + n - 1
  for (; o <= s; ) {
    const e = (o + s) >>> 1,
      t = A[e]
    if (t < r) o = e + 1
    else {
      if (!(t > r)) return A[e + n]
      s = e - 1
    }
  }
  return -1
}
const Ru = Tu(Qu)
function Nu(A, e = ku.Legacy) {
  return Ru(A, e)
}
function Pu(A) {
  return (
    '[object String]' ===
    (function (A) {
      return Object.prototype.toString.call(A)
    })(A)
  )
}
Tu(Fu)
const Vu = Object.prototype.hasOwnProperty
function Gu(A) {
  return (
    Array.prototype.slice.call(arguments, 1).forEach(function (e) {
      if (e) {
        if ('object' != typeof e) throw new TypeError(e + 'must be object')
        Object.keys(e).forEach(function (t) {
          A[t] = e[t]
        })
      }
    }),
    A
  )
}
function zu(A, e, t) {
  return [].concat(A.slice(0, e), t, A.slice(e + 1))
}
function ju(A) {
  return (
    !(A >= 55296 && A <= 57343) &&
    !(A >= 64976 && A <= 65007) &&
    !!(65535 & ~A && 65534 != (65535 & A)) &&
    !(A >= 0 && A <= 8) &&
    11 !== A &&
    !(A >= 14 && A <= 31) &&
    !(A >= 127 && A <= 159) &&
    !(A > 1114111)
  )
}
function Wu(A) {
  if (A > 65535) {
    const e = 55296 + ((A -= 65536) >> 10),
      t = 56320 + (1023 & A)
    return String.fromCharCode(e, t)
  }
  return String.fromCharCode(A)
}
const qu = /\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g,
  Xu = new RegExp(qu.source + '|' + /&([a-z#][a-z0-9]{1,31});/gi.source, 'gi'),
  Ju = /^#((?:x[a-f0-9]{1,8}|[0-9]{1,8}))$/i
function Yu(A) {
  return A.indexOf('\\') < 0 && A.indexOf('&') < 0
    ? A
    : A.replace(Xu, function (A, e, t) {
        return (
          e ||
          (function (A, e) {
            if (35 === e.charCodeAt(0) && Ju.test(e)) {
              const t =
                'x' === e[1].toLowerCase()
                  ? parseInt(e.slice(2), 16)
                  : parseInt(e.slice(1), 10)
              return ju(t) ? Wu(t) : A
            }
            const t = Nu(A)
            return t !== A ? t : A
          })(A, t)
        )
      })
}
const Zu = /[&<>"]/,
  $u = /[&<>"]/g,
  Al = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }
function el(A) {
  return Al[A]
}
function tl(A) {
  return Zu.test(A) ? A.replace($u, el) : A
}
const rl = /[.?*+^$[\]\\(){}|-]/g
function nl(A) {
  switch (A) {
    case 9:
    case 32:
      return !0
  }
  return !1
}
function il(A) {
  if (A >= 8192 && A <= 8202) return !0
  switch (A) {
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
function ol(A) {
  return wu.test(A) || mu.test(A)
}
function sl(A) {
  switch (A) {
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
function al(A) {
  return (
    (A = A.trim().replace(/\s+/g, ' ')),
    'Ṿ' === 'ẞ'.toLowerCase() && (A = A.replace(/ẞ/g, 'ß')),
    A.toLowerCase().toUpperCase()
  )
}
const cl = { mdurl: Bu, ucmicro: yu },
  ul = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        arrayReplaceAt: zu,
        assign: Gu,
        escapeHtml: tl,
        escapeRE: function (A) {
          return A.replace(rl, '\\$&')
        },
        fromCodePoint: Wu,
        has: function (A, e) {
          return Vu.call(A, e)
        },
        isMdAsciiPunct: sl,
        isPunctChar: ol,
        isSpace: nl,
        isString: Pu,
        isValidEntityCode: ju,
        isWhiteSpace: il,
        lib: cl,
        normalizeReference: al,
        unescapeAll: Yu,
        unescapeMd: function (A) {
          return A.indexOf('\\') < 0 ? A : A.replace(qu, '$1')
        },
      },
      Symbol.toStringTag,
      { value: 'Module' },
    ),
  )
const ll = Object.freeze(
    Object.defineProperty(
      {
        __proto__: null,
        parseLinkDestination: function (A, e, t) {
          let r,
            n = e
          const i = { ok: !1, pos: 0, str: '' }
          if (60 === A.charCodeAt(n)) {
            for (n++; n < t; ) {
              if (((r = A.charCodeAt(n)), 10 === r)) return i
              if (60 === r) return i
              if (62 === r)
                return (
                  (i.pos = n + 1),
                  (i.str = Yu(A.slice(e + 1, n))),
                  (i.ok = !0),
                  i
                )
              92 === r && n + 1 < t ? (n += 2) : n++
            }
            return i
          }
          let o = 0
          for (
            ;
            n < t &&
            ((r = A.charCodeAt(n)), 32 !== r) &&
            !(r < 32 || 127 === r);

          )
            if (92 === r && n + 1 < t) {
              if (32 === A.charCodeAt(n + 1)) break
              n += 2
            } else {
              if (40 === r && (o++, o > 32)) return i
              if (41 === r) {
                if (0 === o) break
                o--
              }
              n++
            }
          return (
            e === n ||
              0 !== o ||
              ((i.str = Yu(A.slice(e, n))), (i.pos = n), (i.ok = !0)),
            i
          )
        },
        parseLinkLabel: function (A, e, t) {
          let r, n, i, o
          const s = A.posMax,
            a = A.pos
          for (A.pos = e + 1, r = 1; A.pos < s; ) {
            if (((i = A.src.charCodeAt(A.pos)), 93 === i && (r--, 0 === r))) {
              n = !0
              break
            }
            if (((o = A.pos), A.md.inline.skipToken(A), 91 === i))
              if (o === A.pos - 1) r++
              else if (t) return ((A.pos = a), -1)
          }
          let c = -1
          return (n && (c = A.pos), (A.pos = a), c)
        },
        parseLinkTitle: function (A, e, t, r) {
          let n,
            i = e
          const o = { ok: !1, can_continue: !1, pos: 0, str: '', marker: 0 }
          if (r) ((o.str = r.str), (o.marker = r.marker))
          else {
            if (i >= t) return o
            let r = A.charCodeAt(i)
            if (34 !== r && 39 !== r && 40 !== r) return o
            ;(e++, i++, 40 === r && (r = 41), (o.marker = r))
          }
          for (; i < t; ) {
            if (((n = A.charCodeAt(i)), n === o.marker))
              return (
                (o.pos = i + 1),
                (o.str += Yu(A.slice(e, i))),
                (o.ok = !0),
                o
              )
            if (40 === n && 41 === o.marker) return o
            ;(92 === n && i + 1 < t && i++, i++)
          }
          return ((o.can_continue = !0), (o.str += Yu(A.slice(e, i))), o)
        },
      },
      Symbol.toStringTag,
      { value: 'Module' },
    ),
  ),
  hl = {}
function fl() {
  this.rules = Gu({}, hl)
}
function dl() {
  ;((this.__rules__ = []), (this.__cache__ = null))
}
function Bl(A, e, t) {
  ;((this.type = A),
    (this.tag = e),
    (this.attrs = null),
    (this.map = null),
    (this.nesting = t),
    (this.level = 0),
    (this.children = null),
    (this.content = ''),
    (this.markup = ''),
    (this.info = ''),
    (this.meta = null),
    (this.block = !1),
    (this.hidden = !1))
}
function pl(A, e, t) {
  ;((this.src = A),
    (this.env = t),
    (this.tokens = []),
    (this.inlineMode = !1),
    (this.md = e))
}
;((hl.code_inline = function (A, e, t, r, n) {
  const i = A[e]
  return '<code' + n.renderAttrs(i) + '>' + tl(i.content) + '</code>'
}),
  (hl.code_block = function (A, e, t, r, n) {
    const i = A[e]
    return (
      '<pre' +
      n.renderAttrs(i) +
      '><code>' +
      tl(A[e].content) +
      '</code></pre>\n'
    )
  }),
  (hl.fence = function (A, e, t, r, n) {
    const i = A[e],
      o = i.info ? Yu(i.info).trim() : ''
    let s,
      a = '',
      c = ''
    if (o) {
      const A = o.split(/(\s+)/g)
      ;((a = A[0]), (c = A.slice(2).join('')))
    }
    if (
      ((s = (t.highlight && t.highlight(i.content, a, c)) || tl(i.content)),
      0 === s.indexOf('<pre'))
    )
      return s + '\n'
    if (o) {
      const A = i.attrIndex('class'),
        e = i.attrs ? i.attrs.slice() : []
      A < 0
        ? e.push(['class', t.langPrefix + a])
        : ((e[A] = e[A].slice()), (e[A][1] += ' ' + t.langPrefix + a))
      const r = { attrs: e }
      return `<pre><code${n.renderAttrs(r)}>${s}</code></pre>\n`
    }
    return `<pre><code${n.renderAttrs(i)}>${s}</code></pre>\n`
  }),
  (hl.image = function (A, e, t, r, n) {
    const i = A[e]
    return (
      (i.attrs[i.attrIndex('alt')][1] = n.renderInlineAsText(i.children, t, r)),
      n.renderToken(A, e, t)
    )
  }),
  (hl.hardbreak = function (A, e, t) {
    return t.xhtmlOut ? '<br />\n' : '<br>\n'
  }),
  (hl.softbreak = function (A, e, t) {
    return t.breaks ? (t.xhtmlOut ? '<br />\n' : '<br>\n') : '\n'
  }),
  (hl.text = function (A, e) {
    return tl(A[e].content)
  }),
  (hl.html_block = function (A, e) {
    return A[e].content
  }),
  (hl.html_inline = function (A, e) {
    return A[e].content
  }),
  (fl.prototype.renderAttrs = function (A) {
    let e, t, r
    if (!A.attrs) return ''
    for (r = '', e = 0, t = A.attrs.length; e < t; e++)
      r += ' ' + tl(A.attrs[e][0]) + '="' + tl(A.attrs[e][1]) + '"'
    return r
  }),
  (fl.prototype.renderToken = function (A, e, t) {
    const r = A[e]
    let n = ''
    if (r.hidden) return ''
    ;(r.block && -1 !== r.nesting && e && A[e - 1].hidden && (n += '\n'),
      (n += (-1 === r.nesting ? '</' : '<') + r.tag),
      (n += this.renderAttrs(r)),
      0 === r.nesting && t.xhtmlOut && (n += ' /'))
    let i = !1
    if (r.block && ((i = !0), 1 === r.nesting && e + 1 < A.length)) {
      const t = A[e + 1]
      ;('inline' === t.type ||
        t.hidden ||
        (-1 === t.nesting && t.tag === r.tag)) &&
        (i = !1)
    }
    return ((n += i ? '>\n' : '>'), n)
  }),
  (fl.prototype.renderInline = function (A, e, t) {
    let r = ''
    const n = this.rules
    for (let i = 0, o = A.length; i < o; i++) {
      const o = A[i].type
      void 0 !== n[o]
        ? (r += n[o](A, i, e, t, this))
        : (r += this.renderToken(A, i, e))
    }
    return r
  }),
  (fl.prototype.renderInlineAsText = function (A, e, t) {
    let r = ''
    for (let n = 0, i = A.length; n < i; n++)
      switch (A[n].type) {
        case 'text':
        case 'html_inline':
        case 'html_block':
          r += A[n].content
          break
        case 'image':
          r += this.renderInlineAsText(A[n].children, e, t)
          break
        case 'softbreak':
        case 'hardbreak':
          r += '\n'
      }
    return r
  }),
  (fl.prototype.render = function (A, e, t) {
    let r = ''
    const n = this.rules
    for (let i = 0, o = A.length; i < o; i++) {
      const o = A[i].type
      'inline' === o
        ? (r += this.renderInline(A[i].children, e, t))
        : void 0 !== n[o]
          ? (r += n[o](A, i, e, t, this))
          : (r += this.renderToken(A, i, e, t))
    }
    return r
  }),
  (dl.prototype.__find__ = function (A) {
    for (let e = 0; e < this.__rules__.length; e++)
      if (this.__rules__[e].name === A) return e
    return -1
  }),
  (dl.prototype.__compile__ = function () {
    const A = this,
      e = ['']
    ;(A.__rules__.forEach(function (A) {
      A.enabled &&
        A.alt.forEach(function (A) {
          e.indexOf(A) < 0 && e.push(A)
        })
    }),
      (A.__cache__ = {}),
      e.forEach(function (e) {
        ;((A.__cache__[e] = []),
          A.__rules__.forEach(function (t) {
            t.enabled &&
              ((e && t.alt.indexOf(e) < 0) || A.__cache__[e].push(t.fn))
          }))
      }))
  }),
  (dl.prototype.at = function (A, e, t) {
    const r = this.__find__(A),
      n = t || {}
    if (-1 === r) throw new Error('Parser rule not found: ' + A)
    ;((this.__rules__[r].fn = e),
      (this.__rules__[r].alt = n.alt || []),
      (this.__cache__ = null))
  }),
  (dl.prototype.before = function (A, e, t, r) {
    const n = this.__find__(A),
      i = r || {}
    if (-1 === n) throw new Error('Parser rule not found: ' + A)
    ;(this.__rules__.splice(n, 0, {
      name: e,
      enabled: !0,
      fn: t,
      alt: i.alt || [],
    }),
      (this.__cache__ = null))
  }),
  (dl.prototype.after = function (A, e, t, r) {
    const n = this.__find__(A),
      i = r || {}
    if (-1 === n) throw new Error('Parser rule not found: ' + A)
    ;(this.__rules__.splice(n + 1, 0, {
      name: e,
      enabled: !0,
      fn: t,
      alt: i.alt || [],
    }),
      (this.__cache__ = null))
  }),
  (dl.prototype.push = function (A, e, t) {
    const r = t || {}
    ;(this.__rules__.push({ name: A, enabled: !0, fn: e, alt: r.alt || [] }),
      (this.__cache__ = null))
  }),
  (dl.prototype.enable = function (A, e) {
    Array.isArray(A) || (A = [A])
    const t = []
    return (
      A.forEach(function (A) {
        const r = this.__find__(A)
        if (r < 0) {
          if (e) return
          throw new Error('Rules manager: invalid rule name ' + A)
        }
        ;((this.__rules__[r].enabled = !0), t.push(A))
      }, this),
      (this.__cache__ = null),
      t
    )
  }),
  (dl.prototype.enableOnly = function (A, e) {
    ;(Array.isArray(A) || (A = [A]),
      this.__rules__.forEach(function (A) {
        A.enabled = !1
      }),
      this.enable(A, e))
  }),
  (dl.prototype.disable = function (A, e) {
    Array.isArray(A) || (A = [A])
    const t = []
    return (
      A.forEach(function (A) {
        const r = this.__find__(A)
        if (r < 0) {
          if (e) return
          throw new Error('Rules manager: invalid rule name ' + A)
        }
        ;((this.__rules__[r].enabled = !1), t.push(A))
      }, this),
      (this.__cache__ = null),
      t
    )
  }),
  (dl.prototype.getRules = function (A) {
    return (
      null === this.__cache__ && this.__compile__(),
      this.__cache__[A] || []
    )
  }),
  (Bl.prototype.attrIndex = function (A) {
    if (!this.attrs) return -1
    const e = this.attrs
    for (let t = 0, r = e.length; t < r; t++) if (e[t][0] === A) return t
    return -1
  }),
  (Bl.prototype.attrPush = function (A) {
    this.attrs ? this.attrs.push(A) : (this.attrs = [A])
  }),
  (Bl.prototype.attrSet = function (A, e) {
    const t = this.attrIndex(A),
      r = [A, e]
    t < 0 ? this.attrPush(r) : (this.attrs[t] = r)
  }),
  (Bl.prototype.attrGet = function (A) {
    const e = this.attrIndex(A)
    let t = null
    return (e >= 0 && (t = this.attrs[e][1]), t)
  }),
  (Bl.prototype.attrJoin = function (A, e) {
    const t = this.attrIndex(A)
    t < 0
      ? this.attrPush([A, e])
      : (this.attrs[t][1] = this.attrs[t][1] + ' ' + e)
  }),
  (pl.prototype.Token = Bl))
const gl = /\r\n?|\n/g,
  wl = /\0/g
function ml(A) {
  return /^<\/a\s*>/i.test(A)
}
const Cl = /\+-|\.\.|\?\?\?\?|!!!!|,,|--/,
  yl = /\((c|tm|r)\)/i,
  Ql = /\((c|tm|r)\)/gi,
  Fl = { c: '©', r: '®', tm: '™' }
function Ul(A, e) {
  return Fl[e.toLowerCase()]
}
function vl(A) {
  let e = 0
  for (let t = A.length - 1; t >= 0; t--) {
    const r = A[t]
    ;('text' !== r.type || e || (r.content = r.content.replace(Ql, Ul)),
      'link_open' === r.type && 'auto' === r.info && e--,
      'link_close' === r.type && 'auto' === r.info && e++)
  }
}
function bl(A) {
  let e = 0
  for (let t = A.length - 1; t >= 0; t--) {
    const r = A[t]
    ;('text' !== r.type ||
      e ||
      (Cl.test(r.content) &&
        (r.content = r.content
          .replace(/\+-/g, '±')
          .replace(/\.{2,}/g, '…')
          .replace(/([?!])…/g, '$1..')
          .replace(/([?!]){4,}/g, '$1$1$1')
          .replace(/,{2,}/g, ',')
          .replace(/(^|[^-])---(?=[^-]|$)/gm, '$1—')
          .replace(/(^|\s)--(?=\s|$)/gm, '$1–')
          .replace(/(^|[^-\s])--(?=[^-\s]|$)/gm, '$1–'))),
      'link_open' === r.type && 'auto' === r.info && e--,
      'link_close' === r.type && 'auto' === r.info && e++)
  }
}
const El = /['"]/,
  Hl = /['"]/g
function _l(A, e, t) {
  return A.slice(0, e) + t + A.slice(e + 1)
}
function Il(A, e) {
  let t
  const r = []
  for (let n = 0; n < A.length; n++) {
    const i = A[n],
      o = A[n].level
    for (t = r.length - 1; t >= 0 && !(r[t].level <= o); t--);
    if (((r.length = t + 1), 'text' !== i.type)) continue
    let s = i.content,
      a = 0,
      c = s.length
    A: for (; a < c; ) {
      Hl.lastIndex = a
      const u = Hl.exec(s)
      if (!u) break
      let l = !0,
        h = !0
      a = u.index + 1
      const f = "'" === u[0]
      let d = 32
      if (u.index - 1 >= 0) d = s.charCodeAt(u.index - 1)
      else
        for (
          t = n - 1;
          t >= 0 && 'softbreak' !== A[t].type && 'hardbreak' !== A[t].type;
          t--
        )
          if (A[t].content) {
            d = A[t].content.charCodeAt(A[t].content.length - 1)
            break
          }
      let B = 32
      if (a < c) B = s.charCodeAt(a)
      else
        for (
          t = n + 1;
          t < A.length &&
          'softbreak' !== A[t].type &&
          'hardbreak' !== A[t].type;
          t++
        )
          if (A[t].content) {
            B = A[t].content.charCodeAt(0)
            break
          }
      const p = sl(d) || ol(String.fromCharCode(d)),
        g = sl(B) || ol(String.fromCharCode(B)),
        w = il(d),
        m = il(B)
      if (
        (m ? (l = !1) : g && (w || p || (l = !1)),
        w ? (h = !1) : p && (m || g || (h = !1)),
        34 === B && '"' === u[0] && d >= 48 && d <= 57 && (h = l = !1),
        l && h && ((l = p), (h = g)),
        l || h)
      ) {
        if (h)
          for (t = r.length - 1; t >= 0; t--) {
            let l = r[t]
            if (r[t].level < o) break
            if (l.single === f && r[t].level === o) {
              let o, h
              ;((l = r[t]),
                f
                  ? ((o = e.md.options.quotes[2]), (h = e.md.options.quotes[3]))
                  : ((o = e.md.options.quotes[0]),
                    (h = e.md.options.quotes[1])),
                (i.content = _l(i.content, u.index, h)),
                (A[l.token].content = _l(A[l.token].content, l.pos, o)),
                (a += h.length - 1),
                l.token === n && (a += o.length - 1),
                (s = i.content),
                (c = s.length),
                (r.length = t))
              continue A
            }
          }
        l
          ? r.push({ token: n, pos: u.index, single: f, level: o })
          : h && f && (i.content = _l(i.content, u.index, '’'))
      } else f && (i.content = _l(i.content, u.index, '’'))
    }
  }
}
const Dl = [
  [
    'normalize',
    function (A) {
      let e
      ;((e = A.src.replace(gl, '\n')), (e = e.replace(wl, '�')), (A.src = e))
    },
  ],
  [
    'block',
    function (A) {
      let e
      A.inlineMode
        ? ((e = new A.Token('inline', '', 0)),
          (e.content = A.src),
          (e.map = [0, 1]),
          (e.children = []),
          A.tokens.push(e))
        : A.md.block.parse(A.src, A.md, A.env, A.tokens)
    },
  ],
  [
    'inline',
    function (A) {
      const e = A.tokens
      for (let t = 0, r = e.length; t < r; t++) {
        const r = e[t]
        'inline' === r.type &&
          A.md.inline.parse(r.content, A.md, A.env, r.children)
      }
    },
  ],
  [
    'linkify',
    function (A) {
      const e = A.tokens
      var t
      if (A.md.options.linkify)
        for (let r = 0, n = e.length; r < n; r++) {
          if ('inline' !== e[r].type || !A.md.linkify.pretest(e[r].content))
            continue
          let n = e[r].children,
            i = 0
          for (let o = n.length - 1; o >= 0; o--) {
            const s = n[o]
            if ('link_close' !== s.type) {
              if (
                ('html_inline' === s.type &&
                  ((t = s.content),
                  /^<a[>\s]/i.test(t) && i > 0 && i--,
                  ml(s.content) && i++),
                !(i > 0) && 'text' === s.type && A.md.linkify.test(s.content))
              ) {
                const t = s.content
                let i = A.md.linkify.match(t)
                const a = []
                let c = s.level,
                  u = 0
                i.length > 0 &&
                  0 === i[0].index &&
                  o > 0 &&
                  'text_special' === n[o - 1].type &&
                  (i = i.slice(1))
                for (let e = 0; e < i.length; e++) {
                  const r = i[e].url,
                    n = A.md.normalizeLink(r)
                  if (!A.md.validateLink(n)) continue
                  let o = i[e].text
                  o = i[e].schema
                    ? 'mailto:' !== i[e].schema || /^mailto:/i.test(o)
                      ? A.md.normalizeLinkText(o)
                      : A.md
                          .normalizeLinkText('mailto:' + o)
                          .replace(/^mailto:/, '')
                    : A.md
                        .normalizeLinkText('http://' + o)
                        .replace(/^http:\/\//, '')
                  const s = i[e].index
                  if (s > u) {
                    const e = new A.Token('text', '', 0)
                    ;((e.content = t.slice(u, s)), (e.level = c), a.push(e))
                  }
                  const l = new A.Token('link_open', 'a', 1)
                  ;((l.attrs = [['href', n]]),
                    (l.level = c++),
                    (l.markup = 'linkify'),
                    (l.info = 'auto'),
                    a.push(l))
                  const h = new A.Token('text', '', 0)
                  ;((h.content = o), (h.level = c), a.push(h))
                  const f = new A.Token('link_close', 'a', -1)
                  ;((f.level = --c),
                    (f.markup = 'linkify'),
                    (f.info = 'auto'),
                    a.push(f),
                    (u = i[e].lastIndex))
                }
                if (u < t.length) {
                  const e = new A.Token('text', '', 0)
                  ;((e.content = t.slice(u)), (e.level = c), a.push(e))
                }
                e[r].children = n = zu(n, o, a)
              }
            } else
              for (o--; n[o].level !== s.level && 'link_open' !== n[o].type; )
                o--
          }
        }
    },
  ],
  [
    'replacements',
    function (A) {
      let e
      if (A.md.options.typographer)
        for (e = A.tokens.length - 1; e >= 0; e--)
          'inline' === A.tokens[e].type &&
            (yl.test(A.tokens[e].content) && vl(A.tokens[e].children),
            Cl.test(A.tokens[e].content) && bl(A.tokens[e].children))
    },
  ],
  [
    'smartquotes',
    function (A) {
      if (A.md.options.typographer)
        for (let e = A.tokens.length - 1; e >= 0; e--)
          'inline' === A.tokens[e].type &&
            El.test(A.tokens[e].content) &&
            Il(A.tokens[e].children, A)
    },
  ],
  [
    'text_join',
    function (A) {
      let e, t
      const r = A.tokens,
        n = r.length
      for (let i = 0; i < n; i++) {
        if ('inline' !== r[i].type) continue
        const A = r[i].children,
          n = A.length
        for (e = 0; e < n; e++)
          'text_special' === A[e].type && (A[e].type = 'text')
        for (e = t = 0; e < n; e++)
          'text' === A[e].type && e + 1 < n && 'text' === A[e + 1].type
            ? (A[e + 1].content = A[e].content + A[e + 1].content)
            : (e !== t && (A[t] = A[e]), t++)
        e !== t && (A.length = t)
      }
    },
  ],
]
function xl() {
  this.ruler = new dl()
  for (let A = 0; A < Dl.length; A++) this.ruler.push(Dl[A][0], Dl[A][1])
}
function kl(A, e, t, r) {
  ;((this.src = A),
    (this.md = e),
    (this.env = t),
    (this.tokens = r),
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
    (this.level = 0))
  const n = this.src
  for (let i = 0, o = 0, s = 0, a = 0, c = n.length, u = !1; o < c; o++) {
    const A = n.charCodeAt(o)
    if (!u) {
      if (nl(A)) {
        ;(s++, 9 === A ? (a += 4 - (a % 4)) : a++)
        continue
      }
      u = !0
    }
    ;(10 !== A && o !== c - 1) ||
      (10 !== A && o++,
      this.bMarks.push(i),
      this.eMarks.push(o),
      this.tShift.push(s),
      this.sCount.push(a),
      this.bsCount.push(0),
      (u = !1),
      (s = 0),
      (a = 0),
      (i = o + 1))
  }
  ;(this.bMarks.push(n.length),
    this.eMarks.push(n.length),
    this.tShift.push(0),
    this.sCount.push(0),
    this.bsCount.push(0),
    (this.lineMax = this.bMarks.length - 1))
}
;((xl.prototype.process = function (A) {
  const e = this.ruler.getRules('')
  for (let t = 0, r = e.length; t < r; t++) e[t](A)
}),
  (xl.prototype.State = pl),
  (kl.prototype.push = function (A, e, t) {
    const r = new Bl(A, e, t)
    return (
      (r.block = !0),
      t < 0 && this.level--,
      (r.level = this.level),
      t > 0 && this.level++,
      this.tokens.push(r),
      r
    )
  }),
  (kl.prototype.isEmpty = function (A) {
    return this.bMarks[A] + this.tShift[A] >= this.eMarks[A]
  }),
  (kl.prototype.skipEmptyLines = function (A) {
    for (
      let e = this.lineMax;
      A < e && !(this.bMarks[A] + this.tShift[A] < this.eMarks[A]);
      A++
    );
    return A
  }),
  (kl.prototype.skipSpaces = function (A) {
    for (let e = this.src.length; A < e; A++) {
      if (!nl(this.src.charCodeAt(A))) break
    }
    return A
  }),
  (kl.prototype.skipSpacesBack = function (A, e) {
    if (A <= e) return A
    for (; A > e; ) if (!nl(this.src.charCodeAt(--A))) return A + 1
    return A
  }),
  (kl.prototype.skipChars = function (A, e) {
    for (let t = this.src.length; A < t && this.src.charCodeAt(A) === e; A++);
    return A
  }),
  (kl.prototype.skipCharsBack = function (A, e, t) {
    if (A <= t) return A
    for (; A > t; ) if (e !== this.src.charCodeAt(--A)) return A + 1
    return A
  }),
  (kl.prototype.getLines = function (A, e, t, r) {
    if (A >= e) return ''
    const n = new Array(e - A)
    for (let i = 0, o = A; o < e; o++, i++) {
      let A = 0
      const s = this.bMarks[o]
      let a,
        c = s
      for (
        a = o + 1 < e || r ? this.eMarks[o] + 1 : this.eMarks[o];
        c < a && A < t;

      ) {
        const e = this.src.charCodeAt(c)
        if (nl(e)) 9 === e ? (A += 4 - ((A + this.bsCount[o]) % 4)) : A++
        else {
          if (!(c - s < this.tShift[o])) break
          A++
        }
        c++
      }
      n[i] =
        A > t
          ? new Array(A - t + 1).join(' ') + this.src.slice(c, a)
          : this.src.slice(c, a)
    }
    return n.join('')
  }),
  (kl.prototype.Token = Bl))
function Ll(A, e) {
  const t = A.bMarks[e] + A.tShift[e],
    r = A.eMarks[e]
  return A.src.slice(t, r)
}
function Sl(A) {
  const e = [],
    t = A.length
  let r = 0,
    n = A.charCodeAt(r),
    i = !1,
    o = 0,
    s = ''
  for (; r < t; )
    (124 === n &&
      (i
        ? ((s += A.substring(o, r - 1)), (o = r))
        : (e.push(s + A.substring(o, r)), (s = ''), (o = r + 1))),
      (i = 92 === n),
      r++,
      (n = A.charCodeAt(r)))
  return (e.push(s + A.substring(o)), e)
}
function Ol(A, e) {
  const t = A.eMarks[e]
  let r = A.bMarks[e] + A.tShift[e]
  const n = A.src.charCodeAt(r++)
  if (42 !== n && 45 !== n && 43 !== n) return -1
  if (r < t) {
    if (!nl(A.src.charCodeAt(r))) return -1
  }
  return r
}
function Kl(A, e) {
  const t = A.bMarks[e] + A.tShift[e],
    r = A.eMarks[e]
  let n = t
  if (n + 1 >= r) return -1
  let i = A.src.charCodeAt(n++)
  if (i < 48 || i > 57) return -1
  for (;;) {
    if (n >= r) return -1
    if (((i = A.src.charCodeAt(n++)), !(i >= 48 && i <= 57))) {
      if (41 === i || 46 === i) break
      return -1
    }
    if (n - t >= 10) return -1
  }
  return n < r && ((i = A.src.charCodeAt(n)), !nl(i)) ? -1 : n
}
const Tl =
    '<[A-Za-z][A-Za-z0-9\\-]*(?:\\s+[a-zA-Z_:][a-zA-Z0-9:._-]*(?:\\s*=\\s*(?:[^"\'=<>`\\x00-\\x20]+|\'[^\']*\'|"[^"]*"))?)*\\s*\\/?>',
  Ml = '<\\/[A-Za-z][A-Za-z0-9\\-]*\\s*>',
  Rl = new RegExp(
    '^(?:' +
      Tl +
      '|' +
      Ml +
      '|\x3c!---?>|\x3c!--(?:[^-]|-[^-]|--[^>])*--\x3e|<[?][\\s\\S]*?[?]>|<![A-Za-z][^>]*>|<!\\[CDATA\\[[\\s\\S]*?\\]\\]>)',
  ),
  Nl = new RegExp('^(?:' + Tl + '|' + Ml + ')'),
  Pl = [
    [
      /^<(script|pre|style|textarea)(?=(\s|>|$))/i,
      /<\/(script|pre|style|textarea)>/i,
      !0,
    ],
    [/^<!--/, /-->/, !0],
    [/^<\?/, /\?>/, !0],
    [/^<![A-Z]/, />/, !0],
    [/^<!\[CDATA\[/, /\]\]>/, !0],
    [
      new RegExp(
        '^</?(' +
          [
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
          ].join('|') +
          ')(?=(\\s|/?>|$))',
        'i',
      ),
      /^$/,
      !0,
    ],
    [new RegExp(Nl.source + '\\s*$'), /^$/, !1],
  ]
const Vl = [
  [
    'table',
    function (A, e, t, r) {
      if (e + 2 > t) return !1
      let n = e + 1
      if (A.sCount[n] < A.blkIndent) return !1
      if (A.sCount[n] - A.blkIndent >= 4) return !1
      let i = A.bMarks[n] + A.tShift[n]
      if (i >= A.eMarks[n]) return !1
      const o = A.src.charCodeAt(i++)
      if (124 !== o && 45 !== o && 58 !== o) return !1
      if (i >= A.eMarks[n]) return !1
      const s = A.src.charCodeAt(i++)
      if (124 !== s && 45 !== s && 58 !== s && !nl(s)) return !1
      if (45 === o && nl(s)) return !1
      for (; i < A.eMarks[n]; ) {
        const e = A.src.charCodeAt(i)
        if (124 !== e && 45 !== e && 58 !== e && !nl(e)) return !1
        i++
      }
      let a = Ll(A, e + 1),
        c = a.split('|')
      const u = []
      for (let g = 0; g < c.length; g++) {
        const A = c[g].trim()
        if (!A) {
          if (0 === g || g === c.length - 1) continue
          return !1
        }
        if (!/^:?-+:?$/.test(A)) return !1
        58 === A.charCodeAt(A.length - 1)
          ? u.push(58 === A.charCodeAt(0) ? 'center' : 'right')
          : 58 === A.charCodeAt(0)
            ? u.push('left')
            : u.push('')
      }
      if (((a = Ll(A, e).trim()), -1 === a.indexOf('|'))) return !1
      if (A.sCount[e] - A.blkIndent >= 4) return !1
      ;((c = Sl(a)),
        c.length && '' === c[0] && c.shift(),
        c.length && '' === c[c.length - 1] && c.pop())
      const l = c.length
      if (0 === l || l !== u.length) return !1
      if (r) return !0
      const h = A.parentType
      A.parentType = 'table'
      const f = A.md.block.ruler.getRules('blockquote'),
        d = [e, 0]
      ;((A.push('table_open', 'table', 1).map = d),
        (A.push('thead_open', 'thead', 1).map = [e, e + 1]),
        (A.push('tr_open', 'tr', 1).map = [e, e + 1]))
      for (let g = 0; g < c.length; g++) {
        const e = A.push('th_open', 'th', 1)
        u[g] && (e.attrs = [['style', 'text-align:' + u[g]]])
        const t = A.push('inline', '', 0)
        ;((t.content = c[g].trim()),
          (t.children = []),
          A.push('th_close', 'th', -1))
      }
      let B
      ;(A.push('tr_close', 'tr', -1), A.push('thead_close', 'thead', -1))
      let p = 0
      for (n = e + 2; n < t && !(A.sCount[n] < A.blkIndent); n++) {
        let r = !1
        for (let e = 0, i = f.length; e < i; e++)
          if (f[e](A, n, t, !0)) {
            r = !0
            break
          }
        if (r) break
        if (((a = Ll(A, n).trim()), !a)) break
        if (A.sCount[n] - A.blkIndent >= 4) break
        if (
          ((c = Sl(a)),
          c.length && '' === c[0] && c.shift(),
          c.length && '' === c[c.length - 1] && c.pop(),
          (p += l - c.length),
          p > 65536)
        )
          break
        if (n === e + 2) {
          A.push('tbody_open', 'tbody', 1).map = B = [e + 2, 0]
        }
        A.push('tr_open', 'tr', 1).map = [n, n + 1]
        for (let e = 0; e < l; e++) {
          const t = A.push('td_open', 'td', 1)
          u[e] && (t.attrs = [['style', 'text-align:' + u[e]]])
          const r = A.push('inline', '', 0)
          ;((r.content = c[e] ? c[e].trim() : ''),
            (r.children = []),
            A.push('td_close', 'td', -1))
        }
        A.push('tr_close', 'tr', -1)
      }
      return (
        B && (A.push('tbody_close', 'tbody', -1), (B[1] = n)),
        A.push('table_close', 'table', -1),
        (d[1] = n),
        (A.parentType = h),
        (A.line = n),
        !0
      )
    },
    ['paragraph', 'reference'],
  ],
  [
    'code',
    function (A, e, t) {
      if (A.sCount[e] - A.blkIndent < 4) return !1
      let r = e + 1,
        n = r
      for (; r < t; )
        if (A.isEmpty(r)) r++
        else {
          if (!(A.sCount[r] - A.blkIndent >= 4)) break
          ;(r++, (n = r))
        }
      A.line = n
      const i = A.push('code_block', 'code', 0)
      return (
        (i.content = A.getLines(e, n, 4 + A.blkIndent, !1) + '\n'),
        (i.map = [e, A.line]),
        !0
      )
    },
  ],
  [
    'fence',
    function (A, e, t, r) {
      let n = A.bMarks[e] + A.tShift[e],
        i = A.eMarks[e]
      if (A.sCount[e] - A.blkIndent >= 4) return !1
      if (n + 3 > i) return !1
      const o = A.src.charCodeAt(n)
      if (126 !== o && 96 !== o) return !1
      let s = n
      n = A.skipChars(n, o)
      let a = n - s
      if (a < 3) return !1
      const c = A.src.slice(s, n),
        u = A.src.slice(n, i)
      if (96 === o && u.indexOf(String.fromCharCode(o)) >= 0) return !1
      if (r) return !0
      let l = e,
        h = !1
      for (
        ;
        (l++, !(l >= t)) &&
        ((n = s = A.bMarks[l] + A.tShift[l]),
        (i = A.eMarks[l]),
        !(n < i && A.sCount[l] < A.blkIndent));

      )
        if (
          A.src.charCodeAt(n) === o &&
          !(
            A.sCount[l] - A.blkIndent >= 4 ||
            ((n = A.skipChars(n, o)),
            n - s < a || ((n = A.skipSpaces(n)), n < i))
          )
        ) {
          h = !0
          break
        }
      ;((a = A.sCount[e]), (A.line = l + (h ? 1 : 0)))
      const f = A.push('fence', 'code', 0)
      return (
        (f.info = u),
        (f.content = A.getLines(e + 1, l, a, !0)),
        (f.markup = c),
        (f.map = [e, A.line]),
        !0
      )
    },
    ['paragraph', 'reference', 'blockquote', 'list'],
  ],
  [
    'blockquote',
    function (A, e, t, r) {
      let n = A.bMarks[e] + A.tShift[e],
        i = A.eMarks[e]
      const o = A.lineMax
      if (A.sCount[e] - A.blkIndent >= 4) return !1
      if (62 !== A.src.charCodeAt(n)) return !1
      if (r) return !0
      const s = [],
        a = [],
        c = [],
        u = [],
        l = A.md.block.ruler.getRules('blockquote'),
        h = A.parentType
      A.parentType = 'blockquote'
      let f,
        d = !1
      for (f = e; f < t; f++) {
        const e = A.sCount[f] < A.blkIndent
        if (((n = A.bMarks[f] + A.tShift[f]), (i = A.eMarks[f]), n >= i)) break
        if (62 === A.src.charCodeAt(n++) && !e) {
          let e,
            t,
            r = A.sCount[f] + 1
          32 === A.src.charCodeAt(n)
            ? (n++, r++, (t = !1), (e = !0))
            : 9 === A.src.charCodeAt(n)
              ? ((e = !0),
                (A.bsCount[f] + r) % 4 == 3 ? (n++, r++, (t = !1)) : (t = !0))
              : (e = !1)
          let o = r
          for (s.push(A.bMarks[f]), A.bMarks[f] = n; n < i; ) {
            const e = A.src.charCodeAt(n)
            if (!nl(e)) break
            ;(9 === e ? (o += 4 - ((o + A.bsCount[f] + (t ? 1 : 0)) % 4)) : o++,
              n++)
          }
          ;((d = n >= i),
            a.push(A.bsCount[f]),
            (A.bsCount[f] = A.sCount[f] + 1 + (e ? 1 : 0)),
            c.push(A.sCount[f]),
            (A.sCount[f] = o - r),
            u.push(A.tShift[f]),
            (A.tShift[f] = n - A.bMarks[f]))
          continue
        }
        if (d) break
        let r = !1
        for (let n = 0, i = l.length; n < i; n++)
          if (l[n](A, f, t, !0)) {
            r = !0
            break
          }
        if (r) {
          ;((A.lineMax = f),
            0 !== A.blkIndent &&
              (s.push(A.bMarks[f]),
              a.push(A.bsCount[f]),
              u.push(A.tShift[f]),
              c.push(A.sCount[f]),
              (A.sCount[f] -= A.blkIndent)))
          break
        }
        ;(s.push(A.bMarks[f]),
          a.push(A.bsCount[f]),
          u.push(A.tShift[f]),
          c.push(A.sCount[f]),
          (A.sCount[f] = -1))
      }
      const B = A.blkIndent
      A.blkIndent = 0
      const p = A.push('blockquote_open', 'blockquote', 1)
      p.markup = '>'
      const g = [e, 0]
      ;((p.map = g),
        A.md.block.tokenize(A, e, f),
        (A.push('blockquote_close', 'blockquote', -1).markup = '>'),
        (A.lineMax = o),
        (A.parentType = h),
        (g[1] = A.line))
      for (let w = 0; w < u.length; w++)
        ((A.bMarks[w + e] = s[w]),
          (A.tShift[w + e] = u[w]),
          (A.sCount[w + e] = c[w]),
          (A.bsCount[w + e] = a[w]))
      return ((A.blkIndent = B), !0)
    },
    ['paragraph', 'reference', 'blockquote', 'list'],
  ],
  [
    'hr',
    function (A, e, t, r) {
      const n = A.eMarks[e]
      if (A.sCount[e] - A.blkIndent >= 4) return !1
      let i = A.bMarks[e] + A.tShift[e]
      const o = A.src.charCodeAt(i++)
      if (42 !== o && 45 !== o && 95 !== o) return !1
      let s = 1
      for (; i < n; ) {
        const e = A.src.charCodeAt(i++)
        if (e !== o && !nl(e)) return !1
        e === o && s++
      }
      if (s < 3) return !1
      if (r) return !0
      A.line = e + 1
      const a = A.push('hr', 'hr', 0)
      return (
        (a.map = [e, A.line]),
        (a.markup = Array(s + 1).join(String.fromCharCode(o))),
        !0
      )
    },
    ['paragraph', 'reference', 'blockquote', 'list'],
  ],
  [
    'list',
    function (A, e, t, r) {
      let n,
        i,
        o,
        s,
        a = e,
        c = !0
      if (A.sCount[a] - A.blkIndent >= 4) return !1
      if (
        A.listIndent >= 0 &&
        A.sCount[a] - A.listIndent >= 4 &&
        A.sCount[a] < A.blkIndent
      )
        return !1
      let u,
        l,
        h,
        f = !1
      if (
        (r &&
          'paragraph' === A.parentType &&
          A.sCount[a] >= A.blkIndent &&
          (f = !0),
        (h = Kl(A, a)) >= 0)
      ) {
        if (
          ((u = !0),
          (o = A.bMarks[a] + A.tShift[a]),
          (l = Number(A.src.slice(o, h - 1))),
          f && 1 !== l)
        )
          return !1
      } else {
        if (!((h = Ol(A, a)) >= 0)) return !1
        u = !1
      }
      if (f && A.skipSpaces(h) >= A.eMarks[a]) return !1
      if (r) return !0
      const d = A.src.charCodeAt(h - 1),
        B = A.tokens.length
      u
        ? ((s = A.push('ordered_list_open', 'ol', 1)),
          1 !== l && (s.attrs = [['start', l]]))
        : (s = A.push('bullet_list_open', 'ul', 1))
      const p = [a, 0]
      ;((s.map = p), (s.markup = String.fromCharCode(d)))
      let g = !1
      const w = A.md.block.ruler.getRules('list'),
        m = A.parentType
      for (A.parentType = 'list'; a < t; ) {
        ;((i = h), (n = A.eMarks[a]))
        const e = A.sCount[a] + h - (A.bMarks[a] + A.tShift[a])
        let r = e
        for (; i < n; ) {
          const e = A.src.charCodeAt(i)
          if (9 === e) r += 4 - ((r + A.bsCount[a]) % 4)
          else {
            if (32 !== e) break
            r++
          }
          i++
        }
        const l = i
        let f
        ;((f = l >= n ? 1 : r - e), f > 4 && (f = 1))
        const B = e + f
        ;((s = A.push('list_item_open', 'li', 1)),
          (s.markup = String.fromCharCode(d)))
        const p = [a, 0]
        ;((s.map = p), u && (s.info = A.src.slice(o, h - 1)))
        const m = A.tight,
          C = A.tShift[a],
          y = A.sCount[a],
          Q = A.listIndent
        if (
          ((A.listIndent = A.blkIndent),
          (A.blkIndent = B),
          (A.tight = !0),
          (A.tShift[a] = l - A.bMarks[a]),
          (A.sCount[a] = r),
          l >= n && A.isEmpty(a + 1)
            ? (A.line = Math.min(A.line + 2, t))
            : A.md.block.tokenize(A, a, t, !0),
          (A.tight && !g) || (c = !1),
          (g = A.line - a > 1 && A.isEmpty(A.line - 1)),
          (A.blkIndent = A.listIndent),
          (A.listIndent = Q),
          (A.tShift[a] = C),
          (A.sCount[a] = y),
          (A.tight = m),
          (s = A.push('list_item_close', 'li', -1)),
          (s.markup = String.fromCharCode(d)),
          (a = A.line),
          (p[1] = a),
          a >= t)
        )
          break
        if (A.sCount[a] < A.blkIndent) break
        if (A.sCount[a] - A.blkIndent >= 4) break
        let F = !1
        for (let n = 0, i = w.length; n < i; n++)
          if (w[n](A, a, t, !0)) {
            F = !0
            break
          }
        if (F) break
        if (u) {
          if (((h = Kl(A, a)), h < 0)) break
          o = A.bMarks[a] + A.tShift[a]
        } else if (((h = Ol(A, a)), h < 0)) break
        if (d !== A.src.charCodeAt(h - 1)) break
      }
      return (
        (s = u
          ? A.push('ordered_list_close', 'ol', -1)
          : A.push('bullet_list_close', 'ul', -1)),
        (s.markup = String.fromCharCode(d)),
        (p[1] = a),
        (A.line = a),
        (A.parentType = m),
        c &&
          (function (A, e) {
            const t = A.level + 2
            for (let r = e + 2, n = A.tokens.length - 2; r < n; r++)
              A.tokens[r].level === t &&
                'paragraph_open' === A.tokens[r].type &&
                ((A.tokens[r + 2].hidden = !0),
                (A.tokens[r].hidden = !0),
                (r += 2))
          })(A, B),
        !0
      )
    },
    ['paragraph', 'reference', 'blockquote'],
  ],
  [
    'reference',
    function (A, e, t, r) {
      let n = A.bMarks[e] + A.tShift[e],
        i = A.eMarks[e],
        o = e + 1
      if (A.sCount[e] - A.blkIndent >= 4) return !1
      if (91 !== A.src.charCodeAt(n)) return !1
      function s(e) {
        const t = A.lineMax
        if (e >= t || A.isEmpty(e)) return null
        let r = !1
        if (
          (A.sCount[e] - A.blkIndent > 3 && (r = !0),
          A.sCount[e] < 0 && (r = !0),
          !r)
        ) {
          const r = A.md.block.ruler.getRules('reference'),
            n = A.parentType
          A.parentType = 'reference'
          let i = !1
          for (let o = 0, s = r.length; o < s; o++)
            if (r[o](A, e, t, !0)) {
              i = !0
              break
            }
          if (((A.parentType = n), i)) return null
        }
        const n = A.bMarks[e] + A.tShift[e],
          i = A.eMarks[e]
        return A.src.slice(n, i + 1)
      }
      let a = A.src.slice(n, i + 1)
      i = a.length
      let c = -1
      for (n = 1; n < i; n++) {
        const A = a.charCodeAt(n)
        if (91 === A) return !1
        if (93 === A) {
          c = n
          break
        }
        if (10 === A) {
          const A = s(o)
          null !== A && ((a += A), (i = a.length), o++)
        } else if (92 === A && (n++, n < i && 10 === a.charCodeAt(n))) {
          const A = s(o)
          null !== A && ((a += A), (i = a.length), o++)
        }
      }
      if (c < 0 || 58 !== a.charCodeAt(c + 1)) return !1
      for (n = c + 2; n < i; n++) {
        const A = a.charCodeAt(n)
        if (10 === A) {
          const A = s(o)
          null !== A && ((a += A), (i = a.length), o++)
        } else if (!nl(A)) break
      }
      const u = A.md.helpers.parseLinkDestination(a, n, i)
      if (!u.ok) return !1
      const l = A.md.normalizeLink(u.str)
      if (!A.md.validateLink(l)) return !1
      n = u.pos
      const h = n,
        f = o,
        d = n
      for (; n < i; n++) {
        const A = a.charCodeAt(n)
        if (10 === A) {
          const A = s(o)
          null !== A && ((a += A), (i = a.length), o++)
        } else if (!nl(A)) break
      }
      let B,
        p = A.md.helpers.parseLinkTitle(a, n, i)
      for (; p.can_continue; ) {
        const e = s(o)
        if (null === e) break
        ;((a += e),
          (n = i),
          (i = a.length),
          o++,
          (p = A.md.helpers.parseLinkTitle(a, n, i, p)))
      }
      for (
        n < i && d !== n && p.ok
          ? ((B = p.str), (n = p.pos))
          : ((B = ''), (n = h), (o = f));
        n < i;

      ) {
        if (!nl(a.charCodeAt(n))) break
        n++
      }
      if (n < i && 10 !== a.charCodeAt(n) && B)
        for (B = '', n = h, o = f; n < i; ) {
          if (!nl(a.charCodeAt(n))) break
          n++
        }
      if (n < i && 10 !== a.charCodeAt(n)) return !1
      const g = al(a.slice(1, c))
      return (
        !!g &&
        (r ||
          (void 0 === A.env.references && (A.env.references = {}),
          void 0 === A.env.references[g] &&
            (A.env.references[g] = { title: B, href: l }),
          (A.line = o)),
        !0)
      )
    },
  ],
  [
    'html_block',
    function (A, e, t, r) {
      let n = A.bMarks[e] + A.tShift[e],
        i = A.eMarks[e]
      if (A.sCount[e] - A.blkIndent >= 4) return !1
      if (!A.md.options.html) return !1
      if (60 !== A.src.charCodeAt(n)) return !1
      let o = A.src.slice(n, i),
        s = 0
      for (; s < Pl.length && !Pl[s][0].test(o); s++);
      if (s === Pl.length) return !1
      if (r) return Pl[s][2]
      let a = e + 1
      if (!Pl[s][1].test(o))
        for (; a < t && !(A.sCount[a] < A.blkIndent); a++)
          if (
            ((n = A.bMarks[a] + A.tShift[a]),
            (i = A.eMarks[a]),
            (o = A.src.slice(n, i)),
            Pl[s][1].test(o))
          ) {
            0 !== o.length && a++
            break
          }
      A.line = a
      const c = A.push('html_block', '', 0)
      return (
        (c.map = [e, a]),
        (c.content = A.getLines(e, a, A.blkIndent, !0)),
        !0
      )
    },
    ['paragraph', 'reference', 'blockquote'],
  ],
  [
    'heading',
    function (A, e, t, r) {
      let n = A.bMarks[e] + A.tShift[e],
        i = A.eMarks[e]
      if (A.sCount[e] - A.blkIndent >= 4) return !1
      let o = A.src.charCodeAt(n)
      if (35 !== o || n >= i) return !1
      let s = 1
      for (o = A.src.charCodeAt(++n); 35 === o && n < i && s <= 6; )
        (s++, (o = A.src.charCodeAt(++n)))
      if (s > 6 || (n < i && !nl(o))) return !1
      if (r) return !0
      i = A.skipSpacesBack(i, n)
      const a = A.skipCharsBack(i, 35, n)
      ;(a > n && nl(A.src.charCodeAt(a - 1)) && (i = a), (A.line = e + 1))
      const c = A.push('heading_open', 'h' + String(s), 1)
      ;((c.markup = '########'.slice(0, s)), (c.map = [e, A.line]))
      const u = A.push('inline', '', 0)
      return (
        (u.content = A.src.slice(n, i).trim()),
        (u.map = [e, A.line]),
        (u.children = []),
        (A.push('heading_close', 'h' + String(s), -1).markup = '########'.slice(
          0,
          s,
        )),
        !0
      )
    },
    ['paragraph', 'reference', 'blockquote'],
  ],
  [
    'lheading',
    function (A, e, t) {
      const r = A.md.block.ruler.getRules('paragraph')
      if (A.sCount[e] - A.blkIndent >= 4) return !1
      const n = A.parentType
      A.parentType = 'paragraph'
      let i,
        o = 0,
        s = e + 1
      for (; s < t && !A.isEmpty(s); s++) {
        if (A.sCount[s] - A.blkIndent > 3) continue
        if (A.sCount[s] >= A.blkIndent) {
          let e = A.bMarks[s] + A.tShift[s]
          const t = A.eMarks[s]
          if (
            e < t &&
            ((i = A.src.charCodeAt(e)),
            (45 === i || 61 === i) &&
              ((e = A.skipChars(e, i)), (e = A.skipSpaces(e)), e >= t))
          ) {
            o = 61 === i ? 1 : 2
            break
          }
        }
        if (A.sCount[s] < 0) continue
        let e = !1
        for (let n = 0, i = r.length; n < i; n++)
          if (r[n](A, s, t, !0)) {
            e = !0
            break
          }
        if (e) break
      }
      if (!o) return !1
      const a = A.getLines(e, s, A.blkIndent, !1).trim()
      A.line = s + 1
      const c = A.push('heading_open', 'h' + String(o), 1)
      ;((c.markup = String.fromCharCode(i)), (c.map = [e, A.line]))
      const u = A.push('inline', '', 0)
      return (
        (u.content = a),
        (u.map = [e, A.line - 1]),
        (u.children = []),
        (A.push('heading_close', 'h' + String(o), -1).markup =
          String.fromCharCode(i)),
        (A.parentType = n),
        !0
      )
    },
  ],
  [
    'paragraph',
    function (A, e, t) {
      const r = A.md.block.ruler.getRules('paragraph'),
        n = A.parentType
      let i = e + 1
      for (A.parentType = 'paragraph'; i < t && !A.isEmpty(i); i++) {
        if (A.sCount[i] - A.blkIndent > 3) continue
        if (A.sCount[i] < 0) continue
        let e = !1
        for (let n = 0, o = r.length; n < o; n++)
          if (r[n](A, i, t, !0)) {
            e = !0
            break
          }
        if (e) break
      }
      const o = A.getLines(e, i, A.blkIndent, !1).trim()
      ;((A.line = i), (A.push('paragraph_open', 'p', 1).map = [e, A.line]))
      const s = A.push('inline', '', 0)
      return (
        (s.content = o),
        (s.map = [e, A.line]),
        (s.children = []),
        A.push('paragraph_close', 'p', -1),
        (A.parentType = n),
        !0
      )
    },
  ],
]
function Gl() {
  this.ruler = new dl()
  for (let A = 0; A < Vl.length; A++)
    this.ruler.push(Vl[A][0], Vl[A][1], { alt: (Vl[A][2] || []).slice() })
}
function zl(A, e, t, r) {
  ;((this.src = A),
    (this.env = t),
    (this.md = e),
    (this.tokens = r),
    (this.tokens_meta = Array(r.length)),
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
    (this.linkLevel = 0))
}
function jl(A) {
  switch (A) {
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
;((Gl.prototype.tokenize = function (A, e, t) {
  const r = this.ruler.getRules(''),
    n = r.length,
    i = A.md.options.maxNesting
  let o = e,
    s = !1
  for (
    ;
    o < t &&
    ((A.line = o = A.skipEmptyLines(o)), !(o >= t)) &&
    !(A.sCount[o] < A.blkIndent);

  ) {
    if (A.level >= i) {
      A.line = t
      break
    }
    const e = A.line
    let a = !1
    for (let i = 0; i < n; i++)
      if (((a = r[i](A, o, t, !1)), a)) {
        if (e >= A.line)
          throw new Error("block rule didn't increment state.line")
        break
      }
    if (!a) throw new Error('none of the block rules matched')
    ;((A.tight = !s),
      A.isEmpty(A.line - 1) && (s = !0),
      (o = A.line),
      o < t && A.isEmpty(o) && ((s = !0), o++, (A.line = o)))
  }
}),
  (Gl.prototype.parse = function (A, e, t, r) {
    if (!A) return
    const n = new this.State(A, e, t, r)
    this.tokenize(n, n.line, n.lineMax)
  }),
  (Gl.prototype.State = kl),
  (zl.prototype.pushPending = function () {
    const A = new Bl('text', '', 0)
    return (
      (A.content = this.pending),
      (A.level = this.pendingLevel),
      this.tokens.push(A),
      (this.pending = ''),
      A
    )
  }),
  (zl.prototype.push = function (A, e, t) {
    this.pending && this.pushPending()
    const r = new Bl(A, e, t)
    let n = null
    return (
      t < 0 && (this.level--, (this.delimiters = this._prev_delimiters.pop())),
      (r.level = this.level),
      t > 0 &&
        (this.level++,
        this._prev_delimiters.push(this.delimiters),
        (this.delimiters = []),
        (n = { delimiters: this.delimiters })),
      (this.pendingLevel = this.level),
      this.tokens.push(r),
      this.tokens_meta.push(n),
      r
    )
  }),
  (zl.prototype.scanDelims = function (A, e) {
    const t = this.posMax,
      r = this.src.charCodeAt(A),
      n = A > 0 ? this.src.charCodeAt(A - 1) : 32
    let i = A
    for (; i < t && this.src.charCodeAt(i) === r; ) i++
    const o = i - A,
      s = i < t ? this.src.charCodeAt(i) : 32,
      a = sl(n) || ol(String.fromCharCode(n)),
      c = sl(s) || ol(String.fromCharCode(s)),
      u = il(n),
      l = il(s),
      h = !l && (!c || u || a),
      f = !u && (!a || l || c)
    return {
      can_open: h && (e || !f || a),
      can_close: f && (e || !h || c),
      length: o,
    }
  }),
  (zl.prototype.Token = Bl))
const Wl = /(?:^|[^a-z0-9.+-])([a-z][a-z0-9.+-]*)$/i
const ql = []
for (let qC = 0; qC < 256; qC++) ql.push(0)
function Xl(A, e) {
  let t
  const r = [],
    n = e.length
  for (let i = 0; i < n; i++) {
    const n = e[i]
    if (126 !== n.marker) continue
    if (-1 === n.end) continue
    const o = e[n.end]
    ;((t = A.tokens[n.token]),
      (t.type = 's_open'),
      (t.tag = 's'),
      (t.nesting = 1),
      (t.markup = '~~'),
      (t.content = ''),
      (t = A.tokens[o.token]),
      (t.type = 's_close'),
      (t.tag = 's'),
      (t.nesting = -1),
      (t.markup = '~~'),
      (t.content = ''),
      'text' === A.tokens[o.token - 1].type &&
        '~' === A.tokens[o.token - 1].content &&
        r.push(o.token - 1))
  }
  for (; r.length; ) {
    const e = r.pop()
    let n = e + 1
    for (; n < A.tokens.length && 's_close' === A.tokens[n].type; ) n++
    ;(n--,
      e !== n &&
        ((t = A.tokens[n]), (A.tokens[n] = A.tokens[e]), (A.tokens[e] = t)))
  }
}
'\\!"#$%&\'()*+,./:;<=>?@[]^_`{|}~-'.split('').forEach(function (A) {
  ql[A.charCodeAt(0)] = 1
})
const Jl = {
  tokenize: function (A, e) {
    const t = A.pos,
      r = A.src.charCodeAt(t)
    if (e) return !1
    if (126 !== r) return !1
    const n = A.scanDelims(A.pos, !0)
    let i = n.length
    const o = String.fromCharCode(r)
    if (i < 2) return !1
    let s
    i % 2 && ((s = A.push('text', '', 0)), (s.content = o), i--)
    for (let a = 0; a < i; a += 2)
      ((s = A.push('text', '', 0)),
        (s.content = o + o),
        A.delimiters.push({
          marker: r,
          length: 0,
          token: A.tokens.length - 1,
          end: -1,
          open: n.can_open,
          close: n.can_close,
        }))
    return ((A.pos += n.length), !0)
  },
  postProcess: function (A) {
    const e = A.tokens_meta,
      t = A.tokens_meta.length
    Xl(A, A.delimiters)
    for (let r = 0; r < t; r++)
      e[r] && e[r].delimiters && Xl(A, e[r].delimiters)
  },
}
function Yl(A, e) {
  for (let t = e.length - 1; t >= 0; t--) {
    const r = e[t]
    if (95 !== r.marker && 42 !== r.marker) continue
    if (-1 === r.end) continue
    const n = e[r.end],
      i =
        t > 0 &&
        e[t - 1].end === r.end + 1 &&
        e[t - 1].marker === r.marker &&
        e[t - 1].token === r.token - 1 &&
        e[r.end + 1].token === n.token + 1,
      o = String.fromCharCode(r.marker),
      s = A.tokens[r.token]
    ;((s.type = i ? 'strong_open' : 'em_open'),
      (s.tag = i ? 'strong' : 'em'),
      (s.nesting = 1),
      (s.markup = i ? o + o : o),
      (s.content = ''))
    const a = A.tokens[n.token]
    ;((a.type = i ? 'strong_close' : 'em_close'),
      (a.tag = i ? 'strong' : 'em'),
      (a.nesting = -1),
      (a.markup = i ? o + o : o),
      (a.content = ''),
      i &&
        ((A.tokens[e[t - 1].token].content = ''),
        (A.tokens[e[r.end + 1].token].content = ''),
        t--))
  }
}
const Zl = {
  tokenize: function (A, e) {
    const t = A.pos,
      r = A.src.charCodeAt(t)
    if (e) return !1
    if (95 !== r && 42 !== r) return !1
    const n = A.scanDelims(A.pos, 42 === r)
    for (let i = 0; i < n.length; i++) {
      ;((A.push('text', '', 0).content = String.fromCharCode(r)),
        A.delimiters.push({
          marker: r,
          length: n.length,
          token: A.tokens.length - 1,
          end: -1,
          open: n.can_open,
          close: n.can_close,
        }))
    }
    return ((A.pos += n.length), !0)
  },
  postProcess: function (A) {
    const e = A.tokens_meta,
      t = A.tokens_meta.length
    Yl(A, A.delimiters)
    for (let r = 0; r < t; r++)
      e[r] && e[r].delimiters && Yl(A, e[r].delimiters)
  },
}
const $l =
    /^([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/,
  Ah = /^([a-zA-Z][a-zA-Z0-9+.-]{1,31}):([^<>\x00-\x20]*)$/
const eh = /^&#((?:x[a-f0-9]{1,6}|[0-9]{1,7}));/i,
  th = /^&([a-z][a-z0-9]{1,31});/i
function rh(A) {
  const e = {},
    t = A.length
  if (!t) return
  let r = 0,
    n = -2
  const i = []
  for (let o = 0; o < t; o++) {
    const t = A[o]
    if (
      (i.push(0),
      (A[r].marker === t.marker && n === t.token - 1) || (r = o),
      (n = t.token),
      (t.length = t.length || 0),
      !t.close)
    )
      continue
    e.hasOwnProperty(t.marker) || (e[t.marker] = [-1, -1, -1, -1, -1, -1])
    const s = e[t.marker][(t.open ? 3 : 0) + (t.length % 3)]
    let a = r - i[r] - 1,
      c = a
    for (; a > s; a -= i[a] + 1) {
      const e = A[a]
      if (e.marker === t.marker && e.open && e.end < 0) {
        let r = !1
        if (
          ((e.close || t.open) &&
            (e.length + t.length) % 3 == 0 &&
            ((e.length % 3 == 0 && t.length % 3 == 0) || (r = !0)),
          !r)
        ) {
          const r = a > 0 && !A[a - 1].open ? i[a - 1] + 1 : 0
          ;((i[o] = o - a + r),
            (i[a] = r),
            (t.open = !1),
            (e.end = o),
            (e.close = !1),
            (c = -1),
            (n = -2))
          break
        }
      }
    }
    ;-1 !== c && (e[t.marker][(t.open ? 3 : 0) + ((t.length || 0) % 3)] = c)
  }
}
const nh = [
    [
      'text',
      function (A, e) {
        let t = A.pos
        for (; t < A.posMax && !jl(A.src.charCodeAt(t)); ) t++
        return (
          t !== A.pos &&
          (e || (A.pending += A.src.slice(A.pos, t)), (A.pos = t), !0)
        )
      },
    ],
    [
      'linkify',
      function (A, e) {
        if (!A.md.options.linkify) return !1
        if (A.linkLevel > 0) return !1
        const t = A.pos
        if (t + 3 > A.posMax) return !1
        if (58 !== A.src.charCodeAt(t)) return !1
        if (47 !== A.src.charCodeAt(t + 1)) return !1
        if (47 !== A.src.charCodeAt(t + 2)) return !1
        const r = A.pending.match(Wl)
        if (!r) return !1
        const n = r[1],
          i = A.md.linkify.matchAtStart(A.src.slice(t - n.length))
        if (!i) return !1
        let o = i.url
        if (o.length <= n.length) return !1
        o = o.replace(/\*+$/, '')
        const s = A.md.normalizeLink(o)
        if (!A.md.validateLink(s)) return !1
        if (!e) {
          A.pending = A.pending.slice(0, -n.length)
          const e = A.push('link_open', 'a', 1)
          ;((e.attrs = [['href', s]]),
            (e.markup = 'linkify'),
            (e.info = 'auto'))
          A.push('text', '', 0).content = A.md.normalizeLinkText(o)
          const t = A.push('link_close', 'a', -1)
          ;((t.markup = 'linkify'), (t.info = 'auto'))
        }
        return ((A.pos += o.length - n.length), !0)
      },
    ],
    [
      'newline',
      function (A, e) {
        let t = A.pos
        if (10 !== A.src.charCodeAt(t)) return !1
        const r = A.pending.length - 1,
          n = A.posMax
        if (!e)
          if (r >= 0 && 32 === A.pending.charCodeAt(r))
            if (r >= 1 && 32 === A.pending.charCodeAt(r - 1)) {
              let e = r - 1
              for (; e >= 1 && 32 === A.pending.charCodeAt(e - 1); ) e--
              ;((A.pending = A.pending.slice(0, e)),
                A.push('hardbreak', 'br', 0))
            } else
              ((A.pending = A.pending.slice(0, -1)),
                A.push('softbreak', 'br', 0))
          else A.push('softbreak', 'br', 0)
        for (t++; t < n && nl(A.src.charCodeAt(t)); ) t++
        return ((A.pos = t), !0)
      },
    ],
    [
      'escape',
      function (A, e) {
        let t = A.pos
        const r = A.posMax
        if (92 !== A.src.charCodeAt(t)) return !1
        if ((t++, t >= r)) return !1
        let n = A.src.charCodeAt(t)
        if (10 === n) {
          for (
            e || A.push('hardbreak', 'br', 0), t++;
            t < r && ((n = A.src.charCodeAt(t)), nl(n));

          )
            t++
          return ((A.pos = t), !0)
        }
        let i = A.src[t]
        if (n >= 55296 && n <= 56319 && t + 1 < r) {
          const e = A.src.charCodeAt(t + 1)
          e >= 56320 && e <= 57343 && ((i += A.src[t + 1]), t++)
        }
        const o = '\\' + i
        if (!e) {
          const e = A.push('text_special', '', 0)
          ;(n < 256 && 0 !== ql[n] ? (e.content = i) : (e.content = o),
            (e.markup = o),
            (e.info = 'escape'))
        }
        return ((A.pos = t + 1), !0)
      },
    ],
    [
      'backticks',
      function (A, e) {
        let t = A.pos
        if (96 !== A.src.charCodeAt(t)) return !1
        const r = t
        t++
        const n = A.posMax
        for (; t < n && 96 === A.src.charCodeAt(t); ) t++
        const i = A.src.slice(r, t),
          o = i.length
        if (A.backticksScanned && (A.backticks[o] || 0) <= r)
          return (e || (A.pending += i), (A.pos += o), !0)
        let s,
          a = t
        for (; -1 !== (s = A.src.indexOf('`', a)); ) {
          for (a = s + 1; a < n && 96 === A.src.charCodeAt(a); ) a++
          const r = a - s
          if (r === o) {
            if (!e) {
              const e = A.push('code_inline', 'code', 0)
              ;((e.markup = i),
                (e.content = A.src
                  .slice(t, s)
                  .replace(/\n/g, ' ')
                  .replace(/^ (.+) $/, '$1')))
            }
            return ((A.pos = a), !0)
          }
          A.backticks[r] = s
        }
        return (
          (A.backticksScanned = !0),
          e || (A.pending += i),
          (A.pos += o),
          !0
        )
      },
    ],
    ['strikethrough', Jl.tokenize],
    ['emphasis', Zl.tokenize],
    [
      'link',
      function (A, e) {
        let t,
          r,
          n,
          i,
          o = '',
          s = '',
          a = A.pos,
          c = !0
        if (91 !== A.src.charCodeAt(A.pos)) return !1
        const u = A.pos,
          l = A.posMax,
          h = A.pos + 1,
          f = A.md.helpers.parseLinkLabel(A, A.pos, !0)
        if (f < 0) return !1
        let d = f + 1
        if (d < l && 40 === A.src.charCodeAt(d)) {
          for (
            c = !1, d++;
            d < l && ((t = A.src.charCodeAt(d)), nl(t) || 10 === t);
            d++
          );
          if (d >= l) return !1
          if (
            ((a = d),
            (n = A.md.helpers.parseLinkDestination(A.src, d, A.posMax)),
            n.ok)
          ) {
            for (
              o = A.md.normalizeLink(n.str),
                A.md.validateLink(o) ? (d = n.pos) : (o = ''),
                a = d;
              d < l && ((t = A.src.charCodeAt(d)), nl(t) || 10 === t);
              d++
            );
            if (
              ((n = A.md.helpers.parseLinkTitle(A.src, d, A.posMax)),
              d < l && a !== d && n.ok)
            )
              for (
                s = n.str, d = n.pos;
                d < l && ((t = A.src.charCodeAt(d)), nl(t) || 10 === t);
                d++
              );
          }
          ;((d >= l || 41 !== A.src.charCodeAt(d)) && (c = !0), d++)
        }
        if (c) {
          if (void 0 === A.env.references) return !1
          if (
            (d < l && 91 === A.src.charCodeAt(d)
              ? ((a = d + 1),
                (d = A.md.helpers.parseLinkLabel(A, d)),
                d >= 0 ? (r = A.src.slice(a, d++)) : (d = f + 1))
              : (d = f + 1),
            r || (r = A.src.slice(h, f)),
            (i = A.env.references[al(r)]),
            !i)
          )
            return ((A.pos = u), !1)
          ;((o = i.href), (s = i.title))
        }
        if (!e) {
          ;((A.pos = h), (A.posMax = f))
          const e = [['href', o]]
          ;((A.push('link_open', 'a', 1).attrs = e),
            s && e.push(['title', s]),
            A.linkLevel++,
            A.md.inline.tokenize(A),
            A.linkLevel--,
            A.push('link_close', 'a', -1))
        }
        return ((A.pos = d), (A.posMax = l), !0)
      },
    ],
    [
      'image',
      function (A, e) {
        let t,
          r,
          n,
          i,
          o,
          s,
          a,
          c,
          u = ''
        const l = A.pos,
          h = A.posMax
        if (33 !== A.src.charCodeAt(A.pos)) return !1
        if (91 !== A.src.charCodeAt(A.pos + 1)) return !1
        const f = A.pos + 2,
          d = A.md.helpers.parseLinkLabel(A, A.pos + 1, !1)
        if (d < 0) return !1
        if (((i = d + 1), i < h && 40 === A.src.charCodeAt(i))) {
          for (
            i++;
            i < h && ((t = A.src.charCodeAt(i)), nl(t) || 10 === t);
            i++
          );
          if (i >= h) return !1
          for (
            c = i,
              s = A.md.helpers.parseLinkDestination(A.src, i, A.posMax),
              s.ok &&
                ((u = A.md.normalizeLink(s.str)),
                A.md.validateLink(u) ? (i = s.pos) : (u = '')),
              c = i;
            i < h && ((t = A.src.charCodeAt(i)), nl(t) || 10 === t);
            i++
          );
          if (
            ((s = A.md.helpers.parseLinkTitle(A.src, i, A.posMax)),
            i < h && c !== i && s.ok)
          )
            for (
              a = s.str, i = s.pos;
              i < h && ((t = A.src.charCodeAt(i)), nl(t) || 10 === t);
              i++
            );
          else a = ''
          if (i >= h || 41 !== A.src.charCodeAt(i)) return ((A.pos = l), !1)
          i++
        } else {
          if (void 0 === A.env.references) return !1
          if (
            (i < h && 91 === A.src.charCodeAt(i)
              ? ((c = i + 1),
                (i = A.md.helpers.parseLinkLabel(A, i)),
                i >= 0 ? (n = A.src.slice(c, i++)) : (i = d + 1))
              : (i = d + 1),
            n || (n = A.src.slice(f, d)),
            (o = A.env.references[al(n)]),
            !o)
          )
            return ((A.pos = l), !1)
          ;((u = o.href), (a = o.title))
        }
        if (!e) {
          r = A.src.slice(f, d)
          const e = []
          A.md.inline.parse(r, A.md, A.env, e)
          const t = A.push('image', 'img', 0),
            n = [
              ['src', u],
              ['alt', ''],
            ]
          ;((t.attrs = n),
            (t.children = e),
            (t.content = r),
            a && n.push(['title', a]))
        }
        return ((A.pos = i), (A.posMax = h), !0)
      },
    ],
    [
      'autolink',
      function (A, e) {
        let t = A.pos
        if (60 !== A.src.charCodeAt(t)) return !1
        const r = A.pos,
          n = A.posMax
        for (;;) {
          if (++t >= n) return !1
          const e = A.src.charCodeAt(t)
          if (60 === e) return !1
          if (62 === e) break
        }
        const i = A.src.slice(r + 1, t)
        if (Ah.test(i)) {
          const t = A.md.normalizeLink(i)
          if (!A.md.validateLink(t)) return !1
          if (!e) {
            const e = A.push('link_open', 'a', 1)
            ;((e.attrs = [['href', t]]),
              (e.markup = 'autolink'),
              (e.info = 'auto'))
            A.push('text', '', 0).content = A.md.normalizeLinkText(i)
            const r = A.push('link_close', 'a', -1)
            ;((r.markup = 'autolink'), (r.info = 'auto'))
          }
          return ((A.pos += i.length + 2), !0)
        }
        if ($l.test(i)) {
          const t = A.md.normalizeLink('mailto:' + i)
          if (!A.md.validateLink(t)) return !1
          if (!e) {
            const e = A.push('link_open', 'a', 1)
            ;((e.attrs = [['href', t]]),
              (e.markup = 'autolink'),
              (e.info = 'auto'))
            A.push('text', '', 0).content = A.md.normalizeLinkText(i)
            const r = A.push('link_close', 'a', -1)
            ;((r.markup = 'autolink'), (r.info = 'auto'))
          }
          return ((A.pos += i.length + 2), !0)
        }
        return !1
      },
    ],
    [
      'html_inline',
      function (A, e) {
        if (!A.md.options.html) return !1
        const t = A.posMax,
          r = A.pos
        if (60 !== A.src.charCodeAt(r) || r + 2 >= t) return !1
        const n = A.src.charCodeAt(r + 1)
        if (
          33 !== n &&
          63 !== n &&
          47 !== n &&
          !(function (A) {
            const e = 32 | A
            return e >= 97 && e <= 122
          })(n)
        )
          return !1
        const i = A.src.slice(r).match(Rl)
        if (!i) return !1
        if (!e) {
          const e = A.push('html_inline', '', 0)
          ;((e.content = i[0]),
            (o = e.content),
            /^<a[>\s]/i.test(o) && A.linkLevel++,
            (function (A) {
              return /^<\/a\s*>/i.test(A)
            })(e.content) && A.linkLevel--)
        }
        var o
        return ((A.pos += i[0].length), !0)
      },
    ],
    [
      'entity',
      function (A, e) {
        const t = A.pos,
          r = A.posMax
        if (38 !== A.src.charCodeAt(t)) return !1
        if (t + 1 >= r) return !1
        if (35 === A.src.charCodeAt(t + 1)) {
          const r = A.src.slice(t).match(eh)
          if (r) {
            if (!e) {
              const e =
                  'x' === r[1][0].toLowerCase()
                    ? parseInt(r[1].slice(1), 16)
                    : parseInt(r[1], 10),
                t = A.push('text_special', '', 0)
              ;((t.content = ju(e) ? Wu(e) : Wu(65533)),
                (t.markup = r[0]),
                (t.info = 'entity'))
            }
            return ((A.pos += r[0].length), !0)
          }
        } else {
          const r = A.src.slice(t).match(th)
          if (r) {
            const t = Nu(r[0])
            if (t !== r[0]) {
              if (!e) {
                const e = A.push('text_special', '', 0)
                ;((e.content = t), (e.markup = r[0]), (e.info = 'entity'))
              }
              return ((A.pos += r[0].length), !0)
            }
          }
        }
        return !1
      },
    ],
  ],
  ih = [
    [
      'balance_pairs',
      function (A) {
        const e = A.tokens_meta,
          t = A.tokens_meta.length
        rh(A.delimiters)
        for (let r = 0; r < t; r++)
          e[r] && e[r].delimiters && rh(e[r].delimiters)
      },
    ],
    ['strikethrough', Jl.postProcess],
    ['emphasis', Zl.postProcess],
    [
      'fragments_join',
      function (A) {
        let e,
          t,
          r = 0
        const n = A.tokens,
          i = A.tokens.length
        for (e = t = 0; e < i; e++)
          (n[e].nesting < 0 && r--,
            (n[e].level = r),
            n[e].nesting > 0 && r++,
            'text' === n[e].type && e + 1 < i && 'text' === n[e + 1].type
              ? (n[e + 1].content = n[e].content + n[e + 1].content)
              : (e !== t && (n[t] = n[e]), t++))
        e !== t && (n.length = t)
      },
    ],
  ]
function oh() {
  this.ruler = new dl()
  for (let A = 0; A < nh.length; A++) this.ruler.push(nh[A][0], nh[A][1])
  this.ruler2 = new dl()
  for (let A = 0; A < ih.length; A++) this.ruler2.push(ih[A][0], ih[A][1])
}
function sh(A) {
  return (
    Array.prototype.slice.call(arguments, 1).forEach(function (e) {
      e &&
        Object.keys(e).forEach(function (t) {
          A[t] = e[t]
        })
    }),
    A
  )
}
function ah(A) {
  return Object.prototype.toString.call(A)
}
function ch(A) {
  return '[object Function]' === ah(A)
}
function uh(A) {
  return A.replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&')
}
;((oh.prototype.skipToken = function (A) {
  const e = A.pos,
    t = this.ruler.getRules(''),
    r = t.length,
    n = A.md.options.maxNesting,
    i = A.cache
  if (void 0 !== i[e]) return void (A.pos = i[e])
  let o = !1
  if (A.level < n) {
    for (let s = 0; s < r; s++)
      if ((A.level++, (o = t[s](A, !0)), A.level--, o)) {
        if (e >= A.pos)
          throw new Error("inline rule didn't increment state.pos")
        break
      }
  } else A.pos = A.posMax
  ;(o || A.pos++, (i[e] = A.pos))
}),
  (oh.prototype.tokenize = function (A) {
    const e = this.ruler.getRules(''),
      t = e.length,
      r = A.posMax,
      n = A.md.options.maxNesting
    for (; A.pos < r; ) {
      const i = A.pos
      let o = !1
      if (A.level < n)
        for (let r = 0; r < t; r++)
          if (((o = e[r](A, !1)), o)) {
            if (i >= A.pos)
              throw new Error("inline rule didn't increment state.pos")
            break
          }
      if (o) {
        if (A.pos >= r) break
      } else A.pending += A.src[A.pos++]
    }
    A.pending && A.pushPending()
  }),
  (oh.prototype.parse = function (A, e, t, r) {
    const n = new this.State(A, e, t, r)
    this.tokenize(n)
    const i = this.ruler2.getRules(''),
      o = i.length
    for (let s = 0; s < o; s++) i[s](n)
  }),
  (oh.prototype.State = zl))
const lh = { fuzzyLink: !0, fuzzyEmail: !0, fuzzyIP: !1 }
const hh = {
    'http:': {
      validate: function (A, e, t) {
        const r = A.slice(e)
        return (
          t.re.http ||
            (t.re.http = new RegExp(
              '^\\/\\/' +
                t.re.src_auth +
                t.re.src_host_port_strict +
                t.re.src_path,
              'i',
            )),
          t.re.http.test(r) ? r.match(t.re.http)[0].length : 0
        )
      },
    },
    'https:': 'http:',
    'ftp:': 'http:',
    '//': {
      validate: function (A, e, t) {
        const r = A.slice(e)
        return (
          t.re.no_http ||
            (t.re.no_http = new RegExp(
              '^' +
                t.re.src_auth +
                '(?:localhost|(?:(?:' +
                t.re.src_domain +
                ')\\.)+' +
                t.re.src_domain_root +
                ')' +
                t.re.src_port +
                t.re.src_host_terminator +
                t.re.src_path,
              'i',
            )),
          t.re.no_http.test(r)
            ? (e >= 3 && ':' === A[e - 3]) || (e >= 3 && '/' === A[e - 3])
              ? 0
              : r.match(t.re.no_http)[0].length
            : 0
        )
      },
    },
    'mailto:': {
      validate: function (A, e, t) {
        const r = A.slice(e)
        return (
          t.re.mailto ||
            (t.re.mailto = new RegExp(
              '^' + t.re.src_email_name + '@' + t.re.src_host_strict,
              'i',
            )),
          t.re.mailto.test(r) ? r.match(t.re.mailto)[0].length : 0
        )
      },
    },
  },
  fh =
    'biz|com|edu|gov|net|org|pro|web|xxx|aero|asia|coop|info|museum|name|shop|рф'.split(
      '|',
    )
function dh(A) {
  const e = (A.re = (function (A) {
      const e = {}
      ;((A = A || {}),
        (e.src_Any = pu.source),
        (e.src_Cc = gu.source),
        (e.src_Z = Cu.source),
        (e.src_P = wu.source),
        (e.src_ZPCc = [e.src_Z, e.src_P, e.src_Cc].join('|')),
        (e.src_ZCc = [e.src_Z, e.src_Cc].join('|')))
      const t = '[><｜]'
      return (
        (e.src_pseudo_letter =
          '(?:(?![><｜]|' + e.src_ZPCc + ')' + e.src_Any + ')'),
        (e.src_ip4 =
          '(?:(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)'),
        (e.src_auth = '(?:(?:(?!' + e.src_ZCc + '|[@/\\[\\]()]).)+@)?'),
        (e.src_port =
          '(?::(?:6(?:[0-4]\\d{3}|5(?:[0-4]\\d{2}|5(?:[0-2]\\d|3[0-5])))|[1-5]?\\d{1,4}))?'),
        (e.src_host_terminator =
          '(?=$|[><｜]|' +
          e.src_ZPCc +
          ')(?!' +
          (A['---'] ? '-(?!--)|' : '-|') +
          '_|:\\d|\\.-|\\.(?!$|' +
          e.src_ZPCc +
          '))'),
        (e.src_path =
          '(?:[/?#](?:(?!' +
          e.src_ZCc +
          '|' +
          t +
          '|[()[\\]{}.,"\'?!\\-;]).|\\[(?:(?!' +
          e.src_ZCc +
          '|\\]).)*\\]|\\((?:(?!' +
          e.src_ZCc +
          '|[)]).)*\\)|\\{(?:(?!' +
          e.src_ZCc +
          '|[}]).)*\\}|\\"(?:(?!' +
          e.src_ZCc +
          '|["]).)+\\"|\\\'(?:(?!' +
          e.src_ZCc +
          "|[']).)+\\'|\\'(?=" +
          e.src_pseudo_letter +
          '|[-])|\\.{2,}[a-zA-Z0-9%/&]|\\.(?!' +
          e.src_ZCc +
          '|[.]|$)|' +
          (A['---'] ? '\\-(?!--(?:[^-]|$))(?:-*)|' : '\\-+|') +
          ',(?!' +
          e.src_ZCc +
          '|$)|;(?!' +
          e.src_ZCc +
          '|$)|\\!+(?!' +
          e.src_ZCc +
          '|[!]|$)|\\?(?!' +
          e.src_ZCc +
          '|[?]|$))+|\\/)?'),
        (e.src_email_name =
          '[\\-;:&=\\+\\$,\\.a-zA-Z0-9_][\\-;:&=\\+\\$,\\"\\.a-zA-Z0-9_]*'),
        (e.src_xn = 'xn--[a-z0-9\\-]{1,59}'),
        (e.src_domain_root =
          '(?:' + e.src_xn + '|' + e.src_pseudo_letter + '{1,63})'),
        (e.src_domain =
          '(?:' +
          e.src_xn +
          '|(?:' +
          e.src_pseudo_letter +
          ')|(?:' +
          e.src_pseudo_letter +
          '(?:-|' +
          e.src_pseudo_letter +
          '){0,61}' +
          e.src_pseudo_letter +
          '))'),
        (e.src_host =
          '(?:(?:(?:(?:' + e.src_domain + ')\\.)*' + e.src_domain + '))'),
        (e.tpl_host_fuzzy =
          '(?:' +
          e.src_ip4 +
          '|(?:(?:(?:' +
          e.src_domain +
          ')\\.)+(?:%TLDS%)))'),
        (e.tpl_host_no_ip_fuzzy =
          '(?:(?:(?:' + e.src_domain + ')\\.)+(?:%TLDS%))'),
        (e.src_host_strict = e.src_host + e.src_host_terminator),
        (e.tpl_host_fuzzy_strict = e.tpl_host_fuzzy + e.src_host_terminator),
        (e.src_host_port_strict =
          e.src_host + e.src_port + e.src_host_terminator),
        (e.tpl_host_port_fuzzy_strict =
          e.tpl_host_fuzzy + e.src_port + e.src_host_terminator),
        (e.tpl_host_port_no_ip_fuzzy_strict =
          e.tpl_host_no_ip_fuzzy + e.src_port + e.src_host_terminator),
        (e.tpl_host_fuzzy_test =
          'localhost|www\\.|\\.\\d{1,3}\\.|(?:\\.(?:%TLDS%)(?:' +
          e.src_ZPCc +
          '|>|$))'),
        (e.tpl_email_fuzzy =
          '(^|[><｜]|"|\\(|' +
          e.src_ZCc +
          ')(' +
          e.src_email_name +
          '@' +
          e.tpl_host_fuzzy_strict +
          ')'),
        (e.tpl_link_fuzzy =
          '(^|(?![.:/\\-_@])(?:[$+<=>^`|｜]|' +
          e.src_ZPCc +
          '))((?![$+<=>^`|｜])' +
          e.tpl_host_port_fuzzy_strict +
          e.src_path +
          ')'),
        (e.tpl_link_no_ip_fuzzy =
          '(^|(?![.:/\\-_@])(?:[$+<=>^`|｜]|' +
          e.src_ZPCc +
          '))((?![$+<=>^`|｜])' +
          e.tpl_host_port_no_ip_fuzzy_strict +
          e.src_path +
          ')'),
        e
      )
    })(A.__opts__)),
    t = A.__tlds__.slice()
  function r(A) {
    return A.replace('%TLDS%', e.src_tlds)
  }
  ;(A.onCompile(),
    A.__tlds_replaced__ ||
      t.push(
        'a[cdefgilmnoqrstuwxz]|b[abdefghijmnorstvwyz]|c[acdfghiklmnoruvwxyz]|d[ejkmoz]|e[cegrstu]|f[ijkmor]|g[abdefghilmnpqrstuwy]|h[kmnrtu]|i[delmnoqrst]|j[emop]|k[eghimnprwyz]|l[abcikrstuvy]|m[acdeghklmnopqrstuvwxyz]|n[acefgilopruz]|om|p[aefghklmnrstwy]|qa|r[eosuw]|s[abcdeghijklmnortuvxyz]|t[cdfghjklmnortvwz]|u[agksyz]|v[aceginu]|w[fs]|y[et]|z[amw]',
      ),
    t.push(e.src_xn),
    (e.src_tlds = t.join('|')),
    (e.email_fuzzy = RegExp(r(e.tpl_email_fuzzy), 'i')),
    (e.link_fuzzy = RegExp(r(e.tpl_link_fuzzy), 'i')),
    (e.link_no_ip_fuzzy = RegExp(r(e.tpl_link_no_ip_fuzzy), 'i')),
    (e.host_fuzzy_test = RegExp(r(e.tpl_host_fuzzy_test), 'i')))
  const n = []
  function i(A, e) {
    throw new Error('(LinkifyIt) Invalid schema "' + A + '": ' + e)
  }
  ;((A.__compiled__ = {}),
    Object.keys(A.__schemas__).forEach(function (e) {
      const t = A.__schemas__[e]
      if (null === t) return
      const r = { validate: null, link: null }
      if (((A.__compiled__[e] = r), '[object Object]' === ah(t)))
        return (
          !(function (A) {
            return '[object RegExp]' === ah(A)
          })(t.validate)
            ? ch(t.validate)
              ? (r.validate = t.validate)
              : i(e, t)
            : (r.validate = (function (A) {
                return function (e, t) {
                  const r = e.slice(t)
                  return A.test(r) ? r.match(A)[0].length : 0
                }
              })(t.validate)),
          void (ch(t.normalize)
            ? (r.normalize = t.normalize)
            : t.normalize
              ? i(e, t)
              : (r.normalize = function (A, e) {
                  e.normalize(A)
                }))
        )
      !(function (A) {
        return '[object String]' === ah(A)
      })(t)
        ? i(e, t)
        : n.push(e)
    }),
    n.forEach(function (e) {
      A.__compiled__[A.__schemas__[e]] &&
        ((A.__compiled__[e].validate =
          A.__compiled__[A.__schemas__[e]].validate),
        (A.__compiled__[e].normalize =
          A.__compiled__[A.__schemas__[e]].normalize))
    }),
    (A.__compiled__[''] = {
      validate: null,
      normalize: function (A, e) {
        e.normalize(A)
      },
    }))
  const o = Object.keys(A.__compiled__)
    .filter(function (e) {
      return e.length > 0 && A.__compiled__[e]
    })
    .map(uh)
    .join('|')
  ;((A.re.schema_test = RegExp(
    '(^|(?!_)(?:[><｜]|' + e.src_ZPCc + '))(' + o + ')',
    'i',
  )),
    (A.re.schema_search = RegExp(
      '(^|(?!_)(?:[><｜]|' + e.src_ZPCc + '))(' + o + ')',
      'ig',
    )),
    (A.re.schema_at_start = RegExp('^' + A.re.schema_search.source, 'i')),
    (A.re.pretest = RegExp(
      '(' +
        A.re.schema_test.source +
        ')|(' +
        A.re.host_fuzzy_test.source +
        ')|@',
      'i',
    )),
    (function (A) {
      ;((A.__index__ = -1), (A.__text_cache__ = ''))
    })(A))
}
function Bh(A, e) {
  const t = A.__index__,
    r = A.__last_index__,
    n = A.__text_cache__.slice(t, r)
  ;((this.schema = A.__schema__.toLowerCase()),
    (this.index = t + e),
    (this.lastIndex = r + e),
    (this.raw = n),
    (this.text = n),
    (this.url = n))
}
function ph(A, e) {
  const t = new Bh(A, e)
  return (A.__compiled__[t.schema].normalize(t, A), t)
}
function gh(A, e) {
  if (!(this instanceof gh)) return new gh(A, e)
  var t
  ;(e ||
    ((t = A),
    Object.keys(t || {}).reduce(function (A, e) {
      return A || lh.hasOwnProperty(e)
    }, !1) && ((e = A), (A = {}))),
    (this.__opts__ = sh({}, lh, e)),
    (this.__index__ = -1),
    (this.__last_index__ = -1),
    (this.__schema__ = ''),
    (this.__text_cache__ = ''),
    (this.__schemas__ = sh({}, hh, A)),
    (this.__compiled__ = {}),
    (this.__tlds__ = fh),
    (this.__tlds_replaced__ = !1),
    (this.re = {}),
    dh(this))
}
;((gh.prototype.add = function (A, e) {
  return ((this.__schemas__[A] = e), dh(this), this)
}),
  (gh.prototype.set = function (A) {
    return ((this.__opts__ = sh(this.__opts__, A)), this)
  }),
  (gh.prototype.test = function (A) {
    if (((this.__text_cache__ = A), (this.__index__ = -1), !A.length)) return !1
    let e, t, r, n, i, o, s, a, c
    if (this.re.schema_test.test(A))
      for (
        s = this.re.schema_search, s.lastIndex = 0;
        null !== (e = s.exec(A));

      )
        if (((n = this.testSchemaAt(A, e[2], s.lastIndex)), n)) {
          ;((this.__schema__ = e[2]),
            (this.__index__ = e.index + e[1].length),
            (this.__last_index__ = e.index + e[0].length + n))
          break
        }
    return (
      this.__opts__.fuzzyLink &&
        this.__compiled__['http:'] &&
        ((a = A.search(this.re.host_fuzzy_test)),
        a >= 0 &&
          (this.__index__ < 0 || a < this.__index__) &&
          null !==
            (t = A.match(
              this.__opts__.fuzzyIP
                ? this.re.link_fuzzy
                : this.re.link_no_ip_fuzzy,
            )) &&
          ((i = t.index + t[1].length),
          (this.__index__ < 0 || i < this.__index__) &&
            ((this.__schema__ = ''),
            (this.__index__ = i),
            (this.__last_index__ = t.index + t[0].length)))),
      this.__opts__.fuzzyEmail &&
        this.__compiled__['mailto:'] &&
        ((c = A.indexOf('@')),
        c >= 0 &&
          null !== (r = A.match(this.re.email_fuzzy)) &&
          ((i = r.index + r[1].length),
          (o = r.index + r[0].length),
          (this.__index__ < 0 ||
            i < this.__index__ ||
            (i === this.__index__ && o > this.__last_index__)) &&
            ((this.__schema__ = 'mailto:'),
            (this.__index__ = i),
            (this.__last_index__ = o)))),
      this.__index__ >= 0
    )
  }),
  (gh.prototype.pretest = function (A) {
    return this.re.pretest.test(A)
  }),
  (gh.prototype.testSchemaAt = function (A, e, t) {
    return this.__compiled__[e.toLowerCase()]
      ? this.__compiled__[e.toLowerCase()].validate(A, t, this)
      : 0
  }),
  (gh.prototype.match = function (A) {
    const e = []
    let t = 0
    this.__index__ >= 0 &&
      this.__text_cache__ === A &&
      (e.push(ph(this, t)), (t = this.__last_index__))
    let r = t ? A.slice(t) : A
    for (; this.test(r); )
      (e.push(ph(this, t)),
        (r = r.slice(this.__last_index__)),
        (t += this.__last_index__))
    return e.length ? e : null
  }),
  (gh.prototype.matchAtStart = function (A) {
    if (((this.__text_cache__ = A), (this.__index__ = -1), !A.length))
      return null
    const e = this.re.schema_at_start.exec(A)
    if (!e) return null
    const t = this.testSchemaAt(A, e[2], e[0].length)
    return t
      ? ((this.__schema__ = e[2]),
        (this.__index__ = e.index + e[1].length),
        (this.__last_index__ = e.index + e[0].length + t),
        ph(this, 0))
      : null
  }),
  (gh.prototype.tlds = function (A, e) {
    return (
      (A = Array.isArray(A) ? A : [A]),
      e
        ? ((this.__tlds__ = this.__tlds__
            .concat(A)
            .sort()
            .filter(function (A, e, t) {
              return A !== t[e - 1]
            })
            .reverse()),
          dh(this),
          this)
        : ((this.__tlds__ = A.slice()),
          (this.__tlds_replaced__ = !0),
          dh(this),
          this)
    )
  }),
  (gh.prototype.normalize = function (A) {
    ;(A.schema || (A.url = 'http://' + A.url),
      'mailto:' !== A.schema ||
        /^mailto:/i.test(A.url) ||
        (A.url = 'mailto:' + A.url))
  }),
  (gh.prototype.onCompile = function () {}))
const wh = 2147483647,
  mh = 36,
  Ch = /^xn--/,
  yh = /[^\0-\x7F]/,
  Qh = /[\x2E\u3002\uFF0E\uFF61]/g,
  Fh = {
    overflow: 'Overflow: input needs wider integers to process',
    'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
    'invalid-input': 'Invalid input',
  },
  Uh = Math.floor,
  vh = String.fromCharCode
function bh(A) {
  throw new RangeError(Fh[A])
}
function Eh(A, e) {
  const t = A.split('@')
  let r = ''
  t.length > 1 && ((r = t[0] + '@'), (A = t[1]))
  const n = (function (A, e) {
    const t = []
    let r = A.length
    for (; r--; ) t[r] = e(A[r])
    return t
  })((A = A.replace(Qh, '.')).split('.'), e).join('.')
  return r + n
}
function Hh(A) {
  const e = []
  let t = 0
  const r = A.length
  for (; t < r; ) {
    const n = A.charCodeAt(t++)
    if (n >= 55296 && n <= 56319 && t < r) {
      const r = A.charCodeAt(t++)
      56320 == (64512 & r)
        ? e.push(((1023 & n) << 10) + (1023 & r) + 65536)
        : (e.push(n), t--)
    } else e.push(n)
  }
  return e
}
const _h = function (A, e) {
    return A + 22 + 75 * (A < 26) - ((0 != e) << 5)
  },
  Ih = function (A, e, t) {
    let r = 0
    for (A = t ? Uh(A / 700) : A >> 1, A += Uh(A / e); A > 455; r += mh)
      A = Uh(A / 35)
    return Uh(r + (36 * A) / (A + 38))
  },
  Dh = function (A) {
    const e = [],
      t = A.length
    let r = 0,
      n = 128,
      i = 72,
      o = A.lastIndexOf('-')
    o < 0 && (o = 0)
    for (let a = 0; a < o; ++a)
      (A.charCodeAt(a) >= 128 && bh('not-basic'), e.push(A.charCodeAt(a)))
    for (let a = o > 0 ? o + 1 : 0; a < t; ) {
      const o = r
      for (let e = 1, n = mh; ; n += mh) {
        a >= t && bh('invalid-input')
        const o =
          (s = A.charCodeAt(a++)) >= 48 && s < 58
            ? s - 48 + 26
            : s >= 65 && s < 91
              ? s - 65
              : s >= 97 && s < 123
                ? s - 97
                : mh
        ;(o >= mh && bh('invalid-input'),
          o > Uh((wh - r) / e) && bh('overflow'),
          (r += o * e))
        const c = n <= i ? 1 : n >= i + 26 ? 26 : n - i
        if (o < c) break
        const u = mh - c
        ;(e > Uh(wh / u) && bh('overflow'), (e *= u))
      }
      const c = e.length + 1
      ;((i = Ih(r - o, c, 0 == o)),
        Uh(r / c) > wh - n && bh('overflow'),
        (n += Uh(r / c)),
        (r %= c),
        e.splice(r++, 0, n))
    }
    var s
    return String.fromCodePoint(...e)
  },
  xh = function (A) {
    const e = [],
      t = (A = Hh(A)).length
    let r = 128,
      n = 0,
      i = 72
    for (const a of A) a < 128 && e.push(vh(a))
    const o = e.length
    let s = o
    for (o && e.push('-'); s < t; ) {
      let t = wh
      for (const e of A) e >= r && e < t && (t = e)
      const a = s + 1
      ;(t - r > Uh((wh - n) / a) && bh('overflow'), (n += (t - r) * a), (r = t))
      for (const c of A)
        if ((c < r && ++n > wh && bh('overflow'), c === r)) {
          let A = n
          for (let t = mh; ; t += mh) {
            const r = t <= i ? 1 : t >= i + 26 ? 26 : t - i
            if (A < r) break
            const n = A - r,
              o = mh - r
            ;(e.push(vh(_h(r + (n % o), 0))), (A = Uh(n / o)))
          }
          ;(e.push(vh(_h(A, 0))), (i = Ih(n, a, s === o)), (n = 0), ++s)
        }
      ;(++n, ++r)
    }
    return e.join('')
  },
  kh = function (A) {
    return Eh(A, function (A) {
      return yh.test(A) ? 'xn--' + xh(A) : A
    })
  },
  Lh = function (A) {
    return Eh(A, function (A) {
      return Ch.test(A) ? Dh(A.slice(4).toLowerCase()) : A
    })
  },
  Sh = {
    default: {
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
    zero: {
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
        inline: {
          rules: ['text'],
          rules2: ['balance_pairs', 'fragments_join'],
        },
      },
    },
    commonmark: {
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
  },
  Oh = /^(vbscript|javascript|file|data):/,
  Kh = /^data:image\/(gif|png|jpeg|webp);/
function Th(A) {
  const e = A.trim().toLowerCase()
  return !Oh.test(e) || Kh.test(e)
}
const Mh = ['http:', 'https:', 'mailto:']
function Rh(A) {
  const e = du(A, !0)
  if (e.hostname && (!e.protocol || Mh.indexOf(e.protocol) >= 0))
    try {
      e.hostname = kh(e.hostname)
    } catch (t) {}
  return Au(eu(e))
}
function Nh(A) {
  const e = du(A, !0)
  if (e.hostname && (!e.protocol || Mh.indexOf(e.protocol) >= 0))
    try {
      e.hostname = Lh(e.hostname)
    } catch (t) {}
  return Zc(eu(e), Zc.defaultChars + '%')
}
function Ph(A, e) {
  if (!(this instanceof Ph)) return new Ph(A, e)
  ;(e || Pu(A) || ((e = A || {}), (A = 'default')),
    (this.inline = new oh()),
    (this.block = new Gl()),
    (this.core = new xl()),
    (this.renderer = new fl()),
    (this.linkify = new gh()),
    (this.validateLink = Th),
    (this.normalizeLink = Rh),
    (this.normalizeLinkText = Nh),
    (this.utils = ul),
    (this.helpers = Gu({}, ll)),
    (this.options = {}),
    this.configure(A),
    e && this.set(e))
}
;((Ph.prototype.set = function (A) {
  return (Gu(this.options, A), this)
}),
  (Ph.prototype.configure = function (A) {
    const e = this
    if (Pu(A)) {
      const e = A
      if (!(A = Sh[e]))
        throw new Error('Wrong `markdown-it` preset "' + e + '", check name')
    }
    if (!A) throw new Error("Wrong `markdown-it` preset, can't be empty")
    return (
      A.options && e.set(A.options),
      A.components &&
        Object.keys(A.components).forEach(function (t) {
          ;(A.components[t].rules &&
            e[t].ruler.enableOnly(A.components[t].rules),
            A.components[t].rules2 &&
              e[t].ruler2.enableOnly(A.components[t].rules2))
        }),
      this
    )
  }),
  (Ph.prototype.enable = function (A, e) {
    let t = []
    ;(Array.isArray(A) || (A = [A]),
      ['core', 'block', 'inline'].forEach(function (e) {
        t = t.concat(this[e].ruler.enable(A, !0))
      }, this),
      (t = t.concat(this.inline.ruler2.enable(A, !0))))
    const r = A.filter(function (A) {
      return t.indexOf(A) < 0
    })
    if (r.length && !e)
      throw new Error('MarkdownIt. Failed to enable unknown rule(s): ' + r)
    return this
  }),
  (Ph.prototype.disable = function (A, e) {
    let t = []
    ;(Array.isArray(A) || (A = [A]),
      ['core', 'block', 'inline'].forEach(function (e) {
        t = t.concat(this[e].ruler.disable(A, !0))
      }, this),
      (t = t.concat(this.inline.ruler2.disable(A, !0))))
    const r = A.filter(function (A) {
      return t.indexOf(A) < 0
    })
    if (r.length && !e)
      throw new Error('MarkdownIt. Failed to disable unknown rule(s): ' + r)
    return this
  }),
  (Ph.prototype.use = function (A) {
    const e = [this].concat(Array.prototype.slice.call(arguments, 1))
    return (A.apply(A, e), this)
  }),
  (Ph.prototype.parse = function (A, e) {
    if ('string' != typeof A) throw new Error('Input data should be a String')
    const t = new this.core.State(A, this, e)
    return (this.core.process(t), t.tokens)
  }),
  (Ph.prototype.render = function (A, e) {
    return (
      (e = e || {}),
      this.renderer.render(this.parse(A, e), this.options, e)
    )
  }),
  (Ph.prototype.parseInline = function (A, e) {
    const t = new this.core.State(A, this, e)
    return ((t.inlineMode = !0), this.core.process(t), t.tokens)
  }),
  (Ph.prototype.renderInline = function (A, e) {
    return (
      (e = e || {}),
      this.renderer.render(this.parseInline(A, e), this.options, e)
    )
  }))
const Vh = new Set([!0, !1, 'alt', 'title'])
function Gh(A, e) {
  return (Array.isArray(A) ? A : []).filter(([A]) => A !== e)
}
function zh(A, e) {
  A && A.attrs && (A.attrs = Gh(A.attrs, e))
}
function jh(A, e) {
  if (!Vh.has(A)) throw new TypeError(`figcaption must be one of: ${[...Vh]}.`)
  if ('alt' === A) return e.content
  const t = e.attrs.find(([A]) => 'title' === A)
  return Array.isArray(t) && t[1] ? (zh(e, 'title'), t[1]) : void 0
}
function Wh(A, e) {
  ;((e = e || {}),
    A.core.ruler.before('linkify', 'image_figures', function (t) {
      let r = 1
      for (let n = 1, i = t.tokens.length; n < i - 1; ++n) {
        const o = t.tokens[n]
        if ('inline' !== o.type) continue
        if (!o.children || (1 !== o.children.length && 3 !== o.children.length))
          continue
        if (1 === o.children.length && 'image' !== o.children[0].type) continue
        if (3 === o.children.length) {
          const [A, e, t] = o.children
          if (
            'link_open' !== A.type ||
            'image' !== e.type ||
            'link_close' !== t.type
          )
            continue
        }
        if (0 !== n && 'paragraph_open' !== t.tokens[n - 1].type) continue
        if (n !== i - 1 && 'paragraph_close' !== t.tokens[n + 1].type) continue
        const s = t.tokens[n - 1]
        let a
        if (
          ((s.type = 'figure_open'),
          (s.tag = 'figure'),
          (t.tokens[n + 1].type = 'figure_close'),
          (t.tokens[n + 1].tag = 'figure'),
          e.dataType && t.tokens[n - 1].attrPush(['data-type', 'image']),
          e.link && 1 === o.children.length)
        ) {
          ;[a] = o.children
          const A = new t.Token('link_open', 'a', 1)
          ;(A.attrPush(['href', a.attrGet('src')]),
            o.children.unshift(A),
            o.children.push(new t.Token('link_close', 'a', -1)))
        }
        if (
          ((a = 1 === o.children.length ? o.children[0] : o.children[1]),
          e.figcaption)
        ) {
          const r = jh(e.figcaption, a)
          if (r) {
            const [e] = A.parseInline(r, t.env)
            ;(o.children.push(new t.Token('figcaption_open', 'figcaption', 1)),
              o.children.push(...e.children),
              o.children.push(
                new t.Token('figcaption_close', 'figcaption', -1),
              ),
              a.attrs && (a.attrs = Gh(a.attrs, 'title')))
          }
        }
        if (e.copyAttrs && a.attrs) {
          const A = !0 === e.copyAttrs ? '' : e.copyAttrs
          s.attrs = a.attrs
            .filter(([e]) => e.match(A))
            .map((A) => Array.from(A))
        }
        if (
          (e.tabindex && (t.tokens[n - 1].attrPush(['tabindex', r]), r++),
          e.lazy &&
            (a.attrs.some(([A]) => 'loading' === A) ||
              a.attrs.push(['loading', 'lazy'])),
          e.async &&
            (a.attrs.some(([A]) => 'decoding' === A) ||
              a.attrs.push(['decoding', 'async'])),
          e.classes && 'string' == typeof e.classes)
        ) {
          let A = !1
          for (let t = 0, r = a.attrs.length; t < r && !A; t++) {
            const r = a.attrs[t]
            'class' === r[0] && ((r[1] = `${r[1]} ${e.classes}`), (A = !0))
          }
          A || a.attrs.push(['class', e.classes])
        }
        if (e.removeSrc) {
          const A = a.attrs.find(([A]) => 'src' === A)
          ;(a.attrs.push(['data-src', A[1]]), zh(a, 'src'))
        }
      }
    }))
}
const qh = /\\([ \\!"#$%&'()*+,./:;<=>?@[\]^_`{|}~-])/g
function Xh(A, e) {
  const t = A.posMax,
    r = A.pos
  if (126 !== A.src.charCodeAt(r)) return !1
  if (e) return !1
  if (r + 2 >= t) return !1
  A.pos = r + 1
  let n = !1
  for (; A.pos < t; ) {
    if (126 === A.src.charCodeAt(A.pos)) {
      n = !0
      break
    }
    A.md.inline.skipToken(A)
  }
  if (!n || r + 1 === A.pos) return ((A.pos = r), !1)
  const i = A.src.slice(r + 1, A.pos)
  if (i.match(/(^|[^\\])(\\\\)*\s/)) return ((A.pos = r), !1)
  ;((A.posMax = A.pos), (A.pos = r + 1))
  A.push('sub_open', 'sub', 1).markup = '~'
  A.push('text', '', 0).content = i.replace(qh, '$1')
  return (
    (A.push('sub_close', 'sub', -1).markup = '~'),
    (A.pos = A.posMax + 1),
    (A.posMax = t),
    !0
  )
}
function Jh(A) {
  A.inline.ruler.after('emphasis', 'sub', Xh)
}
const Yh = /\\([ \\!"#$%&'()*+,./:;<=>?@[\]^_`{|}~-])/g
function Zh(A, e) {
  const t = A.posMax,
    r = A.pos
  if (94 !== A.src.charCodeAt(r)) return !1
  if (e) return !1
  if (r + 2 >= t) return !1
  A.pos = r + 1
  let n = !1
  for (; A.pos < t; ) {
    if (94 === A.src.charCodeAt(A.pos)) {
      n = !0
      break
    }
    A.md.inline.skipToken(A)
  }
  if (!n || r + 1 === A.pos) return ((A.pos = r), !1)
  const i = A.src.slice(r + 1, A.pos)
  if (i.match(/(^|[^\\])(\\\\)*\s/)) return ((A.pos = r), !1)
  ;((A.posMax = A.pos), (A.pos = r + 1))
  A.push('sup_open', 'sup', 1).markup = '^'
  A.push('text', '', 0).content = i.replace(Yh, '$1')
  return (
    (A.push('sup_close', 'sup', -1).markup = '^'),
    (A.pos = A.posMax + 1),
    (A.posMax = t),
    !0
  )
}
function $h(A) {
  A.inline.ruler.after('emphasis', 'sup', Zh)
}
const Af =
    'object' == typeof performance &&
    performance &&
    'function' == typeof performance.now
      ? performance
      : Date,
  ef = new Set(),
  tf = 'object' == typeof process && process ? process : {},
  rf = (A, e, t, r) => {
    'function' == typeof tf.emitWarning && tf.emitWarning(A, e, t, r)
  }
let nf = globalThis.AbortController,
  of = globalThis.AbortSignal
if (void 0 === nf) {
  ;((of = class {
    onabort
    _onabort = []
    reason
    aborted = !1
    addEventListener(A, e) {
      this._onabort.push(e)
    }
  }),
    (nf = class {
      constructor() {
        e()
      }
      signal = new of()
      abort(A) {
        if (!this.signal.aborted) {
          ;((this.signal.reason = A), (this.signal.aborted = !0))
          for (const e of this.signal._onabort) e(A)
          this.signal.onabort?.(A)
        }
      }
    }))
  let A = '1' !== tf.env?.LRU_CACHE_IGNORE_AC_WARNING
  const e = () => {
    A &&
      ((A = !1),
      rf(
        'AbortController is not defined. If using lru-cache in node 14, load an AbortController polyfill from the `node-abort-controller` package. A minimal polyfill is provided for use by LRUCache.fetch(), but it should not be relied upon in other contexts (eg, passing it to other APIs that use AbortController/AbortSignal might have undesirable effects). You may disable this with LRU_CACHE_IGNORE_AC_WARNING=1 in the env.',
        'NO_ABORT_CONTROLLER',
        'ENOTSUP',
        e,
      ))
  }
}
const sf = (A) => A && A === Math.floor(A) && A > 0 && isFinite(A),
  af = (A) =>
    sf(A)
      ? A <= Math.pow(2, 8)
        ? Uint8Array
        : A <= Math.pow(2, 16)
          ? Uint16Array
          : A <= Math.pow(2, 32)
            ? Uint32Array
            : A <= Number.MAX_SAFE_INTEGER
              ? cf
              : null
      : null
class cf extends Array {
  constructor(A) {
    ;(super(A), this.fill(0))
  }
}
class uf {
  heap
  length
  static #A = !1
  static create(A) {
    const e = af(A)
    if (!e) return []
    uf.#A = !0
    const t = new uf(A, e)
    return ((uf.#A = !1), t)
  }
  constructor(A, e) {
    if (!uf.#A) throw new TypeError('instantiate Stack using Stack.create(n)')
    ;((this.heap = new e(A)), (this.length = 0))
  }
  push(A) {
    this.heap[this.length++] = A
  }
  pop() {
    return this.heap[--this.length]
  }
}
class lf {
  #e
  #t
  #r
  #n
  #i
  #o
  #s
  ttl
  ttlResolution
  ttlAutopurge
  updateAgeOnGet
  updateAgeOnHas
  allowStale
  noDisposeOnSet
  noUpdateTTL
  maxEntrySize
  sizeCalculation
  noDeleteOnFetchRejection
  noDeleteOnStaleGet
  allowStaleOnFetchAbort
  allowStaleOnFetchRejection
  ignoreFetchAbort
  #a
  #c
  #u
  #l
  #h
  #f
  #d
  #B
  #p
  #g
  #w
  #m
  #C
  #y
  #Q
  #F
  #U
  #v
  static unsafeExposeInternals(A) {
    return {
      starts: A.#C,
      ttls: A.#y,
      sizes: A.#m,
      keyMap: A.#u,
      keyList: A.#l,
      valList: A.#h,
      next: A.#f,
      prev: A.#d,
      get head() {
        return A.#B
      },
      get tail() {
        return A.#p
      },
      free: A.#g,
      isBackgroundFetch: (e) => A.#b(e),
      backgroundFetch: (e, t, r, n) => A.#E(e, t, r, n),
      moveToTail: (e) => A.#H(e),
      indexes: (e) => A.#_(e),
      rindexes: (e) => A.#I(e),
      isStale: (e) => A.#D(e),
    }
  }
  get max() {
    return this.#e
  }
  get maxSize() {
    return this.#t
  }
  get calculatedSize() {
    return this.#c
  }
  get size() {
    return this.#a
  }
  get fetchMethod() {
    return this.#o
  }
  get memoMethod() {
    return this.#s
  }
  get dispose() {
    return this.#r
  }
  get onInsert() {
    return this.#n
  }
  get disposeAfter() {
    return this.#i
  }
  constructor(A) {
    const {
      max: e = 0,
      ttl: t,
      ttlResolution: r = 1,
      ttlAutopurge: n,
      updateAgeOnGet: i,
      updateAgeOnHas: o,
      allowStale: s,
      dispose: a,
      onInsert: c,
      disposeAfter: u,
      noDisposeOnSet: l,
      noUpdateTTL: h,
      maxSize: f = 0,
      maxEntrySize: d = 0,
      sizeCalculation: B,
      fetchMethod: p,
      memoMethod: g,
      noDeleteOnFetchRejection: w,
      noDeleteOnStaleGet: m,
      allowStaleOnFetchRejection: C,
      allowStaleOnFetchAbort: y,
      ignoreFetchAbort: Q,
    } = A
    if (0 !== e && !sf(e))
      throw new TypeError('max option must be a nonnegative integer')
    const F = e ? af(e) : Array
    if (!F) throw new Error('invalid max value: ' + e)
    if (
      ((this.#e = e),
      (this.#t = f),
      (this.maxEntrySize = d || this.#t),
      (this.sizeCalculation = B),
      this.sizeCalculation)
    ) {
      if (!this.#t && !this.maxEntrySize)
        throw new TypeError(
          'cannot set sizeCalculation without setting maxSize or maxEntrySize',
        )
      if ('function' != typeof this.sizeCalculation)
        throw new TypeError('sizeCalculation set to non-function')
    }
    if (void 0 !== g && 'function' != typeof g)
      throw new TypeError('memoMethod must be a function if defined')
    if (((this.#s = g), void 0 !== p && 'function' != typeof p))
      throw new TypeError('fetchMethod must be a function if specified')
    if (
      ((this.#o = p),
      (this.#F = !!p),
      (this.#u = new Map()),
      (this.#l = new Array(e).fill(void 0)),
      (this.#h = new Array(e).fill(void 0)),
      (this.#f = new F(e)),
      (this.#d = new F(e)),
      (this.#B = 0),
      (this.#p = 0),
      (this.#g = uf.create(e)),
      (this.#a = 0),
      (this.#c = 0),
      'function' == typeof a && (this.#r = a),
      'function' == typeof c && (this.#n = c),
      'function' == typeof u
        ? ((this.#i = u), (this.#w = []))
        : ((this.#i = void 0), (this.#w = void 0)),
      (this.#Q = !!this.#r),
      (this.#v = !!this.#n),
      (this.#U = !!this.#i),
      (this.noDisposeOnSet = !!l),
      (this.noUpdateTTL = !!h),
      (this.noDeleteOnFetchRejection = !!w),
      (this.allowStaleOnFetchRejection = !!C),
      (this.allowStaleOnFetchAbort = !!y),
      (this.ignoreFetchAbort = !!Q),
      0 !== this.maxEntrySize)
    ) {
      if (0 !== this.#t && !sf(this.#t))
        throw new TypeError('maxSize must be a positive integer if specified')
      if (!sf(this.maxEntrySize))
        throw new TypeError(
          'maxEntrySize must be a positive integer if specified',
        )
      this.#x()
    }
    if (
      ((this.allowStale = !!s),
      (this.noDeleteOnStaleGet = !!m),
      (this.updateAgeOnGet = !!i),
      (this.updateAgeOnHas = !!o),
      (this.ttlResolution = sf(r) || 0 === r ? r : 1),
      (this.ttlAutopurge = !!n),
      (this.ttl = t || 0),
      this.ttl)
    ) {
      if (!sf(this.ttl))
        throw new TypeError('ttl must be a positive integer if specified')
      this.#k()
    }
    if (0 === this.#e && 0 === this.ttl && 0 === this.#t)
      throw new TypeError('At least one of max, maxSize, or ttl is required')
    if (!this.ttlAutopurge && !this.#e && !this.#t) {
      const A = 'LRU_CACHE_UNBOUNDED'
      if (((A) => !ef.has(A))(A)) {
        ef.add(A)
        rf(
          'TTL caching without ttlAutopurge, max, or maxSize can result in unbounded memory consumption.',
          'UnboundedCacheWarning',
          A,
          lf,
        )
      }
    }
  }
  getRemainingTTL(A) {
    return this.#u.has(A) ? Infinity : 0
  }
  #k() {
    const A = new cf(this.#e),
      e = new cf(this.#e)
    ;((this.#y = A),
      (this.#C = e),
      (this.#L = (t, r, n = Af.now()) => {
        if (
          ((e[t] = 0 !== r ? n : 0), (A[t] = r), 0 !== r && this.ttlAutopurge)
        ) {
          const A = setTimeout(() => {
            this.#D(t) && this.#S(this.#l[t], 'expire')
          }, r + 1)
          A.unref && A.unref()
        }
      }),
      (this.#O = (t) => {
        e[t] = 0 !== A[t] ? Af.now() : 0
      }),
      (this.#K = (n, i) => {
        if (A[i]) {
          const o = A[i],
            s = e[i]
          if (!o || !s) return
          ;((n.ttl = o), (n.start = s), (n.now = t || r()))
          const a = n.now - s
          n.remainingTTL = o - a
        }
      }))
    let t = 0
    const r = () => {
      const A = Af.now()
      if (this.ttlResolution > 0) {
        t = A
        const e = setTimeout(() => (t = 0), this.ttlResolution)
        e.unref && e.unref()
      }
      return A
    }
    ;((this.getRemainingTTL = (n) => {
      const i = this.#u.get(n)
      if (void 0 === i) return 0
      const o = A[i],
        s = e[i]
      if (!o || !s) return Infinity
      return o - ((t || r()) - s)
    }),
      (this.#D = (n) => {
        const i = e[n],
          o = A[n]
        return !!o && !!i && (t || r()) - i > o
      }))
  }
  #O = () => {}
  #K = () => {}
  #L = () => {}
  #D = () => !1
  #x() {
    const A = new cf(this.#e)
    ;((this.#c = 0),
      (this.#m = A),
      (this.#T = (e) => {
        ;((this.#c -= A[e]), (A[e] = 0))
      }),
      (this.#M = (A, e, t, r) => {
        if (this.#b(e)) return 0
        if (!sf(t)) {
          if (!r)
            throw new TypeError(
              'invalid size value (must be positive integer). When maxSize or maxEntrySize is used, sizeCalculation or size must be set.',
            )
          if ('function' != typeof r)
            throw new TypeError('sizeCalculation must be a function')
          if (((t = r(e, A)), !sf(t)))
            throw new TypeError(
              'sizeCalculation return invalid (expect positive integer)',
            )
        }
        return t
      }),
      (this.#R = (e, t, r) => {
        if (((A[e] = t), this.#t)) {
          const t = this.#t - A[e]
          for (; this.#c > t; ) this.#N(!0)
        }
        ;((this.#c += A[e]),
          r && ((r.entrySize = t), (r.totalCalculatedSize = this.#c)))
      }))
  }
  #T = (A) => {}
  #R = (A, e, t) => {}
  #M = (A, e, t, r) => {
    if (t || r)
      throw new TypeError(
        'cannot set size without setting maxSize or maxEntrySize on cache',
      )
    return 0
  };
  *#_({ allowStale: A = this.allowStale } = {}) {
    if (this.#a)
      for (
        let e = this.#p;
        this.#P(e) && ((!A && this.#D(e)) || (yield e), e !== this.#B);

      )
        e = this.#d[e]
  }
  *#I({ allowStale: A = this.allowStale } = {}) {
    if (this.#a)
      for (
        let e = this.#B;
        this.#P(e) && ((!A && this.#D(e)) || (yield e), e !== this.#p);

      )
        e = this.#f[e]
  }
  #P(A) {
    return void 0 !== A && this.#u.get(this.#l[A]) === A
  }
  *entries() {
    for (const A of this.#_())
      void 0 === this.#h[A] ||
        void 0 === this.#l[A] ||
        this.#b(this.#h[A]) ||
        (yield [this.#l[A], this.#h[A]])
  }
  *rentries() {
    for (const A of this.#I())
      void 0 === this.#h[A] ||
        void 0 === this.#l[A] ||
        this.#b(this.#h[A]) ||
        (yield [this.#l[A], this.#h[A]])
  }
  *keys() {
    for (const A of this.#_()) {
      const e = this.#l[A]
      void 0 === e || this.#b(this.#h[A]) || (yield e)
    }
  }
  *rkeys() {
    for (const A of this.#I()) {
      const e = this.#l[A]
      void 0 === e || this.#b(this.#h[A]) || (yield e)
    }
  }
  *values() {
    for (const A of this.#_()) {
      void 0 === this.#h[A] || this.#b(this.#h[A]) || (yield this.#h[A])
    }
  }
  *rvalues() {
    for (const A of this.#I()) {
      void 0 === this.#h[A] || this.#b(this.#h[A]) || (yield this.#h[A])
    }
  }
  [Symbol.iterator]() {
    return this.entries()
  }
  [Symbol.toStringTag] = 'LRUCache'
  find(A, e = {}) {
    for (const t of this.#_()) {
      const r = this.#h[t],
        n = this.#b(r) ? r.__staleWhileFetching : r
      if (void 0 !== n && A(n, this.#l[t], this)) return this.get(this.#l[t], e)
    }
  }
  forEach(A, e = this) {
    for (const t of this.#_()) {
      const r = this.#h[t],
        n = this.#b(r) ? r.__staleWhileFetching : r
      void 0 !== n && A.call(e, n, this.#l[t], this)
    }
  }
  rforEach(A, e = this) {
    for (const t of this.#I()) {
      const r = this.#h[t],
        n = this.#b(r) ? r.__staleWhileFetching : r
      void 0 !== n && A.call(e, n, this.#l[t], this)
    }
  }
  purgeStale() {
    let A = !1
    for (const e of this.#I({ allowStale: !0 }))
      this.#D(e) && (this.#S(this.#l[e], 'expire'), (A = !0))
    return A
  }
  info(A) {
    const e = this.#u.get(A)
    if (void 0 === e) return
    const t = this.#h[e],
      r = this.#b(t) ? t.__staleWhileFetching : t
    if (void 0 === r) return
    const n = { value: r }
    if (this.#y && this.#C) {
      const A = this.#y[e],
        t = this.#C[e]
      if (A && t) {
        const e = A - (Af.now() - t)
        ;((n.ttl = e), (n.start = Date.now()))
      }
    }
    return (this.#m && (n.size = this.#m[e]), n)
  }
  dump() {
    const A = []
    for (const e of this.#_({ allowStale: !0 })) {
      const t = this.#l[e],
        r = this.#h[e],
        n = this.#b(r) ? r.__staleWhileFetching : r
      if (void 0 === n || void 0 === t) continue
      const i = { value: n }
      if (this.#y && this.#C) {
        i.ttl = this.#y[e]
        const A = Af.now() - this.#C[e]
        i.start = Math.floor(Date.now() - A)
      }
      ;(this.#m && (i.size = this.#m[e]), A.unshift([t, i]))
    }
    return A
  }
  load(A) {
    this.clear()
    for (const [e, t] of A) {
      if (t.start) {
        const A = Date.now() - t.start
        t.start = Af.now() - A
      }
      this.set(e, t.value, t)
    }
  }
  set(A, e, t = {}) {
    if (void 0 === e) return (this.delete(A), this)
    const {
      ttl: r = this.ttl,
      start: n,
      noDisposeOnSet: i = this.noDisposeOnSet,
      sizeCalculation: o = this.sizeCalculation,
      status: s,
    } = t
    let { noUpdateTTL: a = this.noUpdateTTL } = t
    const c = this.#M(A, e, t.size || 0, o)
    if (this.maxEntrySize && c > this.maxEntrySize)
      return (
        s && ((s.set = 'miss'), (s.maxEntrySizeExceeded = !0)),
        this.#S(A, 'set'),
        this
      )
    let u = 0 === this.#a ? void 0 : this.#u.get(A)
    if (void 0 === u)
      ((u =
        0 === this.#a
          ? this.#p
          : 0 !== this.#g.length
            ? this.#g.pop()
            : this.#a === this.#e
              ? this.#N(!1)
              : this.#a),
        (this.#l[u] = A),
        (this.#h[u] = e),
        this.#u.set(A, u),
        (this.#f[this.#p] = u),
        (this.#d[u] = this.#p),
        (this.#p = u),
        this.#a++,
        this.#R(u, c, s),
        s && (s.set = 'add'),
        (a = !1),
        this.#v && this.#n?.(e, A, 'add'))
    else {
      this.#H(u)
      const t = this.#h[u]
      if (e !== t) {
        if (this.#F && this.#b(t)) {
          t.__abortController.abort(new Error('replaced'))
          const { __staleWhileFetching: e } = t
          void 0 === e ||
            i ||
            (this.#Q && this.#r?.(e, A, 'set'),
            this.#U && this.#w?.push([e, A, 'set']))
        } else
          i ||
            (this.#Q && this.#r?.(t, A, 'set'),
            this.#U && this.#w?.push([t, A, 'set']))
        if ((this.#T(u), this.#R(u, c, s), (this.#h[u] = e), s)) {
          s.set = 'replace'
          const A = t && this.#b(t) ? t.__staleWhileFetching : t
          void 0 !== A && (s.oldValue = A)
        }
      } else s && (s.set = 'update')
      this.#v && this.onInsert?.(e, A, e === t ? 'update' : 'replace')
    }
    if (
      (0 === r || this.#y || this.#k(),
      this.#y && (a || this.#L(u, r, n), s && this.#K(s, u)),
      !i && this.#U && this.#w)
    ) {
      const A = this.#w
      let e
      for (; (e = A?.shift()); ) this.#i?.(...e)
    }
    return this
  }
  pop() {
    try {
      for (; this.#a; ) {
        const A = this.#h[this.#B]
        if ((this.#N(!0), this.#b(A))) {
          if (A.__staleWhileFetching) return A.__staleWhileFetching
        } else if (void 0 !== A) return A
      }
    } finally {
      if (this.#U && this.#w) {
        const A = this.#w
        let e
        for (; (e = A?.shift()); ) this.#i?.(...e)
      }
    }
  }
  #N(A) {
    const e = this.#B,
      t = this.#l[e],
      r = this.#h[e]
    return (
      this.#F && this.#b(r)
        ? r.__abortController.abort(new Error('evicted'))
        : (this.#Q || this.#U) &&
          (this.#Q && this.#r?.(r, t, 'evict'),
          this.#U && this.#w?.push([r, t, 'evict'])),
      this.#T(e),
      A && ((this.#l[e] = void 0), (this.#h[e] = void 0), this.#g.push(e)),
      1 === this.#a
        ? ((this.#B = this.#p = 0), (this.#g.length = 0))
        : (this.#B = this.#f[e]),
      this.#u.delete(t),
      this.#a--,
      e
    )
  }
  has(A, e = {}) {
    const { updateAgeOnHas: t = this.updateAgeOnHas, status: r } = e,
      n = this.#u.get(A)
    if (void 0 !== n) {
      const A = this.#h[n]
      if (this.#b(A) && void 0 === A.__staleWhileFetching) return !1
      if (!this.#D(n))
        return (t && this.#O(n), r && ((r.has = 'hit'), this.#K(r, n)), !0)
      r && ((r.has = 'stale'), this.#K(r, n))
    } else r && (r.has = 'miss')
    return !1
  }
  peek(A, e = {}) {
    const { allowStale: t = this.allowStale } = e,
      r = this.#u.get(A)
    if (void 0 === r || (!t && this.#D(r))) return
    const n = this.#h[r]
    return this.#b(n) ? n.__staleWhileFetching : n
  }
  #E(A, e, t, r) {
    const n = void 0 === e ? void 0 : this.#h[e]
    if (this.#b(n)) return n
    const i = new nf(),
      { signal: o } = t
    o?.addEventListener('abort', () => i.abort(o.reason), { signal: i.signal })
    const s = { signal: i.signal, options: t, context: r },
      a = (r, n = !1) => {
        const { aborted: o } = i.signal,
          a = t.ignoreFetchAbort && void 0 !== r
        if (
          (t.status &&
            (o && !n
              ? ((t.status.fetchAborted = !0),
                (t.status.fetchError = i.signal.reason),
                a && (t.status.fetchAbortIgnored = !0))
              : (t.status.fetchResolved = !0)),
          o && !a && !n)
        )
          return c(i.signal.reason)
        const l = u
        return (
          this.#h[e] === u &&
            (void 0 === r
              ? l.__staleWhileFetching
                ? (this.#h[e] = l.__staleWhileFetching)
                : this.#S(A, 'fetch')
              : (t.status && (t.status.fetchUpdated = !0),
                this.set(A, r, s.options))),
          r
        )
      },
      c = (r) => {
        const { aborted: n } = i.signal,
          o = n && t.allowStaleOnFetchAbort,
          s = o || t.allowStaleOnFetchRejection,
          a = s || t.noDeleteOnFetchRejection,
          c = u
        if (this.#h[e] === u) {
          !a || void 0 === c.__staleWhileFetching
            ? this.#S(A, 'fetch')
            : o || (this.#h[e] = c.__staleWhileFetching)
        }
        if (s)
          return (
            t.status &&
              void 0 !== c.__staleWhileFetching &&
              (t.status.returnedStale = !0),
            c.__staleWhileFetching
          )
        if (c.__returned === c) throw r
      }
    t.status && (t.status.fetchDispatched = !0)
    const u = new Promise((e, r) => {
        const o = this.#o?.(A, n, s)
        ;(o &&
          o instanceof Promise &&
          o.then((A) => e(void 0 === A ? void 0 : A), r),
          i.signal.addEventListener('abort', () => {
            ;(t.ignoreFetchAbort && !t.allowStaleOnFetchAbort) ||
              (e(void 0), t.allowStaleOnFetchAbort && (e = (A) => a(A, !0)))
          }))
      }).then(
        a,
        (A) => (
          t.status &&
            ((t.status.fetchRejected = !0), (t.status.fetchError = A)),
          c(A)
        ),
      ),
      l = Object.assign(u, {
        __abortController: i,
        __staleWhileFetching: n,
        __returned: void 0,
      })
    return (
      void 0 === e
        ? (this.set(A, l, { ...s.options, status: void 0 }),
          (e = this.#u.get(A)))
        : (this.#h[e] = l),
      l
    )
  }
  #b(A) {
    if (!this.#F) return !1
    const e = A
    return (
      !!e &&
      e instanceof Promise &&
      e.hasOwnProperty('__staleWhileFetching') &&
      e.__abortController instanceof nf
    )
  }
  async fetch(A, e = {}) {
    const {
      allowStale: t = this.allowStale,
      updateAgeOnGet: r = this.updateAgeOnGet,
      noDeleteOnStaleGet: n = this.noDeleteOnStaleGet,
      ttl: i = this.ttl,
      noDisposeOnSet: o = this.noDisposeOnSet,
      size: s = 0,
      sizeCalculation: a = this.sizeCalculation,
      noUpdateTTL: c = this.noUpdateTTL,
      noDeleteOnFetchRejection: u = this.noDeleteOnFetchRejection,
      allowStaleOnFetchRejection: l = this.allowStaleOnFetchRejection,
      ignoreFetchAbort: h = this.ignoreFetchAbort,
      allowStaleOnFetchAbort: f = this.allowStaleOnFetchAbort,
      context: d,
      forceRefresh: B = !1,
      status: p,
      signal: g,
    } = e
    if (!this.#F)
      return (
        p && (p.fetch = 'get'),
        this.get(A, {
          allowStale: t,
          updateAgeOnGet: r,
          noDeleteOnStaleGet: n,
          status: p,
        })
      )
    const w = {
      allowStale: t,
      updateAgeOnGet: r,
      noDeleteOnStaleGet: n,
      ttl: i,
      noDisposeOnSet: o,
      size: s,
      sizeCalculation: a,
      noUpdateTTL: c,
      noDeleteOnFetchRejection: u,
      allowStaleOnFetchRejection: l,
      allowStaleOnFetchAbort: f,
      ignoreFetchAbort: h,
      status: p,
      signal: g,
    }
    let m = this.#u.get(A)
    if (void 0 === m) {
      p && (p.fetch = 'miss')
      const e = this.#E(A, m, w, d)
      return (e.__returned = e)
    }
    {
      const e = this.#h[m]
      if (this.#b(e)) {
        const A = t && void 0 !== e.__staleWhileFetching
        return (
          p && ((p.fetch = 'inflight'), A && (p.returnedStale = !0)),
          A ? e.__staleWhileFetching : (e.__returned = e)
        )
      }
      const n = this.#D(m)
      if (!B && !n)
        return (
          p && (p.fetch = 'hit'),
          this.#H(m),
          r && this.#O(m),
          p && this.#K(p, m),
          e
        )
      const i = this.#E(A, m, w, d),
        o = void 0 !== i.__staleWhileFetching && t
      return (
        p &&
          ((p.fetch = n ? 'stale' : 'refresh'),
          o && n && (p.returnedStale = !0)),
        o ? i.__staleWhileFetching : (i.__returned = i)
      )
    }
  }
  async forceFetch(A, e = {}) {
    const t = await this.fetch(A, e)
    if (void 0 === t) throw new Error('fetch() returned undefined')
    return t
  }
  memo(A, e = {}) {
    const t = this.#s
    if (!t) throw new Error('no memoMethod provided to constructor')
    const { context: r, forceRefresh: n, ...i } = e,
      o = this.get(A, i)
    if (!n && void 0 !== o) return o
    const s = t(A, o, { options: i, context: r })
    return (this.set(A, s, i), s)
  }
  get(A, e = {}) {
    const {
        allowStale: t = this.allowStale,
        updateAgeOnGet: r = this.updateAgeOnGet,
        noDeleteOnStaleGet: n = this.noDeleteOnStaleGet,
        status: i,
      } = e,
      o = this.#u.get(A)
    if (void 0 !== o) {
      const e = this.#h[o],
        s = this.#b(e)
      return (
        i && this.#K(i, o),
        this.#D(o)
          ? (i && (i.get = 'stale'),
            s
              ? (i &&
                  t &&
                  void 0 !== e.__staleWhileFetching &&
                  (i.returnedStale = !0),
                t ? e.__staleWhileFetching : void 0)
              : (n || this.#S(A, 'expire'),
                i && t && (i.returnedStale = !0),
                t ? e : void 0))
          : (i && (i.get = 'hit'),
            s ? e.__staleWhileFetching : (this.#H(o), r && this.#O(o), e))
      )
    }
    i && (i.get = 'miss')
  }
  #V(A, e) {
    ;((this.#d[e] = A), (this.#f[A] = e))
  }
  #H(A) {
    A !== this.#p &&
      (A === this.#B ? (this.#B = this.#f[A]) : this.#V(this.#d[A], this.#f[A]),
      this.#V(this.#p, A),
      (this.#p = A))
  }
  delete(A) {
    return this.#S(A, 'delete')
  }
  #S(A, e) {
    let t = !1
    if (0 !== this.#a) {
      const r = this.#u.get(A)
      if (void 0 !== r)
        if (((t = !0), 1 === this.#a)) this.#G(e)
        else {
          this.#T(r)
          const t = this.#h[r]
          if (
            (this.#b(t)
              ? t.__abortController.abort(new Error('deleted'))
              : (this.#Q || this.#U) &&
                (this.#Q && this.#r?.(t, A, e),
                this.#U && this.#w?.push([t, A, e])),
            this.#u.delete(A),
            (this.#l[r] = void 0),
            (this.#h[r] = void 0),
            r === this.#p)
          )
            this.#p = this.#d[r]
          else if (r === this.#B) this.#B = this.#f[r]
          else {
            const A = this.#d[r]
            this.#f[A] = this.#f[r]
            const e = this.#f[r]
            this.#d[e] = this.#d[r]
          }
          ;(this.#a--, this.#g.push(r))
        }
    }
    if (this.#U && this.#w?.length) {
      const A = this.#w
      let e
      for (; (e = A?.shift()); ) this.#i?.(...e)
    }
    return t
  }
  clear() {
    return this.#G('delete')
  }
  #G(A) {
    for (const e of this.#I({ allowStale: !0 })) {
      const t = this.#h[e]
      if (this.#b(t)) t.__abortController.abort(new Error('deleted'))
      else {
        const r = this.#l[e]
        ;(this.#Q && this.#r?.(t, r, A), this.#U && this.#w?.push([t, r, A]))
      }
    }
    if (
      (this.#u.clear(),
      this.#h.fill(void 0),
      this.#l.fill(void 0),
      this.#y && this.#C && (this.#y.fill(0), this.#C.fill(0)),
      this.#m && this.#m.fill(0),
      (this.#B = 0),
      (this.#p = 0),
      (this.#g.length = 0),
      (this.#c = 0),
      (this.#a = 0),
      this.#U && this.#w)
    ) {
      const A = this.#w
      let e
      for (; (e = A?.shift()); ) this.#i?.(...e)
    }
  }
}
/*!
 * html2canvas 1.4.1 <https://html2canvas.hertzen.com>
 * Copyright (c) 2022 Niklas von Hertzen <https://hertzen.com>
 * Released under MIT License
 */
/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */ var hf =
  function (A, e) {
    return (hf =
      Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array &&
        function (A, e) {
          A.__proto__ = e
        }) ||
      function (A, e) {
        for (var t in e)
          Object.prototype.hasOwnProperty.call(e, t) && (A[t] = e[t])
      })(A, e)
  }
function ff(A, e) {
  if ('function' != typeof e && null !== e)
    throw new TypeError(
      'Class extends value ' + String(e) + ' is not a constructor or null',
    )
  function t() {
    this.constructor = A
  }
  ;(hf(A, e),
    (A.prototype =
      null === e ? Object.create(e) : ((t.prototype = e.prototype), new t())))
}
var df = function () {
  return (
    (df =
      Object.assign ||
      function (A) {
        for (var e, t = 1, r = arguments.length; t < r; t++)
          for (var n in (e = arguments[t]))
            Object.prototype.hasOwnProperty.call(e, n) && (A[n] = e[n])
        return A
      }),
    df.apply(this, arguments)
  )
}
function Bf(A, e, t, r) {
  return new (t || (t = Promise))(function (e, n) {
    function i(A) {
      try {
        s(r.next(A))
      } catch (fi) {
        n(fi)
      }
    }
    function o(A) {
      try {
        s(r.throw(A))
      } catch (fi) {
        n(fi)
      }
    }
    function s(A) {
      var r
      A.done
        ? e(A.value)
        : ((r = A.value),
          r instanceof t
            ? r
            : new t(function (A) {
                A(r)
              })).then(i, o)
    }
    s((r = r.apply(A, [])).next())
  })
}
function pf(A, e) {
  var t,
    r,
    n,
    i,
    o = {
      label: 0,
      sent: function () {
        if (1 & n[0]) throw n[1]
        return n[1]
      },
      trys: [],
      ops: [],
    }
  return (
    (i = { next: s(0), throw: s(1), return: s(2) }),
    'function' == typeof Symbol &&
      (i[Symbol.iterator] = function () {
        return this
      }),
    i
  )
  function s(i) {
    return function (s) {
      return (function (i) {
        if (t) throw new TypeError('Generator is already executing.')
        for (; o; )
          try {
            if (
              ((t = 1),
              r &&
                (n =
                  2 & i[0]
                    ? r.return
                    : i[0]
                      ? r.throw || ((n = r.return) && n.call(r), 0)
                      : r.next) &&
                !(n = n.call(r, i[1])).done)
            )
              return n
            switch (((r = 0), n && (i = [2 & i[0], n.value]), i[0])) {
              case 0:
              case 1:
                n = i
                break
              case 4:
                return (o.label++, { value: i[1], done: !1 })
              case 5:
                ;(o.label++, (r = i[1]), (i = [0]))
                continue
              case 7:
                ;((i = o.ops.pop()), o.trys.pop())
                continue
              default:
                if (
                  !((n = o.trys),
                  (n = n.length > 0 && n[n.length - 1]) ||
                    (6 !== i[0] && 2 !== i[0]))
                ) {
                  o = 0
                  continue
                }
                if (3 === i[0] && (!n || (i[1] > n[0] && i[1] < n[3]))) {
                  o.label = i[1]
                  break
                }
                if (6 === i[0] && o.label < n[1]) {
                  ;((o.label = n[1]), (n = i))
                  break
                }
                if (n && o.label < n[2]) {
                  ;((o.label = n[2]), o.ops.push(i))
                  break
                }
                ;(n[2] && o.ops.pop(), o.trys.pop())
                continue
            }
            i = e.call(A, o)
          } catch (fi) {
            ;((i = [6, fi]), (r = 0))
          } finally {
            t = n = 0
          }
        if (5 & i[0]) throw i[1]
        return { value: i[0] ? i[1] : void 0, done: !0 }
      })([i, s])
    }
  }
}
for (
  var gf = (function () {
      function A(A, e, t, r) {
        ;((this.left = A), (this.top = e), (this.width = t), (this.height = r))
      }
      return (
        (A.prototype.add = function (e, t, r, n) {
          return new A(
            this.left + e,
            this.top + t,
            this.width + r,
            this.height + n,
          )
        }),
        (A.fromClientRect = function (e, t) {
          return new A(
            t.left + e.windowBounds.left,
            t.top + e.windowBounds.top,
            t.width,
            t.height,
          )
        }),
        (A.fromDOMRectList = function (e, t) {
          var r = Array.from(t).find(function (A) {
            return 0 !== A.width
          })
          return r
            ? new A(
                r.left + e.windowBounds.left,
                r.top + e.windowBounds.top,
                r.width,
                r.height,
              )
            : A.EMPTY
        }),
        (A.EMPTY = new A(0, 0, 0, 0)),
        A
      )
    })(),
    wf = function (A, e) {
      return gf.fromClientRect(A, e.getBoundingClientRect())
    },
    mf = function (A) {
      for (var e = [], t = 0, r = A.length; t < r; ) {
        var n = A.charCodeAt(t++)
        if (n >= 55296 && n <= 56319 && t < r) {
          var i = A.charCodeAt(t++)
          56320 == (64512 & i)
            ? e.push(((1023 & n) << 10) + (1023 & i) + 65536)
            : (e.push(n), t--)
        } else e.push(n)
      }
      return e
    },
    Cf = function () {
      for (var A = [], e = 0; e < arguments.length; e++) A[e] = arguments[e]
      if (String.fromCodePoint) return String.fromCodePoint.apply(String, A)
      var t = A.length
      if (!t) return ''
      for (var r = [], n = -1, i = ''; ++n < t; ) {
        var o = A[n]
        ;(o <= 65535
          ? r.push(o)
          : ((o -= 65536), r.push(55296 + (o >> 10), (o % 1024) + 56320)),
          (n + 1 === t || r.length > 16384) &&
            ((i += String.fromCharCode.apply(String, r)), (r.length = 0)))
      }
      return i
    },
    yf = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
    Qf = 'undefined' == typeof Uint8Array ? [] : new Uint8Array(256),
    Ff = 0;
  Ff < 64;
  Ff++
)
  Qf[yf.charCodeAt(Ff)] = Ff
for (
  var Uf = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
    vf = 'undefined' == typeof Uint8Array ? [] : new Uint8Array(256),
    bf = 0;
  bf < 64;
  bf++
)
  vf[Uf.charCodeAt(bf)] = bf
for (
  var Ef = function (A, e, t) {
      return A.slice
        ? A.slice(e, t)
        : new Uint16Array(Array.prototype.slice.call(A, e, t))
    },
    Hf = (function () {
      function A(A, e, t, r, n, i) {
        ;((this.initialValue = A),
          (this.errorValue = e),
          (this.highStart = t),
          (this.highValueIndex = r),
          (this.index = n),
          (this.data = i))
      }
      return (
        (A.prototype.get = function (A) {
          var e
          if (A >= 0) {
            if (A < 55296 || (A > 56319 && A <= 65535))
              return (
                (e = ((e = this.index[A >> 5]) << 2) + (31 & A)),
                this.data[e]
              )
            if (A <= 65535)
              return (
                (e =
                  ((e = this.index[2048 + ((A - 55296) >> 5)]) << 2) +
                  (31 & A)),
                this.data[e]
              )
            if (A < this.highStart)
              return (
                (e = 2080 + (A >> 11)),
                (e = this.index[e]),
                (e += (A >> 5) & 63),
                (e = ((e = this.index[e]) << 2) + (31 & A)),
                this.data[e]
              )
            if (A <= 1114111) return this.data[this.highValueIndex]
          }
          return this.errorValue
        }),
        A
      )
    })(),
    _f = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
    If = 'undefined' == typeof Uint8Array ? [] : new Uint8Array(256),
    Df = 0;
  Df < 64;
  Df++
)
  If[_f.charCodeAt(Df)] = Df
var xf,
  kf,
  Lf,
  Sf,
  Of,
  Kf,
  Tf,
  Mf,
  Rf = 10,
  Nf = 13,
  Pf = 15,
  Vf = 17,
  Gf = 18,
  zf = 19,
  jf = 20,
  Wf = 21,
  qf = 22,
  Xf = 24,
  Jf = 25,
  Yf = 26,
  Zf = 27,
  $f = 28,
  Ad = 30,
  ed = 32,
  td = 33,
  rd = 34,
  nd = 35,
  id = 37,
  od = 38,
  sd = 39,
  ad = 40,
  cd = 42,
  ud = [9001, 65288],
  ld = '×',
  hd = '÷',
  fd =
    ((Sf = (function (A) {
      var e,
        t,
        r,
        n,
        i,
        o = 0.75 * A.length,
        s = A.length,
        a = 0
      '=' === A[A.length - 1] && (o--, '=' === A[A.length - 2] && o--)
      var c =
          'undefined' != typeof ArrayBuffer &&
          'undefined' != typeof Uint8Array &&
          void 0 !== Uint8Array.prototype.slice
            ? new ArrayBuffer(o)
            : new Array(o),
        u = Array.isArray(c) ? c : new Uint8Array(c)
      for (e = 0; e < s; e += 4)
        ((t = vf[A.charCodeAt(e)]),
          (r = vf[A.charCodeAt(e + 1)]),
          (n = vf[A.charCodeAt(e + 2)]),
          (i = vf[A.charCodeAt(e + 3)]),
          (u[a++] = (t << 2) | (r >> 4)),
          (u[a++] = ((15 & r) << 4) | (n >> 2)),
          (u[a++] = ((3 & n) << 6) | (63 & i)))
      return c
    })(
      'KwAAAAAAAAAACA4AUD0AADAgAAACAAAAAAAIABAAGABAAEgAUABYAGAAaABgAGgAYgBqAF8AZwBgAGgAcQB5AHUAfQCFAI0AlQCdAKIAqgCyALoAYABoAGAAaABgAGgAwgDKAGAAaADGAM4A0wDbAOEA6QDxAPkAAQEJAQ8BFwF1AH0AHAEkASwBNAE6AUIBQQFJAVEBWQFhAWgBcAF4ATAAgAGGAY4BlQGXAZ8BpwGvAbUBvQHFAc0B0wHbAeMB6wHxAfkBAQIJAvEBEQIZAiECKQIxAjgCQAJGAk4CVgJeAmQCbAJ0AnwCgQKJApECmQKgAqgCsAK4ArwCxAIwAMwC0wLbAjAA4wLrAvMC+AIAAwcDDwMwABcDHQMlAy0DNQN1AD0DQQNJA0kDSQNRA1EDVwNZA1kDdQB1AGEDdQBpA20DdQN1AHsDdQCBA4kDkQN1AHUAmQOhA3UAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AKYDrgN1AHUAtgO+A8YDzgPWAxcD3gPjA+sD8wN1AHUA+wMDBAkEdQANBBUEHQQlBCoEFwMyBDgEYABABBcDSARQBFgEYARoBDAAcAQzAXgEgASIBJAEdQCXBHUAnwSnBK4EtgS6BMIEyAR1AHUAdQB1AHUAdQCVANAEYABgAGAAYABgAGAAYABgANgEYADcBOQEYADsBPQE/AQEBQwFFAUcBSQFLAU0BWQEPAVEBUsFUwVbBWAAYgVgAGoFcgV6BYIFigWRBWAAmQWfBaYFYABgAGAAYABgAKoFYACxBbAFuQW6BcEFwQXHBcEFwQXPBdMF2wXjBeoF8gX6BQIGCgYSBhoGIgYqBjIGOgZgAD4GRgZMBmAAUwZaBmAAYABgAGAAYABgAGAAYABgAGAAYABgAGIGYABpBnAGYABgAGAAYABgAGAAYABgAGAAYAB4Bn8GhQZgAGAAYAB1AHcDFQSLBmAAYABgAJMGdQA9A3UAmwajBqsGqwaVALMGuwbDBjAAywbSBtIG1QbSBtIG0gbSBtIG0gbdBuMG6wbzBvsGAwcLBxMHAwcbByMHJwcsBywHMQcsB9IGOAdAB0gHTgfSBkgHVgfSBtIG0gbSBtIG0gbSBtIG0gbSBiwHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAdgAGAALAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAdbB2MHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsB2kH0gZwB64EdQB1AHUAdQB1AHUAdQB1AHUHfQdgAIUHjQd1AHUAlQedB2AAYAClB6sHYACzB7YHvgfGB3UAzgfWBzMB3gfmB1EB7gf1B/0HlQENAQUIDQh1ABUIHQglCBcDLQg1CD0IRQhNCEEDUwh1AHUAdQBbCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIaQhjCGQIZQhmCGcIaAhpCGMIZAhlCGYIZwhoCGkIYwhkCGUIZghnCGgIcAh3CHoIMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwAIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIgggwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAALAcsBywHLAcsBywHLAcsBywHLAcsB4oILAcsB44I0gaWCJ4Ipgh1AHUAqgiyCHUAdQB1AHUAdQB1AHUAdQB1AHUAtwh8AXUAvwh1AMUIyQjRCNkI4AjoCHUAdQB1AO4I9gj+CAYJDgkTCS0HGwkjCYIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiCCIIIggiAAIAAAAFAAYABgAGIAXwBgAHEAdQBFAJUAogCyAKAAYABgAEIA4ABGANMA4QDxAMEBDwE1AFwBLAE6AQEBUQF4QkhCmEKoQrhCgAHIQsAB0MLAAcABwAHAAeDC6ABoAHDCwMMAAcABwAHAAdDDGMMAAcAB6MM4wwjDWMNow3jDaABoAGgAaABoAGgAaABoAGgAaABoAGgAaABoAGgAaABoAGgAaABoAEjDqABWw6bDqABpg6gAaABoAHcDvwOPA+gAaABfA/8DvwO/A78DvwO/A78DvwO/A78DvwO/A78DvwO/A78DvwO/A78DvwO/A78DvwO/A78DvwO/A78DpcPAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcAB9cPKwkyCToJMAB1AHUAdQBCCUoJTQl1AFUJXAljCWcJawkwADAAMAAwAHMJdQB2CX4JdQCECYoJjgmWCXUAngkwAGAAYABxAHUApgn3A64JtAl1ALkJdQDACTAAMAAwADAAdQB1AHUAdQB1AHUAdQB1AHUAowYNBMUIMAAwADAAMADICcsJ0wnZCRUE4QkwAOkJ8An4CTAAMAB1AAAKvwh1AAgKDwoXCh8KdQAwACcKLgp1ADYKqAmICT4KRgowADAAdQB1AE4KMAB1AFYKdQBeCnUAZQowADAAMAAwADAAMAAwADAAMAAVBHUAbQowADAAdQC5CXUKMAAwAHwBxAijBogEMgF9CoQKiASMCpQKmgqIBKIKqgquCogEDQG2Cr4KxgrLCjAAMADTCtsKCgHjCusK8Qr5CgELMAAwADAAMAB1AIsECQsRC3UANAEZCzAAMAAwADAAMAB1ACELKQswAHUANAExCzkLdQBBC0kLMABRC1kLMAAwADAAMAAwADAAdQBhCzAAMAAwAGAAYABpC3ELdwt/CzAAMACHC4sLkwubC58Lpwt1AK4Ltgt1APsDMAAwADAAMAAwADAAMAAwAL4LwwvLC9IL1wvdCzAAMADlC+kL8Qv5C/8LSQswADAAMAAwADAAMAAwADAAMAAHDDAAMAAwADAAMAAODBYMHgx1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1ACYMMAAwADAAdQB1AHUALgx1AHUAdQB1AHUAdQA2DDAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwAHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AD4MdQBGDHUAdQB1AHUAdQB1AEkMdQB1AHUAdQB1AFAMMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwAHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQBYDHUAdQB1AF8MMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUA+wMVBGcMMAAwAHwBbwx1AHcMfwyHDI8MMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAYABgAJcMMAAwADAAdQB1AJ8MlQClDDAAMACtDCwHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsB7UMLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHdQB1AHUAdQB1AHUAdQB1AHUAdQB1AHUAdQB1AA0EMAC9DDAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAsBywHLAcsBywHLAcsBywHLQcwAMEMyAwsBywHLAcsBywHLAcsBywHLAcsBywHzAwwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwAHUAdQB1ANQM2QzhDDAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMABgAGAAYABgAGAAYABgAOkMYADxDGAA+AwADQYNYABhCWAAYAAODTAAMAAwADAAFg1gAGAAHg37AzAAMAAwADAAYABgACYNYAAsDTQNPA1gAEMNPg1LDWAAYABgAGAAYABgAGAAYABgAGAAUg1aDYsGVglhDV0NcQBnDW0NdQ15DWAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAlQCBDZUAiA2PDZcNMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAnw2nDTAAMAAwADAAMAAwAHUArw23DTAAMAAwADAAMAAwADAAMAAwADAAMAB1AL8NMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAB1AHUAdQB1AHUAdQDHDTAAYABgAM8NMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAA1w11ANwNMAAwAD0B5A0wADAAMAAwADAAMADsDfQN/A0EDgwOFA4wABsOMAAwADAAMAAwADAAMAAwANIG0gbSBtIG0gbSBtIG0gYjDigOwQUuDsEFMw7SBjoO0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIGQg5KDlIOVg7SBtIGXg5lDm0OdQ7SBtIGfQ6EDooOjQ6UDtIGmg6hDtIG0gaoDqwO0ga0DrwO0gZgAGAAYADEDmAAYAAkBtIGzA5gANIOYADaDokO0gbSBt8O5w7SBu8O0gb1DvwO0gZgAGAAxA7SBtIG0gbSBtIGYABgAGAAYAAED2AAsAUMD9IG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIGFA8sBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAccD9IGLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHJA8sBywHLAcsBywHLAccDywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywPLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAc0D9IG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIGLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAccD9IG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIGFA8sBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHLAcsBywHPA/SBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gbSBtIG0gYUD0QPlQCVAJUAMAAwADAAMACVAJUAlQCVAJUAlQCVAEwPMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAA//8EAAQABAAEAAQABAAEAAQABAANAAMAAQABAAIABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQACgATABcAHgAbABoAHgAXABYAEgAeABsAGAAPABgAHABLAEsASwBLAEsASwBLAEsASwBLABgAGAAeAB4AHgATAB4AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQABYAGwASAB4AHgAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAWAA0AEQAeAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAAQABAAEAAQABAAFAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAJABYAGgAbABsAGwAeAB0AHQAeAE8AFwAeAA0AHgAeABoAGwBPAE8ADgBQAB0AHQAdAE8ATwAXAE8ATwBPABYAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAFAAUABQAFAAUABQAFAAUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAFAAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAeAB4AHgAeAFAATwBAAE8ATwBPAEAATwBQAFAATwBQAB4AHgAeAB4AHgAeAB0AHQAdAB0AHgAdAB4ADgBQAFAAUABQAFAAHgAeAB4AHgAeAB4AHgBQAB4AUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4ABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAJAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAkACQAJAAkACQAJAAkABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAeAB4AHgAeAFAAHgAeAB4AKwArAFAAUABQAFAAGABQACsAKwArACsAHgAeAFAAHgBQAFAAUAArAFAAKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4ABAAEAAQABAAEAAQABAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAUAAeAB4AHgAeAB4AHgBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAYAA0AKwArAB4AHgAbACsABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQADQAEAB4ABAAEAB4ABAAEABMABAArACsAKwArACsAKwArACsAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAKwArACsAKwBWAFYAVgBWAB4AHgArACsAKwArACsAKwArACsAKwArACsAHgAeAB4AHgAeAB4AHgAeAB4AGgAaABoAGAAYAB4AHgAEAAQABAAEAAQABAAEAAQABAAEAAQAEwAEACsAEwATAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABLAEsASwBLAEsASwBLAEsASwBLABoAGQAZAB4AUABQAAQAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQABMAUAAEAAQABAAEAAQABAAEAB4AHgAEAAQABAAEAAQABABQAFAABAAEAB4ABAAEAAQABABQAFAASwBLAEsASwBLAEsASwBLAEsASwBQAFAAUAAeAB4AUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwAeAFAABABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAFAAKwArACsAKwArACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQAUABQAB4AHgAYABMAUAArACsABAAbABsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAFAABAAEAAQABAAEAFAABAAEAAQAUAAEAAQABAAEAAQAKwArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAArACsAHgArAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwArACsAKwArACsAKwArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAB4ABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAUAAEAAQABAAEAAQABAAEAFAAUABQAFAAUABQAFAAUABQAFAABAAEAA0ADQBLAEsASwBLAEsASwBLAEsASwBLAB4AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAArAFAAUABQAFAAUABQAFAAUAArACsAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUAArACsAKwBQAFAAUABQACsAKwAEAFAABAAEAAQABAAEAAQABAArACsABAAEACsAKwAEAAQABABQACsAKwArACsAKwArACsAKwAEACsAKwArACsAUABQACsAUABQAFAABAAEACsAKwBLAEsASwBLAEsASwBLAEsASwBLAFAAUAAaABoAUABQAFAAUABQAEwAHgAbAFAAHgAEACsAKwAEAAQABAArAFAAUABQAFAAUABQACsAKwArACsAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUABQACsAUABQACsAUABQACsAKwAEACsABAAEAAQABAAEACsAKwArACsABAAEACsAKwAEAAQABAArACsAKwAEACsAKwArACsAKwArACsAUABQAFAAUAArAFAAKwArACsAKwArACsAKwBLAEsASwBLAEsASwBLAEsASwBLAAQABABQAFAAUAAEAB4AKwArACsAKwArACsAKwArACsAKwAEAAQABAArAFAAUABQAFAAUABQAFAAUABQACsAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUABQACsAUABQAFAAUABQACsAKwAEAFAABAAEAAQABAAEAAQABAAEACsABAAEAAQAKwAEAAQABAArACsAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAABAAEACsAKwBLAEsASwBLAEsASwBLAEsASwBLAB4AGwArACsAKwArACsAKwArAFAABAAEAAQABAAEAAQAKwAEAAQABAArAFAAUABQAFAAUABQAFAAUAArACsAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAArACsABAAEACsAKwAEAAQABAArACsAKwArACsAKwArAAQABAAEACsAKwArACsAUABQACsAUABQAFAABAAEACsAKwBLAEsASwBLAEsASwBLAEsASwBLAB4AUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArAAQAUAArAFAAUABQAFAAUABQACsAKwArAFAAUABQACsAUABQAFAAUAArACsAKwBQAFAAKwBQACsAUABQACsAKwArAFAAUAArACsAKwBQAFAAUAArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArAAQABAAEAAQABAArACsAKwAEAAQABAArAAQABAAEAAQAKwArAFAAKwArACsAKwArACsABAArACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAUABQAFAAHgAeAB4AHgAeAB4AGwAeACsAKwArACsAKwAEAAQABAAEAAQAUABQAFAAUABQAFAAUABQACsAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAUAAEAAQABAAEAAQABAAEACsABAAEAAQAKwAEAAQABAAEACsAKwArACsAKwArACsABAAEACsAUABQAFAAKwArACsAKwArAFAAUAAEAAQAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAKwAOAFAAUABQAFAAUABQAFAAHgBQAAQABAAEAA4AUABQAFAAUABQAFAAUABQACsAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAKwArAAQAUAAEAAQABAAEAAQABAAEACsABAAEAAQAKwAEAAQABAAEACsAKwArACsAKwArACsABAAEACsAKwArACsAKwArACsAUAArAFAAUAAEAAQAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwBQAFAAKwArACsAKwArACsAKwArACsAKwArACsAKwAEAAQABAAEAFAAUABQAFAAUABQAFAAUABQACsAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAFAABAAEAAQABAAEAAQABAArAAQABAAEACsABAAEAAQABABQAB4AKwArACsAKwBQAFAAUAAEAFAAUABQAFAAUABQAFAAUABQAFAABAAEACsAKwBLAEsASwBLAEsASwBLAEsASwBLAFAAUABQAFAAUABQAFAAUABQABoAUABQAFAAUABQAFAAKwAEAAQABAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQACsAUAArACsAUABQAFAAUABQAFAAUAArACsAKwAEACsAKwArACsABAAEAAQABAAEAAQAKwAEACsABAAEAAQABAAEAAQABAAEACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArAAQABAAeACsAKwArACsAKwArACsAKwArACsAKwArAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXAAqAFwAXAAqACoAKgAqACoAKgAqACsAKwArACsAGwBcAFwAXABcAFwAXABcACoAKgAqACoAKgAqACoAKgAeAEsASwBLAEsASwBLAEsASwBLAEsADQANACsAKwArACsAKwBcAFwAKwBcACsAXABcAFwAXABcACsAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcACsAXAArAFwAXABcAFwAXABcAFwAXABcAFwAKgBcAFwAKgAqACoAKgAqACoAKgAqACoAXAArACsAXABcAFwAXABcACsAXAArACoAKgAqACoAKgAqACsAKwBLAEsASwBLAEsASwBLAEsASwBLACsAKwBcAFwAXABcAFAADgAOAA4ADgAeAA4ADgAJAA4ADgANAAkAEwATABMAEwATAAkAHgATAB4AHgAeAAQABAAeAB4AHgAeAB4AHgBLAEsASwBLAEsASwBLAEsASwBLAFAAUABQAFAAUABQAFAAUABQAFAADQAEAB4ABAAeAAQAFgARABYAEQAEAAQAUABQAFAAUABQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQADQAEAAQABAAEAAQADQAEAAQAUABQAFAAUABQAAQABAAEAAQABAAEAAQABAAEAAQABAArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAArAA0ADQAeAB4AHgAeAB4AHgAEAB4AHgAeAB4AHgAeACsAHgAeAA4ADgANAA4AHgAeAB4AHgAeAAkACQArACsAKwArACsAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgBcAEsASwBLAEsASwBLAEsASwBLAEsADQANAB4AHgAeAB4AXABcAFwAXABcAFwAKgAqACoAKgBcAFwAXABcACoAKgAqAFwAKgAqACoAXABcACoAKgAqACoAKgAqACoAXABcAFwAKgAqACoAKgBcAFwAXABcAFwAXABcAFwAXABcAFwAXABcACoAKgAqACoAKgAqACoAKgAqACoAKgAqAFwAKgBLAEsASwBLAEsASwBLAEsASwBLACoAKgAqACoAKgAqAFAAUABQAFAAUABQACsAUAArACsAKwArACsAUAArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgBQAFAAUABQAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFAAUABQAFAAUABQAFAAUABQACsAUABQAFAAUAArACsAUABQAFAAUABQAFAAUAArAFAAKwBQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAKwArAFAAUABQAFAAUABQAFAAKwBQACsAUABQAFAAUAArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsABAAEAAQAHgANAB4AHgAeAB4AHgAeAB4AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUAArACsADQBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAANAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAWABEAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAA0ADQANAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAAQABAAEACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAANAA0AKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUAArAAQABAArACsAKwArACsAKwArACsAKwArACsAKwBcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqAA0ADQAVAFwADQAeAA0AGwBcACoAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwAeAB4AEwATAA0ADQAOAB4AEwATAB4ABAAEAAQACQArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAFAAUABQAFAAUAAEAAQAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQAUAArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAArACsAKwArAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwArACsAHgArACsAKwATABMASwBLAEsASwBLAEsASwBLAEsASwBcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXAArACsAXABcAFwAXABcACsAKwArACsAKwArACsAKwArACsAKwBcAFwAXABcAFwAXABcAFwAXABcAFwAXAArACsAKwArAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAXAArACsAKwAqACoAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAArACsAHgAeAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcACoAKgAqACoAKgAqACoAKgAqACoAKwAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKwArAAQASwBLAEsASwBLAEsASwBLAEsASwArACsAKwArACsAKwBLAEsASwBLAEsASwBLAEsASwBLACsAKwArACsAKwArACoAKgAqACoAKgAqACoAXAAqACoAKgAqACoAKgArACsABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsABAAEAAQABAAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABABQAFAAUABQAFAAUABQACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwANAA0AHgANAA0ADQANAB4AHgAeAB4AHgAeAB4AHgAeAB4ABAAEAAQABAAEAAQABAAEAAQAHgAeAB4AHgAeAB4AHgAeAB4AKwArACsABAAEAAQAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABQAFAASwBLAEsASwBLAEsASwBLAEsASwBQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwArACsAKwArACsAKwAeAB4AHgAeAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwArAA0ADQANAA0ADQBLAEsASwBLAEsASwBLAEsASwBLACsAKwArAFAAUABQAEsASwBLAEsASwBLAEsASwBLAEsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAA0ADQBQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUAAeAB4AHgAeAB4AHgAeAB4AKwArACsAKwArACsAKwArAAQABAAEAB4ABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABQAFAAUABQAAQAUABQAFAAUABQAFAABABQAFAABAAEAAQAUAArACsAKwArACsABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsABAAEAAQABAAEAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwArAFAAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAKwBQACsAUAArAFAAKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACsAKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArAB4AHgAeAB4AHgAeAB4AHgBQAB4AHgAeAFAAUABQACsAHgAeAB4AHgAeAB4AHgAeAB4AHgBQAFAAUABQACsAKwAeAB4AHgAeAB4AHgArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwArAFAAUABQACsAHgAeAB4AHgAeAB4AHgAOAB4AKwANAA0ADQANAA0ADQANAAkADQANAA0ACAAEAAsABAAEAA0ACQANAA0ADAAdAB0AHgAXABcAFgAXABcAFwAWABcAHQAdAB4AHgAUABQAFAANAAEAAQAEAAQABAAEAAQACQAaABoAGgAaABoAGgAaABoAHgAXABcAHQAVABUAHgAeAB4AHgAeAB4AGAAWABEAFQAVABUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4ADQAeAA0ADQANAA0AHgANAA0ADQAHAB4AHgAeAB4AKwAEAAQABAAEAAQABAAEAAQABAAEAFAAUAArACsATwBQAFAAUABQAFAAHgAeAB4AFgARAE8AUABPAE8ATwBPAFAAUABQAFAAUAAeAB4AHgAWABEAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArABsAGwAbABsAGwAbABsAGgAbABsAGwAbABsAGwAbABsAGwAbABsAGwAbABsAGgAbABsAGwAbABoAGwAbABoAGwAbABsAGwAbABsAGwAbABsAGwAbABsAGwAbABsAGwAbAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAHgAeAFAAGgAeAB0AHgBQAB4AGgAeAB4AHgAeAB4AHgAeAB4AHgBPAB4AUAAbAB4AHgBQAFAAUABQAFAAHgAeAB4AHQAdAB4AUAAeAFAAHgBQAB4AUABPAFAAUAAeAB4AHgAeAB4AHgAeAFAAUABQAFAAUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAFAAHgBQAFAAUABQAE8ATwBQAFAAUABQAFAATwBQAFAATwBQAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAFAAUABQAFAATwBPAE8ATwBPAE8ATwBPAE8ATwBQAFAAUABQAFAAUABQAFAAUAAeAB4AUABQAFAAUABPAB4AHgArACsAKwArAB0AHQAdAB0AHQAdAB0AHQAdAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB0AHgAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB4AHQAdAB4AHgAeAB0AHQAeAB4AHQAeAB4AHgAdAB4AHQAbABsAHgAdAB4AHgAeAB4AHQAeAB4AHQAdAB0AHQAeAB4AHQAeAB0AHgAdAB0AHQAdAB0AHQAeAB0AHgAeAB4AHgAeAB0AHQAdAB0AHgAeAB4AHgAdAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB4AHgAeAB0AHgAeAB4AHgAeAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB0AHgAeAB0AHQAdAB0AHgAeAB0AHQAeAB4AHQAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB0AHQAeAB4AHQAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHQAeAB4AHgAdAB4AHgAeAB4AHgAeAB4AHQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AFAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeABYAEQAWABEAHgAeAB4AHgAeAB4AHQAeAB4AHgAeAB4AHgAeACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAWABEAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AJQAlACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAFAAHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHgAeAB4AHgAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAeAB4AHQAdAB0AHQAeAB4AHgAeAB4AHgAeAB4AHgAeAB0AHQAeAB0AHQAdAB0AHQAdAB0AHgAeAB4AHgAeAB4AHgAeAB0AHQAeAB4AHQAdAB4AHgAeAB4AHQAdAB4AHgAeAB4AHQAdAB0AHgAeAB0AHgAeAB0AHQAdAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB0AHQAdAB4AHgAeAB4AHgAeAB4AHgAeAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAlACUAJQAlAB4AHQAdAB4AHgAdAB4AHgAeAB4AHQAdAB4AHgAeAB4AJQAlAB0AHQAlAB4AJQAlACUAIAAlACUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAlACUAJQAeAB4AHgAeAB0AHgAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB0AHgAdAB0AHQAeAB0AJQAdAB0AHgAdAB0AHgAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHQAdAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAlACUAJQAlACUAJQAlACUAJQAlACUAJQAdAB0AHQAdACUAHgAlACUAJQAdACUAJQAdAB0AHQAlACUAHQAdACUAHQAdACUAJQAlAB4AHQAeAB4AHgAeAB0AHQAlAB0AHQAdAB0AHQAdACUAJQAlACUAJQAdACUAJQAgACUAHQAdACUAJQAlACUAJQAlACUAJQAeAB4AHgAlACUAIAAgACAAIAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB0AHgAeAB4AFwAXABcAFwAXABcAHgATABMAJQAeAB4AHgAWABEAFgARABYAEQAWABEAFgARABYAEQAWABEATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeABYAEQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAWABEAFgARABYAEQAWABEAFgARAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AFgARABYAEQAWABEAFgARABYAEQAWABEAFgARABYAEQAWABEAFgARABYAEQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAWABEAFgARAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AFgARAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAdAB0AHQAdAB0AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AUABQAFAAUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAEAAQABAAeAB4AKwArACsAKwArABMADQANAA0AUAATAA0AUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAUAANACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQACsAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXAA0ADQANAA0ADQANAA0ADQAeAA0AFgANAB4AHgAXABcAHgAeABcAFwAWABEAFgARABYAEQAWABEADQANAA0ADQATAFAADQANAB4ADQANAB4AHgAeAB4AHgAMAAwADQANAA0AHgANAA0AFgANAA0ADQANAA0ADQANAA0AHgANAB4ADQANAB4AHgAeACsAKwArACsAKwArACsAKwArACsAKwArACsAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACsAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAKwArACsAKwArACsAKwArACsAKwArACsAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAlACUAJQAlACUAJQAlACUAJQAlACUAJQArACsAKwArAA0AEQARACUAJQBHAFcAVwAWABEAFgARABYAEQAWABEAFgARACUAJQAWABEAFgARABYAEQAWABEAFQAWABEAEQAlAFcAVwBXAFcAVwBXAFcAVwBXAAQABAAEAAQABAAEACUAVwBXAFcAVwA2ACUAJQBXAFcAVwBHAEcAJQAlACUAKwBRAFcAUQBXAFEAVwBRAFcAUQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFEAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBRAFcAUQBXAFEAVwBXAFcAVwBXAFcAUQBXAFcAVwBXAFcAVwBRAFEAKwArAAQABAAVABUARwBHAFcAFQBRAFcAUQBXAFEAVwBRAFcAUQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFEAVwBRAFcAUQBXAFcAVwBXAFcAVwBRAFcAVwBXAFcAVwBXAFEAUQBXAFcAVwBXABUAUQBHAEcAVwArACsAKwArACsAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAKwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAKwAlACUAVwBXAFcAVwAlACUAJQAlACUAJQAlACUAJQAlACsAKwArACsAKwArACsAKwArACsAKwArAFEAUQBRAFEAUQBRAFEAUQBRAFEAUQBRAFEAUQBRAFEAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQArAFcAVwBXAFcAVwBXAFcAVwBXAFcAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQBPAE8ATwBPAE8ATwBPAE8AJQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXACUAJQAlAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAEcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAKwArACsAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAADQATAA0AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABLAEsASwBLAEsASwBLAEsASwBLAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAFAABAAEAAQABAAeAAQABAAEAAQABAAEAAQABAAEAAQAHgBQAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AUABQAAQABABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAeAA0ADQANAA0ADQArACsAKwArACsAKwArACsAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAFAAUABQAFAAUABQAFAAUABQAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AUAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgBQAB4AHgAeAB4AHgAeAFAAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAHgAeAB4AHgAeAB4AHgAeAB4AKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAeAB4AUABQAFAAUABQAFAAUABQAFAAUABQAAQAUABQAFAABABQAFAAUABQAAQAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAAeAB4AHgAeAAQAKwArACsAUABQAFAAUABQAFAAHgAeABoAHgArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAADgAOABMAEwArACsAKwArACsAKwArACsABAAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAAEACsAKwArACsAKwArACsAKwANAA0ASwBLAEsASwBLAEsASwBLAEsASwArACsAKwArACsAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABABQAFAAUABQAFAAUAAeAB4AHgBQAA4AUABQAAQAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAA0ADQBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAKwArACsAKwArACsAKwArACsAKwArAB4AWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYAFgAWABYACsAKwArAAQAHgAeAB4AHgAeAB4ADQANAA0AHgAeAB4AHgArAFAASwBLAEsASwBLAEsASwBLAEsASwArACsAKwArAB4AHgBcAFwAXABcAFwAKgBcAFwAXABcAFwAXABcAFwAXABcAEsASwBLAEsASwBLAEsASwBLAEsAXABcAFwAXABcACsAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsAKwArACsAKwArACsAKwArAFAAUABQAAQAUABQAFAAUABQAFAAUABQAAQABAArACsASwBLAEsASwBLAEsASwBLAEsASwArACsAHgANAA0ADQBcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAKgAqACoAXAAqACoAKgBcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXAAqAFwAKgAqACoAXABcACoAKgBcAFwAXABcAFwAKgAqAFwAKgBcACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFwAXABcACoAKgBQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAA0ADQBQAFAAUAAEAAQAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUAArACsAUABQAFAAUABQAFAAKwArAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgAeACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQADQAEAAQAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAVABVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBUAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVAFUAVQBVACsAKwArACsAKwArACsAKwArACsAKwArAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAWQBZAFkAKwArACsAKwBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAWgBaAFoAKwArACsAKwAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYABgAGAAYAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXACUAJQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAJQAlACUAJQAlACUAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAKwArACsAKwArAFYABABWAFYAVgBWAFYAVgBWAFYAVgBWAB4AVgBWAFYAVgBWAFYAVgBWAFYAVgBWAFYAVgArAFYAVgBWAFYAVgArAFYAKwBWAFYAKwBWAFYAKwBWAFYAVgBWAFYAVgBWAFYAVgBWAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAEQAWAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUAAaAB4AKwArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAGAARABEAGAAYABMAEwAWABEAFAArACsAKwArACsAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACUAJQAlACUAJQAWABEAFgARABYAEQAWABEAFgARABYAEQAlACUAFgARACUAJQAlACUAJQAlACUAEQAlABEAKwAVABUAEwATACUAFgARABYAEQAWABEAJQAlACUAJQAlACUAJQAlACsAJQAbABoAJQArACsAKwArAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArAAcAKwATACUAJQAbABoAJQAlABYAEQAlACUAEQAlABEAJQBXAFcAVwBXAFcAVwBXAFcAVwBXABUAFQAlACUAJQATACUAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXABYAJQARACUAJQAlAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwAWACUAEQAlABYAEQARABYAEQARABUAVwBRAFEAUQBRAFEAUQBRAFEAUQBRAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAEcARwArACsAVwBXAFcAVwBXAFcAKwArAFcAVwBXAFcAVwBXACsAKwBXAFcAVwBXAFcAVwArACsAVwBXAFcAKwArACsAGgAbACUAJQAlABsAGwArAB4AHgAeAB4AHgAeAB4AKwArACsAKwArACsAKwArACsAKwAEAAQABAAQAB0AKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsADQANAA0AKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArAB4AHgAeAB4AHgAeAB4AHgAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgBQAFAAHgAeAB4AKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAAQAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAA0AUABQAFAAUAArACsAKwArAFAAUABQAFAAUABQAFAAUAANAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArACsAKwAeACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAKwArAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUAArACsAKwBQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwANAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAeAB4AUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUAArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArAA0AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAUABQAFAAUABQAAQABAAEACsABAAEACsAKwArACsAKwAEAAQABAAEAFAAUABQAFAAKwBQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArAAQABAAEACsAKwArACsABABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAA0ADQANAA0ADQANAA0ADQAeACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAeAFAAUABQAFAAUABQAFAAUAAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAArACsAKwArAFAAUABQAFAAUAANAA0ADQANAA0ADQAUACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsADQANAA0ADQANAA0ADQBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAB4AHgAeAB4AKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArAFAAUABQAFAAUABQAAQABAAEAAQAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUAArAAQABAANACsAKwBQAFAAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAAQABAAEAAQABAAEAAQABAAEAAQABABQAFAAUABQAB4AHgAeAB4AHgArACsAKwArACsAKwAEAAQABAAEAAQABAAEAA0ADQAeAB4AHgAeAB4AKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsABABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAQABAAEAAQABAAEAAQABAAEAAQABAAeAB4AHgANAA0ADQANACsAKwArACsAKwArACsAKwArACsAKwAeACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwArACsAKwBLAEsASwBLAEsASwBLAEsASwBLACsAKwArACsAKwArAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEACsASwBLAEsASwBLAEsASwBLAEsASwANAA0ADQANAFAABAAEAFAAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAeAA4AUAArACsAKwArACsAKwArACsAKwAEAFAAUABQAFAADQANAB4ADQAEAAQABAAEAB4ABAAEAEsASwBLAEsASwBLAEsASwBLAEsAUAAOAFAADQANAA0AKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAANAA0AHgANAA0AHgAEACsAUABQAFAAUABQAFAAUAArAFAAKwBQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAA0AKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsABAAEAAQABAArAFAAUABQAFAAUABQAFAAUAArACsAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUABQACsAUABQAFAAUABQACsABAAEAFAABAAEAAQABAAEAAQABAArACsABAAEACsAKwAEAAQABAArACsAUAArACsAKwArACsAKwAEACsAKwArACsAKwBQAFAAUABQAFAABAAEACsAKwAEAAQABAAEAAQABAAEACsAKwArAAQABAAEAAQABAArACsAKwArACsAKwArACsAKwArACsABAAEAAQABAAEAAQABABQAFAAUABQAA0ADQANAA0AHgBLAEsASwBLAEsASwBLAEsASwBLAA0ADQArAB4ABABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAEAAQABAAEAFAAUAAeAFAAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAArACsABAAEAAQABAAEAAQABAAEAAQADgANAA0AEwATAB4AHgAeAA0ADQANAA0ADQANAA0ADQANAA0ADQANAA0ADQANAFAAUABQAFAABAAEACsAKwAEAA0ADQAeAFAAKwArACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAFAAKwArACsAKwArACsAKwBLAEsASwBLAEsASwBLAEsASwBLACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAXABcAFwAKwArACoAKgAqACoAKgAqACoAKgAqACoAKgAqACoAKgAqACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwBcAFwADQANAA0AKgBQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAeACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwBQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAKwArAFAAKwArAFAAUABQAFAAUABQAFAAUAArAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQAKwAEAAQAKwArAAQABAAEAAQAUAAEAFAABAAEAA0ADQANACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAArACsABAAEAAQABAAEAAQABABQAA4AUAAEACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAABAAEAAQABAAEAAQABAAEAAQABABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAFAABAAEAAQABAAOAB4ADQANAA0ADQAOAB4ABAArACsAKwArACsAKwArACsAUAAEAAQABAAEAAQABAAEAAQABAAEAAQAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAA0ADQANAFAADgAOAA4ADQANACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAEAAQABAAEACsABAAEAAQABAAEAAQABAAEAFAADQANAA0ADQANACsAKwArACsAKwArACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwAOABMAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQACsAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAArACsAKwAEACsABAAEACsABAAEAAQABAAEAAQABABQAAQAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAUABQAFAAUABQAFAAKwBQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQAKwAEAAQAKwAEAAQABAAEAAQAUAArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAABAAEAAQABAAeAB4AKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAB4AHgAeAB4AHgAeAB4AHgAaABoAGgAaAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwArACsAKwArACsAKwArAA0AUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsADQANAA0ADQANACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAASABIAEgAQwBDAEMAUABQAFAAUABDAFAAUABQAEgAQwBIAEMAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAASABDAEMAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwAJAAkACQAJAAkACQAJABYAEQArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABIAEMAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwANAA0AKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArAAQABAAEAAQABAANACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEAA0ADQANAB4AHgAeAB4AHgAeAFAAUABQAFAADQAeACsAKwArACsAKwArACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwArAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAANAA0AHgAeACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwAEAFAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAKwArACsAKwArACsAKwAEAAQABAAEAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAARwBHABUARwAJACsAKwArACsAKwArACsAKwArACsAKwAEAAQAKwArACsAKwArACsAKwArACsAKwArACsAKwArAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXACsAKwArACsAKwArACsAKwBXAFcAVwBXAFcAVwBXAFcAVwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUQBRAFEAKwArACsAKwArACsAKwArACsAKwArACsAKwBRAFEAUQBRACsAKwArACsAKwArACsAKwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUAArACsAHgAEAAQADQAEAAQABAAEACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwArACsAKwArAB4AHgAeAB4AHgAeAB4AKwArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAAQABAAEAAQABAAeAB4AHgAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAB4AHgAEAAQABAAEAAQABAAEAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4ABAAEAAQABAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4ABAAEAAQAHgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwArACsAKwArACsAKwArACsAKwArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwArACsAKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwBQAFAAKwArAFAAKwArAFAAUAArACsAUABQAFAAUAArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACsAUAArAFAAUABQAFAAUABQAFAAKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwBQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAHgAeAFAAUABQAFAAUAArAFAAKwArACsAUABQAFAAUABQAFAAUAArAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAHgBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgBQAFAAUABQAFAAUABQAFAAUABQAFAAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAB4AHgAeAB4AHgAeAB4AHgAeACsAKwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAEsASwBLAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAeAB4AHgAeAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAeAB4AHgAeAB4AHgAeAB4ABAAeAB4AHgAeAB4AHgAeAB4AHgAeAAQAHgAeAA0ADQANAA0AHgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAEAAQABAAEAAQAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAAQABAAEAAQABAAEAAQAKwAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAKwArAAQABAAEAAQABAAEAAQAKwAEAAQAKwAEAAQABAAEAAQAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwAEAAQABAAEAAQABAAEAFAAUABQAFAAUABQAFAAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwBQAB4AKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArABsAUABQAFAAUABQACsAKwBQAFAAUABQAFAAUABQAFAAUAAEAAQABAAEAAQABAAEACsAKwArACsAKwArACsAKwArAB4AHgAeAB4ABAAEAAQABAAEAAQABABQACsAKwArACsASwBLAEsASwBLAEsASwBLAEsASwArACsAKwArABYAFgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAGgBQAFAAUAAaAFAAUABQAFAAKwArACsAKwArACsAKwArACsAKwArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAeAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQACsAKwBQAFAAUABQACsAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwBQAFAAKwBQACsAKwBQACsAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAKwBQACsAUAArACsAKwArACsAKwBQACsAKwArACsAUAArAFAAKwBQACsAUABQAFAAKwBQAFAAKwBQACsAKwBQACsAUAArAFAAKwBQACsAUAArAFAAUAArAFAAKwArAFAAUABQAFAAKwBQAFAAUABQAFAAUABQACsAUABQAFAAUAArAFAAUABQAFAAKwBQACsAUABQAFAAUABQAFAAUABQAFAAUAArAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAArACsAKwArACsAUABQAFAAKwBQAFAAUABQAFAAKwBQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwAeAB4AKwArACsAKwArACsAKwArACsAKwArACsAKwArAE8ATwBPAE8ATwBPAE8ATwBPAE8ATwBPAE8AJQAlACUAHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHgAeAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB4AHgAeACUAJQAlAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAdAB0AHQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQApACkAKQApACkAKQApACkAKQApACkAKQApACkAKQApACkAKQApACkAKQApACkAKQApACkAJQAlACUAJQAlACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAeAB4AJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlAB4AHgAlACUAJQAlACUAHgAlACUAJQAlACUAIAAgACAAJQAlACAAJQAlACAAIAAgACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACEAIQAhACEAIQAlACUAIAAgACUAJQAgACAAIAAgACAAIAAgACAAIAAgACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAJQAlACUAIAAlACUAJQAlACAAIAAgACUAIAAgACAAJQAlACUAJQAlACUAJQAgACUAIAAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAHgAlAB4AJQAeACUAJQAlACUAJQAgACUAJQAlACUAHgAlAB4AHgAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlAB4AHgAeAB4AHgAeAB4AJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAeACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACAAIAAlACUAJQAlACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACAAJQAlACUAJQAgACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAHgAeAB4AHgAeAB4AHgAeACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAeAB4AHgAeAB4AHgAlACUAJQAlACUAJQAlACAAIAAgACUAJQAlACAAIAAgACAAIAAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeABcAFwAXABUAFQAVAB4AHgAeAB4AJQAlACUAIAAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACAAIAAgACUAJQAlACUAJQAlACUAJQAlACAAJQAlACUAJQAlACUAJQAlACUAJQAlACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AJQAlACUAJQAlACUAJQAlACUAJQAlACUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AJQAlACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeACUAJQAlACUAJQAlACUAJQAeAB4AHgAeAB4AHgAeAB4AHgAeACUAJQAlACUAJQAlAB4AHgAeAB4AHgAeAB4AHgAlACUAJQAlACUAJQAlACUAHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAgACUAJQAgACUAJQAlACUAJQAlACUAJQAgACAAIAAgACAAIAAgACAAJQAlACUAJQAlACUAIAAlACUAJQAlACUAJQAlACUAJQAgACAAIAAgACAAIAAgACAAIAAgACUAJQAgACAAIAAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAgACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACAAIAAlACAAIAAlACAAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAgACAAIAAlACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAJQAlAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AKwAeAB4AHgAeAB4AHgAeAB4AHgAeAB4AHgArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAEsASwBLAEsASwBLAEsASwBLAEsAKwArACsAKwArACsAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAKwArAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXACUAJQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwAlACUAJQAlACUAJQAlACUAJQAlACUAVwBXACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQBXAFcAVwBXAFcAVwBXAFcAVwBXAFcAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAJQAlACUAKwAEACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArACsAKwArAA==',
    )),
    (Of = Array.isArray(Sf)
      ? (function (A) {
          for (var e = A.length, t = [], r = 0; r < e; r += 4)
            t.push((A[r + 3] << 24) | (A[r + 2] << 16) | (A[r + 1] << 8) | A[r])
          return t
        })(Sf)
      : new Uint32Array(Sf)),
    (Kf = Array.isArray(Sf)
      ? (function (A) {
          for (var e = A.length, t = [], r = 0; r < e; r += 2)
            t.push((A[r + 1] << 8) | A[r])
          return t
        })(Sf)
      : new Uint16Array(Sf)),
    (Tf = Ef(Kf, 12, Of[4] / 2)),
    (Mf =
      2 === Of[5]
        ? Ef(Kf, (24 + Of[4]) / 2)
        : ((xf = Of),
          (kf = Math.ceil((24 + Of[4]) / 4)),
          xf.slice
            ? xf.slice(kf, Lf)
            : new Uint32Array(Array.prototype.slice.call(xf, kf, Lf)))),
    new Hf(Of[0], Of[1], Of[2], Of[3], Tf, Mf)),
  dd = [Ad, 36],
  Bd = [1, 2, 3, 5],
  pd = [Rf, 8],
  gd = [Zf, Yf],
  wd = Bd.concat(pd),
  md = [od, sd, ad, rd, nd],
  Cd = [Pf, Nf],
  yd = function (A, e, t, r) {
    var n = r[t]
    if (Array.isArray(A) ? -1 !== A.indexOf(n) : A === n)
      for (var i = t; i <= r.length; ) {
        if ((a = r[++i]) === e) return !0
        if (a !== Rf) break
      }
    if (n === Rf)
      for (i = t; i > 0; ) {
        var o = r[--i]
        if (Array.isArray(A) ? -1 !== A.indexOf(o) : A === o)
          for (var s = t; s <= r.length; ) {
            var a
            if ((a = r[++s]) === e) return !0
            if (a !== Rf) break
          }
        if (o !== Rf) break
      }
    return !1
  },
  Qd = function (A, e) {
    for (var t = A; t >= 0; ) {
      var r = e[t]
      if (r !== Rf) return r
      t--
    }
    return 0
  },
  Fd = function (A, e, t, r, n) {
    if (0 === t[r]) return ld
    var i = r - 1
    if (Array.isArray(n) && !0 === n[i]) return ld
    var o = i - 1,
      s = i + 1,
      a = e[i],
      c = o >= 0 ? e[o] : 0,
      u = e[s]
    if (2 === a && 3 === u) return ld
    if (-1 !== Bd.indexOf(a)) return '!'
    if (-1 !== Bd.indexOf(u)) return ld
    if (-1 !== pd.indexOf(u)) return ld
    if (8 === Qd(i, e)) return hd
    if (11 === fd.get(A[i])) return ld
    if ((a === ed || a === td) && 11 === fd.get(A[s])) return ld
    if (7 === a || 7 === u) return ld
    if (9 === a) return ld
    if (-1 === [Rf, Nf, Pf].indexOf(a) && 9 === u) return ld
    if (-1 !== [Vf, Gf, zf, Xf, $f].indexOf(u)) return ld
    if (Qd(i, e) === qf) return ld
    if (yd(23, qf, i, e)) return ld
    if (yd([Vf, Gf], Wf, i, e)) return ld
    if (yd(12, 12, i, e)) return ld
    if (a === Rf) return hd
    if (23 === a || 23 === u) return ld
    if (16 === u || 16 === a) return hd
    if (-1 !== [Nf, Pf, Wf].indexOf(u) || 14 === a) return ld
    if (36 === c && -1 !== Cd.indexOf(a)) return ld
    if (a === $f && 36 === u) return ld
    if (u === jf) return ld
    if (
      (-1 !== dd.indexOf(u) && a === Jf) ||
      (-1 !== dd.indexOf(a) && u === Jf)
    )
      return ld
    if (
      (a === Zf && -1 !== [id, ed, td].indexOf(u)) ||
      (-1 !== [id, ed, td].indexOf(a) && u === Yf)
    )
      return ld
    if (
      (-1 !== dd.indexOf(a) && -1 !== gd.indexOf(u)) ||
      (-1 !== gd.indexOf(a) && -1 !== dd.indexOf(u))
    )
      return ld
    if (
      (-1 !== [Zf, Yf].indexOf(a) &&
        (u === Jf || (-1 !== [qf, Pf].indexOf(u) && e[s + 1] === Jf))) ||
      (-1 !== [qf, Pf].indexOf(a) && u === Jf) ||
      (a === Jf && -1 !== [Jf, $f, Xf].indexOf(u))
    )
      return ld
    if (-1 !== [Jf, $f, Xf, Vf, Gf].indexOf(u))
      for (var l = i; l >= 0; ) {
        if ((h = e[l]) === Jf) return ld
        if (-1 === [$f, Xf].indexOf(h)) break
        l--
      }
    if (-1 !== [Zf, Yf].indexOf(u))
      for (l = -1 !== [Vf, Gf].indexOf(a) ? o : i; l >= 0; ) {
        var h
        if ((h = e[l]) === Jf) return ld
        if (-1 === [$f, Xf].indexOf(h)) break
        l--
      }
    if (
      (od === a && -1 !== [od, sd, rd, nd].indexOf(u)) ||
      (-1 !== [sd, rd].indexOf(a) && -1 !== [sd, ad].indexOf(u)) ||
      (-1 !== [ad, nd].indexOf(a) && u === ad)
    )
      return ld
    if (
      (-1 !== md.indexOf(a) && -1 !== [jf, Yf].indexOf(u)) ||
      (-1 !== md.indexOf(u) && a === Zf)
    )
      return ld
    if (-1 !== dd.indexOf(a) && -1 !== dd.indexOf(u)) return ld
    if (a === Xf && -1 !== dd.indexOf(u)) return ld
    if (
      (-1 !== dd.concat(Jf).indexOf(a) &&
        u === qf &&
        -1 === ud.indexOf(A[s])) ||
      (-1 !== dd.concat(Jf).indexOf(u) && a === Gf)
    )
      return ld
    if (41 === a && 41 === u) {
      for (var f = t[i], d = 1; f > 0 && 41 === e[--f]; ) d++
      if (d % 2 != 0) return ld
    }
    return a === ed && u === td ? ld : hd
  },
  Ud = function (A, e) {
    e || (e = { lineBreak: 'normal', wordBreak: 'normal' })
    var t = (function (A, e) {
        void 0 === e && (e = 'strict')
        var t = [],
          r = [],
          n = []
        return (
          A.forEach(function (A, i) {
            var o = fd.get(A)
            if (
              (o > 50 ? (n.push(!0), (o -= 50)) : n.push(!1),
              -1 !== ['normal', 'auto', 'loose'].indexOf(e) &&
                -1 !== [8208, 8211, 12316, 12448].indexOf(A))
            )
              return (r.push(i), t.push(16))
            if (4 === o || 11 === o) {
              if (0 === i) return (r.push(i), t.push(Ad))
              var s = t[i - 1]
              return -1 === wd.indexOf(s)
                ? (r.push(r[i - 1]), t.push(s))
                : (r.push(i), t.push(Ad))
            }
            return (
              r.push(i),
              31 === o
                ? t.push('strict' === e ? Wf : id)
                : o === cd || 29 === o
                  ? t.push(Ad)
                  : 43 === o
                    ? (A >= 131072 && A <= 196605) ||
                      (A >= 196608 && A <= 262141)
                      ? t.push(id)
                      : t.push(Ad)
                    : void t.push(o)
            )
          }),
          [r, t, n]
        )
      })(A, e.lineBreak),
      r = t[0],
      n = t[1],
      i = t[2]
    ;('break-all' !== e.wordBreak && 'break-word' !== e.wordBreak) ||
      (n = n.map(function (A) {
        return -1 !== [Jf, Ad, cd].indexOf(A) ? id : A
      }))
    var o =
      'keep-all' === e.wordBreak
        ? i.map(function (e, t) {
            return e && A[t] >= 19968 && A[t] <= 40959
          })
        : void 0
    return [r, n, o]
  },
  vd = (function () {
    function A(A, e, t, r) {
      ;((this.codePoints = A),
        (this.required = '!' === e),
        (this.start = t),
        (this.end = r))
    }
    return (
      (A.prototype.slice = function () {
        return Cf.apply(void 0, this.codePoints.slice(this.start, this.end))
      }),
      A
    )
  })(),
  bd = 45,
  Ed = 43,
  Hd = -1,
  _d = function (A) {
    return A >= 48 && A <= 57
  },
  Id = function (A) {
    return _d(A) || (A >= 65 && A <= 70) || (A >= 97 && A <= 102)
  },
  Dd = function (A) {
    return 10 === A || 9 === A || 32 === A
  },
  xd = function (A) {
    return (
      (function (A) {
        return (
          (function (A) {
            return A >= 97 && A <= 122
          })(A) ||
          (function (A) {
            return A >= 65 && A <= 90
          })(A)
        )
      })(A) ||
      (function (A) {
        return A >= 128
      })(A) ||
      95 === A
    )
  },
  kd = function (A) {
    return xd(A) || _d(A) || A === bd
  },
  Ld = function (A) {
    return (A >= 0 && A <= 8) || 11 === A || (A >= 14 && A <= 31) || 127 === A
  },
  Sd = function (A, e) {
    return 92 === A && 10 !== e
  },
  Od = function (A, e, t) {
    return A === bd ? xd(e) || Sd(e, t) : !!xd(A) || !(92 !== A || !Sd(A, e))
  },
  Kd = function (A, e, t) {
    return A === Ed || A === bd
      ? !!_d(e) || (46 === e && _d(t))
      : _d(46 === A ? e : A)
  },
  Td = function (A) {
    var e = 0,
      t = 1
    ;(A[e] !== Ed && A[e] !== bd) || (A[e] === bd && (t = -1), e++)
    for (var r = []; _d(A[e]); ) r.push(A[e++])
    var n = r.length ? parseInt(Cf.apply(void 0, r), 10) : 0
    46 === A[e] && e++
    for (var i = []; _d(A[e]); ) i.push(A[e++])
    var o = i.length,
      s = o ? parseInt(Cf.apply(void 0, i), 10) : 0
    ;(69 !== A[e] && 101 !== A[e]) || e++
    var a = 1
    ;(A[e] !== Ed && A[e] !== bd) || (A[e] === bd && (a = -1), e++)
    for (var c = []; _d(A[e]); ) c.push(A[e++])
    var u = c.length ? parseInt(Cf.apply(void 0, c), 10) : 0
    return t * (n + s * Math.pow(10, -o)) * Math.pow(10, a * u)
  },
  Md = { type: 2 },
  Rd = { type: 3 },
  Nd = { type: 4 },
  Pd = { type: 13 },
  Vd = { type: 8 },
  Gd = { type: 21 },
  zd = { type: 9 },
  jd = { type: 10 },
  Wd = { type: 11 },
  qd = { type: 12 },
  Xd = { type: 14 },
  Jd = { type: 23 },
  Yd = { type: 1 },
  Zd = { type: 25 },
  $d = { type: 24 },
  AB = { type: 26 },
  eB = { type: 27 },
  tB = { type: 28 },
  rB = { type: 29 },
  nB = { type: 31 },
  iB = { type: 32 },
  oB = (function () {
    function A() {
      this._value = []
    }
    return (
      (A.prototype.write = function (A) {
        this._value = this._value.concat(mf(A))
      }),
      (A.prototype.read = function () {
        for (var A = [], e = this.consumeToken(); e !== iB; )
          (A.push(e), (e = this.consumeToken()))
        return A
      }),
      (A.prototype.consumeToken = function () {
        var A = this.consumeCodePoint()
        switch (A) {
          case 34:
            return this.consumeStringToken(34)
          case 35:
            var e = this.peekCodePoint(0),
              t = this.peekCodePoint(1),
              r = this.peekCodePoint(2)
            if (kd(e) || Sd(t, r)) {
              var n = Od(e, t, r) ? 2 : 1
              return { type: 5, value: this.consumeName(), flags: n }
            }
            break
          case 36:
            if (61 === this.peekCodePoint(0))
              return (this.consumeCodePoint(), Pd)
            break
          case 39:
            return this.consumeStringToken(39)
          case 40:
            return Md
          case 41:
            return Rd
          case 42:
            if (61 === this.peekCodePoint(0))
              return (this.consumeCodePoint(), Xd)
            break
          case Ed:
            if (Kd(A, this.peekCodePoint(0), this.peekCodePoint(1)))
              return (this.reconsumeCodePoint(A), this.consumeNumericToken())
            break
          case 44:
            return Nd
          case bd:
            var i = A,
              o = this.peekCodePoint(0),
              s = this.peekCodePoint(1)
            if (Kd(i, o, s))
              return (this.reconsumeCodePoint(A), this.consumeNumericToken())
            if (Od(i, o, s))
              return (this.reconsumeCodePoint(A), this.consumeIdentLikeToken())
            if (o === bd && 62 === s)
              return (this.consumeCodePoint(), this.consumeCodePoint(), $d)
            break
          case 46:
            if (Kd(A, this.peekCodePoint(0), this.peekCodePoint(1)))
              return (this.reconsumeCodePoint(A), this.consumeNumericToken())
            break
          case 47:
            if (42 === this.peekCodePoint(0))
              for (this.consumeCodePoint(); ; ) {
                var a = this.consumeCodePoint()
                if (42 === a && 47 === (a = this.consumeCodePoint()))
                  return this.consumeToken()
                if (a === Hd) return this.consumeToken()
              }
            break
          case 58:
            return AB
          case 59:
            return eB
          case 60:
            if (
              33 === this.peekCodePoint(0) &&
              this.peekCodePoint(1) === bd &&
              this.peekCodePoint(2) === bd
            )
              return (this.consumeCodePoint(), this.consumeCodePoint(), Zd)
            break
          case 64:
            var c = this.peekCodePoint(0),
              u = this.peekCodePoint(1),
              l = this.peekCodePoint(2)
            if (Od(c, u, l)) return { type: 7, value: this.consumeName() }
            break
          case 91:
            return tB
          case 92:
            if (Sd(A, this.peekCodePoint(0)))
              return (this.reconsumeCodePoint(A), this.consumeIdentLikeToken())
            break
          case 93:
            return rB
          case 61:
            if (61 === this.peekCodePoint(0))
              return (this.consumeCodePoint(), Vd)
            break
          case 123:
            return Wd
          case 125:
            return qd
          case 117:
          case 85:
            var h = this.peekCodePoint(0),
              f = this.peekCodePoint(1)
            return (
              h !== Ed ||
                (!Id(f) && 63 !== f) ||
                (this.consumeCodePoint(), this.consumeUnicodeRangeToken()),
              this.reconsumeCodePoint(A),
              this.consumeIdentLikeToken()
            )
          case 124:
            if (61 === this.peekCodePoint(0))
              return (this.consumeCodePoint(), zd)
            if (124 === this.peekCodePoint(0))
              return (this.consumeCodePoint(), Gd)
            break
          case 126:
            if (61 === this.peekCodePoint(0))
              return (this.consumeCodePoint(), jd)
            break
          case Hd:
            return iB
        }
        return Dd(A)
          ? (this.consumeWhiteSpace(), nB)
          : _d(A)
            ? (this.reconsumeCodePoint(A), this.consumeNumericToken())
            : xd(A)
              ? (this.reconsumeCodePoint(A), this.consumeIdentLikeToken())
              : { type: 6, value: Cf(A) }
      }),
      (A.prototype.consumeCodePoint = function () {
        var A = this._value.shift()
        return void 0 === A ? -1 : A
      }),
      (A.prototype.reconsumeCodePoint = function (A) {
        this._value.unshift(A)
      }),
      (A.prototype.peekCodePoint = function (A) {
        return A >= this._value.length ? -1 : this._value[A]
      }),
      (A.prototype.consumeUnicodeRangeToken = function () {
        for (var A = [], e = this.consumeCodePoint(); Id(e) && A.length < 6; )
          (A.push(e), (e = this.consumeCodePoint()))
        for (var t = !1; 63 === e && A.length < 6; )
          (A.push(e), (e = this.consumeCodePoint()), (t = !0))
        if (t)
          return {
            type: 30,
            start: parseInt(
              Cf.apply(
                void 0,
                A.map(function (A) {
                  return 63 === A ? 48 : A
                }),
              ),
              16,
            ),
            end: parseInt(
              Cf.apply(
                void 0,
                A.map(function (A) {
                  return 63 === A ? 70 : A
                }),
              ),
              16,
            ),
          }
        var r = parseInt(Cf.apply(void 0, A), 16)
        if (this.peekCodePoint(0) === bd && Id(this.peekCodePoint(1))) {
          ;(this.consumeCodePoint(), (e = this.consumeCodePoint()))
          for (var n = []; Id(e) && n.length < 6; )
            (n.push(e), (e = this.consumeCodePoint()))
          return { type: 30, start: r, end: parseInt(Cf.apply(void 0, n), 16) }
        }
        return { type: 30, start: r, end: r }
      }),
      (A.prototype.consumeIdentLikeToken = function () {
        var A = this.consumeName()
        return 'url' === A.toLowerCase() && 40 === this.peekCodePoint(0)
          ? (this.consumeCodePoint(), this.consumeUrlToken())
          : 40 === this.peekCodePoint(0)
            ? (this.consumeCodePoint(), { type: 19, value: A })
            : { type: 20, value: A }
      }),
      (A.prototype.consumeUrlToken = function () {
        var A = []
        if ((this.consumeWhiteSpace(), this.peekCodePoint(0) === Hd))
          return { type: 22, value: '' }
        var e = this.peekCodePoint(0)
        if (39 === e || 34 === e) {
          var t = this.consumeStringToken(this.consumeCodePoint())
          return 0 === t.type &&
            (this.consumeWhiteSpace(),
            this.peekCodePoint(0) === Hd || 41 === this.peekCodePoint(0))
            ? (this.consumeCodePoint(), { type: 22, value: t.value })
            : (this.consumeBadUrlRemnants(), Jd)
        }
        for (;;) {
          var r = this.consumeCodePoint()
          if (r === Hd || 41 === r)
            return { type: 22, value: Cf.apply(void 0, A) }
          if (Dd(r))
            return (
              this.consumeWhiteSpace(),
              this.peekCodePoint(0) === Hd || 41 === this.peekCodePoint(0)
                ? (this.consumeCodePoint(),
                  { type: 22, value: Cf.apply(void 0, A) })
                : (this.consumeBadUrlRemnants(), Jd)
            )
          if (34 === r || 39 === r || 40 === r || Ld(r))
            return (this.consumeBadUrlRemnants(), Jd)
          if (92 === r) {
            if (!Sd(r, this.peekCodePoint(0)))
              return (this.consumeBadUrlRemnants(), Jd)
            A.push(this.consumeEscapedCodePoint())
          } else A.push(r)
        }
      }),
      (A.prototype.consumeWhiteSpace = function () {
        for (; Dd(this.peekCodePoint(0)); ) this.consumeCodePoint()
      }),
      (A.prototype.consumeBadUrlRemnants = function () {
        for (;;) {
          var A = this.consumeCodePoint()
          if (41 === A || A === Hd) return
          Sd(A, this.peekCodePoint(0)) && this.consumeEscapedCodePoint()
        }
      }),
      (A.prototype.consumeStringSlice = function (A) {
        for (var e = ''; A > 0; ) {
          var t = Math.min(5e4, A)
          ;((e += Cf.apply(void 0, this._value.splice(0, t))), (A -= t))
        }
        return (this._value.shift(), e)
      }),
      (A.prototype.consumeStringToken = function (A) {
        for (var e = '', t = 0; ; ) {
          var r = this._value[t]
          if (r === Hd || void 0 === r || r === A)
            return { type: 0, value: (e += this.consumeStringSlice(t)) }
          if (10 === r) return (this._value.splice(0, t), Yd)
          if (92 === r) {
            var n = this._value[t + 1]
            n !== Hd &&
              void 0 !== n &&
              (10 === n
                ? ((e += this.consumeStringSlice(t)),
                  (t = -1),
                  this._value.shift())
                : Sd(r, n) &&
                  ((e += this.consumeStringSlice(t)),
                  (e += Cf(this.consumeEscapedCodePoint())),
                  (t = -1)))
          }
          t++
        }
      }),
      (A.prototype.consumeNumber = function () {
        var A = [],
          e = 4,
          t = this.peekCodePoint(0)
        for (
          (t !== Ed && t !== bd) || A.push(this.consumeCodePoint());
          _d(this.peekCodePoint(0));

        )
          A.push(this.consumeCodePoint())
        t = this.peekCodePoint(0)
        var r = this.peekCodePoint(1)
        if (46 === t && _d(r))
          for (
            A.push(this.consumeCodePoint(), this.consumeCodePoint()), e = 8;
            _d(this.peekCodePoint(0));

          )
            A.push(this.consumeCodePoint())
        ;((t = this.peekCodePoint(0)), (r = this.peekCodePoint(1)))
        var n = this.peekCodePoint(2)
        if (
          (69 === t || 101 === t) &&
          (((r === Ed || r === bd) && _d(n)) || _d(r))
        )
          for (
            A.push(this.consumeCodePoint(), this.consumeCodePoint()), e = 8;
            _d(this.peekCodePoint(0));

          )
            A.push(this.consumeCodePoint())
        return [Td(A), e]
      }),
      (A.prototype.consumeNumericToken = function () {
        var A = this.consumeNumber(),
          e = A[0],
          t = A[1],
          r = this.peekCodePoint(0),
          n = this.peekCodePoint(1),
          i = this.peekCodePoint(2)
        return Od(r, n, i)
          ? { type: 15, number: e, flags: t, unit: this.consumeName() }
          : 37 === r
            ? (this.consumeCodePoint(), { type: 16, number: e, flags: t })
            : { type: 17, number: e, flags: t }
      }),
      (A.prototype.consumeEscapedCodePoint = function () {
        var A = this.consumeCodePoint()
        if (Id(A)) {
          for (var e = Cf(A); Id(this.peekCodePoint(0)) && e.length < 6; )
            e += Cf(this.consumeCodePoint())
          Dd(this.peekCodePoint(0)) && this.consumeCodePoint()
          var t = parseInt(e, 16)
          return 0 === t ||
            (function (A) {
              return A >= 55296 && A <= 57343
            })(t) ||
            t > 1114111
            ? 65533
            : t
        }
        return A === Hd ? 65533 : A
      }),
      (A.prototype.consumeName = function () {
        for (var A = ''; ; ) {
          var e = this.consumeCodePoint()
          if (kd(e)) A += Cf(e)
          else {
            if (!Sd(e, this.peekCodePoint(0)))
              return (this.reconsumeCodePoint(e), A)
            A += Cf(this.consumeEscapedCodePoint())
          }
        }
      }),
      A
    )
  })(),
  sB = (function () {
    function A(A) {
      this._tokens = A
    }
    return (
      (A.create = function (e) {
        var t = new oB()
        return (t.write(e), new A(t.read()))
      }),
      (A.parseValue = function (e) {
        return A.create(e).parseComponentValue()
      }),
      (A.parseValues = function (e) {
        return A.create(e).parseComponentValues()
      }),
      (A.prototype.parseComponentValue = function () {
        for (var A = this.consumeToken(); 31 === A.type; )
          A = this.consumeToken()
        if (32 === A.type)
          throw new SyntaxError(
            'Error parsing CSS component value, unexpected EOF',
          )
        this.reconsumeToken(A)
        var e = this.consumeComponentValue()
        do {
          A = this.consumeToken()
        } while (31 === A.type)
        if (32 === A.type) return e
        throw new SyntaxError(
          'Error parsing CSS component value, multiple values found when expecting only one',
        )
      }),
      (A.prototype.parseComponentValues = function () {
        for (var A = []; ; ) {
          var e = this.consumeComponentValue()
          if (32 === e.type) return A
          ;(A.push(e), A.push())
        }
      }),
      (A.prototype.consumeComponentValue = function () {
        var A = this.consumeToken()
        switch (A.type) {
          case 11:
          case 28:
          case 2:
            return this.consumeSimpleBlock(A.type)
          case 19:
            return this.consumeFunction(A)
        }
        return A
      }),
      (A.prototype.consumeSimpleBlock = function (A) {
        for (var e = { type: A, values: [] }, t = this.consumeToken(); ; ) {
          if (32 === t.type || pB(t, A)) return e
          ;(this.reconsumeToken(t),
            e.values.push(this.consumeComponentValue()),
            (t = this.consumeToken()))
        }
      }),
      (A.prototype.consumeFunction = function (A) {
        for (var e = { name: A.value, values: [], type: 18 }; ; ) {
          var t = this.consumeToken()
          if (32 === t.type || 3 === t.type) return e
          ;(this.reconsumeToken(t), e.values.push(this.consumeComponentValue()))
        }
      }),
      (A.prototype.consumeToken = function () {
        var A = this._tokens.shift()
        return void 0 === A ? iB : A
      }),
      (A.prototype.reconsumeToken = function (A) {
        this._tokens.unshift(A)
      }),
      A
    )
  })(),
  aB = function (A) {
    return 15 === A.type
  },
  cB = function (A) {
    return 17 === A.type
  },
  uB = function (A) {
    return 20 === A.type
  },
  lB = function (A) {
    return 0 === A.type
  },
  hB = function (A, e) {
    return uB(A) && A.value === e
  },
  fB = function (A) {
    return 31 !== A.type
  },
  dB = function (A) {
    return 31 !== A.type && 4 !== A.type
  },
  BB = function (A) {
    var e = [],
      t = []
    return (
      A.forEach(function (A) {
        if (4 === A.type) {
          if (0 === t.length)
            throw new Error('Error parsing function args, zero tokens for arg')
          return (e.push(t), void (t = []))
        }
        31 !== A.type && t.push(A)
      }),
      t.length && e.push(t),
      e
    )
  },
  pB = function (A, e) {
    return (
      (11 === e && 12 === A.type) ||
      (28 === e && 29 === A.type) ||
      (2 === e && 3 === A.type)
    )
  },
  gB = function (A) {
    return 17 === A.type || 15 === A.type
  },
  wB = function (A) {
    return 16 === A.type || gB(A)
  },
  mB = function (A) {
    return A.length > 1 ? [A[0], A[1]] : [A[0]]
  },
  CB = { type: 17, number: 0, flags: 4 },
  yB = { type: 16, number: 50, flags: 4 },
  QB = { type: 16, number: 100, flags: 4 },
  FB = function (A, e, t) {
    var r = A[0],
      n = A[1]
    return [UB(r, e), UB(void 0 !== n ? n : r, t)]
  },
  UB = function (A, e) {
    if (16 === A.type) return (A.number / 100) * e
    if (aB(A))
      switch (A.unit) {
        case 'rem':
        case 'em':
          return 16 * A.number
        default:
          return A.number
      }
    return A.number
  },
  vB = 'grad',
  bB = 'turn',
  EB = function (A, e) {
    if (15 === e.type)
      switch (e.unit) {
        case 'deg':
          return (Math.PI * e.number) / 180
        case vB:
          return (Math.PI / 200) * e.number
        case 'rad':
          return e.number
        case bB:
          return 2 * Math.PI * e.number
      }
    throw new Error('Unsupported angle type')
  },
  HB = function (A) {
    return (
      15 === A.type &&
      ('deg' === A.unit || A.unit === vB || 'rad' === A.unit || A.unit === bB)
    )
  },
  _B = function (A) {
    switch (
      A.filter(uB)
        .map(function (A) {
          return A.value
        })
        .join(' ')
    ) {
      case 'to bottom right':
      case 'to right bottom':
      case 'left top':
      case 'top left':
        return [CB, CB]
      case 'to top':
      case 'bottom':
        return IB(0)
      case 'to bottom left':
      case 'to left bottom':
      case 'right top':
      case 'top right':
        return [CB, QB]
      case 'to right':
      case 'left':
        return IB(90)
      case 'to top left':
      case 'to left top':
      case 'right bottom':
      case 'bottom right':
        return [QB, QB]
      case 'to bottom':
      case 'top':
        return IB(180)
      case 'to top right':
      case 'to right top':
      case 'left bottom':
      case 'bottom left':
        return [QB, CB]
      case 'to left':
      case 'right':
        return IB(270)
    }
    return 0
  },
  IB = function (A) {
    return (Math.PI * A) / 180
  },
  DB = function (A, e) {
    if (18 === e.type) {
      var t = MB[e.name]
      if (void 0 === t)
        throw new Error(
          'Attempting to parse an unsupported color function "' + e.name + '"',
        )
      return t(A, e.values)
    }
    if (5 === e.type) {
      if (3 === e.value.length) {
        var r = e.value.substring(0, 1),
          n = e.value.substring(1, 2),
          i = e.value.substring(2, 3)
        return LB(
          parseInt(r + r, 16),
          parseInt(n + n, 16),
          parseInt(i + i, 16),
          1,
        )
      }
      if (4 === e.value.length) {
        ;((r = e.value.substring(0, 1)),
          (n = e.value.substring(1, 2)),
          (i = e.value.substring(2, 3)))
        var o = e.value.substring(3, 4)
        return LB(
          parseInt(r + r, 16),
          parseInt(n + n, 16),
          parseInt(i + i, 16),
          parseInt(o + o, 16) / 255,
        )
      }
      if (6 === e.value.length) {
        ;((r = e.value.substring(0, 2)),
          (n = e.value.substring(2, 4)),
          (i = e.value.substring(4, 6)))
        return LB(parseInt(r, 16), parseInt(n, 16), parseInt(i, 16), 1)
      }
      if (8 === e.value.length) {
        ;((r = e.value.substring(0, 2)),
          (n = e.value.substring(2, 4)),
          (i = e.value.substring(4, 6)),
          (o = e.value.substring(6, 8)))
        return LB(
          parseInt(r, 16),
          parseInt(n, 16),
          parseInt(i, 16),
          parseInt(o, 16) / 255,
        )
      }
    }
    if (20 === e.type) {
      var s = NB[e.value.toUpperCase()]
      if (void 0 !== s) return s
    }
    return NB.TRANSPARENT
  },
  xB = function (A) {
    return !(255 & A)
  },
  kB = function (A) {
    var e = 255 & A,
      t = 255 & (A >> 8),
      r = 255 & (A >> 16),
      n = 255 & (A >> 24)
    return e < 255
      ? 'rgba(' + n + ',' + r + ',' + t + ',' + e / 255 + ')'
      : 'rgb(' + n + ',' + r + ',' + t + ')'
  },
  LB = function (A, e, t, r) {
    return ((A << 24) | (e << 16) | (t << 8) | Math.round(255 * r)) >>> 0
  },
  SB = function (A, e) {
    if (17 === A.type) return A.number
    if (16 === A.type) {
      var t = 3 === e ? 1 : 255
      return 3 === e ? (A.number / 100) * t : Math.round((A.number / 100) * t)
    }
    return 0
  },
  OB = function (A, e) {
    var t = e.filter(dB)
    if (3 === t.length) {
      var r = t.map(SB),
        n = r[0],
        i = r[1],
        o = r[2]
      return LB(n, i, o, 1)
    }
    if (4 === t.length) {
      var s = t.map(SB),
        a = ((n = s[0]), (i = s[1]), (o = s[2]), s[3])
      return LB(n, i, o, a)
    }
    return 0
  }
function KB(A, e, t) {
  return (
    t < 0 && (t += 1),
    t >= 1 && (t -= 1),
    t < 1 / 6
      ? (e - A) * t * 6 + A
      : t < 0.5
        ? e
        : t < 2 / 3
          ? 6 * (e - A) * (2 / 3 - t) + A
          : A
  )
}
var TB = function (A, e) {
    var t = e.filter(dB),
      r = t[0],
      n = t[1],
      i = t[2],
      o = t[3],
      s = (17 === r.type ? IB(r.number) : EB(A, r)) / (2 * Math.PI),
      a = wB(n) ? n.number / 100 : 0,
      c = wB(i) ? i.number / 100 : 0,
      u = void 0 !== o && wB(o) ? UB(o, 1) : 1
    if (0 === a) return LB(255 * c, 255 * c, 255 * c, 1)
    var l = c <= 0.5 ? c * (a + 1) : c + a - c * a,
      h = 2 * c - l,
      f = KB(h, l, s + 1 / 3),
      d = KB(h, l, s),
      B = KB(h, l, s - 1 / 3)
    return LB(255 * f, 255 * d, 255 * B, u)
  },
  MB = { hsl: TB, hsla: TB, rgb: OB, rgba: OB },
  RB = function (A, e) {
    return DB(A, sB.create(e).parseComponentValue())
  },
  NB = {
    ALICEBLUE: 4042850303,
    ANTIQUEWHITE: 4209760255,
    AQUA: 16777215,
    AQUAMARINE: 2147472639,
    AZURE: 4043309055,
    BEIGE: 4126530815,
    BISQUE: 4293182719,
    BLACK: 255,
    BLANCHEDALMOND: 4293643775,
    BLUE: 65535,
    BLUEVIOLET: 2318131967,
    BROWN: 2771004159,
    BURLYWOOD: 3736635391,
    CADETBLUE: 1604231423,
    CHARTREUSE: 2147418367,
    CHOCOLATE: 3530104575,
    CORAL: 4286533887,
    CORNFLOWERBLUE: 1687547391,
    CORNSILK: 4294499583,
    CRIMSON: 3692313855,
    CYAN: 16777215,
    DARKBLUE: 35839,
    DARKCYAN: 9145343,
    DARKGOLDENROD: 3095837695,
    DARKGRAY: 2846468607,
    DARKGREEN: 6553855,
    DARKGREY: 2846468607,
    DARKKHAKI: 3182914559,
    DARKMAGENTA: 2332068863,
    DARKOLIVEGREEN: 1433087999,
    DARKORANGE: 4287365375,
    DARKORCHID: 2570243327,
    DARKRED: 2332033279,
    DARKSALMON: 3918953215,
    DARKSEAGREEN: 2411499519,
    DARKSLATEBLUE: 1211993087,
    DARKSLATEGRAY: 793726975,
    DARKSLATEGREY: 793726975,
    DARKTURQUOISE: 13554175,
    DARKVIOLET: 2483082239,
    DEEPPINK: 4279538687,
    DEEPSKYBLUE: 12582911,
    DIMGRAY: 1768516095,
    DIMGREY: 1768516095,
    DODGERBLUE: 512819199,
    FIREBRICK: 2988581631,
    FLORALWHITE: 4294635775,
    FORESTGREEN: 579543807,
    FUCHSIA: 4278255615,
    GAINSBORO: 3705462015,
    GHOSTWHITE: 4177068031,
    GOLD: 4292280575,
    GOLDENROD: 3668254975,
    GRAY: 2155905279,
    GREEN: 8388863,
    GREENYELLOW: 2919182335,
    GREY: 2155905279,
    HONEYDEW: 4043305215,
    HOTPINK: 4285117695,
    INDIANRED: 3445382399,
    INDIGO: 1258324735,
    IVORY: 4294963455,
    KHAKI: 4041641215,
    LAVENDER: 3873897215,
    LAVENDERBLUSH: 4293981695,
    LAWNGREEN: 2096890111,
    LEMONCHIFFON: 4294626815,
    LIGHTBLUE: 2916673279,
    LIGHTCORAL: 4034953471,
    LIGHTCYAN: 3774873599,
    LIGHTGOLDENRODYELLOW: 4210742015,
    LIGHTGRAY: 3553874943,
    LIGHTGREEN: 2431553791,
    LIGHTGREY: 3553874943,
    LIGHTPINK: 4290167295,
    LIGHTSALMON: 4288707327,
    LIGHTSEAGREEN: 548580095,
    LIGHTSKYBLUE: 2278488831,
    LIGHTSLATEGRAY: 2005441023,
    LIGHTSLATEGREY: 2005441023,
    LIGHTSTEELBLUE: 2965692159,
    LIGHTYELLOW: 4294959359,
    LIME: 16711935,
    LIMEGREEN: 852308735,
    LINEN: 4210091775,
    MAGENTA: 4278255615,
    MAROON: 2147483903,
    MEDIUMAQUAMARINE: 1724754687,
    MEDIUMBLUE: 52735,
    MEDIUMORCHID: 3126187007,
    MEDIUMPURPLE: 2473647103,
    MEDIUMSEAGREEN: 1018393087,
    MEDIUMSLATEBLUE: 2070474495,
    MEDIUMSPRINGGREEN: 16423679,
    MEDIUMTURQUOISE: 1221709055,
    MEDIUMVIOLETRED: 3340076543,
    MIDNIGHTBLUE: 421097727,
    MINTCREAM: 4127193855,
    MISTYROSE: 4293190143,
    MOCCASIN: 4293178879,
    NAVAJOWHITE: 4292783615,
    NAVY: 33023,
    OLDLACE: 4260751103,
    OLIVE: 2155872511,
    OLIVEDRAB: 1804477439,
    ORANGE: 4289003775,
    ORANGERED: 4282712319,
    ORCHID: 3664828159,
    PALEGOLDENROD: 4008225535,
    PALEGREEN: 2566625535,
    PALETURQUOISE: 2951671551,
    PALEVIOLETRED: 3681588223,
    PAPAYAWHIP: 4293907967,
    PEACHPUFF: 4292524543,
    PERU: 3448061951,
    PINK: 4290825215,
    PLUM: 3718307327,
    POWDERBLUE: 2967529215,
    PURPLE: 2147516671,
    REBECCAPURPLE: 1714657791,
    RED: 4278190335,
    ROSYBROWN: 3163525119,
    ROYALBLUE: 1097458175,
    SADDLEBROWN: 2336560127,
    SALMON: 4202722047,
    SANDYBROWN: 4104413439,
    SEAGREEN: 780883967,
    SEASHELL: 4294307583,
    SIENNA: 2689740287,
    SILVER: 3233857791,
    SKYBLUE: 2278484991,
    SLATEBLUE: 1784335871,
    SLATEGRAY: 1887473919,
    SLATEGREY: 1887473919,
    SNOW: 4294638335,
    SPRINGGREEN: 16744447,
    STEELBLUE: 1182971135,
    TAN: 3535047935,
    TEAL: 8421631,
    THISTLE: 3636451583,
    TOMATO: 4284696575,
    TRANSPARENT: 0,
    TURQUOISE: 1088475391,
    VIOLET: 4001558271,
    WHEAT: 4125012991,
    WHITE: 4294967295,
    WHITESMOKE: 4126537215,
    YELLOW: 4294902015,
    YELLOWGREEN: 2597139199,
  },
  PB = {
    name: 'background-clip',
    initialValue: 'border-box',
    prefix: !1,
    type: 1,
    parse: function (A, e) {
      return e.map(function (A) {
        if (uB(A))
          switch (A.value) {
            case 'padding-box':
              return 1
            case 'content-box':
              return 2
          }
        return 0
      })
    },
  },
  VB = {
    name: 'background-color',
    initialValue: 'transparent',
    prefix: !1,
    type: 3,
    format: 'color',
  },
  GB = function (A, e) {
    var t = DB(A, e[0]),
      r = e[1]
    return r && wB(r) ? { color: t, stop: r } : { color: t, stop: null }
  },
  zB = function (A, e) {
    var t = A[0],
      r = A[A.length - 1]
    ;(null === t.stop && (t.stop = CB), null === r.stop && (r.stop = QB))
    for (var n = [], i = 0, o = 0; o < A.length; o++) {
      var s = A[o].stop
      if (null !== s) {
        var a = UB(s, e)
        ;(a > i ? n.push(a) : n.push(i), (i = a))
      } else n.push(null)
    }
    var c = null
    for (o = 0; o < n.length; o++) {
      var u = n[o]
      if (null === u) null === c && (c = o)
      else if (null !== c) {
        for (var l = o - c, h = (u - n[c - 1]) / (l + 1), f = 1; f <= l; f++)
          n[c + f - 1] = h * f
        c = null
      }
    }
    return A.map(function (A, t) {
      return { color: A.color, stop: Math.max(Math.min(1, n[t] / e), 0) }
    })
  },
  jB = function (A, e, t) {
    var r =
        'number' == typeof A
          ? A
          : (function (A, e, t) {
              var r = e / 2,
                n = t / 2,
                i = UB(A[0], e) - r,
                o = n - UB(A[1], t)
              return (Math.atan2(o, i) + 2 * Math.PI) % (2 * Math.PI)
            })(A, e, t),
      n = Math.abs(e * Math.sin(r)) + Math.abs(t * Math.cos(r)),
      i = e / 2,
      o = t / 2,
      s = n / 2,
      a = Math.sin(r - Math.PI / 2) * s,
      c = Math.cos(r - Math.PI / 2) * s
    return [n, i - c, i + c, o - a, o + a]
  },
  WB = function (A, e) {
    return Math.sqrt(A * A + e * e)
  },
  qB = function (A, e, t, r, n) {
    return [
      [0, 0],
      [0, e],
      [A, 0],
      [A, e],
    ].reduce(
      function (A, e) {
        var i = e[0],
          o = e[1],
          s = WB(t - i, r - o)
        return (n ? s < A.optimumDistance : s > A.optimumDistance)
          ? { optimumCorner: e, optimumDistance: s }
          : A
      },
      { optimumDistance: n ? Infinity : -Infinity, optimumCorner: null },
    ).optimumCorner
  },
  XB = function (A, e) {
    var t = IB(180),
      r = []
    return (
      BB(e).forEach(function (e, n) {
        if (0 === n) {
          var i = e[0]
          if (
            20 === i.type &&
            -1 !== ['top', 'left', 'right', 'bottom'].indexOf(i.value)
          )
            return void (t = _B(e))
          if (HB(i)) return void (t = (EB(A, i) + IB(270)) % IB(360))
        }
        var o = GB(A, e)
        r.push(o)
      }),
      { angle: t, stops: r, type: 1 }
    )
  },
  JB = 'closest-side',
  YB = 'farthest-side',
  ZB = 'closest-corner',
  $B = 'farthest-corner',
  Ap = 'circle',
  ep = 'ellipse',
  tp = 'cover',
  rp = 'contain',
  np = function (A, e) {
    var t = 0,
      r = 3,
      n = [],
      i = []
    return (
      BB(e).forEach(function (e, o) {
        var s = !0
        if (
          (0 === o
            ? (s = e.reduce(function (A, e) {
                if (uB(e))
                  switch (e.value) {
                    case 'center':
                      return (i.push(yB), !1)
                    case 'top':
                    case 'left':
                      return (i.push(CB), !1)
                    case 'right':
                    case 'bottom':
                      return (i.push(QB), !1)
                  }
                else if (wB(e) || gB(e)) return (i.push(e), !1)
                return A
              }, s))
            : 1 === o &&
              (s = e.reduce(function (A, e) {
                if (uB(e))
                  switch (e.value) {
                    case Ap:
                      return ((t = 0), !1)
                    case ep:
                      return ((t = 1), !1)
                    case rp:
                    case JB:
                      return ((r = 0), !1)
                    case YB:
                      return ((r = 1), !1)
                    case ZB:
                      return ((r = 2), !1)
                    case tp:
                    case $B:
                      return ((r = 3), !1)
                  }
                else if (gB(e) || wB(e))
                  return (Array.isArray(r) || (r = []), r.push(e), !1)
                return A
              }, s)),
          s)
        ) {
          var a = GB(A, e)
          n.push(a)
        }
      }),
      { size: r, shape: t, stops: n, position: i, type: 2 }
    )
  },
  ip = function (A, e) {
    if (22 === e.type) {
      var t = { url: e.value, type: 0 }
      return (A.cache.addImage(e.value), t)
    }
    if (18 === e.type) {
      var r = ap[e.name]
      if (void 0 === r)
        throw new Error(
          'Attempting to parse an unsupported image function "' + e.name + '"',
        )
      return r(A, e.values)
    }
    throw new Error('Unsupported image type ' + e.type)
  }
var op,
  sp,
  ap = {
    'linear-gradient': function (A, e) {
      var t = IB(180),
        r = []
      return (
        BB(e).forEach(function (e, n) {
          if (0 === n) {
            var i = e[0]
            if (20 === i.type && 'to' === i.value) return void (t = _B(e))
            if (HB(i)) return void (t = EB(A, i))
          }
          var o = GB(A, e)
          r.push(o)
        }),
        { angle: t, stops: r, type: 1 }
      )
    },
    '-moz-linear-gradient': XB,
    '-ms-linear-gradient': XB,
    '-o-linear-gradient': XB,
    '-webkit-linear-gradient': XB,
    'radial-gradient': function (A, e) {
      var t = 0,
        r = 3,
        n = [],
        i = []
      return (
        BB(e).forEach(function (e, o) {
          var s = !0
          if (0 === o) {
            var a = !1
            s = e.reduce(function (A, e) {
              if (a)
                if (uB(e))
                  switch (e.value) {
                    case 'center':
                      return (i.push(yB), A)
                    case 'top':
                    case 'left':
                      return (i.push(CB), A)
                    case 'right':
                    case 'bottom':
                      return (i.push(QB), A)
                  }
                else (wB(e) || gB(e)) && i.push(e)
              else if (uB(e))
                switch (e.value) {
                  case Ap:
                    return ((t = 0), !1)
                  case ep:
                    return ((t = 1), !1)
                  case 'at':
                    return ((a = !0), !1)
                  case JB:
                    return ((r = 0), !1)
                  case tp:
                  case YB:
                    return ((r = 1), !1)
                  case rp:
                  case ZB:
                    return ((r = 2), !1)
                  case $B:
                    return ((r = 3), !1)
                }
              else if (gB(e) || wB(e))
                return (Array.isArray(r) || (r = []), r.push(e), !1)
              return A
            }, s)
          }
          if (s) {
            var c = GB(A, e)
            n.push(c)
          }
        }),
        { size: r, shape: t, stops: n, position: i, type: 2 }
      )
    },
    '-moz-radial-gradient': np,
    '-ms-radial-gradient': np,
    '-o-radial-gradient': np,
    '-webkit-radial-gradient': np,
    '-webkit-gradient': function (A, e) {
      var t = IB(180),
        r = [],
        n = 1
      return (
        BB(e).forEach(function (e, t) {
          var i = e[0]
          if (0 === t) {
            if (uB(i) && 'linear' === i.value) return void (n = 1)
            if (uB(i) && 'radial' === i.value) return void (n = 2)
          }
          if (18 === i.type)
            if ('from' === i.name) {
              var o = DB(A, i.values[0])
              r.push({ stop: CB, color: o })
            } else if ('to' === i.name) {
              o = DB(A, i.values[0])
              r.push({ stop: QB, color: o })
            } else if ('color-stop' === i.name) {
              var s = i.values.filter(dB)
              if (2 === s.length) {
                o = DB(A, s[1])
                var a = s[0]
                cB(a) &&
                  r.push({
                    stop: { type: 16, number: 100 * a.number, flags: a.flags },
                    color: o,
                  })
              }
            }
        }),
        1 === n
          ? { angle: (t + IB(180)) % IB(360), stops: r, type: n }
          : { size: 3, shape: 0, stops: r, position: [], type: n }
      )
    },
  },
  cp = {
    name: 'background-image',
    initialValue: 'none',
    type: 1,
    prefix: !1,
    parse: function (A, e) {
      if (0 === e.length) return []
      var t = e[0]
      return 20 === t.type && 'none' === t.value
        ? []
        : e
            .filter(function (A) {
              return (
                dB(A) &&
                (function (A) {
                  return !(
                    (20 === A.type && 'none' === A.value) ||
                    (18 === A.type && !ap[A.name])
                  )
                })(A)
              )
            })
            .map(function (e) {
              return ip(A, e)
            })
    },
  },
  up = {
    name: 'background-origin',
    initialValue: 'border-box',
    prefix: !1,
    type: 1,
    parse: function (A, e) {
      return e.map(function (A) {
        if (uB(A))
          switch (A.value) {
            case 'padding-box':
              return 1
            case 'content-box':
              return 2
          }
        return 0
      })
    },
  },
  lp = {
    name: 'background-position',
    initialValue: '0% 0%',
    type: 1,
    prefix: !1,
    parse: function (A, e) {
      return BB(e)
        .map(function (A) {
          return A.filter(wB)
        })
        .map(mB)
    },
  },
  hp = {
    name: 'background-repeat',
    initialValue: 'repeat',
    prefix: !1,
    type: 1,
    parse: function (A, e) {
      return BB(e)
        .map(function (A) {
          return A.filter(uB)
            .map(function (A) {
              return A.value
            })
            .join(' ')
        })
        .map(fp)
    },
  },
  fp = function (A) {
    switch (A) {
      case 'no-repeat':
        return 1
      case 'repeat-x':
      case 'repeat no-repeat':
        return 2
      case 'repeat-y':
      case 'no-repeat repeat':
        return 3
      default:
        return 0
    }
  }
;(((sp = op || (op = {})).AUTO = 'auto'),
  (sp.CONTAIN = 'contain'),
  (sp.COVER = 'cover'))
var dp,
  Bp,
  pp = {
    name: 'background-size',
    initialValue: '0',
    prefix: !1,
    type: 1,
    parse: function (A, e) {
      return BB(e).map(function (A) {
        return A.filter(gp)
      })
    },
  },
  gp = function (A) {
    return uB(A) || wB(A)
  },
  wp = function (A) {
    return {
      name: 'border-' + A + '-color',
      initialValue: 'transparent',
      prefix: !1,
      type: 3,
      format: 'color',
    }
  },
  mp = wp('top'),
  Cp = wp('right'),
  yp = wp('bottom'),
  Qp = wp('left'),
  Fp = function (A) {
    return {
      name: 'border-radius-' + A,
      initialValue: '0 0',
      prefix: !1,
      type: 1,
      parse: function (A, e) {
        return mB(e.filter(wB))
      },
    }
  },
  Up = Fp('top-left'),
  vp = Fp('top-right'),
  bp = Fp('bottom-right'),
  Ep = Fp('bottom-left'),
  Hp = function (A) {
    return {
      name: 'border-' + A + '-style',
      initialValue: 'solid',
      prefix: !1,
      type: 2,
      parse: function (A, e) {
        switch (e) {
          case 'none':
            return 0
          case 'dashed':
            return 2
          case 'dotted':
            return 3
          case 'double':
            return 4
        }
        return 1
      },
    }
  },
  _p = Hp('top'),
  Ip = Hp('right'),
  Dp = Hp('bottom'),
  xp = Hp('left'),
  kp = function (A) {
    return {
      name: 'border-' + A + '-width',
      initialValue: '0',
      type: 0,
      prefix: !1,
      parse: function (A, e) {
        return aB(e) ? e.number : 0
      },
    }
  },
  Lp = kp('top'),
  Sp = kp('right'),
  Op = kp('bottom'),
  Kp = kp('left'),
  Tp = {
    name: 'color',
    initialValue: 'transparent',
    prefix: !1,
    type: 3,
    format: 'color',
  },
  Mp = {
    name: 'direction',
    initialValue: 'ltr',
    prefix: !1,
    type: 2,
    parse: function (A, e) {
      return 'rtl' === e ? 1 : 0
    },
  },
  Rp = {
    name: 'display',
    initialValue: 'inline-block',
    prefix: !1,
    type: 1,
    parse: function (A, e) {
      return e.filter(uB).reduce(function (A, e) {
        return A | Np(e.value)
      }, 0)
    },
  },
  Np = function (A) {
    switch (A) {
      case 'block':
      case '-webkit-box':
        return 2
      case 'inline':
        return 4
      case 'run-in':
        return 8
      case 'flow':
        return 16
      case 'flow-root':
        return 32
      case 'table':
        return 64
      case 'flex':
      case '-webkit-flex':
        return 128
      case 'grid':
      case '-ms-grid':
        return 256
      case 'ruby':
        return 512
      case 'subgrid':
        return 1024
      case 'list-item':
        return 2048
      case 'table-row-group':
        return 4096
      case 'table-header-group':
        return 8192
      case 'table-footer-group':
        return 16384
      case 'table-row':
        return 32768
      case 'table-cell':
        return 65536
      case 'table-column-group':
        return 131072
      case 'table-column':
        return 262144
      case 'table-caption':
        return 524288
      case 'ruby-base':
        return 1048576
      case 'ruby-text':
        return 2097152
      case 'ruby-base-container':
        return 4194304
      case 'ruby-text-container':
        return 8388608
      case 'contents':
        return 16777216
      case 'inline-block':
        return 33554432
      case 'inline-list-item':
        return 67108864
      case 'inline-table':
        return 134217728
      case 'inline-flex':
        return 268435456
      case 'inline-grid':
        return 536870912
    }
    return 0
  },
  Pp = {
    name: 'float',
    initialValue: 'none',
    prefix: !1,
    type: 2,
    parse: function (A, e) {
      switch (e) {
        case 'left':
          return 1
        case 'right':
          return 2
        case 'inline-start':
          return 3
        case 'inline-end':
          return 4
      }
      return 0
    },
  },
  Vp = {
    name: 'letter-spacing',
    initialValue: '0',
    prefix: !1,
    type: 0,
    parse: function (A, e) {
      return 20 === e.type && 'normal' === e.value
        ? 0
        : 17 === e.type || 15 === e.type
          ? e.number
          : 0
    },
  }
;(((Bp = dp || (dp = {})).NORMAL = 'normal'), (Bp.STRICT = 'strict'))
var Gp,
  zp,
  jp = {
    name: 'line-break',
    initialValue: 'normal',
    prefix: !1,
    type: 2,
    parse: function (A, e) {
      return 'strict' === e ? dp.STRICT : dp.NORMAL
    },
  },
  Wp = { name: 'line-height', initialValue: 'normal', prefix: !1, type: 4 },
  qp = function (A, e) {
    return uB(A) && 'normal' === A.value
      ? 1.2 * e
      : 17 === A.type
        ? e * A.number
        : wB(A)
          ? UB(A, e)
          : e
  },
  Xp = {
    name: 'list-style-image',
    initialValue: 'none',
    type: 0,
    prefix: !1,
    parse: function (A, e) {
      return 20 === e.type && 'none' === e.value ? null : ip(A, e)
    },
  },
  Jp = {
    name: 'list-style-position',
    initialValue: 'outside',
    prefix: !1,
    type: 2,
    parse: function (A, e) {
      return 'inside' === e ? 0 : 1
    },
  },
  Yp = {
    name: 'list-style-type',
    initialValue: 'none',
    prefix: !1,
    type: 2,
    parse: function (A, e) {
      switch (e) {
        case 'disc':
          return 0
        case 'circle':
          return 1
        case 'square':
          return 2
        case 'decimal':
          return 3
        case 'cjk-decimal':
          return 4
        case 'decimal-leading-zero':
          return 5
        case 'lower-roman':
          return 6
        case 'upper-roman':
          return 7
        case 'lower-greek':
          return 8
        case 'lower-alpha':
          return 9
        case 'upper-alpha':
          return 10
        case 'arabic-indic':
          return 11
        case 'armenian':
          return 12
        case 'bengali':
          return 13
        case 'cambodian':
          return 14
        case 'cjk-earthly-branch':
          return 15
        case 'cjk-heavenly-stem':
          return 16
        case 'cjk-ideographic':
          return 17
        case 'devanagari':
          return 18
        case 'ethiopic-numeric':
          return 19
        case 'georgian':
          return 20
        case 'gujarati':
          return 21
        case 'gurmukhi':
        case 'hebrew':
          return 22
        case 'hiragana':
          return 23
        case 'hiragana-iroha':
          return 24
        case 'japanese-formal':
          return 25
        case 'japanese-informal':
          return 26
        case 'kannada':
          return 27
        case 'katakana':
          return 28
        case 'katakana-iroha':
          return 29
        case 'khmer':
          return 30
        case 'korean-hangul-formal':
          return 31
        case 'korean-hanja-formal':
          return 32
        case 'korean-hanja-informal':
          return 33
        case 'lao':
          return 34
        case 'lower-armenian':
          return 35
        case 'malayalam':
          return 36
        case 'mongolian':
          return 37
        case 'myanmar':
          return 38
        case 'oriya':
          return 39
        case 'persian':
          return 40
        case 'simp-chinese-formal':
          return 41
        case 'simp-chinese-informal':
          return 42
        case 'tamil':
          return 43
        case 'telugu':
          return 44
        case 'thai':
          return 45
        case 'tibetan':
          return 46
        case 'trad-chinese-formal':
          return 47
        case 'trad-chinese-informal':
          return 48
        case 'upper-armenian':
          return 49
        case 'disclosure-open':
          return 50
        case 'disclosure-closed':
          return 51
        default:
          return -1
      }
    },
  },
  Zp = function (A) {
    return { name: 'margin-' + A, initialValue: '0', prefix: !1, type: 4 }
  },
  $p = Zp('top'),
  Ag = Zp('right'),
  eg = Zp('bottom'),
  tg = Zp('left'),
  rg = {
    name: 'overflow',
    initialValue: 'visible',
    prefix: !1,
    type: 1,
    parse: function (A, e) {
      return e.filter(uB).map(function (A) {
        switch (A.value) {
          case 'hidden':
            return 1
          case 'scroll':
            return 2
          case 'clip':
            return 3
          case 'auto':
            return 4
          default:
            return 0
        }
      })
    },
  },
  ng = {
    name: 'overflow-wrap',
    initialValue: 'normal',
    prefix: !1,
    type: 2,
    parse: function (A, e) {
      return 'break-word' === e ? 'break-word' : 'normal'
    },
  },
  ig = function (A) {
    return {
      name: 'padding-' + A,
      initialValue: '0',
      prefix: !1,
      type: 3,
      format: 'length-percentage',
    }
  },
  og = ig('top'),
  sg = ig('right'),
  ag = ig('bottom'),
  cg = ig('left'),
  ug = {
    name: 'text-align',
    initialValue: 'left',
    prefix: !1,
    type: 2,
    parse: function (A, e) {
      switch (e) {
        case 'right':
          return 2
        case 'center':
        case 'justify':
          return 1
        default:
          return 0
      }
    },
  },
  lg = {
    name: 'position',
    initialValue: 'static',
    prefix: !1,
    type: 2,
    parse: function (A, e) {
      switch (e) {
        case 'relative':
          return 1
        case 'absolute':
          return 2
        case 'fixed':
          return 3
        case 'sticky':
          return 4
      }
      return 0
    },
  },
  hg = {
    name: 'text-shadow',
    initialValue: 'none',
    type: 1,
    prefix: !1,
    parse: function (A, e) {
      return 1 === e.length && hB(e[0], 'none')
        ? []
        : BB(e).map(function (e) {
            for (
              var t = {
                  color: NB.TRANSPARENT,
                  offsetX: CB,
                  offsetY: CB,
                  blur: CB,
                },
                r = 0,
                n = 0;
              n < e.length;
              n++
            ) {
              var i = e[n]
              gB(i)
                ? (0 === r
                    ? (t.offsetX = i)
                    : 1 === r
                      ? (t.offsetY = i)
                      : (t.blur = i),
                  r++)
                : (t.color = DB(A, i))
            }
            return t
          })
    },
  },
  fg = {
    name: 'text-transform',
    initialValue: 'none',
    prefix: !1,
    type: 2,
    parse: function (A, e) {
      switch (e) {
        case 'uppercase':
          return 2
        case 'lowercase':
          return 1
        case 'capitalize':
          return 3
      }
      return 0
    },
  },
  dg = {
    name: 'transform',
    initialValue: 'none',
    prefix: !0,
    type: 0,
    parse: function (A, e) {
      if (20 === e.type && 'none' === e.value) return null
      if (18 === e.type) {
        var t = Bg[e.name]
        if (void 0 === t)
          throw new Error(
            'Attempting to parse an unsupported transform function "' +
              e.name +
              '"',
          )
        return t(e.values)
      }
      return null
    },
  },
  Bg = {
    matrix: function (A) {
      var e = A.filter(function (A) {
        return 17 === A.type
      }).map(function (A) {
        return A.number
      })
      return 6 === e.length ? e : null
    },
    matrix3d: function (A) {
      var e = A.filter(function (A) {
          return 17 === A.type
        }).map(function (A) {
          return A.number
        }),
        t = e[0],
        r = e[1]
      ;(e[2], e[3])
      var n = e[4],
        i = e[5]
      ;(e[6], e[7], e[8], e[9], e[10], e[11])
      var o = e[12],
        s = e[13]
      return (e[14], e[15], 16 === e.length ? [t, r, n, i, o, s] : null)
    },
  },
  pg = { type: 16, number: 50, flags: 4 },
  gg = [pg, pg],
  wg = {
    name: 'transform-origin',
    initialValue: '50% 50%',
    prefix: !0,
    type: 1,
    parse: function (A, e) {
      var t = e.filter(wB)
      return 2 !== t.length ? gg : [t[0], t[1]]
    },
  },
  mg = {
    name: 'visible',
    initialValue: 'none',
    prefix: !1,
    type: 2,
    parse: function (A, e) {
      switch (e) {
        case 'hidden':
          return 1
        case 'collapse':
          return 2
        default:
          return 0
      }
    },
  }
;(((zp = Gp || (Gp = {})).NORMAL = 'normal'),
  (zp.BREAK_ALL = 'break-all'),
  (zp.KEEP_ALL = 'keep-all'))
for (
  var Cg = {
      name: 'word-break',
      initialValue: 'normal',
      prefix: !1,
      type: 2,
      parse: function (A, e) {
        switch (e) {
          case 'break-all':
            return Gp.BREAK_ALL
          case 'keep-all':
            return Gp.KEEP_ALL
          default:
            return Gp.NORMAL
        }
      },
    },
    yg = {
      name: 'z-index',
      initialValue: 'auto',
      prefix: !1,
      type: 0,
      parse: function (A, e) {
        if (20 === e.type) return { auto: !0, order: 0 }
        if (cB(e)) return { auto: !1, order: e.number }
        throw new Error('Invalid z-index number parsed')
      },
    },
    Qg = function (A, e) {
      if (15 === e.type)
        switch (e.unit.toLowerCase()) {
          case 's':
            return 1e3 * e.number
          case 'ms':
            return e.number
        }
      throw new Error('Unsupported time type')
    },
    Fg = {
      name: 'opacity',
      initialValue: '1',
      type: 0,
      prefix: !1,
      parse: function (A, e) {
        return cB(e) ? e.number : 1
      },
    },
    Ug = {
      name: 'text-decoration-color',
      initialValue: 'transparent',
      prefix: !1,
      type: 3,
      format: 'color',
    },
    vg = {
      name: 'text-decoration-line',
      initialValue: 'none',
      prefix: !1,
      type: 1,
      parse: function (A, e) {
        return e
          .filter(uB)
          .map(function (A) {
            switch (A.value) {
              case 'underline':
                return 1
              case 'overline':
                return 2
              case 'line-through':
                return 3
              case 'none':
                return 4
            }
            return 0
          })
          .filter(function (A) {
            return 0 !== A
          })
      },
    },
    bg = {
      name: 'font-family',
      initialValue: '',
      prefix: !1,
      type: 1,
      parse: function (A, e) {
        var t = [],
          r = []
        return (
          e.forEach(function (A) {
            switch (A.type) {
              case 20:
              case 0:
                t.push(A.value)
                break
              case 17:
                t.push(A.number.toString())
                break
              case 4:
                ;(r.push(t.join(' ')), (t.length = 0))
            }
          }),
          t.length && r.push(t.join(' ')),
          r.map(function (A) {
            return -1 === A.indexOf(' ') ? A : "'" + A + "'"
          })
        )
      },
    },
    Eg = {
      name: 'font-size',
      initialValue: '0',
      prefix: !1,
      type: 3,
      format: 'length',
    },
    Hg = {
      name: 'font-weight',
      initialValue: 'normal',
      type: 0,
      prefix: !1,
      parse: function (A, e) {
        return cB(e) ? e.number : uB(e) && 'bold' === e.value ? 700 : 400
      },
    },
    _g = {
      name: 'font-variant',
      initialValue: 'none',
      type: 1,
      prefix: !1,
      parse: function (A, e) {
        return e.filter(uB).map(function (A) {
          return A.value
        })
      },
    },
    Ig = {
      name: 'font-style',
      initialValue: 'normal',
      prefix: !1,
      type: 2,
      parse: function (A, e) {
        switch (e) {
          case 'oblique':
            return 'oblique'
          case 'italic':
            return 'italic'
          default:
            return 'normal'
        }
      },
    },
    Dg = function (A, e) {
      return !!(A & e)
    },
    xg = {
      name: 'content',
      initialValue: 'none',
      type: 1,
      prefix: !1,
      parse: function (A, e) {
        if (0 === e.length) return []
        var t = e[0]
        return 20 === t.type && 'none' === t.value ? [] : e
      },
    },
    kg = {
      name: 'counter-increment',
      initialValue: 'none',
      prefix: !0,
      type: 1,
      parse: function (A, e) {
        if (0 === e.length) return null
        var t = e[0]
        if (20 === t.type && 'none' === t.value) return null
        for (var r = [], n = e.filter(fB), i = 0; i < n.length; i++) {
          var o = n[i],
            s = n[i + 1]
          if (20 === o.type) {
            var a = s && cB(s) ? s.number : 1
            r.push({ counter: o.value, increment: a })
          }
        }
        return r
      },
    },
    Lg = {
      name: 'counter-reset',
      initialValue: 'none',
      prefix: !0,
      type: 1,
      parse: function (A, e) {
        if (0 === e.length) return []
        for (var t = [], r = e.filter(fB), n = 0; n < r.length; n++) {
          var i = r[n],
            o = r[n + 1]
          if (uB(i) && 'none' !== i.value) {
            var s = o && cB(o) ? o.number : 0
            t.push({ counter: i.value, reset: s })
          }
        }
        return t
      },
    },
    Sg = {
      name: 'duration',
      initialValue: '0s',
      prefix: !1,
      type: 1,
      parse: function (A, e) {
        return e.filter(aB).map(function (e) {
          return Qg(A, e)
        })
      },
    },
    Og = {
      name: 'quotes',
      initialValue: 'none',
      prefix: !0,
      type: 1,
      parse: function (A, e) {
        if (0 === e.length) return null
        var t = e[0]
        if (20 === t.type && 'none' === t.value) return null
        var r = [],
          n = e.filter(lB)
        if (n.length % 2 != 0) return null
        for (var i = 0; i < n.length; i += 2) {
          var o = n[i].value,
            s = n[i + 1].value
          r.push({ open: o, close: s })
        }
        return r
      },
    },
    Kg = function (A, e, t) {
      if (!A) return ''
      var r = A[Math.min(e, A.length - 1)]
      return r ? (t ? r.open : r.close) : ''
    },
    Tg = {
      name: 'box-shadow',
      initialValue: 'none',
      type: 1,
      prefix: !1,
      parse: function (A, e) {
        return 1 === e.length && hB(e[0], 'none')
          ? []
          : BB(e).map(function (e) {
              for (
                var t = {
                    color: 255,
                    offsetX: CB,
                    offsetY: CB,
                    blur: CB,
                    spread: CB,
                    inset: !1,
                  },
                  r = 0,
                  n = 0;
                n < e.length;
                n++
              ) {
                var i = e[n]
                hB(i, 'inset')
                  ? (t.inset = !0)
                  : gB(i)
                    ? (0 === r
                        ? (t.offsetX = i)
                        : 1 === r
                          ? (t.offsetY = i)
                          : 2 === r
                            ? (t.blur = i)
                            : (t.spread = i),
                      r++)
                    : (t.color = DB(A, i))
              }
              return t
            })
      },
    },
    Mg = {
      name: 'paint-order',
      initialValue: 'normal',
      prefix: !1,
      type: 1,
      parse: function (A, e) {
        var t = []
        return (
          e.filter(uB).forEach(function (A) {
            switch (A.value) {
              case 'stroke':
                t.push(1)
                break
              case 'fill':
                t.push(0)
                break
              case 'markers':
                t.push(2)
            }
          }),
          [0, 1, 2].forEach(function (A) {
            ;-1 === t.indexOf(A) && t.push(A)
          }),
          t
        )
      },
    },
    Rg = {
      name: '-webkit-text-stroke-color',
      initialValue: 'currentcolor',
      prefix: !1,
      type: 3,
      format: 'color',
    },
    Ng = {
      name: '-webkit-text-stroke-width',
      initialValue: '0',
      type: 0,
      prefix: !1,
      parse: function (A, e) {
        return aB(e) ? e.number : 0
      },
    },
    Pg = (function () {
      function A(A, e) {
        var t, r
        ;((this.animationDuration = zg(A, Sg, e.animationDuration)),
          (this.backgroundClip = zg(A, PB, e.backgroundClip)),
          (this.backgroundColor = zg(A, VB, e.backgroundColor)),
          (this.backgroundImage = zg(A, cp, e.backgroundImage)),
          (this.backgroundOrigin = zg(A, up, e.backgroundOrigin)),
          (this.backgroundPosition = zg(A, lp, e.backgroundPosition)),
          (this.backgroundRepeat = zg(A, hp, e.backgroundRepeat)),
          (this.backgroundSize = zg(A, pp, e.backgroundSize)),
          (this.borderTopColor = zg(A, mp, e.borderTopColor)),
          (this.borderRightColor = zg(A, Cp, e.borderRightColor)),
          (this.borderBottomColor = zg(A, yp, e.borderBottomColor)),
          (this.borderLeftColor = zg(A, Qp, e.borderLeftColor)),
          (this.borderTopLeftRadius = zg(A, Up, e.borderTopLeftRadius)),
          (this.borderTopRightRadius = zg(A, vp, e.borderTopRightRadius)),
          (this.borderBottomRightRadius = zg(A, bp, e.borderBottomRightRadius)),
          (this.borderBottomLeftRadius = zg(A, Ep, e.borderBottomLeftRadius)),
          (this.borderTopStyle = zg(A, _p, e.borderTopStyle)),
          (this.borderRightStyle = zg(A, Ip, e.borderRightStyle)),
          (this.borderBottomStyle = zg(A, Dp, e.borderBottomStyle)),
          (this.borderLeftStyle = zg(A, xp, e.borderLeftStyle)),
          (this.borderTopWidth = zg(A, Lp, e.borderTopWidth)),
          (this.borderRightWidth = zg(A, Sp, e.borderRightWidth)),
          (this.borderBottomWidth = zg(A, Op, e.borderBottomWidth)),
          (this.borderLeftWidth = zg(A, Kp, e.borderLeftWidth)),
          (this.boxShadow = zg(A, Tg, e.boxShadow)),
          (this.color = zg(A, Tp, e.color)),
          (this.direction = zg(A, Mp, e.direction)),
          (this.display = zg(A, Rp, e.display)),
          (this.float = zg(A, Pp, e.cssFloat)),
          (this.fontFamily = zg(A, bg, e.fontFamily)),
          (this.fontSize = zg(A, Eg, e.fontSize)),
          (this.fontStyle = zg(A, Ig, e.fontStyle)),
          (this.fontVariant = zg(A, _g, e.fontVariant)),
          (this.fontWeight = zg(A, Hg, e.fontWeight)),
          (this.letterSpacing = zg(A, Vp, e.letterSpacing)),
          (this.lineBreak = zg(A, jp, e.lineBreak)),
          (this.lineHeight = zg(A, Wp, e.lineHeight)),
          (this.listStyleImage = zg(A, Xp, e.listStyleImage)),
          (this.listStylePosition = zg(A, Jp, e.listStylePosition)),
          (this.listStyleType = zg(A, Yp, e.listStyleType)),
          (this.marginTop = zg(A, $p, e.marginTop)),
          (this.marginRight = zg(A, Ag, e.marginRight)),
          (this.marginBottom = zg(A, eg, e.marginBottom)),
          (this.marginLeft = zg(A, tg, e.marginLeft)),
          (this.opacity = zg(A, Fg, e.opacity)))
        var n = zg(A, rg, e.overflow)
        ;((this.overflowX = n[0]),
          (this.overflowY = n[n.length > 1 ? 1 : 0]),
          (this.overflowWrap = zg(A, ng, e.overflowWrap)),
          (this.paddingTop = zg(A, og, e.paddingTop)),
          (this.paddingRight = zg(A, sg, e.paddingRight)),
          (this.paddingBottom = zg(A, ag, e.paddingBottom)),
          (this.paddingLeft = zg(A, cg, e.paddingLeft)),
          (this.paintOrder = zg(A, Mg, e.paintOrder)),
          (this.position = zg(A, lg, e.position)),
          (this.textAlign = zg(A, ug, e.textAlign)),
          (this.textDecorationColor = zg(
            A,
            Ug,
            null !== (t = e.textDecorationColor) && void 0 !== t ? t : e.color,
          )),
          (this.textDecorationLine = zg(
            A,
            vg,
            null !== (r = e.textDecorationLine) && void 0 !== r
              ? r
              : e.textDecoration,
          )),
          (this.textShadow = zg(A, hg, e.textShadow)),
          (this.textTransform = zg(A, fg, e.textTransform)),
          (this.transform = zg(A, dg, e.transform)),
          (this.transformOrigin = zg(A, wg, e.transformOrigin)),
          (this.visibility = zg(A, mg, e.visibility)),
          (this.webkitTextStrokeColor = zg(A, Rg, e.webkitTextStrokeColor)),
          (this.webkitTextStrokeWidth = zg(A, Ng, e.webkitTextStrokeWidth)),
          (this.wordBreak = zg(A, Cg, e.wordBreak)),
          (this.zIndex = zg(A, yg, e.zIndex)))
      }
      return (
        (A.prototype.isVisible = function () {
          return this.display > 0 && this.opacity > 0 && 0 === this.visibility
        }),
        (A.prototype.isTransparent = function () {
          return xB(this.backgroundColor)
        }),
        (A.prototype.isTransformed = function () {
          return null !== this.transform
        }),
        (A.prototype.isPositioned = function () {
          return 0 !== this.position
        }),
        (A.prototype.isPositionedWithZIndex = function () {
          return this.isPositioned() && !this.zIndex.auto
        }),
        (A.prototype.isFloating = function () {
          return 0 !== this.float
        }),
        (A.prototype.isInlineLevel = function () {
          return (
            Dg(this.display, 4) ||
            Dg(this.display, 33554432) ||
            Dg(this.display, 268435456) ||
            Dg(this.display, 536870912) ||
            Dg(this.display, 67108864) ||
            Dg(this.display, 134217728)
          )
        }),
        A
      )
    })(),
    Vg = (function () {
      return function (A, e) {
        ;((this.content = zg(A, xg, e.content)),
          (this.quotes = zg(A, Og, e.quotes)))
      }
    })(),
    Gg = (function () {
      return function (A, e) {
        ;((this.counterIncrement = zg(A, kg, e.counterIncrement)),
          (this.counterReset = zg(A, Lg, e.counterReset)))
      }
    })(),
    zg = function (A, e, t) {
      var r = new oB(),
        n = null != t ? t.toString() : e.initialValue
      r.write(n)
      var i = new sB(r.read())
      switch (e.type) {
        case 2:
          var o = i.parseComponentValue()
          return e.parse(A, uB(o) ? o.value : e.initialValue)
        case 0:
          return e.parse(A, i.parseComponentValue())
        case 1:
          return e.parse(A, i.parseComponentValues())
        case 4:
          return i.parseComponentValue()
        case 3:
          switch (e.format) {
            case 'angle':
              return EB(A, i.parseComponentValue())
            case 'color':
              return DB(A, i.parseComponentValue())
            case 'image':
              return ip(A, i.parseComponentValue())
            case 'length':
              var s = i.parseComponentValue()
              return gB(s) ? s : CB
            case 'length-percentage':
              var a = i.parseComponentValue()
              return wB(a) ? a : CB
            case 'time':
              return Qg(A, i.parseComponentValue())
          }
      }
    },
    jg = function (A, e) {
      var t = (function (A) {
        switch (A.getAttribute('data-html2canvas-debug')) {
          case 'all':
            return 1
          case 'clone':
            return 2
          case 'parse':
            return 3
          case 'render':
            return 4
          default:
            return 0
        }
      })(A)
      return 1 === t || e === t
    },
    Wg = (function () {
      return function (A, e) {
        ;((this.context = A),
          (this.textNodes = []),
          (this.elements = []),
          (this.flags = 0),
          jg(e, 3),
          (this.styles = new Pg(A, window.getComputedStyle(e, null))),
          Zw(e) &&
            (this.styles.animationDuration.some(function (A) {
              return A > 0
            }) && (e.style.animationDuration = '0s'),
            null !== this.styles.transform && (e.style.transform = 'none')),
          (this.bounds = wf(this.context, e)),
          jg(e, 4) && (this.flags |= 16))
      }
    })(),
    qg = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
    Xg = 'undefined' == typeof Uint8Array ? [] : new Uint8Array(256),
    Jg = 0;
  Jg < 64;
  Jg++
)
  Xg[qg.charCodeAt(Jg)] = Jg
for (
  var Yg = function (A, e, t) {
      return A.slice
        ? A.slice(e, t)
        : new Uint16Array(Array.prototype.slice.call(A, e, t))
    },
    Zg = (function () {
      function A(A, e, t, r, n, i) {
        ;((this.initialValue = A),
          (this.errorValue = e),
          (this.highStart = t),
          (this.highValueIndex = r),
          (this.index = n),
          (this.data = i))
      }
      return (
        (A.prototype.get = function (A) {
          var e
          if (A >= 0) {
            if (A < 55296 || (A > 56319 && A <= 65535))
              return (
                (e = ((e = this.index[A >> 5]) << 2) + (31 & A)),
                this.data[e]
              )
            if (A <= 65535)
              return (
                (e =
                  ((e = this.index[2048 + ((A - 55296) >> 5)]) << 2) +
                  (31 & A)),
                this.data[e]
              )
            if (A < this.highStart)
              return (
                (e = 2080 + (A >> 11)),
                (e = this.index[e]),
                (e += (A >> 5) & 63),
                (e = ((e = this.index[e]) << 2) + (31 & A)),
                this.data[e]
              )
            if (A <= 1114111) return this.data[this.highValueIndex]
          }
          return this.errorValue
        }),
        A
      )
    })(),
    $g = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
    Aw = 'undefined' == typeof Uint8Array ? [] : new Uint8Array(256),
    ew = 0;
  ew < 64;
  ew++
)
  Aw[$g.charCodeAt(ew)] = ew
var tw,
  rw,
  nw = 8,
  iw = 9,
  ow = 11,
  sw = 12,
  aw = function () {
    for (var A = [], e = 0; e < arguments.length; e++) A[e] = arguments[e]
    if (String.fromCodePoint) return String.fromCodePoint.apply(String, A)
    var t = A.length
    if (!t) return ''
    for (var r = [], n = -1, i = ''; ++n < t; ) {
      var o = A[n]
      ;(o <= 65535
        ? r.push(o)
        : ((o -= 65536), r.push(55296 + (o >> 10), (o % 1024) + 56320)),
        (n + 1 === t || r.length > 16384) &&
          ((i += String.fromCharCode.apply(String, r)), (r.length = 0)))
    }
    return i
  },
  cw = (function (A) {
    var e = (function (A) {
        var e,
          t,
          r,
          n,
          i,
          o = 0.75 * A.length,
          s = A.length,
          a = 0
        '=' === A[A.length - 1] && (o--, '=' === A[A.length - 2] && o--)
        var c =
            'undefined' != typeof ArrayBuffer &&
            'undefined' != typeof Uint8Array &&
            void 0 !== Uint8Array.prototype.slice
              ? new ArrayBuffer(o)
              : new Array(o),
          u = Array.isArray(c) ? c : new Uint8Array(c)
        for (e = 0; e < s; e += 4)
          ((t = Xg[A.charCodeAt(e)]),
            (r = Xg[A.charCodeAt(e + 1)]),
            (n = Xg[A.charCodeAt(e + 2)]),
            (i = Xg[A.charCodeAt(e + 3)]),
            (u[a++] = (t << 2) | (r >> 4)),
            (u[a++] = ((15 & r) << 4) | (n >> 2)),
            (u[a++] = ((3 & n) << 6) | (63 & i)))
        return c
      })(A),
      t = Array.isArray(e)
        ? (function (A) {
            for (var e = A.length, t = [], r = 0; r < e; r += 4)
              t.push(
                (A[r + 3] << 24) | (A[r + 2] << 16) | (A[r + 1] << 8) | A[r],
              )
            return t
          })(e)
        : new Uint32Array(e),
      r = Array.isArray(e)
        ? (function (A) {
            for (var e = A.length, t = [], r = 0; r < e; r += 2)
              t.push((A[r + 1] << 8) | A[r])
            return t
          })(e)
        : new Uint16Array(e),
      n = Yg(r, 12, t[4] / 2),
      i =
        2 === t[5]
          ? Yg(r, (24 + t[4]) / 2)
          : (function (A, e, t) {
              return A.slice
                ? A.slice(e, t)
                : new Uint32Array(Array.prototype.slice.call(A, e, t))
            })(t, Math.ceil((24 + t[4]) / 4))
    return new Zg(t[0], t[1], t[2], t[3], n, i)
  })(
    'AAAAAAAAAAAAEA4AGBkAAFAaAAACAAAAAAAIABAAGAAwADgACAAQAAgAEAAIABAACAAQAAgAEAAIABAACAAQAAgAEAAIABAAQABIAEQATAAIABAACAAQAAgAEAAIABAAVABcAAgAEAAIABAACAAQAGAAaABwAHgAgACIAI4AlgAIABAAmwCjAKgAsAC2AL4AvQDFAMoA0gBPAVYBWgEIAAgACACMANoAYgFkAWwBdAF8AX0BhQGNAZUBlgGeAaMBlQGWAasBswF8AbsBwwF0AcsBYwHTAQgA2wG/AOMBdAF8AekB8QF0AfkB+wHiAHQBfAEIAAMC5gQIAAsCEgIIAAgAFgIeAggAIgIpAggAMQI5AkACygEIAAgASAJQAlgCYAIIAAgACAAKBQoFCgUTBRMFGQUrBSsFCAAIAAgACAAIAAgACAAIAAgACABdAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACABoAmgCrwGvAQgAbgJ2AggAHgEIAAgACADnAXsCCAAIAAgAgwIIAAgACAAIAAgACACKAggAkQKZAggAPADJAAgAoQKkAqwCsgK6AsICCADJAggA0AIIAAgACAAIANYC3gIIAAgACAAIAAgACABAAOYCCAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAkASoB+QIEAAgACAA8AEMCCABCBQgACABJBVAFCAAIAAgACAAIAAgACAAIAAgACABTBVoFCAAIAFoFCABfBWUFCAAIAAgACAAIAAgAbQUIAAgACAAIAAgACABzBXsFfQWFBYoFigWKBZEFigWKBYoFmAWfBaYFrgWxBbkFCAAIAAgACAAIAAgACAAIAAgACAAIAMEFCAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAMgFCADQBQgACAAIAAgACAAIAAgACAAIAAgACAAIAO4CCAAIAAgAiQAIAAgACABAAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAD0AggACAD8AggACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIANYFCAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAMDvwAIAAgAJAIIAAgACAAIAAgACAAIAAgACwMTAwgACAB9BOsEGwMjAwgAKwMyAwsFYgE3A/MEPwMIAEUDTQNRAwgAWQOsAGEDCAAIAAgACAAIAAgACABpAzQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFOgU0BTUFNgU3BTgFOQU6BTQFNQU2BTcFOAU5BToFNAU1BTYFNwU4BTkFIQUoBSwFCAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACABtAwgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACABMAEwACAAIAAgACAAIABgACAAIAAgACAC/AAgACAAyAQgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACACAAIAAwAAgACAAIAAgACAAIAAgACAAIAAAARABIAAgACAAIABQASAAIAAgAIABwAEAAjgCIABsAqAC2AL0AigDQAtwC+IJIQqVAZUBWQqVAZUBlQGVAZUBlQGrC5UBlQGVAZUBlQGVAZUBlQGVAXsKlQGVAbAK6wsrDGUMpQzlDJUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAZUBlQGVAfAKAAuZA64AtwCJALoC6ADwAAgAuACgA/oEpgO6AqsD+AAIAAgAswMIAAgACAAIAIkAuwP5AfsBwwPLAwgACAAIAAgACADRA9kDCAAIAOED6QMIAAgACAAIAAgACADuA/YDCAAIAP4DyQAIAAgABgQIAAgAXQAOBAgACAAIAAgACAAIABMECAAIAAgACAAIAAgACAD8AAQBCAAIAAgAGgQiBCoECAExBAgAEAEIAAgACAAIAAgACAAIAAgACAAIAAgACAA4BAgACABABEYECAAIAAgATAQYAQgAVAQIAAgACAAIAAgACAAIAAgACAAIAFoECAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAOQEIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAB+BAcACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAEABhgSMBAgACAAIAAgAlAQIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAwAEAAQABAADAAMAAwADAAQABAAEAAQABAAEAAQABHATAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAdQMIAAgACAAIAAgACAAIAMkACAAIAAgAfQMIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACACFA4kDCAAIAAgACAAIAOcBCAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAIcDCAAIAAgACAAIAAgACAAIAAgACAAIAJEDCAAIAAgACADFAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACABgBAgAZgQIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAbAQCBXIECAAIAHkECAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACABAAJwEQACjBKoEsgQIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAC6BMIECAAIAAgACAAIAAgACABmBAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAxwQIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAGYECAAIAAgAzgQIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgAigWKBYoFigWKBYoFigWKBd0FXwUIAOIF6gXxBYoF3gT5BQAGCAaKBYoFigWKBYoFigWKBYoFigWKBYoFigXWBIoFigWKBYoFigWKBYoFigWKBYsFEAaKBYoFigWKBYoFigWKBRQGCACKBYoFigWKBQgACAAIANEECAAIABgGigUgBggAJgYIAC4GMwaKBYoF0wQ3Bj4GigWKBYoFigWKBYoFigWKBYoFigWKBYoFigUIAAgACAAIAAgACAAIAAgAigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWKBYoFigWLBf///////wQABAAEAAQABAAEAAQABAAEAAQAAwAEAAQAAgAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAQADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAUAAAAFAAUAAAAFAAUAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEAAQABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUAAQAAAAUABQAFAAUABQAFAAAAAAAFAAUAAAAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAFAAUAAQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABwAFAAUABQAFAAAABwAHAAcAAAAHAAcABwAFAAEAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAFAAUABQAFAAcABwAFAAUAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAAAAQABAAAAAAAAAAAAAAAFAAUABQAFAAAABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAHAAcABwAHAAcAAAAHAAcAAAAAAAUABQAHAAUAAQAHAAEABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABwABAAUABQAFAAUAAAAAAAAAAAAAAAEAAQABAAEAAQABAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABwAFAAUAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUAAQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQABQANAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQABAAEAAQABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEAAQABAAEAAQABAAEAAQABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAABQAHAAUABQAFAAAAAAAAAAcABQAFAAUABQAFAAQABAAEAAQABAAEAAQABAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUAAAAFAAUABQAFAAUAAAAFAAUABQAAAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAAAAAAAAAAAAUABQAFAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAHAAUAAAAHAAcABwAFAAUABQAFAAUABQAFAAUABwAHAAcABwAFAAcABwAAAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABwAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAUABwAHAAUABQAFAAUAAAAAAAcABwAAAAAABwAHAAUAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAABQAFAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAABwAHAAcABQAFAAAAAAAAAAAABQAFAAAAAAAFAAUABQAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAFAAUABQAFAAUAAAAFAAUABwAAAAcABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAFAAUABwAFAAUABQAFAAAAAAAHAAcAAAAAAAcABwAFAAAAAAAAAAAAAAAAAAAABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAcABwAAAAAAAAAHAAcABwAAAAcABwAHAAUAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAABQAHAAcABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABwAHAAcABwAAAAUABQAFAAAABQAFAAUABQAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAcABQAHAAcABQAHAAcAAAAFAAcABwAAAAcABwAFAAUAAAAAAAAAAAAAAAAAAAAFAAUAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAUABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAFAAcABwAFAAUABQAAAAUAAAAHAAcABwAHAAcABwAHAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAHAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAABwAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAUAAAAFAAAAAAAAAAAABwAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABwAFAAUABQAFAAUAAAAFAAUAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABwAFAAUABQAFAAUABQAAAAUABQAHAAcABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABQAFAAAAAAAAAAAABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAcABQAFAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAHAAUABQAFAAUABQAFAAUABwAHAAcABwAHAAcABwAHAAUABwAHAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABwAHAAcABwAFAAUABwAHAAcAAAAAAAAAAAAHAAcABQAHAAcABwAHAAcABwAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAcABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABQAHAAUABQAFAAUABQAFAAUAAAAFAAAABQAAAAAABQAFAAUABQAFAAUABQAFAAcABwAHAAcABwAHAAUABQAFAAUABQAFAAUABQAFAAUAAAAAAAUABQAFAAUABQAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABwAFAAcABwAHAAcABwAFAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAUABQAFAAUABwAHAAUABQAHAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAcABQAFAAcABwAHAAUABwAFAAUABQAHAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAcABwAHAAcABwAHAAUABQAFAAUABQAFAAUABQAHAAcABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUAAAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAcABQAFAAUABQAFAAUABQAAAAAAAAAAAAUAAAAAAAAAAAAAAAAABQAAAAAABwAFAAUAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAAABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUAAAAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAABQAAAAAAAAAFAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAUABQAHAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABwAHAAcABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAUABQAFAAUABQAHAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAcABwAFAAUABQAFAAcABwAFAAUABwAHAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAFAAcABwAFAAUABwAHAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAFAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAFAAUABQAAAAAABQAFAAAAAAAAAAAAAAAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABQAFAAcABwAAAAAAAAAAAAAABwAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABwAFAAcABwAFAAcABwAAAAcABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAAAAAAAAAAAAAAAAAFAAUABQAAAAUABQAAAAAAAAAAAAAABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABQAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABwAFAAUABQAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAcABQAFAAUABQAFAAUABQAFAAUABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAFAAUABQAHAAcABQAHAAUABQAAAAAAAAAAAAAAAAAFAAAABwAHAAcABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABwAHAAcABwAAAAAABwAHAAAAAAAHAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAAAAAAFAAUABQAFAAUABQAFAAAAAAAAAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAFAAUABQAFAAUABQAFAAUABwAHAAUABQAFAAcABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAHAAcABQAFAAUABQAFAAUABwAFAAcABwAFAAcABQAFAAcABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAHAAcABQAFAAUABQAAAAAABwAHAAcABwAFAAUABwAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABwAHAAUABQAFAAUABQAFAAUABQAHAAcABQAHAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABwAFAAcABwAFAAUABQAFAAUABQAHAAUAAAAAAAAAAAAAAAAAAAAAAAcABwAFAAUABQAFAAcABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAFAAUABQAFAAUABQAFAAUABQAHAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAFAAUABQAFAAAAAAAFAAUABwAHAAcABwAFAAAAAAAAAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABwAHAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABQAFAAUABQAFAAUABQAAAAUABQAFAAUABQAFAAcABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUAAAAHAAUABQAFAAUABQAFAAUABwAFAAUABwAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUAAAAAAAAABQAAAAUABQAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAcABwAHAAcAAAAFAAUAAAAHAAcABQAHAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABwAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAAAAAAAAAAAAAAAAAAABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAAAAUABQAFAAAAAAAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQAFAAUABQAAAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAAAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAFAAUABQAAAAAABQAFAAUABQAFAAUABQAAAAUABQAAAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAUABQAFAAUABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAFAAUABQAFAAUADgAOAA4ADgAOAA4ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAA8ADwAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAcABwAHAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAAAAAAAAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAMAAwADAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkAAAAAAAAAAAAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKAAoACgAAAAAAAAAAAAsADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwACwAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAOAAAAAAAAAAAADgAOAA4AAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAAAA4ADgAOAA4ADgAOAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AAAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AAAAAAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAAAA4AAAAOAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAADgAAAAAAAAAAAA4AAAAOAAAAAAAAAAAADgAOAA4AAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAAAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAA4ADgAOAA4ADgAOAA4ADgAOAAAADgAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4ADgAOAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAOAA4ADgAOAA4AAAAAAAAAAAAAAAAAAAAAAA4ADgAOAA4ADgAOAA4ADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AAAAOAA4ADgAOAA4ADgAAAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AAAAAAAAAAAA=',
  ),
  uw = '×',
  lw = function (A) {
    return cw.get(A)
  },
  hw = function (A, e, t) {
    var r = t - 2,
      n = e[r],
      i = e[t - 1],
      o = e[t]
    if (2 === i && 3 === o) return uw
    if (2 === i || 3 === i || 4 === i) return '÷'
    if (2 === o || 3 === o || 4 === o) return '÷'
    if (i === nw && -1 !== [nw, iw, ow, sw].indexOf(o)) return uw
    if (!((i !== ow && i !== iw) || (o !== iw && 10 !== o))) return uw
    if ((i === sw || 10 === i) && 10 === o) return uw
    if (13 === o || 5 === o) return uw
    if (7 === o) return uw
    if (1 === i) return uw
    if (13 === i && 14 === o) {
      for (; 5 === n; ) n = e[--r]
      if (14 === n) return uw
    }
    if (15 === i && 15 === o) {
      for (var s = 0; 15 === n; ) (s++, (n = e[--r]))
      if (s % 2 == 0) return uw
    }
    return '÷'
  },
  fw = function (A) {
    var e = (function (A) {
        for (var e = [], t = 0, r = A.length; t < r; ) {
          var n = A.charCodeAt(t++)
          if (n >= 55296 && n <= 56319 && t < r) {
            var i = A.charCodeAt(t++)
            56320 == (64512 & i)
              ? e.push(((1023 & n) << 10) + (1023 & i) + 65536)
              : (e.push(n), t--)
          } else e.push(n)
        }
        return e
      })(A),
      t = e.length,
      r = 0,
      n = 0,
      i = e.map(lw)
    return {
      next: function () {
        if (r >= t) return { done: !0, value: null }
        for (var A = uw; r < t && (A = hw(0, i, ++r)) === uw; );
        if (A !== uw || r === t) {
          var o = aw.apply(null, e.slice(n, r))
          return ((n = r), { value: o, done: !1 })
        }
        return { done: !0, value: null }
      },
    }
  },
  dw = function (A) {
    return 0 === A[0] && 255 === A[1] && 0 === A[2] && 255 === A[3]
  },
  Bw = function (A, e, t, r, n) {
    var i = 'http://www.w3.org/2000/svg',
      o = document.createElementNS(i, 'svg'),
      s = document.createElementNS(i, 'foreignObject')
    return (
      o.setAttributeNS(null, 'width', A.toString()),
      o.setAttributeNS(null, 'height', e.toString()),
      s.setAttributeNS(null, 'width', '100%'),
      s.setAttributeNS(null, 'height', '100%'),
      s.setAttributeNS(null, 'x', t.toString()),
      s.setAttributeNS(null, 'y', r.toString()),
      s.setAttributeNS(null, 'externalResourcesRequired', 'true'),
      o.appendChild(s),
      s.appendChild(n),
      o
    )
  },
  pw = function (A) {
    return new Promise(function (e, t) {
      var r = new Image()
      ;((r.onload = function () {
        return e(r)
      }),
        (r.onerror = t),
        (r.src =
          'data:image/svg+xml;charset=utf-8,' +
          encodeURIComponent(new XMLSerializer().serializeToString(A))))
    })
  },
  gw = {
    get SUPPORT_RANGE_BOUNDS() {
      var A = (function (A) {
        if (A.createRange) {
          var e = A.createRange()
          if (e.getBoundingClientRect) {
            var t = A.createElement('boundtest')
            ;((t.style.height = '123px'),
              (t.style.display = 'block'),
              A.body.appendChild(t),
              e.selectNode(t))
            var r = e.getBoundingClientRect(),
              n = Math.round(r.height)
            if ((A.body.removeChild(t), 123 === n)) return !0
          }
        }
        return !1
      })(document)
      return (
        Object.defineProperty(gw, 'SUPPORT_RANGE_BOUNDS', { value: A }),
        A
      )
    },
    get SUPPORT_WORD_BREAKING() {
      var A =
        gw.SUPPORT_RANGE_BOUNDS &&
        (function (A) {
          var e = A.createElement('boundtest')
          ;((e.style.width = '50px'),
            (e.style.display = 'block'),
            (e.style.fontSize = '12px'),
            (e.style.letterSpacing = '0px'),
            (e.style.wordSpacing = '0px'),
            A.body.appendChild(e))
          var t = A.createRange()
          e.innerHTML =
            'function' == typeof ''.repeat ? '&#128104;'.repeat(10) : ''
          var r = e.firstChild,
            n = mf(r.data).map(function (A) {
              return Cf(A)
            }),
            i = 0,
            o = {},
            s = n.every(function (A, e) {
              ;(t.setStart(r, i), t.setEnd(r, i + A.length))
              var n = t.getBoundingClientRect()
              i += A.length
              var s = n.x > o.x || n.y > o.y
              return ((o = n), 0 === e || s)
            })
          return (A.body.removeChild(e), s)
        })(document)
      return (
        Object.defineProperty(gw, 'SUPPORT_WORD_BREAKING', { value: A }),
        A
      )
    },
    get SUPPORT_SVG_DRAWING() {
      var A = (function (A) {
        var e = new Image(),
          t = A.createElement('canvas'),
          r = t.getContext('2d')
        if (!r) return !1
        e.src =
          "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'></svg>"
        try {
          ;(r.drawImage(e, 0, 0), t.toDataURL())
        } catch (fi) {
          return !1
        }
        return !0
      })(document)
      return (Object.defineProperty(gw, 'SUPPORT_SVG_DRAWING', { value: A }), A)
    },
    get SUPPORT_FOREIGNOBJECT_DRAWING() {
      var A =
        'function' == typeof Array.from && 'function' == typeof window.fetch
          ? (function (A) {
              var e = A.createElement('canvas'),
                t = 100
              ;((e.width = t), (e.height = t))
              var r = e.getContext('2d')
              if (!r) return Promise.reject(!1)
              ;((r.fillStyle = 'rgb(0, 255, 0)'), r.fillRect(0, 0, t, t))
              var n = new Image(),
                i = e.toDataURL()
              n.src = i
              var o = Bw(t, t, 0, 0, n)
              return (
                (r.fillStyle = 'red'),
                r.fillRect(0, 0, t, t),
                pw(o)
                  .then(function (e) {
                    r.drawImage(e, 0, 0)
                    var n = r.getImageData(0, 0, t, t).data
                    ;((r.fillStyle = 'red'), r.fillRect(0, 0, t, t))
                    var o = A.createElement('div')
                    return (
                      (o.style.backgroundImage = 'url(' + i + ')'),
                      (o.style.height = t + 'px'),
                      dw(n) ? pw(Bw(t, t, 0, 0, o)) : Promise.reject(!1)
                    )
                  })
                  .then(function (A) {
                    return (
                      r.drawImage(A, 0, 0),
                      dw(r.getImageData(0, 0, t, t).data)
                    )
                  })
                  .catch(function () {
                    return !1
                  })
              )
            })(document)
          : Promise.resolve(!1)
      return (
        Object.defineProperty(gw, 'SUPPORT_FOREIGNOBJECT_DRAWING', {
          value: A,
        }),
        A
      )
    },
    get SUPPORT_CORS_IMAGES() {
      var A = void 0 !== new Image().crossOrigin
      return (Object.defineProperty(gw, 'SUPPORT_CORS_IMAGES', { value: A }), A)
    },
    get SUPPORT_RESPONSE_TYPE() {
      var A = 'string' == typeof new XMLHttpRequest().responseType
      return (
        Object.defineProperty(gw, 'SUPPORT_RESPONSE_TYPE', { value: A }),
        A
      )
    },
    get SUPPORT_CORS_XHR() {
      var A = 'withCredentials' in new XMLHttpRequest()
      return (Object.defineProperty(gw, 'SUPPORT_CORS_XHR', { value: A }), A)
    },
    get SUPPORT_NATIVE_TEXT_SEGMENTATION() {
      var A = !('undefined' == typeof Intl || !Intl.Segmenter)
      return (
        Object.defineProperty(gw, 'SUPPORT_NATIVE_TEXT_SEGMENTATION', {
          value: A,
        }),
        A
      )
    },
  },
  ww = (function () {
    return function (A, e) {
      ;((this.text = A), (this.bounds = e))
    }
  })(),
  mw = function (A, e) {
    var t = e.ownerDocument
    if (t) {
      var r = t.createElement('html2canvaswrapper')
      r.appendChild(e.cloneNode(!0))
      var n = e.parentNode
      if (n) {
        n.replaceChild(r, e)
        var i = wf(A, r)
        return (r.firstChild && n.replaceChild(r.firstChild, r), i)
      }
    }
    return gf.EMPTY
  },
  Cw = function (A, e, t) {
    var r = A.ownerDocument
    if (!r) throw new Error('Node has no owner document')
    var n = r.createRange()
    return (n.setStart(A, e), n.setEnd(A, e + t), n)
  },
  yw = function (A) {
    if (gw.SUPPORT_NATIVE_TEXT_SEGMENTATION) {
      var e = new Intl.Segmenter(void 0, { granularity: 'grapheme' })
      return Array.from(e.segment(A)).map(function (A) {
        return A.segment
      })
    }
    return (function (A) {
      for (var e, t = fw(A), r = []; !(e = t.next()).done; )
        e.value && r.push(e.value.slice())
      return r
    })(A)
  },
  Qw = function (A, e) {
    return 0 !== e.letterSpacing
      ? yw(A)
      : (function (A, e) {
          if (gw.SUPPORT_NATIVE_TEXT_SEGMENTATION) {
            var t = new Intl.Segmenter(void 0, { granularity: 'word' })
            return Array.from(t.segment(A)).map(function (A) {
              return A.segment
            })
          }
          return Uw(A, e)
        })(A, e)
  },
  Fw = [32, 160, 4961, 65792, 65793, 4153, 4241],
  Uw = function (A, e) {
    for (
      var t,
        r = (function (A, e) {
          var t = mf(A),
            r = Ud(t, e),
            n = r[0],
            i = r[1],
            o = r[2],
            s = t.length,
            a = 0,
            c = 0
          return {
            next: function () {
              if (c >= s) return { done: !0, value: null }
              for (var A = ld; c < s && (A = Fd(t, i, n, ++c, o)) === ld; );
              if (A !== ld || c === s) {
                var e = new vd(t, A, a, c)
                return ((a = c), { value: e, done: !1 })
              }
              return { done: !0, value: null }
            },
          }
        })(A, {
          lineBreak: e.lineBreak,
          wordBreak:
            'break-word' === e.overflowWrap ? 'break-word' : e.wordBreak,
        }),
        n = [],
        i = function () {
          if (t.value) {
            var A = t.value.slice(),
              e = mf(A),
              r = ''
            ;(e.forEach(function (A) {
              ;-1 === Fw.indexOf(A)
                ? (r += Cf(A))
                : (r.length && n.push(r), n.push(Cf(A)), (r = ''))
            }),
              r.length && n.push(r))
          }
        };
      !(t = r.next()).done;

    )
      i()
    return n
  },
  vw = (function () {
    return function (A, e, t) {
      ;((this.text = bw(e.data, t.textTransform)),
        (this.textBounds = (function (A, e, t, r) {
          var n = Qw(e, t),
            i = [],
            o = 0
          return (
            n.forEach(function (e) {
              if (t.textDecorationLine.length || e.trim().length > 0)
                if (gw.SUPPORT_RANGE_BOUNDS) {
                  var n = Cw(r, o, e.length).getClientRects()
                  if (n.length > 1) {
                    var s = yw(e),
                      a = 0
                    s.forEach(function (e) {
                      ;(i.push(
                        new ww(
                          e,
                          gf.fromDOMRectList(
                            A,
                            Cw(r, a + o, e.length).getClientRects(),
                          ),
                        ),
                      ),
                        (a += e.length))
                    })
                  } else i.push(new ww(e, gf.fromDOMRectList(A, n)))
                } else {
                  var c = r.splitText(e.length)
                  ;(i.push(new ww(e, mw(A, r))), (r = c))
                }
              else gw.SUPPORT_RANGE_BOUNDS || (r = r.splitText(e.length))
              o += e.length
            }),
            i
          )
        })(A, this.text, t, e)))
    }
  })(),
  bw = function (A, e) {
    switch (e) {
      case 1:
        return A.toLowerCase()
      case 3:
        return A.replace(Ew, Hw)
      case 2:
        return A.toUpperCase()
      default:
        return A
    }
  },
  Ew = /(^|\s|:|-|\(|\))([a-z])/g,
  Hw = function (A, e, t) {
    return A.length > 0 ? e + t.toUpperCase() : A
  },
  _w = (function (A) {
    function e(e, t) {
      var r = A.call(this, e, t) || this
      return (
        (r.src = t.currentSrc || t.src),
        (r.intrinsicWidth = t.naturalWidth),
        (r.intrinsicHeight = t.naturalHeight),
        r.context.cache.addImage(r.src),
        r
      )
    }
    return (ff(e, A), e)
  })(Wg),
  Iw = (function (A) {
    function e(e, t) {
      var r = A.call(this, e, t) || this
      return (
        (r.canvas = t),
        (r.intrinsicWidth = t.width),
        (r.intrinsicHeight = t.height),
        r
      )
    }
    return (ff(e, A), e)
  })(Wg),
  Dw = (function (A) {
    function e(e, t) {
      var r = A.call(this, e, t) || this,
        n = new XMLSerializer(),
        i = wf(e, t)
      return (
        t.setAttribute('width', i.width + 'px'),
        t.setAttribute('height', i.height + 'px'),
        (r.svg =
          'data:image/svg+xml,' + encodeURIComponent(n.serializeToString(t))),
        (r.intrinsicWidth = t.width.baseVal.value),
        (r.intrinsicHeight = t.height.baseVal.value),
        r.context.cache.addImage(r.svg),
        r
      )
    }
    return (ff(e, A), e)
  })(Wg),
  xw = (function (A) {
    function e(e, t) {
      var r = A.call(this, e, t) || this
      return ((r.value = t.value), r)
    }
    return (ff(e, A), e)
  })(Wg),
  kw = (function (A) {
    function e(e, t) {
      var r = A.call(this, e, t) || this
      return (
        (r.start = t.start),
        (r.reversed = 'boolean' == typeof t.reversed && !0 === t.reversed),
        r
      )
    }
    return (ff(e, A), e)
  })(Wg),
  Lw = [{ type: 15, flags: 0, unit: 'px', number: 3 }],
  Sw = [{ type: 16, flags: 0, number: 50 }],
  Ow = 'checkbox',
  Kw = 'radio',
  Tw = 'password',
  Mw = 707406591,
  Rw = (function (A) {
    function e(e, t) {
      var r,
        n,
        i,
        o = A.call(this, e, t) || this
      switch (
        ((o.type = t.type.toLowerCase()),
        (o.checked = t.checked),
        (o.value =
          0 ===
          (n =
            (r = t).type === Tw
              ? new Array(r.value.length + 1).join('•')
              : r.value).length
            ? r.placeholder || ''
            : n),
        (o.type !== Ow && o.type !== Kw) ||
          ((o.styles.backgroundColor = 3739148031),
          (o.styles.borderTopColor =
            o.styles.borderRightColor =
            o.styles.borderBottomColor =
            o.styles.borderLeftColor =
              2779096575),
          (o.styles.borderTopWidth =
            o.styles.borderRightWidth =
            o.styles.borderBottomWidth =
            o.styles.borderLeftWidth =
              1),
          (o.styles.borderTopStyle =
            o.styles.borderRightStyle =
            o.styles.borderBottomStyle =
            o.styles.borderLeftStyle =
              1),
          (o.styles.backgroundClip = [0]),
          (o.styles.backgroundOrigin = [0]),
          (o.bounds =
            (i = o.bounds).width > i.height
              ? new gf(
                  i.left + (i.width - i.height) / 2,
                  i.top,
                  i.height,
                  i.height,
                )
              : i.width < i.height
                ? new gf(
                    i.left,
                    i.top + (i.height - i.width) / 2,
                    i.width,
                    i.width,
                  )
                : i)),
        o.type)
      ) {
        case Ow:
          o.styles.borderTopRightRadius =
            o.styles.borderTopLeftRadius =
            o.styles.borderBottomRightRadius =
            o.styles.borderBottomLeftRadius =
              Lw
          break
        case Kw:
          o.styles.borderTopRightRadius =
            o.styles.borderTopLeftRadius =
            o.styles.borderBottomRightRadius =
            o.styles.borderBottomLeftRadius =
              Sw
      }
      return o
    }
    return (ff(e, A), e)
  })(Wg),
  Nw = (function (A) {
    function e(e, t) {
      var r = A.call(this, e, t) || this,
        n = t.options[t.selectedIndex || 0]
      return ((r.value = (n && n.text) || ''), r)
    }
    return (ff(e, A), e)
  })(Wg),
  Pw = (function (A) {
    function e(e, t) {
      var r = A.call(this, e, t) || this
      return ((r.value = t.value), r)
    }
    return (ff(e, A), e)
  })(Wg),
  Vw = (function (A) {
    function e(e, t) {
      var r = A.call(this, e, t) || this
      ;((r.src = t.src),
        (r.width = parseInt(t.width, 10) || 0),
        (r.height = parseInt(t.height, 10) || 0),
        (r.backgroundColor = r.styles.backgroundColor))
      try {
        if (
          t.contentWindow &&
          t.contentWindow.document &&
          t.contentWindow.document.documentElement
        ) {
          r.tree = Ww(e, t.contentWindow.document.documentElement)
          var n = t.contentWindow.document.documentElement
              ? RB(
                  e,
                  getComputedStyle(t.contentWindow.document.documentElement)
                    .backgroundColor,
                )
              : NB.TRANSPARENT,
            i = t.contentWindow.document.body
              ? RB(
                  e,
                  getComputedStyle(t.contentWindow.document.body)
                    .backgroundColor,
                )
              : NB.TRANSPARENT
          r.backgroundColor = xB(n) ? (xB(i) ? r.styles.backgroundColor : i) : n
        }
      } catch (fi) {}
      return r
    }
    return (ff(e, A), e)
  })(Wg),
  Gw = ['OL', 'UL', 'MENU'],
  zw = function (A, e, t, r) {
    for (var n = e.firstChild, i = void 0; n; n = i)
      if (((i = n.nextSibling), Jw(n) && n.data.trim().length > 0))
        t.textNodes.push(new vw(A, n, t.styles))
      else if (Yw(n))
        if (hm(n) && n.assignedNodes)
          n.assignedNodes().forEach(function (e) {
            return zw(A, e, t, r)
          })
        else {
          var o = jw(A, n)
          o.styles.isVisible() &&
            (qw(n, o, r) ? (o.flags |= 4) : Xw(o.styles) && (o.flags |= 2),
            -1 !== Gw.indexOf(n.tagName) && (o.flags |= 8),
            t.elements.push(o),
            n.slot,
            n.shadowRoot
              ? zw(A, n.shadowRoot, o, r)
              : um(n) || rm(n) || lm(n) || zw(A, n, o, r))
        }
  },
  jw = function (A, e) {
    return sm(e)
      ? new _w(A, e)
      : im(e)
        ? new Iw(A, e)
        : rm(e)
          ? new Dw(A, e)
          : Am(e)
            ? new xw(A, e)
            : em(e)
              ? new kw(A, e)
              : tm(e)
                ? new Rw(A, e)
                : lm(e)
                  ? new Nw(A, e)
                  : um(e)
                    ? new Pw(A, e)
                    : am(e)
                      ? new Vw(A, e)
                      : new Wg(A, e)
  },
  Ww = function (A, e) {
    var t = jw(A, e)
    return ((t.flags |= 4), zw(A, e, t, t), t)
  },
  qw = function (A, e, t) {
    return (
      e.styles.isPositionedWithZIndex() ||
      e.styles.opacity < 1 ||
      e.styles.isTransformed() ||
      (nm(A) && t.styles.isTransparent())
    )
  },
  Xw = function (A) {
    return A.isPositioned() || A.isFloating()
  },
  Jw = function (A) {
    return A.nodeType === Node.TEXT_NODE
  },
  Yw = function (A) {
    return A.nodeType === Node.ELEMENT_NODE
  },
  Zw = function (A) {
    return Yw(A) && void 0 !== A.style && !$w(A)
  },
  $w = function (A) {
    return 'object' == typeof A.className
  },
  Am = function (A) {
    return 'LI' === A.tagName
  },
  em = function (A) {
    return 'OL' === A.tagName
  },
  tm = function (A) {
    return 'INPUT' === A.tagName
  },
  rm = function (A) {
    return 'svg' === A.tagName
  },
  nm = function (A) {
    return 'BODY' === A.tagName
  },
  im = function (A) {
    return 'CANVAS' === A.tagName
  },
  om = function (A) {
    return 'VIDEO' === A.tagName
  },
  sm = function (A) {
    return 'IMG' === A.tagName
  },
  am = function (A) {
    return 'IFRAME' === A.tagName
  },
  cm = function (A) {
    return 'STYLE' === A.tagName
  },
  um = function (A) {
    return 'TEXTAREA' === A.tagName
  },
  lm = function (A) {
    return 'SELECT' === A.tagName
  },
  hm = function (A) {
    return 'SLOT' === A.tagName
  },
  fm = function (A) {
    return A.tagName.indexOf('-') > 0
  },
  dm = (function () {
    function A() {
      this.counters = {}
    }
    return (
      (A.prototype.getCounterValue = function (A) {
        var e = this.counters[A]
        return e && e.length ? e[e.length - 1] : 1
      }),
      (A.prototype.getCounterValues = function (A) {
        var e = this.counters[A]
        return e || []
      }),
      (A.prototype.pop = function (A) {
        var e = this
        A.forEach(function (A) {
          return e.counters[A].pop()
        })
      }),
      (A.prototype.parse = function (A) {
        var e = this,
          t = A.counterIncrement,
          r = A.counterReset,
          n = !0
        null !== t &&
          t.forEach(function (A) {
            var t = e.counters[A.counter]
            t &&
              0 !== A.increment &&
              ((n = !1),
              t.length || t.push(1),
              (t[Math.max(0, t.length - 1)] += A.increment))
          })
        var i = []
        return (
          n &&
            r.forEach(function (A) {
              var t = e.counters[A.counter]
              ;(i.push(A.counter),
                t || (t = e.counters[A.counter] = []),
                t.push(A.reset))
            }),
          i
        )
      }),
      A
    )
  })(),
  Bm = {
    integers: [1e3, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1],
    values: [
      'M',
      'CM',
      'D',
      'CD',
      'C',
      'XC',
      'L',
      'XL',
      'X',
      'IX',
      'V',
      'IV',
      'I',
    ],
  },
  pm = {
    integers: [
      9e3, 8e3, 7e3, 6e3, 5e3, 4e3, 3e3, 2e3, 1e3, 900, 800, 700, 600, 500, 400,
      300, 200, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 9, 8, 7, 6, 5, 4, 3, 2,
      1,
    ],
    values: [
      'Ք',
      'Փ',
      'Ւ',
      'Ց',
      'Ր',
      'Տ',
      'Վ',
      'Ս',
      'Ռ',
      'Ջ',
      'Պ',
      'Չ',
      'Ո',
      'Շ',
      'Ն',
      'Յ',
      'Մ',
      'Ճ',
      'Ղ',
      'Ձ',
      'Հ',
      'Կ',
      'Ծ',
      'Խ',
      'Լ',
      'Ի',
      'Ժ',
      'Թ',
      'Ը',
      'Է',
      'Զ',
      'Ե',
      'Դ',
      'Գ',
      'Բ',
      'Ա',
    ],
  },
  gm = {
    integers: [
      1e4, 9e3, 8e3, 7e3, 6e3, 5e3, 4e3, 3e3, 2e3, 1e3, 400, 300, 200, 100, 90,
      80, 70, 60, 50, 40, 30, 20, 19, 18, 17, 16, 15, 10, 9, 8, 7, 6, 5, 4, 3,
      2, 1,
    ],
    values: [
      'י׳',
      'ט׳',
      'ח׳',
      'ז׳',
      'ו׳',
      'ה׳',
      'ד׳',
      'ג׳',
      'ב׳',
      'א׳',
      'ת',
      'ש',
      'ר',
      'ק',
      'צ',
      'פ',
      'ע',
      'ס',
      'נ',
      'מ',
      'ל',
      'כ',
      'יט',
      'יח',
      'יז',
      'טז',
      'טו',
      'י',
      'ט',
      'ח',
      'ז',
      'ו',
      'ה',
      'ד',
      'ג',
      'ב',
      'א',
    ],
  },
  wm = {
    integers: [
      1e4, 9e3, 8e3, 7e3, 6e3, 5e3, 4e3, 3e3, 2e3, 1e3, 900, 800, 700, 600, 500,
      400, 300, 200, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 9, 8, 7, 6, 5, 4,
      3, 2, 1,
    ],
    values: [
      'ჵ',
      'ჰ',
      'ჯ',
      'ჴ',
      'ხ',
      'ჭ',
      'წ',
      'ძ',
      'ც',
      'ჩ',
      'შ',
      'ყ',
      'ღ',
      'ქ',
      'ფ',
      'ჳ',
      'ტ',
      'ს',
      'რ',
      'ჟ',
      'პ',
      'ო',
      'ჲ',
      'ნ',
      'მ',
      'ლ',
      'კ',
      'ი',
      'თ',
      'ჱ',
      'ზ',
      'ვ',
      'ე',
      'დ',
      'გ',
      'ბ',
      'ა',
    ],
  },
  mm = function (A, e, t, r, n, i) {
    return A < e || A > t
      ? Hm(A, n, i.length > 0)
      : r.integers.reduce(function (e, t, n) {
          for (; A >= t; ) ((A -= t), (e += r.values[n]))
          return e
        }, '') + i
  },
  Cm = function (A, e, t, r) {
    var n = ''
    do {
      ;(t || A--, (n = r(A) + n), (A /= e))
    } while (A * e >= e)
    return n
  },
  ym = function (A, e, t, r, n) {
    var i = t - e + 1
    return (
      (A < 0 ? '-' : '') +
      (Cm(Math.abs(A), i, r, function (A) {
        return Cf(Math.floor(A % i) + e)
      }) +
        n)
    )
  },
  Qm = function (A, e, t) {
    void 0 === t && (t = '. ')
    var r = e.length
    return (
      Cm(Math.abs(A), r, !1, function (A) {
        return e[Math.floor(A % r)]
      }) + t
    )
  },
  Fm = function (A, e, t, r, n, i) {
    if (A < -9999 || A > 9999) return Hm(A, 4, n.length > 0)
    var o = Math.abs(A),
      s = n
    if (0 === o) return e[0] + s
    for (var a = 0; o > 0 && a <= 4; a++) {
      var c = o % 10
      ;(0 === c && Dg(i, 1) && '' !== s
        ? (s = e[c] + s)
        : c > 1 ||
            (1 === c && 0 === a) ||
            (1 === c && 1 === a && Dg(i, 2)) ||
            (1 === c && 1 === a && Dg(i, 4) && A > 100) ||
            (1 === c && a > 1 && Dg(i, 8))
          ? (s = e[c] + (a > 0 ? t[a - 1] : '') + s)
          : 1 === c && a > 0 && (s = t[a - 1] + s),
        (o = Math.floor(o / 10)))
    }
    return (A < 0 ? r : '') + s
  },
  Um = '十百千萬',
  vm = '拾佰仟萬',
  bm = 'マイナス',
  Em = '마이너스',
  Hm = function (A, e, t) {
    var r = t ? '. ' : '',
      n = t ? '、' : '',
      i = t ? ', ' : '',
      o = t ? ' ' : ''
    switch (e) {
      case 0:
        return '•' + o
      case 1:
        return '◦' + o
      case 2:
        return '◾' + o
      case 5:
        var s = ym(A, 48, 57, !0, r)
        return s.length < 4 ? '0' + s : s
      case 4:
        return Qm(A, '〇一二三四五六七八九', n)
      case 6:
        return mm(A, 1, 3999, Bm, 3, r).toLowerCase()
      case 7:
        return mm(A, 1, 3999, Bm, 3, r)
      case 8:
        return ym(A, 945, 969, !1, r)
      case 9:
        return ym(A, 97, 122, !1, r)
      case 10:
        return ym(A, 65, 90, !1, r)
      case 11:
        return ym(A, 1632, 1641, !0, r)
      case 12:
      case 49:
        return mm(A, 1, 9999, pm, 3, r)
      case 35:
        return mm(A, 1, 9999, pm, 3, r).toLowerCase()
      case 13:
        return ym(A, 2534, 2543, !0, r)
      case 14:
      case 30:
        return ym(A, 6112, 6121, !0, r)
      case 15:
        return Qm(A, '子丑寅卯辰巳午未申酉戌亥', n)
      case 16:
        return Qm(A, '甲乙丙丁戊己庚辛壬癸', n)
      case 17:
      case 48:
        return Fm(A, '零一二三四五六七八九', Um, '負', n, 14)
      case 47:
        return Fm(A, '零壹貳參肆伍陸柒捌玖', vm, '負', n, 15)
      case 42:
        return Fm(A, '零一二三四五六七八九', Um, '负', n, 14)
      case 41:
        return Fm(A, '零壹贰叁肆伍陆柒捌玖', vm, '负', n, 15)
      case 26:
        return Fm(A, '〇一二三四五六七八九', '十百千万', bm, n, 0)
      case 25:
        return Fm(A, '零壱弐参四伍六七八九', '拾百千万', bm, n, 7)
      case 31:
        return Fm(A, '영일이삼사오육칠팔구', '십백천만', Em, i, 7)
      case 33:
        return Fm(A, '零一二三四五六七八九', '十百千萬', Em, i, 0)
      case 32:
        return Fm(A, '零壹貳參四五六七八九', '拾百千', Em, i, 7)
      case 18:
        return ym(A, 2406, 2415, !0, r)
      case 20:
        return mm(A, 1, 19999, wm, 3, r)
      case 21:
        return ym(A, 2790, 2799, !0, r)
      case 22:
        return ym(A, 2662, 2671, !0, r)
      case 22:
        return mm(A, 1, 10999, gm, 3, r)
      case 23:
        return Qm(
          A,
          'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわゐゑをん',
        )
      case 24:
        return Qm(
          A,
          'いろはにほへとちりぬるをわかよたれそつねならむうゐのおくやまけふこえてあさきゆめみしゑひもせす',
        )
      case 27:
        return ym(A, 3302, 3311, !0, r)
      case 28:
        return Qm(
          A,
          'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヰヱヲン',
          n,
        )
      case 29:
        return Qm(
          A,
          'イロハニホヘトチリヌルヲワカヨタレソツネナラムウヰノオクヤマケフコエテアサキユメミシヱヒモセス',
          n,
        )
      case 34:
        return ym(A, 3792, 3801, !0, r)
      case 37:
        return ym(A, 6160, 6169, !0, r)
      case 38:
        return ym(A, 4160, 4169, !0, r)
      case 39:
        return ym(A, 2918, 2927, !0, r)
      case 40:
        return ym(A, 1776, 1785, !0, r)
      case 43:
        return ym(A, 3046, 3055, !0, r)
      case 44:
        return ym(A, 3174, 3183, !0, r)
      case 45:
        return ym(A, 3664, 3673, !0, r)
      case 46:
        return ym(A, 3872, 3881, !0, r)
      default:
        return ym(A, 48, 57, !0, r)
    }
  },
  _m = 'data-html2canvas-ignore',
  Im = (function () {
    function A(A, e, t) {
      if (
        ((this.context = A),
        (this.options = t),
        (this.scrolledElements = []),
        (this.referenceElement = e),
        (this.counters = new dm()),
        (this.quoteDepth = 0),
        !e.ownerDocument)
      )
        throw new Error('Cloned element does not have an owner document')
      this.documentElement = this.cloneNode(e.ownerDocument.documentElement, !1)
    }
    return (
      (A.prototype.toIFrame = function (A, e) {
        var t = this,
          r = km(A, e)
        if (!r.contentWindow)
          return Promise.reject('Unable to find iframe window')
        var n = A.defaultView.pageXOffset,
          i = A.defaultView.pageYOffset,
          o = r.contentWindow,
          s = o.document,
          a = Om(r).then(function () {
            return Bf(t, 0, void 0, function () {
              var A, t
              return pf(this, function (n) {
                switch (n.label) {
                  case 0:
                    return (
                      this.scrolledElements.forEach(Nm),
                      o &&
                        (o.scrollTo(e.left, e.top),
                        !/(iPad|iPhone|iPod)/g.test(navigator.userAgent) ||
                          (o.scrollY === e.top && o.scrollX === e.left) ||
                          (this.context.logger.warn(
                            'Unable to restore scroll position for cloned document',
                          ),
                          (this.context.windowBounds =
                            this.context.windowBounds.add(
                              o.scrollX - e.left,
                              o.scrollY - e.top,
                              0,
                              0,
                            )))),
                      (A = this.options.onclone),
                      void 0 === (t = this.clonedReferenceElement)
                        ? [
                            2,
                            Promise.reject(
                              'Error finding the ' +
                                this.referenceElement.nodeName +
                                ' in the cloned document',
                            ),
                          ]
                        : s.fonts && s.fonts.ready
                          ? [4, s.fonts.ready]
                          : [3, 2]
                    )
                  case 1:
                    ;(n.sent(), (n.label = 2))
                  case 2:
                    return /(AppleWebKit)/g.test(navigator.userAgent)
                      ? [4, Sm(s)]
                      : [3, 4]
                  case 3:
                    ;(n.sent(), (n.label = 4))
                  case 4:
                    return 'function' == typeof A
                      ? [
                          2,
                          Promise.resolve()
                            .then(function () {
                              return A(s, t)
                            })
                            .then(function () {
                              return r
                            }),
                        ]
                      : [2, r]
                }
              })
            })
          })
        return (
          s.open(),
          s.write(Mm(document.doctype) + '<html></html>'),
          Rm(this.referenceElement.ownerDocument, n, i),
          s.replaceChild(s.adoptNode(this.documentElement), s.documentElement),
          s.close(),
          a
        )
      }),
      (A.prototype.createElementClone = function (A) {
        if ((jg(A, 2), im(A))) return this.createCanvasClone(A)
        if (om(A)) return this.createVideoClone(A)
        if (cm(A)) return this.createStyleClone(A)
        var e = A.cloneNode(!1)
        return (
          sm(e) &&
            (sm(A) &&
              A.currentSrc &&
              A.currentSrc !== A.src &&
              ((e.src = A.currentSrc), (e.srcset = '')),
            'lazy' === e.loading && (e.loading = 'eager')),
          fm(e) ? this.createCustomElementClone(e) : e
        )
      }),
      (A.prototype.createCustomElementClone = function (A) {
        var e = document.createElement('html2canvascustomelement')
        return (Tm(A.style, e), e)
      }),
      (A.prototype.createStyleClone = function (A) {
        try {
          var e = A.sheet
          if (e && e.cssRules) {
            var t = [].slice.call(e.cssRules, 0).reduce(function (A, e) {
                return e && 'string' == typeof e.cssText ? A + e.cssText : A
              }, ''),
              r = A.cloneNode(!1)
            return ((r.textContent = t), r)
          }
        } catch (fi) {
          if (
            (this.context.logger.error(
              'Unable to access cssRules property',
              fi,
            ),
            'SecurityError' !== fi.name)
          )
            throw fi
        }
        return A.cloneNode(!1)
      }),
      (A.prototype.createCanvasClone = function (A) {
        var e
        if (this.options.inlineImages && A.ownerDocument) {
          var t = A.ownerDocument.createElement('img')
          try {
            return ((t.src = A.toDataURL()), t)
          } catch (fi) {
            this.context.logger.info(
              'Unable to inline canvas contents, canvas is tainted',
              A,
            )
          }
        }
        var r = A.cloneNode(!1)
        try {
          ;((r.width = A.width), (r.height = A.height))
          var n = A.getContext('2d'),
            i = r.getContext('2d')
          if (i)
            if (!this.options.allowTaint && n)
              i.putImageData(n.getImageData(0, 0, A.width, A.height), 0, 0)
            else {
              var o =
                null !== (e = A.getContext('webgl2')) && void 0 !== e
                  ? e
                  : A.getContext('webgl')
              if (o) {
                var s = o.getContextAttributes()
                !1 === (null == s ? void 0 : s.preserveDrawingBuffer) &&
                  this.context.logger.warn(
                    'Unable to clone WebGL context as it has preserveDrawingBuffer=false',
                    A,
                  )
              }
              i.drawImage(A, 0, 0)
            }
          return r
        } catch (fi) {
          this.context.logger.info('Unable to clone canvas as it is tainted', A)
        }
        return r
      }),
      (A.prototype.createVideoClone = function (A) {
        var e = A.ownerDocument.createElement('canvas')
        ;((e.width = A.offsetWidth), (e.height = A.offsetHeight))
        var t = e.getContext('2d')
        try {
          return (
            t &&
              (t.drawImage(A, 0, 0, e.width, e.height),
              this.options.allowTaint ||
                t.getImageData(0, 0, e.width, e.height)),
            e
          )
        } catch (fi) {
          this.context.logger.info('Unable to clone video as it is tainted', A)
        }
        var r = A.ownerDocument.createElement('canvas')
        return ((r.width = A.offsetWidth), (r.height = A.offsetHeight), r)
      }),
      (A.prototype.appendChildNode = function (A, e, t) {
        ;(Yw(e) &&
          ('SCRIPT' === e.tagName ||
            e.hasAttribute(_m) ||
            ('function' == typeof this.options.ignoreElements &&
              this.options.ignoreElements(e)))) ||
          (this.options.copyStyles && Yw(e) && cm(e)) ||
          A.appendChild(this.cloneNode(e, t))
      }),
      (A.prototype.cloneChildNodes = function (A, e, t) {
        for (
          var r = this,
            n = A.shadowRoot ? A.shadowRoot.firstChild : A.firstChild;
          n;
          n = n.nextSibling
        )
          if (Yw(n) && hm(n) && 'function' == typeof n.assignedNodes) {
            var i = n.assignedNodes()
            i.length &&
              i.forEach(function (A) {
                return r.appendChildNode(e, A, t)
              })
          } else this.appendChildNode(e, n, t)
      }),
      (A.prototype.cloneNode = function (A, e) {
        if (Jw(A)) return document.createTextNode(A.data)
        if (!A.ownerDocument) return A.cloneNode(!1)
        var t = A.ownerDocument.defaultView
        if (t && Yw(A) && (Zw(A) || $w(A))) {
          var r = this.createElementClone(A)
          r.style.transitionProperty = 'none'
          var n = t.getComputedStyle(A),
            i = t.getComputedStyle(A, ':before'),
            o = t.getComputedStyle(A, ':after')
          ;(this.referenceElement === A &&
            Zw(r) &&
            (this.clonedReferenceElement = r),
            nm(r) && zm(r))
          var s = this.counters.parse(new Gg(this.context, n)),
            a = this.resolvePseudoContent(A, r, i, tw.BEFORE)
          ;(fm(A) && (e = !0),
            om(A) || this.cloneChildNodes(A, r, e),
            a && r.insertBefore(a, r.firstChild))
          var c = this.resolvePseudoContent(A, r, o, tw.AFTER)
          return (
            c && r.appendChild(c),
            this.counters.pop(s),
            ((n && (this.options.copyStyles || $w(A)) && !am(A)) || e) &&
              Tm(n, r),
            (0 === A.scrollTop && 0 === A.scrollLeft) ||
              this.scrolledElements.push([r, A.scrollLeft, A.scrollTop]),
            (um(A) || lm(A)) && (um(r) || lm(r)) && (r.value = A.value),
            r
          )
        }
        return A.cloneNode(!1)
      }),
      (A.prototype.resolvePseudoContent = function (A, e, t, r) {
        var n = this
        if (t) {
          var i = t.content,
            o = e.ownerDocument
          if (
            o &&
            i &&
            'none' !== i &&
            '-moz-alt-content' !== i &&
            'none' !== t.display
          ) {
            this.counters.parse(new Gg(this.context, t))
            var s = new Vg(this.context, t),
              a = o.createElement('html2canvaspseudoelement')
            ;(Tm(t, a),
              s.content.forEach(function (e) {
                if (0 === e.type) a.appendChild(o.createTextNode(e.value))
                else if (22 === e.type) {
                  var t = o.createElement('img')
                  ;((t.src = e.value),
                    (t.style.opacity = '1'),
                    a.appendChild(t))
                } else if (18 === e.type) {
                  if ('attr' === e.name) {
                    var r = e.values.filter(uB)
                    r.length &&
                      a.appendChild(
                        o.createTextNode(A.getAttribute(r[0].value) || ''),
                      )
                  } else if ('counter' === e.name) {
                    var i = e.values.filter(dB),
                      c = i[0],
                      u = i[1]
                    if (c && uB(c)) {
                      var l = n.counters.getCounterValue(c.value),
                        h = u && uB(u) ? Yp.parse(n.context, u.value) : 3
                      a.appendChild(o.createTextNode(Hm(l, h, !1)))
                    }
                  } else if ('counters' === e.name) {
                    var f = e.values.filter(dB),
                      d = ((c = f[0]), f[1])
                    u = f[2]
                    if (c && uB(c)) {
                      var B = n.counters.getCounterValues(c.value),
                        p = u && uB(u) ? Yp.parse(n.context, u.value) : 3,
                        g = d && 0 === d.type ? d.value : '',
                        w = B.map(function (A) {
                          return Hm(A, p, !1)
                        }).join(g)
                      a.appendChild(o.createTextNode(w))
                    }
                  }
                } else if (20 === e.type)
                  switch (e.value) {
                    case 'open-quote':
                      a.appendChild(
                        o.createTextNode(Kg(s.quotes, n.quoteDepth++, !0)),
                      )
                      break
                    case 'close-quote':
                      a.appendChild(
                        o.createTextNode(Kg(s.quotes, --n.quoteDepth, !1)),
                      )
                      break
                    default:
                      a.appendChild(o.createTextNode(e.value))
                  }
              }),
              (a.className = Pm + ' ' + Vm))
            var c = r === tw.BEFORE ? ' ' + Pm : ' ' + Vm
            return (
              $w(e) ? (e.className.baseValue += c) : (e.className += c),
              a
            )
          }
        }
      }),
      (A.destroy = function (A) {
        return !!A.parentNode && (A.parentNode.removeChild(A), !0)
      }),
      A
    )
  })()
;(((rw = tw || (tw = {}))[(rw.BEFORE = 0)] = 'BEFORE'),
  (rw[(rw.AFTER = 1)] = 'AFTER'))
var Dm,
  xm,
  km = function (A, e) {
    var t = A.createElement('iframe')
    return (
      (t.className = 'html2canvas-container'),
      (t.style.visibility = 'hidden'),
      (t.style.position = 'fixed'),
      (t.style.left = '-10000px'),
      (t.style.top = '0px'),
      (t.style.border = '0'),
      (t.width = e.width.toString()),
      (t.height = e.height.toString()),
      (t.scrolling = 'no'),
      t.setAttribute(_m, 'true'),
      A.body.appendChild(t),
      t
    )
  },
  Lm = function (A) {
    return new Promise(function (e) {
      A.complete ? e() : A.src ? ((A.onload = e), (A.onerror = e)) : e()
    })
  },
  Sm = function (A) {
    return Promise.all([].slice.call(A.images, 0).map(Lm))
  },
  Om = function (A) {
    return new Promise(function (e, t) {
      var r = A.contentWindow
      if (!r) return t('No window assigned for iframe')
      var n = r.document
      r.onload = A.onload = function () {
        r.onload = A.onload = null
        var t = setInterval(function () {
          n.body.childNodes.length > 0 &&
            'complete' === n.readyState &&
            (clearInterval(t), e(A))
        }, 50)
      }
    })
  },
  Km = ['all', 'd', 'content'],
  Tm = function (A, e) {
    for (var t = A.length - 1; t >= 0; t--) {
      var r = A.item(t)
      ;-1 === Km.indexOf(r) && e.style.setProperty(r, A.getPropertyValue(r))
    }
    return e
  },
  Mm = function (A) {
    var e = ''
    return (
      A &&
        ((e += '<!DOCTYPE '),
        A.name && (e += A.name),
        A.internalSubset && (e += A.internalSubset),
        A.publicId && (e += '"' + A.publicId + '"'),
        A.systemId && (e += '"' + A.systemId + '"'),
        (e += '>')),
      e
    )
  },
  Rm = function (A, e, t) {
    A &&
      A.defaultView &&
      (e !== A.defaultView.pageXOffset || t !== A.defaultView.pageYOffset) &&
      A.defaultView.scrollTo(e, t)
  },
  Nm = function (A) {
    var e = A[0],
      t = A[1],
      r = A[2]
    ;((e.scrollLeft = t), (e.scrollTop = r))
  },
  Pm = '___html2canvas___pseudoelement_before',
  Vm = '___html2canvas___pseudoelement_after',
  Gm = '{\n    content: "" !important;\n    display: none !important;\n}',
  zm = function (A) {
    jm(A, '.' + Pm + ':before' + Gm + '\n         .' + Vm + ':after' + Gm)
  },
  jm = function (A, e) {
    var t = A.ownerDocument
    if (t) {
      var r = t.createElement('style')
      ;((r.textContent = e), A.appendChild(r))
    }
  },
  Wm = (function () {
    function A() {}
    return (
      (A.getOrigin = function (e) {
        var t = A._link
        return t
          ? ((t.href = e), (t.href = t.href), t.protocol + t.hostname + t.port)
          : 'about:blank'
      }),
      (A.isSameOrigin = function (e) {
        return A.getOrigin(e) === A._origin
      }),
      (A.setContext = function (e) {
        ;((A._link = e.document.createElement('a')),
          (A._origin = A.getOrigin(e.location.href)))
      }),
      (A._origin = 'about:blank'),
      A
    )
  })(),
  qm = (function () {
    function A(A, e) {
      ;((this.context = A), (this._options = e), (this._cache = {}))
    }
    return (
      (A.prototype.addImage = function (A) {
        var e = Promise.resolve()
        return this.has(A)
          ? e
          : eC(A) || Zm(A)
            ? ((this._cache[A] = this.loadImage(A)).catch(function () {}), e)
            : e
      }),
      (A.prototype.match = function (A) {
        return this._cache[A]
      }),
      (A.prototype.loadImage = function (A) {
        return Bf(this, 0, void 0, function () {
          var e,
            t,
            r,
            n,
            i = this
          return pf(this, function (o) {
            switch (o.label) {
              case 0:
                return (
                  (e = Wm.isSameOrigin(A)),
                  (t =
                    !$m(A) &&
                    !0 === this._options.useCORS &&
                    gw.SUPPORT_CORS_IMAGES &&
                    !e),
                  (r =
                    !$m(A) &&
                    !e &&
                    !eC(A) &&
                    'string' == typeof this._options.proxy &&
                    gw.SUPPORT_CORS_XHR &&
                    !t),
                  e ||
                  !1 !== this._options.allowTaint ||
                  $m(A) ||
                  eC(A) ||
                  r ||
                  t
                    ? ((n = A), r ? [4, this.proxy(n)] : [3, 2])
                    : [2]
                )
              case 1:
                ;((n = o.sent()), (o.label = 2))
              case 2:
                return (
                  this.context.logger.debug(
                    'Added image ' + A.substring(0, 256),
                  ),
                  [
                    4,
                    new Promise(function (A, e) {
                      var r = new Image()
                      ;((r.onload = function () {
                        return A(r)
                      }),
                        (r.onerror = e),
                        (AC(n) || t) && (r.crossOrigin = 'anonymous'),
                        (r.src = n),
                        !0 === r.complete &&
                          setTimeout(function () {
                            return A(r)
                          }, 500),
                        i._options.imageTimeout > 0 &&
                          setTimeout(function () {
                            return e(
                              'Timed out (' +
                                i._options.imageTimeout +
                                'ms) loading image',
                            )
                          }, i._options.imageTimeout))
                    }),
                  ]
                )
              case 3:
                return [2, o.sent()]
            }
          })
        })
      }),
      (A.prototype.has = function (A) {
        return void 0 !== this._cache[A]
      }),
      (A.prototype.keys = function () {
        return Promise.resolve(Object.keys(this._cache))
      }),
      (A.prototype.proxy = function (A) {
        var e = this,
          t = this._options.proxy
        if (!t) throw new Error('No proxy defined')
        var r = A.substring(0, 256)
        return new Promise(function (n, i) {
          var o = gw.SUPPORT_RESPONSE_TYPE ? 'blob' : 'text',
            s = new XMLHttpRequest()
          ;((s.onload = function () {
            if (200 === s.status)
              if ('text' === o) n(s.response)
              else {
                var A = new FileReader()
                ;(A.addEventListener(
                  'load',
                  function () {
                    return n(A.result)
                  },
                  !1,
                ),
                  A.addEventListener(
                    'error',
                    function (A) {
                      return i(A)
                    },
                    !1,
                  ),
                  A.readAsDataURL(s.response))
              }
            else
              i(
                'Failed to proxy resource ' +
                  r +
                  ' with status code ' +
                  s.status,
              )
          }),
            (s.onerror = i))
          var a = t.indexOf('?') > -1 ? '&' : '?'
          if (
            (s.open(
              'GET',
              '' +
                t +
                a +
                'url=' +
                encodeURIComponent(A) +
                '&responseType=' +
                o,
            ),
            'text' !== o && s instanceof XMLHttpRequest && (s.responseType = o),
            e._options.imageTimeout)
          ) {
            var c = e._options.imageTimeout
            ;((s.timeout = c),
              (s.ontimeout = function () {
                return i('Timed out (' + c + 'ms) proxying ' + r)
              }))
          }
          s.send()
        })
      }),
      A
    )
  })(),
  Xm = /^data:image\/svg\+xml/i,
  Jm = /^data:image\/.*;base64,/i,
  Ym = /^data:image\/.*/i,
  Zm = function (A) {
    return gw.SUPPORT_SVG_DRAWING || !tC(A)
  },
  $m = function (A) {
    return Ym.test(A)
  },
  AC = function (A) {
    return Jm.test(A)
  },
  eC = function (A) {
    return 'blob' === A.substr(0, 4)
  },
  tC = function (A) {
    return 'svg' === A.substr(-3).toLowerCase() || Xm.test(A)
  },
  rC = (function () {
    function A(A, e) {
      ;((this.type = 0), (this.x = A), (this.y = e))
    }
    return (
      (A.prototype.add = function (e, t) {
        return new A(this.x + e, this.y + t)
      }),
      A
    )
  })(),
  nC = function (A, e, t) {
    return new rC(A.x + (e.x - A.x) * t, A.y + (e.y - A.y) * t)
  },
  iC = (function () {
    function A(A, e, t, r) {
      ;((this.type = 1),
        (this.start = A),
        (this.startControl = e),
        (this.endControl = t),
        (this.end = r))
    }
    return (
      (A.prototype.subdivide = function (e, t) {
        var r = nC(this.start, this.startControl, e),
          n = nC(this.startControl, this.endControl, e),
          i = nC(this.endControl, this.end, e),
          o = nC(r, n, e),
          s = nC(n, i, e),
          a = nC(o, s, e)
        return t ? new A(this.start, r, o, a) : new A(a, s, i, this.end)
      }),
      (A.prototype.add = function (e, t) {
        return new A(
          this.start.add(e, t),
          this.startControl.add(e, t),
          this.endControl.add(e, t),
          this.end.add(e, t),
        )
      }),
      (A.prototype.reverse = function () {
        return new A(this.end, this.endControl, this.startControl, this.start)
      }),
      A
    )
  })(),
  oC = function (A) {
    return 1 === A.type
  },
  sC = (function () {
    return function (A) {
      var e = A.styles,
        t = A.bounds,
        r = FB(e.borderTopLeftRadius, t.width, t.height),
        n = r[0],
        i = r[1],
        o = FB(e.borderTopRightRadius, t.width, t.height),
        s = o[0],
        a = o[1],
        c = FB(e.borderBottomRightRadius, t.width, t.height),
        u = c[0],
        l = c[1],
        h = FB(e.borderBottomLeftRadius, t.width, t.height),
        f = h[0],
        d = h[1],
        B = []
      ;(B.push((n + s) / t.width),
        B.push((f + u) / t.width),
        B.push((i + d) / t.height),
        B.push((a + l) / t.height))
      var p = Math.max.apply(Math, B)
      p > 1 &&
        ((n /= p),
        (i /= p),
        (s /= p),
        (a /= p),
        (u /= p),
        (l /= p),
        (f /= p),
        (d /= p))
      var g = t.width - s,
        w = t.height - l,
        m = t.width - u,
        C = t.height - d,
        y = e.borderTopWidth,
        Q = e.borderRightWidth,
        F = e.borderBottomWidth,
        U = e.borderLeftWidth,
        v = UB(e.paddingTop, A.bounds.width),
        b = UB(e.paddingRight, A.bounds.width),
        E = UB(e.paddingBottom, A.bounds.width),
        H = UB(e.paddingLeft, A.bounds.width)
      ;((this.topLeftBorderDoubleOuterBox =
        n > 0 || i > 0
          ? aC(t.left + U / 3, t.top + y / 3, n - U / 3, i - y / 3, Dm.TOP_LEFT)
          : new rC(t.left + U / 3, t.top + y / 3)),
        (this.topRightBorderDoubleOuterBox =
          n > 0 || i > 0
            ? aC(t.left + g, t.top + y / 3, s - Q / 3, a - y / 3, Dm.TOP_RIGHT)
            : new rC(t.left + t.width - Q / 3, t.top + y / 3)),
        (this.bottomRightBorderDoubleOuterBox =
          u > 0 || l > 0
            ? aC(t.left + m, t.top + w, u - Q / 3, l - F / 3, Dm.BOTTOM_RIGHT)
            : new rC(t.left + t.width - Q / 3, t.top + t.height - F / 3)),
        (this.bottomLeftBorderDoubleOuterBox =
          f > 0 || d > 0
            ? aC(
                t.left + U / 3,
                t.top + C,
                f - U / 3,
                d - F / 3,
                Dm.BOTTOM_LEFT,
              )
            : new rC(t.left + U / 3, t.top + t.height - F / 3)),
        (this.topLeftBorderDoubleInnerBox =
          n > 0 || i > 0
            ? aC(
                t.left + (2 * U) / 3,
                t.top + (2 * y) / 3,
                n - (2 * U) / 3,
                i - (2 * y) / 3,
                Dm.TOP_LEFT,
              )
            : new rC(t.left + (2 * U) / 3, t.top + (2 * y) / 3)),
        (this.topRightBorderDoubleInnerBox =
          n > 0 || i > 0
            ? aC(
                t.left + g,
                t.top + (2 * y) / 3,
                s - (2 * Q) / 3,
                a - (2 * y) / 3,
                Dm.TOP_RIGHT,
              )
            : new rC(t.left + t.width - (2 * Q) / 3, t.top + (2 * y) / 3)),
        (this.bottomRightBorderDoubleInnerBox =
          u > 0 || l > 0
            ? aC(
                t.left + m,
                t.top + w,
                u - (2 * Q) / 3,
                l - (2 * F) / 3,
                Dm.BOTTOM_RIGHT,
              )
            : new rC(
                t.left + t.width - (2 * Q) / 3,
                t.top + t.height - (2 * F) / 3,
              )),
        (this.bottomLeftBorderDoubleInnerBox =
          f > 0 || d > 0
            ? aC(
                t.left + (2 * U) / 3,
                t.top + C,
                f - (2 * U) / 3,
                d - (2 * F) / 3,
                Dm.BOTTOM_LEFT,
              )
            : new rC(t.left + (2 * U) / 3, t.top + t.height - (2 * F) / 3)),
        (this.topLeftBorderStroke =
          n > 0 || i > 0
            ? aC(
                t.left + U / 2,
                t.top + y / 2,
                n - U / 2,
                i - y / 2,
                Dm.TOP_LEFT,
              )
            : new rC(t.left + U / 2, t.top + y / 2)),
        (this.topRightBorderStroke =
          n > 0 || i > 0
            ? aC(t.left + g, t.top + y / 2, s - Q / 2, a - y / 2, Dm.TOP_RIGHT)
            : new rC(t.left + t.width - Q / 2, t.top + y / 2)),
        (this.bottomRightBorderStroke =
          u > 0 || l > 0
            ? aC(t.left + m, t.top + w, u - Q / 2, l - F / 2, Dm.BOTTOM_RIGHT)
            : new rC(t.left + t.width - Q / 2, t.top + t.height - F / 2)),
        (this.bottomLeftBorderStroke =
          f > 0 || d > 0
            ? aC(
                t.left + U / 2,
                t.top + C,
                f - U / 2,
                d - F / 2,
                Dm.BOTTOM_LEFT,
              )
            : new rC(t.left + U / 2, t.top + t.height - F / 2)),
        (this.topLeftBorderBox =
          n > 0 || i > 0
            ? aC(t.left, t.top, n, i, Dm.TOP_LEFT)
            : new rC(t.left, t.top)),
        (this.topRightBorderBox =
          s > 0 || a > 0
            ? aC(t.left + g, t.top, s, a, Dm.TOP_RIGHT)
            : new rC(t.left + t.width, t.top)),
        (this.bottomRightBorderBox =
          u > 0 || l > 0
            ? aC(t.left + m, t.top + w, u, l, Dm.BOTTOM_RIGHT)
            : new rC(t.left + t.width, t.top + t.height)),
        (this.bottomLeftBorderBox =
          f > 0 || d > 0
            ? aC(t.left, t.top + C, f, d, Dm.BOTTOM_LEFT)
            : new rC(t.left, t.top + t.height)),
        (this.topLeftPaddingBox =
          n > 0 || i > 0
            ? aC(
                t.left + U,
                t.top + y,
                Math.max(0, n - U),
                Math.max(0, i - y),
                Dm.TOP_LEFT,
              )
            : new rC(t.left + U, t.top + y)),
        (this.topRightPaddingBox =
          s > 0 || a > 0
            ? aC(
                t.left + Math.min(g, t.width - Q),
                t.top + y,
                g > t.width + Q ? 0 : Math.max(0, s - Q),
                Math.max(0, a - y),
                Dm.TOP_RIGHT,
              )
            : new rC(t.left + t.width - Q, t.top + y)),
        (this.bottomRightPaddingBox =
          u > 0 || l > 0
            ? aC(
                t.left + Math.min(m, t.width - U),
                t.top + Math.min(w, t.height - F),
                Math.max(0, u - Q),
                Math.max(0, l - F),
                Dm.BOTTOM_RIGHT,
              )
            : new rC(t.left + t.width - Q, t.top + t.height - F)),
        (this.bottomLeftPaddingBox =
          f > 0 || d > 0
            ? aC(
                t.left + U,
                t.top + Math.min(C, t.height - F),
                Math.max(0, f - U),
                Math.max(0, d - F),
                Dm.BOTTOM_LEFT,
              )
            : new rC(t.left + U, t.top + t.height - F)),
        (this.topLeftContentBox =
          n > 0 || i > 0
            ? aC(
                t.left + U + H,
                t.top + y + v,
                Math.max(0, n - (U + H)),
                Math.max(0, i - (y + v)),
                Dm.TOP_LEFT,
              )
            : new rC(t.left + U + H, t.top + y + v)),
        (this.topRightContentBox =
          s > 0 || a > 0
            ? aC(
                t.left + Math.min(g, t.width + U + H),
                t.top + y + v,
                g > t.width + U + H ? 0 : s - U + H,
                a - (y + v),
                Dm.TOP_RIGHT,
              )
            : new rC(t.left + t.width - (Q + b), t.top + y + v)),
        (this.bottomRightContentBox =
          u > 0 || l > 0
            ? aC(
                t.left + Math.min(m, t.width - (U + H)),
                t.top + Math.min(w, t.height + y + v),
                Math.max(0, u - (Q + b)),
                l - (F + E),
                Dm.BOTTOM_RIGHT,
              )
            : new rC(t.left + t.width - (Q + b), t.top + t.height - (F + E))),
        (this.bottomLeftContentBox =
          f > 0 || d > 0
            ? aC(
                t.left + U + H,
                t.top + C,
                Math.max(0, f - (U + H)),
                d - (F + E),
                Dm.BOTTOM_LEFT,
              )
            : new rC(t.left + U + H, t.top + t.height - (F + E))))
    }
  })()
;(((xm = Dm || (Dm = {}))[(xm.TOP_LEFT = 0)] = 'TOP_LEFT'),
  (xm[(xm.TOP_RIGHT = 1)] = 'TOP_RIGHT'),
  (xm[(xm.BOTTOM_RIGHT = 2)] = 'BOTTOM_RIGHT'),
  (xm[(xm.BOTTOM_LEFT = 3)] = 'BOTTOM_LEFT'))
var aC = function (A, e, t, r, n) {
    var i = ((Math.sqrt(2) - 1) / 3) * 4,
      o = t * i,
      s = r * i,
      a = A + t,
      c = e + r
    switch (n) {
      case Dm.TOP_LEFT:
        return new iC(
          new rC(A, c),
          new rC(A, c - s),
          new rC(a - o, e),
          new rC(a, e),
        )
      case Dm.TOP_RIGHT:
        return new iC(
          new rC(A, e),
          new rC(A + o, e),
          new rC(a, c - s),
          new rC(a, c),
        )
      case Dm.BOTTOM_RIGHT:
        return new iC(
          new rC(a, e),
          new rC(a, e + s),
          new rC(A + o, c),
          new rC(A, c),
        )
      case Dm.BOTTOM_LEFT:
      default:
        return new iC(
          new rC(a, c),
          new rC(a - o, c),
          new rC(A, e + s),
          new rC(A, e),
        )
    }
  },
  cC = function (A) {
    return [
      A.topLeftBorderBox,
      A.topRightBorderBox,
      A.bottomRightBorderBox,
      A.bottomLeftBorderBox,
    ]
  },
  uC = function (A) {
    return [
      A.topLeftPaddingBox,
      A.topRightPaddingBox,
      A.bottomRightPaddingBox,
      A.bottomLeftPaddingBox,
    ]
  },
  lC = (function () {
    return function (A, e, t) {
      ;((this.offsetX = A),
        (this.offsetY = e),
        (this.matrix = t),
        (this.type = 0),
        (this.target = 6))
    }
  })(),
  hC = (function () {
    return function (A, e) {
      ;((this.path = A), (this.target = e), (this.type = 1))
    }
  })(),
  fC = (function () {
    return function (A) {
      ;((this.opacity = A), (this.type = 2), (this.target = 6))
    }
  })(),
  dC = function (A) {
    return 1 === A.type
  },
  BC = function (A, e) {
    return (
      A.length === e.length &&
      A.some(function (A, t) {
        return A === e[t]
      })
    )
  },
  pC = (function () {
    return function (A) {
      ;((this.element = A),
        (this.inlineLevel = []),
        (this.nonInlineLevel = []),
        (this.negativeZIndex = []),
        (this.zeroOrAutoZIndexOrTransformedOrOpacity = []),
        (this.positiveZIndex = []),
        (this.nonPositionedFloats = []),
        (this.nonPositionedInlineLevel = []))
    }
  })(),
  gC = (function () {
    function A(A, e) {
      if (
        ((this.container = A),
        (this.parent = e),
        (this.effects = []),
        (this.curves = new sC(this.container)),
        this.container.styles.opacity < 1 &&
          this.effects.push(new fC(this.container.styles.opacity)),
        null !== this.container.styles.transform)
      ) {
        var t =
            this.container.bounds.left +
            this.container.styles.transformOrigin[0].number,
          r =
            this.container.bounds.top +
            this.container.styles.transformOrigin[1].number,
          n = this.container.styles.transform
        this.effects.push(new lC(t, r, n))
      }
      if (0 !== this.container.styles.overflowX) {
        var i = cC(this.curves),
          o = uC(this.curves)
        BC(i, o)
          ? this.effects.push(new hC(i, 6))
          : (this.effects.push(new hC(i, 2)), this.effects.push(new hC(o, 4)))
      }
    }
    return (
      (A.prototype.getEffects = function (A) {
        for (
          var e = -1 === [2, 3].indexOf(this.container.styles.position),
            t = this.parent,
            r = this.effects.slice(0);
          t;

        ) {
          var n = t.effects.filter(function (A) {
            return !dC(A)
          })
          if (e || 0 !== t.container.styles.position || !t.parent) {
            if (
              (r.unshift.apply(r, n),
              (e = -1 === [2, 3].indexOf(t.container.styles.position)),
              0 !== t.container.styles.overflowX)
            ) {
              var i = cC(t.curves),
                o = uC(t.curves)
              BC(i, o) || r.unshift(new hC(o, 6))
            }
          } else r.unshift.apply(r, n)
          t = t.parent
        }
        return r.filter(function (e) {
          return Dg(e.target, A)
        })
      }),
      A
    )
  })(),
  wC = function (A, e, t, r) {
    A.container.elements.forEach(function (n) {
      var i = Dg(n.flags, 4),
        o = Dg(n.flags, 2),
        s = new gC(n, A)
      Dg(n.styles.display, 2048) && r.push(s)
      var a = Dg(n.flags, 8) ? [] : r
      if (i || o) {
        var c = i || n.styles.isPositioned() ? t : e,
          u = new pC(s)
        if (
          n.styles.isPositioned() ||
          n.styles.opacity < 1 ||
          n.styles.isTransformed()
        ) {
          var l = n.styles.zIndex.order
          if (l < 0) {
            var h = 0
            ;(c.negativeZIndex.some(function (A, e) {
              return l > A.element.container.styles.zIndex.order
                ? ((h = e), !1)
                : h > 0
            }),
              c.negativeZIndex.splice(h, 0, u))
          } else if (l > 0) {
            var f = 0
            ;(c.positiveZIndex.some(function (A, e) {
              return l >= A.element.container.styles.zIndex.order
                ? ((f = e + 1), !1)
                : f > 0
            }),
              c.positiveZIndex.splice(f, 0, u))
          } else c.zeroOrAutoZIndexOrTransformedOrOpacity.push(u)
        } else
          n.styles.isFloating()
            ? c.nonPositionedFloats.push(u)
            : c.nonPositionedInlineLevel.push(u)
        wC(s, u, i ? u : t, a)
      } else
        (n.styles.isInlineLevel()
          ? e.inlineLevel.push(s)
          : e.nonInlineLevel.push(s),
          wC(s, e, t, a))
      Dg(n.flags, 8) && mC(n, a)
    })
  },
  mC = function (A, e) {
    for (
      var t = A instanceof kw ? A.start : 1,
        r = A instanceof kw && A.reversed,
        n = 0;
      n < e.length;
      n++
    ) {
      var i = e[n]
      ;(i.container instanceof xw &&
        'number' == typeof i.container.value &&
        0 !== i.container.value &&
        (t = i.container.value),
        (i.listValue = Hm(t, i.container.styles.listStyleType, !0)),
        (t += r ? -1 : 1))
    }
  },
  CC = function (A, e) {
    switch (e) {
      case 0:
        return QC(
          A.topLeftBorderBox,
          A.topLeftPaddingBox,
          A.topRightBorderBox,
          A.topRightPaddingBox,
        )
      case 1:
        return QC(
          A.topRightBorderBox,
          A.topRightPaddingBox,
          A.bottomRightBorderBox,
          A.bottomRightPaddingBox,
        )
      case 2:
        return QC(
          A.bottomRightBorderBox,
          A.bottomRightPaddingBox,
          A.bottomLeftBorderBox,
          A.bottomLeftPaddingBox,
        )
      default:
        return QC(
          A.bottomLeftBorderBox,
          A.bottomLeftPaddingBox,
          A.topLeftBorderBox,
          A.topLeftPaddingBox,
        )
    }
  },
  yC = function (A, e) {
    var t = []
    return (
      oC(A) ? t.push(A.subdivide(0.5, !1)) : t.push(A),
      oC(e) ? t.push(e.subdivide(0.5, !0)) : t.push(e),
      t
    )
  },
  QC = function (A, e, t, r) {
    var n = []
    return (
      oC(A) ? n.push(A.subdivide(0.5, !1)) : n.push(A),
      oC(t) ? n.push(t.subdivide(0.5, !0)) : n.push(t),
      oC(r) ? n.push(r.subdivide(0.5, !0).reverse()) : n.push(r),
      oC(e) ? n.push(e.subdivide(0.5, !1).reverse()) : n.push(e),
      n
    )
  },
  FC = function (A) {
    var e = A.bounds,
      t = A.styles
    return e.add(
      t.borderLeftWidth,
      t.borderTopWidth,
      -(t.borderRightWidth + t.borderLeftWidth),
      -(t.borderTopWidth + t.borderBottomWidth),
    )
  },
  UC = function (A) {
    var e = A.styles,
      t = A.bounds,
      r = UB(e.paddingLeft, t.width),
      n = UB(e.paddingRight, t.width),
      i = UB(e.paddingTop, t.width),
      o = UB(e.paddingBottom, t.width)
    return t.add(
      r + e.borderLeftWidth,
      i + e.borderTopWidth,
      -(e.borderRightWidth + e.borderLeftWidth + r + n),
      -(e.borderTopWidth + e.borderBottomWidth + i + o),
    )
  },
  vC = function (A, e, t) {
    var r,
      n,
      i =
        ((r = _C(A.styles.backgroundOrigin, e)),
        (n = A),
        0 === r ? n.bounds : 2 === r ? UC(n) : FC(n)),
      o = (function (A, e) {
        return 0 === A ? e.bounds : 2 === A ? UC(e) : FC(e)
      })(_C(A.styles.backgroundClip, e), A),
      s = HC(_C(A.styles.backgroundSize, e), t, i),
      a = s[0],
      c = s[1],
      u = FB(_C(A.styles.backgroundPosition, e), i.width - a, i.height - c)
    return [
      IC(_C(A.styles.backgroundRepeat, e), u, s, i, o),
      Math.round(i.left + u[0]),
      Math.round(i.top + u[1]),
      a,
      c,
    ]
  },
  bC = function (A) {
    return uB(A) && A.value === op.AUTO
  },
  EC = function (A) {
    return 'number' == typeof A
  },
  HC = function (A, e, t) {
    var r = e[0],
      n = e[1],
      i = e[2],
      o = A[0],
      s = A[1]
    if (!o) return [0, 0]
    if (wB(o) && s && wB(s)) return [UB(o, t.width), UB(s, t.height)]
    var a = EC(i)
    if (uB(o) && (o.value === op.CONTAIN || o.value === op.COVER))
      return EC(i)
        ? t.width / t.height < i != (o.value === op.COVER)
          ? [t.width, t.width / i]
          : [t.height * i, t.height]
        : [t.width, t.height]
    var c = EC(r),
      u = EC(n),
      l = c || u
    if (bC(o) && (!s || bC(s)))
      return c && u
        ? [r, n]
        : a || l
          ? l && a
            ? [c ? r : n * i, u ? n : r / i]
            : [c ? r : t.width, u ? n : t.height]
          : [t.width, t.height]
    if (a) {
      var h = 0,
        f = 0
      return (
        wB(o) ? (h = UB(o, t.width)) : wB(s) && (f = UB(s, t.height)),
        bC(o) ? (h = f * i) : (s && !bC(s)) || (f = h / i),
        [h, f]
      )
    }
    var d = null,
      B = null
    if (
      (wB(o) ? (d = UB(o, t.width)) : s && wB(s) && (B = UB(s, t.height)),
      null === d || (s && !bC(s)) || (B = c && u ? (d / r) * n : t.height),
      null !== B && bC(o) && (d = c && u ? (B / n) * r : t.width),
      null !== d && null !== B)
    )
      return [d, B]
    throw new Error('Unable to calculate background-size for element')
  },
  _C = function (A, e) {
    var t = A[e]
    return void 0 === t ? A[0] : t
  },
  IC = function (A, e, t, r, n) {
    var i = e[0],
      o = e[1],
      s = t[0],
      a = t[1]
    switch (A) {
      case 2:
        return [
          new rC(Math.round(r.left), Math.round(r.top + o)),
          new rC(Math.round(r.left + r.width), Math.round(r.top + o)),
          new rC(Math.round(r.left + r.width), Math.round(a + r.top + o)),
          new rC(Math.round(r.left), Math.round(a + r.top + o)),
        ]
      case 3:
        return [
          new rC(Math.round(r.left + i), Math.round(r.top)),
          new rC(Math.round(r.left + i + s), Math.round(r.top)),
          new rC(Math.round(r.left + i + s), Math.round(r.height + r.top)),
          new rC(Math.round(r.left + i), Math.round(r.height + r.top)),
        ]
      case 1:
        return [
          new rC(Math.round(r.left + i), Math.round(r.top + o)),
          new rC(Math.round(r.left + i + s), Math.round(r.top + o)),
          new rC(Math.round(r.left + i + s), Math.round(r.top + o + a)),
          new rC(Math.round(r.left + i), Math.round(r.top + o + a)),
        ]
      default:
        return [
          new rC(Math.round(n.left), Math.round(n.top)),
          new rC(Math.round(n.left + n.width), Math.round(n.top)),
          new rC(Math.round(n.left + n.width), Math.round(n.height + n.top)),
          new rC(Math.round(n.left), Math.round(n.height + n.top)),
        ]
    }
  },
  DC = 'Hidden Text',
  xC = (function () {
    function A(A) {
      ;((this._data = {}), (this._document = A))
    }
    return (
      (A.prototype.parseMetrics = function (A, e) {
        var t = this._document.createElement('div'),
          r = this._document.createElement('img'),
          n = this._document.createElement('span'),
          i = this._document.body
        ;((t.style.visibility = 'hidden'),
          (t.style.fontFamily = A),
          (t.style.fontSize = e),
          (t.style.margin = '0'),
          (t.style.padding = '0'),
          (t.style.whiteSpace = 'nowrap'),
          i.appendChild(t),
          (r.src =
            'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),
          (r.width = 1),
          (r.height = 1),
          (r.style.margin = '0'),
          (r.style.padding = '0'),
          (r.style.verticalAlign = 'baseline'),
          (n.style.fontFamily = A),
          (n.style.fontSize = e),
          (n.style.margin = '0'),
          (n.style.padding = '0'),
          n.appendChild(this._document.createTextNode(DC)),
          t.appendChild(n),
          t.appendChild(r))
        var o = r.offsetTop - n.offsetTop + 2
        ;(t.removeChild(n),
          t.appendChild(this._document.createTextNode(DC)),
          (t.style.lineHeight = 'normal'),
          (r.style.verticalAlign = 'super'))
        var s = r.offsetTop - t.offsetTop + 2
        return (i.removeChild(t), { baseline: o, middle: s })
      }),
      (A.prototype.getMetrics = function (A, e) {
        var t = A + ' ' + e
        return (
          void 0 === this._data[t] && (this._data[t] = this.parseMetrics(A, e)),
          this._data[t]
        )
      }),
      A
    )
  })(),
  kC = (function () {
    return function (A, e) {
      ;((this.context = A), (this.options = e))
    }
  })(),
  LC = (function (A) {
    function e(e, t) {
      var r = A.call(this, e, t) || this
      return (
        (r._activeEffects = []),
        (r.canvas = t.canvas ? t.canvas : document.createElement('canvas')),
        (r.ctx = r.canvas.getContext('2d')),
        t.canvas ||
          ((r.canvas.width = Math.floor(t.width * t.scale)),
          (r.canvas.height = Math.floor(t.height * t.scale)),
          (r.canvas.style.width = t.width + 'px'),
          (r.canvas.style.height = t.height + 'px')),
        (r.fontMetrics = new xC(document)),
        r.ctx.scale(r.options.scale, r.options.scale),
        r.ctx.translate(-t.x, -t.y),
        (r.ctx.textBaseline = 'bottom'),
        (r._activeEffects = []),
        r.context.logger.debug(
          'Canvas renderer initialized (' +
            t.width +
            'x' +
            t.height +
            ') with scale ' +
            t.scale,
        ),
        r
      )
    }
    return (
      ff(e, A),
      (e.prototype.applyEffects = function (A) {
        for (var e = this; this._activeEffects.length; ) this.popEffect()
        A.forEach(function (A) {
          return e.applyEffect(A)
        })
      }),
      (e.prototype.applyEffect = function (A) {
        ;(this.ctx.save(),
          (function (A) {
            return 2 === A.type
          })(A) && (this.ctx.globalAlpha = A.opacity),
          (function (A) {
            return 0 === A.type
          })(A) &&
            (this.ctx.translate(A.offsetX, A.offsetY),
            this.ctx.transform(
              A.matrix[0],
              A.matrix[1],
              A.matrix[2],
              A.matrix[3],
              A.matrix[4],
              A.matrix[5],
            ),
            this.ctx.translate(-A.offsetX, -A.offsetY)),
          dC(A) && (this.path(A.path), this.ctx.clip()),
          this._activeEffects.push(A))
      }),
      (e.prototype.popEffect = function () {
        ;(this._activeEffects.pop(), this.ctx.restore())
      }),
      (e.prototype.renderStack = function (A) {
        return Bf(this, 0, void 0, function () {
          return pf(this, function (e) {
            switch (e.label) {
              case 0:
                return A.element.container.styles.isVisible()
                  ? [4, this.renderStackContent(A)]
                  : [3, 2]
              case 1:
                ;(e.sent(), (e.label = 2))
              case 2:
                return [2]
            }
          })
        })
      }),
      (e.prototype.renderNode = function (A) {
        return Bf(this, 0, void 0, function () {
          return pf(this, function (e) {
            switch (e.label) {
              case 0:
                return (
                  Dg(A.container.flags, 16),
                  A.container.styles.isVisible()
                    ? [4, this.renderNodeBackgroundAndBorders(A)]
                    : [3, 3]
                )
              case 1:
                return (e.sent(), [4, this.renderNodeContent(A)])
              case 2:
                ;(e.sent(), (e.label = 3))
              case 3:
                return [2]
            }
          })
        })
      }),
      (e.prototype.renderTextWithLetterSpacing = function (A, e, t) {
        var r = this
        0 === e
          ? this.ctx.fillText(A.text, A.bounds.left, A.bounds.top + t)
          : yw(A.text).reduce(function (e, n) {
              return (
                r.ctx.fillText(n, e, A.bounds.top + t),
                e + r.ctx.measureText(n).width
              )
            }, A.bounds.left)
      }),
      (e.prototype.createFontStyle = function (A) {
        var e = A.fontVariant
            .filter(function (A) {
              return 'normal' === A || 'small-caps' === A
            })
            .join(''),
          t = MC(A.fontFamily).join(', '),
          r = aB(A.fontSize)
            ? '' + A.fontSize.number + A.fontSize.unit
            : A.fontSize.number + 'px'
        return [[A.fontStyle, e, A.fontWeight, r, t].join(' '), t, r]
      }),
      (e.prototype.renderTextNode = function (A, e) {
        return Bf(this, 0, void 0, function () {
          var t,
            r,
            n,
            i,
            o,
            s,
            a,
            c,
            u = this
          return pf(this, function (l) {
            return (
              (t = this.createFontStyle(e)),
              (r = t[0]),
              (n = t[1]),
              (i = t[2]),
              (this.ctx.font = r),
              (this.ctx.direction = 1 === e.direction ? 'rtl' : 'ltr'),
              (this.ctx.textAlign = 'left'),
              (this.ctx.textBaseline = 'alphabetic'),
              (o = this.fontMetrics.getMetrics(n, i)),
              (s = o.baseline),
              (a = o.middle),
              (c = e.paintOrder),
              A.textBounds.forEach(function (A) {
                c.forEach(function (t) {
                  switch (t) {
                    case 0:
                      ;((u.ctx.fillStyle = kB(e.color)),
                        u.renderTextWithLetterSpacing(A, e.letterSpacing, s))
                      var r = e.textShadow
                      ;(r.length &&
                        A.text.trim().length &&
                        (r
                          .slice(0)
                          .reverse()
                          .forEach(function (t) {
                            ;((u.ctx.shadowColor = kB(t.color)),
                              (u.ctx.shadowOffsetX =
                                t.offsetX.number * u.options.scale),
                              (u.ctx.shadowOffsetY =
                                t.offsetY.number * u.options.scale),
                              (u.ctx.shadowBlur = t.blur.number),
                              u.renderTextWithLetterSpacing(
                                A,
                                e.letterSpacing,
                                s,
                              ))
                          }),
                        (u.ctx.shadowColor = ''),
                        (u.ctx.shadowOffsetX = 0),
                        (u.ctx.shadowOffsetY = 0),
                        (u.ctx.shadowBlur = 0)),
                        e.textDecorationLine.length &&
                          ((u.ctx.fillStyle = kB(
                            e.textDecorationColor || e.color,
                          )),
                          e.textDecorationLine.forEach(function (e) {
                            switch (e) {
                              case 1:
                                u.ctx.fillRect(
                                  A.bounds.left,
                                  Math.round(A.bounds.top + s),
                                  A.bounds.width,
                                  1,
                                )
                                break
                              case 2:
                                u.ctx.fillRect(
                                  A.bounds.left,
                                  Math.round(A.bounds.top),
                                  A.bounds.width,
                                  1,
                                )
                                break
                              case 3:
                                u.ctx.fillRect(
                                  A.bounds.left,
                                  Math.ceil(A.bounds.top + a),
                                  A.bounds.width,
                                  1,
                                )
                            }
                          })))
                      break
                    case 1:
                      ;(e.webkitTextStrokeWidth &&
                        A.text.trim().length &&
                        ((u.ctx.strokeStyle = kB(e.webkitTextStrokeColor)),
                        (u.ctx.lineWidth = e.webkitTextStrokeWidth),
                        (u.ctx.lineJoin = window.chrome ? 'miter' : 'round'),
                        u.ctx.strokeText(
                          A.text,
                          A.bounds.left,
                          A.bounds.top + s,
                        )),
                        (u.ctx.strokeStyle = ''),
                        (u.ctx.lineWidth = 0),
                        (u.ctx.lineJoin = 'miter'))
                  }
                })
              }),
              [2]
            )
          })
        })
      }),
      (e.prototype.renderReplacedElement = function (A, e, t) {
        if (t && A.intrinsicWidth > 0 && A.intrinsicHeight > 0) {
          var r = UC(A),
            n = uC(e)
          ;(this.path(n),
            this.ctx.save(),
            this.ctx.clip(),
            this.ctx.drawImage(
              t,
              0,
              0,
              A.intrinsicWidth,
              A.intrinsicHeight,
              r.left,
              r.top,
              r.width,
              r.height,
            ),
            this.ctx.restore())
        }
      }),
      (e.prototype.renderNodeContent = function (A) {
        return Bf(this, 0, void 0, function () {
          var t, r, n, i, o, s, a, c, u, l, h, f, d, B, p, g, w, m
          return pf(this, function (C) {
            switch (C.label) {
              case 0:
                ;(this.applyEffects(A.getEffects(4)),
                  (t = A.container),
                  (r = A.curves),
                  (n = t.styles),
                  (i = 0),
                  (o = t.textNodes),
                  (C.label = 1))
              case 1:
                return i < o.length
                  ? ((s = o[i]), [4, this.renderTextNode(s, n)])
                  : [3, 4]
              case 2:
                ;(C.sent(), (C.label = 3))
              case 3:
                return (i++, [3, 1])
              case 4:
                if (!(t instanceof _w)) return [3, 8]
                C.label = 5
              case 5:
                return (
                  C.trys.push([5, 7, , 8]),
                  [4, this.context.cache.match(t.src)]
                )
              case 6:
                return (
                  (p = C.sent()),
                  this.renderReplacedElement(t, r, p),
                  [3, 8]
                )
              case 7:
                return (
                  C.sent(),
                  this.context.logger.error('Error loading image ' + t.src),
                  [3, 8]
                )
              case 8:
                if (
                  (t instanceof Iw &&
                    this.renderReplacedElement(t, r, t.canvas),
                  !(t instanceof Dw))
                )
                  return [3, 12]
                C.label = 9
              case 9:
                return (
                  C.trys.push([9, 11, , 12]),
                  [4, this.context.cache.match(t.svg)]
                )
              case 10:
                return (
                  (p = C.sent()),
                  this.renderReplacedElement(t, r, p),
                  [3, 12]
                )
              case 11:
                return (
                  C.sent(),
                  this.context.logger.error(
                    'Error loading svg ' + t.svg.substring(0, 255),
                  ),
                  [3, 12]
                )
              case 12:
                return t instanceof Vw && t.tree
                  ? [
                      4,
                      new e(this.context, {
                        scale: this.options.scale,
                        backgroundColor: t.backgroundColor,
                        x: 0,
                        y: 0,
                        width: t.width,
                        height: t.height,
                      }).render(t.tree),
                    ]
                  : [3, 14]
              case 13:
                ;((a = C.sent()),
                  t.width &&
                    t.height &&
                    this.ctx.drawImage(
                      a,
                      0,
                      0,
                      t.width,
                      t.height,
                      t.bounds.left,
                      t.bounds.top,
                      t.bounds.width,
                      t.bounds.height,
                    ),
                  (C.label = 14))
              case 14:
                if (
                  (t instanceof Rw &&
                    ((c = Math.min(t.bounds.width, t.bounds.height)),
                    t.type === Ow
                      ? t.checked &&
                        (this.ctx.save(),
                        this.path([
                          new rC(
                            t.bounds.left + 0.39363 * c,
                            t.bounds.top + 0.79 * c,
                          ),
                          new rC(
                            t.bounds.left + 0.16 * c,
                            t.bounds.top + 0.5549 * c,
                          ),
                          new rC(
                            t.bounds.left + 0.27347 * c,
                            t.bounds.top + 0.44071 * c,
                          ),
                          new rC(
                            t.bounds.left + 0.39694 * c,
                            t.bounds.top + 0.5649 * c,
                          ),
                          new rC(
                            t.bounds.left + 0.72983 * c,
                            t.bounds.top + 0.23 * c,
                          ),
                          new rC(
                            t.bounds.left + 0.84 * c,
                            t.bounds.top + 0.34085 * c,
                          ),
                          new rC(
                            t.bounds.left + 0.39363 * c,
                            t.bounds.top + 0.79 * c,
                          ),
                        ]),
                        (this.ctx.fillStyle = kB(Mw)),
                        this.ctx.fill(),
                        this.ctx.restore())
                      : t.type === Kw &&
                        t.checked &&
                        (this.ctx.save(),
                        this.ctx.beginPath(),
                        this.ctx.arc(
                          t.bounds.left + c / 2,
                          t.bounds.top + c / 2,
                          c / 4,
                          0,
                          2 * Math.PI,
                          !0,
                        ),
                        (this.ctx.fillStyle = kB(Mw)),
                        this.ctx.fill(),
                        this.ctx.restore())),
                  SC(t) && t.value.length)
                ) {
                  switch (
                    ((u = this.createFontStyle(n)),
                    (w = u[0]),
                    (l = u[1]),
                    (h = this.fontMetrics.getMetrics(w, l).baseline),
                    (this.ctx.font = w),
                    (this.ctx.fillStyle = kB(n.color)),
                    (this.ctx.textBaseline = 'alphabetic'),
                    (this.ctx.textAlign = KC(t.styles.textAlign)),
                    (m = UC(t)),
                    (f = 0),
                    t.styles.textAlign)
                  ) {
                    case 1:
                      f += m.width / 2
                      break
                    case 2:
                      f += m.width
                  }
                  ;((d = m.add(f, 0, 0, -m.height / 2 + 1)),
                    this.ctx.save(),
                    this.path([
                      new rC(m.left, m.top),
                      new rC(m.left + m.width, m.top),
                      new rC(m.left + m.width, m.top + m.height),
                      new rC(m.left, m.top + m.height),
                    ]),
                    this.ctx.clip(),
                    this.renderTextWithLetterSpacing(
                      new ww(t.value, d),
                      n.letterSpacing,
                      h,
                    ),
                    this.ctx.restore(),
                    (this.ctx.textBaseline = 'alphabetic'),
                    (this.ctx.textAlign = 'left'))
                }
                if (!Dg(t.styles.display, 2048)) return [3, 20]
                if (null === t.styles.listStyleImage) return [3, 19]
                if (0 !== (B = t.styles.listStyleImage).type) return [3, 18]
                ;((p = void 0), (g = B.url), (C.label = 15))
              case 15:
                return (
                  C.trys.push([15, 17, , 18]),
                  [4, this.context.cache.match(g)]
                )
              case 16:
                return (
                  (p = C.sent()),
                  this.ctx.drawImage(
                    p,
                    t.bounds.left - (p.width + 10),
                    t.bounds.top,
                  ),
                  [3, 18]
                )
              case 17:
                return (
                  C.sent(),
                  this.context.logger.error(
                    'Error loading list-style-image ' + g,
                  ),
                  [3, 18]
                )
              case 18:
                return [3, 20]
              case 19:
                ;(A.listValue &&
                  -1 !== t.styles.listStyleType &&
                  ((w = this.createFontStyle(n)[0]),
                  (this.ctx.font = w),
                  (this.ctx.fillStyle = kB(n.color)),
                  (this.ctx.textBaseline = 'middle'),
                  (this.ctx.textAlign = 'right'),
                  (m = new gf(
                    t.bounds.left,
                    t.bounds.top + UB(t.styles.paddingTop, t.bounds.width),
                    t.bounds.width,
                    qp(n.lineHeight, n.fontSize.number) / 2 + 1,
                  )),
                  this.renderTextWithLetterSpacing(
                    new ww(A.listValue, m),
                    n.letterSpacing,
                    qp(n.lineHeight, n.fontSize.number) / 2 + 2,
                  ),
                  (this.ctx.textBaseline = 'bottom'),
                  (this.ctx.textAlign = 'left')),
                  (C.label = 20))
              case 20:
                return [2]
            }
          })
        })
      }),
      (e.prototype.renderStackContent = function (A) {
        return Bf(this, 0, void 0, function () {
          var e, t, r, n, i, o, s, a, c, u, l, h, f, d, B
          return pf(this, function (p) {
            switch (p.label) {
              case 0:
                return (
                  Dg(A.element.container.flags, 16),
                  [4, this.renderNodeBackgroundAndBorders(A.element)]
                )
              case 1:
                ;(p.sent(), (e = 0), (t = A.negativeZIndex), (p.label = 2))
              case 2:
                return e < t.length
                  ? ((B = t[e]), [4, this.renderStack(B)])
                  : [3, 5]
              case 3:
                ;(p.sent(), (p.label = 4))
              case 4:
                return (e++, [3, 2])
              case 5:
                return [4, this.renderNodeContent(A.element)]
              case 6:
                ;(p.sent(), (r = 0), (n = A.nonInlineLevel), (p.label = 7))
              case 7:
                return r < n.length
                  ? ((B = n[r]), [4, this.renderNode(B)])
                  : [3, 10]
              case 8:
                ;(p.sent(), (p.label = 9))
              case 9:
                return (r++, [3, 7])
              case 10:
                ;((i = 0), (o = A.nonPositionedFloats), (p.label = 11))
              case 11:
                return i < o.length
                  ? ((B = o[i]), [4, this.renderStack(B)])
                  : [3, 14]
              case 12:
                ;(p.sent(), (p.label = 13))
              case 13:
                return (i++, [3, 11])
              case 14:
                ;((s = 0), (a = A.nonPositionedInlineLevel), (p.label = 15))
              case 15:
                return s < a.length
                  ? ((B = a[s]), [4, this.renderStack(B)])
                  : [3, 18]
              case 16:
                ;(p.sent(), (p.label = 17))
              case 17:
                return (s++, [3, 15])
              case 18:
                ;((c = 0), (u = A.inlineLevel), (p.label = 19))
              case 19:
                return c < u.length
                  ? ((B = u[c]), [4, this.renderNode(B)])
                  : [3, 22]
              case 20:
                ;(p.sent(), (p.label = 21))
              case 21:
                return (c++, [3, 19])
              case 22:
                ;((l = 0),
                  (h = A.zeroOrAutoZIndexOrTransformedOrOpacity),
                  (p.label = 23))
              case 23:
                return l < h.length
                  ? ((B = h[l]), [4, this.renderStack(B)])
                  : [3, 26]
              case 24:
                ;(p.sent(), (p.label = 25))
              case 25:
                return (l++, [3, 23])
              case 26:
                ;((f = 0), (d = A.positiveZIndex), (p.label = 27))
              case 27:
                return f < d.length
                  ? ((B = d[f]), [4, this.renderStack(B)])
                  : [3, 30]
              case 28:
                ;(p.sent(), (p.label = 29))
              case 29:
                return (f++, [3, 27])
              case 30:
                return [2]
            }
          })
        })
      }),
      (e.prototype.mask = function (A) {
        ;(this.ctx.beginPath(),
          this.ctx.moveTo(0, 0),
          this.ctx.lineTo(this.canvas.width, 0),
          this.ctx.lineTo(this.canvas.width, this.canvas.height),
          this.ctx.lineTo(0, this.canvas.height),
          this.ctx.lineTo(0, 0),
          this.formatPath(A.slice(0).reverse()),
          this.ctx.closePath())
      }),
      (e.prototype.path = function (A) {
        ;(this.ctx.beginPath(), this.formatPath(A), this.ctx.closePath())
      }),
      (e.prototype.formatPath = function (A) {
        var e = this
        A.forEach(function (A, t) {
          var r = oC(A) ? A.start : A
          ;(0 === t ? e.ctx.moveTo(r.x, r.y) : e.ctx.lineTo(r.x, r.y),
            oC(A) &&
              e.ctx.bezierCurveTo(
                A.startControl.x,
                A.startControl.y,
                A.endControl.x,
                A.endControl.y,
                A.end.x,
                A.end.y,
              ))
        })
      }),
      (e.prototype.renderRepeat = function (A, e, t, r) {
        ;(this.path(A),
          (this.ctx.fillStyle = e),
          this.ctx.translate(t, r),
          this.ctx.fill(),
          this.ctx.translate(-t, -r))
      }),
      (e.prototype.resizeImage = function (A, e, t) {
        var r
        if (A.width === e && A.height === t) return A
        var n = (
          null !== (r = this.canvas.ownerDocument) && void 0 !== r
            ? r
            : document
        ).createElement('canvas')
        return (
          (n.width = Math.max(1, e)),
          (n.height = Math.max(1, t)),
          n.getContext('2d').drawImage(A, 0, 0, A.width, A.height, 0, 0, e, t),
          n
        )
      }),
      (e.prototype.renderBackgroundImage = function (A) {
        return Bf(this, 0, void 0, function () {
          var e, t, r, n, i, o
          return pf(this, function (s) {
            switch (s.label) {
              case 0:
                ;((e = A.styles.backgroundImage.length - 1),
                  (t = function (t) {
                    var n,
                      i,
                      o,
                      s,
                      a,
                      c,
                      u,
                      l,
                      h,
                      f,
                      d,
                      B,
                      p,
                      g,
                      w,
                      m,
                      C,
                      y,
                      Q,
                      F,
                      U,
                      v,
                      b,
                      E,
                      H,
                      _,
                      I,
                      D,
                      x,
                      k,
                      L
                    return pf(this, function (S) {
                      switch (S.label) {
                        case 0:
                          if (0 !== t.type) return [3, 5]
                          ;((n = void 0), (i = t.url), (S.label = 1))
                        case 1:
                          return (
                            S.trys.push([1, 3, , 4]),
                            [4, r.context.cache.match(i)]
                          )
                        case 2:
                          return ((n = S.sent()), [3, 4])
                        case 3:
                          return (
                            S.sent(),
                            r.context.logger.error(
                              'Error loading background-image ' + i,
                            ),
                            [3, 4]
                          )
                        case 4:
                          return (
                            n &&
                              ((o = vC(A, e, [
                                n.width,
                                n.height,
                                n.width / n.height,
                              ])),
                              (m = o[0]),
                              (v = o[1]),
                              (b = o[2]),
                              (Q = o[3]),
                              (F = o[4]),
                              (g = r.ctx.createPattern(
                                r.resizeImage(n, Q, F),
                                'repeat',
                              )),
                              r.renderRepeat(m, g, v, b)),
                            [3, 6]
                          )
                        case 5:
                          ;(1 === t.type
                            ? ((s = vC(A, e, [null, null, null])),
                              (m = s[0]),
                              (v = s[1]),
                              (b = s[2]),
                              (Q = s[3]),
                              (F = s[4]),
                              (a = jB(t.angle, Q, F)),
                              (c = a[0]),
                              (u = a[1]),
                              (l = a[2]),
                              (h = a[3]),
                              (f = a[4]),
                              ((d = document.createElement('canvas')).width =
                                Q),
                              (d.height = F),
                              (B = d.getContext('2d')),
                              (p = B.createLinearGradient(u, h, l, f)),
                              zB(t.stops, c).forEach(function (A) {
                                return p.addColorStop(A.stop, kB(A.color))
                              }),
                              (B.fillStyle = p),
                              B.fillRect(0, 0, Q, F),
                              Q > 0 &&
                                F > 0 &&
                                ((g = r.ctx.createPattern(d, 'repeat')),
                                r.renderRepeat(m, g, v, b)))
                            : (function (A) {
                                return 2 === A.type
                              })(t) &&
                              ((w = vC(A, e, [null, null, null])),
                              (m = w[0]),
                              (C = w[1]),
                              (y = w[2]),
                              (Q = w[3]),
                              (F = w[4]),
                              (U = 0 === t.position.length ? [yB] : t.position),
                              (v = UB(U[0], Q)),
                              (b = UB(U[U.length - 1], F)),
                              (E = (function (A, e, t, r, n) {
                                var i = 0,
                                  o = 0
                                switch (A.size) {
                                  case 0:
                                    0 === A.shape
                                      ? (i = o =
                                          Math.min(
                                            Math.abs(e),
                                            Math.abs(e - r),
                                            Math.abs(t),
                                            Math.abs(t - n),
                                          ))
                                      : 1 === A.shape &&
                                        ((i = Math.min(
                                          Math.abs(e),
                                          Math.abs(e - r),
                                        )),
                                        (o = Math.min(
                                          Math.abs(t),
                                          Math.abs(t - n),
                                        )))
                                    break
                                  case 2:
                                    if (0 === A.shape)
                                      i = o = Math.min(
                                        WB(e, t),
                                        WB(e, t - n),
                                        WB(e - r, t),
                                        WB(e - r, t - n),
                                      )
                                    else if (1 === A.shape) {
                                      var s =
                                          Math.min(
                                            Math.abs(t),
                                            Math.abs(t - n),
                                          ) /
                                          Math.min(
                                            Math.abs(e),
                                            Math.abs(e - r),
                                          ),
                                        a = qB(r, n, e, t, !0),
                                        c = a[0],
                                        u = a[1]
                                      o = s * (i = WB(c - e, (u - t) / s))
                                    }
                                    break
                                  case 1:
                                    0 === A.shape
                                      ? (i = o =
                                          Math.max(
                                            Math.abs(e),
                                            Math.abs(e - r),
                                            Math.abs(t),
                                            Math.abs(t - n),
                                          ))
                                      : 1 === A.shape &&
                                        ((i = Math.max(
                                          Math.abs(e),
                                          Math.abs(e - r),
                                        )),
                                        (o = Math.max(
                                          Math.abs(t),
                                          Math.abs(t - n),
                                        )))
                                    break
                                  case 3:
                                    if (0 === A.shape)
                                      i = o = Math.max(
                                        WB(e, t),
                                        WB(e, t - n),
                                        WB(e - r, t),
                                        WB(e - r, t - n),
                                      )
                                    else if (1 === A.shape) {
                                      s =
                                        Math.max(Math.abs(t), Math.abs(t - n)) /
                                        Math.max(Math.abs(e), Math.abs(e - r))
                                      var l = qB(r, n, e, t, !1)
                                      ;((c = l[0]),
                                        (u = l[1]),
                                        (o = s * (i = WB(c - e, (u - t) / s))))
                                    }
                                }
                                return (
                                  Array.isArray(A.size) &&
                                    ((i = UB(A.size[0], r)),
                                    (o =
                                      2 === A.size.length
                                        ? UB(A.size[1], n)
                                        : i)),
                                  [i, o]
                                )
                              })(t, v, b, Q, F)),
                              (H = E[0]),
                              (_ = E[1]),
                              H > 0 &&
                                _ > 0 &&
                                ((I = r.ctx.createRadialGradient(
                                  C + v,
                                  y + b,
                                  0,
                                  C + v,
                                  y + b,
                                  H,
                                )),
                                zB(t.stops, 2 * H).forEach(function (A) {
                                  return I.addColorStop(A.stop, kB(A.color))
                                }),
                                r.path(m),
                                (r.ctx.fillStyle = I),
                                H !== _
                                  ? ((D = A.bounds.left + 0.5 * A.bounds.width),
                                    (x = A.bounds.top + 0.5 * A.bounds.height),
                                    (L = 1 / (k = _ / H)),
                                    r.ctx.save(),
                                    r.ctx.translate(D, x),
                                    r.ctx.transform(1, 0, 0, k, 0, 0),
                                    r.ctx.translate(-D, -x),
                                    r.ctx.fillRect(
                                      C,
                                      L * (y - x) + x,
                                      Q,
                                      F * L,
                                    ),
                                    r.ctx.restore())
                                  : r.ctx.fill())),
                            (S.label = 6))
                        case 6:
                          return (e--, [2])
                      }
                    })
                  }),
                  (r = this),
                  (n = 0),
                  (i = A.styles.backgroundImage.slice(0).reverse()),
                  (s.label = 1))
              case 1:
                return n < i.length ? ((o = i[n]), [5, t(o)]) : [3, 4]
              case 2:
                ;(s.sent(), (s.label = 3))
              case 3:
                return (n++, [3, 1])
              case 4:
                return [2]
            }
          })
        })
      }),
      (e.prototype.renderSolidBorder = function (A, e, t) {
        return Bf(this, 0, void 0, function () {
          return pf(this, function (r) {
            return (
              this.path(CC(t, e)),
              (this.ctx.fillStyle = kB(A)),
              this.ctx.fill(),
              [2]
            )
          })
        })
      }),
      (e.prototype.renderDoubleBorder = function (A, e, t, r) {
        return Bf(this, 0, void 0, function () {
          var n, i
          return pf(this, function (o) {
            switch (o.label) {
              case 0:
                return e < 3 ? [4, this.renderSolidBorder(A, t, r)] : [3, 2]
              case 1:
                return (o.sent(), [2])
              case 2:
                return (
                  (n = (function (A, e) {
                    switch (e) {
                      case 0:
                        return QC(
                          A.topLeftBorderBox,
                          A.topLeftBorderDoubleOuterBox,
                          A.topRightBorderBox,
                          A.topRightBorderDoubleOuterBox,
                        )
                      case 1:
                        return QC(
                          A.topRightBorderBox,
                          A.topRightBorderDoubleOuterBox,
                          A.bottomRightBorderBox,
                          A.bottomRightBorderDoubleOuterBox,
                        )
                      case 2:
                        return QC(
                          A.bottomRightBorderBox,
                          A.bottomRightBorderDoubleOuterBox,
                          A.bottomLeftBorderBox,
                          A.bottomLeftBorderDoubleOuterBox,
                        )
                      default:
                        return QC(
                          A.bottomLeftBorderBox,
                          A.bottomLeftBorderDoubleOuterBox,
                          A.topLeftBorderBox,
                          A.topLeftBorderDoubleOuterBox,
                        )
                    }
                  })(r, t)),
                  this.path(n),
                  (this.ctx.fillStyle = kB(A)),
                  this.ctx.fill(),
                  (i = (function (A, e) {
                    switch (e) {
                      case 0:
                        return QC(
                          A.topLeftBorderDoubleInnerBox,
                          A.topLeftPaddingBox,
                          A.topRightBorderDoubleInnerBox,
                          A.topRightPaddingBox,
                        )
                      case 1:
                        return QC(
                          A.topRightBorderDoubleInnerBox,
                          A.topRightPaddingBox,
                          A.bottomRightBorderDoubleInnerBox,
                          A.bottomRightPaddingBox,
                        )
                      case 2:
                        return QC(
                          A.bottomRightBorderDoubleInnerBox,
                          A.bottomRightPaddingBox,
                          A.bottomLeftBorderDoubleInnerBox,
                          A.bottomLeftPaddingBox,
                        )
                      default:
                        return QC(
                          A.bottomLeftBorderDoubleInnerBox,
                          A.bottomLeftPaddingBox,
                          A.topLeftBorderDoubleInnerBox,
                          A.topLeftPaddingBox,
                        )
                    }
                  })(r, t)),
                  this.path(i),
                  this.ctx.fill(),
                  [2]
                )
            }
          })
        })
      }),
      (e.prototype.renderNodeBackgroundAndBorders = function (A) {
        return Bf(this, 0, void 0, function () {
          var e,
            t,
            r,
            n,
            i,
            o,
            s,
            a,
            c = this
          return pf(this, function (u) {
            switch (u.label) {
              case 0:
                return (
                  this.applyEffects(A.getEffects(2)),
                  (e = A.container.styles),
                  (t = !xB(e.backgroundColor) || e.backgroundImage.length),
                  (r = [
                    {
                      style: e.borderTopStyle,
                      color: e.borderTopColor,
                      width: e.borderTopWidth,
                    },
                    {
                      style: e.borderRightStyle,
                      color: e.borderRightColor,
                      width: e.borderRightWidth,
                    },
                    {
                      style: e.borderBottomStyle,
                      color: e.borderBottomColor,
                      width: e.borderBottomWidth,
                    },
                    {
                      style: e.borderLeftStyle,
                      color: e.borderLeftColor,
                      width: e.borderLeftWidth,
                    },
                  ]),
                  (n = OC(_C(e.backgroundClip, 0), A.curves)),
                  t || e.boxShadow.length
                    ? (this.ctx.save(),
                      this.path(n),
                      this.ctx.clip(),
                      xB(e.backgroundColor) ||
                        ((this.ctx.fillStyle = kB(e.backgroundColor)),
                        this.ctx.fill()),
                      [4, this.renderBackgroundImage(A.container)])
                    : [3, 2]
                )
              case 1:
                ;(u.sent(),
                  this.ctx.restore(),
                  e.boxShadow
                    .slice(0)
                    .reverse()
                    .forEach(function (e) {
                      c.ctx.save()
                      var t,
                        r,
                        n,
                        i,
                        o,
                        s = cC(A.curves),
                        a = e.inset ? 0 : 1e4,
                        u =
                          ((t = s),
                          (r = -a + (e.inset ? 1 : -1) * e.spread.number),
                          (n = (e.inset ? 1 : -1) * e.spread.number),
                          (i = e.spread.number * (e.inset ? -2 : 2)),
                          (o = e.spread.number * (e.inset ? -2 : 2)),
                          t.map(function (A, e) {
                            switch (e) {
                              case 0:
                                return A.add(r, n)
                              case 1:
                                return A.add(r + i, n)
                              case 2:
                                return A.add(r + i, n + o)
                              case 3:
                                return A.add(r, n + o)
                            }
                            return A
                          }))
                      ;(e.inset
                        ? (c.path(s), c.ctx.clip(), c.mask(u))
                        : (c.mask(s), c.ctx.clip(), c.path(u)),
                        (c.ctx.shadowOffsetX = e.offsetX.number + a),
                        (c.ctx.shadowOffsetY = e.offsetY.number),
                        (c.ctx.shadowColor = kB(e.color)),
                        (c.ctx.shadowBlur = e.blur.number),
                        (c.ctx.fillStyle = e.inset
                          ? kB(e.color)
                          : 'rgba(0,0,0,1)'),
                        c.ctx.fill(),
                        c.ctx.restore())
                    }),
                  (u.label = 2))
              case 2:
                ;((i = 0), (o = 0), (s = r), (u.label = 3))
              case 3:
                return o < s.length
                  ? 0 !== (a = s[o]).style && !xB(a.color) && a.width > 0
                    ? 2 !== a.style
                      ? [3, 5]
                      : [
                          4,
                          this.renderDashedDottedBorder(
                            a.color,
                            a.width,
                            i,
                            A.curves,
                            2,
                          ),
                        ]
                    : [3, 11]
                  : [3, 13]
              case 4:
                return (u.sent(), [3, 11])
              case 5:
                return 3 !== a.style
                  ? [3, 7]
                  : [
                      4,
                      this.renderDashedDottedBorder(
                        a.color,
                        a.width,
                        i,
                        A.curves,
                        3,
                      ),
                    ]
              case 6:
                return (u.sent(), [3, 11])
              case 7:
                return 4 !== a.style
                  ? [3, 9]
                  : [4, this.renderDoubleBorder(a.color, a.width, i, A.curves)]
              case 8:
                return (u.sent(), [3, 11])
              case 9:
                return [4, this.renderSolidBorder(a.color, i, A.curves)]
              case 10:
                ;(u.sent(), (u.label = 11))
              case 11:
                ;(i++, (u.label = 12))
              case 12:
                return (o++, [3, 3])
              case 13:
                return [2]
            }
          })
        })
      }),
      (e.prototype.renderDashedDottedBorder = function (A, e, t, r, n) {
        return Bf(this, 0, void 0, function () {
          var i, o, s, a, c, u, l, h, f, d, B, p, g, w, m, C
          return pf(this, function (y) {
            return (
              this.ctx.save(),
              (i = (function (A, e) {
                switch (e) {
                  case 0:
                    return yC(A.topLeftBorderStroke, A.topRightBorderStroke)
                  case 1:
                    return yC(A.topRightBorderStroke, A.bottomRightBorderStroke)
                  case 2:
                    return yC(
                      A.bottomRightBorderStroke,
                      A.bottomLeftBorderStroke,
                    )
                  default:
                    return yC(A.bottomLeftBorderStroke, A.topLeftBorderStroke)
                }
              })(r, t)),
              (o = CC(r, t)),
              2 === n && (this.path(o), this.ctx.clip()),
              oC(o[0])
                ? ((s = o[0].start.x), (a = o[0].start.y))
                : ((s = o[0].x), (a = o[0].y)),
              oC(o[1])
                ? ((c = o[1].end.x), (u = o[1].end.y))
                : ((c = o[1].x), (u = o[1].y)),
              (l = 0 === t || 2 === t ? Math.abs(s - c) : Math.abs(a - u)),
              this.ctx.beginPath(),
              3 === n ? this.formatPath(i) : this.formatPath(o.slice(0, 2)),
              (h = e < 3 ? 3 * e : 2 * e),
              (f = e < 3 ? 2 * e : e),
              3 === n && ((h = e), (f = e)),
              (d = !0),
              l <= 2 * h
                ? (d = !1)
                : l <= 2 * h + f
                  ? ((h *= B = l / (2 * h + f)), (f *= B))
                  : ((p = Math.floor((l + f) / (h + f))),
                    (g = (l - p * h) / (p - 1)),
                    (f =
                      (w = (l - (p + 1) * h) / p) <= 0 ||
                      Math.abs(f - g) < Math.abs(f - w)
                        ? g
                        : w)),
              d &&
                (3 === n
                  ? this.ctx.setLineDash([0, h + f])
                  : this.ctx.setLineDash([h, f])),
              3 === n
                ? ((this.ctx.lineCap = 'round'), (this.ctx.lineWidth = e))
                : (this.ctx.lineWidth = 2 * e + 1.1),
              (this.ctx.strokeStyle = kB(A)),
              this.ctx.stroke(),
              this.ctx.setLineDash([]),
              2 === n &&
                (oC(o[0]) &&
                  ((m = o[3]),
                  (C = o[0]),
                  this.ctx.beginPath(),
                  this.formatPath([
                    new rC(m.end.x, m.end.y),
                    new rC(C.start.x, C.start.y),
                  ]),
                  this.ctx.stroke()),
                oC(o[1]) &&
                  ((m = o[1]),
                  (C = o[2]),
                  this.ctx.beginPath(),
                  this.formatPath([
                    new rC(m.end.x, m.end.y),
                    new rC(C.start.x, C.start.y),
                  ]),
                  this.ctx.stroke())),
              this.ctx.restore(),
              [2]
            )
          })
        })
      }),
      (e.prototype.render = function (A) {
        return Bf(this, 0, void 0, function () {
          var e
          return pf(this, function (t) {
            switch (t.label) {
              case 0:
                return (
                  this.options.backgroundColor &&
                    ((this.ctx.fillStyle = kB(this.options.backgroundColor)),
                    this.ctx.fillRect(
                      this.options.x,
                      this.options.y,
                      this.options.width,
                      this.options.height,
                    )),
                  (r = new gC(A, null)),
                  (n = new pC(r)),
                  wC(r, n, n, (i = [])),
                  mC(r.container, i),
                  (e = n),
                  [4, this.renderStack(e)]
                )
              case 1:
                return (t.sent(), this.applyEffects([]), [2, this.canvas])
            }
            var r, n, i
          })
        })
      }),
      e
    )
  })(kC),
  SC = function (A) {
    return (
      A instanceof Pw ||
      A instanceof Nw ||
      (A instanceof Rw && A.type !== Kw && A.type !== Ow)
    )
  },
  OC = function (A, e) {
    switch (A) {
      case 0:
        return cC(e)
      case 2:
        return (function (A) {
          return [
            A.topLeftContentBox,
            A.topRightContentBox,
            A.bottomRightContentBox,
            A.bottomLeftContentBox,
          ]
        })(e)
      default:
        return uC(e)
    }
  },
  KC = function (A) {
    switch (A) {
      case 1:
        return 'center'
      case 2:
        return 'right'
      default:
        return 'left'
    }
  },
  TC = ['-apple-system', 'system-ui'],
  MC = function (A) {
    return /iPhone OS 15_(0|1)/.test(window.navigator.userAgent)
      ? A.filter(function (A) {
          return -1 === TC.indexOf(A)
        })
      : A
  },
  RC = (function (A) {
    function e(e, t) {
      var r = A.call(this, e, t) || this
      return (
        (r.canvas = t.canvas ? t.canvas : document.createElement('canvas')),
        (r.ctx = r.canvas.getContext('2d')),
        (r.options = t),
        (r.canvas.width = Math.floor(t.width * t.scale)),
        (r.canvas.height = Math.floor(t.height * t.scale)),
        (r.canvas.style.width = t.width + 'px'),
        (r.canvas.style.height = t.height + 'px'),
        r.ctx.scale(r.options.scale, r.options.scale),
        r.ctx.translate(-t.x, -t.y),
        r.context.logger.debug(
          'EXPERIMENTAL ForeignObject renderer initialized (' +
            t.width +
            'x' +
            t.height +
            ' at ' +
            t.x +
            ',' +
            t.y +
            ') with scale ' +
            t.scale,
        ),
        r
      )
    }
    return (
      ff(e, A),
      (e.prototype.render = function (A) {
        return Bf(this, 0, void 0, function () {
          var e, t
          return pf(this, function (r) {
            switch (r.label) {
              case 0:
                return (
                  (e = Bw(
                    this.options.width * this.options.scale,
                    this.options.height * this.options.scale,
                    this.options.scale,
                    this.options.scale,
                    A,
                  )),
                  [4, NC(e)]
                )
              case 1:
                return (
                  (t = r.sent()),
                  this.options.backgroundColor &&
                    ((this.ctx.fillStyle = kB(this.options.backgroundColor)),
                    this.ctx.fillRect(
                      0,
                      0,
                      this.options.width * this.options.scale,
                      this.options.height * this.options.scale,
                    )),
                  this.ctx.drawImage(
                    t,
                    -this.options.x * this.options.scale,
                    -this.options.y * this.options.scale,
                  ),
                  [2, this.canvas]
                )
            }
          })
        })
      }),
      e
    )
  })(kC),
  NC = function (A) {
    return new Promise(function (e, t) {
      var r = new Image()
      ;((r.onload = function () {
        e(r)
      }),
        (r.onerror = t),
        (r.src =
          'data:image/svg+xml;charset=utf-8,' +
          encodeURIComponent(new XMLSerializer().serializeToString(A))))
    })
  },
  PC = (function () {
    function A(A) {
      var e = A.id,
        t = A.enabled
      ;((this.id = e), (this.enabled = t), (this.start = Date.now()))
    }
    return (
      (A.prototype.debug = function () {
        for (var A = [], e = 0; e < arguments.length; e++) A[e] = arguments[e]
        this.enabled &&
          (('undefined' != typeof window &&
            window.console &&
            'function' == typeof console.debug) ||
            this.info.apply(this, A))
      }),
      (A.prototype.getTime = function () {
        return Date.now() - this.start
      }),
      (A.prototype.info = function () {
        for (var A = [], e = 0; e < arguments.length; e++) A[e] = arguments[e]
        this.enabled &&
          'undefined' != typeof window &&
          window.console &&
          console.info
      }),
      (A.prototype.warn = function () {
        for (var A = [], e = 0; e < arguments.length; e++) A[e] = arguments[e]
        this.enabled &&
          (('undefined' != typeof window &&
            window.console &&
            'function' == typeof console.warn) ||
            this.info.apply(this, A))
      }),
      (A.prototype.error = function () {
        for (var A = [], e = 0; e < arguments.length; e++) A[e] = arguments[e]
        this.enabled &&
          (('undefined' != typeof window &&
            window.console &&
            'function' == typeof console.error) ||
            this.info.apply(this, A))
      }),
      (A.instances = {}),
      A
    )
  })(),
  VC = (function () {
    function A(e, t) {
      var r
      ;((this.windowBounds = t),
        (this.instanceName = '#' + A.instanceCount++),
        (this.logger = new PC({ id: this.instanceName, enabled: e.logging })),
        (this.cache =
          null !== (r = e.cache) && void 0 !== r ? r : new qm(this, e)))
    }
    return ((A.instanceCount = 1), A)
  })(),
  GC = function (A, e) {
    return (void 0 === e && (e = {}), zC(A, e))
  }
'undefined' != typeof window && Wm.setContext(window)
var zC = function (A, e) {
    return Bf(void 0, 0, void 0, function () {
      var t,
        r,
        n,
        i,
        o,
        s,
        a,
        c,
        u,
        l,
        h,
        f,
        d,
        B,
        p,
        g,
        w,
        m,
        C,
        y,
        Q,
        F,
        U,
        v,
        b,
        E,
        H,
        _,
        I,
        D,
        x,
        k,
        L,
        S,
        O,
        K,
        T,
        M
      return pf(this, function (R) {
        switch (R.label) {
          case 0:
            if (!A || 'object' != typeof A)
              return [
                2,
                Promise.reject('Invalid element provided as first argument'),
              ]
            if (!(t = A.ownerDocument))
              throw new Error('Element is not attached to a Document')
            if (!(r = t.defaultView))
              throw new Error('Document is not attached to a Window')
            return (
              (n = {
                allowTaint: null !== (F = e.allowTaint) && void 0 !== F && F,
                imageTimeout:
                  null !== (U = e.imageTimeout) && void 0 !== U ? U : 15e3,
                proxy: e.proxy,
                useCORS: null !== (v = e.useCORS) && void 0 !== v && v,
              }),
              (i = df(
                {
                  logging: null === (b = e.logging) || void 0 === b || b,
                  cache: e.cache,
                },
                n,
              )),
              (o = {
                windowWidth:
                  null !== (E = e.windowWidth) && void 0 !== E
                    ? E
                    : r.innerWidth,
                windowHeight:
                  null !== (H = e.windowHeight) && void 0 !== H
                    ? H
                    : r.innerHeight,
                scrollX:
                  null !== (_ = e.scrollX) && void 0 !== _ ? _ : r.pageXOffset,
                scrollY:
                  null !== (I = e.scrollY) && void 0 !== I ? I : r.pageYOffset,
              }),
              (s = new gf(o.scrollX, o.scrollY, o.windowWidth, o.windowHeight)),
              (a = new VC(i, s)),
              (c =
                null !== (D = e.foreignObjectRendering) && void 0 !== D && D),
              (u = {
                allowTaint: null !== (x = e.allowTaint) && void 0 !== x && x,
                onclone: e.onclone,
                ignoreElements: e.ignoreElements,
                inlineImages: c,
                copyStyles: c,
              }),
              a.logger.debug(
                'Starting document clone with size ' +
                  s.width +
                  'x' +
                  s.height +
                  ' scrolled to ' +
                  -s.left +
                  ',' +
                  -s.top,
              ),
              (l = new Im(a, A, u)),
              (h = l.clonedReferenceElement)
                ? [4, l.toIFrame(t, s)]
                : [2, Promise.reject('Unable to find element in cloned iframe')]
            )
          case 1:
            return (
              (f = R.sent()),
              (d =
                nm(h) || 'HTML' === h.tagName
                  ? (function (A) {
                      var e = A.body,
                        t = A.documentElement
                      if (!e || !t)
                        throw new Error('Unable to get document size')
                      var r = Math.max(
                          Math.max(e.scrollWidth, t.scrollWidth),
                          Math.max(e.offsetWidth, t.offsetWidth),
                          Math.max(e.clientWidth, t.clientWidth),
                        ),
                        n = Math.max(
                          Math.max(e.scrollHeight, t.scrollHeight),
                          Math.max(e.offsetHeight, t.offsetHeight),
                          Math.max(e.clientHeight, t.clientHeight),
                        )
                      return new gf(0, 0, r, n)
                    })(h.ownerDocument)
                  : wf(a, h)),
              (B = d.width),
              (p = d.height),
              (g = d.left),
              (w = d.top),
              (m = jC(a, h, e.backgroundColor)),
              (C = {
                canvas: e.canvas,
                backgroundColor: m,
                scale:
                  null !==
                    (L =
                      null !== (k = e.scale) && void 0 !== k
                        ? k
                        : r.devicePixelRatio) && void 0 !== L
                    ? L
                    : 1,
                x: (null !== (S = e.x) && void 0 !== S ? S : 0) + g,
                y: (null !== (O = e.y) && void 0 !== O ? O : 0) + w,
                width:
                  null !== (K = e.width) && void 0 !== K ? K : Math.ceil(B),
                height:
                  null !== (T = e.height) && void 0 !== T ? T : Math.ceil(p),
              }),
              c
                ? (a.logger.debug(
                    'Document cloned, using foreign object rendering',
                  ),
                  [4, new RC(a, C).render(h)])
                : [3, 3]
            )
          case 2:
            return ((y = R.sent()), [3, 5])
          case 3:
            return (
              a.logger.debug(
                'Document cloned, element located at ' +
                  g +
                  ',' +
                  w +
                  ' with size ' +
                  B +
                  'x' +
                  p +
                  ' using computed rendering',
              ),
              a.logger.debug('Starting DOM parsing'),
              (Q = Ww(a, h)),
              m === Q.styles.backgroundColor &&
                (Q.styles.backgroundColor = NB.TRANSPARENT),
              a.logger.debug(
                'Starting renderer for element at ' +
                  C.x +
                  ',' +
                  C.y +
                  ' with size ' +
                  C.width +
                  'x' +
                  C.height,
              ),
              [4, new LC(a, C).render(Q)]
            )
          case 4:
            ;((y = R.sent()), (R.label = 5))
          case 5:
            return (
              (null === (M = e.removeContainer) || void 0 === M || M) &&
                (Im.destroy(f) ||
                  a.logger.error(
                    'Cannot detach cloned iframe as it is not in the DOM anymore',
                  )),
              a.logger.debug('Finished rendering'),
              [2, y]
            )
        }
      })
    })
  },
  jC = function (A, e, t) {
    var r = e.ownerDocument,
      n = r.documentElement
        ? RB(A, getComputedStyle(r.documentElement).backgroundColor)
        : NB.TRANSPARENT,
      i = r.body
        ? RB(A, getComputedStyle(r.body).backgroundColor)
        : NB.TRANSPARENT,
      o =
        'string' == typeof t
          ? RB(A, t)
          : null === t
            ? NB.TRANSPARENT
            : 4294967295
    return e === r.documentElement ? (xB(n) ? (xB(i) ? o : i) : n) : o
  }
export {
  Mc as $,
  Ui as A,
  Bt as B,
  Yt as C,
  ee as D,
  Dr as E,
  $i as F,
  or as G,
  cr as H,
  $t as I,
  ks as J,
  Ls as K,
  Is as L,
  xs as M,
  Ds as N,
  Hs as O,
  _s as P,
  hr as Q,
  Nc as R,
  Ji as S,
  ti as T,
  Kc as U,
  Ph as V,
  Ic as W,
  Wh as X,
  Uo as Y,
  Jh as Z,
  $h as _,
  ic as a,
  Tc as a0,
  Jc as a1,
  lf as a2,
  qc as a3,
  sr as b,
  oi as c,
  zt as d,
  ai as e,
  tr as f,
  ae as g,
  GC as h,
  ir as i,
  nr as j,
  er as k,
  tc as l,
  pt as m,
  Qe as n,
  ui as o,
  Br as p,
  fe as q,
  hi as r,
  pr as s,
  gr as t,
  mr as u,
  wi as v,
  pi as w,
  Ci as x,
  Kn as y,
  Qi as z,
}
//# sourceMappingURL=vendor-C0p4anTM.js.map
