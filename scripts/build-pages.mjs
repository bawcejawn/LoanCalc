// Generates every HTML page, sitemap.xml and robots.txt from one template.
// Run after editing copy:  npm run pages   (no dependencies; the output is committed and served as-is)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Your live URL. Change this if you add a custom domain (and add a CNAME file).
const BASE = 'https://bawcejawn.github.io/LoanCalc/';
const UPDATED = '2026-10-23';

const NAV = [
  ['Start here', [['mortgage-savings-check/', 'My savings'], ['mortgage-statement-reader/', 'Upload a document']]],
  ['Buying', [['mortgage-payment-calculator/', 'Monthly payment'], ['home-affordability-calculator/', 'Affordability'], ['fha-vs-conventional-calculator/', 'Compare loan types'], ['credit-score-mortgage-rate-calculator/', 'Credit score impact'], ['arm-calculator/', 'ARM projector']]],
  ['Owning', [['amortization-schedule-calculator/', 'Payoff schedule'], ['pmi-removal-calculator/', 'Remove PMI'], ['extra-payment-calculator/', 'Pay off faster'], ['refinance-calculator/', 'Refinance check']]],
  ['Your data', [['saved-scenarios/', 'Saved plans']]],
];

const faq = (items) => items;
const PAGES = [
  {
    path: '', tool: 'start',
    title: 'MortgageForge: Free Mortgage Calculator & Savings Planner',
    description: 'Answer a few questions and see your mortgage payment and the biggest ways to save: PMI removal, extra payments, refinancing, insurance and more. Free, private, no sign-up.',
    h1: 'Find the savings in your mortgage',
    intro: 'A few quick questions, then only the tools that matter to you. Everything stays in your browser.',
    body: `<h2>What MortgageForge does</h2>
      <p>MortgageForge is a free set of mortgage calculators that work together: monthly payment with taxes and PMI, a full payoff schedule, PMI removal dates, extra-payment and payoff-goal planning, refinance break-even, loan type comparison, affordability, credit score impact, and a reader for your statement, insurance policy or Loan Estimate.</p>
      <p>Instead of showing everything at once, it starts with what you want to do and adds tools as you go. Your numbers carry from one tool to the next.</p>`,
    faq: faq([
      ['Is MortgageForge free?', 'Yes. Every calculator is free with no account.'],
      ['Where are my numbers stored?', 'Only in your own browser. Nothing is sent to a server.'],
      ['Can I see all the tools at once?', 'Yes. Open "All tools" in the menu at any time.'],
    ]),
  },
  {
    path: 'mortgage-payment-calculator/', tool: 'payment',
    title: 'Mortgage Calculator with Taxes, Insurance & PMI | MortgageForge',
    description: 'Free mortgage payment calculator with property taxes, insurance, HOA and PMI. See your full PITI payment, closing cash and the exact changes that lower it. Private, no sign-up.',
    h1: 'Mortgage payment calculator',
    intro: 'Your full monthly payment with taxes, insurance and mortgage insurance, and the specific changes that would lower it. Everything is calculated in your browser.',
    body: `<h2>What goes into a mortgage payment</h2>
      <p>Lenders call the full payment PITI: <strong>principal</strong> and <strong>interest</strong> on the loan, plus <strong>taxes</strong> and <strong>insurance</strong> usually collected into an escrow account. Many loans also carry mortgage insurance (PMI on conventional loans, MIP on FHA loans), and some homes have HOA dues. This calculator shows each piece separately so you can see which ones you can change.</p>
      <h2>How the payment is calculated</h2>
      <p>Principal and interest use the standard fixed-rate formula: payment = L × r ÷ (1 − (1 + r)<sup>−n</sup>), where L is the loan amount, r is the monthly rate and n is the number of payments. Property tax is the yearly rate times the home price, divided by 12. Conventional PMI is estimated from your down payment and credit score unless you enter a quote. FHA, VA and USDA fees follow the current program rules, including upfront fees added to the loan.</p>
      <h2>Ways to lower the payment</h2>
      <p>The "Ways to pay less" panel recalculates your loan with one change at a time: a 20% down payment, a slightly lower rate, a shorter term, or a small extra payment. Each one shows the dollar effect on your numbers, not a generic rule of thumb.</p>`,
    faq: faq([
      ['How much house can I afford?', 'A common guide is to keep the housing payment under 28% of gross monthly income and all debts under 36%. The <a href="home-affordability-calculator/">affordability calculator</a> works this out for your income and debts.'],
      ['Is PMI included in the payment?', 'Yes. If you put less than 20% down on a conventional loan, PMI is added and the calculator shows when it can be removed. FHA MIP and the USDA annual fee are included the same way.'],
      ['Are my numbers stored anywhere?', 'Only in your own browser, so they are there next time you visit. Nothing is sent to a server. Clearing your browser data removes them.'],
      ['How accurate are property tax and insurance estimates?', 'They are estimates. Use the tax rate from your county assessor and a real insurance quote for the most accurate payment.'],
    ]),
  },
  {
    path: 'amortization-schedule-calculator/', tool: 'amortization',
    title: 'Amortization Schedule Calculator with Extra Payments | MortgageForge',
    description: 'Month-by-month and yearly amortization schedule with extra payments, biweekly payments and lump sums. See interest saved, new payoff date and milestones. Export to CSV.',
    h1: 'Amortization schedule with extra payments',
    intro: 'See every payment, how much goes to interest, and exactly what extra payments save. Download the schedule or print it.',
    body: `<h2>Reading an amortization schedule</h2>
      <p>Each mortgage payment covers that month's interest first; the rest reduces your balance. Early on, most of the payment is interest. As the balance falls, more goes to principal. The schedule highlights the month when principal first overtakes interest, when you reach 20% equity, and when mortgage insurance stops.</p>
      <h2>How extra payments work</h2>
      <p>Any amount above your regular payment goes straight to principal (confirm your servicer applies it that way). Because future interest is charged on a smaller balance, a small extra amount early in the loan saves far more than the same amount later. You can model a recurring monthly extra, a yearly lump sum, a one-time payment, or biweekly payments.</p>
      <h2>Biweekly payments</h2>
      <p>Paying half your payment every two weeks makes 26 half-payments a year, equal to 13 full payments. That one extra payment a year typically takes four to six years off a 30-year loan. Some servicers charge for biweekly programs; you can get the same result for free by adding one-twelfth of a payment each month.</p>`,
    faq: faq([
      ['Is it better to pay extra monthly or once a year?', 'Monthly is slightly better because each dollar starts saving interest sooner. The optimizer ranks both for your loan.'],
      ['Do extra payments lower my monthly payment?', 'No. On a standard fixed-rate loan the payment stays the same and the loan ends sooner. Some lenders will recast (re-amortize) the loan after a large lump sum for a small fee, which lowers the payment.'],
      ['Can I export the schedule?', 'Yes. Download a CSV that opens in Excel, Google Sheets or Numbers, or print the page.'],
    ]),
  },
  {
    path: 'pmi-removal-calculator/', tool: 'pmi',
    title: 'PMI Removal Calculator: When Can I Cancel PMI? | MortgageForge',
    description: 'Find the exact month you can cancel PMI at 80% LTV, when it ends automatically at 78%, and how extra payments or a new appraisal get you there sooner. FHA MIP and USDA rules included.',
    h1: 'PMI removal calculator',
    intro: 'Find the earliest month you can stop paying mortgage insurance, what waiting costs, and how much extra a month gets you there by your target date.',
    body: `<h2>The three ways conventional PMI ends</h2>
      <p>Under the Homeowners Protection Act, you can <strong>ask your servicer to cancel PMI</strong> once your balance reaches 80% of the home's original value, either on schedule or sooner through extra payments. PMI must <strong>end automatically</strong> when the balance is scheduled to reach 78%, and no later than the midpoint of the loan term, as long as you're current on payments.</p>
      <p>The automatic date is based only on the original schedule. Extra payments do not move it, so if you prepay you need to ask. That gap is often worth hundreds or thousands of dollars.</p>
      <h2>Removal based on a new appraisal</h2>
      <p>If your home has gained value, many servicers will cancel PMI based on a new appraisal. A common standard (Fannie Mae's) is 75% loan-to-value of the current value after two to five years of payments, or 80% after five years. Enter today's value to see whether this route is faster for you.</p>
      <h2>FHA, VA and USDA</h2>
      <p>FHA mortgage insurance can't be cancelled by request: it lasts 11 years with at least 10% down, otherwise for the life of the loan. USDA's annual fee lasts for the life of the loan. VA loans have no monthly mortgage insurance. For FHA and USDA, refinancing into a conventional loan at 80% LTV or below is the usual way out.</p>`,
    faq: faq([
      ['What do I need to request PMI cancellation?', 'Usually a written request, a good payment history (no 30-day late payments in the last year), and evidence the home has not lost value, which may mean an appraisal.'],
      ['Does an appraisal count toward the 80%?', 'For the federal 80% and 78% rules, value means the original purchase price or appraisal. Removal based on a new, higher value is a servicer or investor policy, not a federal right.'],
      ['Is PMI tax deductible?', 'It depends on current tax law and your situation. Ask a tax professional.'],
    ]),
  },
  {
    path: 'extra-payment-calculator/', tool: 'optimize',
    title: 'Extra Payment Mortgage Calculator & Optimizer | MortgageForge',
    description: 'Compare extra monthly payments, biweekly payments, yearly lump sums and rounding up. See which saves the most interest on your loan, and whether investing would beat prepaying.',
    h1: 'Extra payment optimizer',
    intro: 'Tell it what you can spare. It ranks the ways to use that money by how much interest and mortgage insurance each saves, and compares prepaying with investing.',
    body: `<h2>How the strategies are ranked</h2>
      <p>Every strategy is simulated month by month on your actual loan. Savings include interest and any mortgage insurance that ends earlier because you reach 80% loan-to-value sooner. "Saved per $1 extra" shows how hard each extra dollar works.</p>
      <h2>Prepay or invest?</h2>
      <p>Paying down a mortgage earns a guaranteed return equal to its interest rate. Investing may earn more, with risk. The comparison gives both paths the same monthly budget: one prepays and then invests the whole freed-up payment once the loan is gone; the other invests the extra from the start. Both are measured on your original payoff date. It ignores taxes, so treat it as a starting point.</p>`,
    faq: faq([
      ['Should I pay off my mortgage early?', 'It often makes sense once you have an emergency fund, are getting any employer retirement match, and have no higher-rate debt. With a low-rate mortgage, investing may come out ahead over long periods.'],
      ['Is there a prepayment penalty?', 'Most U.S. residential mortgages made since 2014 have none, but check your note or ask your servicer.'],
    ]),
  },
  {
    path: 'refinance-calculator/', tool: 'refinance',
    title: 'Refinance Break-Even Calculator | MortgageForge',
    description: 'Find out if refinancing is worth it. Compares new and current payments, closing costs, points and term reset to give a true break-even month and your net savings over the years you stay.',
    h1: 'Refinance break-even calculator',
    intro: 'A true break-even that counts closing costs, points and the extra years a new loan adds, not just the change in monthly payment.',
    body: `<h2>Why the simple break-even misleads</h2>
      <p>The usual shortcut divides closing costs by monthly savings. It ignores that a new 30-year loan restarts the clock, so more of each payment goes to interest and you may owe more for longer. This calculator tracks both loans month by month and counts you ahead only when the cash you've kept, minus costs, outweighs any extra balance you still owe.</p>
      <h2>When refinancing tends to pay</h2>
      <p>Refinancing usually makes sense when you can lower your rate meaningfully, you'll stay past the break-even point, and you don't restart a long term without a plan. Keeping your old payment amount on the new loan is a simple way to get the lower rate without stretching the debt.</p>`,
    faq: faq([
      ['How much does it cost to refinance?', 'Typically 2% to 5% of the loan amount for lender, appraisal and title fees. Your Loan Estimate lists them.'],
      ['Should I roll closing costs into the loan?', 'It saves cash today but you pay interest on those costs. The calculator shows both options.'],
      ['Are points worth it?', 'A point costs 1% of the loan and usually lowers the rate by about a quarter point. It pays off only if you keep the loan long enough.'],
    ]),
  },
  {
    path: 'home-affordability-calculator/', tool: 'afford',
    title: 'Home Affordability Calculator: How Much House Can I Afford? | MortgageForge',
    description: 'See how much house you can afford from your income, debts and down payment, at comfortable, standard (28/36) and stretch budgets. Includes taxes, insurance, HOA and PMI.',
    h1: 'How much house can I afford?',
    intro: 'Three budgets from your income and debts: comfortable, standard and stretch. Each includes taxes, insurance and PMI.',
    body: `<h2>How lenders size your budget</h2>
      <p>Lenders compare your housing payment to gross monthly income (the front-end ratio) and all monthly debts including housing to income (the back-end ratio). The classic guide is 28% and 36%. Many loan programs allow more, but a higher ratio leaves less room for savings and surprises.</p>
      <h2>What counts as debt</h2>
      <p>Include minimum payments on car loans, student loans, credit cards, personal loans and support obligations. Leave out rent you'll stop paying, utilities, groceries and insurance other than the home's.</p>`,
    faq: faq([
      ['What is a good debt-to-income ratio?', '36% or lower is comfortable. Many lenders approve up to 43% to 50% with strong credit and reserves.'],
      ['Does this include closing costs?', 'No. Plan for closing costs of about 2% to 5% of the loan on top of your down payment. The payment calculator estimates cash to close.'],
    ]),
  },
  {
    path: 'fha-vs-conventional-calculator/', tool: 'compare',
    title: 'FHA vs Conventional vs VA vs USDA Loan Calculator (2026) | MortgageForge',
    description: 'Compare conventional, FHA, VA, USDA, jumbo and ARM loans side by side with 2026 rules: payment, mortgage insurance, upfront fees, cash to close and five-year cost.',
    h1: 'Compare loan types',
    intro: 'The same home and the same cash, run through every major loan type with current program rules. The best fit is the cheapest to borrow over five years.',
    body: `<h2>2026 rules used here</h2>
      <p>The 2026 conforming loan limit for one-unit homes is $832,750 in most counties and up to $1,249,125 in high-cost areas; loans above the local limit are jumbo. FHA loans carry a 1.75% upfront premium plus an annual premium (0.55% for most 30-year loans with less than 5% down). VA loans have no monthly mortgage insurance but charge a funding fee of 1.25% to 3.3% unless you're exempt. USDA loans charge 1% upfront and 0.35% a year.</p>
      <h2>Why five-year cost</h2>
      <p>Most people sell or refinance within about a decade, so the first years matter most. Five-year cost adds up interest, mortgage insurance, upfront fees and closing costs over 60 months. It doesn't count your down payment, which becomes equity.</p>`,
    faq: faq([
      ['Is FHA or conventional cheaper?', 'With good credit and 5% or more down, conventional is often cheaper because PMI can be cancelled. With lower scores or very small down payments, FHA can win.'],
      ['Who qualifies for a VA loan?', 'Eligible veterans, active-duty service members, some National Guard and Reserve members, and some surviving spouses, with a Certificate of Eligibility.'],
      ['Where is USDA available?', 'In eligible rural and some suburban areas, for households under the local income limit. Check an address on the USDA eligibility site.'],
    ]),
  },
  {
    path: 'arm-calculator/', tool: 'arm',
    title: 'ARM Calculator: Adjustable-Rate Mortgage Payment Projector | MortgageForge',
    description: 'Project ARM payments after the fixed period with caps, margin and index. See the worst-case payment and compare total cost with a fixed-rate mortgage over the years you plan to stay.',
    h1: 'ARM payment projector',
    intro: 'What happens to an adjustable-rate payment after the intro period, in the best, flat and worst cases, compared with a fixed rate.',
    body: `<h2>How an ARM adjusts</h2>
      <p>After the fixed period, the rate resets to an index (usually 30-day average SOFR) plus a margin, limited by caps. A 2/1/5 cap means the first change can be at most 2 points, each later change 1 point, and the rate can never rise more than 5 points above the start. Most notes round to the nearest eighth of a point.</p>
      <h2>When an ARM makes sense</h2>
      <p>If you're confident you'll sell or refinance before the first adjustment, an ARM's lower starting rate is pure savings. If you might stay longer, make sure you could handle the worst-case payment.</p>`,
    faq: faq([
      ['What does 5/6 ARM mean?', 'The rate is fixed for 5 years, then adjusts every 6 months.'],
      ['Can an ARM payment go down?', 'Yes, if the index falls, though usually not below the margin (the floor).'],
    ]),
  },
  {
    path: 'mortgage-statement-reader/', tool: 'import',
    title: 'Upload Your Mortgage Statement, Insurance Policy or Loan Estimate | MortgageForge',
    description: 'Drop in a mortgage statement, homeowners insurance declarations page, or Loan Estimate PDF to auto-fill your numbers and find savings. Read entirely in your browser; files are never uploaded.',
    h1: 'Upload a document',
    intro: 'Fill in your loan, insurance or quote from a PDF in seconds, then see where you can save. Files are read inside this tab and never leave your device.',
    body: `<h2>What each document tells us</h2>
      <p><strong>Mortgage statement:</strong> balance, rate, payment, escrow, mortgage insurance and payoff date. Used to check PMI cancellation, refinancing, extra payments and whether your escrow is collecting too much.</p>
      <p><strong>Homeowners insurance declarations page:</strong> premium, deductibles, coverage limits and renewal date. Used to estimate deductible savings, remind you to shop before renewal and check escrow.</p>
      <p><strong>Loan Estimate or Closing Disclosure:</strong> loan amount, rate, points, closing costs and cash to close. Used to test whether points pay off and to compare offers.</p>
      <h2>How it works</h2>
      <p>The page uses PDF.js, the open-source reader built into Firefox, running locally in your browser. It looks for the standard labels on each document, shows what it found with a confidence note, and waits for you to confirm before anything is used.</p>
      <h2>Privacy</h2>
      <p>There is no server: files aren't uploaded, stored or logged. Only the numbers you confirm are saved, in your own browser. We never ask for account numbers or your Social Security number.</p>`,
    faq: faq([
      ['Why weren\'t all values found?', 'Every servicer and insurer formats documents differently. Anything not found is left for you to fill in, and you can paste the text instead.'],
      ['Does it work with photos?', 'Photos and scans contain no text layer, so the page shows the image beside the form for you to type values in.'],
      ['Can you check my credit too?', 'No. A credit check needs your SSN, written consent and a licensed bureau account, and we don\'t collect personal identifiers. Pick your score range in the credit score tool instead.'],
    ]),
  },
  {
    path: 'saved-scenarios/', tool: 'scenarios',
    title: 'Compare Mortgage Scenarios Side by Side | MortgageForge',
    description: 'Save mortgage scenarios in your browser and compare up to four side by side: payment, interest, PMI and payoff. Share a scenario with a link; no account needed.',
    h1: 'Saved scenarios',
    intro: 'Save versions of your plan, compare up to four side by side, and share one with a link. No account needed.',
    body: `<h2>Sharing without an account</h2><p>A share link packs the scenario's numbers into the link itself, so the person who opens it sees exactly what you see. Nothing is stored on a server.</p>`,
    faq: [],
  },
  {
    path: 'mortgage-savings-check/', tool: 'savings',
    title: 'Mortgage Savings Check: Every Way to Save on Your Home Loan | MortgageForge',
    description: 'One page that finds every way to save on your mortgage: PMI removal, extra payments, payoff goals, refinancing, credit score, homeowners insurance and escrow. Ranked by dollars, private, free.',
    h1: 'Mortgage savings check',
    intro: 'Every way to save on your mortgage, ranked by how much each is worth, with the next step for each one.',
    body: `<h2>What it checks</h2>
      <p>The savings check runs your loan through every tool on the site at once: whether you can cancel PMI now or soon, which extra-payment approach saves the most, how much a month makes you mortgage-free by your goal, whether a refinance pays off for the years you'll stay (and the rate that would make it pay), what a higher credit score is worth, and, if you add your insurance declarations page, whether a higher deductible or a renewal quote could cut your premium and whether your escrow is collecting too much.</p>
      <h2>Why the savings don't simply add up</h2>
      <p>Some moves overlap. Extra payments also end PMI sooner; refinancing changes what extra payments save. Each item shows its own effect so you can pick the ones that fit, then see them together in the amortization schedule.</p>`,
    faq: faq([
      ['Is this financial advice?', 'No. It is a planning tool that shows the math. Confirm terms with your servicer, lender or insurer before acting.'],
      ['Do you pull my credit?', 'Never. You choose your score range; nothing is sent anywhere.'],
      ['How do I get my insurance details in?', 'Upload your homeowners insurance declarations page on the document page. It is read in your browser.'],
    ]),
  },
  {
    path: 'credit-score-mortgage-rate-calculator/', tool: 'credit',
    title: 'Credit Score Mortgage Rate Calculator: What Your Score Costs | MortgageForge',
    description: 'See how your credit score changes your mortgage rate, PMI and monthly payment, band by band, using Fannie Mae\'s 2026 pricing grid. No credit check, no sign-up.',
    h1: 'What your credit score costs you',
    intro: 'Your rate, PMI and payment at every credit score band, estimated from Fannie Mae\'s pricing grid. No credit check.',
    body: `<h2>How credit score changes a mortgage rate</h2>
      <p>Fannie Mae and Freddie Mac charge loan-level price adjustments based on credit score and loan-to-value. Lenders pass these on as a higher rate or upfront points. The grid used here is Fannie Mae's matrix updated September 30, 2026, for purchase loans over 15 years. Mortgage insurers also price PMI by credit score, so a lower score costs twice when you put less than 20% down.</p>
      <h2>How the estimate works</h2>
      <p>Enter the rate you were quoted for your current score. Each other band's rate is your rate plus the difference in price adjustment, converted at about 0.2 points of rate per point of price. It's a comparison between bands, not a quote.</p>`,
    faq: faq([
      ['What credit score do I need for the best mortgage rate?', 'On conventional loans, 780 and above gets the smallest price adjustments. The jump between bands is largest at the lower end.'],
      ['Does checking my rate hurt my score?', 'Pre-qualification with a soft check does not. A full application uses a hard inquiry; multiple mortgage inquiries within a short shopping window count as one.'],
      ['Why doesn\'t this site check my credit?', 'A credit check requires your SSN, written consent and a licensed bureau relationship, and the data would have to be stored and protected. MortgageForge keeps everything on your device instead.'],
    ]),
  },
  {
    path: 'guides/lower-homeowners-insurance/', tool: '', guide: true,
    title: 'How to Lower Homeowners Insurance (and Your Mortgage Payment) | MortgageForge',
    description: 'Practical ways to cut homeowners insurance: deductibles, shopping at renewal, discounts, coverage checks, and making sure your escrow follows the change.',
    h1: 'How to lower your homeowners insurance',
    intro: 'Insurance is often the easiest part of a mortgage payment to change. Here is where the savings usually are.',
    body: `<h2>1. Shop 30–45 days before renewal</h2><p>Prices for the same coverage vary widely between insurers. Get two or three quotes using your declarations page so the coverage matches line for line.</p>
      <h2>2. Raise the deductible if you have the savings</h2><p>The Insurance Information Institute estimates raising a deductible from $500 to $1,000 can cut premiums by up to 25%. Only do it if you could pay the higher deductible from savings. The <a href="../../mortgage-savings-check/">savings check</a> estimates how many claim-free years it takes to come out ahead.</p>
      <h2>3. Ask for every discount</h2><p>Bundling with auto, claims-free, new roof, monitored alarms, water-leak sensors, and paperless or autopay are common.</p>
      <h2>4. Check coverage, don't just cut it</h2><p>Dwelling coverage should match the cost to rebuild, not the market value or the loan balance. Too little leaves you exposed; your lender also sets a minimum.</p>
      <h2>5. Tell your servicer</h2><p>If insurance is paid from escrow, send the new policy to your servicer and ask for an escrow analysis so your monthly payment reflects the lower premium.</p>`,
    faq: [],
  },
  // Guides (content pages for search and AdSense review)
  {
    path: 'guides/how-to-remove-pmi/', tool: '', guide: true,
    title: 'How to Remove PMI: Every Route and the Exact Rules | MortgageForge',
    description: 'A plain guide to cancelling private mortgage insurance: the 80% request rule, automatic removal at 78%, new-appraisal removal, extra payments, and what to do with FHA MIP.',
    h1: 'How to remove PMI',
    intro: 'Private mortgage insurance protects the lender, not you. Here is every way to stop paying it, in the order most people can use them.',
    body: `<h2>1. Ask at 80% of the original value</h2><p>The Homeowners Protection Act lets you request cancellation once your principal balance reaches 80% of the original value of the home (the lower of the purchase price or appraisal). You need to be current, have a good payment history, and may need to show the home hasn't lost value. Put the request in writing.</p>
      <h2>2. Get there faster with extra payments</h2><p>Extra principal payments move the 80% date forward. They don't move the automatic 78% date, so you have to ask. Use the <a href="../../pmi-removal-calculator/">PMI removal calculator</a> to find how much extra a month reaches 80% by the date you want.</p>
      <h2>3. Use a new appraisal if your home gained value</h2><p>Many servicers will cancel PMI based on current value: commonly 75% LTV after two years of payments or 80% after five. Ask your servicer for its rules before ordering an appraisal.</p>
      <h2>4. Automatic termination at 78%</h2><p>If you do nothing, PMI must end when your balance is scheduled to reach 78% of the original value, provided you're current. It must also end at the loan's midpoint regardless.</p>
      <h2>5. Refinance</h2><p>Refinancing into a new conventional loan at 80% LTV or less removes PMI, and is the usual way to remove FHA MIP. Weigh the closing costs with the <a href="../../refinance-calculator/">refinance calculator</a>.</p>`,
    faq: [],
  },
  {
    path: 'guides/refinance-break-even/', tool: '', guide: true,
    title: 'Refinance Break-Even, Explained Properly | MortgageForge',
    description: 'Why "closing costs divided by monthly savings" understates the true break-even on a refinance, and how to measure it correctly including the term reset.',
    h1: 'Refinance break-even, explained properly',
    intro: 'The quick formula is a good first look. Here is what it leaves out and how to tell whether a refinance really pays.',
    body: `<h2>The quick formula</h2><p>Divide total closing costs by the drop in monthly payment. $6,000 in costs and $250 a month in savings is a 24-month break-even.</p>
      <h2>What it misses</h2><p>A lower payment on a fresh 30-year loan partly comes from stretching the debt over more years. Early payments on the new loan are mostly interest, so your balance may fall more slowly than it would have. A fair comparison counts the cash you keep each month, subtracts what you paid to refinance, and subtracts any extra balance you still owe compared with keeping your old loan.</p>
      <h2>Making a refinance pay</h2><ul><li>Plan to stay well past the true break-even.</li><li>Keep paying your old payment amount on the new loan.</li><li>Compare a shorter term at a lower rate.</li><li>Ask for lender credits if you may move soon.</li></ul>
      <p><a href="../../refinance-calculator/">Run your numbers</a>.</p>`,
    faq: [],
  },
  {
    path: 'guides/fha-vs-conventional-2026/', tool: '', guide: true,
    title: 'FHA vs Conventional in 2026: Which Costs Less? | MortgageForge',
    description: 'How FHA and conventional loans compare in 2026: down payment, credit, mortgage insurance cost and duration, loan limits, and when each one wins.',
    h1: 'FHA vs conventional in 2026',
    intro: 'Both can work with a small down payment. The difference is mostly in mortgage insurance: what it costs and whether you can ever get rid of it.',
    body: `<h2>Down payment and credit</h2><p>Conventional loans start at 3% down for some first-time buyers and generally need a 620+ score. FHA needs 3.5% down with a 580+ score, or 10% down from 500 to 579.</p>
      <h2>Mortgage insurance</h2><p>FHA charges 1.75% upfront plus an annual premium, most often 0.55% for a 30-year loan with under 5% down, and it lasts for the life of the loan unless you put at least 10% down (then 11 years). Conventional PMI varies with credit and down payment and can be cancelled at 80% LTV.</p>
      <h2>Loan limits</h2><p>The 2026 conforming limit is $832,750 for most counties. FHA limits vary by county, starting at about $541,287 in lower-cost areas.</p>
      <h2>Which wins?</h2><p>With a score above about 700 and 5% or more down, conventional is usually cheaper. With lower scores, FHA's flat pricing often wins, at least until you can refinance. <a href="../../fha-vs-conventional-calculator/">Compare with your numbers</a>.</p>`,
    faq: [],
  },
  {
    path: 'privacy/', tool: '', guide: true,
    title: 'Privacy | MortgageForge',
    description: 'MortgageForge runs entirely in your browser. No accounts, no server-side storage, and statement files are never uploaded.',
    h1: 'Privacy',
    intro: 'Short version: your numbers and files stay on your device.',
    body: `<h2>What we collect</h2><p>Nothing on our side. The calculators run as JavaScript in your browser. Inputs and saved scenarios are kept in your browser's local storage so they're there when you come back. You can clear them any time by clearing site data.</p>
      <h2>Statement files</h2><p>PDFs and images you choose are read in the page and never uploaded.</p>
      <h2>Hosting, ads and links</h2><p>The site is hosted on GitHub Pages, which keeps standard server logs. If advertising is enabled, the ad network may set cookies and will be listed here with a consent notice where required. Partner links are labeled.</p>
      <h2>Not financial advice</h2><p>Results are estimates for planning. Confirm details with your lender, servicer or a licensed professional.</p>`,
    faq: [],
  },
];

const escA = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const strip = (s) => s.replace(/<[^>]+>/g, '');

function page(p) {
  const depth = p.path.split('/').filter(Boolean).length;
  const root = depth ? '../'.repeat(depth) : './';
  const url = BASE + p.path;
  const ld = [{
    '@context': 'https://schema.org', '@type': p.tool ? 'WebApplication' : 'Article',
    ...(p.tool ? { name: p.h1, applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'Requires JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }
      : { headline: p.h1, dateModified: UPDATED, author: { '@type': 'Organization', name: 'MortgageForge' } }),
    url, description: p.description,
  }];
  if (p.faq.length) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: p.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: strip(a) } })) });
  const fix = (html) => html.replace(/href="(?!https?:|\.\.\/|#|mailto:)([^"]*)"/g, (m, h) => `href="${root}${h}"`);
  const nav = NAV.map(([g, links]) => `<h2>${g}</h2>${links.map(([href, label, small]) => `<a data-nav href="${root}${href}"${href === p.path ? ' aria-current="page"' : ''}>${label}${small ? ` <small>${small}</small>` : ''}</a>`).join('')}`).join('')
    + `<h2>Guides</h2><a href="${root}guides/how-to-remove-pmi/">How to remove PMI</a><a href="${root}guides/lower-homeowners-insurance/">Lower home insurance</a><a href="${root}guides/refinance-break-even/">Refinance break-even</a><a href="${root}guides/fha-vs-conventional-2026/">FHA vs conventional</a>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${p.title}</title>
<meta name="description" content="${escA(p.description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="MortgageForge">
<meta property="og:title" content="${escA(p.title)}"><meta property="og:description" content="${escA(p.description)}"><meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#172338">
<link rel="icon" href="${root}assets/icon.svg" type="image/svg+xml">
<link rel="manifest" href="${root}manifest.webmanifest">
<link rel="preload" href="${root}assets/fonts/public-sans.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${root}assets/css/app.css">
<script>try{var t=localStorage.getItem('mf:theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
<script type="application/ld+json">${JSON.stringify(ld.length === 1 ? ld[0] : ld)}</script>
</head>
<body data-tool="${p.tool}" data-root="${root}">
<a class="skip" href="#main">Skip to content</a>
<header class="top">
  <a class="brand" href="${root}" data-nav aria-label="MortgageForge home"><svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><path d="M4 15 16 5l12 10v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/><path d="M10 22h4v-5h4v5h4" fill="none" stroke="#7ee2b8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>MortgageForge</a>
  <dl class="ribbon" id="ribbon" aria-label="Your plan at a glance"></dl>
  <div class="top-actions">
    <a class="icon-btn" href="${root}saved-scenarios/" data-nav title="Save or compare scenarios"><svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2h8l2 2v10H3z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 2v4h6V2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg><span class="label">Save</span></a>
    <button class="icon-btn" id="theme-btn" type="button" aria-label="Switch light or dark mode"><svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5a6.5 6.5 0 1 0 0 13z" fill="currentColor"/><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></button>
  </div>
</header>
<div class="shell">
<nav class="nav" aria-label="Tools">${nav}</nav>
<main id="main">
  <div class="tool-head"><h1 tabindex="-1">${p.h1}</h1><p>${p.intro}</p></div>
  ${p.tool ? `<div id="tool" class="tool"><noscript><p class="note">MortgageForge needs JavaScript to calculate. Everything runs on your device.</p></noscript></div>` : ''}
  <article class="article">${fix(p.body)}${p.faq.length ? `<h2>Questions</h2>${p.faq.map(([q, a]) => `<details><summary>${q}</summary><p>${fix(a)}</p></details>`).join('')}` : ''}
    <div class="slot" data-slot="article"></div>
  </article>
  <footer class="foot"><span>© ${UPDATED.slice(0, 4)} MortgageForge. Estimates for planning, not financial advice.</span><a href="${root}privacy/">Privacy</a><a href="https://github.com/bawcejawn/LoanCalc">Source code</a><span>Private by design: everything runs in your browser.</span><span>Program rules last reviewed ${UPDATED.slice(0, 7)}.</span><span id="tip"></span></footer>
</main>
</div>
<script src="${root}assets/vendor/chart.umd.min.js" defer></script>
<script type="module" src="${root}assets/js/app.js"></script>
</body>
</html>
`;
}

for (const p of PAGES) {
  const file = join(ROOT, p.path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page(p));
}
// 404 uses absolute asset paths since it can be served from any depth.
const nf = page({ path: '', tool: '', title: 'Page not found | MortgageForge', description: 'This page does not exist.', h1: 'That page doesn’t exist', intro: '<a href="/LoanCalc/">Go to the mortgage calculator</a>.', body: '', faq: [] })
  .replaceAll('href="./', 'href="/LoanCalc/').replaceAll('src="./', 'src="/LoanCalc/').replace('data-root="./"', 'data-root="/LoanCalc/"');
writeFileSync(join(ROOT, '404.html'), nf);
writeFileSync(join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PAGES.map((p) => `  <url><loc>${BASE}${p.path}</loc><lastmod>${UPDATED}</lastmod></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${BASE}sitemap.xml\n`);
console.log(`Wrote ${PAGES.length} pages + 404, sitemap.xml, robots.txt`);
