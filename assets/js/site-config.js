// Site owner settings. Everything is off by default so the free tools stay clean.
export const SITE = {
  name: 'MortgageForge',

  // Display ads. Turn on only after AdSense (or another network) approves the site.
  // Ads load after the page is idle and only fill the slots marked data-slot in each page.
  ads: {
    enabled: false,
    client: 'ca-pub-0000000000000000', // your AdSense publisher ID
    slots: { results: '0000000000', article: '0000000000' }, // ad unit IDs per slot
  },

  // Contextual "next steps" links shown under results. Add real affiliate URLs you are approved for.
  // tools: which tool ids show the link (payment, amortization, pmi, compare, refinance, afford, optimize, arm, import, scenarios).
  affiliates: [
    // { label: 'Compare refinance rates', note: 'Partner link. We may earn a commission.', url: 'https://example.com/?ref=mortgageforge', tools: ['refinance'] },
  ],

  // Preferred lender ad slots. Sell these as flat-fee monthly sponsorships (see docs/SELLING_ADS.md).
  // Rules built in to keep results fair: ads are labeled, shown in random order, kept apart from your
  // results and recommendations, and lenders never receive visitor data.
  lenders: {
    enabled: true,
    maxShown: 3,                 // per page
    houseAd: true,               // show an "Advertise here" card when a page has no paid sponsor
    pages: ['payment', 'afford', 'compare', 'credit', 'refinance', 'pmi', 'savings'],
    list: [
      // Copy this block for each sponsor. Remove or let `until` pass when they stop paying.
      // {
      //   id: 'acme',                              // short name, used in click counts
      //   name: 'Acme Home Loans',                 // licensed company name
      //   nmls: '123456',                          // NMLS ID (required in mortgage ads)
      //   license: 'Licensed in CA, OR and WA. Equal Housing Lender.',
      //   blurb: 'Local loan officers. Purchase and refinance.',
      //   url: 'https://www.example.com/?utm_source=mortgageforge',
      //   phone: '(555) 555-0100',
      //   pages: ['payment', 'refinance'],         // optional: only these pages
      //   until: '2027-01-31',                     // last day of the paid term
      // },
    ],
  },

  // "Advertise here" page settings.
  advertise: {
    email: 'ads@example.com',     // where lenders contact you; use an address you're happy to publish
    priceNote: 'Flat monthly price. Ask for the current rate card.',
  },

  // Optional privacy-friendly visitor counts (no cookies). Needed to show advertisers your traffic.
  // Sign up free at goatcounter.com and put your site code here, e.g. 'mortgageforge'.
  analytics: { goatcounter: '' },

  // Optional Koinos tip jar. Shows a "Tip in KOIN" button in the footer when an address is set.
  tipJar: {
    enabled: false,
    koinAddress: '',          // your Koinos address (starts with 1…)
    explorer: 'https://koinosblocks.com/address/',
    message: 'MortgageForge is free and has no tracking. Tips in KOIN keep it that way.',
  },
};
