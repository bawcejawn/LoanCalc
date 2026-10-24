// Statement upload & auto-fill
import { state, set, $0, esc, toast } from '../core.js';
import { parseStatement, pdfText } from '../statement.js';
import { root, monthOptions } from './shared.js';

const FIELDS = [
  ['balance', 'Current principal balance', 'money'], ['ratePct', 'Interest rate', 'pct'], ['monthlyPI', 'Principal + interest payment', 'money'],
  ['escrow', 'Escrow (taxes + insurance) per month', 'money'], ['miMonthly', 'Mortgage insurance per month', 'money'],
  ['remainingMonths', 'Payments left', 'num'], ['originalAmount', 'Original loan amount', 'money'],
  ['originalValue', 'Home value when you bought (for PMI rules)', 'money'],
];

export function mount(el) {
  el.classList.add('wide');
  el.innerHTML = `<div class="results">
    <section class="sheet"><h2>Read your mortgage statement</h2>
      <p class="lede">Your file is read inside this browser tab. It is never uploaded, and nothing is saved except the numbers you confirm.</p>
      <label class="drop" id="im-drop" tabindex="0"><strong>Drop a PDF statement here</strong><span class="hint">or click to choose a file (PDF, PNG or JPG)</span>
        <input type="file" id="im-file" accept="application/pdf,image/png,image/jpeg" class="sr-only"></label>
      <details style="margin-top:12px"><summary style="cursor:pointer;font-weight:600">Or paste the statement text</summary>
        <textarea id="im-text" rows="6" style="margin-top:8px" placeholder="Copy the text from your servicer's website or PDF and paste it here"></textarea>
        <button type="button" class="btn" id="im-parse" style="margin-top:8px">Read pasted text</button></details>
      <p id="im-status" class="hint" role="status" style="margin-top:12px"></p>
    </section>
    <section class="sheet" id="im-review" hidden><h2>Check these numbers</h2>
      <p class="lede">Found automatically where possible. Fix anything that's wrong, then use them.</p>
      <div id="im-preview"></div><div class="found" id="im-fields"></div>
      <div class="btn-row" style="margin-top:14px"><button type="button" class="btn primary" id="im-use">Use these numbers</button></div>
    </section>
    <section class="sheet"><h2>Tips for best results</h2><ul>
      <li>Use the PDF your servicer emails or posts online. Photos and scans contain no text, so type the numbers in by hand from the preview.</li>
      <li>Password-protected PDFs need to be opened and saved without the password first.</li>
      <li>Look for "Unpaid principal balance", "Interest rate", "Principal", "Interest", "Escrow" and "Maturity date".</li></ul></section>
  </div>`;
  const drop = el.querySelector('#im-drop'), file = el.querySelector('#im-file'), status = el.querySelector('#im-status');
  const handle = async (f) => {
    if (!f) return;
    el.querySelector('#im-preview').innerHTML = '';
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      el.querySelector('#im-preview').innerHTML = `<img src="${url}" alt="Your statement" style="max-width:100%;max-height:420px;border:1px solid var(--rule);border-radius:8px;margin-bottom:12px">`;
      status.textContent = 'Images contain no readable text here. Type the values from the preview below.';
      review({});
      return;
    }
    status.textContent = 'Reading PDF…';
    try {
      const text = await pdfText(f, root());
      const found = parseStatement(text);
      const n = Object.keys(found).filter((k) => FIELDS.some(([f]) => f === k)).length;
      status.textContent = text.trim().length < 40 ? 'This PDF looks like a scan with no text. Type the values below.' : `Found ${n} of ${FIELDS.length} values.`;
      review(found);
    } catch (e) {
      status.textContent = e?.name === 'PasswordException' ? 'This PDF is password protected. Open it, save a copy without a password, and try again.' : 'Could not read this PDF. Paste the text instead, or type the values below.';
      review({});
    }
  };
  file.addEventListener('change', () => handle(file.files[0]));
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); handle(e.dataTransfer.files[0]); });
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
  el.querySelector('#im-parse').addEventListener('click', () => {
    const found = parseStatement(el.querySelector('#im-text').value);
    status.textContent = `Found ${Object.keys(found).length} values in the pasted text.`;
    review(found);
  });

  function review(found) {
    const o = state.own;
    const due = found.dueDate?.value;
    el.querySelector('#im-review').hidden = false;
    el.querySelector('#im-fields').innerHTML = FIELDS.map(([k, label, kind]) => {
      const f = found[k];
      const fallback = k === 'escrow' ? (+o.taxMonthly + +o.insMonthly) : k === 'miMonthly' ? (o.miKind === 'none' ? 0 : o.miMonthly) : o[k];
      const v = f ? f.value : fallback;
      return `<div class="f"><label for="im-${k}">${label} <span class="conf ${f && f.confidence >= 2 ? 'hi' : ''}">${f ? (f.confidence >= 2 ? 'found' : 'check this') : 'not found'}</span></label>
        <div class="affix">${kind === 'money' ? '<span class="pre">$</span>' : ''}<input type="text" inputmode="decimal" id="im-${k}" value="${esc(v ?? '')}" class="${kind === 'money' ? 'has-pre' : ''} ${kind === 'pct' ? 'has-post' : ''}">${kind === 'pct' ? '<span class="post">%</span>' : ''}</div></div>`;
    }).join('') + `<div class="f"><label for="im-dm">Next payment due <span class="conf ${due ? 'hi' : ''}">${due ? 'found' : 'not found'}</span></label><div class="row">
      <select id="im-dm">${monthOptions.map(([v, l]) => `<option value="${v}" ${(due ? due.m : o.nextM) == v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <input type="text" id="im-dy" inputmode="numeric" value="${due ? due.y : o.nextY}"></div></div>`;
    el.querySelector('#im-review').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  el.querySelector('#im-use').addEventListener('click', () => {
    const v = (k) => +String(el.querySelector('#im-' + k).value).replace(/[^0-9.]/g, '') || 0;
    set('mode', 'own', { silent: true });
    set('own.balance', v('balance'), { silent: true });
    set('own.ratePct', v('ratePct'), { silent: true });
    set('own.monthlyPI', v('monthlyPI') || '', { silent: true });
    if (v('remainingMonths')) set('own.remainingMonths', Math.round(v('remainingMonths')), { silent: true });
    if (v('originalAmount')) set('own.originalAmount', v('originalAmount'), { silent: true });
    if (v('originalValue')) set('own.originalValue', v('originalValue'), { silent: true });
    const esc2 = v('escrow');
    if (esc2) { const ratio = (+state.own.taxMonthly || 1) / ((+state.own.taxMonthly + +state.own.insMonthly) || 2); set('own.taxMonthly', Math.round(esc2 * ratio), { silent: true }); set('own.insMonthly', Math.round(esc2 * (1 - ratio)), { silent: true }); }
    const mi = v('miMonthly');
    set('own.miMonthly', mi, { silent: true }); if (!mi) set('own.miKind', 'none', { silent: true }); else if (state.own.miKind === 'none') set('own.miKind', 'pmi', { silent: true });
    set('own.nextM', +el.querySelector('#im-dm').value, { silent: true });
    set('own.nextY', +el.querySelector('#im-dy').value || state.own.nextY);
    toast('Saved to "My current loan"');
    location.href = root();
  });
  return { update() {} };
}
