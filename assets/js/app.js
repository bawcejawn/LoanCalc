// MortgageForge app shell: theme, savings ribbon, in-place navigation between tools, optional ads/affiliates/tip jar.
import { state, derive, subscribe, emit, firstMonth, $0, ym, dur, destroyCharts, toast, esc } from './core.js';
import * as F from './finance.js';
import { SITE } from './site-config.js';
import { ux, saveUx, visit, unlock, unlockedTools, suggestionsFor, TOOL_INFO } from './ux.js';

const TOOLS = {
  start: () => import('./tools/start.js'),
  payment: () => import('./tools/payment.js'),
  amortization: () => import('./tools/amortization.js'),
  pmi: () => import('./tools/pmi.js'),
  compare: () => import('./tools/compare.js'),
  refinance: () => import('./tools/refinance.js'),
  afford: () => import('./tools/afford.js'),
  optimize: () => import('./tools/optimize.js'),
  arm: () => import('./tools/arm.js'),
  import: () => import('./tools/import.js'),
  scenarios: () => import('./tools/scenarios.js'),
  savings: () => import('./tools/savings.js'),
  credit: () => import('./tools/credit.js'),
};

let current = null;
const toolEl = () => document.getElementById('tool');

/* ---------- theme ---------- */
function initTheme() {
  let t = null;
  try { t = localStorage.getItem('mf:theme'); } catch {}
  if (t) document.documentElement.dataset.theme = t;
  document.getElementById('theme-btn')?.addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('mf:theme', next); } catch {}
    remount();
  });
}

/* ---------- savings ribbon ---------- */
let lastSaved = 0;
function ribbon() {
  const r = document.getElementById('ribbon');
  if (!r) return;
  const { plan, info } = derive();
  const c = F.compareExtras(plan);
  const res = c.withEx;
  const m = firstMonth(res, plan);
  const saved = c.interestSaved + c.miSaved;
  const miEnd = plan.mi.kind === 'none' ? null : res.miEnd ? ym(F.monthOf(plan.start, res.miEnd)) : 'Never';
  const root = document.body.dataset.root || './';
  const quiet = document.body.dataset.tool === 'start' && !ux.onboarded;
  r.hidden = quiet;
  r.innerHTML = `
    <div class="rb primary"><dt>${info.mode === 'own' ? 'My payment' : 'Monthly payment'}</dt><dd>${$0(m.total)}</dd></div>
    <div class="rb"><dt>Paid off</dt><dd>${ym(res.payoff)}</dd></div>
    ${miEnd ? `<div class="rb"><dt>${info.miLabel} ends</dt><dd>${miEnd}</dd></div>` : ''}
    <div class="rb keep"><dt>You keep</dt><dd>${saved > 0.5 ? `<span id="rb-saved">${$0(saved)}</span> <small style="font-size:12px;font-weight:500;opacity:.8">${dur(c.monthsSaved)} sooner</small>` : `<a href="${root}mortgage-savings-check/">Find savings</a>`}</dd></div>`;
  if (saved > 0.5 && Math.abs(saved - lastSaved) > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) countUp(document.getElementById('rb-saved'), lastSaved, saved);
  lastSaved = saved;
}
function countUp(node, from, to) {
  const t0 = performance.now(), d = 450;
  const step = (t) => { const p = Math.min(1, (t - t0) / d); const e = 1 - Math.pow(1 - p, 3); if (node.isConnected) node.textContent = $0(from + (to - from) * e); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/* ---------- tools ---------- */
async function mountTool(id) {
  destroyCharts();
  const el = toolEl();
  if (!el || !id) { current = null; return; }
  el.className = 'tool';
  const load = TOOLS[id] || TOOLS.payment;
  const mod = await load();
  current = mod.mount(el) || null;
  visit(id);
  if (id !== 'start') { progressive(el, id); suggest(el, id); }
  buildNav();
  fillSlots(id);
}

/* ---------- progressive disclosure ---------- */
// Show the first two result panels; the rest wait behind one button that names what's there.
function progressive(el, id) {
  const results = el.querySelector('.results');
  if (!results) return;
  const secs = [...results.querySelectorAll(':scope > section.sheet')];
  const keep = 2;
  if (secs.length <= keep + 1 || ux.expanded[id]) return;
  const hidden = secs.slice(keep);
  hidden.forEach((s) => s.classList.add('later'));
  const names = hidden.map((s) => s.querySelector('h2')?.textContent?.trim()).filter(Boolean);
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'more-btn';
  btn.innerHTML = `<b>Show ${hidden.length} more</b><span>${names.map(esc).join(' · ')}</span>`;
  hidden[0].before(btn);
  btn.addEventListener('click', () => { hidden.forEach((s) => s.classList.remove('later')); btn.remove(); ux.expanded[id] = true; saveUx(); window.dispatchEvent(new Event('resize')); });
}

// One gentle "next step" card at the end of results, based on what they've opened so far.
function suggest(el, id) {
  const results = el.querySelector('.results');
  if (!results) return;
  const list = suggestionsFor(id, 2);
  if (!list.length) return;
  const root = document.body.dataset.root || './';
  const box = document.createElement('section');
  box.className = 'sheet next-up';
  box.innerHTML = `<h2>Where to next</h2><div class="tool-cards">${list.map((t) => `<a class="tool-card suggest" data-nav data-unlock="${t}" href="${root}${TOOL_INFO[t].path}"><b>${TOOL_INFO[t].name}</b><span>${TOOL_INFO[t].pitch}</span></a>`).join('')}</div>`;
  results.querySelector('.slot') ? results.querySelector('.slot').before(box) : results.append(box);
  box.querySelectorAll('[data-unlock]').forEach((a) => a.addEventListener('click', () => unlock(a.dataset.unlock)));
}

// Sidebar: "Your tools" first (what they came for + what they've opened); everything else folded under "All tools".
let navOriginal = null;
function buildNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  if (!navOriginal) navOriginal = nav.innerHTML;
  const root = document.body.dataset.root || './';
  const mine = unlockedTools();
  const here = document.body.dataset.tool;
  const link = (t) => `<a data-nav href="${root}${TOOL_INFO[t].path}"${t === here ? ' aria-current="page"' : ''}>${TOOL_INFO[t].name}</a>`;
  nav.innerHTML = `<a data-nav href="${root}"${here === 'start' ? ' aria-current="page"' : ''}>Home</a>
    ${mine.length ? `<h2>Your tools</h2>${mine.map(link).join('')}` : ''}
    <details class="all-tools"${!mine.length ? '' : ''}><summary>All tools</summary>${navOriginal}</details>`;
  nav.querySelectorAll('.all-tools a[aria-current]').forEach((a) => a.removeAttribute('aria-current'));
}
function remount() { mountTool(document.body.dataset.tool); ribbon(); }

subscribe(() => { current?.update?.(); ribbon(); });
document.addEventListener('mf:nav', () => { buildNav(); ribbon(); });
document.addEventListener('mf:remount', (e) => { remount(); if (e.detail) toast(e.detail); });

/* ---------- in-place navigation (pages are real URLs for SEO; we swap content without a reload) ---------- */
async function go(href, push = true) {
  try {
    const res = await fetch(href, { credentials: 'same-origin' });
    if (!res.ok) throw 0;
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    for (const sel of ['.tool-head', '.article']) {
      const a = document.querySelector(sel), b = doc.querySelector(sel);
      if (a && b) a.replaceWith(b);
    }
    document.title = doc.title;
    for (const sel of ['meta[name="description"]', 'link[rel="canonical"]']) {
      const a = document.querySelector(sel), b = doc.querySelector(sel); if (a && b) a.replaceWith(b);
    }
    document.body.dataset.tool = doc.body.dataset.tool;
    if (push) history.pushState({}, '', href);
    markNav();
    await mountTool(doc.body.dataset.tool);
    window.scrollTo({ top: 0 });
    document.querySelector('.tool-head h1')?.focus({ preventScroll: true });
  } catch { location.href = href; }
}
function markNav() {
  const here = new URL(location.href).pathname.replace(/index\.html$/, '');
  document.querySelectorAll('.nav a').forEach((a) => {
    const p = new URL(a.href).pathname.replace(/index\.html$/, '');
    if (p === here) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-nav]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || location.protocol === 'file:') return;
  e.preventDefault();
  go(a.href);
});
addEventListener('popstate', () => go(location.href, false));

/* ---------- monetization (off unless configured) ---------- */
function fillSlots(toolId) {
  const links = SITE.affiliates.filter((a) => !a.tools || a.tools.includes(toolId));
  document.querySelectorAll('.slot[data-slot="results"]').forEach((s) => {
    s.innerHTML = '';
    if (links.length) s.innerHTML = `<span class="slot-label">Next steps · partner links, we may earn a commission</span><div class="next-steps">${links.map((l) =>
      `<a href="${esc(l.url)}" rel="sponsored noopener" target="_blank">${esc(l.label)}<small>${esc(l.note || '')}</small></a>`).join('')}</div>`;
  });
  if (!SITE.ads.enabled) return;
  const run = () => {
    if (!document.getElementById('ads-js')) {
      const sc = document.createElement('script');
      sc.id = 'ads-js'; sc.async = true; sc.crossOrigin = 'anonymous';
      sc.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE.ads.client}`;
      document.head.appendChild(sc);
    }
    document.querySelectorAll('.slot[data-slot]').forEach((s) => {
      const id = SITE.ads.slots[s.dataset.slot]; if (!id || s.querySelector('ins')) return;
      s.insertAdjacentHTML('beforeend', `<span class="slot-label">Advertisement</span><ins class="adsbygoogle" style="display:block" data-ad-client="${SITE.ads.client}" data-ad-slot="${id}" data-ad-format="auto" data-full-width-responsive="true"></ins>`);
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
    });
  };
  (window.requestIdleCallback || setTimeout)(run, 1500);
}

function tipJar() {
  const t = SITE.tipJar, box = document.getElementById('tip');
  if (!box || !t.enabled || !t.koinAddress) return;
  box.innerHTML = `<button type="button" class="btn small" id="tip-btn">Tip in KOIN</button>`;
  box.querySelector('#tip-btn').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(t.koinAddress); toast('KOIN address copied. Thank you!'); } catch { prompt('KOIN address', t.koinAddress); }
  });
  box.insertAdjacentHTML('beforeend', ` <a href="${esc(t.explorer + t.koinAddress)}" rel="noopener" target="_blank">View address</a> <span>${esc(t.message)}</span>`);
}

/* ---------- boot ---------- */
initTheme();
markNav();
if (location.hash.startsWith('#s=')) { emit(); history.replaceState({}, '', location.pathname); toast('Shared scenario loaded'); }
mountTool(document.body.dataset.tool).then(ribbon);
tipJar();
