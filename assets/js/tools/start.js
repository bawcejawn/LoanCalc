// Start page: one question at a time, then a short personal summary that reveals tools gradually.
import { state, set, derive, firstMonth, $0, pct, ym, dur, esc } from '../core.js';
import * as F from '../finance.js';
import { ux, setGoal, saveUx, unlockedTools, suggestionsFor, unlock, TOOL_INFO, GOALS } from '../ux.js';
import { root, applyStateDefaults } from './shared.js';
import { STATES } from '../states.js';

const CREDIT = [[780, '780+'], [740, '740–779'], [700, '700–739'], [660, '660–699'], [620, 'Below 660']];

// Each step: question, the state path it fills, and how to ask.
const STEPS = {
  buy: [
    { q: 'About how much is the home?', path: 'buy.price', kind: 'money', chips: [300000, 450000, 600000, 800000] },
    { q: 'Which state is the home in?', path: 'buy.state', kind: 'state', help: 'We\'ll fill in typical property tax and insurance for that state. You can change them later.' },
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

/* ---------- step 0: welcome, then what are you here for ---------- */
let picking = false;
function pick(el, draw) {
  if (!picking) return welcome(el, draw);
  el.innerHTML = `<div class="results"><section class="sheet start">
    <div class="progress" aria-hidden="true"><i class="on"></i><i></i><i></i><i></i></div>
    <p class="step-label">Step 1 of 4</p>
    <h2 class="start-q">What would you like to do?</h2>
    <p class="lede">Pick the one that sounds most like you. You can change it later.</p>
    <div class="goals big">${Object.entries(GOALS).map(([id, g]) => `<button type="button" class="goal" data-goal="${id}"><b>${g.label}</b><span>${{
      buy: "I'm thinking about buying a house.", lower: 'I already have a mortgage and want to pay less each month.', faster: 'I already have a mortgage and want to be done sooner.', explore: 'Skip the questions. Show me the calculator.' }[id]}</span></button>`).join('')}</div>
    <div class="btn-row" style="margin-top:18px"><button type="button" class="btn" id="st-back">Back</button></div></section></div>`;
  el.querySelector('#st-back').addEventListener('click', () => { picking = false; draw(); });
  el.querySelectorAll('[data-goal]').forEach((b) => b.addEventListener('click', () => {
    const g = b.dataset.goal;
    if (g === 'explore') { setGoal('explore'); location.href = root() + TOOL_INFO.payment.path; return; }
    set('mode', g === 'buy' ? 'buy' : 'own', { silent: true });
    goal = g; step = 0; picking = false; draw();
  }));
}

function welcome(el, draw) {
  el.innerHTML = `<div class="results"><section class="sheet start welcome">
    <h2 class="start-q">Welcome! Let's figure out your home loan together.</h2>
    <p class="lede">This site helps you understand a <b>mortgage</b> (a loan to buy a home) and find ways to pay less. It's free, there's nothing to sign up for, and it takes about two minutes.</p>
    <h3 class="sub-h">How it works</h3>
    <ol class="how">
      <li><b>Tell us what you want to do.</b><span>Buying a home? Already have one? Just pick one.</span></li>
      <li><b>Add your numbers.</b><span>Answer a few short questions, or upload your mortgage statement and we'll fill them in for you.</span></li>
      <li><b>See your answer.</b><span>Your monthly payment and when the loan will be paid off, in plain words.</span></li>
      <li><b>Find ways to save.</b><span>Ideas that could save you money, biggest first, with a label that says how sure we are about each one.</span></li>
    </ol>
    <div class="btn-row big-btns"><button type="button" class="btn primary" id="st-go">Let's start</button>
      <a class="btn" href="${root()}${TOOL_INFO.import.path}">Upload a paper instead</a></div>
    <p class="hint" style="margin-top:12px">Stuck anywhere? Tap <b>Help</b> at the top. Words with a dotted line under them explain themselves when you tap them.</p>
  </section>
  <section class="sheet start"><h3 class="sub-h" style="margin-top:0">Four words you'll see a lot</h3>
    <dl class="words four">
      <div><dt>Interest</dt><dd>The extra money you pay for borrowing. It's like rent, but for money.</dd></div>
      <div><dt>Principal</dt><dd>The money you actually borrowed. Each payment pays some of it back.</dd></div>
      <div><dt>PMI</dt><dd>An extra charge when you put less than 20% down. It can be removed later, and we'll show you when.</dd></div>
      <div><dt>Escrow</dt><dd>A savings jar your lender keeps to pay your property tax and home insurance for you.</dd></div>
    </dl></section>
  <section class="sheet start"><h3 class="sub-h" style="margin-top:0">Our promise</h3>
    <ul class="promise-list">
      <li>We show the math, not a sales pitch.</li>
      <li>Ads are always marked <span class="ad-tag">Ad</span>, sit below your results, and can't change them.</li>
      <li>Your numbers and papers stay on your device. We never ask for your name, Social Security number or account numbers.</li>
      <li>When something is a guess, we say so.</li>
    </ul></section></div>`;
  el.querySelector('#st-go').addEventListener('click', () => { picking = true; draw(); el.querySelector('.goal')?.focus(); });
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
  else if (s.kind === 'state') body = `<select id="wz-state" class="big-select" aria-label="${esc(s.q)}"><option value="">Choose a state</option>${STATES.map((x) => `<option value="${x.code}" ${state.buy.state === x.code ? 'selected' : ''}>${x.name}</option>`).join('')}</select>`;
  else if (s.kind === 'chips') body = `<div class="goals">${s.options.map(([v, l]) => `<button type="button" class="goal ${String(cur) === String(v) ? 'on' : ''}" data-choice="${v}"><b>${l}</b></button>`).join('')}</div>`;
  else body = `<div class="big-input"><span>${pre}</span><input id="wz-in" type="text" inputmode="decimal" autocomplete="off" value="${esc(s.kind === 'money' ? Math.round(+cur).toLocaleString('en-US') : cur)}" aria-label="${esc(s.q)}"><span>${post}</span></div>${chips}`;
  el.innerHTML = `<div class="results"><section class="sheet start" aria-live="polite">
    <div class="progress" aria-hidden="true">${steps.map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>
    <p class="step-label">Step 2 of 4 · Question ${step + 1} of ${steps.length}</p>
    <h2 class="start-q">${s.q}</h2>${s.help ? `<p class="lede">${s.help}</p>` : ''}
    ${body}
    <div class="btn-row" style="margin-top:22px"><button type="button" class="btn" id="wz-back">Back</button>${s.kind === 'money' || s.kind === 'pct' || s.kind === 'years' || s.kind === 'state' ? '<button type="button" class="btn primary" id="wz-next">Next</button>' : ''}
      <button type="button" class="btn" id="wz-skip" style="margin-left:auto">${step === steps.length - 1 ? 'Skip' : 'Skip this'}</button></div>
  </section></div>`;
  const input = el.querySelector('#wz-in');
  const commit = () => {
    if (s.kind === 'state') { const v = el.querySelector('#wz-state').value; set('buy.state', v, { silent: true }); if (v) applyStateDefaults(); return; }
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
  el.querySelector('#wz-back').addEventListener('click', () => { if (step === 0) { goal = null; picking = true; } else step--; draw(); });
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
const CHECKLIST = {
  buy: [['payment', 'See your full monthly payment'], ['afford', 'Check how much home you can afford'], ['rentbuy', 'Check if buying beats renting'], ['closing', 'Add up your closing costs'], ['compare', 'Compare kinds of loans'], ['import', 'Get 3 lender quotes, then upload each Loan Estimate']],
  lower: [['import', 'Upload your mortgage statement'], ['pmi', 'Find out when PMI can stop'], ['refinance', 'Check if a new rate would pay off'], ['savings', 'See every way to save']],
  faster: [['optimize', 'Pick the best way to pay extra'], ['amortization', 'See your new payoff date'], ['pmi', 'Check if PMI ends sooner too'], ['savings', 'See every way to save']],
  explore: [['payment', 'See your monthly payment'], ['amortization', 'See your payoff schedule'], ['savings', 'See every way to save']],
};

async function summary(el, draw) {
  const { plan, info } = derive();
  const res = F.amortize(plan);
  const m = firstMonth(res, plan);
  const { collect, sureBadge } = await import('./savings.js');
  const { items } = collect();
  const top = [...items.filter((i) => i.free && (i.lifetime > 1 || i.monthly > 1)), ...items.filter((i) => !i.free)].slice(0, 3);
  const own = info.mode === 'own';
  const link = (i) => (i.actions.find(([, h]) => h && h.includes('/')) || [])[1];
  const list = CHECKLIST[ux.goal] || CHECKLIST.explore;
  const done = list.filter(([t]) => ux.visits[t] > 0).length;
  const next = list.find(([t]) => !(ux.visits[t] > 0));
  const mi = plan.mi.kind !== 'none' ? ` You also pay ${info.miLabel}, which ${res.miEnd ? `can stop in ${ym(F.monthOf(plan.start, res.miEnd))}` : 'lasts the whole loan'}.` : '';
  el.innerHTML = `<div class="results">
    <section class="sheet">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline"><h2 style="margin:0">Here's your answer</h2>
        <button type="button" class="btn small" id="st-redo">Change my answers</button></div>
      <div class="hero" style="grid-template-columns:1fr;margin-top:10px"><div><div class="big">${$0(m.total)}<small> a month</small></div>
      <p class="plain">${own
        ? `You owe ${$0(plan.principal)} at ${pct(plan.ratePct, 3)} interest. If you keep paying like you are now, the loan will be paid off in <b>${ym(res.payoff)}</b>.`
        : `For a ${$0(info.price)} home with ${$0(info.down)} down, you'd borrow ${$0(info.loan)} at ${pct(plan.ratePct, 3)} interest. Over ${plan.months / 12} years you'd pay ${$0(res.totals.interest)} in interest on top of the loan.`}${mi}</p></div></div>
    </section>
    <section class="sheet"><h2>Your checklist</h2>
      <div class="meter" role="img" aria-label="${done} of ${list.length} done"><i style="width:${(done / list.length) * 100}%"></i></div>
      <p class="hint">${done} of ${list.length} done${next ? `. Next: <b>${esc(next[1])}</b>.` : '. Nice work!'}</p>
      <ol class="checklist">${list.map(([t, label]) => { const ok = ux.visits[t] > 0; return `<li class="${ok ? 'done' : ''} ${next && next[0] === t ? 'next' : ''}"><a data-nav data-unlock="${t}" href="${root()}${TOOL_INFO[t].path}"><span class="tick" aria-hidden="true">${ok ? '✓' : ''}</span><span>${esc(label)}</span>${ok ? '<span class="sr-only">(done)</span>' : ''}</a></li>`; }).join('')}</ol>
    </section>
    <section class="sheet"><h2>${top.length} ways you could save</h2>
      <ul class="levers">${top.map((i) => `<li><span><b>${esc(i.title)}</b> ${sureBadge(i.sure)}</span><span class="amt ${i.cost ? 'cost' : ''}">${i.amount}</span><p>${i.note}</p>${link(i) ? `<a class="btn small" data-nav href="${link(i)}">Show me how</a>` : ''}</li>`).join('')}</ul>
      <p style="margin:12px 0 0"><a data-nav href="${root()}${TOOL_INFO.savings.path}">See every way to save</a></p></section>
  </div>`;
  el.querySelector('#st-redo').addEventListener('click', () => { ux.onboarded = false; saveUx(); picking = true; document.dispatchEvent(new Event('mf:nav')); draw(); });
  el.querySelectorAll('[data-unlock]').forEach((a) => a.addEventListener('click', () => unlock(a.dataset.unlock)));
}

function card(t, suggest = false) {
  const i = TOOL_INFO[t];
  return `<a class="tool-card ${suggest ? 'suggest' : ''}" data-nav href="${root()}${i.path}" ${suggest ? `data-unlock="${t}"` : ''}><b>${i.name}</b><span>${i.pitch}</span></a>`;
}

function getPath(p) { return p.split('.').reduce((o, k) => o?.[k], state); }
