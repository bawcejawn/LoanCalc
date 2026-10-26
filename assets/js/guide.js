// Plain-language helpers: "How this page works" box, tap-to-explain words, and the Help drawer.
import { WORDS, INLINE, PAGES } from './help.js';
import { esc } from './core.js';
import { ux, saveUx, resetUx } from './ux.js';

/** A short guide at the top of each tool. Open the first time someone visits a page, folded after that. */
export function guideBox(el, id) {
  const g = PAGES[id];
  const results = el.querySelector('.results');
  if (!g || !results || id === 'start') return;
  const first = (ux.visits[id] || 0) <= 1 && !ux.guidesClosed?.[id];
  const box = document.createElement('details');
  box.className = 'guide';
  box.open = first;
  box.innerHTML = `<summary><span class="guide-q">?</span> How this page works</summary>
    <p class="guide-what">${esc(g.what)}</p>
    <ol class="guide-steps">${g.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    ${g.numbers.length ? `<dl class="guide-nums">${g.numbers.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>` : ''}
    ${g.watch ? `<p class="guide-watch"><b>Good to know:</b> ${esc(g.watch)}</p>` : ''}`;
  box.addEventListener('toggle', () => { ux.guidesClosed = { ...(ux.guidesClosed || {}), [id]: !box.open }; saveUx(); });
  results.prepend(box);
}

/** Underline hard words and explain them on hover or tap. First time each word appears in a panel. */
export function glossify(root) {
  if (!root) return;
  const skip = 'BUTTON,INPUT,SELECT,OPTION,TEXTAREA,A,SCRIPT,STYLE,CANVAS,SUMMARY,LABEL,TH,DT';
  for (const panel of root.querySelectorAll('.results > section.sheet, .results > .guide')) {
    if (panel.matches('.guide, .lenders, .next-up')) continue;
    const used = new Set([...panel.querySelectorAll('.term')].map((t) => t.dataset.word));
    const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest(skip) || n.parentElement.closest('.term') || !n.nodeValue.trim() ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      for (const w of INLINE) {
        if (used.has(w)) continue;
        const caseSensitive = w === w.toUpperCase();
        const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, caseSensitive ? '' : 'i');
        const m = node.nodeValue.match(re);
        if (!m) continue;
        const after = node.splitText(m.index);
        after.nodeValue = after.nodeValue.slice(m[0].length);
        const span = document.createElement('span');
        span.className = 'term'; span.tabIndex = 0; span.dataset.word = w; span.dataset.tip = WORDS[w] || WORDS[w.toLowerCase()];
        span.setAttribute('aria-label', `${m[0]}: ${span.dataset.tip}`);
        span.textContent = m[0];
        node.parentNode.insertBefore(span, after);
        used.add(w);
        break; // one word per text node keeps it light
      }
    }
  }
}

/** The Help button: what this page does, every word explained, and a way to start over. */
export function initHelp() {
  const btn = document.getElementById('help-btn');
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', () => open());
}

function open() {
  const id = document.body.dataset.tool || 'start';
  const g = PAGES[id] || PAGES.start;
  document.querySelector('.drawer')?.remove();
  const d = document.createElement('div');
  d.className = 'drawer';
  d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', 'Help');
  d.innerHTML = `<div class="drawer-back"></div><aside class="drawer-panel">
    <div class="drawer-head"><h2>Help</h2><button type="button" class="btn small" data-close>Close</button></div>
    <h3>This page</h3><p>${esc(g.what)}</p>
    <ol class="guide-steps">${g.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    ${g.watch ? `<p class="guide-watch"><b>Good to know:</b> ${esc(g.watch)}</p>` : ''}
    <h3>Words to know</h3>
    <input type="search" class="drawer-find" placeholder="Find a word, like escrow" aria-label="Find a word">
    <dl class="words">${Object.entries(WORDS).map(([w, d2]) => `<div data-w="${esc(w.toLowerCase())}"><dt>${esc(w)}</dt><dd>${esc(d2)}</dd></div>`).join('')}</dl>
    <h3>Start over</h3><p class="hint">Clears your answers and shows the welcome page again. Saved plans are kept.</p>
    <button type="button" class="btn" data-reset>Start over</button>
  </aside>`;
  document.body.appendChild(d);
  const close = () => { d.remove(); document.getElementById('help-btn')?.focus(); };
  d.querySelector('[data-close]').addEventListener('click', close);
  d.querySelector('.drawer-back').addEventListener('click', close);
  d.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  d.querySelector('.drawer-find').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    d.querySelectorAll('.words > div').forEach((x) => { x.hidden = q && !x.dataset.w.includes(q) && !x.textContent.toLowerCase().includes(q); });
  });
  d.querySelector('[data-reset]').addEventListener('click', () => {
    resetUx(); try { localStorage.removeItem('mf:v1'); } catch {}
    location.href = document.body.dataset.root || './';
  });
  d.querySelector('[data-close]').focus();
}
