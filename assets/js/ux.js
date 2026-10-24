// Progressive disclosure: remembers what the visitor came to do and what they've opened,
// so the site starts simple and reveals more tools as they explore. Stored only in this browser.
const KEY = 'mf:ux';

export const TOOL_INFO = {
  start:        { name: 'Start', path: '' },
  savings:      { name: 'My savings', path: 'mortgage-savings-check/', pitch: 'Every way to save on your loan, ranked by dollars.' },
  payment:      { name: 'Monthly payment', path: 'mortgage-payment-calculator/', pitch: 'Your full payment with taxes, insurance and PMI.' },
  afford:       { name: 'Affordability', path: 'home-affordability-calculator/', pitch: 'How much home your income supports.' },
  compare:      { name: 'Compare loan types', path: 'fha-vs-conventional-calculator/', pitch: 'Conventional, FHA, VA, USDA side by side.' },
  credit:       { name: 'Credit score impact', path: 'credit-score-mortgage-rate-calculator/', pitch: 'What a higher score is worth each month.' },
  arm:          { name: 'ARM projector', path: 'arm-calculator/', pitch: 'What an adjustable rate could do later.' },
  amortization: { name: 'Payoff schedule', path: 'amortization-schedule-calculator/', pitch: 'Every payment, and what extra payments change.' },
  pmi:          { name: 'Remove PMI', path: 'pmi-removal-calculator/', pitch: 'The earliest month you can stop paying PMI.' },
  optimize:     { name: 'Pay off faster', path: 'extra-payment-calculator/', pitch: 'The best way to use extra money each month.' },
  refinance:    { name: 'Refinance check', path: 'refinance-calculator/', pitch: 'Whether a new rate actually pays off.' },
  import:       { name: 'Upload a document', path: 'mortgage-statement-reader/', pitch: 'Fill everything in from a statement or policy.' },
  scenarios:    { name: 'Saved plans', path: 'saved-scenarios/', pitch: 'Save and compare versions side by side.' },
};

export const GOALS = {
  buy:    { label: 'Buy a home', tools: ['payment', 'afford', 'compare'] },
  lower:  { label: 'Lower what I pay', tools: ['savings', 'pmi', 'refinance', 'import'] },
  faster: { label: 'Pay off my mortgage faster', tools: ['optimize', 'amortization', 'savings'] },
  explore:{ label: 'Just run numbers', tools: ['payment', 'amortization', 'savings'] },
};

// What to suggest next after each tool. Order matters: first unseen one is offered first.
export const RELATED = {
  start: ['savings', 'payment'],
  payment: ['afford', 'compare', 'amortization'],
  afford: ['payment', 'compare', 'credit'],
  compare: ['credit', 'payment', 'arm'],
  credit: ['compare', 'savings'],
  arm: ['compare', 'refinance'],
  amortization: ['optimize', 'pmi', 'savings'],
  pmi: ['optimize', 'savings', 'refinance'],
  optimize: ['amortization', 'pmi', 'savings'],
  refinance: ['credit', 'savings', 'pmi'],
  import: ['savings', 'pmi'],
  savings: ['import', 'optimize', 'refinance'],
  scenarios: ['savings'],
};

function read() {
  try { return { goal: '', onboarded: false, visits: {}, extra: [], expanded: {}, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { goal: '', onboarded: false, visits: {}, extra: [], expanded: {} }; }
}
export const ux = read();
export function saveUx() { try { localStorage.setItem(KEY, JSON.stringify(ux)); } catch {} }

export function visit(tool) { if (!tool) return; ux.visits[tool] = (ux.visits[tool] || 0) + 1; saveUx(); }
export function unlock(tool) { if (tool && !ux.extra.includes(tool)) { ux.extra.push(tool); saveUx(); } }
export function setGoal(goal) { ux.goal = goal; ux.onboarded = true; saveUx(); }

/** Tools the visitor has "met": their goal's tools, anything visited, anything they've been offered and opened. */
export function unlockedTools() {
  const set = new Set(GOALS[ux.goal]?.tools || []);
  for (const t of Object.keys(ux.visits)) set.add(t);
  for (const t of ux.extra) set.add(t);
  set.delete('start');
  return [...set].filter((t) => TOOL_INFO[t]);
}

export function suggestionsFor(tool, n = 2) {
  const seen = new Set(Object.keys(ux.visits));
  const list = (RELATED[tool] || []).filter((t) => t !== tool);
  const fresh = list.filter((t) => !seen.has(t));
  return [...fresh, ...list.filter((t) => seen.has(t))].slice(0, n);
}

export function resetUx() { try { localStorage.removeItem(KEY); } catch {} }
