// Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../assets/js/finance.js';

const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b} (±${tol})`);
const plan = (o = {}) => ({ principal: 300000, ratePct: 6.5, months: 360, start: { y: 2026, m: 12 }, homeValue: 375000,
  taxMonthly: 0, insMonthly: 0, hoaMonthly: 0, mi: { kind: 'none' }, extras: {}, ...o });

test('payment matches standard formula', () => {
  near(F.pmt(300000, 6.5, 360), 1896.20, 0.01);
  near(F.pmt(200000, 0, 240), 833.33, 0.01);
  near(F.pmt(400000, 7, 180), 3595.31, 0.01);
});

test('amortization pays to zero and totals reconcile', () => {
  const a = F.amortize(plan(), { withExtras: false });
  assert.equal(a.months, 360);
  near(a.rows.at(-1).balance, 0, 0.01);
  near(a.totals.principal, 300000, 0.05);
  near(a.totals.interest, 1896.20 * 360 - 300000, 2);
});

test('extra payments shorten loan and save interest', () => {
  const c = F.compareExtras(plan({ extras: { monthly: 200 } }));
  assert.ok(c.monthsSaved >= 80 && c.monthsSaved <= 86, `months saved ${c.monthsSaved}`);
  assert.ok(c.interestSaved > 80000, `saved ${c.interestSaved}`);
});

test('biweekly ≈ one extra payment per year', () => {
  const c = F.compareExtras(plan({ extras: { biweekly: true } }));
  assert.ok(c.monthsSaved >= 55 && c.monthsSaved <= 75, `months saved ${c.monthsSaved}`);
});

test('PMI stops at 80% on request with extras, auto at 78% on schedule', () => {
  // 300k loan on 375k = 80% already; use 95% LTV instead
  const p = plan({ principal: 356250, homeValue: 375000, mi: { kind: 'pmi', monthly: 150, removal: 'request' } });
  const t = F.pmiTimeline(p);
  assert.ok(t.request80Scheduled < t.auto78, 'request before auto');
  const a = F.amortize(p, { withExtras: false });
  assert.equal(a.miEnd, t.request80Scheduled);
  const pAuto = { ...p, mi: { ...p.mi, removal: 'auto' } };
  assert.equal(F.amortize(pAuto, { withExtras: false }).miEnd, t.auto78);
  // extras accelerate request date but NOT automatic termination
  const pEx = { ...p, extras: { monthly: 500 } };
  const tEx = F.pmiTimeline(pEx);
  assert.ok(tEx.request80Actual < t.request80Scheduled);
  assert.equal(tEx.auto78, t.auto78);
  assert.equal(F.amortize({ ...pEx, mi: { ...p.mi, removal: 'auto' } }).miEnd, t.auto78);
});

test('FHA MIP table and duration', () => {
  assert.equal(F.fhaAnnualMipPct(300000, 96.5, 360), 0.55);
  assert.equal(F.fhaAnnualMipPct(300000, 90, 360), 0.50);
  assert.equal(F.fhaAnnualMipPct(800000, 96.5, 360), 0.75);
  assert.equal(F.fhaAnnualMipPct(300000, 90, 180), 0.15);
  assert.equal(F.fhaAnnualMipPct(800000, 85, 180), 0.40);
  assert.equal(F.fhaMipMonths(90), 132);
  assert.equal(F.fhaMipMonths(96.5), Infinity);
  const a = F.amortize(plan({ mi: { kind: 'fha', annualPct: 0.5, maxMonths: 132 } }), { withExtras: false });
  assert.equal(a.miEnd, 133);
  near(a.rows[0].mi, 300000 * 0.005 / 12, 0.01);
});

test('VA funding fee tiers', () => {
  assert.equal(F.vaFundingFeePct(0, false), 2.15);
  assert.equal(F.vaFundingFeePct(5, false), 1.5);
  assert.equal(F.vaFundingFeePct(10, true), 1.25);
  assert.equal(F.vaFundingFeePct(0, true), 3.3);
  assert.equal(F.vaFundingFeePct(0, true, true), 0);
});

test('refinance break-even is sensible', () => {
  const r = F.refinance({ balance: 300000, ratePct: 7.5, remainingMonths: 336, newRatePct: 6.25, newTermMonths: 360, costs: 6000 });
  assert.ok(r.savings > 200);
  assert.ok(r.simpleBreakEven > 15 && r.simpleBreakEven < 30, `simple ${r.simpleBreakEven}`);
  assert.ok(r.breakEven !== null);
  const bad = F.refinance({ balance: 300000, ratePct: 6.5, remainingMonths: 300, newRatePct: 6.4, newTermMonths: 360, costs: 8000, rollCosts: true });
  assert.ok(bad.netAtStay < 0, 'tiny rate drop with term reset should lose money in 7 yrs');
});

test('affordability respects ratios', () => {
  const a = F.affordability({ income: 120000, debts: 500, down: 60000, ratePct: 6.5 });
  assert.ok(a.price > 300000 && a.price < 600000, `price ${a.price}`);
  assert.ok(a.breakdown.total <= a.maxHousing + 1);
});

test('ARM worst case hits lifetime cap', () => {
  const w = F.projectArm({ principal: 400000, initialRatePct: 5.75, path: 'worst' });
  assert.equal(Math.max(...w.rows.map((r) => r.rate)), 10.75);
  const f = F.projectArm({ principal: 400000, initialRatePct: 5.75, path: 'flat', indexPct: 4.3, marginPct: 2.75 });
  assert.equal(f.rows.at(-1).rate, 7.0); // 4.3 + 2.75 = 7.05 -> nearest 1/8 = 7.0
});

test('optimizer ranks and compares investing', () => {
  const o = F.optimize(plan(), { monthlyBudget: 200, lumpSum: 10000, investReturnPct: 6 });
  assert.ok(o.strategies.length >= 4);
  for (let i = 1; i < o.strategies.length; i++) assert.ok(o.strategies[i - 1].saved >= o.strategies[i].saved);
  assert.ok(o.invest.prepayThenInvest > 0 && o.invest.investOnly > 0);
  // investing at a return far above the loan rate should win; far below should lose
  assert.equal(F.optimize(plan(), { monthlyBudget: 200, investReturnPct: 12 }).invest.winner, 'invest');
  assert.equal(F.optimize(plan(), { monthlyBudget: 200, investReturnPct: 2 }).invest.winner, 'prepay');
});

test('LLPA lookup and credit impact', () => {
  assert.equal(F.llpa(785, 90), 0.25);
  assert.equal(F.llpa(745, 80), 0.875);
  assert.equal(F.llpa(600, 97), 1.75);
  const rows = F.creditImpact({ price: 400000, loan: 360000, ratePct: 6.5, score: 700 });
  const mine = rows.find((r) => r.mine);
  near(mine.rate, 6.5, 1e-9);
  const top = rows[0];
  assert.ok(top.rate < mine.rate && top.monthly < mine.monthly, 'better score -> lower cost');
  near(mine.rate - top.rate, (1.25 - 0.25) * 0.2, 1e-9);
});

test('extra needed to hit a payoff goal', () => {
  const p = plan();
  const x = F.extraForPayoff(p, 180);
  assert.ok(F.amortize({ ...p, extras: { monthly: x } }).months <= 180);
  assert.ok(F.amortize({ ...p, extras: { monthly: x - 5 } }).months > 180);
  assert.equal(F.extraForPayoff(p, 400), 0);
});

test('biweekly, recast and cost of waiting', () => {
  const b = F.biweeklyCompare(plan(), { fee: 300 });
  assert.ok(b.biweekly.months < b.monthly.months - 40);
  assert.ok(b.biweekly.saved > 0 && b.twelfth.saved > 0);
  const r = F.recastCompare(plan(), { lump: 30000, fee: 250 });
  assert.ok(r.recast.payment < r.keep.payment);
  assert.ok(r.keep.interestSaved > r.recast.interestSaved, 'keeping the payment saves more interest');
  const w = F.costOfWaiting(plan(), 200, 60);
  assert.ok(w.now > w.later && w.lost > 10000);
});

test('refi rate target and points', () => {
  const base = { balance: 300000, ratePct: 7.5, remainingMonths: 336, newTermMonths: 360, costs: 6000, stayYears: 5 };
  const t = F.refiRateTarget(base);
  assert.ok(t > 5 && t < 7.5, `target ${t}`);
  assert.ok(F.refinance({ ...base, newRatePct: t }).netAtStay > 0);
  assert.ok(F.refinance({ ...base, newRatePct: t + 0.25 }).netAtStay <= 0);
  const pts = F.pointsCompare({ loan: 400000, ratePct: 6.5, months: 360 });
  assert.equal(pts[0].breakEven, null);
  assert.ok(pts[2].breakEven > 40 && pts[2].breakEven < 80, `1pt BE ${pts[2].breakEven}`);
});

test('insurance deductible and escrow checks', () => {
  const d = F.deductibleOptions(2400, 1000);
  assert.equal(d[0].to, 2500);
  near(d[0].hi, 2400 * 0.24, 0.01);
  assert.ok(d[1].hi > d[0].hi && d[1].to === 5000);
  assert.equal(F.deductibleOptions(2400, 5000).length, 0);
  assert.equal(F.escrowCheck({ escrowMonthly: 700, taxAnnual: 6000, insAnnual: 1800 }).status, 'over');
  assert.equal(F.escrowCheck({ escrowMonthly: 650, taxAnnual: 6000, insAnnual: 1800 }).status, 'ok');
});

test('equity projection', () => {
  const e = F.equityAt(plan(), 10, 3);
  near(e.value, 375000 * Math.pow(1.03, 10), 1);
  assert.ok(e.equity > 375000 * Math.pow(1.03, 10) - 300000);
});

test('rent vs buy: cheap rent favors renting, expensive rent favors buying', () => {
  const base = { price: 400000, down: 40000, closing: 12000, ratePct: 6.5, taxPct: 1.0, insAnnual: 1800, appreciationPct: 3, investPct: 5, years: 30 };
  const cheap = F.rentVsBuy({ ...base, rent: 1200 });
  const dear = F.rentVsBuy({ ...base, rent: 3800 });
  assert.ok(cheap.years[6].rentWorth > cheap.years[6].buyWorth, 'cheap rent: renting ahead at 7 years');
  assert.ok(dear.years[6].buyWorth > dear.years[6].rentWorth, 'expensive rent: buying ahead at 7 years');
  assert.ok(dear.breakEvenYear !== null && dear.breakEvenYear <= 7);
  // year-1 renter starts with the buyer's upfront cash invested
  assert.ok(cheap.years[0].rentWorth > 52000);
  // equity after 30 years: loan paid off, so equity ≈ value less selling costs
  near(dear.years[29].balance, 0, 1);
});

test('closing costs add up and credits reduce cash', () => {
  const c = F.closingCosts({ loan: 360000, price: 400000, ratePct: 6.5, insAnnual: 1800, taxAnnual: 4800, down: 40000, earnest: 5000, sellerCredit: 3000,
    items: [{ id: 'orig', label: 'Origination', section: 'lender', amount: 1800 }, { id: 'appr', label: 'Appraisal', section: 'noShop', amount: 600 }, { id: 'title', label: 'Title', section: 'shop', amount: 1500 }] });
  const prepaidInt = 360000 * 0.065 / 365 * 15;
  near(c.total, 1800 + 600 + 1500 + prepaidInt + 1800 + 450 + 1200, 0.01);
  near(c.cashToClose, 40000 + c.total - 3000 - 5000, 0.01);
  near(c.loanCosts, 3900, 0.01);
});
