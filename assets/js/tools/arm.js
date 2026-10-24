// ARM reset projector
import { state, derive, bindFields, field, $0, pct, chart, css, baseOptions } from '../core.js';
import * as F from '../finance.js';
import { inputsPanel } from './shared.js';

export function mount(el) {
  el.innerHTML = `<form class="inputs" aria-label="ARM inputs" onsubmit="return false"></form>
  <div class="results">
    <section class="sheet"><h2>What your payment could do</h2><div id="ar-verdict"></div><div class="chart-box"><canvas id="ar-chart" role="img" aria-label="ARM payment under three rate paths compared with a fixed-rate payment"></canvas></div></section>
    <section class="sheet"><h2>ARM versus fixed</h2><div class="scroll" style="max-height:none"><table class="ledger" id="ar-table"></table></div></section>
    <div class="slot" data-slot="results"></div>
  </div>`;
  inputsPanel(el.querySelector('.inputs'), () => `<h2>The ARM</h2>
    <p class="hint">Loan amount comes from your current plan.</p>
    ${field({ path: 'arm.initialRatePct', label: 'Starting rate', kind: 'pct', slider: true, min: 2, max: 10, step: 0.125 })}
    ${field({ path: 'arm.fixedYears', label: 'Fixed for', kind: 'seg', options: [[3, '3 yrs'], [5, '5 yrs'], [7, '7 yrs'], [10, '10 yrs']] })}
    ${field({ path: 'arm.adjustEvery', label: 'Then adjusts every', kind: 'seg', options: [[6, '6 months'], [12, '12 months']] })}
    ${field({ path: 'arm.caps', label: 'Rate caps', kind: 'select', options: [['2/1/5', '2/1/5'], ['5/1/5', '5/1/5'], ['2/2/5', '2/2/5'], ['5/2/5', '5/2/5'], ['2/2/6', '2/2/6']], tip: 'First adjustment / each later adjustment / lifetime maximum above the starting rate. Listed on your Loan Estimate.' })}
    ${field({ path: 'arm.marginPct', label: 'Margin', kind: 'pct', tip: 'Added to the index (usually 30-day average SOFR) to set your rate after the fixed period.' })}
    ${field({ path: 'arm.indexPct', label: 'Index today', kind: 'pct', tip: 'Look up the current 30-day average SOFR published by the New York Fed.' })}
    <h2>Compare with</h2>
    ${field({ path: 'arm.fixedRatePct', label: '30-year fixed rate', kind: 'pct', slider: true, min: 2, max: 10, step: 0.125 })}
    ${field({ path: 'arm.holdYears', label: 'Years I expect to keep the loan', kind: 'years', slider: true, min: 1, max: 30, step: 1 })}`, bindFields, ['arm.fixedYears', 'arm.adjustEvery']);
  const update = () => render(el);
  update();
  return { update };
}

function render(el) {
  const { plan } = derive();
  const a = state.arm;
  const [ci, cp, cl] = a.caps.split('/').map(Number);
  const common = { principal: plan.principal, months: 360, initialRatePct: +a.initialRatePct, fixedMonths: +a.fixedYears * 12, adjustEvery: +a.adjustEvery,
    capInitial: ci, capPeriodic: cp, capLifetime: cl, marginPct: +a.marginPct, indexPct: +a.indexPct };
  const paths = [
    ['Rates rise to the caps', F.projectArm({ ...common, path: 'worst' }), '--c2'],
    ['Index stays where it is', F.projectArm({ ...common, path: 'flat' }), '--c1'],
    ['Index falls 1 point a year', F.projectArm({ ...common, path: 'down' }), '--c3'],
  ];
  const fixedPmt = F.pmt(plan.principal, +a.fixedRatePct, 360);
  const hold = +a.holdYears * 12;
  const labels = [], step = 6;
  for (let k = 1; k <= 360; k += step) labels.push(`Yr ${Math.floor((k - 1) / 12) + 1}`);
  const o = baseOptions();
  o.scales.x.ticks.callback = function (v, i) { return i % 10 === 0 ? this.getLabelForValue(v) : ''; };
  o.scales.x.ticks.autoSkip = false;
  const ds = paths.map(([label, p, c]) => ({ label, data: labels.map((_, i) => p.rows[i * step]?.payment ?? 0), borderColor: css(c), backgroundColor: css(c), borderWidth: 2, pointRadius: 0, stepped: true }));
  ds.push({ label: `Fixed at ${pct(+a.fixedRatePct, 3)}`, data: labels.map(() => fixedPmt), borderColor: css('--ink-3'), backgroundColor: css('--ink-3'), borderWidth: 1.5, borderDash: [5, 4], pointRadius: 0 });
  chart(el.querySelector('#ar-chart'), { type: 'line', data: { labels, datasets: ds }, options: o });

  const paidBy = (rows, n) => rows.slice(0, n).reduce((s, r) => s + r.payment, 0);
  const balAt = (rows, n) => rows[Math.min(n, rows.length) - 1]?.balance ?? 0;
  const fixedRows = F.projectArm({ ...common, initialRatePct: +a.fixedRatePct, fixedMonths: 360 }).rows;
  const costOf = (rows) => paidBy(rows, hold) - (plan.principal - balAt(rows, hold));
  const fixedCost = costOf(fixedRows);
  const worst = paths[0][1];
  const savedIntro = (fixedPmt - worst.rows[0].payment) * Math.min(hold, +a.fixedYears * 12);
  el.querySelector('#ar-verdict').innerHTML = hold <= +a.fixedYears * 12
    ? `<p class="good" style="margin:0 0 14px">If you sell or refinance within ${a.fixedYears} years, the rate never changes. The ARM saves about <b>${$0(savedIntro)}</b> versus fixed over ${a.holdYears} years.</p>`
    : `<p class="note" style="margin:0 0 14px">You plan to keep the loan past the fixed period. In the worst case the payment can reach <b>${$0(worst.maxPayment)}</b> a month at ${pct(worst.ceiling, 3)}. Make sure that fits your budget.</p>`;
  el.querySelector('#ar-table').innerHTML = `<thead><tr><th></th><th>First payment</th><th>Highest payment</th><th>Interest cost, ${a.holdYears} yrs</th><th>vs fixed</th></tr></thead><tbody>
    ${paths.map(([l, p]) => { const c = costOf(p.rows); return `<tr><td>ARM: ${l.toLowerCase()}</td><td>${$0(p.rows[0].payment)}</td><td>${$0(p.maxPayment)}</td><td>${$0(c)}</td><td style="color:${c < fixedCost ? 'var(--keep)' : 'var(--ink)'}">${c < fixedCost ? '−' : '+'}${$0(Math.abs(c - fixedCost))}</td></tr>`; }).join('')}
    <tr><td>Fixed at ${pct(+a.fixedRatePct, 3)}</td><td>${$0(fixedPmt)}</td><td>${$0(fixedPmt)}</td><td>${$0(fixedCost)}</td><td>—</td></tr></tbody>`;
}
