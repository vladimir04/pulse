/*
 * Numbers and dates as the app shows them. Negative numbers get a real minus sign (−), not a
 * hyphen, so they line up with plus signs and do not break across lines.
 */
import type { DeltaUnit, MetricUnit, Period } from '@shared/types';

const LOCALE = 'en-US';
const withMinus = (text: string): string => text.replace('-', '−');

const wholeEuros = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
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
const wholeNumber = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const twoDecimals = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const weekdayDayMonthYear = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * Money: whole euros below a thousand (€186), thousands with one decimal that is dropped when
 * zero (€12.4k, €214k), millions with two (€1.66M). `fixed` keeps the decimal, so a table
 * column lines up (€222.0k).
 */
export function formatCurrency(value: number, { fixed = false } = {}): string {
  const size = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  // 999,950 and up would round to "1000.0k", so it already counts as a million.
  if (size >= 999_950) return `${sign}€${twoDecimals.format(size / 1_000_000)}M`;
  if (size >= 1000) {
    const thousands = oneDecimal.format(size / 1000);
    return `${sign}€${fixed ? thousands : thousands.replace(/\.0$/, '')}k`;
  }
  return withMinus(wholeEuros.format(value));
}

/** A percent value on the 0–100 scale: 68.2%. With `signed`, a change: +12.4%, −13.7%. */
export function formatPercent(value: number, { signed = false } = {}): string {
  return `${withMinus((signed ? oneDecimalSigned : oneDecimal).format(value))}%`;
}

/** A change in percentage points: −8.8 pts, +2.1 pts. */
export function formatPoints(value: number): string {
  return `${withMinus(oneDecimalSigned.format(value))} pts`;
}

/** A whole number with thousands separators: 3,120. */
export function formatCount(value: number): string {
  return withMinus(wholeNumber.format(value));
}

/** A value in the unit the queries report it in: 68.2%, €12.4k, 3,120, or a ratio such as 0.88. */
export function formatValue(value: number, unit: MetricUnit): string {
  if (unit === 'percent') return formatPercent(value);
  if (unit === 'currency') return formatCurrency(value);
  if (unit === 'count') return formatCount(value);
  return withMinus(twoDecimals.format(value));
}

/** A value on a chart axis: as formatValue, but a round percent has no decimal (80%). */
export function formatAxisValue(value: number, unit: MetricUnit): string {
  return unit === 'percent' && Number.isInteger(value)
    ? `${withMinus(wholeNumber.format(value))}%`
    : formatValue(value, unit);
}

/** A change against last year, with its sign: −8.8 pts or +12.4%. */
export function formatDelta(value: number, unit: DeltaUnit): string {
  return unit === 'points' ? formatPoints(value) : formatPercent(value, { signed: true });
}

const dateParts = (date: string): Record<string, string> =>
  Object.fromEntries(
    weekdayDayMonthYear.formatToParts(new Date(date)).map((part) => [part.type, part.value]),
  );

/** An ISO date as weekday, day and month: Tue 17 Nov. */
export function formatDate(date: string): string {
  const { weekday, day, month } = dateParts(date);
  return `${weekday} ${day} ${month}`;
}

/** An ISO date as day and month: 28 Sep. */
export function formatDayMonth(date: string): string {
  const { day, month } = dateParts(date);
  return `${day} ${month}`;
}

/**
 * A chart's date-axis label: a day (2026-09-28) as 28 Sep, a month (2026-09) as Sep; anything
 * else is returned as it is.
 */
export function formatAxisDate(label: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) return formatDayMonth(label);
  if (/^\d{4}-\d{2}$/.test(label)) return dateParts(`${label}-01`)['month'];
  return label;
}

/**
 * A period, repeating only what differs between its ends: 1–31 Oct 2026, 20 Aug–17 Nov 2026,
 * 18 Nov 2025–17 Nov 2026. Without `year`, the year is left out when both ends share it.
 */
export function formatRange({ from, to }: Period, { year = true } = {}): string {
  const [start, end] = [dateParts(from), dateParts(to)];
  const sameYear = start['year'] === end['year'];
  const last = `${end['day']} ${end['month']}${year || !sameYear ? ` ${end['year']}` : ''}`;
  if (!sameYear) return `${start['day']} ${start['month']} ${start['year']}–${last}`;
  return start['month'] === end['month']
    ? `${start['day']}–${last}`
    : `${start['day']} ${start['month']}–${last}`;
}
