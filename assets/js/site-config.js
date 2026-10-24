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

  // Optional Koinos tip jar. Shows a "Tip in KOIN" button in the footer when an address is set.
  tipJar: {
    enabled: false,
    koinAddress: '',          // your Koinos address (starts with 1…)
    explorer: 'https://koinosblocks.com/address/',
    message: 'MortgageForge is free and has no tracking. Tips in KOIN keep it that way.',
  },
};
