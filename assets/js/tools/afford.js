// Affordability
import { state, set, bindFields, field, $0, pct } from '../core.js';
import * as F from '../finance.js';
import { inputsPanel } from './shared.js';

const PROFILES = [
  { id: 'comfy', name: 'Comfortable', front: 25, back: 33, note: 'Room to save and absorb surprises.' },
  { id: 'std', name: 'Standard', front: 28, back: 36, note: 'The classic 28/36 rule lenders use as a guide.' },
  { id: 'stretch', name: 'Stretch', front: 31, back: 43, note: 'Near common lender limits. Little cushion.' },
];

export function mount(el) {
  el.innerHTML = `<form class="inputs" aria-label="Affordability inputs" onsubmit="return false"></form>
  <div class="results">
    <section class="sheet"><h2>How much home you can afford</h2><p class="lede" id="af-lede"></p><div class="cols" id="af-cols"></div></section>
    <section class="sheet"><h2>Standard budget, month by month</h2><table class="ledger" id="af-break"></table></section>
    <section class="sheet"><h2>Raise your budget without stretching</h2><ul class="levers" id="af-levers"></ul></section>
    <div class="slot" data-slot="results"></div>
  </div>`;
  inputsPanel(el.querySelector('.inputs'), () => `<h2>Income and debts</h2>
    ${field({ path: 'afford.income', label: 'Household income (before tax, per year)', kind: 'money', slider: true, min: 20000, max: 600000, step: 1000 })}
    ${field({ path: 'afford.debts', label: 'Monthly debt payments', kind: 'money', tip: 'Car, student loan, credit card minimums, child support. Not rent, utilities or groceries.' })}
    ${field({ path: 'afford.down', label: 'Cash for down payment', kind: 'money', slider: true, min: 0, max: 500000, step: 1000 })}
    <h2>Loan assumptions</h2>
    ${field({ path: 'buy.ratePct', label: 'Interest rate', kind: 'pct', slider: true, min: 2, max: 10, step: 0.125 })}
    ${field({ path: 'buy.termYears', label: 'Loan term', kind: 'seg', options: [[15, '15'], [20, '20'], [30, '30']] })}
    ${field({ path: 'buy.taxPct', label: 'Property tax (per year)', kind: 'pct' })}
    ${field({ path: 'buy.insAnnual', label: 'Home insurance (per year)', kind: 'money' })}
    ${field({ path: 'buy.hoa', label: 'HOA dues (per month)', kind: 'money' })}
    ${field({ path: 'afford.credit', label: 'Credit score', kind: 'select', numeric: true, options: [[760, '760+'], [740, '740–759'], [720, '720–739'], [700, '700–719'], [680, '680–699'], [660, '660–679'], [640, '640–659'], [620, '620–639']] })}`, bindFields);
  const update = () => render(el);
  update();
  return { update };
}

function run(p, over = {}) {
  const a = { ...state.afford, ...over };
  const ltvGuess = 90;
  return F.affordability({ income: +a.income, debts: +a.debts, down: +a.down, ratePct: +state.buy.ratePct + (over.rateAdj || 0), termMonths: +state.buy.termYears * 12,
    taxPct: +state.buy.taxPct, insAnnual: +state.buy.insAnnual, hoa: +state.buy.hoa, pmiPct: F.estimatePmiPct(ltvGuess, +a.credit), frontPct: p.front, backPct: p.back });
}

function render(el) {
  const res = PROFILES.map((p) => ({ p, r: run(p) }));
  const std = res[1].r;
  el.querySelector('#af-lede').textContent = std.limitedBy === 'back'
    ? `Your monthly debts are what limit you: ${$0(+state.afford.debts)} a month uses part of the 36% total-debt budget.`
    : 'Your income is what limits you; your other debts are low enough not to matter here.';
  el.querySelector('#af-cols').innerHTML = res.map(({ p, r }) => `<div class="col ${p.id === 'std' ? 'pick' : ''}">
    <h3>${p.name} <span class="badge muted">${p.front}/${p.back}</span></h3>
    <div class="big">${$0(r.price)}</div>
    <p class="hint">${$0(r.breakdown.total)}/mo with ${$0(+state.afford.down)} down (${pct(r.price ? +state.afford.down / r.price * 100 : 0, 1)})</p>
    <p class="hint">${p.note}</p>
    <button type="button" class="btn small" data-price="${r.price}" ${r.price ? '' : 'disabled'}>Plan this home</button></div>`).join('');
  el.querySelectorAll('[data-price]').forEach((b) => b.addEventListener('click', () => {
    set('mode', 'buy', { silent: true }); set('buy.price', +b.dataset.price, { silent: true });
    set('buy.downMode', 'amt', { silent: true }); set('buy.downAmt', +state.afford.down, { silent: true }); set('buy.credit', +state.afford.credit);
    location.href = (document.body.dataset.root || './') + 'mortgage-payment-calculator/';
  }));
  const b = std.breakdown;
  el.querySelector('#af-break').innerHTML = `<tbody>
    <tr><td>Principal & interest</td><td>${$0(b.pi)}</td></tr><tr><td>Property tax</td><td>${$0(b.tax)}</td></tr>
    <tr><td>Home insurance</td><td>${$0(b.ins)}</td></tr>${b.hoa ? `<tr><td>HOA</td><td>${$0(b.hoa)}</td></tr>` : ''}${b.pmi ? `<tr><td>PMI (estimated)</td><td>${$0(b.pmi)}</td></tr>` : ''}
    </tbody><tfoot><tr><td>Housing payment</td><td>${$0(b.total)}</td></tr><tr><td style="font-weight:400">Left from gross monthly income after housing and debts</td><td style="font-weight:400">${$0(+state.afford.income / 12 - b.total - +state.afford.debts)}</td></tr></tfoot>`;

  const lv = [];
  if (+state.afford.debts > 0) {
    const r2 = run(PROFILES[1], { debts: Math.max(0, +state.afford.debts - 200) });
    lv.push(`<li><b>Pay off $200/mo of debt</b><span class="amt">+${$0(r2.price - std.price)}</span><p>Each dollar of monthly debt removed frees a dollar of housing budget when debts are the limit.</p></li>`);
  }
  const r3 = run(PROFILES[1], { rateAdj: -0.5 });
  lv.push(`<li><b>Find a rate 0.5 points lower</b><span class="amt">+${$0(r3.price - std.price)}</span><p>Shop several lenders the same day, or ask about buying down the rate.</p></li>`);
  const r4 = run(PROFILES[1], { down: +state.afford.down + 20000 });
  lv.push(`<li><b>Save $20,000 more for the down payment</b><span class="amt">+${$0(r4.price - std.price)}</span><p>More down means a smaller loan and, past 20%, no PMI.</p></li>`);
  el.querySelector('#af-levers').innerHTML = lv.join('');
}
