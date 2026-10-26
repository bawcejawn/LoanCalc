// Amortization schedule + extra payments + charts
import { derive, bindFields, $0, $2, ym, dateAt, dur, chart, css, baseOptions, download, pct } from '../core.js';
import * as F from '../finance.js';
import { modeSwitch, loanInputs, extrasInputs, inputsPanel } from './shared.js';

let view = 'year';

export function mount(el) {
  el.innerHTML = `<form class="inputs" aria-label="Loan and extra payments" onsubmit="return false"></form>
  <div class="results">
    <section class="sheet"><h2>What extra payments do</h2><dl class="stats" id="am-stats" style="border-top:0;margin-top:0"></dl></section>
    <section class="sheet"><h2>How much you'll still owe</h2><div class="chart-box"><canvas id="am-bal" role="img" aria-label="Loan balance by year, with and without extra payments"></canvas></div></section>
    <section class="sheet"><h2>Where each year's payments go</h2><div class="chart-box"><canvas id="am-split" role="img" aria-label="Principal and interest paid each year"></canvas></div></section>
    <section class="sheet"><h2>Big moments on the way</h2><ul class="levers" id="am-ms"></ul></section>
    <section class="sheet"><div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h2 style="margin:0">Every payment</h2>
      <div class="btn-row"><div class="seg" style="width:auto" role="group" aria-label="Schedule view"><button type="button" data-view="year">Yearly</button><button type="button" data-view="month">Monthly</button></div>
      <button type="button" class="btn small" id="am-csv">Download CSV</button><button type="button" class="btn small" onclick="window.print()">Print</button></div></div>
      <div class="scroll"><table class="ledger" id="am-table"></table></div></section>
    <div class="slot" data-slot="results"></div>
  </div>`;
  inputsPanel(el.querySelector('.inputs'), () => `<h2>Extra payments</h2>${extrasInputs()}
    <details ${matchMedia('(min-width: 1081px)').matches ? '' : ''}><summary class="lbl" style="cursor:pointer;font-weight:600;margin:14px 0 4px">Loan details</summary>${modeSwitch()}${loanInputs({ compact: true })}</details>`, bindFields);
  el.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => { view = b.dataset.view; render(el); }));
  el.querySelector('#am-csv').addEventListener('click', () => csv());
  const update = () => render(el);
  update();
  return { update };
}

function render(el) {
  const { plan } = derive();
  const c = F.compareExtras(plan);
  const { base, withEx } = c;
  const any = withEx.totals.extra > 0;
  el.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));

  el.querySelector('#am-stats').innerHTML = [
    ['Interest saved', any ? $0(c.interestSaved) : '$0', 'keep'],
    ['Paid off sooner by', any ? dur(c.monthsSaved) : '—', 'keep'],
    ['New payoff date', ym(withEx.payoff), ''],
    ['Mortgage insurance saved', $0(c.miSaved), c.miSaved > 0 ? 'keep' : ''],
    ['Total interest', `${$0(withEx.totals.interest)}${any ? ` <small>was ${$0(base.totals.interest)}</small>` : ''}`, ''],
    ['Extra paid in', $0(withEx.totals.extra), ''],
  ].map(([a, b, k]) => `<div class="stat"><dt>${a}</dt><dd class="${k}">${b}</dd></div>`).join('')
    + (any ? '' : '<p class="hint" style="grid-column:1/-1">Add an extra amount on the left to see how much sooner you finish and how much interest you keep.</p>');

  const yb = F.yearly(base.rows), ye = F.yearly(withEx.rows);
  const labels = yb.map((y) => String(y.endDate.y));
  const ds = [{ label: 'Original schedule', data: yb.map((y) => y.balance), borderColor: css('--c1'), backgroundColor: css('--c1'), borderWidth: 2, pointRadius: 0, tension: 0.2 }];
  if (any) ds.push({ label: 'With your extra payments', data: labels.map((_, i) => ye[i] ? ye[i].balance : 0), borderColor: css('--c3'), backgroundColor: css('--c3'), borderWidth: 2, pointRadius: 0, tension: 0.2 });
  chart(el.querySelector('#am-bal'), { type: 'line', data: { labels, datasets: ds }, options: baseOptions({ plugins: { ...baseOptions().plugins, legend: { ...baseOptions().plugins.legend, display: ds.length > 1 } } }) });

  chart(el.querySelector('#am-split'), {
    type: 'bar',
    data: { labels: ye.map((y) => String(y.endDate.y)), datasets: [
      { label: 'Principal', data: ye.map((y) => y.principal + y.extra), backgroundColor: css('--c1'), borderRadius: 3, borderSkipped: false, borderColor: css('--sheet'), borderWidth: { top: 1 } },
      { label: 'Interest', data: ye.map((y) => y.interest), backgroundColor: css('--c2'), borderRadius: 3, borderSkipped: false, borderColor: css('--sheet'), borderWidth: { top: 1 } },
      ...(withEx.totals.mi > 0 ? [{ label: 'Mortgage insurance', data: ye.map((y) => y.mi), backgroundColor: css('--c4'), borderRadius: 3, borderSkipped: false }] : []),
    ] },
    options: baseOptions({ scales: { ...baseOptions().scales, x: { ...baseOptions().scales.x, stacked: true }, y: { ...baseOptions().scales.y, stacked: true } } }),
  });

  const ms = withEx.milestones;
  const items = [
    [ms.miEnd, 'Mortgage insurance stops', plan.mi.kind === 'pmi' ? 'Assumes you ask your servicer at 80% loan-to-value. See the PMI tool for every route.' : ''],
    [ms.principalOverInterest, 'More of each payment goes to principal than interest', ''],
    [ms.equity20, 'You own 20% of the home (based on its original value)', ''],
    [ms.halfPaid, 'Half the balance is paid off', ''],
    [withEx.months, 'Loan paid off', any ? `${dur(c.monthsSaved)} early` : ''],
  ].filter(([k]) => k);
  el.querySelector('#am-ms').innerHTML = items.sort((a, b) => a[0] - b[0]).map(([k, t, n]) =>
    `<li><b>${t}</b><span class="amt cost">${ym(dateAt(plan, k))}</span>${n ? `<p>${n}</p>` : ''}</li>`).join('');

  const marks = new Set(items.map(([k]) => k));
  const t = el.querySelector('#am-table');
  if (view === 'year') {
    t.innerHTML = `<thead><tr><th>Year</th><th>Principal</th><th>Extra</th><th>Interest</th><th>Insurance</th><th>Balance</th></tr></thead><tbody>${ye.map((y) =>
      `<tr><td>${y.year} <small style="color:var(--ink-3)">${y.endDate.y}</small></td><td>${$0(y.principal)}</td><td>${$0(y.extra)}</td><td>${$0(y.interest)}</td><td>${$0(y.mi)}</td><td>${$0(y.balance)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Total</td><td>${$0(withEx.totals.principal)}</td><td>${$0(withEx.totals.extra)}</td><td>${$0(withEx.totals.interest)}</td><td>${$0(withEx.totals.mi)}</td><td></td></tr></tfoot>`;
  } else {
    t.innerHTML = `<thead><tr><th>#</th><th>Date</th><th>Principal</th><th>Extra</th><th>Interest</th><th>Insurance</th><th>Balance</th><th>LTV</th></tr></thead><tbody>${withEx.rows.map((r) =>
      `<tr class="${marks.has(r.k) ? 'mark' : ''}"><td>${r.k}</td><td>${ym(r.date)}</td><td>${$2(r.principal)}</td><td>${$2(r.extra)}</td><td>${$2(r.interest)}</td><td>${$2(r.mi)}</td><td>${$2(r.balance)}</td><td>${r.ltv == null ? '' : pct(r.ltv, 1)}</td></tr>`).join('')}</tbody>`;
  }
}

function csv() {
  const { plan } = derive();
  const res = F.amortize(plan);
  const lines = ['payment_number,date,principal,extra,interest,mortgage_insurance,escrow,balance'];
  for (const r of res.rows) lines.push([r.k, `${r.date.y}-${String(r.date.m).padStart(2, '0')}`, r.principal.toFixed(2), r.extra.toFixed(2), r.interest.toFixed(2), r.mi.toFixed(2), r.escrow.toFixed(2), r.balance.toFixed(2)].join(','));
  download('mortgageforge-schedule.csv', lines.join('\n'));
}
