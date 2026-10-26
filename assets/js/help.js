// Plain-language help: what each page does, how to use it, what the numbers mean, and a word list.
// Written so a 12-year-old can follow it. Used by the welcome page, the "How this page works" box and the Help drawer.

export const WORDS = {
  'mortgage': 'A loan to buy a home. You pay it back a little every month, usually for 15 or 30 years.',
  'interest': 'Extra money you pay the lender for borrowing. Think of it as rent you pay on the money.',
  'interest rate': 'How much interest you pay each year, as a percent of what you still owe. Lower is better.',
  'principal': 'The money you actually borrowed. Every payment pays some of it back.',
  'balance': 'How much of the loan you still owe right now.',
  'down payment': 'The money you pay up front when you buy. The rest is borrowed.',
  'term': 'How many years you have to pay the loan back. Usually 15 or 30.',
  'PMI': 'Private mortgage insurance. An extra monthly charge when you put less than 20% down. It protects the lender, not you, and it can be removed later.',
  'MIP': 'FHA mortgage insurance. Like PMI, but for FHA loans, and harder to remove.',
  'mortgage insurance': 'An extra monthly charge that protects the lender if a loan isn\'t paid. Common when you put less than 20% down.',
  'escrow': 'A savings jar your lender keeps for you. Part of each payment goes in, and the lender uses it to pay your property tax and home insurance.',
  'property tax': 'A yearly tax your town or county charges on your home.',
  'home insurance': 'Insurance that pays to fix or rebuild your home if something bad happens, like a fire.',
  'deductible': 'The part of a repair you pay yourself before insurance pays the rest.',
  'premium': 'The price you pay for insurance, usually per year.',
  'refinance': 'Swapping your loan for a new one, usually to get a lower interest rate.',
  'break-even': 'The point where a choice has paid for itself. Before it, you\'re behind; after it, you\'re ahead.',
  'closing costs': 'Fees you pay to get a loan, like the appraisal and paperwork. Often 2–5% of the loan.',
  'points': 'Money you can pay up front to get a lower interest rate. One point costs 1% of the loan.',
  'equity': 'The part of your home you really own: what it\'s worth minus what you still owe.',
  'loan-to-value': 'How much you owe compared with what the home is worth. Owe $80 on a $100 home and it\'s 80%.',
  'LTV': 'Loan-to-value: how much you owe compared with what the home is worth.',
  'amortization': 'The plan that shows how each payment is split between interest and paying down the loan.',
  'payoff': 'The day the loan is fully paid back.',
  'credit score': 'A number from about 300 to 850 that shows how reliably someone has paid bills. Higher scores usually get lower rates.',
  'FHA': 'A government-backed loan that allows small down payments and lower credit scores.',
  'VA': 'A home loan for veterans and service members, often with no down payment.',
  'USDA': 'A government-backed loan for homes in some rural areas, often with no down payment.',
  'conventional': 'A regular loan that isn\'t backed by the government.',
  'ARM': 'Adjustable-rate mortgage. The rate stays the same for a few years, then can go up or down.',
  'fixed rate': 'The interest rate never changes for the whole loan.',
  'recast': 'After you pay a big chunk extra, the lender lowers your monthly payment to match.',
  'biweekly': 'Paying half your payment every two weeks. That adds up to one extra payment a year.',
  'Loan Estimate': 'A 3-page form every lender must give you after you apply, showing the rate and costs.',
  'declarations page': 'The summary page of your home insurance policy that lists what\'s covered and the price.',
  'servicer': 'The company you send your mortgage payment to.',
  'appraisal': 'A professional opinion of what a home is worth.',
};

// Words to explain inline when they appear on a page (first match per section). Longer phrases first.
export const INLINE = ['mortgage insurance', 'interest rate', 'down payment', 'closing costs', 'loan-to-value', 'credit score', 'declarations page', 'Loan Estimate',
  'refinance', 'break-even', 'escrow', 'PMI', 'MIP', 'principal', 'equity', 'deductible', 'premium', 'points', 'amortization', 'recast', 'biweekly', 'servicer', 'appraisal', 'LTV'];

// Per page: one sentence on what it's for, the steps, what the results mean, and something to watch for.
export const PAGES = {
  start: {
    what: 'This is where you begin. Answer a few questions and we\'ll show you your numbers and the best ways to save.',
    steps: ['Pick what you want to do.', 'Answer a few short questions (or upload a paper).', 'See your monthly payment and your best ways to save.'],
    numbers: [], watch: '',
  },
  payment: {
    what: 'Shows how much you\'d pay each month for a home, and where each dollar goes.',
    steps: ['Type the home price, your down payment and the interest rate.', 'Look at the big number: that\'s your monthly payment.', 'Check "Ways to pay less" for ideas that lower it.'],
    numbers: [['Monthly payment', 'Everything you pay each month: the loan, interest, taxes, insurance and any PMI.'], ['Total interest', 'All the extra money you\'d pay the lender over the whole loan.'], ['Cash to close', 'Money you need on the day you buy: down payment plus fees.']],
    watch: 'Taxes and insurance are estimates until you get real numbers for the home.',
  },
  amortization: {
    what: 'Shows every payment until the loan is paid off, and what happens if you pay extra.',
    steps: ['Type an extra amount you could pay each month (even $50 helps).', 'Watch "Interest saved" and the new payoff date change.', 'Scroll down to see the year-by-year table, or download it.'],
    numbers: [['Interest saved', 'Money you don\'t have to pay the lender because you paid the loan down faster.'], ['Paid off sooner by', 'How much earlier you\'d be done.'], ['Balance', 'What you still owe after each payment.']],
    watch: 'Tell your lender extra money is "for principal" so it lowers what you owe.',
  },
  pmi: {
    what: 'Finds the earliest month you can stop paying PMI (mortgage insurance).',
    steps: ['Check your loan numbers on the left.', 'Look at the timeline: the green dot is your earliest date.', 'When the date comes, send your lender the request letter we make for you.'],
    numbers: [['Earliest', 'The first month you can ask to stop PMI.'], ['You keep', 'Money saved by asking early instead of waiting for it to stop on its own.']],
    watch: 'PMI doesn\'t always stop by itself when you could ask. You usually have to ask in writing.',
  },
  optimize: {
    what: 'Compares ways to use extra money on your loan, so you can pick the one that saves the most.',
    steps: ['Type how much extra you could pay each month.', 'Look at the list: the top one saves the most.', 'Press "Use" to try it on your payoff schedule.'],
    numbers: [['Saved', 'Interest (and PMI) you won\'t have to pay.'], ['Saved per $1 extra', 'How hard each extra dollar works for you.']],
    watch: 'Paying extra is a sure thing; investing might earn more but could lose money. Keep some savings for emergencies first.',
  },
  refinance: {
    what: 'Checks if getting a new loan with a lower rate would actually save you money after the fees.',
    steps: ['Type what you owe and your rate now.', 'Type the new rate and the fees from a lender.', 'Read the green or yellow box: it tells you if it\'s worth it.'],
    numbers: [['Break-even', 'How long until the savings pay back the fees.'], ['Ahead after X years', 'How much better off you\'d be if you keep the new loan that long.']],
    watch: 'A brand-new 30-year loan can add years of payments. Keep paying your old amount to avoid that.',
  },
  afford: {
    what: 'Shows how much home your income can handle without stretching too far.',
    steps: ['Type your yearly income before taxes.', 'Type your monthly debt payments (car, student loans, cards).', 'Pick a budget: comfortable, standard or stretch.'],
    numbers: [['Home price', 'The most you could spend on that budget.'], ['Housing payment', 'What you\'d pay each month for that home.']],
    watch: 'A lender may approve more than feels comfortable. The "comfortable" budget leaves room for savings.',
  },
  compare: {
    what: 'Puts different kinds of home loans side by side for the same home.',
    steps: ['Type the home price and how much cash you have.', 'Tick any boxes that fit you (veteran, rural home).', 'The green column is the cheapest over five years.'],
    numbers: [['5-year cost', 'Interest, insurance and fees over the first five years. Lower is better.'], ['Insurance lasts', 'How long you\'d pay mortgage insurance.']],
    watch: 'Rates here are typical, not real quotes. Get quotes from real lenders before you choose.',
  },
  credit: {
    what: 'Shows how your credit score changes your rate and monthly payment.',
    steps: ['Pick your credit score range (your best guess is fine).', 'Look at how much a higher score would save each month.', 'Read the tips for raising your score.'],
    numbers: [['vs you', 'How much more or less you\'d pay each month with a different score.']],
    watch: 'We never check your credit. These are estimates based on how lenders usually price loans.',
  },
  arm: {
    what: 'Shows what an adjustable-rate loan payment could do after the first few years.',
    steps: ['Type the starting rate and how many years it stays fixed.', 'Look at the lines: the orange one is the worst case.', 'Make sure you could afford the worst case.'],
    numbers: [['Highest payment', 'The most the payment could reach under the loan\'s limits.']],
    watch: 'If you might keep the home longer than the fixed years, plan for the worst case.',
  },
  import: {
    what: 'Reads a paper about your loan or insurance and fills in the numbers for you.',
    steps: ['Pick what kind of paper you have.', 'Drop the PDF in the box (or tap to choose it).', 'Check the numbers we found, fix any that are wrong, then press the green button.'],
    numbers: [['Found', 'We read it from your paper.'], ['Check this', 'We think we found it, but please look.'], ['Not found', 'Please type it in yourself.']],
    watch: 'Your file never leaves your device. We read it right here in your browser.',
  },
  savings: {
    what: 'Lists every way we found to save money on your loan, biggest first.',
    steps: ['Read the first list: ways to save without paying more each month.', 'Then the second list: ways to use extra money.', 'Press a button under any idea to see how to do it.'],
    numbers: [['How sure we are', '"Exact math" means it\'s a calculation. "Estimate" or "Rough guess" means real prices could be different.']],
    watch: 'Some ideas overlap, so you can\'t always add them all together.',
  },
  scenarios: {
    what: 'Saves different versions of your plan so you can compare them.',
    steps: ['Set up a plan on any page.', 'Come here, give it a name and press "Save scenario".', 'Tick up to four plans to see them side by side.'],
    numbers: [], watch: 'Saved plans stay on this device only.',
  },
};
