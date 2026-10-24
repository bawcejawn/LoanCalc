// Loan type comparison: Conventional / FHA / VA / USDA / Jumbo / ARM
import { state, set, bindFields, field, $0, pct, dur } from '../core.js';
import * as F from '../finance.js';
import { RULES } from '../config.js';
import { inputsPanel, variant, remount } from './shared.js';

let showAll = false;
const TYPES = [
  { id: 'conventional', name: 'Conventional 30-yr fixed', loanType: 'conventional', minDown: 3, adj: null },
  { id: 'fha', name: 'FHA 30-yr fixed', loanType: 'fha', minDown: 3.5, adj: 'adjFha' },
  { id: 'va', name: 'VA 30-yr fixed', loanType: 'va', minDown: 0, adj: 'adjVa' },
  { id: 'usda', name: 'USDA 30-yr fixed', loanType: 'usda', minDown: 0, adj: 'adjUsda' },
  { id: 'jumbo', name: 'Jumbo 30-yr fixed', loanType: 'jumbo', minDown: 10, adj: 'adjJumbo' },
  { id: 'arm', name: '5/6 ARM', loanType: 'conventional', minDown: 5, adj: 'adjArm' },
];

export function mount(el) {
  if (state.buy.downMode === 'pct') set('buy.downAmt', Math.round(state.buy.price * state.buy.downPct / 100), { silent: true });
  el.innerHTML = `<form class="inputs" aria-label="Comparison inputs" onsubmit="return false"></form>
  <div class="results">
    <section class="sheet"><h2>Side by side</h2><p class="lede">Same home, same cash. The best fit has the lowest cost of borrowing over five years among loans you likely qualify for.</p>
      <div id="cm-pick"></div><div class="scroll" style="max-height:none"><table class="ledger cmp" id="cm-table"></table></div><div id="cm-more" style="margin-top:10px"></div></section>
    <section class="sheet"><h2>How this is calculated</h2><p class="hint">Five-year cost of borrowing = interest + mortgage insurance + upfront program fees + closing costs over the first 60 months. Your down payment isn't counted as a cost because it becomes equity. Rate differences between loan types are typical spreads, not quotes; edit them under "Rate assumptions". Eligibility notes are simplified: lenders set their own credit and income rules.</p></section>
    <div class="slot" data-slot="results"></div>
  </div>`;
  inputsPanel(el.querySelector('.inputs'), () => `<h2>The home</h2>
    ${field({ path: 'buy.price', label: 'Home price', kind: 'money', slider: true, min: 50000, max: 2000000, step: 5000 })}
    ${field({ path: 'buy.downAmt', label: 'Cash for down payment', kind: 'money', slider: true, min: 0, max: 400000, step: 1000, hint: 'Each loan uses this amount or its minimum, whichever is more.' })}
    ${field({ path: 'buy.ratePct', label: 'Conventional rate', kind: 'pct', slider: true, min: 2, max: 10, step: 0.125 })}
    ${field({ path: 'buy.credit', label: 'Credit score', kind: 'select', numeric: true, options: [[760, '760+'], [740, '740–759'], [720, '720–739'], [700, '700–719'], [680, '680–699'], [660, '660–679'], [640, '640–659'], [620, '620–639'], [580, '580–619'], [500, '500–579']] })}
    <h2>About you</h2>
    ${field({ path: 'compare.military', kind: 'check', label: 'I am a veteran, service member, or eligible surviving spouse' })}
    ${field({ path: 'compare.vaSubsequent', kind: 'check', label: 'I have used a VA loan before' })}
    ${field({ path: 'compare.rural', kind: 'check', label: 'The home is in a USDA-eligible rural area' })}
    ${field({ path: 'compare.usdaIncomeOk', kind: 'check', label: 'My household income is under the USDA limit for the area', hint: 'Generally 115% of area median income. Check the USDA eligibility site for the address.' })}
    <details><summary class="lbl" style="cursor:pointer;font-weight:600;margin:14px 0 4px">Rate assumptions</summary>
      ${field({ path: 'compare.adjFha', label: 'FHA vs conventional', kind: 'pct', post: 'pts' })}
      ${field({ path: 'compare.adjVa', label: 'VA vs conventional', kind: 'pct', post: 'pts' })}
      ${field({ path: 'compare.adjUsda', label: 'USDA vs conventional', kind: 'pct', post: 'pts' })}
      ${field({ path: 'compare.adjJumbo', label: 'Jumbo vs conventional', kind: 'pct', post: 'pts' })}
      ${field({ path: 'compare.adjArm', label: 'ARM starting rate vs conventional', kind: 'pct', post: 'pts' })}
    </details>`, bindFields);
  const update = () => render(el);
  update();
  return { update };
}

function eligibility(t, s, loanAmt) {
  const c = s.compare, credit = +s.buy.credit;
  const conforming = loanAmt <= RULES.conformingLimit;
  switch (t.id) {
    case 'conventional': case 'arm':
      if (credit < 620) return [false, 'Most lenders need a 620+ score.'];
      if (!conforming) return [false, `Loan is over the ${$0(RULES.conformingLimit)} conforming limit (higher in high-cost counties).`];
      return [true, t.id === 'arm' ? 'Rate is fixed 5 years, then adjusts every 6 months.' : 'PMI can be cancelled at 80% LTV.'];
    case 'fha':
      if (credit < 500) return [false, 'Needs a 500+ score.'];
      return [true, `${credit < 580 ? 'With a score under 580 you need 10% down. ' : ''}County loan limits apply (2026 floor is about ${$0(Math.round(RULES.conformingLimit * 0.65))}).`];
    case 'va':
      if (!c.military) return [false, 'For eligible veterans, service members and surviving spouses.'];
      return [true, 'No monthly mortgage insurance and no required down payment.'];
    case 'usda':
      if (!c.rural) return [false, 'Only for homes in eligible rural areas.'];
      if (!c.usdaIncomeOk) return [false, 'Household income must be under the area limit.'];
      return [true, 'No down payment required. Primary residence only.'];
    case 'jumbo':
      if (conforming) return [false, 'Not needed: this loan fits under the conforming limit.'];
      if (credit < 700) return [false, 'Jumbo lenders usually want 700+.'];
      return [true, 'Expect stricter reserves and debt-to-income rules.'];
  }
  return [true, ''];
}

function render(el) {
  const s0 = structuredClone(state);
  const price = +s0.buy.price;
  const cash = +s0.buy.downAmt;
  const rows = TYPES.map((t) => {
    let minDown = t.minDown;
    if (t.id === 'fha' && +s0.buy.credit < 580) minDown = 10;
    const downAmt = Math.max(cash, price * minDown / 100);
    const rate = +s0.buy.ratePct + (t.adj ? +s0.compare[t.adj] : 0);
    const v = variant((s) => {
      s.mode = 'buy'; s.buy.loanType = t.loanType; s.buy.downMode = 'amt'; s.buy.downAmt = downAmt; s.buy.ratePct = rate; s.buy.termYears = 30;
      s.buy.financeFee = true; s.buy.pmiPct = ''; s.buy.vaSubsequent = s.compare.vaSubsequent; s.extras = { monthly: 0, annual: 0, oneTimeAmt: 0, biweekly: false };
      s.pmi.removal = 'request';
    }, { withExtras: false });
    const first = v.res.rows.slice(0, 60);
    const cost5 = first.reduce((a, r) => a + r.interest + r.mi, 0) + v.info.upfrontFee + v.info.closing;
    const m = v.res.rows[0];
    const [ok, note] = eligibility(t, s0, v.info.baseLoan);
    const miLast = v.plan.mi.kind === 'none' ? 'None' : v.res.miEnd ? dur(v.res.miEnd - 1) : 'Life of loan';
    return { t, ok, note, minDown, downAmt, rate, info: v.info, res: v.res, monthly: v.res.payment + m.mi + v.plan.taxMonthly + v.plan.insMonthly + v.plan.hoaMonthly, mi: m.mi, miLast, cost5, cashToClose: v.info.cashToClose };
  });
  const eligible = rows.filter((r) => r.ok);
  const fixed = eligible.filter((r) => r.t.id !== 'arm');
  const best = fixed.reduce((a, r) => (!a || r.cost5 < a.cost5 ? r : a), null);
  const arm = eligible.find((r) => r.t.id === 'arm');
  const next = fixed.filter((r) => r !== best).sort((a, b) => a.cost5 - b.cost5)[0];
  el.querySelector('#cm-pick').innerHTML = (best ? `<p class="good" style="margin:0 0 10px"><b>Best fit: ${best.t.name}.</b> ${$0(best.monthly)}/month and ${$0(best.cost5)} to borrow over five years${next ? `, ${$0(next.cost5 - best.cost5)} less than ${next.t.name.replace(' 30-yr fixed', '')}` : ''}.</p>`
      : '<p class="note" style="margin:0 0 10px">None of the fixed-rate loans look like a fit with these inputs. Try more down payment or check credit requirements with a lender.</p>')
    + (arm && best && arm.cost5 < best.cost5 ? `<p class="hint" style="margin:0 0 14px">A 5/6 ARM would cost ${$0(best.cost5 - arm.cost5)} less over five years, but only if you sell or refinance before the rate starts adjusting. <a href="${document.body.dataset.root}arm-calculator/">See the worst case</a>.</p>` : '');
  const shown = showAll ? rows : rows.filter((r) => r.ok);
  const hidden = rows.length - shown.length;
  el.querySelector('#cm-more').innerHTML = hidden || showAll ? `<button type="button" class="btn small" id="cm-toggle">${showAll ? 'Show only loans I likely qualify for' : `Show ${hidden} more loan type${hidden > 1 ? 's' : ''} I may not qualify for`}</button>` : '';
  el.querySelector('#cm-toggle')?.addEventListener('click', () => { showAll = !showAll; render(el); });
  const cell = (r, html) => `<td class="${r === best ? 'pick' : ''} ${r.ok ? '' : 'na'}">${html}</td>`;
  const line = (label, fn) => `<tr><td>${label}</td>${shown.map((r) => cell(r, fn(r))).join('')}</tr>`;
  el.querySelector('#cm-table').innerHTML = `<thead><tr><th></th>${shown.map((r) => `<th class="${r === best ? 'pick' : ''}">${r.t.name}</th>`).join('')}</tr></thead><tbody>
    ${line('Likely eligible', (r) => (r.ok ? 'Yes' : 'No'))}
    ${line('Minimum down', (r) => pct(r.minDown, 1))}
    ${line('Down payment used', (r) => $0(r.downAmt))}
    ${line('Loan amount', (r) => $0(r.info.loan))}
    ${line('Rate', (r) => pct(r.rate, 3))}
    ${line('Principal & interest', (r) => $0(r.res.payment))}
    ${line('Mortgage insurance', (r) => (r.mi ? `${$0(r.mi)}/mo` : '—'))}
    ${line('Insurance lasts', (r) => r.miLast)}
    ${line('Monthly total (PITI)', (r) => `<b>${$0(r.monthly)}</b>`)}
    ${line('Upfront program fee', (r) => (r.info.upfrontFee ? $0(r.info.upfrontFee) + ' <small>(financed)</small>' : '—'))}
    ${line('Cash to close', (r) => $0(r.cashToClose))}
    ${line('5-year cost of borrowing', (r) => `<b>${$0(r.cost5)}</b>`)}
    <tr><td></td>${shown.map((r) => cell(r, `<button type="button" class="btn small" data-use="${r.t.id}" ${r.ok ? '' : 'disabled'}>Use this loan</button>`)).join('')}</tr>
    </tbody>`;
  el.querySelector('#cm-table').insertAdjacentHTML('beforeend', `<tfoot><tr><td>Notes</td>${shown.map((r) => `<td style="white-space:normal;font-weight:400;font-size:12.5px;min-width:150px;text-align:left" class="${r === best ? 'pick' : ''}">${r.note}</td>`).join('')}</tr></tfoot>`);
  el.querySelectorAll('[data-use]').forEach((b) => b.addEventListener('click', () => {
    const r = rows.find((x) => x.t.id === b.dataset.use);
    set('mode', 'buy', { silent: true });
    set('buy.loanType', r.t.loanType, { silent: true }); set('buy.downMode', 'amt', { silent: true }); set('buy.downAmt', Math.round(r.downAmt), { silent: true });
    set('buy.ratePct', r.rate, { silent: true }); set('buy.termYears', 30, { silent: true }); set('buy.financeFee', true);
    location.href = document.body.dataset.root || './';
  }));
}
