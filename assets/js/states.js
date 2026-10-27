// State defaults for property tax and home insurance. Shown as estimates; users can override.
// taxPct: effective property tax on owner-occupied homes = aggregate real estate taxes paid ÷ aggregate home value,
//   U.S. Census ACS 2024 1-year (Tables B25090, B25082), as compiled by StatRanker (2026). DC: Tax Foundation 2026 (ACS 2024).
// ins: average HO-3 homeowners premium, NAIC data for 2022 via the Insurance Information Institute. Premiums have
//   risen since, so treat these as a floor and get real quotes.
export const STATE_SOURCES = {
  tax: 'U.S. Census ACS 2024 (taxes paid ÷ home value)',
  ins: 'NAIC 2022 average HO-3 premium',
};
export const STATES = [
  ['AL', 'Alabama', 0.37, 1748], ['AK', 'Alaska', 0.90, 1129], ['AZ', 'Arizona', 0.43, 1018], ['AR', 'Arkansas', 0.54, 1740],
  ['CA', 'California', 0.69, 1492], ['CO', 'Colorado', 0.52, 2079], ['CT', 'Connecticut', 1.36, 1814], ['DE', 'Delaware', 0.51, 1103],
  ['DC', 'District of Columbia', 0.60, 1384], ['FL', 'Florida', 0.76, 2677], ['GA', 'Georgia', 0.77, 1655], ['HI', 'Hawaii', 0.31, 1431],
  ['ID', 'Idaho', 0.43, 1002], ['IL', 'Illinois', 1.79, 1343], ['IN', 'Indiana', 0.76, 1191], ['IA', 'Iowa', 1.25, 1268],
  ['KS', 'Kansas', 1.20, 1583], ['KY', 'Kentucky', 0.72, 1359], ['LA', 'Louisiana', 0.56, 2603], ['ME', 'Maine', 0.90, 1077],
  ['MD', 'Maryland', 0.90, 1392], ['MA', 'Massachusetts', 0.95, 1871], ['MI', 'Michigan', 1.13, 1056], ['MN', 'Minnesota', 0.99, 1774],
  ['MS', 'Mississippi', 0.54, 1907], ['MO', 'Missouri', 0.85, 1668], ['MT', 'Montana', 0.59, 1639], ['NE', 'Nebraska', 1.38, 1869],
  ['NV', 'Nevada', 0.50, 948], ['NH', 'New Hampshire', 1.35, 1188], ['NJ', 'New Jersey', 1.68, 1417], ['NM', 'New Mexico', 0.61, 1322],
  ['NY', 'New York', 1.23, 1628], ['NC', 'North Carolina', 0.62, 1621], ['ND', 'North Dakota', 0.94, 1325], ['OH', 'Ohio', 1.28, 995],
  ['OK', 'Oklahoma', 0.78, 2268], ['OR', 'Oregon', 0.79, 893], ['PA', 'Pennsylvania', 1.14, 1120], ['RI', 'Rhode Island', 1.00, 2074],
  ['SC', 'South Carolina', 0.44, 1571], ['SD', 'South Dakota', 1.00, 1756], ['TN', 'Tennessee', 0.46, 1492], ['TX', 'Texas', 1.24, 2397],
  ['UT', 'Utah', 0.45, 937], ['VT', 'Vermont', 1.40, 1109], ['VA', 'Virginia', 0.75, 1332], ['WA', 'Washington', 0.74, 1151],
  ['WV', 'West Virginia', 0.48, 1113], ['WI', 'Wisconsin', 1.19, 957], ['WY', 'Wyoming', 0.58, 1596],
].map(([code, name, taxPct, ins]) => ({ code, name, taxPct, ins }));
export const stateByCode = (c) => STATES.find((s) => s.code === c) || null;
