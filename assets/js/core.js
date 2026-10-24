// Shared state, derived loan plan, formatting, form fields and chart helpers.
import * as F from './finance.js';
import { RULES } from './config.js';

/* ---------- state ---------- */
const KEY = 'mf:v1';
const today = new Date();
const firstPay = { y: today.getMonth() >= 10 ? today.getFullYear() + 1 : today.getFullYear(), m: ((today.getMonth() + 2) % 12) + 1 };

export const DEFAULTS = {
  mode: 'buy',
  buy: { price: 450000, downMode: 'pct', downPct: 10, downAmt: 45000, ratePct: 6.25, termYears: 30, loanType: 'conventional', credit: 740,
    taxPct: 1.1, insAnnual: 1900, hoa: 0, pmiPct: '', vaSubsequent: false, vaExempt: false, financeFee: true, closingPct: 3, startY: firstPay.y, startM: firstPay.m },
  own: { originalAmount: 380000, originalValue: 425000, originalTermYears: 30, balance: 362000, ratePct: 6.875, remainingMonths: 324, monthlyPI: '',
    taxMonthly: 420, insMonthly: 160, hoa: 0, miKind: 'pmi', miMonthly: 175, mipLife: true, nextY: firstPay.y, nextM: firstPay.m },
  extras: { monthly: 0, annual: 0, annualMonth: 12, oneTimeAmt: 0, oneTimeK: 12, biweekly: false },
  pmi: { removal: 'request', currentValue: '', targetYears: 3 },
  refi: { newRatePct: 5.75, newTermYears: 30, costs: 6500, pointsPct: 0, roll: false, stayYears: 7 },
  afford: { income: 125000, debts: 650, down: 60000, credit: 740 },
  compare: { military: false, vaSubsequent: false, rural: false, usdaIncomeOk: true, adjFha: -0.25, adjVa: -0.375, adjUsda: -0.25, adjJumbo: 0.25, adjArm: -0.5 },
  arm: { initialRatePct: 5.625, fixedYears: 5, adjustEvery: 6, caps: '2/1/5', marginPct: 2.75, indexPct: 4.3, fixedRatePct: 6.25, holdYears: 7 },
  opt: { budget: 200, lump: 5000, investPct: 6 },
};

function merge(base, over) {
  if (!over || typeof over !== 'object') return structuredClone(base);
  const out = Array.isArray(base) ? [] : {};
  for (const k of Object.keys(base)) {
    out[k] = base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) ? merge(base[k], over[k]) : (over[k] !== undefined ? over[k] : base[k]);
  }
  return out;
}

function load() {
  try {
    const h = location.hash.match(/[#&]s=([^&]+)/);
    if (h) return merge(DEFAULTS, JSON.parse(decodeURIComponent(escape(atob(h[1].replace(/-/g, '+').replace(/_/g, '/'))))));
  } catch {}
  try { return merge(DEFAULTS, JSON.parse(localStorage.getItem(KEY))); } catch { return structuredClone(DEFAULTS); }
}

export const state = load();
const subs = new Set();
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
export function emit() {
  for (const fn of subs) fn();
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
export function get(path) { return path.split('.').reduce((o, k) => o?.[k], state); }
export function set(path, value, { silent = false } = {}) {
  const keys = path.split('.'); const last = keys.pop();
  const obj = keys.reduce((o, k) => o[k], state); obj[last] = value;
  if (!silent) emit();
}
export function replaceState(next) { const m = merge(DEFAULTS, next); for (const k of Object.keys(m)) state[k] = m[k]; emit(); }
export function shareUrl(s = state) {
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(s)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return location.origin + location.pathname + '#s=' + b64;
}

/* ---------- derive the active loan plan from state ---------- */
export function derive(s = state) {
  const ex = s.extras;
  const extras = { monthly: +ex.monthly || 0, annual: +ex.annual || 0, annualMonth: +ex.annualMonth || 12,
    oneTime: +ex.oneTimeAmt > 0 ? [{ k: +ex.oneTimeK || 1, amount: +ex.oneTimeAmt }] : [], biweekly: !!ex.biweekly };

  if (s.mode === 'own') {
    const o = s.own;
    const originalTerm = (+o.originalTermYears || 30) * 12;
    const remaining = Math.max(1, Math.round(+o.remainingMonths || 1));
    const kind = o.miKind;
    const mi = kind === 'pmi' ? { kind, monthly: +o.miMonthly || 0, removal: s.pmi.removal }
      : (kind === 'fha' || kind === 'usda') ? { kind, annualPct: (+o.miMonthly || 0) * 1200 / Math.max(1, +o.balance), maxMonths: kind === 'fha' && !o.mipLife ? 132 : Infinity }
      : { kind: 'none' };
    const plan = { principal: +o.balance, ratePct: +o.ratePct, months: remaining, start: { y: +o.nextY, m: +o.nextM }, fixedPI: +o.monthlyPI || 0,
      homeValue: +o.originalValue, monthsElapsed: Math.max(0, originalTerm - remaining), originalTerm,
      taxMonthly: +o.taxMonthly || 0, insMonthly: +o.insMonthly || 0, hoaMonthly: +o.hoa || 0, mi, extras };
    return { plan, info: { mode: 'own', loanType: kind === 'fha' ? 'fha' : kind === 'usda' ? 'usda' : 'conventional', loan: +o.balance, price: +o.originalValue,
      ltv: (+o.balance / Math.max(1, +o.originalValue)) * 100, upfrontFee: 0, down: 0, miLabel: miLabel(mi) } };
  }

  const b = s.buy;
  const price = +b.price || 0;
  const down = b.downMode === 'pct' ? price * (+b.downPct || 0) / 100 : +b.downAmt || 0;
  const baseLoan = Math.max(0, price - down);
  const ltv = price ? (baseLoan / price) * 100 : 0;
  const downPct = price ? (down / price) * 100 : 0;
  const months = (+b.termYears || 30) * 12;
  let loan = baseLoan, upfrontFee = 0, mi = { kind: 'none' }, pmiPct = 0;
  const type = b.loanType;
  if (type === 'conventional' || type === 'jumbo') {
    pmiPct = b.pmiPct === '' || b.pmiPct == null ? F.estimatePmiPct(ltv, +b.credit) : +b.pmiPct;
    if (ltv > 80) mi = { kind: 'pmi', monthly: baseLoan * pmiPct / 1200, removal: s.pmi.removal, pct: pmiPct };
  } else if (type === 'fha') {
    upfrontFee = baseLoan * RULES.fha.upfrontPct / 100;
    mi = { kind: 'fha', annualPct: F.fhaAnnualMipPct(baseLoan, ltv, months), maxMonths: F.fhaMipMonths(ltv) };
  } else if (type === 'va') {
    upfrontFee = baseLoan * F.vaFundingFeePct(downPct, b.vaSubsequent, b.vaExempt) / 100;
  } else if (type === 'usda') {
    upfrontFee = baseLoan * RULES.usda.upfrontPct / 100;
    mi = { kind: 'usda', annualPct: RULES.usda.annualPct, maxMonths: Infinity };
  }
  if (b.financeFee) loan += upfrontFee;
  const tax = price * (+b.taxPct || 0) / 1200;
  const plan = { principal: loan, ratePct: +b.ratePct, months, start: { y: +b.startY, m: +b.startM }, homeValue: price, monthsElapsed: 0, originalTerm: months,
    taxMonthly: tax, insMonthly: (+b.insAnnual || 0) / 12, hoaMonthly: +b.hoa || 0, mi, extras };
  const closing = baseLoan * (+b.closingPct || 0) / 100;
  return { plan, info: { mode: 'buy', loanType: type, price, down, downPct, baseLoan, loan, ltv, upfrontFee, pmiPct, closing,
    cashToClose: down + closing + (b.financeFee ? 0 : upfrontFee), miLabel: miLabel(mi), jumbo: baseLoan > RULES.conformingLimit } };
}

function miLabel(mi) {
  if (mi.kind === 'pmi') return 'PMI';
  if (mi.kind === 'fha') return 'FHA MIP';
  if (mi.kind === 'usda') return 'USDA annual fee';
  return 'Mortgage insurance';
}

/** Monthly PITI for the first month. */
export function firstMonth(res, plan) {
  const r = res.rows[0] || { mi: 0 };
  const pi = res.payment;
  return { pi, mi: r.mi, tax: plan.taxMonthly, ins: plan.insMonthly, hoa: plan.hoaMonthly, total: pi + r.mi + plan.taxMonthly + plan.insMonthly + plan.hoaMonthly };
}

/* ---------- formatting ---------- */
const nf0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const $0 = (n) => (isFinite(n) ? nf0.format(Math.round(n)) : '—');
export const $2 = (n) => (isFinite(n) ? nf2.format(n) : '—');
export const pct = (n, d = 2) => (isFinite(n) ? (+n).toFixed(d).replace(/\.?0+$/, '') + '%' : '—');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const ym = (d) => (d ? `${MON[d.m - 1]} ${d.y}` : '—');
export const dateAt = (plan, k) => (k == null || !isFinite(k) ? null : F.monthOf(plan.start, k));
export function dur(months) {
  if (months == null || !isFinite(months)) return '—';
  const m = Math.round(Math.abs(months)); const y = Math.floor(m / 12), r = m % 12;
  return [y && `${y} yr`, r && `${r} mo`].filter(Boolean).join(' ') || '0 mo';
}
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- fields ---------- */
let uid = 0;
/**
 * field({ path, label, kind: 'money'|'pct'|'num'|'years'|'select'|'check'|'seg'|'month', min, max, step, slider, tip, hint, options })
 * Returns an HTML string; call bindFields(root) after inserting.
 */
export function field(o) {
  const id = 'f' + (++uid);
  const v = get(o.path);
  const tip = o.tip ? ` <span class="tip" tabindex="0" role="note" aria-label="${esc(o.tip)}" data-tip="${esc(o.tip)}">?</span>` : '';
  const hint = o.hint ? `<p class="hint">${o.hint}</p>` : '';
  if (o.kind === 'check') {
    return `<label class="check"><input type="checkbox" data-path="${o.path}" ${v ? 'checked' : ''}> <span>${o.label}${tip}</span></label>${hint}`;
  }
  if (o.kind === 'seg') {
    return `<div class="f"><span class="lbl" id="${id}">${o.label}${tip}</span><div class="seg" role="group" aria-labelledby="${id}">${o.options.map(([val, lab]) =>
      `<button type="button" data-seg="${o.path}" data-val="${esc(val)}" aria-pressed="${String(v) === String(val)}">${lab}</button>`).join('')}</div>${hint}</div>`;
  }
  if (o.kind === 'select') {
    return `<div class="f"><label for="${id}">${o.label}${tip}</label><select id="${id}" data-path="${o.path}" data-type="${o.numeric ? 'num' : 'str'}">${o.options.map(([val, lab]) =>
      `<option value="${esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${lab}</option>`).join('')}</select>${hint}</div>`;
  }
  const pre = o.kind === 'money' ? '$' : '';
  const post = o.kind === 'pct' ? '%' : o.kind === 'years' ? 'yrs' : o.post || '';
  const shown = v === '' || v == null ? '' : o.kind === 'money' ? Math.round(+v).toLocaleString('en-US') : v;
  const slider = o.slider ? `<input type="range" aria-label="${esc(o.label)} slider" data-range="${o.path}" min="${o.min ?? 0}" max="${o.max ?? 100}" step="${o.step ?? 1}" value="${v === '' ? (o.min ?? 0) : v}">` : '';
  return `<div class="f"><label for="${id}">${o.label}${tip}</label>
    <div class="affix">${pre ? `<span class="pre">${pre}</span>` : ''}<input id="${id}" type="text" inputmode="decimal" autocomplete="off" data-path="${o.path}" data-kind="${o.kind}"
      ${o.placeholder ? `placeholder="${esc(o.placeholder)}"` : ''} value="${esc(shown)}" class="${pre ? 'has-pre' : ''} ${post ? 'has-post' : ''}">${post ? `<span class="post">${post}</span>` : ''}</div>${slider}${hint}</div>`;
}

const parseNum = (s) => { const n = parseFloat(String(s).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : ''; };

export function bindFields(root, onChange) {
  root.querySelectorAll('input[data-path]').forEach((el) => {
    const path = el.dataset.path;
    if (el.type === 'checkbox') { el.addEventListener('change', () => { set(path, el.checked); onChange?.(path); }); return; }
    el.addEventListener('input', () => {
      const n = parseNum(el.value);
      set(path, n === '' && el.placeholder ? '' : n === '' ? 0 : n);
      const r = root.querySelector(`input[data-range="${path}"]`); if (r && n !== '') r.value = n;
      onChange?.(path);
    });
    el.addEventListener('blur', () => { if (el.dataset.kind === 'money' && el.value !== '') el.value = Math.round(parseNum(el.value) || 0).toLocaleString('en-US'); });
  });
  root.querySelectorAll('input[data-range]').forEach((el) => {
    const path = el.dataset.range;
    el.addEventListener('input', () => {
      const n = +el.value; set(path, n);
      const t = root.querySelector(`input[data-path="${path}"]`);
      if (t) t.value = t.dataset.kind === 'money' ? Math.round(n).toLocaleString('en-US') : n;
      onChange?.(path);
    });
  });
  root.querySelectorAll('select[data-path]').forEach((el) => el.addEventListener('change', () => {
    set(el.dataset.path, el.dataset.type === 'num' ? +el.value : el.value); onChange?.(el.dataset.path);
  }));
  root.querySelectorAll('button[data-seg]').forEach((el) => el.addEventListener('click', () => {
    const path = el.dataset.seg; const cur = get(path);
    const val = typeof cur === 'number' ? +el.dataset.val : typeof cur === 'boolean' ? el.dataset.val === 'true' : el.dataset.val;
    root.querySelectorAll(`button[data-seg="${path}"]`).forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
    set(path, val); onChange?.(path, true);
  }));
}

/* ---------- charts (Chart.js, global) ---------- */
const charts = new Map();
export function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
export function chart(canvas, config) {
  if (!canvas || !window.Chart) return null;
  const C = window.Chart;
  C.defaults.font.family = "'Public Sans', system-ui, sans-serif";
  C.defaults.color = css('--ink-3');
  C.defaults.borderColor = css('--grid');
  let c = charts.get(canvas);
  if (c && c.config.type === config.type) {
    c.data = config.data; c.options = config.options; c.update('none'); return c;
  }
  c?.destroy();
  c = new C(canvas, config);
  charts.set(canvas, c);
  return c;
}
export function destroyCharts() { for (const c of charts.values()) c.destroy(); charts.clear(); }
export const money = (v) => (Math.abs(v) >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : Math.abs(v) >= 1000 ? '$' + Math.round(v / 1000) + 'k' : '$' + Math.round(v));
export function baseOptions(extra = {}) {
  return {
    responsive: true, maintainAspectRatio: false, animation: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', align: 'start', labels: { boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 3, color: css('--ink-2') } },
      tooltip: { backgroundColor: css('--ink'), titleColor: css('--sheet'), bodyColor: css('--sheet'), padding: 10, cornerRadius: 8, boxPadding: 4,
        callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${$0(ctx.parsed.y ?? ctx.parsed)}` } },
    },
    scales: {
      x: { grid: { display: false }, border: { color: css('--axis') }, ticks: { maxRotation: 0, autoSkipPadding: 18, color: css('--ink-3') } },
      y: { grid: { color: css('--grid') }, border: { display: false }, ticks: { callback: money, color: css('--ink-3') } },
    },
    ...extra,
  };
}

export function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('on');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2200);
}

export function download(name, text, type = 'text/csv') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
