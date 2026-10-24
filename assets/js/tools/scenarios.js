// Saved scenarios: save, compare side by side, share by link, export/import
import { state, derive, replaceState, shareUrl, firstMonth, $0, ym, pct, esc, toast, download } from '../core.js';
import * as F from '../finance.js';

const KEY = 'mf:scenarios';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const write = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { toast('Your browser blocked saving. Use Download instead.'); } };

export function summarize(s) {
  const { plan, info } = derive(s);
  const c = F.compareExtras(plan);
  const r = c.withEx;
  const m = firstMonth(r, plan);
  return { monthly: m.total, pi: m.pi, loan: plan.principal, rate: plan.ratePct, term: plan.months, interest: r.totals.interest, mi: r.totals.mi,
    payoff: r.payoff, saved: c.interestSaved + c.miSaved, miEnd: r.miEnd ? ym(F.monthOf(plan.start, r.miEnd)) : plan.mi.kind === 'none' ? 'None' : 'Life of loan',
    type: info.mode === 'own' ? 'Current loan' : info.loanType, cash: info.cashToClose };
}

export function mount(el) {
  el.classList.add('wide');
  el.innerHTML = `<div class="results">
    <section class="sheet"><h2>Save what you have now</h2>
      <div class="row" style="display:flex;gap:8px;flex-wrap:wrap"><input type="text" id="sc-name" placeholder="Name, e.g. 10% down FHA" style="flex:1;min-width:200px;font:inherit;padding:8px 10px;border:1px solid var(--rule);border-radius:8px;background:var(--field);color:var(--ink)">
      <button type="button" class="btn primary" id="sc-save">Save scenario</button>
      <button type="button" class="btn" id="sc-share">Copy share link</button></div>
      <p class="hint" style="margin-top:8px">Scenarios stay in this browser. A share link carries the numbers inside the link itself; nothing is stored on a server.</p></section>
    <section class="sheet"><h2>Compare</h2><p class="lede">Up to four at a time. Tick the ones to compare.</p><div id="sc-list"></div></section>
    <section class="sheet"><h2>Back up</h2><div class="btn-row"><button type="button" class="btn" id="sc-export">Download all scenarios</button>
      <label class="btn">Restore from file<input type="file" id="sc-import" accept="application/json" class="sr-only"></label></div></section>
  </div>`;
  const list = () => read();
  const draw = () => {
    const items = list();
    const box = el.querySelector('#sc-list');
    if (!items.length) { box.innerHTML = '<p class="hint">No saved scenarios yet. Set up a loan in any tool, then save it here.</p>'; return; }
    const picked = items.filter((x) => x.pick).slice(0, 4);
    const cols = picked.length ? picked : items.slice(0, 4);
    const sums = cols.map((x) => summarize(x.state));
    const best = (key, low = true) => { const v = sums.map((s) => s[key]); const b = low ? Math.min(...v) : Math.max(...v); return (i) => (sums.length > 1 && v[i] === b ? 'pick' : ''); };
    const row = (label, key, fmt, low = true) => { const b = best(key, low); return `<tr><td>${label}</td>${sums.map((s, i) => `<td class="${key ? b(i) : ''}">${fmt(s)}</td>`).join('')}</tr>`; };
    box.innerHTML = `<div class="scroll" style="max-height:none"><table class="ledger cmp"><thead><tr><th></th>${cols.map((c) => `<th>${esc(c.name)}</th>`).join('')}</tr></thead><tbody>
      ${row('Loan', '', (s) => s.type)}
      ${row('Monthly payment', 'monthly', (s) => `<b>${$0(s.monthly)}</b>`)}
      ${row('Loan amount', 'loan', (s) => $0(s.loan))}
      ${row('Rate', 'rate', (s) => pct(s.rate, 3))}
      ${row('Total interest', 'interest', (s) => $0(s.interest))}
      ${row('Mortgage insurance', 'mi', (s) => $0(s.mi))}
      ${row('Insurance ends', '', (s) => s.miEnd)}
      ${row('Saved by extra payments', 'saved', (s) => $0(s.saved), false)}
      ${row('Paid off', '', (s) => ym(s.payoff))}
      ${row('Cash to close', 'cash', (s) => (s.cash ? $0(s.cash) : '—'))}
      </tbody></table></div>
      <ul class="levers" style="margin-top:16px">${items.map((x, i) => `<li><label class="check" style="margin:0"><input type="checkbox" data-pick="${i}" ${x.pick ? 'checked' : ''}> <span><b>${esc(x.name)}</b><br><small style="color:var(--ink-3)">Saved ${new Date(x.at).toLocaleDateString()}</small></span></label>
        <span class="btn-row"><button type="button" class="btn small" data-load="${i}">Open</button><button type="button" class="btn small" data-del="${i}">Delete</button></span></li>`).join('')}</ul>`;
    box.querySelectorAll('[data-pick]').forEach((c) => c.addEventListener('change', () => { const a = list(); a[+c.dataset.pick].pick = c.checked; if (a.filter((x) => x.pick).length > 4) { c.checked = false; a[+c.dataset.pick].pick = false; toast('Compare up to four at a time'); } write(a); draw(); }));
    box.querySelectorAll('[data-load]').forEach((b) => b.addEventListener('click', () => { replaceState(list()[+b.dataset.load].state); toast('Scenario opened'); location.href = document.body.dataset.root || './'; }));
    box.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { const a = list(); a.splice(+b.dataset.del, 1); write(a); draw(); }));
  };
  el.querySelector('#sc-save').addEventListener('click', () => {
    const name = el.querySelector('#sc-name').value.trim() || `Scenario ${list().length + 1}`;
    const a = list(); a.unshift({ name, at: Date.now(), state: structuredClone(state), pick: a.filter((x) => x.pick).length < 4 }); write(a);
    el.querySelector('#sc-name').value = ''; toast('Saved'); draw();
  });
  el.querySelector('#sc-share').addEventListener('click', async () => {
    const url = shareUrl();
    try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { prompt('Copy this link', url); }
  });
  el.querySelector('#sc-export').addEventListener('click', () => download('mortgageforge-scenarios.json', JSON.stringify(list(), null, 2), 'application/json'));
  el.querySelector('#sc-import').addEventListener('change', async (e) => {
    try { const data = JSON.parse(await e.target.files[0].text()); if (!Array.isArray(data)) throw 0; write([...data, ...list()]); toast(`Restored ${data.length}`); draw(); }
    catch { toast('That file is not a MortgageForge backup'); }
  });
  draw();
  return { update() {} };
}
