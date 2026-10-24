// Downloadable helpers: PMI cancellation request letter and calendar reminders. Generated locally.
import { download, $0, ym } from '../core.js';

export function pmiLetter({ balance, originalValue, ltv, eligibleDate }) {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const text = `${today}

[Your name]
[Property address]
[City, State ZIP]

[Servicer name]
[Servicer address from your statement, "Correspondence" or "Customer service" address]

Re: Request to cancel private mortgage insurance
Loan number: [your loan number]

To whom it may concern,

I am writing to request cancellation of private mortgage insurance (PMI) on the loan above, under the Homeowners Protection Act of 1998 (12 U.S.C. 4902).

My principal balance is ${$0(balance)}, which is ${ltv.toFixed(1)}% of the property's original value of ${$0(originalValue)}${eligibleDate ? `, and reaches 80% on or about ${ym(eligibleDate)}` : ''}. I am current on my payments and have no 30-day late payments in the past 12 months or 60-day late payments in the past 24 months. To my knowledge there are no subordinate liens on the property.

Please confirm in writing:
1. Whether this request meets your requirements for PMI cancellation;
2. Any documentation you need, including whether an appraisal or broker price opinion is required and its cost;
3. The date PMI will stop being charged and whether any unearned premium will be refunded.

Thank you,

[Signature]
[Phone] [Email]
`;
  download('pmi-cancellation-request.txt', text, 'text/plain');
}

/** One all-day calendar event, as an .ics file the person can open in any calendar app. */
export function reminder({ title, description, date, filename }) {
  const d = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const next = new Date(date.getTime() + 86400000);
  const n = `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, '0')}${String(next.getDate()).padStart(2, '0')}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MortgageForge//EN', 'BEGIN:VEVENT', `UID:${stamp}-${Math.random().toString(36).slice(2)}@mortgageforge`,
    `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${n}`, `SUMMARY:${title}`, `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    'BEGIN:VALARM', 'TRIGGER:-PT0M', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  download(filename, ics, 'text/calendar');
}
