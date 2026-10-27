// Rent vs buy: net worth of each path, year by year, with the same money spent either way.
import { state, derive, bindFields, field, $0, pct, chart, css, baseOptions, money } from '../core.js';
import * as F from '../finance.js';
import { syncDownPct, inputsPanel, stateField } from './shared.js';

export function mount(el) {
  syncDownPct();
  el.innerHTML = `<form class="inputs" aria-label="Rent vs buy inputs" onsubmit="return false"></form>
  <div class="results">
    <section class="sheet"><h2>Renting or buying: which leaves you richer?</h2><div id="rb-verdict"></div><dl class="stats" id="rb-stats"></dl></section>
    <section class="sheet"><h2>What you'd own, year by year</h2>
      <p class="lede">Buying: the home's value after selling costs, minus what you still owe, plus any money you saved. Renting: the money you didn't spend on a down payment and bills, invested.</p>
      <div class="chart-box"><canvas id="rb-chart" role="img" aria-label="Net worth from buying and from renting by year"></canvas></div></section>
    <section class="sheet"><h2>Your first month</h2><table class="ledger" id="rb-month"></table></section>
    <section class="sheet"><h2>How this works</h2><p class="hint">Both paths spend the same money. The buyer pays the down payment and closing costs; the renter invests that cash instead. Each month, whoever pays less invests the difference. Rent goes up each year by the rent increase; home value, insurance and taxes grow with home prices. Upkeep is a yearly percent of the home's value. Selling costs come off the home's value at the end. Income-tax effects are left out because most buyers take the standard deduction.</p></section>
    <div class="slot" data-slot="results"></div>
  </div>`;
  inputsPanel(el.querySelector('.inputs'), () => `<h2>Renting</h2>
    ${field({ path: 'rvb.rent', label: 'Rent for a similar home (per month)', kind: 'money', slider: true, min: 500, max: 8000, step: 50 })}
    ${field({ path: 'rvb.stayYears', label: 'Years you expect to stay', kind: 'years', slider: true, min: 1, max: 30, step: 1 })}
    <h2>Buying</h2>
    ${field({ path: 'buy.price', label: 'Home price', kind: 'money', slider: true, min: 50000, max: 2000000, step: 5000 })}
    ${field({ path: 'buy.downPct', label: 'Down payment', kind: 'pct', slider: true, min: 0, max: 50, step: 0.5 })}
    ${field({ path: 'buy.ratePct', label: 'Interest rate', kind: 'pct', slider: true, min: 2, max: 10, step: 0.125 })}
    <details class="more-opts"><summary>More options <span>state, growth rates, upkeep, selling costs</span></summary>
      ${stateField()}
      ${field({ path: 'buy.taxPct', label: 'Property tax (per year)', kind: 'pct' })}
      ${field({ path: 'buy.insAnnual', label: 'Home insurance (per year)', kind: 'money' })}
      ${field({ path: 'buy.hoa', label: 'HOA dues (per month)', kind: 'money' })}
      ${field({ path: 'buy.closingPct', label: 'Closing costs to buy', kind: 'pct' })}
      ${field({ path: 'rvb.maintPct', label: 'Upkeep and repairs (per year, % of value)', kind: 'pct', tip: 'A common rule of thumb is about 1% of the home\'s value each year.' })}
      ${field({ path: 'rvb.appreciationPct', label: 'Home prices grow (per year)', kind: 'pct' })}
      ${field({ path: 'rvb.rentGrowthPct', label: 'Rent goes up (per year)', kind: 'pct' })}
      ${field({ path: 'rvb.investPct', label: 'Savings earn (per year)', kind: 'pct', tip: 'What money you don\'t spend could earn invested. Higher numbers favor renting.' })}
      ${field({ path: 'rvb.sellPct', label: 'Selling costs', kind: 'pct', tip: 'Agent fees and other costs when you sell, as a percent of the price.' })}
      ${field({ path: 'rvb.rentersIns', label: 'Renters insurance (per month)', kind: 'money' })}
    </details>`, bindFields);
  const update = () => render(el);
  update();
  return { update };
}

function render(el) {
  const s = state; const v = s.rvb;
  const d = derive({ ...s, mode: 'buy', buy: { ...s.buy, downMode: 'pct' } });
  const { plan, info } = d;
  const res = F.amortize({ ...plan, extras: {} }, { withExtras: false });
  const pmiMonthly = res.rows[0]?.mi || 0;
  const out = F.rentVsBuy({ price: info.price, down: info.down, closing: info.closing, ratePct: plan.ratePct, termMonths: plan.months, loanAmount: plan.principal,
    pmiMonthly, pmiEndK: res.miEnd, taxPct: +s.buy.taxPct, insAnnual: +s.buy.insAnnual, hoa: +s.buy.hoa, maintPct: +v.maintPct, appreciationPct: +v.appreciationPct,
    sellPct: +v.sellPct, rent: +v.rent, rentGrowthPct: +v.rentGrowthPct, rentersIns: +v.rentersIns, investPct: +v.investPct, years: 30,
    upfrontFee: s.buy.financeFee ? 0 : info.upfrontFee });
  const stay = Math.min(30, Math.max(1, +v.stayYears));
  const y = out.years[stay - 1];
  const diff = y.buyWorth - y.rentWorth;
  const be = out.breakEvenYear;
  el.querySelector('#rb-verdict').innerHTML = `<p class="${diff >= 0 ? 'good' : 'note'}" style="margin:0 0 6px"><b>${diff >= 0 ? 'Buying' : 'Renting'} comes out about ${$0(Math.abs(diff))} ahead</b> if you stay ${stay} year${stay > 1 ? 's' : ''}.
    ${be ? `Buying pulls ahead after about <b>${be} year${be > 1 ? 's' : ''}</b> and stays ahead.` : 'With these numbers, renting stays ahead for the full 30 years.'}</p>
    <p class="hint" style="margin:0 0 4px">This is an estimate. Small changes in home prices, rent increases or what savings earn can flip the answer, so try a few. <span class="sure sure-estimate">Estimate</span></p>`;
  el.querySelector('#rb-stats').innerHTML = [
    ['If you buy, after ' + stay + ' yrs', $0(y.buyWorth)], ['If you rent, after ' + stay + ' yrs', $0(y.rentWorth)],
    ['Home equity then', $0(y.equity)], ['Buying breaks even', be ? `${be} yrs` : 'Not within 30 yrs'],
  ].map(([a, b]) => `<div class="stat"><dt>${a}</dt><dd>${b}</dd></div>`).join('');

  const labels = out.years.map((r) => `Yr ${r.year}`);
  const o = baseOptions();
  o.plugins.tooltip.callbacks.label = (c) => ` ${c.dataset.label}: ${$0(c.parsed.y)}`;
  chart(el.querySelector('#rb-chart'), { type: 'line', data: { labels, datasets: [
    { label: 'Buy', data: out.years.map((r) => r.buyWorth), borderColor: css('--c1'), backgroundColor: css('--c1'), borderWidth: 2, pointRadius: labels.map((_, i) => (i === stay - 1 ? 4 : 0)) },
    { label: 'Rent', data: out.years.map((r) => r.rentWorth), borderColor: css('--c2'), backgroundColor: css('--c2'), borderWidth: 2, pointRadius: labels.map((_, i) => (i === stay - 1 ? 4 : 0)) },
  ] }, options: o });

  const m = res.rows[0] || {};
  const tax = info.price * +s.buy.taxPct / 1200, ins = +s.buy.insAnnual / 12, maint = info.price * +v.maintPct / 1200;
  const buyM = res.payment + pmiMonthly + tax + ins + +s.buy.hoa + maint;
  el.querySelector('#rb-month').innerHTML = `<thead><tr><th>Buying</th><th></th></tr></thead><tbody>
    <tr><td>Loan payment</td><td>${$0(res.payment)}</td></tr>${pmiMonthly ? `<tr><td>PMI / mortgage insurance</td><td>${$0(pmiMonthly)}</td></tr>` : ''}
    <tr><td>Property tax</td><td>${$0(tax)}</td></tr><tr><td>Home insurance</td><td>${$0(ins)}</td></tr>${+s.buy.hoa ? `<tr><td>HOA</td><td>${$0(+s.buy.hoa)}</td></tr>` : ''}
    <tr><td>Upkeep and repairs</td><td>${$0(maint)}</td></tr></tbody>
    <tfoot><tr><td>Buying per month</td><td>${$0(buyM)}</td></tr><tr><td>Renting per month (rent + insurance)</td><td>${$0(+v.rent + +v.rentersIns)}</td></tr>
    <tr><td style="font-weight:400">Cash to buy up front (down payment + closing costs)</td><td style="font-weight:400">${$0(info.down + info.closing)}</td></tr></tfoot>`;
}
