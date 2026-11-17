/*
 * How a query behind a finding or an answer reads to a person: what was looked at and for when,
 * for example "Key figures · October 2026" instead of the tool's name and its arguments.
 */
import { glossary } from '@shared/glossary';
import type { Period } from '@shared/types';
import { formatPeriod, formatRange } from './format';

const DAY_MS = 86_400_000;

/** What each tool of the semantic layer looks at, in the app's words. */
const TITLES: Record<string, string> = {
  list_hotels: 'Hotels',
  list_metrics: 'Metrics',
  get_kpis: 'Key figures',
  get_channel_performance: 'Booking channels',
  get_booking_pace: 'Rooms on the books',
  get_restaurant_performance: 'Restaurant',
  get_staffing: 'Staff cost',
  get_events: 'Events',
  get_insights: 'Insights',
};
const WEEKDAYS: Record<string, string> = {
  monToThu: 'Monday–Thursday',
  friToSun: 'Friday–Sunday',
};
const metricNames = new Map(glossary.map((entry) => [entry.key as string, entry.name]));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * A period as people say it: a calendar month by name, one that ends today by its length
 * ("last 90 days", "last 12 weeks"), anything else as its dates.
 */
export function periodPhrase(period: Period, asOf?: string): string {
  const range = formatRange(period);
  const named = formatPeriod(period);
  if (named !== range || period.to !== asOf) return named;
  const days = Math.round((Date.parse(period.to) - Date.parse(period.from)) / DAY_MS) + 1;
  if (days === 30 || days === 90) return `last ${days} days`;
  return days % 7 === 0 && days > 7 ? `last ${days / 7} weeks` : range;
}

/** A series is named by its metric and the size of its points: "Total revenue by month". */
function seriesTitle(input: Record<string, unknown>): string {
  const metric = metricNames.get(String(input['metric'])) ?? 'Figures';
  const weekdays = WEEKDAYS[String(input['weekdays'])];
  return `${metric} by ${input['grain'] ?? 'day'}${weekdays ? `, ${weekdays}` : ''}`;
}

/**
 * The heading for one query: what it looked at, then its period. `asOf` is the dataset's
 * "today", which lets a period that ends on it read as "last 90 days". The hotel is left out;
 * wherever this is shown already says which hotel it is about.
 */
export function evidenceTitle(tool: string, args: unknown, asOf?: string): string {
  const input = isRecord(args) ? args : {};
  const what =
    tool === 'get_timeseries'
      ? seriesTitle(input)
      : (TITLES[tool] ?? tool.replace(/^(get|list)_/, '').replaceAll('_', ' '));
  const [from, to] = [input['from'] ?? input['stayFrom'], input['to'] ?? input['stayTo']];
  return isDate(from) && isDate(to) ? `${what} · ${periodPhrase({ from, to }, asOf)}` : what;
}
