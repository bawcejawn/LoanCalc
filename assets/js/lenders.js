// Sponsored lender cards and optional privacy-friendly counts.
// Fairness rules: labeled as ads, random order every visit, shown after results (never inside them),
// same layout for every sponsor, and no visitor data is passed to lenders.
import { SITE } from './site-config.js';
import { esc } from './core.js';

const today = new Date().toISOString().slice(0, 10);

function active(page) {
  const L = SITE.lenders;
  if (!L?.enabled || !L.pages.includes(page)) return [];
  const list = L.list.filter((l) => l.name && l.nmls && (!l.until || l.until >= today) && (!l.pages || l.pages.includes(page)));
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list.slice(0, L.maxShown || 3);
}

export function renderLenders(el, page) {
  const results = el.querySelector('.results');
  if (!results) return;
  const list = active(page);
  const root = document.body.dataset.root || './';
  if (!list.length && !SITE.lenders?.houseAd) return;
  if (!SITE.lenders?.enabled || !SITE.lenders.pages.includes(page)) return;
  const box = document.createElement('section');
  box.className = list.length ? 'sheet lenders' : 'lenders house';
  box.setAttribute('aria-label', 'Sponsored lenders');
  box.innerHTML = list.length ? `<div class="lenders-head"><h2>Lenders you can contact</h2><span class="ad-tag">Ad</span></div>
    <p class="hint">These companies pay a flat fee to be listed here. They're shown in random order, they don't see your numbers, and they can't change your results. Compare offers from at least three lenders before you choose.</p>
    <div class="lender-cards">${list.map((l) => `<div class="lender">
      <b>${esc(l.name)}</b>
      ${l.blurb ? `<span>${esc(l.blurb)}</span>` : ''}
      <small>NMLS ID #${esc(l.nmls)} · <a href="https://www.nmlsconsumeraccess.org/" rel="noopener" target="_blank">Look them up</a>${l.license ? ` · ${esc(l.license)}` : ''}</small>
      <span class="btn-row">${l.url ? `<a class="btn small" data-sponsor="${esc(l.id || l.name)}" href="${esc(l.url)}" rel="sponsored noopener" target="_blank">Visit website</a>` : ''}${l.phone ? `<a class="btn small" data-sponsor="${esc(l.id || l.name)}" href="tel:${esc(l.phone.replace(/[^0-9+]/g, ''))}">Call ${esc(l.phone)}</a>` : ''}</span>
    </div>`).join('')}</div>
    <p class="hint" style="margin-top:10px"><a href="${root}advertise/">Advertise here</a></p>`
    : `<a class="house-ad" href="${root}advertise/"><b>Are you a lender or loan officer?</b><span>Reach people who are planning a mortgage right now. Clearly labeled, flat monthly price. <u>Advertise here</u></span></a>`;
  const before = results.querySelector('.next-up') || results.querySelector('.slot');
  before ? before.before(box) : results.append(box);
  box.querySelectorAll('[data-sponsor]').forEach((a) => a.addEventListener('click', () => count(`sponsor-click/${a.dataset.sponsor}`, true)));
  for (const l of list) count(`sponsor-view/${l.id || l.name}`, true);
}

/* ---------- GoatCounter (optional, cookie-free) ---------- */
let loaded = false;
export function initAnalytics() {
  const code = SITE.analytics?.goatcounter;
  if (!code || loaded) return;
  loaded = true;
  const s = document.createElement('script');
  s.async = true; s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
  s.dataset.goatcounterSettings = JSON.stringify({ no_onload: true });
  s.onload = () => pageview();
  document.head.appendChild(s);
}
export function pageview() { try { window.goatcounter?.count?.({ path: location.pathname }); } catch {} }
function count(path, event) { try { window.goatcounter?.count?.({ path, title: path, event }); } catch {} }
