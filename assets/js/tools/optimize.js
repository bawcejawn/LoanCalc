// Extra-payment optimizer: ranks strategies and compares prepaying vs investing
import { state, set, derive, bindFields, field, $0, dur, ym, chart, css, baseOptions, money } from '../core.js';
import * as F from '../finance.js';
import { modeSwitch, loanInputs, inputsPanel, remount } from './shared.js';

export function mount(el) {
  el.innerHTML = `<form class="inputs" aria-label="Optimizer inputs" onsubmit="return false"></form>
  <div class="results">
    <section class="sheet"><h2>Best ways to use your extra money</h2><p class="lede">Ranked by interest and mortgage insurance saved.</p>
      <div class="chart-box short"><canvas id="op-chart" role="img" aria-label="Savings by strategy"></canvas></div>
      <div class="scroll" style="max-height:none;margin-top:14px"><table class="ledger" id="op-table"></table></div></section>
    <section class="sheet"><h2>Mortgage-free by a date you choose</h2><div id="op-goal"></div></section>
    <section class="sheet"><h2>Biweekly vs monthly</h2><div id="op-bw"></div></section>
    <section class="sheet"><h2>A lump sum: shorten the loan or lower the payment?</h2><div id="op-recast"></div></section>
    <section class="sheet"><h2>The cost of waiting</h2><div id="op-wait"></div></section>
    <section class="sheet"><h2>Pay down the mortgage, or invest?</h2><div id="op-invest"></div></section>
    <div class="slot" data-slot="results"></div>
  </div>`;
  inputsPanel(el.querySelector('.inputs'), () => `<h2>Your extra money</h2>
    ${field({ path: 'opt.budget', label: 'Extra I can pay each month', kind: 'money', slider: true, min: 0, max: 2000, step: 25 })}
    ${field({ path: 'opt.lump', label: 'Lump sum I could pay now', kind: 'money' })}
    ${field({ path: 'opt.investPct', label: 'Expected investment return', kind: 'pct', slider: true, min: 0, max: 12, step: 0.25, tip: 'A yearly return you think you could earn instead. Stocks have averaged more than mortgage rates over long periods, with real risk; a savings account earns less.' })}
    ${field({ path: 'opt.goalYears', label: 'I want to be mortgage-free in', kind: 'years', slider: true, min: 3, max: 30, step: 1 })}
    <details><summary class="lbl" style="cursor:pointer;font-weight:600;margin:14px 0 4px">Fees and timing</summary>
      ${field({ path: 'opt.biweeklyFee', label: 'Biweekly program enrollment fee', kind: 'money', tip: 'Some servicers and third-party services charge to set up biweekly payments. Paying extra yourself is free.' })}
      ${field({ path: 'opt.recastFee', label: 'Recast fee', kind: 'money', tip: 'Many servicers recast (re-amortize) after a lump sum for $150–$500. Not available on FHA or VA loans.' })}
      ${field({ path: 'opt.delayYears', label: 'If I waited this long to start', kind: 'years', slider: true, min: 1, max: 15, step: 1 })}
    </details>
    <details><summary class="lbl" style="cursor:pointer;font-weight:600;margin:14px 0 4px">Loan details</summary>${modeSwitch()}${loanInputs({ compact: true })}</details>`, bindFields);
  const update = () => render(el);
  update();
  return { update };
}

function render(el) {
  const { plan } = derive();
  const o = F.optimize(plan, { monthlyBudget: +state.opt.budget, lumpSum: +state.opt.lump, investReturnPct: +state.opt.investPct });
  const S = o.strategies;
  const opts = baseOptions({ indexAxis: 'y' });
  opts.plugins.legend.display = false;
  opts.plugins.tooltip.callbacks.label = (c) => ` Saved: ${$0(c.parsed.x)}`;
  opts.scales = { x: { grid: { color: css('--grid') }, border: { display: false }, ticks: { callback: money, color: css('--ink-3') } }, y: { grid: { display: false }, ticks: { color: css('--ink-2') } } };
  chart(el.querySelector('#op-chart'), { type: 'bar', data: { labels: S.map((s) => s.label), datasets: [{ label: 'Saved', data: S.map((s) => s.saved), backgroundColor: css('--c3'), borderRadius: 4, barThickness: 16 }] }, options: opts });

  el.querySelector('#op-table').innerHTML = `<thead><tr><th>Strategy</th><th>Saved</th><th>Paid off sooner</th><th>Saved per $1 extra</th><th></th></tr></thead><tbody>${S.map((s, i) =>
    `<tr class="${i === 0 ? 'mark' : ''}"><td style="white-space:normal">${s.label}<br><small style="color:var(--ink-3)">${s.detail}</small></td><td>${$0(s.saved)}</td><td>${dur(s.monthsSaved)}</td><td>$${s.perDollar.toFixed(2)}</td>
    <td><button type="button" class="btn small" data-apply="${s.id}">Use</button></td></tr>`).join('')}</tbody>`;
  el.querySelectorAll('[data-apply]').forEach((b) => b.addEventListener('click', () => {
    const s = S.find((x) => x.id === b.dataset.apply);
    const e = s.extras;
    set('extras', { monthly: e.monthly || 0, annual: e.annual || 0, annualMonth: e.annualMonth || 12, oneTimeAmt: e.oneTime?.[0]?.amount || 0, oneTimeK: e.oneTime?.[0]?.k || 1, biweekly: !!e.biweekly });
    location.href = (document.body.dataset.root || './') + 'amortization-schedule-calculator/';
  }));

  // payoff goal
  const goalM = +state.opt.goalYears * 12;
  const need = F.extraForPayoff(plan, goalM);
  const goalRes = F.amortize({ ...plan, extras: { monthly: need } });
  el.querySelector('#op-goal').innerHTML = need <= 0 ? `<p class="good">You're already on track to pay off within ${state.opt.goalYears} years (${ym(o.base.payoff)}).</p>`
    : `<dl class="stats" style="border-top:0;margin-top:0">
      <div class="stat"><dt>Extra each month</dt><dd>${$0(need)}</dd></div>
      <div class="stat"><dt>Total toward the loan</dt><dd>${$0(o.base.payment + need)}<small> /mo</small></dd></div>
      <div class="stat"><dt>Paid off</dt><dd>${ym(goalRes.payoff)}</dd></div>
      <div class="stat"><dt>Interest + insurance saved</dt><dd class="keep">${$0(o.base.totals.interest + o.base.totals.mi - goalRes.totals.interest - goalRes.totals.mi)}</dd></div></dl>
      <button type="button" class="btn small" id="op-goal-use">Use this plan</button>`;
  el.querySelector('#op-goal-use')?.addEventListener('click', () => { set('extras', { monthly: need, annual: 0, annualMonth: 12, oneTimeAmt: 0, oneTimeK: 1, biweekly: false }); location.href = (document.body.dataset.root || './') + 'amortization-schedule-calculator/'; });

  // biweekly
  const bw = F.biweeklyCompare(plan, { fee: +state.opt.biweeklyFee || 0 });
  el.querySelector('#op-bw').innerHTML = `<table class="ledger"><thead><tr><th>How you pay</th><th>Paid off in</th><th>Interest</th><th>Fees</th><th>Saved</th></tr></thead><tbody>
    <tr><td>Monthly, as scheduled</td><td>${dur(bw.monthly.months)}</td><td>${$0(bw.monthly.interest)}</td><td>—</td><td>—</td></tr>
    <tr><td>Half every two weeks (26 a year)</td><td>${dur(bw.biweekly.months)}</td><td>${$0(bw.biweekly.interest)}</td><td>${$0(bw.biweekly.fees)}</td><td class="${bw.biweekly.saved > 0 ? '' : ''}" style="color:var(--keep)">${$0(bw.biweekly.saved)}</td></tr>
    <tr class="mark"><td>Monthly + ${$0(bw.twelfth.extra)} (1/12 extra)</td><td>${dur(bw.twelfth.months)}</td><td>${$0(bw.twelfth.interest)}</td><td>$0</td><td style="color:var(--keep)">${$0(bw.twelfth.saved)}</td></tr></tbody></table>
    <p class="hint" style="margin-top:10px">True biweekly saves slightly more only if your servicer applies each half-payment the day it arrives; many hold it until the second half comes in. Adding 1/12 of a payment each month gets nearly the same result for free and on your schedule.</p>`;

  // recast
  const lump = +state.opt.lump || 0;
  if (lump > 0 && lump < plan.principal) {
    const rc = F.recastCompare(plan, { lump, fee: +state.opt.recastFee || 0 });
    el.querySelector('#op-recast').innerHTML = `<div class="cols">
      <div class="col ${rc.keep.interestSaved >= rc.recast.interestSaved ? 'pick' : ''}"><h3>Keep the payment</h3><div class="big">${$0(rc.keep.interestSaved)}</div><p class="hint">interest saved. Paid off ${dur(o.base.months - rc.keep.months)} sooner at ${$0(rc.keep.payment)}/mo.</p></div>
      <div class="col"><h3>Recast for ${$0(rc.recast.fee)}</h3><div class="big">−${$0(rc.recast.monthlyDrop)}<small style="font-size:14px">/mo</small></div><p class="hint">New payment ${$0(rc.recast.payment)}. Saves ${$0(rc.recast.interestSaved)} in interest after the fee; same payoff date.</p></div></div>
      <p class="hint" style="margin-top:10px">Recasting trades some interest savings for a lower required payment and more flexibility. Ask your servicer whether they recast and the minimum lump sum (often $5,000–$10,000).</p>`;
  } else el.querySelector('#op-recast').innerHTML = '<p class="hint">Enter a lump sum on the left to compare.</p>';

  // cost of waiting
  if (+state.opt.budget > 0) {
    const yrs = +state.opt.delayYears || 5;
    const w = F.costOfWaiting(plan, +state.opt.budget, yrs * 12);
    el.querySelector('#op-wait').innerHTML = `<p class="lede" style="margin:0 0 10px">The same ${$0(+state.opt.budget)} a month is worth less the later it starts, because early payments are mostly interest.</p>
      <dl class="stats" style="border-top:0;margin-top:0"><div class="stat"><dt>Start now</dt><dd class="keep">${$0(w.now)}</dd></div><div class="stat"><dt>Start in ${yrs} years</dt><dd>${$0(w.later)}</dd></div><div class="stat"><dt>Cost of waiting</dt><dd>${$0(w.lost)}</dd></div></dl>`;
  } else el.querySelector('#op-wait').innerHTML = '<p class="hint">Set a monthly amount to see this.</p>';

  const inv = o.invest;
  el.querySelector('#op-invest').innerHTML = !inv ? '<p class="hint">Set a monthly amount to compare.</p>' : `
    <p class="lede">Both paths spend the same ${$0(+state.opt.budget)} extra each month. Prepaying, then investing your whole payment once the loan is gone, versus investing the ${$0(+state.opt.budget)} from day one. Measured on your original payoff date.</p>
    <div class="cols">
      <div class="col ${inv.winner === 'prepay' ? 'pick' : ''}"><h3>Prepay the mortgage</h3><div class="big">${$0(inv.prepayThenInvest)}</div><p class="hint">Guaranteed return equal to your ${plan.ratePct}% rate${plan.mi.kind !== 'none' ? ', plus earlier end to mortgage insurance' : ''}.</p></div>
      <div class="col ${inv.winner === 'invest' ? 'pick' : ''}"><h3>Invest at ${inv.returnPct}%</h3><div class="big">${$0(inv.investOnly)}</div><p class="hint">Not guaranteed. Ignores taxes on gains and the mortgage-interest deduction.</p></div>
    </div>
    <p class="hint" style="margin-top:10px">Before either: keep an emergency fund, take any employer retirement match, and pay off debts with higher rates than your mortgage.</p>`;
}
