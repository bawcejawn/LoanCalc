// Extra-payment optimizer: ranks strategies and compares prepaying vs investing
import { state, set, derive, bindFields, field, $0, dur, chart, css, baseOptions, money } from '../core.js';
import * as F from '../finance.js';
import { modeSwitch, loanInputs, inputsPanel, remount } from './shared.js';

export function mount(el) {
  el.innerHTML = `<form class="inputs" aria-label="Optimizer inputs" onsubmit="return false"></form>
  <div class="results">
    <section class="sheet"><h2>Best ways to use your extra money</h2><p class="lede">Ranked by interest and mortgage insurance saved.</p>
      <div class="chart-box short"><canvas id="op-chart" role="img" aria-label="Savings by strategy"></canvas></div>
      <div class="scroll" style="max-height:none;margin-top:14px"><table class="ledger" id="op-table"></table></div></section>
    <section class="sheet"><h2>Pay down the mortgage, or invest?</h2><div id="op-invest"></div></section>
    <div class="slot" data-slot="results"></div>
  </div>`;
  inputsPanel(el.querySelector('.inputs'), () => `<h2>Your extra money</h2>
    ${field({ path: 'opt.budget', label: 'Extra I can pay each month', kind: 'money', slider: true, min: 0, max: 2000, step: 25 })}
    ${field({ path: 'opt.lump', label: 'Lump sum I could pay now', kind: 'money' })}
    ${field({ path: 'opt.investPct', label: 'Expected investment return', kind: 'pct', slider: true, min: 0, max: 12, step: 0.25, tip: 'A yearly return you think you could earn instead. Stocks have averaged more than mortgage rates over long periods, with real risk; a savings account earns less.' })}
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

  const inv = o.invest;
  el.querySelector('#op-invest').innerHTML = !inv ? '<p class="hint">Set a monthly amount to compare.</p>' : `
    <p class="lede">Both paths spend the same ${$0(+state.opt.budget)} extra each month. Prepaying, then investing your whole payment once the loan is gone, versus investing the ${$0(+state.opt.budget)} from day one. Measured on your original payoff date.</p>
    <div class="cols">
      <div class="col ${inv.winner === 'prepay' ? 'pick' : ''}"><h3>Prepay the mortgage</h3><div class="big">${$0(inv.prepayThenInvest)}</div><p class="hint">Guaranteed return equal to your ${plan.ratePct}% rate${plan.mi.kind !== 'none' ? ', plus earlier end to mortgage insurance' : ''}.</p></div>
      <div class="col ${inv.winner === 'invest' ? 'pick' : ''}"><h3>Invest at ${inv.returnPct}%</h3><div class="big">${$0(inv.investOnly)}</div><p class="hint">Not guaranteed. Ignores taxes on gains and the mortgage-interest deduction.</p></div>
    </div>
    <p class="hint" style="margin-top:10px">Before either: keep an emergency fund, take any employer retirement match, and pay off debts with higher rates than your mortgage.</p>`;
}
