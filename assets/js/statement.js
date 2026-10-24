// Mortgage statement reader. Everything runs in this browser tab; files are never uploaded.
import * as F from './finance.js';

const MONEY = String.raw`\$?\s?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?)`;
const DATE = String.raw`(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})`;
const GAP = String.raw`[^$\d]{0,40}?`;

const RULES = {
  balance: [[`(?:unpaid|outstanding|current)\\s+principal\\s+balance${GAP}${MONEY}`, 3], [`principal\\s+balance${GAP}${MONEY}`, 2], [`loan\\s+balance${GAP}${MONEY}`, 1]],
  ratePct: [[String.raw`interest\s+rate[^\d]{0,30}?(\d{1,2}\.\d{1,5})\s?%`, 3], [String.raw`(\d{1,2}\.\d{2,5})\s?%`, 1]],
  monthlyPI: [[`principal\\s*(?:and|&|\\+)\\s*interest${GAP}${MONEY}`, 3]],
  principalPart: [[`\\bprincipal\\b(?!\\s+(?:balance|and|&))${GAP}${MONEY}`, 2]],
  interestPart: [[`\\binterest\\b(?!\\s+(?:rate|paid|and))${GAP}${MONEY}`, 2]],
  escrow: [[`escrow(?:\\s*\\((?:for\\s+)?taxes\\s*(?:and|&|\\/)\\s*(?:or\\s+)?insurance\\))?(?!\\s+balance)${GAP}${MONEY}`, 2]],
  miMonthly: [[`(?:private\\s+)?mortgage\\s+insurance(?:\\s+premium)?${GAP}${MONEY}`, 2], [`\\b(?:pmi|mip)\\b${GAP}${MONEY}`, 2]],
  totalDue: [[`regular\\s+monthly\\s+payment${GAP}${MONEY}`, 3], [`(?:total\\s+)?amount\\s+due${GAP}${MONEY}`, 2], [`payment\\s+amount${GAP}${MONEY}`, 1]],
  originalAmount: [[`original\\s+(?:loan|principal)\\s+(?:amount|balance)${GAP}${MONEY}`, 3]],
  dueDate: [[String.raw`(?:payment\s+)?due\s+date[^\dA-Za-z]{0,12}` + DATE, 3]],
  maturity: [[String.raw`maturity\s+date[^\dA-Za-z]{0,12}` + DATE, 3]],
};

function parseDate(s) {
  if (!s) return null;
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) return { y: +m[3] < 100 ? 2000 + +m[3] : +m[3], m: +m[1] };
  m = s.match(/^(\d{4})-(\d{2})/);
  if (m) return { y: +m[1], m: +m[2] };
  const d = new Date(s.replace('Sept', 'Sep'));
  return isNaN(d) ? null : { y: d.getFullYear(), m: d.getMonth() + 1 };
}
const num = (s) => +String(s).replace(/,/g, '');

/** Pull candidate values out of statement text. Returns { field: { value, confidence } }. */
export function parseStatement(text) {
  const t = text.replace(/ /g, ' ').replace(/[ \t]+/g, ' ');
  const out = {};
  for (const [key, rules] of Object.entries(RULES)) {
    for (const [src, conf] of rules) {
      const m = t.match(new RegExp(src, 'i'));
      if (!m) continue;
      const raw = m[1];
      let value = key === 'dueDate' || key === 'maturity' ? parseDate(raw) : num(raw);
      if (key === 'ratePct' && (value <= 0.5 || value > 20)) continue;
      if (typeof value === 'number' && !(value > 0)) continue;
      if (value) { out[key] = { value, confidence: conf }; break; }
    }
  }
  if (!out.monthlyPI && out.principalPart && out.interestPart) {
    out.monthlyPI = { value: Math.round((out.principalPart.value + out.interestPart.value) * 100) / 100, confidence: 2 };
  }
  // remaining payments: from maturity date if present, else solve from balance/rate/payment
  if (out.maturity && out.dueDate) {
    const n = (out.maturity.value.y - out.dueDate.value.y) * 12 + (out.maturity.value.m - out.dueDate.value.m) + 1;
    if (n > 0 && n <= 480) out.remainingMonths = { value: n, confidence: 3 };
  } else if (out.balance && out.ratePct && out.monthlyPI) {
    const n = F.nper(out.balance.value, out.ratePct.value, out.monthlyPI.value);
    if (isFinite(n)) out.remainingMonths = { value: n, confidence: 2 };
  }
  return out;
}

/* ---------- other documents ---------- */

function runRules(rules, text) {
  const t = text.replace(/ /g, ' ').replace(/[ \t]+/g, ' ');
  const out = {};
  for (const [key, list] of Object.entries(rules)) {
    for (const [src, conf, kind] of list) {
      const m = t.match(new RegExp(src, 'i'));
      if (!m) continue;
      const raw = m[1];
      const value = kind === 'date' ? parseDate(raw) : kind === 'text' ? raw.trim() : num(raw);
      if (value === null || value === '' || (typeof value === 'number' && !(value > 0))) continue;
      out[key] = { value, confidence: conf };
      break;
    }
  }
  return out;
}

// Homeowners insurance declarations page (HO-3 style). Labels vary by carrier, so each field tries several.
const HOI_RULES = {
  premium: [[`total\\s+(?:annual\\s+)?(?:policy\\s+)?premium${GAP}${MONEY}`, 3], [`annual\\s+premium${GAP}${MONEY}`, 3], [`policy\\s+premium${GAP}${MONEY}`, 2], [`\\bpremium${GAP}${MONEY}`, 1]],
  dwelling: [[`(?:coverage\\s+a\\b|cov\\.?\\s*a\\b)[^$\\d]{0,30}?${MONEY}`, 3], [`\\bdwelling(?:\\s+coverage)?${GAP}${MONEY}`, 2]],
  otherStructures: [[`(?:coverage\\s+b\\b)[^$\\d]{0,30}?${MONEY}`, 3], [`other\\s+structures${GAP}${MONEY}`, 2]],
  personalProperty: [[`(?:coverage\\s+c\\b)[^$\\d]{0,30}?${MONEY}`, 3], [`personal\\s+property${GAP}${MONEY}`, 2]],
  lossOfUse: [[`(?:coverage\\s+d\\b)[^$\\d]{0,30}?${MONEY}`, 3], [`loss\\s+of\\s+use${GAP}${MONEY}`, 2]],
  liability: [[`(?:coverage\\s+e\\b)[^$\\d]{0,30}?${MONEY}`, 3], [`personal\\s+liability${GAP}${MONEY}`, 2]],
  deductible: [[`all\\s+(?:other\\s+)?perils?(?:\\s+\\(?aop\\)?)?\\s+deductible${GAP}${MONEY}`, 3], [`\\baop\\b[^$\\d]{0,20}?${MONEY}`, 2], [`deductible${GAP}${MONEY}`, 1]],
  windPct: [[String.raw`(?:wind|hail|hurricane|named\s+storm)[^%\n]{0,50}?(\d{1,2}(?:\.\d+)?)\s?%`, 2]],
  expires: [[String.raw`(?:policy\s+period|effective)[^\n]{0,60}?(?:to|through|thru|-)\s*` + DATE, 3, 'date'], [String.raw`expir(?:es|ation)(?:\s+date)?[^\dA-Za-z]{0,12}` + DATE, 3, 'date']],
};

// CFPB Loan Estimate / Closing Disclosure (standard form labels).
const LE_RULES = {
  price: [[`sale\\s+price${GAP}${MONEY}`, 3], [`(?:appraised|estimated)\\s+(?:prop\\.?|property)\\s+value${GAP}${MONEY}`, 2]],
  loanAmount: [[`loan\\s+amount${GAP}${MONEY}`, 3]],
  ratePct: [[String.raw`interest\s+rate[^\d]{0,20}?(\d{1,2}(?:\.\d{1,5})?)\s?%`, 3]],
  termYears: [[String.raw`loan\s+term[^\d]{0,10}(\d{1,2})\s*(?:yr|year)`, 3]],
  monthlyPI: [[`(?:monthly\\s+)?principal\\s*(?:&|and)\\s*interest${GAP}${MONEY}`, 3]],
  escrow: [[`estimated\\s+escrow${GAP}${MONEY}`, 2]],
  totalMonthly: [[`estimated\\s+total\\s+monthly\\s+payment${GAP}${MONEY}`, 3]],
  closingCosts: [[`(?:estimated\\s+)?(?:total\\s+)?closing\\s+costs${GAP}${MONEY}`, 2]],
  cashToClose: [[`(?:estimated\\s+)?cash\\s+to\\s+close${GAP}${MONEY}`, 3]],
  pointsPct: [[String.raw`(\d*\.?\d+)\s?%\s+of\s+loan\s+amount\s+\(points\)`, 3]],
  pointsAmt: [[String.raw`%\s+of\s+loan\s+amount\s+\(points\)[^$\d]{0,10}` + MONEY, 3]],
};

export function parseDeclarations(text) { return runRules(HOI_RULES, text); }
export function parseLoanEstimate(text) { return runRules(LE_RULES, text); }

/** Guess the document type from its text. */
export function detectDoc(text) {
  const t = text.toLowerCase();
  if (/loan estimate|closing disclosure|projected payments|cash to close/.test(t) && /loan term/.test(t)) return 'le';
  if (/declarations?\s+page|policy\s+declarations|coverage\s+a|dwelling/.test(t) && /premium/.test(t)) return 'hoi';
  return 'statement';
}

/** Extract text from a PDF File using the vendored pdf.js (loaded on demand). */
export async function pdfText(file, rootPath) {
  // import() resolves against this module's URL, so build absolute URLs from the page.
  const pdfjs = await import(new URL(rootPath + 'assets/vendor/pdfjs/pdf.min.mjs', location.href).href);
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(rootPath + 'assets/vendor/pdfjs/pdf.worker.min.mjs', location.href).href;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  const pages = [];
  for (let i = 1; i <= Math.min(doc.numPages, 6); i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    let lastY = null, line = [];
    const lines = [];
    for (const it of tc.items) {
      const y = Math.round(it.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 2) { lines.push(line.join(' ')); line = []; }
      line.push(it.str); lastY = y;
    }
    lines.push(line.join(' '));
    pages.push(lines.join('\n'));
  }
  await doc.destroy();
  return pages.join('\n');
}
