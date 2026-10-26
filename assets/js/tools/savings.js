// Savings check: every savings opportunity for the current plan, ranked, with the next step for each.
import { state, set, derive, bindFields, field, $0, pct, ym, dateAt, dur, chart, css, baseOptions, money, esc } from '../core.js';
import * as F from '../finance.js';
import { inputsPanel, root, remount } from './shared.js';
import { pmiLetter, reminder } from './letters.js';

const CREDIT_OPTS = F.CREDIT_BANDS.map(([v, l]) => [v, l]);

export function mount(el) {
  el.innerHTML = `<form class="inputs" aria-label="Savings assumptions" onsubmit="return false"></form>
  <div class="results">
    <section class="sheet"><h2 id="sv-h">Your savings opportunities</h2><div id="sv-hero"></div>
      <div class="chart-box short" id="sv-chart-wrap"><canvas id="sv-chart" role="img" aria-label="Estimated savings by opportunity"></canvas></div>
      <ul class="levers" id="sv-list" style="margin-top:8px"></ul>
      <p class="promise"><b>Our promise:</b> these ideas come from math on your numbers, not from who pays us. Ads are marked "Ad", sit below your results, and can't change them. "Exact math" is a calculation; "Estimate" and "Rough guess" mean real offers can differ.</p>
      <div class="btn-row" style="margin-top:14px"><button type="button" class="btn" onclick="window.print()">Print my plan</button><a class="btn" href="${root()}saved-scenarios/">Save this scenario</a></div></section>
    <section class="sheet"><h2>Your equity over time</h2><p class="lede">Balance from your schedule (with any extra payments) against a home value that grows at the rate on the left.</p><div class="scroll" style="max-height:none"><table class="ledger" id="sv-equity"></table></div></section>
    <div class="slot" data-slot="results"></div>
  </div>`;
  inputsPanel(el.querySelector('.inputs'), () => `<h2>Assumptions</h2>
    <p class="hint">Every number below can be changed; the list updates as you type.</p>
    ${field({ path: 'mode', kind: 'seg', label: 'Check savings for', options: [['buy', 'A new purchase'], ['own', 'My current loan']] })}
    ${field({ path: state.mode === 'own' ? 'own.credit' : 'buy.credit', label: 'Credit score (your estimate)', kind: 'select', numeric: true, options: CREDIT_OPTS, tip: 'We never pull your credit. Pick the range you see in your bank or card app.' })}
    ${field({ path: 'opt.budget', label: 'Extra I could pay each month', kind: 'money', slider: true, min: 0, max: 2000, step: 25 })}
    ${field({ path: 'opt.goalYears', label: 'I want to be mortgage-free in', kind: 'years', slider: true, min: 3, max: 30, step: 1 })}
    ${field({ path: 'refi.stayYears', label: 'Years I expect to stay', kind: 'years', slider: true, min: 1, max: 30, step: 1 })}
    ${state.mode === 'own' ? field({ path: 'refi.newRatePct', label: 'Refinance rate I could get', kind: 'pct', slider: true, min: 2, max: 10, step: 0.125 }) : ''}
    ${state.mode === 'own' ? field({ path: 'pmi.currentValue', label: "Today's home value (optional)", kind: 'money', placeholder: 'e.g. 450,000' }) : ''}
    ${state.mode === 'own' ? field({ path: 'own.escrowMonthly', label: 'Escrow you pay each month', kind: 'money', placeholder: 'From your statement', tip: 'The escrow part of your payment, for property tax and insurance.' }) : ''}
    ${state.mode === 'own' ? field({ path: 'own.taxBillAnnual', label: 'Property tax bill per year', kind: 'money', placeholder: 'From your county tax bill', tip: 'Needed to check your escrow. Use the total on your latest county bill.' }) : ''}
    ${field({ path: 'goals.appreciationPct', label: 'Home value growth per year', kind: 'pct', slider: true, min: -3, max: 8, step: 0.5 })}
    <h2>Documents</h2>
    <p class="hint">${state.hoi.loaded ? `Insurance: ${$0(+state.hoi.premium)}/yr, ${$0(+state.hoi.deductible)} deductible.` : 'No insurance policy loaded.'} <a href="${root()}mortgage-statement-reader/">Upload a document</a></p>`, bindFields, ['own.credit', 'buy.credit']);
  const update = () => render(el);
  update();
  return { update };
}

/** Build every savings opportunity for the current state. Used by this page and the start page. */
export function collect() {
  const { plan, info } = derive();
  const own = info.mode === 'own';
  const base = F.amortize({ ...plan, extras: {} }, { withExtras: false });
  const items = [];
  const add = (o) => items.push(o);

  /* --- mortgage insurance --- */
  if (plan.mi.kind === 'pmi') {
    const cur = +state.pmi.currentValue || 0;
    const t = F.pmiTimeline(plan, cur);
    const auto = t.autoCapped;
    const opts = [t.request80Actual, t.request80Scheduled, t.appraisal?.k].filter((x) => x != null);
    const best = Math.max(1, Math.min(...opts));
    const m = plan.mi.monthly;
    const now = best <= 1 || plan.principal <= plan.homeValue * 0.8;
    add({ id: 'pmi', group: 'Mortgage insurance', free: true, lifetime: Math.max(0, (auto - best)) * m, monthly: now ? m : 0,
      title: now ? 'Ask your servicer to cancel PMI now' : `Cancel PMI in ${ym(dateAt(plan, best))} instead of ${ym(dateAt(plan, auto))}`,
      amount: now ? `−${$0(m)}/mo` : `−${$0((auto - best) * m)}`,
      note: now ? `Your balance is ${pct(plan.principal / plan.homeValue * 100, 1)} of the original value, at or below the 80% needed to ask. That is ${$0(m * 12)} a year you can stop paying.`
        : `Asking at 80% instead of waiting for automatic removal saves ${dur(auto - best)} of PMI.${t.appraisal && t.appraisal.k === best ? ' This uses a new appraisal at today\'s value.' : ''}`,
      actions: [['PMI timeline', root() + 'pmi-removal-calculator/'], ...(now || best <= 12 ? [['Download request letter', 'letter']] : [])] });
    if (!now) {
      const goal = 36;
      const reach = (x) => F.pmiTimeline({ ...plan, extras: { monthly: x } }).request80Actual ?? Infinity;
      if (reach(0) > goal + 1 && reach(plan.principal) <= goal + 1) {
        let lo = 0, hi = plan.principal; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (reach(mid) <= goal + 1) hi = mid; else lo = mid; }
        add({ id: 'pmi-extra', group: 'Mortgage insurance', lifetime: Math.max(0, auto - goal - 1) * m, title: `Pay ${$0(Math.ceil(hi / 5) * 5)} extra a month to drop PMI within 3 years`, amount: `−${$0(Math.max(0, auto - goal - 1) * m)}`,
          note: 'Prepaying to 80% of the original value, then asking, ends PMI early. You also save interest on what you prepay.', actions: [['PMI timeline', root() + 'pmi-removal-calculator/']] });
      }
    }
  } else if (plan.mi.kind === 'fha' || plan.mi.kind === 'usda') {
    const remaining = base.totals.mi;
    const k80 = base.rows.findIndex((r) => r.balance <= plan.homeValue * 0.8) + 1;
    add({ id: 'fha', group: 'Mortgage insurance', free: true, lifetime: 0, title: `${info.miLabel} costs ${$0(remaining)} more if you keep this loan`, amount: `${$0(base.rows[0]?.mi || 0)}/mo`, cost: true,
      note: `It can't be cancelled by request. Once you reach 20% equity${k80 > 0 ? ` (around ${ym(dateAt(plan, k80 + 1))} on schedule, sooner if your home gains value)` : ''}, refinancing into a conventional loan removes it.`,
      actions: [['Refinance check', root() + 'refinance-calculator/']] });
  }

  /* --- extra payments & payoff goal --- */
  const budget = +state.opt.budget;
  if (budget > 0) {
    const o = F.optimize(plan, { monthlyBudget: budget, lumpSum: 0, investReturnPct: +state.opt.investPct });
    const b = o.strategies[0];
    const wait = F.costOfWaiting(plan, budget, 60);
    add({ id: 'extra', group: 'Extra payments', lifetime: b.saved, title: b.label, amount: `−${$0(b.saved)}`,
      note: `Pays off ${dur(b.monthsSaved)} sooner. Each extra dollar saves $${b.perDollar.toFixed(2)}. Waiting five years to start would give up ${$0(wait.lost)} of that.`,
      actions: [['Compare strategies', root() + 'extra-payment-calculator/'], ['Use this', 'extra']] , extras: b.extras });
  }
  const goalM = +state.opt.goalYears * 12;
  if (goalM < base.months) {
    const need = F.extraForPayoff(plan, goalM);
    const res = F.amortize({ ...plan, extras: { monthly: need } });
    add({ id: 'goal', group: 'Extra payments', lifetime: base.totals.interest + base.totals.mi - res.totals.interest - res.totals.mi,
      title: `Be mortgage-free by ${ym(dateAt(plan, res.months))}: add ${$0(need)} a month`, amount: `−${$0(base.totals.interest + base.totals.mi - res.totals.interest - res.totals.mi)}`,
      note: `Your goal is ${state.opt.goalYears} years. Total monthly payment toward the loan would be ${$0(base.payment + need)}.`, actions: [['Use this', 'goal']], extras: { monthly: need } });
  }
  const bw = F.biweeklyCompare(plan, { fee: +state.opt.biweeklyFee || 0 });
  add({ id: 'biweekly', group: 'Extra payments', lifetime: bw.twelfth.saved, title: 'Add 1/12 of a payment each month (the free biweekly)', amount: `−${$0(bw.twelfth.saved)}`,
    note: `Same effect as paying half every two weeks: ${$0(bw.twelfth.extra)} more a month finishes ${dur(bw.monthly.months - bw.twelfth.months)} sooner, with no enrollment fee.`, actions: [['Biweekly details', root() + 'extra-payment-calculator/']] });

  /* --- refinance --- */
  if (own) {
    const o = state.own, f = state.refi;
    const params = { balance: +o.balance, ratePct: +o.ratePct, remainingMonths: +o.remainingMonths, currentPI: +o.monthlyPI || 0, newTermMonths: +f.newTermYears * 12, costs: +f.costs, pointsPct: +f.pointsPct, rollCosts: f.roll, stayYears: +f.stayYears };
    const r = F.refinance({ ...params, newRatePct: +f.newRatePct });
    const target = F.refiRateTarget(params);
    if (r.netAtStay > 0 && r.savings > 0) add({ id: 'refi', group: 'Refinance', free: true, lifetime: r.netAtStay, monthly: r.savings, title: `If you could refinance at ${pct(+f.newRatePct, 3)}`, amount: `−${$0(r.savings)}/mo`,
      note: `${pct(+f.newRatePct, 3)} is the rate on the refinance page. Change it to a real quote to make this exact. At that rate you'd break even in ${r.breakEven ? dur(r.breakEven) : 'time'}, ${$0(r.netAtStay)} ahead after ${f.stayYears} years, counting ${$0(r.upfront)} of costs and the longer term.`, actions: [['Refinance details', root() + 'refinance-calculator/']] });
    else add({ id: 'refi', group: 'Refinance', free: true, lifetime: 0, title: target ? `Refinancing pays once rates reach ${pct(target, 3)}` : 'Refinancing does not pay at any rate for your timeline', amount: target ? 'Rate target' : '—', cost: true,
      note: target ? `At ${pct(+f.newRatePct, 3)} you would not come out ahead within ${f.stayYears} years. Set a rate alert with a lender at ${pct(target, 3)} or lower.` : 'Closing costs outweigh the savings over the years you expect to stay.',
      actions: [['Refinance details', root() + 'refinance-calculator/'], ...(target ? [['Add a reminder to check rates', 'ratecheck']] : [])], target });
  }

  /* --- credit score --- */
  const score = +(own ? state.own.credit : state.buy.credit);
  if (score < 780) {
    const price = own ? (+state.pmi.currentValue || +state.own.originalValue) : info.price;
    const loan = own ? +state.own.balance : info.baseLoan;
    const rows = F.creditImpact({ price, loan, ratePct: own ? +state.refi.newRatePct : +state.buy.ratePct, score, termMonths: own ? +state.refi.newTermYears * 12 : plan.months });
    const i = rows.findIndex((r) => r.mine);
    const up = rows[Math.max(0, i - 1)], mine = rows[i];
    if (up && mine && up !== mine && mine.monthly - up.monthly > 1) add({ id: 'credit', group: 'Credit', free: true, lifetime: mine.lifetime - up.lifetime, monthly: mine.monthly - up.monthly,
      title: `Raise your score to ${up.label} before you ${own ? 'refinance' : 'lock a rate'}`, amount: `−${$0(mine.monthly - up.monthly)}/mo`,
      note: `Estimated from Fannie Mae's pricing grid: about ${pct(mine.rate - up.rate, 3)} lower rate${mine.pmiMonthly ? ' and cheaper PMI' : ''}. Worth ${$0(mine.lifetime - up.lifetime)} over the loan.`, actions: [['See every score band', root() + 'credit-score-mortgage-rate-calculator/']] });
  }

  /* --- insurance & escrow --- */
  const h = state.hoi;
  if (h.loaded && +h.premium) {
    const opts = F.deductibleOptions(+h.premium, +h.deductible || 1000);
    const o1 = opts[0];
    if (o1) add({ id: 'deductible', group: 'Insurance', free: true, lifetime: ((o1.lo + o1.hi) / 2) * (+state.refi.stayYears || 7), monthly: (o1.lo + o1.hi) / 24,
      title: `Raise your insurance deductible to ${$0(o1.to)}`, amount: `−${$0(o1.lo)}–${$0(o1.hi)}/yr`,
      note: `Published estimates for this change run ${pct(o1.lo / h.premium * 100, 0)}–${pct(o1.hi / h.premium * 100, 0)} of premium. You'd take on ${$0(o1.extraRisk)} more per claim, so it pays off if you go about ${o1.breakEvenYears.toFixed(1)} years without a claim. Keep that amount in savings first.`,
      actions: [] });
    const ren = h.renewalM && h.renewalY ? new Date(+h.renewalY, +h.renewalM - 1, 1) : null;
    add({ id: 'shop', group: 'Insurance', free: true, lifetime: 0, title: ren ? `Shop your policy before it renews in ${ym({ y: +h.renewalY, m: +h.renewalM })}` : 'Compare insurance quotes before your renewal', amount: 'Free check', cost: true,
      note: 'Quotes for the same coverage vary widely between insurers. Ask about bundling with auto, claims-free, new-roof, security-system and paperless/autopay discounts. If you switch, tell your mortgage servicer so escrow pays the new insurer.',
      actions: ren ? [['Add a reminder 45 days before renewal', 'renewal']] : [] , ren });
    if (+h.dwelling && info.price && +h.dwelling > info.price * 1.5) add({ id: 'dwelling', group: 'Insurance', free: true, lifetime: 0, title: 'Check your dwelling coverage', amount: 'Review', cost: true,
      note: `Coverage A is ${$0(+h.dwelling)}, ${(+h.dwelling / info.price).toFixed(1)}× the home's value. It should match the cost to rebuild, which can be higher or lower than market value. Ask your agent for the replacement-cost estimate behind it; your lender may require a minimum.`, actions: [] });
  } else {
    add({ id: 'hoi-upload', group: 'Insurance', free: true, lifetime: 0, title: 'Check your homeowners insurance', amount: 'Upload', cost: true,
      note: 'Drop in your declarations page to see deductible savings, your renewal date and whether your escrow matches your premium.', actions: [['Upload declarations page', root() + 'mortgage-statement-reader/']] });
  }
  if (own && +state.own.escrowMonthly) {
    const ins = h.loaded && +h.premium ? +h.premium : null;
    const tax = +state.own.taxBillAnnual || null;
    if (ins && tax) {
      const e = F.escrowCheck({ escrowMonthly: +state.own.escrowMonthly, taxAnnual: tax, insAnnual: ins });
      if (e.status === 'over') add({ id: 'escrow', group: 'Escrow', free: true, lifetime: e.yearly, monthly: e.diff, title: 'Your escrow may be collecting too much', amount: `−${$0(e.diff)}/mo`,
        note: `You pay ${$0(+state.own.escrowMonthly)}/mo; your tax bill and premium need about ${$0(e.need)}/mo. Ask your servicer for an escrow analysis. A surplus of $50 or more must be refunded after the annual analysis. Your payment may also include a catch-up for a past shortage.`, actions: [] });
      else if (e.status === 'short') add({ id: 'escrow', group: 'Escrow', free: true, lifetime: 0, title: 'Your escrow may come up short', amount: `+${$0(-e.diff)}/mo`, cost: true,
        note: `Your tax bill and premium need about ${$0(e.need)}/mo but escrow collects ${$0(+state.own.escrowMonthly)}. Expect a shortage notice and a higher payment after the next escrow analysis, or pay the difference now to avoid it.`, actions: [] });
      else add({ id: 'escrow', group: 'Escrow', free: true, lifetime: 0, title: 'Your escrow matches your bills', amount: 'OK', cost: true, note: `Escrow of ${$0(+state.own.escrowMonthly)}/mo is within a few dollars of the ${$0(e.need)}/mo your tax and insurance need.`, actions: [] });
    } else add({ id: 'escrow', group: 'Escrow', free: true, lifetime: 0, title: 'Check whether your escrow collects too much', amount: 'Needs 2 numbers', cost: true,
      note: `Add your ${tax ? '' : 'yearly property tax bill on the left'}${!tax && !ins ? ' and ' : ''}${ins ? '' : 'insurance declarations page'} to compare them with the ${$0(+state.own.escrowMonthly)}/mo you pay into escrow.`, actions: ins ? [] : [['Upload declarations page', root() + 'mortgage-statement-reader/']] });
  }

  /* --- buying: rate shopping & points --- */
  if (!own) {
    const r25 = F.amortize({ ...plan, ratePct: plan.ratePct - 0.25, extras: {} }, { withExtras: false });
    add({ id: 'shop-rate', group: 'Rate', free: true, lifetime: base.totals.interest - r25.totals.interest, monthly: base.payment - r25.payment, title: 'Get three lender quotes on the same day', amount: `−${$0(base.payment - r25.payment)}/mo`,
      note: `Finding a rate just 0.25 points lower is worth ${$0(base.totals.interest - r25.totals.interest)} over the loan. Compare Loan Estimates line by line, not just the rate.`, actions: [['Upload a Loan Estimate', root() + 'mortgage-statement-reader/']] });
    const le = state.le;
    if (le.loaded && +le.pointsPct > 0 && +le.loanAmount) {
      const pts = F.pointsCompare({ loan: +le.loanAmount, ratePct: +le.ratePct + +le.pointsPct * 0.25, months: (+le.termYears || 30) * 12, points: [0, +le.pointsPct] });
      const be = pts[1].breakEven;
      const stay = +state.refi.stayYears * 12;
      add({ id: 'points', group: 'Rate', free: true, lifetime: be && be < stay ? pts[1].monthlySave * (stay - be) : 0, cost: !(be && be < stay),
        title: be && be < stay ? `Your ${le.pointsPct} points pay off in ${dur(be)}` : `Your ${le.pointsPct} points may not pay off`, amount: `${$0(pts[1].cost)} paid`,
        note: `Assuming each point lowered your rate about 0.25. ${be ? `You recover the cost after ${dur(be)}` : 'The monthly saving is too small to recover the cost'}; you expect to stay ${state.refi.stayYears} years. Ask the lender for the no-points rate to confirm.`, actions: [] });
    }
  }

  // How sure we are, in plain words, so results stay honest.
  const SURE = { pmi: 'math', 'pmi-extra': 'math', fha: 'math', extra: 'math', goal: 'math', biweekly: 'math', refi: 'estimate', escrow: 'math',
    credit: 'estimate', 'shop-rate': 'estimate', points: 'estimate', deductible: 'guess', shop: 'tip', dwelling: 'tip', 'hoi-upload': 'tip' };
  const OTHER = {
    extra: 'The other side: money you prepay is hard to get back out. Keep an emergency fund first.',
    goal: 'The other side: this ties up a lot of cash each month. Only do it if your budget has room.',
    refi: 'The other side: a new loan restarts the clock. Keep paying your old amount if you can.',
    credit: 'The other side: raising a score takes time; don\'t miss a good rate waiting for a few points.',
    deductible: 'The other side: if you have a claim, you pay more out of pocket.',
  };
  for (const i of items) { i.sure = SURE[i.id] || 'estimate'; if (OTHER[i.id]) i.note += ` <em class="other-side">${OTHER[i.id]}</em>`; }
  return { items, plan, info, own };
}

export const SURE_LABEL = { math: ['Exact math', 'Calculated from your numbers.'], estimate: ['Estimate', 'Based on typical prices; real offers can differ.'],
  guess: ['Rough guess', 'Based on published averages; get a real quote.'], tip: ['Tip', 'A check worth doing; we can\'t put a number on it yet.'] };
export const sureBadge = (k) => `<span class="sure sure-${k}" title="${SURE_LABEL[k][1]}">${SURE_LABEL[k][0]}</span>`;

function render(el) {
  const { items, plan, info, own } = collect();
  const byValue = (a, b) => (b.lifetime || 0) - (a.lifetime || 0) || (b.monthly || 0) - (a.monthly || 0);
  const free = items.filter((i) => i.free).sort(byValue);
  const extra = items.filter((i) => !i.free).sort(byValue);
  const ordered = [...free, ...extra];
  const freeMoney = free.filter((i) => i.lifetime > 1 || i.monthly > 1);
  const monthly = free.filter((i) => i.id !== 'credit').reduce((s, i) => s + (i.monthly > 0 ? i.monthly : 0), 0); // credit gain applies inside a refinance, so it isn't added
  const topFree = freeMoney[0], topExtra = extra[0];
  el.querySelector('#sv-h').textContent = own ? 'Savings on my current loan' : 'Savings on this purchase';
  el.querySelector('#sv-hero').innerHTML = `<dl class="stats" style="border-top:0;margin-top:0">
      <div class="stat"><dt>Up to, without paying more</dt><dd class="keep">${monthly > 1 ? `−${$0(monthly)}<small> /mo</small>` : topFree ? $0(topFree.lifetime) : '—'}</dd></div>
      <div class="stat"><dt>Top no-cost move</dt><dd style="font-size:15px">${topFree ? esc(topFree.title) : 'None found yet'}</dd></div>
      <div class="stat"><dt>Best use of ${$0(+state.opt.budget)}/mo extra</dt><dd class="keep">${topExtra && extra.find((x) => x.id === 'extra') ? $0(extra.find((x) => x.id === 'extra').lifetime) : '—'}</dd></div></dl>
    <p class="hint">${freeMoney.length} no-cost move${freeMoney.length === 1 ? '' : 's'} and ${extra.length} way${extra.length === 1 ? '' : 's'} to put extra money to work. Some overlap, so savings don't simply add up.</p>`;
  const money_ = ordered.filter((i) => i.lifetime > 1);
  const wrap = el.querySelector('#sv-chart-wrap');
  wrap.style.height = Math.max(120, money_.length * 34 + 40) + 'px';
  const opts = baseOptions({ indexAxis: 'y' });
  opts.plugins.legend.display = true;
  opts.plugins.tooltip.callbacks.label = (c) => ` About ${$0(c.parsed.x)}`;
  opts.scales = { x: { stacked: true, grid: { color: css('--grid') }, border: { display: false }, ticks: { callback: money, color: css('--ink-3') } }, y: { stacked: true, grid: { display: false }, ticks: { color: css('--ink-2'), callback(v) { const l = this.getLabelForValue(v); return l.length > 42 ? l.slice(0, 40) + '…' : l; } } } };
  chart(el.querySelector('#sv-chart'), { type: 'bar', data: { labels: money_.map((i) => i.title), datasets: [
    { label: 'No extra cash needed', data: money_.map((i) => (i.free ? i.lifetime : null)), backgroundColor: css('--c3'), borderRadius: 4, barThickness: 14 },
    { label: 'Needs extra payments', data: money_.map((i) => (i.free ? null : i.lifetime)), backgroundColor: css('--c1'), borderRadius: 4, barThickness: 14 },
  ] }, options: opts });

  const li = (i, n) => `<li><span><span class="badge muted" style="margin-right:6px">${i.group}</span><b>${esc(i.title)}</b> ${sureBadge(i.sure)}</span><span class="amt ${i.cost ? 'cost' : ''}">${i.amount}</span><p>${i.note}</p>
    ${i.actions.length ? `<span class="btn-row" style="grid-column:1/-1">${i.actions.map(([label, href], j) => href && href.includes('/') ? `<a class="btn small" href="${href}">${label}</a>` : `<button type="button" class="btn small" data-act="${n}:${j}">${label}</button>`).join('')}</span>` : ''}</li>`;
  el.querySelector('#sv-list').innerHTML = `<li class="group-h"><h3>Save without paying more</h3></li>${free.map((i, n) => li(i, n)).join('')}
    <li class="group-h"><h3>Put extra money to work</h3></li>${extra.map((i, n) => li(i, n + free.length)).join('')}`;
  el.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
    const [n, j] = b.dataset.act.split(':').map(Number);
    const it = ordered[n], act = it.actions[j][1];
    if (act === 'letter') pmiLetter({ balance: plan.principal, originalValue: plan.homeValue, ltv: plan.principal / plan.homeValue * 100, eligibleDate: null });
    if (act === 'extra' || act === 'goal') {
      const e = it.extras;
      set('extras', { monthly: e.monthly || 0, annual: e.annual || 0, annualMonth: e.annualMonth || 12, oneTimeAmt: e.oneTime?.[0]?.amount || 0, oneTimeK: e.oneTime?.[0]?.k || 1, biweekly: !!e.biweekly });
      location.href = root() + 'amortization-schedule-calculator/';
    }
    if (act === 'renewal') { const d = new Date(it.ren.getTime() - 45 * 86400000); reminder({ title: 'Shop homeowners insurance before renewal', description: 'Get 2-3 quotes for the same coverage. Tell your mortgage servicer if you switch.', date: d, filename: 'insurance-renewal-reminder.ics' }); }
    if (act === 'ratecheck') { const d = new Date(Date.now() + 30 * 86400000); reminder({ title: `Check refinance rates (target ${pct(it.target, 3)})`, description: `Refinancing pays off if you can get ${pct(it.target, 3)} or lower. Re-run the numbers at MortgageForge.`, date: d, filename: 'refinance-rate-check.ics' }); }
  }));

  const g = +state.goals.appreciationPct;
  const eq = [5, 10, 15].map((y) => F.equityAt(plan, y, g));
  el.querySelector('#sv-equity').innerHTML = `<thead><tr><th>In</th><th>Home value</th><th>Loan balance</th><th>Equity</th><th>Loan-to-value</th></tr></thead><tbody>${eq.map((e) =>
    `<tr><td>${e.years} years</td><td>${$0(e.value)}</td><td>${$0(e.balance)}</td><td><b>${$0(e.equity)}</b></td><td>${pct(e.ltv, 1)}</td></tr>`).join('')}</tbody>`;
}
