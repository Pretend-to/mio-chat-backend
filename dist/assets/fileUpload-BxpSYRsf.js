(function() {
	var t = Object.create, e = Object.defineProperty, r = Object.getOwnPropertyDescriptor, n = Object.getOwnPropertyNames, f = Object.getPrototypeOf, o = Object.prototype.hasOwnProperty, i = ((i, s, a) => (a = null != i ? t(f(i)) : {}, ((t, f, i, s) => {
		if (f && "object" == typeof f || "function" == typeof f) for (var a, h = n(f), u = 0, p = h.length; u < p; u++) a = h[u], o.call(t, a) || a === i || e(t, a, {
			get: ((t) => f[t]).bind(null, a),
			enumerable: !(s = r(f, a)) || s.enumerable
		});
		return t;
	})(!s && i && i.__esModule ? a : e(a, "default", {
		value: i,
		enumerable: !0
	}), i)))(((t, e) => () => (e || (t((e = { exports: {} }).exports, e), t = null), e.exports))((t, e) => {
		(function(r) {
			if ("object" == typeof t) e.exports = r();
			else if ("function" == typeof define && define.amd) define(r);
			else {
				var n;
				try {
					n = window;
				} catch (f) {
					n = self;
				}
				n.SparkMD5 = r();
			}
		})(function(t) {
			"use strict";
			var e = [
				"0",
				"1",
				"2",
				"3",
				"4",
				"5",
				"6",
				"7",
				"8",
				"9",
				"a",
				"b",
				"c",
				"d",
				"e",
				"f"
			];
			function r(t, e) {
				var r = t[0], n = t[1], f = t[2], o = t[3];
				n = ((n += ((f = ((f += ((o = ((o += ((r = ((r += (n & f | ~n & o) + e[0] - 680876936 | 0) << 7 | r >>> 25) + n | 0) & n | ~r & f) + e[1] - 389564586 | 0) << 12 | o >>> 20) + r | 0) & r | ~o & n) + e[2] + 606105819 | 0) << 17 | f >>> 15) + o | 0) & o | ~f & r) + e[3] - 1044525330 | 0) << 22 | n >>> 10) + f | 0, n = ((n += ((f = ((f += ((o = ((o += ((r = ((r += (n & f | ~n & o) + e[4] - 176418897 | 0) << 7 | r >>> 25) + n | 0) & n | ~r & f) + e[5] + 1200080426 | 0) << 12 | o >>> 20) + r | 0) & r | ~o & n) + e[6] - 1473231341 | 0) << 17 | f >>> 15) + o | 0) & o | ~f & r) + e[7] - 45705983 | 0) << 22 | n >>> 10) + f | 0, n = ((n += ((f = ((f += ((o = ((o += ((r = ((r += (n & f | ~n & o) + e[8] + 1770035416 | 0) << 7 | r >>> 25) + n | 0) & n | ~r & f) + e[9] - 1958414417 | 0) << 12 | o >>> 20) + r | 0) & r | ~o & n) + e[10] - 42063 | 0) << 17 | f >>> 15) + o | 0) & o | ~f & r) + e[11] - 1990404162 | 0) << 22 | n >>> 10) + f | 0, n = ((n += ((f = ((f += ((o = ((o += ((r = ((r += (n & f | ~n & o) + e[12] + 1804603682 | 0) << 7 | r >>> 25) + n | 0) & n | ~r & f) + e[13] - 40341101 | 0) << 12 | o >>> 20) + r | 0) & r | ~o & n) + e[14] - 1502002290 | 0) << 17 | f >>> 15) + o | 0) & o | ~f & r) + e[15] + 1236535329 | 0) << 22 | n >>> 10) + f | 0, n = ((n += ((f = ((f += ((o = ((o += ((r = ((r += (n & o | f & ~o) + e[1] - 165796510 | 0) << 5 | r >>> 27) + n | 0) & f | n & ~f) + e[6] - 1069501632 | 0) << 9 | o >>> 23) + r | 0) & n | r & ~n) + e[11] + 643717713 | 0) << 14 | f >>> 18) + o | 0) & r | o & ~r) + e[0] - 373897302 | 0) << 20 | n >>> 12) + f | 0, n = ((n += ((f = ((f += ((o = ((o += ((r = ((r += (n & o | f & ~o) + e[5] - 701558691 | 0) << 5 | r >>> 27) + n | 0) & f | n & ~f) + e[10] + 38016083 | 0) << 9 | o >>> 23) + r | 0) & n | r & ~n) + e[15] - 660478335 | 0) << 14 | f >>> 18) + o | 0) & r | o & ~r) + e[4] - 405537848 | 0) << 20 | n >>> 12) + f | 0, n = ((n += ((f = ((f += ((o = ((o += ((r = ((r += (n & o | f & ~o) + e[9] + 568446438 | 0) << 5 | r >>> 27) + n | 0) & f | n & ~f) + e[14] - 1019803690 | 0) << 9 | o >>> 23) + r | 0) & n | r & ~n) + e[3] - 187363961 | 0) << 14 | f >>> 18) + o | 0) & r | o & ~r) + e[8] + 1163531501 | 0) << 20 | n >>> 12) + f | 0, n = ((n += ((f = ((f += ((o = ((o += ((r = ((r += (n & o | f & ~o) + e[13] - 1444681467 | 0) << 5 | r >>> 27) + n | 0) & f | n & ~f) + e[2] - 51403784 | 0) << 9 | o >>> 23) + r | 0) & n | r & ~n) + e[7] + 1735328473 | 0) << 14 | f >>> 18) + o | 0) & r | o & ~r) + e[12] - 1926607734 | 0) << 20 | n >>> 12) + f | 0, n = ((n += ((f = ((f += ((o = ((o += ((r = ((r += (n ^ f ^ o) + e[5] - 378558 | 0) << 4 | r >>> 28) + n | 0) ^ n ^ f) + e[8] - 2022574463 | 0) << 11 | o >>> 21) + r | 0) ^ r ^ n) + e[11] + 1839030562 | 0) << 16 | f >>> 16) + o | 0) ^ o ^ r) + e[14] - 35309556 | 0) << 23 | n >>> 9) + f | 0, n = ((n += ((f = ((f += ((o = ((o += ((r = ((r += (n ^ f ^ o) + e[1] - 1530992060 | 0) << 4 | r >>> 28) + n | 0) ^ n ^ f) + e[4] + 1272893353 | 0) << 11 | o >>> 21) + r | 0) ^ r ^ n) + e[7] - 155497632 | 0) << 16 | f >>> 16) + o | 0) ^ o ^ r) + e[10] - 1094730640 | 0) << 23 | n >>> 9) + f | 0, n = ((n += ((f = ((f += ((o = ((o += ((r = ((r += (n ^ f ^ o) + e[13] + 681279174 | 0) << 4 | r >>> 28) + n | 0) ^ n ^ f) + e[0] - 358537222 | 0) << 11 | o >>> 21) + r | 0) ^ r ^ n) + e[3] - 722521979 | 0) << 16 | f >>> 16) + o | 0) ^ o ^ r) + e[6] + 76029189 | 0) << 23 | n >>> 9) + f | 0, n = ((n += ((f = ((f += ((o = ((o += ((r = ((r += (n ^ f ^ o) + e[9] - 640364487 | 0) << 4 | r >>> 28) + n | 0) ^ n ^ f) + e[12] - 421815835 | 0) << 11 | o >>> 21) + r | 0) ^ r ^ n) + e[15] + 530742520 | 0) << 16 | f >>> 16) + o | 0) ^ o ^ r) + e[2] - 995338651 | 0) << 23 | n >>> 9) + f | 0, n = ((n += ((o = ((o += (n ^ ((r = ((r += (f ^ (n | ~o)) + e[0] - 198630844 | 0) << 6 | r >>> 26) + n | 0) | ~f)) + e[7] + 1126891415 | 0) << 10 | o >>> 22) + r | 0) ^ ((f = ((f += (r ^ (o | ~n)) + e[14] - 1416354905 | 0) << 15 | f >>> 17) + o | 0) | ~r)) + e[5] - 57434055 | 0) << 21 | n >>> 11) + f | 0, n = ((n += ((o = ((o += (n ^ ((r = ((r += (f ^ (n | ~o)) + e[12] + 1700485571 | 0) << 6 | r >>> 26) + n | 0) | ~f)) + e[3] - 1894986606 | 0) << 10 | o >>> 22) + r | 0) ^ ((f = ((f += (r ^ (o | ~n)) + e[10] - 1051523 | 0) << 15 | f >>> 17) + o | 0) | ~r)) + e[1] - 2054922799 | 0) << 21 | n >>> 11) + f | 0, n = ((n += ((o = ((o += (n ^ ((r = ((r += (f ^ (n | ~o)) + e[8] + 1873313359 | 0) << 6 | r >>> 26) + n | 0) | ~f)) + e[15] - 30611744 | 0) << 10 | o >>> 22) + r | 0) ^ ((f = ((f += (r ^ (o | ~n)) + e[6] - 1560198380 | 0) << 15 | f >>> 17) + o | 0) | ~r)) + e[13] + 1309151649 | 0) << 21 | n >>> 11) + f | 0, n = ((n += ((o = ((o += (n ^ ((r = ((r += (f ^ (n | ~o)) + e[4] - 145523070 | 0) << 6 | r >>> 26) + n | 0) | ~f)) + e[11] - 1120210379 | 0) << 10 | o >>> 22) + r | 0) ^ ((f = ((f += (r ^ (o | ~n)) + e[2] + 718787259 | 0) << 15 | f >>> 17) + o | 0) | ~r)) + e[9] - 343485551 | 0) << 21 | n >>> 11) + f | 0, t[0] = r + t[0] | 0, t[1] = n + t[1] | 0, t[2] = f + t[2] | 0, t[3] = o + t[3] | 0;
			}
			function n(t) {
				var e, r = [];
				for (e = 0; e < 64; e += 4) r[e >> 2] = t.charCodeAt(e) + (t.charCodeAt(e + 1) << 8) + (t.charCodeAt(e + 2) << 16) + (t.charCodeAt(e + 3) << 24);
				return r;
			}
			function f(t) {
				var e, r = [];
				for (e = 0; e < 64; e += 4) r[e >> 2] = t[e] + (t[e + 1] << 8) + (t[e + 2] << 16) + (t[e + 3] << 24);
				return r;
			}
			function o(t) {
				var e, f, o, i, s, a, h = t.length, u = [
					1732584193,
					-271733879,
					-1732584194,
					271733878
				];
				for (e = 64; e <= h; e += 64) r(u, n(t.substring(e - 64, e)));
				for (f = (t = t.substring(e - 64)).length, o = [
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0
				], e = 0; e < f; e += 1) o[e >> 2] |= t.charCodeAt(e) << (e % 4 << 3);
				if (o[e >> 2] |= 128 << (e % 4 << 3), e > 55) for (r(u, o), e = 0; e < 16; e += 1) o[e] = 0;
				return i = (i = 8 * h).toString(16).match(/(.*?)(.{0,8})$/), s = parseInt(i[2], 16), a = parseInt(i[1], 16) || 0, o[14] = s, o[15] = a, r(u, o), u;
			}
			function i(t) {
				var r, n = "";
				for (r = 0; r < 4; r += 1) n += e[t >> 8 * r + 4 & 15] + e[t >> 8 * r & 15];
				return n;
			}
			function s(t) {
				var e;
				for (e = 0; e < t.length; e += 1) t[e] = i(t[e]);
				return t.join("");
			}
			function a(t) {
				return /[\u0080-\uFFFF]/.test(t) && (t = unescape(encodeURIComponent(t))), t;
			}
			function h(t) {
				var e, r = [], n = t.length;
				for (e = 0; e < n - 1; e += 2) r.push(parseInt(t.substr(e, 2), 16));
				return String.fromCharCode.apply(String, r);
			}
			function u() {
				this.reset();
			}
			return s(o("hello")), "undefined" == typeof ArrayBuffer || ArrayBuffer.prototype.slice || function() {
				function e(t, e) {
					return (t = 0 | t || 0) < 0 ? Math.max(t + e, 0) : Math.min(t, e);
				}
				ArrayBuffer.prototype.slice = function(r, n) {
					var f, o, i, s, a = this.byteLength, h = e(r, a), u = a;
					return n !== t && (u = e(n, a)), h > u ? /* @__PURE__ */ new ArrayBuffer(0) : (f = u - h, o = new ArrayBuffer(f), i = new Uint8Array(o), s = new Uint8Array(this, h, f), i.set(s), o);
				};
			}(), u.prototype.append = function(t) {
				return this.appendBinary(a(t)), this;
			}, u.prototype.appendBinary = function(t) {
				this._buff += t, this._length += t.length;
				var e, f = this._buff.length;
				for (e = 64; e <= f; e += 64) r(this._hash, n(this._buff.substring(e - 64, e)));
				return this._buff = this._buff.substring(e - 64), this;
			}, u.prototype.end = function(t) {
				var e, r, n = this._buff, f = n.length, o = [
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0
				];
				for (e = 0; e < f; e += 1) o[e >> 2] |= n.charCodeAt(e) << (e % 4 << 3);
				return this._finish(o, f), r = s(this._hash), t && (r = h(r)), this.reset(), r;
			}, u.prototype.reset = function() {
				return this._buff = "", this._length = 0, this._hash = [
					1732584193,
					-271733879,
					-1732584194,
					271733878
				], this;
			}, u.prototype.getState = function() {
				return {
					buff: this._buff,
					length: this._length,
					hash: this._hash.slice()
				};
			}, u.prototype.setState = function(t) {
				return this._buff = t.buff, this._length = t.length, this._hash = t.hash, this;
			}, u.prototype.destroy = function() {
				delete this._hash, delete this._buff, delete this._length;
			}, u.prototype._finish = function(t, e) {
				var n, f, o, i = e;
				if (t[i >> 2] |= 128 << (i % 4 << 3), i > 55) for (r(this._hash, t), i = 0; i < 16; i += 1) t[i] = 0;
				n = (n = 8 * this._length).toString(16).match(/(.*?)(.{0,8})$/), f = parseInt(n[2], 16), o = parseInt(n[1], 16) || 0, t[14] = f, t[15] = o, r(this._hash, t);
			}, u.hash = function(t, e) {
				return u.hashBinary(a(t), e);
			}, u.hashBinary = function(t, e) {
				var r = s(o(t));
				return e ? h(r) : r;
			}, u.ArrayBuffer = function() {
				this.reset();
			}, u.ArrayBuffer.prototype.append = function(t) {
				var e, n, o, i, s, a = (n = this._buff.buffer, o = t, i = !0, (s = new Uint8Array(n.byteLength + o.byteLength)).set(new Uint8Array(n)), s.set(new Uint8Array(o), n.byteLength), i ? s : s.buffer), h = a.length;
				for (this._length += t.byteLength, e = 64; e <= h; e += 64) r(this._hash, f(a.subarray(e - 64, e)));
				return this._buff = e - 64 < h ? new Uint8Array(a.buffer.slice(e - 64)) : new Uint8Array(0), this;
			}, u.ArrayBuffer.prototype.end = function(t) {
				var e, r, n = this._buff, f = n.length, o = [
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0,
					0
				];
				for (e = 0; e < f; e += 1) o[e >> 2] |= n[e] << (e % 4 << 3);
				return this._finish(o, f), r = s(this._hash), t && (r = h(r)), this.reset(), r;
			}, u.ArrayBuffer.prototype.reset = function() {
				return this._buff = new Uint8Array(0), this._length = 0, this._hash = [
					1732584193,
					-271733879,
					-1732584194,
					271733878
				], this;
			}, u.ArrayBuffer.prototype.getState = function() {
				var t, e = u.prototype.getState.call(this);
				return e.buff = (t = e.buff, String.fromCharCode.apply(null, new Uint8Array(t))), e;
			}, u.ArrayBuffer.prototype.setState = function(t) {
				return t.buff = function(t, e) {
					var r, n = t.length, f = new ArrayBuffer(n), o = new Uint8Array(f);
					for (r = 0; r < n; r += 1) o[r] = t.charCodeAt(r);
					return e ? o : f;
				}(t.buff, !0), u.prototype.setState.call(this, t);
			}, u.ArrayBuffer.prototype.destroy = u.prototype.destroy, u.ArrayBuffer.prototype._finish = u.prototype._finish, u.ArrayBuffer.hash = function(t, e) {
				var n = s(function(t) {
					var e, n, o, i, s, a, h = t.length, u = [
						1732584193,
						-271733879,
						-1732584194,
						271733878
					];
					for (e = 64; e <= h; e += 64) r(u, f(t.subarray(e - 64, e)));
					for (n = (t = e - 64 < h ? t.subarray(e - 64) : new Uint8Array(0)).length, o = [
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						0,
						0
					], e = 0; e < n; e += 1) o[e >> 2] |= t[e] << (e % 4 << 3);
					if (o[e >> 2] |= 128 << (e % 4 << 3), e > 55) for (r(u, o), e = 0; e < 16; e += 1) o[e] = 0;
					return i = (i = 8 * h).toString(16).match(/(.*?)(.{0,8})$/), s = parseInt(i[2], 16), a = parseInt(i[1], 16) || 0, o[14] = s, o[15] = a, r(u, o), u;
				}(new Uint8Array(t)));
				return e ? h(n) : n;
			}, u;
		});
	})(), 1);
	self.onmessage = function(t) {
		const { file: e, chunkSize: r } = t.data;
		if (!e) return void self.postMessage({ error: "No file provided" });
		const n = new i.default.ArrayBuffer();
		let f = 0;
		const o = Math.ceil(e.size / r), s = new FileReader();
		function a() {
			const t = f * r, n = Math.min(t + r, e.size);
			s.readAsArrayBuffer(e.slice(t, n));
		}
		s.onload = function(t) {
			if (n.append(t.target.result), f++, self.postMessage({ md5Progress: f / o * 100 }), f < o) a();
			else {
				const t = n.end();
				self.postMessage({ hash: t });
			}
		}, s.onerror = function() {
			self.postMessage({ error: "Error reading file" });
		}, a();
	};
})();

//# sourceMappingURL=fileUpload-BxpSYRsf.js.map