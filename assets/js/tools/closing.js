// Closing cost estimator: itemized like a Loan Estimate, with what you can shop for.
import { state, set, derive, bindFields, field, $0, pct, esc } from '../core.js';
import * as F from '../finance.js';
import { syncDownPct, inputsPanel, stateField, root } from './shared.js';

const SECTIONS = [
  ['lender', 'Lender fees', 'Set by the lender. Compare these between Loan Estimates.'],
  ['noShop', 'Services you can\'t shop for', 'The lender picks these.'],
  ['shop', 'Services you can shop for', 'Your Loan Estimate lists who to call. Getting quotes can save money.'],
  ['gov', 'Taxes and government fees', 'Recording and transfer taxes. Who pays transfer tax depends on your state and contract.'],
  ['prepaid', 'Prepaids', 'Bills paid ahead: the first year of insurance and interest until your first payment.'],
  ['escrow', 'Starting your escrow account', 'A cushion so your lender can pay tax and insurance bills when they come.'],
];

export function mount(el) {
  syncDownPct();
  el.innerHTML = `<form class="inputs" aria-label="Closing cost inputs" onsubmit="return false"></form>
  <div class="results">
    <section class="sheet"><h2>What you'll need on closing day</h2><div id="cc-hero"></div><dl class="stats" id="cc-stats"></dl></section>
    <section class="sheet"><h2>Every fee, line by line</h2>
      <p class="lede">Grouped the same way as the Loan Estimate a lender gives you. <span class="sure sure-guess" title="Typical starting amounts; your Loan Estimate has the real numbers.">Rough guess</span></p>
      <div class="scroll" style="max-height:none;border:0"><table class="ledger" id="cc-table"></table></div></section>
    <section class="sheet"><h2>Ways to pay less at closing</h2><ul class="levers" id="cc-tips"></ul></section>
    <div class="slot" data-slot="results"></div>
  </div>`;
  inputsPanel(el.querySelector('.inputs'), () => `<h2>The home and loan</h2>
    ${field({ path: 'buy.price', label: 'Home price', kind: 'money', slider: true, min: 50000, max: 2000000, step: 5000 })}
    ${field({ path: 'buy.downPct', label: 'Down payment', kind: 'pct', slider: true, min: 0, max: 50, step: 0.5 })}
    ${field({ path: 'buy.ratePct', label: 'Interest rate', kind: 'pct' })}
    ${stateField()}
    ${field({ path: 'cc.earnest', label: 'Earnest money already paid', kind: 'money', tip: 'The deposit you paid when your offer was accepted. It counts toward your cash to close.' })}
    ${field({ path: 'cc.sellerCredit', label: 'Seller credit', kind: 'money', tip: 'Money the seller agreed to pay toward your costs.' })}
    ${field({ path: 'cc.lenderCredit', label: 'Lender credit', kind: 'money', tip: 'Some lenders cover costs in exchange for a slightly higher rate.' })}
    <details class="more-opts"><summary>Change the fees <span>lender, title, appraisal, taxes, escrow</span></summary>
      ${field({ path: 'cc.origPct', label: 'Origination charge (% of loan)', kind: 'pct' })}
      ${field({ path: 'cc.lenderFees', label: 'Underwriting and processing', kind: 'money' })}
      ${field({ path: 'cc.appraisal', label: 'Appraisal', kind: 'money' })}
      ${field({ path: 'cc.creditReport', label: 'Credit report', kind: 'money' })}
      ${field({ path: 'cc.floodTax', label: 'Flood certificate and tax service', kind: 'money' })}
      ${field({ path: 'cc.titleLenderPct', label: 'Title insurance, lender\'s policy (% of loan)', kind: 'pct' })}
      ${field({ path: 'cc.titleOwner', label: 'Title insurance, owner\'s policy', kind: 'money', tip: 'Optional in some places; in some states the seller usually pays it.' })}
      ${field({ path: 'cc.settlement', label: 'Settlement / escrow company fee', kind: 'money' })}
      ${field({ path: 'cc.inspections', label: 'Home inspection, survey, pest check', kind: 'money' })}
      ${field({ path: 'cc.recording', label: 'Recording fees', kind: 'money' })}
      ${field({ path: 'cc.transferPct', label: 'Transfer tax you pay (% of price)', kind: 'pct', tip: 'Zero in many states; check your contract for who pays.' })}
      ${field({ path: 'cc.prepaidDays', label: 'Days of prepaid interest', kind: 'num', tip: 'Closing near the end of the month means fewer days.' })}
      ${field({ path: 'cc.escrowMonths', label: 'Months of escrow cushion', kind: 'num' })}
    </details>`, bindFields);
  const update = () => render(el);
  update();
  return { update };
}

function render(el) {
  const s = state, c = s.cc;
  const { plan, info } = derive({ ...s, mode: 'buy', buy: { ...s.buy, downMode: 'pct' } });
  const loan = info.baseLoan;
  const items = [
    { id: 'orig', label: 'Origination charge', section: 'lender', amount: loan * +c.origPct / 100 },
    { id: 'points', label: 'Discount points', section: 'lender', amount: 0 },
    { id: 'uw', label: 'Underwriting and processing', section: 'lender', amount: +c.lenderFees },
    { id: 'appr', label: 'Appraisal', section: 'noShop', amount: +c.appraisal },
    { id: 'credit', label: 'Credit report', section: 'noShop', amount: +c.creditReport },
    { id: 'flood', label: 'Flood certificate and tax service', section: 'noShop', amount: +c.floodTax },
    { id: 'titleL', label: 'Title insurance (lender\'s policy)', section: 'shop', amount: loan * +c.titleLenderPct / 100 },
    { id: 'titleO', label: 'Title insurance (owner\'s policy)', section: 'shop', amount: +c.titleOwner },
    { id: 'settle', label: 'Settlement / escrow company', section: 'shop', amount: +c.settlement },
    { id: 'insp', label: 'Inspection, survey, pest check', section: 'shop', amount: +c.inspections },
    { id: 'rec', label: 'Recording fees', section: 'gov', amount: +c.recording },
    { id: 'xfer', label: 'Transfer tax', section: 'gov', amount: info.price * +c.transferPct / 100 },
  ];
  const r = F.closingCosts({ loan: plan.principal, price: info.price, ratePct: plan.ratePct, insAnnual: +s.buy.insAnnual, taxAnnual: info.price * +s.buy.taxPct / 100,
    items, sellerCredit: +c.sellerCredit, lenderCredit: +c.lenderCredit, earnest: +c.earnest, down: info.down, prepaidDays: +c.prepaidDays, escrowMonths: +c.escrowMonths,
    upfrontFeeCash: s.buy.financeFee ? 0 : info.upfrontFee });
  const le = s.le.loaded && +s.le.closingCosts ? +s.le.closingCosts : 0;
  el.querySelector('#cc-hero').innerHTML = `<div class="hero" style="grid-template-columns:1fr"><div><div class="big">${$0(r.cashToClose)}</div>
    <p class="plain">That's your ${$0(info.down)} down payment plus about ${$0(r.net)} in closing costs${r.credits ? ` after ${$0(r.credits)} of credits` : ''}${+c.earnest ? `, minus the ${$0(+c.earnest)} you already paid` : ''}. Bring it as a wire or cashier's check, never by a link in an email. Call your title company at a number you already know to confirm wiring instructions.</p></div></div>
    ${le ? `<p class="${Math.abs(le - r.total) / r.total < 0.15 ? 'good' : 'note'}" style="margin-top:10px">Your uploaded Loan Estimate shows ${$0(le)} in closing costs; this estimate is ${$0(r.total)}. ${Math.abs(le - r.total) / r.total < 0.15 ? 'They\'re close.' : 'Ask the lender to explain the biggest differences.'}</p>` : ''}`;
  el.querySelector('#cc-stats').innerHTML = [
    ['Closing costs', $0(r.total)], ['As a share of the loan', pct(r.pctOfLoan, 1)], ['Loan costs', $0(r.loanCosts)], ['Prepaids and escrow', $0(r.otherCosts)],
  ].map(([a, b]) => `<div class="stat"><dt>${a}</dt><dd>${b}</dd></div>`).join('');
  el.querySelector('#cc-table').innerHTML = SECTIONS.map(([id, name, note]) => {
    const rows = r.items.filter((i) => i.section === id);
    if (!rows.length) return '';
    const sub = rows.reduce((a, i) => a + i.amount, 0);
    return `<tbody><tr><th colspan="2" style="text-align:left;padding-top:16px">${name}<br><small style="font-weight:400;color:var(--ink-3)">${note}</small></th></tr>
      ${rows.map((i) => `<tr><td>${esc(i.label)}</td><td>${$0(i.amount)}</td></tr>`).join('')}
      <tr><td style="font-weight:600">Subtotal</td><td style="font-weight:600">${$0(sub)}</td></tr></tbody>`;
  }).join('') + `<tfoot><tr><td>Total closing costs</td><td>${$0(r.total)}</td></tr>${r.credits ? `<tr><td>Credits</td><td>−${$0(r.credits)}</td></tr>` : ''}</tfoot>`;
  const tips = [
    ['Shop the services you\'re allowed to', 'Title insurance and settlement fees often vary between companies. Your Loan Estimate lists the ones you can choose.'],
    ['Compare lender fees, not just rates', 'Put two or three Loan Estimates side by side and compare the first section, lender fees.'],
    ['Close near the end of the month', 'You prepay interest from closing day to the end of the month, so a later closing date means less to bring.'],
    ['Ask for a seller or lender credit', 'In some markets sellers agree to cover part of your costs. Lenders can trade a slightly higher rate for a credit.'],
  ];
  el.querySelector('#cc-tips').innerHTML = tips.map(([t, n]) => `<li><b>${t}</b><span></span><p>${n}</p></li>`).join('')
    + `<li><b>Use this total in your payment plan</b><span></span><p>Sets closing costs on the payment calculator to ${pct(r.pctOfLoan, 1)} of the loan.</p><button type="button" class="btn small" id="cc-use">Use ${$0(r.total)}</button></li>`;
  el.querySelector('#cc-use').addEventListener('click', () => { set('buy.closingPct', Math.round(r.total / Math.max(1, loan) * 1000) / 10); location.href = root() + 'mortgage-payment-calculator/'; });
}
