/*
 * Numbers and dates as the app shows them. Negative numbers get a real minus sign (−), not a
 * hyphen, so they line up with plus signs and do not break across lines.
 */

const LOCALE = 'en-US';
const withMinus = (text: string): string => text.replace('-', '−');

const wholeEuros = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const compactEuros = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const oneDecimal = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const oneDecimalSigned = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});
const weekdayDayMonth = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** Money: whole euros below a thousand (€186), compact from there (€12.4k, €1.3M). */
export function formatCurrency(value: number): string {
  return withMinus(
    Math.abs(value) < 1000
      ? wholeEuros.format(value)
      : compactEuros.format(value).replace('K', 'k'),
  );
}

/** A percent value on the 0–100 scale: 68.2%. With `signed`, a change: +12.4%, −13.7%. */
export function formatPercent(value: number, { signed = false } = {}): string {
  return `${withMinus((signed ? oneDecimalSigned : oneDecimal).format(value))}%`;
}

/** A change in percentage points: −8.8 pts, +2.1 pts. */
export function formatPoints(value: number): string {
  return `${withMinus(oneDecimalSigned.format(value))} pts`;
}

/** An ISO date as weekday, day and month: Tue 17 Nov. */
export function formatDate(date: string): string {
  const parts = weekdayDayMonth.formatToParts(new Date(date));
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';
  return `${part('weekday')} ${part('day')} ${part('month')}`;
}
