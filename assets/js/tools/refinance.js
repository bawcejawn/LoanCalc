// Refinance break-even
import { state, set, bindFields, field, $0, pct, dur, chart, css, baseOptions, dateAt, ym } from '../core.js';
import * as F from '../finance.js';
import { inputsPanel, root, monthOptions } from './shared.js';

export function mount(el) {
  el.innerHTML = `<form class="inputs" aria-label="Refinance inputs" onsubmit="return false"></form>
  <div class="results">
    <section class="sheet"><h2>Is refinancing worth it?</h2><div id="rf-verdict"></div><dl class="stats" id="rf-stats"></dl></section>
    <section class="sheet"><h2>Your advantage from refinancing, month by month</h2><p class="lede">Cash you keep from lower payments, minus closing costs you paid, minus any extra balance you still owe. Above zero means you're ahead.</p>
      <div class="chart-box"><canvas id="rf-chart" role="img" aria-label="Net advantage of refinancing over time"></canvas></div></section>
    <section class="sheet"><h2>Get the most from a refinance</h2><ul class="levers" id="rf-tips"></ul></section>
    <div class="slot" data-slot="results"></div>
  </div>`;
  inputsPanel(el.querySelector('.inputs'), () => `<h2>Your loan today</h2>
    <p class="hint">Shared with "My current loan". <a href="${root()}mortgage-statement-reader/">Fill in from a statement</a>.</p>
    ${field({ path: 'own.balance', label: 'Current balance', kind: 'money', slider: true, min: 10000, max: 1500000, step: 1000 })}
    ${field({ path: 'own.ratePct', label: 'Current rate', kind: 'pct', slider: true, min: 2, max: 10, step: 0.125 })}
    ${field({ path: 'own.remainingMonths', label: 'Payments left', kind: 'num', post: 'mo', slider: true, min: 12, max: 480, step: 1 })}
    ${field({ path: 'own.monthlyPI', label: 'Current principal + interest', kind: 'money', placeholder: 'Calculated if blank' })}
    <h2>The new loan</h2>
    ${field({ path: 'refi.newRatePct', label: 'New rate', kind: 'pct', slider: true, min: 2, max: 10, step: 0.125 })}
    ${field({ path: 'refi.newTermYears', label: 'New term', kind: 'seg', options: [[10, '10'], [15, '15'], [20, '20'], [25, '25'], [30, '30']] })}
    ${field({ path: 'refi.costs', label: 'Closing costs', kind: 'money', tip: 'Lender fees, appraisal, title. Usually 2–5% of the loan. Check the Loan Estimate.' })}
    ${field({ path: 'refi.pointsPct', label: 'Discount points', kind: 'num', post: 'pts', tip: 'One point costs 1% of the loan and typically lowers the rate about 0.25 points.' })}
    ${field({ path: 'refi.roll', kind: 'check', label: 'Add closing costs to the new loan' })}
    ${field({ path: 'refi.stayYears', label: 'Years I expect to keep the loan', kind: 'years', slider: true, min: 1, max: 30, step: 1 })}`, bindFields, ['refi.newTermYears']);
  const update = () => render(el);
  update();
  return { update };
}

function render(el) {
  const o = state.own, f = state.refi;
  const r = F.refinance({ balance: +o.balance, ratePct: +o.ratePct, remainingMonths: +o.remainingMonths, currentPI: +o.monthlyPI || 0,
    newRatePct: +f.newRatePct, newTermMonths: +f.newTermYears * 12, costs: +f.costs, pointsPct: +f.pointsPct, rollCosts: f.roll, stayYears: +f.stayYears });
  const stay = +f.stayYears * 12;
  const good = r.breakEven && r.breakEven <= stay && r.netAtStay > 0;
  el.querySelector('#rf-verdict').innerHTML = good
    ? `<p class="good"><b>Likely worth it.</b> You break even after ${dur(r.breakEven)} and come out ${$0(r.netAtStay)} ahead after ${f.stayYears} years.</p>`
    : r.savings <= 0
      ? `<p class="note"><b>Not worth it on these numbers.</b> The new payment isn't lower than your current one.</p>`
      : `<p class="note"><b>Probably not worth it.</b> ${r.breakEven ? `You wouldn't break even until ${dur(r.breakEven)}, after you plan to move or refinance again.` : 'Once closing costs and the longer term are counted, you never come out ahead.'}</p>`;
  el.querySelector('#rf-stats').innerHTML = [
    ['New principal + interest', `${$0(r.newPI)} <small>was ${$0(r.oldPI)}</small>`, ''],
    ['Monthly change', (r.savings >= 0 ? '−' : '+') + $0(Math.abs(r.savings)), r.savings > 0 ? 'keep' : ''],
    ['True break-even', r.breakEven ? dur(r.breakEven) : 'Never', ''],
    ['Simple break-even', r.simpleBreakEven ? dur(r.simpleBreakEven) : '—', ''],
    [`Ahead after ${f.stayYears} years`, $0(r.netAtStay), r.netAtStay > 0 ? 'keep' : ''],
    ['Lifetime interest', `${$0(r.lifetimeInterestNew)} <small>was ${$0(r.lifetimeInterestOld)}</small>`, ''],
  ].map(([a, b, k]) => `<div class="stat"><dt>${a}</dt><dd class="${k}">${b}</dd></div>`).join('');

  const labels = r.net.map((_, i) => (i % 12 === 11 ? `Yr ${(i + 1) / 12}` : ''));
  const o2 = baseOptions();
  o2.plugins.legend.display = false;
  o2.plugins.tooltip.callbacks.title = (c) => `Month ${c[0].dataIndex + 1}`;
  o2.scales.x.ticks.autoSkip = false;
  o2.scales.x.ticks.callback = function (v, i) { return (i + 1) % 60 === 0 ? `Year ${(i + 1) / 12}` : ''; };
  chart(el.querySelector('#rf-chart'), { type: 'line', data: { labels, datasets: [
    { label: 'Advantage', data: r.net, borderColor: css('--c1'), borderWidth: 2, pointRadius: 0, fill: { target: { value: 0 }, above: css('--keep-wash'), below: 'transparent' } },
    { label: 'Break-even line', data: r.net.map(() => 0), borderColor: css('--ink-3'), borderWidth: 1, borderDash: [4, 4], pointRadius: 0 },
  ] }, options: o2 });

  const tips = [];
  if (r.termAdded > 0) tips.push(`<li><b>Keep paying your old amount</b><span class="amt">${r.keepPaymentMonths && isFinite(r.keepPaymentMonths) ? dur(r.keepPaymentMonths) : '—'}</span><p>The new loan adds ${dur(r.termAdded)} to your payoff. Paying ${$0(r.oldPI)} a month on it instead finishes in the time shown, keeping the lower rate without stretching the debt.</p></li>`);
  if (+f.newTermYears === 30) {
    const r15 = F.refinance({ balance: +o.balance, ratePct: +o.ratePct, remainingMonths: +o.remainingMonths, currentPI: +o.monthlyPI || 0, newRatePct: +f.newRatePct - 0.5, newTermMonths: 180, costs: +f.costs, pointsPct: +f.pointsPct, rollCosts: f.roll, stayYears: +f.stayYears });
    tips.push(`<li><b>Compare a 15-year refinance</b><span class="amt ${r15.newPI > r.oldPI ? 'cost' : ''}">${$0(r15.newPI)}/mo</span><p>At about 0.5 points lower (${pct(+f.newRatePct - 0.5, 3)}), lifetime interest would be ${$0(r15.lifetimeInterestNew)} instead of ${$0(r.lifetimeInterestNew)}.</p></li>`);
  }
  tips.push(`<li><b>Ask for a lender credit or no-cost refi</b><span class="amt cost">Trade-off</span><p>A slightly higher rate in exchange for no closing costs makes the break-even immediate, which helps if you may move within a few years.</p></li>`);
  if (state.own.miKind !== 'none') tips.push(`<li><b>Drop mortgage insurance</b><span class="amt">${$0(+state.own.miMonthly)}/mo</span><p>If your home is now worth enough that the new loan is 80% of value or less, a conventional refinance has no PMI. That saving isn't in the numbers above.</p></li>`);
  el.querySelector('#rf-tips').innerHTML = tips.join('');
}
