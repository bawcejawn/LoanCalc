// Document upload & auto-fill: mortgage statement, homeowners insurance declarations page, Loan Estimate / Closing Disclosure.
import { state, set, esc, toast } from '../core.js';
import { parseStatement, parseDeclarations, parseLoanEstimate, detectDoc, pdfText } from '../statement.js';
import { root, monthOptions } from './shared.js';

const DOCS = {
  statement: {
    name: 'Mortgage statement', parse: parseStatement,
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
    name: 'Homeowners insurance declarations page', parse: parseDeclarations,
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
    name: 'Loan Estimate or Closing Disclosure', parse: parseLoanEstimate,
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
    <section class="sheet"><h2>Read a document</h2>
      <p class="lede">Your file is read inside this browser tab. It is never uploaded, and nothing is saved except the numbers you confirm.</p>
      <div class="seg" role="group" aria-label="Document type" id="im-type" style="margin-bottom:12px">${Object.entries(DOCS).map(([id, d]) =>
        `<button type="button" data-doc="${id}" aria-pressed="${id === docType}">${d.name.replace('Homeowners insurance declarations page', 'Insurance declarations').replace('Loan Estimate or Closing Disclosure', 'Loan Estimate / CD')}</button>`).join('')}</div>
      <label class="drop" id="im-drop" tabindex="0"><strong>Drop a PDF here</strong><span class="hint">or click to choose a file (PDF, PNG or JPG). We detect the document type for you.</span>
        <input type="file" id="im-file" accept="application/pdf,image/png,image/jpeg" class="sr-only"></label>
      <details style="margin-top:12px"><summary style="cursor:pointer;font-weight:600">Or paste the document text</summary>
        <textarea id="im-text" rows="6" style="margin-top:8px" placeholder="Copy the text from your servicer's or insurer's website or PDF and paste it here"></textarea>
        <button type="button" class="btn" id="im-parse" style="margin-top:8px">Read pasted text</button></details>
      <p class="btn-row" style="margin-top:10px"><button type="button" class="btn small" id="im-manual">Type the numbers in instead</button></p>
      <p id="im-status" class="hint" role="status" style="margin-top:6px"></p>
    </section>
    <section class="sheet" id="im-review" hidden><h2 id="im-review-h">Check these numbers</h2>
      <p class="lede">Found automatically where possible. "Check this" means the match was weak. Fix anything that's wrong, then use them.</p>
      <div id="im-preview"></div><div class="found" id="im-fields"></div>
      <div class="btn-row" style="margin-top:14px"><button type="button" class="btn primary" id="im-use">Use these numbers and check my savings</button></div>
    </section>
    <section class="sheet"><h2>Tips for best results</h2><ul>
      <li>Use the PDF your servicer or insurer emails or posts online. Photos and scans contain no text, so type the numbers from the preview.</li>
      <li>Password-protected PDFs need to be opened and saved without the password first.</li>
      <li id="im-tip"></li></ul></section>
  </div>`;
  const drop = el.querySelector('#im-drop'), file = el.querySelector('#im-file'), status = el.querySelector('#im-status');
  const setType = (t) => {
    docType = t;
    el.querySelectorAll('[data-doc]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.doc === t)));
    el.querySelector('#im-tip').textContent = DOCS[t].tips;
  };
  setType(docType);
  el.querySelectorAll('[data-doc]').forEach((b) => b.addEventListener('click', () => { setType(b.dataset.doc); el.querySelector('#im-review').hidden = true; }));

  const run = (text) => {
    const detected = detectDoc(text);
    if (detected !== docType) setType(detected);
    const found = DOCS[docType].parse(text);
    const n = DOCS[docType].fields.filter(([k]) => found[k]).length;
    status.textContent = text.trim().length < 40 ? 'This looks like a scan with no text. Type the values below.' : `Read as: ${DOCS[docType].name}. Found ${n} of ${DOCS[docType].fields.length} values.`;
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
    status.textContent = 'Reading PDF…';
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
    el.querySelector('#im-review-h').textContent = `Check these numbers: ${D.name.toLowerCase()}`;
    const dateF = D.date && found[D.date[0]]?.value;
    const dd = dateF || D.fallbackDate?.();
    el.querySelector('#im-fields').innerHTML = D.fields.map(([k, label, kind]) => {
      const f = found[k];
      const v = f ? f.value : D.fallback(k);
      return `<div class="f"><label for="im-${k}">${label} <span class="conf ${f && f.confidence >= 2 ? 'hi' : ''}">${f ? (f.confidence >= 2 ? 'found' : 'check this') : 'not found'}</span></label>
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
