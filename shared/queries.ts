import { z } from 'zod';
import data from '../data/data.json';
import { glossaryEntry } from './glossary';
import {
  addDays,
  addTotals,
  bookingPace,
  bookingPickup,
  delta,
  deltaUnit,
  distributionCost,
  divide,
  emptyTotals,
  periodMetrics,
  sameTimeLastYear,
  YEAR_DAYS,
  type PeriodMetricKey,
  type Totals,
} from './metrics';
import type {
  BookingPace,
  ChannelPerformance,
  Dataset,
  Event,
  Grain,
  Hotel,
  Kpis,
  MetricUnit,
  MetricValue,
  Period,
  RestaurantPerformance,
  RoomsByChannelDay,
  StaffingPerformance,
  Timeseries,
} from './types';

const dataset = data as Dataset;

// ---------------------------------------------------------------------------------------------
// Indexes, built once when the module loads, so a query touches only the days it asks for.
// ---------------------------------------------------------------------------------------------

interface HotelIndex {
  hotel: Hotel;
  /** date → that day's base measures */
  days: Map<string, Totals>;
  /** date → that day's rows, one per channel */
  channelDays: Map<string, RoomsByChannelDay[]>;
  /** stay date → snapshot date → rooms booked */
  roomsBooked: Map<string, Map<string, number>>;
  events: Event[];
}

const channels = new Map(dataset.bookingChannels.map((channel) => [channel.id, channel]));
const index = new Map<string, HotelIndex>(
  dataset.hotels.map((hotel) => [
    hotel.id,
    { hotel, days: new Map(), channelDays: new Map(), roomsBooked: new Map(), events: [] },
  ]),
);

function hotelIndex(hotelId: string): HotelIndex {
  const found = index.get(hotelId);
  if (!found) throw new Error(`Unknown hotel: ${hotelId}`);
  return found;
}

function getOrAdd<Key, Value>(map: Map<Key, Value>, key: Key, create: () => Value): Value {
  let value = map.get(key);
  if (value === undefined) {
    value = create();
    map.set(key, value);
  }
  return value;
}

for (const row of dataset.roomsDays) {
  const { hotel, days } = hotelIndex(row.hotelId);
  days.set(row.date, {
    ...emptyTotals(),
    days: 1,
    roomsAvailable: row.roomsAvailable,
    roomsSold: row.roomsSold,
    roomRevenue: row.roomRevenue,
    guestsInHouse: row.guestsInHouse,
    otherOperatingCosts: hotel.otherOperatingCostsPerDay,
  });
}
for (const row of dataset.roomsByChannelDays) {
  const { days, channelDays } = hotelIndex(row.hotelId);
  const channel = channels.get(row.channelId)!;
  const day = days.get(row.date)!;
  day.distributionCost += distributionCost([{ ...channel, ...row }]);
  if (channel.kind === 'direct') day.directRoomsSold += row.roomsSold;
  getOrAdd(channelDays, row.date, () => []).push(row);
}
for (const row of dataset.restaurantDays) {
  const day = hotelIndex(row.hotelId).days.get(row.date)!;
  day.covers = row.covers;
  day.restaurantRevenue = row.revenue;
  day.ingredientCost = row.ingredientCost;
}
const staffingMeasure = {
  rooms: 'roomsStaffingCost',
  restaurant: 'restaurantStaffingCost',
  front_desk: 'frontDeskStaffingCost',
} as const;
for (const row of dataset.staffingDays) {
  hotelIndex(row.hotelId).days.get(row.date)![staffingMeasure[row.department]] += row.cost;
}
for (const row of dataset.futureBookingSnapshots) {
  const byStay = hotelIndex(row.hotelId).roomsBooked;
  getOrAdd(byStay, row.stayDate, () => new Map()).set(row.snapshotDate, row.roomsBooked);
}
for (const event of dataset.events) hotelIndex(event.hotelId).events.push(event);

/** The dataset's "today". */
const AS_OF = dataset.asOf;
const FIRST_DAY = dataset.roomsDays.reduce(
  (first, row) => (row.date < first ? row.date : first),
  AS_OF,
);
/** The last stay date that has booking snapshots. */
const LAST_STAY = dataset.futureBookingSnapshots.reduce(
  (last, row) => (row.stayDate > last ? row.stayDate : last),
  AS_OF,
);

// ---------------------------------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------------------------------

type Weekdays = 'all' | 'monToThu' | 'friToSun';

/** 0 = Sunday … 6 = Saturday */
const weekdayOf = (date: string): number => new Date(date).getUTCDay();
const isMonToThu = (date: string): boolean => weekdayOf(date) >= 1 && weekdayOf(date) <= 4;
const keeps: Record<Weekdays, (date: string) => boolean> = {
  all: () => true,
  monToThu: isMonToThu,
  friToSun: (date) => !isMonToThu(date),
};

/** The Monday that starts the date's week. */
export const weekStart = (date: string): string => addDays(date, -((weekdayOf(date) + 6) % 7));

const bucketOf: Record<Grain, (date: string) => string> = {
  day: (date) => date,
  week: weekStart,
  month: (date) => date.slice(0, 7),
};

const later = (a: string, b: string): string => (a > b ? a : b);
const earlier = (a: string, b: string): string => (a < b ? a : b);

/** The part of a period that has actuals. */
const actualsWithin = ({ from, to }: Period): Period => ({
  from: later(from, FIRST_DAY),
  to: earlier(to, AS_OF),
});

function* eachDay({ from, to }: Period): Generator<string> {
  for (let date = from; date <= to; date = addDays(date, 1)) yield date;
}

function sumDays(hotel: HotelIndex, period: Period, weekdays: Weekdays): Totals {
  const totals = emptyTotals();
  for (const date of eachDay(actualsWithin(period))) {
    const day = hotel.days.get(date);
    if (day && keeps[weekdays](date)) addTotals(totals, day);
  }
  return totals;
}

/** A period's totals next to the same weekdays a year earlier, when those are all in the data. */
interface Compared {
  current: Totals;
  lastYear: Totals | undefined;
}

function compare(hotel: HotelIndex, period: Period, weekdays: Weekdays = 'all'): Compared {
  const current = sumDays(hotel, period, weekdays);
  const lastYear = sumDays(hotel, sameTimeLastYear(period), weekdays);
  return {
    current,
    lastYear: current.days > 0 && lastYear.days === current.days ? lastYear : undefined,
  };
}

// ---------------------------------------------------------------------------------------------
// Presentation: percent on a 0–100 scale, rounded for reading
// ---------------------------------------------------------------------------------------------

const round = (value: number, digits: number): number => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

function present(unit: MetricUnit, value: number): number {
  if (unit === 'percent') return round(value * 100, 1);
  if (unit === 'currency') return round(value, 2);
  if (unit === 'count') return Math.round(value);
  return round(value, 3);
}

function measure(unit: MetricUnit, current: number, lastYear: number | undefined): MetricValue {
  return {
    value: present(unit, current),
    unit,
    lastYear:
      lastYear === undefined
        ? null
        : {
            value: present(unit, lastYear),
            delta: round(delta(unit, current, lastYear), 1),
            deltaUnit: deltaUnit(unit),
          },
  };
}

/** A glossary metric for a period, with last year. */
const metric = (key: PeriodMetricKey, { current, lastYear }: Compared): MetricValue =>
  measure(
    glossaryEntry(key).unit,
    periodMetrics[key](current),
    lastYear && periodMetrics[key](lastYear),
  );

/** A base measure for a period, with last year. */
const amount = (
  unit: MetricUnit,
  { current, lastYear }: Compared,
  pick: (totals: Totals) => number,
): MetricValue => measure(unit, pick(current), lastYear && pick(lastYear));

// ---------------------------------------------------------------------------------------------
// Input schemas, shared by the API and the MCP tools
// ---------------------------------------------------------------------------------------------

export const hotelIdSchema = z
  .enum(dataset.hotels.map((hotel) => hotel.id))
  .describe('Hotel id, from list_hotels');
const isoDate = (what: string) => z.iso.date().describe(`${what}, ISO YYYY-MM-DD`);
const periodShape = {
  hotelId: hotelIdSchema,
  from: isoDate('First day of the period'),
  to: isoDate('Last day of the period, inclusive'),
};
const inOrder = (input: Period): boolean => input.from <= input.to;
const outOfOrder = { message: '`from` must not be after `to`', path: ['from'] };

export const hotelsInput = z.object({});
export const kpisInput = z.object(periodShape).refine(inOrder, outOfOrder);
export const timeseriesInput = z
  .object({
    ...periodShape,
    metric: z
      .enum(Object.keys(periodMetrics) as [PeriodMetricKey, ...PeriodMetricKey[]])
      .describe('Glossary key of the metric, from list_metrics'),
    grain: z.enum(['day', 'week', 'month']).describe('Size of each point; weeks start on Monday'),
    weekdays: z
      .enum(['all', 'monToThu', 'friToSun'])
      .optional()
      .describe('Count only these weekdays; all by default'),
  })
  .refine(inOrder, outOfOrder);
export const channelPerformanceInput = z.object(periodShape).refine(inOrder, outOfOrder);
export const bookingPaceInput = z
  .object({
    hotelId: hotelIdSchema,
    stayFrom: isoDate('First stay date'),
    stayTo: isoDate('Last stay date, inclusive'),
  })
  .refine((input) => input.stayFrom <= input.stayTo, {
    message: '`stayFrom` must not be after `stayTo`',
    path: ['stayFrom'],
  });
export const restaurantPerformanceInput = z.object(periodShape).refine(inOrder, outOfOrder);
export const staffingInput = z.object(periodShape).refine(inOrder, outOfOrder);
export const eventsInput = z.object(periodShape).refine(inOrder, outOfOrder);

type PeriodInput = z.infer<typeof kpisInput>;

// ---------------------------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------------------------

export function getAsOf(): string {
  return AS_OF;
}

/** Days with actuals, and the stay dates that have booking snapshots. */
export function getCoverage(): { actuals: Period; bookings: { stayFrom: string; stayTo: string } } {
  return {
    actuals: { from: FIRST_DAY, to: AS_OF },
    bookings: { stayFrom: addDays(AS_OF, 1), stayTo: LAST_STAY },
  };
}

export function getHotels(): Hotel[] {
  return dataset.hotels;
}

export function getKpis(input: PeriodInput): Kpis {
  const period = actualsWithin(input);
  const compared = compare(hotelIndex(input.hotelId), period);
  return {
    hotelId: input.hotelId,
    period,
    lastYearPeriod: sameTimeLastYear(period),
    roomsAvailable: amount('count', compared, (totals) => totals.roomsAvailable),
    roomsSold: amount('count', compared, (totals) => totals.roomsSold),
    occupancy: metric('occupancy', compared),
    averageDailyRate: metric('averageDailyRate', compared),
    revenuePerAvailableRoom: metric('revenuePerAvailableRoom', compared),
    netRevenuePerAvailableRoom: metric('netRevenuePerAvailableRoom', compared),
    operatingProfit: metric('operatingProfit', compared),
  };
}

export function getTimeseries(input: z.infer<typeof timeseriesInput>): Timeseries {
  const hotel = hotelIndex(input.hotelId);
  const keep = keeps[input.weekdays ?? 'all'];
  const current = new Map<string, Totals>();
  const lastYear = new Map<string, Totals>();
  for (const date of eachDay(actualsWithin(input))) {
    const day = hotel.days.get(date);
    if (!day || !keep(date)) continue;
    const bucket = bucketOf[input.grain](date);
    addTotals(getOrAdd(current, bucket, emptyTotals), day);
    const before = hotel.days.get(addDays(date, -YEAR_DAYS));
    if (before) addTotals(getOrAdd(lastYear, bucket, emptyTotals), before);
  }

  const { unit } = glossaryEntry(input.metric);
  const value = (totals: Totals): number => present(unit, periodMetrics[input.metric](totals));
  const x = [...current.keys()];
  return {
    metric: input.metric,
    unit,
    grain: input.grain,
    x,
    current: x.map((bucket) => value(current.get(bucket)!)),
    lastYear: x.map((bucket) => {
      const before = lastYear.get(bucket);
      return before && before.days === current.get(bucket)!.days ? value(before) : null;
    }),
  };
}

export function getChannelPerformance(input: PeriodInput): ChannelPerformance[] {
  const hotel = hotelIndex(input.hotelId);
  const sums = new Map(
    dataset.bookingChannels.map((channel) => [
      channel.id,
      { roomsSold: 0, bookings: 0, roomRevenue: 0 },
    ]),
  );
  for (const date of eachDay(actualsWithin(input))) {
    for (const row of hotel.channelDays.get(date) ?? []) {
      const sum = sums.get(row.channelId)!;
      sum.roomsSold += row.roomsSold;
      sum.bookings += row.bookings;
      sum.roomRevenue += row.roomRevenue;
    }
  }

  const allRooms = [...sums.values()].reduce((rooms, sum) => rooms + sum.roomsSold, 0);
  const rows = dataset.bookingChannels.map((channel) => {
    const sum = sums.get(channel.id)!;
    const cost = distributionCost([{ ...channel, ...sum }]);
    return {
      channel,
      sum,
      cost,
      netRate: divide(sum.roomRevenue - cost, sum.roomsSold),
    };
  });
  const rank = (value: number, values: number[]): number =>
    values.filter((other) => other > value).length + 1;

  return rows
    .map(({ channel, sum, cost, netRate }) => ({
      channelId: channel.id,
      name: channel.name,
      kind: channel.kind,
      roomsSold: sum.roomsSold,
      bookings: sum.bookings,
      shareOfRooms: present('percent', divide(sum.roomsSold, allRooms)),
      grossRevenue: present('currency', sum.roomRevenue),
      distributionCost: present('currency', cost),
      netRevenue: present('currency', sum.roomRevenue - cost),
      grossRate: present('currency', divide(sum.roomRevenue, sum.roomsSold)),
      netRate: present('currency', netRate),
      grossRevenueRank: rank(
        sum.roomRevenue,
        rows.map((row) => row.sum.roomRevenue),
      ),
      netRateRank: rank(
        netRate,
        rows.map((row) => row.netRate),
      ),
    }))
    .sort((a, b) => b.grossRevenue - a.grossRevenue);
}

export function getBookingPace(input: z.infer<typeof bookingPaceInput>): BookingPace {
  const { hotel, roomsBooked } = hotelIndex(input.hotelId);
  const at = (stayDate: string, snapshotDate: string): number =>
    roomsBooked.get(stayDate)?.get(snapshotDate) ?? 0;
  const sum = { now: 0, ago7: 0, ago14: 0, ago28: 0, lastYear: 0, lastYearAgo14: 0, remaining: 0 };
  const weeks = new Map<string, { now: number; lastYear: number }>();

  const stays = {
    from: later(input.stayFrom, addDays(AS_OF, 1)),
    to: earlier(input.stayTo, LAST_STAY),
  };
  for (const stayDate of eachDay(stays)) {
    const now = at(stayDate, AS_OF);
    const stayLastYear = addDays(stayDate, -YEAR_DAYS);
    const lastYear = at(stayLastYear, addDays(AS_OF, -YEAR_DAYS));
    sum.now += now;
    sum.ago7 += at(stayDate, addDays(AS_OF, -7));
    sum.ago14 += at(stayDate, addDays(AS_OF, -14));
    sum.ago28 += at(stayDate, addDays(AS_OF, -28));
    sum.lastYear += lastYear;
    sum.lastYearAgo14 += at(stayLastYear, addDays(AS_OF, -YEAR_DAYS - 14));
    sum.remaining += hotel.rooms - now;
    const week = getOrAdd(weeks, weekStart(stayDate), () => ({ now: 0, lastYear: 0 }));
    week.now += now;
    week.lastYear += lastYear;
  }

  return {
    hotelId: input.hotelId,
    stayFrom: input.stayFrom,
    stayTo: input.stayTo,
    asOf: AS_OF,
    roomsBookedNow: sum.now,
    roomsBookedSameTimeLastYear: sum.lastYear,
    paceRatio: present('ratio', bookingPace(sum.now, sum.lastYear)),
    pickup7: bookingPickup(sum.now, sum.ago7),
    pickup14: bookingPickup(sum.now, sum.ago14),
    pickup28: bookingPickup(sum.now, sum.ago28),
    lastYearPickup14: bookingPickup(sum.lastYear, sum.lastYearAgo14),
    roomsRemaining: sum.remaining,
    byWeek: [...weeks].map(([start, week]) => ({
      weekStart: start,
      roomsBookedNow: week.now,
      roomsBookedSameTimeLastYear: week.lastYear,
      paceRatio: present('ratio', bookingPace(week.now, week.lastYear)),
    })),
  };
}

export function getRestaurantPerformance(input: PeriodInput): RestaurantPerformance {
  const hotel = hotelIndex(input.hotelId);
  const period = actualsWithin(input);
  const all = compare(hotel, period);
  const part = (weekdays: Weekdays) => {
    const compared = compare(hotel, period, weekdays);
    return {
      covers: amount('count', compared, (totals) => totals.covers),
      captureRate: metric('restaurantCaptureRate', compared),
      revenuePerCover: metric('revenuePerCover', compared),
    };
  };
  return {
    hotelId: input.hotelId,
    restaurantName: hotel.hotel.restaurantName,
    period,
    lastYearPeriod: sameTimeLastYear(period),
    covers: amount('count', all, (totals) => totals.covers),
    revenue: amount('currency', all, (totals) => totals.restaurantRevenue),
    ingredientCost: amount('currency', all, (totals) => totals.ingredientCost),
    staffingCost: amount('currency', all, (totals) => totals.restaurantStaffingCost),
    captureRate: metric('restaurantCaptureRate', all),
    revenuePerCover: metric('revenuePerCover', all),
    margin: metric('restaurantMargin', all),
    split: { monToThu: part('monToThu'), friToSun: part('friToSun') },
  };
}

export function getStaffing(input: PeriodInput): StaffingPerformance {
  const period = actualsWithin(input);
  const compared = compare(hotelIndex(input.hotelId), period);
  const department = (measureKey: (typeof staffingMeasure)[keyof typeof staffingMeasure]) => ({
    cost: amount('currency', compared, (totals) => totals[measureKey]),
    costPerOccupiedRoom: amount('currency', compared, (totals) =>
      divide(totals[measureKey], totals.roomsSold),
    ),
  });
  return {
    hotelId: input.hotelId,
    period,
    lastYearPeriod: sameTimeLastYear(period),
    byDepartment: {
      rooms: department(staffingMeasure.rooms),
      restaurant: department(staffingMeasure.restaurant),
      front_desk: department(staffingMeasure.front_desk),
    },
    staffingCost: metric('staffingCost', compared),
    staffingCostPerOccupiedRoom: metric('staffingCostPerOccupiedRoom', compared),
    staffingCostPercent: metric('staffingCostPercent', compared),
  };
}

export function getEvents(input: PeriodInput): Event[] {
  return hotelIndex(input.hotelId)
    .events.filter((event) => event.date >= input.from && event.date <= input.to)
    .sort((a, b) => a.date.localeCompare(b.date));
}
