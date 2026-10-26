# Selling lender ad space on MortgageForge

A step-by-step playbook for selling the "Lenders you can contact" listings: getting set up, staying on the right side of mortgage advertising rules, pricing, finding buyers, getting paid, and putting an ad live.

> Not legal advice. Mortgage advertising and referral rules are strict. Have a lawyer who knows RESPA review your ad agreement and this setup once before your first sale. It's a small one-time cost compared with the risk.

---

## 1. What you're selling

A labeled listing in a box titled **Lenders you can contact** (marked **Ad**) below the results on these pages:

- monthly payment
- affordability
- compare loan types
- credit score
- refinance
- PMI
- savings summary

Up to 3 lenders per page, shuffled on every visit.

Each listing shows:
- the licensed company name and NMLS ID, with a lookup link
- a one-line description and a licensing line
- a website button and a call button

When a page has no paying sponsor, an "Are you a lender? Advertise here" card fills the space and links to `/advertise/`, your public sales page.

## 2. Set up before you sell (one evening)

1. **Count visitors.** Make a free account at goatcounter.com, pick a site code (e.g. `mortgageforge`), and put it in `assets/js/site-config.js` → `analytics.goatcounter`. GoatCounter doesn't use cookies. The site automatically counts:
   - page views (including in-app page changes)
   - `sponsor-view/<id>`: each time a listing is shown
   - `sponsor-click/<id>`: each time someone taps a listing's button
2. **Set your contact email** in `site-config.js` → `advertise.email`. Use an address you're happy to publish, not your personal one.
3. **Set your price note** in `advertise.priceNote` (or keep "Ask for the current rate card").
4. Run `npm run pages`, commit and push.
5. **Wait 4–8 weeks** to collect real traffic numbers. Advertisers will ask, "How many people see it?"

## 3. Stay compliant (why the slots are built the way they are)

**RESPA Section 8** bans kickbacks and referral fees for mortgage ("settlement service") business. In its February 2023 advisory opinion on digital mortgage comparison sites, the CFPB said a site operator can receive an illegal referral fee when three things happen together:

- it presents lenders in a non-neutral way;
- that steers people toward the lenders who pay;
- the operator gets paid, at least partly, for that.

It also said:
- paying extra to be "featured" can be a problem;
- equal payments from every lender are not a safe harbor;
- a disclosure does not cure a violation.

MortgageForge is set up to stay on the safe side of that:

| Rule | How the site does it |
|---|---|
| Don't steer | Listings are shuffled every visit, all look the same, and none is called "best" or "recommended". |
| Keep ads out of results | Listings sit below results. They're never part of savings ideas, the loan comparison or "best fit". |
| Pay for ad space, not referrals | Sell a flat monthly price for the space. **Never** charge per lead, per click, per application or per closed loan, and never take a bonus tied to loans. |
| No warm handoffs | The site never sends visitor data to a lender. Visitors click through on their own. |
| Fair market value | Price the space like ad space (by audience size), and charge every lender by the same rate card. |

Also required or wise:

- **Licensed name + NMLS ID** in every listing. Many states require this in mortgage ads; for example, Virginia requires the licensed name, "NMLS ID #" with the number, and the NMLS Consumer Access website address. The listing card shows the ID and links to NMLS Consumer Access.
- **No rates in listings.** Quoting rates or payments in an ad can trigger Truth in Lending (Regulation Z) disclosure rules and state rate disclaimers. Keep listings to name, description, licensing line, website and phone.
- **Label ads** clearly (FTC). Done: "Ad" tag plus a plain-language note.
- **Keep records** of each agreement, what ran, where, and what you were paid.
- **Don't add affiliate lead programs** (pay-per-lead mortgage marketplaces) to the same pages without legal review. They work differently from flat-fee ads.

## 4. Price it

Price by audience, per month:

```
monthly price ≈ (monthly page views on listing pages ÷ 1,000) × your CPM ÷ number of listing spots
```

- **Page views**: from GoatCounter, only the 7 pages that show listings.
- **CPM**: what you charge per 1,000 views. Mortgage is a valuable topic, so you can charge more than a general-interest site. Pick a number, test it, and adjust.
- **Spots**: up to 3 lenders share each page view.
- Set a **minimum** (a floor) so small months still make sense.

*Illustrative example only*: 30,000 views on listing pages, a CPM you choose of $30, 3 spots → 30 × $30 ÷ 3 = $300 per lender per month.

Tips:
- Offer a **founding sponsor rate** (lower, locked for 6–12 months) to your first 2–3 lenders, in exchange for a testimonial.
- Discount longer terms (e.g. pay 3 months, 5% off; 12 months, 15% off).
- Raise prices for new sponsors as traffic grows. Keep the same rate card for everyone at a given time.
- Avoid selling "exclusive" pages with one lender only. A single lender on a page can look like steering, so ask your lawyer first. Rotating 2–3 is safer.

## 5. Find buyers

Best fits: local loan officers, mortgage brokers, credit unions and community banks in the areas your visitors come from (GoatCounter shows locations).

Where to find them:
- **NMLS Consumer Access**: search by state to confirm licenses and get company names.
- LinkedIn: "loan officer" + your city.
- Local credit unions' and banks' mortgage pages.
- Real-estate agents you know (ask who they send buyers to).

## 6. Outreach

**First email**

> Subject: A spot for [Company] on a mortgage calculator site in [City/State]
>
> Hi [Name],
>
> I run MortgageForge (link), a free mortgage calculator site. Last month it had [X] visits from people planning a purchase or refinance, [Y] of them in [state].
>
> I have [N] lender spots open in the "Lenders you can contact" box under the payment, refinance, PMI and savings results. Each listing shows your company, NMLS ID, website and phone, with a monthly report of views and clicks.
>
> It's a flat [$/month], no per-lead fees. Here's the page with the details and rules: [link]/advertise/
>
> Would you like a screenshot of how [Company] would look?
>
> [Your name]

**Follow-up (5–7 days later)**

> Hi [Name], quick follow-up. Happy to send a mockup with your logo text and NMLS ID, or set up a one-month trial at the founding rate. [Your name]

**Mockup**: add their block to a local copy of `site-config.js`, open the payment page locally, take a screenshot, and don't push it.

## 7. Paperwork (simple ad agreement)

A one-to-two page insertion order with:

- Your name/business and theirs, with their **NMLS ID** and licensed name
- What runs: listing text (name, one line, licensing line, URL, phone) and the pages
- Term: start and end dates (`until` in the config)
- Price, billing schedule and payment terms
- **"Payment is for advertising space only and is not for the referral of any business"**
- No per-lead, per-click or per-loan compensation
- Placement is rotated randomly; no guaranteed position or results
- They confirm their listing text is accurate and compliant, and are responsible for their own licensing and ad rules
- You can decline or remove content, with a pro-rated refund
- Either side can cancel with 30 days' notice
- Have a lawyer turn this into your standard form once.

## 8. Get paid

- **Stripe Payment Links or Stripe Invoicing**, or **PayPal invoices**. Each charges a processing fee; check their current pricing.
- Bank transfer (ACH) for larger annual deals.
- Optional: accept KOIN through the Koinos tip-jar address for crypto-friendly sponsors (see BUILD_GUIDE.md §8).
- Track each sponsor in a spreadsheet: name, NMLS, pages, start, `until`, price, paid date, invoice link.
- Ad income is taxable business income; keep receipts and ask a tax professional about estimated taxes.

## 9. Put the ad live

1. Open `assets/js/site-config.js` and add a block to `lenders.list`:

```js
{
  id: 'acme',                                   // short, no spaces; used in counts
  name: 'Acme Home Loans',
  nmls: '123456',
  license: 'Licensed in CA, OR and WA. Equal Housing Lender.',
  blurb: 'Local loan officers. Purchase and refinance.',
  url: 'https://www.acmehomeloans.example/?utm_source=mortgageforge&utm_medium=listing',
  phone: '(555) 555-0100',
  pages: ['payment', 'refinance', 'pmi'],       // optional
  until: '2027-01-31',                          // last paid day; it disappears after this
},
```

2. Run `npm test` and `npm run pages`, then commit and push. Live in about a minute.
3. Open the pages it should appear on and check the name, NMLS ID and links.
4. Send the sponsor a "you're live" email with screenshots.

## 10. Report every month

In GoatCounter, look up the events `sponsor-view/acme` and `sponsor-click/acme` for the month. Send each sponsor:

- times shown
- clicks
- click rate (clicks ÷ views)
- the pages it ran on

Send it with renewal dates 2–3 weeks before `until`.

## 11. Renewals and removal

- Renewal: update `until`, rebuild, push.
- Non-payment or cancellation: delete the block (or let `until` pass), rebuild, push.
- Keep at least the house "Advertise here" card on so the space keeps selling itself.
