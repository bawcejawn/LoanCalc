# MortgageForge

Free, private mortgage planning tools that run entirely in your browser. No sign-up, no server, nothing uploaded.

**Live site:** https://bawcejawn.github.io/LoanCalc/

| Tool | What it answers |
|---|---|
| [Start](https://bawcejawn.github.io/LoanCalc/) | A few questions, then your payment, your 3 best moves and the tools that fit |
| [My savings](https://bawcejawn.github.io/LoanCalc/mortgage-savings-check/) | Every way to save, ranked: PMI, refinance, credit, insurance, escrow, extra payments |
| [Payment calculator](https://bawcejawn.github.io/LoanCalc/mortgage-payment-calculator/) | Full PITI with PMI/MIP/VA/USDA fees, cash to close, and the specific changes that lower your payment |
| [Amortization schedule](https://bawcejawn.github.io/LoanCalc/amortization-schedule-calculator/) | Every payment, charts, milestones, extra/biweekly/lump-sum payments, CSV export |
| [PMI removal](https://bawcejawn.github.io/LoanCalc/pmi-removal-calculator/) | Earliest month PMI can end by each route, cost of waiting, extra needed to hit your date |
| [Extra payment optimizer](https://bawcejawn.github.io/LoanCalc/extra-payment-calculator/) | Which prepayment strategy saves most; prepay vs invest |
| [Refinance](https://bawcejawn.github.io/LoanCalc/refinance-calculator/) | True break-even including closing costs and term reset |
| [Affordability](https://bawcejawn.github.io/LoanCalc/home-affordability-calculator/) | Comfortable, standard and stretch budgets |
| [Rent or buy?](https://bawcejawn.github.io/LoanCalc/rent-vs-buy-calculator/) | Which leaves you better off over the years you'd stay |
| [Closing costs](https://bawcejawn.github.io/LoanCalc/closing-cost-calculator/) | Itemized fees like a Loan Estimate, cash to close, which fees you can shop |
| [Compare loan types](https://bawcejawn.github.io/LoanCalc/fha-vs-conventional-calculator/) | Conventional, FHA, VA, USDA, jumbo and ARM side by side with 2026 rules |
| [ARM projector](https://bawcejawn.github.io/LoanCalc/arm-calculator/) | Payment paths after the fixed period vs a fixed rate |
| [Credit score impact](https://bawcejawn.github.io/LoanCalc/credit-score-mortgage-rate-calculator/) | Rate, PMI and payment at every score band (no credit check) |
| [Document reader](https://bawcejawn.github.io/LoanCalc/mortgage-statement-reader/) | Auto-fill from a mortgage statement, insurance declarations page or Loan Estimate, read locally |
| [Saved scenarios](https://bawcejawn.github.io/LoanCalc/saved-scenarios/) | Save, compare up to four, share by link |

## Develop

No build step. Edit files and refresh.

```sh
npm test          # finance engine tests (Node 18+)
npm run pages     # regenerate pages after ANY change to copy, JS or CSS (updates cache-busting hashes)
```

Preview locally with any static server from the parent folder (`npx serve ..`, then open `/LoanCalc/`).

- Program rules (loan limits, MIP, VA, USDA): `assets/js/config.js`
- Lender ad slots, ads, affiliate links, analytics, Koinos tip jar: `assets/js/site-config.js`
- How to sell lender ad space: [docs/SELLING_ADS.md](docs/SELLING_ADS.md)
- Plain-language help text and word list: `assets/js/help.js`
- Full plan, SEO, monetization, deployment checklist and roadmap: [docs/BUILD_GUIDE.md](docs/BUILD_GUIDE.md)

Results are estimates for planning, not financial advice.

Third-party: Chart.js (MIT), pdf.js (Apache-2.0), Public Sans (SIL OFL 1.1). Licenses are in `assets/vendor/` and `assets/fonts/`.
