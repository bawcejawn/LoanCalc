// Document upload & auto-fill: mortgage statement, homeowners insurance declarations page, Loan Estimate / Closing Disclosure.
import { state, set, esc, toast } from '../core.js';
import { parseStatement, parseDeclarations, parseLoanEstimate, detectDoc, pdfText } from '../statement.js';
import { root, monthOptions } from './shared.js';

const DOCS = {
  statement: {
    name: 'Mortgage statement', where: 'The monthly bill from the company you pay your mortgage to. Usually in your email or their website.', parse: parseStatement,
    tips: 'Look for "Unpaid principal balance", "Interest rate", "Principal", "Interest", "Escrow" and "Maturity date".',
    fields: [
      ['balance', 'Current principal balance', 'money'], ['ratePct', 'Interest rate', 'pct'], ['monthlyPI', 'Principal + interest payment', 'money'],
      ['escrow', 'Escrow (taxes + insurance) per month', 'money'], ['miMonthly', 'Mortgage insurance per month', 'money'],
      ['remainingMonths', 'Payments left', 'num'], ['originalAmount', 'Original loan amount', 'money'],
      ['originalValue', 'Home value when you bought (for PMI rules)', 'money'],
    ],
    date: ['dueDate', 'Next payment due'],
    fallback: (k) => { const o = state.own; return k === 'escrow' ? (+o.escrowMonthly || (+o.taxMonthly + +o.insMonthly)) : k === 'miMonthly' ? (o.miKind === 'none' ? 0 : o.miMonthly) : o[k]; },
    fallbackDate: () => ({ m: state.own.nextM, y: state.own.nextY }),
    apply(v, d) {
      set('mode', 'own', { silent: true });
      set('own.balance', v.balance, { silent: true });
      set('own.ratePct', v.ratePct, { silent: true });
      set('own.monthlyPI', v.monthlyPI || '', { silent: true });
      if (v.remainingMonths) set('own.remainingMonths', Math.round(v.remainingMonths), { silent: true });
      if (v.originalAmount) set('own.originalAmount', v.originalAmount, { silent: true });
      if (v.originalValue) set('own.originalValue', v.originalValue, { silent: true });
      if (v.escrow) {
        set('own.escrowMonthly', v.escrow, { silent: true });
        // keep the user's tax/insurance split; if insurance is known from a declarations page, tax is the rest
        const ins = +state.hoi.premium ? +state.hoi.premium / 12 : +state.own.insMonthly;
        if (!+state.own.taxMonthly) set('own.taxMonthly', Math.max(0, Math.round(v.escrow - ins)), { silent: true });
      }
      set('own.miMonthly', v.miMonthly, { silent: true });
      if (!v.miMonthly) set('own.miKind', 'none', { silent: true }); else if (state.own.miKind === 'none') set('own.miKind', 'pmi', { silent: true });
      set('own.nextM', d.m, { silent: true }); set('own.nextY', d.y);
      return 'Saved to "My current loan"';
    },
  },
  hoi: {
    name: 'Home insurance page', where: 'The "declarations page" from your home insurance. It lists your price and what\'s covered.', parse: parseDeclarations,
    tips: 'The declarations ("dec") page is usually page 1 or 2 of your policy or renewal packet. Look for "Coverage A – Dwelling", "Deductible" and "Total premium".',
    fields: [
      ['premium', 'Total yearly premium', 'money'], ['deductible', 'All-perils deductible', 'money'], ['windPct', 'Wind/hail deductible (% of dwelling, if any)', 'pct'],
      ['dwelling', 'Coverage A: dwelling', 'money'], ['otherStructures', 'Coverage B: other structures', 'money'], ['personalProperty', 'Coverage C: personal property', 'money'],
      ['lossOfUse', 'Coverage D: loss of use', 'money'], ['liability', 'Coverage E: personal liability', 'money'],
    ],
    date: ['expires', 'Policy renews'],
    fallback: (k) => state.hoi[k],
    fallbackDate: () => ({ m: state.hoi.renewalM || new Date().getMonth() + 1, y: state.hoi.renewalY || new Date().getFullYear() + 1 }),
    apply(v, d) {
      for (const k of Object.keys(v)) set('hoi.' + k, v[k] || '', { silent: true });
      set('hoi.renewalM', d.m, { silent: true }); set('hoi.renewalY', d.y, { silent: true });
      if (v.premium) { set('own.insMonthly', Math.round(v.premium / 12), { silent: true }); set('buy.insAnnual', Math.round(v.premium), { silent: true }); }
      set('hoi.loaded', true);
      return 'Insurance details saved';
    },
  },
  le: {
    name: 'Loan Estimate', where: 'The 3-page form a lender gives you after you apply. A Closing Disclosure works too.', parse: parseLoanEstimate,
    tips: 'Page 1 has the loan terms and projected payments; page 2 has closing costs and points.',
    fields: [
      ['price', 'Sale price', 'money'], ['loanAmount', 'Loan amount', 'money'], ['ratePct', 'Interest rate', 'pct'], ['termYears', 'Loan term (years)', 'num'],
      ['monthlyPI', 'Monthly principal & interest', 'money'], ['escrow', 'Estimated escrow per month', 'money'], ['closingCosts', 'Total closing costs', 'money'],
      ['cashToClose', 'Cash to close', 'money'], ['pointsPct', 'Points (% of loan)', 'pct'],
    ],
    fallback: (k) => ({ price: state.buy.price, ratePct: state.buy.ratePct, termYears: state.buy.termYears })[k] ?? '',
    apply(v) {
      set('mode', 'buy', { silent: true });
      if (v.price) set('buy.price', v.price, { silent: true });
      if (v.price && v.loanAmount) { set('buy.downMode', 'amt', { silent: true }); set('buy.downAmt', Math.max(0, v.price - v.loanAmount), { silent: true }); }
      if (v.ratePct) set('buy.ratePct', v.ratePct, { silent: true });
      if (v.termYears) set('buy.termYears', v.termYears, { silent: true });
      if (v.closingCosts && v.loanAmount) set('buy.closingPct', Math.round(v.closingCosts / v.loanAmount * 1000) / 10, { silent: true });
      set('le', { loaded: true, ...v });
      return 'Loan Estimate saved to your purchase plan';
    },
  },
};

let docType = 'statement';

export function mount(el) {
  el.classList.add('wide');
  el.innerHTML = `<div class="results">
    <section class="sheet"><h2>1. What kind of paper do you have?</h2>
      <div class="doc-cards" role="group" aria-label="Document type">${Object.entries(DOCS).map(([id, d]) =>
        `<button type="button" class="doc-card" data-doc="${id}" aria-pressed="${id === docType}"><b>${d.name}</b><span>${d.where}</span></button>`).join('')}</div>
      <p class="hint" style="margin-top:8px">Not sure? Just drop it in below. We'll figure out which one it is.</p></section>
    <section class="sheet"><h2>2. Add the file</h2>
      <label class="drop" id="im-drop" tabindex="0"><strong>Tap here to choose a file</strong><span class="hint">or drag a PDF onto this box. Photos work too, but you'll type the numbers.</span>
        <input type="file" id="im-file" accept="application/pdf,image/png,image/jpeg" class="sr-only"></label>
      <p class="safe">Private: your file stays on this device. We read it right here in your browser and never send it anywhere.</p>
      <details style="margin-top:12px"><summary style="cursor:pointer;font-weight:600">No file? Paste the text instead</summary>
        <textarea id="im-text" rows="6" style="margin-top:8px" placeholder="Copy the text from your lender's or insurer's website and paste it here"></textarea>
        <button type="button" class="btn" id="im-parse" style="margin-top:8px">Read pasted text</button></details>
      <p class="btn-row" style="margin-top:10px"><button type="button" class="btn small" id="im-manual">I'll type the numbers myself</button></p>
      <p id="im-status" class="status-msg" role="status"></p>
    </section>
    <section class="sheet" id="im-review" hidden><h2 id="im-review-h">3. Check the numbers</h2>
      <p class="lede">Green means we found it. Yellow means please check it or type it in. Fix anything that looks wrong; you know your papers best.</p>
      <div id="im-preview"></div><div class="found" id="im-fields"></div>
      <div class="btn-row" style="margin-top:14px"><button type="button" class="btn primary" id="im-use">These look right. Show my savings</button></div>
    </section>
  </div>`;
  const drop = el.querySelector('#im-drop'), file = el.querySelector('#im-file'), status = el.querySelector('#im-status');
  const setType = (t) => {
    docType = t;
    el.querySelectorAll('[data-doc]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.doc === t)));
  };
  setType(docType);
  el.querySelectorAll('[data-doc]').forEach((b) => b.addEventListener('click', () => { setType(b.dataset.doc); el.querySelector('#im-review').hidden = true; }));

  const run = (text) => {
    const detected = detectDoc(text);
    if (detected !== docType) setType(detected);
    const found = DOCS[docType].parse(text);
    const n = DOCS[docType].fields.filter(([k]) => found[k]).length;
    status.textContent = text.trim().length < 40 ? 'This looks like a picture of a page, so we can\'t read the words. Please type the numbers below.' : `This looks like a ${DOCS[docType].name.toLowerCase()}. We found ${n} of ${DOCS[docType].fields.length} numbers. Please check them below.`;
    review(found);
  };
  const handle = async (f) => {
    if (!f) return;
    el.querySelector('#im-preview').innerHTML = '';
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      el.querySelector('#im-preview').innerHTML = `<img src="${url}" alt="Your document" style="max-width:100%;max-height:420px;border:1px solid var(--rule);border-radius:8px;margin-bottom:12px">`;
      status.textContent = 'Images contain no readable text here. Type the values from the preview below.';
      review({});
      return;
    }
    status.textContent = 'Reading your file…';
    try { run(await pdfText(f, root())); } catch (e) {
      status.textContent = e?.name === 'PasswordException' ? 'This PDF is password protected. Open it, save a copy without a password, and try again.' : 'Could not read this PDF. Paste the text instead, or type the values below.';
      review({});
    }
  };
  file.addEventListener('change', () => handle(file.files[0]));
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); handle(e.dataTransfer.files[0]); });
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
  el.querySelector('#im-parse').addEventListener('click', () => run(el.querySelector('#im-text').value));
  el.querySelector('#im-manual').addEventListener('click', () => { status.textContent = ''; review({}); });

  function review(found) {
    const D = DOCS[docType];
    el.querySelector('#im-review').hidden = false;
    el.querySelector('#im-review-h').textContent = `3. Check the numbers from your ${D.name.toLowerCase()}`;
    const dateF = D.date && found[D.date[0]]?.value;
    const dd = dateF || D.fallbackDate?.();
    el.querySelector('#im-fields').innerHTML = D.fields.map(([k, label, kind]) => {
      const f = found[k];
      const v = f ? f.value : D.fallback(k);
      return `<div class="f ${f && f.confidence >= 2 ? 'found-ok' : 'found-check'}"><label for="im-${k}">${label} <span class="conf ${f && f.confidence >= 2 ? 'hi' : ''}">${f ? (f.confidence >= 2 ? 'found' : 'check this') : 'not found'}</span></label>
        <div class="affix">${kind === 'money' ? '<span class="pre">$</span>' : ''}<input type="text" inputmode="decimal" id="im-${k}" value="${esc(v ?? '')}" class="${kind === 'money' ? 'has-pre' : ''} ${kind === 'pct' ? 'has-post' : ''}">${kind === 'pct' ? '<span class="post">%</span>' : ''}</div></div>`;
    }).join('') + (D.date ? `<div class="f"><label for="im-dm">${D.date[1]} <span class="conf ${dateF ? 'hi' : ''}">${dateF ? 'found' : 'not found'}</span></label><div class="row">
      <select id="im-dm">${monthOptions.map(([v, l]) => `<option value="${v}" ${dd?.m == v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <input type="text" id="im-dy" inputmode="numeric" value="${dd?.y ?? ''}"></div></div>` : '');
    el.querySelector('#im-review').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  el.querySelector('#im-use').addEventListener('click', () => {
    const D = DOCS[docType];
    const v = {};
    for (const [k] of D.fields) v[k] = +String(el.querySelector('#im-' + k).value).replace(/[^0-9.]/g, '') || 0;
    const d = D.date ? { m: +el.querySelector('#im-dm').value, y: +el.querySelector('#im-dy').value || new Date().getFullYear() } : null;
    toast(D.apply(v, d));
    location.href = root() + 'mortgage-savings-check/';
  });
  return { update() {} };
}
