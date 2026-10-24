// MortgageForge finance engine. Pure functions, no DOM. Runs in the browser and in Node (tests).
import { RULES } from './config.js';

/* ---------- basics ---------- */

export function pmt(principal, annualRatePct, months) {
  if (!(months > 0) || !(principal > 0)) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

/** Months needed to pay `principal` at `payment` per month. Infinity if payment never covers interest. */
export function nper(principal, annualRatePct, payment) {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return Math.ceil(principal / payment);
  if (payment <= principal * r) return Infinity;
  return Math.ceil(-Math.log(1 - (principal * r) / payment) / Math.log(1 + r));
}

/** Calendar month for payment number k (1-based). start = {y, m} is the first payment month (m = 1..12). */
export function monthOf(start, k) {
  const idx = start.y * 12 + (start.m - 1) + (k - 1);
  return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
}

export function band(table, value) {
  for (const [max, v] of table) if (value <= max) return v;
  return table[table.length - 1][1];
}

/* ---------- program rules ---------- */

export function fhaAnnualMipPct(baseLoan, ltvPct, termMonths) {
  const t = termMonths > 180 ? RULES.fha.long : RULES.fha.short;
  return band(baseLoan > RULES.fha.bigLoanThreshold ? t.big : t.small, ltvPct);
}

/** FHA annual MIP lasts 11 years (132 months) at LTV <= 90%, otherwise for the life of the loan. */
export function fhaMipMonths(ltvPct) {
  return ltvPct <= RULES.fha.elevenYearLtv ? 132 : Infinity;
}

export function vaFundingFeePct(downPct, subsequentUse, exempt) {
  if (exempt) return 0;
  const t = subsequentUse ? RULES.va.subsequent : RULES.va.first;
  return t.find(([below]) => downPct < below)[1];
}

export function estimatePmiPct(ltvPct, creditScore) {
  if (ltvPct <= 80) return 0;
  const base = band(RULES.pmiByLtv, ltvPct);
  const tiers = Object.keys(RULES.pmiCreditMultiplier).map(Number).sort((a, b) => b - a);
  const tier = tiers.find((t) => creditScore >= t) ?? tiers[tiers.length - 1];
  return Math.round(base * RULES.pmiCreditMultiplier[tier] * 100) / 100;
}

/* ---------- amortization ---------- */

/**
 * plan = {
 *   principal, ratePct, months,          // amount amortized now, rate, remaining months
 *   start: {y, m},                        // first payment month
 *   fixedPI?,                             // actual scheduled P&I if known (existing loans)
 *   homeValue,                            // original value used for LTV / PMI
 *   monthsElapsed = 0, originalTerm = months,
 *   taxMonthly, insMonthly, hoaMonthly,
 *   mi: { kind: 'none'|'pmi'|'fha'|'usda', monthly, annualPct, maxMonths, removal: 'request'|'auto' },
 *   extras: { monthly, monthlyFrom, annual, annualMonth, oneTime: [{k, amount}], biweekly }
 * }
 */
export function amortize(plan, { withExtras = true } = {}) {
  const r = plan.ratePct / 100 / 12;
  const base = plan.fixedPI > 0 ? plan.fixedPI : pmt(plan.principal, plan.ratePct, plan.months);
  const ex = withExtras ? normalizeExtras(plan.extras) : null;
  const mi = plan.mi || { kind: 'none' };
  const elapsed = plan.monthsElapsed || 0;
  const originalTerm = plan.originalTerm || plan.months + elapsed;
  const value = plan.homeValue || 0;
  const escrow = (plan.taxMonthly || 0) + (plan.insMonthly || 0) + (plan.hoaMonthly || 0);

  // Scheduled (no-extra) balances drive HPA automatic termination.
  const sched = withExtras && mi.kind === 'pmi' ? amortize({ ...plan, mi: { kind: 'none' } }, { withExtras: false }).rows : null;

  const rows = [];
  let bal = plan.principal;
  let miOn = mi.kind !== 'none';
  let miEnd = null;
  let yearBal = bal;
  let tot = { interest: 0, principal: 0, extra: 0, mi: 0, escrow: 0 };
  const ms = { principalOverInterest: null, equity20: null, halfPaid: null, miEnd: null };

  for (let k = 1; k <= plan.months * 2 && bal > 0.005; k++) {
    const abs = elapsed + k;
    const balStart = bal;
    if ((abs - 1) % 12 === 0 || k === 1) yearBal = balStart;

    // mortgage insurance for this month
    let miAmt = 0;
    if (miOn) {
      if (mi.kind === 'pmi') {
        const schedStart = sched ? (k === 1 ? plan.principal : sched[k - 2]?.balance ?? 0) : balStart;
        const autoHit = schedStart <= value * RULES.hpa.autoLtv / 100;
        const reqHit = mi.removal !== 'auto' && balStart <= value * RULES.hpa.requestLtv / 100;
        const midpoint = abs > originalTerm / 2;
        if (autoHit || reqHit || midpoint || !value) miOn = false;
        else miAmt = mi.monthly || 0;
      } else if (mi.kind === 'fha' || mi.kind === 'usda') {
        if (abs > (mi.maxMonths ?? Infinity)) miOn = false;
        else miAmt = ((mi.annualPct || 0) / 100) * yearBal / 12;
      }
      if (!miOn && miEnd === null) miEnd = k;
    }

    const interest = balStart * r;
    let principal = Math.min(base - interest, balStart);
    if (principal < 0) principal = 0;
    let extra = 0;
    if (ex) {
      const d = monthOf(plan.start, k);
      if (k >= ex.monthlyFrom) extra += ex.monthly;
      if (ex.biweekly) extra += base / 12;
      if (ex.annual && d.m === ex.annualMonth) extra += ex.annual;
      for (const o of ex.oneTime) if (o.k === k) extra += o.amount;
      extra = Math.min(extra, balStart - principal);
      if (extra < 0) extra = 0;
    }
    bal = balStart - principal - extra;
    if (bal < 0.005) bal = 0;

    tot.interest += interest; tot.principal += principal; tot.extra += extra; tot.mi += miAmt; tot.escrow += escrow;
    if (ms.principalOverInterest === null && principal > interest) ms.principalOverInterest = k;
    if (ms.equity20 === null && value && bal <= value * 0.8) ms.equity20 = k;
    if (ms.halfPaid === null && bal <= (plan.principal / 2)) ms.halfPaid = k;

    rows.push({ k, date: monthOf(plan.start, k), payment: interest + principal, interest, principal, extra, mi: miAmt, escrow, balance: bal,
      cumInterest: tot.interest, ltv: value ? (bal / value) * 100 : null });
  }
  if (mi.kind !== 'none' && miEnd === null) miEnd = miOn ? null : rows.length + 1;
  ms.miEnd = miEnd;

  return {
    rows, payment: base, months: rows.length,
    payoff: rows.length ? rows[rows.length - 1].date : plan.start,
    totals: tot, totalCost: tot.interest + tot.principal + tot.extra + tot.mi,
    milestones: ms, miEnd,
  };
}

function normalizeExtras(e = {}) {
  return {
    monthly: +e.monthly || 0,
    monthlyFrom: Math.max(1, +e.monthlyFrom || 1),
    annual: +e.annual || 0,
    annualMonth: +e.annualMonth || 12,
    oneTime: (e.oneTime || []).filter((o) => o && o.amount > 0 && o.k >= 1).map((o) => ({ k: Math.round(o.k), amount: +o.amount })),
    biweekly: !!e.biweekly,
  };
}

export function yearly(rows) {
  const out = [];
  for (const r of rows) {
    const i = Math.floor((r.k - 1) / 12);
    out[i] ??= { year: i + 1, interest: 0, principal: 0, extra: 0, mi: 0, escrow: 0, balance: 0, date: r.date };
    const y = out[i];
    y.interest += r.interest; y.principal += r.principal; y.extra += r.extra; y.mi += r.mi; y.escrow += r.escrow; y.balance = r.balance; y.endDate = r.date;
  }
  return out;
}

/** Compare a plan with and without its extras. */
export function compareExtras(plan) {
  const base = amortize(plan, { withExtras: false });
  const withEx = amortize(plan, { withExtras: true });
  return {
    base, withEx,
    interestSaved: base.totals.interest - withEx.totals.interest,
    miSaved: base.totals.mi - withEx.totals.mi,
    monthsSaved: base.months - withEx.months,
  };
}

/* ---------- PMI timing ---------- */

export function pmiTimeline(plan, currentValue) {
  const value = plan.homeValue;
  const elapsed = plan.monthsElapsed || 0;
  const originalTerm = plan.originalTerm || plan.months + elapsed;
  const sched = amortize({ ...plan, mi: { kind: 'none' } }, { withExtras: false }).rows;
  const act = amortize({ ...plan, mi: { kind: 'none' } }, { withExtras: true }).rows;
  const first = (rows, ltv) => {
    if (plan.principal <= value * ltv / 100) return 0;
    const i = rows.findIndex((r) => r.balance <= value * ltv / 100);
    return i < 0 ? null : i + 2; // PMI no longer charged starting the month after the threshold is crossed
  };
  const midpoint = Math.max(1, Math.floor(originalTerm / 2) + 1 - elapsed);
  const out = {
    request80Scheduled: first(sched, 80),
    request80Actual: first(act, 80),
    auto78: first(sched, 78),
    midpoint,
    appraisal: null,
  };
  if (currentValue > 0) {
    const yearsIn = elapsed / 12;
    for (const rule of RULES.appraisalRemoval) {
      // earliest month k at which seasoning is met and balance <= rule.ltv of current value
      const startK = Math.max(1, Math.ceil(rule.minYears * 12 - elapsed));
      for (let k = startK; k <= act.length; k++) {
        const balStart = k === 1 ? plan.principal : act[k - 2].balance;
        if ((elapsed + k) / 12 >= rule.maxYears) break;
        if (balStart <= currentValue * rule.ltv / 100) {
          if (!out.appraisal || k < out.appraisal.k) out.appraisal = { k, ltv: rule.ltv, minYears: rule.minYears };
          break;
        }
      }
    }
    out.currentLtv = (plan.principal / currentValue) * 100;
    out.yearsIn = yearsIn;
  }
  out.autoCapped = Math.min(out.auto78 ?? Infinity, midpoint);
  return out;
}

/** Total PMI paid if PMI stops at month `endK` (exclusive). */
export function pmiCostUntil(monthly, endK) {
  if (!monthly || endK == null || endK === Infinity) return null;
  return Math.max(0, endK - 1) * monthly;
}

/* ---------- extra payment optimizer ---------- */

export function optimize(plan, { monthlyBudget = 200, lumpSum = 0, investReturnPct = 6 } = {}) {
  const clean = { ...plan, extras: {} };
  const base = amortize(clean, { withExtras: false });
  const P = base.payment;
  const strategies = [];
  const add = (id, label, extras, detail) => {
    const res = amortize({ ...clean, extras }, { withExtras: true });
    const interestSaved = base.totals.interest - res.totals.interest;
    const miSaved = base.totals.mi - res.totals.mi;
    const paidExtra = res.totals.extra;
    strategies.push({ id, label, detail, extras, res,
      interestSaved, miSaved, saved: interestSaved + miSaved,
      monthsSaved: base.months - res.months, paidExtra,
      perDollar: paidExtra ? (interestSaved + miSaved) / paidExtra : 0 });
  };
  if (monthlyBudget > 0) {
    add('monthly', `Add ${fmt0(monthlyBudget)} every month`, { monthly: monthlyBudget }, 'Starts with your next payment.');
    const yearEnd = monthOf(plan.start, 12).m; // first lump lands with payment #12, so it is compared fairly with monthly extras
    add('annual', `One ${fmt0(monthlyBudget * 12)} payment each year`, { annual: monthlyBudget * 12, annualMonth: yearEnd }, 'Same yearly total, paid once a year starting 12 months from now.');
  }
  add('biweekly', 'Pay half your payment every two weeks', { biweekly: true }, `Adds one extra payment a year (about ${fmt0(P / 12)}/mo).`);
  const roundTo = Math.ceil((P + 50) / 100) * 100;
  add('roundup', `Round your payment up to ${fmt0(roundTo)}`, { monthly: roundTo - P }, `${fmt0(roundTo - P)} more each month.`);
  if (lumpSum > 0) add('lump', `Put ${fmt0(lumpSum)} toward principal now`, { oneTime: [{ k: 1, amount: lumpSum }] }, 'A one-time payment with your next bill.');
  strategies.sort((a, b) => b.saved - a.saved);

  // Prepay vs invest, same monthly budget for both, measured at the original payoff date.
  let invest = null;
  if (monthlyBudget > 0) {
    const pre = amortize({ ...clean, extras: { monthly: monthlyBudget } }, { withExtras: true });
    const i = investReturnPct / 100 / 12;
    const N = base.months;
    let fvA = 0, fvB = 0;
    for (let k = 1; k <= N; k++) {
      const b = base.rows[k - 1];
      const budget = b.payment + b.mi + monthlyBudget;
      const a = pre.rows[k - 1];
      const outA = a ? a.payment + a.extra + a.mi : 0;
      const grow = Math.pow(1 + i, N - k);
      fvA += Math.max(0, budget - outA) * grow;
      fvB += monthlyBudget * grow;
    }
    invest = { prepayThenInvest: fvA, investOnly: fvB, winner: fvA >= fvB ? 'prepay' : 'invest', returnPct: investReturnPct, horizon: N };
  }
  return { base, strategies, invest };
}

/* ---------- refinance ---------- */

export function refinance({ balance, ratePct, remainingMonths, currentPI, newRatePct, newTermMonths, costs = 0, pointsPct = 0, rollCosts = false, stayYears = 7 }) {
  const pointsAmt = (balance * pointsPct) / 100;
  const upfront = costs + pointsAmt;
  const newPrincipal = balance + (rollCosts ? upfront : 0);
  const cashUpfront = rollCosts ? 0 : upfront;
  const oldPI = currentPI > 0 ? currentPI : pmt(balance, ratePct, remainingMonths);
  const newPI = pmt(newPrincipal, newRatePct, newTermMonths);
  const rOld = ratePct / 1200, rNew = newRatePct / 1200;
  let bOld = balance, bNew = newPrincipal, cumOld = 0, cumNew = 0, intOld = 0, intNew = 0;
  const horizon = Math.max(remainingMonths, newTermMonths);
  const net = [];
  let breakEven = null;
  for (let k = 1; k <= horizon; k++) {
    if (bOld > 0.005) { const i = bOld * rOld; const p = Math.min(oldPI - i, bOld); intOld += i; cumOld += i + p; bOld -= p; }
    if (bNew > 0.005) { const i = bNew * rNew; const p = Math.min(newPI - i, bNew); intNew += i; cumNew += i + p; bNew -= p; }
    // wealth advantage of refinancing after k months: cash kept minus extra debt still owed
    const adv = (cumOld - cumNew) - cashUpfront - (Math.max(bNew, 0) - Math.max(bOld, 0));
    net.push(adv);
    if (breakEven === null && adv >= 0) breakEven = k; // first month you're ahead
  }
  const savings = oldPI - newPI;
  return {
    oldPI, newPI, savings, upfront, newPrincipal, cashUpfront,
    simpleBreakEven: savings > 0 ? Math.ceil(upfront / savings) : null,
    breakEven, net,
    netAtStay: net[Math.min(net.length, stayYears * 12) - 1] ?? 0,
    lifetimeInterestOld: intOld, lifetimeInterestNew: intNew,
    termAdded: newTermMonths - remainingMonths,
    keepPaymentMonths: oldPI > 0 ? nper(newPrincipal, newRatePct, oldPI) : null,
  };
}

/* ---------- affordability ---------- */

export function affordability({ income, debts = 0, down = 0, ratePct, termMonths = 360, taxPct = 1.1, insAnnual = 1800, hoa = 0, pmiPct = 0.5, frontPct = 28, backPct = 36 }) {
  const monthlyIncome = income / 12;
  const front = monthlyIncome * frontPct / 100;
  const back = monthlyIncome * backPct / 100 - debts;
  const maxHousing = Math.max(0, Math.min(front, back));
  const cost = (price) => {
    const loan = Math.max(0, price - down);
    const ltv = price ? loan / price * 100 : 0;
    const pi = pmt(loan, ratePct, termMonths);
    const tax = price * taxPct / 1200;
    const pmi = ltv > 80 ? loan * pmiPct / 1200 : 0;
    return { total: pi + tax + insAnnual / 12 + hoa + pmi, pi, tax, ins: insAnnual / 12, hoa, pmi, loan, ltv };
  };
  let lo = down, hi = 20_000_000;
  if (cost(lo).total > maxHousing) return { price: 0, maxHousing, limitedBy: front <= back ? 'front' : 'back', breakdown: cost(down), front, back };
  for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (cost(mid).total <= maxHousing) lo = mid; else hi = mid; }
  const price = Math.floor(lo / 1000) * 1000;
  return { price, maxHousing, limitedBy: front <= back ? 'front' : 'back', breakdown: cost(price), front, back };
}

/* ---------- ARM ---------- */

export function projectArm({ principal, months = 360, initialRatePct, fixedMonths = 60, adjustEvery = 6, capInitial = 2, capPeriodic = 1, capLifetime = 5, marginPct = 2.75, indexPct = 4.3, path = 'flat' }) {
  const ceiling = initialRatePct + capLifetime;
  const floor = Math.max(marginPct, 0);
  let rate = initialRatePct, bal = principal, payment = pmt(principal, rate, months);
  const rows = [];
  let total = 0, adjustments = 0;
  for (let k = 1; k <= months && bal > 0.005; k++) {
    if (k > fixedMonths && (k - fixedMonths - 1) % adjustEvery === 0) {
      const yrs = (k - fixedMonths - 1) / 12;
      let idx = indexPct;
      if (path === 'down') idx = Math.max(0, indexPct - 1 * (yrs + 0.5));
      let target = path === 'worst' ? ceiling : idx + marginPct;
      const cap = adjustments === 0 ? capInitial : capPeriodic;
      target = Math.min(Math.max(target, rate - cap), rate + cap);
      rate = Math.min(Math.max(target, floor), ceiling);
      rate = Math.round(rate * 8) / 8; // most notes round to nearest 1/8 point
      payment = pmt(bal, rate, months - k + 1);
      adjustments++;
    }
    const i = bal * rate / 1200;
    const p = Math.min(payment - i, bal);
    bal -= p; total += i + p;
    rows.push({ k, rate, payment: i + p, balance: bal });
  }
  return { rows, total, maxPayment: Math.max(...rows.map((r) => r.payment)), ceiling, floor };
}

/* ---------- helpers ---------- */
function fmt0(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

/* ---------- credit score impact (Fannie Mae LLPA grid) ---------- */

export function llpa(score, ltvPct) {
  const t = RULES.llpa;
  const col = t.ltvMax.findIndex((m) => ltvPct <= m + 1e-9);
  const row = t.rows.find(([min]) => score >= min) || t.rows.at(-1);
  return row[1][col < 0 ? t.ltvMax.length - 1 : col];
}
export const CREDIT_BANDS = [[780, '780+'], [760, '760–779'], [740, '740–759'], [720, '720–739'], [700, '700–719'], [680, '680–699'], [660, '660–679'], [640, '640–659'], [620, '620–639']];

/**
 * Estimated rate/payment for each credit band, anchored on the rate the user was quoted at their own band.
 * ratePct is the user's rate; score is their band (lower bound).
 */
export function creditImpact({ price, loan, ratePct, score, termMonths = 360 }) {
  const ltv = (loan / price) * 100;
  const mine = llpa(score, ltv);
  return CREDIT_BANDS.map(([min, label]) => {
    const rate = Math.max(0, ratePct + (llpa(min, ltv) - mine) * RULES.pointToRate);
    const pmiPct = estimatePmiPct(ltv, min);
    const pi = pmt(loan, rate, termMonths);
    const pmiMonthly = loan * pmiPct / 1200;
    const plan = { principal: loan, ratePct: rate, months: termMonths, start: { y: 2026, m: 1 }, homeValue: price, mi: pmiMonthly ? { kind: 'pmi', monthly: pmiMonthly, removal: 'request' } : { kind: 'none' }, extras: {} };
    const res = amortize(plan, { withExtras: false });
    return { min, label, rate, pmiPct, pi, pmiMonthly, monthly: pi + pmiMonthly, lifetime: res.totals.interest + res.totals.mi, llpa: llpa(min, ltv), mine: min === score };
  });
}

/* ---------- payoff goals, biweekly, recast, cost of waiting ---------- */

/** Extra monthly principal needed to pay the loan off within `targetMonths`. */
export function extraForPayoff(plan, targetMonths) {
  const clean = { ...plan, extras: {} };
  const base = amortize(clean, { withExtras: false });
  if (base.months <= targetMonths) return 0;
  let lo = 0, hi = plan.principal;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (amortize({ ...clean, extras: { monthly: mid } }).months <= targetMonths) hi = mid; else lo = mid;
  }
  return Math.ceil(hi);
}

/**
 * Compare monthly, "true" biweekly (26 half-payments a year, interest per period) and the 1/12-extra shortcut.
 * fee: one-time enrollment fee some servicers/third parties charge; perPayment: fee on each debit.
 */
export function biweeklyCompare(plan, { fee = 0, perPayment = 0 } = {}) {
  const base = amortize({ ...plan, extras: {} }, { withExtras: false });
  const half = base.payment / 2;
  const r = plan.ratePct / 100 / 26;
  let bal = plan.principal, n = 0, interest = 0;
  while (bal > 0.005 && n < 26 * 60) { const i = bal * r; interest += i; bal -= Math.min(half - i, bal); n++; }
  const twelfth = amortize({ ...plan, extras: { monthly: base.payment / 12 } });
  const fees = fee + perPayment * n;
  return {
    monthly: { months: base.months, interest: base.totals.interest },
    biweekly: { months: Math.ceil(n * 12 / 26), interest, fees, saved: base.totals.interest - interest - fees },
    twelfth: { months: twelfth.months, interest: twelfth.totals.interest, saved: base.totals.interest - twelfth.totals.interest, extra: base.payment / 12 },
  };
}

/** A lump sum either shortens the loan (keep payment) or lowers the payment (recast, for a fee). */
export function recastCompare(plan, { lump, fee = 250 }) {
  const clean = { ...plan, extras: {} };
  const base = amortize(clean, { withExtras: false });
  const keep = amortize({ ...clean, extras: { oneTime: [{ k: 1, amount: lump }] } });
  const newBal = Math.max(0, plan.principal - lump);
  const recastPI = pmt(newBal, plan.ratePct, base.months); // same payoff date as today's schedule
  const rec = amortize({ ...clean, principal: newBal, fixedPI: recastPI }, { withExtras: false });
  return {
    base, keep: { months: keep.months, interestSaved: base.totals.interest - keep.totals.interest, payment: base.payment },
    recast: { payment: recastPI, monthlyDrop: base.payment - recastPI, interestSaved: base.totals.interest - rec.totals.interest - fee, fee },
  };
}

/** Savings from starting an extra payment now vs `delayMonths` from now. */
export function costOfWaiting(plan, monthlyExtra, delayMonths = 60) {
  const base = amortize({ ...plan, extras: {} }, { withExtras: false }).totals.interest;
  const now = base - amortize({ ...plan, extras: { monthly: monthlyExtra } }).totals.interest;
  const later = base - amortize({ ...plan, extras: { monthly: monthlyExtra, monthlyFrom: delayMonths + 1 } }).totals.interest;
  return { now, later, lost: now - later };
}

/* ---------- refinance helpers ---------- */

/** Highest new rate at which refinancing still comes out ahead within the stay horizon. */
export function refiRateTarget(params) {
  let lo = 0, hi = params.ratePct;
  if (refinance({ ...params, newRatePct: lo }).netAtStay <= 0) return null;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (refinance({ ...params, newRatePct: mid }).netAtStay > 0) lo = mid; else hi = mid; }
  return Math.floor(lo * 8) / 8; // round down to a quotable 1/8
}

/** Buying points: each point costs 1% of the loan and cuts the rate by `ratePerPoint`. */
export function pointsCompare({ loan, ratePct, months, points = [0, 0.5, 1, 2], ratePerPoint = 0.25 }) {
  const base = pmt(loan, ratePct, months);
  return points.map((p) => {
    const rate = ratePct - p * ratePerPoint;
    const pay = pmt(loan, rate, months);
    const cost = loan * p / 100;
    const save = base - pay;
    return { points: p, rate, cost, payment: pay, monthlySave: save, breakEven: p && save > 0 ? Math.ceil(cost / save) : null };
  });
}

/* ---------- equity and insurance ---------- */

export function equityAt(plan, years, appreciationPct = 3) {
  const rows = amortize({ ...plan }, { withExtras: true }).rows;
  const k = years * 12;
  const bal = k <= rows.length ? rows[k - 1].balance : 0;
  const value = plan.homeValue * Math.pow(1 + appreciationPct / 100, years + (plan.monthsElapsed || 0) / 12);
  return { years, balance: bal, value, equity: value - bal, ltv: (bal / value) * 100 };
}

/** Estimated premium savings from a higher deductible, and years without a claim to come out ahead. */
export function deductibleOptions(premium, deductible) {
  const steps = RULES.hoiDeductible;
  const out = [];
  let keepLo = 1, keepHi = 1;
  for (const [from, to, lo, hi] of steps) {
    if (to <= deductible) continue;
    // a partial first step if the current deductible sits between `from` and `to`
    const share = deductible > from ? (to - deductible) / (to - from) : 1;
    keepLo *= 1 - lo * share; keepHi *= 1 - hi * share;
    const sLo = premium * (1 - keepLo), sHi = premium * (1 - keepHi);
    out.push({ to, lo: sLo, hi: sHi, extraRisk: to - deductible, breakEvenYears: (to - deductible) / ((sLo + sHi) / 2) });
  }
  return out;
}

export function escrowCheck({ escrowMonthly, taxAnnual, insAnnual }) {
  const need = (taxAnnual + insAnnual) / 12;
  const diff = escrowMonthly - need;
  const status = Math.abs(diff) <= need * RULES.escrowTolerance ? 'ok' : diff > 0 ? 'over' : 'short';
  return { need, diff, status, yearly: diff * 12 };
}
