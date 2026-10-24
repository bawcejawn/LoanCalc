// MortgageForge program constants.
// Review every January (FHFA/HUD publish new limits in Nov/Dec). Each value lists its source.
export const RULES = {
  lastReviewed: '2026-10',

  // FHFA, Nov 25 2025: 2026 baseline conforming limit (1-unit) and high-cost ceiling (150% of baseline).
  conformingLimit: 832750,
  highCostCeiling: 1249125,

  // HUD Mortgagee Letter 2023-05 (case numbers on/after Mar 20 2023). Annual MIP, in % of balance.
  fha: {
    upfrontPct: 1.75,
    minDownPct: 3.5,          // 580+ credit score; 10% for 500-579
    bigLoanThreshold: 726200, // the rate table splits at this base loan amount
    elevenYearLtv: 90,        // LTV at or below this -> MIP ends after 11 years, else life of loan
    // [maxLtv, ratePct] for terms over 15 years
    long:  { small: [[90, 0.50], [95, 0.50], [100, 0.55]], big: [[90, 0.70], [95, 0.70], [100, 0.75]] },
    // terms of 15 years or less
    short: { small: [[90, 0.15], [100, 0.40]], big: [[78, 0.15], [90, 0.40], [100, 0.65]] },
  },

  // VA.gov funding fee chart (effective Apr 7 2023, unchanged for 2026). Purchase loans.
  va: {
    first:      [[5, 2.15], [10, 1.50], [Infinity, 1.25]], // [down% below, fee%]
    subsequent: [[5, 3.30], [10, 1.50], [Infinity, 1.25]],
  },

  // USDA Single Family Housing Guaranteed Loan Program fees (unchanged since FY2017). Verify each Oct 1.
  usda: { upfrontPct: 1.0, annualPct: 0.35 },

  // Homeowners Protection Act (conventional PMI).
  hpa: { requestLtv: 80, autoLtv: 78 },
  // Fannie Mae servicing guideline for removal based on a NEW appraisal (current value).
  appraisalRemoval: [{ minYears: 2, maxYears: 5, ltv: 75 }, { minYears: 5, maxYears: Infinity, ltv: 80 }],

  // Rough conventional PMI estimates (annual % of loan). Real quotes vary by insurer; user can override.
  pmiByLtv: [[85, 0.25], [90, 0.45], [95, 0.62], [97, 0.85]],
  pmiCreditMultiplier: { 760: 0.7, 740: 0.85, 720: 1.0, 700: 1.25, 680: 1.5, 660: 1.9, 640: 2.3, 620: 2.8 },

  // Fannie Mae LLPA Matrix (updated 09-30-2026), Table 1: purchase loans, terms > 15 years. Price points by credit score x LTV.
  llpa: {
    ltvMax: [30, 60, 70, 75, 80, 85, 90, 95, 100],
    rows: [
      [780, [0, 0, 0, 0, 0.375, 0.375, 0.25, 0.25, 0.125]],
      [760, [0, 0, 0, 0.25, 0.625, 0.625, 0.5, 0.5, 0.25]],
      [740, [0, 0, 0.125, 0.375, 0.875, 1.0, 0.75, 0.625, 0.5]],
      [720, [0, 0, 0.25, 0.75, 1.25, 1.25, 1.0, 0.875, 0.75]],
      [700, [0, 0, 0.375, 0.875, 1.375, 1.5, 1.25, 1.125, 0.875]],
      [680, [0, 0, 0.625, 1.125, 1.75, 1.875, 1.5, 1.375, 1.125]],
      [660, [0, 0, 0.75, 1.375, 1.875, 2.125, 1.75, 1.625, 1.25]],
      [640, [0, 0, 1.125, 1.5, 2.25, 2.5, 2.0, 1.875, 1.5]],
      [0,   [0, 0.125, 1.5, 2.125, 2.75, 2.875, 2.625, 2.25, 1.75]],
    ],
  },
  // How lenders typically turn price points into rate. Varies with the market; 1 point is usually 0.15-0.25% of rate.
  pointToRate: 0.2,

  // Homeowners insurance deductible steps [from, to, low%, high%]. Upper bounds from published examples:
  // Insurance Information Institute ($500 -> $1,000: "up to 25%"); Fireman's Fund example via Kiplinger
  // ($1,000 -> $2,500: about 24%; -> $5,000: about 37% vs $1,000, i.e. ~17% more). Lower bounds are conservative.
  hoiDeductible: [[500, 1000, 0.10, 0.25], [1000, 2500, 0.08, 0.24], [2500, 5000, 0.05, 0.17]],
  // RESPA allows an escrow cushion of up to 1/6 of annual disbursements; monthly escrow should be about annual/12.
  escrowTolerance: 0.05,
};

export const SOURCES = [
  ['FHFA 2026 conforming loan limits', 'https://www.fhfa.gov/news/news-release/fhfa-announces-conforming-loan-limit-values-for-2026'],
  ['HUD Mortgagee Letter 2023-05 (FHA annual MIP)', 'https://www.hud.gov/program_offices/administration/hudclips/letters/mortgagee'],
  ['VA funding fee chart', 'https://www.va.gov/housing-assistance/home-loans/funding-fee-and-closing-costs/'],
  ['Fannie Mae LLPA Matrix', 'https://singlefamily.fanniemae.com/media/9391/display'],
  ['CFPB: when can I remove PMI?', 'https://www.consumerfinance.gov/ask-cfpb/when-can-i-remove-private-mortgage-insurance-pmi-from-my-loan-en-202/'],
];
