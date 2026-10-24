// Credit score impact on rate, PMI and payment (self-reported score, no credit pull)
import { state, derive, bindFields, field, $0, pct, chart, css, baseOptions } from '../core.js';
import * as F from '../finance.js';
import { RULES } from '../config.js';
import { inputsPanel, root } from './shared.js';

export function mount(el) {
  el.innerHTML = `<form class="inputs" aria-label="Credit inputs" onsubmit="return false"></form>
  <div class="results">
    <section class="sheet"><h2>What your credit score is worth</h2><div id="cr-hero"></div>
      <div class="chart-box short"><canvas id="cr-chart" role="img" aria-label="Monthly payment by credit score band"></canvas></div></section>
    <section class="sheet"><h2>Every score band</h2><div class="scroll" style="max-height:none"><table class="ledger cmp" id="cr-table"></table></div>
      <p class="hint" style="margin-top:10px">Rates are estimated from Fannie Mae's loan-level price adjustments (matrix updated September 30, 2026) for a 30-year purchase, converting ${RULES.pointToRate}% of rate per point of price. Lenders add their own pricing, so use this to compare bands, not as a quote. PMI is our estimate.</p></section>
    <section class="sheet"><h2>Raise your score before you apply</h2><ul class="levers">
      <li><b>Get your free reports</b><span class="amt cost">Free</span><p>AnnualCreditReport.com is the official free source for your Equifax, Experian and TransUnion reports. Dispute errors in writing; corrections can take 30 days.</p></li>
      <li><b>Pay card balances down before the statement closes</b><span class="amt cost">30–60 days</span><p>Scores react to the balance reported each month. Keeping each card under 30% of its limit, and ideally under 10%, is one of the fastest ways to gain points.</p></li>
      <li><b>Don't open new credit while you shop</b><span class="amt cost">Avoid</span><p>New accounts and hard inquiries can lower a score. Mortgage rate-shopping inquiries within a short window (14–45 days, by scoring model) count as one.</p></li>
      <li><b>Keep old accounts open and pay on time</b><span class="amt cost">Ongoing</span><p>Payment history is the largest part of most scores. Set autopay for at least the minimum.</p></li>
    </ul></section>
    <section class="sheet"><h2>Why we don't check your credit</h2><p class="hint">A real credit check needs your Social Security number, your written consent and a licensed credit bureau account, and the site would then have to store and protect that data. MortgageForge runs entirely in your browser and never asks for personal identifiers, so pick the band you see in your bank or card app. When you're ready for real quotes, lenders can pre-qualify you with a soft check that doesn't affect your score.</p></section>
    <div class="slot" data-slot="results"></div>
  </div>`;
  inputsPanel(el.querySelector('.inputs'), () => {
    const own = state.mode === 'own';
    return `<h2>Your loan</h2>
    ${field({ path: 'mode', kind: 'seg', label: 'For', options: [['buy', 'A purchase'], ['own', 'A refinance']] })}
    ${own ? field({ path: 'own.balance', label: 'Loan amount', kind: 'money', slider: true, min: 50000, max: 1500000, step: 1000 })
      + field({ path: 'pmi.currentValue', label: "Home's value today", kind: 'money', placeholder: 'Uses original value if blank' })
      + field({ path: 'refi.newRatePct', label: 'Rate you were quoted', kind: 'pct', slider: true, min: 2, max: 10, step: 0.125 })
      + field({ path: 'own.credit', label: 'Your credit score', kind: 'select', numeric: true, options: F.CREDIT_BANDS })
      : field({ path: 'buy.price', label: 'Home price', kind: 'money', slider: true, min: 50000, max: 2000000, step: 5000 })
      + field({ path: 'buy.downPct', label: 'Down payment', kind: 'pct', slider: true, min: 0, max: 50, step: 0.5 })
      + field({ path: 'buy.ratePct', label: 'Rate you were quoted', kind: 'pct', slider: true, min: 2, max: 10, step: 0.125 })
      + field({ path: 'buy.credit', label: 'Your credit score', kind: 'select', numeric: true, options: F.CREDIT_BANDS })}
    <p class="hint">Enter the rate quoted for your current score. Other bands are estimated relative to it.</p>`;
  }, bindFields, ['own.credit', 'buy.credit']);
  const update = () => render(el);
  update();
  return { update };
}

function render(el) {
  const own = state.mode === 'own';
  const { info } = derive();
  const price = own ? (+state.pmi.currentValue || +state.own.originalValue) : +state.buy.price;
  const loan = own ? +state.own.balance : price * (1 - (+state.buy.downPct || 0) / 100);
  const score = +(own ? state.own.credit : state.buy.credit);
  const rate = own ? +state.refi.newRatePct : +state.buy.ratePct;
  const rows = F.creditImpact({ price, loan, ratePct: rate, score });
  const i = rows.findIndex((r) => r.mine);
  const mine = rows[i] || rows[2];
  const best = rows[0];
  const up = rows[Math.max(0, i - 1)];
  el.querySelector('#cr-hero').innerHTML = mine === best
    ? `<p class="good">You're in the top band. Your score isn't costing you anything on this loan.</p>`
    : `<dl class="stats" style="border-top:0;margin-top:0">
      <div class="stat"><dt>Next band up (${up.label})</dt><dd class="keep">−${$0(mine.monthly - up.monthly)}/mo</dd></div>
      <div class="stat"><dt>Top band (780+)</dt><dd class="keep">−${$0(mine.monthly - best.monthly)}/mo</dd></div>
      <div class="stat"><dt>Top band over the loan</dt><dd class="keep">−${$0(mine.lifetime - best.lifetime)}</dd></div>
      <div class="stat"><dt>Loan-to-value</dt><dd>${pct(loan / price * 100, 1)}</dd></div></dl>`;
  const o = baseOptions();
  o.plugins.legend.display = false;
  o.plugins.tooltip.callbacks.label = (c) => ` ${$0(c.parsed.y)}/mo`;
  o.scales.y.ticks.callback = (v) => '$' + Math.round(v).toLocaleString();
  o.scales.y.beginAtZero = false;
  chart(el.querySelector('#cr-chart'), { type: 'bar', data: { labels: rows.map((r) => r.label + (r.mine ? ' (you)' : '')),
    datasets: [{ label: 'Payment + PMI', data: rows.map((r) => r.monthly), backgroundColor: rows.map((r) => (r.mine ? css('--c2') : css('--c1'))), borderRadius: 4, barThickness: 22 }] }, options: o });
  el.querySelector('#cr-table').innerHTML = `<thead><tr><th>Score</th><th>Price adj.</th><th>Est. rate</th><th>Principal & interest</th><th>PMI</th><th>Monthly</th><th>vs you</th><th>Interest + PMI, life of loan</th></tr></thead><tbody>${rows.map((r) =>
    `<tr class="${r.mine ? 'mark' : ''}"><td>${r.label}${r.mine ? ' <b>(you)</b>' : ''}</td><td>${r.llpa.toFixed(3)} pts</td><td>${pct(r.rate, 3)}</td><td>${$0(r.pi)}</td><td>${r.pmiMonthly ? $0(r.pmiMonthly) : '—'}</td><td><b>${$0(r.monthly)}</b></td>
    <td style="color:${r.monthly < mine.monthly ? 'var(--keep)' : 'var(--ink)'}">${r.mine ? '—' : (r.monthly < mine.monthly ? '−' : '+') + $0(Math.abs(r.monthly - mine.monthly))}</td><td>${$0(r.lifetime)}</td></tr>`).join('')}</tbody>`;
}
