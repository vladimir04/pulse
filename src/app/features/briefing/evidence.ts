/*
 * Turns the queries an insight ran into rows a person can read: what was asked, then one row
 * per figure with last year and the change where the query compared them.
 */
import { glossary } from '@shared/glossary';
import type { Insight, MetricValue } from '@shared/types';
import {
  formatCount,
  formatCurrency,
  formatDayMonth,
  formatDelta,
  formatValue,
} from '../../util/format';

export interface EvidenceRow {
  label: string;
  value: string;
  lastYear: string;
  change?: { text: string; tone: 'better' | 'worse' | 'flat' };
}

export interface EvidenceGroup {
  /** The tool that ran, with its arguments, for example get_kpis(hotelId: …, from: …). */
  query: string;
  rows: EvidenceRow[];
}

const NONE = '—';
/** Changes smaller than this read as "about the same", as on a delta chip. */
const FLAT_BELOW = 1;

/** How a key reads when it is not a glossary metric. */
const LABELS: Record<string, string> = {
  roomsAvailable: 'Rooms available',
  roomsSold: 'Rooms sold',
  covers: 'Covers',
  revenue: 'Restaurant revenue',
  ingredientCost: 'Ingredient cost',
  staffingCost: 'Staffing cost',
  captureRate: 'Capture rate',
  margin: 'Restaurant margin',
  cost: 'cost',
  costPerOccupiedRoom: 'cost per occupied room',
  split: '',
  byDepartment: '',
  monToThu: 'Mon–Thu',
  friToSun: 'Fri–Sun',
  rooms: 'Rooms',
  restaurant: 'Restaurant',
  front_desk: 'Front desk',
};
/** Figures where a fall is the good news. */
const LOWER_IS_BETTER = new Set(['ingredientCost', 'cost', 'costPerOccupiedRoom']);

const glossaryByKey = new Map(glossary.map((entry) => [entry.key as string, entry]));
const labelOf = (key: string): string => glossaryByKey.get(key)?.name ?? LABELS[key] ?? key;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isMetricValue = (value: unknown): value is MetricValue =>
  isRecord(value) && typeof value['value'] === 'number' && 'unit' in value && 'lastYear' in value;

function metricRow(path: string[], figure: MetricValue): EvidenceRow {
  const key = path[path.length - 1];
  const label = path.map(labelOf).filter(Boolean).join(' · ');
  if (!figure.lastYear) {
    return { label, value: formatValue(figure.value, figure.unit), lastYear: NONE };
  }
  const { delta, deltaUnit } = figure.lastYear;
  const goodWhenUp =
    (glossaryByKey.get(key)?.goodDirection ?? (LOWER_IS_BETTER.has(key) ? 'down' : 'up')) === 'up';
  const tone =
    Math.abs(delta) < FLAT_BELOW ? 'flat' : delta > 0 === goodWhenUp ? 'better' : 'worse';
  return {
    label,
    value: formatValue(figure.value, figure.unit),
    lastYear: formatValue(figure.lastYear.value, figure.unit),
    change: { text: formatDelta(delta, deltaUnit), tone },
  };
}

/** Every figure with a last-year comparison inside a query result, however deep. */
function metricRows(result: Record<string, unknown>, path: string[] = []): EvidenceRow[] {
  return Object.entries(result).flatMap(([key, value]) => {
    if (isMetricValue(value)) return [metricRow([...path, key], value)];
    return isRecord(value) ? metricRows(value, [...path, key]) : [];
  });
}

const change = (now: number, before: number): EvidenceRow['change'] => {
  if (before === 0) return undefined;
  const percent = ((now - before) / before) * 100;
  const tone = Math.abs(percent) < FLAT_BELOW ? 'flat' : percent > 0 ? 'better' : 'worse';
  return { text: formatDelta(percent, 'percent'), tone };
};

function rowsOf(result: unknown): EvidenceRow[] {
  if (Array.isArray(result)) {
    return result.filter(isRecord).map((item) => {
      // A booking channel: what the hotel keeps per room night, and where that ranks.
      if (typeof item['netRate'] === 'number') {
        return {
          label: `${item['name']} · kept per room night (rank ${item['netRateRank']}; rank ${item['grossRevenueRank']} on revenue)`,
          value: formatCurrency(item['netRate']),
          lastYear: NONE,
        };
      }
      // An event: when it happened.
      return {
        label: String(item['title']),
        value: formatDayMonth(String(item['date'])),
        lastYear: NONE,
      };
    });
  }
  if (!isRecord(result)) return [];

  // Bookings for future stays, against the same point last year.
  if (typeof result['roomsBookedNow'] === 'number') {
    const now = result['roomsBookedNow'];
    const before = Number(result['roomsBookedSameTimeLastYear']);
    const [pickup, pickupBefore] = [Number(result['pickup14']), Number(result['lastYearPickup14'])];
    return [
      {
        label: 'Rooms booked',
        value: formatCount(now),
        lastYear: formatCount(before),
        change: change(now, before),
      },
      {
        label: 'Rooms booked in the last 14 days',
        value: formatCount(pickup),
        lastYear: formatCount(pickupBefore),
        change: change(pickup, pickupBefore),
      },
      {
        label: 'Rooms still unsold',
        value: formatCount(Number(result['roomsRemaining'])),
        lastYear: NONE,
      },
    ];
  }

  // A series over time is what the chart shows; say so instead of listing every point.
  if (Array.isArray(result['x']) && Array.isArray(result['current'])) {
    const points = result['x'].length;
    return [
      {
        label: `${labelOf(String(result['metric']))} by ${result['grain']}, shown in the chart`,
        value: `${points} ${points === 1 ? 'point' : 'points'}`,
        lastYear: NONE,
      },
    ];
  }

  return metricRows(result);
}

/** One group per query the insight ran, in the order it ran them. */
export function evidenceGroups(evidence: Insight['evidence']): EvidenceGroup[] {
  return evidence.map(({ query, args, rows }) => ({
    query: `${query}(${Object.entries(isRecord(args) ? args : {})
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')})`,
    rows: rowsOf(rows),
  }));
}
