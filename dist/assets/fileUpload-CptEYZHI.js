!(function () {
  'use strict'
  function t(t) {
    return t &&
      t.__esModule &&
      Object.prototype.hasOwnProperty.call(t, 'default')
      ? t.default
      : t
  }
  var r = { exports: {} }
  r.exports = (function (t) {
    var r = [
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
    ]
    function e(t, r) {
      var e = t[0],
        n = t[1],
        f = t[2],
        s = t[3]
      ;((n =
        ((((n +=
          ((((f =
            ((((f +=
              ((((s =
                ((((s +=
                  ((((e =
                    ((((e += (((n & f) | (~n & s)) + r[0] - 680876936) | 0) <<
                      7) |
                      (e >>> 25)) +
                      n) |
                    0) &
                    n) |
                    (~e & f)) +
                    r[1] -
                    389564586) |
                  0) <<
                  12) |
                  (s >>> 20)) +
                  e) |
                0) &
                e) |
                (~s & n)) +
                r[2] +
                606105819) |
              0) <<
              17) |
              (f >>> 15)) +
              s) |
            0) &
            s) |
            (~f & e)) +
            r[3] -
            1044525330) |
          0) <<
          22) |
          (n >>> 10)) +
          f) |
        0),
        (n =
          ((((n +=
            ((((f =
              ((((f +=
                ((((s =
                  ((((s +=
                    ((((e =
                      ((((e += (((n & f) | (~n & s)) + r[4] - 176418897) | 0) <<
                        7) |
                        (e >>> 25)) +
                        n) |
                      0) &
                      n) |
                      (~e & f)) +
                      r[5] +
                      1200080426) |
                    0) <<
                    12) |
                    (s >>> 20)) +
                    e) |
                  0) &
                  e) |
                  (~s & n)) +
                  r[6] -
                  1473231341) |
                0) <<
                17) |
                (f >>> 15)) +
                s) |
              0) &
              s) |
              (~f & e)) +
              r[7] -
              45705983) |
            0) <<
            22) |
            (n >>> 10)) +
            f) |
          0),
        (n =
          ((((n +=
            ((((f =
              ((((f +=
                ((((s =
                  ((((s +=
                    ((((e =
                      ((((e +=
                        (((n & f) | (~n & s)) + r[8] + 1770035416) | 0) <<
                        7) |
                        (e >>> 25)) +
                        n) |
                      0) &
                      n) |
                      (~e & f)) +
                      r[9] -
                      1958414417) |
                    0) <<
                    12) |
                    (s >>> 20)) +
                    e) |
                  0) &
                  e) |
                  (~s & n)) +
                  r[10] -
                  42063) |
                0) <<
                17) |
                (f >>> 15)) +
                s) |
              0) &
              s) |
              (~f & e)) +
              r[11] -
              1990404162) |
            0) <<
            22) |
            (n >>> 10)) +
            f) |
          0),
        (n =
          ((((n +=
            ((((f =
              ((((f +=
                ((((s =
                  ((((s +=
                    ((((e =
                      ((((e +=
                        (((n & f) | (~n & s)) + r[12] + 1804603682) | 0) <<
                        7) |
                        (e >>> 25)) +
                        n) |
                      0) &
                      n) |
                      (~e & f)) +
                      r[13] -
                      40341101) |
                    0) <<
                    12) |
                    (s >>> 20)) +
                    e) |
                  0) &
                  e) |
                  (~s & n)) +
                  r[14] -
                  1502002290) |
                0) <<
                17) |
                (f >>> 15)) +
                s) |
              0) &
              s) |
              (~f & e)) +
              r[15] +
              1236535329) |
            0) <<
            22) |
            (n >>> 10)) +
            f) |
          0),
        (n =
          ((((n +=
            ((((f =
              ((((f +=
                ((((s =
                  ((((s +=
                    ((((e =
                      ((((e += (((n & s) | (f & ~s)) + r[1] - 165796510) | 0) <<
                        5) |
                        (e >>> 27)) +
                        n) |
                      0) &
                      f) |
                      (n & ~f)) +
                      r[6] -
                      1069501632) |
                    0) <<
                    9) |
                    (s >>> 23)) +
                    e) |
                  0) &
                  n) |
                  (e & ~n)) +
                  r[11] +
                  643717713) |
                0) <<
                14) |
                (f >>> 18)) +
                s) |
              0) &
              e) |
              (s & ~e)) +
              r[0] -
              373897302) |
            0) <<
            20) |
            (n >>> 12)) +
            f) |
          0),
        (n =
          ((((n +=
            ((((f =
              ((((f +=
                ((((s =
                  ((((s +=
                    ((((e =
                      ((((e += (((n & s) | (f & ~s)) + r[5] - 701558691) | 0) <<
                        5) |
                        (e >>> 27)) +
                        n) |
                      0) &
                      f) |
                      (n & ~f)) +
                      r[10] +
                      38016083) |
                    0) <<
                    9) |
                    (s >>> 23)) +
                    e) |
                  0) &
                  n) |
                  (e & ~n)) +
                  r[15] -
                  660478335) |
                0) <<
                14) |
                (f >>> 18)) +
                s) |
              0) &
              e) |
              (s & ~e)) +
              r[4] -
              405537848) |
            0) <<
            20) |
            (n >>> 12)) +
            f) |
          0),
        (n =
          ((((n +=
            ((((f =
              ((((f +=
                ((((s =
                  ((((s +=
                    ((((e =
                      ((((e += (((n & s) | (f & ~s)) + r[9] + 568446438) | 0) <<
                        5) |
                        (e >>> 27)) +
                        n) |
                      0) &
                      f) |
                      (n & ~f)) +
                      r[14] -
                      1019803690) |
                    0) <<
                    9) |
                    (s >>> 23)) +
                    e) |
                  0) &
                  n) |
                  (e & ~n)) +
                  r[3] -
                  187363961) |
                0) <<
                14) |
                (f >>> 18)) +
                s) |
              0) &
              e) |
              (s & ~e)) +
              r[8] +
              1163531501) |
            0) <<
            20) |
            (n >>> 12)) +
            f) |
          0),
        (n =
          ((((n +=
            ((((f =
              ((((f +=
                ((((s =
                  ((((s +=
                    ((((e =
                      ((((e +=
                        (((n & s) | (f & ~s)) + r[13] - 1444681467) | 0) <<
                        5) |
                        (e >>> 27)) +
                        n) |
                      0) &
                      f) |
                      (n & ~f)) +
                      r[2] -
                      51403784) |
                    0) <<
                    9) |
                    (s >>> 23)) +
                    e) |
                  0) &
                  n) |
                  (e & ~n)) +
                  r[7] +
                  1735328473) |
                0) <<
                14) |
                (f >>> 18)) +
                s) |
              0) &
              e) |
              (s & ~e)) +
              r[12] -
              1926607734) |
            0) <<
            20) |
            (n >>> 12)) +
            f) |
          0),
        (n =
          ((((n +=
            (((f =
              ((((f +=
                (((s =
                  ((((s +=
                    (((e =
                      ((((e += ((n ^ f ^ s) + r[5] - 378558) | 0) << 4) |
                        (e >>> 28)) +
                        n) |
                      0) ^
                      n ^
                      f) +
                      r[8] -
                      2022574463) |
                    0) <<
                    11) |
                    (s >>> 21)) +
                    e) |
                  0) ^
                  e ^
                  n) +
                  r[11] +
                  1839030562) |
                0) <<
                16) |
                (f >>> 16)) +
                s) |
              0) ^
              s ^
              e) +
              r[14] -
              35309556) |
            0) <<
            23) |
            (n >>> 9)) +
            f) |
          0),
        (n =
          ((((n +=
            (((f =
              ((((f +=
                (((s =
                  ((((s +=
                    (((e =
                      ((((e += ((n ^ f ^ s) + r[1] - 1530992060) | 0) << 4) |
                        (e >>> 28)) +
                        n) |
                      0) ^
                      n ^
                      f) +
                      r[4] +
                      1272893353) |
                    0) <<
                    11) |
                    (s >>> 21)) +
                    e) |
                  0) ^
                  e ^
                  n) +
                  r[7] -
                  155497632) |
                0) <<
                16) |
                (f >>> 16)) +
                s) |
              0) ^
              s ^
              e) +
              r[10] -
              1094730640) |
            0) <<
            23) |
            (n >>> 9)) +
            f) |
          0),
        (n =
          ((((n +=
            (((f =
              ((((f +=
                (((s =
                  ((((s +=
                    (((e =
                      ((((e += ((n ^ f ^ s) + r[13] + 681279174) | 0) << 4) |
                        (e >>> 28)) +
                        n) |
                      0) ^
                      n ^
                      f) +
                      r[0] -
                      358537222) |
                    0) <<
                    11) |
                    (s >>> 21)) +
                    e) |
                  0) ^
                  e ^
                  n) +
                  r[3] -
                  722521979) |
                0) <<
                16) |
                (f >>> 16)) +
                s) |
              0) ^
              s ^
              e) +
              r[6] +
              76029189) |
            0) <<
            23) |
            (n >>> 9)) +
            f) |
          0),
        (n =
          ((((n +=
            (((f =
              ((((f +=
                (((s =
                  ((((s +=
                    (((e =
                      ((((e += ((n ^ f ^ s) + r[9] - 640364487) | 0) << 4) |
                        (e >>> 28)) +
                        n) |
                      0) ^
                      n ^
                      f) +
                      r[12] -
                      421815835) |
                    0) <<
                    11) |
                    (s >>> 21)) +
                    e) |
                  0) ^
                  e ^
                  n) +
                  r[15] +
                  530742520) |
                0) <<
                16) |
                (f >>> 16)) +
                s) |
              0) ^
              s ^
              e) +
              r[2] -
              995338651) |
            0) <<
            23) |
            (n >>> 9)) +
            f) |
          0),
        (n =
          ((((n +=
            (((s =
              ((((s +=
                ((n ^
                  ((e =
                    ((((e += ((f ^ (n | ~s)) + r[0] - 198630844) | 0) << 6) |
                      (e >>> 26)) +
                      n) |
                    0) |
                    ~f)) +
                  r[7] +
                  1126891415) |
                0) <<
                10) |
                (s >>> 22)) +
                e) |
              0) ^
              ((f =
                ((((f += ((e ^ (s | ~n)) + r[14] - 1416354905) | 0) << 15) |
                  (f >>> 17)) +
                  s) |
                0) |
                ~e)) +
              r[5] -
              57434055) |
            0) <<
            21) |
            (n >>> 11)) +
            f) |
          0),
        (n =
          ((((n +=
            (((s =
              ((((s +=
                ((n ^
                  ((e =
                    ((((e += ((f ^ (n | ~s)) + r[12] + 1700485571) | 0) << 6) |
                      (e >>> 26)) +
                      n) |
                    0) |
                    ~f)) +
                  r[3] -
                  1894986606) |
                0) <<
                10) |
                (s >>> 22)) +
                e) |
              0) ^
              ((f =
                ((((f += ((e ^ (s | ~n)) + r[10] - 1051523) | 0) << 15) |
                  (f >>> 17)) +
                  s) |
                0) |
                ~e)) +
              r[1] -
              2054922799) |
            0) <<
            21) |
            (n >>> 11)) +
            f) |
          0),
        (n =
          ((((n +=
            (((s =
              ((((s +=
                ((n ^
                  ((e =
                    ((((e += ((f ^ (n | ~s)) + r[8] + 1873313359) | 0) << 6) |
                      (e >>> 26)) +
                      n) |
                    0) |
                    ~f)) +
                  r[15] -
                  30611744) |
                0) <<
                10) |
                (s >>> 22)) +
                e) |
              0) ^
              ((f =
                ((((f += ((e ^ (s | ~n)) + r[6] - 1560198380) | 0) << 15) |
                  (f >>> 17)) +
                  s) |
                0) |
                ~e)) +
              r[13] +
              1309151649) |
            0) <<
            21) |
            (n >>> 11)) +
            f) |
          0),
        (n =
          ((((n +=
            (((s =
              ((((s +=
                ((n ^
                  ((e =
                    ((((e += ((f ^ (n | ~s)) + r[4] - 145523070) | 0) << 6) |
                      (e >>> 26)) +
                      n) |
                    0) |
                    ~f)) +
                  r[11] -
                  1120210379) |
                0) <<
                10) |
                (s >>> 22)) +
                e) |
              0) ^
              ((f =
                ((((f += ((e ^ (s | ~n)) + r[2] + 718787259) | 0) << 15) |
                  (f >>> 17)) +
                  s) |
                0) |
                ~e)) +
              r[9] -
              343485551) |
            0) <<
            21) |
            (n >>> 11)) +
            f) |
          0),
        (t[0] = (e + t[0]) | 0),
        (t[1] = (n + t[1]) | 0),
        (t[2] = (f + t[2]) | 0),
        (t[3] = (s + t[3]) | 0))
    }
    function n(t) {
      var r,
        e = []
      for (r = 0; r < 64; r += 4)
        e[r >> 2] =
          t.charCodeAt(r) +
          (t.charCodeAt(r + 1) << 8) +
          (t.charCodeAt(r + 2) << 16) +
          (t.charCodeAt(r + 3) << 24)
      return e
    }
    function f(t) {
      var r,
        e = []
      for (r = 0; r < 64; r += 4)
        e[r >> 2] = t[r] + (t[r + 1] << 8) + (t[r + 2] << 16) + (t[r + 3] << 24)
      return e
    }
    function s(t) {
      var r,
        f,
        s,
        i,
        o,
        h,
        a = t.length,
        u = [1732584193, -271733879, -1732584194, 271733878]
      for (r = 64; r <= a; r += 64) e(u, n(t.substring(r - 64, r)))
      for (
        f = (t = t.substring(r - 64)).length,
          s = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          r = 0;
        r < f;
        r += 1
      )
        s[r >> 2] |= t.charCodeAt(r) << (r % 4 << 3)
      if (((s[r >> 2] |= 128 << (r % 4 << 3)), r > 55))
        for (e(u, s), r = 0; r < 16; r += 1) s[r] = 0
      return (
        (i = (i = 8 * a).toString(16).match(/(.*?)(.{0,8})$/)),
        (o = parseInt(i[2], 16)),
        (h = parseInt(i[1], 16) || 0),
        (s[14] = o),
        (s[15] = h),
        e(u, s),
        u
      )
    }
    function i(t) {
      var r,
        n,
        s,
        i,
        o,
        h,
        a = t.length,
        u = [1732584193, -271733879, -1732584194, 271733878]
      for (r = 64; r <= a; r += 64) e(u, f(t.subarray(r - 64, r)))
      for (
        n = (t = r - 64 < a ? t.subarray(r - 64) : new Uint8Array(0)).length,
          s = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          r = 0;
        r < n;
        r += 1
      )
        s[r >> 2] |= t[r] << (r % 4 << 3)
      if (((s[r >> 2] |= 128 << (r % 4 << 3)), r > 55))
        for (e(u, s), r = 0; r < 16; r += 1) s[r] = 0
      return (
        (i = (i = 8 * a).toString(16).match(/(.*?)(.{0,8})$/)),
        (o = parseInt(i[2], 16)),
        (h = parseInt(i[1], 16) || 0),
        (s[14] = o),
        (s[15] = h),
        e(u, s),
        u
      )
    }
    function o(t) {
      var e,
        n = ''
      for (e = 0; e < 4; e += 1)
        n += r[(t >> (8 * e + 4)) & 15] + r[(t >> (8 * e)) & 15]
      return n
    }
    function h(t) {
      var r
      for (r = 0; r < t.length; r += 1) t[r] = o(t[r])
      return t.join('')
    }
    function a(t) {
      return (
        /[\u0080-\uFFFF]/.test(t) && (t = unescape(encodeURIComponent(t))),
        t
      )
    }
    function u(t, r) {
      var e,
        n = t.length,
        f = new ArrayBuffer(n),
        s = new Uint8Array(f)
      for (e = 0; e < n; e += 1) s[e] = t.charCodeAt(e)
      return r ? s : f
    }
    function p(t) {
      return String.fromCharCode.apply(null, new Uint8Array(t))
    }
    function c(t, r, e) {
      var n = new Uint8Array(t.byteLength + r.byteLength)
      return (
        n.set(new Uint8Array(t)),
        n.set(new Uint8Array(r), t.byteLength),
        n
      )
    }
    function y(t) {
      var r,
        e = [],
        n = t.length
      for (r = 0; r < n - 1; r += 2) e.push(parseInt(t.substr(r, 2), 16))
      return String.fromCharCode.apply(String, e)
    }
    function l() {
      this.reset()
    }
    return (
      h(s('hello')),
      'undefined' == typeof ArrayBuffer ||
        ArrayBuffer.prototype.slice ||
        (function () {
          function r(t, r) {
            return (t = 0 | t || 0) < 0 ? Math.max(t + r, 0) : Math.min(t, r)
          }
          ArrayBuffer.prototype.slice = function (e, n) {
            var f,
              s,
              i,
              o,
              h = this.byteLength,
              a = r(e, h),
              u = h
            return (
              n !== t && (u = r(n, h)),
              a > u
                ? new ArrayBuffer(0)
                : ((f = u - a),
                  (s = new ArrayBuffer(f)),
                  (i = new Uint8Array(s)),
                  (o = new Uint8Array(this, a, f)),
                  i.set(o),
                  s)
            )
          }
        })(),
      (l.prototype.append = function (t) {
        return (this.appendBinary(a(t)), this)
      }),
      (l.prototype.appendBinary = function (t) {
        ;((this._buff += t), (this._length += t.length))
        var r,
          f = this._buff.length
        for (r = 64; r <= f; r += 64)
          e(this._hash, n(this._buff.substring(r - 64, r)))
        return ((this._buff = this._buff.substring(r - 64)), this)
      }),
      (l.prototype.end = function (t) {
        var r,
          e,
          n = this._buff,
          f = n.length,
          s = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        for (r = 0; r < f; r += 1) s[r >> 2] |= n.charCodeAt(r) << (r % 4 << 3)
        return (
          this._finish(s, f),
          (e = h(this._hash)),
          t && (e = y(e)),
          this.reset(),
          e
        )
      }),
      (l.prototype.reset = function () {
        return (
          (this._buff = ''),
          (this._length = 0),
          (this._hash = [1732584193, -271733879, -1732584194, 271733878]),
          this
        )
      }),
      (l.prototype.getState = function () {
        return {
          buff: this._buff,
          length: this._length,
          hash: this._hash.slice(),
        }
      }),
      (l.prototype.setState = function (t) {
        return (
          (this._buff = t.buff),
          (this._length = t.length),
          (this._hash = t.hash),
          this
        )
      }),
      (l.prototype.destroy = function () {
        ;(delete this._hash, delete this._buff, delete this._length)
      }),
      (l.prototype._finish = function (t, r) {
        var n,
          f,
          s,
          i = r
        if (((t[i >> 2] |= 128 << (i % 4 << 3)), i > 55))
          for (e(this._hash, t), i = 0; i < 16; i += 1) t[i] = 0
        ;((n = (n = 8 * this._length).toString(16).match(/(.*?)(.{0,8})$/)),
          (f = parseInt(n[2], 16)),
          (s = parseInt(n[1], 16) || 0),
          (t[14] = f),
          (t[15] = s),
          e(this._hash, t))
      }),
      (l.hash = function (t, r) {
        return l.hashBinary(a(t), r)
      }),
      (l.hashBinary = function (t, r) {
        var e = h(s(t))
        return r ? y(e) : e
      }),
      (l.ArrayBuffer = function () {
        this.reset()
      }),
      (l.ArrayBuffer.prototype.append = function (t) {
        var r,
          n = c(this._buff.buffer, t),
          s = n.length
        for (this._length += t.byteLength, r = 64; r <= s; r += 64)
          e(this._hash, f(n.subarray(r - 64, r)))
        return (
          (this._buff =
            r - 64 < s
              ? new Uint8Array(n.buffer.slice(r - 64))
              : new Uint8Array(0)),
          this
        )
      }),
      (l.ArrayBuffer.prototype.end = function (t) {
        var r,
          e,
          n = this._buff,
          f = n.length,
          s = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        for (r = 0; r < f; r += 1) s[r >> 2] |= n[r] << (r % 4 << 3)
        return (
          this._finish(s, f),
          (e = h(this._hash)),
          t && (e = y(e)),
          this.reset(),
          e
        )
      }),
      (l.ArrayBuffer.prototype.reset = function () {
        return (
          (this._buff = new Uint8Array(0)),
          (this._length = 0),
          (this._hash = [1732584193, -271733879, -1732584194, 271733878]),
          this
        )
      }),
      (l.ArrayBuffer.prototype.getState = function () {
        var t = l.prototype.getState.call(this)
        return ((t.buff = p(t.buff)), t)
      }),
      (l.ArrayBuffer.prototype.setState = function (t) {
        return ((t.buff = u(t.buff, !0)), l.prototype.setState.call(this, t))
      }),
      (l.ArrayBuffer.prototype.destroy = l.prototype.destroy),
      (l.ArrayBuffer.prototype._finish = l.prototype._finish),
      (l.ArrayBuffer.hash = function (t, r) {
        var e = h(i(new Uint8Array(t)))
        return r ? y(e) : e
      }),
      l
    )
  })()
  var e = t(r.exports)
  self.onmessage = function (t) {
    const { file: r, chunkSize: n } = t.data
    if (!r) return void self.postMessage({ error: 'No file provided' })
    const f = new e.ArrayBuffer()
    let s = 0
    const i = Math.ceil(r.size / n),
      o = new FileReader()
    function h() {
      const t = s * n,
        e = Math.min(t + n, r.size)
      o.readAsArrayBuffer(r.slice(t, e))
    }
    ;((o.onload = function (t) {
      if (
        (f.append(t.target.result),
        s++,
        self.postMessage({ md5Progress: (s / i) * 100 }),
        s < i)
      )
        h()
      else {
        const t = f.end()
        self.postMessage({ hash: t })
      }
    }),
      (o.onerror = function () {
        self.postMessage({ error: 'Error reading file' })
      }),
      h())
  }
})()
//# sourceMappingURL=fileUpload-CptEYZHI.js.map
