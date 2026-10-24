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
