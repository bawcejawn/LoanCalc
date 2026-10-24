// Start page: one question at a time, then a short personal summary that reveals tools gradually.
import { state, set, derive, firstMonth, $0, pct, ym, dur, esc } from '../core.js';
import * as F from '../finance.js';
import { ux, setGoal, saveUx, unlockedTools, suggestionsFor, unlock, TOOL_INFO, GOALS } from '../ux.js';
import { root } from './shared.js';

const CREDIT = [[780, '780+'], [740, '740–779'], [700, '700–739'], [660, '660–699'], [620, 'Below 660']];

// Each step: question, the state path it fills, and how to ask.
const STEPS = {
  buy: [
    { q: 'About how much is the home?', path: 'buy.price', kind: 'money', chips: [300000, 450000, 600000, 800000] },
    { q: 'How much will you put down?', path: 'buy.downPct', kind: 'pct', chips: [3.5, 5, 10, 20], help: 'Under 20% usually means mortgage insurance. We\'ll show when it can end.', before: () => set('buy.downMode', 'pct', { silent: true }) },
    { q: 'Roughly what is your credit score?', path: 'buy.credit', kind: 'chips', options: CREDIT, help: 'Your best guess is fine. We never check your credit.' },
    { q: 'What interest rate have you been quoted?', path: 'buy.ratePct', kind: 'pct', chips: [5.75, 6.25, 6.75, 7.25], help: "No quote yet? Leave our placeholder and change it later." },
  ],
  lower: [
    { q: 'How would you like to start?', kind: 'choice', options: [['upload', 'Upload my mortgage statement', 'We read it in your browser. Nothing is uploaded.'], ['type', 'Type in four numbers', 'Balance, rate, years left, PMI.']] },
    { q: 'What do you still owe?', path: 'own.balance', kind: 'money', help: 'The principal balance on your latest statement.' },
    { q: "What's your interest rate?", path: 'own.ratePct', kind: 'pct' },
    { q: 'How many years are left on the loan?', path: 'own.remainingMonths', kind: 'years', chips: [15, 20, 25, 28] },
    { q: 'Do you pay mortgage insurance (PMI)?', path: 'own.miKind', kind: 'chips', options: [['pmi', 'Yes, PMI'], ['fha', 'Yes, FHA MIP'], ['none', 'No'], ['unsure', 'Not sure']], help: 'It shows on your statement as PMI, MI or MIP.' },
    { q: 'How much is it each month?', path: 'own.miMonthly', kind: 'money', when: () => state.own.miKind === 'pmi' || state.own.miKind === 'fha' },
    { q: 'What was the home worth when you bought it?', path: 'own.originalValue', kind: 'money', when: () => state.own.miKind === 'pmi', help: 'Purchase price is fine. PMI rules measure equity against it.' },
  ],
  faster: [
    { q: 'What do you still owe?', path: 'own.balance', kind: 'money', help: 'Or upload a statement later to fill this in.' },
    { q: "What's your interest rate?", path: 'own.ratePct', kind: 'pct' },
    { q: 'How many years are left on the loan?', path: 'own.remainingMonths', kind: 'years', chips: [15, 20, 25, 28] },
    { q: 'How much extra could you pay each month?', path: 'opt.budget', kind: 'money', chips: [50, 100, 200, 500] },
  ],
};

let goal = null, step = 0;

export function mount(el) {
  el.classList.add('wide');
  const draw = () => {
    if (goal) return wizard(el, draw);
    if (ux.onboarded) return summary(el, draw);
    return pick(el, draw);
  };
  draw();
  return { update() { if (!goal && ux.onboarded) summary(el, draw); } };
}

/* ---------- step 0: what are you here for ---------- */
function pick(el, draw) {
  el.innerHTML = `<div class="results"><section class="sheet start">
    <h2 class="start-q">What would you like to do?</h2>
    <p class="lede">Pick one. We'll ask a few quick questions and show only what matters to you. You can explore everything else later.</p>
    <div class="goals big">${Object.entries(GOALS).map(([id, g]) => `<button type="button" class="goal" data-goal="${id}"><b>${g.label}</b><span>${{
      buy: 'Payment, what you can afford, which loan fits', lower: 'PMI, refinancing, insurance and escrow', faster: 'Extra payments and a payoff date', explore: 'Go straight to the payment calculator' }[id]}</span></button>`).join('')}</div>
    <p class="hint" style="margin-top:14px">Private by design: everything stays in your browser.</p></section></div>`;
  el.querySelectorAll('[data-goal]').forEach((b) => b.addEventListener('click', () => {
    const g = b.dataset.goal;
    if (g === 'explore') { setGoal('explore'); location.href = root() + TOOL_INFO.payment.path; return; }
    set('mode', g === 'buy' ? 'buy' : 'own', { silent: true });
    goal = g; step = 0; draw();
  }));
}

/* ---------- one question at a time ---------- */
function wizard(el, draw) {
  const steps = STEPS[goal].filter((s) => !s.when || s.when());
  if (step >= steps.length) return finish(draw);
  const s = steps[step];
  s.before?.();
  const cur = s.path ? (s.kind === 'years' ? Math.round(+state.own.remainingMonths / 12) : getPath(s.path)) : null;
  const pre = s.kind === 'money' ? '$' : '', post = s.kind === 'pct' ? '%' : s.kind === 'years' ? 'years' : '';
  const chips = s.chips ? `<div class="chips">${s.chips.map((c) => `<button type="button" class="chip" data-chip="${c}">${s.kind === 'money' ? $0(c) : c + (post ? (s.kind === 'pct' ? '%' : ' yrs') : '')}</button>`).join('')}</div>` : '';
  let body;
  if (s.kind === 'choice') body = `<div class="goals">${s.options.map(([v, l, d]) => `<button type="button" class="goal" data-choice="${v}"><b>${l}</b><span>${d}</span></button>`).join('')}</div>`;
  else if (s.kind === 'chips') body = `<div class="goals">${s.options.map(([v, l]) => `<button type="button" class="goal ${String(cur) === String(v) ? 'on' : ''}" data-choice="${v}"><b>${l}</b></button>`).join('')}</div>`;
  else body = `<div class="big-input"><span>${pre}</span><input id="wz-in" type="text" inputmode="decimal" autocomplete="off" value="${esc(s.kind === 'money' ? Math.round(+cur).toLocaleString('en-US') : cur)}" aria-label="${esc(s.q)}"><span>${post}</span></div>${chips}`;
  el.innerHTML = `<div class="results"><section class="sheet start" aria-live="polite">
    <div class="progress" aria-label="Step ${step + 1} of ${steps.length}">${steps.map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>
    <h2 class="start-q">${s.q}</h2>${s.help ? `<p class="lede">${s.help}</p>` : ''}
    ${body}
    <div class="btn-row" style="margin-top:22px"><button type="button" class="btn" id="wz-back">Back</button>${s.kind === 'money' || s.kind === 'pct' || s.kind === 'years' ? '<button type="button" class="btn primary" id="wz-next">Next</button>' : ''}
      <button type="button" class="btn" id="wz-skip" style="margin-left:auto">${step === steps.length - 1 ? 'Skip' : 'Skip this'}</button></div>
  </section></div>`;
  const input = el.querySelector('#wz-in');
  const commit = () => {
    if (!input || !s.path) return;
    const n = parseFloat(input.value.replace(/[^0-9.]/g, ''));
    if (!isFinite(n)) return;
    if (s.kind === 'years') set('own.remainingMonths', Math.round(n * 12), { silent: true });
    else set(s.path, n, { silent: true });
  };
  const next = () => { commit(); step++; draw(); };
  input?.focus(); input?.select();
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') next(); });
  el.querySelectorAll('[data-chip]').forEach((b) => b.addEventListener('click', () => { input.value = s.kind === 'money' ? (+b.dataset.chip).toLocaleString('en-US') : b.dataset.chip; next(); }));
  el.querySelectorAll('[data-choice]').forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.choice;
    if (s.kind === 'choice' && v === 'upload') { setGoal(goal); goal = null; location.href = root() + TOOL_INFO.import.path; return; }
    if (s.path) {
      if (s.path === 'own.miKind' && v === 'unsure') set('own.miKind', 'none', { silent: true });
      else set(s.path, isNaN(+v) ? v : +v, { silent: true });
    }
    step++; draw();
  }));
  el.querySelector('#wz-next')?.addEventListener('click', next);
  el.querySelector('#wz-skip').addEventListener('click', () => { step++; draw(); });
  el.querySelector('#wz-back').addEventListener('click', () => { if (step === 0) { goal = null; } else step--; draw(); });
}

function finish(draw) {
  if (goal === 'faster') set('extras.monthly', +state.opt.budget, { silent: true });
  if (state.mode === 'own') { set('own.monthlyPI', '', { silent: true }); }
  setGoal(goal);
  goal = null; step = 0;
  set('mode', state.mode); // emit + save
  document.dispatchEvent(new Event('mf:nav'));
  draw();
}

/* ---------- personal summary ---------- */
async function summary(el, draw) {
  const { plan, info } = derive();
  const res = F.amortize(plan);
  const m = firstMonth(res, plan);
  const { collect } = await import('./savings.js');
  const { items } = collect();
  const top = [...items.filter((i) => i.free && (i.lifetime > 1 || i.monthly > 1)), ...items.filter((i) => !i.free)].slice(0, 3);
  const mine = unlockedTools().filter((t) => t !== 'start');
  const next = suggestionsFor(ux.goal === 'buy' ? 'payment' : 'savings', 3).filter((t) => !mine.includes(t)).slice(0, 2);
  const own = info.mode === 'own';
  const link = (i) => (i.actions.find(([, h]) => h && h.includes('/')) || [])[1];
  el.innerHTML = `<div class="results">
    <section class="sheet">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline"><h2 style="margin:0">${own ? 'Your loan today' : 'Your purchase plan'}</h2>
        <button type="button" class="btn small" id="st-redo">Change my answers</button></div>
      <div class="hero" style="grid-template-columns:1fr;margin-top:10px"><div><div class="big">${$0(m.total)}<small> /month</small></div>
      <div class="sub">${own ? `${$0(plan.principal)} at ${pct(plan.ratePct, 3)}, paid off ${ym(res.payoff)}` : `${$0(info.loan)} loan at ${pct(plan.ratePct, 3)} on a ${$0(info.price)} home`}${plan.mi.kind !== 'none' ? `. ${info.miLabel} ${res.miEnd ? 'can end ' + ym(F.monthOf(plan.start, res.miEnd)) : 'lasts the life of the loan'}` : ''}.</div></div></div>
    </section>
    <section class="sheet"><h2>Your best ${top.length > 1 ? top.length + ' moves' : 'move'}</h2>
      <ul class="levers">${top.map((i) => `<li><b>${esc(i.title)}</b><span class="amt ${i.cost ? 'cost' : ''}">${i.amount}</span><p>${i.note}</p>${link(i) ? `<a class="btn small" href="${link(i)}">Show me how</a>` : ''}</li>`).join('')}</ul>
      <p style="margin:12px 0 0"><a href="${root()}${TOOL_INFO.savings.path}">See every way to save</a></p></section>
    <section class="sheet"><h2>Your tools</h2><p class="lede">Picked for what you want to do. More appear as you explore.</p>
      <div class="tool-cards">${mine.map((t) => card(t)).join('')}</div>
      ${next.length ? `<h3 class="sub-h">You might also want</h3><div class="tool-cards">${next.map((t) => card(t, true)).join('')}</div>` : ''}
    </section></div>`;
  el.querySelector('#st-redo').addEventListener('click', () => { ux.onboarded = false; saveUx(); document.dispatchEvent(new Event('mf:nav')); draw(); });
  el.querySelectorAll('[data-unlock]').forEach((a) => a.addEventListener('click', () => unlock(a.dataset.unlock)));
}

function card(t, suggest = false) {
  const i = TOOL_INFO[t];
  return `<a class="tool-card ${suggest ? 'suggest' : ''}" data-nav href="${root()}${i.path}" ${suggest ? `data-unlock="${t}"` : ''}><b>${i.name}</b><span>${i.pitch}</span></a>`;
}

function getPath(p) { return p.split('.').reduce((o, k) => o?.[k], state); }
