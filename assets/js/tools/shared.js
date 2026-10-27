// Inputs shared by several tools + helpers to evaluate "what if" variants.
import { field, state, derive, get, set } from '../core.js';
import { STATES, stateByCode, STATE_SOURCES } from '../states.js';
import * as F from '../finance.js';

const thisYear = new Date().getFullYear();
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthOptions = MONTHS.map((m, i) => [i + 1, m]);
const yearOptions = Array.from({ length: 8 }, (_, i) => [thisYear - 1 + i, String(thisYear - 1 + i)]);

export function modeSwitch() {
  return field({ path: 'mode', kind: 'seg', label: 'I want to plan', options: [['buy', 'A new purchase'], ['own', 'My current loan']] });
}

export function loanInputs({ compact = false } = {}) {
  if (state.mode === 'own') return ownInputs(compact);
  const b = state.buy;
  const t = b.loanType;
  const isConv = t === 'conventional' || t === 'jumbo';
  return `
  ${field({ path: 'buy.price', label: 'Home price', kind: 'money', slider: true, min: 50000, max: 2000000, step: 5000 })}
  ${field({ path: 'buy.downMode', kind: 'seg', label: 'Down payment as', options: [['pct', 'Percent'], ['amt', 'Dollars']] })}
  ${b.downMode === 'pct'
    ? field({ path: 'buy.downPct', label: 'Down payment', kind: 'pct', slider: true, min: 0, max: 50, step: 0.5 })
    : field({ path: 'buy.downAmt', label: 'Down payment', kind: 'money', slider: true, min: 0, max: Math.max(100000, Math.round(b.price / 2)), step: 1000 })}
  ${field({ path: 'buy.ratePct', label: 'Interest rate', kind: 'pct', slider: true, min: 2, max: 10, step: 0.125, tip: 'Use the rate from a lender quote if you have one. APR includes fees; use the note rate here.' })}
  ${field({ path: 'buy.termYears', label: 'Loan term', kind: 'seg', options: [[10, '10'], [15, '15'], [20, '20'], [25, '25'], [30, '30']] })}
  <details class="more-opts" ${moreOpen ? 'open' : ''}><summary>More options <span>loan type, taxes, insurance, HOA</span></summary>
  ${field({ path: 'buy.loanType', label: 'Loan type', kind: 'select', options: [['conventional', 'Conventional'], ['fha', 'FHA'], ['va', 'VA'], ['usda', 'USDA'], ['jumbo', 'Jumbo']] })}
  ${isConv ? field({ path: 'buy.credit', label: 'Credit score', kind: 'select', numeric: true, options: [[760, '760+'], [740, '740–759'], [720, '720–739'], [700, '700–719'], [680, '680–699'], [660, '660–679'], [640, '640–659'], [620, '620–639']], tip: 'Used only to estimate PMI. Nothing is checked or stored anywhere but your browser.' }) : ''}
  ${isConv ? field({ path: 'buy.pmiPct', label: 'PMI rate (yearly)', kind: 'pct', placeholder: 'Estimated for you', tip: 'Leave blank to use an estimate from your down payment and credit score. Paste a real quote for accuracy.' }) : ''}
  ${t === 'va' ? field({ path: 'buy.vaSubsequent', kind: 'check', label: 'I have used my VA benefit before' }) + field({ path: 'buy.vaExempt', kind: 'check', label: 'Exempt from the funding fee (e.g. VA disability compensation)' }) : ''}
  ${t === 'fha' || t === 'va' || t === 'usda' ? field({ path: 'buy.financeFee', kind: 'check', label: 'Add the upfront fee to my loan' }) : ''}
  ${compact ? '</details>' : `
  <h2>Taxes, insurance and fees</h2>
  ${stateField()}
  ${field({ path: 'buy.taxPct', label: 'Property tax (per year)', kind: 'pct', slider: true, min: 0, max: 3, step: 0.05, tip: 'Percent of home value. Check your county assessor; the US average is around 1%.' })}
  ${field({ path: 'buy.insAnnual', label: 'Home insurance (per year)', kind: 'money' })}
  ${field({ path: 'buy.hoa', label: 'HOA dues (per month)', kind: 'money' })}
  ${field({ path: 'buy.closingPct', label: 'Closing costs', kind: 'pct', tip: 'Lender, title and prepaid costs, as a percent of the loan. 2–5% is typical.' })}
  <div class="f"><span class="lbl">First payment</span><div class="row">
    ${field({ path: 'buy.startM', label: '<span class="sr-only">Month</span>', kind: 'select', numeric: true, options: monthOptions })}
    ${field({ path: 'buy.startY', label: '<span class="sr-only">Year</span>', kind: 'select', numeric: true, options: yearOptions })}
  </div></div></details>`}`;
}

function ownInputs(compact) {
  const o = state.own;
  const computed = F.pmt(+o.balance, +o.ratePct, +o.remainingMonths);
  return `
  <p class="hint">Have a statement? <a href="${root()}mortgage-statement-reader/">Fill these in from a PDF</a>.</p>
  ${field({ path: 'own.balance', label: 'Current balance', kind: 'money', slider: true, min: 10000, max: 1500000, step: 1000 })}
  ${field({ path: 'own.ratePct', label: 'Interest rate', kind: 'pct', slider: true, min: 2, max: 10, step: 0.125 })}
  ${field({ path: 'own.remainingMonths', label: 'Payments left', kind: 'num', post: 'mo', slider: true, min: 1, max: 480, step: 1, hint: '12 per year left. 300 = 25 years.' })}
  <details class="more-opts" ${moreOpen ? 'open' : ''}><summary>More options <span>exact payment, PMI, escrow, original loan</span></summary>
  ${field({ path: 'own.monthlyPI', label: 'Principal + interest payment', kind: 'money', placeholder: Math.round(computed).toLocaleString('en-US') + ' (calculated)', tip: 'Shown on your statement. Leave blank to calculate it from balance, rate and payments left.' })}
  <div class="f"><span class="lbl">Next payment due</span><div class="row">
    ${field({ path: 'own.nextM', label: '<span class="sr-only">Month</span>', kind: 'select', numeric: true, options: monthOptions })}
    ${field({ path: 'own.nextY', label: '<span class="sr-only">Year</span>', kind: 'select', numeric: true, options: yearOptions })}
  </div></div>
  ${compact ? '' : `
  <h2>Original loan</h2>
  ${field({ path: 'own.originalValue', label: 'Home value when you bought', kind: 'money', tip: 'Purchase price or original appraisal. PMI rules measure equity against this number.' })}
  ${field({ path: 'own.originalAmount', label: 'Original loan amount', kind: 'money' })}
  ${field({ path: 'own.originalTermYears', label: 'Original term', kind: 'seg', options: [[15, '15'], [20, '20'], [30, '30']] })}
  <h2>Escrow and insurance</h2>
  ${field({ path: 'own.taxMonthly', label: 'Property tax (per month)', kind: 'money' })}
  ${field({ path: 'own.insMonthly', label: 'Home insurance (per month)', kind: 'money' })}
  ${field({ path: 'own.hoa', label: 'HOA dues (per month)', kind: 'money' })}
  ${field({ path: 'own.miKind', label: 'Mortgage insurance', kind: 'select', options: [['none', 'None'], ['pmi', 'PMI (conventional)'], ['fha', 'FHA MIP'], ['usda', 'USDA annual fee']] })}
  ${o.miKind !== 'none' ? field({ path: 'own.miMonthly', label: 'Mortgage insurance (per month)', kind: 'money' }) : ''}
  ${o.miKind === 'fha' ? field({ path: 'own.mipLife', kind: 'check', label: 'My MIP lasts for the life of the loan (put less than 10% down)' }) : ''}`}</details>`;
}

export function extrasInputs() {
  return `
  ${field({ path: 'extras.monthly', label: 'Extra each month', kind: 'money', slider: true, min: 0, max: 2000, step: 25 })}
  ${field({ path: 'extras.annual', label: 'Extra once a year', kind: 'money', tip: 'A bonus or tax refund. Applied in the month you choose below.' })}
  ${field({ path: 'extras.annualMonth', label: 'Yearly extra paid in', kind: 'select', numeric: true, options: monthOptions })}
  ${field({ path: 'extras.oneTimeAmt', label: 'One-time lump sum', kind: 'money' })}
  ${field({ path: 'extras.oneTimeK', label: 'Lump sum paid with payment #', kind: 'num', hint: 'Payment 1 is your first (or next) payment.' })}
  ${field({ path: 'extras.biweekly', kind: 'check', label: 'Pay half my payment every two weeks', hint: '26 half-payments a year equal 13 full payments. Confirm your servicer applies them as they arrive.' })}`;
}

export function hasExtras(s = state) {
  const e = s.extras; return +e.monthly > 0 || +e.annual > 0 || +e.oneTimeAmt > 0 || e.biweekly;
}

/** Evaluate a modified copy of state: variant(fn) → { plan, info, res } */
export function variant(mutate, { withExtras = true } = {}) {
  const s = structuredClone(state);
  mutate?.(s);
  const { plan, info } = derive(s);
  return { plan, info, res: F.amortize(plan, { withExtras }), s };
}

export function root() { return document.body.dataset.root || './'; }

// remembers whether "More options" is open, so re-renders don't snap it shut
export let moreOpen = false;
const REBUILD = new Set(['mode', 'buy.downMode', 'buy.loanType', 'buy.termYears', 'own.miKind', 'own.originalTermYears', 'pmi.removal']);
/** Render an inputs panel and re-render it when a structural choice changes. */
export function inputsPanel(container, html, bind, extraRebuild = []) {
  const rebuildOn = new Set([...REBUILD, ...extraRebuild]);
  const render = (focusPath) => {
    container.innerHTML = html();
    bind(container, (path) => { if (path === 'buy.state') applyStateDefaults(); if (rebuildOn.has(path) || path === 'buy.state') render(path); });
    container.querySelectorAll('details.more-opts').forEach((d) => d.addEventListener('toggle', () => { moreOpen = d.open; }));
    if (focusPath) container.querySelector(`[data-path="${focusPath}"], [data-seg="${focusPath}"][aria-pressed="true"]`)?.focus();
  };
  render();
  return render;
}

/** Ask the app to rebuild the current tool (after a button changes inputs). */
export function remount(msg) {
  document.dispatchEvent(new CustomEvent('mf:remount', { detail: msg }));
}

/** State picker that fills in typical property tax and insurance for that state. */
export function stateField() {
  const st = stateByCode(state.buy.state);
  return field({ path: 'buy.state', label: 'State', kind: 'select', options: [['', 'Choose a state'], ...STATES.map((x) => [x.code, x.name])],
    hint: st ? `Filled in ${st.name}'s typical property tax (${st.taxPct}%, ${STATE_SOURCES.tax}) and insurance ($${st.ins.toLocaleString('en-US')}/yr, ${STATE_SOURCES.ins}). Your real bills may differ; change them below.` : 'Pick the state to fill in typical property tax and insurance.' });
}
/** Some tools only take a down-payment percent; keep it in step with a dollar amount entered elsewhere. */
export function syncDownPct() {
  if (state.buy.downMode === 'amt' && +state.buy.price) set('buy.downPct', Math.round(+state.buy.downAmt / +state.buy.price * 1000) / 10, { silent: true });
  set('buy.downMode', 'pct', { silent: true });
}
export function applyStateDefaults() {
  const st = stateByCode(state.buy.state);
  if (!st) return;
  set('buy.taxPct', st.taxPct, { silent: true });
  set('buy.insAnnual', st.ins);
}
