// PMI timing & removal
import { state, derive, bindFields, field, $0, ym, dateAt, dur, chart, css, baseOptions, pct } from '../core.js';
import * as F from '../finance.js';
import { RULES } from '../config.js';
import { modeSwitch, loanInputs, inputsPanel, hasExtras, root } from './shared.js';
import { pmiLetter, reminder } from './letters.js';

export function mount(el) {
  el.innerHTML = `<form class="inputs" aria-label="PMI inputs" onsubmit="return false"></form>
  <div class="results">
    <section class="sheet"><h2>When your mortgage insurance can end</h2><div id="pm-body"></div></section>
    <section class="sheet" id="pm-actions-wrap"><h2>Make the request</h2><div id="pm-actions"></div></section>
    <section class="sheet" id="pm-chart-wrap"><h2>Loan-to-value over time</h2><div class="chart-box"><canvas id="pm-ltv" role="img" aria-label="Loan-to-value by month with 80 and 78 percent lines"></canvas></div></section>
    <section class="sheet"><h2>How removal works for your loan type</h2><div id="pm-rules"></div></section>
    <div class="slot" data-slot="results"></div>
  </div>`;
  inputsPanel(el.querySelector('.inputs'), () => `<h2>Your plan</h2>
    ${field({ path: 'pmi.removal', kind: 'seg', label: 'I will', options: [['request', 'Ask at 80%'], ['auto', 'Wait for automatic']] })}
    ${field({ path: 'pmi.currentValue', label: "Today's home value (optional)", kind: 'money', placeholder: 'e.g. from a recent appraisal', tip: 'If your home has gained value, many servicers will cancel PMI early based on a new appraisal.' })}
    ${field({ path: 'pmi.targetYears', label: 'I want PMI gone within', kind: 'years', slider: true, min: 1, max: 10, step: 0.5 })}
    ${field({ path: 'extras.monthly', label: 'Extra principal each month', kind: 'money', slider: true, min: 0, max: 2000, step: 25 })}
    <h2>Loan</h2>${modeSwitch()}${loanInputs({ compact: false })}`, bindFields);
  const update = () => render(el);
  update();
  return { update };
}

function render(el) {
  const { plan, info } = derive();
  const body = el.querySelector('#pm-body');
  el.querySelector('#pm-rules').innerHTML = rulesFor(plan.mi.kind, info);
  const chartWrap = el.querySelector('#pm-chart-wrap');

  if (plan.mi.kind !== 'pmi') {
    el.querySelector('#pm-actions-wrap').hidden = true;
    chartWrap.hidden = plan.mi.kind === 'none';
    if (plan.mi.kind === 'none') {
      body.innerHTML = `<div class="good">${info.loanType === 'va' ? 'VA loans have no monthly mortgage insurance. You pay a one-time funding fee instead.' : 'This loan has no mortgage insurance at 80% loan-to-value or below.'}</div>`;
      return;
    }
    const res = F.amortize(plan);
    const refiK = res.rows.findIndex((r) => r.balance <= plan.homeValue * 0.8) + 1;
    body.innerHTML = `<dl class="stats" style="border-top:0;margin-top:0">
      <div class="stat"><dt>${info.miLabel} this year</dt><dd>${$0(res.rows[0]?.mi * 12 || 0)}</dd></div>
      <div class="stat"><dt>Ends</dt><dd>${res.miEnd ? ym(dateAt(plan, res.miEnd)) : 'Never (life of loan)'}</dd></div>
      <div class="stat"><dt>Left to pay</dt><dd>${$0(res.totals.mi)}</dd></div>
      <div class="stat"><dt>80% LTV reached</dt><dd>${refiK > 0 ? ym(dateAt(plan, refiK + 1)) : '—'}</dd></div></dl>
      <p class="note" style="margin-top:12px">${plan.mi.kind === 'fha' ? 'FHA MIP cannot be cancelled by request.' : 'The USDA annual fee lasts for the life of the loan.'}
      The usual way out is to refinance into a conventional loan once you have 20% equity (around ${refiK > 0 ? ym(dateAt(plan, refiK + 1)) : 'later'} on your schedule, sooner if your home gains value). Run the numbers in the <a href="${root()}refinance-calculator/">refinance calculator</a>.</p>`;
    ltvChart(el, plan);
    return;
  }

  chartWrap.hidden = false;
  el.querySelector('#pm-actions-wrap').hidden = false;
  const cur = +state.pmi.currentValue || 0;
  const t = F.pmiTimeline(plan, cur);
  const monthly = plan.mi.monthly;
  const paid = (k) => (k == null ? null : Math.max(0, k - 1) * monthly);
  const items = [];
  const now = plan.principal / plan.homeValue * 100;
  items.push({ k: 1, when: 'Today', what: `Loan-to-value is ${pct(now, 1)} of the original value. PMI is ${$0(monthly)} a month.`, done: true });
  if (t.request80Scheduled === 0) items.push({ k: 1, when: 'Now', what: 'Ask to cancel now: your balance is already at or below 80% of the original value', note: 'You need a written request, a good payment history, and possibly proof the value has not dropped. Use the letter below.' });
  else if (t.request80Scheduled) items.push({ k: t.request80Scheduled, what: 'Ask to cancel at 80% on your regular schedule', note: 'You need a written request, a good payment history, and possibly proof the value has not dropped.' });
  if (hasExtras() && t.request80Actual > 1 && t.request80Actual !== t.request80Scheduled) items.push({ k: t.request80Actual, what: 'Ask to cancel at 80% with your extra payments', note: 'Extra payments move this date. They do not move the automatic date below, so you must ask.' });
  if (t.appraisal) items.push({ k: t.appraisal.k, what: `Ask to cancel with a new appraisal (${t.appraisal.ltv}% of today's value)`, note: `Many servicers follow Fannie Mae's rule: at least ${t.appraisal.minYears} years of payments and ${t.appraisal.ltv}% LTV of current value. You usually pay for the appraisal (about $400–$700).` });
  if (t.auto78) items.push({ k: Math.min(t.auto78, t.midpoint), what: t.auto78 <= t.midpoint ? 'Automatic cancellation at 78%' : 'Final termination at the loan midpoint', note: 'Required by the Homeowners Protection Act if you are current on payments. Based on the original schedule only.' });
  const live = items.filter((i) => !i.done);
  const best = Math.min(...live.map((i) => i.k));
  const auto = t.autoCapped;

  body.innerHTML = `<ol class="timeline">${items.sort((a, b) => a.k - b.k).map((i) => `<li class="${i.done ? 'done' : i.k === best ? 'best' : ''}">
      <div class="when">${i.when || ym(dateAt(plan, i.k))}${i.done ? '' : ` <span class="badge ${i.k === best ? '' : 'muted'}">${i.k === best ? 'Earliest' : 'in ' + dur(i.k - 1)}</span>`}</div>
      <div class="what">${i.what}</div>${i.done ? '' : `<div class="cost">PMI paid until then: ${$0(paid(i.k))}</div>`}${i.note ? `<p class="hint">${i.note}</p>` : ''}</li>`).join('')}</ol>
    <dl class="stats">
      <div class="stat"><dt>PMI if you wait for automatic</dt><dd>${$0(paid(auto))}</dd></div>
      <div class="stat"><dt>PMI on the earliest route</dt><dd>${$0(paid(best))}</dd></div>
      <div class="stat"><dt>You keep</dt><dd class="keep">${$0(paid(auto) - paid(best))}</dd></div>
    </dl>${target(plan)}`;
  ltvChart(el, plan, cur);

  const k = Math.min(t.request80Actual ?? Infinity, t.request80Scheduled ?? Infinity);
  const eligibleDate = isFinite(k) && k > 1 ? dateAt(plan, k) : null;
  el.querySelector('#pm-actions').innerHTML = `<ul class="levers">
    <li><b>Send a written request</b><span class="amt cost">${eligibleDate ? ym(eligibleDate) : 'Now'}</span><p>Download a ready-to-edit letter citing the Homeowners Protection Act with your balance and original value filled in. Send it to the correspondence address on your statement, and keep a copy.</p>
      <button type="button" class="btn small" id="pm-letter">Download request letter</button></li>
    ${eligibleDate ? `<li><b>Set a reminder for the 80% date</b><span class="amt cost">${ym(eligibleDate)}</span><p>A calendar reminder for the month you can first ask, so it doesn't slip by.</p><button type="button" class="btn small" id="pm-remind">Add to calendar</button></li>` : ''}
    <li><b>Ask what your servicer needs</b><span class="amt cost">Before you pay for anything</span><p>Call and ask: do you require an appraisal or broker price opinion, who orders it, what it costs, and is there a seasoning requirement for value-based removal?</p></li></ul>`;
  el.querySelector('#pm-letter').addEventListener('click', () => pmiLetter({ balance: plan.principal, originalValue: plan.homeValue, ltv: plan.principal / plan.homeValue * 100, eligibleDate }));
  el.querySelector('#pm-remind')?.addEventListener('click', () => reminder({ title: 'Request PMI cancellation (80% LTV reached)', description: 'Send your PMI cancellation request letter to your mortgage servicer.', date: new Date(eligibleDate.y, eligibleDate.m - 1, 1), filename: 'pmi-80-percent-reminder.ics' }));
}

function target(plan) {
  const goal = Math.round((+state.pmi.targetYears || 3) * 12);
  const reach = (x) => F.pmiTimeline({ ...plan, extras: { ...plan.extras, monthly: (plan.extras.monthly || 0) + x } }).request80Actual;
  const now = reach(0);
  if (now != null && now <= goal + 1) return `<p class="good" style="margin-top:14px">You are on track to ask for PMI removal within ${dur(goal)} with your current payments.</p>`;
  let lo = 0, hi = plan.principal;
  if ((reach(hi) ?? Infinity) > goal + 1) return '';
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if ((reach(mid) ?? Infinity) <= goal + 1) hi = mid; else lo = mid; }
  const need = Math.ceil(hi / 5) * 5;
  return `<p class="good" style="margin-top:14px">To ask for removal within ${dur(goal)}, add about <b>${$0(need)} more each month</b> toward principal. ${now != null ? `It saves about ${$0((now - goal - 1) * plan.mi.monthly)} of PMI, plus the interest on what you prepay.` : ''}</p>`;
}

function ltvChart(el, plan, cur = 0) {
  const s = F.amortize({ ...plan, mi: { kind: 'none' } }, { withExtras: false }).rows;
  const a = F.amortize({ ...plan, mi: { kind: 'none' } }, { withExtras: true }).rows;
  const horizon = Math.min(s.length, Math.max(120, (s.findIndex((r) => r.balance <= plan.homeValue * 0.7) + 12) || 180));
  const labels = [], sched = [], act = [], cv = [];
  for (let k = 1; k <= horizon; k += 3) {
    const d = dateAt(plan, k); labels.push(ym(d));
    sched.push(s[k - 1].balance / plan.homeValue * 100);
    act.push(a[k - 1] ? a[k - 1].balance / plan.homeValue * 100 : 0);
    if (cur) cv.push(s[k - 1].balance / cur * 100);
  }
  const line = (label, data, color, dash) => ({ label, data, borderColor: color, backgroundColor: color, borderWidth: dash ? 1.5 : 2, borderDash: dash || [], pointRadius: 0, tension: 0.15 });
  const ds = [line('Scheduled', sched, css('--c1'))];
  if (hasExtras()) ds.push(line('With extra payments', act, css('--c3')));
  if (cur) ds.push(line("Against today's value", cv, css('--c7')));
  ds.push(line('80% (ask to cancel)', labels.map(() => 80), css('--ink-3'), [5, 4]), line('78% (automatic)', labels.map(() => 78), css('--ink-3'), [2, 3]));
  const o = baseOptions();
  o.scales.y.ticks.callback = (v) => v + '%';
  o.plugins.tooltip.callbacks.label = (c) => ` ${c.dataset.label}: ${c.parsed.y.toFixed(1)}%`;
  chart(el.querySelector('#pm-ltv'), { type: 'line', data: { labels, datasets: ds }, options: o });
}

function rulesFor(kind, info) {
  const conv = `<p><b>Conventional PMI.</b> You can ask your servicer to cancel when your balance is scheduled to reach 80% of the original value, or reaches it sooner through extra payments. It must end automatically at 78% on the original schedule, and no later than the loan's midpoint. A recent appraisal can also qualify you if your home has gained value.</p>`;
  const fha = `<p><b>FHA MIP.</b> With 10% or more down, annual MIP ends after 11 years. With less than 10% down it lasts for the life of the loan. You can't cancel by request; refinancing into a conventional loan is the usual exit. Current annual rates are ${RULES.fha.long.small[0][1]}–${RULES.fha.long.big.at(-1)[1]}% for 30-year loans, plus a ${RULES.fha.upfrontPct}% upfront premium.</p>`;
  const va = `<p><b>VA loans.</b> No monthly mortgage insurance. A one-time funding fee (${RULES.va.first.at(-1)[1]}–${RULES.va.subsequent[0][1]}%) applies unless you are exempt.</p>`;
  const usda = `<p><b>USDA loans.</b> A ${RULES.usda.upfrontPct}% upfront guarantee fee and a ${RULES.usda.annualPct}% annual fee for the life of the loan.</p>`;
  const order = { pmi: [conv, fha, va, usda], none: [conv, fha, va, usda], fha: [fha, conv, va, usda], usda: [usda, conv, fha, va] }[kind] || [conv, fha, va, usda];
  return order.join('') + `<p class="hint">Rules as of ${RULES.lastReviewed}. Your servicer's requirements govern; ask them for their PMI cancellation policy in writing.</p>`;
}
