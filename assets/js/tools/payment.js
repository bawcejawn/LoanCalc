// Payment & PITI calculator
import { state, derive, firstMonth, bindFields, $0, $2, pct, ym, dateAt, dur, chart, css, set, emit } from '../core.js';
import * as F from '../finance.js';
import { RULES } from '../config.js';
import { modeSwitch, loanInputs, inputsPanel, variant, root, remount } from './shared.js';

export function mount(el) {
  el.innerHTML = `<form class="inputs" aria-label="Loan details" onsubmit="return false"></form>
  <div class="results">
    <section class="sheet" aria-labelledby="pp-h"><h2 id="pp-h">Monthly payment</h2>
      <div class="hero"><div class="donut-wrap"><canvas id="pp-donut" aria-label="Payment breakdown chart" role="img"></canvas></div>
      <div><div class="big" id="pp-total"></div><div class="sub" id="pp-sub"></div>
      <table class="ledger" id="pp-break" style="margin-top:14px"></table></div></div>
      <dl class="stats" id="pp-stats"></dl>
    </section>
    <section class="sheet" aria-labelledby="lv-h"><h2 id="lv-h">Ways to pay less</h2><p class="lede">Each one is calculated from your numbers.</p><ul class="levers" id="pp-levers"></ul></section>
    <section class="sheet" id="pp-close-wrap" aria-labelledby="cc-h"><h2 id="cc-h">Cash needed at closing</h2><table class="ledger" id="pp-close"></table></section>
    <div class="slot" data-slot="results"></div>
  </div>`;
  const form = el.querySelector('.inputs');
  inputsPanel(form, () => `<h2>Your loan</h2>${modeSwitch()}${loanInputs()}`, bindFields);
  const update = () => render(el);
  update();
  return { update };
}

function render(el) {
  const { plan, info } = derive();
  const res = F.amortize(plan, { withExtras: false });
  const m = firstMonth(res, plan);
  const parts = [
    ['Principal & interest', m.pi, '--c1'], [info.miLabel, m.mi, '--c2'], ['Property tax', m.tax, '--c3'], ['Home insurance', m.ins, '--c4'], ['HOA dues', m.hoa, '--c5'],
  ].filter((p) => p[1] > 0.004);

  el.querySelector('#pp-total').innerHTML = `${$0(m.total)}<small> /month</small>`;
  el.querySelector('#pp-sub').textContent = info.mode === 'buy'
    ? `${$0(info.loan)} loan at ${pct(plan.ratePct, 3)} for ${plan.months / 12} years${info.upfrontFee ? `, including a ${$0(info.upfrontFee)} upfront fee` : ''}`
    : `${$0(plan.principal)} left at ${pct(plan.ratePct, 3)}, ${dur(plan.months)} to go`;
  el.querySelector('#pp-break').innerHTML = `<tbody>${parts.map(([l, v, c]) => `<tr><td><span class="swatch" style="background:var(${c})"></span>${l}</td><td>${$2(v)}</td></tr>`).join('')}</tbody>`;

  chart(el.querySelector('#pp-donut'), {
    type: 'doughnut',
    data: { labels: parts.map((p) => p[0]), datasets: [{ data: parts.map((p) => p[1]), backgroundColor: parts.map((p) => css(p[2])), borderColor: css('--sheet'), borderWidth: 2, borderRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '68%', animation: false, plugins: { legend: { display: false },
      tooltip: { callbacks: { label: (c) => ` ${c.label}: ${$2(c.parsed)}` } } } },
  });

  const miEnd = res.miEnd ? ym(dateAt(plan, res.miEnd)) : (plan.mi.kind === 'none' ? 'None' : 'Life of loan');
  el.querySelector('#pp-stats').innerHTML = [
    ['Total interest', $0(res.totals.interest)],
    ['Paid off', ym(res.payoff)],
    [plan.mi.kind === 'none' ? 'Mortgage insurance' : `${info.miLabel} ends`, miEnd],
    ['Loan-to-value', pct(info.ltv, 1)],
    ['Total of all payments', $0(res.totals.interest + res.totals.principal + res.totals.mi)],
  ].map(([a, b]) => `<div class="stat"><dt>${a}</dt><dd>${b}</dd></div>`).join('');

  el.querySelector('#pp-levers').innerHTML = levers(plan, info, res, m).join('') || '<li><span>Your loan is already lean. Try the <a href="' + root() + 'extra-payment-calculator/">extra payment optimizer</a>.</span></li>';
  el.querySelectorAll('[data-apply]').forEach((b) => b.addEventListener('click', () => { APPLY[b.dataset.apply]?.(); remount(); }));

  const closeWrap = el.querySelector('#pp-close-wrap');
  closeWrap.hidden = info.mode !== 'buy';
  if (info.mode === 'buy') {
    const rows = [['Down payment', info.down], ['Estimated closing costs', info.closing]];
    if (info.upfrontFee && !state.buy.financeFee) rows.push(['Upfront program fee', info.upfrontFee]);
    el.querySelector('#pp-close').innerHTML = `<tbody>${rows.map(([a, b]) => `<tr><td>${a}</td><td>${$0(b)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Total cash to close</td><td>${$0(info.cashToClose)}</td></tr></tfoot>`;
  }
}

const APPLY = {
  down20: () => { set('buy.downMode', 'pct', { silent: true }); set('buy.downPct', 20, { silent: true }); },
  down10: () => { set('buy.downMode', 'pct', { silent: true }); set('buy.downPct', 10, { silent: true }); },
  term15: () => set('buy.termYears', 15, { silent: true }),
  extra100: () => set('extras.monthly', 100, { silent: true }),
  request: () => set('pmi.removal', 'request', { silent: true }),
};

function levers(plan, info, res, m) {
  const out = [];
  const li = (title, amt, note, apply, cost = false) => `<li><b>${title}</b><span class="amt ${cost ? 'cost' : ''}">${amt}</span><p>${note}</p>${apply ? `<button type="button" class="btn small" data-apply="${apply}">Apply this</button>` : ''}</li>`;
  const total = (r) => r.totals.interest + r.totals.mi;

  if (info.mode === 'buy') {
    const b = state.buy;
    if ((info.loanType === 'conventional' || info.loanType === 'jumbo') && info.ltv > 80) {
      const v = variant((s) => { s.buy.downMode = 'pct'; s.buy.downPct = 20; }, { withExtras: false });
      const vm = firstMonth(v.res, v.plan);
      out.push(li('Put 20% down to skip PMI', `−${$0(m.total - vm.total)}/mo`,
        `Needs ${$0(info.price * 0.2 - info.down)} more down. Saves ${$0(total(res) - total(v.res))} in interest and PMI over the loan.`, 'down20'));
    }
    if (info.loanType === 'fha' && info.ltv > 90) {
      const v = variant((s) => { s.buy.downMode = 'pct'; s.buy.downPct = 10; }, { withExtras: false });
      out.push(li('Put 10% down so FHA MIP ends after 11 years', `−${$0(res.totals.mi - v.res.totals.mi)}`,
        `Below 10% down, FHA mortgage insurance lasts for the life of the loan. Needs ${$0(info.price * 0.1 - info.down)} more down.`, 'down10'));
    }
    const r25 = variant((s) => { s.buy.ratePct = +s.buy.ratePct - 0.25; }, { withExtras: false });
    out.push(li('Get a rate 0.25 points lower', `−${$0(res.payment - r25.res.payment)}/mo`,
      `Worth ${$0(res.totals.interest - r25.res.totals.interest)} over the loan. Compare at least three lender quotes on the same day, or ask what one discount point costs.`));
    if (+b.termYears > 15) {
      const t15 = variant((s) => { s.buy.termYears = 15; }, { withExtras: false });
      out.push(li('Choose a 15-year term', `+${$0(t15.res.payment - res.payment)}/mo`,
        `Saves ${$0(total(res) - total(t15.res))} in interest${res.totals.mi ? ' and mortgage insurance' : ''}, but costs more each month. Rates on 15-year loans are usually lower too.`, 'term15', true));
    }
  }
  const e100 = F.compareExtras({ ...plan, extras: { monthly: 100 } });
  out.push(li('Add $100 to each payment', `−${$0(e100.interestSaved + e100.miSaved)}`,
    `Pays the loan off ${dur(e100.monthsSaved)} sooner.`, 'extra100'));
  if (plan.mi.kind === 'pmi' && state.pmi.removal === 'auto') {
    const t = F.pmiTimeline(plan);
    if (t.request80Scheduled && t.auto78) out.push(li('Ask your servicer to cancel PMI at 80%', `−${$0((t.auto78 - t.request80Scheduled) * plan.mi.monthly)}`,
      `Waiting for automatic removal at 78% costs ${dur(t.auto78 - t.request80Scheduled)} of extra PMI.`, 'request'));
  }
  if (info.mode === 'buy' && info.jumbo && info.loanType !== 'jumbo') {
    out.unshift(`<li><b>This is a jumbo loan</b><span class="amt cost">Over ${$0(RULES.conformingLimit)}</span><p>The 2026 conforming limit for most counties is ${$0(RULES.conformingLimit)} (up to ${$0(RULES.highCostCeiling)} in high-cost areas). Above it, lenders usually want more down and a higher credit score.</p></li>`);
  }
  return out;
}
