// Small fallbacks so the site also works on browsers from about 2021 on (e.g. iOS 14-15, older Android Chrome).
// Loaded first by app.js, before any other module runs.
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
}
for (const C of [Array, String]) {
  if (!C.prototype.at) {
    Object.defineProperty(C.prototype, 'at', {
      value(n) { n = Math.trunc(n) || 0; if (n < 0) n += this.length; return n < 0 || n >= this.length ? undefined : this[n]; },
      writable: true, configurable: true,
    });
  }
}
